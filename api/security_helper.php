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
        session_regenerate_id(true);
        $_SESSION['created_at'] = $now;
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    $_SESSION['last_activity'] = $now;

    if (!isset($_SESSION['created_at'])) {
        $_SESSION['created_at'] = $now;
    } elseif ($now - $_SESSION['created_at'] > $maxLifetime) {
        session_unset();
        session_destroy();
        session_start();
        session_regenerate_id(true);
        $_SESSION['last_activity'] = $now;
        $_SESSION['created_at'] = $now;
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
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

function generate_csrf_token(): string {
    secure_session_start();
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return (string)$_SESSION['csrf_token'];
}

function get_rate_limit_file(string $action, ?string $identifier = null): string {
    $dir = __DIR__ . '/../logs/ratelimit';
    if (!is_dir($dir)) {
        @mkdir($dir, 0750, true);
        @file_put_contents($dir . '/.htaccess', "Deny from all\n");
    }
    $cleanAction = preg_replace('/[^a-zA-Z0-9_\-]/', '_', strtolower(trim($action)));
    $ip = get_client_ip();
    if ($cleanAction === 'login_acct' && $identifier !== null && $identifier !== '') {
        $scope = $cleanAction . '|' . strtolower(trim($identifier));
    } elseif ($identifier !== null && $identifier !== '') {
        $scope = $cleanAction . '|' . $ip . '|' . strtolower(trim($identifier));
    } else {
        $scope = $cleanAction . '|' . $ip;
    }
    return $dir . '/rl_' . hash('sha256', $scope) . '.json';
}

function check_rate_limit($pdo, $action, $maxAttempts = 5, $windowSeconds = 900, ?string $identifier = null) {
    $file = get_rate_limit_file((string)$action, $identifier);
    $now = time();
    $maxAttempts = max(1, (int)$maxAttempts);
    $windowSeconds = max(10, (int)$windowSeconds);
    if (!is_file($file)) {
        return true;
    }
    $fp = @fopen($file, 'c+');
    if (!$fp) {
        return true;
    }
    $allowed = true;
    if (@flock($fp, LOCK_EX)) {
        $raw = stream_get_contents($fp);
        $decoded = $raw ? json_decode($raw, true) : null;
        $attempts = is_array($decoded['attempts'] ?? null) ? $decoded['attempts'] : [];
        $cutoff = $now - $windowSeconds;
        $recent = array_values(array_filter($attempts, static function ($ts) use ($cutoff) {
            return is_int($ts) || ctype_digit((string)$ts) ? ((int)$ts >= $cutoff) : false;
        }));
        if (count($recent) !== count($attempts)) {
            ftruncate($fp, 0);
            rewind($fp);
            fwrite($fp, json_encode(['attempts' => $recent, 'updated_at' => $now]));
            fflush($fp);
        }
        $allowed = count($recent) < $maxAttempts;
        @flock($fp, LOCK_UN);
    }
    @fclose($fp);
    return $allowed;
}

function increment_rate_limit($pdo, $action, ?string $identifier = null) {
    $file = get_rate_limit_file((string)$action, $identifier);
    $now = time();
    $fp = @fopen($file, 'c+');
    if (!$fp) {
        return;
    }
    if (@flock($fp, LOCK_EX)) {
        $raw = stream_get_contents($fp);
        $decoded = $raw ? json_decode($raw, true) : null;
        $attempts = is_array($decoded['attempts'] ?? null) ? $decoded['attempts'] : [];
        $cutoff = $now - 3600;
        $recent = array_values(array_filter($attempts, static function ($ts) use ($cutoff) {
            return (int)$ts >= $cutoff;
        }));
        $recent[] = $now;
        if (count($recent) > 100) {
            $recent = array_slice($recent, -100);
        }
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode(['attempts' => $recent, 'updated_at' => $now]));
        fflush($fp);
        @flock($fp, LOCK_UN);
    }
    @fclose($fp);
}

function clear_rate_limit($pdo, $action, ?string $identifier = null) {
    $file = get_rate_limit_file((string)$action, $identifier);
    if (!is_file($file)) {
        return;
    }
    $fp = @fopen($file, 'c+');
    if (!$fp) {
        return;
    }
    if (@flock($fp, LOCK_EX)) {
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode(['attempts' => [], 'updated_at' => time()]));
        fflush($fp);
        @flock($fp, LOCK_UN);
    }
    @fclose($fp);
}

function verify_csrf_token(?array $jsonData = null): bool {
    if (session_status() !== PHP_SESSION_ACTIVE) {
        secure_session_start();
    }
    $token = trim((string)(
        $_SERVER['HTTP_X_CSRF_TOKEN']
        ?? $_POST['csrf_token']
        ?? ($jsonData['csrf_token'] ?? '')
    ));
    $sessionToken = (string)($_SESSION['csrf_token'] ?? '');
    if ($token === '' || $sessionToken === '') {
        return false;
    }
    return hash_equals($sessionToken, $token);
}

function require_csrf_if_session_authenticated(?array $jsonData = null): void {
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    if (in_array($method, ['GET', 'HEAD', 'OPTIONS'], true)) {
        return;
    }
    if (empty($_SESSION['user_id'])) {
        return;
    }
    if (!verify_csrf_token($jsonData)) {
        error_log("[SECURITY CSRF FAIL] user=" . ($_SESSION['user_id'] ?? '0') . " | uri=" . ($_SERVER['REQUEST_URI'] ?? '') . " | ip=" . get_client_ip());
        json_error('Phiên làm việc hoặc mã bảo mật CSRF không hợp lệ. Vui lòng tải lại trang và thử lại.', 403, 'ERR_CSRF_INVALID');
    }
}

function get_authenticated_user(?PDO $pdo = null): ?array {
    secure_session_start();
    if (empty($_SESSION['user_id'])) {
        return null;
    }
    $user = refresh_session_user($pdo);
    if (!is_array($user) || !empty($user['_locked'])) {
        return null;
    }
    return $user;
}

function normalize_phone(?string $phone): string {
    $digits = preg_replace('/[^0-9]/', '', trim((string)$phone));
    if (strlen($digits) === 11 && strpos($digits, '84') === 0) {
        return '0' . substr($digits, 2);
    }
    return $digits;
}

function mask_phone_number(?string $phone): string {
    $clean = trim((string)$phone);
    $len = strlen($clean);
    if ($len >= 7) {
        return substr($clean, 0, 4) . '***' . substr($clean, -3);
    }
    return $len > 0 ? (substr($clean, 0, 2) . '***') : '***';
}

function json_response($data, $statusCode = 200) {
    @header_remove('X-Powered-By');
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: strict-origin-when-cross-origin');

    if (session_status() === PHP_SESSION_ACTIVE && !empty($_SESSION['csrf_token'])) {
        header('X-CSRF-Token: ' . (string)$_SESSION['csrf_token']);
        if (is_array($data)) {
            $data['csrf_token'] = $_SESSION['csrf_token'];
        }
    }

    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }
    exit;
}

function json_error($message, $statusCode = 400, $refCode = 'ERR_GENERAL') {
    json_response([
        'success'  => false,
        'message'  => $message,
        'ref_code' => $refCode
    ], $statusCode);
}

function destroy_current_session() {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            [
                'expires'  => time() - 42000,
                'path'     => $params['path'] ?? '/',
                'domain'   => $params['domain'] ?? '',
                'secure'   => !empty($params['secure']),
                'httponly' => true,
                'samesite' => 'Lax'
            ]
        );
    }
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_destroy();
    }
}

function refresh_session_user($pdo = null) {
    $userId = $_SESSION['user_id'] ?? $_SESSION['user']['id'] ?? null;
    if (empty($userId)) return null;
    $_SESSION['user_id'] = (int)$userId;
    if ($pdo === null) $pdo = getDBConnection(false);
    if (!$pdo) return $_SESSION['user'] ?? null;
    try {
        $stmt = $pdo->prepare("SELECT id, username, email, phone, full_name, role, status FROM users WHERE id = ? LIMIT 1");
        $stmt->execute([$_SESSION['user_id']]);
        $fresh = $stmt->fetch();
        if (!$fresh) {
            destroy_current_session();
            return null;
        }
        if (($fresh['status'] ?? 'active') === 'locked') {
            destroy_current_session();
            return ['_locked' => true];
        }
        $assignedRole = $fresh['role'] ?? 'user';
        $_SESSION['user'] = [
            'id' => $fresh['id'], 'username' => $fresh['username'],
            'name' => $fresh['full_name'] ?? $fresh['username'],
            'email' => $fresh['email'], 'phone' => $fresh['phone'],
            'full_name' => $fresh['full_name'], 'role' => $assignedRole
        ];
        return $_SESSION['user'];
    } catch (Throwable $e) {
        error_log("[SESSION REFRESH ERROR] " . $e->getMessage());
        return $_SESSION['user'] ?? null;
    }
}

function require_auth($pdo = null) {
    secure_session_start();
    if (empty($_SESSION['user_id'])) {
        json_response([
            'success'  => false,
            'message'  => 'Yêu cầu đăng nhập để thực hiện thao tác này.',
            'ref_code' => 'ERR_UNAUTHORIZED'
        ], 401);
    }
    $user = refresh_session_user($pdo);
    if (is_array($user) && !empty($user['_locked'])) {
        json_response([
            'success'  => false,
            'message'  => 'Tài khoản của bạn đã bị Chủ sân tạm khóa. Vui lòng liên hệ Quản trị viên.',
            'ref_code' => 'ERR_ACCOUNT_LOCKED'
        ], 403);
    }
    if (!$user) {
        json_response([
            'success'  => false,
            'message'  => 'Yêu cầu đăng nhập để thực hiện thao tác này.',
            'ref_code' => 'ERR_UNAUTHORIZED'
        ], 401);
    }
    return $user;
}

function require_admin($pdo = null) {
    $user = require_auth($pdo);
    if (($user['role'] ?? '') !== 'admin') {
        
        error_log("[SECURITY ALERT] Phát hiện nỗ lực leo thang quyền admin từ user ID: " . ($user['id'] ?? 'unknown') . " | IP: " . get_client_ip());
        json_response([
            'success'  => false,
            'message'  => 'Bạn không có quyền hạn truy cập khu vực quản trị.',
            'ref_code' => 'ERR_FORBIDDEN'
        ], 403);
    }
    return $user;
}

function require_staff_or_admin($pdo = null) {
    $user = require_auth($pdo);
    if (!in_array($user['role'] ?? '', ['admin', 'manager', 'staff'], true)) {
        error_log("[SECURITY ALERT] Phát hiện nỗ lực truy cập cổng vận hành sân từ user ID: " . ($user['id'] ?? 'unknown') . " | IP: " . get_client_ip());
        json_response([
            'success'  => false,
            'message'  => 'Bạn không có quyền hạn thực hiện thao tác vận hành sân.',
            'ref_code' => 'ERR_FORBIDDEN'
        ], 403);
    }
    return $user;
}

function require_manager_or_admin($pdo = null) {
    $user = require_auth($pdo);
    if (!in_array($user['role'] ?? '', ['admin', 'manager'], true)) {
        error_log("[SECURITY ALERT] Phát hiện nỗ lực vượt quyền Quản lý/Admin từ user ID: " . ($user['id'] ?? 'unknown') . " (role: " . ($user['role'] ?? 'unknown') . ") | IP: " . get_client_ip());
        json_response([
            'success'  => false,
            'message'  => 'Chức năng này chỉ dành cho Quản lý sân hoặc Chủ sân (Admin).',
            'ref_code' => 'ERR_FORBIDDEN'
        ], 403);
    }
    return $user;
}

function is_portal_operator($user): bool {
    return is_array($user) && in_array($user['role'] ?? '', ['admin', 'manager', 'staff'], true);
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

function write_audit_log($pdo, $action, $bookingId = null, $oldValue = null, $newValue = null, $actor = null) {
    if ($pdo === null) {
        $pdo = getDBConnection(false);
    }
    if (!$pdo) {
        return false;
    }
    try {
        if (!is_array($actor)) {
            $actor = $_SESSION['user'] ?? null;
        }
        $userId    = isset($actor['id']) ? (int)$actor['id'] : (isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null);
        $actorName = null;
        $actorRole = null;
        if (is_array($actor)) {
            $actorName = !empty($actor['full_name']) ? $actor['full_name'] : ($actor['username'] ?? null);
            $actorRole = $actor['role'] ?? null;
        }
        if (is_array($oldValue)) {
            $oldValue = json_encode($oldValue, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        } elseif ($oldValue !== null) {
            $oldValue = (string)$oldValue;
        }
        if (is_array($newValue)) {
            $newValue = json_encode($newValue, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        } elseif ($newValue !== null) {
            $newValue = (string)$newValue;
        }
        $stmt = $pdo->prepare("INSERT INTO audit_logs (user_id, actor_name, actor_role, action, booking_id, old_value, new_value, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $userId,
            $actorName,
            $actorRole,
            sanitize_string($action, 80),
            $bookingId !== null ? sanitize_string((string)$bookingId, 40) : null,
            $oldValue,
            $newValue,
            get_client_ip()
        ]);
        return true;
    } catch (Exception $e) {
        error_log("[AUDIT LOG WARN] " . $e->getMessage());
        return false;
    }
}

function deduct_service_inventory($pdo, $serviceId, $qty, $bookingCode = null, $unitPrice = null, $paymentMethod = 'Đi kèm đơn đặt sân', $note = '', $staffId = null) {
    if ($pdo === null) {
        $pdo = getDBConnection(false);
    }
    if (!$pdo) {
        return false;
    }
    $qty = max(1, (int)$qty);
    try {
        $sqlLock = $pdo->inTransaction() ? " FOR UPDATE" : "";
        $srvStmt = $pdo->prepare("SELECT id, name, price, unit, stock_qty, min_stock_warning, track_inventory FROM extra_services WHERE id = ? LIMIT 1" . $sqlLock);
        $srvStmt->execute([$serviceId]);
        $srv = $srvStmt->fetch();
        if (!$srv) {
            return false;
        }
        $trackInv = (int)($srv['track_inventory'] ?? 1) === 1;
        $newStock = (int)($srv['stock_qty'] ?? 0);
        if ($trackInv) {
            $updStmt = $pdo->prepare("UPDATE extra_services SET stock_qty = GREATEST(0, stock_qty - ?) WHERE id = ? AND track_inventory = 1");
            $updStmt->execute([$qty, $serviceId]);
            $newStock = max(0, $newStock - $qty);
        }
        $uPrice = ($unitPrice !== null) ? max(0, (int)$unitPrice) : max(0, (int)$srv['price']);
        $totalAmount = $uPrice * $qty;
        $resolvedStaffId = $staffId !== null ? (int)$staffId : (isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null);

        $saleStmt = $pdo->prepare("INSERT INTO service_sales (service_id, service_name, quantity, unit_price, total_amount, payment_method, booking_code, staff_id, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $saleStmt->execute([
            $srv['id'],
            $srv['name'],
            $qty,
            $uPrice,
            $totalAmount,
            sanitize_string($paymentMethod, 50),
            $bookingCode !== null ? sanitize_string((string)$bookingCode, 40) : null,
            $resolvedStaffId,
            $note !== '' ? sanitize_string($note, 255) : null
        ]);

        // Cảnh báo tồn kho thấp qua Telegram (chống spam: tối đa 1 lần/ngày mỗi sản phẩm)
        $minWarn = max(0, (int)($srv['min_stock_warning'] ?? 10));
        if ($trackInv && $newStock <= $minWarn && !$pdo->inTransaction()) {
            try {
                $chkAlert = $pdo->prepare("SELECT COUNT(*) FROM notification_logs WHERE event_type = 'tg_low_stock' AND booking_code = ? AND DATE(created_at) = CURDATE()");
                $chkAlert->execute([$srv['id']]);
                if ((int)$chkAlert->fetchColumn() === 0 && file_exists(__DIR__ . '/notification_helper.php')) {
                    require_once __DIR__ . '/notification_helper.php';
                    if (function_exists('send_telegram_notification')) {
                        $unitLabel = $srv['unit'] ?: 'đơn vị';
                        $lowMsg = "📦 <b>CẢNH BÁO TỒN KHO SẮP HẾT!</b>\n"
                                . "• Sản phẩm: <b>{$srv['name']}</b> (<code>{$srv['id']}</code>)\n"
                                . "• Tồn hiện tại: <b>{$newStock} {$unitLabel}</b> (Ngưỡng cảnh báo: {$minWarn})\n"
                                . "• Vui lòng kiểm tra và nhập thêm hàng.";
                        if (send_telegram_notification($lowMsg, 'low_stock', $pdo)) {
                            $pdo->prepare("UPDATE notification_logs SET booking_code = ? WHERE event_type = 'tg_low_stock' AND DATE(created_at) = CURDATE() ORDER BY id DESC LIMIT 1")->execute([$srv['id']]);
                        }
                    }
                }
            } catch (Exception $lowEx) {
                error_log("[LOW STOCK ALERT WARN] " . $lowEx->getMessage());
            }
        }

        return true;
    } catch (Exception $e) {
        error_log("[SERVICE INVENTORY WARN] " . $e->getMessage());
        return false;
    }
}

function get_system_settings_map(?PDO $pdo): array {
    $map = [
        'deposit_rate'                 => '30',
        'bank_name'                    => 'MBBank',
        'bank_code'                    => 'MB',
        'bank_account'                 => '0352313548',
        'bank_holder'                  => 'NGUYEN QUANG VINH',
        'hotline'                      => '0352 313 548',
        'open_hours'                   => '05:30 - 23:00 hàng ngày (kể cả Lễ, Tết)',
        'hold_minutes'                 => '15',
        'refund_full_hours'            => '24',
        'refund_partial_hours'         => '4',
        'auto_cancel_enabled'          => '1',
        'waitlist_hold_minutes'        => '15',
        'matchmaking_enabled'          => '1',
        'matchmaking_require_approval' => '0',
        'reminder_enabled'             => '1',
        'reminder_hours_before'        => '2',
        'customer_notify_enabled'      => '0',
        'customer_notify_webhook'      => '',
        'booking_confirm_template'     => 'Sân Bóng Pro xác nhận đơn {code}: Sân {pitch_name}, ngày {date} khung giờ {slot_time}. Tổng: {total_price}đ (Cọc: {deposit_amount}đ).',
        'reminder_template'            => 'Nhắc lịch đá bóng: Đội bạn có ca lúc {slot_time} ngày {date} tại {pitch_name}. Mã vé: {code}. Vui lòng đến trước 15 phút!',
        'telegram_notify_enabled'      => '0',
        'telegram_bot_token'           => '',
        'telegram_chat_id'             => '',
        'tg_event_new_booking'         => '1',
        'tg_event_cancel'              => '1',
        'tg_event_shift_diff'          => '1',
        'tg_event_unmatched_tx'        => '1',
        'tg_event_low_stock'           => '1',
        'tg_event_waitlist'            => '1',
        'tg_event_matchmaking'         => '1',
        'tg_event_review'              => '1',
    ];
    if (!$pdo) {
        return $map;
    }
    try {
        $stmt = $pdo->query("SELECT setting_key, setting_value FROM settings");
        if ($stmt) {
            while ($row = $stmt->fetch()) {
                $map[$row['setting_key']] = (string)$row['setting_value'];
            }
        }
    } catch (Exception $e) {
        error_log("[SETTINGS MAP WARN] " . $e->getMessage());
    }
    return $map;
}

function is_phone_blacklisted(?PDO $pdo, ?string $phone): bool {
    if (!$pdo) {
        return false;
    }
    $clean = normalize_phone($phone);
    $raw = preg_replace('/\s+/', '', trim((string)$phone));
    if ($clean === '' && $raw === '') {
        return false;
    }
    try {
        $stmt = $pdo->prepare("
            SELECT is_blacklisted FROM customer_crm
            WHERE is_blacklisted = 1
              AND (REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', '') = ? OR phone = ?)
            LIMIT 1
        ");
        $stmt->execute([$clean, $raw]);
        return (int)$stmt->fetchColumn() === 1;
    } catch (Exception $e) {
        error_log("[CRM BLACKLIST CHECK WARN] " . $e->getMessage());
        return false;
    }
}

function db_table_has_column(?PDO $pdo, string $table, string $column): bool {
    if (!$pdo) {
        return false;
    }
    static $columnsCache = [];
    $tableKey = strtolower(trim($table));
    $colKey = strtolower(trim($column));
    if (!isset($columnsCache[$tableKey])) {
        $columnsCache[$tableKey] = [];
        try {
            $stmt = $pdo->query("SHOW COLUMNS FROM `{$table}`");
            if ($stmt) {
                while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    if (!empty($r['Field'])) {
                        $columnsCache[$tableKey][strtolower((string)$r['Field'])] = true;
                    }
                }
            }
        } catch (Throwable $e) {
            return false;
        }
    }
    return isset($columnsCache[$tableKey][$colKey]);
}

require_once __DIR__ . '/services/totp_turnstile_helper.php';
require_once __DIR__ . '/services/booking_conflict_helper.php';
require_once __DIR__ . '/services/pricing_tier_helper.php';
require_once __DIR__ . '/services/waitlist_helper.php';
require_once __DIR__ . '/services/recurring_generator_helper.php';
require_once __DIR__ . '/services/cancellation_helper.php';

