
(function () {
  'use strict';

  const escapeHTML = (str) => (window.SanBongHelpers ? window.SanBongHelpers.escapeHTML(str) : String(str || ''));
  const getRelativePath = (t) => (window.SanBongHelpers ? window.SanBongHelpers.getRelativePath(t) : t);
  const Icons = (window.SanBongHelpers && window.SanBongHelpers.Icons) ? window.SanBongHelpers.Icons : {};

function handleLogout() {
    const doLogout = () => {
      sessionStorage.removeItem('sb_current_user');
      try {
        localStorage.removeItem('sb_user_v1');
      } catch (e) {}
      fetch(getRelativePath('api/auth.php?action=logout'), { method: 'POST' })
        .finally(() => {
          window.location.href = getRelativePath('');
        });
    };

    if (showModal) {
      showModal({
        title: 'Đăng xuất tài khoản',
        message: 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?',
        type: 'info',
        confirmText: 'Đăng xuất',
        cancelText: 'Ở lại',
        onConfirm: doLogout
      });
    } else {
      if (confirm('Bạn có chắc chắn muốn đăng xuất tài khoản?')) doLogout();
    }
  }

  function renderNavbar(activePage = 'Trang chủ') {
    let currentUser = null;
    try {
      currentUser = JSON.parse(sessionStorage.getItem('sb_current_user') || 'null');
    } catch(e) {}

    const navItems = [
      { label: 'Trang chủ', href: getRelativePath('') },
      { label: 'Danh sách sân', href: getRelativePath('fields') },
      { label: 'Đặt sân nhanh', href: getRelativePath('booking') },
      { label: 'Lịch sử & Hội viên', href: getRelativePath('history') }
    ];

    if (currentUser && currentUser.role === 'admin') {
      navItems.push({ label: '🛡️ Quản trị Portal', href: getRelativePath('portal-admin/') });
    }

    let authSectionHtml = '';
    if (currentUser && currentUser.full_name) {
      const user = {
        name: currentUser.full_name,
        avatar: currentUser.full_name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase(),
        tier: currentUser.role === 'admin' ? 'Quản trị viên' : (currentUser.tier || 'Hội viên'),
        points: currentUser.role === 'admin' ? 9999 : (currentUser.points || 0)
      };

      authSectionHtml = `
      <div class="flex items-center gap-3 sm:gap-4">
        <a href="${getRelativePath('history')}" class="w-10 h-10 rounded-full border border-[#E2E8F0] flex items-center justify-center relative text-[#475569] hover:bg-[#F8FAFC] transition-colors" title="Lịch sử đặt sân & Hội viên">
          ${Icons.bell}
        </a>

        <div class="relative group">
          <button class="flex items-center gap-2 pl-2 py-1 pr-3 rounded-full hover:bg-[#F1F5F9] transition-colors border border-transparent hover:border-[#E2E8F0] text-left">
            <div class="w-9 h-9 rounded-full bg-[#DCFCE7] text-[#16A34A] font-heading font-bold text-sm flex items-center justify-center">
              ${escapeHTML(user.avatar || 'VIP')}
            </div>
            <div class="hidden sm:block">
              <div class="text-[14px] font-semibold text-[#0F172A] leading-tight">${escapeHTML(user.name)}</div>
              <div class="text-[11px] text-[#16A34A] font-medium">${escapeHTML(user.tier)} • ${user.points}đ</div>
            </div>
            <svg class="w-4 h-4 text-[#94A3B8] ml-0.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
          </button>

          <!-- Dropdown menu -->
          <div class="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-[#E2E8F0] py-2 hidden group-hover:block z-50 transition-all">
            <div class="px-4 py-2 border-b border-[#F1F5F9]">
              <div class="text-xs font-bold text-[#0F172A] truncate">${escapeHTML(user.name)}</div>
              <div class="text-[11px] text-[#64748B] truncate">${escapeHTML(currentUser.phone || currentUser.email || '')}</div>
            </div>
            <a href="${getRelativePath('history')}" class="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] hover:text-[#16A34A]">
              <span>📋 Lịch sử đặt sân & Hội viên</span>
            </a>
            ${currentUser.role === 'admin' ? `
            <a href="${getRelativePath('portal-admin/')}" class="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-[#16A34A] hover:bg-[#DCFCE7]/50">
              <span>🛡️ Bảng điều khiển Quản trị</span>
            </a>` : ''}
            <button onclick="window.SanBongApp.handleLogout()" class="w-full text-left flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#DC2626] hover:bg-rose-50 border-t border-[#F1F5F9]">
              <span>🚪 Đăng xuất</span>
            </button>
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
          <div class="p-3 rounded-lg bg-[#1E293B] border border-[#334155] text-xs text-[#CBD5E1]">
            <span class="text-[#16A34A] font-semibold">● Đang mở cửa:</span> 05:30 - 23:00 mỗi ngày
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 md:px-8 pt-6 border-t border-[#1E293B] flex flex-col sm:flex-row items-center justify-between text-[12px] text-[#64748B] gap-4">
        <div>© 2026 Sân Bóng Pro. Bản quyền hệ thống đặt sân hiện đại.</div>
        <div class="flex items-center gap-6">
          <a href="#" class="hover:text-white">Điều khoản sử dụng</a>
          <a href="#" class="hover:text-white">Chính sách bảo mật</a>
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

  function showModal(options) {
    const { title, message, type = 'info', confirmText = 'Xác nhận', cancelText = null, onConfirm = null } = options;
    const modalId = 'sb-dialog-modal';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = modalId;
    overlay.className = 'fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 opacity-0 transition-opacity duration-200';

    const card = document.createElement('div');
    card.className = 'bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 transform scale-95 transition-transform duration-200';

    let headerBadge = '';
    if (type === 'error' || type === 'danger') {
      headerBadge = '<div class="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-lg shrink-0">⚠️</div>';
    } else if (type === 'warning') {
      headerBadge = '<div class="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-lg shrink-0">⚡</div>';
    } else if (type === 'success') {
      headerBadge = '<div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-lg shrink-0">✓</div>';
    } else {
      headerBadge = '<div class="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg shrink-0">ℹ️</div>';
    }

    card.innerHTML = `
      <div class="flex items-start gap-3">
        ${headerBadge}
        <div class="flex-1">
          <h3 class="font-heading font-extrabold text-base text-[#0F172A]">${escapeHTML(title || 'Thông báo')}</h3>
          <div class="text-xs text-[#475569] leading-relaxed mt-1.5 whitespace-pre-line">${escapeHTML(message || '')}</div>
        </div>
      </div>
      <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
        ${cancelText ? `<button type="button" id="modal-cancel-btn" class="btn-sm btn-secondary text-xs">${escapeHTML(cancelText)}</button>` : ''}
        <button type="button" id="modal-confirm-btn" class="btn-sm btn-primary text-xs">${escapeHTML(confirmText)}</button>
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

    const close = () => {
      overlay.classList.remove('opacity-100');
      overlay.classList.add('opacity-0');
      card.classList.remove('scale-100');
      card.classList.add('scale-95');
      setTimeout(() => overlay.remove(), 200);
    };

    card.querySelector('#modal-confirm-btn').addEventListener('click', () => {
      close();
      if (typeof onConfirm === 'function') onConfirm();
    });

    if (cancelText) {
      card.querySelector('#modal-cancel-btn').addEventListener('click', close);
    }
  }

  window.alert = function (msg) {
    showToast(String(msg), 'warning');
  };

  window.alert = function (msg) {
    showToast(String(msg), 'warning');
  };

  window.SanBongUI = {
    renderNavbar,
    renderFooter,
    handleLogout,
    showToast,
    showModal
  };

  window.showToast = showToast;
  window.showModal = showModal;

})();
