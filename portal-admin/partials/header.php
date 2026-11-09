    <header class="h-16 bg-white border-b border-[#E2E8F0] px-6 flex items-center justify-between shrink-0">
      <div class="flex items-baseline gap-3">
        <h1 id="admin-module-title" class="font-heading font-extrabold text-xl text-[#0F172A]">1. Tổng quan hệ thống</h1>
        <span id="admin-module-subtitle" class="text-xs text-[#64748B]">Thứ Sáu, 06/11/2026 · Cập nhật trực tiếp</span>
      </div>

      <div class="flex items-center gap-3">
        <div class="relative">
          <div class="w-64 md:w-80 h-9 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 flex items-center gap-2 text-xs focus-within:border-[#16A34A] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#16A34A]/20 transition-all">
            <button type="button" onclick="performAdminSearch()" class="text-[#94A3B8] hover:text-[#16A34A] shrink-0" title="Tìm kiếm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </button>
            <input type="text" id="admin-global-search" oninput="performAdminSearch()" onkeydown="if(event.key==='Enter')performAdminSearch()" placeholder="Tìm mã đơn, SĐT khách..." class="w-full bg-transparent border-none outline-none text-xs text-[#0F172A] placeholder-[#94A3B8] font-medium" autocomplete="off">
            <button type="button" id="admin-search-clear" onclick="clearAdminSearch()" class="hidden text-slate-400 hover:text-slate-600 font-bold text-xs p-1" title="Xóa">✕</button>
          </div>
          <!-- Dropdown kết quả tìm kiếm tức thì -->
          <div id="admin-search-results" class="hidden absolute right-0 top-11 w-96 max-h-96 overflow-y-auto bg-white rounded-xl shadow-2xl border border-slate-200 z-50 divide-y divide-slate-100 p-2"></div>
        </div>
        <button onclick="switchAdminTab('quick-booking')" class="btn-sm btn-primary">
          + Đặt sân tại quầy
        </button>
      </div>
    </header>