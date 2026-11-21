<?php

require_once __DIR__ . '/../api/security_helper.php';
require_once __DIR__ . '/../api/services/cancellation_helper.php';
require_once __DIR__ . '/../api/services/cron_ops_service.php';

cron_authorize_request();

$logDir = __DIR__ . '/../logs';
if (!is_dir($logDir)) {
    @mkdir($logDir, 0750, true);
}

$lockFp = cron_acquire_lock('cron_auto_release');
if (!$lockFp) {
    $lockedResp = [
        'success'   => true,
        'skipped'   => 'locked',
        'timestamp' => date('c'),
        'message'   => 'Tiến trình cron khác đang chạy.'
    ];
    echo json_encode($lockedResp, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . PHP_EOL;
    exit(0);
}

try {
    $pdo = getDBConnection(false);
    $result = run_auto_release_expired_bookings($pdo, false);

    $logEntry = sprintf(
        "[%s] AUTO_RELEASE: released=%d, codes=%s, skipped=%s\n",
        date('Y-m-d H:i:s'),
        $result['released_count'] ?? 0,
        implode(',', $result['codes'] ?? []),
        $result['skipped'] ?? 'none'
    );
    @file_put_contents($logDir . '/cron_auto_release.log', $logEntry, FILE_APPEND);

    echo json_encode([
        'success'   => true,
        'timestamp' => date('c'),
        'data'      => $result
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . PHP_EOL;
} catch (Throwable $e) {
    error_log("[CRON AUTO RELEASE ERROR] " . $e->getMessage());
    echo json_encode([
        'success'   => false,
        'timestamp' => date('c'),
        'error'     => 'Lỗi thực thi cron tự động nhả sân.'
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . PHP_EOL;
} finally {
    cron_release_lock($lockFp);
}
