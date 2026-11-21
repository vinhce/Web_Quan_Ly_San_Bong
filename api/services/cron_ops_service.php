<?php
declare(strict_types=1);

require_once __DIR__ . '/../security_helper.php';
require_once __DIR__ . '/../notification_helper.php';
require_once __DIR__ . '/cancellation_helper.php';

/**
 * Shared Cron Auth, Lockfile, and Overdue/No-Show Operations Service (T5-01, T5-03, T5-04)
 */

function cron_authorize_request(): void {
    $isCli = (php_sapi_name() === 'cli' || PHP_SAPI === 'cli');
    if ($isCli) {
        return;
    }

    loadEnv();
    $cronSecret = trim((string)(getenv('CRON_SECRET') ?: ($_ENV['CRON_SECRET'] ?? '') ?: getenv('CRON_SECRET_KEY') ?: ($_ENV['CRON_SECRET_KEY'] ?? '')));
    $provided   = trim((string)($_SERVER['HTTP_X_CRON_SECRET'] ?? ''));

    $authorized = ($cronSecret !== '' && $provided !== '' && hash_equals($cronSecret, $provided));
    if (!$authorized) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0');
        echo json_encode([
            'success'  => false,
            'message'  => 'Forbidden: Cron endpoint only allows CLI or valid X-Cron-Secret header.',
            'ref_code' => 'ERR_FORBIDDEN'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0');
}

function cron_acquire_lock(string $lockName) {
    $logDir = dirname(__DIR__, 2) . '/logs';
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0750, true);
    }
    $safeName = preg_replace('/[^a-zA-Z0-9._-]/', '_', $lockName);
    $lockPath = $logDir . '/.' . $safeName . '.lock';
    $fp = @fopen($lockPath, 'c+');
    if (!$fp || !@flock($fp, LOCK_EX | LOCK_NB)) {
        if ($fp) {
            @fclose($fp);
        }
        return null;
    }
    return $fp;
}

function cron_release_lock($fp): void {
    if (is_resource($fp)) {
        @flock($fp, LOCK_UN);
        @fclose($fp);
    }
}

function cron_booking_has_paid_money(array $row): bool {
    $paidAmt = max(0, (int)($row['paid_amount'] ?? 0));
    if ($paidAmt > 0) {
        return true;
    }
    $payStatus = (string)($row['payment_status'] ?? '');
    if (in_array($payStatus, ['Đã cọc 30%', 'Đã cọc 60%', 'Đã cọc', 'Đã thanh toán đủ', 'Đã thanh toán 100%', 'deposited', 'completed', 'paid', 'Còn thiếu phần phát sinh'], true)) {
        return true;
    }
    return mb_stripos($payStatus, 'Đã cọc') !== false;
}

function cron_run_auto_ops(PDO $pdo, array $actor): array {
    $today = date('Y-m-d');
    $nowTs = time();
    $graceMinutes = 15;

    $noShowReleased = [];
    $unpaidExpiredReleased = [];
    $pastClosedPlaying = [];
    $pastUnpaidFlagged = [];
    $pastClosedNoShow = [];
    $waitlistTargets = [];

    // 1. Quy chế 15 phút cho ca hôm nay chưa check-in (tránh nhầm đơn đã tất toán paid_amount >= total_price? vẫn chỉ quét status Đã xác nhận / Giữ chỗ / Chờ duyệt cọc chưa check-in)
    $stmtToday = $pdo->prepare("
        SELECT id, code, user_id, pitch_id, booking_date, slot_id, slot_time,
               deposit_amount, total_price, paid_amount, remaining_amount,
               status, payment_status, voucher_code, services_json, points_used, points_awarded, gift_deducted, weeks_count
        FROM bookings
        WHERE booking_date = ?
          AND status IN ('Giữ chỗ', 'Đã xác nhận', 'Chờ duyệt cọc')
    ");
    $stmtToday->execute([$today]);

    $updPaidNoShow = $pdo->prepare("
        UPDATE bookings
        SET status = 'Khách chưa đến',
            payment_status = 'Tịch thu cọc 30%',
            remaining_amount = 0,
            cancel_policy_applied = 'noshow_forfeit',
            refund_amount = 0,
            note = CONCAT(COALESCE(note, ''), ' | [Cron 15p: Khách chưa đến - Tịch thu cọc & nhả sân]')
        WHERE id = ? AND status IN ('Giữ chỗ', 'Đã xác nhận', 'Chờ duyệt cọc')
    ");

    $updUnpaidNoShow = $pdo->prepare("
        UPDATE bookings
        SET status = 'Đã hủy',
            payment_status = 'Đã hủy',
            remaining_amount = 0,
            cancel_policy_applied = 'unpaid_noshow_cancel',
            refund_amount = 0,
            note = CONCAT(COALESCE(note, ''), ' | [Cron 15p: Quá giờ chưa check-in (chưa cọc) - Tự động hủy & nhả sân]')
        WHERE id = ? AND status IN ('Giữ chỗ', 'Đã xác nhận', 'Chờ duyệt cọc')
    ");

    foreach ($stmtToday->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $slotTime = (string)($row['slot_time'] ?? '');
        if (!preg_match('/(\d{1,2}):(\d{2})/', $slotTime, $m)) {
            continue;
        }
        $startStr = sprintf('%s %02d:%02d:00', $today, (int)$m[1], (int)$m[2]);
        $startTs = strtotime($startStr);
        if ($startTs === false || $nowTs < ($startTs + $graceMinutes * 60)) {
            continue;
        }

        $hasPaid = cron_booking_has_paid_money($row);
        if ($hasPaid) {
            $updPaidNoShow->execute([(int)$row['id']]);
            if ($updPaidNoShow->rowCount() > 0) {
                restore_booking_resources_on_cancel($pdo, $row, true);
                $noShowReleased[] = $row['code'];
                $waitlistTargets[] = $row;
                if (function_exists('write_audit_log')) {
                    write_audit_log(
                        $pdo,
                        'AUTO_NOSHOW_15M',
                        $row['code'],
                        "{$row['status']} ({$row['payment_status']})",
                        'Khách chưa đến (Tịch thu cọc 30%, nhả sân)',
                        $actor
                    );
                }
            }
        } else {
            $updUnpaidNoShow->execute([(int)$row['id']]);
            if ($updUnpaidNoShow->rowCount() > 0) {
                restore_booking_resources_on_cancel($pdo, $row, false);
                $unpaidExpiredReleased[] = $row['code'];
                $waitlistTargets[] = $row;
                if (function_exists('write_audit_log')) {
                    write_audit_log(
                        $pdo,
                        'AUTO_NOSHOW_15M_UNPAID',
                        $row['code'],
                        "{$row['status']} ({$row['payment_status']})",
                        'Đã hủy (Chưa cọc quá giờ nhận sân - doanh thu 0đ)',
                        $actor
                    );
                }
            }
        }
    }

    // 2. Tự động đóng ca tồn đọng của các ngày trước (T5-01 & T5-03 & T5-04)
    $stmtPast = $pdo->prepare("
        SELECT id, code, user_id, pitch_id, booking_date, slot_id, slot_time,
               status, payment_status, total_price, deposit_amount, paid_amount, remaining_amount,
               voucher_code, services_json, points_used, points_awarded, gift_deducted, weeks_count
        FROM bookings
        WHERE booking_date < ?
          AND status IN ('Đang đá', 'Giữ chỗ', 'Đã xác nhận', 'Chờ duyệt cọc')
    ");
    $stmtPast->execute([$today]);

    $updPastDone = $pdo->prepare("
        UPDATE bookings
        SET status = 'completed',
            remaining_amount = 0,
            note = CONCAT(COALESCE(note, ''), ' | [Cron: Tự đóng ca ngày trước (đã tất toán đủ)]')
        WHERE id = ? AND status = 'Đang đá' AND COALESCE(paid_amount, 0) >= COALESCE(total_price, 0) AND COALESCE(remaining_amount, 0) <= 0
    ");

    $updPastUnpaidPlaying = $pdo->prepare("
        UPDATE bookings
        SET status = 'Đã đá - chưa tất toán',
            remaining_amount = GREATEST(0, COALESCE(total_price, 0) - COALESCE(paid_amount, 0)),
            note = CONCAT(COALESCE(note, ''), ' | [CẢNH BÁO CRON: Đã đá quá ngày nhưng chưa thu đủ tiền!]')
        WHERE id = ? AND status = 'Đang đá'
    ");

    $updPastPaidNoShow = $pdo->prepare("
        UPDATE bookings
        SET status = 'Khách chưa đến',
            payment_status = 'Tịch thu cọc 30%',
            remaining_amount = 0,
            cancel_policy_applied = 'noshow_forfeit',
            refund_amount = 0,
            note = CONCAT(COALESCE(note, ''), ' | [Cron: Tự đóng ca chưa check-in ngày trước (có cọc)]')
        WHERE id = ? AND status IN ('Giữ chỗ', 'Đã xác nhận', 'Chờ duyệt cọc')
    ");

    $updPastUnpaidCancel = $pdo->prepare("
        UPDATE bookings
        SET status = 'Đã hủy',
            payment_status = 'Đã hủy',
            remaining_amount = 0,
            cancel_policy_applied = 'unpaid_noshow_cancel',
            refund_amount = 0,
            note = CONCAT(COALESCE(note, ''), ' | [Cron: Tự hủy ca chưa check-in & chưa cọc ngày trước]')
        WHERE id = ? AND status IN ('Giữ chỗ', 'Đã xác nhận', 'Chờ duyệt cọc')
    ");

    foreach ($stmtPast->fetchAll(PDO::FETCH_ASSOC) as $pRow) {
        if ($pRow['status'] === 'Đang đá') {
            $totAmt = max(0, (int)($pRow['total_price'] ?? 0));
            $paidAmt = max(0, (int)($pRow['paid_amount'] ?? 0));
            $remCol = max(0, (int)($pRow['remaining_amount'] ?? 0));

            if ($paidAmt >= $totAmt && $remCol <= 0) {
                $updPastDone->execute([(int)$pRow['id']]);
                if ($updPastDone->rowCount() > 0) {
                    award_booking_loyalty_points($pdo, $pRow);
                    $pastClosedPlaying[] = $pRow['code'];
                }
            } else {
                $updPastUnpaidPlaying->execute([(int)$pRow['id']]);
                if ($updPastUnpaidPlaying->rowCount() > 0) {
                    $pastUnpaidFlagged[] = $pRow['code'];
                    $shortfall = max($remCol, max(0, $totAmt - $paidAmt));
                    $tgMsg = "⚠️ <b>CA QUÁ NGÀY CHƯA TẤT TOÁN</b>\n"
                           . "• Mã đơn: <code>" . tg_escape($pRow['code']) . "</code>\n"
                           . "• Ngày đá: <b>" . tg_escape($pRow['booking_date']) . "</b> ({$pRow['slot_time']})\n"
                           . "• Còn thiếu: <b>" . number_format($shortfall) . " đ</b>\n"
                           . "• Trạng thái: <i>Đã đá - chưa tất toán</i>";
                    send_telegram_notification($tgMsg, 'new_booking', $pdo);
                }
            }
        } else {
            if (cron_booking_has_paid_money($pRow)) {
                $updPastPaidNoShow->execute([(int)$pRow['id']]);
                if ($updPastPaidNoShow->rowCount() > 0) {
                    restore_booking_resources_on_cancel($pdo, $pRow, true);
                    $pastClosedNoShow[] = $pRow['code'];
                }
            } else {
                $updPastUnpaidCancel->execute([(int)$pRow['id']]);
                if ($updPastUnpaidCancel->rowCount() > 0) {
                    restore_booking_resources_on_cancel($pdo, $pRow, false);
                    $unpaidExpiredReleased[] = $pRow['code'];
                }
            }
        }
    }

    foreach ($waitlistTargets as $wtRow) {
        try {
            trigger_waitlist_notification(
                $pdo,
                (string)$wtRow['pitch_id'],
                (string)$wtRow['booking_date'],
                (string)$wtRow['slot_id'],
                (string)($wtRow['slot_time'] ?? ''),
                $actor,
                (string)$wtRow['code']
            );
        } catch (Throwable $we) {
            error_log('[CRON WAITLIST NOTIFY WARN] ' . $we->getMessage());
        }
    }

    if ((!empty($pastClosedPlaying) || !empty($pastUnpaidFlagged) || !empty($pastClosedNoShow) || !empty($unpaidExpiredReleased)) && function_exists('write_audit_log')) {
        write_audit_log(
            $pdo,
            'AUTO_CLOSE_PAST_BOOKINGS',
            null,
            null,
            'Cron đóng ca: ' . count($pastClosedPlaying) . ' Đang đá -> Hoàn thành; '
            . count($pastUnpaidFlagged) . ' Đang đá -> Đã đá - chưa tất toán; '
            . count($pastClosedNoShow) . ' Có cọc chưa nhận sân -> Khách chưa đến; '
            . count($unpaidExpiredReleased) . ' Chưa cọc -> Đã hủy.',
            $actor
        );
    }

    return [
        'success'               => true,
        'executedAt'            => date('Y-m-d H:i:s'),
        'graceMinutes'          => $graceMinutes,
        'noShowReleasedCount'   => count($noShowReleased),
        'noShowReleased'        => $noShowReleased,
        'unpaidCancelledCount'  => count($unpaidExpiredReleased),
        'unpaidCancelled'       => $unpaidExpiredReleased,
        'pastClosedPlaying'     => $pastClosedPlaying,
        'pastUnpaidFlagged'     => $pastUnpaidFlagged,
        'pastClosedNoShow'      => $pastClosedNoShow,
    ];
}
