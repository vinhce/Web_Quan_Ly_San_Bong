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
        $stmt = $pdo->prepare("SELECT id, user_id, code, deposit_amount, paid_amount, total_price, status, payment_status, expires_at FROM bookings WHERE code = ? OR REPLACE(code, '-', '') = ? LIMIT 1");
        $cleanCode = str_replace('-', '', strtoupper($code));
        $stmt->execute([$code, $cleanCode]);
        $booking = $stmt->fetch();

        if ($booking) {
            $authUser = get_authenticated_user($pdo);
            $sessionCodes = $_SESSION['owned_booking_codes'] ?? [];
            if (!is_array($sessionCodes)) {
                $sessionCodes = [];
            }
            $isOwnerBySession = in_array($booking['code'], $sessionCodes, true) || in_array(str_replace('-', '', strtoupper($booking['code'])), $sessionCodes, true);
            $isOwnerByUser = ($authUser && (int)$authUser['id'] === (int)($booking['user_id'] ?? 0));
            $isOperator = is_portal_operator($authUser);

            if (!$isOwnerBySession && !$isOwnerByUser && !$isOperator) {
                json_response([
                    'success'  => false,
                    'message'  => 'Bạn không có quyền tra cứu đơn đặt sân này.',
                    'ref_code' => 'ERR_FORBIDDEN'
                ], 403);
            }

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

        if (!$booking) {
            json_response([
                'success'  => false,
                'message'  => 'Không tìm thấy đơn đặt sân tương ứng.',
                'ref_code' => 'ERR_NOT_FOUND'
            ], 404);
        }
    }

    $expectedAmount = $booking ? (int)$booking['deposit_amount'] : get_expected_deposit_amount($pdo, $code);

    $result = ['paid' => false, 'message' => 'Chưa nhận được giao dịch chuyển khoản'];
    if ($expectedAmount > 0) {
        try {
            $result = verify_sepay_payment($code, $expectedAmount);
        } catch (Throwable $sEx) {
            error_log("[SEPAY VERIFY WARN] " . $sEx->getMessage());
            $result = ['paid' => false, 'message' => 'Hệ thống SePay đang bận, vui lòng thử lại sau'];
        }
    }
    $receivedAmount = (int)($result['transaction']['amount'] ?? 0);

    if (!empty($result['paid']) && $expectedAmount > 0 && $receivedAmount >= $expectedAmount) {
        $targetAmount = $receivedAmount > 0 ? $receivedAmount : $expectedAmount;
        $newPaid = $booking ? max((int)($booking['paid_amount'] ?? 0), $targetAmount) : $targetAmount;
        $newPaymentStatus = 'Đã cọc 30%';
        if ($pdo && $booking) {
            try {
                $pdo->beginTransaction();
                $lockStmt = $pdo->prepare("SELECT id, user_id, code, status, payment_status, total_price, deposit_amount, paid_amount FROM bookings WHERE id = ? FOR UPDATE");
                $lockStmt->execute([(int)$booking['id']]);
                $freshBooking = $lockStmt->fetch();
                if ($freshBooking) {
                    $freshStatus = (string)($freshBooking['status'] ?? '');
                    $freshPayStatus = (string)($freshBooking['payment_status'] ?? '');
                    $currentPaid = max(0, (int)($freshBooking['paid_amount'] ?? 0));
                    $freshDeposit = max(0, (int)($freshBooking['deposit_amount'] ?? 0));

                    if ($freshStatus === 'Đã hủy' || $freshStatus === 'Khách chưa đến') {
                        $pdo->rollBack();
                        json_response([
                            'success'        => true,
                            'paid'           => false,
                            'expired'        => true,
                            'code'           => $freshBooking['code'],
                            'payment_status' => $freshPayStatus,
                            'paidAmount'     => $currentPaid,
                            'expectedAmount' => $freshDeposit,
                            'message'        => 'Đơn đặt sân đã quá hạn giữ chỗ hoặc đã bị hủy.'
                        ]);
                    }

                    $txInfo = is_array($result['transaction'] ?? null) ? $result['transaction'] : [];
                    $txSepayId = trim((string)($txInfo['id'] ?? $txInfo['transaction_id'] ?? $txInfo['tx_id'] ?? ''));
                    $txRef     = trim((string)($txInfo['reference'] ?? $txInfo['reference_code'] ?? $txInfo['reference_number'] ?? $txInfo['referenceCode'] ?? ''));
                    $txContent = trim((string)($txInfo['content'] ?? $txInfo['transaction_content'] ?? $freshBooking['code']));
                    $txDateRaw = trim((string)($txInfo['date'] ?? $txInfo['paid_at'] ?? $txInfo['transaction_date'] ?? ''));
                    $txDateTs  = $txDateRaw !== '' ? strtotime($txDateRaw) : false;
                    $txDateDb  = $txDateTs ? date('Y-m-d H:i:s', $txDateTs) : date('Y-m-d H:i:s');
                    $txAmount  = $receivedAmount > 0 ? $receivedAmount : $expectedAmount;
                    $txFingerprint = hash(
                        'sha256',
                        $txSepayId !== ''
                            ? "ID:{$txSepayId}"
                            : ($txRef !== ''
                                ? "REF:{$txRef}|AMT:{$txAmount}"
                                : "AMT:{$txAmount}|CNT:{$txContent}|DT:{$txDateDb}")
                    );
                    $matchStatusTx = ($txAmount > $expectedAmount) ? 'overpaid' : 'matched';

                    $insTx = $pdo->prepare("
                        INSERT IGNORE INTO bank_transactions
                            (sepay_tx_id, tx_fingerprint, reference_code, transaction_content, detected_booking_code, matched_booking_code, transfer_amount, expected_amount, match_status, transaction_date, created_at, resolved_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                    ");
                    $insTx->execute([
                        $txSepayId !== '' ? substr($txSepayId, 0, 80) : null,
                        $txFingerprint,
                        $txRef !== '' ? substr($txRef, 0, 100) : null,
                        $txContent !== '' ? $txContent : $freshBooking['code'],
                        $freshBooking['code'],
                        $freshBooking['code'],
                        $txAmount,
                        $expectedAmount,
                        $matchStatusTx,
                        $txDateDb
                    ]);

                    $alreadyConfirmed = in_array($freshPayStatus, ['Đã cọc 30%', 'Đã thanh toán đủ', 'Đã thanh toán 100%'], true)
                        || ($freshDeposit > 0 && $currentPaid >= $freshDeposit);

                    if ($alreadyConfirmed) {
                        $newPaid = $currentPaid;
                        $newPaymentStatus = $freshPayStatus;
                    } else {
                        $targetAmount = $receivedAmount > 0 ? $receivedAmount : $expectedAmount;
                        $newPaid = max($currentPaid, $targetAmount);
                        $remainingAmount = max(0, (int)($freshBooking['total_price'] ?? 0) - $newPaid);
                        $newPaymentStatus = ($remainingAmount <= 0) ? 'Đã thanh toán đủ' : 'Đã cọc 30%';
                        $newStatus = in_array($freshStatus, ['Chờ duyệt cọc', 'Giữ chỗ'], true) ? 'Đã xác nhận' : $freshStatus;
                        $updateStmt = $pdo->prepare("UPDATE bookings SET status = ?, payment_status = ?, payment_method = 'VietQR SePay (Tự động)', paid_amount = ?, remaining_amount = GREATEST(0, total_price - ?) WHERE id = ?");
                        $updateStmt->execute([$newStatus, $newPaymentStatus, $newPaid, $newPaid, (int)$freshBooking['id']]);
                        award_booking_loyalty_points($pdo, $freshBooking);
                    }
                }
                $pdo->commit();
                $result['payment_status'] = $newPaymentStatus;
            } catch (Throwable $updEx) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                error_log("[CHECK PAYMENT UPDATE WARN] " . $updEx->getMessage());
            }
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
} catch (Throwable $e) {
    error_log("[CHECK PAYMENT ERROR] " . $e->getMessage());
    json_response([
        'success'  => false,
        'message'  => 'Lỗi kiểm tra trạng thái thanh toán.',
        'ref_code' => 'ERR_CHECK_PAYMENT'
    ], 500);
}
