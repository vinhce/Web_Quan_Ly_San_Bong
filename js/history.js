
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

  renderHistoryPolicyBox(db);
  window.addEventListener('sb-data-synced', () => renderHistoryPolicyBox(db));
  renderHistory();
});

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

  const searchInput = document.getElementById('history-search-input');
  const searchVal = (searchInput ? searchInput.value : '').trim().toLowerCase();
  const cleanSearchPhone = searchVal.replace(/[\s\.\-]+/g, '');
  if (searchVal) {
    userBookings = all.filter(b => {
      const code = (b.code || '').toLowerCase();
      const phone = (b.phone || '').replace(/[\s\.\-]+/g, '');
      const name = (b.customerName || '').toLowerCase();
      return code.includes(searchVal) || (cleanSearchPhone.length >= 3 && phone.includes(cleanSearchPhone)) || name.includes(searchVal);
    });
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
    const isConfirmed = b.status === 'Đã xác nhận' || b.status === 'Chờ duyệt cọc';
    const isCompleted = b.status === 'Hoàn thành';
    const monthlyTag = (b.weeksCount && b.weeksCount > 1)
      ? `<span class="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">📅 Gói ${b.weeksCount} tuần</span>`
      : '';
    const overtimeTag = (b.overtimeMinutes && b.overtimeMinutes > 0)
      ? `<span class="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">⏱️ +${b.overtimeMinutes}p thêm giờ</span>`
      : '';

    return `
      <div class="ui-card p-5 space-y-4 hover:shadow-md transition-shadow">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E2E8F0] gap-2">
          <div class="flex flex-wrap items-center gap-2.5">
            <span class="font-mono font-bold text-sm px-2.5 py-0.5 rounded bg-slate-100 text-[#0F172A]">${b.code}</span>
            ${window.SanBongApp.statusPill(b.status)}
            ${b.paymentStatus ? `<span class="text-xs px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#16A34A] font-bold">${b.paymentStatus}</span>` : ''}
            ${monthlyTag}
            ${overtimeTag}
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
              (Đã cọc: <span class="text-[#16A34A] font-bold">${window.SanBongApp.formatVND(b.depositAmount)}</span> · Còn lại: <b class="${b.remainingAmount > 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'}">${window.SanBongApp.formatVND(b.remainingAmount)}</b>)
            </div>
            ${b.note ? `<div class="text-[11px] text-slate-500 mt-1 italic">${b.note}</div>` : ''}
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <button onclick="viewQRCode('${b.code}')" class="btn-base btn-secondary text-xs font-bold">
              📷 Xem vé QR & Hóa đơn
            </button>
            ${isConfirmed ? `
              <button onclick="cancelBooking('${b.code}')" class="btn-base btn-danger-outline text-xs font-bold">
                🛑 Hủy trước hạn & Hoàn cọc
              </button>
            ` : ''}
            ${isCompleted ? `
              <a href="/booking?pitchId=${b.pitchId}" class="btn-base btn-primary text-xs font-bold">
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
  if (mTime) {
    const rem = window.SanBongApp.formatVND(b.remainingAmount || 0);
    mTime.innerHTML = `${window.SanBongApp.formatDateVN(b.date)} · ${b.slotTime}<br><span class="text-[11px] font-bold text-[#0F172A]">Tổng: ${window.SanBongApp.formatVND(b.totalPrice)} · Đã cọc: ${window.SanBongApp.formatVND(b.depositAmount)} · Còn lại: <span class="text-[#DC2626]">${rem}</span></span>`;
  }

  const qrMount = document.getElementById('modal-qr-mount');
  if (qrMount) {
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(b.code)}`;
    qrMount.innerHTML = window.SanBongApp.renderQRCodeSVG(b.code, 150);
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
      const res = await fetch('../api/bookings.php?action=early_cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: bookingCode,
          policy: expectedPolicy,
          reason: 'Khách hàng chủ động hủy lịch trước thời hạn'
        })
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json && json.success) {
        serverHandled = true;
        const d = json.data || {};
        finalStatus = d.status || 'Đã hủy';
        finalPayStatus = d.paymentStatus || d.payment_status || expectedPayStatus;
        refundAmount = d.refundAmount ?? d.refund_amount ?? null;
        serverMessage = json.message || '';
      } else if (!res.ok && json && json.message) {
        if (window.SanBongApp?.showToast) {
          window.SanBongApp.showToast(json.message, 'error', 4000);
        }
        return;
      }
    } catch (e) {}

    if (db) {
      const all = db.getAllBookings();
      const target = all.find(b => b.code === bookingCode);
      if (target) {
        target.status = finalStatus;
        target.paymentStatus = finalPayStatus;
        target.remainingAmount = 0;
        target.note = (target.note ? target.note + ' | ' : '') + `[Hủy trước hạn - ${finalPayStatus}]`;
        try { localStorage.setItem('sb_bookings_v1', JSON.stringify(all)); } catch (err) {}
      } else if (db.cancelBookingEarly) {
        db.cancelBookingEarly(bookingCode, expectedPolicy, 'Khách hàng chủ động hủy lịch trước thời hạn');
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
