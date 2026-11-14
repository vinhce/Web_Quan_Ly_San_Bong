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
    if (empty($_SESSION['user_id'])) {
        return null;
    }
    if ($pdo === null) {
        $pdo = getDBConnection(false);
    }
    if (!$pdo) {
        return $_SESSION['user'] ?? null;
    }
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
        $_SESSION['user'] = [
            'id'        => $fresh['id'],
            'username'  => $fresh['username'],
            'email'     => $fresh['email'],
            'phone'     => $fresh['phone'],
            'full_name' => $fresh['full_name'],
            'role'      => $fresh['role']
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

function totp_base32_decode(string $b32): string {
    $b32 = strtoupper(preg_replace('/[^A-Z2-7]/', '', $b32));
    if ($b32 === '') {
        return '';
    }
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $buffer = 0;
    $bitsLeft = 0;
    $output = '';
    for ($i = 0, $len = strlen($b32); $i < $len; $i++) {
        $val = strpos($chars, $b32[$i]);
        if ($val === false) {
            continue;
        }
        $buffer = ($buffer << 5) | $val;
        $bitsLeft += 5;
        if ($bitsLeft >= 8) {
            $bitsLeft -= 8;
            $output .= chr(($buffer >> $bitsLeft) & 0xFF);
        }
    }
    return $output;
}

function totp_generate_secret(int $secretLength = 16): string {
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $secret = '';
    for ($i = 0; $i < $secretLength; $i++) {
        $secret .= $chars[random_int(0, 31)];
    }
    return $secret;
}

function totp_calculate_code(string $secret, int $timeSlice): string {
    $secretKey = totp_base32_decode($secret);
    $timePacked = pack('N*', 0) . pack('N*', $timeSlice);
    $hash = hash_hmac('sha1', $timePacked, $secretKey, true);
    $offset = ord(substr($hash, -1)) & 0x0F;
    $truncated = unpack('N', substr($hash, $offset, 4))[1] & 0x7FFFFFFF;
    $pin = $truncated % 1000000;
    return str_pad((string)$pin, 6, '0', STR_PAD_LEFT);
}

function totp_verify_code(string $secret, string $code, int $window = 1): bool {
    $cleanCode = preg_replace('/\s+/', '', (string)$code);
    if (!preg_match('/^[0-9]{6}$/', $cleanCode) || trim($secret) === '') {
        return false;
    }
    $currentTimeSlice = (int)floor(time() / 30);
    $window = max(0, min(3, $window));
    for ($i = -$window; $i <= $window; $i++) {
        $calculated = totp_calculate_code($secret, $currentTimeSlice + $i);
        if (hash_equals($calculated, $cleanCode)) {
            return true;
        }
    }
    return false;
}

function totp_provisioning_uri(string $accountName, string $secret, string $issuer = 'SanBongPro'): string {
    $cleanAccount = rawurlencode(trim($accountName) ?: 'User');
    $cleanIssuer = rawurlencode(trim($issuer) ?: 'SanBongPro');
    $cleanSecret = rawurlencode(strtoupper(preg_replace('/[^A-Z2-7]/', '', $secret)));
    return "otpauth://totp/{$cleanIssuer}:{$cleanAccount}?secret={$cleanSecret}&issuer={$cleanIssuer}&algorithm=SHA1&digits=6&period=30";
}

function verify_turnstile_if_configured(?string $token): bool {
    loadEnv();
    $secretKey = trim($_ENV['TURNSTILE_SECRET_KEY'] ?? getenv('TURNSTILE_SECRET_KEY') ?: '');
    if ($secretKey === '') {
        return true;
    }
    $cleanToken = trim((string)$token);
    if ($cleanToken === '') {
        return false;
    }
    $url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    $postData = http_build_query([
        'secret'   => $secretKey,
        'response' => $cleanToken,
        'remoteip' => get_client_ip()
    ]);
    try {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
        if (function_exists('curl_configure_ssl_tls')) {
            curl_configure_ssl_tls($ch);
        } else {
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
        }
        $res = curl_exec($ch);
        $err = curl_error($ch);
        curl_close($ch);
        if ($err || !$res) {
            error_log("[TURNSTILE VERIFY ERROR] " . $err);
            return false;
        }
        $data = json_decode($res, true);
        return !empty($data['success']);
    } catch (Throwable $e) {
        error_log("[TURNSTILE EXCEPTION] " . $e->getMessage());
        return false;
    }
}

function award_booking_loyalty_points(?PDO $pdo, array $bookingRow): void {
    if (!$pdo) {
        return;
    }
    $userId    = (int)($bookingRow['user_id'] ?? 0);
    $bookingId = (int)($bookingRow['id'] ?? 0);
    $payStatus = (string)($bookingRow['payment_status'] ?? '');
    $paidAmount = (int)($bookingRow['paid_amount'] ?? 0);

    if ($userId <= 0 || $bookingId <= 0) {
        return;
    }
    $isPaidOrDeposited = ($paidAmount > 0) || in_array($payStatus, ['Đã cọc 30%', 'Đã cọc 50%', 'Đã thanh toán đủ', 'Đã thanh toán 100%'], true);
    if (!$isPaidOrDeposited) {
        return;
    }

    try {
        if (db_table_has_column($pdo, 'bookings', 'points_awarded')) {
            $upd = $pdo->prepare("UPDATE bookings SET points_awarded = 1 WHERE id = ? AND (points_awarded = 0 OR points_awarded IS NULL)");
            $upd->execute([$bookingId]);
            if ($upd->rowCount() <= 0) {
                return;
            }
        }
        if (db_table_has_column($pdo, 'users', 'points')) {
            $pdo->prepare("UPDATE users SET points = IFNULL(points, 0) + 100 WHERE id = ?")->execute([$userId]);
        }
    } catch (Throwable $e) {
        error_log("[AWARD POINTS WARN] " . $e->getMessage());
    }
}

function parse_time_to_minutes(string $hhmm): ?int {
    if (!preg_match('/^(\d{1,2}):(\d{2})$/', trim($hhmm), $m)) {
        return null;
    }
    $h = (int)$m[1];
    $min = (int)$m[2];
    if ($h < 0 || $h > 23 || $min < 0 || $min > 59) {
        return null;
    }
    return ($h * 60) + $min;
}

function parse_slot_time_range(string $slotTime): ?array {
    if (preg_match('/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/', $slotTime, $m)) {
        $s = parse_time_to_minutes($m[1]);
        $e = parse_time_to_minutes($m[2]);
        if ($s !== null && $e !== null && $e > $s) {
            return ['startMin' => $s, 'endMin' => $e, 'start' => $m[1], 'end' => $m[2]];
        }
    }
    return null;
}

function time_ranges_overlap(int $aStart, int $aEnd, int $bStart, int $bEnd): bool {
    return ($aStart < $bEnd) && ($bStart < $aEnd);
}

function booking_occurrence_dates(array $booking): array {
    $startDate = (string)($booking['booking_date'] ?? $booking['date'] ?? '');
    $start = DateTimeImmutable::createFromFormat('!Y-m-d', $startDate);
    if (!$start || $start->format('Y-m-d') !== $startDate) {
        throw new InvalidArgumentException('Ngày bắt đầu đơn đặt sân không hợp lệ.');
    }
    $weeks = max(1, (int)($booking['weeks_count'] ?? $booking['weeksCount'] ?? 1));
    $dates = [];
    for ($week = 0; $week < $weeks; $week++) {
        $dates[] = $start->modify('+' . ($week * 7) . ' days')->format('Y-m-d');
    }
    return $dates;
}

// Bind the requested ISO date twice, in this order. A package remains one financial row.
function booking_date_condition_sql(string $alias = 'b'): string {
    if (!preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/D', $alias)) {
        throw new InvalidArgumentException('Bí danh bảng đặt sân không hợp lệ.');
    }
    return "(DATEDIFF(?, {$alias}.booking_date) BETWEEN 0 AND 7 * (GREATEST(1, COALESCE({$alias}.weeks_count, 1)) - 1)"
        . " AND MOD(DATEDIFF(?, {$alias}.booking_date), 7) = 0)";
}

// Shared by the locking booking check and the read-only waitlist occupancy check.
function booking_conflict_query_sql(): string {
    $dateCondition = booking_date_condition_sql('b');
    return "SELECT b.code
            FROM bookings b
            JOIN time_slots occupied_slot ON occupied_slot.id = b.slot_id
            JOIN time_slots requested_slot ON requested_slot.id = ?
            WHERE b.pitch_id = ?
              AND {$dateCondition}
              AND TIME(occupied_slot.start_time) < TIME(requested_slot.end_time)
              AND TIME(requested_slot.start_time) < TIME(occupied_slot.end_time)
              AND b.code <> ?
              AND b.status NOT IN ('Đã hủy', 'Khách chưa đến')
              AND b.payment_status NOT IN ('Đã hủy', 'Tịch thu cọc 30%', 'Đã hoàn cọc 100%', 'Bảo lưu cọc 30%', 'Phạt 50% cọc')
            LIMIT 1";
}

// Callers must lock the pitch row first, including when no bookings exist yet.
function find_booking_conflict(PDO $pdo, string $pitchId, string $date, string $slotId, string $excludeCode = ''): ?array {
    if (!$pdo->inTransaction()) {
        throw new LogicException('Kiểm tra trùng lịch phải nằm trong giao dịch đã khóa sân.');
    }
    $stmt = $pdo->prepare(booking_conflict_query_sql() . ' FOR UPDATE');
    $stmt->execute([$slotId, $pitchId, $date, $date, $excludeCode]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

function find_active_maintenance_for_slot(?PDO $pdo, string $pitchId, string $date, string $slotTime = ''): ?array {
    if (!$pdo || $pitchId === '' || $date === '') {
        return null;
    }
    try {
        $stmt = $pdo->prepare("
            SELECT id, pitch_id, start_date, end_date, start_time, end_time, reason, status
            FROM pitch_maintenance
            WHERE pitch_id = ?
              AND status IN ('scheduled', 'in_progress')
              AND ? BETWEEN start_date AND end_date
            ORDER BY id DESC
        ");
        $stmt->execute([$pitchId, $date]);
        $rows = $stmt->fetchAll();
        if (empty($rows)) {
            return null;
        }
        $slotRange = parse_slot_time_range($slotTime);
        foreach ($rows as $row) {
            if ($slotRange === null) {
                return $row;
            }
            $mStart = parse_time_to_minutes((string)($row['start_time'] ?? '05:30')) ?? (5 * 60 + 30);
            $mEnd   = parse_time_to_minutes((string)($row['end_time'] ?? '23:00')) ?? (23 * 60);
            if ($mEnd <= $mStart) {
                return $row;
            }
            if (time_ranges_overlap($slotRange['startMin'], $slotRange['endMin'], $mStart, $mEnd)) {
                return $row;
            }
        }
        return null;
    } catch (Exception $e) {
        error_log("[MAINTENANCE CHECK WARN] " . $e->getMessage());
        return null;
    }
}

function find_maintenance_affected_bookings(PDO $pdo, string $pitchId, string $startDate, string $endDate, string $startTime = '05:30', string $endTime = '23:00'): array {
    try {
        $mStart = parse_time_to_minutes($startTime) ?? (5 * 60 + 30);
        $mEnd   = parse_time_to_minutes($endTime) ?? (23 * 60);
        $stmt = $pdo->prepare("
            SELECT id, code, customer_name, phone, pitch_id, booking_date, slot_id, slot_time, status, payment_status, deposit_amount, paid_amount
            FROM bookings
            WHERE pitch_id = ?
              AND booking_date BETWEEN ? AND ?
              AND status NOT IN ('Đã hủy', 'Khách chưa đến', 'Hoàn thành')
              AND payment_status NOT IN ('Đã hủy', 'Tịch thu cọc 30%', 'Đã hoàn cọc 100%', 'Bảo lưu cọc 30%', 'Phạt 50% cọc')
            ORDER BY booking_date ASC, slot_time ASC
        ");
        $stmt->execute([$pitchId, $startDate, $endDate]);
        $candidates = $stmt->fetchAll();
        $affected = [];
        foreach ($candidates as $row) {
            $slotRange = parse_slot_time_range((string)($row['slot_time'] ?? ''));
            if ($slotRange === null || $mEnd <= $mStart || time_ranges_overlap($slotRange['startMin'], $slotRange['endMin'], $mStart, $mEnd)) {
                $affected[] = [
                    'code'          => $row['code'],
                    'customerName'  => $row['customer_name'],
                    'phone'         => $row['phone'],
                    'bookingDate'   => $row['booking_date'],
                    'slotId'        => $row['slot_id'],
                    'slotTime'      => $row['slot_time'],
                    'status'        => $row['status'],
                    'paymentStatus' => $row['payment_status']
                ];
            }
        }
        return $affected;
    } catch (Exception $e) {
        error_log("[MAINTENANCE AFFECTED WARN] " . $e->getMessage());
        return [];
    }
}

function get_authenticated_user_tier(?PDO $pdo, ?int $userId): string {
    if (!$pdo || !$userId) {
        return 'standard';
    }
    $tierRank = ['standard' => 1, 'bronze' => 2, 'silver' => 3, 'regular' => 4, 'gold' => 4, 'vip' => 5, 'diamond' => 5];
    $bestTier = 'standard';
    try {
        $uStmt = $pdo->prepare("SELECT phone, customer_tier FROM users WHERE id = ? LIMIT 1");
        $uStmt->execute([$userId]);
        $uRow = $uStmt->fetch();
        if (!$uRow) {
            return 'standard';
        }
        $uT = strtolower(trim((string)($uRow['customer_tier'] ?? 'standard')));
        if (isset($tierRank[$uT]) && $tierRank[$uT] > $tierRank[$bestTier]) {
            $bestTier = $uT;
        }
        $acctPhone = normalize_phone((string)($uRow['phone'] ?? ''));
        if ($acctPhone !== '') {
            $crmStmt = $pdo->prepare("SELECT customer_tier FROM customer_crm WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', '') = ? LIMIT 1");
            $crmStmt->execute([$acctPhone]);
            $cT = strtolower(trim((string)($crmStmt->fetchColumn() ?: '')));
            if (isset($tierRank[$cT]) && $tierRank[$cT] > $tierRank[$bestTier]) {
                $bestTier = $cT;
            }
        }
    } catch (Throwable $e) {
        error_log('[USER TIER WARN] ' . $e->getMessage());
    }
    return $bestTier;
}

function is_tier_allowed_for_voucher(string $userTier, string $requiredTier): bool {
    $req = strtolower(trim($requiredTier));
    if ($req === '' || $req === 'standard' || $req === 'all') {
        return true;
    }
    $tierRank = ['standard' => 1, 'bronze' => 2, 'silver' => 3, 'regular' => 4, 'gold' => 4, 'vip' => 5, 'diamond' => 5];
    $uTier = strtolower(trim($userTier)) ?: 'standard';
    $uRank = $tierRank[$uTier] ?? 1;
    $allowedTokens = array_values(array_filter(array_map('trim', explode(',', $req))));
    if (count($allowedTokens) > 1) {
        foreach ($allowedTokens as $tok) {
            if ($uTier === $tok) {
                return true;
            }
            if (isset($tierRank[$tok]) && $uRank >= $tierRank[$tok]) {
                return true;
            }
        }
        return false;
    }
    $minRank = $tierRank[$req] ?? 99;
    return $uRank >= $minRank;
}

function resolve_golden_hour_adjustment(?PDO $pdo, int $pitchType, int $dayOfWeekIso, string $slotId, int $currentPitchPrice): array {
    $result = [
        'originalPitchPrice' => $currentPitchPrice,
        'adjustedPitchPrice' => $currentPitchPrice,
        'delta'              => 0,
        'discountAmount'     => 0,
        'rule'               => null
    ];
    if (!$pdo || $currentPitchPrice <= 0) {
        return $result;
    }
    try {
        $stmt = $pdo->prepare("
            SELECT id, rule_name, pitch_type, day_of_week, slot_id, price_adjustment_type, adjustment_value, description
            FROM golden_hour_rules
            WHERE is_active = 1
              AND (pitch_type IS NULL OR pitch_type = ?)
              AND (day_of_week IS NULL OR day_of_week = ?)
              AND (slot_id IS NULL OR slot_id = ?)
            ORDER BY ((pitch_type IS NOT NULL) * 1 + (day_of_week IS NOT NULL) * 2 + (slot_id IS NOT NULL) * 4) DESC, id DESC
            LIMIT 1
        ");
        $stmt->execute([$pitchType, $dayOfWeekIso, $slotId]);
        $rule = $stmt->fetch();
        if (!$rule) {
            return $result;
        }
        $newPrice = $currentPitchPrice;
        $adjType  = (string)($rule['price_adjustment_type'] ?? 'fixed');
        $adjVal   = (int)($rule['adjustment_value'] ?? 0);
        if ($adjType === 'fixed') {
            $newPrice = max(50000, $currentPitchPrice + $adjVal);
        } elseif ($adjType === 'percent_discount') {
            $pct = max(0, min(90, $adjVal));
            $newPrice = max(50000, (int)round($currentPitchPrice * (1 - ($pct / 100))));
        } elseif ($adjType === 'percent_surcharge') {
            $pct = max(0, min(200, $adjVal));
            $newPrice = (int)round($currentPitchPrice * (1 + ($pct / 100)));
        }
        $result['adjustedPitchPrice'] = $newPrice;
        $result['delta'] = $newPrice - $currentPitchPrice;
        $result['discountAmount'] = max(0, $currentPitchPrice - $newPrice);
        $result['rule'] = $rule;
        return $result;
    } catch (Exception $e) {
        error_log("[GOLDEN HOUR RESOLVE WARN] " . $e->getMessage());
        return $result;
    }
}

function trigger_waitlist_notification(?PDO $pdo, string $pitchId, string $bookingDate, string $slotId, string $slotTime = '', ?array $actor = null, ?string $releasedCode = null): ?array {
    if (!$pdo || $pitchId === '' || $bookingDate === '' || $slotId === '') {
        return null;
    }
    try {
        // Kiểm tra sân + khung giờ thật sự trống và không bị bảo trì
        $busyStmt = $pdo->prepare(booking_conflict_query_sql());
        $busyStmt->execute([$slotId, $pitchId, $bookingDate, $bookingDate, '']);
        if ($busyStmt->fetchColumn()) {
            return null;
        }

        if ($slotTime === '') {
            $tsStmt = $pdo->prepare("SELECT slot_time FROM time_slots WHERE id = ? LIMIT 1");
            $tsStmt->execute([$slotId]);
            $slotTime = (string)($tsStmt->fetchColumn() ?: $slotId);
        }
        if (find_active_maintenance_for_slot($pdo, $pitchId, $bookingDate, $slotTime)) {
            return null;
        }

        // Nếu đã có khách đang giữ chỗ notified chưa hết hạn thì không đẩy tiếp người sau
        $activeHoldStmt = $pdo->prepare("SELECT id FROM waitlist WHERE pitch_id = ? AND booking_date = ? AND slot_id = ? AND status = 'notified' LIMIT 1");
        $activeHoldStmt->execute([$pitchId, $bookingDate, $slotId]);
        if ($activeHoldStmt->fetchColumn()) {
            return null;
        }

        $wlStmt = $pdo->prepare("
            SELECT * FROM waitlist
            WHERE pitch_id = ? AND booking_date = ? AND slot_id = ? AND status = 'waiting'
            ORDER BY created_at ASC, id ASC
            LIMIT 1
        ");
        $wlStmt->execute([$pitchId, $bookingDate, $slotId]);
        $wlCustomer = $wlStmt->fetch();
        if (!$wlCustomer) {
            return null;
        }

        $pdo->prepare("UPDATE waitlist SET status = 'notified', notified_at = NOW(), updated_at = NOW() WHERE id = ?")->execute([$wlCustomer['id']]);
        $settings = get_system_settings_map($pdo);
        $holdMins = max(5, min(120, (int)($settings['waitlist_hold_minutes'] ?? 15)));

        $pStmt = $pdo->prepare("SELECT name FROM pitches WHERE id = ? LIMIT 1");
        $pStmt->execute([$pitchId]);
        $pitchName = (string)($pStmt->fetchColumn() ?: $pitchId);

        $sysActor = $actor ?: ['id' => null, 'full_name' => 'Hệ thống', 'role' => 'system'];
        write_audit_log(
            $pdo,
            'WAITLIST_NOTIFIED',
            $releasedCode,
            'waiting',
            "Báo sân trống {$pitchName} ({$bookingDate} {$slotTime}) cho khách {$wlCustomer['customer_name']} ({$wlCustomer['phone']}) - Giữ ưu tiên {$holdMins}p",
            $sysActor
        );

        if (file_exists(__DIR__ . '/notification_helper.php')) {
            require_once __DIR__ . '/notification_helper.php';
            if (function_exists('send_telegram_notification')) {
                $wlTg = "🔔 <b>DANH SÁCH CHỜ: CÓ SÂN TRỐNG VỪA NHẢ!</b>\n"
                      . "• Sân: <b>{$pitchName}</b> ({$pitchId}) | Ngày: <b>" . date('d/m/Y', strtotime($bookingDate)) . "</b> | Slot: <b>{$slotTime}</b>\n"
                      . "• Khách ưu tiên: <b>{$wlCustomer['customer_name']}</b> - SĐT: <code>{$wlCustomer['phone']}</code>\n"
                      . "• Thời hạn phản hồi giữ chỗ: <b>{$holdMins} phút</b>.";
                send_telegram_notification($wlTg, 'waitlist', $pdo);
            }
            if (function_exists('send_customer_notification')) {
                send_customer_notification($pdo, 'waitlist_notify', [
                    'booking_id'    => null,
                    'booking_code'  => $releasedCode,
                    'customer_name' => $wlCustomer['customer_name'],
                    'phone'         => $wlCustomer['phone'],
                    'pitch_name'    => $pitchName,
                    'date'          => date('d/m/Y', strtotime($bookingDate)),
                    'slot_time'     => $slotTime,
                    'hold_minutes'  => $holdMins,
                    'custom_title'  => "Sân {$pitchName} vừa trống slot {$slotTime} ngày " . date('d/m/Y', strtotime($bookingDate)),
                    'custom_content'=> "Xin chào {$wlCustomer['customer_name']}, khung giờ {$slotTime} ngày " . date('d/m/Y', strtotime($bookingDate)) . " tại {$pitchName} bạn đăng ký chờ vừa có sân trống. Sân giữ ưu tiên cho bạn trong {$holdMins} phút!"
                ]);
            }
        }

        return $wlCustomer;
    } catch (Exception $e) {
        error_log("[WAITLIST TRIGGER WARN] " . $e->getMessage());
        return null;
    }
}

function expire_stale_waitlist_holds(?PDO $pdo): array {
    try {
        if (!$pdo || $pdo->inTransaction()) {
            return ['expired_count' => 0, 'promoted_count' => 0];
        }
        $settings = get_system_settings_map($pdo);
        $holdMinutes = max(5, min(120, (int)($settings['waitlist_hold_minutes'] ?? 15)));
        $expiredRows = [];

        try {
            $pdo->beginTransaction();
            $sel = $pdo->prepare("
                SELECT w.*, ts.slot_time
                FROM waitlist w
                LEFT JOIN time_slots ts ON w.slot_id = ts.id
                WHERE w.status = 'notified'
                  AND w.notified_at IS NOT NULL
                  AND w.notified_at <= DATE_SUB(NOW(), INTERVAL ? MINUTE)
                FOR UPDATE
            ");
            $sel->execute([$holdMinutes]);
            $expiredRows = $sel->fetchAll();

            if (!empty($expiredRows)) {
                $upd = $pdo->prepare("
                    UPDATE waitlist
                    SET status = 'cancelled',
                        note = TRIM(CONCAT(IFNULL(note, ''), ' [Hết hạn giữ chỗ waitlist ', ?, 'p]')),
                        updated_at = NOW()
                    WHERE id = ?
                ");
                foreach ($expiredRows as $er) {
                    $upd->execute([$holdMinutes, (int)$er['id']]);
                }
            }
            $pdo->commit();
        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log("[WAITLIST EXPIRE WARN] " . $e->getMessage());
            return ['expired_count' => 0, 'promoted_count' => 0];
        }

        $promoted = 0;
        if (!empty($expiredRows)) {
            $systemActor = ['id' => null, 'full_name' => 'Hệ thống (Waitlist Cron)', 'role' => 'system'];
            $processedSlots = [];
            foreach ($expiredRows as $er) {
                write_audit_log(
                    $pdo,
                    'WAITLIST_HOLD_EXPIRED',
                    null,
                    'notified',
                    "Hết hạn {$holdMinutes}p giữ chỗ waitlist của {$er['customer_name']} ({$er['phone']}) cho {$er['pitch_id']} {$er['booking_date']}",
                    $systemActor
                );
                $slotKey = $er['pitch_id'] . '|' . $er['booking_date'] . '|' . $er['slot_id'];
                if (!isset($processedSlots[$slotKey])) {
                    $processedSlots[$slotKey] = true;
                    $next = trigger_waitlist_notification($pdo, $er['pitch_id'], $er['booking_date'], $er['slot_id'], (string)($er['slot_time'] ?? ''), $systemActor);
                    if ($next) {
                        $promoted++;
                    }
                }
            }
        }

        return ['expired_count' => count($expiredRows), 'promoted_count' => $promoted, 'hold_minutes' => $holdMinutes];
    } catch (Throwable $t) {
        error_log("[WAITLIST EXPIRE FATAL PREVENTED] " . $t->getMessage());
        return ['expired_count' => 0, 'promoted_count' => 0, 'hold_minutes' => 15];
    }
}

function generate_recurring_bookings_window(?PDO $pdo, ?int $onlyScheduleId = null, int $horizonWeeks = 4, ?array $actor = null): array {
    if (!$pdo) {
        return ['generated_count' => 0, 'conflicts' => [], 'bookings' => [], 'schedules_scanned' => 0];
    }
    $horizonWeeks = max(1, min(12, $horizonWeeks));
    $sql = "
        SELECT r.*, ts.slot_time, p.name AS pitch_name
        FROM recurring_schedules r
        LEFT JOIN time_slots ts ON r.slot_id = ts.id
        LEFT JOIN pitches p ON r.pitch_id = p.id
        WHERE r.status = 'active'
    ";
    $params = [];
    if ($onlyScheduleId !== null && $onlyScheduleId > 0) {
        $sql .= " AND r.id = ?";
        $params[] = $onlyScheduleId;
    } else {
        $sql .= " AND (r.is_open_ended = 1 OR r.end_date >= CURDATE())";
    }
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $schedules = $stmt->fetchAll();

    $generatedBookings = [];
    $conflicts = [];
    $todayStr = date('Y-m-d');
    $todayTs  = strtotime($todayStr);

    foreach ($schedules as $sch) {
        $schId      = (int)$sch['id'];
        $pitchId    = (string)$sch['pitch_id'];
        $slotId     = (string)$sch['slot_id'];
        $slotTime   = (string)($sch['slot_time'] ?: '17:30 - 19:00');
        $dayOfWeek  = max(1, min(7, (int)$sch['day_of_week']));
        $startStr   = (string)$sch['start_date'];
        $startTs    = max($todayTs, strtotime($startStr) ?: $todayTs);
        $isOpenEnd  = (int)($sch['is_open_ended'] ?? 0) === 1;
        $endStr     = (string)($sch['end_date'] ?? '');
        $endTs      = (!$isOpenEnd && $endStr !== '') ? strtotime($endStr) : null;

        // Cửa sổ 4 tuần kể từ ngày neo (ngày bắt đầu nếu ở tương lai hoặc hôm nay)
        $windowEndTs = strtotime('+' . (($horizonWeeks * 7) - 1) . ' days', $startTs);
        if ($endTs !== null && $endTs < $windowEndTs) {
            $windowEndTs = $endTs;
        }
        if ($windowEndTs < $startTs) {
            continue;
        }

        // Kiểm tra khách có vừa bị đưa vào blacklist không
        if (is_phone_blacklisted($pdo, (string)$sch['phone'])) {
            $conflicts[] = [
                'schedule_code' => $sch['schedule_code'],
                'date'          => date('Y-m-d', $startTs),
                'reason'        => 'Khách hàng đang thuộc danh sách hạn chế (Blacklist)'
            ];
            continue;
        }

        // Tìm ngày đầu tiên >= $startTs khớp thứ trong tuần (1=T2..7=CN)
        $curTs = $startTs;
        $safety = 0;
        while ((int)date('N', $curTs) !== $dayOfWeek && $safety < 8) {
            $curTs = strtotime('+1 day', $curTs);
            $safety++;
        }

        $pricePerMatch   = max(0, (int)($sch['price_per_match'] ?? 0));
        $depositPerMatch = max(0, (int)($sch['deposit_per_match'] ?? 0));
        $remainingMatch  = max(0, $pricePerMatch - $depositPerMatch);
        $note            = (string)($sch['note'] ?? '');

        while ($curTs <= $windowEndTs) {
            $bookingDate = date('Y-m-d', $curTs);

            try {
                $pdo->beginTransaction();

                $pitchLock = $pdo->prepare("SELECT id FROM pitches WHERE id = ? LIMIT 1 FOR UPDATE");
                $pitchLock->execute([$pitchId]);
                if (!$pitchLock->fetchColumn()) {
                    throw new RuntimeException('Không tìm thấy sân của lịch cố định.');
                }

                // Đã từng sinh buổi cho chuỗi này vào ngày này chưa (kể cả đã xin nghỉ 1 buổi)?
                $ownDateCondition = booking_date_condition_sql('b');
                $existsOwn = $pdo->prepare("SELECT b.id FROM bookings b WHERE b.recurring_schedule_id = ? AND {$ownDateCondition} LIMIT 1 FOR UPDATE");
                $existsOwn->execute([$schId, $bookingDate, $bookingDate]);
                if ($existsOwn->fetchColumn()) {
                    $pdo->commit();
                    $curTs = strtotime('+7 days', $curTs);
                    continue;
                }

                // Kiểm tra cả các slot chồng giờ và những tuần sau của gói đã đặt.
                $busyBooking = find_booking_conflict($pdo, $pitchId, $bookingDate, $slotId);
                if ($busyBooking) {
                    $busyCode = $busyBooking['code'];
                    $pdo->rollBack();
                    $conflicts[] = [
                        'schedule_code' => $sch['schedule_code'],
                        'date'          => $bookingDate,
                        'reason'        => "Trùng khung giờ đã có đơn #{$busyCode}"
                    ];
                    $curTs = strtotime('+7 days', $curTs);
                    continue;
                }

                // Kiểm tra lịch bảo trì sân
                $maint = find_active_maintenance_for_slot($pdo, $pitchId, $bookingDate, $slotTime);
                if ($maint) {
                    $pdo->rollBack();
                    $conflicts[] = [
                        'schedule_code' => $sch['schedule_code'],
                        'date'          => $bookingDate,
                        'reason'        => "Trùng lịch bảo trì: {$maint['reason']}"
                    ];
                    $curTs = strtotime('+7 days', $curTs);
                    continue;
                }

                $bCode = 'REC' . date('ymd', $curTs) . '-' . strtoupper(substr(bin2hex(random_bytes(2)), 0, 4));
                $payStatus = ($depositPerMatch > 0) ? 'Đã cọc 30%' : 'Chờ duyệt cọc';
                $bIns = $pdo->prepare("
                    INSERT INTO bookings
                    (code, user_id, customer_name, phone, pitch_id, booking_date, slot_id, slot_time, original_price, discount_amount, total_price, deposit_amount, paid_amount, remaining_amount, status, payment_status, payment_method, booking_mode, recurring_schedule_id, note, expires_at, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'Đã xác nhận', ?, 'Lịch cố định hàng tuần', 'recurring', ?, ?, NULL, NOW())
                ");
                $bIns->execute([
                    $bCode,
                    $sch['user_id'] ?? null,
                    $sch['customer_name'],
                    $sch['phone'],
                    $pitchId,
                    $bookingDate,
                    $slotId,
                    $slotTime,
                    $pricePerMatch,
                    $pricePerMatch,
                    $depositPerMatch,
                    $depositPerMatch,
                    $remainingMatch,
                    $payStatus,
                    $schId,
                    $note
                ]);

                $pdo->commit();
                $generatedBookings[] = [
                    'schedule_code' => $sch['schedule_code'],
                    'date'          => $bookingDate,
                    'code'          => $bCode,
                    'status'        => 'Đã xác nhận'
                ];
            } catch (Exception $loopEx) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                error_log("[RECURRING GEN WARN] " . $loopEx->getMessage());
                $conflicts[] = [
                    'schedule_code' => $sch['schedule_code'],
                    'date'          => $bookingDate,
                    'reason'        => 'Lỗi sinh lịch tự động'
                ];
            }

            $curTs = strtotime('+7 days', $curTs);
        }
    }

    if (!empty($conflicts)) {
        $sysActor = $actor ?: ['id' => null, 'full_name' => 'Hệ thống (Recurring)', 'role' => 'system'];
        write_audit_log(
            $pdo,
            'RECURRING_CONFLICT_SKIP',
            $onlyScheduleId ? ('SCH-' . $onlyScheduleId) : null,
            null,
            'Bỏ qua ' . count($conflicts) . ' buổi bị trùng lịch/bảo trì: ' . json_encode(array_slice($conflicts, 0, 5), JSON_UNESCAPED_UNICODE),
            $sysActor
        );
    }

    return [
        'schedules_scanned' => count($schedules),
        'generated_count'   => count($generatedBookings),
        'skipped_conflicts' => count($conflicts),
        'bookings'          => $generatedBookings,
        'conflicts'         => $conflicts
    ];
}

function evaluate_cancellation_policy(array $bookingRow, array $settings = []): array {
    $bookingDate = trim((string)($bookingRow['booking_date'] ?? date('Y-m-d')));
    $slotTime = trim((string)($bookingRow['slot_time'] ?? ''));
    $startTime = '00:00';
    if (preg_match('/(\d{1,2}:\d{2})/', $slotTime, $m)) {
        $parts = explode(':', $m[1]);
        $startTime = sprintf('%02d:%02d', (int)$parts[0], (int)$parts[1]);
    }
    $matchStartStr = $bookingDate . ' ' . $startTime . ':00';
    $matchTs = strtotime($matchStartStr);
    if ($matchTs === false) {
        $matchTs = time();
    }
    $hoursBeforeMatch = round(($matchTs - time()) / 3600.0, 2);

    $refundFullHours = max(1, (int)($settings['refund_full_hours'] ?? 24));
    $refundPartialHours = max(0, min($refundFullHours, (int)($settings['refund_partial_hours'] ?? 4)));

    $paidAmountCol = max(0, (int)($bookingRow['paid_amount'] ?? 0));
    $payStatusCur  = (string)($bookingRow['payment_status'] ?? '');
    $totalPrice    = max(0, (int)($bookingRow['total_price'] ?? 0));
    $depositAmt    = max(0, (int)($bookingRow['deposit_amount'] ?? 0));
    $inferredPaid  = 0;
    if (in_array($payStatusCur, ['Đã thanh toán đủ', 'Đã thanh toán 100%'], true)) {
        $inferredPaid = $totalPrice;
    } elseif ($payStatusCur === 'Đã cọc 30%') {
        $inferredPaid = $depositAmt;
    }
    $paidBase = max($paidAmountCol, $inferredPaid);

    if ($paidBase <= 0) {
        $policy = 'unpaid_free_cancel';
        $payStatus = 'Đã hủy';
        $refundAmount = 0;
    } elseif ($hoursBeforeMatch >= $refundFullHours) {
        $policy = 'refund_100';
        $payStatus = 'Đã hoàn cọc 100%';
        $refundAmount = $paidBase;
    } elseif ($hoursBeforeMatch >= $refundPartialHours) {
        $policy = 'forfeit_50';
        $payStatus = 'Phạt 50% cọc';
        $refundAmount = (int)round($paidBase * 0.5);
    } else {
        $policy = 'forfeit_100';
        $payStatus = 'Tịch thu cọc 30%';
        $refundAmount = 0;
    }

    return [
        'policy'               => $policy,
        'payment_status'       => $payStatus,
        'refund_amount'        => $refundAmount,
        'paid_base'            => $paidBase,
        'hours_before_match'   => $hoursBeforeMatch,
        'refund_full_hours'    => $refundFullHours,
        'refund_partial_hours' => $refundPartialHours,
        'match_start'          => $matchStartStr,
    ];
}

function run_auto_release_expired_bookings(?PDO $pdo, bool $force = false): array {
    try {
        if (!$pdo) {
            return ['released_count' => 0, 'codes' => [], 'hold_minutes' => 15, 'skipped' => 'no_db'];
        }
        if ($pdo->inTransaction()) {
            return ['released_count' => 0, 'codes' => [], 'hold_minutes' => 15, 'skipped' => 'in_transaction'];
        }

        $settings = get_system_settings_map($pdo);
        $autoCancelEnabled = (string)($settings['auto_cancel_enabled'] ?? '1');
        $holdMinutes = max(5, min(120, (int)($settings['hold_minutes'] ?? 15)));

        if (!$force && $autoCancelEnabled === '0') {
            $wlExp = expire_stale_waitlist_holds($pdo);
            return [
                'released_count'   => 0,
                'codes'            => [],
                'hold_minutes'     => $holdMinutes,
                'waitlist_expired' => $wlExp['expired_count'] ?? 0,
                'skipped'          => 'disabled'
            ];
        }

        $releasedRows = [];
        $codes = [];

        try {
            $pdo->beginTransaction();

            $selStmt = $pdo->prepare("
                SELECT *
                FROM bookings
                WHERE payment_status IN ('Chờ duyệt cọc', 'Chờ cọc 30%')
                  AND status NOT IN ('Đã hủy', 'Hoàn thành', 'Đang đá', 'Khách chưa đến')
                  AND (paid_amount = 0 OR paid_amount IS NULL)
                  AND (payment_method IS NULL OR (payment_method NOT LIKE '%Khách quen%' AND payment_method NOT LIKE '%Chưa cọc%'))
                  AND (
                      (expires_at IS NOT NULL AND expires_at <= NOW())
                      OR (expires_at IS NULL AND created_at <= DATE_SUB(NOW(), INTERVAL ? MINUTE))
                  )
                FOR UPDATE
            ");
            $selStmt->execute([$holdMinutes]);
            $expiredRows = $selStmt->fetchAll(PDO::FETCH_ASSOC);

            if (!empty($expiredRows)) {
                $noteSuffix = " [Tự động hủy do quá hạn {$holdMinutes}p chưa đặt cọc]";
                $hasCancelCol = db_table_has_column($pdo, 'bookings', 'cancel_policy_applied');
                $hasGiftDeducted = db_table_has_column($pdo, 'bookings', 'gift_deducted');
                $hasVoucherUsed = db_table_has_column($pdo, 'vouchers', 'used_count');
                $hasUserPoints = db_table_has_column($pdo, 'users', 'points');

                $updBookingSql = "
                    UPDATE bookings
                    SET status = 'Đã hủy',
                        payment_status = 'Đã hủy',
                        remaining_amount = 0,
                        refund_amount = 0,
                        " . ($hasCancelCol ? "cancel_policy_applied = 'auto_expired'," : "") . "
                        " . ($hasGiftDeducted ? "gift_deducted = 0," : "") . "
                        note = CONCAT(IFNULL(note, ''), ?)
                    WHERE id = ?
                ";
                $updBooking = $pdo->prepare($updBookingSql);
                $restoreInv = $pdo->prepare("UPDATE extra_services SET stock_qty = stock_qty + ? WHERE id = ? AND track_inventory = 1");

                foreach ($expiredRows as $row) {
                    $updBooking->execute([$noteSuffix, (int)$row['id']]);
                    $codes[] = $row['code'];
                    $releasedRows[] = $row;

                    // Hoàn lại lượt dùng voucher nếu có
                    if (!empty($row['voucher_code']) && $hasVoucherUsed) {
                        try {
                            $pdo->prepare("UPDATE vouchers SET used_count = GREATEST(0, used_count - 1) WHERE code = ?")->execute([$row['voucher_code']]);
                        } catch (Throwable $ve) {
                            error_log("[AUTO RELEASE VOUCHER RESTORE WARN] " . $ve->getMessage());
                        }
                    }

                    // Hoàn lại điểm tích lũy nếu có
                    $ptsUsed = isset($row['points_used']) ? (int)$row['points_used'] : 0;
                    $uid = isset($row['user_id']) ? (int)$row['user_id'] : 0;
                    if ($ptsUsed > 0 && $uid > 0 && $hasUserPoints) {
                        try {
                            $pdo->prepare("UPDATE users SET points = IFNULL(points, 0) + ? WHERE id = ?")->execute([$ptsUsed, $uid]);
                        } catch (Throwable $pe) {
                            error_log("[AUTO RELEASE POINTS RESTORE WARN] " . $pe->getMessage());
                        }
                    }

                    // Hoàn lại kho dịch vụ nếu có
                    if (!empty($row['services_json'])) {
                        $services = json_decode((string)$row['services_json'], true);
                        if (is_array($services)) {
                            foreach ($services as $srv) {
                                $srvId = sanitize_string($srv['id'] ?? '', 30);
                                $qty = max(0, (int)($srv['quantity'] ?? 0));
                                if ($srvId !== '' && $qty > 0) {
                                    $restoreInv->execute([$qty, $srvId]);
                                }
                            }
                        }
                    }

                    // Nếu quà tặng gói tháng/quý đã từng trừ (gift_deducted = 1), hoàn kho quà
                    if (!empty($row['gift_deducted']) && (int)$row['gift_deducted'] === 1) {
                        $weeks = (int)($row['weeks_count'] ?? 1);
                        if ($weeks >= 12) {
                            $restoreInv->execute([2, 'SRV-WATER']);
                        } elseif ($weeks >= 8) {
                            $restoreInv->execute([1, 'SRV-WATER']);
                            $restoreInv->execute([1, 'SRV-BIB']);
                        }
                    }
                }
            }

            $pdo->commit();
        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log("[AUTO RELEASE EXPIRED ERROR] " . $e->getMessage());
            return [
                'released_count' => 0,
                'codes'          => [],
                'hold_minutes'   => $holdMinutes,
                'error'          => 'auto_release_failed'
            ];
        }

        if (!empty($releasedRows)) {
            $systemActor = ['id' => null, 'full_name' => 'Hệ thống (Cron)', 'role' => 'system'];
            foreach ($releasedRows as $row) {
                write_audit_log(
                    $pdo,
                    'AUTO_CANCEL_EXPIRED',
                    $row['code'],
                    ($row['status'] ?? '') . ' (' . ($row['payment_status'] ?? '') . ')',
                    "Đã hủy (Tự động nhả sân sau {$holdMinutes} phút chưa cọc)",
                    $systemActor
                );

                trigger_waitlist_notification(
                    $pdo,
                    (string)$row['pitch_id'],
                    (string)$row['booking_date'],
                    (string)$row['slot_id'],
                    (string)($row['slot_time'] ?? ''),
                    $systemActor,
                    (string)$row['code']
                );
            }
        }

        $wlExp = expire_stale_waitlist_holds($pdo);

        return [
            'released_count'   => count($codes),
            'codes'            => $codes,
            'hold_minutes'     => $holdMinutes,
            'waitlist_expired' => $wlExp['expired_count'] ?? 0,
            'waitlist_promoted'=> $wlExp['promoted_count'] ?? 0
        ];
    } catch (Throwable $outerEx) {
        error_log("[AUTO RELEASE EXPIRED FATAL PREVENTED] " . $outerEx->getMessage());
        return ['released_count' => 0, 'codes' => [], 'hold_minutes' => 15, 'error' => 'outer_exception'];
    }
}

function maybe_run_auto_release_throttled(?PDO $pdo, int $intervalSeconds = 30): void {
    try {
        if (!$pdo || $pdo->inTransaction()) {
            return;
        }
        $throttleFile = __DIR__ . '/../logs/.last_auto_release';
        $now = time();
        if (is_file($throttleFile)) {
            $lastRun = (int)@file_get_contents($throttleFile);
            if ($lastRun > 0 && ($now - $lastRun) < $intervalSeconds) {
                return;
            }
        }
        $logDir = dirname($throttleFile);
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0750, true);
        }
        @file_put_contents($throttleFile, (string)$now, LOCK_EX);
        run_auto_release_expired_bookings($pdo, false);
    } catch (Throwable $te) {
        error_log("[MAYBE RUN AUTO RELEASE THROTTLED FATAL PREVENTED] " . $te->getMessage());
    }
}
