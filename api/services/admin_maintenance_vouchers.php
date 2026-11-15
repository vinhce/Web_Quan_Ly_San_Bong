<?php
declare(strict_types=1);

if (!defined('SANBONG_ADMIN_ROUTER')) {
    http_response_code(403);
    exit;
}

function handle_admin_maintenance_vouchers(string $action, string $method, PDO $pdo, array $data, array $actor): bool {
    // 5.4 Vouchers: Danh sách
    if ($action === 'get_vouchers') {
        $stmt = $pdo->query("SELECT * FROM vouchers ORDER BY is_active DESC, code ASC");
        $vouchers = $stmt->fetchAll();
        json_response(['success' => true, 'data' => $vouchers]);
        return true;
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

        write_audit_log($pdo, 'VOUCHER_SAVE', $code, null, "Lưu voucher {$code}: Giảm {$val} ({$type}), Max {$maxUsage} lượt", $admin);
        json_response(['success' => true, 'message' => "Lưu voucher {$code} thành công!"]);
        return true;
    }

    // 5.4 Vouchers: Xóa mã
    if ($action === 'delete_voucher') {
        $admin = require_admin($pdo);
        $code = strtoupper(sanitize_string($data['code'] ?? '', 30));
        $stmt = $pdo->prepare("DELETE FROM vouchers WHERE code = ?");
        $stmt->execute([$code]);
        write_audit_log($pdo, 'VOUCHER_DELETE', $code, null, "Xóa voucher {$code}", $admin);
        json_response(['success' => true, 'message' => "Đã xóa voucher {$code}!"]);
        return true;
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
        return true;
    }

    // 5.4 Giờ vàng: Lưu quy tắc
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

        write_audit_log($pdo, 'GOLDEN_HOUR_SAVE', null, null, "Lưu quy tắc giờ vàng: {$ruleName}", $admin);
        json_response(['success' => true, 'message' => "Lưu quy tắc giờ vàng '{$ruleName}' thành công!"]);
        return true;
    }

    // 5.4 Giờ vàng: Xóa quy tắc
    if ($action === 'delete_golden_hour') {
        $admin = require_admin($pdo);
        $id = (int)($data['id'] ?? 0);
        $stmt = $pdo->prepare("DELETE FROM golden_hour_rules WHERE id = ?");
        $stmt->execute([$id]);
        write_audit_log($pdo, 'GOLDEN_HOUR_DELETE', null, null, "Xóa quy tắc giờ vàng #{$id}", $admin);
        json_response(['success' => true, 'message' => "Đã xóa quy tắc giờ vàng!"]);
        return true;
    }

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
        return true;
    }

    // 6.3 Lịch bảo trì sân: Thêm/Sửa
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

        write_audit_log($pdo, 'MAINTENANCE_ADD', $pitchId, null, "Lịch bảo trì #{$id} ({$pitchName}) {$startDate}..{$endDate}: {$reason}", $mgr);
        $msg = "Đã lưu lịch bảo trì sân {$pitchName}!";
        if (count($affected) > 0) {
            $msg .= " Phát hiện " . count($affected) . " đơn đặt trùng giờ cần liên hệ đổi sân.";
        }

        json_response([
            'success' => true,
            'message' => $msg,
            'data'    => ['id' => $id, 'affectedBookings' => $affected]
        ]);
        return true;
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
        write_audit_log($pdo, 'MAINTENANCE_UPDATE', $mRow['pitch_id'], $mRow['status'], "{$status} (Lịch #{$id})", $mgr);
        json_response(['success' => true, 'message' => "Đã cập nhật trạng thái bảo trì thành {$status}!"]);
        return true;
    }

    return false;
}
