<?php
// Trợ thủ sinh ca đá cố định hàng tuần (Recurring Bookings Generator)

function generate_recurring_bookings_window(?PDO $pdo, ?int $onlyScheduleId = null, int $horizonWeeks = 4, ?array $actor = null): array {
    if (!$pdo) {
        return ['generated_count' => 0, 'conflicts' => [], 'bookings' => [], 'schedules_scanned' => 0];
    }
    $horizonWeeks = max(1, min(12, $horizonWeeks));
    $sql = "
        SELECT r.*, ts.slot_time, p.name AS pitch_name
        FROM recurring_schedules r
        LEFT JOIN time_slots ts ON r.slot_id = ts.id
        LEFT JOIN pitches p ON r.pitch_id = p.id
        WHERE r.status = 'active'
    ";
    $params = [];
    if ($onlyScheduleId !== null && $onlyScheduleId > 0) {
        $sql .= " AND r.id = ?";
        $params[] = $onlyScheduleId;
    } else {
        $sql .= " AND (r.is_open_ended = 1 OR r.end_date >= CURDATE())";
    }
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $schedules = $stmt->fetchAll();

    $generatedBookings = [];
    $conflicts = [];
    $todayStr = date('Y-m-d');
    $todayTs  = strtotime($todayStr);

    foreach ($schedules as $sch) {
        $schId      = (int)$sch['id'];
        $pitchId    = (string)$sch['pitch_id'];
        $slotId     = (string)$sch['slot_id'];
        $slotTime   = (string)($sch['slot_time'] ?: '17:30 - 19:00');
        $dayOfWeek  = max(1, min(7, (int)$sch['day_of_week']));
        $startStr   = (string)$sch['start_date'];
        $startTs    = max($todayTs, strtotime($startStr) ?: $todayTs);
        $isOpenEnd  = (int)($sch['is_open_ended'] ?? 0) === 1;
        $endStr     = (string)($sch['end_date'] ?? '');
        $endTs      = (!$isOpenEnd && $endStr !== '') ? strtotime($endStr) : null;

        $windowEndTs = strtotime('+' . (($horizonWeeks * 7) - 1) . ' days', $startTs);
        if ($endTs !== null && $endTs < $windowEndTs) {
            $windowEndTs = $endTs;
        }
        if ($windowEndTs < $startTs) {
            continue;
        }

        if (is_phone_blacklisted($pdo, (string)$sch['phone'])) {
            $conflicts[] = [
                'schedule_code' => $sch['schedule_code'],
                'date'          => date('Y-m-d', $startTs),
                'reason'        => 'Khách hàng đang thuộc danh sách hạn chế (Blacklist)'
            ];
            continue;
        }

        $curTs = $startTs;
        $safety = 0;
        while ((int)date('N', $curTs) !== $dayOfWeek && $safety < 8) {
            $curTs = strtotime('+1 day', $curTs);
            $safety++;
        }

        $pricePerMatch   = max(0, (int)($sch['price_per_match'] ?? 0));
        $depositPerMatch = max(0, (int)($sch['deposit_per_match'] ?? 0));
        $remainingMatch  = max(0, $pricePerMatch - $depositPerMatch);
        $note            = (string)($sch['note'] ?? '');

        while ($curTs <= $windowEndTs) {
            $bookingDate = date('Y-m-d', $curTs);

            try {
                $pdo->beginTransaction();
                $pitchLock = $pdo->prepare("SELECT id FROM pitches WHERE id = ? LIMIT 1 FOR UPDATE");
                $pitchLock->execute([$pitchId]);
                if (!$pitchLock->fetchColumn()) {
                    throw new RuntimeException('Không tìm thấy sân của lịch cố định.');
                }

                $ownDateCondition = booking_date_condition_sql('b');
                $existsOwn = $pdo->prepare("SELECT b.id FROM bookings b WHERE b.recurring_schedule_id = ? AND {$ownDateCondition} LIMIT 1 FOR UPDATE");
                $existsOwn->execute([$schId, $bookingDate, $bookingDate]);
                if ($existsOwn->fetchColumn()) {
                    $pdo->commit();
                    $curTs = strtotime('+7 days', $curTs);
                    continue;
                }

                $busyBooking = find_booking_conflict($pdo, $pitchId, $bookingDate, $slotId);
                if ($busyBooking) {
                    $busyCode = $busyBooking['code'];
                    $pdo->rollBack();
                    $conflicts[] = [
                        'schedule_code' => $sch['schedule_code'],
                        'date'          => $bookingDate,
                        'reason'        => "Trùng khung giờ đã có đơn #{$busyCode}"
                    ];
                    $curTs = strtotime('+7 days', $curTs);
                    continue;
                }

                $maint = find_active_maintenance_for_slot($pdo, $pitchId, $bookingDate, $slotTime);
                if ($maint) {
                    $pdo->rollBack();
                    $conflicts[] = [
                        'schedule_code' => $sch['schedule_code'],
                        'date'          => $bookingDate,
                        'reason'        => "Trùng lịch bảo trì: {$maint['reason']}"
                    ];
                    $curTs = strtotime('+7 days', $curTs);
                    continue;
                }

                $bCode = 'REC' . date('ymd', $curTs) . '-' . strtoupper(substr(bin2hex(random_bytes(2)), 0, 4));
                $payStatus = ($depositPerMatch > 0) ? 'Đã cọc 30%' : 'Chờ duyệt cọc';
                $bIns = $pdo->prepare("
                    INSERT INTO bookings
                    (code, user_id, customer_name, phone, pitch_id, booking_date, slot_id, slot_time, original_price, discount_amount, total_price, deposit_amount, paid_amount, remaining_amount, status, payment_status, payment_method, booking_mode, recurring_schedule_id, note, expires_at, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'Đã xác nhận', ?, 'Lịch cố định hàng tuần', 'recurring', ?, ?, NULL, NOW())
                ");
                $bIns->execute([
                    $bCode, $sch['user_id'] ?? null, $sch['customer_name'], $sch['phone'], $pitchId, $bookingDate,
                    $slotId, $slotTime, $pricePerMatch, $pricePerMatch, $depositPerMatch, $depositPerMatch,
                    $remainingMatch, $payStatus, $schId, $note
                ]);

                $pdo->commit();
                $generatedBookings[] = [
                    'schedule_code' => $sch['schedule_code'],
                    'date'          => $bookingDate,
                    'code'          => $bCode,
                    'status'        => 'Đã xác nhận'
                ];
            } catch (Exception $loopEx) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                error_log("[RECURRING GEN WARN] " . $loopEx->getMessage());
                $conflicts[] = [
                    'schedule_code' => $sch['schedule_code'],
                    'date'          => $bookingDate,
                    'reason'        => 'Lỗi sinh lịch tự động'
                ];
            }

            $curTs = strtotime('+7 days', $curTs);
        }
    }

    if (!empty($conflicts)) {
        $sysActor = $actor ?: ['id' => null, 'full_name' => 'Hệ thống (Recurring)', 'role' => 'system'];
        write_audit_log(
            $pdo,
            'RECURRING_CONFLICT_SKIP',
            $onlyScheduleId ? ('SCH-' . $onlyScheduleId) : null,
            null,
            'Bỏ qua ' . count($conflicts) . ' buổi bị trùng lịch/bảo trì: ' . json_encode(array_slice($conflicts, 0, 5), JSON_UNESCAPED_UNICODE),
            $sysActor
        );
    }

    return [
        'schedules_scanned' => count($schedules),
        'generated_count'   => count($generatedBookings),
        'skipped_conflicts' => count($conflicts),
        'bookings'          => $generatedBookings,
        'conflicts'         => $conflicts
    ];
}
