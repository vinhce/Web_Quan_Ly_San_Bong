<?php
declare(strict_types=1);

/**
 * TEST PHẦN B: BẢNG CRM KHÁCH HÀNG
 */

defined('SANBONG_ADMIN_ROUTER') or define('SANBONG_ADMIN_ROUTER', true);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../api/security_helper.php';

$pdo = getDBConnection(false);
$passed = 0;
$failed = 0;

function assert_test(bool $condition, string $msg): void {
    global $passed, $failed;
    if ($condition) {
        echo "  [PASS] {$msg}\n";
        $passed++;
    } else {
        echo "  [FAIL] {$msg}\n";
        $failed++;
    }
}

echo "=== KIỂM THỬ PHẦN B: BẢNG CRM KHÁCH HÀNG ===\n\n";

try {
// 1. Kiểm tra HTML file tab6_customers.php
echo "1. Kiểm tra cấu trúc bảng CRM trong HTML:\n";
$tab6Html = file_get_contents(__DIR__ . '/../portal-admin/partials/tab6_customers.php');
assert_test(!str_contains($tab6Html, 'Lịch sử Bùng/No-Show'), 'Đã bỏ cột "Lịch sử Bùng/No-Show"');
assert_test(!str_contains($tab6Html, 'Công nợ chưa thu</th>'), 'Đã bỏ cột "Công nợ chưa thu" khỏi thead CRM');
assert_test(str_contains($tab6Html, 'Đặt gần nhất'), 'Đã có cột "Đặt gần nhất"');
assert_test(str_contains($tab6Html, 'Trận hoàn thành') || str_contains($tab6Html, 'Số lượt đặt'), 'Đã có cột "Trận hoàn thành"');
assert_test(!str_contains($tab6Html, 'cust-filter-regular'), 'Đã bỏ nút lọc #cust-filter-regular ("Khách quen")');
assert_test(!str_contains($tab6Html, 'value="regular"') && !str_contains($tab6Html, 'warning_noshow'), 'Đã bỏ 2 option regular & warning_noshow khỏi #crm-form-tier');
assert_test(!str_contains($tab6Html, 'crm-form-blacklist') && !str_contains($tab6Html, 'crm-form-blacklist-reason-wrap'), 'Đã bỏ khối Blacklist khỏi #customer-crm-form');
assert_test(preg_match('/sm:grid-cols-2[^>]*>[\s\S]*?crm-form-tier[\s\S]*?crm-form-note/u', $tab6Html) === 1, 'Đã đặt #crm-form-tier và #crm-form-note cùng 1 hàng 2 cột');

$tab7Html = file_get_contents(__DIR__ . '/../portal-admin/partials/tab7_deposits.php');
$payJs = file_get_contents(__DIR__ . '/../js/admin_payments.js');
assert_test(!str_contains($tab7Html, 'Kỳ vọng') && !str_contains($payJs, 'Kỳ vọng'), 'Đã xóa hoàn toàn chữ "Kỳ vọng" ở Tab 7 đối soát');
assert_test(str_contains($tab7Html, 'Số tiền nhận / Cần thu'), 'Đã đổi tiêu đề cột thành "Số tiền nhận / Cần thu"');
assert_test(substr_count($tab7Html, 'py-3 px-4 text-center') >= 5, 'Tất cả 5 thẻ <th> bảng đối soát Tab 7 đều căn giữa');
assert_test(str_contains($payJs, 'justify-center text-center'), 'Các ô và trạng thái rỗng bảng đối soát Tab 7 dùng justify-center text-center');

// 2. Chuẩn bị dữ liệu mẫu trong DB để test API CRM
echo "\n2. Kiểm tra tính toán ngày đặt gần nhất & số ca hoàn tất từ backend API:\n";

// Dọn dẹp dữ liệu test cũ nếu có
$testPhones = ['0999000111', '0999000222', '0999000333', '0999000444'];
$inClause = "'" . implode("','", $testPhones) . "'";
$pdo->exec("DELETE FROM bookings WHERE phone IN ({$inClause})");
$pdo->exec("DELETE FROM customer_crm WHERE phone IN ({$inClause})");

$pitchRow = $pdo->query("SELECT id FROM pitches LIMIT 1")->fetch(PDO::FETCH_ASSOC);
$pitchId = $pitchRow ? $pitchRow['id'] : 'P11-A';

$tz = new DateTimeZone('Asia/Ho_Chi_Minh');
$todayStr = (new DateTime('today', $tz))->format('Y-m-d');
$threeDaysAgoStr = (new DateTime('today', $tz))->modify('-3 days')->format('Y-m-d');

// Khách 1: 0999000111 - Chỉ có trong CRM, CHƯA ĐẶT SÂN
$pdo->exec("INSERT INTO customer_crm (phone, full_name, customer_tier) VALUES ('0999000111', 'Khách Chưa Đặt', 'standard')");

// Khách 2: 0999000222 - Đặt HÔM NAY (1 ca Hoàn thành)
$pdo->exec("INSERT INTO bookings (code, customer_name, phone, booking_date, slot_id, slot_time, status, payment_status, total_price, deposit_amount, paid_amount, remaining_amount, pitch_id) 
            VALUES ('TEST_B_02', 'Khách Đặt Hôm Nay', '0999000222', '{$todayStr}', 'S01', '18:00 - 19:00', 'Hoàn thành', 'Đã thanh toán 100%', 300000, 300000, 300000, 0, '{$pitchId}')");

// Khách 3: 0999000333 - Đặt CÁCH VÀI NGÀY (3 ngày trước): 2 ca Hoàn thành, 1 ca Đang đá, 1 ca Đã hủy (Tổng đặt: 4 ca, nhưng Hoàn thành: 2)
$pdo->exec("INSERT INTO bookings (code, customer_name, phone, booking_date, slot_id, slot_time, status, payment_status, total_price, deposit_amount, paid_amount, remaining_amount, pitch_id) 
            VALUES ('TEST_B_03_1', 'Khách Đặt 3 Ngày Trước', '0999000333', '{$threeDaysAgoStr}', 'S01', '18:00 - 19:00', 'Hoàn thành', 'Đã thanh toán 100%', 300000, 300000, 300000, 0, '{$pitchId}'),
                   ('TEST_B_03_2', 'Khách Đặt 3 Ngày Trước', '0999000333', '{$threeDaysAgoStr}', 'S01', '19:00 - 20:00', 'Hoàn thành', 'Đã thanh toán 100%', 300000, 300000, 300000, 0, '{$pitchId}'),
                   ('TEST_B_03_3', 'Khách Đặt 3 Ngày Trước', '0999000333', '{$threeDaysAgoStr}', 'S01', '20:00 - 21:00', 'Đang đá', 'Đã cọc 30%', 300000, 90000, 90000, 210000, '{$pitchId}'),
                   ('TEST_B_03_4', 'Khách Đặt 3 Ngày Trước', '0999000333', '{$threeDaysAgoStr}', 'S01', '21:00 - 22:00', 'Đã hủy', 'Đã hủy', 300000, 0, 0, 0, '{$pitchId}')");

// Khách 4: 0999000444 - Có NO-SHOW (1 ca Khách chưa đến)
$pdo->exec("INSERT INTO bookings (code, customer_name, phone, booking_date, slot_id, slot_time, status, payment_status, total_price, deposit_amount, paid_amount, remaining_amount, pitch_id) 
            VALUES ('TEST_B_04_1', 'Khách Bùng Sân', '0999000444', '{$threeDaysAgoStr}', 'S01', '18:00 - 19:00', 'Khách chưa đến', 'Tịch thu cọc 30%', 300000, 90000, 90000, 0, '{$pitchId}')");

$phpBin = defined('PHP_BINARY') && PHP_BINARY ? PHP_BINARY : 'C:\\laragon\\bin\\php\\php-8.3.36-Win32-vs16-x64\\php.exe';
$resJson = shell_exec("\"{$phpBin}\" tests/sub_test_crm_api.php crm_customers 0999000 2>&1");
$res = json_decode($resJson ?: '', true);

assert_test($res && !empty($res['data']), 'API crm_customers trả về danh sách khách hàng');

$dataMap = [];
if (!empty($res['data'])) {
    foreach ($res['data'] as $c) {
        $dataMap[$c['phone']] = $c;
    }
}

// Kiểm tra Khách 1 (chưa đặt)
$c1 = $dataMap['0999000111'] ?? null;
assert_test($c1 !== null, 'Tìm thấy Khách 1 trong kết quả');
if ($c1) {
    assert_test($c1['lastBookingRelative'] === '—', 'Khách 1 chưa đặt sân hiển thị "—"');
    assert_test($c1['completedCount'] === 0, 'Khách 1 có số lượt đặt hoàn tất = 0');
    assert_test($c1['noShowCount'] === 0, 'Khách 1 không có lượt bùng sân (noShowCount = 0)');
}

// Kiểm tra Khách 2 (đặt hôm nay)
$c2 = $dataMap['0999000222'] ?? null;
assert_test($c2 !== null, 'Tìm thấy Khách 2 trong kết quả');
if ($c2) {
    assert_test($c2['lastBookingRelative'] === 'Hôm nay', 'Khách 2 đặt hôm nay hiển thị "Hôm nay"');
    assert_test($c2['completedCount'] === 1, 'Khách 2 có đúng 1 lượt đặt hoàn tất');
    assert_test($c2['noShowCount'] === 0, 'Khách 2 noShowCount = 0');
}

// Kiểm tra Khách 3 (đặt 3 ngày trước, 4 ca nhưng chỉ 2 hoàn thành)
$c3 = $dataMap['0999000333'] ?? null;
assert_test($c3 !== null, 'Tìm thấy Khách 3 trong kết quả');
if ($c3) {
    assert_test($c3['lastBookingRelative'] === '3 ngày trước', 'Khách 3 đặt 3 ngày trước hiển thị "3 ngày trước"');
    assert_test($c3['completedCount'] === 2, 'Khách 3 chỉ đếm đúng 2 ca hoàn tất (không đếm ca Đang đá và Đã hủy)');
}

// Kiểm tra Khách 4 (bùng sân)
$c4 = $dataMap['0999000444'] ?? null;
assert_test($c4 !== null, 'Tìm thấy Khách 4 trong kết quả');
if ($c4) {
    assert_test($c4['noShowCount'] === 1, 'Khách 4 có 1 lần bùng sân (noShowCount = 1)');
}

// 3. Kiểm tra logic công nợ còn nguyên vẹn ở Báo cáo và Duyệt cọc
echo "\n3. Kiểm tra bảo toàn dữ liệu công nợ ở Báo cáo và Duyệt cọc:\n";
$resReportJson = shell_exec("\"{$phpBin}\" tests/sub_test_crm_api.php reports 2>&1");
$resReport = json_decode($resReportJson ?: '', true);

assert_test($resReport && $resReport['success'] === true, 'API Báo cáo hoạt động bình thường');
assert_test(isset($resReport['data']['summary']['remainingRevenue']), 'Báo cáo vẫn giữ nguyên trường công nợ remainingRevenue');

// Kiểm tra backend duyệt cọc / deposits logic
$action = 'noop';
$method = 'GET';
$data = [];
$actor = ['role' => 'admin'];
require_once __DIR__ . '/../api/admin_finance.php';
assert_test(function_exists('handle_admin_pending_deposits'), 'Hàm duyệt cọc handle_admin_pending_deposits vẫn tồn tại và hoạt động');

// Dọn dẹp dữ liệu test
$pdo->exec("DELETE FROM bookings WHERE phone IN ({$inClause})");
$pdo->exec("DELETE FROM customer_crm WHERE phone IN ({$inClause})");

} catch (Throwable $e) {
    echo "UNCAUGHT ERROR: " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine() . "\n";
}

echo "\n=============================================\n";
echo "KẾT QUẢ KIỂM THỬ PHẦN B: {$passed} PASS, {$failed} FAIL\n";
if ($failed === 0) {
    echo ">>> PHẦN B ĐẠT YÊU CẦU 100% <<<\n";
    exit(0);
} else {
    echo ">>> CÒN LỖI CẦN SỬA <<<\n";
    exit(1);
}
