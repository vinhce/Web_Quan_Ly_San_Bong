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
        <input type="date" id="admin-log-filter-from" onchange="handleAdminLogFilterChange()" class="input-field h-9 text-xs font-semibold bg-white w-full">
      </div>

      <!-- Đến ngày -->
      <div class="lg:col-span-2 sm:col-span-1">
        <label for="admin-log-filter-to" class="block text-[11px] font-bold text-[#475569] mb-1">
          Đến ngày
        </label>
        <input type="date" id="admin-log-filter-to" onchange="handleAdminLogFilterChange()" class="input-field h-9 text-xs font-semibold bg-white w-full">
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
      <div class="w-12 h-12 mx-auto rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xl">
        ⚠️
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
      <div class="w-14 h-14 mx-auto rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center text-2xl">
        📋
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
            <th class="py-3 px-4 w-52">Người thực hiện • Thời gian</th>
            <th class="py-3 px-4 w-[260px] min-w-[220px]">Hành động</th>
            <th class="py-3 px-4 w-32">Đối tượng</th>
            <th class="py-3 px-4 min-w-[320px]">Nội dung thay đổi (Cũ → Mới)</th>
            <th class="py-3 px-4 w-36 text-right whitespace-nowrap">Địa chỉ IP</th>
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
