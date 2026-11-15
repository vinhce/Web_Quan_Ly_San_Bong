<?php
declare(strict_types=1);

require_once __DIR__ . '/../api/security_helper.php';
require_once __DIR__ . '/../api/services/AdminLogService.php';

function expect_admin_log_test(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

$pdo = new PDO('sqlite::memory:');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec("
    CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        username TEXT,
        full_name TEXT,
        role TEXT
    );
    CREATE TABLE audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        actor_name TEXT,
        actor_role TEXT,
        action TEXT,
        target_type TEXT,
        target_id TEXT,
        booking_id TEXT,
        old_value TEXT,
        new_value TEXT,
        ip TEXT,
        created_at TEXT
    );
    INSERT INTO users (id, username, full_name, role)
    VALUES (1, 'admin_test', 'Admin Test', 'admin');
");

$oldPrices = ['price_p5_base' => '250000', 'price_p5_peak' => '300000'];
$unchangedPrices = ['price_p5_peak' => 300000, 'price_p5_base' => 250000];
expect_admin_log_test(
    audit_log_is_unchanged_structured_pair(json_encode($oldPrices), json_encode($unchangedPrices)),
    'JSON objects with numeric strings and different key order should compare equal'
);
expect_admin_log_test(write_audit_log(
    $pdo,
    'UPDATE_PRICING',
    null,
    json_encode($oldPrices),
    json_encode($unchangedPrices),
    [
        'id' => 1,
        'username' => 'admin_test',
        'role' => 'admin'
    ]
), 'no-op price save should be accepted without inserting');
expect_admin_log_test((int)$pdo->query('SELECT COUNT(*) FROM audit_logs')->fetchColumn() === 0, 'no-op price save inserted a row');

$newPrices = ['price_p5_base' => '270000', 'price_p5_peak' => '300000'];
expect_admin_log_test(write_audit_log(
    $pdo,
    'UPDATE_PRICING',
    null,
    json_encode($oldPrices),
    json_encode($newPrices),
    [
        'id' => 1,
        'username' => 'admin_test',
        'role' => 'admin'
    ]
), 'changed price save should be accepted');
expect_admin_log_test((int)$pdo->query('SELECT COUNT(*) FROM audit_logs')->fetchColumn() === 1, 'changed price save should insert one row');

$changedId = AdminLogService::record(
    $pdo,
    1,
    'UPDATE_PRICING',
    'settings',
    'pricing',
    $oldPrices,
    ['price_p5_peak' => '300000', 'price_p5_base' => 270000],
    '127.0.0.1'
);
expect_admin_log_test($changedId > 0, 'changed price should insert a row');
$changedLog = $pdo->query('SELECT old_value, new_value FROM audit_logs WHERE id = ' . (int)$changedId)->fetch(PDO::FETCH_ASSOC);
$changedOld = json_decode($changedLog['old_value'], true);
$changedNew = json_decode($changedLog['new_value'], true);
expect_admin_log_test($changedOld === ['price_p5_base' => '250000'], 'old diff should contain only the changed price');
expect_admin_log_test($changedNew === ['price_p5_base' => 270000], 'new diff should contain only the changed price');

$noChangeId = AdminLogService::record(
    $pdo,
    1,
    'UPDATE_PRICING',
    'settings',
    'pricing',
    json_encode($oldPrices),
    json_encode($unchangedPrices),
    '127.0.0.1'
);
expect_admin_log_test($noChangeId === 0, 'unchanged AdminLogService pair should return no row ID');
expect_admin_log_test((int)$pdo->query('SELECT COUNT(*) FROM audit_logs')->fetchColumn() === 2, 'unchanged AdminLogService pair inserted a row');

expect_admin_log_test(write_audit_log($pdo, 'CHECKIN', 'BK-TEST', 'same', 'same', [
    'id' => 1,
    'username' => 'admin_test',
    'role' => 'admin'
]), 'scalar check-in log should retain existing behavior');
expect_admin_log_test((int)$pdo->query('SELECT COUNT(*) FROM audit_logs')->fetchColumn() === 3, 'scalar check-in log was not inserted');

echo "PASS: bỏ qua cặp JSON không đổi, ghi một diff khi đổi giá, và vẫn giữ log scalar.";
