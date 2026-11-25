      <!-- TAB 2: LỊCH ĐẶT SÂN TIMELINE GANTT (Frame 12) -->
      <!-- ========================================== -->
      <div id="tab-content-timeline" class="space-y-4 hidden">
        <div class="ui-card p-4 flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-heading font-bold text-sm text-[#0F172A]">Lịch ma trận sân:</span>
            <button type="button" onclick="changeTimelineDate(-1)" class="px-2.5 py-1 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-50 text-xs font-bold text-[#334155] cursor-pointer">◀ Hôm qua</button>
            <button type="button" onclick="changeTimelineDate(0)" class="px-2.5 py-1 rounded-lg border border-[#16A34A] bg-[#DCFCE7]/60 hover:bg-[#DCFCE7] text-xs font-bold text-[#15803D] cursor-pointer">Hôm nay</button>
            <button type="button" onclick="changeTimelineDate(1)" class="px-2.5 py-1 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-50 text-xs font-bold text-[#334155] cursor-pointer">Ngày mai ▶</button>
            <input type="date" id="timeline-date-picker" data-vn-datepicker="1" data-allow-past="1" onchange="setTimelineDate(this.value)" class="h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-bold text-[#0F172A]">
            <span id="timeline-date-label" class="px-2.5 py-1 rounded-full bg-[#DCFCE7] text-[#16A34A] text-xs font-bold"></span>
          </div>
          <!-- Legend Status Pills -->
          <div class="flex items-center gap-2 text-xs flex-wrap">
            <span class="px-2 py-0.5 rounded-full bg-white border border-[#16A34A] text-[#16A34A]">Trống</span>
            <span class="px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#16A34A]">Đã xác nhận</span>
            <span class="px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706]">Giữ chỗ</span>
            <span class="px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#2563EB]">Đang đá</span>
            <span class="px-2 py-0.5 rounded-full hatch-slate border border-[#CBD5E1]">Bảo trì</span>
          </div>
        </div>

        <!-- Gantt Chart Container -->
        <div class="ui-card p-5 overflow-x-auto">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs">
            <span class="font-bold text-[#0F172A]">Sơ đồ Timeline các sân hoạt động trong ngày</span>
            <span class="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[#15803D] font-semibold">Gợi ý: Bấm vào ca đá trên Timeline để mở Popup Điều Hành Ca Đá &amp; Thanh Toán</span>
          </div>
          <div class="min-w-[900px]">
            <!-- Timeline Hours Header 05:30 -> 22:30 (Mỗi ca 2 tiếng · Nghỉ trưa 11:30 - 14:30) -->
            <div class="grid grid-cols-12 border-b border-[#E2E8F0] pb-2 text-[11px] font-bold text-[#64748B] pl-28 text-center">
              <div>05:30</div><div>07:30</div><div>09:30</div><div class="text-amber-600">11:30 (Trưa)</div><div class="text-amber-600 col-span-2">Nghỉ trưa (11:30-14:30)</div>
              <div>14:30</div><div class="text-[#DC2626] font-extrabold">16:30 ▼</div><div class="text-[#DC2626] font-extrabold">18:30</div>
              <div>20:30</div><div class="col-span-2">22:30 (Hết ca)</div>
            </div>

            <!-- 6 Rows for 6 Pitches (Frame 12) -->
            <div id="gantt-rows" class="divide-y divide-[#E2E8F0] pt-2">
              <!-- Rendered by JS -->
            </div>
          </div>
        </div>

        <!-- Danh sách chờ (Waitlist) -->
        <div class="ui-card p-5 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
            <div>
              <h3 class="font-heading font-bold text-sm text-[#0F172A]">Danh Sách Chờ Sân Trống (Waitlist)</h3>
              <p class="text-[11px] text-[#64748B]">Khách hàng đăng ký chờ khi khung giờ kín lịch — Tự động báo khi có ca hủy/quá hạn</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <input type="date" id="waitlist-date-filter" data-vn-datepicker="1" data-allow-past="1" onchange="loadWaitlistAdmin()" class="h-8 px-2.5 rounded-lg border border-[#CBD5E1] text-xs font-semibold">
              <select id="waitlist-status-filter" onchange="loadWaitlistAdmin()" class="h-8 px-2.5 rounded-lg border border-[#CBD5E1] text-xs font-semibold">
                <option value="all">Tất cả trạng thái</option>
                <option value="waiting">Đang chờ (waiting)</option>
                <option value="notified">Đã báo sân trống (notified)</option>
                <option value="converted">Đã gán sân (converted)</option>
                <option value="cancelled">Đã hủy / Hết hạn</option>
              </select>
              <button type="button" onclick="loadWaitlistAdmin()" class="px-3 h-8 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-50 text-xs font-bold cursor-pointer">Làm mới</button>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse min-w-[740px]">
              <thead>
                <tr class="border-b border-[#E2E8F0] text-[#64748B] font-bold uppercase text-[10px]">
                  <th class="py-2 pr-3">Ngày đá</th>
                  <th class="py-2 pr-3">Sân & Khung giờ</th>
                  <th class="py-2 pr-3">Khách hàng</th>
                  <th class="py-2 pr-3">SĐT liên hệ</th>
                  <th class="py-2 pr-3">Ghi chú</th>
                  <th class="py-2 pr-3">Trạng thái</th>
                  <th class="py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody id="admin-waitlist-tbody" class="divide-y divide-[#F1F5F9]">
                <tr><td colspan="7" class="py-4 text-center text-[#94A3B8]">Đang tải danh sách chờ...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 5.2 Lịch Cố Định Hàng Tuần (Recurring Schedules) -->
        <div id="recurring-schedules-card" class="ui-card p-5 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
            <div>
              <h3 class="font-heading font-bold text-sm text-[#0F172A]">5.2 Lịch Cố Định Hàng Tuần (Recurring Schedules)</h3>
              <p class="text-[11px] text-[#64748B]">Tạo chuỗi đặt sân cố định theo thứ trong tuần, tự động giữ chỗ và gia hạn chu kỳ 4 tuần</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <?php if (isset($portalRole) && $portalRole === 'admin'): ?>
              <button type="button" id="btn-run-recurring-cron" onclick="runRecurringCronNow()" class="px-3 h-8 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold cursor-pointer">Sinh lịch 4 tuần ngay</button>
              <?php endif; ?>
              <button type="button" onclick="loadRecurringSchedules()" class="px-3 h-8 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-50 text-xs font-bold cursor-pointer">Làm mới</button>
            </div>
          </div>

          <form id="recurring-create-form" onsubmit="handleCreateRecurringSchedule(event)" class="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3 text-xs">
            <div class="font-bold text-[#0F172A] uppercase tracking-wider text-[11px]">+ Tạo lịch cố định hàng tuần mới</div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label for="rec-cust-name" class="block text-[11px] font-bold text-[#475569] mb-1">Tên khách hàng / Đội bóng *</label>
                <input type="text" id="rec-cust-name" required placeholder="VD: FC Văn Phòng" class="input-field h-9 text-xs font-semibold bg-white">
              </div>
              <div>
                <label for="rec-cust-phone" class="block text-[11px] font-bold text-[#475569] mb-1">Số điện thoại *</label>
                <input type="tel" id="rec-cust-phone" required placeholder="0912345678" class="input-field h-9 text-xs font-semibold bg-white">
              </div>
              <div>
                <label for="rec-pitch-id" class="block text-[11px] font-bold text-[#475569] mb-1">Chọn sân bóng *</label>
                <select id="rec-pitch-id" required class="input-field h-9 text-xs font-bold bg-white"></select>
              </div>
              <div>
                <label for="rec-day-of-week" class="block text-[11px] font-bold text-[#475569] mb-1">Thứ trong tuần *</label>
                <select id="rec-day-of-week" required class="input-field h-9 text-xs font-bold bg-white">
                  <option value="1">Thứ 2</option>
                  <option value="2">Thứ 3</option>
                  <option value="3">Thứ 4</option>
                  <option value="4">Thứ 5</option>
                  <option value="5">Thứ 6</option>
                  <option value="6">Thứ 7</option>
                  <option value="7">Chủ Nhật</option>
                </select>
              </div>
              <div>
                <label for="rec-slot-id" class="block text-[11px] font-bold text-[#475569] mb-1">Khung giờ đá *</label>
                <select id="rec-slot-id" required class="input-field h-9 text-xs font-bold text-[#16A34A] bg-white"></select>
              </div>
              <div>
                <label for="rec-start-date" class="block text-[11px] font-bold text-[#475569] mb-1">Ngày bắt đầu *</label>
                <input type="date" id="rec-start-date" data-vn-datepicker="1" required class="input-field h-9 text-xs font-bold bg-white">
              </div>
              <div>
                <label for="rec-weeks-count" class="block text-[11px] font-bold text-[#475569] mb-1">Số tuần cố định</label>
                <input type="number" id="rec-weeks-count" value="8" min="2" max="52" class="input-field h-9 text-xs font-bold bg-white">
              </div>
              <div>
                <label for="rec-deposit-per-match" class="block text-[11px] font-bold text-[#475569] mb-1">Tiền cọc / trận (VNĐ)</label>
                <input type="number" id="rec-deposit-per-match" value="0" min="0" step="10000" class="input-field h-9 text-xs font-bold bg-white">
              </div>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
              <div class="lg:col-span-5">
                <label class="flex items-center gap-2 text-xs font-semibold text-[#0F172A] cursor-pointer select-none">
                  <input type="checkbox" id="rec-is-open-ended" onchange="toggleRecurringWeeksInput(this.checked)" class="w-4 h-4 rounded text-[#16A34A]">
                  <span>Không giới hạn (gia hạn tự động 4 tuần)</span>
                </label>
              </div>
              <div class="lg:col-span-4">
                <label for="rec-note" class="sr-only">Ghi chú chuỗi lịch</label>
                <input type="text" id="rec-note" placeholder="Ghi chú hợp đồng / yêu cầu riêng..." class="input-field h-9 text-xs bg-white">
              </div>
              <div class="lg:col-span-3 flex justify-end">
                <button type="submit" class="btn-sm btn-primary w-full lg:w-auto font-bold cursor-pointer">+ Tạo lịch cố định</button>
              </div>
            </div>
          </form>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse min-w-[820px]">
              <thead>
                <tr class="border-b border-[#E2E8F0] text-[#64748B] font-bold uppercase text-[10px]">
                  <th class="py-2 pr-3">Mã chuỗi</th>
                  <th class="py-2 pr-3">Khách hàng</th>
                  <th class="py-2 pr-3">Sân &amp; Lịch</th>
                  <th class="py-2 pr-3">Khung giờ / Bắt đầu</th>
                  <th class="py-2 pr-3">Giá/trận</th>
                  <th class="py-2 pr-3">Các buổi sắp tới (4 tuần)</th>
                  <th class="py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody id="admin-recurring-tbody" class="divide-y divide-[#F1F5F9]">
                <tr><td colspan="7" class="py-4 text-center text-[#94A3B8]">Đang tải lịch cố định hàng tuần...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <?php if (!isset($isManagerOrAdmin) || $isManagerOrAdmin): ?>
        <!-- 5.5 Kiểm Duyệt Tin Tìm Đối / Ghép Kèo -->
        <div id="matchmaking-moderation-card" class="ui-card p-5 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
            <div>
              <h3 class="font-heading font-bold text-sm text-[#0F172A]">5.5 Kiểm Duyệt Tin Tìm Đối / Ghép Kèo</h3>
              <p class="text-[11px] text-[#64748B]">Duyệt, từ chối hoặc đóng các tin tìm đối giao hữu do đội bóng đăng tải</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <select id="mm-admin-status-filter" onchange="loadMatchmakingAdmin()" class="h-8 px-2.5 rounded-lg border border-[#CBD5E1] text-xs font-semibold">
                <option value="all">Tất cả trạng thái</option>
                <option value="pending">Chờ duyệt (pending)</option>
                <option value="open">Đang mở (open)</option>
                <option value="matched">Đã ghép kèo (matched)</option>
                <option value="closed">Đã đóng (closed)</option>
                <option value="rejected">Từ chối (rejected)</option>
              </select>
              <button type="button" onclick="loadMatchmakingAdmin()" class="px-3 h-8 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-50 text-xs font-bold cursor-pointer">Làm mới</button>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse min-w-[820px]">
              <thead>
                <tr class="border-b border-[#E2E8F0] text-[#64748B] font-bold uppercase text-[10px]">
                  <th class="py-2 pr-3">Mã kèo</th>
                  <th class="py-2 pr-3">Đội &amp; Đội trưởng</th>
                  <th class="py-2 pr-3">SĐT liên hệ</th>
                  <th class="py-2 pr-3">Lịch &amp; Sân</th>
                  <th class="py-2 pr-3">Trình độ / Thể lệ</th>
                  <th class="py-2 pr-3">Trạng thái</th>
                  <th class="py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody id="admin-matchmaking-tbody" class="divide-y divide-[#F1F5F9]">
                <tr><td colspan="7" class="py-4 text-center text-[#94A3B8]">Đang tải danh sách tin tìm đối...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <?php endif; ?>
      </div>

      <!-- ========================================== -->
