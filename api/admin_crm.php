<?php

if (!defined('SANBONG_ADMIN_ROUTER')) {
    define('SANBONG_ADMIN_ROUTER', true);
    require_once __DIR__ . '/security_helper.php';
    require_once __DIR__ . '/notification_helper.php';
    require_once __DIR__ . '/services/admin_bookings_manage.php';
    require_once __DIR__ . '/services/admin_staff_vouchers.php';
    require_once __DIR__ . '/services/totp_turnstile_helper.php';

    $actor = require_staff_or_admin();
    $pdo = getDBConnection(false);
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    $rawInput = file_get_contents('php://input');
    $data = [];
    if (!empty($rawInput)) {
        $decoded = json_decode($rawInput, true);
        if (is_array($decoded)) {
            $data = $decoded;
        }
    }
    $data = array_merge($_POST, $data);
    $action = $_GET['action'] ?? $data['action'] ?? 'crm_customers';
    $postOnlyActions = [
        'adjust_points', 'adjust_customer_points', 'update_customer_crm', 'update_customer',
        'update_member', 'create_recurring_schedule', 'cancel_recurring_schedule',
        'skip_recurring_booking', 'assign_waitlist', 'notify_waitlist', 'cancel_waitlist',
        'save_voucher', 'delete_voucher', 'toggle_voucher', 'save_golden_hour', 'delete_golden_hour',
        'save_pricing', 'save_monthly_package', 'delete_monthly_package', 'toggle_monthly_package',
        'save_maintenance', 'update_maintenance'
    ];
    if (in_array($action, $postOnlyActions, true) && strtoupper($method) !== 'POST') {
        json_error('Hành động thay đổi dữ liệu bắt buộc dùng phương thức POST.', 405, 'ERR_METHOD_NOT_ALLOWED');
    }
    if (!in_array(strtoupper($method), ['GET', 'POST'], true)) {
        require_csrf_if_session_authenticated($data);
        json_error('Phương thức HTTP không được hỗ trợ.', 405, 'ERR_METHOD_NOT_ALLOWED');
    }
    if (!in_array(strtoupper($method), ['GET', 'HEAD', 'OPTIONS'], true)) {
        require_csrf_if_session_authenticated($data);
    }
}

if (!function_exists('admin_map_booking')) {
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
        return $b;
    }
}

    // ===============================================================
    // GIAI ĐOẠN 5: KHÁCH HÀNG VÀ DOANH THU (CRM, LỊCH LẶP, WAITLIST, GIỜ VÀNG, VOUCHER)
    // ===============================================================

    // 5.1 CRM: Danh sách tổng hợp khách hàng từ DB + CRM (Loại trừ admin/manager/staff/walkin & Xóa bỏ nợ)
    if ($action === 'crm_customers') {
        $search = trim(sanitize_string($_GET['search'] ?? '', 100));
        $tierFilter = sanitize_string($_GET['tier'] ?? 'all', 30);

        // Danh sách SĐT bị loại trừ: vai trò admin, manager, staff, walkin (Khách lẻ)
        $excludedPhones = ['0000000000' => true];
        $exUsersStmt = $pdo->query("SELECT phone FROM users WHERE role IN ('admin', 'manager', 'staff', 'walkin') AND phone IS NOT NULL AND TRIM(phone) != ''");
        if ($exUsersStmt) {
            foreach ($exUsersStmt->fetchAll(PDO::FETCH_ASSOC) as $exU) {
                $p = normalize_phone((string)$exU['phone']);
                if ($p !== '') {
                    $excludedPhones[$p] = true;
                }
            }
        }

        $cleanPhoneExpr = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(b.phone), ' ', ''), '.', ''), '-', ''), '+', ''), '(', ''), ')', ''), CHAR(9), '')";
        $normalizedPhoneExpr = "CASE
            WHEN CHAR_LENGTH({$cleanPhoneExpr}) = 11 AND LEFT({$cleanPhoneExpr}, 2) = '84'
            THEN CONCAT('0', SUBSTRING({$cleanPhoneExpr}, 3))
            ELSE {$cleanPhoneExpr}
        END";

        $aggStmt = $pdo->query("
            SELECT
                {$normalizedPhoneExpr} AS clean_phone,
                MAX(b.phone) AS raw_phone,
                SUBSTRING_INDEX(GROUP_CONCAT(b.customer_name ORDER BY b.id DESC SEPARATOR '|||'), '|||', 1) AS latest_name,
                COUNT(*) AS total_bookings,
                COALESCE(SUM(CASE WHEN b.status = 'completed' OR b.status = 'Hoàn thành' THEN 1 ELSE 0 END), 0) AS completed_count,
                COALESCE(SUM(CASE WHEN b.status = 'Khách chưa đến' OR b.payment_status = 'Tịch thu cọc 30%' THEN 1 ELSE 0 END), 0) AS noshow_count,
                COALESCE(SUM(CASE WHEN b.payment_status IN ('Đã cọc 30%', 'Đã thanh toán đủ', 'Đã thanh toán 100%') THEN b.paid_amount ELSE 0 END), 0) AS total_spent,
                MAX(b.booking_date) AS last_booking_date
            FROM bookings b
            WHERE b.phone IS NOT NULL AND TRIM(b.phone) != '' AND b.phone != '0000000000'
                AND COALESCE(b.status, '') <> 'Đã hủy'
            GROUP BY {$normalizedPhoneExpr}
        ");
        $aggRows = $aggStmt ? $aggStmt->fetchAll(PDO::FETCH_ASSOC) : [];

        $crmRows = [];
        $crmAllStmt = $pdo->query("SELECT * FROM customer_crm");
        if ($crmAllStmt) {
            foreach ($crmAllStmt->fetchAll(PDO::FETCH_ASSOC) as $cr) {
                $cp = normalize_phone((string)$cr['phone']);
                if ($cp !== '' && !isset($excludedPhones[$cp])) {
                    $crmRows[$cp] = $cr;
                }
            }
        }

        // Lấy danh sách hội viên thực sự (role NOT IN ('admin', 'manager', 'staff', 'walkin'))
        $memberUsers = [];
        $userStmt = $pdo->query("SELECT id, username, full_name, phone, email, role, points, customer_tier, admin_note, status, updated_at, created_at FROM users WHERE role NOT IN ('admin', 'manager', 'staff', 'walkin') AND phone IS NOT NULL AND TRIM(phone) != ''");
        if ($userStmt) {
            foreach ($userStmt->fetchAll(PDO::FETCH_ASSOC) as $ur) {
                $up = normalize_phone((string)$ur['phone']);
                if ($up !== '' && !isset($excludedPhones[$up])) {
                    $memberUsers[$up] = $ur;
                }
            }
        }

        $tz = new DateTimeZone('Asia/Ho_Chi_Minh');
        $todayStr = (new DateTime('today', $tz))->format('Y-m-d');
        $todayTs = strtotime($todayStr);

        $customersByPhone = [];
        foreach ($aggRows as $row) {
            $cp = normalize_phone((string)($row['clean_phone'] ?: $row['raw_phone']));
            if ($cp === '' || isset($excludedPhones[$cp])) {
                continue;
            }
            $crm = $crmRows[$cp] ?? null;
            $user = $memberUsers[$cp] ?? null;
            $noShowCount    = (int)$row['noshow_count'];
            $totalSpent     = (int)$row['total_spent'];
            $completedCount = (int)$row['completed_count'];

            $tier = $crm['customer_tier'] ?? ($user['customer_tier'] ?? '');
            if ($tier === '') {
                if ($noShowCount >= 2) {
                    $tier = 'warning_noshow';
                } elseif ($totalSpent >= 2000000 || $completedCount >= 5) {
                    $tier = 'vip';
                } elseif ($completedCount >= 2) {
                    $tier = 'regular';
                } else {
                    $tier = 'standard';
                }
            }

            $lastBookingDate = trim((string)($row['last_booking_date'] ?? ''));
            $lastBookingRelative = '—';
            if ($lastBookingDate !== '') {
                $bDateTs = strtotime(substr($lastBookingDate, 0, 10));
                if ($bDateTs !== false) {
                    $diffDays = (int)round(($todayTs - $bDateTs) / 86400);
                    if ($diffDays <= 0) {
                        $lastBookingRelative = 'Hôm nay';
                    } else {
                        $lastBookingRelative = "{$diffDays} ngày trước";
                    }
                }
            }

            $customerName = trim((string)($user['full_name'] ?? ''));
            if ($customerName === '') {
                $customerName = trim((string)($crm['full_name'] ?? ''));
            }
            if ($customerName === '') {
                $customerName = (string)$row['latest_name'];
            }

            $customersByPhone[$cp] = [
                'user_id'             => $user ? (int)$user['id'] : null,
                'phone'               => $cp,
                'customerName'        => $customerName,
                'full_name'           => $customerName,
                'email'               => (string)($user['email'] ?? ''),
                'customerTier'        => $tier,
                'adminNote'           => (string)($user['admin_note'] ?? ($crm['admin_note'] ?? '')),
                'isBlacklisted'       => !empty($crm['is_blacklisted']) || (($user['status'] ?? '') === 'locked'),
                'totalBookings'       => (int)$row['total_bookings'],
                'completedCount'      => (int)$completedCount,
                'noShowCount'         => (int)$noShowCount,
                'totalSpent'          => $totalSpent,
                'points'              => (int)($user['points'] ?? 0),
                'lastBookingDate'     => (string)($row['last_booking_date'] ?? ''),
                'lastBookingRelative' => $lastBookingRelative,
                'updated_at'          => (string)($user['updated_at'] ?? ($crm['updated_at'] ?? ''))
            ];
        }

        // Bổ sung các khách hàng có trong customer_crm hoặc users nhưng chưa từng đặt sân
        foreach ($crmRows as $cp => $crm) {
            if (isset($excludedPhones[$cp])) {
                continue;
            }
            if (!isset($customersByPhone[$cp])) {
                $user = $memberUsers[$cp] ?? null;
                $cName = trim((string)($user['full_name'] ?? ''));
                if ($cName === '') {
                    $cName = trim((string)($crm['full_name'] ?? 'Khách CRM'));
                }
                $customersByPhone[$cp] = [
                    'user_id'             => $user ? (int)$user['id'] : null,
                    'phone'               => $cp,
                    'customerName'        => $cName,
                    'full_name'           => $cName,
                    'email'               => (string)($user['email'] ?? ''),
                    'customerTier'        => (string)($crm['customer_tier'] ?? ($user['customer_tier'] ?? 'standard')),
                    'adminNote'           => (string)($user['admin_note'] ?? ($crm['admin_note'] ?? '')),
                    'isBlacklisted'       => !empty($crm['is_blacklisted']) || (($user['status'] ?? '') === 'locked'),
                    'totalBookings'       => 0,
                    'completedCount'      => 0,
                    'noShowCount'         => 0,
                    'totalSpent'          => 0,
                    'points'              => (int)($user['points'] ?? 0),
                    'lastBookingDate'     => '',
                    'lastBookingRelative' => '—',
                    'updated_at'          => (string)($user['updated_at'] ?? ($crm['updated_at'] ?? ''))
                ];
            }
        }

        foreach ($memberUsers as $up => $user) {
            if (!isset($customersByPhone[$up])) {
                $customersByPhone[$up] = [
                    'user_id'             => (int)$user['id'],
                    'phone'               => $up,
                    'customerName'        => (string)$user['full_name'],
                    'full_name'           => (string)$user['full_name'],
                    'email'               => (string)$user['email'],
                    'customerTier'        => (string)($user['customer_tier'] ?? 'standard'),
                    'adminNote'           => (string)($user['admin_note'] ?? ''),
                    'isBlacklisted'       => (($user['status'] ?? '') === 'locked'),
                    'totalBookings'       => 0,
                    'completedCount'      => 0,
                    'noShowCount'         => 0,
                    'totalSpent'          => 0,
                    'points'              => (int)($user['points'] ?? 0),
                    'lastBookingDate'     => '',
                    'lastBookingRelative' => '—',
                    'updated_at'          => (string)($user['updated_at'] ?? '')
                ];
            }
        }

        $list = array_values($customersByPhone);
        if ($search !== '') {
            $searchDigits = normalize_phone($search);
            $list = array_values(array_filter($list, static function ($c) use ($search, $searchDigits) {
                if (mb_stripos($c['customerName'], $search) !== false) {
                    return true;
                }
                if (stripos($c['phone'], $search) !== false) {
                    return true;
                }
                if ($searchDigits !== '' && stripos($c['phone'], $searchDigits) !== false) {
                    return true;
                }
                return false;
            }));
        }

        if ($tierFilter !== '' && $tierFilter !== 'all') {
            $list = array_values(array_filter($list, static function ($c) use ($tierFilter) {
                if ($tierFilter === 'blacklisted') {
                    return !empty($c['isBlacklisted']);
                }
                return ($c['customerTier'] ?? 'standard') === $tierFilter;
            }));
        }

        usort($list, static function ($a, $b) {
            if ($b['totalSpent'] !== $a['totalSpent']) {
                return $b['totalSpent'] <=> $a['totalSpent'];
            }
            return $b['totalBookings'] <=> $a['totalBookings'];
        });

        json_response(['success' => true, 'data' => $list]);
    }

    // 5.1 CRM: Xem chi tiết hồ sơ khách hàng
    if ($action === 'customer_detail') {
        $phone = sanitize_string($_GET['phone'] ?? $data['phone'] ?? '', 25);
        $cleanPhone = normalize_phone($phone);
        if ($cleanPhone === '') {
            json_error('Thiếu số điện thoại khách hàng.', 400, 'ERR_MISSING_PHONE');
        }

        $phonePattern = '%' . $cleanPhone . '%';

        $bStmt = $pdo->prepare("
            SELECT b.*, p.name AS pitch_name
            FROM bookings b
            LEFT JOIN pitches p ON b.pitch_id = p.id
            WHERE REPLACE(REPLACE(REPLACE(b.phone, ' ', ''), '.', ''), '-', '') = ?
               OR b.phone LIKE ?
            ORDER BY b.id DESC, b.booking_date DESC
        ");
        $bStmt->execute([$cleanPhone, $phonePattern]);
        $bookings = $bStmt->fetchAll();

        $totalSpent = 0;
        $totalBookings = count($bookings);
        $completedCount = 0;
        $cancelledCount = 0;
        $noShowCount = 0;
        $latestName = '';

        foreach ($bookings as $b) {
            if (!$latestName && !empty($b['customer_name'])) {
                $latestName = $b['customer_name'];
            }
            $pStatus = $b['payment_status'] ?? '';
            $status = $b['status'] ?? '';

            if (in_array($pStatus, ['Đã cọc 30%', 'Đã thanh toán đủ', 'Đã thanh toán 100%'], true)) {
                $totalSpent += (int)($b['paid_amount'] ?? 0);
            }
            // Chuẩn hóa định nghĩa trận hoàn thành: status = 'completed'
            if ($status === 'completed' || $status === 'Hoàn thành') {
                $completedCount++;
            }
            if ($status === 'Đã hủy' || strpos($pStatus, 'hủy') !== false || strpos($pStatus, 'hoàn') !== false) {
                $cancelledCount++;
            }
            if ($status === 'Khách chưa đến' || $pStatus === 'Tịch thu cọc 30%') {
                $noShowCount++;
            }
        }

        $crmStmt = $pdo->prepare("SELECT * FROM customer_crm WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', '') = ? OR phone = ? LIMIT 1");
        $crmStmt->execute([$cleanPhone, $cleanPhone]);
        $crm = $crmStmt->fetch();

        // Lấy thông tin tài khoản hội viên nếu có
        $uStmt = $pdo->prepare("SELECT id, username, full_name, email, phone, points, customer_tier, admin_note, status, updated_at FROM users WHERE (REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', '') = ? OR phone = ?) AND role NOT IN ('admin', 'manager', 'staff', 'walkin') LIMIT 1");
        $uStmt->execute([$cleanPhone, $cleanPhone]);
        $uRow = $uStmt->fetch(PDO::FETCH_ASSOC);

        $tier = $crm['customer_tier'] ?? ($uRow['customer_tier'] ?? 'standard');
        if (!$crm && !$uRow) {
            if ($noShowCount >= 2) {
                $tier = 'warning_noshow';
            } elseif ($totalSpent >= 2000000 || $completedCount >= 5) {
                $tier = 'vip';
            } elseif ($completedCount >= 2) {
                $tier = 'regular';
            }
        }

        $userPoints = (int)($uRow['points'] ?? 0);
        $userId = $uRow ? (int)$uRow['id'] : null;

        // Lấy 10 dòng lịch sử tích điểm gần nhất
        $pointsLogs = [];
        if ($userId > 0) {
            $plStmt = $pdo->prepare("
                SELECT pl.id, pl.user_id, pl.booking_id, pl.delta, pl.reason, pl.admin_id, pl.created_at,
                       u.full_name AS admin_name, u.username AS admin_username
                FROM points_log pl
                LEFT JOIN users u ON pl.admin_id = u.id
                WHERE pl.user_id = ?
                ORDER BY pl.id DESC
                LIMIT 10
            ");
            $plStmt->execute([$userId]);
            $pointsLogs = $plStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        // Chỉ Admin/Manager được phép xem nhật ký quản trị của khách hàng
        $auditLogs = [];
        if (in_array($actor['role'] ?? '', ['admin', 'manager'], true)) {
            $alStmt = $pdo->prepare("
                SELECT id, user_id, actor_name, actor_role, action, target_type, target_id, booking_id, old_value, new_value, ip, created_at
                FROM audit_logs
                WHERE (target_type = 'customer' AND target_id = ?)
                   OR target_id = ?
                   OR (user_id = ? AND target_type = 'user')
                   OR old_value LIKE ?
                   OR new_value LIKE ?
                ORDER BY id DESC
                LIMIT 10
            ");
            $phoneLike = '%' . $cleanPhone . '%';
            $alStmt->execute([$cleanPhone, $cleanPhone, (int)($userId ?? 0), $phoneLike, $phoneLike]);
            $auditLogs = $alStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        $displayName = trim((string)($uRow['full_name'] ?? ''));
        if ($displayName === '') {
            $displayName = trim((string)($crm['full_name'] ?? ''));
        }
        if ($displayName === '') {
            $displayName = $latestName;
        }

        json_response([
            'success' => true,
            'data'    => [
                'user_id'        => $userId,
                'phone'          => $cleanPhone,
                'customerName'   => $displayName,
                'full_name'      => $displayName,
                'email'          => (string)($uRow['email'] ?? ''),
                'customerTier'   => $tier,
                'adminNote'      => (string)($uRow['admin_note'] ?? ($crm['admin_note'] ?? '')),
                'isBlacklisted'  => !empty($crm['is_blacklisted']) || (($uRow['status'] ?? '') === 'locked'),
                'totalSpent'     => $totalSpent,
                'totalBookings'  => $totalBookings,
                'completedCount' => $completedCount,
                'cancelledCount' => $cancelledCount,
                'noShowCount'    => $noShowCount,
                'points'         => $userPoints,
                'updated_at'     => (string)($uRow['updated_at'] ?? ($crm['updated_at'] ?? '')),
                'bookings'       => array_map('admin_map_booking', $bookings),
                'points_log'     => $pointsLogs,
                'audit_logs'     => $auditLogs
            ]
        ]);
    }

    // 5.1 CRM: Lấy lịch sử tích điểm hội viên
    if ($action === 'customer_points_log') {
        $phone = sanitize_string($_GET['phone'] ?? $data['phone'] ?? '', 25);
        $cleanPhone = normalize_phone($phone);
        $userId = (int)($_GET['user_id'] ?? $data['user_id'] ?? 0);
        $limit = max(1, min(50, (int)($_GET['limit'] ?? $data['limit'] ?? 10)));

        if ($userId <= 0 && $cleanPhone !== '') {
            $uStmt = $pdo->prepare("SELECT id FROM users WHERE phone = ? OR REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', '') = ? LIMIT 1");
            $uStmt->execute([$cleanPhone, $cleanPhone]);
            $uRow = $uStmt->fetch(PDO::FETCH_ASSOC);
            if ($uRow) {
                $userId = (int)$uRow['id'];
            }
        }

        $pointsLogs = [];
        if ($userId > 0) {
            $plStmt = $pdo->prepare("
                SELECT pl.id, pl.user_id, pl.booking_id, pl.delta, pl.reason, pl.admin_id, pl.created_at,
                       u.full_name AS admin_name, u.username AS admin_username
                FROM points_log pl
                LEFT JOIN users u ON pl.admin_id = u.id
                WHERE pl.user_id = ?
                ORDER BY pl.id DESC
                LIMIT " . (int)$limit
            );
            $plStmt->execute([$userId]);
            $pointsLogs = $plStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        json_response([
            'success' => true,
            'data'    => $pointsLogs
        ]);
    }

    // 5.1 CRM: Lấy nhật ký quản trị của khách hàng (chỉ Quản lý hoặc Quản trị viên)
    if ($action === 'customer_audit_logs') {
        require_manager_or_admin($pdo);
        $phone = sanitize_string($_GET['phone'] ?? $data['phone'] ?? '', 25);
        $cleanPhone = normalize_phone($phone);
        $userId = (int)($_GET['user_id'] ?? $data['user_id'] ?? 0);
        $limit = max(1, min(50, (int)($_GET['limit'] ?? $data['limit'] ?? 10)));

        if ($userId <= 0 && strlen($cleanPhone) < 9) {
            json_error('Thiếu thông tin khách hàng hợp lệ để tra cứu lịch sử.', 422, 'ERR_INVALID_CUSTOMER_FILTER');
        }

        $whereParts = [];
        $params = [];

        if (strlen($cleanPhone) >= 9) {
            $phoneLike = '%' . $cleanPhone . '%';
            $whereParts[] = "(target_type = 'customer' AND target_id = ?)";
            $params[] = $cleanPhone;
            $whereParts[] = "target_id = ?";
            $params[] = $cleanPhone;
            $whereParts[] = "old_value LIKE ?";
            $params[] = $phoneLike;
            $whereParts[] = "new_value LIKE ?";
            $params[] = $phoneLike;
        }

        if ($userId > 0) {
            $whereParts[] = "(user_id = ? AND target_type = 'user')";
            $params[] = $userId;
            $whereParts[] = "(target_type = 'user' AND target_id = ?)";
            $params[] = (string)$userId;
        }

        $alStmt = $pdo->prepare("
            SELECT id, user_id, actor_name, actor_role, action, target_type, target_id, booking_id, old_value, new_value, ip, created_at
            FROM audit_logs
            WHERE " . implode(' OR ', $whereParts) . "
            ORDER BY id DESC
            LIMIT " . (int)$limit
        );
        $alStmt->execute($params);
        $auditLogs = $alStmt->fetchAll(PDO::FETCH_ASSOC);

        json_response([
            'success' => true,
            'data'    => $auditLogs
        ]);
    }

    // 5.1 CRM: Điều chỉnh điểm tích lũy độc lập
    if ($action === 'adjust_points' || $action === 'adjust_customer_points') {
        if (strtoupper($method) !== 'POST') {
            json_error('Hành động yêu cầu phương thức POST.', 405, 'ERR_METHOD_NOT_ALLOWED');
        }
        $admin = require_manager_or_admin($pdo);

        $phone = sanitize_string($data['phone'] ?? '', 25);
        $cleanPhone = normalize_phone($phone);
        $userId = (int)($data['user_id'] ?? $data['id'] ?? 0);

        if ($userId <= 0 && $cleanPhone === '') {
            json_error('Thiếu thông tin hội viên (user_id hoặc phone).', 400, 'ERR_MISSING_USER_ID');
        }

        $reason = trim(sanitize_string($data['reason'] ?? $data['points_reason'] ?? '', 255));
        if ($reason === '') {
            json_error('Bắt buộc nhập lý do điều chỉnh điểm tích lũy.', 400, 'ERR_MISSING_POINTS_REASON');
        }

        $rawPoints = $data['points'] ?? $data['new_points'] ?? null;
        $rawDelta  = $data['delta'] ?? $data['points_delta'] ?? null;
        if ($rawPoints === null && $rawDelta === null) {
            json_error('Thiếu số điểm mới hoặc giá trị biến động delta.', 400, 'ERR_MISSING_POINTS_VALUE');
        }

        $pdo->beginTransaction();
        try {
            if ($userId > 0) {
                $uStmt = $pdo->prepare("SELECT * FROM users WHERE id = ? FOR UPDATE");
                $uStmt->execute([$userId]);
            } else {
                $uStmt = $pdo->prepare("SELECT * FROM users WHERE phone = ? OR REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', '') = ? LIMIT 1 FOR UPDATE");
                $uStmt->execute([$cleanPhone, $cleanPhone]);
            }
            $user = $uStmt->fetch(PDO::FETCH_ASSOC);

            if (!$user && $cleanPhone !== '') {
                $uname = 'kh_' . $cleanPhone;
                $crmStmt = $pdo->prepare("SELECT * FROM customer_crm WHERE phone = ? LIMIT 1");
                $crmStmt->execute([$cleanPhone]);
                $crm = $crmStmt->fetch(PDO::FETCH_ASSOC);
                $cName = $crm['full_name'] ?? ('Khách hàng ' . substr($cleanPhone, -4));
                $pwdHash = '$argon2id$v=19$m=65536,t=4,p=1$DISABLED_NON_LOGIN$disabled';
                $insU = $pdo->prepare("INSERT INTO users (username, full_name, phone, email, password_hash, role, status, points) VALUES (?, ?, ?, ?, ?, 'user', 'active', 0)");
                $insU->execute([$uname, $cName, $cleanPhone, $cleanPhone . '@sanbongpro.local', $pwdHash]);
                $userId = (int)$pdo->lastInsertId();
                $uStmt = $pdo->prepare("SELECT * FROM users WHERE id = ? FOR UPDATE");
                $uStmt->execute([$userId]);
                $user = $uStmt->fetch(PDO::FETCH_ASSOC);
            }

            if (!$user) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                json_error('Không tìm thấy hội viên để điều chỉnh điểm.', 404, 'ERR_USER_NOT_FOUND');
            }

            $userId = (int)$user['id'];
            $cleanPhone = normalize_phone((string)$user['phone']);
            $currentPoints = (int)($user['points'] ?? 0);

            if ($rawPoints !== null) {
                $newPoints = (int)$rawPoints;
                $delta = $newPoints - $currentPoints;
            } else {
                $delta = (int)$rawDelta;
                $newPoints = $currentPoints + $delta;
            }

            if ($newPoints < 0) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                json_error('Điểm tích lũy không được âm.', 400, 'ERR_NEGATIVE_POINTS');
            }
            if ($newPoints > 10000000) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                json_error('Điểm tích lũy không được vượt quá 10.000.000 điểm.', 400, 'ERR_POINTS_TOO_HIGH');
            }

            // Ghi vào points_log trong cùng transaction
            $pLogStmt = $pdo->prepare("INSERT INTO points_log (user_id, booking_id, delta, reason, admin_id, created_at) VALUES (?, NULL, ?, ?, ?, NOW())");
            $pLogStmt->execute([$userId, $delta, $reason, (int)$admin['id']]);

            // Cập nhật users.points
            $updStmt = $pdo->prepare("UPDATE users SET points = ?, version = version + 1, updated_at = NOW() WHERE id = ?");
            $updStmt->execute([$newPoints, $userId]);

            require_once __DIR__ . '/services/AdminLogService.php';
            AdminLogService::record(
                $pdo,
                (int)$admin['id'],
                'ADJUST_POINTS',
                'user',
                $cleanPhone,
                ['points' => $currentPoints],
                ['points' => $newPoints, 'delta' => $delta, 'reason' => $reason],
                get_client_ip()
            );

            $pdo->commit();

            json_response([
                'success' => true,
                'message' => "Đã điều chỉnh điểm của hội viên thành {$newPoints} điểm (biến động " . ($delta >= 0 ? "+{$delta}" : "{$delta}") . ").",
                'data' => [
                    'user_id'    => $userId,
                    'phone'      => $cleanPhone,
                    'old_points' => $currentPoints,
                    'new_points' => $newPoints,
                    'points'     => $newPoints,
                    'delta'      => $delta,
                    'reason'     => $reason
                ]
            ]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log("[ADJUST_POINTS ERROR] " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine());
            json_error('Lỗi hệ thống khi điều chỉnh điểm tích lũy. Vui lòng thử lại sau.', 500, 'ERR_ADJUST_POINTS_FAILED');
        }
    }

    // 5.1 CRM: UNIFIED CUSTOMER UPDATE API (Lưu Họ tên, SĐT, Email, Ghi chú CRM, Phân hạng kèm lý do, Khóa/Blacklist kèm lý do, Điều chỉnh điểm)
    if ($action === 'update_customer_crm' || $action === 'update_customer' || $action === 'update_member') {
        if (strtoupper($method) !== 'POST') {
            json_error('Hành động yêu cầu phương thức POST.', 405, 'ERR_METHOD_NOT_ALLOWED');
        }
        $admin = require_manager_or_admin($pdo);

        // 1. Chuẩn hóa SĐT
        $rawPhone = trim((string)($data['phone'] ?? ''));
        $cleanPhone = normalize_phone($rawPhone);
        if ($cleanPhone === '' || !preg_match('/^(0[35789])[0-9]{8}$/', $cleanPhone)) {
            json_error('Số điện thoại không hợp lệ. Vui lòng nhập SĐT Việt Nam 10 chữ số (03, 05, 07, 08, 09).', 400, 'ERR_INVALID_PHONE');
        }

        // Cấm can thiệp/sửa đổi tài khoản của admin/manager/staff/walkin qua CRM
        $exCheckStmt = $pdo->prepare("SELECT id, role FROM users WHERE (phone = ? OR REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', '') = ?) AND role IN ('admin', 'manager', 'staff', 'walkin') LIMIT 1");
        $exCheckStmt->execute([$cleanPhone, $cleanPhone]);
        $exFound = $exCheckStmt->fetch(PDO::FETCH_ASSOC);
        if ($exFound) {
            json_error('Không thể chỉnh sửa hồ sơ của tài khoản quản trị hệ thống qua CRM.', 403, 'ERR_CANNOT_EDIT_ADMIN_USER');
        }

        $userId = (int)($data['user_id'] ?? $data['id'] ?? 0);
        if ($userId > 0) {
            $chkPhoneStmt = $pdo->prepare("SELECT id FROM users WHERE (phone = ? OR REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', '') = ?) AND id != ? LIMIT 1");
            $chkPhoneStmt->execute([$cleanPhone, $cleanPhone, $userId]);
            if ($chkPhoneStmt->fetch()) {
                json_error('Số điện thoại này đã được sử dụng bởi hội viên khác!', 400, 'ERR_DUPLICATE_PHONE');
            }
        }

        // 2. Validate họ tên
        $fullName = trim(sanitize_string($data['full_name'] ?? $data['customer_name'] ?? $data['name'] ?? '', 100));
        if ($fullName === '') {
            json_error('Họ tên khách hàng không được để trống.', 400, 'ERR_EMPTY_NAME');
        }
        if (mb_strlen($fullName) > 100) {
            json_error('Họ tên không được vượt quá 100 ký tự.', 400, 'ERR_NAME_TOO_LONG');
        }

        // 3. Validate email (nếu có)
        $rawEmail = trim((string)($data['email'] ?? ''));
        $finalEmail = null;
        if ($rawEmail !== '') {
            $finalEmail = strtolower(sanitize_string($rawEmail, 100));
            if (!filter_var($finalEmail, FILTER_VALIDATE_EMAIL)) {
                json_error('Định dạng email không hợp lệ.', 400, 'ERR_INVALID_EMAIL');
            }
            $chkEmailStmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1");
            $chkEmailStmt->execute([$finalEmail, $userId]);
            if ($chkEmailStmt->fetch()) {
                json_error('Email này đã được sử dụng bởi hội viên khác!', 400, 'ERR_DUPLICATE_EMAIL');
            }
        }

        // 4. Validate phân hạng & lý do
        $tier = sanitize_string($data['customer_tier'] ?? $data['customerTier'] ?? $data['tier'] ?? 'standard', 30);
        if (!in_array($tier, ['standard', 'regular', 'vip', 'warning_noshow'], true)) {
            json_error('Phân hạng khách hàng không hợp lệ.', 400, 'ERR_INVALID_TIER');
        }
        $tierReason = trim(sanitize_string($data['tier_reason'] ?? $data['override_reason'] ?? '', 500));

        // 5. Validate khóa / blacklist & bắt buộc lý do
        $isBlacklisted = !empty($data['is_blacklisted']) || !empty($data['is_locked']) || (($data['status'] ?? '') === 'locked') ? 1 : 0;
        $lockReason = trim(sanitize_string($data['blacklist_reason'] ?? $data['lock_reason'] ?? '', 500));

        // 6. Ghi chú CRM
        $adminNote = trim(sanitize_string($data['admin_note'] ?? $data['adminNote'] ?? $data['crm_notes'] ?? '', 1000));

        // 7. Điểm tích lũy & lý do
        $hasPointsField = isset($data['points']) || isset($data['new_points']) || isset($data['points_delta']) || isset($data['delta']);
        $rawPoints = $data['points'] ?? $data['new_points'] ?? null;
        $rawDelta  = $data['points_delta'] ?? $data['delta'] ?? null;
        $pointsReason = trim(sanitize_string($data['points_reason'] ?? $data['reason'] ?? '', 255));

        // 8. Bắt đầu Transaction và Khóa dòng FOR UPDATE
        $pdo->beginTransaction();
        try {
            // Khóa dòng users nếu có
            $currentUser = null;
            if ($userId > 0) {
                $uLockStmt = $pdo->prepare("SELECT * FROM users WHERE id = ? FOR UPDATE");
                $uLockStmt->execute([$userId]);
                $currentUser = $uLockStmt->fetch(PDO::FETCH_ASSOC);
            }
            if (!$currentUser) {
                $uLockStmt = $pdo->prepare("SELECT * FROM users WHERE (phone = ? OR REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', '') = ?) AND role NOT IN ('admin', 'manager', 'staff', 'walkin') LIMIT 1 FOR UPDATE");
                $uLockStmt->execute([$cleanPhone, $cleanPhone]);
                $currentUser = $uLockStmt->fetch(PDO::FETCH_ASSOC);
                if ($currentUser) {
                    $userId = (int)$currentUser['id'];
                }
            }

            // Khóa dòng customer_crm nếu có
            $crmLockStmt = $pdo->prepare("SELECT * FROM customer_crm WHERE phone = ? LIMIT 1 FOR UPDATE");
            $crmLockStmt->execute([$cleanPhone]);
            $currentCrm = $crmLockStmt->fetch(PDO::FETCH_ASSOC);

            // 9. Kiểm tra Optimistic Locking (chống overwrite đồng thời)
            $clientUpdatedAt = trim((string)($data['updated_at'] ?? ''));
            $clientVersion   = isset($data['version']) && is_numeric($data['version']) ? (int)$data['version'] : null;

            if ($clientUpdatedAt !== '') {
                $dbUpdatedAt = trim((string)($currentUser['updated_at'] ?? ($currentCrm['updated_at'] ?? '')));
                if ($dbUpdatedAt !== '') {
                    $clientTs = strtotime($clientUpdatedAt);
                    $dbTs     = strtotime($dbUpdatedAt);
                    if ($clientTs !== false && $dbTs !== false) {
                        if (abs($clientTs - $dbTs) > 1) {
                            if ($pdo->inTransaction()) {
                                $pdo->rollBack();
                            }
                            json_error(
                                'Dữ liệu hồ sơ khách hàng vừa được cập nhật bởi quản trị viên khác. Vui lòng tải lại trang để xem thông tin mới nhất.',
                                409,
                                'ERR_CONCURRENCY_CONFLICT'
                            );
                        }
                    } elseif ($clientUpdatedAt !== $dbUpdatedAt) {
                        if ($pdo->inTransaction()) {
                            $pdo->rollBack();
                        }
                        json_error(
                            'Dữ liệu hồ sơ khách hàng vừa được cập nhật bởi quản trị viên khác. Vui lòng tải lại trang để xem thông tin mới nhất.',
                            409,
                            'ERR_CONCURRENCY_CONFLICT'
                        );
                    }
                }
            }
            if ($clientVersion !== null && $currentUser && isset($currentUser['version'])) {
                if ((int)$currentUser['version'] !== $clientVersion) {
                    if ($pdo->inTransaction()) {
                        $pdo->rollBack();
                    }
                    json_error('Phiên bản dữ liệu không khớp (đã có thay đổi từ phiên khác). Vui lòng tải lại trang.', 409, 'ERR_CONCURRENCY_CONFLICT');
                }
            }

            // 10. Bắt buộc lý do khi Khóa / Blacklist khách hàng
            $prevBlacklisted = !empty($currentCrm['is_blacklisted']) || (($currentUser['status'] ?? '') === 'locked');
            if ($isBlacklisted && !$prevBlacklisted) {
                if ($lockReason === '') {
                    if ($pdo->inTransaction()) {
                        $pdo->rollBack();
                    }
                    json_error('Bắt buộc nhập lý do khi khóa hoặc đưa khách hàng vào danh sách đen.', 400, 'ERR_MISSING_LOCK_REASON');
                }
            }

            // 11. Bắt buộc lý do khi can thiệp Phân hạng (Tier Override)
            $prevTier = (string)($currentCrm['customer_tier'] ?? ($currentUser['customer_tier'] ?? 'standard'));
            if ($tier !== $prevTier && $tierReason === '') {
                $genReason = trim(sanitize_string($data['reason'] ?? '', 500));
                if ($genReason !== '') {
                    $tierReason = $genReason;
                }
            }

            // 12. Tính toán điểm mới & biến động điểm
            $currentPoints = (int)($currentUser['points'] ?? 0);
            $newPoints = $currentPoints;
            $delta = 0;
            if ($rawPoints !== null && $rawPoints !== '') {
                $newPoints = (int)$rawPoints;
                $delta = $newPoints - $currentPoints;
            } elseif ($rawDelta !== null && $rawDelta !== '') {
                $delta = (int)$rawDelta;
                $newPoints = $currentPoints + $delta;
            }

            if ($newPoints < 0) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                json_error('Điểm tích lũy không được âm.', 400, 'ERR_NEGATIVE_POINTS');
            }
            if ($newPoints > 10000000) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                json_error('Điểm tích lũy không được vượt quá 10.000.000 điểm.', 400, 'ERR_POINTS_TOO_HIGH');
            }

            if ($delta !== 0) {
                if ($pointsReason === '') {
                    if ($pdo->inTransaction()) {
                        $pdo->rollBack();
                    }
                    json_error('Vui lòng nhập lý do điều chỉnh điểm tích lũy của khách hàng.', 400, 'ERR_MISSING_POINTS_REASON');
                }

                // Nếu khách chưa có tài khoản trong users, tự tạo để gắn điểm và foreign key
                if (!$currentUser) {
                    $uname = 'kh_' . $cleanPhone;
                    $pwdHash = '$argon2id$v=19$m=65536,t=4,p=1$DISABLED_NON_LOGIN$disabled';
                    $uStatus = $isBlacklisted ? 'locked' : 'active';
                    $insU = $pdo->prepare("INSERT INTO users (username, full_name, phone, email, password_hash, role, status, points, customer_tier, admin_note) VALUES (?, ?, ?, ?, ?, 'user', ?, ?, ?, ?)");
                    $insU->execute([$uname, $fullName, $cleanPhone, $finalEmail ?: ($cleanPhone . '@sanbongpro.local'), $pwdHash, $uStatus, $newPoints, $tier, $adminNote]);
                    $userId = (int)$pdo->lastInsertId();
                    $currentUser = ['id' => $userId, 'points' => 0];
                }

                // Ghi vào points_log trong cùng transaction
                $pLogStmt = $pdo->prepare("
                    INSERT INTO points_log (user_id, booking_id, delta, reason, admin_id, created_at)
                    VALUES (?, NULL, ?, ?, ?, NOW())
                ");
                $pLogStmt->execute([$userId, $delta, $pointsReason, (int)$admin['id']]);
            }

            // 13. Cập nhật bảng users (nếu có tài khoản)
            if ($currentUser) {
                if ($finalEmail === null) {
                    $finalEmail = (string)($currentUser['email'] ?? ($cleanPhone . '@sanbongpro.local'));
                }
                $uStatus = $isBlacklisted ? 'locked' : ($currentUser['status'] === 'locked' && !$isBlacklisted ? 'active' : $currentUser['status']);
                $updUserStmt = $pdo->prepare("
                    UPDATE users
                    SET full_name = ?,
                        phone = ?,
                        email = ?,
                        admin_note = ?,
                        points = ?,
                        customer_tier = ?,
                        status = ?,
                        version = version + 1,
                        updated_at = NOW()
                    WHERE id = ?
                ");
                $updUserStmt->execute([
                    $fullName,
                    $cleanPhone,
                    $finalEmail,
                    $adminNote,
                    $newPoints,
                    $tier,
                    $uStatus,
                    $userId
                ]);
            }

            // 14. Đồng bộ bảng customer_crm
            $crmUpsert = $pdo->prepare("
                INSERT INTO customer_crm (phone, full_name, customer_tier, admin_note, is_blacklisted, updated_at)
                VALUES (?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                    full_name = VALUES(full_name),
                    customer_tier = VALUES(customer_tier),
                    admin_note = VALUES(admin_note),
                    is_blacklisted = VALUES(is_blacklisted),
                    updated_at = NOW()
            ");
            $crmUpsert->execute([$cleanPhone, $fullName, $tier, $adminNote, $isBlacklisted]);

            // 15. Ghi Audit Log qua AdminLogService
            $oldValues = [
                'full_name'      => $currentUser['full_name'] ?? ($currentCrm['full_name'] ?? ''),
                'phone'          => $cleanPhone,
                'email'          => $currentUser['email'] ?? '',
                'customer_tier'  => $prevTier,
                'admin_note'     => $currentUser['admin_note'] ?? ($currentCrm['admin_note'] ?? ''),
                'is_blacklisted' => $prevBlacklisted ? 1 : 0,
                'points'         => $currentPoints
            ];
            $newValues = [
                'full_name'      => $fullName,
                'phone'          => $cleanPhone,
                'email'          => $finalEmail,
                'customer_tier'  => $tier,
                'admin_note'     => $adminNote,
                'is_blacklisted' => $isBlacklisted,
                'points'         => $newPoints
            ];
            if ($delta !== 0) {
                $newValues['points_delta'] = $delta;
                $newValues['points_reason'] = $pointsReason;
            }
            if ($isBlacklisted && !$prevBlacklisted) {
                $newValues['blacklist_reason'] = $lockReason;
            }
            if ($tier !== $prevTier && $tierReason !== '') {
                $newValues['tier_reason'] = $tierReason;
            }

            require_once __DIR__ . '/services/AdminLogService.php';
            AdminLogService::record(
                $pdo,
                (int)$admin['id'],
                'CRM_CUSTOMER_UPDATE',
                'customer',
                $cleanPhone,
                $oldValues,
                $newValues,
                get_client_ip()
            );

            $pdo->commit();

            json_response([
                'success'     => true,
                'has_changed' => true,
                'message'     => 'Cập nhật hồ sơ khách hàng thành công!',
                'data'        => [
                    'user_id'        => $userId,
                    'phone'          => $cleanPhone,
                    'customer_name'  => $fullName,
                    'full_name'      => $fullName,
                    'email'          => $finalEmail,
                    'customer_tier'  => $tier,
                    'admin_note'     => $adminNote,
                    'is_blacklisted' => (bool)$isBlacklisted,
                    'points'         => $newPoints,
                    'delta'          => $delta,
                    'updated_at'     => (new DateTime('now', new DateTimeZone('Asia/Ho_Chi_Minh')))->format('Y-m-d H:i:s')
                ]
            ]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log("[UPDATE_CUSTOMER ERROR] " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine());
            json_error('Lỗi hệ thống khi cập nhật hồ sơ khách hàng. Vui lòng thử lại sau.', 500, 'ERR_UPDATE_CUSTOMER_FAILED');
        }
    }

    // 5.1 CRM: Tìm kiếm khách hàng / hội viên (hỗ trợ tìm một phần SĐT, chuẩn hóa SĐT, kết hợp users + customer_crm)
    if ($action === 'search_customers' || $action === 'search_members') {
        $rawSearch = trim((string)($_GET['phone'] ?? $_GET['search'] ?? $_GET['q'] ?? $data['phone'] ?? $data['search'] ?? $data['q'] ?? ''));

        if ($rawSearch === '') {
            json_response([
                'success' => true,
                'data'    => [],
                'message' => 'Không tìm thấy hội viên'
            ]);
        }

        // Chuẩn hóa SĐT: bỏ khoảng trắng, dấu chấm, dấu gạch ngang
        $cleanInput = preg_replace('/[\s\.\-]+/', '', $rawSearch);
        $cleanPhone = $cleanInput;
        // Đầu +84 hoặc 84 chuyển thành 0
        if (strpos($cleanPhone, '+84') === 0) {
            $cleanPhone = '0' . substr($cleanPhone, 3);
        } elseif (strpos($cleanPhone, '84') === 0 && strlen($cleanPhone) >= 10) {
            $cleanPhone = '0' . substr($cleanPhone, 2);
        }

        // Lấy các chữ số để tìm kiếm SĐT một phần (VD: '678', '0912')
        $phoneDigits = preg_replace('/[^0-9]/', '', $cleanPhone);
        $phoneParam = $phoneDigits !== '' ? ('%' . $phoneDigits . '%') : '%__NO_PHONE_MATCH__%';
        $textPattern = '%' . $rawSearch . '%';

        // 1. Tìm trong bảng users (chỉ khách hàng, loại bỏ admin/manager/staff/walkin) kết hợp bảng customer_crm
        $uStmt = $pdo->prepare("
            SELECT
                u.id,
                u.id AS user_id,
                u.username,
                u.full_name,
                u.phone,
                u.email,
                u.role,
                u.status,
                u.points,
                COALESCE(c.customer_tier, u.customer_tier, 'standard') AS customer_tier,
                COALESCE(u.admin_note, c.admin_note, '') AS admin_note,
                COALESCE(c.is_blacklisted, 0) AS is_blacklisted,
                u.updated_at,
                u.created_at,
                1 AS is_member
            FROM users u
            LEFT JOIN customer_crm c ON (
                REPLACE(REPLACE(REPLACE(c.phone, ' ', ''), '.', ''), '-', '') = REPLACE(REPLACE(REPLACE(u.phone, ' ', ''), '.', ''), '-', '')
                OR c.phone = u.phone
            )
            WHERE
                u.role NOT IN ('admin', 'manager', 'staff', 'walkin')
                AND u.phone != '0000000000'
                AND (
                    u.full_name LIKE ?
                    OR u.email LIKE ?
                    OR u.phone LIKE ?
                    OR REPLACE(REPLACE(REPLACE(u.phone, ' ', ''), '.', ''), '-', '') LIKE ?
                )
            ORDER BY u.id DESC
            LIMIT 20
        ");
        $uStmt->execute([
            $textPattern,
            $textPattern,
            $phoneParam,
            $phoneParam
        ]);
        $userRows = $uStmt->fetchAll(PDO::FETCH_ASSOC);

        $combined = $userRows;
        $remainingLimit = 20 - count($userRows);

        // 2. Nếu chưa đủ 20 kết quả, tìm thêm khách vãng lai trong customer_crm (chưa tạo tài khoản users)
        if ($remainingLimit > 0) {
            $crmSearchStmt = $pdo->prepare("
                SELECT
                    NULL AS id,
                    NULL AS user_id,
                    NULL AS username,
                    c.full_name,
                    c.phone,
                    NULL AS email,
                    'guest' AS role,
                    'active' AS status,
                    0 AS points,
                    c.customer_tier,
                    c.admin_note,
                    c.is_blacklisted,
                    c.updated_at,
                    c.created_at,
                    0 AS is_member
                FROM customer_crm c
                WHERE c.phone != '0000000000'
                AND (
                    c.full_name LIKE ?
                    OR c.phone LIKE ?
                    OR REPLACE(REPLACE(REPLACE(c.phone, ' ', ''), '.', ''), '-', '') LIKE ?
                )
                AND NOT EXISTS (
                    SELECT 1 FROM users u WHERE
                        (REPLACE(REPLACE(REPLACE(u.phone, ' ', ''), '.', ''), '-', '') = REPLACE(REPLACE(REPLACE(c.phone, ' ', ''), '.', ''), '-', '')
                        OR u.phone = c.phone)
                )
                ORDER BY c.id DESC
                LIMIT " . (int)$remainingLimit . "
            ");
            $crmSearchStmt->execute([
                $textPattern,
                $phoneParam,
                $phoneParam
            ]);
            $crmRows = $crmSearchStmt->fetchAll(PDO::FETCH_ASSOC);
            $combined = array_merge($combined, $crmRows);
        }

        if (empty($combined)) {
            json_response([
                'success' => true,
                'data'    => [],
                'message' => 'Không tìm thấy hội viên'
            ]);
        }

        // Định dạng danh sách kết quả
        $list = [];
        $phonesForStats = [];
        foreach ($combined as $r) {
            $rawP = (string)($r['phone'] ?? '');
            $normP = normalize_phone($rawP);
            if ($normP !== '') {
                $phonesForStats[] = $normP;
            }
            $list[] = [
                'id'             => $r['id'] !== null ? (int)$r['id'] : null,
                'user_id'        => $r['user_id'] !== null ? (int)$r['user_id'] : null,
                'username'       => (string)($r['username'] ?? ''),
                'full_name'      => (string)($r['full_name'] ?? ''),
                'customer_name'  => (string)($r['full_name'] ?? ''),
                'name'           => (string)($r['full_name'] ?? ''),
                'phone'          => $rawP,
                'clean_phone'    => $normP,
                'email'          => (string)($r['email'] ?? ''),
                'role'           => (string)($r['role'] ?? 'user'),
                'status'         => (string)($r['status'] ?? 'active'),
                'points'         => (int)($r['points'] ?? 0),
                'customer_tier'  => (string)($r['customer_tier'] ?? 'standard'),
                'admin_note'     => (string)($r['admin_note'] ?? ''),
                'is_blacklisted' => !empty($r['is_blacklisted']),
                'is_member'      => !empty($r['is_member']),
                'updated_at'     => (string)($r['updated_at'] ?? ''),
                'created_at'     => (string)($r['created_at'] ?? ''),
                'total_bookings' => 0,
                'completed_count'=> 0,
                'noshow_count'   => 0,
                'total_spent'    => 0,
                'last_booking_date' => ''
            ];
        }

        // Lấy thống kê đơn đặt sân cho các số điện thoại tìm được
        $phonesForStats = array_unique($phonesForStats);
        if (!empty($phonesForStats)) {
            $phList = implode(',', array_fill(0, count($phonesForStats), '?'));
            $cleanPhoneExpr = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(b.phone), ' ', ''), '.', ''), '-', ''), '+', ''), '(', ''), ')', ''), CHAR(9), '')";
            $normalizedPhoneExpr = "CASE
                WHEN CHAR_LENGTH({$cleanPhoneExpr}) = 11 AND LEFT({$cleanPhoneExpr}, 2) = '84'
                THEN CONCAT('0', SUBSTRING({$cleanPhoneExpr}, 3))
                ELSE {$cleanPhoneExpr}
            END";
            $bStmt = $pdo->prepare("
                SELECT
                    {$normalizedPhoneExpr} AS clean_phone,
                    COUNT(*) AS total_bookings,
                    COALESCE(SUM(CASE WHEN b.status = 'completed' OR b.status = 'Hoàn thành' THEN 1 ELSE 0 END), 0) AS completed_count,
                    COALESCE(SUM(CASE WHEN b.status = 'Khách chưa đến' OR b.payment_status = 'Tịch thu cọc 30%' THEN 1 ELSE 0 END), 0) AS noshow_count,
                    COALESCE(SUM(CASE WHEN b.payment_status IN ('Đã cọc 30%', 'Đã thanh toán đủ', 'Đã thanh toán 100%') THEN b.paid_amount ELSE 0 END), 0) AS total_spent,
                    MAX(b.booking_date) AS last_booking_date
                FROM bookings b
                WHERE {$normalizedPhoneExpr} IN ({$phList})
                    AND COALESCE(b.status, '') <> 'Đã hủy'
                GROUP BY {$normalizedPhoneExpr}
            ");
            $bStmt->execute(array_values($phonesForStats));
            $statsMap = [];
            foreach ($bStmt->fetchAll(PDO::FETCH_ASSOC) as $sRow) {
                $statsMap[$sRow['clean_phone']] = $sRow;
            }
            foreach ($list as &$item) {
                $cp = $item['clean_phone'];
                if (isset($statsMap[$cp])) {
                    $item['total_bookings']  = (int)($statsMap[$cp]['total_bookings'] ?? 0);
                    $item['completed_count'] = (int)($statsMap[$cp]['completed_count'] ?? 0);
                    $item['noshow_count']    = (int)($statsMap[$cp]['noshow_count'] ?? 0);
                    $item['total_spent']     = (int)($statsMap[$cp]['total_spent'] ?? 0);
                    $item['last_booking_date'] = (string)($statsMap[$cp]['last_booking_date'] ?? '');
                }
            }
            unset($item);
        }

        json_response([
            'success' => true,
            'data'    => $list,
            'message' => 'Tìm thấy ' . count($list) . ' khách hàng'
        ]);
    }

    require_once __DIR__ . '/services/admin_recurring_waitlist.php';
    if (handle_admin_recurring_waitlist($action, $method, $pdo, $data, $actor)) {
        exit;
    }

    require_once __DIR__ . '/services/admin_pricing_packages.php';
    if (handle_admin_pricing_packages($action, $method, $pdo, $data, $actor)) {
        exit;
    }

    require_once __DIR__ . '/services/admin_maintenance_vouchers.php';
    if (handle_admin_maintenance_vouchers($action, $method, $pdo, $data, $actor)) {
        exit;
    }

    if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'admin_crm.php') {
        json_response(['success' => false, 'message' => 'Hành động quản trị CRM không hợp lệ.'], 400);
    }

