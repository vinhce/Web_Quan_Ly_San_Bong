-- ===============================================================
-- MIGRATION 002: GIAI ĐOẠN 2 (CHỐNG THẤT THOÁT TIỀN) & GIAI ĐOẠN 3 (VẬN HÀNH QUẦY)
-- Chạy lại an toàn (Idempotent)
-- ===============================================================

USE `quan_ly_san_bong`;

-- 2.1 Bảng Nhật ký thao tác (Audit Logs - Chỉ thêm, không xóa/sửa)
CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NULL DEFAULT NULL,
    `actor_name` VARCHAR(100) NULL DEFAULT NULL,
    `actor_role` VARCHAR(20) NULL DEFAULT NULL,
    `action` VARCHAR(80) NOT NULL,
    `booking_id` VARCHAR(40) NULL DEFAULT NULL,
    `old_value` TEXT NULL DEFAULT NULL,
    `new_value` TEXT NULL DEFAULT NULL,
    `ip` VARCHAR(45) NOT NULL DEFAULT '127.0.0.1',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_audit_user` (`user_id`),
    INDEX `idx_audit_action` (`action`),
    INDEX `idx_audit_booking` (`booking_id`),
    INDEX `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.2 Bảng Chốt ca & Giao ca (Shifts)
CREATE TABLE IF NOT EXISTS `shifts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `staff_id` INT NOT NULL,
    `staff_name` VARCHAR(100) NOT NULL DEFAULT '',
    `start_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `end_time` DATETIME NULL DEFAULT NULL,
    `cash_total` INT NOT NULL DEFAULT 0,
    `transfer_total` INT NOT NULL DEFAULT 0,
    `actual_cash_received` INT NULL DEFAULT NULL,
    `discrepancy_amount` INT NULL DEFAULT NULL,
    `note` TEXT NULL DEFAULT NULL,
    `admin_note` TEXT NULL DEFAULT NULL,
    `status` ENUM('open', 'closed', 'confirmed') NOT NULL DEFAULT 'open',
    `confirmed_by` INT NULL DEFAULT NULL,
    `confirmed_at` DATETIME NULL DEFAULT NULL,
    INDEX `idx_shifts_staff` (`staff_id`),
    INDEX `idx_shifts_status` (`status`),
    INDEX `idx_shifts_start` (`start_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.1 Nâng cấp bảng Dịch vụ (Extra Services) & Lịch sử bán nước/dịch vụ (Service Sales)
ALTER TABLE `extra_services` ADD COLUMN IF NOT EXISTS `stock_qty` INT NOT NULL DEFAULT 100;
ALTER TABLE `extra_services` ADD COLUMN IF NOT EXISTS `min_stock_warning` INT NOT NULL DEFAULT 10;
ALTER TABLE `extra_services` ADD COLUMN IF NOT EXISTS `track_inventory` TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE `extra_services` ADD COLUMN IF NOT EXISTS `is_active` TINYINT(1) NOT NULL DEFAULT 1;

UPDATE `extra_services` SET `track_inventory` = 0 WHERE `id` = 'SRV-REF';
UPDATE `extra_services` SET `track_inventory` = 1, `stock_qty` = 80, `min_stock_warning` = 10 WHERE `id` IN ('SRV-WATER', 'SRV-WATER-BOTTLE', 'SRV-BIB', 'SRV-BALL') AND `stock_qty` = 100;

CREATE TABLE IF NOT EXISTS `service_sales` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `service_id` VARCHAR(30) NOT NULL,
    `service_name` VARCHAR(150) NOT NULL,
    `quantity` INT NOT NULL DEFAULT 1,
    `unit_price` INT NOT NULL DEFAULT 0,
    `total_amount` INT NOT NULL DEFAULT 0,
    `payment_method` VARCHAR(50) NOT NULL DEFAULT 'Tiền mặt tại quầy',
    `booking_code` VARCHAR(40) NULL DEFAULT NULL,
    `staff_id` INT NULL DEFAULT NULL,
    `note` VARCHAR(255) NULL DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_srv_sales_created` (`created_at`),
    INDEX `idx_srv_sales_staff` (`staff_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.3 Nâng cấp cột status của bảng pitches để hỗ trợ trạng thái 'Ẩn'
ALTER TABLE `pitches` MODIFY COLUMN `status` VARCHAR(30) NOT NULL DEFAULT 'Hoạt động';
