<?php
// Trợ thủ đánh giá chính sách hủy & cron tự động nhả sân quá hạn cọc

function evaluate_cancellation_policy(array $bookingRow, array $settings = []): array {
    $bookingDate = trim((string)($bookingRow['booking_date'] ?? date('Y-m-d')));
    $slotTime = trim((string)($bookingRow['slot_time'] ?? ''));
    $startTime = '00:00';
    if (preg_match('/(\d{1,2}:\d{2})/', $slotTime, $m)) {
        $parts = explode(':', $m[1]);
        $startTime = sprintf('%02d:%02d', (int)$parts[0], (int)$parts[1]);
    }
    $matchStartStr = $bookingDate . ' ' . $startTime . ':00';
    $matchTs = strtotime($matchStartStr);
    if ($matchTs === false) {
        $matchTs = time();
    }
    $hoursBeforeMatch = round(($matchTs - time()) / 3600.0, 2);

    $refundFullHours = max(1, (int)($settings['refund_full_hours'] ?? 24));
    $refundPartialHours = max(0, min($refundFullHours, (int)($settings['refund_partial_hours'] ?? 4)));

    $paidAmountCol = max(0, (int)($bookingRow['paid_amount'] ?? 0));
    $payStatusCur  = (string)($bookingRow['payment_status'] ?? '');
    $totalPrice    = max(0, (int)($bookingRow['total_price'] ?? 0));
    $depositAmt    = max(0, (int)($bookingRow['deposit_amount'] ?? 0));
    $inferredPaid  = 0;
    if (in_array($payStatusCur, ['Đã thanh toán đủ', 'Đã thanh toán 100%'], true)) {
        $inferredPaid = $totalPrice;
    } elseif ($payStatusCur === 'Đã cọc 30%') {
        $inferredPaid = $depositAmt;
    }
    $paidBase = max($paidAmountCol, $inferredPaid);

    if ($paidBase <= 0) {
        $policy = 'unpaid_free_cancel';
        $payStatus = 'Đã hủy';
        $refundAmount = 0;
    } elseif ($hoursBeforeMatch >= $refundFullHours) {
        $policy = 'refund_100';
        $payStatus = 'Đã hoàn cọc 100%';
        $refundAmount = $paidBase;
    } elseif ($hoursBeforeMatch >= $refundPartialHours) {
        $policy = 'forfeit_50';
        $payStatus = 'Phạt 50% cọc';
        $refundAmount = (int)round($paidBase * 0.5);
    } else {
        $policy = 'forfeit_100';
        $payStatus = 'Tịch thu cọc 30%';
        $refundAmount = 0;
    }

    return [
        'policy'               => $policy,
        'payment_status'       => $payStatus,
        'refund_amount'        => $refundAmount,
        'paid_base'            => $paidBase,
        'hours_before_match'   => $hoursBeforeMatch,
        'refund_full_hours'    => $refundFullHours,
        'refund_partial_hours' => $refundPartialHours,
        'match_start'          => $matchStartStr,
    ];
}

function run_auto_release_expired_bookings(?PDO $pdo, bool $force = false): array {
    try {
        if (!$pdo) {
            return ['released_count' => 0, 'codes' => [], 'hold_minutes' => 15, 'skipped' => 'no_db'];
        }
        if ($pdo->inTransaction()) {
            return ['released_count' => 0, 'codes' => [], 'hold_minutes' => 15, 'skipped' => 'in_transaction'];
        }

        $settings = get_system_settings_map($pdo);
        $autoCancelEnabled = (string)($settings['auto_cancel_enabled'] ?? '1');
        $holdMinutes = max(5, min(120, (int)($settings['hold_minutes'] ?? 15)));

        if (!$force && $autoCancelEnabled === '0') {
            $wlExp = expire_stale_waitlist_holds($pdo);
            return [
                'released_count'   => 0,
                'codes'            => [],
                'hold_minutes'     => $holdMinutes,
                'waitlist_expired' => $wlExp['expired_count'] ?? 0,
                'skipped'          => 'disabled'
            ];
        }

        $releasedRows = [];
        $codes = [];

        try {
            $pdo->beginTransaction();

            $selStmt = $pdo->prepare("
                SELECT *
                FROM bookings
                WHERE payment_status = 'Chờ cọc 30%'
                  AND status NOT IN ('Đã hủy', 'Hoàn thành', 'Đang đá', 'Khách chưa đến', 'Chờ duyệt cọc', 'Đã xác nhận')
                  AND (paid_amount = 0 OR paid_amount IS NULL)
                  AND (payment_method IS NULL OR (payment_method NOT LIKE '%Khách quen%' AND payment_method NOT LIKE '%Chưa cọc%'))
                  AND code NOT IN (SELECT matched_booking_code FROM bank_transactions WHERE matched_booking_code IS NOT NULL AND match_status IN ('matched', 'underpaid', 'overpaid', 'resolved'))
                  AND code NOT IN (SELECT detected_booking_code FROM bank_transactions WHERE detected_booking_code IS NOT NULL)
                  AND (
                      (expires_at IS NOT NULL AND expires_at <= NOW())
                      OR (expires_at IS NULL AND created_at <= DATE_SUB(NOW(), INTERVAL ? MINUTE))
                  )
                FOR UPDATE
            ");
            $selStmt->execute([$holdMinutes]);
            $expiredRows = $selStmt->fetchAll(PDO::FETCH_ASSOC);

            if (!empty($expiredRows)) {
                $noteSuffix = " [Tự động hủy do quá hạn {$holdMinutes}p chưa đặt cọc]";
                $hasCancelCol = db_table_has_column($pdo, 'bookings', 'cancel_policy_applied');
                $hasGiftDeducted = db_table_has_column($pdo, 'bookings', 'gift_deducted');
                $hasVoucherUsed = db_table_has_column($pdo, 'vouchers', 'used_count');
                $hasUserPoints = db_table_has_column($pdo, 'users', 'points');

                $updBookingSql = "
                    UPDATE bookings
                    SET status = 'Đã hủy',
                        payment_status = 'Đã hủy',
                        remaining_amount = 0,
                        refund_amount = 0,
                        " . ($hasCancelCol ? "cancel_policy_applied = 'auto_expired'," : "") . "
                        " . ($hasGiftDeducted ? "gift_deducted = 0," : "") . "
                        note = CONCAT(IFNULL(note, ''), ?)
                    WHERE id = ?
                ";
                $updBooking = $pdo->prepare($updBookingSql);
                $restoreInv = $pdo->prepare("UPDATE extra_services SET stock_qty = stock_qty + ? WHERE id = ? AND track_inventory = 1");

                foreach ($expiredRows as $row) {
                    $updBooking->execute([$noteSuffix, (int)$row['id']]);
                    $codes[] = $row['code'];
                    $releasedRows[] = $row;

                    if (!empty($row['voucher_code']) && $hasVoucherUsed) {
                        try {
                            $pdo->prepare("UPDATE vouchers SET used_count = GREATEST(0, used_count - 1) WHERE code = ?")->execute([$row['voucher_code']]);
                        } catch (Throwable $ve) {
                            error_log("[AUTO RELEASE VOUCHER RESTORE WARN] " . $ve->getMessage());
                        }
                    }

                    $ptsUsed = isset($row['points_used']) ? (int)$row['points_used'] : 0;
                    $uid = isset($row['user_id']) ? (int)$row['user_id'] : 0;
                    if ($ptsUsed > 0 && $uid > 0 && $hasUserPoints) {
                        try {
                            $pdo->prepare("UPDATE users SET points = IFNULL(points, 0) + ? WHERE id = ?")->execute([$ptsUsed, $uid]);
                        } catch (Throwable $pe) {
                            error_log("[AUTO RELEASE POINTS RESTORE WARN] " . $pe->getMessage());
                        }
                    }

                    if (!empty($row['services_json'])) {
                        $services = json_decode((string)$row['services_json'], true);
                        if (is_array($services)) {
                            foreach ($services as $srv) {
                                $srvId = sanitize_string($srv['id'] ?? '', 30);
                                $qty = max(0, (int)($srv['quantity'] ?? 0));
                                if ($srvId !== '' && $qty > 0) {
                                    $restoreInv->execute([$qty, $srvId]);
                                }
                            }
                        }
                    }

                    if (!empty($row['gift_deducted']) && (int)$row['gift_deducted'] === 1) {
                        $weeks = (int)($row['weeks_count'] ?? 1);
                        if ($weeks >= 12) {
                            $restoreInv->execute([2, 'SRV-WATER']);
                        } elseif ($weeks >= 8) {
                            $restoreInv->execute([1, 'SRV-WATER']);
                            $restoreInv->execute([1, 'SRV-BIB']);
                        }
                    }
                }
            }

            $pdo->commit();
        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log("[AUTO RELEASE EXPIRED ERROR] " . $e->getMessage());
            return [
                'released_count' => 0,
                'codes'          => [],
                'hold_minutes'   => $holdMinutes,
                'error'          => 'auto_release_failed'
            ];
        }

        if (!empty($releasedRows)) {
            $systemActor = ['id' => null, 'full_name' => 'Hệ thống (Cron)', 'role' => 'system'];
            foreach ($releasedRows as $row) {
                write_audit_log(
                    $pdo,
                    'AUTO_CANCEL_EXPIRED',
                    $row['code'],
                    ($row['status'] ?? '') . ' (' . ($row['payment_status'] ?? '') . ')',
                    "Đã hủy (Tự động nhả sân sau {$holdMinutes} phút chưa cọc)",
                    $systemActor
                );

                trigger_waitlist_notification(
                    $pdo,
                    (string)$row['pitch_id'],
                    (string)$row['booking_date'],
                    (string)$row['slot_id'],
                    (string)($row['slot_time'] ?? ''),
                    $systemActor,
                    (string)$row['code']
                );
            }
        }

        $wlExp = expire_stale_waitlist_holds($pdo);

        return [
            'released_count'   => count($codes),
            'codes'            => $codes,
            'hold_minutes'     => $holdMinutes,
            'waitlist_expired' => $wlExp['expired_count'] ?? 0,
            'waitlist_promoted'=> $wlExp['promoted_count'] ?? 0
        ];
    } catch (Throwable $outerEx) {
        error_log("[AUTO RELEASE EXPIRED FATAL PREVENTED] " . $outerEx->getMessage());
        return ['released_count' => 0, 'codes' => [], 'hold_minutes' => 15, 'error' => 'outer_exception'];
    }
}

function maybe_run_auto_release_throttled(?PDO $pdo, int $intervalSeconds = 30): void {
    try {
        if (!$pdo || $pdo->inTransaction()) {
            return;
        }
        $throttleFile = __DIR__ . '/../../logs/.last_auto_release';
        $now = time();
        if (is_file($throttleFile)) {
            $lastRun = (int)@file_get_contents($throttleFile);
            if ($lastRun > 0 && ($now - $lastRun) < $intervalSeconds) {
                return;
            }
        }
        $logDir = dirname($throttleFile);
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0750, true);
        }
        @file_put_contents($throttleFile, (string)$now, LOCK_EX);
        run_auto_release_expired_bookings($pdo, false);
    } catch (Throwable $te) {
        error_log("[MAYBE RUN AUTO RELEASE THROTTLED FATAL PREVENTED] " . $te->getMessage());
    }
}
