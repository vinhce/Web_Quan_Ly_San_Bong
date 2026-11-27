
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

  const checkPath = `api/check_payment.php?code=${encodeURIComponent(checkCode)}&_t=${Date.now()}`;
  const checkUrl = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath(checkPath) : `../${checkPath}`;
  const bookingPath = `api/bookings.php?code=${encodeURIComponent(checkCode)}&_t=${Date.now()}`;
  const bookingApiUrl = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath(bookingPath) : `../${bookingPath}`;

  const [checkSettled, bookingSettled] = await Promise.allSettled([
    fetch(checkUrl, { cache: 'no-store', credentials: 'same-origin' }),
    fetch(bookingApiUrl, { cache: 'no-store', credentials: 'same-origin' })
  ]);

  let serverVerifiedPaid = false;
  try {
    const res = checkSettled.status === 'fulfilled' ? checkSettled.value : null;
    if (res && res.ok) {
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

  try {
    const bRes = bookingSettled.status === 'fulfilled' ? bookingSettled.value : null;
    if (bRes && bRes.ok) {
      const bJson = await bRes.json();
      const rawList = Array.isArray(bJson?.data) ? bJson.data : (bJson?.data ? [bJson.data] : []);
      const bData = rawList.find(item => String(item?.code || '').toUpperCase() === String(checkCode).toUpperCase()) || rawList[0] || null;
      if (bJson?.success && bData) {
        const freshBooking = {
          code: bData.code || checkCode,
          customerName: bData.customerName || bData.customer_name || booking?.customerName || 'Khách hàng',
          phone: bData.phone || booking?.phone || '',
          pitchName: bData.pitchName || bData.pitch_name || bData.pitchId || bData.pitch_id || booking?.pitchName || 'Sân bóng',
          date: bData.date || bData.booking_date || booking?.date || (window.SanBongApp?.getLocalTodayISO ? window.SanBongApp.getLocalTodayISO() : new Date().toISOString().split('T')[0]),
          slotTime: bData.slotTime || bData.slot_time || booking?.slotTime || '',
          totalPrice: Number(bData.totalPrice ?? bData.total_price ?? booking?.totalPrice ?? 0),
          depositAmount: Number(bData.depositAmount ?? bData.deposit_amount ?? booking?.depositAmount ?? 0),
          paidAmount: Number(bData.paidAmount ?? bData.paid_amount ?? booking?.paidAmount ?? 0),
          remainingAmount: Number(bData.remainingAmount ?? bData.remaining_amount ?? booking?.remainingAmount ?? 0),
          depositRate: Number(bData.depositRate ?? bData.deposit_rate ?? ((Number(bData.weeksCount ?? bData.weeks_count ?? booking?.weeksCount ?? 1) > 1) ? 60 : 30)),
          paymentStatus: bData.paymentStatus || bData.payment_status || booking?.paymentStatus || 'Đã cọc 30%',
          status: bData.status || booking?.status || 'Đã xác nhận',
          services: Array.isArray(bData.services) ? bData.services : (booking?.services || []),
          weeksCount: Number(bData.weeksCount ?? bData.weeks_count ?? booking?.weeksCount ?? 1),
          pointsUsed: Number(bData.pointsUsed ?? bData.points_used ?? booking?.pointsUsed ?? 0),
          redeemedBottles: Number(bData.redeemedBottles ?? bData.redeemed_bottles ?? booking?.redeemedBottles ?? 0),
          note: bData.note || booking?.note || ''
        };
        booking = Object.assign({}, booking || {}, freshBooking);
      }
    }
  } catch (e) {}

  if (mainEl) mainEl.style.visibility = 'visible';

  if (!booking) {
    const historyUrl = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath('history') : '/history';
    window.location.replace(historyUrl);
    return;
  }

  const weeksCount = Number(booking.weeksCount || 1);
  const depositPct = String(booking.paymentStatus || '').includes('60%') || weeksCount > 1
    ? 60
    : (Number(booking.depositRate || 30) || 30);

  booking.status = booking.status && booking.status !== 'Chờ duyệt cọc' && booking.status !== 'Giữ chỗ' ? booking.status : 'Đã xác nhận';
  if (!booking.paymentStatus || booking.paymentStatus === 'Chờ cọc 30%' || booking.paymentStatus === 'Chờ duyệt cọc') {
    booking.paymentStatus = `Đã cọc ${depositPct}%`;
  }
  db.updateBookingStatus(booking.code, booking.status, booking.paymentStatus);

  const codeEl = document.getElementById('ticket-booking-code');
  if (codeEl) codeEl.textContent = booking.code;

  const payStr = String(booking.paymentStatus || '');
  const isFullPaid = payStr === 'Đã thanh toán đủ' || payStr === 'Đã thanh toán 100%';
  const isPaid = isFullPaid || payStr === 'Đã cọc 30%' || payStr === 'Đã cọc 60%' || payStr.includes('Đã cọc');

  const subtitleEl = document.getElementById('success-page-subtitle');
  if (subtitleEl) {
    subtitleEl.textContent = isFullPaid
      ? 'Hệ thống đã tự động ghi nhận thanh toán đủ 100%. Vui lòng đưa mã vé dưới đây cho nhân viên khi đến sân.'
      : `Hệ thống đã tự động ghi nhận tiền cọc ${depositPct}%. Vui lòng đưa mã vé dưới đây cho nhân viên khi đến sân.`;
  }

  const depLabelEl = document.getElementById('ticket-deposit-label');
  if (depLabelEl) {
    depLabelEl.textContent = isFullPaid
      ? 'Đã thanh toán VietQR (100%):'
      : `Đã đặt cọc VietQR (${depositPct}%):`;
  }

  const badgeEl = document.getElementById('ticket-status-badge');
  if (badgeEl) {
    if (isPaid) {
      badgeEl.className = 'px-3 py-1 rounded-full bg-[#DCFCE7] text-[#16A34A] text-xs font-bold';
      badgeEl.textContent = isFullPaid
        ? '✓ Đã xác nhận & Thanh toán 100%'
        : `✓ Đã xác nhận & Cọc ${depositPct}%`;
    } else {
      badgeEl.className = 'px-3 py-1 rounded-full bg-[#FEF3C7] text-[#D97706] text-xs font-bold';
      badgeEl.textContent = '⏳ Chờ duyệt cọc (Chưa thanh toán)';
    }
  }

  const total = Math.max(0, Number(booking.totalPrice || 0));
  const paid = Math.max(0, Number(booking.paidAmount || 0));
  const remaining = Math.max(0, total - paid);
  const UNPAID_STATUSES = ['Chờ cọc', 'Chờ duyệt cọc', 'Đã giữ chỗ', 'Giữ chỗ', 'Chờ thanh toán'];
  const isUnpaidDeposit = paid <= 0 || UNPAID_STATUSES.includes(String(booking.status || '').trim());

  const pNameEl = document.getElementById('ticket-pitch-name');
  if (pNameEl) pNameEl.textContent = booking.pitchName;
  const dtEl = document.getElementById('ticket-datetime');
  if (dtEl) dtEl.textContent = `${window.SanBongApp.formatDateVN(booking.date)} · ${booking.slotTime}`;
  const totEl = document.getElementById('ticket-total-amt');
  if (totEl) totEl.textContent = window.SanBongApp.formatVND(total);
  const depEl = document.getElementById('ticket-deposit-amt');
  if (depEl) depEl.textContent = window.SanBongApp.formatVND(paid);
  const remEl = document.getElementById('ticket-remaining-amt');
  if (remEl) remEl.textContent = window.SanBongApp.formatVND(remaining);
  const custEl = document.getElementById('ticket-cust-info');
  if (custEl) custEl.textContent = `${booking.customerName || 'Khách hàng'} (${booking.phone || '---'})`;

  const srvEl = document.getElementById('ticket-services-desc');
  if (srvEl) {
    let srvList = [];
    if (booking.services && booking.services.length > 0) {
      srvList = booking.services.map(s => `${s.name} × ${s.quantity}`);
    }
    if (booking.redeemedBottles && booking.redeemedBottles > 0) {
      const bottleCost = Math.max(1, Number(db?.getSystemConfig?.()?.loyaltyBottleCostPoints || 100) || 100);
      const usedPts = Number(booking.pointsUsed || (booking.redeemedBottles * bottleCost));
      srvList.push(`💧 Nước suối miễn phí (${booking.redeemedBottles} chai - Đổi từ ${usedPts} điểm)`);
    }
    srvEl.textContent = srvList.length > 0 ? srvList.join(', ') : 'Không có dịch vụ thêm';
  }

  const pointsNoteEl = document.getElementById('ticket-points-used-note');
  if (pointsNoteEl) {
    if (booking.redeemedBottles && booking.redeemedBottles > 0) {
      const bottles = Number(booking.redeemedBottles || 0);
      const bottleCost = Math.max(1, Number(db?.getSystemConfig?.()?.loyaltyBottleCostPoints || 100) || 100);
      const ptsUsed = Number(booking.pointsUsed || bottles * bottleCost);
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
  const sysCfgPts = db.getSystemConfig ? db.getSystemConfig() : null;
  const ptsPer10k = Math.max(1, Number(sysCfgPts?.loyaltyPointsPer10k) || 1);
  const stLower = String(booking.status || '').trim().toLowerCase();
  const isCancelledTicket = (stLower === 'đã hủy' || stLower === 'khách chưa đến' || stLower === 'cancelled');
  const paidForPts = Number(booking.paidAmount ?? booking.depositAmount ?? 0) || 0;
  const explicitPts = booking.pointsEarned !== undefined ? Number(booking.pointsEarned) : (booking.earnedPoints !== undefined ? Number(booking.earnedPoints) : null);
  const earnedPoints = isCancelledTicket
    ? 0
    : (explicitPts !== null && !isNaN(explicitPts) ? Math.max(0, explicitPts) : (paidForPts > 0 ? Math.max(1, Math.floor(paidForPts / 10000) * ptsPer10k) : 0));
  const earnedEl = document.getElementById('ticket-points-earned');
  if (earnedEl) {
    earnedEl.textContent = `Điểm thưởng đơn này: +${earnedPoints.toLocaleString('vi-VN')} điểm`;
  }
  const currentBalance = booking.newPointsBalance !== undefined ? booking.newPointsBalance : (user?.points ?? 0);
  const balanceEl = document.getElementById('ticket-points-balance');
  if (balanceEl) {
    balanceEl.textContent = `${Number(currentBalance || 0).toLocaleString('vi-VN')} điểm`;
  }

  const isCheckedInStatus = (st) => {
    const s = String(st || '').trim().toLowerCase();
    return s === 'đang đá' || s === 'hoàn thành' || s === 'completed';
  };

  const qrBox = document.getElementById('ticket-qr-box');
  const qrMount = document.getElementById('ticket-qr-mount');
  const titleEl = document.getElementById('success-page-title') || document.querySelector('main h1');
  const checkedInSubtitleEl = subtitleEl || document.querySelector('main h1 + p');

  const renderTicketQR = (checkedIn) => {
    if (isUnpaidDeposit) {
      if (qrBox) qrBox.classList.add('hidden');
      if (qrMount) qrMount.innerHTML = '';
      if (subtitleEl) {
        subtitleEl.textContent = 'Đơn chưa thanh toán cọc — vui lòng hoàn tất cọc để nhận vé QR check-in.';
      }
      return;
    }
    if (checkedIn) {
      if (qrBox) qrBox.classList.add('hidden');
      if (qrMount) qrMount.innerHTML = '';

      if (titleEl) titleEl.textContent = 'Đã vào sân!';
      document.title = 'Đã Vào Sân – Vé Điện Tử Sân Bóng Pro';

      const st = String(booking.status || '');
      const isDone = st === 'Hoàn thành' || st.toLowerCase() === 'completed';
      if (checkedInSubtitleEl) {
        checkedInSubtitleEl.textContent = isDone
          ? 'Trận đấu đã hoàn thành. Cảm ơn bạn đã sử dụng dịch vụ tại Sân Bóng Pro!'
          : 'Vé check-in đã được xác nhận thành công. Chúc đội bạn có một trận đấu thật bùng nổ!';
      }

      const statusBadge = document.getElementById('ticket-status-badge');
      if (statusBadge) {
        statusBadge.className = 'px-3 py-1 rounded-full bg-[#DCFCE7] text-[#16A34A] text-xs font-bold';
        statusBadge.textContent = isDone
          ? '✓ Đã Check-in & Hoàn thành'
          : '✓ Đã vào sân (Đang đá)';
      }
      return;
    }

    if (qrBox) qrBox.classList.remove('hidden');
    if (qrMount) {
      qrMount.classList.add('relative');
      qrMount.innerHTML = window.SanBongApp.renderQRCodeSVG(booking.code, 140);
    }
  };

  let alreadyCheckedIn = isCheckedInStatus(booking.status);
  renderTicketQR(alreadyCheckedIn);

  // Tự động kiểm tra trạng thái quét QR check-in mỗi 4 giây (tối đa 15 phút)
  if (!alreadyCheckedIn && booking.code) {
    let pollCount = 0;
    const apiPath = window.SanBongApp?.getRelativePath
      ? window.SanBongApp.getRelativePath(`api/bookings.php?code=${encodeURIComponent(booking.code)}&_t=`)
      : `../api/bookings.php?code=${encodeURIComponent(booking.code)}&_t=`;
    const checkPoll = setInterval(async () => {
      pollCount += 1;
      if (pollCount > 225 || alreadyCheckedIn) {
        clearInterval(checkPoll);
        return;
      }
      try {
        const res = await fetch(apiPath + Date.now(), { credentials: 'same-origin', cache: 'no-store' });
        const json = await res.json().catch(() => null);
        const list = Array.isArray(json?.data) ? json.data : (json?.data ? [json.data] : []);
        const matched = list.find(item => String(item?.code || '').toUpperCase() === String(booking.code).toUpperCase());
        if (matched && isCheckedInStatus(matched.status)) {
          alreadyCheckedIn = true;
          booking.status = matched.status;
          db.updateBookingStatus(booking.code, booking.status, booking.paymentStatus);
          renderTicketQR(true);
          clearInterval(checkPoll);
        }
      } catch (e) {}
    }, 4000);
  }
});
