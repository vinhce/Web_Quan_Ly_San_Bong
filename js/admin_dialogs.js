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
