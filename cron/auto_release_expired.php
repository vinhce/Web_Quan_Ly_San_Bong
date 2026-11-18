<?php

require_once __DIR__ . '/../api/security_helper.php';
require_once __DIR__ . '/../api/services/cancellation_helper.php';

$isCli = (php_sapi_name() === 'cli' || PHP_SAPI === 'cli');

if (!$isCli) {
    loadEnv();
    $cronSecret = trim($_ENV['CRON_SECRET'] ?? getenv('CRON_SECRET') ?: '');
    $provided   = trim((string)($_SERVER['HTTP_X_CRON_SECRET'] ?? ''));

    $authorized = ($cronSecret !== '' && $provided !== '' && hash_equals($cronSecret, $provided));

    if (!$authorized) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success'  => false,
            'message'  => 'Forbidden: Cron endpoint only allows CLI or valid X-Cron-Secret.',
            'ref_code' => 'ERR_FORBIDDEN'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    header('Content-Type: application/json; charset=utf-8');
}

$logDir = __DIR__ . '/../logs';
if (!is_dir($logDir)) {
    @mkdir($logDir, 0750, true);
}

$lockPath = $logDir . '/.cron_auto_release.lock';
$lockFp = @fopen($lockPath, 'c+');
if (!$lockFp || !@flock($lockFp, LOCK_EX | LOCK_NB)) {
    if ($lockFp) {
        @fclose($lockFp);
    }
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
    if ($lockFp) {
        @flock($lockFp, LOCK_UN);
        @fclose($lockFp);
    }
}
