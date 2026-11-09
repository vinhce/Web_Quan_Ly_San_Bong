      <!-- TAB 9: CÀI ĐẶT HỆ THỐNG (Frame 19) -->
      <!-- ========================================== -->
      <div id="tab-content-settings" class="space-y-6 hidden">
        <div class="ui-card p-6 max-w-2xl mx-auto space-y-4">
          <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div>
              <h3 class="font-heading font-bold text-lg text-[#0F172A]">Cấu hình thông số hệ thống & VietQR</h3>
              <p class="text-xs text-[#64748B]">Thông tin nhận cọc SePay, hotline và tỷ lệ cọc được áp dụng tức thì</p>
            </div>
            <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">Hoạt động</span>
          </div>

          <form id="admin-settings-form" onsubmit="saveAdminSettings(event)" class="space-y-3 text-xs">
            <div>
              <label class="block font-bold text-[#475569] mb-1">Tỷ lệ đặt cọc bắt buộc (%)</label>
              <input type="number" id="cfg-deposit-rate" min="10" max="100" value="30" required class="input-field w-32 font-bold text-[#16A34A]">
              <span class="text-[11px] text-[#64748B] block mt-0.5">Mặc định 30% giá trị ca thi đấu</span>
            </div>
            <div>
              <label class="block font-bold text-[#475569] mb-1">Ngân hàng nhận tiền VietQR (SePay)</label>
              <input type="text" id="cfg-bank-name" value="Vietcombank" required class="input-field w-full font-semibold">
            </div>
            <div>
              <label class="block font-bold text-[#475569] mb-1">Mã ngân hàng (Bank Code chuẩn NAPAS)</label>
              <input type="text" id="cfg-bank-code" value="VCB" placeholder="VCB, MB, TCB, ACB..." required class="input-field w-full font-mono font-bold">
            </div>
            <div>
              <label class="block font-bold text-[#475569] mb-1">Số tài khoản thụ hưởng</label>
              <input type="text" id="cfg-bank-acc" value="0123456789" required class="input-field w-full font-mono font-bold text-sm">
            </div>
            <div>
              <label class="block font-bold text-[#475569] mb-1">Tên chủ tài khoản thụ hưởng</label>
              <input type="text" id="cfg-bank-holder" value="CONG TY CP SAN BONG PRO" required class="input-field w-full font-bold uppercase">
            </div>
            <div>
              <label class="block font-bold text-[#475569] mb-1">Hotline hỗ trợ 24/7</label>
              <input type="text" id="cfg-hotline" value="0352 313 548" required class="input-field w-full font-semibold">
            </div>
            <div>
              <label class="block font-bold text-[#475569] mb-1">Giờ mở cửa phục vụ</label>
              <input type="text" id="cfg-open-hours" value="05:30 - 23:00 hàng ngày (kể cả Lễ, Tết)" required class="input-field w-full">
            </div>

            <div class="pt-4 border-t border-[#E2E8F0] flex justify-end gap-3">
              <button type="button" onclick="loadAdminSettings()" class="btn-base btn-secondary text-xs">Khôi phục</button>
              <button type="submit" class="btn-base btn-primary text-xs font-bold px-5">💾 Lưu cài đặt</button>
            </div>
          </form>
        </div>
      </div>
