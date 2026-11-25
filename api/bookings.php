<?php
// API quản lý & đặt sân bóng đá (Sân Bóng Pro)
require_once __DIR__ . '/security_helper.php';
require_once __DIR__ . '/notification_helper.php';
require_once __DIR__ . '/services/cancellation_helper.php';
require_once __DIR__ . '/services/booking_quote_service.php';
require_once __DIR__ . '/services/booking_operations.php';
require_once __DIR__ . '/services/booking_creator.php';
require_once __DIR__ . '/services/booking_queries.php';

header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0');
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
    $rawExpires                  = $item['expires_at'] ?? $item['expiresAt'] ?? null;
    if (!empty($rawExpires) && preg_match('/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/', (string)$rawExpires) && strpos((string)$rawExpires, '+') === false && substr((string)$rawExpires, -1) !== 'Z') {
        $expTs = strtotime((string)$rawExpires);
        $rawExpires = $expTs ? date('c', $expTs) : $rawExpires;
    }
    $item['expiresAt']           = $rawExpires;
    $item['createdAt']           = $item['created_at'] ?? $item['createdAt'] ?? '';
    $item['pointsUsed']          = (int)($item['points_used'] ?? $item['pointsUsed'] ?? 0);
    $item['redeemedBottles']     = (int)($item['redeemed_bottles'] ?? $item['redeemedBottles'] ?? 0);
    $item['depositRate']         = (int)($item['depositRate'] ?? ($item['weeksCount'] > 1 ? 60 : 30));
    $item['idempotencyKey']      = $item['idempotency_key'] ?? $item['idempotencyKey'] ?? null;
    return $item;
}

if ($action === 'quote') {
    if ($pdo === null) {
        json_error('Cơ sở dữ liệu không khả dụng.', 503, 'ERR_DB_UNAVAILABLE');
    }
    $quoteInput = ($method === 'POST') ? $data : $_GET;
    $qUser = get_authenticated_user($pdo);
    if ($qUser && empty($quoteInput['userId']) && empty($quoteInput['user_id'])) {
        $quoteInput['userId'] = (int)$qUser['id'];
    }
    $quote = compute_server_booking_quote($pdo, $quoteInput, false);
    if (!empty($quote['error'])) {
        $err = $quote['error'];
        json_error($err['message'], (int)($err['status'] ?? 400), $err['ref_code'] ?? 'ERR_QUOTE_FAILED');
    }
    json_response([
        'success' => true,
        'data'    => [
            'pitchId'               => $quote['pitch']['id'],
            'pitchName'             => $quote['pitch']['name'],
            'slotId'                => $quote['slot']['id'],
            'slotTime'              => $quote['slot']['slot_time'],
            'weeksCount'            => $quote['weeksCount'],
            'bookingMode'           => $quote['bookingMode'],
            'singlePitchPrice'      => $quote['singlePitchPrice'],
            'rawPitchPriceFull'     => $quote['rawPitchPriceFull'],
            'pitchPrice'            => $quote['pitchPrice'],
            'servicesTotal'         => $quote['servicesTotal'],
            'cleanServices'         => $quote['cleanServices'],
            'subtotal'              => $quote['subtotal'],
            'packageDiscountRate'   => $quote['packageDiscountRate'],
            'monthlyDiscountAmount' => $quote['monthlyDiscountAmount'],
            'voucherDiscountAmount' => $quote['voucherDiscountAmount'],
            'appliedVoucher'        => $quote['appliedVoucher'],
            'rejectedVoucherCode'   => $quote['rejectedVoucherCode'],
            'appliedDiscountSource' => $quote['appliedDiscountSource'],
            'originalPrice'         => $quote['originalPrice'],
            'discountAmount'        => $quote['discountAmount'],
            'totalPrice'            => $quote['totalPrice'],
            'depositRate'           => $quote['depositRate'],
            'depositAmount'         => $quote['depositAmount'],
            'remainingAmount'       => $quote['remainingAmount'],
            'holdMinutes'           => $quote['holdMinutes'],
            'bottleCost'            => $quote['bottleCost'],
            'redeemedBottles'       => $quote['redeemedBottles'],
            'pointsUsed'            => $quote['pointsUsed'],
            'voucherValid'          => $quote['voucherValid'],
            'voucherError'          => $quote['voucherError'],
            'voucherErrorCode'      => $quote['voucherErrorCode'],
        ]
    ]);
}

if ($method === 'POST') {
    if ($action === 'release_draft_hold') {
        $code = sanitize_string($data['code'] ?? '', 40);
        if ($code === '') {
            json_error('Thiếu mã đơn giữ chỗ cần nhả.', 400, 'ERR_MISSING_CODE');
        }
        $currentUser = get_authenticated_user($pdo);
        $isOperator = is_portal_operator($currentUser);
        $sessionCodes = (isset($_SESSION['owned_booking_codes']) && is_array($_SESSION['owned_booking_codes'])) ? $_SESSION['owned_booking_codes'] : [];

        $pdo->beginTransaction();
        try {
            $sel = $pdo->prepare("SELECT * FROM bookings WHERE code = ? LIMIT 1 FOR UPDATE");
            $sel->execute([$code]);
            $row = $sel->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                $pdo->rollBack();
                json_error('Không tìm thấy đơn giữ chỗ.', 404, 'ERR_BOOKING_NOT_FOUND');
            }
            $isOwner = ($currentUser && !empty($row['user_id']) && (int)$row['user_id'] === (int)$currentUser['id'])
                || in_array($code, $sessionCodes, true);
            if (!$isOperator && !$isOwner) {
                $pdo->rollBack();
                json_error('Bạn không có quyền hủy đơn giữ chỗ này.', 403, 'ERR_FORBIDDEN');
            }
            $paidAmt = max(0, (int)($row['paid_amount'] ?? 0));
            $paySt   = (string)($row['payment_status'] ?? '');
            $st      = (string)($row['status'] ?? '');
            if ($paidAmt > 0 || !in_array($st, ['Giữ chỗ', 'Đã xác nhận'], true) || !in_array($paySt, ['Chờ duyệt cọc', 'Chờ cọc 30%'], true)) {
                $pdo->rollBack();
                json_response(['success' => true, 'released' => false, 'message' => 'Đơn không ở trạng thái giữ chỗ chưa thanh toán.']);
            }
            $hasIdemCol = db_table_has_column($pdo, 'bookings', 'idempotency_key');
            $updSql = "UPDATE bookings SET status = 'Đã hủy', payment_status = 'Đã hủy', remaining_amount = 0, cancel_policy_applied = 'draft_released', refund_amount = 0" . ($hasIdemCol ? ", idempotency_key = NULL" : "") . ", note = CONCAT(IFNULL(note,''), ' [Khách quay lại đổi khung giờ - Nhả giữ chỗ]') WHERE id = ?";
            $pdo->prepare($updSql)->execute([(int)$row['id']]);
            restore_booking_resources_on_cancel($pdo, $row, false);
            $pdo->commit();

            try {
                trigger_waitlist_notification($pdo, (string)$row['pitch_id'], (string)$row['booking_date'], (string)$row['slot_id'], (string)($row['slot_time'] ?? ''), $currentUser ?: null, $code);
            } catch (Throwable $we) {
                error_log('[RELEASE DRAFT WAITLIST WARN] ' . $we->getMessage());
            }
            json_response(['success' => true, 'released' => true, 'code' => $code, 'message' => 'Đã nhả khung giờ giữ chỗ thành công.']);
        } catch (Throwable $ex) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log('[RELEASE_DRAFT_HOLD ERROR] ' . $ex->getMessage());
            json_error('Lỗi khi nhả giữ chỗ tạm thời.', 500, 'ERR_RELEASE_HOLD_FAILED');
        }
        exit;
    }
    if (in_array($action, ['checkin', 'join_waitlist', 'early_cancel', 'noshow_release', 'restore'], true)) {
        handle_booking_operation($action, $pdo, $data);
        exit;
    }
    if ($action === 'batch_ops') {
        $actor = require_staff_or_admin($pdo);
        $codes = $data['codes'] ?? [];
        $op = sanitize_string($data['op'] ?? '', 30);
        if (!is_array($codes) || empty($codes)) {
            json_error('Vui lòng chọn ít nhất 1 ca đặt sân.', 400, 'ERR_EMPTY_CODES');
        }
        if (!in_array($op, ['complete', 'noshow_release', 'collect_full'], true)) {
            json_error('Thao tác hàng loạt không hợp lệ.', 400, 'ERR_INVALID_BATCH_OP');
        }
        $cleanCodes = array_values(array_unique(array_filter(array_map(
            static fn($c) => sanitize_string((string)$c, 40),
            array_slice($codes, 0, 100)
        ))));
        if (empty($cleanCodes)) {
            json_error('Danh sách mã đơn không hợp lệ.', 400, 'ERR_EMPTY_CODES');
        }

        $processed = [];
        $skipped = [];
        $collectLogs = [];
        $pdo->beginTransaction();
        try {
            $selStmt = $pdo->prepare("SELECT * FROM bookings WHERE code = ? LIMIT 1 FOR UPDATE");
            foreach ($cleanCodes as $c) {
                $selStmt->execute([$c]);
                $b = $selStmt->fetch(PDO::FETCH_ASSOC);
                if (!$b) {
                    $skipped[] = $c;
                    continue;
                }
                $st = (string)($b['status'] ?? '');
                $paySt = (string)($b['payment_status'] ?? '');
                $tot = max(0, (int)($b['total_price'] ?? 0));
                $paid = max(0, (int)($b['paid_amount'] ?? 0));
                $isPaidConfirmed = ($paid > 0)
                    || in_array($paySt, ['Đã cọc 30%', 'Đã cọc 60%', 'Đã cọc', 'Đã thanh toán đủ', 'Đã thanh toán 100%', 'deposited', 'completed', 'paid', 'Còn thiếu phần phát sinh'], true)
                    || (mb_stripos($paySt, 'Đã cọc') !== false);

                if ($op === 'complete') {
                    if (in_array($st, ['Đã hủy', 'Khách chưa đến'], true)) {
                        $skipped[] = $c;
                        continue;
                    }
                    $delta = max(0, $tot - $paid);
                    $curCash = max(0, (int)($b['cash_paid_amount'] ?? 0));
                    $curTrans = max(0, (int)($b['transfer_paid_amount'] ?? 0));
                    if ($paid > 0 && $curCash === 0 && $curTrans === 0) {
                        if (mb_stripos((string)($b['payment_method'] ?? ''), 'Tiền mặt') !== false) {
                            $curCash = $paid;
                        } else {
                            $curTrans = $paid;
                        }
                    }
                    $curCash += $delta;
                    $pdo->prepare("UPDATE bookings SET status = 'Hoàn thành', payment_status = 'Đã thanh toán đủ', paid_amount = ?, cash_paid_amount = ?, transfer_paid_amount = ?, remaining_amount = 0 WHERE id = ?")
                        ->execute([$tot, $curCash, $curTrans, (int)$b['id']]);
                    if (function_exists('award_booking_loyalty_points')) {
                        award_booking_loyalty_points($pdo, $b);
                    }
                    if ($delta > 0) {
                        $collectLogs[] = [$c, $delta];
                    }
                    $processed[] = $c;
                } elseif ($op === 'collect_full') {
                    if (in_array($st, ['Đã hủy', 'Khách chưa đến'], true)) {
                        $skipped[] = $c;
                        continue;
                    }
                    $delta = max(0, $tot - $paid);
                    $curCash = max(0, (int)($b['cash_paid_amount'] ?? 0));
                    $curTrans = max(0, (int)($b['transfer_paid_amount'] ?? 0));
                    if ($paid > 0 && $curCash === 0 && $curTrans === 0) {
                        if (mb_stripos((string)($b['payment_method'] ?? ''), 'Tiền mặt') !== false) {
                            $curCash = $paid;
                        } else {
                            $curTrans = $paid;
                        }
                    }
                    $curCash += $delta;
                    $pdo->prepare("UPDATE bookings SET payment_status = 'Đã thanh toán đủ', paid_amount = ?, cash_paid_amount = ?, transfer_paid_amount = ?, remaining_amount = 0 WHERE id = ?")
                        ->execute([$tot, $curCash, $curTrans, (int)$b['id']]);
                    if (function_exists('award_booking_loyalty_points')) {
                        award_booking_loyalty_points($pdo, $b);
                    }
                    if ($delta > 0) {
                        $collectLogs[] = [$c, $delta];
                    }
                    $processed[] = $c;
                } elseif ($op === 'noshow_release') {
                    if (in_array($st, ['Hoàn thành', 'completed', 'Đã hủy', 'Khách chưa đến'], true)) {
                        $skipped[] = $c;
                        continue;
                    }
                    if ($isPaidConfirmed) {
                        $pdo->prepare("UPDATE bookings SET status = 'Khách chưa đến', payment_status = 'Tịch thu cọc 30%', remaining_amount = 0, cancel_policy_applied = 'noshow_forfeit', refund_amount = 0 WHERE id = ?")
                            ->execute([(int)$b['id']]);
                        restore_booking_resources_on_cancel($pdo, $b, true);
                    } else {
                        // T5-01: Chưa nộp tiền cọc thì hủy bình thường (doanh thu = 0đ), KHÔNG tịch thu cọc ảo
                        $pdo->prepare("UPDATE bookings SET status = 'Đã hủy', payment_status = 'Đã hủy', remaining_amount = 0, cancel_policy_applied = 'unpaid_noshow_cancel', refund_amount = 0 WHERE id = ?")
                            ->execute([(int)$b['id']]);
                        restore_booking_resources_on_cancel($pdo, $b, false);
                    }
                    $processed[] = $c;
                }
            }
            $pdo->commit();

            if (function_exists('write_audit_log')) {
                foreach ($collectLogs as [$cCode, $cAmt]) {
                    write_audit_log($pdo, 'COLLECT_PAYMENT', $cCode, (string)$cAmt, "Thu tất toán hàng loạt qua Tiền mặt tại quầy (Số tiền: {$cAmt}đ)", $actor);
                }
            }

            if (!empty($processed) && function_exists('write_audit_log')) {
                $opLabels = [
                    'complete'       => 'Hoàn tất & thu đủ hàng loạt',
                    'collect_full'   => 'Thu đủ hàng loạt',
                    'noshow_release' => 'Hủy no-show & nhả sân hàng loạt'
                ];
                write_audit_log(
                    $pdo,
                    'BOOKING_BATCH_OP',
                    null,
                    implode(', ', $processed),
                    ($opLabels[$op] ?? $op) . ' (' . count($processed) . ' ca): ' . implode(', ', $processed),
                    $actor
                );
            }

            json_response([
                'success'   => true,
                'message'   => 'Đã xử lý thành công ' . count($processed) . ' ca' . (!empty($skipped) ? (' (bỏ qua ' . count($skipped) . ' ca không hợp lệ)') : '') . '.',
                'processed' => $processed,
                'skipped'   => $skipped
            ]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log('[BOOKING BATCH OP ERROR] ' . $e->getMessage());
            json_error('Lỗi xử lý hàng loạt. Vui lòng thử lại.', 500, 'ERR_BATCH_FAILED');
        }
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
        if ($code === '') {
            json_error('Thiếu mã đơn đặt sân.', 400, 'ERR_MISSING_CODE');
        }
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("SELECT * FROM bookings WHERE code = ? LIMIT 1 FOR UPDATE");
            $stmt->execute([$code]);
            $oldBooking = $stmt->fetch();
            if (!$oldBooking) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                json_error('Không tìm thấy đơn đặt sân.', 404, 'ERR_BOOKING_NOT_FOUND');
            }
            $currentStatus = (string)($oldBooking['status'] ?? '');
            if (in_array($currentStatus, ['Đã hủy', 'Khách chưa đến'], true)) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                json_error('Không thể hoàn tất đơn đặt sân đã hủy hoặc khách chưa đến.', 400, 'ERR_INVALID_BOOKING_STATUS');
            }
            if (in_array($currentStatus, ['completed', 'Hoàn thành'], true)) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                json_response(['success' => true, 'idempotent' => true, 'message' => "Đơn {$code} đã ở trạng thái hoàn tất."]);
            }
            $totPrice = (int)($oldBooking['total_price'] ?? 0);
            $paidAmt  = (int)($oldBooking['paid_amount'] ?? 0);
            if ($totPrice > $paidAmt) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                $diff = $totPrice - $paidAmt;
                json_error("Không thể hoàn tất đơn đặt sân khi chưa thanh toán đủ (Còn thiếu: " . number_format($diff, 0, ',', '.') . "đ). Vui lòng thu đủ hoặc Điều chỉnh giảm trước khi hoàn tất.", 400, 'ERR_UNPAID_COMPLETION');
            }
            $stmt = $pdo->prepare("UPDATE bookings SET status = 'completed', remaining_amount = GREATEST(0, total_price - paid_amount) WHERE code = ?");
            $stmt->execute([$code]);
            $freshStmt = $pdo->prepare("SELECT * FROM bookings WHERE code = ? LIMIT 1");
            $freshStmt->execute([$code]);
            $updatedBooking = $freshStmt->fetch() ?: $oldBooking;
            award_booking_loyalty_points($pdo, $updatedBooking);
            write_audit_log($pdo, 'COMPLETE_BOOKING', $code, $currentStatus, 'completed', $actor);
            $pdo->commit();
            json_response(['success' => true, 'message' => "Đã chuyển đơn {$code} sang trạng thái hoàn tất."]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log("[COMPLETE BOOKING ERROR] " . $e->getMessage());
            json_error('Lỗi hệ thống khi hoàn tất đơn đặt sân.', 500, 'ERR_COMPLETE_FAILED');
        }
        exit;
    }
    if ($action === 'create' || empty($action)) {
        handle_create_booking($pdo, $data);
        exit;
    }
}

if ($method === 'GET') {
    if ($action === 'eligible_vouchers') {
        require_once __DIR__ . '/services/pricing_tier_helper.php';
        if ($pdo === null) {
            json_response(['success' => true, 'data' => []]);
            exit;
        }
        $currentCustomer = currentCustomer($pdo);
        $userId = $currentCustomer ? (int)$currentCustomer['id'] : null;
        $userTier = $currentCustomer ? get_authenticated_user_tier($pdo, $userId) : null;
        $userPhone = $currentCustomer ? normalize_phone($currentCustomer['phone'] ?? '') : '';

        $hasMaxDiscCol = db_table_has_column($pdo, 'vouchers', 'max_discount_amount');
        $hasReqTierCol = db_table_has_column($pdo, 'vouchers', 'required_tier');
        $hasMaxPerUserCol = db_table_has_column($pdo, 'vouchers', 'max_per_user');
        $selectCols = "code, description, discount_type, discount_value, min_order, max_usage, used_count, valid_from, valid_to, pitch_type_limit, is_active";
        if ($hasMaxDiscCol) $selectCols .= ", max_discount_amount";
        if ($hasReqTierCol) $selectCols .= ", required_tier";
        if ($hasMaxPerUserCol) $selectCols .= ", max_per_user";

        $nowDate = (new DateTime('now', new DateTimeZone('Asia/Ho_Chi_Minh')))->format('Y-m-d');
        $stmt = $pdo->prepare("
            SELECT {$selectCols}
            FROM vouchers
            WHERE is_active = 1
              AND (valid_from IS NULL OR valid_from <= ?)
              AND (valid_to IS NULL OR valid_to >= ?)
              AND (max_usage <= 0 OR used_count < max_usage)
            ORDER BY min_order ASC, code ASC
        ");
        $stmt->execute([$nowDate, $nowDate]);
        $allVouchers = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $eligible = [];
        foreach ($allVouchers as $v) {
            $vCode = strtoupper(trim((string)($v['code'] ?? '')));
            if ($vCode === '') continue;
            $reqTier = trim((string)($v['required_tier'] ?? ''));
            if ($reqTier === '' && $vCode === 'VIPGOLD') {
                $reqTier = 'vip,regular';
            }
            $reqTierLower = strtolower($reqTier);
            if ($reqTierLower !== '' && $reqTierLower !== 'standard' && $reqTierLower !== 'all') {
                if (!$currentCustomer || !is_tier_allowed_for_voucher((string)$userTier, $reqTier)) {
                    continue;
                }
            }
            if ($currentCustomer) {
                $maxPerUser = (int)($v['max_per_user'] ?? 0);
                if ($maxPerUser > 0) {
                    $uCheck = $pdo->prepare("
                        SELECT COUNT(*) FROM bookings
                        WHERE voucher_code = ?
                          AND (user_id = ? OR (? != '' AND REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', '') = ?))
                          AND status NOT IN ('Đã hủy', 'Khách chưa đến')
                    ");
                    $uCheck->execute([$vCode, $userId, $userPhone, $userPhone]);
                    if ((int)$uCheck->fetchColumn() >= $maxPerUser) {
                        continue;
                    }
                }
            }
            $vType = strtolower(trim((string)($v['discount_type'] ?? 'percent'))) === 'fixed' ? 'fixed' : 'percent';
            $vVal = (int)($v['discount_value'] ?? 0);
            $maxDisc = (int)($v['max_discount_amount'] ?? 0);
            $minOrd = (int)($v['min_order'] ?? 0);
            $maxUse = (int)($v['max_usage'] ?? 0);
            $usedCnt = (int)($v['used_count'] ?? 0);
            $maxPerUsr = (int)($v['max_per_user'] ?? 0);
            $vFrom = !empty($v['valid_from']) ? substr((string)$v['valid_from'], 0, 10) : null;
            $vTo = !empty($v['valid_to']) ? substr((string)$v['valid_to'], 0, 10) : null;
            $pitchLim = ($v['pitch_type_limit'] !== null && $v['pitch_type_limit'] !== '') ? (int)$v['pitch_type_limit'] : null;

            $eligible[] = [
                'code'                => $vCode,
                'description'         => (string)($v['description'] ?? ''),
                'type'                => $vType,
                'discount_type'       => $vType,
                'value'               => $vVal,
                'discount_value'      => $vVal,
                'maxDiscountAmount'   => $maxDisc,
                'max_discount_amount' => $maxDisc,
                'minOrder'            => $minOrd,
                'min_order'           => $minOrd,
                'validFrom'           => $vFrom,
                'valid_from'          => $vFrom,
                'validTo'             => $vTo,
                'valid_to'            => $vTo,
                'pitchTypeLimit'      => $pitchLim,
                'pitch_type_limit'    => $pitchLim,
                'requiredTier'        => $reqTier,
                'required_tier'       => $reqTier,
                'maxUsage'            => $maxUse,
                'max_usage'           => $maxUse,
                'usedCount'           => $usedCnt,
                'used_count'          => $usedCnt,
                'maxPerUser'          => $maxPerUsr,
                'max_per_user'        => $maxPerUsr,
                'isActive'            => true,
                'is_active'           => 1,
            ];
        }
        json_response(['success' => true, 'data' => $eligible]);
        exit;
    }

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
                               WHERE b.user_id = ? OR (? != '' AND REPLACE(REPLACE(REPLACE(b.phone, ' ', ''), '.', ''), '-', '') = ?)
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
