-- Migration 012: Thêm cột must_change_password vào bảng users
-- Phục vụ quy trình bảo mật bắt buộc đổi mật khẩu lần đầu cho tài khoản quản trị
-- Tương thích MySQL 5.7/8.x (bao gồm 8.4) và MariaDB, idempotent 100%
SET @col_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'must_change_password'
);

SET @sql = IF(
    @col_exists = 0,
    'ALTER TABLE `users` ADD COLUMN `must_change_password` TINYINT(1) NOT NULL DEFAULT 0',
    'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
