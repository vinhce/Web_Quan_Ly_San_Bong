<?php
declare(strict_types=1);

$rawCfg = $argv[1] ?? '';
$cfg = json_decode(base64_decode($rawCfg), true);
if (!$cfg) {
    echo json_encode(['success' => false, 'message' => 'Invalid config']);
    exit;
}

require_once __DIR__ . '/../api/security_helper.php';

if (session_status() === PHP_SESSION_NONE) {
    secure_session_start();
}
$_SESSION = [];
if (!empty($cfg['session'])) {
    foreach ($cfg['session'] as $k => $v) {
        $_SESSION[$k] = $v;
    }
}

// Generate valid CSRF token if session exists
$token = bin2hex(random_bytes(16));
$_SESSION['csrf_token'] = $token;
$_SERVER['HTTP_X_CSRF_TOKEN'] = $token;

$_SERVER['REQUEST_METHOD'] = $cfg['method'] ?? 'POST';
$_POST = $cfg['payload'] ?? [];
$payload = $cfg['payload'] ?? [];
$payload['csrf_token'] = $token;

ob_start();
try {
    require_once __DIR__ . '/../api/notification_helper.php';
    require_once __DIR__ . '/../api/services/totp_turnstile_helper.php';
    require_once __DIR__ . '/../api/services/booking_creator.php';
    require_once __DIR__ . '/../api/services/booking_operations.php';
    $pdo = getDBConnection(false);
    $dir = __DIR__ . '/../logs/ratelimit';
    if (is_dir($dir)) {
        foreach (glob($dir . '/*.json') as $f) {
            @unlink($f);
        }
    }
    $pdo->prepare("DELETE FROM rate_limits WHERE action LIKE 'create_booking%'")->execute();
    handle_create_booking($pdo, $payload);
} catch (\Throwable $e) {
    ob_end_clean();
    echo json_encode([
        'success' => false,
        'error_thrown' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
$rawOutput = ob_get_clean();
echo $rawOutput;
