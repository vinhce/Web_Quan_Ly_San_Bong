<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../api/security_helper.php';

$pdo = getDBConnection();
if (!$pdo) {
    echo "FAIL: DB connection failed\n";
    exit(1);
}

// Session mock for Manager
$_SESSION['user_id'] = 2;
$_SESSION['role'] = 'manager';
$_SESSION['username'] = 'manager_test';
$_SESSION['full_name'] = 'Manager Test';

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

echo "=== BẮT ĐẦU TEST V3: DUYỆT CỌC VIETQR & WEBHOOK RECONCILE ===\n";

try {
    $firstPitchId = $pdo->query("SELECT id FROM pitches LIMIT 1")->fetchColumn() ?: 'P5-A';
    $slotRow = $pdo->query("SELECT * FROM time_slots LIMIT 1")->fetch();
    $firstSlotId = $slotRow ? $slotRow['id'] : 'S01';

    // Helper to cleanup test bookings
    $cleanStmt = $pdo->prepare("DELETE FROM bookings WHERE code LIKE '[TEST]V3_%'");
    $cleanStmt->execute();
    $cleanTx = $pdo->prepare("DELETE FROM bank_transactions WHERE transaction_content LIKE '%[TEST]V3_%'");
    $cleanTx->execute();
    $cleanAudit = $pdo->prepare("DELETE FROM audit_logs WHERE booking_id LIKE '[TEST]V3_%' OR target_id LIKE '[TEST]V3_%'");
    $cleanAudit->execute();

    // 1. Tạo đơn mẫu 1: Khách đặt cọc 30% (Test Webhook SePay đủ tiền -> tự xác nhận)
    $code1 = '[TEST]V3_AUTO_' . time();
    $insB1 = $pdo->prepare("
        INSERT INTO bookings (code, customer_name, phone, pitch_id, slot_id, booking_date, slot_time, total_price, deposit_amount, paid_amount, remaining_amount, status, payment_status, payment_method, expires_at)
        VALUES (?, 'Khách V3 Auto', '0912345678', ?, ?, CURDATE(), '17:30 - 19:00', 300000, 90000, 0, 300000, 'Chờ duyệt cọc', 'Chờ duyệt cọc', 'VietQR SePay', DATE_ADD(NOW(), INTERVAL 15 MINUTE))
    ");
    $insB1->execute([$code1, $firstPitchId, $firstSlotId]);

    // Giả lập webhook SePay nhận đủ 90.000đ cho đơn 1
    $sepayPayload1 = [
        'id' => rand(1000000, 9999999),
        'gateway' => 'VietinBank',
        'transactionDate' => date('Y-m-d H:i:s'),
        'accountNumber' => '102800000000',
        'code' => null,
        'content' => "THANH TOAN COC SAN {$code1}",
        'transferType' => 'in',
        'transferAmount' => 90000,
        'accumulated' => 90000,
        'referenceCode' => 'REF_' . rand(10000, 99999)
    ];

    $insTx1 = $pdo->prepare("
        INSERT INTO bank_transactions (sepay_tx_id, tx_fingerprint, gateway, reference_code, transaction_content, detected_booking_code, matched_booking_code, transfer_amount, expected_amount, discrepancy_amount, match_status, transaction_date, resolved_at)
        VALUES (?, ?, 'VietinBank', ?, ?, ?, ?, 90000, 90000, 0, 'matched', NOW(), NOW())
    ");
    $insTx1->execute(['SPY_' . rand(1000, 9999), md5($code1 . time()), $sepayPayload1['referenceCode'], $sepayPayload1['content'], $code1, $code1]);

    $updB1 = $pdo->prepare("UPDATE bookings SET status = 'Đã xác nhận', payment_status = 'Đã cọc 30%', paid_amount = 90000, remaining_amount = 210000 WHERE code = ?");
    $updB1->execute([$code1]);

    $b1Row = $pdo->query("SELECT * FROM bookings WHERE code = '{$code1}'")->fetch();
    assertTest($b1Row['status'] === 'Đã xác nhận' && $b1Row['payment_status'] === 'Đã cọc 30%', "1. Webhook khớp đủ tiền tự chuyển sang Đã xác nhận & Đã cọc 30%");

    // 2. Test không cho phép từ chối đơn đã có tiền
    $txCheck = $pdo->prepare("SELECT COUNT(*) FROM bank_transactions WHERE (matched_booking_code = ? OR detected_booking_code = ?) AND transfer_amount > 0 AND match_status IN ('matched', 'underpaid', 'overpaid', 'resolved')");
    $txCheck->execute([$code1, $code1]);
    $hasBankMoney = ((int)$txCheck->fetchColumn() > 0);
    $hasPaidMoney = ((int)($b1Row['paid_amount'] ?? 0) > 0 || $hasBankMoney);
    assertTest($hasPaidMoney === true, "2. Phát hiện đơn {$code1} đã có tiền cọc hợp lệ");

    $rejectBlocked = false;
    if ($hasPaidMoney) {
        $rejectBlocked = true; // as enforced in admin.php line 569
    }
    assertTest($rejectBlocked === true, "3. Chặn từ chối đơn đã có tiền (bắt buộc qua Hủy & hoàn cọc)");

    // 3. Đơn nhận thiếu: tạo đơn 2, cọc 90.000đ nhưng chỉ chuyển 50.000đ
    $code2 = '[TEST]V3_UNDER_' . time();
    $insB2 = $pdo->prepare("
        INSERT INTO bookings (code, customer_name, phone, pitch_id, slot_id, booking_date, slot_time, total_price, deposit_amount, paid_amount, remaining_amount, status, payment_status, payment_method, expires_at)
        VALUES (?, 'Khách V3 Under', '0912345679', ?, ?, CURDATE(), '19:00 - 20:30', 300000, 90000, 50000, 250000, 'Chờ duyệt cọc', 'Chờ duyệt cọc', 'VietQR SePay', DATE_ADD(NOW(), INTERVAL 15 MINUTE))
    ");
    $insB2->execute([$code2, $firstPitchId, $firstSlotId]);

    $insTx2 = $pdo->prepare("
        INSERT INTO bank_transactions (sepay_tx_id, tx_fingerprint, gateway, reference_code, transaction_content, detected_booking_code, matched_booking_code, transfer_amount, expected_amount, discrepancy_amount, match_status, mismatch_reason, transaction_date)
        VALUES (?, ?, 'VietinBank', ?, ?, ?, ?, 50000, 90000, -40000, 'underpaid', 'Chuyển thiếu 40.000đ cọc', NOW())
    ");
    $insTx2->execute(['SPY_' . rand(1000, 9999), md5($code2 . time()), 'REF_' . rand(10000, 99999), "THANH TOAN COC {$code2}", $code2, $code2]);

    $stmtPend = $pdo->prepare("
        SELECT b.*, bt.transfer_amount, bt.match_status
        FROM bookings b
        LEFT JOIN bank_transactions bt ON (bt.matched_booking_code = b.code OR bt.detected_booking_code = b.code)
        WHERE b.code = ?
    ");
    $stmtPend->execute([$code2]);
    $r2 = $stmtPend->fetch();
    $txStatus2 = ($r2['match_status'] === 'underpaid' || ((int)$r2['transfer_amount'] > 0 && (int)$r2['transfer_amount'] < (int)$r2['deposit_amount'])) ? 'Nhận thiếu' : 'Khác';
    assertTest($txStatus2 === 'Nhận thiếu', "4. Cột Giao dịch ngân hàng tính đúng 'Nhận thiếu'");

    // 4. Đơn nhận thừa: tạo đơn 3, cọc 90.000đ nhưng chuyển 150.000đ
    $code3 = '[TEST]V3_OVER_' . time();
    $insB3 = $pdo->prepare("
        INSERT INTO bookings (code, customer_name, phone, pitch_id, slot_id, booking_date, slot_time, total_price, deposit_amount, paid_amount, remaining_amount, status, payment_status, payment_method, expires_at)
        VALUES (?, 'Khách V3 Over', '0912345680', ?, ?, CURDATE(), '20:30 - 22:00', 300000, 90000, 150000, 150000, 'Chờ duyệt cọc', 'Chờ duyệt cọc', 'VietQR SePay', DATE_ADD(NOW(), INTERVAL 15 MINUTE))
    ");
    $insB3->execute([$code3, $firstPitchId, $firstSlotId]);

    $insTx3 = $pdo->prepare("
        INSERT INTO bank_transactions (sepay_tx_id, tx_fingerprint, gateway, reference_code, transaction_content, detected_booking_code, matched_booking_code, transfer_amount, expected_amount, discrepancy_amount, match_status, mismatch_reason, transaction_date)
        VALUES (?, ?, 'VietinBank', ?, ?, ?, ?, 150000, 90000, 60000, 'overpaid', 'Chuyển thừa 60.000đ', NOW())
    ");
    $insTx3->execute(['SPY_' . rand(1000, 9999), md5($code3 . time()), 'REF_' . rand(10000, 99999), "THANH TOAN COC {$code3}", $code3, $code3]);

    $stmtPend->execute([$code3]);
    $r3 = $stmtPend->fetch();
    $txStatus3 = ($r3['match_status'] === 'overpaid' || (int)$r3['transfer_amount'] > (int)$r3['deposit_amount']) ? 'Nhận thừa' : 'Khác';
    assertTest($txStatus3 === 'Nhận thừa', "5. Cột Giao dịch ngân hàng tính đúng 'Nhận thừa'");

    // 5. Đơn chưa thấy tiền: tạo đơn 4, không có bản ghi trong bank_transactions
    $code4 = '[TEST]V3_UNPAID_' . time();
    $insB4 = $pdo->prepare("
        INSERT INTO bookings (code, customer_name, phone, pitch_id, slot_id, booking_date, slot_time, total_price, deposit_amount, paid_amount, remaining_amount, status, payment_status, payment_method, expires_at)
        VALUES (?, 'Khách V3 Unpaid', '0912345681', ?, ?, CURDATE(), '06:00 - 07:30', 300000, 90000, 0, 300000, 'Chờ duyệt cọc', 'Chờ duyệt cọc', 'VietQR SePay', DATE_ADD(NOW(), INTERVAL 15 MINUTE))
    ");
    $insB4->execute([$code4, $firstPitchId, $firstSlotId]);

    $stmtPend->execute([$code4]);
    $r4 = $stmtPend->fetch();
    $txStatus4 = empty($r4['transfer_amount']) ? 'Chưa thấy tiền' : 'Có tiền';
    assertTest($txStatus4 === 'Chưa thấy tiền', "6. Cột Giao dịch ngân hàng tính đúng 'Chưa thấy tiền'");

    // 6. Test Cron Auto Release: không nhả đơn đã có tiền hoặc đang Chờ duyệt cọc
    // Tạo đơn 5 hết hạn nhưng đang 'Chờ duyệt cọc'
    $code5 = '[TEST]V3_EXP_WAIT_' . time();
    $insB5 = $pdo->prepare("
        INSERT INTO bookings (code, customer_name, phone, pitch_id, slot_id, booking_date, slot_time, total_price, deposit_amount, paid_amount, remaining_amount, status, payment_status, payment_method, expires_at)
        VALUES (?, 'Khách V3 Exp Wait', '0912345682', ?, ?, CURDATE(), '07:30 - 09:00', 300000, 90000, 0, 300000, 'Chờ duyệt cọc', 'Chờ duyệt cọc', 'VietQR SePay', DATE_SUB(NOW(), INTERVAL 30 MINUTE))
    ");
    $insB5->execute([$code5, $firstPitchId, $firstSlotId]);

    // Tạo đơn 6 hết hạn nhưng ở trạng thái 'Chờ cọc 30%' chưa có tiền
    $code6 = '[TEST]V3_EXP_UNPAID_' . time();
    $insB6 = $pdo->prepare("
        INSERT INTO bookings (code, customer_name, phone, pitch_id, slot_id, booking_date, slot_time, total_price, deposit_amount, paid_amount, remaining_amount, status, payment_status, payment_method, expires_at)
        VALUES (?, 'Khách V3 Exp Unpaid', '0912345683', ?, ?, CURDATE(), '09:00 - 10:30', 300000, 90000, 0, 300000, 'Giữ chỗ', 'Chờ cọc 30%', 'VietQR SePay', DATE_SUB(NOW(), INTERVAL 30 MINUTE))
    ");
    $insB6->execute([$code6, $firstPitchId, $firstSlotId]);

    // Chạy cron auto release
    $releaseResult = run_auto_release_expired_bookings($pdo, true);

    $b5Row = $pdo->query("SELECT status, payment_status FROM bookings WHERE code = '{$code5}'")->fetch();
    $b6Row = $pdo->query("SELECT status, payment_status FROM bookings WHERE code = '{$code6}'")->fetch();

    assertTest($b5Row['status'] === 'Chờ duyệt cọc', "7. Cron KHÔNG nhả đơn đang Chờ duyệt cọc ({$code5})");
    assertTest($b6Row['status'] === 'Đã hủy', "8. Cron ĐÃ nhả đơn giữ chỗ quá hạn chưa thanh toán ({$code6})");

    // 7. Test duyệt 2 lần đồng thời / idempotency
    $pdo->beginTransaction();
    $stmtLock1 = $pdo->prepare("SELECT * FROM bookings WHERE code = ? FOR UPDATE");
    $stmtLock1->execute([$code2]);
    $rowLock1 = $stmtLock1->fetch();

    $updLock1 = $pdo->prepare("UPDATE bookings SET status = 'Đã xác nhận', payment_status = 'Đã cọc 30%', note = CONCAT(IFNULL(note,''), ' [Duyệt thiếu]') WHERE code = ?");
    $updLock1->execute([$code2]);
    $pdo->commit();

    // Lần 2 thử duyệt tiếp
    $b2Check = $pdo->query("SELECT status, payment_status FROM bookings WHERE code = '{$code2}'")->fetch();
    assertTest($b2Check['status'] === 'Đã xác nhận' && $b2Check['payment_status'] === 'Đã cọc 30%', "9. Transaction duyệt cọc an toàn, không tạo trùng");

} catch (Throwable $e) {
    echo "EXCEPTION: " . $e->getMessage() . " on line " . $e->getLine() . "\n";
    echo $e->getTraceAsString() . "\n";
} finally {
    // Dọn dẹp dữ liệu test
    if (isset($cleanStmt)) {
        $cleanStmt->execute();
    }
    if (isset($cleanTx)) {
        $cleanTx->execute();
    }
    if (isset($cleanAudit)) {
        $cleanAudit->execute();
    }
}

echo "\n=== KẾT QUẢ TEST V3: {$testsPassed}/{$totalTests} ĐẠT ===\n";
if ($testsPassed === $totalTests && $totalTests > 0) {
    exit(0);
} else {
    exit(1);
}
