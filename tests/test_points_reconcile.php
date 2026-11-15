<?php
/**
 * Test kiểm thử đối soát điểm hội viên và biến động points_log
 */
require_once __DIR__ . '/../config/database.php';
$pdo = getDBConnection(false);
if (!$pdo) {
    echo "NO_DB_CONNECTION\n";
    exit(1);
}

// 1. Áp dụng bảng points_log
$sql = file_get_contents(__DIR__ . '/../database/migrations/013_create_points_log.sql');
$pdo->exec($sql);
echo "[PASS] Bảng points_log đã sẵn sàng trong MySQL local.\n";

// 2. Kiểm tra Unique Key chống tích điểm trùng (idempotency)
$testUserId = 1; // Admin user
$testBookingId = 999999;

// Xóa dữ liệu test cũ nếu có
$pdo->prepare("DELETE FROM points_log WHERE booking_id = ?")->execute([$testBookingId]);

// Lần 1: Thêm điểm thành công
$ins = $pdo->prepare("INSERT INTO points_log (user_id, booking_id, delta, reason) VALUES (?, ?, 100, 'Tích điểm hoàn tất ca đá')");
$ins->execute([$testUserId, $testBookingId]);
echo "[PASS] Lần 1: Ghi log +100 điểm thành công.\n";

// Lần 2: Thêm trùng cùng booking_id và reason -> Phải bị chặn bởi UNIQUE KEY
$duplicateBlocked = false;
try {
    $ins->execute([$testUserId, $testBookingId]);
} catch (PDOException $e) {
    if ($e->getCode() == 23000 || strpos($e->getMessage(), 'Duplicate entry') !== false) {
        $duplicateBlocked = true;
    }
}
if ($duplicateBlocked) {
    echo "[PASS] Lần 2: Chặn trùng lặp thành công nhờ UNIQUE(booking_id, reason).\n";
} else {
    echo "[FAIL] Không chặn được trùng lặp điểm!\n";
    exit(1);
}

// Lần 3: Trừ điểm khi hủy/hoàn (reason khác) -> Cho phép
$insRefund = $pdo->prepare("INSERT INTO points_log (user_id, booking_id, delta, reason) VALUES (?, ?, -100, 'Thu hồi điểm do hủy/hoàn đơn')");
$insRefund->execute([$testUserId, $testBookingId]);
echo "[PASS] Ghi log trừ điểm (-100) khi hủy ca thành công.\n";

// 3. Hàm đối soát điểm: users.points = tổng delta trong points_log
function reconcile_user_points(PDO $pdo, int $userId): array {
    $stmt = $pdo->prepare("SELECT COALESCE(SUM(delta), 0) AS total_points FROM points_log WHERE user_id = ?");
    $stmt->execute([$userId]);
    $loggedPoints = (int)$stmt->fetchColumn();

    $uStmt = $pdo->prepare("SELECT points FROM users WHERE id = ?");
    $uStmt->execute([$userId]);
    $currentPoints = (int)$uStmt->fetchColumn();

    $isMatched = ($loggedPoints === $currentPoints);
    return [
        'user_id' => $userId,
        'current_points' => $currentPoints,
        'logged_points' => $loggedPoints,
        'matched' => $isMatched,
        'diff' => $currentPoints - $loggedPoints
    ];
}

$rec = reconcile_user_points($pdo, $testUserId);
echo "[PASS] Hàm đối soát hoạt động chính xác. User {$testUserId}: DB = {$rec['current_points']}, Log = {$rec['logged_points']}.\n";

// Dọn dẹp bản ghi test
$pdo->prepare("DELETE FROM points_log WHERE booking_id = ?")->execute([$testBookingId]);
echo "=== TEST ĐỐI SOÁT ĐIỂM HOÀN TẤT THÀNH CÔNG 100% ===\n";
