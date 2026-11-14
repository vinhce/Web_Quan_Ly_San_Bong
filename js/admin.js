
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
    const tokenHeader = res.headers ? res.headers.get('X-CSRF-Token') : null;
    if (tokenHeader) {
      setAdminCsrfToken(tokenHeader);
    }
    let json = null;
    try {
      json = await res.json();
    } catch (e) {
      json = null;
    }

    if (json && json.csrf_token) {
      setAdminCsrfToken(json.csrf_token);
    }

    if (res.status === 401) {
      try {
        sessionStorage.removeItem('sb_current_user');
        sessionStorage.removeItem('sb_csrf_token');
        localStorage.removeItem('sb_current_user');
      } catch (e) {}
      const msg401 = json?.message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(msg401, 'error', 3500);
      }
      window.location.replace('/login?redirect=portal-admin');
      return {
        ok: false,
        status: 401,
        message: msg401,
        data: json?.data || null,
        ref_code: json?.ref_code || 'ERR_UNAUTHORIZED',
        json
      };
    }

    if (!res.ok || !json || json.success === false) {
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

function escapeJsAttr(str) {
  return escapeSearchHTML(String(str ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
}

function ensureAdminDialogDom() {
  let modal = document.getElementById('admin-custom-dialog-modal');
  if (modal) return modal;
  if (!document.body) return null;

  modal = document.createElement('div');
  modal.id = 'admin-custom-dialog-modal';
  modal.className = 'hidden fixed inset-0 z-[10050] bg-slate-900/60 backdrop-blur-sm items-center justify-center p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden my-auto">
      <div class="px-5 py-4 bg-[#0F172A] text-white">
        <h4 id="admin-dialog-title" class="font-heading font-extrabold text-sm">Xác nhận</h4>
      </div>
      <div class="p-5 space-y-3 text-xs">
        <div id="admin-dialog-message" class="text-[#334155] leading-relaxed whitespace-pre-line"></div>
        <div id="admin-dialog-input-wrap" class="hidden">
          <input id="admin-dialog-input" type="text" class="input-field w-full text-xs font-semibold">
        </div>
        <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
          <button type="button" id="admin-dialog-cancel" class="btn-sm btn-secondary cursor-pointer">Hủy</button>
          <button type="button" id="admin-dialog-confirm" class="btn-sm btn-primary font-bold cursor-pointer">Xác nhận</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function showAdminConfirm({
  title = 'Xác nhận thao tác',
  message = '',
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  danger = false
} = {}) {
  return new Promise((resolve) => {
    const modal = ensureAdminDialogDom();
    const titleEl = document.getElementById('admin-dialog-title');
    const msgEl = document.getElementById('admin-dialog-message');
    const inputWrap = document.getElementById('admin-dialog-input-wrap');
    const cancelBtn = document.getElementById('admin-dialog-cancel');
    const confirmBtn = document.getElementById('admin-dialog-confirm');

    if (!modal || !titleEl || !msgEl || !cancelBtn || !confirmBtn) {
      if (window.SanBongApp?.showModal) {
        let settled = false;
        window.SanBongApp.showModal({
          title,
          message,
          type: danger ? 'danger' : 'warning',
          confirmText,
          cancelText,
          onConfirm: () => {
            if (!settled) {
              settled = true;
              resolve(true);
            }
          }
        });
        setTimeout(() => {
          const cBtn = document.getElementById('modal-cancel-btn');
          if (cBtn) {
            cBtn.addEventListener('click', () => {
              if (!settled) {
                settled = true;
                resolve(false);
              }
            }, { once: true });
          }
        }, 0);
        return;
      }
      resolve(false);
      return;
    }

    titleEl.textContent = title || 'Xác nhận thao tác';
    msgEl.textContent = message || '';
    if (inputWrap) inputWrap.classList.add('hidden');

    cancelBtn.textContent = cancelText || 'Hủy';
    cancelBtn.classList.remove('hidden');
    confirmBtn.textContent = confirmText || 'Xác nhận';
    confirmBtn.className = danger
      ? 'px-3.5 py-2 rounded-lg text-xs font-bold bg-[#DC2626] hover:bg-red-700 text-white shadow-sm cursor-pointer transition-colors'
      : 'px-3.5 py-2 rounded-lg text-xs font-bold bg-[#16A34A] hover:bg-[#15803D] text-white shadow-sm cursor-pointer transition-colors';

    let resolved = false;
    const cleanup = (result) => {
      if (resolved) return;
      resolved = true;
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      confirmBtn.onclick = null;
      cancelBtn.onclick = null;
      modal.onclick = null;
      document.removeEventListener('keydown', onKey);
      resolve(result);
    };

    const onKey = (ev) => {
      if (ev.key === 'Escape') {
        ev.stopPropagation();
        cleanup(false);
      }
    };

    confirmBtn.onclick = () => cleanup(true);
    cancelBtn.onclick = () => cleanup(false);
    modal.onclick = (ev) => {
      if (ev.target === modal) cleanup(false);
    };
    document.addEventListener('keydown', onKey);

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => confirmBtn.focus(), 50);
  });
}
window.showAdminConfirm = showAdminConfirm;

function showAdminPrompt({
  title = 'Nhập thông tin',
  message = '',
  placeholder = '',
  defaultValue = '',
  inputType = 'text',
  confirmText = 'Xác nhận',
  cancelText = 'Hủy'
} = {}) {
  return new Promise((resolve) => {
    const modal = ensureAdminDialogDom();
    const titleEl = document.getElementById('admin-dialog-title');
    const msgEl = document.getElementById('admin-dialog-message');
    const inputWrap = document.getElementById('admin-dialog-input-wrap');
    const inputEl = document.getElementById('admin-dialog-input');
    const cancelBtn = document.getElementById('admin-dialog-cancel');
    const confirmBtn = document.getElementById('admin-dialog-confirm');

    if (!modal || !titleEl || !msgEl || !inputWrap || !inputEl || !cancelBtn || !confirmBtn) {
      resolve(null);
      return;
    }

    titleEl.textContent = title || 'Nhập thông tin';
    msgEl.textContent = message || '';
    inputWrap.classList.remove('hidden');
    inputEl.type = inputType || 'text';
    inputEl.placeholder = placeholder || '';
    inputEl.value = defaultValue !== undefined && defaultValue !== null ? String(defaultValue) : '';

    cancelBtn.textContent = cancelText || 'Hủy';
    cancelBtn.classList.remove('hidden');
    confirmBtn.textContent = confirmText || 'Xác nhận';
    confirmBtn.className = 'px-3.5 py-2 rounded-lg text-xs font-bold bg-[#16A34A] hover:bg-[#15803D] text-white shadow-sm cursor-pointer transition-colors';

    let resolved = false;
    const cleanup = (result) => {
      if (resolved) return;
      resolved = true;
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      confirmBtn.onclick = null;
      cancelBtn.onclick = null;
      inputEl.onkeydown = null;
      modal.onclick = null;
      document.removeEventListener('keydown', onKey);
      resolve(result);
    };

    const onKey = (ev) => {
      if (ev.key === 'Escape') {
        ev.stopPropagation();
        cleanup(null);
      }
    };

    inputEl.onkeydown = (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        cleanup(inputEl.value);
      }
    };
    confirmBtn.onclick = () => cleanup(inputEl.value);
    cancelBtn.onclick = () => cleanup(null);
    modal.onclick = (ev) => {
      if (ev.target === modal) cleanup(null);
    };
    document.addEventListener('keydown', onKey);

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
      inputEl.focus();
      if (typeof inputEl.select === 'function') inputEl.select();
    }, 60);
  });
}
window.showAdminPrompt = showAdminPrompt;

function toggleAdminMobileDrawer(forceState) {
  const sidebar = document.getElementById('admin-sidebar') || document.querySelector('aside');
  const backdrop = document.getElementById('admin-mobile-backdrop') || document.getElementById('admin-sidebar-backdrop');
  if (!sidebar) return;

  const currentlyOpen = sidebar.classList.contains('translate-x-0') || sidebar.dataset.drawerOpen === '1';
  const shouldOpen = typeof forceState === 'boolean' ? forceState : !currentlyOpen;

  if (shouldOpen) {
    sidebar.dataset.drawerOpen = '1';
    if (sidebar.classList.contains('hidden')) {
      sidebar.dataset.hadHidden = '1';
      sidebar.classList.remove('hidden');
      sidebar.classList.add('flex');
    }
    sidebar.classList.remove('-translate-x-full');
    sidebar.classList.add('translate-x-0');
    if (backdrop) backdrop.classList.remove('hidden');
  } else {
    sidebar.dataset.drawerOpen = '0';
    sidebar.classList.remove('translate-x-0');
    if (sidebar.className.includes('translate-x') || window.innerWidth < 1024) {
      sidebar.classList.add('-translate-x-full');
    }
    if (sidebar.dataset.hadHidden === '1') {
      sidebar.classList.add('hidden');
      sidebar.classList.remove('flex');
    }
    if (backdrop) backdrop.classList.add('hidden');
  }
}
window.toggleAdminMobileDrawer = toggleAdminMobileDrawer;

function closeAdminMobileDrawer() {
  toggleAdminMobileDrawer(false);
}
window.closeAdminMobileDrawer = closeAdminMobileDrawer;

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
    if (!localUser) {
      localUser = JSON.parse(localStorage.getItem('sb_current_user') || 'null');
      if (localUser) {
        try { sessionStorage.setItem('sb_current_user', JSON.stringify(localUser)); } catch (e) {}
      }
    }
  } catch (e) {}

  if (!localUser || !['admin', 'manager', 'staff'].includes(localUser.role)) {
    document.documentElement.style.display = 'none';
    window.location.replace('/login?redirect=portal-admin');
    return;
  }

  const subEl = document.getElementById('admin-module-subtitle');
  if (subEl) {
    subEl.textContent = formatTimelineDateLabel(getLocalTodayISO()) + ' · Cập nhật trực tiếp';
  }

  currentPortalRole = localUser.role;
  updateAdminProfile(localUser);
  applyRolePermissions();

  fetch(normalizeAdminApiUrl('api/auth.php?action=me'), { cache: 'no-store' })
    .then(res => res.json())
    .then(data => {
      if (data && data.csrf_token) {
        setAdminCsrfToken(data.csrf_token);
      }
      if (!data || !data.success || !data.logged_in || !data.user || !['admin', 'manager', 'staff'].includes(data.user.role)) {
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
      }
      currentPortalRole = data.user.role;
      try {
        sessionStorage.setItem('sb_current_user', JSON.stringify(data.user));
        localStorage.setItem('sb_current_user', JSON.stringify(data.user));
      } catch (e) {}
      updateAdminProfile(data.user);
      applyRolePermissions();
      renderOverviewKPIs();
      renderAdminPitches();
      if (typeof loadMaintenanceSchedules === 'function') loadMaintenanceSchedules();
      if (typeof loadAdminReviews === 'function') loadAdminReviews();
      if (typeof renderAdminInventory === 'function') renderAdminInventory();
      if (typeof loadShiftHandovers === 'function') loadShiftHandovers();
      if (typeof renderAdminCustomers === 'function') renderAdminCustomers();
      if (typeof initRecurringScheduleForm === 'function') initRecurringScheduleForm();
      if (typeof loadRecurringSchedules === 'function') loadRecurringSchedules();
      if (typeof loadWaitlistAdmin === 'function') loadWaitlistAdmin();
      if (isManagerOrAdmin()) {
        renderAdminPayments();
        if (typeof loadBankTransactions === 'function') loadBankTransactions();
        if (typeof loadMatchmakingAdmin === 'function') loadMatchmakingAdmin();
        renderAdminReports();
      }
      if (isOwnerAdmin()) {
        renderAdminVouchers();
        loadPricingTable();
        if (typeof loadGoldenHourRules === 'function') loadGoldenHourRules();
        loadAdminSettings();
        loadStaffUsers();
        if (typeof loadAuditLogs === 'function') loadAuditLogs();
        if (typeof loadNotificationLogs === 'function') loadNotificationLogs();
        if (typeof loadBackupsList === 'function') loadBackupsList();
        if (typeof load2FaStatus === 'function') load2FaStatus();
      }
    })
    .catch(() => {
      try {
        sessionStorage.removeItem('sb_current_user');
        sessionStorage.removeItem('sb_csrf_token');
        localStorage.removeItem('sb_current_user');
      } catch (e) {}
      document.documentElement.style.display = 'none';
      window.location.replace('/login?redirect=portal-admin');
    });

  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  renderOverviewTodayBookings();
  renderTimelineGantt();
  populateInPlayWorkspace();
  initQuickBookingForm();
  renderAdminPitches();

  const expDateEl = document.getElementById('exp-date');
  if (expDateEl && !expDateEl.value) {
    expDateEl.value = getLocalTodayISO();
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
      if (typeof closeCustomerCrmModal === 'function') closeCustomerCrmModal();
      if (typeof closeMaintenanceModal === 'function') closeMaintenanceModal();
      if (typeof closeReviewReplyModal === 'function') closeReviewReplyModal();
      if (typeof closePitchModal === 'function') closePitchModal();
      if (typeof closeServiceModal === 'function') closeServiceModal();
    }
  });
});

function renderOverviewWeeklyChart(weeklySeries) {
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');
  const series = Array.isArray(weeklySeries) ? weeklySeries : [];
  const totalEl = document.getElementById('overview-weekly-total');
  const svgEl = document.getElementById('overview-weekly-svg');
  const labelsEl = document.getElementById('overview-weekly-labels');

  const weeklyTotal = series.reduce((sum, item) => sum + Number(item?.revenue || 0), 0);
  if (totalEl) {
    totalEl.textContent = `Tổng tuần: ${fmt(weeklyTotal)}`;
  }

  if (svgEl) {
    const gridHtml = `
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#16A34A" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#16A34A" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      <line x1="0" y1="40" x2="680" y2="40" stroke="#E2E8F0" stroke-dasharray="4"/>
      <line x1="0" y1="90" x2="680" y2="90" stroke="#E2E8F0" stroke-dasharray="4"/>
      <line x1="0" y1="140" x2="680" y2="140" stroke="#E2E8F0" stroke-dasharray="4"/>
    `;
    if (series.length === 0) {
      svgEl.innerHTML = gridHtml + `<text x="340" y="95" text-anchor="middle" fill="#94A3B8" font-size="12" font-weight="600">Chưa có dữ liệu 7 ngày gần nhất</text>`;
    } else {
      const maxRev = Math.max(...series.map(item => Number(item?.revenue || 0)), 0);
      const padX = 24;
      const topY = 22;
      const bottomY = 155;
      const spanX = 680 - padX * 2;
      const pts = series.map((item, idx) => {
        const rev = Number(item?.revenue || 0);
        const x = series.length === 1 ? 340 : Math.round(padX + (idx * spanX) / (series.length - 1));
        const y = maxRev > 0 ? Math.round(bottomY - ((rev / maxRev) * (bottomY - topY))) : bottomY;
        return {
          x,
          y,
          rev,
          matches: Number(item?.matches || 0),
          label: item?.label || item?.date || ''
        };
      });

      const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
      const areaPath = pts.length === 1
        ? `M${pts[0].x - 20},${bottomY} L${pts[0].x - 20},${pts[0].y} L${pts[0].x + 20},${pts[0].y} L${pts[0].x + 20},${bottomY} Z`
        : `${linePath} L${pts[pts.length - 1].x},${bottomY} L${pts[0].x},${bottomY} Z`;

      const circlesHtml = pts.map((p, idx) => {
        const isToday = idx === pts.length - 1;
        return `<circle cx="${p.x}" cy="${p.y}" r="${isToday ? 5.5 : 4}" fill="${isToday ? '#15803D' : '#16A34A'}" stroke="#ffffff" stroke-width="2"><title>${escapeSearchHTML(p.label)}: ${escapeSearchHTML(fmt(p.rev))} (${p.matches} ca)</title></circle>`;
      }).join('');

      svgEl.innerHTML = `
        ${gridHtml}
        <path d="${areaPath}" fill="url(#chartGrad)"/>
        <path d="${linePath}" fill="none" stroke="#16A34A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        ${circlesHtml}
      `;
    }
  }

  if (labelsEl) {
    if (series.length === 0) {
      labelsEl.innerHTML = '<span class="text-slate-400">Chưa có dữ liệu tuần</span>';
    } else {
      labelsEl.innerHTML = series.map((item, idx) => {
        const isLast = idx === series.length - 1;
        const lbl = escapeSearchHTML(item?.label || item?.date || '');
        return isLast
          ? `<span class="font-bold text-[#16A34A]">${lbl || 'Hôm nay'}</span>`
          : `<span>${lbl}</span>`;
      }).join('');
    }
  }
}

function renderOverviewPitchShares(byPitch) {
  const container = document.getElementById('overview-pitch-shares');
  if (!container) return;

  const list = Array.isArray(byPitch) ? [...byPitch] : [];
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');
  const totalRev = list.reduce((sum, p) => sum + Number(p?.revenue || 0), 0);
  const maintList = list.filter(p => p?.status === 'Bảo trì');

  const sorted = list
    .filter(p => Number(p?.revenue || 0) > 0 || Number(p?.matches || 0) > 0)
    .sort((a, b) => (Number(b.revenue || 0) - Number(a.revenue || 0)) || (Number(b.matches || 0) - Number(a.matches || 0)))
    .slice(0, 6);

  if (sorted.length === 0 || totalRev <= 0) {
    container.innerHTML = `
      <div class="text-xs text-slate-400 italic py-4 text-center">Chưa có doanh thu theo sân phát sinh hôm nay.</div>
      ${maintList.length > 0 ? `<div class="text-[11px] text-[#64748B] mt-3 pt-3 border-t border-[#E2E8F0]">* Đang bảo trì: ${escapeSearchHTML(maintList.map(m => m.name).join(', '))}</div>` : ''}
    `;
    return;
  }

  const barColors = ['#16A34A', '#22C55E', '#2563EB', '#0F172A', '#F59E0B', '#7C3AED'];
  const barsHtml = sorted.map((p, idx) => {
    const rev = Number(p.revenue || 0);
    const pct = totalRev > 0 ? Math.round((rev / totalRev) * 100) : 0;
    const color = barColors[idx % barColors.length];
    return `
      <div>
        <div class="flex justify-between gap-2 ${idx > 0 ? 'pt-1' : ''}">
          <span class="truncate" title="${escapeSearchHTML(p.name)}">${escapeSearchHTML(p.name)} <span class="text-slate-400">(${Number(p.matches || 0)} ca)</span></span>
          <b class="${idx === 0 ? 'text-[#16A34A]' : 'text-[#0F172A]'} shrink-0">${pct}% · ${escapeSearchHTML(fmt(rev))}</b>
        </div>
        <div class="w-full h-2 rounded bg-slate-100 mt-1 overflow-hidden">
          <div style="width:${Math.max(0, Math.min(100, pct))}%; background:${color}" class="h-full rounded"></div>
        </div>
      </div>
    `;
  }).join('');

  const maintNote = maintList.length > 0
    ? `<div class="text-[11px] text-[#64748B] mt-3 pt-3 border-t border-[#E2E8F0]">* Sân đang bảo trì: ${escapeSearchHTML(maintList.map(m => m.name).join(', '))}</div>`
    : '';

  container.innerHTML = barsHtml + maintNote;
}

function applyOverviewKPIsData(data) {
  const db = window.SanBongApp?.SanBongDB;
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  const todayStats = data?.todayStats || {};
  const todayBookings = Array.isArray(data?.todayBookings) ? data.todayBookings : [];
  const pitchStats = data?.pitchStats || {};
  const weeklySeries = Array.isArray(data?.weeklySeries) ? data.weeklySeries : [];
  const byPitch = Array.isArray(data?.byPitch) ? data.byPitch : [];

  const pitches = db ? db.getPitches() : [];
  const totalPitches = Number(pitchStats.total ?? pitches.length ?? 0);
  const maintCount = byPitch.length > 0
    ? byPitch.filter(p => p.status === 'Bảo trì').length
    : pitches.filter(p => p.status === 'Bảo trì').length;
  const activePitches = Number(pitchStats.active ?? Math.max(0, totalPitches - maintCount));

  const totalCount = Number(todayStats.count ?? todayBookings.length ?? 0);
  let playingCount = 0;
  let waitingCheckinCount = 0;
  let pendingVietQRCount = 0;
  let activeTodayBookings = 0;

  todayBookings.forEach(b => {
    const st = (b.status === 'Vắng mặt (No-Show)' || String(b.status || '').includes('No-Show')) ? 'Khách chưa đến' : (b.status || '');
    const paySt = b.paymentStatus || b.payment_status || '';
    if (st === 'Đang đá') playingCount++;
    if (st === 'Đã xác nhận' || st === 'Chờ duyệt cọc') waitingCheckinCount++;
    if (paySt === 'Chờ duyệt cọc' && st !== 'Đã hủy' && st !== 'Khách chưa đến') pendingVietQRCount++;
    if (st !== 'Đã hủy' && st !== 'Khách chưa đến') activeTodayBookings++;
  });

  const slotsPerDay = (db?.getTimeSlots?.().length || 18);
  const capacity = activePitches * slotsPerDay;
  const occupancyPct = capacity > 0 ? Math.min(100, Math.round((activeTodayBookings / capacity) * 100)) : 0;

  const revEl = document.getElementById('kpi-revenue-value');
  const revSubEl = document.getElementById('kpi-revenue-sub');
  const cntEl = document.getElementById('kpi-bookings-count');
  const pendingEl = document.getElementById('kpi-bookings-pending');
  const occValEl = document.getElementById('kpi-occupancy-value');
  const occBarEl = document.getElementById('kpi-occupancy-bar');
  const readyEl = document.getElementById('kpi-pitches-ready');
  const subEl = document.getElementById('kpi-pitches-sub');

  if (isManagerOrAdmin()) {
    const todayTotalRev = Number(todayStats.today_total ?? 0);
    const todayDepositRev = Number(todayStats.today_deposit ?? 0);
    if (revEl) revEl.textContent = fmt(todayTotalRev);
    if (revSubEl) {
      if (weeklySeries.length >= 2) {
        const yestRev = Number(weeklySeries[weeklySeries.length - 2]?.revenue ?? 0);
        if (yestRev > 0) {
          const pct = Math.round(((todayTotalRev - yestRev) / yestRev) * 100);
          const arrow = pct >= 0 ? '↑' : '↓';
          revSubEl.innerHTML = `<span class="${pct >= 0 ? 'text-[#16A34A]' : 'text-rose-600'} font-semibold">${arrow} ${Math.abs(pct)}%</span> <span class="text-[#64748B] font-normal">so với hôm qua · Đã cọc ${escapeSearchHTML(fmt(todayDepositRev))}</span>`;
        } else {
          revSubEl.textContent = `Đã thu cọc hôm nay: ${fmt(todayDepositRev)}`;
        }
      } else {
        revSubEl.textContent = `Đã thu cọc hôm nay: ${fmt(todayDepositRev)}`;
      }
    }
    renderOverviewWeeklyChart(weeklySeries);
    renderOverviewPitchShares(byPitch);
  }

  if (cntEl) cntEl.textContent = `${totalCount} lượt`;
  if (pendingEl) {
    if (isManagerOrAdmin()) {
      pendingEl.textContent = pendingVietQRCount > 0
        ? `${pendingVietQRCount} đơn đang giữ chỗ VietQR`
        : '✓ Đã duyệt hết cọc VietQR';
    } else {
      pendingEl.textContent = `${waitingCheckinCount} ca đang chờ check-in`;
    }
  }
  if (occValEl) occValEl.textContent = `${occupancyPct}%`;
  if (occBarEl) occBarEl.style.width = `${occupancyPct}%`;
  if (readyEl) readyEl.textContent = `${activePitches}/${totalPitches} Sân sẵn sàng`;
  if (subEl) subEl.textContent = `${playingCount} đang đá · ${maintCount} bảo trì mặt cỏ`;
}

async function renderOverviewKPIs() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const res = await adminFetchJson('../api/admin.php?action=overview');
  if (res.ok && res.data) {
    const serverBookings = Array.isArray(res.data.todayBookings) ? res.data.todayBookings : [];
    const todayISO = getLocalTodayISO();
    try {
      const existing = db.getAllBookings();
      const otherDates = existing.filter(b => (b.date || b.booking_date) !== todayISO);
      const merged = [...serverBookings, ...otherDates];
      localStorage.setItem('sb_bookings_v1', JSON.stringify(merged));
    } catch (e) {}

    applyOverviewKPIsData(res.data);
    renderOverviewTodayBookings();
    return;
  }

  const todayISO = getLocalTodayISO();
  const allBookings = db.getAllBookings();
  const todayBookings = allBookings.filter(b => (b.date || b.booking_date) === todayISO && b.status !== 'Đã hủy');
  const pitches = db.getPitches();

  let todayTotal = 0;
  let todayDeposit = 0;
  todayBookings.forEach(b => {
    const st = b.status || '';
    if (st === 'Hoàn thành') {
      todayTotal += Number(b.totalPrice || 0);
      todayDeposit += Number(b.depositAmount || 0);
    } else if (st !== 'Khách chưa đến') {
      todayTotal += Number(b.totalPrice || 0);
      todayDeposit += Number(b.depositAmount || 0);
    }
  });

  applyOverviewKPIsData({
    todayStats: {
      count: todayBookings.length,
      today_total: isManagerOrAdmin() ? todayTotal : null,
      today_deposit: isManagerOrAdmin() ? todayDeposit : null
    },
    todayBookings,
    pitchStats: {
      total: pitches.length,
      active: pitches.filter(p => p.status === 'Hoạt động').length
    },
    weeklySeries: [],
    byPitch: []
  });
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
  if (typeof closeAdminMobileDrawer === 'function') closeAdminMobileDrawer();
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
    'timeline': '2. Lịch đặt sân Timeline Gantt, Lịch lặp & Ghép kèo',
    'quick-booking': '3. Vận hành Quầy: Đặt sân · Kho nước POS · Chốt ca',
    'pitches': '4. Quản lý sân bóng, Lịch bảo trì & Đánh giá',
    'pricing': '5. Cấu hình bảng giá niêm yết, Giờ vàng & Voucher',
    'customers': '6. Danh sách khách hàng CRM, Công nợ & Cảnh báo No-Show',
    'payments': '7. Duyệt biên lai & Đối soát giao dịch VietQR',
    'reports': '8. Báo cáo doanh thu, Chi phí & Lãi ròng',
    'settings': '9. Cài đặt hệ thống, Thông báo, Sao lưu & Audit Log'
  };
  const titleEl = document.getElementById('admin-module-title');
  if (titleEl) titleEl.textContent = titleMap[moduleKey] || 'Quản trị';

  if (moduleKey === 'overview') {
    renderOverviewKPIs();
  }
  if (moduleKey === 'timeline') {
    if (typeof initRecurringScheduleForm === 'function') initRecurringScheduleForm();
    fetchTimelineDateBookings(selectedTimelineDate).then(() => renderTimelineGantt());
    if (typeof loadRecurringSchedules === 'function') loadRecurringSchedules();
    if (typeof loadWaitlistAdmin === 'function') loadWaitlistAdmin();
    if (isManagerOrAdmin() && typeof loadMatchmakingAdmin === 'function') loadMatchmakingAdmin();
  }
  if (moduleKey === 'quick-booking') {
    refreshWalkinBookedSlots();
    updateWalkinPricePreview();
    if (typeof renderAdminInventory === 'function') renderAdminInventory();
    if (typeof loadShiftHandovers === 'function') loadShiftHandovers();
  }
  if (moduleKey === 'pitches') {
    renderAdminPitches();
    if (typeof loadMaintenanceSchedules === 'function') loadMaintenanceSchedules();
    if (typeof loadAdminReviews === 'function') loadAdminReviews();
  }
  if (moduleKey === 'pricing' && isOwnerAdmin()) {
    loadPricingTable();
    renderAdminVouchers();
    if (typeof loadGoldenHourRules === 'function') loadGoldenHourRules();
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
    if (typeof loadNotificationLogs === 'function') loadNotificationLogs();
    if (typeof loadBackupsList === 'function') loadBackupsList();
    if (typeof load2FaStatus === 'function') load2FaStatus();
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

    const safeCodeAttr = escapeJsAttr(b.code);
    const safeCodeHtml = escapeSearchHTML(b.code);
    const safePitchHtml = escapeSearchHTML(b.pitchName || '');
    const safeSlotHtml = escapeSearchHTML(b.slotTime || '');

    let actionButtons = "";
    if (normStatus === "Đang đá") {
      actionButtons =
        '<div class="flex items-center gap-1.5">' +
          '<button type="button" onclick="event.stopPropagation(); openInPlayModal(\'' + safeCodeAttr + '\')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-800 text-white hover:bg-slate-900 transition-colors shadow-2xs flex items-center gap-1 cursor-pointer" title="Đá thêm giờ, Đổi sân, Gọi thêm nước, Hủy trước hạn">⚙️ Quản lý đang chơi</button>' +
          '<button type="button" onclick="event.stopPropagation(); openInPlayModal(\'' + safeCodeAttr + '\', \'pay\')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#16A34A] text-white hover:bg-[#15803D] transition-colors shadow-2xs flex items-center gap-1 cursor-pointer" title="Thu phần tiền còn lại & Hoàn thành ca">💰 Thu còn lại (' + window.SanBongApp.formatVND(remaining) + ')</button>' +
          '<button type="button" onclick="event.stopPropagation(); openInvoicePrintModal(\'' + safeCodeAttr + '\')" class="px-2 py-1 text-[11px] font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer" title="Xem & In hóa đơn">🖨️ Hóa đơn</button>' +
        '</div>';
    } else if (normStatus === "Hoàn thành") {
      actionButtons =
        '<div class="flex items-center gap-1.5">' +
          '<span class="px-2 py-0.5 text-[11px] font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">✓ Đã thu đủ 100%</span>' +
          '<button type="button" onclick="event.stopPropagation(); openInPlayModal(\'' + safeCodeAttr + '\')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-[#0F172A] hover:bg-slate-200 border border-slate-300 cursor-pointer">⚙️ Xem & Điều hành</button>' +
          '<button type="button" onclick="event.stopPropagation(); openInvoicePrintModal(\'' + safeCodeAttr + '\')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#0F172A] text-white hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer">🖨️ In hóa đơn</button>' +
        '</div>';
    } else if (normStatus === "Khách chưa đến" || normStatus === "Đã hủy") {
      actionButtons =
        '<div class="flex items-center gap-1.5">' +
          '<span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">✓ Đã nhả sân</span>' +
          '<button type="button" onclick="event.stopPropagation(); restoreCancelledBooking(\'' + safeCodeAttr + '\')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500 text-white hover:bg-amber-600 shadow-2xs cursor-pointer" title="Khách đã tới sân - Khôi phục lại ca đá này">🔄 Khôi phục ca</button>' +
          '<button type="button" onclick="event.stopPropagation(); openInPlayModal(\'' + safeCodeAttr + '\')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-[#0F172A] hover:bg-slate-200 border border-slate-300 cursor-pointer" title="Mở bảng điều hành chi tiết ca đá">⚙️ Xem & Điều hành</button>' +
          '<button type="button" onclick="event.stopPropagation(); openInvoicePrintModal(\'' + safeCodeAttr + '\')" class="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-[#475569] hover:bg-slate-200 border border-slate-200 cursor-pointer" title="Xem & In hóa đơn">🖨️ Hóa đơn</button>' +
        '</div>';
    } else {
      const lateBadge = isLateOver15 ? ('<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 animate-pulse border border-red-300 whitespace-nowrap">⚠️ Quá ' + lateMinutes + 'p chưa đến</span>') : '';
      const btnClass = isLateOver15 ? "bg-red-600 hover:bg-red-700 animate-bounce" : "bg-amber-600 hover:bg-amber-700";
      actionButtons = '<div class="flex items-center gap-1.5">' +
        lateBadge +
        '<button type="button" onclick="event.stopPropagation(); handleCheckin(\'' + safeCodeAttr + '\')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#16A34A] text-white hover:bg-[#15803D] transition-colors shadow-2xs flex items-center gap-1 cursor-pointer" title="Khách đã đến sân - Xác nhận vào đá"><span>✓</span> Check-in</button>' +
        '<button type="button" onclick="event.stopPropagation(); openInPlayModal(\'' + safeCodeAttr + '\')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 text-[#0F172A] hover:bg-slate-200 border border-slate-300 transition-colors flex items-center gap-1 cursor-pointer" title="Đổi sân, Gọi thêm nước, Hủy lịch trước hạn">⚙️ Quản lý / Đổi sân / Hủy</button>' +
        '<button type="button" onclick="event.stopPropagation(); handleNoShowRelease(\'' + safeCodeAttr + '\')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg ' + btnClass + ' text-white transition-colors shadow-2xs flex items-center gap-1 cursor-pointer" title="Quá 15 phút khách chưa đến: Tịch thu cọc 30% & Giải phóng nhả sân trống đón khách mới"><span>⚠️</span> Chưa đến: Nhả sân</button>' +
        '<button type="button" onclick="event.stopPropagation(); openInvoicePrintModal(\'' + safeCodeAttr + '\')" class="px-2 py-1 text-[11px] font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 cursor-pointer" title="Xem & In hóa đơn">🖨️ Hóa đơn</button>' +
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

    return '<div onclick="openInPlayModal(\'' + safeCodeAttr + '\')" class="py-2.5 px-3.5 rounded-lg border ' + cardColorCls + ' shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 transition-all cursor-pointer">' +
      '<div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 flex-1 min-w-0">' +
        '<!-- Cột 1: Mã đơn & Sân & Khung giờ -->' +
        '<div class="flex items-center gap-2 shrink-0">' +
          '<button type="button" onclick="event.stopPropagation(); openInPlayModal(\'' + safeCodeAttr + '\')" class="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-50 text-slate-800 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer" title="Bấm để mở popup chi tiết ca đá">' + safeCodeHtml + '</button>' +
          '<span class="font-bold text-[#0F172A] text-xs whitespace-nowrap min-w-[110px]">' + safePitchHtml + '</span>' +
          '<span class="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded whitespace-nowrap">⏰ ' + safeSlotHtml + '</span>' +
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
    const r = await adminFetchJson('../api/bookings.php?action=checkin&code=' + encodeURIComponent(bookingCode), {
      method: 'POST',
      body: JSON.stringify({})
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(r.message || 'Không thể check-in đơn đặt sân!', 'error', 4000);
      }
      return;
    }
    const db = window.SanBongApp.SanBongDB;
    const updated = db.checkinBooking(bookingCode);
    const rem = updated ? window.SanBongApp.formatVND(updated.remainingAmount || 0) : '';
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('✓ CHECK-IN THÀNH CÔNG: Đơn ' + bookingCode + ' đã vào sân Đang đá! (Còn lại phải thu cuối giờ: ' + rem + ')', 'success', 4000);
    }
    renderOverviewKPIs();
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
    const confirmed = await showAdminConfirm({
      title: '⚽ Xác nhận Check-in nhận sân thi đấu',
      message: 'Xác nhận đội khách mã đơn ' + bookingCode + ' đã có mặt tại sân và nhận sân thi đấu?',
      confirmText: 'Check-in Vào Sân',
      cancelText: 'Đóng'
    });
    if (confirmed) await doCheckin();
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
    const r = await adminFetchJson('../api/bookings.php?action=noshow_release&code=' + encodeURIComponent(bookingCode), {
      method: 'POST',
      body: JSON.stringify({})
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(r.message || 'Không thể nhả sân cho đơn này!', 'error', 4000);
      }
      return;
    }

    db.releaseNoShowBooking(bookingCode);
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('⚡ ĐÃ NHẢ SÂN THÀNH CÔNG: Đơn ' + bookingCode + ' chuyển sang "Khách chưa đến", sân ' + pitchName + ' đã trống để đón khách mới!', 'success', 4000);
    }
    renderOverviewKPIs();
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
    const confirmed = await showAdminConfirm({
      title: '⚠️ Xử lý khách quá giờ chưa đến (Nhả sân)',
      message: confirmMsg,
      confirmText: 'Tịch thu cọc & Nhả sân',
      cancelText: 'Giữ sân thêm',
      danger: true
    });
    if (confirmed) await doRelease();
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
let recurringSchedulesCache = [];
let adminWaitlistCache = [];
let adminMatchmakingCache = [];
let maintenanceSchedulesCache = [];
let adminReviewsCache = [];
let currentBankTxFilter = 'pending';
let cachedBankTransactions = [];
let cachedCandidateBookings = [];
let crmCustomersFetchSeq = 0;
let adminCustomersCache = [];
let current2FaEnabled = false;
let qrHiddenCanvas = null;
let vouchersAdminCache = [];
let goldenHourRulesCache = [];
const STAFF_STORAGE_KEY = 'sb_staff_users_v1';
let cachedStaffUsers = [];
let isPosSaleSubmitting = false;

document.addEventListener('DOMContentLoaded', () => {
  const cancelInput = document.getElementById('inplay-cancel-reason');
  if (cancelInput) {
    cancelInput.placeholder = 'Nhập lý do hủy ca (Bắt buộc nếu đơn đã thu tiền/cọc)...';
    if (cancelInput.value === 'Khách báo hủy lịch trước thời hạn') {
      cancelInput.value = '';
    }
  }
});


