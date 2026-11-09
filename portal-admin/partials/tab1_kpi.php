      <!-- TAB 1: TỔNG QUAN KPI & BIỂU ĐỒ (Frame 11) -->
      <!-- ========================================== -->
      <div id="tab-content-overview" class="space-y-6">
        <!-- 4 KPI Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="ui-card p-5">
            <div class="text-xs font-semibold text-[#64748B]">Doanh thu hôm nay</div>
            <div class="font-heading font-extrabold text-2xl text-[#0F172A] mt-1">4.350.000đ</div>
            <div class="mt-2 text-xs font-semibold text-[#16A34A] flex items-center gap-1">
              <span>↑ 12%</span>
              <span class="text-[#64748B] font-normal">so với hôm qua</span>
            </div>
          </div>
          <div class="ui-card p-5">
            <div class="text-xs font-semibold text-[#64748B]">Tổng lượt đặt hôm nay</div>
            <div class="font-heading font-extrabold text-2xl text-[#0F172A] mt-1">11 lượt</div>
            <div class="mt-2 text-xs font-semibold text-[#D97706]">
              2 đơn đang giữ chỗ VietQR
            </div>
          </div>
          <div class="ui-card p-5">
            <div class="text-xs font-semibold text-[#64748B]">Tỷ lệ lấp đầy sân</div>
            <div class="font-heading font-extrabold text-2xl text-[#16A34A] mt-1">68%</div>
            <div class="w-full h-2 rounded-full bg-[#E2E8F0] mt-2 overflow-hidden">
              <div class="w-[68%] h-full bg-[#16A34A]"></div>
            </div>
          </div>
          <div class="ui-card p-5">
            <div class="text-xs font-semibold text-[#64748B]">Trạng thái sân hiện tại</div>
            <div class="font-heading font-extrabold text-2xl text-[#0F172A] mt-1">8/9 Sân sẵn sàng</div>
            <div class="mt-2 text-xs text-[#64748B]">1 đang đá · 1 bảo trì mặt cỏ</div>
          </div>
        </div>

        <!-- Charts Row -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div class="lg:col-span-8 ui-card p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-heading font-bold text-base text-[#0F172A]">Doanh thu 7 ngày gần nhất</h3>
              <span class="text-xs text-[#16A34A] font-bold">Tổng tuần: 28.600.000đ</span>
            </div>
            <!-- SVG Vector Chart Line -->
            <svg viewBox="0 0 680 180" class="w-full h-44">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#16A34A" stop-opacity="0.35"/>
                  <stop offset="100%" stop-color="#16A34A" stop-opacity="0.0"/>
                </linearGradient>
              </defs>
              <line x1="0" y1="40" x2="680" y2="40" stroke="#E2E8F0" stroke-dasharray="4"/>
              <line x1="0" y1="90" x2="680" y2="90" stroke="#E2E8F0" stroke-dasharray="4"/>
              <line x1="0" y1="140" x2="680" y2="140" stroke="#E2E8F0" stroke-dasharray="4"/>
              <path d="M0,130 Q90,105 180,85 T360,70 T480,45 T600,60 L680,25 L680,180 L0,180 Z" fill="url(#chartGrad)"/>
              <path d="M0,130 Q90,105 180,85 T360,70 T480,45 T600,60 L680,25" fill="none" stroke="#16A34A" stroke-width="3"/>
              <circle cx="480" cy="45" r="5" fill="#16A34A"/>
              <circle cx="680" cy="25" r="5" fill="#16A34A"/>
            </svg>
            <div class="flex justify-between text-xs text-[#64748B] pt-2 border-t border-[#E2E8F0]">
              <span>T7</span><span>CN</span><span>T2</span><span>T3</span><span>T4</span><span>T5</span><span class="font-bold text-[#16A34A]">Hôm nay</span>
            </div>
          </div>

          <div class="lg:col-span-4 ui-card p-5 flex flex-col justify-between">
            <h3 class="font-heading font-bold text-base text-[#0F172A] mb-3">Tỷ trọng doanh thu các sân</h3>
            <div class="space-y-2 text-xs">
              <div class="flex justify-between"><span>Sân 7-A (Trung tâm)</span><b class="text-[#16A34A]">32%</b></div>
              <div class="w-full h-2 rounded bg-slate-100"><div class="w-[32%] h-full bg-[#16A34A] rounded"></div></div>
              <div class="flex justify-between pt-1"><span>Sân 7-B</span><b>22%</b></div>
              <div class="w-full h-2 rounded bg-slate-100"><div class="w-[22%] h-full bg-[#22C55E] rounded"></div></div>
              <div class="flex justify-between pt-1"><span>Sân 5-A</span><b>18%</b></div>
              <div class="w-full h-2 rounded bg-slate-100"><div class="w-[18%] h-full bg-[#2563EB] rounded"></div></div>
              <div class="flex justify-between pt-1"><span>Sân 11 (Ghép)</span><b>16%</b></div>
              <div class="w-full h-2 rounded bg-slate-100"><div class="w-[16%] h-full bg-[#0F172A] rounded"></div></div>
              <div class="flex justify-between pt-1"><span>Sân 5-B</span><b>12%</b></div>
              <div class="w-full h-2 rounded bg-slate-100"><div class="w-[12%] h-full bg-[#F59E0B] rounded"></div></div>
            </div>
            <div class="text-[11px] text-[#64748B] mt-4 pt-3 border-t border-[#E2E8F0]">
              * Sân 7-C hiện đang bảo trì nên tỷ trọng 0% trong tuần này.
            </div>
          </div>
        </div>

        <!-- Ca đá sắp diễn ra trong ngày -->
        <div class="ui-card p-5 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-heading font-bold text-base text-[#0F172A]">Lịch thi đấu hôm nay cần theo dõi</h3>
            <span class="text-xs text-[#16A34A] font-bold">Giờ cao điểm 17:30 - 21:00</span>
          </div>
                  <!-- Banner Quy che An han 15 phut & No-Show Release -->
        <div class="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex items-start gap-3 text-xs mb-3">
          <div class="p-2 rounded-lg bg-amber-500 text-white font-bold shrink-0 text-sm">⏱️ 15P</div>
          <div class="space-y-1">
            <div class="font-bold text-[#0F172A] text-sm">Quy chế tiếp đón & Xử lý khách quá hạn (No-Show):</div>
            <div class="text-[#475569] leading-relaxed">
              • <b>Thời gian ân hạn:</b> Hệ thống tự động đếm giờ và giữ sân tối đa <b>15 phút</b> kể từ khi bắt đầu ca đá.<br>
              • <b>Khách đến sân:</b> Bấm <span class="text-emerald-700 font-bold">✓ Check-in</span> để xác nhận nhận sân, chuyển trạng thái "Đang đá" và thu phần tiền còn lại.<br>
              • <b>Quá 15 phút chưa đến:</b> Bấm <span class="text-red-700 font-bold">⚠️ Quá hạn: Nhả sân</span> để <b>tịch thu cọc 30%</b> và <b>giải phóng slot sân trống ngay lập tức</b> đón khách vãng lai hoặc khách đặt mới tại quầy, tuyệt đối không để trống sân.
            </div>
          </div>
        </div>
          <div class="flex flex-wrap items-center justify-between gap-2 pb-1">
            <div class="flex flex-wrap items-center gap-1.5">
              <button type="button" onclick="filterOverviewBookings('all')" id="ov-filter-all" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#16A34A] text-white">Tất cả ca</button>
              <button type="button" onclick="filterOverviewBookings('playing')" id="ov-filter-playing" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200">⚽ Đang chơi</button>
              <button type="button" onclick="filterOverviewBookings('confirmed')" id="ov-filter-confirmed" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200">⏳ Chờ Check-in</button>
              <button type="button" onclick="filterOverviewBookings('completed')" id="ov-filter-completed" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200">✓ Hoàn thành & Đã thu đủ</button>
            </div>
            <button type="button" onclick="openQRScannerModal()" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm">📷 Quét QR Check-in</button>
          </div>
          <div id="overview-today-bookings" class="space-y-2 text-xs">
            <!-- Rendered by JS -->
          </div>
        </div>
      </div>

      <!-- ========================================== -->