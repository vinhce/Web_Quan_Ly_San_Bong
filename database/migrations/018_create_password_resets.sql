-- Migration 018: Tạo bảng password_resets phục vụ đặt lại mật khẩu (idempotent, MySQL 5.7+/8.0+)
-- Rollback an toàn (không xóa dữ liệu trực tiếp): tắt luồng đặt lại mật khẩu trước, sau đó lưu trữ bảng bằng RENAME TABLE `password_resets` TO `password_resets_archived_018`;

CREATE TABLE IF NOT EXISTS `password_resets` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `code_hash` CHAR(64) NOT NULL,
    `expires_at` DATETIME NOT NULL,
    `attempts` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `used_at` DATETIME DEFAULT NULL,
    `request_ip` VARCHAR(45) NOT NULL DEFAULT '',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_pw_reset_user_exp` (`user_id`, `expires_at`),
    INDEX `idx_pw_reset_created` (`created_at`),
    CONSTRAINT `fk_pw_resets_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

