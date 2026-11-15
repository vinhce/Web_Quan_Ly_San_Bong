<?php

if (!defined('SANBONG_ADMIN_ROUTER')) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'Direct access forbidden.', 'ref_code' => 'ERR_FORBIDDEN'], JSON_UNESCAPED_UNICODE);
    exit;
}

    // ===============================================================
    // GIAI ĐOẠN 5: KHÁCH HÀNG VÀ DOANH THU (CRM, LỊCH LẶP, WAITLIST, GIỜ VÀNG, VOUCHER)
    // ===============================================================

    // 5.1 CRM: Danh sách tổng hợp khách hàng từ DB + CRM
    if ($action === 'crm_customers') {
        $search = trim(sanitize_string($_GET['search'] ?? '', 100));
        $tierFilter = sanitize_string($_GET['tier'] ?? 'all', 30);

        $aggStmt = $pdo->query("
            SELECT
                REPLACE(REPLACE(REPLACE(b.phone, ' ', ''), '.', ''), '-', '') AS clean_phone,
                MAX(b.phone) AS raw_phone,
                SUBSTRING_INDEX(GROUP_CONCAT(b.customer_name ORDER BY b.id DESC SEPARATOR '|||'), '|||', 1) AS latest_name,
                COUNT(*) AS total_bookings,
                COALESCE(SUM(CASE WHEN b.status = 'Hoàn thành' OR b.payment_status IN ('Đã thanh toán đủ', 'Đã thanh toán 100%') THEN 1 ELSE 0 END), 0) AS completed_count,
                COALESCE(SUM(CASE WHEN b.status = 'Khách chưa đến' OR b.payment_status = 'Tịch thu cọc 30%' THEN 1 ELSE 0 END), 0) AS noshow_count,
                COALESCE(SUM(CASE WHEN b.payment_status IN ('Đã cọc 30%', 'Đã thanh toán đủ', 'Đã thanh toán 100%') THEN b.paid_amount ELSE 0 END), 0) AS total_spent,
                COALESCE(SUM(CASE WHEN b.remaining_amount > 0 AND b.status NOT IN ('Đã hủy', 'Khách chưa đến') AND b.payment_status NOT IN ('Đã hủy', 'Tịch thu cọc 30%', 'Đã hoàn cọc 100%', 'Bảo lưu cọc 30%', 'Phạt 50% cọc') THEN b.remaining_amount ELSE 0 END), 0) AS debt_amount,
                MAX(b.booking_date) AS last_booking_date
            FROM bookings b
            WHERE b.phone IS NOT NULL AND TRIM(b.phone) != ''
            GROUP BY REPLACE(REPLACE(REPLACE(b.phone, ' ', ''), '.', ''), '-', '')
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

            $customersByPhone[$cp] = [
                'phone'           => $cp,
                'customerName'    => trim((string)($crm['full_name'] ?? '')) ?: (string)$row['latest_name'],
                'customerTier'    => $tier,
                'adminNote'       => (string)($crm['admin_note'] ?? ''),
                'isBlacklisted'   => !empty($crm['is_blacklisted']),
                'totalBookings'   => (int)$row['total_bookings'],
                'completedCount'  => $completedCount,
                'noShowCount'     => $noShowCount,
                'totalSpent'      => $totalSpent,
                'debtAmount'      => (int)$row['debt_amount'],
                'points'          => (int)($userPoints[$cp] ?? 0),
                'lastBookingDate' => (string)($row['last_booking_date'] ?? '')
            ];
        }

        foreach ($crmRows as $cp => $crm) {
            if (!isset($customersByPhone[$cp])) {
                $customersByPhone[$cp] = [
                    'phone'           => $cp,
                    'customerName'    => (string)($crm['full_name'] ?? 'Khách CRM'),
                    'customerTier'    => (string)($crm['customer_tier'] ?? 'standard'),
                    'adminNote'       => (string)($crm['admin_note'] ?? ''),
                    'isBlacklisted'   => !empty($crm['is_blacklisted']),
                    'totalBookings'   => 0,
                    'completedCount'  => 0,
                    'noShowCount'     => 0,
                    'totalSpent'      => 0,
                    'debtAmount'      => 0,
                    'points'          => (int)($userPoints[$cp] ?? 0),
                    'lastBookingDate' => ''
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

        write_audit_log(
            $pdo,
            'CRM_UPDATE',
            $cleanPhone,
            null,
            "Cập nhật hồ sơ KH {$cleanPhone} ({$customerName}): Hạng={$tier}, Blacklist=" . ($isBlacklisted ? 'Có' : 'Không') . " | Note: {$adminNote}",
            $actor
        );

        json_response([
            'success' => true,
            'message' => 'Cập nhật hồ sơ khách hàng thành công!'
        ]);
    }

    require_once __DIR__ . '/services/admin_recurring_waitlist.php';
    if (handle_admin_recurring_waitlist($action, $method, $pdo, $data, $actor)) {
        exit;
    }

    require_once __DIR__ . '/services/admin_maintenance_vouchers.php';
    if (handle_admin_maintenance_vouchers($action, $method, $pdo, $data, $actor)) {
        exit;
    }

