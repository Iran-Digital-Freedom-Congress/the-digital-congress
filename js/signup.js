// Congress Signup — Frontend JS
(function () {
  // CONFIGURE: set this to your deployed Worker URL
  const API_BASE = 'https://congress-signup.difcongress.workers.dev';

  // ─── Counter ───
  function loadCount() {
    const el = document.getElementById('signup-count');
    const heroEl = document.getElementById('hero-signup-count');
    if (!el && !heroEl) return;
    fetch(API_BASE + '/api/count')
      .then(r => r.json())
      .then(data => {
        const lang = document.documentElement.lang || 'en';
        const formatted = (data.count || 0).toLocaleString(lang);
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

      btn.disabled = true;
      msg.textContent = '';
      msg.className = 'signup-message';

      try {
        const res = await fetch(API_BASE + '/api/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();

        if (res.ok) {
          msg.textContent = form.dataset.msgSuccess || 'Check your email to confirm!';
          msg.classList.add('success');
          input.value = '';
        } else if (data.error === 'already_verified') {
          msg.textContent = form.dataset.msgAlready || 'This email is already registered.';
          msg.classList.add('success');
        } else {
          msg.textContent = data.message || form.dataset.msgError || 'Something went wrong. Please try again.';
          msg.classList.add('error');
        }
      } catch {
        msg.textContent = form.dataset.msgError || 'Network error. Please try again.';
        msg.classList.add('error');
      } finally {
        btn.disabled = false;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadCount();
    initForm();
  });
})();
