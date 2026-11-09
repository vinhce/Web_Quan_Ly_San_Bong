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
                  <td class="py-3 px-4"><input type="text" value="250.000đ" class="input-field w-32 h-8 text-xs font-bold"></td>
                  <td class="py-3 px-4"><input type="text" value="350.000đ" class="input-field w-32 h-8 text-xs font-bold text-[#16A34A]"></td>
                  <td class="py-3 px-4"><input type="text" value="380.000đ" class="input-field w-32 h-8 text-xs font-bold"></td>
                </tr>
                <tr>
                  <td class="py-3 px-4 font-bold text-[#0F172A]">Sân 7 người</td>
                  <td class="py-3 px-4"><input type="text" value="450.000đ" class="input-field w-32 h-8 text-xs font-bold"></td>
                  <td class="py-3 px-4"><input type="text" value="650.000đ" class="input-field w-32 h-8 text-xs font-bold text-[#16A34A]"></td>
                  <td class="py-3 px-4"><input type="text" value="700.000đ" class="input-field w-32 h-8 text-xs font-bold"></td>
                </tr>
                <tr>
                  <td class="py-3 px-4 font-bold text-[#0F172A]">Sân 11 người</td>
                  <td class="py-3 px-4"><input type="text" value="900.000đ" class="input-field w-32 h-8 text-xs font-bold"></td>
                  <td class="py-3 px-4"><input type="text" value="1.200.000đ" class="input-field w-32 h-8 text-xs font-bold text-[#16A34A]"></td>
                  <td class="py-3 px-4"><input type="text" value="1.400.000đ" class="input-field w-32 h-8 text-xs font-bold"></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="pt-3 border-t border-[#E2E8F0] flex justify-end">
            <button onclick="window.SanBongApp?.showToast('✓ Đã lưu cấu hình bảng giá mới thành công!', 'success')" class="btn-base btn-primary">Lưu bảng giá</button>
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

          <form onsubmit="handleCreateVoucher(event)" class="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
            <div class="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Tạo mã Voucher mới</div>
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
            <div class="flex justify-end pt-1">
              <button type="submit" class="btn-sm btn-primary font-bold">+ Thêm mã Voucher</button>
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
      <div class="hidden"><div><div>
          </div>
        </div>
      </div>

      <!-- ========================================== -->