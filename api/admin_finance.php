<?php

if (!defined('SANBONG_ADMIN_ROUTER')) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'Direct access forbidden.', 'ref_code' => 'ERR_FORBIDDEN'], JSON_UNESCAPED_UNICODE);
    exit;
}

    if ($action === 'reports' || $action === 'export_reports_csv') {
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
            $isMatchCounted = false;

            if ($payStatus === 'Tịch thu cọc 30%' || $bStatus === 'Khách chưa đến') {
                $orderDeposit = $depAmt;
                $orderRevenue = $depAmt;
            } elseif ($payStatus === 'Phạt 50% cọc') {
                $forfeited = (int)round($depAmt * 0.5);
                $orderDeposit = $forfeited;
                $orderRevenue = $forfeited;
            } elseif ($payStatus === 'Bảo lưu cọc 30%') {
                $orderDeposit = $depAmt;
                $orderRevenue = $depAmt;
            } else {
                $isMatchCounted = ($bStatus !== 'Đã hủy' && $bStatus !== 'Khách chưa đến');
                $orderRevenue = $totPrice;

                if (in_array($payStatus, ['Đã cọc 30%', 'Đã thanh toán đủ', 'Đã thanh toán 100%'], true)) {
                    $orderDeposit = $depAmt;
                }
                if ($bStatus === 'Hoàn thành' || in_array($payStatus, ['Đã thanh toán đủ', 'Đã thanh toán 100%'], true)) {
                    $orderRemaining = max(0, $totPrice - $depAmt);
                    if ($orderDeposit === 0 && $depAmt === 0) {
                        $orderDeposit = (int)round($totPrice * 0.3);
                        $orderRemaining = max(0, $totPrice - $orderDeposit);
                    }
                }

                $srvs = !empty($row['services_json']) ? json_decode($row['services_json'], true) : [];
                if (is_array($srvs)) {
                    foreach ($srvs as $s) {
                        $sTotal = isset($s['total']) ? (int)$s['total'] : ((int)($s['price'] ?? 0) * max(1, (int)($s['quantity'] ?? 1)));
                        $orderServices += max(0, $sTotal);
                    }
                }
            }

            $totalRevenue       += $orderRevenue;
            $depositRevenue     += $orderDeposit;
            $remaining70Revenue += $orderRemaining;
            $servicesRevenue    += $orderServices;

            $isCashInitial = (mb_stripos($payMethod, 'Tiền mặt') !== false);
            if ($isCashInitial) {
                $cashRevenue += $orderDeposit;
            } else {
                $vietqrRevenue += $orderDeposit;
            }

            if ($orderRemaining > 0) {
                $settledViaVietQr = (mb_stripos($noteStr, 'tất toán 100% qua Chuyển khoản') !== false || mb_stripos($noteStr, 'tất toán 100% qua VietQR') !== false);
                $settledViaCash   = (mb_stripos($noteStr, 'tất toán 100% qua Tiền mặt') !== false);
                if ($settledViaCash || ($isCashInitial && !$settledViaVietQr)) {
                    $cashRevenue += $orderRemaining;
                } else {
                    $vietqrRevenue += $orderRemaining;
                }
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

            fputcsv($out, ['III. DANH SÁCH ĐƠN ĐẶT SÂN TRONG KỲ']);
            fputcsv($out, ['Mã đơn', 'Ngày đá', 'Khung giờ', 'Sân bóng', 'Khách hàng', 'Số điện thoại', 'Tổng tiền', 'Tiền cọc', 'Còn lại', 'Trạng thái ca', 'Trạng thái TT', 'Phương thức TT', 'Ghi chú']);
            foreach ($bookingsRows as $bRow) {
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

        json_response([
            'success' => true,
            'data'    => [
                'totalRevenue'        => $totalRevenue,
                'totalExpenses'       => $totalExpenses,
                'netProfit'           => $netProfit,
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
                'summary' => [
                    'totalRevenue'        => $totalRevenue,
                    'totalExpenses'       => $totalExpenses,
                    'netProfit'           => $netProfit,
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
                    'avgRevenue'          => $avgRevenue
                ],
                'byType'  => $byType,
                'byPitch' => array_values($byPitchMap)
            ]
        ]);
    }

    if ($action === 'bank_transactions') {
        $mgr = require_manager_or_admin($pdo);

        if ($method === 'GET') {
            $statusFilter = sanitize_string($_GET['status'] ?? 'pending', 20);
            $whereSql = '';
            $params = [];

            if ($statusFilter === 'pending') {
                $whereSql = "WHERE bt.match_status IN ('unmatched', 'underpaid', 'overpaid')";
            } elseif ($statusFilter === 'resolved') {
                $whereSql = "WHERE bt.match_status IN ('matched', 'resolved', 'ignored')";
            } elseif (in_array($statusFilter, ['matched', 'underpaid', 'overpaid', 'unmatched', 'resolved', 'ignored'], true)) {
                $whereSql = "WHERE bt.match_status = ?";
                $params[] = $statusFilter;
            }

            $txStmt = $pdo->prepare("
                SELECT bt.*, u.full_name AS resolved_by_name
                FROM bank_transactions bt
                LEFT JOIN users u ON bt.resolved_by = u.id
                {$whereSql}
                ORDER BY bt.id DESC
                LIMIT 200
            ");
            $txStmt->execute($params);
            $transactions = $txStmt->fetchAll();

            $pendingCount = (int)$pdo->query("SELECT COUNT(*) FROM bank_transactions WHERE match_status IN ('unmatched', 'underpaid', 'overpaid')")->fetchColumn();

            $candStmt = $pdo->query("
                SELECT b.code, b.customer_name, b.phone, b.pitch_id, b.booking_date, b.slot_time,
                       b.total_price, b.deposit_amount, b.paid_amount, b.remaining_amount,
                       b.status, b.payment_status
                FROM bookings b
                WHERE b.status NOT IN ('Đã hủy', 'Khách chưa đến')
                ORDER BY b.id DESC
                LIMIT 100
            ");
            $candidates = $candStmt ? $candStmt->fetchAll() : [];

            json_response([
                'success' => true,
                'data'    => [
                    'transactions'      => $transactions,
                    'pendingCount'      => $pendingCount,
                    'candidateBookings' => $candidates
                ]
            ]);
        }

        if ($method === 'POST') {
            $subAction = sanitize_string($data['sub_action'] ?? '', 30);

            if ($subAction === 'assign_booking') {
                $txId            = (int)($data['tx_id'] ?? $data['id'] ?? 0);
                $bookingCode     = strtoupper(sanitize_string($data['booking_code'] ?? $data['code'] ?? '', 40));
                $targetPayStatus = sanitize_string($data['target_payment_status'] ?? $data['target_status'] ?? '', 50);
                $note            = sanitize_string($data['note'] ?? '', 255);

                if ($txId <= 0 || $bookingCode === '') {
                    json_error('Thiếu mã giao dịch hoặc mã đơn cần gán.', 400, 'ERR_MISSING_PARAMS');
                }

                $pdo->beginTransaction();
                try {
                    $txStmt = $pdo->prepare("SELECT * FROM bank_transactions WHERE id = ? LIMIT 1 FOR UPDATE");
                    $txStmt->execute([$txId]);
                    $tx = $txStmt->fetch();
                    if (!$tx) {
                        $pdo->rollBack();
                        json_error('Không tìm thấy giao dịch ngân hàng tương ứng.', 404, 'ERR_TX_NOT_FOUND');
                    }
                    if (in_array($tx['match_status'] ?? '', ['matched', 'resolved', 'ignored'], true)) {
                        $pdo->rollBack();
                        json_error('Giao dịch này đã được đối soát/xử lý trước đó.', 400, 'ERR_TX_ALREADY_RESOLVED');
                    }

                    $cleanCode = str_replace(['-', ' '], '', $bookingCode);
                    $bStmt = $pdo->prepare("SELECT * FROM bookings WHERE code = ? OR REPLACE(code, '-', '') = ? LIMIT 1 FOR UPDATE");
                    $bStmt->execute([$bookingCode, $cleanCode]);
                    $booking = $bStmt->fetch();
                    if (!$booking) {
                        $pdo->rollBack();
                        json_error("Không tìm thấy đơn đặt sân #{$bookingCode}.", 404, 'ERR_BOOKING_NOT_FOUND');
                    }

                    $txAmt = max(0, (int)($tx['transfer_amount'] ?? 0));
                    $prevMatched = (string)($tx['matched_booking_code'] ?? '');
                    if ($prevMatched !== '' && $prevMatched === $booking['code']) {
                        $newPaid = max((int)($booking['paid_amount'] ?? 0), $txAmt);
                    } else {
                        if ($prevMatched !== '' && $prevMatched !== $booking['code']) {
                            $revStmt = $pdo->prepare("UPDATE bookings SET paid_amount = GREATEST(0, paid_amount - ?), remaining_amount = GREATEST(0, total_price - GREATEST(0, paid_amount - ?)) WHERE code = ?");
                            $revStmt->execute([$txAmt, $txAmt, $prevMatched]);
                        }
                        $newPaid = max(0, (int)($booking['paid_amount'] ?? 0)) + $txAmt;
                    }

                    $totalPrice = max(0, (int)($booking['total_price'] ?? 0));
                    if (in_array($targetPayStatus, ['Đã cọc 30%', 'Đã thanh toán 100%', 'Đã thanh toán đủ'], true)) {
                        $finalPayStatus = $targetPayStatus;
                    } else {
                        $finalPayStatus = ($totalPrice > 0 && $newPaid >= $totalPrice) ? 'Đã thanh toán đủ' : 'Đã cọc 30%';
                    }

                    $isFullPay = in_array($finalPayStatus, ['Đã thanh toán 100%', 'Đã thanh toán đủ'], true);
                    $finalStatus = $booking['status'] ?? 'Đã xác nhận';
                    if ($finalStatus === 'Chờ duyệt cọc' || $finalStatus === 'Đã hủy') {
                        $finalStatus = 'Đã xác nhận';
                    }
                    $finalRemaining = $isFullPay ? 0 : max(0, $totalPrice - $newPaid);

                    $updB = $pdo->prepare("UPDATE bookings SET status = ?, payment_status = ?, payment_method = 'VietQR SePay (Đối soát)', paid_amount = ?, remaining_amount = ? WHERE id = ?");
                    $updB->execute([$finalStatus, $finalPayStatus, $newPaid, $finalRemaining, (int)$booking['id']]);

                    $resolvedNote = $note !== '' ? $note : "Gán thủ công cho đơn {$booking['code']} ({$finalPayStatus})";
                    $updTx = $pdo->prepare("UPDATE bank_transactions SET match_status = 'resolved', matched_booking_code = ?, resolved_by = ?, resolved_note = ?, resolved_at = NOW() WHERE id = ?");
                    $updTx->execute([$booking['code'], (int)$mgr['id'], $resolvedNote, $txId]);

                    $pdo->commit();
                } catch (Exception $txEx) {
                    if ($pdo->inTransaction()) {
                        $pdo->rollBack();
                    }
                    throw $txEx;
                }

                write_audit_log(
                    $pdo,
                    'RECONCILE_MANUAL',
                    $booking['code'],
                    "TX #{$txId} ({$tx['match_status']} - " . number_format((int)$tx['transfer_amount']) . "đ)",
                    "Gán đơn {$booking['code']} -> {$finalPayStatus} (Đã trả: " . number_format($newPaid) . "đ) | {$resolvedNote}",
                    $mgr
                );

                json_response([
                    'success' => true,
                    'message' => "Đã gán giao dịch #{$txId} vào đơn {$booking['code']} ({$finalPayStatus}) thành công!",
                    'data'    => [
                        'tx_id'          => $txId,
                        'booking_code'   => $booking['code'],
                        'payment_status' => $finalPayStatus,
                        'paid_amount'    => $newPaid,
                        'match_status'   => 'resolved'
                    ]
                ]);
            }

            if ($subAction === 'resolve') {
                $txId      = (int)($data['tx_id'] ?? $data['id'] ?? 0);
                $resStatus = sanitize_string($data['resolution_status'] ?? $data['status'] ?? 'resolved', 20);
                $note      = sanitize_string($data['note'] ?? '', 255);

                if ($txId <= 0) {
                    json_error('Thiếu mã giao dịch cần xử lý.', 400, 'ERR_MISSING_TX_ID');
                }
                if (!in_array($resStatus, ['resolved', 'ignored'], true)) {
                    json_error('Trạng thái xử lý chỉ chấp nhận resolved hoặc ignored.', 400, 'ERR_INVALID_STATUS');
                }
                if ($note === '') {
                    json_error('Vui lòng nhập ghi chú mô tả cách xử lý giao dịch (VD: Đã hoàn tiền thừa / CK nhầm)!', 400, 'ERR_NOTE_REQUIRED');
                }

                $txStmt = $pdo->prepare("SELECT * FROM bank_transactions WHERE id = ? LIMIT 1");
                $txStmt->execute([$txId]);
                $tx = $txStmt->fetch();
                if (!$tx) {
                    json_error('Không tìm thấy giao dịch tương ứng.', 404, 'ERR_TX_NOT_FOUND');
                }

                $updTx = $pdo->prepare("UPDATE bank_transactions SET match_status = ?, resolved_by = ?, resolved_note = ?, resolved_at = NOW() WHERE id = ?");
                $updTx->execute([$resStatus, (int)$mgr['id'], $note, $txId]);

                write_audit_log(
                    $pdo,
                    'RECONCILE_RESOLVE',
                    $tx['matched_booking_code'] ?: ($tx['detected_booking_code'] ?: ('TX-' . $txId)),
                    "TX #{$txId} ({$tx['match_status']} - " . number_format((int)$tx['transfer_amount']) . "đ)",
                    "Đánh dấu {$resStatus} | Ghi chú: {$note}",
                    $mgr
                );

                json_response([
                    'success' => true,
                    'message' => "Đã xử lý giao dịch #{$txId} ({$resStatus}) thành công!",
                    'data'    => ['tx_id' => $txId, 'match_status' => $resStatus, 'resolved_note' => $note]
                ]);
            }

            json_error('Hành động đối soát giao dịch không hợp lệ.', 400, 'ERR_INVALID_ACTION');
        }

        json_error('Phương thức không được hỗ trợ.', 405, 'ERR_METHOD_NOT_ALLOWED');
    }

    if ($action === 'run_auto_release') {
        $admin = require_admin($pdo);
        $forceRun = !empty($data['force']);
        $res = run_auto_release_expired_bookings($pdo, $forceRun);
        $res['releasedCount'] = (int)($res['released_count'] ?? 0);

        write_audit_log(
            $pdo,
            'ADMIN_RUN_AUTO_RELEASE',
            null,
            null,
            "Chạy thủ công nhả đơn quá hạn: đã hủy " . ($res['released_count'] ?? 0) . " đơn" . (!empty($res['codes']) ? (' (' . implode(', ', $res['codes']) . ')') : ''),
            $admin
        );

        json_response([
            'success' => true,
            'message' => "Đã kiểm tra & tự động nhả " . (int)($res['released_count'] ?? 0) . " đơn giữ chỗ quá hạn.",
            'data'    => $res
        ]);
    }


    // 6.4 Quản lý chi phí: Danh sách & Tổng chi phí (Staff bị chặn 403)
    if ($action === 'get_expenses') {
        $mgr = require_manager_or_admin($pdo);
        $month = sanitize_string($_GET['month'] ?? '', 10);
        $fromDate = sanitize_string($_GET['from'] ?? '', 15);
        $toDate = sanitize_string($_GET['to'] ?? '', 15);
        $category = sanitize_string($_GET['category'] ?? 'all', 50);

        $where = ["1=1"];
        $params = [];
        if ($fromDate !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $fromDate)) {
            $where[] = "expense_date >= ?";
            $params[] = $fromDate;
        }
        if ($toDate !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $toDate)) {
            $where[] = "expense_date <= ?";
            $params[] = $toDate;
        }
        if ($fromDate === '' && $toDate === '' && !empty($month) && preg_match('/^\d{4}-\d{2}$/', $month)) {
            $where[] = "expense_date LIKE ?";
            $params[] = $month . '%';
        }
        if ($category !== 'all' && $category !== '') {
            $where[] = "category = ?";
            $params[] = $category;
        }

        $stmt = $pdo->prepare("
            SELECT * FROM expenses
            WHERE " . implode(' AND ', $where) . "
            ORDER BY expense_date DESC, id DESC
        ");
        $stmt->execute($params);
        $expenses = $stmt->fetchAll();

        $totalAmount = 0;
        $byCatMap = [];
        foreach ($expenses as $e) {
            $amt = (int)$e['amount'];
            $totalAmount += $amt;
            $cKey = (string)$e['category'];
            if (!isset($byCatMap[$cKey])) {
                $byCatMap[$cKey] = [
                    'category'     => $cKey,
                    'categoryName' => (string)$e['category_name'],
                    'amount'       => 0,
                    'count'        => 0
                ];
            }
            $byCatMap[$cKey]['amount'] += $amt;
            $byCatMap[$cKey]['count']++;
        }

        json_response([
            'success' => true,
            'data'    => [
                'expenses'    => $expenses,
                'totalAmount' => $totalAmount,
                'byCategory'  => array_values($byCatMap)
            ]
        ]);
    }

    // 6.4 Quản lý chi phí: Thêm khoản chi (Staff bị chặn 403)
    if ($action === 'add_expense') {
        $mgr = require_manager_or_admin($pdo);
        $catMap = [
            'dien_nuoc'       => 'Tiền điện, nước sân',
            'bao_tri'         => 'Bảo trì & Sửa chữa cỏ/đèn',
            'nhap_hang'       => 'Nhập hàng (Nước, Áo, Bóng)',
            'luong_nhan_vien' => 'Lương & Thưởng nhân viên',
            'khac'            => 'Chi phí vận hành khác'
        ];
        $cat = sanitize_string($data['category'] ?? 'khac', 50);
        if (!isset($catMap[$cat])) {
            $cat = 'khac';
        }
        $catName = sanitize_string($data['category_name'] ?? $catMap[$cat], 100);
        $amt = (int)($data['amount'] ?? 0);
        if ($amt < 1000) {
            json_error('Số tiền chi tối thiểu 1.000đ.', 400, 'ERR_INVALID_AMOUNT');
        }
        $date = sanitize_string($data['expense_date'] ?? date('Y-m-d'), 15);
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            json_error('Ngày chi không hợp lệ.', 400, 'ERR_INVALID_DATE');
        }
        $payer = sanitize_string($data['payer_name'] ?? ($mgr['full_name'] ?? 'Ban Quản Trị Sân'), 100);
        $note = sanitize_string($data['receipt_note'] ?? '', 255);

        $expCode = 'EXP-' . date('ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(2)), 0, 4));

        $stmt = $pdo->prepare("
            INSERT INTO expenses (expense_code, category, category_name, amount, expense_date, payer_name, staff_id, receipt_note, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$expCode, $cat, $catName, $amt, $date, $payer, $mgr['id'], $note]);

        write_audit_log($pdo, 'EXPENSE_ADD', $expCode, null, "Thêm khoản chi: {$catName} (" . number_format($amt) . "đ) ngày {$date} - {$note}", $mgr);

        json_response([
            'success'      => true,
            'message'      => "Đã ghi nhận khoản chi " . number_format($amt) . " đ ({$catName}) thành công!",
            'expense_code' => $expCode
        ], 201);
    }

    // 6.4 Quản lý chi phí: Xóa khoản chi (Chỉ Admin)
    if ($action === 'delete_expense') {
        $admin = require_admin($pdo);
        $id = (int)($data['id'] ?? 0);
        $stmt = $pdo->prepare("DELETE FROM expenses WHERE id = ?");
        $stmt->execute([$id]);
        write_audit_log($pdo, 'EXPENSE_DELETE', null, null, "Xóa khoản chi #{$id}", $admin);
        json_response(['success' => true, 'message' => "Đã xóa khoản chi!"]);
    }

    // 6.1 Nhật ký thông báo Zalo/SMS/Telegram/System
    if ($action === 'notification_logs') {
        $mgr = require_manager_or_admin($pdo);
        $channel = sanitize_string($_GET['channel'] ?? 'all', 20);
        $status = sanitize_string($_GET['status'] ?? 'all', 20);
        $search = sanitize_string($_GET['search'] ?? '', 80);
        $limit = max(10, min(300, (int)($_GET['limit'] ?? 100)));

        $where = ["1=1"];
        $params = [];
        if ($channel !== 'all' && in_array($channel, ['telegram', 'zalo', 'sms', 'system'], true)) {
            $where[] = "channel = ?";
            $params[] = $channel;
        }
        if ($status !== 'all' && in_array($status, ['sent', 'failed', 'pending'], true)) {
            $where[] = "status = ?";
            $params[] = $status;
        }
        if ($search !== '') {
            $where[] = "(booking_code LIKE ? OR recipient LIKE ? OR title LIKE ? OR content LIKE ?)";
            $like = '%' . $search . '%';
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
        }

        $stmt = $pdo->prepare("SELECT * FROM notification_logs WHERE " . implode(' AND ', $where) . " ORDER BY id DESC LIMIT {$limit}");
        $stmt->execute($params);
        $logs = $stmt->fetchAll();

        $sumStmt = $pdo->query("SELECT SUM(status='sent') AS sent_cnt, SUM(status='failed') AS failed_cnt FROM notification_logs");
        $sumRow = $sumStmt ? $sumStmt->fetch() : [];

        json_response([
            'success' => true,
            'data'    => [
                'logs'    => $logs,
                'summary' => [
                    'sent'   => (int)($sumRow['sent_cnt'] ?? 0),
                    'failed' => (int)($sumRow['failed_cnt'] ?? 0)
                ]
            ]
        ]);
    }

    // 6.2 Kiểm tra kết nối Telegram cho Chủ sân (Chỉ Admin)
    if ($action === 'test_telegram') {
        $admin = require_admin($pdo);
        $testMsg = "✅ <b>KIỂM TRA KẾT NỐI TELEGRAM SÂN BÓNG PRO</b>\n"
                 . "• Người thử: <b>" . htmlspecialchars((string)($admin['full_name'] ?? 'Admin'), ENT_QUOTES, 'UTF-8') . "</b>\n"
                 . "• Thời gian: <code>" . date('d/m/Y H:i:s') . "</code>\n"
                 . "• Trạng thái: Hệ thống cảnh báo chủ sân đang hoạt động bình thường.";
        $res = send_telegram_notification_detailed($testMsg, null, $pdo, true);
        if (!empty($res['sent'])) {
            write_audit_log($pdo, 'TELEGRAM_TEST', null, null, 'Gửi tin nhắn thử Telegram thành công (HTTP ' . ($res['http_code'] ?? 200) . ')', $admin);
            json_response(['success' => true, 'message' => 'Đã gửi tin nhắn kiểm tra tới Telegram Chủ sân thành công!', 'data' => $res]);
        }
        $errReason = ($res['reason'] ?? '') === 'missing_credentials'
            ? 'Chưa cấu hình Telegram Bot Token hoặc Chat ID.'
            : ('Không thể gửi tin nhắn Telegram (' . ($res['reason'] ?? 'Lỗi kết nối') . ').');
        json_response(['success' => false, 'message' => $errReason, 'data' => $res], 400);
    }

    // 6.1 Chạy kiểm tra nhắc lịch thủ công (Chỉ Admin)
    if ($action === 'run_match_reminders') {
        $admin = require_admin($pdo);
        $res = check_and_send_match_reminders($pdo);
        write_audit_log($pdo, 'RUN_REMINDERS', null, null, 'Chạy nhắc lịch trận đấu: đã gửi ' . (int)($res['reminded_count'] ?? 0) . ' tin', $admin);
        json_response([
            'success' => true,
            'message' => 'Đã kiểm tra & gửi ' . (int)($res['reminded_count'] ?? 0) . ' thông báo nhắc lịch trước trận.',
            'data'    => $res
        ]);
    }

    // 5.2 Chạy sinh lịch lặp 4 tuần thủ công (Chỉ Admin)
    if ($action === 'run_recurring_cron') {
        $admin = require_admin($pdo);
        $res = generate_recurring_bookings_window($pdo, null, 4, $admin);
        write_audit_log($pdo, 'RUN_RECURRING_GEN', null, null, "Chạy sinh lịch lặp 4 tuần: +{$res['generated_count']} buổi, bỏ qua {$res['skipped_conflicts']} xung đột", $admin);
        json_response([
            'success' => true,
            'message' => "Đã đồng bộ lịch cố định 4 tuần: tạo thêm {$res['generated_count']} buổi, bỏ qua {$res['skipped_conflicts']} buổi trùng.",
            'data'    => $res
        ]);
    }

    // 5.5 Ghép kèo: Danh sách quản trị (gồm tin chờ duyệt & từ chối)
    if ($action === 'get_matchmaking_admin') {
        $mgr = require_manager_or_admin($pdo);
        $status = sanitize_string($_GET['status'] ?? 'all', 20);
        $where = ["1=1"];
        $params = [];
        if ($status !== 'all' && in_array($status, ['pending', 'open', 'matched', 'closed', 'rejected'], true)) {
            $where[] = "m.status = ?";
            $params[] = $status;
        }
        $stmt = $pdo->prepare("
            SELECT m.*, p.name AS pitch_name
            FROM matchmaking_posts m
            LEFT JOIN pitches p ON m.pitch_id = p.id
            WHERE " . implode(' AND ', $where) . "
            ORDER BY FIELD(m.status, 'pending', 'open', 'matched', 'closed', 'rejected'), m.match_date ASC, m.id DESC
            LIMIT 200
        ");
        $stmt->execute($params);
        json_response(['success' => true, 'data' => $stmt->fetchAll()]);
    }

    // 5.5 Ghép kèo: Duyệt / Từ chối / Đóng tin
    if ($action === 'moderate_matchmaking') {
        $mgr = require_manager_or_admin($pdo);
        $postCode = strtoupper(sanitize_string($data['post_code'] ?? $data['postCode'] ?? '', 40));
        $decision = sanitize_string($data['decision'] ?? $data['sub_action'] ?? '', 20);
        if ($postCode === '' || !in_array($decision, ['approve', 'reject', 'close', 'open'], true)) {
            json_error('Thiếu mã tin hoặc quyết định kiểm duyệt không hợp lệ.', 400, 'ERR_INVALID_PARAMS');
        }

        $mStmt = $pdo->prepare("SELECT * FROM matchmaking_posts WHERE post_code = ? LIMIT 1");
        $mStmt->execute([$postCode]);
        $post = $mStmt->fetch();
        if (!$post) {
            json_error('Không tìm thấy tin tìm đối tương ứng.', 404, 'ERR_NOT_FOUND');
        }

        $targetStatus = ($decision === 'approve' || $decision === 'open')
            ? 'open'
            : ($decision === 'reject' ? 'rejected' : 'closed');
        $pdo->prepare("UPDATE matchmaking_posts SET status = ? WHERE id = ?")->execute([$targetStatus, (int)$post['id']]);

        write_audit_log($pdo, 'MATCHMAKING_MODERATE', $postCode, $post['status'], "Chuyển trạng thái {$targetStatus} (Đội {$post['team_name']})", $mgr);

        json_response([
            'success' => true,
            'message' => $targetStatus === 'open'
                ? "Đã duyệt hiển thị tin tìm đối {$postCode}."
                : ($targetStatus === 'rejected' ? "Đã từ chối tin {$postCode}." : "Đã đóng tin tìm đối {$postCode}."),
            'data'    => ['post_code' => $postCode, 'status' => $targetStatus]
        ]);
    }

    // 6.5 Sao lưu cơ sở dữ liệu: Tạo bản sao lưu nén .sql.gz ngay (Chỉ Admin)
    if ($action === 'backup_database_now') {
        $admin = require_admin($pdo);
        if (!defined('SANBONG_CRON_LIB_ONLY')) {
            define('SANBONG_CRON_LIB_ONLY', true);
        }
        require_once __DIR__ . '/../cron/backup_database.php';

        $customBackupDir = trim(getenv('BACKUP_DIR') ?: ($_ENV['BACKUP_DIR'] ?? ''));
        $backupDir = ($customBackupDir !== '' && (is_dir($customBackupDir) || @mkdir($customBackupDir, 0750, true))) ? rtrim($customBackupDir, '/\\') : (__DIR__ . '/../backups');
        $ext = function_exists('gzopen') ? '.sql.gz' : '.sql';
        $filename = 'backup_sanbong_' . date('Ymd_His') . $ext;
        $targetPath = $backupDir . '/' . $filename;

        $res = generate_database_dump($pdo, $targetPath);
        if (empty($res['success'])) {
            json_error($res['message'] ?? 'Không thể tạo bản sao lưu DB.', 500, 'ERR_BACKUP_FAILED');
        }

        write_audit_log($pdo, 'DB_BACKUP', null, null, "Tạo bản sao lưu DB thủ công: {$res['filename']} (" . round(($res['file_size'] ?? 0) / 1024, 1) . " KB)", $admin);

        json_response([
            'success' => true,
            'message' => "Tạo bản sao lưu cơ sở dữ liệu thành công ({$res['filename']})! Dung lượng: " . round(($res['file_size'] ?? 0) / 1024, 1) . " KB.",
            'data'    => $res
        ]);
    }

    // 6.5 Sao lưu cơ sở dữ liệu: Danh sách file sao lưu (.sql & .sql.gz)
    if ($action === 'list_backups') {
        $admin = require_admin($pdo);
        $customBackupDir = trim(getenv('BACKUP_DIR') ?: ($_ENV['BACKUP_DIR'] ?? ''));
        $backupDir = ($customBackupDir !== '' && is_dir($customBackupDir)) ? rtrim($customBackupDir, '/\\') : (__DIR__ . '/../backups');
        $files = array_merge(
            glob($backupDir . '/*.sql.gz') ?: [],
            glob($backupDir . '/*.sql') ?: [],
            glob($backupDir . '/*.sql.gz.enc') ?: [],
            glob($backupDir . '/*.sql.enc') ?: []
        );
        $backups = [];
        foreach ($files as $f) {
            $size = @filesize($f) ?: 0;
            $mtime = @filemtime($f) ?: time();
            $backups[] = [
                'filename'   => basename($f),
                'size'       => $size,
                'size_kb'    => round($size / 1024, 1),
                'compressed' => (substr(basename($f), -3) === '.gz' || strpos(basename($f), '.gz.') !== false),
                'created_at' => date('Y-m-d H:i:s', $mtime)
            ];
        }
        usort($backups, static function ($a, $b) {
            return strcmp($b['created_at'], $a['created_at']);
        });
        json_response(['success' => true, 'data' => $backups]);
    }

    // 6.5 Sao lưu cơ sở dữ liệu: Tải xuống an toàn (Chỉ Admin - chặn path traversal)
    if ($action === 'download_backup') {
        $admin = require_admin($pdo);
        $reqFile = basename((string)($_GET['file'] ?? $_GET['filename'] ?? ''));
        if ($reqFile === '' || !preg_match('/^backup_sanbong_[A-Za-z0-9_.-]+\.(sql|sql\.gz|sql\.enc|sql\.gz\.enc)$/', $reqFile)) {
            json_error('Tên file sao lưu không hợp lệ.', 400, 'ERR_INVALID_FILENAME');
        }
        $customBackupDir = trim(getenv('BACKUP_DIR') ?: ($_ENV['BACKUP_DIR'] ?? ''));
        $baseDir = ($customBackupDir !== '' && is_dir($customBackupDir)) ? rtrim($customBackupDir, '/\\') : (__DIR__ . '/../backups');
        $backupDir = realpath($baseDir);
        $targetReal = $backupDir ? realpath($backupDir . DIRECTORY_SEPARATOR . $reqFile) : false;
        if (!$backupDir || !$targetReal || strpos($targetReal, $backupDir . DIRECTORY_SEPARATOR) !== 0 || !is_file($targetReal)) {
            json_error('Không tìm thấy tệp sao lưu tương ứng.', 404, 'ERR_FILE_NOT_FOUND');
        }

        write_audit_log($pdo, 'DB_BACKUP_DOWNLOAD', null, null, "Tải về bản sao lưu DB: {$reqFile}", $admin);

        $isGz = (substr($reqFile, -3) === '.gz' || strpos($reqFile, '.gz.') !== false);
        header('Content-Type: ' . ($isGz ? 'application/gzip' : 'application/octet-stream'));
        header('Content-Disposition: attachment; filename="' . $reqFile . '"');
        header('Content-Length: ' . filesize($targetReal));
        header('X-Content-Type-Options: nosniff');
        readfile($targetReal);
        exit;
    }
