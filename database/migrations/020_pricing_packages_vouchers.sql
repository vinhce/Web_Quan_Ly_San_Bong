-- Migration 020: Monthly Packages table & Voucher max_discount_amount column
-- Idempotent MySQL 8 migration for Tab 5 ("5. Bảng giá & Voucher") overhaul

-- 1. Create monthly_packages table
CREATE TABLE IF NOT EXISTS `monthly_packages` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(120) NOT NULL,
    `months` INT NOT NULL DEFAULT 1,
    `matches_count` INT NOT NULL DEFAULT 4,
    `discount_percent` INT NOT NULL DEFAULT 0,
    `gifts_json` TEXT NULL,
    `badge_text` VARCHAR(60) NULL,
    `theme` VARCHAR(30) NOT NULL DEFAULT 'default',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `sort_order` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_monthly_packages_active_sort` (`is_active`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Seed the 3 default monthly packages idempotently (only if not already present by name)
INSERT INTO `monthly_packages` (`name`, `months`, `matches_count`, `discount_percent`, `gifts_json`, `badge_text`, `theme`, `is_active`, `sort_order`)
SELECT
    'Gói Vàng 3 Tháng',
    3,
    12,
    15,
    '[{"service_id":"SRV-WATER","name":"Nước suối đóng chai (Thùng 24 chai Aquafina)","qty":2,"unit_price":120000},{"service_id":"SRV-REF","name":"Trọng tài chuyên nghiệp bắt trận","qty":1,"unit_price":150000}]',
    'TIẾT KIỆM NHẤT',
    'diamond',
    1,
    1
WHERE NOT EXISTS (
    SELECT 1 FROM `monthly_packages` WHERE `name` = 'Gói Vàng 3 Tháng'
);

INSERT INTO `monthly_packages` (`name`, `months`, `matches_count`, `discount_percent`, `gifts_json`, `badge_text`, `theme`, `is_active`, `sort_order`)
SELECT
    'Gói Bạc 2 Tháng',
    2,
    8,
    10,
    '[{"service_id":"SRV-WATER","name":"Nước suối đóng chai (Thùng 24 chai Aquafina)","qty":1,"unit_price":120000}]',
    'PHỔ BIẾN',
    'green',
    1,
    2
WHERE NOT EXISTS (
    SELECT 1 FROM `monthly_packages` WHERE `name` = 'Gói Bạc 2 Tháng'
);

INSERT INTO `monthly_packages` (`name`, `months`, `matches_count`, `discount_percent`, `gifts_json`, `badge_text`, `theme`, `is_active`, `sort_order`)
SELECT
    'Gói Đồng 1 Tháng',
    1,
    4,
    5,
    '[]',
    'CƠ BẢN',
    'default',
    1,
    3
WHERE NOT EXISTS (
    SELECT 1 FROM `monthly_packages` WHERE `name` = 'Gói Đồng 1 Tháng'
);

-- 3. Add max_discount_amount column to vouchers (idempotent via information_schema check)
SET @col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'vouchers'
      AND COLUMN_NAME = 'max_discount_amount'
);

SET @ddl := IF(
    @col_exists = 0,
    'ALTER TABLE `vouchers` ADD COLUMN `max_discount_amount` INT NOT NULL DEFAULT 0 AFTER `discount_value`',
    'SELECT 1'
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
