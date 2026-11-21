<?php
declare(strict_types=1);

// Xử lý kiểm tra tài khoản quên mật khẩu
function handle_forgot_password(PDO $pdo, array $data): void {
    if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
        json_error('Phương thức không được hỗ trợ.', 405, 'ERR_METHOD_NOT_ALLOWED');
    }
    if (!verify_csrf_token($data)) {
        json_error('Phiên bảo mật không hợp lệ hoặc đã hết hạn. Vui lòng tải lại trang.', 403, 'ERR_CSRF_INVALID');
    }
    if (!function_exists('verify_turnstile_if_configured')) {
        require_once __DIR__ . '/totp_turnstile_helper.php';
    }
    $turnstileRaw = $data['cf_turnstile_response'] ?? ($data['turnstile_token'] ?? null);
    if (!verify_turnstile_if_configured(is_string($turnstileRaw) ? $turnstileRaw : null)) {
        json_error('Xác thực chống bot thất bại. Vui lòng thử lại.', 403, 'ERR_TURNSTILE_FAILED');
    }
    if (!empty($data['website'])) {
        forgot_password_success_response();
    }

    $phoneRaw = $data['phone'] ?? ($data['username'] ?? '');
    $phone = is_scalar($phoneRaw) ? preg_replace('/\D+/', '', trim((string)$phoneRaw)) : '';
    $fieldErrors = [];
    if ($phone === '' || !preg_match('/^0\d{9}$/', $phone)) {
        $fieldErrors['phone'] = 'Vui lòng nhập số điện thoại hợp lệ (10 chữ số bắt đầu bằng 0).';
    }
    if (!empty($fieldErrors)) {
        json_response([
            'success' => false,
            'message' => 'Vui lòng nhập số điện thoại hợp lệ (10 chữ số bắt đầu bằng 0).',
            'ref_code' => 'ERR_VALIDATION',
            'error' => ['code' => 'ERR_VALIDATION', 'message' => 'Dữ liệu không hợp lệ.', 'fieldErrors' => $fieldErrors],
        ], 422);
    }

    $acctKey = hash('sha256', 'phone|' . $phone);
    if (!check_rate_limit($pdo, 'forgot_pw_ip', 10, 3600) || !check_rate_limit($pdo, 'forgot_pw_acct', 5, 3600, $acctKey)) {
        header('Retry-After: 3600');
        json_error('Bạn đã yêu cầu gửi mã quá nhiều lần. Vui lòng thử lại sau ít phút.', 429, 'ERR_RATE_LIMITED');
    }
    increment_rate_limit($pdo, 'forgot_pw_ip', 3600);
    increment_rate_limit($pdo, 'forgot_pw_acct', 3600, $acctKey);

    $stmt = $pdo->prepare("SELECT id, username, phone, email, full_name, role, status FROM users WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', '') = ? OR username = ? LIMIT 1");
    $stmt->execute([$phone, $phone]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || ($user['role'] ?? '') === 'walkin' || ($user['status'] ?? '') !== 'active') {
        json_response([
            'success' => false,
            'error' => [
                'code' => 'ERR_USER_NOT_FOUND',
                'message' => 'Số điện thoại này chưa được đăng ký trong hệ thống.',
            ],
            'message' => 'Số điện thoại này chưa được đăng ký trong hệ thống.',
        ], 404);
    }

    $maskedPhone = substr($phone, 0, 4) . '***' . substr($phone, -3);
    write_audit_log(
        $pdo,
        'FORGOT_PASSWORD_REQUEST',
        null,
        null,
        'Yêu cầu khôi phục mật khẩu qua SMS cho SĐT ' . $maskedPhone,
        ['id' => (int)$user['id'], 'username' => $user['username'], 'role' => $user['role']],
        'user'
    );
    forgot_password_success_response($maskedPhone);
}

function forgot_password_success_response(string $maskedPhone = ''): void {
    $msg = $maskedPhone !== ''
        ? "Hệ thống đã gửi mã khôi phục mật khẩu qua SMS tới số điện thoại {$maskedPhone}. Vui lòng kiểm tra tin nhắn."
        : 'Hệ thống đã gửi mã khôi phục mật khẩu qua SMS tới số điện thoại của bạn. Vui lòng kiểm tra tin nhắn.';
    json_response([
        'success' => true,
        'data' => ['exists' => true, 'sms_sent' => true, 'cooldown_seconds' => 30],
        'message' => $msg,
        'ref_code' => 'OK_FORGOT_PASSWORD_SMS_SENT',
    ], 200);
}

function mask_email_for_log(string $email): string {
    $parts = explode('@', strtolower(trim($email)), 2);
    if (count($parts) !== 2 || $parts[0] === '' || $parts[1] === '') {
        return '***';
    }
    $prefix = strlen($parts[0]) <= 2 ? substr($parts[0], 0, 1) : substr($parts[0], 0, 2);
    return $prefix . '***@' . $parts[1];
}

function forgot_password_strip_crlf(string $value): string {
    return str_replace(["\r", "\n", "\0"], '', $value);
}

function forgot_password_env(string $key, string $default = ''): string {
    $val = $_ENV[$key] ?? getenv($key);
    return ($val === false || $val === null) ? $default : trim((string)$val);
}

function forgot_password_log_mail(string $email, string $status, string $reason): void {
    $logFile = dirname(__DIR__, 2) . '/logs/mail_delivery.log';
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0750, true);
    }
    try {
        $reqId = bin2hex(random_bytes(8));
    } catch (Throwable $e) {
        $reqId = uniqid('req_', true);
    }
    $entry = json_encode([
        'timestamp' => gmdate('c'),
        'requestId' => $reqId,
        'masked_email' => mask_email_for_log($email),
        'status' => forgot_password_strip_crlf($status),
        'reason' => forgot_password_strip_crlf($reason),
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($entry !== false) {
        @file_put_contents($logFile, $entry . "\n", FILE_APPEND | LOCK_EX);
    }
}

// Gửi email mã OTP qua SMTP socket thuần PHP (TLS/SSL, timeout 8s)
function send_forgot_password_email(string $toEmail, string $fullName, string $username, string $otpCode): bool {
    if (function_exists('loadEnv')) {
        loadEnv();
    }
    $cleanTo = forgot_password_strip_crlf(trim($toEmail));
    if (!filter_var($cleanTo, FILTER_VALIDATE_EMAIL)) {
        forgot_password_log_mail($toEmail, 'failed', 'invalid_recipient');
        return false;
    }

    $host = forgot_password_strip_crlf(forgot_password_env('SMTP_HOST'));
    $user = forgot_password_strip_crlf(forgot_password_env('SMTP_USER'));
    $pass = forgot_password_env('SMTP_PASS');
    $enc = strtolower(forgot_password_env('SMTP_ENCRYPTION', 'tls'));
    if (!in_array($enc, ['tls', 'ssl'], true)) {
        forgot_password_log_mail($toEmail, 'failed', 'invalid_smtp_encryption');
        return false;
    }
    $port = (int)forgot_password_env('SMTP_PORT', $enc === 'ssl' ? '465' : '587');
    $fromEmail = forgot_password_strip_crlf(forgot_password_env('SMTP_FROM_EMAIL'));
    if ($fromEmail === '' || str_contains($fromEmail, 'YOUR_')) {
        $fromEmail = $user;
    }
    $fromName = forgot_password_strip_crlf(forgot_password_env('SMTP_FROM_NAME', 'Sân Bóng Pro')) ?: 'Sân Bóng Pro';

    if ($host === '' || $user === '' || $pass === '' || str_contains($host, 'YOUR_') || str_contains($user, 'YOUR_') || str_contains($pass, 'YOUR_')) {
        forgot_password_log_mail($cleanTo, 'skipped', 'smtp_not_configured');
        return false;
    }
    if (!filter_var($fromEmail, FILTER_VALIDATE_EMAIL) || $port < 1 || $port > 65535) {
        forgot_password_log_mail($cleanTo, 'failed', 'invalid_smtp_config');
        return false;
    }

    $remote = ($enc === 'ssl' ? 'ssl://' : 'tcp://') . $host . ':' . $port;
    $ctx = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true, 'allow_self_signed' => false, 'peer_name' => $host]]);
    $socket = @stream_socket_client($remote, $errno, $errstr, 8, STREAM_CLIENT_CONNECT, $ctx);
    if (!$socket) {
        forgot_password_log_mail($cleanTo, 'failed', 'connect_error_' . (int)$errno);
        return false;
    }
    stream_set_timeout($socket, 8);

    try {
        $ehloHost = preg_replace('/[^a-zA-Z0-9.-]/', '', (string)($_SERVER['SERVER_NAME'] ?? 'localhost')) ?: 'localhost';
        if (!forgot_password_smtp_expect($socket, [220]) || !forgot_password_smtp_cmd($socket, "EHLO {$ehloHost}", [250])) {
            return forgot_password_smtp_fail($socket, $cleanTo, 'ehlo_failed');
        }
        if ($enc === 'tls') {
            if (!forgot_password_smtp_cmd($socket, 'STARTTLS', [220])) {
                return forgot_password_smtp_fail($socket, $cleanTo, 'starttls_rejected');
            }
            $crypto = STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | (defined('STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT') ? STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT : 0);
            if (!@stream_socket_enable_crypto($socket, true, $crypto)) {
                return forgot_password_smtp_fail($socket, $cleanTo, 'tls_handshake_failed');
            }
            if (!forgot_password_smtp_cmd($socket, "EHLO {$ehloHost}", [250])) {
                return forgot_password_smtp_fail($socket, $cleanTo, 'ehlo_tls_failed');
            }
        }
        if (!forgot_password_smtp_cmd($socket, 'AUTH LOGIN', [334])
            || !forgot_password_smtp_cmd($socket, base64_encode($user), [334])
            || !forgot_password_smtp_cmd($socket, base64_encode($pass), [235])) {
            return forgot_password_smtp_fail($socket, $cleanTo, 'auth_failed');
        }
        if (!forgot_password_smtp_cmd($socket, "MAIL FROM:<{$fromEmail}>", [250])
            || !forgot_password_smtp_cmd($socket, "RCPT TO:<{$cleanTo}>", [250, 251])
            || !forgot_password_smtp_cmd($socket, 'DATA', [354])) {
            return forgot_password_smtp_fail($socket, $cleanTo, 'envelope_rejected');
        }
        $payload = forgot_password_build_mime($fromEmail, $fromName, $cleanTo, $fullName, $username, $otpCode, $ehloHost);
        if (!forgot_password_smtp_write($socket, $payload . "\r\n.\r\n") || !forgot_password_smtp_expect($socket, [250])) {
            return forgot_password_smtp_fail($socket, $cleanTo, 'data_rejected');
        }
        @forgot_password_smtp_write($socket, "QUIT\r\n");
        @fclose($socket);
        forgot_password_log_mail($cleanTo, 'sent', 'smtp_accepted');
        return true;
    } catch (Throwable $e) {
        return forgot_password_smtp_fail($socket, $cleanTo, 'smtp_exception');
    }
}

function forgot_password_build_mime(string $fromEmail, string $fromName, string $toEmail, string $fullName, string $username, string $otpCode, string $domain): string {
    $safeName = htmlspecialchars(trim($fullName) !== '' ? $fullName : $username, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $safeUser = htmlspecialchars($username, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $safeOtp = htmlspecialchars($otpCode, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $html = '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;color:#111827">'
        . '<h2 style="margin:0 0 12px;color:#059669">Sân Bóng Pro - Khôi phục mật khẩu</h2>'
        . "<p>Xin chào <strong>{$safeName}</strong> (@{$safeUser}),</p>"
        . '<p>Mã xác nhận đặt lại mật khẩu của bạn là:</p>'
        . "<div style=\"font-size:30px;font-weight:700;letter-spacing:6px;text-align:center;padding:16px;background:#f0fdf4;border:1px dashed #10b981;border-radius:8px;margin:16px 0;color:#047857\">{$safeOtp}</div>"
        . '<p>Mã có hiệu lực trong <strong>5 phút</strong>. Tuyệt đối không chia sẻ mã này cho bất kỳ ai.</p>'
        . '<p style="font-size:12px;color:#6b7280">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>'
        . '</div>';

    $encodedFrom = '=?UTF-8?B?' . base64_encode($fromName) . '?=';
    $encodedSubject = '=?UTF-8?B?' . base64_encode('Mã xác nhận đặt lại mật khẩu - Sân Bóng Pro') . '?=';
    $headers = [
        'Date: ' . gmdate('D, d M Y H:i:s +0000'),
        "From: {$encodedFrom} <{$fromEmail}>",
        "To: <{$toEmail}>",
        "Subject: {$encodedSubject}",
        'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . $domain . '>',
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
    ];
    return implode("\r\n", $headers) . "\r\n\r\n" . rtrim(chunk_split(base64_encode($html), 76, "\r\n"), "\r\n");
}

function forgot_password_smtp_cmd($socket, string $cmd, array $expectedCodes): bool {
    return forgot_password_smtp_write($socket, forgot_password_strip_crlf($cmd) . "\r\n") && forgot_password_smtp_expect($socket, $expectedCodes);
}

function forgot_password_smtp_write($socket, string $data): bool {
    $total = strlen($data);
    for ($written = 0; $written < $total; $written += $bytes) {
        $bytes = @fwrite($socket, substr($data, $written));
        if ($bytes === false || $bytes === 0) {
            return false;
        }
    }
    return true;
}

function forgot_password_smtp_expect($socket, array $expectedCodes): bool {
    $lastLine = '';
    while (($line = @fgets($socket, 2048)) !== false) {
        $lastLine = $line;
        if (strlen($line) < 4 || $line[3] === ' ' || $line[3] === "\r" || $line[3] === "\n") {
            break;
        }
    }
    $meta = stream_get_meta_data($socket);
    return $lastLine !== '' && empty($meta['timed_out']) && in_array((int)substr($lastLine, 0, 3), $expectedCodes, true);
}

function forgot_password_smtp_fail($socket, string $email, string $reason): bool {
    if (is_resource($socket)) {
        @fclose($socket);
    }
    forgot_password_log_mail($email, 'failed', $reason);
    return false;
}
