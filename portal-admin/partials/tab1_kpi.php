      <!-- TAB 1: TỔNG QUAN KPI & BIỂU ĐỒ (Frame 11) -->
      <!-- ========================================== -->
      <div id="tab-content-overview" class="space-y-6">
        <!-- 4 KPI Cards -->
        <div id="overview-kpi-grid" class="grid grid-cols-1 sm:grid-cols-2 <?php echo (!isset($isOwnerAdmin) || $isOwnerAdmin) ? 'lg:grid-cols-4' : 'lg:grid-cols-3'; ?> gap-4">
          <?php if (!isset($isOwnerAdmin) || $isOwnerAdmin): ?>
          <div id="kpi-card-revenue" class="ui-card p-5">
            <div class="text-xs font-semibold text-[#64748B]">Doanh thu hôm nay</div>
            <div id="kpi-revenue-value" class="font-heading font-extrabold text-2xl text-[#0F172A] mt-1">0đ</div>
            <div id="kpi-revenue-sub" class="mt-2 text-xs text-[#64748B]">Dữ liệu thực hôm nay</div>
          </div>
          <?php endif; ?>
          <div class="ui-card p-5">
            <div class="text-xs font-semibold text-[#64748B]">Tổng lượt đặt hôm nay</div>
            <div id="kpi-bookings-count" class="font-heading font-extrabold text-2xl text-[#0F172A] mt-1">0 lượt</div>
            <div id="kpi-bookings-pending" class="mt-2 text-xs font-semibold text-[#D97706]">
              Đang đồng bộ...
            </div>
          </div>
          <div class="ui-card p-5">
            <div class="text-xs font-semibold text-[#64748B]">Tỷ lệ lấp đầy sân</div>
            <div id="kpi-occupancy-value" class="font-heading font-extrabold text-2xl text-[#16A34A] mt-1">0%</div>
            <div class="w-full h-2 rounded-full bg-[#E2E8F0] mt-2 overflow-hidden">
              <div id="kpi-occupancy-bar" class="h-full bg-[#16A34A] transition-all duration-300" style="width: 0%"></div>
            </div>
          </div>
          <div class="ui-card p-5">
            <div class="text-xs font-semibold text-[#64748B]">Trạng thái sân hiện tại</div>
            <div id="kpi-pitches-ready" class="font-heading font-extrabold text-2xl text-[#0F172A] mt-1">0/0 Sân sẵn sàng</div>
            <div id="kpi-pitches-sub" class="mt-2 text-xs text-[#64748B]">---</div>
          </div>
        </div>

        <?php if (!isset($isOwnerAdmin) || $isOwnerAdmin): ?>
        <!-- Charts Row -->
        <div id="overview-charts-row" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div class="lg:col-span-8 ui-card p-5">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h3 class="font-heading font-bold text-base text-[#0F172A]">Doanh thu 7 ngày gần nhất</h3>
              <span id="overview-weekly-total" class="text-xs text-[#16A34A] font-bold">Tổng tuần: 0đ</span>
            </div>
            <!-- SVG Vector Chart Line -->
            <svg id="overview-weekly-svg" viewBox="0 0 680 180" class="w-full h-44"></svg>
            <div id="overview-weekly-labels" class="flex justify-between text-xs text-[#64748B] pt-2 border-t border-[#E2E8F0]"></div>
          </div>

          <div class="lg:col-span-4 ui-card p-5 flex flex-col justify-between">
            <h3 class="font-heading font-bold text-base text-[#0F172A] mb-3">Tỷ trọng doanh thu các sân</h3>
            <div id="overview-pitch-shares" class="space-y-2.5 text-xs flex-1"></div>
          </div>
        </div>
        <?php endif; ?>

        <!-- Ca đá sắp diễn ra trong ngày -->
        <div class="ui-card p-5 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="font-heading font-bold text-base text-[#0F172A]">Lịch thi đấu hôm nay cần theo dõi</h3>
            <span class="text-xs text-[#16A34A] font-bold">Giờ cao điểm 17:30 - 21:00</span>
          </div>
                  <!-- Banner Quy chế Ân hạn 15 phút & Xử lý khách quá giờ chưa đến -->
        <div class="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex items-start gap-3 text-xs mb-3">
          <div class="p-2 rounded-lg bg-amber-500 text-white font-bold shrink-0 text-xs">15 PHÚT</div>
          <div class="space-y-1">
            <div class="font-bold text-[#0F172A] text-sm">Quy chế tiếp đón &amp; Xử lý khách quá giờ chưa đến:</div>
            <div class="text-[#475569] leading-relaxed">
              • <b>Thời gian ân hạn:</b> Hệ thống tự động đếm giờ và giữ sân tối đa <b>15 phút</b> kể từ khi bắt đầu ca đá.<br>
              • <b>Khách đến sân:</b> Bấm <span class="text-emerald-700 font-bold">Check-in</span> để xác nhận nhận sân, chuyển trạng thái "Đang đá" và thu phần tiền còn lại.<br>
              • <b>Quá 15 phút khách chưa đến:</b> Bấm <span class="text-red-700 font-bold">Quá giờ chưa đến: Nhả sân</span> để <b>tịch thu cọc 30%</b> và <b>giải phóng slot sân trống ngay lập tức</b> đón khách vãng lai hoặc khách đặt mới tại quầy, tuyệt đối không để trống sân.
            </div>
          </div>
        </div>
          <div class="flex flex-wrap items-center justify-between gap-2 pb-1">
            <div class="flex flex-wrap items-center gap-1.5">
              <button type="button" onclick="filterOverviewBookings('all')" id="ov-filter-all" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#16A34A] text-white">Tất cả ca</button>
              <button type="button" onclick="filterOverviewBookings('playing')" id="ov-filter-playing" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200">Đang chơi</button>
              <button type="button" onclick="filterOverviewBookings('confirmed')" id="ov-filter-confirmed" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200">Chờ Check-in</button>
              <button type="button" onclick="filterOverviewBookings('completed')" id="ov-filter-completed" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200">Hoàn thành &amp; Thu đủ</button>
              <button type="button" onclick="filterOverviewBookings('debt')" id="ov-filter-debt" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#DC2626] hover:bg-rose-50">Đơn đang nợ</button>
              <button type="button" onclick="filterOverviewBookings('noshow')" id="ov-filter-noshow" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200">Chưa đến / Đã hủy</button>
            </div>
            <button type="button" onclick="openQRScannerModal()" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm">Quét QR Check-in</button>
          </div>
          <div id="overview-today-bookings" class="space-y-2 text-xs">
            <!-- Rendered by JS -->
          </div>
        </div>
      </div>

      <!-- ========================================== -->
