<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../api/security_helper.php';
require_once __DIR__ . '/../api/services/AdminLogService.php';

echo "=== TEST ADMIN LOG SERVICE ===" . PHP_EOL;

// 1. Test formatting
$log1 = [
    'actor_name'  => 'Nguyễn A',
    'actor_role'  => 'admin',
    'action'      => 'USER_EDIT',
    'target_type' => 'user',
    'target_id'   => '0912345678',
    'old_value'   => json_encode(['full_name' => 'Trần B'], JSON_UNESCAPED_UNICODE),
    'new_value'   => json_encode(['full_name' => 'Trần Văn B'], JSON_UNESCAPED_UNICODE),
    'created_at'  => '2026-11-16 20:15:00'
];
$msg1 = AdminLogService::formatLogMessage($log1);
echo "Msg1: " . $msg1 . PHP_EOL;
$expected1 = "Admin Nguyễn A sửa họ tên hội viên 0912xxx678: 'Trần B' → 'Trần Văn B' — 16/11/2026 20:15";
assert($msg1 === $expected1, "Expected:\n$expected1\nGot:\n$msg1");

$log2 = [
    'actor_name'  => 'Nguyễn A',
    'actor_role'  => 'admin',
    'action'      => 'ADJUST_POINTS',
    'target_type' => 'user',
    'target_id'   => '0912345678',
    'old_value'   => '546',
    'new_value'   => '600 (lý do: tặng điểm)',
    'created_at'  => '2026-11-16 20:16:00'
];
$msg2 = AdminLogService::formatLogMessage($log2);
echo "Msg2: " . $msg2 . PHP_EOL;
$expected2 = "Admin Nguyễn A điều chỉnh điểm hội viên 0912xxx678: 546 → 600 (lý do: tặng điểm) — 16/11/2026 20:16";
assert($msg2 === $expected2, "Expected:\n$expected2\nGot:\n$msg2");

// 2. Test record() with diff filtering & sensitive data masking
$pdo = getDBConnection();
$adminStmt = $pdo->query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
$adminId = (int)$adminStmt->fetchColumn();
if ($adminId <= 0) {
    $adminId = 1;
}

$oldData = [
    'full_name'    => 'Trần B',
    'phone'        => '0912345678',
    'password'     => 'secret_old_hash',
    'totp_secret'  => 'ABCDEFGHIJKL',
    'cccd'         => '012345678901',
    'bank_account' => '123456789098',
    'tier'         => 'standard'
];

$newData = [
    'full_name'    => 'Trần Văn B',
    'phone'        => '0912345678', // unchanged
    'password'     => 'secret_new_hash', // sensitive: MUST BE OMITTED
    'totp_secret'  => 'MNOPQRSTUVWX', // sensitive: MUST BE OMITTED
    'cccd'         => '012345678901', // unchanged
    'bank_account' => '987654321012', // changed: MUST BE MASKED
    'tier'         => 'vip'          // changed
];

$logId = AdminLogService::record(
    $pdo,
    $adminId,
    'USER_EDIT',
    'user',
    '0912345678',
    $oldData,
    $newData
);

echo "Inserted log ID: " . $logId . PHP_EOL;
assert($logId > 0, "logId must be > 0");

$chkStmt = $pdo->prepare("SELECT * FROM audit_logs WHERE id = ?");
$chkStmt->execute([$logId]);
$inserted = $chkStmt->fetch(PDO::FETCH_ASSOC);

echo "old_value: " . $inserted['old_value'] . PHP_EOL;
echo "new_value: " . $inserted['new_value'] . PHP_EOL;

$decOld = json_decode($inserted['old_value'], true);
$decNew = json_decode($inserted['new_value'], true);

// Verify sensitive keys are NOT present
assert(!isset($decOld['password']), "password must not be saved");
assert(!isset($decNew['password']), "password must not be saved");
assert(!isset($decOld['totp_secret']), "totp_secret must not be saved");
assert(!isset($decNew['totp_secret']), "totp_secret must not be saved");

// Verify unchanged key is NOT in diff
assert(!isset($decOld['phone']), "unchanged phone must not be in diff");
assert(!isset($decNew['phone']), "unchanged phone must not be in diff");

// Verify changed keys ARE present
assert(isset($decOld['full_name']) && $decOld['full_name'] === 'Trần B');
assert(isset($decNew['full_name']) && $decNew['full_name'] === 'Trần Văn B');
assert(isset($decOld['tier']) && $decOld['tier'] === 'standard');
assert(isset($decNew['tier']) && $decNew['tier'] === 'vip');

// Verify bank_account is masked
echo "Masked old bank: " . $decOld['bank_account'] . PHP_EOL;
echo "Masked new bank: " . $decNew['bank_account'] . PHP_EOL;
assert(strpos($decNew['bank_account'], '****') !== false, "bank_account must be masked");

$formattedFromDb = AdminLogService::formatLogMessage($inserted);
echo "Formatted from DB: " . $formattedFromDb . PHP_EOL;

// Clean up test log
$pdo->prepare("DELETE FROM audit_logs WHERE id = ?")->execute([$logId]);

echo "=== ALL ADMIN LOG SERVICE TESTS PASSED! ===" . PHP_EOL;
