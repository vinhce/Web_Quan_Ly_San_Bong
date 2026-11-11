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
            ORDER BY b.booking_date DESC, b.created_at DESC
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

    // 5.2 Lịch lặp cố định: Danh sách (kèm lịch đá sắp tới để xin nghỉ 1 buổi)
    if ($action === 'get_recurring_schedules') {
        $stmt = $pdo->query("
            SELECT r.*, p.name AS pitch_name, ts.slot_time,
                   (SELECT COUNT(*) FROM bookings b WHERE b.recurring_schedule_id = r.id) AS generated_count,
                   (SELECT COUNT(*) FROM bookings b WHERE b.recurring_schedule_id = r.id AND b.status = 'Đã hủy') AS skipped_count
            FROM recurring_schedules r
            LEFT JOIN pitches p ON r.pitch_id = p.id
            LEFT JOIN time_slots ts ON r.slot_id = ts.id
            ORDER BY FIELD(r.status, 'active', 'paused', 'completed', 'cancelled'), r.id DESC
        ");
        $schedules = $stmt->fetchAll();

        if (!empty($schedules)) {
            $schIds = array_map('intval', array_column($schedules, 'id'));
            $placeholders = implode(',', array_fill(0, count($schIds), '?'));
            $cbStmt = $pdo->prepare("
                SELECT id, code, recurring_schedule_id, booking_date, slot_time, status, payment_status
                FROM bookings
                WHERE recurring_schedule_id IN ($placeholders)
                  AND booking_date >= CURDATE()
                ORDER BY booking_date ASC, id ASC
            ");
            $cbStmt->execute($schIds);
            $bySchedule = [];
            foreach ($cbStmt->fetchAll() as $cb) {
                $sid = (int)$cb['recurring_schedule_id'];
                if (!isset($bySchedule[$sid])) {
                    $bySchedule[$sid] = [];
                }
                if (count($bySchedule[$sid]) < 12) {
                    $bySchedule[$sid][] = $cb;
                }
            }
            foreach ($schedules as &$s) {
                $s['is_open_ended'] = !empty($s['is_open_ended']);
                $s['upcoming_bookings'] = $bySchedule[(int)$s['id']] ?? [];
            }
        }

        json_response(['success' => true, 'data' => $schedules]);
    }

    // 5.2 Lịch lặp cố định: Tạo lịch cố định & sinh trước cửa sổ 4 tuần (bỏ qua xung đột)
    if ($action === 'create_recurring_schedule') {
        $customerName = sanitize_string($data['customer_name'] ?? $data['customerName'] ?? '', 100);
        $phone = normalize_phone(sanitize_string($data['phone'] ?? '', 25));
        $pitchId = sanitize_string($data['pitch_id'] ?? $data['pitchId'] ?? '', 20);
        $slotId = sanitize_string($data['slot_id'] ?? $data['slotId'] ?? '', 10);
        $dayOfWeek = max(1, min(7, (int)($data['day_of_week'] ?? 1))); // 1=T2 .. 7=CN
        $startDate = sanitize_string($data['start_date'] ?? date('Y-m-d'), 15);
        $isOpenEnded = !empty($data['is_open_ended']) ? 1 : 0;
        $weeksCount = $isOpenEnded ? max(4, (int)($data['weeks_count'] ?? 52)) : max(2, min(52, (int)($data['weeks_count'] ?? 4)));
        $pricePerMatch = max(0, (int)($data['price_per_match'] ?? 0));
        $depositPerMatch = max(0, (int)($data['deposit_per_match'] ?? 0));
        $note = sanitize_string($data['note'] ?? '', 255);

        if (empty($customerName) || empty($phone) || empty($pitchId) || empty($slotId)) {
            json_error('Vui lòng điền đầy đủ thông tin đặt lịch lặp.', 400, 'ERR_MISSING_PARAMS');
        }
        if (!preg_match('/^0[0-9]{9,10}$/', $phone)) {
            json_error('Số điện thoại không hợp lệ (cần 10-11 chữ số).', 400, 'ERR_INVALID_PHONE');
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate) || !strtotime($startDate)) {
            json_error('Ngày bắt đầu lịch lặp không hợp lệ.', 400, 'ERR_INVALID_DATE');
        }
        if (is_phone_blacklisted($pdo, $phone)) {
            json_error('Số điện thoại này đang nằm trong Danh sách đen (Blacklist), không thể tạo lịch cố định.', 403, 'ERR_BLACKLISTED');
        }

        $pStmt = $pdo->prepare("SELECT id, name, type, base_price, peak_price, weekend_price, status FROM pitches WHERE id = ? LIMIT 1");
        $pStmt->execute([$pitchId]);
        $pitch = $pStmt->fetch();
        if (!$pitch || $pitch['status'] === 'Ẩn') {
            json_error('Sân bóng không tồn tại hoặc đang tạm ẩn.', 404, 'ERR_PITCH_NOT_FOUND');
        }

        $sStmt = $pdo->prepare("SELECT id, slot_time, is_peak, duration FROM time_slots WHERE id = ? LIMIT 1");
        $sStmt->execute([$slotId]);
        $slot = $sStmt->fetch();
        if (!$slot) {
            json_error('Khung giờ không hợp lệ.', 400, 'ERR_INVALID_SLOT');
        }

        $isWeekend = ($dayOfWeek >= 6);
        $weekendPrice = (int)($pitch['weekend_price'] ?? 0);
        if ($isWeekend && $weekendPrice > 0) {
            $baseP = $slot['is_peak'] ? max((int)$pitch['peak_price'], $weekendPrice) : $weekendPrice;
        } else {
            $baseP = $slot['is_peak'] ? (int)$pitch['peak_price'] : (int)$pitch['base_price'];
        }
        $computedBase = (int)round($baseP * ((float)($slot['duration'] ?: 1.0)));
        $goldRes = resolve_golden_hour_adjustment($pdo, (int)($pitch['type'] ?? 5), $dayOfWeek, (string)$slot['id'], $computedBase);
        $serverPrice = (int)($goldRes['adjustedPitchPrice'] ?? $computedBase);
        if (($actor['role'] ?? '') === 'admin' && $pricePerMatch >= 50000) {
            $finalPrice = $pricePerMatch;
        } else {
            $finalPrice = $serverPrice;
        }
        $pricePerMatch = $finalPrice;
        $depositPerMatch = max(0, min($pricePerMatch, $depositPerMatch));

        $endDate = $isOpenEnded
            ? date('Y-m-d', strtotime($startDate . ' +365 days'))
            : date('Y-m-d', strtotime($startDate . ' +' . (($weeksCount * 7) - 1) . ' days'));
        $scheduleCode = 'REC-' . date('ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 5));

        $insStmt = $pdo->prepare("
            INSERT INTO recurring_schedules
            (schedule_code, customer_name, phone, pitch_id, slot_id, day_of_week, start_date, end_date, weeks_count, is_open_ended, price_per_match, deposit_per_match, status, note, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, NOW())
        ");
        $insStmt->execute([
            $scheduleCode,
            $customerName,
            $phone,
            $pitchId,
            $slotId,
            $dayOfWeek,
            $startDate,
            $endDate,
            $weeksCount,
            $isOpenEnded,
            $pricePerMatch,
            $depositPerMatch,
            $note
        ]);
        $scheduleId = (int)$pdo->lastInsertId();

        // Sinh trước cửa sổ 4 tuần & tự bỏ qua buổi trùng đơn/bảo trì (không chèn đơn giả)
        $genResult = generate_recurring_bookings_window($pdo, $scheduleId, 4, $actor);

        write_audit_log(
            $pdo,
            'RECURRING_CREATE',
            $scheduleCode,
            null,
            "Tạo lịch cố định " . ($isOpenEnded ? 'dài hạn (không giới hạn)' : "{$weeksCount} tuần") . " sân {$pitch['name']} ({$slot['slot_time']}) cho {$customerName} ({$phone}) - Đã sinh {$genResult['generated_count']} buổi, bỏ qua {$genResult['skipped_conflicts']} buổi trùng",
            $actor
        );

        $msg = "Tạo lịch lặp {$scheduleCode} thành công! Đã sinh trước {$genResult['generated_count']} buổi trong 4 tuần tới.";
        if ($genResult['skipped_conflicts'] > 0) {
            $msg .= " Có {$genResult['skipped_conflicts']} buổi trùng lịch/bảo trì đã được bỏ qua.";
        }

        json_response([
            'success' => true,
            'message' => $msg,
            'data'    => [
                'schedule_id'       => $scheduleId,
                'schedule_code'     => $scheduleCode,
                'is_open_ended'     => (bool)$isOpenEnded,
                'generated_count'   => $genResult['generated_count'],
                'skipped_conflicts' => $genResult['skipped_conflicts'],
                'bookings'          => $genResult['bookings'],
                'conflicts'         => $genResult['conflicts']
            ]
        ], 201);
    }

    // 5.2 Lịch lặp cố định: Hủy toàn bộ chuỗi lịch lặp cố định
    if ($action === 'cancel_recurring_schedule') {
        $mgr = require_manager_or_admin($pdo);
        $scheduleId = (int)($data['schedule_id'] ?? $data['id'] ?? 0);
        $reason = sanitize_string($data['reason'] ?? 'Chủ sân/Khách dừng lịch cố định', 255);
        if ($scheduleId <= 0) {
            json_error('Thiếu ID chuỗi lịch lặp.', 400, 'ERR_MISSING_ID');
        }

        $sStmt = $pdo->prepare("SELECT * FROM recurring_schedules WHERE id = ? LIMIT 1");
        $sStmt->execute([$scheduleId]);
        $schedule = $sStmt->fetch();
        if (!$schedule) {
            json_error('Không tìm thấy chuỗi lịch lặp tương ứng.', 404, 'ERR_NOT_FOUND');
        }

        $pdo->prepare("UPDATE recurring_schedules SET status = 'cancelled', note = TRIM(CONCAT(IFNULL(note, ''), ' [Hủy chuỗi: ', ?, ']')) WHERE id = ?")
            ->execute([$reason, $scheduleId]);

        $futStmt = $pdo->prepare("SELECT id, code, pitch_id, booking_date, slot_id, slot_time FROM bookings WHERE recurring_schedule_id = ? AND booking_date >= CURDATE() AND status = 'Đã xác nhận'");
        $futStmt->execute([$scheduleId]);
        $futureBookings = $futStmt->fetchAll();

        $updChild = $pdo->prepare("UPDATE bookings SET status = 'Đã hủy', payment_status = 'Đã hủy', remaining_amount = 0, note = TRIM(CONCAT(IFNULL(note, ''), ' [Hủy chuỗi lịch lặp ', ?, ': ', ?, ']')) WHERE id = ?");
        $cancelledCount = 0;
        foreach ($futureBookings as $fb) {
            $updChild->execute([$schedule['schedule_code'], $reason, (int)$fb['id']]);
            $cancelledCount++;
            trigger_waitlist_notification($pdo, (string)$fb['pitch_id'], (string)$fb['booking_date'], (string)$fb['slot_id'], (string)$fb['slot_time'], $mgr, (string)$fb['code']);
        }

        write_audit_log(
            $pdo,
            'RECURRING_CANCEL',
            $schedule['schedule_code'],
            $schedule['status'],
            "cancelled (Hủy {$cancelledCount} buổi tương lai) | Lý do: {$reason}",
            $mgr
        );

        json_response([
            'success' => true,
            'message' => "Đã dừng chuỗi lịch lặp {$schedule['schedule_code']} và nhả {$cancelledCount} ca sắp tới."
        ]);
    }

    // 5.2 Lịch lặp cố định: Xin nghỉ 1 buổi cụ thể (không hủy cả chuỗi -> kích hoạt Waitlist)
    if ($action === 'skip_recurring_booking') {
        $bookingCode = sanitize_string($data['booking_code'] ?? '', 40);
        $reason = sanitize_string($data['reason'] ?? 'Khách xin nghỉ trận tuần này', 255);

        if (empty($bookingCode)) {
            json_error('Thiếu mã đơn đặt sân.', 400, 'ERR_MISSING_CODE');
        }

        $bStmt = $pdo->prepare("SELECT b.*, p.name AS pitch_name FROM bookings b LEFT JOIN pitches p ON b.pitch_id = p.id WHERE b.code = ? AND b.recurring_schedule_id IS NOT NULL LIMIT 1");
        $bStmt->execute([$bookingCode]);
        $booking = $bStmt->fetch();

        if (!$booking) {
            json_error('Không tìm thấy đơn đặt sân thuộc lịch lặp cố định.', 404, 'ERR_NOT_FOUND');
        }

        $upd = $pdo->prepare("UPDATE bookings SET status = 'Đã hủy', payment_status = 'Bảo lưu cọc 30%', remaining_amount = 0, note = CONCAT(IFNULL(note,''), ' [Nghỉ 1 buổi: ', ?, ']') WHERE code = ?");
        $upd->execute([$reason, $bookingCode]);

        write_audit_log(
            $pdo,
            'RECURRING_SKIP_DATE',
            $bookingCode,
            $booking['status'],
            "Tạm nghỉ buổi {$booking['booking_date']} - Chuỗi lịch lặp vẫn tiếp tục | Lý do: {$reason}",
            $actor
        );

        send_customer_notification($pdo, 'cancel_booking', [
            'booking_id'    => (int)$booking['id'],
            'booking_code'  => $bookingCode,
            'code'          => $bookingCode,
            'customer_name' => (string)$booking['customer_name'],
            'phone'         => (string)$booking['phone'],
            'pitch_name'    => (string)($booking['pitch_name'] ?: $booking['pitch_id']),
            'date'          => date('d/m/Y', strtotime((string)$booking['booking_date'])),
            'slot_time'     => (string)$booking['slot_time'],
            'reason'        => "Xin nghỉ 1 buổi: {$reason}"
        ]);

        trigger_waitlist_notification(
            $pdo,
            (string)$booking['pitch_id'],
            (string)$booking['booking_date'],
            (string)$booking['slot_id'],
            (string)($booking['slot_time'] ?? ''),
            $actor,
            $bookingCode
        );

        json_response([
            'success' => true,
            'message' => "Đã cho khách tạm nghỉ buổi ngày {$booking['booking_date']} và nhả sân thành công. Các buổi khác vẫn giữ nguyên."
        ]);
    }

    // 5.3 Waitlist: Danh sách chờ (tự hết hạn notified quá hạn -> đẩy người tiếp theo)
    if ($action === 'get_waitlist') {
        expire_stale_waitlist_holds($pdo);

        $status = sanitize_string($_GET['status'] ?? 'all', 20);
        $date = sanitize_string($_GET['date'] ?? '', 15);

        $where = ["1=1"];
        $params = [];
        if ($status !== 'all') {
            $where[] = "w.status = ?";
            $params[] = $status;
        }
        if (!empty($date) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $where[] = "w.booking_date = ?";
            $params[] = $date;
        }

        $stmt = $pdo->prepare("
            SELECT w.*, p.name AS pitch_name, ts.slot_time
            FROM waitlist w
            LEFT JOIN pitches p ON w.pitch_id = p.id
            LEFT JOIN time_slots ts ON w.slot_id = ts.id
            WHERE " . implode(' AND ', $where) . "
            ORDER BY FIELD(w.status, 'notified', 'waiting', 'converted', 'cancelled'), w.booking_date ASC, w.created_at ASC
        ");
        $stmt->execute($params);
        $waitlist = $stmt->fetchAll();

        $sysSettings = get_system_settings_map($pdo);
        $holdMins = max(5, min(120, (int)($sysSettings['waitlist_hold_minutes'] ?? 15)));
        foreach ($waitlist as &$wl) {
            $wl['hold_minutes'] = $holdMins;
        }

        json_response(['success' => true, 'data' => $waitlist]);
    }

    // 5.3 Waitlist: Gán khách từ danh sách chờ vào ca đá (tự tạo đơn thật trong DB nếu chưa có mã đơn)
    if ($action === 'assign_waitlist') {
        $waitlistId = (int)($data['waitlist_id'] ?? $data['id'] ?? 0);
        $bookingCode = strtoupper(sanitize_string($data['booking_code'] ?? '', 40));

        if ($waitlistId <= 0) {
            json_error('Thiếu ID danh sách chờ.', 400, 'ERR_WAITLIST_ID');
        }

        $pdo->beginTransaction();
        try {
            $wStmt = $pdo->prepare("SELECT * FROM waitlist WHERE id = ? LIMIT 1 FOR UPDATE");
            $wStmt->execute([$waitlistId]);
            $wlRow = $wStmt->fetch();
            if (!$wlRow) {
                $pdo->rollBack();
                json_error('Không tìm thấy bản ghi danh sách chờ.', 404, 'ERR_WAITLIST_NOT_FOUND');
            }
            if ($wlRow['status'] === 'converted') {
                $pdo->rollBack();
                json_error('Khách này đã được xếp sân rồi.', 400, 'ERR_WAITLIST_CONVERTED');
            }
            if (is_phone_blacklisted($pdo, (string)$wlRow['phone'])) {
                $pdo->rollBack();
                json_error('Khách này hiện đang thuộc Danh sách đen, không thể xếp sân.', 403, 'ERR_BLACKLISTED');
            }

            $createdBookingData = null;
            if ($bookingCode === '') {
                $pStmt = $pdo->prepare("SELECT id, name, type, base_price, peak_price, weekend_price, status FROM pitches WHERE id = ? LIMIT 1 FOR UPDATE");
                $pStmt->execute([$wlRow['pitch_id']]);
                $pitch = $pStmt->fetch();
                if (!$pitch || in_array($pitch['status'], ['Bảo trì', 'Ẩn'], true)) {
                    $pdo->rollBack();
                    json_error('Sân bóng hiện đang bảo trì hoặc tạm ẩn.', 400, 'ERR_PITCH_UNAVAILABLE');
                }

                $sStmt = $pdo->prepare("SELECT id, slot_time, is_peak, duration FROM time_slots WHERE id = ? LIMIT 1");
                $sStmt->execute([$wlRow['slot_id']]);
                $slot = $sStmt->fetch();
                if (!$slot) {
                    $pdo->rollBack();
                    json_error('Khung giờ không hợp lệ.', 400, 'ERR_INVALID_SLOT');
                }

                if ($mRow = find_active_maintenance_for_slot($pdo, (string)$wlRow['pitch_id'], (string)$wlRow['booking_date'], (string)$slot['slot_time'])) {
                    $pdo->rollBack();
                    json_error("Sân đang bảo trì khung giờ này: {$mRow['reason']}.", 400, 'ERR_PITCH_MAINTENANCE');
                }

                $busyStmt = $pdo->prepare("
                    SELECT code FROM bookings
                    WHERE pitch_id = ? AND booking_date = ? AND slot_id = ?
                      AND status NOT IN ('Đã hủy', 'Khách chưa đến')
                      AND payment_status NOT IN ('Đã hủy', 'Tịch thu cọc 30%', 'Đã hoàn cọc 100%', 'Bảo lưu cọc 30%', 'Phạt 50% cọc')
                    LIMIT 1 FOR UPDATE
                ");
                $busyStmt->execute([$wlRow['pitch_id'], $wlRow['booking_date'], $wlRow['slot_id']]);
                if ($busyCode = $busyStmt->fetchColumn()) {
                    $pdo->rollBack();
                    json_error("Khung giờ này vẫn đang có đơn #{$busyCode} hoạt động. Hãy hủy/nhả sân trước khi gán khách chờ.", 409, 'ERR_DOUBLE_BOOKING');
                }

                $ts = strtotime((string)$wlRow['booking_date']);
                $wDay = (int)date('w', $ts);
                $isWeekend = ($wDay === 0 || $wDay === 6);
                $weekendPrice = (int)($pitch['weekend_price'] ?? 0);
                if ($isWeekend && $weekendPrice > 0) {
                    $baseP = $slot['is_peak'] ? max((int)$pitch['peak_price'], $weekendPrice) : $weekendPrice;
                } else {
                    $baseP = $slot['is_peak'] ? (int)$pitch['peak_price'] : (int)$pitch['base_price'];
                }
                $origPitchPrice = (int)round($baseP * ((float)($slot['duration'] ?: 1.0)));
                $ghEval = resolve_golden_hour_adjustment($pdo, (int)$pitch['type'], (int)date('N', $ts), (string)$slot['id'], $origPitchPrice);
                $totalPrice = (int)$ghEval['adjustedPitchPrice'];
                $origPrice  = max($origPitchPrice, $totalPrice);
                $discAmt    = max(0, $origPrice - $totalPrice);

                $sysSettings = get_system_settings_map($pdo);
                $depRate = max(10, min(100, (int)($sysSettings['deposit_rate'] ?? 30)));
                $holdMinutes = max(5, min(120, (int)($sysSettings['hold_minutes'] ?? 15)));
                $depositAmount = (int)round($totalPrice * ($depRate / 100));
                $expiresAt = date('Y-m-d H:i:s', time() + ($holdMinutes * 60));

                $prefix = stripos($wlRow['pitch_id'], 'P5') === 0 ? 'ASFF' : (stripos($wlRow['pitch_id'], 'P11') === 0 ? 'ASFE' : 'ASFS');
                $bookingCode = $prefix . random_int(100000, 999999);

                $insB = $pdo->prepare("
                    INSERT INTO bookings
                    (code, user_id, customer_name, phone, email, pitch_id, booking_date, slot_id, slot_time, original_price, discount_amount, total_price, deposit_amount, paid_amount, remaining_amount, status, payment_status, payment_method, weeks_count, booking_mode, note, expires_at, created_at)
                    VALUES (?, ?, ?, ?, 'khachhang@sanbongpro.vn', ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'Đã xác nhận', 'Chờ duyệt cọc', 'VietQR Chuyển khoản', 1, 'waitlist', ?, ?, NOW())
                ");
                $insB->execute([
                    $bookingCode,
                    $wlRow['user_id'] ?? null,
                    $wlRow['customer_name'],
                    $wlRow['phone'],
                    $wlRow['pitch_id'],
                    $wlRow['booking_date'],
                    $wlRow['slot_id'],
                    $slot['slot_time'],
                    $origPrice,
                    $discAmt,
                    $totalPrice,
                    $depositAmount,
                    $totalPrice,
                    '[Chuyển từ Danh sách chờ #' . $waitlistId . '] ' . (string)($wlRow['note'] ?? ''),
                    $expiresAt
                ]);
                $newBookingId = (int)$pdo->lastInsertId();
                $createdBookingData = [
                    'bookingId'      => $newBookingId,
                    'bookingCode'    => $bookingCode,
                    'pitchName'      => $pitch['name'],
                    'slotTime'       => $slot['slot_time'],
                    'totalPrice'     => $totalPrice,
                    'depositAmount'  => $depositAmount
                ];
            }

            $updW = $pdo->prepare("UPDATE waitlist SET status = 'converted', converted_booking_code = ?, updated_at = NOW() WHERE id = ?");
            $updW->execute([$bookingCode, $waitlistId]);
            $pdo->commit();
        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }

        write_audit_log(
            $pdo,
            'WAITLIST_ASSIGN',
            $bookingCode,
            $wlRow['status'] ?? 'waiting',
            "Gán khách {$wlRow['customer_name']} ({$wlRow['phone']}) từ Waitlist #{$waitlistId} -> đơn {$bookingCode}",
            $actor
        );

        if ($createdBookingData) {
            send_telegram_notification(
                "⚽ <b>ĐƠN TỪ DANH SÁCH CHỜ</b>\n• Mã vé: <code>{$bookingCode}</code>\n• Khách: <b>{$wlRow['customer_name']}</b> ({$wlRow['phone']})\n• Sân: <b>{$createdBookingData['pitchName']}</b> | Ngày: <b>" . date('d/m/Y', strtotime((string)$wlRow['booking_date'])) . "</b> ({$createdBookingData['slotTime']})",
                'new_booking',
                $pdo
            );
            send_customer_notification($pdo, 'booking_confirm', [
                'booking_id'       => $createdBookingData['bookingId'],
                'booking_code'     => $bookingCode,
                'code'             => $bookingCode,
                'customer_name'    => (string)$wlRow['customer_name'],
                'phone'            => (string)$wlRow['phone'],
                'pitch_name'       => $createdBookingData['pitchName'],
                'date'             => date('d/m/Y', strtotime((string)$wlRow['booking_date'])),
                'slot_time'        => $createdBookingData['slotTime'],
                'total_price'      => $createdBookingData['totalPrice'],
                'deposit_amount'   => $createdBookingData['depositAmount'],
                'remaining_amount' => $createdBookingData['totalPrice']
            ]);
        }

        json_response([
            'success' => true,
            'message' => "Đã xếp sân cho {$wlRow['customer_name']} thành công (Mã đơn: {$bookingCode})!",
            'data'    => ['waitlist_id' => $waitlistId, 'booking_code' => $bookingCode]
        ]);
    }

    // 5.3 Waitlist: Báo sân trống thủ công
    if ($action === 'notify_waitlist') {
        $waitlistId = (int)($data['waitlist_id'] ?? $data['id'] ?? 0);
        if ($waitlistId <= 0) {
            json_error('Thiếu ID danh sách chờ.', 400, 'ERR_WAITLIST_ID');
        }
        $wStmt = $pdo->prepare("SELECT w.*, p.name AS pitch_name, ts.slot_time FROM waitlist w LEFT JOIN pitches p ON w.pitch_id = p.id LEFT JOIN time_slots ts ON w.slot_id = ts.id WHERE w.id = ? LIMIT 1");
        $wStmt->execute([$waitlistId]);
        $wl = $wStmt->fetch();
        if (!$wl) {
            json_error('Không tìm thấy bản ghi danh sách chờ.', 404, 'ERR_WAITLIST_NOT_FOUND');
        }

        $pdo->prepare("UPDATE waitlist SET status = 'notified', notified_at = NOW(), updated_at = NOW() WHERE id = ?")->execute([$waitlistId]);
        $settings = get_system_settings_map($pdo);
        $holdMins = max(5, min(120, (int)($settings['waitlist_hold_minutes'] ?? 15)));

        write_audit_log($pdo, 'WAITLIST_NOTIFIED', 'WL-' . $waitlistId, $wl['status'], "Báo sân trống ưu tiên {$holdMins}p cho {$wl['customer_name']} ({$wl['phone']})", $actor);

        send_telegram_notification(
            "🔔 <b>BÁO KHÁCH WAITLIST CÓ SÂN</b>\n• Khách: <b>{$wl['customer_name']}</b> ({$wl['phone']})\n• Sân: <b>" . ($wl['pitch_name'] ?: $wl['pitch_id']) . "</b> ({$wl['booking_date']} {$wl['slot_time']}) | Giữ ưu tiên {$holdMins}p.",
            'waitlist',
            $pdo
        );
        send_customer_notification($pdo, 'waitlist_notify', [
            'customer_name' => $wl['customer_name'],
            'phone'         => $wl['phone'],
            'pitch_name'    => $wl['pitch_name'] ?: $wl['pitch_id'],
            'date'          => date('d/m/Y', strtotime((string)$wl['booking_date'])),
            'slot_time'     => $wl['slot_time'] ?: $wl['slot_id'],
            'hold_minutes'  => $holdMins,
            'custom_title'  => "Sân " . ($wl['pitch_name'] ?: $wl['pitch_id']) . " vừa trống",
            'custom_content'=> "Xin chào {$wl['customer_name']}, ca {$wl['slot_time']} ngày " . date('d/m/Y', strtotime((string)$wl['booking_date'])) . " tại " . ($wl['pitch_name'] ?: $wl['pitch_id']) . " đang trống. Quầy giữ ưu tiên cho bạn trong {$holdMins} phút."
        ]);

        json_response(['success' => true, 'message' => "Đã gửi thông báo giữ chỗ {$holdMins} phút cho {$wl['customer_name']}."]);
    }

    // 5.3 Waitlist: Hủy hàng chờ (nếu đang notified -> tự đẩy người tiếp theo)
    if ($action === 'cancel_waitlist') {
        $waitlistId = (int)($data['waitlist_id'] ?? $data['id'] ?? 0);
        if ($waitlistId <= 0) {
            json_error('Thiếu ID danh sách chờ.', 400, 'ERR_WAITLIST_ID');
        }
        $wStmt = $pdo->prepare("SELECT w.*, ts.slot_time FROM waitlist w LEFT JOIN time_slots ts ON w.slot_id = ts.id WHERE w.id = ? LIMIT 1");
        $wStmt->execute([$waitlistId]);
        $wl = $wStmt->fetch();
        if (!$wl) {
            json_error('Không tìm thấy bản ghi danh sách chờ.', 404, 'ERR_WAITLIST_NOT_FOUND');
        }

        $pdo->prepare("UPDATE waitlist SET status = 'cancelled', updated_at = NOW() WHERE id = ?")->execute([$waitlistId]);
        write_audit_log($pdo, 'WAITLIST_CANCEL', 'WL-' . $waitlistId, $wl['status'], 'cancelled', $actor);

        if ($wl['status'] === 'notified') {
            trigger_waitlist_notification($pdo, (string)$wl['pitch_id'], (string)$wl['booking_date'], (string)$wl['slot_id'], (string)($wl['slot_time'] ?? ''), $actor);
        }

        json_response(['success' => true, 'message' => 'Đã hủy lượt đăng ký danh sách chờ.']);
    }

    // 5.4 Vouchers: Danh sách
    if ($action === 'get_vouchers') {
        $stmt = $pdo->query("SELECT * FROM vouchers ORDER BY is_active DESC, code ASC");
        $vouchers = $stmt->fetchAll();
        json_response(['success' => true, 'data' => $vouchers]);
    }

    // 5.4 Vouchers: Lưu mã giảm giá (Chỉ Admin)
    if ($action === 'save_voucher') {
        $admin = require_admin($pdo);
        $code = strtoupper(sanitize_string($data['code'] ?? '', 30));
        $desc = sanitize_string($data['description'] ?? '', 255);
        $type = ($data['discount_type'] ?? 'percent') === 'fixed' ? 'fixed' : 'percent';
        $val = max(1, (int)($data['discount_value'] ?? 10));
        if ($type === 'percent') {
            $val = min(100, $val);
        }
        $minOrder = max(0, (int)($data['min_order'] ?? 0));
        $maxUsage = max(0, (int)($data['max_usage'] ?? 100));
        $validFrom = !empty($data['valid_from']) ? sanitize_string($data['valid_from'], 15) : null;
        $validTo = !empty($data['valid_to']) ? sanitize_string($data['valid_to'], 15) : null;
        $rawPitchLimit = (int)($data['pitch_type_limit'] ?? 0);
        $pitchTypeLimit = in_array($rawPitchLimit, [5, 7, 11], true) ? $rawPitchLimit : null;
        $isActive = array_key_exists('is_active', $data) ? (!empty($data['is_active']) ? 1 : 0) : 1;

        if (empty($code) || empty($desc)) {
            json_error('Vui lòng điền mã và mô tả mã giảm giá.', 400, 'ERR_VOUCHER_PARAMS');
        }

        $stmt = $pdo->prepare("
            INSERT INTO vouchers (code, description, discount_type, discount_value, min_order, max_usage, valid_from, valid_to, pitch_type_limit, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                description = VALUES(description),
                discount_type = VALUES(discount_type),
                discount_value = VALUES(discount_value),
                min_order = VALUES(min_order),
                max_usage = VALUES(max_usage),
                valid_from = VALUES(valid_from),
                valid_to = VALUES(valid_to),
                pitch_type_limit = VALUES(pitch_type_limit),
                is_active = VALUES(is_active)
        ");
        $stmt->execute([$code, $desc, $type, $val, $minOrder, $maxUsage, $validFrom, $validTo, $pitchTypeLimit, $isActive]);

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
            $extraParams[] = $code;
            try {
                $updExt = $pdo->prepare("UPDATE vouchers SET " . implode(', ', $extraUpdates) . " WHERE code = ?");
                $updExt->execute($extraParams);
            } catch (Throwable $ve) {
                error_log("[VOUCHER EXTRA UPDATE WARN] " . $ve->getMessage());
            }
        }

        write_audit_log($pdo, 'VOUCHER_SAVE', $code, null, "Lưu voucher {$code}: Giảm {$val} ({$type}), Max {$maxUsage} lượt, Sân: " . ($pitchTypeLimit ?: 'Tất cả'), $admin);

        json_response(['success' => true, 'message' => "Lưu voucher {$code} thành công!"]);
    }

    // 5.4 Vouchers: Xóa mã (Chỉ Admin)
    if ($action === 'delete_voucher') {
        $admin = require_admin($pdo);
        $code = strtoupper(sanitize_string($data['code'] ?? '', 30));
        $stmt = $pdo->prepare("DELETE FROM vouchers WHERE code = ?");
        $stmt->execute([$code]);
        write_audit_log($pdo, 'VOUCHER_DELETE', $code, null, "Xóa voucher {$code}", $admin);
        json_response(['success' => true, 'message' => "Đã xóa voucher {$code}!"]);
    }

    // 5.4 Giờ vàng: Danh sách
    if ($action === 'get_golden_hours') {
        $stmt = $pdo->query("
            SELECT g.*, ts.slot_time
            FROM golden_hour_rules g
            LEFT JOIN time_slots ts ON g.slot_id = ts.id
            ORDER BY g.is_active DESC, ((g.pitch_type IS NOT NULL) * 1 + (g.day_of_week IS NOT NULL) * 2 + (g.slot_id IS NOT NULL) * 4) DESC, g.id DESC
        ");
        $rules = $stmt->fetchAll();
        json_response(['success' => true, 'data' => $rules]);
    }

    // 5.4 Giờ vàng: Lưu quy tắc (Chỉ Admin)
    if ($action === 'save_golden_hour') {
        $admin = require_admin($pdo);
        $ruleName = sanitize_string($data['rule_name'] ?? '', 100);
        $rawPitchType = !empty($data['pitch_type']) ? (int)$data['pitch_type'] : null;
        $pitchType = in_array($rawPitchType, [5, 7, 11], true) ? $rawPitchType : null;
        $rawDay = !empty($data['day_of_week']) ? (int)$data['day_of_week'] : null;
        $dayOfWeek = ($rawDay !== null && $rawDay >= 1 && $rawDay <= 7) ? $rawDay : null;
        $slotId = !empty($data['slot_id']) ? sanitize_string($data['slot_id'], 10) : null;
        $adjType = sanitize_string($data['price_adjustment_type'] ?? 'fixed', 30);
        if (!in_array($adjType, ['fixed', 'percent_discount', 'percent_surcharge'], true)) {
            json_error('Loại điều chỉnh giá không hợp lệ.', 400, 'ERR_INVALID_ADJ_TYPE');
        }
        $adjVal = (int)($data['adjustment_value'] ?? 0);
        $desc = sanitize_string($data['description'] ?? '', 255);
        $isActive = array_key_exists('is_active', $data) ? (!empty($data['is_active']) ? 1 : 0) : 1;
        $id = (int)($data['id'] ?? 0);

        if (empty($ruleName)) {
            json_error('Vui lòng nhập tên quy tắc giờ vàng.', 400, 'ERR_RULE_NAME');
        }

        if ($id > 0) {
            $stmt = $pdo->prepare("
                UPDATE golden_hour_rules
                SET rule_name = ?, pitch_type = ?, day_of_week = ?, slot_id = ?,
                    price_adjustment_type = ?, adjustment_value = ?, description = ?, is_active = ?
                WHERE id = ?
            ");
            $stmt->execute([$ruleName, $pitchType, $dayOfWeek, $slotId, $adjType, $adjVal, $desc, $isActive, $id]);
        } else {
            $stmt = $pdo->prepare("
                INSERT INTO golden_hour_rules
                (rule_name, pitch_type, day_of_week, slot_id, price_adjustment_type, adjustment_value, description, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            $stmt->execute([$ruleName, $pitchType, $dayOfWeek, $slotId, $adjType, $adjVal, $desc, $isActive]);
        }

        write_audit_log($pdo, 'GOLDEN_HOUR_SAVE', null, null, "Lưu quy tắc giờ vàng: {$ruleName} ({$adjType}: {$adjVal})", $admin);
        json_response(['success' => true, 'message' => "Lưu quy tắc giờ vàng '{$ruleName}' thành công!"]);
    }

    // 5.4 Giờ vàng: Xóa quy tắc (Chỉ Admin)
    if ($action === 'delete_golden_hour') {
        $admin = require_admin($pdo);
        $id = (int)($data['id'] ?? 0);
        $stmt = $pdo->prepare("DELETE FROM golden_hour_rules WHERE id = ?");
        $stmt->execute([$id]);
        write_audit_log($pdo, 'GOLDEN_HOUR_DELETE', null, null, "Xóa quy tắc giờ vàng #{$id}", $admin);
        json_response(['success' => true, 'message' => "Đã xóa quy tắc giờ vàng!"]);
    }

    // ===============================================================
    // GIAI ĐOẠN 6: VẬN HÀNH VÀ THÔNG BÁO (BẢO TRÌ SÂN, CHI PHÍ, SAO LƯU DB)
    // ===============================================================

    // 6.3 Lịch bảo trì sân: Danh sách
    if ($action === 'get_maintenance') {
        $stmt = $pdo->query("
            SELECT m.*, p.name AS pitch_name
            FROM pitch_maintenance m
            LEFT JOIN pitches p ON m.pitch_id = p.id
            ORDER BY FIELD(m.status, 'in_progress', 'scheduled', 'completed', 'cancelled'), m.start_date DESC, m.id DESC
        ");
        $list = $stmt->fetchAll();
        json_response(['success' => true, 'data' => $list]);
    }

    // 6.3 Lịch bảo trì sân: Thêm/Sửa (kèm liệt kê đơn bị trùng để xử lý/báo khách)
    if ($action === 'save_maintenance') {
        $mgr = require_manager_or_admin($pdo);
        $id = (int)($data['id'] ?? 0);
        $pitchId = sanitize_string($data['pitch_id'] ?? '', 20);
        $startDate = sanitize_string($data['start_date'] ?? date('Y-m-d'), 15);
        $endDate = sanitize_string($data['end_date'] ?? date('Y-m-d'), 15);
        $startTime = sanitize_string($data['start_time'] ?? '05:30', 10);
        $endTime = sanitize_string($data['end_time'] ?? '23:00', 10);
        $reason = sanitize_string($data['reason'] ?? 'Bảo dưỡng cỏ định kỳ', 255);
        $status = sanitize_string($data['status'] ?? 'scheduled', 20);

        if (empty($pitchId) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $endDate)) {
            json_error('Vui lòng chọn sân và khoảng ngày bảo trì hợp lệ.', 400, 'ERR_MAINT_PARAMS');
        }
        if ($endDate < $startDate) {
            json_error('Ngày kết thúc bảo trì phải lớn hơn hoặc bằng ngày bắt đầu.', 400, 'ERR_MAINT_DATES');
        }
        $sMin = parse_time_to_minutes($startTime);
        $eMin = parse_time_to_minutes($endTime);
        if ($sMin === null || $eMin === null || $eMin <= $sMin) {
            json_error('Khung giờ bảo trì không hợp lệ (giờ kết thúc phải sau giờ bắt đầu).', 400, 'ERR_MAINT_TIMES');
        }
        if (!in_array($status, ['scheduled', 'in_progress', 'completed', 'cancelled'], true)) {
            json_error('Trạng thái lịch bảo trì không hợp lệ.', 400, 'ERR_INVALID_STATUS');
        }

        $pChk = $pdo->prepare("SELECT name FROM pitches WHERE id = ? LIMIT 1");
        $pChk->execute([$pitchId]);
        $pitchName = $pChk->fetchColumn();
        if (!$pitchName) {
            json_error('Không tìm thấy sân bóng tương ứng.', 404, 'ERR_PITCH_NOT_FOUND');
        }

        if ($id > 0) {
            $stmt = $pdo->prepare("
                UPDATE pitch_maintenance
                SET pitch_id = ?, start_date = ?, end_date = ?, start_time = ?, end_time = ?, reason = ?, status = ?
                WHERE id = ?
            ");
            $stmt->execute([$pitchId, $startDate, $endDate, $startTime, $endTime, $reason, $status, $id]);
        } else {
            $stmt = $pdo->prepare("
                INSERT INTO pitch_maintenance (pitch_id, start_date, end_date, start_time, end_time, reason, status, created_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            $stmt->execute([$pitchId, $startDate, $endDate, $startTime, $endTime, $reason, $status, $mgr['id']]);
            $id = (int)$pdo->lastInsertId();
        }

        $affected = in_array($status, ['scheduled', 'in_progress'], true)
            ? find_maintenance_affected_bookings($pdo, $pitchId, $startDate, $endDate, $startTime, $endTime)
            : [];

        write_audit_log(
            $pdo,
            'MAINTENANCE_ADD',
            $pitchId,
            null,
            "Lịch bảo trì #{$id} ({$pitchName}) {$startDate}..{$endDate} ({$startTime}-{$endTime}): {$reason} | Ảnh hưởng " . count($affected) . " đơn",
            $mgr
        );

        $msg = "Đã lưu lịch bảo trì sân {$pitchName} ({$startTime} - {$endTime})!";
        if (count($affected) > 0) {
            $msg .= " Phát hiện " . count($affected) . " đơn đặt trùng giờ cần liên hệ đổi sân/hoàn cọc.";
        }

        json_response([
            'success' => true,
            'message' => $msg,
            'data'    => [
                'id'               => $id,
                'affectedBookings' => $affected
            ]
        ]);
    }

    // 6.3 Lịch bảo trì sân: Cập nhật trạng thái
    if ($action === 'update_maintenance') {
        $mgr = require_manager_or_admin($pdo);
        $id = (int)($data['id'] ?? 0);
        $status = sanitize_string($data['status'] ?? 'completed', 20);
        if ($id <= 0 || !in_array($status, ['scheduled', 'in_progress', 'completed', 'cancelled'], true)) {
            json_error('ID hoặc trạng thái bảo trì không hợp lệ.', 400, 'ERR_INVALID_PARAMS');
        }

        $mStmt = $pdo->prepare("SELECT * FROM pitch_maintenance WHERE id = ? LIMIT 1");
        $mStmt->execute([$id]);
        $mRow = $mStmt->fetch();
        if (!$mRow) {
            json_error('Không tìm thấy lịch bảo trì.', 404, 'ERR_NOT_FOUND');
        }

        $stmt = $pdo->prepare("UPDATE pitch_maintenance SET status = ? WHERE id = ?");
        $stmt->execute([$status, $id]);

        $affected = in_array($status, ['scheduled', 'in_progress'], true)
            ? find_maintenance_affected_bookings($pdo, (string)$mRow['pitch_id'], (string)$mRow['start_date'], (string)$mRow['end_date'], (string)($mRow['start_time'] ?? '05:30'), (string)($mRow['end_time'] ?? '23:00'))
            : [];

        write_audit_log($pdo, 'MAINTENANCE_UPDATE', $mRow['pitch_id'], $mRow['status'], "{$status} (Lịch #{$id})", $mgr);
        json_response([
            'success' => true,
            'message' => "Đã cập nhật trạng thái bảo trì thành {$status}!",
            'data'    => ['id' => $id, 'status' => $status, 'affectedBookings' => $affected]
        ]);
    }

