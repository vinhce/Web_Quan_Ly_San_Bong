-- ===============================================================
-- CƠ SỞ DỮ LIỆU SÂN BÓNG PRO (quan_ly_san_bong)
-- Tối ưu bảo mật, chỉ mục (indexes) & ràng buộc toàn vẹn dữ liệu
-- ===============================================================

CREATE DATABASE IF NOT EXISTS `quan_ly_san_bong` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `quan_ly_san_bong`;

-- 1. Bảng Người dùng & Phân quyền (Users & Auth)
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `phone` VARCHAR(20) NOT NULL,
    `full_name` VARCHAR(100) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    `status` ENUM('active', 'locked') NOT NULL DEFAULT 'active',
    `failed_attempts` INT NOT NULL DEFAULT 0,
    `lock_until` DATETIME NULL DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_users_role` (`role`),
    INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Bảng Danh mục Sân bóng (Pitches)
CREATE TABLE IF NOT EXISTS `pitches` (
    `id` VARCHAR(20) PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `type` INT NOT NULL COMMENT '5, 7 hoặc 11 người',
    `type_name` VARCHAR(50) NOT NULL,
    `size` VARCHAR(50) NOT NULL,
    `grass` VARCHAR(255) NOT NULL,
    `base_price` INT NOT NULL DEFAULT 0,
    `peak_price` INT NOT NULL DEFAULT 0,
    `status` ENUM('Hoạt động', 'Bảo trì') NOT NULL DEFAULT 'Hoạt động',
    `amenities_json` TEXT NULL,
    `variant` VARCHAR(50) NOT NULL DEFAULT 'standard',
    `description` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_pitches_type` (`type`),
    INDEX `idx_pitches_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Bảng Khung giờ đá (Time Slots)
CREATE TABLE IF NOT EXISTS `time_slots` (
    `id` VARCHAR(10) PRIMARY KEY,
    `slot_time` VARCHAR(50) NOT NULL,
    `start_time` VARCHAR(10) NOT NULL,
    `end_time` VARCHAR(10) NOT NULL,
    `is_peak` TINYINT(1) NOT NULL DEFAULT 0,
    `duration` DECIMAL(3,1) NOT NULL DEFAULT 1.0,
    INDEX `idx_slots_peak` (`is_peak`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Bảng Dịch vụ gia tăng (Extra Services)
CREATE TABLE IF NOT EXISTS `extra_services` (
    `id` VARCHAR(30) PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `price` INT NOT NULL DEFAULT 0,
    `unit` VARCHAR(30) NOT NULL,
    `icon` VARCHAR(30) NOT NULL DEFAULT 'droplet'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Bảng Mã giảm giá (Vouchers)
CREATE TABLE IF NOT EXISTS `vouchers` (
    `code` VARCHAR(30) PRIMARY KEY,
    `description` VARCHAR(255) NOT NULL,
    `discount_type` ENUM('percent', 'fixed') NOT NULL DEFAULT 'percent',
    `discount_value` INT NOT NULL DEFAULT 0,
    `min_order` INT NOT NULL DEFAULT 0,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Bảng Đơn đặt sân (Bookings) - Chống IDOR, Double Booking, Race Condition
CREATE TABLE IF NOT EXISTS `bookings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(40) NOT NULL UNIQUE,
    `user_id` INT NULL DEFAULT NULL,
    `customer_name` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `email` VARCHAR(100) NOT NULL DEFAULT 'khachhang@sanbongpro.vn',
    `pitch_id` VARCHAR(20) NOT NULL,
    `booking_date` DATE NOT NULL,
    `slot_id` VARCHAR(10) NOT NULL,
    `slot_time` VARCHAR(50) NOT NULL,
    `services_json` TEXT NULL,
    `voucher_code` VARCHAR(30) NULL DEFAULT NULL,
    `total_price` INT NOT NULL DEFAULT 0,
    `deposit_amount` INT NOT NULL DEFAULT 0,
    `remaining_amount` INT NOT NULL DEFAULT 0,
    `status` VARCHAR(50) NOT NULL DEFAULT 'Đã xác nhận',
    `payment_status` ENUM('Chờ duyệt cọc', 'Đã cọc 30%', 'Đã thanh toán đủ', 'Tịch thu cọc 30%', 'Đã hủy') NOT NULL DEFAULT 'Chờ duyệt cọc',
    `payment_method` VARCHAR(50) NOT NULL DEFAULT 'VietQR Chuyển khoản',
    `note` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_bookings_pitch` FOREIGN KEY (`pitch_id`) REFERENCES `pitches`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_bookings_slot` FOREIGN KEY (`slot_id`) REFERENCES `time_slots`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_bookings_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_pitch_date_slot` (`pitch_id`, `booking_date`, `slot_id`),
    INDEX `idx_bookings_user` (`user_id`),
    INDEX `idx_bookings_date` (`booking_date`),
    INDEX `idx_bookings_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Bảng Rate Limiting (Chống Brute Force, DoS nhẹ)
CREATE TABLE IF NOT EXISTS `rate_limits` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `ip_address` VARCHAR(45) NOT NULL,
    `action` VARCHAR(50) NOT NULL,
    `attempts` INT NOT NULL DEFAULT 1,
    `last_attempt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_ip_action` (`ip_address`, `action`),
    INDEX `idx_rate_limits_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===============================================================
-- DỮ LIỆU MẪU BAN ĐẦU (SEED DATA)
-- ===============================================================

-- 1. Tài khoản mặc định: Admin và User (Mật khẩu hash bằng Argon2id)
INSERT INTO `users` (`id`, `username`, `email`, `phone`, `full_name`, `password_hash`, `role`, `status`)
VALUES 
(1, 'admin', 'admin@sanbongpro.vn', '0987654321', 'Ban Quản Trị Sân', '$argon2id$v=19$m=65536,t=4,p=1$SUpYZlUyT2FoY0V4L3NsVg$4E1a7uqFzUM7/odFJ1d4jg23P6cc0hH4SrTPDI2zUEU', 'admin', 'active'),
(2, 'user', 'khachhang@sanbongpro.vn', '0352313548', 'Trần Minh Hoàng', '$argon2id$v=19$m=65536,t=4,p=1$aVNqalJJSE5FMVN4b2YvaQ$7HiLuSfwNyejQCN9iT24mOGZiIpajMBrxFpY01kbgq4', 'user', 'active'),
(3, 'vxyen0801', 'vxyen0801@sanbongpro.vn', '0352313548', 'Quản Trị Viên (vxyen0801)', '$argon2id$v=19$m=65536,t=4,p=1$UThRTGkvdndJYXdBVHBDUg$bvWQoJidWljt12fhtDaAYPay1LhfDvc1B2+5jPEkPE4', 'admin', 'active')
ON DUPLICATE KEY UPDATE `password_hash`=VALUES(`password_hash`), `role`=VALUES(`role`), `status`=VALUES(`status`);

-- 2. Dữ liệu Sân bóng
INSERT INTO `pitches` (`id`, `name`, `type`, `type_name`, `size`, `grass`, `base_price`, `peak_price`, `status`, `amenities_json`, `variant`, `description`)
VALUES
('P5-A', 'Sân 5 - Sân A', 5, 'Sân 5 người', '20m x 40m', 'Cỏ nhân tạo kim cương FIFA Quality Pro, đệm hạt cao su EPDM êm ái', 250000, 350000, 'Hoạt động', '["Đèn LED 400W chống chói", "Bãi đỗ ô tô & xe máy", "Nước suối miễn phí", "Phòng thay đồ & tắm nóng lạnh", "Wifi tốc độ cao", "Trọng tài theo yêu cầu"]', 'standard', 'Sân 5 chuẩn thi đấu mini, vị trí gần khán đài và khu dịch vụ tiện lợi.'),
('P5-B', 'Sân 5 - Sân B', 5, 'Sân 5 người', '20m x 40m', 'Cỏ nhân tạo monofilament cao cấp 50mm, thoát nước nhanh sau mưa', 250000, 350000, 'Hoạt động', '["Đèn LED 400W chống chói", "Bãi đỗ xe máy", "Nước suối", "Phòng thay đồ", "Wifi"]', 'bright', 'Sân 5 thoáng mát, trang bị lưới chắn bóng cao cấp quanh sân an toàn.'),
('P7-A', 'Sân 7 - Sân A (Trung tâm)', 7, 'Sân 7 người', '30m x 50m', 'Cỏ sợi đan mật độ cao, giảm thiểu trầy xước khi va chạm tối đa', 450000, 650000, 'Hoạt động', '["Hệ thống chiếu sáng 8 trụ LED", "Bãi xe ô tô rộng", "Phòng tắm nóng lạnh riêng", "Khu kỹ thuật khán đài", "Wifi", "Hỗ trợ quay phát Highlight"]', 'deep', 'Sân 7 trung tâm chuyên tổ chức giải đấu phong trào và giao hữu câu lạc bộ.'),
('P7-B', 'Sân 7 - Sân B', 7, 'Sân 7 người', '30m x 50m', 'Cỏ nhân tạo 5cm tiêu chuẩn quốc tế, hạt cao su đàn hồi cao', 400000, 600000, 'Hoạt động', '["Đèn LED công suất lớn", "Bãi đỗ xe ô tô", "Phòng thay đồ & tắm", "Nước suối miễn phí", "Wifi"]', 'twin', 'Sân 7 liền kề khu căng tin phục vụ nước giải khát và đồ ăn nhẹ.'),
('P7-C', 'Sân 7 - Sân C (Bảo trì cỏ)', 7, 'Sân 7 người', '30m x 50m', 'Đang nâng cấp mặt cỏ nhân tạo thế hệ mới', 400000, 600000, 'Bảo trì', '["Đèn LED", "Bãi xe", "Phòng thay đồ"]', 'muted', 'Sân đang trong giai đoạn nâng cấp bảo dưỡng mặt cỏ định kỳ.'),
('P11-GH', 'Sân 11 - Sân Ghép (A+B)', 11, 'Sân 11 người', '60m x 90m', 'Ghép từ 2 sân 7 chuẩn, cỏ đồng bộ phẳng tuyệt đối', 800000, 1200000, 'Hoạt động', '["Hệ thống đèn 12 cột chuẩn thi đấu", "Phòng họp đội bóng", "Bãi đỗ xe lớn", "Phòng tắm nóng lạnh", "Trọng tài VFF hỗ trợ"]', 'hero', 'Sân 11 ghép kích thước chuẩn giải phong trào lớn, đáp ứng thi đấu đỉnh cao.'),
('P5-C', 'Sân 5 - Sân C (Mới)', 5, 'Sân 5 người', '20m x 40m', 'Cỏ nhân tạo thế hệ 4 EvoFiber 60mm, chống nóng, hạt EPDM chính hãng', 280000, 380000, 'Hoạt động', '["Đèn LED 500W siêu sáng", "Bãi đỗ xe ô tô & xe máy", "Nước suối miễn phí", "Phòng thay đồ có máy lạnh", "Wifi 5G", "Camera an ninh 24/7"]', 'bright', 'Sân 5 mới nhất khu phức hợp, trang bị hiện đại nhất với cỏ thế hệ 4 chống nóng.'),
('P7-D', 'Sân 7 - Sân D (VIP)', 7, 'Sân 7 người', '32m x 52m', 'Cỏ lai tổng hợp Hybrid SIS (60% nhân tạo + 40% tự nhiên) chuẩn FIFA Quality Pro', 500000, 750000, 'Hoạt động', '["Hệ thống chiếu sáng 10 cột LED 1000W", "Phòng VIP khán đài có điều hòa", "Màn hình tỷ số điện tử", "Dịch vụ phát Livestream", "Bãi xe ô tô riêng", "Trọng tài VFF cấp 1"]', 'deep', 'Sân 7 VIP cao cấp nhất cụm, dành cho giải phong trào lớn và sự kiện thể thao doanh nghiệp.'),
('P5-D', 'Sân 5 - Sân D (Khán Đài Đông)', 5, 'Sân 5 người', '20m x 40m', 'Cỏ nhân tạo kim cương FIFA Quality Pro, hạt cao su EPDM êm chân', 250000, 350000, 'Hoạt động', '["Đèn LED 400W chống chói", "Bãi đỗ ô tô & xe máy", "Nước suối miễn phí", "Phòng thay đồ & tắm nóng lạnh", "Wifi tốc độ cao"]', 'standard', 'Sân 5 liền kề khu vực khán đài Đông, trang bị dàn đèn LED hiện đại và lưới chắn an toàn.'),
('P5-E', 'Sân 5 - Sân E (Mini VIP)', 5, 'Sân 5 người', '20m x 40m', 'Cỏ nhân tạo sợi gân kép đàn hồi giảm sốc tối đa, chống lật sơ mi', 280000, 380000, 'Hoạt động', '["Đèn LED 500W siêu sáng", "Bãi đỗ xe ô tô", "Phòng thay đồ có máy lạnh", "Wifi 5G", "Camera an ninh 24/7"]', 'bright', 'Sân 5 Mini VIP cỏ nhân tạo mềm mại, vị trí trung tâm tiện lợi cho các trận giao lưu thân hữu.'),
('P5-F', 'Sân 5 - Sân F (Trẻ Trung)', 5, 'Sân 5 người', '20m x 40m', 'Cỏ nhân tạo monofilament cao cấp 50mm, thoát nước nhanh sau mưa', 250000, 350000, 'Hoạt động', '["Đèn LED 400W chống chói", "Bãi xe máy", "Nước suối", "Phòng thay đồ", "Wifi"]', 'standard', 'Sân 5 tiêu chuẩn thi đấu nhanh, không gian thoáng đãng phù hợp giao hữu nhóm và câu lạc bộ trẻ.'),
('P7-E', 'Sân 7 - Sân E (Mặt Cỏ SIS)', 7, 'Sân 7 người', '30m x 50m', 'Cỏ lai tổng hợp Hybrid SIS Grass đàn hồi cao cấp chống trượt va chạm', 450000, 650000, 'Hoạt động', '["Hệ thống 8 trụ đèn LED 600W", "Bãi đỗ xe ô tô rộng", "Phòng tắm nóng lạnh riêng", "Khu kỹ thuật khán đài", "Wifi", "Hỗ trợ quay Highlight"]', 'deep', 'Sân 7 mặt cỏ công nghệ SIS chuẩn quốc tế, kiểm soát bóng tối ưu cho các trận cầu đỉnh cao.'),
('P7-F', 'Sân 7 - Sân F (Khán Đài B)', 7, 'Sân 7 người', '30m x 50m', 'Cỏ nhân tạo 50mm nhập khẩu Hà Lan, đệm êm ái chống ma sát', 420000, 620000, 'Hoạt động', '["Đèn LED công suất cao", "Khán đài B có mái che", "Phòng thay đồ & tắm", "Nước suối miễn phí", "Wifi"]', 'twin', 'Sân 7 cạnh khán đài B có mái che, trang bị cabin huấn luyện viên và khu khởi động riêng.'),
('P7-G', 'Sân 7 - Sân G (Đèn LED Pro)', 7, 'Sân 7 người', '30m x 50m', 'Cỏ sợi kim cương đệm hạt cao su nguyên sinh thân thiện môi trường', 420000, 620000, 'Hoạt động', '["Hệ thống chiếu sáng LED Pro 800W", "Bãi đỗ xe", "Phòng thay đồ", "Wifi tốc độ cao"]', 'bright', 'Sân 7 trang bị dàn đèn LED cao cấp 800W, thi đấu buổi tối cực rõ nét và không bị lóa mắt.'),
('P11-A', 'Sân 11 - Sân Tiêu Chuẩn Quốc Gia', 11, 'Sân 11 người', '68m x 105m', 'Kích thước chuẩn FIFA 68m x 105m, mặt cỏ tiêu chuẩn thi đấu chuyên nghiệp', 900000, 1400000, 'Hoạt động', '["Dàn đèn 12 cột chuẩn thi đấu quốc tế", "Khán đài 500 chỗ ngồi", "Phòng họp chiến thuật", "Bãi xe lớn", "Trọng tài VFF hỗ trợ"]', 'hero', 'Sân 11 chuẩn kích thước FIFA 68m x 105m, đáp ứng tổ chức các giải bóng đá chuyên nghiệp và phong trào quy mô lớn.'),
('P11-B', 'Sân 11 - Sân Ghép (C+D)', 11, 'Sân 11 người', '60m x 90m', 'Ghép linh hoạt từ 2 sân 7 C và D, cỏ đồng bộ phẳng tuyệt đối', 800000, 1200000, 'Hoạt động', '["Đèn LED 1000W", "Phòng thay đồ riêng", "Bãi đỗ xe ô tô", "Nước uống miễn phí", "Phát sóng trực tiếp"]', 'hero', 'Sân 11 ghép từ cụm sân 7 C và D, mặt sân đồng đều êm ái cho các giải đấu cúp.'),
('P11-C', 'Sân 11 - Sân Trung Tâm VFF', 11, 'Sân 11 người', '68m x 105m', 'Mặt cỏ FIFA Quality Pro và bảng tỷ số điện tử LED hiện đại', 950000, 1500000, 'Hoạt động', '["Dàn đèn LED 1200W chuyên dụng truyền hình", "Bảng tỷ số điện tử", "Phòng thay đồ máy lạnh", "Khán đài VIP", "Camera Livestream đa góc"]', 'hero', 'Sân 11 trung tâm hiện đại nhất hệ thống, tích hợp hệ thống bảng tỷ số LED và livestream đa góc máy phục vụ các giải đấu tranh cúp đỉnh cao.')
ON DUPLICATE KEY UPDATE `name`=`name`;

-- 3. Dữ liệu Khung giờ
INSERT INTO `time_slots` (`id`, `slot_time`, `start_time`, `end_time`, `is_peak`, `duration`)
VALUES
('S01', '05:30 - 06:30', '05:30', '06:30', 0, 1.0),
('S02', '06:30 - 07:30', '06:30', '07:30', 0, 1.0),
('S03', '07:30 - 08:30', '07:30', '08:30', 0, 1.0),
('S04', '08:30 - 09:30', '08:30', '09:30', 0, 1.0),
('S05', '09:30 - 10:30', '09:30', '10:30', 0, 1.0),
('S06', '14:00 - 15:00', '14:00', '15:00', 0, 1.0),
('S07', '15:00 - 16:00', '15:00', '16:00', 0, 1.0),
('S08', '16:00 - 17:00', '16:00', '17:00', 0, 1.0),
('S09', '17:00 - 18:00', '17:00', '18:00', 1, 1.0),
('S10', '17:30 - 19:00', '17:30', '19:00', 1, 1.5),
('S11', '18:00 - 19:00', '18:00', '19:00', 1, 1.0),
('S12', '19:00 - 20:00', '19:00', '20:00', 1, 1.0),
('S13', '19:00 - 20:30', '19:00', '20:30', 1, 1.5),
('S14', '20:00 - 21:00', '20:00', '21:00', 1, 1.0),
('S15', '20:30 - 22:00', '20:30', '22:00', 1, 1.5),
('S16', '21:00 - 22:00', '21:00', '22:00', 0, 1.0),
('S17', '21:00 - 22:30', '21:00', '22:30', 0, 1.5),
('S18', '22:00 - 23:00', '22:00', '23:00', 0, 1.0)
ON DUPLICATE KEY UPDATE `slot_time`=`slot_time`;

-- 4. Dịch vụ phụ trợ
INSERT INTO `extra_services` (`id`, `name`, `price`, `unit`, `icon`)
VALUES
('SRV-WATER', 'Nước suối đóng chai (Thùng 24 chai Aquafina)', 120000, 'thùng', 'droplet'),
('SRV-WATER-BOTTLE', 'Nước suối lẻ Aquafina 500ml', 10000, 'chai', 'droplet'),
('SRV-BIB', 'Áo bib chia đội (Bộ 10 áo màu dạ quang)', 30000, 'bộ/trận', 'shirt'),
('SRV-BALL', 'Thuê bóng Động Lực FIFA Quality', 20000, 'quả/trận', 'ball'),
('SRV-REF', 'Trọng tài chuyên nghiệp bắt trận', 150000, 'trận', 'flag')
ON DUPLICATE KEY UPDATE `name`=`name`;

-- 5. Mã giảm giá
INSERT INTO `vouchers` (`code`, `description`, `discount_type`, `discount_value`, `min_order`, `is_active`)
VALUES
('WELCOME10', 'Giảm 10% tổng đơn cho khách hàng mới', 'percent', 10, 0, 1),
('GIAM50K', 'Giảm ngay 50.000đ cho đơn đặt sân từ 500.000đ', 'fixed', 50000, 500000, 1),
('VIPGOLD', 'Giảm 15% cho thành viên Vàng & Kim Cương', 'percent', 15, 300000, 1)
ON DUPLICATE KEY UPDATE `description`=`description`;
