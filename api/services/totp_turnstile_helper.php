<?php
// Trợ thủ xác thực 2FA TOTP, Cloudflare Turnstile và cộng điểm hội viên

function totp_base32_decode(string $b32): string {
    $b32 = strtoupper(preg_replace('/[^A-Z2-7]/', '', $b32));
    if ($b32 === '') {
        return '';
    }
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $buffer = 0;
    $bitsLeft = 0;
    $output = '';
    for ($i = 0, $len = strlen($b32); $i < $len; $i++) {
        $val = strpos($chars, $b32[$i]);
        if ($val === false) {
            continue;
        }
        $buffer = ($buffer << 5) | $val;
        $bitsLeft += 5;
        if ($bitsLeft >= 8) {
            $bitsLeft -= 8;
            $output .= chr(($buffer >> $bitsLeft) & 0xFF);
        }
    }
    return $output;
}

function totp_generate_secret(int $secretLength = 16): string {
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $secret = '';
    for ($i = 0; $i < $secretLength; $i++) {
        $secret .= $chars[random_int(0, 31)];
    }
    return $secret;
}

function totp_calculate_code(string $secret, int $timeSlice): string {
    $secretKey = totp_base32_decode($secret);
    $timePacked = pack('N*', 0) . pack('N*', $timeSlice);
    $hash = hash_hmac('sha1', $timePacked, $secretKey, true);
    $offset = ord(substr($hash, -1)) & 0x0F;
    $truncated = unpack('N', substr($hash, $offset, 4))[1] & 0x7FFFFFFF;
    $pin = $truncated % 1000000;
    return str_pad((string)$pin, 6, '0', STR_PAD_LEFT);
}

function totp_verify_code(string $secret, string $code, int $window = 1): bool {
    $cleanCode = preg_replace('/\s+/', '', (string)$code);
    if (!preg_match('/^[0-9]{6}$/', $cleanCode) || trim($secret) === '') {
        return false;
    }
    $currentTimeSlice = (int)floor(time() / 30);
    $window = max(0, min(3, $window));
    for ($i = -$window; $i <= $window; $i++) {
        $calculated = totp_calculate_code($secret, $currentTimeSlice + $i);
        if (hash_equals($calculated, $cleanCode)) {
            return true;
        }
    }
    return false;
}

function totp_provisioning_uri(string $accountName, string $secret, string $issuer = 'SanBongPro'): string {
    $cleanAccount = rawurlencode(trim($accountName) ?: 'User');
    $cleanIssuer = rawurlencode(trim($issuer) ?: 'SanBongPro');
    $cleanSecret = rawurlencode(strtoupper(preg_replace('/[^A-Z2-7]/', '', $secret)));
    return "otpauth://totp/{$cleanIssuer}:{$cleanAccount}?secret={$cleanSecret}&issuer={$cleanIssuer}&algorithm=SHA1&digits=6&period=30";
}

function verify_turnstile_if_configured(?string $token): bool {
    if (function_exists('loadEnv')) {
        loadEnv();
    }
    $appEnv = strtolower(trim((string)($_ENV['APP_ENV'] ?? getenv('APP_ENV') ?: 'production')));
    $allowLocalBypass = (strtolower(trim((string)($_ENV['ALLOW_LOCAL_TURNSTILE_BYPASS'] ?? getenv('ALLOW_LOCAL_TURNSTILE_BYPASS') ?: 'false'))) === 'true');
    $allowBypass = (strtolower(trim((string)($_ENV['ALLOW_TURNSTILE_BYPASS'] ?? getenv('ALLOW_TURNSTILE_BYPASS') ?: 'false'))) === 'true');
    $secretKey = trim((string)($_ENV['TURNSTILE_SECRET_KEY'] ?? getenv('TURNSTILE_SECRET_KEY') ?: ''));

    if ($secretKey === '') {
        if ($allowBypass === true || ($appEnv === 'local' && $allowLocalBypass === true)) {
            return true;
        }
        error_log('[SECURITY CRITICAL] TURNSTILE_SECRET_KEY chưa được cấu hình trên môi trường ' . $appEnv . '. Chặn xác thực (fail-closed) để phòng chống bot.');
        return false;
    }

    $cleanToken = trim((string)$token);
    if ($cleanToken === '') {
        return false;
    }

    $url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    $remoteIp = function_exists('get_client_ip') ? get_client_ip() : ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');
    $postData = http_build_query([
        'secret'   => $secretKey,
        'response' => $cleanToken,
        'remoteip' => $remoteIp
    ]);
    try {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
        if (function_exists('curl_configure_ssl_tls')) {
            curl_configure_ssl_tls($ch);
        } else {
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
        }
        $res = curl_exec($ch);
        $err = curl_error($ch);
        curl_close($ch);
        if ($err || !$res) {
            error_log("[TURNSTILE VERIFY ERROR] " . $err);
            return false;
        }
        $data = json_decode($res, true);
        return !empty($data['success']);
    } catch (Throwable $e) {
        error_log("[TURNSTILE EXCEPTION] " . $e->getMessage());
        return false;
    }
}

function check_turnstile_health(): array {
    if (function_exists('loadEnv')) {
        loadEnv();
    }
    $appEnv = strtolower(trim((string)($_ENV['APP_ENV'] ?? getenv('APP_ENV') ?: 'production')));
    $allowLocalBypass = (strtolower(trim((string)($_ENV['ALLOW_LOCAL_TURNSTILE_BYPASS'] ?? getenv('ALLOW_LOCAL_TURNSTILE_BYPASS') ?: 'false'))) === 'true');
    $allowBypass = (strtolower(trim((string)($_ENV['ALLOW_TURNSTILE_BYPASS'] ?? getenv('ALLOW_TURNSTILE_BYPASS') ?: 'false'))) === 'true');
    $secretKey = trim((string)($_ENV['TURNSTILE_SECRET_KEY'] ?? getenv('TURNSTILE_SECRET_KEY') ?: ''));
    $siteKey = trim((string)($_ENV['TURNSTILE_SITE_KEY'] ?? getenv('TURNSTILE_SITE_KEY') ?: ''));

    $configured = ($secretKey !== '');
    $maskedSiteKey = '';
    if ($siteKey !== '') {
        $maskedSiteKey = substr($siteKey, 0, min(4, strlen($siteKey))) . '****';
    }

    $warning = null;
    if (!$configured) {
        if ($allowBypass || ($appEnv === 'local' && $allowLocalBypass)) {
            $warning = 'Thông báo: Đang bật cờ ALLOW_TURNSTILE_BYPASS (bỏ qua Turnstile do chưa cấu hình key).';
        } else {
            $warning = 'CẢNH BÁO BẢO MẬT: Chưa cấu hình TURNSTILE_SECRET_KEY trên môi trường ' . $appEnv . '. Hệ thống đang kích hoạt cơ chế Fail-Closed (chặn mọi request xác thực để phòng vệ bot). Vui lòng cấu hình khóa hợp lệ trong .env hoặc bật ALLOW_TURNSTILE_BYPASS=true.';
        }
    }

    return [
        'configured'         => $configured,
        'app_env'            => $appEnv,
        'site_key'           => $maskedSiteKey,
        'warning'            => $warning,
        'allow_local_bypass' => $allowLocalBypass
    ];
}

function award_booking_loyalty_points(?PDO $pdo, array $bookingRow): void {
    if (!$pdo) {
        return;
    }
    $userId    = (int)($bookingRow['user_id'] ?? 0);
    $bookingId = (int)($bookingRow['id'] ?? 0);
    $payStatus = (string)($bookingRow['payment_status'] ?? '');
    $paidAmount = (int)($bookingRow['paid_amount'] ?? 0);

    if ($userId <= 0 || $bookingId <= 0) {
        return;
    }
    $isPaidOrDeposited = ($paidAmount > 0) || in_array($payStatus, ['Đã cọc 30%', 'Đã cọc 50%', 'Đã thanh toán đủ', 'Đã thanh toán 100%'], true);
    if (!$isPaidOrDeposited) {
        return;
    }

    try {
        if (db_table_has_column($pdo, 'bookings', 'points_awarded')) {
            $upd = $pdo->prepare("UPDATE bookings SET points_awarded = 1 WHERE id = ? AND (points_awarded = 0 OR points_awarded IS NULL)");
            $upd->execute([$bookingId]);
            if ($upd->rowCount() <= 0) {
                return;
            }
        }
        if (db_table_has_column($pdo, 'users', 'points')) {
            $pdo->prepare("UPDATE users SET points = IFNULL(points, 0) + 100 WHERE id = ?")->execute([$userId]);
        }
    } catch (Throwable $e) {
        error_log("[AWARD POINTS WARN] " . $e->getMessage());
    }
}
