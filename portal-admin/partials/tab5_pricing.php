      <!-- TAB 5: BẢNG GIÁ CẤU HÌNH (Frame 15) -->
      <!-- ========================================== -->
      <div id="tab-content-pricing" class="space-y-6 hidden">
        <div class="ui-card p-6 space-y-4">
          <h3 class="font-heading font-bold text-lg text-[#0F172A]">Cấu hình bảng giá theo khung giờ (VND / Giờ)</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
                  <th class="py-3 px-4">Loại sân</th>
                  <th class="py-3 px-4">Giờ thường (05:30 - 17:30)</th>
                  <th class="py-3 px-4">Giờ cao điểm (17:30 - 21:00)</th>
                  <th class="py-3 px-4">Cuối tuần (T7, CN)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#E2E8F0] font-semibold">
                <tr>
                  <td class="py-3 px-4 font-bold text-[#0F172A]">Sân 5 người</td>
                  <td class="py-3 px-4"><input type="text" id="price-p5-base" value="250.000đ" class="input-field w-32 h-8 text-xs font-bold"></td>
                  <td class="py-3 px-4"><input type="text" id="price-p5-peak" value="350.000đ" class="input-field w-32 h-8 text-xs font-bold text-[#16A34A]"></td>
                  <td class="py-3 px-4"><input type="text" id="price-p5-weekend" value="380.000đ" class="input-field w-32 h-8 text-xs font-bold"></td>
                </tr>
                <tr>
                  <td class="py-3 px-4 font-bold text-[#0F172A]">Sân 7 người</td>
                  <td class="py-3 px-4"><input type="text" id="price-p7-base" value="450.000đ" class="input-field w-32 h-8 text-xs font-bold"></td>
                  <td class="py-3 px-4"><input type="text" id="price-p7-peak" value="650.000đ" class="input-field w-32 h-8 text-xs font-bold text-[#16A34A]"></td>
                  <td class="py-3 px-4"><input type="text" id="price-p7-weekend" value="700.000đ" class="input-field w-32 h-8 text-xs font-bold"></td>
                </tr>
                <tr>
                  <td class="py-3 px-4 font-bold text-[#0F172A]">Sân 11 người</td>
                  <td class="py-3 px-4"><input type="text" id="price-p11-base" value="900.000đ" class="input-field w-32 h-8 text-xs font-bold"></td>
                  <td class="py-3 px-4"><input type="text" id="price-p11-peak" value="1.200.000đ" class="input-field w-32 h-8 text-xs font-bold text-[#16A34A]"></td>
                  <td class="py-3 px-4"><input type="text" id="price-p11-weekend" value="1.400.000đ" class="input-field w-32 h-8 text-xs font-bold"></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="pt-3 border-t border-[#E2E8F0] flex justify-end">
            <button type="button" id="btn-save-pricing" onclick="savePricingTable()" class="btn-base btn-primary cursor-pointer">Lưu bảng giá</button>
          </div>
        </div>

        <!-- CHÍNH SÁCH KHUYẾN MÃI GÓI HỢP ĐỒNG ĐẶT SÂN THEO THÁNG (1 - 3 THÁNG) -->
        <div class="ui-card p-6 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xl">🏆</span>
                <h3 class="font-heading font-bold text-lg text-[#0F172A]">Chính Sách Khuyến Mãi Gói Hợp Đồng Theo Tháng (1 - 3 Tháng)</h3>
              </div>
              <p class="text-xs text-[#64748B]">Tự động áp dụng khi khách đặt lịch cố định theo tuần trên toàn hệ thống Online & Quầy</p>
            </div>
            <span class="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold">Đang áp dụng tự động</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Gói 3 Tháng VIP -->
            <div class="p-4 rounded-xl bg-emerald-50/70 border-2 border-emerald-500 space-y-3 relative shadow-xs">
              <div class="flex items-center justify-between">
                <span class="px-2.5 py-0.5 rounded-full bg-[#16A34A] text-white text-[10px] font-extrabold uppercase">HOT NHẤT · SIÊU VIP</span>
                <span class="font-heading font-extrabold text-sm text-[#15803D]">Giảm 15%</span>
              </div>
              <div>
                <h4 class="font-heading font-bold text-base text-[#0F172A]">Gói Vàng 3 Tháng (12 trận)</h4>
                <p class="text-xs text-slate-600 mt-0.5">Đặt lịch cố định cùng khung giờ 12 tuần liên tiếp</p>
              </div>
              <div class="p-2.5 rounded-lg bg-white border border-emerald-200 space-y-1.5 text-xs">
                <div class="font-bold text-[#15803D] flex items-center gap-1">
                  <span>🎁</span> <span>Tài trợ MỖI TRẬN ĐẤU (0đ):</span>
                </div>
                <div class="flex items-center gap-1.5 text-[#0F172A] font-semibold">
                  <span>💧</span> <span><b>2 Thùng Nước Suối</b> Aquafina (48 chai)</span>
                </div>
                <div class="flex items-center gap-1.5 text-[#0F172A] font-semibold">
                  <span>🏁</span> <span><b>1 Trọng Tài</b> chuyên nghiệp bắt trận</span>
                </div>
              </div>
              <div class="text-[11px] text-emerald-800 font-bold pt-1 border-t border-emerald-200 flex justify-between">
                <span>Trị giá quà tặng/trận:</span>
                <span class="text-emerald-700">390.000đ / trận</span>
              </div>
            </div>

            <!-- Gói 2 Tháng -->
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-300 space-y-3">
              <div class="flex items-center justify-between">
                <span class="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-extrabold uppercase">TIẾT KIỆM 10%</span>
                <span class="font-heading font-extrabold text-sm text-sky-700">Giảm 10%</span>
              </div>
              <div>
                <h4 class="font-heading font-bold text-base text-[#0F172A]">Gói Bạc 2 Tháng (8 trận)</h4>
                <p class="text-xs text-slate-600 mt-0.5">Đặt lịch cố định cùng khung giờ 8 tuần liên tiếp</p>
              </div>
              <div class="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1.5 text-xs">
                <div class="font-bold text-sky-700 flex items-center gap-1">
                  <span>🎁</span> <span>Tài trợ MỖI TRẬN ĐẤU (0đ):</span>
                </div>
                <div class="flex items-center gap-1.5 text-[#0F172A] font-semibold">
                  <span>💧</span> <span><b>1 Thùng Nước Suối</b> Aquafina (24 chai)</span>
                </div>
                <div class="flex items-center gap-1.5 text-[#0F172A] font-semibold">
                  <span>🎽</span> <span><b>1 Bộ Áo Bib</b> chia đội dạ quang (10 áo)</span>
                </div>
              </div>
              <div class="text-[11px] text-slate-600 font-bold pt-1 border-t border-slate-200 flex justify-between">
                <span>Trị giá quà tặng/trận:</span>
                <span class="text-sky-700">150.000đ / trận</span>
              </div>
            </div>

            <!-- Gói 1 Tháng -->
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-300 space-y-3">
              <div class="flex items-center justify-between">
                <span class="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-extrabold uppercase">TIẾT KIỆM 5%</span>
                <span class="font-heading font-extrabold text-sm text-amber-700">Giảm 5%</span>
              </div>
              <div>
                <h4 class="font-heading font-bold text-base text-[#0F172A]">Gói Đồng 1 Tháng (4 trận)</h4>
                <p class="text-xs text-slate-600 mt-0.5">Đặt lịch cố định cùng khung giờ 4 tuần liên tiếp</p>
              </div>
              <div class="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1.5 text-xs">
                <div class="font-bold text-amber-700 flex items-center gap-1">
                  <span>🎁</span> <span>Tài trợ MỖI TRẬN ĐẤU (0đ):</span>
                </div>
                <div class="flex items-center gap-1.5 text-[#0F172A] font-semibold">
                  <span>💧</span> <span><b>1 Lốc Nước Suối</b> Aquafina (12 chai)</span>
                </div>
                <div class="flex items-center gap-1.5 text-[#0F172A] font-semibold">
                  <span>⚽</span> <span><b>Miễn phí Bóng Đá</b> Động Lực FIFA</span>
                </div>
              </div>
              <div class="text-[11px] text-slate-600 font-bold pt-1 border-t border-slate-200 flex justify-between">
                <span>Trị giá quà tặng/trận:</span>
                <span class="text-amber-700">80.000đ / trận</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Quản lý Mã Giảm Giá (Voucher Khuyến Mãi) -->
        <div class="ui-card p-6 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 class="font-heading font-bold text-lg text-[#0F172A]">Quản lý Mã Giảm Giá (Voucher Khuyến Mãi)</h3>
              <p class="text-xs text-[#64748B]">Tạo, bật/tắt hoặc xóa mã khuyến mãi áp dụng trên toàn hệ thống đặt sân & quầy</p>
            </div>
            <span class="px-2.5 py-1 rounded-full bg-[#DCFCE7] text-[#16A34A] text-xs font-bold">Đồng bộ tức thì sang trang Đặt Sân</span>
          </div>

          <form id="admin-voucher-form" onsubmit="handleCreateVoucher(event)" class="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
            <div class="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center">
              <span id="admin-voucher-form-title">Tạo mã Voucher mới</span>
              <span id="admin-voucher-edit-badge" class="hidden ml-2 px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">Đang chỉnh sửa mã</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label class="block text-[11px] font-bold text-[#475569] mb-1">Mã Voucher *</label>
                <input type="text" id="admin-voucher-code" required placeholder="VD: DATTHANG15, SINHVIEN30K" class="input-field h-9 text-xs font-mono font-bold uppercase text-[#16A34A]">
              </div>
              <div>
                <label class="block text-[11px] font-bold text-[#475569] mb-1">Loại giảm giá *</label>
                <select id="admin-voucher-type" class="input-field h-9 text-xs font-semibold">
                  <option value="percent">Giảm theo %</option>
                  <option value="fixed">Giảm số tiền cố định VNĐ</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-[#475569] mb-1">Giá trị giảm *</label>
                <input type="number" id="admin-voucher-value" required min="1" placeholder="VD: 15 hoặc 50000" class="input-field h-9 text-xs font-bold">
              </div>
              <div>
                <label class="block text-[11px] font-bold text-[#475569] mb-1">Đơn tối thiểu (VNĐ)</label>
                <input type="number" id="admin-voucher-min" min="0" value="0" placeholder="Đơn tối thiểu VNĐ, VD: 300000" class="input-field h-9 text-xs font-semibold">
              </div>
              <div>
                <label class="block text-[11px] font-bold text-[#475569] mb-1">Mô tả chương trình *</label>
                <input type="text" id="admin-voucher-desc" required placeholder="Mô tả chương trình khuyến mãi" class="input-field h-9 text-xs">
              </div>
            </div>
            <div class="flex items-center justify-end gap-2 pt-1">
              <button type="button" id="admin-voucher-cancel-btn" onclick="cancelEditVoucher()" class="hidden btn-sm btn-secondary font-bold">Hủy sửa</button>
              <button type="submit" id="admin-voucher-submit-btn" class="btn-base btn-primary text-xs font-bold px-4 py-2">+ Thêm mã Voucher</button>
            </div>
          </form>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
                  <th class="py-3 px-4">Mã Voucher</th>
                  <th class="py-3 px-4">Loại & Mức giảm</th>
                  <th class="py-3 px-4">Đơn tối thiểu</th>
                  <th class="py-3 px-4">Mô tả chương trình</th>
                  <th class="py-3 px-4">Trạng thái</th>
                  <th class="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody id="admin-vouchers-tbody" class="divide-y divide-[#E2E8F0] font-medium">
                <!-- Rendered by JS -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <!-- END PRICING & VOUCHER -->

      <!-- ========================================== -->