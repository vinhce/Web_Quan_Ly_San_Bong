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
        pill.textContent = 'â— ÄÃ£ kÃ­ch hoáº¡t 2FA';
        pill.className = 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800';
        if (setupSec) setupSec.classList.add('hidden');
        if (activeSec) activeSec.classList.remove('hidden');
      } else {
        pill.textContent = 'â—‹ ChÆ°a kÃ­ch hoáº¡t';
        pill.className = 'px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800';
        if (setupSec) setupSec.classList.remove('hidden');
        if (activeSec) activeSec.classList.add('hidden');
      }
      if (qrBox) qrBox.classList.add('hidden');
      if (disableBox) disableBox.classList.add('hidden');
    }
  } catch (e) {
    pill.textContent = 'Lá»—i kiá»ƒm tra 2FA';
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
    btn.textContent = 'â³ Äang táº¡o khÃ³a...';
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
        window.SanBongApp.showToast('ÄÃ£ táº¡o mÃ£ QR 2FA! QuÃ©t mÃ£ báº±ng Authenticator vÃ  nháº­p OTP Ä‘á»ƒ kÃ­ch hoáº¡t.', 'info', 4000);
      }
    } else {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(r.message || 'KhÃ´ng thá»ƒ thiáº¿t láº­p 2FA.', 'error');
      }
    }
  } catch (err) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Lá»—i káº¿t ná»‘i khi thiáº¿t láº­p 2FA.', 'error');
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'ðŸ“± Thiáº¿t láº­p 2FA ngay';
    }
  }
}
window.init2FaSetup = init2FaSetup;

async function confirm2FaSetup() {
  const otpInput = document.getElementById('admin-2fa-confirm-otp');
  const code = otpInput ? otpInput.value.trim() : '';
  if (!code || code.length !== 6) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Vui lÃ²ng nháº­p Ä‘á»§ 6 chá»¯ sá»‘ OTP tá»« á»©ng dá»¥ng!', 'warning');
    }
    if (otpInput) otpInput.focus();
    return;
  }

  const btn = document.getElementById('btn-confirm-2fa');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Äang xÃ¡c thá»±c...';
  }

  try {
    const r = await adminFetchJson('../api/auth.php?action=confirm_2fa', {
      method: 'POST',
      body: JSON.stringify({ code })
    });
    if (r.ok && r.json && r.json.success) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast('âœ“ KÃ­ch hoáº¡t XÃ¡c thá»±c 2 lá»›p (2FA) thÃ nh cÃ´ng!', 'success', 3500);
      }
      await load2FaStatus();
    } else {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(r.message || 'MÃ£ OTP khÃ´ng chÃ­nh xÃ¡c!', 'error');
      }
    }
  } catch (e) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Lá»—i káº¿t ná»‘i xÃ¡c thá»±c 2FA.', 'error');
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'KÃ­ch hoáº¡t 2FA';
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
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lÃ²ng nháº­p máº­t kháº©u tÃ i khoáº£n hiá»‡n táº¡i!', 'warning');
    if (pwInput) pwInput.focus();
    return;
  }
  if (!code || code.length !== 6) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lÃ²ng nháº­p mÃ£ OTP 6 sá»‘ hiá»‡n táº¡i!', 'warning');
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
        window.SanBongApp.showToast('âœ“ ÄÃ£ há»§y kÃ­ch hoáº¡t XÃ¡c thá»±c 2 lá»›p!', 'success', 3500);
      }
      await load2FaStatus();
    } else {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(r.message || 'KhÃ´ng thá»ƒ táº¯t 2FA. Kiá»ƒm tra láº¡i máº­t kháº©u hoáº·c OTP!', 'error');
      }
    }
  } catch (err) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Lá»—i káº¿t ná»‘i khi táº¯t 2FA.', 'error');
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
    btn.innerHTML = 'â³ Äang gá»­i nháº¯c lá»‹ch...';
  }
  try {
    const r = await adminFetchJson('../api/admin.php?action=run_match_reminders', {
      method: 'POST',
      body: JSON.stringify({})
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'KhÃ´ng thá»ƒ cháº¡y nháº¯c lá»‹ch trÆ°á»›c tráº­n!', 'error', 4000);
      return;
    }
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'âœ“ ÄÃ£ xá»­ lÃ½ gá»­i nháº¯c lá»‹ch trÆ°á»›c tráº­n!', 'success', 4000);
    await loadNotificationLogs();
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  }
}
window.runMatchRemindersNow = runMatchRemindersNow;
