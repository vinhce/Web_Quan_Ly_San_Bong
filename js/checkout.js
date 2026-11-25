
let currentDraft = null;
let generatedBookingCode = '';
let sepayPollTimer = null;
let isPaymentAlreadyConfirmed = false;
let redeemedBottles = 0;
let activeHoldMinutes = 15;
let countdownTimer = null;

document.addEventListener('DOMContentLoaded', async () => {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  if (window.SanBongApp?.authReady) {
    try {
      await window.SanBongApp.authReady;
    } catch (e) {}
  } else if (window.SanBongUI?.syncAuthMe) {
    try {
      await window.SanBongUI.syncAuthMe();
    } catch (e) {}
  }

  const currentUser = db ? db.getUser() : null;
  const rawDraft = sessionStorage.getItem('sb_booking_draft');
  if (rawDraft) {
    try {
      currentDraft = JSON.parse(rawDraft);
    } catch (e) {
      currentDraft = null;
    }
  }

  if (!currentDraft) {
    if (window.SanBongApp?.showToast) { window.SanBongApp.showToast('Bạn chưa chọn sân và khung giờ. Đang chuyển về trang Đặt sân...', 'warning', 2500); }
    window.location.replace(window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath('booking') : '/booking');
    return;
  }

  const isGuest = !currentUser || (!currentUser.id && !currentUser.username) || currentUser.role === 'guest' || currentUser.is_guest;

  if (isGuest) {
    sessionStorage.setItem('sb_login_notice', 'Vui lòng đăng nhập để hoàn tất đặt sân & quét mã QR thanh toán cọc');
    const loginUrl = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath('login?redirect=checkout') : '/login?redirect=checkout';
    window.location.replace(loginUrl);
    return;
  }

  if (['admin', 'manager', 'staff'].includes(String(currentUser.role || '').toLowerCase())) {
    const portalQuickUrl = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath('portal-admin/?tab=quick-booking') : '/portal-admin/?tab=quick-booking';
    if (window.SanBongApp?.showModal) {
      window.SanBongApp.showModal({
        title: 'Tài khoản vận hành sân',
        message: 'Tài khoản Quản trị / Nhân sự không thanh toán qua luồng khách hàng. Vui lòng tạo đơn tại mục Đặt sân tại quầy trong Cổng Quản Trị (phiên đăng nhập của bạn vẫn được giữ nguyên).',
        type: 'warning',
        confirmText: 'Về Cổng Quản Trị',
        onConfirm: () => window.location.replace(portalQuickUrl)
      });
    } else {
      window.location.replace(portalQuickUrl);
    }
    return;
  }

  if (!currentDraft.customerName || currentDraft.customerName === '---' || currentDraft.customerName === 'Khách vãng lai') {
    currentDraft.customerName = currentUser.full_name || currentUser.name || currentUser.username || '';
  }
  if (!currentDraft.phone || currentDraft.phone === '---') {
    currentDraft.phone = currentUser.phone || currentUser.username || '';
  }
  sessionStorage.setItem('sb_booking_draft', JSON.stringify(currentDraft));

  const pitch = db.getPitchById(currentDraft.pitchId);
  const pitchIdStr = String(currentDraft.pitchId || '').toUpperCase();
  let prefix = 'ASFS';
  if (pitch?.type === 5 || pitchIdStr.startsWith('P5')) {
    prefix = 'ASFF';
  } else if (pitch?.type === 7 || pitchIdStr.startsWith('P7')) {
    prefix = 'ASFS';
  } else if (pitch?.type === 11 || pitchIdStr.startsWith('P11')) {
    prefix = 'ASFE';
  }

  const sysCfg = db.getSystemConfig ? db.getSystemConfig() : { holdMinutes: 15 };
  activeHoldMinutes = Math.max(5, Math.min(120, Number(sysCfg.holdMinutes) || 15));
  const HOLD_DURATION_MS = activeHoldMinutes * 60 * 1000;
  const holdLabel = document.getElementById('hold-minutes-label');
  if (holdLabel) holdLabel.textContent = `${activeHoldMinutes} phút`;

  if (currentDraft.code && new RegExp('^' + prefix + '[0-9]{6,8}$', 'i').test(currentDraft.code)) {
    generatedBookingCode = currentDraft.code.toUpperCase();
  } else {
    const rand6 = String(Math.floor(100000 + Math.random() * 900000));
    generatedBookingCode = `${prefix}${rand6}`;
    currentDraft.code = generatedBookingCode;
  }

  const holdKey = 'sb_hold_expire_' + generatedBookingCode;
  let savedExpire = Number(currentDraft.expiresAt || localStorage.getItem(holdKey) || 0);
  const now = Date.now();
  if (!savedExpire || savedExpire <= now || savedExpire > now + HOLD_DURATION_MS) {
    savedExpire = now + HOLD_DURATION_MS;
    localStorage.setItem(holdKey, String(savedExpire));
  }
  currentDraft.expiresAt = savedExpire;
  sessionStorage.setItem('sb_booking_draft', JSON.stringify(currentDraft));

  const qrLockedOverlay = document.getElementById('sepay-qr-locked-overlay');
  const qrInfoLoggedIn = document.getElementById('qr-info-logged-in');
  const qrInfoGuest = document.getElementById('qr-info-guest');
  const confirmBtn = document.getElementById('confirm-payment-btn');
  const qrLoading = document.getElementById('sepay-qr-loading');

  if (isGuest) {
    // CHƯA ĐĂNG NHẬP: Bắt buộc đăng nhập để quét mã QR
    if (qrLoading) qrLoading.classList.add('hidden');
    if (qrLockedOverlay) qrLockedOverlay.classList.remove('hidden');
    if (qrInfoLoggedIn) qrInfoLoggedIn.classList.add('hidden');
    if (qrInfoGuest) qrInfoGuest.classList.remove('hidden');
    if (confirmBtn) confirmBtn.classList.add('hidden');

    const setNoticeAndRedirect = () => {
      sessionStorage.setItem('sb_login_notice', 'Vui lòng đăng nhập tài khoản để hiển thị mã VietQR thanh toán cọc');
    };
    document.getElementById('btn-login-to-scan')?.addEventListener('click', setNoticeAndRedirect);

    renderCheckoutDetails(false);
    setupLoyaltyWaterRedemption();

    const initialRemaining = Math.max(0, Math.ceil((Number(currentDraft.expiresAt) - Date.now()) / 1000));
    startCountdown(initialRemaining);
    return;
  } else {
    // ĐÃ ĐĂNG NHẬP: Mở khóa mã QR và kích hoạt tự động thanh toán
    if (qrLockedOverlay) qrLockedOverlay.classList.add('hidden');
    if (qrInfoLoggedIn) qrInfoLoggedIn.classList.remove('hidden');
    if (qrInfoGuest) qrInfoGuest.classList.add('hidden');
    if (confirmBtn) confirmBtn.classList.remove('hidden');
  }

  renderCheckoutDetails(false);
  setupLoyaltyWaterRedemption();

  window.addEventListener('sb-data-synced', () => {
    const syncedCfg = db.getSystemConfig ? db.getSystemConfig() : null;
    if (syncedCfg && syncedCfg.holdMinutes) {
      activeHoldMinutes = Math.max(5, Math.min(120, Number(syncedCfg.holdMinutes) || 15));
      const holdLabelEl = document.getElementById('hold-minutes-label');
      if (holdLabelEl) holdLabelEl.textContent = `${activeHoldMinutes} phút`;
    }
    if (window._bookingCreatedOk) {
      renderCheckoutDetails(true);
    }
  });

  const createdOk = await createInitialBookingRecord();
  if (createdOk === false) {
    const qrImg = document.getElementById('sepay-qr-img');
    if (qrImg) {
      qrImg.removeAttribute('src');
      qrImg.classList.add('hidden');
    }
    const qrLoading = document.getElementById('sepay-qr-loading');
    if (qrLoading) {
      qrLoading.classList.remove('hidden');
      qrLoading.innerHTML = '<span class="text-rose-600 font-bold text-center px-3">Không thể tạo mã giữ chỗ</span>';
    }
    const timerEl = document.getElementById('countdown-timer');
    if (timerEl) timerEl.textContent = '--:--';
    return;
  }
  window._bookingCreatedOk = true;
  renderCheckoutDetails(true);

  const initialRemaining = Math.max(0, Math.ceil((Number(currentDraft.expiresAt) - Date.now()) / 1000));
  startCountdown(initialRemaining);

  startSePayAutoListener(generatedBookingCode);

  document.getElementById('confirm-payment-btn')?.addEventListener('click', () => confirmPayment(false));

  const backBtn = document.getElementById('checkout-back-to-booking-btn');
  if (backBtn && !backBtn._boundRelease) {
    backBtn._boundRelease = true;
    backBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (sepayPollTimer) clearInterval(sepayPollTimer);
      if (countdownTimer) clearInterval(countdownTimer);
      const releaseCode = generatedBookingCode || currentDraft?.serverCreatedCode;
      if (releaseCode && window.SanBongApp?.SanBongAPI?.requestJSON && !isPaymentAlreadyConfirmed) {
        try {
          await window.SanBongApp.SanBongAPI.requestJSON('api/bookings.php?action=release_draft_hold', {
            action: 'release_draft_hold',
            code: releaseCode
          });
        } catch (err) {}
      }
      if (currentDraft) {
        delete currentDraft.serverCreatedCode;
        delete currentDraft.code;
        delete currentDraft.expiresAt;
        delete currentDraft.idempotencyKey;
        sessionStorage.setItem('sb_booking_draft', JSON.stringify(currentDraft));
      }
      sessionStorage.removeItem('sb_active_hold_code');
      localStorage.removeItem('sb_hold_expire_' + releaseCode);
      window.location.href = backBtn.getAttribute('href') || '/booking';
    });
  }
});

async function createInitialBookingRecord() {
  const db = window.SanBongApp.SanBongDB;
  const slots = db.getTimeSlots();
  const slot = slots.find(s => s.id === currentDraft.slotId);
  const bookingUrl = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath('booking') : '/booking';

  const applyServerBookingToUI = (srvData) => {
    const serverCode = srvData.code || srvData.bookingCode || srvData.booking_code;
    if (serverCode) {
      if (serverCode !== generatedBookingCode) {
        localStorage.removeItem('sb_hold_expire_' + generatedBookingCode);
        generatedBookingCode = serverCode;
      }
      if (currentDraft) {
        currentDraft.code = serverCode;
        currentDraft.serverCreatedCode = serverCode;
      }
      sessionStorage.setItem('sb_active_hold_code', serverCode);
    }

    const srvTotal = Number(srvData.totalAmount ?? srvData.total_amount ?? srvData.totalPrice ?? srvData.total_price);
    const srvDeposit = Number(srvData.depositAmount ?? srvData.deposit_amount);
    const srvRemaining = Number(srvData.remainingAmount ?? srvData.remaining_amount ?? (srvTotal - srvDeposit));
    const srvDepositRate = Number(srvData.depositRate ?? srvData.deposit_rate ?? ((Number(srvData.weeksCount ?? currentDraft?.weeksCount ?? 1) > 1) ? 60 : 30));

    window._checkoutServerBooking = srvData;

    const orderBadge = document.getElementById('order-code-badge');
    if (orderBadge) orderBadge.textContent = generatedBookingCode;
    const memoBadge = document.getElementById('bank-memo');
    if (memoBadge) memoBadge.textContent = generatedBookingCode;

    if (!isNaN(srvTotal) && srvTotal > 0) {
      const tAmt = document.getElementById('co-total-amount');
      if (tAmt) tAmt.textContent = window.SanBongApp.formatVND(srvTotal);
    }
    if (!isNaN(srvDeposit) && srvDeposit >= 0) {
      const dAmt = document.getElementById('co-deposit-amount');
      if (dAmt) dAmt.textContent = window.SanBongApp.formatVND(srvDeposit);
      const bAmt = document.getElementById('bank-amount');
      if (bAmt) bAmt.textContent = window.SanBongApp.formatVND(srvDeposit);
    }
    if (!isNaN(srvRemaining) && srvRemaining >= 0) {
      const rAmt = document.getElementById('co-remaining-amount');
      if (rAmt) rAmt.textContent = window.SanBongApp.formatVND(srvRemaining);
    }

    const chkDepPct = document.getElementById('checkout-deposit-pct');
    if (chkDepPct) chkDepPct.textContent = String(srvDepositRate);
    const coDepPct = document.getElementById('co-deposit-pct');
    if (coDepPct) coDepPct.textContent = String(srvDepositRate);

    if (srvData.redeemedBottles !== undefined) {
      redeemedBottles = Number(srvData.redeemedBottles || 0);
      if (currentDraft) {
        currentDraft.redeemedBottles = redeemedBottles;
        currentDraft.pointsUsed = Number(srvData.pointsUsed || redeemedBottles * 100);
      }
      setupLoyaltyWaterRedemption();
    }

    const qrImg = document.getElementById('sepay-qr-img');
    const qrLoading = document.getElementById('sepay-qr-loading');
    if (qrImg) {
      const bank = db.getBankInfo();
      const sepayBank = bank.bankCode || 'MB';
      const sepayAcc = bank.accountNumber || bank.accountNo || '0352313548';
      const sepayAmt = (!isNaN(srvDeposit) && srvDeposit > 0) ? srvDeposit : 0;
      const qrUrl = `https://qr.sepay.vn/img?bank=${encodeURIComponent(sepayBank)}&acc=${encodeURIComponent(sepayAcc)}&template=compact&amount=${sepayAmt}&des=${encodeURIComponent(generatedBookingCode)}`;
      qrImg.src = qrUrl;
      if (qrLoading) qrLoading.classList.add('hidden');
    }

    try {
      const latest = Object.assign({}, srvData, {
        code: generatedBookingCode,
        totalPrice: !isNaN(srvTotal) && srvTotal > 0 ? srvTotal : undefined,
        depositAmount: !isNaN(srvDeposit) && srvDeposit >= 0 ? srvDeposit : undefined,
        remainingAmount: !isNaN(srvRemaining) && srvRemaining >= 0 ? srvRemaining : undefined,
        depositRate: srvDepositRate,
        redeemedBottles: Number(srvData.redeemedBottles ?? redeemedBottles ?? 0),
        pointsUsed: Number(srvData.pointsUsed ?? (Number(srvData.redeemedBottles ?? redeemedBottles ?? 0) * 100))
      });
      sessionStorage.setItem('sb_latest_booking', JSON.stringify(latest));
    } catch (e) {}

    const srvHoldMins = Number(srvData.holdMinutes ?? srvData.hold_minutes ?? 0);
    const srvExpiresAt = srvData.expiresAt ?? srvData.expires_at ?? null;
    if (srvHoldMins > 0) {
      activeHoldMinutes = Math.max(5, Math.min(120, srvHoldMins));
      const holdLabelEl = document.getElementById('hold-minutes-label');
      if (holdLabelEl) holdLabelEl.textContent = `${activeHoldMinutes} phút`;
    }
    let targetExpireMs = 0;
    if (srvExpiresAt) {
      const parsed = typeof srvExpiresAt === 'number'
        ? (srvExpiresAt < 1e12 ? srvExpiresAt * 1000 : srvExpiresAt)
        : Date.parse(String(srvExpiresAt).replace(' ', 'T'));
      if (!isNaN(parsed) && parsed > Date.now()) {
        targetExpireMs = parsed;
      }
    } else if (srvHoldMins > 0) {
      targetExpireMs = Date.now() + activeHoldMinutes * 60 * 1000;
    }
    if (targetExpireMs > 0 && currentDraft) {
      currentDraft.expiresAt = targetExpireMs;
      sessionStorage.setItem('sb_booking_draft', JSON.stringify(currentDraft));
      localStorage.setItem('sb_hold_expire_' + generatedBookingCode, String(targetExpireMs));
      const newRemaining = Math.max(0, Math.ceil((targetExpireMs - Date.now()) / 1000));
      startCountdown(newRemaining);
    }
  };

  if (window.SanBongApp?.SanBongAPI) {
    // T3-03: Nếu F5 / tải lại /checkout mà đã có serverCreatedCode, lấy lại đơn hiện có thay vì POST trùng
    if (currentDraft.serverCreatedCode) {
      try {
        const getRes = await window.SanBongApp.SanBongAPI.getBooking(currentDraft.serverCreatedCode);
        if (getRes && getRes.success && getRes.data) {
          const d = getRes.data;
          const isDead = ['Đã hủy', 'Khách chưa đến'].includes(String(d.status || '')) ||
            (d.expiresAt && Date.parse(String(d.expiresAt).replace(' ', 'T')) <= Date.now() && Number(d.paidAmount || 0) <= 0);
          if (!isDead) {
            if (Number(d.paidAmount || 0) >= Number(d.depositAmount || 0) && Number(d.depositAmount || 0) > 0) {
              const successUrl = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath('success') : '../success';
              window.location.replace(`${successUrl}?code=${encodeURIComponent(d.code)}`);
              return false;
            }
            applyServerBookingToUI(d);
            return true;
          }
        }
      } catch (e) {}
      delete currentDraft.serverCreatedCode;
    }

    try {
      const bookingBody = {
        idempotencyKey: currentDraft.idempotencyKey || '',
        customerName: currentDraft.customerName,
        phone: currentDraft.phone,
        isBookingForFriend: Boolean(currentDraft.isBookingForFriend),
        email: 'khachhang@sanbongpro.vn',
        pitchId: currentDraft.pitchId,
        date: currentDraft.date,
        slotId: currentDraft.slotId,
        slotTime: slot ? slot.time : '18:30 - 20:30',
        bookingMode: currentDraft.bookingMode || 'single',
        weeksCount: currentDraft.weeksCount || 1,
        services: currentDraft.services,
        voucherCode: currentDraft.voucherCode,
        note: currentDraft.note,
        redeemedBottles: Number(currentDraft.redeemedBottles ?? redeemedBottles ?? 0),
        privacy_consent: currentDraft.privacy_consent !== undefined ? currentDraft.privacy_consent : true,
        turnstile_token: currentDraft.turnstile_token || ''
      };
      const apiRes = await window.SanBongApp.SanBongAPI.postBooking({
        idempotencyKey: currentDraft.idempotencyKey || '',
        booking: bookingBody,
        redeemedBottles: bookingBody.redeemedBottles,
        privacy_consent: bookingBody.privacy_consent,
        turnstile_token: bookingBody.turnstile_token,
        timestamp: new Date().toISOString()
      });
      if (apiRes && apiRes.status === 401) {
        if (countdownTimer) clearInterval(countdownTimer);
        if (sepayPollTimer) clearInterval(sepayPollTimer);
        if (window.SanBongApp?.handleUnauthorizedSession) {
          window.SanBongApp.handleUnauthorizedSession('checkout');
        } else {
          window.location.replace((window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath('login') : '../login') + '?redirect=checkout&expired=1');
        }
        return false;
      }
      if (apiRes && apiRes.status === 403) {
        if (countdownTimer) clearInterval(countdownTimer);
        if (sepayPollTimer) clearInterval(sepayPollTimer);
        const forbidMsg = apiRes.message || 'Tài khoản hiện tại không có quyền thực hiện thao tác đặt sân này.';
        if (window.SanBongApp?.showModal) {
          window.SanBongApp.showModal({
            title: 'Không đủ quyền thực hiện',
            message: forbidMsg,
            type: 'warning',
            confirmText: 'Quay lại',
            onConfirm: () => window.location.replace(bookingUrl)
          });
        } else if (window.SanBongApp?.showToast) {
          window.SanBongApp.showToast(forbidMsg, 'warning', 4000);
        }
        return false;
      }
      if (apiRes && !apiRes.success && !apiRes.localOnly) {
        if (countdownTimer) clearInterval(countdownTimer);
        if (sepayPollTimer) clearInterval(sepayPollTimer);
        try {
          sessionStorage.removeItem('sb_booking_draft');
          sessionStorage.removeItem('sb_latest_booking');
          sessionStorage.removeItem('sb_active_hold_code');
          localStorage.removeItem('sb_hold_expire_' + generatedBookingCode);
        } catch (err) {}
        const errMsg = apiRes.message || 'Khung giờ vừa có người khác đặt hoặc sân đang bảo trì. Vui lòng chọn giờ khác.';
        if (window.SanBongApp?.showModal) {
          window.SanBongApp.showModal({
            title: 'Không thể giữ chỗ đặt sân',
            message: errMsg,
            type: 'error',
            confirmText: 'Chọn khung giờ khác',
            onConfirm: () => window.location.replace(bookingUrl)
          });
        } else {
          if (window.SanBongApp?.showToast) window.SanBongApp.showToast(errMsg, 'error', 4000);
          setTimeout(() => window.location.replace(bookingUrl), 1800);
        }
        return false;
      }
      if (apiRes && apiRes.success && apiRes.data) {
        if (currentDraft && apiRes.data.code) {
          currentDraft.submittedCode = apiRes.data.code;
          try { sessionStorage.setItem('sb_booking_draft', JSON.stringify(currentDraft)); } catch (e) {}
        }
        applyServerBookingToUI(apiRes.data);
      }
    } catch (e) {}
  }
  return true;
}

function renderCheckoutDetails(shouldLoadQR = true) {
  const db = window.SanBongApp.SanBongDB;
  const pitch = db.getPitchById(currentDraft.pitchId) || db.getPitches()[0] || { id: currentDraft.pitchId, name: 'Sân bóng', typeName: 'Sân bóng', variant: 'standard' };
  const slots = db.getTimeSlots();
  const slot = slots.find(s => s.id === currentDraft.slotId) || slots[3];

  const weeks = Math.max(1, parseInt(currentDraft.weeksCount, 10) || 1);
  const calc = db.calculatePrice(
    currentDraft.pitchId,
    currentDraft.date,
    currentDraft.slotId,
    currentDraft.services,
    currentDraft.voucherCode,
    weeks
  ) || { depositAmount: 0, totalPrice: 0, remainingAmount: 0, appliedServices: [], depositRatePct: 30 };

  const bank = db.getBankInfo();

  const svgContainer = document.getElementById('checkout-pitch-svg');
  if (svgContainer) {
    svgContainer.innerHTML = window.SanBongApp.renderPitchSVG(pitch.variant || 'standard', 'h-24');
  }

  const orderBadge = document.getElementById('order-code-badge');
  if (orderBadge) orderBadge.textContent = generatedBookingCode;
  const memoBadge = document.getElementById('bank-memo');
  if (memoBadge) memoBadge.textContent = generatedBookingCode;

  const bName = document.getElementById('bank-name');
  if (bName) bName.textContent = bank.bankName || 'Ngân hàng Quân Đội (MBBank)';
  const bAcc = document.getElementById('bank-account');
  const accNum = bank.accountNumber || bank.accountNo || '0352313548';
  if (bAcc) bAcc.textContent = accNum;
  const bOwner = document.getElementById('bank-owner');
  if (bOwner) bOwner.textContent = bank.accountName || 'NGUYEN QUANG VINH';
  const bAmt = document.getElementById('bank-amount');
  if (bAmt) bAmt.textContent = window.SanBongApp.formatVND(calc.depositAmount);

  const qrImg = document.getElementById('sepay-qr-img');
  const qrLoading = document.getElementById('sepay-qr-loading');
  if (qrImg) {
    if (!shouldLoadQR) {
      qrImg.removeAttribute('src');
      qrImg.classList.add('hidden');
      if (qrLoading) qrLoading.classList.add('hidden');
    } else {
      const sepayBank = bank.bankCode || 'MB';
      const sepayAcc = accNum;
      const sepayAmt = calc.depositAmount || 0;
      const sepayDes = generatedBookingCode;
      const qrUrl = `https://qr.sepay.vn/img?bank=${encodeURIComponent(sepayBank)}&acc=${encodeURIComponent(sepayAcc)}&template=compact&amount=${sepayAmt}&des=${encodeURIComponent(sepayDes)}`;

      qrImg.onload = () => {
        qrImg.classList.remove('hidden');
        if (qrLoading) qrLoading.classList.add('hidden');
      };
      qrImg.onerror = () => {
        qrImg.removeAttribute('src');
        qrImg.classList.add('hidden');
        if (qrLoading) {
          qrLoading.classList.remove('hidden');
          qrLoading.innerHTML = '<span class="text-amber-700 font-semibold text-center px-2">Không tải được ảnh QR. Vui lòng chuyển khoản thủ công theo STK bên cạnh.</span>';
        }
      };
      qrImg.src = qrUrl;
    }
  }

  const pName = document.getElementById('co-pitch-name');
  if (pName) pName.textContent = `${pitch.name} (${pitch.typeName})`;
  const pTime = document.getElementById('co-pitch-time');
  if (pTime) {
    pTime.textContent = weeks > 1
      ? `Gói cố định ${weeks} tuần (bắt đầu ${window.SanBongApp.formatDateVN(currentDraft.date)}) · ${slot.time}`
      : `${window.SanBongApp.formatDateVN(currentDraft.date)} · ${slot.time}`;
  }
  const cName = document.getElementById('co-customer');
  if (cName) cName.textContent = currentDraft.customerName;
  const cPhone = document.getElementById('co-phone');
  if (cPhone) cPhone.textContent = currentDraft.phone;

  const sRow = document.getElementById('co-services-row');
  const esc = window.SanBongApp?.escapeHTML || (s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])));
  if (sRow) {
    if (calc.appliedServices && calc.appliedServices.length > 0) {
      sRow.innerHTML = 'Dịch vụ: ' + calc.appliedServices.map(s => `${esc(s.name)} × ${Number(s.quantity) || 1}`).join(', ');
    } else {
      sRow.textContent = 'Không chọn dịch vụ thêm';
    }
  }

  const tAmt = document.getElementById('co-total-amount');
  if (tAmt) tAmt.textContent = window.SanBongApp.formatVND(calc.totalPrice);
  const dAmt = document.getElementById('co-deposit-amount');
  if (dAmt) dAmt.textContent = window.SanBongApp.formatVND(calc.depositAmount);
  const rAmt = document.getElementById('co-remaining-amount');
  if (rAmt) rAmt.textContent = window.SanBongApp.formatVND(calc.remainingAmount);
  const isMonthly = weeks > 1 || currentDraft.bookingMode === 'monthly';
  const sysCfg2 = window.SanBongApp.SanBongDB.getSystemConfig ? window.SanBongApp.SanBongDB.getSystemConfig() : null;
  const depPct = isMonthly ? 60 : (calc.depositRatePct || (sysCfg2?.depositRate ? Math.max(10, Math.min(100, Number(sysCfg2.depositRate) || 30)) : 30));
  const remPct = 100 - depPct;

  const depPctEl = document.getElementById('co-deposit-pct');
  if (depPctEl) depPctEl.textContent = String(depPct);

  const chkDepPct = document.getElementById('checkout-deposit-pct');
  if (chkDepPct) chkDepPct.textContent = String(depPct);

  const chkRemNote = document.getElementById('checkout-remaining-note');
  if (chkRemNote) {
    chkRemNote.textContent = isMonthly
      ? 'Còn lại ra quầy thu tiền ở sân báo lại để sắp xếp'
      : `Thanh toán ${remPct}% số tiền còn lại tại quầy khi nhận sân`;
  }

  const coRemLabel = document.getElementById('co-remaining-label');
  if (coRemLabel) {
    coRemLabel.textContent = isMonthly
      ? 'Còn lại ra quầy thu tiền ở sân báo lại để sắp xếp:'
      : 'Phần còn lại thanh toán tại sân:';
  }

  const coPolicyTitle = document.getElementById('co-policy-title');
  const coPolicyDesc = document.getElementById('co-policy-desc');
  if (isMonthly) {
    if (coPolicyTitle) coPolicyTitle.textContent = 'Quy định đặt lịch cố định theo tháng:';
    if (coPolicyDesc) coPolicyDesc.innerHTML = `Quý khách chuyển khoản <b>cọc 60%</b> để giữ chỗ cố định toàn bộ ${weeks} buổi trong gói. Sau khi cọc thành công, quý khách vui lòng <b>ra quầy thu tiền ở sân báo lại để sắp xếp lịch thi đấu</b> và làm thủ tục nhận sân.`;
  }

  const promoCard = document.getElementById('co-promo-gifts-card');
  const promo = window.SanBongApp?.SanBongDB?.getPackagePromotion(weeks) || currentDraft.packagePromotion;
  if (promoCard) {
    if (weeks > 1 && promo) {
      const giftsList = promo.perMatchGifts.map(g => `
        <div class="flex items-center gap-1.5 text-slate-800 font-semibold">
          <span>${g.icon || '🎁'}</span>
          <span>${g.name}</span>
          <span class="text-emerald-700 font-extrabold">(0đ)</span>
        </div>
      `).join('');

      promoCard.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5 text-xs font-bold text-[#15803D]">
            <span>🎁</span>
            <span class="uppercase tracking-wide">Đặc quyền tài trợ mỗi trận · ${promo.title}</span>
          </div>
          <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">MIỄN PHÍ</span>
        </div>
        <div class="space-y-1 pt-1">
          ${giftsList}
        </div>
        <div class="text-[11px] text-slate-500 pt-1 border-t border-emerald-200">
          ✓ Sân đã chuẩn bị sẵn tài trợ tại cabin mỗi buổi đá.
        </div>
      `;
      promoCard.classList.remove('hidden');
    } else {
      promoCard.classList.add('hidden');
    }
  }
}

function startSePayAutoListener(bookingCode) {
  if (sepayPollTimer) clearInterval(sepayPollTimer);

  sepayPollTimer = setInterval(async () => {
    if (isPaymentAlreadyConfirmed) {
      clearInterval(sepayPollTimer);
      return;
    }

    try {
      const response = await fetch(getCheckPaymentUrl(bookingCode), {
        cache: 'no-store',
        credentials: 'same-origin'
      });
      if (response.ok) {
        const result = await response.json();
        if (result && result.paid === true) {
          isPaymentAlreadyConfirmed = true;
          clearInterval(sepayPollTimer);
          handleSePayPaymentSuccess(result);
        } else if (result && result.expired === true) {
          handleExpiredCheckout(bookingCode, result.message);
        }
      }
    } catch (e) {
    }
  }, 2500);
}

function handleSePayPaymentSuccess(result) {
  const badge = document.getElementById('payment-status-badge');
  const text = document.getElementById('payment-status-text');

  if (badge) {
    badge.className = 'p-3 rounded-xl bg-[#DCFCE7] border border-[#86EFAC] text-[#15803D] text-xs font-bold flex items-center justify-center md:justify-start gap-2 shadow-sm animate-pulse';
  }
  if (text) {
    text.innerHTML = '🎉 <strong>ĐÃ NHẬN TIỀN CỌC!</strong> Hệ thống đã xác nhận giao dịch thành công. Đang chuyển hướng...';
  }

  setTimeout(() => {
    confirmPayment(true);
  }, 1500);
}

function startCountdown(seconds) {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  let remaining = seconds;
  const timerEl = document.getElementById('countdown-timer');
  if (!timerEl) return;

  const updateDisplay = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    timerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  updateDisplay(remaining);

  countdownTimer = setInterval(() => {
    const holdKey = 'sb_hold_expire_' + generatedBookingCode;
    const expireTime = Number(currentDraft?.expiresAt || localStorage.getItem(holdKey) || 0);
    if (expireTime > 0) {
      remaining = Math.max(0, Math.ceil((expireTime - Date.now()) / 1000));
    } else {
      remaining--;
    }

    if (remaining <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      if (sepayPollTimer) clearInterval(sepayPollTimer);
      timerEl.textContent = '00:00';
      sessionStorage.removeItem('sb_booking_draft');
      try {
        localStorage.removeItem('sb_hold_expire_' + generatedBookingCode);
      } catch (e) {}
      localStorage.removeItem(holdKey);
      if (window.SanBongApp?.showToast) { window.SanBongApp.showToast(`Khung giờ giữ chỗ ${activeHoldMinutes} phút đã hết hạn! Vui lòng thao tác lại.`, 'error', 3500); }
      window.location.href = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath('booking') : '/booking';
      return;
    }

    updateDisplay(remaining);
  }, 1000);
}

function setupLoyaltyWaterRedemption() {
  const db = window.SanBongApp.SanBongDB;
  const user = db.getUser();
  const countEl = document.getElementById('redeemed-bottles-count');
  const summaryBox = document.getElementById('points-exchange-summary');
  const deductEl = document.getElementById('points-to-deduct');
  const receivedEl = document.getElementById('water-bottles-received');
  const coRow = document.getElementById('co-redeemed-water-row');
  const coText = document.getElementById('co-redeemed-water-text');

  if (!user || !user.id) {
    const loginLink = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath('login?redirect=checkout') : '/login?redirect=checkout';
    if (summaryBox) {
      summaryBox.classList.remove('hidden');
      summaryBox.innerHTML = `<div class="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">🔒 <a href="${loginLink}" class="underline font-bold text-amber-900 hover:text-emerald-700">Đăng nhập tài khoản</a> để dùng điểm tích lũy đổi nước suối miễn phí!</div>`;
    }
    return;
  }

  const userPoints = typeof user.points === 'number' ? user.points : 0;
  const bottleCost = Math.max(1, Number(window.SanBongApp?.SanBongDB?.getSystemConfig?.()?.loyaltyBottleCostPoints || db?.getSystemConfig?.()?.loyaltyBottleCostPoints) || 100);
  const maxBottles = Math.floor(userPoints / bottleCost);
  redeemedBottles = Math.max(0, Math.min(20, Number(currentDraft?.redeemedBottles ?? redeemedBottles ?? 0)));

  const pointsEl = document.getElementById('current-user-points');
  if (pointsEl) pointsEl.textContent = `${userPoints} điểm`;

  const maxEl = document.getElementById('max-redeemable-bottles');
  if (maxEl) maxEl.textContent = `${maxBottles} chai`;

  if (countEl) countEl.textContent = String(redeemedBottles);
  const ptsUsed = Number(currentDraft?.pointsUsed ?? (redeemedBottles * bottleCost));
  if (redeemedBottles > 0) {
    if (summaryBox) summaryBox.classList.remove('hidden');
    if (deductEl) deductEl.textContent = `${ptsUsed} điểm`;
    if (receivedEl) receivedEl.textContent = `${redeemedBottles} chai Aquafina miễn phí`;
    if (coRow) coRow.classList.remove('hidden');
    if (coText) coText.textContent = `+${redeemedBottles} chai Aquafina (-${ptsUsed} điểm)`;
  } else {
    if (summaryBox) summaryBox.classList.add('hidden');
    if (coRow) coRow.classList.add('hidden');
  }
}

function copyText(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const text = el.innerText ? el.innerText.trim() : '';
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast('✓ Đã sao chép: ' + text, 'success', 2500);
      }
    }).catch(() => {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast('Nội dung: ' + text, 'info', 2500);
      }
    });
  } else if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast('Nội dung: ' + text, 'info', 2500);
  }
}

async function confirmPayment(isAuto = false) {
  if (sepayPollTimer) clearInterval(sepayPollTimer);

  const btn = document.getElementById('confirm-payment-btn');

  if (!isAuto && !isPaymentAlreadyConfirmed) {
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Đang kiểm tra giao dịch chuyển khoản...';
    }

    try {
      const response = await fetch(getCheckPaymentUrl(generatedBookingCode), {
        cache: 'no-store',
        credentials: 'same-origin'
      });
      if (response.ok) {
        const result = await response.json();
        if (result && result.paid === true) {
          isPaymentAlreadyConfirmed = true;
          handleSePayPaymentSuccess(result);
          return;
        }
        if (result && result.expired === true) {
          handleExpiredCheckout(generatedBookingCode, result.message);
          return;
        }
      }
    } catch (e) {
      console.warn('Lỗi kiểm tra thanh toán:', e);
    }

    if (btn) {
      btn.disabled = false;
      btn.textContent = '✓ Tôi đã chuyển khoản thành công';
    }
    const badge = document.getElementById('payment-status-badge');
    const text = document.getElementById('payment-status-text');
    if (badge && text) {
      badge.className = 'p-2.5 rounded-lg bg-[#FEE2E2] border border-[#FCA5A5] text-[#DC2626] text-xs font-bold flex items-center justify-center md:justify-start gap-2';
      text.textContent = `Chưa nhận được giao dịch với nội dung "${generatedBookingCode}". Vui lòng quét mã chuyển khoản trước!`;
    }

    startSePayAutoListener(generatedBookingCode);

    if (window.SanBongApp?.showModal) {
      window.SanBongApp.showModal({
        title: 'Chưa ghi nhận chuyển khoản đặt cọc',
        message: `Hệ thống chưa ghi nhận giao dịch chuyển khoản cho mã đơn: ${generatedBookingCode}\n\n• Vui lòng mở App ngân hàng quét mã VietQR hoặc chuyển đúng nội dung "${generatedBookingCode}".\n• Sau khi chuyển tiền thành công, hệ thống sẽ tự động duyệt và cấp vé ngay lập tức!`,
        type: 'warning', confirmVariant: 'warning', confirmText: 'Tôi đã hiểu'
      });
    } else if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('⚠️ Hệ thống đang chờ nhận tiền cọc cho mã ' + generatedBookingCode + '. Quý khách vui lòng hoàn tất chuyển khoản!', 'warning', 5000);
    }
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = '✓ Giao dịch đã xác nhận thành công! Đang chuyển hướng...';
  }

  const db = window.SanBongApp.SanBongDB;
  const weeks = Math.max(1, parseInt(currentDraft?.weeksCount, 10) || 1);
  const sysRate = Number(window._checkoutServerBooking?.depositRate || db?.getSystemConfig?.()?.depositRate || 30);
  const depPct = (weeks > 1 || currentDraft?.bookingMode === 'monthly') ? 60 : Math.max(10, Math.min(100, sysRate));
  const payLabel = `Đã cọc ${depPct}%`;
  db.updateBookingStatus(generatedBookingCode, 'Đã xác nhận', payLabel);

  const bottleCost = Math.max(1, Number(window.SanBongApp?.SanBongDB?.getSystemConfig?.()?.loyaltyBottleCostPoints || db?.getSystemConfig?.()?.loyaltyBottleCostPoints) || 100);
  const pointsUsed = Number(currentDraft?.pointsUsed ?? (redeemedBottles * bottleCost));

  const rawBooking = sessionStorage.getItem('sb_latest_booking');
  let currentBooking = null;
  if (rawBooking) {
    try { currentBooking = JSON.parse(rawBooking); } catch (e) {}
  }

  if (!currentBooking) {
    currentBooking = db.getBookingByCode ? db.getBookingByCode(generatedBookingCode) : { code: generatedBookingCode };
  }

  if (currentBooking) {
    currentBooking.status = 'Đã xác nhận';
    currentBooking.paymentStatus = payLabel;
    currentBooking.depositRate = depPct;
    currentBooking.pointsUsed = pointsUsed;
    currentBooking.redeemedBottles = redeemedBottles;
    sessionStorage.setItem('sb_latest_booking', JSON.stringify(currentBooking));

    if (db.getAllBookings) {
      const all = db.getAllBookings();
      const idx = all.findIndex(b => b.code === generatedBookingCode);
      if (idx !== -1) {
        all[idx] = Object.assign(all[idx], {
          status: 'Đã xác nhận',
          paymentStatus: payLabel,
          depositRate: depPct,
          pointsUsed: pointsUsed,
          redeemedBottles: redeemedBottles
        });
        localStorage.setItem('sb_bookings_v1', JSON.stringify(all));
      }
    }
  }

  sessionStorage.removeItem('sb_booking_draft');
  sessionStorage.removeItem('sb_active_hold_code');
  try {
    localStorage.removeItem('sb_hold_expire_' + generatedBookingCode);
  } catch (e) {}

  const successUrl = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath('success') : '../success';
  window.location.href = `${successUrl}?code=${generatedBookingCode}`;
}

function getCheckPaymentUrl(bookingCode) {
  const path = `api/check_payment.php?code=${encodeURIComponent(bookingCode)}&_t=${Date.now()}`;
  return window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath(path) : `../${path}`;
}

function handleExpiredCheckout(bookingCode, message) {
  if (sepayPollTimer) {
    clearInterval(sepayPollTimer);
    sepayPollTimer = null;
  }
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  sessionStorage.removeItem('sb_booking_draft');
  try {
    localStorage.removeItem('sb_hold_expire_' + bookingCode);
  } catch (e) {}
  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(message || 'Đơn đặt sân đã quá hạn giữ chỗ hoặc đã bị hủy.', 'error', 3500);
  }
  const bookingUrl = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath('booking') : '../booking';
  window.location.replace(bookingUrl);
}
