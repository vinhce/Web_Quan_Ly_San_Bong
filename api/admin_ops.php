<?php

if (!defined('SANBONG_ADMIN_ROUTER')) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'Direct access forbidden.', 'ref_code' => 'ERR_FORBIDDEN'], JSON_UNESCAPED_UNICODE);
    exit;
}

    if ($action === 'save_pricing') {
        $admin = require_admin($pdo);
        if ($method !== 'POST') {
            json_error('Phương thức không được hỗ trợ.', 405, 'ERR_METHOD_NOT_ALLOWED');
        }

        $pricingSrc = isset($data['pricing']) && is_array($data['pricing']) ? $data['pricing'] : $data;
        $p5  = is_array($pricingSrc['p5'] ?? null) ? $pricingSrc['p5'] : [];
        $p7  = is_array($pricingSrc['p7'] ?? null) ? $pricingSrc['p7'] : [];
        $p11 = is_array($pricingSrc['p11'] ?? null) ? $pricingSrc['p11'] : [];

        $p5Base     = (int)($p5['base'] ?? $p5['basePrice'] ?? $pricingSrc['p5_base'] ?? 250000);
        $p5Peak     = (int)($p5['peak'] ?? $p5['peakPrice'] ?? $pricingSrc['p5_peak'] ?? 350000);
        $p5Weekend  = (int)($p5['weekend'] ?? $p5['weekendPrice'] ?? $pricingSrc['p5_weekend'] ?? 380000);

        $p7Base     = (int)($p7['base'] ?? $p7['basePrice'] ?? $pricingSrc['p7_base'] ?? 450000);
        $p7Peak     = (int)($p7['peak'] ?? $p7['peakPrice'] ?? $pricingSrc['p7_peak'] ?? 650000);
        $p7Weekend  = (int)($p7['weekend'] ?? $p7['weekendPrice'] ?? $pricingSrc['p7_weekend'] ?? 700000);

        $p11Base    = (int)($p11['base'] ?? $p11['basePrice'] ?? $pricingSrc['p11_base'] ?? 900000);
        $p11Peak    = (int)($p11['peak'] ?? $p11['peakPrice'] ?? $pricingSrc['p11_peak'] ?? 1200000);
        $p11Weekend = (int)($p11['weekend'] ?? $p11['weekendPrice'] ?? $pricingSrc['p11_weekend'] ?? 1400000);

        $allPrices = [$p5Base, $p5Peak, $p5Weekend, $p7Base, $p7Peak, $p7Weekend, $p11Base, $p11Peak, $p11Weekend];
        foreach ($allPrices as $priceVal) {
            if ($priceVal < 50000) {
                json_error('Mức giá sân không hợp lệ (tối thiểu từ 50.000đ/giờ).', 400, 'ERR_INVALID_PRICE');
            }
        }

        $oldPricing = [];
        try {
            $oldSetStmt = $pdo->query("SELECT setting_key, setting_value FROM settings WHERE setting_key LIKE 'price_%'");
            while ($r = $oldSetStmt->fetch()) {
                $oldPricing[$r['setting_key']] = $r['setting_value'];
            }
        } catch (Exception $e) {
        }

        $pdo->beginTransaction();
        try {
            $updPitchStmt = $pdo->prepare("UPDATE pitches SET base_price = ?, peak_price = ?, weekend_price = ? WHERE type = ?");
            $updPitchStmt->execute([$p5Base, $p5Peak, $p5Weekend, 5]);
            $updPitchStmt->execute([$p7Base, $p7Peak, $p7Weekend, 7]);
            $updPitchStmt->execute([$p11Base, $p11Peak, $p11Weekend, 11]);

            $upsertSetStmt = $pdo->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
            $settingsPairs = [
                'price_p5_base'     => (string)$p5Base,
                'price_p5_peak'     => (string)$p5Peak,
                'price_p5_weekend'  => (string)$p5Weekend,
                'price_p7_base'     => (string)$p7Base,
                'price_p7_peak'     => (string)$p7Peak,
                'price_p7_weekend'  => (string)$p7Weekend,
                'price_p11_base'    => (string)$p11Base,
                'price_p11_peak'    => (string)$p11Peak,
                'price_p11_weekend' => (string)$p11Weekend
            ];
            foreach ($settingsPairs as $k => $v) {
                $upsertSetStmt->execute([$k, $v]);
            }

            $pdo->commit();
        } catch (Exception $txEx) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $txEx;
        }

        write_audit_log($pdo, 'UPDATE_PRICING', null, $oldPricing, $settingsPairs, $admin);

        json_response([
            'success' => true,
            'message' => 'Đã lưu cấu hình bảng giá vào cơ sở dữ liệu thành công!',
            'data'    => [
                'p5'  => ['base' => $p5Base, 'peak' => $p5Peak, 'weekend' => $p5Weekend],
                'p7'  => ['base' => $p7Base, 'peak' => $p7Peak, 'weekend' => $p7Weekend],
                'p11' => ['base' => $p11Base, 'peak' => $p11Peak, 'weekend' => $p11Weekend]
            ]
        ]);
    }

    if ($action === 'settings') {
        $admin = require_admin($pdo);

        if ($method === 'GET') {
            json_response([
                'success' => true,
                'data'    => admin_build_settings_response($pdo)
            ]);
        }

        if ($method === 'POST') {
            $oldSettings = get_system_settings_map($pdo);

            $toFlag = static function($val, string $fallback = '1'): string {
                if ($val === null) {
                    return $fallback;
                }
                if ($val === false || $val === 0 || $val === '0' || $val === 'false' || $val === '') {
                    return '0';
                }
                return '1';
            };

            $depositRate         = max(10, min(100, (int)($data['depositRate'] ?? $data['deposit_rate'] ?? ($oldSettings['deposit_rate'] ?? 30))));
            $bankName            = sanitize_string($data['bankName'] ?? $data['bank_name'] ?? ($oldSettings['bank_name'] ?? 'MBBank'), 60);
            $bankCode            = sanitize_string($data['bankCode'] ?? $data['bank_code'] ?? ($oldSettings['bank_code'] ?? 'MB'), 20);
            $accountNo           = sanitize_string($data['accountNo'] ?? $data['accountNumber'] ?? $data['bank_account'] ?? ($oldSettings['bank_account'] ?? '0352313548'), 40);
            $accountName         = strtoupper(sanitize_string($data['accountName'] ?? $data['bank_holder'] ?? ($oldSettings['bank_holder'] ?? 'NGUYEN QUANG VINH'), 100));
            $hotline             = sanitize_string($data['hotline'] ?? ($oldSettings['hotline'] ?? '0352 313 548'), 40);
            $openHours           = sanitize_string($data['openHours'] ?? $data['open_hours'] ?? ($oldSettings['open_hours'] ?? '05:30 - 23:00 hàng ngày (kể cả Lễ, Tết)'), 120);
            $holdMinutes         = max(5, min(120, (int)($data['holdMinutes'] ?? $data['hold_minutes'] ?? ($oldSettings['hold_minutes'] ?? 15))));
            $waitlistHoldMinutes = max(5, min(120, (int)($data['waitlistHoldMinutes'] ?? $data['waitlist_hold_minutes'] ?? ($oldSettings['waitlist_hold_minutes'] ?? 15))));
            $refundFullHours     = max(1, min(168, (int)($data['refundFullHours'] ?? $data['refund_full_hours'] ?? ($oldSettings['refund_full_hours'] ?? 24))));
            $refundPartialHours  = max(0, min($refundFullHours, (int)($data['refundPartialHours'] ?? $data['refund_partial_hours'] ?? ($oldSettings['refund_partial_hours'] ?? 4))));

            $autoCancelEnabled   = $toFlag($data['autoCancelEnabled'] ?? $data['auto_cancel_enabled'] ?? ($oldSettings['auto_cancel_enabled'] ?? '1'));
            $reminderEnabled     = $toFlag($data['reminderEnabled'] ?? $data['reminder_enabled'] ?? ($oldSettings['reminder_enabled'] ?? '1'));
            $reminderHours       = max(1, min(24, (int)($data['reminderHoursBefore'] ?? $data['reminder_hours_before'] ?? ($oldSettings['reminder_hours_before'] ?? 2))));
            $tgEnabled           = $toFlag($data['telegramNotifyEnabled'] ?? $data['telegram_notify_enabled'] ?? ($oldSettings['telegram_notify_enabled'] ?? '0'), '0');
            $matchmakingEnabled  = $toFlag($data['matchmakingEnabled'] ?? $data['matchmaking_enabled'] ?? ($oldSettings['matchmaking_enabled'] ?? '1'));
            $matchRequireAppv    = $toFlag($data['matchmakingRequireApproval'] ?? $data['matchmaking_require_approval'] ?? ($oldSettings['matchmaking_require_approval'] ?? '0'), '0');

            $custNotifyEnabled   = $toFlag($data['customerNotifyEnabled'] ?? $data['customer_notify_enabled'] ?? ($oldSettings['customer_notify_enabled'] ?? '0'), '0');
            $custNotifyWebhook   = trim((string)($data['customerNotifyWebhook'] ?? $data['customer_notify_webhook'] ?? ($oldSettings['customer_notify_webhook'] ?? '')));
            if ($custNotifyWebhook !== '') {
                $ssrfRes = is_safe_webhook_url($custNotifyWebhook);
                if (empty($ssrfRes['safe'])) {
                    json_error($ssrfRes['reason'] ?? 'URL webhook thông báo khách không hợp lệ hoặc bị chặn vì lý do an toàn.', 400, 'ERR_UNSAFE_WEBHOOK_URL');
                }
            }
            $confirmTemplate  = sanitize_string((string)($data['bookingConfirmTemplate'] ?? $data['booking_confirm_template'] ?? ($oldSettings['booking_confirm_template'] ?? '')), 500);
            $reminderTemplate = sanitize_string((string)($data['reminderTemplate'] ?? $data['reminder_template'] ?? ($oldSettings['reminder_template'] ?? '')), 500);

            $rawTgBotToken = trim((string)($data['telegramBotToken'] ?? $data['telegram_bot_token'] ?? ''));
            $clearTgToken  = !empty($data['clearTelegramBotToken']);
            if ($clearTgToken) {
                $tgBotToken = '';
            } elseif ($rawTgBotToken === '' || $rawTgBotToken === '********') {
                $tgBotToken = (string)($oldSettings['telegram_bot_token'] ?? '');
            } else {
                $tgBotToken = $rawTgBotToken;
            }
            $tgChatId = trim((string)($data['telegramChatId'] ?? $data['telegram_chat_id'] ?? ($oldSettings['telegram_chat_id'] ?? '')));

            if (empty($accountNo) || empty($accountName)) {
                json_error('Số tài khoản và tên chủ tài khoản nhận cọc không được để trống.', 400, 'ERR_EMPTY_BANK_INFO');
            }

            $tgEventsInput = is_array($data['telegramEvents'] ?? null) ? $data['telegramEvents'] : [];
            $tgEventKeys = ['new_booking', 'cancel', 'shift_diff', 'unmatched_tx', 'low_stock', 'waitlist', 'matchmaking', 'review'];

            $upsertStmt = $pdo->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
            $pairs = [
                'deposit_rate'                 => (string)$depositRate,
                'bank_name'                    => $bankName,
                'bank_code'                    => $bankCode,
                'bank_account'                 => $accountNo,
                'bank_holder'                  => $accountName,
                'hotline'                      => $hotline,
                'open_hours'                   => $openHours,
                'hold_minutes'                 => (string)$holdMinutes,
                'waitlist_hold_minutes'        => (string)$waitlistHoldMinutes,
                'matchmaking_enabled'          => $matchmakingEnabled,
                'matchmaking_require_approval' => $matchRequireAppv,
                'refund_full_hours'            => (string)$refundFullHours,
                'refund_partial_hours'         => (string)$refundPartialHours,
                'auto_cancel_enabled'          => $autoCancelEnabled,
                'reminder_enabled'             => $reminderEnabled,
                'reminder_hours_before'        => (string)$reminderHours,
                'customer_notify_enabled'      => $custNotifyEnabled,
                'customer_notify_webhook'      => $custNotifyWebhook,
                'booking_confirm_template'     => $confirmTemplate,
                'reminder_template'            => $reminderTemplate,
                'telegram_notify_enabled'      => $tgEnabled,
                'telegram_bot_token'           => $tgBotToken,
                'telegram_chat_id'             => $tgChatId
            ];

            foreach ($tgEventKeys as $evk) {
                $flatKey = 'tg_event_' . $evk;
                if (array_key_exists($evk, $tgEventsInput)) {
                    $pairs[$flatKey] = $toFlag($tgEventsInput[$evk], '1');
                } elseif (array_key_exists($flatKey, $data)) {
                    $pairs[$flatKey] = $toFlag($data[$flatKey], '1');
                } else {
                    $pairs[$flatKey] = (string)($oldSettings[$flatKey] ?? '1');
                }
            }

            foreach ($pairs as $k => $v) {
                $upsertStmt->execute([$k, $v]);
            }

            $oldForAudit = [];
            foreach ($pairs as $k => $_) {
                if (isset($oldSettings[$k])) {
                    $oldForAudit[$k] = ($k === 'telegram_bot_token' && $oldSettings[$k] !== '') ? '********' : $oldSettings[$k];
                }
            }
            $newForAudit = $pairs;
            if ($newForAudit['telegram_bot_token'] !== '') {
                $newForAudit['telegram_bot_token'] = '********';
            }

            write_audit_log($pdo, 'UPDATE_SETTINGS', null, $oldForAudit, $newForAudit, $admin);

            json_response([
                'success' => true,
                'message' => 'Đã lưu cài đặt hệ thống và chính sách cọc/hủy vào DB thành công!',
                'data'    => admin_build_settings_response($pdo)
            ]);
        }

        json_error('Phương thức không được hỗ trợ.', 405, 'ERR_METHOD_NOT_ALLOWED');
    }

    if ($action === 'audit_logs') {
        $admin = require_admin($pdo);
        if ($method !== 'GET') {
            json_error('Nhật ký thao tác chỉ cho phép đọc, nghiêm cấm chỉnh sửa hoặc xóa!', 405, 'ERR_AUDIT_IMMUTABLE');
        }
        $rawUser = $_GET['user_id'] ?? $_GET['user'] ?? '';
        $userId = ($rawUser !== '') ? (int)$rawUser : null;
        $actFilter = sanitize_string($_GET['filter_action'] ?? $_GET['log_action'] ?? $_GET['action_type'] ?? '', 80);
        $dateFilter = sanitize_string($_GET['date'] ?? '', 15);
        $search = sanitize_string($_GET['search'] ?? '', 100);
        $limit = max(10, min(500, (int)($_GET['limit'] ?? 100)));

        $where = [];
        $params = [];
        if ($userId !== null && $userId > 0) {
            $where[] = "user_id = ?";
            $params[] = $userId;
        }
        if ($actFilter !== '') {
            $where[] = "action = ?";
            $params[] = $actFilter;
        }
        if ($dateFilter !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateFilter)) {
            $where[] = "DATE(created_at) = ?";
            $params[] = $dateFilter;
        }
        if ($search !== '') {
            $where[] = "(booking_id LIKE ? OR old_value LIKE ? OR new_value LIKE ? OR actor_name LIKE ?)";
            $likeVal = '%' . $search . '%';
            $params[] = $likeVal;
            $params[] = $likeVal;
            $params[] = $likeVal;
            $params[] = $likeVal;
        }

        $whereSql = !empty($where) ? ('WHERE ' . implode(' AND ', $where)) : '';
        $stmt = $pdo->prepare("SELECT * FROM audit_logs {$whereSql} ORDER BY id DESC LIMIT {$limit}");
        $stmt->execute($params);
        $logs = $stmt->fetchAll();

        $staffStmt = $pdo->query("SELECT id, username, full_name, role FROM users WHERE role IN ('admin', 'manager', 'staff') ORDER BY FIELD(role, 'admin', 'manager', 'staff'), id ASC");
        $staffList = $staffStmt ? $staffStmt->fetchAll() : [];

        $actStmt = $pdo->query("SELECT DISTINCT action FROM audit_logs ORDER BY action ASC");
        $actionTypes = $actStmt ? $actStmt->fetchAll(PDO::FETCH_COLUMN) : [];

        json_response([
            'success' => true,
            'data'    => [
                'logs'        => $logs,
                'staffList'   => $staffList,
                'actionTypes' => $actionTypes
            ]
        ]);
    }

    if ($action === 'shifts') {
        $computeShiftTotals = function (PDO $pdo, string $startTime, ?string $endTime = null): array {
            $endBound = $endTime ?: date('Y-m-d H:i:s', time() + 60);
            $cashTotal = 0;
            $transferTotal = 0;

            try {
                $bStmt = $pdo->prepare("SELECT total_price, deposit_amount, remaining_amount, status, payment_status, payment_method, note, created_at
                                        FROM bookings
                                        WHERE (created_at >= ? OR booking_date = DATE(?))
                                          AND created_at <= ?
                                          AND status != 'Đã hủy'
                                          AND payment_status NOT IN ('Đã hủy', 'Đã hoàn cọc 100%', 'Chờ duyệt cọc', 'Chưa cọc (Khách quen)')");
                $bStmt->execute([$startTime, $startTime, $endBound]);
                while ($row = $bStmt->fetch()) {
                    $payStatus = $row['payment_status'] ?? '';
                    $bStatus = $row['status'] ?? '';
                    $payMethod = $row['payment_method'] ?? '';
                    $noteStr = $row['note'] ?? '';
                    $totPrice = max(0, (int)($row['total_price'] ?? 0));
                    $depAmt = max(0, (int)($row['deposit_amount'] ?? 0));

                    $orderDep = 0;
                    $orderRem = 0;
                    if ($payStatus === 'Tịch thu cọc 30%' || $bStatus === 'Khách chưa đến' || $payStatus === 'Bảo lưu cọc 30%') {
                        $orderDep = $depAmt;
                    } elseif ($payStatus === 'Phạt 50% cọc') {
                        $orderDep = (int)round($depAmt * 0.5);
                    } else {
                        if (in_array($payStatus, ['Đã cọc 30%', 'Đã thanh toán đủ', 'Đã thanh toán 100%'], true)) {
                            $orderDep = $depAmt;
                        }
                        if ($bStatus === 'Hoàn thành' || in_array($payStatus, ['Đã thanh toán đủ', 'Đã thanh toán 100%'], true)) {
                            $orderRem = max(0, $totPrice - $depAmt);
                            if ($orderDep === 0 && $depAmt === 0) {
                                $orderDep = (int)round($totPrice * 0.3);
                                $orderRem = max(0, $totPrice - $orderDep);
                            }
                        }
                    }

                    $isCashInit = (mb_stripos($payMethod, 'Tiền mặt') !== false);
                    if ($isCashInit) {
                        $cashTotal += $orderDep;
                    } else {
                        $transferTotal += $orderDep;
                    }

                    if ($orderRem > 0) {
                        $settledViaVietQr = (mb_stripos($noteStr, 'tất toán 100% qua Chuyển khoản') !== false || mb_stripos($noteStr, 'tất toán 100% qua VietQR') !== false);
                        $settledViaCash   = (mb_stripos($noteStr, 'tất toán 100% qua Tiền mặt') !== false);
                        if ($settledViaCash || ($isCashInit && !$settledViaVietQr)) {
                            $cashTotal += $orderRem;
                        } else {
                            $transferTotal += $orderRem;
                        }
                    }
                }
            } catch (Exception $e) {
                error_log("[SHIFT BOOKINGS CALC WARN] " . $e->getMessage());
            }

            try {
                $sStmt = $pdo->prepare("SELECT total_amount, payment_method FROM service_sales
                                        WHERE (booking_code IS NULL OR booking_code = '')
                                          AND total_amount > 0
                                          AND created_at >= ? AND created_at <= ?");
                $sStmt->execute([$startTime, $endBound]);
                while ($sRow = $sStmt->fetch()) {
                    $amt = max(0, (int)($sRow['total_amount'] ?? 0));
                    if (mb_stripos($sRow['payment_method'] ?? '', 'Tiền mặt') !== false) {
                        $cashTotal += $amt;
                    } else {
                        $transferTotal += $amt;
                    }
                }
            } catch (Exception $e) {
                error_log("[SHIFT SALES CALC WARN] " . $e->getMessage());
            }

            return ['cashTotal' => $cashTotal, 'transferTotal' => $transferTotal];
        };

        if ($method === 'GET') {
            $staffId = (int)$actor['id'];
            $staffName = !empty($actor['full_name']) ? $actor['full_name'] : ($actor['username'] ?? 'Nhân viên');

            $openStmt = $pdo->prepare("SELECT * FROM shifts WHERE staff_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1");
            $openStmt->execute([$staffId]);
            $activeShift = $openStmt->fetch();

            if (!$activeShift) {
                $closedTodayStmt = $pdo->prepare("SELECT COUNT(*) FROM shifts WHERE staff_id = ? AND DATE(start_time) = CURDATE()");
                $closedTodayStmt->execute([$staffId]);
                $hasShiftToday = ((int)$closedTodayStmt->fetchColumn() > 0);
                $defaultStart = $hasShiftToday ? date('Y-m-d H:i:s') : date('Y-m-d 00:00:00');

                $insStmt = $pdo->prepare("INSERT INTO shifts (staff_id, staff_name, start_time, status) VALUES (?, ?, ?, 'open')");
                $insStmt->execute([$staffId, $staffName, $defaultStart]);
                $newShiftId = (int)$pdo->lastInsertId();

                $openStmt->execute([$staffId]);
                $activeShift = $openStmt->fetch();
            }

            if ($activeShift) {
                $totals = $computeShiftTotals($pdo, $activeShift['start_time'], null);
                $activeShift['cash_total'] = $totals['cashTotal'];
                $activeShift['transfer_total'] = $totals['transferTotal'];
                $updOpen = $pdo->prepare("UPDATE shifts SET cash_total = ?, transfer_total = ? WHERE id = ?");
                $updOpen->execute([$totals['cashTotal'], $totals['transferTotal'], $activeShift['id']]);
            }

            if (in_array($actor['role'] ?? '', ['admin', 'manager'], true)) {
                $histStmt = $pdo->query("SELECT * FROM shifts ORDER BY id DESC LIMIT 50");
                $shifts = $histStmt->fetchAll();
            } else {
                $histStmt = $pdo->prepare("SELECT * FROM shifts WHERE staff_id = ? ORDER BY id DESC LIMIT 30");
                $histStmt->execute([$staffId]);
                $shifts = $histStmt->fetchAll();
            }

            json_response([
                'success' => true,
                'data'    => [
                    'activeShift'  => $activeShift,
                    'currentShift' => $activeShift,
                    'shifts'       => $shifts
                ]
            ]);
        }

        if ($method === 'POST') {
            $subAction = sanitize_string($data['sub_action'] ?? 'close_shift', 30);

            if ($subAction === 'close_shift') {
                $rawShiftId = (string)($data['shift_id'] ?? $data['id'] ?? '');
                $shiftId = (int)preg_replace('/\D+/', '', $rawShiftId);
                $note = sanitize_string($data['note'] ?? '', 500);

                if ($shiftId > 0) {
                    $sStmt = $pdo->prepare("SELECT * FROM shifts WHERE id = ? LIMIT 1");
                    $sStmt->execute([$shiftId]);
                    $shift = $sStmt->fetch();
                } else {
                    $sStmt = $pdo->prepare("SELECT * FROM shifts WHERE staff_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1");
                    $sStmt->execute([(int)$actor['id']]);
                    $shift = $sStmt->fetch();
                }

                if (!$shift) {
                    json_error('Không tìm thấy ca trực đang mở để chốt ca.', 404, 'ERR_SHIFT_NOT_FOUND');
                }
                if (($actor['role'] ?? '') === 'staff' && (int)$shift['staff_id'] !== (int)$actor['id']) {
                    json_error('Bạn chỉ được phép chốt ca trực của chính mình.', 403, 'ERR_FORBIDDEN');
                }

                $totals = $computeShiftTotals($pdo, $shift['start_time'], null);
                $declaredCash = (int)($data['cash_total'] ?? $data['cash_declared'] ?? 0);
                $declaredTransfer = (int)($data['transfer_total'] ?? $data['transfer_declared'] ?? 0);
                $cashTotal = $declaredCash > 0 ? max($totals['cashTotal'], $declaredCash) : $totals['cashTotal'];
                $transferTotal = $declaredTransfer > 0 ? max($totals['transferTotal'], $declaredTransfer) : $totals['transferTotal'];

                $updStmt = $pdo->prepare("UPDATE shifts SET end_time = NOW(), cash_total = ?, transfer_total = ?, note = ?, status = 'closed' WHERE id = ?");
                $updStmt->execute([$cashTotal, $transferTotal, $note, $shift['id']]);

                write_audit_log(
                    $pdo,
                    'SHIFT_CLOSE',
                    'SHIFT-' . $shift['id'],
                    'open',
                    "Chốt ca: Tiền mặt " . number_format($cashTotal, 0, ',', '.') . "đ | CK " . number_format($transferTotal, 0, ',', '.') . "đ" . ($note ? " | Ghi chú: {$note}" : ""),
                    $actor
                );

                json_response([
                    'success' => true,
                    'message' => 'Đã chốt ca trực thành công! Chờ Chủ sân kiểm đếm và xác nhận bàn giao tiền mặt.',
                    'data'    => [
                        'shift_id'       => (int)$shift['id'],
                        'cash_total'     => $cashTotal,
                        'transfer_total' => $transferTotal,
                        'status'         => 'closed'
                    ]
                ]);
            }

            if ($subAction === 'confirm_shift') {
                $mgr = require_manager_or_admin($pdo);
                $rawShiftId = (string)($data['shift_id'] ?? $data['id'] ?? '');
                $shiftId = (int)preg_replace('/\D+/', '', $rawShiftId);
                $actualCash = max(0, (int)($data['actual_cash_received'] ?? $data['actual_cash'] ?? 0));
                $adminNote = sanitize_string($data['admin_note'] ?? '', 500);

                if ($shiftId <= 0) {
                    json_error('Thiếu mã ca trực cần xác nhận.', 400, 'ERR_MISSING_SHIFT_ID');
                }
                $sStmt = $pdo->prepare("SELECT * FROM shifts WHERE id = ? LIMIT 1");
                $sStmt->execute([$shiftId]);
                $shift = $sStmt->fetch();
                if (!$shift) {
                    json_error('Không tìm thấy ca trực tương ứng.', 404, 'ERR_SHIFT_NOT_FOUND');
                }

                $discrepancy = $actualCash - (int)$shift['cash_total'];
                $updStmt = $pdo->prepare("UPDATE shifts SET actual_cash_received = ?, discrepancy_amount = ?, admin_note = ?, status = 'confirmed', confirmed_by = ?, confirmed_at = NOW() WHERE id = ?");
                $updStmt->execute([$actualCash, $discrepancy, $adminNote, (int)$mgr['id'], $shiftId]);

                write_audit_log(
                    $pdo,
                    'SHIFT_CONFIRM',
                    'SHIFT-' . $shiftId,
                    "Kê khai: " . number_format((int)$shift['cash_total'], 0, ',', '.') . "đ",
                    "Thực nhận: " . number_format($actualCash, 0, ',', '.') . "đ (Lệch: " . number_format($discrepancy, 0, ',', '.') . "đ)" . ($adminNote ? " | Ghi chú: {$adminNote}" : ""),
                    $mgr
                );

                if ($discrepancy !== 0) {
                    $tgMsg = "🚨 <b>CẢNH BÁO CHÊNH LỆCH TIỀN MẶT CA TRỰC</b>\n"
                           . "• Ca trực: <b>SHIFT-{$shiftId}</b> (NV: {$shift['staff_name']})\n"
                           . "• Doanh thu kê khai: <b>" . number_format((int)$shift['cash_total']) . " đ</b>\n"
                           . "• Thực nhận két: <b>" . number_format($actualCash) . " đ</b>\n"
                           . "• Chênh lệch: <b>" . ($discrepancy > 0 ? '+' : '') . number_format($discrepancy) . " đ</b>\n"
                           . "• Quản lý duyệt: {$mgr['full_name']}";
                    send_telegram_notification($tgMsg, 'shift_diff', $pdo);
                }

                json_response([
                    'success' => true,
                    'message' => 'Đã xác nhận bàn giao tiền mặt ca trực thành công!',
                    'data'    => [
                        'shift_id'             => $shiftId,
                        'actual_cash_received' => $actualCash,
                        'discrepancy_amount'   => $discrepancy,
                        'status'               => 'confirmed'
                    ]
                ]);
            }

            json_error('Hành động xử lý ca trực không hợp lệ.', 400, 'ERR_INVALID_ACTION');
        }
    }

    if (in_array($action, ['inventory', 'counter_sale', 'services_inventory'], true)) {
        if ($method === 'GET') {
            $srvStmt = $pdo->query("SELECT id, name, price, unit, icon, stock_qty as stockQty, min_stock_warning as minStockWarning, track_inventory as trackInventory, is_active as isActive FROM extra_services WHERE is_active = 1 ORDER BY price ASC");
            $services = $srvStmt->fetchAll();
            $lowStockCount = 0;
            foreach ($services as &$srv) {
                $srv['price']           = (int)$srv['price'];
                $srv['stockQty']        = (int)($srv['stockQty'] ?? 100);
                $srv['minStockWarning'] = (int)($srv['minStockWarning'] ?? 10);
                $srv['trackInventory']  = (bool)($srv['trackInventory'] ?? true);
                $srv['isActive']        = (bool)($srv['isActive'] ?? true);
                $srv['lowStock']        = ($srv['trackInventory'] && $srv['stockQty'] <= $srv['minStockWarning']);
                if ($srv['lowStock']) {
                    $lowStockCount++;
                }
            }

            $salesStmt = $pdo->query("SELECT * FROM service_sales ORDER BY id DESC LIMIT 30");
            $recentSales = $salesStmt ? $salesStmt->fetchAll() : [];

            json_response([
                'success' => true,
                'data'    => [
                    'services'      => $services,
                    'recentSales'   => $recentSales,
                    'lowStockCount' => $lowStockCount
                ]
            ]);
        }

        if ($method === 'POST') {
            $subAction = sanitize_string($data['sub_action'] ?? ($action === 'counter_sale' ? 'sell_counter' : ''), 30);

            if ($subAction === 'sell_counter') {
                $serviceId = sanitize_string($data['service_id'] ?? $data['id'] ?? '', 30);
                $qty = max(1, (int)($data['quantity'] ?? 1));
                $payMethod = sanitize_string($data['payment_method'] ?? 'Tiền mặt tại quầy', 50);
                $bookingCode = sanitize_string($data['booking_code'] ?? '', 40);
                $note = sanitize_string($data['note'] ?? 'Bán lẻ trực tiếp tại quầy', 200);

                $pdo->beginTransaction();
                try {
                    $srvStmt = $pdo->prepare("SELECT * FROM extra_services WHERE id = ? AND is_active = 1 LIMIT 1 FOR UPDATE");
                    $srvStmt->execute([$serviceId]);
                    $srv = $srvStmt->fetch();
                    if (!$srv) {
                        $pdo->rollBack();
                        json_error('Không tìm thấy dịch vụ/sản phẩm trong kho.', 404, 'ERR_SERVICE_NOT_FOUND');
                    }

                    $oldStock = (int)($srv['stock_qty'] ?? 0);
                    $trackInv = (int)($srv['track_inventory'] ?? 1) === 1;
                    if ($trackInv && $oldStock < $qty) {
                        $pdo->rollBack();
                        json_error("Kho không đủ hàng! {$srv['name']} hiện chỉ còn {$oldStock} {$srv['unit']}.", 409, 'ERR_OUT_OF_STOCK');
                    }

                    $unitPrice = (int)$srv['price'];
                    $totalAmount = $unitPrice * $qty;
                    deduct_service_inventory(
                        $pdo,
                        $serviceId,
                        $qty,
                        $bookingCode !== '' ? $bookingCode : null,
                        $unitPrice,
                        $payMethod,
                        $note,
                        $actor['id'] ?? null
                    );

                    $newStock = $trackInv ? max(0, $oldStock - $qty) : $oldStock;
                    write_audit_log(
                        $pdo,
                        'COUNTER_SALE',
                        $serviceId,
                        "Tồn cũ: {$oldStock}",
                        "Bán {$qty} {$srv['unit']} ({$totalAmount}đ - {$payMethod}) - Tồn mới: {$newStock}",
                        $actor
                    );
                    $pdo->commit();
                } catch (Throwable $saleEx) {
                    if ($pdo->inTransaction()) {
                        $pdo->rollBack();
                    }
                    throw $saleEx;
                }

                json_response([
                    'success' => true,
                    'message' => "Đã xuất bán {$qty} {$srv['unit']} {$srv['name']} (" . number_format($totalAmount, 0, ',', '.') . "đ) thành công!",
                    'data'    => [
                        'service_id'   => $serviceId,
                        'new_stock'    => $newStock,
                        'total_amount' => $totalAmount
                    ]
                ]);
            }

            if ($subAction === 'restock') {
                $mgr = require_manager_or_admin($pdo);
                $serviceId = sanitize_string($data['service_id'] ?? $data['id'] ?? '', 30);
                $addQty = max(1, (int)($data['add_qty'] ?? $data['added_qty'] ?? $data['quantity'] ?? 1));
                $note = sanitize_string($data['note'] ?? '', 200);

                $srvStmt = $pdo->prepare("SELECT * FROM extra_services WHERE id = ? LIMIT 1");
                $srvStmt->execute([$serviceId]);
                $srv = $srvStmt->fetch();
                if (!$srv) {
                    json_error('Không tìm thấy sản phẩm cần nhập kho.', 404, 'ERR_SERVICE_NOT_FOUND');
                }

                $oldStock = (int)($srv['stock_qty'] ?? 0);
                $newStock = $oldStock + $addQty;
                $updStmt = $pdo->prepare("UPDATE extra_services SET stock_qty = ?, track_inventory = 1 WHERE id = ?");
                $updStmt->execute([$newStock, $serviceId]);

                write_audit_log(
                    $pdo,
                    'INVENTORY_RESTOCK',
                    $serviceId,
                    "Tồn cũ: {$oldStock}",
                    "Nhập kho +{$addQty} {$srv['unit']} -> Tồn mới: {$newStock}" . ($note ? " ({$note})" : ""),
                    $mgr
                );

                json_response([
                    'success' => true,
                    'message' => "Đã nhập thêm +{$addQty} {$srv['unit']} {$srv['name']}. Tồn kho mới: {$newStock}!",
                    'data'    => ['service_id' => $serviceId, 'stock_qty' => $newStock]
                ]);
            }

            if ($subAction === 'save_service' || $subAction === 'upsert') {
                $mgr = require_manager_or_admin($pdo);
                $srvId = strtoupper(sanitize_string($data['id'] ?? $data['service_id'] ?? '', 30));
                if (empty($srvId)) {
                    $srvId = 'SRV-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));
                }
                $name = sanitize_string($data['name'] ?? '', 150);
                $price = max(0, (int)($data['price'] ?? 0));
                $unit = sanitize_string($data['unit'] ?? 'cái', 30);
                $icon = sanitize_string($data['icon'] ?? 'droplet', 30);
                $stockQty = max(0, (int)($data['stock_qty'] ?? $data['stockQty'] ?? 50));
                $minWarning = max(0, (int)($data['min_stock_warning'] ?? $data['minStockWarning'] ?? 10));
                $trackInvRaw = $data['track_inventory'] ?? $data['trackInventory'] ?? 1;
                $trackInv = ((int)$trackInvRaw || $trackInvRaw === true || $trackInvRaw === 'true') ? 1 : 0;

                if (empty($name)) {
                    json_error('Tên dịch vụ/sản phẩm không được để trống.', 400, 'ERR_EMPTY_NAME');
                }

                $oldStmt = $pdo->prepare("SELECT * FROM extra_services WHERE id = ? LIMIT 1");
                $oldStmt->execute([$srvId]);
                $oldSrv = $oldStmt->fetch() ?: null;

                $upsert = $pdo->prepare("INSERT INTO extra_services (id, name, price, unit, icon, stock_qty, min_stock_warning, track_inventory, is_active)
                                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
                                         ON DUPLICATE KEY UPDATE
                                         name = VALUES(name), price = VALUES(price), unit = VALUES(unit), icon = VALUES(icon),
                                         stock_qty = VALUES(stock_qty), min_stock_warning = VALUES(min_stock_warning),
                                         track_inventory = VALUES(track_inventory), is_active = 1");
                $upsert->execute([$srvId, $name, $price, $unit, $icon, $stockQty, $minWarning, $trackInv]);

                write_audit_log($pdo, 'SERVICE_UPSERT', $srvId, $oldSrv, [
                    'id' => $srvId, 'name' => $name, 'price' => $price, 'unit' => $unit, 'stock_qty' => $stockQty
                ], $mgr);

                json_response([
                    'success' => true,
                    'message' => "Đã lưu dịch vụ {$name} thành công!",
                    'data'    => ['id' => $srvId, 'name' => $name, 'price' => $price, 'unit' => $unit, 'stockQty' => $stockQty]
                ]);
            }

            if ($subAction === 'delete_service') {
                $mgr = require_manager_or_admin($pdo);
                $srvId = sanitize_string($data['id'] ?? $data['service_id'] ?? '', 30);
                if (empty($srvId)) {
                    json_error('Thiếu mã dịch vụ cần xóa.', 400, 'ERR_MISSING_ID');
                }
                $oldStmt = $pdo->prepare("SELECT * FROM extra_services WHERE id = ? LIMIT 1");
                $oldStmt->execute([$srvId]);
                $oldSrv = $oldStmt->fetch() ?: null;

                $delStmt = $pdo->prepare("UPDATE extra_services SET is_active = 0 WHERE id = ?");
                $delStmt->execute([$srvId]);

                write_audit_log($pdo, 'SERVICE_DELETE', $srvId, $oldSrv, 'Đã ngừng kinh doanh (is_active = 0)', $mgr);

                json_response(['success' => true, 'message' => "Đã ngừng kinh doanh dịch vụ {$srvId}."]);
            }

            json_error('Hành động kho dịch vụ không hợp lệ.', 400, 'ERR_INVALID_ACTION');
        }
    }

    if (in_array($action, ['manage_pitch', 'upsert_pitch'], true) && $method === 'POST') {
        $mgr = require_manager_or_admin($pdo);
        $subAction = sanitize_string($data['sub_action'] ?? 'save', 20);

        if ($subAction === 'save' || $subAction === 'upsert' || $action === 'upsert_pitch') {
            $type = (int)($data['type'] ?? 5);
            if (!in_array($type, [5, 7, 11], true)) {
                json_error('Loại sân phải là sân 5, 7 hoặc 11 người.', 400, 'ERR_INVALID_PITCH_TYPE');
            }
            $pitchId = strtoupper(sanitize_string($data['id'] ?? $data['pitch_id'] ?? '', 20));
            if (empty($pitchId)) {
                $cntStmt = $pdo->prepare("SELECT COUNT(*) FROM pitches WHERE type = ?");
                $cntStmt->execute([$type]);
                $nextChar = chr(65 + min(25, (int)$cntStmt->fetchColumn()));
                $pitchId = "P{$type}-{$nextChar}";
                $chkStmt = $pdo->prepare("SELECT id FROM pitches WHERE id = ? LIMIT 1");
                $chkStmt->execute([$pitchId]);
                if ($chkStmt->fetch()) {
                    $pitchId = "P{$type}-" . strtoupper(substr(bin2hex(random_bytes(2)), 0, 3));
                }
            }

            $name = sanitize_string($data['name'] ?? '', 100);
            if (empty($name)) {
                json_error('Tên sân bóng không được để trống.', 400, 'ERR_EMPTY_PITCH_NAME');
            }
            $typeName = $type === 5 ? 'Sân 5 người' : ($type === 7 ? 'Sân 7 người' : 'Sân 11 người');
            $defaultSize = $type === 5 ? '20m x 40m' : ($type === 7 ? '30m x 50m' : '68m x 105m');
            $size = sanitize_string($data['size'] ?? $defaultSize, 50) ?: $defaultSize;
            $grass = sanitize_string($data['grass'] ?? 'Cỏ nhân tạo tiêu chuẩn FIFA Quality Pro', 255) ?: 'Cỏ nhân tạo tiêu chuẩn FIFA Quality Pro';
            $basePrice = max(50000, (int)($data['base_price'] ?? $data['basePrice'] ?? ($type === 5 ? 250000 : ($type === 7 ? 450000 : 900000))));
            $peakPrice = max(50000, (int)($data['peak_price'] ?? $data['peakPrice'] ?? ($type === 5 ? 350000 : ($type === 7 ? 650000 : 1200000))));
            $weekendPrice = max(50000, (int)($data['weekend_price'] ?? $data['weekendPrice'] ?? ($type === 5 ? 380000 : ($type === 7 ? 700000 : 1400000))));
            $status = sanitize_string($data['status'] ?? 'Hoạt động', 30);
            if (!in_array($status, ['Hoạt động', 'Bảo trì', 'Ẩn'], true)) {
                $status = 'Hoạt động';
            }
            $description = sanitize_string($data['description'] ?? '', 500);
            $variant = sanitize_string($data['variant'] ?? ($type === 11 ? 'hero' : ($type === 7 ? 'deep' : 'standard')), 50);

            $oldStmt = $pdo->prepare("SELECT * FROM pitches WHERE id = ? LIMIT 1");
            $oldStmt->execute([$pitchId]);
            $oldPitch = $oldStmt->fetch() ?: null;

            $amenitiesJson = $oldPitch['amenities_json'] ?? '["Đèn LED chống chói", "Bãi đỗ xe", "Nước uống miễn phí", "Phòng thay đồ", "Wifi"]';
            if (isset($data['amenities']) && is_array($data['amenities'])) {
                $amenitiesJson = json_encode($data['amenities'], JSON_UNESCAPED_UNICODE);
            }

            $upsertStmt = $pdo->prepare("INSERT INTO pitches (id, name, type, type_name, size, grass, base_price, peak_price, weekend_price, status, amenities_json, variant, description)
                                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                         ON DUPLICATE KEY UPDATE
                                         name = VALUES(name), type = VALUES(type), type_name = VALUES(type_name),
                                         size = VALUES(size), grass = VALUES(grass),
                                         base_price = VALUES(base_price), peak_price = VALUES(peak_price), weekend_price = VALUES(weekend_price),
                                         status = VALUES(status), description = VALUES(description)");
            $upsertStmt->execute([
                $pitchId, $name, $type, $typeName, $size, $grass,
                $basePrice, $peakPrice, $weekendPrice, $status,
                $amenitiesJson, $variant, $description
            ]);

            $newPitchData = [
                'id'           => $pitchId,
                'name'         => $name,
                'type'         => $type,
                'typeName'     => $typeName,
                'size'         => $size,
                'grass'        => $grass,
                'basePrice'    => $basePrice,
                'peakPrice'    => $peakPrice,
                'weekendPrice' => $weekendPrice,
                'status'       => $status,
                'description'  => $description
            ];

            write_audit_log($pdo, 'PITCH_UPSERT', $pitchId, $oldPitch, $newPitchData, $mgr);

            json_response([
                'success' => true,
                'message' => $oldPitch ? "Đã cập nhật thông tin sân {$name} ({$pitchId})!" : "Đã thêm mới sân {$name} ({$pitchId}) thành công!",
                'data'    => $newPitchData
            ]);
        }

        json_error('Hành động quản lý sân không hợp lệ.', 400, 'ERR_INVALID_ACTION');
    }

