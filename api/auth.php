<?php
/**
 * SÂN BÓNG PRO - API XÁC THỰC BẢO MẬT (api/auth.php)
 * - Mật khẩu hash Argon2id (PASSWORD_ARGON2ID)
 * - Rate Limiting chống Brute Force (5 lần / 15 phút)
 * - Thông báo lỗi chung, chống Enumeration
 * - Tái tạo Session ID chống Session Fixation
 */

require_once __DIR__ . '/security_helper.php';

secure_session_start();
$pdo = getDBConnection(false);
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

// Nhận dữ liệu JSON nếu gửi qua Fetch API
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

// 1. LẤY THÔNG TIN PHIÊN ĐĂNG NHẬP (GET /api/auth.php?action=me)
if ($method === 'GET' && $action === 'me') {
    if (!empty($_SESSION['user_id'])) {
        json_response([
            'success'   => true,
            'logged_in' => true,
            'user'      => $_SESSION['user']
        ]);
    } else {
        json_response([
            'success'   => true,
            'logged_in' => false,
            'user'      => null
        ]);
    }
}

// 2. ĐĂNG XUẤT (POST /api/auth.php?action=logout)
if ($action === 'logout') {
    $_SESSION = [];
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    session_destroy();
    json_response([
        'success' => true,
        'message' => 'Đã đăng xuất thành công khỏi hệ thống.'
    ]);
}

// 3. ĐĂNG NHẬP (POST /api/auth.php?action=login)
if ($action === 'login') {
    // Kiểm tra Rate Limit chống brute-force (Hỗ trợ cả CSDL và file fallback khi $pdo === null)
    if (!check_rate_limit($pdo, 'login', 5, 15)) {
        json_response([
            'success'  => false,
            'message'  => 'Bạn đã đăng nhập sai quá 5 lần. Vui lòng thử lại sau 15 phút để bảo vệ tài khoản.',
            'ref_code' => 'ERR_RATE_LIMITED'
        ], 429);
    }

    $username = sanitize_string($data['username'] ?? $data['email'] ?? '', 100);
    $password = (string)($data['password'] ?? '');

    if (empty($username) || empty($password)) {
        json_response([
            'success'  => false,
            'message'  => 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.',
            'ref_code' => 'ERR_EMPTY_FIELDS'
        ], 400);
    }

    // Nếu môi trường Hosting chưa bật MySQL ($pdo === null), xác thực qua bảng tra cứu Argon2id chuẩn
    if (!$pdo) {
        $fallbackAccounts = [
            'admin' => [
                'id'        => 1,
                'username'  => 'admin',
                'email'     => 'admin@sanbongpro.vn',
                'phone'     => '0987654321',
                'full_name' => 'Nguyễn Văn Hùng (Chủ Sân)',
                'role'      => 'admin',
                'hash'      => '$argon2id$v=19$m=65536,t=4,p=1$SUpYZlUyT2FoY0V4L3NsVg$4E1a7uqFzUM7/odFJ1d4jg23P6cc0hH4SrTPDI2zUEU'
            ],
            'user' => [
                'id'        => 2,
                'username'  => 'user',
                'email'     => 'khachhang@sanbongpro.vn',
                'phone'     => '0352313548',
                'full_name' => 'Trần Minh Hoàng',
                'role'      => 'user',
                'hash'      => '$argon2id$v=19$m=65536,t=4,p=1$aVNqalJJSE5FMVN4b2YvaQ$7HiLuSfwNyejQCN9iT24mOGZiIpajMBrxFpY01kbgq4'
            ],
            '0352313548' => [
                'id'        => 2,
                'username'  => 'user',
                'email'     => 'khachhang@sanbongpro.vn',
                'phone'     => '0352313548',
                'full_name' => 'Trần Minh Hoàng',
                'role'      => 'user',
                'hash'      => '$argon2id$v=19$m=65536,t=4,p=1$aVNqalJJSE5FMVN4b2YvaQ$7HiLuSfwNyejQCN9iT24mOGZiIpajMBrxFpY01kbgq4'
            ],
            'vxyen0801' => [
                'id'        => 3,
                'username'  => 'vxyen0801',
                'email'     => 'vxyen0801@sanbongpro.vn',
                'phone'     => '0352313548',
                'full_name' => 'Quản Trị Viên (vxyen0801)',
                'role'      => 'admin',
                'hash'      => '$argon2id$v=19$m=65536,t=4,p=1$UThRTGkvdndJYXdBVHBDUg$bvWQoJidWljt12fhtDaAYPay1LhfDvc1B2+5jPEkPE4'
            ]
        ];

        $lookupKey = strtolower($username);
        $account = $fallbackAccounts[$lookupKey] ?? null;

        if ($account && password_verify($password, $account['hash'])) {
            clear_rate_limit($pdo, 'login');
            session_regenerate_id(true);
            $_SESSION['user_id'] = $account['id'];
            $_SESSION['user'] = [
                'id'        => $account['id'],
                'username'  => $account['username'],
                'email'     => $account['email'],
                'phone'     => $account['phone'],
                'full_name' => $account['full_name'],
                'role'      => $account['role']
            ];
            json_response([
                'success'  => true,
                'message'  => 'Đăng nhập thành công!',
                'user'     => $_SESSION['user'],
                'redirect' => ($account['role'] === 'admin') ? 'portal-admin/' : 'history'
            ]);
        }

        increment_rate_limit($pdo, 'login');
        json_response([
            'success'  => false,
            'message'  => 'Thông tin đăng nhập không chính xác. Vui lòng kiểm tra lại.',
            'ref_code' => 'ERR_INVALID_CREDENTIALS'
        ], 401);
    }

    // Truy vấn thông tin người dùng qua Prepared Statement
    $stmt = $pdo->prepare("SELECT id, username, email, phone, full_name, password_hash, role, status, failed_attempts, lock_until FROM users WHERE username = ? OR email = ? LIMIT 1");
    $stmt->execute([$username, $username]);
    $user = $stmt->fetch();

    $now = time();
    $isLocked = false;
    if ($user && !empty($user['lock_until'])) {
        if (strtotime($user['lock_until']) > $now) {
            $isLocked = true;
        }
    }

    if ($isLocked) {
        json_response([
            'success'  => false,
            'message'  => 'Tài khoản đang bị tạm khóa do nhập sai nhiều lần. Vui lòng thử lại sau.',
            'ref_code' => 'ERR_ACCOUNT_LOCKED'
        ], 429);
    }

    // Xác thực mật khẩu
    $loginSuccess = false;
    if ($user && password_verify($password, $user['password_hash'])) {
        $loginSuccess = true;
    }

    if ($loginSuccess) {
        // Đăng nhập thành công -> Reset số lần sai & Xóa cờ phạt
        clear_rate_limit($pdo, 'login');
        $resetStmt = $pdo->prepare("UPDATE users SET failed_attempts = 0, lock_until = NULL WHERE id = ?");
        $resetStmt->execute([$user['id']]);

        // Tái tạo Session ID để chống Session Fixation
        session_regenerate_id(true);

        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user'] = [
            'id'        => $user['id'],
            'username'  => $user['username'],
            'email'     => $user['email'],
            'phone'     => $user['phone'],
            'full_name' => $user['full_name'],
            'role'      => $user['role']
        ];

        json_response([
            'success' => true,
            'message' => 'Đăng nhập thành công!',
            'user'    => $_SESSION['user'],
            'redirect' => ($user['role'] === 'admin') ? 'portal-admin/' : 'history'
        ]);
    } else {
        // Đăng nhập thất bại -> Ghi nhận lần sai (Rate Limit + DB Account)
        increment_rate_limit($pdo, 'login');
        if ($user) {
            $newAttempts = $user['failed_attempts'] + 1;
            if ($newAttempts >= 5) {
                $lockTime = date('Y-m-d H:i:s', $now + 900); // Khóa 15 phút
                $lockStmt = $pdo->prepare("UPDATE users SET failed_attempts = ?, lock_until = ? WHERE id = ?");
                $lockStmt->execute([$newAttempts, $lockTime, $user['id']]);
            } else {
                $lockStmt = $pdo->prepare("UPDATE users SET failed_attempts = ? WHERE id = ?");
                $lockStmt->execute([$newAttempts, $user['id']]);
            }
        }

        // Thông báo lỗi chung chung (Không tiết lộ tài khoản có tồn tại hay không)
        json_response([
            'success'  => false,
            'message'  => 'Thông tin đăng nhập không chính xác. Vui lòng kiểm tra lại.',
            'ref_code' => 'ERR_INVALID_CREDENTIALS'
        ], 401);
    }
}

// 4. ĐĂNG KÝ (POST /api/auth.php?action=register)
if ($action === 'register') {
    if (!check_rate_limit($pdo, 'register', 3, 300)) {
        json_response([
            'success'  => false,
            'message'  => 'Thao tác quá nhanh. Vui lòng thử lại sau ít phút.',
            'ref_code' => 'ERR_RATE_LIMITED'
        ], 429);
    }

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

    // Kiểm tra định dạng số điện thoại Việt Nam
    if (!preg_match('/^(0[3|5|7|8|9])[0-9]{8}$/', str_replace(' ', '', $phone))) {
        json_response([
            'success'  => false,
            'message'  => 'Số điện thoại không đúng định dạng di động 10 số.',
            'ref_code' => 'ERR_PHONE_FORMAT'
        ], 400);
    }

    // Độ dài và độ phức tạp mật khẩu: tối thiểu 8 ký tự
    if (strlen($password) < 8) {
        json_response([
            'success'  => false,
            'message'  => 'Mật khẩu phải có tối thiểu 8 ký tự.',
            'ref_code' => 'ERR_WEAK_PASSWORD'
        ], 400);
    }

    // Kiểm tra trùng username hoặc email
    $checkStmt = $pdo->prepare("SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1");
    $checkStmt->execute([$username, $email]);
    if ($checkStmt->fetch()) {
        json_response([
            'success'  => false,
            'message'  => 'Tên đăng nhập hoặc email này đã tồn tại trên hệ thống.',
            'ref_code' => 'ERR_USER_EXISTS'
        ], 409);
    }

    // Fallback nếu máy chủ chưa kích hoạt MySQL ($pdo === null)
    if (!$pdo) {
        $newUserId = time();
        session_regenerate_id(true);
        $_SESSION['user_id'] = $newUserId;
        $_SESSION['user'] = [
            'id'        => $newUserId,
            'username'  => $username,
            'email'     => $email,
            'phone'     => $phone,
            'full_name' => $fullName,
            'role'      => 'user',
            'points'    => 0,
            'tier'      => 'Hội viên'
        ];

        json_response([
            'success'  => true,
            'message'  => 'Đăng ký tài khoản thành công!',
            'user'     => $_SESSION['user'],
            'redirect' => 'history'
        ], 201);
    }

    // Hash mật khẩu bằng Argon2id
    $passwordHash = password_hash($password, PASSWORD_ARGON2ID, [
        'memory_cost' => 65536,
        'time_cost'   => 4,
        'threads'     => 1
    ]);

    $insStmt = $pdo->prepare("INSERT INTO users (username, email, phone, full_name, password_hash, role, status) VALUES (?, ?, ?, ?, ?, 'user', 'active')");
    $insStmt->execute([$username, $email, $phone, $fullName, $passwordHash]);

    $newUserId = $pdo->lastInsertId();

    // Tự động đăng nhập
    session_regenerate_id(true);
    $_SESSION['user_id'] = $newUserId;
    $_SESSION['user'] = [
        'id'        => $newUserId,
        'username'  => $username,
        'email'     => $email,
        'phone'     => $phone,
        'full_name' => $fullName,
        'role'      => 'user'
    ];

    json_response([
        'success'  => true,
        'message'  => 'Đăng ký tài khoản thành công!',
        'user'     => $_SESSION['user'],
        'redirect' => 'history'
    ], 201);
}

json_response([
    'success'  => false,
    'message'  => 'Hành động không hợp lệ.',
    'ref_code' => 'ERR_INVALID_ACTION'
], 400);
