  <aside class="w-64 bg-white border-r border-[#E2E8F0] flex flex-col justify-between shrink-0 select-none z-30">
    <div class="p-4">
      <!-- Admin Brand -->
      <a href="/" class="flex items-center gap-3 px-2 py-2 mb-6 group">
        <div class="w-9 h-9 rounded-[10px] bg-[#16A34A] text-white flex items-center justify-center shadow-md">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/></svg>
        </div>
        <div>
          <div class="font-heading font-extrabold text-base text-[#0F172A] leading-tight">Sân Bóng Pro</div>
          <div class="text-[11px] text-[#16A34A] font-semibold">Trang Quản Trị Hệ Thống</div>
        </div>
      </a>

      <!-- 9 Modules Navigation Tabs -->
      <nav class="space-y-1">
        <button onclick="switchAdminTab('overview')" id="nav-overview" class="w-full h-10 px-3 rounded-lg flex items-center gap-3 text-xs font-bold transition-all bg-[#DCFCE7] text-[#16A34A]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
          <span>1. Tổng quan & Đang chơi</span>
        </button>

        <button onclick="switchAdminTab('timeline')" id="nav-timeline" class="w-full h-10 px-3 rounded-lg flex items-center gap-3 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          <span>2. Lịch đặt sân Timeline</span>
        </button>


        <button onclick="switchAdminTab('quick-booking')" id="nav-quick-booking" class="w-full h-10 px-3 rounded-lg flex items-center gap-3 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="16"/><line x1="8" x2="8" y1="12" y2="12"/></svg>
          <span>3. Đặt sân tại quầy</span>
        </button>

        <button onclick="switchAdminTab('pitches')" id="nav-pitches" class="w-full h-10 px-3 rounded-lg flex items-center gap-3 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="12" x2="12" y1="5" y2="19"/><circle cx="12" cy="12" r="3"/></svg>
          <span>4. Quản lý sân bóng</span>
        </button>

        <button onclick="switchAdminTab('pricing')" id="nav-pricing" class="w-full h-10 px-3 rounded-lg flex items-center gap-3 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>
          <span>5. Bảng giá & Voucher</span>
        </button>

        <button onclick="switchAdminTab('customers')" id="nav-customers" class="w-full h-10 px-3 rounded-lg flex items-center gap-3 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span>6. Khách & Hội viên</span>
        </button>

        <button onclick="switchAdminTab('payments')" id="nav-payments" class="w-full h-10 px-3 rounded-lg flex items-center gap-3 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
          <span class="flex-1 text-left">7. Duyệt cọc VietQR</span>
          <span id="admin-payments-badge" class="px-1.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706] text-[10px] font-bold"></span>
        </button>

        <button onclick="switchAdminTab('reports')" id="nav-reports" class="w-full h-10 px-3 rounded-lg flex items-center gap-3 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>
          <span>8. Báo cáo doanh thu</span>
        </button>

        <button onclick="switchAdminTab('settings')" id="nav-settings" class="w-full h-10 px-3 rounded-lg flex items-center gap-3 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span>9. Cài đặt hệ thống</span>
        </button>
      </nav>
    </div>

    <!-- Admin User Bottom Pill -->
    <div class="p-4 border-t border-[#E2E8F0]">
      <div class="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div id="admin-avatar" class="w-8 h-8 rounded-full bg-[#0F172A] text-white font-heading font-bold text-xs flex items-center justify-center">
            AD
          </div>
          <div>
            <div id="admin-name" class="text-xs font-bold text-[#0F172A]">Ban Quản Trị</div>
            <div class="text-[10px] text-[#64748B]">Chủ sân · Toàn quyền</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <a href="/" class="text-xs font-semibold text-[#16A34A] hover:underline" title="Xem giao diện khách">
            Web ↗
          </a>
          <button type="button" onclick="handleAdminLogout()" class="text-xs font-semibold text-[#DC2626] hover:underline cursor-pointer" title="Đăng xuất quản trị">
            Thoát
          </button>
        </div>
      </div>
    </div>
  </aside>