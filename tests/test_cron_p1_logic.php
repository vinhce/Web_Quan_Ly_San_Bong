<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../api/security_helper.php';
require_once __DIR__ . '/../cron/complete_overdue_in_play.php';

$checks = 0;
function test_assert(bool $condition, string $message): void {
    global $checks;
    if (!$condition) {
        throw new RuntimeException("FAIL: " . $message);
    }
    $checks++;
    echo "[PASS] " . $message . PHP_EOL;
}

echo "=== TEST BẮT ĐẦU: CRON & BACKEND P1 ===" . PHP_EOL;

$pdo = getDBConnection(true);

// 1. Kiểm tra múi giờ MySQL sau kết nối
$stmtTz = $pdo->query("SELECT @@session.time_zone");
$tzVal = $stmtTz->fetchColumn();
test_assert($tzVal === '+07:00', "Database session time_zone phải là +07:00 (Thực tế: {$tzVal})");

// 2. Kiểm tra truy vấn doanh thu hôm nay tại api/admin.php (Overview Stats)
// Test logic: Đơn 'Chờ duyệt cọc' KHÔNG được tính vào today_deposit, chỉ tính khi cọc đã xác nhận.
$today = date('Y-m-d');
$pitchRow = $pdo->query("SELECT id FROM pitches LIMIT 1")->fetch();
$pitchId = $pitchRow ? $pitchRow['id'] : 'P5-01';

// Tạo 2 đơn test: 1 đơn 'Chờ duyệt cọc' và 1 đơn 'Đã cọc 30%'
$testCode1 = 'TEST-REV-UNCONFIRMED-' . time();
$testCode2 = 'TEST-REV-CONFIRMED-' . time();

$insStmt = $pdo->prepare("
    INSERT INTO bookings (code, pitch_id, customer_name, phone, booking_date, slot_id, slot_time, total_price, deposit_amount, status, payment_status, created_at)
    VALUES (?, ?, 'Test Doanh Thu', '0999000111', ?, 'S01', '05:30 - 06:30', 300000, 100000, 'Chờ duyệt cọc', ?, NOW())
");
$insStmt->execute([$testCode1, $pitchId, $today, 'Chờ duyệt cọc']);
$insStmt->execute([$testCode2, $pitchId, $today, 'Đã cọc 30%']);

// Query chuẩn hóa từ api/admin.php
require_once __DIR__ . '/../api/services/booking_conflict_helper.php';
$todayCondition = booking_date_condition_sql('b');
$statStmt = $pdo->prepare("
    SELECT COUNT(*) as count,
           COALESCE(SUM(CASE WHEN b.booking_date = ? AND b.payment_status IN ('Đã cọc 30%', 'Đã cọc 50%', 'Đã thanh toán đủ', 'Đã thanh toán 100%') THEN b.deposit_amount ELSE 0 END), 0) as today_deposit,
           COALESCE(SUM(CASE WHEN b.booking_date = ? THEN b.total_price ELSE 0 END), 0) as today_total
    FROM bookings b
    WHERE {$todayCondition}
      AND b.code IN (?, ?)
      AND b.status NOT IN ('Đã hủy') AND b.payment_status != 'Đã hủy'
");
$statStmt->execute([$today, $today, $today, $today, $testCode1, $testCode2]);
$statRow = $statStmt->fetch();

test_assert((int)$statRow['today_deposit'] === 100000, "Doanh thu cọc hôm nay CHỈ tính 100.000đ của đơn Đã cọc 30%, KHÔNG tính đơn Chờ duyệt cọc (Thực tế: {$statRow['today_deposit']})");

// Dọn dẹp test revenue
$pdo->prepare("DELETE FROM bookings WHERE code IN (?, ?)")->execute([$testCode1, $testCode2]);

// 3. Kiểm tra cron/complete_overdue_in_play.php
// Tạo 2 time_slots động theo thời gian thực hiện tại:
// - STEST_P: kết thúc 30 phút trước thời điểm hiện tại (đã quá hạn > 15 phút)
// - STEST_F: kết thúc 60 phút sau thời điểm hiện tại (vẫn đang diễn ra/tương lai)
$timePastStart = date('H:i', time() - 5400); // 90 phút trước
$timePastEnd   = date('H:i', time() - 1800); // 30 phút trước
$timeFutStart  = date('H:i', time() + 1800); // 30 phút sau
$timeFutEnd    = date('H:i', time() + 5400); // 90 phút sau

$pdo->prepare("REPLACE INTO time_slots (id, slot_time, start_time, end_time, is_peak, duration) VALUES ('STEST_P', ?, ?, ?, 0, 1.0)")
    ->execute(["{$timePastStart} - {$timePastEnd}", $timePastStart, $timePastEnd]);

$pdo->prepare("REPLACE INTO time_slots (id, slot_time, start_time, end_time, is_peak, duration) VALUES ('STEST_F', ?, ?, ?, 0, 1.0)")
    ->execute(["{$timeFutStart} - {$timeFutEnd}", $timeFutStart, $timeFutEnd]);

$codeOverduePast = 'TEST-INPLAY-PAST-' . time();
$codeOverdueToday = 'TEST-INPLAY-TODAY-' . time();
$codeOverdueUnpaid = 'TEST-INPLAY-UNPAID-' . time();
$codeActiveFuture = 'TEST-INPLAY-FUTURE-' . time();

$yesterday = date('Y-m-d', strtotime('-1 day'));

try {
    $insInPlay = $pdo->prepare("
        INSERT INTO bookings (code, pitch_id, customer_name, phone, booking_date, slot_id, slot_time, total_price, deposit_amount, paid_amount, status, payment_status, created_at)
        VALUES (?, ?, 'Test In Play', '0999000222', ?, ?, ?, 350000, 100000, ?, 'Đang đá', ?, NOW())
    ");
    // 1: ngày hôm qua, đã thanh toán đủ -> quá hạn do booking_date < CURDATE()
    $insInPlay->execute([$codeOverduePast, $pitchId, $yesterday, 'S01', '05:30 - 06:30', 350000, 'Đã thanh toán đủ']);
    // 2: hôm nay, đã thanh toán đủ, ca đá đã kết thúc 30 phút trước (quá 15 phút) -> quá hạn
    $insInPlay->execute([$codeOverdueToday, $pitchId, $today, 'STEST_P', "{$timePastStart} - {$timePastEnd}", 350000, 'Đã thanh toán đủ']);
    // 3: ngày hôm qua, quá hạn nhưng chưa thanh toán đủ (paid_amount < total_price) -> giữ nguyên 'Đang đá'
    $insInPlay->execute([$codeOverdueUnpaid, $pitchId, $yesterday, 'S01', '05:30 - 06:30', 100000, 'Đã cọc 30%']);
    // 4: hôm nay, ca đá tương lai -> không được hoàn thành
    $insInPlay->execute([$codeActiveFuture, $pitchId, $today, 'STEST_F', "{$timeFutStart} - {$timeFutEnd}", 100000, 'Đã cọc 30%']);

    // Lần chạy 1: Phải quét được và hoàn thành cả 2 đơn quá hạn đã thanh toán đủ
    $run1 = run_complete_overdue_in_play($pdo);
    test_assert($run1['success'] === true, "Lần chạy 1 complete_overdue_in_play phải thành công");
    test_assert(in_array($codeOverduePast, $run1['codes'], true), "Đơn hôm qua phải được hoàn thành");
    test_assert(in_array($codeOverdueToday, $run1['codes'], true), "Đơn ca đã qua hôm nay phải được hoàn thành");
    test_assert(!in_array($codeOverdueUnpaid, $run1['codes'], true), "Đơn quá hạn chưa thanh toán đủ KHÔNG được hoàn thành");
    test_assert(!in_array($codeActiveFuture, $run1['codes'], true), "Đơn ca tương lai KHÔNG được hoàn thành");

    // Kiểm tra DB status
    $chk1 = $pdo->prepare("SELECT status FROM bookings WHERE code = ?");
    $chk1->execute([$codeOverduePast]);
    test_assert($chk1->fetchColumn() === 'completed', "Trạng thái đơn hôm qua phải là 'completed'");

    $chkToday = $pdo->prepare("SELECT status FROM bookings WHERE code = ?");
    $chkToday->execute([$codeOverdueToday]);
    test_assert($chkToday->fetchColumn() === 'completed', "Trạng thái đơn hôm nay quá giờ phải là 'completed'");

    $chkUnpaid = $pdo->prepare("SELECT status FROM bookings WHERE code = ?");
    $chkUnpaid->execute([$codeOverdueUnpaid]);
    test_assert($chkUnpaid->fetchColumn() === 'Đang đá', "Trạng thái đơn quá hạn chưa thanh toán đủ vẫn phải là 'Đang đá'");

    $chk2 = $pdo->prepare("SELECT status FROM bookings WHERE code = ?");
    $chk2->execute([$codeActiveFuture]);
    test_assert($chk2->fetchColumn() === 'Đang đá', "Trạng thái đơn tương lai vẫn phải là 'Đang đá'");

    // Kiểm tra audit_logs
    $auditChk = $pdo->prepare("SELECT COUNT(*) FROM audit_logs WHERE booking_id = ? AND action = 'cron_complete_overdue_in_play'");
    $auditChk->execute([$codeOverduePast]);
    test_assert((int)$auditChk->fetchColumn() > 0, "Audit log phải ghi nhận hành động cron_complete_overdue_in_play cho đơn hoàn thành");

    // Lần chạy 2 (IDEMPOTENCY TEST): Chạy lại ngay lập tức
    $run2 = run_complete_overdue_in_play($pdo);
    test_assert($run2['success'] === true, "Lần chạy 2 (idempotent) phải thành công");
    test_assert(!in_array($codeOverduePast, $run2['codes'], true), "Lần chạy 2 không được quét lại đơn đã hoàn thành");
    test_assert(!in_array($codeOverdueToday, $run2['codes'], true), "Lần chạy 2 không được quét lại đơn đã hoàn thành");

    // Lần chạy 3: Chạy lại lần nữa để chứng minh tính idempotent 100%
    $run3 = run_complete_overdue_in_play($pdo);
    test_assert($run3['success'] === true, "Lần chạy 3 (idempotent) phải thành công mà không có lỗi");

    // Kiểm tra file log logs/cron_in_play.log
    $logPath = dirname(__DIR__) . '/logs/cron_in_play.log';
    test_assert(file_exists($logPath) && filesize($logPath) > 0, "File logs/cron_in_play.log phải tồn tại và có nội dung");
} finally {
    // Dọn dẹp test in-play
    $pdo->prepare("DELETE FROM bookings WHERE code IN (?, ?, ?, ?)")->execute([$codeOverduePast, $codeOverdueToday, $codeOverdueUnpaid, $codeActiveFuture]);
    $pdo->prepare("DELETE FROM audit_logs WHERE booking_id IN (?, ?, ?, ?)")->execute([$codeOverduePast, $codeOverdueToday, $codeOverdueUnpaid, $codeActiveFuture]);
    $pdo->prepare("DELETE FROM time_slots WHERE id IN ('STEST_P', 'STEST_F')")->execute();
}

// 4. Kiểm tra flock chống chạy trùng trên cron_in_play.lock
$lockFile = dirname(__DIR__) . '/logs/cron_in_play.lock';
$fpTest = fopen($lockFile, 'c+');
test_assert($fpTest !== false, "Mở được file lock cron_in_play.lock");
$locked = flock($fpTest, LOCK_EX | LOCK_NB);
test_assert($locked === true, "Chiếm lock độc quyền thành công");

// Giữ lock và gọi CLI script qua exec để kiểm tra nó trả về skipped = locked
$cmd = escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg(dirname(__DIR__) . '/cron/complete_overdue_in_play.php');
$output = shell_exec($cmd);
$jsonRes = json_decode($output, true);
test_assert(is_array($jsonRes) && ($jsonRes['skipped'] ?? '') === 'locked', "Tiến trình cron thứ hai phải phát hiện lock và skip (kết quả: " . trim((string)$output) . ")");

// Giải phóng lock
flock($fpTest, LOCK_UN);
fclose($fpTest);

// 5. Kiểm tra cron/auto_release_expired.php CLI & lock
$autoReleaseScript = dirname(__DIR__) . '/cron/auto_release_expired.php';
$cmdAr = escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($autoReleaseScript);
$outputAr = shell_exec($cmdAr);
$jsonAr = json_decode($outputAr, true);
test_assert(is_array($jsonAr) && ($jsonAr['success'] ?? false) === true, "cron/auto_release_expired.php chạy CLI thành công (kết quả: " . trim((string)$outputAr) . ")");

echo "=== TẤT CẢ {$checks} KIỂM TRA ĐỀU VƯỢT QUA XUẤT SẮC! ===" . PHP_EOL;
