/**
 * SÂN BÓNG PRO - QUẢN TRỊ VIÊN & VẬN HÀNH (admin.js)
 */

let activeModule = 'overview';

// Đăng xuất Quản trị viên an toàn
function handleAdminLogout() {
  if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi Bảng Điều Khiển Quản Trị?')) {
    sessionStorage.removeItem('sb_current_user');
    fetch('../api/auth.php?action=logout', { method: 'POST' })
      .finally(() => {
        window.location.replace('/login');
      });
  }
}
window.handleAdminLogout = handleAdminLogout;

document.addEventListener('DOMContentLoaded', () => {
  // 1. Kiểm tra xác thực phía client (Session Storage)
  let localUser = null;
  try {
    localUser = JSON.parse(sessionStorage.getItem('sb_current_user') || 'null');
  } catch (e) {}

  if (!localUser || localUser.role !== 'admin') {
    document.documentElement.style.display = 'none';
    window.location.replace('/login?redirect=portal-admin');
    return;
  }

  // Cập nhật tên Admin tạm thời từ sessionStorage
  const nameEl = document.getElementById('admin-name');
  const avEl = document.getElementById('admin-avatar');
  if (nameEl && localUser.full_name) nameEl.textContent = localUser.full_name;
  if (avEl && localUser.full_name) {
    const initials = localUser.full_name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase();
    avEl.textContent = initials || 'AD';
  }

  // 2. Xác thực phiên PHP Server-Side (Chống bypass/leo thang quyền)
  fetch('../api/auth.php?action=me')
    .then(res => res.json())
    .then(data => {
      if (!data || !data.success || !data.logged_in || data.user.role !== 'admin') {
        sessionStorage.removeItem('sb_current_user');
        document.documentElement.style.display = 'none';
        if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Phiên làm việc đã hết hạn hoặc không có quyền Quản trị.', 'error');
        window.location.replace('/login?redirect=portal-admin');
        return;
      }
      if (nameEl && data.user.full_name) nameEl.textContent = data.user.full_name;
      if (avEl && data.user.full_name) {
        const initials = data.user.full_name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase();
        avEl.textContent = initials || 'AD';
      }
    })
    .catch(() => {
      sessionStorage.removeItem('sb_current_user');
      document.documentElement.style.display = 'none';
      window.location.replace('/login?redirect=portal-admin');
    });

  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  renderOverviewTodayBookings();
  renderTimelineGantt();
  initQuickBookingForm();
  renderAdminPitches();
  renderAdminPayments();
});

function switchAdminTab(moduleKey) {
  activeModule = moduleKey;
  const allModules = ['overview', 'timeline', 'quick-booking', 'pitches', 'pricing', 'customers', 'payments', 'reports', 'settings'];

  allModules.forEach(m => {
    const btn = document.getElementById(`nav-${m}`);
    const content = document.getElementById(`tab-content-${m}`);
    if (m === moduleKey) {
      if (btn) btn.className = 'w-full h-10 px-3 rounded-lg flex items-center gap-3 text-xs font-bold transition-all bg-[#DCFCE7] text-[#16A34A]';
      if (content) content.classList.remove('hidden');
    } else {
      if (btn) btn.className = 'w-full h-10 px-3 rounded-lg flex items-center gap-3 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] transition-all';
      if (content) content.classList.add('hidden');
    }
  });

  const titleMap = {
    'overview': '1. Tổng quan KPI & Chỉ số tài chính',
    'timeline': '2. Lịch đặt sân Timeline Gantt trực quan',
    'quick-booking': '3. Đặt sân tại quầy (Tạo nhanh đơn)',
    'pitches': '4. Quản lý 9 sân bóng & Bật/Tắt bảo trì',
    'pricing': '5. Cấu hình bảng giá niêm yết',
    'customers': '6. Danh sách khách hàng & Hội viên',
    'payments': '7. Duyệt biên lai cọc VietQR 1 chạm',
    'reports': '8. Báo cáo thống kê hiệu suất sân',
    'settings': '9. Cài đặt hệ thống & Tài khoản'
  };
  const titleEl = document.getElementById('admin-module-title');
  if (titleEl) titleEl.textContent = titleMap[moduleKey] || 'Quản trị';
}

// 1. Render Ca đá hôm nay (Overview) kèm xử lý ân hạn 15 phút & No-Show
function renderOverviewTodayBookings() {
  const db = window.SanBongApp.SanBongDB;
  const allBookings = db.getAllBookings();
  const container = document.getElementById("overview-today-bookings");
  if (!container) return;

  const todayStr = window.SanBongApp.SanBongData ? window.SanBongApp.SanBongData.getTodayDateString() : new Date().toISOString().split("T")[0];
  let bookings = allBookings.filter(b => b.date === todayStr);
  if (bookings.length < 5) {
    bookings = allBookings.slice(0, 7);
  }

  const now = new Date();
  const curMinutes = now.getHours() * 60 + now.getMinutes();

  container.innerHTML = bookings.map(b => {
    let isLateOver15 = false;
    let lateMinutes = 0;

    if (b.slotTime) {
      const parts = b.slotTime.split("-")[0].trim().split(":");
      if (parts.length === 2) {
        const startMin = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        if (curMinutes > startMin + 15 && b.status !== "Đang đá" && b.status !== "Hoàn thành" && b.status !== "Vắng mặt (No-Show)" && b.status !== "Đã hủy") {
          isLateOver15 = true;
          lateMinutes = curMinutes - startMin;
        }
      }
    }

    let actionButtons = "";
    if (b.status === "Đang đá") {
      actionButtons = '<span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-100 text-blue-700">⚽ Đang thi đấu</span>';
    } else if (b.status === "Vắng mặt (No-Show)") {
      actionButtons = '<div class="flex items-center gap-1.5"><span class="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700">No-Show (Mất cọc)</span><span class="text-[11px] text-[#16A34A] font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">✓ Đã nhả sân</span></div>';
    } else if (b.status === "Đã hủy") {
      actionButtons = '<span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-gray-100 text-gray-500">Đã hủy</span>';
    } else {
      const lateBadge = isLateOver15 ? ('<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 animate-pulse border border-red-300">⚠️ Quá ' + lateMinutes + 'p chưa đến</span>') : '';
      const btnClass = isLateOver15 ? "bg-red-600 hover:bg-red-700 animate-bounce" : "bg-amber-600 hover:bg-amber-700";
      actionButtons = '<div class="flex items-center gap-2">' +
        lateBadge +
        '<button onclick="handleCheckin(\'' + b.code + '\')" class="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#16A34A] text-white hover:bg-[#15803D] transition-colors shadow-sm flex items-center gap-1" title="Khách đã đến sân - Xác nhận vào đá"><span>✓</span> Check-in</button>' +
        '<button onclick="handleNoShowRelease(\'' + b.code + '\')" class="px-2.5 py-1 text-xs font-bold rounded-lg ' + btnClass + ' text-white transition-colors shadow-sm flex items-center gap-1" title="Quá 15 phút không đến: Tịch thu cọc 30% & Giải phóng nhả sân trống đón khách mới"><span>⚠️</span> Quá hạn: Nhả sân</button>' +
      '</div>';
    }

    return '<div class="p-3.5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-slate-300 transition-all">' +
      '<div class="flex flex-wrap items-center gap-2.5">' +
        '<span class="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800">' + b.code + '</span>' +
        '<span class="font-bold text-[#0F172A] text-sm">' + b.pitchName + '</span>' +
        '<span class="text-[#16A34A] font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">⏰ ' + (b.slotTime || "") + '</span>' +
        '<span class="text-[#475569] text-xs font-medium">(' + (b.customerName || "") + ' - ' + (b.phone || "") + ')</span>' +
      '</div>' +
      '<div class="flex items-center gap-3 shrink-0">' +
        window.SanBongApp.statusPill(b.status) +
        '<span class="font-extrabold text-[#0F172A] text-sm">' + window.SanBongApp.formatVND(b.totalPrice) + '</span>' +
        actionButtons +
      '</div>' +
    '</div>';
  }).join("");
}

async function handleCheckin(bookingCode) {
  if (!confirm("Xác nhận đội khách mã đơn " + bookingCode + " đã có mặt tại sân và nhận sân thi đấu?")) return;
  try {
    await fetch("../api/bookings.php?action=checkin&code=" + encodeURIComponent(bookingCode), { method: "POST" });
  } catch (e) {
    console.warn("API Checkin offline fallback:", e);
  }
  const db = window.SanBongApp.SanBongDB;
  db.checkinBooking(bookingCode);
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast('✓ CHECK-IN THÀNH CÔNG: Đơn ' + bookingCode + ' đã chuyển sang trạng thái Đang đá!', 'success', 3500);
  renderOverviewTodayBookings();
  renderTimelineGantt();
}
window.handleCheckin = handleCheckin;

async function handleNoShowRelease(bookingCode) {
  const db = window.SanBongApp.SanBongDB;
  const booking = db.getBookingByCode(bookingCode);
  const custName = booking ? booking.customerName : bookingCode;
  const pitchName = booking ? booking.pitchName : "";
  const slotTime = booking ? booking.slotTime : "";

  const confirmMsg =
    "⚠️ XÁC NHẬN XỬ LÝ KHÁCH QUÁ HẠN (NO-SHOW):\n\n" +
    "• Đội bóng: " + custName + "\n" +
    "• Sân: " + pitchName + " | Khung giờ: " + slotTime + "\n" +
    "• Đã quá 15 phút kể từ giờ bắt đầu ca đá mà khách không đến nhận sân.\n\n" +
    "HỆ THỐNG SẼ THỰC HIỆN:\n" +
    "1. Tịch thu cọc 30% bồi thường chi phí giữ sân.\n" +
    "2. Chuyển trạng thái đơn thành \"Vắng mặt (No-Show)\".\n" +
    "3. GIẢI PHÓNG & NHẢ SÂN TRỐNG NGAY LẬP TỨC để đón khách vãng lai hoặc nhận đơn mới tại quầy/online.\n\n" +
    "Bạn có chắc chắn muốn giải phóng sân này?";

  if (!confirm(confirmMsg)) return;

  try {
    await fetch("../api/bookings.php?action=noshow_release&code=" + encodeURIComponent(bookingCode), { method: "POST" });
  } catch (e) {
    console.warn("API No-Show offline fallback:", e);
  }

  db.releaseNoShowBooking(bookingCode);
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast('⚡ ĐÃ NHẢ SÂN THÀNH CÔNG: Sân ' + pitchName + ' hiện đã Còn trống!', 'success', 4000);
  renderOverviewTodayBookings();
  renderTimelineGantt();
  initQuickBookingForm();
}
window.handleNoShowRelease = handleNoShowRelease;
// 2. Render Timeline Gantt
function renderTimelineGantt() {
  const db = window.SanBongApp.SanBongDB;
  const pitches = db.getPitches();
  const container = document.getElementById('gantt-rows');
  if (!container) return;

  container.innerHTML = pitches.map(p => {
    const isMaint = p.status === 'Bảo trì';

    return `
      <div class="flex items-center h-16 relative">
        <div class="w-28 font-heading font-bold text-xs shrink-0 text-[#0F172A]">${p.name}</div>
        <div class="flex-1 h-10 bg-[#F8FAFC] rounded-lg relative overflow-hidden border border-[#E2E8F0]">
          ${isMaint ? `
            <div class="w-full h-full hatch-slate flex items-center justify-center font-bold text-xs text-[#DC2626]">
              Đang bảo dưỡng mặt cỏ toàn bộ ngày
            </div>
          ` : `
            <!-- Slot Đang đá 17:00 - 18:30 -->
            <div class="absolute left-[45%] w-[15%] top-1 bottom-1 rounded bg-[#DBEAFE] border border-[#2563EB] text-[#2563EB] px-2 py-0.5 text-[10px] truncate font-bold">
              Lê Đức Anh (Đang đá)
            </div>
            <!-- Slot Đã xác nhận 18:30 - 20:00 -->
            <div class="absolute left-[62%] w-[16%] top-1 bottom-1 rounded bg-[#DCFCE7] border border-[#16A34A] text-[#16A34A] px-2 py-0.5 text-[10px] truncate font-bold">
              Trần Minh Hoàng
            </div>
            <!-- Slot Giữ chỗ 20:00 - 21:30 -->
            <div class="absolute left-[80%] w-[12%] top-1 bottom-1 rounded bg-[#FEF3C7] border border-[#F59E0B] text-[#D97706] px-1.5 py-0.5 text-[10px] truncate font-bold">
              Giữ chỗ
            </div>
          `}
        </div>
      </div>
    `;
  }).join('');
}

// 3. Quick walkin booking
function initQuickBookingForm() {
  const db = window.SanBongApp.SanBongDB;
  const pitchSelect = document.getElementById('admin-pitch-select');
  const slotSelect = document.getElementById('admin-slot-select');
  if (!pitchSelect || !slotSelect) return;

  pitchSelect.innerHTML = db.getPitches().map(p => `
    <option value="${p.id}" ${p.status === 'Bảo trì' ? 'disabled' : ''}>${p.name} (${p.typeName})</option>
  `).join('');

  slotSelect.innerHTML = db.getTimeSlots().map(s => `
    <option value="${s.id}">${s.time} ${s.isPeak ? '★ Giờ vàng' : ''}</option>
  `).join('');

  document.getElementById('admin-walkin-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('admin-cust-name').value;
    const phone = document.getElementById('admin-cust-phone').value;
    const pitchId = pitchSelect.value;
    const slotId = slotSelect.value;
    const note = document.getElementById('admin-cust-note').value;
    const payMethod = document.getElementById('admin-pay-select').value;

    const newB = db.createBooking({
      customerName: name,
      phone: phone,
      pitchId: pitchId,
      date: new Date().toISOString().split('T')[0],
      slotId: slotId,
      slotTime: db.getTimeSlots().find(s => s.id === slotId)?.time,
      services: [],
      voucherCode: '',
      note: note,
      paymentMethod: payMethod
    });

    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('✓ Tạo đơn thành công tại quầy! Mã đơn: ' + newB.code, 'success', 3500);
    e.target.reset();
    renderOverviewTodayBookings();
    renderTimelineGantt();
    renderAdminPayments();
    switchAdminTab('overview');
  });
}

// 4. Admin Pitches & Maintenance Switcher
function renderAdminPitches() {
  const db = window.SanBongApp.SanBongDB;
  const pitches = db.getPitches();
  const container = document.getElementById('admin-pitches-list');
  if (!container) return;

  container.innerHTML = pitches.map(p => {
    const isMaint = p.status === 'Bảo trì';

    return `
      <div class="ui-card overflow-hidden flex flex-col justify-between">
        <div>
          <div class="relative">
            ${window.SanBongApp.renderPitchSVG(p.variant || 'standard', 'h-32')}
            <div class="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-white text-[11px] font-bold text-[#0F172A]">
              ${p.typeName}
            </div>
            <div class="absolute top-2 right-2">
              ${window.SanBongApp.statusPill(p.status)}
            </div>
          </div>
          <div class="p-4 space-y-2">
            <div class="flex items-center justify-between">
              <h4 class="font-heading font-bold text-sm text-[#0F172A]">${p.name}</h4>
              <span class="text-xs font-bold text-[#16A34A]">${window.SanBongApp.formatVND(p.basePrice)}/h</span>
            </div>
            <div class="text-[11px] text-[#64748B]">${p.grass}</div>
          </div>
        </div>

        <div class="p-4 pt-0 flex items-center justify-between border-t border-[#F1F5F9]">
          <span class="text-xs font-semibold text-[#475569]">Bảo trì mặt cỏ:</span>
          <button onclick="toggleMaintenance('${p.id}')" class="btn-sm ${isMaint ? 'btn-primary' : 'btn-danger-outline'} font-bold">
            ${isMaint ? '✓ Mở hoạt động lại' : '⚠️ Bật bảo trì'}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function toggleMaintenance(pitchId) {
  const db = window.SanBongApp.SanBongDB;
  const pitch = db.getPitchById(pitchId);
  if (!pitch) return;

  const newStatus = pitch.status === 'Bảo trì' ? 'Hoạt động' : 'Bảo trì';
  db.updatePitchStatus(pitchId, newStatus);
  renderAdminPitches();
  renderTimelineGantt();
  initQuickBookingForm();
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Đã chuyển trạng thái sân ' + pitch.name + ' thành "' + newStatus + '"!', 'info', 3000);
}

// 7. Duyệt cọc VietQR 1 chạm (Lưu trữ bền vững, cập nhật tức thì, không bị hồi lại khi F5)
function renderAdminPayments() {
  const tbody = document.getElementById('admin-payments-tbody');
  if (!tbody) return;

  const db = window.SanBongApp.SanBongDB;
  const pendingList = db.getPendingPayments();

  // Cập nhật số lượng trên các badge
  const count = pendingList.length;
  const badgeEl = document.getElementById('admin-payments-badge');
  const headerBadgeEl = document.getElementById('admin-payments-header-badge');
  if (badgeEl) {
    badgeEl.textContent = count;
    badgeEl.style.display = count > 0 ? 'inline-block' : 'none';
  }
  if (headerBadgeEl) {
    if (count === 0) {
      headerBadgeEl.className = 'px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold';
      headerBadgeEl.textContent = '✓ Đã duyệt hết';
    } else {
      headerBadgeEl.className = 'px-3 py-1 rounded-full bg-[#FEF3C7] text-[#D97706] text-xs font-bold';
      headerBadgeEl.textContent = count + ' Đang chờ';
    }
  }

  if (pendingList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-12 text-center text-[#64748B]">
          <div class="flex flex-col items-center justify-center gap-2">
            <span class="text-3xl">🎉</span>
            <span class="font-bold text-[#0F172A] text-sm">Không có biên lai nào chờ duyệt</span>
            <span class="text-xs text-[#94A3B8]">Tất cả giao dịch chuyển khoản VietQR đã được xử lý xong.</span>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = pendingList.map((item, idx) => `
    <tr id="pay-row-${idx}" class="hover:bg-slate-50 transition-colors">
      <td class="py-3 px-4 text-[#64748B]">${item.time}</td>
      <td class="py-3 px-4 font-mono font-bold text-[#0F172A]">${item.code}</td>
      <td class="py-3 px-4 font-semibold">${item.name}</td>
      <td class="py-3 px-4 font-extrabold text-[#16A34A]">${window.SanBongApp.formatVND(item.amt)}</td>
      <td class="py-3 px-4">${item.bank} (VietQR)</td>
      <td class="py-3 px-4 text-right space-x-2">
        <button onclick="approveDeposit('${item.code}')" class="btn-sm btn-primary">Duyệt cọc</button>
        <button onclick="rejectDeposit('${item.code}')" class="btn-sm btn-danger-outline">Từ chối</button>
      </td>
    </tr>
  `).join('');
}

async function approveDeposit(code) {
  try {
    await fetch('../api/admin.php?action=update_payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code, status: 'Đã cọc 30%' })
    });
  } catch (e) {
    console.warn('API approveDeposit fallback:', e);
  }

  const db = window.SanBongApp.SanBongDB;
  db.approveDeposit(code);
  renderAdminPayments();
  renderOverviewTodayBookings();
  renderTimelineGantt();
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast('✓ ĐÃ DUYỆT CỌC THÀNH CÔNG: Đơn ' + code + ' đã kích hoạt mã vé check-in!', 'success', 3500);
}
window.approveDeposit = approveDeposit;

async function rejectDeposit(code) {
  const confirmMsg =
    '⚠️ XÁC NHẬN TỪ CHỐI DUYỆT CỌC:\n\n' +
    '• Mã đơn: ' + code + '\n' +
    '• Thao tác này sẽ TỪ CHỐI biên lai và HỦY ĐƠN HÀNG.\n' +
    '• Slot sân sẽ được GIẢI PHÓNG TRỐNG NGAY LẬP TỨC để nhận khách mới.\n\n' +
    'Bạn có chắc chắn muốn từ chối?';

  if (!confirm(confirmMsg)) return;

  try {
    await fetch('../api/admin.php?action=update_payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code, status: 'Đã hủy' })
    });
  } catch (e) {
    console.warn('API rejectDeposit fallback:', e);
  }

  const db = window.SanBongApp.SanBongDB;
  db.rejectDeposit(code);
  renderAdminPayments();
  renderOverviewTodayBookings();
  renderTimelineGantt();
  initQuickBookingForm();
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast('⚡ ĐÃ TỪ CHỐI DUYỆT CỌC: Đơn ' + code + ' đã bị từ chối và giải phóng sân.', 'warning', 3500);
}
window.rejectDeposit = rejectDeposit;
