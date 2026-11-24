<?php
// Dịch vụ xử lý thao tác ca đá: check-in, hủy sớm, hủy do quá giờ, khôi phục ca, đăng ký hàng chờ
function handle_booking_operation(string $action, ?PDO $pdo, array $data): bool {
    if ($action === 'checkin') {
        $actor = require_staff_or_admin($pdo);
        $code = sanitize_string($data['code'] ?? $_GET['code'] ?? '', 40);
        if (empty($code)) {
            json_error('Thiếu mã đơn đặt sân.', 400, 'ERR_MISSING_CODE');
        }
        if ($pdo === null) {
            json_response([
                'success' => true,
                'message' => 'Check-in nhận sân thành công! Ca đá đã bắt đầu.',
                'data'    => ['code' => $code, 'status' => 'Đang đá', 'paymentStatus' => 'Đã cọc 30%']
            ]);
        }
        $oldStmt = $pdo->prepare("SELECT id, status, payment_status, weeks_count, total_price, deposit_amount, paid_amount FROM bookings WHERE code = ? LIMIT 1");
        $oldStmt->execute([$code]);
        $oldRow = $oldStmt->fetch();
        if (!$oldRow) {
            json_error('Không tìm thấy đơn đặt sân.', 404, 'ERR_BOOKING_NOT_FOUND');
        }
        if ($oldRow['status'] === 'Đã hủy') {
            json_error('Đơn đặt sân đã bị hủy, không thể nhận sân.', 400, 'ERR_BOOKING_CANCELLED');
        }
        if ($oldRow['status'] === 'Khách chưa đến') {
            json_error('Đơn đặt sân đã bị đánh dấu khách chưa đến và nhả sân, không thể check-in.', 400, 'ERR_BOOKING_NOSHOW');
        }
        if (in_array($oldRow['status'], ['Đang đá', 'Hoàn thành', 'completed'], true)) {
            json_error('Mã QR này đã được quét check-in trước đó. Mỗi mã QR chỉ có hiệu lực 1 lần duy nhất!', 409, 'ERR_ALREADY_CHECKED_IN');
        }

        $oldStatus = $oldRow['status'] . ' (' . $oldRow['payment_status'] . ')';
        $currentPayStatus = (string)($oldRow['payment_status'] ?? 'Chờ duyệt cọc');
        $isDepositPaid = in_array($currentPayStatus, ['Đã cọc 30%', 'Đã cọc 60%', 'Đã cọc', 'Đã thanh toán đủ', 'Đã thanh toán 100%', 'deposited', 'completed', 'paid'], true)
            || (stripos($currentPayStatus, 'Đã cọc') !== false);

        $newPayStatus = $currentPayStatus;
        if (!$isDepositPaid) {
            $confirmDepositCash = !empty($data['confirm_deposit_cash']) || !empty($data['collect_deposit_at_counter']) || !empty($_POST['confirm_deposit_cash']) || !empty($_GET['confirm_deposit_cash']);
            if (!$confirmDepositCash) {
                json_error('Đơn đặt sân chưa thanh toán tiền cọc. Vui lòng xác nhận thu cọc tại quầy trước khi cho khách nhận sân.', 400, 'ERR_DEPOSIT_NOT_COLLECTED');
            }

            $totPrice = max(0, (int)($oldRow['total_price'] ?? 0));
            $depRate  = ((int)($oldRow['weeks_count'] ?? 1) > 1) ? 60 : 30;
            $depAmt   = max(0, (int)($oldRow['deposit_amount'] ?? 0));
            if ($depAmt === 0 && $totPrice > 0) {
                $depAmt = (int)round($totPrice * ($depRate / 100));
            }
            $remAmt = max(0, $totPrice - $depAmt);
            $newPayStatus = "Đã cọc {$depRate}%";

            $stmt = $pdo->prepare("UPDATE bookings SET status = 'Đang đá', payment_status = ?, paid_amount = ?, remaining_amount = ? WHERE code = ? AND status NOT IN ('Đang đá', 'Hoàn thành', 'completed', 'Đã hủy', 'Khách chưa đến')");
            $stmt->execute([$newPayStatus, $depAmt, $remAmt, $code]);
            if ($stmt->rowCount() === 0) {
                json_error('Mã QR này đã được quét check-in trước đó. Mỗi mã QR chỉ có hiệu lực 1 lần duy nhất!', 409, 'ERR_ALREADY_CHECKED_IN');
            }
            write_audit_log($pdo, 'COLLECT_PAYMENT', $code, (string)$depAmt, "Thu cọc tại quầy khi check-in qua Tiền mặt tại quầy (Số tiền: {$depAmt}đ)", $actor);
        } else {
            $stmt = $pdo->prepare("UPDATE bookings SET status = 'Đang đá' WHERE code = ? AND status NOT IN ('Đang đá', 'Hoàn thành', 'completed', 'Đã hủy', 'Khách chưa đến')");
            $stmt->execute([$code]);
            if ($stmt->rowCount() === 0) {
                json_error('Mã QR này đã được quét check-in trước đó. Mỗi mã QR chỉ có hiệu lực 1 lần duy nhất!', 409, 'ERR_ALREADY_CHECKED_IN');
            }
        }
        write_audit_log($pdo, 'CHECKIN', $code, $oldStatus, 'Đang đá', $actor);

        if ($oldRow) {
            $weeks = (int)($oldRow['weeks_count'] ?? 1);
            if ($weeks >= 8) {
                $hasGiftDeducted = db_table_has_column($pdo, 'bookings', 'gift_deducted');
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
            'data'    => ['code' => $code, 'status' => 'Đang đá', 'paymentStatus' => $newPayStatus]
        ]);
        return true;
    }

    if ($action === 'join_waitlist') {
        if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
            json_error('Hành động đăng ký hàng chờ bắt buộc dùng phương thức POST.', 405, 'ERR_METHOD_NOT_ALLOWED');
        }
        if (!check_rate_limit($pdo, 'join_waitlist', 5, 300)) {
            json_error('Thao tác đăng ký hàng chờ quá nhanh. Vui lòng thử lại sau ít phút.', 429, 'ERR_RATE_LIMITED');
        }
        require_csrf_if_session_authenticated($data);
        increment_rate_limit($pdo, 'join_waitlist');

        $pitchId = sanitize_string($data['pitch_id'] ?? $data['pitchId'] ?? '', 20);
        $date = sanitize_string($data['booking_date'] ?? $data['date'] ?? '', 20);
        $slotId = sanitize_string($data['slot_id'] ?? $data['slotId'] ?? '', 10);
        $slotTime = sanitize_string($data['slot_time'] ?? $data['slotTime'] ?? '', 30);
        $customerName = sanitize_string($data['customer_name'] ?? $data['customerName'] ?? '', 100);
        $phone = normalize_phone($data['phone'] ?? '');

        if (empty($pitchId) || empty($date) || empty($slotId) || empty($customerName) || empty($phone)) {
            json_error('Vui lòng điền đầy đủ họ tên, SĐT, sân, ngày và khung giờ cần chờ.', 400, 'ERR_MISSING_FIELDS');
        }

        $todayStr = date('Y-m-d');
        if ($date < $todayStr) {
            json_error('Không thể đăng ký danh sách chờ cho ngày trong quá khứ.', 400, 'ERR_PAST_DATE');
        }

        // Chặn đăng ký chờ khi khung giờ đã có người cọc thành công (đơn 'Giữ chỗ' chưa cọc vẫn cho phép đăng ký chờ)
        $depStmt = $pdo->prepare("
            SELECT id FROM bookings 
            WHERE pitch_id = ? AND booking_date = ? AND slot_id = ? 
              AND status NOT IN ('Đã hủy', 'Khách chưa đến', 'cancelled', 'noshow')
              AND (
                  paid_amount > 0
                  OR payment_status IN ('Đã cọc 30%', 'Đã cọc 60%', 'Đã cọc', 'Đã thanh toán đủ', 'Đã thanh toán 100%', 'Còn thiếu phần phát sinh')
                  OR payment_status LIKE 'Đã cọc%'
                  OR status IN ('Đang đá', 'completed', 'Hoàn thành', 'Đã đá - chưa tất toán')
              )
            LIMIT 1
        ");
        $depStmt->execute([$pitchId, $date, $slotId]);
        if ($depStmt->fetch()) {
            json_error('Khung giờ này đã có người đặt cọc thành công, không nhận thêm danh sách chờ.', 409, 'ERR_ALREADY_DEPOSITED');
        }

        $currentUser = get_authenticated_user($pdo);
        if ($currentUser && is_portal_operator($currentUser)) {
            json_error('Tài khoản vận hành không đăng ký danh sách chờ của khách hàng.', 403, 'ERR_FORBIDDEN');
        }
        $userId = $currentUser ? (int)$currentUser['id'] : null;

        $dupStmt = $pdo->prepare("SELECT id FROM waitlist WHERE pitch_id = ? AND booking_date = ? AND slot_id = ? AND phone = ? AND status = 'waiting' LIMIT 1");
        $dupStmt->execute([$pitchId, $date, $slotId, $phone]);
        if ($dupStmt->fetch()) {
            json_error('Bạn đã đăng ký hàng chờ cho khung giờ này rồi. Hệ thống sẽ thông báo ngay khi sân trống.', 409, 'ERR_DUPLICATE_WAITLIST');
        }

        $queueStmt = $pdo->prepare("SELECT COUNT(*) FROM waitlist WHERE pitch_id = ? AND booking_date = ? AND slot_id = ? AND status = 'waiting'");
        $queueStmt->execute([$pitchId, $date, $slotId]);
        $queuePos = (int)$queueStmt->fetchColumn() + 1;

        $insStmt = $pdo->prepare("INSERT INTO waitlist (user_id, pitch_id, booking_date, slot_id, customer_name, phone, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'waiting', NOW())");
        $insStmt->execute([$userId, $pitchId, $date, $slotId, $customerName, $phone]);

        json_response([
            'success' => true,
            'message' => "Đã ghi nhận vào hàng chờ (Thứ tự: #{$queuePos}). Bạn sẽ nhận được thông báo ngay khi ca đá này có người nhả sân!",
            'data'    => [
                'queue_position' => $queuePos,
                'pitch_id'       => $pitchId,
                'booking_date'   => $date,
                'slot_id'        => $slotId
            ]
        ], 201);
        return true;
    }

    if ($action === 'early_cancel') {
        $currentUser = get_authenticated_user($pdo);
        if (!$currentUser) {
            json_error('Vui lòng đăng nhập để hủy đơn đặt sân.', 401, 'ERR_UNAUTHORIZED');
        }

        $code = sanitize_string($data['code'] ?? '', 40);
        $reason = sanitize_string($data['reason'] ?? '', 255);
        if (empty($code)) {
            json_error('Thiếu mã đơn đặt sân.', 400, 'ERR_MISSING_CODE');
        }

        $isOperator = is_portal_operator($currentUser);

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("SELECT b.*, p.name AS pitch_name FROM bookings b LEFT JOIN pitches p ON b.pitch_id = p.id WHERE b.code = ? LIMIT 1 FOR UPDATE");
            $stmt->execute([$code]);
            $booking = $stmt->fetch();
            if (!$booking) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                json_error('Không tìm thấy đơn đặt sân.', 404, 'ERR_BOOKING_NOT_FOUND');
            }

            $userPhone = normalize_phone((string)($currentUser['phone'] ?? ''));
            $bookingPhone = normalize_phone((string)($booking['phone'] ?? ''));
            $ownedCodes = $_SESSION['owned_booking_codes'] ?? [];
            $isOwner = (!empty($booking['user_id']) && (int)$currentUser['id'] === (int)$booking['user_id'])
                || ($userPhone !== '' && $userPhone === $bookingPhone)
                || (is_array($ownedCodes) && in_array($code, $ownedCodes, true));
            if (!$isOperator && !$isOwner) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                json_error('Bạn không có quyền hủy đơn đặt sân này.', 403, 'ERR_FORBIDDEN');
            }

            if (in_array((string)$booking['status'], ['Đã hủy', 'Khách chưa đến', 'Đang đá', 'completed', 'Hoàn thành'], true)) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                json_error('Đơn đặt sân này không thể hủy do trạng thái hiện tại là: ' . $booking['status'], 400, 'ERR_INVALID_STATUS');
            }

            $sysSettings = get_system_settings_map($pdo);
            if (!function_exists('evaluate_cancellation_policy')) {
                require_once __DIR__ . '/cancellation_helper.php';
            }
            $eval = evaluate_cancellation_policy($booking, $sysSettings);
            $cancelPolicyCode   = $eval['policy'];
            $paymentStatus      = $eval['payment_status'];
            $refundAmount       = $eval['refund_amount'];
            $refundFullHours    = $eval['refund_full_hours'];
            $refundPartialHours = $eval['refund_partial_hours'];

            if ($cancelPolicyCode === 'unpaid_free_cancel') {
                $policyApplied = 'Hủy đơn chưa thanh toán cọc';
            } elseif ($cancelPolicyCode === 'refund_100') {
                $policyApplied = "Hủy trước {$refundFullHours}h: Hoàn 100% số tiền đã thanh toán";
            } elseif ($cancelPolicyCode === 'forfeit_50') {
                $policyApplied = "Hủy trước {$refundPartialHours}h - {$refundFullHours}h: Hoàn 50% số tiền đã thanh toán (Phạt 50%)";
            } else {
                $policyApplied = "Hủy sát giờ dưới {$refundPartialHours}h: Không hoàn tiền theo quy định";
            }

            $upd = $pdo->prepare("UPDATE bookings SET status = 'Đã hủy', payment_status = ?, remaining_amount = 0, cancel_policy_applied = ?, refund_amount = ?, note = CONCAT(IFNULL(note,''), ' [Hủy lúc: ', NOW(), ' - ', ?, ']') WHERE id = ?");
            $upd->execute([$paymentStatus, $cancelPolicyCode, $refundAmount, $reason, (int)$booking['id']]);

            restore_booking_resources_on_cancel($pdo, $booking, true);

            write_audit_log($pdo, 'EARLY_CANCEL', $booking['code'], $booking['status'], 'Đã hủy (' . $paymentStatus . ')', $currentUser);
            $pdo->commit();

            try {
                trigger_waitlist_notification(
                    $pdo,
                    (string)$booking['pitch_id'],
                    (string)$booking['booking_date'],
                    (string)$booking['slot_id'],
                    (string)($booking['slot_time'] ?? ''),
                    is_array($currentUser) ? $currentUser : null,
                    (string)$booking['code']
                );
            } catch (Throwable $wEx) {
                error_log("[WAITLIST NOTIFY WARN] " . $wEx->getMessage());
            }

            json_response([
                'success' => true,
                'message' => 'Hủy đơn thành công! ' . $policyApplied . ($refundAmount > 0 ? (' (Số tiền hoàn dự kiến: ' . number_format($refundAmount, 0, ',', '.') . 'đ)') : ''),
                'data'    => [
                    'code'           => $booking['code'],
                    'status'         => 'Đã hủy',
                    'payment_status' => $paymentStatus,
                    'refund_amount'  => $refundAmount,
                    'policy_applied' => $policyApplied
                ]
            ]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log("[CANCEL ERROR] " . $e->getMessage());
            json_error('Lỗi hệ thống khi hủy đơn. Vui lòng liên hệ hotline.', 500, 'ERR_CANCEL_FAILED');
        }
        return true;
    }

    if ($action === 'noshow_release') {
        $actor = require_staff_or_admin($pdo);
        $code = sanitize_string($data['code'] ?? $_GET['code'] ?? '', 40);
        if (empty($code)) {
            json_error('Thiếu mã đơn đặt sân.', 400, 'ERR_MISSING_CODE');
        }
        if ($pdo === null) {
            json_response([
                'success' => true,
                'message' => 'Đã đánh dấu khách chưa đến, tịch thu cọc 30% và LẬP TỨC NHẢ SÂN TRỐNG!',
                'data'    => ['code' => $code, 'status' => 'Khách chưa đến', 'paymentStatus' => 'Tịch thu cọc 30%', 'released' => true]
            ]);
        }

        $pdo->beginTransaction();
        $isPaidNoShow = false;
        try {
            $oldStmt = $pdo->prepare("SELECT * FROM bookings WHERE code = ? LIMIT 1 FOR UPDATE");
            $oldStmt->execute([$code]);
            $oldRow = $oldStmt->fetch();
            if (!$oldRow) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                json_error('Không tìm thấy đơn đặt sân.', 404, 'ERR_BOOKING_NOT_FOUND');
            }
            if (in_array((string)$oldRow['status'], ['Đã hủy', 'Khách chưa đến', 'completed', 'Hoàn thành'], true)) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                json_error('Đơn đặt sân này không thể đánh dấu quá giờ do trạng thái hiện tại là: ' . $oldRow['status'], 400, 'ERR_INVALID_STATUS');
            }
            $oldStatus = $oldRow['status'] . ' (' . $oldRow['payment_status'] . ')';
            $paidAmt = max(0, (int)($oldRow['paid_amount'] ?? 0));
            $payStCur = (string)($oldRow['payment_status'] ?? '');
            $isPaidNoShow = ($paidAmt > 0)
                || in_array($payStCur, ['Đã cọc 30%', 'Đã cọc 60%', 'Đã cọc', 'Đã thanh toán đủ', 'Đã thanh toán 100%', 'deposited', 'completed', 'paid'], true)
                || (mb_stripos($payStCur, 'Đã cọc') !== false);

            if ($isPaidNoShow) {
                $stmt = $pdo->prepare("UPDATE bookings SET status = 'Khách chưa đến', payment_status = 'Tịch thu cọc 30%', remaining_amount = 0, cancel_policy_applied = 'noshow_forfeit', refund_amount = 0, note = CONCAT(IFNULL(note,''), ' [Quá 15p khách chưa đến - Tịch thu cọc 30% & Nhả sân trống]') WHERE id = ?");
                $stmt->execute([(int)$oldRow['id']]);
                restore_booking_resources_on_cancel($pdo, $oldRow, true);
                write_audit_log($pdo, 'NOSHOW_RELEASE_SLOT', $code, $oldStatus, 'Khách chưa đến (Tịch thu cọc 30% & Nhả sân)', $actor);
            } else {
                $stmt = $pdo->prepare("UPDATE bookings SET status = 'Đã hủy', payment_status = 'Đã hủy', remaining_amount = 0, cancel_policy_applied = 'unpaid_noshow_cancel', refund_amount = 0, note = CONCAT(IFNULL(note,''), ' [Quá 15p khách chưa đến (chưa cọc) - Đã hủy & Nhả sân trống]') WHERE id = ?");
                $stmt->execute([(int)$oldRow['id']]);
                restore_booking_resources_on_cancel($pdo, $oldRow, false);
                write_audit_log($pdo, 'NOSHOW_RELEASE_SLOT', $code, $oldStatus, 'Đã hủy (Chưa cọc - Nhả sân, doanh thu 0đ)', $actor);
            }
            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log("[NOSHOW RELEASE ERROR] " . $e->getMessage());
            json_error('Lỗi hệ thống khi đánh dấu khách chưa đến.', 500, 'ERR_NOSHOW_FAILED');
        }

        try {
            trigger_waitlist_notification(
                $pdo,
                (string)$oldRow['pitch_id'],
                (string)$oldRow['booking_date'],
                (string)$oldRow['slot_id'],
                (string)($oldRow['slot_time'] ?? ''),
                is_array($actor) ? $actor : null,
                (string)$oldRow['code']
            );
        } catch (Throwable $wEx) {
            error_log("[WAITLIST NOTIFY WARN] " . $wEx->getMessage());
        }

        json_response([
            'success' => true,
            'message' => $isPaidNoShow
                ? 'Đã đánh dấu khách chưa đến (quá 15 phút), tịch thu cọc và LẬP TỨC NHẢ SÂN TRỐNG để đón khách khác!'
                : 'Đơn chưa đặt cọc đã quá 15 phút — hệ thống chuyển sang Đã hủy (doanh thu 0đ) và LẬP TỨC NHẢ SÂN TRỐNG!',
            'data'    => [
                'code'          => $code,
                'status'        => $isPaidNoShow ? 'Khách chưa đến' : 'Đã hủy',
                'paymentStatus' => $isPaidNoShow ? 'Tịch thu cọc 30%' : 'Đã hủy',
                'released'      => true
            ]
        ]);
        return true;
    }

    if ($action === 'restore') {
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
        return true;
    }

    return false;
}
