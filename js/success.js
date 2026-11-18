
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
  const checkoutUrl = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath('checkout') : '../checkout';

  if (!checkCode) {
    window.location.replace(checkoutUrl);
    return;
  }

  let serverVerifiedPaid = false;
  try {
    const checkPath = `api/check_payment.php?code=${encodeURIComponent(checkCode)}&_t=${Date.now()}`;
    const checkUrl = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath(checkPath) : `../${checkPath}`;
    const res = await fetch(checkUrl, {
      cache: 'no-store',
      credentials: 'same-origin'
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.paid === true) {
        serverVerifiedPaid = true;
      }
    }
  } catch (e) {}

  if (!serverVerifiedPaid) {
    if (window.SanBongApp?.showModal) {
      window.SanBongApp.showModal({
        title: 'Đơn đặt sân chưa thanh toán cọc',
        message: 'Hệ thống SePay chưa ghi nhận giao dịch chuyển khoản cho mã đơn ' + checkCode + '. Vui lòng hoàn tất thanh toán VietQR trước khi nhận vé.',
        type: 'warning',
        confirmText: 'Tôi đã hiểu'
      });
    } else if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('⚠️ Đơn ' + checkCode + ' chưa thanh toán cọc SePay!', 'warning', 4000);
    }
    window.location.replace(checkoutUrl);
    return;
  }

  if (mainEl) mainEl.style.visibility = 'visible';

  if (!booking) {
    try {
      const bookingPath = `api/bookings.php?code=${encodeURIComponent(checkCode)}`;
      const bookingApiUrl = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath(bookingPath) : `../${bookingPath}`;
      const bRes = await fetch(bookingApiUrl, {
        cache: 'no-store',
        credentials: 'same-origin'
      });
      if (bRes.ok) {
        const bJson = await bRes.json();
        const bData = bJson?.data || null;
        if (bJson?.success && bData) {
          booking = {
            code: bData.code || checkCode,
            customerName: bData.customerName || bData.customer_name || 'Khách hàng',
            phone: bData.phone || '',
            pitchName: bData.pitchName || bData.pitch_name || bData.pitchId || bData.pitch_id || 'Sân bóng',
            date: bData.date || bData.booking_date || (window.SanBongApp?.getLocalTodayISO ? window.SanBongApp.getLocalTodayISO() : new Date().toISOString().split('T')[0]),
            slotTime: bData.slotTime || bData.slot_time || '',
            totalPrice: Number(bData.totalPrice ?? bData.total_price ?? 0),
            depositAmount: Number(bData.depositAmount ?? bData.deposit_amount ?? 0),
            remainingAmount: Number(bData.remainingAmount ?? bData.remaining_amount ?? 0),
            paymentStatus: bData.paymentStatus || bData.payment_status || 'Đã cọc 30%',
            status: bData.status || 'Đã xác nhận',
            services: Array.isArray(bData.services) ? bData.services : [],
            weeksCount: Number(bData.weeksCount ?? bData.weeks_count ?? 1),
            note: bData.note || ''
          };
        }
      }
    } catch (e) {}
  }

  if (!booking) {
    const historyUrl = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath('history') : '/history';
    window.location.replace(historyUrl);
    return;
  }

  booking.status = booking.status && booking.status !== 'Chờ duyệt cọc' ? booking.status : 'Đã xác nhận';
  if (!booking.paymentStatus || booking.paymentStatus === 'Chờ cọc 30%') {
    booking.paymentStatus = 'Đã cọc 30%';
  }
  db.updateBookingStatus(booking.code, booking.status, booking.paymentStatus);

  const codeEl = document.getElementById('ticket-booking-code');
  if (codeEl) codeEl.textContent = booking.code;

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
  if (custEl) custEl.textContent = `${booking.customerName || 'Khách hàng'} (${booking.phone || '---'})`;

  const srvEl = document.getElementById('ticket-services-desc');
  if (srvEl) {
    let srvList = [];
    if (booking.services && booking.services.length > 0) {
      srvList = booking.services.map(s => `${s.name} × ${s.quantity}`);
    }
    if (booking.redeemedBottles && booking.redeemedBottles > 0) {
      srvList.push(`💧 Nước suối miễn phí (${booking.redeemedBottles} chai - Đổi từ ${booking.pointsUsed || (booking.redeemedBottles * 100)}đ)`);
    }
    srvEl.textContent = srvList.length > 0 ? srvList.join(', ') : 'Không có dịch vụ thêm';
  }

  const pointsNoteEl = document.getElementById('ticket-points-used-note');
  if (pointsNoteEl) {
    if (booking.redeemedBottles && booking.redeemedBottles > 0) {
      const bottles = Number(booking.redeemedBottles || 0);
      const ptsUsed = Number(booking.pointsUsed || bottles * 100);
      pointsNoteEl.innerHTML = `Đã đổi nước: <strong class="text-[#DC2626]">-${ptsUsed} điểm</strong> (${bottles} chai Aquafina)`;
    } else {
      pointsNoteEl.textContent = 'Đã đổi nước: 0 điểm (0 chai)';
    }
  }

  const pkgCard = document.getElementById('ticket-package-promo-card');
  const pkgText = document.getElementById('ticket-package-promo-text');
  const promo = booking.packagePromotion || (window.SanBongApp?.SanBongDB?.getPackagePromotion ? window.SanBongApp.SanBongDB.getPackagePromotion(booking.weeksCount || 1) : null);

  if (pkgCard && pkgText) {
    if (booking.weeksCount > 1 || String(booking.note || '').includes('Gói') || promo) {
      pkgCard.classList.remove('hidden');
      pkgCard.classList.add('flex');
      if (promo) {
        pkgText.textContent = `${promo.title}: Tài trợ ${promo.giftSummary} (Miễn phí 100%)`;
      } else if (String(booking.note || '').includes('trọng tài')) {
        pkgText.textContent = 'Tài trợ mỗi trận: 2 thùng nước suối + 1 trọng tài chuyên nghiệp';
      }
    } else {
      pkgCard.classList.add('hidden');
      pkgCard.classList.remove('flex');
    }
  }

  const user = db.getUser ? db.getUser() : {};
  const currentBalance = booking.newPointsBalance !== undefined ? booking.newPointsBalance : (user?.points ?? 0);
  const balanceEl = document.getElementById('ticket-points-balance');
  if (balanceEl) {
    balanceEl.textContent = `${currentBalance} điểm`;
  }

  const qrMount = document.getElementById('ticket-qr-mount');
  if (qrMount) {
    qrMount.innerHTML = window.SanBongApp.renderQRCodeSVG(booking.code, 140);
  }
});
