      <!-- TAB 9: CÀI ĐẶT HỆ THỐNG & QUẢN LÝ NHÂN VIÊN (Frame 19) -->
      <!-- ========================================== -->
      <div id="tab-content-settings" class="space-y-6 hidden">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <!-- Cột trái: Cấu hình thông số hệ thống & VietQR -->
          <div class="lg:col-span-5 ui-card p-6 space-y-4">
            <div class="flex items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
              <div>
                <h3 class="font-heading font-bold text-lg text-[#0F172A]">Cấu hình thông số hệ thống & VietQR</h3>
                <p class="text-xs text-[#64748B]">Thông tin nhận cọc SePay, hotline và tỷ lệ cọc được áp dụng tức thì</p>
              </div>
              <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 shrink-0">Hoạt động</span>
            </div>

            <form id="admin-settings-form" onsubmit="saveAdminSettings(event)" class="space-y-3 text-xs">
              <div>
                <label class="block font-bold text-[#475569] mb-1">Tỷ lệ đặt cọc bắt buộc (%)</label>
                <input type="number" id="cfg-deposit-rate" min="10" max="100" value="30" required class="input-field w-32 font-bold text-[#16A34A]">
                <span class="text-[11px] text-[#64748B] block mt-0.5">Mặc định 30% giá trị ca thi đấu</span>
              </div>
              <div>
                <label class="block font-bold text-[#475569] mb-1">Ngân hàng nhận tiền VietQR (SePay)</label>
                <input type="text" id="cfg-bank-name" value="Vietcombank" required class="input-field w-full font-semibold">
              </div>
              <div>
                <label class="block font-bold text-[#475569] mb-1">Mã ngân hàng (Bank Code chuẩn NAPAS)</label>
                <input type="text" id="cfg-bank-code" value="VCB" placeholder="VCB, MB, TCB, ACB..." required class="input-field w-full font-mono font-bold">
              </div>
              <div>
                <label class="block font-bold text-[#475569] mb-1">Số tài khoản thụ hưởng</label>
                <input type="text" id="cfg-bank-acc" value="0123456789" required class="input-field w-full font-mono font-bold text-sm">
              </div>
              <div>
                <label class="block font-bold text-[#475569] mb-1">Tên chủ tài khoản thụ hưởng</label>
                <input type="text" id="cfg-bank-holder" value="CONG TY CP SAN BONG PRO" required class="input-field w-full font-bold uppercase">
              </div>
              <div>
                <label class="block font-bold text-[#475569] mb-1">Hotline hỗ trợ 24/7</label>
                <input type="text" id="cfg-hotline" value="0352 313 548" required class="input-field w-full font-semibold">
              </div>
              <div>
                <label class="block font-bold text-[#475569] mb-1">Giờ mở cửa phục vụ</label>
                <input type="text" id="cfg-open-hours" value="05:30 - 23:00 hàng ngày (kể cả Lễ, Tết)" required class="input-field w-full">
              </div>

              <!-- Khối Chính Sách Giữ Chỗ & Hoàn/Phạt Cọc -->
              <div class="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3 mt-2">
                <div class="font-heading font-bold text-xs text-[#0F172A] flex items-center justify-between gap-2">
                  <span>⏱️ Chính Sách Giữ Chỗ &amp; Hoàn/Phạt Cọc</span>
                  <span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">Tự động hóa</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="block font-bold text-[#475569] mb-1">Thời gian giữ chỗ chưa cọc (phút)</label>
                    <input type="number" id="cfg-hold-minutes" min="5" max="120" value="15" required class="input-field w-full font-bold text-[#0F172A] bg-white">
                  </div>
                  <div>
                    <label class="block font-bold text-[#475569] mb-1">Mốc hoàn 100% cọc trước giờ đá (giờ)</label>
                    <input type="number" id="cfg-refund-full-hours" min="1" max="168" value="24" required class="input-field w-full font-bold text-[#16A34A] bg-white">
                  </div>
                  <div>
                    <label class="block font-bold text-[#475569] mb-1">Mốc sát giờ không hoàn cọc (giờ)</label>
                    <input type="number" id="cfg-refund-partial-hours" min="0" max="48" value="4" required class="input-field w-full font-bold text-[#D97706] bg-white">
                  </div>
                  <div class="flex items-end pb-1">
                    <label class="flex items-center gap-2 text-xs font-semibold text-[#0F172A] cursor-pointer select-none">
                      <input type="checkbox" id="cfg-auto-cancel-enabled" checked class="w-4 h-4 rounded text-[#16A34A]">
                      <span>Tự động nhả đơn quá hạn chưa cọc</span>
                    </label>
                  </div>
                </div>
              </div>

              <div class="pt-4 border-t border-[#E2E8F0] flex flex-wrap items-center justify-end gap-2">
                <button type="button" id="btn-run-auto-cancel-now" onclick="runAutoReleaseNow()" class="btn-base bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer">⚡ Quét nhả đơn quá hạn ngay</button>
                <button type="button" onclick="loadAdminSettings()" class="btn-base btn-secondary text-xs">Khôi phục</button>
                <button type="submit" class="btn-base btn-primary text-xs font-bold px-5">💾 Lưu cài đặt</button>
              </div>
            </form>
          </div>

          <!-- Cột phải: Quản lý Tài khoản Nhân sự & Quản lý Sân -->
          <div class="lg:col-span-7 ui-card p-6 space-y-5">
            <div class="flex flex-wrap sm:flex-nowrap items-start sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center text-lg shrink-0">👥</div>
                <div>
                  <h3 class="font-heading font-bold text-lg text-[#0F172A]">Tài khoản Nhân sự &amp; Quản lý Sân</h3>
                  <p class="text-xs text-[#64748B]">Cấp quyền cho Quản lý (Manager: Báo cáo, Kho, Ca, Duyệt cọc) hoặc Nhân viên trực ca (Staff)</p>
                </div>
              </div>
              <span id="staff-count-badge" class="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 shrink-0 whitespace-nowrap">0 Nhân sự</span>
            </div>

            <form id="admin-create-staff-form" onsubmit="handleCreateStaff(event)" class="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block font-bold text-[#475569] mb-1">Tên đăng nhập *</label>
                  <input type="text" id="staff-username" required minlength="3" maxlength="30" pattern="[a-zA-Z0-9_]+" placeholder="VD: baove_ca1" class="input-field w-full font-mono font-bold bg-white">
                </div>
                <div>
                  <label class="block font-bold text-[#475569] mb-1">Họ và tên *</label>
                  <input type="text" id="staff-fullname" required placeholder="VD: Nguyễn Văn Bình" class="input-field w-full font-semibold bg-white">
                </div>
                <div>
                  <label class="block font-bold text-[#475569] mb-1">Số điện thoại *</label>
                  <input type="tel" id="staff-phone" required placeholder="0912345678" class="input-field w-full font-semibold bg-white">
                </div>
                <div>
                  <label class="block font-bold text-[#475569] mb-1">Mật khẩu đăng nhập *</label>
                  <input type="password" id="staff-password" required minlength="6" placeholder="Tối thiểu 6 ký tự" class="input-field w-full bg-white">
                </div>
                <div class="sm:col-span-2">
                  <label class="block font-bold text-[#475569] mb-1">Vai trò phân quyền *</label>
                  <select id="staff-role" class="input-field w-full font-semibold bg-white">
                    <option value="staff">Nhân viên trực ca (Staff)</option>
                    <option value="manager">Quản lý sân (Manager - Kho, Ca, Báo cáo)</option>
                  </select>
                </div>
              </div>
              <div class="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p class="text-[11px] text-[#64748B] leading-snug">Staff chỉ vận hành trực sân; Manager xem được Báo cáo, Kho, Chốt ca &amp; Duyệt cọc VietQR.</p>
                <button type="submit" id="staff-create-submit-btn" class="btn-base btn-primary text-xs font-bold px-4 shrink-0 cursor-pointer">+ Tạo tài khoản Nhân sự</button>
              </div>
            </form>

            <div class="overflow-x-auto border border-[#E2E8F0] rounded-xl">
              <table class="w-full text-left text-xs min-w-[640px]">
                <thead class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
                  <tr>
                    <th class="py-3 px-4">Tài khoản</th>
                    <th class="py-3 px-4">Họ tên &amp; SĐT</th>
                    <th class="py-3 px-4">Vai trò</th>
                    <th class="py-3 px-4">Trạng thái</th>
                    <th class="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody id="admin-staff-tbody" class="divide-y divide-[#E2E8F0]"></tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Card Full-Width: Nhật Ký Kiểm Toán Hệ Thống (Audit Log - Chống Thất Thoát) -->
        <div id="admin-audit-logs-card" class="ui-card p-6 space-y-4">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center text-lg shrink-0">🛡️</div>
              <div>
                <h3 class="font-heading font-extrabold text-lg text-[#0F172A]">🛡️ Nhật Ký Kiểm Toán Hệ Thống (Audit Log - Chống Thất Thoát)</h3>
                <p class="text-xs text-[#B45309] font-semibold mt-0.5">Nhật ký chỉ ghi thêm tự động (Append-only), không ai có quyền chỉnh sửa hoặc xóa lịch sử thao tác.</p>
              </div>
            </div>

            <!-- Thanh bộ lọc Audit Log -->
            <div class="flex flex-wrap items-center gap-2 text-xs">
              <select id="audit-filter-user" onchange="loadAuditLogs()" class="h-9 px-2.5 rounded-lg border border-[#CBD5E1] bg-white font-semibold text-[#0F172A]">
                <option value="">Tất cả nhân viên</option>
              </select>
              <select id="audit-filter-action" onchange="loadAuditLogs()" class="h-9 px-2.5 rounded-lg border border-[#CBD5E1] bg-white font-semibold text-[#0F172A]">
                <option value="">Tất cả thao tác</option>
                <option value="CHECKIN">CHECKIN (Nhận sân)</option>
                <option value="CANCEL_BOOKING">CANCEL_BOOKING (Hủy đơn)</option>
                <option value="NOSHOW_RELEASE">NOSHOW_RELEASE (Quá giờ nhả sân)</option>
                <option value="COLLECT_PAYMENT">COLLECT_PAYMENT (Thu tiền 70%)</option>
                <option value="RESTORE_BOOKING">RESTORE_BOOKING (Khôi phục đơn)</option>
                <option value="TRANSFER_PITCH">TRANSFER_PITCH (Đổi sân)</option>
                <option value="WALKIN_BOOKING">WALKIN_BOOKING (Đặt tại quầy)</option>
                <option value="UPDATE_PRICING">UPDATE_PRICING (Cập nhật giá)</option>
                <option value="UPDATE_SETTINGS">UPDATE_SETTINGS (Cấu hình hệ thống)</option>
                <option value="SHIFT_CLOSE">SHIFT_CLOSE (Chốt ca)</option>
                <option value="SHIFT_CONFIRM">SHIFT_CONFIRM (Đối soát ca)</option>
                <option value="COUNTER_SALE">COUNTER_SALE (Bán lẻ nước/dịch vụ)</option>
                <option value="PITCH_UPSERT">PITCH_UPSERT (Thêm/Sửa sân)</option>
                <option value="RECONCILE_MANUAL">RECONCILE_MANUAL (Đối soát gán đơn thủ công)</option>
                <option value="RECONCILE_RESOLVE">RECONCILE_RESOLVE (Đánh dấu xử lý giao dịch)</option>
                <option value="AUTO_CANCEL_EXPIRED">AUTO_CANCEL_EXPIRED (Tự hủy đơn quá hạn giữ chỗ)</option>
                <option value="ADMIN_RUN_AUTO_RELEASE">ADMIN_RUN_AUTO_RELEASE (Quét nhả đơn quá hạn (Thủ công))</option>
                <option value="STAFF_CREATE">STAFF_CREATE (Tạo tài khoản nhân sự)</option>
                <option value="STAFF_ROLE_CHANGE">STAFF_ROLE_CHANGE (Đổi vai trò nhân sự)</option>
                <option value="STAFF_STATUS_CHANGE">STAFF_STATUS_CHANGE (Khóa/Mở khóa nhân sự)</option>
                <option value="STAFF_RESET_PASSWORD">STAFF_RESET_PASSWORD (Đặt lại mật khẩu)</option>
                <option value="WEBHOOK_MATCH">WEBHOOK_MATCH (Webhook khớp cọc tự động)</option>
                <option value="WEBHOOK_UNDERPAID">WEBHOOK_UNDERPAID (Webhook chuyển thiếu tiền)</option>
                <option value="WEBHOOK_OVERPAID">WEBHOOK_OVERPAID (Webhook chuyển thừa tiền)</option>
                <option value="WEBHOOK_UNMATCHED">WEBHOOK_UNMATCHED (Webhook sai nội dung CK)</option>
                <option value="UPDATE_PAYMENT">UPDATE_PAYMENT (Duyệt/Cập nhật thanh toán)</option>
                <option value="ADD_OVERTIME">ADD_OVERTIME (Đá thêm giờ)</option>
                <option value="ADD_SERVICE">ADD_SERVICE (Thêm dịch vụ vào đơn)</option>
                <option value="PITCH_STATUS">PITCH_STATUS (Đổi trạng thái sân)</option>
                <option value="SERVICE_UPSERT">SERVICE_UPSERT (Thêm/Sửa dịch vụ kho)</option>
                <option value="SERVICE_DELETE">SERVICE_DELETE (Ngừng kinh doanh dịch vụ)</option>
              </select>
              <input type="date" id="audit-filter-date" onchange="loadAuditLogs()" class="h-9 px-2.5 rounded-lg border border-[#CBD5E1] bg-white font-semibold text-[#0F172A]">
              <input type="text" id="audit-filter-search" oninput="loadAuditLogs()" placeholder="Tìm mã đơn / đối tượng..." class="h-9 px-3 rounded-lg border border-[#CBD5E1] bg-white text-xs text-[#0F172A] placeholder-[#94A3B8] w-44">
              <button type="button" onclick="loadAuditLogs()" class="h-9 px-3 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-bold flex items-center gap-1 cursor-pointer">
                🔄 Làm mới
              </button>
            </div>
          </div>

          <div class="overflow-x-auto border border-[#E2E8F0] rounded-xl">
            <table class="w-full text-left text-xs min-w-[920px]">
              <thead class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
                <tr>
                  <th class="py-3 px-3">Thời gian</th>
                  <th class="py-3 px-3">Người thực hiện</th>
                  <th class="py-3 px-3">Hành động</th>
                  <th class="py-3 px-3">Mã đơn / Đối tượng</th>
                  <th class="py-3 px-3">Giá trị cũ (old_value)</th>
                  <th class="py-3 px-3">Giá trị mới (new_value)</th>
                  <th class="py-3 px-3">Địa chỉ IP</th>
                </tr>
              </thead>
              <tbody id="admin-audit-tbody" class="divide-y divide-[#E2E8F0]">
                <tr>
                  <td colspan="7" class="py-6 text-center text-[#64748B]">Đang tải nhật ký kiểm toán hệ thống...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Modal Đổi mật khẩu Nhân viên -->
        <div id="staff-reset-pw-modal" class="hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm items-center justify-center p-4" onclick="if(event.target===this) closeResetStaffPwModal()">
          <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden my-auto">
            <div class="px-5 py-4 bg-[#0F172A] text-white flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <span class="text-lg">🔑</span>
                <div>
                  <h4 class="font-heading font-extrabold text-sm">Đổi mật khẩu Nhân viên</h4>
                  <p class="text-[11px] text-slate-300">Cấp lại mật khẩu mới cho tài khoản trực sân</p>
                </div>
              </div>
              <button type="button" onclick="closeResetStaffPwModal()" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-sm flex items-center justify-center cursor-pointer">✕</button>
            </div>

            <form onsubmit="submitResetStaffPassword(event)" class="p-5 space-y-4 text-xs">
              <input type="hidden" id="reset-staff-id">
              <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                <span class="text-[#64748B] font-semibold">Tài khoản nhân viên:</span>
                <span id="reset-staff-username-label" class="font-mono font-bold text-[#16A34A]"></span>
              </div>
              <div>
                <label class="block font-bold text-[#475569] mb-1.5">Mật khẩu mới *</label>
                <input type="password" id="reset-staff-new-pw" required minlength="6" placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)" class="input-field w-full bg-white">
              </div>
              <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button type="button" onclick="closeResetStaffPwModal()" class="btn-sm btn-secondary cursor-pointer">Đóng</button>
                <button type="submit" class="btn-sm btn-primary font-bold cursor-pointer">💾 Cập nhật mật khẩu</button>
              </div>
            </form>
          </div>
        </div>
      </div>
