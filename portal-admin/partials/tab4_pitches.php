      <!-- TAB 4: QUẢN LÝ 26 SÂN & BẬT TẮT BẢO TRÌ (Frame 14) -->
      <!-- ========================================== -->
      <div id="tab-content-pitches" class="space-y-4 hidden">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 class="font-heading font-bold text-base text-[#0F172A]">Danh sách sân bóng trực thuộc hệ thống</h3>
            <span class="text-xs text-[#64748B]">Bật công tắc bảo trì sẽ ngay lập tức khóa sân trên trang đặt của khách · Thiết lập giá riêng từng sân</span>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <div class="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-xl border border-[#E2E8F0]">
              <button type="button" id="pitch-filter-all" onclick="filterAdminPitches('all')" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#16A34A] text-white cursor-pointer">Tất cả</button>
              <button type="button" id="pitch-filter-active" onclick="filterAdminPitches('Hoạt động')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer">Hoạt động</button>
              <button type="button" id="pitch-filter-maint" onclick="filterAdminPitches('Bảo trì')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer">Bảo trì</button>
              <button type="button" id="pitch-filter-hidden" onclick="filterAdminPitches('Ẩn')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer">Đã ẩn</button>
            </div>
            <?php if (!isset($isManagerOrAdmin) || $isManagerOrAdmin): ?>
            <button type="button" id="btn-add-pitch" onclick="openPitchModal()" class="btn-sm btn-primary font-bold flex items-center gap-1.5 cursor-pointer">
              + Thêm sân bóng mới
            </button>
            <?php endif; ?>
          </div>
        </div>

        <div id="admin-pitches-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <!-- Rendered by JS with real-time Maintenance toggle -->
        </div>

        <!-- Modal Thêm / Sửa thông tin & giá riêng từng sân -->
        <div id="pitch-edit-modal" class="hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm items-center justify-center p-4" onclick="if(event.target===this) closePitchModal()">
          <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-auto">
            <div class="px-5 py-4 bg-[#0F172A] text-white flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <span class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-emerald-400">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                </span>
                <div>
                  <h4 id="pitch-modal-title" class="font-heading font-extrabold text-sm">Thêm / Sửa thông tin &amp; Giá riêng từng sân</h4>
                  <p class="text-[11px] text-slate-300">Cấu hình thông số mặt cỏ, kích thước và đơn giá theo khung giờ riêng</p>
                </div>
              </div>
              <button type="button" onclick="closePitchModal()" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-sm flex items-center justify-center cursor-pointer">✕</button>
            </div>

            <form id="pitch-edit-form" onsubmit="savePitchForm(event)" class="p-5 space-y-4 text-xs">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block font-bold text-[#475569] mb-1">Mã sân *</label>
                  <input type="text" id="pitch-form-id" required placeholder="VD: P5-G, P7-I..." class="input-field w-full font-mono font-bold uppercase">
                </div>
                <div>
                  <label class="block font-bold text-[#475569] mb-1">Tên sân hiển thị *</label>
                  <input type="text" id="pitch-form-name" required placeholder="VD: Sân 5-G (Khán đài B)" class="input-field w-full font-semibold">
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label class="block font-bold text-[#475569] mb-1">Loại sân *</label>
                  <select id="pitch-form-type" class="input-field w-full font-bold">
                    <option value="5">Sân 5 người</option>
                    <option value="7">Sân 7 người</option>
                    <option value="11">Sân 11 người</option>
                  </select>
                </div>
                <div>
                  <label class="block font-bold text-[#475569] mb-1">Kích thước tiêu chuẩn</label>
                  <input type="text" id="pitch-form-size" placeholder="VD: 20m x 40m" class="input-field w-full font-semibold">
                </div>
                <div>
                  <label class="block font-bold text-[#475569] mb-1">Trạng thái vận hành *</label>
                  <select id="pitch-form-status" class="input-field w-full font-bold">
                    <option value="Hoạt động">Hoạt động</option>
                    <option value="Bảo trì">Bảo trì</option>
                    <option value="Ẩn">Ẩn</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="block font-bold text-[#475569] mb-1">Chất lượng mặt cỏ &amp; Đèn chiếu sáng</label>
                <input type="text" id="pitch-form-grass" placeholder="VD: Cỏ nhân tạo FIFA Quality · Đèn LED 400W" class="input-field w-full font-semibold">
              </div>

              <div class="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
                <div class="font-bold text-[#0F172A] text-xs flex items-center justify-between">
                  <span>Thiết lập đơn giá riêng cho sân này (VNĐ / ca 2 tiếng)</span>
                  <span class="text-[11px] font-normal text-[#64748B]">Ưu tiên áp dụng khi tính tiền</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label class="block font-bold text-[#475569] mb-1">Giá giờ thường *</label>
                    <input type="number" id="pitch-form-base-price" min="0" step="10000" required placeholder="300000" class="input-field w-full font-bold text-[#0F172A] bg-white">
                  </div>
                  <div>
                    <label class="block font-bold text-[#D97706] mb-1">Giá giờ cao điểm *</label>
                    <input type="number" id="pitch-form-peak-price" min="0" step="10000" required placeholder="450000" class="input-field w-full font-bold text-[#D97706] bg-white">
                  </div>
                  <div>
                    <label class="block font-bold text-[#2563EB] mb-1">Giá cuối tuần *</label>
                    <input type="number" id="pitch-form-weekend-price" min="0" step="10000" required placeholder="500000" class="input-field w-full font-bold text-[#2563EB] bg-white">
                  </div>
                </div>
              </div>

              <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button type="button" onclick="closePitchModal()" class="btn-sm btn-secondary cursor-pointer">Hủy</button>
                <button type="submit" class="btn-sm btn-primary font-bold cursor-pointer">Lưu thông tin sân</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- ========================================== -->