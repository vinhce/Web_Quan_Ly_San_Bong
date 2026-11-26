<?php
declare(strict_types=1);

function _sync_payment_state_after_charge(array $booking, int $newTotal, int $paidAmt): array {
    $newRemaining = max(0, $newTotal - $paidAmt);
    $curPaySt     = (string)($booking['payment_status'] ?? 'Chờ duyệt cọc');
    $curStatus    = (string)($booking['status'] ?? 'Đã xác nhận');
    $wasFullPaid  = in_array($curPaySt, ['Đã thanh toán đủ', 'Đã thanh toán 100%', 'completed', 'paid'], true);

    $newPaySt  = $curPaySt;
    $newStatus = $curStatus;
    if ($newRemaining > 0) {
        if ($wasFullPaid) {
            $newPaySt = 'Còn thiếu phần phát sinh';
        }
        if (in_array($curStatus, ['completed', 'Hoàn thành'], true)) {
            $bDate = (string)($booking['booking_date'] ?? date('Y-m-d'));
            $newStatus = ($bDate < date('Y-m-d')) ? 'Đã đá - chưa tất toán' : 'Đang đá';
        }
    } elseif ($curPaySt === 'Còn thiếu phần phát sinh' && $paidAmt >= $newTotal && $newTotal > 0) {
        $newPaySt = 'Đã thanh toán 100%';
    }

    return [
        'status'           => $newStatus,
        'payment_status'   => $newPaySt,
        'remaining_amount' => $newRemaining
    ];
}

function handle_admin_update_payment(PDO $pdo, array $data, string $method, array $actor): void {
    $mgr = require_manager_or_admin($pdo);
    if ($method !== 'POST') {
        json_error('Phương thức không được hỗ trợ.', 405, 'ERR_METHOD_NOT_ALLOWED');
    }
    $code = sanitize_string($data['code'] ?? '', 40);
    $status = sanitize_string($data['status'] ?? '', 50);

    $allowedStatuses = [
        'Chờ duyệt cọc', 'Đã cọc 30%', 'Đã cọc 60%', 'Đã cọc', 'Đã thanh toán đủ', 'Đã thanh toán 100%',
        'Đã hoàn cọc 100%', 'Bảo lưu cọc 30%', 'Phạt 50% cọc', 'Đã hủy',
        'Tịch thu cọc 30%', 'Chưa cọc (Khách quen)', 'completed', 'Hoàn thành'
    ];
    if (!in_array($status, $allowedStatuses, true)) {
        json_response(['success' => false, 'message' => 'Trạng thái thanh toán không hợp lệ.'], 400);
    }

    $pdo->beginTransaction();
    try {
        $oldStmt = $pdo->prepare("SELECT * FROM bookings WHERE code = ? LIMIT 1 FOR UPDATE");
        $oldStmt->execute([$code]);
        $oldRow = $oldStmt->fetch();
        if (!$oldRow) {
            $pdo->rollBack();
            json_error('Không tìm thấy đơn đặt sân tương ứng.', 404, 'ERR_BOOKING_NOT_FOUND');
        }

        $txCheck = $pdo->prepare("SELECT COUNT(*) FROM bank_transactions WHERE (matched_booking_code = ? OR detected_booking_code = ?) AND transfer_amount > 0 AND match_status IN ('matched', 'underpaid', 'overpaid', 'resolved')");
        $txCheck->execute([$code, $code]);
        $hasBankMoney = ((int)$txCheck->fetchColumn() > 0);
        $hasPaidMoney = ((int)($oldRow['paid_amount'] ?? 0) > 0 || $hasBankMoney);

        if ($status === 'Đã hủy' && $hasPaidMoney) {
            $pdo->rollBack();
            json_error('Đơn đặt sân này đã có giao dịch chuyển tiền! Không được phép từ chối hủy ngang. Vui lòng dùng chức năng "Hủy & hoàn cọc" của Quản lý.', 400, 'ERR_CANNOT_REJECT_PAID_BOOKING');
        }

        $oldPaymentStatus = $oldRow['payment_status'] . ' (' . $oldRow['status'] . ')';

        $isTerminalStatus = in_array((string)($oldRow['status'] ?? ''), ['Đã hủy', 'Khách chưa đến'], true);

        if ($status === 'Đã cọc 30%' || $status === 'Đã cọc 60%' || $status === 'Đã cọc') {
            if ($isTerminalStatus) {
                $pdo->rollBack();
                json_error('Không thể duyệt cọc cho đơn đã hủy hoặc khách chưa đến.', 400, 'ERR_INVALID_BOOKING_STATUS');
            }
            $txRowStmt = $pdo->prepare("SELECT * FROM bank_transactions WHERE (matched_booking_code = ? OR detected_booking_code = ?) ORDER BY id DESC LIMIT 1");
            $txRowStmt->execute([$code, $code]);
            $txRow = $txRowStmt->fetch();

            $depAmt = (int)($oldRow['deposit_amount'] ?? 0);
            $txAmt = (int)($txRow['transfer_amount'] ?? 0);
            $matchSt = (string)($txRow['match_status'] ?? '');

            $noteAdd = '';
            $clientNote = trim((string)($data['note'] ?? ''));
            $clientRef = trim((string)($data['reference_code'] ?? ''));

            if ($matchSt === 'underpaid' || ($txAmt > 0 && $txAmt < $depAmt)) {
                if ($clientNote === '') {
                    $pdo->rollBack();
                    json_error('Bắt buộc nhập ghi chú xử lý chênh lệch đối với đơn nhận thiếu cọc!', 400, 'ERR_DISCREPANCY_NOTE_REQUIRED');
                }
                $noteAdd = " [Duyệt thiếu cọc: {$clientNote}]";
            } elseif ($matchSt === 'overpaid' || ($txAmt > $depAmt && $depAmt > 0)) {
                if ($clientNote === '') {
                    $pdo->rollBack();
                    json_error('Bắt buộc nhập ghi chú xử lý chênh lệch đối với đơn nhận thừa cọc!', 400, 'ERR_DISCREPANCY_NOTE_REQUIRED');
                }
                $noteAdd = " [Duyệt thừa cọc: {$clientNote}]";
            } elseif (!$txRow || $matchSt === 'unmatched') {
                if ($clientNote === '' && $clientRef === '') {
                    $pdo->rollBack();
                    json_error('Duyệt thủ công đơn chưa thấy tiền bắt buộc nhập mã tham chiếu hoặc ghi chú giao dịch!', 400, 'ERR_MANUAL_REF_REQUIRED');
                }
                $refStr = $clientRef !== '' ? "Mã GD: {$clientRef}" : "";
                $noteAdd = " [Duyệt thủ công: " . trim("{$refStr} {$clientNote}") . "]";
            }

            $weeksCount = max(1, (int)($oldRow['weeks_count'] ?? 1));
            $approvedPayLabel = ($status === 'Đã cọc') ? ($weeksCount > 1 ? 'Đã cọc 60%' : 'Đã cọc 30%') : $status;
            $nextBookingStatus = in_array((string)($oldRow['status'] ?? ''), ['Đang đá', 'completed', 'Hoàn thành'], true)
                ? (string)$oldRow['status']
                : 'Đã xác nhận';

            $oldPaid = max(0, (int)($oldRow['paid_amount'] ?? 0));
            $targetPaid = max($oldPaid, (int)($oldRow['deposit_amount'] ?? 0));
            $deltaPaid = max(0, $targetPaid - $oldPaid);
            $oldPayMethod = (string)($oldRow['payment_method'] ?? '');
            $isOldCash = (mb_stripos($oldPayMethod, 'Tiền mặt') !== false);
            $oldCash = max(0, (int)($oldRow['cash_paid_amount'] ?? 0));
            $oldTransfer = max(0, (int)($oldRow['transfer_paid_amount'] ?? 0));
            if ($oldPaid > 0 && $oldCash === 0 && $oldTransfer === 0) {
                if ($isOldCash) { $oldCash = $oldPaid; } else { $oldTransfer = $oldPaid; }
            }
            if ($isOldCash) { $oldCash += $deltaPaid; } else { $oldTransfer += $deltaPaid; }

            $stmt = $pdo->prepare("UPDATE bookings SET payment_status = ?, status = ?, paid_amount = GREATEST(paid_amount, deposit_amount), cash_paid_amount = ?, transfer_paid_amount = ?, remaining_amount = GREATEST(0, total_price - GREATEST(paid_amount, deposit_amount)), note = CONCAT(IFNULL(note,''), ?) WHERE code = ?");
            $stmt->execute([$approvedPayLabel, $nextBookingStatus, $oldCash, $oldTransfer, $noteAdd, $code]);
            award_booking_loyalty_points($pdo, $oldRow);
            $status = $approvedPayLabel;
        } elseif ($status === 'Đã hoàn cọc 100%') {
            $stmt = $pdo->prepare("UPDATE bookings SET payment_status = ?, status = 'Đã hủy', remaining_amount = 0, cancel_policy_applied = 'refund_100', refund_amount = GREATEST(paid_amount, deposit_amount) WHERE code = ?");
            $stmt->execute([$status, $code]);
            if (!$isTerminalStatus) {
                restore_booking_resources_on_cancel($pdo, $oldRow, true);
            }
        } elseif ($status === 'Phạt 50% cọc') {
            $stmt = $pdo->prepare("UPDATE bookings SET payment_status = ?, status = 'Đã hủy', remaining_amount = 0, cancel_policy_applied = 'forfeit_50', refund_amount = ROUND(GREATEST(paid_amount, deposit_amount) * 0.5) WHERE code = ?");
            $stmt->execute([$status, $code]);
            if (!$isTerminalStatus) {
                restore_booking_resources_on_cancel($pdo, $oldRow, true);
            }
        } elseif ($status === 'Bảo lưu cọc 30%') {
            $stmt = $pdo->prepare("UPDATE bookings SET payment_status = ?, status = 'Đã hủy', remaining_amount = 0, cancel_policy_applied = 'reserve', refund_amount = 0 WHERE code = ?");
            $stmt->execute([$status, $code]);
            if (!$isTerminalStatus) {
                restore_booking_resources_on_cancel($pdo, $oldRow, true);
            }
        } elseif ($status === 'Đã hủy') {
            $stmt = $pdo->prepare("UPDATE bookings SET payment_status = ?, status = 'Đã hủy', remaining_amount = 0, cancel_policy_applied = COALESCE(cancel_policy_applied, 'admin_reject'), refund_amount = 0 WHERE code = ?");
            $stmt->execute([$status, $code]);
            if (!$isTerminalStatus) {
                restore_booking_resources_on_cancel($pdo, $oldRow, true);
            }
        } elseif ($status === 'Đã thanh toán 100%' || $status === 'Đã thanh toán đủ') {
            if ($isTerminalStatus) {
                $pdo->rollBack();
                json_error('Không thể cập nhật thanh toán đủ cho đơn đã hủy hoặc khách chưa đến.', 400, 'ERR_INVALID_BOOKING_STATUS');
            }
            $oldPaid = max(0, (int)($oldRow['paid_amount'] ?? 0));
            $totPriceRow = max(0, (int)($oldRow['total_price'] ?? 0));
            $deltaPaid = max(0, $totPriceRow - $oldPaid);
            $oldPayMethod = (string)($oldRow['payment_method'] ?? '');
            $isPayCash = (mb_stripos($oldPayMethod, 'Tiền mặt') !== false);
            $oldCash = max(0, (int)($oldRow['cash_paid_amount'] ?? 0));
            $oldTransfer = max(0, (int)($oldRow['transfer_paid_amount'] ?? 0));
            if ($oldPaid > 0 && $oldCash === 0 && $oldTransfer === 0) {
                if ($isPayCash) { $oldCash = $oldPaid; } else { $oldTransfer = $oldPaid; }
            }
            if ($isPayCash) { $oldCash += $deltaPaid; } else { $oldTransfer += $deltaPaid; }

            $stmt = $pdo->prepare("UPDATE bookings SET payment_status = ?, status = 'completed', paid_amount = total_price, cash_paid_amount = ?, transfer_paid_amount = ?, remaining_amount = 0 WHERE code = ?");
            $stmt->execute([$status, $oldCash, $oldTransfer, $code]);
            award_booking_loyalty_points($pdo, $oldRow);
        } elseif ($status === 'completed' || $status === 'Hoàn thành') {
            if ($isTerminalStatus) {
                $pdo->rollBack();
                json_error('Không thể hoàn tất đơn đặt sân đã hủy hoặc khách chưa đến.', 400, 'ERR_INVALID_BOOKING_STATUS');
            }
            $totPrice = (int)($oldRow['total_price'] ?? 0);
            $paidAmt  = (int)($oldRow['paid_amount'] ?? 0);
            if ($totPrice > $paidAmt) {
                $pdo->rollBack();
                $diff = $totPrice - $paidAmt;
                json_error("Không thể hoàn tất đơn đặt sân khi chưa thanh toán đủ (Còn thiếu: " . number_format($diff, 0, ',', '.') . "đ). Vui lòng thu đủ hoặc Điều chỉnh giảm trước khi hoàn tất.", 400, 'ERR_UNPAID_COMPLETION');
            }
            $stmt = $pdo->prepare("UPDATE bookings SET status = 'completed', remaining_amount = GREATEST(0, total_price - paid_amount) WHERE code = ?");
            $stmt->execute([$code]);
            award_booking_loyalty_points($pdo, $oldRow);
        } else {
            $stmt = $pdo->prepare("UPDATE bookings SET payment_status = ? WHERE code = ?");
            $stmt->execute([$status, $code]);
        }

        write_audit_log($pdo, 'UPDATE_PAYMENT', $code, $oldPaymentStatus, $status, $mgr);
        $pdo->commit();

        if (function_exists('send_telegram_notification')) {
            if (in_array($status, ['Đã cọc 30%', 'Đã cọc 60%', 'Đã cọc', 'Đã thanh toán 100%', 'Đã thanh toán đủ'], true)) {
                $tgDelta = max(0, (int)($deltaPaid ?? 0));
                $tgMsg = "💳 <b>DUYỆT / CẬP NHẬT THANH TOÁN</b>\n"
                       . "• Mã vé: <code>" . tg_escape($code) . "</code>\n"
                       . "• Khách: <b>" . tg_escape($oldRow['customer_name'] ?? '') . "</b>\n"
                       . "• Trạng thái: <b>" . tg_escape($status) . "</b>" . ($tgDelta > 0 ? (" (+<b>" . number_format($tgDelta) . " đ</b>)") : '') . "\n"
                       . "• Người duyệt: " . tg_escape($mgr['full_name'] ?? $mgr['username'] ?? 'Quản lý');
                send_telegram_notification($tgMsg, 'payment', $pdo);
            } elseif (in_array($status, ['Đã hoàn cọc 100%', 'Phạt 50% cọc', 'Bảo lưu cọc 30%', 'Đã hủy'], true)) {
                $tgMsg = "⚠️ <b>CẬP NHẬT HỦY / HOÀN CỌC</b>\n"
                       . "• Mã vé: <code>" . tg_escape($code) . "</code>\n"
                       . "• Khách: <b>" . tg_escape($oldRow['customer_name'] ?? '') . "</b>\n"
                       . "• Kết quả: <b>" . tg_escape($status) . "</b>\n"
                       . "• Người xử lý: " . tg_escape($mgr['full_name'] ?? $mgr['username'] ?? 'Quản lý');
                send_telegram_notification($tgMsg, 'cancel', $pdo);
            }
        }

        json_response([
            'success' => true,
            'message' => "Đã cập nhật trạng thái đơn {$code} thành: {$status}"
        ]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("[UPDATE_PAYMENT ERROR] " . $e->getMessage());
        json_error('Lỗi hệ thống khi cập nhật trạng thái thanh toán.', 500, 'ERR_UPDATE_PAYMENT_FAILED');
    }
}

function handle_admin_manage_booking(PDO $pdo, array $data, string $method, array $actor): void {
    if ($method !== 'POST') {
        json_error('Phương thức HTTP không được hỗ trợ.', 405, 'ERR_METHOD_NOT_ALLOWED');
    }
    $code = sanitize_string($data['code'] ?? '', 40);
    $subAction = sanitize_string($data['sub_action'] ?? '', 40);
    if (empty($code) || empty($subAction)) {
        json_response(['success' => false, 'message' => 'Thiếu mã đơn hoặc hành động xử lý.'], 400);
    }

    $oldStmt = $pdo->prepare("SELECT * FROM bookings WHERE code = ? LIMIT 1");
    $oldStmt->execute([$code]);
    $oldBooking = $oldStmt->fetch() ?: [];

    if ($subAction === 'overtime') {
        $minutes = max(15, min(180, (int)($data['minutes'] ?? 30)));
        $fee = max(0, min(10000000, (int)($data['fee'] ?? 0)));
        if ($fee === 0) {
            require_manager_or_admin($pdo);
        } elseif ($fee < 10000) {
            json_error('Phụ phí đá thêm giờ phải tối thiểu 10.000đ (hoặc Quản lý/Admin miễn phí = 0đ).', 400, 'ERR_INVALID_FEE');
        }

        $pdo->beginTransaction();
        try {
            $lockStmt = $pdo->prepare("SELECT * FROM bookings WHERE code = ? LIMIT 1 FOR UPDATE");
            $lockStmt->execute([$code]);
            $lockedBooking = $lockStmt->fetch();
            if (!$lockedBooking) {
                $pdo->rollBack();
                json_error('Không tìm thấy đơn đặt sân cần gia hạn.', 404, 'ERR_BOOKING_NOT_FOUND');
            }
            if (in_array((string)($lockedBooking['status'] ?? ''), ['Đã hủy', 'Khách chưa đến'], true)) {
                $pdo->rollBack();
                json_error('Không thể đá thêm giờ cho đơn đã hủy hoặc khách chưa đến.', 400, 'ERR_INVALID_BOOKING_STATUS');
            }
            if (in_array((string)($lockedBooking['status'] ?? ''), ['completed', 'Hoàn thành'], true) && (string)($lockedBooking['booking_date'] ?? '') < date('Y-m-d')) {
                $pdo->rollBack();
                json_error('Không thể đá thêm giờ cho đơn đã hoàn tất của ngày trước.', 400, 'ERR_INVALID_BOOKING_STATUS');
            }

            $oldTotal = max(0, (int)($lockedBooking['total_price'] ?? 0));
            $paidAmt  = max(0, (int)($lockedBooking['paid_amount'] ?? 0));
            $newTotal = $oldTotal + $fee;
            $syncedState = _sync_payment_state_after_charge($lockedBooking, $newTotal, $paidAmt);

            $noteAdd = " [Đá thêm {$minutes}p: +" . number_format($fee, 0, ',', '.') . "đ]";
            $stmt = $pdo->prepare("UPDATE bookings SET total_price = ?, remaining_amount = ?, status = ?, payment_status = ?, note = CONCAT(IFNULL(note,''), ?) WHERE code = ?");
            $stmt->execute([$newTotal, $syncedState['remaining_amount'], $syncedState['status'], $syncedState['payment_status'], $noteAdd, $code]);

            write_audit_log($pdo, 'ADD_OVERTIME', $code, (string)$oldTotal, "{$newTotal} (+{$minutes}p)", $actor);
            $pdo->commit();

            json_response([
                'success' => true,
                'message' => "Đã cộng thêm {$minutes} phút đá thêm giờ.",
                'data'    => [
                    'totalPrice'      => $newTotal,
                    'remainingAmount' => $syncedState['remaining_amount'],
                    'status'          => $syncedState['status'],
                    'paymentStatus'   => $syncedState['payment_status'],
                    'minutes'         => $minutes,
                    'fee'             => $fee
                ]
            ]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log("[ADD_OVERTIME ERROR] " . $e->getMessage());
            json_error('Lỗi hệ thống khi gia hạn giờ đá.', 500, 'ERR_OVERTIME_FAILED');
        }
    }

    if ($subAction === 'transfer_pitch') {
        $newPitchId = sanitize_string($data['new_pitch_id'] ?? '', 20);
        $adjustPrice = !array_key_exists('adjust_price', $data) || !empty($data['adjust_price']);
        $reason = sanitize_string($data['reason'] ?? '', 150);
        if (empty($oldBooking)) {
            json_error('Không tìm thấy đơn đặt sân cần chuyển.', 404, 'ERR_BOOKING_NOT_FOUND');
        }
        if ($newPitchId === '' || $newPitchId === ($oldBooking['pitch_id'] ?? '')) {
            json_error('Vui lòng chọn sân đích khác với sân hiện tại.', 400, 'ERR_INVALID_TARGET_PITCH');
        }

        try {
            $pdo->beginTransaction();
            $npStmt = $pdo->prepare("SELECT id, name, type, base_price, peak_price, weekend_price, status FROM pitches WHERE id = ? LIMIT 1 FOR UPDATE");
            $npStmt->execute([$newPitchId]);
            $targetPitch = $npStmt->fetch();
            if (!$targetPitch || in_array($targetPitch['status'], ['Bảo trì', 'Ẩn'], true)) {
                $pdo->rollBack();
                json_error('Sân chuyển đến không tồn tại hoặc đang bảo trì/tạm ẩn.', 400, 'ERR_PITCH_UNAVAILABLE');
            }

            $lockOldStmt = $pdo->prepare("SELECT * FROM bookings WHERE code = ? LIMIT 1 FOR UPDATE");
            $lockOldStmt->execute([$code]);
            $oldBooking = $lockOldStmt->fetch();
            if (!$oldBooking) {
                $pdo->rollBack();
                json_error('Không tìm thấy đơn đặt sân cần chuyển.', 404, 'ERR_BOOKING_NOT_FOUND');
            }
            if ($newPitchId === (string)$oldBooking['pitch_id']) {
                $pdo->rollBack();
                json_error('Vui lòng chọn sân đích khác với sân hiện tại.', 400, 'ERR_INVALID_TARGET_PITCH');
            }

            $occurrenceDates = booking_occurrence_dates($oldBooking);
            foreach ($occurrenceDates as $occurrenceDate) {
                $busyBooking = find_booking_conflict($pdo, $newPitchId, $occurrenceDate, (string)$oldBooking['slot_id'], $code);
                if ($busyBooking) {
                    $pdo->rollBack();
                    json_error("Sân {$targetPitch['name']} ngày {$occurrenceDate} khung giờ {$oldBooking['slot_time']} đã có đơn #{$busyBooking['code']}!", 409, 'ERR_DOUBLE_BOOKING');
                }
                if ($mRow = find_active_maintenance_for_slot($pdo, $newPitchId, $occurrenceDate, (string)$oldBooking['slot_time'])) {
                    $pdo->rollBack();
                    json_error("Sân {$targetPitch['name']} đang bảo trì ngày {$occurrenceDate} khung giờ này: {$mRow['reason']}.", 400, 'ERR_PITCH_MAINTENANCE');
                }
            }

            $diffPrice = 0;
            $oldTotal = max(0, (int)($oldBooking['total_price'] ?? 0));
            $oldOriginal = max($oldTotal, (int)($oldBooking['original_price'] ?? $oldTotal));
            if ($adjustPrice) {
                $opStmt = $pdo->prepare("SELECT id, name, type, base_price, peak_price, weekend_price FROM pitches WHERE id = ? LIMIT 1");
                $opStmt->execute([$oldBooking['pitch_id']]);
                $oldPitch = $opStmt->fetch();

                $slStmt = $pdo->prepare("SELECT id, slot_time, is_peak, duration FROM time_slots WHERE id = ? LIMIT 1");
                $slStmt->execute([$oldBooking['slot_id']]);
                $slotRow = $slStmt->fetch();

                if ($oldPitch && $slotRow) {
                    $bookingTs = strtotime((string)$oldBooking['booking_date']) ?: time();
                    $isPeak = !empty($slotRow['is_peak']);
                    $dayOfWeek = (int)date('w', $bookingTs);
                    $isWeekend = ($dayOfWeek === 0 || $dayOfWeek === 6);
                    $ghDay = (int)date('N', $bookingTs);
                    $duration = (float)($slotRow['duration'] ?? 1.0) ?: 1.0;
                    $weeksCount = max(1, (int)($oldBooking['weeks_count'] ?? 1));
                    $pkgRate = ($weeksCount >= 12) ? 0.15 : (($weeksCount >= 8) ? 0.10 : (($weeksCount >= 4) ? 0.05 : 0.0));

                    $computeMatchPrice = static function (array $pRow) use ($pdo, $isPeak, $isWeekend, $duration, $weeksCount, $pkgRate, $ghDay, $slotRow) {
                        $wkPrice = (int)($pRow['weekend_price'] ?? 0);
                        if ($isWeekend && $wkPrice > 0) {
                            $unitBase = $isPeak ? max((int)$pRow['peak_price'], $wkPrice) : $wkPrice;
                        } else {
                            $unitBase = $isPeak ? (int)$pRow['peak_price'] : (int)$pRow['base_price'];
                        }
                        $raw = (int)round($unitBase * $weeksCount * (1 - $pkgRate));
                        $gh = resolve_golden_hour_adjustment($pdo, (int)$pRow['type'], $ghDay, (string)$slotRow['id'], $raw);
                        return (int)$gh['adjustedPitchPrice'];
                    };

                    $oldPitchPrice = $computeMatchPrice($oldPitch);
                    $newPitchPrice = $computeMatchPrice($targetPitch);
                    $diffPrice = $newPitchPrice - $oldPitchPrice;
                }
            }

            $newTotal = max(0, $oldTotal + $diffPrice);
            $newOriginal = max(0, $oldOriginal + $diffPrice);
            $paidBase = max(0, (int)($oldBooking['paid_amount'] ?? 0));
            $payCur   = (string)($oldBooking['payment_status'] ?? '');
            if ($paidBase === 0 && (in_array($payCur, ['Đã cọc 30%', 'Đã cọc 60%', 'Đã cọc'], true) || mb_stripos($payCur, 'Đã cọc') !== false)) {
                $paidBase = max(0, (int)($oldBooking['deposit_amount'] ?? 0));
            } elseif ($paidBase === 0 && in_array($payCur, ['Đã thanh toán đủ', 'Đã thanh toán 100%'], true)) {
                $paidBase = $oldTotal;
            }
            $syncedState = _sync_payment_state_after_charge($oldBooking, $newTotal, $paidBase);
            $newRemaining = $syncedState['remaining_amount'];

            $diffLabel = ($adjustPrice && $diffPrice !== 0) ? (' ' . ($diffPrice > 0 ? '+' : '') . number_format($diffPrice, 0, ',', '.') . 'đ') : ($adjustPrice ? '' : ' Giữ nguyên giá');
            $noteAdd = " [Đổi sang sân {$targetPitch['name']} ({$newPitchId}){$diffLabel}" . ($reason ? ": {$reason}" : "") . "]";

            $stmt = $pdo->prepare("UPDATE bookings SET pitch_id = ?, original_price = ?, total_price = ?, remaining_amount = ?, status = ?, payment_status = ?, note = CONCAT(IFNULL(note,''), ?) WHERE code = ?");
            $stmt->execute([$newPitchId, $newOriginal, $newTotal, $newRemaining, $syncedState['status'], $syncedState['payment_status'], $noteAdd, $code]);
            $pdo->commit();
        } catch (Throwable $trEx) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log("[TRANSFER_PITCH ERROR] " . $trEx->getMessage());
            json_error('Lỗi hệ thống khi chuyển sân cho đơn đặt.', 500, 'ERR_TRANSFER_PITCH_FAILED');
        }

        write_audit_log($pdo, 'TRANSFER_PITCH', $code, ($oldBooking['pitch_id'] ?? '') . " (Tổng {$oldTotal}đ)", "{$newPitchId} (Tổng {$newTotal}đ, chênh lệch {$diffPrice}đ)" . ($reason ? " ({$reason})" : ''), $actor);

        send_customer_notification($pdo, 'transfer_pitch', [
            'booking_id'    => (int)$oldBooking['id'],
            'booking_code'  => $code,
            'code'          => $code,
            'customer_name' => (string)($oldBooking['customer_name'] ?? ''),
            'phone'         => (string)($oldBooking['phone'] ?? ''),
            'pitch_name'    => (string)$targetPitch['name'],
            'date'          => date('d/m/Y', strtotime((string)$oldBooking['booking_date'])),
            'slot_time'     => (string)($oldBooking['slot_time'] ?? '')
        ]);

        if (!empty($oldBooking['pitch_id']) && $newPitchId !== $oldBooking['pitch_id']) {
            trigger_waitlist_notification($pdo, (string)$oldBooking['pitch_id'], (string)$oldBooking['booking_date'], (string)$oldBooking['slot_id'], (string)($oldBooking['slot_time'] ?? ''), $actor, $code);
        }

        json_response([
            'success' => true,
            'message' => "Đã chuyển đơn {$code} sang sân {$targetPitch['name']} ({$newPitchId}).",
            'data'    => [
                'pitchId'         => $newPitchId,
                'pitchName'       => $targetPitch['name'],
                'diffPrice'       => $diffPrice,
                'originalPrice'   => $newOriginal,
                'totalPrice'      => $newTotal,
                'remainingAmount' => $newRemaining
            ]
        ]);
    }

    if ($subAction === 'add_service') {
        if (empty($oldBooking)) {
            json_error('Không tìm thấy đơn đặt sân.', 404, 'ERR_BOOKING_NOT_FOUND');
        }
        $srvId = sanitize_string($data['service_id'] ?? '', 30);
        $srvNameFallback = sanitize_string($data['service_name'] ?? '', 100);
        $qty = max(1, min(50, (int)($data['quantity'] ?? 1)));

        try {
            $pdo->beginTransaction();
            $lockStmt = $pdo->prepare("SELECT id, code, booking_date, status, payment_status, services_json, total_price, paid_amount, remaining_amount FROM bookings WHERE code = ? LIMIT 1 FOR UPDATE");
            $lockStmt->execute([$code]);
            $lockedBooking = $lockStmt->fetch();
            if (!$lockedBooking) {
                $pdo->rollBack();
                json_error('Không tìm thấy đơn đặt sân.', 404, 'ERR_BOOKING_NOT_FOUND');
            }
            if (in_array((string)($lockedBooking['status'] ?? ''), ['Đã hủy', 'Khách chưa đến'], true)) {
                $pdo->rollBack();
                json_error('Không thể gọi thêm dịch vụ cho đơn đã hủy hoặc khách chưa đến.', 400, 'ERR_INVALID_BOOKING_STATUS');
            }

            if ($srvId !== '') {
                $srvStmt = $pdo->prepare("SELECT id, name, price, unit, stock_qty, track_inventory FROM extra_services WHERE id = ? AND is_active = 1 LIMIT 1 FOR UPDATE");
                $srvStmt->execute([$srvId]);
            } else {
                $srvStmt = $pdo->prepare("SELECT id, name, price, unit, stock_qty, track_inventory FROM extra_services WHERE name = ? AND is_active = 1 LIMIT 1 FOR UPDATE");
                $srvStmt->execute([$srvNameFallback]);
            }
            $srvRow = $srvStmt->fetch();
            if (!$srvRow) {
                $pdo->rollBack();
                json_error('Dịch vụ không tồn tại hoặc đã ngừng kinh doanh.', 400, 'ERR_INVALID_SERVICE');
            }

            if ((int)($srvRow['track_inventory'] ?? 1) === 1 && (int)($srvRow['stock_qty'] ?? 0) < $qty) {
                $pdo->rollBack();
                json_error("Kho {$srvRow['name']} chỉ còn {$srvRow['stock_qty']} {$srvRow['unit']}, không đủ xuất {$qty}!", 400, 'ERR_INSUFFICIENT_STOCK');
            }

            $unitPrice = max(0, (int)$srvRow['price']);
            $addedCost = $unitPrice * $qty;

            $existingServices = !empty($lockedBooking['services_json']) ? json_decode((string)$lockedBooking['services_json'], true) : [];
            if (!is_array($existingServices)) {
                $existingServices = [];
            }
            $merged = false;
            foreach ($existingServices as &$exItem) {
                if (is_array($exItem) && ($exItem['id'] ?? '') === $srvRow['id']) {
                    $exQty = max(0, (int)($exItem['quantity'] ?? 0)) + $qty;
                    $exItem['name'] = $srvRow['name'];
                    $exItem['price'] = $unitPrice;
                    $exItem['unit'] = $srvRow['unit'];
                    $exItem['quantity'] = $exQty;
                    $exItem['lineTotal'] = $exQty * $unitPrice;
                    $exItem['total'] = $exQty * $unitPrice;
                    $merged = true;
                    break;
                }
            }
            unset($exItem);
            if (!$merged) {
                $existingServices[] = [
                    'id'        => $srvRow['id'],
                    'name'      => $srvRow['name'],
                    'price'     => $unitPrice,
                    'quantity'  => $qty,
                    'unit'      => $srvRow['unit'],
                    'lineTotal' => $addedCost,
                    'total'     => $addedCost
                ];
            }

            $servicesJson = json_encode($existingServices, JSON_UNESCAPED_UNICODE);
            $newTotal     = max(0, (int)$lockedBooking['total_price']) + $addedCost;
            $paidAmtCur   = max(0, (int)($lockedBooking['paid_amount'] ?? 0));
            $syncedState  = _sync_payment_state_after_charge($lockedBooking, $newTotal, $paidAmtCur);
            $noteAdd = " [Gọi thêm: {$srvRow['name']} x{$qty} (+" . number_format($addedCost, 0, ',', '.') . "đ)]";
            $updStmt = $pdo->prepare("UPDATE bookings SET services_json = ?, total_price = ?, remaining_amount = ?, status = ?, payment_status = ?, note = CONCAT(IFNULL(note,''), ?) WHERE code = ?");
            $updStmt->execute([$servicesJson, $newTotal, $syncedState['remaining_amount'], $syncedState['status'], $syncedState['payment_status'], $noteAdd, $code]);

            deduct_service_inventory($pdo, $srvRow['id'], $qty, $code, $unitPrice, 'Gọi thêm vào đơn sân', "Gọi thêm cho đơn #{$code}", $actor['id'] ?? null);
            $pdo->commit();
        } catch (Throwable $srvEx) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log("[ADD_SERVICE ERROR] " . $srvEx->getMessage());
            json_error('Lỗi hệ thống khi thêm dịch vụ vào đơn đặt sân.', 500, 'ERR_ADD_SERVICE_FAILED');
        }

        write_audit_log($pdo, 'ADD_SERVICE', $code, null, "{$srvRow['name']} x{$qty} (+{$addedCost}đ)", $actor);

        json_response([
            'success' => true,
            'message' => "Đã thêm {$srvRow['name']} x{$qty} vào đơn {$code}.",
            'data'    => [
                'services'        => $existingServices,
                'addedCost'       => $addedCost,
                'totalPrice'      => $newTotal,
                'remainingAmount' => $syncedState['remaining_amount'],
                'status'          => $syncedState['status'],
                'paymentStatus'   => $syncedState['payment_status']
            ]
        ]);
    }

    if ($subAction === 'early_cancel' || $subAction === 'cancel') {
        $requestedPolicy = sanitize_string($data['policy'] ?? 'auto', 30);
        if ($requestedPolicy !== 'auto' && $requestedPolicy !== '') {
            require_manager_or_admin($pdo);
        }
        $rawReason = trim((string)($data['reason'] ?? ''));

        $pdo->beginTransaction();
        try {
            $lockStmt = $pdo->prepare("SELECT * FROM bookings WHERE code = ? LIMIT 1 FOR UPDATE");
            $lockStmt->execute([$code]);
            $lockedBooking = $lockStmt->fetch();
            if (!$lockedBooking) {
                $pdo->rollBack();
                json_error('Không tìm thấy đơn đặt sân cần hủy.', 404, 'ERR_BOOKING_NOT_FOUND');
            }
            if (in_array((string)($lockedBooking['status'] ?? ''), ['Đã hủy', 'Khách chưa đến', 'completed', 'Hoàn thành'], true)) {
                $pdo->rollBack();
                json_error('Đơn đặt sân này không thể hủy do trạng thái hiện tại là: ' . $lockedBooking['status'], 400, 'ERR_INVALID_BOOKING_STATUS');
            }

            $isPaidOrDeposited = (
                (int)($lockedBooking['paid_amount'] ?? 0) > 0 ||
                in_array($lockedBooking['payment_status'] ?? '', ['Đã cọc 30%', 'Đã cọc 60%', 'Đã cọc', 'Đã thanh toán đủ', 'Đã thanh toán 100%', 'Còn thiếu phần phát sinh', 'deposited', 'completed', 'paid'], true) ||
                (mb_stripos((string)($lockedBooking['payment_status'] ?? ''), 'Đã cọc') !== false)
            );
            if ($isPaidOrDeposited && $rawReason === '') {
                $pdo->rollBack();
                json_error('Đơn đã thu tiền/đặt cọc bắt buộc phải nhập lý do hủy!', 400, 'ERR_CANCEL_REASON_REQUIRED');
            }
            $reason = $rawReason !== '' ? sanitize_string($rawReason, 150) : 'Hủy lịch trước thời hạn';
            $oldStateStr = ($lockedBooking['status'] ?? '') . ' (' . ($lockedBooking['payment_status'] ?? '') . ')';

            $sysSettings = get_system_settings_map($pdo);
            $eval = evaluate_cancellation_policy($lockedBooking, $sysSettings);
            $policyRecommended = $eval['policy'];
            $hoursBeforeMatch  = $eval['hours_before_match'];
            $paidBase          = $eval['paid_base'];

            $targetStatus = 'Đã hủy';
            if ($requestedPolicy === '' || $requestedPolicy === 'auto') {
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

            if ($paidBase <= 0) {
                // T5-01: Đơn chưa thanh toán/chưa cọc bất kể chọn hủy hay no-show đều chuyển thành Đã hủy (doanh thu = 0đ)
                $targetStatus  = 'Đã hủy';
                $appliedPolicy = ($requestedPolicy === 'noshow_forfeit') ? 'unpaid_noshow_cancel' : 'unpaid_free_cancel';
                $payStatus     = 'Đã hủy';
                $refundAmount  = 0;
            }

            $policyNoteMap = [
                'unpaid_free_cancel'   => 'Chưa thanh toán cọc',
                'unpaid_noshow_cancel' => 'Quá giờ chưa cọc',
                'refund_100'           => 'Hoàn cọc 100%',
                'forfeit_50'           => 'Phạt 50% cọc',
                'forfeit_100'          => 'Không hoàn cọc',
                'reserve'              => 'Bảo lưu cọc',
            ];
            $policyNoteLabel = $policyNoteMap[$appliedPolicy] ?? $payStatus;
            $noteAdd = ($targetStatus === 'Khách chưa đến')
                ? " [Quá 15p khách chưa đến - Đã nhả sân trống: {$reason}]"
                : " [Hủy trước hạn ({$policyNoteLabel}, hoàn " . number_format($refundAmount) . "đ) - {$payStatus}: {$reason}]";

            $stmt = $pdo->prepare("UPDATE bookings SET status = ?, payment_status = ?, remaining_amount = 0, cancel_policy_applied = ?, refund_amount = ?, note = CONCAT(IFNULL(note,''), ?) WHERE code = ?");
            $stmt->execute([$targetStatus, $payStatus, $appliedPolicy, $refundAmount, $noteAdd, $code]);

            restore_booking_resources_on_cancel($pdo, $lockedBooking, ($paidBase > 0));
            write_audit_log($pdo, 'CANCEL_BOOKING', $code, $oldStateStr, "{$targetStatus} ({$payStatus}) | Chính sách: {$appliedPolicy} (Đề xuất: {$policyRecommended}, còn {$hoursBeforeMatch}h) | Hoàn: " . number_format($refundAmount) . "đ | Lý do: {$reason}", $actor);
            $pdo->commit();
        } catch (Throwable $cancelEx) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log("[ADMIN CANCEL ERROR] " . $cancelEx->getMessage());
            json_error('Lỗi hệ thống khi hủy đơn đặt sân.', 500, 'ERR_CANCEL_FAILED');
        }

        $pNameStmt = $pdo->prepare("SELECT name FROM pitches WHERE id = ? LIMIT 1");
        $pNameStmt->execute([$lockedBooking['pitch_id']]);
        $cancelPitchName = (string)($pNameStmt->fetchColumn() ?: $lockedBooking['pitch_id']);

        $tgMsg = "⚠️ <b>HỦY CA / NHẢ SÂN TỪ QUẦY</b>\n"
               . "• Mã vé: <code>" . tg_escape($code) . "</code>\n"
               . "• Khách: <b>" . tg_escape($lockedBooking['customer_name'] ?? '') . "</b> (" . tg_escape($lockedBooking['phone'] ?? '') . ")\n"
               . "• Sân: <b>" . tg_escape($cancelPitchName) . "</b> ngày <b>" . date('d/m/Y', strtotime((string)$lockedBooking['booking_date'])) . "</b> (" . tg_escape($lockedBooking['slot_time'] ?? '') . ")\n"
               . "• Kết quả: <b>" . tg_escape($targetStatus) . " (" . tg_escape($payStatus) . ")</b> | Hoàn: " . number_format($refundAmount) . " đ\n"
               . "• Lý do: <i>" . tg_escape($reason) . "</i>";
        send_telegram_notification($tgMsg, 'cancel', $pdo);

        send_customer_notification($pdo, 'cancel_booking', [
            'booking_id'    => (int)$lockedBooking['id'],
            'booking_code'  => $code,
            'code'          => $code,
            'customer_name' => (string)$lockedBooking['customer_name'],
            'phone'         => (string)$lockedBooking['phone'],
            'pitch_name'    => $cancelPitchName,
            'date'          => date('d/m/Y', strtotime((string)$lockedBooking['booking_date'])),
            'slot_time'     => (string)$lockedBooking['slot_time'],
            'reason'        => $reason
        ]);

        trigger_waitlist_notification($pdo, (string)$lockedBooking['pitch_id'], (string)$lockedBooking['booking_date'], (string)$lockedBooking['slot_id'], (string)($lockedBooking['slot_time'] ?? ''), $actor, $code);

        json_response([
            'success' => true,
            'message' => ($targetStatus === 'Khách chưa đến')
                ? "Đã chuyển đơn {$code} sang trạng thái Khách chưa đến ({$payStatus})."
                : "Đã hủy đơn {$code} ({$payStatus}).",
            'data' => [
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

    if ($subAction === 'pay_remaining') {
        $payMethod = sanitize_string($data['pay_method'] ?? 'Tiền mặt tại quầy', 60);
        $pdo->beginTransaction();
        try {
            $lockStmt = $pdo->prepare("SELECT * FROM bookings WHERE code = ? LIMIT 1 FOR UPDATE");
            $lockStmt->execute([$code]);
            $lockedBooking = $lockStmt->fetch();
            if (!$lockedBooking) {
                $pdo->rollBack();
                json_error('Không tìm thấy đơn đặt sân cần tất toán.', 404, 'ERR_BOOKING_NOT_FOUND');
            }
            $curStatus = (string)($lockedBooking['status'] ?? '');
            if (in_array($curStatus, ['Đã hủy', 'Khách chưa đến'], true)) {
                $pdo->rollBack();
                json_error('Không thể thu tiền tất toán cho đơn đã hủy hoặc khách chưa đến.', 400, 'ERR_INVALID_BOOKING_STATUS');
            }
            $totPrice = (int)($lockedBooking['total_price'] ?? 0);
            $paidAmt  = (int)($lockedBooking['paid_amount'] ?? 0);
            $remAmount = max(0, (int)($lockedBooking['remaining_amount'] ?? max(0, $totPrice - $paidAmt)));
            if (in_array($curStatus, ['completed', 'Hoàn thành'], true) && $remAmount <= 0 && $paidAmt >= $totPrice) {
                $pdo->rollBack();
                json_error('Đơn này đã hoàn tất và thanh toán đủ 100%.', 400, 'ERR_ALREADY_PAID');
            }

            $deltaPaid = max(0, $totPrice - $paidAmt);
            $existingCash = max(0, (int)($lockedBooking['cash_paid_amount'] ?? 0));
            $existingTransfer = max(0, (int)($lockedBooking['transfer_paid_amount'] ?? 0));
            $origPayMethod = (string)($lockedBooking['payment_method'] ?? '');
            if ($paidAmt > 0 && $existingCash === 0 && $existingTransfer === 0) {
                if (mb_stripos($origPayMethod, 'Tiền mặt') !== false) {
                    $existingCash = $paidAmt;
                } else {
                    $existingTransfer = $paidAmt;
                }
            }
            if (mb_stripos($payMethod, 'Tiền mặt') !== false) {
                $existingCash += $deltaPaid;
            } else {
                $existingTransfer += $deltaPaid;
            }

            $noteAdd = " [Đã tất toán 100% qua {$payMethod}]";
            $existingNote = (string)($lockedBooking['note'] ?? '');
            $appendNote = ($existingNote !== '' && mb_stripos($existingNote, trim($noteAdd)) !== false) ? '' : $noteAdd;
            $stmt = $pdo->prepare("UPDATE bookings SET status = 'completed', payment_status = 'Đã thanh toán 100%', paid_amount = total_price, cash_paid_amount = ?, transfer_paid_amount = ?, remaining_amount = 0, note = CONCAT(IFNULL(note,''), ?) WHERE code = ?");
            $stmt->execute([$existingCash, $existingTransfer, $appendNote, $code]);

            award_booking_loyalty_points($pdo, $lockedBooking);
            write_audit_log($pdo, 'COLLECT_PAYMENT', $code, (string)$remAmount, "Đã thu đủ 100% qua {$payMethod} (Số tiền: {$remAmount}đ)", $actor);
            $pdo->commit();

            if ($deltaPaid > 0 && function_exists('send_telegram_notification')) {
                $tgMsg = "💵 <b>TẤT TOÁN PHẦN CÒN LẠI</b>\n"
                       . "• Mã vé: <code>" . tg_escape($code) . "</code>\n"
                       . "• Khách: <b>" . tg_escape($lockedBooking['customer_name'] ?? '') . "</b>\n"
                       . "• Thu thêm: <b>+" . number_format($deltaPaid) . " đ</b> (" . tg_escape($payMethod) . ")\n"
                       . "• Tổng đã thu: <b>" . number_format($totPrice) . " đ</b> (100%)\n"
                       . "• Người thu: " . tg_escape($actor['full_name'] ?? $actor['username'] ?? 'Nhân viên');
                send_telegram_notification($tgMsg, 'payment', $pdo);
            }

            json_response(['success' => true, 'message' => "Đã hoàn tất thu tiền 100% cho đơn {$code}."]);
        } catch (Throwable $payEx) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log("[PAY_REMAINING ERROR] " . $payEx->getMessage());
            json_error('Lỗi hệ thống khi tất toán đơn đặt sân.', 500, 'ERR_PAY_REMAINING_FAILED');
        }
    }

    if ($subAction === 'complete' || $subAction === 'complete_order') {
        $pdo->beginTransaction();
        try {
            $lockStmt = $pdo->prepare("SELECT * FROM bookings WHERE code = ? LIMIT 1 FOR UPDATE");
            $lockStmt->execute([$code]);
            $lockedBooking = $lockStmt->fetch();
            if (!$lockedBooking) {
                $pdo->rollBack();
                json_error('Không tìm thấy đơn đặt sân.', 404, 'ERR_BOOKING_NOT_FOUND');
            }
            $curStatus = (string)($lockedBooking['status'] ?? '');
            if (in_array($curStatus, ['Đã hủy', 'Khách chưa đến'], true)) {
                $pdo->rollBack();
                json_error('Không thể hoàn tất đơn đặt sân đã hủy hoặc khách chưa đến.', 400, 'ERR_INVALID_BOOKING_STATUS');
            }
            if (in_array($curStatus, ['completed', 'Hoàn thành'], true)) {
                $pdo->rollBack();
                json_response(['success' => true, 'idempotent' => true, 'message' => "Đơn {$code} đã ở trạng thái hoàn tất."]);
            }
            $totPrice = (int)($lockedBooking['total_price'] ?? 0);
            $paidAmt  = (int)($lockedBooking['paid_amount'] ?? 0);
            if ($totPrice > $paidAmt) {
                $pdo->rollBack();
                $diff = $totPrice - $paidAmt;
                json_error("Không thể hoàn tất đơn đặt sân khi chưa thanh toán đủ (Còn thiếu: " . number_format($diff, 0, ',', '.') . "đ). Vui lòng thu đủ hoặc Điều chỉnh giảm trước khi hoàn tất.", 400, 'ERR_UNPAID_COMPLETION');
            }
            $stmt = $pdo->prepare("UPDATE bookings SET status = 'completed', remaining_amount = GREATEST(0, total_price - paid_amount) WHERE code = ?");
            $stmt->execute([$code]);
            award_booking_loyalty_points($pdo, $lockedBooking);
            write_audit_log($pdo, 'COMPLETE_BOOKING', $code, $curStatus, 'completed', $actor);
            $pdo->commit();
            json_response(['success' => true, 'message' => "Đã chuyển đơn {$code} sang trạng thái hoàn tất."]);
        } catch (Throwable $compEx) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log("[COMPLETE BOOKING ERROR] " . $compEx->getMessage());
            json_error('Lỗi hệ thống khi hoàn tất đơn đặt sân.', 500, 'ERR_COMPLETE_FAILED');
        }
    }

    json_response(['success' => false, 'message' => 'Hành động con không hợp lệ.'], 400);
}

function handle_admin_adjust_discount(PDO $pdo, array $data, string $method, array $actor): void {
    if ($method !== 'POST') {
        json_error('Phương thức không được hỗ trợ.', 405, 'ERR_METHOD_NOT_ALLOWED');
    }
    // Bắt buộc quyền Quản trị viên (Admin)
    $admin = require_admin($pdo);

    $code = trim(sanitize_string($data['code'] ?? $data['booking_code'] ?? '', 40));
    if ($code === '') {
        json_error('Thiếu mã đơn đặt sân (code).', 400, 'ERR_MISSING_BOOKING_CODE');
    }

    $reason = trim(sanitize_string($data['reason'] ?? '', 500));
    if ($reason === '') {
        json_error('Bắt buộc nhập lý do điều chỉnh giảm giá đơn đặt sân.', 400, 'ERR_MISSING_REASON');
    }

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("SELECT * FROM bookings WHERE code = ? LIMIT 1 FOR UPDATE");
        $stmt->execute([$code]);
        $booking = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$booking) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            json_error('Không tìm thấy đơn đặt sân tương ứng.', 404, 'ERR_BOOKING_NOT_FOUND');
        }

        $oldTotal = (int)($booking['total_price'] ?? 0);
        $paidAmt  = (int)($booking['paid_amount'] ?? 0);

        if (isset($data['new_total_price'])) {
            $newTotal = max(0, (int)$data['new_total_price']);
            $diffDiscount = max(0, $oldTotal - $newTotal);
        } elseif (isset($data['discount_amount']) || isset($data['discount']) || isset($data['amount'])) {
            $diffDiscount = max(0, (int)($data['discount_amount'] ?? $data['discount'] ?? $data['amount'] ?? 0));
            if ($diffDiscount <= 0) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                json_error('Số tiền điều chỉnh giảm phải lớn hơn 0.', 400, 'ERR_INVALID_DISCOUNT');
            }
            $newTotal = max(0, $oldTotal - $diffDiscount);
        } else {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            json_error('Thiếu số tiền giảm giá (discount_amount hoặc new_total_price).', 400, 'ERR_MISSING_AMOUNT');
        }

        $newRemaining = max(0, $newTotal - $paidAmt);
        $noteAdd = " [Điều chỉnh giảm " . number_format($diffDiscount, 0, ',', '.') . "đ. Lý do: {$reason}]";

        $updStmt = $pdo->prepare("UPDATE bookings SET total_price = ?, remaining_amount = ?, note = CONCAT(IFNULL(note,''), ?) WHERE code = ?");
        $updStmt->execute([$newTotal, $newRemaining, $noteAdd, $code]);

        $ip = get_client_ip();
        $adminId = (int)$admin['id'];
        $oldVal = "total_price: {$oldTotal}";
        $newVal = "total_price: {$newTotal} | discount: {$diffDiscount} | Lý do: {$reason}";

        write_audit_log($pdo, 'ADJUST_DISCOUNT', $code, $oldVal, $newVal, $admin);

        require_once __DIR__ . '/AdminLogService.php';
        AdminLogService::record(
            $pdo,
            $adminId,
            'ADJUST_DISCOUNT',
            'booking',
            $code,
            ['total_price' => $oldTotal, 'remaining_amount' => (int)($booking['remaining_amount'] ?? 0)],
            ['total_price' => $newTotal, 'remaining_amount' => $newRemaining, 'reason' => $reason],
            $ip
        );

        $pdo->commit();

        json_response([
            'success' => true,
            'message' => "Đã điều chỉnh giảm tổng tiền đơn {$code} từ " . number_format($oldTotal, 0, ',', '.') . "đ xuống " . number_format($newTotal, 0, ',', '.') . "đ.",
            'data'    => [
                'code'            => $code,
                'old_total_price' => $oldTotal,
                'new_total_price' => $newTotal,
                'discount_amount' => $diffDiscount,
                'paid_amount'     => $paidAmt,
                'remaining_amount'=> $newRemaining,
                'reason'          => $reason
            ]
        ]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("[ADJUST_DISCOUNT ERROR] " . $e->getMessage());
        json_error('Lỗi hệ thống khi điều chỉnh giảm giá đơn.', 500, 'ERR_ADJUST_DISCOUNT_FAILED');
    }
}
