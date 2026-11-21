<?php

require_once __DIR__ . '/security_helper.php';
require_once __DIR__ . '/sepay_helper.php';
require_once __DIR__ . '/notification_helper.php';

$pdo = getDBConnection(false);

$rawPayload = file_get_contents('php://input');
$payload = json_decode($rawPayload, true);
if (!is_array($payload) || empty($payload)) {
    $payload = !empty($_POST) ? $_POST : [];
}

$content        = trim((string)($payload['content'] ?? $payload['transaction_content'] ?? $payload['description'] ?? ''));
$explicitCode   = trim((string)($payload['code'] ?? ''));
$transferAmount = (int)($payload['transferAmount'] ?? $payload['amount_in'] ?? 0);
$referenceCode  = trim((string)($payload['referenceCode'] ?? $payload['reference_number'] ?? ''));
$gateway        = sanitize_string((string)($payload['gateway'] ?? $payload['bank_brand_name'] ?? 'SePay'), 50) ?: 'SePay';
$transferType   = strtolower(trim((string)($payload['transferType'] ?? $payload['transfer_type'] ?? 'in')));

$foundCode = '';
$searchTarget = trim($content . ' ' . $explicitCode);
if ($searchTarget !== '' && preg_match('/(ASF[FSE][0-9]{4,10}|ASF[0-9]{4,10}|DH[0-9]{4,10}|SB-?[0-9]{8}-?[A-Z0-9]{4}|SB[0-9]{4,12})/i', $searchTarget, $matches)) {
    $foundCode = strtoupper($matches[1]);
} elseif ($explicitCode !== '' && preg_match('/^[A-Z0-9\-]{4,20}$/i', $explicitCode)) {
    $foundCode = strtoupper($explicitCode);
}

$headers = function_exists('getallheaders') ? getallheaders() : [];
$authHeader = $_SERVER['HTTP_AUTHORIZATION']
    ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
    ?? $headers['Authorization']
    ?? $headers['authorization']
    ?? '';

$maskedAuthHeader = !empty($authHeader) ? '[MASKED_AUTH_HEADER]' : '';

loadEnv();
$expectedKey   = trim($_ENV['SEPAY_WEBHOOK_KEY'] ?? getenv('SEPAY_WEBHOOK_KEY') ?: '');
$apiToken      = trim($_ENV['SEPAY_API_TOKEN'] ?? getenv('SEPAY_API_TOKEN') ?: '');
$webhookSecret = trim($_ENV['SEPAY_WEBHOOK_SECRET'] ?? getenv('SEPAY_WEBHOOK_SECRET') ?: '');

$sigHeader = $_SERVER['HTTP_X_SEPAY_SIGNATURE']
    ?? $_SERVER['HTTP_X_SIGNATURE']
    ?? $headers['X-Sepay-Signature']
    ?? $headers['x-sepay-signature']
    ?? $headers['X-Signature']
    ?? $headers['x-signature']
    ?? '';

$providedKey = '';
if (preg_match('/^(?:Apikey|Bearer)\s+(.+)$/i', trim($authHeader), $authMatches)) {
    $providedKey = trim($authMatches[1]);
} else {
    $providedKey = trim($authHeader);
}

$isAuthorizedWebhook = false;
$hmacFailed = false;

if ($webhookSecret !== '' && $sigHeader !== '') {
    $expectedSig = hash_hmac('sha256', (string)$rawPayload, $webhookSecret);
    $cleanSig = strtolower(preg_replace('/^sha256=/i', '', trim((string)$sigHeader)));
    if (hash_equals($expectedSig, $cleanSig)) {
        $isAuthorizedWebhook = true;
    } else {
        $hmacFailed = true;
    }
}

if (!$hmacFailed && !$isAuthorizedWebhook && !empty($providedKey)) {
    if (!empty($expectedKey) && hash_equals($expectedKey, $providedKey)) {
        $isAuthorizedWebhook = true;
    } elseif (!empty($apiToken) && hash_equals($apiToken, $providedKey)) {
        $isAuthorizedWebhook = true;
    }
}

$allowCrosscheck = (getenv('SEPAY_ALLOW_API_CROSSCHECK') === 'true' || ($_ENV['SEPAY_ALLOW_API_CROSSCHECK'] ?? '') === 'true');
$matchedRealTx = null;

if (!$hmacFailed && !$isAuthorizedWebhook && !empty($foundCode) && $transferAmount > 0 && $allowCrosscheck) {
    $sepayCheck = fetch_sepay_transactions(20);
    if (!empty($sepayCheck['success']) && !empty($sepayCheck['transactions'])) {
        $cleanFound = str_replace(['-', ' '], '', $foundCode);
        foreach ($sepayCheck['transactions'] as $tx) {
            $txContent = strtoupper($tx['transaction_content'] ?? $tx['content'] ?? '');
            $txClean = str_replace(['-', ' ', '.', ':'], '', $txContent);
            $txAmount = (int)($tx['amount_in'] ?? $tx['transferAmount'] ?? 0);
            if ((strpos($txContent, $foundCode) !== false || strpos($txClean, $cleanFound) !== false) && $txAmount === $transferAmount) {
                $isAuthorizedWebhook = true;
                $matchedRealTx = $tx;
                break;
            }
        }
    }
}

if ($hmacFailed || !$isAuthorizedWebhook) {
    $unauthLog = [
        'time'        => date('Y-m-d H:i:s'),
        'status'      => $hmacFailed ? 'HMAC_MISMATCH' : 'UNAUTHORIZED',
        'remote_ip'   => $_SERVER['REMOTE_ADDR'] ?? '',
        'user_agent'  => $_SERVER['HTTP_USER_AGENT'] ?? '',
        'auth_header' => $maskedAuthHeader
    ];
    @file_put_contents(__DIR__ . '/../logs/webhook_debug.log', json_encode($unauthLog, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n---\n", FILE_APPEND);
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(401);
    echo json_encode([
        'success'  => false,
        'message'  => 'Unauthorized webhook',
        'ref_code' => 'ERR_WEBHOOK_UNAUTHORIZED'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$appDebug = (strtolower(trim($_ENV['APP_DEBUG'] ?? getenv('APP_DEBUG') ?: '')) === 'true');
if ($appDebug) {
    $logEntry = [
        'time'           => date('Y-m-d H:i:s'),
        'remote_ip'      => $_SERVER['REMOTE_ADDR'] ?? '',
        'user_agent'     => $_SERVER['HTTP_USER_AGENT'] ?? '',
        'auth_header'    => $maskedAuthHeader,
        'raw_payload'    => $rawPayload,
        'parsed_payload' => $payload
    ];
    @file_put_contents(__DIR__ . '/../logs/webhook_debug.log', json_encode($logEntry, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n---\n", FILE_APPEND);
}

if ($transferType === 'out') {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'ignored' => true,
        'message' => 'Bỏ qua giao dịch tiền ra'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($transferAmount <= 0) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'ignored' => true,
        'message' => 'Số tiền giao dịch không hợp lệ (<= 0)'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$sepayTxId = trim((string)($payload['id'] ?? $payload['transaction_id'] ?? $payload['tx_id'] ?? ''));
if ($matchedRealTx) {
    $realTxId = trim((string)($matchedRealTx['id'] ?? $matchedRealTx['transaction_id'] ?? ''));
    if ($realTxId !== '') {
        $sepayTxId = $realTxId;
    }
    $realRef = trim((string)($matchedRealTx['reference_number'] ?? $matchedRealTx['referenceCode'] ?? ''));
    if ($realRef !== '') {
        $referenceCode = $realRef;
    }
}
$txDateRaw = trim((string)($payload['transactionDate'] ?? $payload['transaction_date'] ?? date('Y-m-d H:i:s')));
$txDateTs  = strtotime($txDateRaw);
$txDateDb  = $txDateTs ? date('Y-m-d H:i:s', $txDateTs) : date('Y-m-d H:i:s');
$txFingerprint = hash(
    'sha256',
    $sepayTxId !== ''
        ? "ID:{$sepayTxId}"
        : ($referenceCode !== ''
            ? "REF:{$referenceCode}|AMT:{$transferAmount}"
            : "AMT:{$transferAmount}|CNT:{$content}|DT:{$txDateDb}")
);

$recordPaidLedger = function (string $code, int $amount, int $expected, string $ref, string $cnt): void {
    $logDir = dirname(__DIR__) . '/logs';
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0750, true);
    }
    $ledgerFile = $logDir . '/sepay_paid_orders.json';
    $paidOrders = [];
    if (file_exists($ledgerFile)) {
        $rawLedger = @file_get_contents($ledgerFile);
        $decoded = json_decode($rawLedger, true);
        if (is_array($decoded)) {
            $paidOrders = $decoded;
        }
    }
    $cleanKey = str_replace(['-', ' '], '', strtoupper($code));
    $paidOrders[$cleanKey] = [
        'code'           => $code,
        'clean_code'     => $cleanKey,
        'amount'         => $amount,
        'expected'       => $expected,
        'reference_code' => $ref,
        'content'        => $cnt,
        'paid_at'        => date('Y-m-d H:i:s')
    ];
    @file_put_contents($ledgerFile, json_encode($paidOrders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
};

if (!$pdo) {
    $expectedDeposit = !empty($foundCode) ? get_expected_deposit_amount(null, $foundCode) : 0;
    if ($expectedDeposit <= 0) {
        $expectedDeposit = $transferAmount;
    }
    if (!empty($foundCode) && $transferAmount >= $expectedDeposit) {
        $recordPaidLedger($foundCode, $transferAmount, $expectedDeposit, $referenceCode, $content);
    }
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'SePay Webhook received successfully (fallback)',
        'code'    => $foundCode
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $pdo->beginTransaction();

    $refFingerprint = ($referenceCode !== '')
        ? hash('sha256', "REF:{$referenceCode}|AMT:{$transferAmount}")
        : '';
    $dupStmt = $pdo->prepare("
        SELECT id, match_status, matched_booking_code
        FROM bank_transactions
        WHERE (? != '' AND sepay_tx_id = ?)
           OR tx_fingerprint = ?
           OR (? != '' AND tx_fingerprint = ?)
           OR (? != '' AND reference_code = ? AND transfer_amount = ? AND matched_booking_code IS NOT NULL)
        LIMIT 1 FOR UPDATE
    ");
    $dupStmt->execute([$sepayTxId, $sepayTxId, $txFingerprint, $refFingerprint, $refFingerprint, $referenceCode, $referenceCode, $transferAmount]);
    $dupTx = $dupStmt->fetch();

    if ($dupTx) {
        $pdo->commit();
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(200);
        echo json_encode([
            'success'    => true,
            'idempotent' => true,
            'duplicate'  => true,
            'tx_id'      => (int)$dupTx['id'],
            'message'    => 'Giao dịch đã được ghi nhận trước đó (idempotent).'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $booking = null;
    if ($foundCode !== '') {
        $cleanFoundCode = str_replace(['-', ' '], '', $foundCode);
        $bStmt = $pdo->prepare("SELECT * FROM bookings WHERE code = ? OR REPLACE(code, '-', '') = ? LIMIT 1 FOR UPDATE");
        $bStmt->execute([$foundCode, $cleanFoundCode]);
        $booking = $bStmt->fetch() ?: null;
    }

    $matchStatus    = 'unmatched';
    $matchedCode    = null;
    $expectedAmount = 0;
    $discrepancy    = $transferAmount;
    $mismatchReason = null;
    $resolvedAt     = null;
    $auditAction    = 'WEBHOOK_UNMATCHED';
    $oldAuditVal    = null;
    $newAuditVal    = '';

    if (!$booking) {
        $mismatchReason = 'Sai nội dung chuyển khoản hoặc không tìm thấy mã đơn trong hệ thống';
        $newAuditVal = "Nhận " . number_format($transferAmount) . "đ chưa khớp đơn (ND: " . sanitize_string($content, 120) . ")";
    } else {
        $bCode      = (string)$booking['code'];
        $bStatus    = (string)($booking['status'] ?? '');
        $pStatus    = (string)($booking['payment_status'] ?? '');
        $totalPrice = max(0, (int)($booking['total_price'] ?? 0));
        $targetDep  = max(0, (int)($booking['deposit_amount'] ?? 0));
        $alreadyPaid = max(0, (int)($booking['paid_amount'] ?? 0));
        $oldAuditVal = "{$bStatus} ({$pStatus}) | Đã trả: " . number_format($alreadyPaid) . "đ";

        $isCancelledOrClosed = (
            $bStatus === 'Đã hủy' ||
            $bStatus === 'Khách chưa đến' ||
            in_array($pStatus, ['Đã hủy', 'Đã hoàn cọc 100%', 'Tịch thu cọc 30%', 'Phạt 50% cọc', 'Bảo lưu cọc 30%'], true)
        );

        $isExpiredHold = !empty($booking['expires_at'])
            && strtotime((string)$booking['expires_at']) <= time()
            && in_array($pStatus, ['Chờ duyệt cọc', 'Chờ cọc 30%'], true)
            && in_array($bStatus, ['Chờ duyệt cọc', 'Giữ chỗ', 'Đã xác nhận'], true)
            && $alreadyPaid <= 0;

        if ($isCancelledOrClosed || $isExpiredHold) {
            $matchStatus    = 'unmatched';
            $matchedCode    = null;
            $expectedAmount = 0;
            $discrepancy    = $transferAmount;
            $mismatchReason = $isExpiredHold
                ? 'Đơn đã hết hạn giữ chỗ — cần Admin kiểm tra đối soát/hoàn tiền'
                : 'Khách chuyển khoản cho đơn đã bị hủy/quá hạn — cần đối soát hoàn tiền';
            $auditAction    = 'WEBHOOK_UNMATCHED';
            $newAuditVal    = "Nhận " . number_format($transferAmount) . ($isExpiredHold ? "đ cho đơn hết hạn giữ chỗ #{$bCode}" : "đ cho đơn đã hủy/quá hạn #{$bCode}");
        } elseif (!in_array($pStatus, ['Đã cọc 30%', 'Đã cọc 60%', 'Đã cọc', 'Đã thanh toán đủ', 'Đã thanh toán 100%'], true) && stripos($pStatus, 'Đã cọc') === false) {
            $expectedAmount  = $targetDep;
            $remainingNeeded = max(0, $targetDep - $alreadyPaid);
            $newTotalPaid    = $alreadyPaid + $transferAmount;

            if ($newTotalPaid < $targetDep) {
                $updB = $pdo->prepare("UPDATE bookings SET paid_amount = ?, remaining_amount = GREATEST(0, total_price - ?) WHERE id = ?");
                $updB->execute([$newTotalPaid, $newTotalPaid, (int)$booking['id']]);

                $matchStatus    = 'underpaid';
                $matchedCode    = $bCode;
                $discrepancy    = $transferAmount - $remainingNeeded;
                $mismatchReason = "Chuyển thiếu tiền cọc (Nhận " . number_format($newTotalPaid) . "đ / Cần " . number_format($targetDep) . "đ)";
                $auditAction    = 'WEBHOOK_UNDERPAID';
                $newAuditVal    = $mismatchReason;
            } elseif ($newTotalPaid === $targetDep) {
                $isMonthlyBooking = (!empty($booking['weeks_count']) && (int)$booking['weeks_count'] > 1) || (!empty($booking['booking_mode']) && $booking['booking_mode'] === 'monthly');
                $depLabel     = $isMonthlyBooking ? 'Đã cọc 60%' : 'Đã cọc 30%';
                $newPayStatus = ($totalPrice > 0 && $newTotalPaid >= $totalPrice) ? 'Đã thanh toán đủ' : $depLabel;
                $newStatus    = in_array($bStatus, ['Chờ duyệt cọc', 'Giữ chỗ'], true) ? 'Đã xác nhận' : $bStatus;
                $updB = $pdo->prepare("UPDATE bookings SET status = ?, payment_status = ?, payment_method = 'VietQR SePay (Webhook)', paid_amount = ?, remaining_amount = GREATEST(0, total_price - ?) WHERE id = ?");
                $updB->execute([$newStatus, $newPayStatus, $newTotalPaid, $newTotalPaid, (int)$booking['id']]);

                $matchStatus    = 'matched';
                $matchedCode    = $bCode;
                $discrepancy    = 0;
                $mismatchReason = null;
                $resolvedAt     = date('Y-m-d H:i:s');
                $auditAction    = 'WEBHOOK_MATCH';
                $newAuditVal    = "Khớp đủ cọc " . number_format($newTotalPaid) . "đ ({$newPayStatus})";
                $recordPaidLedger($bCode, $newTotalPaid, $targetDep, $referenceCode, $content);
                award_booking_loyalty_points($pdo, $booking);
            } else {
                $isMonthlyBooking = (!empty($booking['weeks_count']) && (int)$booking['weeks_count'] > 1) || (!empty($booking['booking_mode']) && $booking['booking_mode'] === 'monthly');
                $depLabel     = $isMonthlyBooking ? 'Đã cọc 60%' : 'Đã cọc 30%';
                $newPayStatus = ($totalPrice > 0 && $newTotalPaid >= $totalPrice) ? 'Đã thanh toán đủ' : $depLabel;
                $newRem       = ($totalPrice > 0 && $newTotalPaid >= $totalPrice) ? 0 : max(0, $totalPrice - $newTotalPaid);
                $updB = $pdo->prepare("UPDATE bookings SET status = IF(status IN ('Đang đá', 'completed', 'Hoàn thành'), status, 'Đã xác nhận'), payment_status = ?, payment_method = 'VietQR SePay (Webhook)', paid_amount = ?, remaining_amount = ? WHERE id = ?");
                $updB->execute([$newPayStatus, $newTotalPaid, $newRem, (int)$booking['id']]);

                $matchStatus    = 'overpaid';
                $matchedCode    = $bCode;
                $discrepancy    = $newTotalPaid - $targetDep;
                $mismatchReason = "Chuyển thừa " . number_format($newTotalPaid - $targetDep) . "đ so với tiền cọc quy định";
                $auditAction    = 'WEBHOOK_OVERPAID';
                $newAuditVal    = "Nhận " . number_format($newTotalPaid) . "đ ({$newPayStatus}) - {$mismatchReason}";
                $recordPaidLedger($bCode, $newTotalPaid, $targetDep, $referenceCode, $content);
                award_booking_loyalty_points($pdo, $booking);
            }
        } elseif ($pStatus === 'Đã cọc 30%' || $pStatus === 'Đã cọc 60%' || stripos($pStatus, 'Đã cọc') !== false) {
            $paidBase     = max($alreadyPaid, $targetDep);
            $expectedRem  = max(0, (int)($booking['remaining_amount'] ?? max(0, $totalPrice - $paidBase)));
            $newTotalPaid = $paidBase + $transferAmount;
            $expectedAmount = $expectedRem;

            if ($expectedRem > 0 && $transferAmount === $expectedRem) {
                $updB = $pdo->prepare("UPDATE bookings SET status = IF(status IN ('Chờ duyệt cọc', 'Giữ chỗ'), 'Đã xác nhận', status), payment_status = 'Đã thanh toán 100%', payment_method = 'VietQR SePay (Webhook)', paid_amount = ?, remaining_amount = 0 WHERE id = ?");
                $updB->execute([$newTotalPaid, (int)$booking['id']]);

                $matchStatus    = 'matched';
                $matchedCode    = $bCode;
                $discrepancy    = 0;
                $mismatchReason = null;
                $resolvedAt     = date('Y-m-d H:i:s');
                $auditAction    = 'WEBHOOK_MATCH';
                $newAuditVal    = "Khớp đủ phần còn lại " . number_format($transferAmount) . "đ (Đã thanh toán 100%)";
                award_booking_loyalty_points($pdo, $booking);
            } elseif ($expectedRem > 0 && $transferAmount < $expectedRem) {
                $updB = $pdo->prepare("UPDATE bookings SET paid_amount = ?, remaining_amount = GREATEST(0, total_price - ?) WHERE id = ?");
                $updB->execute([$newTotalPaid, $newTotalPaid, (int)$booking['id']]);

                $matchStatus    = 'underpaid';
                $matchedCode    = $bCode;
                $discrepancy    = $transferAmount - $expectedRem;
                $mismatchReason = "Chuyển thiếu phần tiền còn lại (Nhận " . number_format($transferAmount) . "đ / Cần " . number_format($expectedRem) . "đ)";
                $auditAction    = 'WEBHOOK_UNDERPAID';
                $newAuditVal    = $mismatchReason;
            } elseif ($expectedRem === 0) {
                $updB = $pdo->prepare("UPDATE bookings SET paid_amount = ? WHERE id = ?");
                $updB->execute([$newTotalPaid, (int)$booking['id']]);

                $matchStatus    = 'overpaid';
                $matchedCode    = $bCode;
                $discrepancy    = $transferAmount;
                $mismatchReason = 'Đơn đã thu đủ trước đó, phát sinh tiền thừa (' . number_format($transferAmount) . 'đ)';
                $auditAction    = 'WEBHOOK_OVERPAID';
                $newAuditVal    = $mismatchReason;
            } else {
                $updB = $pdo->prepare("UPDATE bookings SET payment_status = 'Đã thanh toán 100%', payment_method = 'VietQR SePay (Webhook)', paid_amount = ?, remaining_amount = 0 WHERE id = ?");
                $updB->execute([$newTotalPaid, (int)$booking['id']]);
                award_booking_loyalty_points($pdo, $booking);

                $matchStatus    = 'overpaid';
                $matchedCode    = $bCode;
                $discrepancy    = $transferAmount - $expectedRem;
                $mismatchReason = "Chuyển thừa " . number_format($transferAmount - $expectedRem) . "đ so với phần còn lại";
                $auditAction    = 'WEBHOOK_OVERPAID';
                $newAuditVal    = $mismatchReason;
            }
        } else {
            $paidBase = max($alreadyPaid, $totalPrice);
            $newTotalPaid = $paidBase + $transferAmount;
            $updB = $pdo->prepare("UPDATE bookings SET paid_amount = ? WHERE id = ?");
            $updB->execute([$newTotalPaid, (int)$booking['id']]);

            $matchStatus    = 'overpaid';
            $matchedCode    = $bCode;
            $expectedAmount = 0;
            $discrepancy    = $transferAmount;
            $mismatchReason = 'Đơn đã thu đủ trước đó, phát sinh tiền thừa (' . number_format($transferAmount) . 'đ)';
            $auditAction    = 'WEBHOOK_OVERPAID';
            $newAuditVal    = $mismatchReason;
        }
    }

    $insTx = $pdo->prepare("INSERT INTO bank_transactions (sepay_tx_id, tx_fingerprint, gateway, reference_code, transaction_content, detected_booking_code, matched_booking_code, transfer_amount, expected_amount, discrepancy_amount, match_status, mismatch_reason, raw_payload, transaction_date, resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $insTx->execute([
        $sepayTxId !== '' ? substr($sepayTxId, 0, 80) : null,
        $txFingerprint,
        $gateway,
        $referenceCode !== '' ? substr($referenceCode, 0, 100) : null,
        $content !== '' ? $content : ($explicitCode !== '' ? $explicitCode : '[Không có nội dung CK]'),
        $foundCode !== '' ? $foundCode : null,
        $matchedCode,
        $transferAmount,
        $expectedAmount,
        $discrepancy,
        $matchStatus,
        $mismatchReason,
        $rawPayload !== '' ? $rawPayload : json_encode($payload, JSON_UNESCAPED_UNICODE),
        $txDateDb,
        $resolvedAt
    ]);
    $txRowId = (int)$pdo->lastInsertId();

    $pdo->commit();

    write_audit_log(
        $pdo,
        $auditAction,
        $matchedCode ?? ($foundCode !== '' ? $foundCode : null),
        $oldAuditVal,
        $newAuditVal,
        ['id' => null, 'full_name' => 'SePay Webhook', 'role' => 'system']
    );

    // Gửi Telegram & Thông báo khách khi biến động số dư VietQR
    $escCode = tg_escape($matchedCode ?? '');
    $escContent = tg_escape($content);
    $escReason = tg_escape($mismatchReason ?: $content);
    $escStatus = tg_escape($matchStatus);
    if ($matchStatus === 'matched') {
        $tgMsg = "💰 <b>TIỀN VỀ TÀI KHOẢN (VIETQR KHỚP ĐƠN)</b>\n"
               . "• Đơn: <code>{$escCode}</code>\n"
               . "• Số tiền: <b>+" . number_format($transferAmount) . " đ</b>\n"
               . "• Nội dung: <i>{$escContent}</i>\n"
               . "• Trạng thái: <b>{$escStatus}</b>";
        send_telegram_notification($tgMsg, 'new_booking', $pdo);

        if ($booking) {
            send_customer_notification($pdo, 'booking_confirm', [
                'booking_id'       => (int)$booking['id'],
                'booking_code'     => $matchedCode,
                'code'             => $matchedCode,
                'customer_name'    => (string)($booking['customer_name'] ?? ''),
                'phone'            => (string)($booking['phone'] ?? ''),
                'pitch_name'       => (string)($booking['pitch_id'] ?? ''),
                'date'             => date('d/m/Y', strtotime((string)($booking['booking_date'] ?? date('Y-m-d')))),
                'slot_time'        => (string)($booking['slot_time'] ?? ''),
                'total_price'      => (int)($booking['total_price'] ?? 0),
                'deposit_amount'   => (int)($booking['deposit_amount'] ?? 0),
                'remaining_amount' => (int)($booking['remaining_amount'] ?? 0)
            ]);
        }
    } elseif ($matchStatus === 'overpaid') {
        $tgMsg = "⚠️ <b>VIETQR CHUYỂN THỪA TIỀN</b>\n"
               . "• Đơn: <code>{$escCode}</code>\n"
               . "• Số tiền: <b>+" . number_format($transferAmount) . " đ</b>\n"
               . "• Ghi chú: <i>" . $escReason . "</i>";
        send_telegram_notification($tgMsg, 'unmatched_tx', $pdo);
    } elseif ($matchStatus === 'underpaid') {
        $tgMsg = "⚠️ <b>VIETQR CHUYỂN THIẾU TIỀN</b>\n"
               . "• Đơn: <code>{$escCode}</code>\n"
               . "• Đã nhận: <b>+" . number_format($transferAmount) . " đ</b> (Còn thiếu: " . number_format(abs($discrepancy)) . " đ)\n"
               . "• Nội dung: <i>{$escContent}</i>";
        send_telegram_notification($tgMsg, 'unmatched_tx', $pdo);
    } else {
        $tgMsg = "🚨 <b>GIAO DỊCH VIETQR CHƯA KHỚP ĐƠN</b>\n"
               . "• Số tiền: <b>+" . number_format($transferAmount) . " đ</b>\n"
               . "• Nội dung CK: <i>{$escContent}</i>\n"
               . "• Lý do: <i>" . tg_escape($mismatchReason ?: 'Không xác định') . "</i>";
        send_telegram_notification($tgMsg, 'unmatched_tx', $pdo);
    }

    error_log("[SEPAY WEBHOOK] status={$matchStatus} | code={$foundCode} | amount={$transferAmount}");

    header('Content-Type: application/json; charset=utf-8');
    http_response_code(200);
    echo json_encode([
        'success'            => true,
        'tx_id'              => $txRowId,
        'match_status'       => $matchStatus,
        'code'               => $foundCode,
        'matched_code'       => $matchedCode,
        'transfer_amount'    => $transferAmount,
        'expected_amount'    => $expectedAmount,
        'discrepancy_amount' => $discrepancy,
        'mismatch_reason'    => $mismatchReason,
        'message'            => 'SePay Webhook processed successfully'
    ], JSON_UNESCAPED_UNICODE);
    exit;
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("[SEPAY WEBHOOK DB ERROR] " . $e->getMessage());
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode([
        'success'  => false,
        'message'  => 'Lỗi xử lý webhook đối soát giao dịch.',
        'ref_code' => 'ERR_WEBHOOK_DB'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
