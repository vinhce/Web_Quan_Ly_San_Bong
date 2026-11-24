
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

  if (/^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|\/\/)/.test(clean) || clean.includes('\\') || clean.includes('..')) return root;

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
    localStorage.removeItem('sb_current_user');
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

  if (redirectParam) {
    const cleanParam = String(redirectParam).trim().replace(/^\/+/, '').replace(/^html\//, '');
    const baseRoute = cleanParam.split(/[?#]/)[0].replace(/\.html$/, '').replace(/\/+$/, '');
    const CUSTOMER_ONLY_ROUTES = new Set(['booking', 'checkout', 'success', 'history']);
    if (isPortalRole && CUSTOMER_ONLY_ROUTES.has(baseRoute)) {
      window.location.href = resolveAppUrl('portal-admin/');
      return;
    }
    const ALLOWED = new Set(['fields', 'booking', 'checkout', 'success', 'history', 'field-detail', 'matchmaking', 'portal-admin']);
    if (ALLOWED.has(baseRoute)) {
      window.location.href = resolveAppUrl(cleanParam);
      return;
    }
  }

  if (isPortalRole) {
    window.location.href = resolveAppUrl('portal-admin/');
    return;
  }

  // Mặc định khách hàng thường chuyển về trang chủ
  window.location.href = resolveAppUrl('');
}

function initLoginTurnstile(siteKey) {
  const wrap = document.getElementById('login-turnstile-wrap');
  // Nếu không có container trên giao diện, không có siteKey hoặc Turnstile bị vô hiệu hóa
  if (!wrap || !siteKey || siteKey === 'disabled' || wrap.dataset.rendered) return;
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

  box.classList.remove('hidden', 'bg-rose-50', 'text-rose-700', 'border-rose-200', 'bg-emerald-50', 'text-emerald-800', 'border-emerald-200', 'bg-blue-50', 'text-blue-800', 'border-blue-200');

  const safeMsg = window.SanBongApp?.escapeHTML
    ? window.SanBongApp.escapeHTML(msg)
    : String(msg || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  if (type === 'success') {
    box.classList.add('bg-emerald-50', 'text-emerald-800', 'border', 'border-emerald-200');
    box.innerHTML = `
      <svg class="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
      <div class="leading-snug">${safeMsg}</div>
    `;
  } else if (type === 'info') {
    box.classList.add('bg-blue-50', 'text-blue-800', 'border', 'border-blue-200');
    box.innerHTML = `
      <svg class="w-4 h-4 text-blue-600 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>
      <div class="leading-snug font-semibold">${safeMsg}</div>
    `;
  } else {
    box.classList.add('bg-rose-50', 'text-rose-700', 'border', 'border-rose-200');
    box.innerHTML = `
      <svg class="w-4 h-4 text-rose-600 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
      <div class="leading-snug">${safeMsg}</div>
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
  const isExpired = urlParams.get('expired') === '1';
  const isLocked = urlParams.get('locked') === '1';
  const isRegistered = urlParams.get('registered') === '1';
  if (isExpired) {
    setAuthMessage('Phiên đăng nhập của bạn đã hết hạn hoặc bị thay đổi. Vui lòng đăng nhập lại để tiếp tục.', 'info');
  } else if (isLocked) {
    setAuthMessage('Tài khoản của bạn đã bị tạm khóa. Vui lòng liên hệ Quản trị viên.', 'error');
  } else if (isRegistered) {
    setAuthMessage('Đăng ký tài khoản thành công! Vui lòng đăng nhập để tiếp tục.', 'success');
  }
  if (urlParams.get('tab') === 'register') {
    switchAuthTab('register');
  }
  const bg = document.getElementById('login-pitch-bg');
  if (bg && window.SanBongApp) {
    bg.innerHTML = window.SanBongApp.renderPitchSVG('bright', 'h-full');
  }

  // Khởi tạo Turnstile nếu có container hiển thị trên giao diện
  const turnstileWrap = document.getElementById('login-turnstile-wrap');
  if (turnstileWrap) {
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
  } else {
    // Turnstile tắt: Chỉ đồng bộ CSRF token nếu cần
    fetch(getAuthApiUrl('me'), { credentials: 'same-origin', cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d && d.csrf_token && window.SanBongApp?.setCsrfToken) {
          window.SanBongApp.setCsrfToken(d.csrf_token);
        }
      })
      .catch(() => {});
  }

  // Hiển thị thông báo khi được chuyển hướng từ trang cần xác thực (nếu chưa có thông báo hết phiên/đăng ký)
  const redirectParam = urlParams.get('redirect') || '';
  const redirectBase = redirectParam.split(/[?#]/)[0].replace(/^\/+/, '').replace(/^html\//, '').replace(/\.html$/, '').replace(/\/+$/, '');
  const savedNotice = sessionStorage.getItem('sb_login_notice');
  if (!isExpired && !isLocked && !isRegistered) {
    if (redirectBase === 'portal-admin') {
      setAuthMessage('Vui lòng đăng nhập bằng tài khoản Quản trị hoặc Nhân sự để tiếp tục.', 'info');
    } else if (redirectBase === 'matchmaking') {
      setAuthMessage('Vui lòng đăng nhập tài khoản để tham gia bắt kèo / đăng tin giao lưu.', 'info');
    } else if (redirectBase === 'booking' || redirectBase === 'checkout') {
      setAuthMessage(savedNotice || 'Đăng nhập để tiếp tục đặt sân', 'info');
    } else if (savedNotice) {
      setAuthMessage(savedNotice, 'info');
    }
    if (savedNotice) sessionStorage.removeItem('sb_login_notice');
  } else {
    sessionStorage.removeItem('sb_login_notice');
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

      if (response.ok && res.success) {
        setAuthMessage('Đăng nhập thành công! Đang chuyển hướng...', 'success');
        syncStoredUser(res.user);

        setTimeout(() => {
          handleLoginRedirect(res.user);
        }, 350);
        return;
      } else {
        const errMsg = res?.message || 'Thông tin đăng nhập không chính xác. Vui lòng kiểm tra lại.';
        setAuthMessage(errMsg, 'error');
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

    const nameRegex = /^[\p{L}\p{N}\s._-]+$/u;
    if (!nameRegex.test(fullName)) {
      setAuthMessage('Họ và tên chỉ được chứa chữ cái, chữ số, khoảng trắng và dấu gạch ngang/dưới.', 'error');
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
        window._lastAuthApiBase = apiBase;
      }

      const sendRegisterRequest = async () => {
        const reqHeaders = window.SanBongApp?.getAuthFetchHeaders
          ? window.SanBongApp.getAuthFetchHeaders()
          : { 'Content-Type': 'application/json' };
        return fetch(getAuthApiUrl('register'), {
          method: 'POST',
          headers: reqHeaders,
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
      };

      let response = await sendRegisterRequest();

      if (response.status === 403) {
        const peekText = await response.clone().text().catch(() => '');
        if (peekText.includes('ERR_CSRF_INVALID') && window.SanBongApp?.ensureCsrfToken) {
          if (window.SanBongApp?.clearCsrfToken) window.SanBongApp.clearCsrfToken();
          await window.SanBongApp.ensureCsrfToken(window._lastAuthApiBase || '/');
          response = await sendRegisterRequest();
        }
      }

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
        try {
          sessionStorage.removeItem('sb_current_user');
          localStorage.removeItem('sb_current_user');
        } catch (e) {}
        e.target.reset();
        switchAuthTab('login');
        try {
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete('tab');
          cleanUrl.searchParams.delete('expired');
          history.replaceState(null, '', cleanUrl.pathname + (cleanUrl.search ? cleanUrl.search : ''));
        } catch (uErr) {}
        const loginUserInp = document.getElementById('login-username');
        const loginPassInp = document.getElementById('login-password');
        if (loginUserInp) loginUserInp.value = cleanPhone;
        if (loginPassInp) {
          loginPassInp.value = '';
          loginPassInp.focus();
        }
        setAuthMessage('Đăng ký tài khoản thành công! Vui lòng nhập mật khẩu để đăng nhập.', 'success');
        return;
      } else {
        const errMsg = res?.message || 'Không thể đăng ký tài khoản. Số điện thoại có thể đã tồn tại.';
        setAuthMessage(errMsg, 'error');
        markFieldError('reg-phone');
      }
    } catch (err) {
      console.error('Registration error:', err);
      const errMsg = 'Không thể kết nối máy chủ để đăng ký. Vui lòng thử lại sau.';
      setAuthMessage(errMsg, 'error');
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
