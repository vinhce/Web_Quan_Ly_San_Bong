<?php

require_once __DIR__ . '/../api/security_helper.php';

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
            'message'  => 'Forbidden: Cron recurring endpoint only allows CLI or valid X-Cron-Secret header.',
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

$lockPath = $logDir . '/.cron_recurring.lock';
$lockFp = @fopen($lockPath, 'c+');
if (!$lockFp || !@flock($lockFp, LOCK_EX | LOCK_NB)) {
    if ($lockFp) {
        @fclose($lockFp);
    }
    echo json_encode([
        'success'   => true,
        'skipped'   => 'locked',
        'timestamp' => date('c'),
        'message'   => 'Tiến trình sinh lịch lặp khác đang chạy.'
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . PHP_EOL;
    exit(0);
}

$pdo = getDBConnection(false);
$result = generate_recurring_bookings_window($pdo, null, 4, null);

if ($pdo && ($result['generated_count'] ?? 0) > 0) {
    $sysActor = ['id' => null, 'full_name' => 'Hệ thống (Cron Recurring)', 'role' => 'system'];
    write_audit_log(
        $pdo,
        'RECURRING_CRON_GENERATE',
        null,
        null,
        "Sinh tự động {$result['generated_count']} buổi trong cửa sổ 4 tuần (bỏ qua {$result['skipped_conflicts']} xung đột)",
        $sysActor
    );
}

@flock($lockFp, LOCK_UN);
@fclose($lockFp);

echo json_encode([
    'success'   => true,
    'timestamp' => date('c'),
    'data'      => $result
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . PHP_EOL;
