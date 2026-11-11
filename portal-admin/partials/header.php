    <header class="min-h-16 bg-white border-b border-[#E2E8F0] px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
      <div class="flex items-center gap-2.5 min-w-0">
        <button type="button" id="admin-mobile-menu-btn" onclick="toggleAdminMobileDrawer()" class="md:hidden w-9 h-9 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-50 flex items-center justify-center text-[#0F172A] font-bold shrink-0 cursor-pointer" aria-label="Mở menu">☰</button>
        <div class="flex flex-col sm:flex-row sm:items-baseline sm:gap-3 min-w-0">
          <h1 id="admin-module-title" class="font-heading font-extrabold text-base sm:text-xl text-[#0F172A] truncate">1. Tổng quan hệ thống</h1>
          <span id="admin-module-subtitle" class="text-[11px] sm:text-xs text-[#64748B] truncate">Cập nhật trực tiếp</span>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2 sm:gap-3 w-full xl:w-auto justify-between sm:justify-end">
        <div class="relative w-full sm:w-auto">
          <div class="w-full sm:w-64 md:w-72 h-9 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 flex items-center gap-2 text-xs focus-within:border-[#16A34A] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#16A34A]/20 transition-all">
            <button type="button" onclick="performAdminSearch()" class="text-[#94A3B8] hover:text-[#16A34A] shrink-0" title="Tìm kiếm" aria-label="Tìm kiếm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </button>
            <input type="text" id="admin-global-search" oninput="performAdminSearch()" onkeydown="if(event.key==='Enter')performAdminSearch()" placeholder="Tìm mã đơn, SĐT khách..." class="w-full bg-transparent border-none outline-none text-xs text-[#0F172A] placeholder-[#94A3B8] font-medium" autocomplete="off">
            <button type="button" id="admin-search-clear" onclick="clearAdminSearch()" class="hidden text-slate-400 hover:text-slate-600 font-bold text-xs p-1" title="Xóa" aria-label="Xóa tìm kiếm">✕</button>
          </div>
          <!-- Dropdown kết quả tìm kiếm tức thì -->
          <div id="admin-search-results" class="hidden absolute right-0 top-11 w-[calc(100vw-1.5rem)] sm:w-96 max-h-96 overflow-y-auto bg-white rounded-xl shadow-2xl border border-slate-200 z-50 divide-y divide-slate-100 p-2"></div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" onclick="openQRScannerModal()" class="btn-sm bg-[#0F172A] hover:bg-slate-800 text-white font-bold flex items-center gap-1.5 shadow-sm whitespace-nowrap"><span>📷</span> Quét QR Check-in</button>
          <button type="button" onclick="switchAdminTab('quick-booking'); document.getElementById('shift-handover-card')?.scrollIntoView({behavior:'smooth'});" class="btn-sm bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap">
            <span>🧾</span> Chốt ca / Giao ca
          </button>
          <button type="button" onclick="switchAdminTab('quick-booking')" class="btn-sm btn-primary whitespace-nowrap">
            + Đặt sân tại quầy
          </button>
        </div>
      </div>
    </header>