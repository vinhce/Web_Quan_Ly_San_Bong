<?php
/**
 * Tab 11: Nhật ký hệ thống & Thao tác Quản trị (Admin Audit Log)
 * Phục vụ theo dõi, hậu kiểm các thao tác nhạy cảm: sửa giá, chỉnh điểm hội viên,
 * đổi thông tin khách, duyệt cọc, hủy ca, chốt ca trực...
 * 
 * Bất biến (Append-only) - Chống thất thoát & rà soát trách nhiệm.
 */
?>
<!-- TAB 11: NHẬT KÝ ADMIN & AUDIT LOG -->
<!-- ========================================== -->
<style>
  :root {
    --badge-green-bg: #DCFCE7;
    --badge-green-text: #166534;
    --badge-green-border: #BBF7D0;

    --badge-red-bg: #FEE2E2;
    --badge-red-text: #991B1B;
    --badge-red-border: #FECACA;

    --badge-blue-bg: #DBEAFE;
    --badge-blue-text: #1E40AF;
    --badge-blue-border: #BFDBFE;

    --badge-orange-bg: #FFEDD5;
    --badge-orange-text: #9A3412;
    --badge-orange-border: #FED7AA;

    --badge-purple-bg: #F3E8FF;
    --badge-purple-text: #6B21A8;
    --badge-purple-border: #E9D5FF;

    --badge-gray-bg: #F1F5F9;
    --badge-gray-text: #334155;
    --badge-gray-border: #CBD5E1;
  }

  .badge-action {
    white-space: nowrap !important;
    display: inline-flex;
    align-items: center;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 700;
    border-width: 1px;
    border-style: solid;
    line-height: 1.25rem;
  }

  .badge-green {
    background-color: var(--badge-green-bg) !important;
    color: var(--badge-green-text) !important;
    border-color: var(--badge-green-border) !important;
  }

  .badge-red {
    background-color: var(--badge-red-bg) !important;
    color: var(--badge-red-text) !important;
    border-color: var(--badge-red-border) !important;
  }

  .badge-blue {
    background-color: var(--badge-blue-bg) !important;
    color: var(--badge-blue-text) !important;
    border-color: var(--badge-blue-border) !important;
  }

  .badge-orange {
    background-color: var(--badge-orange-bg) !important;
    color: var(--badge-orange-text) !important;
    border-color: var(--badge-orange-border) !important;
  }

  .badge-purple {
    background-color: var(--badge-purple-bg) !important;
    color: var(--badge-purple-text) !important;
    border-color: var(--badge-purple-border) !important;
  }

  .badge-gray {
    background-color: var(--badge-gray-bg) !important;
    color: var(--badge-gray-text) !important;
    border-color: var(--badge-gray-border) !important;
  }
</style>
<div id="tab-content-logs" class="space-y-4 hidden">
  <!-- 1. Header Card -->
  <div class="ui-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div class="space-y-1">
      <div class="flex flex-wrap items-center gap-2">
        <h3 class="font-heading font-extrabold text-base sm:text-lg text-[#0F172A] flex items-center gap-2">
          <span class="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-[#16A34A] flex items-center justify-center shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </span>
          <span>11. Nhật ký hệ thống &amp; Thao tác Quản trị (Admin Log)</span>
        </h3>
        <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold inline-flex items-center gap-1">
          <svg class="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
          Bất biến (Append-only)
        </span>
      </div>
      <p class="text-xs text-[#64748B]">
        Ghi nhận tức thì mọi thay đổi nhạy cảm: sửa giá sân/dịch vụ, điều chỉnh điểm hội viên, duyệt cọc, hủy ca, chốt ca, cập nhật cài đặt...
      </p>
    </div>

    <div class="flex items-center gap-2 shrink-0">
      <span id="admin-log-total-badge" class="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
        Đang tải...
      </span>
      <button type="button" onclick="loadAdminLogs(currentLogPage || 1)" class="h-9 px-3 rounded-lg bg-white border border-[#CBD5E1] hover:bg-slate-50 text-[#0F172A] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm" title="Tải lại nhật ký">
        <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        <span>Làm mới</span>
      </button>
    </div>
  </div>

  <!-- 2. Bộ lọc (Filters Card) -->
  <div class="ui-card p-4 sm:p-5 space-y-3">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
      <!-- Lọc nhân sự / Admin -->
      <div class="lg:col-span-3">
        <label for="admin-log-filter-staff" class="block text-[11px] font-bold text-[#475569] mb-1">
          Admin / Nhân sự thực hiện
        </label>
        <select id="admin-log-filter-staff" onchange="handleAdminLogFilterChange()" class="input-field h-9 text-xs font-semibold bg-white w-full">
          <option value="">Tất cả nhân sự</option>
        </select>
      </div>

      <!-- Lọc loại hành động -->
      <div class="lg:col-span-3">
        <label for="admin-log-filter-action" class="block text-[11px] font-bold text-[#475569] mb-1">
          Loại hành động
        </label>
        <select id="admin-log-filter-action" onchange="handleAdminLogFilterChange()" class="input-field h-9 text-xs font-semibold bg-white w-full">
          <option value="">Tất cả hành động</option>
        </select>
      </div>

      <!-- Từ ngày -->
      <div class="lg:col-span-2 sm:col-span-1">
        <label for="admin-log-filter-from" class="block text-[11px] font-bold text-[#475569] mb-1">
          Từ ngày
        </label>
        <input type="date" id="admin-log-filter-from" data-vn-datepicker="1" data-allow-past="1" onchange="handleAdminLogFilterChange()" class="input-field h-9 text-xs font-semibold bg-white w-full">
      </div>

      <!-- Đến ngày -->
      <div class="lg:col-span-2 sm:col-span-1">
        <label for="admin-log-filter-to" class="block text-[11px] font-bold text-[#475569] mb-1">
          Đến ngày
        </label>
        <input type="date" id="admin-log-filter-to" data-vn-datepicker="1" data-allow-past="1" onchange="handleAdminLogFilterChange()" class="input-field h-9 text-xs font-semibold bg-white w-full">
      </div>

      <!-- Nút thao tác lọc -->
      <div class="lg:col-span-2 flex items-center gap-1.5">
        <button type="button" onclick="loadAdminLogs(1)" class="flex-1 h-9 px-3 rounded-lg bg-[#16A34A] hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-colors cursor-pointer">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
          </svg>
          <span>Lọc</span>
        </button>
        <button type="button" onclick="resetAdminLogFilters()" class="h-9 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#475569] font-bold text-xs flex items-center justify-center transition-colors cursor-pointer" title="Xóa bộ lọc">
          <span>Xóa lọc</span>
        </button>
      </div>
    </div>

    <!-- Hàng tìm kiếm từ khóa -->
    <div class="relative w-full pt-1">
      <input type="text" id="admin-log-search" oninput="handleAdminLogSearchDebounced()" placeholder="Tìm nhanh theo SĐT khách hàng, tên đối tượng, mã đơn đặt sân, nội dung thay đổi..." class="w-full h-9 px-3 pl-9 rounded-lg border border-[#CBD5E1] bg-white text-xs text-[#0F172A] placeholder-[#94A3B8] outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] transition-all">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="absolute left-3 top-3.5 text-slate-400">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
      </svg>
      <button type="button" id="admin-log-search-clear" onclick="clearAdminLogSearch()" class="hidden absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold p-1 cursor-pointer">
        ✕
      </button>
    </div>

    <!-- Chú thích nhóm màu hành động (Legend) -->
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-[#64748B] pt-2 border-t border-slate-100">
      <span class="font-bold text-[#0F172A] flex items-center gap-1">
        <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
        </svg>
        Quy ước màu:
      </span>
      <span class="inline-flex items-center gap-1.5 font-medium bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200"><span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Tạo / Duyệt</span>
      <span class="inline-flex items-center gap-1.5 font-medium bg-rose-50 text-rose-800 px-2 py-0.5 rounded border border-rose-200"><span class="w-2 h-2 rounded-full bg-rose-500 inline-block"></span> Xóa / Hủy / Chi tiền</span>
      <span class="inline-flex items-center gap-1.5 font-medium bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200"><span class="w-2 h-2 rounded-full bg-blue-500 inline-block"></span> Cập nhật</span>
      <span class="inline-flex items-center gap-1.5 font-medium bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200"><span class="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> Cảnh báo</span>
      <span class="inline-flex items-center gap-1.5 font-medium bg-purple-50 text-purple-800 px-2 py-0.5 rounded border border-purple-200"><span class="w-2 h-2 rounded-full bg-purple-500 inline-block"></span> Tiền quầy</span>
      <span class="inline-flex items-center gap-1.5 font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200"><span class="w-2 h-2 rounded-full bg-slate-400 inline-block"></span> Tự động</span>
    </div>
  </div>

  <!-- 3. Bảng Dữ Liệu & 4 Trạng Thái (UI Card) -->
  <div class="ui-card overflow-hidden">
    <!-- State 1: Loading Skeleton -->
    <div id="admin-log-loading" class="p-6 space-y-3">
      <div class="animate-pulse space-y-3">
        <div class="h-4 bg-slate-200 rounded w-1/4"></div>
        <div class="space-y-2 pt-2">
          <div class="h-10 bg-slate-100 rounded-lg w-full"></div>
          <div class="h-10 bg-slate-100 rounded-lg w-full"></div>
          <div class="h-10 bg-slate-100 rounded-lg w-full"></div>
          <div class="h-10 bg-slate-100 rounded-lg w-full"></div>
          <div class="h-10 bg-slate-100 rounded-lg w-full"></div>
        </div>
      </div>
    </div>

    <!-- State 2: Error Alert -->
    <div id="admin-log-error" class="hidden p-8 text-center space-y-3">
      <div class="w-12 h-12 mx-auto rounded-full bg-red-100 text-red-600 flex items-center justify-center">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"/></svg>
      </div>
      <div>
        <h4 class="font-heading font-bold text-sm text-[#0F172A]">Không thể tải nhật ký hệ thống</h4>
        <p id="admin-log-error-msg" class="text-xs text-red-600 mt-1">Đã xảy ra lỗi kết nối máy chủ.</p>
      </div>
      <button type="button" onclick="loadAdminLogs(currentLogPage || 1)" class="btn-sm btn-primary inline-flex items-center gap-1.5 font-bold cursor-pointer">
        <span>Thử lại</span>
      </button>
    </div>

    <!-- State 3: Empty State -->
    <div id="admin-log-empty" class="hidden p-12 text-center space-y-3">
      <div class="w-14 h-14 mx-auto rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center">
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
      </div>
      <div class="space-y-1">
        <h4 class="font-heading font-bold text-sm text-[#0F172A]">Chưa có bản ghi nhật ký nào</h4>
        <p class="text-xs text-[#64748B] max-w-md mx-auto">
          Không tìm thấy thao tác nào khớp với bộ lọc hiện tại. Thử nới rộng thời gian hoặc xóa từ khóa tìm kiếm.
        </p>
      </div>
      <button type="button" onclick="resetAdminLogFilters()" class="btn-sm btn-secondary inline-flex items-center gap-1 text-xs cursor-pointer">
        <span>Xóa bộ lọc</span>
      </button>
    </div>

    <!-- State 4: Data Table (Success) -->
    <div id="admin-log-table-container" class="overflow-x-auto">
      <table class="w-full text-left text-xs min-w-[960px]">
        <thead class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
          <tr>
            <th class="py-3 px-4 w-52">Người thực hiện</th>
            <th class="py-3 px-4 w-[260px] min-w-[220px]">Hành động</th>
            <th class="py-3 px-4 w-32">Đối tượng</th>
            <th class="py-3 px-4 min-w-[320px]">Nội dung thay đổi (Cũ → Mới)</th>
            <th class="py-3 px-4 w-44 text-right whitespace-nowrap">Thời gian</th>
          </tr>
        </thead>
        <tbody id="admin-log-tbody" class="divide-y divide-[#E2E8F0] bg-white">
          <!-- Rendered dynamically by js/admin_logs.js -->
        </tbody>
      </table>
    </div>

    <!-- 4. Pagination Footer -->
    <div id="admin-log-pagination" class="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:p-4 bg-[#F8FAFC] border-t border-[#E2E8F0] text-xs text-[#64748B]">
      <div class="flex items-center gap-2">
        <span>Hiển thị trang <strong id="admin-log-page-current" class="text-[#0F172A]">1</strong> / <strong id="admin-log-page-total" class="text-[#0F172A]">1</strong></span>
        <span>·</span>
        <span>Tổng cộng: <strong id="admin-log-total-count" class="text-[#0F172A]">0</strong> bản ghi</span>
      </div>

      <div class="flex items-center gap-2">
        <label for="admin-log-limit-select" class="text-[11px] font-semibold text-[#64748B] hidden sm:inline">Số dòng/trang:</label>
        <select id="admin-log-limit-select" onchange="handleAdminLogLimitChange(this.value)" class="h-8 px-2 rounded-lg border border-[#CBD5E1] bg-white text-xs font-semibold text-[#0F172A]">
          <option value="10">10 dòng</option>
          <option value="20" selected>20 dòng</option>
          <option value="50">50 dòng</option>
          <option value="100">100 dòng</option>
        </select>

        <div class="flex items-center gap-1">
          <button type="button" id="admin-log-first-btn" onclick="goToAdminLogPage(1)" class="h-8 px-2 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs transition-colors cursor-pointer" title="Trang đầu">
            «
          </button>
          <button type="button" id="admin-log-prev-btn" onclick="prevAdminLogPage()" class="h-8 px-3 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer">
            ‹ Trước
          </button>
          <button type="button" id="admin-log-next-btn" onclick="nextAdminLogPage()" class="h-8 px-3 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer">
            Sau ›
          </button>
          <button type="button" id="admin-log-last-btn" onclick="goToAdminLogLastPage()" class="h-8 px-2 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs transition-colors cursor-pointer" title="Trang cuối">
            »
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
