<?php
/**
 * Tab 11: Nhật ký hệ thống & thao tác quản trị (Admin Only)
 * Giao diện CSS Grid 5 cột, giữ thanh "Quy ước màu:" 6 mã nhóm hiển thị
 * (TD, XHC, CN, CB, TQ, TĐ; mã DB TD/XH/CN/CB/TQ/TT) cùng 4 thẻ KPI lọc nhanh,
 * bộ lọc đa chiều, phát hiện 9 luật bất thường và quy trình hậu kiểm trực tiếp.
 */
?>
<style>
  #tab-content-logs {
    --bg:#f8fafc; --card:#ffffff; --ink:#0f172a; --mut:#64748b; --line:#e8edf3;
    --g:#16a34a; --gs:#dcfce7; --gd:#047857; --gb:#bbf7d0;
    --r:#dc2626; --rs:#fee2e2; --rb:#fecaca;
    --y:#b45309; --ys:#fef3c7; --yb:#fde68a;
    --b:#2563eb; --bs:#dbeafe; --bb:#bfdbfe;
    --p:#7c3aed; --ps:#ede9fe; --pb:#ddd6fe;
    --n:#475569; --ns:#f1f5f9; --nb:#cbd5e1;
    color: var(--ink);
    font: 13px/20px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  #tab-content-logs *, #tab-content-logs *::before, #tab-content-logs *::after { box-sizing: border-box; }
  #tab-content-logs :focus-visible { outline: 2px solid var(--g); outline-offset: 2px; }
  #tab-content-logs .audit-wrap { max-width: 100%; overflow-x: hidden; }
  #tab-content-logs .audit-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
  #tab-content-logs .audit-head h2 { font-size: 20px; line-height: 28px; font-weight: 700; color: var(--ink); margin: 0; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  #tab-content-logs .audit-head p { margin: 2px 0 0; color: var(--mut); font-size: 13px; }
  #tab-content-logs .audit-acts { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  #tab-content-logs .audit-cnt { color: var(--mut); font-size: 12px; font-variant-numeric: tabular-nums; margin-right: 4px; }
  #tab-content-logs .audit-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; font: inherit; font-weight: 600; height: 34px; padding: 0 12px; border: 1px solid #cbd5e1; background: var(--card); color: var(--ink); border-radius: 8px; cursor: pointer; white-space: nowrap; transition: background .15s, border-color .15s; }
  #tab-content-logs .audit-btn:hover:not(:disabled) { background: var(--bg); border-color: #94a3b8; }
  #tab-content-logs .audit-btn:disabled { opacity: .45; cursor: not-allowed; }
  #tab-content-logs .audit-btn.is-primary { background: var(--g); border-color: var(--g); color: #fff; }
  #tab-content-logs .audit-btn.is-primary:hover:not(:disabled) { background: #15803d; border-color: #15803d; }

  #tab-content-logs .audit-kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 12px; }
  #tab-content-logs .audit-kpi-card { text-align: left; background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; cursor: pointer; min-width: 0; transition: border-color .15s, box-shadow .15s, background .15s; }
  #tab-content-logs .audit-kpi-card:hover { border-color: #94a3b8; }
  #tab-content-logs .audit-kpi-card[aria-pressed="true"] { border-color: var(--g); box-shadow: 0 0 0 2px rgba(22,163,74,.14); background: #f0fdf4; }
  #tab-content-logs .audit-kpi-card.is-alert-red { border-color: var(--rb); background: #fef2f2; }
  #tab-content-logs .audit-kpi-card.is-alert-red[aria-pressed="true"] { border-color: var(--r); box-shadow: 0 0 0 2px rgba(220,38,38,.18); }
  #tab-content-logs .audit-kpi-lbl { font-size: 11px; font-weight: 700; color: var(--mut); text-transform: uppercase; letter-spacing: .02em; }
  #tab-content-logs .audit-kpi-val { margin-top: 4px; font-size: 22px; line-height: 28px; font-weight: 700; color: var(--ink); font-variant-numeric: tabular-nums; }
  #tab-content-logs .audit-kpi-sub { margin-top: 2px; font-size: 11.5px; color: var(--mut); overflow-wrap: anywhere; }
  #tab-content-logs .audit-kpi-label-red { color: #991b1b; }
  #tab-content-logs .audit-kpi-sub-red { color: #b91c1c; font-weight: 600; }
  #tab-content-logs .audit-kpi-label-purple { color: #6b21a8; }

  #tab-content-logs .audit-fbox { background: var(--card); border: 1px solid var(--line); border-radius: 10px; margin-bottom: 10px; }
  #tab-content-logs .audit-frow { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; padding: 10px 12px; }
  #tab-content-logs .audit-qwrap { position: relative; flex: 1 1 145px; min-width: 135px; display: flex; align-items: center; }
  #tab-content-logs .audit-qicon { position: absolute; left: 10px; color: #94a3b8; pointer-events: none; display: inline-flex; }
  #tab-content-logs .audit-search-input { width: 100%; height: 34px; font: inherit; padding: 0 28px 0 30px; border: 1px solid #cbd5e1; border-radius: 8px; background: var(--card); color: var(--ink); }
  #tab-content-logs .audit-search-clear { position: absolute; right: 6px; width: 24px; height: 24px; border: 0; background: transparent; color: #94a3b8; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
  #tab-content-logs .audit-search-clear:hover { color: var(--ink); background: var(--bg); }
  #tab-content-logs .audit-sel { font: inherit; height: 34px; padding: 0 8px; border: 1px solid #cbd5e1; border-radius: 8px; background: var(--card); color: var(--ink); width: 128px; }
  #tab-content-logs .audit-sel-act { width: 152px; }
  #tab-content-logs .audit-dr { display: flex; align-items: center; gap: 2px; height: 34px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 4px; background: var(--card); flex-shrink: 0; }
  #tab-content-logs .audit-dr .vn-dp-wrap { width: 112px; display: inline-block; flex-shrink: 0; }
  #tab-content-logs .audit-dr-date, #tab-content-logs .audit-dr .vn-dp-text { border: 0; background: transparent; font: inherit; font-size: 12.5px; color: var(--ink); width: 100%; height: 30px; min-height: 30px; padding: 0 26px 0 6px !important; outline: none; box-shadow: none; border-radius: 6px; }
  #tab-content-logs .audit-dr .vn-dp-btn { width: 26px; min-height: 30px; height: 30px; }
  #tab-content-logs .audit-dr .vn-dp-btn svg { width: 14px; height: 14px; }
  #tab-content-logs .audit-dr span { color: var(--mut); font-size: 12px; padding: 0 1px; }

  #tab-content-logs .audit-chips { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; padding: 8px 12px 10px; border-top: 1px solid var(--line); }
  #tab-content-logs .audit-legend-lbl { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; color: var(--ink); margin-right: 2px; }
  #tab-content-logs .t-TD { --c:#15803d; --dot:var(--g); --cs:var(--gs); --cb:var(--gb); }
  #tab-content-logs .t-XH { --c:#b91c1c; --dot:var(--r); --cs:var(--rs); --cb:var(--rb); }
  #tab-content-logs .t-CN { --c:#1d4ed8; --dot:var(--b); --cs:var(--bs); --cb:var(--bb); }
  #tab-content-logs .t-CB { --c:var(--y); --dot:#d97706; --cs:var(--ys); --cb:var(--yb); }
  #tab-content-logs .t-TQ { --c:#6d28d9; --dot:var(--p); --cs:var(--ps); --cb:var(--pb); }
  #tab-content-logs .t-TT { --c:#334155; --dot:#94a3b8; --cs:var(--ns); --cb:var(--nb); }
  #tab-content-logs .audit-chip { display: inline-flex; gap: 6px; align-items: center; min-height: 28px; padding: 3px 10px; font: inherit; font-size: 12px; font-weight: 500; border: 1px solid var(--cb, var(--line)); border-radius: 7px; background: var(--cs, var(--card)); color: var(--c, var(--ink)); cursor: pointer; transition: border-color .15s, box-shadow .15s; }
  #tab-content-logs .audit-chip:hover { border-color: var(--c); }
  #tab-content-logs .audit-chip[aria-pressed="true"] { border-color: var(--c); box-shadow: 0 0 0 2px color-mix(in srgb, var(--c) 18%, transparent); font-weight: 700; }
  #tab-content-logs .audit-dot { width: 8px; height: 8px; border-radius: 9999px; background: var(--dot, var(--mut)); display: inline-block; flex-shrink: 0; }
  #tab-content-logs .audit-chip-code { font-size: 11px; opacity: .78; font-weight: 700; }

  #tab-content-logs .audit-banner-slot { min-height: 0; margin-bottom: 10px; }
  #tab-content-logs .audit-new-banner { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 8px 12px; border-radius: 8px; background: var(--bs); border: 1px solid var(--bb); color: #1e40af; font-size: 12.5px; font-weight: 600; }
  #tab-content-logs .hidden { display: none !important; }

  #tab-content-logs .audit-list { background: var(--card); border: 1px solid var(--line); border-radius: 10px; overflow: clip; }
  #tab-content-logs .audit-th, #tab-content-logs .audit-row { display: grid; grid-template-columns: 165px 195px 145px minmax(0, 1fr) 115px; gap: 16px; padding: 10px 16px; align-items: start; }
  #tab-content-logs .audit-th { position: sticky; top: 0; z-index: 15; background: var(--card); color: var(--mut); font-size: 12.5px; font-weight: 600; border-bottom: 1px solid var(--line); }
  #tab-content-logs .audit-th > div:last-child, #tab-content-logs .audit-tm { text-align: right; }
  #tab-content-logs .audit-day { background: var(--bg); color: var(--mut); font-size: 12px; font-weight: 600; padding: 4px 16px; border-bottom: 1px solid var(--line); }
  #tab-content-logs .audit-row { border-bottom: 1px solid var(--line); transition: background .12s; }
  #tab-content-logs .audit-row:hover { background: var(--bg); }
  #tab-content-logs .audit-row.is-anomaly-row { background: #fffbeb; }
  #tab-content-logs .audit-row.is-anomaly-row:hover { background: #fef3c7; }
  #tab-content-logs .audit-row > div { min-width: 0; }
  #tab-content-logs .audit-s { display: block; color: var(--mut); font-size: 12px; margin-top: 2px; overflow-wrap: anywhere; }
  #tab-content-logs .audit-id { color: var(--mut); font-weight: 600; margin-right: 6px; font-variant-numeric: tabular-nums; }
  #tab-content-logs .audit-actor-name { font-weight: 700; color: var(--ink); overflow-wrap: anywhere; }
  #tab-content-logs .audit-role { display: inline-block; font-size: 11px; font-weight: 600; border-radius: 4px; padding: 0 6px; line-height: 18px; }
  #tab-content-logs .audit-role.role-admin { background: var(--rs); color: var(--r); }
  #tab-content-logs .audit-role.role-manager { background: var(--ps); color: var(--p); }
  #tab-content-logs .audit-role.role-staff { background: var(--bs); color: var(--b); }
  #tab-content-logs .audit-role.role-system { background: var(--ns); color: var(--n); }
  #tab-content-logs .audit-badge { display: inline-block; padding: 1px 9px; border-radius: 6px; font-size: 12px; font-weight: 600; line-height: 20px; background: var(--cs, var(--ns)); color: var(--c, var(--n)); max-width: 100%; overflow-wrap: anywhere; }
  #tab-content-logs .audit-anomaly-pill { display: inline-flex; align-items: center; gap: 3px; margin-top: 4px; padding: 0 7px; border-radius: 5px; font-size: 11px; font-weight: 700; line-height: 18px; background: var(--rs); color: var(--r); border: 1px solid var(--rb); }
  #tab-content-logs .audit-code { display: inline-block; font: 600 12.5px/18px ui-monospace, Menlo, Consolas, monospace; color: var(--ink); overflow-wrap: anywhere; }
  #tab-content-logs .audit-chg > div { overflow-wrap: anywhere; }
  #tab-content-logs .audit-k { color: var(--mut); }
  #tab-content-logs .audit-chg s { text-decoration: none; font-weight: 600; color: var(--r); }
  #tab-content-logs .audit-chg b { font-weight: 600; color: var(--gd); }
  #tab-content-logs .audit-chg b.bad { color: var(--r); }
  #tab-content-logs .audit-more { display: inline-block; font: inherit; font-size: 12px; font-weight: 600; color: var(--g); background: none; border: 0; padding: 2px 0; margin-top: 2px; cursor: pointer; }
  #tab-content-logs .audit-more:hover { text-decoration: underline; }
  #tab-content-logs .audit-tm b { font-weight: 700; color: var(--ink); font-variant-numeric: tabular-nums; }

  #tab-content-logs .audit-review-wrap { margin-top: 6px; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
  #tab-content-logs .audit-reviewed-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 700; color: var(--gd); background: var(--gs); border: 1px solid var(--gb); border-radius: 6px; padding: 1px 8px; }
  #tab-content-logs .audit-review-note { font-size: 12px; color: #334155; overflow-wrap: anywhere; }
  #tab-content-logs .audit-review-btn { font: inherit; font-size: 11.5px; font-weight: 700; color: var(--y); background: var(--ys); border: 1px solid var(--yb); border-radius: 6px; padding: 2px 9px; cursor: pointer; }
  #tab-content-logs .audit-review-btn:hover { border-color: var(--y); }
  #tab-content-logs .audit-review-form { margin-top: 6px; padding: 8px; border-radius: 8px; background: #f8fafc; border: 1px solid var(--line); display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
  #tab-content-logs .audit-review-input { flex: 1 1 200px; height: 30px; font: inherit; font-size: 12px; padding: 0 8px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; }
  #tab-content-logs .audit-detail-drawer { margin-top: 6px; padding: 8px 10px; border-radius: 8px; background: #f8fafc; border: 1px solid var(--line); font-size: 11.5px; color: #334155; overflow-wrap: anywhere; }
  #tab-content-logs .audit-detail-pre { margin: 4px 0 0; padding: 6px 8px; border-radius: 6px; background: #fff; border: 1px solid var(--line); font: 11px/16px ui-monospace, Menlo, Consolas, monospace; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 180px; overflow-y: auto; }

  #tab-content-logs .audit-state { padding: 40px 16px; text-align: center; color: var(--mut); }
  #tab-content-logs .audit-foot { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; padding: 10px 16px; background: var(--bg); border-top: 1px solid var(--line); color: var(--mut); font-size: 12px; }
  #tab-content-logs .audit-foot-left, #tab-content-logs .audit-foot-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  #tab-content-logs .audit-foot .audit-btn { height: 28px; padding: 0 10px; font-size: 12px; }
  #tab-content-logs .audit-limit-sel { height: 28px; padding: 0 8px; font: inherit; font-size: 12px; font-weight: 600; border: 1px solid #cbd5e1; border-radius: 6px; background: var(--card); color: var(--ink); }
  #tab-content-logs .audit-page-btns { display: inline-flex; align-items: center; gap: 4px; flex-wrap: wrap; }
  #tab-content-logs .audit-page-num { min-width: 28px; height: 28px; padding: 0 6px; border-radius: 6px; border: 1px solid #cbd5e1; background: var(--card); color: var(--ink); font-size: 12px; font-weight: 600; cursor: pointer; }
  #tab-content-logs .audit-page-num.is-active { background: var(--g); border-color: var(--g); color: #fff; }

  @media (max-width: 1024px) { #tab-content-logs .audit-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 900px) {
    #tab-content-logs .audit-th { display: none; }
    #tab-content-logs .audit-row { grid-template-columns: 1fr; gap: 6px; padding: 12px; }
    #tab-content-logs .audit-tm { text-align: left; }
    #tab-content-logs .audit-sel, #tab-content-logs .audit-sel-act { flex: 1 1 145px; width: auto; }
    #tab-content-logs .audit-dr { flex: 1 1 250px; min-width: 240px; width: auto; }
    #tab-content-logs .audit-dr .vn-dp-wrap { flex: 1 1 108px; width: auto; min-width: 0; }
    #tab-content-logs .audit-dr-date, #tab-content-logs .audit-dr .vn-dp-text { width: 100%; min-width: 0; flex: 1; }
  }
  @media (max-width: 640px) { #tab-content-logs .audit-touch-btn, #tab-content-logs .audit-chip { min-height: 44px; } #tab-content-logs .audit-dr { height: 42px; flex: 1 1 100%; } #tab-content-logs .audit-dr-date, #tab-content-logs .audit-dr .vn-dp-text, #tab-content-logs .audit-dr .vn-dp-btn { height: 38px; min-height: 38px; } }
  @media (max-width: 520px) {
    #tab-content-logs .audit-kpi-grid { grid-template-columns: 1fr; }
    #tab-content-logs .audit-frow { padding: 10px; }
    #tab-content-logs .audit-qwrap { flex: 1 1 100%; }
  }
</style>

<div id="tab-content-logs" class="space-y-4 hidden" role="tabpanel" aria-label="Nhật ký hệ thống và thao tác quản trị">
  <div class="audit-wrap">
    <div class="audit-head">
      <div>
        <h2>Nhật ký hệ thống và thao tác quản trị</h2>
        <p>Ghi lại mọi thay đổi nhạy cảm: giá, điểm hội viên, duyệt cọc, hủy và chốt ca, cài đặt.</p>
      </div>
      <div class="audit-acts">
        <span id="admin-log-updated-at" class="audit-cnt">Cập nhật --:--</span>
        <button type="button" id="admin-log-export-csv-btn" onclick="exportAdminLogsCsv()" class="audit-btn audit-touch-btn" title="Xuất file CSV (UTF-8 BOM) theo bộ lọc hiện tại">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Xuất CSV
        </button>
        <button type="button" id="admin-log-refresh-btn" onclick="loadAdminLogs(1)" class="audit-btn audit-touch-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Làm mới
        </button>
      </div>
    </div>

    <div id="admin-log-kpi-grid" class="audit-kpi-grid">
      <button type="button" id="audit-kpi-total" data-quick="" aria-pressed="true" onclick="handleAuditKpiClick('')" class="audit-kpi-card">
        <div class="audit-kpi-lbl">Tổng thao tác</div>
        <div id="audit-kpi-total-val" class="audit-kpi-val">0</div>
        <div id="audit-kpi-total-sub" class="audit-kpi-sub">Hôm nay (theo giờ VN)</div>
      </button>
      <button type="button" id="audit-kpi-anomaly" data-quick="unreviewed_anomaly" aria-pressed="false" onclick="handleAuditKpiClick('unreviewed_anomaly')" class="audit-kpi-card">
        <div class="audit-kpi-lbl audit-kpi-label-red">Bất thường chưa hậu kiểm</div>
        <div id="audit-kpi-anomaly-val" class="audit-kpi-val">0</div>
        <div class="audit-kpi-sub">Lệch quỹ, đổi điểm lớn, tắt 2FA...</div>
      </button>
      <button type="button" id="audit-kpi-finance" data-quick="finance" aria-pressed="false" onclick="handleAuditKpiClick('finance')" class="audit-kpi-card">
        <div class="audit-kpi-lbl audit-kpi-label-purple">Giao dịch tiền / quỹ</div>
        <div id="audit-kpi-finance-val" class="audit-kpi-val">0</div>
        <div class="audit-kpi-sub">Duyệt cọc, thu tiền, đóng/mở ca</div>
      </button>
      <button type="button" id="audit-kpi-shifts" data-quick="shifts" aria-pressed="false" onclick="handleAuditKpiClick('shifts')" class="audit-kpi-card">
        <div class="audit-kpi-lbl">Ca trực trong kỳ</div>
        <div id="audit-kpi-shifts-val" class="audit-kpi-val">0</div>
        <div id="audit-kpi-shifts-sub" class="audit-kpi-sub">Đang kiểm tra trạng thái ca...</div>
      </button>
    </div>

    <div class="audit-fbox">
      <div class="audit-frow">
        <div class="audit-qwrap">
          <span class="audit-qicon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input type="search" id="admin-log-search" class="audit-search-input" placeholder="Tìm SĐT, mã đơn, nội dung, hoặc mã nhóm (TD, XHC, CN, CB, TQ, TĐ, td+cn)" aria-label="Tìm kiếm nhật ký">
          <button type="button" id="admin-log-search-clear" class="audit-search-clear hidden" aria-label="Xóa từ khóa tìm kiếm" title="Xóa từ khóa">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <select id="admin-log-filter-staff" class="audit-sel" aria-label="Lọc theo nhân sự">
          <option value="">Tất cả nhân sự</option>
        </select>
        <select id="admin-log-filter-action" class="audit-sel audit-sel-act" aria-label="Lọc theo loại hành động">
          <option value="">Tất cả loại hành động</option>
        </select>
        <select id="admin-log-filter-datagroup" class="audit-sel" aria-label="Lọc theo nhóm dữ liệu">
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
        <div class="audit-dr">
          <input type="date" id="admin-log-filter-from" class="audit-dr-date" data-vn-datepicker="1" aria-label="Từ ngày">
          <span>–</span>
          <input type="date" id="admin-log-filter-to" class="audit-dr-date" data-vn-datepicker="1" aria-label="Đến ngày">
        </div>
        <button type="button" id="admin-log-reset-btn" onclick="resetAdminLogFilters()" class="audit-btn audit-touch-btn">Xóa lọc</button>
      </div>

      <div id="admin-log-category-chips" class="audit-chips" role="group" aria-label="Quy ước màu nhóm hành động">
        <span class="audit-legend-lbl">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" />
          </svg>
          Quy ước màu:
        </span>
        <button type="button" class="audit-chip t-TD" data-cat="TD" aria-pressed="false" onclick="toggleAuditCategoryChip('TD')" title="Lọc nhóm Tạo / Duyệt (TD)">
          <i class="audit-dot"></i>Tạo / Duyệt <span class="audit-chip-code">(TD)</span>
        </button>
        <button type="button" class="audit-chip t-XH" data-cat="XH" aria-pressed="false" onclick="toggleAuditCategoryChip('XH')" title="Lọc nhóm Xóa / Hủy / Chi tiền (XHC)">
          <i class="audit-dot"></i>Xóa / Hủy / Chi tiền <span class="audit-chip-code">(XHC)</span>
        </button>
        <button type="button" class="audit-chip t-CN" data-cat="CN" aria-pressed="false" onclick="toggleAuditCategoryChip('CN')" title="Lọc nhóm Cập nhật (CN)">
          <i class="audit-dot"></i>Cập nhật <span class="audit-chip-code">(CN)</span>
        </button>
        <button type="button" class="audit-chip t-CB" data-cat="CB" aria-pressed="false" onclick="toggleAuditCategoryChip('CB')" title="Lọc nhóm Cảnh báo (CB)">
          <i class="audit-dot"></i>Cảnh báo <span class="audit-chip-code">(CB)</span>
        </button>
        <button type="button" class="audit-chip t-TQ" data-cat="TQ" aria-pressed="false" onclick="toggleAuditCategoryChip('TQ')" title="Lọc nhóm Tiền quầy (TQ)">
          <i class="audit-dot"></i>Tiền quầy <span class="audit-chip-code">(TQ)</span>
        </button>
        <button type="button" class="audit-chip t-TT" data-cat="TT" aria-pressed="false" onclick="toggleAuditCategoryChip('TT')" title="Lọc nhóm Tự động (TĐ)">
          <i class="audit-dot"></i>Tự động <span class="audit-chip-code">(TĐ)</span>
        </button>
      </div>
    </div>

    <div id="admin-log-new-banner-slot" class="audit-banner-slot">
      <div id="admin-log-live-status" class="sr-only" aria-live="polite"></div>
      <div id="admin-log-new-banner" class="hidden audit-new-banner">
        <span id="admin-log-new-banner-text">Có bản ghi nhật ký mới phát sinh.</span>
        <button type="button" onclick="loadAdminLogs(1)" class="audit-btn is-primary">Tải bản ghi mới</button>
      </div>
    </div>

    <div class="audit-list">
      <div id="admin-log-loading" class="hidden audit-state">
        <p>Đang tải dữ liệu nhật ký quản trị...</p>
      </div>
      <div id="admin-log-error" class="hidden audit-state">
        <p id="admin-log-error-msg" style="color:var(--r);font-weight:600">Đã xảy ra lỗi kết nối máy chủ.</p>
        <button type="button" onclick="loadAdminLogs(adminLogState?.page || 1)" class="audit-btn is-primary" style="margin-top:10px">Thử lại</button>
      </div>
      <div id="admin-log-empty" class="hidden audit-state">
        <p style="font-weight:600;color:var(--ink)">Không có bản ghi khớp bộ lọc.</p>
        <p style="margin:4px 0 12px">Hãy bỏ bớt bộ lọc, đổi khoảng ngày hoặc từ khóa tìm kiếm.</p>
        <button type="button" onclick="resetAdminLogFilters()" class="audit-btn">Xóa bộ lọc</button>
      </div>

      <div id="admin-log-table-container">
        <div id="admin-log-thead" class="audit-th" role="row">
          <div>Người thực hiện</div>
          <div>Hành động</div>
          <div>Đối tượng</div>
          <div>Nội dung thay đổi (cũ → mới)</div>
          <div>Thời gian</div>
        </div>
        <div id="admin-log-tbody"></div>
      </div>

      <div id="admin-log-pagination" class="audit-foot">
        <div class="audit-foot-left">
          <span id="admin-log-range-summary" style="font-weight:600;color:var(--ink)">Hiển thị 0–0 / 0 bản ghi</span>
          <span>Trang <strong id="admin-log-page-current" style="color:var(--ink)">1</strong> / <strong id="admin-log-page-total" style="color:var(--ink)">1</strong></span>
          <span class="hidden">Tổng cộng: <strong id="admin-log-total-count">0</strong></span>
        </div>
        <div class="audit-foot-right">
          <label for="admin-log-limit-select">Số dòng/trang:</label>
          <select id="admin-log-limit-select" onchange="handleAdminLogLimitChange(this.value)" class="audit-limit-sel">
            <option value="10">10</option>
            <option value="25" selected>25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
          <div class="audit-page-btns">
            <button type="button" id="admin-log-prev-btn" onclick="prevAdminLogPage()" class="audit-btn audit-touch-btn">Trước</button>
            <div id="admin-log-page-numbers" class="audit-page-btns"></div>
            <button type="button" id="admin-log-next-btn" onclick="nextAdminLogPage()" class="audit-btn audit-touch-btn">Sau</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
