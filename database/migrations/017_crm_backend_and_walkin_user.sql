-- ===============================================================
-- MIGRATION 017: CRM BACKEND, WALKIN SYSTEM USER & OPTIMISTIC LOCKING
-- Hệ thống: Quản Lý Sân Bóng Pro
-- Idempotent 100%: Chạy nhiều lần an toàn
-- ===============================================================

-- 1. Bổ sung role 'walkin' vào enum role của bảng users
ALTER TABLE `users` MODIFY COLUMN `role` ENUM('user', 'staff', 'manager', 'admin', 'walkin') NOT NULL DEFAULT 'user';

-- 2. Đảm bảo user hệ thống 'Khách lẻ' tồn tại với role='walkin' (không dùng để đăng nhập)
INSERT INTO `users` (`username`, `email`, `phone`, `full_name`, `password_hash`, `role`, `status`)
SELECT 'khachle', 'khachle@sanbongpro.local', '0000000000', 'Khách lẻ', '$argon2id$v=19$m=65536,t=4,p=1$DISABLED_NON_LOGIN$disabled', 'walkin', 'active'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM `users` WHERE `role` = 'walkin' OR `username` = 'khachle'
);

-- 3. Chuẩn hóa trạng thái trận hoàn thành: 'Hoàn thành' -> 'completed'
UPDATE `bookings` SET `status` = 'completed' WHERE `status` = 'Hoàn thành';

-- 4. Đính lại user_id cho các đơn đặt tại quầy bị gán nhầm sang admin/staff
UPDATE `bookings` b
INNER JOIN `users` u ON (b.user_id = u.id AND u.role IN ('admin', 'manager', 'staff'))
LEFT JOIN `users` real_u ON (
    REPLACE(REPLACE(REPLACE(real_u.phone, ' ', ''), '.', ''), '-', '') = REPLACE(REPLACE(REPLACE(b.phone, ' ', ''), '.', ''), '-', '')
    AND real_u.role = 'user'
)
SET b.user_id = COALESCE(real_u.id, (SELECT id FROM (SELECT id FROM `users` WHERE `role` = 'walkin' LIMIT 1) w))
WHERE b.user_id IS NOT NULL;

-- 5. Đảm bảo view admin_audit_logs trỏ tới audit_logs
CREATE OR REPLACE VIEW `admin_audit_logs` AS SELECT * FROM `audit_logs`;
