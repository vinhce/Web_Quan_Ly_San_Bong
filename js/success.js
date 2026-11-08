/**
 * SÂN BÓNG PRO - THÀNH CÔNG & VÉ ĐẶT SÂN (success.js)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const mainEl = document.querySelector('main');
  if (mainEl) mainEl.style.visibility = 'hidden';

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
      try {
        const parsed = JSON.parse(rawLatest);
        if (!codeParam || parsed.code === codeParam) {
          booking = parsed;
        }
      } catch (e) {}
    }
  }

  const checkCode = codeParam || (booking ? booking.code : '');
  const checkoutUrl = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath('checkout') : '/checkout';

  if (!checkCode) {
    window.location.replace(checkoutUrl);
    return;
  }

  // Xác thực bắt buộc với cổng SePay phía Server trước khi hiển thị vé
  const apiBase = window.SanBongApp?.getAppBase ? window.SanBongApp.getAppBase() : '/';
  let serverVerifiedPaid = false;
  try {
    const res = await fetch(`${apiBase}api/check_payment.php?code=${encodeURIComponent(checkCode)}&_t=${Date.now()}`, {
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.paid === true) {
        serverVerifiedPaid = true;
      }
    }
  } catch (e) {}

  if (!serverVerifiedPaid) {
    alert(`⚠️ ĐƠN ĐẶT SÂN ${checkCode} CHƯA ĐƯỢC THANH TOÁN CỌC!\n\nHệ thống SePay chưa ghi nhận giao dịch chuyển khoản cho mã đơn này. Vui lòng hoàn tất thanh toán VietQR trước khi nhận vé.`);
    window.location.replace(checkoutUrl);
    return;
  }

  if (mainEl) mainEl.style.visibility = 'visible';

  if (!booking) {
    booking = {
      code: checkCode,
      customerName: 'Trần Minh Hoàng',
      phone: '0352313548',
      pitchName: 'Sân 7 - Sân A (Trung tâm)',
      date: new Date().toISOString().split('T')[0],
      slotTime: '18:30 - 20:00',
      totalPrice: 891000,
      depositAmount: 267300,
      remainingAmount: 623700,
      paymentStatus: 'Đã cọc 30%',
      services: [{ name: 'Nước suối', quantity: 4 }, { name: 'Thuê áo bib', quantity: 2 }]
    };
  } else {
    booking.status = 'Đã xác nhận';
    booking.paymentStatus = 'Đã cọc 30%';
    db.updateBookingStatus(booking.code, 'Đã xác nhận', 'Đã cọc 30%');
  }

  // Điền dữ liệu vào vé
  const codeEl = document.getElementById('ticket-booking-code');
  if (codeEl) codeEl.textContent = booking.code;

  // Cập nhật trạng thái thanh toán thực tế của vé
  const badgeEl = document.getElementById('ticket-status-badge');
  const isPaid = booking.paymentStatus === 'Đã cọc 30%' || booking.paymentStatus === 'Đã thanh toán đủ';
  if (badgeEl) {
    if (isPaid) {
      badgeEl.className = 'px-3 py-1 rounded-full bg-[#DCFCE7] text-[#16A34A] text-xs font-bold';
      badgeEl.textContent = '✓ Đã xác nhận & Cọc 30%';
    } else {
      badgeEl.className = 'px-3 py-1 rounded-full bg-[#FEF3C7] text-[#D97706] text-xs font-bold';
      badgeEl.textContent = '⏳ Chờ duyệt cọc (Chưa thanh toán)';
    }
  }

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
