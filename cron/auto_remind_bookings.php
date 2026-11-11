<?php

require_once __DIR__ . '/../api/security_helper.php';
require_once __DIR__ . '/../api/notification_helper.php';

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
            'message'  => 'Forbidden: Cron endpoint only allows CLI or valid X-Cron-Secret header.',
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

$lockPath = $logDir . '/.cron_remind.lock';
$lockFp = @fopen($lockPath, 'c+');
if (!$lockFp || !@flock($lockFp, LOCK_EX | LOCK_NB)) {
    if ($lockFp) {
        @fclose($lockFp);
    }
    echo json_encode([
        'success'   => true,
        'skipped'   => 'locked',
        'timestamp' => date('c'),
        'message'   => 'Tiến trình nhắc lịch khác đang chạy.'
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . PHP_EOL;
    exit(0);
}

$pdo = getDBConnection(false);
$result = check_and_send_match_reminders($pdo);

@flock($lockFp, LOCK_UN);
@fclose($lockFp);

echo json_encode([
    'success'   => true,
    'timestamp' => date('c'),
    'data'      => $result
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . PHP_EOL;
