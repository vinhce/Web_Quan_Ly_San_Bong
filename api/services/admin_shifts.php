<?php
declare(strict_types=1);

if (!defined('SANBONG_ADMIN_ROUTER')) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'Direct access forbidden.', 'ref_code' => 'ERR_FORBIDDEN'], JSON_UNESCAPED_UNICODE);
    exit;
}

function handle_admin_shifts(PDO $pdo, string $method, array $data, array $actor): void {
    $computeShiftTotals = function (PDO $pdo, int $staffId, string $startTime, ?string $endTime = null): array {
        try {
            $endBound = $endTime ?: date('Y-m-d H:i:s');
            
            $hasStaffCol = function_exists('db_table_has_column') ? db_table_has_column($pdo, 'bookings', 'staff_id') : true;
            $staffCondition = $hasStaffCol
                ? "(staff_id = :staff_id OR user_id = :staff_id OR code IN (SELECT booking_id FROM audit_logs WHERE user_id = :staff_id AND action = 'WALKIN_BOOKING'))"
                : "(user_id = :staff_id OR code IN (SELECT booking_id FROM audit_logs WHERE user_id = :staff_id AND action = 'WALKIN_BOOKING'))";

            $stmtWalkin = $pdo->prepare("SELECT COALESCE(SUM(deposit_amount), 0) AS total_walkin_cash
                FROM bookings
                WHERE created_at >= :start_time AND created_at <= :end_bound
                  AND status != 'Đã hủy'
                  AND (payment_method LIKE '%Tiền mặt%' OR note LIKE '%tại quầy%')
                  AND {$staffCondition}");
            $stmtWalkin->execute([':start_time' => $startTime, ':end_bound' => $endBound, ':staff_id' => $staffId]);
            $walkinCash = (int)$stmtWalkin->fetchColumn();

            // Tuyệt đối không dùng SQL REGEXP_REPLACE (MySQL < 8.0 crash 1305). Fetch giá trị về và preg_replace bằng PHP.
            $stmtRemaining = $pdo->prepare("SELECT old_value
                FROM audit_logs
                WHERE user_id = :staff_id
                  AND action = 'COLLECT_PAYMENT'
                  AND (new_value LIKE '%Tiền mặt%' OR new_value LIKE '%quầy%')
                  AND created_at >= :start_time AND created_at <= :end_bound");
            $stmtRemaining->execute([':start_time' => $startTime, ':end_bound' => $endBound, ':staff_id' => $staffId]);
            $remCash = 0;
            while ($row = $stmtRemaining->fetch(PDO::FETCH_ASSOC)) {
                $rawOld = (string)($row['old_value'] ?? '');
                $digits = preg_replace('/[^0-9]/', '', $rawOld);
                if ($digits !== '') {
                    $remCash += (int)$digits;
                }
            }

            $stmtSales = $pdo->prepare("SELECT COALESCE(SUM(total_amount), 0) AS total_service_cash
                FROM service_sales
                WHERE created_at >= :start_time AND created_at <= :end_bound
                  AND payment_method LIKE '%Tiền mặt%'
                  AND (staff_id = :staff_id OR staff_id IS NULL)");
            $stmtSales->execute([':start_time' => $startTime, ':end_bound' => $endBound, ':staff_id' => $staffId]);
            $serviceCash = (int)$stmtSales->fetchColumn();

            $cashTotal = $walkinCash + $remCash + $serviceCash;

            $stmtTransfer = $pdo->prepare("SELECT COALESCE(SUM(transfer_amount), 0) AS total_transfer
                FROM bank_transactions
                WHERE created_at >= :start_time AND created_at <= :end_bound
                  AND match_status IN ('matched', 'overpaid', 'underpaid', 'resolved')");
            $stmtTransfer->execute([':start_time' => $startTime, ':end_bound' => $endBound]);
            $transferTotal = (int)$stmtTransfer->fetchColumn();

            return [
                'cashTotal'     => $cashTotal,
                'transferTotal' => $transferTotal,
                'walkinCash'    => $walkinCash,
                'remCash'       => $remCash,
                'serviceCash'   => $serviceCash
            ];
        } catch (Throwable $e) {
            error_log("[COMPUTE_SHIFT_TOTALS ERROR] " . $e->getMessage());
            return [
                'cashTotal'     => 0,
                'transferTotal' => 0,
                'walkinCash'    => 0,
                'remCash'       => 0,
                'serviceCash'   => 0
            ];
        }
    };

    if ($method === 'GET') {
        try {
            $staffId = (int)($actor['id'] ?? 0);
            $isManagerOrAdmin = in_array($actor['role'] ?? '', ['admin', 'manager'], true);

            $openStmt = $pdo->prepare("SELECT * FROM shifts WHERE staff_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1");
            $openStmt->execute([$staffId]);
            $activeShift = $openStmt->fetch();

            if ($activeShift) {
                $totals = $computeShiftTotals($pdo, $staffId, $activeShift['start_time'], null);
                $activeShift['cash_total'] = $totals['cashTotal'];
                $activeShift['transfer_total'] = $totals['transferTotal'];
                $diffHours = (time() - strtotime($activeShift['start_time'])) / 3600;
                $activeShift['is_overdue'] = ($diffHours >= 14);
                $activeShift['hours_open'] = round($diffHours, 1);

                try {
                    $updOpen = $pdo->prepare("UPDATE shifts SET cash_total = ?, transfer_total = ? WHERE id = ?");
                    $updOpen->execute([$totals['cashTotal'], $totals['transferTotal'], $activeShift['id']]);
                } catch (Throwable $updEx) {
                    error_log("[UPDATE ACTIVE SHIFT WARN] " . $updEx->getMessage());
                }
            }

            $filterDate = sanitize_string($_GET['date'] ?? '', 20);
            $filterStaff = isset($_GET['staff_id']) && $_GET['staff_id'] !== '' ? (int)$_GET['staff_id'] : null;
            $page = max(1, (int)($_GET['page'] ?? 1));
            $limit = min(100, max(1, (int)($_GET['limit'] ?? 20)));
            $offset = ($page - 1) * $limit;

            $whereClauses = [];
            $params = [];

            if (!$isManagerOrAdmin) {
                $whereClauses[] = "staff_id = ?";
                $params[] = $staffId;
            } else {
                if ($filterStaff !== null && $filterStaff > 0) {
                    $whereClauses[] = "staff_id = ?";
                    $params[] = $filterStaff;
                }
            }

            if ($filterDate !== '') {
                $whereClauses[] = "DATE(start_time) = ?";
                $params[] = $filterDate;
            }

            $whereSql = count($whereClauses) > 0 ? 'WHERE ' . implode(' AND ', $whereClauses) : '';

            $countStmt = $pdo->prepare("SELECT COUNT(*) FROM shifts {$whereSql}");
            $countStmt->execute($params);
            $totalShifts = (int)$countStmt->fetchColumn();

            $listStmt = $pdo->prepare("SELECT * FROM shifts {$whereSql} ORDER BY id DESC LIMIT {$limit} OFFSET {$offset}");
            $listStmt->execute($params);
            $shifts = $listStmt->fetchAll() ?: [];

            $staffListStmt = $pdo->query("SELECT id, full_name, username, role FROM users WHERE role IN ('staff', 'manager', 'admin') ORDER BY full_name ASC");
            $staffList = $staffListStmt ? ($staffListStmt->fetchAll() ?: []) : [];

            json_response([
                'success' => true,
                'data'    => [
                    'activeShift'  => $activeShift ?: null,
                    'currentShift' => $activeShift ?: null,
                    'shifts'       => $shifts,
                    'staffList'    => $staffList,
                    'pagination'   => [
                        'total'      => $totalShifts,
                        'page'       => $page,
                        'limit'      => $limit,
                        'totalPages' => ceil($totalShifts / $limit)
                    ]
                ]
            ]);
        } catch (Throwable $e) {
            error_log("[HANDLE_ADMIN_SHIFTS GET ERROR] " . $e->getMessage());
            json_response([
                'success' => true,
                'data'    => [
                    'activeShift'  => null,
                    'currentShift' => null,
                    'shifts'       => [],
                    'staffList'    => [],
                    'pagination'   => [
                        'total'      => 0,
                        'page'       => 1,
                        'limit'      => 20,
                        'totalPages' => 0
                    ]
                ]
            ]);
        }
    }

    if ($method === 'POST') {
        $subAction = sanitize_string($data['sub_action'] ?? '', 30);

        if ($subAction === 'open_shift') {
            $staff = require_staff_or_admin($pdo);
            $staffId = (int)$staff['id'];
            $staffName = !empty($staff['full_name']) ? $staff['full_name'] : ($staff['username'] ?? 'Nhân viên');

            $openCheck = $pdo->prepare("SELECT id, start_time FROM shifts WHERE staff_id = ? AND status = 'open' LIMIT 1");
            $openCheck->execute([$staffId]);
            $existingOpen = $openCheck->fetch();
            if ($existingOpen) {
                json_error("Bạn đang có ca trực chưa chốt (Mã ca #{$existingOpen['id']}). Vui lòng chốt ca cũ trước khi mở ca mới!", 400, 'ERR_SHIFT_ALREADY_OPEN');
            }

            $initialCash = isset($data['initial_cash']) ? (int)$data['initial_cash'] : -1;
            if ($initialCash < 0) {
                json_error('Mở ca bắt buộc phải nhập tiền đầu ca (số nguyên ≥ 0).', 400, 'ERR_INVALID_INITIAL_CASH');
            }
            $note = sanitize_string($data['note'] ?? '', 255);

            $insStmt = $pdo->prepare("INSERT INTO shifts (staff_id, staff_name, start_time, initial_cash, note, status) VALUES (?, ?, NOW(), ?, ?, 'open')");
            $insStmt->execute([$staffId, $staffName, $initialCash, $note]);
            $newShiftId = (int)$pdo->lastInsertId();

            write_audit_log(
                $pdo,
                'SHIFT_OPEN',
                'SHIFT-' . $newShiftId,
                null,
                "Mở ca trực mới: Tiền đầu ca " . number_format($initialCash, 0, ',', '.') . "đ" . ($note ? " | Ghi chú: {$note}" : ""),
                $staff
            );

            json_response([
                'success' => true,
                'message' => "Đã mở ca trực #{$newShiftId} thành công với tiền đầu ca " . number_format($initialCash, 0, ',', '.') . "đ.",
                'data'    => [
                    'shift_id'     => $newShiftId,
                    'initial_cash' => $initialCash,
                    'status'       => 'open'
                ]
            ]);
        }

        if ($subAction === 'close_shift') {
            $staff = require_staff_or_admin($pdo);
            $staffId = (int)$staff['id'];
            $rawShiftId = (string)($data['shift_id'] ?? $data['id'] ?? '');
            $shiftId = (int)preg_replace('/\D+/', '', $rawShiftId);
            $note = sanitize_string($data['note'] ?? '', 500);

            $pdo->beginTransaction();
            try {
                if ($shiftId > 0) {
                    $sStmt = $pdo->prepare("SELECT * FROM shifts WHERE id = ? FOR UPDATE");
                    $sStmt->execute([$shiftId]);
                    $shift = $sStmt->fetch();
                } else {
                    $sStmt = $pdo->prepare("SELECT * FROM shifts WHERE staff_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1 FOR UPDATE");
                    $sStmt->execute([$staffId]);
                    $shift = $sStmt->fetch();
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

                $totals = $computeShiftTotals($pdo, (int)$shift['staff_id'], $shift['start_time'], date('Y-m-d H:i:s'));
                $cashTotal = $totals['cashTotal'];
                $transferTotal = $totals['transferTotal'];
                $initialCash = (int)($shift['initial_cash'] ?? 0);

                $countedCash = isset($data['actual_cash_received']) ? (int)$data['actual_cash_received'] : (isset($data['cash_counted']) ? (int)$data['cash_counted'] : -1);
                if ($countedCash < 0) {
                    $countedCash = $cashTotal + $initialCash;
                }

                $expectedTotalCash = $cashTotal + $initialCash;
                $discrepancy = $countedCash - $expectedTotalCash;

                $discrepancyReason = sanitize_string($data['discrepancy_reason'] ?? $data['reason'] ?? '', 255);
                if ($discrepancy !== 0 && $discrepancyReason === '') {
                    $pdo->rollBack();
                    json_error('Bắt buộc nhập lý do chênh lệch khi số tiền nhân viên đếm khác hệ thống!', 400, 'ERR_DISCREPANCY_REASON_REQUIRED');
                }

                $updStmt = $pdo->prepare("UPDATE shifts SET end_time = NOW(), cash_total = ?, transfer_total = ?, actual_cash_received = ?, discrepancy_amount = ?, actual_cash = ?, cash_discrepancy = ?, discrepancy_reason = ?, note = ?, status = 'closed' WHERE id = ? AND status = 'open'");
                $updStmt->execute([$cashTotal, $transferTotal, $countedCash, $discrepancy, $countedCash, $discrepancy, $discrepancyReason, $note, $shift['id']]);

                write_audit_log(
                    $pdo,
                    'SHIFT_CLOSE',
                    'SHIFT-' . $shift['id'],
                    'open',
                    "Chốt ca: Hệ thống {$cashTotal}đ | Đầu ca {$initialCash}đ | Đếm {$countedCash}đ | Lệch {$discrepancy}đ" . ($discrepancyReason ? " | Lý do: {$discrepancyReason}" : ""),
                    $staff
                );

                $pdo->commit();

                json_response([
                    'success' => true,
                    'message' => 'Đã chốt ca trực thành công! Chờ Quản lý/Chủ sân đối soát tiền mặt.',
                    'data'    => [
                        'shift_id'             => (int)$shift['id'],
                        'cash_total'           => $cashTotal,
                        'transfer_total'       => $transferTotal,
                        'actual_cash_received' => $countedCash,
                        'discrepancy_amount'   => $discrepancy,
                        'discrepancy_reason'   => $discrepancyReason,
                        'status'               => 'closed'
                    ]
                ]);
            } catch (Exception $e) {
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
            $adminNote = sanitize_string($data['admin_note'] ?? '', 500);

            if ($shiftId <= 0) {
                json_error('Thiếu mã ca trực cần đối soát.', 400, 'ERR_MISSING_SHIFT_ID');
            }

            $pdo->beginTransaction();
            try {
                $sStmt = $pdo->prepare("SELECT * FROM shifts WHERE id = ? FOR UPDATE");
                $sStmt->execute([$shiftId]);
                $shift = $sStmt->fetch();

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

                $actualCash = isset($data['actual_cash_received']) ? (int)$data['actual_cash_received'] : (int)($shift['actual_cash_received'] ?? $shift['cash_total']);
                $expectedTotal = (int)$shift['cash_total'] + (int)($shift['initial_cash'] ?? 0);
                $discrepancy = $actualCash - $expectedTotal;

                $updStmt = $pdo->prepare("UPDATE shifts SET actual_cash_received = ?, discrepancy_amount = ?, actual_cash = ?, cash_discrepancy = ?, admin_note = ?, status = 'confirmed', confirmed_by = ?, confirmed_at = NOW() WHERE id = ? AND status = 'closed'");
                $updStmt->execute([$actualCash, $discrepancy, $actualCash, $discrepancy, $adminNote, (int)$mgr['id'], $shiftId]);

                write_audit_log(
                    $pdo,
                    'SHIFT_CONFIRM',
                    'SHIFT-' . $shiftId,
                    'closed',
                    "Đối soát ca SHIFT-{$shiftId}: Thực nhận " . number_format($actualCash, 0, ',', '.') . "đ (Lệch: " . number_format($discrepancy, 0, ',', '.') . "đ)" . ($adminNote ? " | Ghi chú: {$adminNote}" : ""),
                    $mgr
                );

                if ($discrepancy !== 0) {
                    $tgMsg = "🚨 <b>CẢNH BÁO CHÊNH LỆCH TIỀN MẶT CA TRỰC</b>\n"
                           . "• Ca trực: <b>SHIFT-{$shiftId}</b> (NV: {$shift['staff_name']})\n"
                           . "• Hệ thống tính: <b>" . number_format((int)$shift['cash_total']) . " đ</b>\n"
                           . "• Tiền đầu ca: <b>" . number_format((int)$shift['initial_cash']) . " đ</b>\n"
                           . "• Thực nhận: <b>" . number_format($actualCash) . " đ</b>\n"
                           . "• Chênh lệch: <b>" . ($discrepancy > 0 ? '+' : '') . number_format($discrepancy) . " đ</b>\n"
                           . "• Quản lý duyệt: {$mgr['full_name']}";
                    send_telegram_notification($tgMsg, 'shift_diff', $pdo);
                }

                $pdo->commit();

                json_response([
                    'success' => true,
                    'message' => 'Đã xác nhận đối soát bàn giao tiền mặt ca trực thành công!',
                    'data'    => [
                        'shift_id'             => $shiftId,
                        'actual_cash_received' => $actualCash,
                        'discrepancy_amount'   => $discrepancy,
                        'status'               => 'confirmed'
                    ]
                ]);
            } catch (Exception $e) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                throw $e;
            }
        }
    }
}
