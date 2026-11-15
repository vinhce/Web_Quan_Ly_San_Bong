<?php

require_once __DIR__ . '/../api/security_helper.php';

/**
 * Quét các đơn trạng thái 'Đang đá' quá giờ thi đấu (+15 phút) và chuyển sang 'Hoàn thành'.
 * Bọc transaction, idempotent 100%, ghi audit log và file log.
 *
 * @param PDO|null $pdo
 * @return array
 */
function run_complete_overdue_in_play(?PDO $pdo = null): array {
    if ($pdo === null) {
        $pdo = getDBConnection(false);
    }
    if (!$pdo) {
        return [
            'success'         => false,
            'completed_count' => 0,
            'codes'           => [],
            'error'           => 'no_db'
        ];
    }

    $logDir = dirname(__DIR__) . '/logs';
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0755, true);
    }

    $completedCodes = [];
    $completedCount = 0;

    $inTransactionBefore = $pdo->inTransaction();
    if (!$inTransactionBefore) {
        $pdo->beginTransaction();
    }

    try {
        $sql = "
            SELECT b.id, b.code, b.booking_date, b.slot_id, b.slot_time, b.status,
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
            $updStmt = $pdo->prepare("UPDATE bookings SET status = 'Hoàn thành' WHERE id = ? AND status = 'Đang đá'");
            $actor = [
                'id'        => null,
                'username'  => 'cron_in_play',
                'full_name' => 'Hệ thống Cron Tự Động',
                'role'      => 'system'
            ];

            foreach ($overdueBookings as $bk) {
                $updStmt->execute([(int)$bk['id']]);
                if ($updStmt->rowCount() > 0) {
                    $completedCodes[] = $bk['code'];
                    $completedCount++;
                    write_audit_log(
                        $pdo,
                        'cron_complete_overdue_in_play',
                        $bk['code'],
                        'Đang đá',
                        'Hoàn thành',
                        $actor
                    );
                }
            }
        }

        if (!$inTransactionBefore) {
            $pdo->commit();
        }

        $logMsg = sprintf(
            "[%s] IN_PLAY_CRON: processed %d overdue booking(s). Codes: %s\n",
            date('Y-m-d H:i:s'),
            $completedCount,
            !empty($completedCodes) ? implode(', ', $completedCodes) : 'none'
        );
        @file_put_contents($logDir . '/cron_in_play.log', $logMsg, FILE_APPEND);

        return [
            'success'         => true,
            'completed_count' => $completedCount,
            'codes'           => $completedCodes,
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
            'codes'           => [],
            'error'           => $e->getMessage(),
            'timestamp'       => date('c')
        ];
    }
}

// Entrypoint khi chạy độc lập
if (realpath(__FILE__) === realpath($_SERVER['SCRIPT_FILENAME'] ?? '')) {
    $isCli = (php_sapi_name() === 'cli' || PHP_SAPI === 'cli');

    if (!$isCli) {
        loadEnv();
        $cronSecret = trim($_ENV['CRON_SECRET'] ?? getenv('CRON_SECRET') ?: '');
        $provided   = trim((string)($_SERVER['HTTP_X_CRON_SECRET'] ?? $_GET['secret'] ?? ''));

        $authorized = ($cronSecret !== '' && $provided !== '' && hash_equals($cronSecret, $provided));

        if (!$authorized) {
            http_response_code(403);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'success'  => false,
                'message'  => 'Forbidden: Cron in-play endpoint only allows CLI or valid X-Cron-Secret header.',
                'ref_code' => 'ERR_FORBIDDEN'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
        header('Content-Type: application/json; charset=utf-8');
    }

    $logDir = dirname(__DIR__) . '/logs';
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0755, true);
    }

    $lockPath = $logDir . '/cron_in_play.lock';
    $lockFp = @fopen($lockPath, 'c+');
    if (!$lockFp || !@flock($lockFp, LOCK_EX | LOCK_NB)) {
        if ($lockFp) {
            @fclose($lockFp);
        }
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
        if ($lockFp) {
            @flock($lockFp, LOCK_UN);
            @fclose($lockFp);
        }
    }
}
