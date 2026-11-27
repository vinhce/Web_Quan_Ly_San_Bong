      <!-- TAB 7: THANH TOÁN & DUYỆT CỌC VIETQR (Frame 17) -->
      <!-- ========================================== -->
      <div id="tab-content-payments" class="space-y-4 hidden">
        <div class="ui-card p-4 flex items-center justify-between">
          <div>
            <h3 class="font-heading font-bold text-base text-[#0F172A]">Danh sách biên lai chuyển khoản VietQR chờ duyệt</h3>
            <p class="text-xs text-[#64748B]">Bấm "Duyệt cọc" để xác nhận giữ sân và phát hành mã QR check-in cho khách</p>
          </div>
          <span id="admin-payments-header-badge" class="px-3 py-1 rounded-full bg-[#FEF3C7] text-[#D97706] text-xs font-bold">2 Đang chờ</span>
        </div>

        <div class="ui-card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs min-w-[640px]">
              <thead class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
                <tr>
                  <th class="py-3 px-4">Thời gian</th>
                  <th class="py-3 px-4">Mã đơn</th>
                  <th class="py-3 px-4">Khách hàng</th>
                  <th class="py-3 px-4">Số tiền cọc</th>
                  <th class="py-3 px-4">Giao dịch ngân hàng</th>
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

        <!-- KHỐI 2: ĐỐI SOÁT WEBHOOK NGÂN HÀNG & HÀNG CHỜ GIAO DỊCH CHƯA KHỚP -->
        <div id="bank-reconcile-section" class="ui-card p-5 space-y-4 border border-slate-200">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
              </div>
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="font-heading font-bold text-base text-[#0F172A]">Đối Soát Webhook Ngân Hàng &amp; Hàng Chờ Giao Dịch Chưa Khớp</h3>
                  <span id="bank-pending-count-badge" class="px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[11px] font-bold">0 Cần xử lý</span>
                </div>
                <p class="text-xs text-[#64748B] mt-0.5">Tự động bắt giao dịch sai nội dung, chuyển thiếu hoặc chuyển thừa từ SePay để nhân sự gán tay vào đơn</p>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-1.5 text-xs">
              <button type="button" id="bank-filter-pending" onclick="loadBankTransactions('pending')" class="px-3 py-1.5 rounded-lg font-bold bg-[#16A34A] text-white cursor-pointer">Tất cả chưa khớp / Lệch tiền</button>
              <button type="button" id="bank-filter-resolved" onclick="loadBankTransactions('resolved')" class="px-3 py-1.5 rounded-lg font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer">Đã đối soát</button>
              <button type="button" id="bank-filter-all" onclick="loadBankTransactions('all')" class="px-3 py-1.5 rounded-lg font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer">Tất cả giao dịch</button>
              <button type="button" onclick="loadBankTransactions()" class="px-3 py-1.5 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-bold cursor-pointer">Làm mới</button>
            </div>
          </div>

          <div class="overflow-x-auto border border-[#E2E8F0] rounded-xl">
            <table class="w-full text-center text-xs min-w-[780px]">
              <thead class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
                <tr>
                  <th class="py-3 px-4 text-center">Thời gian / Mã GD</th>
                  <th class="py-3 px-4 text-center">Nội dung chuyển khoản &amp; Mã nhận diện</th>
                  <th class="py-3 px-4 text-center">Số tiền nhận / Cần thu</th>
                  <th class="py-3 px-4 text-center">Trạng thái đối soát</th>
                  <th class="py-3 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody id="admin-bank-tx-tbody" class="divide-y divide-[#E2E8F0]">
                <tr>
                  <td colspan="5" class="py-8 px-4 text-center text-[#64748B]">
                    <div class="w-full flex flex-col items-center justify-center text-center">
                      Đang tải danh sách giao dịch ngân hàng...
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Modal Gán Giao Dịch Ngân Hàng Vào Đơn Đặt Sân -->
        <div id="reconcile-assign-modal" class="hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm items-center justify-center p-4 overflow-y-auto" onclick="if(event.target===this) closeReconcileAssignModal()">
          <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-auto">
            <div class="px-5 py-4 bg-[#0F172A] text-white flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <span class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-indigo-400">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                </span>
                <div>
                  <h4 id="reconcile-assign-modal-title" class="font-heading font-extrabold text-sm">Gán Giao Dịch Ngân Hàng Vào Đơn Đặt Sân</h4>
                  <p class="text-[11px] text-slate-300">Khớp tay giao dịch sai nội dung / lệch tiền vào đúng mã đơn khách đặt</p>
                </div>
              </div>
              <button type="button" onclick="closeReconcileAssignModal()" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-sm flex items-center justify-center cursor-pointer">✕</button>
            </div>

            <form onsubmit="submitReconcileAssign(event)" class="p-5 space-y-4 text-xs">
              <input type="hidden" id="rec-tx-id">
              <div id="rec-tx-info" class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs text-[#334155]"></div>

              <div>
                <label for="rec-booking-code" class="block font-bold text-[#475569] mb-1">Mã đơn đặt sân cần gán *</label>
                <input type="text" id="rec-booking-code" list="rec-booking-datalist" required placeholder="Nhập hoặc chọn mã đơn đặt sân..." class="input-field w-full font-mono font-bold uppercase text-[#0F172A]">
                <datalist id="rec-booking-datalist"></datalist>
              </div>

              <div>
                <label class="block font-bold text-[#475569] mb-1">Trạng thái thanh toán sau khi khớp *</label>
                <select id="rec-target-status" class="input-field w-full font-semibold">
                  <option value="auto">Tự động theo số tiền đã nhận</option>
                  <option value="Đã cọc 30%">Xác nhận Đã cọc 30%</option>
                  <option value="Đã thanh toán 100%">Xác nhận Đã thanh toán 100%</option>
                </select>
              </div>

              <div>
                <label class="block font-bold text-[#475569] mb-1">Ghi chú đối soát</label>
                <input type="text" id="rec-assign-note" placeholder="VD: Khách chuyển nhầm nội dung, đã xác minh SĐT..." class="input-field w-full">
              </div>

              <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button type="button" onclick="closeReconcileAssignModal()" class="btn-sm btn-secondary cursor-pointer">Đóng</button>
                <button type="submit" class="btn-sm btn-primary font-bold cursor-pointer">Lưu &amp; Khớp đơn</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- ========================================== -->