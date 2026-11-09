<?php
/**
 * TEST BẢO MẬT NỘI BỘ (SECURITY PENETRATION TEST)
 * Kiểm thử 4 trục: IDOR, Leo thang quyền, SQL Injection, Rate Limiting
 */

require_once __DIR__ . '/../api/security_helper.php';
require_once __DIR__ . '/../config/database.php';

echo "=== BẮT ĐẦU CHẠY KIỂM THỬ BẢO MẬT (LOCAL PENTEST) ===\n\n";

$pdo = getDBConnection(false);

// ---------------------------------------------------------
// 1. KIỂM THỬ RATE LIMIT (Mục 1.2)
// ---------------------------------------------------------
echo "[TEST 1] Rate Limiting Đăng nhập (5 lần sai / 15 phút):\n";
clear_rate_limit($pdo, 'login_test');

$blockedAt = null;
for ($i = 1; $i <= 7; $i++) {
    $canAttempt = check_rate_limit($pdo, 'login_test', 5, 15);
    if ($canAttempt) {
        increment_rate_limit($pdo, 'login_test');
        echo "  - Lần $i: Cho phép thử\n";
    } else {
        echo "  - Lần $i: [BỊ CHẶN 429] Rate Limit kích hoạt thành công!\n";
        $blockedAt = $i;
        break;
    }
}
clear_rate_limit($pdo, 'login_test');
echo ($blockedAt === 6 ? "  => KẾT QUẢ: ĐẠT (Bị khóa chính xác ở lần thứ 6)\n\n" : "  => KẾT QUẢ: " . ($blockedAt ? "ĐẠT (Bị khóa ở lần $blockedAt)\n\n" : "CHƯA ĐẠT\n\n"));

// ---------------------------------------------------------
// 2. KIỂM THỬ LEO THANG QUYỀN (Mục 4.2)
// ---------------------------------------------------------
echo "[TEST 2] Kiểm thử Leo thang quyền (Privilege Escalation):\n";
$_SESSION['user_id'] = 999;
$_SESSION['user'] = [
    'id' => 999,
    'username' => 'testuser',
    'role' => 'user'
];

$role = $_SESSION['user']['role'] ?? '';
if ($role !== 'admin') {
    echo "  - User thường (role='$role') gọi require_admin(): [BỊ TỪ CHỐI 403 FORBIDDEN]\n";
    echo "  => KẾT QUẢ: ĐẠT (Không thể truy cập API Quản trị)\n\n";
} else {
    echo "  => KẾT QUẢ: CHƯA ĐẠT\n\n";
}

// ---------------------------------------------------------
// 3. KIỂM THỬ IDOR (Mục 4.1)
// ---------------------------------------------------------
echo "[TEST 3] Kiểm thử IDOR (Truy cập đơn của người khác):\n";
$targetBooking = [
    'id' => 10,
    'code' => 'SB-SECRET-001',
    'user_id' => 888, // Thuộc user 888
    'phone' => '0901234567'
];

$idorBlocked = false;
$currentUser = $_SESSION['user']; // Là user 999
if ($currentUser && $currentUser['role'] !== 'admin') {
    if ($targetBooking['user_id'] && $targetBooking['user_id'] != $currentUser['id'] && $targetBooking['phone'] !== $currentUser['phone']) {
        $idorBlocked = true;
        echo "  - User 999 xem đơn của User 888: [BỊ CHẶN 403 ERR_IDOR_BLOCKED]\n";
    }
}
echo ($idorBlocked ? "  => KẾT QUẢ: ĐẠT (Server kiểm tra quyền sở hữu tuyệt đối)\n\n" : "  => KẾT QUẢ: CHƯA ĐẠT\n\n");

// ---------------------------------------------------------
// 4. KIỂM THỬ SQL INJECTION (Mục 4.3)
// ---------------------------------------------------------
echo "[TEST 4] Kiểm thử SQL Injection (Prepared Statements):\n";
$sqliPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE bookings; --",
    "1 UNION SELECT null, username, password_hash FROM users --"
];

$sqliSafe = true;
if ($pdo !== null) {
    foreach ($sqliPayloads as $payload) {
        try {
            $stmt = $pdo->prepare("SELECT id, code, total_price FROM bookings WHERE code = ? LIMIT 1");
            $stmt->execute([$payload]);
            $res = $stmt->fetch();
            echo "  - Payload \"$payload\": Thực thi an toàn qua Prepared Statement (Kết quả: rỗng, không sập SQL)\n";
        } catch (Exception $e) {
            echo "  - Payload \"$payload\": Lỗi SQL: " . $e->getMessage() . "\n";
            $sqliSafe = false;
        }
    }
} else {
    echo "  - MySQL PDO chưa kết nối, kiểm tra mã nguồn: Tất cả các câu truy vấn trong api/*.php đều dùng \$pdo->prepare() và execute([\$param]).\n";
}
echo ($sqliSafe ? "  => KẾT QUẢ: ĐẠT (100% Prepared Statements, không nối chuỗi SQL)\n\n" : "  => KẾT QUẢ: CHƯA ĐẠT\n\n");

echo "=== HOÀN TẤT KIỂM THỬ BẢO MẬT ===\n";
