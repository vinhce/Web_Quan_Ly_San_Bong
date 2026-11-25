<?php
declare(strict_types=1);

/**
 * Shared Finance Metrics & Shift Cash Helper (Single Source of Truth across Tab 1 Overview, Tab 8 Shifts, Tab 9 Reports)
 */

function finance_is_cash_method(?string $method): bool {
    return mb_stripos((string)$method, 'Tiền mặt') !== false;
}

function finance_split_paid_by_method(array $row, int $orderPaid, bool $isCash): array {
    if ($orderPaid <= 0) {
        return ['cash' => 0, 'transfer' => 0];
    }
    $cashCol     = max(0, (int)($row['cash_paid_amount'] ?? 0));
    $transferCol = max(0, (int)($row['transfer_paid_amount'] ?? 0));
    $colSum      = $cashCol + $transferCol;

    if ($colSum > 0) {
        if ($colSum === $orderPaid) {
            return ['cash' => $cashCol, 'transfer' => $transferCol];
        }
        if ($colSum > $orderPaid) {
            if ($cashCol > 0 && $transferCol === 0) {
                return ['cash' => $orderPaid, 'transfer' => 0];
            }
            if ($transferCol > 0 && $cashCol === 0) {
                return ['cash' => 0, 'transfer' => $orderPaid];
            }
            $ratio = $orderPaid / $colSum;
            $cash = (int)round($cashCol * $ratio);
            return ['cash' => $cash, 'transfer' => max(0, $orderPaid - $cash)];
        }
        $extra = $orderPaid - $colSum;
        return [
            'cash'     => $cashCol + ($isCash ? $extra : 0),
            'transfer' => $transferCol + ($isCash ? 0 : $extra),
        ];
    }

    $noteStr = (string)($row['note'] ?? '');
    if (!$isCash && (mb_stripos($noteStr, 'Đã tất toán 100% qua Tiền mặt') !== false || mb_stripos($noteStr, 'qua Tiền mặt') !== false)) {
        $dep = max(0, (int)($row['deposit_amount'] ?? 0));
        $transferPart = ($dep > 0) ? min($orderPaid, $dep) : 0;
        return ['cash' => max(0, $orderPaid - $transferPart), 'transfer' => $transferPart];
    }

    return $isCash ? ['cash' => $orderPaid, 'transfer' => 0] : ['cash' => 0, 'transfer' => $orderPaid];
}

function finance_evaluate_booking_row(array $row): array {
    $bStatus   = trim((string)($row['status'] ?? 'Đã xác nhận'));
    $payStatus = trim((string)($row['payment_status'] ?? 'Chờ duyệt cọc'));
    $payMethod = trim((string)($row['payment_method'] ?? 'VietQR Chuyển khoản'));
    $noteStr   = (string)($row['note'] ?? '');

    $totPrice = max(0, (int)($row['total_price'] ?? 0));
    $depAmt   = max(0, (int)($row['deposit_amount'] ?? 0));
    $paidAmt  = max(0, (int)($row['paid_amount'] ?? 0));
    $remCol   = isset($row['remaining_amount']) ? max(0, (int)$row['remaining_amount']) : 0;

    $forfeitStatuses = ['Tịch thu cọc 30%', 'Phạt 50% cọc', 'Bảo lưu cọc 30%'];

    $isCancelledOrForfeit = (
        $bStatus === 'Đã hủy'
        || $bStatus === 'Khách chưa đến'
        || in_array($payStatus, ['Đã hủy', 'Đã hoàn cọc 100%', 'Tịch thu cọc 30%', 'Phạt 50% cọc', 'Bảo lưu cọc 30%'], true)
    );

    // 1. Đơn đã hủy hoàn toàn hoặc đã hoàn cọc 100%
    if (
        $payStatus === 'Đã hủy'
        || $payStatus === 'Đã hoàn cọc 100%'
        || ($bStatus === 'Đã hủy' && !in_array($payStatus, $forfeitStatuses, true))
    ) {
        return [
            'excluded'              => true,
            'isCancelled'           => true,
            'isCompleted'           => false,
            'isMatchCounted'        => false,
            'isDepositConfirmed'    => false,
            'isCash'                => finance_is_cash_method($payMethod),
            'orderCashPaid'         => 0,
            'orderTransferPaid'     => 0,
            'orderRevenue'          => 0,
            'orderPitchRecognized'  => 0,
            'orderServices'         => 0,
            'orderPaid'             => 0,
            'orderUncollected'      => 0,
            'orderPitchCollected'   => 0,
            'orderSrvCollected'     => 0,
            'orderDepositCollected' => 0,
            'orderRemCollected'     => 0,
        ];
    }

    // 2. T5-01: Tịch thu cọc / No-show / Phạt 50% / Bảo lưu cọc
    // CHỈ ghi nhận đúng số tiền khách thực tế đã thanh toán (paid_amount > 0); nếu paid_amount = 0 => doanh thu = 0
    if (in_array($payStatus, $forfeitStatuses, true) || $bStatus === 'Khách chưa đến') {
        if ($paidAmt <= 0) {
            return [
                'excluded'              => true,
                'isCancelled'           => true,
                'isCompleted'           => false,
                'isMatchCounted'        => false,
                'isDepositConfirmed'    => false,
                'isCash'                => finance_is_cash_method($payMethod),
                'orderCashPaid'         => 0,
                'orderTransferPaid'     => 0,
                'orderRevenue'          => 0,
                'orderPitchRecognized'  => 0,
                'orderServices'         => 0,
                'orderPaid'             => 0,
                'orderUncollected'      => 0,
                'orderPitchCollected'   => 0,
                'orderSrvCollected'     => 0,
                'orderDepositCollected' => 0,
                'orderRemCollected'     => 0,
            ];
        }

        $actualPool = ($depAmt > 0) ? min($paidAmt, $depAmt) : $paidAmt;
        $kept = ($payStatus === 'Phạt 50% cọc') ? (int)round($actualPool * 0.5) : $actualPool;

        $isCashForfeit = finance_is_cash_method($payMethod);
        $splitForfeit = finance_split_paid_by_method($row, $kept, $isCashForfeit);

        return [
            'excluded'              => false,
            'isCancelled'           => true,
            'isCompleted'           => false,
            'isMatchCounted'        => false,
            'isDepositConfirmed'    => true,
            'isCash'                => $isCashForfeit,
            'orderCashPaid'         => $splitForfeit['cash'],
            'orderTransferPaid'     => $splitForfeit['transfer'],
            'orderRevenue'          => $kept,
            'orderPitchRecognized'  => $kept,
            'orderServices'         => 0,
            'orderPaid'             => $kept,
            'orderUncollected'      => 0,
            'orderPitchCollected'   => $kept,
            'orderSrvCollected'     => 0,
            'orderDepositCollected' => $kept,
            'orderRemCollected'     => 0,
        ];
    }

    // 3. Đơn hợp lệ / đang hoạt động / hoàn thành / Đã đá - chưa tất toán
    $orderServices = 0;
    $srvs = !empty($row['services_json']) ? json_decode((string)$row['services_json'], true) : [];
    if (is_array($srvs)) {
        foreach ($srvs as $s) {
            if (!is_array($s)) {
                continue;
            }
            $sTotal = isset($s['total']) ? (int)$s['total'] : ((int)($s['price'] ?? 0) * max(1, (int)($s['quantity'] ?? 1)));
            $orderServices += max(0, $sTotal);
        }
    }

    $orderRevenue         = $totPrice;
    $pitchNet             = max(0, $totPrice - $orderServices);
    $orderPitchRecognized = $pitchNet;

    $isPaidFullStatus = in_array($payStatus, ['Đã thanh toán đủ', 'Đã thanh toán 100%', 'completed', 'paid'], true);
    $isDoneStatus     = ($bStatus === 'Hoàn thành' || strtolower($bStatus) === 'completed' || $isPaidFullStatus);
    $isDepositConfirmed = $isDoneStatus
        || in_array($payStatus, ['Đã cọc 30%', 'Đã cọc 60%', 'deposited', 'Còn thiếu phần phát sinh'], true)
        || (mb_stripos($payStatus, 'Đã cọc') !== false);

    // T5-03: Nếu còn remaining_amount > 0 hoặc paid_amount < total_price => tuyệt đối không tính đã thu 100%
    if ($paidAmt > 0) {
        if ($isPaidFullStatus && $remCol === 0 && $paidAmt >= $totPrice) {
            $orderPaid = $totPrice;
        } elseif ($isDoneStatus && $remCol === 0 && $paidAmt >= $totPrice) {
            $orderPaid = $totPrice;
        } else {
            $orderPaid = min($totPrice, $paidAmt);
        }
    } elseif ($isDoneStatus && $remCol === 0 && $bStatus !== 'Đã đá - chưa tất toán') {
        $orderPaid = $totPrice;
    } elseif ($isDepositConfirmed && $remCol === 0 && $payStatus !== 'Còn thiếu phần phát sinh') {
        $effectiveDep = ($depAmt > 0) ? min($depAmt, $totPrice) : (int)round($pitchNet * 0.3);
        $orderPaid    = $effectiveDep;
    } else {
        $orderPaid = 0;
    }

    $orderUncollected = max(0, $totPrice - $orderPaid);
    $isCompleted      = ($isDoneStatus && $bStatus !== 'Đã đá - chưa tất toán' && $orderUncollected === 0);

    $orderPitchCollected = min($pitchNet, $orderPaid);
    $orderSrvCollected   = max(0, $orderPaid - $orderPitchCollected);
    if ($isDepositConfirmed) {
        $depCap                = ($depAmt > 0) ? $depAmt : (int)round($pitchNet * 0.3);
        $orderDepositCollected = min($depCap, $orderPitchCollected);
        $orderRemCollected     = max(0, $orderPitchCollected - $orderDepositCollected);
    } else {
        $orderDepositCollected = 0;
        $orderRemCollected     = $orderPitchCollected;
    }

    $isCashNormal = finance_is_cash_method($payMethod);
    $splitNormal = finance_split_paid_by_method($row, $orderPaid, $isCashNormal);

    return [
        'excluded'              => false,
        'isCancelled'           => $isCancelledOrForfeit,
        'isCompleted'           => $isCompleted,
        'isMatchCounted'        => true,
        'isDepositConfirmed'    => $isDepositConfirmed,
        'isCash'                => $isCashNormal,
        'orderCashPaid'         => $splitNormal['cash'],
        'orderTransferPaid'     => $splitNormal['transfer'],
        'orderRevenue'          => $orderRevenue,
        'orderPitchRecognized'  => $orderPitchRecognized,
        'orderServices'         => $orderServices,
        'orderPaid'             => $orderPaid,
        'orderUncollected'      => $orderUncollected,
        'orderPitchCollected'   => $orderPitchCollected,
        'orderSrvCollected'     => $orderSrvCollected,
        'orderDepositCollected' => $orderDepositCollected,
        'orderRemCollected'     => $orderRemCollected,
        'noteStr'               => $noteStr,
    ];
}

function finance_query_counter_sales(PDO $pdo, string $fromDate = '', string $toDate = ''): array {
    $salesWhere = ["(booking_code IS NULL OR booking_code = '')", "total_amount > 0"];
    $salesParams = [];
    if ($fromDate !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $fromDate)) {
        $salesWhere[] = "DATE(created_at) >= ?";
        $salesParams[] = $fromDate;
    }
    if ($toDate !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $toDate)) {
        $salesWhere[] = "DATE(created_at) <= ?";
        $salesParams[] = $toDate;
    }

    $rows = [];
    $totalAmount = 0;
    $cashAmount = 0;
    $transferAmount = 0;

    try {
        $sWhereSql = 'WHERE ' . implode(' AND ', $salesWhere);
        $sStmt = $pdo->prepare("SELECT * FROM service_sales {$sWhereSql} ORDER BY id DESC");
        $sStmt->execute($salesParams);
        $rows = $sStmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as $sRow) {
            $sAmt = max(0, (int)($sRow['total_amount'] ?? 0));
            $totalAmount += $sAmt;
            if (finance_is_cash_method((string)($sRow['payment_method'] ?? ''))) {
                $cashAmount += $sAmt;
            } else {
                $transferAmount += $sAmt;
            }
        }
    } catch (Throwable $e) {
        error_log("[FINANCE COUNTER SALES WARN] " . $e->getMessage());
    }

    return [
        'rows'           => $rows,
        'totalAmount'    => $totalAmount,
        'cashAmount'     => $cashAmount,
        'transferAmount' => $transferAmount,
    ];
}

function finance_compute_shift_totals(PDO $pdo, int $staffId, string $startTime, ?string $endTime = null): array {
    try {
        $endBound = $endTime ?: date('Y-m-d H:i:s');

        $hasStaffCol = function_exists('db_table_has_column') ? db_table_has_column($pdo, 'bookings', 'staff_id') : true;
        $staffCondition = $hasStaffCol
            ? "(staff_id = :staff_id1 OR user_id = :staff_id2 OR code IN (SELECT booking_id FROM audit_logs WHERE user_id = :staff_id3 AND action = 'WALKIN_BOOKING'))"
            : "(user_id = :staff_id1 OR code IN (SELECT booking_id FROM audit_logs WHERE user_id = :staff_id2 AND action = 'WALKIN_BOOKING'))";

        $walkinParams = [
            ':start_time' => $startTime,
            ':end_bound'  => $endBound,
            ':staff_id1'  => $staffId,
            ':staff_id2'  => $staffId,
        ];
        if ($hasStaffCol) {
            $walkinParams[':staff_id3'] = $staffId;
        }

        // Tiền thu tại thời điểm tạo đơn tại quầy (tiền mặt), không cộng đơn chưa cọc hoặc đã hủy/hoàn 100%
        $stmtWalkin = $pdo->prepare("
            SELECT COALESCE(SUM(
                CASE
                    WHEN paid_amount > 0 THEN LEAST(paid_amount, GREATEST(deposit_amount, 0))
                    WHEN deposit_amount > 0 AND payment_status NOT IN ('Chờ duyệt cọc', 'Chờ cọc 30%', 'Đã hủy', 'Đã hoàn cọc 100%') THEN deposit_amount
                    ELSE 0
                END
            ), 0) AS total_walkin_cash
            FROM bookings
            WHERE created_at >= :start_time AND created_at <= :end_bound
              AND status != 'Đã hủy'
              AND payment_status NOT IN ('Đã hủy', 'Đã hoàn cọc 100%')
              AND payment_method LIKE '%Tiền mặt%'
              AND payment_method NOT LIKE '%Chưa cọc%'
              AND {$staffCondition}
        ");
        $stmtWalkin->execute($walkinParams);
        $walkinCash = (int)$stmtWalkin->fetchColumn();

        // Chỉ tính COLLECT_PAYMENT thu bằng Tiền mặt (tuyệt đối không match '%quầy%' vì dính 'Chuyển khoản tại quầy')
        $stmtRemaining = $pdo->prepare("
            SELECT old_value
            FROM audit_logs
            WHERE user_id = :staff_id
              AND action = 'COLLECT_PAYMENT'
              AND new_value LIKE '%Tiền mặt%'
              AND created_at >= :start_time AND created_at <= :end_bound
        ");
        $stmtRemaining->execute([':start_time' => $startTime, ':end_bound' => $endBound, ':staff_id' => $staffId]);
        $remCash = 0;
        while ($row = $stmtRemaining->fetch(PDO::FETCH_ASSOC)) {
            $rawOld = (string)($row['old_value'] ?? '');
            $digits = preg_replace('/[^0-9]/', '', $rawOld);
            if ($digits !== '') {
                $remCash += (int)$digits;
            }
        }

        $stmtSales = $pdo->prepare("
            SELECT COALESCE(SUM(total_amount), 0) AS total_service_cash
            FROM service_sales
            WHERE created_at >= :start_time AND created_at <= :end_bound
              AND payment_method LIKE '%Tiền mặt%'
              AND (booking_code IS NULL OR booking_code = '')
              AND total_amount > 0
              AND staff_id = :staff_id
        ");
        $stmtSales->execute([':start_time' => $startTime, ':end_bound' => $endBound, ':staff_id' => $staffId]);
        $serviceCash = (int)$stmtSales->fetchColumn();

        $cashTotal = $walkinCash + $remCash + $serviceCash;

        $stmtTransfer = $pdo->prepare("
            SELECT COALESCE(SUM(transfer_amount), 0) AS total_transfer
            FROM bank_transactions
            WHERE created_at >= :start_time AND created_at <= :end_bound
              AND match_status IN ('matched', 'overpaid', 'underpaid', 'resolved')
        ");
        $stmtTransfer->execute([':start_time' => $startTime, ':end_bound' => $endBound]);
        $transferTotal = (int)$stmtTransfer->fetchColumn();

        return [
            'cashTotal'     => $cashTotal,
            'transferTotal' => $transferTotal,
            'walkinCash'    => $walkinCash,
            'remCash'       => $remCash,
            'serviceCash'   => $serviceCash,
        ];
    } catch (Throwable $e) {
        error_log("[COMPUTE_SHIFT_TOTALS ERROR] " . $e->getMessage());
        return [
            'cashTotal'     => 0,
            'transferTotal' => 0,
            'walkinCash'    => 0,
            'remCash'       => 0,
            'serviceCash'   => 0,
        ];
    }
}
