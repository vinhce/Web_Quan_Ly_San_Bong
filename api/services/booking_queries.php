<?php
// Dịch vụ tra cứu đơn đặt sân, kiểm tra slot trống và No-Show
function handle_booking_query(string $action, ?PDO $pdo): bool {
    if ($action === 'check_phone_noshow') {
        if ($pdo && !check_rate_limit($pdo, 'check_noshow', 30, 300)) {
            json_error('Bạn tra cứu quá nhanh. Vui lòng thử lại sau.', 429, 'ERR_RATE_LIMITED');
        }
        if ($pdo) {
            increment_rate_limit($pdo, 'check_noshow');
        }
        $rawPhone = sanitize_string($_GET['phone'] ?? '', 25);
        $cleanPhone = normalize_phone($rawPhone);
        $currentUser = get_authenticated_user($pdo);
        if (!is_portal_operator($currentUser)) {
            json_response([
                'success' => true,
                'data'    => [
                    'phone' => $cleanPhone, 'noShowCount' => 0, 'warning' => false, 'restricted' => true,
                    'totalBookings' => 0
                ]
            ]);
        }
        if ($cleanPhone === '' || $pdo === null) {
            json_response([
                'success' => true,
                'data'    => [
                    'phone' => $cleanPhone, 'noShowCount' => 0, 'warning' => false, 'isBlacklisted' => false,
                    'customerTier' => 'standard', 'adminNote' => '', 'totalBookings' => 0
                ]
            ]);
        }
        try {
            $stmt = $pdo->prepare("SELECT
                COUNT(*) AS total_bookings,
                COALESCE(SUM(CASE WHEN status = 'Khách chưa đến' OR payment_status = 'Tịch thu cọc 30%' THEN 1 ELSE 0 END), 0) AS noshow_count
                FROM bookings
                WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', '') = ?");
            $stmt->execute([$cleanPhone]);
            $stats = $stmt->fetch();
            $noShowCount   = (int)($stats['noshow_count'] ?? 0);
            $totalBookings = (int)($stats['total_bookings'] ?? 0);

            $isBlacklisted = is_phone_blacklisted($pdo, $cleanPhone);
            $customerTier = 'standard';
            $adminNote = '';
            try {
                $crmStmt = $pdo->prepare("SELECT customer_tier, admin_note, is_blacklisted FROM customer_crm WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', '') = ? LIMIT 1");
                $crmStmt->execute([$cleanPhone]);
                $crmInfo = $crmStmt->fetch();
                if ($crmInfo) {
                    $customerTier = (string)($crmInfo['customer_tier'] ?? 'standard');
                    $adminNote = (string)($crmInfo['admin_note'] ?? '');
                    if ((int)($crmInfo['is_blacklisted'] ?? 0) === 1) {
                        $isBlacklisted = true;
                    }
                }
            } catch (Exception $ce) {}

            json_response([
                'success' => true,
                'data'    => [
                    'phone'         => $cleanPhone,
                    'noShowCount'   => $noShowCount,
                    'warning'       => ($noShowCount >= 2 || $isBlacklisted),
                    'isBlacklisted' => $isBlacklisted,
                    'customerTier'  => $customerTier,
                    'adminNote'     => $adminNote,
                    'totalBookings' => $totalBookings
                ]
            ]);
        } catch (Exception $e) {
            error_log("[CHECK PHONE NOSHOW WARN] " . $e->getMessage());
            json_response([
                'success' => true,
                'data'    => [
                    'phone' => $cleanPhone, 'noShowCount' => 0, 'warning' => false, 'isBlacklisted' => false,
                    'customerTier' => 'standard', 'adminNote' => '', 'totalBookings' => 0
                ]
            ]);
        }
        return true;
    }

    if ($action === 'booked_slots') {
        try {
            if ($pdo === null) {
                json_response(['success' => true, 'data' => [], 'maintenanceWindows' => []]);
            }
            maybe_run_auto_release_throttled($pdo, 30);
            $pitchId = sanitize_string($_GET['pitch_id'] ?? $_GET['pitchId'] ?? '', 20);
            $date = sanitize_string($_GET['date'] ?? date('Y-m-d'), 15);
            $currentUser = get_authenticated_user($pdo);
            $isStaffOrAdmin = is_portal_operator($currentUser);

            if (!empty($pitchId)) {
                $stmt = $pdo->prepare("SELECT b.code, b.pitch_id, b.slot_id, b.slot_time, ts.start_time, ts.end_time, b.status, b.payment_status, b.customer_name, b.phone
                                       FROM bookings b
                                       LEFT JOIN time_slots ts ON ts.id = b.slot_id
                                       WHERE b.pitch_id = ? AND b.booking_date = ?
                                         AND b.status NOT IN ('Đã hủy', 'Khách chưa đến')
                                         AND b.payment_status NOT IN ('Đã hủy', 'Tịch thu cọc 30%', 'Đã hoàn cọc 100%', 'Bảo lưu cọc 30%', 'Phạt 50% cọc')
                                       ORDER BY ts.start_time ASC, b.slot_id ASC");
                $stmt->execute([$pitchId, $date]);
            } else {
                $stmt = $pdo->prepare("SELECT b.code, b.pitch_id, b.slot_id, b.slot_time, ts.start_time, ts.end_time, b.status, b.payment_status, b.customer_name, b.phone
                                       FROM bookings b
                                       LEFT JOIN time_slots ts ON ts.id = b.slot_id
                                       WHERE b.booking_date = ?
                                         AND b.status NOT IN ('Đã hủy', 'Khách chưa đến')
                                         AND b.payment_status NOT IN ('Đã hủy', 'Tịch thu cọc 30%', 'Đã hoàn cọc 100%', 'Bảo lưu cọc 30%', 'Phạt 50% cọc')
                                       ORDER BY b.pitch_id ASC, ts.start_time ASC, b.slot_id ASC");
                $stmt->execute([$date]);
            }

            $rows = $stmt->fetchAll() ?: [];
            $slots = [];
            foreach ($rows as $r) {
                $rawStart = !empty($r['start_time']) ? trim($r['start_time']) : trim(explode('-', (string)$r['slot_time'])[0] ?? '');
                $rawEnd   = !empty($r['end_time'])   ? trim($r['end_time'])   : trim(explode('-', (string)$r['slot_time'])[1] ?? '');
                $entry = [
                    'pitchId'       => $r['pitch_id'],
                    'slotId'        => $r['slot_id'],
                    'slotTime'      => $r['slot_time'],
                    'startTime'     => $rawStart,
                    'endTime'       => $rawEnd,
                    'status'        => $r['status'],
                    'paymentStatus' => $r['payment_status']
                ];
                if ($isStaffOrAdmin) {
                    $entry['code'] = $r['code'];
                    $entry['customerName'] = $r['customer_name'];
                    $entry['phone'] = $r['phone'];
                }
                $slots[] = $entry;
            }

            $maintWindows = [];
            try {
                if (!empty($pitchId)) {
                    $mStmt = $pdo->prepare("SELECT id, pitch_id, start_date, end_date, start_time, end_time, reason, status FROM pitch_maintenance WHERE pitch_id = ? AND status IN ('scheduled', 'in_progress') AND ? BETWEEN start_date AND end_date ORDER BY start_time ASC");
                    $mStmt->execute([$pitchId, $date]);
                } else {
                    $mStmt = $pdo->prepare("SELECT id, pitch_id, start_date, end_date, start_time, end_time, reason, status FROM pitch_maintenance WHERE status IN ('scheduled', 'in_progress') AND ? BETWEEN start_date AND end_date ORDER BY pitch_id ASC, start_time ASC");
                    $mStmt->execute([$date]);
                }
                $maintWindows = $mStmt->fetchAll() ?: [];
            } catch (Exception $me) {
                $maintWindows = [];
            }

            json_response([
                'success'            => true,
                'data'               => $slots,
                'maintenanceWindows' => $maintWindows
            ]);
        } catch (Throwable $t) {
            error_log("[BOOKED SLOTS WARN] " . $t->getMessage());
            json_response([
                'success'            => true,
                'data'               => [],
                'maintenanceWindows' => []
            ]);
        }
        return true;
    }

    if ($action === 'by_date' || $action === 'admin_list' || $action === 'today_bookings') {
        $actor = require_staff_or_admin($pdo);
        if ($pdo === null) {
            json_response(['success' => true, 'data' => []]);
        }
        $filterDate = sanitize_string($_GET['date'] ?? date('Y-m-d'), 15);
        $stmt = $pdo->prepare("SELECT b.*, p.name as pitch_name, p.type_name, p.variant 
                               FROM bookings b 
                               JOIN pitches p ON b.pitch_id = p.id 
                               WHERE b.booking_date = ? 
                               ORDER BY b.slot_time ASC, b.id DESC");
        $stmt->execute([$filterDate]);
        $list = $stmt->fetchAll();
        foreach ($list as &$item) {
            $item = map_booking_row($item);
        }
        json_response(['success' => true, 'data' => $list]);
        return true;
    }

    $code = sanitize_string($_GET['code'] ?? '', 40);
    if (!empty($code)) {
        if ($pdo === null) {
            json_error('Không tìm thấy đơn đặt sân tương ứng.', 404, 'ERR_NOT_FOUND');
        }
        $stmt = $pdo->prepare("SELECT b.*, p.name as pitch_name, p.type_name, p.variant 
                               FROM bookings b 
                               JOIN pitches p ON b.pitch_id = p.id 
                               WHERE b.code = ? LIMIT 1");
        $stmt->execute([$code]);
        $booking = $stmt->fetch();

        if (!$booking) {
            json_response([
                'success'  => false,
                'message'  => 'Không tìm thấy đơn đặt sân tương ứng.',
                'ref_code' => 'ERR_NOT_FOUND'
            ], 404);
        }

        if (!empty($_SESSION['user_id'])) {
            $refreshed = refresh_session_user($pdo);
            if (is_array($refreshed) && !empty($refreshed['_locked'])) {
                json_error('Tài khoản của bạn đã bị Chủ sân tạm khóa. Vui lòng liên hệ Quản trị viên.', 403, 'ERR_ACCOUNT_LOCKED');
            }
        }
        $currentUser = $_SESSION['user'] ?? null;
        if ($currentUser && !is_portal_operator($currentUser)) {
            $userPhone = preg_replace('/\s+/', '', (string)($currentUser['phone'] ?? ''));
            $bookPhone = preg_replace('/\s+/', '', (string)($booking['phone'] ?? ''));
            $ownsById = !empty($booking['user_id']) && ((int)$booking['user_id'] === (int)$currentUser['id']);
            $ownsByPhone = ($userPhone !== '' && $bookPhone !== '' && $userPhone === $bookPhone);
            if (!$ownsById && !$ownsByPhone) {
                json_response([
                    'success'  => false,
                    'message'  => 'Bạn không có quyền xem thông tin đơn đặt sân của khách hàng khác.',
                    'ref_code' => 'ERR_IDOR_BLOCKED'
                ], 403);
            }
        } elseif (!$currentUser) {
            $ownedCodes = (isset($_SESSION['owned_booking_codes']) && is_array($_SESSION['owned_booking_codes'])) ? $_SESSION['owned_booking_codes'] : [];
            if (!in_array($code, $ownedCodes, true)) {
                json_response([
                    'success'  => false,
                    'message'  => 'Bạn không có quyền xem thông tin đơn đặt sân này. Vui lòng đăng nhập hoặc sử dụng thiết bị đã tạo đơn.',
                    'ref_code' => 'ERR_IDOR_BLOCKED'
                ], 403);
            }
            if (!empty($booking['phone']) && strlen($booking['phone']) >= 7) {
                $booking['phone'] = substr($booking['phone'], 0, 4) . '***' . substr($booking['phone'], -3);
            }
            if (!empty($booking['email']) && strpos($booking['email'], '@') !== false) {
                $parts = explode('@', $booking['email']);
                $booking['email'] = substr($parts[0], 0, 1) . '***@' . $parts[1];
            }
        }

        $booking = map_booking_row($booking);
        json_response([
            'success' => true,
            'data'    => $booking
        ]);
        return true;
    }

    if ($action === 'eligible_vouchers') {
        require_once __DIR__ . '/pricing_tier_helper.php';
        if ($pdo === null) {
            json_response(['success' => true, 'data' => []]);
            return true;
        }
        $currentUser = get_authenticated_user($pdo);
        $userTier = $currentUser ? ($currentUser['customer_tier'] ?? 'standard') : null;
        $userId = $currentUser ? (int)$currentUser['id'] : null;
        $userPhone = $currentUser ? normalize_phone($currentUser['phone'] ?? '') : '';

        $stmt = $pdo->prepare("
            SELECT code, description, discount_type, discount_value, min_order, required_tier, max_usage, used_count, max_per_user
            FROM vouchers
            WHERE is_active = 1
              AND (valid_from IS NULL OR valid_from <= CURDATE())
              AND (valid_to IS NULL OR valid_to >= CURDATE())
              AND (max_usage <= 0 OR used_count < max_usage)
            ORDER BY discount_value DESC
        ");
        $stmt->execute();
        $allVouchers = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $eligible = [];
        foreach ($allVouchers as $v) {
            $reqTier = trim((string)($v['required_tier'] ?? ''));
            if (!$currentUser) {
                if ($reqTier !== '' && $reqTier !== 'all' && $reqTier !== 'regular' && $reqTier !== 'standard') {
                    continue;
                }
            } else {
                if (!is_tier_allowed_for_voucher($userTier, $reqTier)) {
                    continue;
                }
                $maxPerUser = (int)($v['max_per_user'] ?? 1);
                if ($maxPerUser > 0) {
                    $uCheck = $pdo->prepare("
                        SELECT COUNT(*) FROM bookings
                        WHERE voucher_code = ?
                          AND (user_id = ? OR (? != '' AND REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', '') = ?))
                          AND status NOT IN ('Đã hủy', 'Khách chưa đến')
                    ");
                    $uCheck->execute([$v['code'], $userId, $userPhone, $userPhone]);
                    if ((int)$uCheck->fetchColumn() >= $maxPerUser) {
                        continue;
                    }
                }
            }
            $eligible[] = [
                'code' => $v['code'],
                'description' => $v['description'],
                'type' => $v['discount_type'],
                'value' => (int)$v['discount_value'],
                'minOrder' => (int)$v['min_order'],
                'requiredTier' => $reqTier
            ];
        }
        json_response(['success' => true, 'data' => $eligible]);
        return true;
    }

    if ($action === 'validate_voucher') {
        require_once __DIR__ . '/pricing_tier_helper.php';
        if ($pdo === null) {
            json_error('Cơ sở dữ liệu không khả dụng.', 503, 'ERR_DB_UNAVAILABLE');
            return true;
        }
        if (!check_rate_limit($pdo, 'invalid_voucher_attempts', 5, 300)) {
            json_error('Bạn đã thử mã ưu đãi sai quá nhiều lần. Vui lòng thử lại sau 5 phút.', 429, 'ERR_RATE_LIMITED');
            return true;
        }
        $code = strtoupper(sanitize_string($_GET['code'] ?? '', 30));
        if ($code === '') {
            json_error('Vui lòng nhập mã ưu đãi.', 400, 'ERR_MISSING_CODE');
            return true;
        }
        $vStmt = $pdo->prepare("SELECT * FROM vouchers WHERE code = ? LIMIT 1");
        $vStmt->execute([$code]);
        $v = $vStmt->fetch(PDO::FETCH_ASSOC);
        if (!$v || (int)$v['is_active'] !== 1) {
            increment_rate_limit($pdo, 'invalid_voucher_attempts');
            json_error('Mã giảm giá không tồn tại hoặc đã ngừng áp dụng.', 400, 'ERR_INVALID_VOUCHER');
            return true;
        }
        $nowDate = date('Y-m-d');
        if ((!empty($v['valid_from']) && $nowDate < $v['valid_from']) || (!empty($v['valid_to']) && $nowDate > $v['valid_to'])) {
            increment_rate_limit($pdo, 'invalid_voucher_attempts');
            json_error('Mã giảm giá chưa đến ngày áp dụng hoặc đã hết hạn.', 400, 'ERR_INVALID_VOUCHER');
            return true;
        }
        if ((int)($v['max_usage'] ?? 0) > 0 && (int)($v['used_count'] ?? 0) >= (int)$v['max_usage']) {
            increment_rate_limit($pdo, 'invalid_voucher_attempts');
            json_error('Mã giảm giá đã hết lượt sử dụng.', 400, 'ERR_INVALID_VOUCHER');
            return true;
        }
        $currentUser = get_authenticated_user($pdo);
        $reqTier = trim((string)($v['required_tier'] ?? ''));
        if ($reqTier !== '' && strtolower($reqTier) !== 'standard' && strtolower($reqTier) !== 'all') {
            if (!$currentUser) {
                increment_rate_limit($pdo, 'invalid_voucher_attempts');
                json_error('Mã giảm giá này chỉ áp dụng cho thành viên đã đăng nhập.', 403, 'ERR_VOUCHER_TIER_REQUIRED');
                return true;
            }
            $userTier = $currentUser['customer_tier'] ?? 'standard';
            if (!is_tier_allowed_for_voucher($userTier, $reqTier)) {
                increment_rate_limit($pdo, 'invalid_voucher_attempts');
                json_error('Hạng thành viên hiện tại chưa đủ điều kiện áp dụng mã ưu đãi này.', 403, 'ERR_VOUCHER_TIER_MISMATCH');
                return true;
            }
        }
        json_response([
            'success' => true,
            'data' => [
                'code' => $v['code'],
                'description' => $v['description'],
                'type' => $v['discount_type'],
                'value' => (int)$v['discount_value'],
                'minOrder' => (int)$v['min_order'],
                'requiredTier' => $reqTier
            ]
        ]);
        return true;
    }

    return false;
}
