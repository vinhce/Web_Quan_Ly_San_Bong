
let pending2FaUser = null;
let pending2FaToken = null;
let loginTurnstileToken = '';

function getAuthApiUrl(action) {
  let root = '';
  if (typeof window.SanBongApp?.getAppBase === 'function') {
    root = window.SanBongApp.getAppBase() || '';
  } else if (typeof window.SanBongHelpers?.getAppBase === 'function') {
    root = window.SanBongHelpers.getAppBase() || '';
  } else {
    const pathname = (window.location && typeof window.location.pathname === 'string')
      ? window.location.pathname.replace(/\\/g, '/')
      : '';
    const match = pathname.match(/^(.*?\/Quan_Ly_San_Bong)/i);
    root = match ? match[1] : (pathname.includes('/Quan_Ly_San_Bong') ? '/Quan_Ly_San_Bong' : '');
  }
  root = String(root).replace(/\/+$/, '');
  return `${root}/api/auth.php?action=${action}`;
}

function resolveAppUrl(target) {
  if (window.SanBongApp && typeof window.SanBongApp.getRelativePath === 'function') {
    return window.SanBongApp.getRelativePath(target);
  }
  const pathname = (window.location && window.location.pathname) ? window.location.pathname.replace(/\\/g, '/') : '/';
  const match = pathname.match(/^(.*?\/Quan_Ly_San_Bong)/i);
  const base = match ? match[1] : '';
  const root = base ? `${base}/` : '/';

  if (!target || target === 'index.html' || target === '/' || target === '') {
    return root;
  }
  const clean = String(target)
    .trim()
    .replace(/^\.\.\//, '')
    .replace(/^html\//, '')
    .replace(/^\/+/, '')
    .replace(/\.html(?=$|[?#])/, '');

  if (clean === 'portal-admin' || clean === 'portal-admin/') {
    return `${root}portal-admin/`;
  }
  return `${root}${clean}`;
}

function syncStoredUser(user) {
  if (!user) return;
  try {
    const raw = JSON.stringify(user);
    sessionStorage.setItem('sb_current_user', raw);
    localStorage.setItem('sb_current_user', raw);
    window.sb_current_user = user;
  } catch (e) {
    console.warn('Storage sync error:', e);
  }
}

function handleLoginRedirect(user) {
  syncStoredUser(user);
  const isPortalRole = Boolean(user && ['admin', 'manager', 'staff'].includes(user.role));
  const urlParams = new URLSearchParams(window.location.search);
  const redirectParam = urlParams.get('redirect');

  if (isPortalRole) {
    if (redirectParam) {
      const cleanParam = String(redirectParam).trim().replace(/^\/+/, '').replace(/^html\//, '');
      const baseRoute = cleanParam.split(/[?#]/)[0].replace(/\/+$/, '');
      if (baseRoute === 'portal-admin' || baseRoute === 'portal-admin/index') {
        window.location.href = resolveAppUrl('portal-admin/');
        return;
      }
      window.location.href = resolveAppUrl(cleanParam);
    } else {
      window.location.href = resolveAppUrl('portal-admin/');
    }
    return;
  }

  // Khách hàng thường (customer/user):
  if (redirectParam) {
    const cleanParam = String(redirectParam).trim().replace(/^\/+/, '').replace(/^html\//, '');
    const baseRoute = cleanParam.split(/[?#]/)[0].replace(/\.html$/, '');
    if (baseRoute === 'portal-admin' || baseRoute === 'portal-admin/') {
      window.location.href = resolveAppUrl('');
      return;
    }
    const ALLOWED = new Set(['fields', 'booking', 'checkout', 'success', 'history', 'field-detail', 'matchmaking']);
    if (ALLOWED.has(baseRoute)) {
      window.location.href = resolveAppUrl(cleanParam);
      return;
    }
  }

  // Mặc định khách hàng thường chuyển về trang chủ
  window.location.href = resolveAppUrl('');
}

function initLoginTurnstile(siteKey) {
  const wrap = document.getElementById('login-turnstile-wrap');
  if (!wrap || !siteKey || wrap.dataset.rendered) return;
  wrap.dataset.rendered = 'true';
  const renderWidget = () => {
    if (window.turnstile && typeof window.turnstile.render === 'function') {
      try {
        window.turnstile.render('#login-turnstile-wrap', {
          sitekey: siteKey,
          theme: 'light',
          callback: function (t) { loginTurnstileToken = t; },
          'expired-callback': function () { loginTurnstileToken = ''; }
        });
      } catch (e) {}
    }
  };
  if (window.turnstile) {
    renderWidget();
  } else {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.defer = true;
    s.onload = renderWidget;
    document.head.appendChild(s);
  }
}

function setAuthMessage(msg, type = 'error') {
  const box = document.getElementById('auth-alert-box');
  if (!box) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(msg, type);
    }
    return;
  }

  if (!msg) {
    box.classList.add('hidden');
    box.innerHTML = '';
    return;
  }

  box.classList.remove('hidden', 'bg-rose-50', 'text-rose-700', 'border-rose-200', 'bg-emerald-50', 'text-emerald-800', 'border-emerald-200');

  if (type === 'success') {
    box.classList.add('bg-emerald-50', 'text-emerald-800', 'border', 'border-emerald-200');
    box.innerHTML = `
      <svg class="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
      <div class="leading-snug">${window.SanBongApp ? window.SanBongApp.escapeHTML(msg) : msg}</div>
    `;
  } else {
    box.classList.add('bg-rose-50', 'text-rose-700', 'border', 'border-rose-200');
    box.innerHTML = `
      <svg class="w-4 h-4 text-rose-600 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
      <div class="leading-snug">${window.SanBongApp ? window.SanBongApp.escapeHTML(msg) : msg}</div>
    `;
  }
}

function clearFieldErrors() {
  document.querySelectorAll('#login-form input, #register-form input').forEach(inp => {
    inp.classList.remove('border-rose-500', 'ring-2', 'ring-rose-100');
  });
}

function markFieldError(inputId) {
  const el = document.getElementById(inputId);
  if (el) {
    el.classList.add('border-rose-500', 'ring-2', 'ring-rose-100');
    el.focus();
    const onType = () => {
      el.classList.remove('border-rose-500', 'ring-2', 'ring-rose-100');
      setAuthMessage('');
      el.removeEventListener('input', onType);
    };
    el.addEventListener('input', onType);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('tab') === 'register') {
    switchAuthTab('register');
  }
  const bg = document.getElementById('login-pitch-bg');
  if (bg && window.SanBongApp) {
    bg.innerHTML = window.SanBongApp.renderPitchSVG('bright', 'h-full');
  }

  // Khởi tạo Turnstile nếu có sitekey
  if (window.TURNSTILE_SITE_KEY) {
    initLoginTurnstile(window.TURNSTILE_SITE_KEY);
  } else {
    fetch(getAuthApiUrl('me'), { credentials: 'same-origin', cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d && d.turnstile_site_key) {
          window.TURNSTILE_SITE_KEY = d.turnstile_site_key;
          initLoginTurnstile(d.turnstile_site_key);
        }
        if (d && d.csrf_token && window.SanBongApp?.setCsrfToken) {
          window.SanBongApp.setCsrfToken(d.csrf_token);
        }
      })
      .catch(() => {});
  }

  // Legal modal buttons
  document.getElementById('btn-show-terms-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (window.SanBongUI?.showTermsModal) window.SanBongUI.showTermsModal();
  });
  document.getElementById('btn-show-privacy-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (window.SanBongUI?.showPrivacyPolicyModal) window.SanBongUI.showPrivacyPolicyModal();
  });

  // Login form submit
  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors();
    setAuthMessage('');

    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const username = usernameInput?.value.trim();
    const password = passwordInput?.value;
    const submitBtn = document.getElementById('login-submit-btn');

    if (!username) {
      setAuthMessage('Vui lòng nhập số điện thoại hoặc email đăng nhập.', 'error');
      markFieldError('login-username');
      return;
    }

    if (!password) {
      setAuthMessage('Vui lòng nhập mật khẩu tài khoản.', 'error');
      markFieldError('login-password');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Đang xác thực an toàn...';
    }

    try {
      if (window.SanBongApp?.ensureCsrfToken) {
        const rootBase = (typeof window.SanBongApp?.getAppBase === 'function')
          ? window.SanBongApp.getAppBase()
          : ((typeof window.SanBongHelpers?.getAppBase === 'function')
              ? window.SanBongHelpers.getAppBase()
              : (window.location.pathname.includes('/Quan_Ly_San_Bong') ? '/Quan_Ly_San_Bong' : ''));
        const apiBase = rootBase ? (String(rootBase).replace(/\/+$/, '') + '/') : '/';
        await window.SanBongApp.ensureCsrfToken(apiBase);
      }
      const headers = window.SanBongApp?.getAuthFetchHeaders
        ? window.SanBongApp.getAuthFetchHeaders()
        : { 'Content-Type': 'application/json' };

      const response = await fetch(getAuthApiUrl('login'), {
        method: 'POST',
        headers,
        credentials: 'same-origin',
        body: JSON.stringify({
          username,
          password,
          turnstile_token: loginTurnstileToken || ''
        })
      });

      const tokenHeader = response.headers ? response.headers.get('X-CSRF-Token') : null;
      if (tokenHeader && window.SanBongApp?.setCsrfToken) {
        window.SanBongApp.setCsrfToken(tokenHeader);
      }

      const resText = await response.text();
      let res = null;
      try {
        res = JSON.parse(resText);
      } catch (parseErr) {
        console.error('Login response JSON parse error:', parseErr, resText);
        setAuthMessage(response.ok ? 'Phản hồi từ máy chủ không hợp lệ.' : `Lỗi máy chủ (${response.status}). Vui lòng thử lại sau.`, 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Đăng nhập vào hệ thống';
        }
        return;
      }

      if (res?.csrf_token && window.SanBongApp?.setCsrfToken) {
        window.SanBongApp.setCsrfToken(res.csrf_token);
      }

      if (response.ok && res.require_2fa) {
        pending2FaUser = res.user || { username };
        pending2FaToken = res.temp_token || '';
        const box2Fa = document.getElementById('login-2fa-box');
        if (box2Fa) box2Fa.classList.remove('hidden');
        if (submitBtn) submitBtn.classList.add('hidden');
        const codeInput = document.getElementById('login-2fa-code');
        if (codeInput) {
          codeInput.value = '';
          codeInput.focus();
        }
        setAuthMessage('🔐 Tài khoản bảo vệ 2FA: Vui lòng nhập mã 6 số từ Google Authenticator.', 'success');
        if (window.SanBongApp?.showToast) {
          window.SanBongApp.showToast('Vui lòng nhập mã xác thực OTP 6 số', 'info');
        }
        return;
      }

      if (response.ok && res.success) {
        setAuthMessage('✓ Đăng nhập thành công! Đang chuyển hướng...', 'success');
        if (window.SanBongApp?.showToast) {
          window.SanBongApp.showToast('Đăng nhập thành công! Đang chuyển hướng...', 'success');
        }
        syncStoredUser(res.user);

        setTimeout(() => {
          handleLoginRedirect(res.user);
        }, 350);
        return;
      } else {
        const errMsg = res?.message || 'Thông tin đăng nhập không chính xác. Vui lòng kiểm tra lại.';
        setAuthMessage(errMsg, 'error');
        if (window.SanBongApp?.showToast) {
          window.SanBongApp.showToast(errMsg, 'error');
        }
        markFieldError('login-password');
        loginTurnstileToken = '';
        if (window.turnstile && typeof window.turnstile.reset === 'function') {
          try { window.turnstile.reset(); } catch (e) {}
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      const errMsg = 'Không thể kết nối máy chủ xác thực. Vui lòng kiểm tra kết nối mạng và thử lại.';
      setAuthMessage(errMsg, 'error');
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(errMsg, 'error');
      }
      loginTurnstileToken = '';
      if (window.turnstile && typeof window.turnstile.reset === 'function') {
        try { window.turnstile.reset(); } catch (e) {}
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Đăng nhập tài khoản';
      }
    }
  });

  // Verify 2FA submit
  document.getElementById('login-2fa-submit')?.addEventListener('click', async () => {
    const codeInput = document.getElementById('login-2fa-code');
    const code = codeInput ? codeInput.value.trim() : '';
    if (!code || code.length !== 6) {
      setAuthMessage('Vui lòng nhập đủ 6 chữ số mã xác thực 2FA.', 'error');
      if (codeInput) codeInput.focus();
      return;
    }
    const btn = document.getElementById('login-2fa-submit');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Đang kiểm tra OTP...';
    }
    try {
      if (window.SanBongApp?.ensureCsrfToken) {
        const rootBase = (typeof window.SanBongApp?.getAppBase === 'function')
          ? window.SanBongApp.getAppBase()
          : ((typeof window.SanBongHelpers?.getAppBase === 'function')
              ? window.SanBongHelpers.getAppBase()
              : (window.location.pathname.includes('/Quan_Ly_San_Bong') ? '/Quan_Ly_San_Bong' : ''));
        const apiBase = rootBase ? (String(rootBase).replace(/\/+$/, '') + '/') : '/';
        await window.SanBongApp.ensureCsrfToken(apiBase);
      }
      const headers = window.SanBongApp?.getAuthFetchHeaders ? window.SanBongApp.getAuthFetchHeaders() : { 'Content-Type': 'application/json' };
      const res = await fetch(getAuthApiUrl('verify_2fa'), {
        method: 'POST',
        headers,
        credentials: 'same-origin',
        body: JSON.stringify({
          code: code,
          temp_token: pending2FaToken,
          user_id: pending2FaUser?.id
        })
      });

      const tokenHeader = res.headers ? res.headers.get('X-CSRF-Token') : null;
      if (tokenHeader && window.SanBongApp?.setCsrfToken) {
        window.SanBongApp.setCsrfToken(tokenHeader);
      }

      const resText = await res.text();
      let json = null;
      try {
        json = JSON.parse(resText);
      } catch (parseErr) {
        console.error('2FA response JSON parse error:', parseErr, resText);
        setAuthMessage(res.ok ? 'Phản hồi từ máy chủ không hợp lệ.' : `Lỗi máy chủ (${res.status}). Vui lòng thử lại sau.`, 'error');
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Xác thực';
        }
        return;
      }

      if (json?.csrf_token && window.SanBongApp?.setCsrfToken) {
        window.SanBongApp.setCsrfToken(json.csrf_token);
      }
      if (res.ok && json.success) {
        const user = json.user || pending2FaUser;
        setAuthMessage('✓ Xác thực 2FA thành công! Đang chuyển hướng...', 'success');
        if (window.SanBongApp?.showToast) {
          window.SanBongApp.showToast('Xác thực 2FA thành công!', 'success');
        }
        syncStoredUser(user);

        setTimeout(() => {
          handleLoginRedirect(user);
        }, 350);
      } else {
        const errMsg = json?.message || 'Mã xác thực 2FA không chính xác hoặc đã hết hạn.';
        setAuthMessage(errMsg, 'error');
        if (window.SanBongApp?.showToast) {
          window.SanBongApp.showToast(errMsg, 'error');
        }
      }
    } catch (err) {
      console.error('2FA verification error:', err);
      const errMsg = 'Lỗi kết nối máy chủ xác thực 2FA. Vui lòng thử lại sau.';
      setAuthMessage(errMsg, 'error');
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(errMsg, 'error');
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Xác thực OTP & Đăng nhập';
      }
    }
  });

  // Register form submit
  document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors();
    setAuthMessage('');

    const fullName = document.getElementById('reg-name')?.value.trim();
    const rawPhone = document.getElementById('reg-phone')?.value.trim();
    const cleanPhone = rawPhone ? rawPhone.replace(/\s+/g, '') : '';
    const password = document.getElementById('reg-password')?.value;
    const consent = document.getElementById('reg-privacy-consent')?.checked;
    const submitBtn = e.target.querySelector('button[type="submit"]');

    // 1. Họ và tên: Bắt buộc, tối thiểu 2 ký tự, chỉ gồm chữ cái tiếng Việt và khoảng trắng
    if (!fullName) {
      setAuthMessage('Vui lòng nhập họ và tên của bạn.', 'error');
      markFieldError('reg-name');
      return;
    }

    if (fullName.length < 2) {
      setAuthMessage('Họ và tên phải có tối thiểu 2 ký tự.', 'error');
      markFieldError('reg-name');
      return;
    }

    const nameRegex = /^[\p{L}\s]+$/u;
    if (!nameRegex.test(fullName)) {
      setAuthMessage('Họ và tên chỉ được chứa chữ cái và khoảng trắng, không bao gồm số hoặc ký tự đặc biệt.', 'error');
      markFieldError('reg-name');
      return;
    }

    // 2. Số điện thoại: Bắt buộc, xóa khoảng trắng thừa, chuẩn di động Việt Nam 10 chữ số
    if (!cleanPhone) {
      setAuthMessage('Vui lòng nhập số điện thoại liên hệ.', 'error');
      markFieldError('reg-phone');
      return;
    }

    const phoneRegex = /^0[35789]\d{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      setAuthMessage('Số điện thoại không đúng định dạng. Vui lòng nhập số di động 10 chữ số hợp lệ tại Việt Nam (đầu số 03, 05, 07, 08, 09).', 'error');
      markFieldError('reg-phone');
      return;
    }

    // 3. Mật khẩu: Bắt buộc, tối thiểu 8 ký tự, có cả chữ cái và chữ số
    if (!password) {
      setAuthMessage('Vui lòng đặt mật khẩu bảo mật.', 'error');
      markFieldError('reg-password');
      return;
    }

    if (password.length < 8) {
      setAuthMessage('Mật khẩu bảo mật phải có tối thiểu 8 ký tự.', 'error');
      markFieldError('reg-password');
      return;
    }

    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      setAuthMessage('Mật khẩu phải bao gồm cả chữ cái và chữ số để đảm bảo an toàn.', 'error');
      markFieldError('reg-password');
      return;
    }

    // 4. Điều khoản & Nghị định 13: Bắt buộc tích chọn
    if (!consent) {
      setAuthMessage('Vui lòng tích chọn đồng ý với Điều khoản sử dụng và Chính sách bảo vệ dữ liệu theo Nghị định 13/2023/NĐ-CP.', 'error');
      const consentEl = document.getElementById('reg-privacy-consent');
      if (consentEl) {
        consentEl.focus();
        consentEl.classList.add('ring-2', 'ring-rose-500');
        const onConsentChange = () => {
          consentEl.classList.remove('ring-2', 'ring-rose-500');
          setAuthMessage('');
          consentEl.removeEventListener('change', onConsentChange);
        };
        consentEl.addEventListener('change', onConsentChange);
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Đang khởi tạo tài khoản...';
    }

    try {
      if (window.SanBongApp?.ensureCsrfToken) {
        const rootBase = (typeof window.SanBongApp?.getAppBase === 'function')
          ? window.SanBongApp.getAppBase()
          : ((typeof window.SanBongHelpers?.getAppBase === 'function')
              ? window.SanBongHelpers.getAppBase()
              : (window.location.pathname.includes('/Quan_Ly_San_Bong') ? '/Quan_Ly_San_Bong' : ''));
        const apiBase = rootBase ? (String(rootBase).replace(/\/+$/, '') + '/') : '/';
        await window.SanBongApp.ensureCsrfToken(apiBase);
      }
      const headers = window.SanBongApp?.getAuthFetchHeaders
        ? window.SanBongApp.getAuthFetchHeaders()
        : { 'Content-Type': 'application/json' };

      const response = await fetch(getAuthApiUrl('register'), {
        method: 'POST',
        headers,
        credentials: 'same-origin',
        body: JSON.stringify({
          username: cleanPhone,
          email: `${cleanPhone}@sanbongpro.vn`,
          phone: cleanPhone,
          full_name: fullName,
          password: password,
          privacy_consent: true,
          turnstile_token: loginTurnstileToken || ''
        })
      });

      const tokenHeader = response.headers ? response.headers.get('X-CSRF-Token') : null;
      if (tokenHeader && window.SanBongApp?.setCsrfToken) {
        window.SanBongApp.setCsrfToken(tokenHeader);
      }

      const resText = await response.text();
      let res = null;
      try {
        res = JSON.parse(resText);
      } catch (parseErr) {
        console.error('Register response JSON parse error:', parseErr, resText);
        setAuthMessage(response.ok ? 'Phản hồi từ máy chủ không hợp lệ.' : `Lỗi máy chủ (${response.status}). Vui lòng thử lại sau.`, 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Tạo tài khoản hội viên';
        }
        return;
      }

      if (res?.csrf_token && window.SanBongApp?.setCsrfToken) {
        window.SanBongApp.setCsrfToken(res.csrf_token);
      }

      if (response.ok && res.success) {
        setAuthMessage('✓ Tạo tài khoản hội viên thành công! Đang chuyển hướng...', 'success');
        if (window.SanBongApp?.showToast) {
          window.SanBongApp.showToast('Tạo tài khoản hội viên thành công!', 'success');
        }
        syncStoredUser(res.user);

        setTimeout(() => {
          handleLoginRedirect(res.user);
        }, 350);
        return;
      } else {
        const errMsg = res?.message || 'Không thể đăng ký tài khoản. Số điện thoại có thể đã tồn tại.';
        setAuthMessage(errMsg, 'error');
        if (window.SanBongApp?.showToast) {
          window.SanBongApp.showToast(errMsg, 'error');
        }
        markFieldError('reg-phone');
      }
    } catch (err) {
      console.error('Registration error:', err);
      const errMsg = 'Không thể kết nối máy chủ để đăng ký. Vui lòng thử lại sau.';
      setAuthMessage(errMsg, 'error');
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(errMsg, 'error');
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Tạo tài khoản hội viên';
      }
    }
  });
});

function switchAuthTab(tab) {
  clearFieldErrors();
  setAuthMessage('');

  const loginBtn = document.getElementById('tab-btn-login');
  const regBtn = document.getElementById('tab-btn-register');
  const loginForm = document.getElementById('login-form');
  const regForm = document.getElementById('register-form');

  if (tab === 'login') {
    if (loginBtn) loginBtn.className = 'py-2.5 rounded-lg bg-white text-[#16A34A] shadow-sm transition-all';
    if (regBtn) regBtn.className = 'py-2.5 rounded-lg text-[#64748B] hover:text-[#0F172A] transition-all';
    if (loginForm) loginForm.classList.remove('hidden');
    if (regForm) regForm.classList.add('hidden');
  } else {
    if (regBtn) regBtn.className = 'py-2.5 rounded-lg bg-white text-[#16A34A] shadow-sm transition-all';
    if (loginBtn) loginBtn.className = 'py-2.5 rounded-lg text-[#64748B] hover:text-[#0F172A] transition-all';
    if (regForm) regForm.classList.remove('hidden');
    if (loginForm) loginForm.classList.add('hidden');
  }
}
