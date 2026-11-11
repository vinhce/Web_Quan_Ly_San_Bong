-- ===============================================================
-- MIGRATION 004: GIAI ĐOẠN 5 - KHÁCH HÀNG VÀ DOANH THU
-- Chạy lại an toàn (Idempotent) trên MySQL 8.0+ và MariaDB
-- 5.1 CRM Khách hàng (customer_crm)
-- 5.2 Lịch lặp cố định hàng tuần (recurring_schedules)
-- 5.3 Danh sách chờ (waitlist)
-- 5.4 Khuyến mãi linh hoạt & Giờ vàng (vouchers upgrade, golden_hour_rules)
-- 5.5 Ghép kèo / Tìm đối (matchmaking_posts)
-- ===============================================================

-- 1. Bảng CRM ghi chú và phân hạng khách hàng (Customer CRM)
CREATE TABLE IF NOT EXISTS `customer_crm` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `phone` VARCHAR(20) NOT NULL UNIQUE,
    `full_name` VARCHAR(100) NULL,
    `customer_tier` ENUM('standard', 'regular', 'vip', 'warning_noshow') NOT NULL DEFAULT 'standard',
    `admin_note` TEXT NULL,
    `is_blacklisted` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_crm_phone` (`phone`),
    INDEX `idx_crm_tier` (`customer_tier`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Bảng Lịch lặp cố định hàng tuần (Recurring Schedules)
CREATE TABLE IF NOT EXISTS `recurring_schedules` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `schedule_code` VARCHAR(40) NOT NULL UNIQUE,
    `customer_name` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `user_id` INT NULL DEFAULT NULL,
    `pitch_id` VARCHAR(20) NOT NULL,
    `slot_id` VARCHAR(10) NOT NULL,
    `day_of_week` TINYINT NOT NULL COMMENT '1=Thứ 2, 2=Thứ 3, ..., 6=Thứ 7, 7=Chủ Nhật',
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `weeks_count` INT NOT NULL DEFAULT 4,
    `is_open_ended` TINYINT(1) NOT NULL DEFAULT 0,
    `price_per_match` INT NOT NULL DEFAULT 0,
    `deposit_per_match` INT NOT NULL DEFAULT 0,
    `status` ENUM('active', 'paused', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
    `note` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_recurring_pitch` FOREIGN KEY (`pitch_id`) REFERENCES `pitches`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_recurring_slot` FOREIGN KEY (`slot_id`) REFERENCES `time_slots`(`id`) ON DELETE CASCADE,
    INDEX `idx_recurring_day` (`day_of_week`, `slot_id`),
    INDEX `idx_recurring_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @col_rec_open := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recurring_schedules' AND COLUMN_NAME = 'is_open_ended');
SET @sql_rec_open := IF(@col_rec_open = 0, 'ALTER TABLE `recurring_schedules` ADD COLUMN `is_open_ended` TINYINT(1) NOT NULL DEFAULT 0 AFTER `weeks_count`', 'SELECT 1');
PREPARE stmt_rec_open FROM @sql_rec_open; EXECUTE stmt_rec_open; DEALLOCATE PREPARE stmt_rec_open;

-- Mở rộng bảng bookings cho Lịch lặp & Giá gốc / Giảm giá
SET @col_rec_id := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'recurring_schedule_id');
SET @sql_rec_id := IF(@col_rec_id = 0, 'ALTER TABLE `bookings` ADD COLUMN `recurring_schedule_id` INT NULL DEFAULT NULL AFTER `booking_mode`', 'SELECT 1');
PREPARE stmt_rec_id FROM @sql_rec_id; EXECUTE stmt_rec_id; DEALLOCATE PREPARE stmt_rec_id;

SET @idx_rec_id := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND INDEX_NAME = 'idx_bookings_recurring');
SET @sql_idx_rec := IF(@idx_rec_id = 0, 'ALTER TABLE `bookings` ADD INDEX `idx_bookings_recurring` (`recurring_schedule_id`)', 'SELECT 1');
PREPARE stmt_idx_rec FROM @sql_idx_rec; EXECUTE stmt_idx_rec; DEALLOCATE PREPARE stmt_idx_rec;

SET @col_orig_price := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'original_price');
SET @sql_orig_price := IF(@col_orig_price = 0, 'ALTER TABLE `bookings` ADD COLUMN `original_price` INT NOT NULL DEFAULT 0 AFTER `voucher_code`', 'SELECT 1');
PREPARE stmt_orig_price FROM @sql_orig_price; EXECUTE stmt_orig_price; DEALLOCATE PREPARE stmt_orig_price;

SET @col_disc_amt := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'discount_amount');
SET @sql_disc_amt := IF(@col_disc_amt = 0, 'ALTER TABLE `bookings` ADD COLUMN `discount_amount` INT NOT NULL DEFAULT 0 AFTER `original_price`', 'SELECT 1');
PREPARE stmt_disc_amt FROM @sql_disc_amt; EXECUTE stmt_disc_amt; DEALLOCATE PREPARE stmt_disc_amt;

UPDATE `bookings` SET `original_price` = `total_price` WHERE `original_price` = 0 AND `total_price` > 0;

-- 3. Bảng Danh sách chờ (Waitlist khi khung giờ kín)
CREATE TABLE IF NOT EXISTS `waitlist` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `pitch_id` VARCHAR(20) NOT NULL,
    `booking_date` DATE NOT NULL,
    `slot_id` VARCHAR(10) NOT NULL,
    `customer_name` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `user_id` INT NULL DEFAULT NULL,
    `status` ENUM('waiting', 'notified', 'converted', 'cancelled') NOT NULL DEFAULT 'waiting',
    `notified_at` DATETIME NULL DEFAULT NULL,
    `note` VARCHAR(255) NULL,
    `converted_booking_code` VARCHAR(40) NULL DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_waitlist_pitch` FOREIGN KEY (`pitch_id`) REFERENCES `pitches`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_waitlist_slot` FOREIGN KEY (`slot_id`) REFERENCES `time_slots`(`id`) ON DELETE CASCADE,
    INDEX `idx_waitlist_lookup` (`pitch_id`, `booking_date`, `slot_id`),
    INDEX `idx_waitlist_phone` (`phone`),
    INDEX `idx_waitlist_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @col_wl_notif := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'waitlist' AND COLUMN_NAME = 'notified_at');
SET @sql_wl_notif := IF(@col_wl_notif = 0, 'ALTER TABLE `waitlist` ADD COLUMN `notified_at` DATETIME NULL DEFAULT NULL AFTER `status`', 'SELECT 1');
PREPARE stmt_wl_notif FROM @sql_wl_notif; EXECUTE stmt_wl_notif; DEALLOCATE PREPARE stmt_wl_notif;

-- 4. Nâng cấp Bảng Mã giảm giá (Vouchers) & Quy tắc Giờ vàng (Golden Hours)
SET @col_v_max := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vouchers' AND COLUMN_NAME = 'max_usage');
SET @sql_v_max := IF(@col_v_max = 0, 'ALTER TABLE `vouchers` ADD COLUMN `max_usage` INT NOT NULL DEFAULT 100 AFTER `min_order`', 'SELECT 1');
PREPARE stmt_v_max FROM @sql_v_max; EXECUTE stmt_v_max; DEALLOCATE PREPARE stmt_v_max;

SET @col_v_used := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vouchers' AND COLUMN_NAME = 'used_count');
SET @sql_v_used := IF(@col_v_used = 0, 'ALTER TABLE `vouchers` ADD COLUMN `used_count` INT NOT NULL DEFAULT 0 AFTER `max_usage`', 'SELECT 1');
PREPARE stmt_v_used FROM @sql_v_used; EXECUTE stmt_v_used; DEALLOCATE PREPARE stmt_v_used;

SET @col_v_from := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vouchers' AND COLUMN_NAME = 'valid_from');
SET @sql_v_from := IF(@col_v_from = 0, 'ALTER TABLE `vouchers` ADD COLUMN `valid_from` DATE NULL DEFAULT NULL AFTER `used_count`', 'SELECT 1');
PREPARE stmt_v_from FROM @sql_v_from; EXECUTE stmt_v_from; DEALLOCATE PREPARE stmt_v_from;

SET @col_v_to := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vouchers' AND COLUMN_NAME = 'valid_to');
SET @sql_v_to := IF(@col_v_to = 0, 'ALTER TABLE `vouchers` ADD COLUMN `valid_to` DATE NULL DEFAULT NULL AFTER `valid_from`', 'SELECT 1');
PREPARE stmt_v_to FROM @sql_v_to; EXECUTE stmt_v_to; DEALLOCATE PREPARE stmt_v_to;

SET @col_v_ptype := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vouchers' AND COLUMN_NAME = 'pitch_type_limit');
SET @sql_v_ptype := IF(@col_v_ptype = 0, 'ALTER TABLE `vouchers` ADD COLUMN `pitch_type_limit` INT NULL DEFAULT NULL COMMENT ''NULL=áp dụng tất cả, 5, 7, 11'' AFTER `valid_to`', 'SELECT 1');
PREPARE stmt_v_ptype FROM @sql_v_ptype; EXECUTE stmt_v_ptype; DEALLOCATE PREPARE stmt_v_ptype;

CREATE TABLE IF NOT EXISTS `golden_hour_rules` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `rule_name` VARCHAR(100) NOT NULL,
    `pitch_type` INT NULL DEFAULT NULL COMMENT 'NULL=Tất cả loại sân, 5, 7, 11',
    `day_of_week` TINYINT NULL DEFAULT NULL COMMENT 'NULL=Tất cả các ngày, 1..7',
    `slot_id` VARCHAR(10) NULL DEFAULT NULL COMMENT 'NULL=Tất cả slots',
    `price_adjustment_type` ENUM('fixed', 'percent_discount', 'percent_surcharge') NOT NULL DEFAULT 'fixed',
    `adjustment_value` INT NOT NULL DEFAULT 0,
    `description` VARCHAR(255) NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_golden_lookup` (`pitch_type`, `day_of_week`, `slot_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Bảng Ghép kèo & Tìm đối giao lưu (Matchmaking Posts)
CREATE TABLE IF NOT EXISTS `matchmaking_posts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `post_code` VARCHAR(40) NOT NULL UNIQUE,
    `user_id` INT NULL DEFAULT NULL,
    `team_name` VARCHAR(100) NOT NULL,
    `captain_name` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `match_date` DATE NOT NULL,
    `slot_id` VARCHAR(10) NULL DEFAULT NULL,
    `slot_time` VARCHAR(50) NOT NULL,
    `pitch_id` VARCHAR(20) NULL DEFAULT NULL,
    `pitch_type` INT NOT NULL DEFAULT 7,
    `skill_level` ENUM('beginner', 'intermediate', 'advanced', 'all') NOT NULL DEFAULT 'intermediate',
    `fee_mode` ENUM('split_50_50', 'loser_pays', 'negotiable') NOT NULL DEFAULT 'split_50_50',
    `status` ENUM('pending', 'open', 'matched', 'closed', 'rejected') NOT NULL DEFAULT 'open',
    `opponent_team` VARCHAR(100) NULL DEFAULT NULL,
    `opponent_captain` VARCHAR(100) NULL DEFAULT NULL,
    `opponent_phone` VARCHAR(20) NULL DEFAULT NULL,
    `booking_code` VARCHAR(40) NULL DEFAULT NULL,
    `note` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_match_date` (`match_date`),
    INDEX `idx_match_status` (`status`),
    INDEX `idx_match_type` (`pitch_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `matchmaking_posts`
MODIFY COLUMN `status` ENUM('pending', 'open', 'matched', 'closed', 'rejected') NOT NULL DEFAULT 'open';

-- 6. Settings mặc định Giai đoạn 5
INSERT IGNORE INTO `settings` (`setting_key`, `setting_value`) VALUES
('waitlist_hold_minutes', '15'),
('matchmaking_enabled', '1'),
('matchmaking_require_approval', '0');
