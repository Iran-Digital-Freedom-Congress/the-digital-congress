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

  function initForm() {
    const form = document.getElementById('signup-form');
    if (!form) return;

    const emailInput = form.querySelector('input[type="email"]');
    const submitBtn = form.querySelector('button[type="submit"]');
    const msg = document.getElementById('signup-message');
    const cocWrapper = form.querySelector('.coc-wrapper');
    const cocFrame = document.getElementById('coc-frame');
    const cocHint = document.getElementById('coc-scroll-hint');
    const cocAcceptLabel = document.getElementById('coc-accept-label');
    const cocCheckbox = document.getElementById('coc-checkbox');
    const roleInputs = form.querySelectorAll('input[name="membership-type"]');

    let cocAccepted = false;
    let selectedRole = form.querySelector('input[name="membership-type"]:checked')?.value || null;

    if (cocCheckbox) {
      cocCheckbox.checked = false;
      cocCheckbox.disabled = true;
    }
    if (cocAcceptLabel) cocAcceptLabel.hidden = true;
    if (cocHint) cocHint.hidden = false;

    function setCocErrorState(isInvalid) {
      if (!cocWrapper) return;
      cocWrapper.classList.toggle('coc-wrapper--error', isInvalid);
    }

    function updateSubmitState() {
      submitBtn.disabled = !(selectedRole && emailInput.value.trim());
    }

    function onCocScrolledToBottom() {
      setCocErrorState(false);
      if (cocHint) cocHint.hidden = true;
      if (cocAcceptLabel) cocAcceptLabel.hidden = false;
      if (cocCheckbox) cocCheckbox.disabled = false;
    }

    function setupCocScroll() {
      if (!cocFrame) return;

      let unlocked = false;
      let hasScrolledFromTop = false;

      function unlock() {
        if (unlocked) return;
        unlocked = true;
        onCocScrolledToBottom();
      }

      function resetToTop() {
        cocFrame.scrollTop = 0;
      }

      function checkScrolled() {
        const { scrollTop, scrollHeight, clientHeight } = cocFrame;

        if (scrollTop > 12) {
          hasScrolledFromTop = true;
        }

        if (hasScrolledFromTop && scrollTop + clientHeight >= scrollHeight - 40) {
          cocFrame.removeEventListener('scroll', checkScrolled);
          unlock();
        }
      }

      fetch('/coc.html')
        .then(r => {
          if (!r.ok) throw new Error('CoC ' + r.status);
          return r.text();
        })
        .then(html => {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          cocFrame.innerHTML = doc.body.innerHTML;
          cocFrame.style.height = '220px';
          cocFrame.style.overflowY = 'scroll';

          requestAnimationFrame(() => {
            resetToTop();
            requestAnimationFrame(() => {
              resetToTop();
              if (cocFrame.scrollHeight <= cocFrame.clientHeight + 4) {
                unlock();
                return;
              }
              cocFrame.addEventListener('scroll', checkScrolled, { passive: true });
            });
          });
        })
        .catch(() => {
          if (cocHint && cocHint.dataset.error) {
            cocHint.textContent = cocHint.dataset.error;
          }
          if (cocAcceptLabel) cocAcceptLabel.hidden = true;
          if (cocCheckbox) {
            cocCheckbox.checked = false;
            cocCheckbox.disabled = true;
          }
          updateSubmitState();
        });
    }

    if (cocCheckbox) {
      cocCheckbox.addEventListener('change', () => {
        cocAccepted = cocCheckbox.checked;
        setCocErrorState(!cocAccepted);
        updateSubmitState();
      });
    }

    roleInputs.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.checked && !radio.disabled) {
          selectedRole = radio.value;
          updateSubmitState();
        }
      });
    });

    if (emailInput) {
      emailInput.addEventListener('input', updateSubmitState);
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = emailInput.value.trim();
      if (!email || !selectedRole || !cocAccepted) {
        if (!cocAccepted) {
          setCocErrorState(true);
          if (cocWrapper) cocWrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      const turnstileInput = form.querySelector('[name="cf-turnstile-response"]');
      const turnstileToken = turnstileInput ? turnstileInput.value : '';

      submitBtn.disabled = true;
      setCocErrorState(false);
      msg.textContent = '';
      msg.className = 'signup-message';

      const body = {
        email,
        'cf-turnstile-response': turnstileToken,
        membership_type: selectedRole,
      };

      try {
        const res = await fetch(API_BASE + '/api/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();

        if (res.ok) {
          msg.textContent = form.dataset.msgSuccess || 'Check your email to confirm!';
          msg.classList.add('success');
          emailInput.value = '';
        } else {
          msg.textContent = data.error || form.dataset.msgError || 'Something went wrong. Please try again.';
          msg.classList.add('error');
        }
      } catch {
        msg.textContent = form.dataset.msgError || 'Network error. Please try again.';
        msg.classList.add('error');
      } finally {
        updateSubmitState();
        if (window.turnstile) {
          const widget = form.querySelector('.cf-turnstile');
          if (widget) turnstile.reset(widget);
        }
      }
    });

    setupCocScroll();
    updateSubmitState();
  }

  function initSignup() {
    loadCount();
    initForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSignup, { once: true });
  } else {
    initSignup();
  }
})();
