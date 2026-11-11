
let activeModule = 'overview';
let currentPortalRole = 'staff';

const PORTAL_ALLOWED_TABS = {
  admin: ['overview', 'timeline', 'quick-booking', 'pitches', 'pricing', 'customers', 'payments', 'reports', 'settings'],
  manager: ['overview', 'timeline', 'quick-booking', 'pitches', 'customers', 'payments', 'reports'],
  staff: ['overview', 'timeline', 'quick-booking', 'pitches', 'customers']
};

function isOwnerAdmin() {
  return currentPortalRole === 'admin';
}
window.isOwnerAdmin = isOwnerAdmin;

function isManagerOrAdmin() {
  return currentPortalRole === 'admin' || currentPortalRole === 'manager';
}
window.isManagerOrAdmin = isManagerOrAdmin;

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

function updateAdminProfile(user) {
  if (!user) return;
  const nameEl = document.getElementById('admin-name');
  const avEl = document.getElementById('admin-avatar');
  const rawName = user.full_name || user.username || (user.role === 'staff' ? 'Nhân Viên Trực Sân' : (user.role === 'manager' ? 'Quản Lý Sân' : 'Quản Trị Viên'));
  const cleanName = rawName.replace(/\(.*?\)/g, '').trim() || rawName;
  if (nameEl) {
    nameEl.textContent = cleanName;
    nameEl.title = rawName;
  }
  if (avEl) {
    if (user.role === 'admin' && cleanName.toLowerCase().includes('quản trị')) {
      avEl.textContent = 'QT';
    } else if (user.role === 'manager' && cleanName.toLowerCase().includes('quản lý')) {
      avEl.textContent = 'QL';
    } else if (user.role === 'staff' && cleanName.toLowerCase().startsWith('nhân viên')) {
      avEl.textContent = 'NV';
    } else {
      const words = cleanName.split(/\s+/).filter(Boolean);
      let initials = user.role === 'admin' ? 'AD' : (user.role === 'manager' ? 'QL' : 'NV');
      if (words.length >= 2) {
        initials = (words[words.length - 2][0] + words[words.length - 1][0]).toUpperCase();
      } else if (words.length === 1) {
        initials = words[0].slice(0, 2).toUpperCase();
      }
      avEl.textContent = initials;
    }
  }
}

function applyRolePermissions() {
  let storedUser = null;
  try {
    storedUser = JSON.parse(sessionStorage.getItem('sb_current_user') || 'null');
  } catch (e) {}
  if (storedUser && storedUser.role) {
    currentPortalRole = storedUser.role;
    updateAdminProfile(storedUser);
  }

  const isAdmin = isOwnerAdmin();
  const isMgrOrAdmin = isManagerOrAdmin();
  const badgeEl = document.getElementById('sidebar-role-badge');
  if (badgeEl) {
    if (currentPortalRole === 'admin') {
      badgeEl.innerHTML = 'Chủ sân · <span class="text-[#16A34A] font-semibold">Toàn quyền</span>';
    } else if (currentPortalRole === 'manager') {
      badgeEl.innerHTML = 'Quản lý sân · <span class="text-[#7C3AED] font-semibold">Báo cáo, Kho &amp; Ca</span>';
    } else {
      badgeEl.innerHTML = 'Nhân viên trực · <span class="text-[#2563EB] font-semibold">Vận hành sân</span>';
    }
  }

  const adminOnlyTabs = ['pricing', 'settings'];
  adminOnlyTabs.forEach(tab => {
    const navBtn = document.getElementById(`nav-${tab}`);
    const panel = document.getElementById(`tab-content-${tab}`);
    if (navBtn) {
      if (isAdmin) {
        navBtn.classList.remove('hidden');
        navBtn.style.display = '';
      } else {
        navBtn.classList.add('hidden');
        navBtn.style.display = 'none';
      }
    }
    if (panel && !isAdmin) {
      panel.classList.add('hidden');
    }
  });

  const managerOrAdminTabs = ['payments', 'reports'];
  managerOrAdminTabs.forEach(tab => {
    const navBtn = document.getElementById(`nav-${tab}`);
    const panel = document.getElementById(`tab-content-${tab}`);
    if (navBtn) {
      if (isMgrOrAdmin) {
        navBtn.classList.remove('hidden');
        navBtn.style.display = '';
      } else {
        navBtn.classList.add('hidden');
        navBtn.style.display = 'none';
      }
    }
    if (panel && !isMgrOrAdmin) {
      panel.classList.add('hidden');
    }
  });

  const kpiRevCard = document.getElementById('kpi-card-revenue');
  const chartsRow = document.getElementById('overview-charts-row');
  const kpiGrid = document.getElementById('overview-kpi-grid');

  if (kpiRevCard) {
    kpiRevCard.classList.toggle('hidden', !isMgrOrAdmin);
    kpiRevCard.style.display = isMgrOrAdmin ? '' : 'none';
  }
  if (chartsRow) {
    chartsRow.classList.toggle('hidden', !isMgrOrAdmin);
    chartsRow.style.display = isMgrOrAdmin ? '' : 'none';
  }
  if (kpiGrid) {
    if (isMgrOrAdmin) {
      kpiGrid.classList.remove('lg:grid-cols-3');
      kpiGrid.classList.add('lg:grid-cols-4');
    } else {
      kpiGrid.classList.remove('lg:grid-cols-4');
      kpiGrid.classList.add('lg:grid-cols-3');
    }
  }

  const addPitchBtn = document.getElementById('btn-add-pitch');
  if (addPitchBtn) {
    addPitchBtn.classList.toggle('hidden', !isMgrOrAdmin);
  }
  const openServiceBtn = document.getElementById('btn-open-service-modal');
  if (openServiceBtn) {
    openServiceBtn.classList.toggle('hidden', !isMgrOrAdmin);
  }

  const allowed = PORTAL_ALLOWED_TABS[currentPortalRole] || PORTAL_ALLOWED_TABS.staff;
  if (!allowed.includes(activeModule)) {
    switchAdminTab('overview');
  }
}
window.applyRolePermissions = applyRolePermissions;

document.addEventListener('DOMContentLoaded', () => {
  let localUser = null;
  try {
    localUser = JSON.parse(sessionStorage.getItem('sb_current_user') || 'null');
  } catch (e) {}

  if (!localUser || !['admin', 'manager', 'staff'].includes(localUser.role)) {
    document.documentElement.style.display = 'none';
    window.location.replace('/login?redirect=portal-admin');
    return;
  }

  currentPortalRole = localUser.role;
  updateAdminProfile(localUser);
  applyRolePermissions();

  fetch('../api/auth.php?action=me')
    .then(res => res.json())
    .then(data => {
      if (!data || !data.success || !data.logged_in || !data.user || !['admin', 'manager', 'staff'].includes(data.user.role)) {
        sessionStorage.removeItem('sb_current_user');
        document.documentElement.style.display = 'none';
        const msg = data && data.locked
          ? (data.message || 'Tài khoản của bạn đã bị Chủ sân tạm khóa.')
          : 'Phiên làm việc đã hết hạn hoặc không có quyền truy cập.';
        if (window.SanBongApp?.showToast) window.SanBongApp.showToast(msg, 'error');
        window.location.replace('/login?redirect=portal-admin');
        return;
      }
      currentPortalRole = data.user.role;
      try {
        sessionStorage.setItem('sb_current_user', JSON.stringify(data.user));
      } catch (e) {}
      updateAdminProfile(data.user);
      applyRolePermissions();
      renderOverviewKPIs();
      renderAdminPitches();
      if (typeof renderAdminInventory === 'function') renderAdminInventory();
      if (typeof loadShiftHandovers === 'function') loadShiftHandovers();
      if (isManagerOrAdmin()) {
        renderAdminPayments();
        if (typeof loadBankTransactions === 'function') loadBankTransactions();
        renderAdminReports();
      }
      if (isOwnerAdmin()) {
        renderAdminVouchers();
        loadPricingTable();
        loadAdminSettings();
        loadStaffUsers();
        if (typeof loadAuditLogs === 'function') loadAuditLogs();
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
  if (isManagerOrAdmin()) {
    renderAdminPayments();
    if (typeof loadBankTransactions === 'function') loadBankTransactions();
  }
  if (isOwnerAdmin()) {
    renderAdminVouchers();
    loadPricingTable();
    loadAdminSettings();
    loadStaffUsers();
  }

  window.addEventListener('storage', () => {
    refreshAllAdminViews(activeInPlayCode);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeInPlayModal();
      if (typeof closeInvoiceModal === 'function') closeInvoiceModal();
      if (typeof closeQRScannerModal === 'function') closeQRScannerModal();
      if (typeof closeResetStaffPwModal === 'function') closeResetStaffPwModal();
      if (typeof closeReconcileAssignModal === 'function') closeReconcileAssignModal();
    }
  });
});

function renderOverviewKPIs() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;
  const allBookings = db.getAllBookings();
  const pitches = db.getPitches();
  const pendingList = (isManagerOrAdmin() && db.getPendingPayments) ? db.getPendingPayments() : [];

  let collectedRev = 0;
  let playingCount = 0;
  let waitingCheckinCount = 0;
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
    if (st === 'Đã xác nhận' || st === 'Chờ duyệt cọc') waitingCheckinCount++;
  });

  const displayRev = Math.max(4350000, collectedRev);
  const totalCount = Math.max(11, allBookings.length);
  const maintCount = pitches.filter(p => p.status === 'Bảo trì').length;
  const readyCount = Math.max(0, pitches.length - maintCount);

  const cards = document.querySelectorAll('#tab-content-overview > .grid:first-child > .ui-card');
  const revEl = document.getElementById('kpi-revenue-value') || (cards.length >= 4 ? cards[0].querySelector('.font-heading') : null);
  const cntEl = document.getElementById('kpi-bookings-count') || (cards.length >= 4 ? cards[1].querySelector('.font-heading') : null);
  const pendingEl = document.getElementById('kpi-bookings-pending') || (cards.length >= 4 ? cards[1].querySelector('.mt-2') : null);
  const readyEl = document.getElementById('kpi-pitches-ready') || (cards.length >= 4 ? cards[3].querySelector('.font-heading') : null);
  const subEl = document.getElementById('kpi-pitches-sub') || (cards.length >= 4 ? cards[3].querySelector('.mt-2') : null);

  if (isManagerOrAdmin() && revEl) {
    revEl.textContent = window.SanBongApp.formatVND(displayRev);
  }
  if (cntEl) cntEl.textContent = totalCount + ' lượt';
  if (pendingEl) {
    if (isManagerOrAdmin()) {
      pendingEl.textContent = pendingList.length > 0
        ? `${pendingList.length} đơn đang giữ chỗ VietQR`
        : '✓ Đã duyệt hết cọc VietQR';
    } else {
      pendingEl.textContent = `${waitingCheckinCount} ca đang chờ check-in`;
    }
  }
  if (readyEl) readyEl.textContent = `${readyCount}/${pitches.length} Sân sẵn sàng`;
  if (subEl) subEl.textContent = `${playingCount} đang đá · ${maintCount} bảo trì mặt cỏ`;
}

function refreshAllAdminViews(codeOpt) {
  renderOverviewKPIs();
  renderOverviewTodayBookings();
  renderTimelineGantt();
  renderAdminPitches();
  renderAdminCustomers();
  if (typeof renderAdminInventory === 'function') renderAdminInventory();
  if (typeof loadShiftHandovers === 'function') loadShiftHandovers();
  if (isManagerOrAdmin()) {
    renderAdminPayments();
    if (typeof loadBankTransactions === 'function') loadBankTransactions();
    renderAdminReports();
  }
  populateInPlayWorkspace(codeOpt || activeInPlayCode);
}
window.refreshAllAdminViews = refreshAllAdminViews;

let currentOverviewFilter = 'all';
let currentPitchFilter = 'all';
let currentCustomerFilter = 'all';
let activeQRBookingCode = '';
let qrCameraStream = null;
let qrScanTimer = null;
let activeInPlayCode = '';
let activeInvoiceCode = '';
let editingVoucherCode = '';

function filterOverviewBookings(filterType) {
  currentOverviewFilter = filterType || 'all';
  ['all', 'playing', 'confirmed', 'debt', 'completed', 'noshow'].forEach(f => {
    const btn = document.getElementById('ov-filter-' + f);
    if (btn) {
      if (f === currentOverviewFilter) {
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold bg-[#16A34A] text-white shadow-sm cursor-pointer';
      } else if (f === 'debt') {
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 cursor-pointer';
      } else {
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer';
      }
    }
  });
  renderOverviewTodayBookings();
}
window.filterOverviewBookings = filterOverviewBookings;

function switchAdminTab(moduleKey) {
  const allowed = PORTAL_ALLOWED_TABS[currentPortalRole] || PORTAL_ALLOWED_TABS.staff;
  if (!allowed.includes(moduleKey)) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Tài khoản của bạn không có quyền truy cập phân hệ này!', 'error', 3500);
    }
    if (!allowed.includes(activeModule)) {
      moduleKey = 'overview';
    } else {
      return;
    }
  }

  activeModule = moduleKey;
  const allModules = ['overview', 'timeline', 'quick-booking', 'pitches', 'pricing', 'customers', 'payments', 'reports', 'settings'];

  allModules.forEach(m => {
    const btn = document.getElementById(`nav-${m}`);
    const content = document.getElementById(`tab-content-${m}`);
    if (m === moduleKey && allowed.includes(m)) {
      if (btn) btn.className = 'w-full h-10 px-3 rounded-lg flex items-center gap-3 text-xs font-bold transition-all bg-[#DCFCE7] text-[#16A34A]';
      if (content) content.classList.remove('hidden');
    } else {
      if (btn && allowed.includes(m)) {
        btn.className = 'w-full h-10 px-3 rounded-lg flex items-center gap-3 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] transition-all';
      }
      if (content) content.classList.add('hidden');
    }
  });

  const titleMap = {
    'overview': isManagerOrAdmin() ? '1. Tổng quan KPI & Chỉ số tài chính' : '1. Tổng quan vận hành & Ca đá hôm nay',
    'timeline': '2. Lịch đặt sân Timeline Gantt trực quan',
    'quick-booking': '3. Vận hành Quầy: Đặt sân · Kho nước POS · Chốt ca',
    'pitches': '4. Quản lý hệ thống sân bóng & Bật/Tắt bảo trì',
    'pricing': '5. Cấu hình bảng giá niêm yết & Voucher',
    'customers': '6. Danh sách khách hàng, Công nợ & Cảnh báo No-Show',
    'payments': '7. Duyệt biên lai & Đối soát giao dịch VietQR',
    'reports': '8. Báo cáo thống kê hiệu suất sân',
    'settings': '9. Cài đặt hệ thống, Nhân sự & Nhật ký Kiểm toán (Audit Log)'
  };
  const titleEl = document.getElementById('admin-module-title');
  if (titleEl) titleEl.textContent = titleMap[moduleKey] || 'Quản trị';

  if (moduleKey === 'timeline') {
    fetchTimelineDateBookings(selectedTimelineDate).then(() => renderTimelineGantt());
  }
  if (moduleKey === 'quick-booking') {
    refreshWalkinBookedSlots();
    updateWalkinPricePreview();
    if (typeof renderAdminInventory === 'function') renderAdminInventory();
    if (typeof loadShiftHandovers === 'function') loadShiftHandovers();
  }
  if (moduleKey === 'pitches') {
    renderAdminPitches();
  }
  if (moduleKey === 'pricing' && isOwnerAdmin()) {
    loadPricingTable();
    renderAdminVouchers();
  }
  if (moduleKey === 'customers') renderAdminCustomers();
  if (moduleKey === 'payments' && isManagerOrAdmin()) {
    renderAdminPayments();
    if (typeof loadBankTransactions === 'function') loadBankTransactions();
  }
  if (moduleKey === 'reports' && isManagerOrAdmin()) renderAdminReports();
  if (moduleKey === 'settings' && isOwnerAdmin()) {
    loadAdminSettings();
    loadStaffUsers();
    if (typeof loadAuditLogs === 'function') loadAuditLogs();
  }
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
  } else if (currentOverviewFilter === 'debt') {
    bookings = allBookings.filter(b => {
      const normStatus = (b.status === 'Vắng mặt (No-Show)' || String(b.status || '').includes('No-Show')) ? 'Khách chưa đến' : (b.status || 'Đã xác nhận');
      if (normStatus === 'Đã hủy' || normStatus === 'Khách chưa đến' || normStatus === 'Hoàn thành') return false;
      const total = Number(b.totalPrice || 0);
      const deposit = Number(b.depositAmount || Math.round(total * 0.3));
      const rem = typeof b.remainingAmount === 'number' ? b.remainingAmount : Math.max(0, total - deposit);
      return rem > 0;
    });
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

    let cardColorCls = 'border-amber-300 bg-amber-50/25 hover:border-amber-400 hover:bg-amber-50/40';
    if (normStatus === 'Đang đá') {
      cardColorCls = 'border-blue-300 bg-blue-50/25 hover:border-blue-400 hover:bg-blue-50/40';
    } else if (normStatus === 'Đã xác nhận') {
      cardColorCls = 'border-emerald-300 bg-emerald-50/25 hover:border-emerald-400 hover:bg-emerald-50/40';
    } else if (normStatus === 'Khách chưa đến' || normStatus === 'Đã hủy') {
      cardColorCls = 'border-red-300 bg-red-50/25 hover:border-red-400 hover:bg-red-50/40';
    } else if (normStatus === 'Hoàn thành') {
      cardColorCls = 'border-slate-200 bg-slate-50/40 hover:border-slate-300 hover:bg-slate-50/70';
    }

    return '<div onclick="openInPlayModal(\'' + b.code + '\')" class="py-2.5 px-3.5 rounded-lg border ' + cardColorCls + ' shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 transition-all cursor-pointer">' +
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

function getLocalTodayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

let selectedTimelineDate = getLocalTodayISO();
let timelineBookingsByDateCache = {};

function formatTimelineDateLabel(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr + 'T00:00:00');
  if (isNaN(d.getTime())) return isoStr;
  const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dayNames[d.getDay()]}, ${dd}/${mm}/${yyyy}`;
}

async function fetchTimelineDateBookings(dateStr) {
  const targetDate = dateStr || selectedTimelineDate || getLocalTodayISO();
  try {
    const res = await fetch(`../api/bookings.php?action=by_date&date=${encodeURIComponent(targetDate)}`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data)) {
        timelineBookingsByDateCache[targetDate] = json.data;
        const db = window.SanBongApp?.SanBongDB;
        if (db && db.getAllBookings) {
          const localList = db.getAllBookings();
          let updated = false;
          json.data.forEach(srvB => {
            const code = srvB.code;
            if (!code) return;
            const normItem = {
              code: srvB.code,
              customerName: srvB.customerName || srvB.customer_name || 'Khách đặt sân',
              phone: srvB.phone || '',
              pitchId: srvB.pitchId || srvB.pitch_id || '',
              pitchName: srvB.pitchName || srvB.pitch_name || '',
              date: srvB.date || srvB.booking_date || targetDate,
              slotId: srvB.slotId || srvB.slot_id || '',
              slotTime: srvB.slotTime || srvB.slot_time || '',
              totalPrice: Number(srvB.totalPrice ?? srvB.total_price ?? 0),
              depositAmount: Number(srvB.depositAmount ?? srvB.deposit_amount ?? 0),
              remainingAmount: Number(srvB.remainingAmount ?? srvB.remaining_amount ?? 0),
              status: srvB.status || 'Đã xác nhận',
              paymentStatus: srvB.paymentStatus || srvB.payment_status || 'Đã cọc 30%',
              paymentMethod: srvB.paymentMethod || srvB.payment_method || '',
              note: srvB.note || ''
            };
            const idx = localList.findIndex(x => x.code === code);
            if (idx >= 0) {
              localList[idx] = Object.assign({}, localList[idx], normItem);
              updated = true;
            } else {
              localList.unshift(normItem);
              updated = true;
            }
          });
          if (updated) {
            try { localStorage.setItem('sb_bookings_v1', JSON.stringify(localList)); } catch (e) {}
          }
        }
        return json.data;
      }
    }
  } catch (e) {}
  return timelineBookingsByDateCache[targetDate] || [];
}

window.changeTimelineDate = function(deltaDays) {
  if (deltaDays === 0) {
    selectedTimelineDate = getLocalTodayISO();
  } else {
    const cur = new Date((selectedTimelineDate || getLocalTodayISO()) + 'T00:00:00');
    cur.setDate(cur.getDate() + Number(deltaDays || 0));
    const yyyy = cur.getFullYear();
    const mm = String(cur.getMonth() + 1).padStart(2, '0');
    const dd = String(cur.getDate()).padStart(2, '0');
    selectedTimelineDate = `${yyyy}-${mm}-${dd}`;
  }
  const picker = document.getElementById('timeline-date-picker');
  if (picker) picker.value = selectedTimelineDate;
  const lbl = document.getElementById('timeline-date-label');
  if (lbl) lbl.textContent = formatTimelineDateLabel(selectedTimelineDate);
  fetchTimelineDateBookings(selectedTimelineDate).finally(() => {
    renderTimelineGantt();
  });
};

window.setTimelineDate = function(dateStr) {
  if (!dateStr) return;
  selectedTimelineDate = dateStr;
  const lbl = document.getElementById('timeline-date-label');
  if (lbl) lbl.textContent = formatTimelineDateLabel(selectedTimelineDate);
  fetchTimelineDateBookings(selectedTimelineDate).finally(() => {
    renderTimelineGantt();
  });
};

function renderTimelineGantt() {
  const db = window.SanBongApp.SanBongDB;
  const pitches = db.getPitches().filter(p => p.status !== 'Ẩn');
  const allBookings = db.getAllBookings();
  const container = document.getElementById('gantt-rows');
  if (!container) return;

  if (!selectedTimelineDate) {
    selectedTimelineDate = getLocalTodayISO();
  }
  const picker = document.getElementById('timeline-date-picker');
  if (picker && picker.value !== selectedTimelineDate) {
    picker.value = selectedTimelineDate;
  }
  const lbl = document.getElementById('timeline-date-label');
  if (lbl) {
    lbl.textContent = formatTimelineDateLabel(selectedTimelineDate);
  }

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

  container.innerHTML = pitches.map((p) => {
    const isMaint = p.status === 'Bảo trì';
    const pitchBookings = allBookings.filter(b => {
      const bPitchId = b.pitchId || b.pitch_id;
      const bDate = b.date || b.booking_date;
      const bStatus = b.status || '';
      const bPayStatus = b.paymentStatus || b.payment_status || '';
      return bPitchId === p.id &&
        bDate === selectedTimelineDate &&
        bStatus !== 'Đã hủy' &&
        bStatus !== 'Khách chưa đến' &&
        bStatus !== 'Vắng mặt (No-Show)' &&
        !String(bStatus).includes('No-Show') &&
        bPayStatus !== 'Tịch thu cọc 30%';
    });

    const barsHtml = pitchBookings.length > 0 ? pitchBookings.map((b, bIdx) => {
      const pos = parseSlotPos(b.slotTime || b.slot_time, bIdx);
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
    }).join('') : `<div class="w-full h-full flex items-center justify-center text-[11px] font-medium text-slate-400">Trống lịch cả ngày</div>`;

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

async function refreshWalkinBookedSlots() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;
  const pitchSelect = document.getElementById('admin-pitch-select');
  const dateInput = document.getElementById('admin-book-date');
  const slotSelect = document.getElementById('admin-slot-select');
  if (!pitchSelect || !slotSelect) return;

  const pitchId = pitchSelect.value;
  const dateVal = dateInput?.value || getLocalTodayISO();
  const prevSlotId = slotSelect.value;

  const bookedMap = {};
  const localBookings = db.getAllBookings().filter(b =>
    (b.pitchId === pitchId || b.pitch_id === pitchId) &&
    (b.date === dateVal || b.booking_date === dateVal) &&
    b.status !== 'Đã hủy' &&
    b.status !== 'Khách chưa đến' &&
    b.status !== 'Vắng mặt (No-Show)' &&
    !String(b.status || '').includes('No-Show') &&
    b.paymentStatus !== 'Tịch thu cọc 30%'
  );
  localBookings.forEach(b => {
    const sid = b.slotId || b.slot_id;
    if (sid) bookedMap[sid] = b.code || 'ĐÃ ĐẶT';
  });

  try {
    const res = await fetch(`../api/bookings.php?action=booked_slots&pitch_id=${encodeURIComponent(pitchId)}&date=${encodeURIComponent(dateVal)}`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data)) {
        json.data.forEach(item => {
          const sid = item.slotId || item.slot_id;
          if (sid) bookedMap[sid] = item.code || 'ĐÃ ĐẶT';
        });
      }
    }
  } catch (e) {}

  const slots = db.getTimeSlots();
  slotSelect.innerHTML = slots.map(s => {
    const bookedCode = bookedMap[s.id];
    if (bookedCode) {
      return `<option value="${s.id}" disabled class="text-slate-400">${s.time} (🔒 Đã đặt - #${bookedCode})</option>`;
    }
    return `<option value="${s.id}">${s.time} ${s.isPeak ? '★ Giờ cao điểm' : ''}</option>`;
  }).join('');

  if (prevSlotId && !bookedMap[prevSlotId]) {
    slotSelect.value = prevSlotId;
  } else {
    const firstFree = slots.find(s => !bookedMap[s.id]);
    slotSelect.value = firstFree ? firstFree.id : '';
  }

  updateWalkinPricePreview();
}
window.refreshWalkinBookedSlots = refreshWalkinBookedSlots;

function updateWalkinPricePreview() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const pitchId = document.getElementById('admin-pitch-select')?.value || '';
  const dateVal = document.getElementById('admin-book-date')?.value || getLocalTodayISO();
  const slotId = document.getElementById('admin-slot-select')?.value || '';
  const weeksCount = Math.max(1, parseInt(document.getElementById('admin-book-package')?.value || '1', 10) || 1);
  const payMethod = document.getElementById('admin-pay-select')?.value || 'Tiền mặt tại quầy';

  const calc = db.calculatePrice(pitchId, dateVal, slotId, [], '', weeksCount);
  if (!calc) return;

  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  const elPitchPrice = document.getElementById('walkin-preview-pitch-price');
  const elPromoRow = document.getElementById('walkin-preview-promo-row');
  const elDiscount = document.getElementById('walkin-preview-discount');
  const elGifts = document.getElementById('walkin-preview-gifts');
  const elTotal = document.getElementById('walkin-preview-total');
  const elDeposit = document.getElementById('walkin-preview-deposit');
  const elRemaining = document.getElementById('walkin-preview-remaining');

  if (elPitchPrice) {
    elPitchPrice.textContent = weeksCount > 1
      ? `${fmt(calc.pitchPrice)} (${weeksCount} buổi · ${fmt(calc.singlePitchPrice)}/buổi)`
      : `${fmt(calc.pitchPrice)}${calc.isWeekend ? ' (Giá cuối tuần)' : (calc.isPeak ? ' (Giờ cao điểm)' : '')}`;
  }

  if (elPromoRow) {
    if (weeksCount > 1) {
      elPromoRow.classList.remove('hidden');
      const pct = Math.round((calc.monthlyDiscountRate || 0) * 100);
      if (elDiscount) {
        elDiscount.textContent = `-${fmt(calc.monthlyDiscountAmount)} (Giảm ${pct}%)`;
      }
      if (elGifts) {
        let giftText = '🎁 Tặng kèm gói tháng (0đ)';
        if (weeksCount >= 12) {
          giftText = '🎁 Tặng 2 thùng nước + 1 trọng tài mỗi trận (0đ)';
        } else if (weeksCount >= 8) {
          giftText = '🎁 Tặng 1 thùng nước + 1 bộ áo Bib mỗi trận (0đ)';
        } else if (weeksCount >= 4) {
          giftText = '🎁 Tặng 1 lốc nước + miễn phí bóng đá mỗi trận (0đ)';
        }
        elGifts.textContent = giftText;
      }
    } else {
      elPromoRow.classList.add('hidden');
    }
  }

  let depositToCollect = calc.depositAmount;
  if (payMethod.includes('100%')) {
    depositToCollect = calc.totalPrice;
  } else if (payMethod.includes('Chưa cọc')) {
    depositToCollect = 0;
  }
  const remainingToCollect = Math.max(0, calc.totalPrice - depositToCollect);

  if (elTotal) elTotal.textContent = fmt(calc.totalPrice);
  if (elDeposit) elDeposit.textContent = fmt(depositToCollect);
  if (elRemaining) elRemaining.textContent = fmt(remainingToCollect);
}
window.updateWalkinPricePreview = updateWalkinPricePreview;

async function checkWalkinPhoneNoShow(rawPhone) {
  const warnBox = document.getElementById('walkin-noshow-warning');
  const warnText = document.getElementById('walkin-noshow-warning-text');
  if (!warnBox) return;

  const clean = String(rawPhone || '').replace(/[^\d]/g, '');
  if (clean.length < 9) {
    warnBox.classList.add('hidden');
    return;
  }

  const db = window.SanBongApp?.SanBongDB;
  const localStats = db && typeof db.getPhoneNoShowAndDebt === 'function'
    ? db.getPhoneNoShowAndDebt(clean)
    : { noShowCount: 0, debtAmount: 0 };

  let noShowCount = Number(localStats.noShowCount || 0);
  let debtAmount = Number(localStats.debtAmount || 0);

  try {
    const res = await fetch(`../api/bookings.php?action=check_phone_noshow&phone=${encodeURIComponent(clean)}`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && json.data) {
        noShowCount = Math.max(noShowCount, Number(json.data.noShowCount ?? json.data.no_show_count ?? 0));
        debtAmount = Math.max(debtAmount, Number(json.data.debtAmount ?? json.data.debt_amount ?? 0));
      }
    }
  } catch (e) {}

  if (noShowCount >= 2 || debtAmount > 0) {
    const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');
    let msg = '';
    if (noShowCount >= 2) {
      msg = `⚠️ CẢNH BÁO: SĐT này đã có ${noShowCount} lần đặt sân nhưng không đến (No-Show)! Bắt buộc thu cọc trước khi giữ sân.`;
    }
    if (debtAmount > 0) {
      const debtMsg = `Khách đang còn công nợ chưa thu ${fmt(debtAmount)}.`;
      msg = msg ? `${msg} (${debtMsg})` : `⚠️ CẢNH BÁO: SĐT này đang có công nợ chưa thanh toán (${fmt(debtAmount)})! Bắt buộc thu cọc và nhắc khách tất toán công nợ.`;
    }
    if (warnText) {
      warnText.textContent = msg;
    } else {
      warnBox.textContent = msg;
    }
    warnBox.classList.remove('hidden');
  } else {
    warnBox.classList.add('hidden');
  }
}
window.checkWalkinPhoneNoShow = checkWalkinPhoneNoShow;

function initQuickBookingForm() {
  const db = window.SanBongApp.SanBongDB;
  const pitchSelect = document.getElementById('admin-pitch-select');
  const slotSelect = document.getElementById('admin-slot-select');
  const dateInput = document.getElementById('admin-book-date');
  const packageSelect = document.getElementById('admin-book-package');
  const paySelect = document.getElementById('admin-pay-select');
  const phoneInput = document.getElementById('admin-cust-phone');
  if (!pitchSelect || !slotSelect) return;

  const todayISO = getLocalTodayISO();
  if (dateInput) {
    dateInput.min = todayISO;
    if (!dateInput.value || dateInput.value < todayISO) {
      dateInput.value = todayISO;
    }
  }

  const prevPitch = pitchSelect.value;
  pitchSelect.innerHTML = db.getPitches().filter(p => p.status !== 'Ẩn').map(p => `
    <option value="${p.id}" ${p.status === 'Bảo trì' ? 'disabled' : ''}>${p.name} (${p.typeName}) - ${window.SanBongApp.formatVND(p.basePrice)}/h</option>
  `).join('');
  if (prevPitch && Array.from(pitchSelect.options).some(o => o.value === prevPitch && !o.disabled)) {
    pitchSelect.value = prevPitch;
  }

  refreshWalkinBookedSlots();
  if (typeof renderAdminInventory === 'function') renderAdminInventory();
  if (typeof loadShiftHandovers === 'function') loadShiftHandovers();

  if (phoneInput && !phoneInput._boundNoShow) {
    phoneInput._boundNoShow = true;
    let tmr = null;
    const onPhoneChange = () => {
      if (tmr) clearTimeout(tmr);
      tmr = setTimeout(() => checkWalkinPhoneNoShow(phoneInput.value), 150);
    };
    phoneInput.addEventListener('input', onPhoneChange);
    phoneInput.addEventListener('change', onPhoneChange);
    phoneInput.addEventListener('blur', () => checkWalkinPhoneNoShow(phoneInput.value));
  }

  if (!pitchSelect._bound) {
    pitchSelect._bound = true;
    pitchSelect.addEventListener('change', () => {
      refreshWalkinBookedSlots();
    });
  }
  if (dateInput && !dateInput._bound) {
    dateInput._bound = true;
    dateInput.addEventListener('change', () => {
      refreshWalkinBookedSlots();
    });
  }
  if (!slotSelect._bound) {
    slotSelect._bound = true;
    slotSelect.addEventListener('change', () => {
      updateWalkinPricePreview();
    });
  }
  if (packageSelect && !packageSelect._bound) {
    packageSelect._bound = true;
    packageSelect.addEventListener('change', () => {
      updateWalkinPricePreview();
    });
  }
  if (paySelect && !paySelect._bound) {
    paySelect._bound = true;
    paySelect.addEventListener('change', () => {
      updateWalkinPricePreview();
    });
  }

  const walkinForm = document.getElementById('admin-walkin-form');
  if (walkinForm && !walkinForm._bound) {
    walkinForm._bound = true;
    walkinForm.addEventListener('reset', () => {
      setTimeout(() => {
        if (dateInput) dateInput.value = getLocalTodayISO();
        const warnBox = document.getElementById('walkin-noshow-warning');
        if (warnBox) warnBox.classList.add('hidden');
        refreshWalkinBookedSlots();
      }, 20);
    });
    walkinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = (document.getElementById('admin-cust-name')?.value || '').trim();
      const phone = (document.getElementById('admin-cust-phone')?.value || '').trim();
      const pitchId = pitchSelect.value;
      const dateVal = dateInput?.value || getLocalTodayISO();
      const slotId = slotSelect.value;
      const weeksCount = Math.max(1, parseInt(packageSelect?.value || '1', 10) || 1);
      const payMethod = paySelect?.value || 'Tiền mặt tại quầy';
      let note = (document.getElementById('admin-cust-note')?.value || '').trim();

      if (dateVal < getLocalTodayISO()) {
        if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Ngày thi đấu không được nhỏ hơn ngày hôm nay!', 'error');
        return;
      }

      const selectedOpt = slotSelect.options[slotSelect.selectedIndex];
      if (!slotId || (selectedOpt && selectedOpt.disabled)) {
        if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Khung giờ này đã kín lịch! Vui lòng chọn khung giờ trống khác.', 'error');
        return;
      }

      if (weeksCount > 1) {
        const promo = db.getPackagePromotion(weeksCount);
        const giftLabel = weeksCount >= 12
          ? 'Tặng 2 thùng nước + 1 trọng tài mỗi trận (0đ)'
          : (weeksCount >= 8 ? 'Tặng 1 thùng nước + 1 bộ Bib mỗi trận (0đ)' : 'Tặng 1 lốc nước + bóng mỗi trận (0đ)');
        note = (note ? note + ' | ' : '') + `[Gói cố định ${weeksCount} tuần - Giảm ${promo ? Math.round(promo.discountRate * 100) : 5}% · ${giftLabel}]`;
      }

      const submitBtn = walkinForm.querySelector('button[type="submit"]');
      const origBtnText = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '⏳ Đang khóa sân...';
      }

      try {
        const res = await fetch('../api/bookings.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            isWalkin: true,
            customerName: name,
            phone: phone,
            pitchId: pitchId,
            date: dateVal,
            slotId: slotId,
            weeksCount: weeksCount,
            bookingMode: weeksCount > 1 ? 'monthly' : 'single',
            paymentMethod: payMethod,
            payFull: payMethod.includes('100%'),
            note: note
          })
        });
        const json = await res.json();

        if (!res.ok || !json || json.success === false) {
          if (window.SanBongApp?.showToast) {
            window.SanBongApp.showToast(json?.message || 'Khung giờ vừa được đặt bởi người khác! Vui lòng chọn giờ khác.', 'error', 4000);
          }
          await refreshWalkinBookedSlots();
          return;
        }

        const srvData = json.data || {};
        const createdBooking = db.createBooking({
          code: srvData.code,
          customerName: srvData.customerName || name,
          phone: srvData.phone || phone,
          pitchId: pitchId,
          date: srvData.date || dateVal,
          slotId: slotId,
          slotTime: srvData.slotTime || db.getTimeSlots().find(s => s.id === slotId)?.time,
          weeksCount: weeksCount,
          bookingMode: weeksCount > 1 ? 'monthly' : 'single',
          services: [],
          voucherCode: '',
          note: note,
          status: srvData.status || (payMethod.includes('100%') ? 'Đã xác nhận' : 'Đã xác nhận'),
          paymentStatus: srvData.paymentStatus || (payMethod.includes('100%') ? 'Đã thanh toán 100%' : (payMethod.includes('Chưa cọc') ? 'Chờ thu tại sân' : 'Đã cọc 30%')),
          paymentMethod: payMethod
        });

        if (srvData.totalPrice !== undefined) {
          const allB = db.getAllBookings();
          const idx = allB.findIndex(b => b.code === createdBooking.code);
          if (idx >= 0) {
            allB[idx].totalPrice = Number(srvData.totalPrice);
            allB[idx].depositAmount = Number(srvData.depositAmount ?? allB[idx].depositAmount);
            allB[idx].remainingAmount = Number(srvData.remainingAmount ?? allB[idx].remainingAmount);
            localStorage.setItem('sb_bookings_v1', JSON.stringify(allB));
          }
        }

        if (window.SanBongApp?.showToast) {
          window.SanBongApp.showToast(`✓ Đã tạo đơn khóa sân thành công! Mã đơn: #${createdBooking.code}`, 'success', 4000);
        }

        walkinForm.reset();
        const warnBox = document.getElementById('walkin-noshow-warning');
        if (warnBox) warnBox.classList.add('hidden');
        if (dateInput) dateInput.value = dateVal;
        await refreshWalkinBookedSlots();
        renderOverviewTodayBookings();
        renderOverviewKPIs();
        renderTimelineGantt();
        if (typeof loadShiftHandovers === 'function') loadShiftHandovers();
        if (isManagerOrAdmin()) {
          renderAdminPayments();
          renderAdminReports();
        }
      } catch (err) {
        if (window.SanBongApp?.showToast) {
          window.SanBongApp.showToast('Lỗi kết nối máy chủ khi tạo đơn tại quầy. Vui lòng thử lại.', 'error');
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origBtnText;
        }
      }
    });
  }
}

function filterAdminPitches(status) {
  currentPitchFilter = status || 'all';
  const mapBtn = {
    'all': 'pitch-filter-all',
    'Hoạt động': 'pitch-filter-active',
    'Bảo trì': 'pitch-filter-maint',
    'Ẩn': 'pitch-filter-hidden'
  };
  Object.keys(mapBtn).forEach(k => {
    const btn = document.getElementById(mapBtn[k]);
    if (btn) {
      if (k === currentPitchFilter) {
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold bg-[#16A34A] text-white shadow-xs cursor-pointer';
      } else {
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer';
      }
    }
  });
  renderAdminPitches();
}
window.filterAdminPitches = filterAdminPitches;

function renderAdminPitches() {
  const db = window.SanBongApp.SanBongDB;
  const allPitches = db.getPitches();
  const container = document.getElementById('admin-pitches-list');
  if (!container) return;

  const addBtn = document.getElementById('btn-add-pitch');
  if (addBtn) {
    if (isManagerOrAdmin()) {
      addBtn.classList.remove('hidden');
    } else {
      addBtn.classList.add('hidden');
    }
  }

  const subHeader = document.getElementById('admin-pitches-header-title') || document.querySelector('#tab-content-pitches h3');
  if (subHeader) {
    subHeader.textContent = `Danh sách ${allPitches.length} sân bóng trực thuộc hệ thống`;
  }

  let pitches = allPitches;
  if (currentPitchFilter !== 'all') {
    pitches = allPitches.filter(p => p.status === currentPitchFilter);
  }

  if (pitches.length === 0) {
    container.innerHTML = `<div class="col-span-full p-8 text-center text-xs text-[#64748B] bg-white rounded-xl border border-dashed border-slate-200">Không có sân bóng nào trong trạng thái "${escapeSearchHTML(currentPitchFilter)}".</div>`;
    return;
  }

  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  container.innerHTML = pitches.map(p => {
    const isMaint = p.status === 'Bảo trì';
    const isHidden = p.status === 'Ẩn';
    const weekendP = Number(p.weekendPrice || p.peakPrice || p.basePrice || 0);

    const statusBadgeHtml = isHidden
      ? '<span class="px-2.5 py-0.5 rounded-full bg-slate-700 text-white text-[11px] font-bold">🙈 Đã ẩn</span>'
      : window.SanBongApp.statusPill(p.status);

    const adminControls = isManagerOrAdmin() ? `
      <div class="px-4 pb-3 pt-2 flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60">
        <button type="button" onclick="openPitchModal('${p.id}')" class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white hover:bg-emerald-50 text-[#0F172A] hover:text-[#16A34A] border border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer flex-1 text-center">
          ✏️ Sửa sân & Giá riêng
        </button>
        <button type="button" onclick="toggleHidePitch('${p.id}')" class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold ${isHidden ? 'bg-sky-600 text-white hover:bg-sky-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'} transition-colors cursor-pointer">
          ${isHidden ? '👁️ Hiện sân' : '🙈 Ẩn sân'}
        </button>
      </div>
    ` : '';

    return `
      <div class="ui-card overflow-hidden flex flex-col justify-between ${isHidden ? 'opacity-75 border-dashed border-slate-300' : ''}">
        <div>
          <div class="relative">
            ${window.SanBongApp.renderPitchSVG(p.variant || 'standard', 'h-32')}
            <div class="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-white text-[11px] font-bold text-[#0F172A] shadow-2xs">
              ${escapeSearchHTML(p.typeName)} · ${escapeSearchHTML(p.id)}
            </div>
            <div class="absolute top-2 right-2">
              ${statusBadgeHtml}
            </div>
          </div>
          <div class="p-4 space-y-2">
            <div class="flex items-center justify-between gap-2">
              <h4 class="font-heading font-bold text-sm text-[#0F172A]">${escapeSearchHTML(p.name)}</h4>
              <span class="text-xs font-bold text-[#16A34A]">${fmt(p.basePrice)}/h</span>
            </div>
            <div class="text-[11px] text-[#64748B]">${escapeSearchHTML(p.grass || '')} ${p.size ? '· ' + escapeSearchHTML(p.size) : ''}</div>
            <div class="p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-[#334155] leading-relaxed">
              Thường: <b class="text-[#16A34A]">${fmt(p.basePrice)}</b> | Cao điểm: <b class="text-amber-700">${fmt(p.peakPrice)}</b> | Cuối tuần: <b class="text-purple-700">${fmt(weekendP)}</b>
            </div>
          </div>
        </div>

        <div>
          <div class="p-4 pt-2 flex items-center justify-between border-t border-[#F1F5F9]">
            <span class="text-xs font-semibold text-[#475569]">Bảo trì mặt cỏ:</span>
            <button type="button" onclick="toggleMaintenance('${p.id}')" class="btn-sm ${isMaint ? 'btn-primary' : 'btn-danger-outline'} font-bold cursor-pointer">
              ${isMaint ? '✓ Mở hoạt động lại' : '⚠️ Bật bảo trì'}
            </button>
          </div>
          ${adminControls}
        </div>
      </div>
    `;
  }).join('');
}

async function toggleMaintenance(pitchId) {
  const db = window.SanBongApp.SanBongDB;
  const pitch = db.getPitchById(pitchId);
  if (!pitch) return;

  const newStatus = pitch.status === 'Bảo trì' ? 'Hoạt động' : 'Bảo trì';
  try {
    await fetch('../api/admin.php?action=toggle_pitch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pitchId: pitchId, status: newStatus })
    });
  } catch (e) {}

  db.updatePitchStatus(pitchId, newStatus);
  renderAdminPitches();
  renderTimelineGantt();
  initQuickBookingForm();
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Đã chuyển trạng thái sân ' + pitch.name + ' thành "' + newStatus + '"!', 'info', 3000);
}

async function toggleHidePitch(pitchId) {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền ẩn/hiện sân bóng!', 'error');
    return;
  }
  const db = window.SanBongApp.SanBongDB;
  const pitch = db.getPitchById(pitchId);
  if (!pitch) return;

  const newStatus = pitch.status === 'Ẩn' ? 'Hoạt động' : 'Ẩn';
  try {
    await fetch('../api/admin.php?action=toggle_pitch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pitchId: pitchId, status: newStatus })
    });
  } catch (e) {}

  db.updatePitchStatus(pitchId, newStatus);
  renderAdminPitches();
  renderTimelineGantt();
  initQuickBookingForm();
  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(
      newStatus === 'Ẩn'
        ? `🙈 Đã ẩn sân ${pitch.name} khỏi danh sách đặt sân của khách!`
        : `👁️ Đã mở hiển thị lại sân ${pitch.name}!`,
      'info',
      3000
    );
  }
}
window.toggleHidePitch = toggleHidePitch;

function openPitchModal(pitchId = '') {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền thêm/sửa thông tin & giá riêng từng sân!', 'error');
    return;
  }
  const modal = document.getElementById('pitch-edit-modal');
  if (!modal) return;

  const db = window.SanBongApp?.SanBongDB;
  const pitch = (pitchId && db) ? db.getPitchById(pitchId) : null;

  const titleEl = document.getElementById('pitch-modal-title');
  const idEl = document.getElementById('pitch-form-id');
  const nameEl = document.getElementById('pitch-form-name');
  const typeEl = document.getElementById('pitch-form-type');
  const sizeEl = document.getElementById('pitch-form-size');
  const grassEl = document.getElementById('pitch-form-grass');
  const baseEl = document.getElementById('pitch-form-base-price');
  const peakEl = document.getElementById('pitch-form-peak-price');
  const wkndEl = document.getElementById('pitch-form-weekend-price');
  const statusEl = document.getElementById('pitch-form-status');

  if (pitch) {
    if (titleEl) titleEl.textContent = `✏️ Sửa thông tin & Giá riêng: ${pitch.name}`;
    if (idEl) { idEl.value = pitch.id; idEl.readOnly = true; idEl.classList.add('bg-slate-100'); }
    if (nameEl) nameEl.value = pitch.name || '';
    if (typeEl) typeEl.value = String(pitch.type || 5);
    if (sizeEl) sizeEl.value = pitch.size || '20m x 40m';
    if (grassEl) grassEl.value = pitch.grass || 'Cỏ nhân tạo FIFA Quality Pro 50mm';
    if (baseEl) baseEl.value = Number(pitch.basePrice || 250000);
    if (peakEl) peakEl.value = Number(pitch.peakPrice || 350000);
    if (wkndEl) wkndEl.value = Number(pitch.weekendPrice || pitch.peakPrice || 380000);
    if (statusEl) statusEl.value = pitch.status || 'Hoạt động';
  } else {
    const nextIdx = db ? db.getPitches().length + 1 : 9;
    if (titleEl) titleEl.textContent = '➕ Thêm sân bóng mới vào hệ thống';
    if (idEl) { idEl.value = `P5-${String.fromCharCode(64 + nextIdx)}`; idEl.readOnly = false; idEl.classList.remove('bg-slate-100'); }
    if (nameEl) nameEl.value = '';
    if (typeEl) typeEl.value = '5';
    if (sizeEl) sizeEl.value = '20m x 40m';
    if (grassEl) grassEl.value = 'Cỏ nhân tạo FIFA Quality Pro 50mm';
    if (baseEl) baseEl.value = 250000;
    if (peakEl) peakEl.value = 350000;
    if (wkndEl) wkndEl.value = 380000;
    if (statusEl) statusEl.value = 'Hoạt động';
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}
window.openPitchModal = openPitchModal;

function closePitchModal() {
  const modal = document.getElementById('pitch-edit-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}
window.closePitchModal = closePitchModal;

async function savePitchForm(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!isManagerOrAdmin()) return;

  const id = (document.getElementById('pitch-form-id')?.value || '').trim().toUpperCase();
  const name = (document.getElementById('pitch-form-name')?.value || '').trim();
  const type = parseInt(document.getElementById('pitch-form-type')?.value || '5', 10);
  const size = (document.getElementById('pitch-form-size')?.value || '20m x 40m').trim();
  const grass = (document.getElementById('pitch-form-grass')?.value || 'Cỏ nhân tạo FIFA Quality Pro').trim();
  const basePrice = Math.max(10000, parseInt(document.getElementById('pitch-form-base-price')?.value || '250000', 10));
  const peakPrice = Math.max(10000, parseInt(document.getElementById('pitch-form-peak-price')?.value || '350000', 10));
  const weekendPrice = Math.max(10000, parseInt(document.getElementById('pitch-form-weekend-price')?.value || '380000', 10));
  const status = document.getElementById('pitch-form-status')?.value || 'Hoạt động';

  if (!id || !name) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập đầy đủ Mã sân và Tên sân!', 'warning');
    return;
  }

  const payload = {
    sub_action: 'save',
    id,
    name,
    type,
    typeName: `Sân ${type} người`,
    size,
    grass,
    basePrice,
    peakPrice,
    weekendPrice,
    base_price: basePrice,
    peak_price: peakPrice,
    weekend_price: weekendPrice,
    status
  };

  try {
    await fetch('../api/admin.php?action=manage_pitch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {}

  const db = window.SanBongApp?.SanBongDB;
  if (db && typeof db.upsertPitch === 'function') {
    db.upsertPitch(payload);
  }

  closePitchModal();
  renderAdminPitches();
  renderTimelineGantt();
  initQuickBookingForm();
  renderOverviewKPIs();

  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(`✓ Đã lưu cấu hình & giá riêng cho ${name} (${id})!`, 'success', 3500);
  }
}
window.savePitchForm = savePitchForm;

function renderAdminPayments() {
  if (!isManagerOrAdmin()) return;
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
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền duyệt cọc VietQR!', 'error');
    return;
  }
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
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền từ chối cọc VietQR!', 'error');
    return;
  }
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

// =========================================================
// TAB 7.2: HÀNG CHỜ ĐỐI SOÁT GIAO DỊCH VIETQR / WEBHOOK
// =========================================================
let currentBankTxFilter = 'pending';
let cachedBankTransactions = [];
let cachedCandidateBookings = [];

function populateReconcileBookingDatalist(candidates) {
  const dataList = document.getElementById('rec-booking-datalist');
  if (!dataList) return;
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  let list = Array.isArray(candidates) ? candidates : [];
  if (list.length === 0) {
    const db = window.SanBongApp?.SanBongDB;
    if (db && typeof db.getAllBookings === 'function') {
      list = db.getAllBookings().filter(b => b.status !== 'Đã hủy').slice(0, 40);
    }
  }

  dataList.innerHTML = list.map(b => {
    const code = String(b.code || '').trim();
    if (!code) return '';
    const cust = b.customer_name || b.customerName || '';
    const pitch = b.pitchName || (b.pitch_id ? `Sân #${b.pitch_id}` : '');
    const slotInfo = [b.booking_date, b.slot_time].filter(Boolean).join(' ');
    const depAmt = Number(b.deposit_amount ?? b.depositAmount ?? 0);
    const st = b.payment_status || b.status || '';
    const labelParts = [code];
    if (cust) labelParts.push(cust);
    const meta = [pitch, slotInfo].filter(Boolean).join(' · ');
    const label = `${labelParts.join(' · ')}${meta ? ` (${meta})` : ''} - Cọc ${fmt(depAmt)}${st ? ` [${st}]` : ''}`;
    return `<option value="${escapeSearchHTML(code)}">${escapeSearchHTML(label)}</option>`;
  }).join('');
}

function updateBankFilterButtons(activeFilter) {
  const mapBtn = {
    pending: 'bank-filter-pending',
    resolved: 'bank-filter-resolved',
    all: 'bank-filter-all'
  };
  Object.keys(mapBtn).forEach(k => {
    const btn = document.getElementById(mapBtn[k]);
    if (!btn) return;
    if (k === activeFilter) {
      btn.className = 'px-3 py-1.5 rounded-lg font-bold bg-[#16A34A] text-white cursor-pointer shadow-2xs';
    } else {
      btn.className = 'px-3 py-1.5 rounded-lg font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer';
    }
  });
}

async function loadBankTransactions(filter) {
  if (!isManagerOrAdmin()) return;
  if (typeof filter === 'string' && filter) {
    currentBankTxFilter = filter;
  }
  updateBankFilterButtons(currentBankTxFilter);

  const db = window.SanBongApp?.SanBongDB;
  let txList = [];
  let pendingCount = null;
  let loadedFromServer = false;

  try {
    const res = await fetch(`../api/admin.php?action=bank_transactions&status=${encodeURIComponent(currentBankTxFilter)}`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json && json.success) {
        loadedFromServer = true;
        if (Array.isArray(json.data)) {
          txList = json.data;
        } else if (json.data && Array.isArray(json.data.transactions)) {
          txList = json.data.transactions;
          if (typeof json.data.pendingCount === 'number') pendingCount = json.data.pendingCount;
          if (Array.isArray(json.data.candidateBookings)) {
            cachedCandidateBookings = json.data.candidateBookings;
            populateReconcileBookingDatalist(cachedCandidateBookings);
          }
        }
        if (typeof json.pendingCount === 'number') pendingCount = json.pendingCount;
      }
    }
  } catch (e) {}

  if (!loadedFromServer && db && typeof db.getBankTransactions === 'function') {
    txList = db.getBankTransactions(currentBankTxFilter);
    pendingCount = db.getBankTransactions('pending').length;
    populateReconcileBookingDatalist([]);
  }

  if (pendingCount === null) {
    pendingCount = txList.filter(tx => {
      const st = String(tx.status || '').toLowerCase();
      const mst = String(tx.match_status || '').toLowerCase();
      return !['resolved', 'ignored', 'matched'].includes(st) && !['matched', 'resolved', 'ignored'].includes(mst);
    }).length;
  }

  cachedBankTransactions = txList;
  renderBankTransactions(txList, pendingCount);
}
window.loadBankTransactions = loadBankTransactions;

function renderBankTransactions(list, pendingCount = 0) {
  const tbody = document.getElementById('admin-bank-tx-tbody');
  const countBadge = document.getElementById('bank-pending-count-badge');
  const sidebarBadge = document.getElementById('admin-payments-badge');
  const db = window.SanBongApp?.SanBongDB;

  if (countBadge) {
    if (pendingCount > 0) {
      countBadge.className = 'px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[11px] font-bold';
      countBadge.textContent = `${pendingCount} Cần xử lý`;
    } else {
      countBadge.className = 'px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold';
      countBadge.textContent = '✓ Đã khớp hết';
    }
  }

  if (sidebarBadge) {
    const receiptsCount = (db && db.getPendingPayments) ? db.getPendingPayments().length : 0;
    const totalPending = receiptsCount + Number(pendingCount || 0);
    sidebarBadge.textContent = totalPending > 0 ? String(totalPending) : '';
    sidebarBadge.style.display = totalPending > 0 ? 'inline-block' : 'none';
  }

  if (!tbody) return;
  const rows = Array.isArray(list) ? list : [];
  if (rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-10 text-center text-[#64748B]">
          <div class="text-2xl mb-1">✅</div>
          <div class="font-bold text-xs text-[#0F172A]">Không có giao dịch ngân hàng nào cần xử lý ở bộ lọc này</div>
          <div class="text-[11px] text-[#94A3B8]">Webhook SePay tự động ghi nhận và đối soát mọi chuyển khoản phát sinh.</div>
        </td>
      </tr>
    `;
    return;
  }

  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  tbody.innerHTML = rows.map(tx => {
    const txId = String(tx.id ?? tx.tx_id ?? tx.reference_code ?? '');
    const safeJsId = txId.replace(/[^a-zA-Z0-9_-]/g, '');
    const txTime = escapeSearchHTML(tx.transaction_date || tx.created_at || tx.paid_at || tx.time || 'Vừa nhận');
    const refCode = escapeSearchHTML(tx.sepay_tx_id || tx.reference_code || tx.gateway_ref || txId);
    const bankName = escapeSearchHTML(tx.bank_name || tx.gateway || 'VietQR');
    const content = escapeSearchHTML(tx.content || tx.transaction_content || tx.description || '---');
    const rawMatchedCode = String(tx.matched_booking_code || tx.detected_booking_code || tx.booking_code || tx.detected_code || '').trim();
    const detectedCode = escapeSearchHTML(rawMatchedCode);
    const reasonNote = String(tx.resolved_note || tx.mismatch_reason || tx.note || '').trim();

    const amountIn = Number(tx.transfer_amount ?? tx.amount_in ?? tx.amountIn ?? tx.transferAmount ?? tx.amount ?? 0);
    const expectedAmt = Number(tx.expected_amount ?? tx.expectedAmount ?? 0);
    const diffAmt = (tx.diff_amount !== undefined && tx.diff_amount !== null && tx.diff_amount !== '')
      ? Number(tx.diff_amount)
      : (expectedAmt > 0 ? (amountIn - expectedAmt) : 0);

    const rawStatus = String(tx.status || '').toLowerCase();
    const matchSt = String(tx.match_status || tx.reconcile_status || rawStatus || 'unmatched').toLowerCase();
    const isResolved = (
      matchSt === 'matched' ||
      matchSt === 'resolved' ||
      matchSt === 'ignored' ||
      rawStatus === 'matched' ||
      rawStatus === 'resolved' ||
      rawStatus === 'ignored'
    );

    let statusBadge = '';
    if (matchSt === 'matched' || rawStatus === 'matched') {
      statusBadge = '<span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold whitespace-nowrap">✓ Đã khớp</span>';
    } else if (matchSt === 'resolved' || rawStatus === 'resolved') {
      statusBadge = '<span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold whitespace-nowrap">✓ Đã xử lý</span>';
    } else if (matchSt === 'ignored' || rawStatus === 'ignored') {
      statusBadge = '<span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-bold whitespace-nowrap">⊘ Đã bỏ qua</span>';
    } else if (matchSt === 'underpaid' || (expectedAmt > 0 && diffAmt < 0)) {
      statusBadge = '<span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold whitespace-nowrap">⚠️ Chuyển thiếu</span>';
    } else if (matchSt === 'overpaid' || (expectedAmt > 0 && diffAmt > 0)) {
      statusBadge = '<span class="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold whitespace-nowrap">➕ Chuyển thừa</span>';
    } else {
      statusBadge = '<span class="px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 text-[11px] font-bold whitespace-nowrap">✕ Sai nội dung</span>';
    }

    let diffHtml = '<div class="text-[11px] text-red-600 font-semibold">Không tìm thấy đơn khớp</div>';
    if (expectedAmt > 0) {
      if (diffAmt > 0) {
        diffHtml = `<div class="text-[11px] text-blue-700 font-bold">Kỳ vọng: ${fmt(expectedAmt)} · Lệch <span class="underline">+${fmt(diffAmt)}</span></div>`;
      } else if (diffAmt < 0) {
        diffHtml = `<div class="text-[11px] text-amber-700 font-bold">Kỳ vọng: ${fmt(expectedAmt)} · Lệch <span class="underline">${fmt(diffAmt)}</span></div>`;
      } else {
        diffHtml = `<div class="text-[11px] text-emerald-700 font-semibold">Kỳ vọng: ${fmt(expectedAmt)} (Khớp 0đ)</div>`;
      }
    } else if (matchSt === 'ignored' || rawStatus === 'ignored') {
      diffHtml = '<div class="text-[11px] text-slate-500 font-semibold">Đã bỏ qua đối soát</div>';
    } else if (isResolved) {
      diffHtml = '<div class="text-[11px] text-emerald-700 font-semibold">Đã hoàn tất đối soát</div>';
    }

    const actionsHtml = isResolved
      ? `<span class="text-[11px] font-semibold ${matchSt === 'ignored' ? 'text-slate-500' : 'text-emerald-700'}">${rawMatchedCode ? 'Đã gán #' + detectedCode : (matchSt === 'ignored' ? 'Đã bỏ qua' : 'Đã đối soát')}</span>`
      : `<div class="inline-flex items-center justify-end gap-1.5 flex-wrap">
           <button type="button" onclick="openReconcileAssignModal('${safeJsId}')" class="px-2.5 py-1 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-[11px] cursor-pointer whitespace-nowrap">🔗 Gán vào đơn</button>
           <button type="button" onclick="resolveBankTransaction('${safeJsId}', 'resolved')" class="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[11px] cursor-pointer whitespace-nowrap">✓ Đã xử lý</button>
           <button type="button" onclick="resolveBankTransaction('${safeJsId}', 'ignored')" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 font-bold text-[11px] cursor-pointer whitespace-nowrap">⊘ Bỏ qua</button>
         </div>`;

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="py-3 px-4">
          <div class="font-mono font-bold text-[#0F172A]">${refCode}</div>
          <div class="text-[11px] text-[#64748B]">${txTime} · ${bankName}</div>
        </td>
        <td class="py-3 px-4 max-w-[260px]">
          <div class="font-mono text-xs font-semibold text-[#0F172A] break-words">${content}</div>
          <div class="text-[11px] text-[#64748B] mt-0.5">
            Mã nhận diện: ${rawMatchedCode ? `<span class="font-mono font-bold text-[#16A34A]">#${detectedCode}</span>` : '<span class="text-red-500 italic">Không nhận diện được</span>'}
          </div>
          ${reasonNote ? `<div class="text-[10px] text-slate-600 italic mt-0.5 break-words">📝 ${escapeSearchHTML(reasonNote)}${tx.resolved_by_name ? ' · ' + escapeSearchHTML(tx.resolved_by_name) : ''}</div>` : ''}
        </td>
        <td class="py-3 px-4 text-right whitespace-nowrap">
          <div class="font-heading font-extrabold text-sm text-[#16A34A]">+${fmt(amountIn)}</div>
          ${diffHtml}
        </td>
        <td class="py-3 px-4 text-center">${statusBadge}</td>
        <td class="py-3 px-4 text-right">${actionsHtml}</td>
      </tr>
    `;
  }).join('');
}

function openReconcileAssignModal(txId) {
  if (!isManagerOrAdmin()) return;
  const tx = cachedBankTransactions.find(item => String(item.id ?? item.tx_id ?? item.reference_code) === String(txId));
  const modal = document.getElementById('reconcile-assign-modal');
  if (!modal || !tx) return;

  const idInput = document.getElementById('rec-tx-id');
  const infoBox = document.getElementById('rec-tx-info');
  const codeInput = document.getElementById('rec-booking-code');
  const statusSelect = document.getElementById('rec-target-status');
  const noteInput = document.getElementById('rec-assign-note');

  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');
  const amtIn = Number(tx.transfer_amount ?? tx.amount_in ?? tx.amountIn ?? tx.transferAmount ?? tx.amount ?? 0);
  const refDisplay = tx.sepay_tx_id || tx.reference_code || tx.id || '';
  const txTimeDisplay = tx.transaction_date || tx.created_at || tx.time || '';
  const prefillCode = tx.matched_booking_code || tx.detected_booking_code || tx.booking_code || tx.detected_code || '';

  if (idInput) idInput.value = String(tx.id ?? tx.tx_id ?? tx.reference_code ?? '');
  if (infoBox) {
    infoBox.innerHTML = `
      <div class="flex justify-between gap-2"><span>Mã GD: <b class="font-mono">${escapeSearchHTML(refDisplay)}</b></span><span class="font-extrabold text-[#16A34A]">+${fmt(amtIn)}</span></div>
      <div>Nội dung CK: <b class="font-mono text-[#0F172A]">${escapeSearchHTML(tx.content || tx.transaction_content || '')}</b></div>
      <div class="text-[11px] text-[#64748B]">Thời gian: ${escapeSearchHTML(txTimeDisplay)} · ${escapeSearchHTML(tx.bank_name || tx.gateway || 'VietQR')}</div>
    `;
  }

  populateReconcileBookingDatalist(cachedCandidateBookings);

  if (codeInput) codeInput.value = prefillCode;
  if (statusSelect) statusSelect.value = 'auto';
  if (noteInput) noteInput.value = '';

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  if (codeInput) setTimeout(() => codeInput.focus(), 100);
}
window.openReconcileAssignModal = openReconcileAssignModal;

function closeReconcileAssignModal() {
  const modal = document.getElementById('reconcile-assign-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}
window.closeReconcileAssignModal = closeReconcileAssignModal;

async function submitReconcileAssign(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!isManagerOrAdmin()) return;

  const txId = (document.getElementById('rec-tx-id')?.value || '').trim();
  const bookingCode = (document.getElementById('rec-booking-code')?.value || '').trim().toUpperCase();
  const targetStatus = document.getElementById('rec-target-status')?.value || 'auto';
  const note = (document.getElementById('rec-assign-note')?.value || '').trim();

  if (!txId || !bookingCode) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập mã đơn đặt sân cần gán!', 'warning');
    return;
  }

  let serverHandled = false;
  let serverMsg = '';
  try {
    const res = await fetch('../api/admin.php?action=bank_transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sub_action: 'assign_booking',
        tx_id: txId,
        id: txId,
        booking_code: bookingCode,
        target_payment_status: targetStatus,
        target_status: targetStatus,
        note: note
      })
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json && json.success) {
      serverHandled = true;
      serverMsg = json.message || '';
    } else if (json && (json.success === false || res.status >= 400)) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(json.message || 'Lỗi khi gán giao dịch vào đơn!', 'error', 3500);
      return;
    }
  } catch (err) {}

  const db = window.SanBongApp?.SanBongDB;
  if (db && typeof db.resolveBankTransaction === 'function') {
    db.resolveBankTransaction(txId, {
      booking_code: bookingCode,
      target_status: targetStatus,
      note: note,
      status: 'resolved'
    });
  }

  closeReconcileAssignModal();
  await loadBankTransactions();
  renderAdminPayments();
  renderOverviewTodayBookings();
  renderOverviewKPIs();
  renderTimelineGantt();
  if (isOwnerAdmin() && typeof loadAuditLogs === 'function') loadAuditLogs();

  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(serverMsg || `🔗 Đã gán giao dịch vào đơn #${bookingCode} và cập nhật trạng thái thanh toán!`, 'success', 3500);
  }
}
window.submitReconcileAssign = submitReconcileAssign;

async function resolveBankTransaction(txId, status = 'resolved') {
  if (!isManagerOrAdmin() || !txId) return;

  const targetResStatus = status === 'ignored' ? 'ignored' : 'resolved';
  const defaultNote = targetResStatus === 'ignored'
    ? 'Giao dịch không thuộc đơn đặt sân'
    : 'Đã kiểm tra & hoàn tất xử lý đối soát';
  const promptMsg = targetResStatus === 'ignored'
    ? 'Nhập ghi chú lý do bỏ qua giao dịch này (Bắt buộc):'
    : 'Nhập ghi chú xác nhận đã xử lý giao dịch này (Bắt buộc):';

  const rawNote = window.prompt(promptMsg, defaultNote);
  if (rawNote === null) return;
  const note = String(rawNote).trim();
  if (!note) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Vui lòng nhập ghi chú xử lý không để trống!', 'warning', 3000);
    }
    return;
  }

  let serverMsg = '';
  try {
    const res = await fetch('../api/admin.php?action=bank_transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sub_action: 'resolve',
        tx_id: txId,
        id: txId,
        resolution_status: targetResStatus,
        status: targetResStatus,
        note: note
      })
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json && json.success) {
      serverMsg = json.message || '';
    } else if (json && (json.success === false || res.status >= 400)) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(json.message || 'Không thể cập nhật trạng thái giao dịch!', 'error', 3500);
      return;
    }
  } catch (err) {}

  const db = window.SanBongApp?.SanBongDB;
  if (db && typeof db.resolveBankTransaction === 'function') {
    db.resolveBankTransaction(txId, { status: targetResStatus, note: note });
  }

  await loadBankTransactions();
  if (isOwnerAdmin() && typeof loadAuditLogs === 'function') loadAuditLogs();
  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(
      serverMsg || (targetResStatus === 'ignored'
        ? '⊘ Đã đánh dấu Bỏ qua giao dịch ngân hàng!'
        : '✓ Đã đánh dấu giao dịch ngân hàng là Đã xử lý!'),
      'success',
      3000
    );
  }
}
window.resolveBankTransaction = resolveBankTransaction;

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
  const pendingPayments = (isManagerOrAdmin() && db.getPendingPayments) ? db.getPendingPayments() : [];
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

function filterAdminCustomers(filterType) {
  currentCustomerFilter = filterType || 'all';
  const mapBtn = {
    'all': 'cust-filter-all',
    'debt': 'cust-filter-debt',
    'noshow': 'cust-filter-noshow'
  };
  Object.keys(mapBtn).forEach(k => {
    const btn = document.getElementById(mapBtn[k]);
    if (btn) {
      if (k === currentCustomerFilter) {
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold bg-[#16A34A] text-white shadow-xs cursor-pointer';
      } else if (k === 'debt') {
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 cursor-pointer';
      } else if (k === 'noshow') {
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 cursor-pointer';
      } else {
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer';
      }
    }
  });
  renderAdminCustomers();
}
window.filterAdminCustomers = filterAdminCustomers;

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
    { name: 'Trần Minh Hoàng', phone: '0352 313 548', tier: 'Bạc', matches: 14, spend: 8420000, points: 842, noShowCount: 0, debtAmount: 0 },
    { name: 'Lê Đức Anh (FC Cầu Giấy)', phone: '0903 112 233', tier: 'Vàng', matches: 41, spend: 24900000, points: 2490, noShowCount: 0, debtAmount: 0 },
    { name: 'Phạm Quốc Bảo (HUTECH)', phone: '0918 445 566', tier: 'Đồng', matches: 6, spend: 2100000, points: 210, noShowCount: 0, debtAmount: 0 }
  ];

  baseCustomers.forEach(c => {
    const cleanP = c.phone.replace(/[^\d]/g, '');
    customerMap[cleanP] = Object.assign({}, c);
  });

  allBookings.forEach(b => {
    const phone = (b.phone || '').trim();
    const cleanP = phone.replace(/[^\d]/g, '');
    if (!cleanP) return;
    const name = b.customerName || 'Khách vãng lai';
    const total = Number(b.totalPrice || 0);

    if (!customerMap[cleanP]) {
      customerMap[cleanP] = {
        name: name,
        phone: phone,
        tier: 'Đồng',
        matches: 0,
        spend: 0,
        points: 0,
        noShowCount: 0,
        debtAmount: 0
      };
    }
    customerMap[cleanP].matches += 1;
    customerMap[cleanP].spend += total;
    customerMap[cleanP].points = Math.floor(customerMap[cleanP].spend / 10000);

    const st = String(b.status || '');
    const paySt = String(b.paymentStatus || b.payment_status || '');
    if (st === 'Khách chưa đến' || st.includes('No-Show') || paySt === 'Tịch thu cọc 30%') {
      customerMap[cleanP].noShowCount += 1;
    } else if (st !== 'Đã hủy' && st !== 'Hoàn thành') {
      const dep = Number(b.depositAmount || Math.round(total * 0.3));
      const rem = typeof b.remainingAmount === 'number' ? b.remainingAmount : Math.max(0, total - dep);
      if (rem > 0) {
        customerMap[cleanP].debtAmount += rem;
      }
    }

    if (customerMap[cleanP].spend >= 20000000 || customerMap[cleanP].matches >= 30) {
      customerMap[cleanP].tier = 'Kim Cương';
    } else if (customerMap[cleanP].spend >= 10000000 || customerMap[cleanP].matches >= 15) {
      customerMap[cleanP].tier = 'Vàng';
    } else if (customerMap[cleanP].spend >= 4000000 || customerMap[cleanP].matches >= 6) {
      customerMap[cleanP].tier = 'Bạc';
    } else {
      customerMap[cleanP].tier = 'Đồng';
    }
  });

  let customers = Object.values(customerMap);

  if (currentCustomerFilter === 'debt') {
    customers = customers.filter(c => Number(c.debtAmount || 0) > 0);
  } else if (currentCustomerFilter === 'noshow') {
    customers = customers.filter(c => Number(c.noShowCount || 0) >= 2);
  }

  if (searchQ) {
    customers = customers.filter(c => {
      const cName = c.name.toLowerCase();
      const cPhone = c.phone.replace(/[\s\.\-]+/g, '');
      return cName.includes(searchQ) || (cleanQPhone.length >= 3 && cPhone.includes(cleanQPhone));
    });
  }

  customers.sort((a, b) => (b.debtAmount - a.debtAmount) || (b.noShowCount - a.noShowCount) || (b.spend - a.spend));

  if (customers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="py-10 text-center text-[#64748B]">
          <div class="text-xl mb-1">🔍</div>
          <div class="font-bold text-xs text-[#0F172A]">Không tìm thấy khách hàng nào trong bộ lọc này</div>
          <div class="text-[11px] text-[#94A3B8]">Thử chuyển bộ lọc hoặc tìm với số điện thoại khác</div>
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

  tbody.innerHTML = customers.map(c => {
    const ns = Number(c.noShowCount || 0);
    const debt = Number(c.debtAmount || 0);
    const nsBadge = ns >= 2
      ? `<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">⚠️ ${ns} lần bùng (Cảnh báo)</span>`
      : (ns === 1
        ? `<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">1 lần vắng mặt</span>`
        : `<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">✓ 0 lần (Uy tín)</span>`);

    const debtHtml = debt > 0
      ? `<span class="font-extrabold text-[#DC2626]">${debt.toLocaleString('vi-VN')}đ</span>`
      : `<span class="text-slate-400 font-medium">0đ</span>`;

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="py-3 px-4 font-bold text-[#0F172A]">${escapeSearchHTML(c.name)}</td>
        <td class="py-3 px-4 font-mono font-medium text-[#475569]">${escapeSearchHTML(c.phone)}</td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded text-[11px] font-bold border ${tierColors[c.tier] || 'bg-slate-100 text-slate-700'}">
            ${escapeSearchHTML(c.tier)}
          </span>
        </td>
        <td class="py-3 px-4 font-medium text-[#334155]">${Number(c.matches) || 0} trận</td>
        <td class="py-3 px-4 font-bold text-[#16A34A]">${Number(c.points).toLocaleString('vi-VN')} đ</td>
        <td class="py-3 px-4 text-center">${nsBadge}</td>
        <td class="py-3 px-4 text-right">${debtHtml}</td>
        <td class="py-3 px-4 text-right font-extrabold text-[#0F172A]">${Number(c.spend).toLocaleString('vi-VN')}đ</td>
      </tr>
    `;
  }).join('');
}

window.setReportDateRange = function(rangeType) {
  const fromInput = document.getElementById('rpt-from-date');
  const toInput = document.getElementById('rpt-to-date');
  const todayISO = getLocalTodayISO();
  const now = new Date();

  if (rangeType === 'today') {
    if (fromInput) fromInput.value = todayISO;
    if (toInput) toInput.value = todayISO;
  } else if (rangeType === '7days') {
    const d7 = new Date(now);
    d7.setDate(now.getDate() - 6);
    const fromISO = `${d7.getFullYear()}-${String(d7.getMonth() + 1).padStart(2, '0')}-${String(d7.getDate()).padStart(2, '0')}`;
    if (fromInput) fromInput.value = fromISO;
    if (toInput) toInput.value = todayISO;
  } else if (rangeType === 'month') {
    const firstDayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    if (fromInput) fromInput.value = firstDayISO;
    if (toInput) toInput.value = todayISO;
  } else {
    if (fromInput) fromInput.value = '';
    if (toInput) toInput.value = '';
  }
  renderAdminReports();
};

async function renderAdminReports() {
  if (!isManagerOrAdmin()) return;
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const fromDate = (document.getElementById('rpt-from-date')?.value || '').trim();
  const toDate = (document.getElementById('rpt-to-date')?.value || '').trim();

  let reportData = null;
  try {
    const qs = new URLSearchParams({ action: 'reports' });
    if (fromDate) qs.set('from', fromDate);
    if (toDate) qs.set('to', toDate);
    const res = await fetch(`../api/admin.php?${qs.toString()}`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && json.data) {
        reportData = json.data;
      }
    }
  } catch (e) {}

  let totalRev = 0;
  let totalMatches = 0;
  let servicesRev = 0;
  let depositRev = 0;
  let remainingRev = 0;
  let cashRev = 0;
  let vietqrRev = 0;
  let p5Rev = 0, p5Count = 0;
  let p7Rev = 0, p7Count = 0;
  let p11Rev = 0, p11Count = 0;
  let pitchRows = [];

  if (reportData) {
    const s = reportData.summary || reportData;
    totalRev = Number(s.totalRevenue ?? reportData.totalRevenue ?? 0);
    totalMatches = Number(s.totalMatches ?? reportData.totalMatches ?? 0);
    servicesRev = Number(s.serviceRevenue ?? s.servicesRevenue ?? reportData.servicesRevenue ?? 0);
    depositRev = Number(s.depositRevenue ?? reportData.depositRevenue ?? 0);
    remainingRev = Number(s.remaining70Revenue ?? s.remainingRevenue ?? reportData.remainingRevenue ?? 0);
    cashRev = Number(s.cashRevenue ?? reportData.cashRevenue ?? 0);
    vietqrRev = Number(s.transferRevenue ?? s.vietqrRevenue ?? reportData.vietqrRevenue ?? 0);

    const t5 = reportData.byType?.[5] || reportData.byType?.p5 || {};
    const t7 = reportData.byType?.[7] || reportData.byType?.p7 || {};
    const t11 = reportData.byType?.[11] || reportData.byType?.p11 || {};

    p5Rev = Number(t5.revenue || 0);
    p5Count = Number(t5.count ?? t5.matches ?? 0);
    p7Rev = Number(t7.revenue || 0);
    p7Count = Number(t7.count ?? t7.matches ?? 0);
    p11Rev = Number(t11.revenue || 0);
    p11Count = Number(t11.count ?? t11.matches ?? 0);
    pitchRows = Array.isArray(reportData.byPitch) ? reportData.byPitch : [];
  } else {
    const bookings = db.getAllBookings ? db.getAllBookings() : [];
    const pitches = db.getPitches ? db.getPitches() : [];
    const pitchRevMap = {};
    pitches.forEach(p => {
      pitchRevMap[p.id] = { id: p.id, name: p.name, typeName: p.typeName, status: p.status, matches: 0, revenue: 0 };
    });

    bookings.forEach(b => {
      if (b.status === 'Đã hủy' || b.paymentStatus === 'Đã hủy' || b.paymentStatus === 'Đã hoàn cọc 100%') return;
      const bDate = String(b.date || b.booking_date || '').slice(0, 10);
      if (fromDate && bDate && bDate < fromDate) return;
      if (toDate && bDate && bDate > toDate) return;

      const total = Number(b.totalPrice || 0);
      const dep = Number(b.depositAmount || Math.round(total * 0.3));
      let collected = 0;
      let colDep = 0;
      let colRem = 0;

      if (b.status === 'Hoàn thành' || b.paymentStatus === 'Đã thanh toán 100%' || b.paymentStatus === 'Đã thanh toán đủ') {
        collected = total;
        colDep = dep;
        colRem = Math.max(0, total - dep);
      } else if (b.status === 'Đang đá' || b.status === 'Đã xác nhận' || b.status === 'Khách chưa đến' || b.paymentStatus === 'Đã cọc 30%' || b.paymentStatus === 'Tịch thu cọc 30%') {
        if (!String(b.paymentMethod || '').includes('Chưa cọc')) {
          collected = dep;
          colDep = dep;
        }
      }

      totalRev += collected;
      depositRev += colDep;
      remainingRev += colRem;
      totalMatches += 1;

      const pm = String(b.paymentMethod || '').toLowerCase();
      if (pm.includes('tiền mặt')) {
        cashRev += collected;
      } else {
        vietqrRev += collected;
      }

      if (Array.isArray(b.services) && collected > 0) {
        b.services.forEach(s => {
          servicesRev += Number(s.price || 0) * Number(s.quantity || 1);
        });
      }

      const pId = String(b.pitchId || '').toUpperCase();
      if (pId.startsWith('P5') || (b.pitchName && b.pitchName.includes('Sân 5'))) {
        p5Rev += collected;
        p5Count += 1;
      } else if (pId.startsWith('P11') || (b.pitchName && b.pitchName.includes('Sân 11'))) {
        p11Rev += collected;
        p11Count += 1;
      } else {
        p7Rev += collected;
        p7Count += 1;
      }

      if (pitchRevMap[b.pitchId]) {
        pitchRevMap[b.pitchId].matches += 1;
        pitchRevMap[b.pitchId].revenue += collected;
      }
    });
    pitchRows = Object.values(pitchRevMap);
  }

  const avgRev = totalMatches > 0 ? Math.round(totalRev / totalMatches) : 0;

  const setElText = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };

  setElText('rpt-total-revenue', totalRev.toLocaleString('vi-VN') + 'đ');
  setElText('rpt-total-matches', totalMatches + ' ca');
  setElText('rpt-services-revenue', servicesRev.toLocaleString('vi-VN') + 'đ');
  setElText('rpt-avg-revenue', avgRev.toLocaleString('vi-VN') + 'đ');
  setElText('rpt-deposit-revenue', depositRev.toLocaleString('vi-VN') + 'đ');
  setElText('rpt-remaining-revenue', remainingRev.toLocaleString('vi-VN') + 'đ');
  setElText('rpt-cash-revenue', cashRev.toLocaleString('vi-VN') + 'đ');
  setElText('rpt-vietqr-revenue', vietqrRev.toLocaleString('vi-VN') + 'đ');

  setElText('rpt-p5-revenue', p5Rev.toLocaleString('vi-VN') + 'đ');
  setElText('rpt-p5-count', p5Count + ' ca đặt');
  setElText('rpt-p7-revenue', p7Rev.toLocaleString('vi-VN') + 'đ');
  setElText('rpt-p7-count', p7Count + ' ca đặt');
  setElText('rpt-p11-revenue', p11Rev.toLocaleString('vi-VN') + 'đ');
  setElText('rpt-p11-count', p11Count + ' ca đặt');

  const tbody = document.getElementById('admin-reports-tbody');
  if (tbody) {
    tbody.innerHTML = pitchRows.map(p => `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="py-3 px-4 font-bold text-[#0F172A]">${escapeSearchHTML(p.name)}</td>
        <td class="py-3 px-4 text-[#475569]">${escapeSearchHTML(p.typeName || p.type_name || '')}</td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded text-[11px] font-bold ${p.status === 'Bảo trì' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}">
            ${escapeSearchHTML(p.status)}
          </span>
        </td>
        <td class="py-3 px-4 text-center font-bold text-[#334155]">${Number(p.matches || 0)} ca</td>
        <td class="py-3 px-4 text-right font-extrabold text-[#16A34A]">${Number(p.revenue || 0).toLocaleString('vi-VN')}đ</td>
      </tr>
    `).join('');
  }
}

async function exportAdminReportsCSV() {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền xuất báo cáo doanh thu!', 'error');
    return;
  }

  const fromDate = (document.getElementById('rpt-from-date')?.value || '').trim();
  const toDate = (document.getElementById('rpt-to-date')?.value || '').trim();

  // Ưu tiên gọi API xuất CSV của server nếu hỗ trợ trả về file CSV trực tiếp
  try {
    const qs = new URLSearchParams({ action: 'export_reports_csv' });
    if (fromDate) qs.set('from', fromDate);
    if (toDate) qs.set('to', toDate);
    const res = await fetch(`../api/admin.php?${qs.toString()}`, { cache: 'no-store' });
    if (res.ok) {
      const ct = String(res.headers.get('content-type') || '').toLowerCase();
      if (ct.includes('text/csv') || ct.includes('application/csv') || ct.includes('application/octet-stream')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Bao_Cao_Doanh_Thu_${fromDate || 'all'}_${toDate || 'all'}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        if (window.SanBongApp?.showToast) {
          window.SanBongApp.showToast('📥 Đã xuất file báo cáo doanh thu Excel/CSV thành công!', 'success', 3000);
        }
        return;
      }
    }
  } catch (e) {}

  // Fallback chuẩn UTF-8 BOM cho Excel trên máy khách
  const db = window.SanBongApp?.SanBongDB;
  const bookings = (db && db.getAllBookings) ? db.getAllBookings() : [];
  const filtered = bookings.filter(b => {
    const bDate = String(b.date || b.booking_date || '').slice(0, 10);
    if (fromDate && bDate && bDate < fromDate) return false;
    if (toDate && bDate && bDate > toDate) return false;
    return true;
  });

  const csvEscape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [];
  lines.push(['BÁO CÁO DOANH THU & ĐỐI SOÁT SÂN BÓNG PRO', `Từ ngày: ${fromDate || 'Tất cả'}`, `Đến ngày: ${toDate || 'Tất cả'}`].map(csvEscape).join(','));
  lines.push([]);
  lines.push(['Mã đơn', 'Ngày đá', 'Khung giờ', 'Sân bóng', 'Khách hàng', 'Số điện thoại', 'Tổng tiền (VNĐ)', 'Tiền cọc (VNĐ)', 'Còn lại (VNĐ)', 'Hình thức TT', 'Trạng thái TT', 'Trạng thái ca', 'Ghi chú'].map(csvEscape).join(','));

  filtered.forEach(b => {
    const total = Number(b.totalPrice || 0);
    const dep = Number(b.depositAmount || 0);
    const rem = Number(b.remainingAmount ?? Math.max(0, total - dep));
    lines.push([
      b.code || '',
      b.date || b.booking_date || '',
      b.slotTime || b.slot_time || '',
      b.pitchName || b.pitchId || '',
      b.customerName || '',
      b.phone || '',
      total,
      dep,
      rem,
      b.paymentMethod || '',
      b.paymentStatus || '',
      b.status || '',
      b.note || ''
    ].map(csvEscape).join(','));
  });

  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Bao_Cao_Doanh_Thu_${fromDate || 'all'}_${toDate || 'all'}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast('📥 Đã xuất báo cáo doanh thu ra file Excel / CSV (UTF-8 BOM)!', 'success', 3000);
  }
}
window.exportAdminReportsCSV = exportAdminReportsCSV;

function formatPriceInputVND(num) {
  return Number(num || 0).toLocaleString('vi-VN') + 'đ';
}

function parsePriceInputVND(str, fallback = 0) {
  const digits = String(str || '').replace(/[^\d]/g, '');
  const val = parseInt(digits, 10);
  return (!isNaN(val) && val > 0) ? val : fallback;
}

async function loadPricingTable() {
  if (!isOwnerAdmin()) return;
  const db = window.SanBongApp?.SanBongDB;
  let pitches = db ? db.getPitches() : [];

  try {
    const res = await fetch('../api/pitches.php?all=1', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && json.data && Array.isArray(json.data.pitches)) {
        pitches = json.data.pitches;
        localStorage.setItem('sb_pitches_v2', JSON.stringify(pitches));
      }
    }
  } catch (e) {}

  const p5 = pitches.find(p => Number(p.type) === 5) || { basePrice: 250000, peakPrice: 350000, weekendPrice: 380000 };
  const p7 = pitches.find(p => Number(p.type) === 7) || { basePrice: 450000, peakPrice: 650000, weekendPrice: 700000 };
  const p11 = pitches.find(p => Number(p.type) === 11) || { basePrice: 900000, peakPrice: 1200000, weekendPrice: 1400000 };

  const setVal = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.value = formatPriceInputVND(v);
  };

  setVal('price-p5-base', p5.basePrice || 250000);
  setVal('price-p5-peak', p5.peakPrice || 350000);
  setVal('price-p5-weekend', p5.weekendPrice || 380000);

  setVal('price-p7-base', p7.basePrice || 450000);
  setVal('price-p7-peak', p7.peakPrice || 650000);
  setVal('price-p7-weekend', p7.weekendPrice || 700000);

  setVal('price-p11-base', p11.basePrice || 900000);
  setVal('price-p11-peak', p11.peakPrice || 1200000);
  setVal('price-p11-weekend', p11.weekendPrice || 1400000);
}
window.loadPricingTable = loadPricingTable;

async function savePricingTable() {
  if (!isOwnerAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Chủ sân mới có quyền thay đổi bảng giá niêm yết!', 'error');
    return;
  }

  const p5Base = parsePriceInputVND(document.getElementById('price-p5-base')?.value, 250000);
  const p5Peak = parsePriceInputVND(document.getElementById('price-p5-peak')?.value, 350000);
  const p5Wknd = parsePriceInputVND(document.getElementById('price-p5-weekend')?.value, 380000);

  const p7Base = parsePriceInputVND(document.getElementById('price-p7-base')?.value, 450000);
  const p7Peak = parsePriceInputVND(document.getElementById('price-p7-peak')?.value, 650000);
  const p7Wknd = parsePriceInputVND(document.getElementById('price-p7-weekend')?.value, 700000);

  const p11Base = parsePriceInputVND(document.getElementById('price-p11-base')?.value, 900000);
  const p11Peak = parsePriceInputVND(document.getElementById('price-p11-peak')?.value, 1200000);
  const p11Wknd = parsePriceInputVND(document.getElementById('price-p11-weekend')?.value, 1400000);

  const pricingPayload = {
    p5: {
      base: p5Base,
      peak: p5Peak,
      weekend: p5Wknd,
      basePrice: p5Base,
      peakPrice: p5Peak,
      weekendPrice: p5Wknd
    },
    p7: {
      base: p7Base,
      peak: p7Peak,
      weekend: p7Wknd,
      basePrice: p7Base,
      peakPrice: p7Peak,
      weekendPrice: p7Wknd
    },
    p11: {
      base: p11Base,
      peak: p11Peak,
      weekend: p11Wknd,
      basePrice: p11Base,
      peakPrice: p11Peak,
      weekendPrice: p11Wknd
    }
  };

  const btn = document.getElementById('btn-save-pricing');
  const origText = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Đang lưu bảng giá...';
  }

  try {
    await fetch('../api/admin.php?action=save_pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pricing: pricingPayload })
    });
  } catch (e) {}

  const db = window.SanBongApp?.SanBongDB;
  if (db) {
    const pitches = db.getPitches().map(p => {
      const t = Number(p.type);
      const tier = t === 5 ? pricingPayload.p5 : (t === 11 ? pricingPayload.p11 : pricingPayload.p7);
      return Object.assign({}, p, {
        basePrice: tier.basePrice,
        peakPrice: tier.peakPrice,
        weekendPrice: tier.weekendPrice
      });
    });
    localStorage.setItem('sb_pitches_v2', JSON.stringify(pitches));
    window.dispatchEvent(new CustomEvent('sb-data-synced', { detail: { pitches } }));
  }

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = origText || 'Lưu bảng giá';
  }

  await loadPricingTable();
  renderAdminPitches();
  initQuickBookingForm();

  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast('✓ Đã lưu cấu hình bảng giá mới vào Cơ sở dữ liệu & đồng bộ sang trang Đặt sân!', 'success', 3500);
  }
}
window.savePricingTable = savePricingTable;

async function loadAdminSettings() {
  if (!isOwnerAdmin()) return;
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  let cfg = db.getSystemConfig ? db.getSystemConfig() : {
    depositRate: 30,
    hotline: '0352 313 548',
    openHours: '05:30 - 23:00 hàng ngày (kể cả Lễ, Tết)',
    holdMinutes: 15,
    refundFullHours: 24,
    refundPartialHours: 4,
    autoCancelEnabled: true
  };

  let bank = {};
  try {
    bank = JSON.parse(localStorage.getItem('sb_bank_v1') || '{}');
  } catch (e) {}

  try {
    const res = await fetch('../api/admin.php?action=settings', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && json.data) {
        const sRoot = json.data;
        const s = (sRoot.settings && typeof sRoot.settings === 'object') ? sRoot.settings : sRoot;
        const bInfo = (sRoot.bankInfo && typeof sRoot.bankInfo === 'object') ? sRoot.bankInfo : sRoot;
        const autoRaw = s.autoCancelEnabled ?? s.auto_cancel_enabled;
        cfg = {
          depositRate: Number(s.depositRate ?? s.deposit_rate ?? cfg.depositRate ?? 30),
          hotline: s.hotline || cfg.hotline || '0352 313 548',
          openHours: s.openHours || s.open_hours || cfg.openHours || '05:30 - 23:00 hàng ngày (kể cả Lễ, Tết)',
          holdMinutes: Math.max(5, Math.min(120, Number(s.holdMinutes ?? s.hold_minutes ?? cfg.holdMinutes ?? 15))),
          refundFullHours: Math.max(1, Math.min(168, Number(s.refundFullHours ?? s.refund_full_hours ?? cfg.refundFullHours ?? 24))),
          refundPartialHours: Math.max(0, Math.min(48, Number(s.refundPartialHours ?? s.refund_partial_hours ?? cfg.refundPartialHours ?? 4))),
          autoCancelEnabled: autoRaw === undefined ? (cfg.autoCancelEnabled !== false) : (autoRaw === true || autoRaw === 1 || autoRaw === '1' || autoRaw === 'true')
        };
        const acc = bInfo.accountNo || bInfo.accountNumber || bInfo.account_no || bank.accountNo || bank.accountNumber || '0123456789';
        bank = {
          bankName: bInfo.bankName || bInfo.bank_name || bank.bankName || 'Vietcombank',
          bankCode: (bInfo.bankCode || bInfo.bank_code || bank.bankCode || 'VCB').toUpperCase(),
          accountNo: acc,
          accountNumber: acc,
          accountName: (bInfo.accountName || bInfo.account_holder || bank.accountName || 'CONG TY CP SAN BONG PRO').toUpperCase()
        };
        localStorage.setItem('sb_system_config', JSON.stringify(cfg));
        localStorage.setItem('sb_bank_v1', JSON.stringify(bank));
      }
    }
  } catch (e) {}

  const depositRateInput = document.getElementById('cfg-deposit-rate');
  const bankNameInput = document.getElementById('cfg-bank-name');
  const bankCodeInput = document.getElementById('cfg-bank-code');
  const bankAccInput = document.getElementById('cfg-bank-acc');
  const bankHolderInput = document.getElementById('cfg-bank-holder');
  const hotlineInput = document.getElementById('cfg-hotline');
  const openHoursInput = document.getElementById('cfg-open-hours');
  const holdMinutesInput = document.getElementById('cfg-hold-minutes');
  const refundFullInput = document.getElementById('cfg-refund-full-hours');
  const refundPartialInput = document.getElementById('cfg-refund-partial-hours');
  const autoCancelInput = document.getElementById('cfg-auto-cancel-enabled');

  if (depositRateInput) depositRateInput.value = cfg.depositRate || 30;
  if (bankNameInput) bankNameInput.value = bank.bankName || 'Vietcombank';
  if (bankCodeInput) bankCodeInput.value = bank.bankCode || 'VCB';
  if (bankAccInput) bankAccInput.value = bank.accountNo || bank.accountNumber || '0123456789';
  if (bankHolderInput) bankHolderInput.value = bank.accountName || 'CONG TY CP SAN BONG PRO';
  if (hotlineInput) hotlineInput.value = cfg.hotline || '0352 313 548';
  if (openHoursInput) openHoursInput.value = cfg.openHours || '05:30 - 23:00 hàng ngày (kể cả Lễ, Tết)';
  if (holdMinutesInput) holdMinutesInput.value = cfg.holdMinutes ?? 15;
  if (refundFullInput) refundFullInput.value = cfg.refundFullHours ?? 24;
  if (refundPartialInput) refundPartialInput.value = cfg.refundPartialHours ?? 4;
  if (autoCancelInput) autoCancelInput.checked = cfg.autoCancelEnabled !== false;
}

async function saveAdminSettings(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!isOwnerAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Chủ sân mới có quyền thay đổi cài đặt hệ thống!', 'error');
    return;
  }

  const depositRate = Math.max(10, Math.min(100, parseInt(document.getElementById('cfg-deposit-rate')?.value || '30', 10) || 30));
  const bankName = (document.getElementById('cfg-bank-name')?.value || 'Vietcombank').trim();
  const bankCode = (document.getElementById('cfg-bank-code')?.value || 'VCB').trim().toUpperCase();
  const accountNo = (document.getElementById('cfg-bank-acc')?.value || '0123456789').trim();
  const accountName = (document.getElementById('cfg-bank-holder')?.value || 'CONG TY CP SAN BONG PRO').trim().toUpperCase();
  const hotline = (document.getElementById('cfg-hotline')?.value || '0352 313 548').trim();
  const openHours = (document.getElementById('cfg-open-hours')?.value || '05:30 - 23:00').trim();
  const holdMinutes = Math.max(5, Math.min(120, parseInt(document.getElementById('cfg-hold-minutes')?.value || '15', 10) || 15));
  const refundFullHours = Math.max(1, Math.min(168, parseInt(document.getElementById('cfg-refund-full-hours')?.value || '24', 10) || 24));
  const rawPartial = parseInt(document.getElementById('cfg-refund-partial-hours')?.value || '4', 10);
  const refundPartialHours = Math.max(0, Math.min(48, isNaN(rawPartial) ? 4 : rawPartial));
  const autoCancelEnabled = Boolean(document.getElementById('cfg-auto-cancel-enabled')?.checked ?? true);

  if (refundPartialHours >= refundFullHours) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Mốc sát giờ không hoàn cọc phải nhỏ hơn mốc hoàn 100% cọc!', 'warning', 3500);
    }
    return;
  }

  const cfg = {
    depositRate,
    hotline,
    openHours,
    holdMinutes,
    refundFullHours,
    refundPartialHours,
    autoCancelEnabled
  };
  const bank = { bankName, bankCode, accountNo, accountNumber: accountNo, accountName };

  try {
    localStorage.setItem('sb_system_config', JSON.stringify(cfg));
    localStorage.setItem('sb_bank_v1', JSON.stringify(bank));
  } catch (err) {
    console.error('Lỗi lưu cài đặt:', err);
  }

  try {
    await fetch('../api/admin.php?action=settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        depositRate,
        holdMinutes,
        refundFullHours,
        refundPartialHours,
        autoCancelEnabled,
        hold_minutes: holdMinutes,
        refund_full_hours: refundFullHours,
        refund_partial_hours: refundPartialHours,
        auto_cancel_enabled: autoCancelEnabled ? 1 : 0,
        bankName,
        bankCode,
        accountNo,
        accountNumber: accountNo,
        accountName,
        hotline,
        openHours
      })
    });
  } catch (e) {}

  window.dispatchEvent(new CustomEvent('sb-data-synced', { detail: { bankInfo: bank, settings: cfg } }));

  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast('✓ Đã lưu cài đặt hệ thống, chính sách cọc & cấu hình VietQR vào Cơ sở dữ liệu thành công!', 'success', 3500);
  }
}

async function runAutoReleaseNow() {
  if (!isOwnerAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Chủ sân mới có quyền chạy quét nhả đơn quá hạn!', 'error');
    return;
  }

  const btn = document.getElementById('btn-run-auto-cancel-now');
  const origHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Đang quét đơn quá hạn...';
  }

  let releasedCount = 0;
  let serverMsg = '';
  let serverOk = false;

  try {
    const res = await fetch('../api/admin.php?action=run_auto_release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json && json.success) {
      serverOk = true;
      releasedCount = Number(json.data?.released_count ?? json.data?.releasedCount ?? json.data?.released ?? json.released_count ?? json.released ?? 0);
      serverMsg = json.message || '';
    }
  } catch (e) {}

  const db = window.SanBongApp?.SanBongDB;
  if (!serverOk && db) {
    const cfg = db.getSystemConfig ? db.getSystemConfig() : { holdMinutes: 15 };
    const holdMs = Math.max(5, Number(cfg.holdMinutes || 15)) * 60 * 1000;
    const allBookings = db.getAllBookings();
    let changed = false;
    allBookings.forEach(b => {
      const pSt = String(b.paymentStatus || '');
      const st = String(b.status || '');
      if (st !== 'Đã hủy' && st !== 'Hoàn thành' && st !== 'Đang đá' && (pSt === 'Chờ duyệt cọc' || pSt === 'Chờ cọc 30%')) {
        const createdMs = b.createdAt ? Date.parse(String(b.createdAt).replace(' ', 'T')) : NaN;
        if (!isNaN(createdMs) && (Date.now() - createdMs) > holdMs) {
          b.status = 'Đã hủy';
          b.paymentStatus = 'Đã hủy';
          b.remainingAmount = 0;
          b.note = (b.note ? b.note + ' | ' : '') + `[Tự động nhả đơn quá ${cfg.holdMinutes || 15}p chưa cọc]`;
          releasedCount++;
          changed = true;
        }
      }
    });
    if (changed) {
      try { localStorage.setItem('sb_bookings_v1', JSON.stringify(allBookings)); } catch (err) {}
      if (typeof db.addAuditLog === 'function') {
        db.addAuditLog('ADMIN_RUN_AUTO_RELEASE', 'SYSTEM', 'Quét đơn quá hạn chưa cọc', `Đã tự động nhả ${releasedCount} đơn quá hạn`);
      }
    }
  }

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = origHtml || '⚡ Quét nhả đơn quá hạn ngay';
  }

  refreshAllAdminViews();
  initQuickBookingForm();
  if (typeof loadAuditLogs === 'function') loadAuditLogs();

  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(
      serverMsg || (releasedCount > 0
        ? `⚡ Đã quét và giải phóng ${releasedCount} đơn giữ chỗ quá hạn chưa cọc!`
        : '✓ Hệ thống sạch: Không có đơn giữ chỗ quá hạn nào cần nhả.'),
      releasedCount > 0 ? 'success' : 'info',
      4000
    );
  }
}
window.runAutoReleaseNow = runAutoReleaseNow;

window.renderAdminCustomers = renderAdminCustomers;
window.renderAdminReports = renderAdminReports;
window.loadAdminSettings = loadAdminSettings;
window.saveAdminSettings = saveAdminSettings;

// =========================================================
// 1. QUÉT QR CODE CHECK-IN NHẬN SÂN (QR SCANNER MODAL)
// =========================================================
let qrHiddenCanvas = null;

function getQRHiddenCanvas() {
  if (!qrHiddenCanvas) {
    qrHiddenCanvas = document.createElement('canvas');
    qrHiddenCanvas.id = 'qr-hidden-canvas';
    qrHiddenCanvas.style.display = 'none';
    document.body.appendChild(qrHiddenCanvas);
  }
  return qrHiddenCanvas;
}

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
    // Ưu tiên hiển thị các đơn hôm nay cần nhận sân hoặc đang đá
    const candidates = all.filter(b => b.status === 'Đã xác nhận' || b.status === 'Chờ duyệt cọc' || b.status === 'Đang đá' || b.status === 'Khách chưa đến').slice(0, 8);
    quickList.innerHTML = candidates.map(b => {
      let dotColor = 'bg-emerald-500';
      if (b.status === 'Đang đá') dotColor = 'bg-blue-500';
      else if (b.status === 'Chờ duyệt cọc') dotColor = 'bg-amber-500';
      else if (b.status === 'Khách chưa đến') dotColor = 'bg-red-500';

      return `
        <button type="button" onclick="lookupQRTicket('${b.code}')" class="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-xs font-semibold text-[#0F172A] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs">
          <span class="w-2 h-2 rounded-full ${dotColor} shrink-0"></span>
          <span class="font-mono font-bold text-[#16A34A]">${b.code}</span>
          <span class="truncate max-w-[130px] text-slate-600">${escapeSearchHTML(b.pitchName || '')}</span>
          <span class="text-[11px] text-slate-400">(${b.slotTime || ''})</span>
        </button>
      `;
    }).join('');
  }

  if (preCode) {
    if (input) input.value = preCode;
    lookupQRTicket(preCode);
  } else {
    activeQRBookingCode = '';
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 150);
    }
    if (resultBox) {
      resultBox.classList.add('hidden');
      resultBox.innerHTML = '';
    }
    const checkinBtn = document.getElementById('qr-confirm-checkin-btn');
    if (checkinBtn) {
      checkinBtn.innerHTML = '✅ Xác nhận Check-in Nhận Sân';
      checkinBtn.className = 'btn-sm btn-primary font-bold';
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
  const laser = document.getElementById('qr-scan-laser');
  const btn = document.getElementById('qr-camera-toggle-btn');

  if (qrCameraStream) {
    stopCameraQRScan();
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Trình duyệt không hỗ trợ mở Camera trực tiếp. Vui lòng chọn ảnh vé QR hoặc bấm vé gợi ý bên dưới!', 'warning', 3500);
    }
    return;
  }

  try {
    qrCameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    if (video) {
      video.srcObject = qrCameraStream;
      video.classList.remove('hidden');
      await video.play();
    }
    if (placeholder) placeholder.classList.add('hidden');
    if (laser) {
      laser.classList.remove('hidden');
      laser.classList.add('animate-laser');
    }
    if (btn) btn.innerHTML = '<span>⏹️</span> Tắt Camera';

    const canvas = getQRHiddenCanvas();
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    let barcodeDetector = null;
    if ('BarcodeDetector' in window) {
      try {
        barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
      } catch (e) {}
    }

    qrScanTimer = setInterval(async () => {
      if (!video || video.readyState < 2) return;
      try {
        let codeFound = null;

        // 1. Thử quét bằng jsQR engine (độ tương thích 100% mọi trình duyệt)
        if (typeof window.jsQR === 'function') {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qr = window.jsQR(imgData.data, imgData.width, imgData.height, {
            inversionAttempts: 'dontInvert'
          });
          if (qr && qr.data) {
            codeFound = qr.data;
          }
        }

        // 2. Thử native BarcodeDetector nếu chưa bắt được
        if (!codeFound && barcodeDetector) {
          const barcodes = await barcodeDetector.detect(video);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            codeFound = barcodes[0].rawValue;
          }
        }

        if (codeFound) {
          const match = codeFound.match(/(ASF[FSE]?[0-9]{6,8}|DH[0-9]{6,8})/i);
          const cleanCode = match ? match[1].toUpperCase() : codeFound.trim().toUpperCase();
          if (cleanCode) {
            if (window.SanBongApp?.playScanBeep) window.SanBongApp.playScanBeep(true);
            stopCameraQRScan();
            lookupQRTicket(cleanCode);
            if (window.SanBongApp?.showToast) {
              window.SanBongApp.showToast('✓ Đã quét thành công mã vé: ' + cleanCode, 'success', 2500);
            }
          }
        }
      } catch (err) {}
    }, 150);

  } catch (err) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Không thể mở Camera (thiếu quyền hoặc thiết bị không có webcam). Hãy chọn ảnh vé QR hoặc bấm danh sách chọn nhanh!', 'info', 4000);
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
  const laser = document.getElementById('qr-scan-laser');
  const btn = document.getElementById('qr-camera-toggle-btn');
  if (video) {
    video.pause();
    video.srcObject = null;
    video.classList.add('hidden');
  }
  if (placeholder) placeholder.classList.remove('hidden');
  if (laser) {
    laser.classList.add('hidden');
    laser.classList.remove('animate-laser');
  }
  if (btn) btn.innerHTML = '<span>📷</span> Bật Camera Quét QR';
}

async function handleQRImageUpload(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = async () => {
      const canvas = getQRHiddenCanvas();
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);

      let found = null;
      if (typeof window.jsQR === 'function') {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qr = window.jsQR(imgData.data, imgData.width, imgData.height);
        if (qr && qr.data) found = qr.data;
      }

      if (!found && 'BarcodeDetector' in window) {
        try {
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          const barcodes = await detector.detect(canvas);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            found = barcodes[0].rawValue;
          }
        } catch (err) {}
      }

      if (found) {
        if (window.SanBongApp?.playScanBeep) window.SanBongApp.playScanBeep(true);
        const match = found.match(/(ASF[FSE]?[0-9]{6,8}|DH[0-9]{6,8})/i);
        const cleanCode = match ? match[1].toUpperCase() : found.trim().toUpperCase();
        lookupQRTicket(cleanCode);
        if (window.SanBongApp?.showToast) {
          window.SanBongApp.showToast('✓ Đã quét thành công mã vé từ ảnh: ' + cleanCode, 'success', 2500);
        }
      } else {
        // Tên file có chứa mã đơn
        const nameMatch = file.name.match(/(ASF[FSE]?[0-9]{6,8}|DH[0-9]{6,8})/i);
        if (nameMatch) {
          if (window.SanBongApp?.playScanBeep) window.SanBongApp.playScanBeep(true);
          lookupQRTicket(nameMatch[1].toUpperCase());
          return;
        }

        if (window.SanBongApp?.playScanBeep) window.SanBongApp.playScanBeep(false);
        if (window.SanBongApp?.showToast) {
          window.SanBongApp.showToast('Không tìm thấy mã QR trong ảnh vừa chọn. Vui lòng thử ảnh rõ nét hơn hoặc nhập mã vé!', 'warning', 3500);
        }
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function lookupQRTicket(codeOpt) {
  const input = document.getElementById('qr-code-input');
  const resultBox = document.getElementById('qr-ticket-result');
  const checkinBtn = document.getElementById('qr-confirm-checkin-btn');
  if (!resultBox) return;

  let raw = (codeOpt || input?.value || '').trim();
  const match = raw.match(/(ASF[FSE]?[0-9]{6,8}|DH[0-9]{6,8})/i);
  const rawCode = match ? match[1].toUpperCase() : raw.toUpperCase();

  if (input && rawCode) input.value = rawCode;

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
    if (checkinBtn) {
      checkinBtn.disabled = true;
      checkinBtn.className = 'btn-sm bg-slate-200 text-slate-400 cursor-not-allowed';
    }
    return;
  }

  activeQRBookingCode = booking.code;
  const total = Number(booking.totalPrice || 0);
  const deposit = Number(booking.depositAmount || Math.round(total * 0.3));
  const remaining = Math.max(0, total - deposit);

  let statusBadgeHtml = '';
  let canCheckin = false;

  if (booking.status === 'Đã xác nhận') {
    statusBadgeHtml = '<span class="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-xs">🟢 HỢP LỆ — SẴN SÀNG NHẬN SÂN</span>';
    canCheckin = true;
  } else if (booking.status === 'Đang đá') {
    statusBadgeHtml = '<span class="px-3 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-300 font-extrabold text-xs">🔵 ĐANG ĐÁ — ĐÃ NHẬN SÂN</span>';
    canCheckin = false;
  } else if (booking.status === 'Chờ duyệt cọc') {
    statusBadgeHtml = '<span class="px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-extrabold text-xs">🟡 CHỜ DUYỆT CỌC (Chưa xác nhận cọc)</span>';
    canCheckin = true;
  } else if (booking.status === 'Hoàn thành') {
    statusBadgeHtml = '<span class="px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-300 font-extrabold text-xs">⚪ ĐÃ HOÀN THÀNH (Đã thu 100%)</span>';
    canCheckin = false;
  } else {
    statusBadgeHtml = `<span class="px-3 py-1 rounded-full bg-red-100 text-red-800 border border-red-300 font-extrabold text-xs">🔴 ${escapeSearchHTML(booking.status)}</span>`;
    canCheckin = false;
  }

  let srvListText = 'Không có dịch vụ thêm';
  if (booking.services && booking.services.length > 0) {
    srvListText = booking.services.map(s => `${escapeSearchHTML(s.name)} × ${s.quantity}`).join(', ');
  }

  resultBox.className = 'p-4 rounded-xl bg-white border-2 border-emerald-500/80 shadow-md space-y-3 text-xs';
  resultBox.innerHTML = `
    <div class="flex items-center justify-between border-b border-slate-200 pb-2.5">
      <div class="flex items-center gap-2">
        <span class="px-2.5 py-1 rounded-md bg-[#0F172A] text-white font-mono font-extrabold text-sm tracking-wide">${booking.code}</span>
        <span class="font-bold text-[#0F172A] text-sm sm:text-base">${escapeSearchHTML(booking.pitchName)}</span>
      </div>
      ${statusBadgeHtml}
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#334155] bg-slate-50 p-3 rounded-lg border border-slate-200">
      <div>👤 Khách hàng: <b class="text-[#0F172A]">${escapeSearchHTML(booking.customerName)}</b></div>
      <div>📞 Số điện thoại: <b class="font-mono text-[#0F172A]">${escapeSearchHTML(booking.phone || 'Chưa lưu')}</b></div>
      <div>📅 Ngày thi đấu: <b class="text-[#0F172A]">${window.SanBongApp.formatDateVN(booking.date)}</b></div>
      <div>⏰ Khung giờ: <b class="text-[#16A34A]">${escapeSearchHTML(booking.slotTime)}</b></div>
      <div class="sm:col-span-2 pt-1 border-t border-slate-200 text-slate-600">
        🥤 Dịch vụ kèm theo: <b>${srvListText}</b>
      </div>
    </div>

    <div class="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-2">
      <span>Tổng giá trị ca: <b class="text-sm font-bold text-[#0F172A]">${window.SanBongApp.formatVND(total)}</b></span>
      <span>Đã cọc trước: <b class="text-emerald-700 font-bold">${window.SanBongApp.formatVND(deposit)}</b></span>
      <span>Còn phải thu: <b class="text-sm font-extrabold text-[#DC2626]">${window.SanBongApp.formatVND(remaining)}</b></span>
    </div>

    <div class="flex flex-wrap items-center justify-end gap-2 pt-1">
      <button type="button" onclick="closeQRScannerModal(); openInvoiceModal('${booking.code}')" class="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1 border border-slate-300">
        <span>🖨️ In Vé / Hóa đơn</span>
      </button>
      <button type="button" onclick="closeQRScannerModal(); openInPlayModal('${booking.code}')" class="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs">
        <span>⚙️ Mở Điều Hành / Quản Lý Ca</span>
      </button>
    </div>
  `;
  resultBox.classList.remove('hidden');

  if (checkinBtn) {
    if (canCheckin) {
      checkinBtn.disabled = false;
      checkinBtn.className = 'btn-sm btn-primary font-bold shadow';
      checkinBtn.innerHTML = '✅ Xác nhận Check-in Nhận Sân';
      checkinBtn.onclick = () => confirmQRCheckin(booking.code);
    } else if (booking.status === 'Đang đá') {
      checkinBtn.disabled = false;
      checkinBtn.className = 'btn-sm bg-sky-600 hover:bg-sky-700 text-white font-bold shadow';
      checkinBtn.innerHTML = '⚙️ Mở Điều Hành & Thu Tiền';
      checkinBtn.onclick = () => {
        closeQRScannerModal();
        openInPlayModal(booking.code);
      };
    } else {
      checkinBtn.disabled = true;
      checkinBtn.className = 'btn-sm bg-slate-200 text-slate-400 cursor-not-allowed';
      checkinBtn.innerHTML = 'Đã hoàn thành / Không thể check-in';
    }
  }
}

async function confirmQRCheckin(codeOpt) {
  const code = codeOpt || activeQRBookingCode;
  if (!code) {
    const inputVal = document.getElementById('qr-code-input')?.value.trim();
    if (inputVal) lookupQRTicket(inputVal);
    if (!activeQRBookingCode) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng tra cứu mã vé hợp lệ trước khi xác nhận Check-in!', 'warning');
      return;
    }
  }

  const finalCode = code || activeQRBookingCode;
  const db = window.SanBongApp?.SanBongDB;
  const b = db ? db.getBookingByCode(finalCode) : null;
  const pitchName = b ? b.pitchName : 'sân';

  try {
    await fetch('../api/bookings.php?action=checkin&code=' + encodeURIComponent(finalCode), { method: 'POST' });
  } catch (e) {
    console.warn('API Checkin offline fallback:', e);
  }

  if (db) db.checkinBooking(finalCode);

  if (window.SanBongApp?.playScanBeep) window.SanBongApp.playScanBeep(true);

  closeQRScannerModal();
  renderOverviewTodayBookings();
  renderTimelineGantt();
  renderOverviewKPIs();

  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast('🎉 CHECK-IN THÀNH CÔNG: Đội khách mã ' + finalCode + ' đã nhận ' + pitchName + '! Đèn sân đã bật & bắt đầu tính giờ thi đấu.', 'success', 4500);
  }
}

window.openQRScannerModal = openQRScannerModal;
window.closeQRScannerModal = closeQRScannerModal;
window.toggleCameraQRScan = toggleCameraQRScan;
window.handleQRImageUpload = handleQRImageUpload;
window.lookupQRTicket = lookupQRTicket;
window.confirmQRCheckin = confirmQRCheckin;

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
    const pitches = db.getPitches().filter(p => p.status !== 'Bảo trì' && p.status !== 'Ẩn');
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
      <option value="${s.id}">${s.name} — ${window.SanBongApp.formatVND(s.price)}/${s.unit} (Tồn: ${Number(s.stockQty ?? 50)})</option>
    `).join('');
  }

  const cancelReasonEl = document.getElementById('inplay-cancel-reason');
  if (cancelReasonEl) {
    cancelReasonEl.placeholder = 'Nhập lý do hủy ca (Bắt buộc nếu đơn đã thu tiền/cọc)...';
    if (cancelReasonEl.value === 'Khách báo hủy lịch trước thời hạn') {
      cancelReasonEl.value = '';
    }
    cancelReasonEl.classList.remove('border-red-500', 'ring-2', 'ring-red-300');
    if (!cancelReasonEl._boundClearErr) {
      cancelReasonEl._boundClearErr = true;
      cancelReasonEl.addEventListener('input', () => {
        cancelReasonEl.classList.remove('border-red-500', 'ring-2', 'ring-red-300');
      });
    }
  }

  const cancelHintEl = document.getElementById('inplay-cancel-policy-hint');
  const cancelPolicyEl = document.getElementById('inplay-cancel-policy');
  if (cancelHintEl || cancelPolicyEl) {
    const sysCfg = (db.getSystemConfig && db.getSystemConfig()) || { refundFullHours: 24, refundPartialHours: 4 };
    const fullH = Math.max(1, Number(sysCfg.refundFullHours ?? 24));
    const partH = Math.max(0, Number(sysCfg.refundPartialHours ?? 4));
    let hoursLeft = null;
    if (booking.date) {
      const dPart = String(booking.date).trim().slice(0, 10);
      const tPart = booking.slotTime && String(booking.slotTime).includes('-')
        ? String(booking.slotTime).split('-')[0].trim()
        : String(booking.slotTime || '').trim();
      if (/^\d{1,2}:\d{2}$/.test(tPart)) {
        const [hh, mm] = tPart.split(':').map(n => String(parseInt(n, 10) || 0).padStart(2, '0'));
        const ko = new Date(`${dPart}T${hh}:${mm}:00`);
        if (!isNaN(ko.getTime())) {
          hoursLeft = (ko.getTime() - Date.now()) / (1000 * 60 * 60);
        }
      }
    }
    if (hoursLeft !== null) {
      let suggested = 'refund_100';
      let hintCls = 'bg-emerald-50 border-emerald-200 text-emerald-800';
      let hintText = `💡 Gợi ý (còn ${hoursLeft.toFixed(1)}h ≥ ${fullH}h): Hoàn 100% cọc`;
      if (hoursLeft < 0) {
        suggested = 'noshow_forfeit';
        hintCls = 'bg-red-50 border-red-200 text-red-800';
        hintText = `💡 Đã quá giờ đá ${Math.abs(Math.round(hoursLeft * 60))} phút: Tịch thu cọc 30% & Nhả sân`;
      } else if (hoursLeft < partH) {
        suggested = 'noshow_forfeit';
        hintCls = 'bg-red-50 border-red-200 text-red-800';
        hintText = `💡 Sát giờ (còn ${hoursLeft.toFixed(1)}h < ${partH}h): Không hoàn / Tịch thu cọc`;
      } else if (hoursLeft < fullH) {
        suggested = 'forfeit_50';
        hintCls = 'bg-amber-50 border-amber-200 text-amber-800';
        hintText = `💡 Gợi ý (còn ${hoursLeft.toFixed(1)}h, mốc ${partH}h–${fullH}h): Phạt 50% cọc`;
      }
      if (cancelPolicyEl) cancelPolicyEl.value = suggested;
      if (cancelHintEl) {
        cancelHintEl.textContent = hintText;
        cancelHintEl.className = `text-[11px] font-semibold rounded-lg px-2.5 py-1.5 mb-1.5 border ${hintCls}`;
      }
    } else if (cancelHintEl) {
      cancelHintEl.classList.add('hidden');
    }
  }

  const pkgBanner = document.getElementById('inplay-package-promo-banner');
  const pkgDesc = document.getElementById('inplay-package-promo-desc');
  const promo = booking.packagePromotion || (window.SanBongApp?.SanBongDB?.getPackagePromotion ? window.SanBongApp.SanBongDB.getPackagePromotion(booking.weeksCount || 1) : null);
  if (pkgBanner) {
    if (booking.weeksCount > 1 || String(booking.note || '').includes('Gói') || promo) {
      pkgBanner.classList.remove('hidden');
      pkgBanner.classList.add('flex');
      if (pkgDesc) {
        if (promo) {
          pkgDesc.textContent = `${promo.title}: Tài trợ ${promo.giftSummary} (Miễn phí 100%) - Vui lòng xuất nước và giao trọng tài cho trận này.`;
        } else if (String(booking.note || '').includes('trọng tài')) {
          pkgDesc.textContent = 'Gói 3 Tháng: Tài trợ 2 thùng nước suối (48 chai) + 1 trọng tài chuyên nghiệp - Vui lòng xuất nước và giao trọng tài cho trận này.';
        }
      }
    } else {
      pkgBanner.classList.add('hidden');
      pkgBanner.classList.remove('flex');
    }
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
  const db = window.SanBongApp?.SanBongDB;
  const booking = db ? db.getBookingByCode(activeInPlayCode) : null;
  const policy = document.getElementById('inplay-cancel-policy')?.value || 'refund_100';
  const reasonInput = document.getElementById('inplay-cancel-reason');
  const rawReason = (reasonInput?.value || '').trim();

  const payStatusStr = String(booking?.paymentStatus || booking?.payment_status || '');
  const hasPaidMoney = Boolean(
    booking && (
      Number(booking.depositAmount || 0) > 0 ||
      payStatusStr.includes('Đã cọc') ||
      payStatusStr.includes('Đã thanh toán')
    )
  );

  if (hasPaidMoney && (!rawReason || rawReason === 'Khách báo hủy lịch trước thời hạn')) {
    if (reasonInput) {
      reasonInput.value = '';
      reasonInput.classList.add('border-red-500', 'ring-2', 'ring-red-300');
      reasonInput.focus();
    }
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('⚠️ Đơn đã thu tiền/đặt cọc bắt buộc phải nhập lý do hủy vào ô Ghi chú lý do!', 'error', 4000);
    }
    return;
  }

  if (reasonInput) {
    reasonInput.classList.remove('border-red-500', 'ring-2', 'ring-red-300');
  }
  const reason = rawReason || 'Khách báo hủy lịch trước thời hạn (đơn chưa thu tiền)';

  let serverMsg = '';
  try {
    const res = await fetch('../api/admin.php?action=manage_booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: activeInPlayCode, sub_action: 'early_cancel', policy: policy, reason: reason })
    });
    const resJson = await res.json().catch(() => ({}));
    if (res.status >= 400 && res.status < 500) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(resJson.message || '⚠️ Đơn đã thu tiền/đặt cọc bắt buộc phải nhập lý do hủy!', 'error', 4000);
      }
      return;
    }
    if (res.ok && resJson && resJson.message) {
      serverMsg = resJson.message;
    }
  } catch (e) {}

  if (policy === 'noshow_forfeit') {
    const updatedNoShow = db ? db.releaseNoShowBooking(activeInPlayCode) : null;
    closeInPlayModal();
    initQuickBookingForm();
    refreshAllAdminViews(activeInPlayCode);
    if ((updatedNoShow || serverMsg) && window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(serverMsg || `⚠️ Đã đánh dấu đơn ${activeInPlayCode} là "Khách chưa đến" (tịch thu cọc 30%) & nhả sân trống!`, 'warning', 4000);
    }
    return;
  }

  const updated = db ? db.cancelBookingEarly(activeInPlayCode, policy, reason) : null;
  closeInPlayModal();
  initQuickBookingForm();
  refreshAllAdminViews(activeInPlayCode);

  if ((updated || serverMsg) && window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(serverMsg || `🛑 Đã hủy lịch đơn ${activeInPlayCode} (${updated?.paymentStatus || ''}) và giải phóng sân trống!`, 'warning', 4000);
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
  if (!isOwnerAdmin()) return;
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
  if (!isOwnerAdmin() || !code) return;
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
  if (!isOwnerAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Chủ sân mới có quyền cấu hình Voucher!', 'error');
    return;
  }
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
  if (!isOwnerAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Chủ sân mới có quyền bật/tắt Voucher!', 'error');
    return;
  }
  if (!code) return;
  const db = window.SanBongApp?.SanBongDB;
  const updated = db ? db.toggleVoucherActive(code) : null;
  try {
    await fetch('../api/admin.php?action=vouchers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sub_action: 'toggle', code })
    });
  } catch (err) {}
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
  if (!isOwnerAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Chủ sân mới có quyền xóa Voucher!', 'error');
    return;
  }
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

// =========================================================
// 5. QUẢN LÝ TÀI KHOẢN NHÂN VIÊN TRỰC SÂN (TAB 9 - CHỦ SÂN)
// =========================================================
const STAFF_STORAGE_KEY = 'sb_staff_users_v1';
let cachedStaffUsers = [];

function getDefaultStaffList() {
  return [
    {
      id: 4,
      username: 'nhanvien',
      email: 'nhanvien@sanbongpro.vn',
      phone: '0352000111',
      full_name: 'Nhân Viên Trực Sân Ca 1',
      role: 'staff',
      status: 'active',
      created_at: '2026-11-10 08:00:00'
    }
  ];
}

function getLocalStaffUsers() {
  try {
    const raw = localStorage.getItem(STAFF_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return getDefaultStaffList();
}

function saveLocalStaffUsers(list) {
  try {
    localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(Array.isArray(list) ? list : []));
  } catch (e) {}
}

async function loadStaffUsers() {
  if (!isOwnerAdmin()) return;

  try {
    const res = await fetch('../api/admin.php?action=staff_users');
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data)) {
        cachedStaffUsers = json.data;
        saveLocalStaffUsers(cachedStaffUsers);
        renderStaffUsers(cachedStaffUsers);
        return;
      }
    }
  } catch (err) {
    console.warn('API staff_users offline fallback:', err);
  }

  cachedStaffUsers = getLocalStaffUsers();
  renderStaffUsers(cachedStaffUsers);
}

function renderStaffUsers(list) {
  if (!isOwnerAdmin()) return;

  const staffList = Array.isArray(list) ? list : cachedStaffUsers;
  const countBadge = document.getElementById('staff-count-badge');
  if (countBadge) {
    countBadge.textContent = `${staffList.length} nhân sự`;
  }

  const tbody = document.getElementById('admin-staff-tbody');
  if (!tbody) return;

  const thEls = Array.from(tbody.closest('table')?.querySelectorAll('thead th') || []);
  const colCount = thEls.length || 5;
  const headerTexts = thEls.map(th => (th.textContent || '').trim().toLowerCase());
  const hasRoleCol = headerTexts.some(t => t.includes('vai trò'));

  if (staffList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="${colCount}" class="py-8 text-center text-xs text-[#64748B]">
          Chưa có tài khoản nhân sự nào. Hãy tạo tài khoản mới ở biểu mẫu phía trên.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = staffList.map(u => {
    const staffId = Number(u.id) || 0;
    const rawUsername = String(u.username || '');
    const safeJsUsername = rawUsername.replace(/[^a-zA-Z0-9_]/g, '');
    const safeUsername = escapeSearchHTML(rawUsername);
    const safeFullName = escapeSearchHTML(u.full_name || '');
    const safePhone = escapeSearchHTML(u.phone || '');
    const safeEmail = escapeSearchHTML(u.email || `${rawUsername.toLowerCase()}@sanbongpro.vn`);
    const uRole = String(u.role || 'staff').toLowerCase() === 'manager' ? 'manager' : 'staff';
    const isLocked = (u.status || 'active') === 'locked';

    const roleBadge = uRole === 'manager'
      ? '<span class="px-2 py-0.5 rounded-full bg-purple-100 text-[#7C3AED] border border-purple-200 text-[10px] font-bold whitespace-nowrap">🛡️ Manager</span>'
      : '<span class="px-2 py-0.5 rounded-full bg-blue-100 text-[#2563EB] border border-blue-200 text-[10px] font-bold whitespace-nowrap">🏟️ Staff</span>';

    const roleCellHtml = `
      <div class="space-y-1">
        <div>${roleBadge}</div>
        <select onchange="handleChangeStaffRole(${staffId}, this.value)" aria-label="Đổi vai trò nhân sự" class="h-7 px-2 rounded-md border border-slate-200 bg-white text-[11px] font-semibold text-[#0F172A] cursor-pointer">
          <option value="staff" ${uRole === 'staff' ? 'selected' : ''}>Staff (Trực ca)</option>
          <option value="manager" ${uRole === 'manager' ? 'selected' : ''}>Manager (Quản lý)</option>
        </select>
      </div>
    `;

    const statusBadge = isLocked
      ? '<span class="px-2.5 py-0.5 rounded-full bg-red-100 text-[#DC2626] text-[11px] font-bold whitespace-nowrap">Đã khóa</span>'
      : '<span class="px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#16A34A] text-[11px] font-bold whitespace-nowrap">Đang hoạt động</span>';

    const toggleBtnLabel = isLocked ? '🔓 Mở khóa' : '🔒 Khóa';
    const toggleBtnClass = isLocked
      ? 'px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] border border-emerald-200 cursor-pointer whitespace-nowrap'
      : 'px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[11px] border border-red-200 cursor-pointer whitespace-nowrap';

    const actionHtml = `
      <div class="inline-flex items-center justify-end gap-1.5 flex-wrap">
        <button type="button" onclick="openResetStaffPwModal(${staffId}, '${safeJsUsername}')" class="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200 cursor-pointer whitespace-nowrap">🔑 Đổi MK</button>
        <button type="button" onclick="handleToggleStaffStatus(${staffId})" class="${toggleBtnClass}">${toggleBtnLabel}</button>
      </div>
    `;

    if (colCount === 5 && hasRoleCol) {
      return `
        <tr class="hover:bg-slate-50 transition-colors ${isLocked ? 'opacity-70 bg-rose-50/30' : ''}">
          <td class="py-3 px-4">
            <div class="font-mono font-bold text-[#0F172A]">@${safeUsername}</div>
            <div class="text-[11px] text-[#64748B]">${safeEmail}</div>
          </td>
          <td class="py-3 px-4">
            <div class="font-bold text-[#0F172A]">${safeFullName}</div>
            <div class="font-mono text-[11px] text-[#475569]">${safePhone}</div>
          </td>
          <td class="py-3 px-4">${roleCellHtml}</td>
          <td class="py-3 px-4">${statusBadge}</td>
          <td class="py-3 px-4 text-right">${actionHtml}</td>
        </tr>
      `;
    }

    return `
      <tr class="hover:bg-slate-50 transition-colors ${isLocked ? 'opacity-70 bg-rose-50/30' : ''}">
        <td class="py-3 px-4">
          <div class="font-mono font-bold text-[#0F172A]">@${safeUsername}</div>
          <div class="text-[11px] text-[#64748B]">${safeEmail}</div>
        </td>
        <td class="py-3 px-4">
          <div class="font-bold text-[#0F172A]">${safeFullName}</div>
          <div class="font-mono text-[11px] text-[#475569]">${safePhone}</div>
          <div class="mt-1">${roleBadge}</div>
        </td>
        <td class="py-3 px-4">${statusBadge}</td>
        <td class="py-3 px-4 text-right">${actionHtml}</td>
      </tr>
    `;
  }).join('');
}

async function handleCreateStaff(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!isOwnerAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Chủ sân mới có quyền tạo tài khoản nhân sự!', 'error');
    return;
  }

  const form = (e && e.target && e.target.tagName === 'FORM') ? e.target : (document.getElementById('admin-create-staff-form') || document.getElementById('staff-create-form'));
  const usernameEl = document.getElementById('staff-username') || document.getElementById('new-staff-username') || form?.querySelector('[name="username"]');
  const fullNameEl = document.getElementById('staff-fullname') || document.getElementById('staff-full-name') || document.getElementById('new-staff-fullname') || document.getElementById('staff-name') || form?.querySelector('[name="full_name"], [name="fullname"]');
  const phoneEl = document.getElementById('staff-phone') || document.getElementById('new-staff-phone') || form?.querySelector('[name="phone"]');
  const passwordEl = document.getElementById('staff-password') || document.getElementById('new-staff-password') || document.getElementById('staff-pw') || form?.querySelector('[name="password"]');
  const roleEl = document.getElementById('staff-role') || form?.querySelector('[name="role"]');
  const submitBtn = document.getElementById('staff-create-submit-btn') || document.getElementById('staff-create-btn') || document.getElementById('staff-submit-btn') || form?.querySelector('button[type="submit"]');

  const username = (usernameEl?.value || '').trim();
  const fullName = (fullNameEl?.value || '').trim();
  const phone = (phoneEl?.value || '').replace(/\s+/g, '');
  const password = String(passwordEl?.value || '');
  const role = (roleEl?.value === 'manager') ? 'manager' : 'staff';

  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Tên đăng nhập phải từ 3–30 ký tự (chữ cái, số, dấu gạch dưới _).', 'warning');
    return;
  }
  if (!fullName) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập họ và tên nhân sự.', 'warning');
    return;
  }
  if (!/^(0[3|5|7|8|9])[0-9]{8}$/.test(phone)) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Số điện thoại nhân sự phải đủ 10 số di động Việt Nam.', 'warning');
    return;
  }
  if (password.length < 6) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Mật khẩu nhân sự phải có tối thiểu 6 ký tự.', 'warning');
    return;
  }

  const origText = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Đang tạo tài khoản...';
  }

  try {
    const res = await fetch('../api/admin.php?action=staff_users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sub_action: 'create',
        username,
        full_name: fullName,
        phone,
        password,
        role
      })
    });
    const json = await res.json();

    if (res.ok && json.success) {
      if (form && typeof form.reset === 'function') form.reset();
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(`✓ ${json.message || 'Đã tạo tài khoản nhân sự thành công!'}`, 'success', 3500);
      }
      await loadStaffUsers();
      return;
    }

    if (res.status >= 400 && res.status < 500) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(json.message || 'Không thể tạo tài khoản nhân sự.', 'error', 3500);
      }
      return;
    }
    throw new Error(json.message || 'Server error');
  } catch (err) {
    const localList = getLocalStaffUsers();
    if (localList.some(u => String(u.username || '').toLowerCase() === username.toLowerCase())) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast('Tên đăng nhập này đã tồn tại trên hệ thống.', 'error');
      }
      return;
    }
    const newStaff = {
      id: Date.now(),
      username,
      email: `${username.toLowerCase()}@sanbongpro.vn`,
      phone,
      full_name: fullName,
      role,
      status: 'active',
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };
    localList.unshift(newStaff);
    saveLocalStaffUsers(localList);
    cachedStaffUsers = localList;
    renderStaffUsers(cachedStaffUsers);
    if (form && typeof form.reset === 'function') form.reset();
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(`✓ Đã tạo tài khoản ${role === 'manager' ? 'Quản lý sân' : 'Nhân viên trực'} ${username} (chế độ dự phòng offline)!`, 'success', 3500);
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origText;
    }
  }
}

async function handleChangeStaffRole(userId, newRole) {
  if (!isOwnerAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Chủ sân mới có quyền đổi vai trò nhân sự!', 'error');
    return;
  }

  const staffId = Number(userId);
  const role = (newRole === 'manager') ? 'manager' : 'staff';
  if (!staffId) return;

  try {
    const res = await fetch('../api/admin.php?action=staff_users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sub_action: 'update_role', id: staffId, role })
    });
    const json = await res.json();

    if (res.ok && json.success) {
      const localList = cachedStaffUsers.length > 0 ? [...cachedStaffUsers] : getLocalStaffUsers();
      const target = localList.find(u => Number(u.id) === staffId);
      if (target) {
        target.role = role;
        saveLocalStaffUsers(localList);
      }
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(`✓ ${json.message || 'Đã cập nhật vai trò nhân sự thành công!'}`, 'success', 3000);
      }
      await loadStaffUsers();
      return;
    }

    if (res.status >= 400 && res.status < 500) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(json.message || 'Không thể cập nhật vai trò nhân sự.', 'error');
      }
      renderStaffUsers(cachedStaffUsers);
      return;
    }
    throw new Error('Server fallback');
  } catch (err) {
    const localList = cachedStaffUsers.length > 0 ? [...cachedStaffUsers] : getLocalStaffUsers();
    const target = localList.find(u => Number(u.id) === staffId);
    if (target) {
      target.role = role;
      saveLocalStaffUsers(localList);
      cachedStaffUsers = localList;
      renderStaffUsers(cachedStaffUsers);
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(
          `✓ Đã chuyển vai trò @${target.username} sang ${role === 'manager' ? 'Quản lý sân (Manager)' : 'Nhân viên trực (Staff)'}.`,
          'success',
          3000
        );
      }
    }
  }
}
window.handleChangeStaffRole = handleChangeStaffRole;

async function handleToggleStaffStatus(id) {
  if (!isOwnerAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Chủ sân mới có quyền khóa/mở khóa nhân viên!', 'error');
    return;
  }

  const staffId = Number(id);
  if (!staffId) return;

  try {
    const res = await fetch('../api/admin.php?action=staff_users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sub_action: 'toggle_status', id: staffId })
    });
    const json = await res.json();

    if (res.ok && json.success) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(`✓ ${json.message || 'Đã cập nhật trạng thái nhân viên.'}`, 'success', 3000);
      }
      await loadStaffUsers();
      return;
    }

    if (res.status >= 400 && res.status < 500) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(json.message || 'Không thể cập nhật trạng thái nhân viên.', 'error');
      }
      return;
    }
    throw new Error('Server fallback');
  } catch (err) {
    const localList = cachedStaffUsers.length > 0 ? [...cachedStaffUsers] : getLocalStaffUsers();
    const target = localList.find(u => Number(u.id) === staffId);
    if (target) {
      target.status = target.status === 'locked' ? 'active' : 'locked';
      saveLocalStaffUsers(localList);
      cachedStaffUsers = localList;
      renderStaffUsers(cachedStaffUsers);
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(
          target.status === 'locked'
            ? `🔒 Đã khóa tài khoản nhân viên ${target.username}.`
            : `🔓 Đã mở khóa tài khoản nhân viên ${target.username}.`,
          'info',
          3000
        );
      }
    }
  }
}

function openResetStaffPwModal(id, username) {
  if (!isOwnerAdmin()) return;

  const modal = document.getElementById('staff-reset-pw-modal');
  const idEl = document.getElementById('reset-staff-id');
  const labelEl = document.getElementById('reset-staff-username-label');
  const pwEl = document.getElementById('reset-staff-new-pw');

  if (idEl) idEl.value = String(id || '');
  if (labelEl) labelEl.textContent = username || '';
  if (pwEl) pwEl.value = '';

  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (pwEl) setTimeout(() => pwEl.focus(), 100);
  }
}

function closeResetStaffPwModal() {
  const modal = document.getElementById('staff-reset-pw-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

async function submitResetStaffPassword(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!isOwnerAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Chủ sân mới có quyền đặt lại mật khẩu nhân viên!', 'error');
    return;
  }

  const form = (e && e.target && e.target.tagName === 'FORM') ? e.target : document.getElementById('staff-reset-pw-modal')?.querySelector('form');
  const id = Number(document.getElementById('reset-staff-id')?.value || '0');
  const password = String(document.getElementById('reset-staff-new-pw')?.value || '');
  const submitBtn = document.getElementById('reset-staff-submit-btn') || form?.querySelector('button[type="submit"]');

  if (!id) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Không xác định được tài khoản nhân viên.', 'error');
    return;
  }
  if (password.length < 6) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Mật khẩu mới phải có tối thiểu 6 ký tự!', 'warning');
    return;
  }

  const origText = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Đang cập nhật...';
  }

  try {
    const res = await fetch('../api/admin.php?action=staff_users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sub_action: 'reset_password', id, password })
    });
    const json = await res.json();

    if (res.ok && json.success) {
      closeResetStaffPwModal();
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(`✓ ${json.message || 'Đã đặt lại mật khẩu nhân viên thành công!'}`, 'success', 3500);
      }
      return;
    }

    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(json.message || 'Không thể đặt lại mật khẩu nhân viên.', 'error');
    }
  } catch (err) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Không thể kết nối máy chủ để đổi mật khẩu nhân viên.', 'error');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origText;
    }
  }
}

window.loadStaffUsers = loadStaffUsers;
window.renderStaffUsers = renderStaffUsers;
window.handleCreateStaff = handleCreateStaff;
window.handleToggleStaffStatus = handleToggleStaffStatus;
window.openResetStaffPwModal = openResetStaffPwModal;
window.closeResetStaffPwModal = closeResetStaffPwModal;
window.submitResetStaffPassword = submitResetStaffPassword;

// =========================================================
// MỤC 3.1: KHO NƯỚC & BÁN LẺ DỊCH VỤ TẠI QUẦY (POS INVENTORY)
// =========================================================
function updatePosSalePreview() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;
  const selEl = document.getElementById('pos-service-select');
  const qtyEl = document.getElementById('pos-service-qty');
  const totalEl = document.getElementById('pos-preview-total');
  const stockEl = document.getElementById('pos-preview-stock');
  if (!selEl) return;

  const srvId = selEl.value;
  const qty = Math.max(1, parseInt(qtyEl?.value || '1', 10) || 1);
  const srv = db.getServices().find(s => s.id === srvId);
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  if (srv) {
    const stock = Number(srv.stockQty ?? 50);
    const lineTotal = Number(srv.price || 0) * qty;
    if (totalEl) totalEl.textContent = fmt(lineTotal);
    const linePreviewEl = document.getElementById('pos-sale-line-preview');
    if (linePreviewEl) linePreviewEl.textContent = `Thành tiền: ${fmt(lineTotal)}`;
    if (stockEl) {
      stockEl.textContent = `${stock} ${srv.unit || ''}`;
      stockEl.className = stock <= Number(srv.minStockWarning ?? 10)
        ? 'font-bold text-red-600'
        : 'font-bold text-slate-700';
    }
  }
}
window.updatePosSalePreview = updatePosSalePreview;

function renderAdminInventory() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const services = db.getServices();
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  const openSrvBtn = document.getElementById('btn-open-service-modal');
  if (openSrvBtn) {
    openSrvBtn.classList.toggle('hidden', !isManagerOrAdmin());
  }

  // 1. Cập nhật banner cảnh báo sắp hết hàng
  const lowItems = services.filter(s => Number(s.stockQty ?? 50) <= Number(s.minStockWarning ?? 10));
  const lowBanner = document.getElementById('inventory-low-stock-banner');
  const lowText = document.getElementById('inventory-low-stock-text');
  if (lowBanner) {
    if (lowItems.length > 0) {
      const names = lowItems.map(i => `${i.name} (còn ${Number(i.stockQty ?? 0)} ${i.unit || ''})`).join(', ');
      if (lowText) {
        lowText.textContent = `CẢNH BÁO TỒN KHO THẤP: Có ${lowItems.length} mặt hàng chạm ngưỡng sắp hết (${names})! Vui lòng nhập thêm kho.`;
      }
      lowBanner.classList.remove('hidden');
      lowBanner.classList.add('flex');
    } else {
      lowBanner.classList.add('hidden');
      lowBanner.classList.remove('flex');
    }
  }

  // 2. Cập nhật dropdown POS
  const posSelect = document.getElementById('pos-service-select');
  if (posSelect) {
    const prevVal = posSelect.value;
    posSelect.innerHTML = services.map(s => {
      const st = Number(s.stockQty ?? 50);
      return `<option value="${s.id}" ${st <= 0 ? 'disabled' : ''}>${escapeSearchHTML(s.name)} — ${fmt(s.price)}/${escapeSearchHTML(s.unit || 'cái')} (Tồn: ${st})</option>`;
    }).join('');
    if (prevVal && services.some(s => s.id === prevVal)) {
      posSelect.value = prevVal;
    }
    if (!posSelect._boundPreview) {
      posSelect._boundPreview = true;
      posSelect.addEventListener('change', updatePosSalePreview);
      const qtyEl = document.getElementById('pos-service-qty');
      if (qtyEl) qtyEl.addEventListener('input', updatePosSalePreview);
    }
    updatePosSalePreview();
  }

  // 3. Render bảng tồn kho
  const tbody = document.getElementById('admin-inventory-tbody');
  if (!tbody) return;

  tbody.innerHTML = services.map(s => {
    const stock = Number(s.stockQty ?? 50);
    const minW = Number(s.minStockWarning ?? 10);
    const isLow = stock <= minW;

    const stockBadge = isLow
      ? `<span class="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700 border border-red-300">⚠️ Sắp hết</span>`
      : `<span class="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">✓ Đủ hàng</span>`;

    return `
      <tr class="hover:bg-slate-50 transition-colors ${isLow ? 'bg-red-50/30' : ''}">
        <td class="py-2.5 px-3 font-bold text-[#0F172A]">
          ${escapeSearchHTML(s.name)}
          <span class="text-[10px] font-mono text-slate-400 ml-1">(${escapeSearchHTML(s.id)})</span>
        </td>
        <td class="py-2.5 px-3 font-extrabold text-[#16A34A]">
          ${fmt(s.price)} <span class="text-[11px] font-normal text-slate-500">/ ${escapeSearchHTML(s.unit || 'đơn vị')}</span>
        </td>
        <td class="py-2.5 px-3 text-center">
          <span class="font-mono font-extrabold text-sm ${isLow ? 'text-red-600' : 'text-[#0F172A]'}">${stock}</span>
          <span class="text-[11px] text-slate-500">${escapeSearchHTML(s.unit || '')}</span>
          ${stockBadge}
        </td>
        <td class="py-2.5 px-3 text-center font-mono text-xs text-slate-500">
          ≤ ${minW} ${escapeSearchHTML(s.unit || '')}
        </td>
        <td class="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
          ${isManagerOrAdmin() ? `
            <button type="button" onclick="promptRestockService('${s.id}')" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs cursor-pointer">
              + Nhập kho
            </button>
            <button type="button" onclick="openServiceModal('${s.id}')" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#0F172A] border border-slate-300 font-bold text-[11px] cursor-pointer">
              ✏️ Sửa
            </button>
            <button type="button" onclick="handleDeleteService('${s.id}')" class="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-[11px] cursor-pointer" title="Ngừng kinh doanh">
              🗑️
            </button>
          ` : `
            <span class="text-[11px] text-slate-400 italic">Chỉ xem</span>
          `}
        </td>
      </tr>
    `;
  }).join('');
}
window.renderAdminInventory = renderAdminInventory;

async function handleCounterServiceSale(e) {
  if (e && e.preventDefault) e.preventDefault();
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const srvId = document.getElementById('pos-service-select')?.value || '';
  const qty = Math.max(1, parseInt(document.getElementById('pos-service-qty')?.value || '1', 10) || 1);
  const payMethod = document.getElementById('pos-pay-method')?.value || 'Tiền mặt tại quầy';
  const note = (document.getElementById('pos-sale-note')?.value || '').trim();

  const srv = db.getServices().find(s => s.id === srvId);
  if (!srv) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng chọn dịch vụ cần bán!', 'warning');
    return;
  }

  if (Number(srv.stockQty ?? 50) < qty) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(`⚠️ Tồn kho ${srv.name} chỉ còn ${srv.stockQty} ${srv.unit}, không đủ xuất ${qty}! Hãy nhập thêm kho.`, 'error', 4000);
    }
    return;
  }

  try {
    await fetch('../api/admin.php?action=inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sub_action: 'sell_counter',
        service_id: srvId,
        service_name: srv.name,
        quantity: qty,
        unit_price: srv.price,
        payment_method: payMethod,
        note: note
      })
    });
  } catch (err) {}

  const sale = db.recordCounterSale({
    serviceId: srvId,
    quantity: qty,
    paymentMethod: payMethod,
    note: note
  });

  if (sale) {
    const noteEl = document.getElementById('pos-sale-note');
    const qtyEl = document.getElementById('pos-service-qty');
    if (noteEl) noteEl.value = '';
    if (qtyEl) qtyEl.value = '1';
    renderAdminInventory();
    loadShiftHandovers();
    renderOverviewKPIs();
    if (isManagerOrAdmin()) renderAdminReports();

    const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(`💰 Đã bán ${qty}x ${sale.serviceName} (${fmt(sale.totalAmount)} - ${payMethod}) & trừ tồn kho!`, 'success', 3500);
    }
  }
}
window.handleCounterServiceSale = handleCounterServiceSale;

async function promptRestockService(serviceId) {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền nhập kho hàng!', 'error');
    return;
  }
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;
  const srv = db.getServices().find(s => s.id === serviceId);
  if (!srv) return;

  const rawQty = prompt(`📦 NHẬP THÊM KHO: ${srv.name}\n• Tồn kho hiện tại: ${Number(srv.stockQty ?? 0)} ${srv.unit || ''}\n• Nhập số lượng thêm vào kho (ví dụ: 24 hoặc 48):`, '24');
  if (rawQty === null) return;
  const added = parseInt(String(rawQty).replace(/[^\d]/g, ''), 10);
  if (!added || added <= 0) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Số lượng nhập kho phải lớn hơn 0!', 'warning');
    return;
  }

  try {
    await fetch('../api/admin.php?action=inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sub_action: 'restock', id: serviceId, add_qty: added, added_qty: added })
    });
  } catch (err) {}

  const updated = db.restockService(serviceId, added);
  renderAdminInventory();
  if (isOwnerAdmin() && typeof loadAuditLogs === 'function') loadAuditLogs();

  if (updated && window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(`📦 Đã nhập thêm +${added} ${updated.unit} cho "${updated.name}". Tồn kho mới: ${updated.stockQty} ${updated.unit}!`, 'success', 3500);
  }
}
window.promptRestockService = promptRestockService;

function openServiceModal(serviceId = '') {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền thêm/sửa dịch vụ!', 'error');
    return;
  }
  const modal = document.getElementById('service-crud-modal');
  if (!modal) return;

  const db = window.SanBongApp?.SanBongDB;
  const srv = (serviceId && db) ? db.getServices().find(s => s.id === serviceId) : null;

  const titleEl = document.getElementById('service-modal-title');
  const idEl = document.getElementById('srv-form-id');
  const nameEl = document.getElementById('srv-form-name');
  const priceEl = document.getElementById('srv-form-price');
  const unitEl = document.getElementById('srv-form-unit');
  const stockEl = document.getElementById('srv-form-stock');
  const minEl = document.getElementById('srv-form-min-stock');

  if (srv) {
    if (titleEl) titleEl.textContent = `✏️ Chỉnh sửa dịch vụ: ${srv.name}`;
    if (idEl) idEl.value = srv.id;
    if (nameEl) nameEl.value = srv.name || '';
    if (priceEl) priceEl.value = Number(srv.price || 10000);
    if (unitEl) unitEl.value = srv.unit || 'chai';
    if (stockEl) stockEl.value = Number(srv.stockQty ?? 50);
    if (minEl) minEl.value = Number(srv.minStockWarning ?? 10);
  } else {
    if (titleEl) titleEl.textContent = '➕ Thêm mặt hàng / Dịch vụ mới vào kho';
    if (idEl) idEl.value = '';
    if (nameEl) nameEl.value = '';
    if (priceEl) priceEl.value = 15000;
    if (unitEl) unitEl.value = 'chai';
    if (stockEl) stockEl.value = 48;
    if (minEl) minEl.value = 10;
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}
window.openServiceModal = openServiceModal;

function closeServiceModal() {
  const modal = document.getElementById('service-crud-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}
window.closeServiceModal = closeServiceModal;

async function saveServiceModal(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền lưu dịch vụ!', 'error');
    return;
  }
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const id = (document.getElementById('srv-form-id')?.value || '').trim();
  const name = (document.getElementById('srv-form-name')?.value || '').trim();
  const price = Math.max(0, parseInt(document.getElementById('srv-form-price')?.value || '0', 10));
  const unit = (document.getElementById('srv-form-unit')?.value || 'đơn vị').trim();
  const stockQty = Math.max(0, parseInt(document.getElementById('srv-form-stock')?.value || '0', 10));
  const minStockWarning = Math.max(0, parseInt(document.getElementById('srv-form-min-stock')?.value || '5', 10));

  if (!name) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập tên dịch vụ!', 'warning');
    return;
  }

  const payload = {
    id: id || undefined,
    name,
    price,
    unit,
    stock_qty: stockQty,
    min_stock_warning: minStockWarning,
    stockQty,
    minStockWarning
  };

  try {
    await fetch('../api/admin.php?action=inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ sub_action: 'save_service' }, payload))
    });
  } catch (err) {}

  db.saveServiceItem(payload);
  closeServiceModal();
  renderAdminInventory();

  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(`✓ Đã lưu mặt hàng "${name}" vào danh mục kho dịch vụ!`, 'success', 3000);
  }
}
window.saveServiceModal = saveServiceModal;

async function handleDeleteService(serviceId) {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền xóa dịch vụ!', 'error');
    return;
  }
  const db = window.SanBongApp?.SanBongDB;
  const srv = db ? db.getServices().find(s => s.id === serviceId) : null;
  if (!srv) return;
  if (!confirm(`Ngừng kinh doanh dịch vụ "${srv.name}" (${srv.id})?`)) return;

  try {
    await fetch('../api/admin.php?action=inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sub_action: 'delete_service', id: serviceId })
    });
  } catch (err) {}

  if (db && typeof db.deleteServiceItem === 'function') {
    db.deleteServiceItem(serviceId);
  }
  renderAdminInventory();
  if (isOwnerAdmin() && typeof loadAuditLogs === 'function') loadAuditLogs();
  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(`🗑️ Đã ngừng kinh doanh dịch vụ "${srv.name}".`, 'info', 3000);
  }
}
window.handleDeleteService = handleDeleteService;

// =========================================================
// MỤC 2.2: CHỐT CA & BÀN GIAO TIỀN MẶT (SHIFT HANDOVER)
// =========================================================
function renderShiftHandoverStats(customStats = null) {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;
  const stats = customStats || (typeof db.getCurrentShiftStats === 'function' ? db.getCurrentShiftStats() : {
    startTime: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    cashTotal: 0,
    transferTotal: 0
  });
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  const startEl = document.getElementById('shift-start-time');
  const cashEl = document.getElementById('shift-cash-total');
  const transEl = document.getElementById('shift-transfer-total');

  if (startEl) startEl.textContent = stats.startTime || '--:--';
  if (cashEl) cashEl.textContent = fmt(stats.cashTotal || 0);
  if (transEl) transEl.textContent = fmt(stats.transferTotal || 0);
}
window.renderShiftHandoverStats = renderShiftHandoverStats;

async function loadShiftHandovers() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  renderShiftHandoverStats();

  let shifts = typeof db.getShifts === 'function' ? db.getShifts() : [];

  try {
    const res = await fetch('../api/admin.php?action=shifts', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && json.data) {
        const cur = json.data.activeShift || json.data.currentShift;
        if (cur) {
          renderShiftHandoverStats({
            startTime: cur.startTime || cur.start_time,
            cashTotal: Number(cur.cashTotal ?? cur.cash_total ?? 0),
            transferTotal: Number(cur.transferTotal ?? cur.transfer_total ?? 0)
          });
        }
        if (Array.isArray(json.data.shifts) && json.data.shifts.length > 0) {
          shifts = json.data.shifts;
        }
      }
    }
  } catch (e) {}

  let curUser = null;
  try {
    curUser = JSON.parse(sessionStorage.getItem('sb_current_user') || 'null');
  } catch (e) {}

  // Staff chỉ thấy các ca của chính mình; Manager & Admin thấy toàn bộ ca của mọi nhân viên
  if (!isManagerOrAdmin() && curUser) {
    const myUname = String(curUser.username || '').toLowerCase();
    const myId = Number(curUser.id || 0);
    shifts = shifts.filter(sh => {
      const shUname = String(sh.staffUsername || sh.staff_username || '').toLowerCase();
      const shId = Number(sh.staffId || sh.staff_id || 0);
      return (myUname && shUname === myUname) || (myId && shId === myId);
    });
  }

  const tbody = document.getElementById('admin-shifts-tbody');
  if (!tbody) return;

  if (shifts.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="py-8 text-center text-xs text-[#64748B]">
          Chưa có lịch sử chốt ca nào được ghi nhận.
        </td>
      </tr>
    `;
    return;
  }

  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  tbody.innerHTML = shifts.map(sh => {
    const id = sh.id || sh.shift_code || `CA-${sh.shift_id || ''}`;
    const staffName = sh.staffName || sh.staff_name || sh.staffUsername || 'Nhân viên trực';
    const startT = sh.startTime || sh.start_time || '';
    const endT = sh.endTime || sh.end_time || 'Đang mở';
    const cashDeclared = Number(sh.cashDeclared ?? sh.cash_total ?? 0);
    const transferTotal = Number(sh.transferTotal ?? sh.transfer_total ?? 0);
    const actualRaw = sh.actual_cash_received ?? sh.cashActual ?? sh.actual_cash;
    const hasConfirmed = actualRaw !== null && actualRaw !== undefined && String(sh.status || '') === 'confirmed';
    const cashActual = hasConfirmed ? Number(actualRaw) : null;
    const diff = hasConfirmed ? Number(sh.discrepancy_amount ?? sh.diff ?? (cashActual - cashDeclared)) : null;

    let diffHtml = '<span class="text-slate-400 italic">Chờ đối soát</span>';
    if (hasConfirmed) {
      if (diff === 0) {
        diffHtml = `<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-extrabold text-[11px] border border-emerald-300">✓ Khớp 0đ</span>`;
      } else if (diff < 0) {
        diffHtml = `<span class="px-2 py-0.5 rounded bg-red-100 text-red-700 font-extrabold text-[11px] border border-red-300">Thiếu ${fmt(diff)}</span>`;
      } else {
        diffHtml = `<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-extrabold text-[11px] border border-amber-300">Thừa +${fmt(diff)}</span>`;
      }
    }

    const stRaw = String(sh.status || 'closed').toLowerCase();
    let statusBadge = '';
    if (stRaw === 'open' || stRaw === 'đang mở') {
      statusBadge = '<span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px]">Đang mở</span>';
    } else if (stRaw === 'confirmed' || stRaw === 'đã xác nhận') {
      statusBadge = '<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">✓ Đã xác nhận</span>';
    } else {
      statusBadge = '<span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">⏳ Chờ đối soát</span>';
    }

    const actionHtml = isManagerOrAdmin()
      ? `<button type="button" onclick="handleConfirmShift('${escapeSearchHTML(String(id))}', ${cashDeclared})" class="px-2.5 py-1 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-[11px] shadow-2xs cursor-pointer">
           ✅ Đối soát tiền mặt
         </button>`
      : `<span class="text-[11px] text-slate-400">${hasConfirmed ? 'Đã duyệt' : 'Chờ Quản lý'}</span>`;

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="py-2.5 px-3 font-mono font-bold text-[#0F172A]">${escapeSearchHTML(String(id))}</td>
        <td class="py-2.5 px-3 font-semibold text-[#0F172A]">${escapeSearchHTML(staffName)}</td>
        <td class="py-2.5 px-3 text-[11px] text-slate-600">
          <div>Mở: <b>${escapeSearchHTML(startT)}</b></div>
          <div>Chốt: <b>${escapeSearchHTML(endT)}</b></div>
        </td>
        <td class="py-2.5 px-3 text-right font-extrabold text-emerald-700">${fmt(cashDeclared)}</td>
        <td class="py-2.5 px-3 text-right font-bold text-blue-700">${fmt(transferTotal)}</td>
        <td class="py-2.5 px-3 text-right font-extrabold text-[#0F172A]">
          ${hasConfirmed ? fmt(cashActual) : '<span class="text-slate-400 font-normal">---</span>'}
        </td>
        <td class="py-2.5 px-3 text-center">${diffHtml}</td>
        <td class="py-2.5 px-3 text-center">${statusBadge}</td>
        <td class="py-2.5 px-3 text-right">${actionHtml}</td>
      </tr>
    `;
  }).join('');
}
window.loadShiftHandovers = loadShiftHandovers;

async function handleCloseShift() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const stats = db.getCurrentShiftStats();
  const noteEl = document.getElementById('shift-close-note');
  const note = (noteEl?.value || '').trim();
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  const confirmMsg =
    `🔒 XÁC NHẬN CHỐT CA & BÀN GIAO KÉT TIỀN MẶT:\n` +
    `• Ca mở lúc: ${stats.startTime}\n` +
    `• Tổng tiền mặt phải bàn giao: ${fmt(stats.cashTotal)}\n` +
    `• Tổng chuyển khoản VietQR trong ca: ${fmt(stats.transferTotal)}\n` +
    `• Ghi chú: ${note || 'Bàn giao đủ tiền mặt cuối ca'}\n\n` +
    `Bạn có chắc chắn muốn chốt ca trực này?`;

  if (!confirm(confirmMsg)) return;

  try {
    await fetch('../api/admin.php?action=shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sub_action: 'close_shift',
        cash_total: stats.cashTotal,
        cash_declared: stats.cashTotal,
        transfer_total: stats.transferTotal,
        transfer_declared: stats.transferTotal,
        note: note
      })
    });
  } catch (e) {}

  const closedShift = db.closeShift(note);
  if (noteEl) noteEl.value = '';
  await loadShiftHandovers();
  if (isOwnerAdmin() && typeof loadAuditLogs === 'function') loadAuditLogs();

  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(`🔒 Đã chốt ca #${closedShift.id} thành công! Tiền mặt bàn giao: ${fmt(closedShift.cashDeclared)}.`, 'success', 4000);
  }
}
window.handleCloseShift = handleCloseShift;

async function handleConfirmShift(shiftId, cashDeclared = 0) {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền đối soát và xác nhận tiền mặt bàn giao ca!', 'error');
    return;
  }

  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');
  const rawInput = prompt(
    `✅ ĐỐI SOÁT TIỀN MẶT BÀN GIAO CA (${shiftId})\n` +
    `• Tiền mặt hệ thống ghi nhận trong ca: ${fmt(cashDeclared)}\n` +
    `• Nhập số tiền mặt THỰC NHẬN từ nhân viên (VNĐ):`,
    String(cashDeclared || 0)
  );
  if (rawInput === null) return;

  const actualCash = parseInt(String(rawInput).replace(/[^\d]/g, ''), 10);
  if (isNaN(actualCash) || actualCash < 0) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Số tiền thực nhận không hợp lệ!', 'error');
    return;
  }

  const diff = actualCash - Number(cashDeclared || 0);
  const diffLabel = diff === 0 ? 'Khớp 0đ' : (diff < 0 ? `Thiếu ${fmt(diff)}` : `Thừa +${fmt(diff)}`);

  try {
    await fetch('../api/admin.php?action=shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sub_action: 'confirm_shift',
        shift_id: shiftId,
        actual_cash_received: actualCash,
        actual_cash: actualCash
      })
    });
  } catch (e) {}

  const db = window.SanBongApp?.SanBongDB;
  if (db && typeof db.confirmShift === 'function') {
    db.confirmShift(shiftId, actualCash, `Đối soát: ${diffLabel}`);
  }

  await loadShiftHandovers();
  if (typeof loadAuditLogs === 'function') loadAuditLogs();

  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(`✅ Đã đối soát ca ${shiftId}: Thực nhận ${fmt(actualCash)} (${diffLabel})!`, diff < 0 ? 'warning' : 'success', 4000);
  }
}
window.handleConfirmShift = handleConfirmShift;

// =========================================================
// MỤC 2.1: NHẬT KÝ KIỂM TOÁN HỆ THỐNG (AUDIT LOG - CHỐNG THẤT THOÁT)
// =========================================================
async function loadAuditLogs() {
  if (!isOwnerAdmin()) return;
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const userFilter = (document.getElementById('audit-filter-user')?.value || '').trim();
  const actionFilter = (document.getElementById('audit-filter-action')?.value || '').trim();
  const dateFilter = (document.getElementById('audit-filter-date')?.value || '').trim();
  const searchFilter = (document.getElementById('audit-filter-search')?.value || '').trim();

  let logs = typeof db.getAuditLogs === 'function' ? db.getAuditLogs() : [];
  let serverLoaded = false;
  let serverStaffList = [];
  const hasFilter = Boolean(userFilter || actionFilter || dateFilter || searchFilter);

  try {
    const qs = new URLSearchParams({ action: 'audit_logs' });
    if (userFilter) {
      qs.set('user_id', userFilter);
    }
    if (actionFilter) {
      qs.set('filter_action', actionFilter);
      qs.set('action_type', actionFilter);
    }
    if (dateFilter) qs.set('date', dateFilter);
    if (searchFilter) qs.set('search', searchFilter);
    const res = await fetch(`../api/admin.php?${qs.toString()}`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json && json.success) {
        serverLoaded = true;
        const rawLogs = Array.isArray(json.data) ? json.data : (Array.isArray(json.data?.logs) ? json.data.logs : []);
        serverStaffList = Array.isArray(json.data?.staffList) ? json.data.staffList : [];
        if (hasFilter) {
          logs = rawLogs;
        } else if (rawLogs.length > 0) {
          const localLogs = logs;
          const seenIds = new Set();
          const merged = [];
          [...rawLogs, ...localLogs].forEach(item => {
            const tgt = item.booking_id || item.target || item.target_code || item.entity_id || '';
            const key = `${item.id || ''}_${item.action || item.action_type || ''}_${tgt}_${item.time || item.created_at || ''}`;
            if (!seenIds.has(key)) {
              seenIds.add(key);
              merged.push(item);
            }
          });
          logs = merged;
        }
      }
    }
  } catch (e) {}

  // Populate dropdown nhân sự (#audit-filter-user) dùng ID số thực trong DB
  const userSelect = document.getElementById('audit-filter-user');
  if (userSelect) {
    const prevU = userSelect.value;
    const roleShortLabel = {
      admin: 'Chủ sân',
      manager: 'Quản lý sân',
      staff: 'Nhân viên'
    };
    let optionsHtml = '<option value="">👤 Tất cả nhân sự</option>';
    if (serverStaffList.length > 0) {
      optionsHtml += serverStaffList.map(u => {
        const uid = String(u.id ?? '').trim();
        if (!uid) return '';
        const name = u.full_name || u.username || `ID #${uid}`;
        const uname = u.username ? ` (${u.username})` : '';
        const rLabel = roleShortLabel[String(u.role || '').toLowerCase()] || u.role || '';
        return `<option value="${escapeSearchHTML(uid)}">${escapeSearchHTML(`${name}${uname}${rLabel ? ' · ' + rLabel : ''}`)}</option>`;
      }).join('');
    } else {
      const actors = new Map();
      logs.forEach(l => {
        const key = (l.user_id !== undefined && l.user_id !== null && String(l.user_id) !== '')
          ? String(l.user_id)
          : String(l.actorUsername || l.username || '').trim();
        const uname = l.actorUsername || l.username || '';
        const name = l.actor_name || l.actorName || l.full_name || uname || key;
        if (key && !actors.has(key)) {
          actors.set(key, `${name}${uname && uname !== name ? ` (${uname})` : ''}`);
        }
      });
      if (actors.size === 0) {
        actors.set('admin', 'Quản Trị Viên (admin)');
        actors.set('manager', 'Quản Lý Sân (manager)');
        actors.set('staff', 'Nhân Viên Trực Sân (staff)');
      }
      optionsHtml += Array.from(actors.entries())
        .map(([val, label]) => `<option value="${escapeSearchHTML(val)}">${escapeSearchHTML(label)}</option>`)
        .join('');
    }
    userSelect.innerHTML = optionsHtml;
    if (prevU) userSelect.value = prevU;
  }

  // Khi offline fallback thì lọc client; khi serverLoaded thì giữ kết quả server đã lọc chính xác
  const filtered = serverLoaded ? logs : logs.filter(l => {
    const actor = String(l.actor_name || l.actorName || l.actorUsername || l.username || l.user_id || '').toLowerCase();
    const uId = String(l.user_id ?? '').trim();
    const act = String(l.action || l.action_type || '').toUpperCase();
    const dt = String(l.dateISO || l.created_at || '').slice(0, 10);
    const target = String(l.booking_id || l.target || l.target_code || l.entity_id || '').toLowerCase();
    const oldV = String(l.oldValue || l.old_value || '').toLowerCase();
    const newV = String(l.newValue || l.new_value || '').toLowerCase();

    if (userFilter && uId !== userFilter && actor !== userFilter.toLowerCase()) return false;
    if (actionFilter && act !== actionFilter.toUpperCase()) return false;
    if (dateFilter && dt && dt !== dateFilter) return false;
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      if (!target.includes(q) && !oldV.includes(q) && !newV.includes(q) && !actor.includes(q)) return false;
    }
    return true;
  });

  renderAuditLogs(filtered);
}
window.loadAuditLogs = loadAuditLogs;

function renderAuditLogs(logs) {
  const tbody = document.getElementById('admin-audit-tbody');
  if (!tbody) return;

  if (!Array.isArray(logs) || logs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-8 text-center text-xs text-[#64748B]">
          Không có bản ghi kiểm toán (Audit Log) nào khớp với bộ lọc hiện tại.
        </td>
      </tr>
    `;
    return;
  }

  const badgeMap = {
    'CHECKIN': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'CANCEL_BOOKING': 'bg-red-100 text-red-800 border-red-300',
    'NOSHOW_RELEASE': 'bg-amber-100 text-amber-900 border-amber-300',
    'COLLECT_PAYMENT': 'bg-green-100 text-green-800 border-green-300',
    'RESTORE_BOOKING': 'bg-sky-100 text-sky-800 border-sky-300',
    'TRANSFER_PITCH': 'bg-purple-100 text-purple-800 border-purple-300',
    'WALKIN_BOOKING': 'bg-teal-100 text-teal-800 border-teal-300',
    'COUNTER_SALE': 'bg-indigo-100 text-indigo-800 border-indigo-300',
    'SHIFT_CLOSE': 'bg-orange-100 text-orange-800 border-orange-300',
    'SHIFT_CONFIRM': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'PITCH_UPSERT': 'bg-slate-200 text-slate-800 border-slate-300',
    'UPDATE_PRICING': 'bg-violet-100 text-violet-800 border-violet-300',
    'UPDATE_SETTINGS': 'bg-slate-200 text-slate-800 border-slate-300',
    'RECONCILE_MANUAL': 'bg-indigo-100 text-indigo-800 border-indigo-300',
    'RECONCILE_RESOLVE': 'bg-teal-100 text-teal-800 border-teal-300',
    'AUTO_CANCEL_EXPIRED': 'bg-amber-100 text-amber-800 border-amber-300',
    'ADMIN_RUN_AUTO_RELEASE': 'bg-orange-100 text-orange-800 border-orange-300',
    'STAFF_CREATE': 'bg-sky-100 text-sky-800 border-sky-300',
    'STAFF_ROLE_CHANGE': 'bg-purple-100 text-purple-800 border-purple-300',
    'STAFF_STATUS_CHANGE': 'bg-rose-100 text-rose-800 border-rose-300',
    'STAFF_RESET_PASSWORD': 'bg-amber-100 text-amber-800 border-amber-300',
    'WEBHOOK_MATCH': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'WEBHOOK_UNDERPAID': 'bg-amber-100 text-amber-800 border-amber-300',
    'WEBHOOK_OVERPAID': 'bg-blue-100 text-blue-800 border-blue-300',
    'WEBHOOK_UNMATCHED': 'bg-red-100 text-red-800 border-red-300',
    'UPDATE_PAYMENT': 'bg-green-100 text-green-800 border-green-300',
    'ADD_OVERTIME': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'ADD_SERVICE': 'bg-cyan-100 text-cyan-800 border-cyan-300',
    'PITCH_STATUS': 'bg-slate-200 text-slate-800 border-slate-300',
    'INVENTORY_RESTOCK': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'SERVICE_UPSERT': 'bg-cyan-100 text-cyan-800 border-cyan-300',
    'SERVICE_DELETE': 'bg-red-100 text-red-800 border-red-300'
  };

  tbody.innerHTML = logs.slice(0, 100).map(l => {
    const timeStr = l.time || l.created_at || '';
    const actorName = l.actor_name || l.actorName || l.full_name || l.actorUsername || l.username || 'Hệ thống';
    const role = String(l.actor_role || l.actorRole || l.role || 'staff').toLowerCase();
    const act = String(l.action || l.action_type || 'ACTION').toUpperCase();
    const target = l.booking_id || l.target || l.target_code || l.entity_id || '—';
    const oldVal = l.oldValue ?? l.old_value ?? '—';
    const newVal = l.newValue ?? l.new_value ?? '—';
    const ip = l.ip || l.ip_address || '127.0.0.1';

    let roleBadge = '<span class="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">Nhân viên</span>';
    if (role === 'admin') {
      roleBadge = '<span class="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold">Chủ sân</span>';
    } else if (role === 'manager') {
      roleBadge = '<span class="px-1.5 py-0.5 rounded bg-purple-100 text-[#7C3AED] text-[10px] font-bold">Quản lý sân</span>';
    } else if (role === 'system') {
      roleBadge = '<span class="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">Hệ thống (Cron)</span>';
    } else if (role === 'user') {
      roleBadge = '<span class="px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800 text-[10px] font-bold">Khách hàng</span>';
    }

    const actCls = badgeMap[act] || 'bg-slate-100 text-slate-700 border-slate-300';

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">${escapeSearchHTML(timeStr)}</td>
        <td class="py-2.5 px-3">
          <div class="font-bold text-[#0F172A] text-xs">${escapeSearchHTML(actorName)}</div>
          <div class="mt-0.5">${roleBadge}</div>
        </td>
        <td class="py-2.5 px-3">
          <span class="px-2 py-0.5 rounded border font-mono font-bold text-[10px] ${actCls}">
            ${escapeSearchHTML(act)}
          </span>
        </td>
        <td class="py-2.5 px-3 font-mono font-bold text-[#0F172A]">${escapeSearchHTML(String(target))}</td>
        <td class="py-2.5 px-3 text-[11px] text-slate-500 max-w-[220px] break-words">${escapeSearchHTML(typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal))}</td>
        <td class="py-2.5 px-3 text-[11px] font-semibold text-[#0F172A] max-w-[260px] break-words">${escapeSearchHTML(typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal))}</td>
        <td class="py-2.5 px-3 font-mono text-[11px] text-slate-400">${escapeSearchHTML(ip)}</td>
      </tr>
    `;
  }).join('');
}
window.renderAuditLogs = renderAuditLogs;

document.addEventListener('DOMContentLoaded', () => {
  const cancelInput = document.getElementById('inplay-cancel-reason');
  if (cancelInput) {
    cancelInput.placeholder = 'Nhập lý do hủy ca (Bắt buộc nếu đơn đã thu tiền/cọc)...';
    if (cancelInput.value === 'Khách báo hủy lịch trước thời hạn') {
      cancelInput.value = '';
    }
  }
  setTimeout(() => {
    if (typeof renderAdminInventory === 'function') renderAdminInventory();
    if (typeof loadShiftHandovers === 'function') loadShiftHandovers();
    if (isManagerOrAdmin() && typeof loadBankTransactions === 'function') loadBankTransactions();
    if (isOwnerAdmin() && typeof loadAuditLogs === 'function') loadAuditLogs();
  }, 150);
});


