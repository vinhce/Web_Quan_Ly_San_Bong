<?php
declare(strict_types=1);

/**
 * TEST PHẦN A: ADMIN LOG SERVICE & AUDIT LOGS ENDPOINT
 */

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

echo "=== KIỂM THỬ PHẦN A: ADMIN LOG SYSTEM ===\n\n";

$adminUser = $pdo->query("SELECT id, username, full_name, role FROM users WHERE role = 'admin' LIMIT 1")->fetch(PDO::FETCH_ASSOC);
if (!$adminUser) {
    die("Lỗi: Không tìm thấy tài khoản admin trong CSDL để test!\n");
}
$adminId = (int)$adminUser['id'];

// TEST 1: Diff cũ → mới chỉ lưu các trường thực sự thay đổi
echo "1. Kiểm tra diffing & che thông tin nhạy cảm:\n";
$oldData = [
    'full_name' => 'Trần B',
    'phone' => '0912345678',
    'email' => 'tranb@gmail.com',
    'bank_account' => '9704123456789999',
    'cccd' => '001099012345',
    'password_hash' => '$2y$10$abcdef1234567890',
    'totp_secret' => 'JBSWY3DPEHPK3PXP'
];
$newData = [
    'full_name' => 'Trần Văn B',
    'phone' => '0912345678', // không đổi
    'email' => 'tranvanb@gmail.com',
    'bank_account' => '9704123456789999', // không đổi
    'cccd' => '001099012345', // không đổi
    'password_hash' => '$2y$10$newhashvalue9999', // nhạy cảm, phải bị loại bỏ
    'totp_secret' => 'NEWTOTPSECRET123' // nhạy cảm, phải bị loại bỏ
];

$pdo->beginTransaction();
$logId = AdminLogService::record($pdo, $adminId, 'UPDATE_MEMBER', 'user', '123', $oldData, $newData, '192.168.1.100');
$pdo->commit();

$logRow = $pdo->query("SELECT * FROM audit_logs WHERE id = {$logId}")->fetch(PDO::FETCH_ASSOC);
$loggedOld = json_decode($logRow['old_value'], true);
$loggedNew = json_decode($logRow['new_value'], true);

assert_test(isset($loggedOld['full_name']) && $loggedOld['full_name'] === 'Trần B', 'old_value có full_name cũ');
assert_test(isset($loggedNew['full_name']) && $loggedNew['full_name'] === 'Trần Văn B', 'new_value có full_name mới');
assert_test(isset($loggedOld['email']) && isset($loggedNew['email']), 'Ghi nhận trường email thay đổi');
assert_test(!isset($loggedOld['phone']), 'Không lưu phone vì phone không đổi');
assert_test(!isset($loggedOld['password_hash']) && !isset($loggedNew['password_hash']), 'Tuyệt đối không lưu password_hash');
assert_test(!isset($loggedOld['totp_secret']) && !isset($loggedNew['totp_secret']), 'Tuyệt đối không lưu totp_secret');
assert_test($logRow['ip'] === '192.168.1.100', 'Ghi nhận IP chính xác');
assert_test($logRow['target_type'] === 'user' && $logRow['target_id'] === '123', 'Ghi nhận target_type và target_id');

// TEST 2: Che thông tin nhạy cảm CCCD & STK khi có thay đổi
echo "\n2. Kiểm tra masking dữ liệu nhạy cảm (CCCD, Số tài khoản):\n";
$oldBank = ['bank_account' => '9704000011112222', 'cccd' => '001088123456'];
$newBank = ['bank_account' => '9704888899993333', 'cccd' => '001088654321'];
$pdo->beginTransaction();
$maskLogId = AdminLogService::record($pdo, $adminId, 'UPDATE_FINANCE', 'user', '123', $oldBank, $newBank);
$pdo->commit();

$maskRow = $pdo->query("SELECT * FROM audit_logs WHERE id = {$maskLogId}")->fetch(PDO::FETCH_ASSOC);
$maskLoggedOld = json_decode($maskRow['old_value'], true);
$maskLoggedNew = json_decode($maskRow['new_value'], true);

assert_test(str_contains($maskLoggedOld['bank_account'], '****'), 'Số tài khoản cũ được che một phần');
assert_test(str_contains($maskLoggedNew['bank_account'], '****'), 'Số tài khoản mới được che một phần');
assert_test(str_contains($maskLoggedOld['cccd'], '****'), 'CCCD cũ được che một phần');
assert_test(str_contains($maskLoggedNew['cccd'], '****'), 'CCCD mới được che một phần');

// TEST 3: Ghi trong cùng transaction - Rollback thì không có log
echo "\n3. Kiểm tra transaction: Thao tác thất bại thì log bị hủy:\n";
$countBefore = (int)$pdo->query("SELECT COUNT(*) FROM audit_logs")->fetchColumn();
try {
    $pdo->beginTransaction();
    AdminLogService::record($pdo, $adminId, 'SHOULD_FAIL', 'test', '999', ['a' => 1], ['a' => 2]);
    throw new Exception("Thao tác nghiệp vụ thất bại!");
    $pdo->commit();
} catch (Exception $e) {
    $pdo->rollBack();
}
$countAfter = (int)$pdo->query("SELECT COUNT(*) FROM audit_logs")->fetchColumn();
assert_test($countBefore === $countAfter, 'Khi rollback, số lượng audit_logs không đổi (không lưu log mồ côi)');

// TEST 4: Format chuỗi đọc được ngay
echo "\n4. Kiểm tra format dòng đọc được ngay:\n";
$sampleMemberLog = [
    'actor_name' => 'Nguyễn A',
    'action' => 'UPDATE_MEMBER',
    'target_type' => 'user',
    'target_id' => '0912xxx678',
    'old_value' => json_encode(['full_name' => 'Trần B']),
    'new_value' => json_encode(['full_name' => 'Trần Văn B']),
    'created_at' => '2026-11-16 20:15:00'
];
$msg1 = AdminLogService::formatLogMessage($sampleMemberLog);
assert_test(str_contains($msg1, "Admin Nguyễn A sửa họ tên hội viên 0912xxx678: 'Trần B' → 'Trần Văn B'"), "Dòng sửa họ tên đúng định dạng");

$samplePointsLog = [
    'actor_name' => 'Nguyễn A',
    'action' => 'ADJUST_POINTS',
    'target_type' => 'user',
    'target_id' => '0912xxx678',
    'old_value' => json_encode(['points' => 546]),
    'new_value' => json_encode(['points' => 600, 'reason' => 'tặng điểm']),
    'created_at' => '2026-11-16 20:16:00'
];
$msg2 = AdminLogService::formatLogMessage($samplePointsLog);
assert_test(str_contains($msg2, "Admin Nguyễn A điều chỉnh điểm hội viên 0912xxx678: 546 → 600 (lý do: tặng điểm)"), "Dòng điều chỉnh điểm đúng định dạng");

// TEST 5: Phân quyền & Chặn phương thức sửa/xóa (HTTP 405 & 403)
echo "\n5. Kiểm tra bảo mật API Endpoint (HTTP 405 & 403):\n";
$phpBin = PHP_BINARY;

// a) Test POST request to audit_logs -> 405
$outputPost = shell_exec("\"{$phpBin}\" tests/sub_test_audit_api.php post_method 2>&1");
$respPost = json_decode($outputPost ?: '', true);
assert_test($respPost && isset($respPost['ref_code']) && $respPost['ref_code'] === 'ERR_AUDIT_IMMUTABLE', 'Chặn phương thức POST với mã 405 ERR_AUDIT_IMMUTABLE');

// b) Test Non-admin access -> 403
$outputNonAdmin = shell_exec("\"{$phpBin}\" tests/sub_test_audit_api.php non_admin 2>&1");
$respNonAdmin = json_decode($outputNonAdmin ?: '', true);
assert_test($respNonAdmin && isset($respNonAdmin['success']) && $respNonAdmin['success'] === false, 'Nhân viên role staff bị chặn truy cập route audit_logs (403)');

// TEST 6: Phân trang & Lọc API
echo "\n6. Kiểm tra phân trang và lọc API:\n";
$outputPaging = shell_exec("\"{$phpBin}\" tests/sub_test_audit_api.php paging_search 2>&1");
$respPaging = json_decode($outputPaging ?: '', true);

assert_test($respPaging && $respPaging['success'] === true, 'Gọi API audit_logs với Admin thành công');
assert_test(isset($respPaging['data']['pagination']['page']) && $respPaging['data']['pagination']['page'] === 1, 'Trang hiện tại là 1');
assert_test(isset($respPaging['data']['pagination']['limit']) && $respPaging['data']['pagination']['limit'] === 10, 'Giới hạn 10 dòng/trang');
assert_test(isset($respPaging['data']['pagination']['total']) && $respPaging['data']['pagination']['total'] >= 1, 'Tìm thấy kết quả theo từ khóa');
assert_test(isset($respPaging['data']['logs'][0]['formatted_message']), 'Mỗi log row có trường formatted_message');

// TEST 7: XSS protection
echo "\n7. Kiểm tra chống tấn công XSS:\n";
$xssLog = [
    'actor_name' => '<script>alert("admin")</script>',
    'action' => 'UPDATE_MEMBER',
    'target_type' => 'user',
    'target_id' => '<img src=x onerror=alert(1)>',
    'old_value' => json_encode(['full_name' => '<script>alert("xss")</script>']),
    'new_value' => json_encode(['full_name' => '<b>Hack</b>']),
    'created_at' => '2026-11-16 20:20:00'
];
$xssMsg = AdminLogService::formatLogMessage($xssLog);
assert_test(!str_contains($xssMsg, '<script>'), 'Format message không cho phép thẻ script thô (đã escape hoặc làm sạch)');
assert_test(!str_contains($xssMsg, '<img'), 'Format message không cho phép thẻ img thô (đã escape hoặc làm sạch)');

// Dọn dẹp bản ghi test đã tạo
$delStmt = $pdo->prepare("DELETE FROM audit_logs WHERE id IN (?, ?)");
$delStmt->execute([(int)$logId, (int)$maskLogId]);

echo "\n=============================================\n";
echo "KẾT QUẢ KIỂM THỬ PHẦN A: {$passed} PASS, {$failed} FAIL\n";
if ($failed === 0) {
    echo ">>> PHẦN A ĐẠT YÊU CẦU 100% <<<\n";
    exit(0);
} else {
    echo ">>> CÒN LỖI CẦN SỬA <<<\n";
    exit(1);
}
