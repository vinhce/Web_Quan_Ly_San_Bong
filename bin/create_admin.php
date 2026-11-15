<?php
/**
 * Công cụ CLI khởi tạo / cập nhật tài khoản quản trị viên (Admin)
 * Đảm bảo mật khẩu được băm Argon2id và bắt buộc đổi mật khẩu lần đầu (must_change_password = 1).
 */

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only');
}

if (is_file(__DIR__ . '/../config/database.php')) {
    require_once __DIR__ . '/../config/database.php';
} elseif (is_file(__DIR__ . '/../public_html/config/database.php')) {
    require_once __DIR__ . '/../public_html/config/database.php';
} else {
    fwrite(STDERR, "[LỖI] Không tìm thấy config/database.php\n");
    exit(1);
}

loadEnv();

$options = getopt('', [
    'username:',
    'email:',
    'password:',
    'phone:',
    'fullname:'
]);

$username = trim($options['username'] ?? $_ENV['INITIAL_ADMIN_USERNAME'] ?? getenv('INITIAL_ADMIN_USERNAME') ?: '');
$email    = trim($options['email'] ?? $_ENV['INITIAL_ADMIN_EMAIL'] ?? getenv('INITIAL_ADMIN_EMAIL') ?: '');
$password = trim($options['password'] ?? $_ENV['INITIAL_ADMIN_PASSWORD'] ?? getenv('INITIAL_ADMIN_PASSWORD') ?: '');
$phone    = trim($options['phone'] ?? $_ENV['INITIAL_ADMIN_PHONE'] ?? getenv('INITIAL_ADMIN_PHONE') ?: '0987654321');
$fullName = trim($options['fullname'] ?? $_ENV['INITIAL_ADMIN_FULLNAME'] ?? getenv('INITIAL_ADMIN_FULLNAME') ?: 'Quản Trị Viên Hệ Thống');

if (empty($username) || empty($email) || empty($password)) {
    echo "===============================================================\n";
    echo "  SANBONGPRO - CLI TẠO TÀI KHOẢN QUẢN TRỊ VIÊN (ADMIN)\n";
    echo "===============================================================\n";
    echo "Cách dùng qua tham số dòng lệnh:\n";
    echo "  php bin/create_admin.php --username=admin --email=admin@sanbongpro.vn --password=MatKhauBaoMat123!\n\n";
    echo "Hoặc thiết lập biến môi trường (.env):\n";
    echo "  INITIAL_ADMIN_USERNAME=admin\n";
    echo "  INITIAL_ADMIN_EMAIL=admin@sanbongpro.vn\n";
    echo "  INITIAL_ADMIN_PASSWORD=MatKhauBaoMat123!\n";
    echo "===============================================================\n";
    exit(1);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fwrite(STDERR, "[LỖI] Địa chỉ email '{$email}' không hợp lệ.\n");
    exit(1);
}

if (strlen($password) < 8) {
    fwrite(STDERR, "[LỖI] Mật khẩu phải có độ dài tối thiểu 8 ký tự.\n");
    exit(1);
}

$pdo = getDBConnection(false);
if (!$pdo) {
    fwrite(STDERR, "[LỖI] Không thể kết nối cơ sở dữ liệu. Vui lòng kiểm tra cấu hình DB trong .env.\n");
    exit(1);
}

// Băm mật khẩu an toàn với Argon2id
$hash = password_hash($password, PASSWORD_ARGON2ID, [
    'memory_cost' => 65536,
    'time_cost'   => 4,
    'threads'     => 1
]);

try {
    $stmt = $pdo->prepare("SELECT id, username, email FROM users WHERE username = ? OR email = ? LIMIT 1");
    $stmt->execute([$username, $email]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($existing) {
        $upd = $pdo->prepare("UPDATE users SET password_hash = ?, role = 'admin', status = 'active', must_change_password = 1, failed_attempts = 0, lock_until = NULL WHERE id = ?");
        $upd->execute([$hash, $existing['id']]);
        echo "[SUCCESS] Đã cập nhật tài khoản quản trị viên hiện có:\n";
        echo "  - User ID: {$existing['id']}\n";
        echo "  - Username: {$username}\n";
        echo "  - Email: {$email}\n";
        echo "  - Role: admin\n";
        echo "  - must_change_password: 1\n";
    } else {
        $ins = $pdo->prepare("INSERT INTO users (username, email, phone, full_name, password_hash, role, status, must_change_password) VALUES (?, ?, ?, ?, ?, 'admin', 'active', 1)");
        $ins->execute([$username, $email, $phone, $fullName, $hash]);
        $newId = $pdo->lastInsertId();
        echo "[SUCCESS] Đã tạo mới tài khoản quản trị viên thành công:\n";
        echo "  - User ID: {$newId}\n";
        echo "  - Username: {$username}\n";
        echo "  - Email: {$email}\n";
        echo "  - Role: admin\n";
        echo "  - must_change_password: 1\n";
    }
    echo "[INFO] Tài khoản đã sẵn sàng. Khi đăng nhập lần đầu, hệ thống sẽ yêu cầu đổi mật khẩu.\n";
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, "[LỖI CSDL] " . $e->getMessage() . "\n");
    exit(1);
}
