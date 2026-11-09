      <!-- TAB 2: LỊCH ĐẶT SÂN TIMELINE GANTT (Frame 12) -->
      <!-- ========================================== -->
      <div id="tab-content-timeline" class="space-y-4 hidden">
        <div class="ui-card p-4 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span class="font-heading font-bold text-sm text-[#0F172A]">Lịch ma trận sân hôm nay:</span>
            <span class="px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#16A34A] text-xs font-bold">Thứ Sáu, 06/11/2026</span>
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
            <span class="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[#15803D] font-semibold">💡 Bấm vào bất kỳ ca đá nào trên Timeline để mở bảng Điều Hành Ca Đá & Thanh Toán bên dưới</span>
          </div>
          <div class="min-w-[900px]">
            <!-- Timeline Hours Header 05:30 -> 22:30 -->
            <div class="grid grid-cols-12 border-b border-[#E2E8F0] pb-2 text-[11px] font-bold text-[#64748B] pl-28 text-center">
              <div>05:30</div><div>07:00</div><div>08:30</div><div>14:00</div><div>15:30</div>
              <div>17:00</div><div class="text-[#DC2626] font-extrabold">17:30 ▼</div><div>18:30</div>
              <div>20:00</div><div>21:30</div><div>22:30</div><div>23:00</div>
            </div>

            <!-- 6 Rows for 6 Pitches (Frame 12) -->
            <div id="gantt-rows" class="divide-y divide-[#E2E8F0] pt-2">
              <!-- Rendered by JS -->
            </div>
          </div>
        </div>

        <!-- TÍCH HỢP TRỰC TIẾP: ĐIỀU HÀNH CA ĐÁ & THANH TOÁN NGAY TẠI LỊCH ĐẶT SÂN TIMELINE -->
        <div id="timeline-inplay-workspace" class="rounded-2xl shadow-sm overflow-hidden border border-slate-200">
          <!-- Header nổi bật -->
          <div class="bg-[#0F172A] text-white p-5 rounded-t-2xl flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-[#16A34A] text-white flex items-center justify-center text-lg font-extrabold shrink-0">⚽</div>
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="font-heading font-extrabold text-sm sm:text-base">Điều Hành Ca Đá & Thanh Toán (Tích hợp trực tiếp tại Lịch Đặt Sân)</h3>
                  <span id="inplay-modal-code" class="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-mono text-xs font-bold">#---</span>
                  <span id="inplay-modal-status" class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold">Đang đá</span>
                </div>
                <div class="text-xs text-slate-300 mt-0.5">
                  Sân: <b id="inplay-modal-pitch" class="text-white">---</b> · Khách hàng: <b id="inplay-modal-customer" class="text-white">---</b>
                </div>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <select id="inline-inplay-select" onchange="openInPlayModal(this.value)" class="h-9 px-3 rounded-lg bg-slate-800 border border-slate-600 text-white text-xs font-bold min-w-[260px]"></select>
              <button type="button" onclick="handleInlineCheckinCurrent()" id="inline-checkin-btn" class="px-3 py-1.5 rounded-lg bg-[#16A34A] hover:bg-emerald-500 text-white text-xs font-bold">✓ Check-in Nhận Sân</button>
              <button type="button" onclick="restoreCurrentCancelledBooking()" id="inline-restore-btn" class="hidden px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold">🔄 Khôi phục lại ca đá</button>
            </div>
          </div>

          <!-- Thanh danh sách thẻ chọn nhanh các đơn đặt sân -->
          <div id="inline-inplay-quick-cards" class="px-5 py-3 bg-slate-100 border-b border-slate-200 flex items-center gap-2 overflow-x-auto text-xs"></div>

          <!-- Phần thân 2 cột -->
          <div class="p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 bg-white rounded-b-2xl border border-t-0 border-slate-200">
            <!-- Cột trái: 4 Nghiệp vụ điều hành ca đá (7 cols) -->
            <div class="lg:col-span-7 space-y-4">
              <!-- 1. Đá thêm giờ (Gia hạn ca đá) -->
              <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div class="flex items-center justify-between">
                  <h4 class="font-heading font-bold text-sm text-[#0F172A] flex items-center gap-1.5">
                    <span>⏱️</span> 1. Đá thêm giờ (Gia hạn ca đá)
                  </h4>
                  <span class="text-[11px] text-[#64748B]">Tự động tính phụ thu theo giá sân</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
                  <div>
                    <label class="block text-[11px] font-bold text-[#475569] mb-1">Thời lượng thêm</label>
                    <select id="inplay-overtime-mins" onchange="updateInPlayOvertimePreview && updateInPlayOvertimePreview()" class="input-field h-9 text-xs font-bold">
                      <option value="30">+ 30 phút</option>
                      <option value="60">+ 60 phút (1 tiếng)</option>
                      <option value="90">+ 90 phút (1.5 tiếng)</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-[#475569] mb-1">Phụ thu thêm giờ (VNĐ)</label>
                    <input type="number" id="inplay-overtime-fee" class="input-field h-9 text-xs font-extrabold text-[#16A34A]" placeholder="Tự động tính...">
                  </div>
                  <button type="button" onclick="submitInPlayOvertime()" class="btn-sm btn-primary h-9 font-bold w-full">
                    + Cộng thêm giờ
                  </button>
                </div>
              </div>

              <!-- 2. Chuyển sân (Đổi sân khác lúc đang chơi) -->
              <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div class="flex items-center justify-between">
                  <h4 class="font-heading font-bold text-sm text-[#0F172A] flex items-center gap-1.5">
                    <span>🔄</span> 2. Chuyển sân (Đổi sân khác lúc đang chơi)
                  </h4>
                  <span class="text-[11px] text-[#2563EB] font-semibold">Giải phóng sân cũ ngay lập tức</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label class="block text-[11px] font-bold text-[#475569] mb-1">Chọn sân chuyển đến</label>
                    <select id="inplay-new-pitch" class="input-field h-9 text-xs font-bold"></select>
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-[#475569] mb-1">Lý do chuyển sân</label>
                    <input type="text" id="inplay-transfer-reason" placeholder="VD: Khách muốn nâng lên sân 7, đèn sân cũ bảo trì..." class="input-field h-9 text-xs">
                  </div>
                </div>
                <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <label class="flex items-center gap-2 text-xs text-[#475569] cursor-pointer font-medium">
                    <input type="checkbox" id="inplay-adjust-price" checked class="w-4 h-4 rounded text-[#16A34A]">
                    <span>Tự động cập nhật lại tiền sân nếu đổi khác loại sân (Sân 5 ↔ Sân 7/11)</span>
                  </label>
                  <button type="button" onclick="submitInPlayTransfer()" class="btn-sm bg-[#2563EB] hover:bg-blue-700 text-white font-bold">
                    Xác nhận chuyển sân
                  </button>
                </div>
              </div>

              <!-- 3. Gọi thêm nước uống / dịch vụ tại sân -->
              <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div class="flex items-center justify-between">
                  <h4 class="font-heading font-bold text-sm text-[#0F172A] flex items-center gap-1.5">
                    <span>🥤</span> 3. Gọi thêm nước uống / dịch vụ tại sân
                  </h4>
                  <span class="text-[11px] text-[#16A34A] font-semibold">Cộng dồn vào hóa đơn trận đấu</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                  <div class="sm:col-span-7">
                    <label class="block text-[11px] font-bold text-[#475569] mb-1">Chọn dịch vụ / đồ uống</label>
                    <select id="inplay-service-select" class="input-field h-9 text-xs font-semibold"></select>
                  </div>
                  <div class="sm:col-span-2">
                    <label class="block text-[11px] font-bold text-[#475569] mb-1">Số lượng</label>
                    <input type="number" id="inplay-service-qty" value="1" min="1" max="50" class="input-field h-9 text-xs font-bold text-center">
                  </div>
                  <div class="sm:col-span-3">
                    <button type="button" onclick="submitInPlayService()" class="btn-sm btn-primary h-9 w-full font-bold">
                      + Thêm vào hóa đơn
                    </button>
                  </div>
                </div>
                <div id="inplay-services-list" class="text-xs text-[#475569] space-y-1 pt-1"></div>
              </div>

              <!-- 4. Hủy lịch trước thời hạn / Khách chưa đến & Nhả sân -->
              <div class="p-4 rounded-xl bg-red-50/60 border border-red-200 space-y-3">
                <div class="flex flex-wrap items-center justify-between gap-1">
                  <h4 class="font-heading font-bold text-sm text-red-700 flex items-center gap-1.5">
                    <span>🛑</span> 4. Hủy lịch trước thời hạn / Khách chưa đến & Nhả sân
                  </h4>
                  <span class="text-[11px] text-red-600 font-semibold">Áp dụng khi khách báo hủy, quá giờ chưa đến hoặc nghỉ sớm</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label class="block text-[11px] font-bold text-red-800 mb-1">Chính sách xử lý tiền cọc</label>
                    <select id="inplay-cancel-policy" class="input-field h-9 text-xs font-semibold bg-white">
                      <option value="refund_100">Hoàn cọc 100% (Báo trước hạn / Mưa lớn)</option>
                      <option value="reserve">Bảo lưu cọc sang buổi khác</option>
                      <option value="forfeit_50">Hủy sát giờ - Phạt 50% cọc</option>
                      <option value="noshow_forfeit">Khách quá giờ chưa đến - Tịch thu cọc 30% & Nhả sân</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-red-800 mb-1">Lý do hủy lịch / nhả sân</label>
                    <input type="text" id="inplay-cancel-reason" placeholder="VD: Khách báo bận đột xuất, quá 15 phút chưa đến sân..." class="input-field h-9 text-xs bg-white">
                  </div>
                </div>
                <div class="flex justify-end">
                  <button type="button" onclick="submitInPlayEarlyCancel()" class="btn-sm bg-red-600 hover:bg-red-700 text-white font-bold">
                    Xác nhận hủy lịch & Nhả sân
                  </button>
                </div>
              </div>
            </div>

            <!-- Cột phải: Quyết toán & Thu tiền còn lại (5 cols) -->
            <div class="lg:col-span-5 flex flex-col justify-between p-5 rounded-2xl bg-gradient-to-b from-emerald-50/90 to-white border-2 border-emerald-200 space-y-4">
              <div class="space-y-4">
                <div class="flex items-center justify-between border-b border-emerald-200 pb-3">
                  <div>
                    <h4 class="font-heading font-extrabold text-base text-[#0F172A]">💰 Quyết Toán & Thu Tiền Còn Lại</h4>
                    <p class="text-[11px] text-[#64748B]">Tổng hợp tiền sân, phụ thu thêm giờ và dịch vụ gọi thêm</p>
                  </div>
                  <span class="px-2.5 py-1 rounded-full bg-[#16A34A] text-white text-[10px] font-bold">Thu 70% + Phụ thu</span>
                </div>

                <div class="space-y-2.5 text-xs bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
                  <div class="flex justify-between items-center">
                    <span class="text-[#64748B]">Tổng hóa đơn trận đấu:</span>
                    <span id="inplay-bill-total" class="font-heading font-extrabold text-base text-[#0F172A]">0đ</span>
                  </div>
                  <div class="flex justify-between items-center text-emerald-700">
                    <span>Đã thanh toán cọc trước (30%):</span>
                    <span id="inplay-bill-deposit" class="font-bold">-0đ</span>
                  </div>
                  <div class="pt-2.5 border-t border-slate-200 flex justify-between items-baseline">
                    <span class="font-bold text-sm text-[#0F172A]">Số tiền còn lại phải thu:</span>
                    <span id="inplay-bill-remaining" class="font-heading font-extrabold text-2xl text-[#DC2626]">0đ</span>
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-bold text-[#0F172A] mb-1.5">Hình thức thu tiền còn lại:</label>
                  <select id="inplay-pay-method" onchange="toggleInPlayVietQR && toggleInPlayVietQR()" class="input-field font-bold text-xs bg-white">
                    <option value="Tiền mặt tại quầy">💵 Tiền mặt tại quầy</option>
                    <option value="Chuyển khoản VietQR">📱 Chuyển khoản VietQR</option>
                  </select>
                </div>

                <!-- Khung VietQR thu tiền còn lại -->
                <div id="inplay-vietqr-box" class="hidden p-3 rounded-xl bg-white border border-emerald-200 text-center space-y-2">
                  <div class="text-[11px] font-bold text-[#15803D]">Quét mã VietQR thu phần tiền còn lại</div>
                  <img id="inplay-vietqr-img" src="" alt="VietQR Remaining" class="w-40 h-40 mx-auto object-contain rounded-lg border border-slate-200">
                  <div class="text-[10px] text-[#64748B]">Tự động điền đúng số tiền còn lại & nội dung thanh toán</div>
                </div>
              </div>

              <div class="space-y-2.5 pt-3 border-t border-emerald-200">
                <button type="button" onclick="submitInPlayPayRemaining()" class="btn-base btn-primary w-full font-extrabold text-xs py-2.5 shadow-md">✅ Thu Đủ Tiền Còn Lại & Hoàn Thành Ca</button>
                <button type="button" onclick="openInvoiceFromInPlay()" class="btn-base bg-[#0F172A] hover:bg-slate-800 text-white w-full font-bold text-xs py-2.5">🖨️ Xem & In Hóa Đơn</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
