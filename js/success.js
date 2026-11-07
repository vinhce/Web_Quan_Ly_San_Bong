/**
 * SÂN BÓNG PRO - THÀNH CÔNG & VÉ ĐẶT SÂN (success.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const urlParams = new URLSearchParams(window.location.search);
  const codeParam = urlParams.get('code');

  let booking = null;
  if (codeParam) {
    booking = db.getAllBookings().find(b => b.code === codeParam);
  }

  if (!booking) {
    const rawLatest = sessionStorage.getItem('sb_latest_booking');
    if (rawLatest) {
      try { booking = JSON.parse(rawLatest); } catch (e) {}
    }
  }

  if (!booking) {
    booking = db.getAllBookings()[0] || {
      code: 'SB-20261106-0042',
      customerName: 'Trần Minh Hoàng',
      phone: '0352313548',
      pitchName: 'Sân 7 - Sân A (Trung tâm)',
      date: new Date().toISOString().split('T')[0],
      slotTime: '18:30 - 20:00',
      totalPrice: 1020000,
      depositAmount: 306000,
      remainingAmount: 714000,
      services: [{ name: 'Nước suối', quantity: 4 }, { name: 'Thuê áo bib', quantity: 2 }]
    };
  }

  // Điền dữ liệu vào vé
  const codeEl = document.getElementById('ticket-booking-code');
  if (codeEl) codeEl.textContent = booking.code;
  const pNameEl = document.getElementById('ticket-pitch-name');
  if (pNameEl) pNameEl.textContent = booking.pitchName;
  const dtEl = document.getElementById('ticket-datetime');
  if (dtEl) dtEl.textContent = `${window.SanBongApp.formatDateVN(booking.date)} · ${booking.slotTime}`;
  const totEl = document.getElementById('ticket-total-amt');
  if (totEl) totEl.textContent = window.SanBongApp.formatVND(booking.totalPrice);
  const depEl = document.getElementById('ticket-deposit-amt');
  if (depEl) depEl.textContent = window.SanBongApp.formatVND(booking.depositAmount);
  const remEl = document.getElementById('ticket-remaining-amt');
  if (remEl) remEl.textContent = window.SanBongApp.formatVND(booking.remainingAmount);
  const custEl = document.getElementById('ticket-cust-info');
  if (custEl) custEl.textContent = `${booking.customerName} (${booking.phone || '0352 313 548'})`;

  const srvEl = document.getElementById('ticket-services-desc');
  if (srvEl) {
    if (booking.services && booking.services.length > 0) {
      srvEl.textContent = booking.services.map(s => `${s.name} × ${s.quantity}`).join(', ');
    } else {
      srvEl.textContent = 'Không có dịch vụ thêm';
    }
  }

  // Render Vector QR Check-in Code
  const qrMount = document.getElementById('ticket-qr-mount');
  if (qrMount) {
    qrMount.innerHTML = window.SanBongApp.renderQRCodeSVG(140);
  }
});
