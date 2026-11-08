      <!-- TAB 7: THANH TOÁN & DUYỆT CỌC VIETQR (Frame 17) -->
      <!-- ========================================== -->
      <div id="tab-content-payments" class="space-y-4 hidden">
        <div class="ui-card p-4 flex items-center justify-between">
          <div>
            <h3 class="font-heading font-bold text-base text-[#0F172A]">Danh sách biên lai chuyển khoản VietQR chờ duyệt</h3>
            <p class="text-xs text-[#64748B]">Bấm "Duyệt cọc" để xác nhận giữ sân và phát hành mã QR check-in cho khách</p>
          </div>
          <span id="admin-payments-header-badge" class="px-3 py-1 rounded-full bg-[#FEF3C7] text-[#D97706] text-xs font-bold">3 Đang chờ</span>
        </div>

        <div class="ui-card overflow-hidden">
          <table class="w-full text-left text-xs">
            <thead class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
              <tr>
                <th class="py-3 px-4">Thời gian</th>
                <th class="py-3 px-4">Mã đơn</th>
                <th class="py-3 px-4">Khách hàng</th>
                <th class="py-3 px-4">Số tiền cọc</th>
                <th class="py-3 px-4">Ngân hàng</th>
                <th class="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody id="admin-payments-tbody" class="divide-y divide-[#E2E8F0]">
              <!-- Rendered dynamically with 1-click Approve -->
            </tbody>
          </table>
        </div>
      </div>

      <!-- ========================================== -->