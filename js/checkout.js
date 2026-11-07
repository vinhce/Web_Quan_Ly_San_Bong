/**
 * SÂN BÓNG PRO - THANH TOÁN (checkout.js)
 */

let currentDraft = null;
let generatedBookingCode = '';

document.addEventListener('DOMContentLoaded', () => {
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

  // Tạo mã booking tạm
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  generatedBookingCode = `SB-${datePart}-${rand}`;

  renderCheckoutDetails();
  startCountdown(10 * 60);

  document.getElementById('confirm-payment-btn')?.addEventListener('click', confirmPayment);
});

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
  if (bName) bName.textContent = bank.bankName;
  const bAcc = document.getElementById('bank-account');
  if (bAcc) bAcc.textContent = bank.accountNumber;
  const bOwner = document.getElementById('bank-owner');
  if (bOwner) bOwner.textContent = bank.accountName;
  const bAmt = document.getElementById('bank-amount');
  if (bAmt) bAmt.textContent = window.SanBongApp.formatVND(calc.depositAmount);

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

function startCountdown(seconds) {
  let remaining = seconds;
  const timerEl = document.getElementById('countdown-timer');
  if (!timerEl) return;

  const interval = setInterval(() => {
    if (remaining <= 0) {
      clearInterval(interval);
      timerEl.textContent = '00:00';
      alert('Khung giờ giữ chỗ đã hết hạn! Vui lòng thao tác lại.');
      window.location.href = 'booking.html';
      return;
    }
    remaining--;
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    timerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, 1000);
}

function copyText(elementId) {
  const text = document.getElementById(elementId)?.innerText || '';
  navigator.clipboard.writeText(text).then(() => {
    alert('Đã sao chép: ' + text);
  }).catch(() => {
    alert('Nội dung: ' + text);
  });
}

function confirmPayment() {
  const db = window.SanBongApp.SanBongDB;
  const slots = db.getTimeSlots();
  const slot = slots.find(s => s.id === currentDraft.slotId);

  // Tạo booking thật và lưu bền vững vào localStorage
  const newBooking = db.createBooking({
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
    paymentMethod: 'VietQR Chuyển khoản'
  });

  // Ghi đè mã booking để khớp giao diện nếu cần
  sessionStorage.setItem('sb_latest_booking', JSON.stringify(newBooking));
  sessionStorage.removeItem('sb_booking_draft');

  // Chuyển sang màn hình thành công
  window.location.href = `success.html?code=${newBooking.code}`;
}
