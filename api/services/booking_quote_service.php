<?php
declare(strict_types=1);

require_once __DIR__ . '/pricing_tier_helper.php';

/**
 * Single Source of Truth for booking price, monthly package vs voucher (non-stacking),
 * max_discount_amount cap, per-order services, deposit percentage, and loyalty bottle rate.
 */
function compute_server_booking_quote(PDO $pdo, array $input, bool $forUpdate = false): array {
    $pitchId       = sanitize_string($input['pitchId'] ?? $input['pitch_id'] ?? '', 20);
    $date          = sanitize_string($input['date'] ?? $input['booking_date'] ?? '', 15);
    $slotId        = sanitize_string($input['slotId'] ?? $input['slot_id'] ?? '', 10);
    $servicesInput = is_array($input['services'] ?? null) ? $input['services'] : [];
    $voucherCode   = strtoupper(trim(sanitize_string($input['voucherCode'] ?? $input['voucher_code'] ?? '', 30)));
    $rawWeeks      = (int)($input['weeksCount'] ?? $input['weeks_count'] ?? 1);
    $weeksCount    = in_array($rawWeeks, [1, 4, 8, 12], true) ? $rawWeeks : 1;
    $bookingMode   = sanitize_string($input['bookingMode'] ?? $input['booking_mode'] ?? ($weeksCount >= 12 ? 'quarterly' : ($weeksCount >= 4 ? 'monthly' : 'single')), 20);
    $userId        = isset($input['userId']) ? (int)$input['userId'] : (isset($input['user_id']) ? (int)$input['user_id'] : null);
    if ($userId !== null && $userId <= 0) {
        $userId = null;
    }
    $phone           = normalize_phone(sanitize_string($input['phone'] ?? '', 25));
    $redeemedBottles = max(0, min(20, (int)($input['redeemedBottles'] ?? $input['redeemed_bottles'] ?? 0)));

    if ($pitchId === '' || $slotId === '') {
        return ['error' => ['message' => 'Thiếu thông tin sân hoặc khung giờ.', 'status' => 400, 'ref_code' => 'ERR_MISSING_REQUIRED']];
    }

    $bookingTs = ($date !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) ? strtotime($date) : strtotime(date('Y-m-d'));
    if ($bookingTs === false) {
        return ['error' => ['message' => 'Ngày đặt sân không hợp lệ.', 'status' => 400, 'ref_code' => 'ERR_INVALID_DATE']];
    }

    $lockSuffix = $forUpdate ? ' FOR UPDATE' : '';
    $pitchStmt = $pdo->prepare("SELECT id, name, type, base_price, peak_price, weekend_price, status FROM pitches WHERE id = ?" . $lockSuffix);
    $pitchStmt->execute([$pitchId]);
    $pitch = $pitchStmt->fetch(PDO::FETCH_ASSOC);

    if (!$pitch || ($forUpdate && ($pitch['status'] === 'Bảo trì' || $pitch['status'] === 'Ẩn'))) {
        return ['error' => ['message' => 'Sân bóng này hiện đang bảo trì, tạm ẩn hoặc không tồn tại.', 'status' => 400, 'ref_code' => 'ERR_PITCH_UNAVAILABLE']];
    }

    $slotStmt = $pdo->prepare("SELECT id, slot_time, start_time, end_time, is_peak, duration FROM time_slots WHERE id = ?");
    $slotStmt->execute([$slotId]);
    $slot = $slotStmt->fetch(PDO::FETCH_ASSOC);
    if (!$slot) {
        return ['error' => ['message' => 'Khung giờ đặt không hợp lệ.', 'status' => 400, 'ref_code' => 'ERR_INVALID_SLOT']];
    }

    $isPeak      = (bool)$slot['is_peak'];
    $dayOfWeek   = (int)date('w', $bookingTs);
    $isWeekend   = ($dayOfWeek === 0 || $dayOfWeek === 6);
    $weekendPrice = (int)($pitch['weekend_price'] ?? 0);
    if ($isWeekend && $weekendPrice > 0) {
        $basePrice = $isPeak ? max((int)$pitch['peak_price'], $weekendPrice) : $weekendPrice;
    } else {
        $basePrice = $isPeak ? (int)$pitch['peak_price'] : (int)$pitch['base_price'];
    }
    $singlePitchPrice = (int)round($basePrice);
    $rawPitchPriceFull = (int)round($basePrice * $weeksCount);

    // Gói đặt lịch theo tháng
    $packageDiscountRate = 0.0;
    if ($weeksCount >= 12) {
        $packageDiscountRate = 0.15;
    } elseif ($weeksCount >= 8) {
        $packageDiscountRate = 0.10;
    } elseif ($weeksCount >= 4) {
        $packageDiscountRate = 0.05;
    }

    if ($weeksCount >= 4) {
        try {
            $mpStmt = $pdo->prepare("SELECT discount_percent FROM monthly_packages WHERE is_active = 1 AND matches_count = ? ORDER BY sort_order ASC, id ASC LIMIT 1");
            $mpStmt->execute([$weeksCount]);
            $mpRow = $mpStmt->fetch(PDO::FETCH_ASSOC);
            if ($mpRow && isset($mpRow['discount_percent'])) {
                $packageDiscountRate = max(0.0, min(1.0, ((int)$mpRow['discount_percent']) / 100));
            }
        } catch (Throwable $mpEx) {
            error_log('[MONTHLY_PACKAGE LOOKUP WARN] ' . $mpEx->getMessage());
        }
    }
    $monthlyDiscountAmount = ($packageDiscountRate > 0) ? (int)round($rawPitchPriceFull * $packageDiscountRate) : 0;

    $ghDay = (int)date('N', $bookingTs);
    $ghEval = resolve_golden_hour_adjustment($pdo, (int)$pitch['type'], $ghDay, $slotId, $rawPitchPriceFull);
    $pitchPrice = (int)$ghEval['adjustedPitchPrice'];
    $appliedGoldenHourRule = $ghEval['rule'] ? [
        'id'              => (int)$ghEval['rule']['id'],
        'ruleName'        => (string)$ghEval['rule']['rule_name'],
        'adjustmentType'  => (string)$ghEval['rule']['price_adjustment_type'],
        'adjustmentValue' => (int)$ghEval['rule']['adjustment_value'],
        'delta'           => (int)$ghEval['delta']
    ] : null;

    // Dịch vụ phụ trợ (tính 1 lần trên mỗi đơn đặt sân, không nhân theo weeksCount)
    $totalServicesPrice = 0;
    $cleanServices = [];
    if (!empty($servicesInput)) {
        $serviceIds = array_values(array_unique(array_filter(array_map(static function ($item) {
            return trim((string)($item['id'] ?? ''));
        }, $servicesInput))));
        if (!empty($serviceIds)) {
            $placeholders = implode(',', array_fill(0, count($serviceIds), '?'));
            $srvStmt = $pdo->prepare("SELECT id, name, price, unit, stock_qty, track_inventory FROM extra_services WHERE is_active = 1 AND id IN ($placeholders)" . $lockSuffix);
            $srvStmt->execute($serviceIds);
            $dbServices = $srvStmt->fetchAll(PDO::FETCH_UNIQUE);

            $requestedTotals = [];
            foreach ($servicesInput as $s) {
                $sId = trim((string)($s['id'] ?? ''));
                $sQty = max(1, min(100, (int)($s['quantity'] ?? 1)));
                if (isset($dbServices[$sId])) {
                    $requestedTotals[$sId] = ($requestedTotals[$sId] ?? 0) + $sQty;
                }
            }
            if ($forUpdate) {
                foreach ($requestedTotals as $sId => $reqTotalQty) {
                    $srvRow = $dbServices[$sId];
                    if ((int)($srvRow['track_inventory'] ?? 1) === 1 && (int)($srvRow['stock_qty'] ?? 0) < $reqTotalQty) {
                        return ['error' => [
                            'message'  => "Sản phẩm/dịch vụ '{$srvRow['name']}' chỉ còn " . (int)$srvRow['stock_qty'] . " {$srvRow['unit']} trong kho.",
                            'status'   => 409,
                            'ref_code' => 'ERR_OUT_OF_STOCK'
                        ]];
                    }
                }
            }
            foreach ($requestedTotals as $sId => $sQty) {
                $srvRow = $dbServices[$sId];
                $unitPrice = (int)$srvRow['price'];
                $cost = $unitPrice * $sQty;
                $totalServicesPrice += $cost;
                $cleanServices[] = [
                    'id'       => $sId,
                    'name'     => $srvRow['name'],
                    'price'    => $unitPrice,
                    'quantity' => $sQty,
                    'unit'     => $srvRow['unit'],
                    'total'    => $cost
                ];
            }
        }
    }

    $settings   = get_system_settings_map($pdo);
    $bottleCost = max(1, (int)($settings['loyalty_bottle_cost_points'] ?? 100));
    $pointsUsed = $redeemedBottles * $bottleCost;

    $subtotal              = $pitchPrice + $totalServicesPrice;
    $voucherDiscountAmount = 0;
    $appliedVoucher        = null;
    $voucherError          = null;
    $voucherErrorCode      = null;

    if ($voucherCode !== '') {
        if ($forUpdate && !check_rate_limit($pdo, 'invalid_voucher_attempts', 5, 300)) {
            return ['error' => [
                'message'  => 'Bạn đã thử mã ưu đãi sai quá nhiều lần. Vui lòng thử lại sau 5 phút.',
                'status'   => 429,
                'ref_code' => 'ERR_RATE_LIMITED'
            ]];
        }
        $vStmt = $pdo->prepare("SELECT * FROM vouchers WHERE code = ? LIMIT 1" . $lockSuffix);
        $vStmt->execute([$voucherCode]);
        $vData = $vStmt->fetch(PDO::FETCH_ASSOC);

        $failVoucher = static function (string $msg, int $status = 400, string $ref = 'ERR_INVALID_VOUCHER') use ($pdo, $forUpdate, &$voucherError, &$voucherErrorCode): ?array {
            if ($forUpdate) {
                increment_rate_limit($pdo, 'invalid_voucher_attempts');
                return ['error' => ['message' => $msg, 'status' => $status, 'ref_code' => $ref]];
            }
            $voucherError = $msg;
            $voucherErrorCode = $ref;
            return null;
        };

        if (!$vData || (int)$vData['is_active'] !== 1) {
            if ($err = $failVoucher('Mã giảm giá không tồn tại hoặc đã ngừng áp dụng.')) {
                return $err;
            }
        } else {
            $nowDate = date('Y-m-d');
            $vValid = true;
            if ((!empty($vData['valid_from']) && $nowDate < $vData['valid_from']) || (!empty($vData['valid_to']) && $nowDate > $vData['valid_to'])) {
                $vValid = false;
                if ($err = $failVoucher('Mã giảm giá chưa đến ngày áp dụng hoặc đã hết hạn.')) {
                    return $err;
                }
            }
            if ($vValid && !empty($vData['pitch_type_limit']) && (int)$vData['pitch_type_limit'] !== (int)$pitch['type']) {
                $vValid = false;
                if ($err = $failVoucher('Mã giảm giá này chỉ áp dụng riêng cho Sân ' . (int)$vData['pitch_type_limit'] . ' người.')) {
                    return $err;
                }
            }
            if ($vValid && (int)($vData['max_usage'] ?? 0) > 0 && (int)($vData['used_count'] ?? 0) >= (int)$vData['max_usage']) {
                $vValid = false;
                if ($err = $failVoucher('Mã giảm giá đã hết lượt sử dụng.')) {
                    return $err;
                }
            }
            if ($vValid && $subtotal < (int)($vData['min_order'] ?? 0)) {
                $vValid = false;
                if ($err = $failVoucher('Đơn hàng chưa đạt giá trị tối thiểu (' . number_format((int)$vData['min_order']) . 'đ) để dùng mã này.')) {
                    return $err;
                }
            }

            $maxPerUser = (int)($vData['max_per_user'] ?? 0);
            if ($vValid && $maxPerUser > 0 && ($userId !== null || $phone !== '')) {
                $cleanCheckPhone = preg_replace('/[^0-9]/', '', $phone);
                $clauses = [];
                $uLimitParams = [$voucherCode];
                if ($cleanCheckPhone !== '') {
                    $clauses[] = "REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', '') = ?";
                    $uLimitParams[] = $cleanCheckPhone;
                }
                if ($userId !== null) {
                    $clauses[] = "user_id = ?";
                    $uLimitParams[] = $userId;
                }
                if (!empty($clauses)) {
                    $uLimitSql = "SELECT COUNT(*) FROM bookings WHERE voucher_code = ? AND (" . implode(' OR ', $clauses) . ") AND status NOT IN ('Đã hủy', 'Khách chưa đến')";
                    $uLimitStmt = $pdo->prepare($uLimitSql);
                    $uLimitStmt->execute($uLimitParams);
                    if ((int)$uLimitStmt->fetchColumn() >= $maxPerUser) {
                        $vValid = false;
                        if ($err = $failVoucher('Bạn đã sử dụng hết số lần áp dụng cho mã này (tối đa ' . $maxPerUser . ' lần/khách).', 400, 'ERR_VOUCHER_USER_LIMIT')) {
                            return $err;
                        }
                    }
                }
            }

            $reqTier = !empty($vData['required_tier']) ? trim((string)$vData['required_tier']) : ($voucherCode === 'VIPGOLD' ? 'vip,regular' : '');
            if ($vValid && $reqTier !== '' && strtolower($reqTier) !== 'standard' && strtolower($reqTier) !== 'all') {
                if (!$userId) {
                    $vValid = false;
                    if ($err = $failVoucher('Mã giảm giá này chỉ áp dụng cho thành viên hạng ưu đãi đã đăng nhập tài khoản.', 403, 'ERR_VOUCHER_TIER_REQUIRED')) {
                        return $err;
                    }
                } else {
                    $userTier = get_authenticated_user_tier($pdo, (int)$userId);
                    if (!is_tier_allowed_for_voucher($userTier, $reqTier)) {
                        $vValid = false;
                        if ($err = $failVoucher('Hạng thành viên hiện tại chưa đủ điều kiện áp dụng mã ưu đãi này.', 403, 'ERR_VOUCHER_TIER_MISMATCH')) {
                            return $err;
                        }
                    }
                }
            }

            if ($vValid) {
                if ($vData['discount_type'] === 'percent') {
                    $voucherDiscountAmount = (int)round($subtotal * ((int)$vData['discount_value'] / 100));
                    $maxDiscAmt = (int)($vData['max_discount_amount'] ?? 0);
                    if ($maxDiscAmt > 0 && $voucherDiscountAmount > $maxDiscAmt) {
                        $voucherDiscountAmount = $maxDiscAmt;
                    }
                } else {
                    $voucherDiscountAmount = min((int)$vData['discount_value'], $subtotal);
                }
                $appliedVoucher = $vData['code'];
            }
        }
    }

    // Non-stacking rule: không cộng dồn voucher và ưu đãi gói tháng — áp dụng mức giảm cao hơn
    $appliedDiscountSource = 'none';
    $rejectedVoucherCode   = null;
    if ($voucherDiscountAmount > 0 && $monthlyDiscountAmount > 0) {
        if ($voucherDiscountAmount >= $monthlyDiscountAmount) {
            $monthlyDiscountAmount = 0;
            $appliedDiscountSource = 'voucher';
        } else {
            $voucherDiscountAmount = 0;
            $rejectedVoucherCode   = $appliedVoucher;
            $appliedVoucher        = null;
            $appliedDiscountSource = 'monthly_package';
        }
    } elseif ($voucherDiscountAmount > 0) {
        $appliedDiscountSource = 'voucher';
    } elseif ($monthlyDiscountAmount > 0) {
        $appliedDiscountSource = 'monthly_package';
    }

    $effectiveDiscount    = $monthlyDiscountAmount + $voucherDiscountAmount;
    $totalPrice           = max(0, $subtotal - $effectiveDiscount);
    $preDiscountPitch     = max($rawPitchPriceFull, $pitchPrice);
    $originalPrice        = $preDiscountPitch + $totalServicesPrice;
    $discountAmount       = max(0, $originalPrice - $totalPrice);

    $isMonthlyBooking = ($weeksCount > 1) || ($bookingMode === 'monthly') || ($bookingMode === 'quarterly');
    $depositRate      = $isMonthlyBooking ? 60 : max(10, min(100, (int)($settings['deposit_rate'] ?? 30)));
    $holdMinutes      = max(5, min(120, (int)($settings['hold_minutes'] ?? 15)));
    $depositAmount    = (int)round($totalPrice * ($depositRate / 100));
    $remainingAmount  = max(0, $totalPrice - $depositAmount);

    return [
        'pitch'                  => $pitch,
        'slot'                   => $slot,
        'settings'               => $settings,
        'weeksCount'             => $weeksCount,
        'bookingMode'            => $bookingMode,
        'isMonthlyBooking'       => $isMonthlyBooking,
        'singlePitchPrice'       => $singlePitchPrice,
        'rawPitchPriceFull'      => $rawPitchPriceFull,
        'pitchPrice'             => $pitchPrice,
        'servicesTotal'          => $totalServicesPrice,
        'cleanServices'          => $cleanServices,
        'subtotal'               => $subtotal,
        'packageDiscountRate'    => $packageDiscountRate,
        'monthlyDiscountAmount'  => $monthlyDiscountAmount,
        'voucherDiscountAmount'  => $voucherDiscountAmount,
        'appliedVoucher'         => $appliedVoucher,
        'rejectedVoucherCode'    => $rejectedVoucherCode,
        'appliedDiscountSource'  => $appliedDiscountSource,
        'appliedGoldenHourRule'  => $appliedGoldenHourRule,
        'originalPrice'          => $originalPrice,
        'discountAmount'         => $discountAmount,
        'totalPrice'             => $totalPrice,
        'depositRate'            => $depositRate,
        'depositAmount'          => $depositAmount,
        'remainingAmount'        => $remainingAmount,
        'holdMinutes'            => $holdMinutes,
        'bottleCost'             => $bottleCost,
        'redeemedBottles'        => $redeemedBottles,
        'pointsUsed'             => $pointsUsed,
        'voucherValid'           => ($voucherCode === '' || ($voucherError === null)),
        'voucherError'           => $voucherError,
        'voucherErrorCode'       => $voucherErrorCode,
    ];
}
