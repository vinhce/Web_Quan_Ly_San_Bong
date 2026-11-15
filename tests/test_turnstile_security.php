<?php
/**
 * Test kiểm thử bảo mật Hạng mục 3: totp_turnstile_helper.php
 * Chứng minh lỗi bypass khi thiếu secret trên production và kiểm chứng fail-closed.
 */

echo "=== TEST KIỂM THỬ BẢO MẬT HẠNG MỤC 3: totp_turnstile_helper.php ===\n";

require_once __DIR__ . '/../api/security_helper.php';
require_once __DIR__ . '/../api/services/totp_turnstile_helper.php';

$errors = [];

// 1. Kiểm tra kịch bản Production thiếu secret key: BẮT BUỘC FAIL-CLOSED (trả về false)
$_ENV['APP_ENV'] = 'production';
putenv('APP_ENV=production');
$_ENV['TURNSTILE_SECRET_KEY'] = '';
putenv('TURNSTILE_SECRET_KEY=');
unset($_ENV['ALLOW_LOCAL_TURNSTILE_BYPASS']);

$prodResultNull = verify_turnstile_if_configured(null);
$prodResultToken = verify_turnstile_if_configured('dummy_token_123');

if ($prodResultNull === true || $prodResultToken === true) {
    $errors[] = "LỖI NGUY HIỂM: verify_turnstile_if_configured() trả về TRUE khi thiếu TURNSTILE_SECRET_KEY trên production (Bypass chống bot!).";
}

// 2. Kiểm tra kịch bản Local có bật cờ bypass: Cho phép dev local
$_ENV['APP_ENV'] = 'local';
putenv('APP_ENV=local');
$_ENV['ALLOW_LOCAL_TURNSTILE_BYPASS'] = 'true';
putenv('ALLOW_LOCAL_TURNSTILE_BYPASS=true');
$_ENV['TURNSTILE_SECRET_KEY'] = '';
putenv('TURNSTILE_SECRET_KEY=');

$localResult = verify_turnstile_if_configured(null);
if ($localResult !== true) {
    $errors[] = "LỖI: verify_turnstile_if_configured() không cho phép bypass khi APP_ENV=local và ALLOW_LOCAL_TURNSTILE_BYPASS=true.";
}

// 3. Kiểm tra kịch bản Production có cấu hình nhưng token rỗng: BẮT BUỘC false
$_ENV['APP_ENV'] = 'production';
putenv('APP_ENV=production');
$_ENV['TURNSTILE_SECRET_KEY'] = '0x4AAAAAAABBBBBBCCCCCCDDDDDD';
putenv('TURNSTILE_SECRET_KEY=0x4AAAAAAABBBBBBCCCCCCDDDDDD');

$emptyTokenResult = verify_turnstile_if_configured('');
if ($emptyTokenResult !== false) {
    $errors[] = "LỖI: verify_turnstile_if_configured() không trả về false khi token rỗng.";
}

// 4. Kiểm tra hàm cảnh báo cấu hình cho admin
if (!function_exists('check_turnstile_health')) {
    $errors[] = "LỖI: Thiếu hàm check_turnstile_health() để cảnh báo lỗi cấu hình khi khởi động hoặc trong cài đặt admin.";
} else {
    $_ENV['APP_ENV'] = 'production';
    putenv('APP_ENV=production');
    $_ENV['TURNSTILE_SECRET_KEY'] = '';
    putenv('TURNSTILE_SECRET_KEY=');
    $health = check_turnstile_health();
    if (empty($health['warning'])) {
        $errors[] = "LỖI: check_turnstile_health() không đưa ra cảnh báo khi thiếu key trên production.";
    }
}

if (!empty($errors)) {
    echo "KẾT QUẢ: PHÁT HIỆN LỖI TỒN TẠI (" . count($errors) . " lỗi):\n";
    foreach ($errors as $idx => $err) {
        echo "  " . ($idx + 1) . ". " . $err . "\n";
    }
    exit(1);
} else {
    echo "KẾT QUẢ: PASS - Đạt tất cả tiêu chuẩn bảo mật cho Hạng mục 3!\n";
    exit(0);
}
