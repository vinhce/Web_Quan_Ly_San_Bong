<?php
/**
 * Test kiểm thử bảo mật Hạng mục 2: api/auth.php & loại bỏ fallback trên production
 */

echo "=== TEST KIỂM THỬ BẢO MẬT HẠNG MỤC 2: api/auth.php ===\n";

$authFile = __DIR__ . '/../api/auth.php';
$cliFile = __DIR__ . '/../bin/create_admin.php';

if (!file_exists($authFile)) {
    echo "FAIL: Không tìm thấy api/auth.php\n";
    exit(1);
}

$content = file_get_contents($authFile);
$errors = [];

// 1. Kiểm tra tài khoản admin không được phép nằm trong danh sách fallback
if (preg_match("/'admin'\s*=>\s*\[[^\]]*'hash'/", $content)) {
    $errors[] = "LỖI: api/auth.php vẫn chứa tài khoản admin trong mảng fallback hardcode.";
}

// 2. Kiểm tra cấm fallback trên production kể cả khi bật cờ ALLOW_DEMO_FALLBACK
// Trên production, nếu DB không kết nối được, BẮT BUỘC fail-closed ngay lập tức
if (strpos($content, "APP_ENV !== 'local'") === false && strpos($content, "\$appEnv !== 'local'") === false) {
    $errors[] = "LỖI: api/auth.php chưa kiểm tra nghiêm ngặt môi trường local trước khi vào fallback.";
}

// 3. Kiểm tra công cụ CLI tạo tài khoản admin đầu tiên
if (!file_exists($cliFile)) {
    $errors[] = "LỖI: Chưa có công cụ CLI bin/create_admin.php để tạo tài khoản admin đầu tiên có cờ must_change_password.";
} else {
    $cliContent = file_get_contents($cliFile);
    if (strpos($cliContent, 'password_hash') === false) {
        $errors[] = "LỖI: bin/create_admin.php không sử dụng password_hash để băm mật khẩu.";
    }
    if (strpos($cliContent, 'must_change_password') === false) {
        $errors[] = "LỖI: bin/create_admin.php không gán cờ must_change_password = 1.";
    }
}

// 4. Kiểm tra action change_password trong api/auth.php
if (strpos($content, "action === 'change_password'") === false) {
    $errors[] = "LỖI: api/auth.php chưa có action change_password để cập nhật mật khẩu và gỡ cờ must_change_password.";
}

// 5. Kiểm tra refresh_session_user trong api/security_helper.php có query must_change_password
$securityHelperFile = __DIR__ . '/../api/security_helper.php';
if (!file_exists($securityHelperFile)) {
    $errors[] = "LỖI: Không tìm thấy api/security_helper.php";
} else {
    $secHelperContent = file_get_contents($securityHelperFile);
    if (!preg_match('/SELECT[^;]*must_change_password[^;]*FROM\s+users/i', $secHelperContent)) {
        $errors[] = "LỖI: refresh_session_user trong api/security_helper.php chưa SELECT cột must_change_password từ bảng users.";
    }
    if (strpos($secHelperContent, "'must_change_password'") === false) {
        $errors[] = "LỖI: refresh_session_user trong api/security_helper.php chưa lưu must_change_password vào \$_SESSION['user'].";
    }
}

// 6. Kiểm tra portal-admin/index.php có chặn must_change_password
$portalAdminFile = __DIR__ . '/../portal-admin/index.php';
if (!file_exists($portalAdminFile)) {
    $errors[] = "LỖI: Không tìm thấy portal-admin/index.php";
} else {
    $portalContent = file_get_contents($portalAdminFile);
    if (strpos($portalContent, 'must_change_password') === false) {
        $errors[] = "LỖI: portal-admin/index.php chưa kiểm tra cờ must_change_password.";
    }
    if (strpos($portalContent, 'force_change_password') === false) {
        $errors[] = "LỖI: portal-admin/index.php chưa chuyển hướng người dùng chưa đổi mật khẩu với cờ force_change_password.";
    }
}

// 7. Kiểm tra api/auth.php bọc truy vấn SELECT users trong try/catch trả về fail-closed 503 ERR_DB_UNAVAILABLE
if (!preg_match('/try\s*\{\s*\$stmt\s*=\s*\$pdo->prepare\("SELECT \* FROM users WHERE username/', $content) || strpos($content, 'ERR_DB_UNAVAILABLE') === false) {
    $errors[] = "LỖI: api/auth.php chưa bọc truy vấn SELECT users trong khối try/catch trả về fail-closed 503 ERR_DB_UNAVAILABLE.";
}

if (!empty($errors)) {
    echo "KẾT QUẢ: PHÁT HIỆN LỖI TỒN TẠI (" . count($errors) . " lỗi):\n";
    foreach ($errors as $idx => $err) {
        echo "  " . ($idx + 1) . ". " . $err . "\n";
    }
    exit(1);
} else {
    echo "KẾT QUẢ: PASS - Đạt tất cả tiêu chuẩn bảo mật cho Hạng mục 2!\n";
    exit(0);
}
