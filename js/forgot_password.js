(function () {
  'use strict';

  const GMAIL_RE = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
  const TIMEOUT_MS = 15000;
  let csrfToken = '';
  let sessionBootstrapped = false;
  let turnstileToken = '';
  let turnstileWidgetId = null;
  let turnstileRequired = false;
  let isSubmitting = false;
  let isPageHiding = false;
  let countdownTimer = null;
  const activeControllers = new Set();

  const setVisible = (el, show) => {
    if (!el) return;
    el.hidden = !show;
    el.classList.toggle('hidden', !show);
  };

  function getAuthApiUrl(action) {
    const p = (window.location?.pathname || '').replace(/\\/g, '/');
    const root = window.SanBongApp?.getAppBase?.() || window.SanBongHelpers?.getAppBase?.() ||
      p.match(/^(.*?\/Quan_Ly_San_Bong)/i)?.[1] || (p.includes('/Quan_Ly_San_Bong') ? '/Quan_Ly_San_Bong' : '');
    return `${String(root).replace(/\/+$/, '')}/api/auth.php?action=${encodeURIComponent(action)}`;
  }

  const readCsrf = () => csrfToken || (csrfToken = String(window.SanBongApp?.getCsrfToken?.() || window.SanBongHelpers?.getCsrfToken?.() || '').trim());
  const saveCsrf = (token) => {
    if (typeof token !== 'string' || !token.trim()) return;
    csrfToken = token.trim();
    (window.SanBongApp?.setCsrfToken || window.SanBongHelpers?.setCsrfToken)?.(csrfToken);
  };

  function createRequest() {
    const controller = new AbortController();
    let timedOut = false;
    activeControllers.add(controller);
    const timer = window.setTimeout(() => { timedOut = true; controller.abort(); }, TIMEOUT_MS);
    return {
      signal: controller.signal,
      isTimedOut: () => timedOut,
      cleanup: () => { window.clearTimeout(timer); activeControllers.delete(controller); }
    };
  }

  function initTurnstile(siteKey) {
    const box = document.getElementById('turnstile-forgot-container');
    if (!box || !siteKey || siteKey === 'disabled') return;
    turnstileRequired = true;
    setVisible(box, true);
    if (box.dataset.rendered === 'true') return;
    box.dataset.rendered = 'true';
    const render = () => {
      if (typeof window.turnstile?.render !== 'function') return;
      try {
        turnstileWidgetId = window.turnstile.render('#turnstile-forgot-container', {
          sitekey: siteKey, theme: 'light',
          callback: (t) => { turnstileToken = t || ''; },
          'expired-callback': () => { turnstileToken = ''; },
          'error-callback': () => { turnstileToken = ''; }
        });
      } catch (e) {}
    };
    if (window.turnstile) return render();
    const s = Object.assign(document.createElement('script'), { src: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', async: true, defer: true, onload: render });
    document.head.appendChild(s);
  }

  const resetTurnstile = () => {
    turnstileToken = '';
    if (typeof window.turnstile?.reset === 'function' && turnstileWidgetId !== null) try { window.turnstile.reset(turnstileWidgetId); } catch (e) {}
  };

  async function bootstrapSession(forceRefresh) {
    if (!forceRefresh && sessionBootstrapped && readCsrf()) return readCsrf();
    const req = createRequest();
    try {
      const res = await fetch(getAuthApiUrl('me'), { credentials: 'same-origin', cache: 'no-store', signal: req.signal });
      saveCsrf(res.headers?.get('X-CSRF-Token'));
      const data = await res.json().catch(() => null);
      if (res.ok && data && typeof data === 'object') {
        sessionBootstrapped = true;
        if (data.csrf_token) saveCsrf(data.csrf_token);
        if (data.turnstile_site_key) initTurnstile(data.turnstile_site_key);
      }
    } catch (e) { /* Bỏ qua lỗi bootstrap để form vẫn sử dụng được */ } finally { req.cleanup(); }
    return readCsrf();
  }

  document.addEventListener('DOMContentLoaded', () => {
    const $ = (id) => document.getElementById(id);
    const [form, emailInput, emailError, usernameInput, usernameError, honeypotInput, submitBtn, alertBox, alertText, successPanel, successMessage, resendBtn, pitchBg] = [
      'forgot-password-form', 'forgot-email', 'forgot-email-error', 'forgot-username', 'forgot-username-error',
      'forgot-website', 'forgot-submit-btn', 'forgot-alert-box', 'forgot-alert-text', 'forgot-success-panel',
      'forgot-success-message', 'forgot-resend-btn', 'forgot-pitch-bg'
    ].map($);
    if (pitchBg && window.SanBongApp?.renderPitchSVG) pitchBg.innerHTML = window.SanBongApp.renderPitchSVG('bright', 'h-full');

    function setAlert(message, type) {
      if (!alertBox || !alertText) return;
      alertBox.classList.remove('bg-rose-50', 'text-rose-700', 'border', 'border-rose-200', 'bg-emerald-50', 'text-emerald-800', 'border-emerald-200');
      setVisible(alertBox, Boolean(message));
      alertText.textContent = message || '';
      if (!message) return;
      alertBox.classList.add(...(type === 'success'
        ? ['bg-emerald-50', 'text-emerald-800', 'border', 'border-emerald-200']
        : ['bg-rose-50', 'text-rose-700', 'border', 'border-rose-200']));
    }

    function setFieldError(inputEl, errorEl, message) {
      if (!inputEl || !errorEl) return;
      errorEl.textContent = message || '';
      errorEl.classList.toggle('hidden', !message);
      ['border-red-500', 'ring-2', 'ring-red-100'].forEach((cls) => inputEl.classList.toggle(cls, Boolean(message)));
      if (message) inputEl.setAttribute('aria-invalid', 'true');
      else inputEl.removeAttribute('aria-invalid');
    }

    const clearCountdown = () => { if (countdownTimer !== null) { window.clearInterval(countdownTimer); countdownTimer = null; } };

    function startResendCooldown(seconds) {
      clearCountdown();
      if (!resendBtn) return;
      let left = Math.max(0, Number(seconds) || 0);
      if (left <= 0) {
        resendBtn.disabled = false;
        resendBtn.textContent = 'Kiểm tra lại';
        return;
      }
      const tick = () => {
        resendBtn.disabled = left > 0;
        resendBtn.textContent = left > 0 ? `Kiểm tra lại (${left}s)` : 'Kiểm tra lại';
        if (left <= 0) clearCountdown();
      };
      tick();
      countdownTimer = window.setInterval(() => { left -= 1; tick(); }, 1000);
    }

    function validateForm() {
      setFieldError(emailInput, emailError, '');
      setFieldError(usernameInput, usernameError, '');
      const email = emailInput ? emailInput.value.trim() : '';
      const username = usernameInput ? usernameInput.value.trim() : '';
      const emailMsg = !email ? 'Vui lòng nhập địa chỉ Gmail.' : (email.length > 100 || !GMAIL_RE.test(email) ? 'Vui lòng nhập địa chỉ Gmail hợp lệ (ví dụ: tenban@gmail.com).' : '');
      const userMsg = !username ? 'Vui lòng nhập tên đăng nhập.' : (username.length < 3 || username.length > 50 || /[\x00-\x1F\x7F]/.test(username) ? 'Tên đăng nhập phải từ 3 đến 50 ký tự.' : '');
      if (emailMsg) setFieldError(emailInput, emailError, emailMsg);
      if (userMsg) setFieldError(usernameInput, usernameError, userMsg);
      const firstInvalid = emailMsg ? emailInput : (userMsg ? usernameInput : null);
      if (firstInvalid) { firstInvalid.focus(); return null; }
      return { email, username };
    }

    async function handleHttpFailure(status, res, payload, allowCsrfRetry) {
      const code = res?.error?.code || res?.ref_code || '';
      if (status === 422) {
        const fe = res?.error?.fieldErrors || {};
        if (fe.email) setFieldError(emailInput, emailError, String(fe.email));
        if (fe.username) setFieldError(usernameInput, usernameError, String(fe.username));
        setAlert(res?.message || 'Vui lòng kiểm tra lại thông tin đã nhập.', 'error');
        return (fe.email ? emailInput : (fe.username ? usernameInput : null))?.focus();
      }
      if (status === 404) {
        resetTurnstile();
        return setAlert(res?.message || 'Không có người dùng khớp với Gmail và Tên đăng nhập đã nhập.', 'error');
      }
      if (status === 403) {
        if (code === 'ERR_TURNSTILE_FAILED') {
          resetTurnstile();
          return setAlert(res?.message || 'Xác thực chống bot thất bại. Vui lòng thử lại.', 'error');
        }
        if (allowCsrfRetry) {
          csrfToken = '';
          window.SanBongApp?.clearCsrfToken?.();
          if (await bootstrapSession(true)) return submitForgotPassword(payload, false);
        }
        return setAlert(res?.message || 'Phiên bảo mật không hợp lệ hoặc đã hết hạn. Vui lòng tải lại trang.', 'error');
      }
      const fallback = status === 429
        ? 'Bạn đã kiểm tra quá nhiều lần. Vui lòng thử lại sau ít phút.'
        : (status >= 500 ? 'Máy chủ đang bận. Vui lòng thử lại sau ít phút.' : 'Không thể xử lý yêu cầu lúc này.');
      setAlert(res?.message || fallback, 'error');
    }

    async function submitForgotPassword(payload, allowCsrfRetry) {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return setAlert('Thiết bị đang ngoại tuyến. Vui lòng kiểm tra kết nối mạng và thử lại.', 'error');
      }
      const token = (await bootstrapSession(!allowCsrfRetry)) || '';
      const headers = window.SanBongApp?.getAuthFetchHeaders ? window.SanBongApp.getAuthFetchHeaders() : { 'Content-Type': 'application/json' };
      if (token) headers['X-CSRF-Token'] = token;
      const req = createRequest();
      try {
        const response = await fetch(getAuthApiUrl('forgot_password'), {
          method: 'POST',
          headers,
          credentials: 'same-origin',
          signal: req.signal,
          body: JSON.stringify({ csrf_token: token, email: payload.email, username: payload.username, website: honeypotInput?.value || '', cf_turnstile_response: turnstileToken || '' })
        });
        saveCsrf(response.headers?.get('X-CSRF-Token'));
        const res = await response.json().catch(() => null);
        if (res?.csrf_token) saveCsrf(res.csrf_token);
        if (response.ok && res?.success) {
          resetTurnstile();
          setAlert('');
          setVisible(form, false);
          setVisible(successPanel, true);
          if (successMessage) successMessage.textContent = res.message || 'Thành công: Tài khoản tồn tại trên hệ thống.';
          return startResendCooldown(res?.data?.cooldown_seconds);
        }
        await handleHttpFailure(response.status, res, payload, allowCsrfRetry);
      } catch (err) {
        if (err?.name === 'AbortError') {
          if (!isPageHiding) setAlert(req.isTimedOut() ? 'Yêu cầu quá thời gian chờ. Vui lòng thử lại.' : 'Yêu cầu đã bị hủy.', 'error');
          return;
        }
        setAlert('Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.', 'error');
      } finally {
        req.cleanup();
      }
    }

    const setLoading = (loading) => {
      isSubmitting = loading;
      if (!submitBtn) return;
      submitBtn.disabled = loading;
      submitBtn.textContent = loading ? 'Đang kiểm tra...' : 'Kiểm tra tài khoản';
      submitBtn.setAttribute('aria-busy', loading ? 'true' : 'false');
    };

    emailInput?.addEventListener('input', () => { setFieldError(emailInput, emailError, ''); setAlert(''); });
    usernameInput?.addEventListener('input', () => { setFieldError(usernameInput, usernameError, ''); setAlert(''); });
    resendBtn?.addEventListener('click', () => {
      if (resendBtn.disabled) return;
      clearCountdown();
      setVisible(successPanel, false);
      setVisible(form, true);
      setAlert('');
      emailInput?.focus();
    });
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isSubmitting) return;
      setAlert('');
      const validated = validateForm();
      if (!validated) return;
      if (turnstileRequired && !turnstileToken) return setAlert('Vui lòng hoàn tất xác thực bảo mật trước khi kiểm tra tài khoản.', 'error');
      setLoading(true);
      try { await submitForgotPassword(validated, true); } finally { setLoading(false); }
    });
    window.addEventListener('pagehide', () => {
      isPageHiding = true;
      clearCountdown();
      activeControllers.forEach((ctrl) => { try { ctrl.abort(); } catch (e) {} });
      activeControllers.clear();
    });
    bootstrapSession(false);
  });
})();
