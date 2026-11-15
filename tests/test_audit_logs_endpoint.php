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

$step = $argv[1] ?? 'setup';

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

// For action tests, mock admin user in session
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
