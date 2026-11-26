<?php
declare(strict_types=1);

require_once __DIR__ . '/security_helper.php';
require_once __DIR__ . '/notification_helper.php';
require_once __DIR__ . '/services/telegram_bot_commands.php';

if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
    json_error('Method Not Allowed', 405, 'ERR_METHOD_NOT_ALLOWED');
}

loadEnv();

$expectedSecret = trim((string)($_ENV['TELEGRAM_WEBHOOK_SECRET'] ?? getenv('TELEGRAM_WEBHOOK_SECRET') ?: ''));
$headers = function_exists('getallheaders') ? getallheaders() : [];
$providedSecret = trim((string)(
    $_SERVER['HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN']
    ?? $headers['X-Telegram-Bot-Api-Secret-Token']
    ?? $headers['x-telegram-bot-api-secret-token']
    ?? ''
));

if ($expectedSecret === '' || $providedSecret === '' || !hash_equals($expectedSecret, $providedSecret)) {
    error_log('[TELEGRAM WEBHOOK FORBIDDEN] ip=' . get_client_ip());
    json_error('Forbidden webhook request', 403, 'ERR_TELEGRAM_WEBHOOK_FORBIDDEN');
}

$rawBody = file_get_contents('php://input');
$update = json_decode((string)$rawBody, true);
if (!is_array($update)) {
    json_response(['ok' => true, 'ignored' => 'invalid_payload']);
}

$msg = $update['message'] ?? $update['channel_post'] ?? null;
if (!is_array($msg)) {
    json_response(['ok' => true, 'ignored' => 'unsupported_update']);
}

$chatId = trim((string)($msg['chat']['id'] ?? ''));
$allowedRaw = trim((string)($_ENV['TELEGRAM_ALLOWED_CHAT_IDS'] ?? getenv('TELEGRAM_ALLOWED_CHAT_IDS') ?: ''));
if ($allowedRaw === '') {
    $allowedRaw = trim((string)($_ENV['TELEGRAM_CHAT_ID'] ?? getenv('TELEGRAM_CHAT_ID') ?: ''));
}
$allowedIds = array_values(array_filter(array_map('trim', explode(',', $allowedRaw))));

if ($chatId === '' || empty($allowedIds) || !in_array($chatId, $allowedIds, true)) {
    error_log('[TELEGRAM WEBHOOK IGNORED CHAT] chat_id=' . $chatId);
    json_response(['ok' => true, 'ignored' => 'unauthorized_chat']);
}

$text = trim((string)($msg['text'] ?? ''));
if ($text === '' || $text[0] !== '/') {
    json_response(['ok' => true, 'ignored' => 'not_command']);
}

$botToken = trim((string)($_ENV['TELEGRAM_BOT_TOKEN'] ?? getenv('TELEGRAM_BOT_TOKEN') ?: ''));
if ($botToken === '') {
    error_log('[TELEGRAM WEBHOOK WARN] missing TELEGRAM_BOT_TOKEN');
    json_response(['ok' => false, 'reason' => 'missing_bot_token'], 500);
}

$pdo = getDBConnection(false);
if (!$pdo) {
    $errRes = tg_bot_send_reply($botToken, $chatId, '⚠️ Hệ thống CSDL tạm thời bận, vui lòng thử lại sau ít giây.');
    json_response(['ok' => !empty($errRes['ok']), 'reason' => 'db_unavailable']);
}

try {
    $reply = tg_bot_handle_command($pdo, $text);
    if ($reply === null || trim($reply) === '') {
        json_response(['ok' => true, 'ignored' => 'empty_reply']);
    }
    $sendRes = tg_bot_send_reply($botToken, $chatId, $reply);
    json_response([
        'ok'        => true,
        'sent'      => !empty($sendRes['ok']),
        'http_code' => (int)($sendRes['http_code'] ?? 0),
    ]);
} catch (Throwable $e) {
    error_log('[TELEGRAM WEBHOOK ERROR] ' . $e->getMessage());
    tg_bot_send_reply($botToken, $chatId, '❌ Lỗi xử lý lệnh. Vui lòng thử lại sau.');
    json_response(['ok' => false, 'reason' => 'command_error'], 500);
}
