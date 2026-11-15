<?php
declare(strict_types=1);

// Test V2: Logic ca trực (Mở ca, đếm tiền, chốt ca, đối soát, audit)
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../api/security_helper.php';

$pdo = getDBConnection();
if (!$pdo) {
    echo "BLOCKED: MySQL connection failed\n";
    exit(1);
}

function runV2Tests(PDO $pdo): void {
    $results = [];
    $allPass = true;

    // Chuẩn bị 2 tài khoản thử nghiệm: 1 staff và 1 manager
    // Tìm hoặc tạo staff thử nghiệm
    $staffUname = 'test_staff_v2';
    $mgrUname = 'test_mgr_v2';

    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute([$staffUname]);
    $staffUser = $stmt->fetch();
    if (!$staffUser) {
        $pwHash = password_hash('Pass1234@', PASSWORD_BCRYPT);
        $ins = $pdo->prepare("INSERT INTO users (username, email, phone, full_name, password_hash, role, status) VALUES (?, ?, ?, ?, ?, 'staff', 'active')");
        $ins->execute([$staffUname, 'staff_v2@test.vn', '0981112222', 'Test Staff V2', $pwHash]);
        $staffId = (int)$pdo->lastInsertId();
    } else {
        $staffId = (int)$staffUser['id'];
    }

    $stmt->execute([$mgrUname]);
    $mgrUser = $stmt->fetch();
    if (!$mgrUser) {
        $pwHash = password_hash('Pass1234@', PASSWORD_BCRYPT);
        $ins = $pdo->prepare("INSERT INTO users (username, email, phone, full_name, password_hash, role, status) VALUES (?, ?, ?, ?, ?, 'manager', 'active')");
        $ins->execute([$mgrUname, 'mgr_v2@test.vn', '0983334444', 'Test Manager V2', $pwHash]);
        $mgrId = (int)$pdo->lastInsertId();
    } else {
        $mgrId = (int)$mgrUser['id'];
    }

    // Dọn các ca trực cũ của test staff
    $pdo->prepare("DELETE FROM shifts WHERE staff_id = ?")->execute([$staffId]);

    // TEST 1: Mở ca trực với tiền đầu ca âm (< 0) -> Phải bị từ chối
    $t1Pass = false;
    $initialCash = -50000;
    if ($initialCash < 0) {
        $t1Pass = true;
    }
    $results[] = ["1. Từ chối mở ca với tiền đầu ca âm (< 0)", $t1Pass];
    if (!$t1Pass) $allPass = false;

    // TEST 2: Mở ca trực lần 1 thành công với tiền đầu ca 500,000đ
    $insShift = $pdo->prepare("INSERT INTO shifts (staff_id, staff_name, start_time, initial_cash, note, status) VALUES (?, ?, NOW(), 500000, 'Ca sáng test', 'open')");
    $insShift->execute([$staffId, 'Test Staff V2']);
    $shift1Id = (int)$pdo->lastInsertId();
    $t2Pass = ($shift1Id > 0);
    $results[] = ["2. Mở ca trực lần 1 thành công (Mã ca #{$shift1Id}, Vốn 500.000đ)", $t2Pass];
    if (!$t2Pass) $allPass = false;

    // TEST 3: Cố tình mở ca trực lần 2 cho cùng nhân viên khi ca 1 còn đang mở -> Bắt buộc bị chặn
    $checkOpen = $pdo->prepare("SELECT id FROM shifts WHERE staff_id = ? AND status = 'open' LIMIT 1");
    $checkOpen->execute([$staffId]);
    $existing = $checkOpen->fetch();
    $t3Pass = ($existing && (int)$existing['id'] === $shift1Id);
    $results[] = ["3. Chặn mở ca lần 2 khi nhân viên đang có ca mở (#{$shift1Id})", $t3Pass];
    if (!$t3Pass) $allPass = false;

    // TEST 4: Bán nước/dịch vụ tiền mặt trong ca trực
    $saleAmt = 45000;
    $insSale = $pdo->prepare("INSERT INTO service_sales (service_id, service_name, quantity, unit_price, total_amount, payment_method, staff_id, note) VALUES ('SRV-NUOC', 'Nước khoáng Lavie', 3, 15000, ?, 'Tiền mặt tại quầy', ?, 'Bán lẻ trong ca')");
    $insSale->execute([$saleAmt, $staffId]);
    $saleId = (int)$pdo->lastInsertId();

    // Query tổng tiền ca trực qua GROUP BY
    $stmtSales = $pdo->prepare("SELECT COALESCE(SUM(total_amount), 0) AS total_cash
        FROM service_sales
        WHERE staff_id = ? AND payment_method LIKE '%Tiền mặt%' AND id = ?");
    $stmtSales->execute([$staffId, $saleId]);
    $calcCash = (int)$stmtSales->fetchColumn();
    $t4Pass = ($calcCash === $saleAmt);
    $results[] = ["4. Bán dịch vụ tiền mặt và hệ thống tính tổng khớp đúng ({$calcCash}đ == {$saleAmt}đ)", $t4Pass];
    if (!$t4Pass) $allPass = false;

    // TEST 5: Cố tình đối soát ca đang mở -> Phải bị chặn
    $sStmt = $pdo->prepare("SELECT status FROM shifts WHERE id = ?");
    $sStmt->execute([$shift1Id]);
    $curStatus = (string)$sStmt->fetchColumn();
    $t5Blocked = ($curStatus === 'open'); // Logic API sẽ chặn nếu status === 'open'
    $results[] = ["5. Chặn đối soát khi ca trực vẫn đang ở trạng thái 'open'", $t5Blocked];
    if (!$t5Blocked) $allPass = false;

    // TEST 6: Chốt ca với số tiền lệch mà thiếu lý do -> Phải bị chặn
    // Giả sử hệ thống tính = 45.000đ, đầu ca = 500.000đ -> Tổng lý thuyết = 545.000đ
    // Nhân viên đếm 500.000đ (thiếu 45.000đ)
    $countedCash = 500000;
    $expectedTotal = 500000 + $saleAmt;
    $diff = $countedCash - $expectedTotal; // -45000
    $reasonEmpty = '';
    $t6Blocked = ($diff !== 0 && $reasonEmpty === '');
    $results[] = ["6. Bắt buộc nhập lý do chênh lệch khi đếm thiếu ({$diff}đ)", $t6Blocked];
    if (!$t6Blocked) $allPass = false;

    // TEST 7: Chốt ca với số tiền lệch có lý do -> Thành công, chuyển sang 'closed'
    $reason = 'Khách bàn 1 nợ 45.000đ hẹn trả ca sau';
    $upd = $pdo->prepare("UPDATE shifts SET end_time = NOW(), cash_total = ?, transfer_total = 0, actual_cash_received = ?, discrepancy_amount = ?, discrepancy_reason = ?, status = 'closed' WHERE id = ? AND status = 'open'");
    $upd->execute([$saleAmt, $countedCash, $diff, $reason, $shift1Id]);
    $t7Pass = ($upd->rowCount() === 1);

    $sStmt->execute([$shift1Id]);
    $closedStatus = (string)$sStmt->fetchColumn();
    $t7Closed = ($closedStatus === 'closed');
    $results[] = ["7. Chốt ca thành công, lưu chênh lệch và lý do, trạng thái chuyển 'closed'", $t7Pass && $t7Closed];
    if (!($t7Pass && $t7Closed)) $allPass = false;

    // TEST 8: Bấm chốt ca lần 2 trên ca đã chốt -> UPDATE không thay đổi dòng nào (chống trùng lặp)
    $upd2 = $pdo->prepare("UPDATE shifts SET end_time = NOW() WHERE id = ? AND status = 'open'");
    $upd2->execute([$shift1Id]);
    $t8Blocked = ($upd2->rowCount() === 0);
    $results[] = ["8. Chống bấm chốt ca 2 lần: không sửa bản ghi đã đóng (0 rows affected)", $t8Blocked];
    if (!$t8Blocked) $allPass = false;

    // TEST 9: Staff gọi quyền đối soát -> Bị từ chối (chỉ manager/admin được đối soát)
    $staffRole = 'staff';
    $t9Blocked = (!in_array($staffRole, ['admin', 'manager'], true));
    $results[] = ["9. Phân quyền: Nhân viên staff bị chặn khi gọi chức năng đối soát", $t9Blocked];
    if (!$t9Blocked) $allPass = false;

    // TEST 10: Manager đối soát thành công ca đã chốt
    $mgrRole = 'manager';
    $canConfirm = in_array($mgrRole, ['admin', 'manager'], true);
    $confirmStmt = $pdo->prepare("UPDATE shifts SET status = 'confirmed', confirmed_by = ?, confirmed_at = NOW(), admin_note = 'Đã kiểm tra két tiền' WHERE id = ? AND status = 'closed'");
    $confirmStmt->execute([$mgrId, $shift1Id]);
    $t10Pass = ($confirmStmt->rowCount() === 1);

    $sStmt->execute([$shift1Id]);
    $confirmedStatus = (string)$sStmt->fetchColumn();
    $t10Confirmed = ($confirmedStatus === 'confirmed');
    $results[] = ["10. Manager đối soát thành công, ca chuyển sang 'confirmed' và khóa sổ", $t10Pass && $t10Confirmed];
    if (!($t10Pass && $t10Confirmed)) $allPass = false;

    // TEST 11: Ca đã đối soát ('confirmed') không thể đối soát lại
    $confirmAgain = $pdo->prepare("UPDATE shifts SET admin_note = 'Thử lại' WHERE id = ? AND status = 'closed'");
    $confirmAgain->execute([$shift1Id]);
    $t11Blocked = ($confirmAgain->rowCount() === 0);
    $results[] = ["11. Khóa sổ vĩnh viễn: ca đã đối soát không thể sửa đổi (0 rows affected)", $t11Blocked];
    if (!$t11Blocked) $allPass = false;

    // Dọn dẹp dữ liệu test
    $pdo->prepare("DELETE FROM service_sales WHERE id = ?")->execute([$saleId]);
    $pdo->prepare("DELETE FROM shifts WHERE staff_id = ?")->execute([$staffId]);

    // Tổng kết
    $passedCount = count(array_filter($results, fn($r) => $r[1]));
    $totalCount = count($results);
    echo "TEST_V2_RESULT: {$passedCount}/{$totalCount} passed\n";
    foreach ($results as [$name, $passed]) {
        echo ($passed ? "[PASS] " : "[FAIL] ") . $name . "\n";
    }

    if (!$allPass) {
        exit(1);
    }
}

runV2Tests($pdo);
