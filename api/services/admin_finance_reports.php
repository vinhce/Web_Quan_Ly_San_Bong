<?php
declare(strict_types=1);

if (!defined('SANBONG_ADMIN_ROUTER')) {
    http_response_code(403);
    exit;
}

function handle_admin_finance_reports(string $action, string $method, PDO $pdo, array $data, array $actor): bool {
    if ($action !== 'reports' && $action !== 'export_reports_csv') {
        return false;
    }

    $mgr = require_manager_or_admin($pdo);

    $fromDate = sanitize_string($_GET['from'] ?? $data['from'] ?? '', 15);
    $toDate   = sanitize_string($_GET['to'] ?? $data['to'] ?? '', 15);

    $pitchesStmt = $pdo->query("SELECT id, name, type, type_name, status FROM pitches ORDER BY type ASC, id ASC");
    $pitchesRows = $pitchesStmt->fetchAll();

    $byPitchMap = [];
    $pitchCountByType = [5 => 0, 7 => 0, 11 => 0];
    foreach ($pitchesRows as $p) {
        $pType = (int)$p['type'];
        if (isset($pitchCountByType[$pType])) {
            $pitchCountByType[$pType]++;
        }
        $byPitchMap[$p['id']] = [
            'id'               => $p['id'],
            'name'             => $p['name'],
            'type'             => $pType,
            'typeName'         => $p['type_name'],
            'status'           => $p['status'],
            'matches'          => 0,
            'depositRevenue'   => 0,
            'remainingRevenue' => 0,
            'servicesRevenue'  => 0,
            'revenue'          => 0
        ];
    }

    $whereClauses = [];
    $params = [];
    if (!empty($fromDate) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $fromDate)) {
        $whereClauses[] = "b.booking_date >= ?";
        $params[] = $fromDate;
    }
    if (!empty($toDate) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $toDate)) {
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

    $totalRevenue           = 0;
    $depositRevenue         = 0;
    $remaining70Revenue     = 0;
    $cashRevenue            = 0;
    $vietqrRevenue          = 0;
    $servicesRevenue        = 0;
    $counterSalesRevenue    = 0;
    $totalMatches           = 0;
    $totalBookingsCount     = count($bookingsRows);
    $completedBookingsCount = 0;
    $cancelledBookingsCount = 0;
    $debtRevenue            = 0;
    $detailedBookings       = [];
    $dailyMap               = [];

    $byType = [
        'p5'  => ['revenue' => 0, 'count' => 0, 'matches' => 0, 'pitchCount' => $pitchCountByType[5]],
        'p7'  => ['revenue' => 0, 'count' => 0, 'matches' => 0, 'pitchCount' => $pitchCountByType[7]],
        'p11' => ['revenue' => 0, 'count' => 0, 'matches' => 0, 'pitchCount' => $pitchCountByType[11]]
    ];

    foreach ($bookingsRows as $row) {
        $bStatus   = $row['status'] ?? 'Đã xác nhận';
        $payStatus = $row['payment_status'] ?? 'Chờ duyệt cọc';
        $payMethod = $row['payment_method'] ?? 'VietQR Chuyển khoản';
        $noteStr   = $row['note'] ?? '';
        $pId       = $row['pitch_id'] ?? '';
        $pType     = (int)($row['pitch_type'] ?? (stripos($pId, 'P5') === 0 ? 5 : (stripos($pId, 'P11') === 0 ? 11 : 7)));
        $typeKey   = $pType === 5 ? 'p5' : ($pType === 11 ? 'p11' : 'p7');

        $totPrice  = max(0, (int)($row['total_price'] ?? 0));
        $depAmt    = max(0, (int)($row['deposit_amount'] ?? 0));
        $paidAmt   = max(0, (int)($row['paid_amount'] ?? 0));
        $remAmt    = max(0, (int)($row['remaining_amount'] ?? 0));

        if ($bStatus === 'Đã hủy' || $bStatus === 'Khách chưa đến' || in_array($payStatus, ['Đã hủy', 'Đã hoàn cọc 100%', 'Tịch thu cọc 30%', 'Phạt 50% cọc', 'Bảo lưu cọc 30%'], true)) {
            $cancelledBookingsCount++;
        }
        if ($bStatus === 'Hoàn thành' || in_array($payStatus, ['Đã thanh toán đủ', 'Đã thanh toán 100%'], true)) {
            $completedBookingsCount++;
        }

        if ($payStatus === 'Đã hủy' || $payStatus === 'Đã hoàn cọc 100%' || ($bStatus === 'Đã hủy' && !in_array($payStatus, ['Tịch thu cọc 30%', 'Phạt 50% cọc', 'Bảo lưu cọc 30%'], true))) {
            continue;
        }

        $orderRevenue = 0;
        $orderDeposit = 0;
        $orderRemaining = 0;
        $orderServices = 0;
        $orderDebt = 0;
        $orderPaid = 0;
        $isMatchCounted = false;
        $isDepositConfirmed = true;

        if ($payStatus === 'Tịch thu cọc 30%' || $bStatus === 'Khách chưa đến') {
            $orderDeposit = $depAmt;
            $orderRevenue = $depAmt;
            $orderPaid    = $depAmt;
        } elseif ($payStatus === 'Phạt 50% cọc') {
            $forfeited    = (int)round($depAmt * 0.5);
            $orderDeposit = $forfeited;
            $orderRevenue = $forfeited;
            $orderPaid    = $forfeited;
        } elseif ($payStatus === 'Bảo lưu cọc 30%') {
            $orderDeposit = $depAmt;
            $orderRevenue = $depAmt;
            $orderPaid    = $depAmt;
        } else {
            $isMatchCounted = ($bStatus !== 'Đã hủy' && $bStatus !== 'Khách chưa đến');
            $orderRevenue = $totPrice;

            $srvs = !empty($row['services_json']) ? json_decode($row['services_json'], true) : [];
            if (is_array($srvs)) {
                foreach ($srvs as $s) {
                    $sTotal = isset($s['total']) ? (int)$s['total'] : ((int)($s['price'] ?? 0) * max(1, (int)($s['quantity'] ?? 1)));
                    $orderServices += max(0, $sTotal);
                }
            }

            $pitchNet = max(0, $totPrice - $orderServices);
            $isDepositConfirmed = in_array($payStatus, ['Đã cọc 30%', 'Đã thanh toán đủ', 'Đã thanh toán 100%', 'deposited', 'completed', 'paid'], true);

            if ($isDepositConfirmed) {
                $orderDeposit = min($depAmt, $pitchNet);
                if ($orderDeposit === 0) {
                    $orderDeposit = (int)round($pitchNet * 0.3);
                }
                $orderRemaining = max(0, $pitchNet - $orderDeposit);

                if ($bStatus === 'Hoàn thành' || in_array($payStatus, ['Đã thanh toán đủ', 'Đã thanh toán 100%', 'completed', 'paid'], true)) {
                    $orderPaid = $totPrice;
                    $orderDebt = 0;
                } else {
                    $orderPaid = ($paidAmt > 0) ? min($totPrice, $paidAmt) : $orderDeposit;
                    $orderDebt = max(0, $totPrice - $orderPaid);
                }
            } else {
                // Trạng thái 'Chờ duyệt cọc', 'pending_deposit', 'unpaid', v.v. - Không tính cọc ảo vào doanh thu thực thu
                $orderDeposit   = 0;
                $orderRemaining = $pitchNet;
                $orderPaid      = ($paidAmt > 0) ? min($totPrice, $paidAmt) : 0;
                $orderDebt      = max(0, $totPrice - $orderPaid);
            }
        }

        $totalRevenue       += $orderRevenue;
        $depositRevenue     += $orderDeposit;
        $remaining70Revenue += $orderRemaining;
        $servicesRevenue    += $orderServices;
        $debtRevenue        += $orderDebt;

        $isCash = (mb_stripos($payMethod, 'Tiền mặt') !== false);
        if ($isCash) {
            $cashRevenue += $orderPaid;
        } else {
            $vietqrRevenue += $orderPaid;
        }

        if ($isMatchCounted) {
            $totalMatches++;
            $byType[$typeKey]['count']++;
            $byType[$typeKey]['matches']++;
        }
        $byType[$typeKey]['revenue'] += $orderRevenue;

        if (isset($byPitchMap[$pId])) {
            if ($isMatchCounted) {
                $byPitchMap[$pId]['matches']++;
            }
            $byPitchMap[$pId]['depositRevenue']   += $orderDeposit;
            $byPitchMap[$pId]['remainingRevenue'] += $orderRemaining;
            $byPitchMap[$pId]['servicesRevenue']  += $orderServices;
            $byPitchMap[$pId]['revenue']          += $orderRevenue;
        }

        $bDate = $row['booking_date'] ?? date('Y-m-d');
        if (!isset($dailyMap[$bDate])) {
            $dailyMap[$bDate] = ['date' => $bDate, 'revenue' => 0, 'matches' => 0];
        }
        $dailyMap[$bDate]['revenue'] += $orderRevenue;
        if ($isMatchCounted) {
            $dailyMap[$bDate]['matches']++;
        }

        $detailedBookings[] = [
            'code'             => $row['code'] ?? '',
            'booking_date'     => $row['booking_date'] ?? '',
            'slot_time'        => $row['slot_time'] ?? '',
            'pitch_id'         => $row['pitch_id'] ?? '',
            'pitch_name'       => $row['pitch_name'] ?? $row['pitch_id'] ?? '',
            'pitch_type'       => $pType,
            'customer_name'    => $row['customer_name'] ?? '',
            'phone'            => $row['phone'] ?? '',
            'total_price'         => $totPrice,
            'deposit_amount'      => $orderDeposit,
            'unconfirmed_deposit' => (!$isDepositConfirmed ? $depAmt : 0),
            'remaining_amount'    => $orderDebt,
            'service_price'    => $orderServices,
            'status'           => $bStatus,
            'payment_status'   => $payStatus,
            'payment_method'   => $payMethod,
            'note'             => $noteStr
        ];
    }

    $salesWhere = ["(booking_code IS NULL OR booking_code = '')", "total_amount > 0"];
    $salesParams = [];
    if (!empty($fromDate) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $fromDate)) {
        $salesWhere[] = "DATE(created_at) >= ?";
        $salesParams[] = $fromDate;
    }
    if (!empty($toDate) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $toDate)) {
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
            $servicesRevenue     += $sAmt;
            $totalRevenue        += $sAmt;
            if (mb_stripos($sRow['payment_method'] ?? '', 'Tiền mặt') !== false) {
                $cashRevenue += $sAmt;
            } else {
                $vietqrRevenue += $sAmt;
            }
        }
    } catch (Exception $sEx) {
        error_log("[REPORTS COUNTER SALES WARN] " . $sEx->getMessage());
    }

    $avgRevenue = $totalMatches > 0 ? (int)round($totalRevenue / $totalMatches) : 0;

    $expWhere = ["1=1"];
    $expParams = [];
    if (!empty($fromDate) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $fromDate)) {
        $expWhere[] = "expense_date >= ?";
        $expParams[] = $fromDate;
    }
    if (!empty($toDate) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $toDate)) {
        $expWhere[] = "expense_date <= ?";
        $expParams[] = $toDate;
    }
    $totalExpenses = 0;
    $expensesByCategory = [];
    try {
        $expStmt = $pdo->prepare("SELECT category, category_name, SUM(amount) as cat_total, COUNT(*) as cat_count FROM expenses WHERE " . implode(' AND ', $expWhere) . " GROUP BY category, category_name");
        $expStmt->execute($expParams);
        $expRows = $expStmt->fetchAll();
        foreach ($expRows as $er) {
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

    $netProfit = $totalRevenue - $totalExpenses;

    if ($action === 'export_reports_csv') {
        @header_remove('X-Powered-By');
        $safeFrom = (!empty($fromDate) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $fromDate)) ? $fromDate : 'All';
        $safeTo   = (!empty($toDate) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $toDate)) ? $toDate : 'All';
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="Bao_Cao_Doanh_Thu_San_Bong_' . $safeFrom . '_' . $safeTo . '.csv"');
        echo "\xEF\xBB\xBF";

        $out = fopen('php://output', 'w');
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
        fputcsv($out, ['BÁO CÁO TÀI CHÍNH & VẬN HÀNH SÂN BÓNG PRO']);
        fputcsv($out, ['Kỳ báo cáo:', $csvSafe(($fromDate ?: 'Từ đầu') . ' đến ' . ($toDate ?: 'Hiện tại')), 'Xuất lúc:', date('d/m/Y H:i:s')]);
        fputcsv($out, []);

        fputcsv($out, ['I. TỔNG HỢP DOANH THU & DÒNG TIỀN']);
        fputcsv($out, ['Chỉ tiêu', 'Số tiền (VNĐ)']);
        fputcsv($out, ['Tổng doanh thu thực tế (100%)', $totalRevenue]);
        fputcsv($out, ['Tổng chi phí vận hành trong kỳ', $totalExpenses]);
        fputcsv($out, ['Lãi ròng (Doanh thu - Chi phí)', $netProfit]);
        fputcsv($out, ['Tiền cọc giữ sân (30%)', $depositRevenue]);
        fputcsv($out, ['Thu tất toán sau trận (70%)', $remaining70Revenue]);
        fputcsv($out, ['Doanh thu nước & dịch vụ (gồm bán lẻ tại quầy)', $servicesRevenue]);
        fputcsv($out, ['Trong đó: Bán lẻ nước tại quầy', $counterSalesRevenue]);
        fputcsv($out, ['Thực thu Tiền mặt tại quầy', $cashRevenue]);
        fputcsv($out, ['Thực thu Chuyển khoản VietQR', $vietqrRevenue]);
        fputcsv($out, ['Tổng số trận hoàn thành', $totalMatches]);
        fputcsv($out, []);

        fputcsv($out, ['II. DOANH THU CHI TIẾT THEO TỪNG SÂN']);
        fputcsv($out, ['Mã sân', 'Tên sân', 'Loại sân', 'Trạng thái', 'Số trận', 'Tiền cọc (30%)', 'Thu sau trận (70%)', 'Dịch vụ kèm đơn', 'Tổng doanh thu']);
        foreach ($byPitchMap as $pItem) {
            fputcsv($out, [
                $csvSafe($pItem['id']),
                $csvSafe($pItem['name']),
                $csvSafe($pItem['typeName']),
                $csvSafe($pItem['status']),
                $pItem['matches'],
                $pItem['depositRevenue'],
                $pItem['remainingRevenue'],
                $pItem['servicesRevenue'],
                $pItem['revenue']
            ]);
        }
        fputcsv($out, []);

        fputcsv($out, ['III. BẢNG KÊ CHI TIẾT ĐƠN ĐẶT SÂN TRONG KỲ']);
        fputcsv($out, ['Mã đơn', 'Ngày đá', 'Giờ đá', 'Sân bóng', 'Khách hàng', 'Số điện thoại', 'Tổng tiền', 'Tiền cọc', 'Còn lại', 'Tiền nước / Dịch vụ', 'Trạng thái ca', 'Trạng thái TT', 'Phương thức TT', 'Ghi chú']);
        foreach ($bookingsRows as $bRow) {
            $bSrvs = !empty($bRow['services_json']) ? json_decode($bRow['services_json'], true) : [];
            $bSrvSum = 0;
            if (is_array($bSrvs)) {
                foreach ($bSrvs as $bs) {
                    $bSrvSum += (int)($bs['total'] ?? (($bs['price'] ?? 0) * ($bs['quantity'] ?? 1)));
                }
            }
            fputcsv($out, [
                $csvSafe($bRow['code']),
                $csvSafe($bRow['booking_date']),
                $csvSafe($bRow['slot_time']),
                $csvSafe($bRow['pitch_name'] ?? $bRow['pitch_id']),
                $csvSafe($bRow['customer_name']),
                $csvSafe($bRow['phone']),
                $bRow['total_price'],
                $bRow['deposit_amount'],
                $bRow['remaining_amount'],
                $bSrvSum,
                $csvSafe($bRow['status']),
                $csvSafe($bRow['payment_status']),
                $csvSafe($bRow['payment_method']),
                $csvSafe($bRow['note'])
            ]);
        }
        fputcsv($out, []);

        fputcsv($out, ['IV. BÁN LẺ NƯỚC & DỊCH VỤ TẠI QUẦY']);
        fputcsv($out, ['Thời gian', 'Mã SP', 'Tên dịch vụ/sản phẩm', 'Số lượng', 'Đơn giá', 'Thành tiền', 'Phương thức TT', 'Ghi chú']);
        foreach ($counterSalesRows as $sRow) {
            fputcsv($out, [
                $csvSafe($sRow['created_at']),
                $csvSafe($sRow['service_id']),
                $csvSafe($sRow['service_name']),
                $sRow['quantity'],
                $sRow['unit_price'],
                $sRow['total_amount'],
                $csvSafe($sRow['payment_method']),
                $csvSafe($sRow['note'])
            ]);
        }

        fputcsv($out, []);
        fputcsv($out, ['V. BÁO CÁO CHI PHÍ & LÃI RÒNG']);
        fputcsv($out, ['Tổng Doanh Thu', $totalRevenue]);
        fputcsv($out, ['Tổng Chi Phí', $totalExpenses]);
        fputcsv($out, ['Lãi Ròng (Doanh thu - Chi phí)', $netProfit]);

        fclose($out);
        exit;
    }

    $byType['5']  = $byType['p5'];
    $byType['7']  = $byType['p7'];
    $byType['11'] = $byType['p11'];

    ksort($dailyMap);
    $dailyRevenue = array_values($dailyMap);

    $numDays = max(1, count($dailyRevenue));
    $totalPitches = 17;
    $totalHoursOpenPerDay = 17.5;
    $totalAvailableHours = $numDays * $totalPitches * $totalHoursOpenPerDay;
    $bookedHours = $totalMatches * 1.5;
    $occupancyRate = round(min(100, ($bookedHours / max(1, $totalAvailableHours)) * 100), 1);

    $collectedRevenue = $cashRevenue + $vietqrRevenue;
    $grossProfit = $collectedRevenue - $totalExpenses;

    $f1Sum = $cashRevenue + $vietqrRevenue + $debtRevenue;
    $f1Diff = abs($f1Sum - $totalRevenue);
    $formula1 = [
        'cash'       => $cashRevenue,
        'transfer'   => $vietqrRevenue,
        'debt'       => $debtRevenue,
        'calculated' => $f1Sum,
        'target'     => $totalRevenue,
        'diff'       => $f1Diff,
        'isMatched'  => ($f1Diff === 0)
    ];

    $f2Sum = $depositRevenue + $remaining70Revenue + $servicesRevenue;
    $f2Diff = abs($f2Sum - $totalRevenue);
    $formula2 = [
        'deposit'    => $depositRevenue,
        'remaining'  => $remaining70Revenue,
        'services'   => $servicesRevenue,
        'debt'       => $debtRevenue,
        'calculated' => $f2Sum,
        'target'     => $totalRevenue,
        'diff'       => $f2Diff,
        'isMatched'  => ($f2Diff === 0)
    ];

    json_response([
        'success' => true,
        'data'    => [
            'totalRevenue'        => $totalRevenue,
            'totalExpenses'       => $totalExpenses,
            'netProfit'           => $netProfit,
            'grossProfit'         => $grossProfit,
            'collectedRevenue'    => $collectedRevenue,
            'debtRevenue'         => $debtRevenue,
            'formula1'            => $formula1,
            'formula2'            => $formula2,
            'dailyRevenue'        => $dailyRevenue,
            'detailedBookings'    => $detailedBookings,
            'expensesByCategory'  => $expensesByCategory,
            'depositRevenue'      => $depositRevenue,
            'remainingRevenue'    => $remaining70Revenue,
            'remaining70Revenue'  => $remaining70Revenue,
            'serviceRevenue'      => $servicesRevenue,
            'servicesRevenue'     => $servicesRevenue,
            'counterSalesRevenue' => $counterSalesRevenue,
            'cashRevenue'         => $cashRevenue,
            'transferRevenue'     => $vietqrRevenue,
            'vietqrRevenue'       => $vietqrRevenue,
            'totalBookings'       => $totalBookingsCount,
            'completedBookings'   => $completedBookingsCount,
            'cancelledBookings'   => $cancelledBookingsCount,
            'totalMatches'        => $totalMatches,
            'avgRevenue'          => $avgRevenue,
            'occupancyRate'       => $occupancyRate,
            'summary' => [
                'totalRevenue'        => $totalRevenue,
                'totalExpenses'       => $totalExpenses,
                'netProfit'           => $netProfit,
                'grossProfit'         => $grossProfit,
                'collectedRevenue'    => $collectedRevenue,
                'debtRevenue'         => $debtRevenue,
                'depositRevenue'      => $depositRevenue,
                'remainingRevenue'    => $remaining70Revenue,
                'remaining70Revenue'  => $remaining70Revenue,
                'cashRevenue'         => $cashRevenue,
                'transferRevenue'     => $vietqrRevenue,
                'vietqrRevenue'       => $vietqrRevenue,
                'serviceRevenue'      => $servicesRevenue,
                'servicesRevenue'     => $servicesRevenue,
                'counterSalesRevenue' => $counterSalesRevenue,
                'totalBookings'       => $totalBookingsCount,
                'completedBookings'   => $completedBookingsCount,
                'cancelledBookings'   => $cancelledBookingsCount,
                'totalMatches'        => $totalMatches,
                'avgRevenue'          => $avgRevenue,
                'occupancyRate'       => $occupancyRate
            ],
            'byType'  => $byType,
            'byPitch' => array_values($byPitchMap)
        ]
    ]);
    return true;
}
