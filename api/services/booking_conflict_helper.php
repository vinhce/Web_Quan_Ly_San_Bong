<?php
// Trợ thủ kiểm tra trùng lịch đặt sân & lịch bảo trì

function parse_time_to_minutes(string $hhmm): ?int {
    if (!preg_match('/^(\d{1,2}):(\d{2})$/', trim($hhmm), $m)) {
        return null;
    }
    $h = (int)$m[1];
    $min = (int)$m[2];
    if ($h < 0 || $h > 23 || $min < 0 || $min > 59) {
        return null;
    }
    return ($h * 60) + $min;
}

function parse_slot_time_range(string $slotTime): ?array {
    if (preg_match('/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/', $slotTime, $m)) {
        $s = parse_time_to_minutes($m[1]);
        $e = parse_time_to_minutes($m[2]);
        if ($s !== null && $e !== null && $e > $s) {
            return ['startMin' => $s, 'endMin' => $e, 'start' => $m[1], 'end' => $m[2]];
        }
    }
    return null;
}

function time_ranges_overlap(int $aStart, int $aEnd, int $bStart, int $bEnd): bool {
    return ($aStart < $bEnd) && ($bStart < $aEnd);
}

function booking_occurrence_dates(array $booking): array {
    $startDate = (string)($booking['booking_date'] ?? $booking['date'] ?? '');
    $start = DateTimeImmutable::createFromFormat('!Y-m-d', $startDate);
    if (!$start || $start->format('Y-m-d') !== $startDate) {
        throw new InvalidArgumentException('Ngày bắt đầu đơn đặt sân không hợp lệ.');
    }
    $weeks = max(1, (int)($booking['weeks_count'] ?? $booking['weeksCount'] ?? 1));
    $dates = [];
    for ($week = 0; $week < $weeks; $week++) {
        $dates[] = $start->modify('+' . ($week * 7) . ' days')->format('Y-m-d');
    }
    return $dates;
}

function booking_date_condition_sql(string $alias = 'b'): string {
    if (!preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/D', $alias)) {
        throw new InvalidArgumentException('Bí danh bảng đặt sân không hợp lệ.');
    }
    return "(DATEDIFF(?, {$alias}.booking_date) BETWEEN 0 AND 7 * (GREATEST(1, COALESCE({$alias}.weeks_count, 1)) - 1)"
        . " AND MOD(DATEDIFF(?, {$alias}.booking_date), 7) = 0)";
}

function booking_conflict_query_sql(): string {
    $dateCondition = booking_date_condition_sql('b');
    return "SELECT b.code
            FROM bookings b
            JOIN time_slots occupied_slot ON occupied_slot.id = b.slot_id
            JOIN time_slots requested_slot ON requested_slot.id = ?
            WHERE b.pitch_id = ?
              AND {$dateCondition}
              AND TIME(occupied_slot.start_time) < TIME(requested_slot.end_time)
              AND TIME(requested_slot.start_time) < TIME(occupied_slot.end_time)
              AND b.code <> ?
              AND b.status NOT IN ('Đã hủy', 'Khách chưa đến')
              AND b.payment_status NOT IN ('Đã hủy', 'Tịch thu cọc 30%', 'Đã hoàn cọc 100%', 'Bảo lưu cọc 30%', 'Phạt 50% cọc')
            LIMIT 1";
}

function find_booking_conflict(PDO $pdo, string $pitchId, string $date, string $slotId, string $excludeCode = ''): ?array {
    if (!$pdo->inTransaction()) {
        throw new LogicException('Kiểm tra trùng lịch phải nằm trong giao dịch đã khóa sân.');
    }
    $stmt = $pdo->prepare(booking_conflict_query_sql() . ' FOR UPDATE');
    $stmt->execute([$slotId, $pitchId, $date, $date, $excludeCode]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

function find_active_maintenance_for_slot(?PDO $pdo, string $pitchId, string $date, string $slotTime = ''): ?array {
    if (!$pdo || $pitchId === '' || $date === '') {
        return null;
    }
    try {
        $stmt = $pdo->prepare("
            SELECT id, pitch_id, start_date, end_date, start_time, end_time, reason, status
            FROM pitch_maintenance
            WHERE pitch_id = ?
              AND status IN ('scheduled', 'in_progress')
              AND ? BETWEEN start_date AND end_date
            ORDER BY id DESC
        ");
        $stmt->execute([$pitchId, $date]);
        $rows = $stmt->fetchAll();
        if (empty($rows)) {
            return null;
        }
        $slotRange = parse_slot_time_range($slotTime);
        foreach ($rows as $row) {
            if ($slotRange === null) {
                return $row;
            }
            $mStart = parse_time_to_minutes((string)($row['start_time'] ?? '05:30')) ?? (5 * 60 + 30);
            $mEnd   = parse_time_to_minutes((string)($row['end_time'] ?? '23:00')) ?? (23 * 60);
            if ($mEnd <= $mStart) {
                return $row;
            }
            if (time_ranges_overlap($slotRange['startMin'], $slotRange['endMin'], $mStart, $mEnd)) {
                return $row;
            }
        }
        return null;
    } catch (Exception $e) {
        error_log("[MAINTENANCE CHECK WARN] " . $e->getMessage());
        return null;
    }
}

function find_maintenance_affected_bookings(PDO $pdo, string $pitchId, string $startDate, string $endDate, string $startTime = '05:30', string $endTime = '23:00'): array {
    try {
        $mStart = parse_time_to_minutes($startTime) ?? (5 * 60 + 30);
        $mEnd   = parse_time_to_minutes($endTime) ?? (23 * 60);
        $stmt = $pdo->prepare("
            SELECT id, code, customer_name, phone, pitch_id, booking_date, slot_id, slot_time, status, payment_status, deposit_amount, paid_amount
            FROM bookings
            WHERE pitch_id = ?
              AND booking_date BETWEEN ? AND ?
              AND status NOT IN ('Đã hủy', 'Khách chưa đến', 'Hoàn thành')
              AND payment_status NOT IN ('Đã hủy', 'Tịch thu cọc 30%', 'Đã hoàn cọc 100%', 'Bảo lưu cọc 30%', 'Phạt 50% cọc')
            ORDER BY booking_date ASC, slot_time ASC
        ");
        $stmt->execute([$pitchId, $startDate, $endDate]);
        $candidates = $stmt->fetchAll();
        $affected = [];
        foreach ($candidates as $row) {
            $slotRange = parse_slot_time_range((string)($row['slot_time'] ?? ''));
            if ($slotRange === null || $mEnd <= $mStart || time_ranges_overlap($slotRange['startMin'], $slotRange['endMin'], $mStart, $mEnd)) {
                $affected[] = [
                    'code'          => $row['code'],
                    'customerName'  => $row['customer_name'],
                    'phone'         => $row['phone'],
                    'bookingDate'   => $row['booking_date'],
                    'slotId'        => $row['slot_id'],
                    'slotTime'      => $row['slot_time'],
                    'status'        => $row['status'],
                    'paymentStatus' => $row['payment_status']
                ];
            }
        }
        return $affected;
    } catch (Exception $e) {
        error_log("[MAINTENANCE AFFECTED WARN] " . $e->getMessage());
        return [];
    }
}
