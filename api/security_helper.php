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

function destroy_current_session() {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params['path'],
            $params['domain'],
            $params['secure'],
            $params['httponly']
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
            return $_SESSION['user'] ?? null;
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
    } catch (PDOException $e) {
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
        $srvStmt = $pdo->prepare("SELECT id, name, price, unit, stock_qty, track_inventory FROM extra_services WHERE id = ? LIMIT 1");
        $srvStmt->execute([$serviceId]);
        $srv = $srvStmt->fetch();
        if (!$srv) {
            return false;
        }
        if ((int)($srv['track_inventory'] ?? 1) === 1) {
            $updStmt = $pdo->prepare("UPDATE extra_services SET stock_qty = GREATEST(0, stock_qty - ?) WHERE id = ? AND track_inventory = 1");
            $updStmt->execute([$qty, $serviceId]);
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
        return true;
    } catch (Exception $e) {
        error_log("[SERVICE INVENTORY WARN] " . $e->getMessage());
        return false;
    }
}

function get_system_settings_map(?PDO $pdo): array {
    $map = [
        'deposit_rate'         => '30',
        'bank_name'            => 'MBBank',
        'bank_code'            => 'MB',
        'bank_account'         => '0352313548',
        'bank_holder'          => 'NGUYEN QUANG VINH',
        'hotline'              => '0352 313 548',
        'open_hours'           => '05:30 - 23:00 hàng ngày (kể cả Lễ, Tết)',
        'hold_minutes'         => '15',
        'refund_full_hours'    => '24',
        'refund_partial_hours' => '4',
        'auto_cancel_enabled'  => '1',
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
        return [
            'released_count' => 0,
            'codes'          => [],
            'hold_minutes'   => $holdMinutes,
            'skipped'        => 'disabled'
        ];
    }

    $releasedRows = [];
    $codes = [];

    try {
        $pdo->beginTransaction();

        $selStmt = $pdo->prepare("
            SELECT id, code, status, payment_status, payment_method, services_json, note
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
        $expiredRows = $selStmt->fetchAll();

        if (!empty($expiredRows)) {
            $noteSuffix = " [Tự động hủy do quá hạn {$holdMinutes}p chưa đặt cọc]";
            $updBooking = $pdo->prepare("
                UPDATE bookings
                SET status = 'Đã hủy',
                    payment_status = 'Đã hủy',
                    remaining_amount = 0,
                    cancel_policy_applied = 'auto_expired',
                    refund_amount = 0,
                    note = CONCAT(IFNULL(note, ''), ?)
                WHERE id = ?
            ");
            $restoreInv = $pdo->prepare("UPDATE extra_services SET stock_qty = stock_qty + ? WHERE id = ? AND track_inventory = 1");

            foreach ($expiredRows as $row) {
                $updBooking->execute([$noteSuffix, (int)$row['id']]);
                $codes[] = $row['code'];
                $releasedRows[] = $row;

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
        }
    }

    return [
        'released_count' => count($codes),
        'codes'          => $codes,
        'hold_minutes'   => $holdMinutes
    ];
}

function maybe_run_auto_release_throttled(?PDO $pdo, int $intervalSeconds = 30): void {
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
}
