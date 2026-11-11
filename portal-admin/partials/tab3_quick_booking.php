      <!-- TAB 3: VẬN HÀNH QUẦY TOÀN DIỆN (ĐẶT SÂN, BÁN NƯỚC & CHỐT CA) -->
      <!-- ========================================== -->
      <div id="tab-content-quick-booking" class="space-y-6 hidden">
        <div class="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <!-- KHỐI 1: ĐẶT SÂN TẠI QUẦY & KHÓA LỊCH TỨC THÌ (5 CỘT) -->
          <div class="xl:col-span-5 ui-card p-5 sm:p-6 space-y-4">
            <div class="border-b border-[#E2E8F0] pb-3 flex items-center justify-between gap-2">
              <div>
                <h3 class="font-heading font-extrabold text-base sm:text-lg text-[#0F172A]">1. Đặt sân tại quầy &amp; Khóa lịch tức thì</h3>
                <p class="text-xs text-[#64748B] mt-0.5">Nhân viên trực sân điền thông tin để khóa lịch tức thì, chống đè lịch khách online.</p>
              </div>
              <span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold shrink-0">Khóa sân 1 chạm</span>
            </div>

            <form id="admin-walkin-form" class="space-y-4 text-xs">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block font-bold text-[#475569] mb-1">Tên khách / Đội bóng *</label>
                  <input type="text" id="admin-cust-name" required placeholder="Ví dụ: FC Cầu Giấy (Anh Tuấn)" class="input-field w-full font-semibold">
                </div>
                <div>
                  <label class="block font-bold text-[#475569] mb-1">Số điện thoại liên hệ *</label>
                  <input type="tel" id="admin-cust-phone" required placeholder="0352 313 548" class="input-field w-full font-semibold">
                </div>
              </div>

              <!-- Hộp cảnh báo No-Show / Công nợ ngay dưới ô SĐT -->
              <div id="walkin-noshow-warning" class="hidden p-3 rounded-xl bg-red-50 border-2 border-red-300 text-xs text-red-800 font-bold leading-relaxed">
                <div id="walkin-noshow-warning-text"></div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block font-bold text-[#475569] mb-1">Chọn sân bóng *</label>
                  <select id="admin-pitch-select" class="input-field w-full font-bold">
                    <!-- Rendered by JS -->
                  </select>
                </div>
                <div>
                  <label class="block font-bold text-[#475569] mb-1">Ngày thi đấu *</label>
                  <input type="date" id="admin-book-date" required class="input-field w-full font-bold text-[#0F172A]">
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block font-bold text-[#475569] mb-1">Khung giờ đá *</label>
                  <select id="admin-slot-select" class="input-field w-full font-bold text-[#16A34A]">
                    <!-- Rendered by JS -->
                  </select>
                </div>
                <div>
                  <label class="block font-bold text-[#475569] mb-1">Gói đặt sân / Thời hạn</label>
                  <select id="admin-book-package" class="input-field w-full font-semibold">
                    <option value="1">Đặt lẻ 1 trận (Theo giờ)</option>
                    <option value="4">Gói 1 tháng (4 tuần - Giảm 5% + Tặng bóng &amp; nước)</option>
                    <option value="8">Gói 2 tháng (8 tuần - Giảm 10% + Tặng 1 thùng nước &amp; Bib)</option>
                    <option value="12">Gói 3 tháng VIP (12 tuần - Giảm 15% + Tặng 2 thùng nước &amp; 1 Trọng tài/trận)</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block font-bold text-[#475569] mb-1">Hình thức cọc / thanh toán</label>
                  <select id="admin-pay-select" class="input-field w-full font-semibold">
                    <option value="Tiền mặt tại quầy">Tiền mặt tại quầy (Thu cọc 30%)</option>
                    <option value="Tiền mặt tại quầy (Thu đủ 100%)">Tiền mặt tại quầy (Thu đủ 100%)</option>
                    <option value="Chuyển khoản VietQR">Chuyển khoản VietQR (Đã nhận cọc 30%)</option>
                    <option value="Khách quen (Chưa cọc)">Khách quen (Chưa cọc - Thu sau trận)</option>
                  </select>
                </div>
                <div>
                  <label class="block font-bold text-[#475569] mb-1">Ghi chú thêm</label>
                  <input type="text" id="admin-cust-note" placeholder="Thuê thêm 10 áo bib, 1 thùng nước..." class="input-field w-full">
                </div>
              </div>

              <!-- Khung Tính tạm tiền & Quà tặng gói -->
              <div id="admin-walkin-preview" class="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-[#475569] font-semibold">Đơn giá sân:</span>
                  <span id="walkin-preview-pitch-price" class="font-bold text-[#0F172A]">0đ</span>
                </div>
                <div id="walkin-preview-promo-row" class="hidden space-y-1.5 pt-1 border-t border-emerald-200/70">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-[#15803D] font-semibold">Ưu đãi gói cố định:</span>
                    <span id="walkin-preview-discount" class="font-bold text-[#16A34A]">-0đ</span>
                  </div>
                  <div id="walkin-preview-gifts" class="text-[11px] font-bold text-emerald-800 bg-white/80 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                    🎁 Tặng kèm gói tháng (0đ)
                  </div>
                </div>
                <div class="pt-2 border-t border-emerald-200 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div class="bg-white p-2.5 rounded-lg border border-emerald-100">
                    <div class="text-[11px] text-[#64748B]">Tổng tiền đơn</div>
                    <div id="walkin-preview-total" class="font-heading font-extrabold text-sm text-[#0F172A] mt-0.5">0đ</div>
                  </div>
                  <div class="bg-white p-2.5 rounded-lg border border-emerald-100">
                    <div class="text-[11px] text-[#64748B]">Tiền cọc / Thu ngay</div>
                    <div id="walkin-preview-deposit" class="font-heading font-extrabold text-sm text-[#16A34A] mt-0.5">0đ</div>
                  </div>
                  <div class="bg-white p-2.5 rounded-lg border border-emerald-100">
                    <div class="text-[11px] text-[#64748B]">Còn lại phải thu</div>
                    <div id="walkin-preview-remaining" class="font-heading font-extrabold text-sm text-[#DC2626] mt-0.5">0đ</div>
                  </div>
                </div>
              </div>

              <div class="pt-4 border-t border-[#E2E8F0] flex justify-end gap-3">
                <button type="reset" class="btn-base btn-secondary">Nhập lại</button>
                <button type="submit" class="btn-base btn-primary">Xác nhận tạo đơn khóa sân</button>
              </div>
            </form>
          </div>

          <!-- KHỐI 2: KHO NƯỚC & BÁN LẺ DỊCH VỤ TẠI QUẦY (7 CỘT) -->
          <div id="counter-pos-inventory-card" class="xl:col-span-7 ui-card p-5 sm:p-6 space-y-4">
            <div class="border-b border-[#E2E8F0] pb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 class="font-heading font-extrabold text-base sm:text-lg text-[#0F172A]">2. Kho Nước &amp; Bán Lẻ Dịch Vụ Tại Quầy</h3>
                <p class="text-xs text-[#64748B] mt-0.5">Bán nhanh nước uống, thuê bóng, áo Bib tại quầy — Tự động trừ tồn kho và cộng vào doanh thu ca trực.</p>
              </div>
              <button type="button" id="btn-open-service-modal" onclick="openServiceModal()" class="btn-sm bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs cursor-pointer <?php echo (isset($isManagerOrAdmin) && !$isManagerOrAdmin) ? 'hidden' : ''; ?>">
                ✏️ Sửa / ➕ Thêm dịch vụ mới
              </button>
            </div>

            <!-- Banner cảnh báo tồn kho sắp hết -->
            <div id="inventory-low-stock-banner" class="hidden p-3.5 rounded-xl bg-red-50 border-2 border-red-300 text-xs text-red-800 font-semibold flex items-start gap-2.5">
              <span class="text-base shrink-0">⚠️</span>
              <div id="inventory-low-stock-text" class="flex-1 leading-relaxed">
                Cảnh báo tồn kho sắp hết! Vui lòng nhập thêm hàng.
              </div>
            </div>

            <!-- Form Bán nhanh tại quầy (Tự trừ kho) -->
            <form id="counter-pos-sale-form" onsubmit="handleCounterServiceSale(event)" class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div class="flex items-center justify-between">
                <span class="font-heading font-bold text-xs text-[#0F172A] uppercase tracking-wider">🛒 Bán nhanh tại quầy (Tự trừ kho)</span>
                <span id="pos-sale-line-preview" class="font-bold text-[#16A34A]">Thành tiền: 0đ</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div class="sm:col-span-5">
                  <label class="block font-bold text-[#475569] mb-1">Chọn mặt hàng / dịch vụ *</label>
                  <select id="pos-service-select" onchange="updatePosSalePreview()" class="input-field w-full h-9 text-xs font-bold bg-white">
                    <!-- Rendered by JS -->
                  </select>
                </div>
                <div class="sm:col-span-2">
                  <label class="block font-bold text-[#475569] mb-1">Số lượng *</label>
                  <input type="number" id="pos-service-qty" value="1" min="1" max="200" oninput="updatePosSalePreview()" required class="input-field w-full h-9 text-xs font-bold text-center bg-white">
                </div>
                <div class="sm:col-span-5">
                  <label class="block font-bold text-[#475569] mb-1">Hình thức thu tiền *</label>
                  <select id="pos-pay-method" class="input-field w-full h-9 text-xs font-semibold bg-white">
                    <option value="Tiền mặt tại quầy">💵 Tiền mặt tại quầy</option>
                    <option value="Chuyển khoản VietQR">📱 Chuyển khoản VietQR</option>
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div class="sm:col-span-8">
                  <label class="block font-bold text-[#475569] mb-1">Ghi chú / Mã đơn liên kết (tùy chọn)</label>
                  <input type="text" id="pos-sale-note" placeholder="VD: Khách Sân 7-A mua lẻ 5 chai nước, hoặc nhập mã đơn #ASFS..." class="input-field w-full h-9 text-xs bg-white">
                </div>
                <div class="sm:col-span-4">
                  <button type="submit" class="btn-base btn-primary w-full h-9 text-xs font-extrabold cursor-pointer shadow-sm">
                    💰 Bán &amp; Trừ kho ngay
                  </button>
                </div>
              </div>
            </form>

            <!-- Bảng Danh mục Dịch vụ & Tồn kho thực tế -->
            <div class="overflow-x-auto border border-[#E2E8F0] rounded-xl">
              <table class="w-full text-left text-xs min-w-[560px]">
                <thead class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
                  <tr>
                    <th class="py-2.5 px-3">Tên dịch vụ / Mặt hàng</th>
                    <th class="py-2.5 px-3">Đơn giá</th>
                    <th class="py-2.5 px-3 text-center">Tồn kho hiện tại</th>
                    <th class="py-2.5 px-3 text-center">Ngưỡng cảnh báo</th>
                    <th class="py-2.5 px-3 text-right">Thao tác kho</th>
                  </tr>
                </thead>
                <tbody id="admin-inventory-tbody" class="divide-y divide-[#E2E8F0]">
                  <!-- Rendered by JS -->
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- KHỐI 3: CHỐT CA & BÀN GIAO TIỀN MẶT (FULL WIDTH) -->
        <div id="shift-handover-card" class="ui-card p-5 sm:p-6 space-y-5 border-2 border-amber-200/80">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center text-lg font-bold shadow-sm shrink-0">🧾</div>
              <div>
                <h3 class="font-heading font-extrabold text-base sm:text-lg text-[#0F172A]">3. Chốt Ca &amp; Bàn Giao Tiền Mặt Cuối Ca</h3>
                <p class="text-xs text-[#64748B]">Tự động tổng hợp tiền mặt &amp; chuyển khoản VietQR phát sinh trong ca trực để bàn giao minh bạch cho Chủ sân</p>
              </div>
            </div>
            <span class="px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold">Chống thất thoát tiền mặt</span>
          </div>

          <!-- Thống kê ca trực hiện tại & Nút chốt ca -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            <div class="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <div class="text-[11px] font-bold text-[#64748B] uppercase">Thời gian mở ca trực</div>
                <div id="shift-start-time" class="font-mono font-extrabold text-sm sm:text-base text-[#0F172A] mt-1">Hôm nay, 06:00</div>
                <div class="text-[11px] text-[#16A34A] font-semibold mt-1">● Ca đang mở hoạt động</div>
              </div>
              <div class="p-4 rounded-xl bg-amber-50/70 border-2 border-amber-300 flex flex-col justify-between">
                <div class="text-[11px] font-bold text-amber-900 uppercase">💵 Tổng tiền mặt thu trong ca</div>
                <div id="shift-cash-total" class="font-heading font-extrabold text-xl text-[#D97706] mt-1">0đ</div>
                <div class="text-[10px] text-amber-800 mt-1">Đặt sân quầy + Thu 70% + Bán nước TM</div>
              </div>
              <div class="p-4 rounded-xl bg-purple-50/70 border border-purple-200 flex flex-col justify-between">
                <div class="text-[11px] font-bold text-purple-900 uppercase">📱 Tổng chuyển khoản VietQR</div>
                <div id="shift-transfer-total" class="font-heading font-extrabold text-xl text-purple-700 mt-1">0đ</div>
                <div class="text-[10px] text-purple-700 mt-1">Đã vào thẳng tài khoản ngân hàng</div>
              </div>
            </div>

            <div class="lg:col-span-5 p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col justify-between gap-3 text-xs">
              <div>
                <label class="block font-bold text-[#0F172A] mb-1">Ghi chú bàn giao ca trực (tiền lẻ, sự cố, gửi lại đồ...)</label>
                <input type="text" id="shift-close-note" placeholder="VD: Đã đếm đủ tiền mặt bàn giao cho ca sau / Chủ sân..." class="input-field w-full bg-white">
              </div>
              <div class="flex flex-wrap items-center justify-between gap-3">
                <span class="text-[11px] text-[#64748B]">Bấm chốt ca để khóa sổ doanh thu ca hiện tại</span>
                <button type="button" id="btn-close-shift" onclick="handleCloseShift()" class="btn-base bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs px-4 py-2.5 shrink-0 cursor-pointer shadow-sm">
                  🔒 Chốt ca bàn giao
                </button>
              </div>
            </div>
          </div>

          <!-- Bảng Lịch sử Chốt ca & Đối soát bàn giao -->
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs">
              <h4 class="font-heading font-bold text-sm text-[#0F172A]">Lịch sử Chốt ca &amp; Đối soát bàn giao tiền mặt</h4>
              <button type="button" onclick="loadShiftHandovers()" class="text-xs font-bold text-[#16A34A] hover:underline cursor-pointer">🔄 Làm mới danh sách ca</button>
            </div>
            <div class="overflow-x-auto border border-[#E2E8F0] rounded-xl">
              <table class="w-full text-left text-xs min-w-[780px]">
                <thead class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
                  <tr>
                    <th class="py-3 px-3">Mã ca</th>
                    <th class="py-3 px-3">Nhân viên trực</th>
                    <th class="py-3 px-3">Thời gian (Mở - Chốt)</th>
                    <th class="py-3 px-3 text-right">Tiền mặt kê khai</th>
                    <th class="py-3 px-3 text-right">Chuyển khoản VietQR</th>
                    <th class="py-3 px-3 text-right">Tiền mặt thực nhận</th>
                    <th class="py-3 px-3 text-center">Chênh lệch</th>
                    <th class="py-3 px-3 text-center">Trạng thái</th>
                    <th class="py-3 px-3 text-right">Thao tác đối soát</th>
                  </tr>
                </thead>
                <tbody id="admin-shifts-tbody" class="divide-y divide-[#E2E8F0]">
                  <!-- Rendered by JS -->
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Modal Thêm / Sửa Dịch Vụ & Tồn Kho -->
        <div id="service-crud-modal" class="hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm items-center justify-center p-4" onclick="if(event.target===this) closeServiceModal()">
          <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden my-auto">
            <div class="px-5 py-4 bg-[#0F172A] text-white flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-lg">🥤</span>
                <div>
                  <h4 id="service-modal-title" class="font-heading font-extrabold text-sm">Thêm / Cập nhật Dịch vụ &amp; Tồn kho</h4>
                  <p class="text-[11px] text-slate-300">Quản lý đơn giá bán lẻ và định mức cảnh báo hết hàng</p>
                </div>
              </div>
              <button type="button" onclick="closeServiceModal()" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-sm flex items-center justify-center cursor-pointer">✕</button>
            </div>
            <form onsubmit="saveServiceModal(event)" class="p-5 space-y-3.5 text-xs">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block font-bold text-[#475569] mb-1">Mã dịch vụ *</label>
                  <input type="text" id="srv-form-id" required placeholder="VD: SRV-REVIVE" class="input-field w-full font-mono font-bold uppercase">
                </div>
                <div>
                  <label class="block font-bold text-[#475569] mb-1">Đơn vị tính *</label>
                  <input type="text" id="srv-form-unit" required placeholder="chai, thùng, bộ, trận..." class="input-field w-full font-semibold">
                </div>
              </div>
              <div>
                <label class="block font-bold text-[#475569] mb-1">Tên dịch vụ / Mặt hàng *</label>
                <input type="text" id="srv-form-name" required placeholder="VD: Nước điện giải Revive 500ml" class="input-field w-full font-semibold">
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label class="block font-bold text-[#475569] mb-1">Đơn giá (VNĐ) *</label>
                  <input type="number" id="srv-form-price" required min="0" step="1000" placeholder="15000" class="input-field w-full font-bold text-[#16A34A]">
                </div>
                <div>
                  <label class="block font-bold text-[#475569] mb-1">Tồn kho hiện tại *</label>
                  <input type="number" id="srv-form-stock" required min="0" placeholder="48" class="input-field w-full font-bold">
                </div>
                <div>
                  <label class="block font-bold text-[#475569] mb-1">Ngưỡng báo hết *</label>
                  <input type="number" id="srv-form-min-stock" required min="0" placeholder="10" class="input-field w-full font-bold text-amber-700">
                </div>
              </div>
              <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button type="button" onclick="closeServiceModal()" class="btn-sm btn-secondary cursor-pointer">Hủy</button>
                <button type="submit" class="btn-sm btn-primary font-bold cursor-pointer">💾 Lưu dịch vụ</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- ========================================== -->