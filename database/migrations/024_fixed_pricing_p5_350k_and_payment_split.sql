-- Migration 024: Fixed Flat Pricing (P5=350k, P7=450k, P11=900k), Clean Invalid Pitch IDs, and Cash/Transfer Payment Split
-- Idempotent MySQL 8.0+ migration

SET @db_name := DATABASE();

-- 1. Add cash_paid_amount and transfer_paid_amount to bookings
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'cash_paid_amount');
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE `bookings` ADD COLUMN `cash_paid_amount` INT NOT NULL DEFAULT 0 AFTER `paid_amount`', 'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'transfer_paid_amount');
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE `bookings` ADD COLUMN `transfer_paid_amount` INT NOT NULL DEFAULT 0 AFTER `cash_paid_amount`', 'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Clean malformed test pitch IDs (e.g. P5-\) safely
DELETE FROM `pitches` WHERE `id` REGEXP '[^A-Za-z0-9_-]';

-- 3. Standardize flat fixed pricing (no peak/weekend surcharge)
UPDATE `pitches` SET `base_price` = 350000, `peak_price` = 350000, `weekend_price` = 350000 WHERE `type` = 5;
UPDATE `pitches` SET `base_price` = 450000, `peak_price` = 450000, `weekend_price` = 450000 WHERE `type` = 7;
UPDATE `pitches` SET `base_price` = 900000, `peak_price` = 900000, `weekend_price` = 900000 WHERE `type` = 11;

INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES
('price_p5_base', '350000'),
('price_p5_peak', '350000'),
('price_p5_weekend', '350000'),
('price_p7_base', '450000'),
('price_p7_peak', '450000'),
('price_p7_weekend', '450000'),
('price_p11_base', '900000'),
('price_p11_peak', '900000'),
('price_p11_weekend', '900000')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

-- 4. Backfill cash_paid_amount & transfer_paid_amount for legacy paid bookings
UPDATE `bookings`
SET
  `transfer_paid_amount` = CASE
    WHEN (`note` LIKE '%Đã tất toán 100% qua Tiền mặt%' OR `note` LIKE '%qua Tiền mặt%')
         AND (`payment_method` LIKE '%VietQR%' OR `payment_method` LIKE '%Chuyển khoản%' OR `payment_method` LIKE '%SePay%')
      THEN LEAST(COALESCE(`paid_amount`, 0), GREATEST(0, COALESCE(`deposit_amount`, 0)))
    WHEN (`payment_method` LIKE '%Tiền mặt%' OR `note` LIKE '%Tiền mặt%')
      THEN 0
    ELSE COALESCE(`paid_amount`, 0)
  END,
  `cash_paid_amount` = CASE
    WHEN (`note` LIKE '%Đã tất toán 100% qua Tiền mặt%' OR `note` LIKE '%qua Tiền mặt%')
         AND (`payment_method` LIKE '%VietQR%' OR `payment_method` LIKE '%Chuyển khoản%' OR `payment_method` LIKE '%SePay%')
      THEN GREATEST(0, COALESCE(`paid_amount`, 0) - LEAST(COALESCE(`paid_amount`, 0), GREATEST(0, COALESCE(`deposit_amount`, 0))))
    WHEN (`payment_method` LIKE '%Tiền mặt%' OR `note` LIKE '%Tiền mặt%')
      THEN COALESCE(`paid_amount`, 0)
    ELSE 0
  END
WHERE `paid_amount` > 0 AND `cash_paid_amount` = 0 AND `transfer_paid_amount` = 0;
