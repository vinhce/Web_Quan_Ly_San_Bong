-- ===============================================================
-- MIGRATION 005: GIAI ĐOẠN 6 - VẬN HÀNH VÀ THÔNG BÁO
-- Chạy lại an toàn (Idempotent) trên MySQL 8.0+ và MariaDB
-- 6.1 Nhắc lịch tự động & Webhook Zalo/SMS (notification_logs)
-- 6.2 Báo cho chủ sân Telegram (settings theo từng sự kiện)
-- 6.3 Lịch bảo trì sân (pitch_maintenance)
-- 6.4 Quản lý chi phí sân bóng & Lãi ròng (expenses)
-- ===============================================================

-- 1. Bảng Nhật ký thông báo (Notification Logs: SMS/Zalo/Telegram/System)
CREATE TABLE IF NOT EXISTS `notification_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `booking_id` INT NULL DEFAULT NULL,
    `booking_code` VARCHAR(40) NULL DEFAULT NULL,
    `recipient` VARCHAR(100) NOT NULL,
    `channel` ENUM('telegram', 'zalo', 'sms', 'system') NOT NULL DEFAULT 'system',
    `event_type` VARCHAR(50) NOT NULL COMMENT 'booking_confirm, remind_match, cancel_booking, waitlist_notify, new_booking, shift_alert, backup',
    `title` VARCHAR(255) NOT NULL,
    `content` TEXT NOT NULL,
    `status` ENUM('sent', 'failed', 'pending') NOT NULL DEFAULT 'sent',
    `response_payload` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_notif_booking` (`booking_code`),
    INDEX `idx_notif_channel` (`channel`),
    INDEX `idx_notif_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Bảng Lịch bảo trì sân (Pitch Maintenance Schedules)
CREATE TABLE IF NOT EXISTS `pitch_maintenance` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `pitch_id` VARCHAR(20) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `start_time` VARCHAR(10) NOT NULL DEFAULT '05:30',
    `end_time` VARCHAR(10) NOT NULL DEFAULT '23:00',
    `reason` VARCHAR(255) NOT NULL,
    `status` ENUM('scheduled', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',
    `created_by` INT NULL DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_maintenance_pitch` FOREIGN KEY (`pitch_id`) REFERENCES `pitches`(`id`) ON DELETE CASCADE,
    INDEX `idx_maint_dates` (`pitch_id`, `start_date`, `end_date`),
    INDEX `idx_maint_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Bảng Quản lý chi phí vận hành (Expenses)
CREATE TABLE IF NOT EXISTS `expenses` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `expense_code` VARCHAR(40) NOT NULL UNIQUE,
    `category` VARCHAR(50) NOT NULL COMMENT 'dien_nuoc, bao_tri, nhap_hang, luong_nhan_vien, khac',
    `category_name` VARCHAR(100) NOT NULL,
    `amount` INT NOT NULL DEFAULT 0,
    `expense_date` DATE NOT NULL,
    `payer_name` VARCHAR(100) NOT NULL DEFAULT 'Ban Quản Trị Sân',
    `staff_id` INT NULL DEFAULT NULL,
    `receipt_note` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_expenses_date` (`expense_date`),
    INDEX `idx_expenses_cat` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Bổ sung Settings vận hành, Zalo/SMS Webhook, mẫu tin & Telegram theo sự kiện
INSERT IGNORE INTO `settings` (`setting_key`, `setting_value`) VALUES
('reminder_enabled', '1'),
('reminder_hours_before', '2'),
('customer_notify_enabled', '0'),
('customer_notify_webhook', ''),
('booking_confirm_template', 'Sân Bóng Pro xác nhận đơn {code}: Sân {pitch_name}, ngày {date} khung giờ {slot_time}. Tổng: {total_price}đ (Cọc: {deposit_amount}đ).'),
('reminder_template', 'Nhắc lịch đá bóng: Đội bạn có ca lúc {slot_time} hôm nay ({date}) tại {pitch_name}. Mã vé: {code}. Vui lòng đến trước 15 phút!'),
('telegram_notify_enabled', '0'),
('telegram_bot_token', ''),
('telegram_chat_id', ''),
('tg_event_new_booking', '1'),
('tg_event_cancel', '1'),
('tg_event_shift_diff', '1'),
('tg_event_unmatched_tx', '1'),
('tg_event_low_stock', '1'),
('tg_event_waitlist', '1'),
('tg_event_matchmaking', '1'),
('tg_event_review', '1');
