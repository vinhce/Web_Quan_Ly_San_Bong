<?php

require_once __DIR__ . '/security_helper.php';

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

function map_booking_row(array $item): array {
    $services = !empty($item['services_json']) ? json_decode($item['services_json'], true) : ($item['services'] ?? []);
    if (!is_array($services)) {
        $services = [];
    }
    unset($item['services_json']);
    $item['services']        = $services;
    $item['customerName']    = $item['customer_name'] ?? $item['customerName'] ?? '';
    $item['pitchId']         = $item['pitch_id'] ?? $item['pitchId'] ?? '';
    $item['pitchName']       = $item['pitch_name'] ?? $item['pitchName'] ?? '';
    $item['typeName']        = $item['type_name'] ?? $item['typeName'] ?? '';
    $item['date']            = $item['booking_date'] ?? $item['date'] ?? '';
    $item['slotId']          = $item['slot_id'] ?? $item['slotId'] ?? '';
    $item['slotTime']        = $item['slot_time'] ?? $item['slotTime'] ?? '';
    $item['voucherCode']     = $item['voucher_code'] ?? $item['voucherCode'] ?? null;
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
    $item['expiresAt']           = $item['expires_at'] ?? $item['expiresAt'] ?? null;
    $item['createdAt']           = $item['created_at'] ?? $item['createdAt'] ?? '';
    return $item;
}

if ($method === 'POST' && $action === 'checkin') {
    $actor = require_staff_or_admin($pdo);
    $code = sanitize_string($data['code'] ?? $_GET['code'] ?? '', 40);
    if (empty($code)) {
        json_error('Thiếu mã đơn đặt sân.', 400, 'ERR_MISSING_CODE');
    }
    if ($pdo === null) {
        json_response([
            'success' => true,
            'message' => 'Check-in nhận sân thành công! Ca đá đã bắt đầu (chờ thu phần còn lại khi kết thúc ca).',
            'data'    => ['code' => $code, 'status' => 'Đang đá', 'paymentStatus' => 'Đã cọc 30%']
        ]);
    }
    $oldStmt = $pdo->prepare("SELECT status, payment_status, weeks_count FROM bookings WHERE code = ? LIMIT 1");
    $oldStmt->execute([$code]);
    $oldRow = $oldStmt->fetch();
    $oldStatus = $oldRow ? ($oldRow['status'] . ' (' . $oldRow['payment_status'] . ')') : 'Đã xác nhận';

    $stmt = $pdo->prepare("UPDATE bookings SET status = 'Đang đá' WHERE code = ?");
    $stmt->execute([$code]);

    write_audit_log($pdo, 'CHECKIN', $code, $oldStatus, 'Đang đá', $actor);

    if ($oldRow && (int)($oldRow['weeks_count'] ?? 1) >= 12) {
        try {
            $chkGift = $pdo->prepare("SELECT COUNT(*) FROM service_sales WHERE booking_code = ? AND service_id = 'SRV-WATER' AND DATE(created_at) = CURDATE()");
            $chkGift->execute([$code]);
            if ((int)$chkGift->fetchColumn() === 0) {
                deduct_service_inventory($pdo, 'SRV-WATER', 2, $code, 0, 'Tặng kèm Gói 3 tháng', 'Xuất 2 thùng nước miễn phí khi check-in Gói 3 tháng', $actor['id'] ?? null);
            }
        } catch (Exception $giftEx) {
            error_log("[CHECKIN GIFT WARN] " . $giftEx->getMessage());
        }
    }

    json_response([
        'success' => true,
        'message' => 'Check-in nhận sân thành công! Ca đá đã bắt đầu.',
        'data'    => ['code' => $code, 'status' => 'Đang đá', 'paymentStatus' => $oldRow['payment_status'] ?? 'Đã cọc 30%']
    ]);
}

if ($method === 'POST' && $action === 'early_cancel') {
    $currentUser = require_auth($pdo);
    $code = sanitize_string($data['code'] ?? $_GET['code'] ?? '', 40);
    $requestedPolicy = sanitize_string($data['policy'] ?? 'auto', 30);
    $rawReason = trim((string)($data['reason'] ?? ''));
    $reason = $rawReason !== '' ? sanitize_string($rawReason, 200) : 'Hủy lịch trước thời hạn';
    if (empty($code)) {
        json_error('Thiếu mã đơn đặt sân.', 400, 'ERR_MISSING_CODE');
    }
    if ($pdo === null) {
        if ($rawReason === '') {
            json_error('Đơn đã thu tiền/đặt cọc bắt buộc phải nhập lý do hủy!', 400, 'ERR_CANCEL_REASON_REQUIRED');
        }
        $policyMap = [
            'refund_100' => 'Đã hoàn cọc 100%',
            'reserve'    => 'Bảo lưu cọc 30%',
            'forfeit_50' => 'Phạt 50% cọc',
            'forfeit_100' => 'Tịch thu cọc 30%'
        ];
        $payStatus = $policyMap[$requestedPolicy] ?? 'Đã hoàn cọc 100%';
        json_response([
            'success' => true,
            'message' => "Đã hủy lịch đặt sân trước thời hạn ({$payStatus}).",
            'data'    => ['code' => $code, 'status' => 'Đã hủy', 'paymentStatus' => $payStatus]
        ]);
    }
    $checkStmt = $pdo->prepare("SELECT * FROM bookings WHERE code = ? LIMIT 1");
    $checkStmt->execute([$code]);
    $bookingRow = $checkStmt->fetch();
    if (!$bookingRow) {
        json_error('Không tìm thấy đơn đặt sân tương ứng.', 404, 'ERR_NOT_FOUND');
    }
    $isPortalActor = is_portal_operator($currentUser);
    if (!$isPortalActor) {
        $userPhone = preg_replace('/\s+/', '', (string)($currentUser['phone'] ?? ''));
        $bookPhone = preg_replace('/\s+/', '', (string)($bookingRow['phone'] ?? ''));
        $ownsById = !empty($bookingRow['user_id']) && ((int)$bookingRow['user_id'] === (int)$currentUser['id']);
        $ownsByPhone = ($userPhone !== '' && $bookPhone !== '' && $userPhone === $bookPhone);
        if (!$ownsById && !$ownsByPhone) {
            json_error('Bạn không có quyền hủy đơn đặt sân của người khác.', 403, 'ERR_IDOR_BLOCKED');
        }
    }
    if ((in_array($bookingRow['payment_status'] ?? '', ['Đã cọc 30%', 'Đã thanh toán đủ', 'Đã thanh toán 100%'], true) || (int)($bookingRow['deposit_amount'] ?? 0) > 0 || (int)($bookingRow['paid_amount'] ?? 0) > 0) && $rawReason === '') {
        json_error('Đơn đã thu tiền/đặt cọc bắt buộc phải nhập lý do hủy!', 400, 'ERR_CANCEL_REASON_REQUIRED');
    }

    $settings = get_system_settings_map($pdo);
    $eval = evaluate_cancellation_policy($bookingRow, $settings);
    $policyRecommended = $eval['policy'];
    $hoursBeforeMatch  = $eval['hours_before_match'];
    $paidBase          = $eval['paid_base'];

    $targetStatus = 'Đã hủy';
    if (!$isPortalActor || $requestedPolicy === '' || $requestedPolicy === 'auto') {
        $appliedPolicy = $eval['policy'];
        $payStatus     = $eval['payment_status'];
        $refundAmount  = $eval['refund_amount'];
    } elseif ($requestedPolicy === 'noshow_forfeit') {
        $targetStatus  = 'Khách chưa đến';
        $appliedPolicy = 'noshow_forfeit';
        $payStatus     = 'Tịch thu cọc 30%';
        $refundAmount  = 0;
    } elseif ($requestedPolicy === 'refund_100') {
        $appliedPolicy = 'refund_100';
        $payStatus     = 'Đã hoàn cọc 100%';
        $refundAmount  = $paidBase;
    } elseif ($requestedPolicy === 'reserve') {
        $appliedPolicy = 'reserve';
        $payStatus     = 'Bảo lưu cọc 30%';
        $refundAmount  = 0;
    } elseif ($requestedPolicy === 'forfeit_50') {
        $appliedPolicy = 'forfeit_50';
        $payStatus     = 'Phạt 50% cọc';
        $refundAmount  = (int)round($paidBase * 0.5);
    } elseif ($requestedPolicy === 'forfeit_100') {
        $appliedPolicy = 'forfeit_100';
        $payStatus     = 'Tịch thu cọc 30%';
        $refundAmount  = 0;
    } else {
        $appliedPolicy = $eval['policy'];
        $payStatus     = $eval['payment_status'];
        $refundAmount  = $eval['refund_amount'];
    }

    $noteSuffix = " [Hủy trước hạn ({$appliedPolicy}, hoàn " . number_format($refundAmount) . "đ) - {$payStatus}: {$reason}]";
    $stmt = $pdo->prepare("UPDATE bookings SET status = ?, payment_status = ?, remaining_amount = 0, cancel_policy_applied = ?, refund_amount = ?, note = CONCAT(IFNULL(note,''), ?) WHERE code = ?");
    $stmt->execute([$targetStatus, $payStatus, $appliedPolicy, $refundAmount, $noteSuffix, $code]);

    write_audit_log(
        $pdo,
        'CANCEL_BOOKING',
        $code,
        ($bookingRow['status'] ?? '') . ' (' . ($bookingRow['payment_status'] ?? '') . ')',
        "{$targetStatus} ({$payStatus}) | Chính sách áp dụng: {$appliedPolicy} (Đề xuất: {$policyRecommended}, còn {$hoursBeforeMatch}h) | Hoàn: " . number_format($refundAmount) . "đ | Lý do: {$reason}",
        $currentUser
    );

    json_response([
        'success' => true,
        'message' => "Đã hủy lịch đặt sân ({$payStatus}).",
        'data'    => [
            'code'                => $code,
            'status'              => $targetStatus,
            'paymentStatus'       => $payStatus,
            'cancelPolicyApplied' => $appliedPolicy,
            'policyRecommended'   => $policyRecommended,
            'hoursBeforeMatch'    => $hoursBeforeMatch,
            'refundAmount'        => $refundAmount
        ]
    ]);
}

if ($method === 'POST' && $action === 'noshow_release') {
    $actor = require_staff_or_admin($pdo);
    $code = sanitize_string($data['code'] ?? $_GET['code'] ?? '', 40);
    if (empty($code)) {
        json_error('Thiếu mã đơn đặt sân.', 400, 'ERR_MISSING_CODE');
    }
    if ($pdo === null) {
        json_response([
            'success' => true,
            'message' => 'Đã đánh dấu khách chưa đến (quá 15 phút), tịch thu cọc 30% và LẬP TỨC NHẢ SÂN TRỐNG để đón khách khác!',
            'data'    => ['code' => $code, 'status' => 'Khách chưa đến', 'paymentStatus' => 'Tịch thu cọc 30%', 'released' => true]
        ]);
    }
    $oldStmt = $pdo->prepare("SELECT status, payment_status FROM bookings WHERE code = ? LIMIT 1");
    $oldStmt->execute([$code]);
    $oldRow = $oldStmt->fetch();
    $oldStatus = $oldRow ? ($oldRow['status'] . ' (' . $oldRow['payment_status'] . ')') : 'Đã xác nhận';

    $stmt = $pdo->prepare("UPDATE bookings SET status = 'Khách chưa đến', payment_status = 'Tịch thu cọc 30%', note = CONCAT(IFNULL(note,''), ' [Quá 15p khách chưa đến - Đã nhả sân trống]') WHERE code = ?");
    $stmt->execute([$code]);

    write_audit_log($pdo, 'NOSHOW_RELEASE', $code, $oldStatus, 'Khách chưa đến (Tịch thu cọc 30%)', $actor);

    json_response([
        'success' => true,
        'message' => 'Đã đánh dấu khách chưa đến (quá 15 phút), tịch thu cọc 30% và LẬP TỨC NHẢ SÂN TRỐNG để đón khách khác!',
        'data'    => ['code' => $code, 'status' => 'Khách chưa đến', 'paymentStatus' => 'Tịch thu cọc 30%', 'released' => true]
    ]);
}

if ($method === 'POST' && $action === 'restore') {
    $actor = require_staff_or_admin($pdo);
    $code = sanitize_string($data['code'] ?? $_GET['code'] ?? '', 40);
    if (empty($code)) {
        json_error('Thiếu mã đơn đặt sân.', 400, 'ERR_MISSING_CODE');
    }
    if ($pdo === null) {
        json_response([
            'success' => true,
            'message' => 'Đã khôi phục lại ca đá thành công!',
            'data'    => ['code' => $code, 'status' => 'Đã xác nhận', 'paymentStatus' => 'Đã cọc 30%']
        ]);
    }
    $oldStmt = $pdo->prepare("SELECT status, payment_status FROM bookings WHERE code = ? LIMIT 1");
    $oldStmt->execute([$code]);
    $oldRow = $oldStmt->fetch();
    $oldStatus = $oldRow ? ($oldRow['status'] . ' (' . $oldRow['payment_status'] . ')') : 'Đã hủy';

    $stmt = $pdo->prepare("UPDATE bookings SET status = 'Đã xác nhận', payment_status = 'Đã cọc 30%', remaining_amount = GREATEST(0, total_price - deposit_amount), note = CONCAT(IFNULL(note,''), ' [Đã khôi phục lại ca đá]') WHERE code = ?");
    $stmt->execute([$code]);

    write_audit_log($pdo, 'RESTORE_BOOKING', $code, $oldStatus, 'Đã xác nhận (Đã cọc 30%)', $actor);

    json_response([
        'success' => true,
        'message' => 'Đã khôi phục lại ca đá thành công!',
        'data'    => ['code' => $code, 'status' => 'Đã xác nhận', 'paymentStatus' => 'Đã cọc 30%']
    ]);
}

if ($method === 'POST' && ($action === 'create' || empty($action))) {
    $isWalkin = !empty($data['isWalkin']) || !empty($data['is_walkin']);
    if ($isWalkin) {
        $walkinActor = require_staff_or_admin($pdo);
    } elseif (!check_rate_limit($pdo, 'create_booking', 10, 300)) {
        json_response([
            'success'  => false,
            'message'  => 'Bạn thao tác quá nhanh. Vui lòng thử lại sau vài phút.',
            'ref_code' => 'ERR_RATE_LIMITED'
        ], 429);
    }

    $customerName = sanitize_string($data['customerName'] ?? $data['customer_name'] ?? '', 100);
    $phone = sanitize_string($data['phone'] ?? '', 20);
    $email = filter_var($data['email'] ?? 'khachhang@sanbongpro.vn', FILTER_VALIDATE_EMAIL) ?: 'khachhang@sanbongpro.vn';
    $pitchId = sanitize_string($data['pitchId'] ?? $data['pitch_id'] ?? '', 20);
    $date = sanitize_string($data['date'] ?? $data['booking_date'] ?? '', 15);
    $slotId = sanitize_string($data['slotId'] ?? $data['slot_id'] ?? '', 10);
    $servicesInput = is_array($data['services'] ?? null) ? $data['services'] : [];
    $voucherCode = sanitize_string($data['voucherCode'] ?? $data['voucher_code'] ?? '', 30);
    $note = sanitize_string($data['note'] ?? '', 255);
    $paymentMethod = sanitize_string($data['paymentMethod'] ?? $data['payment_method'] ?? 'VietQR Chuyển khoản', 50);
    $weeksCount = max(1, (int)($data['weeksCount'] ?? $data['weeks_count'] ?? 1));
    $bookingMode = sanitize_string($data['bookingMode'] ?? $data['booking_mode'] ?? ($weeksCount >= 12 ? 'quarterly' : ($weeksCount >= 4 ? 'monthly' : 'single')), 20);
    $payFull = !empty($data['payFull']) || !empty($data['pay_full']);

    if ($weeksCount >= 12) {
        $packageDiscountRate = 0.15;
        $giftNote = '[Gói 3 tháng (12 tuần) - Tặng 2 thùng nước + 1 trọng tài/trận]';
        if (mb_stripos($note, 'Gói 3 tháng') === false) {
            $note = trim($note . ' ' . $giftNote);
        }
    } elseif ($weeksCount >= 8) {
        $packageDiscountRate = 0.10;
    } elseif ($weeksCount >= 4) {
        $packageDiscountRate = 0.05;
    } else {
        $packageDiscountRate = 0.0;
    }

    if ($isWalkin && mb_stripos($note, 'tại quầy') === false) {
        $note = trim($note . ' [Đặt trực tiếp tại quầy]');
    }

    if (empty($customerName) || empty($phone) || empty($pitchId) || empty($date) || empty($slotId)) {
        json_response([
            'success'  => false,
            'message'  => 'Vui lòng điền đầy đủ các trường thông tin bắt buộc.',
            'ref_code' => 'ERR_MISSING_REQUIRED'
        ], 400);
    }

    $bookingDateTime = strtotime($date);
    $today = strtotime(date('Y-m-d'));
    if (!$bookingDateTime || (!$isWalkin && $bookingDateTime < $today)) {
        json_response([
            'success'  => false,
            'message'  => 'Ngày đặt sân không hợp lệ hoặc đã qua.',
            'ref_code' => 'ERR_INVALID_DATE'
        ], 400);
    }

    $customCode = sanitize_string($data['code'] ?? '', 40);
    $hasValidCustomCode = !empty($customCode) && preg_match('/^(ASF[FSE]?[0-9]{6,8}|DH[0-9]{6,8}|SB-?[0-9]{8}-?[A-Z0-9]{4})$/i', $customCode);
    if ($hasValidCustomCode) {
        $code = strtoupper($customCode);
    } else {
        if (stripos($pitchId, 'P5') === 0) {
            $prefix = 'ASFF';
        } elseif (stripos($pitchId, 'P11') === 0) {
            $prefix = 'ASFE';
        } else {
            $prefix = 'ASFS';
        }
        $code = $prefix . random_int(100000, 999999);
    }

    if ($pdo === null) {
        $fallbackPitches = [
            'P5-A'  => ['name' => 'Sân 5 - Sân A', 'base_price' => 250000, 'peak_price' => 350000, 'weekend_price' => 380000, 'status' => 'Hoạt động'],
            'P5-B'  => ['name' => 'Sân 5 - Sân B', 'base_price' => 250000, 'peak_price' => 350000, 'weekend_price' => 380000, 'status' => 'Hoạt động'],
            'P5-C'  => ['name' => 'Sân 5 - Sân C (Mới)', 'base_price' => 280000, 'peak_price' => 380000, 'weekend_price' => 380000, 'status' => 'Hoạt động'],
            'P7-A'  => ['name' => 'Sân 7 - Sân A (Trung tâm)', 'base_price' => 450000, 'peak_price' => 650000, 'weekend_price' => 700000, 'status' => 'Hoạt động'],
            'P7-B'  => ['name' => 'Sân 7 - Sân B', 'base_price' => 400000, 'peak_price' => 600000, 'weekend_price' => 700000, 'status' => 'Hoạt động'],
            'P7-C'  => ['name' => 'Sân 7 - Sân C (VIP)', 'base_price' => 500000, 'peak_price' => 750000, 'weekend_price' => 700000, 'status' => 'Hoạt động'],
            'P11-A' => ['name' => 'Sân 11 - Sân Ghép (A+B)', 'base_price' => 800000, 'peak_price' => 1200000, 'weekend_price' => 1400000, 'status' => 'Hoạt động'],
            'P11-B' => ['name' => 'Sân 11 - Sân Ghép (C+D)', 'base_price' => 850000, 'peak_price' => 1300000, 'weekend_price' => 1400000, 'status' => 'Hoạt động'],
            'P11-C' => ['name' => 'Sân 11 - Sân Trung Tâm VFF', 'base_price' => 950000, 'peak_price' => 1500000, 'weekend_price' => 1400000, 'status' => 'Hoạt động']
        ];
        $fallbackSlots = [
            'S01' => ['slot_time' => '05:30 - 06:30', 'is_peak' => 0, 'duration' => 1.0],
            'S02' => ['slot_time' => '06:30 - 07:30', 'is_peak' => 0, 'duration' => 1.0],
            'S03' => ['slot_time' => '07:30 - 08:30', 'is_peak' => 0, 'duration' => 1.0],
            'S04' => ['slot_time' => '08:30 - 09:30', 'is_peak' => 0, 'duration' => 1.0],
            'S05' => ['slot_time' => '09:30 - 10:30', 'is_peak' => 0, 'duration' => 1.0],
            'S06' => ['slot_time' => '14:00 - 15:00', 'is_peak' => 0, 'duration' => 1.0],
            'S07' => ['slot_time' => '15:00 - 16:00', 'is_peak' => 0, 'duration' => 1.0],
            'S08' => ['slot_time' => '16:00 - 17:00', 'is_peak' => 0, 'duration' => 1.0],
            'S09' => ['slot_time' => '17:00 - 18:00', 'is_peak' => 1, 'duration' => 1.0],
            'S10' => ['slot_time' => '17:30 - 19:00', 'is_peak' => 1, 'duration' => 1.5],
            'S11' => ['slot_time' => '18:00 - 19:00', 'is_peak' => 1, 'duration' => 1.0],
            'S12' => ['slot_time' => '19:00 - 20:00', 'is_peak' => 1, 'duration' => 1.0],
            'S13' => ['slot_time' => '19:00 - 20:30', 'is_peak' => 1, 'duration' => 1.5],
            'S14' => ['slot_time' => '20:00 - 21:00', 'is_peak' => 1, 'duration' => 1.0],
            'S15' => ['slot_time' => '20:30 - 22:00', 'is_peak' => 1, 'duration' => 1.5],
            'S16' => ['slot_time' => '21:00 - 22:00', 'is_peak' => 0, 'duration' => 1.0],
            'S17' => ['slot_time' => '21:00 - 22:30', 'is_peak' => 0, 'duration' => 1.5],
            'S18' => ['slot_time' => '22:00 - 23:00', 'is_peak' => 0, 'duration' => 1.0]
        ];
        $fallbackServices = [
            'SRV-WATER'        => 120000,
            'SRV-WATER-BOTTLE' => 10000,
            'SRV-BIB'          => 30000,
            'SRV-BALL'         => 20000,
            'SRV-REF'          => 150000
        ];
        $fallbackVouchers = [
            'WELCOME10'    => ['type' => 'percent', 'val' => 10, 'min' => 0],
            'GIAM50K'      => ['type' => 'fixed',   'val' => 50000, 'min' => 500000],
            'VIPGOLD'      => ['type' => 'percent', 'val' => 15, 'min' => 300000],
            'DATTHANG15'   => ['type' => 'percent', 'val' => 15, 'min' => 800000],
            'SINHVIEN30K'  => ['type' => 'fixed',   'val' => 30000, 'min' => 200000],
            'CUOITUAN100K' => ['type' => 'fixed',   'val' => 100000, 'min' => 900000]
        ];

        $pitch = $fallbackPitches[$pitchId] ?? null;
        $slot = $fallbackSlots[$slotId] ?? null;
        if (!$pitch || $pitch['status'] === 'Bảo trì' || !$slot) {
            json_error('Sân bóng hoặc khung giờ không hợp lệ.', 400, 'ERR_INVALID_PITCH_OR_SLOT');
        }

        $dayOfWeek = (int)date('w', $bookingDateTime);
        $isWeekend = ($dayOfWeek === 0 || $dayOfWeek === 6);
        $weekendPrice = (int)($pitch['weekend_price'] ?? 0);
        if ($isWeekend && $weekendPrice > 0) {
            $basePrice = $slot['is_peak'] ? max((int)$pitch['peak_price'], $weekendPrice) : $weekendPrice;
        } else {
            $basePrice = $slot['is_peak'] ? $pitch['peak_price'] : $pitch['base_price'];
        }
        $pitchPrice = (int)round($basePrice * $slot['duration'] * $weeksCount * (1 - $packageDiscountRate));
        $srvPrice = 0;
        foreach ($servicesInput as $s) {
            $sId = $s['id'] ?? '';
            $sQty = max(1, min(100, (int)($s['quantity'] ?? 1)));
            if (isset($fallbackServices[$sId])) {
                $srvPrice += $fallbackServices[$sId] * $sQty;
            }
        }
        $subtotal = $pitchPrice + $srvPrice;
        $discountAmount = 0;
        if (!empty($voucherCode) && isset($fallbackVouchers[$voucherCode])) {
            $v = $fallbackVouchers[$voucherCode];
            if ($subtotal >= $v['min']) {
                $discountAmount = ($v['type'] === 'percent')
                    ? (int)round($subtotal * ($v['val'] / 100))
                    : min($v['val'], $subtotal);
            }
        }
        $totalPrice = max(0, $subtotal - $discountAmount);
        $depositAmount = (int)round($totalPrice * 0.3);
        $remainingAmount = $totalPrice - $depositAmount;
        $bookingStatus = 'Đã xác nhận';
        $paymentStatus = 'Chờ duyệt cọc';
        $holdMinutes = 15;
        $paidAmount = 0;
        $expiresAt = (!$isWalkin && !$payFull) ? date('Y-m-d H:i:s', time() + ($holdMinutes * 60)) : null;
        if ($isWalkin) {
            $expiresAt = null;
            if ($paymentMethod === 'Khách quen (Chưa cọc)' || mb_stripos($paymentMethod, 'Chưa cọc') !== false) {
                $bookingStatus = 'Đã xác nhận';
                $paymentStatus = 'Chờ duyệt cọc';
                $depositAmount = 0;
                $paidAmount = 0;
                $remainingAmount = $totalPrice;
            } elseif ($payFull) {
                $bookingStatus = 'Hoàn thành';
                $paymentStatus = 'Đã thanh toán 100%';
                $depositAmount = $totalPrice;
                $paidAmount = $totalPrice;
                $remainingAmount = 0;
            } else {
                $bookingStatus = 'Đã xác nhận';
                $paymentStatus = 'Đã cọc 30%';
                $paidAmount = $depositAmount;
                $remainingAmount = max(0, $totalPrice - $depositAmount);
            }
        }

        $expectedFile = __DIR__ . '/../logs/expected_orders.json';
        $expectedOrders = [];
        if (file_exists($expectedFile)) {
            $decodedExpected = json_decode(@file_get_contents($expectedFile), true);
            if (is_array($decodedExpected)) {
                $expectedOrders = $decodedExpected;
            }
        }
        $cleanCode = str_replace(['-', ' '], '', strtoupper($code));
        $expectedOrders[$cleanCode] = [
            'code'           => $code,
            'deposit_amount' => $depositAmount,
            'total_price'    => $totalPrice,
            'updated_at'     => date('Y-m-d H:i:s')
        ];
        @file_put_contents($expectedFile, json_encode($expectedOrders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        json_response([
            'success' => true,
            'message' => 'Tạo đơn đặt sân thành công!',
            'data'    => [
                'id'              => 0,
                'code'            => $code,
                'pitchId'         => $pitchId,
                'pitchName'       => $pitch['name'],
                'date'            => $date,
                'slotId'          => $slotId,
                'slotTime'        => $slot['slot_time'],
                'customerName'    => $customerName,
                'phone'           => $phone,
                'weeksCount'      => $weeksCount,
                'bookingMode'     => $bookingMode,
                'totalPrice'      => $totalPrice,
                'depositAmount'   => $depositAmount,
                'paidAmount'      => $paidAmount,
                'remainingAmount' => $remainingAmount,
                'status'          => $bookingStatus,
                'paymentStatus'   => $paymentStatus,
                'paymentMethod'   => $paymentMethod,
                'holdMinutes'     => $holdMinutes,
                'expiresAt'       => $expiresAt,
                'note'            => $note
            ]
        ], 201);
    }

    maybe_run_auto_release_throttled($pdo, 30);

    try {
        
        $pdo->beginTransaction();

        $pitchStmt = $pdo->prepare("SELECT id, name, type, base_price, peak_price, weekend_price, status FROM pitches WHERE id = ? FOR UPDATE");
        $pitchStmt->execute([$pitchId]);
        $pitch = $pitchStmt->fetch();

        if (!$pitch || $pitch['status'] === 'Bảo trì' || $pitch['status'] === 'Ẩn') {
            $pdo->rollBack();
            json_response([
                'success'  => false,
                'message'  => 'Sân bóng này hiện đang bảo trì, tạm ẩn hoặc không tồn tại.',
                'ref_code' => 'ERR_PITCH_UNAVAILABLE'
            ], 400);
        }

        $slotStmt = $pdo->prepare("SELECT id, slot_time, is_peak, duration FROM time_slots WHERE id = ?");
        $slotStmt->execute([$slotId]);
        $slot = $slotStmt->fetch();

        if (!$slot) {
            $pdo->rollBack();
            json_response([
                'success'  => false,
                'message'  => 'Khung giờ đặt không hợp lệ.',
                'ref_code' => 'ERR_INVALID_SLOT'
            ], 400);
        }

        $isPeak = (bool)$slot['is_peak'];
        $dayOfWeek = (int)date('w', $bookingDateTime);
        $isWeekend = ($dayOfWeek === 0 || $dayOfWeek === 6);
        $weekendPrice = (int)($pitch['weekend_price'] ?? 0);
        if ($isWeekend && $weekendPrice > 0) {
            $basePrice = $isPeak ? max((int)$pitch['peak_price'], $weekendPrice) : $weekendPrice;
        } else {
            $basePrice = $isPeak ? (int)$pitch['peak_price'] : (int)$pitch['base_price'];
        }
        $duration = (float)$slot['duration'];
        $pitchPrice = (int)round($basePrice * ($duration ?: 1.0) * $weeksCount * (1 - $packageDiscountRate));

        $totalServicesPrice = 0;
        $cleanServices = [];
        if (!empty($servicesInput)) {
            $serviceIds = array_column($servicesInput, 'id');
            if (!empty($serviceIds)) {
                $placeholders = implode(',', array_fill(0, count($serviceIds), '?'));
                $srvStmt = $pdo->prepare("SELECT id, name, price, unit FROM extra_services WHERE id IN ($placeholders)");
                $srvStmt->execute($serviceIds);
                $dbServices = $srvStmt->fetchAll(PDO::FETCH_UNIQUE);

                foreach ($servicesInput as $s) {
                    $sId = $s['id'] ?? '';
                    $sQty = max(1, min(100, (int)($s['quantity'] ?? 1)));
                    if (isset($dbServices[$sId])) {
                        $cost = (int)$dbServices[$sId]['price'] * $sQty;
                        $totalServicesPrice += $cost;
                        $cleanServices[] = [
                            'id'       => $sId,
                            'name'     => $dbServices[$sId]['name'],
                            'price'    => (int)$dbServices[$sId]['price'],
                            'quantity' => $sQty,
                            'unit'     => $dbServices[$sId]['unit'],
                            'total'    => $cost
                        ];
                    }
                }
            }
        }

        $subtotal = $pitchPrice + $totalServicesPrice;

        $discountAmount = 0;
        $appliedVoucher = null;
        if (!empty($voucherCode)) {
            $vStmt = $pdo->prepare("SELECT code, discount_type, discount_value, min_order, is_active FROM vouchers WHERE code = ? AND is_active = 1");
            $vStmt->execute([$voucherCode]);
            $vData = $vStmt->fetch();
            if ($vData && $subtotal >= (int)$vData['min_order']) {
                if ($vData['discount_type'] === 'percent') {
                    $discountAmount = (int)round($subtotal * ((int)$vData['discount_value'] / 100));
                } else {
                    $discountAmount = min((int)$vData['discount_value'], $subtotal);
                }
                $appliedVoucher = $vData['code'];
            }
        }

        $totalPrice = max(0, $subtotal - $discountAmount);

        $sysSettings = get_system_settings_map($pdo);
        $depositRate = max(10, min(100, (int)($sysSettings['deposit_rate'] ?? 30)));
        $holdMinutes = max(5, min(120, (int)($sysSettings['hold_minutes'] ?? 15)));

        $depositAmount = (int)round($totalPrice * ($depositRate / 100)); 
        $remainingAmount = max(0, $totalPrice - $depositAmount);
        $bookingStatus = 'Đã xác nhận';
        $paymentStatus = 'Chờ duyệt cọc';
        $paidAmount = 0;
        $expiresAt = (!$isWalkin && !$payFull) ? date('Y-m-d H:i:s', time() + ($holdMinutes * 60)) : null;

        if ($isWalkin) {
            $expiresAt = null;
            if ($paymentMethod === 'Khách quen (Chưa cọc)' || mb_stripos($paymentMethod, 'Chưa cọc') !== false) {
                $bookingStatus = 'Đã xác nhận';
                $paymentStatus = 'Chờ duyệt cọc';
                $depositAmount = 0;
                $paidAmount = 0;
                $remainingAmount = $totalPrice;
            } elseif ($payFull) {
                $bookingStatus = 'Hoàn thành';
                $paymentStatus = 'Đã thanh toán 100%';
                $depositAmount = $totalPrice;
                $paidAmount = $totalPrice;
                $remainingAmount = 0;
            } else {
                $bookingStatus = 'Đã xác nhận';
                $paymentStatus = 'Đã cọc 30%';
                $paidAmount = $depositAmount;
                $remainingAmount = max(0, $totalPrice - $depositAmount);
            }
        }

        $expectedFile = __DIR__ . '/../logs/expected_orders.json';
        $expectedOrders = [];
        if (file_exists($expectedFile)) {
            $decodedExpected = json_decode(@file_get_contents($expectedFile), true);
            if (is_array($decodedExpected)) {
                $expectedOrders = $decodedExpected;
            }
        }
        $cleanCode = str_replace(['-', ' '], '', strtoupper($code));
        $expectedOrders[$cleanCode] = [
            'code'           => $code,
            'deposit_amount' => $depositAmount,
            'total_price'    => $totalPrice,
            'updated_at'     => date('Y-m-d H:i:s')
        ];
        @file_put_contents($expectedFile, json_encode($expectedOrders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        $checkDuplicateStmt = $pdo->prepare("SELECT id, code, deposit_amount, status, payment_status FROM bookings WHERE pitch_id = ? AND booking_date = ? AND slot_id = ? AND status NOT IN ('Đã hủy', 'Khách chưa đến') AND payment_status NOT IN ('Đã hủy', 'Tịch thu cọc 30%', 'Đã hoàn cọc 100%', 'Bảo lưu cọc 30%', 'Phạt 50% cọc') FOR UPDATE");
        $checkDuplicateStmt->execute([$pitchId, $date, $slotId]);
        $existingBooking = $checkDuplicateStmt->fetch();

        $userId = $_SESSION['user_id'] ?? null;
        $servicesJson = json_encode($cleanServices, JSON_UNESCAPED_UNICODE);

        if ($existingBooking) {
            if ($isWalkin || !$hasValidCustomCode || $existingBooking['code'] !== $code) {
                $pdo->rollBack();
                json_response([
                    'success'  => false,
                    'message'  => "Khung giờ {$slot['slot_time']} ngày {$date} tại {$pitch['name']} đã có đơn đặt trước (#{$existingBooking['code']}). Vui lòng chọn khung giờ khác!",
                    'ref_code' => 'ERR_DOUBLE_BOOKING'
                ], 409);
            }

            $updatePendingStmt = $pdo->prepare("UPDATE bookings SET code = ?, user_id = ?, customer_name = ?, phone = ?, email = ?, slot_time = ?, services_json = ?, voucher_code = ?, total_price = ?, deposit_amount = ?, paid_amount = ?, remaining_amount = ?, status = ?, payment_status = ?, payment_method = ?, weeks_count = ?, booking_mode = ?, note = ?, expires_at = ?, created_at = NOW() WHERE id = ?");
            $updatePendingStmt->execute([
                $code,
                $userId,
                $customerName,
                $phone,
                $email,
                $slot['slot_time'],
                $servicesJson,
                $appliedVoucher,
                $totalPrice,
                $depositAmount,
                $paidAmount,
                $remainingAmount,
                $bookingStatus,
                $paymentStatus,
                $paymentMethod,
                $weeksCount,
                $bookingMode,
                $note,
                $expiresAt,
                $existingBooking['id']
            ]);
            $bookingId = (int)$existingBooking['id'];
        } else {
            
            $insertStmt = $pdo->prepare("INSERT INTO bookings 
                (code, user_id, customer_name, phone, email, pitch_id, booking_date, slot_id, slot_time, services_json, voucher_code, total_price, deposit_amount, paid_amount, remaining_amount, status, payment_status, payment_method, weeks_count, booking_mode, note, expires_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

            $insertStmt->execute([
                $code,
                $userId,
                $customerName,
                $phone,
                $email,
                $pitchId,
                $date,
                $slotId,
                $slot['slot_time'],
                $servicesJson,
                $appliedVoucher,
                $totalPrice,
                $depositAmount,
                $paidAmount,
                $remainingAmount,
                $bookingStatus,
                $paymentStatus,
                $paymentMethod,
                $weeksCount,
                $bookingMode,
                $note,
                $expiresAt
            ]);

            $bookingId = (int)$pdo->lastInsertId();
        }

        $pdo->commit();

        $staffActorId = isset($walkinActor['id']) ? (int)$walkinActor['id'] : ($userId ? (int)$userId : null);
        foreach ($cleanServices as $cs) {
            deduct_service_inventory($pdo, $cs['id'], (int)$cs['quantity'], $code, (int)$cs['price'], $paymentMethod, 'Đi kèm đơn đặt sân #' . $code, $staffActorId);
        }
        if ($weeksCount >= 12) {
            deduct_service_inventory($pdo, 'SRV-WATER', 2, $code, 0, 'Tặng kèm Gói 3 tháng', 'Tặng kèm Gói 3 tháng (2 thùng nước/trận)', $staffActorId);
        } elseif ($weeksCount >= 8) {
            deduct_service_inventory($pdo, 'SRV-WATER', 1, $code, 0, 'Tặng kèm Gói 2 tháng', 'Tặng kèm Gói 2 tháng (1 thùng nước)', $staffActorId);
            deduct_service_inventory($pdo, 'SRV-BIB', 1, $code, 0, 'Tặng kèm Gói 2 tháng', 'Tặng kèm Gói 2 tháng (1 bộ áo bib)', $staffActorId);
        }

        if ($isWalkin) {
            write_audit_log(
                $pdo,
                'WALKIN_BOOKING',
                $code,
                null,
                "Tạo đơn tại quầy: {$pitch['name']} ({$date} {$slot['slot_time']}) - Tổng: {$totalPrice}đ - TT: {$paymentMethod}",
                $walkinActor ?? null
            );
        }

        $noShowCount = 0;
        try {
            $cleanPhone = preg_replace('/[^0-9]/', '', $phone);
            if ($cleanPhone !== '') {
                $nsStmt = $pdo->prepare("SELECT COUNT(*) FROM bookings WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', '') = ? AND (status = 'Khách chưa đến' OR payment_status = 'Tịch thu cọc 30%')");
                $nsStmt->execute([$cleanPhone]);
                $noShowCount = (int)$nsStmt->fetchColumn();
            }
        } catch (Exception $nsEx) {
            error_log("[NOSHOW COUNT WARN] " . $nsEx->getMessage());
        }

        json_response([
            'success' => true,
            'message' => 'Tạo đơn đặt sân thành công!',
            'data'    => [
                'id'              => $bookingId,
                'code'            => $code,
                'pitchId'         => $pitchId,
                'pitchName'       => $pitch['name'],
                'date'            => $date,
                'slotId'          => $slotId,
                'slotTime'        => $slot['slot_time'],
                'customerName'    => $customerName,
                'phone'           => $phone,
                'email'           => $email,
                'weeksCount'      => $weeksCount,
                'bookingMode'     => $bookingMode,
                'totalPrice'      => $totalPrice,
                'depositAmount'   => $depositAmount,
                'paidAmount'      => $paidAmount,
                'remainingAmount' => $remainingAmount,
                'status'          => $bookingStatus,
                'paymentStatus'   => $paymentStatus,
                'paymentMethod'   => $paymentMethod,
                'holdMinutes'     => $holdMinutes,
                'expiresAt'       => $expiresAt,
                'services'        => $cleanServices,
                'voucherCode'     => $appliedVoucher,
                'note'            => $note,
                'noShowCount'     => $noShowCount,
                'noShowWarning'   => ($noShowCount >= 2)
            ]
        ], 201);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("[BOOKING ERROR] " . $e->getMessage());
        json_response([
            'success'  => false,
            'message'  => 'Đã xảy ra sự cố khi xử lý đơn đặt sân. Vui lòng thử lại.',
            'ref_code' => 'ERR_CREATE_BOOKING'
        ], 500);
    }
}

if ($method === 'GET') {
    if ($action === 'check_phone_noshow') {
        $rawPhone = sanitize_string($_GET['phone'] ?? '', 25);
        $cleanPhone = preg_replace('/[^0-9]/', '', $rawPhone);
        if ($cleanPhone === '' || $pdo === null) {
            json_response([
                'success' => true,
                'data'    => [
                    'phone'         => $cleanPhone,
                    'noShowCount'   => 0,
                    'warning'       => false,
                    'debtCount'     => 0,
                    'debtAmount'    => 0,
                    'totalBookings' => 0
                ]
            ]);
        }
        try {
            $stmt = $pdo->prepare("SELECT
                COUNT(*) AS total_bookings,
                COALESCE(SUM(CASE WHEN status = 'Khách chưa đến' OR payment_status = 'Tịch thu cọc 30%' THEN 1 ELSE 0 END), 0) AS noshow_count,
                COALESCE(SUM(CASE WHEN remaining_amount > 0 AND status NOT IN ('Đã hủy', 'Khách chưa đến') AND payment_status NOT IN ('Đã hủy', 'Tịch thu cọc 30%', 'Đã hoàn cọc 100%', 'Bảo lưu cọc 30%', 'Phạt 50% cọc') THEN 1 ELSE 0 END), 0) AS debt_count,
                COALESCE(SUM(CASE WHEN remaining_amount > 0 AND status NOT IN ('Đã hủy', 'Khách chưa đến') AND payment_status NOT IN ('Đã hủy', 'Tịch thu cọc 30%', 'Đã hoàn cọc 100%', 'Bảo lưu cọc 30%', 'Phạt 50% cọc') THEN remaining_amount ELSE 0 END), 0) AS debt_amount
                FROM bookings
                WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', '') = ?");
            $stmt->execute([$cleanPhone]);
            $stats = $stmt->fetch();
            $noShowCount   = (int)($stats['noshow_count'] ?? 0);
            $debtCount     = (int)($stats['debt_count'] ?? 0);
            $debtAmount    = (int)($stats['debt_amount'] ?? 0);
            $totalBookings = (int)($stats['total_bookings'] ?? 0);

            json_response([
                'success' => true,
                'data'    => [
                    'phone'         => $cleanPhone,
                    'noShowCount'   => $noShowCount,
                    'warning'       => ($noShowCount >= 2),
                    'debtCount'     => $debtCount,
                    'debtAmount'    => $debtAmount,
                    'totalBookings' => $totalBookings
                ]
            ]);
        } catch (Exception $e) {
            error_log("[CHECK PHONE NOSHOW WARN] " . $e->getMessage());
            json_response([
                'success' => true,
                'data'    => [
                    'phone'         => $cleanPhone,
                    'noShowCount'   => 0,
                    'warning'       => false,
                    'debtCount'     => 0,
                    'debtAmount'    => 0,
                    'totalBookings' => 0
                ]
            ]);
        }
    }

    if ($action === 'booked_slots') {
        if ($pdo === null) {
            json_response(['success' => true, 'data' => []]);
        }
        maybe_run_auto_release_throttled($pdo, 30);
        $pitchId = sanitize_string($_GET['pitch_id'] ?? $_GET['pitchId'] ?? '', 20);
        $date = sanitize_string($_GET['date'] ?? date('Y-m-d'), 15);
        $currentUser = $_SESSION['user'] ?? null;
        $isStaffOrAdmin = is_portal_operator($currentUser);

        if (!empty($pitchId)) {
            $stmt = $pdo->prepare("SELECT code, pitch_id, slot_id, slot_time, status, payment_status, customer_name, phone
                                   FROM bookings
                                   WHERE pitch_id = ? AND booking_date = ?
                                     AND status NOT IN ('Đã hủy', 'Khách chưa đến')
                                     AND payment_status NOT IN ('Đã hủy', 'Tịch thu cọc 30%', 'Đã hoàn cọc 100%', 'Bảo lưu cọc 30%', 'Phạt 50% cọc')
                                   ORDER BY slot_id ASC");
            $stmt->execute([$pitchId, $date]);
        } else {
            $stmt = $pdo->prepare("SELECT code, pitch_id, slot_id, slot_time, status, payment_status, customer_name, phone
                                   FROM bookings
                                   WHERE booking_date = ?
                                     AND status NOT IN ('Đã hủy', 'Khách chưa đến')
                                     AND payment_status NOT IN ('Đã hủy', 'Tịch thu cọc 30%', 'Đã hoàn cọc 100%', 'Bảo lưu cọc 30%', 'Phạt 50% cọc')
                                   ORDER BY pitch_id ASC, slot_id ASC");
            $stmt->execute([$date]);
        }

        $rows = $stmt->fetchAll();
        $slots = [];
        foreach ($rows as $r) {
            $entry = [
                'code'          => $r['code'],
                'pitchId'       => $r['pitch_id'],
                'slotId'        => $r['slot_id'],
                'slotTime'      => $r['slot_time'],
                'status'        => $r['status'],
                'paymentStatus' => $r['payment_status']
            ];
            if ($isStaffOrAdmin) {
                $entry['customerName'] = $r['customer_name'];
                $entry['phone'] = $r['phone'];
            }
            $slots[] = $entry;
        }
        json_response(['success' => true, 'data' => $slots]);
    }

    $code = sanitize_string($_GET['code'] ?? '', 40);

    if (!empty($code)) {
        if ($pdo === null) {
            json_error('Không tìm thấy đơn đặt sân tương ứng.', 404, 'ERR_NOT_FOUND');
        }
        $stmt = $pdo->prepare("SELECT b.*, p.name as pitch_name, p.type_name, p.variant 
                               FROM bookings b 
                               JOIN pitches p ON b.pitch_id = p.id 
                               WHERE b.code = ? LIMIT 1");
        $stmt->execute([$code]);
        $booking = $stmt->fetch();

        if (!$booking) {
            json_response([
                'success'  => false,
                'message'  => 'Không tìm thấy đơn đặt sân tương ứng.',
                'ref_code' => 'ERR_NOT_FOUND'
            ], 404);
        }

        if (!empty($_SESSION['user_id'])) {
            $refreshed = refresh_session_user($pdo);
            if (is_array($refreshed) && !empty($refreshed['_locked'])) {
                json_error('Tài khoản của bạn đã bị Chủ sân tạm khóa. Vui lòng liên hệ Quản trị viên.', 403, 'ERR_ACCOUNT_LOCKED');
            }
        }
        $currentUser = $_SESSION['user'] ?? null;
        if ($currentUser && !is_portal_operator($currentUser)) {
            $userPhone = preg_replace('/\s+/', '', (string)($currentUser['phone'] ?? ''));
            $bookPhone = preg_replace('/\s+/', '', (string)($booking['phone'] ?? ''));
            $ownsById = !empty($booking['user_id']) && ((int)$booking['user_id'] === (int)$currentUser['id']);
            $ownsByPhone = ($userPhone !== '' && $bookPhone !== '' && $userPhone === $bookPhone);
            if (!$ownsById && !$ownsByPhone) {
                json_response([
                    'success'  => false,
                    'message'  => 'Bạn không có quyền xem thông tin đơn đặt sân của khách hàng khác.',
                    'ref_code' => 'ERR_IDOR_BLOCKED'
                ], 403);
            }
        } elseif (!$currentUser) {
            
            if (!empty($booking['phone']) && strlen($booking['phone']) >= 7) {
                $booking['phone'] = substr($booking['phone'], 0, 4) . '***' . substr($booking['phone'], -3);
            }
            if (!empty($booking['email']) && strpos($booking['email'], '@') !== false) {
                $parts = explode('@', $booking['email']);
                $booking['email'] = substr($parts[0], 0, 1) . '***@' . $parts[1];
            }
        }

        $booking = map_booking_row($booking);

        json_response([
            'success' => true,
            'data'    => $booking
        ]);
    }

    if ($action === 'by_date' || $action === 'admin_list' || $action === 'today_bookings') {
        $actor = require_staff_or_admin($pdo);
        if ($pdo === null) {
            json_response(['success' => true, 'data' => []]);
        }
        $filterDate = sanitize_string($_GET['date'] ?? date('Y-m-d'), 15);
        $stmt = $pdo->prepare("SELECT b.*, p.name as pitch_name, p.type_name, p.variant 
                               FROM bookings b 
                               JOIN pitches p ON b.pitch_id = p.id 
                               WHERE b.booking_date = ? 
                               ORDER BY b.slot_time ASC, b.id DESC");
        $stmt->execute([$filterDate]);
        $list = $stmt->fetchAll();
        foreach ($list as &$item) {
            $item = map_booking_row($item);
        }
        json_response(['success' => true, 'data' => $list]);
    }

    $currentUser = require_auth($pdo);
    if ($pdo === null) {
        json_response([
            'success' => true,
            'data'    => []
        ]);
    }
    $stmt = $pdo->prepare("SELECT b.*, p.name as pitch_name, p.type_name, p.variant 
                           FROM bookings b 
                           JOIN pitches p ON b.pitch_id = p.id 
                           WHERE b.user_id = ? OR b.phone = ? 
                           ORDER BY b.id DESC LIMIT 50");
    $stmt->execute([$currentUser['id'], $currentUser['phone']]);
    $list = $stmt->fetchAll();

    foreach ($list as &$item) {
        $item = map_booking_row($item);
    }

    json_response([
        'success' => true,
        'data'    => $list
    ]);
}

json_response([
    'success'  => false,
    'message'  => 'Phương thức không được hỗ trợ.',
    'ref_code' => 'ERR_METHOD_NOT_ALLOWED'
], 405);
