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

        $oldStatus = $oldRow['status'] . ' (' . $oldRow['payment_status'] . ')';
        $currentPayStatus = (string)($oldRow['payment_status'] ?? 'Chờ duyệt cọc');
        $isDepositPaid = in_array($currentPayStatus, ['Đã cọc 30%', 'Đã thanh toán đủ', 'Đã thanh toán 100%', 'deposited', 'completed', 'paid'], true);

        $newPayStatus = $currentPayStatus;
        if (!$isDepositPaid) {
            $confirmDepositCash = !empty($data['confirm_deposit_cash']) || !empty($data['collect_deposit_at_counter']) || !empty($_POST['confirm_deposit_cash']) || !empty($_GET['confirm_deposit_cash']);
            if (!$confirmDepositCash) {
                json_error('Đơn đặt sân chưa thanh toán tiền cọc. Vui lòng xác nhận thu cọc tại quầy trước khi cho khách nhận sân.', 400, 'ERR_DEPOSIT_NOT_COLLECTED');
            }

            $totPrice = max(0, (int)($oldRow['total_price'] ?? 0));
            $depAmt = max(0, (int)($oldRow['deposit_amount'] ?? 0));
            if ($depAmt === 0 && $totPrice > 0) {
                $depAmt = (int)round($totPrice * 0.3);
            }
            $remAmt = max(0, $totPrice - $depAmt);

            $stmt = $pdo->prepare("UPDATE bookings SET status = 'Đang đá', payment_status = 'Đã cọc 30%', paid_amount = ?, remaining_amount = ? WHERE code = ?");
            $stmt->execute([$depAmt, $remAmt, $code]);
            $newPayStatus = 'Đã cọc 30%';
        } else {
            $stmt = $pdo->prepare("UPDATE bookings SET status = 'Đang đá' WHERE code = ?");
            $stmt->execute([$code]);
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
        $pitchId = sanitize_string($data['pitch_id'] ?? $data['pitchId'] ?? '', 20);
        $date = sanitize_string($data['booking_date'] ?? $data['date'] ?? '', 20);
        $slotId = sanitize_string($data['slot_id'] ?? $data['slotId'] ?? '', 10);
        $slotTime = sanitize_string($data['slot_time'] ?? $data['slotTime'] ?? '', 30);
        $customerName = sanitize_string($data['customer_name'] ?? $data['customerName'] ?? '', 100);
        $phone = normalize_phone($data['phone'] ?? '');

        if (empty($pitchId) || empty($date) || empty($slotId) || empty($customerName) || empty($phone)) {
            json_error('Vui lòng điền đầy đủ họ tên, SĐT, sân, ngày và khung giờ cần chờ.', 400, 'ERR_MISSING_FIELDS');
        }

        $currentUser = get_authenticated_user($pdo);
        $userId = $currentUser ? (int)$currentUser['id'] : null;

        $dupStmt = $pdo->prepare("SELECT id FROM waitlist WHERE pitch_id = ? AND booking_date = ? AND slot_id = ? AND phone = ? AND status = 'waiting' LIMIT 1");
        $dupStmt->execute([$pitchId, $date, $slotId, $phone]);
        if ($dupStmt->fetch()) {
            json_error('Bạn đã đăng ký hàng chờ cho khung giờ này rồi. Hệ thống sẽ thông báo ngay khi sân trống.', 409, 'ERR_DUPLICATE_WAITLIST');
        }

        $queueStmt = $pdo->prepare("SELECT COUNT(*) FROM waitlist WHERE pitch_id = ? AND booking_date = ? AND slot_id = ? AND status = 'waiting'");
        $queueStmt->execute([$pitchId, $date, $slotId]);
        $queuePos = (int)$queueStmt->fetchColumn() + 1;

        $insStmt = $pdo->prepare("INSERT INTO waitlist (user_id, pitch_id, booking_date, slot_id, slot_time, customer_name, phone, status, queue_position, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'waiting', ?, NOW())");
        $insStmt->execute([$userId, $pitchId, $date, $slotId, $slotTime, $customerName, $phone, $queuePos]);

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
        $code = sanitize_string($data['code'] ?? '', 40);
        $reason = sanitize_string($data['reason'] ?? '', 255);
        if (empty($code)) {
            json_error('Thiếu mã đơn đặt sân.', 400, 'ERR_MISSING_CODE');
        }

        $stmt = $pdo->prepare("SELECT b.*, p.name AS pitch_name FROM bookings b JOIN pitches p ON b.pitch_id = p.id WHERE b.code = ? LIMIT 1");
        $stmt->execute([$code]);
        $booking = $stmt->fetch();
        if (!$booking) {
            json_error('Không tìm thấy đơn đặt sân.', 404, 'ERR_BOOKING_NOT_FOUND');
        }

        $currentUser = get_authenticated_user($pdo);
        $isOperator = is_portal_operator($currentUser);
        $isOwner = $currentUser && !empty($booking['user_id']) && (int)$currentUser['id'] === (int)$booking['user_id'];
        if (!$isOperator && !$isOwner) {
            json_error('Bạn không có quyền hủy đơn đặt sân này.', 403, 'ERR_FORBIDDEN');
        }

        if (in_array((string)$booking['status'], ['Đã hủy', 'Khách chưa đến', 'Hoàn thành'], true)) {
            json_error('Đơn đặt sân này không thể hủy do trạng thái hiện tại là: ' . $booking['status'], 400, 'ERR_INVALID_STATUS');
        }

        $now = new DateTime('now', new DateTimeZone('Asia/Ho_Chi_Minh'));
        $slotStartStr = $booking['booking_date'] . ' ' . explode(' - ', $booking['slot_time'])[0];
        $matchStart = DateTime::createFromFormat('Y-m-d H:i', $slotStartStr, new DateTimeZone('Asia/Ho_Chi_Minh'));
        if (!$matchStart) {
            $matchStart = new DateTime($booking['booking_date'] . ' 00:00:00', new DateTimeZone('Asia/Ho_Chi_Minh'));
        }

        $hoursUntil = ($matchStart->getTimestamp() - $now->getTimestamp()) / 3600;
        $deposit = (int)$booking['deposit_amount'];
        $policyApplied = '';
        $refundAmount = 0;
        $paymentStatus = 'Đã hủy';

        if ($hoursUntil >= 24) {
            $policyApplied = 'Hủy trước 24h: Hoàn 100% tiền cọc';
            $refundAmount = $deposit;
            $paymentStatus = 'Đã hoàn cọc 100%';
        } elseif ($hoursUntil >= 4) {
            $policyApplied = 'Hủy trước 4h - 24h: Hoàn 50% tiền cọc (Phạt 50%)';
            $refundAmount = (int)round($deposit * 0.5);
            $paymentStatus = 'Phạt 50% cọc';
        } else {
            $policyApplied = 'Hủy sát giờ dưới 4h: Không hoàn cọc theo quy định';
            $refundAmount = 0;
            $paymentStatus = 'Tịch thu cọc 30%';
        }

        $pdo->beginTransaction();
        try {
            $upd = $pdo->prepare("UPDATE bookings SET status = 'Đã hủy', payment_status = ?, cancel_policy_applied = ?, refund_amount = ?, note = CONCAT(IFNULL(note,''), ' [Hủy lúc: ', NOW(), ' - ', ?, ']') WHERE id = ?");
            $upd->execute([$paymentStatus, $policyApplied, $refundAmount, $reason, $booking['id']]);

            if ($refundAmount > 0 && !empty($booking['user_id'])) {
                $refCode = 'REFUND-' . $booking['code'];
                $insRef = $pdo->prepare("INSERT INTO refunds (booking_id, booking_code, user_id, amount, status, reason, policy_applied, created_at) VALUES (?, ?, ?, ?, 'pending', ?, ?, NOW())");
                $insRef->execute([$booking['id'], $booking['code'], $booking['user_id'], $refundAmount, $reason, $policyApplied]);
            }

            write_audit_log($pdo, 'EARLY_CANCEL', $booking['code'], $booking['status'], 'Đã hủy (' . $paymentStatus . ')', $currentUser);
            $pdo->commit();

            try {
                trigger_waitlist_notification($pdo, $booking['pitch_id'], $booking['booking_date'], $booking['slot_id'], $booking['slot_time'], $booking['pitch_name']);
            } catch (Exception $wEx) {
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
        } catch (Exception $e) {
            $pdo->rollBack();
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
        $oldStmt = $pdo->prepare("SELECT status, payment_status, phone FROM bookings WHERE code = ? LIMIT 1");
        $oldStmt->execute([$code]);
        $oldRow = $oldStmt->fetch();
        $oldStatus = $oldRow ? ($oldRow['status'] . ' (' . $oldRow['payment_status'] . ')') : 'Đã xác nhận';

        $stmt = $pdo->prepare("UPDATE bookings SET status = 'Khách chưa đến', payment_status = 'Tịch thu cọc 30%', remaining_amount = 0, note = CONCAT(IFNULL(note,''), ' [Quá 15p khách chưa đến - Tịch thu cọc 30% & Nhả sân trống]') WHERE code = ?");
        $stmt->execute([$code]);

        if (!empty($oldRow['phone'])) {
            $crmStmt = $pdo->prepare("UPDATE customers SET noshow_count = noshow_count + 1 WHERE phone = ?");
            $crmStmt->execute([$oldRow['phone']]);
        }

        write_audit_log($pdo, 'NOSHOW_RELEASE_SLOT', $code, $oldStatus, 'Khách chưa đến (Tịch thu cọc 30% & Nhả sân)', $actor);

        json_response([
            'success' => true,
            'message' => 'Đã đánh dấu khách chưa đến (quá 15 phút), tịch thu cọc 30% và LẬP TỨC NHẢ SÂN TRỐNG để đón khách khác!',
            'data'    => ['code' => $code, 'status' => 'Khách chưa đến', 'paymentStatus' => 'Tịch thu cọc 30%', 'released' => true]
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
