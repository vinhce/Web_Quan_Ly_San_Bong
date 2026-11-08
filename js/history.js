/**
 * SÂN BÓNG PRO - LỊCH SỬ ĐẶT SÂN (history.js)
 */

let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const user = db.getUser();
  const mName = document.getElementById('member-name');
  const mPhone = document.getElementById('member-phone');
  const mAvatar = document.getElementById('member-avatar');
  const mTier = document.getElementById('member-tier-badge');
  const pLabel = document.getElementById('points-label');

  if (!user || !user.name) {
    // Khách vãng lai chưa đăng nhập
    if (mName) mName.textContent = 'Khách vãng lai';
    if (mPhone) {
      const loginUrl = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath('login?redirect=history') : '/login?redirect=history';
      mPhone.innerHTML = '<a href="' + loginUrl + '" class="text-xs font-bold text-[#16A34A] hover:underline">👉 Đăng nhập để xem lịch sử & tích điểm</a>';
    }
    if (mAvatar) mAvatar.textContent = '👤';
    if (mTier) {
      mTier.textContent = 'Chưa đăng nhập';
      mTier.className = 'inline-block mt-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold';
    }
    if (pLabel) pLabel.textContent = '0 / 2.000 điểm';
  } else {
    if (mName) mName.textContent = user.name;
    if (mPhone) mPhone.textContent = user.phone || 'Chưa cập nhật SĐT';
    if (mAvatar) mAvatar.textContent = user.avatar || 'VIP';
    if (mTier) {
      mTier.textContent = user.tier || 'Hội viên';
      mTier.className = 'inline-block mt-1 px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] text-xs font-bold';
    }
    if (pLabel) pLabel.textContent = `${user.points || 0} / 2.000 điểm`;
  }

  renderHistory();
});

function filterHistory(filter) {
  currentFilter = filter;
  ['all', 'upcoming', 'completed', 'cancelled'].forEach(t => {
    const btn = document.getElementById(`tab-${t}`);
    if (btn) {
      if (t === filter) {
        btn.className = 'px-3.5 py-2 rounded-lg bg-[#16A34A] text-white';
      } else {
        btn.className = 'px-3.5 py-2 rounded-lg text-[#64748B] hover:text-[#0F172A]';
      }
    }
  });
  renderHistory();
}

function renderHistory() {
  const db = window.SanBongApp.SanBongDB;
  const user = db.getUser();
  const all = db.getAllBookings();

  // Chỉ hiển thị đơn của người dùng đăng nhập; khách vãng lai chỉ thấy đơn vừa đặt
  let userBookings = [];
  if (user && user.phone) {
    userBookings = all.filter(b => b.phone === user.phone || b.customerName === user.name);
  } else {
    const rawLatest = sessionStorage.getItem('sb_latest_booking');
    if (rawLatest) {
      try {
        const lb = JSON.parse(rawLatest);
        if (lb && lb.code) userBookings = [lb];
      } catch (e) {}
    }
  }

  const totBadge = document.getElementById('total-badge');
  if (totBadge) totBadge.textContent = userBookings.length;

  let list = userBookings.filter(b => {
    if (currentFilter === 'all') return true;
    if (currentFilter === 'upcoming') return b.status === 'Đã xác nhận' || b.status === 'Chờ thanh toán' || b.status === 'Đang đá';
    if (currentFilter === 'completed') return b.status === 'Hoàn thành';
    if (currentFilter === 'cancelled') return b.status === 'Đã hủy';
    return true;
  });

  const container = document.getElementById('history-container');
  const empty = document.getElementById('no-history-state');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  } else {
    if (empty) empty.classList.add('hidden');
  }

  container.innerHTML = list.map(b => {
    const isConfirmed = b.status === 'Đã xác nhận';
    const isCompleted = b.status === 'Hoàn thành';

    return `
      <div class="ui-card p-5 space-y-4 hover:shadow-md transition-shadow">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E2E8F0] gap-2">
          <div class="flex items-center gap-3">
            <span class="font-mono font-bold text-sm text-[#0F172A]">${b.code}</span>
            ${window.SanBongApp.statusPill(b.status)}
            ${b.paymentStatus ? `<span class="text-xs px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#16A34A] font-bold">${b.paymentStatus}</span>` : ''}
          </div>
          <div class="text-xs text-[#64748B]">Tạo lúc: ${b.createdAt || 'Hôm nay'}</div>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 class="font-heading font-extrabold text-lg text-[#0F172A]">${b.pitchName}</h3>
            <div class="text-sm font-semibold text-[#16A34A] mt-0.5">
              ${window.SanBongApp.formatDateVN(b.date)} · ${b.slotTime}
            </div>
            <div class="text-xs text-[#64748B] mt-1">
              Tổng tiền: <b class="text-[#0F172A]">${window.SanBongApp.formatVND(b.totalPrice)}</b>
              (Đã cọc: <span class="text-[#16A34A] font-bold">${window.SanBongApp.formatVND(b.depositAmount)}</span> · Còn lại: ${window.SanBongApp.formatVND(b.remainingAmount)})
            </div>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <button onclick="viewQRCode('${b.code}')" class="btn-base btn-secondary text-xs">
              Xem vé QR
            </button>
            ${isConfirmed ? `
              <button onclick="cancelBooking('${b.code}')" class="btn-base btn-danger-outline text-xs">
                Hủy sân & Hoàn cọc
              </button>
            ` : ''}
            ${isCompleted ? `
              <a href="/booking?pitchId=${b.pitchId}" class="btn-base btn-primary text-xs">
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
  if (mTime) mTime.textContent = `${window.SanBongApp.formatDateVN(b.date)} · ${b.slotTime}`;

  const qrMount = document.getElementById('modal-qr-mount');
  if (qrMount) {
    qrMount.innerHTML = window.SanBongApp.renderQRCodeSVG(140);
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
  const doCancel = () => {
    const db = window.SanBongApp.SanBongDB;
    db.updateBookingStatus(bookingCode, 'Đã hủy', 'Đã hoàn cọc');
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('✓ Đã hủy lịch đặt sân thành công! Số tiền hoàn cọc đã được chuyển về tài khoản.', 'success', 3500);
    renderHistory();
  };

  if (window.SanBongApp?.showModal) {
    window.SanBongApp.showModal({
      title: 'Xác nhận hủy đặt sân',
      message: `Bạn có chắc chắn muốn hủy đơn đặt sân ${bookingCode}?\nTiền cọc sẽ được hoàn lại tự động theo chính sách sân.`,
      type: 'warning',
      confirmText: 'Xác nhận hủy',
      cancelText: 'Giữ đơn',
      onConfirm: doCancel
    });
  } else {
    if (confirm(`Bạn có chắc chắn muốn hủy đơn đặt sân ${bookingCode}?\nTiền cọc sẽ được hoàn lại tự động theo chính sách sân.`)) doCancel();
  }
}
