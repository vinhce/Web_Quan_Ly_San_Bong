      <!-- TAB 10: CÀI ĐẶT HỆ THỐNG & QUẢN LÝ NHÂN VIÊN -->
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

            <div id="settings-role-notice" class="hidden p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
              Chế độ chỉ xem: Chỉ Chủ sân (Admin) mới có quyền chỉnh sửa tài khoản ngân hàng và cấu hình hệ thống.
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
                  <span>Chính Sách Giữ Chỗ &amp; Hoàn/Phạt Cọc</span>
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

              <!-- Cấu hình Ghép kèo & Waitlist -->
              <div class="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                <div class="font-heading font-bold text-xs text-[#0F172A] flex items-center justify-between gap-2">
                  <span>Cấu hình Ghép kèo &amp; Waitlist</span>
                  <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">Stage 5</span>
                </div>
                <div class="space-y-2.5">
                  <div>
                    <label for="cfg-waitlist-hold-minutes" class="block font-bold text-[#475569] mb-1">Thời gian ưu tiên giữ chỗ Waitlist (phút)</label>
                    <input type="number" id="cfg-waitlist-hold-minutes" min="5" max="120" value="15" class="input-field w-full font-bold text-[#0F172A] bg-white">
                  </div>
                  <label class="flex items-center gap-2 text-xs font-semibold text-[#0F172A] cursor-pointer select-none">
                    <input type="checkbox" id="cfg-matchmaking-enabled" checked class="w-4 h-4 rounded text-[#16A34A]">
                    <span>Bật tính năng Tìm đối / Ghép kèo cộng đồng</span>
                  </label>
                  <label class="flex items-center gap-2 text-xs font-semibold text-[#0F172A] cursor-pointer select-none">
                    <input type="checkbox" id="cfg-matchmaking-require-approval" class="w-4 h-4 rounded text-[#16A34A]">
                    <span>Yêu cầu Quản trị viên duyệt tin tìm đối trước khi hiển thị</span>
                  </label>
                </div>
              </div>

              <!-- 6.1 Nhắc lịch & Thông báo Khách (Zalo / SMS Webhook) -->
              <div class="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200 space-y-3">
                <div class="font-heading font-bold text-xs text-[#0F172A] flex items-center justify-between gap-2">
                  <span>6.1 Nhắc lịch &amp; Thông báo Khách (Zalo / SMS Webhook)</span>
                </div>
                <div class="space-y-2.5">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    <label class="flex items-center gap-2 text-xs font-semibold text-[#0F172A] cursor-pointer select-none pb-1">
                      <input type="checkbox" id="cfg-reminder-enabled" class="w-4 h-4 rounded text-[#16A34A]">
                      <span>Bật nhắc lịch tự động trước giờ đá</span>
                    </label>
                    <div>
                      <label for="cfg-reminder-hours-before" class="block font-bold text-[#475569] mb-1">Nhắc trước giờ đá (giờ)</label>
                      <input type="number" id="cfg-reminder-hours-before" min="1" max="24" value="2" class="input-field w-full font-bold bg-white">
                    </div>
                  </div>
                  <label class="flex items-center gap-2 text-xs font-semibold text-[#0F172A] cursor-pointer select-none">
                    <input type="checkbox" id="cfg-customer-notify-enabled" class="w-4 h-4 rounded text-[#16A34A]">
                    <span>Kích hoạt gửi Webhook thông báo Zalo / SMS tới khách hàng</span>
                  </label>
                  <div>
                    <label for="cfg-customer-notify-webhook" class="block font-bold text-[#475569] mb-1">URL Webhook Zalo / SMS</label>
                    <input type="url" id="cfg-customer-notify-webhook" placeholder="https://webhook.example.com/notify" class="input-field w-full font-mono text-xs bg-white">
                  </div>
                  <div>
                    <label for="cfg-booking-confirm-template" class="block font-bold text-[#475569] mb-1">Mẫu tin xác nhận đặt sân</label>
                    <textarea id="cfg-booking-confirm-template" rows="3" placeholder="Xin chào {customer_name}, đơn {code} tại {pitch_name} lúc {slot_time} ngày {date} đã được xác nhận." class="input-field w-full h-auto py-2 text-xs bg-white"></textarea>
                  </div>
                  <div>
                    <label for="cfg-reminder-template" class="block font-bold text-[#475569] mb-1">Mẫu tin nhắc lịch trước trận</label>
                    <textarea id="cfg-reminder-template" rows="3" placeholder="Nhắc lịch: Trận đấu {code} tại {pitch_name} sẽ diễn ra lúc {slot_time} hôm nay." class="input-field w-full h-auto py-2 text-xs bg-white"></textarea>
                  </div>
                  <div class="flex justify-end">
                    <button type="button" id="btn-run-reminders-now" onclick="runMatchRemindersNow()" class="btn-sm bg-sky-600 hover:bg-sky-700 text-white font-bold cursor-pointer">Gửi nhắc lịch trước trận ngay</button>
                  </div>
                </div>
              </div>

              <!-- 6.2 Telegram Bot Cảnh Báo Chủ Sân -->
              <div class="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-3">
                <div class="font-heading font-bold text-xs text-[#0F172A] flex flex-wrap items-center justify-between gap-2">
                  <span>6.2 Telegram Bot Cảnh Báo Chủ Sân</span>
                  <span id="tg-token-status-badge" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">Chưa cấu hình</span>
                </div>
                <div class="space-y-2.5">
                  <label class="flex items-center gap-2 text-xs font-semibold text-[#0F172A] cursor-pointer select-none">
                    <input type="checkbox" id="cfg-tg-notify-enabled" class="w-4 h-4 rounded text-[#16A34A]">
                    <span>Bật gửi cảnh báo vận hành về Telegram Chủ sân</span>
                  </label>
                  <div>
                    <label for="cfg-tg-bot-token" class="block font-bold text-[#475569] mb-1">Telegram Bot Token</label>
                    <input type="password" id="cfg-tg-bot-token" autocomplete="new-password" placeholder="Nhập Bot Token mới nếu muốn thay đổi..." class="input-field w-full font-mono text-xs bg-white">
                  </div>
                  <label class="flex items-center gap-2 text-xs font-semibold text-[#DC2626] cursor-pointer select-none">
                    <input type="checkbox" id="cfg-tg-clear-token" class="w-4 h-4 rounded text-[#DC2626]">
                    <span>Xóa Bot Token đã lưu</span>
                  </label>
                  <div>
                    <label for="cfg-tg-chat-id" class="block font-bold text-[#475569] mb-1">Telegram Chat ID</label>
                    <input type="text" id="cfg-tg-chat-id" placeholder="VD: -1001234567890 hoặc 123456789" class="input-field w-full font-mono text-xs bg-white">
                  </div>
                  <div>
                    <div class="font-bold text-[#475569] mb-1.5">Sự kiện gửi cảnh báo Telegram:</div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                      <label class="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" id="cfg-tg-ev-new_booking" class="w-4 h-4 rounded text-[#16A34A]">
                        <span>Đơn đặt sân mới</span>
                      </label>
                      <label class="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" id="cfg-tg-ev-cancel" class="w-4 h-4 rounded text-[#16A34A]">
                        <span>Hủy đơn / No-Show</span>
                      </label>
                      <label class="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" id="cfg-tg-ev-shift_diff" class="w-4 h-4 rounded text-[#16A34A]">
                        <span>Chốt ca lệch tiền mặt</span>
                      </label>
                      <label class="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" id="cfg-tg-ev-unmatched_tx" class="w-4 h-4 rounded text-[#16A34A]">
                        <span>Giao dịch VietQR chưa khớp</span>
                      </label>
                      <label class="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" id="cfg-tg-ev-low_stock" class="w-4 h-4 rounded text-[#16A34A]">
                        <span>Tồn kho nước/đồ sắp hết</span>
                      </label>
                      <label class="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" id="cfg-tg-ev-waitlist" class="w-4 h-4 rounded text-[#16A34A]">
                        <span>Khách đăng ký Waitlist</span>
                      </label>
                      <label class="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" id="cfg-tg-ev-matchmaking" class="w-4 h-4 rounded text-[#16A34A]">
                        <span>Tin tìm đối / Ghép kèo</span>
                      </label>
                      <label class="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" id="cfg-tg-ev-review" class="w-4 h-4 rounded text-[#16A34A]">
                        <span>Đánh giá sau trận mới</span>
                      </label>
                    </div>
                  </div>
                  <div class="flex justify-end pt-1">
                    <button type="button" id="btn-test-telegram" onclick="testTelegramConnection()" class="btn-sm bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer">Gửi tin thử Telegram</button>
                  </div>
                </div>
              </div>

              <div class="pt-4 border-t border-[#E2E8F0] flex flex-wrap items-center justify-end gap-2">
                <button type="button" id="btn-run-auto-cancel-now" onclick="runAutoReleaseNow()" class="btn-base bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer">Quét nhả đơn quá hạn ngay</button>
                <button type="button" onclick="loadAdminSettings()" class="btn-base btn-secondary text-xs">Khôi phục</button>
                <button type="submit" class="btn-base btn-primary text-xs font-bold px-5">Lưu cài đặt</button>
              </div>
            </form>
          </div>

          <!-- Cột phải: Quản lý Tài khoản Nhân sự & Quản lý Sân -->
          <div class="lg:col-span-7 ui-card p-6 space-y-5">
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

        <!-- 6.1 Nhật Ký Gửi Thông Báo Khách & Telegram -->
        <div id="admin-notification-logs-card" class="ui-card p-6 space-y-4">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              </div>
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="font-heading font-extrabold text-lg text-[#0F172A]">6.1 Nhật Ký Gửi Thông Báo Khách &amp; Telegram</h3>
                  <span id="notif-sent-count" class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">0 Đã gửi</span>
                  <span id="notif-failed-count" class="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold">0 Thất bại</span>
                </div>
                <p class="text-xs text-[#64748B] mt-0.5">Theo dõi lịch sử gửi tin nhắc lịch trận đấu, xác nhận đặt sân và cảnh báo Telegram chủ sân</p>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2 text-xs">
              <select id="notif-filter-channel" onchange="loadNotificationLogs()" class="h-9 px-2.5 rounded-lg border border-[#CBD5E1] bg-white font-semibold text-[#0F172A]">
                <option value="all">Tất cả kênh</option>
                <option value="telegram">Telegram</option>
                <option value="zalo">Zalo Webhook</option>
                <option value="sms">SMS Webhook</option>
                <option value="system">Hệ thống</option>
              </select>
              <select id="notif-filter-status" onchange="loadNotificationLogs()" class="h-9 px-2.5 rounded-lg border border-[#CBD5E1] bg-white font-semibold text-[#0F172A]">
                <option value="all">Tất cả trạng thái</option>
                <option value="sent">Đã gửi (sent)</option>
                <option value="failed">Thất bại (failed)</option>
                <option value="pending">Đang chờ (pending)</option>
              </select>
              <input type="text" id="notif-filter-search" oninput="loadNotificationLogs()" placeholder="Tìm mã đơn / SĐT / tiêu đề..." class="h-9 px-3 rounded-lg border border-[#CBD5E1] bg-white text-xs text-[#0F172A] placeholder-[#94A3B8] w-full sm:w-48">
              <button type="button" onclick="loadNotificationLogs()" class="h-9 px-3 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-bold flex items-center gap-1 cursor-pointer">Làm mới</button>
            </div>
          </div>

          <div class="overflow-x-auto border border-[#E2E8F0] rounded-xl">
            <table class="w-full text-left text-xs min-w-[880px]">
              <thead class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
                <tr>
                  <th class="py-3 px-3">Thời gian</th>
                  <th class="py-3 px-3">Kênh / Sự kiện</th>
                  <th class="py-3 px-3">Mã đơn / Người nhận</th>
                  <th class="py-3 px-3">Tiêu đề &amp; Nội dung</th>
                  <th class="py-3 px-3">Trạng thái</th>
                  <th class="py-3 px-3">Phản hồi</th>
                </tr>
              </thead>
              <tbody id="admin-notif-logs-tbody" class="divide-y divide-[#E2E8F0]">
                <tr><td colspan="6" class="py-6 text-center text-[#64748B]">Đang tải nhật ký gửi thông báo...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 6.5 Sao Lưu & Khôi Phục Cơ Sở Dữ Liệu -->
        <div id="admin-backups-card" class="ui-card p-6 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
              </div>
              <div>
                <h3 class="font-heading font-extrabold text-lg text-[#0F172A]">6.5 Sao Lưu &amp; Khôi Phục Cơ Sở Dữ Liệu</h3>
                <p class="text-xs text-[#64748B] mt-0.5">Tạo bản sao lưu nén định dạng .sql.gz an toàn và tải về lưu trữ ngoại tuyến định kỳ</p>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button type="button" id="btn-backup-now" onclick="backupDatabaseNow()" class="btn-sm btn-primary font-bold cursor-pointer">Tạo bản sao lưu ngay</button>
              <button type="button" onclick="loadBackupsList()" class="btn-sm btn-secondary font-bold cursor-pointer">Làm mới</button>
            </div>
          </div>

          <div class="overflow-x-auto border border-[#E2E8F0] rounded-xl">
            <table class="w-full text-left text-xs min-w-[620px]">
              <thead class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
                <tr>
                  <th class="py-3 px-4">Tên file sao lưu</th>
                  <th class="py-3 px-4">Dung lượng</th>
                  <th class="py-3 px-4">Thời gian tạo</th>
                  <th class="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody id="admin-backups-tbody" class="divide-y divide-[#E2E8F0]">
                <tr><td colspan="4" class="py-6 text-center text-[#64748B]">Đang tải danh sách bản sao lưu...</td></tr>
              </tbody>
            </table>
          </div>

          <div class="p-4 rounded-xl bg-slate-900 text-slate-200 text-xs space-y-1.5">
            <div class="font-bold text-emerald-400">Hướng dẫn khôi phục nhanh qua CLI (Laragon / VPS Linux):</div>
            <p class="text-[11px] text-slate-300">Giải nén file <code class="text-amber-300">.sql.gz</code> bằng <code class="text-amber-300">gunzip</code> và nạp lại bằng <code class="text-amber-300">mysql</code>:</p>
            <pre class="p-2.5 rounded-lg bg-slate-950 text-emerald-300 font-mono text-[11px] overflow-x-auto">gunzip -c backups/backup_sanbong_YYYYMMDD_HHMMSS.sql.gz | mysql -u root -p quan_ly_san_bong</pre>
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
                <input type="password" id="reset-staff-new-pw" required minlength="6" placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)" class="input-field w-full bg-white">
              </div>
              <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button type="button" onclick="closeResetStaffPwModal()" class="btn-sm btn-secondary cursor-pointer">Đóng</button>
                <button type="submit" class="btn-sm btn-primary font-bold cursor-pointer">Cập nhật mật khẩu</button>
              </div>
            </form>
          </div>
        </div>
      </div>
