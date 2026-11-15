<?php
declare(strict_types=1);

if (!defined('SANBONG_ADMIN_ROUTER')) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'Direct access forbidden.', 'ref_code' => 'ERR_FORBIDDEN'], JSON_UNESCAPED_UNICODE);
    exit;
}

function handle_admin_settings_or_audit(PDO $pdo, string $action, string $method, array $data, array $actor): void {
    if ($action === 'settings') {
        if ($method === 'GET') {
            require_staff_or_admin($pdo);
            json_response([
                'success' => true,
                'data'    => admin_build_settings_response($pdo)
            ]);
        }

        if ($method === 'POST') {
            $admin = require_admin($pdo);
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

        require_once __DIR__ . '/AdminLogService.php';

        // 1. Phân trang
        $page  = max(1, (int)($_GET['page'] ?? 1));
        $limit = max(1, min(100, (int)($_GET['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;

        // 2. Bộ lọc
        $rawUser = $_GET['admin_id'] ?? $_GET['user_id'] ?? $_GET['user'] ?? '';
        if (!is_string($rawUser) && !is_int($rawUser)) {
            json_error('Bộ lọc nhân sự không hợp lệ.', 400, 'ERR_INVALID_ADMIN_FILTER');
        }
        $rawUser = trim((string)$rawUser);
        $systemFilter = strtolower($rawUser) === 'system';
        $userId = ($rawUser !== '' && !$systemFilter) ? (int)$rawUser : null;
        $actFilter = sanitize_string($_GET['action_type'] ?? $_GET['filter_action'] ?? $_GET['log_action'] ?? '', 80);
        $rawActionCodes = $_GET['action_codes'] ?? '';
        $fromDate = sanitize_string($_GET['from_date'] ?? '', 20);
        $toDate = sanitize_string($_GET['to_date'] ?? '', 20);
        $dateFilter = sanitize_string($_GET['date'] ?? '', 20);
        $search = sanitize_string($_GET['search'] ?? '', 100);

        $where = [];
        $params = [];

        if ($userId !== null && $userId > 0) {
            $where[] = "user_id = ?";
            $params[] = $userId;
        }

        if ($systemFilter) {
            $where[] = "(user_id IS NULL OR actor_role = 'system')";
        }

        if ($rawActionCodes !== '') {
            if (!is_string($rawActionCodes)) {
                json_error('Bộ lọc loại hành động không hợp lệ.', 400, 'ERR_INVALID_ACTION_FILTER');
            }
            $rawActionCodeList = array_values(array_filter(array_map('trim', explode(',', $rawActionCodes)), static fn(string $code): bool => $code !== ''));
            if (count($rawActionCodeList) > 100) {
                json_error('Bộ lọc có quá nhiều loại hành động.', 400, 'ERR_INVALID_ACTION_FILTER');
            }
            if (count(array_filter(
                $rawActionCodeList,
                static fn(string $code): bool => preg_match('/^[A-Za-z0-9_]+$/', $code) !== 1
            )) > 0) {
                json_error('Bộ lọc loại hành động không hợp lệ.', 400, 'ERR_INVALID_ACTION_FILTER');
            }
            $actionCodes = array_values(array_unique($rawActionCodeList));
            if ($actionCodes === []) {
                $where[] = '1 = 0';
            } else {
                $where[] = 'UPPER(action) IN (' . implode(', ', array_fill(0, count($actionCodes), '?')) . ')';
                array_push($params, ...array_map('strtoupper', $actionCodes));
            }
        } elseif ($actFilter !== '') {
            $where[] = "action = ?";
            $params[] = $actFilter;
        }

        if ($fromDate !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $fromDate)) {
            $where[] = "DATE(created_at) >= ?";
            $params[] = $fromDate;
        }

        if ($toDate !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $toDate)) {
            $where[] = "DATE(created_at) <= ?";
            $params[] = $toDate;
        }

        if ($fromDate === '' && $toDate === '' && $dateFilter !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateFilter)) {
            $where[] = "DATE(created_at) = ?";
            $params[] = $dateFilter;
        }

        if ($search !== '') {
            $where[] = "(target_id LIKE ? OR booking_id LIKE ? OR actor_name LIKE ? OR old_value LIKE ? OR new_value LIKE ?)";
            $likeVal = '%' . $search . '%';
            $params[] = $likeVal;
            $params[] = $likeVal;
            $params[] = $likeVal;
            $params[] = $likeVal;
            $params[] = $likeVal;
        }

        $whereSql = !empty($where) ? ('WHERE ' . implode(' AND ', $where)) : '';

        // 3. Đếm tổng số bản ghi phục vụ phân trang
        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM audit_logs {$whereSql}");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();
        $totalPages = $total > 0 ? (int)ceil($total / $limit) : 1;

        // 4. Lấy dữ liệu trang hiện tại
        $stmt = $pdo->prepare("SELECT * FROM audit_logs {$whereSql} ORDER BY id DESC LIMIT {$limit} OFFSET {$offset}");
        $stmt->execute($params);
        $rawLogs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $formattedLogs = [];
        foreach ($rawLogs as $log) {
            $log['formatted_message'] = AdminLogService::formatLogMessage($log);
            if (!empty($log['created_at'])) {
                $ts = strtotime((string)$log['created_at']);
                $log['created_at_formatted'] = ($ts !== false) ? date('d/m/Y H:i', $ts) : (string)$log['created_at'];
            } else {
                $log['created_at_formatted'] = '';
            }

            // Chuẩn hóa đối tượng thao tác nếu chưa có
            $rawTargetType = strtolower(trim((string)($log['target_type'] ?? '')));
            $rawTargetId   = trim((string)($log['target_id'] ?? $log['booking_id'] ?? ''));
            $cleanAct      = strtoupper(trim((string)($log['action'] ?? '')));

            if ($rawTargetId !== '') {
                if ($rawTargetType === '' || $rawTargetType === 'other') {
                    if (preg_match('/^P\d+-/i', $rawTargetId) || str_contains($cleanAct, 'PITCH')) {
                        $rawTargetType = 'pitch';
                    } elseif (preg_match('/^BK-/i', $rawTargetId) || preg_match('/^[A-Z0-9]{8,12}$/i', $rawTargetId) || str_contains($cleanAct, 'BOOKING') || $cleanAct === 'CHECKIN') {
                        $rawTargetType = 'booking';
                    } elseif (str_contains($cleanAct, 'VOUCHER') || str_starts_with($rawTargetId, 'VC-')) {
                        $rawTargetType = 'voucher';
                    } elseif (str_contains($cleanAct, 'SERVICE') || str_starts_with($rawTargetId, 'SRV-')) {
                        $rawTargetType = 'service';
                    } elseif (str_contains($cleanAct, 'EXPENSE') || str_starts_with($rawTargetId, 'EXP-')) {
                        $rawTargetType = 'expense';
                    } elseif (str_contains($cleanAct, 'SHIFT')) {
                        $rawTargetType = 'shift';
                    } elseif (str_contains($cleanAct, 'USER') || str_contains($cleanAct, 'MEMBER') || str_contains($cleanAct, 'STAFF')) {
                        $rawTargetType = 'user';
                    }
                }
            } else {
                if (in_array($cleanAct, ['UPDATE_PRICING', 'UPDATE_PRICE', 'PRICE_UPDATE'], true)) {
                    $rawTargetType = 'pricing';
                    $rawTargetId   = 'Bảng giá sân';
                } elseif (in_array($cleanAct, ['ENABLE_2FA', 'DISABLE_2FA', '2FA_TOGGLE'], true)) {
                    $rawTargetType = 'security';
                    $rawTargetId   = 'Xác thực 2FA';
                } elseif (in_array($cleanAct, ['UPDATE_SETTINGS', 'SYSTEM_SETTINGS'], true)) {
                    $rawTargetType = 'settings';
                    $rawTargetId   = 'Cấu hình chung';
                } elseif (in_array($cleanAct, ['DB_BACKUP', 'DB_BACKUP_DOWNLOAD'], true)) {
                    $rawTargetType = 'database';
                    $rawTargetId   = 'Sao lưu CSDL';
                } elseif (in_array($cleanAct, ['GOLDEN_HOUR_SAVE', 'GOLDEN_HOUR_DELETE'], true)) {
                    $rawTargetType = 'pricing';
                    $rawTargetId   = 'Giờ vàng';
                } elseif (in_array($cleanAct, ['SAMPLE_DATA_CLEAN', 'SAMPLE_DATA_SEED'], true)) {
                    $rawTargetType = 'system';
                    $rawTargetId   = 'Dữ liệu mẫu';
                } elseif (in_array($cleanAct, ['TELEGRAM_TEST'], true)) {
                    $rawTargetType = 'system';
                    $rawTargetId   = 'Bot Telegram';
                }
            }

            $log['target_type'] = $rawTargetType !== '' ? $rawTargetType : null;
            $log['target_id']   = $rawTargetId !== '' ? $rawTargetId : null;

            $formattedLogs[] = $log;
        }

        $staffStmt = $pdo->query("SELECT id, username, full_name, role FROM users WHERE role IN ('admin', 'manager', 'staff') ORDER BY FIELD(role, 'admin', 'manager', 'staff'), id ASC");
        $staffList = $staffStmt ? $staffStmt->fetchAll(PDO::FETCH_ASSOC) : [];

        $actStmt = $pdo->query("SELECT DISTINCT action FROM audit_logs ORDER BY action ASC");
        $actionTypes = $actStmt ? $actStmt->fetchAll(PDO::FETCH_COLUMN) : [];

        json_response([
            'success' => true,
            'data'    => [
                'logs'        => $formattedLogs,
                'pagination'  => [
                    'page'       => $page,
                    'limit'      => $limit,
                    'total'      => $total,
                    'totalPages' => $totalPages
                ],
                'staffList'   => $staffList,
                'actionTypes' => $actionTypes
            ]
        ]);
    }
}
