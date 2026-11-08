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
                  <th class="py-3 px-4">Giờ vàng tối (17:30 - 21:00)</th>
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
      </div>

      <!-- ========================================== -->