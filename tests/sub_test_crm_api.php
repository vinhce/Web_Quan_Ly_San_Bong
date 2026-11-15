<?php
declare(strict_types=1);

defined('SANBONG_ADMIN_ROUTER') or define('SANBONG_ADMIN_ROUTER', true);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../api/security_helper.php';
require_once __DIR__ . '/../api/services/admin_finance_reports.php';

$pdo = getDBConnection(false);
$adminUser = $pdo->query("SELECT id, username, full_name, role FROM users WHERE role = 'admin' LIMIT 1")->fetch(PDO::FETCH_ASSOC);

secure_session_start();
$_SESSION['user_id'] = (int)$adminUser['id'];
$_SESSION['user'] = $adminUser;

$action = $argv[1] ?? 'crm_customers';
if ($action === 'crm_customers') {
    $_GET['search'] = $argv[2] ?? '';
    require __DIR__ . '/../api/admin_crm.php';
    exit;
}

if ($action === 'reports') {
    handle_admin_finance_reports('reports', 'GET', $pdo, [], $adminUser);
    exit;
}

echo json_encode(['error' => 'Unknown action']);
