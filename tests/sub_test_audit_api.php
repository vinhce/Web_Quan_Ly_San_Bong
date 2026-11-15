<?php
declare(strict_types=1);

defined('SANBONG_ADMIN_ROUTER') or define('SANBONG_ADMIN_ROUTER', true);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../api/security_helper.php';
require_once __DIR__ . '/../api/services/AdminLogService.php';
require_once __DIR__ . '/../api/services/admin_settings.php';

$pdo = getDBConnection(false);
$adminUser = $pdo->query("SELECT id, username, full_name, role FROM users WHERE role = 'admin' LIMIT 1")->fetch(PDO::FETCH_ASSOC);
$adminId = (int)$adminUser['id'];

$staffUser = $pdo->query("SELECT id, username, full_name, role FROM users WHERE role = 'staff' LIMIT 1")->fetch(PDO::FETCH_ASSOC);
if (!$staffUser) {
    $staffUser = $pdo->query("SELECT id, username, full_name, role FROM users WHERE role != 'admin' LIMIT 1")->fetch(PDO::FETCH_ASSOC);
}

secure_session_start();

$case = $argv[1] ?? '';

if ($case === 'post_method') {
    $_SERVER['REQUEST_METHOD'] = 'POST';
    $_SESSION['user_id'] = $adminId;
    $_SESSION['user'] = $adminUser;
    handle_admin_settings_or_audit($pdo, 'audit_logs', 'POST', [], $adminUser);
    exit;
}

if ($case === 'non_admin') {
    $_SERVER['REQUEST_METHOD'] = 'GET';
    $_SESSION['user_id'] = (int)$staffUser['id'];
    $_SESSION['user'] = $staffUser;
    handle_admin_settings_or_audit($pdo, 'audit_logs', 'GET', [], $staffUser);
    exit;
}

if ($case === 'paging_search') {
    $_SERVER['REQUEST_METHOD'] = 'GET';
    $_SESSION['user_id'] = $adminId;
    $_SESSION['user'] = $adminUser;
    $_GET['page'] = '1';
    $_GET['limit'] = '10';
    $_GET['search'] = 'Trần';
    handle_admin_settings_or_audit($pdo, 'audit_logs', 'GET', [], $adminUser);
    exit;
}

echo json_encode(['error' => 'Unknown test case']);
