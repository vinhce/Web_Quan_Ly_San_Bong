<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../api/security_helper.php';

$pdo = getDBConnection();

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

// Ensure test users exist:
// user 1: admin
// user 8: manager (quanly)
// user 4: staff (nhanvien)

// Helper to simulate calling admin API
function callAdminApi(array $sessionUser, string $action, string $method = 'GET', array $payload = []): array {
    $script = __DIR__ . '/run_admin_action.php';
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
foreach ($cfg['session'] ?? [] as $k => $v) {
    $_SESSION[$k] = $v;
}
$csrfToken = 'test_token_1234567890abcdef12345678';
$_SESSION['csrf_token'] = $csrfToken;
$_SERVER['HTTP_X_CSRF_TOKEN'] = $csrfToken;

$_SERVER['REQUEST_METHOD'] = $cfg['method'] ?? 'GET';
$_GET['action'] = $cfg['action'] ?? '';
$_POST = $cfg['payload'] ?? [];
$GLOBALS['test_json_input'] = json_encode($cfg['payload'] ?? []);

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
        'session' => $sessionUser,
        'action'  => $action,
        'method'  => $method,
        'payload' => $payload
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

$adminSession   = ['user_id' => 1, 'username' => 'admin', 'role' => 'admin'];
$managerSession = ['user_id' => 8, 'username' => 'quanly', 'role' => 'manager'];
$staffSession   = ['user_id' => 4, 'username' => 'nhanvien', 'role' => 'staff'];

// 1. Test toggle_pitch with maintenance reason by staff
$res1 = callAdminApi($staffSession, 'toggle_pitch', 'POST', [
    'pitchId' => 'P5-C',
    'status'  => 'Bảo trì',
    'reason'  => '[TEST] Bảo dưỡng đèn trụ B'
]);
recordResult(
    '1. Staff toggle pitch to Bảo trì with reason',
    isset($res1['success']) && $res1['success'] === true,
    $res1['message'] ?? 'No message'
);

try {
    // Verify audit log has reason
    $auditStmt = $pdo->prepare("SELECT new_value FROM audit_logs WHERE booking_id = 'P5-C' AND action = 'PITCH_STATUS' ORDER BY id DESC LIMIT 1");
    $auditStmt->execute();
    $loggedVal = (string)$auditStmt->fetchColumn();
    recordResult(
        '2. Audit log records maintenance reason',
        strpos($loggedVal, '[TEST] Bảo dưỡng đèn trụ B') !== false,
        "Logged value: {$loggedVal}"
    );
} catch (\Throwable $e) {
    echo "ERROR AT TEST 2: " . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n";
    exit(1);
}

// Toggle back to Hoạt động
$res2 = callAdminApi($staffSession, 'toggle_pitch', 'POST', [
    'pitchId' => 'P5-C',
    'status'  => 'Hoạt động'
]);
recordResult(
    '3. Staff toggle pitch back to Hoạt động',
    isset($res2['success']) && $res2['success'] === true,
    $res2['message'] ?? 'No message'
);

// 4. Staff trying to hide pitch ('Ẩn') must be rejected (403)
$res3 = callAdminApi($staffSession, 'toggle_pitch', 'POST', [
    'pitchId' => 'P5-C',
    'status'  => 'Ẩn'
]);
recordResult(
    '4. Staff blocked from hiding pitch (403)',
    isset($res3['success']) && $res3['success'] === false && in_array($res3['ref_code'] ?? $res3['code'] ?? '', ['ERR_FORBIDDEN'], true),
    $res3['message'] ?? 'Message: ' . json_encode($res3)
);

// 5. Manager can hide pitch ('Ẩn')
$res4 = callAdminApi($managerSession, 'toggle_pitch', 'POST', [
    'pitchId' => 'P5-C',
    'status'  => 'Ẩn'
]);
recordResult(
    '5. Manager allowed to toggle pitch Ẩn',
    isset($res4['success']) && $res4['success'] === true,
    $res4['message'] ?? 'No message'
);

// Reset pitch back to Hoạt động
callAdminApi($managerSession, 'toggle_pitch', 'POST', [
    'pitchId' => 'P5-C',
    'status'  => 'Hoạt động'
]);

// 6. Test save_pricing permission: Staff blocked (403)
$res5 = callAdminApi($staffSession, 'save_pricing', 'POST', [
    'pricing' => [
        'p5'  => ['base' => 260000, 'peak' => 360000, 'weekend' => 390000],
        'p7'  => ['base' => 460000, 'peak' => 660000, 'weekend' => 710000],
        'p11' => ['base' => 910000, 'peak' => 1210000, 'weekend' => 1410000]
    ]
]);
recordResult(
    '6. Staff blocked from save_pricing (403)',
    isset($res5['success']) && $res5['success'] === false && in_array($res5['ref_code'] ?? $res5['code'] ?? '', ['ERR_FORBIDDEN'], true),
    $res5['message'] ?? 'Message: ' . json_encode($res5)
);

// 7. Test save_pricing by Admin: Success + Warning about future bookings
$res6 = callAdminApi($adminSession, 'save_pricing', 'POST', [
    'pricing' => [
        'p5'  => ['base' => 250000, 'peak' => 350000, 'weekend' => 380000],
        'p7'  => ['base' => 450000, 'peak' => 650000, 'weekend' => 700000],
        'p11' => ['base' => 900000, 'peak' => 1200000, 'weekend' => 1400000]
    ]
]);
recordResult(
    '7. Admin save_pricing with future bookings notice',
    isset($res6['success']) && $res6['success'] === true && !empty($res6['warning']),
    "Message: " . ($res6['message'] ?? '') . " | Warning: " . ($res6['warning'] ?? '')
);

// 8. Test settings permission: Staff can GET settings
$res7 = callAdminApi($staffSession, 'settings', 'GET');
recordResult(
    '8. Staff can view settings (GET)',
    isset($res7['success']) && $res7['success'] === true && isset($res7['data']['bankInfo']),
    "Bank: " . ($res7['data']['bankInfo']['bankName'] ?? '')
);

// 9. Staff POST settings is blocked (403)
$res8 = callAdminApi($staffSession, 'settings', 'POST', [
    'bankName' => 'Hacked Bank'
]);
recordResult(
    '9. Staff blocked from modifying settings (POST 403)',
    isset($res8['success']) && $res8['success'] === false && in_array($res8['ref_code'] ?? $res8['code'] ?? '', ['ERR_FORBIDDEN'], true),
    $res8['message'] ?? 'Message: ' . json_encode($res8)
);

// 10. Manager POST settings is blocked (403)
$res9 = callAdminApi($managerSession, 'settings', 'POST', [
    'bankName' => 'Manager Bank'
]);
recordResult(
    '10. Manager blocked from modifying settings (POST 403)',
    isset($res9['success']) && $res9['success'] === false && in_array($res9['ref_code'] ?? $res9['code'] ?? '', ['ERR_FORBIDDEN'], true),
    $res9['message'] ?? 'Message: ' . json_encode($res9)
);

// 11. Admin POST settings succeeds
$res10 = callAdminApi($adminSession, 'settings', 'POST', [
    'bankName'   => 'Vietcombank',
    'bankCode'   => 'VCB',
    'accountNo'  => '0123456789',
    'accountName'=> 'CONG TY CP SAN BONG PRO',
    'depositRate'=> 30,
    'hotline'    => '0352 313 548',
    'openHours'  => '05:30 - 23:00'
]);
recordResult(
    '11. Admin can modify settings (POST 200)',
    isset($res10['success']) && $res10['success'] === true,
    $res10['message'] ?? 'Message: ' . json_encode($res10)
);

// 12. Check all partial files for remaining emojis (excluding text symbols like checkmarks or close buttons)
$partials = glob(__DIR__ . '/../portal-admin/partials/*.php');
$emojiPattern = '/[\x{1F300}-\x{1F5FF}\x{1F600}-\x{1F64F}\x{1F680}-\x{1F6FF}\x{1F900}-\x{1F9FF}\x{1FA00}-\x{1FAFF}]/u';

$emojisFound = [];
foreach ($partials as $f) {
    $content = file_get_contents($f);
    if (preg_match_all($emojiPattern, $content, $matches)) {
        $emojisFound[basename($f)] = array_unique($matches[0]);
    }
}

recordResult(
    '12. Partial templates free of emojis',
    empty($emojisFound),
    empty($emojisFound) ? 'All partial templates clean' : 'Found in: ' . json_encode($emojisFound)
);

$allPass = true;
$passCount = 0;
foreach ($results as $r) {
    if ($r['pass']) {
        $passCount++;
    } else {
        $allPass = false;
    }
}

echo "\nSummary: {$passCount}/" . count($results) . " tests passed.\n";
if ($allPass) {
    echo "V7 REVIEW TESTS ALL PASSED!\n";
    exit(0);
} else {
    echo "SOME TESTS FAILED!\n";
    exit(1);
}
