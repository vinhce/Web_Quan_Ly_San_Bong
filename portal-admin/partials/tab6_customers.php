      <!-- TAB 6: KHÁCH HÀNG & HỘI VIÊN (Frame 16) -->
      <!-- ========================================== -->
      <div id="tab-content-customers" class="space-y-4 hidden">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 class="font-heading font-bold text-base text-[#0F172A]">Danh sách khách hàng & Hội viên</h3>
            <p class="text-xs text-[#64748B]">Theo dõi lịch sử thi đấu, tổng chi tiêu và phân hạng hội viên tích điểm</p>
          </div>
          <div class="relative w-full sm:w-72">
            <input type="text" id="admin-cust-search" oninput="renderAdminCustomers()" placeholder="Tìm theo tên hoặc SĐT..." class="w-full h-9 px-3 pl-8 rounded-lg border border-[#E2E8F0] bg-white text-xs text-[#0F172A] placeholder-[#94A3B8] outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="absolute left-2.5 top-2.5 text-slate-400"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
        </div>

        <div class="ui-card overflow-hidden">
          <table class="w-full text-left text-xs">
            <thead class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
              <tr>
                <th class="py-3 px-4">Tên hội viên</th>
                <th class="py-3 px-4">Số điện thoại</th>
                <th class="py-3 px-4">Hạng thẻ</th>
                <th class="py-3 px-4">Điểm tích lũy</th>
                <th class="py-3 px-4">Tổng số trận</th>
                <th class="py-3 px-4 text-right">Tổng chi tiêu</th>
              </tr>
            </thead>
            <tbody id="admin-customers-tbody" class="divide-y divide-[#E2E8F0]">
            </tbody>
          </table>
        </div>
      </div>
