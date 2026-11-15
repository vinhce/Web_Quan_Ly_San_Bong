<?php

if (!defined('SANBONG_ADMIN_ROUTER')) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'Direct access forbidden.', 'ref_code' => 'ERR_FORBIDDEN'], JSON_UNESCAPED_UNICODE);
    exit;
}

    require_once __DIR__ . '/services/admin_finance_reports.php';
    if (handle_admin_finance_reports($action, $method, $pdo, $data, $actor)) {
        exit;
    }

    if ($action === 'pending_deposits') {
        $staff = !empty($actor) ? $actor : require_staff_or_admin($pdo);
        if (!in_array($staff['role'] ?? '', ['admin', 'manager', 'staff'], true)) {
            json_error('Bạn không có quyền hạn thực hiện thao tác này.', 403, 'ERR_FORBIDDEN');
        }

        $bStmt = $pdo->query("
            SELECT b.id, b.code, b.customer_name, b.phone, b.pitch_id, b.booking_date, b.slot_time,
                   b.deposit_amount, b.total_price, b.paid_amount, b.payment_status, b.payment_method,
                   b.status, b.created_at, p.name AS pitch_name
            FROM bookings b
            LEFT JOIN pitches p ON b.pitch_id = p.id
            WHERE b.payment_status IN ('Chờ duyệt cọc', 'Chờ cọc 30%')
              AND b.status NOT IN ('Đã hủy')
            ORDER BY b.id DESC
            LIMIT 100
        ");
        $bookings = $bStmt ? $bStmt->fetchAll() : [];

        $pendingList = [];
        $txCheckStmt = null;
        try {
            $txCheckStmt = $pdo->prepare("
                SELECT transfer_amount, match_status
                FROM bank_transactions
                WHERE matched_booking_code = ? OR detected_booking_code = ? OR transaction_content LIKE ?
                ORDER BY id DESC LIMIT 1
            ");
        } catch (Throwable $e) {}

        foreach ($bookings as $b) {
            $bCode = (string)($b['code'] ?? '');
            $amt = (int)($b['deposit_amount'] ?? 0);
            $paidAmt = (int)($b['paid_amount'] ?? 0);
            $txAmt = 0;
            $txStatus = 'missing';
            $txLabel = 'Chưa thấy tiền';

            if ($txCheckStmt && $bCode !== '') {
                try {
                    $txCheckStmt->execute([$bCode, $bCode, '%' . $bCode . '%']);
                    $tx = $txCheckStmt->fetch();
                    if ($tx) {
                        $txAmt = (int)($tx['transfer_amount'] ?? 0);
                        $mStatus = (string)($tx['match_status'] ?? '');
                        if ($mStatus === 'matched' || $mStatus === 'overpaid' || ($txAmt >= $amt && $amt > 0)) {
                            $txStatus = 'matched';
                            $txLabel = ($txAmt > $amt && $amt > 0) ? 'Nhận thừa' : 'Đã nhận đủ';
                        } elseif ($mStatus === 'underpaid' || ($txAmt > 0 && $txAmt < $amt)) {
                            $txStatus = 'partial';
                            $txLabel = 'Nhận thiếu';
                        } elseif ($mStatus === 'unmatched') {
                            $txStatus = 'unmatched';
                            $txLabel = 'Chưa thấy tiền';
                        } else {
                            $txStatus = 'matched';
                            $txLabel = 'Đã nhận đủ';
                        }
                    }
                } catch (Throwable $te) {}
            }

            if ($txStatus === 'missing' && $paidAmt > 0) {
                $txStatus = ($paidAmt >= $amt && $amt > 0) ? 'matched' : 'partial';
                $txLabel = ($paidAmt >= $amt && $amt > 0) ? 'Đã nhận đủ' : 'Nhận thiếu';
                $txAmt = $paidAmt;
            }

            $timeFmt = !empty($b['created_at']) ? date('H:i d/m/Y', strtotime($b['created_at'])) : '';

            $pendingList[] = [
                'id'              => (int)$b['id'],
                'code'            => $bCode,
                'time'            => $timeFmt,
                'name'            => $b['customer_name'] ?? '',
                'phone'           => $b['phone'] ?? '',
                'pitch_name'      => $b['pitch_name'] ?? $b['pitch_id'],
                'date'            => $b['booking_date'] ?? '',
                'slot_time'       => $b['slot_time'] ?? '',
                'amt'             => $amt,
                'deposit_amount'  => $amt,
                'total_price'     => (int)($b['total_price'] ?? 0),
                'bank'            => 'VietQR MBBank',
                'payment_method'  => $b['payment_method'] ?? 'VietQR Chuyển khoản',
                'created_at'      => $b['created_at'] ?? '',
                'created_at_fmt'  => $timeFmt,
                'bankTxStatus'    => $txStatus,
                'bank_tx_status'  => $txLabel,
                'txAmt'           => $txAmt,
                'transfer_amount' => $txAmt,
                'paidAmt'         => $paidAmt,
                'paid_amount'     => $paidAmt
            ];
        }

        json_response(['success' => true, 'data' => $pendingList]);
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

            $pendingTxCount = (int)$pdo->query("SELECT COUNT(*) FROM bank_transactions WHERE match_status IN ('unmatched', 'underpaid', 'overpaid')")->fetchColumn();
            $pendingBookingCount = (int)$pdo->query("SELECT COUNT(*) FROM bookings WHERE payment_status IN ('Chờ duyệt cọc', 'Chờ cọc 30%') AND status NOT IN ('Đã hủy', 'Hoàn thành')")->fetchColumn();
            $pendingCount = $pendingTxCount + $pendingBookingCount;

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

    // 6.4 Quản lý chi phí: Sửa khoản chi (Manager/Admin, Staff bị chặn 403)
    if ($action === 'update_expense') {
        $mgr = require_manager_or_admin($pdo);
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) {
            json_error('Thiếu mã định danh khoản chi.', 400, 'ERR_INVALID_ID');
        }
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

        $stmt = $pdo->prepare("
            UPDATE expenses
            SET category = ?, category_name = ?, amount = ?, expense_date = ?, payer_name = ?, receipt_note = ?
            WHERE id = ?
        ");
        $stmt->execute([$cat, $catName, $amt, $date, $payer, $note, $id]);

        write_audit_log($pdo, 'EXPENSE_UPDATE', "EXP-#{$id}", null, "Cập nhật khoản chi #{$id}: {$catName} (" . number_format($amt) . "đ) ngày {$date} - {$note}", $mgr);

        json_response([
            'success' => true,
            'message' => "Đã cập nhật khoản chi #" . $id . " thành công!"
        ]);
    }

    // 6.4 Quản lý chi phí: Xóa khoản chi (Chỉ Manager/Admin, Staff bị chặn 403)
    if ($action === 'delete_expense') {
        $mgr = require_manager_or_admin($pdo);
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) {
            json_error('Thiếu mã định danh khoản chi.', 400, 'ERR_INVALID_ID');
        }
        $stmt = $pdo->prepare("DELETE FROM expenses WHERE id = ?");
        $stmt->execute([$id]);
        write_audit_log($pdo, 'EXPENSE_DELETE', "EXP-#{$id}", null, "Xóa khoản chi #{$id}", $mgr);
        json_response(['success' => true, 'message' => "Đã xóa khoản chi!"]);
    }

    require_once __DIR__ . '/services/admin_system_ops.php';
    if (handle_admin_system_ops($action, $method, $pdo, $data, $actor)) {
        exit;
    }
