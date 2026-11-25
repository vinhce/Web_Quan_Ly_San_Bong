      <!-- TAB 5: BẢNG GIÁ & VOUCHER (Frame 15 - 3 Sub-tabs) -->
      <!-- ================================================= -->
      <div id="tab-content-pricing" class="space-y-5 hidden">
        <!-- SUB-TAB NAVIGATION BAR -->
        <div class="bg-white border border-[#E2E8F0] rounded-xl p-1.5 flex flex-wrap items-center gap-1.5 shadow-2xs" role="tablist" aria-label="Phân mục Bảng giá, Gói tháng và Voucher">
          <button
            type="button"
            id="pricing-subtab-btn-pricing"
            data-pricing-subtab="pricing"
            onclick="switchPricingSubTab('pricing')"
            role="tab"
            aria-selected="true"
            aria-controls="pricing-subtab-pricing"
            class="pricing-subtab-btn px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-[#0F172A] text-white shadow-xs"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <span>Bảng giá</span>
          </button>
          <button
            type="button"
            id="pricing-subtab-btn-packages"
            data-pricing-subtab="packages"
            onclick="switchPricingSubTab('packages')"
            role="tab"
            aria-selected="false"
            aria-controls="pricing-subtab-packages"
            class="pricing-subtab-btn px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 text-[#475569] hover:bg-slate-100"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>Gói theo tháng</span>
          </button>
          <button
            type="button"
            id="pricing-subtab-btn-vouchers"
            data-pricing-subtab="vouchers"
            onclick="switchPricingSubTab('vouchers')"
            role="tab"
            aria-selected="false"
            aria-controls="pricing-subtab-vouchers"
            class="pricing-subtab-btn px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 text-[#475569] hover:bg-slate-100"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            <span>Voucher</span>
          </button>
        </div>

        <!-- ================================================= -->
        <!-- SUB-TAB 1: BẢNG GIÁ CỐ ĐỊNH 2 TIẾNG               -->
        <!-- ================================================= -->
        <section id="pricing-subtab-pricing" role="tabpanel" aria-labelledby="pricing-subtab-btn-pricing" class="space-y-4">
          <div class="ui-card p-5 sm:p-6 space-y-5">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 class="font-heading font-bold text-lg text-[#0F172A]">Cấu hình bảng giá cố định (VNĐ / Ca 2 tiếng)</h3>
                <p class="text-xs text-[#64748B] mt-0.5">Đồng giá mọi khung giờ trong ngày — không tính phụ thu giờ cao điểm hay cuối tuần.</p>
              </div>
              <div class="w-full sm:w-auto">
                <label for="pricing-effective-from" class="block text-[11px] font-bold text-[#475569] mb-1">Hiệu lực từ ngày</label>
                <input
                  type="date"
                  id="pricing-effective-from"
                  lang="vi"
                  data-vn-datepicker="1"
                  data-allow-past="1"
                  class="input-field vn-date-input h-9 text-xs font-semibold w-full sm:w-52"
                >
                <p class="text-[11px] text-[#64748B] mt-1">Đơn đã đặt trước ngày hiệu lực giữ nguyên giá cũ.</p>
              </div>
            </div>

            <div class="overflow-x-auto rounded-xl border border-[#E2E8F0]">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
                    <th class="py-3 px-4">Loại sân</th>
                    <th class="py-3 px-4">Thời lượng</th>
                    <th class="py-3 px-4">Giá cố định / ca (VNĐ)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#E2E8F0] font-semibold">
                  <tr class="hover:bg-slate-50/70">
                    <td class="py-3.5 px-4 font-bold text-[#0F172A]">Sân 5 người</td>
                    <td class="py-3.5 px-4 text-[#64748B]">2 tiếng / ca</td>
                    <td class="py-3.5 px-4">
                      <input
                        type="text"
                        id="price-p5-base"
                        value="350.000đ"
                        inputmode="numeric"
                        aria-label="Giá cố định Sân 5 người"
                        oninput="document.getElementById('price-p5-peak').value=this.value;document.getElementById('price-p5-weekend').value=this.value;"
                        class="input-field w-44 h-9 text-xs font-bold text-[#0F172A] tabular-nums"
                      >
                      <input type="hidden" id="price-p5-peak" value="350.000đ">
                      <input type="hidden" id="price-p5-weekend" value="350.000đ">
                    </td>
                  </tr>
                  <tr class="hover:bg-slate-50/70">
                    <td class="py-3.5 px-4 font-bold text-[#0F172A]">Sân 7 người</td>
                    <td class="py-3.5 px-4 text-[#64748B]">2 tiếng / ca</td>
                    <td class="py-3.5 px-4">
                      <input
                        type="text"
                        id="price-p7-base"
                        value="450.000đ"
                        inputmode="numeric"
                        aria-label="Giá cố định Sân 7 người"
                        oninput="document.getElementById('price-p7-peak').value=this.value;document.getElementById('price-p7-weekend').value=this.value;"
                        class="input-field w-44 h-9 text-xs font-bold text-[#0F172A] tabular-nums"
                      >
                      <input type="hidden" id="price-p7-peak" value="450.000đ">
                      <input type="hidden" id="price-p7-weekend" value="450.000đ">
                    </td>
                  </tr>
                  <tr class="hover:bg-slate-50/70">
                    <td class="py-3.5 px-4 font-bold text-[#0F172A]">Sân 11 người</td>
                    <td class="py-3.5 px-4 text-[#64748B]">2 tiếng / ca</td>
                    <td class="py-3.5 px-4">
                      <input
                        type="text"
                        id="price-p11-base"
                        value="900.000đ"
                        inputmode="numeric"
                        aria-label="Giá cố định Sân 11 người"
                        oninput="document.getElementById('price-p11-peak').value=this.value;document.getElementById('price-p11-weekend').value=this.value;"
                        class="input-field w-44 h-9 text-xs font-bold text-[#0F172A] tabular-nums"
                      >
                      <input type="hidden" id="price-p11-peak" value="900.000đ">
                      <input type="hidden" id="price-p11-weekend" value="900.000đ">
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- STICKY BOTTOM SAVE BAR -->
          <div
            id="pricing-sticky-save-bar"
            class="sticky bottom-0 z-20 bg-white/95 backdrop-blur border border-[#E2E8F0] rounded-xl px-4 py-3 shadow-[0_-4px_20px_rgba(15,23,42,0.08)] flex flex-wrap items-center justify-between gap-3 transition-colors"
          >
            <div class="flex items-center gap-2 text-xs">
              <span id="pricing-dirty-dot" class="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0"></span>
              <span id="pricing-dirty-status" class="font-semibold text-[#64748B]">Chưa có thay đổi</span>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                id="btn-reset-pricing"
                onclick="typeof resetPricingForm==='function' && resetPricingForm()"
                class="hidden btn-sm btn-secondary text-xs font-bold cursor-pointer"
              >Hoàn tác</button>
              <button
                type="button"
                id="btn-save-pricing"
                onclick="savePricingTable()"
                disabled
                class="btn-base btn-primary text-xs font-bold px-4 py-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >Lưu bảng giá</button>
            </div>
          </div>
        </section>

        <!-- ================================================= -->
        <!-- SUB-TAB 2: GÓI HỢP ĐỒNG THEO THÁNG                -->
        <!-- ================================================= -->
        <section id="pricing-subtab-packages" role="tabpanel" aria-labelledby="pricing-subtab-btn-packages" class="hidden space-y-4">
          <div class="ui-card p-5 sm:p-6 space-y-5">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div class="flex items-center gap-2">
                  <span class="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </span>
                  <h3 class="font-heading font-bold text-lg text-[#0F172A]">Gói Hợp Đồng Đặt Sân Theo Tháng</h3>
                </div>
                <p class="text-xs text-[#64748B] mt-0.5">Tự động áp dụng khi khách đặt lịch cố định theo tuần. Không cộng dồn với Voucher (ưu tiên mức giảm lớn hơn).</p>
              </div>
              <button
                type="button"
                id="btn-add-package"
                onclick="openPackageModal()"
                class="btn-base btn-primary text-xs font-bold px-4 py-2 cursor-pointer whitespace-nowrap"
              >+ Thêm gói mới</button>
            </div>

            <div id="admin-packages-grid" class="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
              <!-- Rendered dynamically by js/admin_pricing.js -->
              <div class="col-span-full py-10 text-center text-xs text-[#64748B]">Đang tải danh sách gói theo tháng...</div>
            </div>
          </div>
        </section>

        <!-- ================================================= -->
        <!-- SUB-TAB 3: QUẢN LÝ VOUCHER KHUYẾN MÃI             -->
        <!-- ================================================= -->
        <section id="pricing-subtab-vouchers" role="tabpanel" aria-labelledby="pricing-subtab-btn-vouchers" class="hidden space-y-4">
          <div class="ui-card p-5 sm:p-6 space-y-5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 class="font-heading font-bold text-lg text-[#0F172A]">Quản lý Mã Giảm Giá (Voucher Khuyến Mãi)</h3>
                <p class="text-xs text-[#64748B] mt-0.5">Tạo, bật/tắt hoặc xóa mã khuyến mãi áp dụng trên toàn hệ thống đặt sân &amp; quầy.</p>
              </div>
              <span class="px-2.5 py-1 rounded-full bg-[#DCFCE7] text-[#16A34A] text-xs font-bold">Đồng bộ tức thì sang trang Đặt Sân</span>
            </div>

            <form id="admin-voucher-form" onsubmit="handleCreateVoucher(event)" class="p-4 sm:p-5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-4">
              <div class="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
                <span id="admin-voucher-form-title">Tạo mã Voucher mới</span>
                <span id="admin-voucher-edit-badge" class="hidden px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold normal-case">Đang chỉnh sửa mã</span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- 1. Mã Voucher + Tạo mã ngẫu nhiên -->
                <div>
                  <label for="admin-voucher-code" class="block text-xs font-bold text-[#334155] mb-1">Mã Voucher <span class="text-red-500">*</span></label>
                  <div class="flex gap-2">
                    <input
                      type="text"
                      id="admin-voucher-code"
                      required
                      maxlength="32"
                      autocomplete="off"
                      placeholder="VD: DATTHANG15, SINHVIEN30K"
                      class="input-field h-9 text-xs font-mono font-bold uppercase text-[#16A34A] flex-1"
                    >
                    <button
                      type="button"
                      id="btn-generate-voucher-code"
                      onclick="generateRandomVoucherCode()"
                      class="h-9 px-3 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#0F172A] text-xs font-bold whitespace-nowrap cursor-pointer shrink-0"
                    >Tạo mã ngẫu nhiên</button>
                  </div>
                  <p class="text-[11px] text-[#64748B] mt-1">Tự động viết hoa và loại bỏ khoảng trắng.</p>
                </div>

                <!-- 2. Loại giảm giá -->
                <div>
                  <label for="admin-voucher-type" class="block text-xs font-bold text-[#334155] mb-1">Loại giảm giá <span class="text-red-500">*</span></label>
                  <select id="admin-voucher-type" class="input-field h-9 text-xs font-semibold">
                    <option value="percent">Giảm theo phần trăm (%)</option>
                    <option value="fixed">Giảm số tiền cố định (VNĐ)</option>
                  </select>
                  <p class="text-[11px] text-[#64748B] mt-1">Chọn giảm theo % hóa đơn hoặc trừ trực tiếp số tiền VNĐ.</p>
                </div>

                <!-- 3. Giá trị giảm + Dynamic suffix badge -->
                <div>
                  <label for="admin-voucher-value" class="block text-xs font-bold text-[#334155] mb-1">Giá trị giảm <span class="text-red-500">*</span></label>
                  <div class="relative">
                    <input
                      type="number"
                      id="admin-voucher-value"
                      required
                      min="1"
                      placeholder="VD: 15 (cho %) hoặc 50000 (cho VNĐ)"
                      class="input-field h-9 pr-12 text-xs font-bold tabular-nums"
                    >
                    <span id="voucher-value-unit" class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[#475569] text-[11px] font-bold">%</span>
                  </div>
                  <p class="text-[11px] text-[#64748B] mt-1">Với loại %, giá trị hợp lệ từ 1 đến 100.</p>
                </div>

                <!-- 4. Giảm tối đa (chỉ hiện khi giảm theo %) -->
                <div id="voucher-max-discount-wrap">
                  <label for="admin-voucher-max-discount" class="block text-xs font-bold text-[#334155] mb-1">Giảm tối đa (VNĐ)</label>
                  <input
                    type="number"
                    id="admin-voucher-max-discount"
                    min="0"
                    value="0"
                    placeholder="VD: 100000 (nhập 0 nếu không giới hạn trần)"
                    class="input-field h-9 text-xs font-semibold tabular-nums"
                  >
                  <p class="text-[11px] text-[#64748B] mt-1">Mức trần giảm tối đa khi giảm theo %. Nhập 0 để không giới hạn.</p>
                </div>

                <!-- 5. Đơn tối thiểu -->
                <div>
                  <label for="admin-voucher-min" class="block text-xs font-bold text-[#334155] mb-1">Đơn tối thiểu (VNĐ)</label>
                  <input
                    type="number"
                    id="admin-voucher-min"
                    min="0"
                    value="0"
                    placeholder="VD: 300000 (nhập 0 áp dụng cho mọi đơn)"
                    class="input-field h-9 text-xs font-semibold tabular-nums"
                  >
                  <p class="text-[11px] text-[#64748B] mt-1">Giá trị hóa đơn tối thiểu để áp dụng mã. Nhập 0 cho mọi đơn.</p>
                </div>

                <!-- 6. Số lượt dùng tối đa -->
                <div>
                  <label for="admin-voucher-max-usage" class="block text-xs font-bold text-[#334155] mb-1">Số lượt dùng tối đa</label>
                  <input
                    type="number"
                    id="admin-voucher-max-usage"
                    value="100"
                    min="0"
                    placeholder="VD: 100 (nhập 0 nếu không giới hạn lượt)"
                    class="input-field h-9 text-xs font-bold tabular-nums"
                  >
                  <p class="text-[11px] text-[#64748B] mt-1">Tổng số lần khách được sử dụng mã. Nhập 0 để không giới hạn.</p>
                </div>

                <!-- 7. Hiệu lực từ ngày -->
                <div>
                  <label for="admin-voucher-valid-from" class="block text-xs font-bold text-[#334155] mb-1">Hiệu lực từ ngày</label>
                  <input
                    type="date"
                    id="admin-voucher-valid-from"
                    lang="vi"
                    data-vn-datepicker="1"
                    data-allow-past="1"
                    class="input-field vn-date-input h-9 text-xs font-semibold"
                  >
                  <p class="text-[11px] text-[#64748B] mt-1">Để trống nếu áp dụng ngay (định dạng dd/mm/yyyy).</p>
                </div>

                <!-- 8. Hiệu lực đến ngày -->
                <div>
                  <label for="admin-voucher-valid-to" class="block text-xs font-bold text-[#334155] mb-1">Hiệu lực đến ngày</label>
                  <input
                    type="date"
                    id="admin-voucher-valid-to"
                    lang="vi"
                    data-vn-datepicker="1"
                    data-allow-past="1"
                    class="input-field vn-date-input h-9 text-xs font-semibold"
                  >
                  <p id="voucher-date-error" class="hidden text-[11px] font-semibold text-red-600 mt-1" role="alert"></p>
                  <p class="text-[11px] text-[#64748B] mt-1">Phải lớn hơn hoặc bằng ngày bắt đầu. Để trống nếu không hết hạn.</p>
                </div>

                <!-- 9. Giới hạn loại sân áp dụng -->
                <div>
                  <label for="admin-voucher-pitch-limit" class="block text-xs font-bold text-[#334155] mb-1">Giới hạn loại sân áp dụng</label>
                  <select id="admin-voucher-pitch-limit" class="input-field h-9 text-xs font-semibold">
                    <option value="">Tất cả loại sân</option>
                    <option value="5">Chỉ Sân 5 người</option>
                    <option value="7">Chỉ Sân 7 người</option>
                    <option value="11">Chỉ Sân 11 người</option>
                  </select>
                  <p class="text-[11px] text-[#64748B] mt-1">Áp dụng cho tất cả cỡ sân hoặc giới hạn riêng từng loại sân.</p>
                </div>

                <!-- 10. Mô tả chương trình (không bắt buộc) -->
                <div>
                  <label for="admin-voucher-desc" class="block text-xs font-bold text-[#334155] mb-1">Mô tả chương trình <span class="text-[#64748B] font-normal">(không bắt buộc)</span></label>
                  <input
                    type="text"
                    id="admin-voucher-desc"
                    placeholder="VD: Ưu đãi khách đặt sân khung giờ sáng hoặc khách quen"
                    class="input-field h-9 text-xs"
                  >
                  <p class="text-[11px] text-[#64748B] mt-1">Ghi chú ngắn giúp nhân viên và khách hàng dễ nhận biết ưu đãi.</p>
                </div>
              </div>

              <div class="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                <button type="button" id="admin-voucher-cancel-btn" onclick="cancelEditVoucher()" class="hidden btn-sm btn-secondary font-bold cursor-pointer">Hủy sửa</button>
                <button type="submit" id="admin-voucher-submit-btn" class="btn-base btn-primary text-xs font-bold px-4 py-2 cursor-pointer">+ Thêm mã Voucher</button>
              </div>
            </form>

            <!-- FILTER BAR -->
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div class="relative flex-1 max-w-md">
                <input
                  type="text"
                  id="voucher-filter-search"
                  placeholder="Tìm kiếm theo mã Voucher hoặc mô tả..."
                  aria-label="Tìm kiếm mã Voucher"
                  class="input-field h-9 pl-9 text-xs font-medium"
                >
                <svg class="w-4 h-4 text-[#94A3B8] pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8" stroke-width="2"/><path d="m21 21-4.3-4.3" stroke-width="2"/></svg>
              </div>
              <div class="flex items-center gap-2">
                <label for="voucher-filter-status" class="text-xs font-bold text-[#475569] whitespace-nowrap">Trạng thái:</label>
                <select id="voucher-filter-status" class="input-field h-9 text-xs font-semibold w-full sm:w-48">
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Đang kích hoạt</option>
                  <option value="inactive">Đang tạm khóa</option>
                  <option value="expired">Đã hết hạn / Hết lượt</option>
                </select>
              </div>
            </div>

            <!-- VOUCHER LIST TABLE -->
            <div class="overflow-x-auto rounded-xl border border-[#E2E8F0]">
              <table class="w-full text-left text-xs border-collapse min-w-[820px]">
                <thead>
                  <tr class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
                    <th class="py-3 px-4">Mã Voucher</th>
                    <th class="py-3 px-4">Mức giảm &amp; Trần</th>
                    <th class="py-3 px-4">Lượt sử dụng</th>
                    <th class="py-3 px-4">Hiệu lực &amp; Loại sân</th>
                    <th class="py-3 px-4">Trạng thái</th>
                    <th class="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody id="admin-vouchers-tbody" class="divide-y divide-[#E2E8F0] font-medium">
                  <!-- Rendered dynamically by js/admin_vouchers.js -->
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <!-- MODAL: THÊM / CHỈNH SỬA GÓI THEO THÁNG -->
      <div
        id="package-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="package-modal-title"
        class="hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm items-center justify-center p-3 sm:p-4 overflow-y-auto"
        onclick="if(event.target===this && typeof closePackageModal==='function') closePackageModal()"
      >
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
          <div class="px-5 py-4 bg-[#0F172A] text-white flex items-center justify-between gap-2 shrink-0">
            <div>
              <h3 id="package-modal-title" class="font-heading font-extrabold text-base">Thêm gói theo tháng mới</h3>
              <p class="text-[11px] text-slate-300 mt-0.5">Cấu hình thời hạn, mức giảm giá và quà tặng tài trợ mỗi trận từ kho dịch vụ</p>
            </div>
            <button type="button" onclick="closePackageModal()" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-sm flex items-center justify-center cursor-pointer" aria-label="Đóng cửa sổ">✕</button>
          </div>

          <form id="package-edit-form" onsubmit="handleSavePackage(event)" class="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
            <input type="hidden" id="pkg-id" value="">

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="md:col-span-2">
                <label for="pkg-name" class="block text-xs font-bold text-[#334155] mb-1">Tên gói hợp đồng <span class="text-red-500">*</span></label>
                <input type="text" id="pkg-name" required maxlength="120" placeholder="VD: Gói Vàng 3 Tháng (12 trận)" class="input-field h-9 text-xs font-semibold">
              </div>

              <div>
                <label for="pkg-months" class="block text-xs font-bold text-[#334155] mb-1">Số tháng <span class="text-red-500">*</span></label>
                <input type="number" id="pkg-months" required min="1" max="24" value="1" class="input-field h-9 text-xs font-bold tabular-nums">
              </div>

              <div>
                <label for="pkg-matches-count" class="block text-xs font-bold text-[#334155] mb-1">Số trận / gói <span class="text-red-500">*</span></label>
                <input type="number" id="pkg-matches-count" required min="1" max="200" value="4" class="input-field h-9 text-xs font-bold tabular-nums">
              </div>

              <div>
                <label for="pkg-discount-percent" class="block text-xs font-bold text-[#334155] mb-1">Giảm giá tiền sân (%) <span class="text-red-500">*</span></label>
                <input type="number" id="pkg-discount-percent" required min="0" max="100" value="5" class="input-field h-9 text-xs font-bold tabular-nums">
              </div>

              <div>
                <label for="pkg-theme" class="block text-xs font-bold text-[#334155] mb-1">Giao diện thẻ gói</label>
                <select id="pkg-theme" class="input-field h-9 text-xs font-semibold">
                  <option value="default">Mặc định (Xám trang nhã)</option>
                  <option value="green">Xanh lá (Nổi bật)</option>
                  <option value="diamond">Kim cương (VIP Xanh lam)</option>
                </select>
              </div>

              <div class="md:col-span-2">
                <label for="pkg-badge-text" class="block text-xs font-bold text-[#334155] mb-1">Nhãn góc thẻ (Badge)</label>
                <input type="text" id="pkg-badge-text" maxlength="60" placeholder="VD: HOT NHẤT · KIM CƯƠNG, TIẾT KIỆM 10%" class="input-field h-9 text-xs font-semibold">
              </div>
            </div>

            <label class="inline-flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" id="pkg-is-active" checked class="w-4 h-4 rounded text-[#16A34A]">
              <span class="font-bold text-[#0F172A]">Kích hoạt gói này trên hệ thống đặt sân &amp; quầy</span>
            </label>

            <!-- QUÀ TẶNG TÀI TRỢ MỖI TRẬN TỪ KHO DỊCH VỤ -->
            <div class="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 class="font-bold text-[#0F172A] text-xs">Quà tặng tài trợ mỗi trận (chọn từ kho dịch vụ)</h4>
                  <p class="text-[11px] text-[#64748B]">Hệ thống tự động cộng giá trị quà tặng vào chi phí ưu đãi / trận.</p>
                </div>
                <button type="button" id="btn-pkg-add-gift" onclick="addPackageGiftRow()" class="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#0F172A] font-bold text-[11px] cursor-pointer">+ Thêm quà tặng</button>
              </div>
              <div id="pkg-gifts-list" class="space-y-2">
                <!-- Dynamic gift rows rendered by JS -->
              </div>
              <p id="pkg-gifts-empty" class="text-[11px] text-[#64748B] italic">Chưa chọn quà tặng nào cho gói này.</p>
            </div>

            <!-- LIVE PREVIEW CHI PHÍ ƯU ĐÃI / TRẬN -->
            <div id="pkg-incentive-preview" class="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="text-[#475569] font-semibold">Chi phí ưu đãi / trận (giảm giá + quà tặng):</span>
                <span id="pkg-preview-cost-per-match" class="font-heading font-extrabold text-sm text-[#0F172A] tabular-nums">0đ</span>
              </div>
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="text-[#475569] font-semibold">% so với giá ca (tham chiếu Sân 7):</span>
                <span id="pkg-preview-percent" class="font-heading font-extrabold text-sm text-[#15803D] tabular-nums">0%</span>
              </div>
              <div id="pkg-incentive-warning" class="hidden mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-semibold flex items-start gap-2" role="alert">
                <svg class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                <span id="pkg-incentive-warning-text">Tổng ưu đãi vượt quá 30% giá ca chuẩn. Hãy cân nhắc lại mức giảm hoặc quà tặng để bảo đảm biên lợi nhuận.</span>
              </div>
            </div>

            <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button type="button" onclick="closePackageModal()" class="btn-sm btn-secondary cursor-pointer">Hủy</button>
              <button type="submit" id="pkg-submit-btn" class="btn-base btn-primary text-xs font-bold px-4 py-2 cursor-pointer">Lưu gói theo tháng</button>
            </div>
          </form>
        </div>
      </div>
      <!-- END PRICING & VOUCHER -->
