-- Migration 023: Pure-SQL Inverted Index for Tab 11 Admin Audit Logs
-- Idempotent MySQL 8.x migration (non-destructive, UTF-8 accent-insensitive search)

CREATE TABLE IF NOT EXISTS `audit_search_tokens` (
    `token` VARCHAR(64) COLLATE utf8mb4_bin NOT NULL,
    `log_id` INT NOT NULL,
    PRIMARY KEY (`token`, `log_id`),
    INDEX `idx_ast_log_id` (`log_id`),
    CONSTRAINT `fk_ast_log` FOREIGN KEY (`log_id`) REFERENCES `audit_logs`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
