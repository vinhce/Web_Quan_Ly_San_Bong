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

require_once __DIR__ . '/services/rate_limit_db_helper.php';

function get_rate_limit_file(string $action, ?string $identifier = null): string {
    $dir = __DIR__ . '/../logs/ratelimit';
    if (!is_dir($dir)) {
        @mkdir($dir, 0750, true);
        @file_put_contents($dir . '/.htaccess', "Deny from all\n");
    }
    $cleanAction = preg_replace('/[^a-zA-Z0-9_\-]/', '_', strtolower(trim($action)));
    $ip = get_client_ip();
    $scope = ($cleanAction === 'login_acct' && !empty($identifier))
        ? $cleanAction . '|' . strtolower(trim($identifier))
        : (!empty($identifier) ? $cleanAction . '|' . $ip . '|' . strtolower(trim($identifier)) : $cleanAction . '|' . $ip);
    return $dir . '/rl_' . hash('sha256', $scope) . '.json';
}

function check_rate_limit($pdo, $action, $maxAttempts = 5, $decaySeconds = 60, ?string $identifier = null) {
    $now = time();
    $maxAttempts = max(1, (int)$maxAttempts);
    $decaySeconds = max(5, (int)$decaySeconds);
    $dir = __DIR__ . '/../logs/ratelimit';
    $fileInaccessible = (!is_dir($dir) && !@mkdir($dir, 0750, true)) || !is_writable($dir);

    if (!$fileInaccessible) {
        $file = get_rate_limit_file((string)$action, $identifier);
        if (!file_exists($file)) {
            $dbRes = _rate_limit_db_check($pdo, (string)$action, $identifier, $maxAttempts, $decaySeconds);
            if ($dbRes === false) {
                return false;
            }
            if ($dbRes === null) {
                $testFp = @fopen($file, 'c+');
                if (!$testFp) {
                    error_log("[SECURITY ERROR] Rate limiter file and DB both completely failed, enforcing fail-closed.");
                    return false;
                }
                @fclose($testFp);
                @unlink($file);
            }
            return true;
        }
        $fp = @fopen($file, 'c+');
        if (!$fp) {
            $fileInaccessible = true;
        } elseif (!@flock($fp, LOCK_EX | LOCK_NB)) {
            @fclose($fp);
            $fileInaccessible = true;
        } else {
            $raw = stream_get_contents($fp);
            $decoded = $raw ? json_decode($raw, true) : null;
            $attempts = is_array($decoded['attempts'] ?? null) ? $decoded['attempts'] : [];
            $cutoff = $now - $decaySeconds;
            $recent = array_values(array_filter($attempts, static fn($ts) => (is_int($ts) || ctype_digit((string)$ts)) && (int)$ts >= $cutoff));
            if (count($recent) !== count($attempts)) {
                ftruncate($fp, 0);
                rewind($fp);
                fwrite($fp, json_encode(['attempts' => $recent, 'updated_at' => $now]));
                fflush($fp);
            }
            $allowed = count($recent) < $maxAttempts;
            @flock($fp, LOCK_UN);
            @fclose($fp);
            if (!$allowed) return false;
            $dbRes = _rate_limit_db_check($pdo, (string)$action, $identifier, $maxAttempts, $decaySeconds);
            if ($dbRes === false) return false;
            return true;
        }
    }

    error_log("[SECURITY WARNING] Rate limiter file inaccessible, falling back to DB...");
    $dbRes = _rate_limit_db_check($pdo, (string)$action, $identifier, $maxAttempts, $decaySeconds);
    if ($dbRes === null || $dbRes === false) {
        error_log("[SECURITY ERROR] Rate limiter completely failed or exceeded in DB, enforcing fail-closed.");
        return false;
    }
    return true;
}

function increment_rate_limit($pdo, $action, $decayOrIdentifier = 60, ?string $identifier = null) {
    if (is_string($decayOrIdentifier) && $identifier === null) {
        $identifier = $decayOrIdentifier;
        $decaySeconds = 60;
    } else {
        $decaySeconds = is_numeric($decayOrIdentifier) ? max(5, (int)$decayOrIdentifier) : 60;
    }
    $file = get_rate_limit_file((string)$action, $identifier);
    $now = time();
    $fp = @fopen($file, 'c+');
    if ($fp) {
        if (@flock($fp, LOCK_EX | LOCK_NB)) {
            $raw = stream_get_contents($fp);
            $decoded = $raw ? json_decode($raw, true) : null;
            $attempts = is_array($decoded['attempts'] ?? null) ? $decoded['attempts'] : [];
            $cutoff = $now - max(3600, $decaySeconds);
            $recent = array_values(array_filter($attempts, static fn($ts) => (int)$ts >= $cutoff));
            $recent[] = $now;
            if (count($recent) > 100) $recent = array_slice($recent, -100);
            ftruncate($fp, 0);
            rewind($fp);
            fwrite($fp, json_encode(['attempts' => $recent, 'updated_at' => $now]));
            fflush($fp);
            @flock($fp, LOCK_UN);
        }
        @fclose($fp);
    }
    if ($pdo instanceof PDO) {
        _rate_limit_db_increment($pdo, (string)$action, $identifier, $decaySeconds);
    }
}

function clear_rate_limit($pdo, $action, ?string $identifier = null) {
    $file = get_rate_limit_file((string)$action, $identifier);
    if (is_file($file)) {
        $fp = @fopen($file, 'c+');
        if ($fp) {
            if (@flock($fp, LOCK_EX | LOCK_NB)) {
                ftruncate($fp, 0);
                rewind($fp);
                fwrite($fp, json_encode(['attempts' => [], 'updated_at' => time()]));
                fflush($fp);
                @flock($fp, LOCK_UN);
            }
            @fclose($fp);
        }
        @unlink($file);
    }
    if ($pdo instanceof PDO) {
        _rate_limit_db_clear($pdo, (string)$action, $identifier);
    }
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
        try {
            $stmt = $pdo->prepare("SELECT id, username, email, phone, full_name, role, status, must_change_password, totp_enabled FROM users WHERE id = ? LIMIT 1");
            $stmt->execute([$_SESSION['user_id']]);
            $fresh = $stmt->fetch();
        } catch (Throwable $e) {
            $stmt = $pdo->prepare("SELECT id, username, email, phone, full_name, role, status, must_change_password FROM users WHERE id = ? LIMIT 1");
            $stmt->execute([$_SESSION['user_id']]);
            $fresh = $stmt->fetch();
        }
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
            'full_name' => $fresh['full_name'], 'role' => $assignedRole,
            'must_change_password' => (int)($fresh['must_change_password'] ?? 0),
            'totp_enabled' => !empty($fresh['totp_enabled']) ? 1 : 0
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
    if (!empty($user['must_change_password'])) {
        json_response([
            'success'  => false,
            'message'  => 'Bạn cần đổi mật khẩu khởi tạo trước khi tiếp tục thao tác.',
            'ref_code' => 'ERR_MUST_CHANGE_PASSWORD'
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
    if (!empty($user['must_change_password'])) {
        json_response([
            'success'  => false,
            'message'  => 'Bạn cần đổi mật khẩu khởi tạo trước khi tiếp tục thao tác.',
            'ref_code' => 'ERR_MUST_CHANGE_PASSWORD'
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
    if (!empty($user['must_change_password'])) {
        json_response([
            'success'  => false,
            'message'  => 'Bạn cần đổi mật khẩu khởi tạo trước khi tiếp tục thao tác.',
            'ref_code' => 'ERR_MUST_CHANGE_PASSWORD'
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

function audit_log_decode_structured_value($value, &$isStructured) {
    $isStructured = false;
    if (is_array($value)) {
        $isStructured = true;
        return $value;
    }
    if (is_object($value)) {
        $isStructured = true;
        return get_object_vars($value);
    }
    if (!is_string($value)) {
        return $value;
    }

    $trimmed = trim($value);
    if ($trimmed === '' || ($trimmed[0] !== '{' && $trimmed[0] !== '[')) {
        return $value;
    }

    $decoded = json_decode($trimmed, true);
    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
        $isStructured = true;
        return $decoded;
    }
    return $value;
}

function audit_log_scalar_values_equal($left, $right) {
    if ($left === null && $right === null) {
        return true;
    }
    if ($left === null || $right === null) {
        return false;
    }
    if (is_object($left)) $left = get_object_vars($left);
    if (is_object($right)) $right = get_object_vars($right);
    if (is_array($left) || is_array($right)) {
        if (!is_array($left) || !is_array($right)) return false;
        return audit_log_values_equal($left, $right);
    }
    $leftIsNumeric = !is_bool($left) && (is_int($left) || is_float($left) || (is_string($left) && is_numeric($left)));
    $rightIsNumeric = !is_bool($right) && (is_int($right) || is_float($right) || (is_string($right) && is_numeric($right)));
    if ($leftIsNumeric && $rightIsNumeric) {
        return ((string)(float)$left === (string)(float)$right) || ((float)$left == (float)$right);
    }
    if (is_bool($left) || is_bool($right)) {
        return ((bool)$left === (bool)$right);
    }
    return trim((string)$left) === trim((string)$right);
}

function audit_log_values_equal($left, $right) {
    if (is_object($left)) {
        $left = get_object_vars($left);
    }
    if (is_object($right)) {
        $right = get_object_vars($right);
    }

    if (is_array($left) || is_array($right)) {
        if (!is_array($left) || !is_array($right) || count($left) !== count($right)) {
            return false;
        }

        $leftKeys = array_keys($left);
        $rightKeys = array_keys($right);
        $leftIsList = $leftKeys === [] || $leftKeys === range(0, count($left) - 1);
        $rightIsList = $rightKeys === [] || $rightKeys === range(0, count($right) - 1);
        if ($leftIsList !== $rightIsList) {
            return false;
        }

        if ($leftIsList) {
            foreach ($left as $index => $value) {
                if (!audit_log_scalar_values_equal($value, $right[$index])) {
                    return false;
                }
            }
            return true;
        }

        foreach ($left as $key => $value) {
            if (!array_key_exists($key, $right) || !audit_log_scalar_values_equal($value, $right[$key])) {
                return false;
            }
        }
        return true;
    }

    return audit_log_scalar_values_equal($left, $right);
}

function audit_log_extract_changes($oldValue, $newValue) {
    if ($oldValue === null && $newValue === null) {
        return null;
    }

    $oldIsStruct = false;
    $newIsStruct = false;
    $oldParsed = audit_log_decode_structured_value($oldValue, $oldIsStruct);
    $newParsed = audit_log_decode_structured_value($newValue, $newIsStruct);

    // Case 1: Cả hai đều là mảng hoặc JSON object/array
    if ($oldIsStruct && $newIsStruct && is_array($oldParsed) && is_array($newParsed)) {
        $oldKeys = array_keys($oldParsed);
        $newKeys = array_keys($newParsed);
        $oldIsList = $oldKeys === [] || $oldKeys === range(0, count($oldParsed) - 1);
        $newIsList = $newKeys === [] || $newKeys === range(0, count($newParsed) - 1);

        if ($oldIsList && $newIsList) {
            if (count($oldParsed) === count($newParsed)) {
                $allEqual = true;
                foreach ($oldParsed as $idx => $val) {
                    if (!audit_log_scalar_values_equal($val, $newParsed[$idx])) {
                        $allEqual = false;
                        break;
                    }
                }
                if ($allEqual) {
                    return ['has_change' => false, 'diff_old' => [], 'diff_new' => []];
                }
            }
            return [
                'has_change' => true,
                'diff_old'   => $oldParsed,
                'diff_new'   => $newParsed
            ];
        }

        // Mảng kết hợp (key-value): so sánh từng key không phụ thuộc thứ tự key
        $allKeys = array_unique(array_merge($oldKeys, $newKeys));
        $diffOld = [];
        $diffNew = [];

        foreach ($allKeys as $k) {
            $hasOld = array_key_exists($k, $oldParsed);
            $hasNew = array_key_exists($k, $newParsed);
            $vOld = $hasOld ? $oldParsed[$k] : null;
            $vNew = $hasNew ? $newParsed[$k] : null;

            if ($hasOld && !$hasNew) {
                $diffOld[$k] = $vOld;
                $diffNew[$k] = null;
            } elseif (!$hasOld && $hasNew) {
                $diffOld[$k] = null;
                $diffNew[$k] = $vNew;
            } else {
                if (!audit_log_scalar_values_equal($vOld, $vNew)) {
                    $diffOld[$k] = $vOld;
                    $diffNew[$k] = $vNew;
                }
            }
        }

        if (empty($diffOld) && empty($diffNew)) {
            return ['has_change' => false, 'diff_old' => [], 'diff_new' => []];
        }

        return [
            'has_change' => true,
            'diff_old'   => $diffOld,
            'diff_new'   => $diffNew
        ];
    }

    // Case 2: Cả hai đều là scalar khác null (cặp cũ/mới trạng thái: A -> B)
    if ($oldValue !== null && $newValue !== null && !$oldIsStruct && !$newIsStruct) {
        if (audit_log_scalar_values_equal($oldValue, $newValue)) {
            return ['has_change' => false, 'diff_old' => $oldValue, 'diff_new' => $newValue];
        }
        return [
            'has_change' => true,
            'diff_old'   => $oldValue,
            'diff_new'   => $newValue
        ];
    }

    // Case 3: Hành động đơn lẻ không có cặp cũ/mới (Check-in, Walk-in, 2FA, Telegram test...)
    return null;
}

function audit_log_is_unchanged_structured_pair($oldValue, $newValue) {
    $diff = audit_log_extract_changes($oldValue, $newValue);
    if ($diff !== null) {
        return $diff['has_change'] === false;
    }
    return false;
}

function write_audit_log($pdo, $action, $bookingId = null, $oldValue = null, $newValue = null, $actor = null) {
    $diffResult = audit_log_extract_changes($oldValue, $newValue);
    if ($diffResult !== null) {
        if ($diffResult['has_change'] === false) {
            // Không có thay đổi giá trị thực tế -> KHÔNG ghi log, trả về thành công
            return true;
        }
        // Chỉ lưu các trường thực sự thay đổi vào old_value và new_value
        $oldValue = $diffResult['diff_old'];
        $newValue = $diffResult['diff_new'];
    }

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
        $isSystemActor = is_array($actor) && strtolower((string)($actor['role'] ?? '')) === 'system';
        $userId = $isSystemActor
            ? null
            : (isset($actor['id']) ? (int)$actor['id'] : (isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null));
        $actorName = null;
        $actorRole = null;
        if ($isSystemActor) {
            $actorName = 'Hệ thống (tự động)';
            $actorRole = 'system';
        } elseif (is_array($actor)) {
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

        $targetType = null;
        $targetId = null;
        $cleanAct = strtoupper(trim((string)$action));
        if ($bookingId !== null && $bookingId !== '') {
            $targetId = (string)$bookingId;
            if (preg_match('/^P\d+-/i', $targetId) || str_contains($cleanAct, 'PITCH')) {
                $targetType = 'pitch';
            } elseif (preg_match('/^BK-/i', $targetId) || preg_match('/^[A-Z0-9]{8,12}$/i', $targetId) || str_contains($cleanAct, 'BOOKING') || $cleanAct === 'CHECKIN') {
                $targetType = 'booking';
            } elseif (str_contains($cleanAct, 'VOUCHER') || str_starts_with($targetId, 'VC-')) {
                $targetType = 'voucher';
            } elseif (str_contains($cleanAct, 'SERVICE') || str_starts_with($targetId, 'SRV-')) {
                $targetType = 'service';
            } elseif (str_contains($cleanAct, 'EXPENSE') || str_starts_with($targetId, 'EXP-')) {
                $targetType = 'expense';
            } elseif (str_contains($cleanAct, 'SHIFT')) {
                $targetType = 'shift';
            } elseif (str_contains($cleanAct, 'USER') || str_contains($cleanAct, 'MEMBER') || str_contains($cleanAct, 'STAFF')) {
                $targetType = 'user';
            } else {
                $targetType = 'other';
            }
        } else {
            if (in_array($cleanAct, ['UPDATE_PRICING', 'UPDATE_PRICE', 'PRICE_UPDATE'], true)) {
                $targetType = 'pricing';
                $targetId = 'Bảng giá sân';
            } elseif (in_array($cleanAct, ['ENABLE_2FA', 'DISABLE_2FA', '2FA_TOGGLE'], true)) {
                $targetType = 'security';
                $targetId = 'Xác thực 2FA';
            } elseif (in_array($cleanAct, ['UPDATE_SETTINGS', 'SYSTEM_SETTINGS'], true)) {
                $targetType = 'settings';
                $targetId = 'Cấu hình chung';
            } elseif (in_array($cleanAct, ['DB_BACKUP', 'DB_BACKUP_DOWNLOAD'], true)) {
                $targetType = 'database';
                $targetId = 'Sao lưu CSDL';
            } elseif (in_array($cleanAct, ['GOLDEN_HOUR_SAVE', 'GOLDEN_HOUR_DELETE'], true)) {
                $targetType = 'pricing';
                $targetId = 'Giờ vàng';
            } elseif (in_array($cleanAct, ['SAMPLE_DATA_CLEAN', 'SAMPLE_DATA_SEED'], true)) {
                $targetType = 'system';
                $targetId = 'Dữ liệu mẫu';
            } elseif (in_array($cleanAct, ['TELEGRAM_TEST'], true)) {
                $targetType = 'system';
                $targetId = 'Bot Telegram';
            }
        }

        $stmt = $pdo->prepare("INSERT INTO audit_logs (user_id, actor_name, actor_role, action, target_type, target_id, booking_id, old_value, new_value, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $userId,
            $actorName,
            $actorRole,
            sanitize_string($action, 80),
            $targetType,
            $targetId,
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

