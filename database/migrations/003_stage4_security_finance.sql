-- ===============================================================
-- MIGRATION 003: GIAI ĐOẠN 4 - BẢO MẬT (RBAC 3 CẤP) & TÀI CHÍNH (VIETQR / CHÍNH SÁCH HỦY)
-- Chạy lại an toàn (Idempotent) trên MySQL 8.0+
-- ===============================================================

USE `quan_ly_san_bong`;

-- 4.1 Nâng cấp phân quyền 3 cấp quản trị (user, staff, manager, admin)
ALTER TABLE `users` MODIFY COLUMN `role` ENUM('user', 'staff', 'manager', 'admin') NOT NULL DEFAULT 'user';

INSERT INTO `users` (`username`, `email`, `phone`, `full_name`, `password_hash`, `role`, `status`)
VALUES (
    'quanly',
    'quanly@sanbongpro.vn',
    '0352000222',
    'Nguyễn Hoàng Minh (Quản Lý Sân)',
    '$argon2id$v=19$m=65536,t=4,p=1$QlFIYnZIRlNaV3Nic1JwUw$dpni2Ou0GPfpjEfeFv47syHwOMDHcpxU0LmksbbT4HI',
    'manager',
    'active'
)
ON DUPLICATE KEY UPDATE
    `email` = VALUES(`email`),
    `phone` = VALUES(`phone`),
    `full_name` = VALUES(`full_name`),
    `password_hash` = VALUES(`password_hash`),
    `role` = 'manager',
    `status` = 'active';

-- 4.2 Bảng Đối soát giao dịch ngân hàng (Bank Transactions - VietQR SePay Webhook)
CREATE TABLE IF NOT EXISTS `bank_transactions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `sepay_tx_id` VARCHAR(80) NULL DEFAULT NULL,
    `tx_fingerprint` VARCHAR(64) NOT NULL,
    `gateway` VARCHAR(50) NOT NULL DEFAULT 'SePay',
    `reference_code` VARCHAR(100) NULL DEFAULT NULL,
    `transaction_content` TEXT NOT NULL,
    `detected_booking_code` VARCHAR(40) NULL DEFAULT NULL,
    `matched_booking_code` VARCHAR(40) NULL DEFAULT NULL,
    `transfer_amount` INT NOT NULL DEFAULT 0,
    `expected_amount` INT NOT NULL DEFAULT 0,
    `discrepancy_amount` INT NOT NULL DEFAULT 0,
    `match_status` ENUM('matched', 'underpaid', 'overpaid', 'unmatched', 'resolved', 'ignored') NOT NULL DEFAULT 'unmatched',
    `mismatch_reason` VARCHAR(255) NULL DEFAULT NULL,
    `raw_payload` LONGTEXT NULL DEFAULT NULL,
    `resolved_by` INT NULL DEFAULT NULL,
    `resolved_note` VARCHAR(255) NULL DEFAULT NULL,
    `transaction_date` DATETIME NULL DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `resolved_at` DATETIME NULL DEFAULT NULL,
    UNIQUE KEY `uniq_sepay_tx_id` (`sepay_tx_id`),
    UNIQUE KEY `uniq_tx_fingerprint` (`tx_fingerprint`),
    INDEX `idx_bank_tx_status` (`match_status`),
    INDEX `idx_bank_tx_code` (`detected_booking_code`),
    INDEX `idx_bank_tx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4.3 Mở rộng bảng bookings phục vụ Giữ chỗ tự hủy & Chính sách hoàn/phạt cọc
SET @col_expires := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'expires_at');
SET @sql_expires := IF(@col_expires = 0, 'ALTER TABLE `bookings` ADD COLUMN `expires_at` DATETIME NULL DEFAULT NULL AFTER `created_at`', 'SELECT 1');
PREPARE stmt_expires FROM @sql_expires; EXECUTE stmt_expires; DEALLOCATE PREPARE stmt_expires;

SET @col_paid := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'paid_amount');
SET @sql_paid := IF(@col_paid = 0, 'ALTER TABLE `bookings` ADD COLUMN `paid_amount` INT NOT NULL DEFAULT 0 AFTER `deposit_amount`', 'SELECT 1');
PREPARE stmt_paid FROM @sql_paid; EXECUTE stmt_paid; DEALLOCATE PREPARE stmt_paid;

SET @col_policy := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'cancel_policy_applied');
SET @sql_policy := IF(@col_policy = 0, 'ALTER TABLE `bookings` ADD COLUMN `cancel_policy_applied` VARCHAR(50) NULL DEFAULT NULL AFTER `payment_method`', 'SELECT 1');
PREPARE stmt_policy FROM @sql_policy; EXECUTE stmt_policy; DEALLOCATE PREPARE stmt_policy;

SET @col_refund := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'refund_amount');
SET @sql_refund := IF(@col_refund = 0, 'ALTER TABLE `bookings` ADD COLUMN `refund_amount` INT NOT NULL DEFAULT 0 AFTER `cancel_policy_applied`', 'SELECT 1');
PREPARE stmt_refund FROM @sql_refund; EXECUTE stmt_refund; DEALLOCATE PREPARE stmt_refund;

SET @idx_expires := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND INDEX_NAME = 'idx_bookings_expires');
SET @sql_idx_expires := IF(@idx_expires = 0, 'ALTER TABLE `bookings` ADD INDEX `idx_bookings_expires` (`expires_at`)', 'SELECT 1');
PREPARE stmt_idx_expires FROM @sql_idx_expires; EXECUTE stmt_idx_expires; DEALLOCATE PREPARE stmt_idx_expires;

-- Đồng bộ paid_amount cho dữ liệu đơn đặt sân hiện có
UPDATE `bookings` SET `paid_amount` = `total_price` WHERE `payment_status` IN ('Đã thanh toán đủ', 'Đã thanh toán 100%') AND `paid_amount` = 0;
UPDATE `bookings` SET `paid_amount` = `deposit_amount` WHERE `payment_status` = 'Đã cọc 30%' AND `paid_amount` = 0;

-- Cài đặt Chính sách giữ chỗ & Hoàn/phạt cọc mặc định
INSERT IGNORE INTO `settings` (`setting_key`, `setting_value`) VALUES
('hold_minutes', '15'),
('refund_full_hours', '24'),
('refund_partial_hours', '4'),
('auto_cancel_enabled', '1');
