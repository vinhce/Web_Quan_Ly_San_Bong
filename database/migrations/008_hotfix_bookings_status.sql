-- ===============================================================
-- MIGRATION 008: HOTFIX CỘT STATUS & INDEX BẢNG BOOKINGS (IDEMPOTENT)
-- Sửa lỗi Unknown column 'status' / 'b.status' khi nâng cấp từ schema cũ
-- và thay thế unique_pitch_date_slot bằng idx_pitch_date_slot để nhả sân tái đặt được.
-- ===============================================================

SET @col_b_status := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'bookings'
      AND COLUMN_NAME = 'status'
);
SET @sql_b_status := IF(
    @col_b_status = 0,
    'ALTER TABLE `bookings` ADD COLUMN `status` VARCHAR(50) NOT NULL DEFAULT ''Đã xác nhận'' AFTER `remaining_amount`',
    'SELECT 1'
);
PREPARE stmt_b_status FROM @sql_b_status;
EXECUTE stmt_b_status;
DEALLOCATE PREPARE stmt_b_status;

-- Đồng bộ trạng thái hủy cho các đơn cũ nếu chỉ mới có payment_status
UPDATE `bookings`
SET `status` = 'Đã hủy'
WHERE `payment_status` IN ('Đã hủy', 'Tịch thu cọc 30%', 'Đã hoàn cọc 100%', 'Bảo lưu cọc 30%', 'Phạt 50% cọc')
  AND (`status` IS NULL OR `status` = '' OR `status` = 'Đã xác nhận');

-- Tạo non-unique index trước để không vướng khóa ngoại fk_bookings_pitch khi gỡ unique key cũ
SET @idx_pds := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'bookings'
      AND INDEX_NAME = 'idx_pitch_date_slot'
);
SET @sql_idx_pds := IF(
    @idx_pds = 0,
    'ALTER TABLE `bookings` ADD INDEX `idx_pitch_date_slot` (`pitch_id`, `booking_date`, `slot_id`)',
    'SELECT 1'
);
PREPARE stmt_idx_pds FROM @sql_idx_pds;
EXECUTE stmt_idx_pds;
DEALLOCATE PREPARE stmt_idx_pds;

SET @uniq_pds := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'bookings'
      AND INDEX_NAME = 'unique_pitch_date_slot'
);
SET @sql_drop_uniq := IF(
    @uniq_pds > 0,
    'ALTER TABLE `bookings` DROP INDEX `unique_pitch_date_slot`',
    'SELECT 1'
);
PREPARE stmt_drop_uniq FROM @sql_drop_uniq;
EXECUTE stmt_drop_uniq;
DEALLOCATE PREPARE stmt_drop_uniq;
