<?php
declare(strict_types=1);

/**
 * Automated Operations Cron Job (15-Minute Grace Rule & Prior-Day Auto-Close)
 * Usage (CLI):  php api/cron_auto_ops.php
 * Usage (HTTP): GET /api/cron_auto_ops.php?key=<CRON_SECRET>  (or authenticated admin session)
 */

require_once __DIR__ . '/security_helper.php';

$isCli = (PHP_SAPI === 'cli');
$actor = ['id' => 0, 'username' => 'system_cron', 'full_name' => 'Hệ thống Cron Tự động', 'role' => 'admin'];

if (!$isCli) {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0');
    secure_session_start();
    $cronSecret = (string)(getenv('CRON_SECRET') ?: ($_ENV['CRON_SECRET'] ?? ''));
    $reqKey = (string)($_GET['key'] ?? $_SERVER['HTTP_X_CRON_KEY'] ?? '');
    $authedByKey = ($cronSecret !== '' && $reqKey !== '' && hash_equals($cronSecret, $reqKey));
    if (!$authedByKey) {
        $pdoAuth = getDBConnection(false);
        if (!$pdoAuth) {
            json_error('DB unavailable', 503, 'ERR_DB_UNAVAILABLE');
        }
        $actor = require_manager_or_admin($pdoAuth);
    }
}

$pdo = getDBConnection(false);
if (!$pdo) {
    $msg = ['success' => false, 'message' => 'Database connection failed'];
    echo json_encode($msg, JSON_UNESCAPED_UNICODE) . ($isCli ? "\n" : '');
    exit($isCli ? 1 : 0);
}

$today = date('Y-m-d');
$nowTs = time();
$graceMinutes = 15;

$noShowReleased = [];
$pastClosedPlaying = [];
$pastClosedNoShow = [];

try {
    // 1. Quy chế 15 phút cho các ca hôm nay đã xác nhận nhưng quá giờ bắt đầu > 15 phút mà chưa check-in
    $stmtToday = $pdo->prepare("
        SELECT id, code, pitch_id, booking_date, slot_time, deposit_amount, total_price, status, payment_status
        FROM bookings
        WHERE booking_date = ?
          AND status IN ('Đã xác nhận', 'Chờ duyệt cọc')
    ");
    $stmtToday->execute([$today]);

    $updNoShow = $pdo->prepare("
        UPDATE bookings
        SET status = 'Khách chưa đến',
            payment_status = CASE WHEN deposit_amount > 0 THEN 'Tịch thu cọc 30%' ELSE 'Đã hủy' END,
            remaining_amount = 0,
            note = CONCAT(COALESCE(note, ''), ' | [Cron 15p: Tự động nhả sân & giữ cọc]')
        WHERE id = ? AND status IN ('Đã xác nhận', 'Chờ duyệt cọc')
    ");

    foreach ($stmtToday->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $slotTime = (string)($row['slot_time'] ?? '');
        if (!preg_match('/(\d{1,2}):(\d{2})/', $slotTime, $m)) {
            continue;
        }
        $startStr = sprintf('%s %02d:%02d:00', $today, (int)$m[1], (int)$m[2]);
        $startTs = strtotime($startStr);
        if ($startTs !== false && $nowTs >= ($startTs + $graceMinutes * 60)) {
            $updNoShow->execute([(int)$row['id']]);
            if ($updNoShow->rowCount() > 0) {
                $noShowReleased[] = $row['code'];
                if (function_exists('write_audit_log')) {
                    write_audit_log(
                        $pdo,
                        'AUTO_NOSHOW_15M',
                        "Đơn #{$row['code']} ({$row['status']})",
                        "Khách chưa đến (Tịch thu cọc 30%, nhả sân)",
                        "Cron tự động áp dụng quy chế 15 phút cho đơn #{$row['code']} ({$row['slot_time']})",
                        $actor
                    );
                }
            }
        }
    }

    // 2. Tự động đóng ca tồn đọng của các ngày trước
    $stmtPast = $pdo->prepare("
        SELECT id, code, booking_date, slot_time, status, total_price, deposit_amount, paid_amount
        FROM bookings
        WHERE booking_date < ?
          AND status IN ('Đang đá', 'Đã xác nhận', 'Chờ duyệt cọc')
    ");
    $stmtPast->execute([$today]);

    $updPastDone = $pdo->prepare("
        UPDATE bookings
        SET status = 'Hoàn thành',
            note = CONCAT(COALESCE(note, ''), ' | [Cron: Tự đóng ca ngày trước]')
        WHERE id = ? AND status = 'Đang đá'
    ");
    $updPastNoShow = $pdo->prepare("
        UPDATE bookings
        SET status = 'Khách chưa đến',
            payment_status = CASE WHEN deposit_amount > 0 THEN 'Tịch thu cọc 30%' ELSE 'Đã hủy' END,
            remaining_amount = 0,
            note = CONCAT(COALESCE(note, ''), ' | [Cron: Tự đóng ca chưa check-in ngày trước]')
        WHERE id = ? AND status IN ('Đã xác nhận', 'Chờ duyệt cọc')
    ");

    foreach ($stmtPast->fetchAll(PDO::FETCH_ASSOC) as $pRow) {
        if ($pRow['status'] === 'Đang đá') {
            $updPastDone->execute([(int)$pRow['id']]);
            if ($updPastDone->rowCount() > 0) {
                $pastClosedPlaying[] = $pRow['code'];
            }
        } else {
            $updPastNoShow->execute([(int)$pRow['id']]);
            if ($updPastNoShow->rowCount() > 0) {
                $pastClosedNoShow[] = $pRow['code'];
            }
        }
    }

    if ((!empty($pastClosedPlaying) || !empty($pastClosedNoShow)) && function_exists('write_audit_log')) {
        write_audit_log(
            $pdo,
            'AUTO_CLOSE_PAST_BOOKINGS',
            null,
            null,
            'Cron tự đóng ca ngày trước: ' . count($pastClosedPlaying) . ' ca Đang đá → Hoàn thành; ' . count($pastClosedNoShow) . ' ca chưa check-in → Khách chưa đến.',
            $actor
        );
    }

    $result = [
        'success'            => true,
        'executedAt'         => date('Y-m-d H:i:s'),
        'graceMinutes'       => $graceMinutes,
        'noShowReleasedCount'=> count($noShowReleased),
        'noShowReleased'     => $noShowReleased,
        'pastClosedPlaying'  => $pastClosedPlaying,
        'pastClosedNoShow'   => $pastClosedNoShow
    ];
    echo json_encode($result, JSON_UNESCAPED_UNICODE) . ($isCli ? "\n" : '');
} catch (Throwable $e) {
    error_log('[CRON_AUTO_OPS ERROR] ' . $e->getMessage());
    $err = ['success' => false, 'message' => 'Cron execution error'];
    if (!$isCli) http_response_code(500);
    echo json_encode($err, JSON_UNESCAPED_UNICODE) . ($isCli ? "\n" : '');
    exit($isCli ? 1 : 0);
}
