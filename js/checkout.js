/**
 * SÂN BÓNG PRO - THANH TOÁN TỰ ĐỘNG QUA SEPAY VIETQR (checkout.js)
 */

let currentDraft = null;
let generatedBookingCode = '';
let sepayPollTimer = null;
let isPaymentAlreadyConfirmed = false;
let redeemedBottles = 0;

document.addEventListener('DOMContentLoaded', async () => {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  // Đọc đơn nháp từ sessionStorage
  const rawDraft = sessionStorage.getItem('sb_booking_draft');
  if (rawDraft) {
    try {
      currentDraft = JSON.parse(rawDraft);
    } catch (e) {
      currentDraft = null;
    }
  }

  // Nếu không có draft, tạo một đơn mẫu để test
  if (!currentDraft) {
    currentDraft = {
      pitchId: 'P7-A',
      date: new Date().toISOString().split('T')[0],
      slotId: 'S08',
      services: [{ id: 'SRV-WATER', quantity: 4 }, { id: 'SRV-BIB', quantity: 2 }],
      voucherCode: 'WELCOME10',
      customerName: 'Trần Minh Hoàng',
      phone: '0352313548',
      note: ''
    };
  }

  // Tạo mã booking theo chuẩn SePay phân loại sân (ASFF = Sân 5, ASFS = Sân 7, ASFE = Sân 11)
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

  const HOLD_DURATION_MS = 10 * 60 * 1000;
  if (currentDraft.code && new RegExp('^' + prefix + '[0-9]{6,8}$', 'i').test(currentDraft.code)) {
    generatedBookingCode = currentDraft.code.toUpperCase();
    if (!currentDraft.expiresAt) {
      currentDraft.expiresAt = Date.now() + HOLD_DURATION_MS;
      sessionStorage.setItem('sb_booking_draft', JSON.stringify(currentDraft));
    }
  } else {
    const rand6 = String(Math.floor(100000 + Math.random() * 900000));
    generatedBookingCode = `${prefix}${rand6}`;
    currentDraft.code = generatedBookingCode;
    currentDraft.expiresAt = Date.now() + HOLD_DURATION_MS;
    sessionStorage.setItem('sb_booking_draft', JSON.stringify(currentDraft));
  }

  renderCheckoutDetails();
  setupLoyaltyWaterRedemption();
  const initialRemaining = Math.max(0, Math.ceil((Number(currentDraft.expiresAt) - Date.now()) / 1000));
  startCountdown(initialRemaining);

  // Khởi tạo đơn lên CSDL trước để SePay Webhook / Polling có thể ghi nhận
  await createInitialBookingRecord();

  // Bắt đầu lắng nghe tự động từ SePay (Polling 2.5s)
  startSePayAutoListener(generatedBookingCode);

  document.getElementById('confirm-payment-btn')?.addEventListener('click', () => confirmPayment(false));
});

async function createInitialBookingRecord() {
  const db = window.SanBongApp.SanBongDB;
  const slots = db.getTimeSlots();
  const slot = slots.find(s => s.id === currentDraft.slotId);

  // Kiểm tra nếu đơn đã tạo trong localStorage thì không tạo trùng khi F5
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
    services: currentDraft.services,
    voucherCode: currentDraft.voucherCode,
    note: currentDraft.note,
    status: 'Chờ duyệt cọc',
    paymentStatus: 'Chờ cọc 30%',
    paymentMethod: 'VietQR SePay (Tự động)'
  });

  sessionStorage.setItem('sb_latest_booking', JSON.stringify(newBooking));

  // Gửi lên CSDL server qua API
  if (window.SanBongApp?.SanBongAPI) {
    try {
      await window.SanBongApp.SanBongAPI.postBooking({
        code: generatedBookingCode,
        booking: newBooking,
        timestamp: new Date().toISOString()
      });
    } catch (e) {}
  }
}

function renderCheckoutDetails() {
  const db = window.SanBongApp.SanBongDB;
  const pitch = db.getPitchById(currentDraft.pitchId) || db.getPitches()[0];
  const slots = db.getTimeSlots();
  const slot = slots.find(s => s.id === currentDraft.slotId) || slots[3];

  const calc = db.calculatePrice(
    currentDraft.pitchId,
    currentDraft.date,
    currentDraft.slotId,
    currentDraft.services,
    currentDraft.voucherCode
  );

  const bank = db.getBankInfo();

  // Mini pitch SVG
  const svgContainer = document.getElementById('checkout-pitch-svg');
  if (svgContainer) {
    svgContainer.innerHTML = window.SanBongApp.renderPitchSVG(pitch.variant || 'standard', 'h-24');
  }

  // Header Order Badge
  const orderBadge = document.getElementById('order-code-badge');
  if (orderBadge) orderBadge.textContent = generatedBookingCode;
  const memoBadge = document.getElementById('bank-memo');
  if (memoBadge) memoBadge.textContent = generatedBookingCode;

  // Bank info
  const bName = document.getElementById('bank-name');
  if (bName) bName.textContent = bank.bankName || 'Ngân hàng Quân Đội (MBBank)';
  const bAcc = document.getElementById('bank-account');
  if (bAcc) bAcc.textContent = bank.accountNumber || '0352313548';
  const bOwner = document.getElementById('bank-owner');
  if (bOwner) bOwner.textContent = bank.accountName || 'NGUYEN QUANG VINH';
  const bAmt = document.getElementById('bank-amount');
  if (bAmt) bAmt.textContent = window.SanBongApp.formatVND(calc.depositAmount);

  // Sinh mã SePay VietQR động
  const qrImg = document.getElementById('sepay-qr-img');
  const qrLoading = document.getElementById('sepay-qr-loading');
  if (qrImg) {
    const sepayBank = bank.bankCode || 'MB';
    const sepayAcc = bank.accountNumber || '0352313548';
    const sepayAmt = calc.depositAmount || 0;
    const sepayDes = generatedBookingCode;
    const qrUrl = `https://qr.sepay.vn/img?bank=${encodeURIComponent(sepayBank)}&acc=${encodeURIComponent(sepayAcc)}&template=compact&amount=${sepayAmt}&des=${encodeURIComponent(sepayDes)}`;
    
    qrImg.src = qrUrl;
    qrImg.onload = () => {
      if (qrLoading) qrLoading.classList.add('hidden');
    };
  }

  // Order Summary
  const pName = document.getElementById('co-pitch-name');
  if (pName) pName.textContent = `${pitch.name} (${pitch.typeName})`;
  const pTime = document.getElementById('co-pitch-time');
  if (pTime) pTime.textContent = `${window.SanBongApp.formatDateVN(currentDraft.date)} · ${slot.time}`;
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
}

// Lắng nghe trạng thái thanh toán từ SePay theo thời gian thực (Polling mỗi 2.5s)
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
      // Bỏ qua lỗi mạng ngắt quãng
    }
  }, 2500);
}

// Xử lý khi SePay thông báo tiền đã vào tài khoản
function handleSePayPaymentSuccess(result) {
  const badge = document.getElementById('payment-status-badge');
  const text = document.getElementById('payment-status-text');

  if (badge) {
    badge.className = 'p-3 rounded-xl bg-[#DCFCE7] border border-[#86EFAC] text-[#15803D] text-xs font-bold flex items-center justify-center md:justify-start gap-2 shadow-sm animate-pulse';
  }
  if (text) {
    text.innerHTML = '🎉 <strong>ĐÃ NHẬN TIỀN CỌC!</strong> Cổng SePay xác nhận giao dịch thành công. Đang chuyển hướng...';
  }

  // Tự động chuyển trang sau 1.5 giây
  setTimeout(() => {
    confirmPayment(true);
  }, 1500);
}

function startCountdown(seconds) {
  let remaining = seconds;
  const timerEl = document.getElementById('countdown-timer');
  if (!timerEl) return;

  const updateDisplay = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    timerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  updateDisplay(remaining);

  const interval = setInterval(() => {
    if (currentDraft?.expiresAt) {
      remaining = Math.max(0, Math.ceil((Number(currentDraft.expiresAt) - Date.now()) / 1000));
    } else {
      remaining--;
    }

    if (remaining <= 0) {
      clearInterval(interval);
      if (sepayPollTimer) clearInterval(sepayPollTimer);
      timerEl.textContent = '00:00';
      sessionStorage.removeItem('sb_booking_draft');
      alert('Khung giờ giữ chỗ đã hết hạn! Vui lòng thao tác lại.');
      window.location.href = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath('booking') : '/booking';
      return;
    }

    updateDisplay(remaining);
  }, 1000);
}

function setupLoyaltyWaterRedemption() {
  const db = window.SanBongApp.SanBongDB;
  const user = db.getUser();
  const userPoints = typeof user?.points === 'number' ? user.points : 820;
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
  const text = document.getElementById(elementId)?.innerText || '';
  navigator.clipboard.writeText(text).then(() => {
    alert('Đã sao chép: ' + text);
  }).catch(() => {
    alert('Nội dung: ' + text);
  });
}

async function confirmPayment(isAuto = false) {
  if (sepayPollTimer) clearInterval(sepayPollTimer);

  const btn = document.getElementById('confirm-payment-btn');
  const apiBase = window.SanBongApp?.getAppBase ? window.SanBongApp.getAppBase() : '/';

  // NẾU BẤM THỦ CÔNG MÀ CHƯA CÓ XÁC NHẬN TỪ SEPAY -> GỌI API KIỂM TRA NGAY LẬP TỨC
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

    // CHƯA NHẬN ĐƯỢC TIỀN: BẬT LẠI NÚT, CẬP NHẬT BADGE CẢNH BÁO VÀ CHẶN CHUYỂN TRANG
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

    // Khôi phục lại polling để tự động bắt nếu tiền vào sau vài giây
    startSePayAutoListener(generatedBookingCode);

    alert(`⚠️ CỔNG THANH TOÁN SEPAY CHƯA NHẬN ĐƯỢC TIỀN CỌC!\n\nHệ thống chưa ghi nhận giao dịch chuyển khoản cho mã đơn: ${generatedBookingCode}\n\n• Vui lòng mở App ngân hàng quét mã VietQR hoặc chuyển đúng nội dung "${generatedBookingCode}".\n• Sau khi chuyển tiền thành công, hệ thống sẽ tự động duyệt và cấp vé ngay lập tức!`);
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = '✓ SePay xác nhận thành công! Đang chuyển hướng...';
  }

  // Cập nhật trạng thái đơn trong LocalStorage
  const db = window.SanBongApp.SanBongDB;
  db.updateBookingStatus(generatedBookingCode, 'Đã xác nhận', 'Đã cọc 30%');

  // Khấu trừ điểm đã đổi nước & tích luỹ điểm thưởng dùng cho trận sau
  const user = db.getUser();
  const currentPoints = typeof user?.points === 'number' ? user.points : 820;
  const pointsUsed = redeemedBottles * 100;
  const afterDeduction = Math.max(0, currentPoints - pointsUsed);
  const POINTS_AWARDED = 100; // Điểm thưởng trận sau
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

  // Chuyển sang màn hình thành công với Clean URL
  const successUrl = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath('success') : '/success';
  window.location.href = `${successUrl}?code=${generatedBookingCode}`;
}
