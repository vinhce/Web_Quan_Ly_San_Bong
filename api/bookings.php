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
    $isAdmin = (in_array($currentUser['role'] ?? '', ['admin', 'manager'], true) || ($currentUser['username'] ?? '') === 'vxyen0801');
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
