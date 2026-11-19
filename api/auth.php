<?php

require_once __DIR__ . '/security_helper.php';

header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0');
secure_session_start();
$pdo = getDBConnection(false);
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

$inputData = [];
$rawInput = file_get_contents('php://input');
if (!empty($rawInput)) {
    $decoded = json_decode($rawInput, true);
    if (is_array($decoded)) {
        $inputData = $decoded;
    }
}
$data = array_merge($_POST, $inputData);
if (empty($action) && isset($data['action'])) {
    $action = $data['action'];
}

if ($method === 'GET' && $action === 'me') {
    loadEnv();
    $turnstileEnabled = strtolower(trim((string)($_ENV['TURNSTILE_ENABLED'] ?? getenv('TURNSTILE_ENABLED') ?: 'true')));
    $turnstileDisabled = in_array($turnstileEnabled, ['false', '0', 'off', 'no'], true);
    $secretKey = trim((string)($_ENV['TURNSTILE_SECRET_KEY'] ?? getenv('TURNSTILE_SECRET_KEY') ?: ''));
    $siteKey = ($turnstileDisabled || $secretKey === '') ? '' : trim((string)($_ENV['TURNSTILE_SITE_KEY'] ?? getenv('TURNSTILE_SITE_KEY') ?: ''));
    $sessUserId = $_SESSION['user_id'] ?? $_SESSION['user']['id'] ?? null;
    if (!empty($sessUserId)) {
        $_SESSION['user_id'] = (int)$sessUserId;
        if ($pdo) {
            $fresh = refresh_session_user($pdo);
            if (is_array($fresh) && !empty($fresh['_locked'])) {
                json_response([
                    'success'            => true,
                    'authenticated'      => false,
                    'logged_in'          => false,
                    'locked'             => true,
                    'turnstile_site_key' => $siteKey,
                    'message'            => 'Tài khoản của bạn đã bị Chủ sân tạm khóa. Vui lòng liên hệ Quản trị viên.',
                    'user'               => null
                ]);
            }
            if (!$fresh) {
                destroy_current_session();
                json_response([
                    'success'            => true,
                    'authenticated'      => false,
                    'logged_in'          => false,
                    'turnstile_site_key' => $siteKey,
                    'user'               => null
                ]);
            }
        }
        $points = 0;
        $customerTier = 'standard';
        $totpEnabled = false;
        if ($pdo && !empty($_SESSION['user_id'])) {
            try {
                $uStmt = $pdo->prepare("SELECT * FROM users WHERE id = ? LIMIT 1");
                $uStmt->execute([$_SESSION['user_id']]);
                $uRow = $uStmt->fetch(PDO::FETCH_ASSOC);
                if ($uRow) {
                    $points = (int)($uRow['points'] ?? 0);
                    $totpEnabled = false;
                    $uPhone = normalize_phone($uRow['phone'] ?? '');
                    if ($uPhone !== '') {
                        $crmStmt = $pdo->prepare("SELECT customer_tier FROM customer_crm WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', '') = ? LIMIT 1");
                        $crmStmt->execute([$uPhone]);
                        $tCol = $crmStmt->fetchColumn();
                        if ($tCol) {
                            $customerTier = (string)$tCol;
                        }
                    }
                }
            } catch (Throwable $e) {}
        }
        if (isset($_SESSION['user']) && is_array($_SESSION['user'])) {
            $_SESSION['user']['points'] = $points;
            $_SESSION['user']['customer_tier'] = $customerTier;
            $_SESSION['user']['totp_enabled'] = $totpEnabled;
            if (isset($uRow)) {
                $_SESSION['user']['must_change_password'] = !empty($uRow['must_change_password']);
            }
            $_SESSION['user']['name'] = $_SESSION['user']['full_name'] ?? $_SESSION['user']['username'] ?? 'Hội viên';
            unset($_SESSION['user']['totp_secret']);
        }
        $isOperator = is_portal_operator($_SESSION['user'] ?? null);
        $customer = $isOperator ? null : currentCustomer($pdo);
        json_response([
            'success'            => true,
            'authenticated'      => true,
            'logged_in'          => true,
            'turnstile_site_key' => $siteKey,
            'user'               => $_SESSION['user'],
            'customer'           => $customer,
            'is_operator'        => $isOperator,
            'is_customer'        => !empty($customer),
            'csrf_token'         => generate_csrf_token()
        ]);
    } else {
        json_response([
            'success'            => true,
            'authenticated'      => false,
            'logged_in'          => false,
            'turnstile_site_key' => $siteKey,
            'user'               => null,
            'customer'           => null,
            'is_operator'        => false,
            'is_customer'        => false,
            'csrf_token'         => generate_csrf_token()
        ]);
    }
}

if ($action === 'logout') {
    if (strtoupper($method) !== 'POST') {
        json_response(['success' => false, 'message' => 'Phương thức không hợp lệ. Vui lòng gửi POST để đăng xuất.', 'ref_code' => 'ERR_METHOD_NOT_ALLOWED'], 405);
    }
    require_csrf_if_session_authenticated($data);
    destroy_current_session();
    json_response(['success' => true, 'message' => 'Đã đăng xuất thành công khỏi hệ thống.']);
}

if ($action === 'login') {
    if (strtoupper($method) !== 'POST') {
        json_response(['success' => false, 'message' => 'Phương thức không hợp lệ. Vui lòng gửi POST để đăng nhập.', 'ref_code' => 'ERR_METHOD_NOT_ALLOWED'], 405);
    }
    $turnstileToken = $data['turnstile_token'] ?? $data['cf-turnstile-response'] ?? null;
    if (!verify_turnstile_if_configured($turnstileToken)) {
        json_response(['success' => false, 'message' => 'Xác thực Turnstile (chống bot) không thành công. Vui lòng thử lại.', 'ref_code' => 'ERR_BOT_CHECK_FAILED'], 400);
    }

    $username = sanitize_string($data['username'] ?? $data['email'] ?? '', 100);
    $password = (string)($data['password'] ?? '');
    $acctRateKey = strtolower($username);

    if (!check_rate_limit($pdo, 'login', 5, 900) || ($acctRateKey !== '' && !check_rate_limit($pdo, 'login_acct', 5, 900, $acctRateKey))) {
        json_response(['success' => false, 'message' => 'Bạn đã đăng nhập sai quá 5 lần. Vui lòng thử lại sau ít phút để bảo vệ tài khoản.', 'ref_code' => 'ERR_RATE_LIMITED'], 429);
    }

    if (!empty($_COOKIE[session_name()]) && !verify_csrf_token($data)) {
        json_error('Phiên bảo mật không hợp lệ hoặc đã hết hạn. Vui lòng tải lại trang.', 403, 'ERR_CSRF_INVALID');
    }

    if (empty($username) || empty($password)) {
        json_response(['success' => false, 'message' => 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.', 'ref_code' => 'ERR_EMPTY_FIELDS'], 400);
    }

    loadEnv();
    $appEnv = strtolower(trim($_ENV['APP_ENV'] ?? getenv('APP_ENV') ?: 'production'));
    $allowDemoFallback = (strtolower(trim($_ENV['ALLOW_DEMO_FALLBACK'] ?? getenv('ALLOW_DEMO_FALLBACK') ?: '')) === 'true');

    if ($pdo === null || !$pdo) {
        if ($appEnv !== 'local' || !$allowDemoFallback) {
            json_response(['success' => false, 'message' => 'Hệ thống cơ sở dữ liệu tạm thời không khả dụng. Vui lòng thử lại sau.', 'ref_code' => 'ERR_DB_UNAVAILABLE'], 503);
        }

        $fallbackAccounts = [
            'user' => ['id' => 2, 'username' => 'user', 'email' => 'khachhang@sanbongpro.vn', 'phone' => '0000000002', 'full_name' => 'Trần Minh Hoàng', 'role' => 'user', 'hash' => '$argon2id$v=19$m=65536,t=4,p=1$MHgzSUtGQnA1dE54YUpkWA$iy5TrvTKjwRBOtNvuU/aF0JQ1Cn0eCDr4N1Z2q/ot5A'],
            '0000000002' => ['id' => 2, 'username' => 'user', 'email' => 'khachhang@sanbongpro.vn', 'phone' => '0000000002', 'full_name' => 'Trần Minh Hoàng', 'role' => 'user', 'hash' => '$argon2id$v=19$m=65536,t=4,p=1$MHgzSUtGQnA1dE54YUpkWA$iy5TrvTKjwRBOtNvuU/aF0JQ1Cn0eCDr4N1Z2q/ot5A']
        ];

        $lookupKey = strtolower($username);
        $account = $fallbackAccounts[$lookupKey] ?? null;

        if ($account && password_verify($password, $account['hash'])) {
            clear_rate_limit($pdo, 'login');
            if ($acctRateKey !== '') {
                clear_rate_limit($pdo, 'login_acct', $acctRateKey);
            }
            session_regenerate_id(true);
            $_SESSION['created_at'] = time();
            $_SESSION['last_activity'] = time();
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
            $_SESSION['user_id'] = $account['id'];
            $role = $account['role'];
            $_SESSION['user'] = [
                'id'        => $account['id'],
                'username'  => $account['username'],
                'email'     => $account['email'],
                'phone'     => $account['phone'],
                'full_name' => $account['full_name'],
                'role'      => $role,
                'points'    => 0,
                'customer_tier' => 'standard',
                'totp_enabled'  => false
            ];
            json_response([
                'success'  => true,
                'message'  => 'Đăng nhập thành công!',
                'user'     => $_SESSION['user'],
                'redirect' => in_array($role, ['admin', 'manager', 'staff'], true) ? 'portal-admin/' : 'history'
            ]);
        }

        increment_rate_limit($pdo, 'login');
        if ($acctRateKey !== '') {
            increment_rate_limit($pdo, 'login_acct', $acctRateKey);
        }
        json_response([
            'success'  => false,
            'message'  => 'Thông tin đăng nhập không chính xác.',
            'ref_code' => 'ERR_INVALID_CREDENTIALS'
        ], 401);
    }

    $cleanPhone = preg_replace('/[^0-9]/', '', $username);
    try {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? OR email = ? OR (phone = ? AND phone != '') ORDER BY (role = 'admin') DESC, id DESC LIMIT 1");
        $stmt->execute([$username, $username, $cleanPhone]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (Throwable $e) {
        error_log("[AUTH DB QUERY ERROR] " . $e->getMessage());
        json_response([
            'success'  => false,
            'message'  => 'Hệ thống cơ sở dữ liệu tạm thời không khả dụng. Vui lòng thử lại sau.',
            'ref_code' => 'ERR_DB_UNAVAILABLE'
        ], 503);
    }

    $now = time();
    $isLocked = false;
    if ($user && !empty($user['lock_until'])) {
        if (strtotime($user['lock_until']) > $now) {
            $isLocked = true;
        }
    }

    if ($isLocked) {
        increment_rate_limit($pdo, 'login');
        if ($acctRateKey !== '') {
            increment_rate_limit($pdo, 'login_acct', $acctRateKey);
        }
        json_response([
            'success'  => false,
            'message'  => 'Thông tin đăng nhập không chính xác hoặc tài khoản đang được bảo vệ tạm thời. Vui lòng thử lại sau.',
            'ref_code' => 'ERR_INVALID_CREDENTIALS'
        ], 401);
    }

    $loginSuccess = false;
    if ($user && ($user['status'] ?? 'active') === 'active') {
        $loginSuccess = password_verify($password, (string)$user['password_hash']);
    }

    if ($loginSuccess) {
        clear_rate_limit($pdo, 'login');
        if ($acctRateKey !== '') {
            clear_rate_limit($pdo, 'login_acct', $acctRateKey);
        }
        $resetStmt = $pdo->prepare("UPDATE users SET failed_attempts = 0, lock_until = NULL WHERE id = ?");
        $resetStmt->execute([$user['id']]);

        session_regenerate_id(true);
        $_SESSION['created_at'] = time();
        $_SESSION['last_activity'] = time();
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));

        $assignedRole = $user['role'] ?? 'user';
        $mustChange = !empty($user['must_change_password']);
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user'] = [
            'id'        => $user['id'],
            'username'  => $user['username'],
            'email'     => $user['email'],
            'phone'     => $user['phone'],
            'full_name' => $user['full_name'],
            'role'      => $assignedRole,
            'must_change_password' => $mustChange,
            'totp_enabled' => false
        ];

        $redirect = in_array($assignedRole, ['admin', 'manager', 'staff'], true) ? 'portal-admin/' : 'history';

        json_response([
            'success'  => true,
            'message'  => 'Đăng nhập thành công!',
            'user'     => $_SESSION['user'],
            'must_change_password' => $mustChange,
            'redirect' => $redirect
        ]);
    } else {
        increment_rate_limit($pdo, 'login');
        if ($acctRateKey !== '') {
            increment_rate_limit($pdo, 'login_acct', $acctRateKey);
        }
        if ($user) {
            $newAttempts = (int)($user['failed_attempts'] ?? 0) + 1;
            if ($newAttempts >= 5) {
                $lockDuration = 900;
                if ($newAttempts >= 10) {
                    $lockDuration = 3600;
                } elseif ($newAttempts >= 8) {
                    $lockDuration = 1800;
                }
                $lockTime = date('Y-m-d H:i:s', $now + $lockDuration);
                $lockStmt = $pdo->prepare("UPDATE users SET failed_attempts = ?, lock_until = ? WHERE id = ?");
                $lockStmt->execute([$newAttempts, $lockTime, $user['id']]);
            } else {
                $lockStmt = $pdo->prepare("UPDATE users SET failed_attempts = ? WHERE id = ?");
                $lockStmt->execute([$newAttempts, $user['id']]);
            }
        }

        // Thông báo lỗi chung 401 đồng nhất (chống user enumeration)
        json_response([
            'success'  => false,
            'message'  => 'Thông tin đăng nhập không chính xác.',
            'ref_code' => 'ERR_INVALID_CREDENTIALS'
        ], 401);
    }
}

if ($action === 'verify_2fa') {
    if (strtoupper($method) !== 'POST') {
        json_error('Phương thức không hợp lệ. Vui lòng gửi POST.', 405, 'ERR_METHOD_NOT_ALLOWED');
    }
    if (!check_rate_limit($pdo, 'verify_2fa', 5, 300)) {
        json_response([
            'success'  => false,
            'message'  => 'Bạn đã nhập sai mã OTP quá 5 lần. Vui lòng thử lại sau 5 phút.',
            'ref_code' => 'ERR_RATE_LIMITED'
        ], 429);
    }
    $pendingId = $_SESSION['pending_2fa_user_id'] ?? null;
    $pendingExp = $_SESSION['pending_2fa_expires'] ?? 0;
    if (!$pendingId || time() > $pendingExp) {
        json_response([
            'success'  => false,
            'message'  => 'Phiên xác thực 2FA đã hết hạn. Vui lòng đăng nhập lại.',
            'ref_code' => 'ERR_2FA_EXPIRED'
        ], 401);
    }
    $otp = trim((string)($data['otp'] ?? $data['code'] ?? ''));
    if ($otp === '') {
        json_error('Vui lòng nhập mã OTP 6 chữ số.', 400, 'ERR_EMPTY_OTP');
    }
    if (!$pdo) {
        json_error('Cơ sở dữ liệu không khả dụng.', 503, 'ERR_DB_UNAVAILABLE');
    }
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ? LIMIT 1");
    $stmt->execute([$pendingId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user || empty($user['totp_secret'])) {
        json_error('Không tìm thấy thông tin cấu hình 2FA của tài khoản.', 400, 'ERR_2FA_NOT_FOUND');
    }
    if (!totp_verify_code((string)$user['totp_secret'], $otp, 1)) {
        increment_rate_limit($pdo, 'verify_2fa');
        json_response([
            'success'  => false,
            'message'  => 'Mã xác thực OTP không chính xác hoặc đã hết hạn.',
            'ref_code' => 'ERR_INVALID_OTP'
        ], 401);
    }
    clear_rate_limit($pdo, 'verify_2fa');
    unset($_SESSION['pending_2fa_user_id'], $_SESSION['pending_2fa_expires']);

    session_regenerate_id(true);
    $_SESSION['created_at'] = time();
    $_SESSION['last_activity'] = time();
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    $_SESSION['user_id'] = $user['id'];
    $role = $user['role'] ?? 'user';
    $mustChange = !empty($user['must_change_password']);
    $_SESSION['user'] = [
        'id'        => $user['id'],
        'username'  => $user['username'],
        'email'     => $user['email'],
        'phone'     => $user['phone'],
        'full_name' => $user['full_name'],
        'role'      => $role,
        'must_change_password' => $mustChange
    ];

    json_response([
        'success'  => true,
        'message'  => 'Xác thực 2 lớp thành công! Đang chuyển hướng...',
        'user'     => $_SESSION['user'],
        'must_change_password' => $mustChange,
        'redirect' => in_array($role, ['admin', 'manager', 'staff'], true) ? 'portal-admin/' : 'history'
    ]);
}

if ($action === 'setup_2fa') {
    if (strtoupper($method) !== 'POST') {
        json_error('Phương thức không hợp lệ. Vui lòng gửi POST.', 405, 'ERR_METHOD_NOT_ALLOWED');
    }
    require_csrf_if_session_authenticated($data);
    $staffUser = require_staff_or_admin($pdo);

    $secret = totp_generate_secret(16);
    $_SESSION['temp_totp_secret'] = $secret;
    $accountName = $staffUser['username'] ?? ('user_' . $staffUser['id']);
    $qrUri = totp_provisioning_uri($accountName, $secret, 'SanBongPro');

    json_response([
        'success' => true,
        'secret'  => $secret,
        'qr_uri'  => $qrUri,
        'message' => 'Đã tạo khóa bảo mật 2FA. Vui lòng quét mã QR hoặc nhập khóa vào Authenticator rồi xác nhận.'
    ]);
}

if ($action === 'confirm_2fa') {
    if (strtoupper($method) !== 'POST') {
        json_error('Phương thức không hợp lệ. Vui lòng gửi POST.', 405, 'ERR_METHOD_NOT_ALLOWED');
    }
    require_csrf_if_session_authenticated($data);
    $staffUser = require_staff_or_admin($pdo);

    $secret = $_SESSION['temp_totp_secret'] ?? '';
    if ($secret === '') {
        json_error('Chưa có mã khởi tạo 2FA. Vui lòng nhấn Thiết lập 2FA lại.', 400, 'ERR_NO_TEMP_SECRET');
    }
    $otp = trim((string)($data['code'] ?? $data['otp'] ?? ''));
    if (!totp_verify_code($secret, $otp, 1)) {
        json_response([
            'success'  => false,
            'message'  => 'Mã OTP không chính xác. Vui lòng thử lại.',
            'ref_code' => 'ERR_INVALID_OTP'
        ], 400);
    }

    try {
        if (!db_table_has_column($pdo, 'users', 'totp_secret')) {
            $pdo->exec("ALTER TABLE `users` ADD COLUMN `totp_secret` VARCHAR(64) NULL DEFAULT NULL AFTER `password_hash`");
        }
        if (!db_table_has_column($pdo, 'users', 'totp_enabled')) {
            $pdo->exec("ALTER TABLE `users` ADD COLUMN `totp_enabled` TINYINT(1) NOT NULL DEFAULT 0 AFTER `totp_secret`");
        }
        $upd = $pdo->prepare("UPDATE users SET totp_secret = ?, totp_enabled = 1 WHERE id = ?");
        $upd->execute([$secret, $staffUser['id']]);
        unset($_SESSION['temp_totp_secret']);

        write_audit_log($pdo, 'ENABLE_2FA', null, '0', '1', $staffUser);
        json_response([
            'success' => true,
            'message' => 'Đã kích hoạt xác thực 2 lớp (2FA) thành công!'
        ]);
    } catch (Throwable $e) {
        error_log("[CONFIRM 2FA ERROR] " . $e->getMessage());
        json_error('Không thể cập nhật cấu hình 2FA vào cơ sở dữ liệu.', 500, 'ERR_DB');
    }
}

if ($action === 'disable_2fa') {
    if (strtoupper($method) !== 'POST') {
        json_error('Phương thức không hợp lệ. Vui lòng gửi POST.', 405, 'ERR_METHOD_NOT_ALLOWED');
    }
    require_csrf_if_session_authenticated($data);
    $currentUser = require_auth($pdo);
    $password = (string)($data['password'] ?? '');
    $otp = trim((string)($data['code'] ?? $data['otp'] ?? ''));

    if (!$pdo) {
        json_error('Cơ sở dữ liệu không khả dụng.', 503, 'ERR_DB_UNAVAILABLE');
    }
    $uStmt = $pdo->prepare("SELECT * FROM users WHERE id = ? LIMIT 1");
    $uStmt->execute([$currentUser['id']]);
    $uRow = $uStmt->fetch(PDO::FETCH_ASSOC);

    if (!$uRow || !password_verify($password, (string)$uRow['password_hash'])) {
        json_error('Mật khẩu tài khoản không chính xác.', 401, 'ERR_INVALID_PASSWORD');
    }
    if (!empty($uRow['totp_secret']) && !totp_verify_code((string)$uRow['totp_secret'], $otp, 1)) {
        json_error('Mã OTP xác nhận không hợp lệ.', 401, 'ERR_INVALID_OTP');
    }

    try {
        $upd = $pdo->prepare("UPDATE users SET totp_enabled = 0, totp_secret = NULL WHERE id = ?");
        $upd->execute([$currentUser['id']]);
        write_audit_log($pdo, 'DISABLE_2FA', null, '1', '0', $currentUser);
        json_response([
            'success' => true,
            'message' => 'Đã hủy kích hoạt bảo mật 2 lớp.'
        ]);
    } catch (Throwable $e) {
        error_log("[DISABLE 2FA ERROR] " . $e->getMessage());
        json_error('Không thể tắt 2FA.', 500, 'ERR_DB');
    }
}

if ($action === 'change_password') {
    if (strtoupper($method) !== 'POST') {
        json_response(['success' => false, 'message' => 'Phương thức không hợp lệ. Vui lòng gửi POST để đổi mật khẩu.', 'ref_code' => 'ERR_METHOD_NOT_ALLOWED'], 405);
    }
    if (empty($_SESSION['user_id'])) {
        json_response(['success' => false, 'message' => 'Vui lòng đăng nhập để thực hiện đổi mật khẩu.', 'ref_code' => 'ERR_UNAUTHORIZED'], 401);
    }
    require_csrf_if_session_authenticated($data);
    if (!$pdo) {
        json_response(['success' => false, 'message' => 'Cơ sở dữ liệu tạm thời không khả dụng. Vui lòng thử lại sau.', 'ref_code' => 'ERR_DB_UNAVAILABLE'], 503);
    }

    $oldPassword = (string)($data['old_password'] ?? $data['current_password'] ?? '');
    $newPassword = (string)($data['new_password'] ?? $data['password'] ?? '');

    if (empty($oldPassword) || empty($newPassword)) {
        json_response(['success' => false, 'message' => 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.', 'ref_code' => 'ERR_EMPTY_FIELDS'], 400);
    }

    if (strlen($newPassword) < 8) {
        json_response(['success' => false, 'message' => 'Mật khẩu mới phải có tối thiểu 8 ký tự.', 'ref_code' => 'ERR_WEAK_PASSWORD'], 400);
    }

    $userId = (int)$_SESSION['user_id'];
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ? LIMIT 1");
    $stmt->execute([$userId]);
    $currentUser = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$currentUser || !password_verify($oldPassword, (string)($currentUser['password_hash'] ?? ''))) {
        json_response(['success' => false, 'message' => 'Mật khẩu hiện tại không chính xác.', 'ref_code' => 'ERR_INVALID_PASSWORD'], 400);
    }

    $newHash = password_hash($newPassword, PASSWORD_ARGON2ID);
    try {
        $upd = $pdo->prepare("UPDATE users SET password_hash = ?, must_change_password = 0, failed_attempts = 0, lock_until = NULL WHERE id = ?");
        $upd->execute([$newHash, $userId]);
        session_regenerate_id(true);
        if (isset($_SESSION['user']) && is_array($_SESSION['user'])) {
            $_SESSION['user']['must_change_password'] = false;
        }
        write_audit_log($pdo, 'CHANGE_PASSWORD', null, 'must_change_password=1', 'must_change_password=0', $currentUser);
        json_response([
            'success' => true,
            'message' => 'Đổi mật khẩu thành công!'
        ]);
    } catch (Throwable $e) {
        error_log("[CHANGE PASSWORD ERROR] " . $e->getMessage());
        json_response(['success' => false, 'message' => 'Không thể cập nhật mật khẩu vào cơ sở dữ liệu.', 'ref_code' => 'ERR_DB'], 500);
    }
}

if ($action === 'update_profile') {
    if (strtoupper($method) !== 'POST') {
        json_response(['success' => false, 'message' => 'Phương thức không hợp lệ. Vui lòng gửi POST để cập nhật hồ sơ.', 'ref_code' => 'ERR_METHOD_NOT_ALLOWED'], 405);
    }
    if (empty($_SESSION['user_id'])) {
        json_response(['success' => false, 'message' => 'Vui lòng đăng nhập để cập nhật thông tin tài khoản.', 'ref_code' => 'ERR_UNAUTHORIZED'], 401);
    }
    require_csrf_if_session_authenticated($data);
    if (!$pdo) {
        json_response(['success' => false, 'message' => 'Cơ sở dữ liệu tạm thời không khả dụng. Vui lòng thử lại sau.', 'ref_code' => 'ERR_DB_UNAVAILABLE'], 503);
    }

    $fullName = sanitize_string($data['full_name'] ?? $data['fullName'] ?? '', 100);
    $phone = normalize_phone(sanitize_string($data['phone'] ?? '', 25));
    $password = (string)($data['password'] ?? '');

    if (mb_strlen($fullName) < 2 || mb_strlen($fullName) > 60) {
        json_response(['success' => false, 'message' => 'Họ và tên phải từ 2 đến 60 ký tự.', 'ref_code' => 'ERR_INVALID_NAME'], 400);
    }

    $userId = (int)$_SESSION['user_id'];
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ? LIMIT 1");
    $stmt->execute([$userId]);
    $currentUser = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$currentUser) {
        json_response(['success' => false, 'message' => 'Không tìm thấy người dùng.', 'ref_code' => 'ERR_USER_NOT_FOUND'], 404);
    }

    $oldPhone = normalize_phone($currentUser['phone'] ?? '');
    $phoneChanged = ($phone !== '' && $phone !== $oldPhone);

    if ($phoneChanged) {
        if (!preg_match('/^0\d{9}$/', $phone)) {
            json_response(['success' => false, 'message' => 'Số điện thoại không hợp lệ (cần đúng 10 chữ số).', 'ref_code' => 'ERR_INVALID_PHONE'], 400);
        }
        if (empty($password) || !password_verify($password, (string)($currentUser['password_hash'] ?? ''))) {
            json_response(['success' => false, 'message' => 'Đổi số điện thoại bắt buộc phải nhập đúng mật khẩu tài khoản hiện tại.', 'ref_code' => 'ERR_INVALID_PASSWORD'], 400);
        }
        $dupStmt = $pdo->prepare("SELECT id FROM users WHERE phone = ? AND id != ? LIMIT 1");
        $dupStmt->execute([$phone, $userId]);
        if ($dupStmt->fetch()) {
            json_response(['success' => false, 'message' => 'Số điện thoại này đã được sử dụng bởi một tài khoản khác.', 'ref_code' => 'ERR_PHONE_IN_USE'], 400);
        }
    } else {
        $phone = $oldPhone;
    }

    try {
        $upd = $pdo->prepare("UPDATE users SET full_name = ?, phone = ? WHERE id = ?");
        $upd->execute([$fullName, $phone, $userId]);

        $_SESSION['user_name'] = $fullName;
        $_SESSION['user_phone'] = $phone;
        if (isset($_SESSION['user']) && is_array($_SESSION['user'])) {
            $_SESSION['user']['full_name'] = $fullName;
            $_SESSION['user']['name'] = $fullName;
            $_SESSION['user']['phone'] = $phone;
        }

        write_audit_log($pdo, 'UPDATE_PROFILE', (string)$userId, "name={$currentUser['full_name']}|phone={$oldPhone}", "name={$fullName}|phone={$phone}", $currentUser);

        json_response([
            'success' => true,
            'message' => 'Cập nhật thông tin tài khoản thành công!',
            'data' => [
                'id' => $userId,
                'full_name' => $fullName,
                'phone' => $phone
            ]
        ]);
    } catch (Throwable $e) {
        error_log("[UPDATE PROFILE ERROR] " . $e->getMessage());
        json_response(['success' => false, 'message' => 'Lỗi hệ thống khi cập nhật hồ sơ.', 'ref_code' => 'ERR_DB'], 500);
    }
}

if ($action === 'register') {
    if (strtoupper($method) !== 'POST') {
        json_response(['success' => false, 'message' => 'Phương thức không hợp lệ. Vui lòng gửi POST để đăng ký.', 'ref_code' => 'ERR_METHOD_NOT_ALLOWED'], 405);
    }
    $privacyConsent = !empty($data['privacy_consent']) || !empty($data['privacyConsent']);
    if (!$privacyConsent) {
        json_response(['success' => false, 'message' => 'Vui lòng đọc và tích chọn đồng ý với Chính sách bảo mật & Điều khoản dịch vụ.', 'ref_code' => 'ERR_PRIVACY_CONSENT_REQUIRED'], 422);
    }

    $turnstileToken = $data['turnstile_token'] ?? $data['cf-turnstile-response'] ?? null;
    if (!verify_turnstile_if_configured($turnstileToken)) {
        json_response(['success' => false, 'message' => 'Xác thực Turnstile (chống bot) không thành công. Vui lòng thử lại.', 'ref_code' => 'ERR_BOT_CHECK_FAILED'], 400);
    }

    if (!check_rate_limit($pdo, 'register', 3, 300)) {
        json_response(['success' => false, 'message' => 'Thao tác quá nhanh. Vui lòng thử lại sau ít phút.', 'ref_code' => 'ERR_RATE_LIMITED'], 429);
    }

    if (!empty($_COOKIE[session_name()]) && !verify_csrf_token($data)) {
        json_error('Phiên bảo mật không hợp lệ hoặc đã hết hạn. Vui lòng tải lại trang.', 403, 'ERR_CSRF_INVALID');
    }
    increment_rate_limit($pdo, 'register');

    $username = sanitize_string($data['username'] ?? '', 50);
    $email = filter_var($data['email'] ?? '', FILTER_VALIDATE_EMAIL);
    $phone = sanitize_string($data['phone'] ?? '', 20);
    $fullName = sanitize_string($data['full_name'] ?? $username, 100);
    $password = (string)($data['password'] ?? '');

    if (empty($username) || !$email || empty($phone) || empty($password)) {
        json_response([
            'success'  => false,
            'message'  => 'Vui lòng cung cấp đầy đủ và chính xác thông tin đăng ký.',
            'ref_code' => 'ERR_INVALID_DATA'
        ], 400);
    }

    $phone = str_replace(' ', '', $phone);
    if (!preg_match('/^0[35789]\d{8}$/', $phone)) {
        json_response([
            'success'  => false,
            'message'  => 'Số điện thoại không đúng định dạng di động 10 số.',
            'ref_code' => 'ERR_PHONE_FORMAT'
        ], 400);
    }

    if (strlen($password) < 8) {
        json_response([
            'success'  => false,
            'message'  => 'Mật khẩu phải có tối thiểu 8 ký tự.',
            'ref_code' => 'ERR_WEAK_PASSWORD'
        ], 400);
    }

    if (!$pdo) {
        json_response([
            'success'  => false,
            'message'  => 'Hệ thống đang bảo trì cơ sở dữ liệu. Vui lòng thử lại sau.',
            'ref_code' => 'ERR_DB_UNAVAILABLE'
        ], 503);
    }

    $checkStmt = $pdo->prepare("SELECT id FROM users WHERE phone = ? OR username = ? OR email = ? LIMIT 1");
    $checkStmt->execute([$phone, $username, $email]);
    if ($checkStmt->fetch()) {
        json_response([
            'success'  => false,
            'message'  => 'Không thể hoàn tất đăng ký với thông tin đã nhập. Vui lòng kiểm tra lại.',
            'ref_code' => 'ERR_USER_EXISTS'
        ], 409);
    }

    $passwordHash = password_hash($password, PASSWORD_ARGON2ID, [
        'memory_cost' => 65536,
        'time_cost'   => 4,
        'threads'     => 1
    ]);

    $hasPrivacy = db_table_has_column($pdo, 'users', 'privacy_consent_at');
    $hasPoints  = db_table_has_column($pdo, 'users', 'points');

    $cols = ['username', 'email', 'phone', 'full_name', 'password_hash', 'role', 'status'];
    $vals = [$username, $email, $phone, $fullName, $passwordHash, 'user', 'active'];

    if ($hasPrivacy) {
        $cols[] = 'privacy_consent_at';
        $vals[] = date('Y-m-d H:i:s');
    }
    if ($hasPoints) {
        $cols[] = 'points';
        $vals[] = 0;
    }

    $colSql = '`' . implode('`, `', $cols) . '`';
    $phSql  = implode(', ', array_fill(0, count($cols), '?'));
    $insStmt = $pdo->prepare("INSERT INTO users ({$colSql}) VALUES ({$phSql})");
    $insStmt->execute($vals);

    $newUserId = (int)$pdo->lastInsertId();

    session_regenerate_id(true);
    $_SESSION['created_at'] = time();
    $_SESSION['last_activity'] = time();
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    $_SESSION['user_id'] = $newUserId;
    $_SESSION['user'] = [
        'id'            => $newUserId,
        'username'      => $username,
        'email'         => $email,
        'phone'         => $phone,
        'full_name'     => $fullName,
        'role'          => 'user',
        'points'        => 0,
        'customer_tier' => 'standard',
        'totp_enabled'  => false
    ];

    json_response([
        'success'  => true,
        'message'  => 'Đăng ký tài khoản thành công!',
        'user'     => $_SESSION['user'],
        'redirect' => 'history'
    ], 201);
}

if ($action === 'forgot_password') {
    if (!$pdo instanceof PDO) {
        json_error('Không thể kết nối cơ sở dữ liệu. Vui lòng thử lại sau.', 503, 'ERR_DB_UNAVAILABLE');
    }
    require_once __DIR__ . '/services/forgot_password_service.php';
    handle_forgot_password($pdo, $data);
}

json_response([
    'success'  => false,
    'message'  => 'Hành động không hợp lệ.',
    'ref_code' => 'ERR_INVALID_ACTION'
], 400);
