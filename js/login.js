/**
 * SÂN BÓNG PRO - ĐĂNG NHẬP / ĐĂNG KÝ BẢO MẬT (login.js)
 * Tích hợp chuẩn CSDL MySQL & API Argon2id, Rate Limiting
 */

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

  // 1. Xử lý Đăng nhập với API PHP + CSDL
  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username')?.value.trim();
    const password = document.getElementById('login-password')?.value;
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (!username || !password) {
      alert('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
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
        // Lưu thông tin người dùng an toàn vào sessionStorage
        sessionStorage.setItem('sb_current_user', JSON.stringify(res.user));

        const urlParams = new URLSearchParams(window.location.search);
        const redirectParam = urlParams.get('redirect');

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
        return;
      } else {
        alert(res.message || 'Thông tin đăng nhập không chính xác.');
      }
    } catch (err) {
      alert('Không thể kết nối máy chủ xác thực. Vui lòng kiểm tra kết nối mạng và thử lại.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Đăng nhập tài khoản';
      }
    }
  });

  // 2. Xử lý Đăng ký với API PHP + CSDL
  document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('reg-name')?.value.trim();
    const phone = document.getElementById('reg-phone')?.value.trim();
    const password = document.getElementById('reg-password')?.value;
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (!fullName || !phone || !password) {
      alert('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    if (password.length < 8) {
      alert('Mật khẩu bảo mật phải có tối thiểu 8 ký tự.');
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
        alert('Tạo tài khoản hội viên thành công! Đang chuyển hướng...');
        sessionStorage.setItem('sb_current_user', JSON.stringify(res.user));

        const urlParams = new URLSearchParams(window.location.search);
        const redirectParam = urlParams.get('redirect');
        if (redirectParam) {
          window.location.href = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath(redirectParam) : redirectParam;
          return;
        }

        const target = res.redirect || 'history';
        window.location.href = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath(target) : `/${target}`;
        return;
      } else {
        alert(res.message || 'Không thể đăng ký tài khoản.');
      }
    } catch (err) {
      alert('Không thể kết nối máy chủ để đăng ký. Vui lòng thử lại sau.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Tạo tài khoản hội viên';
      }
    }
  });
});

function switchAuthTab(tab) {
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
