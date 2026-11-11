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

function ensureSchemaInitialized(PDO $pdo) {
    $markerFile = dirname(__DIR__) . '/logs/.schema_v8_stage4_ready';
    if (is_file($markerFile)) {
        return;
    }
    try {
        try {
            $pdo->exec("ALTER TABLE users MODIFY COLUMN role ENUM('user', 'staff', 'manager', 'admin') NOT NULL DEFAULT 'user'");
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
            "ALTER TABLE users MODIFY COLUMN role ENUM('user', 'staff', 'manager', 'admin') NOT NULL DEFAULT 'user'",
            "INSERT IGNORE INTO users (username, email, phone, full_name, password_hash, role, status) VALUES ('nhanvien', 'nhanvien@sanbongpro.vn', '0352000111', 'Nhân Viên Trực Sân Ca 1', '\$argon2id\$v=19\$m=65536,t=4,p=1\$QlFIYnZIRlNaV3Nic1JwUw\$dpni2Ou0GPfpjEfeFv47syHwOMDHcpxU0LmksbbT4HI', 'staff', 'active')",
            "UPDATE users SET role = 'staff' WHERE username = 'nhanvien' AND (role = '' OR role IS NULL)",
            "INSERT INTO users (username, email, phone, full_name, password_hash, role, status) VALUES ('quanly', 'quanly@sanbongpro.vn', '0352000222', 'Nguyễn Hoàng Minh (Quản Lý Sân)', '\$argon2id\$v=19\$m=65536,t=4,p=1\$QlFIYnZIRlNaV3Nic1JwUw\$dpni2Ou0GPfpjEfeFv47syHwOMDHcpxU0LmksbbT4HI', 'manager', 'active') ON DUPLICATE KEY UPDATE email = VALUES(email), phone = VALUES(phone), full_name = VALUES(full_name), password_hash = VALUES(password_hash), role = 'manager', status = 'active'",
            "CREATE TABLE IF NOT EXISTS `settings` (`setting_key` VARCHAR(100) PRIMARY KEY, `setting_value` TEXT NOT NULL, `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "INSERT IGNORE INTO `settings` (`setting_key`, `setting_value`) VALUES ('deposit_rate', '30'), ('bank_name', 'MBBank'), ('bank_code', 'MB'), ('bank_account', '0352313548'), ('bank_holder', 'NGUYEN QUANG VINH'), ('hotline', '0352 313 548'), ('open_hours', '05:30 - 23:00 hàng ngày (kể cả Lễ, Tết)'), ('price_p5_base', '250000'), ('price_p5_peak', '350000'), ('price_p5_weekend', '380000'), ('price_p7_base', '450000'), ('price_p7_peak', '650000'), ('price_p7_weekend', '700000'), ('price_p11_base', '900000'), ('price_p11_peak', '1200000'), ('price_p11_weekend', '1400000'), ('hold_minutes', '15'), ('refund_full_hours', '24'), ('refund_partial_hours', '4'), ('auto_cancel_enabled', '1')",
            "ALTER TABLE `pitches` ADD COLUMN `weekend_price` INT NOT NULL DEFAULT 0 AFTER `peak_price`",
            "UPDATE `pitches` SET `weekend_price` = 380000 WHERE `type` = 5 AND `weekend_price` = 0",
            "UPDATE `pitches` SET `weekend_price` = 700000 WHERE `type` = 7 AND `weekend_price` = 0",
            "UPDATE `pitches` SET `weekend_price` = 1400000 WHERE `type` = 11 AND `weekend_price` = 0",
            "ALTER TABLE `bookings` ADD COLUMN `weeks_count` INT NOT NULL DEFAULT 1 AFTER `payment_method`",
            "ALTER TABLE `bookings` ADD COLUMN `booking_mode` VARCHAR(20) NOT NULL DEFAULT 'single' AFTER `weeks_count`",
            "ALTER TABLE `bookings` MODIFY COLUMN `payment_status` VARCHAR(50) NOT NULL DEFAULT 'Chờ duyệt cọc'",
            "CREATE TABLE IF NOT EXISTS `audit_logs` (`id` INT AUTO_INCREMENT PRIMARY KEY, `user_id` INT NULL DEFAULT NULL, `actor_name` VARCHAR(100) NULL DEFAULT NULL, `actor_role` VARCHAR(20) NULL DEFAULT NULL, `action` VARCHAR(80) NOT NULL, `booking_id` VARCHAR(40) NULL DEFAULT NULL, `old_value` TEXT NULL DEFAULT NULL, `new_value` TEXT NULL DEFAULT NULL, `ip` VARCHAR(45) NOT NULL DEFAULT '127.0.0.1', `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX `idx_audit_user` (`user_id`), INDEX `idx_audit_action` (`action`), INDEX `idx_audit_booking` (`booking_id`), INDEX `idx_audit_created` (`created_at`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "CREATE TABLE IF NOT EXISTS `shifts` (`id` INT AUTO_INCREMENT PRIMARY KEY, `staff_id` INT NOT NULL, `staff_name` VARCHAR(100) NOT NULL DEFAULT '', `start_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `end_time` DATETIME NULL DEFAULT NULL, `cash_total` INT NOT NULL DEFAULT 0, `transfer_total` INT NOT NULL DEFAULT 0, `actual_cash_received` INT NULL DEFAULT NULL, `discrepancy_amount` INT NULL DEFAULT NULL, `note` TEXT NULL DEFAULT NULL, `admin_note` TEXT NULL DEFAULT NULL, `status` ENUM('open', 'closed', 'confirmed') NOT NULL DEFAULT 'open', `confirmed_by` INT NULL DEFAULT NULL, `confirmed_at` DATETIME NULL DEFAULT NULL, INDEX `idx_shifts_staff` (`staff_id`), INDEX `idx_shifts_status` (`status`), INDEX `idx_shifts_start` (`start_time`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "CREATE TABLE IF NOT EXISTS `service_sales` (`id` INT AUTO_INCREMENT PRIMARY KEY, `service_id` VARCHAR(30) NOT NULL, `service_name` VARCHAR(150) NOT NULL, `quantity` INT NOT NULL DEFAULT 1, `unit_price` INT NOT NULL DEFAULT 0, `total_amount` INT NOT NULL DEFAULT 0, `payment_method` VARCHAR(50) NOT NULL DEFAULT 'Tiền mặt tại quầy', `booking_code` VARCHAR(40) NULL DEFAULT NULL, `staff_id` INT NULL DEFAULT NULL, `note` VARCHAR(255) NULL DEFAULT NULL, `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX `idx_srv_sales_created` (`created_at`), INDEX `idx_srv_sales_staff` (`staff_id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "ALTER TABLE `extra_services` ADD COLUMN `stock_qty` INT NOT NULL DEFAULT 100",
            "ALTER TABLE `extra_services` ADD COLUMN `min_stock_warning` INT NOT NULL DEFAULT 10",
            "ALTER TABLE `extra_services` ADD COLUMN `track_inventory` TINYINT(1) NOT NULL DEFAULT 1",
            "ALTER TABLE `extra_services` ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1",
            "UPDATE `extra_services` SET `track_inventory` = 0 WHERE `id` = 'SRV-REF'",
            "UPDATE `extra_services` SET `track_inventory` = 1, `stock_qty` = 80, `min_stock_warning` = 10 WHERE `id` IN ('SRV-WATER', 'SRV-WATER-BOTTLE', 'SRV-BIB', 'SRV-BALL') AND `stock_qty` = 100",
            "ALTER TABLE `pitches` MODIFY COLUMN `status` VARCHAR(30) NOT NULL DEFAULT 'Hoạt động'",
            "CREATE TABLE IF NOT EXISTS `bank_transactions` (`id` INT AUTO_INCREMENT PRIMARY KEY, `sepay_tx_id` VARCHAR(80) NULL DEFAULT NULL, `tx_fingerprint` VARCHAR(64) NOT NULL, `gateway` VARCHAR(50) NOT NULL DEFAULT 'SePay', `reference_code` VARCHAR(100) NULL DEFAULT NULL, `transaction_content` TEXT NOT NULL, `detected_booking_code` VARCHAR(40) NULL DEFAULT NULL, `matched_booking_code` VARCHAR(40) NULL DEFAULT NULL, `transfer_amount` INT NOT NULL DEFAULT 0, `expected_amount` INT NOT NULL DEFAULT 0, `discrepancy_amount` INT NOT NULL DEFAULT 0, `match_status` ENUM('matched', 'underpaid', 'overpaid', 'unmatched', 'resolved', 'ignored') NOT NULL DEFAULT 'unmatched', `mismatch_reason` VARCHAR(255) NULL DEFAULT NULL, `raw_payload` LONGTEXT NULL DEFAULT NULL, `resolved_by` INT NULL DEFAULT NULL, `resolved_note` VARCHAR(255) NULL DEFAULT NULL, `transaction_date` DATETIME NULL DEFAULT NULL, `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `resolved_at` DATETIME NULL DEFAULT NULL, UNIQUE KEY `uniq_sepay_tx_id` (`sepay_tx_id`), UNIQUE KEY `uniq_tx_fingerprint` (`tx_fingerprint`), INDEX `idx_bank_tx_status` (`match_status`), INDEX `idx_bank_tx_code` (`detected_booking_code`), INDEX `idx_bank_tx_created` (`created_at`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "ALTER TABLE `bookings` ADD COLUMN `expires_at` DATETIME NULL DEFAULT NULL AFTER `created_at`",
            "ALTER TABLE `bookings` ADD COLUMN `paid_amount` INT NOT NULL DEFAULT 0 AFTER `deposit_amount`",
            "ALTER TABLE `bookings` ADD COLUMN `cancel_policy_applied` VARCHAR(50) NULL DEFAULT NULL AFTER `payment_method`",
            "ALTER TABLE `bookings` ADD COLUMN `refund_amount` INT NOT NULL DEFAULT 0 AFTER `cancel_policy_applied`",
            "ALTER TABLE `bookings` ADD INDEX `idx_bookings_expires` (`expires_at`)",
            "UPDATE `bookings` SET `paid_amount` = `total_price` WHERE `payment_status` IN ('Đã thanh toán đủ', 'Đã thanh toán 100%') AND `paid_amount` = 0",
            "UPDATE `bookings` SET `paid_amount` = `deposit_amount` WHERE `payment_status` = 'Đã cọc 30%' AND `paid_amount` = 0"
        ];
        foreach ($migrationStmts as $migSql) {
            try {
                $pdo->exec($migSql);
            } catch (PDOException $migEx) {
                error_log("[SCHEMA MIGRATION ERROR] " . $migEx->getMessage());
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
