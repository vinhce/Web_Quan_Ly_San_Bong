<?php
/**
 * Test kiểm thử bảo mật Hạng mục 6: Backup Database Endpoint (api/admin.php action=backup_database_now)
 */

echo "=== TEST KIỂM THỬ BẢO MẬT HẠNG MỤC 6: Backup Database Endpoint ===\n";

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../api/security_helper.php';

$pdo = getDBConnection(false);
$errors = [];

function runActionHelper(array $config): array {
    $raw = base64_encode(json_encode($config));
    $phpExe = 'C:\\laragon\\bin\\php\\php-8.3.36-Win32-vs16-x64\\php.exe';
    if (!file_exists($phpExe)) {
        $phpExe = 'php';
    }
    $cmd = "\"{$phpExe}\" " . escapeshellarg(__DIR__ . '/run_admin_action.php') . " " . escapeshellarg($raw);
    $output = shell_exec($cmd);
    $json = json_decode($output, true);
    return is_array($json) ? $json : ['raw' => $output];
}

// -------------------------------------------------------------
// Test Case 1: GET request bị chặn (405 Method Not Allowed)
// -------------------------------------------------------------
echo "\n--- Test Case 1: GET request bị chặn (405 Method Not Allowed) ---\n";
$resGet = runActionHelper([
    'method' => 'GET',
    'action' => 'backup_database_now',
    'session' => [
        'user_id' => 1,
        'user' => ['id' => 1, 'username' => 'admin', 'role' => 'admin']
    ]
]);
if (!empty($resGet['success'])) {
    $errors[] = "TC1: GET request tới backup_database_now phải bị từ chối.";
} else {
    echo "TC1: ĐẠT: GET request đã bị chặn thành công (" . ($resGet['message'] ?? 'Method not allowed') . ").\n";
}

// -------------------------------------------------------------
// Test Case 2: Role 'staff' gọi backup -> Bị chặn 403 Forbidden
// -------------------------------------------------------------
echo "\n--- Test Case 2: Role 'staff' gọi backup -> Bị chặn 403 Forbidden ---\n";
$resStaff = runActionHelper([
    'method' => 'POST',
    'action' => 'backup_database_now',
    'session' => [
        'user_id' => 2,
        'user' => ['id' => 2, 'username' => 'staff01', 'role' => 'staff']
    ]
]);
if (!empty($resStaff['success'])) {
    $errors[] = "TC2: LỖI BẢO MẬT: Role staff không được phép thực hiện sao lưu database!";
} else {
    echo "TC2: ĐẠT: Role staff đã bị chặn quyền sao lưu (" . ($resStaff['message'] ?? 'Forbidden') . ").\n";
}

// -------------------------------------------------------------
// Test Case 3: Admin gọi POST backup_database_now -> Thành công và ghi audit log
// -------------------------------------------------------------
echo "\n--- Test Case 3: Admin gọi POST backup_database_now -> Thành công ---\n";
$resAdmin = runActionHelper([
    'method' => 'POST',
    'action' => 'backup_database_now',
    'session' => [
        'user_id' => 1,
        'user' => ['id' => 1, 'username' => 'admin', 'role' => 'admin']
    ]
]);

if (empty($resAdmin['success'])) {
    $errors[] = "TC3: Admin gọi backup_database_now thất bại: " . ($resAdmin['message'] ?? json_encode($resAdmin));
} else {
    echo "TC3: ĐẠT: Sao lưu thành công! File: " . ($resAdmin['data']['filename'] ?? 'N/A') . " (Dung lượng: " . ($resAdmin['data']['file_size'] ?? 0) . " bytes)\n";
    
    // Kiểm tra audit log
    if ($pdo) {
        $auditStmt = $pdo->prepare("SELECT * FROM audit_logs WHERE action = 'DATABASE_BACKUP' ORDER BY id DESC LIMIT 1");
        $auditStmt->execute();
        $logRow = $auditStmt->fetch(PDO::FETCH_ASSOC);
        if ($logRow) {
            echo "TC3: ĐẠT: Đã ghi nhận Audit Log ID #{$logRow['id']}: {$logRow['action']} - {$logRow['new_value']}\n";
        } else {
            $errors[] = "TC3: Không tìm thấy bản ghi Audit Log cho hành động DATABASE_BACKUP.";
        }
    }
}

// -------------------------------------------------------------
// TỔNG HỢP KẾT QUẢ
// -------------------------------------------------------------
echo "\n=======================================================\n";
if (!empty($errors)) {
    echo "KẾT QUẢ TEST: PHÁT HIỆN " . count($errors) . " LỖI:\n";
    foreach ($errors as $i => $err) {
        echo "  " . ($i + 1) . ". " . $err . "\n";
    }
    exit(1);
} else {
    echo "KẾT QUẢ TEST: 100% PASS - Tất cả tiêu chuẩn Hạng mục 6 đều đạt!\n";
    exit(0);
}
