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
                    'debtCount' => 0, 'debtAmount' => 0, 'totalBookings' => 0
                ]
            ]);
        }
        if ($cleanPhone === '' || $pdo === null) {
            json_response([
                'success' => true,
                'data'    => [
                    'phone' => $cleanPhone, 'noShowCount' => 0, 'warning' => false, 'isBlacklisted' => false,
                    'customerTier' => 'standard', 'adminNote' => '', 'debtCount' => 0, 'debtAmount' => 0, 'totalBookings' => 0
                ]
            ]);
        }
        try {
            $stmt = $pdo->prepare("SELECT
                COUNT(*) AS total_bookings,
                COALESCE(SUM(CASE WHEN status = 'Khách chưa đến' OR payment_status = 'Tịch thu cọc 30%' THEN 1 ELSE 0 END), 0) AS noshow_count,
                COALESCE(SUM(CASE WHEN remaining_amount > 0 AND status NOT IN ('Đã hủy', 'Khách chưa đến') AND payment_status NOT IN ('Đã hủy', 'Tịch thu cọc 30%', 'Đã hoàn cọc 100%', 'Bảo lưu cọc 30%', 'Phạt 50% cọc') THEN 1 ELSE 0 END), 0) AS debt_count,
                COALESCE(SUM(CASE WHEN remaining_amount > 0 AND status NOT IN ('Đã hủy', 'Khách chưa đến') AND payment_status NOT IN ('Đã hủy', 'Tịch thu cọc 30%', 'Đã hoàn cọc 100%', 'Bảo lưu cọc 30%', 'Phạt 50% cọc') THEN remaining_amount ELSE 0 END), 0) AS debt_amount
                FROM bookings
                WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', '') = ?");
            $stmt->execute([$cleanPhone]);
            $stats = $stmt->fetch();
            $noShowCount   = (int)($stats['noshow_count'] ?? 0);
            $debtCount     = (int)($stats['debt_count'] ?? 0);
            $debtAmount    = (int)($stats['debt_amount'] ?? 0);
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
                    'debtCount'     => $debtCount,
                    'debtAmount'    => $debtAmount,
                    'totalBookings' => $totalBookings
                ]
            ]);
        } catch (Exception $e) {
            error_log("[CHECK PHONE NOSHOW WARN] " . $e->getMessage());
            json_response([
                'success' => true,
                'data'    => [
                    'phone' => $cleanPhone, 'noShowCount' => 0, 'warning' => false, 'isBlacklisted' => false,
                    'customerTier' => 'standard', 'adminNote' => '', 'debtCount' => 0, 'debtAmount' => 0, 'totalBookings' => 0
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
                $stmt = $pdo->prepare("SELECT code, pitch_id, slot_id, slot_time, status, payment_status, customer_name, phone
                                       FROM bookings
                                       WHERE pitch_id = ? AND booking_date = ?
                                         AND status NOT IN ('Đã hủy', 'Khách chưa đến')
                                         AND payment_status NOT IN ('Đã hủy', 'Tịch thu cọc 30%', 'Đã hoàn cọc 100%', 'Bảo lưu cọc 30%', 'Phạt 50% cọc')
                                       ORDER BY slot_id ASC");
                $stmt->execute([$pitchId, $date]);
            } else {
                $stmt = $pdo->prepare("SELECT code, pitch_id, slot_id, slot_time, status, payment_status, customer_name, phone
                                       FROM bookings
                                       WHERE booking_date = ?
                                         AND status NOT IN ('Đã hủy', 'Khách chưa đến')
                                         AND payment_status NOT IN ('Đã hủy', 'Tịch thu cọc 30%', 'Đã hoàn cọc 100%', 'Bảo lưu cọc 30%', 'Phạt 50% cọc')
                                       ORDER BY pitch_id ASC, slot_id ASC");
                $stmt->execute([$date]);
            }

            $rows = $stmt->fetchAll() ?: [];
            $slots = [];
            foreach ($rows as $r) {
                $entry = [
                    'pitchId'       => $r['pitch_id'],
                    'slotId'        => $r['slot_id'],
                    'slotTime'      => $r['slot_time'],
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

    return false;
}
