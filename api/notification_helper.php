<?php

defined('SANBONG_APP') or define('SANBONG_APP', true);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/security_helper.php';

function tg_escape($val): string {
    return htmlspecialchars((string)$val, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function curl_configure_ssl_tls($ch): void {
    $candidates = array_filter([
        trim((string)ini_get('curl.cainfo')),
        trim((string)ini_get('openssl.cafile')),
        trim((string)(openssl_get_cert_locations()['default_cert_file'] ?? '')),
        'C:/laragon/etc/ssl/cacert.pem',
        'C:/laragon/bin/php/php-8.1.10-Win32-vs16-x64/extras/ssl/cacert.pem',
    ]);
    $caFile = '';
    foreach ($candidates as $cand) {
        if ($cand !== '' && is_file($cand)) {
            $caFile = $cand;
            break;
        }
    }
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
    if ($caFile !== '') {
        curl_setopt($ch, CURLOPT_CAINFO, $caFile);
    }
}

function is_safe_webhook_url(string $url): array {
    $trimmed = trim($url);
    if ($trimmed === '' || strlen($trimmed) > 500) {
        return ['safe' => false, 'reason' => 'URL webhook trống hoặc quá dài.'];
    }
    if (!filter_var($trimmed, FILTER_VALIDATE_URL)) {
        return ['safe' => false, 'reason' => 'URL webhook không đúng định dạng.'];
    }
    $parts = parse_url($trimmed);
    $scheme = strtolower((string)($parts['scheme'] ?? ''));
    $host = strtolower(trim((string)($parts['host'] ?? ''), '[]'));
    $port = (int)($parts['port'] ?? ($scheme === 'https' ? 443 : 80));
    if (!in_array($scheme, ['https', 'http'], true) || $host === '' || $port <= 0 || $port > 65535) {
        return ['safe' => false, 'reason' => 'Chỉ chấp nhận URL HTTP hoặc HTTPS hợp lệ.'];
    }
    if (in_array($host, ['localhost', 'ip6-localhost', 'metadata.google.internal', 'metadata.google'], true) || substr($host, -6) === '.local' || substr($host, -9) === '.internal') {
        return ['safe' => false, 'reason' => 'Không được phép gọi webhook tới địa chỉ nội bộ (SSRF).'];
    }

    $ips = [];
    if (filter_var($host, FILTER_VALIDATE_IP)) {
        $ips[] = $host;
    } else {
        $dnsRecords = @dns_get_record($host, DNS_A | DNS_AAAA);
        if (is_array($dnsRecords)) {
            foreach ($dnsRecords as $rec) {
                if (!empty($rec['ip'])) {
                    $ips[] = (string)$rec['ip'];
                }
                if (!empty($rec['ipv6'])) {
                    $ips[] = (string)$rec['ipv6'];
                }
            }
        }
        if (empty($ips)) {
            $resolved = @gethostbynamel($host);
            if (is_array($resolved)) {
                $ips = $resolved;
            }
        }
    }

    $ips = array_values(array_unique(array_filter($ips)));
    if (empty($ips)) {
        return ['safe' => false, 'reason' => 'Không phân giải được địa chỉ IP công khai cho host webhook.'];
    }

    foreach ($ips as $ip) {
        $isPublic = filter_var(
            $ip,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
        );
        if ($isPublic === false) {
            return ['safe' => false, 'reason' => 'Từ chối URL trỏ vào dải IP nội bộ / loopback / link-local.'];
        }
    }

    return ['safe' => true, 'url' => $trimmed, 'host' => $host, 'port' => $port, 'resolved_ips' => $ips];
}

function log_system_notification(PDO $pdo, $bookingId, $bookingCode, $recipient, $channel, $eventType, $title, $content, $status = 'sent', $responsePayload = null) {
    try {
        $allowedChannels = ['telegram', 'zalo', 'sms', 'system'];
        $safeChannel = in_array($channel, $allowedChannels, true) ? $channel : 'system';
        $safeStatus = in_array($status, ['sent', 'failed', 'pending'], true) ? $status : 'sent';
        $stmt = $pdo->prepare("
            INSERT INTO notification_logs
            (booking_id, booking_code, recipient, channel, event_type, title, content, status, response_payload, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $bookingId ? (int)$bookingId : null,
            $bookingCode ? sanitize_string((string)$bookingCode, 40) : null,
            sanitize_string((string)$recipient, 100) ?: 'system',
            $safeChannel,
            sanitize_string((string)$eventType, 50),
            sanitize_string((string)$title, 255),
            (string)$content,
            $safeStatus,
            $responsePayload !== null ? mb_substr((string)$responsePayload, 0, 1000) : null
        ]);
        return (int)$pdo->lastInsertId();
    } catch (Exception $e) {
        error_log("[NOTIF LOG ERROR] " . $e->getMessage());
        return false;
    }
}

function execute_http_post_with_retry(string $url, $body, array $headers = [], int $timeoutSec = 3, int $maxAttempts = 2, array $resolveOverrides = []): array {
    $attempt = 0;
    $lastHttp = 0;
    $lastResp = '';
    $lastErr  = '';

    while ($attempt < $maxAttempts) {
        $attempt++;
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
        if (defined('CURLPROTO_HTTP') && defined('CURLPROTO_HTTPS')) {
            curl_setopt($ch, CURLOPT_PROTOCOLS, CURLPROTO_HTTP | CURLPROTO_HTTPS);
        }
        if (!empty($resolveOverrides)) {
            curl_setopt($ch, CURLOPT_RESOLVE, $resolveOverrides);
        }
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, min(2, $timeoutSec));
        curl_setopt($ch, CURLOPT_TIMEOUT, $timeoutSec);
        if (!empty($headers)) {
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        }
        curl_configure_ssl_tls($ch);
        $result = curl_exec($ch);
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        curl_close($ch);

        $lastHttp = $httpCode;
        $lastResp = is_string($result) ? $result : '';
        $lastErr  = $curlErr;

        if ($httpCode >= 200 && $httpCode < 300 && $result !== false) {
            return ['ok' => true, 'http_code' => $httpCode, 'response' => $lastResp, 'attempts' => $attempt];
        }

        // Chỉ retry nếu lỗi mạng hoặc 5xx/429
        $retryable = ($curlErr !== '' || $httpCode === 0 || $httpCode === 429 || $httpCode >= 500);
        if ($attempt < $maxAttempts && $retryable) {
            usleep(150000);
            continue;
        }
        break;
    }

    return [
        'ok'        => false,
        'http_code' => $lastHttp,
        'response'  => $lastResp,
        'error'     => $lastErr,
        'attempts'  => $attempt
    ];
}

function send_telegram_notification_detailed(string $message, ?string $eventKey = null, ?PDO $pdo = null, bool $forceTest = false): array {
    if (trim($message) === '') {
        return ['sent' => false, 'reason' => 'empty_message'];
    }

    if (!$pdo) {
        $pdo = getDBConnection(false);
    }

    loadEnv();
    $settings = $pdo ? get_system_settings_map($pdo) : [];

    $enabled = ((string)($settings['telegram_notify_enabled'] ?? '0') === '1');
    if (!$forceTest && !$enabled) {
        return ['sent' => false, 'reason' => 'telegram_disabled'];
    }

    $allowedEvents = ['new_booking', 'cancel', 'shift_diff', 'unmatched_tx', 'low_stock', 'waitlist', 'matchmaking', 'review'];
    if (!$forceTest && $eventKey !== null && in_array($eventKey, $allowedEvents, true)) {
        $evEnabled = ((string)($settings["tg_event_{$eventKey}"] ?? '1') !== '0');
        if (!$evEnabled) {
            return ['sent' => false, 'reason' => 'event_disabled', 'event' => $eventKey];
        }
    }

    $botToken = trim((string)($settings['telegram_bot_token'] ?? ''));
    if ($botToken === '' || $botToken === '********') {
        $botToken = trim((string)($_ENV['TELEGRAM_BOT_TOKEN'] ?? getenv('TELEGRAM_BOT_TOKEN') ?: ''));
    }
    $chatId = trim((string)($settings['telegram_chat_id'] ?? ''));
    if ($chatId === '') {
        $chatId = trim((string)($_ENV['TELEGRAM_CHAT_ID'] ?? getenv('TELEGRAM_CHAT_ID') ?: ''));
    }

    if ($botToken === '' || $chatId === '') {
        return ['sent' => false, 'reason' => 'missing_credentials'];
    }

    $url = "https://api.telegram.org/bot{$botToken}/sendMessage";
    $postFields = http_build_query([
        'chat_id'                  => $chatId,
        'text'                     => $message,
        'parse_mode'               => 'HTML',
        'disable_web_page_preview' => true
    ]);

    $res = execute_http_post_with_retry($url, $postFields, [], 3, 2);
    $ok = !empty($res['ok']);
    $logEventType = 'tg_' . ($eventKey ?: ($forceTest ? 'test' : 'general'));
    $plainContent = trim(strip_tags(str_replace(['<br>', '<br/>', '<br />'], "\n", $message)));
    $respNote = $ok
        ? ('HTTP ' . $res['http_code'] . ' (' . $res['attempts'] . ' try)')
        : ('HTTP ' . $res['http_code'] . ($res['error'] ? ' | ' . $res['error'] : ''));

    if ($pdo && !$pdo->inTransaction()) {
        log_system_notification(
            $pdo,
            null,
            null,
            'TG:' . $chatId,
            'telegram',
            $logEventType,
            'Thông báo Telegram' . ($eventKey ? " ({$eventKey})" : ''),
            $plainContent,
            $ok ? 'sent' : 'failed',
            $respNote
        );
    }

    if (!$ok) {
        error_log("[TELEGRAM NOTIF FAIL] event={$logEventType} http={$res['http_code']} err=" . ($res['error'] ?: 'non-200'));
    }

    return [
        'sent'      => $ok,
        'http_code' => $res['http_code'],
        'attempts'  => $res['attempts'],
        'reason'    => $ok ? 'ok' : ($res['error'] ?: 'telegram_api_error')
    ];
}

function send_telegram_notification($message, ?string $eventKey = null, ?PDO $pdo = null): bool {
    if (!is_string($message) || trim($message) === '') {
        return false;
    }
    try {
        $res = send_telegram_notification_detailed($message, $eventKey, $pdo, false);
        return !empty($res['sent']);
    } catch (Exception $e) {
        error_log("[TELEGRAM NOTIF ERROR] " . $e->getMessage());
        return false;
    }
}

function render_notification_template(string $template, array $vars): string {
    $replacements = [
        '{code}'             => (string)($vars['code'] ?? $vars['booking_code'] ?? ''),
        '{customer_name}'    => (string)($vars['customer_name'] ?? ''),
        '{phone}'            => (string)($vars['phone'] ?? ''),
        '{pitch_name}'       => (string)($vars['pitch_name'] ?? ''),
        '{date}'             => (string)($vars['date'] ?? ''),
        '{slot_time}'        => (string)($vars['slot_time'] ?? ''),
        '{total_price}'      => number_format((int)($vars['total_price'] ?? 0), 0, ',', '.'),
        '{deposit_amount}'   => number_format((int)($vars['deposit_amount'] ?? 0), 0, ',', '.'),
        '{remaining_amount}' => number_format((int)($vars['remaining_amount'] ?? 0), 0, ',', '.'),
        '{reason}'           => (string)($vars['reason'] ?? ''),
        '{hold_minutes}'     => (string)($vars['hold_minutes'] ?? '15'),
    ];
    return strtr($template, $replacements);
}

function send_customer_notification(PDO $pdo, string $eventType, array $payload): array {
    $settings = get_system_settings_map($pdo);
    loadEnv();

    $bookingId   = $payload['booking_id'] ?? null;
    $bookingCode = $payload['booking_code'] ?? $payload['code'] ?? null;
    $phone       = sanitize_string((string)($payload['phone'] ?? ''), 25) ?: 'unknown';
    $channelPref = sanitize_string((string)($payload['channel'] ?? 'zalo'), 20);

    $title = (string)($payload['custom_title'] ?? '');
    $content = (string)($payload['custom_content'] ?? '');

    if ($content === '') {
        if ($eventType === 'booking_confirm') {
            $tpl = (string)($settings['booking_confirm_template'] ?? 'Sân Bóng Pro xác nhận đơn {code}: Sân {pitch_name}, ngày {date} khung giờ {slot_time}. Tổng: {total_price}đ (Cọc: {deposit_amount}đ).');
            $title = $title !== '' ? $title : "Xác nhận đặt sân #{$bookingCode}";
            $content = render_notification_template($tpl, $payload);
        } elseif ($eventType === 'remind_match') {
            $tpl = (string)($settings['reminder_template'] ?? 'Nhắc lịch đá bóng: Đội bạn có ca lúc {slot_time} ngày {date} tại {pitch_name}. Mã vé: {code}. Vui lòng đến trước 15 phút!');
            $title = $title !== '' ? $title : "Nhắc lịch đá bóng - Sân " . ($payload['pitch_name'] ?? '');
            $content = render_notification_template($tpl, $payload);
        } elseif ($eventType === 'cancel_booking') {
            $title = $title !== '' ? $title : "Thông báo hủy đơn #{$bookingCode}";
            $content = render_notification_template(
                'Đơn đặt sân {code} tại {pitch_name} ({date} {slot_time}) đã được cập nhật hủy. Lý do: {reason}.',
                $payload
            );
        } elseif ($eventType === 'transfer_pitch') {
            $title = $title !== '' ? $title : "Thông báo đổi sân đơn #{$bookingCode}";
            $content = render_notification_template(
                'Đơn {code} ngày {date} ({slot_time}) đã được điều chuyển sang {pitch_name}.',
                $payload
            );
        } else {
            $title = $title !== '' ? $title : "Thông báo từ Sân Bóng Pro";
            $content = render_notification_template('Đơn {code} tại {pitch_name} lúc {slot_time} ngày {date}.', $payload);
        }
    }

    $enabled = ((string)($settings['customer_notify_enabled'] ?? '0') === '1');
    $webhookUrl = trim((string)($settings['customer_notify_webhook'] ?? ''));
    if ($webhookUrl === '') {
        $webhookUrl = trim((string)($_ENV['CUSTOMER_NOTIFY_WEBHOOK'] ?? getenv('CUSTOMER_NOTIFY_WEBHOOK') ?: ''));
    }

    if (!$enabled || $webhookUrl === '') {
        if (!$pdo->inTransaction()) {
            log_system_notification(
                $pdo,
                $bookingId,
                $bookingCode,
                $phone,
                'system',
                $eventType,
                $title,
                $content,
                'sent',
                'Ghi nhận nội bộ (Webhook Zalo/SMS đang tắt hoặc chưa cấu hình)'
            );
        }
        return ['sent' => true, 'channel' => 'system', 'status' => 'sent'];
    }

    $ssrfCheck = is_safe_webhook_url($webhookUrl);
    if (empty($ssrfCheck['safe'])) {
        $reason = $ssrfCheck['reason'] ?? 'URL không hợp lệ';
        if (!$pdo->inTransaction()) {
            log_system_notification(
                $pdo,
                $bookingId,
                $bookingCode,
                $phone,
                $channelPref,
                $eventType,
                $title,
                $content,
                'failed',
                $reason
            );
        }
        return ['sent' => false, 'channel' => $channelPref, 'status' => 'failed', 'error' => $reason];
    }

    $bodyArr = [
        'event'         => $eventType,
        'channel'       => $channelPref,
        'phone'         => $phone,
        'customer_name' => (string)($payload['customer_name'] ?? ''),
        'booking_code'  => $bookingCode,
        'title'         => $title,
        'message'       => $content,
        'timestamp'     => date('c')
    ];
    $headers = ['Content-Type: application/json; charset=utf-8'];
    $secret = trim((string)($_ENV['CUSTOMER_NOTIFY_SECRET'] ?? getenv('CUSTOMER_NOTIFY_SECRET') ?: ''));
    if ($secret !== '') {
        $headers[] = 'Authorization: Bearer ' . $secret;
    }

    $resolveOverrides = [];
    if (!empty($ssrfCheck['host']) && !empty($ssrfCheck['port']) && !empty($ssrfCheck['resolved_ips'][0]) && !filter_var($ssrfCheck['host'], FILTER_VALIDATE_IP)) {
        $resolveOverrides[] = $ssrfCheck['host'] . ':' . (int)$ssrfCheck['port'] . ':' . $ssrfCheck['resolved_ips'][0];
    }

    $res = execute_http_post_with_retry($webhookUrl, json_encode($bodyArr, JSON_UNESCAPED_UNICODE), $headers, 4, 2, $resolveOverrides);
    $ok = !empty($res['ok']);
    $respNote = 'HTTP ' . $res['http_code'] . ' (' . $res['attempts'] . ' try)' . ($res['error'] ? ' | ' . $res['error'] : '');

    if (!$pdo->inTransaction()) {
        log_system_notification(
            $pdo,
            $bookingId,
            $bookingCode,
            $phone,
            $channelPref,
            $eventType,
            $title,
            $content,
            $ok ? 'sent' : 'failed',
            $respNote
        );
    }

    return ['sent' => $ok, 'channel' => $channelPref, 'status' => $ok ? 'sent' : 'failed', 'http_code' => $res['http_code']];
}

function check_and_send_match_reminders(PDO $pdo) {
    $settings = get_system_settings_map($pdo);
    if (($settings['reminder_enabled'] ?? '1') !== '1') {
        return ['success' => true, 'reminded_count' => 0, 'message' => 'Tính năng nhắc lịch đang tắt.'];
    }

    $hoursBefore = max(1, min(24, (int)($settings['reminder_hours_before'] ?? 2)));
    $windowMaxMinutes = ($hoursBefore * 60) + 30;
    $windowMinMinutes = max(15, ($hoursBefore * 60) - 60);

    $today = date('Y-m-d');
    $tomorrow = date('Y-m-d', strtotime('+1 day'));
    $nowTimestamp = time();

    $query = "
        SELECT b.id, b.code, b.customer_name, b.phone, b.booking_date, b.slot_time, b.total_price, b.deposit_amount, b.remaining_amount, p.name AS pitch_name
        FROM bookings b
        JOIN pitches p ON b.pitch_id = p.id
        WHERE b.booking_date IN (?, ?)
          AND b.status NOT IN ('Đã hủy', 'Hoàn thành', 'Đang đá', 'Khách chưa đến')
          AND b.payment_status NOT IN ('Đã hủy', 'Đã hoàn cọc 100%', 'Tịch thu cọc 30%', 'Phạt 50% cọc', 'Bảo lưu cọc 30%')
          AND NOT EXISTS (
              SELECT 1 FROM notification_logs nl
              WHERE nl.booking_code = b.code AND nl.event_type = 'remind_match' AND nl.status = 'sent'
          )
    ";
    $stmt = $pdo->prepare($query);
    $stmt->execute([$today, $tomorrow]);
    $candidates = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $remindedCount = 0;
    foreach ($candidates as $b) {
        $parts = explode('-', $b['slot_time']);
        $startTimeStr = trim($parts[0] ?? '');
        if ($startTimeStr === '') {
            continue;
        }

        $matchTime = strtotime("{$b['booking_date']} {$startTimeStr}:00");
        if (!$matchTime) {
            continue;
        }
        $diffMinutes = round(($matchTime - $nowTimestamp) / 60);

        if ($diffMinutes >= $windowMinMinutes && $diffMinutes <= $windowMaxMinutes) {
            send_customer_notification($pdo, 'remind_match', [
                'booking_id'       => $b['id'],
                'booking_code'     => $b['code'],
                'code'             => $b['code'],
                'customer_name'    => $b['customer_name'],
                'phone'            => $b['phone'],
                'pitch_name'       => $b['pitch_name'],
                'date'             => date('d/m/Y', strtotime($b['booking_date'])),
                'slot_time'        => $b['slot_time'],
                'total_price'      => $b['total_price'],
                'deposit_amount'   => $b['deposit_amount'],
                'remaining_amount' => $b['remaining_amount']
            ]);

            $tgMsg = "⏰ <b>NHẮC LỊCH ĐÁ BÓNG (TRƯỚC {$hoursBefore}H)</b>\n"
                   . "• Khách: <b>{$b['customer_name']}</b> ({$b['phone']})\n"
                   . "• Sân: <b>{$b['pitch_name']}</b>\n"
                   . "• Khung giờ: <b>{$b['slot_time']}</b> (" . date('d/m/Y', strtotime($b['booking_date'])) . ")\n"
                   . "• Mã vé: <code>{$b['code']}</code>";
            send_telegram_notification($tgMsg, 'new_booking', $pdo);

            $remindedCount++;
        }
    }

    return ['success' => true, 'reminded_count' => $remindedCount, 'hours_before' => $hoursBefore];
}
