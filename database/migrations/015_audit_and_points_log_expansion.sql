-- ===============================================================
-- MIGRATION 015: MỞ RỘNG AUDIT LOGS, POINTS LOG & USER ADMIN NOTE
-- Hệ thống: Quản Lý Sân Bóng Pro (MySQL 5.7+ / 8.0+ / MariaDB)
-- Idempotent 100%: Chạy lại an toàn nhiều lần không gây lỗi
-- ===============================================================

CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NULL DEFAULT NULL,
    `actor_name` VARCHAR(100) NULL DEFAULT NULL,
    `actor_role` VARCHAR(20) NULL DEFAULT NULL,
    `action` VARCHAR(80) NOT NULL,
    `target_type` VARCHAR(50) NULL DEFAULT NULL,
    `target_id` VARCHAR(50) NULL DEFAULT NULL,
    `booking_id` VARCHAR(40) NULL DEFAULT NULL,
    `old_value` TEXT NULL DEFAULT NULL,
    `new_value` TEXT NULL DEFAULT NULL,
    `ip` VARCHAR(45) NOT NULL DEFAULT '127.0.0.1',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_audit_user` (`user_id`),
    INDEX `idx_audit_action` (`action`),
    INDEX `idx_audit_target` (`target_type`, `target_id`),
    INDEX `idx_audit_booking` (`booking_id`),
    INDEX `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @col_audit_tt := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'audit_logs'
      AND COLUMN_NAME = 'target_type'
);
SET @sql_audit_tt := IF(
    @col_audit_tt = 0,
    'ALTER TABLE `audit_logs` ADD COLUMN `target_type` VARCHAR(50) NULL DEFAULT NULL AFTER `action`',
    'SELECT 1'
);
PREPARE stmt_audit_tt FROM @sql_audit_tt;
EXECUTE stmt_audit_tt;
DEALLOCATE PREPARE stmt_audit_tt;

SET @col_audit_ti := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'audit_logs'
      AND COLUMN_NAME = 'target_id'
);
SET @sql_audit_ti := IF(
    @col_audit_ti = 0,
    'ALTER TABLE `audit_logs` ADD COLUMN `target_id` VARCHAR(50) NULL DEFAULT NULL AFTER `target_type`',
    'SELECT 1'
);
PREPARE stmt_audit_ti FROM @sql_audit_ti;
EXECUTE stmt_audit_ti;
DEALLOCATE PREPARE stmt_audit_ti;

SET @idx_audit_target := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'audit_logs'
      AND INDEX_NAME = 'idx_audit_target'
);
SET @sql_idx_audit_target := IF(
    @idx_audit_target = 0,
    'ALTER TABLE `audit_logs` ADD INDEX `idx_audit_target` (`target_type`, `target_id`)',
    'SELECT 1'
);
PREPARE stmt_idx_audit_target FROM @sql_idx_audit_target;
EXECUTE stmt_idx_audit_target;
DEALLOCATE PREPARE stmt_idx_audit_target;

CREATE TABLE IF NOT EXISTS `points_log` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `booking_id` INT NULL DEFAULT NULL,
    `delta` INT NOT NULL,
    `reason` VARCHAR(255) NOT NULL,
    `admin_id` INT NULL DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_points_user` (`user_id`, `created_at`),
    KEY `idx_points_admin` (`admin_id`),
    CONSTRAINT `fk_points_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @col_pl_admin := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'points_log'
      AND COLUMN_NAME = 'admin_id'
);
SET @sql_pl_admin := IF(
    @col_pl_admin = 0,
    'ALTER TABLE `points_log` ADD COLUMN `admin_id` INT NULL DEFAULT NULL AFTER `reason`',
    'SELECT 1'
);
PREPARE stmt_pl_admin FROM @sql_pl_admin;
EXECUTE stmt_pl_admin;
DEALLOCATE PREPARE stmt_pl_admin;

SET @col_pl_reason_len := (
    SELECT CHARACTER_MAXIMUM_LENGTH
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'points_log'
      AND COLUMN_NAME = 'reason'
);
SET @sql_pl_reason := IF(
    @col_pl_reason_len IS NOT NULL AND @col_pl_reason_len < 255,
    'ALTER TABLE `points_log` MODIFY COLUMN `reason` VARCHAR(255) NOT NULL',
    'SELECT 1'
);
PREPARE stmt_pl_reason FROM @sql_pl_reason;
EXECUTE stmt_pl_reason;
DEALLOCATE PREPARE stmt_pl_reason;

SET @idx_pl_user := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'points_log'
      AND INDEX_NAME = 'idx_points_user'
);
SET @sql_idx_pl_user := IF(
    @idx_pl_user = 0,
    'ALTER TABLE `points_log` ADD INDEX `idx_points_user` (`user_id`, `created_at`)',
    'SELECT 1'
);
PREPARE stmt_idx_pl_user FROM @sql_idx_pl_user;
EXECUTE stmt_idx_pl_user;
DEALLOCATE PREPARE stmt_idx_pl_user;

SET @idx_pl_admin := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'points_log'
      AND INDEX_NAME = 'idx_points_admin'
);
SET @sql_idx_pl_admin := IF(
    @idx_pl_admin = 0,
    'ALTER TABLE `points_log` ADD INDEX `idx_points_admin` (`admin_id`)',
    'SELECT 1'
);
PREPARE stmt_idx_pl_admin FROM @sql_idx_pl_admin;
EXECUTE stmt_idx_pl_admin;
DEALLOCATE PREPARE stmt_idx_pl_admin;

SET @fk_pl_u := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'points_log'
      AND CONSTRAINT_NAME IN ('fk_points_user', 'fk_points_log_user')
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql_fk_pl_u := IF(
    @fk_pl_u = 0,
    'ALTER TABLE `points_log` ADD CONSTRAINT `fk_points_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE',
    'SELECT 1'
);
PREPARE stmt_fk_pl_u FROM @sql_fk_pl_u;
EXECUTE stmt_fk_pl_u;
DEALLOCATE PREPARE stmt_fk_pl_u;

SET @col_u_an := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'admin_note'
);
SET @col_u_has_tier := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'customer_tier'
);
SET @sql_u_an := IF(
    @col_u_an = 0,
    IF(
        @col_u_has_tier > 0,
        'ALTER TABLE `users` ADD COLUMN `admin_note` TEXT NULL DEFAULT NULL AFTER `customer_tier`',
        'ALTER TABLE `users` ADD COLUMN `admin_note` TEXT NULL DEFAULT NULL'
    ),
    'SELECT 1'
);
PREPARE stmt_u_an FROM @sql_u_an;
EXECUTE stmt_u_an;
DEALLOCATE PREPARE stmt_u_an;
