      <!-- TAB 6: KHÁCH HÀNG & HỘI VIÊN (Frame 16) -->
      <!-- ========================================== -->
      <div id="tab-content-customers" class="space-y-4 hidden">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 class="font-heading font-bold text-base text-[#0F172A]">Danh sách khách hàng &amp; Hội viên</h3>
            <p class="text-xs text-[#64748B]">Theo dõi lịch sử thi đấu, công nợ chưa thu, cảnh báo bùng sân (No-Show) và phân hạng hội viên</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <div class="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-xl border border-[#E2E8F0]">
              <button type="button" id="cust-filter-all" onclick="filterAdminCustomers('all')" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#16A34A] text-white cursor-pointer">Tất cả khách</button>
              <button type="button" id="cust-filter-debt" onclick="filterAdminCustomers('debt')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer">💸 Đang nợ chưa thu</button>
              <button type="button" id="cust-filter-noshow" onclick="filterAdminCustomers('noshow')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer">⚠️ Hay bùng sân (≥2 No-Show)</button>
            </div>
            <div class="relative w-full sm:w-64">
              <input type="text" id="admin-cust-search" oninput="renderAdminCustomers()" placeholder="Tìm theo tên hoặc SĐT..." class="w-full h-9 px-3 pl-8 rounded-lg border border-[#E2E8F0] bg-white text-xs text-[#0F172A] placeholder-[#94A3B8] outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="absolute left-2.5 top-2.5 text-slate-400"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
          </div>
        </div>

        <div class="ui-card overflow-x-auto">
          <table class="w-full text-left text-xs min-w-[820px]">
            <thead class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
              <tr>
                <th class="py-3 px-4">Tên hội viên</th>
                <th class="py-3 px-4">Số điện thoại</th>
                <th class="py-3 px-4">Hạng thẻ</th>
                <th class="py-3 px-4">Tổng số trận</th>
                <th class="py-3 px-4">Điểm tích lũy</th>
                <th class="py-3 px-4 text-center">Lịch sử Bùng/No-Show</th>
                <th class="py-3 px-4 text-right">Công nợ chưa thu</th>
                <th class="py-3 px-4 text-right">Tổng chi tiêu</th>
              </tr>
            </thead>
            <tbody id="admin-customers-tbody" class="divide-y divide-[#E2E8F0]">
            </tbody>
          </table>
        </div>
      </div>
