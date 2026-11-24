      <!-- TAB 9: BÁO CÁO DOANH THU & HIỆU SUẤT -->
      <!-- ========================================== -->
      <style>
        #tab-content-reports #rpt-filter-bar {
          position: sticky;
          top: -0.75rem;
          z-index: 30;
          background-color: #ffffff !important;
          border: 0;
          border-bottom: 1px solid #E2E8F0;
          border-radius: 0 !important;
          box-shadow: 0 2px 8px -2px rgba(15, 23, 42, 0.06);
          margin-top: -0.75rem !important;
          margin-left: -0.75rem;
          margin-right: -0.75rem;
          padding: 1rem 0.75rem 0.625rem 0.75rem;
          box-sizing: border-box;
        }
        @media (min-width: 640px) {
          #tab-content-reports #rpt-filter-bar {
            top: -1.5rem;
            margin-top: -1.5rem !important;
            margin-left: -1.5rem;
            margin-right: -1.5rem;
            padding: 1.5rem 1.5rem 0.625rem 1.5rem;
          }
        }
        #tab-content-reports #rpt-filter-bar .vn-dp-text {
          min-height: 2rem;
          height: 2rem;
          font-size: 0.75rem;
          padding-top: 0;
          padding-bottom: 0;
        }
        #tab-content-reports #rpt-filter-bar .vn-dp-btn {
          min-height: 2rem;
          height: 2rem;
          width: 2.25rem;
        }
        #tab-content-reports .rpt-subtabs-nav {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          margin-top: 0.625rem;
          padding-top: 0.5rem;
          border-top: 1px solid #F1F5F9;
          overflow-x: auto;
          scrollbar-width: none;
        }
        #tab-content-reports .rpt-subtabs-nav::-webkit-scrollbar {
          display: none;
        }
        #tab-content-reports .rpt-subtab-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.4375rem 0.875rem;
          border-radius: 0.5rem;
          border: 1px solid transparent;
          background-color: transparent;
          color: #475569;
          font-size: 0.75rem;
          font-weight: 600;
          white-space: nowrap;
          cursor: pointer;
          transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
        }
        #tab-content-reports .rpt-subtab-btn:hover {
          background-color: #F8FAFC;
          color: #0F172A;
        }
        #tab-content-reports .rpt-subtab-btn.is-active {
          background-color: #F0FDF4;
          color: #15803D;
          border-color: #BBF7D0;
          font-weight: 700;
          box-shadow: inset 0 -2px 0 0 #16A34A;
        }
        #tab-content-reports .rpt-recon-dot {
          width: 8px;
          height: 8px;
          border-radius: 9999px;
          background-color: #DC2626;
          display: inline-block;
          flex-shrink: 0;
        }
        #tab-content-reports .rpt-recon-dot.hidden {
          display: none;
        }
        #tab-content-reports .rpt-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1rem;
        }
        @media (max-width: 860px) {
          #tab-content-reports .rpt-kpi-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 520px) {
          #tab-content-reports .rpt-kpi-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
        #tab-content-reports .rpt-kpi-collapse-btn {
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 0.375rem;
          border: 1px solid #E2E8F0;
          background-color: #F8FAFC;
          color: #475569;
          font-size: 0.875rem;
          font-weight: 700;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
        }
        #tab-content-reports .rpt-kpi-collapse-btn:hover {
          background-color: #F1F5F9;
          color: #0F172A;
        }
        #tab-content-reports .rpt-kpi-uncollected-card {
          border: 1.5px solid #ea580c !important;
        }
        #tab-content-reports .rpt-text-orange {
          color: #ea580c !important;
        }
        #tab-content-reports .rpt-overdue-btn {
          color: #ea580c !important;
        }
        #tab-content-reports .rpt-overdue-btn:hover {
          color: #c2410c !important;
        }
        #tab-content-reports .rpt-badge-orange {
          background-color: #FFF7ED;
          color: #ea580c;
          border: 1px solid #FED7AA;
        }
        #tab-content-reports #rpt-show-zero-pitches {
          accent-color: #16A34A;
          outline: none !important;
          box-shadow: none !important;
        }
        #tab-content-reports #rpt-show-zero-pitches:focus {
          outline: none !important;
          box-shadow: none !important;
        }
        #tab-content-reports #rpt-show-zero-pitches:focus-visible {
          outline: 2px solid #16A34A !important;
          outline-offset: 2px;
          box-shadow: none !important;
        }
        #tab-content-reports #rpt-ledger-card,
        #tab-content-reports #expenses-crud-card {
          scroll-margin-top: 8.5rem;
        }
      </style>

      <div id="tab-content-reports" class="space-y-5 hidden">
        <!-- BỘ LỌC + 4 TAB CON DÍNH KHI CUỘN (NỀN TRẮNG ĐẶC 100%, BÙ PADDING MAIN) -->
        <div id="rpt-filter-bar" class="bg-white">
          <div class="flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div class="flex flex-wrap items-center gap-1.5" role="group" aria-label="Chọn kỳ báo cáo">
              <button type="button" data-rpt-preset="today" onclick="setReportDateRange('today')" class="rpt-preset-btn h-8 px-3 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#334155] font-semibold cursor-pointer transition-colors">Hôm nay</button>
              <button type="button" data-rpt-preset="7days" onclick="setReportDateRange('7days')" class="rpt-preset-btn h-8 px-3 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#334155] font-semibold cursor-pointer transition-colors">7 ngày</button>
              <button type="button" data-rpt-preset="month" onclick="setReportDateRange('month')" class="rpt-preset-btn h-8 px-3 rounded-lg border border-[#16A34A] bg-[#16A34A] text-white font-bold cursor-pointer transition-colors">Tháng này</button>
              <button type="button" data-rpt-preset="last_month" onclick="setReportDateRange('last_month')" class="rpt-preset-btn h-8 px-3 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#334155] font-semibold cursor-pointer transition-colors">Tháng trước</button>
              <button type="button" data-rpt-preset="custom" onclick="setReportDateRange('custom')" class="rpt-preset-btn h-8 px-3 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#334155] font-semibold cursor-pointer transition-colors">Tùy chọn</button>

              <div id="rpt-custom-date-wrap" class="hidden flex-wrap items-center gap-1.5 pl-1">
                <input type="date" id="rpt-from-date" onchange="handleReportCustomDateChange()" aria-label="Từ ngày" class="h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white font-semibold text-[#0F172A]">
                <span class="text-[#64748B] font-semibold">→</span>
                <input type="date" id="rpt-to-date" onchange="handleReportCustomDateChange()" aria-label="Đến ngày" class="h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white font-semibold text-[#0F172A]">
              </div>
              <span id="rpt-period-badge" class="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-[#475569] text-[11px] font-semibold"></span>
              <span id="rpt-date-error" class="hidden text-[11px] font-semibold text-rose-600 pl-1">Ngày bắt đầu phải ≤ ngày kết thúc</span>
            </div>

            <div class="relative shrink-0">
              <button type="button" id="btn-export-reports-menu" onclick="toggleReportExportMenu(event)" class="h-8 px-3 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                <span>Xuất file</span>
                <svg class="w-3 h-3 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M19 9l-7 7-7-7"/></svg>
              </button>
              <div id="rpt-export-dropdown" class="hidden absolute right-0 top-10 w-44 bg-white rounded-xl shadow-xl border border-[#E2E8F0] py-1 z-30 text-xs">
                <button type="button" onclick="exportAdminReportsCSV('excel')" class="w-full text-left px-3.5 py-2 hover:bg-slate-50 font-semibold text-[#0F172A] flex items-center justify-between cursor-pointer">
                  <span>Xuất Excel (.xls)</span>
                  <span class="text-[10px] text-[#16A34A] font-bold">XLS</span>
                </button>
                <button type="button" onclick="exportAdminReportsCSV('csv')" class="w-full text-left px-3.5 py-2 hover:bg-slate-50 font-semibold text-[#0F172A] flex items-center justify-between cursor-pointer">
                  <span>Xuất CSV (.csv)</span>
                  <span class="text-[10px] text-[#64748B] font-bold">UTF-8</span>
                </button>
              </div>
            </div>
          </div>

          <nav class="rpt-subtabs-nav" role="tablist" aria-label="Phân mục báo cáo">
            <button type="button" role="tab" id="rpt-subtab-btn-tong-quan" data-rpt-subtab="tong-quan" onclick="switchReportSubtab('tong-quan')" aria-selected="true" class="rpt-subtab-btn is-active">Tổng quan</button>
            <button type="button" role="tab" id="rpt-subtab-btn-doi-soat" data-rpt-subtab="doi-soat" onclick="switchReportSubtab('doi-soat')" aria-selected="false" class="rpt-subtab-btn">
              <span>Đối soát</span>
              <span id="rpt-recon-dot" class="hidden rpt-recon-dot" title="Có chênh lệch hoặc đơn lệch cọc cần kiểm tra" aria-label="Có chênh lệch đối soát"></span>
            </button>
            <button type="button" role="tab" id="rpt-subtab-btn-chi-tiet" data-rpt-subtab="chi-tiet" onclick="switchReportSubtab('chi-tiet')" aria-selected="false" class="rpt-subtab-btn">Chi tiết</button>
            <button type="button" role="tab" id="rpt-subtab-btn-chi-phi" data-rpt-subtab="chi-phi" onclick="switchReportSubtab('chi-phi')" aria-selected="false" class="rpt-subtab-btn">Chi phí</button>
          </nav>
        </div>

        <!-- TAB CON 1: TỔNG QUAN (#tong-quan) -->
        <section id="rpt-panel-tong-quan" data-rpt-panel="tong-quan" role="tabpanel" aria-labelledby="rpt-subtab-btn-tong-quan" class="space-y-5">
          <!-- TRẠNG THÁI RỖNG KHI KỲ KHÔNG CÓ DỮ LIỆU -->
          <div id="rpt-empty-state" class="hidden ui-card p-8 text-center space-y-2 border border-dashed border-[#CBD5E1] bg-white">
            <div class="text-sm font-heading font-bold text-[#0F172A]">Không có phát sinh doanh thu trong kỳ đã chọn</div>
            <p class="text-xs text-[#64748B]">Thử chọn khoảng thời gian khác hoặc mở rộng bộ lọc để xem dữ liệu.</p>
          </div>

          <!-- 4 THẺ KPI: DOANH THU GHI NHẬN, ĐÃ THU, CHƯA THU, LỢI NHUẬN -->
          <div class="rpt-kpi-grid">
            <div class="ui-card p-4 bg-white border border-[#E2E8F0]" data-kpi-card="recognized">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-semibold text-[#475569]">Doanh thu ghi nhận</span>
                <div class="flex items-center gap-1.5 shrink-0">
                  <span id="rpt-delta-recognized" class="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-[#64748B]">—</span>
                  <button type="button" class="rpt-kpi-collapse-btn" data-kpi-toggle="recognized" onclick="toggleReportKpiCard('recognized')" aria-expanded="true" title="Thu gọn thẻ" aria-label="Thu gọn thẻ Doanh thu ghi nhận">−</button>
                </div>
              </div>
              <div class="rpt-kpi-body">
                <div id="rpt-total-revenue" class="font-heading font-extrabold text-2xl text-[#0F172A] mt-1.5">0đ</div>
                <div class="text-[11px] text-[#64748B] mt-1">Đơn hợp lệ (không tính đơn hủy) + quầy</div>
              </div>
            </div>

            <div class="ui-card p-4 bg-white border border-[#E2E8F0]" data-kpi-card="collected">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-semibold text-[#475569]">Đã thu</span>
                <div class="flex items-center gap-1.5 shrink-0">
                  <span id="rpt-delta-collected" class="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-[#64748B]">—</span>
                  <button type="button" class="rpt-kpi-collapse-btn" data-kpi-toggle="collected" onclick="toggleReportKpiCard('collected')" aria-expanded="true" title="Thu gọn thẻ" aria-label="Thu gọn thẻ Đã thu">−</button>
                </div>
              </div>
              <div class="rpt-kpi-body">
                <div id="rpt-collected-revenue" class="font-heading font-extrabold text-2xl text-[#16A34A] mt-1.5">0đ</div>
                <div class="text-[11px] text-[#64748B] mt-1">Tiền mặt + Chuyển khoản VietQR thực nhận</div>
              </div>
            </div>

            <div id="rpt-card-uncollected" class="ui-card p-4 bg-white rpt-kpi-uncollected-card" data-kpi-card="uncollected">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-semibold text-[#475569]">Chưa thu</span>
                <div class="flex items-center gap-1.5 shrink-0">
                  <span id="rpt-delta-uncollected" class="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-[#64748B]">—</span>
                  <button type="button" class="rpt-kpi-collapse-btn" data-kpi-toggle="uncollected" onclick="toggleReportKpiCard('uncollected')" aria-expanded="true" title="Thu gọn thẻ" aria-label="Thu gọn thẻ Chưa thu">−</button>
                </div>
              </div>
              <div class="rpt-kpi-body">
                <div id="rpt-uncollected-revenue" class="font-heading font-extrabold text-2xl rpt-text-orange mt-1.5" style="color:#ea580c">0đ</div>
                <div class="mt-2 pt-2 border-t border-slate-100 space-y-1 text-[11px]">
                  <button type="button" onclick="openUncollectedDrawer('upcoming')" class="w-full flex items-center justify-between text-left hover:text-[#0F172A] cursor-pointer">
                    <span class="text-[#64748B] underline decoration-dotted">Chưa đến giờ đá (dự kiến thu)</span>
                    <span id="rpt-uncollected-upcoming" class="font-bold text-[#0F172A]">0đ</span>
                  </button>
                  <button type="button" onclick="goToOverdueBookingsFilter()" class="w-full flex items-center justify-between text-left rpt-overdue-btn cursor-pointer" style="color:#ea580c">
                    <span class="font-semibold underline decoration-dotted">Đã đá chưa tất toán (cần xử lý)</span>
                    <span id="rpt-uncollected-overdue" class="font-bold rpt-text-orange" style="color:#ea580c">0đ</span>
                  </button>
                </div>
              </div>
            </div>

            <div class="ui-card p-4 bg-white border border-[#E2E8F0]" data-kpi-card="profit">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-semibold text-[#475569]">Lợi nhuận</span>
                <div class="flex items-center gap-1.5 shrink-0">
                  <span id="rpt-delta-profit" class="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-[#64748B]">—</span>
                  <button type="button" class="rpt-kpi-collapse-btn" data-kpi-toggle="profit" onclick="toggleReportKpiCard('profit')" aria-expanded="true" title="Thu gọn thẻ" aria-label="Thu gọn thẻ Lợi nhuận">−</button>
                </div>
              </div>
              <div class="rpt-kpi-body">
                <div id="rpt-net-profit" class="font-heading font-extrabold text-2xl text-[#475569] mt-1.5">—</div>
                <div id="rpt-profit-note" class="text-[11px] text-[#64748B] mt-1">
                  Chưa nhập chi phí · <a href="#chi-phi" onclick="switchReportSubtab('chi-phi');return false;" class="text-[#16A34A] font-semibold hover:underline">Mở sổ chi →</a>
                </div>
              </div>
            </div>
          </div>

          <!-- BIỂU ĐỒ DOANH THU THEO NGÀY -->
          <div class="ui-card p-4 bg-white border border-[#E2E8F0] space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="font-heading font-bold text-sm text-[#0F172A]">Doanh thu theo ngày</h3>
              <span class="text-[11px] text-[#64748B]">Rê chuột xem chi tiết</span>
            </div>
            <div id="rpt-daily-svg-container" class="w-full h-52 flex items-center justify-center border border-slate-100 rounded-xl bg-slate-50/50 p-2 overflow-x-auto relative">
              <span class="text-xs text-slate-400">Đang tạo biểu đồ...</span>
            </div>
          </div>

          <!-- 2 THANH XẾP CHỒNG: CƠ CẤU THANH TOÁN & CƠ CẤU DOANH THU -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div class="ui-card p-4 bg-white border border-[#E2E8F0] space-y-2.5">
              <div class="flex items-center justify-between text-xs">
                <span class="font-heading font-bold text-[#0F172A]">Cơ cấu thanh toán</span>
                <span id="rpt-stack-pay-total" class="font-bold text-[#475569]">0đ</span>
              </div>
              <div id="rpt-stack-pay-bar" class="w-full h-3.5 rounded-full bg-slate-100 overflow-hidden flex"></div>
              <div id="rpt-stack-pay-legend" class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#475569]"></div>
            </div>

            <div class="ui-card p-4 bg-white border border-[#E2E8F0] space-y-2.5">
              <div class="flex items-center justify-between text-xs">
                <span class="font-heading font-bold text-[#0F172A]">Cơ cấu doanh thu (Tiền sân / Dịch vụ &amp; Nước)</span>
                <span id="rpt-stack-rev-total" class="font-bold text-[#475569]">0đ</span>
              </div>
              <div id="rpt-stack-rev-bar" class="w-full h-3.5 rounded-full bg-slate-100 overflow-hidden flex"></div>
              <div id="rpt-stack-rev-legend" class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#475569]"></div>
            </div>
          </div>
        </section>

        <!-- TAB CON 2: ĐỐI SOÁT (#doi-soat) -->
        <section id="rpt-panel-doi-soat" data-rpt-panel="doi-soat" role="tabpanel" aria-labelledby="rpt-subtab-btn-doi-soat" class="space-y-5 hidden">
          <div id="rpt-reconciliation-card" class="ui-card bg-white border border-[#E2E8F0] overflow-hidden">
            <div id="rpt-recon-details" class="block">
              <div class="px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0]">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-heading font-bold text-sm text-[#0F172A]">Đối soát độc lập 3 nguồn dữ liệu</span>
                  <span id="rpt-formula-badge" class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">Khớp</span>
                </div>
                <span class="text-[11px] text-[#64748B]">So sánh trực tiếp từng nguồn độc lập · không bù trừ chéo</span>
              </div>
              <div id="rpt-recon-body" class="p-4 space-y-4 text-xs bg-[#F8FAFC]">
                <div id="rpt-recon-alert" class="hidden p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 space-y-1.5"></div>
                <div id="rpt-recon-items" class="grid grid-cols-1 lg:grid-cols-3 gap-3"></div>
                <div id="rpt-recon-deviants" class="hidden p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2.5"></div>
                <div id="rpt-recon-deviants-empty" class="hidden p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
                  ✓ Không có đơn nào có mức cọc khác tỷ lệ chuẩn trong kỳ lọc.
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- TAB CON 3: CHI TIẾT (#chi-tiet) -->
        <section id="rpt-panel-chi-tiet" data-rpt-panel="chi-tiet" role="tabpanel" aria-labelledby="rpt-subtab-btn-chi-tiet" class="space-y-5 hidden">
          <!-- 3 THẺ VẬN HÀNH ĐẦU TAB -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="ui-card p-4 bg-white border border-[#E2E8F0]">
              <div class="text-xs text-[#64748B]">Ca thi đấu</div>
              <div id="rpt-total-matches" class="font-heading font-extrabold text-xl text-[#0F172A] mt-1">0 ca</div>
              <div id="rpt-matches-sub" class="text-[11px] text-[#64748B] mt-0.5">Ca đặt hợp lệ trong kỳ lọc</div>
            </div>
            <div class="ui-card p-4 bg-white border border-[#E2E8F0]">
              <div class="text-xs text-[#64748B]">Tỷ lệ lấp đầy</div>
              <div id="rpt-occupancy-rate" class="font-heading font-extrabold text-xl text-[#0F172A] mt-1">0%</div>
              <div id="rpt-occupancy-sub" class="text-[11px] text-[#64748B] mt-0.5">Giờ đã đặt / Giờ mở cửa sân hoạt động</div>
            </div>
            <div class="ui-card p-4 bg-white border border-[#E2E8F0]">
              <div class="text-xs text-[#64748B]">Trung bình / ca</div>
              <div id="rpt-avg-revenue" class="font-heading font-extrabold text-xl text-[#0F172A] mt-1">0đ</div>
              <div class="text-[11px] text-[#64748B] mt-0.5">Doanh thu ghi nhận bình quân</div>
            </div>
          </div>

          <!-- BẢNG HIỆU SUẤT THEO SÂN -->
          <div class="ui-card bg-white border border-[#E2E8F0] overflow-hidden">
            <div class="p-4 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 class="font-heading font-bold text-sm text-[#0F172A]">Hiệu suất khai thác theo từng sân</h3>
                <p class="text-[11px] text-[#64748B]">Bấm tiêu đề cột để sắp xếp · Mặc định chỉ hiện sân có phát sinh</p>
              </div>
              <label class="inline-flex items-center gap-2 text-xs font-semibold text-[#334155] cursor-pointer select-none">
                <input type="checkbox" id="rpt-show-zero-pitches" onchange="renderAdminPitchTable()" class="w-4 h-4 rounded accent-[#16A34A] cursor-pointer">
                <span>Hiện tất cả sân (gồm 0 ca)</span>
              </label>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs min-w-[640px]">
                <thead class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
                  <tr>
                    <th class="py-3 px-4 cursor-pointer hover:text-[#0F172A] select-none" onclick="sortAdminPitchTable('name')">Tên sân <span data-sort-ind="name" class="text-[10px]"></span></th>
                    <th class="py-3 px-4">Loại sân</th>
                    <th class="py-3 px-4">Trạng thái</th>
                    <th class="py-3 px-4 text-center cursor-pointer hover:text-[#0F172A] select-none" onclick="sortAdminPitchTable('matches')">Số ca <span data-sort-ind="matches" class="text-[10px]"></span></th>
                    <th class="py-3 px-4 text-right cursor-pointer hover:text-[#0F172A] select-none" onclick="sortAdminPitchTable('occupancyRate')">% Lấp đầy <span data-sort-ind="occupancyRate" class="text-[10px]"></span></th>
                    <th class="py-3 px-4 text-right cursor-pointer hover:text-[#0F172A] select-none" onclick="sortAdminPitchTable('collectedRevenue')">Đã thu <span data-sort-ind="collectedRevenue" class="text-[10px]"></span></th>
                    <th class="py-3 px-4 text-right cursor-pointer hover:text-[#0F172A] select-none" onclick="sortAdminPitchTable('revenue')">Doanh thu ghi nhận <span data-sort-ind="revenue" class="text-[10px]">↓</span></th>
                  </tr>
                </thead>
                <tbody id="admin-reports-tbody" class="divide-y divide-[#E2E8F0]"></tbody>
                <tfoot id="admin-reports-tfoot" class="bg-[#F8FAFC] border-t-2 border-[#CBD5E1] font-bold text-[#0F172A]"></tfoot>
              </table>
            </div>
          </div>

          <!-- DOANH THU THEO KHUNG GIỜ (KHÔNG THANH CUỘN LỒNG BÊN TRONG) -->
          <div class="ui-card p-4 bg-white border border-[#E2E8F0] space-y-3">
            <div class="flex items-center justify-between gap-2">
              <h3 class="font-heading font-bold text-sm text-[#0F172A]">Doanh thu theo khung giờ</h3>
              <span class="text-[11px] text-[#64748B]">Gom theo ca thi đấu</span>
            </div>
            <div id="rpt-slot-svg-container" class="w-full min-h-[160px] flex items-center justify-center border border-slate-100 rounded-xl bg-slate-50/50 p-3">
              <span class="text-xs text-slate-400">Đang tạo biểu đồ...</span>
            </div>
            <div id="rpt-slot-toggle-wrap" class="hidden flex justify-center"></div>
          </div>

          <!-- BẢNG KÊ CHI TIẾT CA ĐẶT TRONG KỲ -->
          <div id="rpt-ledger-card" class="ui-card bg-white border border-[#E2E8F0] overflow-hidden space-y-3 p-4">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-[#E2E8F0]">
              <div>
                <h3 class="font-heading font-bold text-sm text-[#0F172A]">Bảng kê chi tiết ca đặt trong kỳ</h3>
                <p class="text-xs text-[#64748B]">Chi tiết từng ca thi đấu hợp lệ, số tiền đã thu và còn lại chưa thu</p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <select id="rpt-ledger-status-filter" onchange="handleReportLedgerSearch()" aria-label="Lọc trạng thái ca đặt" class="h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-semibold text-[#0F172A]">
                  <option value="all">Tất cả trạng thái</option>
                  <option value="overdue">Đã đá chưa tất toán</option>
                  <option value="uncollected">Còn chưa thu (&gt; 0đ)</option>
                  <option value="completed">Hoàn thành</option>
                </select>
                <input type="text" id="rpt-ledger-search" oninput="handleReportLedgerSearch()" placeholder="Tìm mã đơn, khách, SĐT, sân..." class="h-8 px-3 rounded-lg border border-[#CBD5E1] bg-white text-xs w-full sm:w-56">
              </div>
            </div>
            <div id="rpt-ledger-filter-chip" class="hidden flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs" style="background-color:#FFF7ED;border:1px solid #FED7AA;color:#9A3412">
              <span id="rpt-ledger-filter-chip-text" class="font-semibold">Đang lọc: Đã đá chưa tất toán (cần xử lý)</span>
              <button type="button" onclick="resetReportLedgerFilters()" class="font-bold underline cursor-pointer">Xem tất cả</button>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs min-w-[900px]">
                <thead class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
                  <tr>
                    <th class="py-2.5 px-3">Mã đơn</th>
                    <th class="py-2.5 px-3">Ngày &amp; Giờ đá</th>
                    <th class="py-2.5 px-3">Sân bóng</th>
                    <th class="py-2.5 px-3">Khách hàng</th>
                    <th class="py-2.5 px-3 text-right">Ghi nhận</th>
                    <th class="py-2.5 px-3 text-right">Đã thu</th>
                    <th class="py-2.5 px-3 text-right">Chưa thu</th>
                    <th class="py-2.5 px-3 text-right">Dịch vụ</th>
                    <th class="py-2.5 px-3">Trạng thái</th>
                    <th class="py-2.5 px-3">Phương thức</th>
                  </tr>
                </thead>
                <tbody id="rpt-ledger-tbody" class="divide-y divide-[#E2E8F0]">
                  <tr><td colspan="10" class="py-4 text-center text-slate-400">Đang tải bảng kê...</td></tr>
                </tbody>
              </table>
            </div>
            <div class="flex items-center justify-between pt-2 border-t border-[#E2E8F0] text-xs">
              <span id="rpt-ledger-count-info" class="text-[#64748B]">Hiển thị 0 / 0 ca</span>
              <div class="flex items-center gap-2">
                <button type="button" id="rpt-ledger-prev-btn" onclick="changeReportLedgerPage(-1)" class="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 font-semibold cursor-pointer disabled:opacity-50">« Trước</button>
                <span id="rpt-ledger-page-info" class="font-bold text-[#0F172A]">Trang 1 / 1</span>
                <button type="button" id="rpt-ledger-next-btn" onclick="changeReportLedgerPage(1)" class="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 font-semibold cursor-pointer disabled:opacity-50">Sau »</button>
              </div>
            </div>
            <div id="rpt-forfeit-bookings-box" class="hidden pt-2 border-t border-slate-100 text-xs"></div>
          </div>
        </section>

        <!-- TAB CON 4: CHI PHÍ (#chi-phi) -->
        <section id="rpt-panel-chi-phi" data-rpt-panel="chi-phi" role="tabpanel" aria-labelledby="rpt-subtab-btn-chi-phi" class="space-y-5 hidden">
          <!-- TỔNG HỢP CHI PHÍ VẬN HÀNH & PHÂN BỔ DANH MỤC -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div class="ui-card p-5 bg-white border border-[#E2E8F0] flex flex-col justify-between">
              <div>
                <div class="text-xs font-semibold text-[#64748B]">Chi phí vận hành</div>
                <div id="rpt-total-expenses" class="font-heading font-extrabold text-2xl text-[#0F172A] mt-1.5">—</div>
                <div id="rpt-expenses-sub" class="text-[11px] text-[#64748B] mt-1">
                  Chưa nhập chi phí trong kỳ
                </div>
              </div>
            </div>

            <div class="lg:col-span-2 ui-card p-5 bg-white border border-[#E2E8F0] space-y-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h3 class="font-heading font-bold text-sm text-[#0F172A]">Phân bổ chi phí theo danh mục</h3>
                <span id="rpt-expense-list-total" class="text-xs font-bold text-[#475569]">0đ</span>
              </div>
              <div id="rpt-expense-categories-chart" class="space-y-2.5 text-xs"></div>
            </div>
          </div>

          <!-- SỔ CHI DUY NHẤT -->
          <div id="expenses-crud-card" class="ui-card p-5 space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
              <div>
                <h3 class="font-heading font-bold text-base text-[#0F172A]">Sổ chi</h3>
                <p class="text-xs text-[#64748B]">Ghi nhận các khoản chi phát sinh tại cụm sân để tính lãi ròng chính xác</p>
              </div>
              <div class="flex flex-wrap items-center gap-2 text-xs">
                <select id="exp-filter-category" onchange="loadAdminExpenses()" class="h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white font-semibold">
                  <option value="all">Tất cả danh mục</option>
                  <option value="dien_nuoc">Tiền điện, nước sân</option>
                  <option value="bao_tri">Bảo trì &amp; Sửa chữa cỏ/đèn</option>
                  <option value="nhap_hang">Nhập hàng (Nước, Áo, Bóng)</option>
                  <option value="luong_nhan_vien">Lương &amp; Thưởng nhân viên</option>
                  <option value="khac">Chi phí vận hành khác</option>
                </select>
                <button type="button" onclick="loadAdminExpenses()" class="px-3 h-8 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-50 font-bold cursor-pointer">Làm mới</button>
              </div>
            </div>

            <form id="admin-expense-form" onsubmit="handleAddExpense(event)" class="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3 text-xs">
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label for="exp-date" class="block text-[11px] font-bold text-[#475569] mb-1">Ngày chi *</label>
                  <input type="date" id="exp-date" required class="input-field h-9 text-xs font-bold bg-white">
                </div>
                <div>
                  <label for="exp-category" class="block text-[11px] font-bold text-[#475569] mb-1">Danh mục chi *</label>
                  <select id="exp-category" required class="input-field h-9 text-xs font-semibold bg-white">
                    <option value="dien_nuoc">Tiền điện, nước sân</option>
                    <option value="bao_tri">Bảo trì &amp; Sửa chữa cỏ/đèn</option>
                    <option value="nhap_hang">Nhập hàng (Nước, Áo, Bóng)</option>
                    <option value="luong_nhan_vien">Lương &amp; Thưởng nhân viên</option>
                    <option value="khac">Chi phí vận hành khác</option>
                  </select>
                </div>
                <div>
                  <label for="exp-amount" class="block text-[11px] font-bold text-[#475569] mb-1">Số tiền chi (VNĐ) *</label>
                  <input type="number" id="exp-amount" min="1000" step="1000" required placeholder="VD: 500000" class="input-field h-9 text-xs font-bold text-rose-600 bg-white">
                </div>
                <div>
                  <label for="exp-payer" class="block text-[11px] font-bold text-[#475569] mb-1">Người chi</label>
                  <input type="text" id="exp-payer" placeholder="Tên nhân sự chi tiền" class="input-field h-9 text-xs font-semibold bg-white">
                </div>
                <div>
                  <label for="exp-note" class="block text-[11px] font-bold text-[#475569] mb-1">Ghi chú / Chứng từ</label>
                  <input type="text" id="exp-note" placeholder="VD: Nhập 10 thùng Aquafina..." class="input-field h-9 text-xs bg-white">
                </div>
              </div>
              <div class="flex justify-end">
                <button type="submit" id="exp-submit-btn" class="btn-sm btn-primary font-bold cursor-pointer">+ Ghi khoản chi</button>
              </div>
            </form>

            <div class="overflow-x-auto border border-[#E2E8F0] rounded-xl">
              <table class="w-full text-left text-xs min-w-[780px]">
                <thead class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
                  <tr>
                    <th class="py-3 px-4">Mã chi</th>
                    <th class="py-3 px-4">Ngày chi</th>
                    <th class="py-3 px-4">Danh mục</th>
                    <th class="py-3 px-4">Người chi</th>
                    <th class="py-3 px-4">Ghi chú</th>
                    <th class="py-3 px-4 text-right">Số tiền</th>
                    <th class="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody id="admin-expenses-tbody" class="divide-y divide-[#E2E8F0]">
                  <tr><td colspan="7" class="py-5 text-center text-[#94A3B8]">Đang tải sổ chi vận hành...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <!-- MODAL XEM DANH SÁCH ĐƠN CHƯA THU -->
        <div id="rpt-uncollected-modal" style="margin-top:0" class="hidden fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs items-center justify-center p-4" onclick="if(event.target===this) closeUncollectedDrawer()">
          <div class="bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            <div class="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div>
                <h4 id="rpt-uncollected-modal-title" class="font-heading font-bold text-sm text-[#0F172A]">Danh sách đơn chưa thu</h4>
                <p id="rpt-uncollected-modal-sub" class="text-[11px] text-[#64748B]"></p>
              </div>
              <button type="button" onclick="closeUncollectedDrawer()" class="w-8 h-8 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-100 text-xs font-bold cursor-pointer">✕</button>
            </div>
            <div class="overflow-x-auto overflow-y-auto p-4 flex-1">
              <table class="w-full text-left text-xs min-w-[600px]">
                <thead class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
                  <tr>
                    <th class="py-2 px-3">Mã đơn</th>
                    <th class="py-2 px-3">Ngày &amp; Giờ</th>
                    <th class="py-2 px-3">Sân &amp; Khách</th>
                    <th class="py-2 px-3 text-right">Đã thu</th>
                    <th class="py-2 px-3 text-right">Chưa thu</th>
                    <th class="py-2 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody id="rpt-uncollected-tbody" class="divide-y divide-[#E2E8F0]"></tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- MODAL SỬA KHOẢN CHI (EXPENSE EDIT MODAL) -->
        <div id="admin-expense-edit-modal" style="margin-top:0" class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm hidden flex items-center justify-center p-4">
          <div class="ui-card max-w-lg w-full p-5 space-y-4 bg-white shadow-2xl rounded-2xl">
            <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 class="font-heading font-bold text-base text-[#0F172A]">Chỉnh sửa khoản chi phí</h3>
              <button type="button" onclick="closeAdminExpenseEditModal()" class="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer">✕</button>
            </div>
            <form id="admin-expense-edit-form" onsubmit="handleSaveEditExpense(event)" class="space-y-3 text-xs">
              <input type="hidden" id="edit-exp-id">
              <div>
                <label for="edit-exp-date" class="block font-bold text-[#475569] mb-1">Ngày chi *</label>
                <input type="date" id="edit-exp-date" required class="input-field h-9 text-xs font-bold bg-white w-full">
              </div>
              <div>
                <label for="edit-exp-category" class="block font-bold text-[#475569] mb-1">Danh mục chi *</label>
                <select id="edit-exp-category" required class="input-field h-9 text-xs font-semibold bg-white w-full">
                  <option value="dien_nuoc">Tiền điện, nước sân</option>
                  <option value="bao_tri">Bảo trì &amp; Sửa chữa cỏ/đèn</option>
                  <option value="nhap_hang">Nhập hàng (Nước, Áo, Bóng)</option>
                  <option value="luong_nhan_vien">Lương &amp; Thưởng nhân viên</option>
                  <option value="khac">Chi phí vận hành khác</option>
                </select>
              </div>
              <div>
                <label for="edit-exp-amount" class="block font-bold text-[#475569] mb-1">Số tiền chi (VNĐ) *</label>
                <input type="number" id="edit-exp-amount" min="1000" step="1000" required class="input-field h-9 text-xs font-bold text-rose-600 bg-white w-full">
              </div>
              <div>
                <label for="edit-exp-payer" class="block font-bold text-[#475569] mb-1">Người chi</label>
                <input type="text" id="edit-exp-payer" class="input-field h-9 text-xs font-semibold bg-white w-full">
              </div>
              <div>
                <label for="edit-exp-note" class="block font-bold text-[#475569] mb-1">Ghi chú / Chứng từ</label>
                <input type="text" id="edit-exp-note" class="input-field h-9 text-xs bg-white w-full">
              </div>
              <div class="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                <button type="button" onclick="closeAdminExpenseEditModal()" class="px-3 py-1.5 rounded-lg border border-slate-300 font-semibold hover:bg-slate-50 cursor-pointer">Hủy</button>
                <button type="submit" id="edit-exp-submit-btn" class="px-3 py-1.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white font-bold cursor-pointer">Lưu thay đổi</button>
              </div>
            </form>
          </div>
        </div>
      </div>
