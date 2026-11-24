-- Migration 022: Audit Reviews, Audit Logs Metadata & Shifts Upgrade
-- Idempotent MySQL 8.4 migration (no destructive statements)

SET @db_name := DATABASE();

-- 1. Create audit_reviews table
CREATE TABLE IF NOT EXISTS `audit_reviews` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `log_id` INT NOT NULL,
    `reviewer_id` INT NOT NULL,
    `reviewer_name` VARCHAR(100) NULL DEFAULT NULL,
    `note` TEXT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uniq_ar_log` (`log_id`),
    INDEX `idx_ar_reviewer` (`reviewer_id`),
    INDEX `idx_ar_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Add 5 metadata columns to audit_logs (preserving all 12 legacy columns)
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'category');
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE `audit_logs` ADD COLUMN `category` VARCHAR(10) NULL DEFAULT NULL AFTER `action`', 'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'data_group');
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE `audit_logs` ADD COLUMN `data_group` VARCHAR(50) NULL DEFAULT NULL AFTER `category`', 'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'object_code');
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE `audit_logs` ADD COLUMN `object_code` VARCHAR(60) NULL DEFAULT NULL AFTER `target_id`', 'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'is_anomaly');
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE `audit_logs` ADD COLUMN `is_anomaly` TINYINT(1) NOT NULL DEFAULT 0 AFTER `new_value`', 'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'anomaly_reasons');
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE `audit_logs` ADD COLUMN `anomaly_reasons` TEXT NULL DEFAULT NULL AFTER `is_anomaly`', 'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. Ensure required indexes exist on audit_logs: (created_at), (user_id), (category), (object_code)
SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'created_at' AND SEQ_IN_INDEX = 1);
SET @ddl := IF(@idx_exists = 0, 'ALTER TABLE `audit_logs` ADD INDEX `idx_audit_created` (`created_at`)', 'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'user_id' AND SEQ_IN_INDEX = 1);
SET @ddl := IF(@idx_exists = 0, 'ALTER TABLE `audit_logs` ADD INDEX `idx_audit_user` (`user_id`)', 'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'audit_logs' AND INDEX_NAME = 'idx_audit_category');
SET @ddl := IF(@idx_exists = 0, 'ALTER TABLE `audit_logs` ADD INDEX `idx_audit_category` (`category`)', 'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'audit_logs' AND INDEX_NAME = 'idx_audit_object_code');
SET @ddl := IF(@idx_exists = 0, 'ALTER TABLE `audit_logs` ADD INDEX `idx_audit_object_code` (`object_code`)', 'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'audit_logs' AND INDEX_NAME = 'idx_audit_anomaly_created');
SET @ddl := IF(@idx_exists = 0, 'ALTER TABLE `audit_logs` ADD INDEX `idx_audit_anomaly_created` (`is_anomaly`, `created_at`)', 'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Refresh view admin_audit_logs if present
CREATE OR REPLACE VIEW `admin_audit_logs` AS SELECT * FROM `audit_logs`;

-- 4. Upgrade shifts table: add 'pending_explanation' status & staff_counted_cash
SET @shift_enum_has_pe := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'shifts'
      AND COLUMN_NAME = 'status'
      AND COLUMN_TYPE LIKE '%pending_explanation%'
);
SET @ddl := IF(
    @shift_enum_has_pe = 0,
    'ALTER TABLE `shifts` MODIFY COLUMN `status` ENUM(''open'', ''closed'', ''pending_explanation'', ''confirmed'') NOT NULL DEFAULT ''open''',
    'SELECT 1'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'shifts' AND COLUMN_NAME = 'staff_counted_cash');
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE `shifts` ADD COLUMN `staff_counted_cash` DECIMAL(12,2) NULL DEFAULT NULL AFTER `actual_cash_received`', 'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Safe backfill for staff_counted_cash and legacy discrepant closed shifts without valid admin_note (>= 10 chars)
UPDATE `shifts`
SET `staff_counted_cash` = COALESCE(`actual_cash_received`, `actual_cash`)
WHERE `staff_counted_cash` IS NULL
  AND (`actual_cash_received` IS NOT NULL OR `actual_cash` IS NOT NULL)
  AND `status` IN ('closed', 'pending_explanation', 'confirmed');

UPDATE `shifts`
SET `status` = 'pending_explanation'
WHERE `status` = 'closed'
  AND COALESCE(`discrepancy_amount`, 0) <> 0
  AND CHAR_LENGTH(TRIM(COALESCE(`admin_note`, ''))) < 10;

-- 5. Default anomaly detection thresholds in settings
INSERT IGNORE INTO `settings` (`setting_key`, `setting_value`) VALUES
('audit_anomaly_shift_strong_vnd', '50000'),
('audit_anomaly_points_strong', '50'),
('audit_anomaly_discount_pct', '50'),
('audit_anomaly_night_start', '0'),
('audit_anomaly_night_end', '5'),
('audit_reason_min_len', '10');

-- 6. Safe metadata backfill for legacy audit_logs rows (only filling NULL/empty new metadata columns)
UPDATE `audit_logs`
SET
    `category` = CASE UPPER(TRIM(`action`))
        WHEN 'WALKIN_BOOKING' THEN 'TD'
        WHEN 'RECURRING_CREATE' THEN 'TD'
        WHEN 'STAFF_CREATE' THEN 'TD'
        WHEN 'ADD_SERVICE' THEN 'TD'
        WHEN 'ADD_OVERTIME' THEN 'TD'
        WHEN 'MAINTENANCE_ADD' THEN 'TD'
        WHEN 'INVENTORY_RESTOCK' THEN 'TD'
        WHEN 'SHIFT_OPEN' THEN 'TD'
        WHEN 'OPEN_SHIFT' THEN 'TD'
        WHEN 'SHIFT_CONFIRM' THEN 'TD'
        WHEN 'APPROVE_DEPOSIT' THEN 'TD'
        WHEN 'CONFIRM_DEPOSIT' THEN 'TD'
        WHEN 'MATCHMAKING_MODERATE' THEN 'TD'
        WHEN 'RESTORE_BOOKING' THEN 'TD'
        WHEN 'WAITLIST_ASSIGN' THEN 'TD'
        WHEN 'ENABLE_2FA' THEN 'TD'
        WHEN 'WEBHOOK_MATCH' THEN 'TD'
        WHEN 'RECONCILE_MANUAL' THEN 'TD'
        WHEN 'COMPLETE_BOOKING' THEN 'TD'
        WHEN 'EXPORT_REPORTS' THEN 'TD'
        WHEN 'PACKAGE_SAVE' THEN 'TD'
        WHEN 'VOUCHER_CREATE' THEN 'TD'
        WHEN 'AUDIT_REVIEW' THEN 'TD'
        WHEN 'VOUCHER_DELETE' THEN 'XH'
        WHEN 'GOLDEN_HOUR_DELETE' THEN 'XH'
        WHEN 'PACKAGE_DELETE' THEN 'XH'
        WHEN 'EXPENSE_DELETE' THEN 'XH'
        WHEN 'EXPENSE_ADD' THEN 'XH'
        WHEN 'CANCEL_BOOKING' THEN 'XH'
        WHEN 'EARLY_CANCEL' THEN 'XH'
        WHEN 'RECURRING_CANCEL' THEN 'XH'
        WHEN 'MATCHMAKING_CANCEL' THEN 'XH'
        WHEN 'WAITLIST_CANCEL' THEN 'XH'
        WHEN 'REJECT_DEPOSIT' THEN 'XH'
        WHEN 'DISABLE_2FA' THEN 'XH'
        WHEN 'WEBHOOK_UNDERPAID' THEN 'XH'
        WHEN 'SERVICE_DELETE' THEN 'XH'
        WHEN 'SAMPLE_DATA_CLEAN' THEN 'XH'
        WHEN 'COLLECT_PAYMENT' THEN 'TQ'
        WHEN 'COUNTER_SALE' THEN 'TQ'
        WHEN 'AUTO_CANCEL_EXPIRED' THEN 'TT'
        WHEN 'AUTO_CLOSE_PAST_BOOKINGS' THEN 'TT'
        WHEN 'AUTO_NOSHOW_15M' THEN 'TT'
        WHEN 'AUTO_NOSHOW_15M_UNPAID' THEN 'TT'
        WHEN 'CRON_IN_PLAY_UNPAID' THEN 'TT'
        WHEN 'RUN_REMINDERS' THEN 'TT'
        WHEN 'RUN_RECURRING_GEN' THEN 'TT'
        WHEN 'RECURRING_CRON_GENERATE' THEN 'TT'
        WHEN 'RECURRING_CONFLICT_SKIP' THEN 'TT'
        WHEN 'WAITLIST_HOLD_EXPIRED' THEN 'TT'
        WHEN 'CRON_COMPLETE_OVERDUE_IN_PLAY' THEN 'TT'
        WHEN 'ADMIN_RUN_AUTO_RELEASE' THEN 'TT'
        WHEN 'DATABASE_BACKUP' THEN 'TT'
        WHEN 'DB_BACKUP' THEN 'TT'
        WHEN 'TELEGRAM_TEST' THEN 'TT'
        WHEN 'SAMPLE_DATA_SEED' THEN 'TT'
        WHEN 'SHIFT_CLOSE' THEN 'CB'
        WHEN 'CLOSE_SHIFT' THEN 'CB'
        WHEN 'SHIFT_HANDOVER' THEN 'CB'
        WHEN 'SHIFT_EDIT_COUNT' THEN 'CB'
        WHEN 'WEBHOOK_OVERPAID' THEN 'CB'
        WHEN 'WEBHOOK_UNMATCHED' THEN 'CB'
        WHEN 'RECONCILE_RESOLVE' THEN 'CB'
        WHEN 'ADJUST_DISCOUNT' THEN 'CB'
        WHEN 'WALKIN_PAST_SLOT' THEN 'CB'
        WHEN 'RECURRING_SKIP_DATE' THEN 'CB'
        WHEN 'NOSHOW_RELEASE_SLOT' THEN 'CB'
        WHEN 'STAFF_ROLE_CHANGE' THEN 'CB'
        WHEN 'CHANGE_PASSWORD' THEN 'CB'
        WHEN 'STAFF_RESET_PASSWORD' THEN 'CB'
        WHEN 'FORGOT_PASSWORD_REQUEST' THEN 'CB'
        WHEN 'DB_BACKUP_DOWNLOAD' THEN 'CB'
        WHEN 'EXPORT_CSV' THEN 'CB'
        WHEN 'SENSITIVE_DATA_ACCESS' THEN 'CB'
        WHEN 'UPDATE_PRICING' THEN 'CN'
        WHEN 'UPDATE_PRICE' THEN 'CN'
        WHEN 'PRICE_UPDATE' THEN 'CN'
        WHEN 'EXPENSE_UPDATE' THEN 'CN'
        WHEN 'UPDATE_PAYMENT' THEN 'CN'
        WHEN 'CRM_UPDATE' THEN 'CN'
        WHEN 'CRM_CUSTOMER_UPDATE' THEN 'CN'
        WHEN 'UPDATE_MEMBER' THEN 'CN'
        WHEN 'UPDATE_PROFILE' THEN 'CN'
        WHEN 'UPDATE_FINANCE' THEN 'CN'
        WHEN 'USER_EDIT' THEN 'CN'
        WHEN 'ADJUST_POINTS' THEN 'CN'
        WHEN 'SERVICE_UPSERT' THEN 'CN'
        WHEN 'PITCH_UPSERT' THEN 'CN'
        WHEN 'GOLDEN_HOUR_SAVE' THEN 'CN'
        WHEN 'VOUCHER_SAVE' THEN 'CN'
        WHEN 'VOUCHER_UPDATE' THEN 'CN'
        WHEN 'VOUCHER_TOGGLE' THEN 'CN'
        WHEN 'VOUCHER_TOGGLE_STATUS' THEN 'CN'
        WHEN 'PACKAGE_TOGGLE' THEN 'CN'
        WHEN 'CHECKIN' THEN 'CN'
        WHEN 'TRANSFER_PITCH' THEN 'CN'
        WHEN 'BOOKING_BATCH_OP' THEN 'CN'
        WHEN 'RECURRING_BOOKING' THEN 'CN'
        WHEN 'PITCH_STATUS' THEN 'CN'
        WHEN 'PITCH_STATUS_TOGGLE' THEN 'CN'
        WHEN 'TOGGLE_PITCH' THEN 'CN'
        WHEN 'STAFF_STATUS_CHANGE' THEN 'CN'
        WHEN 'REVIEW_STATUS' THEN 'CN'
        WHEN 'REVIEW_REPLY' THEN 'CN'
        WHEN 'WAITLIST_NOTIFIED' THEN 'CN'
        WHEN 'MAINTENANCE_UPDATE' THEN 'CN'
        WHEN 'UPDATE_SETTINGS' THEN 'CN'
        WHEN 'SYSTEM_SETTINGS' THEN 'CN'
        WHEN 'UPDATE_INFO' THEN 'CN'
        ELSE 'CN'
    END,
    `data_group` = CASE UPPER(TRIM(`action`))
        WHEN 'SHIFT_OPEN' THEN 'Ca trực'
        WHEN 'OPEN_SHIFT' THEN 'Ca trực'
        WHEN 'SHIFT_CLOSE' THEN 'Ca trực'
        WHEN 'CLOSE_SHIFT' THEN 'Ca trực'
        WHEN 'SHIFT_CONFIRM' THEN 'Ca trực'
        WHEN 'SHIFT_HANDOVER' THEN 'Ca trực'
        WHEN 'SHIFT_EDIT_COUNT' THEN 'Ca trực'
        WHEN 'COLLECT_PAYMENT' THEN 'Tiền & đặt cọc'
        WHEN 'COUNTER_SALE' THEN 'Tiền & đặt cọc'
        WHEN 'ADJUST_DISCOUNT' THEN 'Tiền & đặt cọc'
        WHEN 'UPDATE_PAYMENT' THEN 'Tiền & đặt cọc'
        WHEN 'UPDATE_FINANCE' THEN 'Tiền & đặt cọc'
        WHEN 'RECONCILE_MANUAL' THEN 'Tiền & đặt cọc'
        WHEN 'RECONCILE_RESOLVE' THEN 'Tiền & đặt cọc'
        WHEN 'WEBHOOK_MATCH' THEN 'Tiền & đặt cọc'
        WHEN 'WEBHOOK_UNDERPAID' THEN 'Tiền & đặt cọc'
        WHEN 'WEBHOOK_OVERPAID' THEN 'Tiền & đặt cọc'
        WHEN 'WEBHOOK_UNMATCHED' THEN 'Tiền & đặt cọc'
        WHEN 'CONFIRM_DEPOSIT' THEN 'Tiền & đặt cọc'
        WHEN 'APPROVE_DEPOSIT' THEN 'Tiền & đặt cọc'
        WHEN 'REJECT_DEPOSIT' THEN 'Tiền & đặt cọc'
        WHEN 'EXPENSE_ADD' THEN 'Tiền & đặt cọc'
        WHEN 'EXPENSE_UPDATE' THEN 'Tiền & đặt cọc'
        WHEN 'EXPENSE_DELETE' THEN 'Tiền & đặt cọc'
        WHEN 'EXPORT_REPORTS' THEN 'Tiền & đặt cọc'
        WHEN 'ADJUST_POINTS' THEN 'Hội viên & điểm'
        WHEN 'CRM_CUSTOMER_UPDATE' THEN 'Hội viên & điểm'
        WHEN 'CRM_UPDATE' THEN 'Hội viên & điểm'
        WHEN 'UPDATE_MEMBER' THEN 'Hội viên & điểm'
        WHEN 'UPDATE_PROFILE' THEN 'Hội viên & điểm'
        WHEN 'USER_EDIT' THEN 'Hội viên & điểm'
        WHEN 'UPDATE_PRICING' THEN 'Giá & voucher'
        WHEN 'UPDATE_PRICE' THEN 'Giá & voucher'
        WHEN 'PRICE_UPDATE' THEN 'Giá & voucher'
        WHEN 'VOUCHER_SAVE' THEN 'Giá & voucher'
        WHEN 'VOUCHER_CREATE' THEN 'Giá & voucher'
        WHEN 'VOUCHER_UPDATE' THEN 'Giá & voucher'
        WHEN 'VOUCHER_DELETE' THEN 'Giá & voucher'
        WHEN 'VOUCHER_TOGGLE' THEN 'Giá & voucher'
        WHEN 'VOUCHER_TOGGLE_STATUS' THEN 'Giá & voucher'
        WHEN 'GOLDEN_HOUR_SAVE' THEN 'Giá & voucher'
        WHEN 'GOLDEN_HOUR_DELETE' THEN 'Giá & voucher'
        WHEN 'PACKAGE_SAVE' THEN 'Giá & voucher'
        WHEN 'PACKAGE_DELETE' THEN 'Giá & voucher'
        WHEN 'PACKAGE_TOGGLE' THEN 'Giá & voucher'
        WHEN 'WALKIN_BOOKING' THEN 'Sân & Lịch đặt'
        WHEN 'WALKIN_PAST_SLOT' THEN 'Sân & Lịch đặt'
        WHEN 'CHECKIN' THEN 'Sân & Lịch đặt'
        WHEN 'COMPLETE_BOOKING' THEN 'Sân & Lịch đặt'
        WHEN 'CANCEL_BOOKING' THEN 'Sân & Lịch đặt'
        WHEN 'EARLY_CANCEL' THEN 'Sân & Lịch đặt'
        WHEN 'RESTORE_BOOKING' THEN 'Sân & Lịch đặt'
        WHEN 'NOSHOW_RELEASE_SLOT' THEN 'Sân & Lịch đặt'
        WHEN 'TRANSFER_PITCH' THEN 'Sân & Lịch đặt'
        WHEN 'ADD_SERVICE' THEN 'Sân & Lịch đặt'
        WHEN 'ADD_OVERTIME' THEN 'Sân & Lịch đặt'
        WHEN 'BOOKING_BATCH_OP' THEN 'Sân & Lịch đặt'
        WHEN 'RECURRING_CREATE' THEN 'Sân & Lịch đặt'
        WHEN 'RECURRING_CANCEL' THEN 'Sân & Lịch đặt'
        WHEN 'RECURRING_SKIP_DATE' THEN 'Sân & Lịch đặt'
        WHEN 'RECURRING_BOOKING' THEN 'Sân & Lịch đặt'
        WHEN 'RECURRING_CRON_GENERATE' THEN 'Sân & Lịch đặt'
        WHEN 'RECURRING_CONFLICT_SKIP' THEN 'Sân & Lịch đặt'
        WHEN 'RUN_RECURRING_GEN' THEN 'Sân & Lịch đặt'
        WHEN 'WAITLIST_ASSIGN' THEN 'Sân & Lịch đặt'
        WHEN 'WAITLIST_CANCEL' THEN 'Sân & Lịch đặt'
        WHEN 'WAITLIST_NOTIFIED' THEN 'Sân & Lịch đặt'
        WHEN 'WAITLIST_HOLD_EXPIRED' THEN 'Sân & Lịch đặt'
        WHEN 'MATCHMAKING_MODERATE' THEN 'Sân & Lịch đặt'
        WHEN 'MATCHMAKING_CANCEL' THEN 'Sân & Lịch đặt'
        WHEN 'REVIEW_REPLY' THEN 'Sân & Lịch đặt'
        WHEN 'REVIEW_STATUS' THEN 'Sân & Lịch đặt'
        WHEN 'PITCH_STATUS' THEN 'Sân & Lịch đặt'
        WHEN 'PITCH_STATUS_TOGGLE' THEN 'Sân & Lịch đặt'
        WHEN 'TOGGLE_PITCH' THEN 'Sân & Lịch đặt'
        WHEN 'PITCH_UPSERT' THEN 'Sân & Lịch đặt'
        WHEN 'SERVICE_UPSERT' THEN 'Sân & Lịch đặt'
        WHEN 'SERVICE_DELETE' THEN 'Sân & Lịch đặt'
        WHEN 'INVENTORY_RESTOCK' THEN 'Sân & Lịch đặt'
        WHEN 'MAINTENANCE_ADD' THEN 'Sân & Lịch đặt'
        WHEN 'MAINTENANCE_UPDATE' THEN 'Sân & Lịch đặt'
        WHEN 'AUTO_CANCEL_EXPIRED' THEN 'Sân & Lịch đặt'
        WHEN 'AUTO_CLOSE_PAST_BOOKINGS' THEN 'Sân & Lịch đặt'
        WHEN 'AUTO_NOSHOW_15M' THEN 'Sân & Lịch đặt'
        WHEN 'AUTO_NOSHOW_15M_UNPAID' THEN 'Sân & Lịch đặt'
        WHEN 'CRON_IN_PLAY_UNPAID' THEN 'Sân & Lịch đặt'
        WHEN 'CRON_COMPLETE_OVERDUE_IN_PLAY' THEN 'Sân & Lịch đặt'
        WHEN 'ADMIN_RUN_AUTO_RELEASE' THEN 'Sân & Lịch đặt'
        WHEN 'RUN_REMINDERS' THEN 'Sân & Lịch đặt'
        WHEN 'UPDATE_SETTINGS' THEN 'Cài đặt'
        WHEN 'SYSTEM_SETTINGS' THEN 'Cài đặt'
        WHEN 'UPDATE_INFO' THEN 'Cài đặt'
        WHEN 'DATABASE_BACKUP' THEN 'Cài đặt'
        WHEN 'DB_BACKUP' THEN 'Cài đặt'
        WHEN 'TELEGRAM_TEST' THEN 'Cài đặt'
        WHEN 'SAMPLE_DATA_CLEAN' THEN 'Cài đặt'
        WHEN 'SAMPLE_DATA_SEED' THEN 'Cài đặt'
        WHEN 'STAFF_CREATE' THEN 'Nhân sự & Bảo mật'
        WHEN 'STAFF_ROLE_CHANGE' THEN 'Nhân sự & Bảo mật'
        WHEN 'STAFF_STATUS_CHANGE' THEN 'Nhân sự & Bảo mật'
        WHEN 'STAFF_RESET_PASSWORD' THEN 'Nhân sự & Bảo mật'
        WHEN 'CHANGE_PASSWORD' THEN 'Nhân sự & Bảo mật'
        WHEN 'FORGOT_PASSWORD_REQUEST' THEN 'Nhân sự & Bảo mật'
        WHEN 'ENABLE_2FA' THEN 'Nhân sự & Bảo mật'
        WHEN 'DISABLE_2FA' THEN 'Nhân sự & Bảo mật'
        WHEN 'DB_BACKUP_DOWNLOAD' THEN 'Nhân sự & Bảo mật'
        WHEN 'AUDIT_REVIEW' THEN 'Nhân sự & Bảo mật'
        WHEN 'EXPORT_CSV' THEN 'Nhân sự & Bảo mật'
        WHEN 'SENSITIVE_DATA_ACCESS' THEN 'Nhân sự & Bảo mật'
        ELSE 'Khác'
    END,
    `object_code` = COALESCE(
        NULLIF(LEFT(COALESCE(NULLIF(TRIM(`booking_id`), ''), NULLIF(TRIM(`target_id`), '')), 60), ''),
        CASE UPPER(TRIM(`action`))
            WHEN 'UPDATE_SETTINGS' THEN 'SETTINGS'
            WHEN 'UPDATE_PRICING' THEN 'PRICING'
            WHEN 'EXPORT_REPORTS' THEN 'REPORTS'
            WHEN 'DATABASE_BACKUP' THEN 'DB-BACKUP'
            WHEN 'DB_BACKUP' THEN 'DB-BACKUP'
            WHEN 'AUTO_CLOSE_PAST_BOOKINGS' THEN 'CRON-BOOKING'
            ELSE 'SYSTEM'
        END
    )
WHERE `category` IS NULL OR `category` = '' OR `data_group` IS NULL OR `data_group` = '' OR `object_code` IS NULL OR `object_code` = '';

UPDATE `audit_logs`
SET
    `is_anomaly` = CASE
        WHEN UPPER(TRIM(`action`)) IN ('ADJUST_POINTS', 'STAFF_ROLE_CHANGE', 'DISABLE_2FA', 'SHIFT_EDIT_COUNT') THEN 1
        WHEN UPPER(TRIM(`action`)) IN ('CANCEL_BOOKING', 'EARLY_CANCEL', 'NOSHOW_RELEASE_SLOT')
             AND (COALESCE(`old_value`, '') LIKE '%Đã cọc%' OR COALESCE(`old_value`, '') LIKE '%Đã thanh toán%' OR COALESCE(`new_value`, '') LIKE '%hoàn cọc%' OR COALESCE(`new_value`, '') LIKE '%Tịch thu cọc%') THEN 1
        WHEN COALESCE(`category`, '') <> 'TT' AND COALESCE(`actor_role`, '') <> 'system' AND HOUR(`created_at`) >= 0 AND HOUR(`created_at`) < 5 THEN 1
        ELSE `is_anomaly`
    END,
    `anomaly_reasons` = CASE
        WHEN UPPER(TRIM(`action`)) = 'ADJUST_POINTS' THEN '["Chỉnh điểm thủ công"]'
        WHEN UPPER(TRIM(`action`)) IN ('STAFF_ROLE_CHANGE', 'DISABLE_2FA') THEN '["Thay đổi quyền hoặc tắt 2FA"]'
        WHEN UPPER(TRIM(`action`)) = 'SHIFT_EDIT_COUNT' THEN '["Sửa số liệu kiểm đếm ca sau chốt"]'
        WHEN UPPER(TRIM(`action`)) IN ('CANCEL_BOOKING', 'EARLY_CANCEL', 'NOSHOW_RELEASE_SLOT')
             AND (COALESCE(`old_value`, '') LIKE '%Đã cọc%' OR COALESCE(`old_value`, '') LIKE '%Đã thanh toán%' OR COALESCE(`new_value`, '') LIKE '%hoàn cọc%' OR COALESCE(`new_value`, '') LIKE '%Tịch thu cọc%') THEN '["Hủy/hoàn cọc đơn đã có tiền"]'
        WHEN COALESCE(`category`, '') <> 'TT' AND COALESCE(`actor_role`, '') <> 'system' AND HOUR(`created_at`) >= 0 AND HOUR(`created_at`) < 5 THEN '["Thao tác trong khung 00:00–05:00"]'
        ELSE COALESCE(`anomaly_reasons`, '[]')
    END
WHERE `anomaly_reasons` IS NULL;
