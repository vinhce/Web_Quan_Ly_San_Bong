<?php
declare(strict_types=1);

/**
 * Automated Operations Cron Job (15-Minute Grace Rule & Prior-Day Auto-Close)
 * Usage (CLI):  php api/cron_auto_ops.php
 * Usage (HTTP): Header X-Cron-Secret: <CRON_SECRET>
 */

require_once __DIR__ . '/services/cron_ops_service.php';

$isCli = (PHP_SAPI === 'cli');
$actor = ['id' => 0, 'username' => 'system_cron', 'full_name' => 'Hệ thống Cron Tự động', 'role' => 'admin'];

cron_authorize_request();

$lockFp = cron_acquire_lock('cron_auto_ops');
if (!$lockFp) {
    echo json_encode([
        'success'   => true,
        'skipped'   => 'locked',
        'timestamp' => date('c'),
        'message'   => 'Tiến trình cron_auto_ops khác đang chạy.'
    ], JSON_UNESCAPED_UNICODE) . ($isCli ? "\n" : '');
    exit(0);
}

try {
    $pdo = getDBConnection(false);
    if (!$pdo) {
        $msg = ['success' => false, 'message' => 'Database connection failed'];
        if (!$isCli) {
            http_response_code(503);
        }
        echo json_encode($msg, JSON_UNESCAPED_UNICODE) . ($isCli ? "\n" : '');
        exit($isCli ? 1 : 0);
    }

    $result = cron_run_auto_ops($pdo, $actor);
    echo json_encode($result, JSON_UNESCAPED_UNICODE) . ($isCli ? "\n" : '');
} catch (Throwable $e) {
    error_log('[CRON_AUTO_OPS ERROR] ' . $e->getMessage());
    $err = ['success' => false, 'message' => 'Cron execution error'];
    if (!$isCli) {
        http_response_code(500);
    }
    echo json_encode($err, JSON_UNESCAPED_UNICODE) . ($isCli ? "\n" : '');
    exit($isCli ? 1 : 0);
} finally {
    cron_release_lock($lockFp);
}
