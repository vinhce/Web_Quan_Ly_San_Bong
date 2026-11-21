      <!-- TAB 1: TỔNG QUAN & ĐANG CHƠI -->
      <!-- ========================================== -->
      <div id="tab-content-overview" class="space-y-5">
        <!-- 1. KPI ROW -->
        <div id="overview-kpi-grid" class="grid grid-cols-1 sm:grid-cols-2 <?php echo (!isset($isManagerOrAdmin) || $isManagerOrAdmin) ? 'lg:grid-cols-4' : 'lg:grid-cols-3'; ?> gap-4">
          <?php if (!isset($isManagerOrAdmin) || $isManagerOrAdmin): ?>
          <div id="kpi-card-revenue" class="ui-card p-4 bg-white border border-[#E2E8F0]">
            <div class="flex items-center justify-between text-xs font-semibold text-[#64748B]">
              <span>Doanh thu ghi nhận hôm nay</span>
              <span id="kpi-rev-refresh-dot" class="w-2 h-2 rounded-full bg-emerald-500" title="Tự cập nhật mỗi 30s"></span>
            </div>
            <div id="kpi-revenue-value" class="font-heading font-extrabold text-2xl text-[#0F172A] mt-1">0đ</div>
            <div id="kpi-revenue-sub" class="mt-2 pt-2 border-t border-slate-100 space-y-0.5 text-[11px] text-[#475569]">
              <div class="flex justify-between"><span>Đã thu thực tế:</span><b id="kpi-rev-collected" class="text-[#16A34A]">0đ</b></div>
              <div class="flex justify-between text-[10px] text-[#64748B] pl-2"><span>↳ Cọc / Còn lại:</span><span id="kpi-rev-split">0đ / 0đ</span></div>
              <div class="flex justify-between"><span>Còn phải thu:</span><b id="kpi-rev-uncollected" class="text-amber-700">0đ</b></div>
            </div>
          </div>
          <?php endif; ?>

          <div class="ui-card p-4 bg-white border border-[#E2E8F0]">
            <div class="text-xs font-semibold text-[#64748B]">Lượt đặt hôm nay</div>
            <div id="kpi-bookings-count" class="font-heading font-extrabold text-2xl text-[#0F172A] mt-1">0 lượt</div>
            <div id="kpi-bookings-pending" class="mt-2 text-xs font-semibold text-[#D97706]">Đang đồng bộ...</div>
          </div>

          <div class="ui-card p-4 bg-white border border-[#E2E8F0]">
            <div class="text-xs font-semibold text-[#64748B]">Lấp đầy giờ cao điểm (17:30–21:00)</div>
            <div id="kpi-occupancy-value" class="font-heading font-extrabold text-2xl text-[#16A34A] mt-1">0%</div>
            <div class="w-full h-2 rounded-full bg-[#E2E8F0] mt-2 overflow-hidden">
              <div id="kpi-occupancy-bar" class="h-full bg-[#16A34A] transition-all duration-300" style="width: 0%"></div>
            </div>
            <div id="kpi-occupancy-formula" class="mt-1.5 text-[10px] text-[#64748B]">Ca cao điểm / (Sân hoạt động × khung 17:30–21:00)</div>
          </div>

          <div class="ui-card p-4 bg-white border border-[#E2E8F0]">
            <div class="text-xs font-semibold text-[#64748B]">Trạng thái sân hiện tại</div>
            <div id="kpi-pitches-ready" class="font-heading font-extrabold text-2xl text-[#0F172A] mt-1">0/0 Sân sẵn sàng</div>
            <div id="kpi-pitches-sub" class="mt-2 text-xs text-[#64748B]">---</div>
          </div>
        </div>

        <!-- 2. CA ĐANG ĐÁ / SẮP ĐÁ HÔM NAY -->
        <div class="ui-card p-4 sm:p-5 bg-white border border-[#E2E8F0] space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <h3 class="font-heading font-bold text-base text-[#0F172A]">Ca đang đá &amp; sắp đá hôm nay</h3>
              <button type="button" id="ov-grace-info-btn" onclick="toggleOverviewGraceInfo()" class="w-6 h-6 rounded-full border border-slate-300 bg-slate-50 hover:bg-slate-100 text-[#475569] font-bold text-xs flex items-center justify-center cursor-pointer" title="Xem quy chế ân hạn 15 phút" aria-label="Quy chế 15 phút">ℹ</button>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="hidden sm:inline text-[11px] text-[#64748B]">Nhấn <kbd class="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px]">/</kbd> tìm nhanh</span>
              <button type="button" onclick="openQRScannerModal()" class="h-8 px-3 rounded-lg text-xs font-bold bg-[#16A34A] hover:bg-[#15803D] text-white flex items-center gap-1.5 shadow-xs cursor-pointer">Quét QR Check-in</button>
            </div>
          </div>

          <!-- Quy chế 15 phút: thu gọn sau icon ℹ, mặc định đóng -->
          <div id="ov-grace-info-panel" class="hidden p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-[#475569] space-y-1">
            <div class="flex items-center justify-between">
              <span class="font-bold text-[#0F172A]">Quy chế ân hạn 15 phút &amp; Tự động nhả sân</span>
              <button type="button" onclick="toggleOverviewGraceInfo(false)" class="text-slate-400 hover:text-slate-700 font-bold cursor-pointer">✕</button>
            </div>
            <div class="leading-relaxed">
              • Giữ sân tối đa <b>15 phút</b> từ giờ bắt đầu ca. Khách đến → bấm <b>Check-in</b>.<br>
              • Quá 15 phút chưa đến → hệ thống (hoặc nút <b>Hủy no-show</b>) tịch thu cọc 30% và nhả sân trống ngay lập tức.
            </div>
          </div>

          <!-- Tab lọc có số đếm (áp dụng cho cả hôm nay & khối tồn đọng) -->
          <div class="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-100">
            <div class="flex flex-wrap items-center gap-1.5">
              <button type="button" onclick="filterOverviewBookings('all')" id="ov-filter-all" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#16A34A] text-white cursor-pointer">Tất cả <span id="ov-cnt-all" class="ml-1 opacity-90">(0)</span></button>
              <button type="button" onclick="filterOverviewBookings('playing')" id="ov-filter-playing" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer">Đang chơi <span id="ov-cnt-playing" class="ml-1">(0)</span></button>
              <button type="button" onclick="filterOverviewBookings('confirmed')" id="ov-filter-confirmed" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer">Chờ Check-in <span id="ov-cnt-confirmed" class="ml-1">(0)</span></button>
              <button type="button" onclick="filterOverviewBookings('completed')" id="ov-filter-completed" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer">Hoàn thành <span id="ov-cnt-completed" class="ml-1">(0)</span></button>
              <button type="button" onclick="filterOverviewBookings('noshow')" id="ov-filter-noshow" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer">Chưa đến / Hủy <span id="ov-cnt-noshow" class="ml-1">(0)</span></button>
            </div>
            <label class="inline-flex items-center gap-1.5 text-xs text-[#475569] font-semibold cursor-pointer select-none">
              <input type="checkbox" id="ov-select-all" onchange="toggleSelectAllOverview(this.checked)" class="w-4 h-4 rounded accent-[#16A34A] cursor-pointer">
              <span>Chọn trang này</span>
            </label>
          </div>

          <!-- Thanh xử lý hàng loạt -->
          <div id="ov-batch-bar" class="hidden p-2.5 rounded-xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 text-xs">
            <div class="flex items-center gap-2 font-bold">
              <span>Đã chọn <span id="ov-batch-count" class="text-emerald-400">0</span> ca</span>
              <button type="button" onclick="clearOverviewSelection()" class="text-[11px] text-slate-300 hover:text-white underline cursor-pointer">Bỏ chọn</button>
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
              <button type="button" onclick="runOverviewBatchOp('complete')" class="px-2.5 py-1.5 rounded-lg bg-[#16A34A] hover:bg-emerald-500 text-white font-bold cursor-pointer">✓ Hoàn tất</button>
              <button type="button" onclick="runOverviewBatchOp('collect_full')" class="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold cursor-pointer">Thu đủ</button>
              <button type="button" onclick="runOverviewBatchOp('noshow_release')" class="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer">Hủy no-show</button>
            </div>
          </div>

          <!-- Danh sách ca hôm nay (Skeleton + Phân trang) -->
          <div id="overview-today-bookings" class="space-y-2 text-xs">
            <div class="animate-pulse space-y-2">
              <div class="h-14 rounded-xl bg-slate-100"></div>
              <div class="h-14 rounded-xl bg-slate-100"></div>
              <div class="h-14 rounded-xl bg-slate-100"></div>
            </div>
          </div>

          <div id="ov-pagination" class="hidden flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span id="ov-page-info" class="text-[#64748B]">Hiển thị 0 / 0 ca</span>
            <div class="flex items-center gap-1.5">
              <button type="button" id="ov-prev-page" onclick="changeOverviewPage(-1)" class="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 font-semibold cursor-pointer disabled:opacity-40">« Trước</button>
              <span id="ov-page-num" class="font-bold text-[#0F172A] px-1">1 / 1</span>
              <button type="button" id="ov-next-page" onclick="changeOverviewPage(1)" class="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 font-semibold cursor-pointer disabled:opacity-40">Sau »</button>
            </div>
          </div>
        </div>

        <!-- 3. TIMELINE MINI THEO SÂN (CÓ VẠCH GIỜ HIỆN TẠI) -->
        <div id="ov-mini-timeline-card" class="ui-card p-4 sm:p-5 bg-white border border-[#E2E8F0] space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 class="font-heading font-bold text-base text-[#0F172A]">Timeline mini theo sân hôm nay</h3>
              <p class="text-[11px] text-[#64748B]">05:30 – 22:30 · Vạch đỏ là giờ hiện tại</p>
            </div>
            <div class="flex items-center gap-3 text-[11px] text-[#475569]">
              <span class="inline-flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-xs bg-[#16A34A]"></span>Đang đá</span>
              <span class="inline-flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-xs bg-sky-500"></span>Chờ check-in</span>
              <span class="inline-flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-xs bg-slate-400"></span>Hoàn thành</span>
            </div>
          </div>
          <div id="ov-mini-timeline-body" class="overflow-x-auto">
            <div class="h-24 rounded-xl bg-slate-100 animate-pulse"></div>
          </div>
        </div>

        <!-- 4. BIỂU ĐỒ 7 NGÀY (TRỤC Y, TOOLTIP, ĐƯỜNG TUẦN TRƯỚC) + TỶ TRỌNG SÂN -->
        <?php if (!isset($isManagerOrAdmin) || $isManagerOrAdmin): ?>
        <div id="overview-charts-row" class="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div class="lg:col-span-8 ui-card p-4 sm:p-5 bg-white border border-[#E2E8F0]">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h3 class="font-heading font-bold text-base text-[#0F172A]">Doanh thu 7 ngày gần nhất</h3>
                <div class="flex items-center gap-3 text-[11px] text-[#64748B] mt-0.5">
                  <span class="inline-flex items-center gap-1"><span class="w-3 h-0.5 bg-[#16A34A] inline-block"></span>Tuần này</span>
                  <span class="inline-flex items-center gap-1"><span class="w-3 h-0.5 border-t-2 border-dashed border-slate-400 inline-block"></span>Tuần trước</span>
                </div>
              </div>
              <span id="overview-weekly-total" class="text-xs text-[#16A34A] font-bold">Tổng tuần: 0đ</span>
            </div>
            <div class="relative">
              <svg id="overview-weekly-svg" viewBox="0 0 680 210" class="w-full h-52 overflow-visible"></svg>
              <div id="overview-chart-tooltip" class="hidden pointer-events-none absolute z-20 px-2.5 py-1.5 rounded-lg bg-[#0F172A] text-white text-[11px] shadow-lg whitespace-nowrap"></div>
            </div>
            <div id="overview-weekly-labels" class="flex justify-between text-[11px] text-[#64748B] pt-1 pl-12"></div>
          </div>

          <div class="lg:col-span-4 ui-card p-4 sm:p-5 bg-white border border-[#E2E8F0] flex flex-col justify-between">
            <h3 class="font-heading font-bold text-base text-[#0F172A] mb-3">Tỷ trọng doanh thu các sân</h3>
            <div id="overview-pitch-shares" class="space-y-2.5 text-xs flex-1"></div>
          </div>
        </div>
        <?php endif; ?>

        <!-- 5. CA TỒN ĐỌNG (THU THÀNH THANH CẢNH BÁO, BẤM MỚI MỞ) -->
        <div id="ov-overdue-section" class="hidden ui-card bg-white border border-amber-300 overflow-hidden">
          <button type="button" id="ov-overdue-toggle-btn" onclick="toggleOverviewOverdue()" class="w-full px-4 py-3 bg-amber-50 hover:bg-amber-100/80 flex items-center justify-between gap-2 text-left cursor-pointer transition-colors">
            <span class="font-heading font-bold text-sm text-amber-900 flex items-center gap-2">
              <span>⚠</span>
              <span id="ov-overdue-banner-text">0 ca tồn đọng</span>
            </span>
            <span id="ov-overdue-chevron" class="text-xs font-bold text-amber-800">Bấm để mở ▾</span>
          </button>
          <div id="ov-overdue-list-wrap" class="hidden p-4 border-t border-amber-200 space-y-2 text-xs bg-white">
            <div id="ov-overdue-bookings" class="space-y-2"></div>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
