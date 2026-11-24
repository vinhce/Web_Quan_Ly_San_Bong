/**
 * Tab 11: Nhật ký hệ thống & thao tác quản trị (Admin Logs UI + Action Catalog).
 */
const ADMIN_LOG_CATEGORIES = {
    TD: { code: 'TD', key: 'TD', label: 'Tạo/Duyệt', badgeClass: 'audit-cat-td' },
    XH: { code: 'XH', key: 'XH', label: 'Xóa/Hủy/Chi tiền', badgeClass: 'audit-cat-xh' },
    CN: { code: 'CN', key: 'CN', label: 'Cập nhật', badgeClass: 'audit-cat-cn' },
    CB: { code: 'CB', key: 'CB', label: 'Cảnh báo', badgeClass: 'audit-cat-cb' },
    TQ: { code: 'TQ', key: 'TQ', label: 'Tiền quầy', badgeClass: 'audit-cat-tq' },
    TT: { code: 'TT', key: 'TT', label: 'Tự động', badgeClass: 'audit-cat-tt' }
};

const ADMIN_LOG_DATA_GROUPS = [
    'Ca trực', 'Tiền & đặt cọc', 'Hội viên & điểm', 'Giá & voucher',
    'Sân & Lịch đặt', 'Cài đặt', 'Nhân sự & Bảo mật', 'Khác'
];

const _aMeta = (label, category, dataGroup) => ({ label, category, dataGroup });

const ADMIN_LOG_CATALOG = {
    categories: ADMIN_LOG_CATEGORIES,
    groups: Object.values(ADMIN_LOG_CATEGORIES),
    dataGroups: ADMIN_LOG_DATA_GROUPS,
    actions: {
        // Ca trực
        SHIFT_OPEN: _aMeta('Mở ca trực', 'TD', 'Ca trực'),
        OPEN_SHIFT: _aMeta('Mở ca trực', 'TD', 'Ca trực'),
        SHIFT_CLOSE: _aMeta('Đóng ca trực', 'CB', 'Ca trực'),
        CLOSE_SHIFT: _aMeta('Đóng ca trực', 'CB', 'Ca trực'),
        SHIFT_HANDOVER: _aMeta('Giao ca trực', 'CB', 'Ca trực'),
        SHIFT_CONFIRM: _aMeta('Xác nhận chốt ca', 'TD', 'Ca trực'),
        SHIFT_EDIT_COUNT: _aMeta('Sửa số liệu kiểm đếm ca', 'CB', 'Ca trực'),
        // Tiền & đặt cọc
        COLLECT_PAYMENT: _aMeta('Thu tiền tại quầy', 'TQ', 'Tiền & đặt cọc'),
        COUNTER_SALE: _aMeta('Bán hàng tại quầy', 'TQ', 'Tiền & đặt cọc'),
        ADJUST_DISCOUNT: _aMeta('Điều chỉnh giảm giá đơn', 'CB', 'Tiền & đặt cọc'),
        UPDATE_PAYMENT: _aMeta('Cập nhật thanh toán', 'CN', 'Tiền & đặt cọc'),
        UPDATE_FINANCE: _aMeta('Cập nhật thông tin tài chính', 'CN', 'Tiền & đặt cọc'),
        RECONCILE_MANUAL: _aMeta('Gán giao dịch thủ công', 'TD', 'Tiền & đặt cọc'),
        RECONCILE_RESOLVE: _aMeta('Xử lý đối soát', 'CB', 'Tiền & đặt cọc'),
        WEBHOOK_MATCH: _aMeta('Giao dịch ngân hàng khớp đơn', 'TD', 'Tiền & đặt cọc'),
        WEBHOOK_UNDERPAID: _aMeta('Giao dịch ngân hàng chuyển thiếu', 'XH', 'Tiền & đặt cọc'),
        WEBHOOK_OVERPAID: _aMeta('Giao dịch ngân hàng chuyển thừa', 'CB', 'Tiền & đặt cọc'),
        WEBHOOK_UNMATCHED: _aMeta('Giao dịch ngân hàng không khớp đơn', 'CB', 'Tiền & đặt cọc'),
        CONFIRM_DEPOSIT: _aMeta('Xác nhận đặt cọc', 'TD', 'Tiền & đặt cọc'),
        APPROVE_DEPOSIT: _aMeta('Duyệt đặt cọc', 'TD', 'Tiền & đặt cọc'),
        REJECT_DEPOSIT: _aMeta('Từ chối đặt cọc', 'XH', 'Tiền & đặt cọc'),
        EXPENSE_ADD: _aMeta('Thêm khoản chi', 'XH', 'Tiền & đặt cọc'),
        EXPENSE_UPDATE: _aMeta('Cập nhật khoản chi', 'CN', 'Tiền & đặt cọc'),
        EXPENSE_DELETE: _aMeta('Xóa khoản chi', 'XH', 'Tiền & đặt cọc'),
        EXPORT_REPORTS: _aMeta('Xuất báo cáo doanh thu', 'TD', 'Tiền & đặt cọc'),
        // Hội viên & điểm
        ADJUST_POINTS: _aMeta('Điều chỉnh điểm', 'CN', 'Hội viên & điểm'),
        CRM_CUSTOMER_UPDATE: _aMeta('Cập nhật hồ sơ khách hàng', 'CN', 'Hội viên & điểm'),
        CRM_UPDATE: _aMeta('Cập nhật hồ sơ khách', 'CN', 'Hội viên & điểm'),
        UPDATE_MEMBER: _aMeta('Cập nhật hội viên', 'CN', 'Hội viên & điểm'),
        UPDATE_PROFILE: _aMeta('Cập nhật hồ sơ cá nhân', 'CN', 'Hội viên & điểm'),
        USER_EDIT: _aMeta('Sửa thông tin hội viên', 'CN', 'Hội viên & điểm'),
        // Giá & voucher
        UPDATE_PRICING: _aMeta('Cập nhật giá sân', 'CN', 'Giá & voucher'),
        UPDATE_PRICE: _aMeta('Cập nhật giá sân', 'CN', 'Giá & voucher'),
        PRICE_UPDATE: _aMeta('Cập nhật giá sân', 'CN', 'Giá & voucher'),
        VOUCHER_SAVE: _aMeta('Lưu voucher', 'CN', 'Giá & voucher'),
        VOUCHER_CREATE: _aMeta('Tạo voucher', 'TD', 'Giá & voucher'),
        VOUCHER_UPDATE: _aMeta('Cập nhật voucher', 'CN', 'Giá & voucher'),
        VOUCHER_DELETE: _aMeta('Xóa voucher', 'XH', 'Giá & voucher'),
        VOUCHER_TOGGLE: _aMeta('Bật/tắt voucher', 'CN', 'Giá & voucher'),
        VOUCHER_TOGGLE_STATUS: _aMeta('Bật/tắt voucher', 'CN', 'Giá & voucher'),
        GOLDEN_HOUR_SAVE: _aMeta('Lưu quy tắc giờ vàng', 'CN', 'Giá & voucher'),
        GOLDEN_HOUR_DELETE: _aMeta('Xóa quy tắc giờ vàng', 'XH', 'Giá & voucher'),
        PACKAGE_SAVE: _aMeta('Lưu gói cố định theo tháng', 'TD', 'Giá & voucher'),
        PACKAGE_DELETE: _aMeta('Xóa gói cố định theo tháng', 'XH', 'Giá & voucher'),
        PACKAGE_TOGGLE: _aMeta('Bật/tắt gói cố định theo tháng', 'CN', 'Giá & voucher'),
        // Sân & Lịch đặt
        WALKIN_BOOKING: _aMeta('Tạo đơn tại quầy', 'TD', 'Sân & Lịch đặt'),
        WALKIN_PAST_SLOT: _aMeta('Duyệt đặt sân quá khứ', 'CB', 'Sân & Lịch đặt'),
        CHECKIN: _aMeta('Check-in nhận sân', 'CN', 'Sân & Lịch đặt'),
        COMPLETE_BOOKING: _aMeta('Hoàn tất đơn đặt sân', 'TD', 'Sân & Lịch đặt'),
        CANCEL_BOOKING: _aMeta('Hủy đơn đặt sân', 'XH', 'Sân & Lịch đặt'),
        EARLY_CANCEL: _aMeta('Hủy đơn sớm', 'XH', 'Sân & Lịch đặt'),
        RESTORE_BOOKING: _aMeta('Khôi phục đơn', 'TD', 'Sân & Lịch đặt'),
        NOSHOW_RELEASE_SLOT: _aMeta('Nhả sân khách vắng', 'CB', 'Sân & Lịch đặt'),
        TRANSFER_PITCH: _aMeta('Chuyển sân đặt', 'CN', 'Sân & Lịch đặt'),
        ADD_SERVICE: _aMeta('Thêm dịch vụ vào đơn', 'TD', 'Sân & Lịch đặt'),
        ADD_OVERTIME: _aMeta('Thêm giờ đá', 'TD', 'Sân & Lịch đặt'),
        BOOKING_BATCH_OP: _aMeta('Thao tác hàng loạt đơn đặt sân', 'CN', 'Sân & Lịch đặt'),
        RECURRING_CREATE: _aMeta('Tạo lịch cố định', 'TD', 'Sân & Lịch đặt'),
        RECURRING_CANCEL: _aMeta('Hủy lịch cố định', 'XH', 'Sân & Lịch đặt'),
        RECURRING_SKIP_DATE: _aMeta('Bỏ qua buổi cố định', 'CB', 'Sân & Lịch đặt'),
        RECURRING_BOOKING: _aMeta('Lịch đặt cố định', 'CN', 'Sân & Lịch đặt'),
        RECURRING_CRON_GENERATE: _aMeta('Tự động tạo lịch cố định', 'TT', 'Sân & Lịch đặt'),
        RECURRING_CONFLICT_SKIP: _aMeta('Bỏ qua lịch bị trùng', 'TT', 'Sân & Lịch đặt'),
        RUN_RECURRING_GEN: _aMeta('Chạy tạo lịch cố định', 'TT', 'Sân & Lịch đặt'),
        WAITLIST_ASSIGN: _aMeta('Gán khách trong danh sách chờ', 'TD', 'Sân & Lịch đặt'),
        WAITLIST_CANCEL: _aMeta('Hủy yêu cầu danh sách chờ', 'XH', 'Sân & Lịch đặt'),
        WAITLIST_NOTIFIED: _aMeta('Thông báo sân trống', 'CN', 'Sân & Lịch đặt'),
        WAITLIST_HOLD_EXPIRED: _aMeta('Hết hạn giữ chỗ danh sách chờ', 'TT', 'Sân & Lịch đặt'),
        MATCHMAKING_MODERATE: _aMeta('Kiểm duyệt tin tìm đội', 'TD', 'Sân & Lịch đặt'),
        MATCHMAKING_CANCEL: _aMeta('Hủy tin tìm đội', 'XH', 'Sân & Lịch đặt'),
        REVIEW_REPLY: _aMeta('Phản hồi đánh giá', 'CN', 'Sân & Lịch đặt'),
        REVIEW_STATUS: _aMeta('Đổi trạng thái đánh giá', 'CN', 'Sân & Lịch đặt'),
        PITCH_STATUS: _aMeta('Đổi trạng thái sân', 'CN', 'Sân & Lịch đặt'),
        PITCH_STATUS_TOGGLE: _aMeta('Đổi trạng thái sân', 'CN', 'Sân & Lịch đặt'),
        TOGGLE_PITCH: _aMeta('Đổi trạng thái sân', 'CN', 'Sân & Lịch đặt'),
        PITCH_UPSERT: _aMeta('Thêm/sửa sân', 'CN', 'Sân & Lịch đặt'),
        SERVICE_UPSERT: _aMeta('Thêm/sửa dịch vụ', 'CN', 'Sân & Lịch đặt'),
        SERVICE_DELETE: _aMeta('Ngừng kinh doanh dịch vụ', 'XH', 'Sân & Lịch đặt'),
        INVENTORY_RESTOCK: _aMeta('Nhập thêm hàng tồn', 'TD', 'Sân & Lịch đặt'),
        MAINTENANCE_ADD: _aMeta('Thêm lịch bảo trì', 'TD', 'Sân & Lịch đặt'),
        MAINTENANCE_UPDATE: _aMeta('Cập nhật lịch bảo trì', 'CN', 'Sân & Lịch đặt'),
        AUTO_CANCEL_EXPIRED: _aMeta('Tự động hủy đơn quá hạn', 'TT', 'Sân & Lịch đặt'),
        AUTO_CLOSE_PAST_BOOKINGS: _aMeta('Tự động đóng đơn quá ngày', 'TT', 'Sân & Lịch đặt'),
        AUTO_NOSHOW_15M: _aMeta('Tự động xử lý khách vắng mặt (quá 15p)', 'TT', 'Sân & Lịch đặt'),
        AUTO_NOSHOW_15M_UNPAID: _aMeta('Tự động hủy đơn chưa cọc quá giờ đá', 'TT', 'Sân & Lịch đặt'),
        CRON_IN_PLAY_UNPAID: _aMeta('Cảnh báo ca quá giờ chưa tất toán', 'TT', 'Sân & Lịch đặt'),
        CRON_COMPLETE_OVERDUE_IN_PLAY: _aMeta('Tự động hoàn tất ca quá giờ', 'TT', 'Sân & Lịch đặt'),
        ADMIN_RUN_AUTO_RELEASE: _aMeta('Chạy nhả đơn quá hạn thủ công', 'TT', 'Sân & Lịch đặt'),
        RUN_REMINDERS: _aMeta('Chạy nhắc lịch', 'TT', 'Sân & Lịch đặt'),
        // Cài đặt
        UPDATE_SETTINGS: _aMeta('Cập nhật cài đặt hệ thống', 'CN', 'Cài đặt'),
        SYSTEM_SETTINGS: _aMeta('Cập nhật cài đặt hệ thống', 'CN', 'Cài đặt'),
        UPDATE_INFO: _aMeta('Sửa thông tin hệ thống', 'CN', 'Cài đặt'),
        DATABASE_BACKUP: _aMeta('Sao lưu cơ sở dữ liệu', 'TT', 'Cài đặt'),
        DB_BACKUP: _aMeta('Sao lưu cơ sở dữ liệu', 'TT', 'Cài đặt'),
        TELEGRAM_TEST: _aMeta('Kiểm tra kết nối Telegram', 'TT', 'Cài đặt'),
        SAMPLE_DATA_CLEAN: _aMeta('Dọn dữ liệu mẫu', 'XH', 'Cài đặt'),
        SAMPLE_DATA_SEED: _aMeta('Tạo dữ liệu mẫu', 'TT', 'Cài đặt'),
        // Nhân sự & Bảo mật
        STAFF_CREATE: _aMeta('Tạo tài khoản nhân sự', 'TD', 'Nhân sự & Bảo mật'),
        STAFF_ROLE_CHANGE: _aMeta('Đổi vai trò nhân sự', 'CB', 'Nhân sự & Bảo mật'),
        STAFF_STATUS_CHANGE: _aMeta('Đổi trạng thái nhân sự', 'CN', 'Nhân sự & Bảo mật'),
        STAFF_RESET_PASSWORD: _aMeta('Đặt lại mật khẩu nhân sự', 'CB', 'Nhân sự & Bảo mật'),
        CHANGE_PASSWORD: _aMeta('Đổi mật khẩu', 'CB', 'Nhân sự & Bảo mật'),
        FORGOT_PASSWORD_REQUEST: _aMeta('Yêu cầu khôi phục mật khẩu', 'CB', 'Nhân sự & Bảo mật'),
        ENABLE_2FA: _aMeta('Bật xác thực 2 bước', 'TD', 'Nhân sự & Bảo mật'),
        DISABLE_2FA: _aMeta('Tắt xác thực 2 bước', 'XH', 'Nhân sự & Bảo mật'),
        '2FA_TOGGLE': _aMeta('Thay đổi xác thực 2 bước', 'CB', 'Nhân sự & Bảo mật'),
        DB_BACKUP_DOWNLOAD: _aMeta('Tải bản sao lưu cơ sở dữ liệu', 'CB', 'Nhân sự & Bảo mật'),
        AUDIT_REVIEW: _aMeta('Hậu kiểm nhật ký quản trị', 'TD', 'Nhân sự & Bảo mật'),
        EXPORT_CSV: _aMeta('Xuất dữ liệu CSV', 'CB', 'Nhân sự & Bảo mật'),
        SENSITIVE_DATA_ACCESS: _aMeta('Truy cập dữ liệu nhạy cảm', 'CB', 'Nhân sự & Bảo mật')
    },
    fieldLabels: {
        status: 'Trạng thái', payment_status: 'Trạng thái thu tiền', paid_amount: 'Đã thu',
        total_amount: 'Tổng tiền', deposit_amount: 'Tiền cọc', discount_amount: 'Giảm giá',
        points: 'Điểm tích lũy', loyalty_points: 'Điểm tích lũy', tier: 'Hạng hội viên',
        role: 'Phân quyền', is_active: 'Kích hoạt', is_2fa_enabled: 'Xác thực 2FA',
        staff_counted_cash: 'NV đếm quỹ', actual_cash_received: 'Tiền mặt thực nhận',
        discrepancy_amount: 'Chênh lệch quỹ', admin_note: 'Ghi chú quản lý', note: 'Ghi chú',
        reason: 'Lý do', pitch_id: 'Sân', booking_date: 'Ngày đá', start_time: 'Giờ bắt đầu',
        end_time: 'Giờ kết thúc', price: 'Đơn giá', hourly_rate: 'Giá theo giờ',
        value: 'Giá trị', max_uses: 'Lượt dùng tối đa', customer_name: 'Tên khách hàng',
        customer_phone: 'Số điện thoại', cash_received: 'Tiền mặt', transfer_received: 'Chuyển khoản'
    }
};

const adminLogState = {
    page: 1, limit: 25, total: 0, totalPages: 1, latestId: 0,
    staffId: '', actionType: '', dataGroup: '', fromDate: '', toDate: '',
    search: '', quickFilter: '', categories: [], logs: [],
    revealedMap: {}, expandedDiffs: {}, expandedJson: {}, openReviewId: null,
    summaryAbort: null, listAbort: null, searchTimer: null, pollTimer: null,
    urlHydrated: false, pluginsReady: false
};

const AUDIT_INPUT_BINDINGS = [
    ['admin-log-filter-staff', 'staffId'],
    ['admin-log-filter-action', 'actionType'],
    ['admin-log-filter-datagroup', 'dataGroup'],
    ['admin-log-filter-from', 'fromDate'],
    ['admin-log-filter-to', 'toDate'],
    ['admin-log-search', 'search']
];

function auditEsc(str) {
    if (typeof window !== 'undefined' && typeof window.escapeHTML === 'function') return window.escapeHTML(str);
    return String(str ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function maskAuditPhone(text) {
    if (text === null || text === undefined) return '';
    return String(text).replace(/(?<!\d)(0\d{2})\d{4,6}(\d{3})(?!\d)/g, '$1***$2');
}

function getVnDateParts(dateObj) {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(dateObj);
    return Object.fromEntries(parts.map((p) => [p.type, p.value]));
}

function formatAuditDateTime(raw) {
    if (!raw) return '—';
    const str = String(raw).trim();
    if (/^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}/.test(str)) return str.slice(0, 16);
    const d = new Date(str.includes(' ') && !str.includes('T') ? str.replace(' ', 'T') + '+07:00' : str);
    if (Number.isNaN(d.getTime())) return str;
    const p = getVnDateParts(d);
    return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

function getAuditDateKey(raw) {
    const m = formatAuditDateTime(raw).match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}

function formatAuditDayDivider(dateKey) {
    if (!dateKey) return 'Khác';
    const fmtKey = (ms) => { const p = getVnDateParts(new Date(ms)); return `${p.year}-${p.month}-${p.day}`; };
    const [y, m, d] = dateKey.split('-');
    const vnDate = `${d}/${m}/${y}`;
    if (dateKey === fmtKey(Date.now())) return `Hôm nay, ${vnDate}`;
    if (dateKey === fmtKey(Date.now() - 86400000)) return `Hôm qua, ${vnDate}`;
    return vnDate;
}

function validateAuditReasonClient(reason, minLen = 10) {
    const clean = String(reason || '').trim();
    if (Array.from(clean).length < minLen) return { valid: false, error: `Vui lòng nhập ghi chú hậu kiểm tối thiểu ${minLen} ký tự.` };
    const compact = clean.replace(/\s+/gu, '').toLowerCase();
    if (new Set(Array.from(compact)).size < 4 || /(.)\1{4,}/u.test(compact)) {
        return { valid: false, error: 'Ghi chú hậu kiểm không hợp lệ (không nhập ký tự lặp vô nghĩa).' };
    }
    for (let len = 2; len <= 3; len++) {
        const u = compact.slice(0, len);
        if (u.length === len && compact.length >= len * 3 && u.repeat(Math.ceil(compact.length / len)).slice(0, compact.length) === compact) {
            return { valid: false, error: 'Ghi chú hậu kiểm không được lặp chuỗi vô nghĩa.' };
        }
    }
    return { valid: true, clean };
}

function resolveActionMeta(actionCode, row = {}) {
    const key = String(actionCode || '').trim();
    const hit = ADMIN_LOG_CATALOG.actions[key] || ADMIN_LOG_CATALOG.actions[key.toUpperCase()] || null;
    const cat = ADMIN_LOG_CATEGORIES[row.category] ? row.category : (hit?.category || 'CN');
    return {
        label: row.action_label || hit?.label || key || 'Thao tác khác',
        category: cat,
        categoryMeta: ADMIN_LOG_CATEGORIES[cat] || ADMIN_LOG_CATEGORIES.CN,
        dataGroup: row.data_group || hit?.dataGroup || 'Khác',
        registered: row.action_registered !== undefined ? Boolean(row.action_registered) : Boolean(hit)
    };
}

function normalizeLogApiUrl(path) {
    if (typeof window !== 'undefined' && typeof window.normalizeAdminApiUrl === 'function') return window.normalizeAdminApiUrl(path);
    if (typeof window !== 'undefined' && typeof window.getRelativePath === 'function') return window.getRelativePath(path);
    return path.startsWith('/') ? path : `../${path}`;
}

function showAuditToast(msg, type = 'info') {
    if (typeof window !== 'undefined' && window.SanBongApp?.showToast) window.SanBongApp.showToast(msg, type);
}

async function auditApiRequest(path, options = {}) {
    const headers = Object.assign({ Accept: 'application/json' }, options.headers || {});
    if (typeof window !== 'undefined' && window.CSRF_TOKEN && !headers['X-CSRF-Token']) headers['X-CSRF-Token'] = window.CSRF_TOKEN;
    const fetchOpts = { method: options.method || 'GET', credentials: 'same-origin', headers, signal: options.signal };
    if (options.body !== undefined) {
        fetchOpts.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
        if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(normalizeLogApiUrl(path), fetchOpts);
    if (res.status === 401) {
        if (typeof window !== 'undefined' && window.location) window.location.href = normalizeLogApiUrl('login?redirect=portal-admin');
        const err = new Error('Phiên đăng nhập đã hết hạn.');
        err.status = 401;
        throw err;
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
        const msg = json?.error?.message || json?.message || (res.status === 403 ? 'Chỉ Admin mới có quyền xem Nhật ký quản trị.' : `Lỗi máy chủ (${res.status})`);
        const err = new Error(msg);
        err.status = res.status;
        throw err;
    }
    return json;
}

function buildAuditFilterParams(includePagination = true) {
    const p = new URLSearchParams();
    if (includePagination) { p.set('page', String(adminLogState.page)); p.set('limit', String(adminLogState.limit)); }
    if (adminLogState.staffId) p.set('admin_id', adminLogState.staffId);
    if (adminLogState.actionType) p.set('action_type', adminLogState.actionType);
    if (adminLogState.dataGroup) p.set('data_group', adminLogState.dataGroup);
    if (adminLogState.fromDate) p.set('from_date', adminLogState.fromDate);
    if (adminLogState.toDate) p.set('to_date', adminLogState.toDate);
    if (adminLogState.search) p.set('search', adminLogState.search);
    if (adminLogState.categories.length) p.set('categories', adminLogState.categories.join(','));
    if (adminLogState.quickFilter) p.set('quick_filter', adminLogState.quickFilter);
    return p;
}

function hydrateAdminLogFiltersFromUrl() {
    if (adminLogState.urlHydrated || typeof window === 'undefined' || !window.location?.search) return;
    adminLogState.urlHydrated = true;
    const sp = new URLSearchParams(window.location.search);
    [['admin_id', 'staffId'], ['action_type', 'actionType'], ['data_group', 'dataGroup'], ['from_date', 'fromDate'],
     ['to_date', 'toDate'], ['search', 'search'], ['quick_filter', 'quickFilter']].forEach(([q, k]) => {
        if (sp.get(q)) adminLogState[k] = sp.get(q);
    });
    if (sp.get('categories')) {
        adminLogState.categories = sp.get('categories').split(',').map((c) => c.trim().toUpperCase()).filter((c) => Boolean(ADMIN_LOG_CATEGORIES[c]));
    }
    if (['10', '25', '50', '100'].includes(sp.get('limit'))) adminLogState.limit = Number(sp.get('limit'));
    if (sp.get('page')) adminLogState.page = Math.max(1, Number(sp.get('page')) || 1);
}

function syncAdminLogInputsFromState() {
    AUDIT_INPUT_BINDINGS.forEach(([id, key]) => {
        const el = document.getElementById(id);
        if (el && el.value !== adminLogState[key]) el.value = adminLogState[key];
    });
    const lim = document.getElementById('admin-log-limit-select');
    if (lim) lim.value = String(adminLogState.limit);
    const clr = document.getElementById('admin-log-search-clear');
    if (clr) clr.classList.toggle('hidden', !adminLogState.search);
    document.querySelectorAll('#admin-log-category-chips .audit-chip').forEach((btn) => {
        const active = adminLogState.categories.includes(btn.getAttribute('data-cat'));
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    document.querySelectorAll('#admin-log-kpi-grid .audit-kpi-card').forEach((card) => {
        const active = (card.getAttribute('data-quick') || '') === adminLogState.quickFilter;
        card.classList.toggle('active', active);
        card.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}

function readAdminLogInputsToState() {
    AUDIT_INPUT_BINDINGS.forEach(([id, key]) => {
        const el = document.getElementById(id);
        if (el) adminLogState[key] = el.value.trim();
    });
    const clr = document.getElementById('admin-log-search-clear');
    if (clr) clr.classList.toggle('hidden', !adminLogState.search);
}

function syncAdminLogUrlParams() {
    if (typeof window === 'undefined' || !window.history?.replaceState) return;
    const cur = new URLSearchParams(window.location.search);
    if (cur.get('tab') !== 'logs') return;
    const next = new URLSearchParams();
    next.set('tab', 'logs');
    for (const [k, v] of buildAuditFilterParams(true).entries()) {
        if ((k === 'page' && v === '1') || (k === 'limit' && v === '25')) continue;
        next.set(k, v);
    }
    window.history.replaceState(null, '', `${window.location.pathname}?${next.toString()}`);
}

function initAdminLogPlugins() {
    if (adminLogState.pluginsReady) return;
    adminLogState.pluginsReady = true;
    const root = typeof document !== 'undefined' ? document.getElementById('tab-content-logs') : null;
    if (root && typeof window !== 'undefined' && window.SanBongDatePicker?.init) window.SanBongDatePicker.init(root);
    startAdminLogAutoCheck();
}

function updateAuditTimestamp() {
    const el = document.getElementById('admin-log-updated-at');
    if (!el) return;
    const p = getVnDateParts(new Date());
    el.textContent = `Cập nhật ${p.hour}:${p.minute}`;
}

async function loadAdminLogSummary() {
    if (adminLogState.summaryAbort) adminLogState.summaryAbort.abort();
    adminLogState.summaryAbort = new AbortController();
    try {
        const qs = buildAuditFilterParams(false).toString();
        const res = await auditApiRequest(`api/admin.php?action=audit_summary${qs ? '&' + qs : ''}`, { signal: adminLogState.summaryAbort.signal });
        const d = res.data || {};
        const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        setTxt('audit-kpi-total-val', Number(d.total_actions || 0).toLocaleString('vi-VN'));
        setTxt('audit-kpi-total-sub', (d.period && d.period.is_today === false) ? 'Theo bộ lọc đang chọn' : 'Hôm nay (theo giờ VN)');
        const unrev = Number(d.unreviewed_anomalies || 0);
        setTxt('audit-kpi-anomaly-val', unrev.toLocaleString('vi-VN'));
        const anoCard = document.getElementById('audit-kpi-anomaly');
        if (anoCard) anoCard.classList.toggle('is-alert-red', unrev > 0);
        setTxt('audit-kpi-finance-val', Number(d.finance_cash_count || 0).toLocaleString('vi-VN'));
        setTxt('audit-kpi-shifts-val', Number(d.shift_count || 0).toLocaleString('vi-VN'));
        const shiftSub = document.getElementById('audit-kpi-shifts-sub');
        if (shiftSub) {
            const st = d.latest_shift_status || {};
            shiftSub.textContent = st.text || 'Chưa có ca trực trong kỳ';
            shiftSub.style.color = st.level === 'danger' ? 'var(--r)' : (st.level === 'warning' ? 'var(--y)' : (st.level === 'ok' ? 'var(--g)' : 'var(--n)'));
        }
        if (d.latest_id && Number(d.latest_id) > adminLogState.latestId) adminLogState.latestId = Number(d.latest_id);
        updateAuditTimestamp();
    } catch (err) {
        if (err.name !== 'AbortError') { /* giữ nguyên KPI gần nhất */ }
    }
}

function populateAuditFilterOptions(staffList = [], actionTypes = []) {
    const staffSel = document.getElementById('admin-log-filter-staff');
    if (staffSel && Array.isArray(staffList) && staffList.length) {
        const cur = adminLogState.staffId || staffSel.value;
        staffSel.innerHTML = '<option value="">Tất cả nhân sự</option>' + staffList.map((s) => {
            const name = s.full_name || s.username || ('NV #' + s.id);
            return `<option value="${auditEsc(s.id)}">${auditEsc(s.role ? `${name} (${s.role})` : name)}</option>`;
        }).join('');
        staffSel.value = cur;
    }
    const actSel = document.getElementById('admin-log-filter-action');
    if (actSel) {
        const curAct = adminLogState.actionType || actSel.value;
        let html = '<option value="">Tất cả thao tác</option><optgroup label="Theo nhóm nghiệp vụ">';
        ADMIN_LOG_DATA_GROUPS.filter((g) => g !== 'Khác').forEach((dg) => {
            html += `<option value="__group__:${auditEsc(dg)}">Nhóm: ${auditEsc(dg)}</option>`;
        });
        html += '<option value="__group__:automation">Nhóm: Tự động hệ thống (TT)</option></optgroup><optgroup label="Chi tiết mã thao tác">';
        const codes = new Set([...(Array.isArray(actionTypes) ? actionTypes : []), ...Object.keys(ADMIN_LOG_CATALOG.actions)]);
        Array.from(codes).sort().forEach((code) => {
            html += `<option value="${auditEsc(code)}">${auditEsc(resolveActionMeta(code).label)} [${auditEsc(code)}]</option>`;
        });
        html += '</optgroup>';
        actSel.innerHTML = html;
        actSel.value = curAct;
    }
}
const populateAdminLogFilters = populateAuditFilterOptions;

function setAdminLogViewState(mode, errorMsg = '') {
    [['admin-log-loading', 'loading'], ['admin-log-error', 'error'], ['admin-log-empty', 'empty'],
     ['admin-log-table-container', 'ready']].forEach(([id, target]) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('hidden', mode !== target);
    });
    const pgEl = document.getElementById('admin-log-pagination');
    if (pgEl) pgEl.classList.toggle('hidden', mode !== 'ready' && mode !== 'empty');
    if (mode === 'error') {
        const msgEl = document.getElementById('admin-log-error-msg');
        if (msgEl) msgEl.textContent = errorMsg || 'Không thể tải dữ liệu nhật ký.';
    }
}

function renderAuditDiffBlock(row) {
    const meta = resolveActionMeta(row.action, row);
    const diffs = Array.isArray(row.diffs) ? row.diffs : [];
    const maxInline = 2;
    let html = `<div class="audit-detail-summary">${auditEsc(maskAuditPhone(row.formatted_message || meta.label))}</div>`;
    if (diffs.length) {
        const isExp = Boolean(adminLogState.expandedDiffs[row.id]);
        html += '<div class="audit-diff-list">' + (isExp ? diffs : diffs.slice(0, maxInline)).map((df) => {
            const fLabel = df.label || ADMIN_LOG_CATALOG.fieldLabels[df.field] || df.field || 'Giá trị';
            return `<div class="audit-diff-item"><span class="audit-diff-key">${auditEsc(fLabel)}:</span> <del class="audit-diff-old">${auditEsc(maskAuditPhone(df.old ?? '—'))}</del> <span aria-hidden="true">→</span> <ins class="audit-diff-new">${auditEsc(maskAuditPhone(df.new ?? '—'))}</ins></div>`;
        }).join('') + '</div>';
        if (diffs.length > maxInline) {
            html += `<button type="button" class="audit-inline-link" onclick="toggleAuditDiffExpand(${Number(row.id)})">${isExp ? 'Thu gọn thay đổi' : `+${diffs.length - maxInline} thay đổi nữa`}</button>`;
        }
    } else if (meta.dataGroup === 'Khác' && (row.old_value || row.new_value)) {
        const openJson = Boolean(adminLogState.expandedJson[row.id]);
        html += `<button type="button" class="audit-inline-link" onclick="toggleAuditJsonExpand(${Number(row.id)})">${openJson ? 'Ẩn JSON chi tiết' : 'Xem JSON chi tiết'}</button>`;
        if (openJson) html += `<pre class="audit-json-pre">${auditEsc(maskAuditPhone(JSON.stringify({ old: row.old_value, new: row.new_value }, null, 2)))}</pre>`;
    }
    return html;
}

function renderAuditReviewCell(row) {
    const reasons = Array.isArray(row.anomaly_reasons) ? row.anomaly_reasons : [];
    let html = Number(row.is_anomaly) === 1
        ? `<div class="mb-1"><span class="audit-anomaly-badge" title="${auditEsc(reasons.join('; ') || 'Thao tác vượt ngưỡng kiểm soát')}">Bất thường</span><div class="audit-anomaly-reason">${auditEsc(reasons[0] || '')}</div></div>`
        : '';
    if (row.review) {
        const revTime = formatAuditDateTime(row.review.created_at_formatted || row.review.created_at);
        return html + `<div class="audit-review-done"><span class="audit-reviewed-badge">Đã hậu kiểm</span><div class="audit-review-note">${auditEsc(row.review.note)}</div><div class="audit-review-meta">${auditEsc(row.review.reviewer_name || 'Admin')} · ${auditEsc(revTime)}</div></div>`;
    }
    if (adminLogState.openReviewId === Number(row.id)) {
        return html + `<div class="audit-review-editor"><textarea id="audit-review-input-${Number(row.id)}" class="audit-review-textarea" rows="2" placeholder="Nhập ghi chú hậu kiểm (>= 10 ký tự)..."></textarea><div class="audit-review-actions"><button type="button" id="audit-review-submit-${Number(row.id)}" class="audit-btn-save" onclick="submitAuditReview(${Number(row.id)})">Lưu hậu kiểm</button><button type="button" class="audit-btn-cancel" onclick="toggleAuditReviewEditor(${Number(row.id)}, false)">Hủy</button></div></div>`;
    }
    return html + `<button type="button" class="audit-btn-mark" onclick="toggleAuditReviewEditor(${Number(row.id)}, true)">Hậu kiểm</button>`;
}

function renderAdminLogRows(logs = []) {
    const tbody = document.getElementById('admin-log-tbody');
    if (!tbody) return;
    let html = '';
    let prevDateKey = '';
    logs.forEach((rawRow) => {
        const revealed = adminLogState.revealedMap[rawRow.id];
        const row = revealed ? Object.assign({}, rawRow, revealed) : rawRow;
        const meta = resolveActionMeta(row.action, row);
        const dateKey = getAuditDateKey(row.created_at_formatted || row.created_at);
        if (dateKey && dateKey !== prevDateKey) {
            prevDateKey = dateKey;
            html += `<tr class="audit-day-divider"><td colspan="5">${auditEsc(formatAuditDayDivider(dateKey))}</td></tr>`;
        }
        const objStr = revealed ? (row.object_code || row.object_display || '') : (row.object_display || maskAuditPhone(row.object_code || ''));
        const revealBtn = row.has_sensitive_phone && !revealed ? ` <button type="button" class="audit-inline-link" onclick="revealAuditSensitive(${Number(row.id)})">Xem chi tiết</button>` : '';
        html += `<tr class="${Number(row.is_anomaly) === 1 && !row.review ? 'audit-row-anomaly' : ''}" data-log-id="${Number(row.id)}">
            <td class="audit-td-time"><div class="audit-time-main">${auditEsc(formatAuditDateTime(row.created_at_formatted || row.created_at))}</div><div class="audit-ip">${auditEsc(row.ip || '—')}</div></td>
            <td><div class="audit-actor-name">${auditEsc(row.actor_name || row.actor_username || 'Hệ thống')}</div><div class="audit-actor-role">${auditEsc(row.actor_role || 'system')}</div></td>
            <td><span class="audit-cat-badge ${auditEsc(meta.categoryMeta.badgeClass)}">${auditEsc(meta.category)} · ${auditEsc(meta.categoryMeta.label)}</span><div class="audit-action-label">${auditEsc(meta.label)}</div><div class="audit-data-group">${auditEsc(meta.dataGroup)}</div></td>
            <td>${objStr ? `<div class="audit-obj-row"><span class="audit-obj-code">${auditEsc(objStr)}</span>${revealBtn}</div>` : ''}${renderAuditDiffBlock(row)}</td>
            <td>${renderAuditReviewCell(row)}</td></tr>`;
    });
    tbody.innerHTML = html;
}

function renderAdminLogPagination() {
    const p = adminLogState.page, tp = Math.max(1, adminLogState.totalPages || 1), tot = Number(adminLogState.total || 0);
    const start = tot === 0 ? 0 : (p - 1) * adminLogState.limit + 1, end = tot === 0 ? 0 : Math.min(tot, p * adminLogState.limit);
    const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setTxt('admin-log-range-summary', `Hiển thị ${start}–${end} / ${tot} bản ghi`);
    setTxt('admin-log-page-current', String(p));
    setTxt('admin-log-page-total', String(tp));
    setTxt('admin-log-total-count', String(tot));
    const prev = document.getElementById('admin-log-prev-btn'), next = document.getElementById('admin-log-next-btn');
    if (prev) prev.disabled = p <= 1;
    if (next) next.disabled = p >= tp;
    const nums = document.getElementById('admin-log-page-numbers');
    if (nums) {
        const from = Math.max(1, p - 2), to = Math.min(tp, from + 4);
        nums.innerHTML = Array.from({ length: to - from + 1 }, (_, i) => from + i).map((i) =>
            `<button type="button" class="audit-page-btn${i === p ? ' active' : ''}" onclick="loadAdminLogs(${i})" aria-current="${i === p ? 'page' : 'false'}">${i}</button>`
        ).join('');
    }
}

async function loadAdminLogs(page = 1) {
    if (!adminLogState.urlHydrated) hydrateAdminLogFiltersFromUrl();
    else readAdminLogInputsToState();
    initAdminLogPlugins();
    adminLogState.page = Math.max(1, Number(page) || 1);
    syncAdminLogInputsFromState();
    syncAdminLogUrlParams();
    hideAuditNewBanner();
    setAdminLogViewState('loading');
    if (adminLogState.listAbort) adminLogState.listAbort.abort();
    adminLogState.listAbort = new AbortController();
    loadAdminLogSummary();
    try {
        const res = await auditApiRequest(`api/admin.php?action=audit_logs&${buildAuditFilterParams(true).toString()}`, { signal: adminLogState.listAbort.signal });
        const d = res.data || {}, pg = d.pagination || {};
        adminLogState.logs = Array.isArray(d.logs) ? d.logs : [];
        adminLogState.page = Number(pg.page || adminLogState.page);
        adminLogState.total = Number(pg.total ?? adminLogState.logs.length);
        adminLogState.totalPages = Number(pg.totalPages || Math.max(1, Math.ceil(adminLogState.total / adminLogState.limit)));
        if (d.latest_id && Number(d.latest_id) > adminLogState.latestId) adminLogState.latestId = Number(d.latest_id);
        populateAuditFilterOptions(d.staffList || [], d.actionTypes || []);
        if (!adminLogState.logs.length) { setAdminLogViewState('empty'); renderAdminLogPagination(); return; }
        renderAdminLogRows(adminLogState.logs);
        renderAdminLogPagination();
        setAdminLogViewState('ready');
        updateAuditTimestamp();
    } catch (err) {
        if (err.name !== 'AbortError') setAdminLogViewState('error', err.message || 'Lỗi tải nhật ký quản trị.');
    }
}

function refreshAdminLogsAll() { loadAdminLogs(1); }
function handleAdminLogFilterChange() { readAdminLogInputsToState(); loadAdminLogs(1); }
function handleAdminLogSearchDebounced() {
    readAdminLogInputsToState();
    if (adminLogState.searchTimer) clearTimeout(adminLogState.searchTimer);
    adminLogState.searchTimer = setTimeout(() => loadAdminLogs(1), 300);
}
function clearAdminLogSearch() {
    const el = document.getElementById('admin-log-search');
    if (el) el.value = '';
    adminLogState.search = '';
    loadAdminLogs(1);
}
function toggleAuditCategoryChip(catCode) {
    if (!ADMIN_LOG_CATEGORIES[catCode]) return;
    const idx = adminLogState.categories.indexOf(catCode);
    if (idx >= 0) adminLogState.categories.splice(idx, 1); else adminLogState.categories.push(catCode);
    loadAdminLogs(1);
}
function toggleAuditQuickFilter(quickKey) { adminLogState.quickFilter = adminLogState.quickFilter === quickKey ? '' : quickKey; loadAdminLogs(1); }
function resetAdminLogFilters() {
    Object.assign(adminLogState, { staffId: '', actionType: '', dataGroup: '', fromDate: '', toDate: '', search: '', quickFilter: '', categories: [] });
    syncAdminLogInputsFromState();
    loadAdminLogs(1);
}
function handleAdminLogLimitChange(val) { adminLogState.limit = [10, 25, 50, 100].includes(Number(val)) ? Number(val) : 25; loadAdminLogs(1); }
function prevAdminLogPage() { if (adminLogState.page > 1) loadAdminLogs(adminLogState.page - 1); }
function nextAdminLogPage() { if (adminLogState.page < adminLogState.totalPages) loadAdminLogs(adminLogState.page + 1); }
function toggleAuditDiffExpand(logId) { adminLogState.expandedDiffs[logId] = !adminLogState.expandedDiffs[logId]; renderAdminLogRows(adminLogState.logs); }
function toggleAuditJsonExpand(logId) { adminLogState.expandedJson[logId] = !adminLogState.expandedJson[logId]; renderAdminLogRows(adminLogState.logs); }
function toggleAuditReviewEditor(logId, open) {
    adminLogState.openReviewId = open ? Number(logId) : null;
    renderAdminLogRows(adminLogState.logs);
    if (open) { const inp = document.getElementById(`audit-review-input-${Number(logId)}`); if (inp) inp.focus(); }
}

async function submitAuditReview(logId) {
    const inp = document.getElementById(`audit-review-input-${Number(logId)}`);
    const btn = document.getElementById(`audit-review-submit-${Number(logId)}`);
    const check = validateAuditReasonClient(inp?.value || '', 10);
    if (!check.valid) { showAuditToast(check.error, 'error'); if (inp) inp.focus(); return; }
    if (btn) btn.disabled = true;
    try {
        const res = await auditApiRequest('api/admin.php?action=audit_review', { method: 'POST', body: { log_id: Number(logId), note: check.clean } });
        const row = adminLogState.logs.find((r) => Number(r.id) === Number(logId));
        if (row) row.review = res.data || { note: check.clean, reviewer_name: 'Admin', created_at_formatted: formatAuditDateTime(new Date().toISOString()) };
        adminLogState.openReviewId = null;
        renderAdminLogRows(adminLogState.logs);
        loadAdminLogSummary();
        showAuditToast('Đã lưu ghi chú hậu kiểm.', 'success');
    } catch (err) {
        showAuditToast(err.message || 'Không thể lưu hậu kiểm.', 'error');
        if (btn) btn.disabled = false;
    }
}

async function revealAuditSensitive(logId) {
    try {
        const res = await auditApiRequest(`api/admin.php?action=audit_log_detail&id=${Number(logId)}&reveal=1`);
        if (res.data) { adminLogState.revealedMap[logId] = res.data; renderAdminLogRows(adminLogState.logs); showAuditToast('Đã ghi nhận lượt xem dữ liệu nhạy cảm.', 'info'); }
    } catch (err) { showAuditToast(err.message || 'Không thể mở chi tiết bản ghi.', 'error'); }
}

function exportAdminLogsCsv() {
    readAdminLogInputsToState();
    const qs = buildAuditFilterParams(false).toString();
    const url = normalizeLogApiUrl(`api/admin.php?action=audit_export_csv${qs ? '&' + qs : ''}`);
    if (typeof window !== 'undefined' && window.open) window.open(url, '_blank', 'noopener,noreferrer');
}

function hideAuditNewBanner() { const b = document.getElementById('admin-log-new-banner'); if (b) b.classList.add('hidden'); }

function startAdminLogAutoCheck() {
    if (adminLogState.pollTimer) clearInterval(adminLogState.pollTimer);
    adminLogState.pollTimer = setInterval(async () => {
        if (typeof document === 'undefined' || document.hidden || !adminLogState.latestId) return;
        const pane = document.getElementById('tab-content-logs');
        if (!pane || pane.classList.contains('hidden')) return;
        try {
            const res = await auditApiRequest(`api/admin.php?action=audit_check_new&since_id=${adminLogState.latestId}`);
            const cnt = Number(res.data?.new_count || 0), banner = document.getElementById('admin-log-new-banner'), txt = document.getElementById('admin-log-new-banner-text');
            if (cnt > 0 && banner && txt) { txt.textContent = `Có ${cnt} bản ghi mới — Bấm để tải`; banner.classList.remove('hidden'); }
        } catch (e) { /* bỏ qua lỗi poll tạm thời */ }
    }, 60000);
}

if (typeof window !== 'undefined') {
    Object.assign(window, {
        ADMIN_LOG_CATALOG, ADMIN_LOG_CATEGORIES, ADMIN_LOG_DATA_GROUPS, adminLogState,
        loadAdminLogs, refreshAdminLogsAll, loadAdminLogSummary, handleAdminLogFilterChange,
        handleAdminLogSearchDebounced, clearAdminLogSearch, toggleAuditCategoryChip,
        toggleAuditQuickFilter, resetAdminLogFilters, handleAdminLogLimitChange,
        prevAdminLogPage, nextAdminLogPage, toggleAuditDiffExpand, toggleAuditJsonExpand,
        toggleAuditReviewEditor, submitAuditReview, revealAuditSensitive, exportAdminLogsCsv,
        populateAuditFilterOptions, populateAdminLogFilters, formatAuditDateTime,
        maskAuditPhone, resolveActionMeta, validateAuditReasonClient
    });
}
