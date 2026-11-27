/* === admin_dialogs.js === */
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
window.ensureAdminDialogDom = ensureAdminDialogDom;

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

function adminPrompt(title = 'Nhập thông tin', message = '', defaultValue = '', placeholder = '') {
  if (title && typeof title === 'object') {
    return showAdminPrompt(title);
  }
  return showAdminPrompt({
    title: title || 'Nhập thông tin',
    message: message || '',
    defaultValue: defaultValue !== undefined && defaultValue !== null ? String(defaultValue) : '',
    placeholder: placeholder || ''
  });
}
window.adminPrompt = adminPrompt;

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

;
/* === admin.js === */
let activeModule = 'overview';
let currentPortalRole = (typeof window !== 'undefined' && window.sb_current_user && window.sb_current_user.role)
  ? window.sb_current_user.role
  : (() => {
      try {
        const u = JSON.parse(sessionStorage.getItem('sb_current_user') || '{}');
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

async function ensureAdminCsrfToken(forceRefresh = false) {
  const current = getAdminCsrfToken();
  if (current && !forceRefresh) return current;
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
window.ensureCsrfToken = ensureAdminCsrfToken;

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
      if (res.status === 401 && !window._adminRedirecting401) {
        window._adminRedirecting401 = true;
        try {
          sessionStorage.removeItem('sb_current_user');
          sessionStorage.removeItem('sb_csrf_token');
          localStorage.removeItem('sb_current_user');
        } catch (e) {}
        const loginUrl = (window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath('login') : '../login') + '?redirect=portal-admin&expired=1';
        window.location.replace(loginUrl);
      }
      const isMutating = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
      const errMsg = String(json?.message || '');
      const isCsrfErr = res.status === 403 && (
        json?.ref_code === 'ERR_CSRF_INVALID' ||
        /csrf|mã bảo mật/i.test(errMsg)
      );
      if (isMutating && isCsrfErr && !opts._csrfRetried) {
        const freshCsrf = await ensureAdminCsrfToken(true);
        if (freshCsrf) {
          const retryHeaders = Object.assign({}, headers, { 'X-CSRF-Token': freshCsrf });
          let retryBody = opts.body;
          if (typeof FormData !== 'undefined' && retryBody instanceof FormData) {
            retryBody.set('csrf_token', freshCsrf);
          } else if (typeof retryBody === 'string' && retryBody.trim().startsWith('{')) {
            try {
              const parsed = JSON.parse(retryBody);
              if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && ('csrf_token' in parsed || 'csrfToken' in parsed)) {
                if ('csrf_token' in parsed) parsed.csrf_token = freshCsrf;
                if ('csrfToken' in parsed) parsed.csrfToken = freshCsrf;
                retryBody = JSON.stringify(parsed);
              }
            } catch (e) {}
          }
          return adminFetchJson(url, Object.assign({}, options, {
            headers: retryHeaders,
            body: retryBody,
            _csrfRetried: true
          }));
        }
      }
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
    sessionStorage.clear();
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('sb_') || k.startsWith('sanbong_')) {
        localStorage.removeItem(k);
      }
    });
  } catch (e) {}
  if (window.SanBongHelpers?.clearCsrfToken) window.SanBongHelpers.clearCsrfToken();
  window.location.replace(window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath('login') : '../login');
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
    try { localStorage.removeItem('sb_current_user'); } catch (e) {}
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
    const showRevenueCard = Boolean(kpiRevCard) && isMgrOrAdmin;
    if (showRevenueCard) {
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
    addPitchBtn.style.display = isMgrOrAdmin ? '' : 'none';
  }
  const openServiceBtn = document.getElementById('btn-open-service-modal');
  if (openServiceBtn) {
    openServiceBtn.classList.toggle('hidden', !isMgrOrAdmin);
    openServiceBtn.style.display = isMgrOrAdmin ? '' : 'none';
  }

  if (!isAdmin) {
    const allowed = PORTAL_ALLOWED_TABS[currentPortalRole] || PORTAL_ALLOWED_TABS.staff;
    if (!allowed.includes(activeModule)) {
      const wasLogs = (activeModule === 'logs');
      const denyMsg = wasLogs ? 'Bạn không có quyền xem nhật ký' : 'Bạn không có quyền truy cập mục này';
      switchAdminTab('overview');
      if (window.SanBongApp && typeof window.SanBongApp.showToast === 'function') {
        window.SanBongApp.showToast(denyMsg, 'error');
      }
    }
  }
}
window.applyRolePermissions = applyRolePermissions;

function switchAdminTab(moduleKey) {
  const rawRequested = String(moduleKey || '').trim().toLowerCase();
  const tabNumMap = {
    '1': 'overview', '2': 'timeline', '3': 'quick-booking', '4': 'pitches',
    '5': 'pricing', '6': 'customers', '7': 'payments', '8': 'shifts',
    '9': 'reports', '10': 'settings', '11': 'logs', 'admin-logs': 'logs'
  };
  if (tabNumMap[rawRequested]) moduleKey = tabNumMap[rawRequested];

  if (typeof window !== 'undefined' && window.sb_current_user && window.sb_current_user.role) {
    currentPortalRole = window.sb_current_user.role;
  } else {
    try {
      const u = JSON.parse(sessionStorage.getItem('sb_current_user') || '{}');
      if (u.role) currentPortalRole = u.role;
    } catch(e) {}
  }

  const allowed = PORTAL_ALLOWED_TABS[currentPortalRole] || PORTAL_ALLOWED_TABS.staff;
  if (!allowed.includes(moduleKey)) {
    const isLogAttempt = (moduleKey === 'logs' || rawRequested === 'logs' || rawRequested === '11' || rawRequested === 'admin-logs');
    const denyMsg = isLogAttempt ? 'Bạn không có quyền xem nhật ký' : 'Bạn không có quyền truy cập mục này';
    moduleKey = 'overview';
    if (window.SanBongApp && typeof window.SanBongApp.showToast === 'function') {
      window.SanBongApp.showToast(denyMsg, 'error');
    } else {
      alert(denyMsg);
    }
  }

  activeModule = moduleKey;
  try {
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('tab', moduleKey);
    const curHash = String(newUrl.hash || '').replace(/^#/, '').trim().toLowerCase();
    const isPricingHash = curHash === 'pricing' || curHash.startsWith('pricing/');
    const isReportsHash = curHash === 'reports' || curHash.startsWith('reports/') || ['tong-quan', 'doi-soat', 'chi-tiet', 'chi-phi'].includes(curHash);
    if ((moduleKey !== 'pricing' && isPricingHash) || (moduleKey !== 'reports' && isReportsHash)) {
      newUrl.hash = '';
    }
    history.replaceState(null, '', newUrl.toString());
  } catch (e) {}

  if (typeof closeAdminMobileDrawer === 'function') closeAdminMobileDrawer();
  if (typeof clearAdminSearch === 'function') clearAdminSearch();
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
    'customers': 'Hồ sơ khách hàng',
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

  if (moduleKey === 'overview') {
    if (typeof renderOverviewKPIs === 'function') renderOverviewKPIs();
    if (typeof populateInPlayWorkspace === 'function') populateInPlayWorkspace();
  }
  if (moduleKey === 'timeline') {
    if (typeof renderTimelineGantt === 'function') renderTimelineGantt(true);
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
    if (typeof initPricingTab === 'function') {
      initPricingTab();
    } else {
      renderAdminVouchers();
      loadPricingTable();
    }
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
    if (typeof loadAdminLogs === 'function') loadAdminLogs(1);
    if (typeof loadNotificationLogs === 'function') loadNotificationLogs();
    if (typeof loadBackupsList === 'function') loadBackupsList();
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
  } catch (e) {}
  try { localStorage.removeItem('sb_current_user'); } catch (e) {}

  const isAllowedAdmin = Boolean(
    (localUser && ['admin', 'manager', 'staff'].includes(localUser.role)) ||
    (window.sb_current_user && ['admin', 'manager', 'staff'].includes(window.sb_current_user.role))
  );

  const subEl = document.getElementById('admin-module-subtitle');
  if (subEl) {
    subEl.textContent = typeof formatTimelineDateLabel === 'function' ? formatTimelineDateLabel(getLocalTodayISO()) : getLocalTodayISO();
  }

  if (localUser && localUser.role) {
    currentPortalRole = localUser.role;
    updateAdminProfile(localUser);
  }
  applyRolePermissions();
  const rawHash = window.location.hash.replace(/^#/, '');
  const hashTab = rawHash.split('/')[0];
  const initialUrlTab = new URLSearchParams(window.location.search).get('tab') || hashTab;
  const initialTab = initialUrlTab || 'overview';
  const initialRole = currentPortalRole;
  let initialTabBooted = false;
  if (isAllowedAdmin) {
    switchAdminTab(initialTab);
    initialTabBooted = true;
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
          localStorage.removeItem('sb_current_user');
          window.sb_current_user = data.user;
        } catch (e) {}
        updateAdminProfile(data.user);
        applyRolePermissions();
        document.documentElement.style.display = '';
        const targetTab = activeModule || initialTab || 'overview';
        if (!initialTabBooted || currentPortalRole !== initialRole) {
          switchAdminTab(targetTab);
          initialTabBooted = true;
        }
        return;
      }

      if (isAllowedAdmin) {
        console.warn('Phiên nền tảng đang đồng bộ');
        const targetTab = activeModule || initialTab || 'overview';
        if (!initialTabBooted || currentPortalRole !== initialRole) {
          switchAdminTab(targetTab);
          initialTabBooted = true;
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
      window.location.replace((window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath('login') : '../login') + '?redirect=portal-admin&expired=1');
      return;
    })
    .catch(err => {
      console.warn('Lỗi kết nối auth/me:', err);
      if (!isAllowedAdmin) {
        document.documentElement.style.display = 'none';
        window.location.replace((window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath('login') : '../login') + '?redirect=portal-admin&expired=1');
      }
    });

  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const expDateEl = document.getElementById('exp-date');
  if (expDateEl && !expDateEl.value) {
    expDateEl.value = getLocalTodayISO();
  }

  window.addEventListener('storage', () => {
    if (typeof refreshAllAdminViews === 'function') refreshAllAdminViews(window.activeInPlayCode);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      if (tag !== 'input' && tag !== 'textarea' && tag !== 'select' && !(e.target && e.target.isContentEditable)) {
        const searchWrap = document.getElementById('admin-search-wrap');
        const searchInput = document.getElementById('admin-global-search');
        if (searchInput) {
          e.preventDefault();
          if (searchWrap && searchWrap.classList.contains('hidden')) {
            searchWrap.classList.remove('hidden');
          }
          searchInput.focus();
          if (typeof searchInput.select === 'function') searchInput.select();
        }
      }
      return;
    }
    if (e.key === 'Escape') {
      [closeInPlayModal, closeInvoiceModal, closeQRScannerModal, closeResetStaffPwModal,
       closeReconcileAssignModal, closeCustomerCrmModal, closeMaintenanceModal,
       closeReviewReplyModal, closePitchModal, closeServiceModal,
       typeof closePackageModal === 'function' ? closePackageModal : null].forEach(fn => {
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

;
/* === admin_overview.js === */
let currentOverviewFilter = 'all';
let currentOverviewPage = 1;
const OVERVIEW_PAGE_SIZE = 8;
let overviewSummaryCache = null;
window.overviewSummaryCache = null;
let overviewLastHash = '';
let overviewFetchInFlight = false;
let overviewSelectedCodes = new Set();
let overviewOverdueOpen = false;
let overviewRefreshTimer = null;

function formatTitleCaseVN(str) {
  const s = String(str || '').trim();
  if (!s) return 'Khách hàng';
  return s.split(/\s+/).map(word => {
    if (!word) return '';
    if (/^[A-Z0-9()_-]{2,}$/.test(word)) return word;
    return word.charAt(0).toLocaleUpperCase('vi-VN') + word.slice(1).toLocaleLowerCase('vi-VN');
  }).join(' ');
}

function formatPhoneVN(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return String(phone || '—').trim() || '—';
}

function fmtOverviewVND(n) {
  return Number(n || 0).toLocaleString('vi-VN') + 'đ';
}

function normalizeOverviewStatus(raw) {
  const s = String(raw || 'Đã xác nhận').trim();
  if (s === 'Vắng mặt (No-Show)' || s.includes('No-Show')) return 'Khách chưa đến';
  if (s.toLowerCase() === 'completed') return 'Hoàn thành';
  if (s === 'Giữ chỗ (chờ cọc)') return 'Giữ chỗ';
  if (s === 'Chờ cọc' || s === 'Chờ cọc 30%') return 'Chờ duyệt cọc';
  return s;
}

function matchesOverviewFilter(booking, filterType) {
  if (!filterType || filterType === 'all') return true;
  const st = normalizeOverviewStatus(booking.status);
  if (filterType === 'playing') return st === 'Đang đá' || st === 'Đã đá - chưa tất toán';
  if (filterType === 'confirmed') return st === 'Đã xác nhận' || st === 'Chờ duyệt cọc' || st === 'Giữ chỗ';
  if (filterType === 'completed') return st === 'Hoàn thành';
  if (filterType === 'noshow') return st === 'Khách chưa đến' || st === 'Đã hủy';
  return true;
}

function toggleOverviewGraceInfo(force) {
  const panel = document.getElementById('ov-grace-info-panel');
  if (!panel) return;
  const show = typeof force === 'boolean' ? force : panel.classList.contains('hidden');
  panel.classList.toggle('hidden', !show);
}
window.toggleOverviewGraceInfo = toggleOverviewGraceInfo;

function toggleOverviewOverdue(force) {
  const wrap = document.getElementById('ov-overdue-list-wrap');
  const chev = document.getElementById('ov-overdue-chevron');
  if (!wrap) return;
  overviewOverdueOpen = typeof force === 'boolean' ? force : !overviewOverdueOpen;
  wrap.classList.toggle('hidden', !overviewOverdueOpen);
  if (chev) chev.textContent = overviewOverdueOpen ? 'Thu gọn ▴' : 'Bấm để mở ▾';
}
window.toggleOverviewOverdue = toggleOverviewOverdue;

function renderOverviewWeeklyChart(weeklySeries, prevWeeklySeries) {
  const series = Array.isArray(weeklySeries) ? weeklySeries : [];
  const prevSeries = Array.isArray(prevWeeklySeries) ? prevWeeklySeries : [];
  const totalEl = document.getElementById('overview-weekly-total');
  const svgEl = document.getElementById('overview-weekly-svg');
  const labelsEl = document.getElementById('overview-weekly-labels');

  const weeklyTotal = series.reduce((sum, item) => sum + Number(item?.revenue || 0), 0);
  if (totalEl) totalEl.textContent = `Tổng tuần: ${fmtOverviewVND(weeklyTotal)}`;

  if (!svgEl) return;
  const padLeft = 54;
  const padRight = 18;
  const topY = 18;
  const bottomY = 182;
  const chartW = 680 - padLeft - padRight;
  const chartH = bottomY - topY;

  const maxRev = Math.max(
    1,
    ...series.map(i => Number(i?.revenue || 0)),
    ...prevSeries.map(i => Number(i?.revenue || 0))
  );
  const niceMax = Math.ceil(maxRev / 500000) * 500000 || 500000;
  const fmtAxis = (v) => v >= 1000000 ? (v / 1000000).toFixed(1).replace('.0', '') + 'tr' : (v > 0 ? Math.round(v / 1000) + 'k' : '0');

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(frac => {
    const val = Math.round(niceMax * frac);
    const y = Math.round(bottomY - frac * chartH);
    return `
      <line x1="${padLeft}" y1="${y}" x2="${680 - padRight}" y2="${y}" stroke="#E2E8F0" stroke-dasharray="${frac === 0 ? '0' : '4'}"/>
      <text x="${padLeft - 8}" y="${y + 4}" text-anchor="end" fill="#64748B" font-size="10" font-weight="600">${fmtAxis(val)}</text>
    `;
  }).join('');

  if (series.length === 0) {
    svgEl.innerHTML = `${yTicks}<text x="${padLeft + chartW / 2}" y="100" text-anchor="middle" fill="#94A3B8" font-size="12" font-weight="600">Chưa có dữ liệu 7 ngày gần nhất</text>`;
    if (labelsEl) labelsEl.innerHTML = '<span class="text-slate-400">Chưa có dữ liệu tuần</span>';
    return;
  }

  const toPoints = (arr) => arr.map((item, idx) => {
    const rev = Number(item?.revenue || 0);
    const x = arr.length === 1 ? padLeft + chartW / 2 : Math.round(padLeft + (idx * chartW) / (arr.length - 1));
    const y = Math.round(bottomY - (rev / niceMax) * chartH);
    return { x, y, rev, matches: Number(item?.matches || 0), label: item?.label || item?.date || '' };
  });

  const curPts = toPoints(series);
  const prevPts = prevSeries.length === series.length ? toPoints(prevSeries) : [];

  const curLine = curPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const curArea = `${curLine} L${curPts[curPts.length - 1].x},${bottomY} L${curPts[0].x},${bottomY} Z`;
  const prevLine = prevPts.length > 0 ? prevPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') : '';

  const pointsHtml = curPts.map((p, idx) => {
    const prevRev = prevPts[idx] ? prevPts[idx].rev : 0;
    const isToday = idx === curPts.length - 1;
    const tipData = escapeSearchHTML(`${p.label}: ${fmtOverviewVND(p.rev)} (${p.matches} ca) | Tuần trước: ${fmtOverviewVND(prevRev)}`);
    return `
      <g class="ov-chart-pt cursor-pointer" data-tip="${tipData}" data-px="${p.x}" data-py="${p.y}">
        <circle cx="${p.x}" cy="${p.y}" r="12" fill="transparent"/>
        <circle cx="${p.x}" cy="${p.y}" r="${isToday ? 5.5 : 4}" fill="${isToday ? '#15803D' : '#16A34A'}" stroke="#ffffff" stroke-width="2"/>
      </g>
    `;
  }).join('');

  svgEl.innerHTML = `
    <defs>
      <linearGradient id="ovChartGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#16A34A" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="#16A34A" stop-opacity="0.0"/>
      </linearGradient>
    </defs>
    ${yTicks}
    ${prevLine ? `<path d="${prevLine}" fill="none" stroke="#94A3B8" stroke-width="2" stroke-dasharray="5 4" stroke-linecap="round"/>` : ''}
    <path d="${curArea}" fill="url(#ovChartGrad)"/>
    <path d="${curLine}" fill="none" stroke="#16A34A" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
    ${pointsHtml}
  `;

  // Interactive tooltip
  const tipEl = document.getElementById('overview-chart-tooltip');
  if (tipEl) {
    svgEl.querySelectorAll('.ov-chart-pt').forEach(g => {
      g.addEventListener('mouseenter', () => {
        const txt = g.getAttribute('data-tip') || '';
        const px = Number(g.getAttribute('data-px') || 0);
        const py = Number(g.getAttribute('data-py') || 0);
        tipEl.textContent = txt;
        tipEl.classList.remove('hidden');
        const leftPct = Math.min(82, Math.max(8, (px / 680) * 100));
        const topPct = Math.max(2, (py / 210) * 100 - 18);
        tipEl.style.left = leftPct + '%';
        tipEl.style.top = topPct + '%';
        tipEl.style.transform = 'translateX(-50%)';
      });
      g.addEventListener('mouseleave', () => tipEl.classList.add('hidden'));
    });
  }

  if (labelsEl) {
    labelsEl.innerHTML = series.map((item, idx) => {
      const isLast = idx === series.length - 1;
      const lbl = escapeSearchHTML(item?.label || item?.date || '');
      return isLast ? `<span class="font-bold text-[#16A34A]">${lbl}</span>` : `<span>${lbl}</span>`;
    }).join('');
  }
}
window.renderOverviewWeeklyChart = renderOverviewWeeklyChart;

function renderOverviewPitchShares(byPitch) {
  const container = document.getElementById('overview-pitch-shares');
  if (!container) return;
  const list = Array.isArray(byPitch) ? [...byPitch] : [];
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

  container.innerHTML = sorted.map((p, idx) => {
    const rev = Number(p.revenue || 0);
    const pct = totalRev > 0 ? Math.round((rev / totalRev) * 100) : 0;
    return `
      <div>
        <div class="flex justify-between gap-2 ${idx > 0 ? 'pt-1' : ''}">
          <span class="truncate" title="${escapeSearchHTML(p.name)}">${escapeSearchHTML(p.name)} <span class="text-slate-400">(${Number(p.matches || 0)} ca)</span></span>
          <b class="${idx === 0 ? 'text-[#16A34A]' : 'text-[#0F172A]'} shrink-0">${pct}% · ${fmtOverviewVND(rev)}</b>
        </div>
        <div class="w-full h-2 rounded bg-slate-100 mt-1 overflow-hidden">
          <div style="width:${Math.max(0, Math.min(100, pct))}%" class="h-full rounded ${idx === 0 ? 'bg-[#16A34A]' : 'bg-[#0F172A]'}"></div>
        </div>
      </div>
    `;
  }).join('') + (maintList.length > 0 ? `<div class="text-[11px] text-[#64748B] mt-3 pt-3 border-t border-[#E2E8F0]">* Đang bảo trì: ${escapeSearchHTML(maintList.map(m => m.name).join(', '))}</div>` : '');
}
window.renderOverviewPitchShares = renderOverviewPitchShares;

function renderMiniTimeline(miniTimeline) {
  const body = document.getElementById('ov-mini-timeline-body');
  if (!body) return;
  const rows = Array.isArray(miniTimeline) ? miniTimeline : [];
  if (rows.length === 0) {
    body.innerHTML = '<div class="py-5 text-center text-xs text-[#94A3B8]">Hôm nay chưa có lịch thi đấu trên sân nào.</div>';
    return;
  }

  const startDay = 330;  // 05:30
  const endDay = 1350;   // 22:30
  const span = endDay - startDay;
  const now = new Date();
  const curMin = now.getHours() * 60 + now.getMinutes();
  const showNowLine = curMin >= startDay && curMin <= endDay;
  const nowPct = showNowLine ? (((curMin - startDay) / span) * 100).toFixed(2) : 0;
  const nowLabel = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const hourMarks = [6, 9, 12, 15, 18, 21].map(h => {
    const pct = (((h * 60 - startDay) / span) * 100).toFixed(2);
    return `<span style="left:${pct}%" class="absolute -translate-x-1/2 text-[10px] text-[#64748B] font-mono">${String(h).padStart(2, '0')}:00</span>`;
  }).join('');

  const rowsHtml = rows.map(r => {
    const blocks = (r.bookings || []).map(b => {
      const s = Math.max(startDay, Math.min(endDay, Number(b.startMin || startDay)));
      const e = Math.max(s + 30, Math.min(endDay, Number(b.endMin || s + 120)));
      const leftPct = (((s - startDay) / span) * 100).toFixed(2);
      const widthPct = Math.max(3, ((e - s) / span) * 100).toFixed(2);
      const st = normalizeOverviewStatus(b.status);
      const cls = st === 'Đang đá' ? 'bg-[#16A34A] text-white' : (st === 'Hoàn thành' ? 'bg-slate-400 text-white' : 'bg-sky-500 text-white');
      return `<button type="button" data-code="${escapeSearchHTML(b.code)}" onclick="openInPlayModal(this.getAttribute('data-code'))" style="left:${leftPct}%;width:${widthPct}%" title="#${escapeSearchHTML(b.code)} · ${escapeSearchHTML(b.slotTime)} · ${escapeSearchHTML(formatTitleCaseVN(b.customerName))} (${escapeSearchHTML(st)})" class="absolute top-1 bottom-1 rounded px-1.5 text-[10px] font-bold truncate cursor-pointer hover:opacity-90 ${cls}">${escapeSearchHTML(formatTitleCaseVN(b.customerName))}</button>`;
    }).join('');

    return `
      <div class="flex items-center gap-2 py-1 border-b border-slate-100 last:border-b-0">
        <div class="w-36 sm:w-44 shrink-0 text-[11px] font-bold text-[#0F172A] truncate" title="${escapeSearchHTML(r.pitchName)}">${escapeSearchHTML(r.pitchName)}</div>
        <div class="relative flex-1 h-7 bg-slate-50 rounded-lg border border-slate-200/70 overflow-hidden">
          ${blocks}
          ${showNowLine ? `<div style="left:${nowPct}%" class="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10 pointer-events-none"></div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  body.innerHTML = `
    <div class="min-w-[540px]">
      <div class="flex items-center gap-2 pb-4 mb-1">
        <div class="w-36 sm:w-44 shrink-0 text-[10px] font-bold text-[#64748B] uppercase">Sân bóng</div>
        <div class="relative flex-1 h-4">
          ${hourMarks}
          ${showNowLine ? `<span style="left:${nowPct}%" class="absolute -translate-x-1/2 top-0 px-1 rounded bg-rose-500 text-white text-[9px] font-bold">${nowLabel}</span>` : ''}
        </div>
      </div>
      ${rowsHtml}
    </div>
  `;
}

function updateBatchBar() {
  const bar = document.getElementById('ov-batch-bar');
  const cntEl = document.getElementById('ov-batch-count');
  const cnt = overviewSelectedCodes.size;
  if (cntEl) cntEl.textContent = String(cnt);
  if (bar) bar.classList.toggle('hidden', cnt === 0);
}

window.toggleOverviewRowSelect = function(code, checked) {
  if (!code) return;
  if (checked) overviewSelectedCodes.add(code);
  else overviewSelectedCodes.delete(code);
  updateBatchBar();
};

window.toggleSelectAllOverview = function(checked) {
  document.querySelectorAll('.ov-row-checkbox').forEach(cb => {
    cb.checked = checked;
    const code = cb.getAttribute('data-code');
    if (code) {
      if (checked) overviewSelectedCodes.add(code);
      else overviewSelectedCodes.delete(code);
    }
  });
  updateBatchBar();
};

window.clearOverviewSelection = function() {
  overviewSelectedCodes.clear();
  const selAll = document.getElementById('ov-select-all');
  if (selAll) selAll.checked = false;
  document.querySelectorAll('.ov-row-checkbox').forEach(cb => { cb.checked = false; });
  updateBatchBar();
};

window.runOverviewBatchOp = async function(op) {
  const codes = Array.from(overviewSelectedCodes);
  if (codes.length === 0) return;
  const labels = {
    complete: 'Hoàn tất & Thu đủ',
    collect_full: 'Xác nhận Thu đủ',
    noshow_release: 'Hủy No-show & Nhả sân'
  };
  const ok = typeof showAdminConfirm === 'function'
    ? await showAdminConfirm({
        title: `Xử lý hàng loạt (${codes.length} ca)`,
        message: `Thực hiện "${labels[op] || op}" cho ${codes.length} ca đã chọn? Thao tác sẽ được ghi vào Nhật ký Admin.`,
        confirmText: labels[op] || 'Xác nhận',
        cancelText: 'Hủy',
        danger: op === 'noshow_release'
      })
    : confirm(`Thực hiện "${labels[op] || op}" cho ${codes.length} ca đã chọn?`);
  if (!ok) return;

  const r = await adminFetchJson('../api/bookings.php?action=batch_ops', {
    method: 'POST',
    body: JSON.stringify({ op, codes })
  });
  if (!r.ok) {
    window.SanBongApp?.showToast?.(r.message || 'Lỗi xử lý hàng loạt.', 'error');
    return;
  }
  clearOverviewSelection();
  window.SanBongApp?.showToast?.(r.message || `Đã xử lý ${codes.length} ca thành công!`, 'success');
  overviewLastHash = '';
  await renderOverviewKPIs(true);
};

function closeAllOverviewRowMenus() {
  document.querySelectorAll('.ov-row-menu').forEach(m => {
    m.classList.add('hidden');
    m.style.top = '';
    m.style.bottom = '';
  });
  document.querySelectorAll('.ov-booking-row').forEach(r => r.classList.remove('z-40'));
}
window.closeAllOverviewRowMenus = closeAllOverviewRowMenus;

window.toggleOverviewRowMenu = function(e, menuId) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const el = document.getElementById(menuId);
  const wasHidden = !el || el.classList.contains('hidden');
  closeAllOverviewRowMenus();
  if (!el || !wasHidden) return;
  el.classList.remove('hidden');
  const row = el.closest('.ov-booking-row');
  if (row) row.classList.add('z-40');
  try {
    const rect = el.getBoundingClientRect();
    if (rect.bottom > window.innerHeight - 16) {
      el.style.top = 'auto';
      el.style.bottom = '2.5rem';
    }
  } catch (err) {}
};

document.addEventListener('click', (e) => {
  if (!e.target.closest('.ov-row-menu') && !e.target.closest('.ov-row-menu-btn')) {
    closeAllOverviewRowMenus();
  }
});

function getOverviewPaymentLabelHtml(b, st) {
  const paySt = String(b.paymentStatus || b.payment_status || '').trim();
  const payLower = paySt.toLowerCase();
  const totalAmt = Number(b.totalPrice ?? b.total_price ?? 0);
  const paidAmt = Number(b.paidAmount ?? b.paid_amount ?? 0);
  const rawRem = Number(b.remainingAmount ?? b.remaining_amount ?? 0);

  const isCancelGroup = (
    st === 'Đã hủy'
    || st === 'Khách chưa đến'
    || payLower.includes('hủy')
    || payLower.includes('hoàn')
    || payLower.includes('tịch thu')
    || payLower.includes('phạt 50%')
    || payLower.includes('bảo lưu')
  );

  if (isCancelGroup) {
    if (payLower.includes('tịch thu') || (st === 'Khách chưa đến' && !payLower.includes('hoàn') && !payLower.includes('phạt') && !payLower.includes('bảo lưu') && paySt !== 'Đã hủy')) {
      return '<span class="text-rose-600 font-bold">Tịch thu cọc 30%</span>';
    }
    if (payLower.includes('phạt 50%')) {
      return '<span class="text-rose-600 font-bold">Phạt 50% cọc</span>';
    }
    if (payLower.includes('bảo lưu')) {
      return '<span class="text-amber-700 font-bold">Bảo lưu cọc</span>';
    }
    if (payLower.includes('hoàn')) {
      return '<span class="text-slate-500 font-semibold">Đã hoàn cọc</span>';
    }
    return '<span class="text-slate-500 font-semibold">Đã hủy đơn</span>';
  }

  const isHoldOrPendingGroup = (
    st === 'Giữ chỗ'
    || st === 'Chờ duyệt cọc'
    || payLower.includes('chờ duyệt cọc')
    || payLower.includes('chờ cọc')
    || payLower.includes('chưa cọc')
  );

  if (isHoldOrPendingGroup) {
    const unpaidAmt = rawRem > 0 ? rawRem : Math.max(0, totalAmt - paidAmt);
    if (unpaidAmt > 0) {
      return `<span class="text-amber-700 font-bold">Còn thu: ${fmtOverviewVND(unpaidAmt)}</span>`;
    }
    return `<span class="text-amber-700 font-bold">${escapeSearchHTML(paySt || 'Chờ duyệt cọc')}</span>`;
  }

  if (rawRem > 0) {
    return `<span class="text-amber-700 font-bold">Còn thu: ${fmtOverviewVND(rawRem)}</span>`;
  }

  if (payLower.includes('chưa thanh toán') || payLower.includes('còn thiếu') || (payLower.includes('đã cọc') && totalAmt > paidAmt)) {
    const unpaidAmt = Math.max(0, totalAmt - paidAmt);
    if (unpaidAmt > 0) {
      return `<span class="text-amber-700 font-bold">Còn thu: ${fmtOverviewVND(unpaidAmt)}</span>`;
    }
    return `<span class="text-amber-700 font-bold">${escapeSearchHTML(paySt || 'Chưa thu đủ')}</span>`;
  }

  return '<span class="text-[#16A34A] font-semibold">Đã thu đủ</span>';
}

function renderOverviewBookingRow(b, isOverdue) {
  const rawCode = String(b.code || '');
  const code = escapeSearchHTML(rawCode);
  const st = normalizeOverviewStatus(b.status);
  const custName = escapeSearchHTML(formatTitleCaseVN(b.customerName));
  const phone = escapeSearchHTML(formatPhoneVN(b.phone));
  const pitch = escapeSearchHTML(b.pitchName || b.pitchId || '');
  const slot = escapeSearchHTML(b.slotTime || '');
  const dateStr = escapeSearchHTML(b.date || '');
  const checked = overviewSelectedCodes.has(rawCode) ? 'checked' : '';
  const safeIdSuffix = rawCode.replace(/[^a-zA-Z0-9_-]/g, '_') || 'row';
  const menuId = `ov-menu-${isOverdue ? 'od' : 'td'}-${safeIdSuffix}`;

  const statusPill = st === 'Đang đá'
    ? '<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] whitespace-nowrap">Đang đá</span>'
    : (st === 'Đã đá - chưa tất toán'
      ? '<span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[10px] whitespace-nowrap">Đã đá - chưa tất toán</span>'
      : (st === 'Hoàn thành'
        ? '<span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] whitespace-nowrap">Hoàn thành</span>'
        : (st === 'Khách chưa đến' || st === 'Đã hủy'
          ? `<span class="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px] whitespace-nowrap">${escapeSearchHTML(st)}</span>`
          : (st === 'Giữ chỗ'
            ? '<span class="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[10px] whitespace-nowrap">Giữ chỗ (chờ cọc)</span>'
            : (st === 'Chờ duyệt cọc'
              ? '<span class="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[10px] whitespace-nowrap">Chờ duyệt cọc</span>'
              : '<span class="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold text-[10px] whitespace-nowrap">Chờ Check-in</span>')))));

  // Mỗi dòng chỉ 1 nút chính theo trạng thái, còn lại vào menu "⋯"; không có nút bị disable
  let primaryBtn = '';
  let menuItems = [];

  if (st === 'Đã xác nhận' || st === 'Chờ duyệt cọc' || st === 'Giữ chỗ') {
    if (!isOverdue) {
      primaryBtn = `<button type="button" data-code="${code}" onclick="handleCheckIn(this.getAttribute('data-code'))" class="h-8 px-3 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs whitespace-nowrap cursor-pointer">Check-in</button>`;
      menuItems.push(`<button type="button" data-code="${code}" onclick="closeAllOverviewRowMenus(); openInPlayModal(this.getAttribute('data-code'))" class="w-full text-left px-3 py-2 hover:bg-slate-50 font-semibold text-[#0F172A] cursor-pointer">Điều hành &amp; Thanh toán</button>`);
      menuItems.push(`<button type="button" data-code="${code}" onclick="closeAllOverviewRowMenus(); handleNoShowRelease(this.getAttribute('data-code'))" class="w-full text-left px-3 py-2 hover:bg-rose-50 font-semibold text-rose-600 cursor-pointer">Hủy no-show (nhả sân)</button>`);
    } else {
      primaryBtn = `<button type="button" data-code="${code}" onclick="openInPlayModal(this.getAttribute('data-code'))" class="h-8 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs whitespace-nowrap cursor-pointer">Xử lý tồn đọng</button>`;
    }
  } else if (st === 'Đang đá' || st === 'Đã đá - chưa tất toán') {
    primaryBtn = `<button type="button" data-code="${code}" onclick="openInPlayModal(this.getAttribute('data-code'))" class="h-8 px-3 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs whitespace-nowrap cursor-pointer">Thu tiền &amp; Kết thúc</button>`;
  } else if (st === 'Hoàn thành') {
    primaryBtn = `<button type="button" data-code="${code}" onclick="openInPlayModal(this.getAttribute('data-code'))" class="h-8 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-[#334155] font-semibold text-xs whitespace-nowrap cursor-pointer">Xem hóa đơn</button>`;
  } else {
    primaryBtn = `<button type="button" data-code="${code}" onclick="openInPlayModal(this.getAttribute('data-code'))" class="h-8 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-[#334155] font-semibold text-xs whitespace-nowrap cursor-pointer">Chi tiết</button>`;
  }

  const menuHtml = menuItems.length > 0 ? `
    <div class="relative">
      <button type="button" data-menu-id="${escapeSearchHTML(menuId)}" onclick="toggleOverviewRowMenu(event, this.getAttribute('data-menu-id'))" class="ov-row-menu-btn w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-[#475569] font-extrabold text-sm flex items-center justify-center cursor-pointer" aria-label="Thao tác khác">⋯</button>
      <div id="${escapeSearchHTML(menuId)}" class="ov-row-menu hidden absolute right-0 top-9 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 text-xs">
        ${menuItems.join('')}
      </div>
    </div>
  ` : '';

  const paymentMetaHtml = getOverviewPaymentLabelHtml(b, st);

  return `
    <div class="ov-booking-row relative p-3 rounded-xl border ${isOverdue ? 'border-amber-200 bg-amber-50/30' : 'border-[#E2E8F0] bg-white'} hover:border-slate-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="flex items-start sm:items-center gap-2.5 min-w-0">
        <input type="checkbox" data-code="${code}" ${checked} onchange="toggleOverviewRowSelect(this.getAttribute('data-code'), this.checked)" class="ov-row-checkbox mt-1 sm:mt-0 w-4 h-4 rounded accent-[#16A34A] shrink-0 cursor-pointer" aria-label="Chọn ca #${code}">
        <div class="min-w-0 space-y-0.5">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-mono font-bold text-[#0F172A]">#${code}</span>
            ${statusPill}
            <span class="font-bold text-[#0F172A] truncate">${pitch}</span>
            <span class="text-[#64748B] font-semibold">${isOverdue ? `${dateStr} · ` : ''}${slot}</span>
          </div>
          <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[#475569]">
            <span class="font-semibold text-[#0F172A]">${custName}</span>
            <span class="font-mono">${phone}</span>
            <span>Tổng: <b class="text-[#0F172A]">${fmtOverviewVND(b.totalPrice)}</b></span>
            ${paymentMetaHtml}
          </div>
        </div>
      </div>
      <div class="flex items-center justify-end gap-1.5 shrink-0">
        ${primaryBtn}
        ${menuHtml}
      </div>
    </div>
  `;
}
window.renderOverviewBookingRow = renderOverviewBookingRow;

function buildBookingRowHTML(b, isOverdue) {
  return renderOverviewBookingRow(b, isOverdue);
}

function renderOverviewLists() {
  const data = overviewSummaryCache;
  if (!data) return;

  const todayAll = Array.isArray(data.todayBookings) ? data.todayBookings : [];
  const overdueAll = Array.isArray(data.overdueBookings) ? data.overdueBookings : [];

  // Cập nhật số đếm tab lọc khớp danh sách hôm nay đang hiển thị
  const counts = {
    all: todayAll.length,
    playing: todayAll.filter(b => matchesOverviewFilter(b, 'playing')).length,
    confirmed: todayAll.filter(b => matchesOverviewFilter(b, 'confirmed')).length,
    completed: todayAll.filter(b => matchesOverviewFilter(b, 'completed')).length,
    noshow: todayAll.filter(b => matchesOverviewFilter(b, 'noshow')).length
  };
  Object.keys(counts).forEach(k => {
    const el = document.getElementById('ov-cnt-' + k);
    if (el) el.textContent = `(${counts[k]})`;
  });

  // Lọc danh sách hôm nay + phân trang
  const filteredToday = todayAll.filter(b => matchesOverviewFilter(b, currentOverviewFilter));
  const totalPages = Math.max(1, Math.ceil(filteredToday.length / OVERVIEW_PAGE_SIZE));
  if (currentOverviewPage > totalPages) currentOverviewPage = totalPages;
  if (currentOverviewPage < 1) currentOverviewPage = 1;

  const startIdx = (currentOverviewPage - 1) * OVERVIEW_PAGE_SIZE;
  const pageItems = filteredToday.slice(startIdx, startIdx + OVERVIEW_PAGE_SIZE);

  const container = document.getElementById('overview-today-bookings');
  if (container) {
    if (pageItems.length === 0) {
      container.innerHTML = '<div class="py-6 text-center text-[#94A3B8]">Không có ca thi đấu hôm nay trong nhóm lọc này.</div>';
    } else {
      container.innerHTML = pageItems.map(b => buildBookingRowHTML(b, false)).join('');
    }
  }

  const pagEl = document.getElementById('ov-pagination');
  if (pagEl) {
    if (filteredToday.length > OVERVIEW_PAGE_SIZE) {
      pagEl.classList.remove('hidden');
      const infoEl = document.getElementById('ov-page-info');
      const numEl = document.getElementById('ov-page-num');
      const prevBtn = document.getElementById('ov-prev-page');
      const nextBtn = document.getElementById('ov-next-page');
      if (infoEl) infoEl.textContent = `Hiển thị ${startIdx + 1} - ${startIdx + pageItems.length} / ${filteredToday.length} ca`;
      if (numEl) numEl.textContent = `${currentOverviewPage} / ${totalPages}`;
      if (prevBtn) prevBtn.disabled = currentOverviewPage <= 1;
      if (nextBtn) nextBtn.disabled = currentOverviewPage >= totalPages;
    } else {
      pagEl.classList.add('hidden');
    }
  }

  // Khối Ca tồn đọng (áp dụng cùng bộ lọc, thu gọn thanh cảnh báo)
  const filteredOverdue = overdueAll.filter(b => matchesOverviewFilter(b, currentOverviewFilter));
  const overdueSec = document.getElementById('ov-overdue-section');
  const overdueTxt = document.getElementById('ov-overdue-banner-text');
  const overdueListEl = document.getElementById('ov-overdue-bookings');

  if (overdueSec) {
    if (overdueAll.length === 0) {
      overdueSec.classList.add('hidden');
    } else {
      overdueSec.classList.remove('hidden');
      if (overdueTxt) {
        overdueTxt.textContent = filteredOverdue.length === overdueAll.length
          ? `${overdueAll.length} ca tồn đọng từ ngày trước chưa xử lý`
          : `${filteredOverdue.length} / ${overdueAll.length} ca tồn đọng (đang lọc)`;
      }
      if (overdueListEl) {
        overdueListEl.innerHTML = filteredOverdue.length === 0
          ? '<div class="py-3 text-center text-[#94A3B8]">Không có ca tồn đọng nào khớp bộ lọc hiện tại.</div>'
          : filteredOverdue.map(b => buildBookingRowHTML(b, true)).join('');
      }
    }
  }
}

window.changeOverviewPage = function(delta) {
  currentOverviewPage += delta;
  renderOverviewLists();
};

window.filterOverviewBookings = function(filterType) {
  currentOverviewFilter = filterType || 'all';
  currentOverviewPage = 1;
  ['all', 'playing', 'confirmed', 'completed', 'noshow'].forEach(f => {
    const btn = document.getElementById('ov-filter-' + f);
    if (btn) {
      btn.className = f === currentOverviewFilter
        ? 'px-3 py-1.5 rounded-lg text-xs font-bold bg-[#16A34A] text-white cursor-pointer'
        : 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer';
    }
  });
  renderOverviewLists();
};

function applyOverviewSummary(data) {
  overviewSummaryCache = data;
  window.overviewSummaryCache = data;
  const kpi = data.kpi || {};
  const setTxt = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };

  if (isManagerOrAdmin() && kpi.recognizedRevenue !== null) {
    setTxt('kpi-revenue-value', fmtOverviewVND(kpi.recognizedRevenue));
    setTxt('kpi-rev-collected', fmtOverviewVND(kpi.collectedRevenue));
    setTxt('kpi-rev-split', `${fmtOverviewVND(kpi.depositCollected)} / ${fmtOverviewVND(kpi.remainingCollected)}`);
    setTxt('kpi-rev-uncollected', fmtOverviewVND(kpi.uncollectedRevenue));
    renderOverviewWeeklyChart(data.weeklySeries || [], data.prevWeeklySeries || []);
    renderOverviewPitchShares(data.byPitch || []);
  }

  setTxt('kpi-bookings-count', `${Number(kpi.todayCount || 0)} lượt`);
  const pendEl = document.getElementById('kpi-bookings-pending');
  if (pendEl) {
    const pCnt = Number(kpi.pendingVietqrCount || 0);
    pendEl.textContent = isManagerOrAdmin()
      ? (pCnt > 0 ? `${pCnt} đơn chờ duyệt cọc VietQR` : '✓ Đã duyệt hết cọc VietQR')
      : `${Number(kpi.waitingCheckinCount || 0)} ca chờ check-in`;
  }

  const peakPct = Number(kpi.peakOccupancyPct || 0);
  setTxt('kpi-occupancy-value', `${peakPct}%`);
  const bar = document.getElementById('kpi-occupancy-bar');
  if (bar) bar.style.width = `${Math.min(100, peakPct)}%`;
  setTxt('kpi-occupancy-formula', kpi.peakFormula || 'Ca cao điểm / (Sân hoạt động × khung 17:30–21:00)');

  setTxt('kpi-pitches-ready', `${Number(kpi.activePitches || 0)}/${Number(kpi.totalPitches || 0)} Sân sẵn sàng`);
  setTxt('kpi-pitches-sub', `${Number(kpi.playingCount || 0)} đang đá · ${Number(kpi.maintPitches || 0)} bảo trì`);

  renderMiniTimeline(data.miniTimeline || []);
  renderOverviewLists();
}

async function renderOverviewKPIs(force) {
  if (overviewFetchInFlight && !force) return;
  overviewFetchInFlight = true;
  try {
    const res = await adminFetchJson('../api/dashboard_summary.php');
    if (!res.ok || !res.data) return;

    // Chỉ cập nhật DOM khi dữ liệu thực sự thay đổi (hoặc khi force)
    const newHash = String(res.data.hash || '');
    if (!force && newHash && newHash === overviewLastHash) {
      return;
    }
    overviewLastHash = newHash;

    // Đồng bộ nguồn dữ liệu server live sang Timeline & In-Play (không đọc/ghi localStorage sb_bookings_v1)
    const todayISO = res.data.today || getLocalTodayISO();
    const liveToday = Array.isArray(res.data.todayBookings) ? res.data.todayBookings : [];
    const liveOverdue = Array.isArray(res.data.overdueBookings) ? res.data.overdueBookings : [];
    if (window.timelineBookingsByDateCache) {
      window.timelineBookingsByDateCache[todayISO] = [...liveToday];
    }
    if (typeof window.syncLiveBookingsCache === 'function') {
      window.syncLiveBookingsCache([...liveToday, ...liveOverdue]);
    }

    applyOverviewSummary(res.data);
  } finally {
    overviewFetchInFlight = false;
  }
}
window.renderOverviewKPIs = renderOverviewKPIs;
window.renderOverviewTodayBookings = renderOverviewLists;

function startOverviewAutoRefresh() {
  if (overviewRefreshTimer) return;
  overviewRefreshTimer = setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    const ovTab = document.getElementById('tab-content-overview');
    if (ovTab && !ovTab.classList.contains('hidden')) {
      renderOverviewKPIs(false);
    }
  }, 30000);
}
startOverviewAutoRefresh();

function refreshAllAdminViews(codeOpt) {
  const isTabVisible = (id) => {
    const el = document.getElementById(`tab-content-${id}`);
    return Boolean(el && !el.classList.contains('hidden'));
  };

  overviewLastHash = '';
  if (isTabVisible('overview')) {
    renderOverviewKPIs(true);
  }
  if (isTabVisible('timeline') && typeof renderTimelineGantt === 'function') renderTimelineGantt(true);
  if (isTabVisible('pitches') && typeof renderAdminPitches === 'function') renderAdminPitches();
  if (isTabVisible('customers') && typeof renderAdminCustomers === 'function') renderAdminCustomers();
  if (isTabVisible('quick-booking') && typeof renderAdminInventory === 'function') renderAdminInventory();
  if (isTabVisible('shifts') && typeof loadShiftHandovers === 'function') loadShiftHandovers();
  if (isManagerOrAdmin()) {
    if (isTabVisible('payments') && typeof renderAdminPayments === 'function') renderAdminPayments();
    if (isTabVisible('payments') && typeof loadBankTransactions === 'function') loadBankTransactions();
    if (isTabVisible('reports') && typeof renderAdminReports === 'function') renderAdminReports();
  }
  if ((isTabVisible('overview') || Boolean(codeOpt || window.activeInPlayCode)) && typeof populateInPlayWorkspace === 'function') {
    populateInPlayWorkspace(codeOpt || window.activeInPlayCode);
  }
}
window.refreshAllAdminViews = refreshAllAdminViews;

async function handleCheckIn(code) {
  if (!code) return;
  const r = await adminFetchJson('../api/bookings.php?action=checkin&code=' + encodeURIComponent(code), {
    method: 'POST',
    body: JSON.stringify({ code })
  });
  if (!r.ok) {
    window.SanBongApp?.showToast?.(r.message || 'Không thể check-in lúc này!', 'error');
    return;
  }
  refreshAllAdminViews(code);
  window.SanBongApp?.showToast?.(r.message || `Check-in thành công ca #${code}!`, 'success');
}
window.handleCheckIn = window.handleCheckin = handleCheckIn;

async function handleNoShowRelease(code) {
  if (!code) return;
  const confirmed = typeof showAdminConfirm === 'function'
    ? await showAdminConfirm({
        title: 'Xác nhận Chưa Đến & Nhả Sân',
        message: `Khách ca #${code} quá 15 phút chưa đến. Tịch thu cọc 30% và nhả sân trống ngay?`,
        confirmText: 'Nhả sân & Tịch thu cọc',
        cancelText: 'Hủy',
        danger: true
      })
    : confirm(`Tịch thu cọc 30% và nhả sân đơn #${code}?`);
  if (!confirmed) return;

  const r = await adminFetchJson('../api/bookings.php?action=noshow_release&code=' + encodeURIComponent(code), {
    method: 'POST',
    body: JSON.stringify({ code })
  });
  if (!r.ok) {
    window.SanBongApp?.showToast?.(r.message || 'Không thể nhả sân lúc này!', 'error');
    return;
  }
  refreshAllAdminViews(code);
  window.SanBongApp?.showToast?.(r.message || `Đã nhả sân trống đơn #${code}!`, 'warning');
}
window.handleShowRelease = window.handleNoShowRelease = handleNoShowRelease;

;
/* === admin_pitches.js === */
let currentPitchFilter = 'all';
window.currentPitchFilter = currentPitchFilter;
let maintenanceSchedulesCache = [];
window.maintenanceSchedulesCache = maintenanceSchedulesCache;

async function toggleMaintenance(pitchId) {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;
  const pitch = db.getPitchById(pitchId);
  if (!pitch) return;

  const newStatus = pitch.status === 'Bảo trì' ? 'Hoạt động' : 'Bảo trì';
  let reason = '';
  if (newStatus === 'Bảo trì') {
    const inputReason = await adminPrompt(
      'Bật bảo trì sân bóng',
      `Nhập lý do bảo trì cho sân ${pitch.name} (ví dụ: Thay dàn đèn LED, bảo dưỡng mặt cỏ...):`,
      'Bảo dưỡng định kỳ',
      'Nhập lý do bảo trì...'
    );
    if (inputReason === null) return;
    reason = inputReason.trim() || 'Bảo dưỡng định kỳ';
  }

  const r = await adminFetchJson('../api/admin.php?action=toggle_pitch', {
    method: 'POST',
    body: JSON.stringify({ pitchId: pitchId, status: newStatus, reason: reason })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể cập nhật trạng thái bảo trì sân!', 'error', 4000);
    return;
  }

  db.updatePitchStatus(pitchId, newStatus);
  renderAdminPitches();
  renderTimelineGantt();
  initQuickBookingForm();
  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(
      newStatus === 'Bảo trì'
        ? `Đã chuyển sân ${pitch.name} sang bảo trì! (Lý do: ${reason})`
        : `Đã mở lại sân ${pitch.name} hoạt động bình thường!`,
      'info',
      3000
    );
  }
}
window.toggleMaintenance = toggleMaintenance;

async function toggleHidePitch(pitchId) {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền ẩn/hiện sân bóng!', 'error');
    return;
  }
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;
  const pitch = db.getPitchById(pitchId);
  if (!pitch) return;

  const newStatus = pitch.status === 'Ẩn' ? 'Hoạt động' : 'Ẩn';
  const r = await adminFetchJson('../api/admin.php?action=toggle_pitch', {
    method: 'POST',
    body: JSON.stringify({ pitchId: pitchId, status: newStatus })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể cập nhật trạng thái hiển thị sân!', 'error', 4000);
    return;
  }

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
    const fixedPrice = Number(pitch.basePrice || 350000);
    if (baseEl) baseEl.value = fixedPrice;
    if (peakEl) peakEl.value = fixedPrice;
    if (wkndEl) wkndEl.value = fixedPrice;
    if (statusEl) statusEl.value = pitch.status || 'Hoạt động';
  } else {
    const nextIdx = db ? db.getPitches().length + 1 : 9;
    if (titleEl) titleEl.textContent = '➕ Thêm sân bóng mới vào hệ thống';
    if (idEl) { idEl.value = `P5-${String.fromCharCode(64 + nextIdx)}`; idEl.readOnly = false; idEl.classList.remove('bg-slate-100'); }
    if (nameEl) nameEl.value = '';
    if (typeEl) typeEl.value = '5';
    if (sizeEl) sizeEl.value = '20m x 40m';
    if (grassEl) grassEl.value = 'Cỏ nhân tạo FIFA Quality Pro 50mm';
    if (baseEl) baseEl.value = 350000;
    if (peakEl) peakEl.value = 350000;
    if (wkndEl) wkndEl.value = 350000;
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
  const defaultByType = type === 11 ? 900000 : (type === 7 ? 450000 : 350000);
  const basePrice = Math.max(50000, parseInt(document.getElementById('pitch-form-base-price')?.value || String(defaultByType), 10));
  const peakPrice = basePrice;
  const weekendPrice = basePrice;
  const status = document.getElementById('pitch-form-status')?.value || 'Hoạt động';

  if (!id || !name) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập đầy đủ Mã sân và Tên sân!', 'warning');
    return;
  }
  if (!/^[A-Z0-9][A-Z0-9\-_]{1,19}$/.test(id)) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Mã sân chỉ gồm chữ cái, số, dấu gạch ngang (-) hoặc gạch dưới (_)!', 'warning');
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
    status
  };

  const r = await adminFetchJson('../api/admin.php?action=manage_pitch', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể lưu thông tin sân!', 'error', 4000);
    return;
  }

  const db = window.SanBongApp?.SanBongDB;
  if (db && typeof db.upsertPitch === 'function') {
    db.upsertPitch(payload);
  }
  closePitchModal();
  renderAdminPitches();
  renderTimelineGantt();
  initQuickBookingForm();
  renderOverviewKPIs();
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast(`✓ Đã lưu thành công cấu hình sân ${name}!`, 'success', 3500);
}
window.savePitchForm = savePitchForm;

function renderMaintenanceAffectedBanner(affectedBookings) {
  const container = document.getElementById('maintenance-affected-banner');
  if (!container) return;
  if (!Array.isArray(affectedBookings) || affectedBookings.length === 0) {
    container.classList.add('hidden');
    container.innerHTML = '';
    return;
  }

  container.className = 'p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5';
  container.innerHTML = `
    <div class="font-bold flex items-center gap-2">
      <span>⚠️ Có ${affectedBookings.length} ca đặt sân bị ảnh hưởng bởi lịch bảo trì này:</span>
    </div>
    <div class="space-y-1 max-h-36 overflow-y-auto">
      ${affectedBookings.map(b => (
        `<div class="flex items-center justify-between text-[11px] bg-white/80 px-2.5 py-1 rounded border border-amber-100">
          <span class="font-mono font-bold">${escapeSearchHTML(b.code)} (${escapeSearchHTML(b.booking_date)} · ${escapeSearchHTML(b.slot_time)})</span>
          <span>${escapeSearchHTML(b.customer_name)} - ${escapeSearchHTML(b.phone)}</span>
          <button type="button" onclick="openInPlayModal('${escapeJsAttr(b.code)}')" class="text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer">Đổi sân ngay</button>
        </div>`
      )).join('')}
    </div>
  `;
}
window.renderMaintenanceAffectedBanner = renderMaintenanceAffectedBanner;

async function loadMaintenanceSchedules() {
  const tbody = document.getElementById('admin-maintenance-tbody') || document.getElementById('maintenance-schedules-tbody');
  if (!tbody) return;

  const r = await adminFetchJson('../api/admin.php?action=get_maintenance');
  if (!r.ok || !Array.isArray(r.data)) {
    tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-slate-400">Chưa có lịch bảo trì sân nào.</td></tr>';
    return;
  }

  maintenanceSchedulesCache = r.data;
  window.maintenanceSchedulesCache = maintenanceSchedulesCache;
  if (r.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-slate-400">Chưa có lịch bảo trì sân nào. Bấm "+ Lên lịch bảo trì" để tạo mới.</td></tr>';
    return;
  }

  const stMap = {
    scheduled: '<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">Đã lên lịch</span>',
    in_progress: '<span class="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[10px]">Đang bảo trì</span>',
    completed: '<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">Hoàn thành</span>',
    cancelled: '<span class="px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-bold text-[10px]">Đã hủy</span>'
  };

  tbody.innerHTML = r.data.map(m => {
    const mid = Number(m.id);
    const st = m.status || 'scheduled';
    const dateRange = m.start_date === m.end_date
      ? escapeSearchHTML(m.start_date || '')
      : `${escapeSearchHTML(m.start_date || '')} → ${escapeSearchHTML(m.end_date || '')}`;
    const timeRange = `${escapeSearchHTML(String(m.start_time || '').slice(0, 5))} - ${escapeSearchHTML(String(m.end_time || '').slice(0, 5))}`;

    let actions = '';
    if (isManagerOrAdmin()) {
      const btns = [];
      if (st === 'scheduled' || st === 'in_progress') {
        btns.push(`<button type="button" onclick="openMaintenanceModal(${mid})" class="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer">✏️ Sửa</button>`);
      }
      if (st === 'scheduled') {
        btns.push(`<button type="button" onclick="updateMaintenanceStatus(${mid}, 'in_progress')" class="px-2 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] cursor-pointer">▶ Bắt đầu</button>`);
      }
      if (st === 'scheduled' || st === 'in_progress') {
        btns.push(`<button type="button" onclick="updateMaintenanceStatus(${mid}, 'completed')" class="px-2 py-1 rounded bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-[11px] cursor-pointer">✓ Hoàn thành</button>`);
        btns.push(`<button type="button" onclick="updateMaintenanceStatus(${mid}, 'cancelled')" class="px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[11px] cursor-pointer">Hủy</button>`);
      }
      actions = btns.length > 0 ? `<div class="inline-flex flex-wrap items-center justify-end gap-1">${btns.join('')}</div>` : '<span class="text-[#94A3B8]">—</span>';
    } else {
      actions = '<span class="text-[#94A3B8]">—</span>';
    }

    return `<tr class="hover:bg-slate-50/70">
      <td class="py-3 px-4 font-mono font-bold text-[#0F172A]">#${mid}</td>
      <td class="py-3 px-4 font-bold text-[#0F172A]">${escapeSearchHTML(m.pitch_name || m.pitch_id || '')}</td>
      <td class="py-3 px-4 font-mono text-[#334155]">${dateRange}</td>
      <td class="py-3 px-4 font-semibold text-[#0F172A]">⏰ ${timeRange}</td>
      <td class="py-3 px-4 text-[#475569] max-w-[240px]">${escapeSearchHTML(m.reason || '')}</td>
      <td class="py-3 px-4">${stMap[st] || escapeSearchHTML(st)}</td>
      <td class="py-3 px-4 text-right">${actions}</td>
    </tr>`;
  }).join('');
}
window.loadMaintenanceSchedules = loadMaintenanceSchedules;

function openMaintenanceModal(maintId = null) {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền tạo/sửa lịch bảo trì!', 'error');
    return;
  }
  const modal = document.getElementById('maintenance-modal');
  if (!modal) return;

  const db = window.SanBongApp?.SanBongDB;
  const pitchSel = document.getElementById('maint-form-pitch');
  if (pitchSel && db) {
    pitchSel.innerHTML = db.getPitches().filter(p => p.status !== 'Ẩn').map(p => (
      `<option value="${escapeSearchHTML(p.id)}">${escapeSearchHTML(p.name)} (${escapeSearchHTML(p.typeName || p.type)})</option>`
    )).join('');
  }

  const item = maintId ? maintenanceSchedulesCache.find(x => Number(x.id) === Number(maintId)) : null;
  const todayISO = getLocalTodayISO();

  const titleEl = document.getElementById('maintenance-modal-title');
  const idEl = document.getElementById('maint-form-id');
  const statusEl = document.getElementById('maint-form-status');
  const startDateEl = document.getElementById('maint-form-start-date');
  const endDateEl = document.getElementById('maint-form-end-date');
  const startTimeEl = document.getElementById('maint-form-start-time');
  const endTimeEl = document.getElementById('maint-form-end-time');
  const reasonEl = document.getElementById('maint-form-reason');
  const notesEl = document.getElementById('maint-form-notes');

  if (item) {
    if (titleEl) titleEl.textContent = `✏️ Cập nhật lịch bảo trì #${item.id}`;
    if (idEl) idEl.value = String(item.id);
    if (pitchSel) pitchSel.value = item.pitch_id;
    if (statusEl) statusEl.value = item.status || 'scheduled';
    if (startDateEl) startDateEl.value = item.start_date || todayISO;
    if (endDateEl) endDateEl.value = item.end_date || item.start_date || todayISO;
    if (startTimeEl) startTimeEl.value = String(item.start_time || '08:00').slice(0, 5);
    if (endTimeEl) endTimeEl.value = String(item.end_time || '17:00').slice(0, 5);
    if (reasonEl) reasonEl.value = item.reason || '';
    if (notesEl) notesEl.value = item.notes || '';
  } else {
    if (titleEl) titleEl.textContent = '➕ Lên lịch bảo trì mặt cỏ / hệ thống';
    if (idEl) idEl.value = '';
    if (statusEl) statusEl.value = 'scheduled';
    if (startDateEl) startDateEl.value = todayISO;
    if (endDateEl) endDateEl.value = todayISO;
    if (startTimeEl) startTimeEl.value = '08:00';
    if (endTimeEl) endTimeEl.value = '17:00';
    if (reasonEl) reasonEl.value = '';
    if (notesEl) notesEl.value = '';
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}
window.openMaintenanceModal = openMaintenanceModal;

function closeMaintenanceModal() {
  const modal = document.getElementById('maintenance-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}
window.closeMaintenanceModal = closeMaintenanceModal;

async function saveMaintenanceForm(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!isManagerOrAdmin()) return;

  const id = document.getElementById('maint-form-id')?.value || '';
  const pitch_id = document.getElementById('maint-form-pitch')?.value || '';
  const status = document.getElementById('maint-form-status')?.value || 'scheduled';
  const start_date = document.getElementById('maint-form-start-date')?.value || '';
  const end_date = document.getElementById('maint-form-end-date')?.value || '';
  const start_time = document.getElementById('maint-form-start-time')?.value || '';
  const end_time = document.getElementById('maint-form-end-time')?.value || '';
  const reason = (document.getElementById('maint-form-reason')?.value || '').trim();
  const notes = (document.getElementById('maint-form-notes')?.value || '').trim();

  if (!pitch_id || !start_date || !end_date || !start_time || !end_time || !reason) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng điền đủ ngày, giờ, sân và lý do bảo trì!', 'warning');
    return;
  }

  const payload = {
    id: id ? Number(id) : null,
    pitch_id,
    status,
    start_date,
    end_date,
    start_time,
    end_time,
    reason,
    notes
  };

  const r = await adminFetchJson('../api/admin.php?action=save_maintenance', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể lưu lịch bảo trì!', 'error', 4000);
    return;
  }

  const affected = r.data?.affectedBookings || [];
  renderMaintenanceAffectedBanner(affected);
  closeMaintenanceModal();
  await loadMaintenanceSchedules();
  if (typeof refreshWalkinBookedSlots === 'function') await refreshWalkinBookedSlots();
  renderTimelineGantt();
  renderOverviewKPIs();
  if (window.SanBongApp?.showToast) {
    const affectedMsg = affected.length > 0 ? ` (Ảnh hưởng ${affected.length} ca đặt cần dời sân)` : '';
    window.SanBongApp.showToast((r.message || '✓ Đã lưu lịch bảo trì thành công!') + affectedMsg, 'success', 4000);
  }
}
window.saveMaintenanceForm = saveMaintenanceForm;

async function updateMaintenanceStatus(id, status) {
  if (!isManagerOrAdmin()) return;
  if (!['scheduled', 'in_progress', 'completed', 'cancelled'].includes(status)) return;

  if (status === 'cancelled' || status === 'completed') {
    const ok = await showAdminConfirm({
      title: status === 'cancelled' ? 'Hủy lịch bảo trì' : 'Hoàn tất bảo trì',
      message: status === 'cancelled'
        ? `Xác nhận hủy lịch bảo trì #${id}? Sân sẽ được mở lại lịch bình thường.`
        : `Xác nhận đã bảo trì xong cho lịch #${id}?`,
      confirmText: status === 'cancelled' ? 'Hủy lịch' : 'Hoàn thành',
      cancelText: 'Đóng',
      danger: status === 'cancelled'
    });
    if (!ok) return;
  }

  const r = await adminFetchJson('../api/admin.php?action=update_maintenance', {
    method: 'POST',
    body: JSON.stringify({ id: Number(id), status })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể cập nhật lịch bảo trì!', 'error', 4000);
    return;
  }
  const affected = r.data?.affectedBookings || [];
  renderMaintenanceAffectedBanner(affected);
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã cập nhật trạng thái bảo trì!', 'success', 3500);
  await loadMaintenanceSchedules();
  if (typeof refreshWalkinBookedSlots === 'function') await refreshWalkinBookedSlots();
  renderTimelineGantt();
}
window.updateMaintenanceStatus = updateMaintenanceStatus;

function filterAdminPitches(status) {
  currentPitchFilter = status || 'all';
  window.currentPitchFilter = currentPitchFilter;
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

    const safePitchAttr = escapeSearchHTML(p.id);
    const adminControls = isManagerOrAdmin() ? `
      <div class="px-4 pb-3 pt-2 flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60">
        <button type="button" data-pitch-id="${safePitchAttr}" onclick="openPitchModal(this.getAttribute('data-pitch-id'))" class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white hover:bg-emerald-50 text-[#0F172A] hover:text-[#16A34A] border border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer flex-1 text-center">
          ✏️ Sửa sân & Giá riêng
        </button>
        <button type="button" data-pitch-id="${safePitchAttr}" onclick="toggleHidePitch(this.getAttribute('data-pitch-id'))" class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold ${isHidden ? 'bg-sky-600 text-white hover:bg-sky-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'} transition-colors cursor-pointer">
          ${isHidden ? '👁️ Hiện sân' : '🙈 Ẩn sân'}
        </button>
      </div>
    ` : '';

    const maintControls = isManagerOrAdmin() ? `
          <div class="p-4 pt-2 flex items-center justify-between border-t border-[#F1F5F9]">
            <span class="text-xs font-semibold text-[#475569]">Bảo trì mặt cỏ:</span>
            <button type="button" data-pitch-id="${safePitchAttr}" onclick="toggleMaintenance(this.getAttribute('data-pitch-id'))" class="btn-sm ${isMaint ? 'btn-primary' : 'btn-danger-outline'} font-bold cursor-pointer">
              ${isMaint ? '✓ Mở hoạt động lại' : '⚠️ Bật bảo trì'}
            </button>
          </div>` : `
          <div class="p-4 pt-2 flex items-center justify-between border-t border-[#F1F5F9]">
            <span class="text-xs font-semibold text-[#475569]">Tình trạng:</span>
            <span class="text-xs font-bold ${isMaint ? 'text-amber-600' : (isHidden ? 'text-slate-500' : 'text-[#16A34A]')}">${isMaint ? 'Đang bảo trì' : (isHidden ? 'Đang ẩn' : 'Sẵn sàng')}</span>
          </div>`;

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
              <span class="text-xs font-bold text-[#16A34A]">${fmt(p.basePrice)}/ca 2h</span>
            </div>
            <div class="text-[11px] text-[#64748B]">${escapeSearchHTML(p.grass || '')} ${p.size ? '· ' + escapeSearchHTML(p.size) : ''}</div>
            <div class="p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-[#334155] leading-relaxed">
              ${Number(p.basePrice) === Number(p.peakPrice) && Number(p.basePrice) === Number(weekendP)
                ? `Đồng giá mọi khung giờ: <b class="text-[#16A34A]">${fmt(p.basePrice)}/ca 2h</b>`
                : `Thường: <b class="text-[#16A34A]">${fmt(p.basePrice)}</b> | Chiều tối: <b class="text-amber-700">${fmt(p.peakPrice)}</b> | Cuối tuần: <b class="text-purple-700">${fmt(weekendP)}</b>`}
            </div>
          </div>
        </div>

        <div>
          ${maintControls}
          ${adminControls}
        </div>
      </div>
    `;
  }).join('');
}
window.renderAdminPitches = renderAdminPitches;


;
/* === admin_payments.js === */
let cachedPendingDeposits = [];

async function renderAdminPayments() {
  if (!isManagerOrAdmin()) return;
  const tbody = document.getElementById('admin-payments-tbody');
  if (!tbody) return;

  let pendingList = [];
  let loadFailed = false;
  let loadErrorMsg = '';

  try {
    const r = await adminFetchJson('../api/admin.php?action=pending_deposits');
    if (r.ok && Array.isArray(r.data)) {
      pendingList = r.data.map(item => ({
        code: item.code,
        time: item.created_at_fmt || item.created_at || item.time || '',
        name: item.name || item.customer_name || item.customerName || 'Khách vãng lai',
        amt: Number(item.deposit_amount || item.amt || 0),
        bank: item.gateway || item.bank || 'VietQR',
        bankTxStatus: item.bank_tx_status || 'Chưa thấy tiền',
        txAmt: Number(item.transfer_amount || 0),
        paidAmt: Number(item.paid_amount || 0)
      }));
    } else if (!r.ok) {
      loadFailed = true;
      loadErrorMsg = r.message || 'Không thể tải danh sách biên lai chờ duyệt từ máy chủ.';
    }
  } catch (err) {
    loadFailed = true;
    loadErrorMsg = 'Không thể kết nối máy chủ để tải danh sách biên lai chờ duyệt.';
    console.warn('Cannot load pending_deposits from API:', err);
  }

  cachedPendingDeposits = pendingList;
  window.cachedPendingDeposits = pendingList;

  const count = pendingList.length;
  const badgeEl = document.getElementById('admin-payments-badge');
  const headerBadgeEl = document.getElementById('admin-payments-header-badge');
  if (badgeEl) {
    badgeEl.textContent = count;
    badgeEl.style.display = count > 0 ? 'inline-block' : 'none';
  }
  if (headerBadgeEl) {
    if (loadFailed) {
      headerBadgeEl.className = 'px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold';
      headerBadgeEl.textContent = 'Lỗi tải dữ liệu';
    } else if (count === 0) {
      headerBadgeEl.className = 'px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold';
      headerBadgeEl.textContent = '✓ Đã duyệt hết';
    } else {
      headerBadgeEl.className = 'px-3 py-1 rounded-full bg-[#FEF3C7] text-[#D97706] text-xs font-bold';
      headerBadgeEl.textContent = count + ' Đang chờ';
    }
  }

  if (loadFailed) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-10 text-center text-red-600 font-semibold">
          ${escapeSearchHTML(loadErrorMsg)}
        </td>
      </tr>
    `;
    return;
  }

  if (pendingList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-12 text-center text-[#64748B]">
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

  tbody.innerHTML = pendingList.map((item, idx) => {
    const safeCodeAttr = escapeSearchHTML(item.code || '');
    const txStatus = item.bankTxStatus || 'Chưa thấy tiền';
    let txBadgeHtml = '';
    let actionButtonsHtml = '';

    if (txStatus === 'Đã nhận đủ') {
      txBadgeHtml = `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">✓ Đã nhận đủ</span>`;
      actionButtonsHtml = `<button data-code="${safeCodeAttr}" onclick="approveDeposit(this.getAttribute('data-code'))" class="btn-sm btn-primary cursor-pointer font-bold">Duyệt cọc</button>`;
    } else if (txStatus === 'Nhận thiếu') {
      txBadgeHtml = `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">⚠️ Nhận thiếu (${window.SanBongApp.formatVND(item.txAmt || item.paidAmt)})</span>`;
      actionButtonsHtml = `<button data-code="${safeCodeAttr}" onclick="approveDepositWithNote(this.getAttribute('data-code'), 'Nhận thiếu')" class="btn-sm btn-primary cursor-pointer font-bold">Duyệt cọc</button>`;
    } else if (txStatus === 'Nhận thừa') {
      txBadgeHtml = `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">ℹ️ Nhận thừa (${window.SanBongApp.formatVND(item.txAmt || item.paidAmt)})</span>`;
      actionButtonsHtml = `<button data-code="${safeCodeAttr}" onclick="approveDepositWithNote(this.getAttribute('data-code'), 'Nhận thừa')" class="btn-sm btn-primary cursor-pointer font-bold">Duyệt cọc</button>`;
    } else {
      txBadgeHtml = `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">⏳ Chưa thấy tiền</span>`;
      actionButtonsHtml = `
        <button data-code="${safeCodeAttr}" onclick="approveDepositManual(this.getAttribute('data-code'))" class="btn-sm btn-secondary cursor-pointer font-bold">Duyệt thủ công</button>
        <button data-code="${safeCodeAttr}" onclick="rejectDeposit(this.getAttribute('data-code'))" class="btn-sm btn-danger-outline cursor-pointer font-bold">Hủy đơn (chưa nhận tiền)</button>
      `;
    }

    return `
    <tr id="pay-row-${idx}" class="hover:bg-slate-50 transition-colors">
      <td class="py-3 px-4 text-[#64748B] whitespace-nowrap">${escapeSearchHTML(item.time || '')}</td>
      <td class="py-3 px-4 font-mono font-bold text-[#0F172A]">${safeCodeAttr}</td>
      <td class="py-3 px-4 font-semibold">${escapeSearchHTML(item.name || item.customer_name || 'Khách vãng lai')}</td>
      <td class="py-3 px-4 font-extrabold text-[#16A34A]">${window.SanBongApp.formatVND(item.amt)}</td>
      <td class="py-3 px-4 whitespace-nowrap">${txBadgeHtml}</td>
      <td class="py-3 px-4">${escapeSearchHTML(item.bank || '')} (VietQR)</td>
      <td class="py-3 px-4 text-right space-x-2 whitespace-nowrap">
        ${actionButtonsHtml}
      </td>
    </tr>
  `;
  }).join('');
}
window.renderAdminPayments = renderAdminPayments;

async function approveDepositWithNote(code, txStatus) {
  const notePrompt = await adminPrompt(
    'Ghi chú duyệt cọc chênh lệch',
    `Đơn ${code} đang ở trạng thái "${txStatus}".\nBắt buộc nhập ghi chú xử lý chênh lệch để duyệt cọc:`,
    '',
    'Nhập ghi chú xử lý chênh lệch...'
  );
  if (notePrompt === null) return;
  if (!notePrompt.trim()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Bắt buộc nhập ghi chú xử lý chênh lệch để tiếp tục!', 'warning');
    return;
  }
  await approveDeposit(code, notePrompt.trim());
}
window.approveDepositWithNote = approveDepositWithNote;

async function approveDepositManual(code) {
  const refPrompt = await adminPrompt(
    'Duyệt cọc thủ công',
    `Đơn ${code} chưa thấy giao dịch ngân hàng khớp tự động.\nNhập mã tham chiếu chuyển khoản hoặc ghi chú xác thực để duyệt thủ công:`,
    '',
    'Nhập mã tham chiếu hoặc ghi chú...'
  );
  if (refPrompt === null) return;
  if (!refPrompt.trim()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Bắt buộc nhập mã tham chiếu hoặc ghi chú để duyệt thủ công!', 'warning');
    return;
  }
  await approveDeposit(code, refPrompt.trim(), refPrompt.trim());
}
window.approveDepositManual = approveDepositManual;

async function approveDeposit(code, note = '', referenceCode = '') {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền duyệt cọc VietQR!', 'error');
    return;
  }
  const btn = document.querySelector(`button[data-code="${code}"]`);
  if (btn) btn.disabled = true;

  try {
    const payload = { code: code, status: 'Đã cọc 30%' };
    if (note) payload.note = note;
    if (referenceCode) payload.reference_code = referenceCode;

    const r = await adminFetchJson('../api/admin.php?action=update_payment', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể duyệt cọc VietQR!', 'error', 4000);
      return;
    }

    await renderAdminPayments();
    if (typeof loadBankTransactions === 'function') await loadBankTransactions();
    if (typeof renderOverviewKPIs === 'function') await renderOverviewKPIs(true);
    if (typeof renderTimelineGantt === 'function') renderTimelineGantt(true);
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('✓ ĐÃ DUYỆT CỌC THÀNH CÔNG: Đơn ' + code + ' đã kích hoạt mã vé check-in!', 'success', 3500);
  } finally {
    if (btn) btn.disabled = false;
  }
}
window.approveDeposit = approveDeposit;

async function rejectDeposit(code) {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền từ chối duyệt cọc!', 'error');
    return;
  }

  const booking = (Array.isArray(cachedPendingDeposits) ? cachedPendingDeposits.find(p => p.code === code) : null)
    || (typeof window.findInPlayBookingSync === 'function' ? window.findInPlayBookingSync(code) : null);
  const custName = booking ? (booking.name || booking.customerName || code) : code;

  const confirmMsg =
    '• Đội bóng: ' + custName + ' (' + code + ')\n' +
    '• Lý do: Đơn chưa nhận được tiền giao dịch chuyển khoản VietQR.\n\n' +
    'HỆ THỐNG SẼ THỰC HIỆN:\n' +
    '1. Hủy đơn đặt sân chưa thanh toán này.\n' +
    '2. GIẢI PHÓNG & NHẢ SÂN TRỐNG NGAY LẬP TỨC để đón khách khác.\n\n' +
    'Bạn có chắc chắn muốn hủy đơn này?';

  const doReject = async () => {
    const r = await adminFetchJson('../api/admin.php?action=update_payment', {
      method: 'POST',
      body: JSON.stringify({ code: code, status: 'Đã hủy' })
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể hủy đơn!', 'error', 4000);
      return;
    }

    await renderAdminPayments();
    if (typeof loadBankTransactions === 'function') await loadBankTransactions();
    if (typeof renderOverviewKPIs === 'function') await renderOverviewKPIs(true);
    if (typeof renderTimelineGantt === 'function') renderTimelineGantt(true);
    if (typeof initQuickBookingForm === 'function') initQuickBookingForm();
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('⚡ ĐÃ HỦY ĐƠN: Đơn ' + code + ' đã bị hủy và giải phóng sân.', 'warning', 3500);
    }
  };

  if (window.SanBongApp?.showModal) {
    window.SanBongApp.showModal({
      title: '⚠️ Xác nhận hủy đơn chưa nhận tiền',
      message: confirmMsg,
      type: 'danger',
      confirmText: 'Hủy đơn & Giải phóng sân',
      cancelText: 'Giữ lại chờ',
      onConfirm: doReject
    });
  } else {
    const confirmed = await showAdminConfirm({
      title: '⚠️ Xác nhận hủy đơn chưa nhận tiền',
      message: confirmMsg,
      confirmText: 'Hủy đơn & Giải phóng sân',
      cancelText: 'Giữ lại chờ',
      danger: true
    });
    if (confirmed) await doReject();
  }
}
window.rejectDeposit = rejectDeposit;

function populateReconcileBookingDatalist(candidates) {
  const datalist = document.getElementById('rec-booking-datalist');
  if (!datalist) return;
  const list = Array.isArray(candidates) ? candidates : [];
  datalist.innerHTML = list.map(c => {
    const code = escapeSearchHTML(c.code || '');
    const name = escapeSearchHTML(c.customer_name || c.name || '');
    const pitch = escapeSearchHTML(c.pitch_name || '');
    const slot = escapeSearchHTML(c.slot_time || '');
    const expAmt = Number(c.expected_amount || c.deposit_amount || c.total_price || 0);
    const expStr = expAmt > 0 ? ` - ${window.SanBongApp?.formatVND ? window.SanBongApp.formatVND(expAmt) : expAmt + 'đ'}` : '';
    return `<option value="${code}">${name} (${pitch} ${slot})${expStr}</option>`;
  }).join('');
}

function updateBankFilterButtons(activeFilter) {
  const filters = ['pending', 'resolved', 'all'];
  filters.forEach(f => {
    const btn = document.getElementById(`bank-filter-${f}`);
    if (!btn) return;
    if (f === activeFilter) {
      btn.className = 'px-3 py-1.5 rounded-lg font-bold bg-[#16A34A] text-white cursor-pointer';
    } else {
      btn.className = 'px-3 py-1.5 rounded-lg font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer';
    }
  });
}

async function loadBankTransactions(filter) {
  if (!isManagerOrAdmin()) return;
  const activeFilter = filter || window.currentBankTxFilter || 'pending';
  window.currentBankTxFilter = activeFilter;
  updateBankFilterButtons(activeFilter);

  const tbody = document.getElementById('admin-bank-tx-tbody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="5" class="py-6 px-4 text-center text-[#64748B]"><div class="w-full flex items-center justify-center text-center">Đang tải dữ liệu giao dịch từ ngân hàng...</div></td></tr>';
  }

  const r = await adminFetchJson(`../api/admin.php?action=bank_transactions&filter=${encodeURIComponent(activeFilter)}`);
  if (!r.ok || !r.data) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-6 px-4 text-center text-red-500 font-semibold"><div class="w-full flex items-center justify-center text-center">${escapeSearchHTML(r.message || 'Không thể tải danh sách giao dịch ngân hàng.')}</div></td></tr>`;
    }
    return;
  }

  const list = Array.isArray(r.data.transactions) ? r.data.transactions : [];
  window.cachedBankTransactions = list;
  window.cachedCandidateBookings = Array.isArray(r.data.candidate_bookings)
    ? r.data.candidate_bookings
    : (Array.isArray(r.data.candidateBookings) ? r.data.candidateBookings : []);
  populateReconcileBookingDatalist(window.cachedCandidateBookings);

  renderBankTransactions(list, Number(r.data.pending_count ?? r.data.pendingCount ?? 0));
}
window.loadBankTransactions = loadBankTransactions;

function renderBankTransactions(list, pendingCount = 0) {
  const tbody = document.getElementById('admin-bank-tx-tbody');
  const badge = document.getElementById('bank-pending-count-badge');
  if (badge) {
    const count = Number(pendingCount || 0);
    badge.textContent = count > 0 ? `${count} Cần xử lý` : '✓ Đã khớp hết';
    badge.className = count > 0
      ? 'px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[11px] font-bold'
      : 'px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold';
  }

  if (!tbody) return;

  if (!Array.isArray(list) || list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-10 px-4 text-center text-[#64748B]">
          <div class="w-full flex flex-col items-center justify-center text-center gap-2 mx-auto">
            <span class="text-2xl">✅</span>
            <span class="font-bold text-[#0F172A] text-xs text-center">Không có giao dịch ngân hàng nào cần xử lý ở bộ lọc này</span>
            <span class="text-[11px] text-[#94A3B8] text-center">Webhook SePay tự động ghi nhận và đối soát mọi chuyển khoản phát sinh.</span>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map(tx => {
    const txId = escapeSearchHTML(String(tx.id || ''));
    const bankRef = escapeSearchHTML(tx.reference_code || tx.reference_number || tx.code || '---');
    const timeStr = escapeSearchHTML(tx.transaction_time || tx.transaction_date || tx.created_at || '---');
    const bankName = escapeSearchHTML(tx.bank_name || tx.gateway || 'VietQR');
    const content = escapeSearchHTML(tx.content || tx.transaction_content || tx.description || '---');
    const rawMatchedCode = String(tx.matched_booking_code || tx.detected_booking_code || tx.booking_code || tx.detected_code || '').trim();
    const detectedCode = escapeSearchHTML(rawMatchedCode);
    const reasonNote = String(tx.resolved_note || tx.mismatch_reason || tx.note || '').trim();

    const amountIn = Number(tx.transfer_amount ?? tx.amount_in ?? tx.amountIn ?? tx.transferAmount ?? tx.amount ?? 0);
    const expectedAmt = Number(tx.expected_amount ?? tx.expectedAmount ?? 0);
    const rawDiff = tx.diff_amount ?? tx.discrepancy_amount;
    const diffAmt = (rawDiff !== undefined && rawDiff !== null && rawDiff !== '')
      ? Number(rawDiff)
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
      statusBadge = '<span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold whitespace-nowrap">⚠️ Thiếu tiền</span>';
    } else if (matchSt === 'overpaid' || (expectedAmt > 0 && diffAmt > 0)) {
      statusBadge = '<span class="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 text-[11px] font-bold whitespace-nowrap">ℹ️ Thừa tiền</span>';
    } else {
      statusBadge = '<span class="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 text-[11px] font-bold whitespace-nowrap">❌ Chưa khớp đơn</span>';
    }

    let diffText = '';
    if (expectedAmt > 0) {
      if (diffAmt === 0) {
        diffText = '<span class="text-emerald-600 text-[11px] block font-semibold">Khớp 100%</span>';
      } else if (diffAmt < 0) {
        diffText = `<span class="text-rose-600 text-[11px] block font-bold">Thiếu: ${window.SanBongApp.formatVND(Math.abs(diffAmt))}</span>`;
      } else {
        diffText = `<span class="text-blue-600 text-[11px] block font-bold">Thừa: +${window.SanBongApp.formatVND(diffAmt)}</span>`;
      }
    } else {
      diffText = '<span class="text-slate-400 text-[11px] block">Chưa liên kết đơn</span>';
    }

    let actions = '';
    if (!isResolved) {
      actions = `
        <div class="inline-flex items-center justify-center text-center gap-1.5 whitespace-nowrap">
          <button type="button" onclick="openReconcileAssignModal('${txId}')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#16A34A] hover:bg-[#15803D] text-white shadow-2xs cursor-pointer">Khớp đơn</button>
          <button type="button" onclick="resolveBankTransaction('${txId}', 'resolved')" class="px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-[#0F172A] border border-slate-300 cursor-pointer" title="Đánh dấu đã xử lý ngoại lệ ngoài hệ thống">Đã xử lý</button>
          <button type="button" onclick="resolveBankTransaction('${txId}', 'ignored')" class="px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer" title="Giao dịch chuyển nhầm / không thuộc sân bóng">Bỏ qua</button>
        </div>
      `;
    } else {
      actions = `
        <div class="inline-flex items-center justify-center text-center gap-1.5 whitespace-nowrap">
          <span class="text-[11px] text-slate-400">Hoàn tất</span>
          <button type="button" onclick="openReconcileAssignModal('${txId}')" class="text-[11px] text-indigo-600 hover:underline cursor-pointer">Sửa gán</button>
        </div>
      `;
    }

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="py-3 px-4 text-center whitespace-nowrap">
          <div class="flex flex-col items-center justify-center text-center">
            <div class="font-semibold text-[#0F172A]">${timeStr}</div>
            <div class="text-[11px] text-slate-500 font-mono">Ref: ${bankRef}</div>
            <div class="text-[10px] text-slate-400">${bankName}</div>
          </div>
        </td>
        <td class="py-3 px-4 text-center">
          <div class="max-w-xs mx-auto flex flex-col items-center justify-center text-center">
            <div class="font-mono text-xs text-[#0F172A] break-words">${content}</div>
            ${detectedCode ? `<div class="mt-1 flex justify-center"><span class="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-bold font-mono">Mã nhận diện: ${detectedCode}</span></div>` : ''}
            ${reasonNote ? `<div class="mt-1 text-[11px] text-slate-500 italic">Ghi chú: ${escapeSearchHTML(reasonNote)}</div>` : ''}
          </div>
        </td>
        <td class="py-3 px-4 text-center whitespace-nowrap">
          <div class="flex flex-col items-center justify-center text-center">
            <div class="font-extrabold text-[#16A34A] text-xs">+${window.SanBongApp.formatVND(amountIn)}</div>
            ${expectedAmt > 0 ? `<div class="text-[11px] text-slate-500">Cần thu: ${window.SanBongApp.formatVND(expectedAmt)}</div>` : ''}
            ${diffText}
          </div>
        </td>
        <td class="py-3 px-4 text-center whitespace-nowrap">
          <div class="flex items-center justify-center text-center">
            ${statusBadge}
          </div>
        </td>
        <td class="py-3 px-4 text-center">
          <div class="flex items-center justify-center text-center">
            ${actions}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openReconcileAssignModal(txId) {
  if (!isManagerOrAdmin()) return;
  const modal = document.getElementById('reconcile-assign-modal');
  if (!modal) return;

  const txList = window.cachedBankTransactions || [];
  const tx = txList.find(t => String(t.id) === String(txId));
  const idInput = document.getElementById('rec-tx-id');
  const infoBox = document.getElementById('rec-tx-info');
  const codeInput = document.getElementById('rec-booking-code');
  const statusSelect = document.getElementById('rec-target-status');
  const noteInput = document.getElementById('rec-assign-note');

  if (idInput) idInput.value = txId;

  let prefillCode = '';
  if (tx) {
    prefillCode = String(tx.matched_booking_code || tx.detected_booking_code || tx.booking_code || tx.detected_code || '').trim();
    const amountIn = Number(tx.transfer_amount ?? tx.amount_in ?? tx.transferAmount ?? tx.amount ?? 0);
    if (infoBox) {
      infoBox.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="font-bold text-[#0F172A]">Giao dịch #${escapeSearchHTML(String(tx.id))}</span>
          <span class="font-extrabold text-[#16A34A]">+${window.SanBongApp.formatVND(amountIn)}</span>
        </div>
        <div class="text-[11px] text-slate-500">Ref: <b>${escapeSearchHTML(tx.reference_code || tx.code || '---')}</b> · ${escapeSearchHTML(tx.transaction_time || tx.created_at || '')}</div>
        <div class="text-[11px] font-mono bg-white p-1.5 rounded border border-slate-200 break-words mt-1">${escapeSearchHTML(tx.content || tx.description || '---')}</div>
      `;
    }
  } else if (infoBox) {
    infoBox.innerHTML = `<span class="text-slate-500 font-mono">ID Giao dịch: #${escapeSearchHTML(String(txId))}</span>`;
  }

  populateReconcileBookingDatalist(window.cachedCandidateBookings);

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

  const r = await adminFetchJson('../api/admin.php?action=bank_transactions', {
    method: 'POST',
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
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Lỗi khi gán giao dịch vào đơn!', 'error', 4000);
    return;
  }
  const serverMsg = r.message || '';

  closeReconcileAssignModal();
  await loadBankTransactions();
  renderAdminPayments();
  if (typeof renderOverviewKPIs === 'function') await renderOverviewKPIs(true);
  if (typeof renderTimelineGantt === 'function') renderTimelineGantt(true);
  if (isOwnerAdmin() && typeof loadAdminLogs === 'function') loadAdminLogs(1);

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

  const rawNote = await showAdminPrompt({
    title: targetResStatus === 'ignored' ? 'Bỏ qua giao dịch ngân hàng' : 'Xác nhận đã xử lý giao dịch',
    message: promptMsg,
    defaultValue: defaultNote,
    placeholder: 'Nhập ghi chú xử lý...',
    confirmText: targetResStatus === 'ignored' ? 'Bỏ qua giao dịch' : 'Xác nhận đã xử lý',
    cancelText: 'Hủy',
    danger: targetResStatus === 'ignored'
  });
  if (rawNote === null) return;
  const note = String(rawNote).trim();
  if (!note) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Vui lòng nhập ghi chú xử lý không để trống!', 'warning', 3000);
    }
    return;
  }

  const r = await adminFetchJson('../api/admin.php?action=bank_transactions', {
    method: 'POST',
    body: JSON.stringify({
      sub_action: 'resolve',
      tx_id: txId,
      id: txId,
      resolution_status: targetResStatus,
      status: targetResStatus,
      note: note
    })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể cập nhật trạng thái giao dịch!', 'error', 4000);
    return;
  }
  const serverMsg = r.message || '';

  await loadBankTransactions();
  if (isOwnerAdmin() && typeof loadAdminLogs === 'function') loadAdminLogs(1);
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

;
/* === admin_ops.js === */
let selectedTimelineDate = (() => {
  try {
    const saved = sessionStorage.getItem('sb_timeline_date') || '';
    return /^\d{4}-\d{2}-\d{2}$/.test(saved) ? saved : '';
  } catch (e) {
    return '';
  }
})();
let timelineBookingsByDateCache = {};
const timelineFetchedDates = new Set();
let timelineFetchSeq = 0;
window.selectedTimelineDate = selectedTimelineDate;
window.timelineBookingsByDateCache = timelineBookingsByDateCache;
window.markTimelineDateFetched = function(dateStr) {
  if (dateStr) timelineFetchedDates.add(dateStr);
};

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

function normalizeTimelineServerBooking(srvB, fallbackDate) {
  const totalPrice = Number(srvB.totalPrice ?? srvB.total_price ?? 0);
  const depositAmount = Number(srvB.depositAmount ?? srvB.deposit_amount ?? 0);
  const paidAmount = Number(srvB.paidAmount ?? srvB.paid_amount ?? 0);
  const rawRem = srvB.remainingAmount ?? srvB.remaining_amount;
  const remainingAmount = (rawRem !== undefined && rawRem !== null && rawRem !== '')
    ? Number(rawRem)
    : Math.max(0, totalPrice - paidAmount);
  return Object.assign({}, srvB, {
    code: String(srvB.code || '').trim(),
    customerName: srvB.customerName || srvB.customer_name || 'Khách đặt sân',
    phone: srvB.phone || '',
    pitchId: srvB.pitchId || srvB.pitch_id || '',
    pitchName: srvB.pitchName || srvB.pitch_name || srvB.pitchId || srvB.pitch_id || '',
    date: srvB.date || srvB.booking_date || fallbackDate,
    slotId: srvB.slotId || srvB.slot_id || '',
    slotTime: srvB.slotTime || srvB.slot_time || '',
    totalPrice,
    depositAmount,
    paidAmount,
    remainingAmount,
    status: srvB.status || 'Đã xác nhận',
    paymentStatus: srvB.paymentStatus || srvB.payment_status || 'Chờ duyệt cọc',
    paymentMethod: srvB.paymentMethod || srvB.payment_method || '',
    note: srvB.note || ''
  });
}

async function fetchTimelineDateBookings(dateStr) {
  const getToday = window.SanBongApp?.getLocalTodayISO
    ? window.SanBongApp.getLocalTodayISO()
    : (typeof getLocalTodayISO === 'function' ? getLocalTodayISO() : new Date().toISOString().split('T')[0]);
  const targetDate = dateStr || selectedTimelineDate || getToday;
  const reqSeq = ++timelineFetchSeq;
  const r = await adminFetchJson(`../api/bookings.php?action=by_date&date=${encodeURIComponent(targetDate)}`);
  if (r.ok && Array.isArray(r.data)) {
    const normItems = r.data
      .filter(srvB => srvB && srvB.code)
      .map(srvB => normalizeTimelineServerBooking(srvB, targetDate));

    // REPLACE dataset hoàn toàn bằng dữ liệu server, không merge localStorage/mock
    timelineBookingsByDateCache[targetDate] = normItems;
    timelineFetchedDates.add(targetDate);
    if (typeof window.syncLiveBookingsCache === 'function') {
      window.syncLiveBookingsCache(normItems);
    }

    // Đồng bộ số lượt & danh sách hôm nay sang Overview KPI để 2 tab khớp 100%
    const overviewToday = window.overviewSummaryCache?.today || getToday;
    if (targetDate === overviewToday && window.overviewSummaryCache) {
      window.overviewSummaryCache.todayBookings = normItems;
      if (window.overviewSummaryCache.kpi) {
        window.overviewSummaryCache.kpi.todayCount = normItems.length;
      }
      const kpiCountEl = document.getElementById('kpi-bookings-count');
      if (kpiCountEl) {
        kpiCountEl.textContent = `${normItems.length} lượt`;
      }
      if (typeof renderOverviewTodayBookings === 'function') {
        renderOverviewTodayBookings();
      }
    }
    return { items: normItems, seq: reqSeq };
  }
  return { items: timelineBookingsByDateCache[targetDate] || [], seq: reqSeq };
}

window.changeTimelineDate = function(deltaDays) {
  const getToday = window.SanBongApp?.getLocalTodayISO ? window.SanBongApp.getLocalTodayISO() : new Date().toISOString().split('T')[0];
  if (deltaDays === 0) {
    selectedTimelineDate = getToday;
  } else {
    const cur = new Date((selectedTimelineDate || getToday) + 'T00:00:00');
    cur.setDate(cur.getDate() + Number(deltaDays || 0));
    const yyyy = cur.getFullYear();
    const mm = String(cur.getMonth() + 1).padStart(2, '0');
    const dd = String(cur.getDate()).padStart(2, '0');
    selectedTimelineDate = `${yyyy}-${mm}-${dd}`;
  }
  window.selectedTimelineDate = selectedTimelineDate;
  try { sessionStorage.setItem('sb_timeline_date', selectedTimelineDate); } catch (e) {}
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
  window.selectedTimelineDate = selectedTimelineDate;
  try { sessionStorage.setItem('sb_timeline_date', selectedTimelineDate); } catch (e) {}
  const lbl = document.getElementById('timeline-date-label');
  if (lbl) lbl.textContent = formatTimelineDateLabel(selectedTimelineDate);
  fetchTimelineDateBookings(selectedTimelineDate).finally(() => {
    renderTimelineGantt();
  });
};

function renderTimelineGantt(forceFetch = false) {
  const db = window.SanBongApp.SanBongDB;
  const pitches = db.getPitches().filter(p => p.status !== 'Ẩn');
  const container = document.getElementById('gantt-rows');
  if (!container) return;

  const getToday = window.SanBongApp?.getLocalTodayISO ? window.SanBongApp.getLocalTodayISO() : new Date().toISOString().split('T')[0];
  if (!selectedTimelineDate) {
    selectedTimelineDate = getToday;
    window.selectedTimelineDate = selectedTimelineDate;
  }
  const picker = document.getElementById('timeline-date-picker');
  if (picker && picker.value !== selectedTimelineDate) {
    picker.value = selectedTimelineDate;
  }
  const lbl = document.getElementById('timeline-date-label');
  if (lbl) {
    lbl.textContent = formatTimelineDateLabel(selectedTimelineDate);
  }

  const targetDate = selectedTimelineDate;
  if (forceFetch || !timelineFetchedDates.has(targetDate)) {
    if (!timelineFetchedDates.has(targetDate)) {
      container.innerHTML = '<div class="py-8 text-center text-xs text-[#64748B]">Đang tải lịch đặt sân từ máy chủ...</div>';
    }
    fetchTimelineDateBookings(targetDate).then((res) => {
      if (res && res.seq === timelineFetchSeq && selectedTimelineDate === targetDate) {
        renderTimelineGantt(false);
      }
    });
    if (!timelineFetchedDates.has(targetDate)) return;
  }

  const allBookings = Array.isArray(timelineBookingsByDateCache[targetDate])
    ? timelineBookingsByDateCache[targetDate]
    : [];

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
    const presets = [{ left: 42, width: 16 }, { left: 60, width: 17 }, { left: 79, width: 14 }];
    return presets[fallbackIdx % presets.length];
  };

  container.innerHTML = pitches.map((p) => {
    const isMaint = p.status === 'Bảo trì';
    const pitchBookings = allBookings.filter(b => {
      const bPitchId = b.pitchId || b.pitch_id;
      const bDate = b.date || b.booking_date;
      const bStatus = b.status || '';
      const bPayStatus = b.paymentStatus || b.payment_status || '';
      return bPitchId === p.id && bDate === selectedTimelineDate &&
        bStatus !== 'Đã hủy' && bStatus !== 'Khách chưa đến' &&
        bStatus !== 'Vắng mặt (No-Show)' && !String(bStatus).includes('No-Show') &&
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
      const isSelected = b.code === window.activeInPlayCode ? 'ring-2 ring-[#0F172A] z-10' : '';
      const safeCodeAttr = escapeJsAttr(b.code);
      const safeCodeHtml = escapeSearchHTML(b.code);
      return `
        <div onclick="openInPlaySection('${safeCodeAttr}')" title="Bấm để điều hành ca đá #${safeCodeHtml} · ${escapeSearchHTML(b.customerName)} (${escapeSearchHTML(b.slotTime || '')} - ${escapeSearchHTML(normStatus)})" class="absolute top-1 bottom-1 rounded border px-2 py-0.5 text-[10px] truncate font-bold cursor-pointer hover:scale-[1.01] transition-transform flex items-center justify-between gap-1 shadow-xs ${styleCls} ${isSelected}" style="left:${pos.left}%; width:${pos.width}%;">
          <span class="truncate">${escapeSearchHTML(b.customerName)} (${escapeSearchHTML(normStatus)})</span>
          <span class="font-mono text-[9px] opacity-75 shrink-0">#${escapeSearchHTML(String(b.code || '').slice(-4))}</span>
        </div>
      `;
    }).join('') : `<div class="w-full h-full flex items-center justify-center text-[11px] font-medium text-slate-400">Trống lịch cả ngày</div>`;

    return `
      <div class="flex items-center h-16 relative">
        <div class="w-28 font-heading font-bold text-xs shrink-0 text-[#0F172A]">${escapeSearchHTML(p.name || '')}</div>
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

  if (typeof renderInlineInPlaySelector === 'function') renderInlineInPlaySelector();
}

function parseTimeStrToMinutes(tStr, fallbackMin) {
  const parts = String(tStr || '').trim().split(':');
  if (parts.length >= 2) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!isNaN(h) && !isNaN(m)) return h * 60 + m;
  }
  return fallbackMin;
}

function getSlotMaintenanceReason(pitchId, dateVal, slotTime, maintenanceWindows) {
  if (!Array.isArray(maintenanceWindows) || maintenanceWindows.length === 0) return '';
  const timeParts = String(slotTime || '').split('-');
  if (timeParts.length !== 2) return '';
  const slotStart = parseTimeStrToMinutes(timeParts[0], -1);
  const slotEnd = parseTimeStrToMinutes(timeParts[1], -1);
  if (slotStart < 0 || slotEnd <= slotStart) return '';

  for (const mw of maintenanceWindows) {
    if (!mw) continue;
    const mwPitch = mw.pitch_id || mw.pitchId || '';
    if (mwPitch && mwPitch !== pitchId) continue;
    const mwStatus = String(mw.status || 'active').toLowerCase();
    if (!['active', 'scheduled', 'in_progress'].includes(mwStatus)) continue;
    const sDate = mw.start_date || mw.startDate || '';
    const eDate = mw.end_date || mw.endDate || sDate;
    if (!sDate || dateVal < sDate || dateVal > eDate) continue;

    const mwStart = parseTimeStrToMinutes(mw.start_time || mw.startTime || '00:00', 0);
    const mwEnd = parseTimeStrToMinutes(mw.end_time || mw.endTime || '23:59', 23 * 60 + 59);
    if (slotStart < mwEnd && slotEnd > mwStart) {
      return String(mw.reason || 'Bảo trì sân').trim();
    }
  }
  return '';
}

async function refreshWalkinBookedSlots() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;
  const pitchSelect = document.getElementById('admin-pitch-select');
  const dateInput = document.getElementById('admin-book-date');
  const slotSelect = document.getElementById('admin-slot-select');
  if (!pitchSelect || !slotSelect) return;

  const pitchId = pitchSelect.value;
  const getToday = window.SanBongApp?.getLocalTodayISO ? window.SanBongApp.getLocalTodayISO() : new Date().toISOString().split('T')[0];
  const dateVal = dateInput?.value || getToday;
  const prevSlotId = slotSelect.value;
  const isToday = dateVal === getToday;
  const nowHHMM = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  const isSlotPast = (s) => Boolean(s) && isToday && (s.start || (s.time ? s.time.split('-')[0].trim() : '')) <= nowHHMM;

  const bookedMap = {};

  let maintenanceWindows = typeof db.getMaintenanceSchedules === 'function' ? db.getMaintenanceSchedules() : [];
  const r = await adminFetchJson(`../api/bookings.php?action=booked_slots&pitch_id=${encodeURIComponent(pitchId)}&date=${encodeURIComponent(dateVal)}`);
  if (r.ok) {
    if (Array.isArray(r.data)) {
      r.data.forEach(item => {
        const sid = item.slotId || item.slot_id;
        if (sid) bookedMap[sid] = item.code || 'ĐÃ ĐẶT';
      });
    }
    if (Array.isArray(r.json?.maintenanceWindows)) {
      maintenanceWindows = r.json.maintenanceWindows;
    }
  }

  const maintMap = {};
  const slots = db.getTimeSlots();
  slotSelect.innerHTML = slots.map(s => {
    if (isSlotPast(s)) {
      return `<option value="${escapeSearchHTML(s.id)}" disabled class="text-slate-400 opacity-50">${escapeSearchHTML(s.name || s.time)} (⏱️ Đã qua)</option>`;
    }
    const maintReason = getSlotMaintenanceReason(pitchId, dateVal, s.time, maintenanceWindows);
    if (maintReason) {
      maintMap[s.id] = maintReason;
      return `<option value="${escapeSearchHTML(s.id)}" disabled class="text-red-500">${escapeSearchHTML(s.time)} (🔧 Bảo trì - ${escapeSearchHTML(maintReason)})</option>`;
    }
    const bookedCode = bookedMap[s.id];
    if (bookedCode) {
      return `<option value="${escapeSearchHTML(s.id)}" disabled class="text-slate-400">${escapeSearchHTML(s.time)} (🔒 Đã đặt - #${escapeSearchHTML(bookedCode)})</option>`;
    }
    return `<option value="${escapeSearchHTML(s.id)}">${escapeSearchHTML(s.time)}</option>`;
  }).join('');

  const prevSlotObj = slots.find(s => s.id === prevSlotId);
  if (prevSlotId && !bookedMap[prevSlotId] && !maintMap[prevSlotId] && prevSlotObj && !isSlotPast(prevSlotObj)) {
    slotSelect.value = prevSlotId;
  } else {
    const firstFree = slots.find(s => !bookedMap[s.id] && !maintMap[s.id] && !isSlotPast(s));
    slotSelect.value = firstFree ? firstFree.id : '';
  }

  updateWalkinPricePreview();
}
window.refreshWalkinBookedSlots = refreshWalkinBookedSlots;

function updateWalkinPricePreview() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const getToday = window.SanBongApp?.getLocalTodayISO ? window.SanBongApp.getLocalTodayISO() : new Date().toISOString().split('T')[0];
  const pitchId = document.getElementById('admin-pitch-select')?.value || '';
  const dateVal = document.getElementById('admin-book-date')?.value || getToday;
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
      : `${fmt(calc.pitchPrice)}`;
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

function setWalkinBlacklistState(isBlacklisted) {
  const walkinForm = document.getElementById('admin-walkin-form');
  if (!walkinForm) return;
  walkinForm.dataset.blacklisted = isBlacklisted ? '1' : '';
  const submitBtn = walkinForm.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = !!isBlacklisted;
    submitBtn.classList.toggle('opacity-50', !!isBlacklisted);
    submitBtn.classList.toggle('cursor-not-allowed', !!isBlacklisted);
    submitBtn.title = isBlacklisted ? 'Số điện thoại nằm trong Blacklist — Đã khóa tạo đơn' : '';
  }
}

async function checkWalkinPhoneNoShow(rawPhone) {
  const warnBox = document.getElementById('walkin-noshow-warning');
  const warnText = document.getElementById('walkin-noshow-warning-text');

  const clean = String(rawPhone || '').replace(/[^\d]/g, '');
  if (clean.length < 9) {
    setWalkinBlacklistState(false);
    if (warnBox) warnBox.classList.add('hidden');
    if (warnText) warnText.innerHTML = '';
    return;
  }

  const db = window.SanBongApp?.SanBongDB;
  const localStats = db && typeof db.getPhoneNoShowAndDebt === 'function'
    ? db.getPhoneNoShowAndDebt(clean)
    : { noShowCount: 0 };

  let noShowCount = Number(localStats.noShowCount || 0);
  let isBlacklisted = false;
  let customerTier = 'standard';
  let adminNote = '';

  const r = await adminFetchJson(`../api/bookings.php?action=check_phone_noshow&phone=${encodeURIComponent(clean)}`);
  if (r.ok && r.data) {
    noShowCount = Math.max(noShowCount, Number(r.data.noShowCount ?? r.data.no_show_count ?? 0));
    isBlacklisted = Boolean(r.data.isBlacklisted ?? r.data.is_blacklisted);
    customerTier = String(r.data.customerTier ?? r.data.customer_tier ?? 'standard');
    adminNote = String(r.data.adminNote ?? r.data.admin_note ?? '').trim();
  }

  setWalkinBlacklistState(isBlacklisted);
  if (!warnBox) return;

  const tierLabels = {
    vip: '⭐ Khách VIP',
    regular: '✓ Khách quen',
    warning_noshow: '⚠️ Cảnh báo No-Show',
    standard: 'Khách tiêu chuẩn'
  };
  const tierLabel = tierLabels[customerTier] || customerTier;
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  const showWarningBox = isBlacklisted || noShowCount >= 2 || adminNote || customerTier === 'vip' || customerTier === 'regular' || customerTier === 'warning_noshow';
  if (!showWarningBox) {
    warnBox.classList.add('hidden');
    if (warnText) warnText.innerHTML = '';
    return;
  }

  const parts = [];
  if (isBlacklisted) {
    parts.push(`<span class="font-extrabold text-red-700">⛔ SĐT ĐANG NẰM TRONG BLACKLIST (ĐÃ KHÓA ĐẶT SÂN):</span> Không thể tạo đơn mới cho số này.`);
  }
  if (noShowCount >= 2) {
    parts.push(`<span>⚠️ Khách đã có <b>${Number(noShowCount)} lần No-Show</b>! Bắt buộc thu cọc trước khi giữ sân.</span>`);
  }
  if (customerTier && customerTier !== 'standard') {
    parts.push(`<span class="inline-block px-1.5 py-0.5 rounded bg-slate-800 text-white text-[10px] font-bold">${escapeSearchHTML(tierLabel)}</span>`);
  }
  if (adminNote) {
    parts.push(`<span class="block mt-1 text-[11px] font-semibold">📝 Ghi chú CRM: ${escapeSearchHTML(adminNote)}</span>`);
  }

  warnBox.classList.toggle('border-red-500', isBlacklisted);
  warnBox.classList.toggle('bg-red-100', isBlacklisted);
  if (warnText) {
    warnText.innerHTML = parts.join(' ');
  } else {
    warnBox.textContent = parts.map(p => p.replace(/<[^>]+>/g, '')).join(' ');
  }
  warnBox.classList.remove('hidden');
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

  const todayISO = (window.SanBongApp?.getLocalTodayISO ? window.SanBongApp.getLocalTodayISO() : new Date().toISOString().split('T')[0]);
  if (dateInput) {
    dateInput.min = todayISO;
    if (!dateInput.value || dateInput.value < todayISO) {
      dateInput.value = todayISO;
    }
  }

  const prevPitch = pitchSelect.value;
  pitchSelect.innerHTML = db.getPitches().filter(p => p.status !== 'Ẩn').map(p => `
    <option value="${escapeSearchHTML(p.id)}" ${p.status === 'Bảo trì' ? 'disabled' : ''}>${escapeSearchHTML(p.name)} (${escapeSearchHTML(p.typeName)}) - ${escapeSearchHTML(window.SanBongApp.formatVND(p.basePrice))}/ca 2h</option>
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
        if (dateInput) dateInput.value = (window.SanBongApp?.getLocalTodayISO ? window.SanBongApp.getLocalTodayISO() : new Date().toISOString().split('T')[0]);
        setWalkinBlacklistState(false);
        const warnBox = document.getElementById('walkin-noshow-warning');
        if (warnBox) {
          warnBox.classList.add('hidden');
          warnBox.classList.remove('border-red-500', 'bg-red-100');
        }
        const warnText = document.getElementById('walkin-noshow-warning-text');
        if (warnText) warnText.innerHTML = '';
        refreshWalkinBookedSlots();
      }, 20);
    });
    walkinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (walkinForm.dataset.blacklisted === '1') {
        if (window.SanBongApp?.showToast) window.SanBongApp.showToast('SĐT này đang nằm trong Blacklist — không thể tạo đơn mới!', 'error', 4000);
        return;
      }

      const name = (document.getElementById('admin-cust-name')?.value || '').trim();
      const phone = (document.getElementById('admin-cust-phone')?.value || '').trim();
      const pitchId = pitchSelect.value;
      const getToday = window.SanBongApp?.getLocalTodayISO ? window.SanBongApp.getLocalTodayISO() : new Date().toISOString().split('T')[0];
      const dateVal = dateInput?.value || getToday;
      const slotId = slotSelect.value;
      const weeksCount = Math.max(1, parseInt(packageSelect?.value || '1', 10) || 1);
      const payMethod = paySelect?.value || 'Tiền mặt tại quầy';
      let note = (document.getElementById('admin-cust-note')?.value || '').trim();

      if (dateVal < getToday) {
        if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Ngày thi đấu không được nhỏ hơn ngày hôm nay!', 'error');
        return;
      }

      const selectedOpt = slotSelect.options[slotSelect.selectedIndex];
      if (!slotId || (selectedOpt && selectedOpt.disabled)) {
        if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Khung giờ này đã kín lịch hoặc đang bảo trì! Vui lòng chọn khung giờ trống khác.', 'error');
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
        const r = await adminFetchJson('../api/bookings.php', {
          method: 'POST',
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

        if (!r.ok) {
          if (window.SanBongApp?.showToast) {
            window.SanBongApp.showToast(r.message || 'Khung giờ vừa được đặt bởi người khác! Vui lòng chọn giờ khác.', 'error', 4000);
          }
          await refreshWalkinBookedSlots();
          return;
        }

        const srvData = r.data || {};
        const createdCode = srvData.code || '';

        if (window.SanBongApp?.showToast) {
          window.SanBongApp.showToast(`✓ Đã tạo đơn khóa sân thành công! Mã đơn: #${createdCode}`, 'success', 4000);
        }

        walkinForm.reset();
        setWalkinBlacklistState(false);
        const warnBox = document.getElementById('walkin-noshow-warning');
        if (warnBox) warnBox.classList.add('hidden');
        if (dateInput) dateInput.value = dateVal;
        await refreshWalkinBookedSlots();
        timelineFetchedDates.delete(dateVal);
        await fetchTimelineDateBookings(dateVal);
        if (typeof renderOverviewKPIs === 'function') await renderOverviewKPIs(true);
        renderTimelineGantt(false);
        if (typeof loadShiftHandovers === 'function') loadShiftHandovers();
        if (isManagerOrAdmin()) {
          if (typeof renderAdminPayments === 'function') renderAdminPayments();
          if (typeof renderAdminReports === 'function') renderAdminReports();
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = walkinForm.dataset.blacklisted === '1';
          submitBtn.innerHTML = origBtnText;
        }
      }
    });
  }
}
window.initQuickBookingForm = initQuickBookingForm;

;
/* === admin_crm.js === */
async function loadAdminReviews() {
  const tbody = document.getElementById('admin-reviews-tbody');
  if (!tbody) return;
  const r = await adminFetchJson('../api/reviews.php?all=1');
  if (!r.ok) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải danh sách đánh giá.')}</td></tr>`;
    return;
  }

  const payload = r.data || r.json || {};
  const summary = payload.summary || {};
  const pitchStats = Array.isArray(payload.pitchStats) ? payload.pitchStats : [];
  const slotStats = Array.isArray(payload.slotStats) ? payload.slotStats : [];
  const reviews = Array.isArray(payload.reviews) ? payload.reviews : [];
  window.adminReviewsCache = reviews;

  const avgEl = document.getElementById('rev-stat-avg');
  const totEl = document.getElementById('rev-stat-total');
  const pubEl = document.getElementById('rev-stat-published');
  const hidEl = document.getElementById('rev-stat-hidden');
  if (avgEl) avgEl.textContent = `${Number(summary.avg_rating || 0).toFixed(1)} ★`;
  if (totEl) totEl.textContent = String(Number(summary.total_reviews || 0));
  if (pubEl) pubEl.textContent = String(Number(summary.published_reviews || 0));
  if (hidEl) hidEl.textContent = String(Number(summary.hidden_reviews || 0));

  const pitchListEl = document.getElementById('rev-by-pitch-list');
  if (pitchListEl) {
    pitchListEl.innerHTML = pitchStats.length > 0 ? pitchStats.map(ps => (
      `<div class="flex items-center justify-between py-1 border-b border-slate-200/70 last:border-0">
        <span class="font-semibold text-[#0F172A]">${escapeSearchHTML(ps.pitch_name || ps.pitch_id || '')}</span>
        <span class="font-bold text-amber-600">${Number(ps.avg_rating || 0).toFixed(1)} ★ <span class="text-[#64748B] font-normal">(${Number(ps.total || 0)} lượt)</span></span>
      </div>`
    )).join('') : '<div class="text-[#94A3B8]">Chưa có dữ liệu đánh giá theo sân.</div>';
  }

  const slotListEl = document.getElementById('rev-by-slot-list');
  if (slotListEl) {
    slotListEl.innerHTML = slotStats.length > 0 ? slotStats.map(ss => (
      `<div class="flex items-center justify-between py-1 border-b border-slate-200/70 last:border-0">
        <span class="font-semibold text-[#0F172A]">⏰ ${escapeSearchHTML(ss.slot_time || ss.slot_id || '')}</span>
        <span class="font-bold text-amber-600">${Number(ss.avg_rating || 0).toFixed(1)} ★ <span class="text-[#64748B] font-normal">(${Number(ss.total || 0)} lượt)</span></span>
      </div>`
    )).join('') : '<div class="text-[#94A3B8]">Chưa có dữ liệu đánh giá theo khung giờ.</div>';
  }

  if (reviews.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-[#94A3B8]">Chưa có đánh giá nào từ khách hàng.</td></tr>';
    return;
  }

  tbody.innerHTML = reviews.map(rv => {
    const rid = Number(rv.id);
    const starsNum = Math.max(1, Math.min(5, Number(rv.rating || 5)));
    const starsStr = '★'.repeat(starsNum) + '☆'.repeat(5 - starsNum);
    const st = rv.status || 'published';
    const nextSt = st === 'hidden' ? 'published' : 'hidden';
    const tags = Array.isArray(rv.tags) ? rv.tags : [];
    const tagsHtml = tags.length > 0
      ? `<div class="flex flex-wrap gap-1 mt-1">${tags.map(t => `<span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">${escapeSearchHTML(t)}</span>`).join('')}</div>`
      : '';

    const replyHtml = rv.admin_reply
      ? `<div class="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[#0F172A]">
           <div>${escapeSearchHTML(rv.admin_reply)}</div>
           ${rv.replied_by ? `<div class="text-[10px] text-[#64748B] mt-0.5">— ${escapeSearchHTML(rv.replied_by)} ${rv.replied_at ? '· ' + escapeSearchHTML(rv.replied_at) : ''}</div>` : ''}
         </div>`
      : '<span class="text-[11px] text-[#94A3B8] italic">Chưa phản hồi</span>';

    const statusBadge = st === 'hidden'
      ? '<span class="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px]">Đã ẩn</span>'
      : '<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">Hiển thị</span>';

    const toggleBtn = isManagerOrAdmin()
      ? `<button type="button" onclick="toggleReviewStatus(${rid}, '${nextSt}')" class="px-2 py-1 rounded ${st === 'hidden' ? 'bg-sky-600 hover:bg-sky-700 text-white' : 'bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700'} font-bold text-[11px] cursor-pointer">${st === 'hidden' ? '👁️ Hiện' : '🙈 Ẩn'}</button>`
      : '';

    return `<tr class="hover:bg-slate-50/70">
      <td class="py-3 px-4 align-top">
        <div class="font-mono font-bold text-[#0F172A]">#${escapeSearchHTML(rv.booking_code || '')}</div>
        <div class="text-[10px] text-[#64748B] mt-0.5">${escapeSearchHTML(rv.created_at || '')}</div>
      </td>
      <td class="py-3 px-4 align-top">
        <div class="font-bold text-[#0F172A]">${escapeSearchHTML(rv.pitch_name || rv.pitch_id || '')}</div>
        <div class="text-[11px] text-[#64748B]">${escapeSearchHTML(rv.booking_date || '')} ${rv.slot_time ? '· ' + escapeSearchHTML(rv.slot_time) : ''}</div>
      </td>
      <td class="py-3 px-4 align-top">
        <div class="font-bold text-[#0F172A]">${escapeSearchHTML(rv.customer_name || '')}</div>
        <div class="font-mono text-[11px] text-[#64748B]">${escapeSearchHTML(rv.phone || '')}</div>
      </td>
      <td class="py-3 px-4 align-top max-w-[260px]">
        <div class="text-amber-500 font-bold text-xs tracking-wider">${starsStr}</div>
        <div class="text-[#334155] mt-1">${escapeSearchHTML(rv.comment || '—')}</div>
        ${tagsHtml}
      </td>
      <td class="py-3 px-4 align-top max-w-[220px]">${replyHtml}</td>
      <td class="py-3 px-4 align-top">${statusBadge}</td>
      <td class="py-3 px-4 align-top text-right">
        <div class="inline-flex items-center justify-end gap-1.5">
          <button type="button" onclick="openReviewReplyModal(${rid})" class="px-2.5 py-1 rounded bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-[11px] cursor-pointer">💬 ${rv.admin_reply ? 'Sửa trả lời' : 'Trả lời'}</button>
          ${toggleBtn}
        </div>
      </td>
    </tr>`;
  }).join('');
}
window.loadAdminReviews = loadAdminReviews;

function openReviewReplyModal(reviewId) {
  const reviews = window.adminReviewsCache || [];
  const rv = reviews.find(x => Number(x.id) === Number(reviewId));
  if (!rv) return;
  const modal = document.getElementById('review-reply-modal');
  if (!modal) return;

  const idEl = document.getElementById('rev-reply-id');
  const metaEl = document.getElementById('rev-reply-meta');
  const textEl = document.getElementById('rev-reply-text');

  if (idEl) idEl.value = String(rv.id);
  if (metaEl) {
    const stars = '★'.repeat(Math.max(1, Math.min(5, Number(rv.rating || 5))));
    metaEl.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="font-bold text-[#0F172A]">${escapeSearchHTML(rv.customer_name || '')} (#${escapeSearchHTML(rv.booking_code || '')})</span>
        <span class="text-amber-500 font-bold">${stars}</span>
      </div>
      <div class="text-[11px] text-[#64748B]">${escapeSearchHTML(rv.pitch_name || '')} · ${escapeSearchHTML(rv.slot_time || '')}</div>
      <div class="text-[#334155] italic">"${escapeSearchHTML(rv.comment || '')}"</div>
    `;
  }
  if (textEl) textEl.value = rv.admin_reply || '';

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}
window.openReviewReplyModal = openReviewReplyModal;

function closeReviewReplyModal() {
  const modal = document.getElementById('review-reply-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}
window.closeReviewReplyModal = closeReviewReplyModal;

async function submitReviewReply(e) {
  if (e && e.preventDefault) e.preventDefault();
  const reviewId = parseInt(document.getElementById('rev-reply-id')?.value || '0', 10) || 0;
  const replyText = (document.getElementById('rev-reply-text')?.value || '').trim();
  if (!reviewId || !replyText) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập nội dung phản hồi!', 'warning');
    return;
  }

  const form = e?.target || document.getElementById('review-reply-form');
  const submitBtn = form?.querySelector('button[type="submit"]');
  const orig = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Đang gửi...';
  }
  try {
    const r = await adminFetchJson('../api/reviews.php', {
      method: 'POST',
      body: JSON.stringify({
        action: 'reply_review',
        review_id: reviewId,
        reply_text: replyText
      })
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể gửi phản hồi đánh giá!', 'error', 4000);
      return;
    }
    closeReviewReplyModal();
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã gửi phản hồi đánh giá khách hàng!', 'success', 3000);
    await loadAdminReviews();
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = orig;
    }
  }
}
window.submitReviewReply = submitReviewReply;

async function toggleReviewStatus(reviewId, nextStatus) {
  if (!isManagerOrAdmin()) return;
  if (nextStatus === 'hidden') {
    const ok = await showAdminConfirm({
      title: 'Ẩn đánh giá khách hàng',
      message: 'Đánh giá này sẽ không còn hiển thị công khai trên trang chủ. Bạn có chắc muốn ẩn?',
      confirmText: 'Ẩn đánh giá',
      cancelText: 'Hủy',
      danger: true
    });
    if (!ok) return;
  }

  const r = await adminFetchJson('../api/reviews.php', {
    method: 'POST',
    body: JSON.stringify({
      action: 'toggle_status',
      review_id: Number(reviewId),
      status: nextStatus
    })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể cập nhật trạng thái đánh giá!', 'error', 4000);
    return;
  }
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã cập nhật hiển thị đánh giá!', 'success', 3000);
  await loadAdminReviews();
}
window.toggleReviewStatus = toggleReviewStatus;

function normalizeSearchVN(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim();
}

let _adminSearchDebounce = null;
let _adminSearchSeq = 0;

function renderAdminSearchDropdown(rawQuery, matchedPending, matchedBookings, matchedCustomers, isLoadingRemote = false) {
  const resultsBox = document.getElementById('admin-search-results');
  if (!resultsBox) return;

  const total = matchedPending.length + matchedBookings.length + matchedCustomers.length;
  if (total === 0) {
    resultsBox.innerHTML = `
      <div class="p-4 text-center">
        <div class="text-2xl mb-1">${isLoadingRemote ? '⏳' : '🔍'}</div>
        <div class="font-bold text-xs text-[#0F172A]">${isLoadingRemote ? 'Đang tìm trên máy chủ...' : 'Không tìm thấy đơn đặt sân nào'}</div>
        <div class="text-[11px] text-[#64748B] mt-0.5">${isLoadingRemote ? 'Vui lòng chờ giây lát' : `Không có kết quả khớp với "<strong>${escapeSearchHTML(rawQuery)}</strong>"`}</div>
      </div>
    `;
    resultsBox.classList.remove('hidden');
    return;
  }

  let html = `
    <div class="px-3 py-1.5 text-[11px] font-bold text-[#64748B] bg-slate-50 rounded-lg flex items-center justify-between mb-1.5">
      <span>TÌM THẤY ${total} KẾT QUẢ</span>
      <button type="button" onclick="clearAdminSearch()" class="text-slate-400 hover:text-slate-600 text-xs">Đóng</button>
    </div>
  `;

  if (matchedPending.length > 0) {
    matchedPending.slice(0, 8).forEach(p => {
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
            <span>${escapeSearchHTML(p.bank || 'VietQR')} · ${escapeSearchHTML(p.time || '')}</span>
            <span class="text-[#D97706] font-semibold">Xem duyệt cọc →</span>
          </div>
        </div>
      `;
    });
  }

  if (matchedBookings.length > 0) {
    matchedBookings.slice(0, 12).forEach(b => {
      const codeVal = b.code || '';
      const paySt = b.paymentStatus || b.payment_status || '';
      const statusVal = b.status || '';
      const isPending = paySt === 'Chờ duyệt cọc' || statusVal === 'Giữ chỗ';
      const statusBg = isPending ? 'bg-amber-100 text-amber-700' : (statusVal === 'Đang đá' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700');
      html += `
        <div data-code="${escapeSearchHTML(codeVal)}" onclick="viewBookingDetail(this.getAttribute('data-code'))" class="p-2.5 rounded-lg hover:bg-emerald-50 cursor-pointer transition-all border border-transparent hover:border-emerald-200 mb-1">
          <div class="flex items-center justify-between gap-2">
            <span class="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded">${escapeSearchHTML(codeVal)}</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBg}">${escapeSearchHTML(paySt || statusVal)}</span>
          </div>
          <div class="mt-1 text-xs font-semibold text-[#0F172A] flex items-center justify-between">
            <span>${escapeSearchHTML(b.customerName || b.customer_name || 'Khách')} ${b.phone ? '· ' + escapeSearchHTML(b.phone) : ''}</span>
            <span class="font-bold text-[#16A34A]">${Number(b.totalPrice ?? b.total_price ?? 0).toLocaleString('vi-VN')}đ</span>
          </div>
          <div class="text-[11px] text-[#64748B] flex items-center justify-between mt-0.5">
            <span>${escapeSearchHTML(b.pitchName || b.pitch_name || '')} (${escapeSearchHTML(b.slotTime || b.slot_time || '')})</span>
            <span class="text-[#16A34A] font-semibold">Chi tiết đơn →</span>
          </div>
        </div>
      `;
    });
  }

  if (matchedCustomers.length > 0) {
    matchedCustomers.slice(0, 6).forEach(c => {
      html += `
        <div onclick="switchAdminTab('customers'); clearAdminSearch();" class="p-2.5 rounded-lg hover:bg-sky-50 cursor-pointer transition-all border border-transparent hover:border-sky-200 mb-1">
          <div class="flex items-center justify-between gap-2">
            <span class="font-bold text-xs text-[#0F172A]">${escapeSearchHTML(c.full_name || c.name || c.phone || 'Khách hàng')}</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">${escapeSearchHTML(c.phone || '')}</span>
          </div>
          <div class="text-[11px] text-[#64748B] flex items-center justify-between mt-0.5">
            <span>${Number(c.points || 0).toLocaleString('vi-VN')} điểm · ${Number(c.total_bookings || 0)} lượt đặt</span>
            <span class="text-sky-600 font-semibold">Xem CRM →</span>
          </div>
        </div>
      `;
    });
  }

  resultsBox.innerHTML = html;
  resultsBox.classList.remove('hidden');
}

function performAdminSearch() {
  const input = document.getElementById('admin-global-search');
  const resultsBox = document.getElementById('admin-search-results');
  const clearBtn = document.getElementById('admin-search-clear');
  if (!input || !resultsBox) return;

  const rawQuery = input.value.trim();
  const normQuery = normalizeSearchVN(rawQuery);
  if (!normQuery) {
    resultsBox.classList.add('hidden');
    resultsBox.innerHTML = '';
    if (clearBtn) clearBtn.classList.add('hidden');
    if (_adminSearchDebounce) clearTimeout(_adminSearchDebounce);
    return;
  }
  if (clearBtn) clearBtn.classList.remove('hidden');

  const allBookings = typeof window.getLiveBookingsList === 'function' ? window.getLiveBookingsList() : [];
  const pendingPayments = (isManagerOrAdmin() && Array.isArray(window.cachedPendingDeposits)) ? window.cachedPendingDeposits : [];
  const cleanPhoneQ = normQuery.replace(/[\s\.\-]+/g, '');

  const matchedBookings = allBookings.filter(b => {
    const code = normalizeSearchVN(b.code || '');
    const phone = String(b.phone || '').replace(/[\s\.\-]+/g, '').toLowerCase();
    const name = normalizeSearchVN(b.customerName || b.customer_name || '');
    const pitch = normalizeSearchVN(b.pitchName || b.pitch_name || '');
    return code.includes(normQuery) || (cleanPhoneQ.length >= 3 && phone.includes(cleanPhoneQ)) || name.includes(normQuery) || pitch.includes(normQuery);
  });

  const matchedPending = pendingPayments.filter(p => {
    const code = normalizeSearchVN(p.code || '');
    const name = normalizeSearchVN(p.name || '');
    const bank = normalizeSearchVN(p.bank || '');
    return code.includes(normQuery) || name.includes(normQuery) || bank.includes(normQuery);
  });

  const hasLocal = (matchedPending.length + matchedBookings.length) > 0;
  renderAdminSearchDropdown(rawQuery, matchedPending, matchedBookings, [], !hasLocal && normQuery.length >= 2);

  if (!hasLocal || normQuery.length >= 3) {
    if (_adminSearchDebounce) clearTimeout(_adminSearchDebounce);
    const reqSeq = ++_adminSearchSeq;
    _adminSearchDebounce = setTimeout(async () => {
      try {
        const curNorm = normalizeSearchVN(document.getElementById('admin-global-search')?.value || '');
        if (!curNorm || reqSeq !== _adminSearchSeq) return;
        const [ovRes, crmRes] = await Promise.all([
          matchedBookings.length === 0 ? adminFetchJson('../api/admin.php?action=overview') : Promise.resolve(null),
          adminFetchJson(`../api/admin_crm.php?action=crm_customers&q=${encodeURIComponent(rawQuery)}`)
        ]);
        if (reqSeq !== _adminSearchSeq) return;

        let remoteBookings = matchedBookings;
        if (ovRes?.ok && Array.isArray(ovRes.data?.bookings)) {
          const seen = new Set(matchedBookings.map(x => String(x.code || '')));
          const extra = ovRes.data.bookings.filter(b => {
            const c = String(b.code || '');
            if (seen.has(c)) return false;
            const code = normalizeSearchVN(c);
            const phone = String(b.phone || '').replace(/[\s\.\-]+/g, '').toLowerCase();
            const name = normalizeSearchVN(b.customerName || b.customer_name || '');
            const pitch = normalizeSearchVN(b.pitchName || b.pitch_name || '');
            return code.includes(curNorm) || (cleanPhoneQ.length >= 3 && phone.includes(cleanPhoneQ)) || name.includes(curNorm) || pitch.includes(curNorm);
          });
          remoteBookings = matchedBookings.concat(extra);
        }
        const remoteCustomers = (crmRes?.ok && Array.isArray(crmRes.data)) ? crmRes.data : [];
        renderAdminSearchDropdown(rawQuery, matchedPending, remoteBookings, remoteCustomers, false);
      } catch (e) {}
    }, 260);
  }
}

function clearAdminSearch() {
  const input = document.getElementById('admin-global-search');
  const resultsBox = document.getElementById('admin-search-results');
  const clearBtn = document.getElementById('admin-search-clear');
  if (_adminSearchDebounce) clearTimeout(_adminSearchDebounce);
  _adminSearchSeq++;
  if (input) input.value = '';
  if (resultsBox) {
    resultsBox.classList.add('hidden');
    resultsBox.innerHTML = '';
  }
  if (clearBtn) clearBtn.classList.add('hidden');
}

function viewBookingDetail(code) {
  clearAdminSearch();
  if (typeof openInPlayModal === 'function') openInPlayModal(code);
}

document.addEventListener('click', (e) => {
  const searchWrap = document.getElementById('admin-search-wrap');
  const toggleBtn = document.getElementById('admin-mobile-search-toggle');
  if (!searchWrap) return;
  const insideWrap = searchWrap.contains(e.target);
  const insideToggle = toggleBtn ? toggleBtn.contains(e.target) : false;
  if (!insideWrap && !insideToggle) {
    const resultsBox = document.getElementById('admin-search-results');
    if (resultsBox) resultsBox.classList.add('hidden');
    if (window.innerWidth < 640 && !searchWrap.classList.contains('hidden')) {
      searchWrap.classList.add('hidden');
    }
  }
});

window.performAdminSearch = performAdminSearch;
window.clearAdminSearch = clearAdminSearch;
window.viewBookingDetail = viewBookingDetail;

;
/* === admin_customers.js === */
﻿/**
 * admin_customers.js - Quản lý Khách hàng & Hội viên (CRM) Sân Bóng Pro
 * Phiên bản chuẩn hóa: Purge sạch nợ, bảng dữ liệu sinh từ mảng cấu hình cột duy nhất,
 * Modal CRM hợp nhất một biểu mẫu lưu duy nhất.
 */

let crmCustomersFetchSeq = 0;
let currentCustomerFilter = 'all';
let adminCustomersCache = [];
let currentCrmBookings = [];
let currentCrmBookingsPage = 1;
const CRM_BOOKINGS_PAGE_SIZE = 5;
let currentCrmPointsLog = [];
let currentCrmPointsLogPage = 1;
const CRM_POINTS_PAGE_SIZE = 10;
let currentCrmAuditLogs = [];
let currentCrmAuditLogsPage = 1;
const CRM_AUDIT_PAGE_SIZE = 10;

window.crmCustomersFetchSeq = crmCustomersFetchSeq;
window.currentCustomerFilter = currentCustomerFilter;

/* ==========================================================================
   BỘ LỌC & TÌM KIẾM KHÁCH HÀNG
   ========================================================================== */

function filterAdminCustomers(filterType) {
  currentCustomerFilter = filterType === 'vip' ? 'vip' : 'all';
  window.currentCustomerFilter = currentCustomerFilter;
  const mapBtn = {
    'all': 'cust-filter-all',
    'vip': 'cust-filter-vip'
  };
  Object.keys(mapBtn).forEach(k => {
    const btn = document.getElementById(mapBtn[k]);
    if (!btn) return;
    if (k === currentCustomerFilter) {
      btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white shadow-sm cursor-pointer';
    } else {
      btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 cursor-pointer';
    }
  });
  renderAdminCustomers();
}
window.filterAdminCustomers = filterAdminCustomers;

let custSearchDebounceTimer = null;
function handleCustomerSearchDebounced() {
  clearTimeout(custSearchDebounceTimer);
  custSearchDebounceTimer = setTimeout(() => {
    renderAdminCustomers();
  }, 250);
}
window.handleCustomerSearchDebounced = handleCustomerSearchDebounced;

/* ==========================================================================
   HÀM TIỆN ÍCH ĐỊNH DẠNG NGÀY & ĐIỆN THOẠI
   ========================================================================== */

function normalizeCustomerPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length === 11 && digits.startsWith('84') ? `0${digits.slice(2)}` : digits;
}

function formatAdminCustomerBookingDate(value) {
  const raw = String(value || '').trim();
  if (!raw || raw === '—') return '—';

  const isoDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function formatCustomerLastBookingRelative(dateVal) {
  if (!dateVal) return '—';
  const raw = String(dateVal).trim();
  if (!raw || raw === '—') return '—';

  let d;
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    d = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  } else {
    d = new Date(raw);
  }
  if (Number.isNaN(d.getTime())) return '—';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);

  const diffDays = Math.round((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Hôm nay';
  if (diffDays > 0) return `${diffDays} ngày trước`;
  return 'Sắp tới';
}

/* ==========================================================================
   CẤU HÌNH CỘT DUY NHẤT (SINGLE COLUMN DEFINITION ARRAY)
   Sinh cả thead lẫn tbody để chống lệch cột 100%.
   Các cột chính xác:
   Tên hội viên | Số điện thoại | Hạng | Trận hoàn thành | Điểm tích lũy | Đặt gần nhất | Tổng chi tiêu | Thao tác
   ========================================================================== */

function normalizeCustomerTier(rawTier) {
  const t = String(rawTier || '').trim().toLowerCase();
  if (t === 'vip') return 'vip';
  if (t === 'auto') return 'auto';
  return 'standard';
}

const crmBadgeMap = {
  vip: '<span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">VIP</span>',
  standard: '<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">Tiêu chuẩn</span>'
};

const CUSTOMER_TABLE_COLUMNS = [
  {
    key: 'name',
    label: 'Tên hội viên',
    thClass: 'py-3 px-4 text-left font-bold',
    tdClass: 'py-3 px-4',
    render: (c) => {
      const ns = Number(c.noShowCount || 0);
      const noShowBadge = ns > 0
        ? `<span class="ml-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">${ns} lần bùng</span>`
        : '';
      const noteHtml = c.adminNote
        ? `<div class="text-[10px] text-[#64748B] truncate max-w-[200px]" title="${escapeSearchHTML(c.adminNote)}">Ghi chú: ${escapeSearchHTML(c.adminNote)}</div>`
        : '';
      return `
        <div class="font-bold text-[#0F172A] flex items-center flex-wrap">
          <span>${escapeSearchHTML(c.name)}</span>${noShowBadge}
        </div>
        ${noteHtml}
      `;
    }
  },
  {
    key: 'phone',
    label: 'Số điện thoại',
    thClass: 'py-3 px-4 text-left font-bold',
    tdClass: 'py-3 px-4 font-mono font-medium text-[#475569]',
    render: (c) => escapeSearchHTML(c.phone)
  },
  {
    key: 'tier',
    label: 'Hạng',
    thClass: 'py-3 px-4 text-left font-bold',
    tdClass: 'py-3 px-4 whitespace-nowrap',
    render: (c) => crmBadgeMap[normalizeCustomerTier(c.customerTier)] || crmBadgeMap.standard
  },
  {
    key: 'completedCount',
    label: 'Trận hoàn thành',
    thClass: 'py-3 px-4 text-right font-bold',
    tdClass: 'py-3 px-4 text-right font-medium text-[#334155]',
    render: (c) => String(Number(c.completedCount ?? c.matches ?? 0))
  },
  {
    key: 'points',
    label: 'Điểm tích lũy',
    thClass: 'py-3 px-4 text-right font-bold',
    tdClass: 'py-3 px-4 text-right font-bold text-[#16A34A]',
    render: (c) => `${Number(c.points || 0).toLocaleString('vi-VN')} điểm`
  },
  {
    key: 'lastBooking',
    label: 'Đặt gần nhất',
    thClass: 'py-3 px-4 text-left font-bold',
    tdClass: 'py-3 px-4 whitespace-nowrap text-[#475569] font-medium',
    render: (c) => escapeSearchHTML(c.lastBookingRelative || formatCustomerLastBookingRelative(c.lastBookingDate))
  },
  {
    key: 'spend',
    label: 'Tổng chi tiêu',
    thClass: 'py-3 px-4 text-right font-bold',
    tdClass: 'py-3 px-4 text-right font-extrabold text-[#0F172A]',
    render: (c) => `${Number(c.spend || 0).toLocaleString('vi-VN')}đ`
  },
  {
    key: 'actions',
    label: 'Thao tác',
    thClass: 'py-3 px-4 text-right font-bold',
    tdClass: 'py-3 px-4 text-right whitespace-nowrap',
    render: (c) => {
      const safePhoneAttr = escapeJsAttr(c.phone);
      return `
        <button type="button" onclick="openCustomerCrmModal('${safePhoneAttr}')" class="px-2.5 py-1 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-[11px] cursor-pointer inline-flex items-center gap-1 shadow-xs transition-colors">
          <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
          <span>Hồ sơ CRM</span>
        </button>
      `;
    }
  }
];

function renderCustomerTableHeader() {
  const thead = document.getElementById('admin-customers-thead');
  if (!thead) return;
  thead.innerHTML = `<tr>${CUSTOMER_TABLE_COLUMNS.map(col => `<th class="${col.thClass}">${col.label}</th>`).join('')}</tr>`;
}

/* ==========================================================================
   TẢI VÀ RENDER DANH SÁCH KHÁCH HÀNG
   ========================================================================== */

async function renderAdminCustomers() {
  const tbody = document.getElementById('admin-customers-tbody');
  if (!tbody) return;

  renderCustomerTableHeader();

  const seq = ++crmCustomersFetchSeq;
  const searchQ = (document.getElementById('admin-cust-search')?.value || '').trim();
  const apiTier = currentCustomerFilter || 'all';

  const apiUrl = searchQ
    ? `../api/admin.php?action=search_customers&search=${encodeURIComponent(searchQ)}`
    : `../api/admin.php?action=crm_customers&tier=${encodeURIComponent(apiTier)}`;

  const r = await adminFetchJson(apiUrl);
  if (seq !== crmCustomersFetchSeq) return;

  let customers = [];
  if (r.ok && Array.isArray(r.data)) {
    customers = r.data.map(c => ({
      id: c.id || c.user_id || null,
      userId: c.user_id || c.id || null,
      name: c.customerName || c.customer_name || c.full_name || c.name || 'Khách đặt sân',
      phone: c.phone || '',
      email: c.email || '',
      customerTier: normalizeCustomerTier(c.customerTier || c.customer_tier || 'standard'),
      adminNote: c.adminNote || c.admin_note || '',
      bookingCount: Number(c.totalBookings ?? c.total_bookings ?? 0),
      matches: Number(c.completedCount ?? c.completed_count ?? 0),
      completedCount: Number(c.completedCount ?? c.completed_count ?? 0),
      noShowCount: Number(c.noShowCount ?? c.noshow_count ?? c.no_show_count ?? 0),
      spend: Number(c.totalSpent ?? c.total_spent ?? 0),
      points: Number(c.points ?? c.loyalty_points ?? 0),
      updatedAt: c.updated_at || '',
      isMember: Boolean(c.is_member ?? c.user_id),
      lastBookingDate: c.lastBookingDate || c.last_booking_date || '',
      lastBookingRelative: c.lastBookingRelative || formatCustomerLastBookingRelative(c.lastBookingDate || c.last_booking_date)
    }));

    if (currentCustomerFilter === 'vip') {
      customers = customers.filter(c => c.customerTier === 'vip');
    }
  } else if (!r.ok && r.status === 0) {
    // Offline fallback an toàn từ SanBongDB
    const db = window.SanBongApp?.SanBongDB;
    const allBookings = db?.getAllBookings ? db.getAllBookings() : [];
    const customerMap = {};
    allBookings.forEach(b => {
      const phone = (b.phone || '').trim();
      const cleanP = normalizeCustomerPhone(phone);
      if (!cleanP) return;
      if (!customerMap[cleanP]) {
        customerMap[cleanP] = {
          name: b.customerName || 'Khách đặt sân',
          phone,
          customerTier: 'standard',
          adminNote: '',
          bookingCount: 0,
          matches: 0,
          completedCount: 0,
          noShowCount: 0,
          spend: 0,
          points: 0,
          lastBookingDate: '',
          lastBookingRelative: '—'
        };
      }
      const total = Number(b.totalPrice || 0);
      const st = String(b.status || '');
      const paySt = String(b.paymentStatus || b.payment_status || '');
      const isCancelled = st === 'Đã hủy';
      const paidAmountValue = b.paidAmount ?? b.paid_amount;
      const paidAmount = paidAmountValue !== undefined && paidAmountValue !== null
        ? Number(paidAmountValue)
        : (paySt === 'Đã cọc 30%'
          ? Number(b.depositAmount || b.deposit_amount || Math.round(total * 0.3))
          : (['Đã thanh toán đủ', 'Đã thanh toán 100%'].includes(paySt) ? total : 0));

      if (!isCancelled) customerMap[cleanP].bookingCount += 1;
      if (st === 'Hoàn thành') {
        customerMap[cleanP].completedCount += 1;
        customerMap[cleanP].matches += 1;
      }
      if (!isCancelled) customerMap[cleanP].spend += paidAmount;
      customerMap[cleanP].points = Number(b.points ?? b.loyalty_points ?? Math.floor(customerMap[cleanP].spend / 10000));
      if (st === 'Khách chưa đến' || st.includes('No-Show') || paySt === 'Tịch thu cọc 30%') {
        customerMap[cleanP].noShowCount += 1;
      }

      const bDate = b.bookingDate || b.booking_date || b.date || '';
      if (!isCancelled && bDate && (!customerMap[cleanP].lastBookingDate || bDate > customerMap[cleanP].lastBookingDate)) {
        customerMap[cleanP].lastBookingDate = bDate;
      }
    });

    Object.values(customerMap).forEach(c => {
      c.lastBookingRelative = formatCustomerLastBookingRelative(c.lastBookingDate);
    });

    customers = Object.values(customerMap);
    if (currentCustomerFilter === 'vip') customers = customers.filter(c => c.customerTier === 'vip');
    if (searchQ) {
      const qLow = searchQ.toLowerCase();
      customers = customers.filter(c => c.name.toLowerCase().includes(qLow) || c.phone.includes(searchQ));
    }
  } else {
    tbody.innerHTML = `<tr><td colspan="${CUSTOMER_TABLE_COLUMNS.length}" class="py-8 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải danh sách khách hàng CRM.')}</td></tr>`;
    return;
  }

  adminCustomersCache = customers;
  customers.sort((a, b) => (b.noShowCount - a.noShowCount) || (b.spend - a.spend));

  if (customers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="${CUSTOMER_TABLE_COLUMNS.length}" class="py-12 text-center text-[#64748B]">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-3">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <div class="font-heading font-bold text-sm text-[#0F172A]">Không tìm thấy hội viên</div>
          <div class="text-[11px] text-[#94A3B8] mt-1">${searchQ ? 'Không có hội viên nào phù hợp với số điện thoại hoặc họ tên này' : 'Không có hội viên nào trong bộ lọc này'}</div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = customers.map(c => `
    <tr class="hover:bg-slate-50 transition-colors">
      ${CUSTOMER_TABLE_COLUMNS.map(col => `<td class="${col.tdClass}">${col.render(c)}</td>`).join('')}
    </tr>
  `).join('');
}
window.renderAdminCustomers = renderAdminCustomers;

/* ==========================================================================
   MODAL HỒ SƠ CRM & QUẢN LÝ HỘI VIÊN (UNIFIED EDIT PATH)
   ========================================================================== */

function handleCrmTierChange() {
  const currentVal = document.getElementById('crm-form-tier')?.value;
  const oldVal = document.getElementById('crm-form-old-tier')?.value;
  const reasonWrap = document.getElementById('crm-form-tier-reason-wrap');
  const reasonInput = document.getElementById('crm-form-tier-reason');

  if (currentVal && oldVal && currentVal !== oldVal && currentVal !== 'auto') {
    if (reasonWrap) reasonWrap.classList.remove('hidden');
    if (reasonInput) reasonInput.required = true;
  } else {
    if (reasonWrap) reasonWrap.classList.add('hidden');
    if (reasonInput) {
      reasonInput.required = false;
      reasonInput.value = '';
    }
  }
}
window.handleCrmTierChange = handleCrmTierChange;

function validateCrmReasonClient(rawReason, minLen = 10) {
  const normalized = String(rawReason || '').replace(/\s+/g, ' ').trim();
  if (normalized.length < minLen) {
    return { valid: false, message: `Lý do bắt buộc phải từ ${minLen} ký tự trở lên.` };
  }
  const compact = normalized.replace(/\s+/g, '').toLowerCase();
  const chars = Array.from(compact);
  if (chars.length < 6) {
    return { valid: false, message: 'Lý do quá ngắn hoặc chứa nhiều khoảng trắng.' };
  }
  const freq = {};
  chars.forEach(ch => { freq[ch] = (freq[ch] || 0) + 1; });
  const counts = Object.values(freq).sort((a, b) => b - a);
  const distinct = counts.length;
  if (distinct < 4) {
    return { valid: false, message: 'Lý do không hợp lệ (quá ít ký tự phân biệt hoặc lặp ký tự).' };
  }
  if (/^(.{1,5})\1+$/.test(compact) || /(.)\1{3,}/.test(compact)) {
    return { valid: false, message: 'Lý do không được là chuỗi lặp ký tự vô nghĩa.' };
  }
  if (!/\p{L}/u.test(normalized)) {
    return { valid: false, message: 'Lý do phải chứa nội dung chữ có ý nghĩa.' };
  }
  const top1 = counts[0] || 0;
  const top2 = top1 + (counts[1] || 0);
  if (top1 / chars.length > 0.4 || distinct / chars.length < 0.35 || (chars.length >= 12 && top2 / chars.length >= 0.6 && distinct <= 5)) {
    return { valid: false, message: 'Lý do chưa rõ ràng hoặc có dấu hiệu ký tự rác.' };
  }
  return { valid: true, reason: normalized };
}

function handleCrmPointsChange(source) {
  const oldPoints = Number(document.getElementById('crm-form-old-points')?.value || 0);
  const pointsEl = document.getElementById('crm-form-points');
  const deltaEl = document.getElementById('crm-form-points-delta');
  const hintEl = document.getElementById('crm-points-diff-hint');
  const reasonWrap = document.getElementById('crm-form-points-reason-wrap');
  const reasonInput = document.getElementById('crm-form-points-reason');

  let newPoints = oldPoints;

  if (source === 'absolute') {
    const rawVal = pointsEl?.value;
    newPoints = rawVal === '' ? oldPoints : Math.max(0, Number(rawVal));
    const diff = newPoints - oldPoints;
    if (deltaEl) deltaEl.value = diff !== 0 ? diff : '';
  } else if (source === 'delta') {
    const rawDelta = deltaEl?.value;
    const delta = rawDelta === '' ? 0 : Number(rawDelta);
    newPoints = Math.max(0, oldPoints + delta);
    if (pointsEl) pointsEl.value = newPoints;
  }

  const finalDiff = newPoints - oldPoints;
  if (finalDiff !== 0) {
    if (hintEl) {
      hintEl.classList.remove('hidden');
      if (finalDiff > 0) {
        hintEl.textContent = `Tăng +${finalDiff.toLocaleString('vi-VN')} điểm`;
        hintEl.className = 'text-xs font-bold text-emerald-600';
      } else {
        hintEl.textContent = `Giảm ${finalDiff.toLocaleString('vi-VN')} điểm`;
        hintEl.className = 'text-xs font-bold text-rose-600';
      }
    }
    if (reasonWrap) reasonWrap.classList.remove('hidden');
    if (reasonInput) reasonInput.required = true;
  } else {
    if (hintEl) hintEl.classList.add('hidden');
    if (reasonWrap) reasonWrap.classList.add('hidden');
    if (reasonInput) {
      reasonInput.required = false;
      reasonInput.value = '';
    }
  }
}
window.handleCrmPointsChange = handleCrmPointsChange;

/* Subtab switching inside Customer CRM Modal */
function switchCrmSubTab(tab) {
  const subtabs = ['bookings', 'points', 'audit'];
  subtabs.forEach(t => {
    const btn = document.getElementById(`crm-subtab-${t}-btn`);
    const pane = document.getElementById(`crm-subtab-${t}`);
    if (t === tab) {
      if (btn) btn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0F172A] text-white cursor-pointer';
      if (pane) pane.classList.remove('hidden');
    } else {
      if (btn) btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer';
      if (pane) pane.classList.add('hidden');
    }
  });
}
window.switchCrmSubTab = switchCrmSubTab;

/* ==========================================================================
   RENDER 3 PHẦN LỊCH SỬ TRONG MODAL CRM
   ========================================================================== */

function renderCrmBookings() {
  const tbody = document.getElementById('crm-history-tbody');
  const badgeEl = document.getElementById('crm-bookings-count-badge');
  const paginationEl = document.getElementById('crm-bookings-pagination');
  if (!tbody) return;

  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');
  const list = currentCrmBookings || [];
  if (badgeEl) badgeEl.textContent = String(list.length);

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="py-5 text-center text-[#94A3B8]">Khách chưa có lịch sử đặt sân nào.</td></tr>';
    if (paginationEl) paginationEl.innerHTML = '';
    return;
  }

  // Sắp xếp mới nhất lên đầu (newest first)
  list.sort((a, b) => {
    const da = String(a.booking_date || a.bookingDate || a.date || '');
    const db = String(b.booking_date || b.bookingDate || b.date || '');
    if (da !== db) return db.localeCompare(da);
    return Number(b.id || 0) - Number(a.id || 0);
  });

  const todayStr = typeof window.getLocalTodayISO === 'function'
    ? window.getLocalTodayISO()
    : (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })();
  const totalShown = Math.min(list.length, currentCrmBookingsPage * CRM_BOOKINGS_PAGE_SIZE);
  const pagedList = list.slice(0, totalShown);

  tbody.innerHTML = pagedList.map(b => {
    const bDate = String(b.booking_date || b.bookingDate || b.date || '');
    const isFuture = bDate >= todayStr && b.status !== 'Đã hủy' && b.status !== 'Hoàn thành';
    const futureBadge = isFuture
      ? '<span class="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">Sắp tới</span>'
      : '';

    const formattedDate = formatAdminCustomerBookingDate(bDate);

    const isCancelled = (b.status === 'Đã hủy');
    const statusBadge = isCancelled
      ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">Đã hủy</span>'
      : (b.status === 'Hoàn thành'
        ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Hoàn thành</span>'
        : `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700">${escapeSearchHTML(b.status || '')}</span>`);

    return `
      <tr class="hover:bg-slate-50">
        <td class="py-2 px-3 font-mono font-bold text-[#0F172A]">#${escapeSearchHTML(b.code || '')}</td>
        <td class="py-2 px-3">
          <div class="font-bold text-[#0F172A] flex items-center">${escapeSearchHTML(formattedDate)}${futureBadge}</div>
          <div class="text-[11px] text-[#64748B]">${escapeSearchHTML(b.pitch_name || b.pitchName || b.pitch_id || '')}</div>
        </td>
        <td class="py-2 px-3 font-semibold text-[#334155]">${escapeSearchHTML(b.slot_time || b.slotTime || '')}</td>
        <td class="py-2 px-3 text-right font-bold text-[#0F172A]">${escapeSearchHTML(fmt(b.total_price ?? b.totalPrice ?? 0))}</td>
        <td class="py-2 px-3 text-right">
          <div>${statusBadge}</div>
          <div class="text-[10px] text-[#64748B] mt-0.5">${escapeSearchHTML(b.payment_status || b.paymentStatus || '')}</div>
        </td>
      </tr>
    `;
  }).join('');

  if (paginationEl) {
    if (totalShown < list.length) {
      paginationEl.innerHTML = `
        <span>Đang hiển thị ${totalShown} / ${list.length} ca</span>
        <button type="button" onclick="loadMoreCrmBookings()" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer">
          Xem thêm (${list.length - totalShown} ca tiếp) »
        </button>
      `;
    } else {
      paginationEl.innerHTML = `<span>Hiển thị toàn bộ ${list.length} ca</span>`;
    }
  }
}

function loadMoreCrmBookings() {
  currentCrmBookingsPage++;
  renderCrmBookings();
}
window.loadMoreCrmBookings = loadMoreCrmBookings;

function renderCrmPointsLog() {
  const tbody = document.getElementById('crm-points-log-tbody');
  const badgeEl = document.getElementById('crm-points-count-badge');
  const paginationEl = document.getElementById('crm-points-log-pagination');
  if (!tbody) return;

  const list = currentCrmPointsLog || [];
  if (badgeEl) badgeEl.textContent = String(list.length);

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="py-5 text-center text-[#94A3B8]">Chưa có biến động điểm thưởng nào.</td></tr>';
    if (paginationEl) paginationEl.innerHTML = '';
    return;
  }

  const totalShown = Math.min(list.length, currentCrmPointsLogPage * CRM_POINTS_PAGE_SIZE);
  const pagedList = list.slice(0, totalShown);

  tbody.innerHTML = pagedList.map(item => {
    const delta = Number(item.delta || item.points_delta || 0);
    const deltaClass = delta > 0 ? 'text-emerald-700 font-bold' : (delta < 0 ? 'text-rose-600 font-bold' : 'text-slate-600');
    const deltaSign = delta > 0 ? `+${delta.toLocaleString('vi-VN')}` : delta.toLocaleString('vi-VN');
    const balAfter = item.balance_after ?? item.points_after;
    const balText = balAfter !== undefined && balAfter !== null ? `${Number(balAfter).toLocaleString('vi-VN')} điểm` : '—';

    return `
      <tr class="hover:bg-slate-50">
        <td class="py-2 px-3 text-[#475569] whitespace-nowrap">${escapeSearchHTML(item.created_at || item.time || '—')}</td>
        <td class="py-2 px-3 text-right ${deltaClass} whitespace-nowrap">${deltaSign} điểm</td>
        <td class="py-2 px-3 text-right font-bold text-[#0F172A] whitespace-nowrap">${balText}</td>
        <td class="py-2 px-3 text-[#334155] max-w-[200px] truncate" title="${escapeSearchHTML(item.reason || '')}">${escapeSearchHTML(item.reason || 'Điều chỉnh điểm')}</td>
        <td class="py-2 px-3 text-[#64748B] whitespace-nowrap">${escapeSearchHTML(item.admin_name || item.created_by || item.actor || 'Hệ thống')}</td>
      </tr>
    `;
  }).join('');

  if (paginationEl) {
    if (totalShown < list.length) {
      paginationEl.innerHTML = `
        <span>Đang hiển thị ${totalShown} / ${list.length} lượt</span>
        <button type="button" onclick="loadMoreCrmPointsLog()" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer">
          Xem thêm (${list.length - totalShown} lượt) »
        </button>
      `;
    } else {
      paginationEl.innerHTML = `<span>Hiển thị toàn bộ ${list.length} lượt</span>`;
    }
  }
}

function loadMoreCrmPointsLog() {
  currentCrmPointsLogPage++;
  renderCrmPointsLog();
}
window.loadMoreCrmPointsLog = loadMoreCrmPointsLog;

function renderCrmAuditLogs() {
  const tbody = document.getElementById('crm-audit-log-tbody');
  const badgeEl = document.getElementById('crm-audit-count-badge');
  const paginationEl = document.getElementById('crm-audit-log-pagination');
  if (!tbody) return;

  const list = currentCrmAuditLogs || [];
  if (badgeEl) badgeEl.textContent = String(list.length);

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="py-5 text-center text-[#94A3B8]">Chưa có lịch sử chỉnh sửa hồ sơ.</td></tr>';
    if (paginationEl) paginationEl.innerHTML = '';
    return;
  }

  const totalShown = Math.min(list.length, currentCrmAuditLogsPage * CRM_AUDIT_PAGE_SIZE);
  const pagedList = list.slice(0, totalShown);

  tbody.innerHTML = pagedList.map(log => {
    let actionDesc = log.action || log.description || log.message || '';
    if (log.details && typeof log.details === 'object') {
      try {
        actionDesc += ' ' + JSON.stringify(log.details);
      } catch (e) {}
    }

    return `
      <tr class="hover:bg-slate-50">
        <td class="py-2 px-3 text-[#475569] whitespace-nowrap">${escapeSearchHTML(log.created_at || log.time || '—')}</td>
        <td class="py-2 px-3 font-semibold text-[#0F172A] whitespace-nowrap">${escapeSearchHTML(log.admin_name || log.username || log.actor || 'Quản trị viên')}</td>
        <td class="py-2 px-3 text-[#334155] max-w-[260px] truncate" title="${escapeSearchHTML(actionDesc)}">${escapeSearchHTML(actionDesc)}</td>
        <td class="py-2 px-3 font-mono text-[11px] text-[#64748B] whitespace-nowrap">${escapeSearchHTML(log.ip_address || log.ip || '—')}</td>
      </tr>
    `;
  }).join('');

  if (paginationEl) {
    if (totalShown < list.length) {
      paginationEl.innerHTML = `
        <span>Đang hiển thị ${totalShown} / ${list.length} bản ghi</span>
        <button type="button" onclick="loadMoreCrmAuditLogs()" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer">
          Xem thêm (${list.length - totalShown} bản ghi) »
        </button>
      `;
    } else {
      paginationEl.innerHTML = `<span>Hiển thị toàn bộ ${list.length} bản ghi</span>`;
    }
  }
}

function loadMoreCrmAuditLogs() {
  currentCrmAuditLogsPage++;
  renderCrmAuditLogs();
}
window.loadMoreCrmAuditLogs = loadMoreCrmAuditLogs;

/* ==========================================================================
   MỞ MODAL CRM & ĐỒNG BỘ DỮ LIỆU
   ========================================================================== */

async function openCustomerCrmModal(phone) {
  const modal = document.getElementById('customer-crm-modal');
  if (!modal) return;

  const phoneLbl = document.getElementById('crm-phone-label');
  const tierBadge = document.getElementById('crm-tier-badge');
  const statsEl = document.getElementById('crm-summary-stats');

  const userIdEl = document.getElementById('crm-form-user-id');
  const updatedAtEl = document.getElementById('crm-form-updated-at');
  const oldPhoneEl = document.getElementById('crm-form-old-phone');
  const formPhoneEl = document.getElementById('crm-form-phone');
  const nameEl = document.getElementById('crm-form-name');
  const emailEl = document.getElementById('crm-form-email');
  const tierEl = document.getElementById('crm-form-tier');
  const oldTierEl = document.getElementById('crm-form-old-tier');
  const tierReasonWrap = document.getElementById('crm-form-tier-reason-wrap');
  const tierReasonEl = document.getElementById('crm-form-tier-reason');
  const oldPointsEl = document.getElementById('crm-form-old-points');
  const pointsEl = document.getElementById('crm-form-points');
  const deltaEl = document.getElementById('crm-form-points-delta');
  const curPointsBadge = document.getElementById('crm-current-points-badge');
  const pointsHint = document.getElementById('crm-points-diff-hint');
  const pointsReasonWrap = document.getElementById('crm-form-points-reason-wrap');
  const pointsReasonEl = document.getElementById('crm-form-points-reason');
  const noteEl = document.getElementById('crm-form-note');

  if (phoneLbl) phoneLbl.textContent = phone || '---';
  if (tierBadge) tierBadge.innerHTML = crmBadgeMap.standard;
  if (oldPhoneEl) oldPhoneEl.value = phone || '';
  if (formPhoneEl) formPhoneEl.value = phone || '';

  // Điền dữ liệu từ cache tạm thời để giao diện phản hồi tức thì
  const cached = adminCustomersCache.find(c => c.phone === phone);
  if (cached) {
    const cachedTier = normalizeCustomerTier(cached.customerTier || 'standard');
    if (nameEl) nameEl.value = cached.name || '';
    if (emailEl) emailEl.value = cached.email || '';
    if (tierEl) tierEl.value = cachedTier;
    if (oldTierEl) oldTierEl.value = cachedTier;
    if (noteEl) noteEl.value = cached.adminNote || '';
    if (userIdEl) userIdEl.value = cached.userId || cached.id || '';
    if (updatedAtEl) updatedAtEl.value = cached.updatedAt || '';
    const pts = Number(cached.points || 0);
    if (oldPointsEl) oldPointsEl.value = pts;
    if (pointsEl) pointsEl.value = pts;
    if (curPointsBadge) curPointsBadge.textContent = `${pts.toLocaleString('vi-VN')} điểm`;
    if (tierBadge) tierBadge.innerHTML = crmBadgeMap[cachedTier] || crmBadgeMap.standard;
  }

  // Reset các ô bổ sung
  if (deltaEl) deltaEl.value = '';
  if (pointsHint) pointsHint.classList.add('hidden');
  if (pointsReasonWrap) pointsReasonWrap.classList.add('hidden');
  if (pointsReasonEl) {
    pointsReasonEl.value = '';
    pointsReasonEl.required = false;
  }
  if (tierReasonWrap) tierReasonWrap.classList.add('hidden');
  if (tierReasonEl) {
    tierReasonEl.value = '';
    tierReasonEl.required = false;
  }

  // 4 Thẻ chỉ số đỉnh: Trận hoàn thành | Vắng mặt / Hủy | Điểm tích lũy | Tổng chi tiêu
  if (statsEl) {
    statsEl.innerHTML = '<div class="col-span-4 py-3 text-center text-[#64748B]">Đang tải chỉ số CRM...</div>';
  }

  // Reset phân trang và các mảng lịch sử
  currentCrmBookings = [];
  currentCrmBookingsPage = 1;
  currentCrmPointsLog = [];
  currentCrmPointsLogPage = 1;
  currentCrmAuditLogs = [];
  currentCrmAuditLogsPage = 1;

  switchCrmSubTab('bookings');

  modal.classList.remove('hidden');
  modal.classList.add('flex');

  // Gọi API lấy dữ liệu chi tiết
  const r = await adminFetchJson(`../api/admin.php?action=customer_detail&phone=${encodeURIComponent(phone)}`);
  if (!r.ok || !r.data) {
    if (statsEl) {
      statsEl.innerHTML = `<div class="col-span-4 py-3 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải chi tiết hồ sơ khách hàng.')}</div>`;
    }
    renderCrmBookings();
    renderCrmPointsLog();
    renderCrmAuditLogs();
    return;
  }

  const d = r.data;
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  if (nameEl && (d.customerName || d.customer_name || d.name)) {
    nameEl.value = d.customerName || d.customer_name || d.name;
  }
  if (emailEl && d.email !== undefined) emailEl.value = d.email || '';
  if (tierEl) {
    const assignedTier = normalizeCustomerTier(d.customerTier || d.customer_tier || 'standard');
    tierEl.value = assignedTier;
    if (oldTierEl) oldTierEl.value = assignedTier;
    if (tierBadge) tierBadge.innerHTML = crmBadgeMap[assignedTier] || crmBadgeMap.standard;
  }
  if (noteEl) noteEl.value = d.adminNote || d.admin_note || '';
  if (userIdEl) userIdEl.value = d.userId || d.user_id || userIdEl.value || '';
  if (updatedAtEl) updatedAtEl.value = d.updated_at || d.updatedAt || updatedAtEl.value || '';

  const serverPoints = Number(d.points ?? d.loyalty_points ?? 0);
  if (oldPointsEl) oldPointsEl.value = serverPoints;
  if (pointsEl) pointsEl.value = serverPoints;
  if (curPointsBadge) curPointsBadge.textContent = `${serverPoints.toLocaleString('vi-VN')} điểm`;

  // Render chính xác 4 thẻ đỉnh: Trận hoàn thành, Vắng mặt/Hủy, Điểm tích lũy, Tổng chi tiêu
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
        <div class="text-[11px] text-[#64748B]">Trận hoàn thành</div>
        <div class="font-heading font-extrabold text-lg text-emerald-700 mt-0.5">${Number(d.completedCount || 0)}</div>
        <div class="text-[10px] text-[#64748B]">Tổng ${Number(d.totalBookings || 0)} trận đã đặt</div>
      </div>
      <div class="p-3 rounded-xl bg-amber-50 border border-amber-200">
        <div class="text-[11px] text-[#64748B]">Vắng mặt / Hủy</div>
        <div class="font-heading font-extrabold text-lg text-amber-700 mt-0.5">${Number(d.noShowCount || 0)} / ${Number(d.cancelledCount || 0)}</div>
        <div class="text-[10px] text-[#64748B]">No-Show / Đã hủy</div>
      </div>
      <div class="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
        <div class="text-[11px] text-[#64748B]">Điểm tích lũy</div>
        <div class="font-heading font-extrabold text-lg text-indigo-700 mt-0.5">${serverPoints.toLocaleString('vi-VN')} điểm</div>
        <div class="text-[10px] text-[#64748B]">Khả dụng đổi quà / ưu đãi</div>
      </div>
      <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
        <div class="text-[11px] text-[#64748B]">Tổng chi tiêu</div>
        <div class="font-heading font-extrabold text-lg text-[#16A34A] mt-0.5">${escapeSearchHTML(fmt(d.totalSpent || 0))}</div>
        <div class="text-[10px] text-[#64748B]">Tích lũy thanh toán</div>
      </div>
    `;
  }

  // Danh sách đặt sân
  currentCrmBookings = Array.isArray(d.bookings) ? d.bookings : [];
  renderCrmBookings();

  // Danh sách lịch sử điểm tích lũy
  if (Array.isArray(d.points_log)) {
    currentCrmPointsLog = d.points_log;
    renderCrmPointsLog();
  } else {
    // Gọi fallback nếu chưa có trong customer_detail
    adminFetchJson(`../api/admin.php?action=customer_points_log&phone=${encodeURIComponent(phone)}&limit=20`)
      .then(res => {
        if (res.ok && Array.isArray(res.data)) {
          currentCrmPointsLog = res.data;
          renderCrmPointsLog();
        } else {
          renderCrmPointsLog();
        }
      })
      .catch(() => renderCrmPointsLog());
  }

  // Danh sách lịch sử chỉnh sửa hồ sơ (Audit Log)
  if (Array.isArray(d.audit_logs)) {
    currentCrmAuditLogs = d.audit_logs;
    renderCrmAuditLogs();
  } else {
    // Gọi fallback nếu chưa có trong customer_detail
    adminFetchJson(`../api/admin.php?action=customer_audit_logs&phone=${encodeURIComponent(phone)}&limit=20`)
      .then(res => {
        if (res.ok && Array.isArray(res.data)) {
          currentCrmAuditLogs = res.data;
          renderCrmAuditLogs();
        } else {
          renderCrmAuditLogs();
        }
      })
      .catch(() => renderCrmAuditLogs());
  }
}
window.openCustomerCrmModal = openCustomerCrmModal;

function closeCustomerCrmModal() {
  const modal = document.getElementById('customer-crm-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}
window.closeCustomerCrmModal = closeCustomerCrmModal;

/* ==========================================================================
   LƯU BIỂU MẪU HỢP NHẤT HỒ SƠ HỘI VIÊN (ONE SAVE BUTTON)
   ========================================================================== */

async function saveCustomerCrm(e) {
  if (e && e.preventDefault) e.preventDefault();

  const userId = Number(document.getElementById('crm-form-user-id')?.value || 0);
  const updatedAt = (document.getElementById('crm-form-updated-at')?.value || '').trim();
  const phone = (document.getElementById('crm-form-phone')?.value || '').trim();
  const customerName = (document.getElementById('crm-form-name')?.value || '').trim();
  const email = (document.getElementById('crm-form-email')?.value || '').trim();
  const tier = document.getElementById('crm-form-tier')?.value || 'standard';
  const oldTier = document.getElementById('crm-form-old-tier')?.value || 'standard';
  const tierReason = (document.getElementById('crm-form-tier-reason')?.value || '').trim();
  const adminNote = (document.getElementById('crm-form-note')?.value || '').trim();

  const oldPoints = Number(document.getElementById('crm-form-old-points')?.value || 0);
  const newPointsVal = document.getElementById('crm-form-points')?.value;
  const newPoints = newPointsVal === '' ? oldPoints : Math.max(0, Number(newPointsVal));
  const pointsReason = (document.getElementById('crm-form-points-reason')?.value || '').trim();
  const diffPoints = newPoints - oldPoints;

  // Validate các trường bắt buộc
  if (!phone || !customerName) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Vui lòng nhập đầy đủ Số điện thoại và Họ tên hội viên!', 'warning');
    }
    return;
  }

  // Validate lý do điều chỉnh phân hạng nếu có thay đổi thủ công
  if (tier !== oldTier && tier !== 'auto') {
    const tierCheck = validateCrmReasonClient(tierReason, 10);
    if (!tierCheck.valid) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(tierCheck.message || 'Vui lòng nhập lý do điều chỉnh phân hạng hội viên (≥ 10 ký tự)!', 'warning');
      }
      document.getElementById('crm-form-tier-reason')?.focus();
      return;
    }
  }

  // Validate lý do điều chỉnh điểm tích lũy
  if (diffPoints !== 0) {
    const ptsCheck = validateCrmReasonClient(pointsReason, 10);
    if (!ptsCheck.valid) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(ptsCheck.message || 'Vui lòng nhập lý do điều chỉnh điểm tích lũy (≥ 10 ký tự)!', 'warning');
      }
      document.getElementById('crm-form-points-reason')?.focus();
      return;
    }
  }

  // Hộp thoại xác nhận thay đổi (Đặc biệt khi thay đổi điểm tích lũy)
  let confirmMessage = `Xác nhận lưu cập nhật hồ sơ hội viên ${customerName}?\n\n• SĐT: ${phone}`;
  if (email) confirmMessage += `\n• Email: ${email}`;
  if (tier !== oldTier) confirmMessage += `\n• Hạng mới: [${tier}] (Lý do: ${tierReason || 'Tự động'})`;
  if (diffPoints !== 0) {
    confirmMessage += `\n• Điểm tích lũy: [${oldPoints.toLocaleString('vi-VN')} điểm] → [${newPoints.toLocaleString('vi-VN')} điểm] (${diffPoints > 0 ? '+' : ''}${diffPoints.toLocaleString('vi-VN')} điểm)\n  Lý do: [${pointsReason}]`;
  }

  let isConfirmed = false;
  if (typeof showAdminConfirm === 'function') {
    isConfirmed = await showAdminConfirm({
      title: 'Xác nhận cập nhật hồ sơ hội viên',
      message: confirmMessage,
      confirmText: 'Xác nhận lưu',
      cancelText: 'Quay lại',
      danger: false
    });
  } else {
    isConfirmed = window.confirm(confirmMessage);
  }

  if (!isConfirmed) return;

  const submitBtn = document.getElementById('btn-submit-crm');
  const origBtnHtml = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⏳ Đang lưu...</span>';
  }

  try {
    const payload = {
      user_id: userId || null,
      phone: phone,
      name: customerName,
      customer_name: customerName,
      full_name: customerName,
      email: email,
      customer_tier: tier,
      tier_reason: tierReason,
      points: newPoints,
      points_delta: diffPoints,
      points_reason: pointsReason,
      admin_note: adminNote,
      updated_at: updatedAt
    };

    const res = await adminFetchJson('../api/admin.php?action=update_customer_crm', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errMsg = res.message || res.error || 'Có lỗi xảy ra khi lưu hồ sơ hội viên!';
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(errMsg, 'error', 5000);
      } else {
        alert(errMsg);
      }
      return;
    }

    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(res.message || `✓ Đã lưu thành công hồ sơ cho ${customerName}!`, 'success', 3500);
    }

    closeCustomerCrmModal();
    await renderAdminCustomers();
  } catch (err) {
    console.error('Lỗi khi lưu hồ sơ CRM:', err);
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Không thể kết nối đến máy chủ. Vui lòng thử lại!', 'error');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origBtnHtml;
    }
  }
}
window.saveCustomerCrm = saveCustomerCrm;

/* ==========================================================================
   TƯƠNG THÍCH NGƯỢC CHO CÁC HÀM CŨ
   ========================================================================== */

function openEditMemberModal(phone) {
  openCustomerCrmModal(phone);
}
window.openEditMemberModal = openEditMemberModal;

function openEditMemberModalFromCrm() {
  const phone = document.getElementById('crm-form-phone')?.value;
  if (phone) openCustomerCrmModal(phone);
}
window.openEditMemberModalFromCrm = openEditMemberModalFromCrm;

function closeEditMemberModal() {
  closeCustomerCrmModal();
}
window.closeEditMemberModal = closeEditMemberModal;

function handleEditMemberPointsChange() {
  handleCrmPointsChange('absolute');
}
window.handleEditMemberPointsChange = handleEditMemberPointsChange;

function handleEditMemberSubmit(e) {
  saveCustomerCrm(e);
}
window.handleEditMemberSubmit = handleEditMemberSubmit;

;
/* === admin_reports.js === */
﻿let currentReportLedgerBookings = [];
let currentReportLedgerFiltered = [];
let currentReportLedgerPage = 1;
const REPORT_LEDGER_PAGE_SIZE = 10;
let currentAdminExpensesList = [];
let currentReportPreset = 'month';
let currentReportInitialized = false;
let currentReportPitchRows = [];
let currentReportPitchSort = { key: 'revenue', dir: 'desc' };
let currentReportUncollectedUpcoming = [];
let currentReportUncollectedOverdue = [];
let currentReportOverdueCodes = new Set();
let currentReportForfeitBookings = [];
let currentReportData = null;
let currentReportSubtab = 'tong-quan';
let currentReportShowAllSlots = false;

const REPORT_SUBTABS = ['tong-quan', 'doi-soat', 'chi-tiet', 'chi-phi'];
const REPORT_KPI_COLLAPSE_KEY = 'sb_rpt_kpi_collapsed_v1';
const REPORT_FORFEIT_OR_CANCEL_PAY_STATUSES = new Set([
  'Đã hủy',
  'Đã hoàn cọc 100%',
  'Tịch thu cọc 30%',
  'Phạt 50% cọc',
  'Bảo lưu cọc 30%'
]);

function fmtVNDReport(n) {
  return Number(n || 0).toLocaleString('vi-VN') + 'đ';
}

function fmtSignedVNDReport(n) {
  const val = Number(n || 0);
  if (val === 0) return '0đ';
  const absStr = Math.abs(val).toLocaleString('vi-VN') + 'đ';
  return val > 0 ? `+${absStr}` : `−${absStr}`;
}

function fmtDateVNReport(val) {
  const raw = String(val || '').trim();
  if (!raw) return '';
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}:\d{2})(?::\d{2})?)?$/);
  if (m) {
    const base = `${m[3]}/${m[2]}/${m[1]}`;
    return m[4] ? `${base} ${m[4]}` : base;
  }
  const mShort = raw.match(/^(\d{4})-(\d{2})$/);
  if (mShort) return `${mShort[2]}/${mShort[1]}`;
  return raw;
}
window.fmtDateVNReport = fmtDateVNReport;

function fmtDateShortVNReport(val) {
  const vn = fmtDateVNReport(val);
  const m = vn.match(/^(\d{2}\/\d{2})\/\d{4}/);
  return m ? m[1] : vn;
}

function escapeAttrReport(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function normalizeSearchReport(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

function isValidReportMatchBooking(b) {
  if (!b) return false;
  const st = String(b.status || '').trim();
  const pst = String(b.payment_status || '').trim();
  if (st === 'Đã hủy' || st === 'Khách chưa đến') return false;
  if (REPORT_FORFEIT_OR_CANCEL_PAY_STATUSES.has(pst)) return false;
  return true;
}

function fmtLocalISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function computePresetDates(preset) {
  const now = new Date();
  const todayISO = (typeof getLocalTodayISO === 'function') ? getLocalTodayISO() : fmtLocalISO(now);
  if (preset === 'today') return { from: todayISO, to: todayISO };
  if (preset === '7days') {
    const d7 = new Date(now);
    d7.setDate(now.getDate() - 6);
    return { from: fmtLocalISO(d7), to: todayISO };
  }
  if (preset === 'last_month') {
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: fmtLocalISO(lm), to: fmtLocalISO(lEnd) };
  }
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  return { from: firstDay, to: todayISO };
}

function normalizeReportSubtabHash(rawSub) {
  let s = String(rawSub || '').replace(/^#/, '').trim().toLowerCase();
  while (s.startsWith('reports/')) {
    s = s.slice('reports/'.length);
  }
  s = s.split('/')[0];
  return REPORT_SUBTABS.includes(s) ? s : '';
}

function getReportSubtabFromHash() {
  try {
    return normalizeReportSubtabHash(window.location.hash || '') || 'tong-quan';
  } catch (e) {
    return 'tong-quan';
  }
}

function switchReportSubtab(subtab, opts = {}) {
  const target = normalizeReportSubtabHash(subtab) || 'tong-quan';
  currentReportSubtab = target;

  document.querySelectorAll('#tab-content-reports [data-rpt-panel]').forEach(panel => {
    const isAct = panel.getAttribute('data-rpt-panel') === target;
    panel.classList.toggle('hidden', !isAct);
  });

  document.querySelectorAll('#tab-content-reports [data-rpt-subtab]').forEach(btn => {
    const isAct = btn.getAttribute('data-rpt-subtab') === target;
    btn.classList.toggle('is-active', isAct);
    btn.setAttribute('aria-selected', isAct ? 'true' : 'false');
  });

  if (opts.updateHash !== false) {
    try {
      const url = new URL(window.location.href);
      url.hash = `#${target}`;
      window.history.replaceState({}, '', url.toString());
    } catch (e) {}
  }

  if (currentReportData) {
    if (target === 'tong-quan') {
      requestAnimationFrame(() => renderDailyRevenueSVG(currentReportData.dailyRevenue || []));
    } else if (target === 'chi-tiet') {
      requestAnimationFrame(() => renderSlotRevenueSVG(currentReportData.bySlot || []));
    }
  }
}
window.switchReportSubtab = switchReportSubtab;

window.addEventListener('hashchange', () => {
  const reportSection = document.getElementById('tab-content-reports');
  if (!reportSection || reportSection.classList.contains('hidden')) return;
  const sub = normalizeReportSubtabHash(window.location.hash || '');
  if (sub) {
    switchReportSubtab(sub, { updateHash: false });
  }
});

function getReportKpiCollapsedMap() {
  try {
    const raw = localStorage.getItem(REPORT_KPI_COLLAPSE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch (e) {
    return {};
  }
}

function applyReportKpiCollapsedState() {
  const map = getReportKpiCollapsedMap();
  document.querySelectorAll('#tab-content-reports [data-kpi-card]').forEach(card => {
    const key = card.getAttribute('data-kpi-card');
    if (!key) return;
    const isCollapsed = Boolean(map[key]);
    const body = card.querySelector('.rpt-kpi-body');
    const btn = card.querySelector('[data-kpi-toggle]');
    if (body) body.classList.toggle('hidden', isCollapsed);
    if (btn) {
      btn.textContent = isCollapsed ? '+' : '−';
      btn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
      btn.setAttribute('title', isCollapsed ? 'Mở rộng thẻ' : 'Thu gọn thẻ');
    }
  });
}

window.toggleReportKpiCard = function(key) {
  if (!key) return;
  const map = getReportKpiCollapsedMap();
  map[key] = !map[key];
  try {
    localStorage.setItem(REPORT_KPI_COLLAPSE_KEY, JSON.stringify(map));
  } catch (e) {}
  applyReportKpiCollapsedState();
};

function updatePeriodDisplayBadge(fromDate, toDate) {
  const badge = document.getElementById('rpt-period-badge');
  if (!badge) return;
  const f = fmtDateVNReport(fromDate);
  const t = fmtDateVNReport(toDate);
  if (f && t) {
    badge.textContent = f === t ? f : `${f} – ${t}`;
    badge.classList.remove('hidden');
  } else {
    badge.textContent = '';
    badge.classList.add('hidden');
  }
}

function syncReportFilterUI() {
  document.querySelectorAll('.rpt-preset-btn').forEach(btn => {
    const isAct = btn.getAttribute('data-rpt-preset') === currentReportPreset;
    btn.className = isAct
      ? 'rpt-preset-btn h-8 px-3 rounded-lg border border-[#16A34A] bg-[#16A34A] text-white font-bold cursor-pointer transition-colors'
      : 'rpt-preset-btn h-8 px-3 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#334155] font-semibold cursor-pointer transition-colors';
  });
  const customWrap = document.getElementById('rpt-custom-date-wrap');
  if (customWrap) {
    if (currentReportPreset === 'custom') {
      customWrap.classList.remove('hidden');
      customWrap.classList.add('flex');
    } else {
      customWrap.classList.add('hidden');
      customWrap.classList.remove('flex');
    }
  }
}

function syncReportUrlState(fromDate, toDate) {
  updatePeriodDisplayBadge(fromDate, toDate);
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('r_preset', currentReportPreset);
    if (currentReportPreset === 'custom') {
      if (fromDate) url.searchParams.set('r_from', fromDate); else url.searchParams.delete('r_from');
      if (toDate) url.searchParams.set('r_to', toDate); else url.searchParams.delete('r_to');
    } else {
      url.searchParams.delete('r_from');
      url.searchParams.delete('r_to');
    }
    window.history.replaceState({}, '', url.toString());
  } catch (e) {}
}

function initReportFiltersFromURL() {
  if (currentReportInitialized) return;
  currentReportInitialized = true;
  const fromInput = document.getElementById('rpt-from-date');
  const toInput = document.getElementById('rpt-to-date');
  if (window.SanBongDatePicker && typeof window.SanBongDatePicker.init === 'function') {
    const root = document.getElementById('tab-content-reports');
    if (root) window.SanBongDatePicker.init(root);
  }
  try {
    const url = new URL(window.location.href);
    const p = url.searchParams.get('r_preset');
    const rf = url.searchParams.get('r_from') || '';
    const rt = url.searchParams.get('r_to') || '';
    if (p && ['today', '7days', 'month', 'last_month', 'custom'].includes(p)) {
      currentReportPreset = p;
    } else {
      currentReportPreset = 'month';
    }
    if (currentReportPreset === 'custom' && rf && rt) {
      if (fromInput) fromInput.value = rf;
      if (toInput) toInput.value = rt;
    } else {
      const range = computePresetDates(currentReportPreset === 'custom' ? 'month' : currentReportPreset);
      if (fromInput) fromInput.value = range.from;
      if (toInput) toInput.value = range.to;
    }
  } catch (e) {
    const range = computePresetDates('month');
    if (fromInput) fromInput.value = range.from;
    if (toInput) toInput.value = range.to;
  }
  syncReportFilterUI();
  updatePeriodDisplayBadge(fromInput?.value || '', toInput?.value || '');
  applyReportKpiCollapsedState();
  switchReportSubtab(getReportSubtabFromHash(), { updateHash: false });
}

window.setReportDateRange = function(rangeType) {
  currentReportInitialized = true;
  const fromInput = document.getElementById('rpt-from-date');
  const toInput = document.getElementById('rpt-to-date');
  const errEl = document.getElementById('rpt-date-error');
  if (errEl) errEl.classList.add('hidden');

  if (rangeType === 'custom') {
    currentReportPreset = 'custom';
    if (fromInput && !fromInput.value) {
      const m = computePresetDates('month');
      fromInput.value = m.from;
      if (toInput) toInput.value = m.to;
    }
    syncReportFilterUI();
    syncReportUrlState(fromInput?.value || '', toInput?.value || '');
    renderAdminReports();
    return;
  }

  currentReportPreset = ['today', '7days', 'month', 'last_month'].includes(rangeType) ? rangeType : 'month';
  const range = computePresetDates(currentReportPreset);
  if (fromInput) {
    fromInput.value = range.from;
    fromInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
  if (toInput) {
    toInput.value = range.to;
    toInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
  syncReportFilterUI();
  syncReportUrlState(range.from, range.to);
  renderAdminReports();
};

window.handleReportCustomDateChange = function() {
  const fromVal = (document.getElementById('rpt-from-date')?.value || '').trim();
  const toVal = (document.getElementById('rpt-to-date')?.value || '').trim();
  const errEl = document.getElementById('rpt-date-error');
  if (fromVal && toVal && fromVal > toVal) {
    if (errEl) errEl.classList.remove('hidden');
    return;
  }
  if (errEl) errEl.classList.add('hidden');
  currentReportPreset = 'custom';
  syncReportFilterUI();
  syncReportUrlState(fromVal, toVal);
  renderAdminReports();
};

window.toggleReportExportMenu = function(e) {
  if (e) e.stopPropagation();
  const dd = document.getElementById('rpt-export-dropdown');
  if (!dd) return;
  dd.classList.toggle('hidden');
};

document.addEventListener('click', (e) => {
  const dd = document.getElementById('rpt-export-dropdown');
  const btn = document.getElementById('btn-export-reports-menu');
  if (dd && !dd.classList.contains('hidden') && !dd.contains(e.target) && (!btn || !btn.contains(e.target))) {
    dd.classList.add('hidden');
  }
});

function renderDeltaBadge(elId, pct, invertColor) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (pct === null || pct === undefined || Number.isNaN(Number(pct))) {
    el.className = 'text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-[#64748B]';
    el.textContent = '—';
    return;
  }
  const num = Number(pct);
  const sign = num > 0 ? '+' : '';
  const good = invertColor ? (num <= 0) : (num >= 0);
  el.className = num === 0
    ? 'text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-[#64748B]'
    : (good
      ? 'text-[11px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700'
      : 'text-[11px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700');
  el.textContent = `${sign}${num}%`;
}

function renderStackedBar(barId, legendId, totalId, segments, totalVal) {
  const barEl = document.getElementById(barId);
  const legEl = document.getElementById(legendId);
  const totEl = document.getElementById(totalId);
  const sum = Math.max(0, Number(totalVal || 0));
  if (totEl) totEl.textContent = fmtVNDReport(sum);

  if (!barEl || !legEl) return;
  if (sum <= 0) {
    barEl.innerHTML = '<div class="w-full h-full bg-slate-100"></div>';
    legEl.innerHTML = '<span class="text-[#94A3B8]">Chưa có phát sinh trong kỳ</span>';
    return;
  }

  barEl.innerHTML = segments.map(seg => {
    const val = Math.max(0, Number(seg.value || 0));
    const pct = (val / sum) * 100;
    if (pct <= 0) return '';
    return `<div style="width:${pct.toFixed(2)}%;background:${seg.color}" class="h-full transition-all" title="${escapeSearchHTML(seg.label)}: ${fmtVNDReport(val)} (${pct.toFixed(1)}%)"></div>`;
  }).join('');

  legEl.innerHTML = segments.map(seg => {
    const val = Math.max(0, Number(seg.value || 0));
    const pct = sum > 0 ? ((val / sum) * 100).toFixed(1) : '0.0';
    const valStyle = seg.textColor ? `style="color:${seg.textColor}"` : '';
    return `
      <span class="inline-flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-xs shrink-0" style="background:${seg.color}"></span>
        <span>${escapeSearchHTML(seg.label)}:</span>
        <strong class="text-[#0F172A]" ${valStyle}>${fmtVNDReport(val)}</strong>
        <span class="text-[#64748B]">(${pct}%)</span>
      </span>
    `;
  }).join('');
}

function renderReconciliationPanel(recon) {
  const badgeEl = document.getElementById('rpt-formula-badge');
  const alertEl = document.getElementById('rpt-recon-alert');
  const itemsEl = document.getElementById('rpt-recon-items');
  const deviantsEl = document.getElementById('rpt-recon-deviants');
  const deviantsEmptyEl = document.getElementById('rpt-recon-deviants-empty');
  const dotEl = document.getElementById('rpt-recon-dot');
  if (!recon || !itemsEl) return;

  const checks = [recon.bankCheck, recon.shiftCashCheck, recon.pitchCollectedCheck].filter(Boolean);
  const deviants = Array.isArray(recon.pitchCollectedCheck?.deviantOrders) ? recon.pitchCollectedCheck.deviantOrders : [];
  const mismatchedChecks = checks.filter(c => (c.isMatched !== true) || (Number(c.diff || 0) !== 0));
  const hasAnyIssue = mismatchedChecks.length > 0 || deviants.length > 0;

  if (dotEl) {
    dotEl.classList.toggle('hidden', !hasAnyIssue);
  }

  if (badgeEl) {
    if (mismatchedChecks.length === 0) {
      badgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800';
      badgeEl.textContent = 'Khớp';
    } else {
      badgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300';
      badgeEl.textContent = `Lệch (${mismatchedChecks.length} nguồn)`;
    }
  }

  if (alertEl) {
    if (mismatchedChecks.length === 0) {
      alertEl.classList.add('hidden');
      alertEl.innerHTML = '';
    } else {
      alertEl.classList.remove('hidden');
      const linesHtml = mismatchedChecks.map(c => {
        const diffVal = Number(c.diff || 0);
        const signedStr = fmtSignedVNDReport(diffVal);
        const diffColor = diffVal < 0 ? 'text-rose-700' : 'text-amber-900';
        return `
          <li class="flex flex-wrap items-baseline justify-between gap-2">
            <span>• ${escapeSearchHTML(c.label || '')}</span>
            <strong class="${diffColor} font-mono whitespace-nowrap">${escapeSearchHTML(signedStr)}</strong>
          </li>
        `;
      }).join('');
      alertEl.innerHTML = `
        <div class="font-bold text-amber-900 text-xs">⚠ Cảnh báo chênh lệch từng nguồn đối soát:</div>
        <ul class="space-y-1 text-xs pl-1">${linesHtml}</ul>
        <div class="text-[11px] text-amber-800 pt-1 border-t border-amber-200">
          Lưu ý: Các khoản lệch được theo dõi độc lập theo từng nguồn dữ liệu, <strong>không bù trừ cho nhau</strong>.
        </div>
      `;
    }
  }

  itemsEl.innerHTML = checks.map(c => {
    const diffVal = Number(c.diff || 0);
    const matched = (c.isMatched === true && diffVal === 0);
    let statusCls = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    let statusTxt = 'Khớp';
    let cardBorder = 'border-[#E2E8F0]';

    if (!matched) {
      if (diffVal < 0) {
        statusCls = 'bg-rose-50 text-rose-700 border-rose-200';
        cardBorder = 'border-rose-300';
      } else {
        statusCls = 'bg-amber-50 text-amber-800 border-amber-300';
        cardBorder = 'border-amber-300';
      }
      statusTxt = c.available === false ? 'Lệch (thiếu nguồn)' : `Lệch ${fmtSignedVNDReport(diffVal)}`;
    }

    const metaParts = [];
    if (typeof c.txCount === 'number') metaParts.push(`${c.txCount} GD khớp`);
    if (typeof c.unmatchedCount === 'number' && c.unmatchedCount > 0) metaParts.push(`${c.unmatchedCount} GD chưa khớp`);
    if (typeof c.shiftCount === 'number') metaParts.push(`${c.shiftCount} ca đã chốt`);

    return `
      <div class="p-3 rounded-xl bg-white border ${cardBorder} space-y-2">
        <div class="flex items-start justify-between gap-2">
          <span class="font-bold text-[#0F172A] leading-snug">${escapeSearchHTML(c.label || '')}</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap shrink-0 ${statusCls}">${escapeSearchHTML(statusTxt)}</span>
        </div>
        <div class="text-[11px] text-[#475569] flex items-center justify-between pt-1.5 border-t border-slate-100">
          <span>Nguồn độc lập: <strong class="text-[#0F172A]">${fmtVNDReport(c.sourceTotal)}</strong></span>
          <span>Báo cáo: <strong class="text-[#0F172A]">${fmtVNDReport(c.reportTotal)}</strong></span>
        </div>
        ${metaParts.length ? `<div class="text-[10px] text-[#64748B]">${escapeSearchHTML(metaParts.join(' · '))}</div>` : ''}
      </div>
    `;
  }).join('');

  if (deviantsEl && deviantsEmptyEl) {
    if (deviants.length === 0) {
      deviantsEl.classList.add('hidden');
      deviantsEl.innerHTML = '';
      deviantsEmptyEl.classList.remove('hidden');
    } else {
      deviantsEmptyEl.classList.add('hidden');
      deviantsEl.classList.remove('hidden');
      deviantsEl.innerHTML = `
        <div class="font-bold text-amber-900 text-xs">Đơn có mức cọc khác tỷ lệ chuẩn (${deviants.length} đơn):</div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-[11px] min-w-[640px]">
            <thead class="text-amber-900 border-b border-amber-200">
              <tr>
                <th class="py-1.5 pr-2">Mã đơn</th>
                <th class="py-1.5 pr-2">Ngày &amp; Sân</th>
                <th class="py-1.5 pr-2 text-right">Tổng tiền</th>
                <th class="py-1.5 pr-2 text-right">Cọc ghi nhận</th>
                <th class="py-1.5 pr-2">Ghi chú lệch</th>
                <th class="py-1.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-amber-200/60">
              ${deviants.map(d => `
                <tr>
                  <td class="py-1.5 pr-2 font-mono font-bold"><button type="button" onclick="openInPlayModal('${escapeAttrReport(d.code)}')" class="text-[#0F172A] hover:text-[#16A34A] underline cursor-pointer">#${escapeSearchHTML(d.code)}</button></td>
                  <td class="py-1.5 pr-2 text-[#334155] whitespace-nowrap">${escapeSearchHTML(fmtDateVNReport(d.booking_date))} · ${escapeSearchHTML(d.pitch_name)}</td>
                  <td class="py-1.5 pr-2 text-right font-semibold">${fmtVNDReport(d.total_price)}</td>
                  <td class="py-1.5 pr-2 text-right font-bold text-amber-800">${fmtVNDReport(d.deposit)}</td>
                  <td class="py-1.5 pr-2 text-amber-900">${escapeSearchHTML(d.reason)}</td>
                  <td class="py-1.5 text-right">
                    <button type="button" onclick="openInPlayModal('${escapeAttrReport(d.code)}')" class="px-2.5 py-1 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-[11px] cursor-pointer whitespace-nowrap">Xử lý</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  }
}

function renderDailyRevenueSVG(dailyRevenue) {
  const container = document.getElementById('rpt-daily-svg-container');
  if (!container) return;
  if (!Array.isArray(dailyRevenue) || dailyRevenue.length === 0) {
    container.innerHTML = '<span class="text-xs text-slate-400">Chưa có dữ liệu doanh thu theo ngày trong kỳ.</span>';
    return;
  }

  const w = Math.max(container.clientWidth || 480, dailyRevenue.length * 56);
  const h = 190;
  const paddingBottom = 28;
  const paddingTop = 24;
  const chartH = h - paddingBottom - paddingTop;
  const maxRev = Math.max(1, ...dailyRevenue.map(d => Number(d.revenue || 0)));
  const barWidth = Math.max(16, Math.min(34, Math.floor(w / dailyRevenue.length) - 14));

  const bars = dailyRevenue.map((d, idx) => {
    const rev = Number(d.revenue || 0);
    const col = Number(d.collected || 0);
    const barH = Math.max(4, Math.round((rev / maxRev) * chartH));
    const x = Math.round(idx * (w / dailyRevenue.length) + (w / dailyRevenue.length - barWidth) / 2);
    const y = h - paddingBottom - barH;
    const dateVN = escapeSearchHTML(fmtDateVNReport(d.date));
    const dateLabel = escapeSearchHTML(fmtDateShortVNReport(d.date));
    const shortVal = rev >= 1000000 ? (rev / 1000000).toFixed(1) + 'M' : Math.round(rev / 1000) + 'k';
    const tipText = `Ngày ${dateVN} | Ghi nhận: ${fmtVNDReport(rev)} | Đã thu: ${fmtVNDReport(col)} (${Number(d.matches || 0)} ca)`;

    return `
      <g class="cursor-pointer group">
        <title>${tipText}</title>
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="4" fill="#16A34A" class="transition-opacity hover:opacity-80"></rect>
        <text x="${x + barWidth / 2}" y="${y - 6}" font-size="10" font-weight="bold" fill="#0F172A" text-anchor="middle">${shortVal}</text>
        <text x="${x + barWidth / 2}" y="${h - 10}" font-size="10" fill="#64748B" text-anchor="middle">${dateLabel}</text>
      </g>
    `;
  }).join('');

  container.innerHTML = `
    <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" class="overflow-visible w-full">
      <line x1="0" y1="${h - paddingBottom}" x2="${w}" y2="${h - paddingBottom}" stroke="#E2E8F0" stroke-width="1.5" />
      ${bars}
    </svg>
  `;
}
window.renderDailyRevenueSVG = renderDailyRevenueSVG;

function toggleReportShowAllSlots() {
  currentReportShowAllSlots = !currentReportShowAllSlots;
  if (currentReportData) {
    renderSlotRevenueSVG(currentReportData.bySlot || []);
  }
}
window.toggleReportShowAllSlots = toggleReportShowAllSlots;

function renderSlotRevenueSVG(bySlot) {
  const container = document.getElementById('rpt-slot-svg-container');
  const toggleWrap = document.getElementById('rpt-slot-toggle-wrap');
  if (!container) return;
  if (!Array.isArray(bySlot) || bySlot.length === 0) {
    container.innerHTML = '<span class="text-xs text-slate-400">Chưa có dữ liệu theo khung giờ trong kỳ.</span>';
    if (toggleWrap) {
      toggleWrap.classList.add('hidden');
      toggleWrap.innerHTML = '';
    }
    return;
  }

  const MAX_DEFAULT_SLOTS = 10;
  const visibleSlots = (currentReportShowAllSlots || bySlot.length <= MAX_DEFAULT_SLOTS)
    ? bySlot
    : bySlot.slice(0, MAX_DEFAULT_SLOTS);

  const maxRev = Math.max(1, ...bySlot.map(s => Number(s.revenue || 0)));
  const rowH = 28;
  const svgH = Math.max(120, visibleSlots.length * rowH + 16);
  const labelW = 96;
  const valW = 96;
  const totalW = 520;
  const barMaxW = totalW - labelW - valW - 14;

  const rows = visibleSlots.map((s, idx) => {
    const rev = Number(s.revenue || 0);
    const barW = Math.max(4, Math.round((rev / maxRev) * barMaxW));
    const y = 8 + idx * rowH;
    const safeSlot = escapeSearchHTML(String(s.slot || 'Khác'));
    const tip = `${safeSlot}: ${fmtVNDReport(rev)} (${Number(s.matches || 0)} ca)`;
    return `
      <g class="cursor-pointer">
        <title>${tip}</title>
        <text x="0" y="${y + 14}" font-size="11" font-weight="600" fill="#334155">${safeSlot}</text>
        <rect x="${labelW}" y="${y + 3}" width="${barMaxW}" height="15" rx="4" fill="#F1F5F9" />
        <rect x="${labelW}" y="${y + 3}" width="${barW}" height="15" rx="4" fill="#0F172A" />
        <text x="${totalW}" y="${y + 14}" font-size="11" font-weight="700" fill="#0F172A" text-anchor="end">${fmtVNDReport(rev)}</text>
      </g>
    `;
  }).join('');

  container.innerHTML = `
    <svg width="100%" height="${svgH}" viewBox="0 0 ${totalW} ${svgH}" preserveAspectRatio="xMidYMin meet" class="w-full">
      ${rows}
    </svg>
  `;

  if (toggleWrap) {
    if (bySlot.length > MAX_DEFAULT_SLOTS) {
      const rem = bySlot.length - MAX_DEFAULT_SLOTS;
      toggleWrap.classList.remove('hidden');
      toggleWrap.innerHTML = `
        <button type="button" onclick="toggleReportShowAllSlots()" class="px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-50 text-xs font-semibold text-[#0F172A] cursor-pointer">
          ${currentReportShowAllSlots ? 'Thu gọn khung giờ ↑' : `Xem thêm (${rem} khung giờ) ↓`}
        </button>
      `;
    } else {
      toggleWrap.classList.add('hidden');
      toggleWrap.innerHTML = '';
    }
  }
}
window.renderSlotRevenueSVG = renderSlotRevenueSVG;

function sortAdminPitchTable(key) {
  if (currentReportPitchSort.key === key) {
    currentReportPitchSort.dir = currentReportPitchSort.dir === 'desc' ? 'asc' : 'desc';
  } else {
    currentReportPitchSort = { key, dir: key === 'name' ? 'asc' : 'desc' };
  }
  document.querySelectorAll('[data-sort-ind]').forEach(el => {
    const k = el.getAttribute('data-sort-ind');
    el.textContent = k === currentReportPitchSort.key ? (currentReportPitchSort.dir === 'desc' ? '↓' : '↑') : '';
  });
  renderAdminPitchTable();
}
window.sortAdminPitchTable = sortAdminPitchTable;

function renderAdminPitchTable() {
  const tbody = document.getElementById('admin-reports-tbody');
  const tfoot = document.getElementById('admin-reports-tfoot');
  if (!tbody) return;

  const showZero = Boolean(document.getElementById('rpt-show-zero-pitches')?.checked);
  const rows = showZero
    ? [...currentReportPitchRows]
    : currentReportPitchRows.filter(p => Number(p.matches || 0) > 0 || Number(p.revenue || 0) > 0);

  const { key, dir } = currentReportPitchSort;
  rows.sort((a, b) => {
    if (key === 'name') {
      const cmp = String(a.name || '').localeCompare(String(b.name || ''), 'vi');
      return dir === 'asc' ? cmp : -cmp;
    }
    const diff = Number(a[key] || 0) - Number(b[key] || 0);
    return dir === 'asc' ? diff : -diff;
  });

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-[#94A3B8]">Không có sân nào phát sinh ca trong kỳ (bật "Hiện tất cả sân" để xem toàn bộ sân).</td></tr>';
    if (tfoot) tfoot.innerHTML = '';
    return;
  }

  let sumMatches = 0, sumCollected = 0, sumRevenue = 0;
  tbody.innerHTML = rows.map(p => {
    const m = Number(p.matches || 0);
    const occ = Number(p.occupancyRate || 0);
    const col = Number(p.collectedRevenue || 0);
    const rev = Number(p.revenue || 0);
    sumMatches += m;
    sumCollected += col;
    sumRevenue += rev;
    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="py-3 px-4 font-bold text-[#0F172A]">${escapeSearchHTML(p.name)}</td>
        <td class="py-3 px-4 text-[#475569]">${escapeSearchHTML(p.typeName || p.type_name || '')}</td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded text-[11px] font-bold ${p.status === 'Bảo trì' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'}">
            ${escapeSearchHTML(p.status)}
          </span>
        </td>
        <td class="py-3 px-4 text-center font-bold text-[#334155]">${m} ca</td>
        <td class="py-3 px-4 text-right font-semibold text-[#334155]">${occ.toFixed(1)}%</td>
        <td class="py-3 px-4 text-right font-bold text-[#16A34A]">${fmtVNDReport(col)}</td>
        <td class="py-3 px-4 text-right font-extrabold text-[#0F172A]">${fmtVNDReport(rev)}</td>
      </tr>
    `;
  }).join('');

  if (tfoot) {
    tfoot.innerHTML = `
      <tr>
        <td colspan="3" class="py-3 px-4">Tổng cộng (${rows.length} sân)</td>
        <td class="py-3 px-4 text-center">${sumMatches} ca</td>
        <td class="py-3 px-4 text-right">—</td>
        <td class="py-3 px-4 text-right text-[#16A34A]">${fmtVNDReport(sumCollected)}</td>
        <td class="py-3 px-4 text-right">${fmtVNDReport(sumRevenue)}</td>
      </tr>
    `;
  }
}
window.renderAdminPitchTable = renderAdminPitchTable;

window.openUncollectedDrawer = function(mode) {
  const modal = document.getElementById('rpt-uncollected-modal');
  const titleEl = document.getElementById('rpt-uncollected-modal-title');
  const subEl = document.getElementById('rpt-uncollected-modal-sub');
  const tbody = document.getElementById('rpt-uncollected-tbody');
  if (!modal || !tbody) return;

  const list = mode === 'overdue' ? currentReportUncollectedOverdue : currentReportUncollectedUpcoming;
  if (titleEl) {
    titleEl.textContent = mode === 'overdue'
      ? 'Đã đá nhưng chưa tất toán (cần xử lý)'
      : 'Chưa đến giờ đá (dự kiến thu tại sân)';
  }
  if (subEl) {
    const sum = list.reduce((acc, i) => acc + Number(i.uncollected || 0), 0);
    subEl.textContent = `${list.length} đơn · Tổng chưa thu: ${fmtVNDReport(sum)}`;
  }

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="py-6 text-center text-[#94A3B8]">Không có đơn nào trong nhóm này.</td></tr>';
  } else {
    tbody.innerHTML = list.map(i => `
      <tr class="hover:bg-slate-50">
        <td class="py-2.5 px-3 font-mono font-bold text-[#0F172A]">#${escapeSearchHTML(i.code)}</td>
        <td class="py-2.5 px-3 whitespace-nowrap text-[#334155]">${escapeSearchHTML(fmtDateVNReport(i.booking_date))} <span class="text-[#64748B]">(${escapeSearchHTML(i.slot_time)})</span></td>
        <td class="py-2.5 px-3">
          <div class="font-bold text-[#0F172A]">${escapeSearchHTML(i.pitch_name)}</div>
          <div class="text-[11px] text-[#64748B]">${escapeSearchHTML(i.customer_name)} · ${escapeSearchHTML(i.phone)}</div>
        </td>
        <td class="py-2.5 px-3 text-right font-bold text-[#16A34A]">${fmtVNDReport(i.paid_amount)}</td>
        <td class="py-2.5 px-3 text-right font-extrabold rpt-text-orange" style="color:#ea580c">${fmtVNDReport(i.uncollected)}</td>
        <td class="py-2.5 px-3 text-right">
          <button type="button" onclick="closeUncollectedDrawer();openInPlayModal('${escapeAttrReport(i.code)}')" class="px-2.5 py-1 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-[11px] cursor-pointer">Xem đơn</button>
        </td>
      </tr>
    `).join('');
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
};

window.closeUncollectedDrawer = function() {
  const modal = document.getElementById('rpt-uncollected-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};

window.goToOverdueBookingsFilter = function() {
  const statusSelect = document.getElementById('rpt-ledger-status-filter');
  const searchInput = document.getElementById('rpt-ledger-search');
  if (statusSelect) statusSelect.value = 'overdue';
  if (searchInput) searchInput.value = '';
  handleReportLedgerSearch();
  switchReportSubtab('chi-tiet');
  requestAnimationFrame(() => {
    document.getElementById('rpt-ledger-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
};

window.resetReportLedgerFilters = function() {
  const statusSelect = document.getElementById('rpt-ledger-status-filter');
  const searchInput = document.getElementById('rpt-ledger-search');
  if (statusSelect) statusSelect.value = 'all';
  if (searchInput) searchInput.value = '';
  handleReportLedgerSearch();
};

function renderForfeitBookingsNotice() {
  const box = document.getElementById('rpt-forfeit-bookings-box');
  if (!box) return;
  if (!Array.isArray(currentReportForfeitBookings) || currentReportForfeitBookings.length === 0) {
    box.classList.add('hidden');
    box.innerHTML = '';
    return;
  }
  const totalRetained = currentReportForfeitBookings.reduce((acc, b) => acc + Number(b.paid_amount || 0), 0);
  box.classList.remove('hidden');
  box.innerHTML = `
    <details class="rounded-xl bg-slate-50 border border-slate-200 p-3">
      <summary class="cursor-pointer font-semibold text-[#334155] flex flex-wrap items-center justify-between gap-2 select-none">
        <span>Đơn hủy / không đến có giữ cọc (không tính vào Ca thi đấu): <strong>${currentReportForfeitBookings.length} đơn</strong></span>
        <span class="font-bold text-[#0F172A]">Đã thu giữ cọc: ${fmtVNDReport(totalRetained)}</span>
      </summary>
      <div class="mt-2.5 overflow-x-auto">
        <table class="w-full text-left text-[11px] min-w-[600px]">
          <thead class="text-[#475569] border-b border-slate-200">
            <tr>
              <th class="py-1.5 pr-2">Mã đơn</th>
              <th class="py-1.5 pr-2">Ngày &amp; Sân</th>
              <th class="py-1.5 pr-2">Khách hàng</th>
              <th class="py-1.5 pr-2">Trạng thái</th>
              <th class="py-1.5 text-right">Tiền giữ cọc</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            ${currentReportForfeitBookings.map(b => `
              <tr>
                <td class="py-1.5 pr-2 font-mono font-bold"><button type="button" onclick="openInPlayModal('${escapeAttrReport(b.code || '')}')" class="text-[#0F172A] hover:text-[#16A34A] underline cursor-pointer">${escapeSearchHTML(b.code || '')}</button></td>
                <td class="py-1.5 pr-2 text-[#334155] whitespace-nowrap">${escapeSearchHTML(fmtDateVNReport(b.booking_date || ''))} · ${escapeSearchHTML(b.pitch_name || b.pitch_id || '')}</td>
                <td class="py-1.5 pr-2">${escapeSearchHTML(b.customer_name || '')}</td>
                <td class="py-1.5 pr-2">${escapeSearchHTML(b.status || '')} (${escapeSearchHTML(b.payment_status || '')})</td>
                <td class="py-1.5 text-right font-bold text-[#16A34A]">${fmtVNDReport(b.paid_amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </details>
  `;
}

function renderReportLedger() {
  const tbody = document.getElementById('rpt-ledger-tbody');
  if (!tbody) return;
  const totalItems = currentReportLedgerFiltered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / REPORT_LEDGER_PAGE_SIZE));
  if (currentReportLedgerPage > totalPages) currentReportLedgerPage = totalPages;
  if (currentReportLedgerPage < 1) currentReportLedgerPage = 1;

  const startIdx = (currentReportLedgerPage - 1) * REPORT_LEDGER_PAGE_SIZE;
  const pageItems = currentReportLedgerFiltered.slice(startIdx, startIdx + REPORT_LEDGER_PAGE_SIZE);

  const countInfo = document.getElementById('rpt-ledger-count-info');
  if (countInfo) countInfo.textContent = `Hiển thị ${pageItems.length ? startIdx + 1 : 0} - ${startIdx + pageItems.length} / ${totalItems} ca`;
  const pageInfo = document.getElementById('rpt-ledger-page-info');
  if (pageInfo) pageInfo.textContent = `Trang ${currentReportLedgerPage} / ${totalPages}`;
  const prevBtn = document.getElementById('rpt-ledger-prev-btn');
  if (prevBtn) prevBtn.disabled = (currentReportLedgerPage <= 1);
  const nextBtn = document.getElementById('rpt-ledger-next-btn');
  if (nextBtn) nextBtn.disabled = (currentReportLedgerPage >= totalPages);

  if (pageItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="py-6 text-center text-[#94A3B8]">Không tìm thấy ca đặt sân nào phù hợp.</td></tr>';
    return;
  }

  tbody.innerHTML = pageItems.map(b => {
    const stRaw = String(b.status || '').trim();
    const isCompleted = (stRaw === 'Hoàn thành' || stRaw.toLowerCase() === 'completed');
    const isOverdueRow = stRaw === 'Đã đá - chưa tất toán' || currentReportOverdueCodes.has(String(b.code || '').trim());
    const statusBadge = isCompleted
      ? '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700">Hoàn thành</span>'
      : (isOverdueRow
        ? `<span class="px-2 py-0.5 rounded text-[11px] font-bold rpt-badge-orange" style="background-color:#FFF7ED;color:#ea580c;border:1px solid #FED7AA">${escapeSearchHTML(stRaw || 'Đã đá - chưa tất toán')}</span>`
        : `<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-[#334155]">${escapeSearchHTML(stRaw)}</span>`);
    const paidVal = Number(b.paid_amount ?? (Number(b.total_price || 0) - Number(b.remaining_amount || 0)));
    const uncolVal = Number(b.remaining_amount || 0);
    const uncolHtml = uncolVal > 0
      ? `<td class="py-2.5 px-3 text-right font-bold rpt-text-orange" style="color:#ea580c">${fmtVNDReport(uncolVal)}</td>`
      : `<td class="py-2.5 px-3 text-right font-semibold text-[#64748B]">${fmtVNDReport(0)}</td>`;

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="py-2.5 px-3 font-mono font-bold"><button type="button" onclick="openInPlayModal('${escapeAttrReport(b.code || '')}')" class="text-[#0F172A] hover:text-[#16A34A] hover:underline cursor-pointer">${escapeSearchHTML(b.code || '')}</button></td>
        <td class="py-2.5 px-3 text-[#334155] whitespace-nowrap">${escapeSearchHTML(fmtDateVNReport(b.booking_date || ''))} <span class="text-[#64748B]">(${escapeSearchHTML(b.slot_time || '')})</span></td>
        <td class="py-2.5 px-3 font-semibold text-[#0F172A]">${escapeSearchHTML(b.pitch_name || b.pitch_id || '')}</td>
        <td class="py-2.5 px-3">
          <div class="font-bold text-[#0F172A]">${escapeSearchHTML(b.customer_name || 'Khách vãng lai')}</div>
          <div class="text-[11px] text-[#64748B] font-mono">${escapeSearchHTML(b.phone || '')}</div>
        </td>
        <td class="py-2.5 px-3 text-right font-extrabold text-[#0F172A]">${fmtVNDReport(b.total_price)}</td>
        <td class="py-2.5 px-3 text-right font-bold text-[#16A34A]">${fmtVNDReport(paidVal)}</td>
        ${uncolHtml}
        <td class="py-2.5 px-3 text-right text-[#475569] font-semibold">${fmtVNDReport(b.service_price)}</td>
        <td class="py-2.5 px-3">${statusBadge}</td>
        <td class="py-2.5 px-3 text-xs text-[#475569] max-w-[140px] truncate" title="${escapeSearchHTML(b.payment_method || '')}">${escapeSearchHTML(b.payment_method || '')}</td>
      </tr>
    `;
  }).join('');
}
window.renderReportLedger = renderReportLedger;

function applyReportLedgerFilters(resetPage = true) {
  const qRaw = (document.getElementById('rpt-ledger-search')?.value || '').trim();
  const qNorm = normalizeSearchReport(qRaw);
  const statusFilter = (document.getElementById('rpt-ledger-status-filter')?.value || 'all').trim();

  const chipEl = document.getElementById('rpt-ledger-filter-chip');
  const chipTxtEl = document.getElementById('rpt-ledger-filter-chip-text');
  if (chipEl && chipTxtEl) {
    const labels = {
      overdue: 'Đang lọc: Đã đá chưa tất toán (cần xử lý)',
      uncollected: 'Đang lọc: Ca còn số tiền chưa thu (> 0đ)',
      completed: 'Đang lọc: Ca đã hoàn thành'
    };
    if (statusFilter !== 'all' && labels[statusFilter]) {
      chipTxtEl.textContent = labels[statusFilter];
      chipEl.classList.remove('hidden');
      chipEl.classList.add('flex');
    } else {
      chipEl.classList.add('hidden');
      chipEl.classList.remove('flex');
    }
  }

  currentReportLedgerFiltered = currentReportLedgerBookings.filter(b => {
    if (statusFilter === 'overdue') {
      const code = String(b.code || '').trim();
      const st = String(b.status || '').trim();
      if (!currentReportOverdueCodes.has(code) && st !== 'Đã đá - chưa tất toán') return false;
    } else if (statusFilter === 'uncollected') {
      if (Number(b.remaining_amount || 0) <= 0) return false;
    } else if (statusFilter === 'completed') {
      const st = String(b.status || '').trim();
      if (st !== 'Hoàn thành' && st.toLowerCase() !== 'completed') return false;
    }

    if (!qNorm) return true;
    return (
      normalizeSearchReport(b.code).includes(qNorm) ||
      normalizeSearchReport(b.customer_name).includes(qNorm) ||
      normalizeSearchReport(b.phone).includes(qNorm) ||
      normalizeSearchReport(b.pitch_name).includes(qNorm) ||
      normalizeSearchReport(b.pitch_id).includes(qNorm)
    );
  });

  if (resetPage) currentReportLedgerPage = 1;
  renderReportLedger();
}

function handleReportLedgerSearch() {
  applyReportLedgerFilters(true);
}
window.handleReportLedgerSearch = handleReportLedgerSearch;

function changeReportLedgerPage(delta) {
  currentReportLedgerPage += delta;
  renderReportLedger();
}
window.changeReportLedgerPage = changeReportLedgerPage;

async function renderAdminReports() {
  if (!isManagerOrAdmin()) return;
  initReportFiltersFromURL();

  const fromDate = (document.getElementById('rpt-from-date')?.value || '').trim();
  const toDate = (document.getElementById('rpt-to-date')?.value || '').trim();
  const errEl = document.getElementById('rpt-date-error');
  if (fromDate && toDate && fromDate > toDate) {
    if (errEl) errEl.classList.remove('hidden');
    return;
  }
  if (errEl) errEl.classList.add('hidden');
  updatePeriodDisplayBadge(fromDate, toDate);

  const qs = new URLSearchParams({ action: 'reports' });
  if (fromDate) qs.set('from', fromDate);
  if (toDate) qs.set('to', toDate);
  const r = await adminFetchJson(`../api/admin.php?${qs.toString()}`);
  const d = (r.ok && r.data) ? r.data : null;
  if (!d) return;

  currentReportData = d;
  const s = d.summary || d;
  const recognized = Number(s.recognizedRevenue ?? s.totalRevenue ?? 0);
  const collected = Number(s.collectedRevenue ?? 0);
  const uncollected = Number(s.uncollectedRevenue ?? Math.max(0, recognized - collected));
  const uncolUpcoming = Number(s.uncollectedUpcoming ?? 0);
  const uncolOverdue = Number(s.uncollectedOverdue ?? 0);
  const cashRev = Number(s.cashRevenue ?? 0);
  const vietqrRev = Number(s.transferRevenue ?? s.vietqrRevenue ?? 0);
  const pitchRec = Number(s.pitchRecognizedRevenue ?? Math.max(0, recognized - Number(s.servicesRevenue ?? 0)));
  const servicesRec = Number(s.servicesRevenue ?? s.serviceRevenue ?? 0);
  const totalExpenses = Number(s.totalExpenses ?? 0);
  const netProfit = Number(s.netProfit ?? (collected - totalExpenses));

  const rawDetailed = Array.isArray(d.detailedBookings) ? d.detailedBookings : [];
  const validMatchBookings = rawDetailed.filter(isValidReportMatchBooking);
  currentReportForfeitBookings = rawDetailed.filter(b => !isValidReportMatchBooking(b));
  const totalMatches = Array.isArray(d.detailedBookings)
    ? validMatchBookings.length
    : Number(s.totalMatches ?? 0);
  const occupancyRate = Number(s.occupancyRate ?? 0);
  const avgRev = totalMatches > 0
    ? (Array.isArray(d.detailedBookings) ? Math.round(recognized / totalMatches) : Number(s.avgRevenue ?? 0))
    : 0;

  const emptyEl = document.getElementById('rpt-empty-state');
  if (emptyEl) {
    const isEmpty = (recognized === 0 && totalMatches === 0 && totalExpenses === 0);
    emptyEl.classList.toggle('hidden', !isEmpty);
  }

  const setTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

  // Hàng 1: 4 thẻ KPI
  setTxt('rpt-total-revenue', fmtVNDReport(recognized));
  setTxt('rpt-collected-revenue', fmtVNDReport(collected));
  setTxt('rpt-uncollected-revenue', fmtVNDReport(uncollected));
  setTxt('rpt-uncollected-upcoming', fmtVNDReport(uncolUpcoming));
  setTxt('rpt-uncollected-overdue', fmtVNDReport(uncolOverdue));

  const profitEl = document.getElementById('rpt-net-profit');
  const profitNoteEl = document.getElementById('rpt-profit-note');
  const deltas = d.deltas || {};

  if (totalExpenses <= 0) {
    if (profitEl) {
      profitEl.textContent = '—';
      profitEl.className = 'font-heading font-extrabold text-2xl text-[#475569] mt-1.5';
    }
    if (profitNoteEl) {
      profitNoteEl.innerHTML = 'Chưa nhập chi phí · <a href="#chi-phi" onclick="switchReportSubtab(\'chi-phi\');return false;" class="text-[#16A34A] font-semibold hover:underline">Mở sổ chi →</a>';
    }
    renderDeltaBadge('rpt-delta-profit', null, false);
  } else {
    if (profitEl) {
      profitEl.textContent = fmtVNDReport(netProfit);
      profitEl.className = `font-heading font-extrabold text-2xl mt-1.5 ${netProfit < 0 ? 'text-rose-600' : 'text-[#16A34A]'}`;
    }
    if (profitNoteEl) {
      const margin = collected > 0 ? ((netProfit / collected) * 100).toFixed(1) : '0.0';
      profitNoteEl.textContent = `Cơ sở Đã thu − Chi phí (biên ${margin}%)`;
    }
    renderDeltaBadge('rpt-delta-profit', deltas.profitPct, false);
  }

  renderDeltaBadge('rpt-delta-recognized', deltas.recognizedPct, false);
  renderDeltaBadge('rpt-delta-collected', deltas.collectedPct, false);
  renderDeltaBadge('rpt-delta-uncollected', deltas.uncollectedPct, true);

  // Thẻ vận hành ở tab #chi-tiet & chi phí ở tab #chi-phi
  setTxt('rpt-total-matches', `${totalMatches} ca`);
  setTxt('rpt-occupancy-rate', `${occupancyRate.toFixed(1)}%`);
  const occSub = document.getElementById('rpt-occupancy-sub');
  if (occSub) {
    occSub.textContent = `${Number(s.totalBookedHours || 0)}h / ${Number(s.totalAvailableHours || 0)}h (${Number(s.activePitchesCount || 0)} sân hoạt động)`;
  }
  setTxt('rpt-avg-revenue', fmtVNDReport(avgRev));

  const expValEl = document.getElementById('rpt-total-expenses');
  const expSubEl = document.getElementById('rpt-expenses-sub');
  if (totalExpenses <= 0) {
    if (expValEl) expValEl.textContent = '—';
    if (expSubEl) expSubEl.textContent = 'Chưa nhập chi phí trong kỳ lọc';
  } else {
    if (expValEl) expValEl.textContent = fmtVNDReport(totalExpenses);
    if (expSubEl) expSubEl.textContent = 'Tổng chi vận hành kỳ lọc';
  }
  setTxt('rpt-expense-list-total', totalExpenses > 0 ? fmtVNDReport(totalExpenses) : 'Chưa nhập chi phí');

  // 2 Thanh xếp chồng (đồng bộ #ea580c cho Chưa thu, #16A34A cho Đã thu)
  renderStackedBar('rpt-stack-pay-bar', 'rpt-stack-pay-legend', 'rpt-stack-pay-total', [
    { label: 'Chuyển khoản VietQR', value: vietqrRev, color: '#16A34A' },
    { label: 'Tiền mặt', value: cashRev, color: '#0F172A' },
    { label: 'Chưa thu', value: uncollected, color: '#ea580c', textColor: '#ea580c' }
  ], recognized);

  renderStackedBar('rpt-stack-rev-bar', 'rpt-stack-rev-legend', 'rpt-stack-rev-total', [
    { label: 'Tiền sân', value: pitchRec, color: '#0F172A' },
    { label: 'Dịch vụ & Nước', value: servicesRec, color: '#64748B' }
  ], recognized);

  // Đối soát độc lập 3 nguồn
  renderReconciliationPanel(d.reconciliation);

  // Danh sách chưa thu
  currentReportUncollectedUpcoming = Array.isArray(d.uncollectedUpcomingList) ? d.uncollectedUpcomingList : [];
  currentReportUncollectedOverdue = Array.isArray(d.uncollectedOverdueList) ? d.uncollectedOverdueList : [];
  currentReportOverdueCodes = new Set(
    currentReportUncollectedOverdue.map(x => String(x.code || '').trim()).filter(Boolean)
  );

  // 2 biểu đồ SVG cục bộ
  renderDailyRevenueSVG(d.dailyRevenue || []);
  renderSlotRevenueSVG(d.bySlot || []);

  // Bảng hiệu suất theo sân
  currentReportPitchRows = Array.isArray(d.byPitch) ? d.byPitch : [];
  renderAdminPitchTable();

  // Bảng kê chi tiết (thống nhất cùng nguồn ca thi đấu hợp lệ)
  currentReportLedgerBookings = validMatchBookings;
  applyReportLedgerFilters(true);
  renderForfeitBookingsNotice();

  // Chi phí theo danh mục
  const expChartEl = document.getElementById('rpt-expense-categories-chart');
  const expensesByCategory = Array.isArray(d.expensesByCategory) ? d.expensesByCategory : [];
  if (expChartEl) {
    if (expensesByCategory.length === 0) {
      expChartEl.innerHTML = '<div class="py-3 text-center text-[#94A3B8]">Chưa có khoản chi vận hành nào trong kỳ lọc.</div>';
    } else {
      const maxExp = Math.max(1, ...expensesByCategory.map(c => Number(c.amount || 0)));
      const totalExpForPct = Math.max(1, expensesByCategory.reduce((acc, c) => acc + Number(c.amount || 0), 0));
      expChartEl.innerHTML = expensesByCategory.map(c => {
        const amt = Number(c.amount || 0);
        const wPct = Math.max(4, Math.round((amt / maxExp) * 100));
        const sharePct = ((amt / totalExpForPct) * 100).toFixed(1);
        return `
          <div class="space-y-1">
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-[#0F172A]">${escapeSearchHTML(c.categoryName || c.category || '')} <span class="text-[#64748B] font-normal">(${Number(c.count || 0)} khoản)</span></span>
              <span class="font-extrabold text-[#0F172A]">${fmtVNDReport(amt)} <span class="text-[#64748B] font-normal">(${sharePct}%)</span></span>
            </div>
            <div class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div class="h-full bg-[#0F172A] rounded-full transition-all" style="width:${wPct}%"></div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  applyReportKpiCollapsedState();

  if (typeof loadAdminExpenses === 'function') {
    await loadAdminExpenses();
  }
}
window.renderAdminReports = renderAdminReports;

async function exportAdminReportsCSV(format) {
  const dd = document.getElementById('rpt-export-dropdown');
  if (dd) dd.classList.add('hidden');

  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền xuất báo cáo doanh thu!', 'error');
    return;
  }

  const fmt = (format === 'excel' || format === 'xls') ? 'excel' : 'csv';
  const fromDate = (document.getElementById('rpt-from-date')?.value || '').trim();
  const toDate = (document.getElementById('rpt-to-date')?.value || '').trim();

  try {
    const qs = new URLSearchParams({ action: 'export_reports_csv', format: fmt });
    if (fromDate) qs.set('from', fromDate);
    if (toDate) qs.set('to', toDate);
    const res = await fetch(`../api/admin.php?${qs.toString()}`, { cache: 'no-store', credentials: 'same-origin' });
    if (res.status === 401 && !window._adminRedirecting401) {
      window._adminRedirecting401 = true;
      try {
        sessionStorage.removeItem('sb_current_user');
        sessionStorage.removeItem('sb_csrf_token');
        localStorage.removeItem('sb_current_user');
      } catch (e) {}
      const loginUrl = (window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath('login') : '../login') + '?redirect=portal-admin&expired=1';
      window.location.replace(loginUrl);
      return;
    }
    if (res.ok) {
      const ct = String(res.headers.get('content-type') || '').toLowerCase();
      if (ct.includes('text/csv') || ct.includes('application/vnd.ms-excel') || ct.includes('application/octet-stream')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Bao_Cao_Doanh_Thu_${fromDate || 'all'}_${toDate || 'all'}.${fmt === 'excel' ? 'xls' : 'csv'}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        if (window.SanBongApp?.showToast) {
          window.SanBongApp.showToast(`Đã xuất file báo cáo (${fmt.toUpperCase()}) thành công!`, 'success', 3000);
        }
        return;
      }
    }
  } catch (e) {}

  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast('Không thể xuất báo cáo từ máy chủ, vui lòng thử lại.', 'error', 3500);
  }
}
window.exportAdminReportsCSV = exportAdminReportsCSV;

;
/* === admin_expenses.js === */
﻿function fmtExpenseDateVN(val) {
  if (typeof fmtDateVNReport === 'function') {
    return fmtDateVNReport(val);
  }
  const raw = String(val || '').trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : raw;
}

async function loadAdminExpenses() {
  if (!isManagerOrAdmin()) return;
  const tbody = document.getElementById('admin-expenses-tbody');
  if (!tbody) return;

  const expDateEl = document.getElementById('exp-date');
  if (expDateEl && !expDateEl.value && typeof getLocalTodayISO === 'function') {
    expDateEl.value = getLocalTodayISO();
  }

  const fromDate = (document.getElementById('rpt-from-date')?.value || '').trim();
  const toDate = (document.getElementById('rpt-to-date')?.value || '').trim();
  const category = (document.getElementById('exp-filter-category')?.value || 'all').trim();

  const qs = new URLSearchParams({ action: 'get_expenses', category });
  if (fromDate) qs.set('from', fromDate);
  if (toDate) qs.set('to', toDate);

  const r = await adminFetchJson(`../api/admin.php?${qs.toString()}`);
  if (!r.ok) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-5 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải danh sách chi phí.')}</td></tr>`;
    return;
  }

  const list = Array.isArray(r.data?.expenses) ? r.data.expenses : [];
  currentAdminExpensesList = list;
  const listTotal = Number(r.data?.totalAmount ?? list.reduce((sum, ex) => sum + Number(ex.amount || 0), 0));
  const listTotalEl = document.getElementById('rpt-expense-list-total');
  if (listTotalEl) {
    listTotalEl.textContent = (listTotal <= 0 && category === 'all')
      ? 'Chưa nhập chi phí'
      : (listTotal.toLocaleString('vi-VN') + 'đ');
  }
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-[#94A3B8]">Chưa có khoản chi nào trong kỳ lọc.</td></tr>';
    return;
  }

  const catLabels = {
    dien_nuoc: 'Điện, nước sân',
    bao_tri: 'Bảo trì & Sửa chữa',
    nhap_hang: 'Nhập hàng POS',
    luong_nhan_vien: 'Lương & Thưởng',
    khac: 'Chi phí khác'
  };

  tbody.innerHTML = list.map(ex => {
    const eid = Number(ex.id);
    const actionBtns = isManagerOrAdmin()
      ? `<div class="flex items-center justify-end gap-1">
           <button type="button" onclick="openAdminExpenseEditModal(${eid})" class="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-[11px] cursor-pointer">Sửa</button>
           <button type="button" onclick="deleteAdminExpense(${eid})" class="px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[11px] cursor-pointer">Xóa</button>
         </div>`
      : '<span class="text-[#94A3B8]">—</span>';
    return `<tr class="hover:bg-slate-50">
      <td class="py-3 px-4 font-mono font-bold text-[#0F172A]">${escapeSearchHTML(ex.expense_code || ('EXP-' + eid))}</td>
      <td class="py-3 px-4 font-mono text-[#334155] whitespace-nowrap">${escapeSearchHTML(fmtExpenseDateVN(ex.expense_date || ''))}</td>
      <td class="py-3 px-4"><span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">${escapeSearchHTML(ex.category_name || catLabels[ex.category] || ex.category || '')}</span></td>
      <td class="py-3 px-4 font-semibold text-[#0F172A]">${escapeSearchHTML(ex.payer_name || '—')}</td>
      <td class="py-3 px-4 text-[#475569] max-w-[220px]">${escapeSearchHTML(ex.receipt_note || '—')}</td>
      <td class="py-3 px-4 text-right font-extrabold text-rose-600">${Number(ex.amount || 0).toLocaleString('vi-VN')}đ</td>
      <td class="py-3 px-4 text-right">${actionBtns}</td>
    </tr>`;
  }).join('');
}
window.loadAdminExpenses = loadAdminExpenses;

async function deleteAdminExpense(id) {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền xóa khoản chi!', 'error');
    return;
  }
  const ok = typeof showAdminConfirm === 'function'
    ? await showAdminConfirm({
        title: 'Xóa khoản chi vận hành',
        message: `Bạn có chắc chắn muốn xóa khoản chi #${id} khỏi sổ chi vận hành?`,
        confirmText: 'Xóa khoản chi',
        cancelText: 'Hủy',
        danger: true
      })
    : confirm(`Bạn có chắc chắn muốn xóa khoản chi #${id} khỏi sổ chi vận hành?`);
  if (!ok) return;

  const r = await adminFetchJson('../api/admin.php?action=delete_expense', {
    method: 'POST',
    body: JSON.stringify({ id: Number(id) })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể xóa khoản chi!', 'error', 4000);
    return;
  }
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã xóa khoản chi!', 'success', 3000);
  await renderAdminReports();
}
window.deleteAdminExpense = deleteAdminExpense;

function openAdminExpenseEditModal(id) {
  if (!isManagerOrAdmin()) return;
  const ex = currentAdminExpensesList.find(e => Number(e.id) === Number(id));
  if (!ex) return;

  const modal = document.getElementById('admin-expense-edit-modal');
  if (!modal) return;

  const idEl = document.getElementById('edit-exp-id');
  const dateEl = document.getElementById('edit-exp-date');
  const catEl = document.getElementById('edit-exp-category');
  const amtEl = document.getElementById('edit-exp-amount');
  const payerEl = document.getElementById('edit-exp-payer');
  const noteEl = document.getElementById('edit-exp-note');

  if (idEl) idEl.value = ex.id;
  if (dateEl) dateEl.value = ex.expense_date || '';
  if (catEl) catEl.value = ex.category || 'khac';
  if (amtEl) amtEl.value = ex.amount || '';
  if (payerEl) payerEl.value = ex.payer_name || '';
  if (noteEl) noteEl.value = ex.receipt_note || '';

  modal.classList.remove('hidden');
}
window.openAdminExpenseEditModal = openAdminExpenseEditModal;

function closeAdminExpenseEditModal() {
  const modal = document.getElementById('admin-expense-edit-modal');
  if (modal) modal.classList.add('hidden');
}
window.closeAdminExpenseEditModal = closeAdminExpenseEditModal;

async function handleSaveEditExpense(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!isManagerOrAdmin()) return;

  const id = parseInt(document.getElementById('edit-exp-id')?.value || '0', 10);
  const expenseDate = document.getElementById('edit-exp-date')?.value || '';
  const category = document.getElementById('edit-exp-category')?.value || 'khac';
  const amount = parseInt(document.getElementById('edit-exp-amount')?.value || '0', 10) || 0;
  const payerName = (document.getElementById('edit-exp-payer')?.value || '').trim();
  const receiptNote = (document.getElementById('edit-exp-note')?.value || '').trim();

  if (id <= 0 || amount < 1000) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Dữ liệu sửa không hợp lệ!', 'warning');
    return;
  }

  const btn = document.getElementById('edit-exp-submit-btn');
  const orig = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = 'Đang lưu...'; }

  try {
    const r = await adminFetchJson('../api/admin.php?action=update_expense', {
      method: 'POST',
      body: JSON.stringify({
        id,
        expense_date: expenseDate,
        category,
        amount,
        payer_name: payerName,
        receipt_note: receiptNote
      })
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể cập nhật khoản chi!', 'error');
      return;
    }
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã cập nhật khoản chi!', 'success');
    closeAdminExpenseEditModal();
    await renderAdminReports();
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = orig; }
  }
}
window.handleSaveEditExpense = handleSaveEditExpense;

async function handleAddExpense(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!isManagerOrAdmin()) return;

  const expenseDate = document.getElementById('exp-date')?.value || getLocalTodayISO();
  const category = document.getElementById('exp-category')?.value || 'khac';
  const amount = parseInt(document.getElementById('exp-amount')?.value || '0', 10) || 0;
  const payerName = (document.getElementById('exp-payer')?.value || '').trim();
  const receiptNote = (document.getElementById('exp-note')?.value || '').trim();

  if (amount < 1000) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Số tiền chi phải tối thiểu 1.000đ!', 'warning');
    return;
  }

  const btn = document.getElementById('exp-submit-btn');
  const orig = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Đang ghi...';
  }
  try {
    const r = await adminFetchJson('../api/admin.php?action=add_expense', {
      method: 'POST',
      body: JSON.stringify({
        expense_date: expenseDate,
        category,
        amount,
        payer_name: payerName,
        receipt_note: receiptNote
      })
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể ghi khoản chi!', 'error', 4000);
      return;
    }

    const amtEl = document.getElementById('exp-amount');
    const payerEl = document.getElementById('exp-payer');
    const noteEl = document.getElementById('exp-note');
    if (amtEl) amtEl.value = '';
    if (payerEl) payerEl.value = '';
    if (noteEl) noteEl.value = '';

    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã ghi nhận khoản chi vận hành!', 'success', 3500);
    await renderAdminReports();
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  }
}
window.handleAddExpense = handleAddExpense;

;
/* === admin_pricing.js === */
﻿// =========================================================
// TAB 5: BẢNG GIÁ CỐ ĐỊNH, GÓI THEO THÁNG & SUB-TABS
// =========================================================
const PRICING_SUBTABS = ['pricing', 'packages', 'vouchers'];
let activePricingSubTab = 'pricing';
let pricingServerSnapshot = {
  p5: 350000,
  p7: 450000,
  p11: 900000,
  effective_from: ''
};
let pricingInputsBound = false;
let isLoadingPricing = false;
let monthlyPackagesCache = [];
let packageServicesCatalog = [];
let packageRefPrices = { p5: 350000, p7: 450000, p11: 900000 };
let packageModalInputsBound = false;

function canManagePricing() {
  return (typeof isOwnerAdmin === 'function') ? isOwnerAdmin() : false;
}

function formatPriceInputVND(num) {
  return Number(num || 0).toLocaleString('vi-VN') + 'đ';
}

function parsePriceInputVND(str, fallback = 0) {
  const digits = String(str || '').replace(/[^\d]/g, '');
  const val = parseInt(digits, 10);
  return (!isNaN(val) && val > 0) ? val : fallback;
}

function normalizePricingSubTab(rawSub) {
  let s = String(rawSub || '').replace(/^#/, '').trim().toLowerCase();
  while (s.startsWith('pricing/')) {
    s = s.slice('pricing/'.length);
  }
  s = s.split('/')[0];
  return PRICING_SUBTABS.includes(s) ? s : '';
}

function getPricingSubTabFromHash() {
  const raw = String(window.location.hash || '').replace(/^#/, '').trim().toLowerCase();
  if (raw === 'pricing') return 'pricing';
  if (!raw.startsWith('pricing/')) return '';
  return normalizePricingSubTab(raw);
}

function switchPricingSubTab(subtab, options = {}) {
  const target = normalizePricingSubTab(subtab) || 'pricing';
  activePricingSubTab = target;

  PRICING_SUBTABS.forEach(key => {
    const btn = document.getElementById(`pricing-subtab-btn-${key}`)
      || document.querySelector(`[data-pricing-subtab="${key}"]`);
    const panel = document.getElementById(`pricing-subtab-${key}`);
    const isActive = key === target;

    if (btn) {
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      btn.className = isActive
        ? 'pricing-subtab-btn px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-[#0F172A] text-white shadow-xs'
        : 'pricing-subtab-btn px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 text-[#475569] hover:bg-slate-100';
    }
    if (panel) {
      panel.classList.toggle('hidden', !isActive);
    }
  });

  if (!options.skipHash) {
    try {
      const url = new URL(window.location.href);
      url.hash = target === 'pricing' ? '#pricing' : `#pricing/${target}`;
      history.replaceState(null, '', url.toString());
    } catch (e) {}
  }

  if (canManagePricing()) {
    if (target === 'pricing' && !options.skipLoad) {
      loadPricingTable();
    } else if (target === 'packages' && !options.skipLoad) {
      loadMonthlyPackages();
    } else if (target === 'vouchers' && !options.skipLoad && typeof renderAdminVouchers === 'function') {
      renderAdminVouchers();
    }
  }
}
window.switchPricingSubTab = switchPricingSubTab;

function bindPricingInputs() {
  if (pricingInputsBound) return;
  const priceIds = ['price-p5-base', 'price-p7-base', 'price-p11-base'];
  const effectiveEl = document.getElementById('pricing-effective-from');
  if (!document.getElementById('price-p5-base') && !effectiveEl) return;

  pricingInputsBound = true;

  priceIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      if (isLoadingPricing) return;
      syncHiddenPricingInputs();
      updatePricingDirtyUI();
    });
    el.addEventListener('blur', () => {
      if (isLoadingPricing) return;
      const fallback = id === 'price-p5-base'
        ? pricingServerSnapshot.p5
        : (id === 'price-p11-base' ? pricingServerSnapshot.p11 : pricingServerSnapshot.p7);
      const parsed = parsePriceInputVND(el.value, fallback);
      el.value = formatPriceInputVND(parsed);
      syncHiddenPricingInputs();
      updatePricingDirtyUI();
    });
  });

  if (effectiveEl) {
    effectiveEl.addEventListener('input', () => {
      if (!isLoadingPricing) updatePricingDirtyUI();
    });
    effectiveEl.addEventListener('change', () => {
      if (!isLoadingPricing) updatePricingDirtyUI();
    });
  }
}

function syncHiddenPricingInputs() {
  ['p5', 'p7', 'p11'].forEach(k => {
    const baseEl = document.getElementById(`price-${k}-base`);
    if (!baseEl) return;
    const peakEl = document.getElementById(`price-${k}-peak`);
    const wkndEl = document.getElementById(`price-${k}-weekend`);
    if (peakEl) peakEl.value = baseEl.value;
    if (wkndEl) wkndEl.value = baseEl.value;
  });
}

function getCurrentPricingFormValues() {
  return {
    p5: parsePriceInputVND(document.getElementById('price-p5-base')?.value, 0),
    p7: parsePriceInputVND(document.getElementById('price-p7-base')?.value, 0),
    p11: parsePriceInputVND(document.getElementById('price-p11-base')?.value, 0),
    effective_from: String(document.getElementById('pricing-effective-from')?.value || '').trim()
  };
}

function isPricingDirty() {
  if (!document.getElementById('price-p5-base')) return false;
  const cur = getCurrentPricingFormValues();
  return (
    cur.p5 !== Number(pricingServerSnapshot.p5) ||
    cur.p7 !== Number(pricingServerSnapshot.p7) ||
    cur.p11 !== Number(pricingServerSnapshot.p11) ||
    cur.effective_from !== String(pricingServerSnapshot.effective_from || '')
  );
}
window.isPricingDirty = isPricingDirty;

function updatePricingDirtyUI() {
  const dirty = isPricingDirty();
  const bar = document.getElementById('pricing-sticky-save-bar');
  const dot = document.getElementById('pricing-dirty-dot');
  const statusEl = document.getElementById('pricing-dirty-status');
  const resetBtn = document.getElementById('btn-reset-pricing');
  const saveBtn = document.getElementById('btn-save-pricing');

  if (bar) {
    bar.classList.toggle('border-amber-400', dirty);
    bar.classList.toggle('bg-amber-50/95', dirty);
    bar.classList.toggle('border-[#E2E8F0]', !dirty);
    bar.classList.toggle('bg-white/95', !dirty);
  }
  if (dot) {
    dot.className = dirty
      ? 'w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0'
      : 'w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0';
  }
  if (statusEl) {
    statusEl.textContent = dirty ? 'Có thay đổi chưa lưu' : 'Chưa có thay đổi';
    statusEl.className = dirty ? 'font-bold text-amber-800' : 'font-semibold text-[#64748B]';
  }
  if (resetBtn) {
    resetBtn.classList.toggle('hidden', !dirty);
  }
  if (saveBtn) {
    saveBtn.disabled = !dirty;
  }
}

function applyPricingValuesToForm(snapshot) {
  isLoadingPricing = true;
  try {
    const setVal = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.value = formatPriceInputVND(v);
    };
    setVal('price-p5-base', snapshot.p5);
    setVal('price-p7-base', snapshot.p7);
    setVal('price-p11-base', snapshot.p11);
    syncHiddenPricingInputs();

    const effEl = document.getElementById('pricing-effective-from');
    if (effEl) {
      effEl.value = snapshot.effective_from || '';
      effEl.dispatchEvent(new Event('change', { bubbles: true }));
    }
  } finally {
    isLoadingPricing = false;
  }
  updatePricingDirtyUI();
}

function resetPricingForm() {
  applyPricingValuesToForm(pricingServerSnapshot);
}
window.resetPricingForm = resetPricingForm;

async function loadPricingTable() {
  if (!canManagePricing()) return;
  bindPricingInputs();

  const r = await adminFetchJson('../api/admin.php?action=get_pricing');
  if (r.ok && r.data) {
    const d = r.data;
    const p5Base = Number(d.p5?.base ?? d.p5?.basePrice ?? 350000) || 350000;
    const p7Base = Number(d.p7?.base ?? d.p7?.basePrice ?? 450000) || 450000;
    const p11Base = Number(d.p11?.base ?? d.p11?.basePrice ?? 900000) || 900000;
    const effFrom = String(d.pricing_effective_from ?? d.effective_from ?? '').trim();

    pricingServerSnapshot = {
      p5: p5Base,
      p7: p7Base,
      p11: p11Base,
      effective_from: effFrom
    };
    packageRefPrices = { p5: p5Base, p7: p7Base, p11: p11Base };
    applyPricingValuesToForm(pricingServerSnapshot);
    return;
  }

  // Fallback to pitches cache if network offline
  const db = window.SanBongApp?.SanBongDB;
  const pitches = db ? db.getPitches() : [];
  const p5 = pitches.find(p => Number(p.type) === 5) || { basePrice: 350000 };
  const p7 = pitches.find(p => Number(p.type) === 7) || { basePrice: 450000 };
  const p11 = pitches.find(p => Number(p.type) === 11) || { basePrice: 900000 };

  pricingServerSnapshot = {
    p5: Number(p5.basePrice || 350000),
    p7: Number(p7.basePrice || 450000),
    p11: Number(p11.basePrice || 900000),
    effective_from: ''
  };
  packageRefPrices = { p5: pricingServerSnapshot.p5, p7: pricingServerSnapshot.p7, p11: pricingServerSnapshot.p11 };
  applyPricingValuesToForm(pricingServerSnapshot);
}
window.loadPricingTable = loadPricingTable;

async function savePricingTable() {
  if (!canManagePricing()) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Chỉ Chủ sân hoặc Quản lý mới có quyền thay đổi bảng giá niêm yết!', 'error');
    }
    return;
  }

  const cur = getCurrentPricingFormValues();
  if (cur.p5 <= 0 || cur.p7 <= 0 || cur.p11 <= 0) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Giá sân phải lớn hơn 0đ cho tất cả các loại sân!', 'warning');
    }
    return;
  }

  if (!isPricingDirty()) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Chưa có thay đổi để lưu.', 'info', 2500);
    }
    return;
  }

  // Kiểm tra biến động giá > 20% so với giá đang lưu trên máy chủ
  const tiers = [
    { key: 'p5', label: 'Sân 5 người', oldVal: pricingServerSnapshot.p5, newVal: cur.p5 },
    { key: 'p7', label: 'Sân 7 người', oldVal: pricingServerSnapshot.p7, newVal: cur.p7 },
    { key: 'p11', label: 'Sân 11 người', oldVal: pricingServerSnapshot.p11, newVal: cur.p11 }
  ];
  const largeChanges = tiers.filter(t => t.oldVal > 0 && Math.abs(t.newVal - t.oldVal) / t.oldVal > 0.20);

  if (largeChanges.length > 0 && typeof showAdminConfirm === 'function') {
    const lines = largeChanges.map(t => {
      const pct = ((t.newVal - t.oldVal) / t.oldVal) * 100;
      const sign = pct > 0 ? '+' : '';
      return `• ${t.label}: ${formatPriceInputVND(t.oldVal)} → ${formatPriceInputVND(t.newVal)} (${sign}${pct.toFixed(1)}%)`;
    }).join('\n');

    const confirmed = await showAdminConfirm({
      title: 'Cảnh báo thay đổi giá lớn (> 20%)',
      message: `Mức giá mới chênh lệch quá 20% so với giá hiện tại:\n${lines}\n\nBạn có chắc chắn muốn áp dụng bảng giá này?`,
      confirmText: 'Xác nhận lưu bảng giá',
      cancelText: 'Kiểm tra lại',
      danger: true
    });
    if (!confirmed) return;
  }

  const btn = document.getElementById('btn-save-pricing');
  const origText = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Đang lưu bảng giá...';
  }

  try {
    const r = await adminFetchJson('../api/admin.php?action=save_pricing', {
      method: 'POST',
      body: JSON.stringify({
        p5_base: cur.p5,
        p7_base: cur.p7,
        p11_base: cur.p11,
        pricing_effective_from: cur.effective_from,
        effective_from: cur.effective_from,
        pricing: {
          p5: { base: cur.p5, peak: cur.p5, weekend: cur.p5 },
          p7: { base: cur.p7, peak: cur.p7, weekend: cur.p7 },
          p11: { base: cur.p11, peak: cur.p11, weekend: cur.p11 }
        }
      })
    });

    if (!r || !r.ok || !r.json || r.json.success !== true) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(r?.message || 'Không thể lưu bảng giá niêm yết lên máy chủ!', 'error', 4000);
      }
      return;
    }

    const db = window.SanBongApp?.SanBongDB;
    if (db) {
      const pitches = db.getPitches().map(p => {
        const t = Number(p.type);
        const price = t === 5 ? cur.p5 : (t === 11 ? cur.p11 : cur.p7);
        return Object.assign({}, p, {
          basePrice: price,
          peakPrice: price,
          weekendPrice: price
        });
      });
      try { localStorage.setItem('sb_pitches_v2', JSON.stringify(pitches)); } catch (e) {}
      window.dispatchEvent(new CustomEvent('sb-data-synced', { detail: { pitches } }));
    }

    await loadPricingTable();
    if (typeof renderAdminPitches === 'function') renderAdminPitches();
    if (typeof initQuickBookingForm === 'function') initQuickBookingForm();
    if (monthlyPackagesCache.length > 0) renderMonthlyPackagesGrid();

    if (r?.json?.has_changed === false || r?.json?.hasChanged === false) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast('Không có thay đổi để lưu (bảng giá giữ nguyên).', 'info', 3000);
      }
    } else if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || '✓ Đã lưu cấu hình bảng giá mới và đồng bộ sang trang Đặt sân!', 'success', 3500);
    }
  } finally {
    if (btn) {
      btn.innerHTML = origText || 'Lưu bảng giá';
    }
    updatePricingDirtyUI();
  }
}
window.savePricingTable = savePricingTable;

// Cảnh báo rời trang khi còn thay đổi bảng giá chưa lưu
if (!window._pricingBeforeUnloadBound) {
  window._pricingBeforeUnloadBound = true;
  window.addEventListener('beforeunload', (e) => {
    if (isPricingDirty()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
  window.addEventListener('hashchange', () => {
    const tabEl = document.getElementById('tab-content-pricing');
    if (tabEl && !tabEl.classList.contains('hidden')) {
      const sub = getPricingSubTabFromHash();
      if (sub && sub !== activePricingSubTab) {
        switchPricingSubTab(sub, { skipHash: true });
      }
    }
  });
}

// =========================================================
// SUB-TAB 2: QUẢN LÝ GÓI HỢP ĐỒNG THEO THÁNG
// =========================================================
function getReferenceMatchPrice() {
  return Number(packageRefPrices.p7 || pricingServerSnapshot.p7 || 450000);
}

function calcPackageIncentive(discountPercent, gifts) {
  const refPrice = getReferenceMatchPrice();
  const pct = Math.max(0, Math.min(100, Number(discountPercent || 0)));
  const discountCost = Math.round(refPrice * (pct / 100));
  const giftCost = (Array.isArray(gifts) ? gifts : []).reduce((sum, g) => {
    const qty = Math.max(0, Number(g.qty || 0));
    const unitPrice = Math.max(0, Number(g.unit_price || 0));
    return sum + (qty * unitPrice);
  }, 0);
  const totalCostPerMatch = discountCost + giftCost;
  const percentOfMatch = refPrice > 0 ? (totalCostPerMatch / refPrice) * 100 : 0;
  return {
    refPrice,
    discountCost,
    giftCost,
    totalCostPerMatch,
    percentOfMatch,
    isWarning: percentOfMatch > 30
  };
}

function normalizePackageGifts(pkg) {
  if (Array.isArray(pkg?.gifts)) return pkg.gifts;
  if (typeof pkg?.gifts_json === 'string' && pkg.gifts_json.trim()) {
    try {
      const parsed = JSON.parse(pkg.gifts_json);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }
  return [];
}

async function loadMonthlyPackages() {
  if (!canManagePricing()) return;
  const grid = document.getElementById('admin-packages-grid');
  if (!grid) return;

  const r = await adminFetchJson('../api/admin.php?action=get_monthly_packages');
  if (!r.ok) {
    grid.innerHTML = `<div class="col-span-full py-8 text-center text-xs text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải danh sách gói theo tháng.')}</div>`;
    return;
  }

  const list = Array.isArray(r.json?.packages)
    ? r.json.packages
    : (Array.isArray(r.data) ? r.data : []);
  monthlyPackagesCache = list;

  if (Array.isArray(r.json?.services)) {
    packageServicesCatalog = r.json.services;
  }
  if (r.json?.reference_prices) {
    packageRefPrices = {
      p5: Number(r.json.reference_prices.p5 || packageRefPrices.p5),
      p7: Number(r.json.reference_prices.p7 || packageRefPrices.p7),
      p11: Number(r.json.reference_prices.p11 || packageRefPrices.p11)
    };
  }

  renderMonthlyPackagesGrid();
}
window.loadMonthlyPackages = loadMonthlyPackages;

function renderMonthlyPackagesGrid() {
  const grid = document.getElementById('admin-packages-grid');
  if (!grid) return;

  if (!monthlyPackagesCache || monthlyPackagesCache.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-10 text-center rounded-xl border border-dashed border-[#CBD5E1] bg-slate-50/70 space-y-2">
        <p class="text-xs font-semibold text-[#475569]">Chưa có gói hợp đồng theo tháng nào.</p>
        <button type="button" onclick="openPackageModal()" class="btn-sm btn-primary text-xs font-bold cursor-pointer">+ Tạo gói đầu tiên</button>
      </div>
    `;
    return;
  }

  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  grid.innerHTML = monthlyPackagesCache.map(pkg => {
    const id = Number(pkg.id);
    const active = Number(pkg.is_active) === 1 || pkg.is_active === true;
    const theme = String(pkg.theme || 'default');
    const gifts = normalizePackageGifts(pkg);
    const inc = calcPackageIncentive(pkg.discount_percent, gifts);

    let cardTone = 'bg-white border-[#E2E8F0]';
    let badgeTone = 'bg-slate-100 text-slate-700 border-slate-200';
    let discountTone = 'text-[#0F172A]';
    if (theme === 'diamond') {
      cardTone = 'bg-gradient-to-b from-sky-50/70 to-white border-sky-200';
      badgeTone = 'bg-sky-600 text-white border-sky-600';
      discountTone = 'text-sky-700';
    } else if (theme === 'green') {
      cardTone = 'bg-gradient-to-b from-emerald-50/70 to-white border-emerald-200';
      badgeTone = 'bg-emerald-600 text-white border-emerald-600';
      discountTone = 'text-emerald-700';
    }

    const topBadge = pkg.badge_text
      ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${badgeTone}">${escapeSearchHTML(pkg.badge_text)}</span>`
      : `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">Gói tháng</span>`;

    const statusPill = active
      ? `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#16A34A]">Đang bật</span>`
      : `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">Đang tắt</span>`;

    const giftsHtml = gifts.length > 0
      ? `<ul class="space-y-1 text-xs text-[#334155]">${gifts.map(g => {
          const lineTotal = Number(g.qty || 0) * Number(g.unit_price || 0);
          return `<li class="flex items-start justify-between gap-2">
            <span class="flex items-start gap-1.5">
              <span class="text-emerald-600 font-bold">•</span>
              <span><strong>${Number(g.qty || 1)}×</strong> ${escapeSearchHTML(g.name || '')}</span>
            </span>
            <span class="text-[11px] text-[#64748B] tabular-nums shrink-0">${escapeSearchHTML(fmt(lineTotal))}</span>
          </li>`;
        }).join('')}</ul>`
      : `<p class="text-[11px] text-[#94A3B8] italic">Không có quà tặng kèm mỗi trận.</p>`;

    const warningHtml = inc.isWarning
      ? `<div class="mt-2 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-bold flex items-center gap-1.5">
          <span>⚠️</span>
          <span>Ưu đãi ${inc.percentOfMatch.toFixed(1)}% (&gt; 30% giá ca)</span>
        </div>`
      : '';

    return `
      <article class="h-full flex flex-col justify-between rounded-2xl border p-5 shadow-2xs transition-all ${cardTone} ${active ? '' : 'opacity-65'}">
        <div class="space-y-3">
          <div class="flex items-start justify-between gap-2 min-h-[24px]">
            <div>${topBadge}</div>
            <div class="shrink-0">${statusPill}</div>
          </div>

          <div>
            <h4 class="font-heading font-extrabold text-base text-[#0F172A] leading-snug">${escapeSearchHTML(pkg.name || '')}</h4>
            <p class="text-xs text-[#64748B] font-semibold mt-0.5">${Number(pkg.months || 1)} tháng · ${Number(pkg.matches_count || 4)} trận cố định</p>
          </div>

          <div class="pt-1">
            <div class="font-heading font-extrabold text-2xl leading-tight tabular-nums ${discountTone}">Giảm ${Number(pkg.discount_percent || 0)}%</div>
            <p class="text-[11px] text-[#64748B] mt-0.5">Tiền thuê sân mỗi ca đặt cố định</p>
          </div>

          <div class="pt-2 border-t border-slate-200/80 space-y-1.5">
            <div class="text-[11px] font-bold text-[#475569] uppercase tracking-wider">Quà tặng mỗi trận</div>
            ${giftsHtml}
          </div>
        </div>

        <div class="pt-4 mt-4 border-t border-slate-200/80 space-y-3">
          <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1 text-[11px]">
            <div class="flex items-center justify-between gap-2">
              <span class="text-[#64748B] font-semibold">Chi phí ưu đãi / trận:</span>
              <span class="font-bold text-[#0F172A] tabular-nums">${escapeSearchHTML(fmt(inc.totalCostPerMatch))}</span>
            </div>
            <div class="flex items-center justify-between gap-2">
              <span class="text-[#64748B] font-semibold">% so với giá ca:</span>
              <span class="font-extrabold tabular-nums ${inc.isWarning ? 'text-amber-700' : 'text-emerald-700'}">${inc.percentOfMatch.toFixed(1)}%</span>
            </div>
            ${warningHtml}
          </div>

          <div class="flex items-center justify-end gap-1.5 flex-wrap">
            <button type="button" onclick="openPackageModal(${id})" class="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200 cursor-pointer">Sửa</button>
            <button type="button" onclick="handleTogglePackage(${id}, ${active ? 'false' : 'true'})" class="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[11px] border border-amber-200 cursor-pointer">${active ? 'Tắt' : 'Bật'}</button>
            <button type="button" onclick="handleDeletePackage(${id})" class="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[11px] border border-red-200 cursor-pointer">Xóa</button>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function bindPackageModalInputs() {
  if (packageModalInputsBound) return;
  const discEl = document.getElementById('pkg-discount-percent');
  if (!discEl) return;
  packageModalInputsBound = true;
  discEl.addEventListener('input', updatePackageIncentivePreview);
  discEl.addEventListener('change', updatePackageIncentivePreview);
}

function openPackageModal(id = null) {
  if (!canManagePricing()) return;
  bindPackageModalInputs();

  const modal = document.getElementById('package-edit-modal');
  const form = document.getElementById('package-edit-form');
  const giftsList = document.getElementById('pkg-gifts-list');
  if (!modal || !form || !giftsList) return;

  form.reset();
  giftsList.innerHTML = '';

  const pkg = id ? monthlyPackagesCache.find(x => Number(x.id) === Number(id)) : null;
  const setVal = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val; };

  if (pkg) {
    setVal('pkg-id', String(pkg.id));
    setVal('pkg-name', pkg.name || '');
    setVal('pkg-months', String(pkg.months || 1));
    setVal('pkg-matches-count', String(pkg.matches_count || 4));
    setVal('pkg-discount-percent', String(pkg.discount_percent ?? 0));
    setVal('pkg-theme', pkg.theme || 'default');
    setVal('pkg-badge-text', pkg.badge_text || '');
    const activeEl = document.getElementById('pkg-is-active');
    if (activeEl) activeEl.checked = Number(pkg.is_active) === 1 || pkg.is_active === true;

    const gifts = normalizePackageGifts(pkg);
    gifts.forEach(g => addPackageGiftRow(g));

    const titleEl = document.getElementById('package-modal-title');
    const submitBtn = document.getElementById('pkg-submit-btn');
    if (titleEl) titleEl.textContent = 'Chỉnh sửa gói theo tháng';
    if (submitBtn) submitBtn.textContent = 'Lưu cập nhật gói';
  } else {
    setVal('pkg-id', '');
    setVal('pkg-name', '');
    setVal('pkg-months', '1');
    setVal('pkg-matches-count', '4');
    setVal('pkg-discount-percent', '5');
    setVal('pkg-theme', 'default');
    setVal('pkg-badge-text', '');
    const activeEl = document.getElementById('pkg-is-active');
    if (activeEl) activeEl.checked = true;

    const titleEl = document.getElementById('package-modal-title');
    const submitBtn = document.getElementById('pkg-submit-btn');
    if (titleEl) titleEl.textContent = 'Thêm gói theo tháng mới';
    if (submitBtn) submitBtn.textContent = 'Lưu gói theo tháng';
  }

  togglePackageGiftsEmptyState();
  updatePackageIncentivePreview();

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  const nameEl = document.getElementById('pkg-name');
  if (nameEl) setTimeout(() => nameEl.focus(), 80);
}
window.openPackageModal = openPackageModal;

function closePackageModal() {
  const modal = document.getElementById('package-edit-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}
window.closePackageModal = closePackageModal;

function togglePackageGiftsEmptyState() {
  const list = document.getElementById('pkg-gifts-list');
  const emptyEl = document.getElementById('pkg-gifts-empty');
  if (!list || !emptyEl) return;
  const hasRows = list.querySelectorAll('.pkg-gift-row').length > 0;
  emptyEl.classList.toggle('hidden', hasRows);
}

function addPackageGiftRow(gift = null) {
  const list = document.getElementById('pkg-gifts-list');
  if (!list) return;

  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');
  const selectedId = gift && gift.service_id !== undefined && gift.service_id !== null ? String(gift.service_id) : '';
  const qtyVal = Math.max(1, Number(gift?.qty || 1));

  let optionsHtml = packageServicesCatalog.map(s => {
    const sid = String(s.id);
    const selected = sid === selectedId ? 'selected' : '';
    const unitLabel = s.unit ? `/${s.unit}` : '';
    return `<option value="${escapeSearchHTML(sid)}" data-name="${escapeSearchHTML(s.name)}" data-price="${Number(s.price || 0)}" ${selected}>${escapeSearchHTML(s.name)} (${escapeSearchHTML(fmt(s.price || 0))}${escapeSearchHTML(unitLabel)})</option>`;
  }).join('');

  const existsInCatalog = selectedId && packageServicesCatalog.some(s => String(s.id) === selectedId);
  if (gift && !existsInCatalog) {
    const customName = gift.name || 'Quà tặng tùy chỉnh';
    const customPrice = Number(gift.unit_price || 0);
    optionsHtml = `<option value="${escapeSearchHTML(selectedId || '')}" data-name="${escapeSearchHTML(customName)}" data-price="${customPrice}" selected>${escapeSearchHTML(customName)} (${escapeSearchHTML(fmt(customPrice))})</option>` + optionsHtml;
  }

  if (!optionsHtml) {
    optionsHtml = `<option value="" data-name="Nước suối" data-price="10000">Nước suối (10.000đ)</option>`;
  }

  const row = document.createElement('div');
  row.className = 'pkg-gift-row flex flex-wrap sm:flex-nowrap items-center gap-2 p-2 rounded-lg bg-white border border-[#E2E8F0]';
  row.innerHTML = `
    <select class="pkg-gift-service input-field h-8 text-xs font-semibold flex-1 min-w-[180px]" aria-label="Chọn dịch vụ quà tặng">
      ${optionsHtml}
    </select>
    <div class="flex items-center gap-1.5 shrink-0">
      <span class="text-[11px] text-[#64748B] font-semibold">SL:</span>
      <input type="number" class="pkg-gift-qty input-field h-8 w-16 text-xs font-bold text-center tabular-nums" min="1" max="99" value="${qtyVal}" aria-label="Số lượng quà tặng">
    </div>
    <span class="pkg-gift-subtotal text-xs font-bold text-[#0F172A] tabular-nums w-24 text-right shrink-0">0đ</span>
    <button type="button" class="pkg-gift-remove w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs border border-red-200 flex items-center justify-center cursor-pointer shrink-0" aria-label="Xóa quà tặng">✕</button>
  `;

  const sel = row.querySelector('.pkg-gift-service');
  const qtyInput = row.querySelector('.pkg-gift-qty');
  const rmBtn = row.querySelector('.pkg-gift-remove');

  sel.addEventListener('change', updatePackageIncentivePreview);
  qtyInput.addEventListener('input', updatePackageIncentivePreview);
  qtyInput.addEventListener('change', updatePackageIncentivePreview);
  rmBtn.addEventListener('click', () => {
    row.remove();
    togglePackageGiftsEmptyState();
    updatePackageIncentivePreview();
  });

  list.appendChild(row);
  togglePackageGiftsEmptyState();
  updatePackageIncentivePreview();
}
window.addPackageGiftRow = addPackageGiftRow;

function collectPackageGiftsFromForm() {
  const list = document.getElementById('pkg-gifts-list');
  if (!list) return [];
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');
  const rows = Array.from(list.querySelectorAll('.pkg-gift-row'));
  return rows.map(row => {
    const sel = row.querySelector('.pkg-gift-service');
    const opt = sel?.selectedOptions?.[0];
    const qty = Math.max(1, parseInt(row.querySelector('.pkg-gift-qty')?.value || '1', 10) || 1);
    const serviceId = String(sel?.value || '').trim();
    const name = opt?.getAttribute('data-name') || opt?.textContent || '';
    const unitPrice = Math.max(0, Number(opt?.getAttribute('data-price') || 0));
    const subEl = row.querySelector('.pkg-gift-subtotal');
    if (subEl) subEl.textContent = fmt(qty * unitPrice);
    return {
      service_id: serviceId,
      name,
      qty,
      unit_price: unitPrice
    };
  });
}

function updatePackageIncentivePreview() {
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');
  const discountPct = Number(document.getElementById('pkg-discount-percent')?.value || 0);
  const gifts = collectPackageGiftsFromForm();
  const inc = calcPackageIncentive(discountPct, gifts);

  const costEl = document.getElementById('pkg-preview-cost-per-match');
  const pctEl = document.getElementById('pkg-preview-percent');
  const warnBox = document.getElementById('pkg-incentive-warning');
  const warnText = document.getElementById('pkg-incentive-warning-text');

  if (costEl) costEl.textContent = fmt(inc.totalCostPerMatch);
  if (pctEl) {
    pctEl.textContent = `${inc.percentOfMatch.toFixed(1)}%`;
    pctEl.className = inc.isWarning
      ? 'font-heading font-extrabold text-sm text-amber-700 tabular-nums'
      : 'font-heading font-extrabold text-sm text-[#15803D] tabular-nums';
  }
  if (warnBox) {
    warnBox.classList.toggle('hidden', !inc.isWarning);
  }
  if (warnText && inc.isWarning) {
    warnText.textContent = `Tổng ưu đãi đang là ${fmt(inc.totalCostPerMatch)}/trận (${inc.percentOfMatch.toFixed(1)}% giá ca chuẩn ${fmt(inc.refPrice)}), vượt ngưỡng 30%. Hãy cân nhắc điều chỉnh để bảo đảm biên lợi nhuận.`;
  }
}
window.updatePackageIncentivePreview = updatePackageIncentivePreview;

async function handleSavePackage(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!canManagePricing()) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Bạn không có quyền chỉnh sửa gói theo tháng!', 'error');
    }
    return;
  }

  const id = parseInt(document.getElementById('pkg-id')?.value || '0', 10) || 0;
  const name = String(document.getElementById('pkg-name')?.value || '').trim();
  const months = parseInt(document.getElementById('pkg-months')?.value || '1', 10) || 1;
  const matchesCount = parseInt(document.getElementById('pkg-matches-count')?.value || '4', 10) || 4;
  const discountPercent = parseInt(document.getElementById('pkg-discount-percent')?.value || '0', 10);
  const theme = String(document.getElementById('pkg-theme')?.value || 'default');
  const badgeText = String(document.getElementById('pkg-badge-text')?.value || '').trim();
  const isActive = Boolean(document.getElementById('pkg-is-active')?.checked ?? true);
  const gifts = collectPackageGiftsFromForm();

  if (!name) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập tên gói hợp đồng!', 'warning');
    return;
  }
  if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Mức giảm giá phải từ 0% đến 100%!', 'warning');
    return;
  }

  const submitBtn = document.getElementById('pkg-submit-btn');
  const origText = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Đang lưu...';
  }

  try {
    const r = await adminFetchJson('../api/admin.php?action=save_monthly_package', {
      method: 'POST',
      body: JSON.stringify({
        id: id || undefined,
        name,
        months,
        matches_count: matchesCount,
        discount_percent: discountPercent,
        gifts,
        badge_text: badgeText,
        theme,
        is_active: isActive ? 1 : 0
      })
    });

    if (!r.ok) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(r.message || 'Không thể lưu gói theo tháng!', 'error', 4000);
      }
      return;
    }

    closePackageModal();
    await loadMonthlyPackages();
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || '✓ Đã lưu gói hợp đồng theo tháng!', 'success', 3000);
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origText || 'Lưu gói theo tháng';
    }
  }
}
window.handleSavePackage = handleSavePackage;

async function handleTogglePackage(id, nextActive) {
  if (!canManagePricing() || !id) return;
  const r = await adminFetchJson('../api/admin.php?action=toggle_monthly_package', {
    method: 'POST',
    body: JSON.stringify({
      id: Number(id),
      is_active: nextActive ? 1 : 0
    })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể cập nhật trạng thái gói!', 'error', 3500);
    }
    return;
  }
  await loadMonthlyPackages();
  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(r.message || (nextActive ? 'Đã bật gói theo tháng.' : 'Đã tạm tắt gói theo tháng.'), 'info', 2500);
  }
}
window.handleTogglePackage = handleTogglePackage;

async function handleDeletePackage(id) {
  if (!canManagePricing() || !id) return;
  const pkg = monthlyPackagesCache.find(x => Number(x.id) === Number(id));
  const pkgName = pkg ? pkg.name : `#${id}`;

  const confirmed = await showAdminConfirm({
    title: 'Xóa gói hợp đồng theo tháng',
    message: `Bạn có chắc chắn muốn xóa gói "${pkgName}"?`,
    confirmText: 'Xóa gói',
    cancelText: 'Hủy',
    danger: true
  });
  if (!confirmed) return;

  const r = await adminFetchJson('../api/admin.php?action=delete_monthly_package', {
    method: 'POST',
    body: JSON.stringify({ id: Number(id) })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể xóa gói theo tháng!', 'error', 3500);
    }
    return;
  }
  await loadMonthlyPackages();
  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(r.message || `Đã xóa gói "${pkgName}".`, 'info', 2500);
  }
}
window.handleDeletePackage = handleDeletePackage;

function initPricingTab() {
  if (!canManagePricing()) return;
  bindPricingInputs();
  const sub = getPricingSubTabFromHash() || activePricingSubTab || 'pricing';
  switchPricingSubTab(sub, { skipHash: false, skipLoad: false });
}
window.initPricingTab = initPricingTab;

;
/* === admin_security.js === */
﻿// [hoisted to admin.js]

async function runMatchRemindersNow() {
  if (!isOwnerAdmin()) return;
  const btn = document.getElementById('btn-run-reminders-now');
  const orig = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Đang gửi nhắc lịch...';
  }
  try {
    const r = await adminFetchJson('../api/admin.php?action=run_match_reminders', {
      method: 'POST',
      body: JSON.stringify({})
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể chạy nhắc lịch trước trận!', 'error', 4000);
      return;
    }
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã xử lý gửi nhắc lịch trước trận!', 'success', 4000);
    await loadNotificationLogs();
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  }
}
window.runMatchRemindersNow = runMatchRemindersNow;

;
/* === admin_settings.js === */
﻿async function loadAdminSettings() {
  if (!isManagerOrAdmin()) return;
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  let cfg = db.getSystemConfig ? db.getSystemConfig() : {
    depositRate: 30,
    hotline: '0352 313 548',
    openHours: '05:30 - 22:30 hàng ngày (kể cả Lễ, Tết)',
    holdMinutes: 15,
    waitlistHoldMinutes: 15,
    matchmakingEnabled: true,
    matchmakingRequireApproval: false,
    refundFullHours: 24,
    refundPartialHours: 4,
    autoCancelEnabled: true,
    reminderEnabled: false,
    reminderHoursBefore: 2,
    customerNotifyEnabled: false,
    customerNotifyWebhook: '',
    bookingConfirmTemplate: '',
    reminderTemplate: '',
    telegramNotifyEnabled: false,
    telegramBotTokenConfigured: false,
    telegramChatId: '',
    telegramEvents: {}
  };

  let bank = {};
  try {
    bank = JSON.parse(localStorage.getItem('sb_bank_v1') || '{}');
  } catch (e) {}

  const r = await adminFetchJson('../api/admin.php?action=settings');
  if (r.ok && r.data) {
    const sRoot = r.data;
    const s = (sRoot.settings && typeof sRoot.settings === 'object') ? sRoot.settings : sRoot;
    const bInfo = (sRoot.bankInfo && typeof sRoot.bankInfo === 'object') ? sRoot.bankInfo : sRoot;
    const autoRaw = s.autoCancelEnabled ?? s.auto_cancel_enabled;
    const boolVal = (val, def = false) => val === undefined ? def : (val === true || val === 1 || val === '1' || val === 'true');
    const evObj = (s.telegramEvents && typeof s.telegramEvents === 'object') ? s.telegramEvents : {};
    const tokenConfigured = Boolean(
      s.telegramBotTokenConfigured ||
      (s.telegramBotToken && String(s.telegramBotToken).trim() !== '')
    );

    cfg = {
      depositRate: Number(s.depositRate ?? s.deposit_rate ?? cfg.depositRate ?? 30),
      hotline: s.hotline || cfg.hotline || '0352 313 548',
      openHours: s.openHours || s.open_hours || cfg.openHours || '05:30 - 22:30 hàng ngày (kể cả Lễ, Tết)',
      holdMinutes: Math.max(5, Math.min(120, Number(s.holdMinutes ?? s.hold_minutes ?? cfg.holdMinutes ?? 15))),
      waitlistHoldMinutes: Math.max(5, Math.min(120, Number(s.waitlistHoldMinutes ?? s.waitlist_hold_minutes ?? cfg.waitlistHoldMinutes ?? 15))),
      matchmakingEnabled: boolVal(s.matchmakingEnabled ?? s.matchmaking_enabled, true),
      matchmakingRequireApproval: boolVal(s.matchmakingRequireApproval ?? s.matchmaking_require_approval, false),
      refundFullHours: Math.max(1, Math.min(168, Number(s.refundFullHours ?? s.refund_full_hours ?? cfg.refundFullHours ?? 24))),
      refundPartialHours: Math.max(0, Math.min(48, Number(s.refundPartialHours ?? s.refund_partial_hours ?? cfg.refundPartialHours ?? 4))),
      autoCancelEnabled: boolVal(autoRaw, cfg.autoCancelEnabled !== false),
      reminderEnabled: boolVal(s.reminderEnabled ?? s.reminder_enabled, false),
      reminderHoursBefore: Math.max(1, Math.min(24, Number(s.reminderHoursBefore ?? s.reminder_hours_before ?? 2))),
      customerNotifyEnabled: boolVal(s.customerNotifyEnabled ?? s.customer_notify_enabled, false),
      customerNotifyWebhook: String(s.customerNotifyWebhook ?? s.customer_notify_webhook ?? ''),
      bookingConfirmTemplate: String(s.bookingConfirmTemplate ?? s.booking_confirm_template ?? ''),
      reminderTemplate: String(s.reminderTemplate ?? s.reminder_template ?? ''),
      telegramNotifyEnabled: boolVal(s.telegramNotifyEnabled ?? s.telegram_notify_enabled, false),
      telegramBotTokenConfigured: tokenConfigured,
      telegramChatId: String(s.telegramChatId ?? s.telegram_chat_id ?? ''),
      telegramEvents: evObj
    };
    const acc = bInfo.accountNo || bInfo.accountNumber || bInfo.account_no || bank.accountNo || bank.accountNumber || '0123456789';
    bank = {
      bankName: bInfo.bankName || bInfo.bank_name || bank.bankName || 'Vietcombank',
      bankCode: (bInfo.bankCode || bInfo.bank_code || bank.bankCode || 'VCB').toUpperCase(),
      accountNo: acc,
      accountNumber: acc,
      accountName: (bInfo.accountName || bInfo.account_holder || bank.accountName || 'CONG TY CP SAN BONG PRO').toUpperCase()
    };
    const safeCfgForStorage = Object.assign({}, cfg);
    delete safeCfgForStorage.telegramBotToken;
    try {
      localStorage.setItem('sb_system_config', JSON.stringify(safeCfgForStorage));
      localStorage.setItem('sb_bank_v1', JSON.stringify(bank));
    } catch (e) {}
  }

  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  const setChk = (id, v) => { const el = document.getElementById(id); if (el) el.checked = Boolean(v); };

  setVal('cfg-deposit-rate', cfg.depositRate || 30);
  setVal('cfg-bank-name', bank.bankName || 'Vietcombank');
  setVal('cfg-bank-code', bank.bankCode || 'VCB');
  setVal('cfg-bank-acc', bank.accountNo || bank.accountNumber || '0123456789');
  setVal('cfg-bank-holder', bank.accountName || 'CONG TY CP SAN BONG PRO');
  setVal('cfg-hotline', cfg.hotline || '0352 313 548');
  setVal('cfg-open-hours', cfg.openHours || '05:30 - 22:30 hàng ngày (kể cả Lễ, Tết)');
  setVal('cfg-hold-minutes', cfg.holdMinutes ?? 15);
  setVal('cfg-refund-full-hours', cfg.refundFullHours ?? 24);
  setVal('cfg-refund-partial-hours', cfg.refundPartialHours ?? 4);
  setChk('cfg-auto-cancel-enabled', cfg.autoCancelEnabled !== false);

  setVal('cfg-waitlist-hold-minutes', cfg.waitlistHoldMinutes ?? 15);
  setChk('cfg-matchmaking-enabled', cfg.matchmakingEnabled !== false);
  setChk('cfg-matchmaking-require-approval', Boolean(cfg.matchmakingRequireApproval));

  setChk('cfg-reminder-enabled', Boolean(cfg.reminderEnabled));
  setVal('cfg-reminder-hours-before', cfg.reminderHoursBefore ?? 2);
  setChk('cfg-customer-notify-enabled', Boolean(cfg.customerNotifyEnabled));
  setVal('cfg-customer-notify-webhook', cfg.customerNotifyWebhook || '');
  setVal('cfg-booking-confirm-template', cfg.bookingConfirmTemplate || '');
  setVal('cfg-reminder-template', cfg.reminderTemplate || '');

  setChk('cfg-tg-notify-enabled', Boolean(cfg.telegramNotifyEnabled));
  setVal('cfg-tg-chat-id', cfg.telegramChatId || '');
  // Bảo mật: không điền token thật hoặc '********' vào input token
  setVal('cfg-tg-bot-token', '');
  setChk('cfg-tg-clear-token', false);

  const tokenBadge = document.getElementById('tg-token-status-badge');
  if (tokenBadge) {
    if (cfg.telegramBotTokenConfigured) {
      tokenBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700';
      tokenBadge.textContent = '✓ Đã cấu hình Token';
    } else {
      tokenBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600';
      tokenBadge.textContent = 'Chưa cấu hình Token';
    }
  }

  const tgEventsList = ['new_booking', 'cancel', 'shift_diff', 'unmatched_tx', 'low_stock', 'waitlist', 'matchmaking', 'review'];
  const evMap = cfg.telegramEvents || {};
  tgEventsList.forEach(ev => {
    const val = evMap[ev] !== undefined ? Boolean(evMap[ev]) : false;
    const elExact = document.getElementById(`cfg-tg-ev-${ev}`);
    if (elExact) elExact.checked = val;
    const elKebab = document.getElementById(`cfg-tg-ev-${ev.replace(/_/g, '-')}`);
    if (elKebab && elKebab !== elExact) elKebab.checked = val;
  });

  const isAdmin = isOwnerAdmin();
  const notice = document.getElementById('settings-role-notice');
  if (notice) {
    if (isAdmin) notice.classList.add('hidden');
    else notice.classList.remove('hidden');
  }

  const formFields = document.querySelectorAll('#admin-settings-form input, #admin-settings-form select, #admin-settings-form textarea');
  formFields.forEach(f => {
    f.disabled = !isAdmin;
  });

  const saveBtn = document.querySelector('#admin-settings-form button[type="submit"]');
  if (saveBtn) {
    saveBtn.disabled = !isAdmin;
    if (!isAdmin) {
      saveBtn.className = 'btn-base bg-slate-200 text-slate-400 text-xs font-bold px-5 cursor-not-allowed';
      saveBtn.title = 'Chỉ Chủ sân (Admin) mới có quyền lưu cấu hình hệ thống & VietQR';
    } else {
      saveBtn.className = 'btn-base btn-primary text-xs font-bold px-5 cursor-pointer';
      saveBtn.title = '';
    }
  }
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
  const openHours = (document.getElementById('cfg-open-hours')?.value || '05:30 - 22:30 hàng ngày (kể cả Lễ, Tết)').trim();
  const holdMinutes = Math.max(5, Math.min(120, parseInt(document.getElementById('cfg-hold-minutes')?.value || '15', 10) || 15));
  const waitlistHoldMinutes = Math.max(5, Math.min(120, parseInt(document.getElementById('cfg-waitlist-hold-minutes')?.value || '15', 10) || 15));
  const matchmakingEnabled = Boolean(document.getElementById('cfg-matchmaking-enabled')?.checked ?? true);
  const matchmakingRequireApproval = Boolean(document.getElementById('cfg-matchmaking-require-approval')?.checked ?? false);
  const refundFullHours = Math.max(1, Math.min(168, parseInt(document.getElementById('cfg-refund-full-hours')?.value || '24', 10) || 24));
  const rawPartial = parseInt(document.getElementById('cfg-refund-partial-hours')?.value || '4', 10);
  const refundPartialHours = Math.max(0, Math.min(48, isNaN(rawPartial) ? 4 : rawPartial));
  const autoCancelEnabled = Boolean(document.getElementById('cfg-auto-cancel-enabled')?.checked ?? true);

  const reminderEnabled = Boolean(document.getElementById('cfg-reminder-enabled')?.checked ?? false);
  const reminderHoursBefore = Math.max(1, Math.min(24, parseInt(document.getElementById('cfg-reminder-hours-before')?.value || '2', 10) || 2));
  const customerNotifyEnabled = Boolean(document.getElementById('cfg-customer-notify-enabled')?.checked ?? false);
  const customerNotifyWebhook = (document.getElementById('cfg-customer-notify-webhook')?.value || '').trim();
  const bookingConfirmTemplate = (document.getElementById('cfg-booking-confirm-template')?.value || '').trim();
  const reminderTemplate = (document.getElementById('cfg-reminder-template')?.value || '').trim();

  const telegramNotifyEnabled = Boolean(document.getElementById('cfg-tg-notify-enabled')?.checked ?? false);
  const telegramChatId = (document.getElementById('cfg-tg-chat-id')?.value || '').trim();
  const rawNewToken = (document.getElementById('cfg-tg-bot-token')?.value || '').trim();
  const clearTelegramBotToken = Boolean(document.getElementById('cfg-tg-clear-token')?.checked ?? false);

  const telegramEvents = {};
  ['new_booking', 'cancel', 'shift_diff', 'unmatched_tx', 'low_stock', 'waitlist', 'matchmaking', 'review'].forEach(ev => {
    const el = document.getElementById(`cfg-tg-ev-${ev}`) || document.getElementById(`cfg-tg-ev-${ev.replace(/_/g, '-')}`);
    telegramEvents[ev] = Boolean(el?.checked);
  });

  if (refundPartialHours >= refundFullHours) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Mốc sát giờ không hoàn cọc phải nhỏ hơn mốc hoàn 100% cọc!', 'warning', 3500);
    }
    return;
  }

  const payload = {
    depositRate,
    holdMinutes,
    waitlistHoldMinutes,
    matchmakingEnabled,
    matchmakingRequireApproval,
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
    openHours,
    reminderEnabled,
    reminderHoursBefore,
    customerNotifyEnabled,
    customerNotifyWebhook,
    bookingConfirmTemplate,
    reminderTemplate,
    telegramNotifyEnabled,
    telegramChatId,
    telegramEvents,
    clearTelegramBotToken
  };

  if (!clearTelegramBotToken && rawNewToken && !/^\*+$/.test(rawNewToken)) {
    payload.telegramBotToken = rawNewToken;
  }

  const r = await adminFetchJson('../api/admin.php?action=settings', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (!r || !r.ok || !r.json || r.json.success !== true) {
    if (r?.ref_code === 'ERR_UNSAFE_WEBHOOK_URL') {
      const whEl = document.getElementById('cfg-customer-notify-webhook');
      if (whEl) whEl.focus();
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(r.message || 'URL Webhook không hợp lệ hoặc bị chặn bảo mật SSRF!', 'error', 5000);
      }
      return;
    }
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r?.message || 'Không thể lưu cài đặt hệ thống lên máy chủ!', 'error', 4000);
    }
    return;
  }

  const cfg = {
    depositRate,
    hotline,
    openHours,
    holdMinutes,
    waitlistHoldMinutes,
    matchmakingEnabled,
    matchmakingRequireApproval,
    refundFullHours,
    refundPartialHours,
    autoCancelEnabled,
    reminderEnabled,
    reminderHoursBefore,
    customerNotifyEnabled,
    customerNotifyWebhook,
    bookingConfirmTemplate,
    reminderTemplate,
    telegramNotifyEnabled,
    telegramChatId,
    telegramEvents
  };
  const bank = { bankName, bankCode, accountNo, accountNumber: accountNo, accountName };

  try {
    localStorage.setItem('sb_system_config', JSON.stringify(cfg));
    localStorage.setItem('sb_bank_v1', JSON.stringify(bank));
  } catch (err) {
    console.error('Lỗi lưu cài đặt:', err);
  }

  await loadAdminSettings();
  window.dispatchEvent(new CustomEvent('sb-data-synced', { detail: { bankInfo: bank, settings: cfg } }));

  if (r?.json?.has_changed === false || r?.json?.hasChanged === false) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Không có thay đổi để lưu (cài đặt giữ nguyên).', 'info', 3000);
    }
  } else if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast('✓ Đã lưu cài đặt hệ thống, chính sách cọc, thông báo & cấu hình VietQR thành công!', 'success', 3500);
  }
}

async function testTelegramConnection() {
  if (!isOwnerAdmin()) return;
  const btn = document.getElementById('btn-test-telegram');
  const orig = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Đang gửi thử...';
  }
  try {
    const r = await adminFetchJson('../api/admin.php?action=test_telegram', {
      method: 'POST',
      body: JSON.stringify({})
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Gửi tin thử Telegram thất bại!', 'error', 4500);
      return;
    }
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã gửi tin nhắn thử tới Telegram Chủ sân!', 'success', 4000);
    await loadNotificationLogs();
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  }
}
window.testTelegramConnection = testTelegramConnection;


async function loadNotificationLogs() {
  if (!isManagerOrAdmin()) return;
  const tbody = document.getElementById('admin-notif-logs-tbody');
  if (!tbody) return;

  const channel = document.getElementById('notif-filter-channel')?.value || 'all';
  const status = document.getElementById('notif-filter-status')?.value || 'all';
  const search = (document.getElementById('notif-filter-search')?.value || '').trim();

  const qs = new URLSearchParams({ action: 'notification_logs', channel, status, search });
  const r = await adminFetchJson(`../api/admin.php?${qs.toString()}`);
  if (!r.ok) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-5 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải nhật ký thông báo.')}</td></tr>`;
    return;
  }

  const summary = r.data?.summary || {};
  const sentEl = document.getElementById('notif-sent-count');
  const failEl = document.getElementById('notif-failed-count');
  if (sentEl) sentEl.textContent = `${Number(summary.sent || 0)} Đã gửi`;
  if (failEl) failEl.textContent = `${Number(summary.failed || 0)} Thất bại`;

  const logs = Array.isArray(r.data?.logs) ? r.data.logs : [];
  if (logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="py-6 text-center text-[#94A3B8]">Chưa có nhật ký gửi thông báo nào.</td></tr>';
    return;
  }

  const stBadge = {
    sent: '<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">Đã gửi</span>',
    failed: '<span class="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px]">Thất bại</span>',
    pending: '<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">Đang chờ</span>'
  };

  tbody.innerHTML = logs.map(n => {
    const ch = String(n.channel || 'system').toUpperCase();
    return `<tr class="hover:bg-slate-50/70">
      <td class="py-2.5 px-3 font-mono text-[11px] text-[#475569] whitespace-nowrap">${escapeSearchHTML(n.created_at || '')}</td>
      <td class="py-2.5 px-3">
        <span class="px-2 py-0.5 rounded bg-slate-100 text-[#0F172A] font-bold text-[10px]">${escapeSearchHTML(ch)}</span>
        <div class="text-[10px] text-[#64748B] mt-0.5 font-mono">${escapeSearchHTML(n.event_type || '')}</div>
      </td>
      <td class="py-2.5 px-3">
        <div class="font-mono font-bold text-[#0F172A]">${n.booking_code ? '#' + escapeSearchHTML(n.booking_code) : '—'}</div>
        <div class="text-[11px] text-[#64748B]">${escapeSearchHTML(n.recipient || '—')}</div>
      </td>
      <td class="py-2.5 px-3 max-w-[280px]">
        <div class="font-bold text-[#0F172A]">${escapeSearchHTML(n.title || '')}</div>
        <div class="text-[11px] text-[#475569] line-clamp-2">${escapeSearchHTML(n.message || '')}</div>
      </td>
      <td class="py-2.5 px-3">${stBadge[n.status] || escapeSearchHTML(n.status || '')}</td>
      <td class="py-2.5 px-3 text-[11px] text-[#64748B] max-w-[180px] truncate" title="${escapeSearchHTML(n.response_note || '')}">${escapeSearchHTML(n.response_note || '—')}</td>
    </tr>`;
  }).join('');
}
window.loadNotificationLogs = loadNotificationLogs;

async function loadBackupsList() {
  if (!isOwnerAdmin()) return;
  const tbody = document.getElementById('admin-backups-tbody');
  if (!tbody) return;

  const r = await adminFetchJson('../api/admin.php?action=list_backups');
  if (!r.ok || !Array.isArray(r.data)) {
    tbody.innerHTML = `<tr><td colspan="4" class="py-5 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải danh sách bản sao lưu.')}</td></tr>`;
    return;
  }

  if (r.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="py-6 text-center text-[#94A3B8]">Chưa có bản sao lưu CSDL nào. Hãy bấm "Tạo bản sao lưu ngay".</td></tr>';
    return;
  }

  tbody.innerHTML = r.data.map(b => {
    const fname = b.filename || '';
    const sizeLabel = b.size_kb ? `${Number(b.size_kb).toFixed(1)} KB` : `${Math.round(Number(b.size || 0) / 1024)} KB`;
    return `<tr class="hover:bg-slate-50">
      <td class="py-3 px-4 font-mono font-bold text-[#0F172A]">${escapeSearchHTML(fname)}</td>
      <td class="py-3 px-4 font-semibold text-[#475569]">${escapeSearchHTML(sizeLabel)}</td>
      <td class="py-3 px-4 font-mono text-[#64748B]">${escapeSearchHTML(b.created_at || '')}</td>
      <td class="py-3 px-4 text-right">
        <button type="button" onclick="downloadBackupFile('${escapeJsAttr(fname)}')" class="px-3 py-1 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-[11px] cursor-pointer">⬇️ Tải về</button>
      </td>
    </tr>`;
  }).join('');
}
window.loadBackupsList = loadBackupsList;

async function backupDatabaseNow() {
  if (!isOwnerAdmin()) return;
  const ok = await showAdminConfirm({
    title: '💾 Tạo bản sao lưu CSDL ngay',
    message: 'Hệ thống sẽ xuất toàn bộ dữ liệu hiện tại ra file sao lưu nén (.sql.gz / .sql) trên máy chủ. Tiếp tục?',
    confirmText: 'Sao lưu ngay',
    cancelText: 'Hủy'
  });
  if (!ok) return;

  const btn = document.getElementById('btn-backup-now');
  const orig = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Đang sao lưu...';
  }
  try {
    const r = await adminFetchJson('../api/admin.php?action=backup_database_now', {
      method: 'POST',
      body: JSON.stringify({})
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể tạo bản sao lưu CSDL!', 'error', 4000);
      return;
    }
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã tạo bản sao lưu CSDL thành công!', 'success', 4000);
    await loadBackupsList();
    if (typeof loadAdminLogs === 'function') loadAdminLogs(1);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  }
}
window.backupDatabaseNow = backupDatabaseNow;

function downloadBackupFile(filename) {
  if (!isOwnerAdmin() || !filename) return;
  const a = document.createElement('a');
  a.href = `../api/admin.php?action=download_backup&file=${encodeURIComponent(filename)}`;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
window.downloadBackupFile = downloadBackupFile;

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

  const r = await adminFetchJson('../api/admin.php?action=run_auto_release', {
    method: 'POST',
    body: JSON.stringify({})
  });
  if (r.ok) {
    serverOk = true;
    releasedCount = Number(r.data?.released_count ?? r.data?.releasedCount ?? r.data?.released ?? r.json?.released_count ?? r.json?.released ?? 0);
    serverMsg = r.message || '';
  } else if (r.status > 0) {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origHtml || '⚡ Quét nhả đơn quá hạn ngay';
    }
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể chạy quét đơn quá hạn!', 'error', 4000);
    return;
  }

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
  if (typeof loadAdminLogs === 'function') loadAdminLogs(1);

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


;
/* === admin_finance.js === */
﻿// Sân Bóng Pro - Admin Finance Bridge
// Modularized into: admin_customers.js, admin_reports.js, admin_expenses.js, admin_pricing.js, admin_security.js, admin_settings.js

;
/* === admin_inplay.js === */
// Điều hành trận đấu đang chơi & thu tiền còn lại (Inline Timeline & Modal)
let activeInPlayCode = '';
const inPlayRemoteBookingsMap = new Map();

function inPlayFmtVND(amount) {
  if (window.SanBongApp?.formatVND) {
    return window.SanBongApp.formatVND(amount);
  }
  return Number(amount || 0).toLocaleString('vi-VN') + 'đ';
}

function normalizeInPlayStatus(rawStatus) {
  const st = String(rawStatus || 'Đang đá').trim();
  if (st === 'Vắng mặt (No-Show)' || st.includes('No-Show')) return 'Khách chưa đến';
  if (st.toLowerCase() === 'completed') return 'Hoàn thành';
  if (st === 'Giữ chỗ (chờ cọc)') return 'Giữ chỗ';
  if (st === 'Chờ cọc' || st === 'Chờ cọc 30%') return 'Chờ duyệt cọc';
  return st || 'Đang đá';
}

function normalizeBookingForInPlayModal(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const code = String(raw.code || '').trim();
  if (!code) return null;

  let services = [];
  if (Array.isArray(raw.services)) {
    services = raw.services;
  } else if (typeof raw.services_json === 'string' && raw.services_json.trim()) {
    try {
      const parsed = JSON.parse(raw.services_json);
      if (Array.isArray(parsed)) services = parsed;
    } catch (e) {}
  }

  const totalPrice = Number(raw.totalPrice ?? raw.total_price ?? 0);
  const depositAmount = Number(raw.depositAmount ?? raw.deposit_amount ?? 0);
  const paidAmount = Number(raw.paidAmount ?? raw.paid_amount ?? 0);
  const rawRemaining = raw.remainingAmount ?? raw.remaining_amount;
  const remainingAmount = (rawRemaining !== undefined && rawRemaining !== null && rawRemaining !== '')
    ? Number(rawRemaining)
    : Math.max(0, totalPrice - paidAmount);

  return {
    ...raw,
    code,
    pitchId: raw.pitchId || raw.pitch_id || '',
    pitchName: raw.pitchName || raw.pitch_name || raw.pitchId || raw.pitch_id || '',
    date: raw.date || raw.booking_date || raw.occurrenceDate || '',
    slotId: raw.slotId || raw.slot_id || '',
    slotTime: raw.slotTime || raw.slot_time || '',
    customerName: raw.customerName || raw.customer_name || 'Khách đặt sân',
    phone: raw.phone || '',
    status: raw.status || 'Đã xác nhận',
    paymentStatus: raw.paymentStatus || raw.payment_status || 'Chờ duyệt cọc',
    paymentMethod: raw.paymentMethod || raw.payment_method || '',
    totalPrice,
    depositAmount,
    paidAmount,
    remainingAmount,
    paidRemainingAmount: Number(raw.paidRemainingAmount ?? raw.paid_remaining_amount ?? 0),
    services,
    weeksCount: Math.max(1, Number(raw.weeksCount ?? raw.weeks_count ?? 1) || 1),
    note: raw.note || ''
  };
}

function cacheInPlayFallbackBooking(raw) {
  const norm = normalizeBookingForInPlayModal(raw);
  if (!norm) return null;
  inPlayRemoteBookingsMap.set(norm.code.toLowerCase(), norm);
  return norm;
}

function syncLiveBookingsCache(items) {
  if (!Array.isArray(items)) return;
  items.forEach(item => {
    const norm = normalizeBookingForInPlayModal(item);
    if (norm) {
      inPlayRemoteBookingsMap.set(norm.code.toLowerCase(), norm);
    }
  });
}
window.syncLiveBookingsCache = syncLiveBookingsCache;

function getLiveBookingsList() {
  const timelineDate = window.selectedTimelineDate;
  if (timelineDate && window.timelineBookingsByDateCache && Array.isArray(window.timelineBookingsByDateCache[timelineDate])) {
    return window.timelineBookingsByDateCache[timelineDate];
  }
  if (Array.isArray(window.overviewSummaryCache?.todayBookings)) {
    return window.overviewSummaryCache.todayBookings;
  }
  return Array.from(inPlayRemoteBookingsMap.values());
}
window.getLiveBookingsList = getLiveBookingsList;

function findInPlayBookingSync(code) {
  const cleanCode = String(code || '').trim();
  const key = cleanCode.toLowerCase();

  if (key) {
    if (inPlayRemoteBookingsMap.has(key)) {
      return inPlayRemoteBookingsMap.get(key);
    }

    const timelineDate = window.selectedTimelineDate;
    const timelineList = (timelineDate && window.timelineBookingsByDateCache && Array.isArray(window.timelineBookingsByDateCache[timelineDate]))
      ? window.timelineBookingsByDateCache[timelineDate]
      : [];

    const cacheSources = [
      ...timelineList,
      ...(Array.isArray(window.overviewSummaryCache?.todayBookings) ? window.overviewSummaryCache.todayBookings : []),
      ...(Array.isArray(window.overviewSummaryCache?.overdueBookings) ? window.overviewSummaryCache.overdueBookings : [])
    ];
    const fromLive = cacheSources.find(b => String(b?.code || '').trim().toLowerCase() === key);
    if (fromLive) {
      return cacheInPlayFallbackBooking(fromLive);
    }

    return null;
  }

  if (activeInPlayCode) {
    const cur = findInPlayBookingSync(activeInPlayCode);
    if (cur) return cur;
  }
  const liveList = getLiveBookingsList();
  if (liveList[0]) return normalizeBookingForInPlayModal(liveList[0]);
  const firstOverdue = window.overviewSummaryCache?.overdueBookings?.[0] || null;
  return firstOverdue ? cacheInPlayFallbackBooking(firstOverdue) : null;
}
window.findInPlayBookingSync = findInPlayBookingSync;

async function fetchBookingForInPlayFallback(code) {
  const cleanCode = String(code || '').trim();
  if (!cleanCode || typeof adminFetchJson !== 'function') return null;
  try {
    const singleRes = await adminFetchJson(`../api/bookings.php?code=${encodeURIComponent(cleanCode)}`);
    if (singleRes?.ok && singleRes.data && singleRes.data.code) {
      return cacheInPlayFallbackBooking(singleRes.data);
    }

    const res = await adminFetchJson('../api/admin.php?action=all_bookings');
    if (!res?.ok || !Array.isArray(res.data)) return null;
    let matched = null;
    const targetLower = cleanCode.toLowerCase();
    res.data.forEach(item => {
      const norm = normalizeBookingForInPlayModal(item);
      if (!norm) return;
      inPlayRemoteBookingsMap.set(norm.code.toLowerCase(), norm);
      if (norm.code.toLowerCase() === targetLower) {
        matched = norm;
      }
    });
    return matched;
  } catch (e) {
    return null;
  }
}

function renderInlineInPlaySelector() {
  const allBookings = getLiveBookingsList();
  if (!activeInPlayCode && allBookings.length > 0) {
    activeInPlayCode = allBookings[0].code;
  } else if (activeInPlayCode && allBookings.length > 0 && !allBookings.some(b => b.code === activeInPlayCode)) {
    activeInPlayCode = allBookings[0].code;
  }

  const selectEl = document.getElementById('inline-inplay-select');
  if (selectEl) {
    selectEl.innerHTML = allBookings.length > 0
      ? allBookings.map(b => {
          const st = (b.status === 'Vắng mặt (No-Show)' || String(b.status || '').includes('No-Show')) ? 'Khách chưa đến' : (b.status || 'Đã xác nhận');
          const safeCodeHtml = escapeSearchHTML(b.code || '');
          return `<option value="${safeCodeHtml}" ${b.code === activeInPlayCode ? 'selected' : ''}>#${safeCodeHtml} · ${escapeSearchHTML(b.pitchName)} (${escapeSearchHTML(b.slotTime || '')}) · ${escapeSearchHTML(b.customerName)} [${escapeSearchHTML(st)}]</option>`;
        }).join('')
      : '<option value="">Chưa có ca đặt sân trong ngày</option>';
  }

  const quickCardsEl = document.getElementById('inline-inplay-quick-cards');
  if (quickCardsEl) {
    quickCardsEl.innerHTML = allBookings.length > 0
      ? allBookings.map(b => {
          const isSel = b.code === activeInPlayCode;
          const st = (b.status === 'Vắng mặt (No-Show)' || String(b.status || '').includes('No-Show')) ? 'Khách chưa đến' : (b.status || 'Đã xác nhận');
          let badgeCls = 'bg-amber-100 text-amber-800 border border-amber-300';
          if (st === 'Đang đá') badgeCls = 'bg-blue-100 text-blue-700 border border-blue-300';
          else if (st === 'Đã xác nhận') badgeCls = 'bg-emerald-100 text-emerald-700 border border-emerald-300';
          else if (st === 'Đã đá - chưa tất toán') badgeCls = 'bg-amber-100 text-amber-800 border border-amber-300';
          else if (st === 'Hoàn thành') badgeCls = 'bg-emerald-600 text-white border border-emerald-700';
          else if (st === 'Khách chưa đến' || st === 'Đã hủy') badgeCls = 'bg-red-100 text-red-700 border border-red-300';
          const safeCodeHtml = escapeSearchHTML(b.code || '');
          return `
            <button type="button" data-code="${safeCodeHtml}" onclick="openInPlaySection(this.getAttribute('data-code'))" class="px-3 py-1.5 rounded-xl border-2 text-left transition-all cursor-pointer inline-flex items-center gap-2 shrink-0 ${isSel ? 'bg-emerald-50 border-[#16A34A] ring-2 ring-[#16A34A]/25 shadow-sm' : 'bg-white border-slate-300 hover:border-slate-400'}">
              <span class="font-mono font-bold text-xs text-[#0F172A] whitespace-nowrap">#${safeCodeHtml}</span>
              <span class="text-xs font-semibold text-[#334155] truncate max-w-[140px]">${escapeSearchHTML(b.customerName)}</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap shrink-0 ${badgeCls}">${escapeSearchHTML(st)}</span>
            </button>
          `;
        }).join('')
      : '<div class="text-xs text-slate-400 italic py-1">Chưa có ca đặt sân nào.</div>';
  }
}

function populateInPlayWorkspace(code) {
  const db = window.SanBongApp?.SanBongDB;
  const booking = findInPlayBookingSync(code);
  if (!booking) return null;

  activeInPlayCode = booking.code;
  const normStatus = normalizeInPlayStatus(booking.status);

  const elCode = document.getElementById('inplay-modal-code');
  const elStatus = document.getElementById('inplay-modal-status');
  const elPitch = document.getElementById('inplay-modal-pitch');
  const elCustomer = document.getElementById('inplay-modal-customer');

  if (elCode) elCode.textContent = '#' + booking.code;
  if (elStatus) {
    elStatus.textContent = normStatus === 'Giữ chỗ' ? 'Giữ chỗ (chờ cọc)' : normStatus;
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
    if (normStatus === 'Đã xác nhận' || normStatus === 'Chờ duyệt cọc' || normStatus === 'Giữ chỗ') {
      checkinBtn.classList.remove('hidden');
      checkinBtn.classList.add('inline-flex');
    } else {
      checkinBtn.classList.add('hidden');
      checkinBtn.classList.remove('inline-flex');
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
    const pitches = (db?.getPitches ? db.getPitches() : []).filter(p => p.status !== 'Bảo trì' && p.status !== 'Ẩn');
    pitchSel.innerHTML = pitches.length > 0
      ? pitches.map(p => `
        <option value="${escapeSearchHTML(p.id)}" ${p.id === booking.pitchId ? 'selected' : ''}>
          ${escapeSearchHTML(p.name)} (${inPlayFmtVND(p.basePrice)} - ${inPlayFmtVND(p.peakPrice)}/ca 2h) ${p.id === booking.pitchId ? '[Sân hiện tại]' : ''}
        </option>
      `).join('')
      : `<option value="${escapeSearchHTML(booking.pitchId)}" selected>${escapeSearchHTML(booking.pitchName || booking.pitchId || 'Sân hiện tại')}</option>`;
  }

  const srvSel = document.getElementById('inplay-service-select');
  if (srvSel) {
    const services = db?.getServices ? db.getServices() : [];
    srvSel.innerHTML = services.map(s => `
      <option value="${escapeSearchHTML(s.id)}">${escapeSearchHTML(s.name)} — ${inPlayFmtVND(s.price)}/${escapeSearchHTML(s.unit)} (Tồn: ${Number(s.stockQty ?? 50)})</option>
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
    const sysCfg = (db?.getSystemConfig && db.getSystemConfig()) || { refundFullHours: 24, refundPartialHours: 4 };
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
  const promo = booking.packagePromotion || (db?.getPackagePromotion ? db.getPackagePromotion(booking.weeksCount || 1) : null);
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

async function openInPlayModal(code, focusSection = '') {
  if (typeof window.closeAllOverviewRowMenus === 'function') {
    window.closeAllOverviewRowMenus();
  }

  const liveList = getLiveBookingsList();
  const targetCode = String(
    code
    || activeInPlayCode
    || (liveList[0] ? liveList[0].code : '')
    || (window.overviewSummaryCache?.todayBookings?.[0]?.code || '')
    || (window.overviewSummaryCache?.overdueBookings?.[0]?.code || '')
  ).trim();

  let booking = populateInPlayWorkspace(targetCode);
  if (!booking && targetCode) {
    const fetched = await fetchBookingForInPlayFallback(targetCode);
    if (fetched) {
      booking = populateInPlayWorkspace(targetCode);
    }
  }

  if (!booking) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Không tìm thấy đơn đặt sân ' + (targetCode || ''), 'error');
    return null;
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
  return booking;
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

  const r = await adminFetchJson('../api/bookings.php?action=restore&code=' + encodeURIComponent(targetCode), {
    method: 'POST',
    body: JSON.stringify({})
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể khôi phục đơn đã hủy!', 'error', 4000);
    }
    return;
  }

  await fetchBookingForInPlayFallback(targetCode);
  if (typeof refreshAllAdminViews === 'function') refreshAllAdminViews(targetCode);
  initQuickBookingForm();
  populateInPlayWorkspace(targetCode);
  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(`🔄 Đã khôi phục đơn #${targetCode} về trạng thái "Đã xác nhận"!`, 'success', 3500);
  }
}

async function restoreCurrentCancelledBooking() {
  if (!activeInPlayCode) return;
  await restoreCancelledBooking(activeInPlayCode);
}

function updateInPlayOvertimePreview() {
  const db = window.SanBongApp?.SanBongDB;
  if (!activeInPlayCode) return;
  const booking = findInPlayBookingSync(activeInPlayCode);
  if (!booking) return;

  const pitch = db?.getPitchById ? db.getPitchById(booking.pitchId) : null;
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
  const normStatus = normalizeInPlayStatus(booking.status);
  const paySt = String(booking.paymentStatus || booking.payment_status || '');
  const payLower = paySt.toLowerCase();
  const isUnpaidPending = (
    normStatus === 'Giữ chỗ'
    || normStatus === 'Chờ duyệt cọc'
    || payLower.includes('chờ duyệt cọc')
    || payLower.includes('chờ cọc')
    || payLower.includes('chưa cọc')
  );
  const total = Number(booking.totalPrice || 0);
  const deposit = isUnpaidPending
    ? Number(booking.paidAmount || 0)
    : Number(booking.depositAmount || Math.round(total * 0.3));
  const remaining = ((normStatus === 'Hoàn thành' && Number(booking.remainingAmount ?? 0) <= 0) || normStatus === 'Đã hủy' || normStatus === 'Khách chưa đến')
    ? 0
    : (typeof booking.remainingAmount === 'number' ? booking.remainingAmount : Math.max(0, total - deposit));
  const paidRem = (normStatus === 'Hoàn thành' && remaining <= 0) ? Number(booking.paidRemainingAmount || Math.max(0, total - deposit)) : 0;

  const elTotal = document.getElementById('inplay-bill-total');
  const elDep = document.getElementById('inplay-bill-deposit');
  const elPaidRow = document.getElementById('inplay-bill-paid-remaining-row');
  const elPaidVal = document.getElementById('inplay-bill-paid-remaining');
  const elRem = document.getElementById('inplay-bill-remaining');
  const elSrvList = document.getElementById('inplay-services-list');
  const elPayBtn = document.getElementById('inplay-pay-submit-btn');
  const elPayMethodWrap = document.getElementById('inplay-pay-method-wrap');

  if (elTotal) elTotal.textContent = inPlayFmtVND(total);
  if (elDep) elDep.textContent = '-' + inPlayFmtVND(deposit);
  if (elPaidRow && elPaidVal) {
    if (normStatus === 'Hoàn thành') {
      elPaidVal.textContent = '-' + inPlayFmtVND(paidRem);
      elPaidRow.classList.remove('hidden');
      elPaidRow.classList.add('flex');
    } else {
      elPaidRow.classList.add('hidden');
      elPaidRow.classList.remove('flex');
    }
  }
  if (elRem) {
    elRem.textContent = inPlayFmtVND(remaining);
    elRem.className = remaining > 0
      ? 'font-heading font-extrabold text-2xl text-[#DC2626]'
      : 'font-heading font-extrabold text-2xl text-[#16A34A]';
  }
  if (elPayBtn) {
    if (normStatus === 'Hoàn thành' && remaining <= 0) {
      elPayBtn.disabled = false;
      elPayBtn.innerHTML = '✓ Đã Thu Đủ 100% Tiền Sân (Hoàn Thành Ca)';
      elPayBtn.className = 'w-full rounded-xl bg-emerald-700 text-white font-extrabold text-xs py-2.5 shadow-sm cursor-default';
      if (elPayMethodWrap) elPayMethodWrap.classList.add('hidden');
    } else if (normStatus === 'Đã hủy' || normStatus === 'Khách chưa đến') {
      elPayBtn.disabled = true;
      elPayBtn.innerHTML = `Đơn đã kết thúc (${normStatus})`;
      elPayBtn.className = 'w-full rounded-xl bg-slate-200 text-slate-600 font-extrabold text-xs py-2.5 cursor-not-allowed';
      if (elPayMethodWrap) elPayMethodWrap.classList.add('hidden');
    } else {
      elPayBtn.disabled = false;
      elPayBtn.innerHTML = `✅ Thu Đủ Tiền Còn Lại (${inPlayFmtVND(remaining)}) & Hoàn Thành Ca`;
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
            <span class="font-bold text-[#0F172A]">${inPlayFmtVND((s.price || 0) * (s.quantity || 1))}</span>
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
    const booking = findInPlayBookingSync(activeInPlayCode);
    const bank = db?.getBankInfo ? db.getBankInfo() : {};
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

  const r = await adminFetchJson('../api/admin.php?action=manage_booking', {
    method: 'POST',
    body: JSON.stringify({ code: activeInPlayCode, sub_action: 'overtime', minutes: mins, fee: fee })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể gia hạn thêm giờ!', 'error', 4000);
    }
    return;
  }

  if (r.data) {
    const cur = findInPlayBookingSync(activeInPlayCode) || { code: activeInPlayCode };
    cacheInPlayFallbackBooking(Object.assign({}, cur, r.data));
  } else {
    await fetchBookingForInPlayFallback(activeInPlayCode);
  }
  refreshAllAdminViews(activeInPlayCode);
  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(r.message || `⏱️ Đã gia hạn thêm ${mins} phút (+${window.SanBongApp.formatVND(fee)}) cho đơn ${activeInPlayCode}!`, 'success', 3500);
  }
}

async function submitInPlayTransfer() {
  if (!activeInPlayCode) return;
  const newPitchId = document.getElementById('inplay-new-pitch')?.value;
  const reason = document.getElementById('inplay-transfer-reason')?.value.trim() || '';
  const adjustPrice = Boolean(document.getElementById('inplay-adjust-price')?.checked);

  if (!newPitchId) return;
  const currentBooking = findInPlayBookingSync(activeInPlayCode);
  if (currentBooking && currentBooking.pitchId === newPitchId) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Đơn này đang ở sân ' + currentBooking.pitchName + ' rồi. Vui lòng chọn sân khác để chuyển!', 'warning');
    return;
  }

  const r = await adminFetchJson('../api/admin.php?action=manage_booking', {
    method: 'POST',
    body: JSON.stringify({
      code: activeInPlayCode,
      sub_action: 'transfer_pitch',
      new_pitch_id: newPitchId,
      adjust_price: adjustPrice,
      reason: reason
    })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể chuyển sân! Sân đích có thể bị trùng lịch hoặc đang bảo trì.', 'error', 4500);
    }
    return;
  }

  if (r.data) {
    const cur = findInPlayBookingSync(activeInPlayCode) || { code: activeInPlayCode };
    cacheInPlayFallbackBooking(Object.assign({}, cur, { pitchId: newPitchId }, r.data));
  } else {
    await fetchBookingForInPlayFallback(activeInPlayCode);
  }
  refreshAllAdminViews(activeInPlayCode);
  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(r.message || `🔄 Đã chuyển đơn ${activeInPlayCode} sang ${r.data?.pitchName || newPitchId} và giải phóng sân cũ!`, 'success', 3500);
  }
}

async function submitInPlayService() {
  if (!activeInPlayCode) return;
  const srvId = document.getElementById('inplay-service-select')?.value;
  const qty = Math.max(1, parseInt(document.getElementById('inplay-service-qty')?.value || '1', 10));
  if (!srvId) return;

  const db = window.SanBongApp?.SanBongDB;
  const srvDef = db ? db.getServices().find(s => s.id === srvId) : null;

  const r = await adminFetchJson('../api/admin.php?action=manage_booking', {
    method: 'POST',
    body: JSON.stringify({
      code: activeInPlayCode,
      sub_action: 'add_service',
      service_id: srvId,
      service_name: srvDef ? srvDef.name : srvId,
      quantity: qty
    })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể thêm dịch vụ vào đơn (kiểm tra tồn kho)!', 'error', 4000);
    }
    return;
  }

  if (r.data) {
    const cur = findInPlayBookingSync(activeInPlayCode) || { code: activeInPlayCode };
    cacheInPlayFallbackBooking(Object.assign({}, cur, r.data));
  } else {
    await fetchBookingForInPlayFallback(activeInPlayCode);
  }
  refreshAllAdminViews(activeInPlayCode);
  if (typeof renderAdminInventory === 'function') renderAdminInventory();
  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(r.message || `🥤 Đã thêm ${qty}x ${srvDef ? srvDef.name : 'dịch vụ'} vào hóa đơn ${activeInPlayCode}!`, 'success', 3000);
  }
}

async function submitInPlayEarlyCancel() {
  if (!activeInPlayCode) return;
  const booking = findInPlayBookingSync(activeInPlayCode);
  const policy = document.getElementById('inplay-cancel-policy')?.value || 'refund_100';
  const reasonInput = document.getElementById('inplay-cancel-reason');
  const rawReason = (reasonInput?.value || '').trim();

  const payStatusStr = String(booking?.paymentStatus || booking?.payment_status || '');
  const hasPaidMoney = Boolean(
    booking && (
      Number(booking.paidAmount || 0) > 0 ||
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

  const r = await adminFetchJson('../api/admin.php?action=manage_booking', {
    method: 'POST',
    body: JSON.stringify({ code: activeInPlayCode, sub_action: 'early_cancel', policy: policy, reason: reason })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || '⚠️ Không thể hủy lịch đơn này!', 'error', 4000);
    }
    return;
  }
  const serverMsg = r.message || '';

  if (r.data) {
    const cur = findInPlayBookingSync(activeInPlayCode) || { code: activeInPlayCode };
    cacheInPlayFallbackBooking(Object.assign({}, cur, r.data));
  } else {
    await fetchBookingForInPlayFallback(activeInPlayCode);
  }
  closeInPlayModal();
  if (typeof initQuickBookingForm === 'function') initQuickBookingForm();
  refreshAllAdminViews(activeInPlayCode);

  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(
      serverMsg || (policy === 'noshow_forfeit'
        ? `⚠️ Đã đánh dấu đơn ${activeInPlayCode} là "Khách chưa đến" (tịch thu cọc 30%) & nhả sân trống!`
        : `🛑 Đã hủy lịch đơn ${activeInPlayCode} và giải phóng sân trống!`),
      'warning',
      4000
    );
  }
}

async function submitInPlayPayRemaining() {
  if (!activeInPlayCode) return;
  const curBooking = findInPlayBookingSync(activeInPlayCode);
  if (curBooking && curBooking.status === 'Hoàn thành') {
    if (typeof openInvoicePrintModal === 'function') openInvoicePrintModal(curBooking.code);
    return;
  }

  const payMethod = document.getElementById('inplay-pay-method')?.value || 'Tiền mặt tại quầy';

  const r = await adminFetchJson('../api/admin.php?action=manage_booking', {
    method: 'POST',
    body: JSON.stringify({ code: activeInPlayCode, sub_action: 'pay_remaining', pay_method: payMethod })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể tất toán phần tiền còn lại!', 'error', 4000);
    }
    return;
  }

  const updated = r.data
    ? cacheInPlayFallbackBooking(Object.assign({}, curBooking || { code: activeInPlayCode }, r.data, { remainingPaymentMethod: payMethod }))
    : await fetchBookingForInPlayFallback(activeInPlayCode);
  closeInPlayModal();
  refreshAllAdminViews(activeInPlayCode);

  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(r.message || `✅ ĐÃ THU ĐỦ 100% TIỀN SÂN: Đơn ${activeInPlayCode} đã cập nhật Hoàn thành tức thì!`, 'success', 4000);
  }
  if (typeof openInvoicePrintModal === 'function') {
    openInvoicePrintModal(updated ? updated.code : activeInPlayCode);
  }
}

function openInvoiceFromInPlay() {
  const code = activeInPlayCode;
  closeInPlayModal();
  if (code && typeof openInvoicePrintModal === 'function') openInvoicePrintModal(code);
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

;
/* === admin_vouchers.js === */
﻿// =========================================================
// 4. QUẢN LÝ MÃ GIẢM GIÁ / VOUCHER KHUYẾN MÃI (TAB 5)
// =========================================================
let editingVoucherCode = '';
let vouchersAdminCache = [];
let goldenHourRulesCache = [];
let voucherControlsBound = false;
window.editingVoucherCode = editingVoucherCode;
window.vouchersAdminCache = vouchersAdminCache;
window.goldenHourRulesCache = goldenHourRulesCache;

function canManageVouchers() {
  return (typeof isOwnerAdmin === 'function') ? isOwnerAdmin() : false;
}

function normalizeVoucherText(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function formatVoucherDateVN(isoDate) {
  const s = String(isoDate || '').trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return s;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function normalizeVoucherRecord(v) {
  if (!v) return null;
  return {
    id: String(v.id ?? v.code ?? '').toUpperCase(),
    code: String(v.code || '').replace(/\s+/g, '').toUpperCase(),
    type: v.type || v.discount_type || 'percent',
    value: Number(v.value ?? v.discount_value ?? 0),
    max_discount_amount: Number(v.max_discount_amount ?? v.maxDiscountAmount ?? 0),
    minOrder: Number(v.minOrder ?? v.min_order ?? 0),
    description: String(v.description || ''),
    max_usage: Number(v.max_usage ?? v.maxUsage ?? 0),
    used_count: Number(v.used_count ?? v.usedCount ?? 0),
    valid_from: String(v.valid_from ?? v.validFrom ?? '').trim(),
    valid_to: String(v.valid_to ?? v.validTo ?? '').trim(),
    pitch_type_limit: String(v.pitch_type_limit ?? v.pitchTypeLimit ?? '').trim(),
    isActive: v.isActive !== undefined
      ? Boolean(v.isActive)
      : (v.is_active === undefined ? true : Number(v.is_active) === 1 || v.is_active === true)
  };
}

function getVoucherTodayISO() {
  if (typeof getLocalTodayISO === 'function') return getLocalTodayISO();
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getVoucherComputedStatus(v) {
  const today = getVoucherTodayISO();
  const isDateExpired = Boolean(v.valid_to && v.valid_to < today);
  const isUsageExhausted = Boolean(v.max_usage > 0 && v.used_count >= v.max_usage);
  if (!v.isActive) return { key: 'inactive', label: 'Đang tạm khóa', isExpired: false, isExhausted: false };
  if (isDateExpired) return { key: 'expired', label: 'Đã hết hạn', isExpired: true, isExhausted: isUsageExhausted };
  if (isUsageExhausted) return { key: 'expired', label: 'Hết lượt dùng', isExpired: false, isExhausted: true };
  return { key: 'active', label: 'Đang kích hoạt', isExpired: false, isExhausted: false };
}

function updateVoucherFormTypeUI() {
  const typeEl = document.getElementById('admin-voucher-type');
  const unitEl = document.getElementById('voucher-value-unit');
  const valEl = document.getElementById('admin-voucher-value');
  const maxWrap = document.getElementById('voucher-max-discount-wrap');
  if (!typeEl) return;

  const isPercent = typeEl.value === 'percent';
  if (unitEl) unitEl.textContent = isPercent ? '%' : 'đ';
  if (valEl) {
    if (isPercent) {
      valEl.setAttribute('max', '100');
      valEl.placeholder = 'VD: 15 (từ 1 đến 100%)';
    } else {
      valEl.removeAttribute('max');
      valEl.placeholder = 'VD: 50000 (số tiền VNĐ)';
    }
  }
  if (maxWrap) {
    maxWrap.classList.toggle('hidden', !isPercent);
  }
}
window.updateVoucherFormTypeUI = updateVoucherFormTypeUI;

function validateVoucherDates() {
  const fromEl = document.getElementById('admin-voucher-valid-from');
  const toEl = document.getElementById('admin-voucher-valid-to');
  const errEl = document.getElementById('voucher-date-error');
  const validFrom = String(fromEl?.value || '').trim();
  const validTo = String(toEl?.value || '').trim();

  if (validFrom && validTo && validTo < validFrom) {
    if (errEl) {
      errEl.textContent = 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.';
      errEl.classList.remove('hidden');
    }
    if (toEl) toEl.setAttribute('aria-invalid', 'true');
    return false;
  }

  if (errEl) {
    errEl.textContent = '';
    errEl.classList.add('hidden');
  }
  if (toEl) toEl.removeAttribute('aria-invalid');
  return true;
}
window.validateVoucherDates = validateVoucherDates;

function generateRandomVoucherCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const existing = new Set((vouchersAdminCache || []).map(v => String(v.code || '').toUpperCase()));
  let code = '';
  for (let attempt = 0; attempt < 20; attempt++) {
    let suffix = '';
    for (let i = 0; i < 5; i++) {
      suffix += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    const candidate = 'SBP' + suffix;
    if (!existing.has(candidate)) {
      code = candidate;
      break;
    }
  }
  if (!code) code = 'SBP' + String(Date.now()).slice(-5);

  const codeEl = document.getElementById('admin-voucher-code');
  if (codeEl) {
    codeEl.value = code;
    codeEl.focus();
  }
  return code;
}
window.generateRandomVoucherCode = generateRandomVoucherCode;

async function copyVoucherCode(code) {
  const clean = String(code || '').trim();
  if (!clean) return;
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(clean);
    } else {
      const ta = document.createElement('textarea');
      ta.value = clean;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(`Đã sao chép mã ${clean}`, 'success', 2000);
    }
  } catch (e) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Không thể sao chép mã Voucher.', 'error', 2500);
    }
  }
}
window.copyVoucherCode = copyVoucherCode;

function bindVoucherControls() {
  if (voucherControlsBound) return;
  const codeEl = document.getElementById('admin-voucher-code');
  const typeEl = document.getElementById('admin-voucher-type');
  const fromEl = document.getElementById('admin-voucher-valid-from');
  const toEl = document.getElementById('admin-voucher-valid-to');
  const searchEl = document.getElementById('voucher-filter-search');
  const statusEl = document.getElementById('voucher-filter-status');

  if (!codeEl && !typeEl && !searchEl) return;
  voucherControlsBound = true;

  if (codeEl) {
    codeEl.addEventListener('input', () => {
      const cleaned = codeEl.value.replace(/\s+/g, '').toUpperCase();
      if (codeEl.value !== cleaned) {
        const pos = codeEl.selectionStart;
        codeEl.value = cleaned;
        if (typeof pos === 'number') {
          const nextPos = Math.min(cleaned.length, pos);
          try { codeEl.setSelectionRange(nextPos, nextPos); } catch (e) {}
        }
      }
    });
  }

  if (typeEl) {
    typeEl.addEventListener('change', updateVoucherFormTypeUI);
    updateVoucherFormTypeUI();
  }

  if (fromEl) {
    fromEl.addEventListener('change', validateVoucherDates);
    fromEl.addEventListener('input', validateVoucherDates);
  }
  if (toEl) {
    toEl.addEventListener('change', validateVoucherDates);
    toEl.addEventListener('input', validateVoucherDates);
  }

  if (searchEl) {
    searchEl.addEventListener('input', applyVoucherFilters);
  }
  if (statusEl) {
    statusEl.addEventListener('change', applyVoucherFilters);
  }
}

function renderVouchersTableRows(vouchers) {
  const tbody = document.getElementById('admin-vouchers-tbody');
  if (!tbody) return;
  const colCount = tbody.closest('table')?.querySelectorAll('thead th').length || 6;

  if (!vouchers || vouchers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${colCount}" class="py-8 text-center text-slate-400">Không tìm thấy mã Voucher phù hợp.</td></tr>`;
    return;
  }

  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  tbody.innerHTML = vouchers.map(v => {
    const isActive = v.isActive !== false;
    const st = getVoucherComputedStatus(v);
    const codeAttr = escapeJsAttr(v.code);

    const discountBadge = v.type === 'percent'
      ? `<span class="inline-flex px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Giảm ${Number(v.value)}%</span>`
      : `<span class="inline-flex px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">Giảm ${escapeSearchHTML(fmt(v.value))}</span>`;

    const capLine = (v.type === 'percent' && v.max_discount_amount > 0)
      ? `<div class="text-[11px] text-[#475569] mt-0.5">Tối đa ${escapeSearchHTML(fmt(v.max_discount_amount))}</div>`
      : '';
    const minLine = v.minOrder > 0
      ? `<div class="text-[11px] text-[#64748B]">Đơn tối thiểu ${escapeSearchHTML(fmt(v.minOrder))}</div>`
      : `<div class="text-[11px] text-[#94A3B8]">Mọi giá trị đơn</div>`;

    let usageHtml = '';
    if (v.max_usage > 0) {
      const pct = Math.min(100, Math.round((v.used_count / v.max_usage) * 100));
      const barColor = pct >= 100 ? 'bg-red-500' : (pct >= 80 ? 'bg-amber-500' : 'bg-[#16A34A]');
      usageHtml = `
        <div class="w-32 space-y-1">
          <div class="flex items-center justify-between text-[11px] font-bold tabular-nums">
            <span class="text-[#0F172A]">${Number(v.used_count)} / ${Number(v.max_usage)}</span>
            <span class="text-[#64748B]">${pct}%</span>
          </div>
          <div class="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
            <div class="h-full rounded-full ${barColor}" style="width:${pct}%"></div>
          </div>
        </div>
      `;
    } else {
      usageHtml = `
        <div class="text-[11px] font-semibold text-[#0F172A] tabular-nums">
          ${Number(v.used_count)} <span class="text-[#64748B] font-normal">/ Không giới hạn</span>
        </div>
      `;
    }

    const dateTxt = (v.valid_from || v.valid_to)
      ? `${escapeSearchHTML(v.valid_from ? formatVoucherDateVN(v.valid_from) : '...')} → ${escapeSearchHTML(v.valid_to ? formatVoucherDateVN(v.valid_to) : '...')}`
      : 'Không giới hạn ngày';
    const pitchTxt = v.pitch_type_limit ? `Chỉ Sân ${escapeSearchHTML(v.pitch_type_limit)} người` : 'Tất cả loại sân';

    let statusPillClass = 'bg-[#DCFCE7] text-[#16A34A]';
    if (st.key === 'inactive') statusPillClass = 'bg-slate-200 text-slate-600';
    else if (st.key === 'expired') statusPillClass = 'bg-red-100 text-red-700';

    const toggleTrackClass = isActive ? 'bg-[#16A34A]' : 'bg-slate-300';
    const toggleKnobClass = isActive ? 'translate-x-4' : 'translate-x-0.5';

    return `
      <tr class="hover:bg-slate-50 transition-colors ${isActive ? '' : 'opacity-70'}">
        <td class="py-3 px-4">
          <div class="flex items-center gap-1.5">
            <span class="font-mono font-extrabold text-[#16A34A] text-sm">${escapeSearchHTML(v.code)}</span>
            <button
              type="button"
              onclick="copyVoucherCode('${codeAttr}')"
              title="Sao chép mã Voucher"
              aria-label="Sao chép mã ${escapeSearchHTML(v.code)}"
              class="p-1 rounded hover:bg-slate-200/70 text-[#64748B] hover:text-[#0F172A] cursor-pointer"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke-width="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke-width="2"/></svg>
            </button>
          </div>
          ${v.description ? `<div class="text-[11px] text-[#64748B] mt-0.5 max-w-[240px] truncate" title="${escapeSearchHTML(v.description)}">${escapeSearchHTML(v.description)}</div>` : ''}
        </td>
        <td class="py-3 px-4">
          ${discountBadge}
          ${capLine}
          ${minLine}
        </td>
        <td class="py-3 px-4">${usageHtml}</td>
        <td class="py-3 px-4 text-[11px] space-y-0.5">
          <div class="text-[#334155] font-semibold">${dateTxt}</div>
          <div class="text-sky-700 font-semibold">${pitchTxt}</div>
        </td>
        <td class="py-3 px-4">
          <div class="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked="${isActive ? 'true' : 'false'}"
              aria-label="Bật hoặc tắt mã ${escapeSearchHTML(v.code)}"
              onclick="handleToggleVoucher('${codeAttr}', ${isActive ? 'false' : 'true'})"
              class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${toggleTrackClass}"
            >
              <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${toggleKnobClass}"></span>
            </button>
            <span class="px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${statusPillClass}">${escapeSearchHTML(st.label)}</span>
          </div>
        </td>
        <td class="py-3 px-4 text-right whitespace-nowrap">
          <div class="inline-flex items-center justify-end gap-1.5">
            <button type="button" onclick="handleEditVoucher('${codeAttr}')" class="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200 cursor-pointer">Sửa</button>
            <button type="button" onclick="handleDeleteVoucher('${codeAttr}')" class="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[11px] border border-red-200 cursor-pointer">Xóa</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function applyVoucherFilters() {
  const searchRaw = String(document.getElementById('voucher-filter-search')?.value || '').trim();
  const statusFilter = String(document.getElementById('voucher-filter-status')?.value || 'all');
  const query = normalizeVoucherText(searchRaw);

  const filtered = (vouchersAdminCache || []).filter(v => {
    if (query) {
      const hay = normalizeVoucherText(`${v.code} ${v.description}`);
      if (!hay.includes(query)) return false;
    }
    if (statusFilter !== 'all') {
      const st = getVoucherComputedStatus(v);
      if (st.key !== statusFilter) return false;
    }
    return true;
  });

  renderVouchersTableRows(filtered);
}
window.applyVoucherFilters = applyVoucherFilters;

async function renderAdminVouchers() {
  if (!canManageVouchers()) return;
  bindVoucherControls();
  const tbody = document.getElementById('admin-vouchers-tbody');
  if (!tbody) return;
  const db = window.SanBongApp?.SanBongDB;

  let vouchers = [];
  const r = await adminFetchJson('../api/admin.php?action=get_vouchers');
  if (r.ok && Array.isArray(r.data)) {
    vouchers = r.data.map(normalizeVoucherRecord).filter(Boolean);
    try { localStorage.setItem('sb_vouchers_v1', JSON.stringify(vouchers)); } catch (e) {}
  } else if (!r.ok && r.status === 0 && db) {
    vouchers = (db.getVouchers() || []).map(normalizeVoucherRecord).filter(Boolean);
  } else if (!r.ok) {
    const thCount = tbody.closest('table')?.querySelectorAll('thead th').length || 6;
    tbody.innerHTML = `<tr><td colspan="${thCount}" class="py-6 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải danh sách Voucher.')}</td></tr>`;
    return;
  }

  vouchersAdminCache = vouchers;
  window.vouchersAdminCache = vouchersAdminCache;
  applyVoucherFilters();
}

function handleEditVoucher(code) {
  if (!canManageVouchers() || !code) return;
  bindVoucherControls();
  const db = window.SanBongApp?.SanBongDB;
  const target = String(code).trim().toUpperCase();
  const v = vouchersAdminCache.find(x => String(x.code).toUpperCase() === target)
    || (db ? normalizeVoucherRecord(db.getVouchers().find(x => String(x.code).toUpperCase() === target)) : null);
  if (!v) return;

  editingVoucherCode = v.code;
  window.editingVoucherCode = editingVoucherCode;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) {
      el.value = val;
      if (el.type === 'date') el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };
  setVal('admin-voucher-code', v.code);
  setVal('admin-voucher-type', v.type || 'percent');
  setVal('admin-voucher-value', v.value || 0);
  setVal('admin-voucher-max-discount', v.max_discount_amount || 0);
  setVal('admin-voucher-min', v.minOrder || 0);
  setVal('admin-voucher-desc', v.description || '');
  setVal('admin-voucher-max-usage', v.max_usage ?? 0);
  setVal('admin-voucher-valid-from', v.valid_from || '');
  setVal('admin-voucher-valid-to', v.valid_to || '');
  setVal('admin-voucher-pitch-limit', v.pitch_type_limit || '');

  updateVoucherFormTypeUI();
  validateVoucherDates();

  const titleEl = document.getElementById('admin-voucher-form-title');
  const badgeEl = document.getElementById('admin-voucher-edit-badge');
  const cancelBtn = document.getElementById('admin-voucher-cancel-btn');
  const submitBtn = document.getElementById('admin-voucher-submit-btn');

  if (titleEl) titleEl.textContent = 'Chỉnh sửa mã Voucher: ' + v.code;
  if (badgeEl) badgeEl.classList.remove('hidden');
  if (cancelBtn) cancelBtn.classList.remove('hidden');
  if (submitBtn) submitBtn.textContent = 'Lưu cập nhật Voucher';

  const formEl = document.getElementById('admin-voucher-form');
  if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const valEl = document.getElementById('admin-voucher-value');
  if (valEl) setTimeout(() => valEl.focus(), 150);
}

function cancelEditVoucher() {
  editingVoucherCode = '';
  window.editingVoucherCode = '';
  const formEl = document.getElementById('admin-voucher-form');
  if (formEl && formEl.reset) formEl.reset();

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) {
      el.value = val;
      if (el.type === 'date') el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };
  setVal('admin-voucher-code', '');
  setVal('admin-voucher-type', 'percent');
  setVal('admin-voucher-value', '');
  setVal('admin-voucher-max-discount', '0');
  setVal('admin-voucher-min', '0');
  setVal('admin-voucher-desc', '');
  setVal('admin-voucher-max-usage', '100');
  setVal('admin-voucher-valid-from', '');
  setVal('admin-voucher-valid-to', '');
  setVal('admin-voucher-pitch-limit', '');

  updateVoucherFormTypeUI();
  validateVoucherDates();

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
  if (!canManageVouchers()) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Chỉ Chủ sân hoặc Quản lý mới có quyền cấu hình Voucher!', 'error');
    }
    return;
  }

  const codeEl = document.getElementById('admin-voucher-code');
  const code = String(codeEl?.value || '').replace(/\s+/g, '').toUpperCase();
  if (codeEl) codeEl.value = code;

  const type = document.getElementById('admin-voucher-type')?.value || 'percent';
  const value = parseInt(document.getElementById('admin-voucher-value')?.value || '0', 10);
  const maxDiscount = type === 'percent'
    ? Math.max(0, parseInt(document.getElementById('admin-voucher-max-discount')?.value || '0', 10) || 0)
    : 0;
  const minOrder = Math.max(0, parseInt(document.getElementById('admin-voucher-min')?.value || '0', 10) || 0);
  const description = String(document.getElementById('admin-voucher-desc')?.value || '').trim();
  const maxUsage = Math.max(0, parseInt(document.getElementById('admin-voucher-max-usage')?.value || '0', 10) || 0);
  const validFrom = String(document.getElementById('admin-voucher-valid-from')?.value || '').trim();
  const validTo = String(document.getElementById('admin-voucher-valid-to')?.value || '').trim();
  const pitchTypeLimit = String(document.getElementById('admin-voucher-pitch-limit')?.value || '').trim();

  if (!code) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập mã Voucher!', 'warning');
    if (codeEl) codeEl.focus();
    return;
  }
  if (type === 'percent' && (isNaN(value) || value < 1 || value > 100)) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Mức giảm theo phần trăm phải từ 1% đến 100%!', 'warning');
    document.getElementById('admin-voucher-value')?.focus();
    return;
  }
  if (type !== 'percent' && (isNaN(value) || value <= 0)) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Giá trị giảm cố định phải lớn hơn 0đ!', 'warning');
    document.getElementById('admin-voucher-value')?.focus();
    return;
  }
  if (!validateVoucherDates()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu!', 'warning');
    document.getElementById('admin-voucher-valid-to')?.focus();
    return;
  }

  const isEditing = Boolean(editingVoucherCode);
  const origCode = editingVoucherCode || '';

  // Kiểm tra trùng mã cục bộ trước khi gửi lên máy chủ
  const duplicate = (vouchersAdminCache || []).some(v => {
    const c = String(v.code || '').toUpperCase();
    if (isEditing && c === origCode.toUpperCase()) return false;
    return c === code;
  });
  if (duplicate) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(`Mã Voucher "${code}" đã tồn tại! Vui lòng nhập mã khác hoặc bấm Sửa.`, 'warning', 4000);
    }
    if (codeEl) codeEl.focus();
    return;
  }

  const submitBtn = document.getElementById('admin-voucher-submit-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Đang lưu...';
  }

  try {
    const r = await adminFetchJson('../api/admin.php?action=save_voucher', {
      method: 'POST',
      body: JSON.stringify({
        code,
        original_code: isEditing ? origCode : undefined,
        is_edit: isEditing,
        discount_type: type,
        discount_value: value,
        max_discount_amount: maxDiscount,
        min_order: minOrder,
        max_usage: maxUsage,
        valid_from: validFrom,
        valid_to: validTo,
        pitch_type_limit: pitchTypeLimit,
        description
      })
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(r.message || 'Không thể lưu mã Voucher!', 'error', 4000);
      }
      return;
    }

    const db = window.SanBongApp?.SanBongDB;
    if (db && typeof db.saveVoucher === 'function') {
      db.saveVoucher({
        code,
        originalCode: origCode || code,
        type,
        value,
        max_discount_amount: maxDiscount,
        minOrder,
        max_usage: maxUsage,
        valid_from: validFrom,
        valid_to: validTo,
        pitch_type_limit: pitchTypeLimit,
        description
      });
    }

    cancelEditVoucher();
    await renderAdminVouchers();
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(
        r.message || (isEditing
          ? `✓ Đã cập nhật mã khuyến mãi ${code} thành công!`
          : `✓ Đã thêm mã khuyến mãi ${code} thành công!`),
        'success',
        3500
      );
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = editingVoucherCode ? 'Lưu cập nhật Voucher' : '+ Thêm mã Voucher';
    }
  }
}

async function handleCreateVoucher(e) {
  return handleSaveVoucher(e);
}

async function handleToggleVoucher(code, nextActive) {
  if (!canManageVouchers()) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Chỉ Chủ sân hoặc Quản lý mới có quyền bật/tắt Voucher!', 'error');
    }
    return;
  }
  if (!code) return;

  const payload = { code };
  if (typeof nextActive === 'boolean') {
    payload.is_active = nextActive ? 1 : 0;
  }

  const r = await adminFetchJson('../api/admin.php?action=toggle_voucher', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể thay đổi trạng thái Voucher!', 'error', 4000);
    }
    return;
  }

  const db = window.SanBongApp?.SanBongDB;
  if (db && typeof db.toggleVoucherActive === 'function') db.toggleVoucherActive(code);
  await renderAdminVouchers();
  if (window.SanBongApp?.showToast) {
    const nowActive = r.data?.is_active !== undefined ? Number(r.data.is_active) === 1 : Boolean(nextActive);
    window.SanBongApp.showToast(
      r.message || (nowActive
        ? `Đã kích hoạt mã giảm giá ${code}.`
        : `Đã tạm khóa mã giảm giá ${code}.`),
      'info',
      2500
    );
  }
}

async function handleDeleteVoucher(code) {
  if (!canManageVouchers()) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Chỉ Chủ sân hoặc Quản lý mới có quyền xóa Voucher!', 'error');
    }
    return;
  }
  if (!code) return;

  const ok = await showAdminConfirm({
    title: 'Xóa mã giảm giá (Voucher)',
    message: `Bạn có chắc chắn muốn xóa vĩnh viễn mã Voucher ${code}?`,
    confirmText: 'Xóa Voucher',
    cancelText: 'Hủy',
    danger: true
  });
  if (!ok) return;

  const r = await adminFetchJson('../api/admin.php?action=delete_voucher', {
    method: 'POST',
    body: JSON.stringify({ code })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể xóa mã Voucher!', 'error', 4000);
    }
    return;
  }

  const db = window.SanBongApp?.SanBongDB;
  if (db && typeof db.deleteVoucher === 'function') db.deleteVoucher(code);
  if (editingVoucherCode && editingVoucherCode.toUpperCase() === String(code).toUpperCase()) {
    cancelEditVoucher();
  }

  await renderAdminVouchers();
  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(r.message || `Đã xóa mã giảm giá ${code}.`, 'info', 2500);
  }
}

window.renderAdminVouchers = renderAdminVouchers;
window.handleSaveVoucher = handleSaveVoucher;
window.handleCreateVoucher = handleCreateVoucher;
window.handleEditVoucher = handleEditVoucher;
window.cancelEditVoucher = cancelEditVoucher;
window.handleToggleVoucher = handleToggleVoucher;
window.handleDeleteVoucher = handleDeleteVoucher;
window.saveVoucher = handleSaveVoucher;
window.deleteVoucher = handleDeleteVoucher;
window.toggleVoucherStatus = handleToggleVoucher;

// =========================================================
// 5.4 QUY TẮC GIÁ GIỜ VÀNG / THẤP ĐIỂM (LEGACY SAFEKEEP)
// =========================================================
function populateGoldenHourSlots() {
  const slotSel = document.getElementById('gh-slot-id');
  if (!slotSel) return;
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;
  const prev = slotSel.value;
  const slots = db.getTimeSlots();
  slotSel.innerHTML = `<option value="">Tất cả khung giờ</option>` + slots.map(s => (
    `<option value="${escapeSearchHTML(s.id)}">${escapeSearchHTML(s.time)}</option>`
  )).join('');
  if (prev && Array.from(slotSel.options).some(o => o.value === prev)) {
    slotSel.value = prev;
  }
}

async function loadGoldenHourRules() {
  if (!canManageVouchers()) return;
  populateGoldenHourSlots();
  const tbody = document.getElementById('admin-golden-hours-tbody');
  if (!tbody) return;

  const r = await adminFetchJson('../api/admin.php?action=get_golden_hours');
  if (!r.ok || !Array.isArray(r.data)) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-5 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải quy tắc giờ vàng.')}</td></tr>`;
    return;
  }
  goldenHourRulesCache = r.data;
}
window.loadGoldenHourRules = loadGoldenHourRules;

;
/* === admin_staff.js === */
﻿// =========================================================
// 5. QUẢN LÝ TÀI KHOẢN NHÂN VIÊN TRỰC SÂN (TAB 9 - CHỦ SÂN)
// =========================================================
// [hoisted to admin.js]
// [hoisted to admin.js]

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

async function loadStaffUsers(silent = true) {
  if (!isOwnerAdmin()) return;

  const r = await adminFetchJson('../api/admin.php?action=staff_users');
  if (r.ok && Array.isArray(r.data)) {
    cachedStaffUsers = r.data;
    saveLocalStaffUsers(cachedStaffUsers);
    renderStaffUsers(cachedStaffUsers);
    return;
  }

  cachedStaffUsers = getLocalStaffUsers();
  renderStaffUsers(cachedStaffUsers);
  if (!silent && window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(r.message || 'Không thể tải danh sách nhân sự!', 'error');
  }
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
  if (password.length < 8) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Mật khẩu nhân sự phải có tối thiểu 8 ký tự.', 'warning');
    return;
  }

  const origText = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Đang tạo tài khoản...';
  }

  try {
    const r = await adminFetchJson('../api/admin.php?action=staff_users', {
      method: 'POST',
      body: JSON.stringify({
        sub_action: 'create',
        username,
        full_name: fullName,
        phone,
        password,
        role
      })
    });

    if (r.ok) {
      if (form && typeof form.reset === 'function') form.reset();
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(`✓ ${r.message || 'Đã tạo tài khoản nhân sự thành công!'}`, 'success', 3500);
      }
      await loadStaffUsers();
      return;
    }

    if (r.status > 0) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(r.message || 'Không thể tạo tài khoản nhân sự.', 'error', 3500);
      }
      return;
    }

    // Offline network fallback (status === 0)
    const localList = getLocalStaffUsers();
    if (localList.some(u => String(u.username || '').toLowerCase() === username.toLowerCase())) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast('Tên đăng nhập này đã tồn tại trên hệ thống.', 'error');
      }
      return;
    }
    const nowLocal = new Date();
    const pad2 = n => String(n).padStart(2, '0');
    const createdLocal = `${nowLocal.getFullYear()}-${pad2(nowLocal.getMonth() + 1)}-${pad2(nowLocal.getDate())} ${pad2(nowLocal.getHours())}:${pad2(nowLocal.getMinutes())}:${pad2(nowLocal.getSeconds())}`;
    const newStaff = {
      id: Date.now(),
      username,
      email: `${username.toLowerCase()}@sanbongpro.vn`,
      phone,
      full_name: fullName,
      role,
      status: 'active',
      created_at: createdLocal
    };
    localList.unshift(newStaff);
    saveLocalStaffUsers(localList);
    cachedStaffUsers = localList;
    renderStaffUsers(cachedStaffUsers);
    if (form && typeof form.reset === 'function') form.reset();
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(`✓ Đã tạo tài khoản ${role === 'manager' ? 'Quản lý sân' : 'Nhân viên trực'} ${username} (offline)!`, 'success', 3500);
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

  const r = await adminFetchJson('../api/admin.php?action=staff_users', {
    method: 'POST',
    body: JSON.stringify({ sub_action: 'update_role', id: staffId, role })
  });

  if (r.ok) {
    const localList = cachedStaffUsers.length > 0 ? [...cachedStaffUsers] : getLocalStaffUsers();
    const target = localList.find(u => Number(u.id) === staffId);
    if (target) {
      target.role = role;
      saveLocalStaffUsers(localList);
    }
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(`✓ ${r.message || 'Đã cập nhật vai trò nhân sự thành công!'}`, 'success', 3000);
    }
    await loadStaffUsers();
    return;
  }

  if (r.status > 0) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể cập nhật vai trò nhân sự.', 'error');
    }
    renderStaffUsers(cachedStaffUsers);
    return;
  }

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
window.handleChangeStaffRole = handleChangeStaffRole;

async function handleToggleStaffStatus(id) {
  if (!isOwnerAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Chủ sân mới có quyền khóa/mở khóa nhân viên!', 'error');
    return;
  }

  const staffId = Number(id);
  if (!staffId) return;

  const r = await adminFetchJson('../api/admin.php?action=staff_users', {
    method: 'POST',
    body: JSON.stringify({ sub_action: 'toggle_status', id: staffId })
  });

  if (r.ok) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(`✓ ${r.message || 'Đã cập nhật trạng thái nhân viên.'}`, 'success', 3000);
    }
    await loadStaffUsers();
    return;
  }

  if (r.status > 0) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể cập nhật trạng thái nhân viên.', 'error');
    }
    return;
  }

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
  if (password.length < 8) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Mật khẩu mới phải có tối thiểu 8 ký tự!', 'warning');
    return;
  }

  const origText = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Đang cập nhật...';
  }

  try {
    const r = await adminFetchJson('../api/admin.php?action=staff_users', {
      method: 'POST',
      body: JSON.stringify({ sub_action: 'reset_password', id, password })
    });

    if (r.ok) {
      closeResetStaffPwModal();
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(`✓ ${r.message || 'Đã đặt lại mật khẩu nhân viên thành công!'}`, 'success', 3500);
      }
      return;
    }

    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể đặt lại mật khẩu nhân viên.', 'error');
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


;
/* === admin_catalog.js === */
﻿// =========================================================
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
  const srv = db.getServices().find(s => s.id === srvId);
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  if (srv) {
    const stock = Number(srv.stockQty ?? 50);
    if (qtyEl) {
      qtyEl.max = stock > 0 ? stock : 1;
      if (parseInt(qtyEl.value, 10) > stock && stock > 0) {
        qtyEl.value = stock;
      }
    }
    const qty = Math.max(1, parseInt(qtyEl?.value || '1', 10) || 1);
    const lineTotal = Number(srv.price || 0) * qty;
    if (totalEl) totalEl.textContent = fmt(lineTotal);
    const linePreviewEl = document.getElementById('pos-sale-line-preview');
    if (linePreviewEl) {
      linePreviewEl.textContent = `Thành tiền: ${fmt(lineTotal)} · Còn tồn: ${stock} ${srv.unit || ''}`;
    }
    if (stockEl) {
      stockEl.textContent = `${stock} ${srv.unit || ''}`;
      stockEl.className = stock <= Number(srv.minStockWarning ?? 10)
        ? 'font-bold text-red-600'
        : 'font-bold text-slate-700';
    }
  }
}
window.updatePosSalePreview = updatePosSalePreview;

function stepPosQty(delta) {
  const el = document.getElementById('pos-service-qty');
  if (!el) return;
  const cur = parseInt(el.value, 10) || 1;
  const max = parseInt(el.max, 10) || 200;
  const nxt = Math.max(1, Math.min(max, cur + delta));
  el.value = nxt;
  updatePosSalePreview();
}
window.stepPosQty = stepPosQty;

function renderAdminInventory() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const services = db.getServices();
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  const openSrvBtn = document.getElementById('btn-open-service-modal');
  if (openSrvBtn) {
    const canManage = isManagerOrAdmin();
    openSrvBtn.classList.toggle('hidden', !canManage);
    openSrvBtn.style.display = canManage ? '' : 'none';
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
      return `<option value="${escapeSearchHTML(s.id)}" ${st <= 0 ? 'disabled' : ''}>${escapeSearchHTML(s.name)} — ${escapeSearchHTML(fmt(s.price))}/${escapeSearchHTML(s.unit || 'cái')} (Tồn: ${st})</option>`;
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

  const pitchDatalist = document.getElementById('pos-pitch-code-options');
  if (pitchDatalist && typeof db.getPitches === 'function') {
    const pitchList = db.getPitches().filter(p => p && p.status !== 'Ẩn');
    pitchDatalist.innerHTML = pitchList.map(p =>
      `<option value="${escapeSearchHTML(p.id)}">${escapeSearchHTML(p.name || p.id)}</option>`
    ).join('');
  }

  // 3. Render bảng tồn kho
  const tbody = document.getElementById('admin-inventory-tbody');
  if (!tbody) return;

  tbody.innerHTML = services.map(s => {
    const stock = Number(s.stockQty ?? 50);
    const minW = Number(s.minStockWarning ?? 10);
    const safeSrvIdAttr = escapeJsAttr(s.id);

    let stockBadge = '';
    if (stock <= 0) {
      stockBadge = `<span class="inline-block ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-200 text-slate-700 border border-slate-300 whitespace-nowrap">Hết hàng</span>`;
    } else if (stock <= minW) {
      stockBadge = `<span class="inline-block ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700 border border-red-300 whitespace-nowrap">Sắp hết</span>`;
    } else {
      stockBadge = `<span class="inline-block ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">Đủ hàng</span>`;
    }

    return `
      <tr class="hover:bg-slate-50 transition-colors ${stock <= minW ? 'bg-red-50/30' : ''}">
        <td class="py-2 px-2.5 font-bold text-[#0F172A] leading-snug">
          <div>${escapeSearchHTML(s.name)}</div>
          <div class="text-[10px] font-mono font-normal text-slate-400">${escapeSearchHTML(s.id)}</div>
        </td>
        <td class="py-2 px-2 font-extrabold text-[#16A34A] whitespace-nowrap">
          ${escapeSearchHTML(fmt(s.price))} <span class="text-[11px] font-normal text-slate-500">/ ${escapeSearchHTML(s.unit || 'đơn vị')}</span>
        </td>
        <td class="py-2 px-2 text-center whitespace-nowrap">
          <span class="font-mono font-extrabold text-sm ${stock <= 0 ? 'text-slate-500' : (stock <= minW ? 'text-red-600' : 'text-[#0F172A]')}">${stock}</span>
          <span class="text-[11px] text-slate-500">${escapeSearchHTML(s.unit || '')}</span>
          ${stockBadge}
        </td>
        <td class="py-2 px-2 text-center font-mono text-xs text-slate-500 whitespace-nowrap">
          ≤ ${minW}
        </td>
        <td class="py-2 px-2.5 text-right whitespace-nowrap">
          ${isManagerOrAdmin() ? `
            <div class="inline-flex flex-nowrap items-center justify-end gap-1 whitespace-nowrap">
              <button type="button" onclick="promptRestockService('${safeSrvIdAttr}')" class="inline-flex items-center justify-center h-7 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs cursor-pointer whitespace-nowrap shrink-0">
                + Nhập kho
              </button>
              <button type="button" onclick="openServiceModal('${safeSrvIdAttr}')" class="inline-flex items-center justify-center h-7 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#0F172A] border border-slate-300 font-bold text-[11px] cursor-pointer whitespace-nowrap shrink-0">
                Sửa
              </button>
              <button type="button" onclick="handleDeleteService('${safeSrvIdAttr}')" class="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-[11px] cursor-pointer shrink-0" title="Ngừng kinh doanh / Xóa dịch vụ">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          ` : `
            <span class="text-[11px] text-slate-400 italic">Chỉ xem</span>
          `}
        </td>
      </tr>
    `;
  }).join('');
}
window.renderAdminInventory = renderAdminInventory;

let isPosSaleSubmitting = false;

async function handleCounterServiceSale(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (isPosSaleSubmitting) return;

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

  const form = e?.target && e.target.tagName === 'FORM' ? e.target : document.getElementById('pos-service-select')?.closest('form');
  const submitBtn = e?.submitter || document.getElementById('pos-sale-submit-btn') || form?.querySelector('button[type="submit"]');
  const origBtnHtml = submitBtn ? submitBtn.innerHTML : '';

  isPosSaleSubmitting = true;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Đang xuất kho...';
  }

  try {
    const r = await adminFetchJson('../api/admin.php?action=inventory', {
      method: 'POST',
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
    if (!r.ok) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(r.message || 'Không thể bán dịch vụ (kiểm tra lại tồn kho)!', 'error', 4000);
      }
      return;
    }

    const sale = db.recordCounterSale({
      serviceId: srvId,
      quantity: qty,
      payMethod: payMethod,
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
        window.SanBongApp.showToast(r.message || `💰 Đã bán ${qty}x ${sale.serviceName} (${fmt(sale.totalAmount)} - ${payMethod}) & trừ tồn kho!`, 'success', 3500);
      }
    }
  } finally {
    isPosSaleSubmitting = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origBtnHtml;
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

  const rawQty = await showAdminPrompt({
    title: `📦 Nhập thêm kho: ${srv.name}`,
    message: `• Tồn kho hiện tại: ${Number(srv.stockQty ?? 0)} ${srv.unit || ''}\n• Nhập số lượng thêm vào kho (ví dụ: 24 hoặc 48):`,
    placeholder: 'VD: 24',
    defaultValue: '24',
    inputType: 'number',
    confirmText: 'Nhập kho',
    cancelText: 'Hủy'
  });
  if (rawQty === null) return;
  const added = parseInt(String(rawQty).replace(/[^\d]/g, ''), 10);
  if (!added || added <= 0) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Số lượng nhập kho phải lớn hơn 0!', 'warning');
    return;
  }

  const r = await adminFetchJson('../api/admin.php?action=inventory', {
    method: 'POST',
    body: JSON.stringify({ sub_action: 'restock', id: serviceId, add_qty: added, added_qty: added })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể nhập thêm kho hàng!', 'error', 4000);
    return;
  }

  const updated = db.restockService(serviceId, added);
  renderAdminInventory();
  if (isOwnerAdmin() && typeof loadAdminLogs === 'function') loadAdminLogs(1);

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

  const r = await adminFetchJson('../api/admin.php?action=inventory', {
    method: 'POST',
    body: JSON.stringify(Object.assign({ sub_action: 'save_service' }, payload))
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể lưu mặt hàng dịch vụ!', 'error', 4000);
    return;
  }

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
  const ok = await showAdminConfirm({
    title: 'Ngừng kinh doanh dịch vụ',
    message: `Ngừng kinh doanh dịch vụ "${srv.name}" (${srv.id})?`,
    confirmText: 'Ngừng kinh doanh',
    cancelText: 'Giữ lại',
    danger: true
  });
  if (!ok) return;

  const r = await adminFetchJson('../api/admin.php?action=inventory', {
    method: 'POST',
    body: JSON.stringify({ sub_action: 'delete_service', id: serviceId })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể ngừng kinh doanh dịch vụ!', 'error', 4000);
    return;
  }

  if (db && typeof db.deleteServiceItem === 'function') {
    db.deleteServiceItem(serviceId);
  }
  renderAdminInventory();
  if (isOwnerAdmin() && typeof loadAdminLogs === 'function') loadAdminLogs(1);
  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(`🗑️ Đã ngừng kinh doanh dịch vụ "${srv.name}".`, 'info', 3000);
  }
}
window.handleDeleteService = handleDeleteService;


;
/* === admin_shifts.js === */
﻿// =========================================================
// TAB 8: CHỐT CA & BÀN GIAO TIỀN MẶT (SHIFT HANDOVER)
// =========================================================
let currentShiftPage = 1;
let currentShiftTotalPages = 1;
let currentShiftRowsCache = new Map();

function formatShiftVND(n) {
  if (window.SanBongApp && typeof window.SanBongApp.formatVND === 'function') {
    return window.SanBongApp.formatVND(n || 0);
  }
  return Number(n || 0).toLocaleString('vi-VN') + 'đ';
}

function formatShiftDateTime(value) {
  const raw = String(value || '').trim();
  if (!raw) return '—';
  if (/^\d{2}\/\d{2}\/\d{4}(?:\s+\d{2}:\d{2})?$/.test(raw)) return raw;
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (m) {
    const base = `${m[3]}/${m[2]}/${m[1]}`;
    return (m[4] && m[5]) ? `${base} ${m[4]}:${m[5]}` : base;
  }
  return raw;
}

function validateShiftReasonClient(reason, minLen = 10) {
  const collapsed = String(reason || '').replace(/\s+/g, ' ').trim();
  if (collapsed.length < minLen) {
    return { valid: false, message: `Lý do bắt buộc phải có tối thiểu ${minLen} ký tự rõ ràng.` };
  }
  const noSpace = collapsed.replace(/\s+/g, '');
  if (!/\p{L}/u.test(noSpace)) {
    return { valid: false, message: 'Lý do phải có nội dung chữ mô tả rõ ràng.' };
  }
  const lower = noSpace.toLowerCase();
  const chars = Array.from(lower);
  const uniq = new Set(chars).size;
  if (uniq < 4 || /(.)\1{3,}/u.test(lower) || /(.{2,6})\1{2,}/u.test(lower)) {
    return { valid: false, message: 'Lý do không được lặp ký tự hoặc vô nghĩa.' };
  }
  const words = collapsed.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const uniqWords = new Set(words).size;
    if (uniqWords === 1 || (words.length >= 3 && uniqWords / words.length < 0.5)) {
      return { valid: false, message: 'Lý do không được lặp từ vô nghĩa.' };
    }
  }
  if (!collapsed.includes(' ') && noSpace.length >= 8) {
    const counts = {};
    chars.forEach(c => { counts[c] = (counts[c] || 0) + 1; });
    const maxFreq = Math.max(...Object.values(counts));
    const bigrams = [];
    for (let i = 0; i < chars.length - 1; i++) bigrams.push(chars[i] + chars[i + 1]);
    const bigramRatio = bigrams.length > 0 ? (new Set(bigrams).size / bigrams.length) : 1;
    if (uniq <= 5 || (maxFreq / noSpace.length) > 0.35 || bigramRatio < 0.65) {
      return { valid: false, message: 'Lý do không hợp lệ, vui lòng ghi rõ nguyên nhân.' };
    }
  }
  return { valid: true, reason: collapsed, message: '' };
}

function renderShiftHandoverStats(cur = null) {
  const startEl = document.getElementById('shift-start-time');
  const cashEl = document.getElementById('shift-cash-total');
  const transEl = document.getElementById('shift-transfer-total');
  const initEl = document.getElementById('shift-initial-cash-display');
  const opEl = document.getElementById('shift-operator-name');
  const opDot = document.getElementById('shift-operator-dot');

  if (!cur) {
    if (startEl) startEl.textContent = '—';
    if (cashEl) cashEl.textContent = '0đ';
    if (transEl) transEl.textContent = '0đ';
    if (initEl) initEl.textContent = '0đ';
    if (opEl) opEl.textContent = 'Chưa mở ca';
    if (opDot) opDot.className = 'w-1.5 h-1.5 rounded-full bg-slate-400';
    return;
  }

  const rawStart = cur.open_time || cur.start_time || cur.startTime || '';
  if (startEl) startEl.textContent = rawStart ? formatShiftDateTime(rawStart) : '—';
  if (cashEl) cashEl.textContent = formatShiftVND(cur.cash_total ?? cur.cashTotal ?? 0);
  if (transEl) transEl.textContent = formatShiftVND(cur.transfer_total ?? cur.transferTotal ?? 0);
  if (initEl) initEl.textContent = formatShiftVND(cur.initial_cash ?? cur.initialCash ?? 0);
  if (opEl) opEl.textContent = cur.staff_name || cur.staffName || 'Nhân viên trực';
  if (opDot) opDot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-500';
}
window.renderShiftHandoverStats = renderShiftHandoverStats;

function renderShiftOverdueAndBlocking(cur, blockingOpen) {
  const overdueBox = document.getElementById('shift-overdue-warning');
  const overdueText = document.getElementById('shift-overdue-warning-text');
  if (overdueBox && overdueText) {
    const warnLevel = cur?.warn_level || 'none';
    const hours = Number(cur?.hours_open || 0);
    if (cur && (warnLevel === 'warning' || warnLevel === 'danger')) {
      overdueBox.classList.remove('hidden');
      if (warnLevel === 'danger') {
        overdueBox.className = 'p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-xs text-rose-900 font-semibold flex items-center gap-3';
        overdueText.innerHTML = `<span class="font-bold text-rose-900">CẢNH BÁO KHẨN: Ca trực đã mở ${hours} giờ (≥ 16 giờ)!</span> Vui lòng kiểm đếm tiền mặt và chốt ca ngay lập tức.`;
      } else {
        overdueBox.className = 'p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-xs text-amber-900 font-semibold flex items-center gap-3';
        overdueText.innerHTML = `<span class="font-bold text-amber-900">Cảnh báo: Ca trực đã mở ${hours} giờ (≥ 12 giờ)!</span> Vui lòng chuẩn bị kiểm đếm và chốt ca đúng quy định.`;
      }
    } else {
      overdueBox.classList.add('hidden');
    }
  }

  const blockBox = document.getElementById('shift-blocking-open-notice');
  const blockText = document.getElementById('shift-blocking-open-text');
  const blockBtn = document.getElementById('shift-blocking-detail-btn');
  if (blockBox && blockText) {
    if (!cur && blockingOpen) {
      blockBox.classList.remove('hidden');
      blockText.textContent = `Hiện có ca trực #${blockingOpen.id} (${blockingOpen.staff_name}, mở lúc ${blockingOpen.start_time_formatted || formatShiftDateTime(blockingOpen.start_time)}) đang mở. Cần chốt ca này trước khi mở ca mới.`;
      if (blockBtn) {
        blockBtn.onclick = () => openShiftDetailModal(blockingOpen.id);
      }
    } else {
      blockBox.classList.add('hidden');
    }
  }
}

function buildShiftFilterQuery(page = 1) {
  const dateEl = document.getElementById('shift-filter-date');
  const staffEl = document.getElementById('shift-filter-staff');
  const params = new URLSearchParams({
    action: 'shifts',
    page: String(page),
    limit: '20'
  });
  const dateVal = dateEl ? String(dateEl.value || '').trim() : '';
  const staffVal = staffEl ? String(staffEl.value || '').trim() : '';
  if (dateVal) params.set('date', dateVal);
  if (staffVal) params.set('staff_id', staffVal);
  return params;
}

async function loadShiftHandovers(page = 1) {
  currentShiftPage = Math.max(1, parseInt(page, 10) || 1);
  const tabRoot = document.getElementById('tab-content-shifts');
  if (tabRoot && window.SanBongDatePicker && typeof window.SanBongDatePicker.init === 'function') {
    window.SanBongDatePicker.init(tabRoot);
  }

  const staffSelect = document.getElementById('shift-filter-staff');
  if (staffSelect) {
    staffSelect.classList.toggle('hidden', typeof isManagerOrAdmin === 'function' && !isManagerOrAdmin());
  }

  const params = buildShiftFilterQuery(currentShiftPage);
  const shiftRes = await adminFetchJson('../api/admin.php?' + params.toString());

  let cur = null;
  let blockingOpen = null;
  let shifts = [];
  let pagination = { total: 0, page: 1, limit: 20, totalPages: 1 };

  if (shiftRes.ok && shiftRes.data) {
    cur = shiftRes.data.activeShift || shiftRes.data.currentShift || null;
    blockingOpen = shiftRes.data.blockingOpenShift || null;
    shifts = Array.isArray(shiftRes.data.shifts) ? shiftRes.data.shifts : [];
    pagination = shiftRes.data.pagination || pagination;

    if (staffSelect && Array.isArray(shiftRes.data.staffList)) {
      const prevVal = staffSelect.value;
      staffSelect.innerHTML = '<option value="">Tất cả nhân viên</option>';
      shiftRes.data.staffList.forEach(st => {
        const opt = document.createElement('option');
        opt.value = String(st.id);
        opt.textContent = `${st.full_name || st.username} (${st.role})`;
        staffSelect.appendChild(opt);
      });
      if (prevVal) staffSelect.value = prevVal;
    }
  }

  window._currentActiveShift = cur;
  renderShiftHandoverStats(cur);
  renderShiftOverdueAndBlocking(cur, blockingOpen);

  const statusDot = document.getElementById('shift-nav-status-dot');
  if (statusDot) statusDot.classList.toggle('hidden', !cur);

  const badgeActive = document.getElementById('shift-badge-active');
  const badgeClosed = document.getElementById('shift-badge-closed');
  const openFormSec = document.getElementById('shift-open-form-section');
  const closeFormSec = document.getElementById('shift-close-form-section');
  if (badgeActive && badgeClosed) {
    badgeActive.classList.toggle('hidden', !cur);
    badgeClosed.classList.toggle('hidden', !!cur);
  }
  if (openFormSec && closeFormSec) {
    openFormSec.classList.toggle('hidden', !!cur);
    closeFormSec.classList.toggle('hidden', !cur);
    if (cur) calculateShiftDiscrepancy();
  }

  renderShiftsTable(shifts);
  renderShiftPagination(pagination, shifts.length);
}
window.loadShiftHandovers = loadShiftHandovers;

function getShiftStatusBadgeHtml(statusRaw) {
  const st = String(statusRaw || '').toLowerCase();
  if (st === 'open') {
    return '<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[10px] whitespace-nowrap">● Đang mở</span>';
  }
  if (st === 'pending_explanation') {
    return '<span class="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-300 font-extrabold text-[10px] whitespace-nowrap">! Chờ giải trình</span>';
  }
  if (st === 'confirmed') {
    return '<span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 font-bold text-[10px] whitespace-nowrap">✓ Đã đối soát</span>';
  }
  return '<span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-bold text-[10px] whitespace-nowrap">⏳ Chờ đối soát</span>';
}

function renderShiftsTable(shifts) {
  const tbody = document.getElementById('admin-shifts-tbody');
  const emptyEl = document.getElementById('shift-empty-state');
  if (!tbody) return;

  currentShiftRowsCache.clear();
  if (!Array.isArray(shifts) || shifts.length === 0) {
    tbody.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');

  const canConfirm = typeof isManagerOrAdmin === 'function' && isManagerOrAdmin();

  tbody.innerHTML = shifts.map(sh => {
    const id = Number(sh.id || sh.shift_id || 0);
    currentShiftRowsCache.set(id, sh);

    const staffName = sh.staff_name || sh.staffName || 'Nhân viên trực';
    const stRaw = String(sh.status || 'closed').toLowerCase();
    const startFmt = sh.start_time_formatted || formatShiftDateTime(sh.start_time);
    const endFmt = stRaw === 'open'
      ? 'Đang mở'
      : (sh.end_time_formatted || formatShiftDateTime(sh.end_time));

    const initialCash = Number(sh.initial_cash ?? 0);
    const cashDeclared = Number(sh.cash_total ?? 0);
    const transferTotal = Number(sh.transfer_total ?? 0);
    const staffCountedRaw = sh.staff_counted_cash ?? sh.actual_cash_received;
    const actualRaw = sh.actual_cash_received;
    const hasCounted = actualRaw !== null && actualRaw !== undefined && stRaw !== 'open';
    const cashActual = hasCounted ? Number(actualRaw) : null;
    const staffCounted = (staffCountedRaw !== null && staffCountedRaw !== undefined && stRaw !== 'open')
      ? Number(staffCountedRaw)
      : cashActual;
    const expectedTotal = initialCash + cashDeclared;
    const diff = hasCounted ? (cashActual - expectedTotal) : null;

    let rowBg = 'hover:bg-slate-50';
    if (hasCounted && diff > 0) {
      rowBg = 'shift-row-surplus';
    } else if (hasCounted && diff < 0) {
      rowBg = 'shift-row-deficit';
    }

    const noteCombined = [sh.discrepancy_reason, sh.note, sh.admin_note]
      .map(s => String(s || '').trim())
      .filter(Boolean)
      .join(' | ');

    let diffHtml = '<span class="text-slate-400 italic">Chờ chốt ca</span>';
    if (hasCounted) {
      if (diff === 0) {
        diffHtml = '<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-extrabold text-[11px] border border-emerald-300 whitespace-nowrap">✓ Khớp</span>';
      } else if (diff < 0) {
        diffHtml = `<span class="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-extrabold text-[11px] border border-rose-300 whitespace-nowrap" title="${escapeJsAttr(sh.discrepancy_reason || '')}">Thiếu ${formatShiftVND(diff)}</span>`;
      } else {
        diffHtml = `<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-extrabold text-[11px] border border-amber-300 whitespace-nowrap" title="${escapeJsAttr(sh.discrepancy_reason || '')}">Thừa +${formatShiftVND(diff)}</span>`;
      }
      if (noteCombined) {
        diffHtml += `
          <div class="mt-1 flex items-center justify-center gap-1">
            <button type="button" onclick="openShiftDetailModal(${id})" class="inline-flex items-center gap-1 max-w-[130px] text-[10px] text-slate-600 hover:text-[#0F172A] underline decoration-dotted cursor-pointer" title="${escapeJsAttr(noteCombined)}">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span class="truncate">${escapeSearchHTML(noteCombined)}</span>
            </button>
          </div>
        `;
      }
    }

    const countedHtml = hasCounted
      ? `<div class="font-extrabold text-[#0F172A]">${formatShiftVND(staffCounted)}</div>` +
        (cashActual !== null && staffCounted !== null && Math.abs(cashActual - staffCounted) > 0.01
          ? `<div class="text-[10px] text-blue-700 font-semibold">Duyệt: ${formatShiftVND(cashActual)}</div>`
          : '')
      : '<span class="text-slate-400 font-normal">—</span>';

    const confirmerName = String(sh.confirmed_by_name || '').trim();
    const confirmedAtFmt = sh.confirmed_at_formatted || (sh.confirmed_at ? formatShiftDateTime(sh.confirmed_at) : '');
    const confirmerHtml = confirmerName
      ? `<div class="font-semibold text-[#0F172A] truncate shift-confirmer-name" title="${escapeJsAttr(confirmerName)}">${escapeSearchHTML(confirmerName)}</div>
         <div class="text-[10px] text-slate-500 font-mono">${escapeSearchHTML(confirmedAtFmt)}</div>`
      : '<span class="text-slate-400">—</span>';

    const detailBtn = `<button type="button" onclick="openShiftDetailModal(${id})" class="px-2.5 py-1 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#0F172A] font-bold text-[11px] cursor-pointer whitespace-nowrap">Xem chi tiết</button>`;
    let confirmBtn = '';
    if (canConfirm && (stRaw === 'closed' || stRaw === 'pending_explanation')) {
      confirmBtn = `<button type="button" onclick="handleConfirmShift(${id}, ${expectedTotal}, ${staffCounted ?? expectedTotal})" class="px-2.5 py-1 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-[11px] shadow-sm cursor-pointer whitespace-nowrap">Đối soát tiền mặt</button>`;
    }

    return `
      <tr class="${rowBg} transition-colors">
        <td class="py-2.5 px-3 font-mono font-bold text-[#0F172A] whitespace-nowrap">SHIFT-${id}</td>
        <td class="py-2.5 px-3 font-semibold text-[#0F172A]">${escapeSearchHTML(staffName)}</td>
        <td class="py-2.5 px-3 text-[11px] text-slate-600 whitespace-nowrap">
          <div>Mở: <b>${escapeSearchHTML(startFmt)}</b></div>
          <div>Chốt: <b>${escapeSearchHTML(endFmt)}</b></div>
        </td>
        <td class="py-2.5 px-3 text-right font-bold text-emerald-700 whitespace-nowrap">${formatShiftVND(initialCash)}</td>
        <td class="py-2.5 px-3 text-right font-extrabold text-[#D97706] whitespace-nowrap">${formatShiftVND(cashDeclared)}</td>
        <td class="py-2.5 px-3 text-right font-bold text-purple-700 whitespace-nowrap">${formatShiftVND(transferTotal)}</td>
        <td class="py-2.5 px-3 text-right whitespace-nowrap">${countedHtml}</td>
        <td class="py-2.5 px-3 text-center">${diffHtml}</td>
        <td class="py-2.5 px-3 text-center">${getShiftStatusBadgeHtml(stRaw)}</td>
        <td class="py-2.5 px-3 text-[11px]">${confirmerHtml}</td>
        <td class="py-2.5 px-3 text-right">
          <div class="inline-flex items-center justify-end gap-1.5">${confirmBtn}${detailBtn}</div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderShiftPagination(pagination, countInPage) {
  const infoEl = document.getElementById('shift-pagination-info');
  const indEl = document.getElementById('shift-page-indicator');
  const prevBtn = document.getElementById('shift-prev-page-btn');
  const nextBtn = document.getElementById('shift-next-page-btn');

  const total = Number(pagination?.total || 0);
  const page = Math.max(1, Number(pagination?.page || 1));
  const limit = Math.max(1, Number(pagination?.limit || 20));
  currentShiftTotalPages = Math.max(1, Number(pagination?.totalPages || 1));

  const startIdx = total === 0 ? 0 : ((page - 1) * limit + 1);
  const endIdx = total === 0 ? 0 : (startIdx + countInPage - 1);

  if (infoEl) infoEl.textContent = `Hiển thị ${startIdx}–${endIdx} / ${total} ca trực`;
  if (indEl) indEl.textContent = `Trang ${page} / ${currentShiftTotalPages}`;
  if (prevBtn) prevBtn.disabled = page <= 1;
  if (nextBtn) nextBtn.disabled = page >= currentShiftTotalPages;
}

function goToShiftPage(page) {
  const p = Math.max(1, Math.min(currentShiftTotalPages, parseInt(page, 10) || 1));
  if (p === currentShiftPage) return;
  loadShiftHandovers(p);
}
window.goToShiftPage = goToShiftPage;

function exportShiftsCsv() {
  const params = buildShiftFilterQuery(1);
  params.set('sub_action', 'export_csv');
  const url = (typeof normalizeAdminApiUrl === 'function')
    ? normalizeAdminApiUrl('api/admin.php?' + params.toString())
    : ('../api/admin.php?' + params.toString());
  window.location.href = url;
}
window.exportShiftsCsv = exportShiftsCsv;

function calculateShiftDiscrepancy() {
  const countedEl = document.getElementById('shift-cash-counted');
  const badgeEl = document.getElementById('shift-discrepancy-badge') || document.getElementById('shift-diff-badge');
  const btnSubmit = document.getElementById('btn-close-shift');
  const reasonBox = document.getElementById('shift-discrepancy-reason-box');
  const reasonInput = document.getElementById('shift-discrepancy-reason');
  if (!badgeEl) return;

  const rawVal = countedEl ? countedEl.value.trim() : '';
  if (!countedEl || rawVal === '' || isNaN(Number(rawVal)) || Number(rawVal) < 0) {
    badgeEl.className = 'shift-touch-h44 px-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center font-mono font-bold text-xs text-slate-500';
    badgeEl.textContent = 'Chưa kiểm đếm';
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.classList.add('opacity-50', 'cursor-not-allowed');
    }
    if (reasonBox) reasonBox.classList.add('hidden');
    if (reasonInput) reasonInput.required = false;
    return;
  }

  const counted = parseInt(rawVal, 10);
  const curShift = window._currentActiveShift;
  const sysCash = Number(curShift?.cash_total ?? curShift?.cashTotal ?? 0);
  const initCash = Number(curShift?.initial_cash ?? curShift?.initialCash ?? 0);
  const expected = sysCash + initCash;
  const diff = counted - expected;

  if (diff === 0) {
    badgeEl.className = 'shift-touch-h44 px-3 rounded-lg border border-emerald-200 bg-emerald-50 flex items-center justify-center font-mono font-bold text-xs text-emerald-700';
    badgeEl.textContent = '✓ Khớp';
    if (reasonBox) reasonBox.classList.add('hidden');
    if (reasonInput) reasonInput.required = false;
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  } else {
    if (diff > 0) {
      badgeEl.className = 'shift-touch-h44 px-3 rounded-lg border border-amber-200 bg-amber-50 flex items-center justify-center font-mono font-bold text-xs text-amber-800';
      badgeEl.textContent = `+${formatShiftVND(diff)} (Thừa)`;
    } else {
      badgeEl.className = 'shift-touch-h44 px-3 rounded-lg border border-rose-200 bg-rose-50 flex items-center justify-center font-mono font-bold text-xs text-rose-700';
      badgeEl.textContent = `${formatShiftVND(diff)} (Thiếu)`;
    }
    if (reasonBox) reasonBox.classList.remove('hidden');
    if (reasonInput) reasonInput.required = true;

    const rCheck = validateShiftReasonClient(reasonInput ? reasonInput.value : '', 10);
    if (btnSubmit) {
      btnSubmit.disabled = !rCheck.valid;
      btnSubmit.classList.toggle('opacity-50', !rCheck.valid);
      btnSubmit.classList.toggle('cursor-not-allowed', !rCheck.valid);
    }
  }
}
window.calculateShiftDiscrepancy = calculateShiftDiscrepancy;

async function handleOpenShift() {
  const initCashEl = document.getElementById('shift-open-initial-cash');
  const noteEl = document.getElementById('shift-open-note');
  const btn = document.getElementById('btn-open-shift');
  const initCash = parseInt(initCashEl?.value ?? '-1', 10);
  const note = (noteEl?.value || '').trim();

  if (isNaN(initCash) || initCash < 0) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập tiền mặt đầu ca (số nguyên ≥ 0đ)!', 'error');
    if (initCashEl) initCashEl.focus();
    return;
  }

  const ok = await showAdminConfirm({
    title: 'Bắt đầu mở ca trực mới',
    message: `Bạn chuẩn bị mở ca trực với tiền mặt đầu ca: ${formatShiftVND(initCash)}. Xác nhận bắt đầu?`,
    confirmText: 'Mở ca ngay',
    cancelText: 'Hủy'
  });
  if (!ok) return;

  if (btn) btn.disabled = true;
  try {
    const r = await adminFetchJson('../api/admin.php?action=shifts', {
      method: 'POST',
      body: JSON.stringify({ sub_action: 'open_shift', initial_cash: initCash, note })
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể mở ca trực!', 'error', 4000);
      return;
    }
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Đã mở ca trực thành công!', 'success', 3500);
    await loadShiftHandovers(1);
  } finally {
    if (btn) btn.disabled = false;
  }
}
window.handleOpenShift = handleOpenShift;

async function handleCloseShift() {
  const curShift = window._currentActiveShift;
  if (!curShift) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Không có ca trực nào đang mở!', 'warning');
    return;
  }

  const countedEl = document.getElementById('shift-cash-counted');
  const reasonEl = document.getElementById('shift-discrepancy-reason');
  const noteEl = document.getElementById('shift-close-note');
  const btn = document.getElementById('btn-close-shift');

  const counted = parseInt(countedEl?.value ?? '-1', 10);
  if (isNaN(counted) || counted < 0) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập số tiền mặt nhân viên đếm được thực tế!', 'error');
    if (countedEl) countedEl.focus();
    return;
  }

  const sysCash = Number(curShift.cash_total || 0);
  const initCash = Number(curShift.initial_cash || 0);
  const expectedTotal = sysCash + initCash;
  const diff = counted - expectedTotal;
  const reason = (reasonEl?.value || '').trim();

  if (diff !== 0) {
    const rCheck = validateShiftReasonClient(reason, 10);
    if (!rCheck.valid) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(rCheck.message, 'error');
      if (reasonEl) reasonEl.focus();
      return;
    }
  }

  const diffStr = diff === 0 ? '✓ Khớp' : (diff < 0 ? `Thiếu ${formatShiftVND(diff)}` : `Thừa +${formatShiftVND(diff)}`);
  const confirmMsg =
    `XÁC NHẬN CHỐT CA TRỰC:\n` +
    `• Tiền đầu ca: ${formatShiftVND(initCash)}\n` +
    `• Hệ thống tính thu trong ca: ${formatShiftVND(sysCash)}\n` +
    `• Tổng tiền lý thuyết: ${formatShiftVND(expectedTotal)}\n` +
    `• Nhân viên đếm thực tế: ${formatShiftVND(counted)} (${diffStr})\n` +
    (diff !== 0 ? `• Lý do lệch: ${reason}\n` : '') +
    `\nBấm Chốt ca để bàn giao ca trực?`;

  const ok = await showAdminConfirm({
    title: 'Chốt ca bàn giao',
    message: confirmMsg,
    confirmText: 'Chốt ca ngay',
    cancelText: 'Kiểm lại'
  });
  if (!ok) return;

  if (btn) btn.disabled = true;
  try {
    const r = await adminFetchJson('../api/admin.php?action=shifts', {
      method: 'POST',
      body: JSON.stringify({
        sub_action: 'close_shift',
        shift_id: Number(curShift.id || curShift.shift_id || 0),
        actual_cash_received: counted,
        discrepancy_reason: reason,
        note: (noteEl?.value || '').trim()
      })
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể chốt ca trực!', 'error', 4000);
      return;
    }
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Đã chốt ca thành công!', 'success', 4000);
    await loadShiftHandovers(1);
    if (isOwnerAdmin() && typeof loadAdminLogs === 'function') loadAdminLogs(1);
  } finally {
    if (btn) calculateShiftDiscrepancy();
  }
}
window.handleCloseShift = handleCloseShift;

function handleConfirmShift(shiftId, expectedTotal = 0, staffCountedCash = null) {
  if (typeof isManagerOrAdmin === 'function' && !isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền đối soát tiền mặt!', 'error');
    return;
  }
  const cached = currentShiftRowsCache.get(Number(shiftId));
  const origStaffCount = staffCountedCash !== null && staffCountedCash !== undefined
    ? Number(staffCountedCash)
    : Number(cached?.staff_counted_cash ?? cached?.actual_cash_received ?? expectedTotal);

  const modal = document.getElementById('shift-confirm-modal');
  if (!modal) return;
  document.getElementById('confirm-shift-id').value = String(shiftId);
  document.getElementById('confirm-shift-expected').value = String(expectedTotal);
  document.getElementById('confirm-shift-staff-counted').value = String(origStaffCount);
  document.getElementById('confirm-shift-actual-cash').value = String(origStaffCount);
  document.getElementById('confirm-shift-admin-note').value = String(cached?.admin_note || '');
  document.getElementById('confirm-shift-note-err').classList.add('hidden');
  document.getElementById('shift-confirm-title').textContent = `Đối soát ca trực SHIFT-${shiftId}`;

  const summaryEl = document.getElementById('confirm-shift-summary');
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div>Nhân viên trực: <b>${escapeSearchHTML(cached?.staff_name || '—')}</b></div>
      <div>Tổng lý thuyết (đầu ca + hệ thống): <b class="font-mono">${formatShiftVND(expectedTotal)}</b></div>
      <div>Số tiền nhân viên đếm gốc: <b class="font-mono text-[#0F172A]">${formatShiftVND(origStaffCount)}</b></div>
      ${cached?.discrepancy_reason ? `<div>Giải trình của NV: <i>${escapeSearchHTML(cached.discrepancy_reason)}</i></div>` : ''}
    `;
  }
  updateConfirmShiftPreview();
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}
window.handleConfirmShift = handleConfirmShift;

function closeShiftConfirmModal() {
  const modal = document.getElementById('shift-confirm-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}
window.closeShiftConfirmModal = closeShiftConfirmModal;

function updateConfirmShiftPreview() {
  const expected = Number(document.getElementById('confirm-shift-expected')?.value || 0);
  const staffCounted = Number(document.getElementById('confirm-shift-staff-counted')?.value || 0);
  const actual = Number(document.getElementById('confirm-shift-actual-cash')?.value || 0);
  const diff = actual - expected;
  const edited = Math.abs(actual - staffCounted) > 0.01;

  const prevEl = document.getElementById('confirm-shift-diff-preview');
  if (prevEl) {
    if (diff === 0) {
      prevEl.className = 'mt-1.5 text-[11px] font-bold text-emerald-700';
      prevEl.textContent = edited ? '✓ Khớp quỹ (đã chỉnh sửa so với số NV đếm gốc)' : '✓ Khớp';
    } else if (diff > 0) {
      prevEl.className = 'mt-1.5 text-[11px] font-bold text-amber-700';
      prevEl.textContent = `Thừa +${formatShiftVND(diff)}`;
    } else {
      prevEl.className = 'mt-1.5 text-[11px] font-bold text-rose-700';
      prevEl.textContent = `Thiếu ${formatShiftVND(diff)}`;
    }
  }
  const reqMark = document.getElementById('confirm-shift-note-req-mark');
  if (reqMark) reqMark.classList.toggle('hidden', diff === 0 && !edited);
}
window.updateConfirmShiftPreview = updateConfirmShiftPreview;

async function submitShiftConfirmModal(e) {
  if (e && e.preventDefault) e.preventDefault();
  const shiftId = Number(document.getElementById('confirm-shift-id')?.value || 0);
  const expected = Number(document.getElementById('confirm-shift-expected')?.value || 0);
  const staffCounted = Number(document.getElementById('confirm-shift-staff-counted')?.value || 0);
  const actualCash = Number(document.getElementById('confirm-shift-actual-cash')?.value ?? -1);
  const adminNote = (document.getElementById('confirm-shift-admin-note')?.value || '').trim();
  const errEl = document.getElementById('confirm-shift-note-err');
  const submitBtn = document.getElementById('confirm-shift-submit-btn');

  if (isNaN(actualCash) || actualCash < 0) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Số tiền thực nhận không hợp lệ!', 'error');
    return;
  }

  const diff = actualCash - expected;
  const edited = Math.abs(actualCash - staffCounted) > 0.01;
  if (diff !== 0 || edited) {
    const chk = validateShiftReasonClient(adminNote, 10);
    if (!chk.valid) {
      if (errEl) {
        errEl.textContent = chk.message;
        errEl.classList.remove('hidden');
      }
      return;
    }
  }
  if (errEl) errEl.classList.add('hidden');
  if (submitBtn) submitBtn.disabled = true;

  try {
    const r = await adminFetchJson('../api/admin.php?action=shifts', {
      method: 'POST',
      body: JSON.stringify({
        sub_action: 'confirm_shift',
        shift_id: shiftId,
        actual_cash_received: actualCash,
        admin_note: adminNote,
        edit_reason: edited ? adminNote : ''
      })
    });
    if (!r.ok) {
      if (errEl) {
        errEl.textContent = r.message || 'Không thể đối soát ca trực!';
        errEl.classList.remove('hidden');
      }
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể đối soát ca trực!', 'error', 4000);
      return;
    }
    closeShiftConfirmModal();
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || `Đã đối soát ca SHIFT-${shiftId} thành công!`, 'success', 4000);
    await loadShiftHandovers(currentShiftPage || 1);
    if (isOwnerAdmin() && typeof loadAdminLogs === 'function') loadAdminLogs(1);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}
window.submitShiftConfirmModal = submitShiftConfirmModal;

async function openShiftDetailModal(shiftId) {
  const modal = document.getElementById('shift-detail-modal');
  const titleEl = document.getElementById('shift-detail-title');
  const subEl = document.getElementById('shift-detail-subtitle');
  const bodyEl = document.getElementById('shift-detail-body');
  if (!modal || !bodyEl) return;

  if (titleEl) titleEl.textContent = `Chi tiết ca trực SHIFT-${shiftId}`;
  if (subEl) subEl.textContent = 'Đang tải dữ liệu đơn đặt sân, tiền mặt và sao kê VietQR...';
  bodyEl.innerHTML = '<div class="py-10 text-center text-slate-500">Đang tải chi tiết ca trực...</div>';
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  const r = await adminFetchJson(`../api/admin.php?action=shifts&sub_action=shift_detail&shift_id=${encodeURIComponent(shiftId)}`);
  if (!r.ok || !r.data) {
    bodyEl.innerHTML = `<div class="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">${escapeSearchHTML(r.message || 'Không thể tải chi tiết ca trực.')}</div>`;
    return;
  }

  const d = r.data;
  const sh = d.shift || {};
  const bankSum = d.bank_summary || {};
  if (subEl) {
    subEl.textContent = `${sh.staff_name || '—'} · Mở: ${sh.start_time_formatted || formatShiftDateTime(sh.start_time)} · Chốt: ${sh.end_time_formatted || (sh.status === 'open' ? 'Đang mở' : '—')}`;
  }

  const bookingsRows = (d.bookings || []).length === 0
    ? '<tr><td colspan="6" class="py-4 text-center text-slate-400">Không có đơn đặt sân phát sinh trong ca này.</td></tr>'
    : (d.bookings || []).map(b => `
        <tr class="border-t border-slate-100">
          <td class="py-2 px-2.5 font-mono font-bold text-[#0F172A]">${escapeSearchHTML(b.code)}</td>
          <td class="py-2 px-2.5">${escapeSearchHTML(b.customer_name)} <span class="text-slate-400">(${escapeSearchHTML(b.phone)})</span></td>
          <td class="py-2 px-2.5">${escapeSearchHTML(b.pitch_name)} · ${escapeSearchHTML(b.slot_time)}</td>
          <td class="py-2 px-2.5 text-right font-bold">${formatShiftVND(b.paid_amount)} / ${formatShiftVND(b.total_price)}</td>
          <td class="py-2 px-2.5">${escapeSearchHTML(b.payment_method)}</td>
          <td class="py-2 px-2.5">${escapeSearchHTML(b.status)} · ${escapeSearchHTML(b.payment_status)}</td>
        </tr>
      `).join('');

  const cashRows = (d.cash_items || []).length === 0
    ? '<tr><td colspan="4" class="py-4 text-center text-slate-400">Chưa có khoản thu tiền mặt trong ca.</td></tr>'
    : (d.cash_items || []).map(it => `
        <tr class="border-t border-slate-100">
          <td class="py-2 px-2.5 font-semibold">${escapeSearchHTML(it.source)}</td>
          <td class="py-2 px-2.5 font-mono">${escapeSearchHTML(it.booking_code)}</td>
          <td class="py-2 px-2.5">${escapeSearchHTML(it.detail)}</td>
          <td class="py-2 px-2.5 text-right font-bold text-amber-700">${formatShiftVND(it.amount)}</td>
        </tr>
      `).join('');

  const bankRows = (d.vietqr_items || []).length === 0
    ? '<tr><td colspan="6" class="py-4 text-center text-slate-400">Không có giao dịch VietQR trong khung giờ ca này.</td></tr>'
    : (d.vietqr_items || []).map(tx => `
        <tr class="border-t border-slate-100">
          <td class="py-2 px-2.5 font-mono">${escapeSearchHTML(tx.sepay_tx_id)}</td>
          <td class="py-2 px-2.5 font-mono font-bold">${escapeSearchHTML(tx.booking_code)}</td>
          <td class="py-2 px-2.5 text-right font-bold text-purple-700">${formatShiftVND(tx.transfer_amount)}</td>
          <td class="py-2 px-2.5 text-right">${formatShiftVND(tx.expected_amount)}</td>
          <td class="py-2 px-2.5"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${tx.match_status === 'matched' || tx.match_status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}">${escapeSearchHTML(tx.match_status)}</span></td>
          <td class="py-2 px-2.5 text-slate-500">${escapeSearchHTML(tx.mismatch_reason || tx.transaction_content || '—')}</td>
        </tr>
      `).join('');

  bodyEl.innerHTML = `
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="p-3 rounded-xl bg-slate-50 border border-slate-200"><div class="text-[10px] text-slate-500 font-bold uppercase">Tiền đầu ca</div><div class="font-extrabold text-sm mt-0.5">${formatShiftVND(sh.initial_cash)}</div></div>
      <div class="p-3 rounded-xl bg-amber-50 border border-amber-200"><div class="text-[10px] text-amber-800 font-bold uppercase">Hệ thống TM</div><div class="font-extrabold text-sm text-amber-700 mt-0.5">${formatShiftVND(sh.cash_total)}</div></div>
      <div class="p-3 rounded-xl bg-slate-50 border border-slate-200"><div class="text-[10px] text-slate-500 font-bold uppercase">NV đếm gốc / Duyệt</div><div class="font-extrabold text-sm mt-0.5">${sh.staff_counted_cash !== null ? formatShiftVND(sh.staff_counted_cash) : '—'}${sh.actual_cash_received !== null && sh.actual_cash_received != sh.staff_counted_cash ? ` → ${formatShiftVND(sh.actual_cash_received)}` : ''}</div></div>
      <div class="p-3 rounded-xl bg-purple-50 border border-purple-200"><div class="text-[10px] text-purple-800 font-bold uppercase">VietQR vs Sao kê</div><div class="font-extrabold text-sm text-purple-700 mt-0.5">${formatShiftVND(bankSum.shift_transfer_total)} / ${formatShiftVND(bankSum.bank_tx_total)}</div></div>
    </div>

    <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
      <div><b>Trạng thái:</b> ${getShiftStatusBadgeHtml(sh.status)} ${sh.confirmed_by_name ? `· Đối soát bởi <b>${escapeSearchHTML(sh.confirmed_by_name)}</b> lúc ${escapeSearchHTML(sh.confirmed_at_formatted || '')}` : ''}</div>
      <div><b>Ghi chú bàn giao NV:</b> ${escapeSearchHTML(sh.note || '—')}</div>
      <div><b>Lý do lệch (NV):</b> ${escapeSearchHTML(sh.discrepancy_reason || '—')}</div>
      <div><b>Ghi chú đối soát (QL):</b> ${escapeSearchHTML(sh.admin_note || '—')}</div>
    </div>

    <div class="space-y-2">
      <h5 class="font-heading font-bold text-xs text-[#0F172A] uppercase">Đơn đặt sân trong ca (${(d.bookings || []).length})</h5>
      <div class="overflow-x-auto border border-slate-200 rounded-xl"><table class="w-full text-left text-[11px] shift-modal-table"><thead class="bg-slate-50 text-slate-600 font-bold"><tr><th class="py-2 px-2.5">Mã đơn</th><th class="py-2 px-2.5">Khách hàng</th><th class="py-2 px-2.5">Sân &amp; Giờ</th><th class="py-2 px-2.5 text-right">Đã thu / Tổng</th><th class="py-2 px-2.5">Phương thức</th><th class="py-2 px-2.5">Trạng thái</th></tr></thead><tbody>${bookingsRows}</tbody></table></div>
    </div>

    <div class="space-y-2">
      <h5 class="font-heading font-bold text-xs text-[#0F172A] uppercase">Chi tiết các khoản Tiền mặt (${(d.cash_items || []).length} · Tổng ${formatShiftVND(d.cash_sum)})</h5>
      <div class="overflow-x-auto border border-slate-200 rounded-xl"><table class="w-full text-left text-[11px] min-w-[540px]"><thead class="bg-slate-50 text-slate-600 font-bold"><tr><th class="py-2 px-2.5">Nguồn thu</th><th class="py-2 px-2.5">Mã</th><th class="py-2 px-2.5">Chi tiết</th><th class="py-2 px-2.5 text-right">Số tiền</th></tr></thead><tbody>${cashRows}</tbody></table></div>
    </div>

    <div class="space-y-2">
      <h5 class="font-heading font-bold text-xs text-[#0F172A] uppercase">Đối chiếu VietQR trực tiếp với sao kê bank_transactions (${bankSum.total_tx || 0} GD · Khớp ${bankSum.matched_count || 0} · Cần lưu ý ${bankSum.issue_count || 0})</h5>
      <div class="overflow-x-auto border border-slate-200 rounded-xl"><table class="w-full text-left text-[11px] shift-modal-table"><thead class="bg-slate-50 text-slate-600 font-bold"><tr><th class="py-2 px-2.5">Mã GD SePay</th><th class="py-2 px-2.5">Mã đơn</th><th class="py-2 px-2.5 text-right">Thực nhận NH</th><th class="py-2 px-2.5 text-right">Dự kiến</th><th class="py-2 px-2.5">Đối soát</th><th class="py-2 px-2.5">Ghi chú / Nội dung</th></tr></thead><tbody>${bankRows}</tbody></table></div>
    </div>
  `;
}
window.openShiftDetailModal = openShiftDetailModal;

function closeShiftDetailModal() {
  const modal = document.getElementById('shift-detail-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}
window.closeShiftDetailModal = closeShiftDetailModal;

;
/* === admin_invoices.js === */
// Quản lý và In hóa đơn thanh toán dịch vụ sân bóng
let activeInvoiceCode = '';

async function openInvoicePrintModal(code) {
  const db = window.SanBongApp?.SanBongDB;
  let b = (typeof window.findInPlayBookingSync === 'function' ? window.findInPlayBookingSync(code) : null)
    || (db && typeof db.getBookingByCode === 'function' ? db.getBookingByCode(code) : null);
  if (!b && code && typeof adminFetchJson === 'function') {
    const r = await adminFetchJson(`../api/bookings.php?code=${encodeURIComponent(code)}`);
    if (r?.ok && r.data && r.data.code) b = r.data;
  }
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
      <td class="py-2">Phụ thu đá thêm giờ (+${Number(b.overtimeMinutes || 0) || 30} phút)</td>
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
          <div class="font-mono font-extrabold text-sm text-[#0F172A] mt-0.5">#${escapeHTML(b.code)}</div>
          <div class="text-[11px] font-bold text-slate-600">${escapeSearchHTML(displayPayStatus)}</div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div>Khách hàng: <b class="text-[#0F172A]">${escapeSearchHTML(b.customerName)}</b></div>
        <div>Số điện thoại: <b class="font-mono text-[#0F172A]">${escapeSearchHTML(b.phone)}</b></div>
        <div>Sân thi đấu: <b class="text-[#16A34A]">${escapeSearchHTML(b.pitchName)}</b></div>
        <div>Khung giờ: <b class="text-[#0F172A]">${escapeSearchHTML(b.slotTime)} (${window.SanBongApp.formatDateVN(b.date)})</b></div>
        ${Number(b.weeksCount || 0) > 1 ? `<div class="col-span-2 text-purple-700 font-bold">📅 Hợp đồng đặt sân cố định theo tháng: ${Number(b.weeksCount || 0)} tuần liên tiếp</div>` : ''}
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
            <td class="py-2 text-center">${Number(b.weeksCount || 0) || 1}</td>
            <td class="py-2 text-right">${window.SanBongApp.formatVND(Math.round(pitchPrice / (Number(b.weeksCount || 0) || 1)))}</td>
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
  if (typeof refreshAllAdminViews === 'function') {
    refreshAllAdminViews(window.activeInPlayCode || activeInvoiceCode);
  }
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
      <title>Hóa Đơn #${escapeHTML(activeInvoiceCode || 'SANBONGPRO')}</title>
      <link rel="stylesheet" href="../css/tailwind.generated.css?v=20261122_v128">
      <link rel="stylesheet" href="../css/style.css?v=20261122_v128">
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
window.openInvoiceModal = openInvoicePrintModal;
window.closeInvoiceModal = closeInvoiceModal;
window.printInvoiceNow = printInvoiceNow;

;
/* === admin_qr.js === */
// Quét QR Code Check-in nhận sân (QR Scanner Modal)
let qrHiddenCanvas = null;
let qrCameraStream = null;
let qrScanTimer = null;
let activeQRBookingCode = '';

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

  const liveAll = typeof window.getLiveBookingsList === 'function' ? window.getLiveBookingsList() : [];
  if (quickList) {
    const candidates = liveAll.filter(b => b.status === 'Đã xác nhận' || b.status === 'Chờ duyệt cọc' || b.status === 'Đang đá' || b.status === 'Khách chưa đến').slice(0, 8);
    quickList.innerHTML = candidates.length > 0 ? candidates.map(b => {
      let dotColor = 'bg-emerald-500';
      if (b.status === 'Đang đá') dotColor = 'bg-blue-500';
      else if (b.status === 'Chờ duyệt cọc') dotColor = 'bg-amber-500';
      else if (b.status === 'Khách chưa đến') dotColor = 'bg-red-500';

      const safeCodeAttr = escapeSearchHTML(b.code || '');
      return `
        <button type="button" data-code="${safeCodeAttr}" onclick="lookupQRTicket(this.getAttribute('data-code'))" class="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-xs font-semibold text-[#0F172A] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs">
          <span class="w-2 h-2 rounded-full ${dotColor} shrink-0"></span>
          <span class="font-mono font-bold text-[#16A34A]">${safeCodeAttr}</span>
          <span class="truncate max-w-[130px] text-slate-600">${escapeSearchHTML(b.pitchName || '')}</span>
          <span class="text-[11px] text-slate-400">(${escapeSearchHTML(b.slotTime || '')})</span>
        </button>
      `;
    }).join('') : '<span class="text-[11px] text-slate-400">Chưa có ca đá nào trong ngày.</span>';
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

async function lookupQRTicket(codeOpt) {
  const input = document.getElementById('qr-code-input');
  const resultBox = document.getElementById('qr-ticket-result');
  const checkinBtn = document.getElementById('qr-confirm-checkin-btn');
  if (!resultBox) return;

  let raw = (codeOpt || input?.value || '').trim();
  const match = raw.match(/(ASF[FSE]?[0-9]{6,8}|DH[0-9]{6,8}|BK-[0-9]{6}-[0-9]{3,})/i);
  const rawCode = match ? match[1].toUpperCase() : raw.toUpperCase();

  if (input && rawCode) input.value = rawCode;

  if (!rawCode) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập hoặc chọn một mã vé QR để tra cứu.', 'warning');
    return;
  }

  let booking = typeof window.findInPlayBookingSync === 'function' ? window.findInPlayBookingSync(rawCode) : null;
  if (!booking && typeof adminFetchJson === 'function') {
    const r = await adminFetchJson(`../api/bookings.php?code=${encodeURIComponent(rawCode)}`);
    if (r?.ok && r.data && r.data.code) {
      booking = r.data;
      if (typeof window.syncLiveBookingsCache === 'function') window.syncLiveBookingsCache([booking]);
    }
  }

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

  const stLower = String(booking.status || '').trim().toLowerCase();
  const isAlreadyScanned = (booking.status === 'Đang đá' || booking.status === 'Hoàn thành' || stLower === 'completed');

  if (booking.status === 'Đã xác nhận') {
    statusBadgeHtml = '<span class="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-xs">🟢 HỢP LỆ — SẴN SÀNG NHẬN SÂN</span>';
    canCheckin = true;
  } else if (isAlreadyScanned) {
    statusBadgeHtml = '<span class="px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 font-extrabold text-xs">⛔ MÃ QR ĐÃ SỬ DỤNG (CHỈ QUÉT 1 LẦN)</span>';
    canCheckin = false;
    if (window.SanBongApp?.playScanBeep) window.SanBongApp.playScanBeep(false);
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(`Mã QR #${booking.code} đã được quét check-in trước đó! Mỗi mã QR chỉ có hiệu lực 1 lần.`, 'error', 4000);
    }
  } else if (booking.status === 'Chờ duyệt cọc') {
    statusBadgeHtml = '<span class="px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-extrabold text-xs">🟡 CHỜ DUYỆT CỌC (Chưa xác nhận cọc)</span>';
    canCheckin = true;
  } else {
    statusBadgeHtml = `<span class="px-3 py-1 rounded-full bg-red-100 text-red-800 border border-red-300 font-extrabold text-xs">🔴 ${escapeSearchHTML(booking.status)}</span>`;
    canCheckin = false;
  }

  let srvListText = 'Không có dịch vụ thêm';
  if (booking.services && booking.services.length > 0) {
    srvListText = booking.services.map(s => `${escapeSearchHTML(s.name)} × ${Number(s.quantity || 1)}`).join(', ');
  }

  const safeBookingCode = escapeSearchHTML(booking.code || '');
  resultBox.className = 'p-4 rounded-xl bg-white border-2 border-emerald-500/80 shadow-md space-y-3 text-xs';
  resultBox.innerHTML = `
    <div class="flex items-center justify-between border-b border-slate-200 pb-2.5">
      <div class="flex items-center gap-2">
        <span class="px-2.5 py-1 rounded-md bg-[#0F172A] text-white font-mono font-extrabold text-sm tracking-wide">${safeBookingCode}</span>
        <span class="font-bold text-[#0F172A] text-sm sm:text-base">${escapeSearchHTML(booking.pitchName)}</span>
      </div>
      ${statusBadgeHtml}
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#334155] bg-slate-50 p-3 rounded-lg border border-slate-200">
      <div>👤 Khách hàng: <b class="text-[#0F172A]">${escapeSearchHTML(booking.customerName)}</b></div>
      <div>📞 Số điện thoại: <b class="font-mono text-[#0F172A]">${escapeSearchHTML(booking.phone || 'Chưa lưu')}</b></div>
      <div>📅 Ngày thi đấu: <b class="text-[#0F172A]">${escapeSearchHTML(window.SanBongApp.formatDateVN(booking.date))}</b></div>
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
      <button type="button" data-code="${safeBookingCode}" onclick="closeQRScannerModal(); openInvoiceModal(this.getAttribute('data-code'))" class="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1 border border-slate-300">
        <span>🖨️ In Vé / Hóa đơn</span>
      </button>
      <button type="button" data-code="${safeBookingCode}" onclick="closeQRScannerModal(); openInPlayModal(this.getAttribute('data-code'))" class="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs">
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
    } else if (isAlreadyScanned) {
      checkinBtn.disabled = true;
      checkinBtn.className = 'btn-sm bg-rose-100 text-rose-700 border border-rose-300 font-bold cursor-not-allowed opacity-80';
      checkinBtn.innerHTML = '⛔ Mã QR đã quét — Không thể quét lại';
      checkinBtn.onclick = null;
    } else {
      checkinBtn.disabled = true;
      checkinBtn.className = 'btn-sm bg-slate-200 text-slate-400 cursor-not-allowed';
      checkinBtn.innerHTML = 'Không thể check-in';
      checkinBtn.onclick = null;
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
  const b = typeof window.findInPlayBookingSync === 'function' ? window.findInPlayBookingSync(finalCode) : null;
  const pitchName = b ? b.pitchName : 'sân';

  const r = await adminFetchJson('../api/bookings.php?action=checkin&code=' + encodeURIComponent(finalCode), {
    method: 'POST',
    body: JSON.stringify({})
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể check-in đơn đặt sân này!', 'error', 4000);
    }
    return;
  }

  if (window.SanBongApp?.playScanBeep) window.SanBongApp.playScanBeep(true);

  closeQRScannerModal();
  if (typeof refreshAllAdminViews === 'function') {
    refreshAllAdminViews(finalCode);
  } else {
    renderTimelineGantt(true);
    renderOverviewKPIs(true);
  }

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

;
/* === admin_recurring.js === */
// Quản lý hợp đồng & lịch đặt sân cố định hàng tuần (Recurring Schedules)
let recurringSchedulesCache = [];

function initRecurringScheduleForm() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const pitchSel = document.getElementById('rec-pitch-id');
  const slotSel = document.getElementById('rec-slot-id');
  const startInput = document.getElementById('rec-start-date');
  const daySel = document.getElementById('rec-day-of-week');
  const openChk = document.getElementById('rec-is-open-ended');

  if (pitchSel) {
    const prevP = pitchSel.value;
    pitchSel.innerHTML = db.getPitches().filter(p => p.status !== 'Ẩn').map(p => (
      `<option value="${escapeSearchHTML(p.id)}">${escapeSearchHTML(p.name)} (${escapeSearchHTML(p.typeName || p.type)})</option>`
    )).join('');
    if (prevP && Array.from(pitchSel.options).some(o => o.value === prevP)) {
      pitchSel.value = prevP;
    }
  }

  if (slotSel) {
    const prevS = slotSel.value;
    slotSel.innerHTML = db.getTimeSlots().map(s => (
      `<option value="${escapeSearchHTML(s.id)}">${escapeSearchHTML(s.time)}</option>`
    )).join('');
    if (prevS && Array.from(slotSel.options).some(o => o.value === prevS)) {
      slotSel.value = prevS;
    }
  }

  const todayISO = (window.SanBongApp?.getLocalTodayISO ? window.SanBongApp.getLocalTodayISO() : new Date().toISOString().split('T')[0]);
  if (startInput) {
    if (!startInput.value) startInput.value = todayISO;
    startInput.min = todayISO;
    if (!startInput._boundDow) {
      startInput._boundDow = true;
      startInput.addEventListener('change', () => {
        if (!daySel || !startInput.value) return;
        const d = new Date(startInput.value + 'T00:00:00');
        if (!isNaN(d.getTime())) {
          const jsDay = d.getDay();
          daySel.value = String(jsDay === 0 ? 7 : jsDay);
        }
      });
    }
  }
  if (daySel && startInput?.value && !daySel._initDone) {
    daySel._initDone = true;
    const d = new Date(startInput.value + 'T00:00:00');
    if (!isNaN(d.getTime())) {
      const jsDay = d.getDay();
      daySel.value = String(jsDay === 0 ? 7 : jsDay);
    }
  }
  if (openChk) {
    toggleRecurringWeeksInput(openChk.checked);
  }
}
window.initRecurringScheduleForm = initRecurringScheduleForm;

function toggleRecurringWeeksInput(isOpenEnded) {
  const weeksEl = document.getElementById('rec-weeks-count');
  if (!weeksEl) return;
  weeksEl.disabled = !!isOpenEnded;
  weeksEl.classList.toggle('opacity-50', !!isOpenEnded);
  weeksEl.classList.toggle('bg-slate-100', !!isOpenEnded);
}
window.toggleRecurringWeeksInput = toggleRecurringWeeksInput;

async function loadRecurringSchedules() {
  const tbody = document.getElementById('admin-recurring-tbody');
  if (!tbody) return;
  const r = await adminFetchJson('../api/admin.php?action=get_recurring_schedules');
  if (!r.ok || !Array.isArray(r.data)) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-4 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải danh sách lịch cố định.')}</td></tr>`;
    return;
  }

  recurringSchedulesCache = r.data;
  if (r.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-[#94A3B8]">Chưa có lịch cố định hàng tuần nào.</td></tr>';
    return;
  }

  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');
  const dowMap = { 1: 'Thứ 2', 2: 'Thứ 3', 3: 'Thứ 4', 4: 'Thứ 5', 5: 'Thứ 6', 6: 'Thứ 7', 7: 'Chủ Nhật' };
  const statusMap = {
    active: '<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">Đang chạy</span>',
    paused: '<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-bold text-[10px]">Tạm dừng</span>',
    cancelled: '<span class="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[10px]">Đã hủy chuỗi</span>'
  };

  tbody.innerHTML = r.data.map(s => {
    const schCode = s.schedule_code || ('REC-' + s.id);
    const dowLabel = dowMap[Number(s.day_of_week)] || ('Thứ ' + s.day_of_week);
    const weeksLabel = Number(s.is_open_ended) === 1 ? 'Không giới hạn' : `${Number(s.weeks_count || 0)} tuần`;
    const upcoming = Array.isArray(s.upcoming_bookings) ? s.upcoming_bookings : [];
    const upcomingHtml = upcoming.length > 0 ? upcoming.map(ub => {
      const bCode = ub.code || '';
      const isCancelled = ub.status === 'Đã hủy' || ub.status === 'Hoàn thành';
      const skipBtn = (!isCancelled && s.status === 'active')
        ? `<button type="button" onclick="skipRecurringBooking('${escapeJsAttr(bCode)}')" class="ml-1 px-1.5 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-[9px] cursor-pointer" title="Khách nghỉ buổi này">Nghỉ 1 buổi</button>`
        : '';
      return `<div class="inline-flex items-center gap-1 px-2 py-0.5 mr-1 mb-1 rounded-full border text-[10px] ${isCancelled ? 'bg-slate-100 border-slate-200 text-slate-400 line-through' : 'bg-white border-emerald-200 text-slate-700'}">
        <span class="font-mono font-bold">${escapeSearchHTML(ub.booking_date || '')}</span>
        <span class="text-slate-400">#${escapeSearchHTML(bCode)}</span>
        ${skipBtn}
      </div>`;
    }).join('') : '<span class="text-[11px] text-[#94A3B8]">Không có buổi sắp tới</span>';

    const canCancel = isManagerOrAdmin() && s.status === 'active';
    const actionHtml = canCancel
      ? `<button type="button" onclick="cancelRecurringSchedule(${Number(s.id)}, '${escapeJsAttr(schCode)}')" class="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[11px] cursor-pointer">Dừng chuỗi</button>`
      : (statusMap[s.status] || escapeSearchHTML(s.status || ''));

    return `<tr class="hover:bg-slate-50/70">
      <td class="py-2.5 pr-3 align-top">
        <div class="font-mono font-bold text-[#0F172A]">${escapeSearchHTML(schCode)}</div>
        <div class="mt-1">${statusMap[s.status] || escapeSearchHTML(s.status || '')}</div>
      </td>
      <td class="py-2.5 pr-3 align-top">
        <div class="font-bold text-[#0F172A]">${escapeSearchHTML(s.customer_name || '')}</div>
        <div class="font-mono text-[11px] text-[#64748B]">${escapeSearchHTML(s.phone || '')}</div>
        ${s.note ? `<div class="text-[10px] text-slate-400 italic max-w-[180px] truncate" title="${escapeSearchHTML(s.note)}">${escapeSearchHTML(s.note)}</div>` : ''}
      </td>
      <td class="py-2.5 pr-3 align-top">
        <div class="font-bold text-[#0F172A]">${escapeSearchHTML(s.pitch_name || s.pitch_id || '')}</div>
        <div class="text-[11px] text-[#16A34A] font-semibold">${escapeSearchHTML(dowLabel)} · ${escapeSearchHTML(weeksLabel)}</div>
      </td>
      <td class="py-2.5 pr-3 align-top">
        <div class="font-bold text-[#0F172A]">⏰ ${escapeSearchHTML(s.slot_time || s.slot_id || '')}</div>
        <div class="text-[11px] text-[#64748B]">Từ ${escapeSearchHTML(s.start_date || '')}</div>
      </td>
      <td class="py-2.5 pr-3 align-top whitespace-nowrap">
        <div class="font-bold text-[#0F172A]">${escapeSearchHTML(fmt(s.price_per_match || 0))}</div>
        <div class="text-[10px] text-[#64748B]">Cọc: ${escapeSearchHTML(fmt(s.deposit_per_match || 0))}</div>
      </td>
      <td class="py-2.5 pr-3 align-top max-w-[300px]">${upcomingHtml}</td>
      <td class="py-2.5 text-right align-top">${actionHtml}</td>
    </tr>`;
  }).join('');
}
window.loadRecurringSchedules = loadRecurringSchedules;

async function handleCreateRecurringSchedule(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form?.querySelector('button[type="submit"]');
  const origHtml = submitBtn ? submitBtn.innerHTML : '';

  const customerName = (document.getElementById('rec-cust-name')?.value || '').trim();
  const phone = (document.getElementById('rec-cust-phone')?.value || '').trim();
  const pitchId = document.getElementById('rec-pitch-id')?.value || '';
  const dayOfWeek = parseInt(document.getElementById('rec-day-of-week')?.value || '1', 10) || 1;
  const slotId = document.getElementById('rec-slot-id')?.value || '';
  const startDate = document.getElementById('rec-start-date')?.value || (window.SanBongApp?.getLocalTodayISO ? window.SanBongApp.getLocalTodayISO() : new Date().toISOString().split('T')[0]);
  const isOpenEnded = Boolean(document.getElementById('rec-is-open-ended')?.checked);
  const weeksCount = isOpenEnded ? 0 : Math.max(2, parseInt(document.getElementById('rec-weeks-count')?.value || '8', 10) || 8);
  const depositPerMatch = Math.max(0, parseInt(document.getElementById('rec-deposit-per-match')?.value || '0', 10) || 0);
  const note = (document.getElementById('rec-note')?.value || '').trim();

  if (!customerName || !phone || !pitchId || !slotId) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập đầy đủ thông tin khách hàng, sân và khung giờ!', 'error');
    return;
  }

  const db = window.SanBongApp?.SanBongDB;
  const calc = db?.calculatePrice ? db.calculatePrice(pitchId, startDate, slotId, [], '', 1) : null;
  const pricePerMatch = Number(calc?.singlePitchPrice || calc?.pitchPrice || 0);

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Đang tạo chuỗi...';
  }
  try {
    const r = await adminFetchJson('../api/admin.php?action=create_recurring_schedule', {
      method: 'POST',
      body: JSON.stringify({
        customer_name: customerName,
        phone,
        pitch_id: pitchId,
        slot_id: slotId,
        day_of_week: dayOfWeek,
        start_date: startDate,
        is_open_ended: isOpenEnded,
        weeks_count: weeksCount,
        price_per_match: pricePerMatch,
        deposit_per_match: depositPerMatch,
        note
      })
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể tạo lịch cố định!', 'error', 4500);
      return;
    }
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || '✓ Đã tạo lịch cố định hàng tuần thành công!', 'success', 4000);
    }
    form?.reset();
    initRecurringScheduleForm();
    await loadRecurringSchedules();
    if (typeof fetchTimelineDateBookings === 'function') await fetchTimelineDateBookings(window.selectedTimelineDate);
    if (typeof renderTimelineGantt === 'function') renderTimelineGantt();
    if (typeof renderOverviewTodayBookings === 'function') renderOverviewTodayBookings();
    if (typeof renderOverviewKPIs === 'function') renderOverviewKPIs();
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origHtml;
    }
  }
}
window.handleCreateRecurringSchedule = handleCreateRecurringSchedule;

async function skipRecurringBooking(bookingCode) {
  const reason = await showAdminPrompt({
    title: `📅 Nghỉ 1 buổi trong chuỗi (#${bookingCode})`,
    message: `Xác nhận hủy đơn #${bookingCode} để nhả sân riêng buổi này (chuỗi các tuần sau vẫn giữ nguyên). Nhập lý do:`,
    placeholder: 'VD: Đội bận công tác tuần này',
    defaultValue: 'Khách báo nghỉ 1 buổi',
    confirmText: 'Xác nhận nghỉ 1 buổi',
    cancelText: 'Đóng'
  });
  if (reason === null) return;

  const r = await adminFetchJson('../api/admin.php?action=skip_recurring_booking', {
    method: 'POST',
    body: JSON.stringify({ booking_code: bookingCode, reason })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể hủy buổi này!', 'error', 4000);
    return;
  }
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || `✓ Đã nhả sân buổi #${bookingCode}`, 'success', 3500);
  await loadRecurringSchedules();
  if (typeof fetchTimelineDateBookings === 'function') await fetchTimelineDateBookings(window.selectedTimelineDate);
  if (typeof renderTimelineGantt === 'function') renderTimelineGantt();
  if (typeof renderOverviewTodayBookings === 'function') renderOverviewTodayBookings();
  if (typeof renderOverviewKPIs === 'function') renderOverviewKPIs();
}
window.skipRecurringBooking = skipRecurringBooking;

async function cancelRecurringSchedule(scheduleId, scheduleCode) {
  const reason = await showAdminPrompt({
    title: `⛔ Dừng toàn bộ chuỗi lịch (${scheduleCode || '#' + scheduleId})`,
    message: 'Hệ thống sẽ dừng chuỗi lịch cố định và hủy toàn bộ các buổi chưa diễn ra trong tương lai. Nhập lý do dừng chuỗi:',
    placeholder: 'VD: Đội bóng ngừng thuê sân theo tháng',
    defaultValue: 'Ngừng lịch cố định theo yêu cầu khách',
    confirmText: 'Xác nhận dừng chuỗi',
    cancelText: 'Giữ lại',
    danger: true
  });
  if (reason === null) return;

  const r = await adminFetchJson('../api/admin.php?action=cancel_recurring_schedule', {
    method: 'POST',
    body: JSON.stringify({ schedule_id: Number(scheduleId), reason })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể dừng chuỗi lịch cố định!', 'error', 4000);
    return;
  }
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã dừng chuỗi lịch cố định!', 'success', 3500);
  await loadRecurringSchedules();
  if (typeof fetchTimelineDateBookings === 'function') await fetchTimelineDateBookings(window.selectedTimelineDate);
  if (typeof renderTimelineGantt === 'function') renderTimelineGantt();
  if (typeof renderOverviewTodayBookings === 'function') renderOverviewTodayBookings();
  if (typeof renderOverviewKPIs === 'function') renderOverviewKPIs();
}
window.cancelRecurringSchedule = cancelRecurringSchedule;

async function runRecurringCronNow() {
  const ok = await showAdminConfirm({
    title: '🔄 Gia hạn lịch cố định 4 tuần tới',
    message: 'Hệ thống sẽ quét các lịch cố định đang chạy (đặc biệt gói không giới hạn) và tự động sinh thêm các buổi đá cho 4 tuần sắp tới. Tiếp tục?',
    confirmText: 'Sinh lịch ngay',
    cancelText: 'Hủy'
  });
  if (!ok) return;

  const btn = document.getElementById('btn-run-recurring-cron');
  const orig = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Đang sinh lịch...';
  }
  try {
    const r = await adminFetchJson('../api/admin.php?action=run_recurring_cron', {
      method: 'POST',
      body: JSON.stringify({})
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể chạy gia hạn lịch cố định!', 'error', 4000);
      return;
    }
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã sinh lịch cố định 4 tuần tới!', 'success', 4000);
    await loadRecurringSchedules();
    if (typeof fetchTimelineDateBookings === 'function') await fetchTimelineDateBookings(window.selectedTimelineDate);
    if (typeof renderTimelineGantt === 'function') renderTimelineGantt();
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  }
}
window.runRecurringCronNow = runRecurringCronNow;

;
/* === admin_waitlist_match.js === */
// Quản lý danh sách chờ (Waitlist) & Ghép kèo (Matchmaking)
let adminWaitlistCache = [];
let adminMatchmakingCache = [];

async function loadWaitlistAdmin() {
  const tbody = document.getElementById('admin-waitlist-tbody');
  if (!tbody) return;
  const status = document.getElementById('waitlist-status-filter')?.value || 'all';
  const dateFilter = document.getElementById('waitlist-date-filter')?.value || '';

  const r = await adminFetchJson(`../api/admin.php?action=get_waitlist&status=${encodeURIComponent(status)}&date=${encodeURIComponent(dateFilter)}`);
  if (!r.ok || !Array.isArray(r.data)) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-4 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải danh sách chờ.')}</td></tr>`;
    return;
  }

  adminWaitlistCache = r.data;
  if (r.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-[#94A3B8]">Không có yêu cầu chờ sân nào trong bộ lọc này.</td></tr>';
    return;
  }

  const stBadge = {
    waiting: '<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">Đang chờ</span>',
    notified: '<span class="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-bold text-[10px]">Đã báo sân trống</span>',
    converted: '<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">Đã gán sân</span>',
    cancelled: '<span class="px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-bold text-[10px]">Đã hủy</span>',
    expired: '<span class="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[10px]">Hết hạn</span>'
  };

  tbody.innerHTML = r.data.map(w => {
    const wid = Number(w.id);
    let actions = '';
    if (w.status === 'waiting') {
      actions = `<div class="inline-flex items-center gap-1.5">
        <button type="button" onclick="notifyWaitlistCustomer(${wid})" class="px-2 py-1 rounded bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] cursor-pointer">📣 Báo sân trống</button>
        <button type="button" onclick="assignWaitlistCustomer(${wid})" class="px-2 py-1 rounded bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-[11px] cursor-pointer">✅ Gán sân</button>
        <button type="button" onclick="cancelWaitlistCustomer(${wid})" class="px-2 py-1 rounded bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 font-bold text-[11px] cursor-pointer">Hủy</button>
      </div>`;
    } else if (w.status === 'notified') {
      actions = `<div class="inline-flex items-center gap-1.5">
        <button type="button" onclick="assignWaitlistCustomer(${wid})" class="px-2 py-1 rounded bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-[11px] cursor-pointer">✅ Gán sân ngay</button>
        <button type="button" onclick="cancelWaitlistCustomer(${wid})" class="px-2 py-1 rounded bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 font-bold text-[11px] cursor-pointer">Hủy</button>
      </div>`;
    } else if (w.status === 'converted' && w.converted_booking_code) {
      actions = `<span class="font-mono text-[11px] font-bold text-[#16A34A]">#${escapeSearchHTML(w.converted_booking_code)}</span>`;
    } else {
      actions = '<span class="text-[11px] text-[#94A3B8]">—</span>';
    }

    return `<tr class="hover:bg-slate-50/70">
      <td class="py-2.5 pr-3 font-mono font-bold text-[#0F172A] whitespace-nowrap">${escapeSearchHTML(w.booking_date || '')}</td>
      <td class="py-2.5 pr-3">
        <div class="font-bold text-[#0F172A]">${escapeSearchHTML(w.pitch_name || w.pitch_id || '')}</div>
        <div class="text-[11px] text-[#64748B]">⏰ ${escapeSearchHTML(w.slot_time || w.slot_id || '')}</div>
      </td>
      <td class="py-2.5 pr-3 font-semibold text-[#0F172A]">${escapeSearchHTML(w.customer_name || '')}</td>
      <td class="py-2.5 pr-3 font-mono text-[#475569]">${escapeSearchHTML(w.phone || '')}</td>
      <td class="py-2.5 pr-3 text-[#64748B] max-w-[180px] truncate" title="${escapeSearchHTML(w.note || '')}">${escapeSearchHTML(w.note || '—')}</td>
      <td class="py-2.5 pr-3">${stBadge[w.status] || escapeSearchHTML(w.status || '')}</td>
      <td class="py-2.5 text-right">${actions}</td>
    </tr>`;
  }).join('');
}
window.loadWaitlistAdmin = loadWaitlistAdmin;

async function notifyWaitlistCustomer(waitlistId) {
  const r = await adminFetchJson('../api/admin.php?action=notify_waitlist', {
    method: 'POST',
    body: JSON.stringify({ waitlist_id: Number(waitlistId) })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể gửi báo sân trống!', 'error', 4000);
    return;
  }
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã giữ chỗ tạm & gửi thông báo cho khách chờ!', 'success', 3500);
  await loadWaitlistAdmin();
}
window.notifyWaitlistCustomer = notifyWaitlistCustomer;

async function assignWaitlistCustomer(waitlistId) {
  const ok = await showAdminConfirm({
    title: '✅ Gán sân cho khách danh sách chờ',
    message: 'Chuyển yêu cầu chờ này thành đơn đặt sân chính thức (giữ sân ngay)?',
    confirmText: 'Gán sân ngay',
    cancelText: 'Đóng'
  });
  if (!ok) return;

  const r = await adminFetchJson('../api/admin.php?action=assign_waitlist', {
    method: 'POST',
    body: JSON.stringify({ waitlist_id: Number(waitlistId) })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể gán sân cho khách chờ!', 'error', 4000);
    return;
  }
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã gán sân thành công!', 'success', 4000);
  await loadWaitlistAdmin();
  if (typeof fetchTimelineDateBookings === 'function') await fetchTimelineDateBookings(window.selectedTimelineDate);
  if (typeof renderTimelineGantt === 'function') renderTimelineGantt();
  if (typeof renderOverviewTodayBookings === 'function') renderOverviewTodayBookings();
  if (typeof renderOverviewKPIs === 'function') renderOverviewKPIs();
}
window.assignWaitlistCustomer = assignWaitlistCustomer;

async function cancelWaitlistCustomer(waitlistId) {
  const ok = await showAdminConfirm({
    title: 'Hủy yêu cầu chờ sân',
    message: 'Xác nhận hủy yêu cầu trong danh sách chờ này?',
    confirmText: 'Xác nhận hủy',
    cancelText: 'Quay lại',
    danger: true
  });
  if (!ok) return;

  const r = await adminFetchJson('../api/admin.php?action=cancel_waitlist', {
    method: 'POST',
    body: JSON.stringify({ waitlist_id: Number(waitlistId) })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể hủy yêu cầu chờ!', 'error', 4000);
    return;
  }
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã hủy yêu cầu danh sách chờ!', 'success', 3000);
  await loadWaitlistAdmin();
}
window.cancelWaitlistCustomer = cancelWaitlistCustomer;

async function loadMatchmakingAdmin() {
  const tbody = document.getElementById('admin-matchmaking-tbody');
  if (!tbody) return;
  const status = document.getElementById('mm-admin-status-filter')?.value || 'all';
  const r = await adminFetchJson(`../api/admin.php?action=get_matchmaking_admin&status=${encodeURIComponent(status)}`);
  if (!r.ok || !Array.isArray(r.data)) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-4 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải danh sách tin ghép kèo.')}</td></tr>`;
    return;
  }

  adminMatchmakingCache = r.data;
  if (r.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-[#94A3B8]">Không có tin tìm đối / ghép kèo nào.</td></tr>';
    return;
  }

  const stMap = {
    pending: '<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">Chờ duyệt</span>',
    open: '<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">Đang mở</span>',
    matched: '<span class="px-2 py-0.5 rounded bg-sky-100 text-sky-700 font-bold text-[10px]">Đã ghép kèo</span>',
    closed: '<span class="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">Đã đóng</span>',
    rejected: '<span class="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[10px]">Từ chối</span>'
  };

  tbody.innerHTML = r.data.map(m => {
    const code = m.post_code || m.postCode || '';
    const codeAttr = escapeJsAttr(code);
    const st = m.status || 'pending';
    let actions = '';
    if (st === 'pending') {
      actions = `<div class="inline-flex items-center gap-1.5">
        <button type="button" onclick="moderateMatchmaking('${codeAttr}', 'approve')" class="px-2.5 py-1 rounded bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-[11px] cursor-pointer">✓ Duyệt mở</button>
        <button type="button" onclick="moderateMatchmaking('${codeAttr}', 'reject')" class="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[11px] cursor-pointer">✕ Từ chối</button>
      </div>`;
    } else if (st === 'open') {
      actions = `<div class="inline-flex items-center gap-1.5">
        <button type="button" onclick="moderateMatchmaking('${codeAttr}', 'close')" class="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-800 text-white font-bold text-[11px] cursor-pointer">🔒 Đóng kèo</button>
        <button type="button" onclick="moderateMatchmaking('${codeAttr}', 'reject')" class="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[11px] cursor-pointer">Từ chối</button>
      </div>`;
    } else if (st === 'closed' || st === 'rejected') {
      actions = `<button type="button" onclick="moderateMatchmaking('${codeAttr}', 'open')" class="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] cursor-pointer">🔓 Mở lại</button>`;
    } else {
      actions = '<span class="text-[11px] text-[#64748B]">Đã khóa kèo</span>';
    }

    return `<tr class="hover:bg-slate-50/70">
      <td class="py-2.5 pr-3 font-mono font-bold text-[#0F172A]">${escapeSearchHTML(code)}</td>
      <td class="py-2.5 pr-3">
        <div class="font-bold text-[#0F172A]">${escapeSearchHTML(m.team_name || '')}</div>
        <div class="text-[11px] text-[#64748B]">Đội trưởng: ${escapeSearchHTML(m.contact_name || '')}</div>
      </td>
      <td class="py-2.5 pr-3 font-mono text-[#475569]">${escapeSearchHTML(m.contact_phone || '')}</td>
      <td class="py-2.5 pr-3">
        <div class="font-bold text-[#0F172A]">${escapeSearchHTML(m.match_date || '')} · ${escapeSearchHTML(m.slot_time || '')}</div>
        <div class="text-[11px] text-[#64748B]">Sân ${escapeSearchHTML(String(m.pitch_type || ''))} người ${m.pitch_name ? '· ' + escapeSearchHTML(m.pitch_name) : ''}</div>
      </td>
      <td class="py-2.5 pr-3">
        <div class="font-semibold text-[#0F172A]">${escapeSearchHTML(m.skill_level || 'Giao hữu')}</div>
        <div class="text-[11px] text-[#64748B]">${escapeSearchHTML(m.bet_rule || '50-50')}</div>
        ${m.note ? `<div class="text-[10px] text-slate-400 italic max-w-[180px] truncate" title="${escapeSearchHTML(m.note)}">${escapeSearchHTML(m.note)}</div>` : ''}
      </td>
      <td class="py-2.5 pr-3">${stMap[st] || escapeSearchHTML(st)}</td>
      <td class="py-2.5 text-right">${actions}</td>
    </tr>`;
  }).join('');
}
window.loadMatchmakingAdmin = loadMatchmakingAdmin;

async function moderateMatchmaking(postCode, decision) {
  if (decision === 'reject' || decision === 'close') {
    const ok = await showAdminConfirm({
      title: decision === 'reject' ? 'Từ chối tin tìm đối' : 'Đóng tin tìm đối',
      message: `Xác nhận ${decision === 'reject' ? 'từ chối' : 'đóng'} tin ghép kèo #${postCode}?`,
      confirmText: decision === 'reject' ? 'Từ chối' : 'Đóng tin',
      cancelText: 'Quay lại',
      danger: decision === 'reject'
    });
    if (!ok) return;
  }

  const r = await adminFetchJson('../api/admin.php?action=moderate_matchmaking', {
    method: 'POST',
    body: JSON.stringify({ post_code: postCode, decision })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể kiểm duyệt tin tìm đối!', 'error', 4000);
    return;
  }
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || `✓ Đã cập nhật tin #${postCode}`, 'success', 3000);
  await loadMatchmakingAdmin();
}
window.moderateMatchmaking = moderateMatchmaking;

;
/* === admin_logs.js === */
/**
 * Tab 11: Nhật ký hệ thống & thao tác quản trị (Admin Logs UI + Action Catalog).
 */
const ADMIN_LOG_CATEGORIES = {
    TD: { code: 'TD', shortCode: 'TD', key: 'TD', label: 'Tạo/Duyệt', badgeClass: 'audit-cat-td' },
    XH: { code: 'XH', shortCode: 'XHC', key: 'XH', label: 'Xóa/Hủy/Chi tiền', badgeClass: 'audit-cat-xh' },
    CN: { code: 'CN', shortCode: 'CN', key: 'CN', label: 'Cập nhật', badgeClass: 'audit-cat-cn' },
    CB: { code: 'CB', shortCode: 'CB', key: 'CB', label: 'Cảnh báo', badgeClass: 'audit-cat-cb' },
    TQ: { code: 'TQ', shortCode: 'TQ', key: 'TQ', label: 'Tiền quầy', badgeClass: 'audit-cat-tq' },
    TT: { code: 'TT', shortCode: 'AUTO', key: 'TT', label: 'Tự động', badgeClass: 'audit-cat-tt' }
};

const ADMIN_LOG_DATA_GROUPS = [
    'Ca trực', 'Tiền & đặt cọc', 'Hội viên & điểm', 'Giá & voucher',
    'Sân & Lịch đặt', 'Cài đặt', 'Nhân sự & Bảo mật', 'Khác'
];

const _aMeta = (label, category, dataGroup) => ({ label, category, dataGroup });

const ADMIN_LOG_CATALOG = {
    categories: ADMIN_LOG_CATEGORIES,
    groups: Object.values(ADMIN_LOG_CATEGORIES),
    dataGroups: ADMIN_LOG_DATA_GROUPS,
    actions: {
        SHIFT_OPEN: _aMeta('Mở ca trực', 'TD', 'Ca trực'),
        SHIFT_CLOSE: _aMeta('Đóng ca trực', 'CB', 'Ca trực'),
        CLOSE_SHIFT: _aMeta('Đóng ca trực', 'CB', 'Ca trực'),
        SHIFT_HANDOVER: _aMeta('Giao ca trực', 'CB', 'Ca trực'),
        SHIFT_CONFIRM: _aMeta('Xác nhận chốt ca', 'TD', 'Ca trực'),
        SHIFT_EDIT_COUNT: _aMeta('Sửa số liệu kiểm đếm ca', 'CB', 'Ca trực'),
        COLLECT_PAYMENT: _aMeta('Thu tiền tại quầy', 'TQ', 'Tiền & đặt cọc'),
        COUNTER_SALE: _aMeta('Bán hàng tại quầy', 'TQ', 'Tiền & đặt cọc'),
        ADJUST_DISCOUNT: _aMeta('Điều chỉnh giảm giá đơn', 'CB', 'Tiền & đặt cọc'),
        UPDATE_PAYMENT: _aMeta('Cập nhật thanh toán', 'CN', 'Tiền & đặt cọc'),
        UPDATE_FINANCE: _aMeta('Cập nhật thông tin tài chính', 'CN', 'Tiền & đặt cọc'),
        RECONCILE_MANUAL: _aMeta('Gán giao dịch thủ công', 'TD', 'Tiền & đặt cọc'),
        RECONCILE_RESOLVE: _aMeta('Xử lý đối soát', 'CB', 'Tiền & đặt cọc'),
        WEBHOOK_MATCH: _aMeta('Giao dịch ngân hàng khớp đơn', 'TD', 'Tiền & đặt cọc'),
        WEBHOOK_UNDERPAID: _aMeta('Giao dịch ngân hàng chuyển thiếu', 'XH', 'Tiền & đặt cọc'),
        WEBHOOK_OVERPAID: _aMeta('Giao dịch ngân hàng chuyển thừa', 'CB', 'Tiền & đặt cọc'),
        WEBHOOK_UNMATCHED: _aMeta('Giao dịch ngân hàng không khớp đơn', 'CB', 'Tiền & đặt cọc'),
        CONFIRM_DEPOSIT: _aMeta('Xác nhận đặt cọc', 'TD', 'Tiền & đặt cọc'),
        APPROVE_DEPOSIT: _aMeta('Duyệt đặt cọc', 'TD', 'Tiền & đặt cọc'),
        REJECT_DEPOSIT: _aMeta('Từ chối đặt cọc', 'XH', 'Tiền & đặt cọc'),
        EXPENSE_ADD: _aMeta('Thêm khoản chi', 'XH', 'Tiền & đặt cọc'),
        EXPENSE_UPDATE: _aMeta('Cập nhật khoản chi', 'CN', 'Tiền & đặt cọc'),
        EXPENSE_DELETE: _aMeta('Xóa khoản chi', 'XH', 'Tiền & đặt cọc'),
        EXPORT_REPORTS: _aMeta('Xuất báo cáo doanh thu', 'TD', 'Tiền & đặt cọc'),
        ADJUST_POINTS: _aMeta('Điều chỉnh điểm', 'CN', 'Hội viên & điểm'),
        CRM_CUSTOMER_UPDATE: _aMeta('Cập nhật hồ sơ khách hàng', 'CN', 'Hội viên & điểm'),
        CRM_UPDATE: _aMeta('Cập nhật hồ sơ khách', 'CN', 'Hội viên & điểm'),
        UPDATE_MEMBER: _aMeta('Cập nhật hội viên', 'CN', 'Hội viên & điểm'),
        UPDATE_PROFILE: _aMeta('Cập nhật hồ sơ cá nhân', 'CN', 'Hội viên & điểm'),
        USER_EDIT: _aMeta('Sửa thông tin hội viên', 'CN', 'Hội viên & điểm'),
        UPDATE_PRICING: _aMeta('Cập nhật giá sân', 'CN', 'Giá & voucher'),
        UPDATE_PRICE: _aMeta('Cập nhật giá sân', 'CN', 'Giá & voucher'),
        PRICE_UPDATE: _aMeta('Cập nhật giá sân', 'CN', 'Giá & voucher'),
        VOUCHER_SAVE: _aMeta('Lưu voucher', 'CN', 'Giá & voucher'),
        VOUCHER_CREATE: _aMeta('Tạo voucher', 'TD', 'Giá & voucher'),
        VOUCHER_UPDATE: _aMeta('Cập nhật voucher', 'CN', 'Giá & voucher'),
        VOUCHER_DELETE: _aMeta('Xóa voucher', 'XH', 'Giá & voucher'),
        VOUCHER_TOGGLE: _aMeta('Bật/tắt voucher', 'CN', 'Giá & voucher'),
        VOUCHER_TOGGLE_STATUS: _aMeta('Bật/tắt voucher', 'CN', 'Giá & voucher'),
        GOLDEN_HOUR_SAVE: _aMeta('Lưu quy tắc giờ vàng', 'CN', 'Giá & voucher'),
        GOLDEN_HOUR_DELETE: _aMeta('Xóa quy tắc giờ vàng', 'XH', 'Giá & voucher'),
        PACKAGE_SAVE: _aMeta('Lưu gói cố định theo tháng', 'TD', 'Giá & voucher'),
        PACKAGE_DELETE: _aMeta('Xóa gói cố định theo tháng', 'XH', 'Giá & voucher'),
        PACKAGE_TOGGLE: _aMeta('Bật/tắt gói cố định theo tháng', 'CN', 'Giá & voucher'),
        WALKIN_BOOKING: _aMeta('Tạo đơn tại quầy', 'TD', 'Sân & Lịch đặt'),
        WALKIN_PAST_SLOT: _aMeta('Duyệt đặt sân quá khứ', 'CB', 'Sân & Lịch đặt'),
        CHECKIN: _aMeta('Check-in nhận sân', 'CN', 'Sân & Lịch đặt'),
        COMPLETE_BOOKING: _aMeta('Hoàn tất đơn đặt sân', 'TD', 'Sân & Lịch đặt'),
        CANCEL_BOOKING: _aMeta('Hủy đơn đặt sân', 'XH', 'Sân & Lịch đặt'),
        EARLY_CANCEL: _aMeta('Hủy đơn sớm', 'XH', 'Sân & Lịch đặt'),
        RESTORE_BOOKING: _aMeta('Khôi phục đơn', 'TD', 'Sân & Lịch đặt'),
        NOSHOW_RELEASE_SLOT: _aMeta('Nhả sân khách vắng', 'CB', 'Sân & Lịch đặt'),
        TRANSFER_PITCH: _aMeta('Chuyển sân đặt', 'CN', 'Sân & Lịch đặt'),
        ADD_SERVICE: _aMeta('Thêm dịch vụ vào đơn', 'TD', 'Sân & Lịch đặt'),
        ADD_OVERTIME: _aMeta('Thêm giờ đá', 'TD', 'Sân & Lịch đặt'),
        BOOKING_BATCH_OP: _aMeta('Thao tác hàng loạt đơn đặt sân', 'CN', 'Sân & Lịch đặt'),
        RECURRING_CREATE: _aMeta('Tạo lịch cố định', 'TD', 'Sân & Lịch đặt'),
        RECURRING_CANCEL: _aMeta('Hủy lịch cố định', 'XH', 'Sân & Lịch đặt'),
        RECURRING_SKIP_DATE: _aMeta('Bỏ qua buổi cố định', 'CB', 'Sân & Lịch đặt'),
        RECURRING_BOOKING: _aMeta('Lịch đặt cố định', 'CN', 'Sân & Lịch đặt'),
        RECURRING_CRON_GENERATE: _aMeta('Tự động tạo lịch cố định', 'TT', 'Sân & Lịch đặt'),
        RECURRING_CONFLICT_SKIP: _aMeta('Bỏ qua lịch bị trùng', 'TT', 'Sân & Lịch đặt'),
        RUN_RECURRING_GEN: _aMeta('Chạy tạo lịch cố định', 'TT', 'Sân & Lịch đặt'),
        WAITLIST_ASSIGN: _aMeta('Gán khách trong danh sách chờ', 'TD', 'Sân & Lịch đặt'),
        WAITLIST_CANCEL: _aMeta('Hủy yêu cầu danh sách chờ', 'XH', 'Sân & Lịch đặt'),
        WAITLIST_NOTIFIED: _aMeta('Thông báo sân trống', 'CN', 'Sân & Lịch đặt'),
        WAITLIST_HOLD_EXPIRED: _aMeta('Hết hạn giữ chỗ danh sách chờ', 'TT', 'Sân & Lịch đặt'),
        MATCHMAKING_MODERATE: _aMeta('Kiểm duyệt tin tìm đội', 'TD', 'Sân & Lịch đặt'),
        MATCHMAKING_CANCEL: _aMeta('Hủy tin tìm đội', 'XH', 'Sân & Lịch đặt'),
        REVIEW_REPLY: _aMeta('Phản hồi đánh giá', 'CN', 'Sân & Lịch đặt'),
        REVIEW_STATUS: _aMeta('Đổi trạng thái đánh giá', 'CN', 'Sân & Lịch đặt'),
        PITCH_STATUS: _aMeta('Đổi trạng thái sân', 'CN', 'Sân & Lịch đặt'),
        PITCH_STATUS_TOGGLE: _aMeta('Đổi trạng thái sân', 'CN', 'Sân & Lịch đặt'),
        TOGGLE_PITCH: _aMeta('Đổi trạng thái sân', 'CN', 'Sân & Lịch đặt'),
        PITCH_UPSERT: _aMeta('Thêm/sửa sân', 'CN', 'Sân & Lịch đặt'),
        SERVICE_UPSERT: _aMeta('Thêm/sửa dịch vụ', 'CN', 'Sân & Lịch đặt'),
        SERVICE_DELETE: _aMeta('Ngừng kinh doanh dịch vụ', 'XH', 'Sân & Lịch đặt'),
        INVENTORY_RESTOCK: _aMeta('Nhập thêm hàng tồn', 'TD', 'Sân & Lịch đặt'),
        MAINTENANCE_ADD: _aMeta('Thêm lịch bảo trì', 'TD', 'Sân & Lịch đặt'),
        MAINTENANCE_UPDATE: _aMeta('Cập nhật lịch bảo trì', 'CN', 'Sân & Lịch đặt'),
        AUTO_CANCEL_EXPIRED: _aMeta('Tự động hủy đơn quá hạn', 'TT', 'Sân & Lịch đặt'),
        AUTO_CLOSE_PAST_BOOKINGS: _aMeta('Tự động đóng đơn quá ngày', 'TT', 'Sân & Lịch đặt'),
        AUTO_NOSHOW_15M: _aMeta('Tự động xử lý khách vắng mặt (quá 15p)', 'TT', 'Sân & Lịch đặt'),
        AUTO_NOSHOW_15M_UNPAID: _aMeta('Tự động hủy đơn chưa cọc quá giờ đá', 'TT', 'Sân & Lịch đặt'),
        CRON_IN_PLAY_UNPAID: _aMeta('Cảnh báo ca quá giờ chưa tất toán', 'TT', 'Sân & Lịch đặt'),
        CRON_COMPLETE_OVERDUE_IN_PLAY: _aMeta('Tự động hoàn tất ca quá giờ', 'TT', 'Sân & Lịch đặt'),
        ADMIN_RUN_AUTO_RELEASE: _aMeta('Chạy nhả đơn quá hạn thủ công', 'TT', 'Sân & Lịch đặt'),
        RUN_REMINDERS: _aMeta('Chạy nhắc lịch', 'TT', 'Sân & Lịch đặt'),
        UPDATE_SETTINGS: _aMeta('Cập nhật cài đặt hệ thống', 'CN', 'Cài đặt'),
        SYSTEM_SETTINGS: _aMeta('Cập nhật cài đặt hệ thống', 'CN', 'Cài đặt'),
        UPDATE_INFO: _aMeta('Sửa thông tin hệ thống', 'CN', 'Cài đặt'),
        DATABASE_BACKUP: _aMeta('Sao lưu cơ sở dữ liệu', 'TT', 'Cài đặt'),
        DB_BACKUP: _aMeta('Sao lưu cơ sở dữ liệu', 'TT', 'Cài đặt'),
        TELEGRAM_TEST: _aMeta('Kiểm tra kết nối Telegram', 'TT', 'Cài đặt'),
        SAMPLE_DATA_CLEAN: _aMeta('Dọn dữ liệu mẫu', 'XH', 'Cài đặt'),
        SAMPLE_DATA_SEED: _aMeta('Tạo dữ liệu mẫu', 'TT', 'Cài đặt'),
        STAFF_CREATE: _aMeta('Tạo tài khoản nhân sự', 'TD', 'Nhân sự & Bảo mật'),
        STAFF_ROLE_CHANGE: _aMeta('Đổi vai trò nhân sự', 'CB', 'Nhân sự & Bảo mật'),
        STAFF_STATUS_CHANGE: _aMeta('Đổi trạng thái nhân sự', 'CN', 'Nhân sự & Bảo mật'),
        STAFF_RESET_PASSWORD: _aMeta('Đặt lại mật khẩu nhân sự', 'CB', 'Nhân sự & Bảo mật'),
        CHANGE_PASSWORD: _aMeta('Đổi mật khẩu', 'CB', 'Nhân sự & Bảo mật'),
        FORGOT_PASSWORD_REQUEST: _aMeta('Yêu cầu khôi phục mật khẩu', 'CB', 'Nhân sự & Bảo mật'),
        ENABLE_2FA: _aMeta('Bật xác thực 2 bước', 'TD', 'Nhân sự & Bảo mật'),
        DISABLE_2FA: _aMeta('Tắt xác thực 2 bước', 'XH', 'Nhân sự & Bảo mật'),
        '2FA_TOGGLE': _aMeta('Thay đổi xác thực 2 bước', 'CB', 'Nhân sự & Bảo mật'),
        DB_BACKUP_DOWNLOAD: _aMeta('Tải bản sao lưu cơ sở dữ liệu', 'CB', 'Nhân sự & Bảo mật'),
        AUDIT_REVIEW: _aMeta('Hậu kiểm nhật ký quản trị', 'TD', 'Nhân sự & Bảo mật'),
        EXPORT_CSV: _aMeta('Xuất dữ liệu CSV', 'CB', 'Nhân sự & Bảo mật'),
        SENSITIVE_DATA_ACCESS: _aMeta('Truy cập dữ liệu nhạy cảm', 'CB', 'Nhân sự & Bảo mật')
    },
    fieldLabels: {
        status: 'Trạng thái', payment_status: 'Trạng thái thu tiền', paid_amount: 'Đã thu',
        total_amount: 'Tổng tiền', deposit_amount: 'Tiền cọc', discount_amount: 'Giảm giá',
        points: 'Điểm tích lũy', loyalty_points: 'Điểm tích lũy', tier: 'Hạng hội viên',
        role: 'Phân quyền', is_active: 'Kích hoạt', is_2fa_enabled: 'Xác thực 2FA',
        staff_counted_cash: 'NV đếm quỹ', actual_cash_received: 'Tiền mặt thực nhận',
        discrepancy_amount: 'Chênh lệch quỹ', admin_note: 'Ghi chú quản lý', note: 'Ghi chú',
        reason: 'Lý do', pitch_id: 'Sân', booking_date: 'Ngày đá', start_time: 'Giờ bắt đầu',
        end_time: 'Giờ kết thúc', price: 'Đơn giá', hourly_rate: 'Giá theo giờ',
        value: 'Giá trị', max_uses: 'Lượt dùng tối đa', customer_name: 'Tên khách hàng',
        customer_phone: 'Số điện thoại', cash_received: 'Tiền mặt', transfer_received: 'Chuyển khoản'
    }
};

const adminLogState = {
    page: 1, limit: 25, total: 0, totalPages: 1, latestId: 0,
    staffId: '', actionType: '', dataGroup: '', fromDate: '', toDate: '',
    search: '', quickFilter: '', categories: [], logs: [],
    revealedMap: {}, expandedDiffs: {}, expandedJson: {}, openReviewId: null,
    summaryAbort: null, listAbort: null, searchTimer: null, pollTimer: null,
    urlHydrated: false, pluginsReady: false
};

const AUDIT_INPUT_BINDINGS = [
    ['admin-log-filter-staff', 'staffId'], ['admin-log-filter-action', 'actionType'],
    ['admin-log-filter-datagroup', 'dataGroup'], ['admin-log-filter-from', 'fromDate'],
    ['admin-log-filter-to', 'toDate'], ['admin-log-search', 'search']
];

const auditById = (id) => (typeof document !== 'undefined' ? document.getElementById(id) : null);
const toggleAuditClass = (el, cls, add) => el?.classList && el.classList[add ? 'add' : 'remove'](cls);
const showAuditToast = (msg, type = 'info') => window?.SanBongApp?.showToast?.(msg, type);

function auditEsc(str) {
    if (typeof window !== 'undefined' && typeof window.escapeHTML === 'function') return window.escapeHTML(str);
    return String(str ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function maskAuditPhone(text) {
    return text == null ? '' : String(text).replace(/(?<!\d)(0\d{2})\d{4,6}(\d{3})(?!\d)/g, '$1***$2');
}

function getVnDateParts(dateObj) {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(dateObj);
    return Object.fromEntries(parts.map((p) => [p.type, p.value]));
}

function formatAuditDateTime(raw) {
    if (!raw) return '—';
    const str = String(raw).trim();
    if (/^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}/.test(str)) return str.slice(0, 16);
    const d = new Date(str.includes(' ') && !str.includes('T') ? str.replace(' ', 'T') + '+07:00' : str);
    if (Number.isNaN(d.getTime())) return str;
    const p = getVnDateParts(d);
    return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

function getAuditDateKey(raw) {
    const m = formatAuditDateTime(raw).match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}

function formatAuditDayDivider(dateKey) {
    if (!dateKey) return 'Khác';
    const fmt = (ms) => { const p = getVnDateParts(new Date(ms)); return `${p.year}-${p.month}-${p.day}`; };
    const [y, m, d] = dateKey.split('-');
    const vn = `${d}/${m}/${y}`;
    if (dateKey === fmt(Date.now())) return `Hôm nay, ${vn}`;
    if (dateKey === fmt(Date.now() - 86400000)) return `Hôm qua, ${vn}`;
    return vn;
}

function parseAuditDateMs(raw) {
    if (!raw) return NaN;
    const s = String(raw).trim();
    const dm = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
    if (dm) return Date.parse(`${dm[3]}-${dm[2]}-${dm[1]}T${dm[4] || '00'}:${dm[5] || '00'}:00+07:00`);
    return Date.parse(s.includes(' ') && !s.includes('T') ? s.replace(' ', 'T') + '+07:00' : s);
}

function formatAuditClockTime(raw) {
    const m = formatAuditDateTime(raw).match(/\s(\d{2}:\d{2})$/);
    return m ? m[1] : formatAuditDateTime(raw);
}

function formatAuditRelativeTime(raw) {
    const ms = parseAuditDateMs(raw);
    if (Number.isNaN(ms)) return '—';
    const diffMin = Math.max(0, Math.floor((Date.now() - ms) / 60000));
    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    const key = getAuditDateKey(raw);
    const fmt = (t) => { const p = getVnDateParts(new Date(t)); return `${p.year}-${p.month}-${p.day}`; };
    if (key === fmt(Date.now()) && diffMin < 1440) return `${Math.floor(diffMin / 60)} giờ trước`;
    if (key === fmt(Date.now() - 86400000)) return 'Hôm qua';
    const dt = formatAuditDateTime(raw);
    return dt.length >= 5 ? dt.slice(0, 5) : dt;
}

function validateAuditReasonClient(reason, minLen = 10) {
    const clean = String(reason || '').trim();
    if (Array.from(clean).length < minLen) return { valid: false, error: `Vui lòng nhập ghi chú hậu kiểm tối thiểu ${minLen} ký tự.` };
    const compact = clean.replace(/\s+/gu, '').toLowerCase();
    if (new Set(Array.from(compact)).size < 4 || /(.)\1{4,}/u.test(compact)) {
        return { valid: false, error: 'Ghi chú hậu kiểm không hợp lệ (không nhập ký tự lặp vô nghĩa).' };
    }
    for (let len = 2; len <= 3; len++) {
        const u = compact.slice(0, len);
        if (u.length === len && compact.length >= len * 3 && u.repeat(Math.ceil(compact.length / len)).slice(0, compact.length) === compact) {
            return { valid: false, error: 'Ghi chú hậu kiểm không được lặp chuỗi vô nghĩa.' };
        }
    }
    return { valid: true, clean };
}

const ADMIN_LOG_ACTION_ALIASES = {
    OPEN_SHIFT: 'SHIFT_OPEN', CLOSE_SHIFT: 'SHIFT_CLOSE', CRM_UPDATE: 'CRM_CUSTOMER_UPDATE',
    UPDATE_PRICE: 'UPDATE_PRICING', PRICE_UPDATE: 'UPDATE_PRICING', VOUCHER_TOGGLE_STATUS: 'VOUCHER_TOGGLE',
    PITCH_STATUS_TOGGLE: 'PITCH_STATUS', TOGGLE_PITCH: 'PITCH_STATUS', SYSTEM_SETTINGS: 'UPDATE_SETTINGS',
    DB_BACKUP: 'DATABASE_BACKUP', CANCEL_MATCHMAKING: 'MATCHMAKING_CANCEL', MATCH_CANCEL: 'MATCHMAKING_CANCEL'
};

function resolveActionMeta(actionCode, row = {}) {
    const key = String(actionCode || '').trim();
    const upper = key.toUpperCase();
    const canon = ADMIN_LOG_ACTION_ALIASES[upper] || upper;
    const hit = ADMIN_LOG_CATALOG.actions[key] || ADMIN_LOG_CATALOG.actions[upper] || ADMIN_LOG_CATALOG.actions[canon] || null;
    const cat = ADMIN_LOG_CATEGORIES[row.category] ? row.category : (hit?.category || 'CN');
    return {
        label: row.action_label || hit?.label || key || 'Thao tác khác',
        category: cat,
        categoryMeta: ADMIN_LOG_CATEGORIES[cat] || ADMIN_LOG_CATEGORIES.CN,
        dataGroup: row.data_group || hit?.dataGroup || 'Khác',
        registered: row.action_registered !== undefined ? Boolean(row.action_registered) : Boolean(hit)
    };
}

function resolveActorRoleInfo(row) {
    const raw = String(row.actor_role || '').trim().toLowerCase();
    if (Number(row.user_id || 0) === 0 || raw === '' || raw === 'system') {
        return { cls: 'role-system', label: row.actor_role_label || 'Hệ thống' };
    }
    const map = { admin: ['role-admin', 'Chủ sân'], manager: ['role-manager', 'Quản lý'], staff: ['role-staff', 'Nhân viên'] };
    const [cls, defLbl] = map[raw] || ['role-staff', raw];
    return { cls, label: row.actor_role_label || defLbl };
}

function resolveObjectTypeLabel(row, meta) {
    if (row.object_type_label) return row.object_type_label;
    const map = {
        shift: 'Ca trực', shifts: 'Ca trực', booking: 'Mã ca', bookings: 'Mã ca',
        user: 'Hội viên', customer: 'Hội viên', member: 'Hội viên', pitch: 'Sân bóng',
        service: 'Dịch vụ', inventory: 'Dịch vụ', voucher: 'Voucher', expense: 'Khoản chi',
        pricing: 'Bảng giá', setting: 'Cài đặt', settings: 'Cài đặt', staff: 'Nhân sự',
        security: 'Bảo mật', bank_transaction: 'Giao dịch', system: 'Hệ thống'
    };
    return map[String(row.target_type || '').toLowerCase()] || (meta?.dataGroup === 'Ca trực' ? 'Ca trực' : 'Hệ thống');
}

function normalizeLogApiUrl(path) {
    if (typeof window !== 'undefined' && typeof window.normalizeAdminApiUrl === 'function') return window.normalizeAdminApiUrl(path);
    if (typeof window !== 'undefined' && typeof window.getRelativePath === 'function') return window.getRelativePath(path);
    return path.startsWith('/') ? path : `../${path}`;
}

async function auditApiRequest(path, options = {}) {
    const headers = Object.assign({ Accept: 'application/json' }, options.headers || {});
    if (typeof window !== 'undefined' && window.CSRF_TOKEN && !headers['X-CSRF-Token']) headers['X-CSRF-Token'] = window.CSRF_TOKEN;
    const fetchOpts = { method: options.method || 'GET', credentials: 'same-origin', headers, signal: options.signal };
    if (options.body !== undefined) {
        fetchOpts.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
        if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(normalizeLogApiUrl(path), fetchOpts);
    if (res.status === 401) {
        if (typeof window !== 'undefined' && window.location) window.location.href = normalizeLogApiUrl('login?redirect=portal-admin');
        const err = new Error('Phiên đăng nhập đã hết hạn.');
        err.status = 401;
        throw err;
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
        const msg = json?.error?.message || json?.message || (res.status === 403 ? 'Chỉ Admin mới có quyền xem Nhật ký quản trị.' : `Lỗi máy chủ (${res.status})`);
        const err = new Error(msg);
        err.status = res.status;
        throw err;
    }
    return json;
}

function buildAuditFilterParams(page = adminLogState.page, extra = {}) {
    const p = new URLSearchParams({ page: String(page || 1), limit: String(adminLogState.limit || 25) });
    const fields = [
        ['staff_id', adminLogState.staffId], ['action_type', adminLogState.actionType],
        ['data_group', adminLogState.dataGroup], ['from_date', adminLogState.fromDate],
        ['to_date', adminLogState.toDate], ['search', adminLogState.search],
        ['quick_filter', adminLogState.quickFilter], ['categories', adminLogState.categories.join(',')]
    ];
    fields.forEach(([k, v]) => { if (v) p.set(k, v); });
    Object.entries(extra).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, String(v)); });
    return p.toString();
}

function syncAuditChipsUi() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('#admin-log-category-chips .audit-chip').forEach((btn) => {
        btn.setAttribute('aria-pressed', adminLogState.categories.includes(btn.getAttribute('data-cat')) ? 'true' : 'false');
    });
}

function syncAuditKpiPressedUi() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('#admin-log-kpi-grid .audit-kpi-card').forEach((btn) => {
        btn.setAttribute('aria-pressed', adminLogState.quickFilter === (btn.getAttribute('data-quick') || '') ? 'true' : 'false');
    });
}

function syncAuditInputsToDom() {
    AUDIT_INPUT_BINDINGS.forEach(([elId, key]) => {
        const el = auditById(elId);
        if (el && el.value !== adminLogState[key]) el.value = adminLogState[key] || '';
    });
    const limitEl = auditById('admin-log-limit-select');
    if (limitEl) limitEl.value = String(adminLogState.limit || 25);
    toggleAuditClass(auditById('admin-log-search-clear'), 'hidden', !adminLogState.search);
    syncAuditChipsUi();
    syncAuditKpiPressedUi();
}

function hydrateAdminLogFiltersFromUrl() {
    if (adminLogState.urlHydrated) return;
    adminLogState.urlHydrated = true;
    const qs = new URLSearchParams(typeof window !== 'undefined' ? (window.location?.search || '') : '');
    if (!['logs', '11', 'admin-logs'].includes((qs.get('tab') || '').toLowerCase())) return;
    if (qs.get('log_page')) adminLogState.page = Math.max(1, Number(qs.get('log_page')) || 1);
    const lim = Number(qs.get('log_limit'));
    if ([10, 25, 50, 100].includes(lim)) adminLogState.limit = lim;
    [['log_staff', 'staffId'], ['log_action', 'actionType'], ['log_group', 'dataGroup'], ['log_from', 'fromDate'],
        ['log_to', 'toDate'], ['log_q', 'search'], ['log_quick', 'quickFilter']].forEach(([q, k]) => {
        if (qs.get(q)) adminLogState[k] = qs.get(q);
    });
    if (qs.get('log_cats')) {
        adminLogState.categories = qs.get('log_cats').split(',').map((c) => c.trim().toUpperCase()).filter((c) => Boolean(ADMIN_LOG_CATEGORIES[c]));
    }
    syncAuditInputsToDom();
}

function syncAdminLogUrlParams() {
    if (typeof window === 'undefined' || !window.location || !window.history?.replaceState) return;
    const qs = new URLSearchParams(window.location.search || '');
    if (!['logs', '11', 'admin-logs'].includes((qs.get('tab') || '').toLowerCase())) return;
    [['log_page', adminLogState.page > 1 ? String(adminLogState.page) : ''],
        ['log_limit', adminLogState.limit !== 25 ? String(adminLogState.limit) : ''],
        ['log_staff', adminLogState.staffId], ['log_action', adminLogState.actionType],
        ['log_group', adminLogState.dataGroup], ['log_from', adminLogState.fromDate],
        ['log_to', adminLogState.toDate], ['log_q', adminLogState.search],
        ['log_quick', adminLogState.quickFilter], ['log_cats', adminLogState.categories.join(',')]
    ].forEach(([k, v]) => (v ? qs.set(k, v) : qs.delete(k)));
    window.history.replaceState(null, '', `${window.location.pathname || ''}?${qs.toString()}`);
}

function populateAuditFilterOptions(staffList = [], actionTypes = []) {
    const staffEl = auditById('admin-log-filter-staff');
    if (staffEl) {
        let html = '<option value="">Tất cả nhân sự</option>';
        staffList.forEach((s) => {
            const lbl = s.full_name ? `${s.full_name} (${s.username || s.id})` : (s.username || `ID #${s.id}`);
            html += `<option value="${auditEsc(s.id)}">${auditEsc(lbl)}</option>`;
        });
        staffEl.innerHTML = html;
        staffEl.value = adminLogState.staffId || '';
    }
    const actionEl = auditById('admin-log-filter-action');
    if (actionEl) {
        const allCodes = Array.from(new Set([...Object.keys(ADMIN_LOG_CATALOG.actions), ...(actionTypes || [])])).filter(Boolean);
        const byCat = { TD: [], XH: [], CN: [], CB: [], TQ: [], TT: [] };
        const seenCanon = new Set();
        const seenCatLabel = new Set();
        allCodes.forEach((rawCode) => {
            const upper = String(rawCode).trim().toUpperCase();
            const code = ADMIN_LOG_ACTION_ALIASES[upper] || rawCode;
            if (seenCanon.has(code)) return;
            seenCanon.add(code);
            const meta = resolveActionMeta(code);
            const dedupKey = `${meta.category}:${meta.label}`;
            if (seenCatLabel.has(dedupKey)) return;
            seenCatLabel.add(dedupKey);
            (byCat[meta.category] || byCat.CN).push({ code, label: meta.label });
        });
        const catOrder = [['TD', 'Tạo / Duyệt'], ['XH', 'Xóa / Hủy / Chi tiền'], ['CN', 'Cập nhật'],
            ['CB', 'Cảnh báo'], ['TQ', 'Tiền quầy'], ['TT', 'Tự động']];
        let html = '<option value="">Tất cả loại hành động</option>';
        catOrder.forEach(([code, title]) => {
            const shortCode = ADMIN_LOG_CATEGORIES[code]?.shortCode || code;
            const items = byCat[code] || [];
            html += `<optgroup label="${auditEsc(`${shortCode} – ${title}`)}"><option value="__cat__:${auditEsc(code)}">${auditEsc(`Tất cả nhóm ${title}`)}</option>`;
            items.forEach((it) => {
                html += `<option value="${auditEsc(it.code)}">${auditEsc(it.label)}</option>`;
            });
            html += '</optgroup>';
        });
        actionEl.innerHTML = html;
        const selectedCanon = ADMIN_LOG_ACTION_ALIASES[String(adminLogState.actionType || '').toUpperCase()] || adminLogState.actionType || '';
        actionEl.value = selectedCanon;
    }
    const dgEl = auditById('admin-log-filter-datagroup');
    if (dgEl) dgEl.value = adminLogState.dataGroup || '';
}

function renderAdminLogKpi(data = {}) {
    const unrev = Number(data.unreviewed_anomalies || 0);
    const totalEl = auditById('audit-kpi-total-val');
    const totalSub = auditById('audit-kpi-total-sub');
    const anomEl = auditById('audit-kpi-anomaly-val');
    const finEl = auditById('audit-kpi-finance-val');
    const shiftEl = auditById('audit-kpi-shifts-val');
    const shiftSub = auditById('audit-kpi-shifts-sub');
    if (totalEl) totalEl.textContent = String(data.total_actions ?? 0);
    if (totalSub) totalSub.textContent = data.period?.is_today ? 'Hôm nay (theo giờ VN)' : 'Theo bộ lọc đang chọn';
    if (anomEl) anomEl.textContent = String(unrev);
    toggleAuditClass(auditById('audit-kpi-anomaly'), 'is-alert-red', unrev > 0);
    if (finEl) finEl.textContent = String(data.finance_cash_count ?? 0);
    if (shiftEl) shiftEl.textContent = String(data.shift_count ?? 0);
    if (shiftSub) {
        const st = data.latest_shift_status || {};
        shiftSub.textContent = st.text || 'Chưa có ca trực trong kỳ';
        toggleAuditClass(shiftSub, 'audit-kpi-sub-red', st.level === 'danger' || st.level === 'warning');
    }
    syncAuditKpiPressedUi();
}

async function loadAdminLogSummary() {
    if (adminLogState.summaryAbort) adminLogState.summaryAbort.abort();
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    adminLogState.summaryAbort = ctrl;
    try {
        const qs = buildAuditFilterParams(1, { action: 'audit_summary' });
        const json = await auditApiRequest(`api/admin.php?${qs}`, { signal: ctrl?.signal });
        renderAdminLogKpi(json.data || {});
    } catch (err) {
        if (err?.name !== 'AbortError') showAuditToast(err.message || 'Không tải được thống kê nhật ký.', 'error');
    }
}

const maybeUnmaskDisplay = (text, row) => (adminLogState.revealedMap[row.id] ? String(text ?? '') : maskAuditPhone(text ?? ''));
const isBadDiffValue = (d) => (String(d.field || '').toLowerCase() === 'discrepancy_amount' && !/^0+(?:\.0+)?\s*đ?$/.test(String(d.new ?? '').trim())) || /tắt 2fa|khóa|blacklist|-\d/i.test(String(d.new ?? ''));

function renderAuditDiffBlock(row) {
    const id = Number(row.id);
    const diffs = Array.isArray(row.diffs) ? row.diffs : [];
    const exp = Boolean(adminLogState.expandedDiffs[id]);
    const vis = exp ? diffs : diffs.slice(0, 2);
    let html = '';
    if (vis.length > 0) {
        vis.forEach((d) => {
            const lbl = auditEsc(d.label || ADMIN_LOG_CATALOG.fieldLabels[d.field] || d.field || 'Thay đổi');
            const oldVal = d.old !== null && d.old !== undefined && String(d.old) !== '' ? maybeUnmaskDisplay(d.old, row) : '';
            const newVal = maybeUnmaskDisplay(d.new ?? '', row);
            html += `<div><span class="audit-k">${lbl}:</span> ${oldVal ? `<s>${auditEsc(oldVal)}</s> → ` : ''}<b${isBadDiffValue(d) ? ' class="bad"' : ''}>${auditEsc(newVal)}</b></div>`;
        });
        if (diffs.length > 2) html += `<button type="button" class="audit-more" onclick="toggleAuditDiffExpand(${id})">${exp ? 'Thu gọn thay đổi' : `+${diffs.length - 2} thay đổi nữa`}</button>`;
    } else {
        html += `<div class="audit-k">${auditEsc(maybeUnmaskDisplay(row.formatted_message || 'Thao tác hệ thống', row))}</div>`;
    }
    if (row.is_anomaly && Array.isArray(row.anomaly_reasons) && row.anomaly_reasons.length > 0) {
        html += `<div style="margin-top:4px;font-size:11.5px;color:var(--r)">⚠ ${auditEsc(row.anomaly_reasons.join(' · '))}</div>`;
    }
    return html;
}

function renderAuditReviewSection(row) {
    const id = Number(row.id);
    if (row.review) {
        const tm = row.review.created_at_formatted ? ` · ${auditEsc(row.review.created_at_formatted)}` : '';
        return `<div class="audit-review-wrap"><span class="audit-reviewed-badge">✓ Đã hậu kiểm</span><span class="audit-review-note"><b>${auditEsc(row.review.reviewer_name || 'Chủ sân')}</b>${tm}: ${auditEsc(row.review.note || '')}</span></div>`;
    }
    if (!row.is_anomaly && adminLogState.openReviewId !== id) return '';
    const isOpen = adminLogState.openReviewId === id;
    let html = `<div class="audit-review-wrap"><button type="button" class="audit-review-btn" onclick="toggleAuditReviewForm(${id})">${isOpen ? 'Đóng hậu kiểm' : 'Hậu kiểm ngay'}</button></div>`;
    if (isOpen) {
        html += `<div id="audit-review-form-${id}" class="audit-review-form"><input type="text" id="audit-review-input-${id}" class="audit-review-input" placeholder="Nhập lý do hậu kiểm (>= 10 ký tự)..." aria-label="Ghi chú hậu kiểm"><button type="button" id="audit-review-submit-${id}" class="audit-btn is-primary" onclick="submitAuditReview(${id})">Lưu hậu kiểm</button></div>`;
    }
    return html;
}

function renderAuditDetailDrawer(row) {
    const id = Number(row.id);
    if (!adminLogState.expandedJson[id]) return '';
    const rev = adminLogState.revealedMap[id] || row;
    const fmtRaw = (v) => (v ? maybeUnmaskDisplay(typeof v === 'string' ? v : JSON.stringify(v, null, 2), row) : '—');
    return `<div class="audit-detail-drawer"><div><b>IP:</b> ${auditEsc(row.ip || '—')} · <b>Thời gian VN:</b> ${auditEsc(formatAuditDateTime(row.created_at))}</div>` +
        `<div style="margin-top:4px"><b>Dữ liệu trước:</b><pre class="audit-detail-pre">${auditEsc(fmtRaw(rev.old_value))}</pre></div>` +
        `<div style="margin-top:4px"><b>Dữ liệu sau:</b><pre class="audit-detail-pre">${auditEsc(fmtRaw(rev.new_value))}</pre></div></div>`;
}

function renderAdminLogRows() {
    const tbody = auditById('admin-log-tbody');
    toggleAuditClass(auditById('admin-log-loading'), 'hidden', true);
    toggleAuditClass(auditById('admin-log-error'), 'hidden', true);
    const logs = Array.isArray(adminLogState.logs) ? adminLogState.logs : [];
    if (logs.length === 0) {
        if (tbody) tbody.innerHTML = '';
        toggleAuditClass(auditById('admin-log-table-container'), 'hidden', true);
        toggleAuditClass(auditById('admin-log-empty'), 'hidden', false);
        renderAdminLogPagination();
        return;
    }
    toggleAuditClass(auditById('admin-log-empty'), 'hidden', true);
    toggleAuditClass(auditById('admin-log-table-container'), 'hidden', false);

    let html = '';
    let lastKey = '';
    logs.forEach((row) => {
        const id = Number(row.id);
        const meta = resolveActionMeta(row.action, row);
        const role = resolveActorRoleInfo(row);
        const key = getAuditDateKey(row.created_at);
        if (key && key !== lastKey) {
            html += `<div class="audit-day">${auditEsc(formatAuditDayDivider(key))}</div>`;
            lastKey = key;
        }
        const rev = adminLogState.revealedMap[id];
        const objRaw = rev?.object_display || rev?.object_code || (rev ? row.object_code : row.object_display) || row.object_code || '—';
        const btn = (row.has_sensitive_phone && !rev)
            ? `<button type="button" class="audit-more" onclick="revealAuditSensitive(${id})">Xem chi tiết</button>`
            : `<button type="button" class="audit-more" onclick="toggleAuditJsonDetail(${id})">${adminLogState.expandedJson[id] ? 'Ẩn chi tiết' : 'Chi tiết'}</button>`;
        const anomBadge = row.is_anomaly ? `<span class="audit-anomaly-pill" title="${auditEsc((row.anomaly_reasons || []).join('; '))}">⚠ Bất thường</span>` : '';
        const catBadgeCls = `t-${meta.category}`;
        html += `<div class="audit-row${row.is_anomaly ? ' is-anomaly-row' : ''}" data-log-id="${id}">` +
            `<div><span class="audit-id">#${id}</span><b class="audit-actor-name">${auditEsc(row.actor_name || 'Hệ thống')}</b><span class="audit-s"><span class="audit-role ${role.cls}">${auditEsc(role.label)}</span></span></div>` +
            `<div><span class="audit-badge ${auditEsc(catBadgeCls)}">${auditEsc(meta.label)}</span>${anomBadge}<span class="audit-s">${auditEsc(meta.dataGroup)}</span></div>` +
            `<div><span class="audit-code">${auditEsc(objRaw)}</span><span class="audit-s">${auditEsc(resolveObjectTypeLabel(row, meta))}</span>${btn}</div>` +
            `<div class="audit-chg">${renderAuditDiffBlock(row)}${renderAuditReviewSection(row)}${renderAuditDetailDrawer(row)}</div>` +
            `<div class="audit-tm" title="${auditEsc(formatAuditDateTime(row.created_at))}"><b>${auditEsc(formatAuditClockTime(row.created_at))}</b><span class="audit-s">${auditEsc(formatAuditRelativeTime(row.created_at))}</span></div></div>`;
    });
    if (tbody) tbody.innerHTML = html;
    renderAdminLogPagination();
}

function renderAdminLogPagination() {
    const total = Number(adminLogState.total || 0);
    const page = Number(adminLogState.page || 1);
    const limit = Number(adminLogState.limit || 25);
    const totalPages = Math.max(1, Number(adminLogState.totalPages || 1));
    const start = total === 0 ? 0 : (page - 1) * limit + 1;
    const end = total === 0 ? 0 : Math.min(total, page * limit);
    if (auditById('admin-log-range-summary')) auditById('admin-log-range-summary').textContent = `Hiển thị ${start}–${end} / ${total} bản ghi`;
    if (auditById('admin-log-page-current')) auditById('admin-log-page-current').textContent = String(page);
    if (auditById('admin-log-page-total')) auditById('admin-log-page-total').textContent = String(totalPages);
    if (auditById('admin-log-total-count')) auditById('admin-log-total-count').textContent = String(total);
    if (auditById('admin-log-prev-btn')) auditById('admin-log-prev-btn').disabled = page <= 1;
    if (auditById('admin-log-next-btn')) auditById('admin-log-next-btn').disabled = page >= totalPages;
    const numsEl = auditById('admin-log-page-numbers');
    if (numsEl) {
        let pHtml = '';
        for (let p = Math.max(1, page - 2); p <= Math.min(totalPages, page + 2); p++) {
            pHtml += `<button type="button" class="audit-page-num${p === page ? ' is-active' : ''}" onclick="goToAdminLogPage(${p})">${p}</button>`;
        }
        numsEl.innerHTML = pHtml;
    }
}

function bindAuditFilterInputs() {
    if (typeof document === 'undefined') return;
    AUDIT_INPUT_BINDINGS.forEach(([elId, key]) => {
        const el = auditById(elId);
        if (!el || el.dataset?.auditBound === '1' || typeof el.addEventListener !== 'function') return;
        if (el.dataset) el.dataset.auditBound = '1';
        el.addEventListener(elId === 'admin-log-search' ? 'input' : 'change', () => {
            adminLogState[key] = el.value || '';
            if (elId === 'admin-log-search') {
                toggleAuditClass(auditById('admin-log-search-clear'), 'hidden', !adminLogState.search);
                clearTimeout(adminLogState.searchTimer);
                adminLogState.searchTimer = setTimeout(() => loadAdminLogs(1), 280);
            } else loadAdminLogs(1);
        });
    });
    const clrBtn = auditById('admin-log-search-clear');
    if (clrBtn && clrBtn.dataset?.auditBound !== '1' && typeof clrBtn.addEventListener === 'function') {
        if (clrBtn.dataset) clrBtn.dataset.auditBound = '1';
        clrBtn.addEventListener('click', () => {
            adminLogState.search = '';
            if (auditById('admin-log-search')) auditById('admin-log-search').value = '';
            toggleAuditClass(clrBtn, 'hidden', true);
            loadAdminLogs(1);
        });
    }
}

function startAdminLogPolling() {
    if (adminLogState.pollTimer) return;
    adminLogState.pollTimer = setInterval(async () => {
        if ((typeof document !== 'undefined' && document.hidden) || auditById('tab-content-logs')?.classList?.contains('hidden') || Number(adminLogState.latestId || 0) <= 0) return;
        try {
            const json = await auditApiRequest(`api/admin.php?action=audit_check_new&since_id=${adminLogState.latestId}`);
            const cnt = Number(json.data?.new_count || 0);
            if (cnt > 0) {
                if (auditById('admin-log-new-banner-text')) auditById('admin-log-new-banner-text').textContent = `Có ${cnt} bản ghi nhật ký mới phát sinh.`;
                toggleAuditClass(auditById('admin-log-new-banner'), 'hidden', false);
            }
        } catch (_err) { /* silent background poll */ }
    }, 60000);
}

async function loadAdminLogs(page = 1) {
    hydrateAdminLogFiltersFromUrl();
    bindAuditFilterInputs();
    if (!adminLogState.pluginsReady && typeof window !== 'undefined' && typeof window.SanBongDatePicker?.init === 'function') {
        adminLogState.pluginsReady = true;
        window.SanBongDatePicker.init();
    }
    startAdminLogPolling();
    adminLogState.page = Math.max(1, Number(page) || 1);
    syncAuditInputsToDom();
    syncAdminLogUrlParams();
    toggleAuditClass(auditById('admin-log-new-banner'), 'hidden', true);
    if (adminLogState.listAbort) adminLogState.listAbort.abort();
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    adminLogState.listAbort = ctrl;
    toggleAuditClass(auditById('admin-log-error'), 'hidden', true);
    toggleAuditClass(auditById('admin-log-empty'), 'hidden', true);
    if (adminLogState.logs.length === 0) toggleAuditClass(auditById('admin-log-loading'), 'hidden', false);

    const summaryPromise = loadAdminLogSummary();
    try {
        const qs = buildAuditFilterParams(adminLogState.page, { action: 'audit_logs' });
        const json = await auditApiRequest(`api/admin.php?${qs}`, { signal: ctrl?.signal });
        const data = json.data || {};
        adminLogState.logs = Array.isArray(data.logs) ? data.logs : [];
        adminLogState.total = Number(data.pagination?.total ?? adminLogState.logs.length);
        adminLogState.totalPages = Math.max(1, Number(data.pagination?.totalPages ?? 1));
        if (!adminLogState.limit && data.pagination?.limit) adminLogState.limit = Number(data.pagination.limit);
        if (data.latest_id) adminLogState.latestId = Math.max(adminLogState.latestId || 0, Number(data.latest_id));
        populateAuditFilterOptions(data.staffList || [], data.actionTypes || []);
        const updEl = auditById('admin-log-updated-at');
        if (updEl) { const p = getVnDateParts(new Date()); updEl.textContent = `Cập nhật ${p.hour}:${p.minute}`; }
        renderAdminLogRows();
    } catch (err) {
        if (err?.name !== 'AbortError') {
            toggleAuditClass(auditById('admin-log-loading'), 'hidden', true);
            toggleAuditClass(auditById('admin-log-table-container'), 'hidden', true);
            if (auditById('admin-log-error-msg')) auditById('admin-log-error-msg').textContent = err.message || 'Không tải được dữ liệu nhật ký.';
            toggleAuditClass(auditById('admin-log-error'), 'hidden', false);
        }
    }
    await summaryPromise;
}

function toggleAuditCategoryChip(cat) {
    if (!ADMIN_LOG_CATEGORIES[cat]) return;
    const i = adminLogState.categories.indexOf(cat);
    if (i >= 0) adminLogState.categories.splice(i, 1); else adminLogState.categories.push(cat);
    syncAuditChipsUi();
    return loadAdminLogs(1);
}

function handleAuditKpiClick(quickKey) {
    adminLogState.quickFilter = adminLogState.quickFilter === quickKey ? '' : (quickKey || '');
    syncAuditKpiPressedUi();
    return loadAdminLogs(1);
}

function resetAdminLogFilters() {
    Object.assign(adminLogState, { staffId: '', actionType: '', dataGroup: '', fromDate: '', toDate: '', search: '', quickFilter: '', categories: [] });
    syncAuditInputsToDom();
    return loadAdminLogs(1);
}

function handleAdminLogLimitChange(val) {
    const num = Number(val);
    adminLogState.limit = [10, 25, 50, 100].includes(num) ? num : 25;
    return loadAdminLogs(1);
}

const prevAdminLogPage = () => (adminLogState.page > 1 ? loadAdminLogs(adminLogState.page - 1) : undefined);
const nextAdminLogPage = () => (adminLogState.page < adminLogState.totalPages ? loadAdminLogs(adminLogState.page + 1) : undefined);
const goToAdminLogPage = (p) => loadAdminLogs(Math.max(1, Math.min(adminLogState.totalPages || 1, Number(p) || 1)));
const toggleAuditDiffExpand = (logId) => { adminLogState.expandedDiffs[Number(logId)] = !adminLogState.expandedDiffs[Number(logId)]; renderAdminLogRows(); };
const toggleAuditJsonDetail = (logId) => { adminLogState.expandedJson[Number(logId)] = !adminLogState.expandedJson[Number(logId)]; renderAdminLogRows(); };
const toggleAuditReviewForm = (logId) => { const id = Number(logId); adminLogState.openReviewId = adminLogState.openReviewId === id ? null : id; renderAdminLogRows(); };

function exportAdminLogsCsv() {
    const qs = buildAuditFilterParams(1, { action: 'audit_export_csv' });
    if (typeof window !== 'undefined' && typeof window.open === 'function') window.open(normalizeLogApiUrl(`api/admin.php?${qs}`), '_blank', 'noopener');
}

async function revealAuditSensitive(logId) {
    const id = Number(logId);
    try {
        const json = await auditApiRequest(`api/admin.php?action=audit_log_detail&id=${id}&reveal=1`);
        if (json.data) adminLogState.revealedMap[id] = json.data;
        adminLogState.expandedJson[id] = true;
        renderAdminLogRows();
    } catch (err) {
        showAuditToast(err.message || 'Không thể mở chi tiết dữ liệu nhạy cảm.', 'error');
    }
}

async function submitAuditReview(logId) {
    const id = Number(logId);
    const input = auditById(`audit-review-input-${id}`);
    const submitBtn = auditById(`audit-review-submit-${id}`);
    const check = validateAuditReasonClient(input?.value || '');
    if (!check.valid) return showAuditToast(check.error, 'error');
    if (submitBtn) submitBtn.disabled = true;
    try {
        const json = await auditApiRequest('api/admin.php?action=audit_review', { method: 'POST', body: { log_id: id, note: check.clean } });
        const target = adminLogState.logs.find((r) => Number(r.id) === id);
        if (target) target.review = json.data || { reviewer_name: 'Chủ sân', note: check.clean };
        adminLogState.openReviewId = null;
        renderAdminLogRows();
        showAuditToast('Đã lưu ghi chú hậu kiểm.', 'success');
        await loadAdminLogSummary();
    } catch (err) {
        showAuditToast(err.message || 'Lưu hậu kiểm thất bại.', 'error');
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

if (typeof window !== 'undefined') {
    Object.assign(window, {
        ADMIN_LOG_CATEGORIES, ADMIN_LOG_DATA_GROUPS, ADMIN_LOG_CATALOG, adminLogState,
        validateAuditReasonClient, resolveActionMeta, loadAdminLogs, toggleAuditCategoryChip,
        handleAuditKpiClick, resetAdminLogFilters, handleAdminLogLimitChange,
        prevAdminLogPage, nextAdminLogPage, goToAdminLogPage, exportAdminLogsCsv,
        toggleAuditDiffExpand, toggleAuditJsonDetail, revealAuditSensitive,
        toggleAuditReviewForm, submitAuditReview, auditApiRequest
    });
}

