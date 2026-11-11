<?php

require_once __DIR__ . '/security_helper.php';

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

function admin_map_booking(array $b): array {
    $services = !empty($b['services_json']) ? json_decode($b['services_json'], true) : ($b['services'] ?? []);
    if (!is_array($services)) {
        $services = [];
    }
    unset($b['services_json']);
    $b['services']        = $services;
    $b['customerName']    = $b['customer_name'] ?? $b['customerName'] ?? '';
    $b['pitchId']         = $b['pitch_id'] ?? $b['pitchId'] ?? '';
    $b['pitchName']       = $b['pitch_name'] ?? $b['pitchName'] ?? '';
    $b['typeName']        = $b['type_name'] ?? $b['typeName'] ?? '';
    $b['date']            = $b['booking_date'] ?? $b['date'] ?? '';
    $b['slotId']          = $b['slot_id'] ?? $b['slotId'] ?? '';
    $b['slotTime']        = $b['slot_time'] ?? $b['slotTime'] ?? '';
    $b['voucherCode']     = $b['voucher_code'] ?? $b['voucherCode'] ?? null;
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
    $b['expiresAt']           = $b['expires_at'] ?? $b['expiresAt'] ?? null;
    $b['createdAt']           = $b['created_at'] ?? $b['createdAt'] ?? '';
    return $b;
}

function admin_build_settings_response(?PDO $pdo): array {
    $settingsMap = [];
    if ($pdo) {
        try {
            $setStmt = $pdo->query("SELECT setting_key, setting_value FROM settings");
            while ($row = $setStmt->fetch()) {
                $settingsMap[$row['setting_key']] = $row['setting_value'];
            }
        } catch (PDOException $e) {
            error_log("[ADMIN SETTINGS READ WARN] " . $e->getMessage());
        }
    }
    return [
        'settings' => [
            'depositRate'        => (int)($settingsMap['deposit_rate'] ?? 30),
            'hotline'            => $settingsMap['hotline'] ?? '0352 313 548',
            'openHours'          => $settingsMap['open_hours'] ?? '05:30 - 23:00 hàng ngày (kể cả Lễ, Tết)',
            'holdMinutes'        => max(5, min(120, (int)($settingsMap['hold_minutes'] ?? 15))),
            'refundFullHours'    => max(1, (int)($settingsMap['refund_full_hours'] ?? 24)),
            'refundPartialHours' => max(0, (int)($settingsMap['refund_partial_hours'] ?? 4)),
            'autoCancelEnabled'  => ((string)($settingsMap['auto_cancel_enabled'] ?? '1') !== '0'),
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
                    'count'         => 11,
                    'today_deposit' => $isStaff ? null : 4350000,
                    'today_total'   => $isStaff ? null : 14500000
                ],
                'todayBookings' => [],
                'pitchStats'    => ['total' => 9, 'active' => 9]
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
}

try {
    
    if ($action === 'overview') {
        $today = date('Y-m-d');

        $todayStmt = $pdo->prepare("SELECT COUNT(*) as count, COALESCE(SUM(deposit_amount), 0) as today_deposit, COALESCE(SUM(total_price), 0) as today_total FROM bookings WHERE booking_date = ? AND payment_status != 'Đã hủy'");
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

        $pitchesStmt = $pdo->query("SELECT COUNT(*) as total, SUM(CASE WHEN status = 'Hoạt động' THEN 1 ELSE 0 END) as active FROM pitches");
        $pitchStats = $pitchesStmt->fetch();

        if (($actor['role'] ?? '') === 'staff') {
            $todayStats['today_deposit'] = null;
            $todayStats['today_total'] = null;
        }

        json_response([
            'success' => true,
            'data'    => [
                'todayStats'    => $todayStats,
                'todayBookings' => $todayBookings,
                'pitchStats'    => $pitchStats
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
            $minutes = max(0, (int)($data['minutes'] ?? 30));
            $fee = max(0, (int)($data['fee'] ?? 0));
            $noteAdd = " [Đá thêm {$minutes}p: +" . number_format($fee, 0, ',', '.') . "đ]";
            $stmt = $pdo->prepare("UPDATE bookings SET total_price = total_price + ?, remaining_amount = remaining_amount + ?, note = CONCAT(IFNULL(note,''), ?) WHERE code = ?");
            $stmt->execute([$fee, $fee, $noteAdd, $code]);

            $oldTotal = (int)($oldBooking['total_price'] ?? 0);
            write_audit_log($pdo, 'ADD_OVERTIME', $code, (string)$oldTotal, ($oldTotal + $fee) . " (+{$minutes}p)", $actor);

            json_response(['success' => true, 'message' => "Đã cộng thêm {$minutes} phút đá thêm giờ."]);
        }

        if ($subAction === 'transfer_pitch') {
            $newPitchId = sanitize_string($data['new_pitch_id'] ?? '', 20);
            $diffPrice = (int)($data['diff_price'] ?? 0);
            $reason = sanitize_string($data['reason'] ?? '', 150);
            $noteAdd = " [Đổi sang sân {$newPitchId}" . ($reason ? ": {$reason}" : "") . "]";
            $stmt = $pdo->prepare("UPDATE bookings SET pitch_id = ?, total_price = GREATEST(0, total_price + ?), remaining_amount = GREATEST(0, remaining_amount + ?), note = CONCAT(IFNULL(note,''), ?) WHERE code = ?");
            $stmt->execute([$newPitchId, $diffPrice, $diffPrice, $noteAdd, $code]);

            write_audit_log($pdo, 'TRANSFER_PITCH', $code, $oldBooking['pitch_id'] ?? '', $newPitchId . ($reason ? " ({$reason})" : ''), $actor);

            json_response(['success' => true, 'message' => "Đã chuyển đơn {$code} sang sân {$newPitchId}."]);
        }

        if ($subAction === 'add_service') {
            $addedCost = max(0, (int)($data['added_cost'] ?? 0));
            $servicesJson = isset($data['services']) && is_array($data['services']) ? json_encode($data['services'], JSON_UNESCAPED_UNICODE) : null;
            $srvId = sanitize_string($data['service_id'] ?? '', 30);
            $srvName = sanitize_string($data['service_name'] ?? 'Dịch vụ', 100);
            $qty = max(1, (int)($data['quantity'] ?? 1));
            $noteAdd = " [Gọi thêm: {$srvName} x{$qty}]";
            if ($servicesJson !== null) {
                $stmt = $pdo->prepare("UPDATE bookings SET services_json = ?, total_price = total_price + ?, remaining_amount = remaining_amount + ?, note = CONCAT(IFNULL(note,''), ?) WHERE code = ?");
                $stmt->execute([$servicesJson, $addedCost, $addedCost, $noteAdd, $code]);
            } else {
                $stmt = $pdo->prepare("UPDATE bookings SET total_price = total_price + ?, remaining_amount = remaining_amount + ?, note = CONCAT(IFNULL(note,''), ?) WHERE code = ?");
                $stmt->execute([$addedCost, $addedCost, $noteAdd, $code]);
            }

            if (empty($srvId)) {
                $findSrv = $pdo->prepare("SELECT id FROM extra_services WHERE name = ? OR name LIKE ? LIMIT 1");
                $findSrv->execute([$srvName, '%' . $srvName . '%']);
                $srvId = (string)($findSrv->fetchColumn() ?: '');
            }
            if (!empty($srvId)) {
                $uPrice = $qty > 0 ? (int)round($addedCost / $qty) : $addedCost;
                deduct_service_inventory($pdo, $srvId, $qty, $code, $uPrice, 'Gọi thêm vào đơn sân', "Gọi thêm cho đơn #{$code}", $actor['id'] ?? null);
            }
            write_audit_log($pdo, 'ADD_SERVICE', $code, null, "{$srvName} x{$qty} (+{$addedCost}đ)", $actor);

            json_response(['success' => true, 'message' => "Đã thêm {$srvName} x{$qty} vào đơn {$code}."]);
        }

        if ($subAction === 'early_cancel') {
            $requestedPolicy = sanitize_string($data['policy'] ?? 'auto', 30);
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
            $stmt = $pdo->query("SELECT code, description, discount_type AS type, discount_value AS value, min_order AS minOrder, is_active FROM vouchers ORDER BY code ASC");
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
                json_response(['success' => true, 'message' => "Đã xóa mã voucher {$vCode}."]);
            }
            if ($subAction === 'toggle') {
                $stmt = $pdo->prepare("UPDATE vouchers SET is_active = NOT is_active WHERE code = ?");
                $stmt->execute([$vCode]);
                json_response(['success' => true, 'message' => "Đã cập nhật trạng thái mã voucher {$vCode}."]);
            }
            $desc = sanitize_string($data['description'] ?? "Ưu đãi mã {$vCode}", 200);
            $type = ($data['type'] ?? 'percent') === 'fixed' ? 'fixed' : 'percent';
            $val = max(0, (int)($data['value'] ?? 10));
            $minOrder = max(0, (int)($data['minOrder'] ?? 0));
            $stmt = $pdo->prepare("INSERT INTO vouchers (code, description, discount_type, discount_value, min_order, is_active) VALUES (?, ?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE description = VALUES(description), discount_type = VALUES(discount_type), discount_value = VALUES(discount_value), min_order = VALUES(min_order), is_active = 1");
            $stmt->execute([$vCode, $desc, $type, $val, $minOrder]);
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
            $depositRate        = max(10, min(100, (int)($data['depositRate'] ?? $data['deposit_rate'] ?? 30)));
            $bankName           = sanitize_string($data['bankName'] ?? $data['bank_name'] ?? 'MBBank', 60);
            $bankCode           = sanitize_string($data['bankCode'] ?? $data['bank_code'] ?? 'MB', 20);
            $accountNo          = sanitize_string($data['accountNo'] ?? $data['accountNumber'] ?? $data['bank_account'] ?? '0352313548', 40);
            $accountName        = strtoupper(sanitize_string($data['accountName'] ?? $data['bank_holder'] ?? 'NGUYEN QUANG VINH', 100));
            $hotline            = sanitize_string($data['hotline'] ?? '0352 313 548', 40);
            $openHours          = sanitize_string($data['openHours'] ?? $data['open_hours'] ?? '05:30 - 23:00 hàng ngày (kể cả Lễ, Tết)', 120);
            $holdMinutes        = max(5, min(120, (int)($data['holdMinutes'] ?? $data['hold_minutes'] ?? 15)));
            $refundFullHours    = max(1, min(168, (int)($data['refundFullHours'] ?? $data['refund_full_hours'] ?? 24)));
            $refundPartialHours = max(0, min($refundFullHours, (int)($data['refundPartialHours'] ?? $data['refund_partial_hours'] ?? 4)));
            $rawAutoCancel      = $data['autoCancelEnabled'] ?? $data['auto_cancel_enabled'] ?? '1';
            $autoCancelEnabled  = ($rawAutoCancel === false || $rawAutoCancel === 0 || $rawAutoCancel === '0' || $rawAutoCancel === 'false') ? '0' : '1';

            if (empty($accountNo) || empty($accountName)) {
                json_error('Số tài khoản và tên chủ tài khoản nhận cọc không được để trống.', 400, 'ERR_EMPTY_BANK_INFO');
            }

            $oldSettings = [];
            try {
                $oldSetStmt = $pdo->query("SELECT setting_key, setting_value FROM settings WHERE setting_key NOT LIKE 'price_%'");
                while ($r = $oldSetStmt->fetch()) {
                    $oldSettings[$r['setting_key']] = $r['setting_value'];
                }
            } catch (Exception $e) {
            }

            $upsertStmt = $pdo->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
            $pairs = [
                'deposit_rate'         => (string)$depositRate,
                'bank_name'            => $bankName,
                'bank_code'            => $bankCode,
                'bank_account'         => $accountNo,
                'bank_holder'          => $accountName,
                'hotline'              => $hotline,
                'open_hours'           => $openHours,
                'hold_minutes'         => (string)$holdMinutes,
                'refund_full_hours'    => (string)$refundFullHours,
                'refund_partial_hours' => (string)$refundPartialHours,
                'auto_cancel_enabled'  => $autoCancelEnabled
            ];
            foreach ($pairs as $k => $v) {
                $upsertStmt->execute([$k, $v]);
            }

            write_audit_log($pdo, 'UPDATE_SETTINGS', null, $oldSettings, $pairs, $admin);

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

                $srvStmt = $pdo->prepare("SELECT * FROM extra_services WHERE id = ? AND is_active = 1 LIMIT 1");
                $srvStmt->execute([$serviceId]);
                $srv = $srvStmt->fetch();
                if (!$srv) {
                    json_error('Không tìm thấy dịch vụ/sản phẩm trong kho.', 404, 'ERR_SERVICE_NOT_FOUND');
                }

                $oldStock = (int)($srv['stock_qty'] ?? 0);
                $trackInv = (int)($srv['track_inventory'] ?? 1) === 1;
                if ($trackInv && $oldStock < $qty) {
                    json_error("Kho không đủ hàng! {$srv['name']} hiện chỉ còn {$oldStock} {$srv['unit']}.", 400, 'ERR_OUT_OF_STOCK');
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

        if ($action === 'export_reports_csv') {
            $safeFrom = $fromDate ?: 'All';
            $safeTo   = $toDate ?: 'All';
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="Bao_Cao_Doanh_Thu_San_Bong_' . $safeFrom . '_' . $safeTo . '.csv"');
            echo "\xEF\xBB\xBF";

            $out = fopen('php://output', 'w');
            fputcsv($out, ['BÁO CÁO TÀI CHÍNH & VẬN HÀNH SÂN BÓNG PRO']);
            fputcsv($out, ['Kỳ báo cáo:', ($fromDate ?: 'Từ đầu') . ' đến ' . ($toDate ?: 'Hiện tại'), 'Xuất lúc:', date('d/m/Y H:i:s')]);
            fputcsv($out, []);

            fputcsv($out, ['I. TỔNG HỢP DOANH THU & DÒNG TIỀN']);
            fputcsv($out, ['Chỉ tiêu', 'Số tiền (VNĐ)']);
            fputcsv($out, ['Tổng doanh thu thực tế (100%)', $totalRevenue]);
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
                    $pItem['id'],
                    $pItem['name'],
                    $pItem['typeName'],
                    $pItem['status'],
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
                    $bRow['code'],
                    $bRow['booking_date'],
                    $bRow['slot_time'],
                    $bRow['pitch_name'] ?? $bRow['pitch_id'],
                    $bRow['customer_name'],
                    $bRow['phone'],
                    $bRow['total_price'],
                    $bRow['deposit_amount'],
                    $bRow['remaining_amount'],
                    $bRow['status'],
                    $bRow['payment_status'],
                    $bRow['payment_method'],
                    $bRow['note']
                ]);
            }
            fputcsv($out, []);

            fputcsv($out, ['IV. BÁN LẺ NƯỚC & DỊCH VỤ TẠI QUẦY']);
            fputcsv($out, ['Thời gian', 'Mã SP', 'Tên dịch vụ/sản phẩm', 'Số lượng', 'Đơn giá', 'Thành tiền', 'Phương thức TT', 'Ghi chú']);
            foreach ($counterSalesRows as $sRow) {
                fputcsv($out, [
                    $sRow['created_at'],
                    $sRow['service_id'],
                    $sRow['service_name'],
                    $sRow['quantity'],
                    $sRow['unit_price'],
                    $sRow['total_amount'],
                    $sRow['payment_method'],
                    $sRow['note']
                ]);
            }

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

    json_response(['success' => false, 'message' => 'Hành động quản trị không hợp lệ.'], 400);
} catch (PDOException $e) {
    error_log("[ADMIN API ERROR] " . $e->getMessage());
    json_response(['success' => false, 'message' => 'Lỗi xử lý yêu cầu quản trị.'], 500);
}
