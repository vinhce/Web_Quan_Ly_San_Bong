<?php
// TAB 8: CHỐT CA / GIAO CA (QUẢN LÝ CA TRỰC & ĐỐI SOÁT TIỀN MẶT)
?>
<div id="tab-content-shifts" class="space-y-6 hidden">
  <div id="shift-handover-card" class="ui-card p-5 sm:p-6 space-y-6 border-2 border-emerald-200/80 bg-white shadow-sm">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-[#16A34A] text-white flex items-center justify-center shadow-sm shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <div>
          <h3 class="font-heading font-extrabold text-base sm:text-lg text-[#0F172A]">8. Chốt Ca &amp; Bàn Giao Tiền Mặt Cuối Ca</h3>
          <p class="text-xs text-[#64748B]">Tổng hợp tiền mặt &amp; chuyển khoản VietQR tự động theo thời gian ca trực. Minh bạch tài chính, chống thất thoát.</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span id="shift-badge-active" class="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span> Ca đang mở
        </span>
        <span id="shift-badge-closed" class="hidden px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold">
          Chưa mở ca
        </span>
      </div>
    </div>

    <!-- Cảnh báo ca mở quá 14 giờ -->
    <div id="shift-overdue-warning" class="hidden p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-xs text-amber-900 font-semibold flex items-center gap-3">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-amber-600 shrink-0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
      <div class="flex-1">
        <span class="font-bold text-amber-950">Cảnh báo: Ca trực đã mở quá 14 giờ!</span> Vui lòng kiểm đếm tiền mặt và chốt ca ngay để bàn giao sổ sách.
      </div>
    </div>

    <!-- Thống kê ca trực hiện tại & Điều khiển Mở/Chốt ca -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
      <!-- 4 ô thống kê số liệu -->
      <div class="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
          <div class="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Thời gian mở ca trực</div>
          <div id="shift-start-time" class="font-mono font-extrabold text-sm sm:text-base text-[#0F172A] mt-1">--:--</div>
          <div class="text-[11px] text-[#16A34A] font-semibold mt-1 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span id="shift-operator-name">Nhân viên trực</span>
          </div>
        </div>

        <div class="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col justify-between">
          <div class="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">Tiền mặt đầu ca (vốn lẻ)</div>
          <div id="shift-initial-cash-display" class="font-heading font-extrabold text-xl text-emerald-700 mt-1">0đ</div>
          <div class="text-[10px] text-emerald-700 mt-1">Tiền trả lại &amp; tiền lẻ nhận từ ca trước</div>
        </div>

        <div class="p-4 rounded-xl bg-amber-50/70 border-2 border-amber-300 flex flex-col justify-between">
          <div class="text-[11px] font-bold text-amber-900 uppercase tracking-wider">Hệ thống tính (Doanh thu TM)</div>
          <div id="shift-cash-total" class="font-heading font-extrabold text-xl text-[#D97706] mt-1">0đ</div>
          <div class="text-[10px] text-amber-800 mt-1">Đặt sân quầy + Thu 70% + Bán nước TM</div>
        </div>

        <div class="p-4 rounded-xl bg-purple-50/70 border border-purple-200 flex flex-col justify-between">
          <div class="text-[11px] font-bold text-purple-900 uppercase tracking-wider">Chuyển khoản VietQR trong ca</div>
          <div id="shift-transfer-total" class="font-heading font-extrabold text-xl text-purple-700 mt-1">0đ</div>
          <div class="text-[10px] text-purple-700 mt-1">Đã vào tài khoản ngân hàng</div>
        </div>
      </div>

      <!-- Form Mở ca hoặc Chốt ca -->
      <div class="lg:col-span-5 p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col justify-between gap-3 text-xs">
        <!-- Khi chưa có ca: Form mở ca mới -->
        <div id="shift-open-form-section" class="hidden space-y-3">
          <div class="font-heading font-bold text-sm text-[#0F172A]">Mở Ca Trực Mới</div>
          <div>
            <label class="block font-bold text-[#475569] mb-1">Tiền mặt đầu ca (tiền lẻ trả khách) *</label>
            <input type="number" id="shift-open-initial-cash" min="0" step="1000" placeholder="VD: 500000" class="input-field w-full bg-white font-mono font-bold text-sm text-[#0F172A]">
          </div>
          <div>
            <label class="block font-bold text-[#475569] mb-1">Ghi chú mở ca</label>
            <input type="text" id="shift-open-note" placeholder="VD: Bắt đầu ca sáng..." class="input-field w-full bg-white text-xs">
          </div>
          <button type="button" id="btn-open-shift" onclick="handleOpenShift()" class="w-full btn-base bg-[#16A34A] hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 shadow-sm cursor-pointer flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>
            Bắt đầu mở ca trực
          </button>
        </div>

        <!-- Khi đang có ca mở: Form chốt ca -->
        <div id="shift-close-form-section" class="space-y-3">
          <div class="font-heading font-bold text-sm text-[#0F172A]">Chốt Ca &amp; Kiểm Đếm Tiền Mặt</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-[#475569] mb-1">Nhân viên đếm (thực tế) *</label>
              <input type="number" id="shift-cash-counted" min="0" step="1000" oninput="calculateShiftDiscrepancy()" placeholder="Nhập số tiền đếm được" class="input-field w-full bg-white font-mono font-bold text-sm text-[#0F172A]">
            </div>
            <div>
              <label class="block font-bold text-[#475569] mb-1">Chênh lệch tiền mặt</label>
              <div id="shift-discrepancy-badge" class="h-[38px] px-3 rounded-lg border border-slate-200 bg-white flex items-center justify-center font-mono font-bold text-xs text-slate-600">
                0đ (Khớp)
              </div>
            </div>
          </div>
          <div id="shift-discrepancy-reason-box" class="hidden">
            <label class="block font-bold text-red-700 mb-1">Lý do chênh lệch (bắt buộc khi thừa/thiếu) *</label>
            <input type="text" id="shift-discrepancy-reason" placeholder="VD: Trả nhầm tiền thừa cho khách bàn 2..." class="input-field w-full bg-white text-xs border-red-300">
          </div>
          <div>
            <label class="block font-bold text-[#475569] mb-1">Ghi chú bàn giao ca trực</label>
            <input type="text" id="shift-close-note" placeholder="VD: Đã đếm đủ tiền mặt bàn giao ca sau..." class="input-field w-full bg-white text-xs">
          </div>
          <div class="pt-1">
            <button type="button" id="btn-close-shift" onclick="handleCloseShift()" class="w-full btn-base bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs py-2.5 shadow-sm cursor-pointer flex items-center justify-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Khóa sổ &amp; Chốt ca bàn giao
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Bảng Lịch sử Chốt ca & Đối soát bàn giao -->
    <div class="space-y-3 pt-2 border-t border-[#E2E8F0]">
      <div class="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div>
          <h4 class="font-heading font-bold text-sm sm:text-base text-[#0F172A]">Lịch sử Chốt ca &amp; Đối soát bàn giao tiền mặt</h4>
          <p class="text-[11px] text-[#64748B]">Danh sách các ca trực đã chốt, chờ đối soát và đã duyệt bàn giao</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <input type="date" id="shift-filter-date" onchange="loadShiftHandovers()" class="input-field text-xs py-1.5 bg-white">
          <select id="shift-filter-staff" onchange="loadShiftHandovers()" class="input-field text-xs py-1.5 bg-white">
            <option value="">Tất cả nhân viên</option>
          </select>
          <button type="button" onclick="loadShiftHandovers()" class="px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-xs font-bold text-[#16A34A] flex items-center gap-1 cursor-pointer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
            Làm mới
          </button>
        </div>
      </div>

      <div class="overflow-x-auto border border-[#E2E8F0] rounded-xl bg-white">
        <table class="w-full text-left text-xs min-w-[880px]">
          <thead class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
            <tr>
              <th class="py-3 px-3">Mã ca</th>
              <th class="py-3 px-3">Nhân viên</th>
              <th class="py-3 px-3">Thời gian mở - chốt</th>
              <th class="py-3 px-3 text-right">Tiền đầu ca</th>
              <th class="py-3 px-3 text-right">Hệ thống tính</th>
              <th class="py-3 px-3 text-right">VietQR</th>
              <th class="py-3 px-3 text-right">Nhân viên đếm</th>
              <th class="py-3 px-3 text-center">Chênh lệch</th>
              <th class="py-3 px-3 text-center">Trạng thái</th>
              <th class="py-3 px-3 text-right">Thao tác đối soát</th>
            </tr>
          </thead>
          <tbody id="admin-shifts-tbody" class="divide-y divide-[#E2E8F0]">
            <!-- Rendered by JS -->
          </tbody>
        </table>
      </div>
      <div id="shift-empty-state" class="hidden p-8 text-center text-xs text-[#64748B] bg-white rounded-xl border border-dashed border-slate-200">
        Chưa có ca trực nào phù hợp với bộ lọc tìm kiếm.
      </div>
    </div>
  </div>
</div>
