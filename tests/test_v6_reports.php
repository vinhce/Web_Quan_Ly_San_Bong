<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
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

function callFinanceAction(array $cfg): string {
    $phpBin = 'C:\\laragon\\bin\\php\\php-8.1.10-Win32-vs16-x64\\php.exe';
    $b64 = base64_encode(json_encode($cfg, JSON_UNESCAPED_UNICODE));
    $script = escapeshellarg(__DIR__ . '/run_admin_action.php');
    return (string)shell_exec("\"{$phpBin}\" {$script} {$b64}");
}

echo "=== BẮT ĐẦU TEST V6: BÁO CÁO DOANH THU & ĐỐI CHIẾU SỐ LIỆU ===\n";

$seedBookingCode = null;
$exitCode = 0;
try {
    $mgrId = (int)($pdo->query("SELECT id FROM users WHERE role = 'manager' AND COALESCE(status, 'active') = 'active' ORDER BY id ASC LIMIT 1")->fetchColumn() ?: 5);
    $adminSession = ['user_id' => 1, 'role' => 'admin', 'username' => 'admin', 'full_name' => 'Chủ Sân Pro'];
    $managerSession = ['user_id' => $mgrId, 'role' => 'manager', 'username' => 'quanly', 'full_name' => 'Quản Lý Sân'];
    $staffSession = ['user_id' => 4, 'role' => 'staff', 'username' => 'nhanvien', 'full_name' => 'Nhân Viên Ca'];

    if ((int)$pdo->query("SELECT COUNT(*) FROM bookings WHERE status != 'Đã hủy'")->fetchColumn() === 0) {
        $seedBookingCode = '[TEST]V6_SEED_' . time();
        $firstPitchId = (string)($pdo->query("SELECT id FROM pitches WHERE status = 'Hoạt động' ORDER BY id ASC LIMIT 1")->fetchColumn() ?: 'P5-A');
        $pdo->prepare("
            INSERT INTO bookings (code, pitch_id, customer_name, phone, booking_date, slot_id, slot_time, total_price, deposit_amount, paid_amount, remaining_amount, status, payment_status, payment_method, created_at)
            VALUES (?, ?, '[TEST] Khách Seed Báo Cáo', '0900000123', ?, 'S01', '05:30 - 07:30', 250000, 250000, 250000, 0, 'Hoàn thành', 'Đã thanh toán đủ', 'Tiền mặt tại quầy', NOW())
        ")->execute([$seedBookingCode, $firstPitchId, date('Y-m-d')]);
    }

    // 1. Test lọc các khoảng thời gian và đối chiếu 2 công thức
    $today = date('Y-m-d');
    $d7 = date('Y-m-d', strtotime('-6 days'));
    $firstDayMonth = date('Y-m-01');

    $testPeriods = [
        ['name' => 'Hôm nay', 'from' => $today, 'to' => $today],
        ['name' => '7 ngày qua', 'from' => $d7, 'to' => $today],
        ['name' => 'Tháng này', 'from' => $firstDayMonth, 'to' => $today],
        ['name' => 'Tất cả thời gian', 'from' => '', 'to' => '']
    ];

    foreach ($testPeriods as $idx => $tp) {
        $out = callFinanceAction([
            'session' => $adminSession,
            'action'  => 'reports',
            'method'  => 'GET',
            'get'     => ['action' => 'reports', 'from' => $tp['from'], 'to' => $tp['to']]
        ]);

        $res = json_decode($out, true);
        assertTest(!empty($res['success']), "1." . ($idx + 1) . "a Lọc {$tp['name']}: API trả về success = true");
        
        $d = $res['data'] ?? [];
        $f1 = $d['formula1'] ?? [];
        $f2 = $d['formula2'] ?? [];

        assertTest($f1['isMatched'] === true && $f1['diff'] === 0, "1." . ($idx + 1) . "b Lọc {$tp['name']}: Công thức 1 khớp 100% (Tiền mặt + Chuyển khoản + Còn nợ = Tổng, lệch 0đ)");
        assertTest($f2['isMatched'] === true && $f2['diff'] === 0, "1." . ($idx + 1) . "c Lọc {$tp['name']}: Công thức 2 khớp 100% (Tiền cọc + Thu còn lại + Bán nước/dịch vụ = Tổng, lệch 0đ)");
    }

    // 2. Kiểm tra các chỉ số bổ sung (Lợi nhuận gộp, Lợi nhuận ròng, Tỷ lệ lấp đầy, Giá trị TB)
    $out = callFinanceAction([
        'session' => $adminSession,
        'action'  => 'reports',
        'method'  => 'GET',
        'get'     => ['action' => 'reports', 'from' => '', 'to' => '']
    ]);
    $res = json_decode($out, true);
    $d = $res['data'] ?? [];

    $totRev = $d['totalRevenue'] ?? 0;
    $totExp = $d['totalExpenses'] ?? 0;
    $colRev = $d['collectedRevenue'] ?? 0;
    $grossProfit = $d['grossProfit'] ?? 0;
    $netProfit = $d['netProfit'] ?? 0;
    $occupancyRate = $d['occupancyRate'] ?? 0;
    $avgRevenue = $d['avgRevenue'] ?? 0;

    assertTest($grossProfit === ($colRev - $totExp), "2.1 Lợi nhuận gộp = Thực thu ({$colRev}) - Tổng chi ({$totExp}) = {$grossProfit}đ");
    assertTest($netProfit === ($totRev - $totExp), "2.2 Lợi nhuận ròng = Doanh thu thực ({$totRev}) - Tổng chi ({$totExp}) = {$netProfit}đ");
    assertTest($occupancyRate >= 0 && $occupancyRate <= 100, "2.3 Tỷ lệ lấp đầy sân hợp lệ ({$occupancyRate}%)");
    assertTest($avgRevenue > 0, "2.4 Giá trị trung bình mỗi ca đặt hợp lệ (" . number_format($avgRevenue) . "đ)");
    assertTest(count($d['detailedBookings'] ?? []) > 0, "2.5 Bảng kê chi tiết trả về đủ ca đặt sân (" . count($d['detailedBookings']) . " ca)");
    assertTest(count($d['dailyRevenue'] ?? []) > 0, "2.6 Biểu đồ ngày trả về đủ số liệu theo ngày (" . count($d['dailyRevenue']) . " ngày)");

    // 3. Sổ chi phí: Thêm, sửa, xóa, và phân quyền (Staff bị chặn 403)
    // 3.1 Thêm khoản chi mới
    $addOut = callFinanceAction([
        'session' => $adminSession,
        'action'  => 'add_expense',
        'method'  => 'POST',
        'data'    => [
            'expense_date' => date('Y-m-d'),
            'category'     => 'bao_tri',
            'amount'       => 500000,
            'payer_name'   => 'Admin Test',
            'receipt_note' => '[TEST] Bảo trì thay bóng đèn sân C'
        ]
    ]);
    $addRes = json_decode($addOut, true);
    assertTest(!empty($addRes['success']), "3.1 Thêm khoản chi mới thành công (Mã: " . ($addRes['expense_code'] ?? '') . ")");

    $expId = (int)$pdo->query("SELECT id FROM expenses WHERE receipt_note = '[TEST] Bảo trì thay bóng đèn sân C' ORDER BY id DESC LIMIT 1")->fetchColumn();
    assertTest($expId > 0, "3.2 Khoản chi đã được lưu vào CSDL với ID #{$expId}");

    // 3.2 Sửa khoản chi (Admin/Manager thành công)
    $updOut = callFinanceAction([
        'session' => $managerSession,
        'action'  => 'update_expense',
        'method'  => 'POST',
        'data'    => [
            'id'           => $expId,
            'expense_date' => date('Y-m-d'),
            'category'     => 'bao_tri',
            'amount'       => 650000,
            'payer_name'   => 'Admin Test Sửa',
            'receipt_note' => '[TEST] Bảo trì thay bóng đèn sân C (Đã cập nhật)'
        ]
    ]);
    $updRes = json_decode($updOut, true);
    assertTest(!empty($updRes['success']), "3.3 Sửa khoản chi thành công (Số tiền mới: 650.000đ)");

    $newAmt = (int)$pdo->query("SELECT amount FROM expenses WHERE id = {$expId}")->fetchColumn();
    assertTest($newAmt === 650000, "3.4 Số tiền đã cập nhật chính xác trong CSDL (650.000đ)");

    // 3.3 Phân quyền: Staff thử sửa khoản chi -> Bị chặn 403
    $staffUpdOut = callFinanceAction([
        'session' => $staffSession,
        'action'  => 'update_expense',
        'method'  => 'POST',
        'data'    => [
            'id'           => $expId,
            'amount'       => 999999
        ]
    ]);
    $staffUpdRes = json_decode($staffUpdOut, true);
    assertTest(empty($staffUpdRes['success']), "3.5 Staff thử sửa chi phí: Bị server từ chối 403 Forbidden");

    // 3.4 Phân quyền: Staff thử xóa khoản chi -> Bị chặn 403
    $staffDelOut = callFinanceAction([
        'session' => $staffSession,
        'action'  => 'delete_expense',
        'method'  => 'POST',
        'data'    => ['id' => $expId]
    ]);
    $staffDelRes = json_decode($staffDelOut, true);
    assertTest(empty($staffDelRes['success']), "3.6 Staff thử xóa chi phí: Bị server từ chối 403 Forbidden");

    // 3.5 Manager/Admin xóa khoản chi -> Thành công
    $delOut = callFinanceAction([
        'session' => $managerSession,
        'action'  => 'delete_expense',
        'method'  => 'POST',
        'data'    => ['id' => $expId]
    ]);
    $delRes = json_decode($delOut, true);
    assertTest(!empty($delRes['success']), "3.7 Manager xóa khoản chi test thành công");

    $remCheck = (int)$pdo->query("SELECT COUNT(*) FROM expenses WHERE id = {$expId}")->fetchColumn();
    assertTest($remCheck === 0, "3.8 Khoản chi đã xóa hoàn toàn khỏi CSDL");

    // 4. Test Xuất dữ liệu CSV (UTF-8 BOM, Tiêu đề, Các phần và cột chi tiết)
    $csvOut = callFinanceAction([
        'session' => $adminSession,
        'action'  => 'export_reports_csv',
        'method'  => 'GET',
        'get'     => ['action' => 'export_reports_csv', 'from' => '', 'to' => '']
    ]);

    $hasBOM = (substr($csvOut, 0, 3) === "\xEF\xBB\xBF");
    assertTest($hasBOM, "4.1 Tệp CSV bắt đầu bằng UTF-8 BOM chuẩn (\\xEF\\xBB\\xBF)");
    assertTest(strpos($csvOut, 'BÁO CÁO TÀI CHÍNH & VẬN HÀNH SÂN BÓNG PRO') !== false, "4.2 Có tiêu đề chính BÁO CÁO TÀI CHÍNH & VẬN HÀNH");
    assertTest(strpos($csvOut, 'I. TỔNG HỢP DOANH THU & DÒNG TIỀN') !== false, "4.3 Có Mục I. Tổng hợp doanh thu & dòng tiền");
    assertTest(strpos($csvOut, 'II. HIỆU SUẤT CHI TIẾT THEO TỪNG SÂN') !== false, "4.4 Có Mục II. Hiệu suất chi tiết theo từng sân");
    assertTest(strpos($csvOut, 'III. BẢNG KÊ CHI TIẾT ĐƠN ĐẶT SÂN TRONG KỲ') !== false, "4.5 Có Mục III. Bảng kê chi tiết đơn đặt sân trong kỳ");
    assertTest(strpos($csvOut, 'Dịch vụ') !== false, "4.6 Cột bảng kê có trường Dịch vụ");
    assertTest((strpos($csvOut, 'Tổng chi phí vận hành trong kỳ') !== false && strpos($csvOut, 'Lợi nhuận (Đã thu - Chi phí)') !== false), "4.7 Có chỉ tiêu Chi phí vận hành & Lợi nhuận ròng");

    echo "\n=== KẾT QUẢ TEST V6: {$testsPassed}/{$totalTests} ĐẠT ===\n";
    $exitCode = ($testsPassed === $totalTests) ? 0 : 1;

} catch (Throwable $e) {
    echo "LỖI NGOẠI LỆ: " . $e->getMessage() . " tại " . $e->getFile() . ":" . $e->getLine() . "\n";
    $exitCode = 1;
} finally {
    try {
        if (!empty($seedBookingCode)) {
            $pdo->prepare("DELETE FROM bookings WHERE code = ?")->execute([$seedBookingCode]);
        }
        $pdo->prepare("DELETE FROM bookings WHERE code LIKE '[TEST]V6_SEED_%'")->execute();
        $pdo->prepare("DELETE FROM expenses WHERE receipt_note LIKE '[TEST] Bảo trì thay bóng đèn sân C%'")->execute();
        $pdo->prepare("DELETE FROM audit_logs WHERE new_value LIKE '%[TEST] Bảo trì thay bóng đèn sân C%'")->execute();
    } catch (Throwable $cleanupEx) {
        echo "CẢNH BÁO DỌN DẸP TEST V6: " . $cleanupEx->getMessage() . "\n";
    }
}
exit($exitCode);
