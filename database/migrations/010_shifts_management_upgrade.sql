-- Migration 010: Nâng cấp bảng ca trực (shifts) và liên kết nhân viên phục vụ chốt ca
CREATE TABLE IF NOT EXISTS `shifts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `staff_id` INT NOT NULL,
  `staff_name` VARCHAR(100) NOT NULL,
  `start_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `end_time` DATETIME NULL,
  `initial_cash` INT NOT NULL DEFAULT 0,
  `cash_total` INT NOT NULL DEFAULT 0,
  `transfer_total` INT NOT NULL DEFAULT 0,
  `actual_cash_received` INT NULL,
  `discrepancy_amount` INT NULL,
  `discrepancy_reason` VARCHAR(255) NULL,
  `note` TEXT NULL,
  `admin_note` TEXT NULL,
  `status` ENUM('open','closed','confirmed') NOT NULL DEFAULT 'open',
  `confirmed_by` INT NULL,
  `confirmed_at` DATETIME NULL,
  INDEX `idx_shifts_staff_status` (`staff_id`, `status`),
  INDEX `idx_shifts_start_time` (`start_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm các cột còn thiếu vào shifts nếu bảng đã tồn tại từ trước
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shifts' AND COLUMN_NAME = 'initial_cash');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `shifts` ADD COLUMN `initial_cash` INT NOT NULL DEFAULT 0 AFTER `end_time`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shifts' AND COLUMN_NAME = 'discrepancy_reason');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `shifts` ADD COLUMN `discrepancy_reason` VARCHAR(255) NULL AFTER `discrepancy_amount`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Thêm cột staff_id vào bookings nếu chưa có
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'staff_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `bookings` ADD COLUMN `staff_id` INT NULL DEFAULT NULL AFTER `user_id`, ADD INDEX `idx_bookings_staff` (`staff_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
