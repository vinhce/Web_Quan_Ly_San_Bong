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
              <button type="button" id="cust-filter-vip" onclick="filterAdminCustomers('vip')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer">Hội viên VIP</button>
              <button type="button" id="cust-filter-regular" onclick="filterAdminCustomers('regular')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer">Khách quen</button>
            </div>
            <div class="relative w-full sm:w-80">
              <input type="text" id="admin-cust-search" oninput="handleCustomerSearchDebounced()" placeholder="Tìm theo SĐT (+84, vài số cuối) hoặc họ tên..." class="w-full h-9 px-3 pl-8 rounded-lg border border-[#E2E8F0] bg-white text-xs text-[#0F172A] placeholder-[#94A3B8] outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="absolute left-2.5 top-2.5 text-slate-400"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
          </div>
        </div>

        <div class="ui-card overflow-x-auto">
          <table class="w-full text-left text-xs min-w-[1040px]">
            <thead class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
              <tr>
                <th class="py-3 px-4 text-left">Tên hội viên</th>
                <th class="py-3 px-4 text-left">Số điện thoại</th>
                <th class="py-3 px-4 text-right">Trận hoàn thành</th>
                <th class="py-3 px-4 text-right">Điểm tích lũy</th>
                <th class="py-3 px-4 text-left">Đặt gần nhất</th>
                <th class="py-3 px-4 text-left">Số lượt đặt</th>
                <th class="py-3 px-4 text-right">Công nợ</th>
                <th class="py-3 px-4 text-right">Tổng chi tiêu</th>
                <th class="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody id="admin-customers-tbody" class="divide-y divide-[#E2E8F0]">
            </tbody>
          </table>
        </div>

        <!-- Modal Hồ Sơ CRM & Lịch Sử Khách Hàng -->
        <div id="customer-crm-modal" role="dialog" aria-modal="true" aria-labelledby="customer-crm-modal-title" class="hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm items-center justify-center p-4 overflow-y-auto" onclick="if(event.target===this) closeCustomerCrmModal()">
          <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            <div class="px-5 py-4 bg-[#0F172A] text-white flex items-center justify-between gap-3 shrink-0">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-emerald-400 shrink-0">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                </span>
                <div class="min-w-0">
                  <h4 id="customer-crm-modal-title" class="font-heading font-extrabold text-sm truncate">Hồ Sơ CRM &amp; Lịch Sử Khách Hàng</h4>
                  <p class="text-[11px] text-slate-300 truncate">SĐT khách hàng: <span id="crm-phone-label" class="font-mono font-bold text-emerald-400">---</span></p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <?php if (!isset($isOwnerAdmin) || $isOwnerAdmin): ?>
                <button type="button" id="crm-open-edit-member-btn" onclick="openEditMemberModalFromCrm()" class="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors" title="Chỉnh sửa thông tin hội viên">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  <span>Sửa hội viên</span>
                </button>
                <?php endif; ?>
                <button type="button" onclick="closeCustomerCrmModal()" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-sm flex items-center justify-center shrink-0 cursor-pointer" aria-label="Đóng">✕</button>
              </div>
            </div>

            <div class="p-5 overflow-y-auto space-y-5 text-xs flex-1">
              <div id="crm-summary-stats" class="grid grid-cols-2 sm:grid-cols-4 gap-3"></div>

              <form id="customer-crm-form" onsubmit="saveCustomerCrm(event)" class="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
                <input type="hidden" id="crm-form-phone">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label for="crm-form-name" class="block text-[11px] font-bold text-[#475569] mb-1">Tên khách hàng / Đội bóng *</label>
                    <input type="text" id="crm-form-name" required placeholder="Tên hội viên hoặc đội bóng" class="input-field h-9 text-xs font-semibold bg-white">
                  </div>
                  <div>
                    <label for="crm-form-tier" class="block text-[11px] font-bold text-[#475569] mb-1">Phân hạng CRM *</label>
                    <select id="crm-form-tier" class="input-field h-9 text-xs font-bold bg-white">
                      <option value="standard">Khách tiêu chuẩn (standard)</option>
                      <option value="regular">Khách quen (regular)</option>
                      <option value="vip">Hội viên VIP (vip)</option>
                      <option value="warning_noshow">Cảnh báo No-Show (warning_noshow)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label class="flex items-center gap-2 text-xs font-bold text-[#DC2626] cursor-pointer select-none">
                    <input type="checkbox" id="crm-form-blacklist" class="w-4 h-4 rounded text-[#DC2626]">
                    <span>Khóa đặt sân / Đưa vào Danh sách đen</span>
                  </label>
                </div>
                <div>
                  <label for="crm-form-note" class="block text-[11px] font-bold text-[#475569] mb-1">Ghi chú chăm sóc khách hàng (CRM Note)</label>
                  <textarea id="crm-form-note" rows="3" placeholder="VD: Khách đặt cố định tối thứ 5 hàng tuần, ưu tiên Sân 7-A..." class="input-field w-full h-auto py-2 text-xs bg-white"></textarea>
                </div>
                <div class="flex items-center justify-end gap-2 pt-1">
                  <button type="button" onclick="closeCustomerCrmModal()" class="btn-sm btn-secondary cursor-pointer">Đóng</button>
                  <button type="submit" class="btn-sm btn-primary font-bold cursor-pointer">Lưu hồ sơ CRM</button>
                </div>
              </form>

              <div class="space-y-2">
                <h5 class="font-heading font-bold text-sm text-[#0F172A]">Lịch sử đặt sân của khách hàng</h5>
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
              </div>
            </div>
          </div>
        </div>

        <?php if (!isset($isOwnerAdmin) || $isOwnerAdmin): ?>
        <!-- Modal Sửa Thông Tin Hội Viên (C2) -->
        <div id="modal-edit-member" role="dialog" aria-modal="true" aria-labelledby="modal-edit-member-title" class="hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm items-center justify-center p-4 overflow-y-auto" onclick="if(event.target===this) closeEditMemberModal()">
          <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-auto max-h-[92vh] flex flex-col">
            <div class="px-5 py-4 bg-[#0F172A] text-white flex items-center justify-between gap-3 shrink-0">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                </span>
                <div class="min-w-0">
                  <h4 id="modal-edit-member-title" class="font-heading font-extrabold text-sm truncate">Sửa Thông Tin Hội Viên</h4>
                  <p class="text-[11px] text-slate-300 truncate">Cập nhật thông tin hội viên &amp; điều chỉnh điểm tích lũy</p>
                </div>
              </div>
              <button type="button" onclick="closeEditMemberModal()" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-sm flex items-center justify-center shrink-0 cursor-pointer" aria-label="Đóng">✕</button>
            </div>

            <form id="form-edit-member" onsubmit="handleEditMemberSubmit(event)" class="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              <input type="hidden" id="edit-member-id">
              <input type="hidden" id="edit-member-updated-at">
              <input type="hidden" id="edit-member-old-points" value="0">

              <div>
                <label for="edit-member-name" class="block text-xs font-bold text-slate-700 mb-1">Họ và tên hội viên <span class="text-rose-500">*</span></label>
                <input type="text" id="edit-member-name" required placeholder="Nhập họ và tên đầy đủ..." class="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs text-[#0F172A] placeholder-[#94A3B8] outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all font-semibold">
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label for="edit-member-phone" class="block text-xs font-bold text-slate-700 mb-1">Số điện thoại <span class="text-rose-500">*</span></label>
                  <input type="text" id="edit-member-phone" required placeholder="09xxxxxxxx hoặc +84..." class="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-mono text-[#0F172A] placeholder-[#94A3B8] outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all font-bold">
                </div>
                <div>
                  <label for="edit-member-email" class="block text-xs font-bold text-slate-700 mb-1">Email liên hệ</label>
                  <input type="email" id="edit-member-email" placeholder="email@example.com" class="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs text-[#0F172A] placeholder-[#94A3B8] outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all">
                </div>
              </div>

              <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-slate-700 text-xs">Điểm tích lũy hiện tại:</span>
                  <span id="edit-member-current-points-badge" class="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">0 điểm</span>
                </div>

                <div>
                  <label for="edit-member-points" class="block text-[11px] font-bold text-slate-700 mb-1">Điểm tích lũy mới</label>
                  <input type="number" id="edit-member-points" min="0" max="10000000" placeholder="0" class="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-bold text-emerald-700 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all" oninput="handleEditMemberPointsChange()">
                  <p id="edit-member-points-diff-hint" class="text-[11px] text-slate-500 mt-1 hidden"></p>
                </div>

                <div id="edit-member-points-reason-wrap" class="hidden">
                  <label for="edit-member-points-reason" class="block text-[11px] font-bold text-amber-800 mb-1">Lý do điều chỉnh điểm <span class="text-rose-500">*</span></label>
                  <input type="text" id="edit-member-points-reason" placeholder="VD: Thưởng giải đấu, đền bù giờ sân..." class="w-full h-9 px-3 rounded-lg border border-amber-300 bg-amber-50/50 text-xs text-[#0F172A] placeholder-amber-400 outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 transition-all">
                </div>
              </div>

              <div>
                <label for="edit-member-note" class="block text-xs font-bold text-slate-700 mb-1">Ghi chú quản trị (Admin Note)</label>
                <textarea id="edit-member-note" rows="3" placeholder="Ghi chú nội bộ cho hội viên này..." class="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-xs text-[#0F172A] placeholder-[#94A3B8] outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all resize-none"></textarea>
              </div>

              <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button type="button" onclick="closeEditMemberModal()" class="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer transition-colors">Hủy bỏ</button>
                <button type="submit" id="btn-submit-edit-member" class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-sm transition-colors flex items-center gap-1.5">
                  <span>Lưu thông tin</span>
                </button>
              </div>
            </form>
          </div>
        </div>
        <?php endif; ?>
      </div>
