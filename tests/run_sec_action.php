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
$_SESSION = [];
if (!empty($cfg['session'])) {
    foreach ($cfg['session'] as $k => $v) {
        $_SESSION[$k] = $v;
    }
}

if ($cfg['set_csrf'] ?? false) {
    $token = $cfg['session_csrf'] ?? bin2hex(random_bytes(16));
    $_SESSION['csrf_token'] = $token;
}

$_SERVER['REQUEST_METHOD'] = $cfg['method'] ?? 'GET';
$_GET['action'] = $cfg['action'] ?? '';
$_POST = $cfg['payload'] ?? [];
$GLOBALS['test_json_input'] = json_encode($cfg['payload'] ?? []);

if (isset($cfg['header_csrf'])) {
    if ($cfg['header_csrf'] !== '') {
        $_SERVER['HTTP_X_CSRF_TOKEN'] = $cfg['header_csrf'];
    }
} elseif ($cfg['set_csrf'] ?? false) {
    $_SERVER['HTTP_X_CSRF_TOKEN'] = $_SESSION['csrf_token'];
}

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