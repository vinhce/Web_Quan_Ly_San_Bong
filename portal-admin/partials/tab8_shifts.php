<?php
// TAB 8: CHỐT CA / GIAO CA (QUẢN LÝ CA TRỰC & ĐỐI SOÁT TIỀN MẶT)
?>
<style>
  #tab-content-shifts .shift-filter-date-wrap .vn-dp-wrap {
    width: 156px;
    min-width: 148px;
  }
  #tab-content-shifts .shift-filter-date-wrap .vn-dp-text {
    height: 36px;
    min-height: 36px;
    font-size: 12px;
    padding-left: 10px;
    padding-right: 36px !important;
  }
  #tab-content-shifts .shift-filter-date-wrap .vn-dp-btn {
    width: 36px;
    min-height: 36px;
  }
  @media (max-width: 640px) {
    #tab-content-shifts .shift-filter-date-wrap .vn-dp-wrap {
      width: 100%;
    }
    #tab-content-shifts .shift-filter-date-wrap .vn-dp-text,
    #tab-content-shifts .shift-filter-date-wrap .vn-dp-btn {
      min-height: 44px;
    }
  }
  #tab-content-shifts .shift-header-toolbar {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  @media (min-width: 1024px) {
    #tab-content-shifts .shift-header-toolbar {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
  }
  #tab-content-shifts .shift-filter-select {
    width: auto;
    min-width: 170px;
  }
  #tab-content-shifts .shift-btn-h36 { min-height: 36px; }
  #tab-content-shifts .shift-touch-h44 { height: 44px; min-height: 44px; }
  #tab-content-shifts .shift-row-surplus { background-color: rgba(255, 251, 235, 0.85); }
  #tab-content-shifts .shift-row-surplus:hover { background-color: rgba(254, 243, 199, 0.85); }
  #tab-content-shifts .shift-row-deficit { background-color: rgba(255, 241, 242, 0.85); }
  #tab-content-shifts .shift-row-deficit:hover { background-color: rgba(255, 228, 230, 0.85); }
  #tab-content-shifts .shift-confirmer-name { max-width: 150px; }
  .shift-modal-table { min-width: 680px; }
  #shift-detail-modal.shift-modal-detail-z { z-index: 75; }
  #shift-confirm-modal.shift-modal-confirm-z { z-index: 80; }
</style>
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
        <span id="shift-badge-active" class="hidden px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span> Ca đang mở
        </span>
        <span id="shift-badge-closed" class="px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold">
          Chưa mở ca
        </span>
      </div>
    </div>

    <!-- Cảnh báo ca mở quá 12h / 16h -->
    <div id="shift-overdue-warning" class="hidden p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-xs text-amber-900 font-semibold flex items-center gap-3">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-amber-600 shrink-0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
      <div id="shift-overdue-warning-text" class="flex-1">
        <span class="font-bold">Cảnh báo: Ca trực đang mở quá giờ quy định!</span> Vui lòng kiểm đếm tiền mặt và chốt ca ngay.
      </div>
    </div>

    <!-- Thông báo có ca khác đang mở chặn mở ca mới -->
    <div id="shift-blocking-open-notice" class="hidden p-4 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2.5">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-amber-700 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
        <span id="shift-blocking-open-text" class="font-semibold"></span>
      </div>
      <button type="button" id="shift-blocking-detail-btn" class="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-900 font-bold text-xs hover:bg-amber-100 cursor-pointer">
        Xem chi tiết ca mở
      </button>
    </div>

    <!-- Thống kê ca trực hiện tại & Điều khiển Mở/Chốt ca -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
      <!-- 4 ô thống kê số liệu -->
      <div class="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
          <div class="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Thời gian mở ca trực</div>
          <div id="shift-start-time" class="font-mono font-extrabold text-sm sm:text-base text-[#0F172A] mt-1">—</div>
          <div class="text-[11px] text-[#64748B] font-semibold mt-1 flex items-center gap-1.5">
            <span id="shift-operator-dot" class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            <span id="shift-operator-name">Chưa mở ca</span>
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
          <div class="text-[10px] text-amber-800 mt-1">Đặt sân quầy + Thu phần còn lại + Bán nước TM</div>
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
        <div id="shift-open-form-section" class="space-y-3">
          <div class="font-heading font-bold text-sm text-[#0F172A]">Mở Ca Trực Mới</div>
          <div>
            <label for="shift-open-initial-cash" class="block font-bold text-[#475569] mb-1">Tiền mặt đầu ca (tiền lẻ trả khách) *</label>
            <input type="number" id="shift-open-initial-cash" min="0" step="1000" placeholder="VD: 500000" class="input-field w-full bg-white font-mono font-bold text-sm text-[#0F172A]">
          </div>
          <div>
            <label for="shift-open-note" class="block font-bold text-[#475569] mb-1">Ghi chú mở ca</label>
            <input type="text" id="shift-open-note" placeholder="VD: Bắt đầu ca sáng..." class="input-field w-full bg-white text-xs">
          </div>
          <button type="button" id="btn-open-shift" onclick="handleOpenShift()" class="w-full btn-base bg-[#16A34A] hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 shadow-sm cursor-pointer flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>
            Bắt đầu mở ca trực
          </button>
        </div>

        <!-- Khi đang có ca mở: Form chốt ca -->
        <div id="shift-close-form-section" class="hidden space-y-3">
          <div class="font-heading font-bold text-sm text-[#0F172A]">Chốt Ca &amp; Kiểm Đếm Tiền Mặt</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="shift-cash-counted" class="block font-bold text-[#475569] mb-1">Nhân viên đếm (thực tế) *</label>
              <input type="number" id="shift-cash-counted" min="0" step="1000" oninput="calculateShiftDiscrepancy()" placeholder="Nhập số tiền đếm được" class="input-field w-full bg-white font-mono font-bold text-sm text-[#0F172A]">
            </div>
            <div>
              <span class="block font-bold text-[#475569] mb-1">Chênh lệch tiền mặt</span>
              <div id="shift-discrepancy-badge" class="shift-touch-h44 px-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center font-mono font-bold text-xs text-slate-500">
                Chưa kiểm đếm
              </div>
            </div>
          </div>
          <div id="shift-discrepancy-reason-box" class="hidden">
            <label for="shift-discrepancy-reason" class="block font-bold text-red-700 mb-1">Lý do chênh lệch (tối thiểu 10 ký tự rõ ràng) *</label>
            <input type="text" id="shift-discrepancy-reason" oninput="calculateShiftDiscrepancy()" placeholder="VD: Trả nhầm tiền thừa cho khách sân 5..." class="input-field w-full bg-white text-xs border-red-300">
          </div>
          <div>
            <label for="shift-close-note" class="block font-bold text-[#475569] mb-1">Ghi chú bàn giao ca trực</label>
            <input type="text" id="shift-close-note" placeholder="VD: Đã đếm đủ tiền mặt bàn giao ca sau..." class="input-field w-full bg-white text-xs">
          </div>
          <div class="pt-1">
            <button type="button" id="btn-close-shift" onclick="handleCloseShift()" disabled class="w-full btn-base bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs py-2.5 shadow-sm flex items-center justify-center gap-2 opacity-50 cursor-not-allowed">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Chốt ca bàn giao
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Bảng Lịch sử Chốt ca & Đối soát bàn giao (tiêu đề + bộ lọc trên CÙNG 1 HÀNG) -->
    <div class="space-y-3 pt-4 border-t border-[#E2E8F0]">
      <div class="shift-header-toolbar text-xs">
        <div class="min-w-0">
          <h4 class="font-heading font-bold text-sm sm:text-base text-[#0F172A]">Lịch sử Chốt ca &amp; Đối soát bàn giao tiền mặt</h4>
          <p class="text-[11px] text-[#64748B]">Theo dõi các ca đang mở, chờ giải trình, chờ đối soát và đã đối soát</p>
        </div>
        <div class="flex flex-wrap items-center gap-2 shrink-0">
          <div class="shift-filter-date-wrap">
            <input type="date" id="shift-filter-date" data-vn-datepicker="1" data-allow-past="1" aria-label="Lọc theo ngày mở ca" onchange="loadShiftHandovers(1)" class="input-field text-xs bg-white">
          </div>
          <select id="shift-filter-staff" aria-label="Lọc theo nhân viên" onchange="loadShiftHandovers(1)" class="input-field shift-filter-select h-9 text-xs bg-white">
            <option value="">Tất cả nhân viên</option>
          </select>
          <button type="button" id="shift-refresh-btn" onclick="loadShiftHandovers(currentShiftPage || 1)" class="shift-btn-h36 h-9 px-3 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-xs font-bold text-[#16A34A] flex items-center gap-1.5 cursor-pointer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
            Làm mới
          </button>
          <button type="button" id="shift-export-csv-btn" onclick="exportShiftsCsv()" class="shift-btn-h36 h-9 px-3 rounded-lg border border-[#E2E8F0] bg-[#0F172A] hover:bg-slate-800 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            Xuất CSV
          </button>
        </div>
      </div>

      <div class="overflow-x-auto border border-[#E2E8F0] rounded-xl bg-white">
        <table class="w-full text-left text-xs min-w-[1040px]">
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
              <th class="py-3 px-3">Người đối soát / Thời điểm</th>
              <th class="py-3 px-3 text-right">Thao tác</th>
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

      <div id="shift-pagination" class="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 text-xs text-[#64748B]">
        <div id="shift-pagination-info">Hiển thị 0 / 0 ca trực</div>
        <div class="flex items-center gap-1.5">
          <button type="button" id="shift-prev-page-btn" onclick="goToShiftPage((currentShiftPage || 1) - 1)" class="h-8 px-3 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold cursor-pointer">
            ‹ Trước
          </button>
          <span id="shift-page-indicator" class="px-2 font-bold text-[#0F172A]">Trang 1 / 1</span>
          <button type="button" id="shift-next-page-btn" onclick="goToShiftPage((currentShiftPage || 1) + 1)" class="h-8 px-3 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold cursor-pointer">
            Sau ›
          </button>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- MODAL CHI TIẾT CA TRỰC & ĐỐI CHIẾU VIETQR -->
<div id="shift-detail-modal" role="dialog" aria-modal="true" aria-labelledby="shift-detail-title" class="hidden fixed inset-0 shift-modal-detail-z bg-slate-900/60 backdrop-blur-sm items-center justify-center p-3 sm:p-4 overflow-y-auto" onclick="if(event.target===this) closeShiftDetailModal()">
  <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
    <div class="px-5 py-4 bg-[#0F172A] text-white flex items-center justify-between gap-3 shrink-0">
      <div>
        <h4 id="shift-detail-title" class="font-heading font-extrabold text-sm sm:text-base">Chi tiết ca trực</h4>
        <p id="shift-detail-subtitle" class="text-[11px] text-slate-300 mt-0.5"></p>
      </div>
      <button type="button" onclick="closeShiftDetailModal()" class="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-sm flex items-center justify-center cursor-pointer" aria-label="Đóng">✕</button>
    </div>
    <div id="shift-detail-body" class="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs">
      <!-- Rendered by JS -->
    </div>
  </div>
</div>

<!-- MODAL ĐỐI SOÁT TIỀN MẶT CA TRỰC -->
<div id="shift-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="shift-confirm-title" class="hidden fixed inset-0 shift-modal-confirm-z bg-slate-900/60 backdrop-blur-sm items-center justify-center p-4 overflow-y-auto" onclick="if(event.target===this) closeShiftConfirmModal()">
  <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden my-auto">
    <div class="px-5 py-4 bg-[#0F172A] text-white flex items-center justify-between gap-2">
      <h4 id="shift-confirm-title" class="font-heading font-extrabold text-sm">Đối soát bàn giao tiền mặt</h4>
      <button type="button" onclick="closeShiftConfirmModal()" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center cursor-pointer" aria-label="Đóng">✕</button>
    </div>
    <form id="shift-confirm-form" onsubmit="submitShiftConfirmModal(event)" class="p-5 space-y-4 text-xs">
      <input type="hidden" id="confirm-shift-id">
      <input type="hidden" id="confirm-shift-expected">
      <input type="hidden" id="confirm-shift-staff-counted">
      <div id="confirm-shift-summary" class="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-[#334155]"></div>
      <div>
        <label for="confirm-shift-actual-cash" class="block font-bold text-[#0F172A] mb-1">Số tiền thực nhận trong két (VNĐ) *</label>
        <input type="number" id="confirm-shift-actual-cash" min="0" step="1000" required oninput="updateConfirmShiftPreview()" class="input-field w-full bg-white font-mono font-bold text-sm">
        <div id="confirm-shift-diff-preview" class="mt-1.5 text-[11px] font-bold"></div>
      </div>
      <div>
        <label for="confirm-shift-admin-note" class="block font-bold text-[#0F172A] mb-1">
          Ghi chú đối soát / Lý do chỉnh sửa <span id="confirm-shift-note-req-mark" class="hidden text-red-600">(Bắt buộc ≥ 10 ký tự) *</span>
        </label>
        <textarea id="confirm-shift-admin-note" rows="3" placeholder="Nhập ghi chú đối soát hoặc giải trình chênh lệch..." class="w-full p-2.5 rounded-lg border border-[#E2E8F0] bg-white text-xs outline-none focus:border-[#16A34A]"></textarea>
        <p id="confirm-shift-note-err" class="hidden mt-1 text-[11px] font-semibold text-red-600"></p>
      </div>
      <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
        <button type="button" onclick="closeShiftConfirmModal()" class="btn-sm btn-secondary cursor-pointer">Hủy</button>
        <button type="submit" id="confirm-shift-submit-btn" class="btn-sm btn-primary font-bold cursor-pointer">Xác nhận đối soát</button>
      </div>
    </form>
  </div>
</div>
