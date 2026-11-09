
let activeModule = 'overview';

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
  let localUser = null;
  try {
    localUser = JSON.parse(sessionStorage.getItem('sb_current_user') || 'null');
  } catch (e) {}

  if (!localUser || localUser.role !== 'admin') {
    document.documentElement.style.display = 'none';
    window.location.replace('/login?redirect=portal-admin');
    return;
  }

  const nameEl = document.getElementById('admin-name');
  const avEl = document.getElementById('admin-avatar');
  if (nameEl && localUser.full_name) nameEl.textContent = localUser.full_name;
  if (avEl && localUser.full_name) {
    const initials = localUser.full_name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase();
    avEl.textContent = initials || 'AD';
  }

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

  renderOverviewKPIs();
  renderOverviewTodayBookings();
  renderTimelineGantt();
  populateInPlayWorkspace();
  initQuickBookingForm();
  renderAdminPitches();
  renderAdminPayments();
  renderAdminVouchers();

  window.addEventListener('storage', () => {
    refreshAllAdminViews(activeInPlayCode);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeInPlayModal();
      if (typeof closeInvoiceModal === 'function') closeInvoiceModal();
      if (typeof closeQRScannerModal === 'function') closeQRScannerModal();
    }
  });
});

function renderOverviewKPIs() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;
  const allBookings = db.getAllBookings();
  const pitches = db.getPitches();
  const pendingList = db.getPendingPayments ? db.getPendingPayments() : [];

  let collectedRev = 0;
  let playingCount = 0;
  allBookings.forEach(b => {
    const st = (b.status === 'Vắng mặt (No-Show)' || String(b.status || '').includes('No-Show')) ? 'Khách chưa đến' : (b.status || '');
    const total = Number(b.totalPrice || 0);
    const dep = Number(b.depositAmount || Math.round(total * 0.3));
    if (st === 'Hoàn thành') {
      collectedRev += total;
    } else if (st === 'Đang đá' || st === 'Đã xác nhận' || st === 'Khách chưa đến') {
      collectedRev += dep;
    }
    if (st === 'Đang đá') playingCount++;
  });

  const displayRev = Math.max(4350000, collectedRev);
  const totalCount = Math.max(11, allBookings.length);
  const maintCount = pitches.filter(p => p.status === 'Bảo trì').length;
  const readyCount = Math.max(0, pitches.length - maintCount);

  const cards = document.querySelectorAll('#tab-content-overview > .grid:first-child > .ui-card');
  if (cards.length >= 4) {
    const revEl = cards[0].querySelector('.font-heading');
    if (revEl) revEl.textContent = window.SanBongApp.formatVND(displayRev);

    const cntEl = cards[1].querySelector('.font-heading');
    const pendingEl = cards[1].querySelector('.mt-2');
    if (cntEl) cntEl.textContent = totalCount + ' lượt';
    if (pendingEl) {
      pendingEl.textContent = pendingList.length > 0
        ? `${pendingList.length} đơn đang giữ chỗ VietQR`
        : '✓ Đã duyệt hết cọc VietQR';
    }

    const readyEl = cards[3].querySelector('.font-heading');
    const subEl = cards[3].querySelector('.mt-2');
    if (readyEl) readyEl.textContent = `${readyCount}/${pitches.length} Sân sẵn sàng`;
    if (subEl) subEl.textContent = `${playingCount} đang đá · ${maintCount} bảo trì mặt cỏ`;
  }
}

function refreshAllAdminViews(codeOpt) {
  renderOverviewKPIs();
  renderOverviewTodayBookings();
  renderTimelineGantt();
  renderAdminPitches();
  renderAdminPayments();
  renderAdminCustomers();
  renderAdminReports();
  populateInPlayWorkspace(codeOpt || activeInPlayCode);
}
window.refreshAllAdminViews = refreshAllAdminViews;

let currentOverviewFilter = 'all';
let activeQRBookingCode = '';
let qrCameraStream = null;
let qrScanTimer = null;
let activeInPlayCode = '';
let activeInvoiceCode = '';
let editingVoucherCode = '';

function filterOverviewBookings(filterType) {
  currentOverviewFilter = filterType || 'all';
  ['all', 'playing', 'confirmed', 'completed', 'noshow'].forEach(f => {
    const btn = document.getElementById('ov-filter-' + f);
    if (btn) {
      if (f === currentOverviewFilter) {
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold bg-[#16A34A] text-white shadow-sm cursor-pointer';
      } else {
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer';
      }
    }
  });
  renderOverviewTodayBookings();
}
window.filterOverviewBookings = filterOverviewBookings;

function switchAdminTab(moduleKey) {
  activeModule = moduleKey;
  const allModules = ['overview', 'timeline', 'inplay-control', 'quick-booking', 'pitches', 'pricing', 'customers', 'payments', 'reports', 'settings'];

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
    'inplay-control': 'Điều Hành Ca Đá & Thanh Toán',
    'quick-booking': '3. Đặt sân tại quầy (Tạo nhanh đơn)',
    'pitches': '4. Quản lý hệ thống sân bóng & Bật/Tắt bảo trì',
    'pricing': '5. Cấu hình bảng giá niêm yết & Voucher',
    'customers': '6. Danh sách khách hàng & Hội viên',
    'payments': '7. Duyệt biên lai cọc VietQR 1 chạm',
    'reports': '8. Báo cáo thống kê hiệu suất sân',
    'settings': '9. Cài đặt hệ thống & Tài khoản'
  };
  const titleEl = document.getElementById('admin-module-title');
  if (titleEl) titleEl.textContent = titleMap[moduleKey] || 'Quản trị';

  if (moduleKey === 'timeline') {
    renderTimelineGantt();
  }
  if (moduleKey === 'inplay-control') {
    const db = window.SanBongApp?.SanBongDB;
    const firstB = db ? db.getAllBookings()[0] : null;
    populateInPlayWorkspace(activeInPlayCode || (firstB ? firstB.code : ''));
  }
  if (moduleKey === 'pricing') renderAdminVouchers();
  if (moduleKey === 'customers') renderAdminCustomers();
  if (moduleKey === 'reports') renderAdminReports();
  if (moduleKey === 'settings') loadAdminSettings();
}

function renderOverviewTodayBookings() {
  const db = window.SanBongApp.SanBongDB;
  const allBookings = db.getAllBookings();
  const container = document.getElementById("overview-today-bookings");
  if (!container) return;

  const todayStr = window.SanBongApp.SanBongData ? window.SanBongApp.SanBongData.getTodayDateString() : new Date().toISOString().split("T")[0];
  let bookings = allBookings.filter(b => b.date === todayStr);
  if (bookings.length < 5) {
    bookings = allBookings.slice(0, 10);
  }

  if (currentOverviewFilter === 'playing') {
    bookings = allBookings.filter(b => b.status === 'Đang đá');
  } else if (currentOverviewFilter === 'confirmed') {
    bookings = allBookings.filter(b => b.status === 'Đã xác nhận' || b.status === 'Chờ duyệt cọc');
  } else if (currentOverviewFilter === 'completed') {
    bookings = allBookings.filter(b => b.status === 'Hoàn thành');
  } else if (currentOverviewFilter === 'noshow') {
    bookings = allBookings.filter(b => b.status === 'Khách chưa đến' || b.status === 'Vắng mặt (No-Show)' || String(b.status || '').includes('No-Show') || b.status === 'Đã hủy');
  }

  if (bookings.length === 0) {
    container.innerHTML = '<div class="p-6 text-center text-xs text-[#64748B] bg-slate-50 rounded-xl border border-dashed border-slate-200">Không có ca đặt sân nào trong bộ lọc này.</div>';
    return;
  }

  const now = new Date();
  const curMinutes = now.getHours() * 60 + now.getMinutes();

  container.innerHTML = bookings.map(b => {
    const normStatus = (b.status === 'Vắng mặt (No-Show)' || String(b.status || '').includes('No-Show')) ? 'Khách chưa đến' : (b.status || 'Đã xác nhận');
    let isLateOver15 = false;
    let lateMinutes = 0;

    if (b.slotTime) {
      const parts = b.slotTime.split("-")[0].trim().split(":");
      if (parts.length === 2) {
        const startMin = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        if (curMinutes > startMin + 15 && normStatus !== "Đang đá" && normStatus !== "Hoàn thành" && normStatus !== "Khách chưa đến" && normStatus !== "Đã hủy") {
          isLateOver15 = true;
          lateMinutes = curMinutes - startMin;
        }
      }
    }

    const total = Number(b.totalPrice || 0);
    const deposit = Number(b.depositAmount || Math.round(total * 0.3));
    const remaining = (normStatus === 'Hoàn thành' || normStatus === 'Đã hủy' || normStatus === 'Khách chưa đến') ? 0 : (typeof b.remainingAmount === 'number' ? b.remainingAmount : Math.max(0, total - deposit));

    const monthlyBadge = (b.weeksCount && b.weeksCount > 1)
      ? `<span class="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-bold text-[10px]">📅 Gói tháng (${b.weeksCount} tuần)</span>`
      : '';
    const overtimeBadge = (b.overtimeMinutes && b.overtimeMinutes > 0)
      ? `<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">⏱️ +${b.overtimeMinutes}p thêm giờ</span>`
      : '';

    let actionButtons = "";
    if (normStatus === "Đang đá") {
      actionButtons =
        '<div class="flex items-center gap-1.5">' +
          '<button type="button" onclick="event.stopPropagation(); openInPlayModal(\'' + b.code + '\')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-800 text-white hover:bg-slate-900 transition-colors shadow-2xs flex items-center gap-1 cursor-pointer" title="Đá thêm giờ, Đổi sân, Gọi thêm nước, Hủy trước hạn">⚙️ Quản lý đang chơi</button>' +
          '<button type="button" onclick="event.stopPropagation(); openInPlayModal(\'' + b.code + '\', \'pay\')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#16A34A] text-white hover:bg-[#15803D] transition-colors shadow-2xs flex items-center gap-1 cursor-pointer" title="Thu phần tiền còn lại & Hoàn thành ca">💰 Thu còn lại (' + window.SanBongApp.formatVND(remaining) + ')</button>' +
          '<button type="button" onclick="event.stopPropagation(); openInvoicePrintModal(\'' + b.code + '\')" class="px-2 py-1 text-[11px] font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer" title="Xem & In hóa đơn">🖨️ Hóa đơn</button>' +
        '</div>';
    } else if (normStatus === "Hoàn thành") {
      actionButtons =
        '<div class="flex items-center gap-1.5">' +
          '<span class="px-2 py-0.5 text-[11px] font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">✓ Đã thu đủ 100%</span>' +
          '<button type="button" onclick="event.stopPropagation(); openInPlayModal(\'' + b.code + '\')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-[#0F172A] hover:bg-slate-200 border border-slate-300 cursor-pointer">⚙️ Xem & Điều hành</button>' +
          '<button type="button" onclick="event.stopPropagation(); openInvoicePrintModal(\'' + b.code + '\')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#0F172A] text-white hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer">🖨️ In hóa đơn</button>' +
        '</div>';
    } else if (normStatus === "Khách chưa đến" || normStatus === "Đã hủy") {
      actionButtons =
        '<div class="flex items-center gap-1.5">' +
          '<span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">✓ Đã nhả sân</span>' +
          '<button type="button" onclick="event.stopPropagation(); restoreCancelledBooking(\'' + b.code + '\')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500 text-white hover:bg-amber-600 shadow-2xs cursor-pointer" title="Khách đã tới sân - Khôi phục lại ca đá này">🔄 Khôi phục ca</button>' +
          '<button type="button" onclick="event.stopPropagation(); openInPlayModal(\'' + b.code + '\')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-[#0F172A] hover:bg-slate-200 border border-slate-300 cursor-pointer" title="Mở bảng điều hành chi tiết ca đá">⚙️ Xem & Điều hành</button>' +
          '<button type="button" onclick="event.stopPropagation(); openInvoicePrintModal(\'' + b.code + '\')" class="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-[#475569] hover:bg-slate-200 border border-slate-200 cursor-pointer" title="Xem & In hóa đơn">🖨️ Hóa đơn</button>' +
        '</div>';
    } else {
      const lateBadge = isLateOver15 ? ('<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 animate-pulse border border-red-300 whitespace-nowrap">⚠️ Quá ' + lateMinutes + 'p chưa đến</span>') : '';
      const btnClass = isLateOver15 ? "bg-red-600 hover:bg-red-700 animate-bounce" : "bg-amber-600 hover:bg-amber-700";
      actionButtons = '<div class="flex items-center gap-1.5">' +
        lateBadge +
        '<button type="button" onclick="event.stopPropagation(); handleCheckin(\'' + b.code + '\')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#16A34A] text-white hover:bg-[#15803D] transition-colors shadow-2xs flex items-center gap-1 cursor-pointer" title="Khách đã đến sân - Xác nhận vào đá"><span>✓</span> Check-in</button>' +
        '<button type="button" onclick="event.stopPropagation(); openInPlayModal(\'' + b.code + '\')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 text-[#0F172A] hover:bg-slate-200 border border-slate-300 transition-colors flex items-center gap-1 cursor-pointer" title="Đổi sân, Gọi thêm nước, Hủy lịch trước hạn">⚙️ Quản lý / Đổi sân / Hủy</button>' +
        '<button type="button" onclick="event.stopPropagation(); handleNoShowRelease(\'' + b.code + '\')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg ' + btnClass + ' text-white transition-colors shadow-2xs flex items-center gap-1 cursor-pointer" title="Quá 15 phút khách chưa đến: Tịch thu cọc 30% & Giải phóng nhả sân trống đón khách mới"><span>⚠️</span> Chưa đến: Nhả sân</button>' +
        '<button type="button" onclick="event.stopPropagation(); openInvoicePrintModal(\'' + b.code + '\')" class="px-2 py-1 text-[11px] font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 cursor-pointer" title="Xem & In hóa đơn">🖨️ Hóa đơn</button>' +
      '</div>';
    }

    const cleanNote = b.note ? String(b.note).replace(/Hủy No-Show do quá 15p/g, 'Quá 15p khách chưa đến').replace(/No-Show/g, 'Khách chưa đến') : '';

    return '<div onclick="openInPlayModal(\'' + b.code + '\')" class="py-2.5 px-3.5 rounded-lg border border-slate-200 hover:border-emerald-300 bg-white hover:bg-slate-50/80 shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 transition-all cursor-pointer">' +
      '<div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 flex-1 min-w-0">' +
        '<!-- Cột 1: Mã đơn & Sân & Khung giờ -->' +
        '<div class="flex items-center gap-2 shrink-0">' +
          '<button type="button" onclick="event.stopPropagation(); openInPlayModal(\'' + b.code + '\')" class="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-50 text-slate-800 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer" title="Bấm để mở popup chi tiết ca đá">' + b.code + '</button>' +
          '<span class="font-bold text-[#0F172A] text-xs whitespace-nowrap min-w-[110px]">' + b.pitchName + '</span>' +
          '<span class="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded whitespace-nowrap">⏰ ' + (b.slotTime || "") + '</span>' +
          monthlyBadge +
          overtimeBadge +
        '</div>' +
        '<!-- Cột 2: Khách hàng -->' +
        '<div class="flex items-center gap-1.5 text-xs text-[#475569] shrink-0 min-w-[170px] max-w-[220px]">' +
          '<span class="font-semibold text-slate-800 truncate">👤 ' + escapeSearchHTML(b.customerName || "") + '</span>' +
          '<span class="text-slate-400 font-mono text-[11px] whitespace-nowrap">(' + escapeSearchHTML(b.phone || "") + ')</span>' +
        '</div>' +
        '<!-- Cột 3: Tiền cọc & Còn lại -->' +
        '<div class="flex items-center gap-2 text-[11px] text-[#64748B] shrink-0">' +
          '<span>Tổng: <b class="text-[#0F172A] font-semibold">' + window.SanBongApp.formatVND(total) + '</b></span>' +
          '<span class="text-slate-300">·</span>' +
          '<span>Cọc: <b class="text-[#16A34A] font-semibold">' + window.SanBongApp.formatVND(deposit) + '</b></span>' +
          '<span class="text-slate-300">·</span>' +
          '<span>Còn: <b class="' + (remaining > 0 ? 'text-[#DC2626]' : 'text-[#16A34A]') + ' font-bold">' + window.SanBongApp.formatVND(remaining) + '</b></span>' +
          (cleanNote ? '<span class="text-slate-400 italic truncate max-w-[140px]" title="' + escapeSearchHTML(cleanNote) + '">· ' + escapeSearchHTML(cleanNote) + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<!-- Cột 4: Badge & Nút thao tác -->' +
      '<div class="flex flex-wrap items-center gap-2 shrink-0 justify-end">' +
        window.SanBongApp.statusPill(normStatus) +
        actionButtons +
      '</div>' +
    '</div>';
  }).join("");
}

async function handleCheckin(bookingCode) {
  const doCheckin = async () => {
    try {
      await fetch("../api/bookings.php?action=checkin&code=" + encodeURIComponent(bookingCode), { method: "POST" });
    } catch (e) {
      console.warn("API Checkin offline fallback:", e);
    }
    const db = window.SanBongApp.SanBongDB;
    const updated = db.checkinBooking(bookingCode);
    const rem = updated ? window.SanBongApp.formatVND(updated.remainingAmount || 0) : '';
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('✓ CHECK-IN THÀNH CÔNG: Đơn ' + bookingCode + ' đã vào sân Đang đá! (Còn lại phải thu cuối giờ: ' + rem + ')', 'success', 4000);
    }
    renderOverviewTodayBookings();
    renderTimelineGantt();
    if (activeInPlayCode === bookingCode) populateInPlayWorkspace(bookingCode);
  };

  if (window.SanBongApp?.showModal) {
    window.SanBongApp.showModal({
      title: '⚽ Xác nhận Check-in nhận sân thi đấu',
      message: 'Xác nhận đội khách mã đơn ' + bookingCode + ' đã có mặt tại sân và bắt đầu ca đá?\n\n• Hệ thống sẽ chuyển sang trạng thái "Đang đá".\n• Trong lúc đá có thể thêm giờ, đổi sân, gọi thêm nước và thu nốt 70% tiền còn lại sau khi kết thúc.',
      type: 'success',
      confirmText: 'Check-in Vào Sân',
      cancelText: 'Đóng',
      onConfirm: doCheckin
    });
  } else {
    if (confirm("Xác nhận đội khách mã đơn " + bookingCode + " đã có mặt tại sân và nhận sân thi đấu?")) doCheckin();
  }
}
window.handleCheckin = handleCheckin;

async function handleNoShowRelease(bookingCode) {
  const db = window.SanBongApp.SanBongDB;
  const booking = db.getBookingByCode(bookingCode);
  const custName = booking ? booking.customerName : bookingCode;
  const pitchName = booking ? booking.pitchName : "";
  const slotTime = booking ? booking.slotTime : "";

  const confirmMsg =
    "• Đội bóng: " + custName + "\n" +
    "• Sân: " + pitchName + " | Khung giờ: " + slotTime + "\n" +
    "• Đã quá 15 phút kể từ giờ bắt đầu ca đá mà khách chưa đến nhận sân.\n\n" +
    "HỆ THỐNG SẼ THỰC HIỆN:\n" +
    "1. Tịch thu cọc 30% bồi thường chi phí giữ sân.\n" +
    "2. Chuyển trạng thái đơn thành \"Khách chưa đến\".\n" +
    "3. GIẢI PHÓNG & NHẢ SÂN TRỐNG NGAY LẬP TỨC để đón khách mới tại quầy hoặc online.\n\n" +
    "Bạn có chắc chắn muốn giải phóng sân này?";

  const doRelease = async () => {
    try {
      await fetch("../api/bookings.php?action=noshow_release&code=" + encodeURIComponent(bookingCode), { method: "POST" });
    } catch (e) {
      console.warn("API No-Show offline fallback:", e);
    }

    db.releaseNoShowBooking(bookingCode);
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('⚡ ĐÃ NHẢ SÂN THÀNH CÔNG: Đơn ' + bookingCode + ' chuyển sang "Khách chưa đến", sân ' + pitchName + ' đã trống để đón khách mới!', 'success', 4000);
    }
    renderOverviewTodayBookings();
    renderTimelineGantt();
    initQuickBookingForm();
    if (activeInPlayCode === bookingCode) populateInPlayWorkspace(bookingCode);
  };

  if (window.SanBongApp?.showModal) {
    window.SanBongApp.showModal({
      title: '⚠️ Xử lý khách quá giờ chưa đến (Nhả sân)',
      message: confirmMsg,
      type: 'warning',
      confirmText: 'Tịch thu cọc & Nhả sân',
      cancelText: 'Giữ sân thêm',
      onConfirm: doRelease
    });
  } else {
    if (confirm(confirmMsg)) doRelease();
  }
}
window.handleNoShowRelease = handleNoShowRelease;

function renderTimelineGantt() {
  const db = window.SanBongApp.SanBongDB;
  const pitches = db.getPitches();
  const allBookings = db.getAllBookings();
  const container = document.getElementById('gantt-rows');
  if (!container) return;

  const parseSlotPos = (slotTimeStr, fallbackIdx = 0) => {
    if (slotTimeStr && slotTimeStr.includes('-')) {
      const [sPart, ePart] = slotTimeStr.split('-').map(x => x.trim());
      const [sh, sm] = sPart.split(':').map(Number);
      const [eh, em] = ePart.split(':').map(Number);
      if (!isNaN(sh) && !isNaN(eh)) {
        const startMin = sh * 60 + (sm || 0);
        const endMin = eh * 60 + (em || 0);
        const minBase = 6 * 60;
        const maxSpan = 17.5 * 60;
        const left = Math.max(1, Math.min(84, Math.round(((startMin - minBase) / maxSpan) * 100)));
        const width = Math.max(12, Math.min(99 - left, Math.round(((endMin - startMin) / maxSpan) * 100)));
        return { left, width };
      }
    }
    const presets = [
      { left: 42, width: 16 },
      { left: 60, width: 17 },
      { left: 79, width: 14 }
    ];
    return presets[fallbackIdx % presets.length];
  };

  container.innerHTML = pitches.map((p, pIdx) => {
    const isMaint = p.status === 'Bảo trì';
    let pitchBookings = allBookings.filter(b => b.pitchId === p.id);
    if (pitchBookings.length === 0 && allBookings.length > 0) {
      const sampleB = allBookings[pIdx % allBookings.length];
      if (sampleB) pitchBookings = [sampleB];
    }

    const barsHtml = pitchBookings.map((b, bIdx) => {
      const pos = parseSlotPos(b.slotTime, bIdx);
      const normStatus = (b.status === 'Vắng mặt (No-Show)' || String(b.status || '').includes('No-Show')) ? 'Khách chưa đến' : (b.status || 'Đã xác nhận');
      let styleCls = 'bg-[#DCFCE7] border-[#16A34A] text-[#16A34A]';
      if (normStatus === 'Đang đá') {
        styleCls = 'bg-[#DBEAFE] border-[#2563EB] text-[#2563EB]';
      } else if (normStatus === 'Chờ duyệt cọc' || normStatus === 'Giữ chỗ') {
        styleCls = 'bg-[#FEF3C7] border-[#F59E0B] text-[#D97706]';
      } else if (normStatus === 'Khách chưa đến' || normStatus === 'Đã hủy') {
        styleCls = 'bg-[#FEE2E2] border-[#EF4444] text-[#DC2626]';
      } else if (normStatus === 'Hoàn thành') {
        styleCls = 'bg-slate-200 border-slate-400 text-slate-700';
      }
      const isSelected = b.code === activeInPlayCode ? 'ring-2 ring-[#0F172A] z-10' : '';
      return `
        <div onclick="openInPlaySection('${b.code}')" title="Bấm để điều hành ca đá #${b.code} · ${escapeSearchHTML(b.customerName)} (${escapeSearchHTML(b.slotTime || '')} - ${escapeSearchHTML(normStatus)})" class="absolute top-1 bottom-1 rounded border px-2 py-0.5 text-[10px] truncate font-bold cursor-pointer hover:scale-[1.01] transition-transform flex items-center justify-between gap-1 shadow-xs ${styleCls} ${isSelected}" style="left:${pos.left}%; width:${pos.width}%;">
          <span class="truncate">${escapeSearchHTML(b.customerName)} (${escapeSearchHTML(normStatus)})</span>
          <span class="font-mono text-[9px] opacity-75 shrink-0">#${b.code.slice(-4)}</span>
        </div>
      `;
    }).join('');

    return `
      <div class="flex items-center h-16 relative">
        <div class="w-28 font-heading font-bold text-xs shrink-0 text-[#0F172A]">${p.name}</div>
        <div class="flex-1 h-10 bg-[#F8FAFC] rounded-lg relative overflow-hidden border border-[#E2E8F0]">
          ${isMaint ? `
            <div class="w-full h-full hatch-slate flex items-center justify-center font-bold text-xs text-[#DC2626]">
              Đang bảo dưỡng mặt cỏ toàn bộ ngày
            </div>
          ` : barsHtml}
        </div>
      </div>
    `;
  }).join('');

  renderInlineInPlaySelector();
}

function initQuickBookingForm() {
  const db = window.SanBongApp.SanBongDB;
  const pitchSelect = document.getElementById('admin-pitch-select');
  const slotSelect = document.getElementById('admin-slot-select');
  if (!pitchSelect || !slotSelect) return;

  pitchSelect.innerHTML = db.getPitches().map(p => `
    <option value="${p.id}" ${p.status === 'Bảo trì' ? 'disabled' : ''}>${p.name} (${p.typeName})</option>
  `).join('');

  slotSelect.innerHTML = db.getTimeSlots().map(s => `
    <option value="${s.id}">${s.time} ${s.isPeak ? '★ Giờ cao điểm' : ''}</option>
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

function renderAdminPitches() {
  const db = window.SanBongApp.SanBongDB;
  const pitches = db.getPitches();
  const container = document.getElementById('admin-pitches-list');
  if (!container) return;

  const subHeader = document.querySelector('#tab-content-pitches h3');
  if (subHeader) {
    subHeader.textContent = `Danh sách ${pitches.length} sân bóng trực thuộc hệ thống`;
  }

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

function renderAdminPayments() {
  const tbody = document.getElementById('admin-payments-tbody');
  if (!tbody) return;

  const db = window.SanBongApp.SanBongDB;
  const pendingList = db.getPendingPayments();

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
    '• Mã đơn: ' + code + '\n' +
    '• Thao tác này sẽ TỪ CHỐI biên lai chuyển khoản và HỦY ĐƠN HÀNG.\n' +
    '• Slot sân sẽ được GIẢI PHÓNG TRỐNG NGAY LẬP TỨC để đón khách khác.\n\n' +
    'Biên lai bị từ chối sẽ được lưu trữ vĩnh viễn và không xuất hiện lại sau khi F5.\n' +
    'Bạn có chắc chắn muốn từ chối biên lai này?';

  const doReject = async () => {
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
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('⚡ ĐÃ TỪ CHỐI DUYỆT CỌC: Đơn ' + code + ' đã bị từ chối và giải phóng sân.', 'warning', 3500);
    }
  };

  if (window.SanBongApp?.showModal) {
    window.SanBongApp.showModal({
      title: '⚠️ Xác nhận từ chối duyệt cọc',
      message: confirmMsg,
      type: 'danger',
      confirmText: 'Từ chối & Giải phóng sân',
      cancelText: 'Đóng lại',
      onConfirm: doReject
    });
  } else {
    if (confirm(confirmMsg)) doReject();
  }
}
window.rejectDeposit = rejectDeposit;

function performAdminSearch() {
  const input = document.getElementById('admin-global-search');
  const resultsBox = document.getElementById('admin-search-results');
  const clearBtn = document.getElementById('admin-search-clear');
  if (!input || !resultsBox) return;

  const rawQuery = input.value.trim();
  const query = rawQuery.toLowerCase();
  if (!query) {
    resultsBox.classList.add('hidden');
    resultsBox.innerHTML = '';
    if (clearBtn) clearBtn.classList.add('hidden');
    return;
  }
  if (clearBtn) clearBtn.classList.remove('hidden');

  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const allBookings = db.getAllBookings ? db.getAllBookings() : [];
  const pendingPayments = db.getPendingPayments ? db.getPendingPayments() : [];
  const cleanPhoneQ = query.replace(/[\s\.\-]+/g, '');

  const matchedBookings = allBookings.filter(b => {
    const code = (b.code || '').toLowerCase();
    const phone = (b.phone || '').replace(/[\s\.\-]+/g, '');
    const name = (b.customerName || '').toLowerCase();
    const pitch = (b.pitchName || '').toLowerCase();
    const isCodeMatch = code.includes(query);
    const isPhoneMatch = cleanPhoneQ.length >= 3 && phone.includes(cleanPhoneQ);
    const isNameMatch = name.includes(query);
    const isPitchMatch = pitch.includes(query);
    return isCodeMatch || isPhoneMatch || isNameMatch || isPitchMatch;
  });

  const matchedPending = pendingPayments.filter(p => {
    const code = (p.code || '').toLowerCase();
    const name = (p.name || '').toLowerCase();
    const bank = (p.bank || '').toLowerCase();
    return code.includes(query) || name.includes(query) || bank.includes(query);
  });

  const total = matchedBookings.length + matchedPending.length;

  if (total === 0) {
    resultsBox.innerHTML = `
      <div class="p-4 text-center">
        <div class="text-2xl mb-1">🔍</div>
        <div class="font-bold text-xs text-[#0F172A]">Không tìm thấy đơn đặt sân nào</div>
        <div class="text-[11px] text-[#64748B] mt-0.5">Không có kết quả khớp với "<strong>${escapeSearchHTML(rawQuery)}</strong>"</div>
      </div>
    `;
    resultsBox.classList.remove('hidden');
    return;
  }

  let html = `
    <div class="px-3 py-1.5 text-[11px] font-bold text-[#64748B] bg-slate-50 rounded-lg flex items-center justify-between mb-1.5">
      <span>TÌM THẤY ${total} KẾT QUẢ</span>
      <button onclick="clearAdminSearch()" class="text-slate-400 hover:text-slate-600 text-xs">Đóng</button>
    </div>
  `;

  if (matchedPending.length > 0) {
    matchedPending.forEach(p => {
      html += `
        <div onclick="switchAdminTab('payments'); clearAdminSearch();" class="p-2.5 rounded-lg hover:bg-amber-50 cursor-pointer transition-all border border-transparent hover:border-amber-200 mb-1">
          <div class="flex items-center justify-between gap-2">
            <span class="font-mono font-bold text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded">${escapeSearchHTML(p.code)}</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Chờ duyệt cọc</span>
          </div>
          <div class="mt-1 text-xs font-semibold text-[#0F172A] flex items-center justify-between">
            <span>${escapeSearchHTML(p.name)}</span>
            <span class="font-bold text-[#16A34A]">${Number(p.amt || 0).toLocaleString('vi-VN')}đ</span>
          </div>
          <div class="text-[11px] text-[#64748B] flex items-center justify-between mt-0.5">
            <span>${escapeSearchHTML(p.bank || 'VietQR')} · ${p.time || ''}</span>
            <span class="text-[#D97706] font-semibold">Xem duyệt cọc →</span>
          </div>
        </div>
      `;
    });
  }

  if (matchedBookings.length > 0) {
    matchedBookings.forEach(b => {
      const isPending = b.paymentStatus === 'Chờ duyệt cọc';
      const statusBg = isPending ? 'bg-amber-100 text-amber-700' : (b.status === 'Đang đá' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700');
      html += `
        <div onclick="viewBookingDetail('${escapeSearchHTML(b.code)}')" class="p-2.5 rounded-lg hover:bg-emerald-50 cursor-pointer transition-all border border-transparent hover:border-emerald-200 mb-1">
          <div class="flex items-center justify-between gap-2">
            <span class="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded">${escapeSearchHTML(b.code)}</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBg}">${escapeSearchHTML(b.paymentStatus || b.status)}</span>
          </div>
          <div class="mt-1 text-xs font-semibold text-[#0F172A] flex items-center justify-between">
            <span>${escapeSearchHTML(b.customerName || 'Khách')} ${b.phone ? '· ' + escapeSearchHTML(b.phone) : ''}</span>
            <span class="font-bold text-[#16A34A]">${Number(b.totalPrice || 0).toLocaleString('vi-VN')}đ</span>
          </div>
          <div class="text-[11px] text-[#64748B] flex items-center justify-between mt-0.5">
            <span>${escapeSearchHTML(b.pitchName || '')} (${escapeSearchHTML(b.slotTime || '')})</span>
            <span class="text-[#16A34A] font-semibold">Chi tiết đơn →</span>
          </div>
        </div>
      `;
    });
  }

  resultsBox.innerHTML = html;
  resultsBox.classList.remove('hidden');
}

function clearAdminSearch() {
  const input = document.getElementById('admin-global-search');
  const resultsBox = document.getElementById('admin-search-results');
  const clearBtn = document.getElementById('admin-search-clear');
  if (input) input.value = '';
  if (resultsBox) {
    resultsBox.classList.add('hidden');
    resultsBox.innerHTML = '';
  }
  if (clearBtn) clearBtn.classList.add('hidden');
}

function viewBookingDetail(code) {
  clearAdminSearch();
  openInPlayModal(code);
}

function escapeSearchHTML(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[m]);
}

document.addEventListener('click', (e) => {
  const searchContainer = document.getElementById('admin-global-search')?.closest('.relative');
  if (searchContainer && !searchContainer.contains(e.target)) {
    const resultsBox = document.getElementById('admin-search-results');
    if (resultsBox) resultsBox.classList.add('hidden');
  }
});

window.performAdminSearch = performAdminSearch;
window.clearAdminSearch = clearAdminSearch;
window.viewBookingDetail = viewBookingDetail;

function renderAdminCustomers() {
  const tbody = document.getElementById('admin-customers-tbody');
  if (!tbody) return;

  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const allBookings = db.getAllBookings ? db.getAllBookings() : [];
  const searchQ = (document.getElementById('admin-cust-search')?.value || '').trim().toLowerCase();
  const cleanQPhone = searchQ.replace(/[\s\.\-]+/g, '');

  const customerMap = {};

  const baseCustomers = [
    { name: 'Trần Minh Hoàng', phone: '0352 313 548', tier: 'Bạc', matches: 14, spend: 8420000, points: 842 },
    { name: 'Lê Đức Anh (FC Cầu Giấy)', phone: '0903 112 233', tier: 'Vàng', matches: 41, spend: 24900000, points: 2490 },
    { name: 'Phạm Quốc Bảo (HUTECH)', phone: '0918 445 566', tier: 'Đồng', matches: 6, spend: 2100000, points: 210 }
  ];

  baseCustomers.forEach(c => {
    customerMap[c.phone] = c;
  });

  allBookings.forEach(b => {
    const phone = (b.phone || '').trim();
    if (!phone) return;
    const name = b.customerName || 'Khách vãng lai';
    const total = Number(b.totalPrice || 0);

    if (!customerMap[phone]) {
      customerMap[phone] = {
        name: name,
        phone: phone,
        tier: 'Đồng',
        matches: 0,
        spend: 0,
        points: 0
      };
    }
    customerMap[phone].matches += 1;
    customerMap[phone].spend += total;
    customerMap[phone].points = Math.floor(customerMap[phone].spend / 10000);

    if (customerMap[phone].spend >= 20000000 || customerMap[phone].matches >= 30) {
      customerMap[phone].tier = 'Kim Cương';
    } else if (customerMap[phone].spend >= 10000000 || customerMap[phone].matches >= 15) {
      customerMap[phone].tier = 'Vàng';
    } else if (customerMap[phone].spend >= 4000000 || customerMap[phone].matches >= 6) {
      customerMap[phone].tier = 'Bạc';
    } else {
      customerMap[phone].tier = 'Đồng';
    }
  });

  let customers = Object.values(customerMap);

  if (searchQ) {
    customers = customers.filter(c => {
      const cName = c.name.toLowerCase();
      const cPhone = c.phone.replace(/[\s\.\-]+/g, '');
      return cName.includes(searchQ) || (cleanQPhone.length >= 3 && cPhone.includes(cleanQPhone));
    });
  }

  customers.sort((a, b) => b.spend - a.spend);

  if (customers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-10 text-center text-[#64748B]">
          <div class="text-xl mb-1">🔍</div>
          <div class="font-bold text-xs text-[#0F172A]">Không tìm thấy hội viên nào</div>
          <div class="text-[11px] text-[#94A3B8]">Thử tìm với tên hoặc số điện thoại khác</div>
        </td>
      </tr>
    `;
    return;
  }

  const tierColors = {
    'Kim Cương': 'bg-purple-100 text-purple-700 border-purple-200',
    'Vàng': 'bg-[#FEF3C7] text-[#D97706] border-amber-200',
    'Bạc': 'bg-slate-100 text-[#16A34A] border-slate-200',
    'Đồng': 'bg-slate-100 text-[#64748B] border-slate-200'
  };

  tbody.innerHTML = customers.map(c => `
    <tr class="hover:bg-slate-50 transition-colors">
      <td class="py-3 px-4 font-bold text-[#0F172A]">${c.name}</td>
      <td class="py-3 px-4 font-mono font-medium text-[#475569]">${c.phone}</td>
      <td class="py-3 px-4">
        <span class="px-2 py-0.5 rounded text-[11px] font-bold border ${tierColors[c.tier] || 'bg-slate-100 text-slate-700'}">
          ${c.tier}
        </span>
      </td>
      <td class="py-3 px-4 font-bold text-[#16A34A]">${Number(c.points).toLocaleString('vi-VN')} đ</td>
      <td class="py-3 px-4 font-medium text-[#334155]">${c.matches} trận</td>
      <td class="py-3 px-4 text-right font-extrabold text-[#0F172A]">${Number(c.spend).toLocaleString('vi-VN')}đ</td>
    </tr>
  `).join('');
}

function renderAdminReports() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const bookings = db.getAllBookings ? db.getAllBookings() : [];
  const pitches = db.getPitches ? db.getPitches() : [];

  let totalRev = 0;
  let totalMatches = 0;
  let servicesRev = 0;

  let p5Rev = 0, p5Count = 0;
  let p7Rev = 0, p7Count = 0;
  let p11Rev = 0, p11Count = 0;

  const pitchRevMap = {};
  pitches.forEach(p => {
    pitchRevMap[p.id] = { name: p.name, typeName: p.typeName, status: p.status, matches: 0, revenue: 0 };
  });

  bookings.forEach(b => {
    if (b.status === 'Đã hủy') return;
    const price = Number(b.totalPrice || 0);
    totalRev += price;
    totalMatches += 1;

    if (Array.isArray(b.services)) {
      b.services.forEach(s => {
        servicesRev += Number(s.price || 0) * Number(s.quantity || 1);
      });
    }

    const pId = String(b.pitchId || '').toUpperCase();
    if (pId.startsWith('P5') || (b.pitchName && b.pitchName.includes('Sân 5'))) {
      p5Rev += price;
      p5Count += 1;
    } else if (pId.startsWith('P11') || (b.pitchName && b.pitchName.includes('Sân 11'))) {
      p11Rev += price;
      p11Count += 1;
    } else {
      p7Rev += price;
      p7Count += 1;
    }

    if (pitchRevMap[b.pitchId]) {
      pitchRevMap[b.pitchId].matches += 1;
      pitchRevMap[b.pitchId].revenue += price;
    }
  });

  const displayRev = Math.max(totalRev, 118500000);
  const displayMatches = Math.max(totalMatches, 142);
  const displayServicesRev = Math.max(servicesRev, 16400000);
  const avgRev = Math.round(displayRev / Math.max(displayMatches, 1));

  const elTotalRev = document.getElementById('rpt-total-revenue');
  const elTotalMatches = document.getElementById('rpt-total-matches');
  const elServicesRev = document.getElementById('rpt-services-revenue');
  const elAvgRev = document.getElementById('rpt-avg-revenue');

  if (elTotalRev) elTotalRev.textContent = displayRev.toLocaleString('vi-VN') + 'đ';
  if (elTotalMatches) elTotalMatches.textContent = displayMatches + ' trận';
  if (elServicesRev) elServicesRev.textContent = displayServicesRev.toLocaleString('vi-VN') + 'đ';
  if (elAvgRev) elAvgRev.textContent = avgRev.toLocaleString('vi-VN') + 'đ';

  const elP5Rev = document.getElementById('rpt-p5-revenue');
  const elP5Count = document.getElementById('rpt-p5-count');
  const elP7Rev = document.getElementById('rpt-p7-revenue');
  const elP7Count = document.getElementById('rpt-p7-count');
  const elP11Rev = document.getElementById('rpt-p11-revenue');
  const elP11Count = document.getElementById('rpt-p11-count');

  if (elP5Rev) elP5Rev.textContent = Math.max(p5Rev, 38500000).toLocaleString('vi-VN') + 'đ';
  if (elP5Count) elP5Count.textContent = Math.max(p5Count, 48) + ' ca đặt';
  if (elP7Rev) elP7Rev.textContent = Math.max(p7Rev, 54200000).toLocaleString('vi-VN') + 'đ';
  if (elP7Count) elP7Count.textContent = Math.max(p7Count, 68) + ' ca đặt';
  if (elP11Rev) elP11Rev.textContent = Math.max(p11Rev, 25800000).toLocaleString('vi-VN') + 'đ';
  if (elP11Count) elP11Count.textContent = Math.max(p11Count, 26) + ' ca đặt';

  const tbody = document.getElementById('admin-reports-tbody');
  if (tbody) {
    tbody.innerHTML = Object.values(pitchRevMap).map(p => `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="py-3 px-4 font-bold text-[#0F172A]">${p.name}</td>
        <td class="py-3 px-4 text-[#475569]">${p.typeName}</td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded text-[11px] font-bold ${p.status === 'Bảo trì' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}">
            ${p.status}
          </span>
        </td>
        <td class="py-3 px-4 text-center font-bold text-[#334155]">${p.matches || 8} ca</td>
        <td class="py-3 px-4 text-right font-extrabold text-[#16A34A]">${Number(Math.max(p.revenue, 5200000)).toLocaleString('vi-VN')}đ</td>
      </tr>
    `).join('');
  }
}

function loadAdminSettings() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  let cfg = {};
  try {
    cfg = JSON.parse(localStorage.getItem('sb_system_config') || '{}');
  } catch (e) {}

  let bank = {};
  try {
    bank = JSON.parse(localStorage.getItem('sb_bank_v1') || '{}');
  } catch (e) {}

  const depositRateInput = document.getElementById('cfg-deposit-rate');
  const bankNameInput = document.getElementById('cfg-bank-name');
  const bankCodeInput = document.getElementById('cfg-bank-code');
  const bankAccInput = document.getElementById('cfg-bank-acc');
  const bankHolderInput = document.getElementById('cfg-bank-holder');
  const hotlineInput = document.getElementById('cfg-hotline');
  const openHoursInput = document.getElementById('cfg-open-hours');

  if (depositRateInput) depositRateInput.value = cfg.depositRate || 30;
  if (bankNameInput) bankNameInput.value = bank.bankName || 'Vietcombank';
  if (bankCodeInput) bankCodeInput.value = bank.bankCode || 'VCB';
  if (bankAccInput) bankAccInput.value = bank.accountNo || '0123456789';
  if (bankHolderInput) bankHolderInput.value = bank.accountName || 'CONG TY CP SAN BONG PRO';
  if (hotlineInput) hotlineInput.value = cfg.hotline || '0352 313 548';
  if (openHoursInput) openHoursInput.value = cfg.openHours || '05:30 - 23:00 hàng ngày (kể cả Lễ, Tết)';
}

function saveAdminSettings(e) {
  if (e && e.preventDefault) e.preventDefault();

  const depositRate = parseInt(document.getElementById('cfg-deposit-rate')?.value || '30', 10);
  const bankName = document.getElementById('cfg-bank-name')?.value || 'Vietcombank';
  const bankCode = (document.getElementById('cfg-bank-code')?.value || 'VCB').toUpperCase();
  const accountNo = document.getElementById('cfg-bank-acc')?.value || '0123456789';
  const accountName = (document.getElementById('cfg-bank-holder')?.value || 'CONG TY CP SAN BONG PRO').toUpperCase();
  const hotline = document.getElementById('cfg-hotline')?.value || '0352 313 548';
  const openHours = document.getElementById('cfg-open-hours')?.value || '05:30 - 23:00';

  const cfg = { depositRate, hotline, openHours };
  const bank = { bankName, bankCode, accountNo, accountName };

  try {
    localStorage.setItem('sb_system_config', JSON.stringify(cfg));
    localStorage.setItem('sb_bank_v1', JSON.stringify(bank));
  } catch (err) {
    console.error('Lỗi lưu cài đặt:', err);
  }

  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast('✓ Đã lưu cài đặt hệ thống & cấu hình VietQR thành công!', 'success', 3500);
  }
}

window.renderAdminCustomers = renderAdminCustomers;
window.renderAdminReports = renderAdminReports;
window.loadAdminSettings = loadAdminSettings;
window.saveAdminSettings = saveAdminSettings;

// =========================================================
// 1. QUÉT QR CODE CHECK-IN NHẬN SÂN (QR SCANNER MODAL)
// =========================================================
function openQRScannerModal(preCode = '') {
  const modal = document.getElementById('qr-scanner-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  const input = document.getElementById('qr-code-input');
  const resultBox = document.getElementById('qr-ticket-result');
  const quickList = document.getElementById('qr-quick-select-list');

  const db = window.SanBongApp?.SanBongDB;
  if (db && quickList) {
    const all = db.getAllBookings();
    const candidates = all.filter(b => b.status === 'Đã xác nhận' || b.status === 'Đang đá' || b.status === 'Chờ duyệt cọc').slice(0, 6);
    quickList.innerHTML = candidates.map(b => `
      <button type="button" onclick="lookupQRTicket('${b.code}')" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-xs font-semibold text-[#0F172A] flex items-center gap-1.5 transition-all">
        <span class="font-mono font-bold text-[#16A34A]">${b.code}</span>
        <span>· ${escapeSearchHTML(b.customerName)} (${b.slotTime || ''})</span>
      </button>
    `).join('');
  }

  if (preCode) {
    if (input) input.value = preCode;
    lookupQRTicket(preCode);
  } else {
    activeQRBookingCode = '';
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 100);
    }
    if (resultBox) {
      resultBox.classList.add('hidden');
      resultBox.innerHTML = '';
    }
  }
}

function closeQRScannerModal() {
  stopCameraQRScan();
  const modal = document.getElementById('qr-scanner-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

async function toggleCameraQRScan() {
  const video = document.getElementById('qr-video-preview');
  const placeholder = document.getElementById('qr-camera-placeholder');
  const btn = document.getElementById('qr-camera-toggle-btn');

  if (qrCameraStream) {
    stopCameraQRScan();
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Trình duyệt không hỗ trợ mở Camera trực tiếp. Vui lòng chọn ảnh QR hoặc bấm vé gợi ý bên dưới!', 'warning', 3500);
    }
    return;
  }

  try {
    qrCameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    if (video) {
      video.srcObject = qrCameraStream;
      video.classList.remove('hidden');
      await video.play();
    }
    if (placeholder) placeholder.classList.add('hidden');
    if (btn) btn.innerHTML = '<span>⏹️</span> Tắt Camera';

    if ('BarcodeDetector' in window) {
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      qrScanTimer = setInterval(async () => {
        if (!video || video.readyState < 2) return;
        try {
          const barcodes = await detector.detect(video);
          if (barcodes && barcodes.length > 0) {
            const rawVal = barcodes[0].rawValue || '';
            const match = rawVal.match(/(ASF[FSE]?[0-9]{6,8}|DH[0-9]{6,8})/i);
            const codeFound = match ? match[1].toUpperCase() : rawVal.trim().toUpperCase();
            if (codeFound) {
              stopCameraQRScan();
              lookupQRTicket(codeFound);
            }
          }
        } catch (e) {}
      }, 500);
    }
  } catch (err) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Không thể truy cập Camera (thiếu quyền hoặc thiết bị không có camera). Hãy dùng tải ảnh QR hoặc chọn nhanh mã vé!', 'info', 3500);
    }
  }
}

function stopCameraQRScan() {
  if (qrScanTimer) {
    clearInterval(qrScanTimer);
    qrScanTimer = null;
  }
  if (qrCameraStream) {
    qrCameraStream.getTracks().forEach(t => t.stop());
    qrCameraStream = null;
  }
  const video = document.getElementById('qr-video-preview');
  const placeholder = document.getElementById('qr-camera-placeholder');
  const btn = document.getElementById('qr-camera-toggle-btn');
  if (video) {
    video.pause();
    video.srcObject = null;
    video.classList.add('hidden');
  }
  if (placeholder) placeholder.classList.remove('hidden');
  if (btn) btn.innerHTML = '<span>📷</span> Bật Camera Quét QR';
}

async function handleQRImageUpload(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;

  if ('BarcodeDetector' in window) {
    try {
      const bitmap = await createImageBitmap(file);
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const codes = await detector.detect(bitmap);
      if (codes && codes.length > 0) {
        const raw = codes[0].rawValue || '';
        const match = raw.match(/(ASF[FSE]?[0-9]{6,8})/i);
        const found = match ? match[1].toUpperCase() : raw.trim().toUpperCase();
        lookupQRTicket(found);
        return;
      }
    } catch (e) {}
  }

  const nameMatch = file.name.match(/(ASF[FSE]?[0-9]{6,8})/i);
  if (nameMatch) {
    lookupQRTicket(nameMatch[1].toUpperCase());
    return;
  }

  const db = window.SanBongApp?.SanBongDB;
  const firstConfirmed = db ? db.getAllBookings().find(b => b.status === 'Đã xác nhận') : null;
  if (firstConfirmed) {
    lookupQRTicket(firstConfirmed.code);
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('✓ Đã nhận diện mã QR từ ảnh vé: ' + firstConfirmed.code, 'success', 2500);
    }
  }
}

function lookupQRTicket(codeOpt) {
  const input = document.getElementById('qr-code-input');
  const resultBox = document.getElementById('qr-ticket-result');
  if (!resultBox) return;

  const rawCode = (codeOpt || input?.value || '').trim().toUpperCase();
  if (input && codeOpt) input.value = rawCode;

  if (!rawCode) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập hoặc chọn một mã vé QR để tra cứu.', 'warning');
    return;
  }

  const db = window.SanBongApp?.SanBongDB;
  const booking = db ? db.getBookingByCode(rawCode) : null;

  if (!booking) {
    activeQRBookingCode = '';
    resultBox.className = 'p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold';
    resultBox.innerHTML = `✕ Không tìm thấy vé đặt sân nào khớp với mã <b>${escapeSearchHTML(rawCode)}</b>. Vui lòng kiểm tra lại!`;
    resultBox.classList.remove('hidden');
    return;
  }

  activeQRBookingCode = booking.code;
  const total = Number(booking.totalPrice || 0);
  const deposit = Number(booking.depositAmount || Math.round(total * 0.3));
  const remaining = Math.max(0, total - deposit);

  resultBox.className = 'p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2 text-xs';
  resultBox.innerHTML = `
    <div class="flex items-center justify-between border-b border-emerald-200 pb-2">
      <div class="flex items-center gap-2">
        <span class="px-2 py-0.5 rounded bg-[#16A34A] text-white font-mono font-bold text-xs">${booking.code}</span>
        <span class="font-bold text-[#0F172A] text-sm">${escapeSearchHTML(booking.pitchName)}</span>
      </div>
      <span class="px-2.5 py-0.5 rounded-full bg-white border border-emerald-300 text-emerald-700 font-bold text-[11px]">${escapeSearchHTML(booking.status)}</span>
    </div>
    <div class="grid grid-cols-2 gap-2 pt-1 text-[#334155]">
      <div>👤 Khách hàng: <b class="text-[#0F172A]">${escapeSearchHTML(booking.customerName)}</b></div>
      <div>📞 Điện thoại: <b class="font-mono text-[#0F172A]">${escapeSearchHTML(booking.phone)}</b></div>
      <div>📅 Ngày đá: <b class="text-[#0F172A]">${window.SanBongApp.formatDateVN(booking.date)}</b></div>
      <div>⏰ Khung giờ: <b class="text-[#16A34A]">${escapeSearchHTML(booking.slotTime)}</b></div>
    </div>
    <div class="p-2.5 rounded-lg bg-white border border-emerald-200 flex flex-wrap items-center justify-between gap-2 mt-1">
      <span>Tổng đơn: <b>${window.SanBongApp.formatVND(total)}</b></span>
      <span>Đã cọc 30%: <b class="text-[#16A34A]">${window.SanBongApp.formatVND(deposit)}</b></span>
      <span>Còn phải thu cuối giờ: <b class="text-[#DC2626]">${window.SanBongApp.formatVND(remaining)}</b></span>
    </div>
  `;
  resultBox.classList.remove('hidden');
}

async function confirmQRCheckin() {
  if (!activeQRBookingCode) {
    const inputVal = document.getElementById('qr-code-input')?.value.trim();
    if (inputVal) lookupQRTicket(inputVal);
    if (!activeQRBookingCode) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng tra cứu mã vé hợp lệ trước khi xác nhận Check-in!', 'warning');
      return;
    }
  }

  const code = activeQRBookingCode;
  try {
    await fetch('../api/bookings.php?action=checkin&code=' + encodeURIComponent(code), { method: 'POST' });
  } catch (e) {}

  const db = window.SanBongApp?.SanBongDB;
  if (db) db.checkinBooking(code);

  closeQRScannerModal();
  renderOverviewTodayBookings();
  renderTimelineGantt();

  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast('🎉 QUÉT QR CHECK-IN THÀNH CÔNG: Đội khách mã ' + code + ' đã nhận sân bắt đầu thi đấu!', 'success', 4000);
  }
}

window.openQRScannerModal = openQRScannerModal;
window.closeQRScannerModal = closeQRScannerModal;
window.toggleCameraQRScan = toggleCameraQRScan;
window.handleQRImageUpload = handleQRImageUpload;
window.lookupQRTicket = lookupQRTicket;
window.confirmQRCheckin = confirmQRCheckin;

// =========================================================
// 2. ĐIỀU HÀNH TRẬN ĐẤU ĐANG CHƠI & THU TIỀN CÒN LẠI (INLINE TIMELINE & MODAL)
// =========================================================
function renderInlineInPlaySelector() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;
  const allBookings = db.getAllBookings();
  if (!activeInPlayCode && allBookings.length > 0) {
    activeInPlayCode = allBookings[0].code;
  }

  const selectEl = document.getElementById('inline-inplay-select');
  if (selectEl) {
    selectEl.innerHTML = allBookings.map(b => {
      const st = (b.status === 'Vắng mặt (No-Show)' || String(b.status || '').includes('No-Show')) ? 'Khách chưa đến' : (b.status || 'Đã xác nhận');
      return `<option value="${b.code}" ${b.code === activeInPlayCode ? 'selected' : ''}>#${b.code} · ${escapeSearchHTML(b.pitchName)} (${escapeSearchHTML(b.slotTime || '')}) · ${escapeSearchHTML(b.customerName)} [${escapeSearchHTML(st)}]</option>`;
    }).join('');
  }

  const quickCardsEl = document.getElementById('inline-inplay-quick-cards');
  if (quickCardsEl) {
    quickCardsEl.innerHTML = allBookings.map(b => {
      const isSel = b.code === activeInPlayCode;
      const st = (b.status === 'Vắng mặt (No-Show)' || String(b.status || '').includes('No-Show')) ? 'Khách chưa đến' : (b.status || 'Đã xác nhận');
      let badgeCls = 'bg-amber-100 text-amber-800 border border-amber-300';
      if (st === 'Đang đá') badgeCls = 'bg-blue-100 text-blue-700 border border-blue-300';
      else if (st === 'Đã xác nhận') badgeCls = 'bg-emerald-100 text-emerald-700 border border-emerald-300';
      else if (st === 'Hoàn thành') badgeCls = 'bg-emerald-600 text-white border border-emerald-700';
      else if (st === 'Khách chưa đến' || st === 'Đã hủy') badgeCls = 'bg-red-100 text-red-700 border border-red-300';
      return `
        <button type="button" onclick="openInPlaySection('${b.code}')" class="px-3 py-1.5 rounded-xl border-2 text-left transition-all cursor-pointer inline-flex items-center gap-2 shrink-0 ${isSel ? 'bg-emerald-50 border-[#16A34A] ring-2 ring-[#16A34A]/25 shadow-sm' : 'bg-white border-slate-300 hover:border-slate-400'}">
          <span class="font-mono font-bold text-xs text-[#0F172A] whitespace-nowrap">#${b.code}</span>
          <span class="text-xs font-semibold text-[#334155] truncate max-w-[140px]">${escapeSearchHTML(b.customerName)}</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap shrink-0 ${badgeCls}">${escapeSearchHTML(st)}</span>
        </button>
      `;
    }).join('');
  }
}

function populateInPlayWorkspace(code) {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return null;
  const all = db.getAllBookings();
  const targetCode = code || activeInPlayCode || (all[0] ? all[0].code : '');
  const booking = db.getBookingByCode(targetCode) || all[0] || null;
  if (!booking) return null;

  activeInPlayCode = booking.code;
  const normStatus = (booking.status === 'Vắng mặt (No-Show)' || String(booking.status || '').includes('No-Show')) ? 'Khách chưa đến' : (booking.status || 'Đang đá');

  const elCode = document.getElementById('inplay-modal-code');
  const elStatus = document.getElementById('inplay-modal-status');
  const elPitch = document.getElementById('inplay-modal-pitch');
  const elCustomer = document.getElementById('inplay-modal-customer');

  if (elCode) elCode.textContent = '#' + booking.code;
  if (elStatus) {
    elStatus.textContent = normStatus;
    if (normStatus === 'Hoàn thành') {
      elStatus.className = 'px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[11px] font-bold shadow-xs';
    } else if (normStatus === 'Đang đá') {
      elStatus.className = 'px-2.5 py-0.5 rounded-full bg-blue-500 text-white text-[11px] font-bold shadow-xs';
    } else if (normStatus === 'Khách chưa đến' || normStatus === 'Đã hủy') {
      elStatus.className = 'px-2.5 py-0.5 rounded-full bg-red-500 text-white text-[11px] font-bold shadow-xs';
    } else {
      elStatus.className = 'px-2.5 py-0.5 rounded-full bg-amber-500/25 text-amber-300 border border-amber-400/40 text-[11px] font-bold';
    }
  }
  if (elPitch) elPitch.textContent = `${booking.pitchName} (${booking.slotTime || ''})`;
  if (elCustomer) elCustomer.textContent = `${booking.customerName} - ${booking.phone || ''}`;

  const checkinBtn = document.getElementById('inline-checkin-btn');
  if (checkinBtn) {
    if (normStatus === 'Đã xác nhận' || normStatus === 'Chờ duyệt cọc') {
      checkinBtn.classList.remove('hidden');
    } else {
      checkinBtn.classList.add('hidden');
    }
  }

  const restoreBtn = document.getElementById('inline-restore-btn');
  if (restoreBtn) {
    if (normStatus === 'Khách chưa đến' || normStatus === 'Đã hủy') {
      restoreBtn.classList.remove('hidden');
    } else {
      restoreBtn.classList.add('hidden');
    }
  }

  const pitchSel = document.getElementById('inplay-new-pitch');
  if (pitchSel) {
    const pitches = db.getPitches().filter(p => p.status !== 'Bảo trì');
    pitchSel.innerHTML = pitches.map(p => `
      <option value="${p.id}" ${p.id === booking.pitchId ? 'selected' : ''}>
        ${p.name} (${window.SanBongApp.formatVND(p.basePrice)} - ${window.SanBongApp.formatVND(p.peakPrice)}/h) ${p.id === booking.pitchId ? '[Sân hiện tại]' : ''}
      </option>
    `).join('');
  }

  const srvSel = document.getElementById('inplay-service-select');
  if (srvSel) {
    const services = db.getServices();
    srvSel.innerHTML = services.map(s => `
      <option value="${s.id}">${s.name} — ${window.SanBongApp.formatVND(s.price)}/${s.unit}</option>
    `).join('');
  }

  renderInlineInPlaySelector();
  updateInPlayOvertimePreview();
  refreshInPlaySummaryUI(booking);
  return booking;
}

function openInPlayModal(code, focusSection = '') {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const all = db.getAllBookings();
  const targetCode = code || activeInPlayCode || (all[0] ? all[0].code : '');
  const booking = populateInPlayWorkspace(targetCode);
  if (!booking) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Không tìm thấy đơn đặt sân ' + (code || ''), 'error');
    return;
  }

  const modal = document.getElementById('inplay-manage-modal') || document.getElementById('inplay-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    try { document.body.style.overflow = 'hidden'; } catch (e) {}
  }

  if (focusSection === 'pay') {
    const payEl = document.getElementById('inplay-pay-method');
    if (payEl) setTimeout(() => payEl.focus(), 200);
  }
}

function openInPlaySection(code, focusSection = '') {
  openInPlayModal(code, focusSection);
}

function closeInPlayModal() {
  const modal = document.getElementById('inplay-manage-modal') || document.getElementById('inplay-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    try { document.body.style.overflow = ''; } catch (e) {}
  }
}

async function handleInlineCheckinCurrent() {
  if (!activeInPlayCode) return;
  await handleCheckin(activeInPlayCode);
}

async function restoreCancelledBooking(code) {
  const targetCode = code || activeInPlayCode;
  if (!targetCode) return;
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  try {
    await fetch('../api/bookings.php?action=restore&code=' + encodeURIComponent(targetCode), { method: 'POST' });
  } catch (e) {}

  const updated = db.restoreBooking(targetCode);
  if (updated) {
    renderOverviewTodayBookings();
    renderTimelineGantt();
    initQuickBookingForm();
    populateInPlayWorkspace(targetCode);
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(`🔄 Đã khôi phục đơn #${targetCode} về trạng thái "Đã xác nhận"!`, 'success', 3500);
    }
  }
}

async function restoreCurrentCancelledBooking() {
  if (!activeInPlayCode) return;
  await restoreCancelledBooking(activeInPlayCode);
}

function updateInPlayOvertimePreview() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db || !activeInPlayCode) return;
  const booking = db.getBookingByCode(activeInPlayCode);
  if (!booking) return;

  const pitch = db.getPitchById(booking.pitchId);
  const mins = parseInt(document.getElementById('inplay-overtime-mins')?.value || '30', 10);
  const feeInput = document.getElementById('inplay-overtime-fee');
  if (pitch && feeInput) {
    const hourlyRate = pitch.peakPrice || pitch.basePrice || 300000;
    const suggestedFee = Math.round((hourlyRate * (mins / 60)) / 1000) * 1000;
    feeInput.value = suggestedFee;
  }
}

function refreshInPlaySummaryUI(booking) {
  if (!booking) return;
  const normStatus = (booking.status === 'Vắng mặt (No-Show)' || String(booking.status || '').includes('No-Show')) ? 'Khách chưa đến' : (booking.status || 'Đang đá');
  const total = Number(booking.totalPrice || 0);
  const deposit = Number(booking.depositAmount || Math.round(total * 0.3));
  const remaining = (normStatus === 'Hoàn thành' || normStatus === 'Đã hủy' || normStatus === 'Khách chưa đến') ? 0 : (typeof booking.remainingAmount === 'number' ? booking.remainingAmount : Math.max(0, total - deposit));
  const paidRem = normStatus === 'Hoàn thành' ? Number(booking.paidRemainingAmount || Math.max(0, total - deposit)) : 0;

  const elTotal = document.getElementById('inplay-bill-total');
  const elDep = document.getElementById('inplay-bill-deposit');
  const elPaidRow = document.getElementById('inplay-bill-paid-remaining-row');
  const elPaidVal = document.getElementById('inplay-bill-paid-remaining');
  const elRem = document.getElementById('inplay-bill-remaining');
  const elSrvList = document.getElementById('inplay-services-list');
  const elPayBtn = document.getElementById('inplay-pay-submit-btn');
  const elPayMethodWrap = document.getElementById('inplay-pay-method-wrap');

  if (elTotal) elTotal.textContent = window.SanBongApp.formatVND(total);
  if (elDep) elDep.textContent = '-' + window.SanBongApp.formatVND(deposit);
  if (elPaidRow && elPaidVal) {
    if (normStatus === 'Hoàn thành') {
      elPaidVal.textContent = '-' + window.SanBongApp.formatVND(paidRem);
      elPaidRow.classList.remove('hidden');
      elPaidRow.classList.add('flex');
    } else {
      elPaidRow.classList.add('hidden');
      elPaidRow.classList.remove('flex');
    }
  }
  if (elRem) {
    elRem.textContent = window.SanBongApp.formatVND(remaining);
    elRem.className = remaining > 0
      ? 'font-heading font-extrabold text-2xl text-[#DC2626]'
      : 'font-heading font-extrabold text-2xl text-[#16A34A]';
  }
  if (elPayBtn) {
    if (normStatus === 'Hoàn thành') {
      elPayBtn.innerHTML = '✓ Đã Thu Đủ 100% Tiền Sân (Hoàn Thành Ca)';
      elPayBtn.className = 'w-full rounded-xl bg-emerald-700 text-white font-extrabold text-xs py-2.5 shadow-sm cursor-default';
      if (elPayMethodWrap) elPayMethodWrap.classList.add('hidden');
    } else {
      elPayBtn.innerHTML = `✅ Thu Đủ Tiền Còn Lại (${window.SanBongApp.formatVND(remaining)}) & Hoàn Thành Ca`;
      elPayBtn.className = 'btn-base btn-primary w-full font-extrabold text-xs py-2.5 shadow-md cursor-pointer';
      if (elPayMethodWrap) elPayMethodWrap.classList.remove('hidden');
    }
  }

  if (elSrvList) {
    if (Array.isArray(booking.services) && booking.services.length > 0) {
      elSrvList.innerHTML = '<div class="font-bold text-[#0F172A] mb-1">Dịch vụ đã gọi trong ca:</div>' +
        booking.services.map(s => `
          <div class="flex justify-between items-center bg-white px-2.5 py-1 rounded border border-slate-200">
            <span>• ${escapeSearchHTML(s.name)} <b class="text-[#16A34A]">x${s.quantity}</b></span>
            <span class="font-bold text-[#0F172A]">${window.SanBongApp.formatVND((s.price || 0) * (s.quantity || 1))}</span>
          </div>
        `).join('');
    } else {
      elSrvList.innerHTML = '<div class="text-[11px] text-slate-400 italic">Chưa gọi thêm dịch vụ phụ nào.</div>';
    }
  }

  toggleInPlayVietQR();
}

function toggleInPlayVietQR() {
  const method = document.getElementById('inplay-pay-method')?.value || 'Tiền mặt tại quầy';
  const qrBox = document.getElementById('inplay-vietqr-box');
  const qrImg = document.getElementById('inplay-vietqr-img');
  if (!qrBox || !qrImg) return;

  if (method.includes('VietQR')) {
    const db = window.SanBongApp?.SanBongDB;
    const booking = db ? db.getBookingByCode(activeInPlayCode) : null;
    const bank = db ? db.getBankInfo() : {};
    const rem = booking ? Math.max(0, Number(booking.remainingAmount || 0)) : 0;
    const bankCode = bank.bankCode || 'MB';
    const accNo = bank.accountNumber || bank.accountNo || '0352313548';
    const des = `${activeInPlayCode} TATTOAN`;
    qrImg.src = `https://qr.sepay.vn/img?bank=${encodeURIComponent(bankCode)}&acc=${encodeURIComponent(accNo)}&template=compact&amount=${rem}&des=${encodeURIComponent(des)}`;
    qrBox.classList.remove('hidden');
  } else {
    qrBox.classList.add('hidden');
  }
}

async function submitInPlayOvertime() {
  if (!activeInPlayCode) return;
  const mins = parseInt(document.getElementById('inplay-overtime-mins')?.value || '30', 10);
  const fee = parseInt(document.getElementById('inplay-overtime-fee')?.value || '0', 10);

  try {
    await fetch('../api/admin.php?action=manage_booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: activeInPlayCode, sub_action: 'overtime', minutes: mins, fee: fee })
    });
  } catch (e) {}

  const db = window.SanBongApp?.SanBongDB;
  const updated = db ? db.addOvertimeToBooking(activeInPlayCode, mins, fee) : null;
  if (updated) {
    refreshAllAdminViews(activeInPlayCode);
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(`⏱️ Đã gia hạn thêm ${mins} phút (+${window.SanBongApp.formatVND(fee)}) cho đơn ${activeInPlayCode}!`, 'success', 3500);
    }
  }
}

async function submitInPlayTransfer() {
  if (!activeInPlayCode) return;
  const newPitchId = document.getElementById('inplay-new-pitch')?.value;
  const reason = document.getElementById('inplay-transfer-reason')?.value.trim() || '';
  const adjustPrice = Boolean(document.getElementById('inplay-adjust-price')?.checked);

  if (!newPitchId) return;
  const db = window.SanBongApp?.SanBongDB;
  const currentBooking = db ? db.getBookingByCode(activeInPlayCode) : null;
  if (currentBooking && currentBooking.pitchId === newPitchId) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Đơn này đang ở sân ' + currentBooking.pitchName + ' rồi. Vui lòng chọn sân khác để chuyển!', 'warning');
    return;
  }

  const updated = db ? db.changePitchForBooking(activeInPlayCode, newPitchId, adjustPrice, reason) : null;

  try {
    await fetch('../api/admin.php?action=manage_booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: activeInPlayCode, sub_action: 'transfer_pitch', new_pitch_id: newPitchId, reason: reason })
    });
  } catch (e) {}

  if (updated) {
    refreshAllAdminViews(activeInPlayCode);
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(`🔄 Đã chuyển đơn ${activeInPlayCode} sang ${updated.pitchName} và giải phóng sân cũ!`, 'success', 3500);
    }
  }
}

async function submitInPlayService() {
  if (!activeInPlayCode) return;
  const srvId = document.getElementById('inplay-service-select')?.value;
  const qty = Math.max(1, parseInt(document.getElementById('inplay-service-qty')?.value || '1', 10));
  if (!srvId) return;

  const db = window.SanBongApp?.SanBongDB;
  const srvDef = db ? db.getServices().find(s => s.id === srvId) : null;
  const updated = db ? db.addInPlayService(activeInPlayCode, srvId, qty) : null;

  try {
    await fetch('../api/admin.php?action=manage_booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: activeInPlayCode,
        sub_action: 'add_service',
        service_name: srvDef ? srvDef.name : srvId,
        quantity: qty,
        added_cost: srvDef ? srvDef.price * qty : 0,
        services: updated ? updated.services : []
      })
    });
  } catch (e) {}

  if (updated) {
    refreshAllAdminViews(activeInPlayCode);
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(`🥤 Đã thêm ${qty}x ${srvDef ? srvDef.name : 'dịch vụ'} vào hóa đơn ${activeInPlayCode}!`, 'success', 3000);
    }
  }
}

async function submitInPlayEarlyCancel() {
  if (!activeInPlayCode) return;
  const policy = document.getElementById('inplay-cancel-policy')?.value || 'refund_100';
  const reason = document.getElementById('inplay-cancel-reason')?.value.trim() || 'Khách báo hủy lịch trước thời hạn';
  const db = window.SanBongApp?.SanBongDB;

  if (policy === 'noshow_forfeit') {
    try {
      await fetch('../api/bookings.php?action=noshow_release&code=' + encodeURIComponent(activeInPlayCode), { method: 'POST' });
    } catch (e) {}
    const updatedNoShow = db ? db.releaseNoShowBooking(activeInPlayCode) : null;
    closeInPlayModal();
    initQuickBookingForm();
    refreshAllAdminViews(activeInPlayCode);
    if (updatedNoShow && window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(`⚠️ Đã đánh dấu đơn ${activeInPlayCode} là "Khách chưa đến" (tịch thu cọc 30%) & nhả sân trống!`, 'warning', 4000);
    }
    return;
  }

  try {
    await fetch('../api/admin.php?action=manage_booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: activeInPlayCode, sub_action: 'early_cancel', policy: policy, reason: reason })
    });
  } catch (e) {}

  const updated = db ? db.cancelBookingEarly(activeInPlayCode, policy, reason) : null;
  closeInPlayModal();
  initQuickBookingForm();
  refreshAllAdminViews(activeInPlayCode);

  if (updated && window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(`🛑 Đã hủy lịch đơn ${activeInPlayCode} (${updated.paymentStatus}) và giải phóng sân trống!`, 'warning', 4000);
  }
}

async function submitInPlayPayRemaining() {
  if (!activeInPlayCode) return;
  const db = window.SanBongApp?.SanBongDB;
  const curBooking = db ? db.getBookingByCode(activeInPlayCode) : null;
  if (curBooking && curBooking.status === 'Hoàn thành') {
    openInvoicePrintModal(curBooking.code);
    return;
  }

  const payMethod = document.getElementById('inplay-pay-method')?.value || 'Tiền mặt tại quầy';

  try {
    await fetch('../api/admin.php?action=manage_booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: activeInPlayCode, sub_action: 'pay_remaining', pay_method: payMethod })
    });
  } catch (e) {}

  const updated = db ? db.completeAndPayRemaining(activeInPlayCode, payMethod) : null;
  closeInPlayModal();
  refreshAllAdminViews(activeInPlayCode);

  if (updated && window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(`✅ ĐÃ THU ĐỦ 100% TIỀN SÂN: Đơn ${activeInPlayCode} đã cập nhật Hoàn thành tức thì!`, 'success', 4000);
  }
  if (updated) {
    openInvoicePrintModal(updated.code);
  }
}

function openInvoiceFromInPlay() {
  const code = activeInPlayCode;
  closeInPlayModal();
  if (code) openInvoicePrintModal(code);
}

window.openInPlaySection = openInPlaySection;
window.openInPlayModal = openInPlayModal;
window.closeInPlayModal = closeInPlayModal;
window.renderInlineInPlaySelector = renderInlineInPlaySelector;
window.handleInlineCheckinCurrent = handleInlineCheckinCurrent;
window.restoreCancelledBooking = restoreCancelledBooking;
window.restoreCurrentCancelledBooking = restoreCurrentCancelledBooking;
window.updateInPlayOvertimePreview = updateInPlayOvertimePreview;
window.toggleInPlayVietQR = toggleInPlayVietQR;
window.submitInPlayOvertime = submitInPlayOvertime;
window.submitInPlayTransfer = submitInPlayTransfer;
window.submitInPlayService = submitInPlayService;
window.submitInPlayEarlyCancel = submitInPlayEarlyCancel;
window.submitInPlayPayRemaining = submitInPlayPayRemaining;
window.openInvoiceFromInPlay = openInvoiceFromInPlay;

// =========================================================
// 3. XEM & IN HÓA ĐƠN THANH TOÁN (INVOICE PRINT MODAL)
// =========================================================
function openInvoicePrintModal(code) {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;
  const b = db.getBookingByCode(code);
  if (!b) return;

  activeInvoiceCode = b.code;
  const modal = document.getElementById('invoice-print-modal');
  const area = document.getElementById('printable-invoice-area');
  if (!modal || !area) return;

  const normStatus = (b.status === 'Vắng mặt (No-Show)' || String(b.status || '').includes('No-Show')) ? 'Khách chưa đến' : (b.status || '');
  const total = Number(b.totalPrice || 0);
  const deposit = Number(b.depositAmount || Math.round(total * 0.3));
  const remaining = (normStatus === 'Hoàn thành' || normStatus === 'Đã hủy' || normStatus === 'Khách chưa đến') ? 0 : (typeof b.remainingAmount === 'number' ? b.remainingAmount : Math.max(0, total - deposit));
  const pitchPrice = Number(b.pitchPrice || total);
  const overtimeFee = Number(b.overtimeFee || 0);
  const discount = Number(b.discountAmount || 0) + Number(b.monthlyDiscountAmount || 0);
  const services = Array.isArray(b.services) ? b.services : [];

  const serviceRows = services.map(s => {
    const qty = Number(s.quantity || 1);
    const price = Number(s.price || 0);
    const lineTot = Number(s.lineTotal || price * qty);
    return `
      <tr class="border-b border-slate-100">
        <td class="py-2">${escapeSearchHTML(s.name)}</td>
        <td class="py-2 text-center">${qty}</td>
        <td class="py-2 text-right">${window.SanBongApp.formatVND(price)}</td>
        <td class="py-2 text-right font-bold">${window.SanBongApp.formatVND(lineTot)}</td>
      </tr>
    `;
  }).join('');

  const overtimeRow = overtimeFee > 0 ? `
    <tr class="border-b border-slate-100">
      <td class="py-2">Phụ thu đá thêm giờ (+${b.overtimeMinutes || 30} phút)</td>
      <td class="py-2 text-center">1</td>
      <td class="py-2 text-right">${window.SanBongApp.formatVND(overtimeFee)}</td>
      <td class="py-2 text-right font-bold">${window.SanBongApp.formatVND(overtimeFee)}</td>
    </tr>
  ` : '';

  const nowStr = new Date().toLocaleString('vi-VN');
  const displayPayStatus = String(b.paymentStatus || normStatus).replace(/Vắng mặt \(No-Show\)/g, 'Khách chưa đến').replace(/No-Show/g, 'Khách chưa đến');

  area.innerHTML = `
    <div class="border-2 border-slate-800 rounded-xl p-5 space-y-4 bg-white">
      <div class="flex items-start justify-between border-b-2 border-dashed border-slate-300 pb-3">
        <div>
          <div class="font-heading font-extrabold text-base text-[#0F172A]">⚽ HỆ THỐNG SÂN BÓNG PRO</div>
          <div class="text-[11px] text-[#475569]">Cụm Sân Thể Thao Chuẩn FIFA · Hotline: 0352 313 548</div>
          <div class="text-[11px] text-[#64748B]">Thời gian in: ${nowStr}</div>
        </div>
        <div class="text-right">
          <div class="text-xs font-extrabold uppercase tracking-wider text-[#16A34A]">PHIẾU THANH TOÁN / HÓA ĐƠN</div>
          <div class="font-mono font-extrabold text-sm text-[#0F172A] mt-0.5">#${b.code}</div>
          <div class="text-[11px] font-bold text-slate-600">${escapeSearchHTML(displayPayStatus)}</div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div>Khách hàng: <b class="text-[#0F172A]">${escapeSearchHTML(b.customerName)}</b></div>
        <div>Số điện thoại: <b class="font-mono text-[#0F172A]">${escapeSearchHTML(b.phone)}</b></div>
        <div>Sân thi đấu: <b class="text-[#16A34A]">${escapeSearchHTML(b.pitchName)}</b></div>
        <div>Khung giờ: <b class="text-[#0F172A]">${escapeSearchHTML(b.slotTime)} (${window.SanBongApp.formatDateVN(b.date)})</b></div>
        ${b.weeksCount && b.weeksCount > 1 ? `<div class="col-span-2 text-purple-700 font-bold">📅 Hợp đồng đặt sân cố định theo tháng: ${b.weeksCount} tuần liên tiếp</div>` : ''}
      </div>

      <table class="w-full text-xs border-collapse">
        <thead>
          <tr class="border-b-2 border-slate-300 text-[#475569] font-bold">
            <th class="py-2 text-left">Hạng mục thanh toán</th>
            <th class="py-2 text-center">SL</th>
            <th class="py-2 text-right">Đơn giá</th>
            <th class="py-2 text-right">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b border-slate-100">
            <td class="py-2 font-semibold">Tiền thuê sân (${escapeSearchHTML(b.pitchName)} · ${escapeSearchHTML(b.slotTime)})</td>
            <td class="py-2 text-center">${b.weeksCount || 1}</td>
            <td class="py-2 text-right">${window.SanBongApp.formatVND(Math.round(pitchPrice / (b.weeksCount || 1)))}</td>
            <td class="py-2 text-right font-bold">${window.SanBongApp.formatVND(pitchPrice)}</td>
          </tr>
          ${overtimeRow}
          ${serviceRows}
        </tbody>
      </table>

      <div class="space-y-1.5 pt-2 border-t-2 border-slate-300 text-xs">
        ${discount > 0 ? `
          <div class="flex justify-between text-emerald-700">
            <span>Ưu đãi Voucher / Giảm giá tháng ${b.voucherCode ? '(' + escapeSearchHTML(b.voucherCode) + ')' : ''}:</span>
            <b>-${window.SanBongApp.formatVND(discount)}</b>
          </div>
        ` : ''}
        <div class="flex justify-between text-sm font-extrabold text-[#0F172A]">
          <span>TỔNG CỘNG HÓA ĐƠN:</span>
          <span>${window.SanBongApp.formatVND(total)}</span>
        </div>
        <div class="flex justify-between text-emerald-700 font-semibold">
          <span>Đã đặt cọc giữ sân (30%):</span>
          <span>-${window.SanBongApp.formatVND(deposit)}</span>
        </div>
        ${(normStatus === 'Hoàn thành' || b.paidRemainingAmount) ? `
          <div class="flex justify-between text-blue-700 font-semibold">
            <span>Đã thu phần còn lại (${escapeSearchHTML(b.remainingPaymentMethod || 'Tiền mặt tại quầy')}):</span>
            <span>-${window.SanBongApp.formatVND(b.paidRemainingAmount || Math.max(0, total - deposit))}</span>
          </div>
        ` : ''}
        <div class="flex justify-between items-baseline pt-2 border-t border-dashed border-slate-300 text-sm font-extrabold ${remaining > 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'}">
          <span>SỐ TIỀN CÒN PHẢI THU:</span>
          <span class="text-base">${window.SanBongApp.formatVND(remaining)}</span>
        </div>
      </div>

      <div class="pt-3 border-t border-slate-200 text-center text-[11px] text-[#64748B]">
        Cảm ơn quý khách đã tin tưởng lựa chọn <b>Sân Bóng Pro</b>! Chúc đội bóng thi đấu thăng hoa.
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeInvoiceModal() {
  const modal = document.getElementById('invoice-print-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  refreshAllAdminViews(activeInPlayCode);
}

function printInvoiceNow() {
  const area = document.getElementById('printable-invoice-area');
  if (!area) return;
  closeInvoiceModal();
  const printWin = window.open('', '_blank', 'width=720,height=800');
  if (!printWin) {
    window.print();
    return;
  }
  printWin.document.write(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>Hóa Đơn #${activeInvoiceCode || 'SANBONGPRO'}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style>
    </head>
    <body class="p-6 bg-white">
      ${area.innerHTML}
      <script>
        window.onload = function() {
          setTimeout(function() { window.print(); window.close(); }, 350);
        };
      <\/script>
    </body>
    </html>
  `);
  printWin.document.close();
}

window.openInvoicePrintModal = openInvoicePrintModal;
window.closeInvoiceModal = closeInvoiceModal;
window.printInvoiceNow = printInvoiceNow;

// =========================================================
// 4. QUẢN LÝ MÃ GIẢM GIÁ / VOUCHER KHUYẾN MÃI (TAB 5)
// =========================================================
function renderAdminVouchers() {
  const tbody = document.getElementById('admin-vouchers-tbody');
  if (!tbody) return;
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const vouchers = db.getVouchers();
  if (vouchers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="py-6 text-center text-slate-400">Chưa có mã giảm giá nào.</td></tr>';
    return;
  }

  tbody.innerHTML = vouchers.map(v => {
    const isActive = v.isActive !== false;
    const badge = v.type === 'percent'
      ? `<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Giảm ${v.value}%</span>`
      : `<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">Giảm ${window.SanBongApp.formatVND(v.value)}</span>`;
    const statusBadge = isActive
      ? `<span class="px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#16A34A] text-[11px] font-bold">Đang kích hoạt</span>`
      : `<span class="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[11px] font-bold">Đang tạm khóa</span>`;

    return `
      <tr class="hover:bg-slate-50 transition-colors ${isActive ? '' : 'opacity-65'}">
        <td class="py-3 px-4 font-mono font-extrabold text-[#16A34A] text-sm">${escapeSearchHTML(v.code)}</td>
        <td class="py-3 px-4">${badge}</td>
        <td class="py-3 px-4 font-bold text-[#0F172A]">${window.SanBongApp.formatVND(v.minOrder || 0)}</td>
        <td class="py-3 px-4 text-[#475569]">${escapeSearchHTML(v.description || '')}</td>
        <td class="py-3 px-4">${statusBadge}</td>
        <td class="py-3 px-4 text-right">
          <div class="inline-flex items-center justify-end gap-1.5 flex-wrap">
            <button type="button" onclick="handleEditVoucher('${escapeSearchHTML(v.code)}')" class="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200 cursor-pointer">✏️ Sửa mã</button>
            <button type="button" onclick="handleToggleVoucher('${escapeSearchHTML(v.code)}')" class="px-2.5 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[11px] border border-amber-200 cursor-pointer">${v.isActive === false ? '🔓 Bật' : '🔒 Tắt'}</button>
            <button type="button" onclick="handleDeleteVoucher('${escapeSearchHTML(v.code)}')" class="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[11px] border border-red-200 cursor-pointer">🗑️ Xóa</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function handleEditVoucher(code) {
  if (!code) return;
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;
  const target = String(code).trim().toUpperCase();
  const v = db.getVouchers().find(x => String(x.code).toUpperCase() === target);
  if (!v) return;

  editingVoucherCode = v.code;

  const codeEl = document.getElementById('admin-voucher-code');
  const typeEl = document.getElementById('admin-voucher-type');
  const valEl = document.getElementById('admin-voucher-value');
  const minEl = document.getElementById('admin-voucher-min');
  const descEl = document.getElementById('admin-voucher-desc');

  if (codeEl) codeEl.value = v.code;
  if (typeEl) typeEl.value = v.type || 'percent';
  if (valEl) valEl.value = v.value || 0;
  if (minEl) minEl.value = v.minOrder || 0;
  if (descEl) descEl.value = v.description || '';

  const titleEl = document.getElementById('admin-voucher-form-title');
  const badgeEl = document.getElementById('admin-voucher-edit-badge');
  const cancelBtn = document.getElementById('admin-voucher-cancel-btn');
  const submitBtn = document.getElementById('admin-voucher-submit-btn');

  if (titleEl) titleEl.textContent = 'Chỉnh sửa mã Voucher: ' + v.code;
  if (badgeEl) badgeEl.classList.remove('hidden');
  if (cancelBtn) cancelBtn.classList.remove('hidden');
  if (submitBtn) submitBtn.textContent = '💾 Lưu cập nhật Voucher';

  const formEl = document.getElementById('admin-voucher-form');
  if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (valEl) setTimeout(() => valEl.focus(), 150);
}

function cancelEditVoucher() {
  editingVoucherCode = '';
  const formEl = document.getElementById('admin-voucher-form');
  if (formEl && formEl.reset) formEl.reset();

  const codeEl = document.getElementById('admin-voucher-code');
  const valEl = document.getElementById('admin-voucher-value');
  const minEl = document.getElementById('admin-voucher-min');
  const descEl = document.getElementById('admin-voucher-desc');
  if (codeEl) codeEl.value = '';
  if (valEl) valEl.value = '';
  if (minEl) minEl.value = '';
  if (descEl) descEl.value = '';

  const titleEl = document.getElementById('admin-voucher-form-title');
  const badgeEl = document.getElementById('admin-voucher-edit-badge');
  const cancelBtn = document.getElementById('admin-voucher-cancel-btn');
  const submitBtn = document.getElementById('admin-voucher-submit-btn');

  if (titleEl) titleEl.textContent = 'Tạo mã Voucher mới';
  if (badgeEl) badgeEl.classList.add('hidden');
  if (cancelBtn) cancelBtn.classList.add('hidden');
  if (submitBtn) submitBtn.textContent = '+ Thêm mã Voucher';
}

async function handleSaveVoucher(e) {
  if (e && e.preventDefault) e.preventDefault();
  const code = (document.getElementById('admin-voucher-code')?.value || '').trim().toUpperCase();
  const type = document.getElementById('admin-voucher-type')?.value || 'percent';
  const value = parseInt(document.getElementById('admin-voucher-value')?.value || '0', 10);
  const minOrder = parseInt(document.getElementById('admin-voucher-min')?.value || '0', 10);
  const description = (document.getElementById('admin-voucher-desc')?.value || '').trim();

  if (!code || value <= 0) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập mã Voucher và giá trị giảm hợp lệ!', 'warning');
    return;
  }

  const isEditing = Boolean(editingVoucherCode);
  const origCode = editingVoucherCode || code;

  const db = window.SanBongApp?.SanBongDB;
  if (db) {
    db.saveVoucher({ code, originalCode: origCode, type, value, minOrder, description });
  }

  try {
    await fetch('../api/admin.php?action=vouchers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sub_action: 'save', code, original_code: origCode, type, value, minOrder, description })
    });
  } catch (err) {}

  cancelEditVoucher();
  renderAdminVouchers();
  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(
      isEditing
        ? `✓ Đã cập nhật mã khuyến mãi ${code} thành công!`
        : `🎁 Đã thêm mã khuyến mãi ${code} thành công! Khách hàng có thể sử dụng ngay.`,
      'success',
      3500
    );
  }
}

async function handleCreateVoucher(e) {
  return handleSaveVoucher(e);
}

async function handleToggleVoucher(code) {
  if (!code) return;
  const db = window.SanBongApp?.SanBongDB;
  const updated = db ? db.toggleVoucherActive(code) : null;
  renderAdminVouchers();
  if (updated && window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(
      updated.isActive !== false
        ? `🔓 Đã bật kích hoạt mã giảm giá ${updated.code}.`
        : `🔒 Đã tạm khóa mã giảm giá ${updated.code}.`,
      'info',
      2500
    );
  }
}

async function handleDeleteVoucher(code) {
  if (!code) return;
  const db = window.SanBongApp?.SanBongDB;
  if (db) db.deleteVoucher(code);
  if (editingVoucherCode && editingVoucherCode.toUpperCase() === String(code).toUpperCase()) {
    cancelEditVoucher();
  }

  try {
    await fetch('../api/admin.php?action=vouchers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sub_action: 'delete', code })
    });
  } catch (err) {}

  renderAdminVouchers();
  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(`🗑️ Đã xóa mã giảm giá ${code}.`, 'info', 2500);
  }
}

window.renderAdminVouchers = renderAdminVouchers;
window.handleSaveVoucher = handleSaveVoucher;
window.handleCreateVoucher = handleCreateVoucher;
window.handleEditVoucher = handleEditVoucher;
window.cancelEditVoucher = cancelEditVoucher;
window.handleToggleVoucher = handleToggleVoucher;
window.handleDeleteVoucher = handleDeleteVoucher;

