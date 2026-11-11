<?php

defined('SANBONG_ADMIN_ROUTER') or define('SANBONG_ADMIN_ROUTER', true);
require_once __DIR__ . '/security_helper.php';
require_once __DIR__ . '/notification_helper.php';

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
    'update_payment', 'manage_booking', 'toggle_pitch', 'save_pricing',
    'upsert_pitch', 'manage_pitch', 'counter_sale', 'run_auto_release',
    'update_customer_crm', 'create_recurring_schedule', 'cancel_recurring_schedule',
    'skip_recurring_booking', 'assign_waitlist', 'notify_waitlist', 'cancel_waitlist',
    'save_voucher', 'delete_voucher', 'save_golden_hour', 'delete_golden_hour',
    'save_maintenance', 'update_maintenance', 'add_expense', 'delete_expense',
    'test_telegram', 'run_match_reminders', 'run_recurring_cron',
    'moderate_matchmaking', 'backup_database_now'
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

        $todayStmt = $pdo->prepare("SELECT COUNT(*) as count, COALESCE(SUM(deposit_amount), 0) as today_deposit, COALESCE(SUM(total_price), 0) as today_total FROM bookings WHERE booking_date = ? AND status NOT IN ('Đã hủy') AND payment_status != 'Đã hủy'");
        $todayStmt->execute([$today]);
        $todayStats = $todayStmt->fetch();

        $listStmt = $pdo->prepare("SELECT b.*, p.name as pitch_name, p.type_name, p.variant 
                                   FROM bookings b 
                                   JOIN pitches p ON b.pitch_id = p.id 
                                   WHERE b.booking_date = ? 
                                   ORDER BY b.slot_time ASC");
        $listStmt->execute([$today]);
        $todayBookings = $listStmt->fetchAll();

        foreach ($todayBookings as &$b) {
            $b = admin_map_booking($b);
        }

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
        $mgr = require_manager_or_admin($pdo);
        if ($method !== 'POST') {
            json_error('Phương thức không được hỗ trợ.', 405, 'ERR_METHOD_NOT_ALLOWED');
        }
        $code = sanitize_string($data['code'] ?? '', 40);
        $status = sanitize_string($data['status'] ?? '', 50);

        $allowedStatuses = [
            'Chờ duyệt cọc',
            'Đã cọc 30%',
            'Đã thanh toán đủ',
            'Đã thanh toán 100%',
            'Đã hoàn cọc 100%',
            'Bảo lưu cọc 30%',
            'Phạt 50% cọc',
            'Đã hủy',
            'Tịch thu cọc 30%',
            'Chưa cọc (Khách quen)'
        ];
        if (!in_array($status, $allowedStatuses, true)) {
            json_response(['success' => false, 'message' => 'Trạng thái thanh toán không hợp lệ.'], 400);
        }

        $oldStmt = $pdo->prepare("SELECT status, payment_status FROM bookings WHERE code = ? LIMIT 1");
        $oldStmt->execute([$code]);
        $oldRow = $oldStmt->fetch();
        $oldPaymentStatus = $oldRow ? ($oldRow['payment_status'] . ' (' . $oldRow['status'] . ')') : null;

        if ($status === 'Đã hoàn cọc 100%') {
            $stmt = $pdo->prepare("UPDATE bookings SET payment_status = ?, status = 'Đã hủy', remaining_amount = 0, cancel_policy_applied = 'refund_100', refund_amount = GREATEST(paid_amount, deposit_amount) WHERE code = ?");
            $stmt->execute([$status, $code]);
        } elseif ($status === 'Phạt 50% cọc') {
            $stmt = $pdo->prepare("UPDATE bookings SET payment_status = ?, status = 'Đã hủy', remaining_amount = 0, cancel_policy_applied = 'forfeit_50', refund_amount = ROUND(GREATEST(paid_amount, deposit_amount) * 0.5) WHERE code = ?");
            $stmt->execute([$status, $code]);
        } elseif ($status === 'Bảo lưu cọc 30%') {
            $stmt = $pdo->prepare("UPDATE bookings SET payment_status = ?, status = 'Đã hủy', remaining_amount = 0, cancel_policy_applied = 'reserve', refund_amount = 0 WHERE code = ?");
            $stmt->execute([$status, $code]);
        } elseif ($status === 'Đã hủy') {
            $stmt = $pdo->prepare("UPDATE bookings SET payment_status = ?, status = 'Đã hủy', remaining_amount = 0, cancel_policy_applied = COALESCE(cancel_policy_applied, 'admin_reject'), refund_amount = 0 WHERE code = ?");
            $stmt->execute([$status, $code]);
        } elseif ($status === 'Đã cọc 30%') {
            $stmt = $pdo->prepare("UPDATE bookings SET payment_status = 'Đã cọc 30%', status = 'Đã xác nhận', paid_amount = GREATEST(paid_amount, deposit_amount), remaining_amount = GREATEST(0, total_price - GREATEST(paid_amount, deposit_amount)) WHERE code = ?");
            $stmt->execute([$code]);
        } elseif ($status === 'Đã thanh toán 100%' || $status === 'Đã thanh toán đủ') {
            $stmt = $pdo->prepare("UPDATE bookings SET payment_status = ?, status = 'Hoàn thành', paid_amount = total_price, remaining_amount = 0 WHERE code = ?");
            $stmt->execute([$status, $code]);
        } else {
            $stmt = $pdo->prepare("UPDATE bookings SET payment_status = ? WHERE code = ?");
            $stmt->execute([$status, $code]);
        }

        write_audit_log($pdo, 'UPDATE_PAYMENT', $code, $oldPaymentStatus, $status, $mgr);

        json_response([
            'success' => true,
            'message' => "Đã cập nhật trạng thái đơn {$code} thành: {$status}"
        ]);
    }

    if ($action === 'manage_booking' && $method === 'POST') {
        $code = sanitize_string($data['code'] ?? '', 40);
        $subAction = sanitize_string($data['sub_action'] ?? '', 40);
        if (empty($code) || empty($subAction)) {
            json_response(['success' => false, 'message' => 'Thiếu mã đơn hoặc hành động xử lý.'], 400);
        }

        $oldStmt = $pdo->prepare("SELECT * FROM bookings WHERE code = ? LIMIT 1");
        $oldStmt->execute([$code]);
        $oldBooking = $oldStmt->fetch() ?: [];

        if ($subAction === 'overtime') {
            if (empty($oldBooking)) {
                json_error('Không tìm thấy đơn đặt sân cần gia hạn.', 404, 'ERR_BOOKING_NOT_FOUND');
            }
            $minutes = max(15, min(180, (int)($data['minutes'] ?? 30)));
            $fee = max(0, min(10000000, (int)($data['fee'] ?? 0)));
            if ($fee === 0) {
                require_manager_or_admin($pdo);
            } elseif ($fee < 10000) {
                json_error('Phụ phí đá thêm giờ phải tối thiểu 10.000đ (hoặc Quản lý/Admin miễn phí = 0đ).', 400, 'ERR_INVALID_FEE');
            }
            $noteAdd = " [Đá thêm {$minutes}p: +" . number_format($fee, 0, ',', '.') . "đ]";
            $stmt = $pdo->prepare("UPDATE bookings SET total_price = total_price + ?, remaining_amount = remaining_amount + ?, note = CONCAT(IFNULL(note,''), ?) WHERE code = ?");
            $stmt->execute([$fee, $fee, $noteAdd, $code]);

            $oldTotal = (int)($oldBooking['total_price'] ?? 0);
            write_audit_log($pdo, 'ADD_OVERTIME', $code, (string)$oldTotal, ($oldTotal + $fee) . " (+{$minutes}p)", $actor);

            json_response([
                'success' => true,
                'message' => "Đã cộng thêm {$minutes} phút đá thêm giờ.",
                'data'    => [
                    'totalPrice'      => $oldTotal + $fee,
                    'remainingAmount' => max(0, (int)($oldBooking['remaining_amount'] ?? 0) + $fee),
                    'minutes'         => $minutes,
                    'fee'             => $fee
                ]
            ]);
        }

        if ($subAction === 'transfer_pitch') {
            $newPitchId = sanitize_string($data['new_pitch_id'] ?? '', 20);
            $adjustPrice = !array_key_exists('adjust_price', $data) || !empty($data['adjust_price']);
            $reason = sanitize_string($data['reason'] ?? '', 150);
            if (empty($oldBooking)) {
                json_error('Không tìm thấy đơn đặt sân cần chuyển.', 404, 'ERR_BOOKING_NOT_FOUND');
            }
            if ($newPitchId === '' || $newPitchId === ($oldBooking['pitch_id'] ?? '')) {
                json_error('Vui lòng chọn sân đích khác với sân hiện tại.', 400, 'ERR_INVALID_TARGET_PITCH');
            }

            try {
                $pdo->beginTransaction();

                $lockOldStmt = $pdo->prepare("SELECT * FROM bookings WHERE code = ? LIMIT 1 FOR UPDATE");
                $lockOldStmt->execute([$code]);
                $oldBooking = $lockOldStmt->fetch();
                if (!$oldBooking) {
                    $pdo->rollBack();
                    json_error('Không tìm thấy đơn đặt sân cần chuyển.', 404, 'ERR_BOOKING_NOT_FOUND');
                }

                $npStmt = $pdo->prepare("SELECT id, name, type, base_price, peak_price, weekend_price, status FROM pitches WHERE id = ? LIMIT 1");
                $npStmt->execute([$newPitchId]);
                $targetPitch = $npStmt->fetch();
                if (!$targetPitch || in_array($targetPitch['status'], ['Bảo trì', 'Ẩn'], true)) {
                    $pdo->rollBack();
                    json_error('Sân chuyển đến không tồn tại hoặc đang bảo trì/tạm ẩn.', 400, 'ERR_PITCH_UNAVAILABLE');
                }

                $busyStmt = $pdo->prepare("
                    SELECT code FROM bookings
                    WHERE pitch_id = ? AND booking_date = ? AND slot_id = ? AND code != ?
                      AND status NOT IN ('Đã hủy', 'Khách chưa đến')
                      AND payment_status NOT IN ('Đã hủy', 'Tịch thu cọc 30%', 'Đã hoàn cọc 100%', 'Bảo lưu cọc 30%', 'Phạt 50% cọc')
                    LIMIT 1 FOR UPDATE
                ");
                $busyStmt->execute([$newPitchId, $oldBooking['booking_date'], $oldBooking['slot_id'], $code]);
                if ($busyCode = $busyStmt->fetchColumn()) {
                    $pdo->rollBack();
                    json_error("Sân {$targetPitch['name']} khung giờ {$oldBooking['slot_time']} đã có đơn #{$busyCode}!", 409, 'ERR_DOUBLE_BOOKING');
                }
                if ($mRow = find_active_maintenance_for_slot($pdo, $newPitchId, (string)$oldBooking['booking_date'], (string)$oldBooking['slot_time'])) {
                    $pdo->rollBack();
                    json_error("Sân {$targetPitch['name']} đang bảo trì khung giờ này: {$mRow['reason']}.", 400, 'ERR_PITCH_MAINTENANCE');
                }

                $diffPrice = 0;
                $oldTotal = max(0, (int)($oldBooking['total_price'] ?? 0));
                $oldOriginal = max($oldTotal, (int)($oldBooking['original_price'] ?? $oldTotal));
                if ($adjustPrice) {
                    $opStmt = $pdo->prepare("SELECT id, name, type, base_price, peak_price, weekend_price FROM pitches WHERE id = ? LIMIT 1");
                    $opStmt->execute([$oldBooking['pitch_id']]);
                    $oldPitch = $opStmt->fetch();

                    $slStmt = $pdo->prepare("SELECT id, slot_time, is_peak, duration FROM time_slots WHERE id = ? LIMIT 1");
                    $slStmt->execute([$oldBooking['slot_id']]);
                    $slotRow = $slStmt->fetch();

                    if ($oldPitch && $slotRow) {
                        $bookingTs = strtotime((string)$oldBooking['booking_date']) ?: time();
                        $isPeak = !empty($slotRow['is_peak']);
                        $dayOfWeek = (int)date('w', $bookingTs);
                        $isWeekend = ($dayOfWeek === 0 || $dayOfWeek === 6);
                        $ghDay = (int)date('N', $bookingTs);
                        $duration = (float)($slotRow['duration'] ?? 1.0) ?: 1.0;
                        $weeksCount = max(1, (int)($oldBooking['weeks_count'] ?? 1));
                        $pkgRate = ($weeksCount >= 12) ? 0.15 : (($weeksCount >= 8) ? 0.10 : (($weeksCount >= 4) ? 0.05 : 0.0));

                        $computeMatchPrice = static function (array $pRow) use ($pdo, $isPeak, $isWeekend, $duration, $weeksCount, $pkgRate, $ghDay, $slotRow) {
                            $wkPrice = (int)($pRow['weekend_price'] ?? 0);
                            if ($isWeekend && $wkPrice > 0) {
                                $unitBase = $isPeak ? max((int)$pRow['peak_price'], $wkPrice) : $wkPrice;
                            } else {
                                $unitBase = $isPeak ? (int)$pRow['peak_price'] : (int)$pRow['base_price'];
                            }
                            $raw = (int)round($unitBase * $duration * $weeksCount * (1 - $pkgRate));
                            $gh = resolve_golden_hour_adjustment($pdo, (int)$pRow['type'], $ghDay, (string)$slotRow['id'], $raw);
                            return (int)$gh['adjustedPitchPrice'];
                        };

                        $oldPitchPrice = $computeMatchPrice($oldPitch);
                        $newPitchPrice = $computeMatchPrice($targetPitch);
                        $diffPrice = $newPitchPrice - $oldPitchPrice;
                    }
                }

                $newTotal = max(0, $oldTotal + $diffPrice);
                $newOriginal = max(0, $oldOriginal + $diffPrice);
                $paidBase = max(0, (int)($oldBooking['paid_amount'] ?? 0));
                if ($paidBase === 0 && ($oldBooking['payment_status'] ?? '') === 'Đã cọc 30%') {
                    $paidBase = max(0, (int)($oldBooking['deposit_amount'] ?? 0));
                } elseif ($paidBase === 0 && in_array($oldBooking['payment_status'] ?? '', ['Đã thanh toán đủ', 'Đã thanh toán 100%'], true)) {
                    $paidBase = $oldTotal;
                }
                $newRemaining = max(0, $newTotal - $paidBase);

                $diffLabel = ($adjustPrice && $diffPrice !== 0) ? (' ' . ($diffPrice > 0 ? '+' : '') . number_format($diffPrice, 0, ',', '.') . 'đ') : ($adjustPrice ? '' : ' Giữ nguyên giá');
                $noteAdd = " [Đổi sang sân {$targetPitch['name']} ({$newPitchId}){$diffLabel}" . ($reason ? ": {$reason}" : "") . "]";

                $stmt = $pdo->prepare("UPDATE bookings SET pitch_id = ?, original_price = ?, total_price = ?, remaining_amount = ?, note = CONCAT(IFNULL(note,''), ?) WHERE code = ?");
                $stmt->execute([$newPitchId, $newOriginal, $newTotal, $newRemaining, $noteAdd, $code]);

                $pdo->commit();
            } catch (Exception $trEx) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                throw $trEx;
            }

            write_audit_log(
                $pdo,
                'TRANSFER_PITCH',
                $code,
                ($oldBooking['pitch_id'] ?? '') . " (Tổng {$oldTotal}đ)",
                "{$newPitchId} (Tổng {$newTotal}đ, chênh lệch {$diffPrice}đ)" . ($reason ? " ({$reason})" : ''),
                $actor
            );

            send_customer_notification($pdo, 'transfer_pitch', [
                'booking_id'    => (int)$oldBooking['id'],
                'booking_code'  => $code,
                'code'          => $code,
                'customer_name' => (string)($oldBooking['customer_name'] ?? ''),
                'phone'         => (string)($oldBooking['phone'] ?? ''),
                'pitch_name'    => (string)$targetPitch['name'],
                'date'          => date('d/m/Y', strtotime((string)$oldBooking['booking_date'])),
                'slot_time'     => (string)($oldBooking['slot_time'] ?? '')
            ]);

            if (!empty($oldBooking['pitch_id']) && $newPitchId !== $oldBooking['pitch_id']) {
                trigger_waitlist_notification(
                    $pdo,
                    (string)$oldBooking['pitch_id'],
                    (string)$oldBooking['booking_date'],
                    (string)$oldBooking['slot_id'],
                    (string)($oldBooking['slot_time'] ?? ''),
                    $actor,
                    $code
                );
            }

            json_response([
                'success' => true,
                'message' => "Đã chuyển đơn {$code} sang sân {$targetPitch['name']} ({$newPitchId}).",
                'data'    => [
                    'pitchId'         => $newPitchId,
                    'pitchName'       => $targetPitch['name'],
                    'diffPrice'       => $diffPrice,
                    'originalPrice'   => $newOriginal,
                    'totalPrice'      => $newTotal,
                    'remainingAmount' => $newRemaining
                ]
            ]);
        }

        if ($subAction === 'add_service') {
            if (empty($oldBooking)) {
                json_error('Không tìm thấy đơn đặt sân.', 404, 'ERR_BOOKING_NOT_FOUND');
            }
            $srvId = sanitize_string($data['service_id'] ?? '', 30);
            $srvNameFallback = sanitize_string($data['service_name'] ?? '', 100);
            $qty = max(1, min(50, (int)($data['quantity'] ?? 1)));

            try {
                $pdo->beginTransaction();

                $lockStmt = $pdo->prepare("SELECT id, code, services_json, total_price, remaining_amount FROM bookings WHERE code = ? LIMIT 1 FOR UPDATE");
                $lockStmt->execute([$code]);
                $lockedBooking = $lockStmt->fetch();
                if (!$lockedBooking) {
                    $pdo->rollBack();
                    json_error('Không tìm thấy đơn đặt sân.', 404, 'ERR_BOOKING_NOT_FOUND');
                }

                if ($srvId !== '') {
                    $srvStmt = $pdo->prepare("SELECT id, name, price, unit, stock_qty, track_inventory FROM extra_services WHERE id = ? AND is_active = 1 LIMIT 1 FOR UPDATE");
                    $srvStmt->execute([$srvId]);
                } else {
                    $srvStmt = $pdo->prepare("SELECT id, name, price, unit, stock_qty, track_inventory FROM extra_services WHERE name = ? AND is_active = 1 LIMIT 1 FOR UPDATE");
                    $srvStmt->execute([$srvNameFallback]);
                }
                $srvRow = $srvStmt->fetch();
                if (!$srvRow) {
                    $pdo->rollBack();
                    json_error('Dịch vụ không tồn tại hoặc đã ngừng kinh doanh.', 400, 'ERR_INVALID_SERVICE');
                }

                if ((int)($srvRow['track_inventory'] ?? 1) === 1 && (int)($srvRow['stock_qty'] ?? 0) < $qty) {
                    $pdo->rollBack();
                    json_error("Kho {$srvRow['name']} chỉ còn {$srvRow['stock_qty']} {$srvRow['unit']}, không đủ xuất {$qty}!", 400, 'ERR_INSUFFICIENT_STOCK');
                }

                $unitPrice = max(0, (int)$srvRow['price']);
                $addedCost = $unitPrice * $qty;

                $existingServices = !empty($lockedBooking['services_json']) ? json_decode((string)$lockedBooking['services_json'], true) : [];
                if (!is_array($existingServices)) {
                    $existingServices = [];
                }
                $merged = false;
                foreach ($existingServices as &$exItem) {
                    if (is_array($exItem) && ($exItem['id'] ?? '') === $srvRow['id']) {
                        $exQty = max(0, (int)($exItem['quantity'] ?? 0)) + $qty;
                        $exItem['name'] = $srvRow['name'];
                        $exItem['price'] = $unitPrice;
                        $exItem['unit'] = $srvRow['unit'];
                        $exItem['quantity'] = $exQty;
                        $exItem['lineTotal'] = $exQty * $unitPrice;
                        $exItem['total'] = $exQty * $unitPrice;
                        $merged = true;
                        break;
                    }
                }
                unset($exItem);
                if (!$merged) {
                    $existingServices[] = [
                        'id'        => $srvRow['id'],
                        'name'      => $srvRow['name'],
                        'price'     => $unitPrice,
                        'quantity'  => $qty,
                        'unit'      => $srvRow['unit'],
                        'lineTotal' => $addedCost,
                        'total'     => $addedCost
                    ];
                }

                $servicesJson = json_encode($existingServices, JSON_UNESCAPED_UNICODE);
                $noteAdd = " [Gọi thêm: {$srvRow['name']} x{$qty} (+" . number_format($addedCost, 0, ',', '.') . "đ)]";
                $updStmt = $pdo->prepare("UPDATE bookings SET services_json = ?, total_price = total_price + ?, remaining_amount = remaining_amount + ?, note = CONCAT(IFNULL(note,''), ?) WHERE code = ?");
                $updStmt->execute([$servicesJson, $addedCost, $addedCost, $noteAdd, $code]);

                deduct_service_inventory($pdo, $srvRow['id'], $qty, $code, $unitPrice, 'Gọi thêm vào đơn sân', "Gọi thêm cho đơn #{$code}", $actor['id'] ?? null);

                $pdo->commit();
            } catch (Exception $srvEx) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                throw $srvEx;
            }

            write_audit_log($pdo, 'ADD_SERVICE', $code, null, "{$srvRow['name']} x{$qty} (+{$addedCost}đ)", $actor);

            json_response([
                'success' => true,
                'message' => "Đã thêm {$srvRow['name']} x{$qty} vào đơn {$code}.",
                'data'    => [
                    'services'        => $existingServices,
                    'addedCost'       => $addedCost,
                    'totalPrice'      => (int)$lockedBooking['total_price'] + $addedCost,
                    'remainingAmount' => (int)$lockedBooking['remaining_amount'] + $addedCost
                ]
            ]);
        }

        if ($subAction === 'early_cancel') {
            $requestedPolicy = sanitize_string($data['policy'] ?? 'auto', 30);
            if ($requestedPolicy !== 'auto' && $requestedPolicy !== '') {
                require_manager_or_admin($pdo);
            }
            $rawReason = trim((string)($data['reason'] ?? ''));
            $isPaidOrDeposited = !empty($oldBooking) && (
                (int)($oldBooking['deposit_amount'] ?? 0) > 0 ||
                (int)($oldBooking['paid_amount'] ?? 0) > 0 ||
                in_array($oldBooking['payment_status'] ?? '', ['Đã cọc 30%', 'Đã thanh toán đủ', 'Đã thanh toán 100%'], true)
            );
            if ($isPaidOrDeposited && $rawReason === '') {
                json_error('Đơn đã thu tiền/đặt cọc bắt buộc phải nhập lý do hủy!', 400, 'ERR_CANCEL_REASON_REQUIRED');
            }
            $reason = $rawReason !== '' ? sanitize_string($rawReason, 150) : 'Hủy lịch trước thời hạn';
            $oldStateStr = ($oldBooking['status'] ?? '') . ' (' . ($oldBooking['payment_status'] ?? '') . ')';

            $sysSettings = get_system_settings_map($pdo);
            $eval = !empty($oldBooking)
                ? evaluate_cancellation_policy($oldBooking, $sysSettings)
                : ['policy' => 'refund_100', 'payment_status' => 'Đã hoàn cọc 100%', 'refund_amount' => 0, 'paid_base' => 0, 'hours_before_match' => 0.0];
            $policyRecommended = $eval['policy'];
            $hoursBeforeMatch  = $eval['hours_before_match'];
            $paidBase          = $eval['paid_base'];

            $targetStatus = 'Đã hủy';
            if ($requestedPolicy === '' || $requestedPolicy === 'auto') {
                $appliedPolicy = $eval['policy'];
                $payStatus     = $eval['payment_status'];
                $refundAmount  = $eval['refund_amount'];
            } elseif ($requestedPolicy === 'noshow_forfeit') {
                $targetStatus  = 'Khách chưa đến';
                $appliedPolicy = 'noshow_forfeit';
                $payStatus     = 'Tịch thu cọc 30%';
                $refundAmount  = 0;
            } elseif ($requestedPolicy === 'refund_100') {
                $appliedPolicy = 'refund_100';
                $payStatus     = 'Đã hoàn cọc 100%';
                $refundAmount  = $paidBase;
            } elseif ($requestedPolicy === 'reserve') {
                $appliedPolicy = 'reserve';
                $payStatus     = 'Bảo lưu cọc 30%';
                $refundAmount  = 0;
            } elseif ($requestedPolicy === 'forfeit_50') {
                $appliedPolicy = 'forfeit_50';
                $payStatus     = 'Phạt 50% cọc';
                $refundAmount  = (int)round($paidBase * 0.5);
            } elseif ($requestedPolicy === 'forfeit_100') {
                $appliedPolicy = 'forfeit_100';
                $payStatus     = 'Tịch thu cọc 30%';
                $refundAmount  = 0;
            } else {
                $appliedPolicy = $eval['policy'];
                $payStatus     = $eval['payment_status'];
                $refundAmount  = $eval['refund_amount'];
            }

            $noteAdd = ($targetStatus === 'Khách chưa đến')
                ? " [Quá 15p khách chưa đến - Đã nhả sân trống: {$reason}]"
                : " [Hủy trước hạn ({$appliedPolicy}, hoàn " . number_format($refundAmount) . "đ) - {$payStatus}: {$reason}]";

            $stmt = $pdo->prepare("UPDATE bookings SET status = ?, payment_status = ?, remaining_amount = 0, cancel_policy_applied = ?, refund_amount = ?, note = CONCAT(IFNULL(note,''), ?) WHERE code = ?");
            $stmt->execute([$targetStatus, $payStatus, $appliedPolicy, $refundAmount, $noteAdd, $code]);

            write_audit_log(
                $pdo,
                'CANCEL_BOOKING',
                $code,
                $oldStateStr,
                "{$targetStatus} ({$payStatus}) | Chính sách: {$appliedPolicy} (Đề xuất: {$policyRecommended}, còn {$hoursBeforeMatch}h) | Hoàn: " . number_format($refundAmount) . "đ | Lý do: {$reason}",
                $actor
            );

            if (!empty($oldBooking)) {
                $pNameStmt = $pdo->prepare("SELECT name FROM pitches WHERE id = ? LIMIT 1");
                $pNameStmt->execute([$oldBooking['pitch_id']]);
                $cancelPitchName = (string)($pNameStmt->fetchColumn() ?: $oldBooking['pitch_id']);

                $tgMsg = "⚠️ <b>HỦY CA / NHẢ SÂN TỪ QUẦY</b>\n"
                       . "• Mã vé: <code>" . tg_escape($code) . "</code>\n"
                       . "• Khách: <b>" . tg_escape($oldBooking['customer_name'] ?? '') . "</b> (" . tg_escape($oldBooking['phone'] ?? '') . ")\n"
                       . "• Sân: <b>" . tg_escape($cancelPitchName) . "</b> ngày <b>" . date('d/m/Y', strtotime((string)$oldBooking['booking_date'])) . "</b> (" . tg_escape($oldBooking['slot_time'] ?? '') . ")\n"
                       . "• Kết quả: <b>" . tg_escape($targetStatus) . " (" . tg_escape($payStatus) . ")</b> | Hoàn: " . number_format($refundAmount) . " đ\n"
                       . "• Lý do: <i>" . tg_escape($reason) . "</i>";
                send_telegram_notification($tgMsg, 'cancel', $pdo);

                send_customer_notification($pdo, 'cancel_booking', [
                    'booking_id'    => (int)$oldBooking['id'],
                    'booking_code'  => $code,
                    'code'          => $code,
                    'customer_name' => (string)$oldBooking['customer_name'],
                    'phone'         => (string)$oldBooking['phone'],
                    'pitch_name'    => $cancelPitchName,
                    'date'          => date('d/m/Y', strtotime((string)$oldBooking['booking_date'])),
                    'slot_time'     => (string)$oldBooking['slot_time'],
                    'reason'        => $reason
                ]);

                trigger_waitlist_notification(
                    $pdo,
                    (string)$oldBooking['pitch_id'],
                    (string)$oldBooking['booking_date'],
                    (string)$oldBooking['slot_id'],
                    (string)($oldBooking['slot_time'] ?? ''),
                    $actor,
                    $code
                );
            }

            json_response([
                'success' => true,
                'message' => ($targetStatus === 'Khách chưa đến')
                    ? "Đã chuyển đơn {$code} sang trạng thái Khách chưa đến ({$payStatus})."
                    : "Đã hủy đơn {$code} ({$payStatus}).",
                'data' => [
                    'code'                => $code,
                    'status'              => $targetStatus,
                    'paymentStatus'       => $payStatus,
                    'cancelPolicyApplied' => $appliedPolicy,
                    'policyRecommended'   => $policyRecommended,
                    'hoursBeforeMatch'    => $hoursBeforeMatch,
                    'refundAmount'        => $refundAmount
                ]
            ]);
        }

        if ($subAction === 'pay_remaining') {
            $payMethod = sanitize_string($data['pay_method'] ?? 'Tiền mặt tại quầy', 60);
            $noteAdd = " [Đã tất toán 100% qua {$payMethod}]";
            $stmt = $pdo->prepare("UPDATE bookings SET status = 'Hoàn thành', payment_status = 'Đã thanh toán 100%', paid_amount = total_price, remaining_amount = 0, note = CONCAT(IFNULL(note,''), ?) WHERE code = ?");
            $stmt->execute([$noteAdd, $code]);

            write_audit_log($pdo, 'COLLECT_PAYMENT', $code, "Còn nợ: " . ($oldBooking['remaining_amount'] ?? 0) . "đ", "Đã thu đủ 100% qua {$payMethod}", $actor);

            json_response(['success' => true, 'message' => "Đã hoàn tất thu tiền 100% cho đơn {$code}."]);
        }

        json_response(['success' => false, 'message' => 'Hành động con không hợp lệ.'], 400);
    }

    if ($action === 'vouchers') {
        if ($method === 'GET') {
            $stmt = $pdo->query("SELECT code, description, discount_type AS type, discount_type, discount_value AS value, discount_value, min_order AS minOrder, min_order, max_usage, used_count, valid_from, valid_to, pitch_type_limit, is_active FROM vouchers ORDER BY is_active DESC, code ASC");
            json_response(['success' => true, 'data' => $stmt->fetchAll()]);
        }
        if ($method === 'POST') {
            $admin = require_admin($pdo);
            $subAction = sanitize_string($data['sub_action'] ?? 'save', 20);
            $vCode = strtoupper(sanitize_string($data['code'] ?? '', 30));
            if (empty($vCode)) {
                json_response(['success' => false, 'message' => 'Mã voucher không được để trống.'], 400);
            }
            if ($subAction === 'delete') {
                $stmt = $pdo->prepare("DELETE FROM vouchers WHERE code = ?");
                $stmt->execute([$vCode]);
                write_audit_log($pdo, 'VOUCHER_DELETE', $vCode, null, "Xóa voucher {$vCode}", $admin);
                json_response(['success' => true, 'message' => "Đã xóa mã voucher {$vCode}."]);
            }
            if ($subAction === 'toggle') {
                $stmt = $pdo->prepare("UPDATE vouchers SET is_active = NOT is_active WHERE code = ?");
                $stmt->execute([$vCode]);
                write_audit_log($pdo, 'VOUCHER_TOGGLE', $vCode, null, "Bật/tắt voucher {$vCode}", $admin);
                json_response(['success' => true, 'message' => "Đã cập nhật trạng thái mã voucher {$vCode}."]);
            }
            $desc = sanitize_string($data['description'] ?? "Ưu đãi mã {$vCode}", 200);
            $type = (($data['type'] ?? $data['discount_type'] ?? 'percent') === 'fixed') ? 'fixed' : 'percent';
            $val = max(1, (int)($data['value'] ?? $data['discount_value'] ?? 10));
            if ($type === 'percent') {
                $val = min(100, $val);
            }
            $minOrder = max(0, (int)($data['minOrder'] ?? $data['min_order'] ?? 0));
            $maxUsage = max(0, (int)($data['max_usage'] ?? $data['maxUsage'] ?? 100));
            $validFrom = !empty($data['valid_from']) ? sanitize_string($data['valid_from'], 15) : (!empty($data['validFrom']) ? sanitize_string($data['validFrom'], 15) : null);
            $validTo = !empty($data['valid_to']) ? sanitize_string($data['valid_to'], 15) : (!empty($data['validTo']) ? sanitize_string($data['validTo'], 15) : null);
            $rawPitchLimit = (int)($data['pitch_type_limit'] ?? $data['pitchTypeLimit'] ?? 0);
            $pitchTypeLimit = in_array($rawPitchLimit, [5, 7, 11], true) ? $rawPitchLimit : null;
            $stmt = $pdo->prepare("INSERT INTO vouchers (code, description, discount_type, discount_value, min_order, max_usage, valid_from, valid_to, pitch_type_limit, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE description = VALUES(description), discount_type = VALUES(discount_type), discount_value = VALUES(discount_value), min_order = VALUES(min_order), max_usage = VALUES(max_usage), valid_from = VALUES(valid_from), valid_to = VALUES(valid_to), pitch_type_limit = VALUES(pitch_type_limit), is_active = 1");
            $stmt->execute([$vCode, $desc, $type, $val, $minOrder, $maxUsage, $validFrom, $validTo, $pitchTypeLimit]);

            $maxPerUser = max(0, (int)($data['max_per_user'] ?? $data['maxPerUser'] ?? 0));
            $rawReqTier = strtolower(trim(sanitize_string($data['required_tier'] ?? $data['requiredTier'] ?? '', 20)));
            $requiredTier = in_array($rawReqTier, ['standard', 'bronze', 'silver', 'gold', 'diamond'], true) ? $rawReqTier : null;
            $hasReqTier = db_table_has_column($pdo, 'vouchers', 'required_tier');
            $hasMaxUser = db_table_has_column($pdo, 'vouchers', 'max_per_user');
            if ($hasReqTier || $hasMaxUser) {
                $extraUpdates = [];
                $extraParams = [];
                if ($hasReqTier) {
                    $extraUpdates[] = "required_tier = ?";
                    $extraParams[] = $requiredTier;
                }
                if ($hasMaxUser) {
                    $extraUpdates[] = "max_per_user = ?";
                    $extraParams[] = $maxPerUser;
                }
                $extraParams[] = $vCode;
                try {
                    $updExt = $pdo->prepare("UPDATE vouchers SET " . implode(', ', $extraUpdates) . " WHERE code = ?");
                    $updExt->execute($extraParams);
                } catch (Throwable $ve) {
                    error_log("[VOUCHER EXTRA UPDATE WARN] " . $ve->getMessage());
                }
            }

            write_audit_log($pdo, 'VOUCHER_SAVE', $vCode, null, "Lưu voucher {$vCode}: {$val} ({$type}), Max: {$maxUsage}, Sân: " . ($pitchTypeLimit ?: 'Tất cả'), $admin);
            json_response(['success' => true, 'message' => "Đã lưu mã voucher {$vCode}."]);
        }
    }

    if ($action === 'staff_users') {
        $admin = require_admin($pdo);

        if ($method === 'GET') {
            $stmt = $pdo->query("SELECT id, username, email, phone, full_name, role, status, created_at FROM users WHERE role IN ('staff', 'manager') ORDER BY FIELD(role, 'manager', 'staff'), id DESC");
            json_response([
                'success' => true,
                'data'    => $stmt->fetchAll()
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
                    json_error('Vai trò chỉ được phép là Nhân viên (staff) hoặc Quản lý sân (manager).', 400, 'ERR_INVALID_ROLE');
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

                $email = strtolower($username) . '@sanbongpro.vn';

                $checkStmt = $pdo->prepare("SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1");
                $checkStmt->execute([$username, $email]);
                if ($checkStmt->fetch()) {
                    json_response([
                        'success'  => false,
                        'message'  => 'Tên đăng nhập hoặc email này đã tồn tại trên hệ thống.',
                        'ref_code' => 'ERR_USER_EXISTS'
                    ], 409);
                }

                $passwordHash = password_hash($password, PASSWORD_ARGON2ID, [
                    'memory_cost' => 65536,
                    'time_cost'   => 4,
                    'threads'     => 1
                ]);

                $insStmt = $pdo->prepare("INSERT INTO users (username, email, phone, full_name, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?, 'active')");
                $insStmt->execute([$username, $email, $phone, $fullName, $passwordHash, $role]);
                $newId = (int)$pdo->lastInsertId();

                write_audit_log($pdo, 'STAFF_CREATE', 'USER-' . $newId, null, "Tạo tài khoản {$username} (role: {$role})", $admin);

                json_response([
                    'success' => true,
                    'message' => "Đã tạo tài khoản {$username} ({$role}) thành công!",
                    'data'    => [
                        'id'         => $newId,
                        'username'   => $username,
                        'email'      => $email,
                        'phone'      => $phone,
                        'full_name'  => $fullName,
                        'role'       => $role,
                        'status'     => 'active',
                        'created_at' => date('Y-m-d H:i:s')
                    ]
                ], 201);
            }

            if ($subAction === 'update_role') {
                $staffId = (int)($data['id'] ?? 0);
                $newRole = sanitize_string($data['role'] ?? '', 20);
                if ($staffId <= 0) {
                    json_error('ID nhân viên không hợp lệ.', 400, 'ERR_INVALID_ID');
                }
                if (!in_array($newRole, ['staff', 'manager'], true)) {
                    json_error('Vai trò chỉ được phép chuyển giữa staff và manager.', 400, 'ERR_INVALID_ROLE');
                }

                $findStmt = $pdo->prepare("SELECT id, username, role FROM users WHERE id = ? LIMIT 1");
                $findStmt->execute([$staffId]);
                $targetUser = $findStmt->fetch();
                if (!$targetUser) {
                    json_error('Không tìm thấy tài khoản tương ứng.', 404, 'ERR_NOT_FOUND');
                }
                if (!in_array($targetUser['role'] ?? '', ['staff', 'manager'], true)) {
                    json_error('Không được phép thay đổi vai trò của tài khoản Quản trị viên hoặc Khách hàng!', 403, 'ERR_FORBIDDEN');
                }

                $oldRole = $targetUser['role'];
                $updStmt = $pdo->prepare("UPDATE users SET role = ? WHERE id = ? AND role IN ('staff', 'manager')");
                $updStmt->execute([$newRole, $staffId]);

                write_audit_log($pdo, 'STAFF_ROLE_CHANGE', 'USER-' . $staffId, "{$targetUser['username']}: {$oldRole}", "{$targetUser['username']}: {$newRole}", $admin);

                json_response([
                    'success' => true,
                    'message' => "Đã cập nhật vai trò tài khoản {$targetUser['username']} thành: {$newRole}",
                    'data'    => [
                        'id'   => $staffId,
                        'role' => $newRole
                    ]
                ]);
            }

            if ($subAction === 'toggle_status') {
                $staffId = (int)($data['id'] ?? 0);
                if ($staffId <= 0) {
                    json_error('ID nhân viên không hợp lệ.', 400, 'ERR_INVALID_ID');
                }

                $findStmt = $pdo->prepare("SELECT id, username, role, status FROM users WHERE id = ? AND role IN ('staff', 'manager') LIMIT 1");
                $findStmt->execute([$staffId]);
                $staffUser = $findStmt->fetch();
                if (!$staffUser) {
                    json_error('Không tìm thấy tài khoản nhân viên/quản lý tương ứng.', 404, 'ERR_NOT_FOUND');
                }

                $newStatus = (($staffUser['status'] ?? 'active') === 'locked') ? 'active' : 'locked';
                $updStmt = $pdo->prepare("UPDATE users SET status = ? WHERE id = ? AND role IN ('staff', 'manager')");
                $updStmt->execute([$newStatus, $staffId]);

                write_audit_log($pdo, 'STAFF_STATUS_CHANGE', 'USER-' . $staffId, $staffUser['status'], $newStatus . " ({$staffUser['username']})", $admin);

                json_response([
                    'success' => true,
                    'message' => $newStatus === 'locked'
                        ? "Đã khóa tài khoản {$staffUser['username']}."
                        : "Đã mở khóa tài khoản {$staffUser['username']}.",
                    'data'    => [
                        'id'     => $staffId,
                        'status' => $newStatus
                    ]
                ]);
            }

            if ($subAction === 'reset_password') {
                $staffId = (int)($data['id'] ?? 0);
                $password = (string)($data['password'] ?? '');
                if ($staffId <= 0) {
                    json_error('ID nhân viên không hợp lệ.', 400, 'ERR_INVALID_ID');
                }
                if (strlen($password) < 6) {
                    json_error('Mật khẩu mới phải có tối thiểu 6 ký tự.', 400, 'ERR_WEAK_PASSWORD');
                }

                $findStmt = $pdo->prepare("SELECT id, username FROM users WHERE id = ? AND role IN ('staff', 'manager') LIMIT 1");
                $findStmt->execute([$staffId]);
                $staffUser = $findStmt->fetch();
                if (!$staffUser) {
                    json_error('Không tìm thấy tài khoản nhân viên/quản lý tương ứng.', 404, 'ERR_NOT_FOUND');
                }

                $passwordHash = password_hash($password, PASSWORD_ARGON2ID, [
                    'memory_cost' => 65536,
                    'time_cost'   => 4,
                    'threads'     => 1
                ]);

                $updStmt = $pdo->prepare("UPDATE users SET password_hash = ?, failed_attempts = 0, lock_until = NULL WHERE id = ? AND role IN ('staff', 'manager')");
                $updStmt->execute([$passwordHash, $staffId]);

                write_audit_log($pdo, 'STAFF_RESET_PASSWORD', 'USER-' . $staffId, null, "Đặt lại mật khẩu cho {$staffUser['username']}", $admin);

                json_response([
                    'success' => true,
                    'message' => "Đã đặt lại mật khẩu cho {$staffUser['username']} thành công!"
                ]);
            }

            json_error('Hành động quản lý nhân viên không hợp lệ.', 400, 'ERR_INVALID_ACTION');
        }
    }

    if ($action === 'toggle_pitch' && $method === 'POST') {
        $pitchId = sanitize_string($data['pitchId'] ?? $data['pitch_id'] ?? '', 20);
        $status = sanitize_string($data['status'] ?? '', 50);

        if (!in_array($status, ['Hoạt động', 'Bảo trì', 'Ẩn'], true)) {
            json_response(['success' => false, 'message' => 'Trạng thái sân không hợp lệ.'], 400);
        }

        $oldStmt = $pdo->prepare("SELECT status FROM pitches WHERE id = ? LIMIT 1");
        $oldStmt->execute([$pitchId]);
        $oldStatus = (string)($oldStmt->fetchColumn() ?: 'Hoạt động');

        if ($status === 'Ẩn' || $oldStatus === 'Ẩn') {
            $actor = require_manager_or_admin($pdo);
        }

        $stmt = $pdo->prepare("UPDATE pitches SET status = ? WHERE id = ?");
        $stmt->execute([$status, $pitchId]);

        write_audit_log($pdo, 'PITCH_STATUS', $pitchId, $oldStatus, $status, $actor);

        json_response([
            'success' => true,
            'message' => "Đã chuyển trạng thái sân {$pitchId} sang: {$status}"
        ]);
    }


    require __DIR__ . '/admin_ops.php';
    require __DIR__ . '/admin_finance.php';
    require __DIR__ . '/admin_crm.php';

    json_response(['success' => false, 'message' => 'Hành động quản trị không hợp lệ.'], 400);
} catch (PDOException $e) {
    error_log("[ADMIN API ERROR] " . $e->getMessage());
    json_response(['success' => false, 'message' => 'Lỗi xử lý yêu cầu quản trị.'], 500);
}
