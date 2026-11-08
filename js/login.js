/**
 * SÂN BÓNG PRO - ĐĂNG NHẬP / ĐĂNG KÝ BẢO MẬT (login.js)
 * Tích hợp chuẩn CSDL MySQL & API Argon2id, Inline Validation (Không dùng alert)
 */

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
  // Tự động chuyển tab nếu URL có param ?tab=register
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('tab') === 'register') {
    switchAuthTab('register');
  }
  const bg = document.getElementById('login-pitch-bg');
  if (bg && window.SanBongApp) {
    bg.innerHTML = window.SanBongApp.renderPitchSVG('bright', 'h-full');
  }

  // 1. Xử lý Đăng nhập với API PHP + CSDL (Không popup alert)
  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors();
    setAuthMessage('');

    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const username = usernameInput?.value.trim();
    const password = passwordInput?.value;
    const submitBtn = e.target.querySelector('button[type="submit"]');

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
      const response = await fetch('../api/auth.php?action=login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const res = await response.json();

      if (response.ok && res.success) {
        setAuthMessage('✓ Đăng nhập thành công! Đang chuyển hướng...', 'success');
        // Lưu thông tin người dùng an toàn vào sessionStorage
        sessionStorage.setItem('sb_current_user', JSON.stringify(res.user));

        const urlParams = new URLSearchParams(window.location.search);
        const redirectParam = urlParams.get('redirect');

        setTimeout(() => {
          if (res.user && res.user.role === 'admin') {
            if (redirectParam === 'portal-admin' || !redirectParam) {
              window.location.href = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath('portal-admin/') : '/portal-admin/';
              return;
            }
          }

          if (redirectParam) {
            window.location.href = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath(redirectParam) : redirectParam;
            return;
          }

          const target = res.redirect || 'history';
          window.location.href = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath(target) : `/${target}`;
        }, 500);
        return;
      } else {
        setAuthMessage(res.message || 'Thông tin đăng nhập không chính xác. Vui lòng kiểm tra lại.', 'error');
        markFieldError('login-password');
      }
    } catch (err) {
      setAuthMessage('Không thể kết nối máy chủ xác thực. Vui lòng kiểm tra kết nối mạng và thử lại.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Đăng nhập tài khoản';
      }
    }
  });

  // 2. Xử lý Đăng ký với API PHP + CSDL (Không popup alert)
  document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors();
    setAuthMessage('');

    const fullName = document.getElementById('reg-name')?.value.trim();
    const phone = document.getElementById('reg-phone')?.value.trim();
    const password = document.getElementById('reg-password')?.value;
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (!fullName) {
      setAuthMessage('Vui lòng nhập họ và tên của bạn.', 'error');
      markFieldError('reg-name');
      return;
    }

    if (!phone) {
      setAuthMessage('Vui lòng nhập số điện thoại liên hệ.', 'error');
      markFieldError('reg-phone');
      return;
    }

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

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Đang khởi tạo tài khoản...';
    }

    try {
      const response = await fetch('../api/auth.php?action=register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: phone.replace(/\s+/g, ''),
          email: `${phone.replace(/\s+/g, '')}@sanbongpro.vn`,
          phone: phone,
          full_name: fullName,
          password: password
        })
      });

      const res = await response.json();

      if (response.ok && res.success) {
        setAuthMessage('✓ Tạo tài khoản hội viên thành công! Đang chuyển hướng...', 'success');
        sessionStorage.setItem('sb_current_user', JSON.stringify(res.user));

        const urlParams = new URLSearchParams(window.location.search);
        const redirectParam = urlParams.get('redirect');

        setTimeout(() => {
          if (redirectParam) {
            window.location.href = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath(redirectParam) : redirectParam;
            return;
          }

          const target = res.redirect || 'history';
          window.location.href = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath(target) : `/${target}`;
        }, 600);
        return;
      } else {
        setAuthMessage(res.message || 'Không thể đăng ký tài khoản. Số điện thoại có thể đã tồn tại.', 'error');
        markFieldError('reg-phone');
      }
    } catch (err) {
      setAuthMessage('Không thể kết nối máy chủ để đăng ký. Vui lòng thử lại sau.', 'error');
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
