<?php
declare(strict_types=1);

if (!defined('SANBONG_ADMIN_ROUTER')) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'Direct access forbidden.', 'ref_code' => 'ERR_FORBIDDEN'], JSON_UNESCAPED_UNICODE);
    exit;
}

function clear_sample_test_data(PDO $pdo): int {
    $count = 0;
    $bStmt = $pdo->prepare("DELETE FROM bookings WHERE code LIKE '[TEST]%'");
    $bStmt->execute();
    $count += $bStmt->rowCount();

    $btStmt = $pdo->prepare("DELETE FROM bank_transactions WHERE detected_booking_code LIKE '[TEST]%' OR matched_booking_code LIKE '[TEST]%' OR transaction_content LIKE '%[TEST]%' OR sepay_tx_id LIKE '[TEST]%'");
    $btStmt->execute();
    $count += $btStmt->rowCount();

    $expStmt = $pdo->prepare("DELETE FROM expenses WHERE expense_code LIKE '[TEST]%' OR receipt_note LIKE '%[TEST]%'");
    $expStmt->execute();
    $count += $expStmt->rowCount();

    $ssStmt = $pdo->prepare("DELETE FROM service_sales WHERE booking_code LIKE '[TEST]%' OR note LIKE '%[TEST]%'");
    $ssStmt->execute();
    $count += $ssStmt->rowCount();

    $shStmt = $pdo->prepare("DELETE FROM shifts WHERE note LIKE '%[TEST]%'");
    $shStmt->execute();
    $count += $shStmt->rowCount();

    return $count;
}

function seed_sample_test_data(PDO $pdo, int $staffId = 2): array {
    clear_sample_test_data($pdo);

    $dYesterday = date('Y-m-d', strtotime('-1 day'));
    $dToday     = date('Y-m-d');
    $dTomorrow  = date('Y-m-d', strtotime('+1 day'));

    $seededBookings = [];

    // 1. SÂN C, D, E (SÂN 5): Mỗi sân 3 ca (1 hôm qua, 1 hôm nay, 1 ngày mai) - tổng 9 ca
    $p5Pitches = [
        'P5-C' => 'Sân 5 - Sân C (Mới)',
        'P5-D' => 'Sân 5 - Sân D (Khán Đài Đông)',
        'P5-E' => 'Sân 5 - Sân E (Mini VIP)'
    ];

    $p5Configs = [
        ['date' => $dYesterday, 'slot_id' => 'S05', 'slot_time' => '16:30 - 18:30', 'price' => 700000, 'dep' => 210000, 'paid' => 700000, 'rem' => 0, 'status' => 'Hoàn thành', 'payment_status' => 'Đã thanh toán 100%', 'method' => 'Tiền mặt tại quầy'],
        ['date' => $dToday,     'slot_id' => 'S06', 'slot_time' => '18:30 - 20:30', 'price' => 700000, 'dep' => 210000, 'paid' => 210000, 'rem' => 490000, 'status' => 'Đã xác nhận', 'payment_status' => 'Đã cọc 30%', 'method' => 'VietQR SePay'],
        ['date' => $dTomorrow,  'slot_id' => 'S02', 'slot_time' => '07:30 - 09:30', 'price' => 500000, 'dep' => 150000,  'paid' => 0,      'rem' => 500000, 'status' => 'Giữ chỗ',    'payment_status' => 'Chờ cọc 30%', 'method' => 'VietQR SePay']
    ];

    $insB = $pdo->prepare("
        INSERT INTO bookings (code, customer_name, phone, pitch_id, slot_id, booking_date, slot_time, total_price, deposit_amount, paid_amount, remaining_amount, status, payment_status, payment_method, staff_id, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), ?)
    ");

    $idx = 1;
    foreach ($p5Pitches as $pId => $pName) {
        foreach ($p5Configs as $cfg) {
            $code = sprintf('[TEST]P5_%s_%02d', str_replace('P5-', '', $pId), $idx++);
            $cust = "Khách [TEST] Sân {$pId} #{$idx}";
            $phone = sprintf('098%07d', rand(1000000, 9999999));
            $createdAt = "{$cfg['date']} 08:00:00";
            $insB->execute([
                $code, $cust, $phone, $pId, $cfg['slot_id'], $cfg['date'], $cfg['slot_time'],
                $cfg['price'], $cfg['dep'], $cfg['paid'], $cfg['rem'],
                $cfg['status'], $cfg['payment_status'], $cfg['method'], $staffId, $createdAt
            ]);
            $seededBookings[] = $code;

            if ($cfg['payment_status'] === 'Đã cọc 30%') {
                $insTx = $pdo->prepare("
                    INSERT INTO bank_transactions (sepay_tx_id, tx_fingerprint, gateway, reference_code, transaction_content, detected_booking_code, matched_booking_code, transfer_amount, expected_amount, discrepancy_amount, match_status, transaction_date, resolved_at)
                    VALUES (?, ?, 'VietinBank', ?, ?, ?, ?, ?, ?, 0, 'matched', ?, NOW())
                ");
                $insTx->execute([
                    '[TEST]SPY_' . rand(100000, 999999), md5($code . $createdAt), 'REF_' . rand(10000, 99999),
                    "THANH TOAN COC {$code}", $code, $code, $cfg['dep'], $cfg['dep'], "{$cfg['date']} 08:05:00"
                ]);
            }
        }
    }

    // 2. SÂN 11: 7 ca trải trên ít nhất 3 sân khác nhau (P11-A, P11-B, P11-C), đủ trạng thái
    $p11Configs = [
        [
            'code' => '[TEST]P11_DONE_01', 'pitch_id' => 'P11-A', 'date' => $dYesterday, 'slot_id' => 'S05', 'slot_time' => '16:30 - 18:30',
            'price' => 2400000, 'dep' => 720000, 'paid' => 2400000, 'rem' => 0, 'status' => 'Hoàn thành', 'payment_status' => 'Đã thanh toán 100%',
            'method' => 'Tiền mặt tại quầy', 'voucher' => 'BANGLOI100', 'water_qty' => 5
        ],
        [
            'code' => '[TEST]P11_PLAY_02', 'pitch_id' => 'P11-A', 'date' => $dToday, 'slot_id' => 'S06', 'slot_time' => '18:30 - 20:30',
            'price' => 2400000, 'dep' => 720000, 'paid' => 2400000, 'rem' => 0, 'status' => 'Đang đá', 'payment_status' => 'Đã thanh toán 100%',
            'method' => 'VietQR SePay', 'voucher' => null, 'water_qty' => 3
        ],
        [
            'code' => '[TEST]P11_CONF_03', 'pitch_id' => 'P11-B', 'date' => $dToday, 'slot_id' => 'S05', 'slot_time' => '16:30 - 18:30',
            'price' => 2400000, 'dep' => 720000, 'paid' => 720000, 'rem' => 1680000, 'status' => 'Đã xác nhận', 'payment_status' => 'Đã cọc 30%',
            'method' => 'VietQR SePay', 'voucher' => null, 'water_qty' => 0
        ],
        [
            'code' => '[TEST]P11_UNDER_04', 'pitch_id' => 'P11-B', 'date' => $dToday, 'slot_id' => 'S06', 'slot_time' => '18:30 - 20:30',
            'price' => 2400000, 'dep' => 720000, 'paid' => 500000, 'rem' => 1900000, 'status' => 'Chờ duyệt cọc', 'payment_status' => 'Chờ duyệt cọc',
            'method' => 'VietQR SePay', 'voucher' => null, 'water_qty' => 0, 'tx_amount' => 500000, 'tx_status' => 'underpaid'
        ],
        [
            'code' => '[TEST]P11_OVER_05', 'pitch_id' => 'P11-C', 'date' => $dTomorrow, 'slot_id' => 'S05', 'slot_time' => '16:30 - 18:30',
            'price' => 2400000, 'dep' => 720000, 'paid' => 900000, 'rem' => 1500000, 'status' => 'Chờ duyệt cọc', 'payment_status' => 'Chờ duyệt cọc',
            'method' => 'VietQR SePay', 'voucher' => null, 'water_qty' => 0, 'tx_amount' => 900000, 'tx_status' => 'overpaid'
        ],
        [
            'code' => '[TEST]P11_UNPAID_06', 'pitch_id' => 'P11-C', 'date' => $dTomorrow, 'slot_id' => 'S06', 'slot_time' => '18:30 - 20:30',
            'price' => 2400000, 'dep' => 720000, 'paid' => 0, 'rem' => 2400000, 'status' => 'Chờ duyệt cọc', 'payment_status' => 'Chờ duyệt cọc',
            'method' => 'VietQR SePay', 'voucher' => null, 'water_qty' => 0
        ],
        [
            'code' => '[TEST]P11_CANC_07', 'pitch_id' => 'P11-C', 'date' => $dYesterday, 'slot_id' => 'S02', 'slot_time' => '07:30 - 09:30',
            'price' => 1800000, 'dep' => 540000, 'paid' => 0, 'rem' => 0, 'status' => 'Đã hủy', 'payment_status' => 'Đã hoàn cọc 100%',
            'method' => 'VietQR SePay', 'voucher' => null, 'water_qty' => 0, 'refund' => 540000
        ]
    ];

    $insP11 = $pdo->prepare("
        INSERT INTO bookings (code, customer_name, phone, pitch_id, slot_id, booking_date, slot_time, total_price, deposit_amount, paid_amount, remaining_amount, status, payment_status, payment_method, voucher_code, refund_amount, staff_id, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), ?)
    ");

    foreach ($p11Configs as $c) {
        $cust = "CLB Sân 11 [TEST] #{$c['code']}";
        $phone = sprintf('097%07d', rand(1000000, 9999999));
        $createdAt = "{$c['date']} 09:00:00";
        $insP11->execute([
            $c['code'], $cust, $phone, $c['pitch_id'], $c['slot_id'], $c['date'], $c['slot_time'],
            $c['price'], $c['dep'], $c['paid'], $c['rem'],
            $c['status'], $c['payment_status'], $c['method'], $c['voucher'] ?? null, $c['refund'] ?? 0,
            $staffId, $createdAt
        ]);
        $seededBookings[] = $c['code'];

        if (!empty($c['tx_amount'])) {
            $insTx = $pdo->prepare("
                INSERT INTO bank_transactions (sepay_tx_id, tx_fingerprint, gateway, reference_code, transaction_content, detected_booking_code, matched_booking_code, transfer_amount, expected_amount, discrepancy_amount, match_status, transaction_date)
                VALUES (?, ?, 'VietinBank', ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $discrepancy = $c['tx_amount'] - $c['dep'];
            $insTx->execute([
                '[TEST]SPY_' . rand(100000, 999999), md5($c['code'] . $createdAt), 'REF_' . rand(10000, 99999),
                "THANH TOAN COC {$c['code']}", $c['code'], $c['code'],
                $c['tx_amount'], $c['dep'], $discrepancy, $c['tx_status'], "{$c['date']} 09:05:00"
            ]);
        } elseif ($c['payment_status'] === 'Đã cọc 30%' || $c['payment_status'] === 'Đã thanh toán 100%') {
            if ($c['method'] === 'VietQR SePay') {
                $insTx = $pdo->prepare("
                    INSERT INTO bank_transactions (sepay_tx_id, tx_fingerprint, gateway, reference_code, transaction_content, detected_booking_code, matched_booking_code, transfer_amount, expected_amount, discrepancy_amount, match_status, transaction_date, resolved_at)
                    VALUES (?, ?, 'VietinBank', ?, ?, ?, ?, ?, ?, 0, 'matched', ?, NOW())
                ");
                $txAmt = ($c['payment_status'] === 'Đã thanh toán 100%') ? $c['price'] : $c['dep'];
                $insTx->execute([
                    '[TEST]SPY_' . rand(100000, 999999), md5($c['code'] . $createdAt), 'REF_' . rand(10000, 99999),
                    "THANH TOAN {$c['code']}", $c['code'], $c['code'],
                    $txAmt, $txAmt, "{$c['date']} 09:05:00"
                ]);
            }
        }

        if (!empty($c['water_qty'])) {
            $waterPrice = 15000;
            $totalWater = $waterPrice * $c['water_qty'];
            $insSale = $pdo->prepare("
                INSERT INTO service_sales (service_id, service_name, booking_code, quantity, unit_price, total_amount, payment_method, note, staff_id, created_at)
                VALUES ('SRV-REVIVE', 'Nước Revive bù khoáng', ?, ?, ?, ?, ?, '[TEST] Nước uống kèm ca đặt sân', ?, ?)
            ");
            $insSale->execute([$c['code'], $c['water_qty'], $waterPrice, $totalWater, $c['method'], $staffId, $createdAt]);
        }
    }

    // 3. SỔ CHI (EXPENSES): 4 khoản chi mẫu
    $expList = [
        ['code' => '[TEST]EXP_ELECWATER_01', 'cat' => 'utilities', 'cat_name' => 'Điện nước & Chiếu sáng', 'amt' => 1200000, 'date' => $dYesterday, 'note' => '[TEST] Tiền điện sân bóng kỳ 1'],
        ['code' => '[TEST]EXP_MAINT_01',    'cat' => 'maintenance', 'cat_name' => 'Bảo trì sân cỏ & Lưới', 'amt' => 850000,  'date' => date('Y-m-d', strtotime('-2 days')), 'note' => '[TEST] Thay lưới khung thành sân 11-A'],
        ['code' => '[TEST]EXP_RESTOCK_01',  'cat' => 'supplies', 'cat_name' => 'Nhập hàng nước & Dịch vụ', 'amt' => 2500000, 'date' => date('Y-m-d', strtotime('-3 days')), 'note' => '[TEST] Nhập 15 thùng nước khoáng & Revive'],
        ['code' => '[TEST]EXP_SALARY_01',   'cat' => 'staff', 'cat_name' => 'Lương nhân sự ca trực',       'amt' => 3000000, 'date' => $dToday,     'note' => '[TEST] Chi lương nhân viên hỗ trợ sân cuối tuần']
    ];

    $insExp = $pdo->prepare("
        INSERT INTO expenses (expense_code, category, category_name, amount, expense_date, payer_name, staff_id, receipt_note)
        VALUES (?, ?, ?, ?, ?, 'Ban Quản Trị Sân [TEST]', ?, ?)
    ");
    foreach ($expList as $e) {
        $insExp->execute([$e['code'], $e['cat'], $e['cat_name'], $e['amt'], $e['date'], $staffId, $e['note']]);
    }

    // 4. CA TRỰC MẪU (SHIFTS): 1 ca đã đóng hôm qua
    $insShift = $pdo->prepare("
        INSERT INTO shifts (staff_id, staff_name, start_time, end_time, initial_cash, cash_total, transfer_total, actual_cash_received, discrepancy_amount, discrepancy_reason, status, note)
        VALUES (?, 'Nhân Viên [TEST]', DATE_SUB(NOW(), INTERVAL 8 HOUR), DATE_SUB(NOW(), INTERVAL 1 HOUR), 500000, 350000, 450000, 850000, 0, 'Khớp hoàn toàn', 'closed', '[TEST] Ca trực chiều hôm qua')
    ");
    $insShift->execute([$staffId]);

    return [
        'p5Bookings'     => 9,
        'p11Bookings'    => 7,
        'totalBookings'  => count($seededBookings),
        'expensesCount'  => count($expList),
        'seededList'     => $seededBookings
    ];
}
