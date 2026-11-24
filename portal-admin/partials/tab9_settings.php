      <!-- TAB 10: QUẢN LÝ NHÂN SỰ & PHÂN QUYỀN -->
      <!-- ========================================== -->
      <div id="tab-content-settings" class="space-y-6 hidden">
        <div class="ui-card p-6 space-y-5">
          <div class="flex flex-wrap sm:flex-nowrap items-start sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
              </div>
              <div>
                <h3 class="font-heading font-bold text-lg text-[#0F172A]">Tài khoản Nhân sự &amp; Quản lý Sân</h3>
                <p class="text-xs text-[#64748B]">Cấp quyền cho Quản lý (Manager: Báo cáo, Kho, Ca, Duyệt cọc) hoặc Nhân viên trực ca (Staff)</p>
              </div>
            </div>
            <span id="staff-count-badge" class="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 shrink-0 whitespace-nowrap">0 Nhân sự</span>
          </div>

          <form id="admin-create-staff-form" onsubmit="handleCreateStaff(event)" class="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
                <input type="password" id="staff-password" required minlength="8" placeholder="Tối thiểu 8 ký tự" class="input-field w-full bg-white">
              </div>
              <div>
                <label class="block font-bold text-[#475569] mb-1">Vai trò phân quyền *</label>
                <select id="staff-role" class="input-field w-full font-semibold bg-white">
                  <option value="staff">Nhân viên trực ca (Staff)</option>
                  <option value="manager">Quản lý sân (Manager)</option>
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

        <!-- Modal Đổi mật khẩu Nhân viên -->
        <div id="staff-reset-pw-modal" class="hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm items-center justify-center p-4" onclick="if(event.target===this) closeResetStaffPwModal()">
          <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden my-auto">
            <div class="px-5 py-4 bg-[#0F172A] text-white flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <span class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-amber-400">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
                </span>
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
                <input type="password" id="reset-staff-new-pw" required minlength="8" placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)" class="input-field w-full bg-white">
              </div>
              <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button type="button" onclick="closeResetStaffPwModal()" class="btn-sm btn-secondary cursor-pointer">Đóng</button>
                <button type="submit" class="btn-sm btn-primary font-bold cursor-pointer">Cập nhật mật khẩu</button>
              </div>
            </form>
          </div>
        </div>
      </div>
