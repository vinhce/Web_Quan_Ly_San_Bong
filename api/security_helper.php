<?php

require_once __DIR__ . '/../config/database.php';

ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
ini_set('log_errors', '1');

$logDir = __DIR__ . '/../logs';
if (!is_dir($logDir)) {
    @mkdir($logDir, 0750, true);
    
    @file_put_contents($logDir . '/.htaccess', "Deny from all\n");
}
ini_set('error_log', $logDir . '/php_errors.log');

function secure_session_start() {
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443)
            || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower($_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https')
            || (isset($_SERVER['HTTP_CF_VISITOR']) && strpos($_SERVER['HTTP_CF_VISITOR'], '"scheme":"https"') !== false);

    session_set_cookie_params([
        'lifetime' => 7200, 
        'path'     => '/',
        'domain'   => '',
        'secure'   => $isHttps,
        'httponly' => true, 
        'samesite' => 'Lax' 
    ]);

    ini_set('session.use_only_cookies', '1');
    ini_set('session.use_strict_mode', '1');
    ini_set('session.gc_maxlifetime', '7200');

    session_start();

    $now = time();
    $maxLifetime = 7200;

    if (isset($_SESSION['last_activity']) && ($now - $_SESSION['last_activity'] > $maxLifetime)) {
        session_unset();
        session_destroy();
        session_start();
    }
    $_SESSION['last_activity'] = $now;

    if (!isset($_SESSION['created_at'])) {
        $_SESSION['created_at'] = $now;
    } elseif ($now - $_SESSION['created_at'] > $maxLifetime) {
        
        session_regenerate_id(true);
        $_SESSION['created_at'] = $now;
    }

    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
}

function get_client_ip() {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    
    if (filter_var($ip, FILTER_VALIDATE_IP)) {
        return $ip;
    }
    return '127.0.0.1';
}

function check_rate_limit($pdo, $action, $maxAttempts = 5, $minutes = 15) {
    return true;
}

function increment_rate_limit($pdo, $action) {
    return;
}

function clear_rate_limit($pdo, $action) {
    return;
}

function verify_csrf_token() {
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf_token'] ?? '';
    if (empty($token) || empty($_SESSION['csrf_token'])) {
        return false;
    }
    return hash_equals($_SESSION['csrf_token'], $token);
}

function json_response($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: strict-origin-when-cross-origin');

    if (session_status() === PHP_SESSION_ACTIVE && !empty($_SESSION['csrf_token'])) {
        if (is_array($data)) {
            $data['csrf_token'] = $_SESSION['csrf_token'];
        }
    }

    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_error($message, $statusCode = 400, $refCode = 'ERR_GENERAL') {
    json_response([
        'success'  => false,
        'message'  => $message,
        'ref_code' => $refCode
    ], $statusCode);
}

function require_auth() {
    secure_session_start();
    if (empty($_SESSION['user_id'])) {
        json_response([
            'success'  => false,
            'message'  => 'Yêu cầu đăng nhập để thực hiện thao tác này.',
            'ref_code' => 'ERR_UNAUTHORIZED'
        ], 401);
    }
    return $_SESSION['user'];
}

function require_admin() {
    $user = require_auth();
    if (($user['role'] ?? '') !== 'admin') {
        
        error_log("[SECURITY ALERT] Phất hiện nỗ lực leo thang quyền admin từ user ID: " . ($user['id'] ?? 'unknown') . " | IP: " . get_client_ip());
        json_response([
            'success'  => false,
            'message'  => 'Bạn không có quyền hạn truy cập khu vực quản trị.',
            'ref_code' => 'ERR_FORBIDDEN'
        ], 403);
    }
    return $user;
}

function sanitize_string($str, $maxLength = 255) {
    if ($str === null) return '';
    $clean = trim((string)$str);
    $clean = strip_tags($clean);
    if (mb_strlen($clean) > $maxLength) {
        $clean = mb_substr($clean, 0, $maxLength);
    }
    return $clean;
}
