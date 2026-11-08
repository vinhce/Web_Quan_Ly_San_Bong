<?php
/**
 * SÂN BÓNG PRO - SEPAY WEBHOOK ENDPOINT (api/sepay_webhook.php)
 * Tiếp nhận thông báo biến động số dư tự động từ SePay qua Webhook
 */

require_once __DIR__ . '/security_helper.php';
require_once __DIR__ . '/sepay_helper.php';

$pdo = getDBConnection(false);

// 1. Đọc payload DUY NHẤT 1 LẦN
$rawPayload = file_get_contents('php://input');
$payload = json_decode($rawPayload, true);
if (!is_array($payload) || empty($payload)) {
    $payload = !empty($_POST) ? $_POST : [];
}

// 2. Trích xuất mã đặt sân dạng ASFF/ASFS/ASFExxxxxx, ASFxxxxxx, DHxxxxxx hoặc SB-YYYYMMDD-XXXX
$content = $payload['content'] ?? $payload['transaction_content'] ?? $payload['description'] ?? '';
$explicitCode = $payload['code'] ?? '';
$transferAmount = (int)($payload['transferAmount'] ?? $payload['amount_in'] ?? 0);
$referenceCode = $payload['referenceCode'] ?? $payload['reference_number'] ?? '';

$foundCode = '';
$searchTarget = $content . ' ' . $explicitCode;
if (!empty($explicitCode) && preg_match('/^[A-Z0-9\-]{4,20}$/i', $explicitCode)) {
    $foundCode = strtoupper($explicitCode);
} elseif (!empty(trim($searchTarget))) {
    if (preg_match('/(ASF[FSE][0-9]{4,10}|ASF[0-9]{4,10}|DH[0-9]{4,10}|SB-?[0-9]{8}-?[A-Z0-9]{4}|SB[0-9]{4,12})/i', $searchTarget, $matches)) {
        $foundCode = strtoupper($matches[1]);
    }
}

// 3. Thu thập headers & Xác thực Webhook Key hoặc đối chiếu trực tiếp SePay API v2 (H1 & M4)
$headers = function_exists('getallheaders') ? getallheaders() : [];
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] 
    ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] 
    ?? $headers['Authorization'] 
    ?? $headers['authorization'] 
    ?? '';

$maskedAuthHeader = !empty($authHeader) ? substr($authHeader, 0, 10) . '****' : '';

loadEnv();
$expectedKey = trim($_ENV['SEPAY_WEBHOOK_KEY'] ?? getenv('SEPAY_WEBHOOK_KEY') ?: '');
$providedKey = '';
if (preg_match('/^(?:Apikey|Bearer)\s+(.+)$/i', trim($authHeader), $authMatches)) {
    $providedKey = trim($authMatches[1]);
}

$isAuthorizedWebhook = (!empty($expectedKey) && !empty($providedKey) && hash_equals($expectedKey, $providedKey));

// Nếu SePay gọi Webhook ở chế độ "Không cần chứng thực" (thiếu header), đối chiếu chéo với máy chủ SePay qua SEPAY_API_TOKEN
if (!$isAuthorizedWebhook && !empty($foundCode) && $transferAmount > 0) {
    $sepayCheck = fetch_sepay_transactions(20);
    if (!empty($sepayCheck['success']) && !empty($sepayCheck['transactions'])) {
        $cleanFound = str_replace(['-', ' '], '', $foundCode);
        foreach ($sepayCheck['transactions'] as $tx) {
            $txContent = strtoupper($tx['transaction_content'] ?? $tx['content'] ?? '');
            $txClean = str_replace(['-', ' ', '.', ':'], '', $txContent);
            $txAmount = (int)($tx['amount_in'] ?? $tx['transferAmount'] ?? 0);
            if ((strpos($txContent, $foundCode) !== false || strpos($txClean, $cleanFound) !== false) && $txAmount === $transferAmount) {
                $isAuthorizedWebhook = true;
                break;
            }
        }
    }
}

if (!$isAuthorizedWebhook) {
    $unauthLog = [
        'time'        => date('Y-m-d H:i:s'),
        'status'      => 'UNAUTHORIZED',
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

// Ghi log chẩn đoán (đã che auth_header) vào thư mục logs bảo mật ngoài webroot
$logEntry = [
    'time'           => date('Y-m-d H:i:s'),
    'remote_ip'      => $_SERVER['REMOTE_ADDR'] ?? '',
    'user_agent'     => $_SERVER['HTTP_USER_AGENT'] ?? '',
    'auth_header'    => $maskedAuthHeader,
    'raw_payload'    => $rawPayload,
    'parsed_payload' => $payload
];
@file_put_contents(__DIR__ . '/../logs/webhook_debug.log', json_encode($logEntry, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n---\n", FILE_APPEND);

// 4. Đối chiếu số tiền cọc dự kiến của đơn (H2)
$expectedDeposit = !empty($foundCode) ? get_expected_deposit_amount($pdo, $foundCode) : 0;

if (empty($foundCode) || $expectedDeposit <= 0 || $transferAmount < $expectedDeposit) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(200);
    echo json_encode([
        'success' => false,
        'message' => 'Order not found or insufficient deposit amount',
        'code'    => $foundCode
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// 5. Lưu vào sổ cái giao dịch đã xác thực (sepay_paid_orders.json) khi đủ tiền cọc
$ledgerFile = __DIR__ . '/sepay_paid_orders.json';
$paidOrders = [];
if (file_exists($ledgerFile)) {
    $rawLedger = @file_get_contents($ledgerFile);
    $decoded = json_decode($rawLedger, true);
    if (is_array($decoded)) {
        $paidOrders = $decoded;
    }
}
$cleanKey = str_replace(['-', ' '], '', strtoupper($foundCode));
$paidOrders[$cleanKey] = [
    'code'           => $foundCode,
    'clean_code'     => $cleanKey,
    'amount'         => $transferAmount,
    'expected'       => $expectedDeposit,
    'reference_code' => $referenceCode,
    'content'        => $content,
    'paid_at'        => date('Y-m-d H:i:s')
];
@file_put_contents($ledgerFile, json_encode($paidOrders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

// 6. Nếu có CSDL, cập nhật trạng thái đơn sang 'Đã cọc 30%'
if ($pdo) {
    try {
        $stmt = $pdo->prepare("SELECT id, code, deposit_amount, payment_status FROM bookings WHERE code = ? OR REPLACE(code, '-', '') = ? LIMIT 1");
        $cleanFoundCode = str_replace('-', '', $foundCode);
        $stmt->execute([$foundCode, $cleanFoundCode]);
        $booking = $stmt->fetch();

        if ($booking && $transferAmount >= (int)$booking['deposit_amount']) {
            $updateStmt = $pdo->prepare("UPDATE bookings SET payment_status = 'Đã cọc 30%', payment_method = 'VietQR SePay (Webhook)' WHERE id = ?");
            $updateStmt->execute([$booking['id']]);
        }
    } catch (Exception $e) {
        error_log("[SEPAY WEBHOOK DB ERROR] " . $e->getMessage());
    }
}

error_log("[SEPAY WEBHOOK SUCCESS] Ghi nhận webhook: {$foundCode} | Tiền: {$transferAmount}đ");

// LUÔN TRẢ 200 OK cho SePay
header('Content-Type: application/json; charset=utf-8');
http_response_code(200);
echo json_encode([
    'success' => true,
    'message' => 'SePay Webhook received successfully',
    'code'    => $foundCode
], JSON_UNESCAPED_UNICODE);
exit;
