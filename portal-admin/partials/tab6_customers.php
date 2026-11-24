      <!-- TAB 6: KHÁCH HÀNG & HỘI VIÊN (Frame 16) -->
      <!-- ========================================== -->
      <div id="tab-content-customers" class="space-y-4 hidden">
        <style>
          #customer-crm-form #crm-form-note {
            display: block;
            height: 2.25rem;
            min-height: 2.25rem;
            padding: 0.4375rem 0.75rem;
            line-height: 1.35;
            resize: vertical;
          }
        </style>
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 class="font-heading font-bold text-base text-[#0F172A]">Danh sách khách hàng &amp; Hội viên</h3>
            <p class="text-xs text-[#64748B]">Theo dõi lịch sử thi đấu, tích lũy điểm thưởng và phân hạng hội viên</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <div class="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-xl border border-[#E2E8F0]">
              <button type="button" id="cust-filter-all" onclick="filterAdminCustomers('all')" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#16A34A] text-white cursor-pointer">Tất cả khách</button>
              <button type="button" id="cust-filter-vip" onclick="filterAdminCustomers('vip')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer">Hội viên VIP</button>
            </div>
            <div class="relative w-full sm:w-80">
              <input type="text" id="admin-cust-search" oninput="handleCustomerSearchDebounced()" placeholder="Tìm theo SĐT (+84, vài số cuối) hoặc họ tên..." class="w-full h-9 px-3 pl-8 rounded-lg border border-[#E2E8F0] bg-white text-xs text-[#0F172A] placeholder-[#94A3B8] outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="absolute left-2.5 top-2.5 text-slate-400"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
          </div>
        </div>

        <div class="ui-card overflow-x-auto">
          <table class="w-full text-left text-xs min-w-[1040px]">
            <thead id="admin-customers-thead" class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
              <tr>
                <th class="py-3 px-4 text-left">Tên hội viên</th>
                <th class="py-3 px-4 text-left">Số điện thoại</th>
                <th class="py-3 px-4 text-left">Hạng</th>
                <th class="py-3 px-4 text-right">Trận hoàn thành</th>
                <th class="py-3 px-4 text-right">Điểm tích lũy</th>
                <th class="py-3 px-4 text-left">Đặt gần nhất</th>
                <th class="py-3 px-4 text-right">Tổng chi tiêu</th>
                <th class="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody id="admin-customers-tbody" class="divide-y divide-[#E2E8F0]">
            </tbody>
          </table>
        </div>

        <!-- Modal Hồ Sơ CRM & Quản Lý Hội Viên (Unified CRM & Edit Member) -->
        <div id="customer-crm-modal" role="dialog" aria-modal="true" aria-labelledby="customer-crm-modal-title" class="hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm items-center justify-center p-4 overflow-y-auto" onclick="if(event.target===this) closeCustomerCrmModal()">
          <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            <div class="px-5 py-4 bg-[#0F172A] text-white flex items-center justify-between gap-3 shrink-0">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                </span>
                <div class="min-w-0">
                  <h4 id="customer-crm-modal-title" class="font-heading font-extrabold text-sm truncate">Hồ Sơ CRM &amp; Quản Lý Hội Viên</h4>
                  <p class="text-[11px] text-slate-300 truncate">SĐT: <span id="crm-phone-label" class="font-mono font-bold text-emerald-400">---</span> | Phân hạng: <span id="crm-tier-badge" class="inline-block">---</span></p>
                </div>
              </div>
              <button type="button" onclick="closeCustomerCrmModal()" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-sm flex items-center justify-center shrink-0 cursor-pointer" aria-label="Đóng">✕</button>
            </div>

            <div class="p-5 overflow-y-auto space-y-5 text-xs flex-1">
              <!-- 4 Top Cards (Trận hoàn thành, Vắng mặt/Hủy, Điểm tích lũy, Tổng chi tiêu) -->
              <div id="crm-summary-stats" class="grid grid-cols-2 sm:grid-cols-4 gap-3"></div>

              <!-- Unified Customer & Member Edit Form (ONE Save Button) -->
              <form id="customer-crm-form" onsubmit="saveCustomerCrm(event)" class="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-4">
                <input type="hidden" id="crm-form-user-id">
                <input type="hidden" id="crm-form-updated-at">
                <input type="hidden" id="crm-form-old-points" value="0">
                <input type="hidden" id="crm-form-old-tier" value="standard">
                <input type="hidden" id="crm-form-old-phone" value="">

                <div class="font-heading font-bold text-xs text-[#0F172A] pb-1 border-b border-slate-200 flex items-center justify-between">
                  <span>Thông tin hồ sơ &amp; Cấu hình hội viên</span>
                  <span class="text-[11px] font-normal text-slate-500">Các mục có dấu <span class="text-rose-500">*</span> là bắt buộc</span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label for="crm-form-name" class="block text-[11px] font-bold text-[#475569] mb-1">Tên hội viên / Đội bóng <span class="text-rose-500">*</span></label>
                    <input type="text" id="crm-form-name" required placeholder="Tên hội viên hoặc đội bóng" class="input-field h-9 text-xs font-semibold bg-white w-full">
                  </div>
                  <div>
                    <label for="crm-form-phone" class="block text-[11px] font-bold text-[#475569] mb-1">Số điện thoại <span class="text-rose-500">*</span></label>
                    <input type="text" id="crm-form-phone" required placeholder="09xxxxxxxx" class="input-field h-9 text-xs font-mono font-bold bg-white w-full">
                  </div>
                  <div>
                    <label for="crm-form-email" class="block text-[11px] font-bold text-[#475569] mb-1">Email liên hệ</label>
                    <input type="email" id="crm-form-email" placeholder="email@example.com" class="input-field h-9 text-xs bg-white w-full">
                  </div>
                </div>

                <!-- Phân hạng (Auto / Override with reason) & Ghi chú chăm sóc khách hàng cùng 1 hàng 2 cột -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start p-3 rounded-xl bg-white border border-slate-200">
                  <div class="space-y-1.5">
                    <label for="crm-form-tier" class="block text-[11px] font-bold text-[#475569]">Phân hạng hội viên <span class="text-rose-500">*</span></label>
                    <select id="crm-form-tier" onchange="handleCrmTierChange()" class="input-field h-9 text-xs font-bold bg-white w-full">
                      <option value="auto">Tự động (Theo chi tiêu &amp; số trận)</option>
                      <option value="standard">Khách tiêu chuẩn (standard)</option>
                      <option value="vip">Hội viên VIP (vip)</option>
                    </select>
                    <div id="crm-form-tier-reason-wrap" class="hidden pt-1">
                      <label for="crm-form-tier-reason" class="block text-[11px] font-bold text-amber-800 mb-1">Lý do điều chỉnh phân hạng <span class="text-rose-500">*</span></label>
                      <input type="text" id="crm-form-tier-reason" placeholder="VD: Khách hàng thân thiết, đặc cách tài trợ (≥10 ký tự)..." class="input-field h-8 text-xs bg-amber-50/50 border-amber-300 w-full">
                    </div>
                  </div>

                  <div class="space-y-1.5">
                    <label for="crm-form-note" class="block text-[11px] font-bold text-[#475569]">Ghi chú chăm sóc khách hàng (CRM Notes)</label>
                    <textarea id="crm-form-note" rows="1" placeholder="VD: Khách đặt cố định tối thứ 5 hàng tuần, ưu tiên Sân 7-A..." class="input-field w-full h-9 text-xs bg-white"></textarea>
                  </div>
                </div>

                <!-- Điều chỉnh điểm tích lũy (+/- hoặc điểm mới kèm lý do bắt buộc) -->
                <div class="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2.5">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-slate-700 text-xs">Điểm tích lũy hiện tại:</span>
                      <span id="crm-current-points-badge" class="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">0 điểm</span>
                    </div>
                    <span id="crm-points-diff-hint" class="text-xs font-bold text-slate-500 hidden"></span>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label for="crm-form-points" class="block text-[11px] font-bold text-[#475569] mb-1">Điểm tích lũy mới</label>
                      <input type="number" id="crm-form-points" min="0" max="10000000" placeholder="0" class="input-field h-9 text-xs font-bold text-emerald-700 bg-white w-full" oninput="handleCrmPointsChange('absolute')">
                    </div>
                    <div>
                      <label for="crm-form-points-delta" class="block text-[11px] font-bold text-[#475569] mb-1">Hoặc thay đổi nhanh (+/- Điểm)</label>
                      <input type="number" id="crm-form-points-delta" placeholder="+/- Điểm (VD: 50 hoặc -20)" class="input-field h-9 text-xs font-bold text-[#0F172A] bg-white w-full" oninput="handleCrmPointsChange('delta')">
                    </div>
                  </div>

                  <div id="crm-form-points-reason-wrap" class="hidden pt-1">
                    <label for="crm-form-points-reason" class="block text-[11px] font-bold text-amber-800 mb-1">Lý do điều chỉnh điểm <span class="text-rose-500">*</span> (Bắt buộc ≥ 10 ký tự)</label>
                    <input type="text" id="crm-form-points-reason" placeholder="VD: Thưởng giải đấu, đền bù giờ sân, đổi quà..." class="input-field h-8 text-xs bg-amber-50/50 border-amber-300 w-full">
                  </div>
                </div>

                <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button type="button" onclick="closeCustomerCrmModal()" class="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer transition-colors">Đóng</button>
                  <button type="submit" id="btn-submit-crm" class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-sm transition-colors flex items-center gap-1.5">
                    <span>Lưu hồ sơ hội viên</span>
                  </button>
                </div>
              </form>

              <!-- Read-only Tab Navigation (Lịch sử đặt sân, Lịch sử điểm, Lịch sử chỉnh sửa) -->
              <div class="border-t border-slate-200 pt-4 space-y-3">
                <div class="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
                  <button type="button" id="crm-subtab-bookings-btn" onclick="switchCrmSubTab('bookings')" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0F172A] text-white cursor-pointer">
                    Lịch sử đặt sân (<span id="crm-bookings-count-badge">0</span>)
                  </button>
                  <button type="button" id="crm-subtab-points-btn" onclick="switchCrmSubTab('points')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer">
                    Lịch sử điểm (<span id="crm-points-count-badge">0</span>)
                  </button>
                  <button type="button" id="crm-subtab-audit-btn" onclick="switchCrmSubTab('audit')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer">
                    Lịch sử chỉnh sửa hồ sơ (<span id="crm-audit-count-badge">0</span>)
                  </button>
                </div>

                <!-- Subtab 1: Lịch sử đặt sân (dd/mm/yyyy, newest first, badge Sắp tới, xem thêm) -->
                <div id="crm-subtab-bookings" class="space-y-2">
                  <div class="overflow-x-auto border border-[#E2E8F0] rounded-xl">
                    <table class="w-full text-left text-xs border-collapse min-w-[540px]">
                      <thead class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
                        <tr>
                          <th class="py-2.5 px-3">Mã đơn</th>
                          <th class="py-2.5 px-3">Ngày &amp; Sân</th>
                          <th class="py-2.5 px-3">Khung giờ</th>
                          <th class="py-2.5 px-3 text-right">Tổng tiền</th>
                          <th class="py-2.5 px-3 text-right">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody id="crm-history-tbody" class="divide-y divide-[#F1F5F9]">
                        <tr><td colspan="5" class="py-4 text-center text-[#94A3B8]">Đang tải lịch sử đặt sân...</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div id="crm-bookings-pagination" class="flex justify-between items-center text-xs text-[#64748B] pt-1"></div>
                </div>

                <!-- Subtab 2: Lịch sử điểm (recent 10 rows + xem thêm) -->
                <div id="crm-subtab-points" class="space-y-2 hidden">
                  <div class="overflow-x-auto border border-[#E2E8F0] rounded-xl">
                    <table class="w-full text-left text-xs border-collapse min-w-[540px]">
                      <thead class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
                        <tr>
                          <th class="py-2.5 px-3">Thời gian</th>
                          <th class="py-2.5 px-3 text-right">Biến động</th>
                          <th class="py-2.5 px-3 text-right">Số dư sau</th>
                          <th class="py-2.5 px-3">Lý do</th>
                          <th class="py-2.5 px-3">Người thực hiện</th>
                        </tr>
                      </thead>
                      <tbody id="crm-points-log-tbody" class="divide-y divide-[#F1F5F9]">
                        <tr><td colspan="5" class="py-4 text-center text-[#94A3B8]">Đang tải lịch sử điểm...</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div id="crm-points-log-pagination" class="flex justify-between items-center text-xs text-[#64748B] pt-1"></div>
                </div>

                <!-- Subtab 3: Lịch sử chỉnh sửa hồ sơ (Admin Log rows) -->
                <div id="crm-subtab-audit" class="space-y-2 hidden">
                  <div class="overflow-x-auto border border-[#E2E8F0] rounded-xl">
                    <table class="w-full text-left text-xs border-collapse min-w-[540px]">
                      <thead class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
                        <tr>
                          <th class="py-2.5 px-3">Thời gian</th>
                          <th class="py-2.5 px-3">Quản trị viên</th>
                          <th class="py-2.5 px-3">Nội dung thay đổi</th>
                          <th class="py-2.5 px-3">Địa chỉ IP</th>
                        </tr>
                      </thead>
                      <tbody id="crm-audit-log-tbody" class="divide-y divide-[#F1F5F9]">
                        <tr><td colspan="4" class="py-4 text-center text-[#94A3B8]">Đang tải lịch sử chỉnh sửa...</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div id="crm-audit-log-pagination" class="flex justify-between items-center text-xs text-[#64748B] pt-1"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
