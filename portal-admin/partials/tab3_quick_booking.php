      <!-- TAB 3: ĐẶT SÂN TẠI QUẦY (Frame 13) -->
      <!-- ========================================== -->
      <div id="tab-content-quick-booking" class="space-y-6 hidden">
        <div class="ui-card p-6 max-w-2xl mx-auto space-y-4">
          <div class="border-b border-[#E2E8F0] pb-3">
            <h3 class="font-heading font-extrabold text-lg text-[#0F172A]">Tạo nhanh đơn đặt sân tại quầy</h3>
            <p class="text-xs text-[#64748B] mt-0.5">Nhân viên trực sân điền thông tin để khóa lịch tức thì, chống đè lịch khách online.</p>
          </div>

          <form id="admin-walkin-form" class="space-y-4 text-xs">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block font-bold text-[#475569] mb-1">Tên khách / Đội bóng *</label>
                <input type="text" id="admin-cust-name" required placeholder="Ví dụ: FC Cầu Giấy (Anh Tuấn)" class="input-field w-full font-semibold">
              </div>
              <div>
                <label class="block font-bold text-[#475569] mb-1">Số điện thoại liên hệ *</label>
                <input type="tel" id="admin-cust-phone" required placeholder="0352 313 548" class="input-field w-full font-semibold">
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block font-bold text-[#475569] mb-1">Chọn sân bóng *</label>
                <select id="admin-pitch-select" class="input-field w-full font-bold">
                  <!-- Rendered by JS -->
                </select>
              </div>
              <div>
                <label class="block font-bold text-[#475569] mb-1">Khung giờ đá *</label>
                <select id="admin-slot-select" class="input-field w-full font-bold text-[#16A34A]">
                  <!-- Rendered by JS -->
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block font-bold text-[#475569] mb-1">Hình thức cọc / thanh toán</label>
                <select id="admin-pay-select" class="input-field w-full font-semibold">
                  <option value="Tiền mặt tại quầy">Tiền mặt tại quầy (Đã thu)</option>
                  <option value="Chuyển khoản VietQR">Chuyển khoản VietQR</option>
                  <option value="Khách quen (Chưa cọc)">Khách quen (Chưa cọc - Thu sau trận)</option>
                </select>
              </div>
              <div>
                <label class="block font-bold text-[#475569] mb-1">Ghi chú thêm</label>
                <input type="text" id="admin-cust-note" placeholder="Thuê thêm 10 áo bib, 1 thùng nước..." class="input-field w-full">
              </div>
            </div>

            <div class="pt-4 border-t border-[#E2E8F0] flex justify-end gap-3">
              <button type="reset" class="btn-base btn-secondary">Nhập lại</button>
              <button type="submit" class="btn-base btn-primary">Xác nhận tạo đơn khóa sân</button>
            </div>
          </form>
        </div>
      </div>

      <!-- ========================================== -->