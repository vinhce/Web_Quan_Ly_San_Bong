/**
 * Tab 11: Nhật ký hệ thống & thao tác quản trị (Admin Logs UI + Action Catalog).
 */
const ADMIN_LOG_CATEGORIES = {
    TD: { code: 'TD', shortCode: 'TD', key: 'TD', label: 'Tạo/Duyệt', badgeClass: 'audit-cat-td' },
    XH: { code: 'XH', shortCode: 'XHC', key: 'XH', label: 'Xóa/Hủy/Chi tiền', badgeClass: 'audit-cat-xh' },
    CN: { code: 'CN', shortCode: 'CN', key: 'CN', label: 'Cập nhật', badgeClass: 'audit-cat-cn' },
    CB: { code: 'CB', shortCode: 'CB', key: 'CB', label: 'Cảnh báo', badgeClass: 'audit-cat-cb' },
    TQ: { code: 'TQ', shortCode: 'TQ', key: 'TQ', label: 'Tiền quầy', badgeClass: 'audit-cat-tq' },
    TT: { code: 'TT', shortCode: 'TĐ', key: 'TT', label: 'Tự động', badgeClass: 'audit-cat-tt' }
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
        SHIFT_OPEN: _aMeta('Mở ca trực', 'TD', 'Ca trực'),
        OPEN_SHIFT: _aMeta('Mở ca trực', 'TD', 'Ca trực'),
        SHIFT_CLOSE: _aMeta('Đóng ca trực', 'CB', 'Ca trực'),
        CLOSE_SHIFT: _aMeta('Đóng ca trực', 'CB', 'Ca trực'),
        SHIFT_HANDOVER: _aMeta('Giao ca trực', 'CB', 'Ca trực'),
        SHIFT_CONFIRM: _aMeta('Xác nhận chốt ca', 'TD', 'Ca trực'),
        SHIFT_EDIT_COUNT: _aMeta('Sửa số liệu kiểm đếm ca', 'CB', 'Ca trực'),
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
        ADJUST_POINTS: _aMeta('Điều chỉnh điểm', 'CN', 'Hội viên & điểm'),
        CRM_CUSTOMER_UPDATE: _aMeta('Cập nhật hồ sơ khách hàng', 'CN', 'Hội viên & điểm'),
        CRM_UPDATE: _aMeta('Cập nhật hồ sơ khách', 'CN', 'Hội viên & điểm'),
        UPDATE_MEMBER: _aMeta('Cập nhật hội viên', 'CN', 'Hội viên & điểm'),
        UPDATE_PROFILE: _aMeta('Cập nhật hồ sơ cá nhân', 'CN', 'Hội viên & điểm'),
        USER_EDIT: _aMeta('Sửa thông tin hội viên', 'CN', 'Hội viên & điểm'),
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
        UPDATE_SETTINGS: _aMeta('Cập nhật cài đặt hệ thống', 'CN', 'Cài đặt'),
        SYSTEM_SETTINGS: _aMeta('Cập nhật cài đặt hệ thống', 'CN', 'Cài đặt'),
        UPDATE_INFO: _aMeta('Sửa thông tin hệ thống', 'CN', 'Cài đặt'),
        DATABASE_BACKUP: _aMeta('Sao lưu cơ sở dữ liệu', 'TT', 'Cài đặt'),
        DB_BACKUP: _aMeta('Sao lưu cơ sở dữ liệu', 'TT', 'Cài đặt'),
        TELEGRAM_TEST: _aMeta('Kiểm tra kết nối Telegram', 'TT', 'Cài đặt'),
        SAMPLE_DATA_CLEAN: _aMeta('Dọn dữ liệu mẫu', 'XH', 'Cài đặt'),
        SAMPLE_DATA_SEED: _aMeta('Tạo dữ liệu mẫu', 'TT', 'Cài đặt'),
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
    ['admin-log-filter-staff', 'staffId'], ['admin-log-filter-action', 'actionType'],
    ['admin-log-filter-datagroup', 'dataGroup'], ['admin-log-filter-from', 'fromDate'],
    ['admin-log-filter-to', 'toDate'], ['admin-log-search', 'search']
];

const auditById = (id) => (typeof document !== 'undefined' ? document.getElementById(id) : null);
const toggleAuditClass = (el, cls, add) => el?.classList && el.classList[add ? 'add' : 'remove'](cls);
const showAuditToast = (msg, type = 'info') => window?.SanBongApp?.showToast?.(msg, type);

function auditEsc(str) {
    if (typeof window !== 'undefined' && typeof window.escapeHTML === 'function') return window.escapeHTML(str);
    return String(str ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function maskAuditPhone(text) {
    return text == null ? '' : String(text).replace(/(?<!\d)(0\d{2})\d{4,6}(\d{3})(?!\d)/g, '$1***$2');
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
    const fmt = (ms) => { const p = getVnDateParts(new Date(ms)); return `${p.year}-${p.month}-${p.day}`; };
    const [y, m, d] = dateKey.split('-');
    const vn = `${d}/${m}/${y}`;
    if (dateKey === fmt(Date.now())) return `Hôm nay, ${vn}`;
    if (dateKey === fmt(Date.now() - 86400000)) return `Hôm qua, ${vn}`;
    return vn;
}

function parseAuditDateMs(raw) {
    if (!raw) return NaN;
    const s = String(raw).trim();
    const dm = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
    if (dm) return Date.parse(`${dm[3]}-${dm[2]}-${dm[1]}T${dm[4] || '00'}:${dm[5] || '00'}:00+07:00`);
    return Date.parse(s.includes(' ') && !s.includes('T') ? s.replace(' ', 'T') + '+07:00' : s);
}

function formatAuditClockTime(raw) {
    const m = formatAuditDateTime(raw).match(/\s(\d{2}:\d{2})$/);
    return m ? m[1] : formatAuditDateTime(raw);
}

function formatAuditRelativeTime(raw) {
    const ms = parseAuditDateMs(raw);
    if (Number.isNaN(ms)) return '—';
    const diffMin = Math.max(0, Math.floor((Date.now() - ms) / 60000));
    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    const key = getAuditDateKey(raw);
    const fmt = (t) => { const p = getVnDateParts(new Date(t)); return `${p.year}-${p.month}-${p.day}`; };
    if (key === fmt(Date.now()) && diffMin < 1440) return `${Math.floor(diffMin / 60)} giờ trước`;
    if (key === fmt(Date.now() - 86400000)) return 'Hôm qua';
    const dt = formatAuditDateTime(raw);
    return dt.length >= 5 ? dt.slice(0, 5) : dt;
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

function resolveActorRoleInfo(row) {
    const raw = String(row.actor_role || '').trim().toLowerCase();
    if (Number(row.user_id || 0) === 0 || raw === '' || raw === 'system') {
        return { cls: 'role-system', label: row.actor_role_label || 'Hệ thống' };
    }
    const map = { admin: ['role-admin', 'Chủ sân'], manager: ['role-manager', 'Quản lý'], staff: ['role-staff', 'Nhân viên'] };
    const [cls, defLbl] = map[raw] || ['role-staff', raw];
    return { cls, label: row.actor_role_label || defLbl };
}

function resolveObjectTypeLabel(row, meta) {
    if (row.object_type_label) return row.object_type_label;
    const map = {
        shift: 'Ca trực', shifts: 'Ca trực', booking: 'Mã ca', bookings: 'Mã ca',
        user: 'Hội viên', customer: 'Hội viên', member: 'Hội viên', pitch: 'Sân bóng',
        service: 'Dịch vụ', inventory: 'Dịch vụ', voucher: 'Voucher', expense: 'Khoản chi',
        pricing: 'Bảng giá', setting: 'Cài đặt', settings: 'Cài đặt', staff: 'Nhân sự',
        security: 'Bảo mật', bank_transaction: 'Giao dịch', system: 'Hệ thống'
    };
    return map[String(row.target_type || '').toLowerCase()] || (meta?.dataGroup === 'Ca trực' ? 'Ca trực' : 'Hệ thống');
}

function normalizeLogApiUrl(path) {
    if (typeof window !== 'undefined' && typeof window.normalizeAdminApiUrl === 'function') return window.normalizeAdminApiUrl(path);
    if (typeof window !== 'undefined' && typeof window.getRelativePath === 'function') return window.getRelativePath(path);
    return path.startsWith('/') ? path : `../${path}`;
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

function buildAuditFilterParams(page = adminLogState.page, extra = {}) {
    const p = new URLSearchParams({ page: String(page || 1), limit: String(adminLogState.limit || 25) });
    const fields = [
        ['staff_id', adminLogState.staffId], ['action_type', adminLogState.actionType],
        ['data_group', adminLogState.dataGroup], ['from_date', adminLogState.fromDate],
        ['to_date', adminLogState.toDate], ['search', adminLogState.search],
        ['quick_filter', adminLogState.quickFilter], ['categories', adminLogState.categories.join(',')]
    ];
    fields.forEach(([k, v]) => { if (v) p.set(k, v); });
    Object.entries(extra).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, String(v)); });
    return p.toString();
}

function syncAuditChipsUi() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('#admin-log-category-chips .audit-chip').forEach((btn) => {
        btn.setAttribute('aria-pressed', adminLogState.categories.includes(btn.getAttribute('data-cat')) ? 'true' : 'false');
    });
}

function syncAuditKpiPressedUi() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('#admin-log-kpi-grid .audit-kpi-card').forEach((btn) => {
        btn.setAttribute('aria-pressed', adminLogState.quickFilter === (btn.getAttribute('data-quick') || '') ? 'true' : 'false');
    });
}

function syncAuditInputsToDom() {
    AUDIT_INPUT_BINDINGS.forEach(([elId, key]) => {
        const el = auditById(elId);
        if (el && el.value !== adminLogState[key]) el.value = adminLogState[key] || '';
    });
    const limitEl = auditById('admin-log-limit-select');
    if (limitEl) limitEl.value = String(adminLogState.limit || 25);
    toggleAuditClass(auditById('admin-log-search-clear'), 'hidden', !adminLogState.search);
    syncAuditChipsUi();
    syncAuditKpiPressedUi();
}

function hydrateAdminLogFiltersFromUrl() {
    if (adminLogState.urlHydrated) return;
    adminLogState.urlHydrated = true;
    const qs = new URLSearchParams(typeof window !== 'undefined' ? (window.location?.search || '') : '');
    if (!['logs', '11', 'admin-logs'].includes((qs.get('tab') || '').toLowerCase())) return;
    if (qs.get('log_page')) adminLogState.page = Math.max(1, Number(qs.get('log_page')) || 1);
    const lim = Number(qs.get('log_limit'));
    if ([10, 25, 50, 100].includes(lim)) adminLogState.limit = lim;
    [['log_staff', 'staffId'], ['log_action', 'actionType'], ['log_group', 'dataGroup'], ['log_from', 'fromDate'],
        ['log_to', 'toDate'], ['log_q', 'search'], ['log_quick', 'quickFilter']].forEach(([q, k]) => {
        if (qs.get(q)) adminLogState[k] = qs.get(q);
    });
    if (qs.get('log_cats')) {
        adminLogState.categories = qs.get('log_cats').split(',').map((c) => c.trim().toUpperCase()).filter((c) => Boolean(ADMIN_LOG_CATEGORIES[c]));
    }
    syncAuditInputsToDom();
}

function syncAdminLogUrlParams() {
    if (typeof window === 'undefined' || !window.location || !window.history?.replaceState) return;
    const qs = new URLSearchParams(window.location.search || '');
    if (!['logs', '11', 'admin-logs'].includes((qs.get('tab') || '').toLowerCase())) return;
    [['log_page', adminLogState.page > 1 ? String(adminLogState.page) : ''],
        ['log_limit', adminLogState.limit !== 25 ? String(adminLogState.limit) : ''],
        ['log_staff', adminLogState.staffId], ['log_action', adminLogState.actionType],
        ['log_group', adminLogState.dataGroup], ['log_from', adminLogState.fromDate],
        ['log_to', adminLogState.toDate], ['log_q', adminLogState.search],
        ['log_quick', adminLogState.quickFilter], ['log_cats', adminLogState.categories.join(',')]
    ].forEach(([k, v]) => (v ? qs.set(k, v) : qs.delete(k)));
    window.history.replaceState(null, '', `${window.location.pathname || ''}?${qs.toString()}`);
}

function populateAuditFilterOptions(staffList = [], actionTypes = []) {
    const staffEl = auditById('admin-log-filter-staff');
    if (staffEl) {
        let html = '<option value="">Tất cả nhân sự</option>';
        staffList.forEach((s) => {
            const lbl = s.full_name ? `${s.full_name} (${s.username || s.id})` : (s.username || `ID #${s.id}`);
            html += `<option value="${auditEsc(s.id)}">${auditEsc(lbl)}</option>`;
        });
        staffEl.innerHTML = html;
        staffEl.value = adminLogState.staffId || '';
    }
    const actionEl = auditById('admin-log-filter-action');
    if (actionEl) {
        const allCodes = Array.from(new Set([...(actionTypes || []), ...Object.keys(ADMIN_LOG_CATALOG.actions)])).filter(Boolean);
        const byCat = { TD: [], XH: [], CN: [], CB: [], TQ: [], TT: [] };
        allCodes.forEach((code) => {
            const meta = resolveActionMeta(code);
            (byCat[meta.category] || byCat.CN).push({ code, label: meta.label });
        });
        const catOrder = [['TD', 'Tạo / Duyệt'], ['XH', 'Xóa / Hủy / Chi tiền'], ['CN', 'Cập nhật'],
            ['CB', 'Cảnh báo'], ['TQ', 'Tiền quầy'], ['TT', 'Tự động']];
        let html = '<option value="">Tất cả loại hành động</option>';
        catOrder.forEach(([code, title]) => {
            const shortCode = ADMIN_LOG_CATEGORIES[code]?.shortCode || code;
            const items = byCat[code] || [];
            const counts = {};
            items.forEach((it) => { counts[it.label] = (counts[it.label] || 0) + 1; });
            html += `<optgroup label="${auditEsc(`${shortCode} – ${title}`)}"><option value="__cat__:${auditEsc(code)}">${auditEsc(`Tất cả nhóm ${title}`)}</option>`;
            items.forEach((it) => {
                const txt = counts[it.label] > 1 ? `${it.label} (${it.code})` : it.label;
                html += `<option value="${auditEsc(it.code)}">${auditEsc(txt)}</option>`;
            });
            html += '</optgroup>';
        });
        actionEl.innerHTML = html;
        actionEl.value = adminLogState.actionType || '';
    }
    const dgEl = auditById('admin-log-filter-datagroup');
    if (dgEl) dgEl.value = adminLogState.dataGroup || '';
}

function renderAdminLogKpi(data = {}) {
    const unrev = Number(data.unreviewed_anomalies || 0);
    const totalEl = auditById('audit-kpi-total-val');
    const totalSub = auditById('audit-kpi-total-sub');
    const anomEl = auditById('audit-kpi-anomaly-val');
    const finEl = auditById('audit-kpi-finance-val');
    const shiftEl = auditById('audit-kpi-shifts-val');
    const shiftSub = auditById('audit-kpi-shifts-sub');
    if (totalEl) totalEl.textContent = String(data.total_actions ?? 0);
    if (totalSub) totalSub.textContent = data.period?.is_today ? 'Hôm nay (theo giờ VN)' : 'Theo bộ lọc đang chọn';
    if (anomEl) anomEl.textContent = String(unrev);
    toggleAuditClass(auditById('audit-kpi-anomaly'), 'is-alert-red', unrev > 0);
    if (finEl) finEl.textContent = String(data.finance_cash_count ?? 0);
    if (shiftEl) shiftEl.textContent = String(data.shift_count ?? 0);
    if (shiftSub) {
        const st = data.latest_shift_status || {};
        shiftSub.textContent = st.text || 'Chưa có ca trực trong kỳ';
        toggleAuditClass(shiftSub, 'audit-kpi-sub-red', st.level === 'danger' || st.level === 'warning');
    }
    syncAuditKpiPressedUi();
}

async function loadAdminLogSummary() {
    if (adminLogState.summaryAbort) adminLogState.summaryAbort.abort();
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    adminLogState.summaryAbort = ctrl;
    try {
        const qs = buildAuditFilterParams(1, { action: 'audit_summary' });
        const json = await auditApiRequest(`api/admin.php?${qs}`, { signal: ctrl?.signal });
        renderAdminLogKpi(json.data || {});
    } catch (err) {
        if (err?.name !== 'AbortError') showAuditToast(err.message || 'Không tải được thống kê nhật ký.', 'error');
    }
}

const maybeUnmaskDisplay = (text, row) => (adminLogState.revealedMap[row.id] ? String(text ?? '') : maskAuditPhone(text ?? ''));
const isBadDiffValue = (d) => (String(d.field || '').toLowerCase() === 'discrepancy_amount' && !/^0+(?:\.0+)?\s*đ?$/.test(String(d.new ?? '').trim())) || /tắt 2fa|khóa|blacklist|-\d/i.test(String(d.new ?? ''));

function renderAuditDiffBlock(row) {
    const id = Number(row.id);
    const diffs = Array.isArray(row.diffs) ? row.diffs : [];
    const exp = Boolean(adminLogState.expandedDiffs[id]);
    const vis = exp ? diffs : diffs.slice(0, 2);
    let html = '';
    if (vis.length > 0) {
        vis.forEach((d) => {
            const lbl = auditEsc(d.label || ADMIN_LOG_CATALOG.fieldLabels[d.field] || d.field || 'Thay đổi');
            const oldVal = d.old !== null && d.old !== undefined && String(d.old) !== '' ? maybeUnmaskDisplay(d.old, row) : '';
            const newVal = maybeUnmaskDisplay(d.new ?? '', row);
            html += `<div><span class="audit-k">${lbl}:</span> ${oldVal ? `<s>${auditEsc(oldVal)}</s> → ` : ''}<b${isBadDiffValue(d) ? ' class="bad"' : ''}>${auditEsc(newVal)}</b></div>`;
        });
        if (diffs.length > 2) html += `<button type="button" class="audit-more" onclick="toggleAuditDiffExpand(${id})">${exp ? 'Thu gọn thay đổi' : `+${diffs.length - 2} thay đổi nữa`}</button>`;
    } else {
        html += `<div class="audit-k">${auditEsc(maybeUnmaskDisplay(row.formatted_message || 'Thao tác hệ thống', row))}</div>`;
    }
    if (row.is_anomaly && Array.isArray(row.anomaly_reasons) && row.anomaly_reasons.length > 0) {
        html += `<div style="margin-top:4px;font-size:11.5px;color:var(--r)">⚠ ${auditEsc(row.anomaly_reasons.join(' · '))}</div>`;
    }
    return html;
}

function renderAuditReviewSection(row) {
    const id = Number(row.id);
    if (row.review) {
        const tm = row.review.created_at_formatted ? ` · ${auditEsc(row.review.created_at_formatted)}` : '';
        return `<div class="audit-review-wrap"><span class="audit-reviewed-badge">✓ Đã hậu kiểm</span><span class="audit-review-note"><b>${auditEsc(row.review.reviewer_name || 'Chủ sân')}</b>${tm}: ${auditEsc(row.review.note || '')}</span></div>`;
    }
    if (!row.is_anomaly && adminLogState.openReviewId !== id) return '';
    const isOpen = adminLogState.openReviewId === id;
    let html = `<div class="audit-review-wrap"><button type="button" class="audit-review-btn" onclick="toggleAuditReviewForm(${id})">${isOpen ? 'Đóng hậu kiểm' : 'Hậu kiểm ngay'}</button></div>`;
    if (isOpen) {
        html += `<div id="audit-review-form-${id}" class="audit-review-form"><input type="text" id="audit-review-input-${id}" class="audit-review-input" placeholder="Nhập lý do hậu kiểm (>= 10 ký tự)..." aria-label="Ghi chú hậu kiểm"><button type="button" id="audit-review-submit-${id}" class="audit-btn is-primary" onclick="submitAuditReview(${id})">Lưu hậu kiểm</button></div>`;
    }
    return html;
}

function renderAuditDetailDrawer(row) {
    const id = Number(row.id);
    if (!adminLogState.expandedJson[id]) return '';
    const rev = adminLogState.revealedMap[id] || row;
    const fmtRaw = (v) => (v ? maybeUnmaskDisplay(typeof v === 'string' ? v : JSON.stringify(v, null, 2), row) : '—');
    return `<div class="audit-detail-drawer"><div><b>IP:</b> ${auditEsc(row.ip || '—')} · <b>Thời gian VN:</b> ${auditEsc(formatAuditDateTime(row.created_at))}</div>` +
        `<div style="margin-top:4px"><b>Dữ liệu trước:</b><pre class="audit-detail-pre">${auditEsc(fmtRaw(rev.old_value))}</pre></div>` +
        `<div style="margin-top:4px"><b>Dữ liệu sau:</b><pre class="audit-detail-pre">${auditEsc(fmtRaw(rev.new_value))}</pre></div></div>`;
}

function renderAdminLogRows() {
    const tbody = auditById('admin-log-tbody');
    toggleAuditClass(auditById('admin-log-loading'), 'hidden', true);
    toggleAuditClass(auditById('admin-log-error'), 'hidden', true);
    const logs = Array.isArray(adminLogState.logs) ? adminLogState.logs : [];
    if (logs.length === 0) {
        if (tbody) tbody.innerHTML = '';
        toggleAuditClass(auditById('admin-log-table-container'), 'hidden', true);
        toggleAuditClass(auditById('admin-log-empty'), 'hidden', false);
        renderAdminLogPagination();
        return;
    }
    toggleAuditClass(auditById('admin-log-empty'), 'hidden', true);
    toggleAuditClass(auditById('admin-log-table-container'), 'hidden', false);

    let html = '';
    let lastKey = '';
    logs.forEach((row) => {
        const id = Number(row.id);
        const meta = resolveActionMeta(row.action, row);
        const role = resolveActorRoleInfo(row);
        const key = getAuditDateKey(row.created_at);
        if (key && key !== lastKey) {
            html += `<div class="audit-day">${auditEsc(formatAuditDayDivider(key))}</div>`;
            lastKey = key;
        }
        const rev = adminLogState.revealedMap[id];
        const objRaw = rev?.object_display || rev?.object_code || (rev ? row.object_code : row.object_display) || row.object_code || '—';
        const btn = (row.has_sensitive_phone && !rev)
            ? `<button type="button" class="audit-more" onclick="revealAuditSensitive(${id})">Xem chi tiết</button>`
            : `<button type="button" class="audit-more" onclick="toggleAuditJsonDetail(${id})">${adminLogState.expandedJson[id] ? 'Ẩn chi tiết' : 'Chi tiết'}</button>`;
        const anomBadge = row.is_anomaly ? `<span class="audit-anomaly-pill" title="${auditEsc((row.anomaly_reasons || []).join('; '))}">⚠ Bất thường</span>` : '';
        const catBadgeCls = `t-${meta.category}`;
        html += `<div class="audit-row${row.is_anomaly ? ' is-anomaly-row' : ''}" data-log-id="${id}">` +
            `<div><span class="audit-id">#${id}</span><b class="audit-actor-name">${auditEsc(row.actor_name || 'Hệ thống')}</b><span class="audit-s"><span class="audit-role ${role.cls}">${auditEsc(role.label)}</span></span></div>` +
            `<div><span class="audit-badge ${auditEsc(catBadgeCls)}">${auditEsc(meta.label)}</span>${anomBadge}<span class="audit-s">${auditEsc(meta.dataGroup)}</span></div>` +
            `<div><span class="audit-code">${auditEsc(objRaw)}</span><span class="audit-s">${auditEsc(resolveObjectTypeLabel(row, meta))}</span>${btn}</div>` +
            `<div class="audit-chg">${renderAuditDiffBlock(row)}${renderAuditReviewSection(row)}${renderAuditDetailDrawer(row)}</div>` +
            `<div class="audit-tm" title="${auditEsc(formatAuditDateTime(row.created_at))}"><b>${auditEsc(formatAuditClockTime(row.created_at))}</b><span class="audit-s">${auditEsc(formatAuditRelativeTime(row.created_at))}</span></div></div>`;
    });
    if (tbody) tbody.innerHTML = html;
    renderAdminLogPagination();
}

function renderAdminLogPagination() {
    const total = Number(adminLogState.total || 0);
    const page = Number(adminLogState.page || 1);
    const limit = Number(adminLogState.limit || 25);
    const totalPages = Math.max(1, Number(adminLogState.totalPages || 1));
    const start = total === 0 ? 0 : (page - 1) * limit + 1;
    const end = total === 0 ? 0 : Math.min(total, page * limit);
    if (auditById('admin-log-range-summary')) auditById('admin-log-range-summary').textContent = `Hiển thị ${start}–${end} / ${total} bản ghi`;
    if (auditById('admin-log-page-current')) auditById('admin-log-page-current').textContent = String(page);
    if (auditById('admin-log-page-total')) auditById('admin-log-page-total').textContent = String(totalPages);
    if (auditById('admin-log-total-count')) auditById('admin-log-total-count').textContent = String(total);
    if (auditById('admin-log-prev-btn')) auditById('admin-log-prev-btn').disabled = page <= 1;
    if (auditById('admin-log-next-btn')) auditById('admin-log-next-btn').disabled = page >= totalPages;
    const numsEl = auditById('admin-log-page-numbers');
    if (numsEl) {
        let pHtml = '';
        for (let p = Math.max(1, page - 2); p <= Math.min(totalPages, page + 2); p++) {
            pHtml += `<button type="button" class="audit-page-num${p === page ? ' is-active' : ''}" onclick="goToAdminLogPage(${p})">${p}</button>`;
        }
        numsEl.innerHTML = pHtml;
    }
}

function bindAuditFilterInputs() {
    if (typeof document === 'undefined') return;
    AUDIT_INPUT_BINDINGS.forEach(([elId, key]) => {
        const el = auditById(elId);
        if (!el || el.dataset?.auditBound === '1' || typeof el.addEventListener !== 'function') return;
        if (el.dataset) el.dataset.auditBound = '1';
        el.addEventListener(elId === 'admin-log-search' ? 'input' : 'change', () => {
            adminLogState[key] = el.value || '';
            if (elId === 'admin-log-search') {
                toggleAuditClass(auditById('admin-log-search-clear'), 'hidden', !adminLogState.search);
                clearTimeout(adminLogState.searchTimer);
                adminLogState.searchTimer = setTimeout(() => loadAdminLogs(1), 280);
            } else loadAdminLogs(1);
        });
    });
    const clrBtn = auditById('admin-log-search-clear');
    if (clrBtn && clrBtn.dataset?.auditBound !== '1' && typeof clrBtn.addEventListener === 'function') {
        if (clrBtn.dataset) clrBtn.dataset.auditBound = '1';
        clrBtn.addEventListener('click', () => {
            adminLogState.search = '';
            if (auditById('admin-log-search')) auditById('admin-log-search').value = '';
            toggleAuditClass(clrBtn, 'hidden', true);
            loadAdminLogs(1);
        });
    }
}

function startAdminLogPolling() {
    if (adminLogState.pollTimer) return;
    adminLogState.pollTimer = setInterval(async () => {
        if ((typeof document !== 'undefined' && document.hidden) || auditById('tab-content-logs')?.classList?.contains('hidden') || Number(adminLogState.latestId || 0) <= 0) return;
        try {
            const json = await auditApiRequest(`api/admin.php?action=audit_check_new&since_id=${adminLogState.latestId}`);
            const cnt = Number(json.data?.new_count || 0);
            if (cnt > 0) {
                if (auditById('admin-log-new-banner-text')) auditById('admin-log-new-banner-text').textContent = `Có ${cnt} bản ghi nhật ký mới phát sinh.`;
                toggleAuditClass(auditById('admin-log-new-banner'), 'hidden', false);
            }
        } catch (_err) { /* silent background poll */ }
    }, 60000);
}

async function loadAdminLogs(page = 1) {
    hydrateAdminLogFiltersFromUrl();
    bindAuditFilterInputs();
    if (!adminLogState.pluginsReady && typeof window !== 'undefined' && typeof window.SanBongDatePicker?.init === 'function') {
        adminLogState.pluginsReady = true;
        window.SanBongDatePicker.init();
    }
    startAdminLogPolling();
    adminLogState.page = Math.max(1, Number(page) || 1);
    syncAuditInputsToDom();
    syncAdminLogUrlParams();
    toggleAuditClass(auditById('admin-log-new-banner'), 'hidden', true);
    if (adminLogState.listAbort) adminLogState.listAbort.abort();
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    adminLogState.listAbort = ctrl;
    toggleAuditClass(auditById('admin-log-error'), 'hidden', true);
    toggleAuditClass(auditById('admin-log-empty'), 'hidden', true);
    if (adminLogState.logs.length === 0) toggleAuditClass(auditById('admin-log-loading'), 'hidden', false);

    const summaryPromise = loadAdminLogSummary();
    try {
        const qs = buildAuditFilterParams(adminLogState.page, { action: 'audit_logs' });
        const json = await auditApiRequest(`api/admin.php?${qs}`, { signal: ctrl?.signal });
        const data = json.data || {};
        adminLogState.logs = Array.isArray(data.logs) ? data.logs : [];
        adminLogState.total = Number(data.pagination?.total ?? adminLogState.logs.length);
        adminLogState.totalPages = Math.max(1, Number(data.pagination?.totalPages ?? 1));
        if (!adminLogState.limit && data.pagination?.limit) adminLogState.limit = Number(data.pagination.limit);
        if (data.latest_id) adminLogState.latestId = Math.max(adminLogState.latestId || 0, Number(data.latest_id));
        populateAuditFilterOptions(data.staffList || [], data.actionTypes || []);
        const updEl = auditById('admin-log-updated-at');
        if (updEl) { const p = getVnDateParts(new Date()); updEl.textContent = `Cập nhật ${p.hour}:${p.minute}`; }
        renderAdminLogRows();
    } catch (err) {
        if (err?.name !== 'AbortError') {
            toggleAuditClass(auditById('admin-log-loading'), 'hidden', true);
            toggleAuditClass(auditById('admin-log-table-container'), 'hidden', true);
            if (auditById('admin-log-error-msg')) auditById('admin-log-error-msg').textContent = err.message || 'Không tải được dữ liệu nhật ký.';
            toggleAuditClass(auditById('admin-log-error'), 'hidden', false);
        }
    }
    await summaryPromise;
}

function toggleAuditCategoryChip(cat) {
    if (!ADMIN_LOG_CATEGORIES[cat]) return;
    const i = adminLogState.categories.indexOf(cat);
    if (i >= 0) adminLogState.categories.splice(i, 1); else adminLogState.categories.push(cat);
    syncAuditChipsUi();
    return loadAdminLogs(1);
}

function handleAuditKpiClick(quickKey) {
    adminLogState.quickFilter = adminLogState.quickFilter === quickKey ? '' : (quickKey || '');
    syncAuditKpiPressedUi();
    return loadAdminLogs(1);
}

function resetAdminLogFilters() {
    Object.assign(adminLogState, { staffId: '', actionType: '', dataGroup: '', fromDate: '', toDate: '', search: '', quickFilter: '', categories: [] });
    syncAuditInputsToDom();
    return loadAdminLogs(1);
}

function handleAdminLogLimitChange(val) {
    const num = Number(val);
    adminLogState.limit = [10, 25, 50, 100].includes(num) ? num : 25;
    return loadAdminLogs(1);
}

const prevAdminLogPage = () => (adminLogState.page > 1 ? loadAdminLogs(adminLogState.page - 1) : undefined);
const nextAdminLogPage = () => (adminLogState.page < adminLogState.totalPages ? loadAdminLogs(adminLogState.page + 1) : undefined);
const goToAdminLogPage = (p) => loadAdminLogs(Math.max(1, Math.min(adminLogState.totalPages || 1, Number(p) || 1)));
const toggleAuditDiffExpand = (logId) => { adminLogState.expandedDiffs[Number(logId)] = !adminLogState.expandedDiffs[Number(logId)]; renderAdminLogRows(); };
const toggleAuditJsonDetail = (logId) => { adminLogState.expandedJson[Number(logId)] = !adminLogState.expandedJson[Number(logId)]; renderAdminLogRows(); };
const toggleAuditReviewForm = (logId) => { const id = Number(logId); adminLogState.openReviewId = adminLogState.openReviewId === id ? null : id; renderAdminLogRows(); };

function exportAdminLogsCsv() {
    const qs = buildAuditFilterParams(1, { action: 'audit_export_csv' });
    if (typeof window !== 'undefined' && typeof window.open === 'function') window.open(normalizeLogApiUrl(`api/admin.php?${qs}`), '_blank', 'noopener');
}

async function revealAuditSensitive(logId) {
    const id = Number(logId);
    try {
        const json = await auditApiRequest(`api/admin.php?action=audit_log_detail&id=${id}&reveal=1`);
        if (json.data) adminLogState.revealedMap[id] = json.data;
        adminLogState.expandedJson[id] = true;
        renderAdminLogRows();
    } catch (err) {
        showAuditToast(err.message || 'Không thể mở chi tiết dữ liệu nhạy cảm.', 'error');
    }
}

async function submitAuditReview(logId) {
    const id = Number(logId);
    const input = auditById(`audit-review-input-${id}`);
    const submitBtn = auditById(`audit-review-submit-${id}`);
    const check = validateAuditReasonClient(input?.value || '');
    if (!check.valid) return showAuditToast(check.error, 'error');
    if (submitBtn) submitBtn.disabled = true;
    try {
        const json = await auditApiRequest('api/admin.php?action=audit_review', { method: 'POST', body: { log_id: id, note: check.clean } });
        const target = adminLogState.logs.find((r) => Number(r.id) === id);
        if (target) target.review = json.data || { reviewer_name: 'Chủ sân', note: check.clean };
        adminLogState.openReviewId = null;
        renderAdminLogRows();
        showAuditToast('Đã lưu ghi chú hậu kiểm.', 'success');
        await loadAdminLogSummary();
    } catch (err) {
        showAuditToast(err.message || 'Lưu hậu kiểm thất bại.', 'error');
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

if (typeof window !== 'undefined') {
    Object.assign(window, {
        ADMIN_LOG_CATEGORIES, ADMIN_LOG_DATA_GROUPS, ADMIN_LOG_CATALOG, adminLogState,
        validateAuditReasonClient, resolveActionMeta, loadAdminLogs, toggleAuditCategoryChip,
        handleAuditKpiClick, resetAdminLogFilters, handleAdminLogLimitChange,
        prevAdminLogPage, nextAdminLogPage, goToAdminLogPage, exportAdminLogsCsv,
        toggleAuditDiffExpand, toggleAuditJsonDetail, revealAuditSensitive,
        toggleAuditReviewForm, submitAuditReview, auditApiRequest
    });
}
