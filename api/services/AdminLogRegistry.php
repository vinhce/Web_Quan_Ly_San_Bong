<?php
declare(strict_types=1);

/**
 * AdminLogRegistry - Single source of truth for Tab 11 Audit Log catalog,
 * 6 category codes (TD/XH/CN/CB/TQ/TT), 7+1 data groups, field labels,
 * mandatory reason validation, phone masking, diff extraction, and 9 anomaly rules.
 */
final class AdminLogRegistry
{
    public const CATEGORIES = [
        'TD' => ['code' => 'TD', 'short_code' => 'TD', 'label' => 'Tạo / Duyệt', 'color' => 'green', 'token' => '--g'],
        'XH' => ['code' => 'XH', 'short_code' => 'XHC', 'label' => 'Xóa / Hủy / Chi tiền', 'color' => 'red', 'token' => '--r'],
        'CN' => ['code' => 'CN', 'short_code' => 'CN', 'label' => 'Cập nhật', 'color' => 'blue', 'token' => '--b'],
        'CB' => ['code' => 'CB', 'short_code' => 'CB', 'label' => 'Cảnh báo', 'color' => 'yellow', 'token' => '--y'],
        'TQ' => ['code' => 'TQ', 'short_code' => 'TQ', 'label' => 'Tiền quầy', 'color' => 'purple', 'token' => '--p'],
        'TT' => ['code' => 'TT', 'short_code' => 'AUTO', 'label' => 'Tự động', 'color' => 'neutral', 'token' => '--n'],
    ];

    public const DATA_GROUPS = [
        'Ca trực',
        'Tiền & đặt cọc',
        'Hội viên & điểm',
        'Giá & voucher',
        'Sân & Lịch đặt',
        'Cài đặt',
        'Nhân sự & Bảo mật',
        'Khác',
    ];

    public const ACTIONS = [
        // Ca trực
        'SHIFT_OPEN'                    => ['label' => 'Mở ca trực', 'category' => 'TD', 'data_group' => 'Ca trực'],
        'OPEN_SHIFT'                    => ['label' => 'Mở ca trực', 'category' => 'TD', 'data_group' => 'Ca trực'],
        'SHIFT_CLOSE'                   => ['label' => 'Đóng ca trực', 'category' => 'CB', 'data_group' => 'Ca trực'],
        'CLOSE_SHIFT'                   => ['label' => 'Đóng ca trực', 'category' => 'CB', 'data_group' => 'Ca trực'],
        'SHIFT_HANDOVER'                => ['label' => 'Giao ca trực', 'category' => 'CB', 'data_group' => 'Ca trực'],
        'SHIFT_CONFIRM'                 => ['label' => 'Xác nhận chốt ca', 'category' => 'TD', 'data_group' => 'Ca trực'],
        'SHIFT_EDIT_COUNT'              => ['label' => 'Sửa số liệu kiểm đếm ca', 'category' => 'CB', 'data_group' => 'Ca trực'],

        // Tiền & đặt cọc
        'COLLECT_PAYMENT'               => ['label' => 'Thu tiền tại quầy', 'category' => 'TQ', 'data_group' => 'Tiền & đặt cọc'],
        'COUNTER_SALE'                  => ['label' => 'Bán hàng tại quầy', 'category' => 'TQ', 'data_group' => 'Tiền & đặt cọc'],
        'ADJUST_DISCOUNT'               => ['label' => 'Điều chỉnh giảm giá đơn', 'category' => 'CB', 'data_group' => 'Tiền & đặt cọc'],
        'UPDATE_PAYMENT'                => ['label' => 'Cập nhật thanh toán', 'category' => 'CN', 'data_group' => 'Tiền & đặt cọc'],
        'UPDATE_FINANCE'                => ['label' => 'Cập nhật thông tin tài chính', 'category' => 'CN', 'data_group' => 'Tiền & đặt cọc'],
        'RECONCILE_MANUAL'              => ['label' => 'Gán giao dịch thủ công', 'category' => 'TD', 'data_group' => 'Tiền & đặt cọc'],
        'RECONCILE_RESOLVE'             => ['label' => 'Xử lý đối soát', 'category' => 'CB', 'data_group' => 'Tiền & đặt cọc'],
        'WEBHOOK_MATCH'                 => ['label' => 'Giao dịch ngân hàng khớp đơn', 'category' => 'TD', 'data_group' => 'Tiền & đặt cọc'],
        'WEBHOOK_UNDERPAID'             => ['label' => 'Giao dịch ngân hàng chuyển thiếu', 'category' => 'XH', 'data_group' => 'Tiền & đặt cọc'],
        'WEBHOOK_OVERPAID'              => ['label' => 'Giao dịch ngân hàng chuyển thừa', 'category' => 'CB', 'data_group' => 'Tiền & đặt cọc'],
        'WEBHOOK_UNMATCHED'             => ['label' => 'Giao dịch ngân hàng không khớp đơn', 'category' => 'CB', 'data_group' => 'Tiền & đặt cọc'],
        'CONFIRM_DEPOSIT'               => ['label' => 'Xác nhận đặt cọc', 'category' => 'TD', 'data_group' => 'Tiền & đặt cọc'],
        'APPROVE_DEPOSIT'               => ['label' => 'Duyệt đặt cọc', 'category' => 'TD', 'data_group' => 'Tiền & đặt cọc'],
        'REJECT_DEPOSIT'                => ['label' => 'Từ chối đặt cọc', 'category' => 'XH', 'data_group' => 'Tiền & đặt cọc'],
        'EXPENSE_ADD'                   => ['label' => 'Thêm khoản chi', 'category' => 'XH', 'data_group' => 'Tiền & đặt cọc'],
        'EXPENSE_UPDATE'                => ['label' => 'Cập nhật khoản chi', 'category' => 'CN', 'data_group' => 'Tiền & đặt cọc'],
        'EXPENSE_DELETE'                => ['label' => 'Xóa khoản chi', 'category' => 'XH', 'data_group' => 'Tiền & đặt cọc'],
        'EXPORT_REPORTS'                => ['label' => 'Xuất báo cáo doanh thu', 'category' => 'TD', 'data_group' => 'Tiền & đặt cọc'],

        // Hội viên & điểm
        'ADJUST_POINTS'                 => ['label' => 'Điều chỉnh điểm', 'category' => 'CN', 'data_group' => 'Hội viên & điểm'],
        'CRM_CUSTOMER_UPDATE'           => ['label' => 'Cập nhật hồ sơ khách hàng', 'category' => 'CN', 'data_group' => 'Hội viên & điểm'],
        'CRM_UPDATE'                    => ['label' => 'Cập nhật hồ sơ khách', 'category' => 'CN', 'data_group' => 'Hội viên & điểm'],
        'UPDATE_MEMBER'                 => ['label' => 'Cập nhật hội viên', 'category' => 'CN', 'data_group' => 'Hội viên & điểm'],
        'UPDATE_PROFILE'                => ['label' => 'Cập nhật hồ sơ cá nhân', 'category' => 'CN', 'data_group' => 'Hội viên & điểm'],
        'USER_EDIT'                     => ['label' => 'Sửa thông tin hội viên', 'category' => 'CN', 'data_group' => 'Hội viên & điểm'],

        // Giá & voucher
        'UPDATE_PRICING'                => ['label' => 'Cập nhật giá sân', 'category' => 'CN', 'data_group' => 'Giá & voucher'],
        'UPDATE_PRICE'                  => ['label' => 'Cập nhật giá sân', 'category' => 'CN', 'data_group' => 'Giá & voucher'],
        'PRICE_UPDATE'                  => ['label' => 'Cập nhật giá sân', 'category' => 'CN', 'data_group' => 'Giá & voucher'],
        'VOUCHER_SAVE'                  => ['label' => 'Lưu voucher', 'category' => 'CN', 'data_group' => 'Giá & voucher'],
        'VOUCHER_CREATE'                => ['label' => 'Tạo voucher', 'category' => 'TD', 'data_group' => 'Giá & voucher'],
        'VOUCHER_UPDATE'                => ['label' => 'Cập nhật voucher', 'category' => 'CN', 'data_group' => 'Giá & voucher'],
        'VOUCHER_DELETE'                => ['label' => 'Xóa voucher', 'category' => 'XH', 'data_group' => 'Giá & voucher'],
        'VOUCHER_TOGGLE'                => ['label' => 'Bật/tắt voucher', 'category' => 'CN', 'data_group' => 'Giá & voucher'],
        'VOUCHER_TOGGLE_STATUS'         => ['label' => 'Bật/tắt voucher', 'category' => 'CN', 'data_group' => 'Giá & voucher'],
        'GOLDEN_HOUR_SAVE'              => ['label' => 'Lưu quy tắc giờ vàng', 'category' => 'CN', 'data_group' => 'Giá & voucher'],
        'GOLDEN_HOUR_DELETE'            => ['label' => 'Xóa quy tắc giờ vàng', 'category' => 'XH', 'data_group' => 'Giá & voucher'],
        'PACKAGE_SAVE'                  => ['label' => 'Lưu gói cố định theo tháng', 'category' => 'TD', 'data_group' => 'Giá & voucher'],
        'PACKAGE_DELETE'                => ['label' => 'Xóa gói cố định theo tháng', 'category' => 'XH', 'data_group' => 'Giá & voucher'],
        'PACKAGE_TOGGLE'                => ['label' => 'Bật/tắt gói cố định theo tháng', 'category' => 'CN', 'data_group' => 'Giá & voucher'],

        // Sân & Lịch đặt
        'WALKIN_BOOKING'                => ['label' => 'Tạo đơn tại quầy', 'category' => 'TD', 'data_group' => 'Sân & Lịch đặt'],
        'WALKIN_PAST_SLOT'              => ['label' => 'Duyệt đặt sân quá khứ', 'category' => 'CB', 'data_group' => 'Sân & Lịch đặt'],
        'CHECKIN'                       => ['label' => 'Check-in nhận sân', 'category' => 'CN', 'data_group' => 'Sân & Lịch đặt'],
        'COMPLETE_BOOKING'              => ['label' => 'Hoàn tất đơn đặt sân', 'category' => 'TD', 'data_group' => 'Sân & Lịch đặt'],
        'CANCEL_BOOKING'                => ['label' => 'Hủy đơn đặt sân', 'category' => 'XH', 'data_group' => 'Sân & Lịch đặt'],
        'EARLY_CANCEL'                  => ['label' => 'Hủy đơn sớm', 'category' => 'XH', 'data_group' => 'Sân & Lịch đặt'],
        'RESTORE_BOOKING'               => ['label' => 'Khôi phục đơn', 'category' => 'TD', 'data_group' => 'Sân & Lịch đặt'],
        'NOSHOW_RELEASE_SLOT'           => ['label' => 'Nhả sân khách vắng', 'category' => 'CB', 'data_group' => 'Sân & Lịch đặt'],
        'TRANSFER_PITCH'                => ['label' => 'Chuyển sân đặt', 'category' => 'CN', 'data_group' => 'Sân & Lịch đặt'],
        'ADD_SERVICE'                   => ['label' => 'Thêm dịch vụ vào đơn', 'category' => 'TD', 'data_group' => 'Sân & Lịch đặt'],
        'ADD_OVERTIME'                  => ['label' => 'Thêm giờ đá', 'category' => 'TD', 'data_group' => 'Sân & Lịch đặt'],
        'BOOKING_BATCH_OP'              => ['label' => 'Thao tác hàng loạt đơn đặt sân', 'category' => 'CN', 'data_group' => 'Sân & Lịch đặt'],
        'RECURRING_CREATE'              => ['label' => 'Tạo lịch cố định', 'category' => 'TD', 'data_group' => 'Sân & Lịch đặt'],
        'RECURRING_CANCEL'              => ['label' => 'Hủy lịch cố định', 'category' => 'XH', 'data_group' => 'Sân & Lịch đặt'],
        'RECURRING_SKIP_DATE'           => ['label' => 'Bỏ qua buổi cố định', 'category' => 'CB', 'data_group' => 'Sân & Lịch đặt'],
        'RECURRING_BOOKING'             => ['label' => 'Lịch đặt cố định', 'category' => 'CN', 'data_group' => 'Sân & Lịch đặt'],
        'RECURRING_CRON_GENERATE'       => ['label' => 'Tự động tạo lịch cố định', 'category' => 'TT', 'data_group' => 'Sân & Lịch đặt'],
        'RECURRING_CONFLICT_SKIP'       => ['label' => 'Bỏ qua lịch bị trùng', 'category' => 'TT', 'data_group' => 'Sân & Lịch đặt'],
        'RUN_RECURRING_GEN'             => ['label' => 'Chạy tạo lịch cố định', 'category' => 'TT', 'data_group' => 'Sân & Lịch đặt'],
        'WAITLIST_ASSIGN'               => ['label' => 'Gán khách trong danh sách chờ', 'category' => 'TD', 'data_group' => 'Sân & Lịch đặt'],
        'WAITLIST_CANCEL'               => ['label' => 'Hủy yêu cầu danh sách chờ', 'category' => 'XH', 'data_group' => 'Sân & Lịch đặt'],
        'WAITLIST_NOTIFIED'             => ['label' => 'Thông báo sân trống', 'category' => 'CN', 'data_group' => 'Sân & Lịch đặt'],
        'WAITLIST_HOLD_EXPIRED'         => ['label' => 'Hết hạn giữ chỗ danh sách chờ', 'category' => 'TT', 'data_group' => 'Sân & Lịch đặt'],
        'MATCHMAKING_MODERATE'          => ['label' => 'Kiểm duyệt tin tìm đội', 'category' => 'TD', 'data_group' => 'Sân & Lịch đặt'],
        'MATCHMAKING_CANCEL'            => ['label' => 'Hủy tin tìm đội', 'category' => 'XH', 'data_group' => 'Sân & Lịch đặt'],
        'REVIEW_REPLY'                  => ['label' => 'Phản hồi đánh giá', 'category' => 'CN', 'data_group' => 'Sân & Lịch đặt'],
        'REVIEW_STATUS'                 => ['label' => 'Đổi trạng thái đánh giá', 'category' => 'CN', 'data_group' => 'Sân & Lịch đặt'],
        'PITCH_STATUS'                  => ['label' => 'Đổi trạng thái sân', 'category' => 'CN', 'data_group' => 'Sân & Lịch đặt'],
        'PITCH_STATUS_TOGGLE'           => ['label' => 'Đổi trạng thái sân', 'category' => 'CN', 'data_group' => 'Sân & Lịch đặt'],
        'TOGGLE_PITCH'                  => ['label' => 'Đổi trạng thái sân', 'category' => 'CN', 'data_group' => 'Sân & Lịch đặt'],
        'PITCH_UPSERT'                  => ['label' => 'Thêm/sửa sân', 'category' => 'CN', 'data_group' => 'Sân & Lịch đặt'],
        'SERVICE_UPSERT'                => ['label' => 'Thêm/sửa dịch vụ', 'category' => 'CN', 'data_group' => 'Sân & Lịch đặt'],
        'SERVICE_DELETE'                => ['label' => 'Ngừng kinh doanh dịch vụ', 'category' => 'XH', 'data_group' => 'Sân & Lịch đặt'],
        'INVENTORY_RESTOCK'             => ['label' => 'Nhập thêm hàng tồn', 'category' => 'TD', 'data_group' => 'Sân & Lịch đặt'],
        'MAINTENANCE_ADD'               => ['label' => 'Thêm lịch bảo trì', 'category' => 'TD', 'data_group' => 'Sân & Lịch đặt'],
        'MAINTENANCE_UPDATE'            => ['label' => 'Cập nhật lịch bảo trì', 'category' => 'CN', 'data_group' => 'Sân & Lịch đặt'],
        'AUTO_CANCEL_EXPIRED'           => ['label' => 'Tự động hủy đơn quá hạn', 'category' => 'TT', 'data_group' => 'Sân & Lịch đặt'],
        'AUTO_CLOSE_PAST_BOOKINGS'      => ['label' => 'Tự động đóng đơn quá ngày', 'category' => 'TT', 'data_group' => 'Sân & Lịch đặt'],
        'AUTO_NOSHOW_15M'               => ['label' => 'Tự động xử lý khách vắng mặt (quá 15p)', 'category' => 'TT', 'data_group' => 'Sân & Lịch đặt'],
        'AUTO_NOSHOW_15M_UNPAID'        => ['label' => 'Tự động hủy đơn chưa cọc quá giờ đá', 'category' => 'TT', 'data_group' => 'Sân & Lịch đặt'],
        'CRON_IN_PLAY_UNPAID'           => ['label' => 'Cảnh báo ca quá giờ chưa tất toán', 'category' => 'TT', 'data_group' => 'Sân & Lịch đặt'],
        'CRON_COMPLETE_OVERDUE_IN_PLAY' => ['label' => 'Tự động hoàn tất ca quá giờ', 'category' => 'TT', 'data_group' => 'Sân & Lịch đặt'],
        'ADMIN_RUN_AUTO_RELEASE'        => ['label' => 'Chạy nhả đơn quá hạn thủ công', 'category' => 'TT', 'data_group' => 'Sân & Lịch đặt'],
        'RUN_REMINDERS'                 => ['label' => 'Chạy nhắc lịch', 'category' => 'TT', 'data_group' => 'Sân & Lịch đặt'],

        // Cài đặt
        'UPDATE_SETTINGS'               => ['label' => 'Cập nhật cài đặt hệ thống', 'category' => 'CN', 'data_group' => 'Cài đặt'],
        'SYSTEM_SETTINGS'               => ['label' => 'Cập nhật cài đặt hệ thống', 'category' => 'CN', 'data_group' => 'Cài đặt'],
        'UPDATE_INFO'                   => ['label' => 'Sửa thông tin hệ thống', 'category' => 'CN', 'data_group' => 'Cài đặt'],
        'DATABASE_BACKUP'               => ['label' => 'Sao lưu cơ sở dữ liệu', 'category' => 'TT', 'data_group' => 'Cài đặt'],
        'DB_BACKUP'                     => ['label' => 'Sao lưu cơ sở dữ liệu', 'category' => 'TT', 'data_group' => 'Cài đặt'],
        'TELEGRAM_TEST'                 => ['label' => 'Kiểm tra kết nối Telegram', 'category' => 'TT', 'data_group' => 'Cài đặt'],
        'SAMPLE_DATA_CLEAN'             => ['label' => 'Dọn dữ liệu mẫu', 'category' => 'XH', 'data_group' => 'Cài đặt'],
        'SAMPLE_DATA_SEED'              => ['label' => 'Tạo dữ liệu mẫu', 'category' => 'TT', 'data_group' => 'Cài đặt'],

        // Nhân sự & Bảo mật
        'STAFF_CREATE'                  => ['label' => 'Tạo tài khoản nhân sự', 'category' => 'TD', 'data_group' => 'Nhân sự & Bảo mật'],
        'STAFF_ROLE_CHANGE'             => ['label' => 'Đổi vai trò nhân sự', 'category' => 'CB', 'data_group' => 'Nhân sự & Bảo mật'],
        'STAFF_STATUS_CHANGE'           => ['label' => 'Đổi trạng thái nhân sự', 'category' => 'CN', 'data_group' => 'Nhân sự & Bảo mật'],
        'STAFF_RESET_PASSWORD'          => ['label' => 'Đặt lại mật khẩu nhân sự', 'category' => 'CB', 'data_group' => 'Nhân sự & Bảo mật'],
        'CHANGE_PASSWORD'               => ['label' => 'Đổi mật khẩu', 'category' => 'CB', 'data_group' => 'Nhân sự & Bảo mật'],
        'FORGOT_PASSWORD_REQUEST'       => ['label' => 'Yêu cầu khôi phục mật khẩu', 'category' => 'CB', 'data_group' => 'Nhân sự & Bảo mật'],
        'ENABLE_2FA'                    => ['label' => 'Bật xác thực 2 bước', 'category' => 'TD', 'data_group' => 'Nhân sự & Bảo mật'],
        'DISABLE_2FA'                   => ['label' => 'Tắt xác thực 2 bước', 'category' => 'XH', 'data_group' => 'Nhân sự & Bảo mật'],
        '2FA_TOGGLE'                    => ['label' => 'Thay đổi xác thực 2 bước', 'category' => 'CB', 'data_group' => 'Nhân sự & Bảo mật'],
        'DB_BACKUP_DOWNLOAD'            => ['label' => 'Tải bản sao lưu cơ sở dữ liệu', 'category' => 'CB', 'data_group' => 'Nhân sự & Bảo mật'],
        'AUDIT_REVIEW'                  => ['label' => 'Hậu kiểm nhật ký quản trị', 'category' => 'TD', 'data_group' => 'Nhân sự & Bảo mật'],
        'EXPORT_CSV'                    => ['label' => 'Xuất dữ liệu CSV', 'category' => 'CB', 'data_group' => 'Nhân sự & Bảo mật'],
        'SENSITIVE_DATA_ACCESS'         => ['label' => 'Truy cập dữ liệu nhạy cảm', 'category' => 'CB', 'data_group' => 'Nhân sự & Bảo mật'],
    ];

    public const FIELDS = [
        'price_p5_base'                    => ['label' => 'Sân 5 - Giá thường', 'format' => 'currency'],
        'price_p5_peak'                    => ['label' => 'Sân 5 - Giờ cao điểm', 'format' => 'currency'],
        'price_p5_weekend'                 => ['label' => 'Sân 5 - Cuối tuần', 'format' => 'currency'],
        'price_p7_base'                    => ['label' => 'Sân 7 - Giá thường', 'format' => 'currency'],
        'price_p7_peak'                    => ['label' => 'Sân 7 - Giờ cao điểm', 'format' => 'currency'],
        'price_p7_weekend'                 => ['label' => 'Sân 7 - Cuối tuần', 'format' => 'currency'],
        'price_p11_base'                   => ['label' => 'Sân 11 - Giá thường', 'format' => 'currency'],
        'price_p11_peak'                   => ['label' => 'Sân 11 - Giờ cao điểm', 'format' => 'currency'],
        'price_p11_weekend'                => ['label' => 'Sân 11 - Cuối tuần', 'format' => 'currency'],
        'pricing_effective_from'           => ['label' => 'Hiệu lực bảng giá từ', 'format' => 'text'],
        'deposit_rate'                     => ['label' => 'Tỷ lệ đặt cọc', 'format' => 'percent'],
        'bank_name'                        => ['label' => 'Ngân hàng', 'format' => 'text'],
        'bank_code'                        => ['label' => 'Mã ngân hàng', 'format' => 'text'],
        'bank_account'                     => ['label' => 'Số tài khoản', 'format' => 'text'],
        'bank_holder'                      => ['label' => 'Chủ tài khoản', 'format' => 'text'],
        'hotline'                          => ['label' => 'Hotline', 'format' => 'text'],
        'open_hours'                       => ['label' => 'Giờ hoạt động', 'format' => 'text'],
        'hold_minutes'                     => ['label' => 'Thời gian giữ sân', 'format' => 'minutes'],
        'waitlist_hold_minutes'            => ['label' => 'Thời gian giữ chỗ chờ', 'format' => 'minutes'],
        'refund_full_hours'                => ['label' => 'Mốc hoàn cọc 100%', 'format' => 'hours'],
        'refund_partial_hours'             => ['label' => 'Mốc hoàn cọc một phần', 'format' => 'hours'],
        'auto_cancel_enabled'              => ['label' => 'Tự động hủy đơn quá hạn', 'format' => 'boolean'],
        'reminder_enabled'                 => ['label' => 'Bật nhắc lịch', 'format' => 'boolean'],
        'reminder_hours_before'            => ['label' => 'Nhắc trước trận', 'format' => 'hours'],
        'customer_notify_enabled'          => ['label' => 'Thông báo khách hàng', 'format' => 'boolean'],
        'customer_notify_webhook'          => ['label' => 'Webhook thông báo', 'format' => 'text'],
        'booking_confirm_template'         => ['label' => 'Mẫu xác nhận đặt sân', 'format' => 'text'],
        'reminder_template'                => ['label' => 'Mẫu nhắc lịch', 'format' => 'text'],
        'telegram_notify_enabled'          => ['label' => 'Bật thông báo Telegram', 'format' => 'boolean'],
        'telegram_bot_token'               => ['label' => 'Telegram bot token', 'format' => 'text'],
        'telegram_chat_id'                 => ['label' => 'Telegram chat ID', 'format' => 'text'],
        'full_name'                        => ['label' => 'Họ tên', 'format' => 'text'],
        'customer_name'                    => ['label' => 'Tên khách/đội bóng', 'format' => 'text'],
        'phone'                            => ['label' => 'Số điện thoại', 'format' => 'phone'],
        'email'                            => ['label' => 'Email', 'format' => 'text'],
        'points'                           => ['label' => 'Điểm tích lũy', 'format' => 'number'],
        'points_reason'                    => ['label' => 'Lý do chỉnh điểm', 'format' => 'text'],
        'points_delta'                     => ['label' => 'Thay đổi điểm', 'format' => 'number'],
        'delta'                            => ['label' => 'Biến động điểm', 'format' => 'number'],
        'tier'                             => ['label' => 'Hạng hội viên', 'format' => 'text'],
        'customer_tier'                    => ['label' => 'Hạng khách hàng', 'format' => 'text'],
        'tier_reason'                      => ['label' => 'Lý do đổi hạng', 'format' => 'text'],
        'admin_note'                       => ['label' => 'Ghi chú quản lý', 'format' => 'text'],
        'is_blacklisted'                   => ['label' => 'Danh sách đen', 'format' => 'boolean'],
        'blacklist_reason'                 => ['label' => 'Lý do khóa tài khoản', 'format' => 'text'],
        'status'                           => ['label' => 'Trạng thái', 'format' => 'text'],
        'payment_status'                   => ['label' => 'Trạng thái thanh toán', 'format' => 'text'],
        'pitch_id'                         => ['label' => 'Mã sân', 'format' => 'text'],
        'slot_id'                          => ['label' => 'Khung giờ', 'format' => 'text'],
        'slot_time'                        => ['label' => 'Giờ đá', 'format' => 'text'],
        'booking_date'                     => ['label' => 'Ngày đặt sân', 'format' => 'text'],
        'total_price'                      => ['label' => 'Tổng tiền', 'format' => 'currency'],
        'deposit_amount'                   => ['label' => 'Tiền đặt cọc', 'format' => 'currency'],
        'paid_amount'                      => ['label' => 'Đã thanh toán', 'format' => 'currency'],
        'remaining_amount'                 => ['label' => 'Còn phải thu', 'format' => 'currency'],
        'price_per_match'                  => ['label' => 'Giá mỗi trận', 'format' => 'currency'],
        'deposit_per_match'                => ['label' => 'Tiền cọc mỗi trận', 'format' => 'currency'],
        'price'                            => ['label' => 'Đơn giá', 'format' => 'currency'],
        'amount'                           => ['label' => 'Số tiền', 'format' => 'currency'],
        'quantity'                         => ['label' => 'Số lượng', 'format' => 'number'],
        'stock_qty'                        => ['label' => 'Tồn kho', 'format' => 'number'],
        'min_stock_warning'                => ['label' => 'Ngưỡng cảnh báo tồn kho', 'format' => 'number'],
        'is_active'                        => ['label' => 'Đang hoạt động', 'format' => 'boolean'],
        'role'                             => ['label' => 'Vai trò', 'format' => 'text'],
        'username'                         => ['label' => 'Tên đăng nhập', 'format' => 'text'],
        'name'                             => ['label' => 'Tên', 'format' => 'text'],
        'reason'                           => ['label' => 'Lý do', 'format' => 'text'],
        'note'                             => ['label' => 'Ghi chú', 'format' => 'text'],
        'code'                             => ['label' => 'Mã', 'format' => 'text'],
        'type'                             => ['label' => 'Loại', 'format' => 'text'],
        'discount_type'                    => ['label' => 'Loại giảm giá', 'format' => 'text'],
        'discount_value'                   => ['label' => 'Giá trị giảm', 'format' => 'number'],
        'discount_percent'                 => ['label' => 'Giảm (%)', 'format' => 'percent'],
        'max_discount_amount'              => ['label' => 'Giảm tối đa', 'format' => 'currency'],
        'staff_counted_cash'               => ['label' => 'Tiền mặt NV đếm gốc', 'format' => 'currency'],
        'actual_cash_received'             => ['label' => 'Tiền mặt thực nhận', 'format' => 'currency'],
        'initial_cash'                     => ['label' => 'Tiền đầu ca', 'format' => 'currency'],
        'cash_total'                       => ['label' => 'Hệ thống tính TM', 'format' => 'currency'],
        'transfer_total'                   => ['label' => 'Chuyển khoản VietQR', 'format' => 'currency'],
        'discrepancy'                      => ['label' => 'Chênh lệch', 'format' => 'currency'],
        'discrepancy_amount'               => ['label' => 'Chênh lệch', 'format' => 'currency'],
        'discrepancy_reason'               => ['label' => 'Lý do chênh lệch', 'format' => 'text'],
        'edit_reason'                      => ['label' => 'Lý do chỉnh sửa', 'format' => 'text'],
        'log_id'                           => ['label' => 'Mã nhật ký', 'format' => 'number'],
        'module'                           => ['label' => 'Phân hệ', 'format' => 'text'],
        'row_count'                        => ['label' => 'Số dòng xuất', 'format' => 'number'],
        'audit_anomaly_shift_strong_vnd'   => ['label' => 'Ngưỡng lệch ca mạnh', 'format' => 'currency'],
        'audit_anomaly_points_strong'      => ['label' => 'Ngưỡng chỉnh điểm mạnh', 'format' => 'number'],
        'audit_anomaly_discount_pct'       => ['label' => 'Ngưỡng giảm giá bất thường', 'format' => 'percent'],
        'audit_anomaly_night_start'        => ['label' => 'Giờ bắt đầu khung đêm', 'format' => 'hours'],
        'audit_anomaly_night_end'          => ['label' => 'Giờ kết thúc khung đêm', 'format' => 'hours'],
        'audit_reason_min_len'             => ['label' => 'Độ dài lý do tối thiểu', 'format' => 'number'],
    ];

    /**
     * Validate mandatory reason/explanation text: reject short strings and repetitive/gibberish spam.
     */
    public static function validateReason(string $reason, int $minLen = 10): array
    {
        $minLen = max(3, $minLen);
        $stripped = strip_tags($reason);
        $collapsed = trim((string)(preg_replace('/\s+/u', ' ', $stripped) ?? ''));

        if ($collapsed === '' || mb_strlen($collapsed, 'UTF-8') < $minLen) {
            return [
                'valid'   => false,
                'reason'  => $collapsed,
                'message' => "Lý do bắt buộc phải có tối thiểu {$minLen} ký tự rõ ràng.",
            ];
        }

        $noSpace = (string)(preg_replace('/\s+/u', '', $collapsed) ?? '');
        $noSpaceLen = mb_strlen($noSpace, 'UTF-8');
        if ($noSpaceLen < max(4, (int)ceil($minLen * 0.6))) {
            return [
                'valid'   => false,
                'reason'  => $collapsed,
                'message' => 'Lý do không được chỉ chứa khoảng trắng hoặc quá ngắn.',
            ];
        }

        if (preg_match('/\p{L}/u', $noSpace) !== 1) {
            return [
                'valid'   => false,
                'reason'  => $collapsed,
                'message' => 'Lý do phải có nội dung chữ mô tả rõ ràng, không chỉ gồm số hoặc ký tự đặc biệt.',
            ];
        }

        $lowerNoSpace = mb_strtolower($noSpace, 'UTF-8');
        $chars = preg_split('//u', $lowerNoSpace, -1, PREG_SPLIT_NO_EMPTY);
        if (!is_array($chars)) {
            $chars = [];
        }
        $uniqueChars = count(array_unique($chars));
        if ($uniqueChars < 4) {
            return [
                'valid'   => false,
                'reason'  => $collapsed,
                'message' => 'Lý do không hợp lệ (lặp ký tự hoặc nội dung vô nghĩa).',
            ];
        }

        // Same character repeated 4+ times consecutively (e.g. aaaa...)
        if (preg_match('/(.)\1{3,}/u', $lowerNoSpace) === 1) {
            return [
                'valid'   => false,
                'reason'  => $collapsed,
                'message' => 'Lý do chứa chuỗi ký tự lặp lại vô nghĩa.',
            ];
        }

        // Repeating pattern >= 3 times (e.g. ababab, 121212, asdasdasd)
        if (preg_match('/(.{2,6})\1{2,}/u', $lowerNoSpace) === 1 || preg_match('/^(.{2,8}?)\1+$/u', $lowerNoSpace) === 1) {
            return [
                'valid'   => false,
                'reason'  => $collapsed,
                'message' => 'Lý do chứa chuỗi lặp vô nghĩa, vui lòng nhập giải trình cụ thể.',
            ];
        }

        // Word repetition check (e.g. "test test test")
        $words = preg_split('/\s+/u', mb_strtolower($collapsed, 'UTF-8'), -1, PREG_SPLIT_NO_EMPTY);
        if (is_array($words) && count($words) >= 2) {
            $uniqueWords = count(array_unique($words));
            if ($uniqueWords === 1 || (count($words) >= 3 && ($uniqueWords / count($words)) < 0.5)) {
                return [
                    'valid'   => false,
                    'reason'  => $collapsed,
                    'message' => 'Lý do lặp từ vô nghĩa, vui lòng mô tả chi tiết nguyên nhân.',
                ];
            }
        }

        // Single long spaceless token mash detection (e.g. "dasdawdadwdasd")
        if (strpos($collapsed, ' ') === false && $noSpaceLen >= 8) {
            $freq = array_count_values($chars);
            $maxFreq = max($freq);
            $bigrams = [];
            for ($i = 0; $i < $noSpaceLen - 1; $i++) {
                $bigrams[] = $chars[$i] . $chars[$i + 1];
            }
            $bigramRatio = count($bigrams) > 0 ? (count(array_unique($bigrams)) / count($bigrams)) : 1.0;
            if ($uniqueChars <= 5 || ($maxFreq / $noSpaceLen) > 0.35 || $bigramRatio < 0.65) {
                return [
                    'valid'   => false,
                    'reason'  => $collapsed,
                    'message' => 'Lý do không hợp lệ (chuỗi ký tự vô nghĩa), vui lòng ghi rõ giải trình.',
                ];
            }
        }

        return [
            'valid'   => true,
            'reason'  => $collapsed,
            'message' => '',
        ];
    }

    public static function resolveActionMeta(string $action, ?string $actorRole = null): array
    {
        $code = strtoupper(trim($action));
        if (isset(self::ACTIONS[$code])) {
            $meta = self::ACTIONS[$code];
            $cat = self::CATEGORIES[$meta['category']] ?? self::CATEGORIES['CN'];
            return [
                'action'         => $code,
                'label'          => $meta['label'],
                'category'       => $cat['code'],
                'category_label' => $cat['label'],
                'color'          => $cat['color'],
                'token'          => $cat['token'],
                'data_group'     => $meta['data_group'],
                'registered'     => true,
            ];
        }

        $fallbackCatCode = strtolower((string)$actorRole) === 'system' ? 'TT' : 'CN';
        $cat = self::CATEGORIES[$fallbackCatCode];
        return [
            'action'         => $code !== '' ? $code : 'UNKNOWN',
            'label'          => $code !== '' ? $code : 'Thao tác khác',
            'category'       => $cat['code'],
            'category_label' => $cat['label'],
            'color'          => $cat['color'],
            'token'          => $cat['token'],
            'data_group'     => 'Khác',
            'registered'     => false,
        ];
    }

    public static function getActionCodesForCategory(string $category): array
    {
        $cat = strtoupper(trim($category));
        $codes = [];
        foreach (self::ACTIONS as $code => $meta) {
            if ($meta['category'] === $cat) {
                $codes[] = $code;
            }
        }
        return $codes;
    }

    public static function getActionCodesForDataGroup(string $dataGroup): array
    {
        $target = trim($dataGroup);
        $codes = [];
        foreach (self::ACTIONS as $code => $meta) {
            if ($meta['data_group'] === $target) {
                $codes[] = $code;
            }
        }
        return $codes;
    }

    public static function maskPhone(string $phone): string
    {
        $clean = preg_replace('/[^0-9]/', '', $phone) ?? '';
        $len = strlen($clean);
        if ($len >= 9) {
            return substr($clean, 0, 3) . '***' . substr($clean, -3);
        }
        if ($len >= 6) {
            return substr($clean, 0, 2) . '***' . substr($clean, -2);
        }
        return $phone;
    }

    public static function maskPhonesInText(string $text): string
    {
        return (string)preg_replace_callback('/(?<!\d)(0[35789]\d{7,9}|84\d{8,10})(?!\d)/', static function (array $m): string {
            return self::maskPhone($m[1]);
        }, $text);
    }

    public static function extractObjectCode(array $log): string
    {
        $existing = trim((string)($log['object_code'] ?? ''));
        if ($existing !== '') {
            return substr($existing, 0, 60);
        }

        $bookingId = trim((string)($log['booking_id'] ?? ''));
        $targetId = trim((string)($log['target_id'] ?? ''));
        $raw = $bookingId !== '' ? $bookingId : $targetId;

        if ($raw !== '') {
            return substr($raw, 0, 60);
        }

        $action = strtoupper(trim((string)($log['action'] ?? '')));
        if (in_array($action, ['UPDATE_PRICING', 'UPDATE_PRICE', 'PRICE_UPDATE'], true)) {
            return 'PRICING';
        }
        if (in_array($action, ['UPDATE_SETTINGS', 'SYSTEM_SETTINGS'], true)) {
            return 'SETTINGS';
        }
        if (in_array($action, ['DATABASE_BACKUP', 'DB_BACKUP', 'DB_BACKUP_DOWNLOAD'], true)) {
            return 'DB-BACKUP';
        }
        if (in_array($action, ['ENABLE_2FA', 'DISABLE_2FA', '2FA_TOGGLE'], true)) {
            return '2FA';
        }
        if ($action === 'EXPORT_REPORTS') {
            return 'REPORTS';
        }
        if ($action === 'EXPORT_CSV') {
            return 'CSV-EXPORT';
        }
        if (str_contains($action, 'AUTO_') || str_contains($action, 'CRON_') || str_contains($action, 'RUN_')) {
            return 'CRON';
        }
        return 'SYSTEM';
    }

    public static function formatDateTimeVn(?string $datetime): string
    {
        $raw = trim((string)$datetime);
        if ($raw === '') {
            return '';
        }
        try {
            $tz = new DateTimeZone('Asia/Ho_Chi_Minh');
            $dt = new DateTime($raw, $tz);
            $dt->setTimezone($tz);
            return $dt->format('d/m/Y H:i');
        } catch (Throwable $e) {
            $ts = strtotime($raw);
            return $ts !== false ? date('d/m/Y H:i', $ts) : $raw;
        }
    }

    public static function decodeJsonOrScalar($val)
    {
        if ($val === null || is_array($val)) {
            return $val;
        }
        $raw = trim((string)$val);
        $decodedAny = false;
        for ($i = 0; $i < 2; $i++) {
            if ($raw === '' || ($raw[0] !== '{' && $raw[0] !== '[' && $raw[0] !== '"')) {
                break;
            }
            $decoded = json_decode($raw, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                break;
            }
            $decodedAny = true;
            if (is_string($decoded)) {
                $raw = trim($decoded);
                continue;
            }
            return $decoded;
        }
        return $decodedAny ? $raw : $val;
    }

    public static function formatFieldValue(string $key, $value, bool $maskPii = true): string
    {
        if ($value === null || $value === '') {
            return '—';
        }
        $field = self::FIELDS[$key] ?? null;
        $raw = is_array($value) ? json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : (string)$value;
        $fmt = $field['format'] ?? 'text';

        if ($fmt === 'currency' && is_numeric($raw)) {
            return number_format((float)$raw, 0, ',', '.') . 'đ';
        }
        if ($fmt === 'number' && is_numeric($raw)) {
            return number_format((float)$raw, 0, ',', '.');
        }
        if ($fmt === 'percent') {
            return str_ends_with(trim($raw), '%') ? trim($raw) : trim($raw) . '%';
        }
        if ($fmt === 'minutes') {
            return str_contains($raw, 'phút') ? $raw : $raw . ' phút';
        }
        if ($fmt === 'hours') {
            return str_contains($raw, 'giờ') ? $raw : $raw . ' giờ';
        }
        if ($fmt === 'boolean') {
            $low = strtolower(trim($raw));
            if (in_array($low, ['1', 'true', 'yes', 'on'], true)) {
                return 'Bật';
            }
            if (in_array($low, ['0', 'false', 'no', 'off'], true)) {
                return 'Tắt';
            }
        }
        if ($fmt === 'phone' && $maskPii) {
            return self::maskPhone($raw);
        }
        return $maskPii ? self::maskPhonesInText($raw) : $raw;
    }

    /**
     * Extract structured diff list: [ ['field'=>..., 'label'=>..., 'old'=>..., 'new'=>...], ... ]
     */
    public static function extractDiffs(array $log, bool $maskPii = true): array
    {
        $oldParsed = self::decodeJsonOrScalar($log['old_value'] ?? null);
        $newParsed = self::decodeJsonOrScalar($log['new_value'] ?? null);

        $normalizeObj = static function ($v) {
            if (is_array($v) && array_is_list($v) && count($v) === 1 && is_array($v[0])) {
                return $v[0];
            }
            return $v;
        };
        $oldParsed = $normalizeObj($oldParsed);
        $newParsed = $normalizeObj($newParsed);

        $isAssoc = static function ($v): bool {
            return is_array($v) && ($v === [] || !array_is_list($v));
        };

        $diffs = [];
        $hiddenKeys = ['password', 'password_hash', 'token', 'csrf_token', 'totp_secret', 'api_key', 'secret'];

        if ($isAssoc($oldParsed) || $isAssoc($newParsed)) {
            $oldMap = is_array($oldParsed) ? $oldParsed : [];
            $newMap = is_array($newParsed) ? $newParsed : [];
            $allKeys = array_values(array_unique(array_merge(array_keys($oldMap), array_keys($newMap))));

            foreach ($allKeys as $k) {
                $keyStr = (string)$k;
                if (in_array(strtolower($keyStr), $hiddenKeys, true)) {
                    continue;
                }
                $hasOld = array_key_exists($k, $oldMap);
                $hasNew = array_key_exists($k, $newMap);
                $vOld = $hasOld ? $oldMap[$k] : null;
                $vNew = $hasNew ? $newMap[$k] : null;
                if ($hasOld && $hasNew && json_encode($vOld) === json_encode($vNew)) {
                    continue;
                }
                $label = self::FIELDS[$keyStr]['label'] ?? $keyStr;
                $diffs[] = [
                    'field' => $keyStr,
                    'label' => $label,
                    'old'   => $hasOld ? self::formatFieldValue($keyStr, $vOld, $maskPii) : '—',
                    'new'   => $hasNew ? self::formatFieldValue($keyStr, $vNew, $maskPii) : '—',
                ];
            }
            return $diffs;
        }

        if ($oldParsed !== null || $newParsed !== null) {
            $oldStr = is_scalar($oldParsed) ? (string)$oldParsed : ($oldParsed !== null ? json_encode($oldParsed, JSON_UNESCAPED_UNICODE) : '');
            $newStr = is_scalar($newParsed) ? (string)$newParsed : ($newParsed !== null ? json_encode($newParsed, JSON_UNESCAPED_UNICODE) : '');
            if ($oldStr !== '' || $newStr !== '') {
                $action = strtoupper(trim((string)($log['action'] ?? '')));
                $meta = self::resolveActionMeta($action, $log['actor_role'] ?? null);
                $label = $oldStr !== '' && $newStr !== '' ? 'Giá trị' : $meta['label'];
                $diffs[] = [
                    'field' => 'value',
                    'label' => $label,
                    'old'   => $oldStr !== '' ? ($maskPii ? self::maskPhonesInText($oldStr) : $oldStr) : '—',
                    'new'   => $newStr !== '' ? ($maskPii ? self::maskPhonesInText($newStr) : $newStr) : '—',
                ];
            }
        }

        return $diffs;
    }

    public static function loadThresholds(PDO $pdo): array
    {
        $defaults = [
            'shift_strong_vnd' => 50000,
            'points_strong'    => 50,
            'discount_pct'     => 50,
            'night_start'      => 0,
            'night_end'        => 5,
            'reason_min_len'   => 10,
        ];
        try {
            $stmt = $pdo->query("SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('audit_anomaly_shift_strong_vnd','audit_anomaly_points_strong','audit_anomaly_discount_pct','audit_anomaly_night_start','audit_anomaly_night_end','audit_reason_min_len')");
            if ($stmt) {
                $rows = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
                if (isset($rows['audit_anomaly_shift_strong_vnd'])) {
                    $defaults['shift_strong_vnd'] = max(0, (int)$rows['audit_anomaly_shift_strong_vnd']);
                }
                if (isset($rows['audit_anomaly_points_strong'])) {
                    $defaults['points_strong'] = max(1, (int)$rows['audit_anomaly_points_strong']);
                }
                if (isset($rows['audit_anomaly_discount_pct'])) {
                    $defaults['discount_pct'] = max(1, min(100, (int)$rows['audit_anomaly_discount_pct']));
                }
                if (isset($rows['audit_anomaly_night_start'])) {
                    $defaults['night_start'] = max(0, min(23, (int)$rows['audit_anomaly_night_start']));
                }
                if (isset($rows['audit_anomaly_night_end'])) {
                    $defaults['night_end'] = max(0, min(23, (int)$rows['audit_anomaly_night_end']));
                }
                if (isset($rows['audit_reason_min_len'])) {
                    $defaults['reason_min_len'] = max(3, (int)$rows['audit_reason_min_len']);
                }
            }
        } catch (Throwable $e) {
        }
        return $defaults;
    }

    /**
     * Evaluate all 9 anomaly rules (a..i) for an audit log row.
     */
    public static function detectAnomalies(array $log, array $thresholds): array
    {
        $action = strtoupper(trim((string)($log['action'] ?? '')));
        $actorRole = strtolower(trim((string)($log['actor_role'] ?? '')));
        $meta = self::resolveActionMeta($action, $actorRole);

        $oldParsed = self::decodeJsonOrScalar($log['old_value'] ?? null);
        $newParsed = self::decodeJsonOrScalar($log['new_value'] ?? null);
        $oldArr = is_array($oldParsed) ? $oldParsed : [];
        $newArr = is_array($newParsed) ? $newParsed : [];
        $oldText = is_scalar($oldParsed) ? (string)$oldParsed : json_encode($oldArr, JSON_UNESCAPED_UNICODE);
        $newText = is_scalar($newParsed) ? (string)$newParsed : json_encode($newArr, JSON_UNESCAPED_UNICODE);

        $shiftStrongVnd = (int)($thresholds['shift_strong_vnd'] ?? 50000);
        $pointsStrong   = (int)($thresholds['points_strong'] ?? 50);
        $discountPct    = (int)($thresholds['discount_pct'] ?? 50);
        $nightStart     = (int)($thresholds['night_start'] ?? 0);
        $nightEnd       = (int)($thresholds['night_end'] ?? 5);
        $minReasonLen   = (int)($thresholds['reason_min_len'] ?? 10);

        $reasons = [];

        // (a) Chốt ca lệch != 0 (mạnh >= shift_strong_vnd)
        if (in_array($action, ['SHIFT_CLOSE', 'CLOSE_SHIFT', 'SHIFT_CONFIRM', 'SHIFT_HANDOVER'], true)) {
            $disc = null;
            if (isset($newArr['discrepancy_amount'])) {
                $disc = (float)$newArr['discrepancy_amount'];
            } elseif (isset($newArr['discrepancy'])) {
                $disc = (float)$newArr['discrepancy'];
            } elseif (preg_match('/Lệch[:\s]*([+\-]?\s*[\d.,]+)\s*đ/ui', (string)$newText, $m)) {
                $numStr = preg_replace('/[^\d\-]/', '', str_replace('.', '', $m[1]));
                if ($numStr !== '' && $numStr !== '-') {
                    $disc = (float)$numStr;
                }
            }
            if ($disc !== null && abs($disc) > 0.0001) {
                $fmtDisc = ($disc > 0 ? '+' : '') . number_format($disc, 0, ',', '.') . 'đ';
                if (abs($disc) >= $shiftStrongVnd) {
                    $reasons[] = "Chốt ca lệch tiền mạnh ({$fmtDisc})";
                } else {
                    $reasons[] = "Chốt ca có chênh lệch quỹ ({$fmtDisc})";
                }
            }
        }

        // (b) Chỉnh điểm thủ công (mạnh |Δ| >= points_strong)
        $hasPointsChange = ($action === 'ADJUST_POINTS')
            || (in_array($action, ['CRM_CUSTOMER_UPDATE', 'CRM_UPDATE', 'UPDATE_MEMBER', 'USER_EDIT'], true)
                && (isset($newArr['points']) || isset($newArr['points_delta'])));
        if ($hasPointsChange) {
            $delta = null;
            if (isset($newArr['delta'])) {
                $delta = (int)$newArr['delta'];
            } elseif (isset($newArr['points_delta'])) {
                $delta = (int)$newArr['points_delta'];
            } elseif (isset($oldArr['points'], $newArr['points'])) {
                $delta = (int)$newArr['points'] - (int)$oldArr['points'];
            } elseif (is_numeric($oldParsed) && preg_match('/^\s*([+\-]?\d+)/', (string)$newParsed, $pm)) {
                $delta = (int)$pm[1] - (int)$oldParsed;
            }
            if ($delta === null || $delta !== 0) {
                if ($delta !== null && abs($delta) >= $pointsStrong) {
                    $reasons[] = 'Chỉnh điểm thủ công mức lớn (' . ($delta > 0 ? "+{$delta}" : "{$delta}") . ' điểm)';
                } elseif ($delta !== null) {
                    $reasons[] = 'Chỉnh điểm thủ công (' . ($delta > 0 ? "+{$delta}" : "{$delta}") . ' điểm)';
                } else {
                    $reasons[] = 'Chỉnh điểm hội viên thủ công';
                }
            }
        }

        // (c) Đổi hạng thủ công
        if (in_array($action, ['CRM_CUSTOMER_UPDATE', 'CRM_UPDATE', 'UPDATE_MEMBER', 'USER_EDIT'], true)) {
            $oldTier = $oldArr['customer_tier'] ?? $oldArr['tier'] ?? null;
            $newTier = $newArr['customer_tier'] ?? $newArr['tier'] ?? null;
            if ($oldTier !== null && $newTier !== null && (string)$oldTier !== (string)$newTier) {
                $reasons[] = "Đổi hạng hội viên thủ công ({$oldTier} → {$newTier})";
            }
        }

        // (d) Hủy/hoàn cọc đơn đã có tiền
        if (in_array($action, ['CANCEL_BOOKING', 'EARLY_CANCEL', 'NOSHOW_RELEASE_SLOT'], true)) {
            $oldStr = (string)$oldText;
            $newStr = (string)$newText;
            $hadMoney = (
                mb_stripos($oldStr, 'Đã cọc') !== false
                || mb_stripos($oldStr, 'Đã thanh toán') !== false
                || mb_stripos($newStr, 'Đã hoàn cọc') !== false
                || mb_stripos($newStr, 'Tịch thu cọc') !== false
                || mb_stripos($newStr, 'Bảo lưu cọc') !== false
                || mb_stripos($newStr, 'Phạt 50% cọc') !== false
                || (!empty($newArr['refund_amount']) && (float)$newArr['refund_amount'] > 0)
            ) && mb_stripos($newStr, 'Chưa cọc - Nhả sân') === false && mb_stripos($newStr, 'doanh thu 0đ') === false;
            if ($hadMoney) {
                $reasons[] = 'Hủy đơn hoặc hoàn/giữ cọc với đơn đã phát sinh tiền';
            }
        }

        // (e) Sửa số đếm / số liệu ca sau chốt / đối soát
        if ($action === 'SHIFT_EDIT_COUNT') {
            $reasons[] = 'Điều chỉnh số liệu tiền mặt kiểm đếm ca sau chốt';
        } elseif ($action === 'SHIFT_CONFIRM' && !empty($newArr['edited_staff_count'])) {
            $reasons[] = 'Sửa số đếm tiền mặt nhân viên khi đối soát ca';
        }

        // (f) Đổi giá / voucher giảm >= discount_pct%
        if (in_array($action, ['VOUCHER_SAVE', 'VOUCHER_CREATE', 'VOUCHER_UPDATE', 'PACKAGE_SAVE', 'GOLDEN_HOUR_SAVE'], true)) {
            $pct = null;
            $dType = strtolower((string)($newArr['discount_type'] ?? $newArr['type'] ?? $newArr['price_adjustment_type'] ?? ''));
            if (isset($newArr['discount_percent'])) {
                $pct = (float)$newArr['discount_percent'];
            } elseif (in_array($dType, ['percent', 'percent_discount'], true) && isset($newArr['discount_value'])) {
                $pct = (float)$newArr['discount_value'];
            } elseif (in_array($dType, ['percent', 'percent_discount'], true) && isset($newArr['adjustment_value'])) {
                $pct = (float)$newArr['adjustment_value'];
            } elseif (preg_match('/Giảm\s*(\d+(?:\.\d+)?)\s*\(percent\)/ui', (string)$newText, $vm)) {
                $pct = (float)$vm[1];
            }
            if ($pct !== null && $pct >= $discountPct) {
                $reasons[] = "Tạo/sửa ưu đãi giảm giá cao ({$pct}% >= {$discountPct}%)";
            }
        } elseif (in_array($action, ['UPDATE_PRICING', 'UPDATE_PRICE', 'PRICE_UPDATE', 'ADJUST_DISCOUNT'], true)) {
            if ($action === 'ADJUST_DISCOUNT') {
                $oldTot = (float)($oldArr['total_price'] ?? 0);
                $newTot = (float)($newArr['total_price'] ?? 0);
                if ($oldTot > 0 && $newTot >= 0 && (($oldTot - $newTot) / $oldTot * 100) >= $discountPct) {
                    $pctDrop = round(($oldTot - $newTot) / $oldTot * 100, 1);
                    $reasons[] = "Giảm giá đơn đặt sân mức cao ({$pctDrop}%)";
                }
            } else {
                foreach ($newArr as $k => $v) {
                    if (isset($oldArr[$k]) && is_numeric($oldArr[$k]) && is_numeric($v) && (float)$oldArr[$k] > 0) {
                        $dropPct = ((float)$oldArr[$k] - (float)$v) / (float)$oldArr[$k] * 100;
                        if ($dropPct >= $discountPct) {
                            $reasons[] = 'Giảm bảng giá sân từ ' . round($dropPct, 1) . '% trở lên';
                            break;
                        }
                    }
                }
            }
        }

        // (g) Đổi quyền / tắt 2FA
        if (in_array($action, ['STAFF_ROLE_CHANGE', 'DISABLE_2FA'], true)) {
            $reasons[] = $action === 'DISABLE_2FA'
                ? 'Tắt xác thực 2 bước (2FA)'
                : 'Thay đổi vai trò / phân quyền nhân sự';
        } elseif ($action === '2FA_TOGGLE' && ((string)$newText === '0' || mb_stripos((string)$newText, 'tắt') !== false)) {
            $reasons[] = 'Tắt xác thực 2 bước (2FA)';
        } elseif (in_array($action, ['UPDATE_MEMBER', 'USER_EDIT'], true) && isset($newArr['role']) && ($oldArr['role'] ?? null) !== $newArr['role']) {
            $reasons[] = 'Thay đổi vai trò tài khoản';
        }

        // (h) Lý do bắt buộc < minReasonLen ký tự hoặc vô nghĩa
        $extractedReason = self::extractReasonTextFromPayload($action, $oldArr, $newArr, (string)$newText, $reasons);
        if ($extractedReason !== null) {
            $reasonCheck = self::validateReason($extractedReason, $minReasonLen);
            if (!$reasonCheck['valid']) {
                $reasons[] = "Lý do bắt buộc chưa đạt chuẩn (< {$minReasonLen} ký tự hoặc vô nghĩa)";
            }
        }

        // (i) Thao tác trong khung đêm (00:00–05:00) đối với thao tác không phải cron hệ thống
        if ($meta['category'] !== 'TT' && $actorRole !== 'system' && !empty($log['created_at'])) {
            try {
                $tz = new DateTimeZone('Asia/Ho_Chi_Minh');
                $dt = new DateTime((string)$log['created_at'], $tz);
                $dt->setTimezone($tz);
                $hour = (int)$dt->format('G');
                $inNightWindow = ($nightStart < $nightEnd)
                    ? ($hour >= $nightStart && $hour < $nightEnd)
                    : ($hour >= $nightStart || $hour < $nightEnd);
                if ($inNightWindow) {
                    $startStr = str_pad((string)$nightStart, 2, '0', STR_PAD_LEFT) . ':00';
                    $endStr = str_pad((string)$nightEnd, 2, '0', STR_PAD_LEFT) . ':00';
                    $reasons[] = "Thao tác ngoài giờ trong khung {$startStr}–{$endStr}";
                }
            } catch (Throwable $e) {
            }
        }

        $uniqueReasons = array_values(array_unique($reasons));
        return [
            'is_anomaly' => count($uniqueReasons) > 0,
            'reasons'    => $uniqueReasons,
        ];
    }

    private static function extractReasonTextFromPayload(string $action, array $oldArr, array $newArr, string $newText, array $currentReasons): ?string
    {
        foreach (['reason', 'points_reason', 'tier_reason', 'discrepancy_reason', 'edit_reason', 'admin_note'] as $rk) {
            if (array_key_exists($rk, $newArr)) {
                $val = trim((string)($newArr[$rk] ?? ''));
                if ($val !== '') {
                    return $val;
                }
                if ($action === 'ADJUST_POINTS' || $action === 'SHIFT_EDIT_COUNT' || $action === 'ADJUST_DISCOUNT') {
                    return '';
                }
            }
        }
        if ($action === 'AUDIT_REVIEW' && array_key_exists('note', $newArr)) {
            return trim((string)($newArr['note'] ?? ''));
        }
        if (preg_match('/lý do\s*:\s*([^|)\n]+)/ui', $newText, $rm)) {
            return trim($rm[1]);
        }
        // Shift discrepancy without reason text
        if (in_array($action, ['SHIFT_CLOSE', 'CLOSE_SHIFT'], true) && count($currentReasons) > 0) {
            return '';
        }
        return null;
    }

    public static function prepareMetadataForInsert(PDO $pdo, array $candidate): array
    {
        $action = (string)($candidate['action'] ?? '');
        $actorRole = $candidate['actor_role'] ?? null;
        $meta = self::resolveActionMeta($action, is_string($actorRole) ? $actorRole : null);
        $objCode = self::extractObjectCode($candidate);
        $thresholds = self::loadThresholds($pdo);
        $anom = self::detectAnomalies($candidate, $thresholds);
        $reasonsJson = json_encode($anom['reasons'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        return [
            'category'        => $meta['category'],
            'data_group'      => $meta['data_group'],
            'object_code'     => $objCode,
            'is_anomaly'      => $anom['is_anomaly'] ? 1 : 0,
            'anomaly_reasons' => $reasonsJson ?: '[]',
        ];
    }

    public static function backfillMissingMetadata(PDO $pdo): void
    {
        try {
            $rows = $pdo->query("SELECT * FROM audit_logs WHERE category IS NULL OR category = '' OR data_group IS NULL OR data_group = '' OR object_code IS NULL OR object_code = '' OR (is_anomaly = 0 AND anomaly_reasons IS NULL)")->fetchAll(PDO::FETCH_ASSOC);
            if (!$rows) {
                return;
            }
            $thresholds = self::loadThresholds($pdo);
            $upd = $pdo->prepare("UPDATE audit_logs SET category = ?, data_group = ?, object_code = ?, is_anomaly = ?, anomaly_reasons = ? WHERE id = ?");
            foreach ($rows as $row) {
                $meta = self::resolveActionMeta((string)($row['action'] ?? ''), $row['actor_role'] ?? null);
                $objCode = self::extractObjectCode($row);
                $anom = self::detectAnomalies($row, $thresholds);
                $reasonsJson = $anom['is_anomaly'] ? json_encode($anom['reasons'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : '[]';
                $upd->execute([
                    $meta['category'],
                    $meta['data_group'],
                    $objCode,
                    $anom['is_anomaly'] ? 1 : 0,
                    $reasonsJson,
                    (int)$row['id'],
                ]);
            }
        } catch (Throwable $e) {
            error_log('[AUDIT BACKFILL WARN] ' . $e->getMessage());
        }
    }
}
