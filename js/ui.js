
(function () {
  'use strict';

  const escapeHTML = (str) => (window.SanBongHelpers ? window.SanBongHelpers.escapeHTML(str) : String(str || ''));
  const getRelativePath = (t) => (window.SanBongHelpers ? window.SanBongHelpers.getRelativePath(t) : t);
  const Icons = (window.SanBongHelpers && window.SanBongHelpers.Icons) ? window.SanBongHelpers.Icons : {};

function handleLogout() {
    const doLogout = async () => {
      try {
        const headers = window.SanBongHelpers?.getAuthFetchHeaders
          ? window.SanBongHelpers.getAuthFetchHeaders()
          : { 'Content-Type': 'application/json' };
        if (!headers['X-CSRF-Token'] && (sessionStorage.getItem('sb_current_user') || localStorage.getItem('sb_current_user'))) {
          const meRes = await fetch(getRelativePath('api/auth.php?action=me'), { cache: 'no-store' });
          const meJson = await meRes.json().catch(() => null);
          if (meJson?.csrf_token) {
            headers['X-CSRF-Token'] = meJson.csrf_token;
          }
        }
        await fetch(getRelativePath('api/auth.php?action=logout'), {
          method: 'POST',
          headers,
          body: JSON.stringify({})
        });
      } catch (e) {}

      sessionStorage.removeItem('sb_current_user');
      try {
        localStorage.removeItem('sb_current_user');
        localStorage.removeItem('sb_user_v1');
      } catch (e) {}
      if (window.SanBongHelpers?.clearCsrfToken) window.SanBongHelpers.clearCsrfToken();
      window.location.href = getRelativePath('');
    };

    if (showModal) {
      showModal({
        title: 'Đăng xuất tài khoản',
        message: 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?',
        type: 'danger',
        confirmVariant: 'danger',
        confirmText: 'Đăng xuất',
        cancelText: 'Ở lại',
        onConfirm: doLogout
      });
    } else {
      doLogout();
    }
  }

  function renderNavbar(activePage = 'Trang chủ') {
    let currentUser = null;
    try {
      currentUser = JSON.parse(sessionStorage.getItem('sb_current_user') || 'null');
      if (!currentUser) {
        currentUser = JSON.parse(localStorage.getItem('sb_current_user') || 'null');
        if (currentUser) {
          try { sessionStorage.setItem('sb_current_user', JSON.stringify(currentUser)); } catch (e) {}
        }
      }
    } catch(e) {}

    const sysCfg = (window.SanBongDB && typeof window.SanBongDB.getSystemConfig === 'function')
      ? window.SanBongDB.getSystemConfig()
      : null;
    const showMatchmaking = !sysCfg || sysCfg.matchmakingEnabled !== false;

    const navItems = [
      { label: 'Trang chủ', href: getRelativePath('') },
      { label: 'Danh sách sân', href: getRelativePath('fields') },
      { label: 'Đặt sân nhanh', href: getRelativePath('booking') },
      ...(showMatchmaking ? [{ label: 'Tìm đối / Ghép kèo', href: getRelativePath('matchmaking') }] : []),
      ...(currentUser ? [{ label: 'Lịch sử & Hội viên', href: getRelativePath('history') }] : [])
    ];

    if (currentUser && currentUser.role === 'admin') {
      navItems.push({ label: '🛡️ Quản trị Portal', href: getRelativePath('portal-admin/') });
    } else if (currentUser && currentUser.role === 'manager') {
      navItems.push({ label: '🛡️ Quản lý Sân', href: getRelativePath('portal-admin/') });
    } else if (currentUser && currentUser.role === 'staff') {
      navItems.push({ label: '🏟️ Cổng Trực Sân', href: getRelativePath('portal-admin/') });
    }

    let authSectionHtml = '';
    const userDisplayName = currentUser ? (currentUser.full_name || currentUser.name || currentUser.username) : '';
    if (currentUser && userDisplayName) {
      const isAdmin = currentUser.role === 'admin';
      const isManager = currentUser.role === 'manager';
      const isStaff = currentUser.role === 'staff';
      const user = {
        name: userDisplayName,
        full_name: userDisplayName,
        avatar: userDisplayName.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase() || 'VIP',
        tier: isAdmin ? 'Quản trị viên' : (isManager ? 'Quản lý sân' : (isStaff ? 'Nhân viên trực sân' : (currentUser.tier || 'Hội viên'))),
        points: Number(currentUser.points) || 0
      };
      const userSubline = (isStaff || isManager) ? escapeHTML(user.tier) : `${escapeHTML(user.tier)} • ${user.points}đ`;

      authSectionHtml = `
      <div class="flex items-center gap-3 sm:gap-4">
        <a href="${getRelativePath('history')}" class="w-10 h-10 rounded-full border border-[#E2E8F0] flex items-center justify-center relative text-[#475569] hover:bg-[#F8FAFC] transition-colors" title="Lịch sử đặt sân & Hội viên">
          ${Icons.bell}
        </a>

        <div id="user-menu-container" class="relative group">
          <button id="user-menu-btn" aria-expanded="false" class="flex items-center gap-2 pl-2 py-1 pr-3 rounded-full hover:bg-[#F1F5F9] transition-colors border border-transparent hover:border-[#E2E8F0] text-left">
            <div class="w-9 h-9 rounded-full bg-[#DCFCE7] text-[#16A34A] font-heading font-bold text-sm flex items-center justify-center">
              ${escapeHTML(user.avatar || 'VIP')}
            </div>
            <div class="hidden sm:block">
              <div class="text-[14px] font-semibold text-[#0F172A] leading-tight">${escapeHTML(user.name)}</div>
              <div class="text-[11px] text-[#16A34A] font-medium">${userSubline}</div>
            </div>
            <svg class="w-4 h-4 text-[#94A3B8] ml-0.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
          </button>

          <!-- Dropdown menu -->
          <div id="user-dropdown-menu" class="absolute right-0 top-full pt-2 w-56 hidden group-hover:block z-50 transition-all before:content-[''] before:absolute before:-top-3 before:left-0 before:right-0 before:h-3">
            <div class="w-full bg-white rounded-xl shadow-xl border border-[#E2E8F0] py-2">
              <div class="px-4 py-2 border-b border-[#F1F5F9]">
                <div class="text-xs font-bold text-[#0F172A] truncate">${escapeHTML(user.name)}</div>
                <div class="text-[11px] text-[#64748B] truncate">${escapeHTML(currentUser.phone || currentUser.email || '')}</div>
              </div>
              <a href="${getRelativePath('history')}" class="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] hover:text-[#16A34A]">
                <span>📋 Lịch sử đặt sân & Hội viên</span>
              </a>
              ${isAdmin ? `
              <a href="${getRelativePath('portal-admin/')}" class="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-[#16A34A] hover:bg-[#DCFCE7]/50">
                <span>🛡️ Bảng điều khiển Quản trị</span>
              </a>` : (isManager ? `
              <a href="${getRelativePath('portal-admin/')}" class="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-[#7C3AED] hover:bg-purple-50">
                <span>🛡️ Quản lý Sân</span>
              </a>` : (isStaff ? `
              <a href="${getRelativePath('portal-admin/')}" class="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-[#2563EB] hover:bg-blue-50">
                <span>🏟️ Cổng Trực Sân</span>
              </a>` : ''))}
              <button onclick="window.SanBongApp.handleLogout()" class="w-full text-left flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#DC2626] hover:bg-rose-50 border-t border-[#F1F5F9]">
                <span>🚪 Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>
      </div>`;
    } else {
      authSectionHtml = `
      <div class="flex items-center gap-2 sm:gap-3">
        <a href="${getRelativePath('login')}" class="h-9 px-3.5 sm:px-4 rounded-lg flex items-center justify-center text-xs font-bold text-[#16A34A] border border-[#16A34A] hover:bg-[#DCFCE7]/60 transition-all">
          Đăng nhập
        </a>
        <a href="${getRelativePath('login')}?tab=register" class="h-9 px-3.5 sm:px-4 rounded-lg flex items-center justify-center text-xs font-bold bg-[#16A34A] text-white hover:bg-[#15803D] shadow-sm transition-all">
          Đăng ký
        </a>
      </div>`;
    }

    return `
    <header class="w-full h-[72px] bg-white border-b border-[#E2E8F0] px-4 md:px-10 flex items-center justify-between sticky top-0 z-50 shadow-sm">
      <div class="flex items-center gap-6 lg:gap-10">
        <a href="${getRelativePath('')}" class="flex items-center gap-3 group">
          <div class="w-10 h-10 rounded-[10px] bg-[#16A34A] text-white flex items-center justify-center shadow-md group-hover:bg-[#15803D] transition-all">
            ${Icons.ball}
          </div>
          <div>
            <span class="font-heading font-extrabold text-[20px] text-[#0F172A] tracking-tight">Sân Bóng Pro</span>
            <span class="block text-[10px] font-medium text-[#16A34A] uppercase tracking-wider -mt-1">Hệ thống sân đỉnh cao</span>
          </div>
        </a>

        <nav class="hidden md:flex items-center gap-6 lg:gap-8 h-[72px]">
          ${navItems.map(item => {
            const isAct = item.label === activePage;
            return `
            <a href="${item.href}" class="h-full flex items-center relative text-[14px] font-medium transition-colors ${
              isAct ? 'text-[#16A34A] font-semibold' : 'text-[#475569] hover:text-[#0F172A]'
            }">
              <span>${escapeHTML(item.label)}</span>
              ${isAct ? `<span class="absolute bottom-0 left-0 right-0 h-[3px] bg-[#16A34A] rounded-t-full"></span>` : ''}
            </a>`;
          }).join('')}
        </nav>
      </div>

      ${authSectionHtml}
    </header>`;
  }

  function renderFooter() {
    return `
    <footer class="w-full bg-[#0F172A] text-white pt-14 pb-8 border-t border-[#1E293B]">
      <div class="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-[10px] bg-[#16A34A] text-white flex items-center justify-center">
              ${Icons.ball}
            </div>
            <span class="font-heading font-bold text-[20px] text-white">Sân Bóng Pro</span>
          </div>
          <p class="text-[13px] text-[#94A3B8] leading-relaxed">
            Hệ thống đặt sân bóng đá tự động, chuẩn hóa giao diện trực quan với mặt cỏ chuẩn FIFA và dịch vụ trận đấu trọn gói.
          </p>
          <div class="flex items-center gap-3 text-[#94A3B8] text-[13px]">
            ${Icons.phone}
            <a href="tel:0352313548" class="hover:text-emerald-400 font-bold transition-colors">Hotline: 0352 313 548 (24/7)</a>
          </div>
        </div>

        <div>
          <h4 class="font-heading font-semibold text-[15px] mb-4 text-[#F8FAFC]">Hệ Thống Sân</h4>
          <ul class="space-y-2.5 text-[13px] text-[#94A3B8]">
            <li><a href="${getRelativePath('fields')}" class="hover:text-white transition-colors">Sân 5 người tiêu chuẩn</a></li>
            <li><a href="${getRelativePath('fields')}" class="hover:text-white transition-colors">Sân 7 người trung tâm</a></li>
            <li><a href="${getRelativePath('fields')}" class="hover:text-white transition-colors">Sân 11 người ghép chuẩn VFF</a></li>
            <li><a href="${getRelativePath('booking')}" class="hover:text-white transition-colors">Bảng giá & Giờ cao điểm</a></li>
          </ul>
        </div>

        <div>
          <h4 class="font-heading font-semibold text-[15px] mb-4 text-[#F8FAFC]">Dịch Vụ Đi Kèm</h4>
          <ul class="space-y-2.5 text-[13px] text-[#94A3B8]">
            <li>Áo bib phân đội dạ quang</li>
            <li>Nước giải khát Aquafina & Revive</li>
            <li>Trọng tài chuyên nghiệp bắt giải</li>
            <li>Thuê bóng thi đấu Động Lực</li>
          </ul>
        </div>

        <div>
          <h4 class="font-heading font-semibold text-[15px] mb-4 text-[#F8FAFC]">Địa Chỉ Liên Hệ</h4>
          <p class="text-[13px] text-[#94A3B8] leading-relaxed mb-3">
            Khu liên hợp Thể thao Pro, Số 18 Đường Lê Đức Thọ, Phường Mỹ Đình, Quận Nam Từ Liêm, TP. Hà Nội.
          </p>
          <div class="p-3 rounded-lg bg-[#1E293B] border border-[#334155] text-xs text-[#CBD5E1] flex items-center gap-2">
            <span class="relative flex h-2.5 w-2.5 shrink-0">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span class="text-emerald-400 font-semibold">Đang mở cửa:</span>
            <span>24/24</span>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 md:px-8 pt-6 border-t border-[#1E293B] flex flex-col sm:flex-row items-center justify-between text-[12px] text-[#64748B] gap-4">
        <div>© 2026 Sân Bóng Pro. Bản quyền hệ thống đặt sân hiện đại.</div>
        <div class="flex items-center gap-6">
          <button type="button" id="footer-btn-terms" class="hover:text-white transition-colors cursor-pointer text-left bg-transparent border-none p-0 text-[12px] text-[#94A3B8]">Điều khoản sử dụng</button>
          <button type="button" id="footer-btn-privacy" class="hover:text-white transition-colors cursor-pointer text-left bg-transparent border-none p-0 text-[12px] text-[#94A3B8]">Chính sách bảo mật (NĐ 13/2023)</button>
        </div>
      </div>

      <!-- FLOATING QUICK ACTIONS (ZALO & HOTLINE) -->
      <div class="fixed right-4 bottom-5 z-40 flex flex-col gap-2.5">
        <a href="https://zalo.me/0352313548" target="_blank" rel="noopener noreferrer" class="w-12 h-12 rounded-full bg-[#0068FF] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform font-bold text-xs" title="Chat Zalo hỗ trợ 24/7">
          <span class="text-xs font-black tracking-tighter">Zalo</span>
        </a>
        <a href="tel:0352313548" class="w-12 h-12 rounded-full bg-[#16A34A] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform text-lg" title="Gọi Hotline đặt sân 0352 313 548">
          <span>📞</span>
        </a>
      </div>
    </footer>`;
  }

  function showToast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('sb-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'sb-toast-container';
      container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'pointer-events-auto transform -translate-y-2 opacity-0 transition-all duration-300 ease-out shadow-xl rounded-xl p-3.5 flex items-start gap-3 border text-xs font-semibold backdrop-blur-md';

    let icon = '';
    let styleClasses = '';

    if (type === 'success') {
      icon = '<svg class="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>';
      styleClasses = 'bg-emerald-50/95 text-emerald-900 border-emerald-300';
    } else if (type === 'error') {
      icon = '<svg class="w-4 h-4 text-rose-600 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>';
      styleClasses = 'bg-rose-50/95 text-rose-900 border-rose-300';
    } else if (type === 'warning') {
      icon = '<svg class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>';
      styleClasses = 'bg-amber-50/95 text-amber-900 border-amber-300';
    } else {
      icon = '<svg class="w-4 h-4 text-blue-600 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>';
      styleClasses = 'bg-blue-50/95 text-blue-900 border-blue-300';
    }

    toast.className += ' ' + styleClasses;
    toast.innerHTML = `
      ${icon}
      <div class="flex-1 leading-snug">${escapeHTML(message).replace(/\n/g, '<br>')}</div>
      <button type="button" class="text-slate-400 hover:text-slate-700 ml-1 text-sm font-bold leading-none select-none">&times;</button>
    `;

    const closeBtn = toast.querySelector('button');
    const removeToast = () => {
      toast.classList.add('opacity-0', '-translate-y-2');
      setTimeout(() => {
        try { toast.remove(); } catch (e) {}
      }, 300);
    };
    closeBtn.addEventListener('click', removeToast);

    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.classList.remove('opacity-0', '-translate-y-2');
      toast.classList.add('opacity-100', 'translate-y-0');
    });

    if (duration > 0) {
      setTimeout(removeToast, duration);
    }
  }

  function showModal(options = {}) {
    const {
      title = 'Thông báo',
      message = '',
      type = 'info',
      confirmText = 'Xác nhận',
      cancelText = null,
      confirmVariant = null,
      onConfirm = null,
      onCancel = null
    } = options;

    const modalId = 'sb-dialog-modal';
    const existing = document.getElementById(modalId);
    if (existing) {
      if (typeof window._sbActiveModalCleanup === 'function') {
        window._sbActiveModalCleanup();
      }
      existing.remove();
    }

    const overlay = document.createElement('div');
    overlay.id = modalId;
    overlay.className = 'fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 opacity-0 transition-opacity duration-200';

    const card = document.createElement('div');
    card.className = 'relative bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 space-y-5 transform scale-95 transition-transform duration-200';

    const isLogout = type === 'logout' || options.icon === 'logout' || (/đăng xuất/i.test(title || ''));

    let headerBadge = '';
    if (isLogout) {
      headerBadge = `
        <div class="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0 shadow-sm" aria-hidden="true">
          <svg class="w-6 h-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </div>
      `;
    } else if (type === 'error' || type === 'danger') {
      headerBadge = `
        <div class="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0 shadow-sm" aria-hidden="true">
          <svg class="w-6 h-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>
      `;
    } else if (type === 'warning') {
      headerBadge = `
        <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0 shadow-sm" aria-hidden="true">
          <svg class="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>
      `;
    } else if (type === 'success') {
      headerBadge = `
        <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 shadow-sm" aria-hidden="true">
          <svg class="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
      `;
    } else {
      headerBadge = `
        <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 shadow-sm" aria-hidden="true">
          <svg class="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
      `;
    }

    const effectiveVariant = confirmVariant || (isLogout || type === 'danger' || type === 'error' ? 'danger' : (type === 'warning' ? 'warning' : 'primary'));

    let confirmBtnClass = '';
    if (effectiveVariant === 'danger') {
      confirmBtnClass = 'bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl px-5 py-2.5 shadow-md shadow-rose-200 transition-all text-sm cursor-pointer';
    } else if (effectiveVariant === 'warning') {
      confirmBtnClass = 'bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl px-5 py-2.5 shadow-md shadow-amber-200 transition-all text-sm cursor-pointer';
    } else {
      confirmBtnClass = 'bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold rounded-xl px-5 py-2.5 shadow-md shadow-emerald-200 transition-all text-sm cursor-pointer';
    }

    const cancelBtnClass = 'border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl px-5 py-2.5 transition-all text-sm cursor-pointer';

    card.innerHTML = `
      <button type="button" id="modal-close-x" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors focus:outline-none cursor-pointer" aria-label="Đóng">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
      <div class="flex items-start gap-4">
        ${headerBadge}
        <div class="flex-1 min-w-0 pr-6">
          <h3 class="font-heading font-bold text-lg text-slate-900 tracking-tight leading-snug">${escapeHTML(title || 'Thông báo')}</h3>
          <div class="text-sm text-slate-600 leading-relaxed mt-1 whitespace-pre-line max-h-[60vh] overflow-y-auto pr-1">${escapeHTML(message || '')}</div>
        </div>
      </div>
      <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
        ${cancelText ? `<button type="button" id="modal-cancel-btn" class="${cancelBtnClass}">${escapeHTML(cancelText)}</button>` : ''}
        <button type="button" id="modal-confirm-btn" class="${confirmBtnClass}">${escapeHTML(confirmText)}</button>
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.classList.remove('opacity-0');
      overlay.classList.add('opacity-100');
      card.classList.remove('scale-95');
      card.classList.add('scale-100');
    });

    let closed = false;
    const close = (triggerCancel = true) => {
      if (closed) return;
      closed = true;

      document.removeEventListener('keydown', handleKeyDown);
      window._sbActiveModalCleanup = null;

      overlay.classList.remove('opacity-100');
      overlay.classList.add('opacity-0');
      card.classList.remove('scale-100');
      card.classList.add('scale-95');

      setTimeout(() => {
        try { overlay.remove(); } catch (e) {}
      }, 200);

      if (triggerCancel && typeof onCancel === 'function') {
        try { onCancel(); } catch (e) {}
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    window._sbActiveModalCleanup = () => {
      document.removeEventListener('keydown', handleKeyDown);
    };

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        close(true);
      }
    });

    const closeXBtn = card.querySelector('#modal-close-x');
    if (closeXBtn) {
      closeXBtn.addEventListener('click', () => close(true));
    }

    if (cancelText) {
      const cancelBtn = card.querySelector('#modal-cancel-btn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => close(true));
      }
    }

    const confirmBtn = card.querySelector('#modal-confirm-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        close(false);
        if (typeof onConfirm === 'function') {
          try { onConfirm(); } catch (e) {}
        }
      });
    }
  }

  function showPrivacyPolicyModal() {
    showModal({
      title: '🛡️ CHÍNH SÁCH BẢO VỆ DỮ LIỆU CÁ NHÂN (Nghị định 13/2023/NĐ-CP)',
      message: `1. Mục đích thu thập & xử lý dữ liệu:
Hệ thống thu thập Họ tên, Số điện thoại, Email và thông tin giao dịch nhằm:
• Xác thực lệnh đặt sân, phát hành vé điện tử QR check-in vào sân.
• Liên hệ xác nhận lịch thi đấu, hỗ trợ dời lịch hoặc xử lý hoàn cọc.
• Tích lũy điểm hội viên và nâng hạng thành viên thân thiết.
• Phòng chống gian lận đặt ảo và bảo vệ an ninh trật tự khu sân.

2. Bên kiểm soát & Bên xử lý dữ liệu:
• Hệ thống Sân Bóng Pro (Số 18 Đường Lê Đức Thọ, P. Mỹ Đình, Q. Nam Từ Liêm, TP. Hà Nội).
• Hotline liên hệ hỗ trợ: 0352 313 548.

3. Thời gian lưu trữ dữ liệu cá nhân:
Dữ liệu cá nhân được lưu trữ an toàn trong suốt thời gian người dùng duy trì tài khoản hoặc tối đa 24 tháng kể từ ngày giao dịch gần nhất, trừ khi pháp luật có quy định khác.

4. Quyền của chủ thể dữ liệu (Quý khách hàng):
Theo Điều 9 Nghị định 13/2023/NĐ-CP, Quý khách có đầy đủ quyền:
• Được biết, đồng ý hoặc không đồng ý xử lý dữ liệu cá nhân.
• Truy cập, chỉnh sửa hoặc yêu cầu cập nhật thông tin cá nhân.
• Yêu cầu xóa dữ liệu cá nhân hoặc rút lại sự đồng ý đã cung cấp.
• Khiếu nại, tố cáo hoặc phản ánh khi phát hiện vi phạm bảo mật dữ liệu.
Mọi yêu cầu thực hiện quyền vui lòng liên hệ Hotline: 0352 313 548 để được giải quyết trong vòng 72 giờ.

5. Cam kết an toàn & bảo mật:
Hệ thống áp dụng các biện pháp mã hóa đường truyền HTTPS/TLS, cơ chế phòng chống truy cập trái phép và cam kết TUYỆT ĐỐI không chia sẻ hoặc mua bán thông tin cho bên thứ ba vì mục đích thương mại.`,
      type: 'info',
      confirmText: 'Tôi đã hiểu & đồng ý'
    });
  }

  function showTermsModal() {
    showModal({
      title: '📋 ĐIỀU KHOẢN SỬ DỤNG DỊCH VỤ SÂN BÓNG PRO',
      message: `1. Quy định đặt sân & Giữ chỗ:
• Khách hàng thực hiện đặt chỗ trực tuyến qua website. Sau khi tạo lệnh, hệ thống áp dụng thời gian giữ chỗ (mặc định 15 phút) để khách thanh toán tiền cọc.
• Hết thời gian giữ chỗ nếu chưa nhận được tiền cọc, hệ thống sẽ tự động hủy đơn và nhả slot cho các đội bóng khác.

2. Chính sách cọc & Hoàn tiền:
• Tỷ lệ đặt cọc: Áp dụng từ 30% đến 100% tổng giá trị khung giờ tùy chính sách.
• Hủy trước 24 giờ so với giờ bắt đầu: Hoàn 100% tiền cọc.
• Hủy trước 4 giờ đến 24 giờ: Hỗ trợ dời lịch thi đấu hoặc hoàn cọc theo chính sách ưu đãi.
• Hủy dưới 4 giờ hoặc vắng mặt (No-Show): Không hỗ trợ hoàn cọc nhằm bù đắp chi phí vận hành và giữ sân.

3. Quy định trang thiết bị & An toàn:
• Cầu thủ sử dụng giày thi đấu chuyên dụng cho sân cỏ nhân tạo (giày đinh dăm TF hoặc đế bệt IC). Nghiêm cấm giày đinh sắt SG gây rách mặt cỏ.
• Giữ gìn vệ sinh chung, không mang chất dễ cháy nổ, đồ thủy tinh hoặc chất cấm vào khu vực sân cỏ.
• Tôn trọng đối thủ, trọng tài và thi đấu trên tinh thần thể thao văn minh, fair-play.`,
      type: 'info',
      confirmText: 'Đã hiểu'
    });
  }

  let _authMePromise = null;

  async function syncAuthMe() {
    window.SanBongApp = window.SanBongApp || {};
    _authMePromise = (async () => {
      try {
        const res = await fetch(getRelativePath('api/auth.php?action=me'), { credentials: 'same-origin', cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && data.csrf_token && window.SanBongHelpers?.setCsrfToken) {
            window.SanBongHelpers.setCsrfToken(data.csrf_token);
          }
          if (data && data.turnstile_site_key) {
            window.TURNSTILE_SITE_KEY = data.turnstile_site_key;
          }
          if (data && data.authenticated && data.user) {
            const rawName = data.user.full_name || data.user.name || data.user.username || 'Hội viên';
            data.user.name = rawName;
            data.user.full_name = rawName;
            const current = JSON.parse(sessionStorage.getItem('sb_current_user') || localStorage.getItem('sb_current_user') || '{}');
            const updated = Object.assign({}, current, data.user);
            sessionStorage.setItem('sb_current_user', JSON.stringify(updated));
            try { localStorage.setItem('sb_current_user', JSON.stringify(updated)); } catch (e) {}
            // If navbar is already rendered, update points / tier if changed
            const navPlaceholder = document.getElementById('app-navbar');
            if (navPlaceholder && window.SanBongUI && typeof window.SanBongUI.renderNavbar === 'function') {
              const activePage = navPlaceholder.dataset ? navPlaceholder.dataset.activePage : navPlaceholder.getAttribute?.('data-active-page');
              navPlaceholder.innerHTML = activePage ? window.SanBongUI.renderNavbar(activePage) : window.SanBongUI.renderNavbar();
            }
            if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
              window.dispatchEvent(new CustomEvent('sb-auth-synced', { detail: data.user }));
            }
            return data.user;
          } else if (data && data.authenticated === false) {
            const hadSession = sessionStorage.getItem('sb_current_user') || localStorage.getItem('sb_current_user');
            if (hadSession) {
              sessionStorage.removeItem('sb_current_user');
              try { localStorage.removeItem('sb_current_user'); } catch (e) {}
              const navPlaceholder = document.getElementById('app-navbar');
              if (navPlaceholder && window.SanBongUI && typeof window.SanBongUI.renderNavbar === 'function') {
                const activePage = navPlaceholder.dataset ? navPlaceholder.dataset.activePage : navPlaceholder.getAttribute?.('data-active-page');
                navPlaceholder.innerHTML = activePage ? window.SanBongUI.renderNavbar(activePage) : window.SanBongUI.renderNavbar();
              }
            }
            if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
              window.dispatchEvent(new CustomEvent('sb-auth-unauthenticated'));
            }
            return null;
          }
        }
      } catch (e) {}
      return null;
    })();

    window.SanBongApp.authReady = _authMePromise;
    return _authMePromise;
  }

  // Event delegation for footer buttons & legal links
  document.addEventListener('click', function (e) {
    const target = e.target;
    if (!target) return;
    if (target.id === 'footer-btn-privacy' || target.closest('#footer-btn-privacy')) {
      e.preventDefault();
      showPrivacyPolicyModal();
      return;
    }
    if (target.id === 'footer-btn-terms' || target.closest('#footer-btn-terms')) {
      e.preventDefault();
      showTermsModal();
      return;
    }
  });

  // Sync auth on load
  if (typeof window !== 'undefined') {
    window.SanBongApp = window.SanBongApp || {};
    window.SanBongApp.authReady = syncAuthMe();
  }

  window.alert = function (msg) {
    showToast(String(msg), 'warning');
  };

  window.SanBongUI = {
    renderNavbar,
    renderFooter,
    handleLogout,
    showToast,
    showModal,
    showPrivacyPolicyModal,
    showTermsModal,
    syncAuthMe
  };

  window.showToast = showToast;
  window.showModal = showModal;

})();
