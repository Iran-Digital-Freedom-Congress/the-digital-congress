// Jomhoor wallet registration — inline experience on difcongress.com.
//
// Desktop: shows a QR code; page polls until the phone completes the SSO flow.
// Mobile:  redirects this browser into the SSO flow; callback redirects back
//          here with ?wallet_registered=1 so the page shows success inline.
//
// Depends on: QRCode global from qrcodejs (loaded before this script).
(function () {
  const IS_LOCAL  = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  const API_BASE  = IS_LOCAL
    ? 'http://localhost:8787'
    : 'https://congress-signup.difcongress.workers.dev';
  const HALL_URL  = 'https://hall.difcongress.com';
  const IOS_URL  = 'https://apps.apple.com/app/id6770843571';
  const AND_URL  = 'https://play.google.com/store/apps/details?id=org.jomhoor.app';

  const I18N = {
    en: {
      registerButton: 'Register with Jomhoor',
      successTitle: 'Your Jomhoor wallet is registered',
      successReady: 'Your Congress Hall login is ready. Redirecting now...',
      countdown: 'Continuing to the Hall in {seconds}s...',
      redirecting: 'Redirecting...',
      continueHall: 'Continue to Congress Hall',
      notifyPrompt: 'Get notified when the Congress begins:',
      emailPlaceholder: 'your@email.com',
      notifyBtn: 'Notify me',
      done: 'Done!',
      somethingWentWrong: 'Something went wrong.',
      networkError: 'Network error. Please try again.',
      qrExpired: 'QR expired. Refresh the page to try again.',
    },
    fa: {
      registerButton: 'ثبت‌نام با جمهور',
      successTitle: 'کیف پول جمهور شما ثبت شد',
      successReady: 'ورود شما به Congress Hall آماده است. در حال انتقال...',
      countdown: 'ورود به Hall تا {seconds} ثانیه دیگر...',
      redirecting: 'در حال انتقال...',
      continueHall: 'ورود به Congress Hall',
      notifyPrompt: 'برای شروع کنگره اطلاع‌رسانی دریافت کنید:',
      emailPlaceholder: 'you@example.com',
      notifyBtn: 'به من اطلاع بده',
      done: 'انجام شد!',
      somethingWentWrong: 'مشکلی پیش آمد.',
      networkError: 'خطای شبکه. دوباره تلاش کنید.',
      qrExpired: 'کد QR منقضی شد. صفحه را تازه کنید و دوباره تلاش کنید.',
    },
    ar: {
      registerButton: 'التسجيل عبر جمهور',
      successTitle: 'تم تسجيل محفظة جمهور الخاصة بك',
      successReady: 'تسجيل دخولك إلى Congress Hall جاهز. جارٍ التحويل...',
      countdown: 'المتابعة إلى Hall خلال {seconds} ثانية...',
      redirecting: 'جارٍ التحويل...',
      continueHall: 'المتابعة إلى Congress Hall',
      notifyPrompt: 'احصل على إشعار عند بدء المؤتمر:',
      emailPlaceholder: 'you@example.com',
      notifyBtn: 'أبلغني',
      done: 'تم!',
      somethingWentWrong: 'حدث خطأ ما.',
      networkError: 'خطأ في الشبكة. حاول مرة أخرى.',
      qrExpired: 'انتهت صلاحية رمز QR. حدّث الصفحة وحاول مرة أخرى.',
    },
    ku: {
      registerButton: 'تۆماربوون بە جمهور',
      successTitle: 'کیف‌پوڵی جمهورەکەت تۆمارکرا',
      successReady: 'چوونەژوورەوەی تۆ بۆ Congress Hall ئامادەیە. ئێستا دەگوازرێیتەوە...',
      countdown: 'چوون بۆ Hall لە {seconds} چرکەدا...',
      redirecting: 'لە گواستنەوەدایە...',
      continueHall: 'بەردەوامبوون بۆ Congress Hall',
      notifyPrompt: 'کاتێک کۆنگرە دەستپێدەکات ئاگادارم بکەوە:',
      emailPlaceholder: 'you@example.com',
      notifyBtn: 'ئاگادارم بکەوە',
      done: 'تەواو!',
      somethingWentWrong: 'هەڵەیەک ڕوویدا.',
      networkError: 'هەڵەی تۆڕ. تکایە دووبارە هەوڵ بدەوە.',
      qrExpired: 'کۆدی QR بەسەرچوو. لاپەڕەکە نوێ بکەرەوە و دووبارە هەوڵ بدە.',
    },
    bal: {
      registerButton: 'جمھور ءِ رھسرا ثبت‌نام بکن اِت',
      successTitle: 'جمھور ءِ وتی والیٹ ثبت بوت',
      successReady: 'وتی Congress Hall ءِ لاگین تیار اِنت. اَنتقال جاری اِنت...',
      countdown: '{seconds} سیکنڈ ءِ پَد Hall ءَ روو اِنت...',
      redirecting: 'اَنتقال جاری اِنت...',
      continueHall: 'Congress Hall ءَ روو بکن اِت',
      notifyPrompt: 'کانگرس ءِ شروٗع ءَ دێت، مرا خبردار بکن اِت:',
      emailPlaceholder: 'you@example.com',
      notifyBtn: 'مرا خبر بکن اِت',
      done: 'بوت!',
      somethingWentWrong: 'یک ہلاسی بوت.',
      networkError: 'نیٹورک ءِ ہلاسی. دویم ہیل بکن اِت.',
      qrExpired: 'QR منقضی بوت. صفحہ ءَ تازه بکن اِت ءُ دویم ہیل بکن اِت.',
    },
    az: {
      registerButton: 'Jomhoor ilə qeydiyyat',
      successTitle: 'Jomhoor cüzdanınız qeydiyyatdan keçdi',
      successReady: 'Congress Hall girişiniz hazırdır. İndi yönləndirilirsiniz...',
      countdown: '{seconds} san sonra Hall-a keçid ediləcək...',
      redirecting: 'Yönləndirilir...',
      continueHall: 'Congress Hall-a davam et',
      notifyPrompt: 'Konqres başlayanda xəbər alın:',
      emailPlaceholder: 'you@example.com',
      notifyBtn: 'Mənə xəbər ver',
      done: 'Hazırdır!',
      somethingWentWrong: 'Bir xəta baş verdi.',
      networkError: 'Şəbəkə xətası. Zəhmət olmasa yenidən yoxlayın.',
      qrExpired: 'QR vaxtı bitib. Səhifəni yeniləyin və yenidən cəhd edin.',
    },
  };

  function currentLocale() {
    const lang = (document.documentElement.lang || 'en').toLowerCase();
    if (lang.startsWith('ckb')) return 'ku';
    if (lang.startsWith('ku')) return 'ku';
    if (lang.startsWith('fa')) return 'fa';
    if (lang.startsWith('ar')) return 'ar';
    if (lang.startsWith('bal')) return 'bal';
    if (lang.startsWith('az')) return 'az';
    return 'en';
  }

  function t(key, vars = {}) {
    const locale = currentLocale();
    const table = I18N[locale] || I18N.en;
    let value = table[key] || I18N.en[key] || '';
    Object.keys(vars).forEach((name) => {
      value = value.replace(`{${name}}`, String(vars[name]));
    });
    return value;
  }

  // ─── Device detection ──────────────────────────────────────────────────────
  function isMobile() {
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  function getSelectedMembershipType() {
    const selected = document.querySelector('input[name="membership-type"]:checked');
    const value = selected ? selected.value : 'observer';
    if (value === 'observer' || value === 'contributor' || value === 'organiser') {
      return value;
    }
    return 'observer';
  }

  function enforceObserverOnlyMembership() {
    document.querySelectorAll('input[name="membership-type"]').forEach((input) => {
      const isObserver = input.value === 'observer';
      input.disabled = !isObserver;
      if (isObserver) {
        input.checked = true;
      }

      const option = input.closest('.role-option');
      if (!option) return;
      if (isObserver) {
        option.classList.remove('role-option--disabled');
      } else {
        option.classList.add('role-option--disabled');
      }
    });

    document.querySelectorAll('.coming-soon').forEach((el) => {
      el.hidden = false;
    });
  }

  // ─── Return-from-SSO: mobile browser lands back here after callback ────────
  function checkReturnParam() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('wallet_registered') !== '1') return false;
    const token = params.get('token') || '';
    // Clean the URL so a refresh doesn't re-trigger
    history.replaceState({}, '', window.location.pathname + window.location.hash);
    showSuccess(token);
    return true;
  }

  // ─── QR rendering (qrcodejs or image fallback) ─────────────────────────────
  function renderQR(container, text) {
    container.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
      new QRCode(container, {
        text,
        width: 200,
        height: 200,
        colorDark: '#0F172A',
        colorLight: '#FFFFFF',
        correctLevel: QRCode.CorrectLevel.M,
      });
    } else {
      const img = document.createElement('img');
      img.src = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(text)}&size=200x200`;
      img.alt = 'QR code';
      img.width = 200;
      img.height = 200;
      container.appendChild(img);
    }
  }

  // ─── Polling (desktop only) ────────────────────────────────────────────────
  let _pollTimer = null;

  function startPolling(sessionId, onDone, onExpired) {
    const INTERVAL_MS = 2500;
    const TIMEOUT_MS  = 10 * 60 * 1000; // matches server TTL
    const deadline    = Date.now() + TIMEOUT_MS;

    function tick() {
      if (Date.now() > deadline) { onExpired(); return; }
      fetch(`${API_BASE}/api/sso/guest/poll?session_id=${encodeURIComponent(sessionId)}`)
        .then(r => r.json())
        .then(data => {
          if (data.done)    { onDone(data.token); }
          else if (data.expired) { onExpired(); }
          else              { _pollTimer = setTimeout(tick, INTERVAL_MS); }
        })
        .catch(() => { _pollTimer = setTimeout(tick, INTERVAL_MS * 2); });
    }
    _pollTimer = setTimeout(tick, INTERVAL_MS);
  }

  function stopPolling() {
    if (_pollTimer) { clearTimeout(_pollTimer); _pollTimer = null; }
  }

  // ─── State: success ────────────────────────────────────────────────────────
  function showSuccess(token) {
    const container = document.getElementById('jomhoor-register');
    if (!container) return;

    const REDIRECT_SECONDS = 5;

    container.innerHTML = `
      <div class="wallet-register__success">
        <div class="wallet-register__check">✓</div>
        <h3>${t('successTitle')}</h3>
        <p>${t('successReady')}</p>
        <p id="wallet-hall-countdown" class="wallet-register__countdown">
          ${t('countdown', { seconds: REDIRECT_SECONDS })}
        </p>
        <div class="wallet-register__actions">
          <a id="wallet-go-hall" class="wallet-register__go-hall" href="${HALL_URL}">
            ${t('continueHall')}
          </a>
        </div>
        <div class="wallet-register__email-form">
          <p>${t('notifyPrompt')}</p>
          <div class="wallet-register__email-row">
            <input id="wallet-email-input" type="email"
              placeholder="${t('emailPlaceholder')}" autocomplete="email">
            <button id="wallet-email-btn" type="button">${t('notifyBtn')}</button>
          </div>
          <p id="wallet-email-msg" class="wallet-register__email-msg" aria-live="polite"></p>
        </div>
      </div>`;

    const countdownEl = document.getElementById('wallet-hall-countdown');
    let secondsLeft = REDIRECT_SECONDS;
    const countdownTimer = window.setInterval(() => {
      secondsLeft -= 1;
      if (!countdownEl) return;
      if (secondsLeft <= 0) {
        countdownEl.textContent = t('redirecting');
        window.clearInterval(countdownTimer);
        return;
      }
      countdownEl.textContent = t('countdown', { seconds: secondsLeft });
    }, 1000);

    window.setTimeout(() => {
      window.location.assign(HALL_URL);
    }, REDIRECT_SECONDS * 1000);

    const btn   = document.getElementById('wallet-email-btn');
    const input = document.getElementById('wallet-email-input');
    const msg   = document.getElementById('wallet-email-msg');

    btn.addEventListener('click', async () => {
      const email = input.value.trim();
      if (!email) return;
      btn.disabled = true;
      msg.textContent = '';
      try {
        const res  = await fetch(`${API_BASE}/api/sso/guest/email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, email }),
        });
        const data = await res.json();
        if (res.ok) {
          msg.textContent = '✓ ' + (data.message || t('done'));
          msg.className = 'wallet-register__email-msg success';
          input.disabled = true;
        } else {
          msg.textContent = data.error || t('somethingWentWrong');
          msg.className = 'wallet-register__email-msg error';
          btn.disabled = false;
        }
      } catch {
        msg.textContent = t('networkError');
        msg.className = 'wallet-register__email-msg error';
        btn.disabled = false;
      }
    });
  }

  // ─── State: QR shown (desktop) ────────────────────────────────────────────
  function showQR(authorizeUrl, sessionId) {
    const qrWrap    = document.getElementById('wallet-qr-wrap');
    const qrEl      = document.getElementById('wallet-qr');
    const startBtn  = document.getElementById('wallet-register-btn');

    if (startBtn) startBtn.hidden = true;
    if (qrWrap)   qrWrap.hidden  = false;
    if (qrEl)     renderQR(qrEl, authorizeUrl);

    startPolling(
      sessionId,
      (token) => { stopPolling(); showSuccess(token); },
      ()      => {
        stopPolling();
        if (qrEl) {
          qrEl.innerHTML = `<p class="wallet-register__expired">${t('qrExpired')}</p>`;
        }
      }
    );
  }

  // ─── Main: button click ────────────────────────────────────────────────────
  function initButton() {
    const btn = document.getElementById('wallet-register-btn');
    if (!btn) return;
    const defaultLabel = btn.dataset.label || btn.textContent.trim() || t('registerButton');
    btn.dataset.label = defaultLabel;

    btn.addEventListener('click', async () => {
      btn.disabled   = true;
      btn.textContent = '…';

      let sessionId, authorizeUrl;
      const membershipType = getSelectedMembershipType();
      try {
        const res = await fetch(`${API_BASE}/api/sso/guest/init`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ membership_type: membershipType }),
        });
        if (!res.ok) throw new Error('init failed');
        const data = await res.json();
        sessionId    = data.session_id;
        authorizeUrl = data.authorize_url;
      } catch {
        btn.disabled   = false;
        btn.textContent = btn.dataset.label || t('registerButton');
        return;
      }

      if (isMobile()) {
        // Mobile: follow the authorize URL; wallet opens via Universal Link;
        // after consent sso-svc redirects back here with ?wallet_registered=1.
        window.location.href = authorizeUrl;
      } else {
        // Desktop: stay on page, show QR, poll for completion.
        showQR(authorizeUrl, sessionId);
      }
    });
  }

  // ─── Boot ──────────────────────────────────────────────────────────────────
  function init() {
    enforceObserverOnlyMembership();
    if (!checkReturnParam()) {
      initButton();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
