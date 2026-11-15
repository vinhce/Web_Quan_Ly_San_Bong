<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
define('SANBONG_ADMIN_ROUTER', true);
$action = '';
$method = 'GET';
$data = [];
require_once __DIR__ . '/../api/admin_ops.php';

$pdo = getDBConnection();
if (!$pdo) {
    echo "FAIL: DB connection failed\n";
    exit(1);
}

$testsPassed = 0;
$totalTests = 0;

function assertTest(bool $condition, string $name): void {
    global $testsPassed, $totalTests;
    $totalTests++;
    if ($condition) {
        $testsPassed++;
        echo "PASS: {$name}\n";
    } else {
        echo "FAIL: {$name}\n";
    }
}

echo "=== BẮT ĐẦU TEST V5: DỮ LIỆU MẪU [TEST] (SÂN C, D, E & SÂN 11, CHI PHÍ, CA TRỰC) ===\n";

try {
    // 1. Chạy hàm seed_sample_test_data
    $seedRes = seed_sample_test_data($pdo, 2);
    assertTest($seedRes['totalBookings'] === 16, "1. Khởi tạo đủ 16 ca đặt sân mẫu (9 ca Sân 5 + 7 ca Sân 11)");

    // 2. Kiểm tra Sân 5 - C, D, E: mỗi sân 3 ca
    $p5c = (int)$pdo->query("SELECT COUNT(*) FROM bookings WHERE pitch_id = 'P5-C' AND code LIKE '[TEST]%'")->fetchColumn();
    $p5d = (int)$pdo->query("SELECT COUNT(*) FROM bookings WHERE pitch_id = 'P5-D' AND code LIKE '[TEST]%'")->fetchColumn();
    $p5e = (int)$pdo->query("SELECT COUNT(*) FROM bookings WHERE pitch_id = 'P5-E' AND code LIKE '[TEST]%'")->fetchColumn();
    assertTest($p5c === 3 && $p5d === 3 && $p5e === 3, "2. Sân C, D, E mỗi sân có đúng 3 ca đặt (Tổng 9 ca)");

    // 3. Kiểm tra trải dài trên nhiều ngày (hôm qua, hôm nay, ngày mai)
    $datesCount = (int)$pdo->query("SELECT COUNT(DISTINCT booking_date) FROM bookings WHERE code LIKE '[TEST]%'")->fetchColumn();
    assertTest($datesCount >= 3, "3. Dữ liệu trải trên ít nhất 3 ngày ({$datesCount} ngày)");

    // 4. Kiểm tra Sân 11: 7 ca trên ít nhất 3 sân khác nhau
    $p11Pitches = (int)$pdo->query("SELECT COUNT(DISTINCT pitch_id) FROM bookings WHERE pitch_id LIKE 'P11%' AND code LIKE '[TEST]%'")->fetchColumn();
    $p11Count = (int)$pdo->query("SELECT COUNT(*) FROM bookings WHERE pitch_id LIKE 'P11%' AND code LIKE '[TEST]%'")->fetchColumn();
    assertTest($p11Pitches >= 3 && $p11Count === 7, "4. Sân 11 có đúng 7 ca trên {$p11Pitches} sân khác nhau");

    // 5. Kiểm tra đủ các trạng thái đặt sân và thanh toán
    $statuses = $pdo->query("SELECT DISTINCT status FROM bookings WHERE pitch_id LIKE 'P11%' AND code LIKE '[TEST]%'")->fetchAll(PDO::FETCH_COLUMN);
    $hasConfirmed = in_array('Đã xác nhận', $statuses, true);
    $hasPlaying   = in_array('Đang đá', $statuses, true);
    $hasDone      = in_array('Hoàn thành', $statuses, true);
    $hasCancelled = in_array('Đã hủy', $statuses, true);
    $hasPending   = in_array('Chờ duyệt cọc', $statuses, true);
    assertTest($hasConfirmed && $hasPlaying && $hasDone && $hasCancelled && $hasPending, "5. Sân 11 đủ các trạng thái: Đã xác nhận, Đang đá, Hoàn thành, Đã hủy, Chờ duyệt cọc");

    // 6. Kiểm tra có voucher và có bán nước / dịch vụ kèm
    $voucherCount = (int)$pdo->query("SELECT COUNT(*) FROM bookings WHERE voucher_code IS NOT NULL AND code LIKE '[TEST]%'")->fetchColumn();
    $salesCount = (int)$pdo->query("SELECT COUNT(*) FROM service_sales WHERE booking_code LIKE '[TEST]%'")->fetchColumn();
    assertTest($voucherCount > 0 && $salesCount > 0, "6. Có ca áp dụng voucher ({$voucherCount}) và có bán nước kèm ({$salesCount} lượt)");

    // 7. Kiểm tra phân bổ chuyển thiếu, chuyển thừa, chưa thấy tiền
    $underCount = (int)$pdo->query("SELECT COUNT(*) FROM bank_transactions WHERE match_status = 'underpaid' AND detected_booking_code LIKE '[TEST]%'")->fetchColumn();
    $overCount  = (int)$pdo->query("SELECT COUNT(*) FROM bank_transactions WHERE match_status = 'overpaid' AND detected_booking_code LIKE '[TEST]%'")->fetchColumn();
    $unpaidBooking = $pdo->query("SELECT COUNT(*) FROM bookings WHERE code = '[TEST]P11_UNPAID_06'")->fetchColumn();
    assertTest($underCount >= 1 && $overCount >= 1 && (int)$unpaidBooking === 1, "7. Đủ cả đơn chuyển thiếu (1), chuyển thừa (1), và chưa thấy tiền (1)");

    // 8. Kiểm tra sổ chi: 4 khoản chi mẫu
    $expCount = (int)$pdo->query("SELECT COUNT(*) FROM expenses WHERE expense_code LIKE '[TEST]%'")->fetchColumn();
    $expTotal = (int)$pdo->query("SELECT SUM(amount) FROM expenses WHERE expense_code LIKE '[TEST]%'")->fetchColumn();
    assertTest($expCount === 4 && $expTotal === 7550000, "8. Sổ chi có 4 khoản chi mẫu hợp lệ (Tổng: 7.550.000đ)");

    // 9. Kiểm tra ca trực mẫu
    $shiftCount = (int)$pdo->query("SELECT COUNT(*) FROM shifts WHERE note LIKE '%[TEST]%'")->fetchColumn();
    assertTest($shiftCount >= 1, "9. Có ca trực mẫu trong DB ({$shiftCount} ca)");

    // 10. Kiểm tra lệnh xóa chỉ xóa [TEST], không đụng dữ liệu thật
    $totalBeforeClean = (int)$pdo->query("SELECT COUNT(*) FROM bookings WHERE code NOT LIKE '[TEST]%'")->fetchColumn();
    // Chạy dọn dẹp thử
    $cleanCount = clear_sample_test_data($pdo);
    $totalAfterClean = (int)$pdo->query("SELECT COUNT(*) FROM bookings WHERE code NOT LIKE '[TEST]%'")->fetchColumn();
    $testLeft = (int)$pdo->query("SELECT COUNT(*) FROM bookings WHERE code LIKE '[TEST]%'")->fetchColumn();

    assertTest($totalBeforeClean === $totalAfterClean && $testLeft === 0, "10. Dọn dẹp mẫu sạch 100% không đụng dữ liệu thật (Bảo lưu {$totalAfterClean} đơn thật)");

    // 11. Khởi tạo lại để phục vụ báo cáo doanh thu V6
    seed_sample_test_data($pdo, 2);
    $recheck = (int)$pdo->query("SELECT COUNT(*) FROM bookings WHERE code LIKE '[TEST]%'")->fetchColumn();
    assertTest($recheck === 16, "11. Giữ lại dữ liệu mẫu sẵn sàng cho V6 báo cáo doanh thu");

} catch (Throwable $e) {
    echo "EXCEPTION: " . $e->getMessage() . " on line " . $e->getLine() . "\n";
    echo $e->getTraceAsString() . "\n";
}

echo "\n=== KẾT QUẢ TEST V5: {$testsPassed}/{$totalTests} ĐẠT ===\n";
if ($testsPassed === $totalTests && $totalTests > 0) {
    exit(0);
} else {
    exit(1);
}
