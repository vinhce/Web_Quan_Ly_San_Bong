<?php
declare(strict_types=1);

/**
 * TEST TAB 11 INVERTED INDEX: Schema (Migration 023), Backfill, Write-Time Indexing,
 * Vietnamese Unaccented Search, Multi-Word AND, Phone/Booking Search, Masking Invariant,
 * Short-Code Isolation (td vs AUTO/tđ), EXPLAIN PRIMARY Index Plan, ACID Rollback & Cascade.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../api/security_helper.php';
require_once __DIR__ . '/../api/services/AdminLogRegistry.php';
require_once __DIR__ . '/../api/services/AdminLogIndexer.php';
require_once __DIR__ . '/../api/services/AdminLogRepository.php';
require_once __DIR__ . '/../api/services/AdminLogService.php';

$dbHost = getenv('DB_HOST') ?: '127.0.0.1';
if (!in_array($dbHost, ['127.0.0.1', 'localhost'], true)) {
    fwrite(STDERR, "BLOCKED: Unsafe DB_HOST={$dbHost}\n");
    exit(1);
}

$pdo = getDBConnection(true);
ensureAuditReviewsAndShiftsUpgrade($pdo, true);
ensureAuditInvertedIndexSchema($pdo, true);

$passed = 0;
$failed = 0;

function idx_assert(bool $cond, string $msg): void
{
    global $passed, $failed;
    if ($cond) {
        $passed++;
        echo "  [PASS] {$msg}\n";
    } else {
        $failed++;
        echo "  [FAIL] {$msg}\n";
    }
}

function idx_call_api(?array $sessionUser, string $action, array $getParams = []): array
{
    $cfg = [
        'root'    => dirname(__DIR__),
        'session' => $sessionUser,
        'action'  => $action,
        'get'     => $getParams,
    ];
    $code = <<<'PHPEOF'
<?php
$cfg = json_decode(base64_decode($argv[1]), true);
$root = $cfg['root'];
require_once $root . '/config/database.php';
require_once $root . '/api/security_helper.php';
if (session_status() === PHP_SESSION_NONE) session_start();
$_SESSION = $cfg['session'] ?? [];
$csrf = 'test_idx_csrf_1234567890abcdef';
$_SESSION['csrf_token'] = $csrf;
$_SERVER['HTTP_X_CSRF_TOKEN'] = $csrf;
$_SERVER['REQUEST_METHOD'] = 'GET';
$_GET = array_merge(['action' => $cfg['action']], $cfg['get'] ?? []);
$_POST = [];
ob_start();
require $root . '/api/admin.php';
echo ob_get_clean();
PHPEOF;
    $tmp = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'tab11_idx_runner_' . getmypid() . '.php';
    file_put_contents($tmp, $code);
    try {
        $cmd = sprintf('"%s" "%s" %s', PHP_BINARY, $tmp, escapeshellarg(base64_encode(json_encode($cfg))));
        $raw = (string)shell_exec($cmd);
    } finally {
        @unlink($tmp);
    }
    return ['json' => json_decode($raw, true), 'raw' => $raw];
}

echo "=== KIỂM THỬ INVERTED INDEX TAB 11 (audit_search_tokens) ===\n\n";

$createdUserId = 0;
$createdLogIds = [];

try {
    // 1. Schema + Backfill completeness
    echo "1. Kiểm tra bảng audit_search_tokens và backfill dữ liệu cũ:\n";
    idx_assert(AdminLogIndexer::isTableReady($pdo), 'Bảng audit_search_tokens tồn tại và sẵn sàng');
    AdminLogIndexer::backfillMissing($pdo, 5000);
    $missingCount = (int)$pdo->query("SELECT COUNT(*) FROM audit_logs a LEFT JOIN audit_search_tokens st ON st.log_id = a.id WHERE st.log_id IS NULL")->fetchColumn();
    idx_assert($missingCount === 0, 'Toàn bộ bản ghi audit_logs hiện có đã được lập chỉ mục (missing = 0)');

    // 2. EXPLAIN index plan check
    $explainStmt = $pdo->query("EXPLAIN SELECT log_id FROM audit_search_tokens WHERE token LIKE 'dong%'");
    $explainRow = $explainStmt ? ($explainStmt->fetch(PDO::FETCH_ASSOC) ?: []) : [];
    idx_assert(($explainRow['key'] ?? '') === 'PRIMARY', 'EXPLAIN SELECT trên token LIKE "dong%" sử dụng khóa PRIMARY');

    // 3. Seed temp user + logs via BOTH AdminLogService::record() and write_audit_log()
    echo "\n2. Kiểm tra write-time indexing qua AdminLogService::record và write_audit_log:\n";
    $randPhone = '039' . random_int(1000000, 9999999);
    $pdo->prepare("INSERT INTO users (username, email, phone, full_name, password_hash, role, status) VALUES (?, ?, ?, ?, ?, 'admin', 'active')")
        ->execute(['[TEST]vinh_idx', 'vinh_idx@local.test', $randPhone, 'Nguyễn Quang Vinh', password_hash('TestPass123!', PASSWORD_DEFAULT)]);
    $createdUserId = (int)$pdo->lastInsertId();
    $adminSession = ['user_id' => $createdUserId, 'user' => ['id' => $createdUserId, 'username' => '[TEST]vinh_idx', 'full_name' => 'Nguyễn Quang Vinh', 'role' => 'admin']];

    $shiftLogId = AdminLogService::record(
        $pdo,
        $createdUserId,
        'SHIFT_CLOSE',
        'shift',
        'SHIFT-999',
        ['status' => 'open'],
        ['status' => 'closed', 'discrepancy_amount' => 0, 'admin_note' => 'Khớp ca [TEST] INV_SHIFT']
    );
    $pointsLogId = AdminLogService::record(
        $pdo,
        $createdUserId,
        'ADJUST_POINTS',
        'user',
        '0912345678',
        ['points' => 50],
        ['points' => 150, 'reason' => 'Giải phong trào cộng điểm']
    );
    $tdLogId = AdminLogService::record(
        $pdo,
        $createdUserId,
        'WALKIN_BOOKING',
        'booking',
        'ASFF782132',
        null,
        'Đặt sân tại quầy [TEST] ASFF782132'
    );
    $autoLogId = AdminLogService::record(
        $pdo,
        0,
        'AUTO_CANCEL_EXPIRED',
        'booking',
        '[TEST]INV_AUTO_01',
        'Giữ chỗ',
        'Hủy tự động [TEST]INV_AUTO_01'
    );
    $okHelper = write_audit_log(
        $pdo,
        'COLLECT_PAYMENT',
        '[TEST]INV_HELPER_01',
        '100.000đ',
        'Đã thu tiền tại quầy [TEST] 4.459.000đ',
        ['id' => $createdUserId, 'username' => '[TEST]vinh_idx', 'full_name' => 'Nguyễn Quang Vinh', 'role' => 'admin'],
        'booking'
    );
    $helperLogId = (int)$pdo->query("SELECT id FROM audit_logs WHERE object_code = '[TEST]INV_HELPER_01' ORDER BY id DESC LIMIT 1")->fetchColumn();
    array_push($createdLogIds, $shiftLogId, $pointsLogId, $tdLogId, $autoLogId);
    if ($helperLogId > 0) $createdLogIds[] = $helperLogId;

    idx_assert($shiftLogId > 0 && $pointsLogId > 0 && $tdLogId > 0 && $autoLogId > 0, 'Ghi 4 bản ghi qua AdminLogService::record thành công');
    idx_assert($okHelper && $helperLogId > 0, 'Ghi bản ghi qua write_audit_log thành công');

    $cntStmt = $pdo->prepare("SELECT COUNT(*) FROM audit_search_tokens WHERE log_id = ?");
    $cntStmt->execute([$shiftLogId]);
    $shiftTokCount = (int)$cntStmt->fetchColumn();
    $cntStmt->execute([$helperLogId]);
    $helperTokCount = (int)$cntStmt->fetchColumn();
    idx_assert($shiftTokCount > 0 && $helperTokCount > 0, 'Cả AdminLogService::record và write_audit_log đều sinh token ngay khi ghi');

    $hasId = static fn(array $res, int $target): bool => count(array_filter(
        $res['json']['data']['logs'] ?? [],
        static fn($r): bool => (int)($r['id'] ?? 0) === $target
    )) > 0;

    // 4. Vietnamese accent-insensitive action_label search
    echo "\n3. Kiểm tra tìm nhãn hành động tiếng Việt không dấu / có dấu:\n";
    idx_assert($hasId(idx_call_api($adminSession, 'audit_logs', ['search' => 'dong ca truc']), $shiftLogId), 'Tìm "dong ca truc" khớp SHIFT_CLOSE ("Đóng ca trực")');
    idx_assert($hasId(idx_call_api($adminSession, 'audit_logs', ['search' => 'đóng ca trực']), $shiftLogId), 'Tìm "đóng ca trực" khớp SHIFT_CLOSE');

    // 5. Multi-word unordered boolean AND search
    echo "\n4. Kiểm tra tìm đa từ không phân biệt thứ tự (boolean AND):\n";
    idx_assert($hasId(idx_call_api($adminSession, 'audit_logs', ['search' => 'giai phong trao vinh']), $pointsLogId), 'Tìm "giai phong trao vinh" (actor + payload) khớp log điều chỉnh điểm');
    $missMulti = idx_call_api($adminSession, 'audit_logs', ['search' => 'giai phong trao khongtontai']);
    idx_assert(!$hasId($missMulti, $pointsLogId), 'Tìm "giai phong trao khongtontai" KHÔNG khớp sai');
    idx_assert($hasId(idx_call_api($adminSession, 'audit_logs', ['search' => '4459000']), $helperLogId), 'Tìm số tiền "4459000" khớp log chứa "4.459.000đ"');

    // 6. Phone, +84 normalization, suffix, booking code & masking invariant
    echo "\n5. Kiểm tra SĐT (+84/đuôi 4 số), mã đơn ASFF782132 và giữ che SĐT:\n";
    foreach (['0912345678', '+84912345678', '5678'] as $qPhone) {
        $resP = idx_call_api($adminSession, 'audit_logs', ['search' => $qPhone]);
        idx_assert($hasId($resP, $pointsLogId), "Tìm SĐT/hậu tố \"{$qPhone}\" khớp log điểm");
        $matchedRow = array_values(array_filter($resP['json']['data']['logs'] ?? [], static fn($r): bool => (int)$r['id'] === $pointsLogId))[0] ?? [];
        idx_assert(($matchedRow['object_display'] ?? '') === '091***678', "Tìm \"{$qPhone}\" vẫn che SĐT trả về 091***678");
    }
    idx_assert($hasId(idx_call_api($adminSession, 'audit_logs', ['search' => '782132']), $tdLogId), 'Tìm "782132" khớp mã đơn ASFF782132');

    // 7. Short-code isolation invariant
    echo "\n6. Kiểm tra tách biệt mã nhóm TD vs AUTO/tđ:\n";
    $resTd = idx_call_api($adminSession, 'audit_logs', ['search' => 'td']);
    idx_assert($hasId($resTd, $tdLogId) && !$hasId($resTd, $autoLogId), '"td" lọc TD và không dính AUTO');
    foreach (['AUTO', 'auto', 'tđ'] as $kwAuto) {
        $resAuto = idx_call_api($adminSession, 'audit_logs', ['search' => $kwAuto]);
        idx_assert($hasId($resAuto, $autoLogId) && !$hasId($resAuto, $tdLogId), "\"{$kwAuto}\" lọc TT và không dính TD");
    }

    // 8. ACID rollback & ON DELETE CASCADE
    echo "\n7. Kiểm tra ACID Rollback & ON DELETE CASCADE:\n";
    $maxIdBeforeRb = (int)$pdo->query("SELECT COALESCE(MAX(id), 0) FROM audit_logs")->fetchColumn();
    $tokCountBeforeRb = (int)$pdo->query("SELECT COUNT(*) FROM audit_search_tokens WHERE log_id > {$maxIdBeforeRb}")->fetchColumn();
    $pdo->beginTransaction();
    $rbId = AdminLogService::record($pdo, $createdUserId, 'UPDATE_PROFILE', 'user', '[TEST]RB_IDX', ['full_name' => 'A'], ['full_name' => 'RollBackUniqTok99']);
    $pdo->rollBack();
    $logAfterRb = (int)$pdo->query("SELECT COUNT(*) FROM audit_logs WHERE id = " . (int)$rbId)->fetchColumn();
    $tokAfterRb = (int)$pdo->query("SELECT COUNT(*) FROM audit_search_tokens WHERE log_id = " . (int)$rbId)->fetchColumn();
    idx_assert($logAfterRb === 0 && $tokAfterRb === 0 && $tokCountBeforeRb === 0, 'Rollback transaction hủy cả audit_logs lẫn audit_search_tokens');

    // Cascade delete check on $tdLogId
    $pdo->prepare("DELETE FROM audit_logs WHERE id = ?")->execute([$tdLogId]);
    $cntStmt->execute([$tdLogId]);
    idx_assert((int)$cntStmt->fetchColumn() === 0, 'Xóa dòng audit_logs tự động CASCADE xóa hết token liên quan');
} finally {
    if ($createdLogIds !== []) {
        $ph = implode(', ', array_fill(0, count($createdLogIds), '?'));
        $pdo->prepare("DELETE FROM audit_reviews WHERE log_id IN ({$ph})")->execute($createdLogIds);
        $pdo->prepare("DELETE FROM audit_logs WHERE id IN ({$ph})")->execute($createdLogIds);
    }
    if ($createdUserId > 0) {
        $pdo->prepare("DELETE FROM users WHERE id = ?")->execute([$createdUserId]);
    }
}

echo "\n=============================================\n";
echo "KẾT QUẢ TEST INVERTED INDEX: {$passed} PASS, {$failed} FAIL\n";
exit($failed === 0 ? 0 : 1);
