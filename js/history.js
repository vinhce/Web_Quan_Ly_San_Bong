
let currentFilter = 'all';
let reviewedMap = {};
let pendingFocusBookingCode = (() => {
  try {
    return (new URLSearchParams(window.location.search).get('code') || '').trim().toUpperCase();
  } catch (e) {
    return '';
  }
})();

function focusHistoryBooking(code) {
  const cleanCode = String(code || '').trim().toUpperCase();
  if (!cleanCode) return;
  pendingFocusBookingCode = cleanCode;

  const searchInput = document.getElementById('history-search-input');
  if (searchInput) {
    searchInput.value = cleanCode;
  }

  filterHistory('all');

  setTimeout(() => {
    const card = document.getElementById(`booking-card-${cleanCode}`) || document.querySelector(`[data-booking-code="${cleanCode}"]`);
    if (card) {
      pendingFocusBookingCode = '';
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('ring-2', 'ring-[#16A34A]', 'ring-offset-2', 'bg-[#ECFDF3]/40');
      setTimeout(() => {
        card.classList.remove('ring-2', 'ring-[#16A34A]', 'ring-offset-2', 'bg-[#ECFDF3]/40');
      }, 3000);
    }
  }, 80);
}
window.focusHistoryBooking = focusHistoryBooking;

window.addEventListener('DOMContentLoaded', () => {
  if (pendingFocusBookingCode) {
    setTimeout(() => focusHistoryBooking(pendingFocusBookingCode), 150);
  }
});
window.addEventListener('sb-data-synced', () => {
  if (pendingFocusBookingCode) {
    setTimeout(() => focusHistoryBooking(pendingFocusBookingCode), 100);
  }
});

async function updateHistoryUserInfo() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  let user = db.getUser();
  if (!user && sessionStorage.getItem('sb_current_user')) {
    try {
      user = JSON.parse(sessionStorage.getItem('sb_current_user'));
    } catch (e) {}
  }

  const mName = document.getElementById('member-name');
  const mPhone = document.getElementById('member-phone');
  const mAvatar = document.getElementById('member-avatar');
  const mTier = document.getElementById('member-tier-badge');
  const pLabel = document.getElementById('points-label');
  const pBar = document.getElementById('points-bar');
  const pUpgrade = document.getElementById('points-upgrade-hint');
  const btnLogout = document.getElementById('btn-history-logout');
  const btnLogin = document.getElementById('btn-history-login');

  const rawName = user ? (user.full_name || user.name || user.username) : '';
  const isGuest = (!user || !rawName || user.role === 'guest' || user.is_guest || (!user.phone && !user.email && !user.username && rawName === 'Khách vãng lai'));

  if (isGuest) {
    if (mName) mName.textContent = 'Khách vãng lai';
    if (mPhone) mPhone.textContent = 'Chưa đăng nhập';
    if (mAvatar) mAvatar.textContent = '--';
    if (mTier) {
      mTier.textContent = 'Dành cho Hội viên';
      mTier.className = 'inline-block mt-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold';
    }
    if (pLabel) pLabel.textContent = '0 / 2.000 điểm';
    if (pBar) pBar.style.width = '0%';
    if (pUpgrade) pUpgrade.textContent = 'Đăng nhập tài khoản để tích điểm hội viên';
    if (btnLogout) btnLogout.classList.add('hidden');
    if (btnLogin) btnLogin.classList.remove('hidden');
    const btnEditProfile = document.getElementById('btn-edit-profile');
    if (btnEditProfile) btnEditProfile.classList.add('hidden');
    const btnChangePwd = document.getElementById('btn-change-password');
    if (btnChangePwd) btnChangePwd.classList.add('hidden');
    renderHistory();
    return;
  }

  const btnEditProfile = document.getElementById('btn-edit-profile');
  if (btnEditProfile) btnEditProfile.classList.remove('hidden');
  const btnChangePwd = document.getElementById('btn-change-password');
  if (btnChangePwd) btnChangePwd.classList.remove('hidden');

  const isAdmin = user.role === 'admin';
  const isManager = (user.role === 'manager');
  const isStaff = (user.role === 'staff');

  const displayName = isAdmin ? (user.full_name || 'Quản Trị Viên') : rawName;
  if (mName) mName.textContent = displayName;
  if (mPhone) mPhone.textContent = user.phone || 'Chưa cập nhật SĐT';
  if (mAvatar) {
    mAvatar.textContent = isAdmin ? 'QT' : (isManager ? 'QL' : (isStaff ? 'NV' : (user.avatar || displayName.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase() || 'VIP')));
  }
  if (mTier) {
    mTier.textContent = isAdmin ? 'Chủ sân · Toàn quyền' : (isManager ? 'Quản lý sân' : (isStaff ? 'Nhân viên trực sân' : (user.tier || 'Hội viên')));
    mTier.className = 'inline-block mt-1 px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] text-xs font-bold';
  }
  const pts = Number(user.points) || 0;
  if (pLabel) pLabel.textContent = `${pts.toLocaleString('vi-VN')} / 2.000 điểm`;
  if (pBar) {
    const pct = Math.min(100, Math.max(0, Math.round((pts / 2000) * 100)));
    pBar.style.width = `${pct}%`;
  }
  if (pUpgrade) {
    pUpgrade.textContent = isAdmin ? 'Tài khoản Quản trị Toàn quyền' : `Hạng hiện tại: ${user.tier || 'Hội viên'}`;
  }
  if (btnLogout) btnLogout.classList.remove('hidden');
  if (btnLogin) btnLogin.classList.add('hidden');

  renderHistory();

  const getRel = window.SanBongApp?.getRelativePath || (p => '/' + p.replace(/^\//, ''));
  try {
    const res = await fetch(getRel('api/bookings.php'), { credentials: 'same-origin', cache: 'no-store' });
    if (res.status === 401) {
      if (window.SanBongApp?.handleUnauthorizedSession) {
        window.SanBongApp.handleUnauthorizedSession('history');
      } else {
        try { sessionStorage.removeItem('sb_current_user'); sessionStorage.removeItem('sb_csrf_token'); localStorage.removeItem('sb_current_user'); } catch (e) {}
        window.location.replace(getRel('login?redirect=history&expired=1'));
      }
      return;
    }
    if (res.ok) {
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) {
        localStorage.setItem('sb_bookings_v1', JSON.stringify(json.data));
        renderHistory();
        await syncReviewedMap(db);
        if (pendingFocusBookingCode) {
          focusHistoryBooking(pendingFocusBookingCode);
        }
      }
    }
  } catch (e) {}
}

document.addEventListener('DOMContentLoaded', async () => {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  renderHistoryPolicyBox(db);
  window.addEventListener('sb-data-synced', () => renderHistoryPolicyBox(db));

  // 1. Wait for auth verification first
  if (window.SanBongApp?.authReady) {
    try {
      await window.SanBongApp.authReady;
    } catch (e) {}
  } else if (window.SanBongApp?.syncAuthMe) {
    try {
      await window.SanBongApp.syncAuthMe();
    } catch (e) {}
  }

  // 2. Render user info and bookings with verified auth
  await updateHistoryUserInfo();

  // 3. Listen to auth state events
  window.addEventListener('sb-auth-synced', () => updateHistoryUserInfo());
  window.addEventListener('sb-auth-unauthenticated', () => updateHistoryUserInfo());

  await syncReviewedMap(db);
});

async function syncReviewedMap(db) {
  try {
    const all = db.getAllBookings();
    const codes = [...new Set(all.map(b => b.code).filter(Boolean))].slice(0, 50);
    if (codes.length === 0) return;
    const getRel = window.SanBongApp?.getRelativePath || (p => '/' + p.replace(/^\//, ''));
    const res = await fetch(getRel('api/reviews.php?booking_codes=' + encodeURIComponent(codes.join(','))), { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json?.success && json.data?.reviewed) {
        reviewedMap = json.data.reviewed;
        renderHistory();
      }
    }
  } catch (e) {}
}

function renderHistoryPolicyBox(db) {
  const cfg = db && typeof db.getSystemConfig === 'function'
    ? db.getSystemConfig()
    : { refundFullHours: 24, refundPartialHours: 4 };
  const fullH = Math.max(1, Number(cfg.refundFullHours ?? 24));
  const partH = Math.max(0, Number(cfg.refundPartialHours ?? 4));
  const elFull = document.getElementById('history-policy-full');
  const elPart = document.getElementById('history-policy-partial');
  const elForf = document.getElementById('history-policy-forfeit');
  if (elFull) {
    elFull.innerHTML = `• Hủy trước <b class="text-[#0F172A]">${fullH} giờ</b> trở lên: Hoàn lại <b class="text-[#16A34A]">100% tiền cọc</b> về tài khoản ngân hàng.`;
  }
  if (elPart) {
    elPart.innerHTML = `• Hủy trước từ <b class="text-[#0F172A]">${partH} giờ đến dưới ${fullH} giờ</b>: Hoàn <b class="text-[#D97706]">50% tiền cọc</b> (phạt 50% chi phí giữ chỗ).`;
  }
  if (elForf) {
    elForf.innerHTML = `• Hủy sát giờ dưới <b class="text-[#0F172A]">${partH} giờ</b>: Không hoàn cọc theo quy định đảm bảo chi phí vận hành sân.`;
  }
}

function computeHoursUntilKickoff(booking) {
  if (!booking || !booking.date) return null;
  const datePart = String(booking.date).trim().slice(0, 10);
  let startTimeStr = '00:00';
  if (booking.slotTime && String(booking.slotTime).includes('-')) {
    startTimeStr = String(booking.slotTime).split('-')[0].trim();
  } else if (booking.slotTime) {
    startTimeStr = String(booking.slotTime).trim();
  }
  if (!/^\d{1,2}:\d{2}$/.test(startTimeStr)) return null;
  const [hh, mm] = startTimeStr.split(':').map(n => String(parseInt(n, 10) || 0).padStart(2, '0'));
  const kickoff = new Date(`${datePart}T${hh}:${mm}:00`);
  if (isNaN(kickoff.getTime())) return null;
  return (kickoff.getTime() - Date.now()) / (1000 * 60 * 60);
}

function filterHistory(filter) {
  currentFilter = filter;
  ['all', 'upcoming', 'completed', 'cancelled'].forEach(t => {
    const btn = document.getElementById(`tab-${t}`);
    if (btn) {
      if (t === filter) {
        btn.className = 'flex-1 sm:flex-none px-2.5 sm:px-3.5 py-2 rounded-lg bg-[#16A34A] text-white whitespace-nowrap text-center';
      } else {
        btn.className = 'flex-1 sm:flex-none px-2.5 sm:px-3.5 py-2 rounded-lg text-[#64748B] hover:text-[#0F172A] whitespace-nowrap text-center';
      }
    }
  });
  renderHistory();
}

function renderHistory() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;
  const user = db.getUser();
  const rawName = user ? (user.full_name || user.name || user.username) : '';
  const isGuest = (!user || !rawName || user.role === 'guest' || user.is_guest || (!user.phone && !user.email && !user.username && rawName === 'Khách vãng lai'));

  const all = db.getAllBookings();
  const searchInput = document.getElementById('history-search-input');
  const searchVal = (searchInput ? searchInput.value : '').trim().toLowerCase();
  const cleanSearchPhone = searchVal.replace(/[\s\.\-]+/g, '');

  let userBookings = [];
  if (!isGuest) {
    const userDisplayName = (rawName || '').toLowerCase();
    userBookings = all.filter(b => {
      const matchPhone = user.phone && b.phone && (b.phone === user.phone || String(b.phone).replace(/\D+/g, '') === String(user.phone).replace(/\D+/g, ''));
      const matchName = userDisplayName && b.customerName && b.customerName.toLowerCase() === userDisplayName;
      const matchUserId = user.id && (b.userId || b.user_id) && String(b.userId || b.user_id) === String(user.id);
      return matchPhone || matchName || matchUserId;
    });
    if (userBookings.length === 0 && all.length > 0 && (user.role === 'admin' || user.role === 'manager')) {
      userBookings = all;
    }
    if (searchVal) {
      userBookings = userBookings.filter(b => {
        const code = (b.code || '').toLowerCase();
        const phone = (b.phone || '').replace(/[\s\.\-]+/g, '');
        const name = (b.customerName || '').toLowerCase();
        return code.includes(searchVal) || (cleanSearchPhone.length >= 3 && phone.includes(cleanSearchPhone)) || name.includes(searchVal);
      });
    }
  } else {
    if (searchVal && (cleanSearchPhone.length >= 9 || searchVal.length >= 6)) {
      userBookings = all.filter(b => {
        const code = (b.code || '').toLowerCase();
        const phone = (b.phone || '').replace(/[\s\.\-]+/g, '');
        return (code === searchVal || (cleanSearchPhone.length >= 9 && phone.endsWith(cleanSearchPhone.slice(-9))));
      });
    }
  }

  const totBadge = document.getElementById('total-badge');
  if (totBadge) totBadge.textContent = (isGuest && !searchVal) ? '0' : userBookings.length;

  let list = userBookings.filter(b => {
    const stLower = String(b.status || '').trim().toLowerCase();
    if (currentFilter === 'all') return true;
    if (currentFilter === 'upcoming') {
      return b.status === 'Đã xác nhận'
        || b.status === 'Chờ thanh toán'
        || b.status === 'Đang đá'
        || b.status === 'Chờ duyệt cọc'
        || b.status === 'Giữ chỗ'
        || b.status === 'Đã đá - chưa tất toán';
    }
    if (currentFilter === 'completed') return b.status === 'Hoàn thành' || stLower === 'completed';
    if (currentFilter === 'cancelled') return b.status === 'Đã hủy';
    return true;
  });

  const container = document.getElementById('history-container');
  const empty = document.getElementById('no-history-state');
  const guestState = document.getElementById('guest-state');
  if (!container) return;

  if (isGuest && !searchVal) {
    container.innerHTML = '';
    if (empty) empty.classList.add('hidden');
    if (guestState) guestState.classList.remove('hidden');
    return;
  }

  if (guestState) guestState.classList.add('hidden');

  if (list.length === 0) {
    container.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  } else {
    if (empty) empty.classList.add('hidden');
  }

  const esc = (s) => (window.SanBongApp?.escapeHTML ? window.SanBongApp.escapeHTML(s) : String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])));

  container.innerHTML = list.map(b => {
    const stLower = String(b.status || '').trim().toLowerCase();
    const isConfirmed = b.status === 'Đã xác nhận' || b.status === 'Chờ duyệt cọc' || b.status === 'Giữ chỗ';
    const isCompleted = b.status === 'Hoàn thành' || stLower === 'completed';
    const safeCode = esc(b.code);
    const safePitch = esc(b.pitchName || b.pitchId);
    const revInfo = reviewedMap[b.code];
    const monthlyTag = (b.weeksCount && b.weeksCount > 1)
      ? `<span class="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">📅 Gói ${Number(b.weeksCount)} tuần</span>`
      : '';
    const overtimeTag = (b.overtimeMinutes && b.overtimeMinutes > 0)
      ? `<span class="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">⏱️ +${Number(b.overtimeMinutes)}p thêm giờ</span>`
      : '';

    const reviewBtnHtml = revInfo
      ? `<span class="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">✓ Đã đánh giá (★ ${Number(revInfo.rating || 5)})</span>`
      : (isCompleted
        ? `<button type="button" data-action="review" data-code="${safeCode}" data-pitch="${safePitch}" class="btn-base bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 text-xs font-bold">⭐ Đánh giá sân</button>`
        : '');

    const isDuplicatePayBadge = Boolean(b.paymentStatus && b.status && String(b.paymentStatus).trim() === String(b.status).trim());
    const payStr = String(b.paymentStatus || '');
    const hasPaidRecorded = typeof b.paidAmount === 'number';
    const paidDisplayAmt = hasPaidRecorded
      ? Math.max(0, b.paidAmount)
      : ((b.status === 'Đã hủy' || b.status === 'Giữ chỗ' || payStr === 'Chờ duyệt cọc' || payStr === 'Chưa thanh toán') ? 0 : Number(b.depositAmount || 0));
    const isUnpaidHold = paidDisplayAmt <= 0 && b.status !== 'Đã hủy' && b.status !== 'Khách chưa đến';
    const paySummaryHtml = isUnpaidHold
      ? `(Chưa thanh toán cọc: <span class="text-[#D97706] font-bold">${window.SanBongApp.formatVND(b.depositAmount)}</span> · Cần thanh toán: <b class="text-[#DC2626]">${window.SanBongApp.formatVND(b.totalPrice)}</b>)`
      : `(Đã thu: <span class="text-[#16A34A] font-bold">${window.SanBongApp.formatVND(paidDisplayAmt)}</span> · Còn lại: <b class="${b.remainingAmount > 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'}">${window.SanBongApp.formatVND(b.remainingAmount)}</b>)`;

    return `
      <div id="booking-card-${safeCode}" data-booking-code="${safeCode}" class="ui-card p-5 space-y-4 hover:shadow-md transition-all">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E2E8F0] gap-2">
          <div class="flex flex-wrap items-center gap-2.5">
            <span class="font-mono font-bold text-sm px-2.5 py-0.5 rounded bg-slate-100 text-[#0F172A]">${safeCode}</span>
            ${window.SanBongApp.statusPill(b.status)}
            ${(b.paymentStatus && !isDuplicatePayBadge) ? `<span class="text-xs px-2.5 py-0.5 rounded-full ${isUnpaidHold ? 'bg-[#FEF3C7] text-[#B45309]' : 'bg-[#DCFCE7] text-[#16A34A]'} font-bold">${esc(b.paymentStatus)}</span>` : ''}
            ${monthlyTag}
            ${overtimeTag}
          </div>
          <div class="text-xs text-[#64748B]">Tạo lúc: ${esc(b.createdAt || 'Hôm nay')}</div>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 class="font-heading font-extrabold text-lg text-[#0F172A]">${safePitch}</h3>
            <div class="text-sm font-semibold text-[#16A34A] mt-0.5">
              ${esc(window.SanBongApp.formatDateVN(b.date))} · ${esc(b.slotTime)}
            </div>
            <div class="text-xs text-[#64748B] mt-1">
              Tổng tiền: <b class="text-[#0F172A]">${window.SanBongApp.formatVND(b.totalPrice)}</b>
              ${paySummaryHtml}
            </div>
            ${b.note ? `<div class="text-[11px] text-slate-500 mt-1 italic">${esc(b.note)}</div>` : ''}
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <button type="button" data-action="view-qr" data-code="${safeCode}" class="btn-base btn-secondary text-xs font-bold">
              📷 Xem vé QR & Hóa đơn
            </button>
            ${reviewBtnHtml}
            ${isConfirmed ? `
              <button type="button" data-action="cancel-booking" data-code="${safeCode}" class="btn-base btn-danger-outline text-xs font-bold">
                ${isUnpaidHold ? '🛑 Hủy giữ chỗ' : '🛑 Hủy trước hạn & Hoàn cọc'}
              </button>
            ` : ''}
            ${isCompleted ? `
              <a href="/booking?pitchId=${encodeURIComponent(b.pitchId)}" class="btn-base btn-primary text-xs font-bold">
                Đặt lại ca này
              </a>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function viewQRCode(bookingCode) {
  const db = window.SanBongApp.SanBongDB;
  const b = db.getAllBookings().find(item => item.code === bookingCode);
  if (!b) return;

  const mCode = document.getElementById('modal-code');
  if (mCode) mCode.textContent = b.code;
  const mPitch = document.getElementById('modal-pitch');
  if (mPitch) mPitch.textContent = b.pitchName;
  const mTime = document.getElementById('modal-time');
  const esc = window.SanBongApp?.escapeHTML || (s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])));
  if (mTime) {
    const rem = window.SanBongApp.formatVND(b.remainingAmount || 0);
    mTime.innerHTML = `${esc(window.SanBongApp.formatDateVN(b.date))} · ${esc(b.slotTime)}<br><span class="text-[11px] font-bold text-[#0F172A]">Tổng: ${window.SanBongApp.formatVND(b.totalPrice)} · Đã cọc: ${window.SanBongApp.formatVND(b.depositAmount)} · Còn lại: <span class="text-[#DC2626]">${rem}</span></span>`;
  }

  const qrMount = document.getElementById('modal-qr-mount');
  if (qrMount) {
    qrMount.classList.add('relative');
    const stLower = String(b.status || '').trim().toLowerCase();
    const isCheckedIn = stLower === 'đang đá' || stLower === 'hoàn thành' || stLower === 'completed';
    const checkBadgeHtml = isCheckedIn
      ? `<span title="Đã quét QR Check-in" aria-label="Đã quét QR Check-in" class="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-[#16A34A] text-white ring-2 ring-white shadow-md flex items-center justify-center">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
         </span>`
      : '';
    qrMount.innerHTML = window.SanBongApp.renderQRCodeSVG(b.code, 150) + checkBadgeHtml;
  }

  const modal = document.getElementById('ticket-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeTicketModal() {
  const modal = document.getElementById('ticket-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function cancelBooking(bookingCode) {
  const db = window.SanBongApp?.SanBongDB;
  const booking = db ? db.getAllBookings().find(item => item.code === bookingCode) : null;
  const sysCfg = (db && typeof db.getSystemConfig === 'function')
    ? db.getSystemConfig()
    : { refundFullHours: 24, refundPartialHours: 4 };
  const fullHours = Math.max(1, Number(sysCfg.refundFullHours ?? 24));
  const partialHours = Math.max(0, Number(sysCfg.refundPartialHours ?? 4));

  const hoursLeft = computeHoursUntilKickoff(booking);
  let expectedPolicy = 'refund_100';
  let expectedPayStatus = 'Đã hoàn cọc 100%';
  let policyDesc = `Hoàn 100% tiền cọc (báo trước ≥ ${fullHours} giờ)`;
  let timeDesc = 'Chưa xác định giờ đá';

  if (hoursLeft !== null) {
    if (hoursLeft >= fullHours) {
      expectedPolicy = 'refund_100';
      expectedPayStatus = 'Đã hoàn cọc 100%';
      policyDesc = `Hoàn 100% tiền cọc (báo trước ≥ ${fullHours} giờ)`;
    } else if (hoursLeft >= partialHours) {
      expectedPolicy = 'forfeit_50';
      expectedPayStatus = 'Phạt 50% cọc';
      policyDesc = `Phạt 50% tiền cọc / Hoàn 50% (hủy trước ${partialHours}–${fullHours} giờ)`;
    } else {
      expectedPolicy = 'noshow_forfeit';
      expectedPayStatus = 'Tịch thu cọc 30%';
      policyDesc = `Không hoàn cọc / Tịch thu cọc (hủy sát giờ dưới ${partialHours} giờ)`;
    }
    timeDesc = hoursLeft >= 0
      ? `Còn khoảng ${hoursLeft.toFixed(1)} giờ nữa đến giờ đá`
      : `Đã qua giờ bắt đầu ca (${Math.abs(Math.round(hoursLeft * 60))} phút)`;
  }

  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  const doCancel = async () => {
    let serverHandled = false;
    let finalPayStatus = expectedPayStatus;
    let finalStatus = 'Đã hủy';
    let serverMessage = '';
    let refundAmount = null;

    try {
      if (window.SanBongApp?.ensureCsrfToken) {
        await window.SanBongApp.ensureCsrfToken('../');
      }
      const headers = window.SanBongApp?.getAuthFetchHeaders
        ? window.SanBongApp.getAuthFetchHeaders()
        : { 'Content-Type': 'application/json' };
      const cancelBaseUrl = window.SanBongApp?.getRelativePath
        ? window.SanBongApp.getRelativePath('api/bookings.php')
        : '../api/bookings.php';
      const res = await fetch(`${cancelBaseUrl}?action=early_cancel`, {
        method: 'POST',
        headers,
        credentials: 'same-origin',
        body: JSON.stringify({
          code: bookingCode,
          policy: expectedPolicy,
          reason: 'Khách hàng chủ động hủy lịch trước thời hạn'
        })
      });
      const tokenHeader = res.headers ? res.headers.get('X-CSRF-Token') : null;
      if (tokenHeader && window.SanBongApp?.setCsrfToken) {
        window.SanBongApp.setCsrfToken(tokenHeader);
      }
      const json = await res.json().catch(() => null);
      if (json?.csrf_token && window.SanBongApp?.setCsrfToken) {
        window.SanBongApp.setCsrfToken(json.csrf_token);
      }
      if (res.ok && json && json.success) {
        serverHandled = true;
        const d = json.data || {};
        finalStatus = d.status || 'Đã hủy';
        finalPayStatus = d.paymentStatus || d.payment_status || expectedPayStatus;
        refundAmount = d.refundAmount ?? d.refund_amount ?? null;
        serverMessage = json.message || '';
      } else if (res.status === 401) {
        if (window.SanBongApp?.handleUnauthorizedSession) {
          window.SanBongApp.handleUnauthorizedSession('history');
        } else {
          try { sessionStorage.removeItem('sb_current_user'); sessionStorage.removeItem('sb_csrf_token'); localStorage.removeItem('sb_current_user'); } catch (e) {}
          window.location.replace(getRel('login?redirect=history&expired=1'));
        }
        return;
      } else if (!res.ok || !json || !json.success) {
        if (window.SanBongApp?.showToast) {
          window.SanBongApp.showToast((json && json.message) || 'Không thể hủy lịch lúc này. Vui lòng thử lại.', 'error', 4500);
        }
        return;
      }
    } catch (e) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast('Lỗi kết nối tới máy chủ. Không thể hủy lịch.', 'error', 4500);
      }
      return;
    }

    if (!serverHandled) return;

    if (db) {
      const all = db.getAllBookings();
      const target = all.find(b => b.code === bookingCode);
      if (target) {
        target.status = finalStatus;
        target.paymentStatus = finalPayStatus;
        target.remainingAmount = 0;
        target.note = (target.note ? target.note + ' | ' : '') + `[Hủy trước hạn - ${finalPayStatus}]`;
        try { localStorage.setItem('sb_bookings_v1', JSON.stringify(all)); } catch (err) {}
      }
    }

    if (window.SanBongApp?.showToast) {
      let toastMsg = serverMessage || `✓ Đã hủy đơn ${bookingCode} (${finalPayStatus}) và nhả sân trống.`;
      if (serverHandled && refundAmount !== null && refundAmount !== undefined && !toastMsg.includes('đ')) {
        toastMsg += ` Số tiền hoàn: ${fmt(refundAmount)}.`;
      }
      window.SanBongApp.showToast(toastMsg, expectedPolicy === 'refund_100' ? 'success' : 'warning', 4500);
    }
    renderHistory();
  };

  if (window.SanBongApp?.showModal) {
    window.SanBongApp.showModal({
      title: '🛑 Xác nhận hủy lịch đặt sân',
      message: `Bạn có chắc chắn muốn hủy đơn đặt sân ${bookingCode}?\n\n• Thời gian: ${timeDesc}\n• Chính sách dự kiến: ${policyDesc}\n• Sân sẽ được giải phóng ngay lập tức cho đội khác.`,
      type: 'warning',
      confirmText: 'Xác nhận hủy lịch',
      cancelText: 'Giữ lịch đá',
      onConfirm: doCancel
    });
  } else {
    if (confirm(`Bạn có chắc chắn muốn hủy đơn đặt sân ${bookingCode}?\n• ${timeDesc}\n• Chính sách dự kiến: ${policyDesc}`)) doCancel();
  }
}

window.openReviewModal = function(bookingCode, pitchName) {
  let existing = document.getElementById('customer-review-modal');
  if (existing) existing.remove();

  const esc = (s) => (window.SanBongApp?.escapeHTML ? window.SanBongApp.escapeHTML(s) : String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])));
  const overlay = document.createElement('div');
  overlay.id = 'customer-review-modal';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'customer-review-modal-title');
  overlay.className = 'fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4';
  overlay.innerHTML = `
    <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 p-6 space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 id="customer-review-modal-title" class="font-heading font-bold text-lg text-[#0F172A]">Đánh Giá Chất Lượng Sân</h3>
          <div class="text-xs text-[#64748B] mt-0.5">${esc(pitchName)} (Mã vé: ${esc(bookingCode)})</div>
        </div>
        <button id="close-review-modal-btn" class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500">✕</button>
      </div>
      <div class="space-y-3">
        <div>
          <label class="block text-xs font-bold text-[#475569] mb-2">Chọn số sao hài lòng:</label>
          <div id="star-selector" class="flex items-center gap-2 text-3xl cursor-pointer select-none">
            <span data-star="1" class="text-[#F59E0B]">★</span>
            <span data-star="2" class="text-[#F59E0B]">★</span>
            <span data-star="3" class="text-[#F59E0B]">★</span>
            <span data-star="4" class="text-[#F59E0B]">★</span>
            <span data-star="5" class="text-[#F59E0B]">★</span>
          </div>
          <input type="hidden" id="review-rating-val" value="5">
        </div>
        <div>
          <label class="block text-xs font-bold text-[#475569] mb-1">Nhận xét chi tiết về mặt cỏ, đèn, dịch vụ:</label>
          <textarea id="review-comment-input" rows="3" placeholder="VD: Mặt cỏ êm, đèn sáng rõ, nhân viên nhiệt tình..." class="w-full p-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#16A34A]"></textarea>
        </div>
      </div>
      <div class="pt-2 flex justify-end gap-2">
        <button id="cancel-review-modal-btn" class="px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50">Đóng</button>
        <button id="submit-review-modal-btn" class="btn-base btn-primary px-5 py-2 text-xs font-bold shadow">Gửi Đánh Giá</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const stars = overlay.querySelectorAll('#star-selector span');
  const ratingInput = overlay.querySelector('#review-rating-val');

  stars.forEach(s => {
    s.addEventListener('click', () => {
      const val = parseInt(s.dataset.star, 10);
      ratingInput.value = val;
      stars.forEach(st => {
        const stVal = parseInt(st.dataset.star, 10);
        st.className = stVal <= val ? 'text-[#F59E0B]' : 'text-slate-300';
      });
    });
  });

  const closeFn = () => overlay.remove();
  overlay.querySelector('#close-review-modal-btn').addEventListener('click', closeFn);
  overlay.querySelector('#cancel-review-modal-btn').addEventListener('click', closeFn);

  const submitBtn = overlay.querySelector('#submit-review-modal-btn');
  submitBtn.addEventListener('click', async () => {
    const rating = parseInt(ratingInput.value, 10) || 5;
    const comment = overlay.querySelector('#review-comment-input').value.trim();
    const getRel = window.SanBongApp?.getRelativePath || (p => '/' + p.replace(/^\//, ''));
    const headers = window.SanBongApp?.getAuthFetchHeaders
      ? window.SanBongApp.getAuthFetchHeaders()
      : { 'Content-Type': 'application/json' };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang gửi...';
    try {
      if (window.SanBongApp?.ensureCsrfToken) {
        await window.SanBongApp.ensureCsrfToken();
      }
      const postHeaders = window.SanBongApp?.getAuthFetchHeaders
        ? window.SanBongApp.getAuthFetchHeaders()
        : { 'Content-Type': 'application/json' };

      const res = await fetch(getRel('api/reviews.php'), {
        method: 'POST',
        headers: postHeaders,
        credentials: 'same-origin',
        body: JSON.stringify({
          action: 'submit_review',
          booking_code: bookingCode,
          rating: rating,
          comment: comment
        })
      });
      if (res.status === 401) {
        closeFn();
        if (window.SanBongApp?.handleUnauthorizedSession) {
          window.SanBongApp.handleUnauthorizedSession('history');
        } else {
          try { sessionStorage.removeItem('sb_current_user'); sessionStorage.removeItem('sb_csrf_token'); localStorage.removeItem('sb_current_user'); } catch (e) {}
          window.location.replace(getRel('login?redirect=history&expired=1'));
        }
        return;
      }
      const tokenHeader = res.headers ? res.headers.get('X-CSRF-Token') : null;
      if (tokenHeader && window.SanBongApp?.setCsrfToken) {
        window.SanBongApp.setCsrfToken(tokenHeader);
      }
      const json = await res.json();
      if (json?.csrf_token && window.SanBongApp?.setCsrfToken) {
        window.SanBongApp.setCsrfToken(json.csrf_token);
      }
      if (json.success) {
        reviewedMap[bookingCode] = { rating, comment };
        renderHistory();
        if (window.SanBongApp?.showToast) {
          window.SanBongApp.showToast(json.message, 'success');
        }
        closeFn();
      } else {
        if (window.SanBongApp?.showToast) {
          window.SanBongApp.showToast(json.message || 'Không thể gửi đánh giá.', 'error');
        }
      }
    } catch (err) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast('Lỗi kết nối máy chủ.', 'error');
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Gửi Đánh Giá';
    }
  });
};

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.getAttribute('data-action');
  if (action === 'view-qr') {
    viewQRCode(btn.getAttribute('data-code'));
  } else if (action === 'review') {
    openReviewModal(btn.getAttribute('data-code'), btn.getAttribute('data-pitch'));
  } else if (action === 'cancel-booking') {
    cancelBooking(btn.getAttribute('data-code'));
  }
});

let _origProfilePhone = '';

function openEditProfileModal() {
  const db = window.SanBongApp?.SanBongDB;
  const user = db ? db.getUser() : null;
  if (!user) return;

  const modal = document.getElementById('modal-edit-profile');
  const nameInput = document.getElementById('edit-profile-name');
  const phoneInput = document.getElementById('edit-profile-phone');
  const pwdWrap = document.getElementById('edit-profile-pwd-wrap');
  const pwdInput = document.getElementById('edit-profile-pwd');
  const generalMsg = document.getElementById('edit-profile-general-msg');

  if (nameInput) nameInput.value = user.full_name || user.name || '';
  if (phoneInput) {
    phoneInput.value = user.phone || '';
    _origProfilePhone = (user.phone || '').trim();
  }
  if (pwdInput) pwdInput.value = '';
  if (pwdWrap) pwdWrap.classList.add('hidden');
  if (generalMsg) {
    generalMsg.textContent = '';
    generalMsg.classList.add('hidden');
  }

  ['edit-profile-name-err', 'edit-profile-phone-err', 'edit-profile-pwd-err'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.classList.add('hidden'); }
  });

  if (phoneInput && !phoneInput._pwdCheckBound) {
    phoneInput._pwdCheckBound = true;
    phoneInput.addEventListener('input', () => {
      const curPh = phoneInput.value.trim();
      if (curPh !== _origProfilePhone && _origProfilePhone !== '') {
        pwdWrap?.classList.remove('hidden');
      } else {
        pwdWrap?.classList.add('hidden');
      }
    });
  }

  modal?.classList.remove('hidden');
}

function closeEditProfileModal() {
  const modal = document.getElementById('modal-edit-profile');
  modal?.classList.add('hidden');
}

async function handleSaveProfile(e) {
  e.preventDefault();
  const nameInput = document.getElementById('edit-profile-name');
  const phoneInput = document.getElementById('edit-profile-phone');
  const pwdInput = document.getElementById('edit-profile-pwd');
  const submitBtn = document.getElementById('btn-submit-edit-profile');
  const nameErr = document.getElementById('edit-profile-name-err');
  const phoneErr = document.getElementById('edit-profile-phone-err');
  const pwdErr = document.getElementById('edit-profile-pwd-err');
  const generalMsg = document.getElementById('edit-profile-general-msg');

  [nameErr, phoneErr, pwdErr, generalMsg].forEach(el => {
    if (el) { el.textContent = ''; el.classList.add('hidden'); }
  });

  const fullName = nameInput?.value.trim() || '';
  const phone = phoneInput?.value.trim() || '';
  const password = pwdInput?.value || '';

  if (fullName.length < 2 || fullName.length > 60) {
    if (nameErr) { nameErr.textContent = 'Họ và tên phải từ 2 đến 60 ký tự.'; nameErr.classList.remove('hidden'); }
    nameInput?.focus();
    return;
  }

  const phoneChanged = (phone !== _origProfilePhone && _origProfilePhone !== '');
  if (!/^0\d{9}$/.test(phone)) {
    if (phoneErr) { phoneErr.textContent = 'Số điện thoại không hợp lệ (cần đúng 10 chữ số).'; phoneErr.classList.remove('hidden'); }
    phoneInput?.focus();
    return;
  }

  if (phoneChanged && !password) {
    if (pwdErr) { pwdErr.textContent = 'Vui lòng nhập mật khẩu tài khoản hiện tại để xác nhận đổi SĐT.'; pwdErr.classList.remove('hidden'); }
    pwdInput?.focus();
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Đang lưu...';

  try {
    const csrfToken = window.SanBongApp?.getCsrfToken ? window.SanBongApp.getCsrfToken() : (sessionStorage.getItem('sb_csrf_token') || '');
    const updateUrl = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath('api/auth.php?action=update_profile') : '/api/auth.php?action=update_profile';
    const res = await fetch(updateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        full_name: fullName,
        phone: phone,
        password: password
      })
    });

    const tokenHeader = res.headers ? res.headers.get('X-CSRF-Token') : null;
    if (tokenHeader && window.SanBongApp?.setCsrfToken) {
      window.SanBongApp.setCsrfToken(tokenHeader);
    }

    const data = await res.json();
    if (data?.csrf_token && window.SanBongApp?.setCsrfToken) {
      window.SanBongApp.setCsrfToken(data.csrf_token);
    }

    if (data.success) {
      const db = window.SanBongApp?.SanBongDB;
      if (db?.updateUser) {
        db.updateUser({ full_name: fullName, name: fullName, phone: phone });
      } else {
        try {
          const u = JSON.parse(sessionStorage.getItem('sb_current_user') || '{}');
          u.full_name = fullName;
          u.name = fullName;
          u.phone = phone;
          sessionStorage.setItem('sb_current_user', JSON.stringify(u));
        } catch (err) {}
      }
      closeEditProfileModal();
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(data.message || 'Cập nhật hồ sơ thành công!', 'success');
      }
      updateHistoryUserInfo();
    } else {
      if (generalMsg) {
        generalMsg.textContent = data.message || 'Không thể cập nhật hồ sơ.';
        generalMsg.className = 'text-xs font-semibold text-rose-600 block';
      }
    }
  } catch (err) {
    if (generalMsg) {
      generalMsg.textContent = 'Lỗi kết nối tới máy chủ. Vui lòng thử lại sau.';
      generalMsg.className = 'text-xs font-semibold text-rose-600 block';
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Lưu thay đổi';
  }
}

window.openEditProfileModal = openEditProfileModal;
window.closeEditProfileModal = closeEditProfileModal;
window.handleSaveProfile = handleSaveProfile;

function openChangePasswordModal() {
  const modal = document.getElementById('modal-change-password');
  ['change-pwd-old', 'change-pwd-new', 'change-pwd-confirm'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['change-pwd-old-err', 'change-pwd-new-err', 'change-pwd-confirm-err', 'change-pwd-general-msg'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.classList.add('hidden'); }
  });
  modal?.classList.remove('hidden');
  setTimeout(() => document.getElementById('change-pwd-old')?.focus(), 50);
}

function closeChangePasswordModal() {
  document.getElementById('modal-change-password')?.classList.add('hidden');
}

async function handleChangePassword(e) {
  e.preventDefault();
  const oldInput = document.getElementById('change-pwd-old');
  const newInput = document.getElementById('change-pwd-new');
  const confirmInput = document.getElementById('change-pwd-confirm');
  const submitBtn = document.getElementById('btn-submit-change-pwd');
  const oldErr = document.getElementById('change-pwd-old-err');
  const newErr = document.getElementById('change-pwd-new-err');
  const confirmErr = document.getElementById('change-pwd-confirm-err');
  const generalMsg = document.getElementById('change-pwd-general-msg');

  [oldErr, newErr, confirmErr, generalMsg].forEach(el => {
    if (el) { el.textContent = ''; el.classList.add('hidden'); }
  });

  const oldPassword = oldInput?.value || '';
  const newPassword = newInput?.value || '';
  const confirmPassword = confirmInput?.value || '';

  if (!oldPassword) {
    if (oldErr) { oldErr.textContent = 'Vui lòng nhập mật khẩu hiện tại.'; oldErr.classList.remove('hidden'); }
    oldInput?.focus();
    return;
  }
  if (newPassword.length < 8) {
    if (newErr) { newErr.textContent = 'Mật khẩu mới phải có tối thiểu 8 ký tự.'; newErr.classList.remove('hidden'); }
    newInput?.focus();
    return;
  }
  if (newPassword !== confirmPassword) {
    if (confirmErr) { confirmErr.textContent = 'Mật khẩu nhập lại không khớp.'; confirmErr.classList.remove('hidden'); }
    confirmInput?.focus();
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang cập nhật...';
  }
  try {
    if (window.SanBongApp?.ensureCsrfToken) {
      await window.SanBongApp.ensureCsrfToken();
    }
    const headers = window.SanBongApp?.getAuthFetchHeaders
      ? window.SanBongApp.getAuthFetchHeaders()
      : { 'Content-Type': 'application/json' };
    const getRel = window.SanBongApp?.getRelativePath || (p => '/' + p.replace(/^\//, ''));
    const res = await fetch(getRel('api/auth.php?action=change_password'), {
      method: 'POST',
      headers,
      credentials: 'same-origin',
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword
      })
    });
    const tokenHeader = res.headers ? res.headers.get('X-CSRF-Token') : null;
    if (tokenHeader && window.SanBongApp?.setCsrfToken) window.SanBongApp.setCsrfToken(tokenHeader);
    if (res.status === 401) {
      closeChangePasswordModal();
      if (window.SanBongApp?.handleUnauthorizedSession) {
        window.SanBongApp.handleUnauthorizedSession('history');
      } else {
        window.location.replace(getRel('login?redirect=history&expired=1'));
      }
      return;
    }
    const json = await res.json().catch(() => null);
    if (json?.csrf_token && window.SanBongApp?.setCsrfToken) window.SanBongApp.setCsrfToken(json.csrf_token);
    if (res.ok && json?.success) {
      closeChangePasswordModal();
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(json.message || 'Đổi mật khẩu thành công!', 'success');
      }
    } else if (generalMsg) {
      generalMsg.textContent = json?.message || 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại.';
      generalMsg.className = 'text-xs font-semibold text-rose-600 block';
    }
  } catch (err) {
    if (generalMsg) {
      generalMsg.textContent = 'Lỗi kết nối tới máy chủ. Vui lòng thử lại sau.';
      generalMsg.className = 'text-xs font-semibold text-rose-600 block';
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Cập nhật mật khẩu';
    }
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeTicketModal();
    closeEditProfileModal();
    closeChangePasswordModal();
    document.getElementById('customer-review-modal')?.remove();
  }
});

window.openChangePasswordModal = openChangePasswordModal;
window.closeChangePasswordModal = closeChangePasswordModal;
window.handleChangePassword = handleChangePassword;
