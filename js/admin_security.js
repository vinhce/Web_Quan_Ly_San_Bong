// [hoisted to admin.js]

async function load2FaStatus() {
  const pill = document.getElementById('admin-2fa-status-pill');
  const setupSec = document.getElementById('admin-2fa-setup-section');
  const activeSec = document.getElementById('admin-2fa-active-section');
  const qrBox = document.getElementById('admin-2fa-qr-box');
  const disableBox = document.getElementById('admin-2fa-disable-box');

  if (!pill) return;

  try {
    const res = await fetch('../api/auth.php?action=me', { credentials: 'same-origin', cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      current2FaEnabled = Boolean(data?.user?.totp_enabled);
      if (current2FaEnabled) {
        pill.textContent = 'â— Đã kích hoạt 2FA';
        pill.className = 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800';
        if (setupSec) setupSec.classList.add('hidden');
        if (activeSec) activeSec.classList.remove('hidden');
      } else {
        pill.textContent = 'â—‹ Chưa kích hoạt';
        pill.className = 'px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800';
        if (setupSec) setupSec.classList.remove('hidden');
        if (activeSec) activeSec.classList.add('hidden');
      }
      if (qrBox) qrBox.classList.add('hidden');
      if (disableBox) disableBox.classList.add('hidden');
    }
  } catch (e) {
    pill.textContent = 'Lỗi kiểm tra 2FA';
  }
}
window.load2FaStatus = load2FaStatus;

async function init2FaSetup() {
  const btn = document.getElementById('btn-init-2fa');
  const qrBox = document.getElementById('admin-2fa-qr-box');
  const qrMount = document.getElementById('admin-2fa-qr-mount');
  const secretText = document.getElementById('admin-2fa-secret-text');

  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Đang tạo khóa...';
  }

  try {
    const r = await adminFetchJson('../api/auth.php?action=setup_2fa', { method: 'POST', body: JSON.stringify({}) });
    if (r.ok && r.json && r.json.success) {
      const qrUri = r.json.qr_uri || '';
      const secret = r.json.secret || '';

      if (qrMount) {
        qrMount.innerHTML = window.SanBongApp?.renderQRCodeSVG
          ? window.SanBongApp.renderQRCodeSVG(qrUri, 150)
          : `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrUri)}" class="w-full h-full object-contain">`;
      }
      if (secretText) {
        secretText.textContent = secret;
      }
      if (qrBox) qrBox.classList.remove('hidden');
      const otpInput = document.getElementById('admin-2fa-confirm-otp');
      if (otpInput) {
        otpInput.value = '';
        otpInput.focus();
      }
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast('Đã tạo mã QR 2FA! Quét mã bằng Authenticator và nhập OTP để kích hoạt.', 'info', 4000);
      }
    } else {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(r.message || 'Không thể thiết lập 2FA.', 'error');
      }
    }
  } catch (err) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Lỗi kết nối khi thiết lập 2FA.', 'error');
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '📱 Thiết lập 2FA ngay';
    }
  }
}
window.init2FaSetup = init2FaSetup;

async function confirm2FaSetup() {
  const otpInput = document.getElementById('admin-2fa-confirm-otp');
  const code = otpInput ? otpInput.value.trim() : '';
  if (!code || code.length !== 6) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Vui lòng nhập đủ 6 chữ số OTP từ ứng dụng!', 'warning');
    }
    if (otpInput) otpInput.focus();
    return;
  }

  const btn = document.getElementById('btn-confirm-2fa');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Đang xác thực...';
  }

  try {
    const r = await adminFetchJson('../api/auth.php?action=confirm_2fa', {
      method: 'POST',
      body: JSON.stringify({ code })
    });
    if (r.ok && r.json && r.json.success) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast('✓ Kích hoạt Xác thực 2 lớp (2FA) thành công!', 'success', 3500);
      }
      await load2FaStatus();
    } else {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(r.message || 'Mã OTP không chính xác!', 'error');
      }
    }
  } catch (e) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Lỗi kết nối xác thực 2FA.', 'error');
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Kích hoạt 2FA';
    }
  }
}
window.confirm2FaSetup = confirm2FaSetup;

function toggleDisable2FaForm(show) {
  const box = document.getElementById('admin-2fa-disable-box');
  if (!box) return;
  const isCurrentlyHidden = box.classList.contains('hidden');
  const targetShow = show !== undefined ? show : isCurrentlyHidden;
  if (targetShow) {
    box.classList.remove('hidden');
    const pw = document.getElementById('admin-2fa-disable-pw');
    if (pw) {
      pw.value = '';
      pw.focus();
    }
    const otp = document.getElementById('admin-2fa-disable-otp');
    if (otp) otp.value = '';
  } else {
    box.classList.add('hidden');
  }
}
window.toggleDisable2FaForm = toggleDisable2FaForm;

async function submitDisable2Fa() {
  const pwInput = document.getElementById('admin-2fa-disable-pw');
  const otpInput = document.getElementById('admin-2fa-disable-otp');
  const password = pwInput ? pwInput.value : '';
  const code = otpInput ? otpInput.value.trim() : '';

  if (!password) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập mật khẩu tài khoản hiện tại!', 'warning');
    if (pwInput) pwInput.focus();
    return;
  }
  if (!code || code.length !== 6) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập mã OTP 6 số hiện tại!', 'warning');
    if (otpInput) otpInput.focus();
    return;
  }

  try {
    const r = await adminFetchJson('../api/auth.php?action=disable_2fa', {
      method: 'POST',
      body: JSON.stringify({ password, code })
    });
    if (r.ok && r.json && r.json.success) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast('✓ Đã hủy kích hoạt Xác thực 2 lớp!', 'success', 3500);
      }
      await load2FaStatus();
    } else {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(r.message || 'Không thể tắt 2FA. Kiểm tra lại mật khẩu hoặc OTP!', 'error');
      }
    }
  } catch (err) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Lỗi kết nối khi tắt 2FA.', 'error');
    }
  }
}
window.submitDisable2Fa = submitDisable2Fa;

async function runMatchRemindersNow() {
  if (!isOwnerAdmin()) return;
  const btn = document.getElementById('btn-run-reminders-now');
  const orig = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Đang gửi nhắc lịch...';
  }
  try {
    const r = await adminFetchJson('../api/admin.php?action=run_match_reminders', {
      method: 'POST',
      body: JSON.stringify({})
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể chạy nhắc lịch trước trận!', 'error', 4000);
      return;
    }
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã xử lý gửi nhắc lịch trước trận!', 'success', 4000);
    await loadNotificationLogs();
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  }
}
window.runMatchRemindersNow = runMatchRemindersNow;
