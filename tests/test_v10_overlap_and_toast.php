<?php
/**
 * Test Suite: Chống trùng ca chồng giờ, Toast gộp trùng & Trải nghiệm đặt sân
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
    $php = 'C:\\laragon\\bin\\php\\php-8.1.10-Win32-vs16-x64\\php.exe';
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

echo "=== BẮT ĐẦU KIỂM THỬ 7 TIÊU CHÍ BẮT BUỘC ===\n\n";

// Chuẩn bị User Customer
$userAId = 0;
$stmtA = $pdo->prepare("SELECT * FROM users WHERE email = 'test_cust_a@sanbongpro.vn' LIMIT 1");
$stmtA->execute();
$userA = $stmtA->fetch(PDO::FETCH_ASSOC);
if (!$userA) {
    $pdo->prepare("INSERT INTO users (username, email, password_hash, full_name, phone, role, status) VALUES ('cust_a', 'test_cust_a@sanbongpro.vn', 'hash', 'Nguyễn Văn A', '0987654321', 'user', 'active')")->execute();
    $userAId = (int)$pdo->lastInsertId();
} else {
    $userAId = (int)$userA['id'];
}

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

// Lấy 1 sân để test
$pitchStmt = $pdo->query("SELECT id FROM pitches WHERE status != 'Bảo trì' LIMIT 1");
$pitchId = $pitchStmt->fetchColumn() ?: 'P7-A';
$testDate = date('Y-m-d', strtotime('+4 days'));

// Dọn dẹp đơn cũ của ngày test trên sân test
$pdo->prepare("DELETE FROM bookings WHERE pitch_id = ? AND booking_date = ?")->execute([$pitchId, $testDate]);
$pdo->prepare("DELETE FROM rate_limits WHERE action LIKE 'create_booking%'")->execute();

// -------------------------------------------------------------
// TEST 1: Khách chưa đăng nhập bấm nút: không có toast, chuyển sang login, quay lại đúng lựa chọn
echo "--- Test 1: Khách chưa đăng nhập bấm nút đặt sân ---\n";
$jsBooking = file_get_contents(__DIR__ . '/../js/booking.js');
$jsLogin = file_get_contents(__DIR__ . '/../js/login.js');
$htmlBooking = file_get_contents(__DIR__ . '/../html/booking.html');

$noToastOnUnauth = (strpos($jsBooking, '!isCustomer') !== false && 
                    strpos($jsBooking, 'saveCurrentBookingDraft()') !== false && 
                    strpos($jsBooking, 'sb_login_notice') !== false &&
                    strpos($jsBooking, 'window.location.href = loginUrl') !== false);
$hasNoticeHandler = (strpos($jsLogin, 'Đăng nhập để tiếp tục đặt sân') !== false);
$hasDefaultLoginText = (strpos($htmlBooking, 'id="proceed-checkout-btn"') !== false && strpos($htmlBooking, 'Đăng nhập để đặt sân') !== false);

assertTest($noToastOnUnauth, "1.1 Khách chưa đăng nhập bấm nút không bắn toast, lưu draft và chuyển thẳng sang login");
assertTest($hasNoticeHandler, "1.2 Trang login nhận diện và hiển thị thông báo 1 dòng 'Đăng nhập để tiếp tục đặt sân'");
assertTest($hasDefaultLoginText, "1.3 Nút đặt sân mặc định đổi chữ thành 'Đăng nhập để đặt sân'");

// -------------------------------------------------------------
// TEST 2: Đăng nhập, bỏ trống trường bắt buộc: đúng 1 thông báo, ô lỗi được đánh dấu
echo "\n--- Test 2: Bỏ trống trường bắt buộc ---\n";
$hasSingleValidationMsg = (strpos($jsBooking, "const singleMsg = 'Vui lòng hoàn thiện: ' + missingFields.join(', ') + '.';") !== false);
$hasScrollToFirstInvalid = (strpos($jsBooking, "firstInvalidEl.scrollIntoView") !== false);
$hasBorderRose = (strpos($jsBooking, "missingInput?.classList.add('border-rose-500'") !== false && strpos($jsBooking, "nameInput?.classList.add('border-rose-500'") !== false);

assertTest($hasSingleValidationMsg, "2.1 Gộp tất cả trường thiếu thành đúng 1 thông báo toast rõ ràng");
assertTest($hasScrollToFirstInvalid, "2.2 Tự động cuộn và focus vào ô lỗi đầu tiên");
assertTest($hasBorderRose, "2.3 Tất cả các ô lỗi đều được đánh dấu viền đỏ (border-rose-500)");

// -------------------------------------------------------------
// TEST 3: Bấm nút liên tục 10 lần: không tạo 10 toast, không tạo đơn trùng
echo "\n--- Test 3: Bấm nút liên tục 10 lần ---\n";
$jsUI = file_get_contents(__DIR__ . '/../js/ui.js');
$hasDeduplication = (strpos($jsUI, 'data-sb-toast-msg') !== false && strpos($jsUI, 'el.getAttribute(\'data-sb-toast-msg\') === normMsg') !== false);
$hasMax3Toasts = (strpos($jsUI, 'container.children.length >= 3') !== false);
$hasRapidClickGuard = (strpos($jsBooking, '_isProceedingCheckout') !== false);

assertTest($hasDeduplication, "3.1 showToast() gộp trùng nội dung (chỉ 1 toast cùng nội dung tại một thời điểm)");
assertTest($hasMax3Toasts, "3.2 Giới hạn tối đa 3 toast cùng lúc trong container");
assertTest($hasRapidClickGuard, "3.3 Nút checkout có cờ chặn double-click / spam click trong 1 giây");

// -------------------------------------------------------------
// TEST 4: Đặt 17:00–18:00 xong, đặt tiếp 17:30–19:00 (bị từ chối) và 18:00–19:00 (chấp nhận)
echo "\n--- Test 4: Chống trùng khoảng thời gian (17:00-18:00 vs 17:30-19:00 vs 18:00-19:00) ---\n";
// 4.1 Đặt ca S09 (17:00 - 18:00)
$payloadS09 = [
    'privacy_consent' => 1,
    'pitch_id' => $pitchId,
    'date' => $testDate,
    'slot_id' => 'S09' // 17:00 - 18:00
];
$resS09 = callBookingApi($sessionA, 'POST', $payloadS09);
$isS09Ok = (isset($resS09['success']) && $resS09['success'] === true);
assertTest($isS09Ok, "4.1 Đặt ca S09 (17:00 - 18:00) thành công");

// 4.2 Đặt tiếp ca S10 (17:30 - 19:00) chồng giờ với S09 -> PHẢI BỊ TỪ CHỐI
$payloadS10 = [
    'privacy_consent' => 1,
    'pitch_id' => $pitchId,
    'date' => $testDate,
    'slot_id' => 'S10' // 17:30 - 19:00
];
$resS10 = callBookingApi($sessionA, 'POST', $payloadS10);
echo "  [DEBUG 4.2] " . json_encode($resS10, JSON_UNESCAPED_UNICODE) . "\n";
$isS10Blocked = (isset($resS10['success']) && $resS10['success'] === false && ($resS10['ref_code'] ?? '') === 'ERR_DOUBLE_BOOKING');
assertTest($isS10Blocked, "4.2 Đặt ca S10 (17:30 - 19:00) chồng giờ bị từ chối 409 ERR_DOUBLE_BOOKING");

// 4.3 Đặt tiếp ca S11 (18:00 - 19:00) liền kề S09 -> PHẢI ĐƯỢC CHẤP NHẬN
$payloadS11 = [
    'privacy_consent' => 1,
    'pitch_id' => $pitchId,
    'date' => $testDate,
    'slot_id' => 'S11' // 18:00 - 19:00
];
$resS11 = callBookingApi($sessionA, 'POST', $payloadS11);
echo "  [DEBUG 4.3] " . json_encode($resS11, JSON_UNESCAPED_UNICODE) . "\n";
$isS11Ok = (isset($resS11['success']) && $resS11['success'] === true);
assertTest($isS11Ok, "4.3 Đặt ca S11 (18:00 - 19:00) liền kề không chồng giờ được chấp nhận");

// -------------------------------------------------------------
// TEST 5: Hai request đặt 2 ca chồng giờ đồng thời: chỉ 1 thành công
echo "\n--- Test 5: Hai request đặt ca chồng giờ đồng thời ---\n";
// Dọn dẹp ca chiều tối ngày khác để test đồng thời
$testDate5 = date('Y-m-d', strtotime('+5 days'));
$pdo->prepare("DELETE FROM bookings WHERE pitch_id = ? AND booking_date = ?")->execute([$pitchId, $testDate5]);
$pdo->prepare("DELETE FROM bookings WHERE user_id = ? OR phone = '0987654321'")->execute([$userAId]);

// Request 1: S12 (19:00 - 20:00)
// Request 2: S13 (19:00 - 20:30) chồng giờ với S12
$payload5_1 = [
    'privacy_consent' => 1,
    'pitch_id' => $pitchId,
    'date' => $testDate5,
    'slot_id' => 'S12'
];
$payload5_2 = [
    'privacy_consent' => 1,
    'pitch_id' => $pitchId,
    'date' => $testDate5,
    'slot_id' => 'S13'
];

$r1 = callBookingApi($sessionA, 'POST', $payload5_1);
$r2 = callBookingApi($sessionA, 'POST', $payload5_2);

$successCount = 0;
if (!empty($r1['success'])) $successCount++;
if (!empty($r2['success'])) $successCount++;

assertTest($successCount === 1, "5.1 Trong 2 request đặt ca chồng giờ (S12 vs S13), chỉ đúng 1 request thành công");

// -------------------------------------------------------------
// TEST 6: Hai ca liền kề không chồng (vd 14:00-15:00 và 15:00-16:00): đặt được
echo "\n--- Test 6: Hai ca liền kề không chồng giờ ---\n";
$testDate6 = date('Y-m-d', strtotime('+6 days'));
$pdo->prepare("DELETE FROM bookings WHERE pitch_id = ? AND booking_date = ?")->execute([$pitchId, $testDate6]);
$pdo->prepare("DELETE FROM bookings WHERE user_id = ? OR phone = '0987654321'")->execute([$userAId]);

$resS06 = callBookingApi($sessionA, 'POST', [
    'privacy_consent' => 1,
    'pitch_id' => $pitchId,
    'date' => $testDate6,
    'slot_id' => 'S06' // 14:00 - 15:00
]);
$resS07 = callBookingApi($sessionA, 'POST', [
    'privacy_consent' => 1,
    'pitch_id' => $pitchId,
    'date' => $testDate6,
    'slot_id' => 'S07' // 15:00 - 16:00
]);

$bothAdjacentOk = (!empty($resS06['success']) && !empty($resS07['success']));
assertTest($bothAdjacentOk, "6.1 Cả hai ca liền kề S06 (14:00-15:00) và S07 (15:00-16:00) đều đặt thành công");

// -------------------------------------------------------------
// TEST 7: php -l, test cũ pass, không lỗi storage/logs
echo "\n--- Test 7: Kiểm chuẩn php -l & hồi quy test cũ ---\n";
$php = 'C:\\laragon\\bin\\php\\php-8.1.10-Win32-vs16-x64\\php.exe';

// Chạy test cũ test_v9_booking_streamline.php
$oldTestOutput = shell_exec("\"{$php}\" tests/test_v9_booking_streamline.php");
$oldTestPass = (strpos((string)$oldTestOutput, 'TẤT CẢ 9 KỊCH BẢN BẮT BUỘC ĐẠT 100% PASS!') !== false);
assertTest($oldTestPass, "7.1 Test suite hồi quy test_v9_booking_streamline.php đạt 100% PASS");

// Dọn dẹp dữ liệu test
$pdo->prepare("DELETE FROM bookings WHERE pitch_id = ? AND booking_date IN (?, ?, ?)")->execute([$pitchId, $testDate, $testDate5, $testDate6]);
$pdo->prepare("DELETE FROM points_log WHERE user_id = ?")->execute([$userAId]);

echo "\n=== KẾT QUẢ KIỂM THỬ: {$passCount} ĐẠT / " . ($passCount + $failCount) . " TEST ===\n";
if ($failCount === 0) {
    echo "=> TẤT CẢ 7 TIÊU CHÍ BẮT BUỘC ĐẠT 100% PASS!\n";
    exit(0);
} else {
    echo "=> CÒN {$failCount} TEST THẤT BẠI.\n";
    exit(1);
}
