      <!-- TAB 4: QUẢN LÝ 26 SÂN & BẬT TẮT BẢO TRÌ (Frame 14) -->
      <!-- ========================================== -->
      <div id="tab-content-pitches" class="space-y-4 hidden">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 class="font-heading font-bold text-base text-[#0F172A]">Danh sách sân bóng trực thuộc hệ thống</h3>
            <span class="text-xs text-[#64748B]">Bật công tắc bảo trì sẽ ngay lập tức khóa sân trên trang đặt của khách · Thiết lập giá riêng từng sân</span>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <div class="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-xl border border-[#E2E8F0]">
              <button type="button" id="pitch-filter-all" onclick="filterAdminPitches('all')" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#16A34A] text-white cursor-pointer">Tất cả</button>
              <button type="button" id="pitch-filter-active" onclick="filterAdminPitches('Hoạt động')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer">Hoạt động</button>
              <button type="button" id="pitch-filter-maint" onclick="filterAdminPitches('Bảo trì')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer">Bảo trì</button>
              <button type="button" id="pitch-filter-hidden" onclick="filterAdminPitches('Ẩn')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer">Đã ẩn</button>
            </div>
            <?php if (!isset($isOwnerAdmin) || $isOwnerAdmin): ?>
            <button type="button" id="btn-add-pitch" onclick="openPitchModal()" class="btn-sm btn-primary font-bold flex items-center gap-1.5 cursor-pointer">
              + Thêm sân bóng mới
            </button>
            <?php endif; ?>
          </div>
        </div>

        <div id="admin-pitches-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <!-- Rendered by JS with real-time Maintenance toggle -->
        </div>

        <!-- 6.3 Lịch Bảo Trì / Đóng Sân Định Kỳ -->
        <div id="admin-maintenance-card" class="ui-card p-5 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
            <div>
              <h3 class="font-heading font-bold text-base text-[#0F172A]">6.3 Lịch Bảo Trì / Đóng Sân Định Kỳ</h3>
              <p class="text-xs text-[#64748B]">Lên lịch đóng sân theo khoảng ngày và khung giờ — tự động chặn đặt trùng và cảnh báo đơn bị ảnh hưởng</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <?php if (!isset($isManagerOrAdmin) || $isManagerOrAdmin): ?>
              <button type="button" onclick="openMaintenanceModal()" class="btn-sm btn-primary font-bold cursor-pointer">+ Tạo lịch bảo trì</button>
              <?php endif; ?>
              <button type="button" onclick="loadMaintenanceSchedules()" class="btn-sm btn-secondary font-bold cursor-pointer">Làm mới</button>
            </div>
          </div>

          <div id="maintenance-affected-banner" class="hidden p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs space-y-1.5">
            <div class="font-bold text-amber-900">Các đơn đặt sân bị ảnh hưởng trong khung giờ bảo trì:</div>
            <div id="maintenance-affected-list" class="space-y-1 text-amber-800"></div>
          </div>

          <div class="overflow-x-auto border border-[#E2E8F0] rounded-xl">
            <table class="w-full text-left text-xs min-w-[780px]">
              <thead class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
                <tr>
                  <th class="py-3 px-4">ID</th>
                  <th class="py-3 px-4">Sân bóng</th>
                  <th class="py-3 px-4">Khoảng ngày</th>
                  <th class="py-3 px-4">Khung giờ</th>
                  <th class="py-3 px-4">Lý do bảo trì</th>
                  <th class="py-3 px-4">Trạng thái</th>
                  <th class="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody id="admin-maintenance-tbody" class="divide-y divide-[#E2E8F0]">
                <tr><td colspan="7" class="py-6 text-center text-[#94A3B8]">Đang tải lịch bảo trì sân...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 7.1 Thống Kê & Quản Lý Đánh Giá Sau Trận -->
        <div id="admin-reviews-card" class="ui-card p-5 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
            <div>
              <h3 class="font-heading font-bold text-base text-[#0F172A]">7.1 Thống Kê &amp; Quản Lý Đánh Giá Sau Trận</h3>
              <p class="text-xs text-[#64748B]">Theo dõi điểm hài lòng theo sân, theo khung giờ, phản hồi khách hàng và kiểm duyệt hiển thị</p>
            </div>
            <button type="button" onclick="loadAdminReviews()" class="btn-sm btn-secondary font-bold cursor-pointer">Làm mới</button>
          </div>

          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div class="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
              <div class="text-[11px] font-semibold text-[#64748B]">Điểm đánh giá TB</div>
              <div id="rev-stat-avg" class="font-heading font-extrabold text-xl text-amber-600 mt-1">0.0 / 5.0</div>
            </div>
            <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div class="text-[11px] font-semibold text-[#64748B]">Tổng lượt đánh giá</div>
              <div id="rev-stat-total" class="font-heading font-extrabold text-xl text-[#0F172A] mt-1">0</div>
            </div>
            <div class="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <div class="text-[11px] font-semibold text-[#64748B]">Đang hiển thị</div>
              <div id="rev-stat-published" class="font-heading font-extrabold text-xl text-[#16A34A] mt-1">0</div>
            </div>
            <div class="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200">
              <div class="text-[11px] font-semibold text-[#64748B]">Đang ẩn</div>
              <div id="rev-stat-hidden" class="font-heading font-extrabold text-xl text-[#DC2626] mt-1">0</div>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div class="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
              <div class="text-xs font-bold text-[#0F172A]">Điểm TB theo từng sân</div>
              <div id="rev-by-pitch-list" class="space-y-1.5 text-xs text-[#475569]"></div>
            </div>
            <div class="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
              <div class="text-xs font-bold text-[#0F172A]">Điểm TB theo khung giờ</div>
              <div id="rev-by-slot-list" class="space-y-1.5 text-xs text-[#475569]"></div>
            </div>
          </div>

          <div class="overflow-x-auto border border-[#E2E8F0] rounded-xl">
            <table class="w-full text-left text-xs min-w-[860px]">
              <thead class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
                <tr>
                  <th class="py-3 px-4">Thời gian &amp; Mã đơn</th>
                  <th class="py-3 px-4">Sân &amp; Giờ đá</th>
                  <th class="py-3 px-4">Khách hàng</th>
                  <th class="py-3 px-4">Đánh giá &amp; Góp ý</th>
                  <th class="py-3 px-4">Phản hồi của sân</th>
                  <th class="py-3 px-4">Trạng thái</th>
                  <th class="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody id="admin-reviews-tbody" class="divide-y divide-[#E2E8F0]">
                <tr><td colspan="7" class="py-6 text-center text-[#94A3B8]">Đang tải danh sách đánh giá...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Modal Tạo / Sửa Lịch Bảo Trì -->
        <div id="maintenance-modal" role="dialog" aria-modal="true" aria-labelledby="maintenance-modal-title" class="hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm items-center justify-center p-4 overflow-y-auto" onclick="if(event.target===this) closeMaintenanceModal()">
          <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-auto">
            <div class="px-5 py-4 bg-[#0F172A] text-white flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <span class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-amber-400">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                </span>
                <div>
                  <h4 id="maintenance-modal-title" class="font-heading font-extrabold text-sm">Lịch Bảo Trì / Đóng Sân Định Kỳ</h4>
                  <p class="text-[11px] text-slate-300">Thiết lập thời gian bảo dưỡng cỏ, đèn hoặc sửa chữa hạ tầng sân</p>
                </div>
              </div>
              <button type="button" onclick="closeMaintenanceModal()" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-sm flex items-center justify-center cursor-pointer" aria-label="Đóng">✕</button>
            </div>
            <form id="maintenance-form" onsubmit="saveMaintenanceForm(event)" class="p-5 space-y-3.5 text-xs">
              <input type="hidden" id="maint-form-id">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label for="maint-form-pitch" class="block font-bold text-[#475569] mb-1">Chọn sân bóng *</label>
                  <select id="maint-form-pitch" required class="input-field h-9 text-xs font-bold"></select>
                </div>
                <div>
                  <label for="maint-form-status" class="block font-bold text-[#475569] mb-1">Trạng thái *</label>
                  <select id="maint-form-status" required class="input-field h-9 text-xs font-bold">
                    <option value="scheduled">Đã lên lịch (scheduled)</option>
                    <option value="in_progress">Đang bảo trì (in_progress)</option>
                    <option value="completed">Đã hoàn thành (completed)</option>
                    <option value="cancelled">Đã hủy (cancelled)</option>
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label for="maint-form-start-date" class="block font-bold text-[#475569] mb-1">Từ ngày *</label>
                  <input type="date" id="maint-form-start-date" required class="input-field h-9 text-xs font-bold">
                </div>
                <div>
                  <label for="maint-form-end-date" class="block font-bold text-[#475569] mb-1">Đến ngày *</label>
                  <input type="date" id="maint-form-end-date" required class="input-field h-9 text-xs font-bold">
                </div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label for="maint-form-start-time" class="block font-bold text-[#475569] mb-1">Từ giờ *</label>
                  <input type="time" id="maint-form-start-time" value="05:30" required class="input-field h-9 text-xs font-bold">
                </div>
                <div>
                  <label for="maint-form-end-time" class="block font-bold text-[#475569] mb-1">Đến giờ *</label>
                  <input type="time" id="maint-form-end-time" value="23:00" required class="input-field h-9 text-xs font-bold">
                </div>
              </div>
              <div>
                <label for="maint-form-reason" class="block font-bold text-[#475569] mb-1">Lý do bảo trì *</label>
                <input type="text" id="maint-form-reason" required placeholder="VD: Thay đèn LED trụ B, bảo dưỡng hạt cao su mặt cỏ..." class="input-field h-9 text-xs font-semibold">
              </div>
              <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button type="button" onclick="closeMaintenanceModal()" class="btn-sm btn-secondary cursor-pointer">Hủy</button>
                <button type="submit" class="btn-sm btn-primary font-bold cursor-pointer">Lưu lịch bảo trì</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Modal Phản Hồi Đánh Giá Khách Hàng -->
        <div id="review-reply-modal" role="dialog" aria-modal="true" aria-labelledby="review-reply-modal-title" class="hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm items-center justify-center p-4 overflow-y-auto" onclick="if(event.target===this) closeReviewReplyModal()">
          <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-auto">
            <div class="px-5 py-4 bg-[#0F172A] text-white flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <span class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-blue-400">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                </span>
                <div>
                  <h4 id="review-reply-modal-title" class="font-heading font-extrabold text-sm">Phản Hồi Đánh Giá Khách Hàng</h4>
                  <p class="text-[11px] text-slate-300">Phản hồi sẽ hiển thị công khai dưới nhận xét của khách hàng</p>
                </div>
              </div>
              <button type="button" onclick="closeReviewReplyModal()" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-sm flex items-center justify-center cursor-pointer" aria-label="Đóng">✕</button>
            </div>
            <form id="review-reply-form" onsubmit="submitReviewReply(event)" class="p-5 space-y-4 text-xs">
              <input type="hidden" id="rev-reply-id">
              <div id="rev-reply-meta" class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs text-[#334155]"></div>
              <div>
                <label for="rev-reply-text" class="block font-bold text-[#475569] mb-1">Nội dung phản hồi của sân *</label>
                <textarea id="rev-reply-text" rows="4" required placeholder="Cảm ơn đội bạn đã tin tưởng sân bóng! Ghi nhận góp ý để nâng cấp chất lượng phục vụ..." class="input-field w-full h-auto py-2 text-xs"></textarea>
              </div>
              <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button type="button" onclick="closeReviewReplyModal()" class="btn-sm btn-secondary cursor-pointer">Hủy</button>
                <button type="submit" class="btn-sm btn-primary font-bold cursor-pointer">Gửi phản hồi</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Modal Thêm / Sửa thông tin & giá riêng từng sân -->
        <div id="pitch-edit-modal" class="hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm items-center justify-center p-4" onclick="if(event.target===this) closePitchModal()">
          <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-auto">
            <div class="px-5 py-4 bg-[#0F172A] text-white flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <span class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-emerald-400">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                </span>
                <div>
                  <h4 id="pitch-modal-title" class="font-heading font-extrabold text-sm">Thêm / Sửa thông tin &amp; Giá riêng từng sân</h4>
                  <p class="text-[11px] text-slate-300">Cấu hình thông số mặt cỏ, kích thước và đơn giá theo khung giờ riêng</p>
                </div>
              </div>
              <button type="button" onclick="closePitchModal()" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-sm flex items-center justify-center cursor-pointer">✕</button>
            </div>

            <form id="pitch-edit-form" onsubmit="savePitchForm(event)" class="p-5 space-y-4 text-xs">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block font-bold text-[#475569] mb-1">Mã sân *</label>
                  <input type="text" id="pitch-form-id" required placeholder="VD: P5-G, P7-I..." class="input-field w-full font-mono font-bold uppercase">
                </div>
                <div>
                  <label class="block font-bold text-[#475569] mb-1">Tên sân hiển thị *</label>
                  <input type="text" id="pitch-form-name" required placeholder="VD: Sân 5-G (Khán đài B)" class="input-field w-full font-semibold">
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label class="block font-bold text-[#475569] mb-1">Loại sân *</label>
                  <select id="pitch-form-type" class="input-field w-full font-bold">
                    <option value="5">Sân 5 người</option>
                    <option value="7">Sân 7 người</option>
                    <option value="11">Sân 11 người</option>
                  </select>
                </div>
                <div>
                  <label class="block font-bold text-[#475569] mb-1">Kích thước tiêu chuẩn</label>
                  <input type="text" id="pitch-form-size" placeholder="VD: 20m x 40m" class="input-field w-full font-semibold">
                </div>
                <div>
                  <label class="block font-bold text-[#475569] mb-1">Trạng thái vận hành *</label>
                  <select id="pitch-form-status" class="input-field w-full font-bold">
                    <option value="Hoạt động">Hoạt động</option>
                    <option value="Bảo trì">Bảo trì</option>
                    <option value="Ẩn">Ẩn</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="block font-bold text-[#475569] mb-1">Chất lượng mặt cỏ &amp; Đèn chiếu sáng</label>
                <input type="text" id="pitch-form-grass" placeholder="VD: Cỏ nhân tạo FIFA Quality · Đèn LED 400W" class="input-field w-full font-semibold">
              </div>

              <div class="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
                <div class="font-bold text-[#0F172A] text-xs flex items-center justify-between">
                  <span>Thiết lập đơn giá riêng cho sân này (VNĐ / ca 90 phút)</span>
                  <span class="text-[11px] font-normal text-[#64748B]">Ưu tiên áp dụng khi tính tiền</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label class="block font-bold text-[#475569] mb-1">Giá giờ thường *</label>
                    <input type="number" id="pitch-form-base-price" min="0" step="10000" required placeholder="300000" class="input-field w-full font-bold text-[#0F172A] bg-white">
                  </div>
                  <div>
                    <label class="block font-bold text-[#D97706] mb-1">Giá giờ cao điểm *</label>
                    <input type="number" id="pitch-form-peak-price" min="0" step="10000" required placeholder="450000" class="input-field w-full font-bold text-[#D97706] bg-white">
                  </div>
                  <div>
                    <label class="block font-bold text-[#2563EB] mb-1">Giá cuối tuần *</label>
                    <input type="number" id="pitch-form-weekend-price" min="0" step="10000" required placeholder="500000" class="input-field w-full font-bold text-[#2563EB] bg-white">
                  </div>
                </div>
              </div>

              <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button type="button" onclick="closePitchModal()" class="btn-sm btn-secondary cursor-pointer">Hủy</button>
                <button type="submit" class="btn-sm btn-primary font-bold cursor-pointer">Lưu thông tin sân</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- ========================================== -->