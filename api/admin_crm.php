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

    // 5.1 CRM: Danh sách tổng hợp khách hàng từ DB + CRM
    if ($action === 'crm_customers') {
        $search = trim(sanitize_string($_GET['search'] ?? '', 100));
        $tierFilter = sanitize_string($_GET['tier'] ?? 'all', 30);
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
                COALESCE(SUM(CASE WHEN b.status = 'Hoàn thành' THEN 1 ELSE 0 END), 0) AS completed_count,
                COALESCE(SUM(CASE WHEN b.status = 'Khách chưa đến' OR b.payment_status = 'Tịch thu cọc 30%' THEN 1 ELSE 0 END), 0) AS noshow_count,
                COALESCE(SUM(CASE WHEN b.payment_status IN ('Đã cọc 30%', 'Đã thanh toán đủ', 'Đã thanh toán 100%') THEN b.paid_amount ELSE 0 END), 0) AS total_spent,
                COALESCE(SUM(CASE WHEN b.remaining_amount > 0 AND b.status NOT IN ('Đã hủy', 'Khách chưa đến') AND b.payment_status NOT IN ('Đã hủy', 'Tịch thu cọc 30%', 'Đã hoàn cọc 100%', 'Bảo lưu cọc 30%', 'Phạt 50% cọc') THEN b.remaining_amount ELSE 0 END), 0) AS debt_amount,
                MAX(b.booking_date) AS last_booking_date
            FROM bookings b
            WHERE b.phone IS NOT NULL AND TRIM(b.phone) != ''
                AND COALESCE(b.status, '') <> 'Đã hủy'
            GROUP BY {$normalizedPhoneExpr}
        ");
        $aggRows = $aggStmt ? $aggStmt->fetchAll() : [];

        $crmRows = [];
        $crmAllStmt = $pdo->query("SELECT * FROM customer_crm");
        if ($crmAllStmt) {
            foreach ($crmAllStmt->fetchAll() as $cr) {
                $cp = normalize_phone((string)$cr['phone']);
                if ($cp !== '') {
                    $crmRows[$cp] = $cr;
                }
            }
        }

        $userPoints = [];
        if (db_table_has_column($pdo, 'users', 'points')) {
            $userStmt = $pdo->query("SELECT phone, points FROM users WHERE phone IS NOT NULL AND TRIM(phone) != ''");
            if ($userStmt) {
                foreach ($userStmt->fetchAll() as $ur) {
                    $up = normalize_phone((string)$ur['phone']);
                    if ($up !== '') {
                        $userPoints[$up] = max($userPoints[$up] ?? 0, (int)($ur['points'] ?? 0));
                    }
                }
            }
        }

        $tz = new DateTimeZone('Asia/Ho_Chi_Minh');
        $todayStr = (new DateTime('today', $tz))->format('Y-m-d');
        $todayTs = strtotime($todayStr);

        $customersByPhone = [];
        foreach ($aggRows as $row) {
            $cp = normalize_phone((string)($row['clean_phone'] ?: $row['raw_phone']));
            if ($cp === '') {
                continue;
            }
            $crm = $crmRows[$cp] ?? null;
            $noShowCount    = (int)$row['noshow_count'];
            $totalSpent     = (int)$row['total_spent'];
            $completedCount = (int)$row['completed_count'];

            $tier = $crm['customer_tier'] ?? '';
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

            $customersByPhone[$cp] = [
                'phone'               => $cp,
                'customerName'        => trim((string)($crm['full_name'] ?? '')) ?: (string)$row['latest_name'],
                'customerTier'        => $tier,
                'adminNote'           => (string)($crm['admin_note'] ?? ''),
                'isBlacklisted'       => !empty($crm['is_blacklisted']),
                'totalBookings'       => (int)$row['total_bookings'],
                'completedCount'      => (int)$completedCount,
                'noShowCount'         => (int)$noShowCount,
                'totalSpent'          => $totalSpent,
                'debtAmount'          => (int)$row['debt_amount'],
                'points'              => (int)($userPoints[$cp] ?? 0),
                'lastBookingDate'     => (string)($row['last_booking_date'] ?? ''),
                'lastBookingRelative' => $lastBookingRelative
            ];
        }

        foreach ($crmRows as $cp => $crm) {
            if (!isset($customersByPhone[$cp])) {
                $customersByPhone[$cp] = [
                    'phone'               => $cp,
                    'customerName'        => (string)($crm['full_name'] ?? 'Khách CRM'),
                    'customerTier'        => (string)($crm['customer_tier'] ?? 'standard'),
                    'adminNote'           => (string)($crm['admin_note'] ?? ''),
                    'isBlacklisted'       => !empty($crm['is_blacklisted']),
                    'totalBookings'       => 0,
                    'completedCount'      => 0,
                    'noShowCount'         => 0,
                    'totalSpent'          => 0,
                    'debtAmount'          => 0,
                    'points'              => (int)($userPoints[$cp] ?? 0),
                    'lastBookingDate'     => '',
                    'lastBookingRelative' => '—'
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
                if ($tierFilter === 'debt') {
                    return (int)($c['debtAmount'] ?? 0) > 0;
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
        $debtAmount = 0;
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
            if ($status === 'Hoàn thành' || $pStatus === 'Đã thanh toán đủ' || $pStatus === 'Đã thanh toán 100%') {
                $completedCount++;
            }
            if ($status === 'Đã hủy' || strpos($pStatus, 'hủy') !== false || strpos($pStatus, 'hoàn') !== false) {
                $cancelledCount++;
            }
            if ($status === 'Khách chưa đến' || $pStatus === 'Tịch thu cọc 30%') {
                $noShowCount++;
            }
            if ((int)($b['remaining_amount'] ?? 0) > 0 && !in_array($status, ['Đã hủy', 'Khách chưa đến'], true) && !in_array($pStatus, ['Đã hủy', 'Tịch thu cọc 30%', 'Đã hoàn cọc 100%', 'Bảo lưu cọc 30%', 'Phạt 50% cọc'], true)) {
                $debtAmount += (int)$b['remaining_amount'];
            }
        }

        $crmStmt = $pdo->prepare("SELECT * FROM customer_crm WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', '') = ? OR phone = ? LIMIT 1");
        $crmStmt->execute([$cleanPhone, $cleanPhone]);
        $crm = $crmStmt->fetch();

        $tier = $crm['customer_tier'] ?? 'standard';
        if (!$crm) {
            if ($noShowCount >= 2) {
                $tier = 'warning_noshow';
            } elseif ($totalSpent >= 2000000 || $completedCount >= 5) {
                $tier = 'vip';
            } elseif ($completedCount >= 2) {
                $tier = 'regular';
            }
        }

        $userPoints = 0;
        if (db_table_has_column($pdo, 'users', 'points')) {
            $uStmt = $pdo->prepare("SELECT points FROM users WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', '') = ? OR phone = ? ORDER BY points DESC LIMIT 1");
            $uStmt->execute([$cleanPhone, $cleanPhone]);
            $uRow = $uStmt->fetch();
            if ($uRow) {
                $userPoints = (int)($uRow['points'] ?? 0);
            }
        }

        json_response([
            'success' => true,
            'data'    => [
                'phone'          => $cleanPhone,
                'customerName'   => (!empty($crm['full_name']) ? $crm['full_name'] : $latestName),
                'customerTier'   => $tier,
                'adminNote'      => $crm['admin_note'] ?? '',
                'isBlacklisted'  => !empty($crm['is_blacklisted']),
                'totalSpent'     => $totalSpent,
                'totalBookings'  => $totalBookings,
                'completedCount' => $completedCount,
                'cancelledCount' => $cancelledCount,
                'noShowCount'    => $noShowCount,
                'debtAmount'     => $debtAmount,
                'points'         => $userPoints,
                'bookings'       => array_map('admin_map_booking', $bookings)
            ]
        ]);
    }

    // 5.1 CRM: Cập nhật phân hạng và ghi chú khách hàng
    if ($action === 'update_customer_crm') {
        require_manager_or_admin($pdo);
        $phone = sanitize_string($data['phone'] ?? '', 25);
        $cleanPhone = normalize_phone($phone);
        $customerName = sanitize_string($data['customer_name'] ?? $data['customerName'] ?? '', 100);
        $tier = sanitize_string($data['customer_tier'] ?? $data['customerTier'] ?? 'standard', 30);
        $adminNote = sanitize_string($data['admin_note'] ?? $data['adminNote'] ?? '', 500);
        $isBlacklisted = !empty($data['is_blacklisted']) ? 1 : 0;

        if ($cleanPhone === '' || !preg_match('/^[0-9]{8,12}$/', $cleanPhone)) {
            json_error('Số điện thoại khách hàng không hợp lệ.', 400, 'ERR_MISSING_PHONE');
        }
        if (!in_array($tier, ['standard', 'regular', 'vip', 'warning_noshow'], true)) {
            json_error('Phân hạng khách hàng không hợp lệ.', 400, 'ERR_INVALID_TIER');
        }

        $oldStmt = $pdo->prepare("SELECT full_name, customer_tier, admin_note, is_blacklisted FROM customer_crm WHERE phone = ? LIMIT 1");
        $oldStmt->execute([$cleanPhone]);
        $oldCrm = $oldStmt->fetch(PDO::FETCH_ASSOC);

        if ($oldCrm) {
            $oldComp = [
                'full_name'      => $oldCrm['full_name'] ?? '',
                'customer_tier'  => $oldCrm['customer_tier'] ?? 'standard',
                'admin_note'     => $oldCrm['admin_note'] ?? '',
                'is_blacklisted' => (int)($oldCrm['is_blacklisted'] ?? 0)
            ];
            $newComp = [
                'full_name'      => $customerName,
                'customer_tier'  => $tier,
                'admin_note'     => $adminNote,
                'is_blacklisted' => $isBlacklisted
            ];
            $crmDiff = logAdminChange($pdo, 'CRM_UPDATE', $oldComp, $newComp, $cleanPhone, 'customer', $actor);
            if (!$crmDiff['has_change']) {
                json_response([
                    'success'     => true,
                    'has_changed' => false,
                    'message'     => "Không có thay đổi để lưu cho khách hàng {$cleanPhone}."
                ]);
            }
        }

        $stmt = $pdo->prepare("
            INSERT INTO customer_crm (phone, full_name, customer_tier, admin_note, is_blacklisted, updated_at)
            VALUES (?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
                full_name = VALUES(full_name),
                customer_tier = VALUES(customer_tier),
                admin_note = VALUES(admin_note),
                is_blacklisted = VALUES(is_blacklisted),
                updated_at = NOW()
        ");
        $stmt->execute([$cleanPhone, $customerName, $tier, $adminNote, $isBlacklisted]);

        if (!$oldCrm) {
            write_audit_log(
                $pdo,
                'CRM_UPDATE',
                $cleanPhone,
                null,
                "Tạo mới hồ sơ KH {$cleanPhone} ({$customerName}): Hạng={$tier}, Blacklist=" . ($isBlacklisted ? 'Có' : 'Không') . " | Note: {$adminNote}",
                $actor
            );
        }

        json_response([
            'success'     => true,
            'has_changed' => true,
            'message'     => 'Cập nhật hồ sơ khách hàng thành công!'
        ]);
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

        // 1. Tìm trong bảng users (ưu tiên hội viên role='user') kết hợp bảng customer_crm
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
                u.full_name LIKE ?
                OR u.email LIKE ?
                OR u.phone LIKE ?
                OR REPLACE(REPLACE(REPLACE(u.phone, ' ', ''), '.', ''), '-', '') LIKE ?
            ORDER BY
                (CASE WHEN u.role = 'user' THEN 0 ELSE 1 END),
                u.id DESC
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
                WHERE (
                    c.full_name LIKE ?
                    OR c.phone LIKE ?
                    OR REPLACE(REPLACE(REPLACE(c.phone, ' ', ''), '.', ''), '-', '') LIKE ?
                )
                AND NOT EXISTS (
                    SELECT 1 FROM users u WHERE
                        REPLACE(REPLACE(REPLACE(u.phone, ' ', ''), '.', ''), '-', '') = REPLACE(REPLACE(REPLACE(c.phone, ' ', ''), '.', ''), '-', '')
                        OR u.phone = c.phone
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
                'debt_amount'    => 0,
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
                    COALESCE(SUM(CASE WHEN b.status = 'Hoàn thành' THEN 1 ELSE 0 END), 0) AS completed_count,
                    COALESCE(SUM(CASE WHEN b.status = 'Khách chưa đến' OR b.payment_status = 'Tịch thu cọc 30%' THEN 1 ELSE 0 END), 0) AS noshow_count,
                    COALESCE(SUM(CASE WHEN b.payment_status IN ('Đã cọc 30%', 'Đã thanh toán đủ', 'Đã thanh toán 100%') THEN b.paid_amount ELSE 0 END), 0) AS total_spent,
                    COALESCE(SUM(CASE WHEN b.remaining_amount > 0 AND b.status NOT IN ('Đã hủy', 'Khách chưa đến') AND b.payment_status NOT IN ('Đã hủy', 'Tịch thu cọc 30%', 'Đã hoàn cọc 100%', 'Bảo lưu cọc 30%', 'Phạt 50% cọc') THEN b.remaining_amount ELSE 0 END), 0) AS debt_amount,
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
                    $item['debt_amount']     = (int)($statsMap[$cp]['debt_amount'] ?? 0);
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

    // 5.1 CRM: Admin cập nhật thông tin hội viên (họ tên, SĐT, email, điểm tích lũy, ghi chú)
    if ($action === 'update_member') {
        if (strtoupper($method) !== 'POST') {
            json_error('Hành động yêu cầu phương thức POST.', 405, 'ERR_METHOD_NOT_ALLOWED');
        }

        // Chỉ Admin được sửa hội viên
        $admin = require_admin($pdo);

        $userId = (int)($data['user_id'] ?? $data['id'] ?? 0);
        if ($userId <= 0) {
            json_error('Thiếu mã định danh hội viên (user_id).', 400, 'ERR_MISSING_USER_ID');
        }

        // 1. Validate họ tên
        $fullName = trim(sanitize_string($data['full_name'] ?? $data['name'] ?? $data['customer_name'] ?? '', 100));
        if ($fullName === '') {
            json_error('Họ tên hội viên không được để trống.', 400, 'ERR_EMPTY_NAME');
        }
        if (mb_strlen($fullName) > 100) {
            json_error('Họ tên không được vượt quá 100 ký tự.', 400, 'ERR_NAME_TOO_LONG');
        }

        // 2. Validate & chuẩn hóa SĐT
        $rawPhone = trim((string)($data['phone'] ?? ''));
        $cleanPhone = preg_replace('/[\s\.\-]+/', '', $rawPhone);
        if (strpos($cleanPhone, '+84') === 0) {
            $cleanPhone = '0' . substr($cleanPhone, 3);
        } elseif (strpos($cleanPhone, '84') === 0 && strlen($cleanPhone) >= 10) {
            $cleanPhone = '0' . substr($cleanPhone, 2);
        }

        if (!preg_match('/^(0[35789])[0-9]{8}$/', $cleanPhone)) {
            json_error('Số điện thoại không hợp lệ. Vui lòng nhập SĐT Việt Nam 10 chữ số (bắt đầu bằng 03, 05, 07, 08, 09).', 400, 'ERR_INVALID_PHONE');
        }

        // Kiểm tra không trùng SĐT với hội viên khác trong bảng users
        $chkPhoneStmt = $pdo->prepare("
            SELECT id FROM users
            WHERE (phone = ? OR REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', '') = ?)
              AND id != ?
            LIMIT 1
        ");
        $chkPhoneStmt->execute([$cleanPhone, $cleanPhone, $userId]);
        if ($chkPhoneStmt->fetch()) {
            json_error('Số điện thoại này đã được sử dụng bởi hội viên khác!', 400, 'ERR_DUPLICATE_PHONE');
        }

        // 3. Validate email (nếu có nhập)
        $rawEmail = trim((string)($data['email'] ?? ''));
        $finalEmail = null;
        if ($rawEmail !== '') {
            $emailInput = strtolower(sanitize_string($rawEmail, 100));
            if (!filter_var($emailInput, FILTER_VALIDATE_EMAIL)) {
                json_error('Định dạng email không hợp lệ.', 400, 'ERR_INVALID_EMAIL');
            }
            $chkEmailStmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1");
            $chkEmailStmt->execute([$emailInput, $userId]);
            if ($chkEmailStmt->fetch()) {
                json_error('Email này đã được sử dụng bởi hội viên khác!', 400, 'ERR_DUPLICATE_EMAIL');
            }
            $finalEmail = $emailInput;
        }

        // 4. Validate ghi chú & điểm tích lũy
        $adminNote = trim(sanitize_string($data['admin_note'] ?? $data['adminNote'] ?? '', 1000));
        $hasPointsField = isset($data['points']) || isset($data['new_points']);
        $rawPoints = $data['points'] ?? $data['new_points'] ?? null;
        $newPoints = null;

        if ($hasPointsField && $rawPoints !== null && $rawPoints !== '') {
            if (!is_numeric($rawPoints)) {
                json_error('Điểm tích lũy phải là số nguyên hợp lệ.', 400, 'ERR_INVALID_POINTS');
            }
            $newPoints = (int)$rawPoints;
            if ($newPoints < 0) {
                json_error('Điểm tích lũy không được âm.', 400, 'ERR_NEGATIVE_POINTS');
            }
            if ($newPoints > 10000000) {
                json_error('Điểm tích lũy không được vượt quá 10.000.000 điểm.', 400, 'ERR_POINTS_TOO_HIGH');
            }
        }

        $pointsReason = trim(sanitize_string($data['points_reason'] ?? $data['reason'] ?? '', 200));

        // 5. Bắt đầu Transaction & Khóa dòng FOR UPDATE
        $pdo->beginTransaction();
        try {
            $lockStmt = $pdo->prepare("SELECT * FROM users WHERE id = ? FOR UPDATE");
            $lockStmt->execute([$userId]);
            $currentUser = $lockStmt->fetch(PDO::FETCH_ASSOC);

            if (!$currentUser) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                json_error('Không tìm thấy hội viên cần cập nhật.', 404, 'ERR_USER_NOT_FOUND');
            }

            // Nếu không gửi email mới thì giữ nguyên email hiện tại của hội viên
            if ($finalEmail === null) {
                $finalEmail = (string)($currentUser['email'] ?? '');
            }

            // Kiểm tra phiên bản chống race condition (concurrency conflict)
            $clientUpdatedAt = trim((string)($data['updated_at'] ?? ''));
            if ($clientUpdatedAt !== '') {
                $dbUpdatedAt = trim((string)($currentUser['updated_at'] ?? ''));
                if ($dbUpdatedAt !== '') {
                    $clientTs = strtotime($clientUpdatedAt);
                    $dbTs = strtotime($dbUpdatedAt);
                    if ($clientTs !== false && $dbTs !== false) {
                        if (abs($clientTs - $dbTs) > 1) {
                            if ($pdo->inTransaction()) {
                                $pdo->rollBack();
                            }
                            json_error(
                                'Dữ liệu hội viên vừa được cập nhật bởi quản trị viên khác. Vui lòng tải lại trang để xem thông tin mới nhất.',
                                409,
                                'ERR_CONCURRENCY_CONFLICT'
                            );
                        }
                    } elseif ($clientUpdatedAt !== $dbUpdatedAt) {
                        if ($pdo->inTransaction()) {
                            $pdo->rollBack();
                        }
                        json_error(
                            'Dữ liệu hội viên vừa được cập nhật bởi quản trị viên khác. Vui lòng tải lại trang để xem thông tin mới nhất.',
                            409,
                            'ERR_CONCURRENCY_CONFLICT'
                        );
                    }
                }
            }

            // Tính toán biến động điểm delta
            $currentPoints = (int)($currentUser['points'] ?? 0);
            if ($newPoints === null) {
                $newPoints = $currentPoints;
            }
            $delta = $newPoints - $currentPoints;

            $oldValues = [
                'full_name'  => (string)($currentUser['full_name'] ?? ''),
                'phone'      => (string)($currentUser['phone'] ?? ''),
                'email'      => (string)($currentUser['email'] ?? ''),
                'admin_note' => (string)($currentUser['admin_note'] ?? ''),
                'points'     => $currentPoints
            ];
            $newValues = [
                'full_name'  => $fullName,
                'phone'      => $cleanPhone,
                'email'      => $finalEmail,
                'admin_note' => $adminNote,
                'points'     => $newPoints
            ];
            if ($delta !== 0) {
                $newValues['points_reason'] = $pointsReason;
            }

            // Yêu cầu 1, 2, 3: Kiểm tra thay đổi trước khi UPDATE DB
            $memberDiff = audit_log_extract_changes($oldValues, $newValues);
            if ($memberDiff !== null && !$memberDiff['has_change']) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                json_response([
                    'success'     => true,
                    'has_changed' => false,
                    'message'     => "Không có thay đổi để lưu cho hội viên {$cleanPhone}.",
                    'data'        => [
                        'id'         => $userId,
                        'user_id'    => $userId,
                        'full_name'  => $fullName,
                        'phone'      => $cleanPhone,
                        'email'      => $finalEmail,
                        'admin_note' => $adminNote,
                        'points'     => $currentPoints,
                        'delta'      => 0,
                        'updated_at' => (string)($currentUser['updated_at'] ?? '')
                    ]
                ]);
            }

            if ($delta !== 0) {
                if ($pointsReason === '') {
                    if ($pdo->inTransaction()) {
                        $pdo->rollBack();
                    }
                    json_error('Vui lòng nhập lý do điều chỉnh điểm tích lũy của hội viên.', 400, 'ERR_MISSING_POINTS_REASON');
                }

                // Ghi 1 dòng vào bảng points_log
                $nowStr = (new DateTime('now', new DateTimeZone('Asia/Ho_Chi_Minh')))->format('Y-m-d H:i:s');
                $fullReason = "Admin điều chỉnh: " . $pointsReason;
                $hasAdminId = db_table_has_column($pdo, 'points_log', 'admin_id');
                if ($hasAdminId) {
                    $pLogStmt = $pdo->prepare("
                        INSERT INTO points_log (user_id, booking_id, delta, reason, admin_id, created_at)
                        VALUES (?, NULL, ?, ?, ?, ?)
                    ");
                    $pLogStmt->execute([$userId, $delta, $fullReason, (int)$admin['id'], $nowStr]);
                } else {
                    $pLogStmt = $pdo->prepare("
                        INSERT INTO points_log (user_id, booking_id, delta, reason, created_at)
                        VALUES (?, NULL, ?, ?, ?)
                    ");
                    $pLogStmt->execute([$userId, $delta, $fullReason, $nowStr]);
                }
            }

            // Cập nhật bảng users (Tuyệt đối không đụng password_hash hay totp)
            $updateUserStmt = $pdo->prepare("
                UPDATE users
                SET full_name = ?,
                    phone = ?,
                    email = ?,
                    admin_note = ?,
                    points = ?,
                    updated_at = NOW()
                WHERE id = ?
            ");
            $updateUserStmt->execute([
                $fullName,
                $cleanPhone,
                $finalEmail,
                $adminNote,
                $newPoints,
                $userId
            ]);

            // Đồng bộ cập nhật bảng customer_crm
            $crmUpsert = $pdo->prepare("
                INSERT INTO customer_crm (phone, full_name, admin_note, updated_at)
                VALUES (?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                    full_name = VALUES(full_name),
                    admin_note = VALUES(admin_note),
                    updated_at = NOW()
            ");
            $crmUpsert->execute([$cleanPhone, $fullName, $adminNote]);

            // Nếu đổi SĐT, dọn bản ghi customer_crm cũ nếu có
            $oldPhone = (string)($currentUser['phone'] ?? '');
            $oldCleanPhone = normalize_phone($oldPhone);
            if ($oldCleanPhone !== '' && $oldCleanPhone !== $cleanPhone) {
                $pdo->prepare("
                    DELETE FROM customer_crm
                    WHERE phone = ? OR REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', '') = ?
                ")->execute([$oldCleanPhone, $oldCleanPhone]);
            }

            // Ghi đúng một dòng nhật ký qua AdminLogService::record
            require_once __DIR__ . '/services/AdminLogService.php';

            AdminLogService::record(
                $pdo,
                (int)$admin['id'],
                'UPDATE_MEMBER',
                'user',
                $cleanPhone,
                $oldValues,
                $newValues,
                get_client_ip()
            );

            // Commit transaction
            $pdo->commit();

            json_response([
                'success'     => true,
                'has_changed' => true,
                'message'     => 'Cập nhật thông tin hội viên thành công!',
                'data'        => [
                    'id'         => $userId,
                    'user_id'    => $userId,
                    'full_name'  => $fullName,
                    'phone'      => $cleanPhone,
                    'email'      => $finalEmail,
                    'admin_note' => $adminNote,
                    'points'     => $newPoints,
                    'delta'      => $delta,
                    'updated_at' => (new DateTime('now', new DateTimeZone('Asia/Ho_Chi_Minh')))->format('Y-m-d H:i:s')
                ]
            ]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log("[UPDATE_MEMBER ERROR] " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine());
            json_error('Lỗi khi cập nhật hội viên: ' . $e->getMessage(), 500, 'ERR_UPDATE_MEMBER_FAILED');
        }
    }

    require_once __DIR__ . '/services/admin_recurring_waitlist.php';
    if (handle_admin_recurring_waitlist($action, $method, $pdo, $data, $actor)) {
        exit;
    }

    require_once __DIR__ . '/services/admin_maintenance_vouchers.php';
    if (handle_admin_maintenance_vouchers($action, $method, $pdo, $data, $actor)) {
        exit;
    }

    if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'admin_crm.php') {
        json_response(['success' => false, 'message' => 'Hành động quản trị CRM không hợp lệ.'], 400);
    }

