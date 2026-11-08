      <!-- TAB 9: CÀI ĐẶT HỆ THỐNG (Frame 19) -->
      <!-- ========================================== -->
      <div id="tab-content-settings" class="space-y-6 hidden">
        <div class="ui-card p-6 max-w-2xl mx-auto space-y-4">
          <h3 class="font-heading font-bold text-lg text-[#0F172A] border-b border-[#E2E8F0] pb-3">Cấu hình thông số hệ thống</h3>
          <div class="space-y-3 text-xs">
            <div>
              <label class="block font-bold text-[#475569] mb-1">Tỷ lệ đặt cọc bắt buộc (%)</label>
              <input type="number" id="cfg-deposit-rate" value="30" class="input-field w-32 font-bold text-[#16A34A]">
            </div>
            <div>
              <label class="block font-bold text-[#475569] mb-1">Ngân hàng nhận tiền VietQR</label>
              <input type="text" id="cfg-bank-name" value="Vietcombank" class="input-field w-full font-semibold">
            </div>
            <div>
              <label class="block font-bold text-[#475569] mb-1">Số tài khoản thụ hưởng</label>
              <input type="text" id="cfg-bank-acc" value="0123456789" class="input-field w-full font-mono font-bold">
            </div>
            <div>
              <label class="block font-bold text-[#475569] mb-1">Hotline hỗ trợ 24/7</label>
              <input type="text" id="cfg-hotline" value="0352 313 548" class="input-field w-full">
            </div>
          </div>
          <div class="pt-4 border-t border-[#E2E8F0] flex justify-end">
            <button onclick="window.SanBongApp?.showToast('✓ Đã cập nhật cài đặt hệ thống thành công!', 'success')" class="btn-base btn-primary">Lưu cài đặt</button>
          </div>
        </div>
      </div>
