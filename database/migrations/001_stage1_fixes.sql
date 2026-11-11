-- ===============================================================
-- MIGRATION 001: STAGE 1 FIXES (Idempotent)
-- 1. Bảng settings (Lưu cấu hình bảng giá, tỷ lệ cọc, VietQR, hotline)
-- 2. Bổ sung weekend_price vào bảng pitches
-- 3. Bổ sung weeks_count, booking_mode và mở rộng payment_status bảng bookings
-- ===============================================================

CREATE TABLE IF NOT EXISTS `settings` (
    `setting_key` VARCHAR(100) PRIMARY KEY,
    `setting_value` TEXT NOT NULL,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `settings` (`setting_key`, `setting_value`) VALUES
('deposit_rate', '30'),
('bank_name', 'MBBank'),
('bank_code', 'MB'),
('bank_account', '0352313548'),
('bank_holder', 'NGUYEN QUANG VINH'),
('hotline', '0352 313 548'),
('open_hours', '05:30 - 23:00 hàng ngày (kể cả Lễ, Tết)'),
('price_p5_base', '250000'),
('price_p5_peak', '350000'),
('price_p5_weekend', '380000'),
('price_p7_base', '450000'),
('price_p7_peak', '650000'),
('price_p7_weekend', '700000'),
('price_p11_base', '900000'),
('price_p11_peak', '1200000'),
('price_p11_weekend', '1400000');

ALTER TABLE `pitches` ADD COLUMN `weekend_price` INT NOT NULL DEFAULT 0 AFTER `peak_price`;

UPDATE `pitches` SET `weekend_price` = 380000 WHERE `type` = 5 AND `weekend_price` = 0;
UPDATE `pitches` SET `weekend_price` = 700000 WHERE `type` = 7 AND `weekend_price` = 0;
UPDATE `pitches` SET `weekend_price` = 1400000 WHERE `type` = 11 AND `weekend_price` = 0;

ALTER TABLE `bookings` ADD COLUMN `weeks_count` INT NOT NULL DEFAULT 1 AFTER `payment_method`;
ALTER TABLE `bookings` ADD COLUMN `booking_mode` VARCHAR(20) NOT NULL DEFAULT 'single' AFTER `weeks_count`;
ALTER TABLE `bookings` MODIFY COLUMN `payment_status` VARCHAR(50) NOT NULL DEFAULT 'Chờ duyệt cọc';
