      <!-- TAB 8: BÁO CÁO THỐNG KÊ (Frame 18) -->
      <!-- ========================================== -->
      <div id="tab-content-reports" class="space-y-6 hidden">
        <div class="ui-card p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 class="font-heading font-bold text-base text-[#0F172A]">Báo cáo hiệu suất & Doanh thu sân bóng</h3>
            <p class="text-xs text-[#64748B]">Tổng hợp số liệu thực tế từ cơ sở dữ liệu hệ thống (Không cộng số ảo)</p>
          </div>
          <div class="flex flex-wrap items-center gap-2 text-xs">
            <div class="flex items-center gap-1.5">
              <span class="text-[#64748B] font-semibold">Từ:</span>
              <input type="date" id="rpt-from-date" class="h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white font-bold text-[#0F172A]">
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-[#64748B] font-semibold">Đến:</span>
              <input type="date" id="rpt-to-date" class="h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white font-bold text-[#0F172A]">
            </div>
            <button type="button" onclick="renderAdminReports()" class="h-8 px-3 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white font-bold cursor-pointer">Lọc báo cáo</button>
            <button type="button" id="btn-export-reports-csv" onclick="exportAdminReportsCSV()" class="h-8 px-3 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-sm">📥 Xuất Excel / CSV</button>
            <div class="flex items-center gap-1 border-l border-[#E2E8F0] pl-2">
              <button type="button" onclick="setReportDateRange('today')" class="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[#334155] font-semibold cursor-pointer">Hôm nay</button>
              <button type="button" onclick="setReportDateRange('7days')" class="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[#334155] font-semibold cursor-pointer">7 ngày qua</button>
              <button type="button" onclick="setReportDateRange('month')" class="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[#334155] font-semibold cursor-pointer">Tháng này</button>
              <button type="button" onclick="setReportDateRange('all')" class="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-[#15803D] font-bold cursor-pointer">Tất cả</button>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="ui-card p-5 border-l-4 border-l-[#16A34A]">
            <div class="text-xs text-[#64748B]">Tổng doanh thu thực</div>
            <div id="rpt-total-revenue" class="font-heading font-extrabold text-2xl text-[#16A34A] mt-1">0đ</div>
            <div class="text-[11px] text-[#64748B] mt-1">Bao gồm tiền sân & dịch vụ thực thu</div>
          </div>
          <div class="ui-card p-5 border-l-4 border-l-[#0F172A]">
            <div class="text-xs text-[#64748B]">Tổng số ca thi đấu</div>
            <div id="rpt-total-matches" class="font-heading font-extrabold text-2xl text-[#0F172A] mt-1">0 ca</div>
            <div class="text-[11px] text-[#16A34A] mt-1">Đơn hợp lệ trong kỳ lọc</div>
          </div>
          <div class="ui-card p-5 border-l-4 border-l-[#2563EB]">
            <div class="text-xs text-[#64748B]">Doanh thu dịch vụ (Nước/Bib/Bóng)</div>
            <div id="rpt-services-revenue" class="font-heading font-extrabold text-2xl text-[#2563EB] mt-1">0đ</div>
            <div class="text-[11px] text-[#64748B] mt-1">Dịch vụ gia tăng tại sân</div>
          </div>
          <div class="ui-card p-5 border-l-4 border-l-[#D97706]">
            <div class="text-xs text-[#64748B]">Doanh thu trung bình / ca</div>
            <div id="rpt-avg-revenue" class="font-heading font-extrabold text-2xl text-[#D97706] mt-1">0đ</div>
            <div class="text-[11px] text-[#64748B] mt-1">Trung bình mỗi trận đấu</div>
          </div>
        </div>

        <!-- Bóc tách dòng tiền: Cọc 30% / Thu 70% còn lại / Tiền mặt / Chuyển khoản VietQR -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="ui-card p-4 bg-emerald-50/40 border border-emerald-200">
            <div class="text-xs font-semibold text-[#475569]">Tiền cọc 30% đã thu</div>
            <div id="rpt-deposit-revenue" class="font-heading font-extrabold text-xl text-[#15803D] mt-1">0đ</div>
            <div class="text-[11px] text-[#64748B] mt-0.5">Cọc giữ sân đã xác nhận</div>
          </div>
          <div class="ui-card p-4 bg-blue-50/40 border border-blue-200">
            <div class="text-xs font-semibold text-[#475569]">Tiền thu 70% còn lại</div>
            <div id="rpt-remaining-revenue" class="font-heading font-extrabold text-xl text-[#2563EB] mt-1">0đ</div>
            <div class="text-[11px] text-[#64748B] mt-0.5">Tất toán sau khi kết thúc ca</div>
          </div>
          <div class="ui-card p-4 bg-amber-50/40 border border-amber-200">
            <div class="text-xs font-semibold text-[#475569]">Thu Tiền mặt tại quầy</div>
            <div id="rpt-cash-revenue" class="font-heading font-extrabold text-xl text-[#D97706] mt-1">0đ</div>
            <div class="text-[11px] text-[#64748B] mt-0.5">Khách thanh toán tiền mặt</div>
          </div>
          <div class="ui-card p-4 bg-purple-50/40 border border-purple-200">
            <div class="text-xs font-semibold text-[#475569]">Thu Chuyển khoản VietQR</div>
            <div id="rpt-vietqr-revenue" class="font-heading font-extrabold text-xl text-purple-700 mt-1">0đ</div>
            <div class="text-[11px] text-[#64748B] mt-0.5">Qua cổng VietQR / SePay</div>
          </div>
        </div>

        <!-- Phân bổ theo loại sân -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div class="ui-card p-5 flex items-center justify-between">
            <div>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">Sân 5 người (6 sân)</span>
              <div id="rpt-p5-revenue" class="font-heading font-extrabold text-xl text-[#0F172A] mt-2">0đ</div>
              <div id="rpt-p5-count" class="text-xs text-[#64748B] mt-0.5">0 ca đặt</div>
            </div>
            <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl">5v5</div>
          </div>
          <div class="ui-card p-5 flex items-center justify-between">
            <div>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">Sân 7 người (8 sân)</span>
              <div id="rpt-p7-revenue" class="font-heading font-extrabold text-xl text-[#0F172A] mt-2">0đ</div>
              <div id="rpt-p7-count" class="text-xs text-[#64748B] mt-0.5">0 ca đặt</div>
            </div>
            <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl">7v7</div>
          </div>
          <div class="ui-card p-5 flex items-center justify-between">
            <div>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">Sân 11 người (3 sân)</span>
              <div id="rpt-p11-revenue" class="font-heading font-extrabold text-xl text-[#0F172A] mt-2">0đ</div>
              <div id="rpt-p11-count" class="text-xs text-[#64748B] mt-0.5">0 ca đặt</div>
            </div>
            <div class="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xl">11v11</div>
          </div>
        </div>

        <!-- Bảng kê doanh thu theo từng sân -->
        <div class="ui-card overflow-hidden">
          <div class="p-4 border-b border-[#E2E8F0] font-heading font-bold text-sm text-[#0F172A]">
            Bảng kê hiệu suất khai thác chi tiết theo từng sân bóng
          </div>
          <table class="w-full text-left text-xs">
            <thead class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
              <tr>
                <th class="py-3 px-4">Tên sân</th>
                <th class="py-3 px-4">Loại sân</th>
                <th class="py-3 px-4">Trạng thái</th>
                <th class="py-3 px-4 text-center">Số ca đã đá</th>
                <th class="py-3 px-4 text-right">Tổng doanh thu</th>
              </tr>
            </thead>
            <tbody id="admin-reports-tbody" class="divide-y divide-[#E2E8F0]">
            </tbody>
          </table>
        </div>
      </div>
