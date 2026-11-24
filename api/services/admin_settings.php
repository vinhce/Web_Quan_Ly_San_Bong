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
            $openHours           = sanitize_string($data['openHours'] ?? $data['open_hours'] ?? ($oldSettings['open_hours'] ?? '05:30 - 22:30 hàng ngày (kể cả Lễ, Tết)'), 120);
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

            $auditShiftStrong = array_key_exists('auditAnomalyShiftStrongVnd', $data) || array_key_exists('audit_anomaly_shift_strong_vnd', $data)
                ? max(0, (int)($data['auditAnomalyShiftStrongVnd'] ?? $data['audit_anomaly_shift_strong_vnd']))
                : (int)($oldSettings['audit_anomaly_shift_strong_vnd'] ?? 50000);
            $auditPointsStrong = array_key_exists('auditAnomalyPointsStrong', $data) || array_key_exists('audit_anomaly_points_strong', $data)
                ? max(1, (int)($data['auditAnomalyPointsStrong'] ?? $data['audit_anomaly_points_strong']))
                : (int)($oldSettings['audit_anomaly_points_strong'] ?? 50);
            $auditDiscountPct = array_key_exists('auditAnomalyDiscountPct', $data) || array_key_exists('audit_anomaly_discount_pct', $data)
                ? max(1, min(100, (int)($data['auditAnomalyDiscountPct'] ?? $data['audit_anomaly_discount_pct'])))
                : (int)($oldSettings['audit_anomaly_discount_pct'] ?? 50);
            $auditNightStart = array_key_exists('auditAnomalyNightStart', $data) || array_key_exists('audit_anomaly_night_start', $data)
                ? max(0, min(23, (int)($data['auditAnomalyNightStart'] ?? $data['audit_anomaly_night_start'])))
                : (int)($oldSettings['audit_anomaly_night_start'] ?? 0);
            $auditNightEnd = array_key_exists('auditAnomalyNightEnd', $data) || array_key_exists('audit_anomaly_night_end', $data)
                ? max(0, min(23, (int)($data['auditAnomalyNightEnd'] ?? $data['audit_anomaly_night_end'])))
                : (int)($oldSettings['audit_anomaly_night_end'] ?? 5);
            $auditReasonMinLen = array_key_exists('auditReasonMinLen', $data) || array_key_exists('audit_reason_min_len', $data)
                ? max(3, min(100, (int)($data['auditReasonMinLen'] ?? $data['audit_reason_min_len'])))
                : (int)($oldSettings['audit_reason_min_len'] ?? 10);

            $upsertStmt = $pdo->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
            $pairs = [
                'deposit_rate'                     => (string)$depositRate,
                'bank_name'                        => $bankName,
                'bank_code'                        => $bankCode,
                'bank_account'                     => $accountNo,
                'bank_holder'                      => $accountName,
                'hotline'                          => $hotline,
                'open_hours'                       => $openHours,
                'hold_minutes'                     => (string)$holdMinutes,
                'waitlist_hold_minutes'            => (string)$waitlistHoldMinutes,
                'matchmaking_enabled'              => $matchmakingEnabled,
                'matchmaking_require_approval'     => $matchRequireAppv,
                'refund_full_hours'                => (string)$refundFullHours,
                'refund_partial_hours'             => (string)$refundPartialHours,
                'auto_cancel_enabled'              => $autoCancelEnabled,
                'reminder_enabled'                 => $reminderEnabled,
                'reminder_hours_before'            => (string)$reminderHours,
                'customer_notify_enabled'          => $custNotifyEnabled,
                'customer_notify_webhook'          => $custNotifyWebhook,
                'booking_confirm_template'         => $confirmTemplate,
                'reminder_template'                => $reminderTemplate,
                'telegram_notify_enabled'          => $tgEnabled,
                'telegram_bot_token'               => $tgBotToken,
                'telegram_chat_id'                 => $tgChatId,
                'audit_anomaly_shift_strong_vnd'   => (string)$auditShiftStrong,
                'audit_anomaly_points_strong'      => (string)$auditPointsStrong,
                'audit_anomaly_discount_pct'       => (string)$auditDiscountPct,
                'audit_anomaly_night_start'        => (string)$auditNightStart,
                'audit_anomaly_night_end'          => (string)$auditNightEnd,
                'audit_reason_min_len'             => (string)$auditReasonMinLen,
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

            // Yêu cầu 1, 2, 3: So sánh cũ/mới bằng logAdminChange TRƯỚC KHI UPDATE
            $changeDiff = logAdminChange($pdo, 'UPDATE_SETTINGS', $oldForAudit, $newForAudit, 'Cài đặt hệ thống', 'settings', $admin);
            if (!$changeDiff['has_change']) {
                // KHÔNG insert log, KHÔNG chạy lệnh UPDATE thừa, vẫn trả về thành công
                json_response([
                    'success'     => true,
                    'has_changed' => false,
                    'message'     => 'Không có thay đổi để lưu (cài đặt giữ nguyên).',
                    'data'        => admin_build_settings_response($pdo)
                ]);
            }

            foreach ($pairs as $k => $v) {
                $upsertStmt->execute([$k, $v]);
            }

            json_response([
                'success'     => true,
                'has_changed' => true,
                'message'     => 'Đã lưu cài đặt hệ thống và chính sách cọc/hủy vào DB thành công!',
                'data'        => admin_build_settings_response($pdo)
            ]);
        }

        json_error('Phương thức không được hỗ trợ.', 405, 'ERR_METHOD_NOT_ALLOWED');
    }

    if (in_array($action, ['audit_update', 'audit_delete', 'delete_audit_log', 'update_audit_log'], true)) {
        require_admin($pdo);
        json_error('Nhật ký thao tác chỉ cho phép đọc, nghiêm cấm chỉnh sửa hoặc xóa!', 405, 'ERR_AUDIT_IMMUTABLE');
    }

    if ($action === 'audit_logs') {
        $admin = require_admin($pdo);
        if (strtoupper($method) !== 'GET') {
            json_error('Nhật ký thao tác chỉ cho phép đọc, nghiêm cấm chỉnh sửa hoặc xóa!', 405, 'ERR_AUDIT_IMMUTABLE');
        }

        require_once __DIR__ . '/AdminLogService.php';

        $rawUser = $_GET['admin_id'] ?? $_GET['user_id'] ?? $_GET['user'] ?? '';
        if (!is_string($rawUser) && !is_int($rawUser)) {
            json_error('Bộ lọc nhân sự không hợp lệ.', 400, 'ERR_INVALID_ADMIN_FILTER');
        }
        $rawActionCodes = $_GET['action_codes'] ?? '';
        if ($rawActionCodes !== '') {
            if (!is_string($rawActionCodes)) {
                json_error('Bộ lọc loại hành động không hợp lệ.', 400, 'ERR_INVALID_ACTION_FILTER');
            }
            $rawActionCodeList = array_values(array_filter(array_map('trim', explode(',', $rawActionCodes)), static fn(string $code): bool => $code !== ''));
            if (count($rawActionCodeList) > 100) {
                json_error('Bộ lọc có quá nhiều loại hành động.', 400, 'ERR_INVALID_ACTION_FILTER');
            }
            if (count(array_filter($rawActionCodeList, static fn(string $code): bool => preg_match('/^[A-Za-z0-9_]+$/', $code) !== 1)) > 0) {
                json_error('Bộ lọc loại hành động không hợp lệ.', 400, 'ERR_INVALID_ACTION_FILTER');
            }
        }

        $result = AdminLogService::listLogs($pdo, $_GET);
        json_response([
            'success' => true,
            'data'    => $result,
        ]);
    }

    if ($action === 'audit_summary') {
        require_admin($pdo);
        if (strtoupper($method) !== 'GET') {
            json_error('Tóm tắt nhật ký chỉ hỗ trợ phương thức GET.', 405, 'ERR_METHOD_NOT_ALLOWED');
        }
        require_once __DIR__ . '/AdminLogService.php';
        json_response([
            'success' => true,
            'data'    => AdminLogService::getSummary($pdo, $_GET),
        ]);
    }

    if ($action === 'audit_check_new') {
        require_admin($pdo);
        if (strtoupper($method) !== 'GET') {
            json_error('Kiểm tra bản ghi mới chỉ hỗ trợ phương thức GET.', 405, 'ERR_METHOD_NOT_ALLOWED');
        }
        require_once __DIR__ . '/AdminLogService.php';
        $sinceId = max(0, (int)($_GET['since_id'] ?? 0));
        json_response([
            'success' => true,
            'data'    => AdminLogService::checkNewLogs($pdo, $sinceId),
        ]);
    }

    if ($action === 'audit_log_detail') {
        $admin = require_admin($pdo);
        if (strtoupper($method) !== 'GET') {
            json_error('Xem chi tiết nhật ký chỉ hỗ trợ phương thức GET.', 405, 'ERR_METHOD_NOT_ALLOWED');
        }
        require_once __DIR__ . '/AdminLogService.php';
        $logId = (int)($_GET['id'] ?? 0);
        $reveal = !empty($_GET['reveal']) && $_GET['reveal'] !== '0';
        $res = AdminLogService::getLogDetail($pdo, $logId, $reveal, $admin);
        if (empty($res['ok'])) {
            json_error($res['message'] ?? 'Không tìm thấy bản ghi.', (int)($res['status'] ?? 404), (string)($res['ref_code'] ?? 'ERR_LOG_NOT_FOUND'));
        }
        json_response([
            'success' => true,
            'data'    => $res['data'],
        ]);
    }

    if ($action === 'audit_review') {
        $admin = require_admin($pdo);
        if (strtoupper($method) !== 'POST') {
            json_error('Thao tác hậu kiểm bắt buộc dùng phương thức POST.', 405, 'ERR_METHOD_NOT_ALLOWED');
        }
        require_once __DIR__ . '/AdminLogService.php';
        $logId = (int)($data['log_id'] ?? $data['id'] ?? 0);
        $note = (string)($data['note'] ?? '');
        $res = AdminLogService::submitReview($pdo, $logId, $note, $admin);
        if (empty($res['ok'])) {
            json_error($res['message'] ?? 'Không thể ghi nhận hậu kiểm.', (int)($res['status'] ?? 400), (string)($res['ref_code'] ?? 'ERR_REVIEW_FAILED'));
        }
        json_response([
            'success' => true,
            'message' => 'Đã ghi nhận hậu kiểm bản ghi nhật ký thành công!',
            'data'    => $res['data'],
        ], 201);
    }

    if ($action === 'audit_export_csv') {
        $admin = require_admin($pdo);
        if (strtoupper($method) !== 'GET') {
            json_error('Xuất CSV nhật ký chỉ hỗ trợ phương thức GET.', 405, 'ERR_METHOD_NOT_ALLOWED');
        }
        require_once __DIR__ . '/AdminLogService.php';
        AdminLogService::exportCsv($pdo, $_GET, $admin);
    }
}
