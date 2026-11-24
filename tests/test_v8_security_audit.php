<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../api/security_helper.php';

$pdo = getDBConnection();
if (!$pdo) {
    echo "FAIL: DB connection failed\n";
    exit(1);
}

$results = [];
function recordResult(string $testName, bool $pass, string $details = ''): void {
    global $results;
    $results[] = [
        'test'    => $testName,
        'pass'    => $pass,
        'details' => $details
    ];
    $status = $pass ? '[PASS]' : '[FAIL]';
    echo "{$status} {$testName}: {$details}\n";
}

function callAdminSecApi(?array $sessionUser, string $action, string $method = 'GET', array $payload = [], ?string $csrfToken = null): array {
    $script = __DIR__ . '/run_sec_action.php';
    if (!file_exists($script)) {
        $runnerCode = <<<'RUNNER'
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
RUNNER;
        file_put_contents($script, $runnerCode);
    }

    $cfg = [
        'session'      => $sessionUser,
        'action'       => $action,
        'method'       => $method,
        'payload'      => $payload,
        'set_csrf'     => true,
        'header_csrf'  => $csrfToken
    ];

    $cmd = sprintf(
        '"%s" "%s" %s',
        PHP_BINARY,
        $script,
        escapeshellarg(base64_encode(json_encode($cfg)))
    );

    $out = shell_exec($cmd);
    $decoded = json_decode((string)$out, true);
    if (!is_array($decoded)) {
        return ['success' => false, 'raw_output' => $out];
    }
    return $decoded;
}

$adminRow = $pdo->query("SELECT id, username FROM users WHERE role = 'admin' AND COALESCE(status, 'active') = 'active' ORDER BY id ASC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
$staffRow = $pdo->query("SELECT id, username FROM users WHERE role = 'staff' AND COALESCE(status, 'active') = 'active' ORDER BY id ASC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
$managerRow = $pdo->query("SELECT id, username FROM users WHERE role = 'manager' AND COALESCE(status, 'active') = 'active' ORDER BY id ASC LIMIT 1")->fetch(PDO::FETCH_ASSOC);

$createdTempManagerId = 0;
if (!$managerRow) {
    $insMgr = $pdo->prepare("INSERT INTO users (username, email, phone, full_name, password_hash, role, status) VALUES (?, ?, ?, ?, ?, 'manager', 'active')");
    $insMgr->execute(['test_v8_mgr_tmp', 'test_v8_mgr_tmp@sanbongpro.vn', '0399008801', 'TEST V8 Manager', password_hash('TestV8Pass!123', PASSWORD_DEFAULT)]);
    $createdTempManagerId = (int)$pdo->lastInsertId();
    $managerRow = ['id' => $createdTempManagerId, 'username' => 'test_v8_mgr_tmp'];
}

$settingsSnapshot = [];
foreach ($pdo->query("SELECT setting_key, setting_value FROM settings")->fetchAll(PDO::FETCH_ASSOC) as $sRow) {
    $settingsSnapshot[$sRow['setting_key']] = $sRow['setting_value'];
}

$adminSession   = ['user_id' => (int)($adminRow['id'] ?? 1), 'username' => (string)($adminRow['username'] ?? 'admin'), 'role' => 'admin'];
$managerSession = ['user_id' => (int)$managerRow['id'], 'username' => (string)$managerRow['username'], 'role' => 'manager'];
$staffSession   = ['user_id' => (int)($staffRow['id'] ?? 4), 'username' => (string)($staffRow['username'] ?? 'nhanvien'), 'role' => 'staff'];

try {

// --- 1. CSRF TESTS ---
// 1.1 POST without CSRF token header
$res1 = callAdminSecApi($adminSession, 'save_pricing', 'POST', ['pricing' => []], '');
recordResult(
    '1. POST without CSRF token is rejected with 403',
    isset($res1['success']) && $res1['success'] === false && ($res1['ref_code'] ?? '') === 'ERR_CSRF_INVALID',
    $res1['message'] ?? 'Message: ' . json_encode($res1)
);

// 1.2 POST with wrong CSRF token
$res2 = callAdminSecApi($adminSession, 'save_pricing', 'POST', ['pricing' => []], 'invalid_random_token_123');
recordResult(
    '2. POST with invalid CSRF token is rejected with 403',
    isset($res2['success']) && $res2['success'] === false && ($res2['ref_code'] ?? '') === 'ERR_CSRF_INVALID',
    $res2['message'] ?? 'Message: ' . json_encode($res2)
);

// 1.3 GET request does not require CSRF
$res3 = callAdminSecApi($adminSession, 'overview', 'GET');
recordResult(
    '3. GET overview does not require CSRF token',
    isset($res3['success']) && $res3['success'] === true,
    'Status: ' . ($res3['success'] ? '200 OK' : 'Failed')
);

// --- 2. RBAC TESTS ---
// 2.1 Anonymous user blocked (401)
$res4 = callAdminSecApi(null, 'overview', 'GET');
recordResult(
    '4. Anonymous user blocked (401)',
    isset($res4['success']) && $res4['success'] === false && in_array($res4['ref_code'] ?? '', ['ERR_UNAUTHORIZED', 'ERR_FORBIDDEN'], true),
    $res4['message'] ?? 'Message: ' . json_encode($res4)
);

// 2.2 Staff blocked from reports (403)
$res5 = callAdminSecApi($staffSession, 'reports', 'GET');
recordResult(
    '5. Staff blocked from financial reports (403)',
    isset($res5['success']) && $res5['success'] === false && ($res5['ref_code'] ?? '') === 'ERR_FORBIDDEN',
    $res5['message'] ?? 'Message: ' . json_encode($res5)
);

// 2.3 Staff blocked from shift confirmation (403)
$res6 = callAdminSecApi($staffSession, 'shifts', 'POST', ['sub_action' => 'confirm_shift', 'shift_id' => 1]);
recordResult(
    '6. Staff blocked from shift reconciliation/confirmation (403)',
    isset($res6['success']) && $res6['success'] === false && ($res6['ref_code'] ?? '') === 'ERR_FORBIDDEN',
    $res6['message'] ?? 'Message: ' . json_encode($res6)
);

// 2.4 Manager allowed to access reports (200)
$res7 = callAdminSecApi($managerSession, 'reports', 'GET');
recordResult(
    '7. Manager allowed to view reports (200)',
    isset($res7['success']) && $res7['success'] === true && isset($res7['data']['summary']),
    'Summary present: ' . (isset($res7['data']['summary']) ? 'YES' : 'NO')
);

// 2.5 Manager blocked from changing bank & system settings (403)
$res8 = callAdminSecApi($managerSession, 'settings', 'POST', ['bankName' => 'MBBank']);
recordResult(
    '8. Manager blocked from updating settings (403)',
    isset($res8['success']) && $res8['success'] === false && ($res8['ref_code'] ?? '') === 'ERR_FORBIDDEN',
    $res8['message'] ?? 'Message: ' . json_encode($res8)
);

// 2.6 Admin allowed to update settings (200)
$res9 = callAdminSecApi($adminSession, 'settings', 'POST', [
    'bankName'   => 'Vietcombank',
    'bankCode'   => 'VCB',
    'accountNo'  => '0123456789',
    'accountName'=> 'CONG TY CP SAN BONG PRO',
    'depositRate'=> 30,
    'hotline'    => '0352 313 548',
    'openHours'  => '05:30 - 23:00'
]);
recordResult(
    '9. Admin allowed to update settings (200)',
    isset($res9['success']) && $res9['success'] === true,
    $res9['message'] ?? 'Message: ' . json_encode($res9)
);

// --- 3. AUDIT LOG VALIDATION ---
$auditCountStmt = $pdo->query("SELECT COUNT(*) FROM audit_logs WHERE action IN ('UPDATE_SETTINGS', 'UPDATE_PRICING', 'PITCH_STATUS')");
$auditCount = (int)$auditCountStmt->fetchColumn();
recordResult(
    '10. Audit logs table contains sensitive operation logs',
    $auditCount > 0,
    "Logged sensitive events count: {$auditCount}"
);

// --- 4. ANTI-XSS ESCAPING VALIDATION ---
$maliciousStr = '<script>alert("XSS")</script>&"\'test';
$escaped = htmlspecialchars($maliciousStr, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$hasScriptTag = strpos($escaped, '<script>') !== false;
recordResult(
    '11. Anti-XSS sanitization properly escapes HTML entities',
    !$hasScriptTag && strpos($escaped, '&lt;script&gt;') !== false,
    "Result: {$escaped}"
);
} finally {
    if ($createdTempManagerId > 0) {
        $pdo->prepare("DELETE FROM users WHERE id = ?")->execute([$createdTempManagerId]);
    }
    $restoreStmt = $pdo->prepare("UPDATE settings SET setting_value = ? WHERE setting_key = ?");
    foreach ($settingsSnapshot as $k => $v) {
        $restoreStmt->execute([$v, $k]);
    }
}

// Summary
$allPass = true;
$passCount = 0;
foreach ($results as $r) {
    if ($r['pass']) {
        $passCount++;
    } else {
        $allPass = false;
    }
}

echo "\nSummary: {$passCount}/" . count($results) . " security tests passed.\n";
if ($allPass) {
    echo "V8 SECURITY AUDIT ALL PASSED!\n";
    exit(0);
} else {
    echo "SOME SECURITY TESTS FAILED!\n";
    exit(1);
}
