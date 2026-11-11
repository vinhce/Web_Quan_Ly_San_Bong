-- ===============================================================
-- MIGRATION 006: GIAI ĐOẠN 7 - PHẢN HỒI VÀ ĐÁNH GIÁ KHÁCH HÀNG
-- Chạy lại an toàn (Idempotent)
-- 7.1 Đánh giá sau trận & Phản hồi (reviews)
-- ===============================================================

CREATE TABLE IF NOT EXISTS `reviews` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `booking_code` VARCHAR(40) NOT NULL UNIQUE,
    `pitch_id` VARCHAR(20) NOT NULL,
    `customer_name` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `rating` TINYINT NOT NULL COMMENT '1 đến 5 sao',
    `comment` TEXT NULL,
    `staff_reply` TEXT NULL,
    `reply_by` INT NULL DEFAULT NULL,
    `reply_at` DATETIME NULL DEFAULT NULL,
    `status` ENUM('published', 'hidden') NOT NULL DEFAULT 'published',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_reviews_pitch` FOREIGN KEY (`pitch_id`) REFERENCES `pitches`(`id`) ON DELETE CASCADE,
    INDEX `idx_reviews_pitch` (`pitch_id`, `status`),
    INDEX `idx_reviews_rating` (`rating`),
    INDEX `idx_reviews_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
