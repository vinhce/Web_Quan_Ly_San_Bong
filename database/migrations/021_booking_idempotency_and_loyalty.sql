-- Migration 021: Booking Idempotency Key + Loyalty Rate (100 pts/bottle) + Open Hours (05:30 - 22:30)
-- Idempotent MySQL 8 migration

SET @db_name := DATABASE();

SET @col_idem := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'bookings'
      AND COLUMN_NAME = 'idempotency_key'
);
SET @sql_add_idem := IF(
    @col_idem = 0,
    'ALTER TABLE `bookings` ADD COLUMN `idempotency_key` VARCHAR(64) NULL DEFAULT NULL AFTER `code`',
    'SELECT 1'
);
PREPARE stmt_idem FROM @sql_add_idem;
EXECUTE stmt_idem;
DEALLOCATE PREPARE stmt_idem;

SET @idx_idem := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'bookings'
      AND INDEX_NAME = 'uniq_booking_idempotency'
);
SET @sql_add_idx_idem := IF(
    @idx_idem = 0,
    'ALTER TABLE `bookings` ADD UNIQUE INDEX `uniq_booking_idempotency` (`idempotency_key`)',
    'SELECT 1'
);
PREPARE stmt_idx_idem FROM @sql_add_idx_idem;
EXECUTE stmt_idx_idem;
DEALLOCATE PREPARE stmt_idx_idem;

INSERT INTO `settings` (`setting_key`, `setting_value`)
VALUES ('loyalty_bottle_cost_points', '100')
ON DUPLICATE KEY UPDATE `setting_value` = '100';

INSERT INTO `settings` (`setting_key`, `setting_value`)
VALUES ('open_hours', '05:30 - 22:30 hàng ngày (kể cả Lễ, Tết)')
ON DUPLICATE KEY UPDATE `setting_value` = '05:30 - 22:30 hàng ngày (kể cả Lễ, Tết)';
