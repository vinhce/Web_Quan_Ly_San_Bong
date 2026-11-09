<?php

defined('SANBONG_APP') or define('SANBONG_APP', true);

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
    $markerFile = dirname(__DIR__) . '/logs/.schema_v4_ready';
    if (is_file($markerFile)) {
        return;
    }
    try {
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
