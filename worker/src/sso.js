// Jomhoor SSO integration — OAuth2 auth-code + PKCE.
//
// Canonical reference: jomhoor/Platform docs/SSO/INTEGRATION.md
//
// Two endpoints (the minimum any RP must implement):
//
//   GET /api/sso/start?token=<signup_token>
//     • Looks up the verified signup row.
//     • Generates PKCE (code_verifier + S256 challenge) + state.
//     • Persists { state -> (code_verifier, signup_token) } in D1.
//     • 302 → https://sso.jomhoor.org/v1/authorize?client_id=…&redirect_uri=…&state=…&code_challenge=…
//
//   GET /api/sso/callback?code=…&state=…
//     • Loads the PKCE row by state (single-use, then deleted).
//     • POSTs { code, client_id, client_secret, code_verifier } → sso-svc /v1/tokens/exchange.
//     • Decodes the JWT `sub` (pairwise subject for client_id="difcongress").
//     • Optionally calls /v1/tokens/validate to confirm zk_verified=true.
//     • Stamps the signup row with sso_subject + sso_verified_at.
//
// Security model:
// - The code_verifier never leaves this Worker.
// - state is 128-bit random + single-use (deleted on first callback).
// - PKCE rows expire after 5 min.
// - The client_secret is a Worker secret (JOMHOOR_CLIENT_SECRET), never in code.
// - JWT signature is NOT verified locally — exchange is server-to-server over HTTPS
//   with sso.jomhoor.org, which is our trust boundary. Same model as Taraaz.

const PKCE_TTL_SECONDS = 5 * 60;
const SSO_CLIENT_ID = 'difcongress';

function ssoBase(env) {
  return env.JOMHOOR_SSO_URL || 'https://sso.jomhoor.org';
}

function workerBase(env, url) {
  return env.WORKER_URL || `${url.protocol}//${url.host}`;
}

// ─── crypto helpers (Web Crypto, available in Workers) ─────────────────────────

function base64UrlEncode(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomVerifier() {
  // 32 bytes → 43-char base64url; well above RFC 7636's 32-octet minimum.
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
}

async function s256Challenge(verifier) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(hash));
}

function parseJwtSub(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // base64url → base64
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

// ─── GET /api/sso/start?token=<signup_token> ───────────────────────────────────

export async function handleSsoStart(url, env) {
  const signupToken = url.searchParams.get('token');
  if (!signupToken) return htmlError('Missing token.', 400);

  const row = await env.DB.prepare(
    'SELECT id, verified, membership_type FROM signups WHERE token = ?'
  ).bind(signupToken).first();

  if (!row) return htmlError('Invalid or expired link.', 404);
  if (!row.verified) {
    return htmlError('Please confirm your email first by clicking the verification link.', 400);
  }
  if (row.membership_type !== 'contributor' && row.membership_type !== 'organiser') {
    return htmlError('Identity verification is not required for your participation type.', 400);
  }

  const state = crypto.randomUUID();
  const codeVerifier = randomVerifier();
  const codeChallenge = await s256Challenge(codeVerifier);
  const expiresAt = Math.floor(Date.now() / 1000) + PKCE_TTL_SECONDS;

  await env.DB.prepare(
    `INSERT INTO sso_pkce (state, code_verifier, signup_token, expires_at)
     VALUES (?, ?, ?, ?)`
  ).bind(state, codeVerifier, signupToken, expiresAt).run();

  const redirectUri = `${workerBase(env, url)}/api/sso/callback`;
  const params = new URLSearchParams({
    client_id: SSO_CLIENT_ID,
    redirect_uri: redirectUri,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return Response.redirect(`${ssoBase(env)}/v1/authorize?${params}`, 302);
}

// ─── GET /api/sso/callback?code=…&state=… ──────────────────────────────────────

export async function handleSsoCallback(url, env) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) return htmlError('Missing code or state.', 400);

  // Single-use: load + delete PKCE row in one go.
  const pkce = await env.DB.prepare(
    'SELECT code_verifier, signup_token, expires_at FROM sso_pkce WHERE state = ?'
  ).bind(state).first();
  if (pkce) {
    await env.DB.prepare('DELETE FROM sso_pkce WHERE state = ?').bind(state).run();
  }
  if (!pkce) return htmlError('Unknown or already-used SSO state.', 400);
  if (pkce.expires_at < Math.floor(Date.now() / 1000)) {
    return htmlError('SSO session expired. Please click the email link again.', 400);
  }

  // Server-to-server token exchange.
  let accessToken;
  try {
    const resp = await fetch(`${ssoBase(env)}/v1/tokens/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: SSO_CLIENT_ID,
        client_secret: env.JOMHOOR_CLIENT_SECRET,
        code_verifier: pkce.code_verifier,
      }),
    });
    if (!resp.ok) {
      const detail = await resp.text();
      console.error('[SSO] exchange failed:', resp.status, detail);
      return htmlError('Identity verification failed. Please try again.', 400);
    }
    const body = await resp.json();
    accessToken = body.access_token;
  } catch (err) {
    console.error('[SSO] exchange error:', err);
    return htmlError('Unable to reach Jomhoor SSO. Please try again later.', 502);
  }

  const subject = parseJwtSub(accessToken);
  if (!subject) {
    console.error('[SSO] missing sub in access token');
    return htmlError('Invalid token from SSO.', 502);
  }

  // Live trust check (organiser requires zk_verified; contributor accepts wallet-only).
  const signup = await env.DB.prepare(
    'SELECT membership_type FROM signups WHERE token = ?'
  ).bind(pkce.signup_token).first();
  if (signup?.membership_type === 'organiser') {
    const zkOk = await checkZkVerified(accessToken, env);
    if (!zkOk) return htmlError('Organiser role requires ZK identity verification.', 403);
  }

  await env.DB.prepare(
    `UPDATE signups SET sso_subject = ?, sso_verified_at = datetime('now') WHERE token = ?`
  ).bind(subject, pkce.signup_token).run();

  // Q6 — stamp a `difcongress_member` assertion in sso-svc so other relying
  // parties can gate on DIFCongress membership via the `requires_difcongress`
  // flag on their sso_clients row. We only have the pairwise subject (not
  // the raw wallet address) by design, so we POST via the subject+client_id
  // form of /v1/admin/assertions. Failure is non-fatal: the user's DIFCongress
  // signup is already stamped above; we just log so the cross-RP gate
  // recovers on the next admin sweep.
  if (env.JOMHOOR_ADMIN_TOKEN) {
    await stampDifcongressMember(subject, env);
  }

  return htmlSuccess(env.FRONTEND_URL || 'https://difcongress.com');
}

async function stampDifcongressMember(subject, env) {
  try {
    const resp = await fetch(`${ssoBase(env)}/v1/admin/assertions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.JOMHOOR_ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        subject,
        client_id: SSO_CLIENT_ID,
        assertion_type: 'difcongress_member',
        status: true,
        source: 'difcongress-signup',
      }),
    });
    if (!resp.ok) {
      const detail = await resp.text();
      console.error('[SSO] admin stamp failed:', resp.status, detail);
    }
  } catch (err) {
    console.error('[SSO] admin stamp error:', err);
  }
}

async function checkZkVerified(accessToken, env) {
  try {
    const resp = await fetch(`${ssoBase(env)}/v1/tokens/validate`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!resp.ok) return false;
    const body = await resp.json();
    return Array.isArray(body.assertions)
      && body.assertions.some((a) => a.assertion_type === 'zk_verified' && a.status === 'active');
  } catch (err) {
    console.error('[SSO] validate error:', err);
    return false;
  }
}

// ─── Guest (wallet-first) endpoints ───────────────────────────────────────────
//
// Three browser states are handled:
//   Desktop  → user stays on difcongress.com, sees QR, page polls until done.
//   Mobile   → browser follows authorize URL; wallet opens via Universal Link;
//               callback redirects back to difcongress.com?wallet_registered=1.
//   No app   → sso.jomhoor.org detects missing app and shows install page.

const GUEST_PKCE_TTL_SECONDS = 10 * 60; // 10 min — long enough to scan a QR

// Allow https://difcongress.com in production; also allow localhost for wrangler dev.
export function guestCors(request) {
  const origin = request?.headers?.get('Origin') || '';
  const allowed = origin === 'https://difcongress.com'
    || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  return { 'Access-Control-Allow-Origin': allowed ? origin : 'https://difcongress.com' };
}

// POST /api/sso/guest/init
// Creates a wallet_registrations row + sso_pkce row.
// Returns { session_id, authorize_url } — frontend uses session_id for polling
// and authorize_url for QR (desktop) or redirect (mobile).
export async function handleGuestInit(request, env) {
  const url = new URL(request.url);
  let body = {};
  try {
    if ((request.headers.get('Content-Type') || '').includes('application/json')) {
      body = await request.json();
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...guestCors(request) },
    });
  }

  const validTypes = new Set(['observer', 'contributor', 'organiser']);
  const membershipType = validTypes.has(body.membership_type)
    ? body.membership_type
    : 'observer';

  const token = crypto.randomUUID();      // wallet_registrations PK
  const state = crypto.randomUUID();      // sso_pkce PK, used as session_id for polling
  const codeVerifier = randomVerifier();
  const codeChallenge = await s256Challenge(codeVerifier);
  const expiresAt = Math.floor(Date.now() / 1000) + GUEST_PKCE_TTL_SECONDS;

  await env.DB.prepare(
    `INSERT INTO wallet_registrations (token, membership_type, created_at)
     VALUES (?, ?, unixepoch())`
  ).bind(token, membershipType).run();

  // signup_token holds the wallet_registrations token — same UUID format, no collision.
  await env.DB.prepare(
    `INSERT INTO sso_pkce (state, code_verifier, signup_token, expires_at)
     VALUES (?, ?, ?, ?)`
  ).bind(state, codeVerifier, token, expiresAt).run();

  const redirectUri = `${workerBase(env, url)}/api/sso/guest/callback`;
  const params = new URLSearchParams({
    client_id: SSO_CLIENT_ID,
    redirect_uri: redirectUri,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  const authorizeUrl = `${ssoBase(env)}/v1/authorize?${params}`;

  return new Response(JSON.stringify({ session_id: state, authorize_url: authorizeUrl }), {
    headers: { 'Content-Type': 'application/json', ...guestCors(request) },
  });
}

// GET /api/sso/guest/poll?session_id=<state>
// Desktop page calls this every 2.5 s until { done: true } or { expired: true }.
export async function handleGuestPoll(request, env) {
  const url = new URL(request.url);
  const cors = guestCors(request);
  const sessionId = url.searchParams.get('session_id');
  if (!sessionId) {
    return new Response(JSON.stringify({ done: false }), {
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  }

  const row = await env.DB.prepare(
    'SELECT signup_token, completed_at, expires_at FROM sso_pkce WHERE state = ?'
  ).bind(sessionId).first();

  const now = Math.floor(Date.now() / 1000);
  let result;

  if (!row) {
    result = { done: false, expired: true };
  } else if (row.completed_at) {
    result = { done: true, token: row.signup_token };
  } else if (row.expires_at < now) {
    result = { done: false, expired: true };
  } else {
    result = { done: false };
  }

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

// GET /api/sso/guest/callback?code=…&state=…
// SSO redirects here after wallet consent. Stamps wallet_registrations,
// marks sso_pkce completed (keeps row for poll), then redirects to difcongress.com.
export async function handleGuestCallback(url, env) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) return htmlError('Missing code or state.', 400);

  const pkce = await env.DB.prepare(
    'SELECT code_verifier, signup_token, expires_at, completed_at FROM sso_pkce WHERE state = ?'
  ).bind(state).first();

  if (!pkce) return htmlError('Unknown or already-used SSO session.', 400);
  if (pkce.completed_at) return htmlError('This SSO session has already been completed.', 400);
  if (pkce.expires_at < Math.floor(Date.now() / 1000)) {
    return htmlError('SSO session expired. Please start again on the congress website.', 400);
  }

  // Server-to-server token exchange.
  let accessToken;
  try {
    const resp = await fetch(`${ssoBase(env)}/v1/tokens/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: SSO_CLIENT_ID,
        client_secret: env.JOMHOOR_CLIENT_SECRET,
        code_verifier: pkce.code_verifier,
      }),
    });
    if (!resp.ok) {
      const detail = await resp.text();
      console.error('[SSO guest] exchange failed:', resp.status, detail);
      return htmlError('Identity verification failed. Please try again.', 400);
    }
    const body = await resp.json();
    accessToken = body.access_token;
  } catch (err) {
    console.error('[SSO guest] exchange error:', err);
    return htmlError('Unable to reach Jomhoor SSO. Please try again later.', 502);
  }

  const subject = parseJwtSub(accessToken);
  if (!subject) {
    console.error('[SSO guest] missing sub in token');
    return htmlError('Invalid token from SSO.', 502);
  }

  const guestRow = await env.DB.prepare(
    'SELECT membership_type FROM wallet_registrations WHERE token = ?'
  ).bind(pkce.signup_token).first();
  if (!guestRow) {
    return htmlError('Registration session missing. Please start again.', 400);
  }

  if (guestRow.membership_type === 'organiser') {
    const zkOk = await checkZkVerified(accessToken, env);
    if (!zkOk) {
      return htmlError('Organiser role requires ZK identity verification.', 403);
    }
  }

  const now = Math.floor(Date.now() / 1000);

  // Stamp wallet_registrations (don't delete the PKCE row — poll needs it).
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE wallet_registrations SET sso_subject = ?, registered_at = ? WHERE token = ?`
    ).bind(subject, now, pkce.signup_token),
    env.DB.prepare(
      `UPDATE sso_pkce SET completed_at = ? WHERE state = ?`
    ).bind(now, state),
  ]);

  // Redirect back to difcongress.com so the page shows inline success.
  const frontendUrl = env.FRONTEND_URL || 'https://difcongress.com';
  const dest = `${frontendUrl}?wallet_registered=1&token=${encodeURIComponent(pkce.signup_token)}`;
  return Response.redirect(dest, 302);
}

// POST /api/sso/guest/email  { token, email }
// Stores the optional email and sends a notification.
export async function handleGuestEmail(request, env) {
  let body;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON.' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...guestCors(request) },
    });
  }

  const token = (body.token || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!token) {
    return new Response(JSON.stringify({ error: 'Missing token.' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...guestCors(request) },
    });
  }
  if (!email || !EMAIL_RE.test(email)) {
    return new Response(JSON.stringify({ error: 'Invalid email address.' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...guestCors(request) },
    });
  }

  const reg = await env.DB.prepare(
    'SELECT registered_at FROM wallet_registrations WHERE token = ?'
  ).bind(token).first();

  if (!reg) {
    return new Response(JSON.stringify({ error: 'Registration not found.' }), {
      status: 404, headers: { 'Content-Type': 'application/json', ...guestCors(request) },
    });
  }
  if (!reg.registered_at) {
    return new Response(JSON.stringify({ error: 'Wallet not yet verified.' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...guestCors(request) },
    });
  }

  await env.DB.prepare(
    `UPDATE wallet_registrations SET email = ? WHERE token = ?`
  ).bind(email, token).run();

  if (env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'DIFCongress <noreply@mail.difcongress.com>',
          to: email,
          subject: 'DIFCongress — Jomhoor registration confirmed',
          html: guestEmailHtml(email),
        }),
      });
    } catch (err) {
      console.error('[SSO guest] email send failed:', err);
    }
  }

  return new Response(
    JSON.stringify({ ok: true, message: 'You will be notified when the Congress begins.' }),
    { headers: { 'Content-Type': 'application/json', ...guestCors(request) } }
  );
}

function guestEmailHtml(email) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:Inter,sans-serif;background:#F5F7FA;padding:32px">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:40px">
<h1 style="color:#059669;font-size:22px;margin:0 0 16px">Your Jomhoor wallet is registered ✓</h1>
<p style="color:#334155;line-height:1.6">You have successfully registered for the <strong>Digital Iran Freedom Congress</strong> using your Jomhoor identity wallet.</p>
<p style="color:#334155;line-height:1.6">You will receive a notification at <strong>${email}</strong> when the Congress Townhall opens.</p>
<hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0">
<p style="color:#64748B;font-size:14px;direction:rtl;text-align:right">کیف پول جمهور شما با موفقیت ثبت شد. وقتی کنگره آغاز به کار کند، به این ایمیل اطلاع‌رسانی خواهیم کرد.</p>
</div></body></html>`;
}

// ─── HTML helpers ──────────────────────────────────────────────────────────────

function htmlError(message, status) {
  const body = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>SSO error</title>
<style>body{font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#F5F7FA;margin:0;padding:24px}
.card{background:#fff;border-radius:16px;padding:48px;max-width:480px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.08)}
h1{color:#DC2626;font-size:20px;margin:0 0 12px}p{color:#334155;line-height:1.6;margin:0}</style></head>
<body><div class="card"><h1>Identity verification problem</h1><p>${message}</p></div></body></html>`;
  return new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

function htmlSuccess(frontendUrl) {
  const body = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Identity verified</title>
<style>body{font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#F5F7FA;margin:0;padding:24px}
.card{background:#fff;border-radius:16px;padding:48px;max-width:480px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.08)}
.icon{font-size:48px;margin-bottom:16px}h1{color:#059669;font-size:24px;margin:0 0 12px}
p{color:#334155;line-height:1.6;margin:0 0 12px}.fa{direction:rtl}
a.btn{display:inline-block;margin-top:20px;padding:12px 28px;background:linear-gradient(87.63deg,#3B82F6 -1.41%,#0EA5E9 113.73%);color:#fff;text-decoration:none;border-radius:8px;font-weight:600}</style></head>
<body><div class="card"><div class="icon">✓</div><h1>Identity verified</h1>
<p>Your Jomhoor identity is linked to your Digital Iran Freedom Congress signup.</p>
<p class="fa">هویت جمهور شما به ثبت‌نام کنگره دیجیتال آزادی ایران متصل شد.</p>
<a href="${frontendUrl}" class="btn">Go to Congress Website / رفتن به وبسایت کنگره</a></div></body></html>`;
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
