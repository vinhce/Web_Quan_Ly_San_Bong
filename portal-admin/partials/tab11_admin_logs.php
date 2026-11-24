<?php
/**
 * Tab 11: Nhật ký hệ thống và thao tác quản trị (Admin Audit Log)
 * Bất biến (Append-only) - Chỉ Admin được phép xem và hậu kiểm.
 */
?>
<style>
  #tab-content-logs {
    --g: #16A34A;
    --r: #DC2626;
    --y: #D97706;
    --b: #2563EB;
    --p: #7C3AED;
    --n: #475569;
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  #tab-content-logs .audit-kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }
  #tab-content-logs .audit-kpi-card {
    text-align: left;
    background: #FFFFFF;
    border: 1.5px solid #E2E8F0;
    border-radius: 14px;
    padding: 14px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    cursor: pointer;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
    min-height: 84px;
    width: 100%;
  }
  #tab-content-logs .audit-kpi-card:hover { border-color: #94A3B8; }
  #tab-content-logs .audit-kpi-card[aria-pressed="true"] {
    border-color: var(--g);
    box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.14);
    background: #F0FDF4;
  }
  #tab-content-logs .audit-kpi-card.is-alert-red {
    border-color: var(--r);
    background: #FEF2F2;
  }
  #tab-content-logs .audit-kpi-card.is-alert-red[aria-pressed="true"] {
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.18);
  }
  #tab-content-logs .audit-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    border-radius: 9999px;
    border: 1px solid #CBD5E1;
    background: #FFFFFF;
    color: #334155;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  #tab-content-logs .audit-chip[aria-pressed="true"] {
    border-color: #0F172A;
    background: #0F172A;
    color: #FFFFFF;
  }
  #tab-content-logs .audit-dot { width: 8px; height: 8px; border-radius: 9999px; display: inline-block; flex-shrink: 0; }
  #tab-content-logs .dot-TD { background: var(--g); }
  #tab-content-logs .dot-XH { background: var(--r); }
  #tab-content-logs .dot-CN { background: var(--b); }
  #tab-content-logs .dot-CB { background: var(--y); }
  #tab-content-logs .dot-TQ { background: var(--p); }
  #tab-content-logs .dot-TT { background: var(--n); }
  #tab-content-logs .audit-kpi-label-red { color: #991B1B; }
  #tab-content-logs .audit-kpi-sub-red { color: #B91C1C; }
  #tab-content-logs .audit-kpi-label-purple { color: #6B21A8; }
  #tab-content-logs .audit-search-input { padding-right: 2rem; }
  #tab-content-logs .audit-th-details { min-width: 340px; }
  #tab-content-logs #admin-log-tbody td {
    padding: 12px 16px;
    vertical-align: top;
    color: #0F172A;
    font-size: 12px;
  }
  #tab-content-logs .audit-day-divider td {
    background: #F1F5F9;
    color: #334155;
    font-weight: 800;
    font-size: 11px;
    padding: 8px 16px !important;
    border-top: 1px solid #CBD5E1;
    border-bottom: 1px solid #CBD5E1;
  }
  #tab-content-logs .audit-td-time { white-space: nowrap; }
  #tab-content-logs .audit-time-main {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-weight: 700;
    color: #0F172A;
  }
  #tab-content-logs .audit-ip {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    color: #64748B;
    margin-top: 2px;
  }
  #tab-content-logs .audit-actor-name { font-weight: 700; color: #0F172A; }
  #tab-content-logs .audit-actor-role {
    font-size: 10px;
    font-weight: 700;
    color: #64748B;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-top: 2px;
  }
  #tab-content-logs .audit-cat-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 8px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 700;
    border: 1px solid transparent;
    white-space: nowrap;
  }
  #tab-content-logs .audit-cat-td { background: #DCFCE7; color: #166534; border-color: #BBF7D0; }
  #tab-content-logs .audit-cat-xh { background: #FEE2E2; color: #991B1B; border-color: #FECACA; }
  #tab-content-logs .audit-cat-cn { background: #DBEAFE; color: #1E40AF; border-color: #BFDBFE; }
  #tab-content-logs .audit-cat-cb { background: #FEF3C7; color: #92400E; border-color: #FDE68A; }
  #tab-content-logs .audit-cat-tq { background: #F3E8FF; color: #6B21A8; border-color: #E9D5FF; }
  #tab-content-logs .audit-cat-tt { background: #F1F5F9; color: #334155; border-color: #CBD5E1; }
  #tab-content-logs .audit-action-label { font-weight: 700; color: #0F172A; margin-top: 4px; }
  #tab-content-logs .audit-data-group { font-size: 11px; color: #64748B; margin-top: 2px; }
  #tab-content-logs .audit-obj-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 4px; }
  #tab-content-logs .audit-obj-code {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 6px;
    background: #F1F5F9;
    border: 1px solid #CBD5E1;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    font-weight: 700;
    color: #0F172A;
  }
  #tab-content-logs .audit-inline-link {
    background: none;
    border: none;
    padding: 0;
    color: var(--b);
    font-size: 11px;
    font-weight: 700;
    text-decoration: underline;
    cursor: pointer;
    margin-top: 3px;
  }
  #tab-content-logs .audit-detail-summary { color: #1E293B; line-height: 1.45; }
  #tab-content-logs .audit-diff-list { margin-top: 6px; display: flex; flex-direction: column; gap: 4px; }
  #tab-content-logs .audit-diff-item {
    font-size: 11px;
    line-height: 1.4;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    padding: 3px 8px;
  }
  #tab-content-logs .audit-diff-key { font-weight: 700; color: #475569; margin-right: 4px; }
  #tab-content-logs .audit-diff-old {
    color: var(--r);
    text-decoration: line-through;
    background: #FEE2E2;
    padding: 0 4px;
    border-radius: 4px;
  }
  #tab-content-logs .audit-diff-new {
    color: #166534;
    text-decoration: none;
    font-weight: 700;
    background: #DCFCE7;
    padding: 0 4px;
    border-radius: 4px;
  }
  #tab-content-logs .audit-json-pre {
    margin-top: 6px;
    padding: 8px 10px;
    border-radius: 8px;
    background: #0F172A;
    color: #E2E8F0;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    overflow-x: auto;
    max-height: 220px;
    white-space: pre-wrap;
    word-break: break-word;
  }
  #tab-content-logs .audit-row-anomaly { background: #FEF2F2; }
  #tab-content-logs .audit-row-anomaly td:first-child { border-left: 3px solid var(--r); }
  #tab-content-logs .audit-anomaly-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 9999px;
    background: #FEE2E2;
    color: #991B1B;
    border: 1px solid #FCA5A5;
    font-size: 11px;
    font-weight: 800;
  }
  #tab-content-logs .audit-anomaly-reason { font-size: 11px; color: #B91C1C; font-weight: 600; margin-top: 3px; }
  #tab-content-logs .audit-review-done {
    margin-top: 4px;
    padding: 6px 8px;
    border-radius: 8px;
    background: #F0FDF4;
    border: 1px solid #BBF7D0;
  }
  #tab-content-logs .audit-reviewed-badge {
    display: inline-block;
    padding: 1px 7px;
    border-radius: 9999px;
    background: #DCFCE7;
    color: #166534;
    font-size: 10px;
    font-weight: 800;
  }
  #tab-content-logs .audit-review-note { font-size: 11px; color: #0F172A; margin-top: 4px; word-break: break-word; }
  #tab-content-logs .audit-review-meta { font-size: 10px; color: #64748B; margin-top: 2px; }
  #tab-content-logs .audit-review-editor { margin-top: 6px; display: flex; flex-direction: column; gap: 6px; }
  #tab-content-logs .audit-review-textarea {
    width: 100%;
    border: 1px solid #CBD5E1;
    border-radius: 8px;
    padding: 6px 8px;
    font-size: 11px;
    background: #FFFFFF;
    color: #0F172A;
  }
  #tab-content-logs .audit-review-actions { display: flex; flex-wrap: wrap; gap: 6px; }
  #tab-content-logs .audit-btn-save {
    padding: 5px 10px;
    border-radius: 6px;
    background: var(--g);
    color: #FFFFFF;
    font-size: 11px;
    font-weight: 700;
    border: none;
    cursor: pointer;
  }
  #tab-content-logs .audit-btn-cancel {
    padding: 5px 10px;
    border-radius: 6px;
    background: #F1F5F9;
    color: #475569;
    font-size: 11px;
    font-weight: 700;
    border: 1px solid #CBD5E1;
    cursor: pointer;
  }
  #tab-content-logs .audit-btn-mark {
    padding: 5px 10px;
    border-radius: 8px;
    background: #FFFFFF;
    color: #0F172A;
    font-size: 11px;
    font-weight: 700;
    border: 1px solid #CBD5E1;
    cursor: pointer;
  }
  #tab-content-logs .audit-btn-mark:hover { background: #F8FAFC; border-color: #94A3B8; }
  #tab-content-logs .audit-page-btn {
    min-width: 32px;
    height: 32px;
    padding: 0 8px;
    border-radius: 8px;
    border: 1px solid #CBD5E1;
    background: #FFFFFF;
    color: #334155;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }
  #tab-content-logs .audit-page-btn:hover { background: #F1F5F9; }
  #tab-content-logs .audit-page-btn.active {
    background: #0F172A;
    border-color: #0F172A;
    color: #FFFFFF;
  }
  #tab-content-logs .audit-banner-slot {
    min-height: 36px;
    display: flex;
    align-items: center;
  }
  #tab-content-logs .audit-dp-slot input[type="date"][data-vn-datepicker="1"]:not([data-vn-datepicker-init="1"]) {
    opacity: 0;
    pointer-events: none;
  }
  #tab-content-logs .audit-dp-slot .vn-dp-text {
    height: 36px;
    min-height: 36px;
    font-size: 12px;
    padding-left: 10px;
    padding-right: 38px !important;
  }
  #tab-content-logs .audit-dp-slot .vn-dp-btn {
    width: 38px;
    min-height: 36px;
  }
  @media (max-width: 1100px) {
    #tab-content-logs .audit-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 900px) {
    #tab-content-logs .audit-filter-grid {
      display: flex !important;
      flex-direction: column !important;
      align-items: stretch !important;
    }
    #tab-content-logs #admin-log-filter-staff,
    #tab-content-logs #admin-log-filter-action,
    #tab-content-logs #admin-log-filter-datagroup,
    #tab-content-logs #admin-log-search,
    #tab-content-logs .audit-dp-slot .vn-dp-text,
    #tab-content-logs .audit-dp-slot .vn-dp-btn,
    #tab-content-logs .audit-touch-btn,
    #tab-content-logs .audit-chip,
    #tab-content-logs .audit-page-btn,
    #tab-content-logs .audit-btn-mark,
    #tab-content-logs .audit-btn-save,
    #tab-content-logs .audit-btn-cancel {
      min-height: 44px;
    }
  }
  @media (max-width: 560px) {
    #tab-content-logs .audit-kpi-grid { grid-template-columns: minmax(0, 1fr); }
  }
</style>

<div id="tab-content-logs" class="space-y-4 hidden">
  <!-- 1. Header Card -->
  <div class="ui-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div class="space-y-1 min-w-0">
      <div class="flex flex-wrap items-center gap-2">
        <span class="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-[#16A34A] flex items-center justify-center shrink-0">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </span>
        <h3 class="font-heading font-extrabold text-base sm:text-lg text-[#0F172A]">Nhật ký hệ thống và thao tác quản trị</h3>
        <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold inline-flex items-center gap-1">
          <svg class="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
          Chỉ ghi thêm
        </span>
      </div>
      <p class="text-xs text-[#64748B]">
        Theo dõi bất biến mọi thay đổi giá sân, voucher, điểm hội viên, chốt ca, hoàn cọc và phân quyền bảo mật theo thời gian thực.
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-2 shrink-0">
      <span id="admin-log-updated-at" class="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 whitespace-nowrap">
        Cập nhật --:--
      </span>
      <button type="button" id="admin-log-export-csv-btn" onclick="exportAdminLogsCsv()" class="audit-touch-btn h-9 px-3 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/>
        </svg>
        <span>Xuất CSV</span>
      </button>
      <button type="button" id="admin-log-refresh-btn" onclick="refreshAdminLogsAll()" class="audit-touch-btn h-9 px-3 rounded-lg bg-white border border-[#CBD5E1] hover:bg-slate-50 text-[#0F172A] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm" title="Tải lại nhật ký">
        <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        <span>Làm mới</span>
      </button>
    </div>
  </div>

  <!-- 2. 4 Thẻ KPI (<button aria-pressed>) -->
  <div id="admin-log-kpi-grid" class="audit-kpi-grid">
    <button type="button" id="audit-kpi-total" data-quick="" aria-pressed="true" onclick="toggleAuditQuickFilter('')" class="audit-kpi-card">
      <div class="min-w-0">
        <div class="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Tổng thao tác trong kỳ</div>
        <div class="mt-1 flex items-baseline gap-1.5">
          <span id="audit-kpi-total-val" class="font-heading font-extrabold text-xl text-[#0F172A]">0</span>
          <span class="text-xs font-semibold text-[#64748B]">thao tác</span>
        </div>
        <div id="audit-kpi-total-sub" class="text-[11px] text-[#64748B] mt-1 truncate">Hiển thị toàn bộ bản ghi</div>
      </div>
      <span class="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-[#16A34A] flex items-center justify-center shrink-0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect width="6" height="4" x="9" y="3" rx="1"/><path d="M9 12h6"/><path d="M9 16h6"/></svg>
      </span>
    </button>

    <button type="button" id="audit-kpi-anomaly" data-quick="unreviewed_anomaly" aria-pressed="false" onclick="toggleAuditQuickFilter('unreviewed_anomaly')" class="audit-kpi-card">
      <div class="min-w-0">
        <div class="text-[11px] font-bold audit-kpi-label-red uppercase tracking-wider">Bất thường chưa hậu kiểm</div>
        <div class="mt-1 flex items-baseline gap-1.5">
          <span id="audit-kpi-anomaly-val" class="font-heading font-extrabold text-xl text-[#DC2626]">0</span>
          <span class="text-xs font-semibold audit-kpi-label-red">cảnh báo</span>
        </div>
        <div class="text-[11px] audit-kpi-sub-red font-semibold mt-1 truncate">Bấm để lọc ngay các dòng lệch quỹ / điểm</div>
      </div>
      <span class="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-[#DC2626] flex items-center justify-center shrink-0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
      </span>
    </button>

    <button type="button" id="audit-kpi-finance" data-quick="finance" aria-pressed="false" onclick="toggleAuditQuickFilter('finance')" class="audit-kpi-card">
      <div class="min-w-0">
        <div class="text-[11px] font-bold audit-kpi-label-purple uppercase tracking-wider">Tiền &amp; đặt cọc / Tiền quầy</div>
        <div class="mt-1 flex items-baseline gap-1.5">
          <span id="audit-kpi-finance-val" class="font-heading font-extrabold text-xl text-[#7C3AED]">0</span>
          <span class="text-xs font-semibold text-[#64748B]">bản ghi</span>
        </div>
        <div class="text-[11px] text-[#64748B] mt-1 truncate">Thu tiền, cọc VietQR, chi phí &amp; đối soát</div>
      </div>
      <span class="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 text-[#7C3AED] flex items-center justify-center shrink-0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
      </span>
    </button>

    <button type="button" id="audit-kpi-shifts" data-quick="shifts" aria-pressed="false" onclick="toggleAuditQuickFilter('shifts')" class="audit-kpi-card">
      <div class="min-w-0">
        <div class="text-[11px] font-bold text-[#1E40AF] uppercase tracking-wider">Ca trực có thao tác</div>
        <div class="mt-1 flex items-baseline gap-1.5">
          <span id="audit-kpi-shifts-val" class="font-heading font-extrabold text-xl text-[#0F172A]">0</span>
          <span class="text-xs font-semibold text-[#64748B]">ca trực</span>
        </div>
        <div id="audit-kpi-shifts-sub" class="text-[11px] font-semibold text-[#475569] mt-1 truncate">Đang kiểm tra trạng thái ca...</div>
      </div>
      <span class="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-[#2563EB] flex items-center justify-center shrink-0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      </span>
    </button>
  </div>

  <!-- 3. Bộ lọc (Filters Card) -->
  <div class="ui-card p-4 sm:p-5 space-y-3">
    <div class="audit-filter-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
      <div class="lg:col-span-3">
        <label for="admin-log-filter-staff" class="block text-[11px] font-bold text-[#475569] mb-1">Nhân sự thực hiện</label>
        <select id="admin-log-filter-staff" onchange="handleAdminLogFilterChange()" class="input-field h-9 text-xs font-semibold bg-white w-full">
          <option value="">Tất cả nhân sự</option>
        </select>
      </div>

      <div class="lg:col-span-3">
        <label for="admin-log-filter-action" class="block text-[11px] font-bold text-[#475569] mb-1">Loại hành động</label>
        <select id="admin-log-filter-action" onchange="handleAdminLogFilterChange()" class="input-field h-9 text-xs font-semibold bg-white w-full">
          <option value="">Tất cả loại hành động</option>
        </select>
      </div>

      <div class="lg:col-span-2">
        <label for="admin-log-filter-datagroup" class="block text-[11px] font-bold text-[#475569] mb-1">Nhóm dữ liệu</label>
        <select id="admin-log-filter-datagroup" onchange="handleAdminLogFilterChange()" class="input-field h-9 text-xs font-semibold bg-white w-full">
          <option value="">Tất cả nhóm dữ liệu</option>
          <option value="Ca trực">Ca trực</option>
          <option value="Tiền & đặt cọc">Tiền &amp; đặt cọc</option>
          <option value="Hội viên & điểm">Hội viên &amp; điểm</option>
          <option value="Giá & voucher">Giá &amp; voucher</option>
          <option value="Sân & Lịch đặt">Sân &amp; Lịch đặt</option>
          <option value="Cài đặt">Cài đặt</option>
          <option value="Nhân sự & Bảo mật">Nhân sự &amp; Bảo mật</option>
          <option value="Khác">Khác</option>
        </select>
      </div>

      <div class="lg:col-span-2 audit-dp-slot">
        <label for="admin-log-filter-from" class="block text-[11px] font-bold text-[#475569] mb-1">Từ ngày</label>
        <input type="date" id="admin-log-filter-from" data-vn-datepicker="1" data-allow-past="1" onchange="handleAdminLogFilterChange()" class="input-field h-9 text-xs font-semibold bg-white w-full">
      </div>

      <div class="lg:col-span-2 audit-dp-slot">
        <label for="admin-log-filter-to" class="block text-[11px] font-bold text-[#475569] mb-1">Đến ngày</label>
        <input type="date" id="admin-log-filter-to" data-vn-datepicker="1" data-allow-past="1" onchange="handleAdminLogFilterChange()" class="input-field h-9 text-xs font-semibold bg-white w-full">
      </div>
    </div>

    <!-- Hàng tìm kiếm + nút Lọc / Xóa lọc -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
      <div class="relative flex-1">
        <input type="text" id="admin-log-search" oninput="handleAdminLogSearchDebounced()" placeholder="Tìm theo SĐT, mã đơn, nội dung hoặc mã nhóm (TD, XH, CN, CB, TQ, TT, TD+CN)..." class="audit-search-input w-full h-10 px-3 pl-9 rounded-lg border border-[#CBD5E1] bg-white text-xs text-[#0F172A] placeholder-[#94A3B8] outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="absolute left-3 top-3 text-slate-400" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
        </svg>
        <button type="button" id="admin-log-search-clear" onclick="clearAdminLogSearch()" class="hidden absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1 cursor-pointer" aria-label="Xóa từ khóa">✕</button>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button type="button" onclick="loadAdminLogs(1)" class="audit-touch-btn h-10 px-4 rounded-lg bg-[#16A34A] hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-colors cursor-pointer">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
          <span>Lọc</span>
        </button>
        <button type="button" id="admin-log-reset-btn" onclick="resetAdminLogFilters()" class="audit-touch-btn h-10 px-3.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#475569] font-bold text-xs flex items-center justify-center transition-colors cursor-pointer">
          <span>Xóa lọc</span>
        </button>
      </div>
    </div>

    <!-- 6 Chip nhóm chọn nhiều -->
    <div id="admin-log-category-chips" class="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
      <span class="text-[11px] font-bold text-[#0F172A] mr-1">Nhóm hành động:</span>
      <button type="button" class="audit-chip" data-cat="TD" aria-pressed="false" onclick="toggleAuditCategoryChip('TD')"><span class="audit-dot dot-TD"></span><span>Tạo / Duyệt</span><span class="opacity-75 font-mono">(TD)</span></button>
      <button type="button" class="audit-chip" data-cat="XH" aria-pressed="false" onclick="toggleAuditCategoryChip('XH')"><span class="audit-dot dot-XH"></span><span>Xóa / Hủy / Chi tiền</span><span class="opacity-75 font-mono">(XH)</span></button>
      <button type="button" class="audit-chip" data-cat="CN" aria-pressed="false" onclick="toggleAuditCategoryChip('CN')"><span class="audit-dot dot-CN"></span><span>Cập nhật</span><span class="opacity-75 font-mono">(CN)</span></button>
      <button type="button" class="audit-chip" data-cat="CB" aria-pressed="false" onclick="toggleAuditCategoryChip('CB')"><span class="audit-dot dot-CB"></span><span>Cảnh báo</span><span class="opacity-75 font-mono">(CB)</span></button>
      <button type="button" class="audit-chip" data-cat="TQ" aria-pressed="false" onclick="toggleAuditCategoryChip('TQ')"><span class="audit-dot dot-TQ"></span><span>Tiền quầy</span><span class="opacity-75 font-mono">(TQ)</span></button>
      <button type="button" class="audit-chip" data-cat="TT" aria-pressed="false" onclick="toggleAuditCategoryChip('TT')"><span class="audit-dot dot-TT"></span><span>Tự động</span><span class="opacity-75 font-mono">(TT)</span></button>
    </div>
  </div>

  <!-- Banner thông báo có bản ghi mới (không nhảy layout) -->
  <div id="admin-log-new-banner-slot" class="audit-banner-slot">
    <div id="admin-log-live-status" class="text-[11px] text-[#64748B]">Tự động kiểm tra bản ghi mới mỗi 60 giây khi đang mở tab.</div>
    <button type="button" id="admin-log-new-banner" onclick="refreshAdminLogsAll()" class="hidden w-full py-2 px-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer">
      <span class="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse"></span>
      <span id="admin-log-new-banner-text">Có 0 bản ghi mới - Bấm để tải</span>
    </button>
  </div>

  <!-- 4. Bảng Dữ Liệu & 4 Trạng Thái -->
  <div class="ui-card overflow-hidden">
    <!-- Loading Skeleton -->
    <div id="admin-log-loading" class="p-6 space-y-3">
      <div class="animate-pulse space-y-3">
        <div class="h-4 bg-slate-200 rounded w-1/4"></div>
        <div class="space-y-2 pt-2">
          <div class="h-12 bg-slate-100 rounded-lg w-full"></div>
          <div class="h-12 bg-slate-100 rounded-lg w-full"></div>
          <div class="h-12 bg-slate-100 rounded-lg w-full"></div>
          <div class="h-12 bg-slate-100 rounded-lg w-full"></div>
          <div class="h-12 bg-slate-100 rounded-lg w-full"></div>
        </div>
      </div>
    </div>

    <!-- Error Alert -->
    <div id="admin-log-error" class="hidden p-8 text-center space-y-3">
      <div class="w-12 h-12 mx-auto rounded-full bg-red-100 text-red-600 flex items-center justify-center">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"/></svg>
      </div>
      <div>
        <h4 class="font-heading font-bold text-sm text-[#0F172A]">Không thể tải nhật ký hệ thống</h4>
        <p id="admin-log-error-msg" class="text-xs text-red-600 mt-1">Đã xảy ra lỗi kết nối máy chủ.</p>
      </div>
      <button type="button" onclick="loadAdminLogs(adminLogState?.page || 1)" class="btn-sm btn-primary inline-flex items-center gap-1.5 font-bold cursor-pointer">
        <span>Thử lại</span>
      </button>
    </div>

    <!-- Empty State -->
    <div id="admin-log-empty" class="hidden p-12 text-center space-y-3">
      <div class="w-14 h-14 mx-auto rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center">
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
      </div>
      <div class="space-y-1">
        <h4 class="font-heading font-bold text-sm text-[#0F172A]">Chưa có bản ghi nhật ký nào</h4>
        <p class="text-xs text-[#64748B] max-w-md mx-auto">Không tìm thấy thao tác nào khớp với bộ lọc hiện tại. Thử nới rộng khoảng ngày hoặc xóa lọc.</p>
      </div>
      <button type="button" onclick="resetAdminLogFilters()" class="btn-sm btn-secondary inline-flex items-center gap-1 text-xs cursor-pointer">
        <span>Xóa bộ lọc</span>
      </button>
    </div>

    <!-- Data Table (5 Columns) -->
    <div id="admin-log-table-container" class="overflow-x-auto">
      <table class="w-full text-left text-xs min-w-[960px]">
        <thead id="admin-log-thead" class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
          <tr>
            <th class="py-3 px-4 w-40 whitespace-nowrap">Thời gian</th>
            <th class="py-3 px-4 w-44">Người thực hiện</th>
            <th class="py-3 px-4 w-56">Hành động</th>
            <th class="py-3 px-4 audit-th-details">Đối tượng &amp; Thay đổi (Cũ → Mới)</th>
            <th class="py-3 px-4 w-64">Bất thường / Hậu kiểm</th>
          </tr>
        </thead>
        <tbody id="admin-log-tbody" class="divide-y divide-[#E2E8F0] bg-white"></tbody>
      </table>
    </div>

    <!-- Pagination Footer -->
    <div id="admin-log-pagination" class="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:p-4 bg-[#F8FAFC] border-t border-[#E2E8F0] text-xs text-[#64748B]">
      <div class="flex flex-wrap items-center gap-2">
        <span id="admin-log-range-summary" class="font-semibold text-[#0F172A]">Hiển thị 0–0 / 0 bản ghi</span>
        <span>·</span>
        <span>Trang <strong id="admin-log-page-current" class="text-[#0F172A]">1</strong> / <strong id="admin-log-page-total" class="text-[#0F172A]">1</strong></span>
        <span class="hidden">Tổng cộng: <strong id="admin-log-total-count">0</strong></span>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <label for="admin-log-limit-select" class="text-[11px] font-semibold text-[#64748B]">Số dòng/trang:</label>
        <select id="admin-log-limit-select" onchange="handleAdminLogLimitChange(this.value)" class="h-8 px-2 rounded-lg border border-[#CBD5E1] bg-white text-xs font-semibold text-[#0F172A]">
          <option value="10">10 dòng</option>
          <option value="25" selected>25 dòng</option>
          <option value="50">50 dòng</option>
          <option value="100">100 dòng</option>
        </select>

        <div class="flex items-center gap-1">
          <button type="button" id="admin-log-prev-btn" onclick="prevAdminLogPage()" class="audit-touch-btn h-8 px-3 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs cursor-pointer">
            ‹ Trước
          </button>
          <div id="admin-log-page-numbers" class="flex items-center gap-1"></div>
          <button type="button" id="admin-log-next-btn" onclick="nextAdminLogPage()" class="audit-touch-btn h-8 px-3 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs cursor-pointer">
            Sau ›
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
