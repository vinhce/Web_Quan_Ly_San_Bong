<?php

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
        $stmt = $pdo->prepare("SELECT id, code, deposit_amount, paid_amount, total_price, status, payment_status, expires_at FROM bookings WHERE code = ? OR REPLACE(code, '-', '') = ? LIMIT 1");
        $cleanCode = str_replace('-', '', strtoupper($code));
        $stmt->execute([$code, $cleanCode]);
        $booking = $stmt->fetch();

        if ($booking) {
            $depositAmt = max(0, (int)($booking['deposit_amount'] ?? 0));
            $paidAmt    = max(0, (int)($booking['paid_amount'] ?? 0));
            $payStatus  = (string)($booking['payment_status'] ?? '');
            $bStatus    = (string)($booking['status'] ?? '');

            $isCancelledOrExpiredStatus = (
                $bStatus === 'Đã hủy' ||
                $bStatus === 'Khách chưa đến' ||
                in_array($payStatus, ['Đã hủy', 'Đã hoàn cọc 100%', 'Tịch thu cọc 30%', 'Phạt 50% cọc', 'Bảo lưu cọc 30%'], true)
            );
            $isPastHold = (
                !empty($booking['expires_at']) &&
                strtotime((string)$booking['expires_at']) <= time() &&
                $paidAmt < $depositAmt &&
                !in_array($payStatus, ['Đã cọc 30%', 'Đã thanh toán đủ', 'Đã thanh toán 100%'], true)
            );

            if ($isCancelledOrExpiredStatus || $isPastHold) {
                json_response([
                    'success'        => true,
                    'paid'           => false,
                    'expired'        => true,
                    'code'           => $booking['code'],
                    'payment_status' => $payStatus,
                    'paidAmount'     => $paidAmt,
                    'expectedAmount' => $depositAmt,
                    'message'        => 'Đơn đặt sân đã quá hạn giữ chỗ hoặc đã bị hủy.'
                ]);
            }

            $isPaidByStatus = in_array($payStatus, ['Đã cọc 30%', 'Đã thanh toán đủ', 'Đã thanh toán 100%'], true);
            $isPaidByAmount = ($depositAmt > 0 && $paidAmt >= $depositAmt);
            if ($isPaidByStatus || $isPaidByAmount) {
                json_response([
                    'success'        => true,
                    'paid'           => true,
                    'code'           => $booking['code'],
                    'payment_status' => $payStatus,
                    'paidAmount'     => max($paidAmt, $depositAmt),
                    'expectedAmount' => $depositAmt,
                    'message'        => 'Đơn đã được xác nhận thanh toán'
                ]);
            }
        }
    }

    $expectedAmount = $booking ? (int)$booking['deposit_amount'] : get_expected_deposit_amount($pdo, $code);

    $result = verify_sepay_payment($code, $expectedAmount);
    $receivedAmount = (int)($result['transaction']['amount'] ?? 0);

    if (!empty($result['paid']) && ($expectedAmount <= 0 || $receivedAmount >= $expectedAmount)) {
        $newPaid = $booking ? max((int)($booking['paid_amount'] ?? 0), $receivedAmount > 0 ? $receivedAmount : $expectedAmount) : $receivedAmount;
        if ($pdo && $booking) {
            $newPayStatus = ((int)$booking['total_price'] > 0 && $newPaid >= (int)$booking['total_price']) ? 'Đã thanh toán đủ' : 'Đã cọc 30%';
            $updateStmt = $pdo->prepare("UPDATE bookings SET status = IF(status='Chờ duyệt cọc', 'Đã xác nhận', status), payment_status = ?, payment_method = 'VietQR SePay (Tự động)', paid_amount = ?, remaining_amount = GREATEST(0, total_price - ?) WHERE id = ?");
            $updateStmt->execute([$newPayStatus, $newPaid, $newPaid, $booking['id']]);
            $result['payment_status'] = $newPayStatus;
        }
        $result['code'] = $booking['code'] ?? $code;
        $result['paidAmount'] = $newPaid;
        $result['expectedAmount'] = $expectedAmount;
        json_response($result);
    }

    $currentPaid = $booking ? max(0, (int)($booking['paid_amount'] ?? 0)) : 0;
    $isUnderpaid = ($currentPaid > 0 && $expectedAmount > 0 && $currentPaid < $expectedAmount);
    $defaultMsg = $isUnderpaid
        ? ('Chuyển thiếu tiền cọc: đã nhận ' . number_format($currentPaid) . 'đ / ' . number_format($expectedAmount) . 'đ')
        : ($result['message'] ?? 'Chưa nhận được giao dịch chuyển khoản');

    json_response([
        'success'        => true,
        'paid'           => false,
        'underpaid'      => $isUnderpaid,
        'code'           => $booking['code'] ?? $code,
        'payment_status' => $booking['payment_status'] ?? 'Chờ thanh toán',
        'paidAmount'     => $currentPaid,
        'expectedAmount' => $expectedAmount,
        'message'        => $defaultMsg
    ]);
} catch (Exception $e) {
    error_log("[CHECK PAYMENT ERROR] " . $e->getMessage());
    json_response([
        'success'  => false,
        'message'  => 'Lỗi kiểm tra trạng thái thanh toán.',
        'ref_code' => 'ERR_CHECK_PAYMENT'
    ], 500);
}
