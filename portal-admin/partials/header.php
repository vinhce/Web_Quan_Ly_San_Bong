    <header class="admin-header-bar h-16 bg-white border-b border-[#E2E8F0] px-3 sm:px-6 flex items-center justify-between gap-3 shrink-0 select-none" style="height:4rem;width:100%;display:flex;flex-direction:row;align-items:center;justify-content:space-between;flex-shrink:0;box-sizing:border-box;">
      <div class="flex items-center gap-2.5 min-w-0">
        <button type="button" id="admin-mobile-menu-btn" onclick="toggleAdminMobileDrawer()" class="md:hidden w-9 h-9 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-50 flex items-center justify-center text-[#0F172A] font-bold text-sm shrink-0 cursor-pointer" aria-label="Mở menu">☰</button>
        <div class="min-w-0 flex items-baseline gap-2">
          <h1 id="admin-module-title" class="font-heading font-extrabold text-sm sm:text-base lg:text-lg text-[#0F172A] whitespace-nowrap">1. Tổng quan</h1>
          <span id="admin-module-subtitle" class="hidden xl:inline-block text-[11px] text-[#64748B] whitespace-nowrap">Cập nhật trực tiếp</span>
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <div class="relative w-36 sm:w-52 md:w-64">
          <div class="w-full h-9 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 flex items-center gap-1.5 text-xs focus-within:border-[#16A34A] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#16A34A]/20 transition-all">
            <button type="button" onclick="performAdminSearch()" class="text-[#94A3B8] hover:text-[#16A34A] shrink-0" title="Tìm kiếm" aria-label="Tìm kiếm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </button>
            <input type="text" id="admin-global-search" oninput="performAdminSearch()" onkeydown="if(event.key==='Enter')performAdminSearch()" placeholder="Tìm mã đơn, SĐT..." class="w-full bg-transparent border-none outline-none text-xs text-[#0F172A] placeholder-[#94A3B8] font-medium" autocomplete="off">
            <button type="button" id="admin-search-clear" onclick="clearAdminSearch()" class="hidden text-slate-400 hover:text-slate-600 font-bold text-xs p-1" title="Xóa" aria-label="Xóa tìm kiếm">✕</button>
          </div>
          <div id="admin-search-results" class="hidden absolute right-0 top-11 w-[calc(100vw-1.5rem)] sm:w-96 max-h-96 overflow-y-auto bg-white rounded-xl shadow-2xl border border-slate-200 z-50 divide-y divide-slate-100 p-2"></div>
        </div>

        <button type="button" onclick="openQRScannerModal()" class="h-9 px-2.5 sm:px-3 rounded-lg text-xs bg-[#0F172A] hover:bg-slate-800 text-white font-bold flex items-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer" title="Quét mã QR Check-in">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect width="10" height="10" x="7" y="7" rx="1"/></svg>
          <span class="hidden sm:inline">Quét QR Check-in</span>
          <span class="sm:hidden">Quét QR</span>
        </button>
        <button type="button" onclick="switchAdminTab('quick-booking')" class="h-9 px-2.5 sm:px-3 rounded-lg text-xs btn-primary font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer" title="Đặt sân nhanh tại quầy">
          <span class="hidden sm:inline">+ Đặt sân tại quầy</span>
          <span class="sm:hidden">+ Đặt sân</span>
        </button>
      </div>
    </header>
