<?php

require_once __DIR__ . '/security_helper.php';
require_once __DIR__ . '/notification_helper.php';

function get_sepay_config() {
    loadEnv();
    $env = strtolower(trim((string)(getenv('SEPAY_ENV') ?: 'sandbox')));
    $defaultBaseUrl = in_array($env, ['production', 'prod', 'live'], true)
        ? 'https://userapi.sepay.vn'
        : 'https://userapi-sandbox.sepay.vn';
    $baseUrl = trim((string)(getenv('SEPAY_BASE_URL') ?: ''));
    return [
        'env'           => $env,
        'api_token'     => getenv('SEPAY_API_TOKEN') ?: '',
        'base_url'      => $baseUrl !== '' ? $baseUrl : $defaultBaseUrl,
        'bank_code'     => getenv('SEPAY_BANK_CODE') ?: 'MB',
        'account_number'=> getenv('SEPAY_ACCOUNT_NUMBER') ?: '0352313548',
        'account_name'  => getenv('SEPAY_ACCOUNT_NAME') ?: 'NGUYEN QUANG VINH'
    ];
}

function generate_sepay_qr_url($amount, $orderCode) {
    $cfg = get_sepay_config();
    $bank = urlencode($cfg['bank_code']);
    $acc = urlencode($cfg['account_number']);
    $amt = (int)$amount;
    $des = urlencode($orderCode);

    return "https://qr.sepay.vn/img?bank={$bank}&acc={$acc}&template=compact&amount={$amt}&des={$des}";
}

function fetch_sepay_transactions($limit = 20) {
    $cfg = get_sepay_config();
    $token = $cfg['api_token'];
    if (empty($token)) {
        return ['success' => false, 'message' => 'Chưa cấu hình SePay API Token'];
    }

    $url = rtrim($cfg['base_url'], '/') . "/v2/transactions?limit=" . (int)$limit;

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $token,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 3);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);
    curl_configure_ssl_tls($ch);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    if ($err) {
        error_log("[SEPAY API CURL ERROR] " . $err);
        return ['success' => false, 'message' => 'Lỗi kết nối tới SePay: ' . $err];
    }

    $data = json_decode($response, true);
    if ($httpCode === 200 && isset($data['data'])) {
        return ['success' => true, 'transactions' => $data['data']];
    }

    return [
        'success'   => false,
        'http_code' => $httpCode,
        'message'   => $data['message'] ?? 'Lỗi không xác định từ SePay'
    ];
}

function get_expected_deposit_amount($pdo, $bookingCode) {
    $cleanCode = str_replace(['-', ' '], '', strtoupper($bookingCode));

    if ($pdo) {
        try {
            $stmt = $pdo->prepare("SELECT deposit_amount FROM bookings WHERE code = ? OR REPLACE(code, '-', '') = ? LIMIT 1");
            $stmt->execute([$bookingCode, $cleanCode]);
            $row = $stmt->fetch();
            if ($row && isset($row['deposit_amount']) && (int)$row['deposit_amount'] > 0) {
                return (int)$row['deposit_amount'];
            }
        } catch (Exception $e) {
            error_log("[GET EXPECTED DEPOSIT DB ERROR] " . $e->getMessage());
        }
    }

    $expectedFile = __DIR__ . '/../logs/expected_orders.json';
    if (file_exists($expectedFile)) {
        $orders = json_decode(@file_get_contents($expectedFile), true);
        if (is_array($orders) && isset($orders[$cleanCode])) {
            return (int)($orders[$cleanCode]['deposit_amount'] ?? 0);
        }
    }

    return 0;
}

function verify_sepay_payment($bookingCode, $expectedAmount = 0) {
    $expectedAmount = (int)$expectedAmount;
    if ($expectedAmount <= 0) {
        return [
            'success'        => false,
            'paid'           => false,
            'payment_status' => 'Chờ thanh toán',
            'message'        => 'Số tiền cọc kỳ vọng không hợp lệ hoặc không xác định được'
        ];
    }
    $cleanCode = str_replace(['-', ' '], '', strtoupper($bookingCode));

    $ledgerFile = file_exists(__DIR__ . '/../logs/sepay_paid_orders.json')
        ? __DIR__ . '/../logs/sepay_paid_orders.json'
        : __DIR__ . '/sepay_paid_orders.json';
    if (file_exists($ledgerFile)) {
        $paidOrders = json_decode(@file_get_contents($ledgerFile), true);
        if (is_array($paidOrders) && isset($paidOrders[$cleanCode])) {
            $entry = $paidOrders[$cleanCode];
            $entryAmt = (int)($entry['amount'] ?? 0);
            if ($entryAmt > 0 && $entryAmt >= $expectedAmount) {
                return [
                    'success'        => true,
                    'paid'           => true,
                    'payment_status' => 'Đã cọc 30%',
                    'transaction'    => $entry,
                    'message'        => 'Đã xác nhận giao dịch SePay qua Webhook thành công!'
                ];
            }
        }
    }

    $result = fetch_sepay_transactions(30);
    if (!empty($result['success']) && !empty($result['transactions'])) {
        foreach ($result['transactions'] as $tx) {
            $content = strtoupper($tx['transaction_content'] ?? $tx['content'] ?? '');
            $cleanContent = str_replace(['-', ' ', '.', ':'], '', $content);
            $amountIn = (int)($tx['amount_in'] ?? $tx['transferAmount'] ?? 0);

            $isMatch = preg_match('/(?:^|[^A-Z0-9])' . preg_quote(strtoupper((string)$bookingCode), '/') . '(?:$|[^A-Z0-9])/i', $content)
                || preg_match('/(?:^|[^A-Z0-9])' . preg_quote($cleanCode, '/') . '(?:$|[^A-Z0-9])/i', $cleanContent);
            if ($isMatch && $amountIn >= $expectedAmount) {
                return [
                    'success'        => true,
                    'paid'           => true,
                    'payment_status' => 'Đã cọc 30%',
                    'transaction'    => [
                        'amount'    => $amountIn,
                        'reference' => $tx['reference_number'] ?? $tx['referenceCode'] ?? '',
                        'content'   => $content,
                        'date'      => $tx['transaction_date'] ?? $tx['transactionDate'] ?? date('Y-m-d H:i:s')
                    ],
                    'message'        => 'Đã xác nhận giao dịch SePay thành công!'
                ];
            }
        }
    }

    return [
        'success'        => true,
        'paid'           => false,
        'payment_status' => 'Chờ thanh toán',
        'message'        => 'Chưa nhận được giao dịch chuyển khoản'
    ];
}

function verify_sepay_payment_for_booking($pdo, $bookingCode, $expectedAmount = 0) {
    if ($expectedAmount <= 0) {
        $expectedAmount = get_expected_deposit_amount($pdo, $bookingCode);
    }
    if ($expectedAmount <= 0) {
        return [
            'success'        => false,
            'paid'           => false,
            'payment_status' => 'Chờ thanh toán',
            'message'        => 'Số tiền cọc kỳ vọng không hợp lệ hoặc không xác định được'
        ];
    }
    $result = verify_sepay_payment($bookingCode, $expectedAmount);
    if (!empty($result['paid']) && $pdo) {
        try {
            $pdo->beginTransaction();
            $bStmt = $pdo->prepare("SELECT * FROM bookings WHERE code = ? FOR UPDATE");
            $bStmt->execute([$bookingCode]);
            $bRow = $bStmt->fetch();
            if ($bRow && $bRow['payment_status'] === 'Chờ duyệt cọc') {
                $depAmt = max(0, (int)($bRow['deposit_amount'] ?? 0));
                $paidAmt = max((int)($bRow['paid_amount'] ?? 0), $depAmt);
                $remAmt = max(0, (int)($bRow['total_price'] ?? 0) - $paidAmt);
                $updateStmt = $pdo->prepare("UPDATE bookings SET status = 'Đã xác nhận', payment_status = 'Đã cọc 30%', payment_method = 'VietQR SePay (Tự động)', paid_amount = ?, transfer_paid_amount = GREATEST(transfer_paid_amount, ?), remaining_amount = ? WHERE id = ?");
                $updateStmt->execute([$paidAmt, $paidAmt, $remAmt, (int)$bRow['id']]);
                award_booking_loyalty_points($pdo, $bRow);
            }
            $pdo->commit();
        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log("[SEPAY UPDATE BOOKING ERROR] " . $e->getMessage());
        }
    }
    return $result;
}
