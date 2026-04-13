// Congress Signup — Frontend JS
(function () {
  // CONFIGURE: set this to your deployed Worker URL
  const API_BASE = 'https://congress-signup.difcongress.workers.dev';

  // Map HTML lang attributes to locales that produce native digits
  const NUM_LOCALE = {
    'fa': 'fa',            // Persian digits ۰–۹
    'ar': 'ar-u-nu-arab',  // Arabic-Indic digits ٠–٩
    'ku': 'ckb',           // Central Kurdish (Sorani) digits ٠–٩
    'bal': 'fa',           // Balochi — Persian-style digits ۰–۹
    'az-Arab': 'fa',       // South Azerbaijani — Persian-style digits ۰–۹
  };

  // ─── Counter ───
  function loadCount() {
    const el = document.getElementById('signup-count');
    const heroEl = document.getElementById('hero-signup-count');
    if (!el && !heroEl) return;
    fetch(API_BASE + '/api/count')
      .then(r => r.json())
      .then(data => {
        const lang = document.documentElement.lang || 'en';
        const locale = NUM_LOCALE[lang] || lang;
        const formatted = (data.count || 0).toLocaleString(locale);
        if (el) el.textContent = formatted;
        if (heroEl) heroEl.textContent = formatted;
      })
      .catch(() => {
        if (el) el.textContent = '—';
        if (heroEl) heroEl.textContent = '—';
      });
  }

  // ─── Signup Form ───
  function initForm() {
    const form = document.getElementById('signup-form');
    if (!form) return;
    const input = form.querySelector('input[type="email"]');
    const btn = form.querySelector('button');
    const msg = document.getElementById('signup-message');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = input.value.trim();
      if (!email) return;

      // Get Turnstile token
      const turnstileInput = form.querySelector('[name="cf-turnstile-response"]');
      const turnstileToken = turnstileInput ? turnstileInput.value : '';

      btn.disabled = true;
      msg.textContent = '';
      msg.className = 'signup-message';

      try {
        const res = await fetch(API_BASE + '/api/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, 'cf-turnstile-response': turnstileToken }),
        });
        const data = await res.json();

        if (res.ok) {
          msg.textContent = form.dataset.msgSuccess || 'Check your email to confirm!';
          msg.classList.add('success');
          input.value = '';
        } else {
          msg.textContent = data.message || form.dataset.msgError || 'Something went wrong. Please try again.';
          msg.classList.add('error');
        }
      } catch {
        msg.textContent = form.dataset.msgError || 'Network error. Please try again.';
        msg.classList.add('error');
      } finally {
        btn.disabled = false;
        // Reset Turnstile widget for next attempt
        if (window.turnstile) {
          const widget = form.querySelector('.cf-turnstile');
          if (widget) turnstile.reset(widget);
        }
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadCount();
    initForm();
  });
})();
