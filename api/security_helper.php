<?php
/**
 * SÂN BÓNG PRO - BỘ CÔNG CỤ BẢO MẬT TRUNG TÂM (api/security_helper.php)
 * Tuân thủ chuẩn bảo mật OWASP Web Security & security-web.md
 */

require_once __DIR__ . '/../config/database.php';

// Tắt hoàn toàn hiển thị lỗi ra ngoài màn hình client
ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
ini_set('log_errors', '1');

// Thư mục ghi log bảo mật
$logDir = __DIR__ . '/../logs';
if (!is_dir($logDir)) {
    @mkdir($logDir, 0750, true);
    // Chặn truy cập web vào thư mục logs
    @file_put_contents($logDir . '/.htaccess', "Deny from all\n");
}
ini_set('error_log', $logDir . '/php_errors.log');

/**
 * 1. Khởi động phiên làm việc bảo mật (Secure Session)
 * - HttpOnly, SameSite, Secure (khi HTTPS)
 * - Session Timeout: 2 giờ (cả không hoạt động lẫn tuyệt đối)
 */
function secure_session_start() {
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443)
            || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower($_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https')
            || (isset($_SERVER['HTTP_CF_VISITOR']) && strpos($_SERVER['HTTP_CF_VISITOR'], '"scheme":"https"') !== false);

    session_set_cookie_params([
        'lifetime' => 7200, // 2 giờ
        'path'     => '/',
        'domain'   => '',
        'secure'   => $isHttps,
        'httponly' => true, // Chống XSS đọc trộm cookie session
        'samesite' => 'Lax' // Chống CSRF
    ]);

    ini_set('session.use_only_cookies', '1');
    ini_set('session.use_strict_mode', '1');
    ini_set('session.gc_maxlifetime', '7200');

    session_start();

    // Kiểm tra hết hạn phiên tuyệt đối & phiên không hoạt động (2 giờ = 7200s)
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
        // Tái tạo ID sau thời gian tuyệt đối
        session_regenerate_id(true);
        $_SESSION['created_at'] = $now;
    }

    // Khởi tạo CSRF Token nếu chưa có
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
}

/**
 * 2. Lấy IP máy khách an toàn
 */
function get_client_ip() {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    // Kiểm tra format IP hợp lệ
    if (filter_var($ip, FILTER_VALIDATE_IP)) {
        return $ip;
    }
    return '127.0.0.1';
}

/**
 * 3. Giới hạn tần suất thao tác (Rate Limiting)
 * - Tối đa $maxAttempts lần sai trong $minutes phút (mặc định 5 lần / 15 phút)
 * - Hỗ trợ fallback file JSON khi $pdo === null
 */
function check_rate_limit($pdo, $action, $maxAttempts = 5, $minutes = 15) {
    if ($minutes > 60) {
        $minutes = (int)ceil($minutes / 60);
    }
    $ip = get_client_ip();

    if ($pdo !== null) {
        try {
            $decaySeconds = $minutes * 60;
            $stmt = $pdo->prepare("SELECT attempts, last_attempt FROM rate_limits WHERE ip_address = ? AND action = ?");
            $stmt->execute([$ip, $action]);
            $record = $stmt->fetch();

            if ($record) {
                $lastTime = strtotime($record['last_attempt']);
                if (time() - $lastTime < $decaySeconds) {
                    if ($record['attempts'] >= $maxAttempts) {
                        return false; // Đã vượt quá số lần cho phép
                    }
                } else {
                    // Hết thời gian phạt, reset lại số lần
                    $resetStmt = $pdo->prepare("UPDATE rate_limits SET attempts = 0, last_attempt = NOW() WHERE ip_address = ? AND action = ?");
                    $resetStmt->execute([$ip, $action]);
                }
            }
            return true;
        } catch (PDOException $e) {
            error_log("[RATE LIMIT DB FALLBACK] " . $e->getMessage());
        }
    }

    $rateFile = __DIR__ . '/../logs/rate_limits.json';
    $limits = [];
    if (file_exists($rateFile)) {
        $decoded = json_decode(@file_get_contents($rateFile), true);
        if (is_array($decoded)) {
            $limits = $decoded;
        }
    }
    $key = get_client_ip() . '|' . $action;
    if (isset($limits[$key])) {
        $lastAttempt = (int)($limits[$key]['last_attempt'] ?? 0);
        $attempts = (int)($limits[$key]['attempts'] ?? 0);
        if (time() - $lastAttempt >= $minutes * 60) {
            $attempts = 0;
            $limits[$key] = ['attempts' => 0, 'last_attempt' => time()];
            @file_put_contents($rateFile, json_encode($limits, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        }
        if ($attempts >= $maxAttempts) {
            json_error("Quá nhiều yêu cầu. Vui lòng thử lại sau {$minutes} phút.", 429, 'ERR_RATE_LIMITED');
            return false;
        }
    }
    return true;
}

function increment_rate_limit($pdo, $action) {
    $ip = get_client_ip();
    if ($pdo !== null) {
        try {
            $sql = "INSERT INTO rate_limits (ip_address, action, attempts, last_attempt) 
                    VALUES (?, ?, 1, NOW()) 
                    ON DUPLICATE KEY UPDATE attempts = attempts + 1, last_attempt = NOW()";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$ip, $action]);
            return;
        } catch (PDOException $e) {
            error_log("[RATE LIMIT INC DB FALLBACK] " . $e->getMessage());
        }
    }

    $rateFile = __DIR__ . '/../logs/rate_limits.json';
    $limits = [];
    if (file_exists($rateFile)) {
        $decoded = json_decode(@file_get_contents($rateFile), true);
        if (is_array($decoded)) {
            $limits = $decoded;
        }
    }
    $key = get_client_ip() . '|' . $action;
    $attempts = isset($limits[$key]['attempts']) ? (int)$limits[$key]['attempts'] : 0;
    $limits[$key] = [
        'attempts'     => $attempts + 1,
        'last_attempt' => time()
    ];
    @file_put_contents($rateFile, json_encode($limits, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function clear_rate_limit($pdo, $action) {
    $ip = get_client_ip();
    if ($pdo !== null) {
        try {
            $stmt = $pdo->prepare("DELETE FROM rate_limits WHERE ip_address = ? AND action = ?");
            $stmt->execute([$ip, $action]);
            return;
        } catch (PDOException $e) {
            error_log("[RATE LIMIT CLEAR DB FALLBACK] " . $e->getMessage());
        }
    }

    $rateFile = __DIR__ . '/../logs/rate_limits.json';
    if (file_exists($rateFile)) {
        $decoded = json_decode(@file_get_contents($rateFile), true);
        if (is_array($decoded)) {
            $key = get_client_ip() . '|' . $action;
            unset($decoded[$key]);
            @file_put_contents($rateFile, json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        }
    }
}

/**
 * 4. Xác thực CSRF Token
 */
function verify_csrf_token() {
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf_token'] ?? '';
    if (empty($token) || empty($_SESSION['csrf_token'])) {
        return false;
    }
    return hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * 5. Chuẩn hóa & Trả lời JSON an toàn (Không bao giờ rò rỉ mã lỗi nội bộ/SQL)
 */
function json_response($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    
    // Nếu có session, gửi CSRF Token trong response để client đồng bộ
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

/**
 * 6. Kiểm tra quyền sở hữu và phân quyền (IDOR & RBAC Protection)
 */
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
        // Ghi log bảo mật khi phát hiện nỗ lực leo thang quyền
        error_log("[SECURITY ALERT] Phất hiện nỗ lực leo thang quyền admin từ user ID: " . ($user['id'] ?? 'unknown') . " | IP: " . get_client_ip());
        json_response([
            'success'  => false,
            'message'  => 'Bạn không có quyền hạn truy cập khu vực quản trị.',
            'ref_code' => 'ERR_FORBIDDEN'
        ], 403);
    }
    return $user;
}

/**
 * 7. Làm sạch dữ liệu đầu vào (Input Sanitization)
 */
function sanitize_string($str, $maxLength = 255) {
    if ($str === null) return '';
    $clean = trim((string)$str);
    $clean = strip_tags($clean);
    if (mb_strlen($clean) > $maxLength) {
        $clean = mb_substr($clean, 0, $maxLength);
    }
    return $clean;
}
