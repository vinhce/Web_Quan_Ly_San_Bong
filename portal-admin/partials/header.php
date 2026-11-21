    <header class="admin-header-bar sticky top-0 z-20 h-14 sm:h-16 bg-white border-b border-[#E2E8F0] px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-3 shrink-0 select-none">
      <div class="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
        <button type="button" id="admin-mobile-menu-btn" onclick="toggleAdminMobileDrawer()" class="md:hidden w-9 h-9 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-50 active:bg-slate-100 flex items-center justify-center text-[#0F172A] shrink-0 cursor-pointer" aria-label="Mở menu">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
        </button>
        <div class="min-w-0 flex items-center gap-2">
          <h1 id="admin-module-title" class="font-heading font-extrabold text-sm sm:text-base lg:text-lg text-[#0F172A] truncate">1. Tổng quan</h1>
          <span id="admin-module-subtitle" class="hidden 2xl:inline-block text-[11px] text-[#64748B] whitespace-nowrap">Cập nhật trực tiếp</span>
        </div>
      </div>

      <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button type="button" id="admin-mobile-search-toggle" onclick="(function(){var w=document.getElementById('admin-search-wrap');var i=document.getElementById('admin-global-search');if(!w)return;var open=w.classList.contains('hidden');w.classList.toggle('hidden',!open);if(open&&i){setTimeout(function(){i.focus();},40);}})()" class="sm:hidden w-9 h-9 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-slate-100 flex items-center justify-center text-[#475569] shrink-0 cursor-pointer" title="Tìm kiếm" aria-label="Tìm kiếm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </button>

        <div id="admin-search-wrap" class="hidden sm:block max-sm:fixed max-sm:left-0 max-sm:right-0 max-sm:top-14 max-sm:z-30 max-sm:bg-white max-sm:border-b max-sm:border-[#E2E8F0] max-sm:p-2.5 max-sm:shadow-md sm:relative sm:w-44 lg:w-48 xl:w-56 sm:focus-within:w-60 transition-all">
          <div class="w-full h-9 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 flex items-center gap-1.5 text-xs focus-within:border-[#16A34A] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#16A34A]/20 transition-all">
            <button type="button" onclick="performAdminSearch()" class="text-[#94A3B8] hover:text-[#16A34A] shrink-0" title="Tìm kiếm" aria-label="Tìm kiếm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </button>
            <input type="text" id="admin-global-search" oninput="performAdminSearch()" onkeydown="if(event.key==='Enter')performAdminSearch()" placeholder="Tìm mã đơn, SĐT..." class="w-full bg-transparent border-none outline-none text-xs text-[#0F172A] placeholder-[#94A3B8] font-medium" autocomplete="off">
            <button type="button" id="admin-search-clear" onclick="clearAdminSearch()" class="hidden text-slate-400 hover:text-slate-600 font-bold text-xs p-1" title="Xóa" aria-label="Xóa tìm kiếm">✕</button>
          </div>
          <div id="admin-search-results" class="hidden absolute right-2.5 sm:right-0 top-12 sm:top-11 w-[calc(100vw-1.25rem)] sm:w-96 max-h-96 overflow-y-auto bg-white rounded-xl shadow-2xl border border-slate-200 z-50 divide-y divide-slate-100 p-2"></div>
        </div>

        <button type="button" onclick="openQRScannerModal()" class="h-9 px-2.5 sm:px-3 rounded-lg text-xs bg-[#0F172A] hover:bg-slate-800 text-white font-bold flex items-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer" title="Quét mã QR Check-in">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect width="10" height="10" x="7" y="7" rx="1"/></svg>
          <span class="hidden 2xl:inline">Quét QR Check-in</span>
          <span class="hidden sm:inline 2xl:hidden">Quét QR</span>
          <span class="sm:hidden">QR</span>
        </button>
        <button type="button" onclick="switchAdminTab('quick-booking')" class="h-9 px-2.5 sm:px-3 rounded-lg text-xs btn-primary font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer" title="Đặt sân tại quầy">
          <svg class="hidden sm:inline-block shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span class="hidden sm:inline">Đặt sân tại quầy</span>
          <span class="sm:hidden">+ Đặt</span>
        </button>
      </div>
    </header>
