<?php

defined('SANBONG_ADMIN_ROUTER') or define('SANBONG_ADMIN_ROUTER', true);
require_once __DIR__ . '/security_helper.php';
require_once __DIR__ . '/notification_helper.php';
require_once __DIR__ . '/services/admin_bookings_manage.php';
require_once __DIR__ . '/services/admin_staff_vouchers.php';
require_once __DIR__ . '/services/totp_turnstile_helper.php';

$actor = require_staff_or_admin();
$pdo = getDBConnection(false);
$method = $_SERVER['REQUEST_METHOD'];

$rawInput = file_get_contents('php://input');
$data = [];
if (!empty($rawInput)) {
    $decoded = json_decode($rawInput, true);
    if (is_array($decoded)) {
        $data = $decoded;
    }
}
$data = array_merge($_POST, $data);
$action = $_GET['action'] ?? $data['action'] ?? 'overview';
if (!in_array(strtoupper($method), ['GET', 'POST'], true)) {
    require_csrf_if_session_authenticated($data);
    json_error('Phương thức HTTP không được hỗ trợ.', 405, 'ERR_METHOD_NOT_ALLOWED');
}
if (!in_array(strtoupper($method), ['GET', 'HEAD', 'OPTIONS'], true)) {
    require_csrf_if_session_authenticated($data);
}
$postOnlyActions = [
    'update_payment', 'manage_booking', 'adjust_discount', 'toggle_pitch', 'save_pricing',
    'upsert_pitch', 'manage_pitch', 'counter_sale', 'run_auto_release',
    'update_customer_crm', 'update_customer', 'adjust_points', 'create_recurring_schedule', 'cancel_recurring_schedule',
    'skip_recurring_booking', 'assign_waitlist', 'notify_waitlist', 'cancel_waitlist',
    'save_voucher', 'delete_voucher', 'save_golden_hour', 'delete_golden_hour',
    'save_maintenance', 'update_maintenance', 'add_expense', 'delete_expense',
    'test_telegram', 'run_match_reminders', 'run_recurring_cron',
    'moderate_matchmaking', 'backup_database_now', 'update_member'
];
if (in_array($action, $postOnlyActions, true) && strtoupper($method) !== 'POST') {
    json_error('Hành động thay đổi dữ liệu bắt buộc dùng phương thức POST.', 405, 'ERR_METHOD_NOT_ALLOWED');
}

function admin_map_booking(array $b): array {
    $services = !empty($b['services_json']) ? json_decode($b['services_json'], true) : ($b['services'] ?? []);
    if (!is_array($services)) {
        $services = [];
    }
    unset($b['services_json']);
    $b['services']            = $services;
    $b['customerName']        = $b['customer_name'] ?? $b['customerName'] ?? '';
    $b['pitchId']             = $b['pitch_id'] ?? $b['pitchId'] ?? '';
    $b['pitchName']           = $b['pitch_name'] ?? $b['pitchName'] ?? '';
    $b['typeName']            = $b['type_name'] ?? $b['typeName'] ?? '';
    $b['date']                = $b['booking_date'] ?? $b['date'] ?? '';
    $b['slotId']              = $b['slot_id'] ?? $b['slotId'] ?? '';
    $b['slotTime']            = $b['slot_time'] ?? $b['slotTime'] ?? '';
    $b['voucherCode']         = $b['voucher_code'] ?? $b['voucherCode'] ?? null;
    $b['originalPrice']       = (int)($b['original_price'] ?? $b['originalPrice'] ?? $b['total_price'] ?? $b['totalPrice'] ?? 0);
    $b['discountAmount']      = (int)($b['discount_amount'] ?? $b['discountAmount'] ?? 0);
    $b['totalPrice']          = (int)($b['total_price'] ?? $b['totalPrice'] ?? 0);
    $b['depositAmount']       = (int)($b['deposit_amount'] ?? $b['depositAmount'] ?? 0);
    $b['paidAmount']          = (int)($b['paid_amount'] ?? $b['paidAmount'] ?? 0);
    $b['remainingAmount']     = (int)($b['remaining_amount'] ?? $b['remainingAmount'] ?? 0);
    $b['paymentStatus']       = $b['payment_status'] ?? $b['paymentStatus'] ?? 'Chờ duyệt cọc';
    $b['paymentMethod']       = $b['payment_method'] ?? $b['paymentMethod'] ?? 'VietQR Chuyển khoản';
    $b['cancelPolicyApplied'] = $b['cancel_policy_applied'] ?? $b['cancelPolicyApplied'] ?? null;
    $b['refundAmount']        = (int)($b['refund_amount'] ?? $b['refundAmount'] ?? 0);
    $b['weeksCount']          = max(1, (int)($b['weeks_count'] ?? $b['weeksCount'] ?? 1));
    $b['bookingMode']         = $b['booking_mode'] ?? $b['bookingMode'] ?? 'single';
    $b['recurringScheduleId'] = !empty($b['recurring_schedule_id']) ? (int)$b['recurring_schedule_id'] : null;
    $b['expiresAt']           = $b['expires_at'] ?? $b['expiresAt'] ?? null;
    $b['createdAt']           = $b['created_at'] ?? $b['createdAt'] ?? '';
    return $b;
}

function admin_build_settings_response(?PDO $pdo): array {
    $settingsMap = get_system_settings_map($pdo);
    $rawBotToken = trim((string)($settingsMap['telegram_bot_token'] ?? ''));
    return [
        'settings' => [
            'depositRate'                => (int)($settingsMap['deposit_rate'] ?? 30),
            'hotline'                    => $settingsMap['hotline'] ?? '0352 313 548',
            'openHours'                  => $settingsMap['open_hours'] ?? '05:30 - 23:00 hàng ngày (kể cả Lễ, Tết)',
            'holdMinutes'                => max(5, min(120, (int)($settingsMap['hold_minutes'] ?? 15))),
            'waitlistHoldMinutes'        => max(5, min(120, (int)($settingsMap['waitlist_hold_minutes'] ?? 15))),
            'matchmakingEnabled'         => ((string)($settingsMap['matchmaking_enabled'] ?? '1') !== '0'),
            'matchmakingRequireApproval' => ((string)($settingsMap['matchmaking_require_approval'] ?? '0') === '1'),
            'refundFullHours'            => max(1, (int)($settingsMap['refund_full_hours'] ?? 24)),
            'refundPartialHours'         => max(0, (int)($settingsMap['refund_partial_hours'] ?? 4)),
            'autoCancelEnabled'          => ((string)($settingsMap['auto_cancel_enabled'] ?? '1') !== '0'),
            'reminderEnabled'            => ((string)($settingsMap['reminder_enabled'] ?? '1') !== '0'),
            'reminderHoursBefore'        => max(1, (int)($settingsMap['reminder_hours_before'] ?? 2)),
            'customerNotifyEnabled'      => ((string)($settingsMap['customer_notify_enabled'] ?? '0') === '1'),
            'customerNotifyWebhook'      => (string)($settingsMap['customer_notify_webhook'] ?? ''),
            'bookingConfirmTemplate'     => (string)($settingsMap['booking_confirm_template'] ?? ''),
            'reminderTemplate'           => (string)($settingsMap['reminder_template'] ?? ''),
            'telegramNotifyEnabled'      => ((string)($settingsMap['telegram_notify_enabled'] ?? '0') === '1'),
            'telegramBotToken'           => ($rawBotToken !== '' ? '********' : ''),
            'telegramBotTokenConfigured' => ($rawBotToken !== ''),
            'telegramChatId'             => (string)($settingsMap['telegram_chat_id'] ?? ''),
            'telegramEvents'             => [
                'new_booking'  => ((string)($settingsMap['tg_event_new_booking'] ?? '1') !== '0'),
                'cancel'       => ((string)($settingsMap['tg_event_cancel'] ?? '1') !== '0'),
                'shift_diff'   => ((string)($settingsMap['tg_event_shift_diff'] ?? '1') !== '0'),
                'unmatched_tx' => ((string)($settingsMap['tg_event_unmatched_tx'] ?? '1') !== '0'),
                'low_stock'    => ((string)($settingsMap['tg_event_low_stock'] ?? '1') !== '0'),
                'waitlist'     => ((string)($settingsMap['tg_event_waitlist'] ?? '1') !== '0'),
                'matchmaking'  => ((string)($settingsMap['tg_event_matchmaking'] ?? '1') !== '0'),
                'review'       => ((string)($settingsMap['tg_event_review'] ?? '1') !== '0'),
            ],
            'turnstileHealth'            => function_exists('check_turnstile_health') ? check_turnstile_health() : null,
            'pricingTable' => [
                'p5'  => [
                    'base'    => (int)($settingsMap['price_p5_base'] ?? 250000),
                    'peak'    => (int)($settingsMap['price_p5_peak'] ?? 350000),
                    'weekend' => (int)($settingsMap['price_p5_weekend'] ?? 380000)
                ],
                'p7'  => [
                    'base'    => (int)($settingsMap['price_p7_base'] ?? 450000),
                    'peak'    => (int)($settingsMap['price_p7_peak'] ?? 650000),
                    'weekend' => (int)($settingsMap['price_p7_weekend'] ?? 700000)
                ],
                'p11' => [
                    'base'    => (int)($settingsMap['price_p11_base'] ?? 900000),
                    'peak'    => (int)($settingsMap['price_p11_peak'] ?? 1200000),
                    'weekend' => (int)($settingsMap['price_p11_weekend'] ?? 1400000)
                ]
            ]
        ],
        'bankInfo' => [
            'bankName'      => $settingsMap['bank_name'] ?? 'MBBank',
            'bankCode'      => $settingsMap['bank_code'] ?? 'MB',
            'accountNo'     => $settingsMap['bank_account'] ?? '0352313548',
            'accountNumber' => $settingsMap['bank_account'] ?? '0352313548',
            'accountName'   => $settingsMap['bank_holder'] ?? 'NGUYEN QUANG VINH'
        ]
    ];
}

if (!$pdo) {
    if ($action === 'overview') {
        $isStaff = (($actor['role'] ?? '') === 'staff');
        json_response([
            'success' => true,
            'data'    => [
                'todayStats'    => [
                    'count'         => 0,
                    'today_deposit' => $isStaff ? null : 0,
                    'today_total'   => $isStaff ? null : 0
                ],
                'todayBookings' => [],
                'pitchStats'    => ['total' => 0, 'active' => 0],
                'weeklySeries'  => [],
                'byPitch'       => []
            ]
        ]);
    }
    if ($action === 'all_bookings') {
        json_response(['success' => true, 'data' => []]);
    }
    if ($action === 'pending_deposits') {
        json_response([
            'success' => true,
            'data'    => [
                [
                    'id'             => 1,
                    'code'           => 'BK-261115-001',
                    'time'           => date('H:i d/m/Y'),
                    'name'           => 'Khách Mẫu Dự Phòng',
                    'phone'          => '0981234567',
                    'pitch_name'     => 'Sân 7 - Sân A',
                    'date'           => date('Y-m-d'),
                    'slot_time'      => '17:30 - 19:00',
                    'amt'            => 195000,
                    'deposit_amount' => 195000,
                    'total_price'    => 650000,
                    'bank'           => 'VietQR MBBank',
                    'payment_method' => 'VietQR Chuyển khoản',
                    'created_at'     => date('Y-m-d H:i:s'),
                    'bankTxStatus'   => 'matched',
                    'bank_tx_status' => 'Đã nhận đủ',
                    'txAmt'          => 195000,
                    'transfer_amount'=> 195000,
                    'paidAmt'        => 195000,
                    'paid_amount'    => 195000
                ]
            ]
        ]);
    }
    if ($action === 'update_payment') {
        $mgr = require_manager_or_admin($pdo);
        json_response([
            'success' => true,
            'message' => 'Đã cập nhật trạng thái đơn thành công (chế độ dự phòng).'
        ]);
    }
    if ($action === 'toggle_pitch') {
        $status = sanitize_string($data['status'] ?? '', 50);
        if (!in_array($status, ['Hoạt động', 'Bảo trì', 'Ẩn'], true)) {
            json_response(['success' => false, 'message' => 'Trạng thái sân không hợp lệ.'], 400);
        }
        if ($status === 'Ẩn') {
            require_manager_or_admin($pdo);
        }
        json_response([
            'success' => true,
            'message' => 'Đã chuyển trạng thái sân thành công (chế độ dự phòng).'
        ]);
    }
    if ($action === 'manage_booking') {
        json_response([
            'success' => true,
            'message' => 'Đã cập nhật xử lý ca đá thành công (chế độ dự phòng).'
        ]);
    }
    if ($action === 'vouchers') {
        if ($method === 'POST') {
            $admin = require_admin($pdo);
        }
        json_response([
            'success' => true,
            'data'    => [],
            'message' => 'Đã xử lý voucher thành công (chế độ dự phòng).'
        ]);
    }
    if ($action === 'staff_users') {
        $admin = require_admin($pdo);
        if ($method === 'GET') {
            json_response([
                'success' => true,
                'data'    => [
                    [
                        'id'         => 5,
                        'username'   => 'quanly',
                        'email'      => 'quanly@sanbongpro.vn',
                        'phone'      => '0352000222',
                        'full_name'  => 'Nguyễn Hoàng Minh (Quản Lý Sân)',
                        'role'       => 'manager',
                        'status'     => 'active',
                        'created_at' => date('Y-m-d H:i:s')
                    ],
                    [
                        'id'         => 4,
                        'username'   => 'nhanvien',
                        'email'      => 'nhanvien@sanbongpro.vn',
                        'phone'      => '0352000111',
                        'full_name'  => 'Nhân Viên Trực Sân Ca 1',
                        'role'       => 'staff',
                        'status'     => 'active',
                        'created_at' => date('Y-m-d H:i:s')
                    ]
                ]
            ]);
        }
        if ($method === 'POST') {
            $subAction = sanitize_string($data['sub_action'] ?? '', 30);
            if ($subAction === 'create') {
                $username = sanitize_string($data['username'] ?? '', 50);
                $fullName = sanitize_string($data['full_name'] ?? '', 100);
                $phone = preg_replace('/\s+/', '', sanitize_string($data['phone'] ?? '', 20));
                $password = (string)($data['password'] ?? '');
                $role = sanitize_string($data['role'] ?? 'staff', 20);
                if (!in_array($role, ['staff', 'manager'], true)) {
                    json_error('Vai trò chỉ được phép là staff hoặc manager.', 400, 'ERR_INVALID_ROLE');
                }
                if (!preg_match('/^[a-zA-Z0-9_]{3,30}$/', $username)) {
                    json_error('Tên đăng nhập phải từ 3–30 ký tự (chữ cái, số, dấu gạch dưới).', 400, 'ERR_INVALID_USERNAME');
                }
                if (empty($fullName)) {
                    json_error('Vui lòng nhập họ và tên nhân viên.', 400, 'ERR_EMPTY_FULLNAME');
                }
                if (!preg_match('/^(0[3|5|7|8|9])[0-9]{8}$/', $phone)) {
                    json_error('Số điện thoại không đúng định dạng di động 10 số.', 400, 'ERR_PHONE_FORMAT');
                }
                if (strlen($password) < 6) {
                    json_error('Mật khẩu nhân viên phải có tối thiểu 6 ký tự.', 400, 'ERR_WEAK_PASSWORD');
                }
                json_response([
                    'success' => true,
                    'message' => "Đã tạo tài khoản nhân viên {$username} (chế độ dự phòng).",
                    'data'    => [
                        'id'         => time(),
                        'username'   => $username,
                        'email'      => strtolower($username) . '@sanbongpro.vn',
                        'phone'      => $phone,
                        'full_name'  => $fullName,
                        'role'       => $role,
                        'status'     => 'active',
                        'created_at' => date('Y-m-d H:i:s')
                    ]
                ], 201);
            }
            if ($subAction === 'update_role') {
                $role = sanitize_string($data['role'] ?? '', 20);
                if (!in_array($role, ['staff', 'manager'], true)) {
                    json_error('Vai trò chỉ được phép là staff hoặc manager.', 400, 'ERR_INVALID_ROLE');
                }
            }
            json_response([
                'success' => true,
                'message' => 'Đã xử lý tài khoản nhân viên thành công (chế độ dự phòng).'
            ]);
        }
    }
    if ($action === 'save_pricing' || $action === 'settings') {
        $admin = require_admin($pdo);
        if ($action === 'save_pricing') {
            json_response(['success' => true, 'message' => 'Đã lưu cấu hình bảng giá (chế độ dự phòng).']);
        }
        if ($action === 'settings') {
            json_response(['success' => true, 'data' => admin_build_settings_response(null), 'message' => 'Đã xử lý cài đặt (chế độ dự phòng).']);
        }
    }
    if ($action === 'reports' || $action === 'export_reports_csv') {
        $mgr = require_manager_or_admin($pdo);
        if ($action === 'reports' || $action === 'export_reports_csv') {
            json_response([
                'success' => true,
                'data'    => [
                    'totalRevenue' => 0, 'depositRevenue' => 0, 'remainingRevenue' => 0, 'remaining70Revenue' => 0,
                    'serviceRevenue' => 0, 'servicesRevenue' => 0, 'counterSalesRevenue' => 0,
                    'cashRevenue' => 0, 'transferRevenue' => 0, 'vietqrRevenue' => 0,
                    'totalBookings' => 0, 'completedBookings' => 0, 'cancelledBookings' => 0,
                    'totalMatches' => 0, 'avgRevenue' => 0,
                    'summary' => [
                        'totalRevenue' => 0, 'depositRevenue' => 0, 'remainingRevenue' => 0, 'remaining70Revenue' => 0,
                        'cashRevenue' => 0, 'transferRevenue' => 0, 'vietqrRevenue' => 0, 'serviceRevenue' => 0, 'servicesRevenue' => 0,
                        'totalMatches' => 0, 'avgRevenue' => 0
                    ],
                    'byType'  => [
                        'p5'  => ['revenue' => 0, 'count' => 0, 'matches' => 0, 'pitchCount' => 6],
                        'p7'  => ['revenue' => 0, 'count' => 0, 'matches' => 0, 'pitchCount' => 7],
                        'p11' => ['revenue' => 0, 'count' => 0, 'matches' => 0, 'pitchCount' => 4],
                        '5'   => ['revenue' => 0, 'count' => 0, 'matches' => 0, 'pitchCount' => 6],
                        '7'   => ['revenue' => 0, 'count' => 0, 'matches' => 0, 'pitchCount' => 7],
                        '11'  => ['revenue' => 0, 'count' => 0, 'matches' => 0, 'pitchCount' => 4]
                    ],
                    'byPitch' => []
                ]
            ]);
        }
    }
    if ($action === 'audit_logs') {
        $admin = require_admin($pdo);
        json_response(['success' => true, 'data' => ['logs' => [], 'staffList' => [], 'actionTypes' => []]]);
    }
    if ($action === 'shifts') {
        if ($method === 'POST' && sanitize_string($data['sub_action'] ?? '', 30) === 'confirm_shift') {
            require_manager_or_admin($pdo);
        }
        json_response(['success' => true, 'data' => ['activeShift' => null, 'currentShift' => null, 'shifts' => []]]);
    }
    if (in_array($action, ['inventory', 'counter_sale', 'services_inventory'], true)) {
        if ($method === 'POST') {
            $subAction = sanitize_string($data['sub_action'] ?? ($action === 'counter_sale' ? 'sell_counter' : ''), 30);
            if (in_array($subAction, ['restock', 'save_service', 'upsert', 'delete_service'], true)) {
                require_manager_or_admin($pdo);
            }
        }
        json_response(['success' => true, 'data' => ['services' => [], 'recentSales' => [], 'lowStockCount' => 0]]);
    }
    if (in_array($action, ['manage_pitch', 'upsert_pitch'], true)) {
        $mgr = require_manager_or_admin($pdo);
        json_response(['success' => true, 'message' => 'Đã lưu thông tin sân bóng (chế độ dự phòng).']);
    }
    if ($action === 'bank_transactions') {
        $mgr = require_manager_or_admin($pdo);
        json_response(['success' => true, 'data' => ['transactions' => [], 'pendingCount' => 0, 'candidateBookings' => []]]);
    }
    if ($action === 'run_auto_release') {
        $admin = require_admin($pdo);
        json_response(['success' => true, 'data' => ['released_count' => 0, 'releasedCount' => 0, 'codes' => [], 'hold_minutes' => 15]]);
    }
    json_error('Cơ sở dữ liệu hiện chưa khả dụng cho thao tác này.', 503, 'ERR_DB_UNAVAILABLE');
}

try {
    
    if ($action === 'overview') {
        $today = date('Y-m-d');
        $isStaff = (($actor['role'] ?? '') === 'staff');

        $todayCondition = booking_date_condition_sql('b');
        // Đếm buổi theo lịch; tiền của gói chỉ ghi nhận một lần vào ngày bắt đầu.
        $todayStmt = $pdo->prepare("SELECT COUNT(*) as count,
                                   COALESCE(SUM(CASE WHEN b.booking_date = ? AND b.payment_status IN ('Đã cọc 30%', 'Đã cọc 50%', 'Đã thanh toán đủ', 'Đã thanh toán 100%') THEN b.deposit_amount ELSE 0 END), 0) as today_deposit,
                                   COALESCE(SUM(CASE WHEN b.booking_date = ? THEN b.total_price ELSE 0 END), 0) as today_total
                                   FROM bookings b WHERE {$todayCondition}
                                     AND b.status NOT IN ('Đã hủy') AND b.payment_status != 'Đã hủy'");
        $todayStmt->execute([$today, $today, $today, $today]);
        $todayStats = $todayStmt->fetch();

        $listStmt = $pdo->prepare("SELECT b.*, p.name as pitch_name, p.type_name, p.variant 
                                   FROM bookings b 
                                   JOIN pitches p ON b.pitch_id = p.id 
                                   WHERE {$todayCondition}
                                   ORDER BY b.slot_time ASC");
        $listStmt->execute([$today, $today]);
        $todayBookings = $listStmt->fetchAll();

        foreach ($todayBookings as &$b) {
            $b = admin_map_booking($b);
            $b['packageStartDate'] = $b['booking_date'];
            $b['occurrenceDate'] = $today;
            $b['date'] = $today;
        }
        unset($b);

        $pitchesStmt = $pdo->query("SELECT id, name, type_name, status FROM pitches ORDER BY type ASC, id ASC");
        $pitchRows = $pitchesStmt->fetchAll();
        $totalPitches = count($pitchRows);
        $activePitches = 0;
        $byPitchMap = [];
        foreach ($pitchRows as $pRow) {
            if (($pRow['status'] ?? '') === 'Hoạt động') {
                $activePitches++;
            }
            $byPitchMap[$pRow['id']] = [
                'id'       => $pRow['id'],
                'name'     => $pRow['name'],
                'typeName' => $pRow['type_name'],
                'status'   => $pRow['status'],
                'matches'  => 0,
                'revenue'  => $isStaff ? null : 0
            ];
        }
        $pitchStats = ['total' => $totalPitches, 'active' => $activePitches];

        foreach ($todayBookings as $tb) {
            $pId = $tb['pitchId'] ?? '';
            if (isset($byPitchMap[$pId]) && !in_array($tb['status'] ?? '', ['Đã hủy', 'Khách chưa đến'], true)) {
                $byPitchMap[$pId]['matches']++;
                if (!$isStaff) {
                    $byPitchMap[$pId]['revenue'] += (int)($tb['totalPrice'] ?? 0);
                }
            }
        }

        $weeklySeries = [];
        $start7 = date('Y-m-d', strtotime('-6 days'));
        $dayRevenueMap = [];
        for ($i = 6; $i >= 0; $i--) {
            $dKey = date('Y-m-d', strtotime("-{$i} days"));
            $dayRevenueMap[$dKey] = ['date' => $dKey, 'label' => date('d/m', strtotime($dKey)), 'matches' => 0, 'revenue' => 0];
        }
        try {
            $wStmt = $pdo->prepare("
                SELECT booking_date AS d, COUNT(*) AS matches, COALESCE(SUM(total_price), 0) AS rev
                FROM bookings
                WHERE booking_date BETWEEN ? AND ?
                  AND status NOT IN ('Đã hủy', 'Khách chưa đến')
                  AND payment_status NOT IN ('Đã hủy', 'Đã hoàn cọc 100%')
                GROUP BY booking_date
            ");
            $wStmt->execute([$start7, $today]);
            foreach ($wStmt->fetchAll() as $wr) {
                $dKey = $wr['d'];
                if (isset($dayRevenueMap[$dKey])) {
                    $dayRevenueMap[$dKey]['matches'] += (int)$wr['matches'];
                    $dayRevenueMap[$dKey]['revenue'] += (int)$wr['rev'];
                }
            }
            $wsStmt = $pdo->prepare("
                SELECT DATE(created_at) AS d, COALESCE(SUM(total_amount), 0) AS rev
                FROM service_sales
                WHERE DATE(created_at) BETWEEN ? AND ?
                  AND (booking_code IS NULL OR booking_code = '')
                  AND total_amount > 0
                GROUP BY DATE(created_at)
            ");
            $wsStmt->execute([$start7, $today]);
            foreach ($wsStmt->fetchAll() as $wsr) {
                $dKey = $wsr['d'];
                if (isset($dayRevenueMap[$dKey])) {
                    $dayRevenueMap[$dKey]['revenue'] += (int)$wsr['rev'];
                }
            }
        } catch (Exception $we) {}

        foreach ($dayRevenueMap as $item) {
            if ($isStaff) {
                $item['revenue'] = null;
            }
            $weeklySeries[] = $item;
        }

        if ($isStaff) {
            $todayStats['today_deposit'] = null;
            $todayStats['today_total'] = null;
        }

        json_response([
            'success' => true,
            'data'    => [
                'todayStats'    => $todayStats,
                'todayBookings' => $todayBookings,
                'pitchStats'    => $pitchStats,
                'weeklySeries'  => $weeklySeries,
                'byPitch'       => array_values($byPitchMap)
            ]
        ]);
    }

    if ($action === 'all_bookings') {
        $stmt = $pdo->query("SELECT b.*, p.name as pitch_name, p.type_name, p.variant 
                             FROM bookings b 
                             JOIN pitches p ON b.pitch_id = p.id 
                             ORDER BY b.id DESC LIMIT 200");
        $all = $stmt->fetchAll();
        foreach ($all as &$b) {
            $b = admin_map_booking($b);
        }
        json_response(['success' => true, 'data' => $all]);
    }

    if ($action === 'update_payment') {
        handle_admin_update_payment($pdo, $data, $method, $actor);
    }

    if ($action === 'manage_booking') {
        handle_admin_manage_booking($pdo, $data, $method, $actor);
    }

    if ($action === 'adjust_discount') {
        handle_admin_adjust_discount($pdo, $data, $method, $actor);
        exit;
    }

    if ($action === 'vouchers') {
        handle_admin_vouchers($pdo, $data, $method, $actor);
    }

    if ($action === 'staff_users') {
        handle_admin_staff_users($pdo, $data, $method, $actor);
    }

    if ($action === 'toggle_pitch' && $method === 'POST') {
        $pitchId = sanitize_string($data['pitchId'] ?? $data['pitch_id'] ?? '', 20);
        $status = sanitize_string($data['status'] ?? '', 50);
        $reason = sanitize_string($data['reason'] ?? '', 255);

        if (!in_array($status, ['Hoạt động', 'Bảo trì', 'Ẩn'], true)) {
            json_response(['success' => false, 'message' => 'Trạng thái sân không hợp lệ.'], 400);
        }

        $oldStmt = $pdo->prepare("SELECT status FROM pitches WHERE id = ? LIMIT 1");
        $oldStmt->execute([$pitchId]);
        $oldStatus = (string)($oldStmt->fetchColumn() ?: 'Hoạt động');

        $detail = $status;
        if ($reason !== '') {
            $detail .= " (Lý do: {$reason})";
        }

        // Yêu cầu 1, 2, 3: So sánh trạng thái cũ/mới bằng logAdminChange
        $statusDiff = logAdminChange($pdo, 'PITCH_STATUS', $oldStatus, $detail, $pitchId, 'pitch', $actor);
        if (!$statusDiff['has_change']) {
            json_response([
                'success'     => true,
                'has_changed' => false,
                'message'     => "Không có thay đổi trạng thái cho sân {$pitchId} (trạng thái hiện tại: {$status})."
            ]);
        }

        if ($status === 'Ẩn' || $oldStatus === 'Ẩn') {
            $actor = require_manager_or_admin($pdo);
        }

        $stmt = $pdo->prepare("UPDATE pitches SET status = ? WHERE id = ?");
        $stmt->execute([$status, $pitchId]);

        json_response([
            'success'     => true,
            'has_changed' => true,
            'message'     => "Đã chuyển trạng thái sân {$pitchId} sang: {$status}" . ($reason !== '' ? " (Lý do: {$reason})" : '')
        ]);
    }

    if ($action === 'pending_deposits') {
        require_once __DIR__ . '/admin_finance.php';
        handle_admin_pending_deposits($pdo, $actor);
        exit;
    }

    if ($action === 'shifts') {
        require_once __DIR__ . '/admin_ops.php';
        handle_admin_shifts($pdo, $method, $data, $actor);
        exit;
    }

    if ($action === 'backup_database_now') {
        $adminActor = require_admin($pdo);

        if (!defined('SANBONG_CRON_LIB_ONLY')) {
            define('SANBONG_CRON_LIB_ONLY', true);
        }
        require_once __DIR__ . '/../cron/backup_database.php';

        loadEnv();
        $customBackupDir = trim(getenv('BACKUP_DIR') ?: ($_ENV['BACKUP_DIR'] ?? ''));
        $backupDir = ($customBackupDir !== '' && (is_dir($customBackupDir) || @mkdir($customBackupDir, 0750, true)))
            ? rtrim($customBackupDir, '/\\')
            : __DIR__ . '/../backups';

        if (!is_dir($backupDir)) {
            @mkdir($backupDir, 0750, true);
        }

        $ext = function_exists('gzopen') ? '.sql.gz' : '.sql';
        $filename = 'backup_sanbong_manual_' . date('Ymd_His') . $ext;
        $targetPath = $backupDir . '/' . $filename;

        if (!$pdo) {
            json_error('Không thể kết nối cơ sở dữ liệu để sao lưu.', 500, 'ERR_DB_CONNECT');
        }

        $result = generate_database_dump($pdo, $targetPath);

        if (empty($result['success'])) {
            json_error($result['message'] ?? 'Sao lưu cơ sở dữ liệu thất bại.', 500, 'ERR_BACKUP_FAILED');
        }

        $adminName = $adminActor['username'] ?? 'admin';
        write_audit_log(
            $pdo,
            'DATABASE_BACKUP',
            (string)($result['filename'] ?? $filename),
            null,
            "Quản trị viên {$adminName} (ID: {$adminActor['id']}) đã thực hiện sao lưu thủ công ({$result['total_rows']} dòng, " . round(($result['file_size'] ?? 0) / 1024, 1) . " KB)",
            $adminActor
        );

        json_response([
            'success' => true,
            'message' => 'Sao lưu cơ sở dữ liệu thành công.',
            'data'    => $result
        ]);
        exit;
    }

    require __DIR__ . '/admin_ops.php';
    require __DIR__ . '/admin_finance.php';
    require __DIR__ . '/admin_crm.php';

    json_response(['success' => false, 'message' => 'Hành động quản trị không hợp lệ.'], 400);
} catch (PDOException $e) {
    error_log("[ADMIN API ERROR] " . $e->getMessage());
    json_response(['success' => false, 'message' => 'Lỗi xử lý yêu cầu quản trị.'], 500);
}
