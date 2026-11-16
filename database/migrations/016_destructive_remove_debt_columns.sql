-- ===============================================================
-- MIGRATION 016: DESTRUCTIVE REMOVE DEBT COLUMNS & PURGE DEBT DATA
-- Hệ thống: Quản Lý Sân Bóng Pro (MySQL 5.7+ / 8.0+ / MariaDB)
-- Mục tiêu: Xóa sạch hoàn toàn các cột, dữ liệu và tàn dư công nợ
-- Idempotent 100%: Chạy lại an toàn nhiều lần không gây lỗi
-- ===============================================================

-- ---------------------------------------------------------------
-- HƯỚNG DẪN SAO LƯU AN TOÀN TRƯỚC KHI CHẠY (BACKUP INSTRUCTIONS)
-- ---------------------------------------------------------------
-- 1. Sao lưu toàn bộ cơ sở dữ liệu (chạy từ terminal/powershell):
--    mysqldump -u root -p sanbongpro > backup_sanbongpro_before_016_debt_purge.sql
--    (Hoặc trong Laragon: Chạy `C:\laragon\bin\mysql\mysql-5.7.33-winx64\bin\mysqldump.exe -u root sanbongpro > backup.sql`)
--
-- 2. Kiểm tra bản sao lưu có dung lượng > 0 byte:
--    Get-Item backup_sanbongpro_before_016_debt_purge.sql
--
-- 3. Khôi phục lại nếu cần rollback:
--    mysql -u root sanbongpro < backup_sanbongpro_before_016_debt_purge.sql
-- ---------------------------------------------------------------

-- ---------------------------------------------------------------
-- PHẦN 1: KIỂM TRA VÀ XÓA CÁC BẢNG CÔNG NỢ NẾU CÓ (SAFETY PRE-CHECKS)
-- ---------------------------------------------------------------
DROP TABLE IF EXISTS `debts`;
DROP TABLE IF EXISTS `customer_debts`;
DROP TABLE IF EXISTS `debt_records`;
DROP TABLE IF EXISTS `debt_logs`;

-- ---------------------------------------------------------------
-- PHẦN 2: XÓA CÁC CỘT CÔNG NỢ TRÊN BẢNG `customer_crm` (IDEMPOTENT)
-- ---------------------------------------------------------------

-- 2.1 Cột `debt_amount` trên `customer_crm`
SET @col_crm_debt := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'customer_crm'
      AND COLUMN_NAME = 'debt_amount'
);
SET @sql_crm_debt := IF(
    @col_crm_debt > 0,
    'ALTER TABLE `customer_crm` DROP COLUMN `debt_amount`',
    'DO 0'
);
PREPARE stmt_crm_debt FROM @sql_crm_debt;
EXECUTE stmt_crm_debt;
DEALLOCATE PREPARE stmt_crm_debt;

-- 2.2 Cột `total_debt` trên `customer_crm`
SET @col_crm_tdebt := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'customer_crm'
      AND COLUMN_NAME = 'total_debt'
);
SET @sql_crm_tdebt := IF(
    @col_crm_tdebt > 0,
    'ALTER TABLE `customer_crm` DROP COLUMN `total_debt`',
    'DO 0'
);
PREPARE stmt_crm_tdebt FROM @sql_crm_tdebt;
EXECUTE stmt_crm_tdebt;
DEALLOCATE PREPARE stmt_crm_tdebt;

-- ---------------------------------------------------------------
-- PHẦN 3: XÓA CÁC CỘT CÔNG NỢ TRÊN BẢNG `users` (IDEMPOTENT)
-- ---------------------------------------------------------------

-- 3.1 Cột `debt_amount` trên `users`
SET @col_u_debt := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'debt_amount'
);
SET @sql_u_debt := IF(
    @col_u_debt > 0,
    'ALTER TABLE `users` DROP COLUMN `debt_amount`',
    'DO 0'
);
PREPARE stmt_u_debt FROM @sql_u_debt;
EXECUTE stmt_u_debt;
DEALLOCATE PREPARE stmt_u_debt;

-- 3.2 Cột `total_debt` trên `users`
SET @col_u_tdebt := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'total_debt'
);
SET @sql_u_tdebt := IF(
    @col_u_tdebt > 0,
    'ALTER TABLE `users` DROP COLUMN `total_debt`',
    'DO 0'
);
PREPARE stmt_u_tdebt FROM @sql_u_tdebt;
EXECUTE stmt_u_tdebt;
DEALLOCATE PREPARE stmt_u_tdebt;

-- ---------------------------------------------------------------
-- PHẦN 4: XÓA CÁC CỘT CÔNG NỢ TRÊN BẢNG `bookings` (IDEMPOTENT)
-- ---------------------------------------------------------------

-- 4.1 Cột `is_debt` trên `bookings` nếu có
SET @col_b_is_debt := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'bookings'
      AND COLUMN_NAME = 'is_debt'
);
SET @sql_b_is_debt := IF(
    @col_b_is_debt > 0,
    'ALTER TABLE `bookings` DROP COLUMN `is_debt`',
    'DO 0'
);
PREPARE stmt_b_is_debt FROM @sql_b_is_debt;
EXECUTE stmt_b_is_debt;
DEALLOCATE PREPARE stmt_b_is_debt;

-- 4.2 Cột `debt_amount` trên `bookings` nếu có
SET @col_b_debt_amt := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'bookings'
      AND COLUMN_NAME = 'debt_amount'
);
SET @sql_b_debt_amt := IF(
    @col_b_debt_amt > 0,
    'ALTER TABLE `bookings` DROP COLUMN `debt_amount`',
    'DO 0'
);
PREPARE stmt_b_debt_amt FROM @sql_b_debt_amt;
EXECUTE stmt_b_debt_amt;
DEALLOCATE PREPARE stmt_b_debt_amt;

-- ---------------------------------------------------------------
-- PHẦN 5: CHUẨN HÓA & ĐỐI SOÁT DỮ LIỆU ĐƠN HÀNG (DATA RECONCILIATION)
-- Nguyên tắc cốt lõi: Sân bóng Pro KHÔNG CHO PHÉP NỢ.
-- 1. Đơn hoàn thành (status IN ('Hoàn thành', 'completed')) PHẢI thanh toán đủ 100%.
-- 2. Đơn đã hủy / No-show: remaining_amount = 0 (không ghi nhận nợ treo).
-- 3. Đơn đang xử lý: remaining_amount = GREATEST(0, total_price - paid_amount).
-- ---------------------------------------------------------------

-- 5.1 Đơn đã hoàn thành: Xóa sạch nợ treo, set paid_amount = total_price, remaining_amount = 0
UPDATE `bookings`
SET `paid_amount` = `total_price`,
    `remaining_amount` = 0,
    `payment_status` = 'Đã thanh toán 100%'
WHERE (`status` = 'Hoàn thành' OR `status` = 'completed')
  AND (`remaining_amount` > 0 OR `paid_amount` < `total_price`);

-- 5.2 Đơn đã hủy hoặc No-Show: Đảm bảo remaining_amount = 0
UPDATE `bookings`
SET `remaining_amount` = 0
WHERE `status` IN ('Đã hủy', 'Khách chưa đến')
   OR `payment_status` IN ('Đã hủy', 'Tịch thu cọc 30%', 'Đã hoàn cọc 100%', 'Bảo lưu cọc 30%', 'Phạt 50% cọc');

-- 5.3 Chuẩn hóa số tiền còn lại cho các đơn hợp lệ chưa check-in/đang đá
UPDATE `bookings`
SET `remaining_amount` = GREATEST(0, `total_price` - `paid_amount`)
WHERE `status` NOT IN ('Đã hủy', 'Khách chưa đến', 'Hoàn thành', 'completed');

-- ---------------------------------------------------------------
-- PHẦN 6: GHI NHẬN AUDIT LOG CHO ĐỢT XÓA SẠCH CÔNG NỢ
-- ---------------------------------------------------------------
INSERT INTO `audit_logs` (`actor_name`, `actor_role`, `action`, `target_type`, `target_id`, `old_value`, `new_value`, `ip`, `created_at`)
VALUES ('System Migration', 'admin', 'MIGRATION_016_PURGE_DEBT', 'system', 'database', 'debt_management_legacy', 'debt_purged_completely', '127.0.0.1', NOW());
