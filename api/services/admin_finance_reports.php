<?php
declare(strict_types=1);

if (!defined('SANBONG_ADMIN_ROUTER')) {
    http_response_code(403);
    exit;
}

/**
 * Parse slot duration in hours from slot_time string (e.g. "16:30 - 18:30" -> 2.0).
 */
function report_parse_slot_hours(string $slotTime): float {
    if (preg_match('/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/', $slotTime, $m)) {
        $startMin = ((int)$m[1]) * 60 + (int)$m[2];
        $endMin   = ((int)$m[3]) * 60 + (int)$m[4];
        if ($endMin > $startMin) {
            return round(($endMin - $startMin) / 60, 2);
        }
    }
    return 2.0;
}

/**
 * Parse slot end time "HH:MM" for determining whether a match has already finished.
 */
function report_parse_slot_end_time(string $slotTime): string {
    if (preg_match('/[-–]\s*(\d{1,2}):(\d{2})/', $slotTime, $m)) {
        return sprintf('%02d:%02d:00', (int)$m[1], (int)$m[2]);
    }
    return '23:59:59';
}

/**
 * Compute core report metrics for a given date range [fromDate, toDate].
 * Used both for the active period and for previous-period delta comparison.
 */
function report_compute_period_core(PDO $pdo, string $fromDate, string $toDate, array $pitchesRows, bool $includeDetails = true): array {
    $byPitchMap = [];
    $pitchCountByType = [5 => 0, 7 => 0, 11 => 0];
    $activePitchesCount = 0;

    foreach ($pitchesRows as $p) {
        $pType = (int)$p['type'];
        if (isset($pitchCountByType[$pType])) {
            $pitchCountByType[$pType]++;
        }
        $pStatus = (string)($p['status'] ?? 'Hoạt động');
        $isActivePitch = ($pStatus !== 'Bảo trì' && $pStatus !== 'Ẩn');
        if ($isActivePitch) {
            $activePitchesCount++;
        }
        $byPitchMap[$p['id']] = [
            'id'               => $p['id'],
            'name'             => $p['name'],
            'type'             => $pType,
            'typeName'         => $p['type_name'],
            'status'           => $pStatus,
            'isActive'         => $isActivePitch,
            'matches'          => 0,
            'bookedHours'      => 0.0,
            'occupancyRate'    => 0.0,
            'depositRevenue'   => 0,
            'remainingRevenue' => 0,
            'servicesRevenue'  => 0,
            'collectedRevenue' => 0,
            'revenue'          => 0
        ];
    }

    $whereClauses = [];
    $params = [];
    if ($fromDate !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $fromDate)) {
        $whereClauses[] = "b.booking_date >= ?";
        $params[] = $fromDate;
    }
    if ($toDate !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $toDate)) {
        $whereClauses[] = "b.booking_date <= ?";
        $params[] = $toDate;
    }

    $whereSql = !empty($whereClauses) ? ('WHERE ' . implode(' AND ', $whereClauses)) : '';
    $bStmt = $pdo->prepare("SELECT b.*, p.type as pitch_type, p.name as pitch_name, p.type_name
                            FROM bookings b
                            LEFT JOIN pitches p ON b.pitch_id = p.id
                            {$whereSql}
                            ORDER BY b.booking_date DESC, b.id DESC");
    $bStmt->execute($params);
    $bookingsRows = $bStmt->fetchAll();

    $recognizedRevenue       = 0;
    $pitchRecognizedRevenue  = 0;
    $pitchCollectedRevenue   = 0;
    $depositCollected        = 0;
    $remainingCollected      = 0;
    $servicesRecognized      = 0;
    $servicesCollected       = 0;
    $cashRevenue             = 0;
    $vietqrRevenue           = 0;
    $counterSalesRevenue     = 0;
    $totalMatches            = 0;
    $totalBookedHours        = 0.0;
    $totalBookingsCount      = count($bookingsRows);
    $completedBookingsCount  = 0;
    $cancelledBookingsCount  = 0;
    $uncollectedRevenue      = 0;
    $uncollectedUpcoming     = 0;
    $uncollectedOverdue      = 0;
    $uncollectedUpcomingList = [];
    $uncollectedOverdueList  = [];
    $depositDeviantOrders    = [];
    $validBookingCodes       = [];
    $detailedBookings        = [];
    $dailyMap                = [];
    $slotMap                 = [];

    $byType = [
        'p5'  => ['revenue' => 0, 'collected' => 0, 'count' => 0, 'matches' => 0, 'pitchCount' => $pitchCountByType[5]],
        'p7'  => ['revenue' => 0, 'collected' => 0, 'count' => 0, 'matches' => 0, 'pitchCount' => $pitchCountByType[7]],
        'p11' => ['revenue' => 0, 'collected' => 0, 'count' => 0, 'matches' => 0, 'pitchCount' => $pitchCountByType[11]]
    ];

    $nowTs = time();

    foreach ($bookingsRows as $row) {
        $code      = (string)($row['code'] ?? '');
        $bStatus   = (string)($row['status'] ?? 'Đã xác nhận');
        $payStatus = (string)($row['payment_status'] ?? 'Chờ duyệt cọc');
        $payMethod = (string)($row['payment_method'] ?? 'VietQR Chuyển khoản');
        $noteStr   = (string)($row['note'] ?? '');
        $pId       = (string)($row['pitch_id'] ?? '');
        $bDate     = (string)($row['booking_date'] ?? date('Y-m-d'));
        $slotTime  = (string)($row['slot_time'] ?? '');
        $pType     = (int)($row['pitch_type'] ?? (stripos($pId, 'P5') === 0 ? 5 : (stripos($pId, 'P11') === 0 ? 11 : 7)));
        $typeKey   = $pType === 5 ? 'p5' : ($pType === 11 ? 'p11' : 'p7');

        $totPrice  = max(0, (int)($row['total_price'] ?? 0));
        $depAmt    = max(0, (int)($row['deposit_amount'] ?? 0));
        $paidAmt   = max(0, (int)($row['paid_amount'] ?? 0));

        $isCancelledOrForfeit = ($bStatus === 'Đã hủy' || $bStatus === 'Khách chưa đến'
            || in_array($payStatus, ['Đã hủy', 'Đã hoàn cọc 100%', 'Tịch thu cọc 30%', 'Phạt 50% cọc', 'Bảo lưu cọc 30%'], true));
        if ($isCancelledOrForfeit) {
            $cancelledBookingsCount++;
        }
        $isCompleted = ($bStatus === 'Hoàn thành' || strtolower($bStatus) === 'completed'
            || in_array($payStatus, ['Đã thanh toán đủ', 'Đã thanh toán 100%', 'completed', 'paid'], true));
        if ($isCompleted) {
            $completedBookingsCount++;
        }

        // Bỏ qua đơn hủy hoàn toàn / đã hoàn cọc 100%
        if ($payStatus === 'Đã hủy' || $payStatus === 'Đã hoàn cọc 100%'
            || ($bStatus === 'Đã hủy' && !in_array($payStatus, ['Tịch thu cọc 30%', 'Phạt 50% cọc', 'Bảo lưu cọc 30%'], true))) {
            continue;
        }

        $validBookingCodes[] = $code;

        $orderRevenue          = 0;
        $orderPitchRecognized  = 0;
        $orderServices         = 0;
        $orderPaid             = 0;
        $orderUncollected      = 0;
        $orderDepositCollected = 0;
        $orderRemCollected     = 0;
        $orderPitchCollected   = 0;
        $orderSrvCollected     = 0;
        $isMatchCounted        = false;
        $isDepositConfirmed    = false;

        if ($payStatus === 'Tịch thu cọc 30%' || $bStatus === 'Khách chưa đến') {
            $orderRevenue          = $depAmt;
            $orderPitchRecognized  = $depAmt;
            $orderPaid             = $depAmt;
            $orderDepositCollected = $depAmt;
            $orderPitchCollected   = $depAmt;
            $isDepositConfirmed    = true;
        } elseif ($payStatus === 'Phạt 50% cọc') {
            $forfeited             = (int)round($depAmt * 0.5);
            $orderRevenue          = $forfeited;
            $orderPitchRecognized  = $forfeited;
            $orderPaid             = $forfeited;
            $orderDepositCollected = $forfeited;
            $orderPitchCollected   = $forfeited;
            $isDepositConfirmed    = true;
        } elseif ($payStatus === 'Bảo lưu cọc 30%') {
            $orderRevenue          = $depAmt;
            $orderPitchRecognized  = $depAmt;
            $orderPaid             = $depAmt;
            $orderDepositCollected = $depAmt;
            $orderPitchCollected   = $depAmt;
            $isDepositConfirmed    = true;
        } else {
            $isMatchCounted = true;
            $orderRevenue   = $totPrice;

            $srvs = !empty($row['services_json']) ? json_decode((string)$row['services_json'], true) : [];
            if (is_array($srvs)) {
                foreach ($srvs as $s) {
                    $sTotal = isset($s['total']) ? (int)$s['total'] : ((int)($s['price'] ?? 0) * max(1, (int)($s['quantity'] ?? 1)));
                    $orderServices += max(0, $sTotal);
                }
            }

            $pitchNet = max(0, $totPrice - $orderServices);
            $orderPitchRecognized = $pitchNet;

            // Nhận cả Đã cọc 30%, Đã cọc 60%, Đã cọc ..., Đã thanh toán đủ/100%
            $isDepositConfirmed = $isCompleted
                || in_array($payStatus, ['Đã cọc 30%', 'Đã cọc 60%', 'deposited', 'completed', 'paid'], true)
                || (mb_stripos($payStatus, 'Đã cọc') !== false);

            if ($isCompleted) {
                $orderPaid        = $totPrice;
                $orderUncollected = 0;
            } elseif ($isDepositConfirmed) {
                $effectiveDep     = ($depAmt > 0) ? min($depAmt, $totPrice) : (int)round($pitchNet * 0.3);
                $orderPaid        = ($paidAmt > 0) ? min($totPrice, $paidAmt) : $effectiveDep;
                $orderUncollected = max(0, $totPrice - $orderPaid);
            } else {
                // Chờ duyệt cọc / chưa thanh toán
                $orderPaid        = ($paidAmt > 0) ? min($totPrice, $paidAmt) : 0;
                $orderUncollected = max(0, $totPrice - $orderPaid);
            }

            // Phân bổ tiền đã thu vào: Tiền cọc đã thu + Tiền sân còn lại đã thu + Dịch vụ đã thu
            $orderPitchCollected   = min($pitchNet, $orderPaid);
            $orderSrvCollected     = max(0, $orderPaid - $orderPitchCollected);
            if ($isDepositConfirmed) {
                $orderDepositCollected = min($depAmt > 0 ? $depAmt : (int)round($pitchNet * 0.3), $orderPitchCollected);
                $orderRemCollected     = max(0, $orderPitchCollected - $orderDepositCollected);
            } else {
                $orderDepositCollected = 0;
                $orderRemCollected     = $orderPitchCollected;
            }

            // Kiểm tra lệch cọc so với 30% (hoặc 60% gói tháng) để liệt kê trong mục đối soát
            if ($includeDetails && $pitchNet > 0) {
                $isMonthly = ((int)($row['weeks_count'] ?? 1) > 1) || (mb_stripos($payStatus, '60%') !== false) || (mb_stripos($noteStr, 'Gói') !== false);
                $expectedRate = $isMonthly ? 0.60 : 0.30;
                $expectedDep  = (int)round($totPrice * $expectedRate);
                $expectedDepPitch = (int)round($pitchNet * $expectedRate);
                $diffTot = abs($depAmt - $expectedDep);
                $diffPitch = abs($depAmt - $expectedDepPitch);
                if (!$isDepositConfirmed) {
                    $depositDeviantOrders[] = [
                        'code'         => $code,
                        'booking_date' => $bDate,
                        'customer'     => (string)($row['customer_name'] ?? ''),
                        'pitch_name'   => (string)($row['pitch_name'] ?? $pId),
                        'total_price'  => $totPrice,
                        'deposit'      => $depAmt,
                        'expected'     => $expectedDep,
                        'reason'       => 'Trạng thái "' . $payStatus . '" (chưa xác nhận cọc)'
                    ];
                } elseif (min($diffTot, $diffPitch) > 1000) {
                    $actualPct = $totPrice > 0 ? round(($depAmt / $totPrice) * 100, 1) : 0;
                    $depositDeviantOrders[] = [
                        'code'         => $code,
                        'booking_date' => $bDate,
                        'customer'     => (string)($row['customer_name'] ?? ''),
                        'pitch_name'   => (string)($row['pitch_name'] ?? $pId),
                        'total_price'  => $totPrice,
                        'deposit'      => $depAmt,
                        'expected'     => $expectedDep,
                        'reason'       => "Cọc {$actualPct}% (chuẩn " . ($expectedRate * 100) . "%)"
                    ];
                }
            }
        }

        $recognizedRevenue      += $orderRevenue;
        $pitchRecognizedRevenue += $orderPitchRecognized;
        $pitchCollectedRevenue  += $orderPitchCollected;
        $depositCollected       += $orderDepositCollected;
        $remainingCollected     += $orderRemCollected;
        $servicesRecognized     += $orderServices;
        $servicesCollected      += $orderSrvCollected;
        $uncollectedRevenue     += $orderUncollected;

        // Tách "Chưa thu" thành: Chưa đến giờ đá vs Đã đá nhưng chưa tất toán
        if ($orderUncollected > 0) {
            $endTimeStr = report_parse_slot_end_time($slotTime);
            $endTs = strtotime($bDate . ' ' . $endTimeStr);
            $isPastMatch = ($endTs !== false && $endTs < $nowTs) || $isCompleted;
            $itemSummary = [
                'code'           => $code,
                'booking_date'   => $bDate,
                'slot_time'      => $slotTime,
                'pitch_name'     => (string)($row['pitch_name'] ?? $pId),
                'customer_name'  => (string)($row['customer_name'] ?? ''),
                'phone'          => (string)($row['phone'] ?? ''),
                'total_price'    => $totPrice,
                'paid_amount'    => $orderPaid,
                'uncollected'    => $orderUncollected,
                'status'         => $bStatus,
                'payment_status' => $payStatus
            ];
            if ($isPastMatch) {
                $uncollectedOverdue += $orderUncollected;
                if ($includeDetails) {
                    $uncollectedOverdueList[] = $itemSummary;
                }
            } else {
                $uncollectedUpcoming += $orderUncollected;
                if ($includeDetails) {
                    $uncollectedUpcomingList[] = $itemSummary;
                }
            }
        }

        $isCash = (mb_stripos($payMethod, 'Tiền mặt') !== false);
        if ($isCash) {
            $cashRevenue += $orderPaid;
        } else {
            $vietqrRevenue += $orderPaid;
        }

        $slotHours = $isMatchCounted ? report_parse_slot_hours($slotTime) : 0.0;
        if ($isMatchCounted) {
            $totalMatches++;
            $totalBookedHours += $slotHours;
            $byType[$typeKey]['count']++;
            $byType[$typeKey]['matches']++;
        }
        $byType[$typeKey]['revenue']   += $orderRevenue;
        $byType[$typeKey]['collected'] += $orderPaid;

        if (isset($byPitchMap[$pId])) {
            if ($isMatchCounted) {
                $byPitchMap[$pId]['matches']++;
                $byPitchMap[$pId]['bookedHours'] += $slotHours;
            }
            $byPitchMap[$pId]['depositRevenue']   += $orderDepositCollected;
            $byPitchMap[$pId]['remainingRevenue'] += $orderRemCollected;
            $byPitchMap[$pId]['servicesRevenue']  += $orderServices;
            $byPitchMap[$pId]['collectedRevenue'] += $orderPaid;
            $byPitchMap[$pId]['revenue']          += $orderRevenue;
        }

        if ($includeDetails) {
            if (!isset($dailyMap[$bDate])) {
                $dailyMap[$bDate] = ['date' => $bDate, 'revenue' => 0, 'collected' => 0, 'matches' => 0];
            }
            $dailyMap[$bDate]['revenue']   += $orderRevenue;
            $dailyMap[$bDate]['collected'] += $orderPaid;
            if ($isMatchCounted) {
                $dailyMap[$bDate]['matches']++;
            }

            $slotKey = trim($slotTime) !== '' ? trim($slotTime) : 'Khác';
            if (!isset($slotMap[$slotKey])) {
                $slotMap[$slotKey] = ['slot' => $slotKey, 'revenue' => 0, 'collected' => 0, 'matches' => 0];
            }
            $slotMap[$slotKey]['revenue']   += $orderRevenue;
            $slotMap[$slotKey]['collected'] += $orderPaid;
            if ($isMatchCounted) {
                $slotMap[$slotKey]['matches']++;
            }

            $detailedBookings[] = [
                'code'                => $code,
                'booking_date'        => $bDate,
                'slot_time'           => $slotTime,
                'pitch_id'            => $pId,
                'pitch_name'          => (string)($row['pitch_name'] ?? $pId),
                'pitch_type'          => $pType,
                'customer_name'       => (string)($row['customer_name'] ?? ''),
                'phone'               => (string)($row['phone'] ?? ''),
                'total_price'         => $totPrice,
                'deposit_amount'      => $orderDepositCollected,
                'paid_amount'         => $orderPaid,
                'unconfirmed_deposit' => (!$isDepositConfirmed ? $depAmt : 0),
                'remaining_amount'    => $orderUncollected,
                'service_price'       => $orderServices,
                'status'              => $bStatus,
                'payment_status'      => $payStatus,
                'payment_method'      => $payMethod,
                'note'                => $noteStr
            ];
        }
    }

    // Bán lẻ nước / dịch vụ tại quầy
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
    $counterSalesRows = [];
    try {
        $sWhereSql = 'WHERE ' . implode(' AND ', $salesWhere);
        $sStmt = $pdo->prepare("SELECT * FROM service_sales {$sWhereSql} ORDER BY id DESC");
        $sStmt->execute($salesParams);
        $counterSalesRows = $sStmt->fetchAll();
        foreach ($counterSalesRows as $sRow) {
            $sAmt = max(0, (int)($sRow['total_amount'] ?? 0));
            $counterSalesRevenue += $sAmt;
            $servicesRecognized  += $sAmt;
            $servicesCollected   += $sAmt;
            $recognizedRevenue   += $sAmt;
            if (mb_stripos((string)($sRow['payment_method'] ?? ''), 'Tiền mặt') !== false) {
                $cashRevenue += $sAmt;
            } else {
                $vietqrRevenue += $sAmt;
            }
            if ($includeDetails) {
                $sDate = substr((string)($sRow['created_at'] ?? date('Y-m-d')), 0, 10);
                if (!isset($dailyMap[$sDate])) {
                    $dailyMap[$sDate] = ['date' => $sDate, 'revenue' => 0, 'collected' => 0, 'matches' => 0];
                }
                $dailyMap[$sDate]['revenue']   += $sAmt;
                $dailyMap[$sDate]['collected'] += $sAmt;
            }
        }
    } catch (Exception $sEx) {
        error_log("[REPORTS COUNTER SALES WARN] " . $sEx->getMessage());
    }

    // Chi phí vận hành trong kỳ
    $expWhere = ["1=1"];
    $expParams = [];
    if ($fromDate !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $fromDate)) {
        $expWhere[] = "expense_date >= ?";
        $expParams[] = $fromDate;
    }
    if ($toDate !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $toDate)) {
        $expWhere[] = "expense_date <= ?";
        $expParams[] = $toDate;
    }
    $totalExpenses = 0;
    $expensesByCategory = [];
    try {
        $expStmt = $pdo->prepare("SELECT category, category_name, SUM(amount) as cat_total, COUNT(*) as cat_count FROM expenses WHERE " . implode(' AND ', $expWhere) . " GROUP BY category, category_name");
        $expStmt->execute($expParams);
        foreach ($expStmt->fetchAll() as $er) {
            $cTotal = (int)$er['cat_total'];
            $totalExpenses += $cTotal;
            $expensesByCategory[] = [
                'category'     => $er['category'],
                'categoryName' => $er['category_name'],
                'amount'       => $cTotal,
                'count'        => (int)$er['cat_count']
            ];
        }
    } catch (Exception $ee) {
        error_log("[REPORTS EXPENSES WARN] " . $ee->getMessage());
    }

    // Tính số ngày trong kỳ lọc & tỷ lệ lấp đầy chuẩn
    // Giờ mở cửa thực tế: 05:30 - 11:30 (6h) + 14:30 - 22:30 (8h) = 14h/ngày
    $openHoursPerDay = 14.0;
    if ($fromDate !== '' && $toDate !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $fromDate) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $toDate)) {
        $dFrom = strtotime($fromDate);
        $dTo   = strtotime($toDate);
        $periodDays = ($dFrom !== false && $dTo !== false && $dTo >= $dFrom) ? (int)floor(($dTo - $dFrom) / 86400) + 1 : 1;
    } elseif (!empty($dailyMap)) {
        $dates = array_keys($dailyMap);
        sort($dates);
        $dFrom = strtotime($dates[0]);
        $dTo   = strtotime($dates[count($dates) - 1]);
        $periodDays = ($dFrom !== false && $dTo !== false && $dTo >= $dFrom) ? (int)floor(($dTo - $dFrom) / 86400) + 1 : 1;
    } else {
        $periodDays = 1;
    }

    $totalAvailableHours = max(1.0, $periodDays * max(1, $activePitchesCount) * $openHoursPerDay);
    $occupancyRate = round(min(100.0, ($totalBookedHours / $totalAvailableHours) * 100), 1);

    $singlePitchAvailableHours = max(1.0, $periodDays * $openHoursPerDay);
    foreach ($byPitchMap as &$pItem) {
        $pItem['occupancyRate'] = $pItem['isActive']
            ? round(min(100.0, ($pItem['bookedHours'] / $singlePitchAvailableHours) * 100), 1)
            : 0.0;
    }
    unset($pItem);

    $collectedRevenue = $cashRevenue + $vietqrRevenue;
    // Lợi nhuận tính cùng cơ sở với "Đã thu" (tiền thực thu trừ chi phí vận hành)
    $netProfit   = $collectedRevenue - $totalExpenses;
    $grossProfit = $netProfit;
    $avgRevenue  = $totalMatches > 0 ? (int)round($recognizedRevenue / $totalMatches) : 0;

    ksort($dailyMap);
    ksort($slotMap);

    return [
        'recognizedRevenue'       => $recognizedRevenue,
        'totalRevenue'            => $recognizedRevenue,
        'collectedRevenue'        => $collectedRevenue,
        'uncollectedRevenue'      => $uncollectedRevenue,
        'uncollectedUpcoming'     => $uncollectedUpcoming,
        'uncollectedOverdue'      => $uncollectedOverdue,
        'uncollectedUpcomingList' => $uncollectedUpcomingList,
        'uncollectedOverdueList'  => $uncollectedOverdueList,
        'pitchRecognizedRevenue'  => $pitchRecognizedRevenue,
        'pitchCollectedRevenue'   => $pitchCollectedRevenue,
        'depositRevenue'          => $depositCollected,
        'remainingRevenue'        => $remainingCollected,
        'servicesRevenue'         => $servicesRecognized,
        'servicesCollected'       => $servicesCollected,
        'counterSalesRevenue'     => $counterSalesRevenue,
        'cashRevenue'             => $cashRevenue,
        'vietqrRevenue'           => $vietqrRevenue,
        'totalExpenses'           => $totalExpenses,
        'hasExpenses'             => ($totalExpenses > 0),
        'netProfit'               => $netProfit,
        'grossProfit'             => $grossProfit,
        'totalMatches'            => $totalMatches,
        'totalBookedHours'        => round($totalBookedHours, 1),
        'totalAvailableHours'     => round($totalAvailableHours, 1),
        'activePitchesCount'      => $activePitchesCount,
        'periodDays'              => $periodDays,
        'openHoursPerDay'         => $openHoursPerDay,
        'occupancyRate'           => $occupancyRate,
        'avgRevenue'              => $avgRevenue,
        'totalBookings'           => $totalBookingsCount,
        'completedBookings'       => $completedBookingsCount,
        'cancelledBookings'       => $cancelledBookingsCount,
        'byType'                  => $byType,
        'byPitch'                 => array_values($byPitchMap),
        'dailyRevenue'            => array_values($dailyMap),
        'bySlot'                  => array_values($slotMap),
        'detailedBookings'        => $detailedBookings,
        'bookingsRows'            => $bookingsRows,
        'counterSalesRows'        => $counterSalesRows,
        'expensesByCategory'      => $expensesByCategory,
        'depositDeviantOrders'    => $depositDeviantOrders,
        'validBookingCodes'       => $validBookingCodes
    ];
}

function report_calc_delta_pct(int $current, int $previous): ?float {
    if ($previous === 0) {
        return $current === 0 ? 0.0 : null;
    }
    return round((($current - $previous) / abs($previous)) * 100, 1);
}

function handle_admin_finance_reports(string $action, string $method, PDO $pdo, array $data, array $actor): bool {
    if ($action !== 'reports' && $action !== 'export_reports_csv') {
        return false;
    }

    $mgr = require_manager_or_admin($pdo);

    $fromDate = sanitize_string($_GET['from'] ?? $data['from'] ?? '', 15);
    $toDate   = sanitize_string($_GET['to'] ?? $data['to'] ?? '', 15);
    $format   = strtolower(sanitize_string($_GET['format'] ?? $data['format'] ?? 'csv', 10));

    if ($fromDate !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $fromDate)) {
        $fromDate = '';
    }
    if ($toDate !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $toDate)) {
        $toDate = '';
    }
    if ($fromDate !== '' && $toDate !== '' && $fromDate > $toDate) {
        json_response(['success' => false, 'message' => 'Ngày bắt đầu (Từ) phải nhỏ hơn hoặc bằng ngày kết thúc (Đến).'], 400);
        return true;
    }

    $pitchesStmt = $pdo->query("SELECT id, name, type, type_name, status FROM pitches ORDER BY type ASC, id ASC");
    $pitchesRows = $pitchesStmt->fetchAll();

    $core = report_compute_period_core($pdo, $fromDate, $toDate, $pitchesRows, true);

    // Kỳ trước để tính ±% (khi có khoảng from..to hợp lệ)
    $deltas = [
        'recognizedPct'  => null,
        'collectedPct'   => null,
        'uncollectedPct' => null,
        'profitPct'      => null,
        'prevFrom'       => null,
        'prevTo'         => null
    ];
    if ($fromDate !== '' && $toDate !== '') {
        $dFrom = strtotime($fromDate);
        $dTo   = strtotime($toDate);
        if ($dFrom !== false && $dTo !== false && $dTo >= $dFrom) {
            $days = (int)floor(($dTo - $dFrom) / 86400) + 1;
            $prevTo   = date('Y-m-d', $dFrom - 86400);
            $prevFrom = date('Y-m-d', $dFrom - ($days * 86400));
            $prevCore = report_compute_period_core($pdo, $prevFrom, $prevTo, $pitchesRows, false);
            $deltas = [
                'recognizedPct'  => report_calc_delta_pct($core['recognizedRevenue'], $prevCore['recognizedRevenue']),
                'collectedPct'   => report_calc_delta_pct($core['collectedRevenue'], $prevCore['collectedRevenue']),
                'uncollectedPct' => report_calc_delta_pct($core['uncollectedRevenue'], $prevCore['uncollectedRevenue']),
                'profitPct'      => report_calc_delta_pct($core['netProfit'], $prevCore['netProfit']),
                'prevFrom'       => $prevFrom,
                'prevTo'         => $prevTo
            ];
        }
    }

    // === ĐỐI SOÁT ĐỘC LẬP 3 NGUỒN ===
    // (a) Giao dịch ngân hàng đã khớp (bank_transactions) vs tiền chuyển khoản trong báo cáo
    $bankTotal = 0;
    $bankTxCount = 0;
    $bankUnmatchedCount = 0;
    $bankSourceAvailable = true;
    try {
        $bkWhere = ["match_status IN ('matched', 'resolved')"];
        $bkParams = [];
        if ($fromDate !== '') {
            $bkWhere[] = "DATE(COALESCE(transaction_date, created_at)) >= ?";
            $bkParams[] = $fromDate;
        }
        if ($toDate !== '') {
            $bkWhere[] = "DATE(COALESCE(transaction_date, created_at)) <= ?";
            $bkParams[] = $toDate;
        }
        $bkStmt = $pdo->prepare("SELECT COALESCE(SUM(transfer_amount), 0) AS total_amt, COUNT(*) AS cnt FROM bank_transactions WHERE " . implode(' AND ', $bkWhere));
        $bkStmt->execute($bkParams);
        $bkRow = $bkStmt->fetch();
        $bankTotal = (int)($bkRow['total_amt'] ?? 0);
        $bankTxCount = (int)($bkRow['cnt'] ?? 0);

        $umWhere = ["match_status IN ('unmatched', 'underpaid', 'overpaid')"];
        $umParams = [];
        if ($fromDate !== '') {
            $umWhere[] = "DATE(COALESCE(transaction_date, created_at)) >= ?";
            $umParams[] = $fromDate;
        }
        if ($toDate !== '') {
            $umWhere[] = "DATE(COALESCE(transaction_date, created_at)) <= ?";
            $umParams[] = $toDate;
        }
        $umStmt = $pdo->prepare("SELECT COUNT(*) FROM bank_transactions WHERE " . implode(' AND ', $umWhere));
        $umStmt->execute($umParams);
        $bankUnmatchedCount = (int)$umStmt->fetchColumn();
    } catch (Exception $e) {
        $bankSourceAvailable = false;
        error_log("[REPORTS BANK RECON WARN] " . $e->getMessage());
    }
    $bankDiff = $core['vietqrRevenue'] - $bankTotal;
    $bankCheck = [
        'key'            => 'bank_vs_transfer',
        'label'          => 'Giao dịch ngân hàng đã khớp (bank_transactions) vs Chuyển khoản báo cáo',
        'sourceTotal'    => $bankTotal,
        'reportTotal'    => $core['vietqrRevenue'],
        'diff'           => $bankDiff,
        'absDiff'        => abs($bankDiff),
        'txCount'        => $bankTxCount,
        'unmatchedCount' => $bankUnmatchedCount,
        'available'      => $bankSourceAvailable,
        'isMatched'      => ($bankSourceAvailable && $bankDiff === 0)
    ];

    // (b) Tiền mặt các ca đã chốt (shifts) vs tiền mặt trong báo cáo
    $shiftCashTotal = 0;
    $shiftCount = 0;
    $shiftSourceAvailable = true;
    try {
        $shWhere = ["status IN ('closed', 'confirmed')"];
        $shParams = [];
        if ($fromDate !== '') {
            $shWhere[] = "DATE(start_time) >= ?";
            $shParams[] = $fromDate;
        }
        if ($toDate !== '') {
            $shWhere[] = "DATE(start_time) <= ?";
            $shParams[] = $toDate;
        }
        $shStmt = $pdo->prepare("SELECT COALESCE(SUM(COALESCE(actual_cash_received, cash_total)), 0) AS total_cash, COUNT(*) AS cnt FROM shifts WHERE " . implode(' AND ', $shWhere));
        $shStmt->execute($shParams);
        $shRow = $shStmt->fetch();
        $shiftCashTotal = (int)($shRow['total_cash'] ?? 0);
        $shiftCount = (int)($shRow['cnt'] ?? 0);
    } catch (Exception $e) {
        $shiftSourceAvailable = false;
        error_log("[REPORTS SHIFT RECON WARN] " . $e->getMessage());
    }
    $shiftCashDiff = $core['cashRevenue'] - $shiftCashTotal;
    $shiftCashCheck = [
        'key'         => 'shifts_vs_cash',
        'label'       => 'Tiền mặt các ca đã chốt (shifts) vs Tiền mặt báo cáo',
        'sourceTotal' => $shiftCashTotal,
        'reportTotal' => $core['cashRevenue'],
        'diff'        => $shiftCashDiff,
        'absDiff'     => abs($shiftCashDiff),
        'shiftCount'  => $shiftCount,
        'available'   => $shiftSourceAvailable,
        'isMatched'   => ($shiftSourceAvailable && $shiftCashDiff === 0)
    ];

    // (c) Cọc đã thu + Tiền còn lại đã thu vs Tiền sân đã thu (+ danh sách đơn cọc lệch tỷ lệ)
    $pitchPartsSum = $core['depositRevenue'] + $core['remainingRevenue'];
    $pitchPartsDiff = $pitchPartsSum - $core['pitchCollectedRevenue'];
    $pitchCollectedCheck = [
        'key'            => 'pitch_collected_parts',
        'label'          => 'Cọc đã thu + Tiền còn lại đã thu vs Tiền sân đã thu',
        'deposit'        => $core['depositRevenue'],
        'remaining'      => $core['remainingRevenue'],
        'sourceTotal'    => $pitchPartsSum,
        'reportTotal'    => $core['pitchCollectedRevenue'],
        'diff'           => $pitchPartsDiff,
        'absDiff'        => abs($pitchPartsDiff),
        'deviantOrders'  => $core['depositDeviantOrders'],
        'deviantCount'   => count($core['depositDeviantOrders']),
        'isMatched'      => ($pitchPartsDiff === 0)
    ];

    $reconciliationAllMatched = $bankCheck['isMatched'] && $shiftCashCheck['isMatched'] && $pitchCollectedCheck['isMatched'];
    $reconciliation = [
        'isMatched'           => $reconciliationAllMatched,
        'bankCheck'           => $bankCheck,
        'shiftCashCheck'      => $shiftCashCheck,
        'pitchCollectedCheck' => $pitchCollectedCheck
    ];

    // Giữ tương thích ngược formula1 & formula2 cho test cũ
    $f1Sum = $core['cashRevenue'] + $core['vietqrRevenue'] + $core['uncollectedRevenue'];
    $f1Diff = abs($f1Sum - $core['recognizedRevenue']);
    $formula1 = [
        'cash'        => $core['cashRevenue'],
        'transfer'    => $core['vietqrRevenue'],
        'uncollected' => $core['uncollectedRevenue'],
        'calculated'  => $f1Sum,
        'target'      => $core['recognizedRevenue'],
        'diff'        => $f1Diff,
        'isMatched'   => ($f1Diff === 0)
    ];

    $f2Sum = $core['depositRevenue'] + $core['remainingRevenue'] + $core['servicesCollected'];
    $f2Diff = abs($f2Sum - $core['collectedRevenue']);
    $formula2 = [
        'deposit'    => $core['depositRevenue'],
        'remaining'  => $core['remainingRevenue'],
        'services'   => $core['servicesCollected'],
        'calculated' => $f2Sum,
        'target'     => $core['collectedRevenue'],
        'diff'       => $f2Diff,
        'isMatched'  => ($f2Diff === 0)
    ];

    // === XUẤT FILE (CSV / EXCEL) + AUDIT LOG ===
    if ($action === 'export_reports_csv') {
        @header_remove('X-Powered-By');
        $safeFrom = $fromDate !== '' ? $fromDate : 'All';
        $safeTo   = $toDate !== '' ? $toDate : 'All';

        if (function_exists('write_audit_log')) {
            write_audit_log(
                $pdo,
                'EXPORT_REPORTS',
                null,
                null,
                "Xuất báo cáo doanh thu (" . strtoupper($format) . ") kỳ {$safeFrom}..{$safeTo} — Ghi nhận: " . number_format($core['recognizedRevenue']) . "đ, Đã thu: " . number_format($core['collectedRevenue']) . "đ",
                $mgr
            );
        }

        $csvSafe = static function ($val) {
            if (is_int($val) || is_float($val)) {
                return $val;
            }
            $s = (string)($val ?? '');
            if ($s !== '' && !is_numeric($s) && preg_match('/^[=+\-@\t\r]/', $s)) {
                return "'" . $s;
            }
            return $s;
        };

        if ($format === 'xls' || $format === 'excel') {
            header('Content-Type: application/vnd.ms-excel; charset=utf-8');
            header('Content-Disposition: attachment; filename="Bao_Cao_Doanh_Thu_San_Bong_' . $safeFrom . '_' . $safeTo . '.xls"');
            $e = static fn($v): string => htmlspecialchars((string)$csvSafe($v), ENT_QUOTES, 'UTF-8');
            echo "\xEF\xBB\xBF<html><head><meta charset='UTF-8'></head><body>";
            echo "<h2>BÁO CÁO DOANH THU &amp; ĐỐI SOÁT SÂN BÓNG PRO</h2>";
            echo "<p>Kỳ báo cáo: {$e($safeFrom)} đến {$e($safeTo)} | Xuất lúc: " . date('d/m/Y H:i:s') . "</p>";
            echo "<table border='1' cellpadding='4' cellspacing='0'><tr><th>Chỉ tiêu</th><th>Số tiền (VNĐ)</th></tr>";
            $summaryRows = [
                ['Doanh thu ghi nhận', $core['recognizedRevenue']],
                ['Đã thu (Tiền mặt + Chuyển khoản)', $core['collectedRevenue']],
                ['Chưa thu (Chưa đến giờ đá)', $core['uncollectedUpcoming']],
                ['Chưa thu (Đã đá chưa tất toán)', $core['uncollectedOverdue']],
                ['Tổng chi phí vận hành', $core['totalExpenses']],
                ['Lợi nhuận (Đã thu - Chi phí)', $core['netProfit']],
                ['Cọc đã thu', $core['depositRevenue']],
                ['Tiền sân còn lại đã thu', $core['remainingRevenue']],
                ['Dịch vụ & nước (gồm quầy)', $core['servicesRevenue']],
                ['Tiền mặt đã thu', $core['cashRevenue']],
                ['Chuyển khoản VietQR đã thu', $core['vietqrRevenue']]
            ];
            foreach ($summaryRows as $sr) {
                echo "<tr><td>{$e($sr[0])}</td><td>" . (int)$sr[1] . "</td></tr>";
            }
            echo "</table><br><table border='1' cellpadding='4' cellspacing='0'><tr><th>Mã đơn</th><th>Ngày đá</th><th>Giờ đá</th><th>Sân</th><th>Khách hàng</th><th>Tổng tiền</th><th>Đã thu</th><th>Chưa thu</th><th>Trạng thái</th></tr>";
            foreach ($core['detailedBookings'] as $bRow) {
                echo "<tr><td>{$e($bRow['code'])}</td><td>{$e($bRow['booking_date'])}</td><td>{$e($bRow['slot_time'])}</td><td>{$e($bRow['pitch_name'])}</td><td>{$e($bRow['customer_name'])}</td><td>" . (int)$bRow['total_price'] . "</td><td>" . (int)$bRow['paid_amount'] . "</td><td>" . (int)$bRow['remaining_amount'] . "</td><td>{$e($bRow['status'])}</td></tr>";
            }
            echo "</table></body></html>";
            exit;
        }

        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="Bao_Cao_Doanh_Thu_San_Bong_' . $safeFrom . '_' . $safeTo . '.csv"');
        echo "\xEF\xBB\xBF";

        $out = fopen('php://output', 'w');
        fputcsv($out, ['BÁO CÁO TÀI CHÍNH & VẬN HÀNH SÂN BÓNG PRO']);
        fputcsv($out, ['Kỳ báo cáo:', $csvSafe(($fromDate ?: 'Từ đầu') . ' đến ' . ($toDate ?: 'Hiện tại')), 'Xuất lúc:', date('d/m/Y H:i:s')]);
        fputcsv($out, []);

        fputcsv($out, ['I. TỔNG HỢP DOANH THU & DÒNG TIỀN']);
        fputcsv($out, ['Chỉ tiêu', 'Số tiền (VNĐ)']);
        fputcsv($out, ['Doanh thu ghi nhận (đơn hợp lệ)', $core['recognizedRevenue']]);
        fputcsv($out, ['Đã thu (Tiền mặt + Chuyển khoản)', $core['collectedRevenue']]);
        fputcsv($out, ['Chưa thu - Chưa đến giờ đá', $core['uncollectedUpcoming']]);
        fputcsv($out, ['Chưa thu - Đã đá chưa tất toán', $core['uncollectedOverdue']]);
        fputcsv($out, ['Tổng chi phí vận hành trong kỳ', $core['totalExpenses']]);
        fputcsv($out, ['Lợi nhuận (Đã thu - Chi phí)', $core['netProfit']]);
        fputcsv($out, ['Tiền cọc đã thu', $core['depositRevenue']]);
        fputcsv($out, ['Tiền sân còn lại đã thu', $core['remainingRevenue']]);
        fputcsv($out, ['Doanh thu nước & dịch vụ (gồm bán lẻ quầy)', $core['servicesRevenue']]);
        fputcsv($out, ['Thực thu Tiền mặt', $core['cashRevenue']]);
        fputcsv($out, ['Thực thu Chuyển khoản VietQR', $core['vietqrRevenue']]);
        fputcsv($out, ['Tổng số ca thi đấu', $core['totalMatches']]);
        fputcsv($out, ['Tỷ lệ lấp đầy (%)', $core['occupancyRate']]);
        fputcsv($out, []);

        fputcsv($out, ['II. HIỆU SUẤT CHI TIẾT THEO TỪNG SÂN']);
        fputcsv($out, ['Mã sân', 'Tên sân', 'Loại sân', 'Trạng thái', 'Số ca', 'Lấp đầy (%)', 'Đã thu', 'Doanh thu ghi nhận']);
        foreach ($core['byPitch'] as $pItem) {
            fputcsv($out, [
                $csvSafe($pItem['id']),
                $csvSafe($pItem['name']),
                $csvSafe($pItem['typeName']),
                $csvSafe($pItem['status']),
                $pItem['matches'],
                $pItem['occupancyRate'],
                $pItem['collectedRevenue'],
                $pItem['revenue']
            ]);
        }
        fputcsv($out, []);

        fputcsv($out, ['III. BẢNG KÊ CHI TIẾT ĐƠN ĐẶT SÂN TRONG KỲ']);
        fputcsv($out, ['Mã đơn', 'Ngày đá', 'Giờ đá', 'Sân bóng', 'Khách hàng', 'Số điện thoại', 'Tổng tiền', 'Cọc đã thu', 'Đã thu', 'Chưa thu', 'Dịch vụ', 'Trạng thái ca', 'Trạng thái TT', 'Phương thức TT']);
        foreach ($core['detailedBookings'] as $bRow) {
            fputcsv($out, [
                $csvSafe($bRow['code']),
                $csvSafe($bRow['booking_date']),
                $csvSafe($bRow['slot_time']),
                $csvSafe($bRow['pitch_name']),
                $csvSafe($bRow['customer_name']),
                $csvSafe($bRow['phone']),
                $bRow['total_price'],
                $bRow['deposit_amount'],
                $bRow['paid_amount'],
                $bRow['remaining_amount'],
                $bRow['service_price'],
                $csvSafe($bRow['status']),
                $csvSafe($bRow['payment_status']),
                $csvSafe($bRow['payment_method'])
            ]);
        }
        fclose($out);
        exit;
    }

    $byType = $core['byType'];
    $byType['5']  = $byType['p5'];
    $byType['7']  = $byType['p7'];
    $byType['11'] = $byType['p11'];

    $summary = [
        'recognizedRevenue'       => $core['recognizedRevenue'],
        'totalRevenue'            => $core['recognizedRevenue'],
        'collectedRevenue'        => $core['collectedRevenue'],
        'uncollectedRevenue'      => $core['uncollectedRevenue'],
        'uncollectedUpcoming'     => $core['uncollectedUpcoming'],
        'uncollectedOverdue'      => $core['uncollectedOverdue'],
        'pitchRecognizedRevenue'  => $core['pitchRecognizedRevenue'],
        'pitchCollectedRevenue'   => $core['pitchCollectedRevenue'],
        'totalExpenses'           => $core['totalExpenses'],
        'hasExpenses'             => $core['hasExpenses'],
        'netProfit'               => $core['netProfit'],
        'grossProfit'             => $core['grossProfit'],
        'depositRevenue'          => $core['depositRevenue'],
        'remainingRevenue'        => $core['remainingRevenue'],
        'remaining70Revenue'      => $core['remainingRevenue'],
        'cashRevenue'             => $core['cashRevenue'],
        'transferRevenue'         => $core['vietqrRevenue'],
        'vietqrRevenue'           => $core['vietqrRevenue'],
        'serviceRevenue'          => $core['servicesRevenue'],
        'servicesRevenue'         => $core['servicesRevenue'],
        'servicesCollected'       => $core['servicesCollected'],
        'counterSalesRevenue'     => $core['counterSalesRevenue'],
        'totalBookings'           => $core['totalBookings'],
        'completedBookings'       => $core['completedBookings'],
        'cancelledBookings'       => $core['cancelledBookings'],
        'totalMatches'            => $core['totalMatches'],
        'totalBookedHours'        => $core['totalBookedHours'],
        'totalAvailableHours'     => $core['totalAvailableHours'],
        'activePitchesCount'      => $core['activePitchesCount'],
        'periodDays'              => $core['periodDays'],
        'openHoursPerDay'         => $core['openHoursPerDay'],
        'avgRevenue'              => $core['avgRevenue'],
        'occupancyRate'           => $core['occupancyRate']
    ];

    json_response([
        'success' => true,
        'data'    => array_merge($summary, [
            'period'                  => ['from' => $fromDate, 'to' => $toDate],
            'deltas'                  => $deltas,
            'reconciliation'          => $reconciliation,
            'formula1'                => $formula1,
            'formula2'                => $formula2,
            'uncollectedUpcomingList' => $core['uncollectedUpcomingList'],
            'uncollectedOverdueList'  => $core['uncollectedOverdueList'],
            'dailyRevenue'            => $core['dailyRevenue'],
            'bySlot'                  => $core['bySlot'],
            'detailedBookings'        => $core['detailedBookings'],
            'expensesByCategory'      => $core['expensesByCategory'],
            'summary'                 => $summary,
            'byType'                  => $byType,
            'byPitch'                 => $core['byPitch']
        ])
    ]);
    return true;
}
