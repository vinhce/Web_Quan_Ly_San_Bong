
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

  const currentUser = db.getUser();
  if (!currentUser || !currentUser.name) {
    if (window.SanBongApp?.showToast) { window.SanBongApp.showToast('Vui lòng đăng nhập hoặc đăng ký tài khoản để tiếp tục thanh toán chuyển khoản!', 'info', 3000); }
    const loginUrl = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath('login?redirect=checkout') : '/login?redirect=checkout';
    window.location.replace(loginUrl);
    return;
  }

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

  if (!currentDraft.customerName || currentDraft.customerName === '---' || currentDraft.customerName === 'Khách vãng lai') {
    currentDraft.customerName = currentUser.name;
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

  renderCheckoutDetails();
  setupLoyaltyWaterRedemption();

  window.addEventListener('sb-data-synced', () => {
    const syncedCfg = db.getSystemConfig ? db.getSystemConfig() : null;
    if (syncedCfg && syncedCfg.holdMinutes) {
      activeHoldMinutes = Math.max(5, Math.min(120, Number(syncedCfg.holdMinutes) || 15));
      const holdLabelEl = document.getElementById('hold-minutes-label');
      if (holdLabelEl) holdLabelEl.textContent = `${activeHoldMinutes} phút`;
    }
    renderCheckoutDetails();
  });

  const initialRemaining = Math.max(0, Math.ceil((Number(currentDraft.expiresAt) - Date.now()) / 1000));
  startCountdown(initialRemaining);

  await createInitialBookingRecord();

  startSePayAutoListener(generatedBookingCode);

  document.getElementById('confirm-payment-btn')?.addEventListener('click', () => confirmPayment(false));
});

async function createInitialBookingRecord() {
  const db = window.SanBongApp.SanBongDB;
  const slots = db.getTimeSlots();
  const slot = slots.find(s => s.id === currentDraft.slotId);

  let existing = db.getAllBookings().find(b => b.code === generatedBookingCode);
  const newBooking = existing || db.createBooking({
    code: generatedBookingCode,
    customerName: currentDraft.customerName,
    phone: currentDraft.phone,
    email: 'khachhang@sanbongpro.vn',
    pitchId: currentDraft.pitchId,
    date: currentDraft.date,
    slotId: currentDraft.slotId,
    slotTime: slot ? slot.time : '18:30 - 20:00',
    bookingMode: currentDraft.bookingMode || 'single',
    weeksCount: currentDraft.weeksCount || 1,
    monthlyDates: currentDraft.monthlyDates || [],
    services: currentDraft.services,
    voucherCode: currentDraft.voucherCode,
    note: currentDraft.note,
    status: 'Chờ duyệt cọc',
    paymentStatus: 'Chờ cọc 30%',
    paymentMethod: 'VietQR SePay (Tự động)'
  });

  sessionStorage.setItem('sb_latest_booking', JSON.stringify(newBooking));

  if (window.SanBongApp?.SanBongAPI) {
    try {
      const apiRes = await window.SanBongApp.SanBongAPI.postBooking({
        code: generatedBookingCode,
        booking: newBooking,
        timestamp: new Date().toISOString()
      });
      if (apiRes && apiRes.success && apiRes.data) {
        const srvHoldMins = Number(apiRes.data.holdMinutes ?? apiRes.data.hold_minutes ?? 0);
        const srvExpiresAt = apiRes.data.expiresAt ?? apiRes.data.expires_at ?? null;
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
      }
    } catch (e) {}
  }
}

function renderCheckoutDetails() {
  const db = window.SanBongApp.SanBongDB;
  const pitch = db.getPitchById(currentDraft.pitchId) || db.getPitches()[0];
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
  );

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
    const sepayBank = bank.bankCode || 'MB';
    const sepayAcc = accNum;
    const sepayAmt = calc.depositAmount || 0;
    const sepayDes = generatedBookingCode;
    const qrUrl = `https://qr.sepay.vn/img?bank=${encodeURIComponent(sepayBank)}&acc=${encodeURIComponent(sepayAcc)}&template=compact&amount=${sepayAmt}&des=${encodeURIComponent(sepayDes)}`;

    qrImg.src = qrUrl;
    qrImg.onload = () => {
      if (qrLoading) qrLoading.classList.add('hidden');
    };
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
  if (sRow) {
    if (calc.appliedServices && calc.appliedServices.length > 0) {
      sRow.innerHTML = 'Dịch vụ: ' + calc.appliedServices.map(s => `${s.name} × ${s.quantity}`).join(', ');
    } else {
      sRow.innerHTML = 'Không chọn dịch vụ thêm';
    }
  }

  const tAmt = document.getElementById('co-total-amount');
  if (tAmt) tAmt.textContent = window.SanBongApp.formatVND(calc.totalPrice);
  const dAmt = document.getElementById('co-deposit-amount');
  if (dAmt) dAmt.textContent = window.SanBongApp.formatVND(calc.depositAmount);
  const rAmt = document.getElementById('co-remaining-amount');
  if (rAmt) rAmt.textContent = window.SanBongApp.formatVND(calc.remainingAmount);

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
            <span class="uppercase tracking-wide">Đặc quyền tài trợ mỗi trận (${promo.title})</span>
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
  const apiBase = window.SanBongApp?.getAppBase ? window.SanBongApp.getAppBase() : '/';

  sepayPollTimer = setInterval(async () => {
    if (isPaymentAlreadyConfirmed) {
      clearInterval(sepayPollTimer);
      return;
    }

    try {
      const response = await fetch(`${apiBase}api/check_payment.php?code=${encodeURIComponent(bookingCode)}&_t=${Date.now()}`, {
        cache: 'no-store'
      });
      if (response.ok) {
        const result = await response.json();
        if (result && result.paid === true) {
          isPaymentAlreadyConfirmed = true;
          clearInterval(sepayPollTimer);
          handleSePayPaymentSuccess(result);
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
    text.innerHTML = '🎉 <strong>ĐÃ NHẬN TIỀN CỌC!</strong> Cổng SePay xác nhận giao dịch thành công. Đang chuyển hướng...';
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
  const userPoints = (user && typeof user.points === 'number') ? user.points : 0;
  const maxBottles = Math.floor(userPoints / 100);

  const pointsEl = document.getElementById('current-user-points');
  if (pointsEl) pointsEl.textContent = `${userPoints}đ`;

  const maxEl = document.getElementById('max-redeemable-bottles');
  if (maxEl) maxEl.textContent = `${maxBottles} chai`;

  const btnSub = document.getElementById('btn-sub-water');
  const btnAdd = document.getElementById('btn-add-water');
  const countEl = document.getElementById('redeemed-bottles-count');
  const summaryBox = document.getElementById('points-exchange-summary');
  const deductEl = document.getElementById('points-to-deduct');
  const receivedEl = document.getElementById('water-bottles-received');
  const coRow = document.getElementById('co-redeemed-water-row');
  const coText = document.getElementById('co-redeemed-water-text');

  function renderRedemptionState() {
    if (countEl) countEl.textContent = String(redeemedBottles);
    if (btnSub) btnSub.disabled = (redeemedBottles <= 0);
    if (btnAdd) btnAdd.disabled = (redeemedBottles >= maxBottles);

    if (redeemedBottles > 0) {
      if (summaryBox) summaryBox.classList.remove('hidden');
      if (deductEl) deductEl.textContent = `${redeemedBottles * 100} điểm`;
      if (receivedEl) receivedEl.textContent = `${redeemedBottles} chai Aquafina miễn phí`;
      if (coRow) coRow.classList.remove('hidden');
      if (coText) coText.textContent = `+${redeemedBottles} chai Aquafina (-${redeemedBottles * 100}đ)`;
    } else {
      if (summaryBox) summaryBox.classList.add('hidden');
      if (coRow) coRow.classList.add('hidden');
    }

    if (currentDraft) {
      currentDraft.redeemedBottles = redeemedBottles;
      currentDraft.pointsUsed = redeemedBottles * 100;
      sessionStorage.setItem('sb_booking_draft', JSON.stringify(currentDraft));
    }
  }

  btnSub?.addEventListener('click', () => {
    if (redeemedBottles > 0) {
      redeemedBottles--;
      renderRedemptionState();
    }
  });

  btnAdd?.addEventListener('click', () => {
    if (redeemedBottles < maxBottles) {
      redeemedBottles++;
      renderRedemptionState();
    }
  });

  renderRedemptionState();
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
  const apiBase = window.SanBongApp?.getAppBase ? window.SanBongApp.getAppBase() : '/';

  if (!isAuto && !isPaymentAlreadyConfirmed) {
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Đang kiểm tra cổng thanh toán SePay...';
    }

    try {
      const response = await fetch(`${apiBase}api/check_payment.php?code=${encodeURIComponent(generatedBookingCode)}&_t=${Date.now()}`, {
        cache: 'no-store'
      });
      if (response.ok) {
        const result = await response.json();
        if (result && result.paid === true) {
          isPaymentAlreadyConfirmed = true;
          handleSePayPaymentSuccess(result);
          return;
        }
      }
    } catch (e) {
      console.warn('Lỗi kiểm tra SePay:', e);
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
        title: 'Cổng SePay chưa nhận được tiền cọc',
        message: `Hệ thống chưa ghi nhận giao dịch chuyển khoản cho mã đơn: ${generatedBookingCode}\n\n• Vui lòng mở App ngân hàng quét mã VietQR hoặc chuyển đúng nội dung "${generatedBookingCode}".\n• Sau khi chuyển tiền thành công, hệ thống sẽ tự động duyệt và cấp vé ngay lập tức!`,
        type: 'warning',
        confirmText: 'Tôi đã hiểu'
      });
    } else if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('⚠️ Chưa nhận được tiền cọc cho mã ' + generatedBookingCode + '. Vui lòng hoàn tất chuyển khoản!', 'warning', 5000);
    }
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = '✓ SePay xác nhận thành công! Đang chuyển hướng...';
  }

  const db = window.SanBongApp.SanBongDB;
  db.updateBookingStatus(generatedBookingCode, 'Đã xác nhận', 'Đã cọc 30%');

  const user = db.getUser();
  const currentPoints = typeof user?.points === 'number' ? user.points : 0;
  const pointsUsed = redeemedBottles * 100;
  const afterDeduction = Math.max(0, currentPoints - pointsUsed);
  const POINTS_AWARDED = 100;
  const newPoints = afterDeduction + POINTS_AWARDED;

  if (db.updateUser) {
    db.updateUser({ points: newPoints });
  }

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
    currentBooking.paymentStatus = 'Đã cọc 30%';
    currentBooking.pointsUsed = pointsUsed;
    currentBooking.redeemedBottles = redeemedBottles;
    currentBooking.pointsAwarded = POINTS_AWARDED;
    currentBooking.newPointsBalance = newPoints;
    sessionStorage.setItem('sb_latest_booking', JSON.stringify(currentBooking));

    if (db.getAllBookings) {
      const all = db.getAllBookings();
      const idx = all.findIndex(b => b.code === generatedBookingCode);
      if (idx !== -1) {
        all[idx] = Object.assign(all[idx], {
          status: 'Đã xác nhận',
          paymentStatus: 'Đã cọc 30%',
          pointsUsed: pointsUsed,
          redeemedBottles: redeemedBottles,
          pointsAwarded: POINTS_AWARDED,
          newPointsBalance: newPoints
        });
        localStorage.setItem('sb_bookings_v1', JSON.stringify(all));
      }
    }
  }

  sessionStorage.removeItem('sb_booking_draft');
  try {
    localStorage.removeItem('sb_hold_expire_' + generatedBookingCode);
  } catch (e) {}

  const successUrl = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath('success') : '/success';
  window.location.href = `${successUrl}?code=${generatedBookingCode}`;
}
