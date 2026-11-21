-- Migration 019: Composite indexes for Dashboard Summary & Overview queries
-- Supports fast filtering by (booking_date, status) and (pitch_id, booking_date)

SET @db_name = DATABASE();

SET @idx1_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'bookings'
      AND INDEX_NAME = 'idx_bookings_date_status'
);
SET @sql_idx1 = IF(
    @idx1_exists = 0,
    'ALTER TABLE `bookings` ADD INDEX `idx_bookings_date_status` (`booking_date`, `status`)',
    'SELECT 1'
);
PREPARE stmt1 FROM @sql_idx1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

SET @idx2_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'bookings'
      AND INDEX_NAME = 'idx_bookings_pitch_date'
);
SET @sql_idx2 = IF(
    @idx2_exists = 0,
    'ALTER TABLE `bookings` ADD INDEX `idx_bookings_pitch_date` (`pitch_id`, `booking_date`)',
    'SELECT 1'
);
PREPARE stmt2 FROM @sql_idx2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
