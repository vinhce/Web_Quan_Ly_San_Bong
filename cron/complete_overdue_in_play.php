<?php

require_once __DIR__ . '/../api/security_helper.php';
require_once __DIR__ . '/../api/services/cron_ops_service.php';

/**
 * Quét các đơn trạng thái 'Đang đá' quá giờ thi đấu (+15 phút):
 * - Nếu đã thu đủ tiền (paid_amount >= total_price và remaining_amount = 0): chuyển sang 'completed'.
 * - Nếu còn thiếu tiền (paid_amount < total_price hoặc remaining_amount > 0): chuyển sang 'Đã đá - chưa tất toán' + cảnh báo admin (T5-03).
 * Bọc transaction, idempotent 100%, ghi audit log và file log.
 */
function run_complete_overdue_in_play(?PDO $pdo = null): array {
    if ($pdo === null) {
        $pdo = getDBConnection(false);
    }
    if (!$pdo) {
        return [
            'success'         => false,
            'completed_count' => 0,
            'unpaid_count'    => 0,
            'codes'           => [],
            'unpaid_codes'    => [],
            'error'           => 'no_db'
        ];
    }

    $logDir = dirname(__DIR__) . '/logs';
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0755, true);
    }

    $completedCodes = [];
    $completedCount = 0;
    $unpaidCodes = [];
    $unpaidCount = 0;

    $inTransactionBefore = $pdo->inTransaction();
    if (!$inTransactionBefore) {
        $pdo->beginTransaction();
    }

    try {
        $sql = "
            SELECT b.id, b.code, b.booking_date, b.slot_id, b.slot_time, b.status,
                   b.total_price, b.paid_amount, b.remaining_amount,
                   COALESCE(ts.end_time, TRIM(SUBSTRING_INDEX(b.slot_time, '-', -1))) AS slot_end_time
            FROM bookings b
            LEFT JOIN time_slots ts ON b.slot_id = ts.id
            WHERE b.status = 'Đang đá'
              AND (
                  b.booking_date < CURDATE()
                  OR (
                      b.booking_date = CURDATE()
                      AND TIME(COALESCE(ts.end_time, TRIM(SUBSTRING_INDEX(b.slot_time, '-', -1)))) < (CURTIME() - INTERVAL 15 MINUTE)
                  )
              )
            FOR UPDATE
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $overdueBookings = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (!empty($overdueBookings)) {
            $updPaidStmt = $pdo->prepare("UPDATE bookings SET status = 'completed', remaining_amount = 0 WHERE id = ? AND status = 'Đang đá'");
            $updUnpaidStmt = $pdo->prepare("UPDATE bookings SET status = 'Đã đá - chưa tất toán', remaining_amount = GREATEST(0, total_price - paid_amount), note = CONCAT(COALESCE(note, ''), ' | [CẢNH BÁO: Quá giờ đá nhưng chưa tất toán đủ]') WHERE id = ? AND status = 'Đang đá'");
            $actor = [
                'id'        => null,
                'username'  => 'cron_in_play',
                'full_name' => 'Hệ thống Cron Tự Động',
                'role'      => 'system'
            ];

            foreach ($overdueBookings as $bk) {
                $totAmt  = max(0, (int)($bk['total_price'] ?? 0));
                $paidAmt = max(0, (int)($bk['paid_amount'] ?? 0));
                $remCol  = max(0, (int)($bk['remaining_amount'] ?? 0));

                if ($paidAmt >= $totAmt && $remCol <= 0) {
                    $updPaidStmt->execute([(int)$bk['id']]);
                    if ($updPaidStmt->rowCount() > 0) {
                        $completedCodes[] = $bk['code'];
                        $completedCount++;
                        write_audit_log(
                            $pdo,
                            'cron_complete_overdue_in_play',
                            $bk['code'],
                            'Đang đá',
                            'completed',
                            $actor
                        );
                    }
                } else {
                    $updUnpaidStmt->execute([(int)$bk['id']]);
                    if ($updUnpaidStmt->rowCount() > 0) {
                        $unpaidCodes[] = $bk['code'];
                        $unpaidCount++;
                        write_audit_log(
                            $pdo,
                            'CRON_IN_PLAY_UNPAID',
                            $bk['code'],
                            'Đang đá',
                            'Đã đá - chưa tất toán',
                            $actor
                        );
                        $shortfall = max($remCol, max(0, $totAmt - $paidAmt));
                        send_telegram_notification(
                            "⚠️ <b>ĐÃ HẾT GIỜ ĐÁ NHƯNG CHƯA TẤT TOÁN</b>\n• Mã đơn: <code>" . tg_escape($bk['code']) . "</code>\n• Còn thiếu: <b>" . number_format($shortfall) . " đ</b>",
                            'new_booking',
                            $pdo
                        );
                    }
                }
            }
        }

        if (!$inTransactionBefore) {
            $pdo->commit();
        }

        $logMsg = sprintf(
            "[%s] IN_PLAY_CRON: completed=%d (%s), unpaid_flagged=%d (%s)\n",
            date('Y-m-d H:i:s'),
            $completedCount,
            !empty($completedCodes) ? implode(', ', $completedCodes) : 'none',
            $unpaidCount,
            !empty($unpaidCodes) ? implode(', ', $unpaidCodes) : 'none'
        );
        @file_put_contents($logDir . '/cron_in_play.log', $logMsg, FILE_APPEND);

        return [
            'success'         => true,
            'completed_count' => $completedCount,
            'unpaid_count'    => $unpaidCount,
            'codes'           => $completedCodes,
            'unpaid_codes'    => $unpaidCodes,
            'timestamp'       => date('c')
        ];
    } catch (Throwable $e) {
        if (!$inTransactionBefore && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("[CRON COMPLETE OVERDUE IN PLAY ERROR] " . $e->getMessage());
        $errLogMsg = sprintf(
            "[%s] IN_PLAY_CRON ERROR: %s\n",
            date('Y-m-d H:i:s'),
            $e->getMessage()
        );
        @file_put_contents($logDir . '/cron_in_play.log', $errLogMsg, FILE_APPEND);
        return [
            'success'         => false,
            'completed_count' => 0,
            'unpaid_count'    => 0,
            'codes'           => [],
            'unpaid_codes'    => [],
            'error'           => 'cron_in_play_failed',
            'timestamp'       => date('c')
        ];
    }
}

// Entrypoint khi chạy độc lập
if (realpath(__FILE__) === realpath($_SERVER['SCRIPT_FILENAME'] ?? '')) {
    cron_authorize_request();

    $lockFp = cron_acquire_lock('cron_in_play');
    if (!$lockFp) {
        echo json_encode([
            'success'   => true,
            'skipped'   => 'locked',
            'timestamp' => date('c'),
            'message'   => 'Tiến trình cron_in_play khác đang chạy.'
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . PHP_EOL;
        exit(0);
    }

    try {
        $result = run_complete_overdue_in_play();
        echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . PHP_EOL;
    } finally {
        cron_release_lock($lockFp);
    }
}
