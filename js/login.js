/**
 * SÂN BÓNG PRO - ĐĂNG NHẬP / ĐĂNG KÝ (login.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  const bg = document.getElementById('login-pitch-bg');
  if (bg && window.SanBongApp) {
    bg.innerHTML = window.SanBongApp.renderPitchSVG('bright', 'h-full');
  }

  document.getElementById('login-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    mockLoginAs('user');
  });

  document.getElementById('register-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Tạo tài khoản thành công! Đang chuyển đến trang chủ.');
    if (window.SanBongApp?.getRelativePath) {
      window.location.href = window.SanBongApp.getRelativePath('index.html');
    } else {
      window.location.href = 'index.html';
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

function mockLoginAs(role) {
  if (role === 'admin') {
    window.location.href = 'admin.html';
  } else {
    window.location.href = 'history.html';
  }
}
