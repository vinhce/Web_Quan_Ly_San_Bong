-- ===============================================================
-- Migration 013: Tạo bảng points_log lưu vết biến động điểm hội viên
-- Đảm bảo UNIQUE(booking_id, reason) để mỗi đơn hoàn tất chỉ tích điểm 1 lần
-- ===============================================================

CREATE TABLE IF NOT EXISTS `points_log` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `booking_id` INT NULL,
  `delta` INT NOT NULL,
  `reason` VARCHAR(100) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_booking_reason` (`booking_id`, `reason`),
  INDEX `idx_user_created` (`user_id`, `created_at`),
  CONSTRAINT `fk_points_log_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
