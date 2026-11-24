<?php
/**
 * Test Suite: Luồng đặt sân khách & Bảo mật thông tin người đặt (9 Kịch bản bắt buộc)
 */

require_once __DIR__ . '/../api/security_helper.php';
require_once __DIR__ . '/../api/notification_helper.php';
require_once __DIR__ . '/../api/services/totp_turnstile_helper.php';
require_once __DIR__ . '/../api/services/booking_creator.php';
require_once __DIR__ . '/../api/services/booking_operations.php';

$pdo = getDBConnection(false);
if (!$pdo) {
    echo "LỖI: Không thể kết nối cơ sở dữ liệu MySQL.\n";
    exit(1);
}

$passCount = 0;
$failCount = 0;

function assertTest(bool $condition, string $title, string $detail = '') {
    global $passCount, $failCount;
    if ($condition) {
        $passCount++;
        echo "  [PASS] {$title}\n";
    } else {
        $failCount++;
        echo "  [FAIL] {$title}" . ($detail ? " -> {$detail}" : "") . "\n";
    }
}

function callBookingApi(?array $session, string $method = 'POST', array $payload = []): array {
    $php = (defined('PHP_BINARY') && PHP_BINARY) ? PHP_BINARY : 'C:\\laragon\\bin\\php\\php-8.3.36-Win32-vs16-x64\\php.exe';
    $runner = __DIR__ . '/run_booking_action.php';
    $input = base64_encode(json_encode([
        'session' => $session,
        'method'  => $method,
        'payload' => $payload
    ]));
    $cmd = "\"{$php}\" \"{$runner}\" \"{$input}\"";
    $output = shell_exec($cmd);
    $decoded = json_decode((string)$output, true);
    return is_array($decoded) ? $decoded : ['raw' => $output];
}

echo "=== BẮT ĐẦU KIỂM THỬ 9 KỊCH BẢN BẮT BUỘC ===\n\n";

// Chuẩn bị dữ liệu test: Customer A, Customer B, Admin
try {
    // Tạo hoặc lấy User A (khách hàng)
    $stmtA = $pdo->prepare("SELECT * FROM users WHERE email = 'test_cust_a@sanbongpro.vn' LIMIT 1");
    $stmtA->execute();
    $userA = $stmtA->fetch(PDO::FETCH_ASSOC);
    if (!$userA) {
        $pdo->prepare("INSERT INTO users (username, email, password_hash, full_name, phone, role, status) VALUES ('cust_a', 'test_cust_a@sanbongpro.vn', 'hash', 'Nguyễn Văn A', '0987654321', 'user', 'active')")->execute();
        $userAId = (int)$pdo->lastInsertId();
    } else {
        $userAId = (int)$userA['id'];
        $pdo->prepare("UPDATE users SET full_name = 'Nguyễn Văn A', phone = '0987654321', role = 'user', status = 'active' WHERE id = ?")->execute([$userAId]);
    }

    // Tạo hoặc lấy User B (khách hàng khác)
    $stmtB = $pdo->prepare("SELECT * FROM users WHERE email = 'test_cust_b@sanbongpro.vn' LIMIT 1");
    $stmtB->execute();
    $userB = $stmtB->fetch(PDO::FETCH_ASSOC);
    if (!$userB) {
        $pdo->prepare("INSERT INTO users (username, email, password_hash, full_name, phone, role, status) VALUES ('cust_b', 'test_cust_b@sanbongpro.vn', 'hash', 'Trần Thị B', '0911223344', 'user', 'active')")->execute();
        $userBId = (int)$pdo->lastInsertId();
    } else {
        $userBId = (int)$userB['id'];
        $pdo->prepare("UPDATE users SET full_name = 'Trần Thị B', phone = '0911223344', role = 'user', status = 'active' WHERE id = ?")->execute([$userBId]);
    }

    // Tạo hoặc lấy Admin user
    $stmtAdmin = $pdo->prepare("SELECT * FROM users WHERE role = 'admin' AND status = 'active' LIMIT 1");
    $stmtAdmin->execute();
    $adminUser = $stmtAdmin->fetch(PDO::FETCH_ASSOC);

    // Lấy một sân bóng còn hoạt động để test
    $pitchStmt = $pdo->query("SELECT id FROM pitches WHERE status != 'Bảo trì' LIMIT 1");
    $pitchId = $pitchStmt->fetchColumn() ?: 'P5-A';

    // Ngày đá
    $testDate = date('Y-m-d', strtotime('+3 days'));
    $testSlotId = 'S02';
    // Dọn dẹp rate limit & đơn cũ của số test
    clear_rate_limit($pdo, 'create_booking');
    clear_rate_limit($pdo, 'create_booking_phone', '0987654321');
    clear_rate_limit($pdo, 'create_booking_phone', '0911223344');
    clear_rate_limit($pdo, 'create_booking_phone', '0933445566');
    $pdo->prepare("DELETE FROM bookings WHERE phone IN ('0987654321', '0911223344', '0933445566') OR code LIKE 'TEST-%'")->execute();
} catch (Throwable $e) {
    echo "Lỗi thiết lập dữ liệu test: " . $e->getMessage() . "\n";
    exit(1);
}

// -------------------------------------------------------------
// TEST 1: Khách CHƯA đăng nhập: mở /booking -> mục 4 KHÔNG xuất hiện (hidden). Nút đổi thành "Đăng nhập để đặt sân".
echo "--- Test 1: Khách CHƯA đăng nhập trên /booking ---\n";
$htmlBooking = file_get_contents(__DIR__ . '/../html/booking.html');
$hasHiddenStep4 = (strpos($htmlBooking, 'id="booking-step4-card" class="ui-card p-5 sm:p-6 space-y-4 hidden"') !== false);
$hasSummaryReminder = (strpos($htmlBooking, 'id="summary-login-reminder"') !== false);
$hasProceedBtn = (strpos($htmlBooking, 'id="proceed-checkout-btn"') !== false);

assertTest($hasHiddenStep4, "1.1 Mục 4 ẩn mặc định trong HTML (class='hidden') cho khách chưa đăng nhập");
assertTest($hasSummaryReminder, "1.2 Khung tóm tắt có phần tử nhắc nhở đăng nhập #summary-login-reminder");
assertTest($hasProceedBtn, "1.3 Nút tiếp tục checkout có sẵn trong giao diện");

// -------------------------------------------------------------
// TEST 2: Khách CHƯA đăng nhập gửi API create_booking -> trả 401
echo "\n--- Test 2: Khách CHƯA đăng nhập gửi API create_booking ---\n";
$unauthPayload = [
    'privacy_consent' => 1,
    'pitch_id' => $pitchId,
    'date' => $testDate,
    'slot_id' => $testSlotId,
    'customerName' => 'Khách Vãng Lai',
    'phone' => '0988776655'
];

$res2 = callBookingApi(null, 'POST', $unauthPayload);
$is401 = (isset($res2['success']) && $res2['success'] === false && ($res2['ref_code'] ?? '') === 'ERR_UNAUTHORIZED');
assertTest($is401, "2.1 Khách chưa đăng nhập gửi create_booking bị chặn HTTP 401 ERR_UNAUTHORIZED");

// -------------------------------------------------------------
// TEST 3: Khách A đăng nhập: mục 4 hiện thẻ tóm tắt đúng tên/SĐT của A. Đặt sân: đơn mang thông tin A, điểm cộng cho A.
echo "\n--- Test 3: Khách A đăng nhập & đặt sân cho mình ---\n";
$sessionA = [
    'user_id' => $userAId,
    'user' => [
        'id' => $userAId,
        'username' => 'cust_a',
        'full_name' => 'Nguyễn Văn A',
        'phone' => '0987654321',
        'role' => 'user'
    ]
];

$_SESSION = $sessionA;
$custAInfo = currentCustomer($pdo);
assertTest($custAInfo !== null && (int)$custAInfo['id'] === $userAId, "3.1 currentCustomer() trả về đúng thông tin Khách A");
assertTest($custAInfo['full_name'] === 'Nguyễn Văn A' && $custAInfo['phone'] === '0987654321', "3.2 Tên và SĐT của Khách A chuẩn xác từ server");

$bookingCodeA = 'TEST-A-' . time();
$payloadA = [
    'code' => $bookingCodeA,
    'privacy_consent' => 1,
    'pitch_id' => $pitchId,
    'date' => $testDate,
    'slot_id' => 'S01',
    'customerName' => 'Kẻ mạo danh', // Client gửi tên khác -> Server phải BỎ QUA
    'phone' => '0999999999'           // Client gửi SĐT khác -> Server phải BỎ QUA
];

$data3 = callBookingApi($sessionA, 'POST', $payloadA);
$bCodeA = $data3['data']['code'] ?? '';
$bStmtA = $pdo->prepare("SELECT * FROM bookings WHERE code = ? LIMIT 1");
$bStmtA->execute([$bCodeA]);
$savedRowA = $bStmtA->fetch(PDO::FETCH_ASSOC);

assertTest($savedRowA && (int)$savedRowA['user_id'] === $userAId, "3.3 Đơn đặt sân mang đúng user_id của Khách A");
assertTest($savedRowA && $savedRowA['customer_name'] === 'Nguyễn Văn A', "3.4 Tên trên đơn lấy từ hồ sơ Khách A (bỏ qua tên mạo danh client gửi)");
assertTest($savedRowA && $savedRowA['phone'] === '0987654321', "3.5 SĐT trên đơn lấy từ hồ sơ Khách A (bỏ qua SĐT client gửi)");

// Thử cộng điểm cho đơn A
if ($savedRowA) {
    $updA = $pdo->prepare("UPDATE bookings SET paid_amount = 300000, payment_status = 'Đã cọc 30%' WHERE id = ?");
    $updA->execute([(int)$savedRowA['id']]);
    $savedRowA['paid_amount'] = 300000;
    $savedRowA['payment_status'] = 'Đã cọc 30%';
    award_booking_loyalty_points($pdo, $savedRowA);

    $ptsStmt = $pdo->prepare("SELECT * FROM points_log WHERE booking_id = ? LIMIT 1");
    $ptsStmt->execute([(int)$savedRowA['id']]);
    $ptsRowA = $ptsStmt->fetch(PDO::FETCH_ASSOC);
    assertTest($ptsRowA && (int)$ptsRowA['user_id'] === $userAId, "3.6 Điểm thưởng (points_log) gắn chính xác với user_id của Khách A");
}

// -------------------------------------------------------------
// TEST 4: Khách B đăng nhập trên trình duyệt khác: KHÔNG thấy thông tin A
echo "\n--- Test 4: Khách B đăng nhập độc lập ---\n";
$sessionB = [
    'user_id' => $userBId,
    'user' => [
        'id' => $userBId,
        'username' => 'cust_b',
        'full_name' => 'Trần Thị B',
        'phone' => '0911223344',
        'role' => 'user'
    ]
];

$_SESSION = $sessionB;
$custBInfo = currentCustomer($pdo);
assertTest($custBInfo !== null && (int)$custBInfo['id'] === $userBId, "4.1 Session B trả về Khách B");
assertTest($custBInfo['full_name'] === 'Trần Thị B' && $custBInfo['phone'] === '0911223344', "4.2 Thông tin B hoàn toàn cách ly, không thấy thông tin của A");

// -------------------------------------------------------------
// TEST 5: Admin đăng nhập portal: mở /booking KHÔNG tự biến thành khách đặt sân
echo "\n--- Test 5: Admin đăng nhập portal mở /booking ---\n";
$sessionAdmin = [
    'user_id' => (int)$adminUser['id'],
    'user' => [
        'id' => (int)$adminUser['id'],
        'username' => $adminUser['username'],
        'full_name' => $adminUser['full_name'] ?? 'Admin Quản Trị',
        'role' => 'admin'
    ]
];

$_SESSION = $sessionAdmin;
$custFromAdmin = currentCustomer($pdo);
assertTest($custFromAdmin === null, "5.1 currentCustomer() trả về NULL khi người đăng nhập là Admin portal");

$data5 = callBookingApi($sessionAdmin, 'POST', [
    'privacy_consent' => 1,
    'pitch_id' => $pitchId,
    'date' => $testDate,
    'slot_id' => 'S03',
    'customerName' => 'Admin Test',
    'phone' => '0900000000'
]);
$isBlockedAdmin = (isset($data5['success']) && $data5['success'] === false && in_array($data5['ref_code'] ?? '', ['ERR_FORBIDDEN', 'ERR_UNAUTHORIZED'], true));
assertTest($isBlockedAdmin, "5.2 Admin gọi create_booking trên trang khách bị từ chối 403 ERR_FORBIDDEN (không tự biến thành khách)");

// -------------------------------------------------------------
// TEST 6: Đã gỡ bỏ hoàn toàn phần Đặt hộ bạn bè & giữ nguyên xử lý tài khoản thiếu SĐT + giao diện checkout/login
echo "\n--- Test 6: Kiểm tra gỡ đặt hộ bạn bè, checkout & matchmaking login ---\n";
$jsBookingSrc = file_get_contents(__DIR__ . '/../js/booking.js');
$jsBookingUISrc = file_get_contents(__DIR__ . '/../js/booking_ui.js');
$htmlCheckout = file_get_contents(__DIR__ . '/../html/checkout.html');
$jsCheckout = file_get_contents(__DIR__ . '/../js/checkout.js');
$jsMatchmaking = file_get_contents(__DIR__ . '/../js/matchmaking.js');
$jsLoginSrc = file_get_contents(__DIR__ . '/../js/login.js');

$noFriendHtml = (strpos($htmlBooking, 'id="btn-toggle-friend"') === false)
    && (strpos($htmlBooking, 'id="booking-friend-mode-alert"') === false)
    && (strpos($htmlBooking, 'id="booking-input-fields-wrap"') === false)
    && (strpos($htmlBooking, 'id="booking-missing-phone-wrap"') !== false);
assertTest($noFriendHtml, "6.1 html/booking.html đã xóa đặt hộ bạn bè và giữ nguyên #booking-missing-phone-wrap");

$noFriendJs = (strpos($jsBookingSrc, 'isBookingForFriend') === false)
    && (strpos($jsBookingSrc, 'toggleBookingForFriend') === false)
    && (strpos($jsBookingUISrc, 'isBookingForFriend') === false)
    && (strpos($jsBookingUISrc, 'toggleBookingForFriend') === false);
assertTest($noFriendJs, "6.2 js/booking.js & js/booking_ui.js đã dọn sạch logic đặt hộ bạn bè");

// Tài khoản thiếu SĐT đặt sân -> lưu SĐT hợp lệ và vẫn gán đúng user_id
$pdo->prepare("UPDATE users SET phone = '' WHERE id = ?")->execute([$userBId]);
$sessionBNoPhone = [
    'user_id' => $userBId,
    'user' => [
        'id' => $userBId,
        'username' => 'cust_b',
        'full_name' => 'Trần Thị B',
        'phone' => '',
        'role' => 'user'
    ]
];
$payloadMissingPhone = [
    'code' => 'TEST-NP-' . time(),
    'privacy_consent' => 1,
    'pitch_id' => $pitchId,
    'date' => $testDate,
    'slot_id' => 'S04',
    'phone' => '0933445566'
];
$data6 = callBookingApi($sessionBNoPhone, 'POST', $payloadMissingPhone);
$bCodeNP = $data6['data']['code'] ?? '';
$bStmtNP = $pdo->prepare("SELECT * FROM bookings WHERE code = ? LIMIT 1");
$bStmtNP->execute([$bCodeNP]);
$savedRowNP = $bStmtNP->fetch(PDO::FETCH_ASSOC);
$pdo->prepare("UPDATE users SET phone = '0911223344' WHERE id = ?")->execute([$userBId]);

assertTest($savedRowNP && (int)$savedRowNP['user_id'] === $userBId && $savedRowNP['phone'] === '0933445566', "6.3 Tài khoản thiếu SĐT bổ sung SĐT khi đặt sân hoạt động chính xác");

$noGuestLoginCheckout = (strpos($htmlCheckout, 'guest-login-checkout-btn') === false)
    && (strpos($jsCheckout, 'guest-login-checkout-btn') === false);
assertTest($noGuestLoginCheckout, "6.4 Đã xóa nút #guest-login-checkout-btn khỏi checkout.html & checkout.js");

$matchmakingLoginClean = (strpos($jsMatchmaking, 'ensureMatchmakingAuthenticated') !== false)
    && (strpos($jsLoginSrc, "redirectBase === 'matchmaking'") !== false)
    && (strpos($jsLoginSrc, 'Vui lòng đăng nhập tài khoản để tham gia bắt kèo / đăng tin giao lưu.') !== false);
assertTest($matchmakingLoginClean, "6.5 Matchmaking & login xử lý redirect=matchmaking không gắn nhầm expired=1 cho khách chưa đăng nhập");

// -------------------------------------------------------------
// TEST 7: Thử mạo danh (IDOR): A đăng nhập nhưng gửi user_id của B -> server BỎ QUA, vẫn gán cho A
echo "\n--- Test 7: Chống mạo danh IDOR ---\n";
$bookingCodeIDOR = 'TEST-IDOR-' . time();
$payloadIDOR = [
    'code' => $bookingCodeIDOR,
    'privacy_consent' => 1,
    'pitch_id' => $pitchId,
    'date' => $testDate,
    'slot_id' => 'S05',
    'user_id' => $userBId, // CỐ TÌNH GỬI ID CỦA B
    'userId'  => $userBId
];

$data7 = callBookingApi($sessionA, 'POST', $payloadIDOR);
$bCodeIDOR = $data7['data']['code'] ?? '';
$bStmtIDOR = $pdo->prepare("SELECT user_id FROM bookings WHERE code = ? LIMIT 1");
$bStmtIDOR->execute([$bCodeIDOR]);
$savedUserId = (int)$bStmtIDOR->fetchColumn();

assertTest($savedUserId === $userAId, "7.1 Server bỏ qua user_id client gửi lên, gán đúng user_id của Khách A ({$userAId} != {$userBId})");

// -------------------------------------------------------------
// TEST 8: Áp mã voucher: mã hợp lệ giảm đúng, mã hết hạn/không đủ điều kiện báo lỗi rõ
echo "\n--- Test 8: Kiểm tra Voucher hợp lệ & hết hạn ---\n";
$pdo->prepare("REPLACE INTO vouchers (code, description, discount_type, discount_value, min_order, valid_from, valid_to, is_active, max_usage, used_count) VALUES ('TEST_EXPIRED', 'Voucher hết hạn', 'percent', 10, 0, '2020-01-01', '2021-01-01', 1, 100, 0)")->execute();
$pdo->prepare("REPLACE INTO vouchers (code, description, discount_type, discount_value, min_order, valid_from, valid_to, is_active, max_usage, used_count) VALUES ('TEST_VALID10', 'Voucher hợp lệ', 'percent', 10, 0, '2025-01-01', '2027-01-01', 1, 100, 0)")->execute();

// Thử voucher hết hạn
$payloadExpVoucher = [
    'privacy_consent' => 1,
    'pitch_id' => $pitchId,
    'date' => $testDate,
    'slot_id' => 'S06',
    'voucherCode' => 'TEST_EXPIRED'
];
$data8a = callBookingApi($sessionA, 'POST', $payloadExpVoucher);
$voucherExpiredBlocked = (isset($data8a['success']) && $data8a['success'] === false && ($data8a['ref_code'] ?? '') === 'ERR_INVALID_VOUCHER');
assertTest($voucherExpiredBlocked, "8.1 Mã voucher hết hạn bị server từ chối với lỗi rõ ràng (ERR_INVALID_VOUCHER)");

// Thử voucher hợp lệ
$payloadValidVoucher = [
    'privacy_consent' => 1,
    'pitch_id' => $pitchId,
    'date' => $testDate,
    'slot_id' => 'S07',
    'voucherCode' => 'TEST_VALID10'
];
$data8b = callBookingApi($sessionA, 'POST', $payloadValidVoucher);
$voucherValidAccepted = (isset($data8b['success']) && $data8b['success'] === true && !empty($data8b['data']['voucherCode']));
assertTest($voucherValidAccepted, "8.2 Mã voucher hợp lệ được chấp nhận và áp dụng vào đơn");

// Kiểm tra compute_server_booking_quote với CUOITUAN100K (min_order 900k)
require_once __DIR__ . '/../api/services/booking_quote_service.php';
$p11Id = $pdo->query("SELECT id FROM pitches WHERE type = 11 AND status != 'Bảo trì' LIMIT 1")->fetchColumn() ?: 'P11-A';
$qTooLow = compute_server_booking_quote($pdo, [
    'pitchId' => 'P5-A',
    'date' => $testDate,
    'slotId' => 'S02',
    'voucherCode' => 'CUOITUAN100K',
    'userId' => $userAId
], false);
assertTest(
    empty($qTooLow['appliedVoucher']) && strpos((string)($qTooLow['voucherError'] ?? ''), 'tối thiểu') !== false,
    "8.3 Quote báo rõ thiếu giá trị tối thiểu khi đơn < 900.000đ cho CUOITUAN100K"
);

$qEligible = compute_server_booking_quote($pdo, [
    'pitchId' => $p11Id,
    'date' => $testDate,
    'slotId' => 'S02',
    'voucherCode' => 'CUOITUAN100K',
    'userId' => $userAId
], false);
assertTest(
    ($qEligible['appliedVoucher'] ?? '') === 'CUOITUAN100K' && (int)($qEligible['voucherDiscountAmount'] ?? 0) === 100000,
    "8.4 Quote áp dụng đúng CUOITUAN100K (-100.000đ) khi đơn >= 900.000đ"
);

// -------------------------------------------------------------
// TEST 9: Đang chọn dở sân/ngày/ca mà bấm đăng nhập -> đăng nhập xong quay lại đúng trạng thái đã chọn
echo "\n--- Test 9: Giữ nguyên trạng thái lựa chọn sau đăng nhập ---\n";
$jsBookingUI = file_get_contents(__DIR__ . '/../js/booking_ui.js');
$jsBooking = file_get_contents(__DIR__ . '/../js/booking.js');
$jsLogin = file_get_contents(__DIR__ . '/../js/login.js');

$hasDraftRestore = (strpos($jsBookingUI, 'sessionStorage.getItem(\'sb_booking_draft\')') !== false);
$hasSaveDraft = (strpos($jsBooking, 'saveCurrentBookingDraft()') !== false);
$hasLoginRedirect = (strpos($jsLogin, 'redirectParam') !== false && strpos($jsLogin, 'ALLOWED.has(baseRoute)') !== false);

assertTest($hasDraftRestore, "9.1 js/booking_ui.js khôi phục sân/ngày/ca/dịch vụ từ draft trong sessionStorage");
assertTest($hasSaveDraft, "9.2 js/booking.js tự động lưu draft trước khi chuyển hướng đăng nhập");
assertTest($hasLoginRedirect, "9.3 js/login.js cho phép chuyển hướng an toàn về 'booking' sau khi đăng nhập");

// Dọn dẹp dữ liệu test
$pdo->prepare("DELETE FROM points_log WHERE user_id IN ({$userAId}, {$userBId})")->execute();
$pdo->prepare("DELETE FROM bookings WHERE user_id IN ({$userAId}, {$userBId}) OR code LIKE 'TEST-%'")->execute();
$pdo->prepare("DELETE FROM vouchers WHERE code IN ('TEST_EXPIRED', 'TEST_VALID10')")->execute();

echo "\n=== KẾT QUẢ KIỂM THỬ: {$passCount} ĐẠT / " . ($passCount + $failCount) . " TEST ===\n";
if ($failCount === 0) {
    echo "=> TẤT CẢ 9 KỊCH BẢN BẮT BUỘC ĐẠT 100% PASS!\n";
    exit(0);
} else {
    echo "=> CÒN {$failCount} TEST THẤT BẠI.\n";
    exit(1);
}
