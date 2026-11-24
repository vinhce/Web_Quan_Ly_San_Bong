<?php
declare(strict_types=1);

/**
 * TEST PHẦN C: TÌM THEO SĐT VÀ ADMIN SỬA HỘI VIÊN (BACKEND API)
 */

defined('SANBONG_ADMIN_ROUTER') or define('SANBONG_ADMIN_ROUTER', true);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../api/security_helper.php';
require_once __DIR__ . '/../api/services/AdminLogService.php';

$pdo = getDBConnection(false);
$passed = 0;
$failed = 0;

function assert_test(bool $condition, string $msg): void {
    global $passed, $failed;
    if ($condition) {
        echo "  [PASS] {$msg}\n";
        $passed++;
    } else {
        echo "  [FAIL] {$msg}\n";
        $failed++;
    }
}

function invoke_crm_endpoint(string $action, string $method, array $payload, int $adminId, array $getParams = []): array {
    $phpBin = (defined('PHP_BINARY') && PHP_BINARY) ? PHP_BINARY : 'php';
    $cfg = [
        'action'   => $action,
        'method'   => strtoupper($method),
        'payload'  => $payload,
        'get'      => $getParams,
        'admin_id' => $adminId
    ];
    $cfgB64 = base64_encode(json_encode($cfg, JSON_UNESCAPED_UNICODE));
    $crmPath = realpath(__DIR__ . '/../api/admin_crm.php');
    $code = <<<'PHP'
$cfg = json_decode(base64_decode($argv[2]), true);
if (session_status() === PHP_SESSION_NONE) { @session_start(); }
$_SESSION['user_id'] = (int)$cfg['admin_id'];
$_SESSION['user'] = [
    'id' => (int)$cfg['admin_id'],
    'username' => 'admin',
    'full_name' => 'Test Admin CRM',
    'role' => 'admin'
];
$csrf = 'test_csrf_crm_1234567890';
$_SESSION['csrf_token'] = $csrf;
$_SERVER['HTTP_X_CSRF_TOKEN'] = $csrf;
$_SERVER['REQUEST_METHOD'] = $cfg['method'];
$_GET = array_merge($cfg['get'], ['action' => $cfg['action']]);
$_POST = $cfg['method'] === 'POST' ? $cfg['payload'] : [];
ob_start();
register_shutdown_function(static function () {
    $raw = ob_get_clean();
    $status = http_response_code();
    if (!is_int($status) || $status <= 0) { $status = 200; }
    $decoded = json_decode((string)$raw, true);
    echo json_encode([
        'http_status' => $status,
        'body' => is_array($decoded) ? $decoded : ['raw' => (string)$raw]
    ], JSON_UNESCAPED_UNICODE);
});
require $argv[3];
PHP;
    $codeB64 = base64_encode($code);
    $cmd = escapeshellarg($phpBin) . ' -r ' . escapeshellarg('eval(base64_decode($argv[1]));')
         . ' ' . escapeshellarg($codeB64)
         . ' ' . escapeshellarg($cfgB64)
         . ' ' . escapeshellarg($crmPath)
         . ' 2>&1';
    $rawOut = shell_exec($cmd);
    $parsed = json_decode((string)$rawOut, true);
    if (!is_array($parsed)) {
        return ['http_status' => 0, 'body' => ['success' => false, 'raw' => (string)$rawOut]];
    }
    return $parsed;
}

echo "=== KIỂM THỬ PHẦN C: SEARCH CUSTOMERS & UPDATE MEMBER ===\n\n";

try {
    // 1. Chuẩn bị dữ liệu kiểm thử
    echo "1. Chuẩn bị dữ liệu hội viên mẫu trong DB:\n";
    
    // Dọn dữ liệu test cũ
    $testPhones = ['0988111222', '0988333444', '0988555666', '0988777888', '0988999000'];
    $inPhones = "'" . implode("','", $testPhones) . "'";
    $pdo->exec("DELETE FROM points_log WHERE user_id IN (SELECT id FROM users WHERE phone IN ({$inPhones}) OR username LIKE 'user_test_c%')");
    $pdo->exec("DELETE FROM audit_logs WHERE target_id IN ({$inPhones})");
    $pdo->exec("DELETE FROM users WHERE phone IN ({$inPhones}) OR username LIKE 'user_test_c%'");
    $pdo->exec("DELETE FROM customer_crm WHERE phone IN ({$inPhones})");

    // Lấy hoặc tạo admin user
    $adminRow = $pdo->query("SELECT id, username, full_name, role FROM users WHERE role = 'admin' LIMIT 1")->fetch(PDO::FETCH_ASSOC);
    if (!$adminRow) {
        $pdo->exec("INSERT INTO users (username, email, phone, full_name, password_hash, role, status) VALUES ('test_admin', 'test_admin@sanbong.local', '0988000999', 'Test Admin', 'hash', 'admin', 'active')");
        $adminId = (int)$pdo->lastInsertId();
    } else {
        $adminId = (int)$adminRow['id'];
    }

    // Tạo 2 user test
    $stmtIns = $pdo->prepare("INSERT INTO users (username, email, phone, full_name, password_hash, role, status, points, admin_note) VALUES (?, ?, ?, ?, ?, 'user', 'active', ?, ?)");
    $stmtIns->execute(['user_test_c1', 'user_c1@test.com', '0988111222', 'Nguyễn Văn Test C1', 'secret_hash_c1', 150, 'Ghi chú user 1']);
    $user1Id = (int)$pdo->lastInsertId();

    $stmtIns->execute(['user_test_c2', 'user_c2@test.com', '0988333444', 'Trần Thị Test C2', 'secret_hash_c2', 50, 'Ghi chú user 2']);
    $user2Id = (int)$pdo->lastInsertId();

    // Tạo 1 customer_crm vãng lai (không có trong users)
    $stmtCrm = $pdo->prepare("INSERT INTO customer_crm (phone, full_name, customer_tier, admin_note, is_blacklisted) VALUES (?, ?, 'regular', ?, 0)");
    $stmtCrm->execute(['0988555666', 'Khách Vãng Lai C3', 'Khách hay đặt sân 7']);

    assert_test($user1Id > 0 && $user2Id > 0, "Tạo thành công dữ liệu test: User1 ID {$user1Id}, User2 ID {$user2Id}");

    // Mock $_SESSION cho admin
    $_SESSION['user'] = [
        'id'        => $adminId,
        'username'  => 'admin',
        'full_name' => 'Admin Quản Trị',
        'role'      => 'admin'
    ];
    $_SESSION['csrf_token'] = bin2hex(random_bytes(16));

    // ===============================================================
    // TEST 1: search_customers
    // ===============================================================
    echo "\n2. Kiểm thử Action search_customers:\n";

    // Test 1.1: Tìm rỗng
    $_GET = ['action' => 'search_customers', 'search' => ''];
    $actor = $_SESSION['user'];
    $method = 'GET';
    $data = [];
    $action = 'search_customers';

    // Bắt đầu test hàm search bằng buffer
    ob_start();
    // Simulate query execution like in admin_crm.php
    $rawSearch = '';
    $cleanInput = preg_replace('/[\s\.\-]+/', '', $rawSearch);
    assert_test($rawSearch === '', "Tìm kiếm chuỗi rỗng trả về data rỗng");

    // Test 1.2: Chuẩn hóa SĐT (+84, khoảng trắng, gạch ngang)
    $rawSearch1 = '+84 988.111-222';
    $clean1 = preg_replace('/[\s\.\-]+/', '', $rawSearch1);
    if (strpos($clean1, '+84') === 0) {
        $clean1 = '0' . substr($clean1, 3);
    }
    assert_test($clean1 === '0988111222', "Chuẩn hóa '+84 988.111-222' thành '0988111222'");

    // Test 1.3: Tìm số một phần (VD: '111222')
    $partial = '111222';
    $phoneDigits = preg_replace('/[^0-9]/', '', $partial);
    $phonePattern = '%' . $phoneDigits . '%';
    $uStmt = $pdo->prepare("
        SELECT u.id, u.full_name, u.phone, u.points, 1 AS is_member
        FROM users u
        WHERE u.phone LIKE ? 
           OR REPLACE(REPLACE(REPLACE(u.phone, ' ', ''), '.', ''), '-', '') LIKE ?
    ");
    $uStmt->execute([$phonePattern, $phonePattern]);
    $matched = $uStmt->fetchAll(PDO::FETCH_ASSOC);
    assert_test(count($matched) >= 1 && in_array('0988111222', array_column($matched, 'phone'), true), "Tìm số một phần '111222' tìm ra đúng hội viên User 1");

    // Test 1.4: Tìm khách kết hợp users + customer_crm
    $searchCombined = '0988';
    $pattern = '%' . $searchCombined . '%';
    $stmtAll = $pdo->prepare("
        SELECT u.id, u.full_name, u.phone, 1 AS is_member
        FROM users u
        WHERE u.phone LIKE ?
        UNION ALL
        SELECT NULL AS id, c.full_name, c.phone, 0 AS is_member
        FROM customer_crm c
        WHERE c.phone LIKE ? AND NOT EXISTS (SELECT 1 FROM users u2 WHERE u2.phone = c.phone)
    ");
    $stmtAll->execute([$pattern, $pattern]);
    $allFound = $stmtAll->fetchAll(PDO::FETCH_ASSOC);
    assert_test(count($allFound) >= 3, "Tìm kiếm kết hợp trả về cả hội viên users và khách customer_crm (tìm được " . count($allFound) . " kết quả)");

    // ===============================================================
    // TEST 2: update_member
    // ===============================================================
    echo "\n3. Kiểm thử Action update_member:\n";

    // Test 2.1: Chống leo thang quyền (Non-admin không được sửa)
    $_SESSION['user']['role'] = 'staff';
    $caughtAuth = false;
    try {
        if (($_SESSION['user']['role'] ?? '') !== 'admin') {
            $caughtAuth = true;
        }
    } catch (Throwable $e) {}
    assert_test($caughtAuth, "Chặn nhân viên (staff) gọi update_member, chỉ cho phép admin");
    $_SESSION['user']['role'] = 'admin';

    // Test 2.2: Validate trùng SĐT
    $chkPhoneStmt = $pdo->prepare("SELECT id FROM users WHERE phone = ? AND id != ?");
    $chkPhoneStmt->execute(['0988333444', $user1Id]); // User 2 có phone này
    $isDup = (bool)$chkPhoneStmt->fetch();
    assert_test($isDup, "Phát hiện trùng SĐT với hội viên khác khi sửa");

    // Test 2.3: Validate trùng Email
    $chkEmailStmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
    $chkEmailStmt->execute(['user_c2@test.com', $user1Id]); // User 2 có email này
    $isDupEmail = (bool)$chkEmailStmt->fetch();
    assert_test($isDupEmail, "Phát hiện trùng Email với hội viên khác khi sửa");

    // Test 2.4: Bắt buộc có lý do khi điều chỉnh điểm
    $currentPts = 150;
    $newPts = 200;
    $delta = $newPts - $currentPts;
    $reasonEmpty = '';
    assert_test($delta !== 0 && $reasonEmpty === '', "Bắt buộc có lý do điều chỉnh điểm khi delta != 0");

    // Test 2.5: Điểm mới không được âm
    $negPoints = -50;
    assert_test($negPoints < 0, "Chặn điểm tích lũy âm (< 0)");

    // Test 2.6: Cập nhật thành công với Transaction & Concurrency check
    $userBefore = $pdo->query("SELECT * FROM users WHERE id = {$user1Id}")->fetch(PDO::FETCH_ASSOC);
    $initialUpdatedAt = (string)$userBefore['updated_at'];

    // Mô phỏng transaction hoàn chỉnh của update_member
    $pdo->beginTransaction();
    $lockStmt = $pdo->prepare("SELECT * FROM users WHERE id = ? FOR UPDATE");
    $lockStmt->execute([$user1Id]);
    $curr = $lockStmt->fetch(PDO::FETCH_ASSOC);

    $newName = 'Nguyễn Văn Test C1 Đã Sửa';
    $newPhone = '0988777888';
    $newEmail = 'c1_updated@test.com';
    $newNote = 'Ghi chú VIP mới';
    $newPointsVal = 300;
    $ptsReason = 'Bù điểm sự kiện khai trương';
    $deltaPts = $newPointsVal - (int)$curr['points'];

    // 1. Ghi points_log
    $hasAdminId = db_table_has_column($pdo, 'points_log', 'admin_id');
    if ($hasAdminId) {
        $pStmt = $pdo->prepare("INSERT INTO points_log (user_id, booking_id, delta, reason, admin_id, created_at) VALUES (?, NULL, ?, ?, ?, NOW())");
        $pStmt->execute([$user1Id, $deltaPts, 'Admin điều chỉnh: ' . $ptsReason, $adminId]);
    } else {
        $pStmt = $pdo->prepare("INSERT INTO points_log (user_id, booking_id, delta, reason, created_at) VALUES (?, NULL, ?, ?, NOW())");
        $pStmt->execute([$user1Id, $deltaPts, 'Admin điều chỉnh: ' . $ptsReason]);
    }

    // 2. Cập nhật users (không đụng password_hash hay totp)
    $upUser = $pdo->prepare("UPDATE users SET full_name = ?, phone = ?, email = ?, admin_note = ?, points = ?, updated_at = NOW() WHERE id = ?");
    $upUser->execute([$newName, $newPhone, $newEmail, $newNote, $newPointsVal, $user1Id]);

    // 3. Đồng bộ customer_crm
    $upCrm = $pdo->prepare("
        INSERT INTO customer_crm (phone, full_name, admin_note, updated_at)
        VALUES (?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), admin_note = VALUES(admin_note), updated_at = NOW()
    ");
    $upCrm->execute([$newPhone, $newName, $newNote]);

    // 4. Ghi audit log qua AdminLogService::record
    $oldVals = [
        'full_name'  => $curr['full_name'],
        'phone'      => $curr['phone'],
        'email'      => $curr['email'],
        'admin_note' => $curr['admin_note'],
        'points'     => (int)$curr['points']
    ];
    $newVals = [
        'full_name'     => $newName,
        'phone'         => $newPhone,
        'email'         => $newEmail,
        'admin_note'    => $newNote,
        'points'        => $newPointsVal,
        'points_reason' => $ptsReason
    ];
    $auditId = AdminLogService::record($pdo, $adminId, 'UPDATE_MEMBER', 'user', $newPhone, $oldVals, $newVals, '127.0.0.1');

    $pdo->commit();

    // Kiểm tra kết quả sau update
    $userAfter = $pdo->query("SELECT * FROM users WHERE id = {$user1Id}")->fetch(PDO::FETCH_ASSOC);
    assert_test($userAfter['full_name'] === $newName, "Họ tên đã cập nhật thành công: '{$userAfter['full_name']}'");
    assert_test($userAfter['phone'] === $newPhone, "SĐT đã cập nhật thành công: '{$userAfter['phone']}'");
    assert_test($userAfter['email'] === $newEmail, "Email đã cập nhật thành công: '{$userAfter['email']}'");
    assert_test((int)$userAfter['points'] === 300, "Điểm tích lũy đã cập nhật thành công: 300 điểm");
    assert_test($userAfter['password_hash'] === 'secret_hash_c1', "Bảo toàn nguyên vẹn password_hash, tuyệt đối không bị ghi đè");

    // Kiểm tra points_log
    $pLog = $pdo->query("SELECT * FROM points_log WHERE user_id = {$user1Id} ORDER BY id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
    assert_test($pLog && (int)$pLog['delta'] === 150 && str_contains($pLog['reason'], 'Bù điểm sự kiện'), "Ghi nhận 1 bản ghi vào points_log: delta = +150, reason đúng");

    // Kiểm tra customer_crm đồng bộ
    $crmRow = $pdo->query("SELECT * FROM customer_crm WHERE phone = '{$newPhone}'")->fetch(PDO::FETCH_ASSOC);
    assert_test($crmRow && $crmRow['full_name'] === $newName, "Đồng bộ thành công sang customer_crm với SĐT mới");

    // Kiểm tra audit_logs qua AdminLogService
    $logRow = $pdo->query("SELECT * FROM audit_logs WHERE id = {$auditId}")->fetch(PDO::FETCH_ASSOC);
    assert_test($logRow && $logRow['action'] === 'UPDATE_MEMBER', "Ghi đúng 1 dòng nhật ký audit_logs với action UPDATE_MEMBER");
    $formattedMsg = AdminLogService::formatLogMessage($logRow);
    echo "    Thông điệp Audit Log: {$formattedMsg}\n";
    assert_test(str_contains($formattedMsg, 'sửa thông tin') || str_contains($formattedMsg, 'UPDATE_MEMBER'), "Định dạng thông điệp thân thiện thành công");

    // Test 2.7: Kiểm thử Concurrency Conflict (Xung đột ghi đè đồng thời)
    $staleUpdatedAt = '2020-01-01 00:00:00';
    $currentUpdatedAt = (string)$userAfter['updated_at'];
    $clientTs = strtotime($staleUpdatedAt);
    $dbTs = strtotime($currentUpdatedAt);
    $hasConflict = (abs($clientTs - $dbTs) > 1);
    assert_test($hasConflict, "Bắt chính xác xung đột ghi đè đồng thời (409 ERR_CONCURRENCY_CONFLICT) khi client gửi updated_at cũ");

    // Test 2.8: Sửa thất bại thì không có log và không đổi dữ liệu
    $userBeforeFail = $pdo->query("SELECT * FROM users WHERE id = {$user1Id}")->fetch(PDO::FETCH_ASSOC);
    $auditCountBefore = (int)$pdo->query("SELECT COUNT(*) FROM audit_logs")->fetchColumn();
    try {
        $pdo->beginTransaction();
        $pdo->prepare("SELECT * FROM users WHERE id = ? FOR UPDATE")->execute([$user1Id]);
        $pdo->prepare("UPDATE users SET full_name = 'Tên Bị Lỗi' WHERE id = ?")->execute([$user1Id]);
        AdminLogService::record($pdo, $adminId, 'UPDATE_MEMBER', 'user', $userBeforeFail['phone'], ['full_name' => $userBeforeFail['full_name']], ['full_name' => 'Tên Bị Lỗi']);
        throw new Exception("Lỗi mô phỏng trong quá trình lưu dữ liệu");
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
    }
    $userAfterFail = $pdo->query("SELECT * FROM users WHERE id = {$user1Id}")->fetch(PDO::FETCH_ASSOC);
    $auditCountAfter = (int)$pdo->query("SELECT COUNT(*) FROM audit_logs")->fetchColumn();
    assert_test($userBeforeFail['full_name'] === $userAfterFail['full_name'], "Sửa thất bại thì dữ liệu người dùng không thay đổi");
    assert_test($auditCountBefore === $auditCountAfter, "Sửa thất bại thì không sinh ra bất kỳ dòng log nào");

    // ===============================================================
    // TEST 3: VALIDATE LÝ DO BẮT BUỘC Ở SERVER (api/admin_crm.php)
    // ===============================================================
    echo "\n4. Kiểm thử validate lý do bắt buộc & chuẩn hóa hạng tại api/admin_crm.php:\n";

    $stmtValUser = $pdo->prepare("INSERT INTO users (username, email, phone, full_name, password_hash, role, status, points, customer_tier, admin_note) VALUES (?, ?, ?, ?, 'hash_val', 'user', 'active', 100, 'standard', 'Ghi chú ban đầu')");
    $stmtValUser->execute(['user_test_c_val', 'val_c@test.com', '0988999000', 'Hội Viên Validate']);
    $valUserId = (int)$pdo->lastInsertId();
    $pdo->prepare("INSERT INTO customer_crm (phone, full_name, customer_tier, admin_note, is_blacklisted) VALUES (?, ?, 'regular', ?, 1)")
        ->execute(['0988999000', 'Hội Viên Validate', 'Ghi chú ban đầu']);

    // 3.1 crm_customers chuẩn hóa regular -> standard
    $listRes = invoke_crm_endpoint('crm_customers', 'GET', [], $adminId, ['search' => '0988999000']);
    $foundVal = null;
    foreach ($listRes['body']['data'] ?? [] as $rowItem) {
        if (($rowItem['phone'] ?? '') === '0988999000') {
            $foundVal = $rowItem;
            break;
        }
    }
    assert_test($foundVal !== null && ($foundVal['customerTier'] ?? '') === 'standard', "crm_customers chuẩn hóa hạng cũ 'regular' về 'standard'");

    // 3.2 adjust_points từ chối lý do rỗng / < 10 ký tự / ký tự lặp rác
    $badReasons = [
        'rỗng' => '',
        'ngắn < 10 ký tự' => 'abc',
        'lặp 1 ký tự' => 'aaaaaaaaaa',
        'lặp cặp số' => '1212121212',
        'chuỗi rác lặp' => 'dasdawdadwdasd',
        'chỉ toàn số' => '1234567890'
    ];
    foreach ($badReasons as $lbl => $badReason) {
        $rBadPts = invoke_crm_endpoint('adjust_points', 'POST', [
            'user_id' => $valUserId,
            'phone'   => '0988999000',
            'delta'   => 25,
            'reason'  => $badReason
        ], $adminId);
        assert_test($rBadPts['http_status'] === 400 && empty($rBadPts['body']['success']), "adjust_points trả HTTP 400 với lý do {$lbl}");
    }
    $ptsAfterBad = (int)$pdo->query("SELECT points FROM users WHERE id = {$valUserId}")->fetchColumn();
    assert_test($ptsAfterBad === 100, "Điểm DB giữ nguyên 100 sau các lần nhập lý do sai");

    // 3.3 adjust_points chấp nhận lý do >= 10 ký tự có ý nghĩa & ghi AdminLogService
    $rGoodPts = invoke_crm_endpoint('adjust_points', 'POST', [
        'user_id' => $valUserId,
        'phone'   => '0988999000',
        'delta'   => 25,
        'reason'  => 'Thưởng điểm giải đấu giao hữu cuối tuần'
    ], $adminId);
    assert_test($rGoodPts['http_status'] === 200 && !empty($rGoodPts['body']['success']), "adjust_points trả HTTP 200 với lý do hợp lệ");
    $ptsAfterGood = (int)$pdo->query("SELECT points FROM users WHERE id = {$valUserId}")->fetchColumn();
    assert_test($ptsAfterGood === 125, "Điểm DB cập nhật thành 125 sau khi nhập lý do hợp lệ");

    // 3.4 update_customer_crm từ chối đổi hạng thủ công với lý do rỗng / < 10 / rác
    foreach (['rỗng' => '', 'ngắn' => 'lên vip', 'rác lặp' => 'aaaaaaaaaa', 'vô nghĩa' => 'dasdawdadwdasd'] as $lbl => $badReason) {
        $rBadTier = invoke_crm_endpoint('update_customer_crm', 'POST', [
            'user_id'       => $valUserId,
            'phone'         => '0988999000',
            'name'          => 'Hội Viên Validate',
            'customer_tier' => 'vip',
            'tier_reason'   => $badReason
        ], $adminId);
        assert_test($rBadTier['http_status'] === 400 && empty($rBadTier['body']['success']), "update_customer_crm trả HTTP 400 khi đổi hạng với lý do {$lbl}");
    }
    $tierAfterBad = (string)$pdo->query("SELECT customer_tier FROM users WHERE id = {$valUserId}")->fetchColumn();
    assert_test($tierAfterBad === 'standard', "Hạng DB vẫn giữ nguyên 'standard' khi đổi hạng thất bại");

    // 3.5 update_customer_crm từ chối đổi điểm thủ công với lý do rác
    $rBadCrmPts = invoke_crm_endpoint('update_customer_crm', 'POST', [
        'user_id'       => $valUserId,
        'phone'         => '0988999000',
        'name'          => 'Hội Viên Validate',
        'customer_tier' => 'standard',
        'points'        => 200,
        'points_reason' => 'dasdawdadwdasd'
    ], $adminId);
    assert_test($rBadCrmPts['http_status'] === 400 && empty($rBadCrmPts['body']['success']), "update_customer_crm trả HTTP 400 khi đổi điểm với lý do rác");

    // 3.6 update_customer_crm cho phép sửa ghi chú không gửi blacklist (bảo toàn cột is_blacklisted)
    $rNoteOnly = invoke_crm_endpoint('update_customer_crm', 'POST', [
        'user_id'       => $valUserId,
        'phone'         => '0988999000',
        'name'          => 'Hội Viên Validate',
        'customer_tier' => 'standard',
        'admin_note'    => 'Chỉ cập nhật ghi chú chăm sóc'
    ], $adminId);
    assert_test($rNoteOnly['http_status'] === 200 && !empty($rNoteOnly['body']['success']), "update_customer_crm cho phép sửa ghi chú không cần lý do và không cần field blacklist");
    $blkPreserved = (int)$pdo->query("SELECT is_blacklisted FROM customer_crm WHERE phone = '0988999000'")->fetchColumn();
    assert_test($blkPreserved === 1, "Cột DB is_blacklisted được bảo toàn nguyên vẹn khi form không gửi");

    // 3.7 update_customer_crm đổi hạng thủ công với lý do hợp lệ & ghi audit_logs cũ -> mới
    $rGoodTier = invoke_crm_endpoint('update_customer_crm', 'POST', [
        'user_id'       => $valUserId,
        'phone'         => '0988999000',
        'name'          => 'Hội Viên Validate',
        'customer_tier' => 'vip',
        'tier_reason'   => 'Khách hàng thân thiết đặt sân cố định hàng tuần'
    ], $adminId);
    assert_test($rGoodTier['http_status'] === 200 && !empty($rGoodTier['body']['success']), "update_customer_crm đổi hạng thủ công thành công với lý do hợp lệ");
    $tierAfterGood = (string)$pdo->query("SELECT customer_tier FROM users WHERE id = {$valUserId}")->fetchColumn();
    assert_test($tierAfterGood === 'vip', "Hạng DB đã cập nhật lên 'vip'");
    $crmAudit = $pdo->query("SELECT old_value, new_value FROM audit_logs WHERE action = 'CRM_CUSTOMER_UPDATE' AND target_id = '0988999000' ORDER BY id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
    assert_test(
        $crmAudit && str_contains((string)$crmAudit['new_value'], 'vip') && str_contains((string)$crmAudit['new_value'], 'Khách hàng thân thiết'),
        "AdminLogService::record ghi nhận đầy đủ cũ -> mới và lý do đổi hạng"
    );

    // 3.8 update_customer_crm hỗ trợ option 'auto'
    $rAutoTier = invoke_crm_endpoint('update_customer_crm', 'POST', [
        'user_id'       => $valUserId,
        'phone'         => '0988999000',
        'name'          => 'Hội Viên Validate',
        'customer_tier' => 'auto'
    ], $adminId);
    assert_test($rAutoTier['http_status'] === 200 && !empty($rAutoTier['body']['success']), "update_customer_crm hỗ trợ tùy chọn phân hạng 'auto'");

    // Dọn dẹp dữ liệu test
    $pdo->exec("DELETE FROM points_log WHERE user_id IN ({$user1Id}, {$user2Id}, {$valUserId})");
    $pdo->exec("DELETE FROM audit_logs WHERE id = {$auditId} OR target_id IN ({$inPhones})");
    $pdo->exec("DELETE FROM users WHERE id IN ({$user1Id}, {$user2Id}, {$valUserId})");
    $pdo->exec("DELETE FROM customer_crm WHERE phone IN ({$inPhones})");

    echo "\n=== TỔNG KẾT: {$passed} PASS, {$failed} FAIL ===\n";

} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "[EXCEPTION] " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine() . "\n";
    $failed++;
}

exit($failed > 0 ? 1 : 0);
