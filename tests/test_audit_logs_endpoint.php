<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../api/security_helper.php';

$pdo = getDBConnection();

if (!defined('SANBONG_ADMIN_ROUTER')) {
    define('SANBONG_ADMIN_ROUTER', true);
}

require_once __DIR__ . '/../api/services/admin_settings.php';
require_once __DIR__ . '/../api/services/AdminLogService.php';

$step = $argv[1] ?? 'run_all';

if ($step === 'run_all') {
    $runSub = static function (string $subStep, array $extraArgs = []): string {
        $cmd = sprintf('"%s" "%s" %s', PHP_BINARY, __FILE__, escapeshellarg($subStep));
        foreach ($extraArgs as $a) {
            $cmd .= ' ' . escapeshellarg((string)$a);
        }
        return trim((string)shell_exec($cmd));
    };

    $setupJson = json_decode($runSub('setup'), true);
    if (!is_array($setupJson) || empty($setupJson['log1']) || empty($setupJson['log2'])) {
        fwrite(STDERR, "Setup failed\n");
        exit(1);
    }
    $id1 = (int)$setupJson['log1'];
    $id2 = (int)$setupJson['log2'];
    $failures = [];
    try {
        $postOut = json_decode($runSub('test_post'), true);
        if (($postOut['ref_code'] ?? '') !== 'ERR_AUDIT_IMMUTABLE') {
            $failures[] = 'test_post expected ERR_AUDIT_IMMUTABLE';
        }
        $pageOut = json_decode($runSub('test_get_pagination'), true);
        if (empty($pageOut['success']) || (int)($pageOut['data']['pagination']['limit'] ?? 0) !== 10) {
            $failures[] = 'test_get_pagination failed';
        }
        $searchOut = json_decode($runSub('test_search'), true);
        if (empty($searchOut['success']) || (int)($searchOut['data']['pagination']['total'] ?? 0) < 2) {
            $failures[] = 'test_search expected >= 2 matches for 0912888999';
        }
        $actOut = json_decode($runSub('test_filter_action'), true);
        if (empty($actOut['success']) || empty($actOut['data']['logs'])) {
            $failures[] = 'test_filter_action failed';
        }
        $dateOut = json_decode($runSub('test_filter_date'), true);
        if (empty($dateOut['success']) || empty($dateOut['data']['logs'])) {
            $failures[] = 'test_filter_date failed';
        }
    } finally {
        $runSub('cleanup', [(string)$id1, (string)$id2]);
    }
    if ($failures !== []) {
        echo "FAIL: " . implode('; ', $failures) . "\n";
        exit(1);
    }
    echo "PASS: test_audit_logs_endpoint (5/5 checks passed, cleaned up).\n";
    exit(0);
}

if ($step === 'setup') {
    $adminStmt = $pdo->query("SELECT id, username, full_name, role FROM users WHERE role = 'admin' LIMIT 1");
    $adminUser = $adminStmt->fetch(PDO::FETCH_ASSOC);
    $adminId = (int)$adminUser['id'];

    $logId1 = AdminLogService::record(
        $pdo,
        $adminId,
        'USER_EDIT',
        'user',
        '0912888999',
        ['full_name' => 'Nguyễn Văn Cũ'],
        ['full_name' => 'Nguyễn Văn Mới']
    );

    $logId2 = AdminLogService::record(
        $pdo,
        $adminId,
        'ADJUST_POINTS',
        'user',
        '0912888999',
        500,
        '550 (lý do: tặng điểm sinh nhật)'
    );

    echo json_encode(['log1' => $logId1, 'log2' => $logId2, 'admin' => $adminUser]);
    exit;
}

if ($step === 'cleanup') {
    $id1 = (int)($argv[2] ?? 0);
    $id2 = (int)($argv[3] ?? 0);
    $pdo->prepare("DELETE FROM audit_logs WHERE id IN (?, ?)")->execute([$id1, $id2]);
    echo "CLEANUP_OK";
    exit;
}

secure_session_start();
$adminStmt = $pdo->query("SELECT id, username, full_name, role FROM users WHERE role = 'admin' LIMIT 1");
$adminUser = $adminStmt->fetch(PDO::FETCH_ASSOC);
$_SESSION['user_id'] = (int)$adminUser['id'];
$_SESSION['user'] = $adminUser;

if ($step === 'test_post') {
    handle_admin_settings_or_audit($pdo, 'audit_logs', 'POST', [], $adminUser);
    exit;
}

if ($step === 'test_get_pagination') {
    $_GET['page'] = '1';
    $_GET['limit'] = '10';
    handle_admin_settings_or_audit($pdo, 'audit_logs', 'GET', [], $adminUser);
    exit;
}

if ($step === 'test_search') {
    $_GET['search'] = '0912888999';
    handle_admin_settings_or_audit($pdo, 'audit_logs', 'GET', [], $adminUser);
    exit;
}

if ($step === 'test_filter_action') {
    $_GET['action_type'] = 'ADJUST_POINTS';
    handle_admin_settings_or_audit($pdo, 'audit_logs', 'GET', [], $adminUser);
    exit;
}

if ($step === 'test_filter_date') {
    $_GET['from_date'] = date('Y-m-d');
    $_GET['to_date'] = date('Y-m-d');
    handle_admin_settings_or_audit($pdo, 'audit_logs', 'GET', [], $adminUser);
    exit;
}
