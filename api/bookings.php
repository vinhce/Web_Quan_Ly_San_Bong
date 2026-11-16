<?php
// API quản lý & đặt sân bóng đá (Sân Bóng Pro)
require_once __DIR__ . '/security_helper.php';
require_once __DIR__ . '/notification_helper.php';
require_once __DIR__ . '/services/booking_operations.php';
require_once __DIR__ . '/services/booking_creator.php';
require_once __DIR__ . '/services/booking_queries.php';

secure_session_start();
$pdo = getDBConnection(false);
$method = $_SERVER['REQUEST_METHOD'];

$rawInput = file_get_contents('php://input');
$data = [];
if (!empty($rawInput)) {
    $decoded = json_decode($rawInput, true);
    if (is_array($decoded)) {
        if (isset($decoded['booking']) && is_array($decoded['booking'])) {
            $data = array_merge($decoded['booking'], $decoded);
        } else {
            $data = $decoded;
        }
    }
}
$data = array_merge($_POST, $data);
$action = $_GET['action'] ?? $data['action'] ?? '';
if ($method === 'POST') {
    require_csrf_if_session_authenticated($data);
    if ($pdo === null) {
        json_error('Không thể kết nối cơ sở dữ liệu. Vui lòng thử lại sau.', 503, 'ERR_DB_UNAVAILABLE');
    }
}

function map_booking_row(array $item): array {
    $services = !empty($item['services_json']) ? json_decode($item['services_json'], true) : ($item['services'] ?? []);
    if (!is_array($services)) {
        $services = [];
    }
    unset($item['services_json']);
    $item['services']            = $services;
    $item['customerName']        = $item['customer_name'] ?? $item['customerName'] ?? '';
    $item['pitchId']             = $item['pitch_id'] ?? $item['pitchId'] ?? '';
    $item['pitchName']           = $item['pitch_name'] ?? $item['pitchName'] ?? '';
    $item['typeName']            = $item['type_name'] ?? $item['typeName'] ?? '';
    $item['date']                = $item['booking_date'] ?? $item['date'] ?? '';
    $item['slotId']              = $item['slot_id'] ?? $item['slotId'] ?? '';
    $item['slotTime']            = $item['slot_time'] ?? $item['slotTime'] ?? '';
    $item['voucherCode']         = $item['voucher_code'] ?? $item['voucherCode'] ?? null;
    $item['originalPrice']       = (int)($item['original_price'] ?? $item['originalPrice'] ?? $item['total_price'] ?? $item['totalPrice'] ?? 0);
    $item['discountAmount']      = (int)($item['discount_amount'] ?? $item['discountAmount'] ?? 0);
    $item['totalPrice']          = (int)($item['total_price'] ?? $item['totalPrice'] ?? 0);
    $item['depositAmount']       = (int)($item['deposit_amount'] ?? $item['depositAmount'] ?? 0);
    $item['paidAmount']          = (int)($item['paid_amount'] ?? $item['paidAmount'] ?? 0);
    $item['remainingAmount']     = (int)($item['remaining_amount'] ?? $item['remainingAmount'] ?? 0);
    $item['paymentStatus']       = $item['payment_status'] ?? $item['paymentStatus'] ?? 'Chờ duyệt cọc';
    $item['paymentMethod']       = $item['payment_method'] ?? $item['paymentMethod'] ?? 'VietQR Chuyển khoản';
    $item['cancelPolicyApplied'] = $item['cancel_policy_applied'] ?? $item['cancelPolicyApplied'] ?? null;
    $item['refundAmount']        = (int)($item['refund_amount'] ?? $item['refundAmount'] ?? 0);
    $item['weeksCount']          = max(1, (int)($item['weeks_count'] ?? $item['weeksCount'] ?? 1));
    $item['bookingMode']         = $item['booking_mode'] ?? $item['bookingMode'] ?? 'single';
    $item['recurringScheduleId'] = !empty($item['recurring_schedule_id']) ? (int)$item['recurring_schedule_id'] : null;
    $item['expiresAt']           = $item['expires_at'] ?? $item['expiresAt'] ?? null;
    $item['createdAt']           = $item['created_at'] ?? $item['createdAt'] ?? '';
    return $item;
}

if ($method === 'POST') {
    if (in_array($action, ['checkin', 'join_waitlist', 'early_cancel', 'noshow_release', 'restore'], true)) {
        handle_booking_operation($action, $pdo, $data);
        exit;
    }
    if ($action === 'adjust_discount') {
        require_once __DIR__ . '/services/admin_bookings_manage.php';
        $actor = require_staff_or_admin($pdo);
        handle_admin_adjust_discount($pdo, $data, $method, $actor);
        exit;
    }
    if ($action === 'complete' || $action === 'complete_order') {
        require_once __DIR__ . '/services/admin_bookings_manage.php';
        $actor = require_staff_or_admin($pdo);
        $code = sanitize_string($data['code'] ?? '', 40);
        $stmt = $pdo->prepare("SELECT * FROM bookings WHERE code = ? LIMIT 1");
        $stmt->execute([$code]);
        $oldBooking = $stmt->fetch();
        if (!$oldBooking) {
            json_error('Không tìm thấy đơn đặt sân.', 404, 'ERR_BOOKING_NOT_FOUND');
        }
        $totPrice = (int)($oldBooking['total_price'] ?? 0);
        $paidAmt  = (int)($oldBooking['paid_amount'] ?? 0);
        if ($totPrice > $paidAmt) {
            $diff = $totPrice - $paidAmt;
            json_error("Không thể hoàn tất đơn đặt sân khi chưa thanh toán đủ (Còn thiếu: " . number_format($diff, 0, ',', '.') . "đ). Vui lòng thu đủ hoặc Điều chỉnh giảm trước khi hoàn tất.", 400, 'ERR_UNPAID_COMPLETION');
        }
        $stmt = $pdo->prepare("UPDATE bookings SET status = 'completed', remaining_amount = GREATEST(0, total_price - paid_amount) WHERE code = ?");
        $stmt->execute([$code]);
        write_audit_log($pdo, 'COMPLETE_BOOKING', $code, (string)($oldBooking['status'] ?? ''), 'completed', $actor);
        json_response(['success' => true, 'message' => "Đã chuyển đơn {$code} sang trạng thái hoàn tất."]);
        exit;
    }
    if ($action === 'create' || empty($action)) {
        handle_create_booking($pdo, $data);
        exit;
    }
}

if ($method === 'GET') {
    if (handle_booking_query($action, $pdo)) {
        exit;
    }

    $currentUser = require_auth($pdo);
    if ($pdo === null) {
        json_response(['success' => true, 'data' => []]);
    }
    $isAdmin = in_array($currentUser['role'] ?? '', ['admin', 'manager'], true);
    if ($isAdmin) {
        $stmt = $pdo->prepare("SELECT b.*, p.name as pitch_name, p.type_name, p.variant 
                               FROM bookings b 
                               JOIN pitches p ON b.pitch_id = p.id 
                               ORDER BY b.id DESC LIMIT 50");
        $stmt->execute();
    } else {
        $userPhone = normalize_phone($currentUser['phone'] ?? '');
        $stmt = $pdo->prepare("SELECT b.*, p.name as pitch_name, p.type_name, p.variant 
                               FROM bookings b 
                               JOIN pitches p ON b.pitch_id = p.id 
                               WHERE b.user_id = ? OR (? != '' AND REPLACE(REPLACE(REPLACE(b.customer_phone, ' ', ''), '.', ''), '-', '') = ?)
                               ORDER BY b.id DESC LIMIT 50");
        $stmt->execute([(int)$currentUser['id'], $userPhone, $userPhone]);
    }
    $list = $stmt->fetchAll();
    foreach ($list as &$item) {
        $item = map_booking_row($item);
    }
    json_response(['success' => true, 'data' => $list]);
}

json_response([
    'success'  => false,
    'message'  => 'Phương thức không được hỗ trợ.',
    'ref_code' => 'ERR_METHOD_NOT_ALLOWED'
], 405);
