<?php
// Trợ thủ quản lý hàng chờ sân bóng (Waitlist)

function trigger_waitlist_notification(?PDO $pdo, string $pitchId, string $bookingDate, string $slotId, string $slotTime = '', ?array $actor = null, ?string $releasedCode = null): ?array {
    if (!$pdo || $pitchId === '' || $bookingDate === '' || $slotId === '') {
        return null;
    }
    try {
        $busyStmt = $pdo->prepare(booking_conflict_query_sql());
        $busyStmt->execute([$slotId, $pitchId, $bookingDate, $bookingDate, '']);
        if ($busyStmt->fetchColumn()) {
            return null;
        }

        if ($slotTime === '') {
            $tsStmt = $pdo->prepare("SELECT slot_time FROM time_slots WHERE id = ? LIMIT 1");
            $tsStmt->execute([$slotId]);
            $slotTime = (string)($tsStmt->fetchColumn() ?: $slotId);
        }
        if (find_active_maintenance_for_slot($pdo, $pitchId, $bookingDate, $slotTime)) {
            return null;
        }

        $activeHoldStmt = $pdo->prepare("SELECT id FROM waitlist WHERE pitch_id = ? AND booking_date = ? AND slot_id = ? AND status = 'notified' LIMIT 1");
        $activeHoldStmt->execute([$pitchId, $bookingDate, $slotId]);
        if ($activeHoldStmt->fetchColumn()) {
            return null;
        }

        $wlStmt = $pdo->prepare("
            SELECT * FROM waitlist
            WHERE pitch_id = ? AND booking_date = ? AND slot_id = ? AND status = 'waiting'
            ORDER BY created_at ASC, id ASC
            LIMIT 1
        ");
        $wlStmt->execute([$pitchId, $bookingDate, $slotId]);
        $wlCustomer = $wlStmt->fetch();
        if (!$wlCustomer) {
            return null;
        }

        $pdo->prepare("UPDATE waitlist SET status = 'notified', notified_at = NOW(), updated_at = NOW() WHERE id = ?")->execute([$wlCustomer['id']]);
        $settings = get_system_settings_map($pdo);
        $holdMins = max(5, min(120, (int)($settings['waitlist_hold_minutes'] ?? 15)));

        $pStmt = $pdo->prepare("SELECT name FROM pitches WHERE id = ? LIMIT 1");
        $pStmt->execute([$pitchId]);
        $pitchName = (string)($pStmt->fetchColumn() ?: $pitchId);

        $sysActor = $actor ?: ['id' => null, 'full_name' => 'Hệ thống', 'role' => 'system'];
        write_audit_log(
            $pdo,
            'WAITLIST_NOTIFIED',
            $releasedCode,
            'waiting',
            "Báo sân trống {$pitchName} ({$bookingDate} {$slotTime}) cho khách {$wlCustomer['customer_name']} ({$wlCustomer['phone']}) - Giữ ưu tiên {$holdMins}p",
            $sysActor
        );

        if (file_exists(__DIR__ . '/../notification_helper.php')) {
            require_once __DIR__ . '/../notification_helper.php';
            if (function_exists('send_telegram_notification')) {
                $wlTg = "🔔 <b>DANH SÁCH CHỜ: CÓ SÂN TRỐNG VỪA NHẢ!</b>\n"
                      . "• Sân: <b>{$pitchName}</b> ({$pitchId}) | Ngày: <b>" . date('d/m/Y', strtotime($bookingDate)) . "</b> | Slot: <b>{$slotTime}</b>\n"
                      . "• Khách ưu tiên: <b>{$wlCustomer['customer_name']}</b> - SĐT: <code>{$wlCustomer['phone']}</code>\n"
                      . "• Thời hạn phản hồi giữ chỗ: <b>{$holdMins} phút</b>.";
                send_telegram_notification($wlTg, 'waitlist', $pdo);
            }
            if (function_exists('send_customer_notification')) {
                send_customer_notification($pdo, 'waitlist_notify', [
                    'booking_id'    => null,
                    'booking_code'  => $releasedCode,
                    'customer_name' => $wlCustomer['customer_name'],
                    'phone'         => $wlCustomer['phone'],
                    'pitch_name'    => $pitchName,
                    'date'          => date('d/m/Y', strtotime($bookingDate)),
                    'slot_time'     => $slotTime,
                    'hold_minutes'  => $holdMins,
                    'custom_title'  => "Sân {$pitchName} vừa trống slot {$slotTime} ngày " . date('d/m/Y', strtotime($bookingDate)),
                    'custom_content'=> "Xin chào {$wlCustomer['customer_name']}, khung giờ {$slotTime} ngày " . date('d/m/Y', strtotime($bookingDate)) . " tại {$pitchName} bạn đăng ký chờ vừa có sân trống. Sân giữ ưu tiên cho bạn trong {$holdMins} phút!"
                ]);
            }
        }

        return $wlCustomer;
    } catch (Exception $e) {
        error_log("[WAITLIST TRIGGER WARN] " . $e->getMessage());
        return null;
    }
}

function expire_stale_waitlist_holds(?PDO $pdo): array {
    try {
        if (!$pdo || $pdo->inTransaction()) {
            return ['expired_count' => 0, 'promoted_count' => 0];
        }
        $settings = get_system_settings_map($pdo);
        $holdMinutes = max(5, min(120, (int)($settings['waitlist_hold_minutes'] ?? 15)));
        $expiredRows = [];

        try {
            $pdo->beginTransaction();
            $sel = $pdo->prepare("
                SELECT w.*, ts.slot_time
                FROM waitlist w
                LEFT JOIN time_slots ts ON w.slot_id = ts.id
                WHERE w.status = 'notified'
                  AND w.notified_at IS NOT NULL
                  AND w.notified_at <= DATE_SUB(NOW(), INTERVAL ? MINUTE)
                FOR UPDATE
            ");
            $sel->execute([$holdMinutes]);
            $expiredRows = $sel->fetchAll();

            if (!empty($expiredRows)) {
                $upd = $pdo->prepare("
                    UPDATE waitlist
                    SET status = 'cancelled',
                        note = TRIM(CONCAT(IFNULL(note, ''), ' [Hết hạn giữ chỗ waitlist ', ?, 'p]')),
                        updated_at = NOW()
                    WHERE id = ?
                ");
                foreach ($expiredRows as $er) {
                    $upd->execute([$holdMinutes, (int)$er['id']]);
                }
            }
            $pdo->commit();
        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log("[WAITLIST EXPIRE WARN] " . $e->getMessage());
            return ['expired_count' => 0, 'promoted_count' => 0];
        }

        $promoted = 0;
        if (!empty($expiredRows)) {
            $systemActor = ['id' => null, 'full_name' => 'Hệ thống (Waitlist Cron)', 'role' => 'system'];
            $processedSlots = [];
            foreach ($expiredRows as $er) {
                write_audit_log(
                    $pdo,
                    'WAITLIST_HOLD_EXPIRED',
                    null,
                    'notified',
                    "Hết hạn {$holdMinutes}p giữ chỗ waitlist của {$er['customer_name']} ({$er['phone']}) cho {$er['pitch_id']} {$er['booking_date']}",
                    $systemActor
                );
                $slotKey = $er['pitch_id'] . '|' . $er['booking_date'] . '|' . $er['slot_id'];
                if (!isset($processedSlots[$slotKey])) {
                    $processedSlots[$slotKey] = true;
                    $next = trigger_waitlist_notification($pdo, $er['pitch_id'], $er['booking_date'], $er['slot_id'], (string)($er['slot_time'] ?? ''), $systemActor);
                    if ($next) {
                        $promoted++;
                    }
                }
            }
        }

        return ['expired_count' => count($expiredRows), 'promoted_count' => $promoted, 'hold_minutes' => $holdMinutes];
    } catch (Throwable $t) {
        error_log("[WAITLIST EXPIRE FATAL PREVENTED] " . $t->getMessage());
        return ['expired_count' => 0, 'promoted_count' => 0, 'hold_minutes' => 15];
    }
}
