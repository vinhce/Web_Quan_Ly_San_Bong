/**
 * Module: Admin Audit Logs (Nhật ký hệ thống & Thao tác Quản trị)
 * File: js/admin_logs.js
 * Quản lý giao diện, bộ lọc, phân trang, và hiển thị chi tiết diff thay đổi
 * Tuân thủ WCAG 2.2 AA, Responsive Mobile-first từ 360px, Chống XSS triệt để.
 */

// State quản lý Nhật ký Admin
let currentLogPage = 1;
let currentLogLimit = 20;
let currentLogTotalPages = 1;
let currentLogTotalRecords = 0;
let adminLogSearchDebounceTimer = null;
let adminLogStaffOptionsPopulated = false;
let adminLogActionOptionsPopulated = false;
const ADMIN_LOG_CATALOG = {
  "groups": [
    {
      "key": "pricing",
      "label": "Giá & khuyến mãi"
    },
    {
      "key": "payments",
      "label": "Tiền & đặt cọc"
    },
    {
      "key": "booking",
      "label": "Đặt sân"
    },
    {
      "key": "shifts",
      "label": "Ca trực"
    },
    {
      "key": "members",
      "label": "Hội viên & điểm"
    },
    {
      "key": "venues",
      "label": "Sân & cài đặt"
    },
    {
      "key": "security",
      "label": "Bảo mật"
    },
    {
      "key": "automation",
      "label": "Hệ thống tự động"
    },
    {
      "key": "other",
      "label": "Khác"
    }
  ],
  "actions": {
    "UPDATE_PRICING": {
      "label": "Cập nhật giá sân",
      "group": "pricing"
    },
    "UPDATE_PRICE": {
      "label": "Cập nhật giá sân",
      "group": "pricing"
    },
    "UPDATE_INFO": {
      "label": "Sửa thông tin",
      "group": "venues"
    },
    "VOUCHER_SAVE": {
      "label": "Lưu voucher",
      "group": "pricing"
    },
    "VOUCHER_DELETE": {
      "label": "Xóa voucher",
      "group": "pricing"
    },
    "VOUCHER_TOGGLE": {
      "label": "Bật/tắt voucher",
      "group": "pricing"
    },
    "VOUCHER_CREATE": {
      "label": "Tạo voucher",
      "group": "pricing"
    },
    "VOUCHER_UPDATE": {
      "label": "Cập nhật voucher",
      "group": "pricing"
    },
    "GOLDEN_HOUR_SAVE": {
      "label": "Lưu quy tắc giờ vàng",
      "group": "pricing"
    },
    "GOLDEN_HOUR_DELETE": {
      "label": "Xóa quy tắc giờ vàng",
      "group": "pricing"
    },
    "COLLECT_PAYMENT": {
      "label": "Thu tiền",
      "group": "payments"
    },
    "UPDATE_PAYMENT": {
      "label": "Cập nhật thanh toán",
      "group": "payments"
    },
    "RECONCILE_MANUAL": {
      "label": "Gán giao dịch thủ công",
      "group": "payments"
    },
    "RECONCILE_RESOLVE": {
      "label": "Xử lý đối soát",
      "group": "payments"
    },
    "WEBHOOK_MATCH": {
      "label": "Giao dịch ngân hàng khớp đơn",
      "group": "payments"
    },
    "WEBHOOK_UNDERPAID": {
      "label": "Giao dịch ngân hàng chuyển thiếu",
      "group": "payments"
    },
    "WEBHOOK_OVERPAID": {
      "label": "Giao dịch ngân hàng chuyển thừa",
      "group": "payments"
    },
    "WEBHOOK_UNMATCHED": {
      "label": "Giao dịch ngân hàng không khớp đơn",
      "group": "payments"
    },
    "EXPENSE_ADD": {
      "label": "Thêm khoản chi",
      "group": "payments"
    },
    "EXPENSE_UPDATE": {
      "label": "Cập nhật khoản chi",
      "group": "payments"
    },
    "EXPENSE_DELETE": {
      "label": "Xóa khoản chi",
      "group": "payments"
    },
    "COUNTER_SALE": {
      "label": "Bán hàng tại quầy",
      "group": "payments"
    },
    "CANCEL_BOOKING": {
      "label": "Hủy đơn đặt sân",
      "group": "booking"
    },
    "EARLY_CANCEL": {
      "label": "Hủy đơn sớm",
      "group": "booking"
    },
    "CHECKIN": {
      "label": "Check-in",
      "group": "booking"
    },
    "ADD_SERVICE": {
      "label": "Thêm dịch vụ vào đơn",
      "group": "booking"
    },
    "ADD_OVERTIME": {
      "label": "Thêm giờ đá",
      "group": "booking"
    },
    "RESTORE_BOOKING": {
      "label": "Khôi phục đơn",
      "group": "booking"
    },
    "NOSHOW_RELEASE_SLOT": {
      "label": "Nhả sân khách vắng",
      "group": "booking"
    },
    "TRANSFER_PITCH": {
      "label": "Chuyển sân đặt",
      "group": "booking"
    },
    "WALKIN_BOOKING": {
      "label": "Tạo đơn tại quầy",
      "group": "booking"
    },
    "WALKIN_PAST_SLOT": {
      "label": "Duyệt đặt sân quá khứ",
      "group": "booking"
    },
    "RECURRING_CREATE": {
      "label": "Tạo lịch cố định",
      "group": "booking"
    },
    "RECURRING_CANCEL": {
      "label": "Hủy lịch cố định",
      "group": "booking"
    },
    "RECURRING_SKIP_DATE": {
      "label": "Bỏ qua buổi cố định",
      "group": "booking"
    },
    "WAITLIST_ASSIGN": {
      "label": "Gán khách trong danh sách chờ",
      "group": "booking"
    },
    "WAITLIST_CANCEL": {
      "label": "Hủy yêu cầu danh sách chờ",
      "group": "booking"
    },
    "WAITLIST_NOTIFIED": {
      "label": "Thông báo sân trống",
      "group": "booking"
    },
    "MATCHMAKING_MODERATE": {
      "label": "Kiểm duyệt tin tìm đội",
      "group": "booking"
    },
    "MATCHMAKING_CANCEL": {
      "label": "Hủy tin tìm đội",
      "group": "booking"
    },
    "REVIEW_REPLY": {
      "label": "Phản hồi đánh giá",
      "group": "booking"
    },
    "REVIEW_STATUS": {
      "label": "Đổi trạng thái đánh giá",
      "group": "booking"
    },
    "SHIFT_OPEN": {
      "label": "Mở ca trực",
      "group": "shifts"
    },
    "SHIFT_CLOSE": {
      "label": "Đóng ca trực",
      "group": "shifts"
    },
    "SHIFT_CONFIRM": {
      "label": "Xác nhận chốt ca",
      "group": "shifts"
    },
    "CRM_UPDATE": {
      "label": "Cập nhật hồ sơ khách",
      "group": "members"
    },
    "UPDATE_MEMBER": {
      "label": "Cập nhật hội viên",
      "group": "members"
    },
    "USER_EDIT": {
      "label": "Sửa thông tin hội viên",
      "group": "members"
    },
    "ADJUST_POINTS": {
      "label": "Điều chỉnh điểm",
      "group": "members"
    },
    "UPDATE_FINANCE": {
      "label": "Cập nhật thông tin tài chính",
      "group": "members"
    },
    "PITCH_STATUS": {
      "label": "Đổi trạng thái sân",
      "group": "venues"
    },
    "PITCH_UPSERT": {
      "label": "Thêm/sửa sân",
      "group": "venues"
    },
    "SERVICE_UPSERT": {
      "label": "Thêm/sửa dịch vụ",
      "group": "venues"
    },
    "SERVICE_DELETE": {
      "label": "Ngừng kinh doanh dịch vụ",
      "group": "venues"
    },
    "INVENTORY_RESTOCK": {
      "label": "Nhập thêm hàng tồn",
      "group": "venues"
    },
    "MAINTENANCE_ADD": {
      "label": "Thêm lịch bảo trì",
      "group": "venues"
    },
    "MAINTENANCE_UPDATE": {
      "label": "Cập nhật lịch bảo trì",
      "group": "venues"
    },
    "UPDATE_SETTINGS": {
      "label": "Cập nhật cài đặt hệ thống",
      "group": "venues"
    },
    "ENABLE_2FA": {
      "label": "Bật xác thực 2 bước",
      "group": "security"
    },
    "DISABLE_2FA": {
      "label": "Tắt xác thực 2 bước",
      "group": "security"
    },
    "CHANGE_PASSWORD": {
      "label": "Đổi mật khẩu",
      "group": "security"
    },
    "STAFF_CREATE": {
      "label": "Tạo tài khoản nhân sự",
      "group": "security"
    },
    "STAFF_ROLE_CHANGE": {
      "label": "Đổi vai trò nhân sự",
      "group": "security"
    },
    "STAFF_STATUS_CHANGE": {
      "label": "Đổi trạng thái nhân sự",
      "group": "security"
    },
    "STAFF_RESET_PASSWORD": {
      "label": "Đặt lại mật khẩu nhân sự",
      "group": "security"
    },
    "AUTO_CANCEL_EXPIRED": {
      "label": "Tự động hủy đơn quá hạn",
      "group": "automation"
    },
    "RUN_REMINDERS": {
      "label": "Chạy nhắc lịch",
      "group": "automation"
    },
    "RECURRING_CRON_GENERATE": {
      "label": "Tự động tạo lịch cố định",
      "group": "automation"
    },
    "RECURRING_CONFLICT_SKIP": {
      "label": "Bỏ qua lịch bị trùng",
      "group": "automation"
    },
    "WAITLIST_HOLD_EXPIRED": {
      "label": "Hết hạn giữ chỗ danh sách chờ",
      "group": "automation"
    },
    "CRON_COMPLETE_OVERDUE_IN_PLAY": {
      "label": "Tự động hoàn tất ca quá giờ",
      "group": "automation"
    },
    "ADMIN_RUN_AUTO_RELEASE": {
      "label": "Chạy nhả đơn quá hạn thủ công",
      "group": "automation"
    },
    "RUN_RECURRING_GEN": {
      "label": "Chạy tạo lịch cố định",
      "group": "automation"
    },
    "TELEGRAM_TEST": {
      "label": "Kiểm tra kết nối Telegram",
      "group": "automation"
    },
    "DATABASE_BACKUP": {
      "label": "Sao lưu cơ sở dữ liệu",
      "group": "automation"
    },
    "DB_BACKUP": {
      "label": "Sao lưu cơ sở dữ liệu",
      "group": "automation"
    },
    "DB_BACKUP_DOWNLOAD": {
      "label": "Tải bản sao lưu cơ sở dữ liệu",
      "group": "security"
    },
    "SAMPLE_DATA_CLEAN": {
      "label": "Dọn dữ liệu mẫu",
      "group": "automation"
    },
    "SAMPLE_DATA_SEED": {
      "label": "Tạo dữ liệu mẫu",
      "group": "automation"
    },
    "cron_complete_overdue_in_play": {
      "label": "Tự động hoàn tất ca quá giờ",
      "group": "automation"
    },
    "matchmaking_cancel": {
      "label": "Hủy tin tìm đội",
      "group": "booking"
    },
    "PRICE_UPDATE": {
      "label": "Cập nhật giá sân",
      "group": "pricing"
    },
    "CONFIRM_DEPOSIT": {
      "label": "Xác nhận đặt cọc",
      "group": "payments"
    },
    "APPROVE_DEPOSIT": {
      "label": "Duyệt đặt cọc",
      "group": "payments"
    },
    "REJECT_DEPOSIT": {
      "label": "Từ chối đặt cọc",
      "group": "payments"
    },
    "PITCH_STATUS_TOGGLE": {
      "label": "Đổi trạng thái sân",
      "group": "venues"
    },
    "TOGGLE_PITCH": {
      "label": "Đổi trạng thái sân",
      "group": "venues"
    },
    "CLOSE_SHIFT": {
      "label": "Đóng ca trực",
      "group": "shifts"
    },
    "OPEN_SHIFT": {
      "label": "Mở ca trực",
      "group": "shifts"
    },
    "SHIFT_HANDOVER": {
      "label": "Giao ca trực",
      "group": "shifts"
    },
    "VOUCHER_TOGGLE_STATUS": {
      "label": "Bật/tắt voucher",
      "group": "pricing"
    },
    "RECURRING_BOOKING": {
      "label": "Lịch đặt cố định",
      "group": "booking"
    }
  },
  "fields": {
    "price_p5_base": {
      "label": "Sân 5 - Giá thường",
      "format": "currency"
    },
    "price_p5_peak": {
      "label": "Sân 5 - Giờ cao điểm",
      "format": "currency"
    },
    "price_p5_weekend": {
      "label": "Sân 5 - Cuối tuần",
      "format": "currency"
    },
    "price_p7_base": {
      "label": "Sân 7 - Giá thường",
      "format": "currency"
    },
    "price_p7_peak": {
      "label": "Sân 7 - Giờ cao điểm",
      "format": "currency"
    },
    "price_p7_weekend": {
      "label": "Sân 7 - Cuối tuần",
      "format": "currency"
    },
    "price_p11_base": {
      "label": "Sân 11 - Giá thường",
      "format": "currency"
    },
    "price_p11_peak": {
      "label": "Sân 11 - Giờ cao điểm",
      "format": "currency"
    },
    "price_p11_weekend": {
      "label": "Sân 11 - Cuối tuần",
      "format": "currency"
    },
    "deposit_rate": {
      "label": "Tỷ lệ đặt cọc",
      "format": "percent"
    },
    "bank_name": {
      "label": "Ngân hàng"
    },
    "bank_code": {
      "label": "Mã ngân hàng"
    },
    "bank_account": {
      "label": "Số tài khoản"
    },
    "bank_holder": {
      "label": "Chủ tài khoản"
    },
    "hotline": {
      "label": "Hotline"
    },
    "open_hours": {
      "label": "Giờ hoạt động"
    },
    "hold_minutes": {
      "label": "Thời gian giữ sân",
      "format": "minutes"
    },
    "waitlist_hold_minutes": {
      "label": "Thời gian giữ chỗ danh sách chờ",
      "format": "minutes"
    },
    "refund_full_hours": {
      "label": "Mốc hoàn cọc đầy đủ",
      "format": "hours"
    },
    "refund_partial_hours": {
      "label": "Mốc hoàn cọc một phần",
      "format": "hours"
    },
    "auto_cancel_enabled": {
      "label": "Tự động hủy đơn quá hạn",
      "format": "boolean"
    },
    "reminder_enabled": {
      "label": "Bật nhắc lịch",
      "format": "boolean"
    },
    "reminder_hours_before": {
      "label": "Nhắc trước trận",
      "format": "hours"
    },
    "customer_notify_enabled": {
      "label": "Bật thông báo khách hàng",
      "format": "boolean"
    },
    "customer_notify_webhook": {
      "label": "Webhook thông báo khách hàng"
    },
    "booking_confirm_template": {
      "label": "Mẫu xác nhận đặt sân"
    },
    "reminder_template": {
      "label": "Mẫu nhắc lịch"
    },
    "telegram_notify_enabled": {
      "label": "Bật thông báo Telegram",
      "format": "boolean"
    },
    "telegram_bot_token": {
      "label": "Telegram bot token"
    },
    "telegram_chat_id": {
      "label": "Telegram chat ID"
    },
    "full_name": {
      "label": "Họ tên"
    },
    "customer_name": {
      "label": "Tên khách/đội bóng"
    },
    "phone": {
      "label": "Số điện thoại"
    },
    "email": {
      "label": "Email"
    },
    "points": {
      "label": "Điểm tích lũy",
      "format": "number"
    },
    "points_reason": {
      "label": "Lý do điều chỉnh điểm"
    },
    "tier": {
      "label": "Hạng hội viên"
    },
    "customer_tier": {
      "label": "Hạng khách hàng"
    },
    "admin_note": {
      "label": "Ghi chú chăm sóc"
    },
    "is_blacklisted": {
      "label": "Danh sách đen",
      "format": "boolean"
    },
    "status": {
      "label": "Trạng thái"
    },
    "payment_status": {
      "label": "Trạng thái thanh toán"
    },
    "pitch_id": {
      "label": "Mã sân"
    },
    "slot_id": {
      "label": "Khung giờ"
    },
    "slot_time": {
      "label": "Giờ đá"
    },
    "booking_date": {
      "label": "Ngày đặt sân"
    },
    "total_price": {
      "label": "Tổng tiền",
      "format": "currency"
    },
    "deposit_amount": {
      "label": "Tiền đặt cọc",
      "format": "currency"
    },
    "paid_amount": {
      "label": "Đã thanh toán",
      "format": "currency"
    },
    "remaining_amount": {
      "label": "Còn phải thu",
      "format": "currency"
    },
    "price_per_match": {
      "label": "Giá mỗi trận",
      "format": "currency"
    },
    "deposit_per_match": {
      "label": "Tiền cọc mỗi trận",
      "format": "currency"
    },
    "price": {
      "label": "Đơn giá",
      "format": "currency"
    },
    "amount": {
      "label": "Số tiền",
      "format": "currency"
    },
    "quantity": {
      "label": "Số lượng",
      "format": "number"
    },
    "stock_qty": {
      "label": "Tồn kho",
      "format": "number"
    },
    "min_stock_warning": {
      "label": "Ngưỡng cảnh báo tồn kho",
      "format": "number"
    },
    "is_active": {
      "label": "Đang hoạt động",
      "format": "boolean"
    },
    "role": {
      "label": "Vai trò"
    },
    "username": {
      "label": "Tên đăng nhập"
    },
    "name": {
      "label": "Tên"
    },
    "reason": {
      "label": "Lý do"
    },
    "code": {
      "label": "Mã"
    },
    "type": {
      "label": "Loại"
    }
  }
};
let adminLogCatalog = ADMIN_LOG_CATALOG;
let adminLogActionTypes = [];
const adminLogWarnedActionCodes = new Set();

const ADMIN_LOG_ACTION_COLOR_MAP = {
  // 1. XANH LÁ (green) - Tạo mới, mở ca, duyệt cọc, khớp tiền thành công
  'WALKIN_BOOKING': 'green',
  'RECURRING_CREATE': 'green',
  'STAFF_CREATE': 'green',
  'SAMPLE_DATA_SEED': 'green',
  'ADD_SERVICE': 'green',
  'ADD_OVERTIME': 'green',
  'MAINTENANCE_ADD': 'green',
  'INVENTORY_RESTOCK': 'green',
  'SHIFT_OPEN': 'green',
  'OPEN_SHIFT': 'green',
  'APPROVE_DEPOSIT': 'green',
  'CONFIRM_DEPOSIT': 'green',
  'MATCHMAKING_MODERATE': 'green',
  'RESTORE_BOOKING': 'green',
  'SHIFT_CONFIRM': 'green',
  'WAITLIST_ASSIGN': 'green',
  'ENABLE_2FA': 'green',
  'WEBHOOK_MATCH': 'green',
  'RECONCILE_MANUAL': 'green',

  // 2. ĐỎ (red) - Xóa, hủy, từ chối, tắt bảo mật, thiếu tiền, chi tiền ra
  'VOUCHER_DELETE': 'red',
  'GOLDEN_HOUR_DELETE': 'red',
  'EXPENSE_DELETE': 'red',
  'CANCEL_BOOKING': 'red',
  'EARLY_CANCEL': 'red',
  'RECURRING_CANCEL': 'red',
  'MATCHMAKING_CANCEL': 'red',
  'WAITLIST_CANCEL': 'red',
  'REJECT_DEPOSIT': 'red',
  'DISABLE_2FA': 'red',
  'WEBHOOK_UNDERPAID': 'red',
  'AUTO_CANCEL_EXPIRED': 'red',
  'WAITLIST_HOLD_EXPIRED': 'red',
  'ADMIN_RUN_AUTO_RELEASE': 'red',
  'EXPENSE_ADD': 'red',

  // 3. XANH DƯƠNG (blue) - Cập nhật cấu hình, sửa thông tin, vận hành sân
  'UPDATE_PRICING': 'blue',
  'UPDATE_PRICE': 'blue',
  'PRICE_UPDATE': 'blue',
  'EXPENSE_UPDATE': 'blue',
  'UPDATE_PAYMENT': 'blue',
  'CRM_UPDATE': 'blue',
  'UPDATE_MEMBER': 'blue',
  'UPDATE_FINANCE': 'blue',
  'SERVICE_UPSERT': 'blue',
  'PITCH_UPSERT': 'blue',
  'GOLDEN_HOUR_SAVE': 'blue',
  'VOUCHER_SAVE': 'blue',
  'VOUCHER_CREATE': 'blue',
  'VOUCHER_UPDATE': 'blue',
  'VOUCHER_TOGGLE': 'blue',
  'VOUCHER_TOGGLE_STATUS': 'blue',
  'UPDATE_INFO': 'blue',
  'USER_EDIT': 'blue',
  'ADJUST_POINTS': 'blue',
  'CHECKIN': 'blue',
  'TRANSFER_PITCH': 'blue',
  'RECURRING_BOOKING': 'blue',
  'PITCH_STATUS': 'blue',
  'PITCH_STATUS_TOGGLE': 'blue',
  'TOGGLE_PITCH': 'blue',
  'STAFF_STATUS_CHANGE': 'blue',
  'REVIEW_STATUS': 'blue',
  'REVIEW_REPLY': 'blue',
  'WAITLIST_NOTIFIED': 'blue',
  'MAINTENANCE_UPDATE': 'blue',
  'UPDATE_SETTINGS': 'blue',
  'SYSTEM_SETTINGS': 'blue',

  // 4. CAM (orange) - Cảnh báo, lệch tiền, nhạy cảm, đóng/giao ca
  'WEBHOOK_OVERPAID': 'orange',
  'WEBHOOK_UNMATCHED': 'orange',
  'RECONCILE_RESOLVE': 'orange',
  'WALKIN_PAST_SLOT': 'orange',
  'RECURRING_SKIP_DATE': 'orange',
  'RECURRING_CONFLICT_SKIP': 'orange',
  'NOSHOW_RELEASE_SLOT': 'orange',
  'STAFF_ROLE_CHANGE': 'orange',
  'CHANGE_PASSWORD': 'orange',
  'STAFF_RESET_PASSWORD': 'orange',
  'DB_BACKUP_DOWNLOAD': 'orange',
  'SAMPLE_DATA_CLEAN': 'orange',
  'SERVICE_DELETE': 'orange',
  'SHIFT_CLOSE': 'orange',
  'CLOSE_SHIFT': 'orange',
  'SHIFT_HANDOVER': 'orange',

  // 5. TÍM (purple) - Thu ngân, dòng tiền tại quầy
  'COLLECT_PAYMENT': 'purple',
  'COUNTER_SALE': 'purple',

  // 6. XÁM (gray) - Hệ thống chạy ngầm, không cần chú ý
  'RUN_REMINDERS': 'gray',
  'RUN_RECURRING_GEN': 'gray',
  'RECURRING_CRON_GENERATE': 'gray',
  'CRON_COMPLETE_OVERDUE_IN_PLAY': 'gray',
  'DATABASE_BACKUP': 'gray',
  'DB_BACKUP': 'gray',
  'TELEGRAM_TEST': 'gray'
};

const ADMIN_LOG_COLOR_EMOJI_MAP = {
  green: '🟢',
  red: '🔴',
  blue: '🔵',
  orange: '🟠',
  purple: '🟣',
  gray: '⚪'
};

function getAdminLogActionColor(action) {
  const code = String(action || '').trim().toUpperCase();
  if (Object.prototype.hasOwnProperty.call(ADMIN_LOG_ACTION_COLOR_MAP, code)) {
    return ADMIN_LOG_ACTION_COLOR_MAP[code];
  }
  return 'gray'; // Mặc định là xám nếu chưa có trong map
}

function getAdminLogActionClass(action) {
  const color = getAdminLogActionColor(action);
  return `badge-action badge-${color}`;
}

function getAdminLogActionEmoji(action) {
  const color = getAdminLogActionColor(action);
  return ADMIN_LOG_COLOR_EMOJI_MAP[color] || '⚪';
}

const ADMIN_LOG_BADGE_CLASSES = {
  green: 'badge-action badge-green',
  red: 'badge-action badge-red',
  blue: 'badge-action badge-blue',
  orange: 'badge-action badge-orange',
  purple: 'badge-action badge-purple',
  gray: 'badge-action badge-gray',
  other: 'badge-action badge-gray'
};

const ADMIN_LOG_SCALAR_FIELD_LABELS = {
  PITCH_STATUS: 'Trạng thái',
  PITCH_STATUS_TOGGLE: 'Trạng thái',
  TOGGLE_PITCH: 'Trạng thái',
  CHECKIN: 'Trạng thái',
  RESTORE_BOOKING: 'Trạng thái',
  CANCEL_BOOKING: 'Trạng thái',
  EARLY_CANCEL: 'Trạng thái',
  NOSHOW_RELEASE_SLOT: 'Trạng thái',
  UPDATE_PAYMENT: 'Trạng thái thanh toán',
  ENABLE_2FA: 'Xác thực 2 bước',
  DISABLE_2FA: 'Xác thực 2 bước',
  SHIFT_CONFIRM: 'Trạng thái ca trực',
  SHIFT_CLOSE: 'Trạng thái ca trực',
  CLOSE_SHIFT: 'Trạng thái ca trực',
  RECURRING_CANCEL: 'Trạng thái lịch cố định',
  RECURRING_SKIP_DATE: 'Trạng thái lịch cố định'
};

/**
 * Helper escape HTML an toàn chống XSS
 */
function escapeAdminLogHTML(str) {
  if (typeof window.escapeHTML === 'function') {
    return window.escapeHTML(str);
  }
  return String(str ?? '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[m]);
}

function loadAdminLogCatalog() {
  return adminLogCatalog;
}

function getCatalogAction(action) {
  const code = String(action || '').trim();
  const normalizedCode = code.toUpperCase();
  const actions = adminLogCatalog?.actions || {};
  const exact = Object.prototype.hasOwnProperty.call(actions, code) ? actions[code] : null;
  if (exact) return exact;

  const entry = Object.entries(actions).find(([knownCode]) => knownCode.toUpperCase() === normalizedCode);
  return entry ? entry[1] : null;
}

function getActionBadgeInfo(action) {
  const code = String(action || '').trim();
  const info = getCatalogAction(code);
  const color = getAdminLogActionColor(code);
  const colorClass = getAdminLogActionClass(code);

  if (!info) {
    if (code && !adminLogWarnedActionCodes.has(code)) {
      console.warn('[ADMIN LOG] Mã hành động chưa có mapping:', code);
      adminLogWarnedActionCodes.add(code);
    }
    return {
      label: code || 'Thao tác khác',
      group: 'other',
      groupLabel: 'Khác',
      color: color,
      class: colorClass
    };
  }

  const group = adminLogCatalog.groups.find(item => item.key === info.group);
  return {
    label: info.label,
    group: info.group,
    groupLabel: group?.label || 'Khác',
    color: color,
    class: colorClass
  };
}

function getActionCodesForGroup(groupKey, actionTypes) {
  const actions = adminLogCatalog?.actions || {};
  if (groupKey === 'other') {
    return [...new Set((actionTypes || [])
      .map(code => String(code))
      .filter(code => !getCatalogAction(code)))];
  }

  const groupCodes = Object.entries(actions)
    .filter(([, info]) => info.group === groupKey)
    .map(([code]) => code);
  const observedCodes = new Map((actionTypes || []).map(code => [String(code).toUpperCase(), String(code)]));
  const uniqueCodes = new Map();
  groupCodes.forEach(code => {
    const normalized = code.toUpperCase();
    if (!uniqueCodes.has(normalized)) {
      uniqueCodes.set(normalized, observedCodes.get(normalized) || code);
    }
  });
  return [...uniqueCodes.values()];
}

/**
 * Hiển thị 1 trong 4 trạng thái của bảng nhật ký:
 * 'loading' | 'error' | 'empty' | 'success'
 */
function showAdminLogState(state, errorMessage = '') {
  const loadingEl = document.getElementById('admin-log-loading');
  const errorEl   = document.getElementById('admin-log-error');
  const emptyEl   = document.getElementById('admin-log-empty');
  const tableEl   = document.getElementById('admin-log-table-container');
  const paginEl   = document.getElementById('admin-log-pagination');
  const errorMsgEl = document.getElementById('admin-log-error-msg');

  if (loadingEl) loadingEl.classList.toggle('hidden', state !== 'loading');
  if (errorEl)   errorEl.classList.toggle('hidden', state !== 'error');
  if (emptyEl)   emptyEl.classList.toggle('hidden', state !== 'empty');
  if (tableEl)   tableEl.classList.toggle('hidden', state !== 'success');
  if (paginEl)   paginEl.classList.toggle('hidden', state === 'loading' || state === 'error');

  if (state === 'error' && errorMsgEl) {
    errorMsgEl.textContent = errorMessage || 'Đã xảy ra lỗi kết nối khi tải nhật ký hệ thống.';
  }
}

/**
 * Tải danh sách nhật ký quản trị từ Backend API
 * Hỗ trợ phân trang, lọc theo nhân viên, loại hành động, khoảng ngày, tìm kiếm
 */
async function loadAdminLogs(page = 1) {
  if (typeof isOwnerAdmin === 'function' && !isOwnerAdmin()) {
    if (window.SanBongApp && typeof window.SanBongApp.showToast === 'function') {
      window.SanBongApp.showToast('Bạn không có quyền xem nhật ký', 'error');
    }
    return;
  }
  currentLogPage = Math.max(1, parseInt(page, 10) || 1);
  showAdminLogState('loading');

  const staffSelect = document.getElementById('admin-log-filter-staff');
  const actionSelect = document.getElementById('admin-log-filter-action');
  const fromInput   = document.getElementById('admin-log-filter-from');
  const toInput     = document.getElementById('admin-log-filter-to');
  const searchInput = document.getElementById('admin-log-search');

  const staffId    = staffSelect ? staffSelect.value.trim() : '';
  const actionType = actionSelect ? actionSelect.value.trim() : '';
  const fromDate   = fromInput ? fromInput.value.trim() : '';
  const toDate     = toInput ? toInput.value.trim() : '';
  const search     = searchInput ? searchInput.value.trim() : '';

  const params = new URLSearchParams({
    action: 'audit_logs',
    page: String(currentLogPage),
    limit: String(currentLogLimit)
  });

  if (staffId !== '') params.set('admin_id', staffId);
  if (actionType.startsWith('__group__:')) {
    const groupKey = actionType.slice('__group__:'.length);
    const actionCodes = getActionCodesForGroup(groupKey, adminLogActionTypes);
    params.set('action_codes', actionCodes.length > 0 ? actionCodes.join(',') : '__NO_MATCH__');
  } else if (actionType !== '') {
    params.set('action_codes', actionType);
  }
  if (fromDate !== '') params.set('from_date', fromDate);
  if (toDate !== '') params.set('to_date', toDate);
  if (search !== '') params.set('search', search);

  try {
    await loadAdminLogCatalog();
    const fetchFn = window.adminFetchJson || async function (url) {
      const r = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
      const j = await r.json();
      return { ok: r.ok, ...j };
    };

    const res = await fetchFn('../api/admin.php?' + params.toString());

    const isOk = res && (res.ok === true || res.success === true);
    const payload = res ? (res.data || res.json?.data) : null;
    if (!isOk || !payload) {
      const errMsg = res?.message || res?.json?.message || (res && res.message) || 'Không thể lấy dữ liệu nhật ký hệ thống.';
      showAdminLogState('error', errMsg);
      const tbody = document.getElementById('admin-log-tbody');
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-4 py-8 text-center text-xs text-red-500">${escapeAdminLogHTML(errMsg)}</td></tr>`;
      }
      return;
    }

    const data = payload;
    adminLogActionTypes = Array.isArray(data.actionTypes) ? data.actionTypes.map(String) : [];
    const logs = Array.isArray(data.logs) ? data.logs : [];
    const pagination = data.pagination || {};

    currentLogTotalRecords = parseInt(pagination.total, 10) || logs.length;
    currentLogTotalPages   = Math.max(1, parseInt(pagination.totalPages, 10) || 1);
    currentLogLimit        = parseInt(pagination.limit, 10) || currentLogLimit;

    // Cập nhật bộ lọc dropdown (Staff & Action types) từ server nếu chưa nạp
    populateAdminLogFilters(data.staffList, data.actionTypes);

    // Cập nhật thông tin phân trang & badge tổng
    updateAdminLogPaginationUI();

    if (logs.length === 0) {
      showAdminLogState('empty');
      return;
    }

    // Render bảng dữ liệu
    renderAdminLogTable(logs, data.staffList);
    showAdminLogState('success');
  } catch (err) {
    console.error('[ADMIN LOG ERROR]', err);
    showAdminLogState('error', 'Lỗi ngoại lệ khi tải nhật ký: ' + (err.message || 'Network error'));
  }
}
window.loadAdminLogs = loadAdminLogs;

/**
 * Đổ dữ liệu vào 2 dropdown bộ lọc (Staff & Action Types)
 */
function populateAdminLogFilters(staffList, actionTypes) {
  adminLogActionTypes = Array.isArray(actionTypes) ? actionTypes.map(String) : [];

  // 1. Staff dropdown
  const staffSelect = document.getElementById('admin-log-filter-staff');
  if (staffSelect && !adminLogStaffOptionsPopulated) {
    const currentVal = staffSelect.value;
    staffSelect.innerHTML = '<option value="">Tất cả nhân sự</option>';
    (Array.isArray(staffList) ? staffList : []).forEach(s => {
      const opt = document.createElement('option');
      opt.value = String(s.id);
      const roleLabel = s.role === 'admin' ? 'Chủ sân' : (s.role === 'manager' ? 'Quản lý' : 'Nhân viên');
      opt.textContent = `${s.full_name || s.username} (${roleLabel})`;
      staffSelect.appendChild(opt);
    });
    const systemOption = document.createElement('option');
    systemOption.value = 'system';
    systemOption.textContent = 'Hệ thống (tự động)';
    staffSelect.appendChild(systemOption);
    if (currentVal) staffSelect.value = currentVal;
    adminLogStaffOptionsPopulated = true;
  }

  // 2. Action types dropdown
  const actionSelect = document.getElementById('admin-log-filter-action');
  if (actionSelect && adminLogCatalog && !adminLogActionOptionsPopulated) {
    const currentVal = actionSelect.value;
    actionSelect.innerHTML = '<option value="">Tất cả loại hành động</option>';

    adminLogCatalog.groups.forEach(group => {
      const knownActions = Object.entries(adminLogCatalog.actions)
        .filter(([, info]) => info.group === group.key);
      const unknownActions = group.key === 'other'
        ? [...new Set(adminLogActionTypes.filter(code => !getCatalogAction(code)))]
        : [];
      if (group.key === 'other' && unknownActions.length === 0) return;

      const options = [];
      if (group.key !== 'other') {
        const groupOption = document.createElement('option');
        groupOption.value = `__group__:${group.key}`;
        groupOption.textContent = `Cả nhóm · ${group.label}`;
        options.push(groupOption);

        const observedCodes = new Map(adminLogActionTypes.map(code => [code.toUpperCase(), code]));
        const groupedByLabel = new Map();

        knownActions.forEach(([code, info]) => {
          let label = String(info.label || '').trim();
          const upperCode = code.toUpperCase();
          if (['VOUCHER_SAVE', 'VOUCHER_CREATE', 'VOUCHER_UPDATE'].includes(upperCode)) {
            label = 'Lưu / Cập nhật voucher';
          }

          if (!groupedByLabel.has(label)) {
            groupedByLabel.set(label, {
              label: label,
              codes: []
            });
          }

          const entry = groupedByLabel.get(label);
          const actualCode = observedCodes.get(upperCode) || code;
          if (!entry.codes.includes(actualCode)) {
            entry.codes.push(actualCode);
          }
          if (!entry.codes.includes(upperCode)) {
            entry.codes.push(upperCode);
          }
        });

        [...groupedByLabel.values()]
          .sort((a, b) => a.label.localeCompare(b.label, 'vi', { sensitivity: 'base' }))
          .forEach(action => {
            const firstCode = action.codes[0] || '';
            const emoji = getAdminLogActionEmoji(firstCode);
            const option = document.createElement('option');
            option.value = action.codes.join(',');
            option.textContent = `${emoji} ${action.label}`;
            options.push(option);
          });
      } else {
        unknownActions.sort((a, b) => a.localeCompare(b, 'vi', { sensitivity: 'base' }))
          .forEach(code => {
            const emoji = getAdminLogActionEmoji(code);
            const option = document.createElement('option');
            option.value = code;
            option.textContent = `${emoji} ${code}`;
            options.push(option);
          });
      }

      const optgroup = document.createElement('optgroup');
      optgroup.label = group.label;
      options.forEach(option => optgroup.appendChild(option));
      actionSelect.appendChild(optgroup);
    });
    if (currentVal) actionSelect.value = currentVal;
    adminLogActionOptionsPopulated = true;
  }
}

function getActionDisplayLabel(action) {
  const info = getActionBadgeInfo(action);
  return info.label;
}

function formatAdminLogValue(key, value) {
  if (value === undefined || value === null) return '(trống)';
  const field = adminLogCatalog?.fields?.[key];
  const raw = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (!field?.format) return raw;

  if (field.format === 'currency') {
    const digits = raw.replace(/[^\d-]/g, '');
    if (!digits || digits === '-') return raw;
    const amount = Number(digits);
    return Number.isFinite(amount) ? `${amount.toLocaleString('vi-VN')}đ` : raw;
  }

  if (field.format === 'number') {
    const number = Number(raw);
    return Number.isFinite(number) ? number.toLocaleString('vi-VN') : raw;
  }

  if (field.format === 'percent') {
    return /%$/.test(raw.trim()) ? raw : `${raw}%`;
  }

  if (field.format === 'minutes' || field.format === 'hours') {
    const unit = field.format === 'minutes' ? ' phút' : ' giờ';
    return /(?:phút|giờ)$/.test(raw.trim()) ? raw : `${raw}${unit}`;
  }

  if (field.format === 'boolean') {
    const normalized = raw.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return 'Bật';
    if (['0', 'false', 'no', 'off'].includes(normalized)) return 'Tắt';
  }

  return raw;
}

/**
 * Giải mã JSON audit, kể cả khi JSON đã được encode lồng một lần.
 */
function parseAdminLogValue(value) {
  if (typeof value !== 'string') return value;

  let raw = value.trim();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (!/^[{["]/.test(raw)) return value;
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'string') {
        raw = parsed.trim();
        continue;
      }
      return parsed;
    } catch (error) {
      return value;
    }
  }
  return value;
}

function normalizeAdminLogObject(value) {
  if (!Array.isArray(value)) return value;
  if (value.length === 1 && value[0] && typeof value[0] === 'object' && !Array.isArray(value[0])) {
    return value[0];
  }

  if (value.length > 0 && value.every(item => item && typeof item === 'object' && !Array.isArray(item))) {
    const mapped = {};
    let hasKeyValuePairs = false;
    value.forEach(item => {
      const key = item.key ?? item.setting_key;
      if (typeof key === 'string') {
        mapped[key] = item.value ?? item.setting_value ?? '';
        hasKeyValuePairs = true;
      }
    });
    if (hasKeyValuePairs) return mapped;
  }

  return value;
}

function renderLogMessage(message) {
  const text = String(message || '').trim();
  if (!text) return '';

  const safeText = escapeAdminLogHTML(text);
  const containsSerializedData = /(?:\{\s*["']?[A-Za-z_][\w-]*["']?\s*:|\[\s*\{)/.test(text);
  if (text.length <= 180 && !containsSerializedData) {
    return `<div class="text-xs text-slate-600 leading-relaxed line-clamp-2 break-words">${safeText}</div>`;
  }

  const preview = `${escapeAdminLogHTML(text.slice(0, 130))}${text.length > 130 ? '…' : ''}`;
  return `
    <details class="rounded-lg border border-slate-200 bg-slate-50">
      <summary class="cursor-pointer px-2.5 py-2 text-xs text-slate-600 leading-relaxed break-words">
        <span class="line-clamp-2">${preview}</span>
        <span class="mt-1 inline-block text-[10px] font-semibold text-emerald-700">Xem nội dung đầy đủ</span>
      </summary>
      <div class="max-h-40 overflow-auto whitespace-pre-wrap break-words border-t border-slate-200 px-2.5 py-2 text-xs text-slate-600">${safeText}</div>
    </details>
  `;
}

/**
 * So sánh thay đổi theo trường và chỉ mở rộng khi người dùng cần xem.
 */
function renderLogDiffContent(oldValRaw, newValRaw, action = '') {
  const oldValue = normalizeAdminLogObject(parseAdminLogValue(oldValRaw));
  const newValue = normalizeAdminLogObject(parseAdminLogValue(newValRaw));
  const isPlainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const isJsonCandidate = value => typeof value === 'string' && /^[\s]*[{[]/.test(value);
  const isMalformedJson = (raw, parsed) => isJsonCandidate(raw) && parsed === raw;

  if (isMalformedJson(oldValRaw, oldValue) || isMalformedJson(newValRaw, newValue)) {
    const rawText = [oldValRaw, newValRaw]
      .filter(value => value !== null && value !== undefined && String(value) !== '')
      .map(value => String(value))
      .join(' → ');
    const safeText = escapeAdminLogHTML(rawText);
    if (rawText.length <= 150) {
      return `<div class="whitespace-pre-wrap break-all text-[11px] text-slate-600">${safeText}</div>`;
    }

    return `
      <details class="rounded-lg border border-slate-200 bg-slate-50">
        <summary class="cursor-pointer break-all px-2.5 py-2 text-xs text-slate-600">
          ${escapeAdminLogHTML(rawText.slice(0, 150))}…
          <span class="ml-1 font-semibold text-emerald-700">Xem thêm</span>
        </summary>
        <div class="whitespace-pre-wrap break-all overflow-x-hidden border-t border-slate-200 px-2.5 py-2 text-xs text-slate-600">${safeText}</div>
      </details>
    `;
  }

  const comparableValue = value => {
    if (Array.isArray(value)) return `[${value.map(comparableValue).join(',')}]`;
    if (isPlainObject(value)) {
      return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${comparableValue(value[key])}`).join(',')}}`;
    }
    return String(value);
  };
  const diffItems = [];

  if (isPlainObject(oldValue) || isPlainObject(newValue)) {
    const oldObj = isPlainObject(oldValue) ? oldValue : {};
    const newObj = isPlainObject(newValue) ? newValue : {};
    const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]))
      .sort((a, b) => {
        const labelA = adminLogCatalog?.fields?.[a]?.label || a;
        const labelB = adminLogCatalog?.fields?.[b]?.label || b;
        return labelA.localeCompare(labelB, 'vi', { sensitivity: 'base' });
      });

    allKeys.forEach(k => {
      // Bỏ qua các key hệ thống / nhạy cảm
      if (['password', 'password_hash', 'token', 'csrf_token', 'totp_secret', 'api_key'].includes(k)) return;
      const field = Object.prototype.hasOwnProperty.call(adminLogCatalog?.fields || {}, k)
        ? adminLogCatalog.fields[k]
        : null;
      const fieldLabel = field?.label || k;
      const oldExists = Object.prototype.hasOwnProperty.call(oldObj, k);
      const newExists = Object.prototype.hasOwnProperty.call(newObj, k);
      if (oldExists && newExists && comparableValue(oldObj[k]) === comparableValue(newObj[k])) return;

      const vOld = oldExists ? formatAdminLogValue(k, oldObj[k]) : '—';
      const vNew = newExists ? formatAdminLogValue(k, newObj[k]) : '—';
      diffItems.push(`
        <div class="whitespace-normal break-all py-0.5 text-[11px] leading-relaxed">
          <span class="font-semibold text-slate-600">- ${escapeAdminLogHTML(fieldLabel)}:</span>
          <del class="text-rose-700">${escapeAdminLogHTML(vOld)}</del>
          <span class="text-slate-400"> → </span>
          <strong class="text-emerald-800">${escapeAdminLogHTML(vNew)}</strong>
        </div>
      `);
    });
  } else if (oldValue !== null || newValue !== null) {
    const oldExists = oldValue !== null && oldValue !== undefined;
    const newExists = newValue !== null && newValue !== undefined;
    if (!oldExists || !newExists || comparableValue(oldValue) !== comparableValue(newValue)) {
      const vOld = oldExists ? formatAdminLogValue('', oldValue) : '—';
      const vNew = newExists ? formatAdminLogValue('', newValue) : '—';
      const actionCode = String(action || '').trim().toUpperCase();
      const fieldLabel = ADMIN_LOG_SCALAR_FIELD_LABELS[actionCode] || String(action || 'UNKNOWN_ACTION');
      diffItems.push(`
        <div class="whitespace-normal break-all py-0.5 text-[11px] leading-relaxed">
          <span class="font-semibold text-slate-600">- ${escapeAdminLogHTML(fieldLabel)}:</span>
          <del class="text-rose-700">${escapeAdminLogHTML(vOld)}</del>
          <span class="text-slate-400"> → </span>
          <strong class="text-emerald-800">${escapeAdminLogHTML(vNew)}</strong>
        </div>
      `);
    }
  }

  if (diffItems.length === 0) return '<div class="text-[11px] italic text-slate-500">Không có thay đổi giá trị</div>';
  if (diffItems.length <= 5) {
    return `<div class="max-w-full overflow-x-hidden">${diffItems.join('')}</div>`;
  }

  return `
    <details class="max-w-full rounded-lg border border-slate-200 bg-white">
      <summary class="cursor-pointer px-2.5 py-2 text-xs font-semibold text-slate-700">
        ${diffItems.length} trường thay đổi · Xem chi tiết
      </summary>
      <div class="max-h-64 overflow-y-auto overflow-x-hidden border-t border-slate-200 px-2.5 py-1">
        ${diffItems.join('')}
      </div>
    </details>
  `;
}

function formatAdminLogTimestamp(value) {
  const text = String(value || '').trim();
  if (!text) return '---';
  if (/^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}$/.test(text)) return text;

  const sqlTimestamp = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (sqlTimestamp) {
    return `${sqlTimestamp[3]}/${sqlTimestamp[2]}/${sqlTimestamp[1]} ${sqlTimestamp[4]}:${sqlTimestamp[5]}`;
  }
  return text;
}

function formatAdminLogRelativeTime(value) {
  const text = String(value || '').trim();
  if (!text) return '';

  let d = null;
  const sqlMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (sqlMatch) {
    d = new Date(
      parseInt(sqlMatch[1], 10),
      parseInt(sqlMatch[2], 10) - 1,
      parseInt(sqlMatch[3], 10),
      parseInt(sqlMatch[4], 10),
      parseInt(sqlMatch[5], 10),
      parseInt(sqlMatch[6] || 0, 10)
    );
  } else {
    const dmyMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/);
    if (dmyMatch) {
      d = new Date(
        parseInt(dmyMatch[3], 10),
        parseInt(dmyMatch[2], 10) - 1,
        parseInt(dmyMatch[1], 10),
        parseInt(dmyMatch[4] || 0, 10),
        parseInt(dmyMatch[5] || 0, 10)
      );
    } else {
      d = new Date(text);
    }
  }

  if (!d || isNaN(d.getTime())) return '';

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffSec < 60) return 'Vừa xong';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24 && now.getDate() === d.getDate() && now.getMonth() === d.getMonth() && now.getFullYear() === d.getFullYear()) {
    return `${diffHours} giờ trước`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (yesterday.getDate() === d.getDate() && yesterday.getMonth() === d.getMonth() && yesterday.getFullYear() === d.getFullYear()) {
    return 'Hôm qua';
  }

  const diffDays = Math.floor(diffSec / 86400);
  if (diffDays <= 7) {
    return `${Math.max(1, diffDays)} ngày trước`;
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Chuẩn hóa và suy đoán thông tin Đối tượng thao tác (Loại đối tượng + Tên/Mã đối tượng)
 */
function resolveAdminLogTarget(item) {
  const action = String(item.action || '').trim().toUpperCase();
  let rawType = String(item.target_type || '').trim().toLowerCase();
  let rawId = String(item.target_id || item.booking_id || '').trim();

  // 1. Nếu có sẵn rawId nhưng rawType rỗng hoặc generic 'other', suy luận loại dựa trên ID và Action
  if (rawId !== '') {
    if (!rawType || rawType === 'null' || rawType === 'other' || rawType === 'đối tượng') {
      if (/^P\d+-/i.test(rawId) || action.includes('PITCH')) {
        rawType = 'pitch';
      } else if (/^BK-/i.test(rawId) || /^[A-Z0-9]{8,12}$/i.test(rawId) || action.includes('BOOKING') || action === 'CHECKIN' || action === 'RESTORE_BOOKING') {
        rawType = 'booking';
      } else if (action.includes('VOUCHER') || /^VC-/i.test(rawId) || /^QA/i.test(rawId)) {
        rawType = 'voucher';
      } else if (action.includes('SERVICE') || /^SRV-/i.test(rawId)) {
        rawType = 'service';
      } else if (action.includes('EXPENSE') || /^EXP-/i.test(rawId)) {
        rawType = 'expense';
      } else if (action.includes('SHIFT')) {
        rawType = 'shift';
      } else if (action.includes('USER') || action.includes('MEMBER') || action.includes('STAFF')) {
        rawType = 'user';
      }
    }
  } else {
    // 2. Nếu rawId hoàn toàn rỗng (các thao tác cấp hệ thống, bảng giá, bảo mật...)
    if (['UPDATE_PRICING', 'UPDATE_PRICE', 'PRICE_UPDATE'].includes(action)) {
      return { typeLabel: 'Bảng giá', idText: 'Bảng giá sân' };
    }
    if (['ENABLE_2FA', 'DISABLE_2FA', '2FA_TOGGLE'].includes(action)) {
      return { typeLabel: 'Bảo mật', idText: 'Xác thực 2FA' };
    }
    if (['UPDATE_SETTINGS', 'SYSTEM_SETTINGS'].includes(action)) {
      return { typeLabel: 'Cài đặt', idText: 'Cấu hình chung' };
    }
    if (['DB_BACKUP', 'DB_BACKUP_DOWNLOAD'].includes(action)) {
      return { typeLabel: 'Hệ thống', idText: 'Sao lưu CSDL' };
    }
    if (['GOLDEN_HOUR_SAVE', 'GOLDEN_HOUR_DELETE'].includes(action)) {
      return { typeLabel: 'Khuyến mãi', idText: 'Giờ vàng' };
    }
    if (['SAMPLE_DATA_CLEAN', 'SAMPLE_DATA_SEED'].includes(action)) {
      return { typeLabel: 'Dữ liệu', idText: 'Dữ liệu mẫu' };
    }
    if (['TELEGRAM_TEST', 'TEST_TELEGRAM'].includes(action)) {
      return { typeLabel: 'Thông báo', idText: 'Bot Telegram' };
    }
    if (['RUN_RECURRING_GEN'].includes(action)) {
      return { typeLabel: 'Lịch lặp', idText: 'Tự động sinh' };
    }
    if (['RUN_REMINDERS'].includes(action)) {
      return { typeLabel: 'Nhắc lịch', idText: 'Gửi nhắc đá' };
    }
    if (action.includes('SHIFT')) {
      return { typeLabel: 'Ca trực', idText: 'Ca trực' };
    }
    if (action.includes('CHANGE_PASSWORD')) {
      return { typeLabel: 'Tài khoản', idText: 'Đổi mật khẩu' };
    }
    if (action.includes('WALKIN')) {
      return { typeLabel: 'Đặt tại quầy', idText: 'Đơn tại quầy' };
    }
  }

  // 3. Mapping nhãn loại đối tượng
  let typeLabel = 'Đối tượng';
  if (['user', 'customer', 'member'].includes(rawType)) typeLabel = 'Hội viên';
  else if (['staff'].includes(rawType)) typeLabel = 'Nhân sự';
  else if (rawType === 'booking') typeLabel = 'Mã ca';
  else if (rawType === 'pitch') typeLabel = 'Sân';
  else if (rawType === 'service') typeLabel = 'Dịch vụ';
  else if (rawType === 'voucher') typeLabel = 'Voucher';
  else if (rawType === 'expense') typeLabel = 'Khoản chi';
  else if (rawType === 'shift') typeLabel = 'Ca trực';
  else if (rawType === 'settings') typeLabel = 'Cài đặt';
  else if (rawType === 'pricing') typeLabel = 'Bảng giá';
  else if (rawType === 'security') typeLabel = 'Bảo mật';
  else if (rawType === 'database' || rawType === 'system') typeLabel = 'Hệ thống';

  return {
    typeLabel: typeLabel,
    idText: rawId || 'Toàn hệ thống'
  };
}

/**
 * Render dữ liệu vào tbody của bảng
 */
function renderAdminLogTable(logs, staffList = []) {
  const tbody = document.getElementById('admin-log-tbody');
  if (!tbody) return;

  const staffById = new Map(
    (Array.isArray(staffList) ? staffList : []).map(staff => [String(staff.id), staff])
  );
  const html = logs.map(item => {
    const timeStr = formatAdminLogTimestamp(item.created_at_formatted || item.created_at);
    const relativeTimeStr = formatAdminLogRelativeTime(item.created_at || item.created_at_formatted);
    const storedActorRole = String(item.actor_role || 'admin').toLowerCase();
    const isSystemActor = storedActorRole === 'system' || item.user_id === null || item.user_id === 0 || item.user_id === '0';
    const actorRole = isSystemActor ? 'system' : storedActorRole;
    const actorStaff = staffById.get(String(item.user_id || ''));
    const actorNameUsername = String(item.actor_name || '').match(/\(([^()]*)\)\s*$/)?.[1];
    const actorUsername = escapeAdminLogHTML(isSystemActor
      ? 'Hệ thống (tự động)'
      : (item.actor_username || item.username || actorStaff?.username || actorNameUsername || item.actor_name || ('User #' + (item.user_id || '0'))));
    
    // Role styling
    let roleBadgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
    let roleLabel = 'Nhân sự';
    if (actorRole === 'admin') {
      roleBadgeClass = 'bg-rose-100 text-rose-800 border-rose-200';
      roleLabel = 'Chủ sân';
    } else if (actorRole === 'manager') {
      roleBadgeClass = 'bg-purple-100 text-purple-800 border-purple-200';
      roleLabel = 'Quản lý';
    } else if (actorRole === 'staff') {
      roleBadgeClass = 'bg-blue-100 text-blue-800 border-blue-200';
      roleLabel = 'Nhân viên';
    } else if (actorRole === 'system') {
      roleBadgeClass = 'bg-slate-200 text-slate-700 border-slate-300';
      roleLabel = 'Tự động';
    }

    // Action info
    const actionBadge = getActionBadgeInfo(item.action);

    // Target display
    const targetInfo = resolveAdminLogTarget(item);
    const targetDisplayHtml = `
      <div class="min-w-0">
        <div class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">${escapeAdminLogHTML(targetInfo.typeLabel)}</div>
        <div class="font-mono font-bold text-xs text-[#0F172A] truncate" title="${escapeAdminLogHTML(targetInfo.idText)}">${escapeAdminLogHTML(targetInfo.idText)}</div>
      </div>
    `;

    // Ưu tiên diff có cấu trúc để không lặp lại JSON dài từ API.
    const diffHtml = renderLogDiffContent(item.old_value, item.new_value, item.action);
    const formattedMsg = item.formatted_message || `${actorUsername} thực hiện thao tác ${actionBadge.label}`;
    const contentHtml = diffHtml || renderLogMessage(formattedMsg);

    // IP & User Agent
    const ip = escapeAdminLogHTML(item.ip || item.ip_address || '---');

    return `
      <tr class="hover:bg-slate-50/80 transition-colors">
        <!-- 1. Người thực hiện -->
        <td class="py-3 px-4 align-top">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-full bg-slate-800 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
              ${actorUsername.charAt(0).toUpperCase()}
            </div>
            <div class="min-w-0">
              <div class="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5">
                <span class="inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold ${roleBadgeClass}">${roleLabel}</span>
                <span class="break-all text-xs font-bold text-[#0F172A]">(${actorUsername})</span>
              </div>
              <div class="text-[10px] text-slate-400">#${item.id}</div>
            </div>
          </div>
        </td>

        <!-- 2. Hành động -->
        <td class="py-3 px-4 align-top min-w-[220px] whitespace-nowrap">
          <div class="mb-1 text-[10px] font-semibold text-slate-500">Hành động:</div>
          <span class="inline-flex w-fit whitespace-nowrap items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${actionBadge.class}" title="Mã kỹ thuật: ${escapeAdminLogHTML(item.action)}">
            ${escapeAdminLogHTML(actionBadge.label)}
          </span>
          <div class="text-[10px] text-slate-400 mt-0.5">${escapeAdminLogHTML(actionBadge.groupLabel)}</div>
        </td>

        <!-- 3. Đối tượng -->
        <td class="py-3 px-4 align-top whitespace-nowrap">
          ${targetDisplayHtml}
        </td>

        <!-- 4. Tóm tắt hoặc diff chi tiết -->
        <td class="py-3 px-4 align-top min-w-0">
          ${contentHtml}
        </td>

        <!-- 5. Thời gian (IP tooltip khi rê chuột) -->
        <td class="py-3 px-4 align-top text-right whitespace-nowrap" title="IP: ${escapeAdminLogHTML(ip)}">
          <div class="font-mono text-xs font-medium text-slate-700">${escapeAdminLogHTML(timeStr)}</div>
          <div class="text-[10px] text-slate-400 mt-0.5">${escapeAdminLogHTML(relativeTimeStr)}</div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = html;
}

/**
 * Cập nhật giao diện phân trang & tổng số bản ghi
 */
function updateAdminLogPaginationUI() {
  const currentEl = document.getElementById('admin-log-page-current');
  const totalEl   = document.getElementById('admin-log-page-total');
  const countEl   = document.getElementById('admin-log-total-count');
  const badgeEl   = document.getElementById('admin-log-total-badge');
  const limitSel  = document.getElementById('admin-log-limit-select');

  const firstBtn = document.getElementById('admin-log-first-btn');
  const prevBtn  = document.getElementById('admin-log-prev-btn');
  const nextBtn  = document.getElementById('admin-log-next-btn');
  const lastBtn  = document.getElementById('admin-log-last-btn');

  if (currentEl) currentEl.textContent = String(currentLogPage);
  if (totalEl)   totalEl.textContent   = String(currentLogTotalPages);
  if (countEl)   countEl.textContent   = String(currentLogTotalRecords.toLocaleString('vi-VN'));
  if (badgeEl)   badgeEl.textContent   = `${currentLogTotalRecords.toLocaleString('vi-VN')} bản ghi`;
  if (limitSel)  limitSel.value        = String(currentLogLimit);

  if (firstBtn) firstBtn.disabled = (currentLogPage <= 1);
  if (prevBtn)  prevBtn.disabled  = (currentLogPage <= 1);
  if (nextBtn)  nextBtn.disabled  = (currentLogPage >= currentLogTotalPages);
  if (lastBtn)  lastBtn.disabled  = (currentLogPage >= currentLogTotalPages);
}

/**
 * Điều hướng trang
 */
function goToAdminLogPage(page) {
  const p = Math.max(1, Math.min(currentLogTotalPages, parseInt(page, 10) || 1));
  if (p === currentLogPage) return;
  loadAdminLogs(p);
}
window.goToAdminLogPage = goToAdminLogPage;

function prevAdminLogPage() {
  if (currentLogPage > 1) {
    goToAdminLogPage(currentLogPage - 1);
  }
}
window.prevAdminLogPage = prevAdminLogPage;

function nextAdminLogPage() {
  if (currentLogPage < currentLogTotalPages) {
    goToAdminLogPage(currentLogPage + 1);
  }
}
window.nextAdminLogPage = nextAdminLogPage;

function goToAdminLogLastPage() {
  goToAdminLogPage(currentLogTotalPages);
}
window.goToAdminLogLastPage = goToAdminLogLastPage;

function handleAdminLogLimitChange(newLimit) {
  currentLogLimit = Math.max(10, Math.min(100, parseInt(newLimit, 10) || 20));
  loadAdminLogs(1);
}
window.handleAdminLogLimitChange = handleAdminLogLimitChange;

/**
 * Xử lý thay đổi bộ lọc Dropdown hoặc Ngày
 */
function handleAdminLogFilterChange() {
  loadAdminLogs(1);
}
window.handleAdminLogFilterChange = handleAdminLogFilterChange;

/**
 * Debounce tìm kiếm từ khóa (300ms)
 */
function handleAdminLogSearchDebounced() {
  const searchInput = document.getElementById('admin-log-search');
  const clearBtn    = document.getElementById('admin-log-search-clear');
  if (clearBtn && searchInput) {
    clearBtn.classList.toggle('hidden', searchInput.value.trim() === '');
  }

  if (adminLogSearchDebounceTimer) {
    clearTimeout(adminLogSearchDebounceTimer);
  }
  adminLogSearchDebounceTimer = setTimeout(() => {
    loadAdminLogs(1);
  }, 300);
}
window.handleAdminLogSearchDebounced = handleAdminLogSearchDebounced;

/**
 * Xóa ô tìm kiếm
 */
function clearAdminLogSearch() {
  const searchInput = document.getElementById('admin-log-search');
  const clearBtn    = document.getElementById('admin-log-search-clear');
  if (searchInput) searchInput.value = '';
  if (clearBtn) clearBtn.classList.add('hidden');
  loadAdminLogs(1);
}
window.clearAdminLogSearch = clearAdminLogSearch;

/**
 * Đặt lại tất cả bộ lọc về mặc định
 */
function resetAdminLogFilters() {
  const staffSelect = document.getElementById('admin-log-filter-staff');
  const actionSelect = document.getElementById('admin-log-filter-action');
  const fromInput   = document.getElementById('admin-log-filter-from');
  const toInput     = document.getElementById('admin-log-filter-to');
  const searchInput = document.getElementById('admin-log-search');
  const clearBtn    = document.getElementById('admin-log-search-clear');

  if (staffSelect)  staffSelect.value = '';
  if (actionSelect) actionSelect.value = '';
  if (fromInput)    fromInput.value = '';
  if (toInput)      toInput.value = '';
  if (searchInput)  searchInput.value = '';
  if (clearBtn)     clearBtn.classList.add('hidden');

  loadAdminLogs(1);
}
window.resetAdminLogFilters = resetAdminLogFilters;
