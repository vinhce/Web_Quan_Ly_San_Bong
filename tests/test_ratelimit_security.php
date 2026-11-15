<?php
/**
 * Test kiểm thử bảo mật Hạng mục 4: api/security_helper.php - Rate Limiter Fail-Closed & DB Fallback
 */

echo "=== TEST KIỂM THỬ BẢO MẬT HẠNG MỤC 4: Rate Limiter Fail-Closed & DB Fallback ===\n";

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../api/security_helper.php';

$pdo = getDBConnection(false);
$errors = [];

// =========================================================================
// TEST CASE 1: File rate limit hoạt động bình thường (Happy path)
// =========================================================================
echo "\n--- Test Case 1: Chế độ File bình thường ---\n";
$actionNormal = 'test_sec_normal';
clear_rate_limit($pdo, $actionNormal);

if (!check_rate_limit($pdo, $actionNormal, 3, 60)) {
    $errors[] = "TC1: Ban đầu check_rate_limit phải trả về true.";
}

increment_rate_limit($pdo, $actionNormal, 60);
increment_rate_limit($pdo, $actionNormal, 60);
if (!check_rate_limit($pdo, $actionNormal, 3, 60)) {
    $errors[] = "TC1: Sau 2 lần thử (ngưỡng 3), check_rate_limit vẫn phải trả về true.";
}

increment_rate_limit($pdo, $actionNormal, 60); // Lần 3: chạm ngưỡng 3
if (check_rate_limit($pdo, $actionNormal, 3, 60)) {
    $errors[] = "TC1: Đã chạm ngưỡng 3 attempts, check_rate_limit phải trả về false.";
}

clear_rate_limit($pdo, $actionNormal);
if (!check_rate_limit($pdo, $actionNormal, 3, 60)) {
    $errors[] = "TC1: Sau khi clear_rate_limit, check_rate_limit phải mở lại (true).";
}
echo "TC1: Hoàn thành.\n";

// =========================================================================
// TEST CASE 2: File inaccessible & KHÔNG CÓ DB -> Phải FAIL-CLOSED (trả về false)
// =========================================================================
echo "\n--- Test Case 2: File inaccessible & KHÔNG CÓ DB (Fail-Closed) ---\n";
$actionNoDb = 'test_sec_locked_nodb';
$fileNoDb = get_rate_limit_file($actionNoDb);
if (file_exists($fileNoDb)) {
    @unlink($fileNoDb);
}
// Tạo thư mục trùng tên file để fopen() thất bại hoàn toàn (inaccessible)
@mkdir($fileNoDb, 0750, true);

$allowedNoDb = check_rate_limit(null, $actionNoDb, 3, 60);
if ($allowedNoDb === true) {
    $errors[] = "TC2: LỖI BẢO MẬT (FAIL-OPEN): Khi file không thể mở và không có DB, check_rate_limit trả về true!";
} else {
    echo "TC2: ĐẠT: Khi file inaccessible và không có DB, check_rate_limit đã fail-closed (false).\n";
}
@rmdir($fileNoDb);

// =========================================================================
// TEST CASE 3: File inaccessible & CÓ DB -> Phải Fallback sang DB rate_limits
// =========================================================================
echo "\n--- Test Case 3: File inaccessible & CÓ DB -> Fallback sang DB rate_limits ---\n";
if (!$pdo) {
    $errors[] = "TC3: Cần kết nối MySQL để kiểm tra fallback DB.";
} else {
    $actionFb = 'test_sec_fallback_db';
    clear_rate_limit($pdo, $actionFb);

    $fileFb = get_rate_limit_file($actionFb);
    if (file_exists($fileFb)) {
        @unlink($fileFb);
    }
    // Tạo thư mục trùng tên để file inaccessible
    @mkdir($fileFb, 0750, true);

    // Khi file bị inaccessible, check_rate_limit phải fallback sang DB
    // Ban đầu DB chưa có attempts -> phải true
    $initCheck = check_rate_limit($pdo, $actionFb, 2, 60);
    if (!$initCheck) {
        $errors[] = "TC3: Khi DB fallback chưa có attempts, check_rate_limit phải trả về true.";
    }

    // Tăng lần 1 vào DB fallback
    increment_rate_limit($pdo, $actionFb, 60);
    $check1 = check_rate_limit($pdo, $actionFb, 2, 60);
    if (!$check1) {
        $errors[] = "TC3: Lần 1 (ngưỡng 2), check_rate_limit trong DB fallback phải trả về true.";
    }

    // Tăng lần 2 vào DB fallback -> chạm ngưỡng 2
    increment_rate_limit($pdo, $actionFb, 60);
    $check2 = check_rate_limit($pdo, $actionFb, 2, 60);
    if ($check2) {
        $errors[] = "TC3: Đã chạm ngưỡng 2 attempts trong DB fallback, check_rate_limit phải trả về false.";
    } else {
        echo "TC3: ĐẠT: Rate limiter fallback sang DB và chặn thành công khi vượt ngưỡng attempts!\n";
    }

    // Xóa file giả lập để clear_rate_limit dọn dẹp DB
    @rmdir($fileFb);
    clear_rate_limit($pdo, $actionFb);
    
    // Tạo lại file giả lập để kiểm tra DB đã được clear
    @mkdir($fileFb, 0750, true);
    $checkAfterClear = check_rate_limit($pdo, $actionFb, 2, 60);
    if (!$checkAfterClear) {
        $errors[] = "TC3: Sau khi clear_rate_limit, DB fallback phải được mở lại (true).";
    } else {
        echo "TC3: ĐẠT: clear_rate_limit đồng bộ xóa bản ghi trong DB fallback thành công!\n";
    }
    @rmdir($fileFb);
    clear_rate_limit($pdo, $actionFb);
}

// =========================================================================
// TEST CASE 4: Kiểm tra tương thích chữ ký hàm (polymorphic parameter)
// =========================================================================
echo "\n--- Test Case 4: Tương thích tham số cũ & mới ---\n";
try {
    // Kiểu cũ: increment_rate_limit($pdo, $action, $identifier)
    increment_rate_limit($pdo, 'test_compat', 'test_user_ident');
    // Kiểu mới: increment_rate_limit($pdo, $action, $decaySeconds, $identifier)
    increment_rate_limit($pdo, 'test_compat', 60, 'test_user_ident');
    clear_rate_limit($pdo, 'test_compat', 'test_user_ident');
    echo "TC4: ĐẠT: Tương thích cả 2 cách gọi tham số không phát sinh lỗi.\n";
} catch (\Throwable $e) {
    $errors[] = "TC4: Lỗi tương thích chữ ký hàm: " . $e->getMessage();
}

// =========================================================================
// TEST CASE 5: Cả File và DB đều lỗi -> BẮT BUỘC FAIL-CLOSED (return false)
// =========================================================================
echo "\n--- Test Case 5: Cả File và DB đều lỗi (Fail-Closed) ---\n";
$actionBothFail = 'test_sec_both_fail';
$fileBothFail = get_rate_limit_file($actionBothFail);
if (file_exists($fileBothFail)) {
    @unlink($fileBothFail);
}
@mkdir($fileBothFail, 0750, true); // Khóa file hoàn toàn

// Mock đối tượng PDO bị lỗi query
class BrokenPdoMock extends PDO {
    public function __construct() {}
    public function prepare($statement, $options = []): PDOStatement {
        throw new PDOException("Simulated DB connection lost / query failed.");
    }
}
$brokenPdo = new BrokenPdoMock();
$bothFailedResult = check_rate_limit($brokenPdo, $actionBothFail, 3, 60);
if ($bothFailedResult === true) {
    $errors[] = "TC5: LỖI BẢO MẬT (FAIL-OPEN): Khi cả file và DB đều hỏng, check_rate_limit trả về true thay vì fail-closed!";
} else {
    echo "TC5: ĐẠT: Khi cả file và DB đều hỏng, check_rate_limit đã fail-closed (false).\n";
}
@rmdir($fileBothFail);

// =========================================================================
// TỔNG HỢP KẾT QUẢ
// =========================================================================
echo "\n=======================================================\n";
if (!empty($errors)) {
    echo "KẾT QUẢ TEST: PHÁT HIỆN " . count($errors) . " LỖI:\n";
    foreach ($errors as $i => $err) {
        echo "  " . ($i + 1) . ". " . $err . "\n";
    }
    exit(1);
} else {
    echo "KẾT QUẢ TEST: 100% PASS - Tất cả tiêu chuẩn bảo mật Rate Limiter đều đạt!\n";
    exit(0);
}
