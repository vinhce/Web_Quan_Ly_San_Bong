<?php
/**
 * SÂN BÓNG PRO - API KIỂM TRA TRẠNG THÁI THANH TOÁN THỜI GIAN THỰC (api/check_payment.php)
 * Frontend tự động thăm dò (polling) để cập nhật ngay khi SePay ghi nhận tiền vào tài khoản
 */

require_once __DIR__ . '/sepay_helper.php';

secure_session_start();
$pdo = getDBConnection(false);

$code = sanitize_string($_GET['code'] ?? '', 40);

if (empty($code)) {
    json_response([
        'success'  => false,
        'message'  => 'Mã đơn không hợp lệ.',
        'ref_code' => 'ERR_INVALID_CODE'
    ], 400);
}

try {
    $booking = null;
    if ($pdo) {
        $stmt = $pdo->prepare("SELECT id, code, deposit_amount, total_price, payment_status FROM bookings WHERE code = ? OR REPLACE(code, '-', '') = ? LIMIT 1");
        $cleanCode = str_replace('-', '', strtoupper($code));
        $stmt->execute([$code, $cleanCode]);
        $booking = $stmt->fetch();

        if ($booking && in_array($booking['payment_status'], ['Đã cọc 30%', 'Đã thanh toán đủ'], true)) {
            json_response([
                'success'        => true,
                'paid'           => true,
                'code'           => $code,
                'payment_status' => $booking['payment_status'],
                'message'        => 'Đơn đã được xác nhận thanh toán'
            ]);
        }
    }

    $expectedAmount = $booking ? (int)$booking['deposit_amount'] : get_expected_deposit_amount($pdo, $code);

    if ($expectedAmount <= 0) {
        json_response([
            'success' => true,
            'paid'    => false,
            'code'    => $code,
            'message' => 'Order not initialized'
        ]);
    }

    $result = verify_sepay_payment($code, $expectedAmount);
    $receivedAmount = (int)($result['transaction']['amount'] ?? 0);

    if (!empty($result['paid']) && $receivedAmount >= $expectedAmount) {
        if ($pdo && $booking) {
            $updateStmt = $pdo->prepare("UPDATE bookings SET payment_status = 'Đã cọc 30%', payment_method = 'VietQR SePay (Tự động)' WHERE id = ?");
            $updateStmt->execute([$booking['id']]);
        }
        $result['code'] = $code;
        json_response($result);
    }

    json_response([
        'success'        => true,
        'paid'           => false,
        'code'           => $code,
        'payment_status' => $booking['payment_status'] ?? 'Chờ thanh toán',
        'message'        => $result['message'] ?? 'Chưa nhận được giao dịch chuyển khoản'
    ]);
} catch (Exception $e) {
    error_log("[CHECK PAYMENT ERROR] " . $e->getMessage());
    json_response([
        'success'  => false,
        'message'  => 'Lỗi kiểm tra trạng thái thanh toán.',
        'ref_code' => 'ERR_CHECK_PAYMENT'
    ], 500);
}
