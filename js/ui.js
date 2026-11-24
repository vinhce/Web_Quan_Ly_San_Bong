
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
        if (!headers['X-CSRF-Token'] && sessionStorage.getItem('sb_current_user')) {
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

      ['sb_current_user', 'sb_booking_draft', 'sb_latest_booking', 'sb_csrf_token'].forEach(k => sessionStorage.removeItem(k));
      try {
        sessionStorage.clear();
        ['sb_current_user', 'sb_user_v1', 'sb_bookings_v1', 'sb_pending_payments_v3', 'sb_audit_logs_v1', 'sb_shifts_v1', 'sb_counter_sales_v1', 'sb_bank_transactions_v1'].forEach(k => localStorage.removeItem(k));
        Object.keys(localStorage).forEach(k => { if (k.startsWith('sb_hold_expire_') || k.startsWith('sb_')) localStorage.removeItem(k); });
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
      try { localStorage.removeItem('sb_current_user'); } catch (e) {}
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
      navItems.push({ label: 'Quản trị Portal', href: getRelativePath('portal-admin/') });
    } else if (currentUser && currentUser.role === 'manager') {
      navItems.push({ label: 'Quản lý Sân', href: getRelativePath('portal-admin/') });
    } else if (currentUser && currentUser.role === 'staff') {
      navItems.push({ label: 'Cổng Trực Sân', href: getRelativePath('portal-admin/') });
    }

    let authSectionHtml = '';
    const userDisplayName = currentUser ? (currentUser.full_name || currentUser.name || currentUser.username) : '';
    if (currentUser && userDisplayName) {
      const isAdmin = currentUser.role === 'admin';
      const isManager = currentUser.role === 'manager';
      const isStaff = currentUser.role === 'staff';
      const cleanAvatarWords = userDisplayName
        .replace(/\([^)]*\)/g, ' ')
        .trim()
        .split(/\s+/)
        .map(w => w.replace(/[^a-zA-ZÀ-ỹ0-9]/g, ''))
        .filter(Boolean);
      const user = {
        name: userDisplayName,
        full_name: userDisplayName,
        avatar: cleanAvatarWords.map(w => w[0]).slice(-2).join('').toUpperCase() || 'VIP',
        tier: isAdmin ? 'Quản trị viên' : (isManager ? 'Quản lý sân' : (isStaff ? 'Nhân viên trực sân' : (currentUser.tier || 'Hội viên'))),
        points: Number(currentUser.points) || 0
      };
      const userSubline = (isStaff || isManager) ? escapeHTML(user.tier) : `${escapeHTML(user.tier)} • ${user.points}đ`;

      authSectionHtml = `
      <div class="flex items-center gap-2 sm:gap-3 shrink-0">
        <div id="notif-bell-wrap" class="relative shrink-0">
          <button type="button" id="notif-bell-btn" aria-label="Thông báo" aria-haspopup="true" aria-expanded="false" onclick="window.SanBongUI && window.SanBongUI.toggleNotificationsDropdown(event)" class="w-11 h-11 sm:w-10 sm:h-10 rounded-full border border-[#E2E8F0] flex items-center justify-center relative text-[#475569] hover:bg-[#ECFDF3] hover:text-[#15803D] hover:border-[#86EFAC] transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A]">
            ${Icons.bell}
            <span id="notif-unread-dot" class="hidden absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white"></span>
          </button>

          <div id="notif-dropdown-menu" role="region" aria-label="Danh sách thông báo" class="hidden absolute right-0 top-full mt-2 w-[calc(100vw-1.5rem)] max-w-sm sm:w-80 bg-white rounded-xl shadow-2xl border border-[#E2E8F0] z-50 overflow-hidden">
            <div class="px-4 py-3 border-b border-[#F1F5F9] flex items-center justify-between bg-[#F8FAFC]">
              <div class="flex items-center gap-2">
                <span class="font-heading font-bold text-sm text-[#0F172A]">Thông báo</span>
                <span id="notif-count-badge" class="hidden px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold">0</span>
              </div>
              <button type="button" onclick="window.SanBongUI && window.SanBongUI.markNotificationsRead()" class="text-[11px] font-semibold text-[#16A34A] hover:text-[#15803D] hover:underline">Đánh dấu đã đọc</button>
            </div>
            <div id="notif-list-container" class="max-h-80 overflow-y-auto divide-y divide-[#F1F5F9]">
              <div class="p-6 text-center text-xs text-[#64748B]">Đang tải thông báo...</div>
            </div>
            <div class="px-4 py-2.5 border-t border-[#F1F5F9] bg-[#F8FAFC] text-center">
              <a href="${getRelativePath('history')}" class="text-xs font-bold text-[#16A34A] hover:text-[#15803D] hover:underline">Xem tất cả lịch sử đặt sân →</a>
            </div>
          </div>
        </div>

        <div id="user-menu-container" class="relative group shrink-0">
          <button id="user-menu-btn" aria-expanded="false" class="min-h-[44px] flex items-center gap-1.5 sm:gap-2 pl-1.5 py-1 pr-2 sm:pr-3 rounded-full hover:bg-[#F1F5F9] transition-colors border border-transparent hover:border-[#E2E8F0] text-left whitespace-nowrap">
            <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#DCFCE7] text-[#16A34A] font-heading font-bold text-xs sm:text-sm flex items-center justify-center shrink-0">
              ${escapeHTML(user.avatar || 'VIP')}
            </div>
            <div class="hidden xl:block max-w-[140px]">
              <div class="text-[13px] font-semibold text-[#0F172A] leading-tight truncate">${escapeHTML(user.name)}</div>
              <div class="text-[11px] text-[#16A34A] font-medium truncate">${userSubline}</div>
            </div>
            <svg class="w-4 h-4 text-[#94A3B8] shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
          </button>

          <!-- Dropdown menu -->
          <div id="user-dropdown-menu" class="absolute right-0 top-full pt-2 w-56 hidden group-hover:block z-50 transition-all before:content-[''] before:absolute before:-top-3 before:left-0 before:right-0 before:h-3">
            <div class="w-full bg-white rounded-xl shadow-xl border border-[#E2E8F0] py-2">
              <div class="px-4 py-2 border-b border-[#F1F5F9]">
                <div class="text-xs font-bold text-[#0F172A] truncate">${escapeHTML(user.name)}</div>
                <div class="text-[11px] text-[#64748B] truncate">${escapeHTML(currentUser.phone || currentUser.email || '')}</div>
              </div>
              <a href="${getRelativePath('history')}" class="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] hover:text-[#16A34A]">
                <svg class="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                <span>Lịch sử đặt sân & Hội viên</span>
              </a>
              ${isAdmin ? `
              <a href="${getRelativePath('portal-admin/')}" class="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-[#16A34A] hover:bg-[#DCFCE7]/50">
                <svg class="w-4 h-4 text-[#16A34A] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                <span>Bảng điều khiển Quản trị</span>
              </a>` : (isManager ? `
              <a href="${getRelativePath('portal-admin/')}" class="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-[#7C3AED] hover:bg-purple-50">
                <svg class="w-4 h-4 text-purple-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                <span>Quản lý Sân</span>
              </a>` : (isStaff ? `
              <a href="${getRelativePath('portal-admin/')}" class="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-[#2563EB] hover:bg-blue-50">
                <svg class="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                <span>Cổng Trực Sân</span>
              </a>` : ''))}
              <button onclick="window.SanBongApp.handleLogout()" class="w-full text-left flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#DC2626] hover:bg-rose-50 border-t border-[#F1F5F9]">
                <svg class="w-4 h-4 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>
      </div>`;
    } else {
      authSectionHtml = `
      <div class="flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap">
        <a href="${getRelativePath('login')}" class="min-h-[44px] sm:min-h-0 sm:h-9 px-3 sm:px-4 rounded-lg flex items-center justify-center text-xs font-bold text-[#16A34A] border border-[#16A34A] hover:bg-[#ECFDF3] hover:text-[#15803D] transition-all whitespace-nowrap">
          Đăng nhập
        </a>
        <a href="${getRelativePath('login')}?tab=register" class="hidden sm:flex h-9 px-4 rounded-lg items-center justify-center text-xs font-bold bg-[#16A34A] text-white hover:bg-[#15803D] shadow-sm transition-all whitespace-nowrap">
          Đăng ký
        </a>
      </div>`;
    }

    const mobileNavHtml = navItems.map(item => {
      const isAct = item.label === activePage;
      return `
      <a href="${item.href}" class="min-h-[44px] flex items-center px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
        isAct ? 'bg-[#ECFDF3] text-[#15803D]' : 'text-[#334155] hover:bg-[#F8FAFC] hover:text-[#15803D]'
      }">${escapeHTML(item.label)}</a>`;
    }).join('');

    return `
    <header class="w-full bg-white border-b border-[#E2E8F0] sticky top-0 z-50 shadow-sm">
      <div class="h-[72px] px-2.5 sm:px-4 lg:px-6 xl:px-10 flex items-center justify-between gap-2 sm:gap-3">
        <div class="flex items-center gap-4 lg:gap-6 xl:gap-8 shrink-0">
          <a href="${getRelativePath('')}" class="min-h-[44px] flex items-center gap-2 sm:gap-2.5 group shrink-0 whitespace-nowrap">
            <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-[10px] bg-[#16A34A] text-white flex items-center justify-center shadow-md group-hover:bg-[#15803D] transition-all shrink-0">
              ${Icons.ball}
            </div>
            <div class="leading-none">
              <span class="block font-heading font-extrabold text-[15px] sm:text-[19px] text-[#0F172A] tracking-tight whitespace-nowrap">Sân Bóng Pro</span>
              <span class="hidden sm:block text-[10px] font-medium text-[#16A34A] uppercase tracking-wider mt-0.5 whitespace-nowrap">Hệ thống sân đỉnh cao</span>
            </div>
          </a>

          <nav class="hidden lg:flex items-center gap-4 xl:gap-6 h-[72px]">
            ${navItems.map(item => {
              const isAct = item.label === activePage;
              return `
              <a href="${item.href}" class="h-full flex items-center relative text-[13px] xl:text-[14px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                isAct ? 'text-[#16A34A] font-semibold' : 'text-[#475569] hover:text-[#15803D]'
              }">
                <span>${escapeHTML(item.label)}</span>
                ${isAct ? `<span class="absolute bottom-0 left-0 right-0 h-[3px] bg-[#16A34A] rounded-t-full"></span>` : ''}
              </a>`;
            }).join('')}
          </nav>
        </div>

        <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
          ${authSectionHtml}
          <button type="button" id="mobile-nav-toggle-btn" aria-label="Mở menu điều hướng" aria-expanded="false" onclick="(function(btn){var m=document.getElementById('mobile-nav-drawer');if(!m)return;var open=m.classList.toggle('hidden');btn.setAttribute('aria-expanded',String(!open));})(this)" class="lg:hidden w-11 h-11 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-[#334155] hover:bg-[#ECFDF3] hover:text-[#15803D] transition-colors shrink-0">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
        </div>
      </div>

      <nav id="mobile-nav-drawer" class="hidden lg:hidden border-t border-[#E2E8F0] bg-white px-3 py-2.5 space-y-1 shadow-md">
        ${mobileNavHtml}
        ${!currentUser ? `
        <div class="sm:hidden pt-2 mt-2 border-t border-[#E2E8F0] grid grid-cols-2 gap-2">
          <a href="${getRelativePath('login')}" class="min-h-[44px] rounded-lg flex items-center justify-center text-xs font-bold text-[#16A34A] border border-[#16A34A] hover:bg-[#ECFDF3] hover:text-[#15803D] transition-all">Đăng nhập</a>
          <a href="${getRelativePath('login')}?tab=register" class="min-h-[44px] rounded-lg flex items-center justify-center text-xs font-bold bg-[#16A34A] text-white hover:bg-[#15803D] shadow-sm transition-all">Đăng ký</a>
        </div>` : ''}
      </nav>
    </header>`;
  }

  function renderFooter() {
    const sysCfg = (window.SanBongDB && typeof window.SanBongDB.getSystemConfig === 'function')
      ? window.SanBongDB.getSystemConfig()
      : null;
    const openHoursText = escapeHTML(sysCfg?.openHours || '05:30 - 22:30 hàng ngày (kể cả Lễ, Tết)');
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
            <span class="text-emerald-400 font-semibold">Giờ mở cửa:</span>
            <span>${openHoursText}</span>
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
      <style id="zalo-floating-motion-style">
        .zalo-floating-btn {
          position: relative;
          box-shadow: 0 4px 16px rgba(0, 104, 255, 0.45);
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease;
        }
        .zalo-floating-btn:hover {
          transform: scale(1.15) !important;
          box-shadow: 0 6px 22px rgba(0, 104, 255, 0.65);
        }
        .zalo-icon-inner {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          animation: zaloWiggle 2.6s infinite ease-in-out;
          transform-origin: center center;
        }
        .zalo-pulse-ring {
          position: absolute;
          inset: -4px;
          border-radius: 9999px;
          background: rgba(0, 104, 255, 0.45);
          animation: zaloPulseRing 2s infinite cubic-bezier(0.24, 0, 0.38, 1);
          z-index: 1;
          pointer-events: none;
        }
        .zalo-pulse-wave {
          position: absolute;
          inset: -10px;
          border-radius: 9999px;
          border: 2px solid rgba(0, 104, 255, 0.35);
          animation: zaloPulseWave 2s infinite cubic-bezier(0.24, 0, 0.38, 1);
          animation-delay: 0.4s;
          z-index: 1;
          pointer-events: none;
        }
        @keyframes zaloWiggle {
          0%, 100% { transform: scale(1) rotate(0deg); }
          8%, 22% { transform: scale(1.12) rotate(-12deg); }
          15%, 28% { transform: scale(1.12) rotate(12deg); }
          35% { transform: scale(1.05) rotate(0deg); }
          45% { transform: scale(1) rotate(0deg); }
        }
        @keyframes zaloPulseRing {
          0% { transform: scale(0.9); opacity: 0.85; }
          70% { transform: scale(1.35); opacity: 0; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes zaloPulseWave {
          0% { transform: scale(0.85); opacity: 0.9; }
          80% { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1.6); opacity: 0; }
        }

        /* Hotline Floating Motion */
        .hotline-floating-btn {
          position: relative;
          box-shadow: 0 4px 16px rgba(22, 163, 74, 0.45);
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease;
        }
        .hotline-floating-btn:hover {
          transform: scale(1.15) !important;
          box-shadow: 0 6px 22px rgba(22, 163, 74, 0.65);
        }
        .hotline-icon-inner {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          animation: phoneRing 2.6s infinite ease-in-out;
          animation-delay: 1.3s;
          transform-origin: center center;
        }
        .hotline-pulse-ring {
          position: absolute;
          inset: -4px;
          border-radius: 9999px;
          background: rgba(22, 163, 74, 0.45);
          animation: hotlinePulseRing 2s infinite cubic-bezier(0.24, 0, 0.38, 1);
          z-index: 1;
          pointer-events: none;
        }
        .hotline-pulse-wave {
          position: absolute;
          inset: -10px;
          border-radius: 9999px;
          border: 2px solid rgba(22, 163, 74, 0.35);
          animation: hotlinePulseWave 2s infinite cubic-bezier(0.24, 0, 0.38, 1);
          animation-delay: 0.4s;
          z-index: 1;
          pointer-events: none;
        }
        @keyframes phoneRing {
          0%, 100% { transform: scale(1) rotate(0deg); }
          8%, 22% { transform: scale(1.15) rotate(-15deg); }
          15%, 28% { transform: scale(1.15) rotate(15deg); }
          35% { transform: scale(1.05) rotate(0deg); }
          45% { transform: scale(1) rotate(0deg); }
        }
        @keyframes hotlinePulseRing {
          0% { transform: scale(0.9); opacity: 0.85; }
          70% { transform: scale(1.35); opacity: 0; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes hotlinePulseWave {
          0% { transform: scale(0.85); opacity: 0.9; }
          80% { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      </style>
      ${(() => {
        const p = (typeof window !== 'undefined' && window.location && window.location.pathname) ? window.location.pathname.toLowerCase() : '';
        if (/(?:\/|^)(booking|checkout|login|forgot-password)(?:\.html|\/|$)/.test(p)) return '';
        return `
      <div id="sb-floating-contact" class="fixed right-3 sm:right-5 bottom-4 sm:bottom-6 z-40 flex flex-col gap-2.5 pointer-events-auto transition-opacity duration-200">
        <a href="https://zalo.me/0352313548" target="_blank" rel="noopener noreferrer" class="zalo-floating-btn w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#0068FF] text-white flex items-center justify-center font-bold text-[11px] sm:text-xs" title="Chat Zalo hỗ trợ 24/7">
          <span class="zalo-pulse-ring"></span>
          <span class="zalo-pulse-wave"></span>
          <span class="zalo-icon-inner relative z-10 text-[11px] sm:text-xs font-black tracking-tighter drop-shadow-sm">Zalo</span>
        </a>
        <a href="tel:0352313548" class="hotline-floating-btn w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#16A34A] text-white flex items-center justify-center font-bold text-base sm:text-lg" title="Gọi Hotline đặt sân 0352 313 548">
          <span class="hotline-pulse-ring"></span>
          <span class="hotline-pulse-wave"></span>
          <span class="hotline-icon-inner relative z-10 flex items-center justify-center">
            <svg class="w-5 h-5 text-white fill-current drop-shadow-sm" viewBox="0 0 24 24"><path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z"/></svg>
          </span>
        </a>
      </div>`;
      })()}${(() => { if (typeof window !== 'undefined') setTimeout(() => { if (typeof window._sbSyncFabVisibility === 'function') window._sbSyncFabVisibility(); }, 20); return ''; })()}
    </footer>`;
  }

  function showToast(message, type = 'info', duration = 4000) {
    let container = document.getElementById('sb-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'sb-toast-container';
      container.setAttribute('role', 'region');
      container.setAttribute('aria-label', 'Thông báo hệ thống');
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'true');
      container.className = 'fixed bottom-5 right-5 z-[9999] flex flex-col-reverse gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0';
      document.body.appendChild(container);
    }

    const normMsg = String(message || '').trim();
    // Gộp trùng: chỉ 1 toast cùng nội dung tại một thời điểm
    const existing = container.querySelectorAll('[data-sb-toast-msg]');
    for (const el of existing) {
      if (el.getAttribute('data-sb-toast-msg') === normMsg) {
        el.classList.add('ring-2', 'ring-emerald-400', 'scale-105');
        setTimeout(() => el.classList.remove('ring-2', 'ring-emerald-400', 'scale-105'), 200);
        return;
      }
    }

    // Tối đa 3 toast: loại bỏ toast cũ nhất nếu đã đủ 3
    while (container.children.length >= 3) {
      const oldest = container.firstElementChild;
      if (oldest) oldest.remove();
    }

    const toast = document.createElement('div');
    toast.setAttribute('data-sb-toast-msg', normMsg);
    toast.className = 'pointer-events-auto transform translate-y-2 opacity-0 transition-all duration-300 ease-out shadow-xl rounded-xl p-3.5 flex items-start gap-3 border text-xs font-semibold backdrop-blur-md';

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
      <button type="button" aria-label="Đóng thông báo" class="text-slate-400 hover:text-slate-700 ml-1 text-sm font-bold leading-none select-none p-1">&times;</button>
    `;

    const closeBtn = toast.querySelector('button');
    const removeToast = () => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => {
        try { toast.remove(); } catch (e) {}
      }, 300);
    };
    closeBtn.addEventListener('click', removeToast);

    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.classList.remove('opacity-0', 'translate-y-2');
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
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'sb-dialog-modal-title');
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
          <h3 id="sb-dialog-modal-title" class="font-heading font-bold text-lg text-slate-900 tracking-tight leading-snug">${escapeHTML(title || 'Thông báo')}</h3>
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
• Liên hệ xác nhận lịch thi đấu, hỗ trợ hủy lịch hoặc xử lý hoàn cọc.
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
• Tỷ lệ đặt cọc: Áp dụng 30% cho đặt lẻ hoặc 60% cho gói theo tháng.
• Hủy trước 24 giờ so với giờ bắt đầu: Hoàn 100% tiền cọc.
• Hủy trước từ 4 giờ đến dưới 24 giờ: Hoàn 50% tiền cọc (phạt 50% chi phí giữ chỗ).
• Hủy sát giờ dưới 4 giờ hoặc vắng mặt (No-Show): Không hoàn cọc nhằm bù đắp chi phí vận hành sân.

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
            const current = JSON.parse(sessionStorage.getItem('sb_current_user') || '{}');
            const updated = Object.assign({}, current, data.user);
            sessionStorage.setItem('sb_current_user', JSON.stringify(updated));
            try { localStorage.removeItem('sb_current_user'); } catch (e) {}
            // If navbar is already rendered, update points / tier if changed
            const navPlaceholder = document.getElementById('app-navbar');
            if (navPlaceholder && window.SanBongUI && typeof window.SanBongUI.renderNavbar === 'function') {
              const activePage = navPlaceholder.dataset ? navPlaceholder.dataset.activePage : navPlaceholder.getAttribute?.('data-active-page');
              navPlaceholder.innerHTML = activePage ? window.SanBongUI.renderNavbar(activePage) : window.SanBongUI.renderNavbar();
            }
            if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
              const custDetail = (data.customer || (data.user.role === 'user' ? data.user : null));
              window.dispatchEvent(new CustomEvent('sb-auth-synced', { detail: custDetail }));
              if (!custDetail) {
                window.dispatchEvent(new CustomEvent('sb-auth-unauthenticated'));
              }
            }
            return data.user;
          } else if (data && data.authenticated === false) {
            sessionStorage.removeItem('sb_current_user');
            try { localStorage.removeItem('sb_current_user'); } catch (e) {}
            const navPlaceholder = document.getElementById('app-navbar');
            if (navPlaceholder && window.SanBongUI && typeof window.SanBongUI.renderNavbar === 'function') {
              const activePage = navPlaceholder.dataset ? navPlaceholder.dataset.activePage : navPlaceholder.getAttribute?.('data-active-page');
              navPlaceholder.innerHTML = activePage ? window.SanBongUI.renderNavbar(activePage) : window.SanBongUI.renderNavbar();
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

    // Bảo vệ UI: Tự động ẩn mọi widget rác/bên thứ ba bị chặn hoặc hiện lỗi "hi — Blocked"
    document.addEventListener('DOMContentLoaded', () => {
      try {
        const suspicious = document.querySelectorAll('iframe, [id*="chat"], [class*="chat"], [id*="widget"]');
        suspicious.forEach(el => {
          const t = (el.innerText || el.textContent || '').trim();
          if (/blocked/i.test(t) || t === 'hi' || /hi\s*[-—]\s*blocked/i.test(t)) {
            el.classList.add('hidden');
            el.style.display = 'none';
          }
        });
        const syncFabVisibility = () => {
          const fab = document.getElementById('sb-floating-contact');
          if (!fab) return;
          fab.style.display = '';
          const rFab = fab.getBoundingClientRect();
          const pad = 10;
          const overlapsRect = (rect) => {
            if (!rect || (rect.width === 0 && rect.height === 0)) return false;
            return !(
              rFab.right + pad < rect.left ||
              rFab.left - pad > rect.right ||
              rFab.bottom + pad < rect.top ||
              rFab.top - pad > rect.bottom
            );
          };

          let shouldHide = false;
          const heroBtn = document.getElementById('hero-submit-btn');
          if (heroBtn && overlapsRect(heroBtn.getBoundingClientRect())) {
            shouldHide = true;
          }
          if (!shouldHide && window.innerWidth < 640) {
            const vouchersList = document.getElementById('vouchers-list');
            if (vouchersList) {
              const rV = vouchersList.getBoundingClientRect();
              if (rV.top <= rFab.bottom + pad && rV.bottom >= rFab.top - pad) {
                shouldHide = true;
              }
            }
          }
          if (!shouldHide) {
            const docEl = document.documentElement;
            if (docEl && docEl.scrollHeight > window.innerHeight + 120) {
              if (window.innerHeight + window.scrollY >= docEl.scrollHeight - 80) {
                shouldHide = true;
              }
            }
          }
          if (shouldHide) {
            fab.style.display = 'none';
          }
        };
        window._sbSyncFabVisibility = syncFabVisibility;
        syncFabVisibility();
        window.addEventListener('scroll', syncFabVisibility, { passive: true });
        window.addEventListener('resize', syncFabVisibility, { passive: true });
      } catch (e) {}
    });
  }

  window.alert = function (msg) {
    showToast(String(msg), 'warning');
  };

  function buildNotificationsFromBookings(bookings, currentUser) {
    if (!Array.isArray(bookings) || !currentUser) return [];
    const uId = currentUser.id ? Number(currentUser.id) : null;
    const uPhone = String(currentUser.phone || currentUser.username || '').replace(/\D+/g, '');
    const isAdmin = ['admin', 'manager', 'staff'].includes(String(currentUser.role || '').toLowerCase());

    const mine = bookings.filter(b => {
      if (isAdmin) return true;
      const bUid = b.user_id ? Number(b.user_id) : null;
      const bPhone = String(b.phone || '').replace(/\D+/g, '');
      return (uId && bUid && uId === bUid) || (uPhone && bPhone && uPhone === bPhone);
    });

    const fmtDate = (iso) => {
      const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
      return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso || '');
    };

    return mine.slice(0, 10).map(b => {
      const st = String(b.status || '');
      const ps = String(b.paymentStatus || b.payment_status || '');
      let icon = '🔔', title = `Cập nhật đơn #${b.code}`, tone = 'text-slate-700 bg-slate-100';
      if (st === 'Đã hủy' || ps === 'Đã hủy') {
        icon = '✕'; title = `Đơn #${b.code} đã hủy`; tone = 'text-rose-700 bg-rose-100';
      } else if (st === 'Hoàn thành' || st.toLowerCase() === 'completed') {
        icon = '✓'; title = `Hoàn thành ca đá #${b.code}`; tone = 'text-emerald-700 bg-emerald-100';
      } else if (st === 'Đang đá') {
        icon = '⚽'; title = `Ca đá #${b.code} đang diễn ra`; tone = 'text-blue-700 bg-blue-100';
      } else if (ps.includes('Đã cọc') || ps.includes('Đã thanh toán')) {
        icon = '✓'; title = `Đã xác nhận cọc đơn #${b.code}`; tone = 'text-emerald-700 bg-emerald-100';
      } else {
        icon = '⏳'; title = `Đơn #${b.code} đang chờ cọc`; tone = 'text-amber-700 bg-amber-100';
      }
      return {
        code: b.code || '',
        icon,
        title,
        tone,
        desc: `${b.pitchName || b.pitch_name || b.pitchId || 'Sân bóng'} · ${fmtDate(b.date || b.booking_date)} (${b.slotTime || b.slot_time || ''})`,
        time: b.createdAt || b.created_at || ''
      };
    });
  }

  async function loadAndRenderNotifications() {
    const listEl = document.getElementById('notif-list-container');
    const dotEl = document.getElementById('notif-unread-dot');
    const badgeEl = document.getElementById('notif-count-badge');
    if (!listEl) return;

    let currentUser = null;
    try {
      currentUser = JSON.parse(sessionStorage.getItem('sb_current_user') || 'null');
    } catch (e) {}

    let bookings = (window.SanBongDB && typeof window.SanBongDB.getAllBookings === 'function')
      ? window.SanBongDB.getAllBookings()
      : [];

    if ((!bookings || bookings.length === 0) && currentUser) {
      try {
        const res = await fetch(getRelativePath('api/bookings.php'), { credentials: 'same-origin', cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (res.ok && json && Array.isArray(json.data)) {
          bookings = json.data;
        }
      } catch (e) {}
    }

    const items = buildNotificationsFromBookings(bookings, currentUser);
    const notifSeenKey = currentUser?.id ? `sb_notif_seen_count_${currentUser.id}` : 'sb_notif_seen_count';
    const seenCount = Number(localStorage.getItem(notifSeenKey) || '0');
    const hasUnread = items.length > seenCount;

    if (dotEl) dotEl.classList.toggle('hidden', !hasUnread);
    if (badgeEl) {
      badgeEl.textContent = String(items.length);
      badgeEl.classList.toggle('hidden', items.length === 0);
    }

    if (items.length === 0) {
      listEl.innerHTML = '<div class="p-6 text-center text-xs text-[#64748B]">Chưa có thông báo nào.</div>';
      return;
    }

    listEl.innerHTML = items.map(it => {
      const targetHref = it.code
        ? `${getRelativePath('history')}?code=${encodeURIComponent(it.code)}`
        : getRelativePath('history');
      const safeCodeJs = String(it.code || '').replace(/[^a-zA-Z0-9_-]/g, '');
      return `
      <a href="${targetHref}" onclick="if(typeof window.focusHistoryBooking==='function'&&'${safeCodeJs}'){event.preventDefault();window.SanBongUI&&window.SanBongUI.closeNotificationsDropdown&&window.SanBongUI.closeNotificationsDropdown();window.focusHistoryBooking('${safeCodeJs}');}" class="flex items-start gap-3 px-4 py-3 hover:bg-[#ECFDF3]/70 transition-colors">
        <span class="w-7 h-7 rounded-full ${it.tone} flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">${it.icon}</span>
        <div class="min-w-0 flex-1">
          <div class="text-xs font-bold text-[#0F172A] truncate">${escapeHTML(it.title)}</div>
          <div class="text-[11px] text-[#475569] mt-0.5 leading-snug">${escapeHTML(it.desc)}</div>
          ${it.time ? `<div class="text-[10px] text-[#94A3B8] mt-1">${escapeHTML(it.time)}</div>` : ''}
        </div>
      </a>`;
    }).join('');
  }

  function toggleNotificationsDropdown(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const menu = document.getElementById('notif-dropdown-menu');
    const btn = document.getElementById('notif-bell-btn');
    if (!menu || !btn) return;
    const willOpen = menu.classList.contains('hidden');
    menu.classList.toggle('hidden', !willOpen);
    btn.setAttribute('aria-expanded', String(willOpen));
    if (willOpen) {
      loadAndRenderNotifications();
    }
  }

  function markNotificationsRead() {
    let curUid = null;
    try {
      const u = JSON.parse(sessionStorage.getItem('sb_current_user') || 'null');
      curUid = u?.id || null;
    } catch (e) {}
    const notifSeenKey = curUid ? `sb_notif_seen_count_${curUid}` : 'sb_notif_seen_count';
    const dotEl = document.getElementById('notif-unread-dot');
    const badgeEl = document.getElementById('notif-count-badge');
    const cnt = Number(badgeEl?.textContent || '0') || 0;
    try { localStorage.setItem(notifSeenKey, String(cnt)); } catch (e) {}
    if (dotEl) dotEl.classList.add('hidden');
    showToast('Đã đánh dấu tất cả thông báo là đã đọc.', 'success');
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
      const wrap = document.getElementById('notif-bell-wrap');
      const menu = document.getElementById('notif-dropdown-menu');
      const btn = document.getElementById('notif-bell-btn');
      if (wrap && menu && !menu.classList.contains('hidden') && !wrap.contains(e.target)) {
        menu.classList.add('hidden');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const menu = document.getElementById('notif-dropdown-menu');
        const btn = document.getElementById('notif-bell-btn');
        if (menu && !menu.classList.contains('hidden')) {
          menu.classList.add('hidden');
          if (btn) { btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
        }
      }
    });
  }

  function closeNotificationsDropdown() {
    const menu = document.getElementById('notif-dropdown-menu');
    const btn = document.getElementById('notif-bell-btn');
    if (menu) menu.classList.add('hidden');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function handleUnauthorizedSession(redirectRoute) {
    try {
      sessionStorage.removeItem('sb_current_user');
      sessionStorage.removeItem('sb_csrf_token');
      localStorage.removeItem('sb_current_user');
    } catch (e) {}
    if (typeof window !== 'undefined') {
      window.sb_current_user = null;
      if (window._sbRedirecting401) return;
      window._sbRedirecting401 = true;
      const route = String(redirectRoute || '').trim().replace(/^\/+/, '') || 'history';
      window.location.replace(getRelativePath(`login?redirect=${encodeURIComponent(route)}&expired=1`));
    }
  }

  window.SanBongUI = {
    renderNavbar,
    renderFooter,
    handleLogout,
    showToast,
    showModal,
    showPrivacyPolicyModal,
    showTermsModal,
    syncAuthMe,
    handleUnauthorizedSession,
    toggleNotificationsDropdown,
    closeNotificationsDropdown,
    markNotificationsRead
  };

  window.showToast = showToast;
  window.showModal = showModal;

})();
