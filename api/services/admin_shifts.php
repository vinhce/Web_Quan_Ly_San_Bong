<?php
declare(strict_types=1);

if (!defined('SANBONG_ADMIN_ROUTER')) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'Direct access forbidden.', 'ref_code' => 'ERR_FORBIDDEN'], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once __DIR__ . '/finance_metrics_helper.php';
require_once __DIR__ . '/AdminLogService.php';

function shift_parse_date_filter(string $raw): string {
    $clean = trim($raw);
    if ($clean === '') {
        return '';
    }
    if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $clean, $m)) {
        return checkdate((int)$m[2], (int)$m[3], (int)$m[1]) ? $clean : '';
    }
    if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/', $clean, $m)) {
        $d = (int)$m[1];
        $mo = (int)$m[2];
        $y = (int)$m[3];
        if (checkdate($mo, $d, $y)) {
            return sprintf('%04d-%02d-%02d', $y, $mo, $d);
        }
    }
    return '';
}

function shift_format_dt_vn(?string $dt): string {
    $raw = trim((string)$dt);
    if ($raw === '') {
        return '';
    }
    try {
        $tz = new DateTimeZone('Asia/Ho_Chi_Minh');
        $d = new DateTime($raw, $tz);
        $d->setTimezone($tz);
        return $d->format('d/m/Y H:i');
    } catch (Throwable $e) {
        $ts = strtotime($raw);
        return $ts !== false ? date('d/m/Y H:i', $ts) : $raw;
    }
}

function shift_neutralize_csv(string $cell): string {
    if ($cell !== '' && in_array($cell[0], ['=', '+', '-', '@', "\t", "\r"], true)) {
        return "'" . $cell;
    }
    return $cell;
}

function shift_compute_warn_level(string $startTime): array {
    $startTs = strtotime($startTime);
    $diffHours = $startTs !== false ? max(0.0, (time() - $startTs) / 3600) : 0.0;
    $warnLevel = 'none';
    if ($diffHours >= 16.0) {
        $warnLevel = 'danger';
    } elseif ($diffHours >= 12.0) {
        $warnLevel = 'warning';
    }
    return [
        'hours_open' => round($diffHours, 1),
        'is_overdue' => $diffHours >= 12.0,
        'warn_level' => $warnLevel,
    ];
}

function shift_status_label_vi(string $status): string {
    switch ($status) {
        case 'open':
            return 'Đang mở';
        case 'pending_explanation':
            return 'Chờ giải trình';
        case 'closed':
            return 'Chờ đối soát';
        case 'confirmed':
            return 'Đã đối soát';
        default:
            return $status;
    }
}

function shift_get_reason_min_len(PDO $pdo): int {
    try {
        $val = $pdo->query("SELECT setting_value FROM settings WHERE setting_key = 'audit_reason_min_len' LIMIT 1")->fetchColumn();
        if ($val !== false && (int)$val >= 3) {
            return (int)$val;
        }
    } catch (Throwable $e) {
    }
    return 10;
}

function shift_build_detail_payload(PDO $pdo, array $shift): array {
    $staffId = (int)$shift['staff_id'];
    $startTime = (string)$shift['start_time'];
    $endBound = !empty($shift['end_time']) ? (string)$shift['end_time'] : date('Y-m-d H:i:s');

    $hasStaffCol = function_exists('db_table_has_column') ? db_table_has_column($pdo, 'bookings', 'staff_id') : true;

    // 1. Bookings in shift window (by shift staff, walkin, or collected in shift)
    $collectStmt = $pdo->prepare("
        SELECT id, booking_id, target_id, old_value, new_value, created_at
        FROM audit_logs
        WHERE user_id = ?
          AND action = 'COLLECT_PAYMENT'
          AND created_at >= ? AND created_at <= ?
        ORDER BY id DESC
    ");
    $collectStmt->execute([$staffId, $startTime, $endBound]);
    $collectLogs = $collectStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    $collectedCodes = [];
    $cashCollectItems = [];
    foreach ($collectLogs as $cl) {
        $bCode = trim((string)($cl['booking_id'] ?: $cl['target_id'] ?: ''));
        if ($bCode !== '') {
            $collectedCodes[] = $bCode;
        }
        if (mb_stripos((string)($cl['new_value'] ?? ''), 'Tiền mặt') !== false) {
            $digits = preg_replace('/[^0-9]/', '', (string)($cl['old_value'] ?? ''));
            $amt = $digits !== '' ? (int)$digits : 0;
            $cashCollectItems[] = [
                'source'       => 'Thu tiền đơn hàng',
                'booking_code' => $bCode ?: '—',
                'amount'       => $amt,
                'detail'       => (string)($cl['new_value'] ?? ''),
                'time'         => shift_format_dt_vn((string)$cl['created_at']),
            ];
        }
    }

    $bookingsWhere = ["b.created_at >= ? AND b.created_at <= ?"];
    $bookingsParams = [$startTime, $endBound];
    $staffCond = $hasStaffCol ? "(b.staff_id = ? OR b.user_id = ?)" : "b.user_id = ?";
    if ($collectedCodes !== []) {
        $ph = implode(', ', array_fill(0, count($collectedCodes), '?'));
        $bookingsWhere = ["((" . $bookingsWhere[0] . " AND ({$staffCond} OR b.payment_method LIKE '%VietQR%' OR b.payment_method LIKE '%Chuyển khoản%')) OR b.code IN ({$ph}))"];
        if ($hasStaffCol) {
            $bookingsParams[] = $staffId;
        }
        $bookingsParams[] = $staffId;
        array_push($bookingsParams, ...$collectedCodes);
    } else {
        $bookingsWhere[0] .= " AND ({$staffCond} OR b.payment_method LIKE '%VietQR%' OR b.payment_method LIKE '%Chuyển khoản%')";
        if ($hasStaffCol) {
            $bookingsParams[] = $staffId;
        }
        $bookingsParams[] = $staffId;
    }

    $bStmt = $pdo->prepare("
        SELECT b.code, b.customer_name, b.phone, b.pitch_id, p.name AS pitch_name,
               b.booking_date, b.slot_time, b.total_price, b.deposit_amount,
               b.paid_amount, b.remaining_amount, b.status, b.payment_status,
               b.payment_method, b.created_at
        FROM bookings b
        LEFT JOIN pitches p ON p.id = b.pitch_id
        WHERE " . implode(' AND ', $bookingsWhere) . "
        ORDER BY b.created_at DESC
        LIMIT 100
    ");
    $bStmt->execute($bookingsParams);
    $bookings = $bStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    // 2. Walkin cash items + service sales cash items
    $walkinCashItems = [];
    $walkinCond = $hasStaffCol
        ? "(staff_id = ? OR user_id = ? OR code IN (SELECT booking_id FROM audit_logs WHERE user_id = ? AND action = 'WALKIN_BOOKING'))"
        : "(user_id = ? OR code IN (SELECT booking_id FROM audit_logs WHERE user_id = ? AND action = 'WALKIN_BOOKING'))";
    $wParams = [$startTime, $endBound, $staffId, $staffId];
    if ($hasStaffCol) {
        $wParams[] = $staffId;
    }
    $wStmt = $pdo->prepare("
        SELECT code, customer_name, total_price, deposit_amount, paid_amount, payment_status, payment_method, created_at
        FROM bookings
        WHERE created_at >= ? AND created_at <= ?
          AND status != 'Đã hủy'
          AND payment_status NOT IN ('Đã hủy', 'Đã hoàn cọc 100%')
          AND payment_method LIKE '%Tiền mặt%'
          AND payment_method NOT LIKE '%Chưa cọc%'
          AND {$walkinCond}
        ORDER BY created_at DESC
    ");
    $wStmt->execute($wParams);
    foreach ($wStmt->fetchAll(PDO::FETCH_ASSOC) as $wr) {
        $paid = (int)($wr['paid_amount'] ?? 0);
        $dep = (int)($wr['deposit_amount'] ?? 0);
        $amt = 0;
        if ($paid > 0) {
            $amt = min($paid, max($dep, 0));
        } elseif ($dep > 0 && !in_array($wr['payment_status'] ?? '', ['Chờ duyệt cọc', 'Chờ cọc 30%', 'Đã hủy', 'Đã hoàn cọc 100%'], true)) {
            $amt = $dep;
        }
        if ($amt > 0) {
            $walkinCashItems[] = [
                'source'       => 'Đặt sân tại quầy',
                'booking_code' => (string)$wr['code'],
                'amount'       => $amt,
                'detail'       => (string)($wr['customer_name'] ?? '') . ' · ' . (string)($wr['payment_status'] ?? ''),
                'time'         => shift_format_dt_vn((string)$wr['created_at']),
            ];
        }
    }

    $srvStmt = $pdo->prepare("
        SELECT id, service_name, quantity, unit_price, total_amount, note, created_at
        FROM service_sales
        WHERE created_at >= ? AND created_at <= ?
          AND payment_method LIKE '%Tiền mặt%'
          AND (booking_code IS NULL OR booking_code = '')
          AND total_amount > 0
          AND staff_id = ?
        ORDER BY created_at DESC
    ");
    $srvStmt->execute([$startTime, $endBound, $staffId]);
    $serviceCashItems = [];
    foreach ($srvStmt->fetchAll(PDO::FETCH_ASSOC) as $sr) {
        $serviceCashItems[] = [
            'source'       => 'Bán nước / dịch vụ lẻ',
            'booking_code' => 'POS-' . $sr['id'],
            'amount'       => (int)$sr['total_amount'],
            'detail'       => (string)$sr['service_name'] . ' x' . (int)$sr['quantity'] . (!empty($sr['note']) ? ' (' . $sr['note'] . ')' : ''),
            'time'         => shift_format_dt_vn((string)$sr['created_at']),
        ];
    }

    $cashItems = array_merge($walkinCashItems, $cashCollectItems, $serviceCashItems);
    $cashItemsSum = array_reduce($cashItems, static fn(int $c, array $it): int => $c + (int)$it['amount'], 0);

    // 3. VietQR & bank_transactions direct reconciliation
    $btStmt = $pdo->prepare("
        SELECT bt.id, bt.sepay_tx_id, bt.reference_code, bt.transaction_content,
               bt.detected_booking_code, bt.matched_booking_code,
               bt.transfer_amount, bt.expected_amount, bt.discrepancy_amount,
               bt.match_status, bt.mismatch_reason, bt.transaction_date, bt.created_at,
               b.customer_name AS booking_customer, b.paid_amount AS booking_paid_amount, b.payment_status AS booking_payment_status
        FROM bank_transactions bt
        LEFT JOIN bookings b ON b.code = COALESCE(NULLIF(bt.matched_booking_code, ''), NULLIF(bt.detected_booking_code, ''))
        WHERE bt.created_at >= ? AND bt.created_at <= ?
        ORDER BY bt.id DESC
    ");
    $btStmt->execute([$startTime, $endBound]);
    $bankRows = $btStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    $bankTotal = 0;
    $matchedCount = 0;
    $issueCount = 0;
    $vietqrItems = [];
    foreach ($bankRows as $br) {
        $st = (string)($br['match_status'] ?? 'unmatched');
        $tAmt = (int)($br['transfer_amount'] ?? 0);
        if (in_array($st, ['matched', 'overpaid', 'underpaid', 'resolved'], true)) {
            $bankTotal += $tAmt;
        }
        if (in_array($st, ['matched', 'resolved'], true)) {
            $matchedCount++;
        } else {
            $issueCount++;
        }
        $vietqrItems[] = [
            'id'                   => (int)$br['id'],
            'sepay_tx_id'          => (string)($br['sepay_tx_id'] ?? $br['reference_code'] ?? ('TX-' . $br['id'])),
            'booking_code'         => (string)($br['matched_booking_code'] ?: $br['detected_booking_code'] ?: '—'),
            'booking_customer'     => (string)($br['booking_customer'] ?? ''),
            'transfer_amount'      => $tAmt,
            'expected_amount'      => (int)($br['expected_amount'] ?? 0),
            'discrepancy_amount'   => (int)($br['discrepancy_amount'] ?? 0),
            'booking_paid_amount'  => $br['booking_paid_amount'] !== null ? (int)$br['booking_paid_amount'] : null,
            'match_status'         => $st,
            'mismatch_reason'      => (string)($br['mismatch_reason'] ?? ''),
            'transaction_content'  => (string)($br['transaction_content'] ?? ''),
            'time'                 => shift_format_dt_vn((string)($br['transaction_date'] ?: $br['created_at'])),
        ];
    }

    $shiftFormatted = $shift;
    $shiftFormatted['start_time_formatted'] = shift_format_dt_vn((string)($shift['start_time'] ?? ''));
    $shiftFormatted['end_time_formatted'] = !empty($shift['end_time']) ? shift_format_dt_vn((string)$shift['end_time']) : '';
    $shiftFormatted['confirmed_at_formatted'] = !empty($shift['confirmed_at']) ? shift_format_dt_vn((string)$shift['confirmed_at']) : '';
    $shiftFormatted['status_label'] = shift_status_label_vi((string)($shift['status'] ?? ''));
    $shiftFormatted['staff_counted_cash'] = $shift['staff_counted_cash'] !== null ? (float)$shift['staff_counted_cash'] : ($shift['actual_cash_received'] !== null ? (float)$shift['actual_cash_received'] : null);

    $formattedBookings = array_map(static function (array $b): array {
        return [
            'code'             => (string)$b['code'],
            'customer_name'    => (string)$b['customer_name'],
            'phone'            => function_exists('mask_phone_number') ? mask_phone_number((string)$b['phone']) : (string)$b['phone'],
            'pitch_name'       => (string)($b['pitch_name'] ?: $b['pitch_id']),
            'booking_date'     => shift_format_dt_vn((string)$b['booking_date'] . ' 00:00:00') ? substr(shift_format_dt_vn((string)$b['booking_date'] . ' 00:00:00'), 0, 10) : (string)$b['booking_date'],
            'slot_time'        => (string)$b['slot_time'],
            'total_price'      => (int)$b['total_price'],
            'paid_amount'      => (int)$b['paid_amount'],
            'status'           => (string)$b['status'],
            'payment_status'   => (string)$b['payment_status'],
            'payment_method'   => (string)$b['payment_method'],
            'created_at'       => shift_format_dt_vn((string)$b['created_at']),
        ];
    }, $bookings);

    return [
        'shift'         => $shiftFormatted,
        'bookings'      => $formattedBookings,
        'cash_items'    => $cashItems,
        'cash_sum'      => $cashItemsSum,
        'vietqr_items'  => $vietqrItems,
        'bank_summary'  => [
            'shift_transfer_total' => (int)($shift['transfer_total'] ?? 0),
            'bank_tx_total'        => $bankTotal,
            'diff_vs_bank'         => (int)($shift['transfer_total'] ?? 0) - $bankTotal,
            'total_tx'             => count($vietqrItems),
            'matched_count'        => $matchedCount,
            'issue_count'          => $issueCount,
        ],
    ];
}

function handle_admin_shifts(PDO $pdo, string $method, array $data, array $actor): void {
    $computeShiftTotals = static function (PDO $pdo, int $staffId, string $startTime, ?string $endTime = null): array {
        return finance_compute_shift_totals($pdo, $staffId, $startTime, $endTime);
    };

    if ($method === 'GET') {
        try {
            $staffId = (int)($actor['id'] ?? 0);
            $isManagerOrAdmin = in_array($actor['role'] ?? '', ['admin', 'manager'], true);
            $subAction = sanitize_string((string)($_GET['sub_action'] ?? ''), 30);

            if ($subAction === 'shift_detail') {
                $shiftId = (int)preg_replace('/\D+/', '', (string)($_GET['shift_id'] ?? $_GET['id'] ?? ''));
                if ($shiftId <= 0) {
                    json_error('Thiếu mã ca trực cần xem chi tiết.', 400, 'ERR_MISSING_SHIFT_ID');
                }
                $sStmt = $pdo->prepare("
                    SELECT s.*, COALESCE(NULLIF(cu.full_name, ''), cu.username) AS confirmed_by_name
                    FROM shifts s
                    LEFT JOIN users cu ON cu.id = s.confirmed_by
                    WHERE s.id = ?
                    LIMIT 1
                ");
                $sStmt->execute([$shiftId]);
                $shift = $sStmt->fetch(PDO::FETCH_ASSOC);
                if (!$shift) {
                    json_error('Không tìm thấy ca trực tương ứng.', 404, 'ERR_SHIFT_NOT_FOUND');
                }
                if (!$isManagerOrAdmin && (int)$shift['staff_id'] !== $staffId) {
                    json_error('Bạn chỉ được xem chi tiết ca trực của chính mình.', 403, 'ERR_FORBIDDEN');
                }
                json_response([
                    'success' => true,
                    'data'    => shift_build_detail_payload($pdo, $shift),
                ]);
            }

            $filterDate = shift_parse_date_filter((string)($_GET['date'] ?? ''));
            $filterStaff = isset($_GET['staff_id']) && $_GET['staff_id'] !== '' ? (int)$_GET['staff_id'] : null;

            $whereClauses = [];
            $params = [];

            if (!$isManagerOrAdmin) {
                $whereClauses[] = "s.staff_id = ?";
                $params[] = $staffId;
            } elseif ($filterStaff !== null && $filterStaff > 0) {
                $whereClauses[] = "s.staff_id = ?";
                $params[] = $filterStaff;
            }

            if ($filterDate !== '') {
                $whereClauses[] = "DATE(s.start_time) = ?";
                $params[] = $filterDate;
            }

            $whereSql = count($whereClauses) > 0 ? 'WHERE ' . implode(' AND ', $whereClauses) : '';

            if ($subAction === 'export_csv') {
                $csvStmt = $pdo->prepare("
                    SELECT s.*, COALESCE(NULLIF(cu.full_name, ''), cu.username) AS confirmed_by_name
                    FROM shifts s
                    LEFT JOIN users cu ON cu.id = s.confirmed_by
                    {$whereSql}
                    ORDER BY s.id DESC
                    LIMIT 2000
                ");
                $csvStmt->execute($params);
                $rows = $csvStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

                AdminLogService::record(
                    $pdo,
                    $staffId,
                    'EXPORT_CSV',
                    'shift',
                    'shifts',
                    null,
                    [
                        'module'    => 'shifts',
                        'filters'   => ['date' => $filterDate, 'staff_id' => $filterStaff],
                        'row_count' => count($rows),
                    ],
                    get_client_ip()
                );

                $filename = 'lich-su-chot-ca-' . date('Ymd-His') . '.csv';
                header('Content-Type: text/csv; charset=utf-8');
                header('Content-Disposition: attachment; filename="' . $filename . '"');
                header('X-Content-Type-Options: nosniff');
                header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

                $out = fopen('php://output', 'w');
                if ($out !== false) {
                    fwrite($out, "\xEF\xBB\xBF");
                    fputcsv($out, [
                        'Mã ca',
                        'Nhân viên',
                        'Mở ca',
                        'Chốt ca',
                        'Tiền đầu ca',
                        'Hệ thống TM',
                        'VietQR',
                        'NV đếm gốc',
                        'Thực nhận duyệt',
                        'Chênh lệch',
                        'Trạng thái',
                        'Lý do lệch NV',
                        'Người đối soát',
                        'Thời điểm đối soát',
                        'Ghi chú đối soát',
                    ]);
                    foreach ($rows as $r) {
                        $staffCounted = $r['staff_counted_cash'] ?? $r['actual_cash_received'];
                        fputcsv($out, [
                            shift_neutralize_csv('SHIFT-' . $r['id']),
                            shift_neutralize_csv((string)($r['staff_name'] ?? '')),
                            shift_neutralize_csv(shift_format_dt_vn((string)($r['start_time'] ?? ''))),
                            shift_neutralize_csv(!empty($r['end_time']) ? shift_format_dt_vn((string)$r['end_time']) : 'Đang mở'),
                            (int)round((float)($r['initial_cash'] ?? 0)),
                            (int)($r['cash_total'] ?? 0),
                            (int)($r['transfer_total'] ?? 0),
                            $staffCounted !== null ? (int)round((float)$staffCounted) : '',
                            $r['actual_cash_received'] !== null ? (int)$r['actual_cash_received'] : '',
                            $r['discrepancy_amount'] !== null ? (int)$r['discrepancy_amount'] : '',
                            shift_neutralize_csv(shift_status_label_vi((string)($r['status'] ?? ''))),
                            shift_neutralize_csv((string)($r['discrepancy_reason'] ?? '')),
                            shift_neutralize_csv((string)($r['confirmed_by_name'] ?? '')),
                            shift_neutralize_csv(!empty($r['confirmed_at']) ? shift_format_dt_vn((string)$r['confirmed_at']) : ''),
                            shift_neutralize_csv((string)($r['admin_note'] ?? '')),
                        ]);
                    }
                    fclose($out);
                }
                exit;
            }

            $openStmt = $pdo->prepare("SELECT * FROM shifts WHERE staff_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1");
            $openStmt->execute([$staffId]);
            $activeShift = $openStmt->fetch(PDO::FETCH_ASSOC);

            $anyOpenStmt = $pdo->query("SELECT id, staff_id, staff_name, start_time FROM shifts WHERE status = 'open' ORDER BY id DESC LIMIT 1");
            $anyOpenShift = $anyOpenStmt ? $anyOpenStmt->fetch(PDO::FETCH_ASSOC) : null;
            $blockingOpenShift = null;

            $openTime = null;
            $activeCashTotal = 0;
            $activeTransferTotal = 0;
            $warnLevel = 'none';

            if ($activeShift) {
                $totals = $computeShiftTotals($pdo, $staffId, (string)$activeShift['start_time'], null);
                $activeCashTotal = (int)$totals['cashTotal'];
                $activeTransferTotal = (int)$totals['transferTotal'];
                $warn = shift_compute_warn_level((string)$activeShift['start_time']);

                $activeShift['open_time'] = (string)$activeShift['start_time'];
                $activeShift['start_time_formatted'] = shift_format_dt_vn((string)$activeShift['start_time']);
                $activeShift['cash_total'] = $activeCashTotal;
                $activeShift['transfer_total'] = $activeTransferTotal;
                $activeShift['is_overdue'] = $warn['is_overdue'];
                $activeShift['warn_level'] = $warn['warn_level'];
                $activeShift['hours_open'] = $warn['hours_open'];

                $openTime = (string)$activeShift['start_time'];
                $warnLevel = $warn['warn_level'];

                try {
                    $updOpen = $pdo->prepare("UPDATE shifts SET cash_total = ?, transfer_total = ? WHERE id = ?");
                    $updOpen->execute([$activeCashTotal, $activeTransferTotal, $activeShift['id']]);
                } catch (Throwable $updEx) {
                    error_log("[UPDATE ACTIVE SHIFT WARN] " . $updEx->getMessage());
                }
            } elseif ($anyOpenShift) {
                $bWarn = shift_compute_warn_level((string)$anyOpenShift['start_time']);
                $blockingOpenShift = [
                    'id'                   => (int)$anyOpenShift['id'],
                    'staff_id'             => (int)$anyOpenShift['staff_id'],
                    'staff_name'           => (string)$anyOpenShift['staff_name'],
                    'start_time'           => (string)$anyOpenShift['start_time'],
                    'start_time_formatted' => shift_format_dt_vn((string)$anyOpenShift['start_time']),
                    'hours_open'           => $bWarn['hours_open'],
                    'warn_level'           => $bWarn['warn_level'],
                ];
            }

            $page = max(1, (int)($_GET['page'] ?? 1));
            $limit = min(100, max(1, (int)($_GET['limit'] ?? 20)));
            $offset = ($page - 1) * $limit;

            $countStmt = $pdo->prepare("SELECT COUNT(*) FROM shifts s {$whereSql}");
            $countStmt->execute($params);
            $totalShifts = (int)$countStmt->fetchColumn();

            $listStmt = $pdo->prepare("
                SELECT s.*, COALESCE(NULLIF(cu.full_name, ''), cu.username) AS confirmed_by_name
                FROM shifts s
                LEFT JOIN users cu ON cu.id = s.confirmed_by
                {$whereSql}
                ORDER BY s.id DESC
                LIMIT {$limit} OFFSET {$offset}
            ");
            $listStmt->execute($params);
            $shifts = $listStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            foreach ($shifts as &$sh) {
                $sh['start_time_formatted'] = shift_format_dt_vn((string)($sh['start_time'] ?? ''));
                $sh['end_time_formatted'] = !empty($sh['end_time']) ? shift_format_dt_vn((string)$sh['end_time']) : '';
                $sh['confirmed_at_formatted'] = !empty($sh['confirmed_at']) ? shift_format_dt_vn((string)$sh['confirmed_at']) : '';
                $sh['status_label'] = shift_status_label_vi((string)($sh['status'] ?? ''));
                if ($sh['staff_counted_cash'] === null && $sh['actual_cash_received'] !== null) {
                    $sh['staff_counted_cash'] = (float)$sh['actual_cash_received'];
                }
            }
            unset($sh);

            $staffListStmt = $pdo->query("SELECT id, full_name, username, role FROM users WHERE role IN ('staff', 'manager', 'admin') ORDER BY full_name ASC");
            $staffList = $staffListStmt ? ($staffListStmt->fetchAll(PDO::FETCH_ASSOC) ?: []) : [];

            json_response([
                'success' => true,
                'data'    => [
                    'activeShift'       => $activeShift ?: null,
                    'currentShift'      => $activeShift ?: null,
                    'open_time'         => $openTime,
                    'cash_total'        => $activeCashTotal,
                    'transfer_total'    => $activeTransferTotal,
                    'warn_level'        => $warnLevel,
                    'blockingOpenShift' => $blockingOpenShift,
                    'shifts'            => $shifts,
                    'staffList'         => $staffList,
                    'pagination'        => [
                        'total'      => $totalShifts,
                        'page'       => $page,
                        'limit'      => $limit,
                        'totalPages' => $totalShifts > 0 ? (int)ceil($totalShifts / $limit) : 1,
                    ],
                ],
            ]);
        } catch (Throwable $e) {
            error_log("[HANDLE_ADMIN_SHIFTS GET ERROR] " . $e->getMessage());
            json_response([
                'success' => true,
                'data'    => [
                    'activeShift'       => null,
                    'currentShift'      => null,
                    'open_time'         => null,
                    'cash_total'        => 0,
                    'transfer_total'    => 0,
                    'warn_level'        => 'none',
                    'blockingOpenShift' => null,
                    'shifts'            => [],
                    'staffList'         => [],
                    'pagination'        => ['total' => 0, 'page' => 1, 'limit' => 20, 'totalPages' => 1],
                ],
            ]);
        }
    }

    if ($method === 'POST') {
        $subAction = sanitize_string((string)($data['sub_action'] ?? ''), 30);
        $minReasonLen = shift_get_reason_min_len($pdo);

        if ($subAction === 'open_shift') {
            $staff = require_staff_or_admin($pdo);
            $staffId = (int)$staff['id'];
            $staffName = !empty($staff['full_name']) ? (string)$staff['full_name'] : (string)($staff['username'] ?? 'Nhân viên');

            $initialCash = isset($data['initial_cash']) && is_numeric($data['initial_cash']) ? (int)$data['initial_cash'] : -1;
            if ($initialCash < 0) {
                json_error('Mở ca bắt buộc phải nhập tiền đầu ca (số nguyên ≥ 0).', 400, 'ERR_INVALID_INITIAL_CASH');
            }
            $note = sanitize_string((string)($data['note'] ?? ''), 255);

            $pdo->beginTransaction();
            try {
                // Block opening a new shift if ANY shift anywhere is still 'open'
                $openCheck = $pdo->query("SELECT id, staff_id, staff_name, start_time FROM shifts WHERE status = 'open' ORDER BY id ASC LIMIT 1 FOR UPDATE");
                $existingOpen = $openCheck ? $openCheck->fetch(PDO::FETCH_ASSOC) : null;
                if ($existingOpen) {
                    $pdo->rollBack();
                    $openTimeFmt = shift_format_dt_vn((string)$existingOpen['start_time']);
                    json_error(
                        "Không thể mở ca mới vì còn ca trực #{$existingOpen['id']} ({$existingOpen['staff_name']}, mở lúc {$openTimeFmt}) đang mở. Vui lòng chốt ca đó trước!",
                        400,
                        'ERR_SHIFT_ALREADY_OPEN'
                    );
                }

                $insStmt = $pdo->prepare("INSERT INTO shifts (staff_id, staff_name, start_time, initial_cash, note, status) VALUES (?, ?, NOW(), ?, ?, 'open')");
                $insStmt->execute([$staffId, $staffName, $initialCash, $note]);
                $newShiftId = (int)$pdo->lastInsertId();

                AdminLogService::record(
                    $pdo,
                    $staffId,
                    'SHIFT_OPEN',
                    'shift',
                    'SHIFT-' . $newShiftId,
                    null,
                    ['initial_cash' => $initialCash, 'note' => $note, 'status' => 'open'],
                    get_client_ip()
                );

                $pdo->commit();

                json_response([
                    'success' => true,
                    'message' => "Đã mở ca trực #{$newShiftId} thành công với tiền đầu ca " . number_format($initialCash, 0, ',', '.') . "đ.",
                    'data'    => [
                        'shift_id'     => $newShiftId,
                        'initial_cash' => $initialCash,
                        'status'       => 'open',
                    ],
                ]);
            } catch (Throwable $e) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                throw $e;
            }
        }

        if ($subAction === 'close_shift') {
            $staff = require_staff_or_admin($pdo);
            $staffId = (int)$staff['id'];
            $rawShiftId = (string)($data['shift_id'] ?? $data['id'] ?? '');
            $shiftId = (int)preg_replace('/\D+/', '', $rawShiftId);
            $note = sanitize_string((string)($data['note'] ?? ''), 500);

            $pdo->beginTransaction();
            try {
                if ($shiftId > 0) {
                    $sStmt = $pdo->prepare("SELECT * FROM shifts WHERE id = ? FOR UPDATE");
                    $sStmt->execute([$shiftId]);
                    $shift = $sStmt->fetch(PDO::FETCH_ASSOC);
                } else {
                    $sStmt = $pdo->prepare("SELECT * FROM shifts WHERE staff_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1 FOR UPDATE");
                    $sStmt->execute([$staffId]);
                    $shift = $sStmt->fetch(PDO::FETCH_ASSOC);
                }

                if (!$shift) {
                    $pdo->rollBack();
                    json_error('Không tìm thấy ca trực đang mở để chốt ca.', 404, 'ERR_SHIFT_NOT_FOUND');
                }
                if ($shift['status'] !== 'open') {
                    $pdo->rollBack();
                    json_error('Ca trực này đã được chốt trước đó.', 400, 'ERR_SHIFT_ALREADY_CLOSED');
                }
                if (($staff['role'] ?? '') === 'staff' && (int)$shift['staff_id'] !== $staffId) {
                    $pdo->rollBack();
                    json_error('Bạn chỉ được phép chốt ca trực của chính mình.', 403, 'ERR_FORBIDDEN');
                }

                $totals = $computeShiftTotals($pdo, (int)$shift['staff_id'], (string)$shift['start_time'], date('Y-m-d H:i:s'));
                $cashTotal = (int)$totals['cashTotal'];
                $transferTotal = (int)$totals['transferTotal'];
                $initialCash = (int)($shift['initial_cash'] ?? 0);

                $val = $data['actual_cash_received'] ?? $data['cash_counted'] ?? null;
                if (is_string($val)) {
                    $val = trim($val);
                }
                if ($val === null || $val === '' || !is_numeric($val) || (float)$val < 0) {
                    $pdo->rollBack();
                    http_response_code(422);
                    header('Content-Type: application/json; charset=utf-8');
                    echo json_encode([
                        'success'  => false,
                        'message'  => 'Vui lòng nhập số tiền mặt thực tế kiểm đếm (>= 0đ)',
                        'ref_code' => 'ERR_ACTUAL_CASH_REQUIRED',
                        'error'    => ['code' => 'ERR_ACTUAL_CASH_REQUIRED', 'message' => 'Vui lòng nhập số tiền mặt thực tế kiểm đếm (>= 0đ)'],
                    ], JSON_UNESCAPED_UNICODE);
                    exit;
                }

                $countedCash = (float)$val;
                $expectedTotalCash = $cashTotal + $initialCash;
                $discrepancy = $countedCash - $expectedTotalCash;
                $rawReason = sanitize_string((string)($data['discrepancy_reason'] ?? $data['reason'] ?? ''), 500);
                $discrepancyReason = $rawReason;
                $targetStatus = 'closed';

                if (abs($discrepancy) > 0.0001) {
                    $reasonCheck = validate_mandatory_audit_reason($rawReason, $minReasonLen);
                    if (!$reasonCheck['valid']) {
                        $pdo->rollBack();
                        json_error($reasonCheck['message'], 400, 'ERR_DISCREPANCY_REASON_REQUIRED');
                    }
                    $discrepancyReason = $reasonCheck['reason'];
                    $targetStatus = 'pending_explanation';
                }

                $updStmt = $pdo->prepare("
                    UPDATE shifts
                    SET end_time = NOW(),
                        cash_total = ?,
                        transfer_total = ?,
                        actual_cash_received = ?,
                        staff_counted_cash = ?,
                        discrepancy_amount = ?,
                        actual_cash = ?,
                        cash_discrepancy = ?,
                        discrepancy_reason = ?,
                        note = ?,
                        status = ?
                    WHERE id = ? AND status = 'open'
                ");
                $updStmt->execute([
                    $cashTotal,
                    $transferTotal,
                    (int)round($countedCash),
                    $countedCash,
                    (int)round($discrepancy),
                    $countedCash,
                    $discrepancy,
                    $discrepancyReason,
                    $note,
                    $targetStatus,
                    $shift['id'],
                ]);

                AdminLogService::record(
                    $pdo,
                    $staffId,
                    'SHIFT_CLOSE',
                    'shift',
                    'SHIFT-' . $shift['id'],
                    ['status' => 'open'],
                    [
                        'status'               => $targetStatus,
                        'initial_cash'         => $initialCash,
                        'cash_total'           => $cashTotal,
                        'transfer_total'       => $transferTotal,
                        'staff_counted_cash'   => $countedCash,
                        'actual_cash_received' => $countedCash,
                        'discrepancy_amount'   => $discrepancy,
                        'discrepancy_reason'   => $discrepancyReason,
                        'note'                 => $note,
                    ],
                    get_client_ip()
                );

                $pdo->commit();

                $msg = $targetStatus === 'pending_explanation'
                    ? 'Đã chốt ca trực (có chênh lệch quỹ - chuyển trạng thái Chờ giải trình để Quản lý kiểm tra).'
                    : 'Đã chốt ca trực thành công! Chờ Quản lý đối soát tiền mặt.';

                json_response([
                    'success' => true,
                    'message' => $msg,
                    'data'    => [
                        'shift_id'             => (int)$shift['id'],
                        'cash_total'           => $cashTotal,
                        'transfer_total'       => $transferTotal,
                        'staff_counted_cash'   => $countedCash,
                        'actual_cash_received' => $countedCash,
                        'discrepancy_amount'   => $discrepancy,
                        'discrepancy_reason'   => $discrepancyReason,
                        'status'               => $targetStatus,
                    ],
                ]);
            } catch (Throwable $e) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                throw $e;
            }
        }

        if ($subAction === 'confirm_shift') {
            $mgr = require_manager_or_admin($pdo);
            $rawShiftId = (string)($data['shift_id'] ?? $data['id'] ?? '');
            $shiftId = (int)preg_replace('/\D+/', '', $rawShiftId);
            $adminNote = sanitize_string((string)($data['admin_note'] ?? ''), 500);
            $editReasonInput = sanitize_string((string)($data['edit_reason'] ?? ''), 500);

            if ($shiftId <= 0) {
                json_error('Thiếu mã ca trực cần đối soát.', 400, 'ERR_MISSING_SHIFT_ID');
            }

            $pdo->beginTransaction();
            try {
                $sStmt = $pdo->prepare("SELECT * FROM shifts WHERE id = ? FOR UPDATE");
                $sStmt->execute([$shiftId]);
                $shift = $sStmt->fetch(PDO::FETCH_ASSOC);

                if (!$shift) {
                    $pdo->rollBack();
                    json_error('Không tìm thấy ca trực tương ứng.', 404, 'ERR_SHIFT_NOT_FOUND');
                }
                if ($shift['status'] === 'open') {
                    $pdo->rollBack();
                    json_error('Ca trực đang mở, không được đối soát. Vui lòng chốt ca trước!', 400, 'ERR_SHIFT_STILL_OPEN');
                }
                if ($shift['status'] === 'confirmed') {
                    $pdo->rollBack();
                    json_error('Ca trực này đã được đối soát rồi, không thể đối soát lại!', 400, 'ERR_SHIFT_ALREADY_CONFIRMED');
                }

                $origStaffCount = $shift['staff_counted_cash'] !== null
                    ? (float)$shift['staff_counted_cash']
                    : ($shift['actual_cash_received'] !== null ? (float)$shift['actual_cash_received'] : null);

                $actualCash = isset($data['actual_cash_received']) && $data['actual_cash_received'] !== ''
                    ? (float)$data['actual_cash_received']
                    : (float)($origStaffCount ?? ((int)$shift['cash_total'] + (int)($shift['initial_cash'] ?? 0)));

                if ($actualCash < 0) {
                    $pdo->rollBack();
                    json_error('Số tiền thực nhận không hợp lệ.', 400, 'ERR_INVALID_ACTUAL_CASH');
                }

                $expectedTotal = (float)$shift['cash_total'] + (float)($shift['initial_cash'] ?? 0);
                $discrepancy = $actualCash - $expectedTotal;
                $editedStaffCount = ($origStaffCount !== null && abs($actualCash - $origStaffCount) > 0.0001);

                if ($editedStaffCount) {
                    $reasonToCheck = $editReasonInput !== '' ? $editReasonInput : $adminNote;
                    $editCheck = validate_mandatory_audit_reason($reasonToCheck, $minReasonLen);
                    if (!$editCheck['valid']) {
                        $pdo->rollBack();
                        json_error(
                            'Khi điều chỉnh số tiền khác số nhân viên đếm gốc, bắt buộc nhập lý do tối thiểu ' . $minReasonLen . ' ký tự rõ ràng. ' . $editCheck['message'],
                            400,
                            'ERR_SHIFT_EDIT_REASON_REQUIRED'
                        );
                    }
                    $validatedEditReason = $editCheck['reason'];
                    if ($adminNote === '') {
                        $adminNote = $validatedEditReason;
                    }
                    AdminLogService::record(
                        $pdo,
                        (int)$mgr['id'],
                        'SHIFT_EDIT_COUNT',
                        'shift',
                        'SHIFT-' . $shiftId,
                        ['staff_counted_cash' => $origStaffCount],
                        ['actual_cash_received' => $actualCash, 'edit_reason' => $validatedEditReason],
                        get_client_ip()
                    );
                }

                if (abs($discrepancy) > 0.0001) {
                    $noteCheck = validate_mandatory_audit_reason($adminNote, $minReasonLen);
                    if (!$noteCheck['valid']) {
                        $pdo->rollBack();
                        json_error(
                            'Ca trực có chênh lệch quỹ, bắt buộc nhập ghi chú đối soát từ ' . $minReasonLen . ' ký tự trở lên. ' . $noteCheck['message'],
                            400,
                            'ERR_ADMIN_NOTE_REQUIRED'
                        );
                    }
                    $adminNote = $noteCheck['reason'];
                }

                $updStmt = $pdo->prepare("
                    UPDATE shifts
                    SET actual_cash_received = ?,
                        staff_counted_cash = COALESCE(staff_counted_cash, ?),
                        discrepancy_amount = ?,
                        actual_cash = ?,
                        cash_discrepancy = ?,
                        admin_note = ?,
                        status = 'confirmed',
                        confirmed_by = ?,
                        confirmed_at = NOW(),
                        end_time = COALESCE(end_time, NOW())
                    WHERE id = ? AND status IN ('closed', 'pending_explanation')
                ");
                $updStmt->execute([
                    (int)round($actualCash),
                    $origStaffCount,
                    (int)round($discrepancy),
                    $actualCash,
                    $discrepancy,
                    $adminNote,
                    (int)$mgr['id'],
                    $shiftId,
                ]);

                AdminLogService::record(
                    $pdo,
                    (int)$mgr['id'],
                    'SHIFT_CONFIRM',
                    'shift',
                    'SHIFT-' . $shiftId,
                    ['status' => (string)$shift['status']],
                    [
                        'status'               => 'confirmed',
                        'actual_cash_received' => $actualCash,
                        'staff_counted_cash'   => $origStaffCount,
                        'discrepancy_amount'   => $discrepancy,
                        'admin_note'           => $adminNote,
                        'edited_staff_count'   => $editedStaffCount,
                    ],
                    get_client_ip()
                );

                if (abs($discrepancy) > 0.0001 && function_exists('send_telegram_notification')) {
                    $tgMsg = "🚨 <b>CẢNH BÁO CHÊNH LỆCH TIỀN MẶT CA TRỰC</b>\n"
                           . "• Ca trực: <b>SHIFT-{$shiftId}</b> (NV: {$shift['staff_name']})\n"
                           . "• Hệ thống tính: <b>" . number_format((int)$shift['cash_total']) . " đ</b>\n"
                           . "• Tiền đầu ca: <b>" . number_format((int)$shift['initial_cash']) . " đ</b>\n"
                           . "• Thực nhận: <b>" . number_format((int)round($actualCash)) . " đ</b>\n"
                           . "• Chênh lệch: <b>" . ($discrepancy > 0 ? '+' : '') . number_format((int)round($discrepancy)) . " đ</b>\n"
                           . "• Quản lý duyệt: " . ($mgr['full_name'] ?? $mgr['username'] ?? 'Quản lý');
                    send_telegram_notification($tgMsg, 'shift_diff', $pdo);
                }

                $pdo->commit();

                json_response([
                    'success' => true,
                    'message' => 'Đã xác nhận đối soát bàn giao tiền mặt ca trực thành công!',
                    'data'    => [
                        'shift_id'             => $shiftId,
                        'staff_counted_cash'   => $origStaffCount,
                        'actual_cash_received' => $actualCash,
                        'discrepancy_amount'   => $discrepancy,
                        'status'               => 'confirmed',
                    ],
                ]);
            } catch (Throwable $e) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                throw $e;
            }
        }

        json_error('Thao tác ca trực không hợp lệ.', 400, 'ERR_INVALID_SHIFT_ACTION');
    }
}
