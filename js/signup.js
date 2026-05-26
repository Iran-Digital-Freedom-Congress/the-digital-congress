// Congress Signup — Frontend JS
(function () {
  const IS_LOCAL = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  const API_BASE = IS_LOCAL
    ? 'http://localhost:8787'
    : 'https://congress-signup.difcongress.workers.dev';

  const NUM_LOCALE = {
    'fa': 'fa', 'ar': 'ar-u-nu-arab', 'ku': 'ar-u-nu-arab',
    'ckb': 'ar-u-nu-arab', 'bal': 'fa', 'az': 'fa', 'az-Arab': 'fa',
  };

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
      .catch(() => { if (el) el.textContent = '\u2014'; if (heroEl) heroEl.textContent = '\u2014'; });
  }

  function initForm() {
    const form           = document.getElementById('signup-form');
    const msg            = document.getElementById('signup-message');
    const cocFrame       = document.getElementById('coc-frame');
    const cocHint        = document.getElementById('coc-scroll-hint');
    const cocAcceptLabel = document.getElementById('coc-accept-label');
    const cocCheckbox    = document.getElementById('coc-checkbox');
    const walletBtn      = document.getElementById('wallet-register-btn');
    const emailToggle    = document.getElementById('email-notify-toggle');

    // ── CoC: scroll-to-unlock ─────────────────────────────────────────────
    function onCocAccepted() {
      if (walletBtn)   walletBtn.disabled   = false;
      if (emailToggle) emailToggle.disabled = false;
    }

    function setupCocScroll() {
      if (!cocFrame) return;
      var unlocked = false;
      var hasScrolledFromTop = false;

      function unlock() {
        if (unlocked) return;
        unlocked = true;
        if (cocHint)        cocHint.hidden        = true;
        if (cocAcceptLabel) cocAcceptLabel.hidden  = false;
        if (cocCheckbox)    cocCheckbox.disabled   = false;
      }

      function checkScrolled() {
        var st = cocFrame.scrollTop;
        var sh = cocFrame.scrollHeight;
        var ch = cocFrame.clientHeight;
        if (st > 12) hasScrolledFromTop = true;
        if (hasScrolledFromTop && st + ch >= sh - 40) {
          cocFrame.removeEventListener('scroll', checkScrolled);
          unlock();
        }
      }

      if (cocCheckbox)    { cocCheckbox.checked = false; cocCheckbox.disabled = true; }
      if (cocAcceptLabel)   cocAcceptLabel.hidden = true;
      if (cocHint)          cocHint.hidden = false;

      fetch('/coc.html')
        .then(function(r) { if (!r.ok) throw new Error('CoC ' + r.status); return r.text(); })
        .then(function(html) {
          var parser = new DOMParser();
          var doc    = parser.parseFromString(html, 'text/html');
          // Inject both the <style> and the body content so fonts/colours work
          var styleEl = doc.querySelector('head style');
          var bodyHTML = doc.body ? doc.body.innerHTML : '';
          cocFrame.innerHTML = (styleEl ? '<style>' + styleEl.textContent + '</style>' : '') + bodyHTML;
          requestAnimationFrame(function() {
            cocFrame.scrollTop = 0;
            requestAnimationFrame(function() {
              cocFrame.scrollTop = 0;
              if (cocFrame.scrollHeight <= cocFrame.clientHeight + 4) { unlock(); return; }
              cocFrame.addEventListener('scroll', checkScrolled, { passive: true });
            });
          });
        })
        .catch(function() {
          if (cocHint && cocHint.dataset.error) cocHint.textContent = cocHint.dataset.error;
        });
    }

    if (cocCheckbox) {
      cocCheckbox.addEventListener('change', function() {
        if (cocCheckbox.checked) {
          onCocAccepted();
        } else {
          if (walletBtn)   walletBtn.disabled   = true;
          if (emailToggle) emailToggle.disabled = true;
        }
      });
    }

    setupCocScroll();

    // ── Email toggle ──────────────────────────────────────────────────────
    if (emailToggle && form) {
      emailToggle.addEventListener('click', function() {
        form.hidden = false;
        var divider = emailToggle.closest('.wallet-or-divider');
        if (divider) divider.hidden = true;
        var emailInput = form.querySelector('input[type="email"]');
        if (emailInput) emailInput.focus();
      });
    }

    // ── Email form submit ─────────────────────────────────────────────────
    if (!form) return;
    var emailInput = form.querySelector('input[type="email"]');
    var submitBtn  = form.querySelector('button[type="submit"]');

    function updateSubmit() {
      if (!submitBtn || !emailInput) return;
      submitBtn.disabled = !emailInput.value.trim();
    }
    if (emailInput) emailInput.addEventListener('input', updateSubmit);

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var email = emailInput ? emailInput.value.trim() : '';
      if (!email) return;
      var turnstileInput = form.querySelector('[name="cf-turnstile-response"]');
      var turnstileToken = turnstileInput ? turnstileInput.value : '';
      submitBtn.disabled = true;
      msg.textContent = '';
      msg.className = 'signup-message';

      fetch(API_BASE + '/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, 'cf-turnstile-response': turnstileToken, membership_type: 'observer' }),
      })
        .then(function(res) { return res.json().then(function(data) { return { res: res, data: data }; }); })
        .then(function(obj) {
          if (obj.res.ok) {
            msg.textContent = form.dataset.msgSuccess || 'Check your email to confirm!';
            msg.classList.add('success');
            if (emailInput) emailInput.value = '';
          } else {
            msg.textContent = (obj.data && obj.data.error) || form.dataset.msgError || 'Something went wrong.';
            msg.classList.add('error');
          }
        })
        .catch(function() {
          msg.textContent = form.dataset.msgError || 'Network error. Please try again.';
          msg.classList.add('error');
        })
        .finally(function() {
          updateSubmit();
          if (window.turnstile) {
            var widget = form.querySelector('.cf-turnstile');
            if (widget) turnstile.reset(widget);
          }
        });
    });
  }

  function initSignup() { loadCount(); initForm(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSignup, { once: true });
  } else {
    initSignup();
  }
})();
