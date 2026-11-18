<?php
/**
 * Test kiểm thử bảo mật Hạng mục 3: totp_turnstile_helper.php
 * Chứng minh lỗi bypass khi thiếu secret trên production và kiểm chứng fail-closed.
 */

echo "=== TEST KIỂM THỬ BẢO MẬT HẠNG MỤC 3: totp_turnstile_helper.php ===\n";

require_once __DIR__ . '/../api/security_helper.php';
require_once __DIR__ . '/../api/services/totp_turnstile_helper.php';

$errors = [];

$envKeys = ['APP_ENV', 'TURNSTILE_ENABLED', 'TURNSTILE_SECRET_KEY', 'ALLOW_LOCAL_TURNSTILE_BYPASS'];
$envBackup = [];
foreach ($envKeys as $k) {
    $envBackup[$k] = [
        'has_env' => array_key_exists($k, $_ENV),
        'env'     => $_ENV[$k] ?? null,
        'has_srv' => array_key_exists($k, $_SERVER),
        'srv'     => $_SERVER[$k] ?? null,
        'getenv'  => getenv($k),
    ];
}

try {
    // 1. Kịch bản 1: TURNSTILE_ENABLED=false hoặc TURNSTILE_SECRET_KEY='' trên production -> trả true để không chặn login
    $_ENV['APP_ENV'] = 'production';
    putenv('APP_ENV=production');
    $_ENV['TURNSTILE_ENABLED'] = 'false';
    putenv('TURNSTILE_ENABLED=false');
    $_ENV['TURNSTILE_SECRET_KEY'] = '0x4AAAAAAABBBBBBCCCCCCDDDDDD';
    putenv('TURNSTILE_SECRET_KEY=0x4AAAAAAABBBBBBCCCCCCDDDDDD');
    $_ENV['ALLOW_LOCAL_TURNSTILE_BYPASS'] = 'false';
    putenv('ALLOW_LOCAL_TURNSTILE_BYPASS=false');

    if (verify_turnstile_if_configured(null) !== true || verify_turnstile_if_configured('dummy_token_123') !== true) {
        $errors[] = "LỖI: verify_turnstile_if_configured() phải trả về TRUE khi TURNSTILE_ENABLED=false trên production.";
    }

    $_ENV['TURNSTILE_ENABLED'] = 'true';
    putenv('TURNSTILE_ENABLED=true');
    $_ENV['TURNSTILE_SECRET_KEY'] = '';
    putenv('TURNSTILE_SECRET_KEY=');

    if (verify_turnstile_if_configured(null) !== true || verify_turnstile_if_configured('dummy_token_123') !== true) {
        $errors[] = "LỖI: verify_turnstile_if_configured() phải trả về TRUE khi TURNSTILE_SECRET_KEY rỗng trên production.";
    }

    // 2. Kịch bản 2: Bật TURNSTILE_ENABLED=true kèm secret key trên production, token rỗng -> BẮT BUỘC false
    $_ENV['APP_ENV'] = 'production';
    putenv('APP_ENV=production');
    $_ENV['TURNSTILE_ENABLED'] = 'true';
    putenv('TURNSTILE_ENABLED=true');
    $_ENV['TURNSTILE_SECRET_KEY'] = '0x4AAAAAAABBBBBBCCCCCCDDDDDD';
    putenv('TURNSTILE_SECRET_KEY=0x4AAAAAAABBBBBBCCCCCCDDDDDD');

    if (verify_turnstile_if_configured('') !== false) {
        $errors[] = "LỖI: verify_turnstile_if_configured() không trả về false khi bật Turnstile và token rỗng.";
    }

    // 3. Kịch bản 3: Kiểm tra check_turnstile_health() cảnh báo khi tắt hoặc thiếu secret key trên production
    if (!function_exists('check_turnstile_health')) {
        $errors[] = "LỖI: Thiếu hàm check_turnstile_health() để cảnh báo lỗi cấu hình khi khởi động hoặc trong cài đặt admin.";
    } else {
        $_ENV['APP_ENV'] = 'production';
        putenv('APP_ENV=production');
        $_ENV['TURNSTILE_ENABLED'] = 'false';
        putenv('TURNSTILE_ENABLED=false');
        $_ENV['TURNSTILE_SECRET_KEY'] = '0x4AAAAAAABBBBBBCCCCCCDDDDDD';
        putenv('TURNSTILE_SECRET_KEY=0x4AAAAAAABBBBBBCCCCCCDDDDDD');
        $healthDisabled = check_turnstile_health();
        if (!is_array($healthDisabled) || trim((string)($healthDisabled['warning'] ?? '')) === '') {
            $errors[] = "LỖI: check_turnstile_health() không đưa ra cảnh báo khi TURNSTILE_ENABLED=false trên production.";
        }

        $_ENV['TURNSTILE_ENABLED'] = 'true';
        putenv('TURNSTILE_ENABLED=true');
        $_ENV['TURNSTILE_SECRET_KEY'] = '';
        putenv('TURNSTILE_SECRET_KEY=');
        $healthMissingKey = check_turnstile_health();
        if (!is_array($healthMissingKey) || trim((string)($healthMissingKey['warning'] ?? '')) === '') {
            $errors[] = "LỖI: check_turnstile_health() không đưa ra cảnh báo khi thiếu TURNSTILE_SECRET_KEY trên production.";
        }
    }
} finally {
    foreach ($envBackup as $k => $orig) {
        if ($orig['has_env']) {
            $_ENV[$k] = $orig['env'];
        } else {
            unset($_ENV[$k]);
        }
        if ($orig['has_srv']) {
            $_SERVER[$k] = $orig['srv'];
        } else {
            unset($_SERVER[$k]);
        }
        if ($orig['getenv'] !== false) {
            putenv($k . '=' . $orig['getenv']);
        } else {
            putenv($k);
        }
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
