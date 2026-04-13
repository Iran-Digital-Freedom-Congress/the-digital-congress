// Congress Signup Worker — Cloudflare Workers + D1 + Resend

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://difcongress.com',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Simple email regex — not exhaustive, just a sanity check
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Rate limit: max requests per IP per endpoint per time window
const RATE_LIMIT_MAX = 5;           // max 5 signups
const RATE_LIMIT_WINDOW_MINS = 60;  // per 60-minute window

async function checkRateLimit(ip, endpoint, env) {
  // Window key: rounded to the current hour-block
  const now = new Date();
  const window = new Date(now.getFullYear(), now.getMonth(), now.getDate(),
    now.getHours(), Math.floor(now.getMinutes() / RATE_LIMIT_WINDOW_MINS) * RATE_LIMIT_WINDOW_MINS)
    .toISOString();

  const row = await env.DB.prepare(
    'SELECT hits FROM rate_limits WHERE ip = ? AND endpoint = ? AND window = ?'
  ).bind(ip, endpoint, window).first();

  if (row && row.hits >= RATE_LIMIT_MAX) {
    return false; // rate limited
  }

  // Upsert hit count
  await env.DB.prepare(
    `INSERT INTO rate_limits (ip, endpoint, window, hits) VALUES (?, ?, ?, 1)
     ON CONFLICT(ip, endpoint, window) DO UPDATE SET hits = hits + 1`
  ).bind(ip, endpoint, window).run();

  // Lazy cleanup: delete old windows (older than 2 hours)
  const cutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare('DELETE FROM rate_limits WHERE window < ?').bind(cutoff).run();

  return true; // allowed
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    try {
      if (url.pathname === '/api/signup' && request.method === 'POST') {
        return await handleSignup(request, env);
      }
      if (url.pathname === '/api/verify' && request.method === 'GET') {
        return await handleVerify(url, env);
      }
      if (url.pathname === '/api/count' && request.method === 'GET') {
        return await handleCount(env);
      }
      return jsonResponse({ error: 'Not found' }, 404);
    } catch (err) {
      console.error(err);
      return jsonResponse({ error: 'Internal server error' }, 500);
    }
  },
};

// ─── POST /api/signup ───
async function handleSignup(request, env) {
  // Rate limit by IP
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const allowed = await checkRateLimit(ip, 'signup', env);
  if (!allowed) {
    return jsonResponse({ error: 'Too many requests. Please try again later.' }, 429);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const email = (body.email || '').trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return jsonResponse({ error: 'Invalid email address' }, 400);
  }

  // Verify Turnstile CAPTCHA token
  const turnstileToken = body['cf-turnstile-response'] || '';
  if (env.TURNSTILE_SECRET_KEY) {
    const tsRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET_KEY,
        response: turnstileToken,
        remoteip: ip,
      }),
    });
    const tsData = await tsRes.json();
    if (!tsData.success) {
      return jsonResponse({ error: 'CAPTCHA verification failed. Please try again.' }, 403);
    }
  }

  // Unified response to prevent email enumeration —
  // always return the same message regardless of email state.
  const UNIFIED_MSG = 'If this email is not yet registered, you will receive a verification link shortly.';

  const existing = await env.DB.prepare(
    'SELECT id, verified FROM signups WHERE email = ?'
  ).bind(email).first();

  if (existing) {
    if (existing.verified) {
      // Already verified — return same message, do nothing
      return jsonResponse({ ok: true, message: UNIFIED_MSG });
    }
    // Resend verification for unverified emails
    const token = crypto.randomUUID();
    await env.DB.prepare(
      'UPDATE signups SET token = ?, created_at = datetime(\'now\') WHERE id = ?'
    ).bind(token, existing.id).run();
    await sendVerificationEmail(email, token, env);
    return jsonResponse({ ok: true, message: UNIFIED_MSG });
  }

  // New signup
  const token = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO signups (email, token) VALUES (?, ?)'
  ).bind(email, token).run();

  await sendVerificationEmail(email, token, env);
  return jsonResponse({ ok: true, message: UNIFIED_MSG });
}

// ─── GET /api/verify?token=... ───
async function handleVerify(url, env) {
  const token = url.searchParams.get('token');
  if (!token) {
    return htmlResponse(errorPage('Missing verification token.'), 400);
  }

  const row = await env.DB.prepare(
    'SELECT id, verified FROM signups WHERE token = ?'
  ).bind(token).first();

  if (!row) {
    return htmlResponse(errorPage('Invalid or expired verification link.'), 404);
  }

  if (row.verified) {
    return htmlResponse(successPage(true));
  }

  await env.DB.prepare(
    "UPDATE signups SET verified = 1, verified_at = datetime('now') WHERE id = ?"
  ).bind(row.id).run();

  const frontendUrl = env.FRONTEND_URL || 'https://difcongress.com';
  return htmlResponse(successPage(false, frontendUrl));
}

// ─── GET /api/count ───
async function handleCount(env) {
  const result = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM signups WHERE verified = 1'
  ).first();
  return jsonResponse({ count: result?.count || 0 });
}

// ─── Email via Resend ───
async function sendVerificationEmail(email, token, env) {
  const verifyUrl = `${env.FRONTEND_URL ? env.FRONTEND_URL.replace(/\/$/, '') : 'https://difcongress.com'}/api/verify?token=${token}`;
  // If the worker is on a different domain, use the worker URL for verification
  const workerVerifyUrl = `https://congress-signup.${env.CF_ACCOUNT_SUBDOMAIN || 'workers'}.workers.dev/api/verify?token=${token}`;
  // Use WORKER_URL if set, otherwise construct from request
  const finalVerifyUrl = env.WORKER_URL
    ? `${env.WORKER_URL}/api/verify?token=${token}`
    : workerVerifyUrl;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL || 'congress@difcongress.com',
      to: [email],
      subject: 'Confirm your participation — Digital Iran Freedom Congress',
      html: verificationEmailHtml(finalVerifyUrl),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Resend error:', err);
    throw new Error('Failed to send verification email');
  }
}

// ─── Email HTML ───
function verificationEmailHtml(verifyUrl) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Inter',sans-serif;background:#F5F7FA;padding:40px 20px;margin:0;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <h1 style="font-size:20px;color:#1a1a2e;margin:0 0 16px;">◆ Digital Iran Freedom Congress</h1>
    <p style="color:#334155;font-size:15px;line-height:1.6;">
      Thank you for your interest in the congress. Please click the button below to confirm your email and be listed as a volunteer / future participant.
    </p>
    <p style="color:#334155;font-size:15px;line-height:1.6;" dir="rtl">
      ممنون از علاقه‌مندی شما. لطفاً روی دکمه زیر کلیک کنید تا ایمیل شما تأیید شود و به عنوان داوطلب / شرکت‌کننده آینده ثبت شوید.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${verifyUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(87.63deg,#3B82F6 -1.41%,#0EA5E9 113.73%);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
        Confirm my participation / تأیید مشارکت من
      </a>
    </div>
    <p style="color:#94a3b8;font-size:13px;line-height:1.5;">
      If you didn't request this, you can safely ignore this email.<br>
      اگر شما این درخواست را ارسال نکردید، این ایمیل را نادیده بگیرید.
    </p>
  </div>
</body>
</html>`;
}

// ─── Verify success page ───
function successPage(alreadyVerified, frontendUrl = 'https://difcongress.com') {
  const title = alreadyVerified ? 'Already Verified' : 'Welcome!';
  const msg = alreadyVerified
    ? 'Your email was already confirmed. You\'re on the list!'
    : 'Your email is confirmed. You are now listed as a volunteer / future participant of the Digital Iran Freedom Congress.';
  const msgFa = alreadyVerified
    ? 'ایمیل شما قبلاً تأیید شده بود. شما در لیست هستید!'
    : 'ایمیل شما تأیید شد. شما اکنون به عنوان داوطلب / شرکت‌کننده آینده کنگره دیجیتال آزادی ایران ثبت شدید.';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — DIFC</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: #F5F7FA; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
    .card { background: #fff; border-radius: 16px; padding: 48px; max-width: 480px; text-align: center; box-shadow: 0 8px 32px rgba(0,0,0,0.08); }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 24px; color: #059669; margin-bottom: 12px; }
    p { color: #334155; font-size: 15px; line-height: 1.6; margin-bottom: 12px; }
    .fa { direction: rtl; font-family: 'Vazirmatn', sans-serif; }
    a.btn { display: inline-block; margin-top: 20px; padding: 12px 28px; background: linear-gradient(87.63deg,#3B82F6 -1.41%,#0EA5E9 113.73%); color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; }
  </style>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Vazirmatn:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h1>${title}</h1>
    <p>${msg}</p>
    <p class="fa">${msgFa}</p>
    <a href="${frontendUrl}" class="btn">Go to Congress Website / رفتن به وبسایت کنگره</a>
  </div>
</body>
</html>`;
}

// ─── Error page ───
function errorPage(message) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error — DIFC</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: #F5F7FA; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
    .card { background: #fff; border-radius: 16px; padding: 48px; max-width: 480px; text-align: center; box-shadow: 0 8px 32px rgba(0,0,0,0.08); }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 24px; color: #DC2626; margin-bottom: 12px; }
    p { color: #334155; font-size: 15px; line-height: 1.6; }
  </style>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body>
  <div class="card">
    <div class="icon">✗</div>
    <h1>Error</h1>
    <p>${escapeHtml(message)}</p>
  </div>
</body>
</html>`;
}

// ─── Helpers ───
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html;charset=UTF-8' },
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
