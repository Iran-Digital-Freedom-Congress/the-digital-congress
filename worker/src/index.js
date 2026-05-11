// Congress Signup Worker — Cloudflare Workers + D1 + Resend
import { verificationEmailHtml, contributorEmailHtml, organiserEmailHtml } from './emails.js';

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

  // Validate membership_type. Only observer is live right now; other roles remain disabled
  // in the UI and must not be accepted through direct API calls either.
  const VALID_TYPES = ['observer', 'contributor', 'organiser'];
  const LIVE_TYPES = ['observer'];
  const membershipType = VALID_TYPES.includes(body.membership_type) ? body.membership_type : 'observer';
  if (!LIVE_TYPES.includes(membershipType)) {
    return jsonResponse({ error: 'This participation type is not available yet.' }, 400);
  }

  // Sanitize optional name fields (organiser only)
  const firstName = (body.first_name || '').trim().slice(0, 100);
  const lastName  = (body.last_name  || '').trim().slice(0, 100);

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
    // Resend verification for unverified emails — also update membership fields
    const token = crypto.randomUUID();
    await env.DB.prepare(
      `UPDATE signups SET token = ?, membership_type = ?, first_name = ?, last_name = ?,
       created_at = datetime('now') WHERE id = ?`
    ).bind(token, membershipType, firstName || null, lastName || null, existing.id).run();
    await sendVerificationEmail(email, token, env);
    return jsonResponse({ ok: true, message: UNIFIED_MSG });
  }

  // New signup
  const token = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO signups (email, token, membership_type, first_name, last_name)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(email, token, membershipType, firstName || null, lastName || null).run();

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
    'SELECT id, email, verified, membership_type FROM signups WHERE token = ?'
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

  // Send role-specific second email (contributor / organiser only)
  if (row.membership_type === 'contributor' || row.membership_type === 'organiser') {
    try {
      await sendRoleEmail(row.email, row.membership_type, token, env);
    } catch (err) {
      // Log but don't fail the verification — user is already verified
      console.error('Role email failed:', err);
    }
  }

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

// ─── Build worker verify URL ───
function workerVerifyUrl(token, env) {
  if (env.WORKER_URL) return `${env.WORKER_URL}/api/verify?token=${token}`;
  return `https://congress-signup.${env.CF_ACCOUNT_SUBDOMAIN || 'workers'}.workers.dev/api/verify?token=${token}`;
}

// ─── Send step-1 verification email (same for all roles) ───
async function sendVerificationEmail(email, token, env) {
  const verifyUrl = workerVerifyUrl(token, env);
  await resendSend({
    from: env.FROM_EMAIL || 'hi@difcongress.com',
    to: email,
    subject: 'Confirm your participation — Digital Iran Freedom Congress / تأیید مشارکت شما',
    html: verificationEmailHtml(verifyUrl),
    env,
  });
}

// ─── Send step-2 role-specific email (after verification) ───
async function sendRoleEmail(email, membershipType, token, env) {
  const zkpUrl = `https://app.jomhoor.org/zkp?token=${encodeURIComponent(email)}+${token}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(zkpUrl)}`;

  const subjects = {
    contributor: 'مرحله بعدی: تایید هویت ZKP — کنگره‌ی دیجیتال آزادی ایران',
    organiser:   'مرحله بعدی: تایید هویت ZKP و KYC — کنگره‌ی دیجیتال آزادی ایران',
  };
  const htmlFns = {
    contributor: () => contributorEmailHtml(zkpUrl, qrImageUrl),
    organiser:   () => organiserEmailHtml(zkpUrl, qrImageUrl),
  };

  await resendSend({
    from: env.FROM_EMAIL || 'hi@difcongress.com',
    to: email,
    subject: subjects[membershipType],
    html: htmlFns[membershipType](),
    env,
  });
}

// ─── Resend API helper ───
async function resendSend({ from, to, subject, html, env }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('Resend error:', err);
    throw new Error('Failed to send email');
  }
}

// ─── Verify success page ───
function successPage(alreadyVerified, frontendUrl = 'https://difcongress.com') {
  const title = alreadyVerified ? 'Already Verified' : 'Welcome!';
  const msg = alreadyVerified
    ? 'Your email was already confirmed. You\'re on the list!'
    : 'Your email is confirmed. Your sign-up for the Digital Iran Freedom Congress is complete.';
  const msgFa = alreadyVerified
    ? 'ایمیل شما قبلاً تأیید شده بود. شما در لیست هستید!'
    : 'ایمیل شما تأیید شد. ثبت‌نام شما در کنگره دیجیتال آزادی ایران کامل شد.';

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
