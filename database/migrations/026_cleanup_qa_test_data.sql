-- Migration 026: Cleanup QA Test Data (Bug 1.1)
-- Idempotent MySQL 8.0+ cleanup script removing ONLY the QA test records listed in the QA report.

SET @db_name := DATABASE();

-- 1. Optional booking_services table cleanup (guarded in case table does not exist in schema)
SET @has_booking_services := (
    SELECT COUNT(*)
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'booking_services'
);
SET @sql_del_bs := IF(
    @has_booking_services > 0,
    "DELETE FROM `booking_services` WHERE `booking_id` IN (SELECT `id` FROM `bookings` WHERE `code` IN ('ASFF696837','ASFF625476','ASFF930520','ASFF199932','ASFF364595','ASFF123031','ASFF660929','ASFF309424'))",
    'SELECT 1'
);
PREPARE stmt_del_bs FROM @sql_del_bs;
EXECUTE stmt_del_bs;
DEALLOCATE PREPARE stmt_del_bs;

-- 2. Child rows referencing the 8 QA test bookings
DELETE FROM `team_bill_splits`
WHERE `booking_id` IN (
    SELECT `id` FROM `bookings`
    WHERE `code` IN ('ASFF696837', 'ASFF625476', 'ASFF930520', 'ASFF199932', 'ASFF364595', 'ASFF123031', 'ASFF660929', 'ASFF309424')
);

DELETE FROM `service_sales`
WHERE `booking_code` IN ('ASFF696837', 'ASFF625476', 'ASFF930520', 'ASFF199932', 'ASFF364595', 'ASFF123031', 'ASFF660929', 'ASFF309424');

DELETE FROM `bank_transactions`
WHERE `matched_booking_code` IN ('ASFF696837', 'ASFF625476', 'ASFF930520', 'ASFF199932', 'ASFF364595', 'ASFF123031', 'ASFF660929', 'ASFF309424')
   OR `detected_booking_code` IN ('ASFF696837', 'ASFF625476', 'ASFF930520', 'ASFF199932', 'ASFF364595', 'ASFF123031', 'ASFF660929', 'ASFF309424');

DELETE FROM `reviews`
WHERE `booking_code` IN ('ASFF696837', 'ASFF625476', 'ASFF930520', 'ASFF199932', 'ASFF364595', 'ASFF123031', 'ASFF660929', 'ASFF309424');

DELETE FROM `points_log`
WHERE `booking_id` IN (
    SELECT `id` FROM `bookings`
    WHERE `code` IN ('ASFF696837', 'ASFF625476', 'ASFF930520', 'ASFF199932', 'ASFF364595', 'ASFF123031', 'ASFF660929', 'ASFF309424')
);

DELETE FROM `notification_logs`
WHERE `booking_code` IN ('ASFF696837', 'ASFF625476', 'ASFF930520', 'ASFF199932', 'ASFF364595', 'ASFF123031', 'ASFF660929', 'ASFF309424')
   OR `booking_id` IN (
       SELECT `id` FROM `bookings`
       WHERE `code` IN ('ASFF696837', 'ASFF625476', 'ASFF930520', 'ASFF199932', 'ASFF364595', 'ASFF123031', 'ASFF660929', 'ASFF309424')
   );

DELETE FROM `waitlist`
WHERE `converted_booking_code` IN ('ASFF696837', 'ASFF625476', 'ASFF930520', 'ASFF199932', 'ASFF364595', 'ASFF123031', 'ASFF660929', 'ASFF309424');

DELETE FROM `matchmaking_posts`
WHERE `booking_code` IN ('ASFF696837', 'ASFF625476', 'ASFF930520', 'ASFF199932', 'ASFF364595', 'ASFF123031', 'ASFF660929', 'ASFF309424');

-- 3. Remove the 8 QA test bookings
DELETE FROM `bookings`
WHERE `code` IN ('ASFF696837', 'ASFF625476', 'ASFF930520', 'ASFF199932', 'ASFF364595', 'ASFF123031', 'ASFF660929', 'ASFF309424');

-- 4. Remove QA test review id = 2 (guarded)
DELETE FROM `reviews`
WHERE `id` = 2 AND `comment` = 'test';

-- 5. Remove QA test vouchers
DELETE FROM `vouchers`
WHERE `code` IN ('TESTQA10', 'TESTQA50K', 'CLQABIG', 'CLQAPAR1', 'CLQAPAR2', 'CLQAPAR3', 'CLQAPAR4');

-- 6. Remove QA test pitch (P5-CLQA or [TEST]%) and its maintenance rows
DELETE FROM `pitch_maintenance`
WHERE `pitch_id` = 'P5-CLQA'
   OR `pitch_id` IN (SELECT `id` FROM `pitches` WHERE `name` LIKE '[TEST]%');

DELETE FROM `pitches`
WHERE `id` = 'P5-CLQA' OR `name` LIKE '[TEST]%';

-- 7. Remove QA test extra services ([TEST]%, e.g. '[TEST] Nước QA')
DELETE FROM `service_sales`
WHERE `service_id` IN (SELECT `id` FROM `extra_services` WHERE `name` LIKE '[TEST]%');

DELETE FROM `extra_services`
WHERE `name` LIKE '[TEST]%';
