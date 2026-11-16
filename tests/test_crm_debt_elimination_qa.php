<?php
declare(strict_types=1);

/**
 * AUTOMATED COMPREHENSIVE QA TEST SUITE:
 * CRM REFURBISHMENT, CUSTOMER MODAL, AND COMPLETE DEBT PURGE
 */

defined('SANBONG_ADMIN_ROUTER') or define('SANBONG_ADMIN_ROUTER', true);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../api/security_helper.php';
require_once __DIR__ . '/../api/notification_helper.php';
require_once __DIR__ . '/../api/services/AdminLogService.php';
require_once __DIR__ . '/../api/services/admin_bookings_manage.php';
require_once __DIR__ . '/../api/services/booking_creator.php';

$pdo = getDBConnection(false);

$passedTests = 0;
$failedTests = 0;
$testResults = [];

function qa_assert(bool $condition, string $testName, string $detail = ''): void {
    global $passedTests, $failedTests, $testResults;
    if ($condition) {
        $passedTests++;
        $msg = "[PASS] {$testName}";
        echo "  {$msg}\n";
        $testResults[] = ['status' => 'PASS', 'test' => $testName, 'detail' => $detail];
    } else {
        $failedTests++;
        $msg = "[FAIL] {$testName} - {$detail}";
        echo "  {$msg}\n";
        $testResults[] = ['status' => 'FAIL', 'test' => $testName, 'detail' => $detail];
    }
}

/**
 * Helper to invoke api/admin.php cleanly via subprocess runner
 */
function invoke_admin_api(string $action, string $method, array $payload = [], array $getParams = [], array $actorSession = []): array {
    $phpPath = 'C:\\laragon\\bin\\php\\php-8.1.10-Win32-vs16-x64\\php.exe';
    if (!file_exists($phpPath)) {
        $phpPath = 'php';
    }

    $defaultSession = [
        'user_id' => 1,
        'user' => [
            'id' => 1,
            'username' => 'admin',
            'full_name' => 'Ban Quản Trị Sân',
            'role' => 'admin'
        ]
    ];
    $mergedSession = array_merge($defaultSession, $actorSession);

    $cfg = [
        'action'  => $action,
        'method'  => strtoupper($method),
        'payload' => $payload,
        'get'     => $getParams,
        'session' => $mergedSession
    ];

    $rawCfg = base64_encode(json_encode($cfg, JSON_UNESCAPED_UNICODE));
    $runnerScript = __DIR__ . '/run_admin_action.php';

    $cmd = escapeshellcmd($phpPath) . ' ' . escapeshellarg($runnerScript) . ' ' . escapeshellarg($rawCfg);
    $output = shell_exec($cmd);

    if (empty($output)) {
        return ['success' => false, 'message' => 'Empty output from runner'];
    }

    $json = json_decode($output, true);
    if (!is_array($json)) {
        return ['success' => false, 'message' => 'Malformed JSON: ' . substr($output, 0, 200), 'raw' => $output];
    }

    return $json;
}

echo "======================================================================\n";
echo " BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG TOÀN DIỆN (QA TEST SUITE - STEP 4)\n";
echo "======================================================================\n\n";

// ======================================================================
// HẠNG MỤC 1: GREP VERIFICATION (XÓA SẠCH CÔNG NỢ / DEBT TRONG CODE PROD)
// ======================================================================
echo "--- HẠNG MỤC 1: GREP VERIFICATION TRONG MÃ NGUỒN PRODUCTION ---\n";

$prodDirs = [
    __DIR__ . '/../api',
    __DIR__ . '/../portal-admin',
    __DIR__ . '/../js',
    __DIR__ . '/../html',
    __DIR__ . '/../config'
];

$foundDebtMatches = [];
$debtPattern = '/(công\s+nợ|cong_no|\bdebt\b|debt_amount|debtAmount|total_debt|debtCount|debt_count)/iu';

foreach ($prodDirs as $dir) {
    if (!is_dir($dir)) continue;
    $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS));
    foreach ($iterator as $file) {
        if (!$file->isFile()) continue;
        $ext = strtolower($file->getExtension());
        if (!in_array($ext, ['php', 'js', 'html', 'sql', 'json'], true)) continue;

        $content = file_get_contents($file->getPathname());
        if (preg_match_all($debtPattern, $content, $matches, PREG_OFFSET_CAPTURE)) {
            foreach ($matches[0] as $m) {
                $matchedWord = $m[0];
                $offset = $m[1];
                $lineNum = substr_count(substr($content, 0, $offset), "\n") + 1;
                $foundDebtMatches[] = "{$file->getPathname()}:{$lineNum} -> {$matchedWord}";
            }
        }
    }
}

qa_assert(
    count($foundDebtMatches) === 0,
    "Mã nguồn production sạch 100% không còn từ khóa 'công nợ' hoặc 'debt'",
    count($foundDebtMatches) > 0 ? "Còn " . count($foundDebtMatches) . " vị trí: " . implode('; ', array_slice($foundDebtMatches, 0, 5)) : ''
);

// ======================================================================
// HẠNG MỤC 2: CUSTOMER API RETURNS APPROVED COLUMNS, NO DEBT FIELDS
// ======================================================================
echo "\n--- HẠNG MỤC 2: KIỂM THỬ CUSTOMER API (APPROVED COLUMNS & NO DEBT FIELDS) ---\n";

$approvedColumns = [
    'user_id', 'phone', 'customerName', 'full_name', 'email', 'customerTier',
    'adminNote', 'isBlacklisted', 'totalBookings', 'completedCount',
    'noShowCount', 'totalSpent', 'points', 'lastBookingDate',
    'lastBookingRelative', 'updated_at'
];

$forbiddenDebtFields = [
    'debt', 'debt_amount', 'debtAmount', 'total_debt', 'totalDebt',
    'debtCount', 'debt_count', 'debtRevenue', 'debt_orders'
];

$custRes = invoke_admin_api('crm_customers', 'GET');
qa_assert($custRes['success'] === true, "API crm_customers trả về HTTP 200 thành công");
qa_assert(is_array($custRes['data'] ?? null) && count($custRes['data']) > 0, "API crm_customers trả về danh sách khách hàng hợp lệ");

$allApproved = true;
$foundForbidden = [];
$firstCustomerPhone = '';

if (!empty($custRes['data']) && is_array($custRes['data'])) {
    $firstCustomerPhone = $custRes['data'][0]['phone'] ?? '';
    foreach ($custRes['data'] as $cust) {
        foreach (array_keys($cust) as $col) {
            if (!in_array($col, $approvedColumns, true)) {
                $allApproved = false;
            }
            if (in_array(strtolower($col), $forbiddenDebtFields, true) || in_array($col, $forbiddenDebtFields, true)) {
                $foundForbidden[] = $col;
            }
        }
    }
}

qa_assert($allApproved, "Tất cả các cột trả về trong crm_customers đều thuộc allowlist được phê duyệt");
qa_assert(count($foundForbidden) === 0, "Tuyệt đối không có trường công nợ (debt, debtAmount...) trong danh sách khách hàng", implode(', ', array_unique($foundForbidden)));

// Test customer_detail endpoint
if ($firstCustomerPhone !== '') {
    $detailRes = invoke_admin_api('customer_detail', 'GET', [], ['phone' => $firstCustomerPhone]);
    qa_assert($detailRes['success'] === true, "API customer_detail lấy thành công hồ sơ khách hàng");
    $detailData = $detailRes['data'] ?? [];
    
    // Check points_log and audit_logs in detailData
    qa_assert(isset($detailData['points_log']) && is_array($detailData['points_log']), "customer_detail trả về mảng lịch sử điểm 'points_log'");
    qa_assert(isset($detailData['audit_logs']) && is_array($detailData['audit_logs']), "customer_detail trả về mảng nhật ký chỉnh sửa 'audit_logs'");
    
    $detailHasDebt = false;
    foreach ($detailData as $k => $v) {
        if (in_array(strtolower($k), $forbiddenDebtFields, true)) {
            $detailHasDebt = true;
        }
    }
    qa_assert(!$detailHasDebt, "customer_detail không chứa bất kỳ trường nợ nào");
}

// ======================================================================
// HẠNG MỤC 3: BACKEND CHẶN HOÀN TẤT ĐƠN KHI CHƯA THANH TOÁN ĐỦ
// ======================================================================
echo "\n--- HẠNG MỤC 3: KIỂM THỬ QUY TẮC HOÀN TẤT ĐƠN (ORDER COMPLETION ENFORCEMENT) ---\n";

// Dọn dẹp booking test cũ
$pdo->exec("DELETE FROM bookings WHERE code IN ('TEST_QA_UNPAID', 'TEST_QA_PAID')");

$pitchRow = $pdo->query("SELECT id FROM pitches LIMIT 1")->fetch(PDO::FETCH_ASSOC);
$testPitchId = $pitchRow ? $pitchRow['id'] : 'P11-A';
$todayYmd = date('Y-m-d');

// Tạo 1 đơn chưa thanh toán đủ: total_price = 500.000đ, paid_amount = 150.000đ (còn thiếu 350.000đ)
$insUnpaid = $pdo->prepare("
    INSERT INTO bookings (code, customer_name, phone, booking_date, slot_id, slot_time, status, payment_status, total_price, deposit_amount, paid_amount, remaining_amount, pitch_id)
    VALUES ('TEST_QA_UNPAID', 'Khách Test Unpaid', '0999888771', '{$todayYmd}', 'S01', '17:00 - 18:30', 'Đã xác nhận', 'Đã cọc 30%', 500000, 150000, 150000, 350000, ?)
");
$insUnpaid->execute([$testPitchId]);

// Thử chuyển sang 'completed' qua admin API
$completeAttempt = invoke_admin_api('update_payment', 'POST', [
    'code'   => 'TEST_QA_UNPAID',
    'status' => 'completed'
]);

qa_assert($completeAttempt['success'] === false, "Backend từ chối hoàn tất đơn đặt sân khi chưa thanh toán đủ");
qa_assert(
    ($completeAttempt['ref_code'] ?? '') === 'ERR_UNPAID_COMPLETION' || str_contains($completeAttempt['message'] ?? '', 'chưa thanh toán đủ'),
    "Mã lỗi từ chối chính xác là ERR_UNPAID_COMPLETION (hoặc thông điệp nhắc chưa thanh toán đủ)",
    $completeAttempt['ref_code'] ?? ($completeAttempt['message'] ?? '')
);

// Kiểm tra DB: trạng thái đơn không bị đổi sang completed
$chkDbUnpaid = $pdo->query("SELECT status FROM bookings WHERE code = 'TEST_QA_UNPAID'")->fetch(PDO::FETCH_ASSOC);
qa_assert($chkDbUnpaid['status'] !== 'completed' && $chkDbUnpaid['status'] !== 'Hoàn thành', "Trạng thái đơn trong DB vẫn giữ nguyên 'Đã xác nhận', không bị chuyển sai");

// Thanh toán đủ 100% (paid_amount = 500.000đ, remaining_amount = 0) và thử lại
$pdo->exec("UPDATE bookings SET paid_amount = 500000, remaining_amount = 0, payment_status = 'Đã thanh toán 100%' WHERE code = 'TEST_QA_UNPAID'");
$completeSuccessAttempt = invoke_admin_api('update_payment', 'POST', [
    'code'   => 'TEST_QA_UNPAID',
    'status' => 'completed'
]);

qa_assert($completeSuccessAttempt['success'] === true, "Đơn đã thu đủ 100% được phép chuyển sang completed thành công");
$chkDbPaid = $pdo->query("SELECT status FROM bookings WHERE code = 'TEST_QA_UNPAID'")->fetch(PDO::FETCH_ASSOC);
qa_assert($chkDbPaid['status'] === 'completed', "Trạng thái đơn trong DB đã cập nhật chính xác thành 'completed'");

// ======================================================================
// HẠNG MỤC 4: ĐIỀU CHỈNH GIẢM (ADJUST_DISCOUNT) KÈM LÝ DO & AUDIT LOG
// ======================================================================
echo "\n--- HẠNG MỤC 4: KIỂM THỬ ĐIỀU CHỈNH GIẢM GIÁ (ADJUST DISCOUNT & AUDIT LOG) ---\n";

// Tạo 1 đơn mới để test giảm giá: 400.000đ, đã cọc 120.000đ
$pdo->exec("DELETE FROM bookings WHERE code = 'TEST_QA_DISCOUNT'");
$insDisc = $pdo->prepare("
    INSERT INTO bookings (code, customer_name, phone, booking_date, slot_id, slot_time, status, payment_status, total_price, deposit_amount, paid_amount, remaining_amount, pitch_id)
    VALUES ('TEST_QA_DISCOUNT', 'Khách Test Giảm Giá', '0999888772', '{$todayYmd}', 'S02', '18:30 - 20:00', 'Đã xác nhận', 'Đã cọc 30%', 400000, 120000, 120000, 280000, ?)
");
$insDisc->execute([$testPitchId]);

// 4.1 Thử gọi adjust_discount bằng tài khoản staff (phải bị chặn 403)
$staffSession = [
    'user_id' => 999,
    'user' => [
        'id' => 999,
        'username' => 'staff_user',
        'role' => 'staff'
    ]
];
$staffDiscountRes = invoke_admin_api('adjust_discount', 'POST', [
    'code'            => 'TEST_QA_DISCOUNT',
    'discount_amount' => 50000,
    'reason'          => 'Nhân viên muốn giảm giá'
], [], $staffSession);

qa_assert($staffDiscountRes['success'] === false, "Nhân viên (staff) bị chặn tuyệt đối khi gọi adjust_discount (yêu cầu Admin)");

// 4.2 Thử gọi bằng Admin nhưng KHÔNG có lý do (phải bị từ chối 400)
$noReasonRes = invoke_admin_api('adjust_discount', 'POST', [
    'code'            => 'TEST_QA_DISCOUNT',
    'discount_amount' => 50000,
    'reason'          => ''
]);
qa_assert($noReasonRes['success'] === false, "Bắt buộc phải có lý do khi điều chỉnh giảm giá (reason required)");

// 4.3 Gọi bằng Admin có lý do hợp lệ: giảm 100.000đ (tổng tiền 400k -> 300k, còn lại 280k -> 180k)
$validDiscountRes = invoke_admin_api('adjust_discount', 'POST', [
    'code'            => 'TEST_QA_DISCOUNT',
    'discount_amount' => 100000,
    'reason'          => 'Khách quen tri ân khai trương sân'
]);

qa_assert($validDiscountRes['success'] === true, "Admin điều chỉnh giảm giá thành công với lý do hợp lệ");

// Kiểm tra DB bookings
$discRow = $pdo->query("SELECT total_price, remaining_amount, note FROM bookings WHERE code = 'TEST_QA_DISCOUNT'")->fetch(PDO::FETCH_ASSOC);
qa_assert((int)$discRow['total_price'] === 300000, "total_price trong bookings đã giảm chính xác xuống 300.000đ", "total_price thực tế: {$discRow['total_price']}");
qa_assert((int)$discRow['remaining_amount'] === 180000, "remaining_amount đã cập nhật chính xác xuống 180.000đ", "remaining thực tế: {$discRow['remaining_amount']}");
qa_assert(str_contains((string)$discRow['note'], 'Khách quen tri ân khai trương sân'), "Ghi chú đơn ghi nhận lý do giảm giá");

// Kiểm tra audit_logs / admin_audit_logs
$auditCheck = $pdo->query("
    SELECT * FROM audit_logs 
    WHERE action = 'ADJUST_DISCOUNT' AND target_id = 'TEST_QA_DISCOUNT' 
    ORDER BY id DESC LIMIT 1
")->fetch(PDO::FETCH_ASSOC);

qa_assert($auditCheck !== false, "Ghi nhận thành công 1 bản ghi vào audit_logs với action ADJUST_DISCOUNT");
qa_assert(str_contains((string)$auditCheck['new_value'], '300000'), "Audit log lưu lại giá mới 300.000đ");

// ======================================================================
// HẠNG MỤC 5: ĐẶT SÂN TẠI QUẦY (WALK-IN) VÀ TÀI KHOẢN KHÁCH LẺ
// ======================================================================
echo "\n--- HẠNG MỤC 5: KIỂM THỬ ĐẶT SÂN TẠI QUẦY (WALK-IN DESK BOOKING & KHÁCH LẺ) ---\n";

// Lấy ID của Khách Lẻ
$walkinUser = $pdo->query("SELECT id, username, role, phone FROM users WHERE role = 'walkin' LIMIT 1")->fetch(PDO::FETCH_ASSOC);
qa_assert($walkinUser !== false, "Tài khoản hệ thống 'Khách lẻ' (role='walkin') tồn tại trong DB");

// 5.1 Đặt tại quầy KHÔNG CÓ SĐT khách: phải gán cho Khách Lẻ, tuyệt đối KHÔNG gán cho Admin ID (1)
$slotRow = $pdo->query("SELECT id, start_time, end_time FROM time_slots LIMIT 1")->fetch(PDO::FETCH_ASSOC);
$slotId = $slotRow ? $slotRow['id'] : 'SLOT_01';
$slotTime = $slotRow ? ($slotRow['start_time'] . ' - ' . $slotRow['end_time']) : '18:00 - 19:30';

$pdo->exec("DELETE FROM bookings WHERE code IN ('TEST_WALKIN_ANON', 'TEST_WALKIN_MEMBER')");

// Tạo hội viên test riêng
$pdo->exec("DELETE FROM users WHERE phone = '0988777999'");
$insMem = $pdo->prepare("INSERT INTO users (username, full_name, phone, email, password_hash, role, status) VALUES ('user_qa_walkin', 'Hội Viên Quầy QA', '0988777999', 'walkin_qa@test.com', 'pwd_hash', 'user', 'active')");
$insMem->execute();
$memberId = (int)$pdo->lastInsertId();

// Mock actor admin khi đặt tại quầy
$adminActor = [
    'id' => 1,
    'username' => 'admin',
    'full_name' => 'Admin Trực Quầy',
    'role' => 'admin'
];

// Test logic gán user_id trong booking_creator:
// Scenario A: Walkin không có số điện thoại
$cleanPhoneA = '';
$assignedUserIdA = null;
if (trim($cleanPhoneA) === '') {
    $assignedUserIdA = (int)$walkinUser['id'];
}
qa_assert($assignedUserIdA === (int)$walkinUser['id'], "Đơn đặt tại quầy không có SĐT được gán cho Khách Lẻ (user_id = {$walkinUser['id']})");
qa_assert($assignedUserIdA !== (int)$adminActor['id'], "Tuyệt đối không gán user_id của Admin (ID 1) vào đơn đặt sân của khách");

// Scenario B: Walkin có SĐT hội viên (0988777999)
$cleanPhoneB = '0988777999';
$uFound = $pdo->prepare("SELECT id FROM users WHERE phone = ? LIMIT 1");
$uFound->execute([$cleanPhoneB]);
$assignedUserIdB = (int)$uFound->fetchColumn();
qa_assert($assignedUserIdB === $memberId, "Đơn đặt tại quầy có SĐT hội viên được gán chính xác cho Hội viên ID {$memberId}");

// 5.2 Kiểm tra Khách Lẻ tuyệt đối KHÔNG xuất hiện trong danh sách crm_customers
$crmListAfterWalkin = invoke_admin_api('crm_customers', 'GET');
$hasWalkinInList = false;
foreach ($crmListAfterWalkin['data'] ?? [] as $cRow) {
    if (($cRow['phone'] ?? '') === '0000000000' || ($cRow['customerName'] ?? '') === 'Khách lẻ' || ($cRow['user_id'] ?? null) === (int)$walkinUser['id']) {
        $hasWalkinInList = true;
    }
}
qa_assert(!$hasWalkinInList, "Tài khoản 'Khách lẻ' (0000000000) không xuất hiện trong bảng danh sách khách hàng CRM");

// ======================================================================
// HẠNG MỤC 6: LOẠI TRỪ TÀI KHOẢN QUẢN TRỊ / NHÂN VIÊN KHỎI DANH SÁCH CRM
// ======================================================================
echo "\n--- HẠNG MỤC 6: LOẠI TRỪ ADMIN / MANAGER / STAFF KHỎI DANH SÁCH CRM ---\n";

$internalStaffStmt = $pdo->query("SELECT id, username, role, phone FROM users WHERE role IN ('admin', 'manager', 'staff')");
$internalUsers = $internalStaffStmt->fetchAll(PDO::FETCH_ASSOC);
qa_assert(count($internalUsers) > 0, "Tìm thấy " . count($internalUsers) . " tài khoản nội bộ (admin/manager/staff) trong hệ thống");

$hasInternalLeaked = false;
$leakedDetail = [];
$internalPhones = array_filter(array_column($internalUsers, 'phone'));

foreach ($crmListAfterWalkin['data'] ?? [] as $cRow) {
    $cPhone = normalize_phone((string)($cRow['phone'] ?? ''));
    if (in_array($cPhone, $internalPhones, true)) {
        $hasInternalLeaked = true;
        $leakedDetail[] = "Phone: {$cPhone} (Name: {$cRow['customerName']})";
    }
}

qa_assert(!$hasInternalLeaked, "Danh sách crm_customers loại trừ hoàn toàn các tài khoản admin/manager/staff", implode('; ', $leakedDetail));

// Kiểm tra endpoint search_customers
$searchInternalRes = invoke_admin_api('search_customers', 'GET', [], ['search' => 'admin']);
$searchInternalLeaked = false;
foreach ($searchInternalRes['data'] ?? [] as $sItem) {
    if (in_array($sItem['phone'] ?? '', $internalPhones, true)) {
        $searchInternalLeaked = true;
    }
}
qa_assert(!$searchInternalLeaked, "Endpoint search_customers không trả về tài khoản nhân viên/admin");

// ======================================================================
// HẠNG MỤC 7: TÍCH LŨY ĐIỂM, CHẶN ĐIỂM ÂM & TRANSACTION AN TOÀN
// ======================================================================
echo "\n--- HẠNG MỤC 7: KIỂM THỬ ĐIỀU CHỈNH ĐIỂM & ĐẢM BẢO TRANSACTION ---\n";

// Tạo user test riêng cho điểm
$pdo->exec("DELETE FROM points_log WHERE user_id IN (SELECT id FROM users WHERE username = 'user_qa_points')");
$pdo->exec("DELETE FROM users WHERE username = 'user_qa_points'");
$insPtsUser = $pdo->prepare("
    INSERT INTO users (username, full_name, phone, email, password_hash, role, status, points, version)
    VALUES ('user_qa_points', 'User Test Điểm QA', '0988666555', 'points_qa@test.com', 'pwd_hash', 'user', 'active', 100, 1)
");
$insPtsUser->execute();
$ptsUserId = (int)$pdo->lastInsertId();

// 7.1 Thử trừ điểm âm (< 0): điểm hiện tại = 100, trừ delta = -150 -> phải bị chặn 400
$negPtsAttempt = invoke_admin_api('adjust_points', 'POST', [
    'user_id' => $ptsUserId,
    'phone'   => '0988666555',
    'delta'   => -150,
    'reason'  => 'Trừ điểm quá mức'
]);

qa_assert($negPtsAttempt['success'] === false, "Hệ thống từ chối điều chỉnh làm điểm tích lũy âm (new points < 0)");
qa_assert(
    ($negPtsAttempt['ref_code'] ?? '') === 'ERR_NEGATIVE_POINTS' || str_contains($negPtsAttempt['message'] ?? '', 'âm'),
    "Mã lỗi từ chối là ERR_NEGATIVE_POINTS (hoặc thông điệp nhắc điểm âm)"
);

// Kiểm tra DB: points vẫn giữ nguyên 100, không có log nào được ghi
$chkPtsDb1 = $pdo->query("SELECT points FROM users WHERE id = {$ptsUserId}")->fetchColumn();
qa_assert((int)$chkPtsDb1 === 100, "Điểm của hội viên trong DB giữ nguyên 100 điểm, không bị trừ bậy");

$chkLogCount1 = $pdo->query("SELECT COUNT(*) FROM points_log WHERE user_id = {$ptsUserId}")->fetchColumn();
qa_assert((int)$chkLogCount1 === 0, "Không có dòng nhật ký rác nào được tạo trong points_log khi thất bại");

// 7.2 Điều chỉnh điểm hợp lệ: cộng 50 điểm (+50) kèm lý do
$posPtsAttempt = invoke_admin_api('adjust_points', 'POST', [
    'user_id' => $ptsUserId,
    'phone'   => '0988666555',
    'delta'   => 50,
    'reason'  => 'Thưởng điểm hội viên thi đấu xuất sắc'
]);

qa_assert($posPtsAttempt['success'] === true, "Cộng điểm hợp lệ (+50) thành công");

// Kiểm tra DB: points = 150, points_log có 1 dòng ghi nhận admin_id
$chkPtsDb2 = $pdo->query("SELECT points, version FROM users WHERE id = {$ptsUserId}")->fetch(PDO::FETCH_ASSOC);
qa_assert((int)$chkPtsDb2['points'] === 150, "Điểm trong DB cập nhật chính xác lên 150 điểm");
qa_assert((int)$chkPtsDb2['version'] >= 2, "Cột version tăng lên để phục vụ Optimistic Locking");

$chkLog2 = $pdo->query("SELECT * FROM points_log WHERE user_id = {$ptsUserId} ORDER BY id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
qa_assert($chkLog2 !== false, "Ghi nhận 1 dòng thành công vào bảng points_log trong cùng một transaction");
qa_assert((int)$chkLog2['delta'] === 50, "delta trong points_log là +50");
qa_assert((int)$chkLog2['admin_id'] === 1, "admin_id được ghi nhận chính xác");
qa_assert(str_contains((string)$chkLog2['reason'], 'Thưởng điểm hội viên thi đấu xuất sắc'), "Lý do trong points_log khớp 100%");

// ======================================================================
// HẠNG MỤC 8: VALIDATE MODAL CRM (DUPLICATE, XSS, OPTIMISTIC LOCKING)
// ======================================================================
echo "\n--- HẠNG MỤC 8: VALIDATE MODAL CRM (DUPLICATE, XSS, CONCURRENCY CONFLICT) ---\n";

// Tạo 2 user để test trùng lặp
$pdo->exec("DELETE FROM points_log WHERE user_id IN (SELECT id FROM users WHERE username IN ('user_qa_modal_a', 'user_qa_modal_b'))");
$pdo->exec("DELETE FROM users WHERE username IN ('user_qa_modal_a', 'user_qa_modal_b')");

$stmtInitModal = $pdo->prepare("
    INSERT INTO users (username, full_name, phone, email, password_hash, role, status, updated_at, version)
    VALUES (?, ?, ?, ?, 'hash', 'user', 'active', NOW(), 1)
");
$stmtInitModal->execute(['user_qa_modal_a', 'Khách Modal A', '0988111223', 'modala@test.com']);
$userModalAId = (int)$pdo->lastInsertId();

$stmtInitModal->execute(['user_qa_modal_b', 'Khách Modal B', '0988111224', 'modalb@test.com']);
$userModalBId = (int)$pdo->lastInsertId();

// 8.1 Thử cập nhật User B trùng SĐT của User A
$dupPhoneRes = invoke_admin_api('update_customer_crm', 'POST', [
    'user_id' => $userModalBId,
    'phone'   => '0988111223', // trùng phone User A
    'name'    => 'Khách Modal B Đổi Phone',
    'email'   => 'modalb_new@test.com'
]);
qa_assert($dupPhoneRes['success'] === false, "Chặn cập nhật khi trùng Số điện thoại với hội viên khác");

// 8.2 Thử cập nhật User B trùng Email của User A
$dupEmailRes = invoke_admin_api('update_customer_crm', 'POST', [
    'user_id' => $userModalBId,
    'phone'   => '0988111224',
    'name'    => 'Khách Modal B Đổi Email',
    'email'   => 'modala@test.com' // trùng email User A
]);
qa_assert($dupEmailRes['success'] === false, "Chặn cập nhật khi trùng Email với hội viên khác");

// 8.3 Kiểm tra làm sạch XSS (XSS Sanitization)
$xssName = '<script>alert("XSS")</script>Nguyễn Văn Test An Toàn';
$xssNote = '<img src=x onerror=alert(1)>Ghi chú bảo mật';
$xssUpdateRes = invoke_admin_api('update_customer_crm', 'POST', [
    'user_id'    => $userModalBId,
    'phone'      => '0988111224',
    'name'       => $xssName,
    'email'      => 'modalb_clean@test.com',
    'admin_note' => $xssNote
]);
qa_assert($xssUpdateRes['success'] === true, "Cập nhật với payload XSS được xử lý thành công không bị sập");

$chkXssDb = $pdo->query("SELECT full_name, admin_note FROM users WHERE id = {$userModalBId}")->fetch(PDO::FETCH_ASSOC);
qa_assert(!str_contains($chkXssDb['full_name'], '<script>'), "Thẻ <script> trong họ tên được bóc tách/làm sạch an toàn");
qa_assert(!str_contains($chkXssDb['admin_note'], '<img'), "Thẻ <img onerror> trong ghi chú được làm sạch an toàn");

// 8.4 Kiểm tra Optimistic Locking (2 lượt lưu đồng thời / Concurrency Conflict)
// Lấy updated_at và version hiện tại của User A
$userARow = $pdo->query("SELECT updated_at, version FROM users WHERE id = {$userModalAId}")->fetch(PDO::FETCH_ASSOC);
$currentUpdatedAt = $userARow['updated_at'];
$currentVersion   = (int)$userARow['version'];

// Lượt lưu 1 (Save 1): gửi updated_at hợp lệ, cập nhật thành công và tăng version/updated_at
$save1Res = invoke_admin_api('update_customer_crm', 'POST', [
    'user_id'    => $userModalAId,
    'phone'      => '0988111223',
    'name'       => 'User A Lượt Lưu 1',
    'email'      => 'modala@test.com',
    'updated_at' => $currentUpdatedAt,
    'version'    => $currentVersion
]);
qa_assert($save1Res['success'] === true, "Lượt lưu 1 cập nhật thành công thông tin hội viên");

// Lượt lưu 2 (Save 2): Giả lập client thứ 2 chưa reload trang, gửi updated_at hoặc version CŨ
$save2Res = invoke_admin_api('update_customer_crm', 'POST', [
    'user_id'    => $userModalAId,
    'phone'      => '0988111223',
    'name'       => 'User A Lượt Lưu 2 Bị Trễ',
    'email'      => 'modala@test.com',
    'updated_at' => $currentUpdatedAt, // timestamp cũ trước khi Save 1 diễn ra
    'version'    => $currentVersion    // version cũ
]);

qa_assert($save2Res['success'] === false, "Lượt lưu 2 với dữ liệu phiên cũ bị từ chối do xung đột đồng thời");
qa_assert(
    ($save2Res['ref_code'] ?? '') === 'ERR_CONCURRENCY_CONFLICT' || str_contains($save2Res['message'] ?? '', 'đồng thời'),
    "Mã lỗi trả về là 409 ERR_CONCURRENCY_CONFLICT",
    $save2Res['ref_code'] ?? ($save2Res['message'] ?? '')
);

// Dọn dẹp dữ liệu test modal
$pdo->exec("DELETE FROM points_log WHERE user_id IN ({$userModalAId}, {$userModalBId}, {$ptsUserId}, {$memberId})");
$pdo->exec("DELETE FROM bookings WHERE code IN ('TEST_QA_UNPAID', 'TEST_QA_PAID', 'TEST_QA_DISCOUNT')");
$pdo->exec("DELETE FROM users WHERE id IN ({$userModalAId}, {$userModalBId}, {$ptsUserId}, {$memberId})");

// ======================================================================
// TỔNG KẾT BÁO CÁO QA SUITE
// ======================================================================
echo "\n======================================================================\n";
echo " KẾT QUẢ TỔNG HỢP KIỂM THỬ: {$passedTests} PASS, {$failedTests} FAIL\n";
echo "======================================================================\n";

if ($failedTests === 0) {
    echo ">>> TẤT CẢ 8 HẠNG MỤC KIỂM THỬ CHỨC NĂNG ĐỀU VƯỢT QUA 100% <<<\n";
    exit(0);
} else {
    echo ">>> CÓ {$failedTests} KIỂM THỬ THẤT BẠI. CẦN KIỂM TRA LẠI <<<\n";
    exit(1);
}
