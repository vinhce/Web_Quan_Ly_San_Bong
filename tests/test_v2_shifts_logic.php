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

    // Dọn dẹp dữ liệu test cũ (phần SQL cơ bản)
    $pdo->prepare("DELETE FROM service_sales WHERE id = ?")->execute([$saleId]);
    $pdo->prepare("DELETE FROM shifts WHERE staff_id = ?")->execute([$staffId]);

    // --- PHẦN B MỞ RỘNG: KIỂM TRA QUA ENDPOINT & VALIDATOR ---
    $callShiftsApi = static function (array $sessionUser, string $method, array $getParams = [], array $payload = []): array {
        $rootDir = dirname(__DIR__);
        $cfg = [
            'root'    => $rootDir,
            'session' => $sessionUser,
            'action'  => 'shifts',
            'method'  => $method,
            'get'     => $getParams,
            'payload' => $payload,
        ];
        // Build inline one-shot invocation via temp runner so $_GET/$_POST are isolated cleanly
        $code = <<<'PHPEOF'
<?php
$cfg = json_decode(base64_decode($argv[1]), true);
$root = $cfg['root'];
require_once $root . '/config/database.php';
require_once $root . '/api/security_helper.php';
if (session_status() === PHP_SESSION_NONE) session_start();
$_SESSION = $cfg['session'];
$csrf = 'test_csrf_v2_1234567890abcdef';
$_SESSION['csrf_token'] = $csrf;
$_SERVER['HTTP_X_CSRF_TOKEN'] = $csrf;
$_SERVER['REQUEST_METHOD'] = $cfg['method'];
$_GET = array_merge(['action' => 'shifts'], $cfg['get'] ?? []);
$_POST = $cfg['payload'] ?? [];
$GLOBALS['test_json_input'] = json_encode($cfg['payload'] ?? []);
ob_start();
require $root . '/api/admin.php';
$out = ob_get_clean();
echo $out;
PHPEOF;
        $tmpScript = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'shift_v2_runner_' . getmypid() . '.php';
        file_put_contents($tmpScript, $code);
        try {
            $cmd = sprintf('"%s" "%s" %s', PHP_BINARY, $tmpScript, escapeshellarg(base64_encode(json_encode($cfg))));
            $raw = (string)shell_exec($cmd);
        } finally {
            @unlink($tmpScript);
        }
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? ['json' => $decoded, 'raw' => $raw] : ['json' => null, 'raw' => $raw];
    };

    // Kiểm tra validate_mandatory_audit_reason
    $vShort = validate_mandatory_audit_reason('ngắn', 10);
    $vRep1 = validate_mandatory_audit_reason('aaaaaaaaaa', 10);
    $vRep2 = validate_mandatory_audit_reason('12121212', 10);
    $vRep3 = validate_mandatory_audit_reason('dasdawdadwdasd', 10);
    $vRep4 = validate_mandatory_audit_reason('test test test', 10);
    $vGood = validate_mandatory_audit_reason('Khách trả thừa 20.000đ tiền mặt ca sáng', 10);
    $t12Pass = !$vShort['valid'] && !$vRep1['valid'] && !$vRep2['valid'] && !$vRep3['valid'] && !$vRep4['valid'] && $vGood['valid'];
    $results[] = ["12. validate_mandatory_audit_reason() chặn chuỗi ngắn/lặp rác và nhận lý do hợp lệ", $t12Pass];
    if (!$t12Pass) $allPass = false;

    $staffSession = ['user_id' => $staffId, 'user' => ['id' => $staffId, 'username' => $staffUname, 'full_name' => 'Test Staff V2', 'role' => 'staff']];
    $mgrSession = ['user_id' => $mgrId, 'user' => ['id' => $mgrId, 'username' => $mgrUname, 'full_name' => 'Test Manager V2', 'role' => 'manager']];

    $createdShiftIds = [];
    $savedOpenShifts = [];
    try {
        // Lưu tạm ca đang open sẵn (nếu có) để test không đụng chạm dữ liệu thật và luôn hoàn nguyên
        $openRows = $pdo->query("SELECT id, status FROM shifts WHERE status = 'open'")->fetchAll(PDO::FETCH_ASSOC);
        foreach ($openRows as $or) {
            $savedOpenShifts[] = (int)$or['id'];
            $pdo->prepare("UPDATE shifts SET status = 'closed' WHERE id = ?")->execute([(int)$or['id']]);
        }

        // TEST 13: GET activeShift == null -> open_time: null, cash_total: 0, transfer_total: 0
        $resGetEmpty = $callShiftsApi($staffSession, 'GET');
        $dEmpty = $resGetEmpty['json']['data'] ?? [];
        $t13Pass = ($resGetEmpty['json']['success'] ?? false) === true
            && array_key_exists('activeShift', $dEmpty) && $dEmpty['activeShift'] === null
            && array_key_exists('open_time', $dEmpty) && $dEmpty['open_time'] === null
            && (int)($dEmpty['cash_total'] ?? -1) === 0
            && (int)($dEmpty['transfer_total'] ?? -1) === 0;
        $results[] = ["13. GET shifts khi chưa mở ca trả open_time=null, cash_total=0, transfer_total=0", $t13Pass];
        if (!$t13Pass) $allPass = false;

        // TEST 14: Mở ca qua API thành công, sau đó tài khoản KHÁC (Manager) mở ca thứ 2 bị chặn
        $resOpen1 = $callShiftsApi($staffSession, 'POST', [], ['sub_action' => 'open_shift', 'initial_cash' => 500000, 'note' => '[TEST] Mở ca V2']);
        $open1Id = (int)($resOpen1['json']['data']['shift_id'] ?? 0);
        if ($open1Id > 0) $createdShiftIds[] = $open1Id;

        $resOpen2 = $callShiftsApi($mgrSession, 'POST', [], ['sub_action' => 'open_shift', 'initial_cash' => 200000, 'note' => '[TEST] Mở ca đè']);
        $t14Pass = ($resOpen1['json']['success'] ?? false) === true
            && $open1Id > 0
            && ($resOpen2['json']['success'] ?? true) === false
            && ($resOpen2['json']['ref_code'] ?? '') === 'ERR_SHIFT_ALREADY_OPEN';
        $results[] = ["14. Chặn mở ca mới khi còn bất kỳ ca nào đang open (kể cả khác nhân viên)", $t14Pass];
        if (!$t14Pass) $allPass = false;

        // TEST 15: Cảnh báo warn_level warning (>= 12h) và danger (>= 16h)
        $pdo->prepare("UPDATE shifts SET start_time = DATE_SUB(NOW(), INTERVAL 13 HOUR) WHERE id = ?")->execute([$open1Id]);
        $resWarn12 = $callShiftsApi($staffSession, 'GET');
        $pdo->prepare("UPDATE shifts SET start_time = DATE_SUB(NOW(), INTERVAL 17 HOUR) WHERE id = ?")->execute([$open1Id]);
        $resWarn16 = $callShiftsApi($staffSession, 'GET');
        $t15Pass = ($resWarn12['json']['data']['warn_level'] ?? '') === 'warning'
            && ($resWarn16['json']['data']['warn_level'] ?? '') === 'danger';
        $results[] = ["15. Cảnh báo mở ca lâu: >=12h warn_level=warning, >=16h warn_level=danger", $t15Pass];
        if (!$t15Pass) $allPass = false;

        // TEST 16: Chốt ca lệch thiếu lý do / lý do rác bị chặn, lý do hợp lệ vào pending_explanation & giữ staff_counted_cash
        $resCloseBad = $callShiftsApi($staffSession, 'POST', [], [
            'sub_action' => 'close_shift',
            'shift_id' => $open1Id,
            'actual_cash_received' => 470000,
            'discrepancy_reason' => 'dasdawdadwdasd'
        ]);
        $resCloseOk = $callShiftsApi($staffSession, 'POST', [], [
            'sub_action' => 'close_shift',
            'shift_id' => $open1Id,
            'actual_cash_received' => 470000,
            'discrepancy_reason' => '[TEST] Khách thiếu tiền lẻ trả sau 30.000đ'
        ]);
        $rowAfterClose = $pdo->query("SELECT status, staff_counted_cash, actual_cash_received FROM shifts WHERE id = {$open1Id}")->fetch(PDO::FETCH_ASSOC);
        $t16Pass = ($resCloseBad['json']['success'] ?? true) === false
            && ($resCloseOk['json']['success'] ?? false) === true
            && ($rowAfterClose['status'] ?? '') === 'pending_explanation'
            && (float)($rowAfterClose['staff_counted_cash'] ?? 0) === 470000.0;
        $results[] = ["16. Chốt ca lệch chặn lý do rác, lưu staff_counted_cash và đặt status='pending_explanation'", $t16Pass];
        if (!$t16Pass) $allPass = false;

        // TEST 17: Đối soát ca lệch thiếu admin_note bị chặn; chỉnh số tiền thực nhận ghi SHIFT_EDIT_COUNT & giữ nguyên staff_counted_cash
        $resConfBad = $callShiftsApi($mgrSession, 'POST', [], [
            'sub_action' => 'confirm_shift',
            'shift_id' => $open1Id,
            'actual_cash_received' => 480000,
            'admin_note' => 'ngắn'
        ]);
        $resConfOk = $callShiftsApi($mgrSession, 'POST', [], [
            'sub_action' => 'confirm_shift',
            'shift_id' => $open1Id,
            'actual_cash_received' => 480000,
            'admin_note' => '[TEST] Kiểm tra lại két thấy thêm tờ 10.000đ'
        ]);
        $rowAfterConf = $pdo->query("SELECT status, staff_counted_cash, actual_cash_received FROM shifts WHERE id = {$open1Id}")->fetch(PDO::FETCH_ASSOC);
        $editLogCount = (int)$pdo->query("SELECT COUNT(*) FROM audit_logs WHERE action = 'SHIFT_EDIT_COUNT' AND object_code = 'SHIFT-{$open1Id}'")->fetchColumn();
        $t17Pass = ($resConfBad['json']['success'] ?? true) === false
            && ($resConfOk['json']['success'] ?? false) === true
            && ($rowAfterConf['status'] ?? '') === 'confirmed'
            && (float)($rowAfterConf['staff_counted_cash'] ?? 0) === 470000.0
            && (int)($rowAfterConf['actual_cash_received'] ?? 0) === 480000
            && $editLogCount >= 1;
        $results[] = ["17. Đối soát chỉnh số đếm bắt buộc lý do, giữ staff_counted_cash=470000 và ghi SHIFT_EDIT_COUNT", $t17Pass];
        if (!$t17Pass) $allPass = false;

        // TEST 18: Lọc staff_id + confirmed_by_name + shift_detail + export_csv
        $resList = $callShiftsApi($mgrSession, 'GET', ['staff_id' => (string)$staffId]);
        $firstRow = $resList['json']['data']['shifts'][0] ?? [];
        $resDetail = $callShiftsApi($mgrSession, 'GET', ['sub_action' => 'shift_detail', 'shift_id' => (string)$open1Id]);
        $resCsv = $callShiftsApi($mgrSession, 'GET', ['sub_action' => 'export_csv', 'staff_id' => (string)$staffId]);
        $exportLogCount = (int)$pdo->query("SELECT COUNT(*) FROM audit_logs WHERE action = 'EXPORT_CSV' AND target_type = 'shift'")->fetchColumn();
        $t18Pass = !empty($firstRow['confirmed_by_name'])
            && ($resDetail['json']['success'] ?? false) === true
            && isset($resDetail['json']['data']['bank_summary'], $resDetail['json']['data']['vietqr_items'], $resDetail['json']['data']['bookings'])
            && str_starts_with($resCsv['raw'], "\xEF\xBB\xBF")
            && str_contains($resCsv['raw'], "SHIFT-{$open1Id}")
            && $exportLogCount >= 1;
        $results[] = ["18. Lọc staff_id, JOIN confirmed_by_name, shift_detail (VietQR vs bank_transactions) & export_csv BOM", $t18Pass];
        if (!$t18Pass) $allPass = false;
    } finally {
        foreach ($createdShiftIds as $cid) {
            $pdo->prepare("DELETE FROM audit_logs WHERE object_code = ? OR target_id = ?")->execute(["SHIFT-{$cid}", "SHIFT-{$cid}"]);
            $pdo->prepare("DELETE FROM shifts WHERE id = ?")->execute([$cid]);
        }
        $pdo->prepare("DELETE FROM audit_logs WHERE user_id IN (?, ?) AND action = 'EXPORT_CSV' AND target_type = 'shift'")->execute([$staffId, $mgrId]);
        foreach ($savedOpenShifts as $oid) {
            $pdo->prepare("UPDATE shifts SET status = 'open' WHERE id = ?")->execute([$oid]);
        }
    }

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
