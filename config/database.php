<?php

defined('SANBONG_APP') or define('SANBONG_APP', true);
date_default_timezone_set('Asia/Ho_Chi_Minh');

function loadEnv($path = null) {
    if ($path === null) {
        $outsidePath = dirname(__DIR__, 2) . '/.env';
        $insidePath = dirname(__DIR__) . '/.env';
        $path = file_exists($outsidePath) ? $outsidePath : $insidePath;
    }
    if (!file_exists($path)) {
        return;
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || strpos($line, '#') === 0) {
            continue;
        }
        if (strpos($line, '=') !== false) {
            list($key, $val) = explode('=', $line, 2);
            $key = trim($key);
            $val = trim($val, " \t\n\r\0\x0B\"'");
            if (!array_key_exists($key, $_ENV)) {
                putenv("$key=$val");
                $_ENV[$key] = $val;
                $_SERVER[$key] = $val;
            }
        }
    }
}

loadEnv();

function getDBConnection($fatalOnFail = true) {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $host = getenv('DB_HOST') ?: '127.0.0.1';
    $port = getenv('DB_PORT') ?: '3306';
    $dbname = getenv('DB_NAME') ?: 'quan_ly_san_bong';
    $user = getenv('DB_USER') ?: 'root';
    $pass = getenv('DB_PASS') !== false ? getenv('DB_PASS') : '';

    $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4";

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
    ];

    try {
        $pdo = new PDO($dsn, $user, $pass, $options);
        try {
            $pdo->exec("SET time_zone = '+07:00'");
        } catch (PDOException $tzEx) {
        }
        ensureSchemaInitialized($pdo);
        return $pdo;
    } catch (PDOException $e) {
        error_log("[DB CONNECTION ERROR] " . $e->getMessage());

        if (!$fatalOnFail) {
            return null;
        }

        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'message' => 'Lỗi kết nối cơ sở dữ liệu hệ thống. Vui lòng thử lại sau.',
            'ref_code' => 'ERR_DB_CONNECT'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

function ensureColumnExists(PDO $pdo, string $table, string $column, string $definition): void {
    try {
        $chk = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?");
        $chk->execute([$table, $column]);
        if ((int)$chk->fetchColumn() === 0) {
            $pdo->exec("ALTER TABLE `{$table}` ADD COLUMN `{$column}` {$definition}");
        }
    } catch (PDOException $e) {
        error_log("[SCHEMA ADD COL ERROR {$table}.{$column}] " . $e->getMessage());
    }
}

function ensureIndexExists(PDO $pdo, string $table, string $indexName, string $columnExpr): void {
    try {
        $chk = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?");
        $chk->execute([$table, $indexName]);
        if ((int)$chk->fetchColumn() === 0) {
            $pdo->exec("ALTER TABLE `{$table}` ADD INDEX `{$indexName}` ({$columnExpr})");
        }
    } catch (PDOException $e) {
        error_log("[SCHEMA ADD IDX ERROR {$table}.{$indexName}] " . $e->getMessage());
    }
}

function ensurePasswordResetsTable(PDO $pdo): void {
    $v19Marker = dirname(__DIR__) . '/logs/.schema_v19_password_resets_ready';
    if (is_file($v19Marker)) {
        return;
    }
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS `password_resets` (`id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, `user_id` INT NOT NULL, `code_hash` CHAR(64) NOT NULL, `expires_at` DATETIME NOT NULL, `attempts` TINYINT UNSIGNED NOT NULL DEFAULT 0, `used_at` DATETIME DEFAULT NULL, `request_ip` VARCHAR(45) NOT NULL DEFAULT '', `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX `idx_pw_reset_user_exp` (`user_id`, `expires_at`), INDEX `idx_pw_reset_created` (`created_at`), CONSTRAINT `fk_pw_resets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        $logDir = dirname($v19Marker);
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0755, true);
        }
        @file_put_contents($v19Marker, date('c'));
    } catch (PDOException $e) {
        error_log("[SCHEMA V19 ERROR] " . $e->getMessage());
    }
}

function ensureBookingIdempotencySchema(PDO $pdo): void {
    $v21Marker = dirname(__DIR__) . '/logs/.schema_v21_idempotency_ready';
    if (is_file($v21Marker)) {
        return;
    }
    try {
        ensureColumnExists($pdo, 'bookings', 'idempotency_key', 'VARCHAR(64) NULL DEFAULT NULL AFTER `code`');
        $chk = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND INDEX_NAME = 'uniq_booking_idempotency'");
        $chk->execute();
        if ((int)$chk->fetchColumn() === 0) {
            $pdo->exec("ALTER TABLE `bookings` ADD UNIQUE INDEX `uniq_booking_idempotency` (`idempotency_key`)");
        }
        ensureIndexExists($pdo, 'bookings', 'idx_bookings_date_status', '`booking_date`, `status`');
        ensureIndexExists($pdo, 'bookings', 'idx_bookings_pitch_date', '`pitch_id`, `booking_date`');
        $logDir = dirname($v21Marker);
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0755, true);
        }
        @file_put_contents($v21Marker, date('c'));
    } catch (PDOException $e) {
        error_log("[SCHEMA V21 ERROR] " . $e->getMessage());
    }
}

function ensureSchemaInitialized(PDO $pdo) {
    ensurePasswordResetsTable($pdo);
    ensureBookingIdempotencySchema($pdo);
    $markerFile = dirname(__DIR__) . '/logs/.schema_v18_full_sync_ready';
    if (is_file($markerFile)) {
        return;
    }
    try {
        try {
            $pdo->exec("ALTER TABLE users MODIFY COLUMN role ENUM('user', 'staff', 'manager', 'admin', 'walkin') NOT NULL DEFAULT 'user'");
        } catch (PDOException $preMigEx) {
            error_log("[SCHEMA PRE-MIGRATION ERROR] " . $preMigEx->getMessage());
        }
        $schemaPath = dirname(__DIR__) . '/database/schema.sql';
        if (!is_file($schemaPath)) {
            return;
        }
        $sql = file_get_contents($schemaPath);

        $sql = preg_replace('/^\s*--.*$/m', '', $sql);
        $sql = preg_replace('/^\s*(CREATE\s+DATABASE|USE)\s+.*?;?\s*$/im', '', $sql);
        $statements = preg_split('/;\s*(?:[\r\n]+|$)/', $sql);
        foreach ($statements as $stmt) {
            $stmt = trim($stmt);
            if ($stmt !== '') {
                try {
                    $pdo->exec($stmt);
                } catch (PDOException $innerEx) {
                    error_log("[SCHEMA STMT ERROR] " . $innerEx->getMessage());
                }
            }
        }
        $migrationStmts = [
            "ALTER TABLE users MODIFY COLUMN role ENUM('user', 'staff', 'manager', 'admin', 'walkin') NOT NULL DEFAULT 'user'",
            "INSERT IGNORE INTO users (username, email, phone, full_name, password_hash, role, status) VALUES ('nhanvien', 'nhanvien@sanbongpro.vn', '0352000111', 'Nhân Viên Trực Sân Ca 1', '\$argon2id\$v=19\$m=65536,t=4,p=1\$QlFIYnZIRlNaV3Nic1JwUw\$dpni2Ou0GPfpjEfeFv47syHwOMDHcpxU0LmksbbT4HI', 'staff', 'active')",
            "UPDATE users SET role = 'staff' WHERE username = 'nhanvien' AND (role = '' OR role IS NULL)",
            "INSERT IGNORE INTO users (username, email, phone, full_name, password_hash, role, status) VALUES ('quanly', 'quanly@sanbongpro.vn', '0352000222', 'Nguyễn Hoàng Minh (Quản Lý Sân)', '\$argon2id\$v=19\$m=65536,t=4,p=1\$QlFIYnZIRlNaV3Nic1JwUw\$dpni2Ou0GPfpjEfeFv47syHwOMDHcpxU0LmksbbT4HI', 'manager', 'active')",
            "CREATE TABLE IF NOT EXISTS `settings` (`setting_key` VARCHAR(100) PRIMARY KEY, `setting_value` TEXT NOT NULL, `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "INSERT IGNORE INTO `settings` (`setting_key`, `setting_value`) VALUES ('deposit_rate', '30'), ('bank_name', 'MBBank'), ('bank_code', 'MB'), ('bank_account', '0352313548'), ('bank_holder', 'NGUYEN QUANG VINH'), ('hotline', '0352 313 548'), ('open_hours', '05:30 - 22:30 hàng ngày (kể cả Lễ, Tết)'), ('price_p5_base', '250000'), ('price_p5_peak', '350000'), ('price_p5_weekend', '380000'), ('price_p7_base', '450000'), ('price_p7_peak', '650000'), ('price_p7_weekend', '700000'), ('price_p11_base', '900000'), ('price_p11_peak', '1200000'), ('price_p11_weekend', '1400000'), ('hold_minutes', '15'), ('refund_full_hours', '24'), ('refund_partial_hours', '4'), ('auto_cancel_enabled', '1')",
            "CREATE TABLE IF NOT EXISTS `audit_logs` (`id` INT AUTO_INCREMENT PRIMARY KEY, `user_id` INT NULL DEFAULT NULL, `actor_name` VARCHAR(100) NULL DEFAULT NULL, `actor_role` VARCHAR(20) NULL DEFAULT NULL, `action` VARCHAR(80) NOT NULL, `booking_id` VARCHAR(40) NULL DEFAULT NULL, `old_value` TEXT NULL DEFAULT NULL, `new_value` TEXT NULL DEFAULT NULL, `ip` VARCHAR(45) NOT NULL DEFAULT '127.0.0.1', `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX `idx_audit_user` (`user_id`), INDEX `idx_audit_action` (`action`), INDEX `idx_audit_booking` (`booking_id`), INDEX `idx_audit_created` (`created_at`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "CREATE TABLE IF NOT EXISTS `shifts` (`id` INT AUTO_INCREMENT PRIMARY KEY, `staff_id` INT NOT NULL, `staff_name` VARCHAR(100) NOT NULL DEFAULT '', `start_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `end_time` DATETIME NULL DEFAULT NULL, `cash_total` INT NOT NULL DEFAULT 0, `transfer_total` INT NOT NULL DEFAULT 0, `actual_cash_received` INT NULL DEFAULT NULL, `discrepancy_amount` INT NULL DEFAULT NULL, `note` TEXT NULL DEFAULT NULL, `admin_note` TEXT NULL DEFAULT NULL, `status` ENUM('open', 'closed', 'confirmed') NOT NULL DEFAULT 'open', `confirmed_by` INT NULL DEFAULT NULL, `confirmed_at` DATETIME NULL DEFAULT NULL, INDEX `idx_shifts_staff` (`staff_id`), INDEX `idx_shifts_status` (`status`), INDEX `idx_shifts_start` (`start_time`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "CREATE TABLE IF NOT EXISTS `service_sales` (`id` INT AUTO_INCREMENT PRIMARY KEY, `service_id` VARCHAR(30) NOT NULL, `service_name` VARCHAR(150) NOT NULL, `quantity` INT NOT NULL DEFAULT 1, `unit_price` INT NOT NULL DEFAULT 0, `total_amount` INT NOT NULL DEFAULT 0, `payment_method` VARCHAR(50) NOT NULL DEFAULT 'Tiền mặt tại quầy', `booking_code` VARCHAR(40) NULL DEFAULT NULL, `staff_id` INT NULL DEFAULT NULL, `note` VARCHAR(255) NULL DEFAULT NULL, `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX `idx_srv_sales_created` (`created_at`), INDEX `idx_srv_sales_staff` (`staff_id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "ALTER TABLE `pitches` MODIFY COLUMN `status` VARCHAR(30) NOT NULL DEFAULT 'Hoạt động'",
            "CREATE TABLE IF NOT EXISTS `bank_transactions` (`id` INT AUTO_INCREMENT PRIMARY KEY, `sepay_tx_id` VARCHAR(80) NULL DEFAULT NULL, `tx_fingerprint` VARCHAR(64) NOT NULL, `gateway` VARCHAR(50) NOT NULL DEFAULT 'SePay', `reference_code` VARCHAR(100) NULL DEFAULT NULL, `transaction_content` TEXT NOT NULL, `detected_booking_code` VARCHAR(40) NULL DEFAULT NULL, `matched_booking_code` VARCHAR(40) NULL DEFAULT NULL, `transfer_amount` INT NOT NULL DEFAULT 0, `expected_amount` INT NOT NULL DEFAULT 0, `discrepancy_amount` INT NOT NULL DEFAULT 0, `match_status` ENUM('matched', 'underpaid', 'overpaid', 'unmatched', 'resolved', 'ignored') NOT NULL DEFAULT 'unmatched', `mismatch_reason` VARCHAR(255) NULL DEFAULT NULL, `raw_payload` LONGTEXT NULL DEFAULT NULL, `resolved_by` INT NULL DEFAULT NULL, `resolved_note` VARCHAR(255) NULL DEFAULT NULL, `transaction_date` DATETIME NULL DEFAULT NULL, `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `resolved_at` DATETIME NULL DEFAULT NULL, UNIQUE KEY `uniq_sepay_tx_id` (`sepay_tx_id`), UNIQUE KEY `uniq_tx_fingerprint` (`tx_fingerprint`), INDEX `idx_bank_tx_status` (`match_status`), INDEX `idx_bank_tx_code` (`detected_booking_code`), INDEX `idx_bank_tx_created` (`created_at`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "ALTER TABLE `bookings` MODIFY COLUMN `payment_status` VARCHAR(50) NOT NULL DEFAULT 'Chờ duyệt cọc'",
            "CREATE TABLE IF NOT EXISTS `customer_crm` (`id` INT AUTO_INCREMENT PRIMARY KEY, `phone` VARCHAR(20) NOT NULL UNIQUE, `full_name` VARCHAR(100) NULL, `customer_tier` ENUM('standard', 'regular', 'vip', 'warning_noshow') NOT NULL DEFAULT 'standard', `admin_note` TEXT NULL, `is_blacklisted` TINYINT(1) NOT NULL DEFAULT 0, `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, INDEX `idx_crm_phone` (`phone`), INDEX `idx_crm_tier` (`customer_tier`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "CREATE TABLE IF NOT EXISTS `recurring_schedules` (`id` INT AUTO_INCREMENT PRIMARY KEY, `schedule_code` VARCHAR(40) NOT NULL UNIQUE, `customer_name` VARCHAR(100) NOT NULL, `phone` VARCHAR(20) NOT NULL, `user_id` INT NULL DEFAULT NULL, `pitch_id` VARCHAR(20) NOT NULL, `slot_id` VARCHAR(10) NOT NULL, `day_of_week` TINYINT NOT NULL, `start_date` DATE NOT NULL, `end_date` DATE NOT NULL, `weeks_count` INT NOT NULL DEFAULT 4, `is_open_ended` TINYINT(1) NOT NULL DEFAULT 0, `price_per_match` INT NOT NULL DEFAULT 0, `deposit_per_match` INT NOT NULL DEFAULT 0, `status` ENUM('active', 'paused', 'completed', 'cancelled') NOT NULL DEFAULT 'active', `note` TEXT NULL, `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX `idx_recurring_day` (`day_of_week`, `slot_id`), INDEX `idx_recurring_phone` (`phone`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "CREATE TABLE IF NOT EXISTS `waitlist` (`id` INT AUTO_INCREMENT PRIMARY KEY, `pitch_id` VARCHAR(20) NOT NULL, `booking_date` DATE NOT NULL, `slot_id` VARCHAR(10) NOT NULL, `customer_name` VARCHAR(100) NOT NULL, `phone` VARCHAR(20) NOT NULL, `user_id` INT NULL DEFAULT NULL, `status` ENUM('waiting', 'notified', 'converted', 'cancelled') NOT NULL DEFAULT 'waiting', `notified_at` DATETIME NULL DEFAULT NULL, `note` VARCHAR(255) NULL, `converted_booking_code` VARCHAR(40) NULL DEFAULT NULL, `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, INDEX `idx_waitlist_lookup` (`pitch_id`, `booking_date`, `slot_id`), INDEX `idx_waitlist_phone` (`phone`), INDEX `idx_waitlist_status` (`status`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "CREATE TABLE IF NOT EXISTS `golden_hour_rules` (`id` INT AUTO_INCREMENT PRIMARY KEY, `rule_name` VARCHAR(100) NOT NULL, `pitch_type` INT NULL DEFAULT NULL, `day_of_week` TINYINT NULL DEFAULT NULL, `slot_id` VARCHAR(10) NULL DEFAULT NULL, `price_adjustment_type` ENUM('fixed', 'percent_discount', 'percent_surcharge') NOT NULL DEFAULT 'fixed', `adjustment_value` INT NOT NULL DEFAULT 0, `description` VARCHAR(255) NULL, `is_active` TINYINT(1) NOT NULL DEFAULT 1, `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX `idx_golden_lookup` (`pitch_type`, `day_of_week`, `slot_id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "CREATE TABLE IF NOT EXISTS `matchmaking_posts` (`id` INT AUTO_INCREMENT PRIMARY KEY, `post_code` VARCHAR(40) NOT NULL UNIQUE, `user_id` INT NULL DEFAULT NULL, `team_name` VARCHAR(100) NOT NULL, `captain_name` VARCHAR(100) NOT NULL, `phone` VARCHAR(20) NOT NULL, `match_date` DATE NOT NULL, `slot_id` VARCHAR(10) NULL DEFAULT NULL, `slot_time` VARCHAR(50) NOT NULL, `pitch_id` VARCHAR(20) NULL DEFAULT NULL, `pitch_type` INT NOT NULL DEFAULT 7, `skill_level` ENUM('beginner', 'intermediate', 'advanced', 'all') NOT NULL DEFAULT 'intermediate', `fee_mode` ENUM('split_50_50', 'loser_pays', 'negotiable') NOT NULL DEFAULT 'split_50_50', `status` ENUM('pending', 'open', 'matched', 'closed', 'rejected') NOT NULL DEFAULT 'open', `opponent_team` VARCHAR(100) NULL DEFAULT NULL, `opponent_captain` VARCHAR(100) NULL DEFAULT NULL, `opponent_phone` VARCHAR(20) NULL DEFAULT NULL, `booking_code` VARCHAR(40) NULL DEFAULT NULL, `note` TEXT NULL, `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX `idx_match_date` (`match_date`), INDEX `idx_match_status` (`status`), INDEX `idx_match_type` (`pitch_type`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "ALTER TABLE `matchmaking_posts` MODIFY COLUMN `status` ENUM('pending', 'open', 'matched', 'closed', 'rejected') NOT NULL DEFAULT 'open'",
            "ALTER TABLE `matchmaking_posts` ADD COLUMN `updated_at` DATETIME NULL DEFAULT NULL",
            "INSERT IGNORE INTO `matchmaking_posts` (`post_code`, `team_name`, `captain_name`, `phone`, `match_date`, `slot_time`, `pitch_type`, `skill_level`, `fee_mode`, `status`, `note`) VALUES ('KEO-261112-E46E5', 'FC Bách Khoa Anh Em', 'Nguyễn Tiến Dũng', '0983123567', CURDATE(), '18:00 - 19:30', 7, 'intermediate', 'split_50_50', 'open', 'Đội văn phòng đá vui vẻ, giao lưu nước uống, không va chạm mạnh.'), ('KEO-261112-8CE41', 'FC Giao Lưu Thứ Năm', 'Lê Hoàng Nam', '0912345678', CURDATE(), '17:30 - 19:00', 7, 'beginner', 'split_50_50', 'open', 'Anh em cựu sinh viên thể dục nâng cao sức khỏe, kết thúc trận làm chầu bia.'), ('KEO-261112-56524', 'FC Thanh Xuân United', 'Trần Quang Huy', '0978345321', DATE_ADD(CURDATE(), INTERVAL 1 DAY), '19:30 - 21:00', 5, 'advanced', 'split_50_50', 'open', 'Tìm đội khá cứng giao hữu trước giải đấu quận, trọng tài sân bắt chuẩn.'), ('KEO-261112-0489B', 'FC Phủi Cầu Giấy', 'Vũ Đức Thịnh', '0904123890', DATE_ADD(CURDATE(), INTERVAL 1 DAY), '20:00 - 21:30', 5, 'all', 'loser_pays', 'open', 'Kèo giao hữu nhiệt huyết, thua trả toàn bộ tiền sân, có quay video trận đấu.')",
            "CREATE TABLE IF NOT EXISTS `notification_logs` (`id` INT AUTO_INCREMENT PRIMARY KEY, `booking_id` INT NULL DEFAULT NULL, `booking_code` VARCHAR(40) NULL DEFAULT NULL, `recipient` VARCHAR(100) NOT NULL, `channel` ENUM('telegram', 'zalo', 'sms', 'system') NOT NULL DEFAULT 'system', `event_type` VARCHAR(50) NOT NULL, `title` VARCHAR(255) NOT NULL, `content` TEXT NOT NULL, `status` ENUM('sent', 'failed', 'pending') NOT NULL DEFAULT 'sent', `response_payload` TEXT NULL, `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX `idx_notif_booking` (`booking_code`), INDEX `idx_notif_channel` (`channel`), INDEX `idx_notif_created` (`created_at`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "CREATE TABLE IF NOT EXISTS `pitch_maintenance` (`id` INT AUTO_INCREMENT PRIMARY KEY, `pitch_id` VARCHAR(20) NOT NULL, `start_date` DATE NOT NULL, `end_date` DATE NOT NULL, `start_time` VARCHAR(10) NOT NULL DEFAULT '05:30', `end_time` VARCHAR(10) NOT NULL DEFAULT '23:00', `reason` VARCHAR(255) NOT NULL, `status` ENUM('scheduled', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled', `created_by` INT NULL DEFAULT NULL, `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX `idx_maint_dates` (`pitch_id`, `start_date`, `end_date`), INDEX `idx_maint_status` (`status`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "CREATE TABLE IF NOT EXISTS `expenses` (`id` INT AUTO_INCREMENT PRIMARY KEY, `expense_code` VARCHAR(40) NOT NULL UNIQUE, `category` VARCHAR(50) NOT NULL, `category_name` VARCHAR(100) NOT NULL, `amount` INT NOT NULL DEFAULT 0, `expense_date` DATE NOT NULL, `payer_name` VARCHAR(100) NOT NULL DEFAULT 'Ban Quản Trị Sân', `staff_id` INT NULL DEFAULT NULL, `receipt_note` TEXT NULL, `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX `idx_expenses_date` (`expense_date`), INDEX `idx_expenses_cat` (`category`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "CREATE TABLE IF NOT EXISTS `reviews` (`id` INT AUTO_INCREMENT PRIMARY KEY, `booking_code` VARCHAR(40) NOT NULL UNIQUE, `pitch_id` VARCHAR(20) NOT NULL, `customer_name` VARCHAR(100) NOT NULL, `phone` VARCHAR(20) NOT NULL, `rating` TINYINT NOT NULL, `comment` TEXT NULL, `staff_reply` TEXT NULL, `reply_by` INT NULL DEFAULT NULL, `reply_at` DATETIME NULL DEFAULT NULL, `status` ENUM('published', 'hidden') NOT NULL DEFAULT 'published', `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX `idx_reviews_pitch` (`pitch_id`, `status`), INDEX `idx_reviews_rating` (`rating`), INDEX `idx_reviews_created` (`created_at`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "INSERT IGNORE INTO `settings` (`setting_key`, `setting_value`) VALUES ('waitlist_hold_minutes', '15'), ('matchmaking_enabled', '1'), ('matchmaking_require_approval', '0'), ('reminder_enabled', '1'), ('reminder_hours_before', '2'), ('customer_notify_enabled', '0'), ('customer_notify_webhook', ''), ('booking_confirm_template', 'Sân Bóng Pro xác nhận đơn {code}: Sân {pitch_name}, ngày {date} khung giờ {slot_time}. Tổng: {total_price}đ (Cọc: {deposit_amount}đ).'), ('reminder_template', 'Nhắc lịch đá bóng: Đội bạn có ca lúc {slot_time} hôm nay ({date}) tại {pitch_name}. Mã vé: {code}. Vui lòng đến trước 15 phút!'), ('telegram_notify_enabled', '0'), ('telegram_bot_token', ''), ('telegram_chat_id', ''), ('tg_event_new_booking', '1'), ('tg_event_cancel', '1'), ('tg_event_shift_diff', '1'), ('tg_event_unmatched_tx', '1'), ('tg_event_low_stock', '1'), ('tg_event_waitlist', '1'), ('tg_event_matchmaking', '1'), ('tg_event_review', '1'), ('loyalty_points_per_10k', '1'), ('loyalty_bottle_cost_points', '100'), ('privacy_policy_version', '1.0')",
            "CREATE TABLE IF NOT EXISTS `points_log` (`id` INT AUTO_INCREMENT PRIMARY KEY, `user_id` INT NOT NULL, `booking_id` INT NULL, `delta` INT NOT NULL, `reason` VARCHAR(255) NOT NULL, `admin_id` INT NULL DEFAULT NULL, `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, KEY `idx_points_user` (`user_id`, `created_at`), KEY `idx_points_admin` (`admin_id`), CONSTRAINT `fk_points_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "CREATE TABLE IF NOT EXISTS `password_resets` (`id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, `user_id` INT NOT NULL, `code_hash` CHAR(64) NOT NULL, `expires_at` DATETIME NOT NULL, `attempts` TINYINT UNSIGNED NOT NULL DEFAULT 0, `used_at` DATETIME DEFAULT NULL, `request_ip` VARCHAR(45) NOT NULL DEFAULT '', `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX `idx_pw_reset_user_exp` (`user_id`, `expires_at`), INDEX `idx_pw_reset_created` (`created_at`), CONSTRAINT `fk_pw_resets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        ];
        foreach ($migrationStmts as $migSql) {
            try {
                $pdo->exec($migSql);
            } catch (PDOException $migEx) {
                error_log("[SCHEMA MIGRATION ERROR] " . $migEx->getMessage());
            }
        }

        // 1. pitches
        ensureColumnExists($pdo, 'pitches', 'weekend_price', 'INT NOT NULL DEFAULT 0 AFTER `peak_price`');

        // 2. extra_services
        ensureColumnExists($pdo, 'extra_services', 'stock_qty', 'INT NOT NULL DEFAULT 100');
        ensureColumnExists($pdo, 'extra_services', 'min_stock_warning', 'INT NOT NULL DEFAULT 10');
        ensureColumnExists($pdo, 'extra_services', 'track_inventory', 'TINYINT(1) NOT NULL DEFAULT 1');
        ensureColumnExists($pdo, 'extra_services', 'is_active', 'TINYINT(1) NOT NULL DEFAULT 1');

        // 3. users (Bổ sung Đổi mật khẩu lần đầu, Tích điểm, Phân hạng, TOTP 2FA, Quyền riêng tư)
        ensureColumnExists($pdo, 'users', 'must_change_password', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER `status`');
        ensureColumnExists($pdo, 'users', 'points', 'INT NOT NULL DEFAULT 0 AFTER `status`');
        ensureColumnExists($pdo, 'users', 'customer_tier', "VARCHAR(30) NOT NULL DEFAULT 'standard' AFTER `points`");
        ensureColumnExists($pdo, 'users', 'totp_secret', 'VARCHAR(64) NULL DEFAULT NULL AFTER `customer_tier`');
        ensureColumnExists($pdo, 'users', 'totp_enabled', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER `totp_secret`');
        ensureColumnExists($pdo, 'users', 'privacy_consent_at', 'DATETIME NULL DEFAULT NULL AFTER `totp_enabled`');
        ensureIndexExists($pdo, 'users', 'idx_users_tier', '`customer_tier`');
        ensureIndexExists($pdo, 'users', 'idx_users_phone', '`phone`');

        // 4. vouchers (Giới hạn/người & Phân hạng)
        ensureColumnExists($pdo, 'vouchers', 'max_usage', 'INT NOT NULL DEFAULT 100 AFTER `min_order`');
        ensureColumnExists($pdo, 'vouchers', 'used_count', 'INT NOT NULL DEFAULT 0 AFTER `max_usage`');
        ensureColumnExists($pdo, 'vouchers', 'max_per_user', 'INT NOT NULL DEFAULT 1 AFTER `used_count`');
        ensureColumnExists($pdo, 'vouchers', 'valid_from', 'DATE NULL DEFAULT NULL AFTER `max_per_user`');
        ensureColumnExists($pdo, 'vouchers', 'valid_to', 'DATE NULL DEFAULT NULL AFTER `valid_from`');
        ensureColumnExists($pdo, 'vouchers', 'pitch_type_limit', 'INT NULL DEFAULT NULL AFTER `valid_to`');
        ensureColumnExists($pdo, 'vouchers', 'required_tier', 'VARCHAR(50) NULL DEFAULT NULL AFTER `pitch_type_limit`');

        // 5. bookings (Đầy đủ các cột từ các đợt trước + Tích điểm, Nước quà tặng, Quyền riêng tư)
        ensureColumnExists($pdo, 'bookings', 'services_json', 'TEXT NULL AFTER `slot_time`');
        ensureColumnExists($pdo, 'bookings', 'voucher_code', 'VARCHAR(30) NULL DEFAULT NULL AFTER `services_json`');
        ensureColumnExists($pdo, 'bookings', 'original_price', 'INT NOT NULL DEFAULT 0 AFTER `voucher_code`');
        ensureColumnExists($pdo, 'bookings', 'discount_amount', 'INT NOT NULL DEFAULT 0 AFTER `original_price`');
        ensureColumnExists($pdo, 'bookings', 'paid_amount', 'INT NOT NULL DEFAULT 0 AFTER `deposit_amount`');
        ensureColumnExists($pdo, 'bookings', 'remaining_amount', 'INT NOT NULL DEFAULT 0 AFTER `paid_amount`');
        ensureColumnExists($pdo, 'bookings', 'status', "VARCHAR(50) NOT NULL DEFAULT 'Đã xác nhận' AFTER `remaining_amount`");
        ensureIndexExists($pdo, 'bookings', 'idx_pitch_date_slot', '`pitch_id`, `booking_date`, `slot_id`');
        try {
            $uniqChk = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND INDEX_NAME = 'unique_pitch_date_slot'");
            $uniqChk->execute();
            if ((int)$uniqChk->fetchColumn() > 0) {
                $pdo->exec("ALTER TABLE `bookings` DROP INDEX `unique_pitch_date_slot`");
            }
        } catch (PDOException $idxEx) {
            error_log("[SCHEMA DROP LEGACY UNIQUE WARN] " . $idxEx->getMessage());
        }
        ensureColumnExists($pdo, 'bookings', 'cancel_policy_applied', 'VARCHAR(50) NULL DEFAULT NULL AFTER `payment_method`');
        ensureColumnExists($pdo, 'bookings', 'refund_amount', 'INT NOT NULL DEFAULT 0 AFTER `cancel_policy_applied`');
        ensureColumnExists($pdo, 'bookings', 'weeks_count', 'INT NOT NULL DEFAULT 1 AFTER `refund_amount`');
        ensureColumnExists($pdo, 'bookings', 'booking_mode', "VARCHAR(20) NOT NULL DEFAULT 'single' AFTER `weeks_count`");
        ensureColumnExists($pdo, 'bookings', 'recurring_schedule_id', 'INT NULL DEFAULT NULL AFTER `booking_mode`');
        ensureColumnExists($pdo, 'bookings', 'points_used', 'INT NOT NULL DEFAULT 0 AFTER `recurring_schedule_id`');
        ensureColumnExists($pdo, 'bookings', 'redeemed_bottles', 'INT NOT NULL DEFAULT 0 AFTER `points_used`');
        ensureColumnExists($pdo, 'bookings', 'points_awarded', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER `redeemed_bottles`');
        ensureColumnExists($pdo, 'bookings', 'gift_deducted', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER `points_awarded`');
        ensureColumnExists($pdo, 'bookings', 'privacy_consent_at', 'DATETIME NULL DEFAULT NULL AFTER `gift_deducted`');
        ensureColumnExists($pdo, 'bookings', 'expires_at', 'DATETIME NULL DEFAULT NULL AFTER `created_at`');
        ensureIndexExists($pdo, 'bookings', 'idx_bookings_expires', '`expires_at`');
        ensureIndexExists($pdo, 'bookings', 'idx_bookings_recurring', '`recurring_schedule_id`');
        ensureIndexExists($pdo, 'bookings', 'idx_bookings_user_points', '`user_id`, `points_awarded`');

        // 6. recurring_schedules & waitlist
        ensureColumnExists($pdo, 'recurring_schedules', 'is_open_ended', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER `weeks_count`');
        ensureColumnExists($pdo, 'waitlist', 'notified_at', 'DATETIME NULL DEFAULT NULL AFTER `status`');

        // 7. bank_transactions (Đối soát ngân hàng SePay VietQR)
        ensureColumnExists($pdo, 'bank_transactions', 'sepay_tx_id', 'VARCHAR(80) NULL DEFAULT NULL AFTER `id`');
        ensureColumnExists($pdo, 'bank_transactions', 'tx_fingerprint', 'VARCHAR(64) NOT NULL AFTER `sepay_tx_id`');
        ensureColumnExists($pdo, 'bank_transactions', 'gateway', "VARCHAR(50) NOT NULL DEFAULT 'SePay' AFTER `tx_fingerprint`");
        ensureColumnExists($pdo, 'bank_transactions', 'reference_code', 'VARCHAR(100) NULL DEFAULT NULL AFTER `gateway`');
        ensureColumnExists($pdo, 'bank_transactions', 'transaction_content', 'TEXT NOT NULL AFTER `reference_code`');
        ensureColumnExists($pdo, 'bank_transactions', 'detected_booking_code', 'VARCHAR(40) NULL DEFAULT NULL AFTER `transaction_content`');
        ensureColumnExists($pdo, 'bank_transactions', 'matched_booking_code', 'VARCHAR(40) NULL DEFAULT NULL AFTER `detected_booking_code`');
        ensureColumnExists($pdo, 'bank_transactions', 'transfer_amount', 'INT NOT NULL DEFAULT 0 AFTER `matched_booking_code`');
        ensureColumnExists($pdo, 'bank_transactions', 'expected_amount', 'INT NOT NULL DEFAULT 0 AFTER `transfer_amount`');
        ensureColumnExists($pdo, 'bank_transactions', 'discrepancy_amount', 'INT NOT NULL DEFAULT 0 AFTER `expected_amount`');
        ensureColumnExists($pdo, 'bank_transactions', 'match_status', "ENUM('matched', 'underpaid', 'overpaid', 'unmatched', 'resolved', 'ignored') NOT NULL DEFAULT 'unmatched' AFTER `discrepancy_amount`");
        ensureColumnExists($pdo, 'bank_transactions', 'mismatch_reason', 'VARCHAR(255) NULL DEFAULT NULL AFTER `match_status`');
        ensureColumnExists($pdo, 'bank_transactions', 'raw_payload', 'LONGTEXT NULL DEFAULT NULL AFTER `mismatch_reason`');
        ensureColumnExists($pdo, 'bank_transactions', 'resolved_by', 'INT NULL DEFAULT NULL AFTER `raw_payload`');
        ensureColumnExists($pdo, 'bank_transactions', 'resolved_note', 'VARCHAR(255) NULL DEFAULT NULL AFTER `resolved_by`');
        ensureColumnExists($pdo, 'bank_transactions', 'transaction_date', 'DATETIME NULL DEFAULT NULL AFTER `resolved_note`');
        ensureColumnExists($pdo, 'bank_transactions', 'created_at', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `transaction_date`');
        ensureColumnExists($pdo, 'bank_transactions', 'resolved_at', 'DATETIME NULL DEFAULT NULL AFTER `created_at`');
        ensureIndexExists($pdo, 'bank_transactions', 'idx_bank_tx_status', '`match_status`');
        ensureIndexExists($pdo, 'bank_transactions', 'idx_bank_tx_code', '`detected_booking_code`');
        ensureIndexExists($pdo, 'bank_transactions', 'idx_bank_tx_created', '`created_at`');

        // 8. shifts & bookings staff tracking
        ensureColumnExists($pdo, 'shifts', 'initial_cash', 'DECIMAL(12,2) NOT NULL DEFAULT 0');
        ensureColumnExists($pdo, 'shifts', 'actual_cash', 'DECIMAL(12,2) NULL DEFAULT NULL');
        ensureColumnExists($pdo, 'shifts', 'cash_discrepancy', 'DECIMAL(12,2) NOT NULL DEFAULT 0');
        ensureColumnExists($pdo, 'shifts', 'discrepancy_reason', 'TEXT NULL DEFAULT NULL');
        ensureColumnExists($pdo, 'bookings', 'staff_id', 'INT NULL DEFAULT NULL');
        ensureIndexExists($pdo, 'bookings', 'idx_bookings_staff', '`staff_id`');

        // 9. audit_logs, points_log, users expansion (Migration 015)
        ensureColumnExists($pdo, 'audit_logs', 'target_type', 'VARCHAR(50) NULL DEFAULT NULL AFTER `action`');
        ensureColumnExists($pdo, 'audit_logs', 'target_id', 'VARCHAR(50) NULL DEFAULT NULL AFTER `target_type`');
        ensureIndexExists($pdo, 'audit_logs', 'idx_audit_target', '`target_type`, `target_id`');
        ensureColumnExists($pdo, 'users', 'admin_note', 'TEXT NULL DEFAULT NULL AFTER `customer_tier`');
        ensureColumnExists($pdo, 'points_log', 'admin_id', 'INT NULL DEFAULT NULL AFTER `reason`');
        try {
            $pdo->exec("ALTER TABLE `points_log` MODIFY COLUMN `reason` VARCHAR(255) NOT NULL");
        } catch (Throwable $plModifyEx) {
            error_log("[SCHEMA POINTS_LOG MODIFY WARN] " . $plModifyEx->getMessage());
        }
        ensureIndexExists($pdo, 'points_log', 'idx_points_user', '`user_id`, `created_at`');
        ensureIndexExists($pdo, 'points_log', 'idx_points_admin', '`admin_id`');

        // 10. walkin role, walkin guest user & version (Migration 016 - 018)
        ensureColumnExists($pdo, 'users', 'version', 'INT NOT NULL DEFAULT 1 AFTER `updated_at`');

        $postUpdates = [
            "INSERT IGNORE INTO `pitches` (`id`, `name`, `type`, `type_name`, `size`, `grass`, `base_price`, `peak_price`, `weekend_price`, `status`, `amenities_json`, `variant`, `description`) VALUES
('P5-H', 'Sân 5 - Sân H', 5, 'Sân 5 người', '20m x 40m', 'Cỏ nhân tạo Monofilament 50mm, thoát nước nhanh sau mưa', 250000, 350000, 380000, 'Hoạt động', '[\"Đèn LED 400W chống chói\", \"Bãi đỗ ô tô & xe máy\", \"Nước suối miễn phí\", \"Phòng thay đồ\", \"Wifi\"]', 'standard', 'Sân 5 chất lượng cao, vị trí thoáng mát.'),
('P5-I', 'Sân 5 - Sân I', 5, 'Sân 5 người', '20m x 40m', 'Cỏ nhân tạo kim cương FIFA Quality Pro, đệm cao su EPDM', 250000, 350000, 380000, 'Hoạt động', '[\"Đèn LED 400W chống chói\", \"Bãi đỗ xe\", \"Phòng thay đồ\", \"Wifi\"]', 'bright', 'Sân 5 mới bổ sung mặt cỏ êm ái.'),
('P7-I', 'Sân 7 - Sân I', 7, 'Sân 7 người', '30m x 50m', 'Cỏ sợi đan mật độ cao chuẩn thi đấu phong trào', 450000, 650000, 700000, 'Hoạt động', '[\"Hệ thống chiếu sáng 8 trụ LED\", \"Bãi xe ô tô\", \"Phòng tắm nóng lạnh\", \"Wifi\"]', 'deep', 'Sân 7 khu khán đài C, đèn sáng rõ.'),
('P7-K', 'Sân 7 - Sân K', 7, 'Sân 7 người', '30m x 50m', 'Cỏ nhân tạo 5cm tiêu chuẩn quốc tế, đàn hồi êm', 450000, 650000, 700000, 'Hoạt động', '[\"Đèn LED công suất lớn\", \"Bãi đỗ xe\", \"Nước suối miễn phí\", \"Wifi\"]', 'twin', 'Sân 7 tiêu chuẩn mới cho các trận giao hữu.'),
('P11-E', 'Sân 11 - Sân E (Tiêu Chuẩn FIFA)', 11, 'Sân 11 người', '68m x 105m', 'Kích thước chuẩn FIFA 68m x 105m, cỏ tiêu chuẩn thi đấu quốc tế', 900000, 1200000, 1400000, 'Hoạt động', '[\"Dàn đèn 12 cột chuẩn thi đấu\", \"Khán đài có mái che\", \"Phòng họp chiến thuật\", \"Bãi xe lớn\"]', 'hero', 'Sân 11 tiêu chuẩn quốc tế tổ chức các giải đấu chuyên nghiệp.'),
('P11-F', 'Sân 11 - Sân F (Khu Nam)', 11, 'Sân 11 người', '68m x 105m', 'Mặt cỏ FIFA Quality Pro thoát nước ngầm hiện đại', 900000, 1200000, 1400000, 'Hoạt động', '[\"Dàn đèn LED 1200W\", \"Phòng thay đồ máy lạnh\", \"Khán đài\", \"Camera Livestream\"]', 'hero', 'Sân 11 khu Nam không gian rộng rãi cho các giải đấu cúp.')",
            "INSERT INTO `users` (`username`, `email`, `phone`, `full_name`, `password_hash`, `role`, `status`)
SELECT 'khachle', 'khachle@sanbongpro.local', '0000000000', 'Khách lẻ', '\$argon2id\$v=19\$m=65536,t=4,p=1\$DISABLED_NON_LOGIN\$disabled', 'walkin', 'active'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `users` WHERE `role` = 'walkin' OR `username` = 'khachle')",
            "CREATE OR REPLACE VIEW `admin_audit_logs` AS SELECT * FROM `audit_logs`",
            "UPDATE `users` SET `totp_enabled` = 0, `totp_secret` = NULL WHERE `totp_enabled` = 1 OR `totp_secret` IS NOT NULL",
            "UPDATE `bookings` SET `status` = 'completed' WHERE `status` = 'Hoàn thành'",
            "UPDATE `bookings` b
INNER JOIN `users` u ON (b.user_id = u.id AND u.role IN ('admin', 'manager', 'staff'))
LEFT JOIN `users` real_u ON (
    REPLACE(REPLACE(REPLACE(real_u.phone, ' ', ''), '.', ''), '-', '') = REPLACE(REPLACE(REPLACE(b.phone, ' ', ''), '.', ''), '-', '')
    AND real_u.role = 'user'
)
SET b.user_id = COALESCE(real_u.id, (SELECT id FROM (SELECT id FROM `users` WHERE `role` = 'walkin' LIMIT 1) w))
WHERE b.user_id IS NOT NULL",
            "UPDATE `pitches` SET `weekend_price` = 380000 WHERE `type` = 5 AND `weekend_price` = 0",
            "UPDATE `pitches` SET `weekend_price` = 700000 WHERE `type` = 7 AND `weekend_price` = 0",
            "UPDATE `pitches` SET `weekend_price` = 1400000 WHERE `type` = 11 AND `weekend_price` = 0",
            "UPDATE `extra_services` SET `track_inventory` = 0 WHERE `id` = 'SRV-REF'",
            "UPDATE `extra_services` SET `track_inventory` = 1, `stock_qty` = 80, `min_stock_warning` = 10 WHERE `id` IN ('SRV-WATER', 'SRV-WATER-BOTTLE', 'SRV-BIB', 'SRV-BALL') AND `stock_qty` = 100",
            "UPDATE `bookings` SET `paid_amount` = `total_price` WHERE `payment_status` IN ('Đã thanh toán đủ', 'Đã thanh toán 100%') AND `paid_amount` = 0",
            "UPDATE `bookings` SET `paid_amount` = `deposit_amount` WHERE `payment_status` = 'Đã cọc 30%' AND `paid_amount` = 0",
            "UPDATE `bookings` SET `original_price` = `total_price` WHERE `original_price` = 0 AND `total_price` > 0",
            "UPDATE `bookings` SET `status` = 'Đã hủy' WHERE `payment_status` IN ('Đã hủy', 'Tịch thu cọc 30%', 'Đã hoàn cọc 100%', 'Bảo lưu cọc 30%', 'Phạt 50% cọc') AND (`status` IS NULL OR `status` = '' OR `status` = 'Đã xác nhận')",
            "UPDATE `vouchers` SET `required_tier` = 'vip,regular' WHERE `code` = 'VIPGOLD' AND `required_tier` IS NULL",
            "UPDATE `vouchers` SET `max_per_user` = 1 WHERE `code` IN ('WELCOME10', 'SINHVIEN30K') AND (`max_per_user` IS NULL OR `max_per_user` = 0)",
            "UPDATE `vouchers` SET `max_per_user` = 1 WHERE `max_per_user` IS NULL OR `max_per_user` = 0",
            "UPDATE `users` u INNER JOIN `customer_crm` c ON u.phone = c.phone SET u.customer_tier = c.customer_tier WHERE u.customer_tier = 'standard' AND c.customer_tier != 'standard'",
            "DELETE FROM settings WHERE setting_key = 'security_totp_required_roles'",
        ];
        foreach ($postUpdates as $pu) {
            try {
                $pdo->exec($pu);
            } catch (PDOException $puEx) {
                error_log("[SCHEMA POST-UPDATE WARN] " . $puEx->getMessage());
            }
        }

        $countStmt = $pdo->query("SELECT COUNT(*) FROM pitches");
        if ($countStmt && (int)$countStmt->fetchColumn() > 0) {
            $logDir = dirname($markerFile);
            if (!is_dir($logDir)) {
                @mkdir($logDir, 0755, true);
            }
            @file_put_contents($markerFile, date('c'));
        }
    } catch (PDOException $e) {
        error_log("[SCHEMA INIT ERROR] " . $e->getMessage());
    }
}
