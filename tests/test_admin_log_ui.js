const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = path.resolve(__dirname, '..');
const partialPath = path.join(rootDir, 'portal-admin', 'partials', 'tab11_admin_logs.php');
const jsPath = path.join(rootDir, 'js', 'admin_logs.js');

const tab8Path = path.join(rootDir, 'portal-admin', 'partials', 'tab8_shifts.php');
const tab8JsPath = path.join(rootDir, 'js', 'admin_shifts.js');
const twCssPath = path.join(rootDir, 'css', 'tailwind.generated.css');

const partialHtml = fs.readFileSync(partialPath, 'utf8');
const jsCode = fs.readFileSync(jsPath, 'utf8');
const tab8Html = fs.readFileSync(tab8Path, 'utf8');
const tab8Js = fs.readFileSync(tab8JsPath, 'utf8');
const twCss = fs.readFileSync(twCssPath, 'utf8');

// 1. Kiểm tra giới hạn dòng, font hệ thống, CSS tokens, không CDN ngoài
const lineCount = jsCode.split('\n').length;
assert.ok(lineCount <= 800, `js/admin_logs.js vượt quá 800 dòng: ${lineCount}`);
for (const combined of [partialHtml, jsCode, tab8Html, tab8Js]) {
    assert.ok(!/fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr|unpkg\.com|cdnjs\.cloudflare/i.test(combined), 'Không được chứa CDN ngoài hoặc Google Fonts');
}
for (const token of ['--g:', '--r:', '--y:', '--b:', '--p:', '--n:']) {
    assert.ok(partialHtml.includes(token), `Thiếu CSS token ${token} trong tab11_admin_logs.php`);
}
assert.ok(/@media\s*\(max-width:\s*(900|768|640|560)px\)/.test(partialHtml), 'Thiếu CSS responsive mobile trong tab11_admin_logs.php');
assert.ok(!/(?:^|[\s;{])shrink:\s*0\b/.test(partialHtml), 'Không được dùng CSS sai cú pháp shrink: 0');
assert.ok(partialHtml.includes('flex-shrink: 0'), 'Phải dùng flex-shrink: 0');

// 1b. Kiểm tra đủ toàn bộ CSS .audit-* và kiểm tra không có utility Tailwind khuyết thiếu trong Tab 8 & Tab 11
for (const cls of [
    '.audit-head', '.audit-kpi-grid', '.audit-kpi-card', '.audit-fbox', '.audit-frow',
    '.audit-chips', '.audit-chip', '.t-TD', '.t-XH', '.t-CN', '.t-CB', '.t-TQ', '.t-TT',
    '.audit-list', '.audit-th', '.audit-row', '.audit-day', '.audit-badge', '.audit-code',
    '.audit-chg', '.audit-more', '.audit-tm', '.audit-anomaly-pill', '.audit-review-btn',
    '.audit-reviewed-badge', '.audit-review-form', '.audit-page-num', '.audit-detail-pre'
]) {
    assert.ok(partialHtml.includes(cls), `Thiếu rule CSS cho ${cls} trong tab11_admin_logs.php`);
}
for (const fContent of [tab8Html, tab8Js, partialHtml, jsCode]) {
    const strRe = /class\s*=\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g;
    let m;
    while ((m = strRe.exec(fContent)) !== null) {
        const raw = (m[1] ?? m[2] ?? m[3] ?? '').replace(/\$\{[^}]*\}/g, ' ');
        for (const c of raw.split(/\s+/).filter(Boolean)) {
            if (/^(ui-card|input-field|btn-|font-heading|vn-dp)/.test(c)) continue;
            const escaped = c.replace(/[:/\[\]#.%]/g, ch => '\\' + ch);
            const inTw = twCss.includes('.' + escaped);
            const inLocalStyle = partialHtml.includes('.' + c) || tab8Html.includes('.' + c);
            assert.ok(inTw || inLocalStyle, `Class "${c}" không có trong css/tailwind.generated.css hoặc <style> cục bộ`);
        }
    }
}
for (const sCls of ['.shift-header-toolbar', '.shift-filter-select', '.shift-btn-h36', '.shift-touch-h44', '.shift-row-surplus', '.shift-row-deficit', '.shift-modal-table', '.shift-modal-detail-z', '.shift-modal-confirm-z']) {
    assert.ok(tab8Html.includes(sCls), `Thiếu CSS scoped ${sCls} trong tab8_shifts.php`);
}

// 1c. Kiểm tra header Grid 5 cột Tab 11 khớp đúng thứ tự mockup và "Quy ước màu:"
const theadMatch = partialHtml.match(/<div id="admin-log-thead"[^>]*>([\s\S]*?)<\/div>\s*<div id="admin-log-tbody"><\/div>/);
assert.ok(theadMatch, 'Thiếu #admin-log-thead dạng CSS Grid trong tab11_admin_logs.php');
const thLabels = Array.from(theadMatch[1].matchAll(/<div>([\s\S]*?)<\/div>/g)).map((m) => m[1].replace(/<[^>]+>/g, '').trim());
assert.strictEqual(thLabels.length, 5, 'Header Grid Tab 11 phải có đúng 5 cột');
assert.ok(thLabels[0].includes('Người thực hiện'), 'Cột 1 phải là Người thực hiện');
assert.ok(thLabels[1].includes('Hành động'), 'Cột 2 phải là Hành động');
assert.ok(thLabels[2].includes('Đối tượng'), 'Cột 3 phải là Đối tượng');
assert.ok(thLabels[3].includes('Nội dung thay đổi'), 'Cột 4 phải là Nội dung thay đổi (cũ → mới)');
assert.ok(thLabels[4].includes('Thời gian'), 'Cột 5 phải là Thời gian');
assert.ok(partialHtml.includes('Quy ước màu:'), 'Phải giữ lại thanh Quy ước màu:');

// 2. Kiểm tra markup Tab 11 chuẩn UX
assert.ok(partialHtml.includes('Nhật ký hệ thống và thao tác quản trị'), 'Thiếu tiêu đề Tab 11');
assert.ok(!partialHtml.includes('Hiển thị 8 bản ghi gần nhất'), 'Không được còn chuỗi cũ "Hiển thị 8 bản ghi gần nhất"');
assert.ok(!/bất biến|append[\s-]*only|chỉ ghi thêm/i.test(partialHtml), 'Tab 11 không được chứa chữ Bất biến, Append-only hoặc Chỉ ghi thêm');
assert.ok(!partialHtml.includes('.audit-tag') && !partialHtml.includes('.audit-note'), 'Không được giữ CSS .audit-tag hoặc .audit-note không còn dùng');
assert.ok(partialHtml.includes('placeholder="Tìm SĐT, mã đơn, nội dung, hoặc mã nhóm (TD, XHC, CN, CB, TQ, TĐ, td+cn)"'), 'Thiếu placeholder tìm kiếm mới có TD, XHC, CN, CB, TQ, TĐ, td+cn');
assert.ok(partialHtml.includes('id="admin-log-updated-at"'), 'Thiếu badge thời gian cập nhật');
assert.ok(partialHtml.includes('id="admin-log-new-banner-slot"') && partialHtml.includes('id="admin-log-new-banner"'), 'Thiếu vùng giữ chỗ banner bản ghi mới');
assert.ok(partialHtml.includes('id="admin-log-range-summary"'), 'Thiếu tóm tắt phạm vi chân bảng');
assert.ok(/<option value="25"[^>]*selected/.test(partialHtml), 'Mặc định phân trang phải là 25 bản ghi');
assert.ok(partialHtml.includes('data-vn-datepicker="1"'), 'Thiếu cấu hình vn_datepicker cho bộ lọc ngày');

const kpiMatches = partialHtml.match(/<button\b[^>]*aria-pressed="[^"]*"[^>]*class="audit-kpi-card"/g) || [];
assert.strictEqual(kpiMatches.length, 4, 'Phải có đúng 4 thẻ KPI dạng <button aria-pressed>');
for (const cat of ['TD', 'XH', 'CN', 'CB', 'TQ', 'TT']) {
    assert.ok(partialHtml.includes(`data-cat="${cat}"`), `Thiếu chip danh mục ${cat}`);
    assert.ok(partialHtml.includes(`toggleAuditCategoryChip('${cat}')`), `Thiếu onclick toggleAuditCategoryChip('${cat}')`);
}
const chipsBlockMatch = partialHtml.match(/<div id="admin-log-category-chips"[\s\S]*?<\/div>/);
assert.ok(chipsBlockMatch, 'Thiếu khối #admin-log-category-chips');
for (const shortLbl of ['(TD)', '(XHC)', '(CN)', '(CB)', '(TQ)', '(TĐ)']) {
    assert.ok(chipsBlockMatch[0].includes(shortLbl), `Thanh Quy ước màu thiếu mã chip ${shortLbl}`);
}
assert.ok(chipsBlockMatch[0].includes('title="Lọc nhóm Xóa / Hủy / Chi tiền (XHC)"'), 'Thiếu title chuẩn cho chip XHC');
assert.ok(chipsBlockMatch[0].includes('title="Lọc nhóm Tự động (TĐ)"'), 'Thiếu title chuẩn cho chip TĐ');

// 3. Tạo DOM giả lập chạy thật js/admin_logs.js trong vm
function makeEl(id, extra = {}) {
    const clsSet = new Set(extra.classes || []);
    return Object.assign({
        id,
        value: extra.value || '',
        textContent: '',
        innerHTML: '',
        disabled: false,
        style: {},
        attrs: Object.assign({}, extra.attrs || {}),
        classList: {
            add: (...c) => c.forEach((x) => clsSet.add(x)),
            remove: (...c) => c.forEach((x) => clsSet.delete(x)),
            toggle: (c, force) => (force === undefined ? (clsSet.has(c) ? clsSet.delete(c) : clsSet.add(c)) : (force ? clsSet.add(c) : clsSet.delete(c))),
            contains: (c) => clsSet.has(c)
        },
        getAttribute: function (k) { return this.attrs[k] ?? null; },
        setAttribute: function (k, v) { this.attrs[k] = String(v); },
        focus: () => {}
    }, extra);
}

const elements = {
    'tab-content-logs': makeEl('tab-content-logs'),
    'admin-log-updated-at': makeEl('admin-log-updated-at'),
    'admin-log-filter-staff': makeEl('admin-log-filter-staff'),
    'admin-log-filter-action': makeEl('admin-log-filter-action'),
    'admin-log-filter-datagroup': makeEl('admin-log-filter-datagroup'),
    'admin-log-filter-from': makeEl('admin-log-filter-from'),
    'admin-log-filter-to': makeEl('admin-log-filter-to'),
    'admin-log-search': makeEl('admin-log-search'),
    'admin-log-search-clear': makeEl('admin-log-search-clear', { classes: ['hidden'] }),
    'admin-log-limit-select': makeEl('admin-log-limit-select', { value: '25' }),
    'admin-log-loading': makeEl('admin-log-loading', { classes: ['hidden'] }),
    'admin-log-error': makeEl('admin-log-error', { classes: ['hidden'] }),
    'admin-log-error-msg': makeEl('admin-log-error-msg'),
    'admin-log-empty': makeEl('admin-log-empty', { classes: ['hidden'] }),
    'admin-log-table-container': makeEl('admin-log-table-container'),
    'admin-log-tbody': makeEl('admin-log-tbody'),
    'admin-log-pagination': makeEl('admin-log-pagination'),
    'admin-log-range-summary': makeEl('admin-log-range-summary'),
    'admin-log-page-current': makeEl('admin-log-page-current'),
    'admin-log-page-total': makeEl('admin-log-page-total'),
    'admin-log-total-count': makeEl('admin-log-total-count'),
    'admin-log-prev-btn': makeEl('admin-log-prev-btn'),
    'admin-log-next-btn': makeEl('admin-log-next-btn'),
    'admin-log-page-numbers': makeEl('admin-log-page-numbers'),
    'admin-log-new-banner': makeEl('admin-log-new-banner', { classes: ['hidden'] }),
    'admin-log-new-banner-text': makeEl('admin-log-new-banner-text'),
    'audit-kpi-total-val': makeEl('audit-kpi-total-val'),
    'audit-kpi-total-sub': makeEl('audit-kpi-total-sub'),
    'audit-kpi-anomaly': makeEl('audit-kpi-anomaly'),
    'audit-kpi-anomaly-val': makeEl('audit-kpi-anomaly-val'),
    'audit-kpi-finance-val': makeEl('audit-kpi-finance-val'),
    'audit-kpi-shifts-val': makeEl('audit-kpi-shifts-val'),
    'audit-kpi-shifts-sub': makeEl('audit-kpi-shifts-sub')
};

const chipEls = ['TD', 'XH', 'CN', 'CB', 'TQ', 'TT'].map((c) => makeEl(`chip-${c}`, { attrs: { 'data-cat': c } }));
const kpiCardEls = ['', 'unreviewed_anomaly', 'finance', 'shifts'].map((q) => makeEl(`kpi-${q}`, { attrs: { 'data-quick': q } }));

const fetchCalls = [];
const openedUrls = [];
const intervals = [];
const replaceStates = [];
const toasts = [];
let nextFetchResponse = null;

function createMockFetch() {
    return async (url, opts = {}) => {
        fetchCalls.push({ url, opts });
        if (nextFetchResponse) {
            const r = nextFetchResponse;
            nextFetchResponse = null;
            return r;
        }
        if (url.includes('action=audit_summary')) {
            return {
                ok: true,
                status: 200,
                json: async () => ({
                    success: true,
                    data: {
                        period: { from_date: '2026-11-24', to_date: '2026-11-24', is_today: !url.includes('categories=TD') },
                        total_actions: 60,
                        unreviewed_anomalies: 2,
                        finance_cash_count: 14,
                        shift_count: 3,
                        latest_shift_status: { level: 'danger', text: 'Ca #9: lệch quỹ -50.000đ chưa hậu kiểm' },
                        latest_id: 99
                    }
                })
            };
        }
        if (url.includes('action=audit_log_detail')) {
            return {
                ok: true,
                status: 200,
                json: async () => ({
                    success: true,
                    data: {
                        id: 101,
                        object_code: '0912345678',
                        object_display: '0912345678',
                        formatted_message: 'Cập nhật SĐT 0912345678'
                    }
                })
            };
        }
        if (url.includes('action=audit_review')) {
            return {
                ok: true,
                status: 201,
                json: async () => ({
                    success: true,
                    data: { id: 7, log_id: 101, reviewer_name: 'Admin Chủ Sân', note: 'Đã đối chiếu camera quầy đầy đủ', created_at_formatted: '24/11/2026 10:15' }
                })
            };
        }
        if (url.includes('action=audit_check_new')) {
            return { ok: true, status: 200, json: async () => ({ success: true, data: { new_count: 4, latest_id: 103 } }) };
        }
        const nowStr = new Date().toISOString().slice(0, 10) + ' 09:30:00';
        return {
            ok: true,
            status: 200,
            json: async () => ({
                success: true,
                data: {
                    logs: [{
                        id: 101,
                        user_id: 1,
                        actor_name: 'Admin Chủ Sân',
                        actor_role: 'admin',
                        action: 'SHIFT_CLOSE',
                        action_label: 'Đóng ca / Chốt sổ quỹ',
                        category: 'TQ',
                        data_group: 'Ca trực',
                        object_code: '0912345678',
                        object_display: '091***678',
                        has_sensitive_phone: true,
                        formatted_message: 'Đóng ca trực cho khách 091***678',
                        diffs: [
                            { field: 'staff_counted_cash', label: 'NV đếm quỹ', old: '500.000đ', new: '450.000đ' },
                            { field: 'discrepancy_amount', label: 'Chênh lệch quỹ', old: '0đ', new: '-50.000đ' },
                            { field: 'status', label: 'Trạng thái', old: 'open', new: 'pending_explanation' }
                        ],
                        is_anomaly: 1,
                        anomaly_reasons: ['Chốt ca lệch quỹ -50.000đ'],
                        ip: '127.0.0.1',
                        created_at: nowStr,
                        review: null
                    }],
                    pagination: { page: 1, limit: 25, total: 60, totalPages: 3 },
                    staffList: [{ id: 1, username: 'admin', full_name: 'Admin Chủ Sân', role: 'admin' }],
                    actionTypes: ['SHIFT_CLOSE', 'UNKNOWN_CUSTOM_LOG'],
                    latest_id: 101
                }
            })
        };
    };
}

let dpInitialized = false;
const locationMock = { search: '?tab=logs', pathname: '/portal-admin/', href: '/portal-admin/?tab=logs' };
const sandbox = {
    window: null,
    document: {
        hidden: false,
        getElementById: (id) => elements[id] || null,
        querySelectorAll: (sel) => {
            if (sel === '#admin-log-category-chips .audit-chip') return chipEls;
            if (sel === '#admin-log-kpi-grid .audit-kpi-card') return kpiCardEls;
            return [];
        }
    },
    location: locationMock,
    history: { replaceState: (_s, _t, u) => replaceStates.push(u) },
    open: (url, target, feat) => openedUrls.push({ url, target, feat }),
    fetch: createMockFetch(),
    AbortController: class { constructor() { this.signal = {}; } abort() {} },
    URLSearchParams,
    Intl,
    Date,
    Set,
    Array,
    Object,
    Number,
    String,
    Boolean,
    JSON,
    Math,
    setTimeout,
    clearTimeout,
    setInterval: (fn, ms) => { intervals.push({ fn, ms }); return intervals.length; },
    clearInterval: () => {},
    SanBongDatePicker: { init: () => { dpInitialized = true; } },
    SanBongApp: { showToast: (msg, type) => toasts.push({ msg, type }) },
    console
};
sandbox.window = sandbox;
vm.runInNewContext(jsCode, sandbox);

(async () => {
    // A. Validate lý do client-side
    assert.strictEqual(sandbox.validateAuditReasonClient('ngắn').valid, false);
    assert.strictEqual(sandbox.validateAuditReasonClient('aaaaaaaaaa').valid, false);
    assert.strictEqual(sandbox.validateAuditReasonClient('1212121212').valid, false);
    assert.strictEqual(sandbox.validateAuditReasonClient('Đã kiểm tra biên lai đầy đủ').valid, true);

    // B. Tải danh sách + summary + kiểm tra hiển thị
    await sandbox.loadAdminLogs(1);
    assert.ok(dpInitialized, 'Phải khởi tạo vn_datepicker khi nạp Tab 11');
    assert.strictEqual(elements['audit-kpi-total-val'].textContent, '60');
    assert.strictEqual(elements['audit-kpi-anomaly-val'].textContent, '2');
    assert.ok(elements['audit-kpi-anomaly'].classList.contains('is-alert-red'), 'KPI bất thường > 0 phải tô cảnh báo đỏ');
    assert.ok(elements['audit-kpi-shifts-sub'].textContent.includes('lệch quỹ'), 'Dòng phụ ca trực phải hiển thị cảnh báo lệch quỹ');
    assert.strictEqual(elements['audit-kpi-total-sub'].textContent, 'Hôm nay (theo giờ VN)');
    assert.strictEqual(elements['admin-log-range-summary'].textContent, 'Hiển thị 1–25 / 60 bản ghi');

    const tbodyHtml = elements['admin-log-tbody'].innerHTML;
    const dataRowMatch = tbodyHtml.match(/<div class="audit-row[^"]*" data-log-id="101">([\s\S]*?)<\/div>\s*$/);
    assert.ok(dataRowMatch, 'Phải render dòng dữ liệu log 101 dạng .audit-row');
    assert.ok(dataRowMatch[1].includes('audit-actor-name') && dataRowMatch[1].includes('audit-badge') && dataRowMatch[1].includes('audit-code') && dataRowMatch[1].includes('audit-chg') && dataRowMatch[1].includes('audit-tm'), 'Mỗi dòng .audit-row phải đủ 5 vùng dữ liệu khớp header Grid');
    assert.ok(tbodyHtml.includes('Hôm nay,'), 'Phải nhóm theo ngày có "Hôm nay, dd/mm/yyyy"');
    assert.ok(tbodyHtml.includes('091***678') && !tbodyHtml.includes('0912345678'), 'SĐT phải được che mặc định');
    assert.ok(tbodyHtml.includes('Xem chi tiết'), 'Phải có nút Xem chi tiết SĐT');
    assert.ok(tbodyHtml.includes('+1 thay đổi nữa'), 'Quá 2 trường thay đổi phải thu gọn thành +N thay đổi nữa');
    assert.ok(tbodyHtml.includes('Bất thường'), 'Phải hiện badge Bất thường');
    const actionFilterHtml = elements['admin-log-filter-action'].innerHTML;
    assert.ok(!actionFilterHtml.includes('__group__:TD'), 'Không dùng mã nhóm category làm __group__ action filter');
    for (const [canonCode, optLabel] of [
        ['TD', 'TD – Tạo / Duyệt'],
        ['XH', 'XHC – Xóa / Hủy / Chi tiền'],
        ['CN', 'CN – Cập nhật'],
        ['CB', 'CB – Cảnh báo'],
        ['TQ', 'TQ – Tiền quầy'],
        ['TT', 'TĐ – Tự động']
    ]) {
        assert.ok(actionFilterHtml.includes(`<optgroup label="${optLabel}">`) && actionFilterHtml.includes(`value="__cat__:${canonCode}"`), `Dropdown hành động phải có <optgroup label="${optLabel}"> và option value="__cat__:${canonCode}"`);
    }

    // C. Mở rộng diff & reveal SĐT nhạy cảm
    sandbox.toggleAuditDiffExpand(101);
    assert.ok(elements['admin-log-tbody'].innerHTML.includes('Thu gọn thay đổi'), 'Bấm mở rộng phải hiện toàn bộ thay đổi');
    await sandbox.revealAuditSensitive(101);
    assert.ok(elements['admin-log-tbody'].innerHTML.includes('0912345678'), 'Sau khi bấm Xem chi tiết phải hiển thị SĐT gốc');

    // D. Hậu kiểm + Lọc chip + Limit 10 + Xuất CSV + Polling 60s + Giữ URL khi không ở ?tab=logs
    elements['audit-review-input-101'] = makeEl('audit-review-input-101', { value: 'Đã đối chiếu camera quầy đầy đủ' });
    elements['audit-review-submit-101'] = makeEl('audit-review-submit-101');
    await sandbox.submitAuditReview(101);
    assert.ok(elements['admin-log-tbody'].innerHTML.includes('Đã hậu kiểm'), 'Lưu hậu kiểm thành công phải đổi trạng thái sang Đã hậu kiểm');

    await sandbox.handleAdminLogLimitChange('10');
    assert.strictEqual(sandbox.adminLogState.limit, 10, 'Chọn 10 dòng/trang phải giữ limit=10');
    sandbox.toggleAuditCategoryChip('TD');
    await new Promise((r) => setTimeout(r, 20));
    assert.strictEqual(elements['audit-kpi-total-sub'].textContent, 'Theo bộ lọc đang chọn', 'period.is_today === false phải hiển thị "Theo bộ lọc đang chọn"');

    sandbox.exportAdminLogsCsv();
    assert.ok(openedUrls.some((u) => u.url.includes('action=audit_export_csv') && u.url.includes('categories=TD')), 'Xuất CSV phải giữ nguyên bộ lọc');

    const prevReplaceCount = replaceStates.length;
    locationMock.search = '';
    await sandbox.loadAdminLogs(1);
    assert.strictEqual(replaceStates.length, prevReplaceCount, 'Không được ghi đè URL thành ?tab=logs khi đang ở tab mặc định không có ?tab=logs');

    assert.strictEqual(intervals[0].ms, 60000, 'Auto-check bản ghi mới phải chạy chu kỳ 60.000ms');
    await intervals[0].fn();
    assert.ok(!elements['admin-log-new-banner'].classList.contains('hidden'), 'Khi có bản ghi mới phải hiện banner thông báo');

    // E. Kiểm tra 401 redirect về trang đăng nhập
    nextFetchResponse = { ok: false, status: 401, json: async () => ({ success: false }) };
    await assert.rejects(() => sandbox.auditApiRequest('api/admin.php?action=audit_summary'));
    assert.ok(locationMock.href.includes('login?redirect=portal-admin'), 'HTTP 401 phải chuyển hướng về trang login');

    console.log('PASS test_admin_log_ui: All Tab 11 B2-B3 UI, JS catalog, review, masking, CSV, polling & 401 assertions passed.');
})().catch((err) => {
    console.error(err);
    process.exit(1);
});
