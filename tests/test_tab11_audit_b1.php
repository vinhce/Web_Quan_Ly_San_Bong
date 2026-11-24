<?php
declare(strict_types=1);

/**
 * TEST TAB 11 AUDIT B1: Registry, RBAC, Immutability, 9 Anomaly Rules (a..i),
 * Filters (TD vs TT isolation), KPI Summary, Review POST, and CSV Export.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../api/security_helper.php';
require_once __DIR__ . '/../api/services/AdminLogRegistry.php';
require_once __DIR__ . '/../api/services/AdminLogRepository.php';
require_once __DIR__ . '/../api/services/AdminLogService.php';

$dbHost = getenv('DB_HOST') ?: '127.0.0.1';
if (!in_array($dbHost, ['127.0.0.1', 'localhost'], true)) {
    fwrite(STDERR, "BLOCKED: Unsafe DB_HOST={$dbHost}\n");
    exit(1);
}

$pdo = getDBConnection(true);
ensureAuditReviewsAndShiftsUpgrade($pdo, true);

$passed = 0;
$failed = 0;

function t11_assert(bool $cond, string $msg): void
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

function t11_call_api(?array $sessionUser, string $action, string $method = 'GET', array $getParams = [], array $payload = []): array
{
    $cfg = [
        'root'    => dirname(__DIR__),
        'session' => $sessionUser,
        'action'  => $action,
        'method'  => $method,
        'get'     => $getParams,
        'payload' => $payload,
    ];
    $code = <<<'PHPEOF'
<?php
$cfg = json_decode(base64_decode($argv[1]), true);
$root = $cfg['root'];
require_once $root . '/config/database.php';
require_once $root . '/api/security_helper.php';
if (session_status() === PHP_SESSION_NONE) session_start();
$_SESSION = $cfg['session'] ?? [];
$csrf = 'test_tab11_csrf_1234567890abcdef';
$_SESSION['csrf_token'] = $csrf;
$_SERVER['HTTP_X_CSRF_TOKEN'] = $csrf;
$_SERVER['REQUEST_METHOD'] = $cfg['method'];
$_GET = array_merge(['action' => $cfg['action']], $cfg['get'] ?? []);
$_POST = $cfg['payload'] ?? [];
ob_start();
require $root . '/api/admin.php';
$out = ob_get_clean();
echo $out;
PHPEOF;
    $tmp = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'tab11_b1_runner_' . getmypid() . '.php';
    file_put_contents($tmp, $code);
    try {
        $cmd = sprintf('"%s" "%s" %s', PHP_BINARY, $tmp, escapeshellarg(base64_encode(json_encode($cfg))));
        $raw = (string)shell_exec($cmd);
    } finally {
        @unlink($tmp);
    }
    return ['json' => json_decode($raw, true), 'raw' => $raw];
}

echo "=== KIỂM THỬ TAB 11 NHẬT KÝ QUẢN TRỊ (BƯỚC 1 BACKEND) ===\n\n";

$adminRow = $pdo->query("SELECT id, username, full_name, role FROM users WHERE role = 'admin' AND COALESCE(status,'active')='active' LIMIT 1")->fetch(PDO::FETCH_ASSOC);
$staffRow = $pdo->query("SELECT id, username, full_name, role FROM users WHERE role = 'staff' AND COALESCE(status,'active')='active' LIMIT 1")->fetch(PDO::FETCH_ASSOC);
$mgrRow   = $pdo->query("SELECT id, username, full_name, role FROM users WHERE role = 'manager' AND COALESCE(status,'active')='active' LIMIT 1")->fetch(PDO::FETCH_ASSOC);

$createdTmpMgrId = 0;
if (!$mgrRow) {
    $pdo->prepare("INSERT INTO users (username, email, phone, full_name, password_hash, role, status) VALUES (?, ?, ?, ?, ?, 'manager', 'active')")
        ->execute(['[TEST]mgr_b1', 'test_mgr_b1@local.test', '0399887766', '[TEST] Manager B1', password_hash('TestPass123!', PASSWORD_DEFAULT)]);
    $createdTmpMgrId = (int)$pdo->lastInsertId();
    $mgrRow = ['id' => $createdTmpMgrId, 'username' => '[TEST]mgr_b1', 'full_name' => '[TEST] Manager B1', 'role' => 'manager'];
}

$adminSession = ['user_id' => (int)$adminRow['id'], 'user' => $adminRow];
$staffSession = ['user_id' => (int)$staffRow['id'], 'user' => $staffRow];
$mgrSession   = ['user_id' => (int)$mgrRow['id'],   'user' => $mgrRow];

$createdLogIds = [];
$createdShiftId = 0;

try {
    // 1. Registry & 6 unique codes (NO TĐ as DB key, short_code has XHC & AUTO)
    echo "1. Kiểm tra AdminLogRegistry & 6 mã nhóm duy nhất:\n";
    $catKeys = array_keys(AdminLogRegistry::CATEGORIES);
    t11_assert($catKeys === ['TD', 'XH', 'CN', 'CB', 'TQ', 'TT'], 'Đủ đúng 6 mã nhóm duy nhất TD, XH, CN, CB, TQ, TT (không dùng TĐ)');
    t11_assert(!in_array('TĐ', $catKeys, true), 'Không tồn tại mã TĐ trong khóa DB');
    $shortCodes = array_column(AdminLogRegistry::CATEGORIES, 'short_code');
    t11_assert($shortCodes === ['TD', 'XHC', 'CN', 'CB', 'TQ', 'AUTO'], 'Đủ đúng 6 short_code hiển thị TD, XHC, CN, CB, TQ, AUTO');
    t11_assert(
        AdminLogRepository::resolveCategoryToken('td') === 'TD'
        && AdminLogRepository::resolveCategoryToken('tđ') === 'TT'
        && AdminLogRepository::resolveCategoryToken('TĐ') === 'TT'
        && AdminLogRepository::resolveCategoryToken('auto') === 'TT'
        && AdminLogRepository::resolveCategoryToken('tdg') === 'TT'
        && AdminLogRepository::resolveCategoryToken('xhc') === 'XH'
        && AdminLogRepository::resolveCategoryToken('tạo') === null
        && AdminLogRepository::resolveCategoryToken('') === null,
        'resolveCategoryToken giữ chữ đ tách biệt với d và map đúng alias nhóm'
    );
    t11_assert(count(AdminLogRegistry::DATA_GROUPS) === 8, 'Đủ 7 nhóm dữ liệu + Khác');
    $unknownMeta = AdminLogRegistry::resolveActionMeta('SOME_UNREGISTERED_ACTION', 'admin');
    t11_assert($unknownMeta['data_group'] === 'Khác' && $unknownMeta['registered'] === false, 'Mã chưa đăng ký rơi về nhóm dữ liệu Khác');

    // 2. RBAC: manager & staff blocked (403)
    echo "\n2. Kiểm tra phân quyền chỉ Admin (manager/staff bị chặn):\n";
    foreach (['audit_logs', 'audit_summary', 'audit_export_csv', 'audit_check_new'] as $ep) {
        $rStaff = t11_call_api($staffSession, $ep, 'GET');
        $rMgr   = t11_call_api($mgrSession, $ep, 'GET');
        t11_assert(($rStaff['json']['ref_code'] ?? '') === 'ERR_FORBIDDEN', "Staff bị chặn ở {$ep}");
        t11_assert(($rMgr['json']['ref_code'] ?? '') === 'ERR_FORBIDDEN', "Manager bị chặn ở {$ep}");
    }
    $rMgrRev = t11_call_api($mgrSession, 'audit_review', 'POST', [], ['log_id' => 1, 'note' => 'Kiểm tra phân quyền hậu kiểm']);
    t11_assert(($rMgrRev['json']['ref_code'] ?? '') === 'ERR_FORBIDDEN', 'Manager bị chặn POST audit_review');

    // 3. Immutability: 405 on POST/DELETE/PUT audit_logs
    echo "\n3. Kiểm tra tính bất biến (405 Method Not Allowed):\n";
    $rPostLogs = t11_call_api($adminSession, 'audit_logs', 'POST');
    $rDelLogs  = t11_call_api($adminSession, 'audit_logs', 'DELETE');
    $rPutLogs  = t11_call_api($adminSession, 'audit_logs', 'PUT');
    t11_assert(($rPostLogs['json']['ref_code'] ?? '') === 'ERR_AUDIT_IMMUTABLE', 'POST audit_logs trả ERR_AUDIT_IMMUTABLE');
    t11_assert(($rDelLogs['json']['ref_code'] ?? '') === 'ERR_AUDIT_IMMUTABLE', 'DELETE audit_logs trả ERR_AUDIT_IMMUTABLE');
    t11_assert(($rPutLogs['json']['ref_code'] ?? '') === 'ERR_AUDIT_IMMUTABLE', 'PUT audit_logs trả ERR_AUDIT_IMMUTABLE');

    // 4. All 9 anomaly rules a..i
    echo "\n4. Kiểm tra 9 luật bất thường (a..i):\n";
    $th = AdminLogRegistry::loadThresholds($pdo);
    $rA = AdminLogRegistry::detectAnomalies(['action' => 'SHIFT_CLOSE', 'new_value' => json_encode(['discrepancy_amount' => -60000, 'discrepancy_reason' => 'Khách nợ lại 60.000đ hẹn trả']), 'created_at' => '2026-11-24 14:00:00'], $th);
    $rB = AdminLogRegistry::detectAnomalies(['action' => 'ADJUST_POINTS', 'old_value' => json_encode(['points' => 100]), 'new_value' => json_encode(['points' => 160, 'reason' => 'Tặng điểm giải đấu phong trào']), 'created_at' => '2026-11-24 14:00:00'], $th);
    $rC = AdminLogRegistry::detectAnomalies(['action' => 'CRM_CUSTOMER_UPDATE', 'old_value' => json_encode(['customer_tier' => 'standard']), 'new_value' => json_encode(['customer_tier' => 'vip', 'tier_reason' => 'Nâng hạng VIP theo gói năm']), 'created_at' => '2026-11-24 14:00:00'], $th);
    $rD = AdminLogRegistry::detectAnomalies(['action' => 'CANCEL_BOOKING', 'old_value' => 'Đã xác nhận (Đã cọc 30%)', 'new_value' => 'Đã hủy (Đã hoàn cọc 100%) | Hoàn: 195,000 đ | Lý do: Mưa lớn ngập mặt sân', 'created_at' => '2026-11-24 14:00:00'], $th);
    $rE = AdminLogRegistry::detectAnomalies(['action' => 'SHIFT_EDIT_COUNT', 'old_value' => json_encode(['staff_counted_cash' => 500000]), 'new_value' => json_encode(['actual_cash_received' => 520000, 'edit_reason' => 'Đếm lại phát hiện sót tờ 20k']), 'created_at' => '2026-11-24 14:00:00'], $th);
    $rF = AdminLogRegistry::detectAnomalies(['action' => 'VOUCHER_SAVE', 'new_value' => json_encode(['discount_type' => 'percent', 'discount_value' => 50]), 'created_at' => '2026-11-24 14:00:00'], $th);
    $rG = AdminLogRegistry::detectAnomalies(['action' => 'DISABLE_2FA', 'old_value' => '1', 'new_value' => '0', 'created_at' => '2026-11-24 14:00:00'], $th);
    $rH = AdminLogRegistry::detectAnomalies(['action' => 'ADJUST_POINTS', 'old_value' => json_encode(['points' => 10]), 'new_value' => json_encode(['points' => 20, 'reason' => 'dasdawdadwdasd']), 'created_at' => '2026-11-24 14:00:00'], $th);
    $rI = AdminLogRegistry::detectAnomalies(['action' => 'PITCH_STATUS', 'old_value' => 'Hoạt động', 'new_value' => 'Bảo trì', 'created_at' => '2026-11-24 02:30:00'], $th);

    t11_assert($rA['is_anomaly'] && str_contains(implode(' ', $rA['reasons']), 'lệch'), 'Luật (a) chốt ca lệch >= 50.000đ');
    t11_assert($rB['is_anomaly'] && str_contains(implode(' ', $rB['reasons']), '+60'), 'Luật (b) chỉnh điểm |Δ| >= 50');
    t11_assert($rC['is_anomaly'] && str_contains(implode(' ', $rC['reasons']), 'hạng'), 'Luật (c) đổi hạng thủ công');
    t11_assert($rD['is_anomaly'] && str_contains(implode(' ', $rD['reasons']), 'hoàn'), 'Luật (d) hủy/hoàn cọc đơn đã có tiền');
    t11_assert($rE['is_anomaly'] && str_contains(implode(' ', $rE['reasons']), 'kiểm đếm'), 'Luật (e) sửa số đếm ca sau chốt');
    t11_assert($rF['is_anomaly'] && str_contains(implode(' ', $rF['reasons']), '50%'), 'Luật (f) voucher/giá giảm >= 50%');
    t11_assert($rG['is_anomaly'] && str_contains(implode(' ', $rG['reasons']), '2FA'), 'Luật (g) đổi quyền / tắt 2FA');
    t11_assert($rH['is_anomaly'] && str_contains(implode(' ', $rH['reasons']), 'vô nghĩa'), 'Luật (h) lý do rác vô nghĩa');
    t11_assert($rI['is_anomaly'] && str_contains(implode(' ', $rI['reasons']), '00:00–05:00'), 'Luật (i) thao tác khung giờ 00:00–05:00');

    // 5. Insert test records & verify category token isolation (td vs tđ/TĐ/auto/tdg/xhc), phone masking, limit=25 default
    echo "\n5. Kiểm tra lọc TD / TĐ / XHC / auto / tdg tách biệt, che SĐT 091***678, mặc định 25/trang:\n";
    $tdId = AdminLogService::record($pdo, (int)$adminRow['id'], 'WALKIN_BOOKING', 'booking', '[TEST]B1_TD_01', null, 'Đặt quầy [TEST]B1_TD_01 cho 0912345678');
    $ttId = AdminLogService::record($pdo, 0, 'AUTO_CANCEL_EXPIRED', 'booking', '[TEST]B1_TT_01', 'Giữ chỗ', 'Hủy tự động [TEST]B1_TT_01');
    $xhId = AdminLogService::record($pdo, (int)$adminRow['id'], 'CANCEL_BOOKING', 'booking', '[TEST]B1_XH_01', 'Chưa cọc - Nhả sân', 'Hủy [TEST]B1_XH_01 doanh thu 0đ');
    $anomId = AdminLogService::record($pdo, (int)$adminRow['id'], 'ADJUST_POINTS', 'user', '0912345678', ['points' => 100], ['points' => 180, 'reason' => '[TEST] B1 tặng điểm giải đấu']);
    array_push($createdLogIds, $tdId, $ttId, $xhId, $anomId);

    $hasLogId = static fn(array $logs, int $id): bool => count(array_filter($logs, static fn($l): bool => (int)($l['id'] ?? 0) === $id)) > 0;

    $resDefault = t11_call_api($adminSession, 'audit_logs', 'GET');
    t11_assert((int)($resDefault['json']['data']['pagination']['limit'] ?? 0) === 25, 'Mặc định 25 bản ghi/trang');

    $resTd = t11_call_api($adminSession, 'audit_logs', 'GET', ['search' => 'TD']);
    $tdLogs = $resTd['json']['data']['logs'] ?? [];
    t11_assert($hasLogId($tdLogs, $tdId) && !$hasLogId($tdLogs, $ttId), 'Tìm kiếm mã nhóm "TD" khớp TD và KHÔNG khớp TT');

    $resTdLower = t11_call_api($adminSession, 'audit_logs', 'GET', ['search' => 'td']);
    $tdLowerLogs = $resTdLower['json']['data']['logs'] ?? [];
    t11_assert($hasLogId($tdLowerLogs, $tdId) && !$hasLogId($tdLowerLogs, $ttId), 'Tìm kiếm "td" khớp TD và KHÔNG khớp TT');

    foreach (['AUTO', 'auto', 'tđ', 'TĐ', 'tdg'] as $ttSearchKw) {
        $resTtKw = t11_call_api($adminSession, 'audit_logs', 'GET', ['search' => $ttSearchKw]);
        $ttKwLogs = $resTtKw['json']['data']['logs'] ?? [];
        t11_assert($hasLogId($ttKwLogs, $ttId) && !$hasLogId($ttKwLogs, $tdId), "Tìm kiếm \"{$ttSearchKw}\" khớp TT và KHÔNG khớp TD");
    }

    $resXhc = t11_call_api($adminSession, 'audit_logs', 'GET', ['search' => 'xhc']);
    $xhcLogs = $resXhc['json']['data']['logs'] ?? [];
    t11_assert($hasLogId($xhcLogs, $xhId) && !$hasLogId($xhcLogs, $tdId) && !$hasLogId($xhcLogs, $ttId), 'Tìm kiếm "xhc" khớp XH');

    $resTdCn = t11_call_api($adminSession, 'audit_logs', 'GET', ['search' => 'TD+CN']);
    $tdCnLogs = $resTdCn['json']['data']['logs'] ?? [];
    t11_assert($hasLogId($tdCnLogs, $anomId) && !$hasLogId($tdCnLogs, $ttId), 'Tìm kiếm "TD+CN" khớp cả TD và CN, không dính TT');

    $resTdCnLower = t11_call_api($adminSession, 'audit_logs', 'GET', ['search' => 'td+cn']);
    $tdCnLowerLogs = $resTdCnLower['json']['data']['logs'] ?? [];
    t11_assert(
        $hasLogId($tdCnLowerLogs, $tdId) && $hasLogId($tdCnLowerLogs, $anomId) && !$hasLogId($tdCnLowerLogs, $ttId) && !$hasLogId($tdCnLowerLogs, $xhId),
        'Tìm kiếm "td+cn" khớp đúng hợp TD và CN'
    );

    $resTtXhc = t11_call_api($adminSession, 'audit_logs', 'GET', ['search' => 'tđ+xhc']);
    $ttXhcLogs = $resTtXhc['json']['data']['logs'] ?? [];
    t11_assert(
        $hasLogId($ttXhcLogs, $ttId) && $hasLogId($ttXhcLogs, $xhId) && !$hasLogId($ttXhcLogs, $tdId) && !$hasLogId($ttXhcLogs, $anomId),
        'Tìm kiếm "tđ+xhc" khớp đúng hợp TT và XH'
    );

    $resDataGroupSearch = t11_call_api($adminSession, 'audit_logs', 'GET', ['search' => 'Hội viên & điểm']);
    $dgLogs = $resDataGroupSearch['json']['data']['logs'] ?? [];
    t11_assert($hasLogId($dgLogs, $anomId), 'Tìm kiếm nội dung khớp được a.data_group LIKE ?');

    $anomRow = array_values(array_filter($tdCnLogs, static fn($l): bool => (int)$l['id'] === $anomId))[0] ?? [];
    t11_assert(($anomRow['object_display'] ?? '') === '091***678', 'SĐT ngoài danh sách được che dạng 091***678');
    t11_assert(($anomRow['object_type_label'] ?? '') === 'Hội viên' && ($anomRow['actor_role_label'] ?? '') === 'Chủ sân', 'Log trả object_type_label và actor_role_label tiếng Việt');

    $resCatTd = t11_call_api($adminSession, 'audit_logs', 'GET', ['action_type' => '__cat__:TD']);
    $catTdLogs = $resCatTd['json']['data']['logs'] ?? [];
    t11_assert($hasLogId($catTdLogs, $tdId) && !$hasLogId($catTdLogs, $ttId), 'Lọc dropdown action_type="__cat__:TD" khớp TD và KHÔNG khớp TT');

    $resCatXhc = t11_call_api($adminSession, 'audit_logs', 'GET', ['action_type' => '__cat__:XHC']);
    $catXhcLogs = $resCatXhc['json']['data']['logs'] ?? [];
    t11_assert($hasLogId($catXhcLogs, $xhId) && !$hasLogId($catXhcLogs, $tdId) && !$hasLogId($catXhcLogs, $ttId), 'Lọc dropdown action_type="__cat__:XHC" lọc đúng XH');

    $resCatAuto = t11_call_api($adminSession, 'audit_logs', 'GET', ['action_type' => '__cat__:AUTO']);
    $catAutoLogs = $resCatAuto['json']['data']['logs'] ?? [];
    t11_assert($hasLogId($catAutoLogs, $ttId) && !$hasLogId($catAutoLogs, $tdId) && !$hasLogId($catAutoLogs, $xhId), 'Lọc dropdown action_type="__cat__:AUTO" lọc đúng TT');

    $resCatTdVn = t11_call_api($adminSession, 'audit_logs', 'GET', ['action_type' => '__cat__:TĐ']);
    $catTdVnLogs = $resCatTdVn['json']['data']['logs'] ?? [];
    t11_assert($hasLogId($catTdVnLogs, $ttId) && !$hasLogId($catTdVnLogs, $tdId) && !$hasLogId($catTdVnLogs, $xhId), 'Lọc dropdown action_type="__cat__:TĐ" lọc đúng TT');

    $resCatInvalid = t11_call_api($adminSession, 'audit_logs', 'GET', ['action_type' => '__cat__:INVALID']);
    t11_assert((int)($resCatInvalid['json']['data']['pagination']['total'] ?? -1) === 0, 'Lọc dropdown action_type="__cat__:INVALID" trả về 0 bản ghi');

    $resDetailReveal = t11_call_api($adminSession, 'audit_log_detail', 'GET', ['id' => (string)$anomId, 'reveal' => '1']);
    t11_assert(($resDetailReveal['json']['data']['object_display'] ?? '') === '0912345678', 'Xem chi tiết reveal=1 trả SĐT đầy đủ và ghi SENSITIVE_DATA_ACCESS');
    $sensId = (int)$pdo->query("SELECT id FROM audit_logs WHERE action = 'SENSITIVE_DATA_ACCESS' AND object_code = 'LOG-{$anomId}' ORDER BY id DESC LIMIT 1")->fetchColumn();
    if ($sensId > 0) $createdLogIds[] = $sensId;
    t11_assert($sensId > 0, 'Đã ghi log SENSITIVE_DATA_ACCESS khi mở chi tiết dữ liệu nhạy cảm');

    // 6. Hậu kiểm (audit_review) & KPI summary
    echo "\n6. Kiểm tra POST audit_review, KPI summary & trạng thái ca:\n";
    $sumBefore = t11_call_api($adminSession, 'audit_summary', 'GET');
    $unrevBefore = (int)($sumBefore['json']['data']['unreviewed_anomalies'] ?? -1);

    $revBad = t11_call_api($adminSession, 'audit_review', 'POST', [], ['log_id' => $anomId, 'note' => 'dasdawdadwdasd']);
    $revOk  = t11_call_api($adminSession, 'audit_review', 'POST', [], ['log_id' => $anomId, 'note' => '[TEST] Đã kiểm tra chứng từ tặng điểm hợp lệ']);
    $revDup = t11_call_api($adminSession, 'audit_review', 'POST', [], ['log_id' => $anomId, 'note' => '[TEST] Ghi chú lần 2 phải bị chặn 409']);
    $revAuditId = (int)$pdo->query("SELECT id FROM audit_logs WHERE action = 'AUDIT_REVIEW' AND object_code = 'LOG-{$anomId}' ORDER BY id DESC LIMIT 1")->fetchColumn();
    if ($revAuditId > 0) $createdLogIds[] = $revAuditId;

    $sumAfter = t11_call_api($adminSession, 'audit_summary', 'GET');
    $unrevAfter = (int)($sumAfter['json']['data']['unreviewed_anomalies'] ?? -1);

    t11_assert(($revBad['json']['ref_code'] ?? '') === 'ERR_INVALID_REVIEW_NOTE', 'POST audit_review từ chối ghi chú rác vô nghĩa');
    t11_assert(($revOk['json']['success'] ?? false) === true && $revAuditId > 0, 'POST audit_review lưu audit_reviews và ghi AUDIT_REVIEW');
    t11_assert(($revDup['json']['ref_code'] ?? '') === 'ERR_ALREADY_REVIEWED', 'POST audit_review chặn hậu kiểm trùng lặp');
    t11_assert($unrevAfter === max(0, $unrevBefore - 1), "KPI bất thường chưa hậu kiểm giảm đúng ({$unrevBefore} -> {$unrevAfter})");

    // Verify latest_shift_status does NOT say "khớp quỹ" when a pending_explanation shift exists
    $pdo->prepare("INSERT INTO shifts (staff_id, staff_name, start_time, end_time, initial_cash, cash_total, transfer_total, actual_cash_received, staff_counted_cash, discrepancy_amount, discrepancy_reason, status) VALUES (?, '[TEST] Shift B1', NOW(), NOW(), 500000, 100000, 0, 580000, 580000, -20000, '[TEST] Lệch quỹ kiểm tra KPI', 'pending_explanation')")
        ->execute([(int)$staffRow['id']]);
    $createdShiftId = (int)$pdo->lastInsertId();
    $sumShift = t11_call_api($adminSession, 'audit_summary', 'GET');
    $shiftSt = $sumShift['json']['data']['latest_shift_status'] ?? [];
    t11_assert(
        in_array($shiftSt['level'] ?? '', ['warning', 'danger'], true) && !str_contains((string)($shiftSt['text'] ?? ''), 'khớp quỹ'),
        'KPI Thẻ 4 cảnh báo vàng/đỏ và KHÔNG ghi "khớp quỹ" khi có ca pending_explanation'
    );

    // 7. Export CSV with formula injection protection & audit log
    echo "\n7. Kiểm tra xuất CSV BOM UTF-8, che SĐT & chống formula injection:\n";
    $formulaId = AdminLogService::record($pdo, (int)$adminRow['id'], 'UPDATE_MEMBER', 'user', '0912345678', ['full_name' => 'Cũ'], ['full_name' => '=CMD|test!A0']);
    $createdLogIds[] = $formulaId;
    $csvRes = t11_call_api($adminSession, 'audit_export_csv', 'GET', ['search' => '0912345678']);
    $exportAuditId = (int)$pdo->query("SELECT id FROM audit_logs WHERE action = 'EXPORT_CSV' AND object_code = 'audit_logs' ORDER BY id DESC LIMIT 1")->fetchColumn();
    if ($exportAuditId > 0) $createdLogIds[] = $exportAuditId;

    t11_assert(str_starts_with($csvRes['raw'], "\xEF\xBB\xBF"), 'CSV xuất có BOM UTF-8');
    t11_assert(str_contains($csvRes['raw'], '091***678') && !str_contains($csvRes['raw'], '0912345678'), 'CSV che SĐT dạng 091***678');
    t11_assert(str_contains($csvRes['raw'], "'=CMD") || str_contains($csvRes['raw'], "'=CMD") || !preg_match('/(?:^|,)"?=CMD/', $csvRes['raw']), 'CSV vô hiệu hóa formula injection (=,+,-,@)');
    t11_assert($exportAuditId > 0, 'Xuất CSV tự ghi bản ghi EXPORT_CSV vào audit_logs');
} finally {
    if ($createdShiftId > 0) {
        $pdo->prepare("DELETE FROM shifts WHERE id = ?")->execute([$createdShiftId]);
    }
    if ($createdLogIds !== []) {
        $ph = implode(', ', array_fill(0, count($createdLogIds), '?'));
        $pdo->prepare("DELETE FROM audit_reviews WHERE log_id IN ({$ph})")->execute($createdLogIds);
        $pdo->prepare("DELETE FROM audit_logs WHERE id IN ({$ph})")->execute($createdLogIds);
    }
    if ($createdTmpMgrId > 0) {
        $pdo->prepare("DELETE FROM users WHERE id = ?")->execute([$createdTmpMgrId]);
    }
}

echo "\n=============================================\n";
echo "KẾT QUẢ TEST TAB 11 B1: {$passed} PASS, {$failed} FAIL\n";
exit($failed === 0 ? 0 : 1);
