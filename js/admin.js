let activeModule = 'overview';
let currentPortalRole = (typeof window !== 'undefined' && window.sb_current_user && window.sb_current_user.role)
  ? window.sb_current_user.role
  : (() => {
      try {
        const u = JSON.parse(sessionStorage.getItem('sb_current_user') || localStorage.getItem('sb_current_user') || '{}');
        return u.role || 'admin';
      } catch (e) {
        return 'admin';
      }
    })();

const PORTAL_ALLOWED_TABS = {
  admin: ['overview', 'timeline', 'quick-booking', 'pitches', 'pricing', 'customers', 'payments', 'shifts', 'reports', 'settings', 'logs'],
  manager: ['overview', 'timeline', 'quick-booking', 'pitches', 'customers', 'payments', 'shifts', 'reports'],
  staff: ['overview', 'timeline', 'quick-booking', 'pitches', 'customers', 'shifts'],
  user: ['overview', 'timeline', 'quick-booking', 'pitches', 'customers', 'shifts']
};

function isOwnerAdmin() {
  return currentPortalRole === 'admin';
}
window.isOwnerAdmin = isOwnerAdmin;

function isManagerOrAdmin() {
  return currentPortalRole === 'admin' || currentPortalRole === 'manager';
}
window.isManagerOrAdmin = isManagerOrAdmin;

function getAdminCsrfToken() {
  try {
    const meta = document.querySelector('meta[name="csrf-token"]');
    const metaToken = meta ? String(meta.getAttribute('content') || '').trim() : '';
    if (metaToken) return metaToken;
    return String(sessionStorage.getItem('sb_csrf_token') || '').trim();
  } catch (e) {
    return '';
  }
}
window.getAdminCsrfToken = getAdminCsrfToken;

function setAdminCsrfToken(token) {
  const clean = String(token || '').trim();
  if (!clean) return;
  try {
    let meta = document.querySelector('meta[name="csrf-token"]');
    if (!meta && document.head) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'csrf-token');
      document.head.appendChild(meta);
    }
    if (meta) {
      meta.setAttribute('content', clean);
    }
  } catch (e) {}
  try {
    sessionStorage.setItem('sb_csrf_token', clean);
  } catch (e) {}
  if (window.SanBongHelpers?.setCsrfToken) {
    window.SanBongHelpers.setCsrfToken(clean);
  }
}
window.setAdminCsrfToken = setAdminCsrfToken;

function normalizeAdminApiUrl(url) {
  if (!url) return url;
  if (/^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|\/\/)/.test(url)) return url;
  const pathname = (window.location && typeof window.location.pathname === 'string')
    ? window.location.pathname.replace(/\\/g, '/')
    : '';
  const match = pathname.match(/^(.*?\/Quan_Ly_San_Bong)/i);
  const root = match ? match[1] : '';
  const clean = url.replace(/^\.\.\//, '').replace(/^\/+/, '');
  return `${root}/${clean}`;
}
window.normalizeAdminApiUrl = normalizeAdminApiUrl;

async function ensureAdminCsrfToken() {
  const current = getAdminCsrfToken();
  if (current) return current;
  try {
    const res = await fetch(normalizeAdminApiUrl('api/auth.php?action=me'), { credentials: 'same-origin', cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json && json.csrf_token) {
        setAdminCsrfToken(json.csrf_token);
        return json.csrf_token;
      }
    }
  } catch (e) {}
  return getAdminCsrfToken();
}
window.ensureAdminCsrfToken = ensureAdminCsrfToken;

(function installAdminFetchCsrfInterceptor() {
  const originalFetch = window.fetch;
  if (!originalFetch || window._adminFetchCsrfInstalled) return;
  window._adminFetchCsrfInstalled = true;
  window.fetch = async function (url, options = {}) {
    const opts = Object.assign({}, options);
    const method = String(opts.method || 'GET').toUpperCase();
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      if (!opts.credentials) opts.credentials = 'same-origin';
      let token = getAdminCsrfToken();
      if (!token) {
        token = await ensureAdminCsrfToken();
      }
      if (token) {
        if (opts.headers instanceof Headers) {
          if (!opts.headers.has('X-CSRF-Token')) {
            opts.headers.set('X-CSRF-Token', token);
          }
        } else {
          opts.headers = Object.assign({}, opts.headers || {});
          if (!opts.headers['X-CSRF-Token']) {
            opts.headers['X-CSRF-Token'] = token;
          }
        }
      }
    }
    const response = await originalFetch.apply(this, [url, opts]);
    const resToken = response.headers ? response.headers.get('X-CSRF-Token') : null;
    if (resToken) {
      setAdminCsrfToken(resToken);
    }
    return response;
  };
})();

async function adminFetchJson(url, options = {}) {
  url = normalizeAdminApiUrl(url);
  const opts = Object.assign({}, options);
  const method = String(opts.method || 'GET').toUpperCase();
  opts.method = method;
  opts.cache = 'no-store';
  if (!opts.credentials) {
    opts.credentials = 'same-origin';
  }

  const headers = Object.assign({}, opts.headers || {});
  const hasContentType = Object.keys(headers).some(k => k.toLowerCase() === 'content-type');
  if (opts.body !== undefined && !(typeof FormData !== 'undefined' && opts.body instanceof FormData) && !hasContentType) {
    headers['Content-Type'] = 'application/json';
  }
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    let csrf = getAdminCsrfToken();
    if (!csrf) {
      csrf = await ensureAdminCsrfToken();
    }
    if (csrf) {
      headers['X-CSRF-Token'] = csrf;
    }
  }
  opts.headers = headers;

  try {
    const res = await fetch(url, opts);
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch (e) {
      return {
        ok: false,
        status: res.status,
        message: 'Máy chủ trả về phản hồi không hợp lệ.',
        data: null,
        rawText: text
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        message: json?.message || 'Lỗi máy chủ',
        data: json?.data || null,
        ref_code: json?.ref_code || '',
        json
      };
    }

    return {
      ok: true,
      status: res.status,
      message: json.message || '',
      data: json.data !== undefined ? json.data : null,
      json
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      message: 'Lỗi kết nối máy chủ. Vui lòng thử lại.',
      data: null,
      ref_code: 'ERR_NETWORK',
      error: err
    };
  }
}
window.adminFetchJson = adminFetchJson;

function getFirstAdminEl(...ids) {
  for (const id of ids) {
    if (!id) continue;
    const el = document.getElementById(id);
    if (el) return el;
  }
  return null;
}

function escapeSearchHTML(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[m]);
}
window.escapeSearchHTML = escapeSearchHTML;
window.escapeHTML = escapeSearchHTML;

function escapeJsAttr(str) {
  return escapeSearchHTML(String(str ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
}
window.escapeJsAttr = escapeJsAttr;

async function handleAdminLogout() {
  const confirmed = await showAdminConfirm({
    title: 'Đăng xuất quản trị',
    message: 'Bạn có chắc chắn muốn đăng xuất khỏi Bảng Điều Khiển Quản Trị?',
    confirmText: 'Đăng xuất',
    cancelText: 'Ở lại',
    danger: true
  });
  if (!confirmed) return;

  try {
    await adminFetchJson('../api/auth.php?action=logout', {
      method: 'POST',
      body: JSON.stringify({})
    });
  } catch (e) {}

  try {
    sessionStorage.removeItem('sb_current_user');
    sessionStorage.removeItem('sb_csrf_token');
    localStorage.removeItem('sb_current_user');
  } catch (e) {}
  window.location.replace('/login');
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
    if (!storedUser) {
      storedUser = JSON.parse(localStorage.getItem('sb_current_user') || 'null');
      if (storedUser) {
        try { sessionStorage.setItem('sb_current_user', JSON.stringify(storedUser)); } catch (e) {}
      }
    }
  } catch (e) {}
  if (storedUser && storedUser.role) {
    currentPortalRole = storedUser.role;
    updateAdminProfile(storedUser);
  }

  const isAdmin = isOwnerAdmin() || currentPortalRole === 'admin' || (window.sb_current_user && window.sb_current_user.role === 'admin');
  const isMgrOrAdmin = isAdmin || currentPortalRole === 'manager' || (window.sb_current_user && window.sb_current_user.role === 'manager');
  const badgeEl = document.getElementById('sidebar-role-badge');
  if (badgeEl) {
    if (isAdmin) {
      badgeEl.innerHTML = 'Chủ sân · <span class="text-[#16A34A] font-semibold">Toàn quyền</span>';
    } else if (currentPortalRole === 'manager') {
      badgeEl.innerHTML = 'Quản lý sân · <span class="text-[#7C3AED] font-semibold">Báo cáo, Kho &amp; Ca</span>';
    } else {
      badgeEl.innerHTML = 'Nhân viên trực · <span class="text-[#2563EB] font-semibold">Vận hành sân</span>';
    }
  }

  const adminOnlyTabs = ['pricing', 'settings', 'logs'];
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

  const kpiRevCard = document.getElementById('kpi-revenue-card');
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

  if (!isAdmin) {
    const allowed = PORTAL_ALLOWED_TABS[currentPortalRole] || PORTAL_ALLOWED_TABS.staff;
    if (!allowed.includes(activeModule)) {
      switchAdminTab('overview');
    }
  }
}
window.applyRolePermissions = applyRolePermissions;

function switchAdminTab(moduleKey) {
  const tabNumMap = {
    '1': 'overview', '2': 'timeline', '3': 'quick-booking', '4': 'pitches',
    '5': 'pricing', '6': 'customers', '7': 'payments', '8': 'shifts',
    '9': 'reports', '10': 'settings', '11': 'logs'
  };
  if (tabNumMap[moduleKey]) moduleKey = tabNumMap[moduleKey];

  if (typeof window !== 'undefined' && window.sb_current_user && window.sb_current_user.role) {
    currentPortalRole = window.sb_current_user.role;
  } else {
    try {
      const u = JSON.parse(sessionStorage.getItem('sb_current_user') || localStorage.getItem('sb_current_user') || '{}');
      if (u.role) currentPortalRole = u.role;
    } catch(e) {}
  }

  const allowed = PORTAL_ALLOWED_TABS[currentPortalRole] || PORTAL_ALLOWED_TABS.staff;
  if (!allowed.includes(moduleKey)) {
    moduleKey = 'overview';
  }

  activeModule = moduleKey;
  try {
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('tab', moduleKey);
    history.replaceState(null, '', newUrl.toString());
  } catch (e) {}

  if (typeof closeAdminMobileDrawer === 'function') closeAdminMobileDrawer();
  const allModules = ['overview', 'timeline', 'quick-booking', 'pitches', 'pricing', 'customers', 'payments', 'shifts', 'reports', 'settings', 'logs'];

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
    'overview': '1. Tổng quan & Đang chơi',
    'timeline': '2. Lịch đặt sân Timeline',
    'quick-booking': '3. Đặt sân tại quầy',
    'pitches': '4. Quản lý sân bóng',
    'pricing': '5. Bảng giá & Voucher',
    'customers': '6. Khách & Hội viên',
    'payments': '7. Duyệt cọc VietQR',
    'shifts': '8. Chốt ca / Giao ca',
    'reports': '9. Báo cáo doanh thu',
    'settings': '10. Cài đặt hệ thống',
    'logs': '11. Nhật ký hệ thống & Thao tác Quản trị'
  };
  const subtitleMap = {
    'overview': 'KPI & Vận hành ca',
    'timeline': 'Lịch & Ghép kèo',
    'quick-booking': 'Bán lẻ & Đặt nhanh',
    'pitches': 'Sân & Tiện ích',
    'pricing': 'Bảng giá & Ưu đãi',
    'customers': 'Hồ sơ & Công nợ',
    'payments': 'Duyệt cọc & Đối soát',
    'shifts': 'Chốt ca trực',
    'reports': 'Doanh thu & Chi phí',
    'settings': 'Cài đặt & Nhật ký',
    'logs': 'Nhật ký thao tác & Hậu kiểm'
  };
  const titleEl = document.getElementById('admin-module-title');
  if (titleEl) titleEl.textContent = titleMap[moduleKey] || 'Quản trị';
  const subtitleEl = document.getElementById('admin-module-subtitle');
  if (subtitleEl && subtitleMap[moduleKey]) {
    subtitleEl.textContent = subtitleMap[moduleKey];
  }

  if (moduleKey === 'overview' && typeof renderOverviewKPIs === 'function') {
    renderOverviewKPIs();
  }
  if (moduleKey === 'timeline') {
    if (typeof initRecurringScheduleForm === 'function') initRecurringScheduleForm();
    if (typeof loadRecurringSchedules === 'function') loadRecurringSchedules();
    if (typeof loadWaitlistAdmin === 'function') loadWaitlistAdmin();
    if (typeof loadMatchmakingAdmin === 'function') loadMatchmakingAdmin();
  }
  if (moduleKey === 'quick-booking') {
    initQuickBookingForm();
    if (typeof renderAdminInventory === 'function') renderAdminInventory();
  }
  if (moduleKey === 'pitches') {
    renderAdminPitches();
    if (typeof loadMaintenanceSchedules === 'function') loadMaintenanceSchedules();
    if (typeof loadAdminReviews === 'function') loadAdminReviews();
  }
  if (moduleKey === 'pricing' && isOwnerAdmin()) {
    renderAdminVouchers();
    loadPricingTable();
    if (typeof loadGoldenHourRules === 'function') loadGoldenHourRules();
  }
  if (moduleKey === 'customers') {
    renderAdminCustomers();
  }
  if (moduleKey === 'payments' && isManagerOrAdmin()) {
    renderAdminPayments();
    if (typeof loadBankTransactions === 'function') loadBankTransactions();
  }
  if (moduleKey === 'shifts') {
    if (typeof loadShiftHandovers === 'function') loadShiftHandovers();
  }
  if (moduleKey === 'reports' && isManagerOrAdmin()) {
    renderAdminReports();
  }
  if (moduleKey === 'settings' && isOwnerAdmin()) {
    loadAdminSettings();
    loadStaffUsers();
    if (typeof loadAuditLogs === 'function') loadAuditLogs();
    if (typeof loadNotificationLogs === 'function') loadNotificationLogs();
    if (typeof loadBackupsList === 'function') loadBackupsList();
    if (typeof load2FaStatus === 'function') load2FaStatus();
  }
  if (moduleKey === 'logs' && isOwnerAdmin()) {
    if (typeof loadAdminLogs === 'function') {
      loadAdminLogs(1);
    }
  }
}
window.switchAdminTab = switchAdminTab;

function getLocalTodayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
window.getLocalTodayISO = getLocalTodayISO;

document.addEventListener('DOMContentLoaded', () => {
  let localUser = null;
  try {
    if (window.sb_current_user && typeof window.sb_current_user === 'object') {
      localUser = window.sb_current_user;
    }
    if (!localUser) {
      localUser = JSON.parse(sessionStorage.getItem('sb_current_user') || 'null');
    }
    if (!localUser) {
      localUser = JSON.parse(localStorage.getItem('sb_current_user') || 'null');
      if (localUser) {
        try { sessionStorage.setItem('sb_current_user', JSON.stringify(localUser)); } catch (e) {}
      }
    }
  } catch (e) {}

  const isAllowedAdmin = Boolean(
    (localUser && ['admin', 'manager', 'staff'].includes(localUser.role)) ||
    (window.sb_current_user && ['admin', 'manager', 'staff'].includes(window.sb_current_user.role))
  );

  const subEl = document.getElementById('admin-module-subtitle');
  if (subEl) {
    subEl.textContent = formatTimelineDateLabel(getLocalTodayISO());
  }

  if (localUser && localUser.role) {
    currentPortalRole = localUser.role;
    updateAdminProfile(localUser);
  }
  applyRolePermissions();
  const initialUrlTab = new URLSearchParams(window.location.search).get('tab') || window.location.hash.replace('#', '');
  if (initialUrlTab) {
    switchAdminTab(initialUrlTab);
  }

  fetch(normalizeAdminApiUrl('api/auth.php?action=me'), { cache: 'no-store' })
    .then(res => res.json())
    .then(data => {
      if (data && data.csrf_token) {
        setAdminCsrfToken(data.csrf_token);
      }
      if (data && data.success && data.logged_in && data.user && ['admin', 'manager', 'staff'].includes(data.user.role)) {
        currentPortalRole = data.user.role;
        try {
          sessionStorage.setItem('sb_current_user', JSON.stringify(data.user));
          localStorage.setItem('sb_current_user', JSON.stringify(data.user));
          window.sb_current_user = data.user;
        } catch (e) {}
        updateAdminProfile(data.user);
        applyRolePermissions();
        document.documentElement.style.display = '';
        [renderOverviewKPIs, renderAdminPitches, loadMaintenanceSchedules, loadAdminReviews, renderAdminInventory, loadShiftHandovers, renderAdminCustomers, initRecurringScheduleForm, loadRecurringSchedules, loadWaitlistAdmin].forEach(fn => { if (typeof fn === 'function') fn(); });
        if (typeof renderOverviewTodayBookings === 'function') renderOverviewTodayBookings();
        if (isManagerOrAdmin()) {
          [renderAdminPayments, loadBankTransactions, loadMatchmakingAdmin, renderAdminReports].forEach(fn => { if (typeof fn === 'function') fn(); });
        }
        if (isOwnerAdmin()) {
          [renderAdminVouchers, loadPricingTable, loadGoldenHourRules, loadAdminSettings, loadStaffUsers, loadAuditLogs, loadNotificationLogs, loadBackupsList, load2FaStatus].forEach(fn => { if (typeof fn === 'function') fn(); });
        }
        return;
      }

      if (isAllowedAdmin) {
        console.warn('Phiên nền tảng đang đồng bộ');
        [renderOverviewKPIs, renderAdminPitches, loadMaintenanceSchedules, loadAdminReviews, renderAdminInventory, loadShiftHandovers, renderAdminCustomers, initRecurringScheduleForm, loadRecurringSchedules, loadWaitlistAdmin].forEach(fn => { if (typeof fn === 'function') fn(); });
        if (typeof renderOverviewTodayBookings === 'function') renderOverviewTodayBookings();
        if (isManagerOrAdmin()) {
          [renderAdminPayments, loadBankTransactions, loadMatchmakingAdmin, renderAdminReports].forEach(fn => { if (typeof fn === 'function') fn(); });
        }
        if (isOwnerAdmin()) {
          [renderAdminVouchers, loadPricingTable, loadGoldenHourRules, loadAdminSettings, loadStaffUsers, loadAuditLogs, loadNotificationLogs, loadBackupsList, load2FaStatus].forEach(fn => { if (typeof fn === 'function') fn(); });
        }
        return;
      }

      try {
        sessionStorage.removeItem('sb_current_user');
        sessionStorage.removeItem('sb_csrf_token');
        localStorage.removeItem('sb_current_user');
      } catch (e) {}
      document.documentElement.style.display = 'none';
      const msg = data && data.locked
        ? (data.message || 'Tài khoản của bạn đã bị Chủ sân tạm khóa.')
        : 'Phiên làm việc đã hết hạn hoặc không có quyền truy cập.';
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(msg, 'error');
      window.location.replace('/login?redirect=portal-admin');
      return;
    })
    .catch(err => {
      console.warn('Lỗi kết nối auth/me:', err);
      if (!isAllowedAdmin) {
        document.documentElement.style.display = 'none';
        window.location.replace('/login?redirect=portal-admin');
      }
    });

  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  if (typeof renderOverviewTodayBookings === 'function') renderOverviewTodayBookings();
  if (typeof renderTimelineGantt === 'function') renderTimelineGantt();
  if (typeof populateInPlayWorkspace === 'function') populateInPlayWorkspace();
  if (typeof initQuickBookingForm === 'function') initQuickBookingForm();
  if (typeof renderAdminPitches === 'function') renderAdminPitches();

  const expDateEl = document.getElementById('exp-date');
  if (expDateEl && !expDateEl.value) {
    expDateEl.value = getLocalTodayISO();
  }

  window.addEventListener('storage', () => {
    if (typeof refreshAllAdminViews === 'function') refreshAllAdminViews(window.activeInPlayCode);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      [closeInPlayModal, closeInvoiceModal, closeQRScannerModal, closeResetStaffPwModal,
       closeReconcileAssignModal, closeCustomerCrmModal, closeMaintenanceModal,
       closeReviewReplyModal, closePitchModal, closeServiceModal].forEach(fn => {
        if (typeof fn === 'function') fn();
      });
    }
  });

  const cancelInput = document.getElementById('inplay-cancel-reason');
  if (cancelInput) {
    cancelInput.placeholder = 'Nhập lý do hủy ca (Bắt buộc nếu đơn đã thu tiền/cọc)...';
    if (cancelInput.value === 'Khách báo hủy lịch trước thời hạn') {
      cancelInput.value = '';
    }
  }
});
