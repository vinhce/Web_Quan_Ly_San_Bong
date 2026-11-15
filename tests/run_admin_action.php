<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../api/security_helper.php';

$rawCfg = $argv[1] ?? '';
$cfg = json_decode(base64_decode($rawCfg), true);
if (!$cfg) {
    echo json_encode(['success' => false, 'message' => 'Invalid config']);
    exit;
}

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
foreach ($cfg['session'] ?? [] as $k => $v) {
    $_SESSION[$k] = $v;
}
$csrfToken = 'test_token_1234567890abcdef12345678';
$_SESSION['csrf_token'] = $csrfToken;
$_SERVER['HTTP_X_CSRF_TOKEN'] = $csrfToken;

$_SERVER['REQUEST_METHOD'] = $cfg['method'] ?? 'GET';
$_GET['action'] = $cfg['action'] ?? '';
foreach ($cfg['get'] ?? [] as $gk => $gv) {
    $_GET[$gk] = $gv;
}
$payload = $cfg['payload'] ?? $cfg['data'] ?? [];
$_POST = $payload;
$GLOBALS['test_json_input'] = json_encode($payload);

ob_start();
try {
    $pdo = getDBConnection();
    require __DIR__ . '/../api/admin.php';
} catch (\Throwable $e) {
    ob_end_clean();
    echo json_encode([
        'success' => false,
        'status_code' => 500,
        'error_thrown' => $e->getMessage()
    ]);
    exit;
}
$out = ob_get_clean();
echo $out;