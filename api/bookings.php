<?php

require_once __DIR__ . '/security_helper.php';
require_once __DIR__ . '/notification_helper.php';

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
}

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

    $hasGiftDeducted = db_table_has_column($pdo, 'bookings', 'gift_deducted');
    $stmt = $pdo->prepare("UPDATE bookings SET status = 'Đang đá' WHERE code = ?");
    $stmt->execute([$code]);

    write_audit_log($pdo, 'CHECKIN', $code, $oldStatus, 'Đang đá', $actor);

    // Xuất quà tặng gói tháng/quý DUY NHẤT 1 LẦN tại quầy khi checkin
    if ($oldRow) {
        $weeks = (int)($oldRow['weeks_count'] ?? 1);
        if ($weeks >= 8) {
            $canDeductGift = true;
            if ($hasGiftDeducted) {
                $updGift = $pdo->prepare("UPDATE bookings SET gift_deducted = 1 WHERE code = ? AND (gift_deducted = 0 OR gift_deducted IS NULL)");
                $updGift->execute([$code]);
                $canDeductGift = ($updGift->rowCount() > 0);
            }
            if ($canDeductGift) {
                try {
                    $chkGift = $pdo->prepare("SELECT COUNT(*) FROM service_sales WHERE booking_code = ? AND service_id = 'SRV-WATER' AND note LIKE '%Tặng kèm Gói%'");
                    $chkGift->execute([$code]);
                    if ((int)$chkGift->fetchColumn() === 0) {
                        if ($weeks >= 12) {
                            deduct_service_inventory($pdo, 'SRV-WATER', 2, $code, 0, 'Tặng kèm Gói 3 tháng', 'Xuất 2 thùng nước miễn phí khi check-in Gói 3 tháng', $actor['id'] ?? null);
                        } else {
                            deduct_service_inventory($pdo, 'SRV-WATER', 1, $code, 0, 'Tặng kèm Gói 2 tháng', 'Xuất 1 thùng nước miễn phí khi check-in Gói 2 tháng', $actor['id'] ?? null);
                            deduct_service_inventory($pdo, 'SRV-BIB', 1, $code, 0, 'Tặng kèm Gói 2 tháng', 'Xuất 1 bộ áo bib miễn phí khi check-in Gói 2 tháng', $actor['id'] ?? null);
                        }
                    }
                } catch (Exception $giftEx) {
                    error_log("[CHECKIN GIFT WARN] " . $giftEx->getMessage());
                }
            }
        }
    }

    json_response([
        'success' => true,
        'message' => 'Check-in nhận sân thành công! Ca đá đã bắt đầu.',
        'data'    => ['code' => $code, 'status' => 'Đang đá', 'paymentStatus' => $oldRow['payment_status'] ?? 'Đã cọc 30%']
    ]);
}

if ($method === 'POST' && $action === 'join_waitlist') {
    $pitchId = sanitize_string($data['pitch_id'] ?? $data['pitchId'] ?? '', 20);
    $date = sanitize_string($data['booking_date'] ?? $data['date'] ?? '', 20);
    $slotId = sanitize_string($data['slot_id'] ?? $data['slotId'] ?? '', 10);
    $customerName = sanitize_string($data['customer_name'] ?? $data['customerName'] ?? '', 100);
    $phone = normalize_phone(sanitize_string($data['phone'] ?? '', 25));
    $note = sanitize_string($data['note'] ?? '', 255);

    if (empty($pitchId) || empty($date) || empty($slotId) || empty($customerName) || empty($phone)) {
        json_error('Vui lòng điền đầy đủ sân, ngày, khung giờ, họ tên và số điện thoại để đăng ký chờ.', 400, 'ERR_WAITLIST_PARAMS');
    }

    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) || strtotime($date) < strtotime(date('Y-m-d'))) {
        json_error('Ngày đăng ký danh sách chờ không hợp lệ hoặc đã qua.', 400, 'ERR_INVALID_DATE');
    }

    if (!preg_match('/^0[0-9]{9,10}$/', $phone)) {
        json_error('Số điện thoại không hợp lệ (cần 10-11 chữ số).', 400, 'ERR_INVALID_PHONE');
    }

    if ($pdo !== null) {
        if (!check_rate_limit($pdo, 'join_waitlist', 8, 300)) {
            json_error('Bạn thao tác đăng ký chờ quá nhanh. Vui lòng thử lại sau ít phút.', 429, 'ERR_RATE_LIMITED');
        }
        increment_rate_limit($pdo, 'join_waitlist');

        if (is_phone_blacklisted($pdo, $phone)) {
            json_error('Số điện thoại này hiện đang bị tạm khóa quyền đặt sân do lịch sử vi phạm chính sách.', 403, 'ERR_BLACKLISTED');
        }

        $chkStmt = $pdo->prepare("
            SELECT id FROM waitlist
            WHERE pitch_id = ? AND booking_date = ? AND slot_id = ?
              AND REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', '') = ?
              AND status IN ('waiting', 'notified')
            LIMIT 1
        ");
        $chkStmt->execute([$pitchId, $date, $slotId, $phone]);
        if ($chkStmt->fetchColumn()) {
            json_response([
                'success' => true,
                'message' => 'Bạn đã đăng ký vào danh sách chờ cho ca đá này rồi. Chúng tôi sẽ thông báo ngay khi có sân trống!'
            ]);
        }

        $currentUser = get_authenticated_user($pdo);
        $userId = $currentUser ? $currentUser['id'] : null;

        $stmt = $pdo->prepare("
            INSERT INTO waitlist (pitch_id, booking_date, slot_id, customer_name, phone, user_id, status, note, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'waiting', ?, NOW())
        ");
        $stmt->execute([$pitchId, $date, $slotId, $customerName, $phone, $userId, $note]);

        $tgMsg = "📋 <b>KHÁCH ĐĂNG KÝ DANH SÁCH CHỜ</b>\n"
               . "• Khách: <b>" . tg_escape($customerName) . "</b> (" . tg_escape($phone) . ")\n"
               . "• Sân: <b>" . tg_escape($pitchId) . "</b> | Ngày: <b>" . date('d/m/Y', strtotime($date)) . "</b> | Slot: <b>" . tg_escape($slotId) . "</b>\n"
               . "• Ghi chú: " . tg_escape($note ?: 'Không có');
        send_telegram_notification($tgMsg, 'waitlist', $pdo);
    }

    json_response([
        'success' => true,
        'message' => 'Đăng ký vào danh sách chờ thành công! Hệ thống sẽ ưu tiên báo cho bạn ngay khi có người nhả sân.'
    ]);
}

if ($method === 'POST' && $action === 'early_cancel') {
    $currentUser = require_auth($pdo);
    $code = sanitize_string($data['code'] ?? $_GET['code'] ?? '', 40);
    $rawReason = trim((string)($data['reason'] ?? ''));
    $reason = $rawReason !== '' ? sanitize_string($rawReason, 200) : 'Hủy lịch trước thời hạn';
    if (empty($code)) {
        json_error('Thiếu mã đơn đặt sân.', 400, 'ERR_MISSING_CODE');
    }

    $isManagerOrAdmin = is_array($currentUser) && in_array($currentUser['role'] ?? '', ['admin', 'manager'], true);
    // Chỉ manager/admin mới được chọn policy khác 'auto'; staff & user dùng auto
    $requestedPolicy = $isManagerOrAdmin ? sanitize_string($data['policy'] ?? 'auto', 30) : 'auto';

    if ($pdo === null) {
        if ($rawReason === '') {
            json_error('Đơn đã thu tiền/đặt cọc bắt buộc phải nhập lý do hủy!', 400, 'ERR_CANCEL_REASON_REQUIRED');
        }
        $payStatus = 'Đã hoàn cọc 100%';
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
    if (in_array((string)($bookingRow['status'] ?? ''), ['Đã hủy', 'Khách chưa đến', 'Hoàn thành', 'Đang đá'], true)) {
        json_error('Trạng thái đơn hiện tại không thể thực hiện thao tác hủy này.', 400, 'ERR_INVALID_BOOKING_STATE');
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
    if (!$isManagerOrAdmin || $requestedPolicy === '' || $requestedPolicy === 'auto') {
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

    // Nếu đơn chưa trả tiền (paid_amount == 0) mà hủy -> hoàn lượt voucher & điểm tích lũy
    if ((int)($bookingRow['paid_amount'] ?? 0) === 0) {
        if (!empty($bookingRow['voucher_code']) && db_table_has_column($pdo, 'vouchers', 'used_count')) {
            try {
                $pdo->prepare("UPDATE vouchers SET used_count = GREATEST(0, used_count - 1) WHERE code = ?")->execute([$bookingRow['voucher_code']]);
            } catch (Throwable $ve) {}
        }
        $ptsUsed = (int)($bookingRow['points_used'] ?? 0);
        $bUid = (int)($bookingRow['user_id'] ?? 0);
        if ($ptsUsed > 0 && $bUid > 0 && db_table_has_column($pdo, 'users', 'points')) {
            try {
                $pdo->prepare("UPDATE users SET points = IFNULL(points, 0) + ? WHERE id = ?")->execute([$ptsUsed, $bUid]);
            } catch (Throwable $pe) {}
        }
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

    // Gửi Telegram & thông báo khách khi hủy đơn
    $tgMsg = "⚠️ <b>ĐƠN ĐẶT SÂN BỊ HỦY</b>\n"
           . "• Mã vé: <code>" . tg_escape($code) . "</code>\n"
           . "• Khách: <b>" . tg_escape($bookingRow['customer_name'] ?? '') . "</b> (" . tg_escape($bookingRow['phone'] ?? '') . ")\n"
           . "• Sân: <b>" . tg_escape($bookingRow['pitch_id'] ?? '') . "</b> ngày <b>" . date('d/m/Y', strtotime($bookingRow['booking_date'])) . "</b> (" . tg_escape($bookingRow['slot_time'] ?? '') . ")\n"
           . "• Chính sách: <b>" . tg_escape($payStatus) . "</b> | Hoàn: " . number_format($refundAmount) . " đ\n"
           . "• Lý do: <i>" . tg_escape($reason) . "</i>";
    send_telegram_notification($tgMsg, 'cancel', $pdo);

    $pNameStmt = $pdo->prepare("SELECT name FROM pitches WHERE id = ? LIMIT 1");
    $pNameStmt->execute([$bookingRow['pitch_id']]);
    $cancelPitchName = (string)($pNameStmt->fetchColumn() ?: $bookingRow['pitch_id']);
    send_customer_notification($pdo, 'cancel_booking', [
        'booking_id'    => (int)$bookingRow['id'],
        'booking_code'  => $code,
        'code'          => $code,
        'customer_name' => (string)$bookingRow['customer_name'],
        'phone'         => (string)$bookingRow['phone'],
        'pitch_name'    => $cancelPitchName,
        'date'          => date('d/m/Y', strtotime((string)$bookingRow['booking_date'])),
        'slot_time'     => (string)$bookingRow['slot_time'],
        'reason'        => $reason
    ]);

    // Kích hoạt thông báo danh sách chờ nếu có người chờ ca này (ưu tiên theo thứ tự đăng ký + hết hạn giữ chỗ)
    trigger_waitlist_notification(
        $pdo,
        (string)$bookingRow['pitch_id'],
        (string)$bookingRow['booking_date'],
        (string)$bookingRow['slot_id'],
        (string)($bookingRow['slot_time'] ?? ''),
        $currentUser,
        $code
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
    $oldStmt = $pdo->prepare("SELECT id, code, pitch_id, booking_date, slot_id, slot_time, customer_name, phone, status, payment_status FROM bookings WHERE code = ? LIMIT 1");
    $oldStmt->execute([$code]);
    $oldRow = $oldStmt->fetch();
    $oldStatus = $oldRow ? ($oldRow['status'] . ' (' . $oldRow['payment_status'] . ')') : 'Đã xác nhận';

    $stmt = $pdo->prepare("UPDATE bookings SET status = 'Khách chưa đến', payment_status = 'Tịch thu cọc 30%', remaining_amount = 0, cancel_policy_applied = 'noshow_forfeit', refund_amount = 0, note = CONCAT(IFNULL(note,''), ' [Quá 15p khách chưa đến - Đã nhả sân trống]') WHERE code = ?");
    $stmt->execute([$code]);

    write_audit_log($pdo, 'NOSHOW_RELEASE', $code, $oldStatus, 'Khách chưa đến (Tịch thu cọc 30%)', $actor);

    if ($oldRow) {
        $tgMsg = "⚠️ <b>KHÁCH KHÔNG ĐẾN (NO-SHOW NHẢ SÂN)</b>\n"
               . "• Mã vé: <code>" . tg_escape($code) . "</code>\n"
               . "• Khách: <b>" . tg_escape($oldRow['customer_name'] ?? '') . "</b> (" . tg_escape($oldRow['phone'] ?? '') . ")\n"
               . "• Sân: <b>" . tg_escape($oldRow['pitch_id'] ?? '') . "</b> ngày <b>" . date('d/m/Y', strtotime($oldRow['booking_date'])) . "</b> (" . tg_escape($oldRow['slot_time'] ?? '') . ")";
        send_telegram_notification($tgMsg, 'cancel', $pdo);

        trigger_waitlist_notification(
            $pdo,
            (string)$oldRow['pitch_id'],
            (string)$oldRow['booking_date'],
            (string)$oldRow['slot_id'],
            (string)($oldRow['slot_time'] ?? ''),
            $actor,
            $code
        );
    }

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
    $pdo->beginTransaction();
    try {
        $oldStmt = $pdo->prepare("SELECT id, code, pitch_id, booking_date, slot_id, status, payment_status FROM bookings WHERE code = ? LIMIT 1 FOR UPDATE");
        $oldStmt->execute([$code]);
        $oldRow = $oldStmt->fetch();
        if (!$oldRow) {
            $pdo->rollBack();
            json_error('Không tìm thấy đơn đặt sân cần khôi phục.', 404, 'ERR_NOT_FOUND');
        }
        $oldStatus = $oldRow['status'] . ' (' . $oldRow['payment_status'] . ')';
        if (!in_array((string)$oldRow['status'], ['Đã hủy', 'Khách chưa đến'], true)) {
            $pdo->rollBack();
            json_error('Đơn này hiện đang ở trạng thái hoạt động, không cần khôi phục.', 400, 'ERR_INVALID_BOOKING_STATE');
        }

        $dupStmt = $pdo->prepare("
            SELECT code FROM bookings
            WHERE pitch_id = ? AND booking_date = ? AND slot_id = ? AND code <> ?
              AND status NOT IN ('Đã hủy', 'Khách chưa đến')
              AND payment_status NOT IN ('Đã hủy', 'Tịch thu cọc 30%', 'Đã hoàn cọc 100%', 'Bảo lưu cọc 30%', 'Phạt 50% cọc')
            LIMIT 1 FOR UPDATE
        ");
        $dupStmt->execute([$oldRow['pitch_id'], $oldRow['booking_date'], $oldRow['slot_id'], $code]);
        $conflictCode = $dupStmt->fetchColumn();
        if ($conflictCode) {
            $pdo->rollBack();
            json_error("Khung giờ này đã được đặt bởi đơn khác ({$conflictCode}), không thể khôi phục.", 409, 'ERR_SLOT_CONFLICT');
        }

        $stmt = $pdo->prepare("UPDATE bookings SET status = 'Đã xác nhận', payment_status = 'Đã cọc 30%', remaining_amount = GREATEST(0, total_price - deposit_amount), note = CONCAT(IFNULL(note,''), ' [Đã khôi phục lại ca đá]') WHERE code = ?");
        $stmt->execute([$code]);

        write_audit_log($pdo, 'RESTORE_BOOKING', $code, $oldStatus, 'Đã xác nhận (Đã cọc 30%)', $actor);
        $pdo->commit();
    } catch (Throwable $rx) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('[RESTORE BOOKING ERROR] ' . $rx->getMessage());
        json_error('Không thể khôi phục ca đá lúc này.', 500, 'ERR_RESTORE_FAILED');
    }

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
    } else {
        $consent = !empty($data['privacy_consent']) || !empty($data['privacyConsent']);
        if (!$consent) {
            json_response([
                'success'  => false,
                'message'  => 'Vui lòng đọc và tích chọn đồng ý với Chính sách bảo mật & Điều khoản dịch vụ khi đặt sân trực tuyến.',
                'ref_code' => 'ERR_PRIVACY_CONSENT_REQUIRED'
            ], 422);
        }

        $turnstileToken = $data['turnstile_token'] ?? $data['cf-turnstile-response'] ?? null;
        if (!verify_turnstile_if_configured($turnstileToken)) {
            json_response([
                'success'  => false,
                'message'  => 'Xác thực Turnstile (chống bot) không thành công. Vui lòng tải lại trang và thử lại.',
                'ref_code' => 'ERR_BOT_CHECK_FAILED'
            ], 400);
        }

        if (!check_rate_limit($pdo, 'create_booking', 10, 300)) {
            json_response([
                'success'  => false,
                'message'  => 'Bạn thao tác quá nhanh. Vui lòng thử lại sau vài phút.',
                'ref_code' => 'ERR_RATE_LIMITED'
            ], 429);
        }
        increment_rate_limit($pdo, 'create_booking');
    }

    $customerName = sanitize_string($data['customerName'] ?? $data['customer_name'] ?? '', 100);
    $phone = normalize_phone(sanitize_string($data['phone'] ?? '', 25));
    $email = filter_var($data['email'] ?? 'khachhang@sanbongpro.vn', FILTER_VALIDATE_EMAIL) ?: 'khachhang@sanbongpro.vn';
    $pitchId = sanitize_string($data['pitchId'] ?? $data['pitch_id'] ?? '', 20);
    $date = sanitize_string($data['date'] ?? $data['booking_date'] ?? '', 15);
    $slotId = sanitize_string($data['slotId'] ?? $data['slot_id'] ?? '', 10);
    $servicesInput = is_array($data['services'] ?? null) ? $data['services'] : [];
    $voucherCode = strtoupper(sanitize_string($data['voucherCode'] ?? $data['voucher_code'] ?? '', 30));
    $note = sanitize_string($data['note'] ?? '', 255);
    $paymentMethod = sanitize_string($data['paymentMethod'] ?? $data['payment_method'] ?? 'VietQR Chuyển khoản', 50);

    // Gói tháng/quý: chỉ cho phép 1, 4, 8, 12 tuần
    $rawWeeks = (int)($data['weeksCount'] ?? $data['weeks_count'] ?? 1);
    $weeksCount = in_array($rawWeeks, [1, 4, 8, 12], true) ? $rawWeeks : 1;
    $bookingMode = sanitize_string($data['bookingMode'] ?? $data['booking_mode'] ?? ($weeksCount >= 12 ? 'quarterly' : ($weeksCount >= 4 ? 'monthly' : 'single')), 20);
    $payFull = !empty($data['payFull']) || !empty($data['pay_full']);

    // Rate limit theo số điện thoại (4 đơn / 600s) cho đơn online
    if (!$isWalkin && $phone !== '') {
        if (!check_rate_limit($pdo, 'create_booking_phone', 4, 600, $phone)) {
            json_response([
                'success'  => false,
                'message'  => 'Số điện thoại này đang tạo đơn quá nhanh. Vui lòng thử lại sau 10 phút.',
                'ref_code' => 'ERR_RATE_LIMITED'
            ], 429);
        }
        increment_rate_limit($pdo, 'create_booking_phone', $phone);
    }

    // Chặn spam giữ chỗ: tối đa 2 đơn chờ cọc chưa thanh toán cho mỗi SĐT
    if (!$isWalkin && $pdo !== null && $phone !== '') {
        try {
            $cleanPh = preg_replace('/[^0-9]/', '', $phone);
            $holdStmt = $pdo->prepare("
                SELECT COUNT(*) FROM bookings
                WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', '') = ?
                  AND payment_status IN ('Chờ duyệt cọc', 'Chờ cọc 30%')
                  AND (paid_amount = 0 OR paid_amount IS NULL)
                  AND status NOT IN ('Đã hủy', 'Khách chưa đến')
            ");
            $holdStmt->execute([$cleanPh]);
            if ((int)$holdStmt->fetchColumn() >= 2) {
                json_response([
                    'success'  => false,
                    'message'  => 'Bạn đang có 2 đơn đặt sân chờ thanh toán cọc. Vui lòng hoàn tất thanh toán hoặc chờ đơn hết hạn trước khi tạo thêm.',
                    'ref_code' => 'ERR_TOO_MANY_PENDING_BOOKINGS'
                ], 429);
            }
        } catch (Throwable $phEx) {
            error_log("[PENDING HOLD CHECK WARN] " . $phEx->getMessage());
        }
    }

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

    if (!preg_match('/^0[0-9]{9,10}$/', $phone)) {
        json_response([
            'success'  => false,
            'message'  => 'Số điện thoại không hợp lệ (cần đúng định dạng 10-11 chữ số Việt Nam).',
            'ref_code' => 'ERR_INVALID_PHONE'
        ], 400);
    }

    $bookingDateTime = preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) ? strtotime($date) : false;
    $today = strtotime(date('Y-m-d'));
    if (!$bookingDateTime || (!$isWalkin && $bookingDateTime < $today)) {
        json_response([
            'success'  => false,
            'message'  => 'Ngày đặt sân không hợp lệ hoặc đã qua.',
            'ref_code' => 'ERR_INVALID_DATE'
        ], 400);
    }

    // Chống ghi đè/gia hạn giữ chỗ vô hạn: Server LUÔN tự sinh mã đơn vé mới ngẫu nhiên
    if (stripos($pitchId, 'P5') === 0) {
        $prefix = 'ASFF';
    } elseif (stripos($pitchId, 'P11') === 0) {
        $prefix = 'ASFE';
    } else {
        $prefix = 'ASFS';
    }
    $code = $prefix . random_int(100000, 999999);

    // Ghi nhớ mã đơn vào session để cấp quyền xem (chống IDOR cho khách vãng lai)
    if (!isset($_SESSION['owned_booking_codes']) || !is_array($_SESSION['owned_booking_codes'])) {
        $_SESSION['owned_booking_codes'] = [];
    }
    $_SESSION['owned_booking_codes'][] = $code;

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
                'originalPrice'   => $subtotal,
                'discountAmount'  => $discountAmount,
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

        // Kiểm tra trùng lịch và lịch bảo trì cho TOÀN BỘ các tuần (weeksCount)
        for ($k = 0; $k < $weeksCount; $k++) {
            $checkDate = date('Y-m-d', strtotime("+{$k} week", $bookingDateTime));

            $checkDuplicateStmt = $pdo->prepare("
                SELECT code FROM bookings
                WHERE pitch_id = ? AND booking_date = ? AND slot_id = ?
                  AND status NOT IN ('Đã hủy', 'Khách chưa đến')
                  AND payment_status NOT IN ('Đã hủy', 'Tịch thu cọc 30%', 'Đã hoàn cọc 100%', 'Bảo lưu cọc 30%', 'Phạt 50% cọc')
                LIMIT 1 FOR UPDATE
            ");
            $checkDuplicateStmt->execute([$pitchId, $checkDate, $slotId]);
            $existingBusyCode = $checkDuplicateStmt->fetchColumn();

            if ($existingBusyCode) {
                $pdo->rollBack();
                $weekNote = ($weeksCount > 1) ? (" (buổi tuần thứ " . ($k + 1) . ")") : "";
                json_response([
                    'success'  => false,
                    'message'  => "Khung giờ {$slot['slot_time']} ngày {$checkDate}{$weekNote} tại {$pitch['name']} đã có đơn đặt trước (#{$existingBusyCode}). Vui lòng chọn khung giờ khác!",
                    'ref_code' => 'ERR_DOUBLE_BOOKING'
                ], 409);
            }

            // Kiểm tra lịch bảo trì định kỳ theo ngày & khung giờ cho từng tuần
            $maintRow = find_active_maintenance_for_slot($pdo, $pitchId, $checkDate, (string)$slot['slot_time']);
            if ($maintRow) {
                $pdo->rollBack();
                $mRange = trim(($maintRow['start_time'] ?? '05:30') . ' - ' . ($maintRow['end_time'] ?? '23:00'));
                $weekNote = ($weeksCount > 1) ? (" ngày {$checkDate} (tuần " . ($k + 1) . ")") : "";
                json_error("Sân bóng đang có lịch bảo trì{$weekNote} ({$mRange}): {$maintRow['reason']}. Vui lòng chọn khung giờ hoặc sân khác.", 400, 'ERR_PITCH_MAINTENANCE');
            }
        }

        // Kiểm tra danh sách đen khách hàng (customer_crm) bằng SĐT đã chuẩn hóa
        if (is_phone_blacklisted($pdo, $phone)) {
            $pdo->rollBack();
            json_error('Số điện thoại này hiện đang bị tạm khóa quyền đặt sân do lịch sử vi phạm chính sách. Vui lòng liên hệ hotline để được hỗ trợ.', 403, 'ERR_BLACKLISTED');
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
        $pitchPriceBeforeRule = (int)round($basePrice * ($duration ?: 1.0) * $weeksCount * (1 - $packageDiscountRate));

        // Áp dụng quy tắc Giá giờ vàng / Giảm giá theo khung giờ (golden_hour_rules - ưu tiên rule cụ thể nhất)
        $ghDay = (int)date('N', $bookingDateTime); // 1=T2 .. 7=CN
        $ghEval = resolve_golden_hour_adjustment($pdo, (int)$pitch['type'], $ghDay, $slotId, $pitchPriceBeforeRule);
        $pitchPrice = (int)$ghEval['adjustedPitchPrice'];
        $appliedGoldenHourRule = $ghEval['rule'] ? [
            'id'              => (int)$ghEval['rule']['id'],
            'ruleName'        => (string)$ghEval['rule']['rule_name'],
            'adjustmentType'  => (string)$ghEval['rule']['price_adjustment_type'],
            'adjustmentValue' => (int)$ghEval['rule']['adjustment_value'],
            'delta'           => (int)$ghEval['delta']
        ] : null;

        $totalServicesPrice = 0;
        $cleanServices = [];
        if (!empty($servicesInput)) {
            $serviceIds = array_values(array_unique(array_filter(array_map(function ($item) {
                return trim((string)($item['id'] ?? ''));
            }, $servicesInput))));
            if (!empty($serviceIds)) {
                $placeholders = implode(',', array_fill(0, count($serviceIds), '?'));
                $srvStmt = $pdo->prepare("SELECT id, name, price, unit, stock_qty, track_inventory FROM extra_services WHERE is_active = 1 AND id IN ($placeholders) FOR UPDATE");
                $srvStmt->execute($serviceIds);
                $dbServices = $srvStmt->fetchAll(PDO::FETCH_UNIQUE);

                $requestedTotals = [];
                foreach ($servicesInput as $s) {
                    $sId = trim((string)($s['id'] ?? ''));
                    $sQty = max(1, min(100, (int)($s['quantity'] ?? 1)));
                    if (!isset($dbServices[$sId])) {
                        continue;
                    }
                    $requestedTotals[$sId] = ($requestedTotals[$sId] ?? 0) + $sQty;
                }

                foreach ($requestedTotals as $sId => $reqTotalQty) {
                    $srvRow = $dbServices[$sId];
                    if ((int)($srvRow['track_inventory'] ?? 1) === 1 && (int)($srvRow['stock_qty'] ?? 0) < $reqTotalQty) {
                        $pdo->rollBack();
                        json_error("Sản phẩm/dịch vụ '{$srvRow['name']}' chỉ còn " . (int)$srvRow['stock_qty'] . " {$srvRow['unit']} trong kho, không đủ số lượng yêu cầu.", 409, 'ERR_OUT_OF_STOCK');
                    }
                }

                foreach ($servicesInput as $s) {
                    $sId = trim((string)($s['id'] ?? ''));
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

        $userId = $_SESSION['user_id'] ?? null;

        // Xử lý đổi điểm tích lũy (chỉ cho phép khi đã đăng nhập)
        $redeemedBottles = max(0, min(20, (int)($data['redeemedBottles'] ?? $data['redeemed_bottles'] ?? 0)));
        $pointsUsed = 0;
        if ($redeemedBottles > 0) {
            if (!$userId) {
                $pdo->rollBack();
                json_error('Bạn cần đăng nhập tài khoản để đổi điểm tích lũy lấy nước suối.', 403, 'ERR_UNAUTHORIZED');
            }
            $pointsUsed = $redeemedBottles * 50;
            if (db_table_has_column($pdo, 'users', 'points')) {
                $ptStmt = $pdo->prepare("UPDATE users SET points = points - ? WHERE id = ? AND points >= ?");
                $ptStmt->execute([$pointsUsed, $userId, $pointsUsed]);
                if ($ptStmt->rowCount() <= 0) {
                    $pdo->rollBack();
                    json_error('Số điểm tích lũy của bạn không đủ để đổi ' . $redeemedBottles . ' chai nước.', 400, 'ERR_INSUFFICIENT_POINTS');
                }
            }
            $cleanServices[] = [
                'id'       => 'SRV-WATER-BOTTLE',
                'name'     => 'Nước suối (Đổi điểm tích lũy)',
                'price'    => 0,
                'quantity' => $redeemedBottles,
                'unit'     => 'chai',
                'total'    => 0
            ];
        }

        $subtotal = $pitchPrice + $totalServicesPrice;

        $voucherDiscountAmount = 0;
        $appliedVoucher = null;
        if ($voucherCode !== '') {
            $vStmt = $pdo->prepare("SELECT * FROM vouchers WHERE code = ? LIMIT 1 FOR UPDATE");
            $vStmt->execute([$voucherCode]);
            $vData = $vStmt->fetch(PDO::FETCH_ASSOC);
            if (!$vData || (int)$vData['is_active'] !== 1) {
                $pdo->rollBack();
                json_error('Mã giảm giá không tồn tại hoặc đã ngừng áp dụng.', 400, 'ERR_INVALID_VOUCHER');
            }
            $nowDate = date('Y-m-d');
            if ((!empty($vData['valid_from']) && $nowDate < $vData['valid_from']) || (!empty($vData['valid_to']) && $nowDate > $vData['valid_to'])) {
                $pdo->rollBack();
                json_error('Mã giảm giá chưa đến ngày áp dụng hoặc đã hết hạn.', 400, 'ERR_INVALID_VOUCHER');
            }
            if (!empty($vData['pitch_type_limit']) && (int)$vData['pitch_type_limit'] !== (int)$pitch['type']) {
                $pdo->rollBack();
                json_error('Mã giảm giá này chỉ áp dụng riêng cho Sân ' . (int)$vData['pitch_type_limit'] . ' người.', 400, 'ERR_INVALID_VOUCHER');
            }
            if ((int)($vData['max_usage'] ?? 0) > 0 && (int)($vData['used_count'] ?? 0) >= (int)$vData['max_usage']) {
                $pdo->rollBack();
                json_error('Mã giảm giá đã hết lượt sử dụng.', 400, 'ERR_INVALID_VOUCHER');
            }
            if ($subtotal < (int)($vData['min_order'] ?? 0)) {
                $pdo->rollBack();
                json_error('Đơn hàng chưa đạt giá trị tối thiểu (' . number_format((int)$vData['min_order']) . 'đ) để dùng mã này.', 400, 'ERR_INVALID_VOUCHER');
            }

            // Kiểm tra giới hạn mỗi khách hàng max_per_user (nếu có)
            $maxPerUser = (int)($vData['max_per_user'] ?? 0);
            if ($maxPerUser > 0) {
                $cleanCheckPhone = preg_replace('/[^0-9]/', '', $phone);
                $uLimitSql = "
                    SELECT COUNT(*) FROM bookings
                    WHERE voucher_code = ?
                      AND (REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', '') = ? " . ($userId ? "OR user_id = ?" : "") . ")
                      AND status NOT IN ('Đã hủy', 'Khách chưa đến')
                ";
                $uLimitParams = [$voucherCode, $cleanCheckPhone];
                if ($userId) {
                    $uLimitParams[] = $userId;
                }
                $uLimitStmt = $pdo->prepare($uLimitSql);
                $uLimitStmt->execute($uLimitParams);
                if ((int)$uLimitStmt->fetchColumn() >= $maxPerUser) {
                    $pdo->rollBack();
                    json_error('Bạn đã sử dụng hết số lần áp dụng cho mã này (tối đa ' . $maxPerUser . ' lần/khách).', 400, 'ERR_VOUCHER_USER_LIMIT');
                }
            }

            // Kiểm tra phân hạng bắt buộc required_tier (dựa vào user đang đăng nhập, không tin SĐT request)
            $reqTier = !empty($vData['required_tier']) ? trim((string)$vData['required_tier']) : ($voucherCode === 'VIPGOLD' ? 'vip,regular' : '');
            if ($reqTier !== '' && strtolower($reqTier) !== 'standard' && strtolower($reqTier) !== 'all') {
                if (!$userId) {
                    $pdo->rollBack();
                    json_error('Mã giảm giá này chỉ áp dụng cho thành viên hạng ưu đãi đã đăng nhập tài khoản.', 403, 'ERR_VOUCHER_TIER_REQUIRED');
                }
                $userTier = get_authenticated_user_tier($pdo, (int)$userId);
                if (!is_tier_allowed_for_voucher($userTier, $reqTier)) {
                    $pdo->rollBack();
                    json_error('Hạng thành viên hiện tại chưa đủ điều kiện áp dụng mã ưu đãi này.', 403, 'ERR_VOUCHER_TIER_MISMATCH');
                }
            }

            if ($vData['discount_type'] === 'percent') {
                $voucherDiscountAmount = (int)round($subtotal * ((int)$vData['discount_value'] / 100));
            } else {
                $voucherDiscountAmount = min((int)$vData['discount_value'], $subtotal);
            }
            $appliedVoucher = $vData['code'];

            if (db_table_has_column($pdo, 'vouchers', 'used_count')) {
                $updVStmt = $pdo->prepare("UPDATE vouchers SET used_count = used_count + 1 WHERE code = ? AND is_active = 1 AND (max_usage <= 0 OR used_count < max_usage)");
                $updVStmt->execute([$appliedVoucher]);
                if ($updVStmt->rowCount() < 1) {
                    $pdo->rollBack();
                    json_error('Mã giảm giá vừa hết lượt sử dụng. Vui lòng thử lại.', 409, 'ERR_INVALID_VOUCHER');
                }
            }
        }

        $totalPrice = max(0, $subtotal - $voucherDiscountAmount);
        $preDiscountPitchPrice = max($pitchPriceBeforeRule, $pitchPrice);
        $originalPrice = $preDiscountPitchPrice + $totalServicesPrice;
        $discountAmount = max(0, $originalPrice - $totalPrice);

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

        $servicesJson = json_encode($cleanServices, JSON_UNESCAPED_UNICODE);

        // Lưu đơn mới vào bảng bookings (hỗ trợ lưu điểm tích lũy và quà nếu cột tồn tại)
        $hasPtsUsedCol = db_table_has_column($pdo, 'bookings', 'points_used');
        $hasBottlesCol = db_table_has_column($pdo, 'bookings', 'redeemed_bottles');
        $hasConsentCol = db_table_has_column($pdo, 'bookings', 'privacy_consent_at');

        $bCols = ['code', 'user_id', 'customer_name', 'phone', 'email', 'pitch_id', 'booking_date', 'slot_id', 'slot_time', 'services_json', 'voucher_code', 'original_price', 'discount_amount', 'total_price', 'deposit_amount', 'paid_amount', 'remaining_amount', 'status', 'payment_status', 'payment_method', 'weeks_count', 'booking_mode', 'note', 'expires_at'];
        $bVals = [$code, $userId, $customerName, $phone, $email, $pitchId, $date, $slotId, $slot['slot_time'], $servicesJson, $appliedVoucher, $originalPrice, $discountAmount, $totalPrice, $depositAmount, $paidAmount, $remainingAmount, $bookingStatus, $paymentStatus, $paymentMethod, $weeksCount, $bookingMode, $note, $expiresAt];

        if ($hasPtsUsedCol) {
            $bCols[] = 'points_used';
            $bVals[] = $pointsUsed;
        }
        if ($hasBottlesCol) {
            $bCols[] = 'redeemed_bottles';
            $bVals[] = $redeemedBottles;
        }
        if ($hasConsentCol && !$isWalkin) {
            $bCols[] = 'privacy_consent_at';
            $bVals[] = date('Y-m-d H:i:s');
        }

        $bColsSql = '`' . implode('`, `', $bCols) . '`';
        $bPhSql   = implode(', ', array_fill(0, count($bCols), '?'));
        $insertStmt = $pdo->prepare("INSERT INTO bookings ({$bColsSql}) VALUES ({$bPhSql})");
        $insertStmt->execute($bVals);
        $bookingId = (int)$pdo->lastInsertId();

        $staffActorId = isset($walkinActor['id']) ? (int)$walkinActor['id'] : ($userId ? (int)$userId : null);
        foreach ($cleanServices as $cs) {
            if ($cs['price'] > 0) {
                deduct_service_inventory($pdo, $cs['id'], (int)$cs['quantity'], $code, (int)$cs['price'], $paymentMethod, 'Đi kèm đơn đặt sân #' . $code, $staffActorId);
            }
        }

        $pdo->commit();

        if (!isset($_SESSION['owned_booking_codes']) || !is_array($_SESSION['owned_booking_codes'])) {
            $_SESSION['owned_booking_codes'] = [];
        }
        if (!in_array($code, $_SESSION['owned_booking_codes'], true)) {
            $_SESSION['owned_booking_codes'][] = $code;
        }

        if ($isWalkin) {
            write_audit_log(
                $pdo,
                'WALKIN_BOOKING',
                $code,
                null,
                "Tạo đơn tại quầy: {$pitch['name']} ({$date} {$slot['slot_time']}) - Gốc: {$originalPrice}đ - Giảm: {$discountAmount}đ - Tổng: {$totalPrice}đ - TT: {$paymentMethod}",
                $walkinActor ?? null
            );
        }

        // Thông báo Telegram đơn mới
        $tgMsg = "⚽ <b>ĐƠN ĐẶT SÂN MỚI</b>\n"
               . "• Mã vé: <code>" . tg_escape($code) . "</code>\n"
               . "• Khách: <b>" . tg_escape($customerName) . "</b> (" . tg_escape($phone) . ")\n"
               . "• Sân: <b>" . tg_escape($pitch['name']) . "</b>\n"
               . "• Ngày đá: <b>" . date('d/m/Y', strtotime($date)) . "</b> (" . tg_escape($slot['slot_time']) . ")\n"
               . "• Tổng tiền: <b>" . number_format($totalPrice) . " đ</b> (Cọc: " . number_format($depositAmount) . " đ)\n"
               . "• Hình thức: <i>" . tg_escape($paymentMethod) . "</i>";
        send_telegram_notification($tgMsg, 'new_booking', $pdo);

        send_customer_notification($pdo, 'booking_confirm', [
            'booking_id'       => $bookingId,
            'booking_code'     => $code,
            'code'             => $code,
            'customer_name'    => $customerName,
            'phone'            => $phone,
            'pitch_name'       => $pitch['name'],
            'date'             => date('d/m/Y', strtotime($date)),
            'slot_time'        => $slot['slot_time'],
            'total_price'      => $totalPrice,
            'deposit_amount'   => $depositAmount,
            'remaining_amount' => $remainingAmount
        ]);

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
                'originalPrice'   => $originalPrice,
                'discountAmount'  => $discountAmount,
                'goldenHourRule'  => $appliedGoldenHourRule,
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
        if ($pdo && !check_rate_limit($pdo, 'check_noshow', 30, 300)) {
            json_error('Bạn tra cứu quá nhanh. Vui lòng thử lại sau.', 429, 'ERR_RATE_LIMITED');
        }
        if ($pdo) {
            increment_rate_limit($pdo, 'check_noshow');
        }
        $rawPhone = sanitize_string($_GET['phone'] ?? '', 25);
        $cleanPhone = normalize_phone($rawPhone);
        $currentUser = get_authenticated_user($pdo);
        if (!is_portal_operator($currentUser)) {
            json_response([
                'success' => true,
                'data'    => [
                    'phone'         => $cleanPhone,
                    'noShowCount'   => 0,
                    'warning'       => false,
                    'restricted'    => true,
                    'debtCount'     => 0,
                    'debtAmount'    => 0,
                    'totalBookings' => 0
                ]
            ]);
        }
        if ($cleanPhone === '' || $pdo === null) {
            json_response([
                'success' => true,
                'data'    => [
                    'phone'         => $cleanPhone,
                    'noShowCount'   => 0,
                    'warning'       => false,
                    'isBlacklisted' => false,
                    'customerTier'  => 'standard',
                    'adminNote'     => '',
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

            $isBlacklisted = is_phone_blacklisted($pdo, $cleanPhone);
            $customerTier = 'standard';
            $adminNote = '';
            try {
                $crmStmt = $pdo->prepare("SELECT customer_tier, admin_note, is_blacklisted FROM customer_crm WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', '') = ? LIMIT 1");
                $crmStmt->execute([$cleanPhone]);
                $crmInfo = $crmStmt->fetch();
                if ($crmInfo) {
                    $customerTier = (string)($crmInfo['customer_tier'] ?? 'standard');
                    $adminNote = (string)($crmInfo['admin_note'] ?? '');
                    if ((int)($crmInfo['is_blacklisted'] ?? 0) === 1) {
                        $isBlacklisted = true;
                    }
                }
            } catch (Exception $ce) {}

            json_response([
                'success' => true,
                'data'    => [
                    'phone'         => $cleanPhone,
                    'noShowCount'   => $noShowCount,
                    'warning'       => ($noShowCount >= 2 || $isBlacklisted),
                    'isBlacklisted' => $isBlacklisted,
                    'customerTier'  => $customerTier,
                    'adminNote'     => $adminNote,
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
                    'isBlacklisted' => false,
                    'customerTier'  => 'standard',
                    'adminNote'     => '',
                    'debtCount'     => 0,
                    'debtAmount'    => 0,
                    'totalBookings' => 0
                ]
            ]);
        }
    }

    if ($action === 'booked_slots') {
        try {
            if ($pdo === null) {
                json_response(['success' => true, 'data' => [], 'maintenanceWindows' => []]);
            }
            maybe_run_auto_release_throttled($pdo, 30);
            $pitchId = sanitize_string($_GET['pitch_id'] ?? $_GET['pitchId'] ?? '', 20);
            $date = sanitize_string($_GET['date'] ?? date('Y-m-d'), 15);
            $currentUser = get_authenticated_user($pdo);
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

            $rows = $stmt->fetchAll() ?: [];
            $slots = [];
            foreach ($rows as $r) {
                $entry = [
                    'pitchId'       => $r['pitch_id'],
                    'slotId'        => $r['slot_id'],
                    'slotTime'      => $r['slot_time'],
                    'status'        => $r['status'],
                    'paymentStatus' => $r['payment_status']
                ];
                if ($isStaffOrAdmin) {
                    $entry['code'] = $r['code'];
                    $entry['customerName'] = $r['customer_name'];
                    $entry['phone'] = $r['phone'];
                }
                $slots[] = $entry;
            }

            $maintWindows = [];
            try {
                if (!empty($pitchId)) {
                    $mStmt = $pdo->prepare("SELECT id, pitch_id, start_date, end_date, start_time, end_time, reason, status FROM pitch_maintenance WHERE pitch_id = ? AND status IN ('scheduled', 'in_progress') AND ? BETWEEN start_date AND end_date ORDER BY start_time ASC");
                    $mStmt->execute([$pitchId, $date]);
                } else {
                    $mStmt = $pdo->prepare("SELECT id, pitch_id, start_date, end_date, start_time, end_time, reason, status FROM pitch_maintenance WHERE status IN ('scheduled', 'in_progress') AND ? BETWEEN start_date AND end_date ORDER BY pitch_id ASC, start_time ASC");
                    $mStmt->execute([$date]);
                }
                $maintWindows = $mStmt->fetchAll() ?: [];
            } catch (Exception $me) {
                $maintWindows = [];
            }

            json_response([
                'success'            => true,
                'data'               => $slots,
                'maintenanceWindows' => $maintWindows
            ]);
        } catch (Throwable $t) {
            error_log("[BOOKED SLOTS WARN] " . $t->getMessage());
            json_response([
                'success'            => true,
                'data'               => [],
                'maintenanceWindows' => []
            ]);
        }
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
            $ownedCodes = (isset($_SESSION['owned_booking_codes']) && is_array($_SESSION['owned_booking_codes'])) ? $_SESSION['owned_booking_codes'] : [];
            if (!in_array($code, $ownedCodes, true)) {
                json_response([
                    'success'  => false,
                    'message'  => 'Bạn không có quyền xem thông tin đơn đặt sân này. Vui lòng đăng nhập hoặc sử dụng thiết bị đã tạo đơn.',
                    'ref_code' => 'ERR_IDOR_BLOCKED'
                ], 403);
            }
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
