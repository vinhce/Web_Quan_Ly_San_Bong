<?php
declare(strict_types=1);

if (!defined('SANBONG_ADMIN_ROUTER')) {
    http_response_code(403);
    exit;
}

function handle_admin_recurring_waitlist(string $action, string $method, PDO $pdo, array $data, array $actor): bool {
    // 5.2 Lịch lặp cố định: Danh sách
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
        return true;
    }

    // 5.2 Lịch lặp cố định: Tạo lịch cố định
    if ($action === 'create_recurring_schedule') {
        if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
            json_error('Hành động thay đổi dữ liệu bắt buộc dùng phương thức POST.', 405, 'ERR_METHOD_NOT_ALLOWED');
        }
        $customerName = sanitize_string($data['customer_name'] ?? $data['customerName'] ?? '', 100);
        $phone = normalize_phone(sanitize_string($data['phone'] ?? '', 25));
        $pitchId = sanitize_string($data['pitch_id'] ?? $data['pitchId'] ?? '', 20);
        $slotId = sanitize_string($data['slot_id'] ?? $data['slotId'] ?? '', 10);
        $dayOfWeek = max(1, min(7, (int)($data['day_of_week'] ?? 1)));
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
        $computedBase = (int)round($baseP);
        $goldRes = resolve_golden_hour_adjustment($pdo, (int)($pitch['type'] ?? 5), $dayOfWeek, (string)$slot['id'], $computedBase);
        $serverPrice = (int)($goldRes['adjustedPitchPrice'] ?? $computedBase);
        $pricePerMatch = (($actor['role'] ?? '') === 'admin' && $pricePerMatch >= 50000) ? $pricePerMatch : $serverPrice;
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
            $scheduleCode, $customerName, $phone, $pitchId, $slotId,
            $dayOfWeek, $startDate, $endDate, $weeksCount, $isOpenEnded,
            $pricePerMatch, $depositPerMatch, $note
        ]);
        $scheduleId = (int)$pdo->lastInsertId();

        $genResult = generate_recurring_bookings_window($pdo, $scheduleId, 4, $actor);
        write_audit_log(
            $pdo, 'RECURRING_CREATE', $scheduleCode, null,
            "Tạo lịch cố định " . ($isOpenEnded ? 'dài hạn' : "{$weeksCount} tuần") . " sân {$pitch['name']} ({$slot['slot_time']}) cho {$customerName} ({$phone})",
            $actor
        );

        $msg = "Tạo lịch lặp {$scheduleCode} thành công! Đã sinh trước {$genResult['generated_count']} buổi.";
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
                'skipped_conflicts' => $genResult['skipped_conflicts']
            ]
        ], 201);
        return true;
    }

    // 5.2 Lịch lặp cố định: Hủy chuỗi lịch
    if ($action === 'cancel_recurring_schedule') {
        if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
            json_error('Hành động thay đổi dữ liệu bắt buộc dùng phương thức POST.', 405, 'ERR_METHOD_NOT_ALLOWED');
        }
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

        write_audit_log($pdo, 'RECURRING_CANCEL', $schedule['schedule_code'], $schedule['status'], "cancelled (Hủy {$cancelledCount} buổi) | {$reason}", $mgr);
        json_response([
            'success' => true,
            'message' => "Đã dừng chuỗi lịch lặp {$schedule['schedule_code']} và nhả {$cancelledCount} ca sắp tới."
        ]);
        return true;
    }

    // 5.2 Lịch lặp cố định: Xin nghỉ 1 buổi
    if ($action === 'skip_recurring_booking') {
        if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
            json_error('Hành động thay đổi dữ liệu bắt buộc dùng phương thức POST.', 405, 'ERR_METHOD_NOT_ALLOWED');
        }
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

        write_audit_log($pdo, 'RECURRING_SKIP_DATE', $bookingCode, $booking['status'], "Tạm nghỉ buổi {$booking['booking_date']} | {$reason}", $actor);
        trigger_waitlist_notification($pdo, (string)$booking['pitch_id'], (string)$booking['booking_date'], (string)$booking['slot_id'], (string)($booking['slot_time'] ?? ''), $actor, $bookingCode);

        json_response([
            'success' => true,
            'message' => "Đã cho khách tạm nghỉ buổi ngày {$booking['booking_date']} và nhả sân thành công."
        ]);
        return true;
    }

    // 5.3 Waitlist: Danh sách chờ
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
        return true;
    }

    // 5.3 Waitlist: Gán khách vào ca đá
    if ($action === 'assign_waitlist') {
        if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
            json_error('Hành động thay đổi dữ liệu bắt buộc dùng phương thức POST.', 405, 'ERR_METHOD_NOT_ALLOWED');
        }
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
                    json_error("Khung giờ này vẫn đang có đơn #{$busyCode} hoạt động.", 409, 'ERR_DOUBLE_BOOKING');
                }

                $ts = strtotime((string)$wlRow['booking_date']);
                $wDay = (int)date('w', $ts);
                $isWeekend = ($wDay === 0 || $wDay === 6);
                $weekendPrice = (int)($pitch['weekend_price'] ?? 0);
                $baseP = ($isWeekend && $weekendPrice > 0) ? ($slot['is_peak'] ? max((int)$pitch['peak_price'], $weekendPrice) : $weekendPrice) : ($slot['is_peak'] ? (int)$pitch['peak_price'] : (int)$pitch['base_price']);
                $origPitchPrice = (int)round($baseP);
                $ghEval = resolve_golden_hour_adjustment($pdo, (int)$pitch['type'], (int)date('N', $ts), (string)$slot['id'], $origPitchPrice);
                $totalPrice = (int)$ghEval['adjustedPitchPrice'];
                $origPrice = max($origPitchPrice, $totalPrice);
                $discAmt = max(0, $origPrice - $totalPrice);

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
                    $bookingCode, $wlRow['user_id'] ?? null, $wlRow['customer_name'], $wlRow['phone'],
                    $wlRow['pitch_id'], $wlRow['booking_date'], $wlRow['slot_id'], $slot['slot_time'],
                    $origPrice, $discAmt, $totalPrice, $depositAmount, $totalPrice,
                    '[Từ Waitlist #' . $waitlistId . '] ' . (string)($wlRow['note'] ?? ''), $expiresAt
                ]);
            }

            $pdo->prepare("UPDATE waitlist SET status = 'converted', converted_booking_code = ?, updated_at = NOW() WHERE id = ?")
                ->execute([$bookingCode, $waitlistId]);
            $pdo->commit();
        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }

        write_audit_log($pdo, 'WAITLIST_ASSIGN', $bookingCode, $wlRow['status'] ?? 'waiting', "Gán khách {$wlRow['customer_name']} -> đơn {$bookingCode}", $actor);
        json_response([
            'success' => true,
            'message' => "Đã xếp sân cho {$wlRow['customer_name']} thành công (Mã đơn: {$bookingCode})!",
            'data'    => ['waitlist_id' => $waitlistId, 'booking_code' => $bookingCode]
        ]);
        return true;
    }

    // 5.3 Waitlist: Báo sân trống / Hủy
    if ($action === 'notify_waitlist' || $action === 'cancel_waitlist') {
        if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
            json_error('Hành động thay đổi dữ liệu bắt buộc dùng phương thức POST.', 405, 'ERR_METHOD_NOT_ALLOWED');
        }
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

        if ($action === 'notify_waitlist') {
            $pdo->prepare("UPDATE waitlist SET status = 'notified', notified_at = NOW(), updated_at = NOW() WHERE id = ?")->execute([$waitlistId]);
            $settings = get_system_settings_map($pdo);
            $holdMins = max(5, min(120, (int)($settings['waitlist_hold_minutes'] ?? 15)));
            write_audit_log($pdo, 'WAITLIST_NOTIFIED', 'WL-' . $waitlistId, $wl['status'], "Báo sân trống ưu tiên {$holdMins}p cho {$wl['customer_name']}", $actor);
            json_response(['success' => true, 'message' => "Đã gửi thông báo giữ chỗ {$holdMins} phút cho {$wl['customer_name']}."]);
            return true;
        } else {
            $pdo->prepare("UPDATE waitlist SET status = 'cancelled', updated_at = NOW() WHERE id = ?")->execute([$waitlistId]);
            write_audit_log($pdo, 'WAITLIST_CANCEL', 'WL-' . $waitlistId, $wl['status'], 'cancelled', $actor);
            if ($wl['status'] === 'notified') {
                trigger_waitlist_notification($pdo, (string)$wl['pitch_id'], (string)$wl['booking_date'], (string)$wl['slot_id'], (string)($wl['slot_time'] ?? ''), $actor);
            }
            json_response(['success' => true, 'message' => 'Đã hủy lượt đăng ký danh sách chờ.']);
            return true;
        }
    }

    return false;
}
