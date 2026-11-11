-- ===============================================================
-- MIGRATION 007: BẢO MẬT NÂNG CAO, TÍCH ĐIỂM, PHÂN HẠNG VÀ BẢO VỆ DỮ LIỆU RIÊNG TƯ
-- Chạy lại an toàn (Idempotent) trên MySQL 8.0+ và MariaDB
-- 7.1 Bảng users: Tích điểm, Phân hạng thành viên, 2FA TOTP & Quyền riêng tư
-- 7.2 Bảng vouchers: Giới hạn số lần dùng/user & Phân hạng áp dụng
-- 7.3 Bảng bookings: Điểm thưởng đã dùng, Nước đổi quà, Cờ tích điểm, Quyền riêng tư
-- 7.4 Bảo mật seed dữ liệu & Đồng bộ phân hạng khách hàng
-- ===============================================================

-- ---------------------------------------------------------------
-- 1. NÂNG CẤP BẢNG USERS (Tích điểm, Phân hạng, TOTP 2FA, Quyền riêng tư)
-- ---------------------------------------------------------------
SET @col_u_pts := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'points');
SET @sql_u_pts := IF(@col_u_pts = 0, 'ALTER TABLE `users` ADD COLUMN `points` INT NOT NULL DEFAULT 0 AFTER `status`', 'SELECT 1');
PREPARE stmt_u_pts FROM @sql_u_pts; EXECUTE stmt_u_pts; DEALLOCATE PREPARE stmt_u_pts;

SET @col_u_tier := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'customer_tier');
SET @sql_u_tier := IF(@col_u_tier = 0, 'ALTER TABLE `users` ADD COLUMN `customer_tier` VARCHAR(30) NOT NULL DEFAULT ''standard'' AFTER `points`', 'SELECT 1');
PREPARE stmt_u_tier FROM @sql_u_tier; EXECUTE stmt_u_tier; DEALLOCATE PREPARE stmt_u_tier;

SET @col_u_totp_s := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'totp_secret');
SET @sql_u_totp_s := IF(@col_u_totp_s = 0, 'ALTER TABLE `users` ADD COLUMN `totp_secret` VARCHAR(64) NULL DEFAULT NULL AFTER `customer_tier`', 'SELECT 1');
PREPARE stmt_u_totp_s FROM @sql_u_totp_s; EXECUTE stmt_u_totp_s; DEALLOCATE PREPARE stmt_u_totp_s;

SET @col_u_totp_e := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'totp_enabled');
SET @sql_u_totp_e := IF(@col_u_totp_e = 0, 'ALTER TABLE `users` ADD COLUMN `totp_enabled` TINYINT(1) NOT NULL DEFAULT 0 AFTER `totp_secret`', 'SELECT 1');
PREPARE stmt_u_totp_e FROM @sql_u_totp_e; EXECUTE stmt_u_totp_e; DEALLOCATE PREPARE stmt_u_totp_e;

SET @col_u_priv := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'privacy_consent_at');
SET @sql_u_priv := IF(@col_u_priv = 0, 'ALTER TABLE `users` ADD COLUMN `privacy_consent_at` DATETIME NULL DEFAULT NULL AFTER `totp_enabled`', 'SELECT 1');
PREPARE stmt_u_priv FROM @sql_u_priv; EXECUTE stmt_u_priv; DEALLOCATE PREPARE stmt_u_priv;

SET @idx_u_tier := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_tier');
SET @sql_idx_u_tier := IF(@idx_u_tier = 0, 'ALTER TABLE `users` ADD INDEX `idx_users_tier` (`customer_tier`)', 'SELECT 1');
PREPARE stmt_idx_u_tier FROM @sql_idx_u_tier; EXECUTE stmt_idx_u_tier; DEALLOCATE PREPARE stmt_idx_u_tier;

SET @idx_u_phone := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_phone');
SET @sql_idx_u_phone := IF(@idx_u_phone = 0, 'ALTER TABLE `users` ADD INDEX `idx_users_phone` (`phone`)', 'SELECT 1');
PREPARE stmt_idx_u_phone FROM @sql_idx_u_phone; EXECUTE stmt_idx_u_phone; DEALLOCATE PREPARE stmt_idx_u_phone;

-- ---------------------------------------------------------------
-- 2. NÂNG CẤP BẢNG VOUCHERS (Giới hạn/người & Phân hạng áp dụng)
-- ---------------------------------------------------------------
SET @col_v_mpu := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vouchers' AND COLUMN_NAME = 'max_per_user');
SET @sql_v_mpu := IF(@col_v_mpu = 0, 'ALTER TABLE `vouchers` ADD COLUMN `max_per_user` INT NOT NULL DEFAULT 1 AFTER `used_count`', 'SELECT 1');
PREPARE stmt_v_mpu FROM @sql_v_mpu; EXECUTE stmt_v_mpu; DEALLOCATE PREPARE stmt_v_mpu;

SET @col_v_req_tier := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vouchers' AND COLUMN_NAME = 'required_tier');
SET @sql_v_req_tier := IF(@col_v_req_tier = 0, 'ALTER TABLE `vouchers` ADD COLUMN `required_tier` VARCHAR(50) NULL DEFAULT NULL AFTER `pitch_type_limit`', 'SELECT 1');
PREPARE stmt_v_req_tier FROM @sql_v_req_tier; EXECUTE stmt_v_req_tier; DEALLOCATE PREPARE stmt_v_req_tier;

-- Cập nhật an toàn cho các voucher mặc định
UPDATE `vouchers` SET `required_tier` = 'vip,regular' WHERE `code` = 'VIPGOLD' AND `required_tier` IS NULL;
UPDATE `vouchers` SET `max_per_user` = 1 WHERE `code` IN ('WELCOME10', 'SINHVIEN30K') AND (`max_per_user` IS NULL OR `max_per_user` = 0);
UPDATE `vouchers` SET `max_per_user` = 1 WHERE `max_per_user` IS NULL OR `max_per_user` = 0;

-- ---------------------------------------------------------------
-- 3. NÂNG CẤP BẢNG BOOKINGS (Tích điểm, Nước quà tặng & Quyền riêng tư)
-- ---------------------------------------------------------------
SET @col_b_pts_u := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'points_used');
SET @sql_b_pts_u := IF(@col_b_pts_u = 0, 'ALTER TABLE `bookings` ADD COLUMN `points_used` INT NOT NULL DEFAULT 0 AFTER `recurring_schedule_id`', 'SELECT 1');
PREPARE stmt_b_pts_u FROM @sql_b_pts_u; EXECUTE stmt_b_pts_u; DEALLOCATE PREPARE stmt_b_pts_u;

SET @col_b_red_bot := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'redeemed_bottles');
SET @sql_b_red_bot := IF(@col_b_red_bot = 0, 'ALTER TABLE `bookings` ADD COLUMN `redeemed_bottles` INT NOT NULL DEFAULT 0 AFTER `points_used`', 'SELECT 1');
PREPARE stmt_b_red_bot FROM @sql_b_red_bot; EXECUTE stmt_b_red_bot; DEALLOCATE PREPARE stmt_b_red_bot;

SET @col_b_pts_aw := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'points_awarded');
SET @sql_b_pts_aw := IF(@col_b_pts_aw = 0, 'ALTER TABLE `bookings` ADD COLUMN `points_awarded` TINYINT(1) NOT NULL DEFAULT 0 AFTER `redeemed_bottles`', 'SELECT 1');
PREPARE stmt_b_pts_aw FROM @sql_b_pts_aw; EXECUTE stmt_b_pts_aw; DEALLOCATE PREPARE stmt_b_pts_aw;

SET @col_b_gift_d := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'gift_deducted');
SET @sql_b_gift_d := IF(@col_b_gift_d = 0, 'ALTER TABLE `bookings` ADD COLUMN `gift_deducted` TINYINT(1) NOT NULL DEFAULT 0 AFTER `points_awarded`', 'SELECT 1');
PREPARE stmt_b_gift_d FROM @sql_b_gift_d; EXECUTE stmt_b_gift_d; DEALLOCATE PREPARE stmt_b_gift_d;

SET @col_b_priv := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'privacy_consent_at');
SET @sql_b_priv := IF(@col_b_priv = 0, 'ALTER TABLE `bookings` ADD COLUMN `privacy_consent_at` DATETIME NULL DEFAULT NULL AFTER `gift_deducted`', 'SELECT 1');
PREPARE stmt_b_priv FROM @sql_b_priv; EXECUTE stmt_b_priv; DEALLOCATE PREPARE stmt_b_priv;

SET @idx_b_usr_pts := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND INDEX_NAME = 'idx_bookings_user_points');
SET @sql_idx_b_usr_pts := IF(@idx_b_usr_pts = 0, 'ALTER TABLE `bookings` ADD INDEX `idx_bookings_user_points` (`user_id`, `points_awarded`)', 'SELECT 1');
PREPARE stmt_idx_b_usr_pts FROM @sql_idx_b_usr_pts; EXECUTE stmt_idx_b_usr_pts; DEALLOCATE PREPARE stmt_idx_b_usr_pts;

-- ---------------------------------------------------------------
-- 4. BẢO MẬT TÀI KHOẢN SEED & ĐỒNG BỘ PHÂN HẠNG KHÁCH HÀNG
-- ---------------------------------------------------------------
-- Seed an toàn tài khoản quanly (INSERT IGNORE để không ghi đè mật khẩu quản lý đã đổi)
INSERT IGNORE INTO `users` (`username`, `email`, `phone`, `full_name`, `password_hash`, `role`, `status`)
VALUES ('quanly', 'quanly@sanbongpro.vn', '0352000222', 'Nguyễn Hoàng Minh (Quản Lý Sân)', '$argon2id$v=19$m=65536,t=4,p=1$QlFIYnZIRlNaV3Nic1JwUw$dpni2Ou0GPfpjEfeFv47syHwOMDHcpxU0LmksbbT4HI', 'manager', 'active');

-- Đồng bộ phân hạng từ customer_crm sang users (nếu trùng số điện thoại)
UPDATE `users` u
INNER JOIN `customer_crm` c ON u.phone = c.phone
SET u.customer_tier = c.customer_tier
WHERE u.customer_tier = 'standard' AND c.customer_tier != 'standard';

-- Settings cấu hình bảo mật và chính sách tích điểm mặc định
INSERT IGNORE INTO `settings` (`setting_key`, `setting_value`) VALUES
('security_totp_required_roles', 'admin,manager'),
('loyalty_points_per_10k', '1'),
('loyalty_bottle_cost_points', '50'),
('privacy_policy_version', '1.0');
