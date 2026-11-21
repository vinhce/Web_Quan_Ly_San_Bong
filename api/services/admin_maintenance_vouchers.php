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
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $vouchers = array_map(static function (array $v): array {
            return [
                'id'                  => (string)$v['code'],
                'code'                => (string)$v['code'],
                'description'         => (string)($v['description'] ?? ''),
                'discount_type'       => (string)($v['discount_type'] ?? 'percent'),
                'discount_value'      => (int)($v['discount_value'] ?? 0),
                'max_discount_amount' => (int)($v['max_discount_amount'] ?? 0),
                'min_order'           => (int)($v['min_order'] ?? 0),
                'max_usage'           => (int)($v['max_usage'] ?? 0),
                'used_count'          => (int)($v['used_count'] ?? 0),
                'max_per_user'        => (int)($v['max_per_user'] ?? 0),
                'valid_from'          => !empty($v['valid_from']) ? substr((string)$v['valid_from'], 0, 10) : null,
                'valid_to'            => !empty($v['valid_to']) ? substr((string)$v['valid_to'], 0, 10) : null,
                'pitch_type_limit'    => $v['pitch_type_limit'] !== null ? (int)$v['pitch_type_limit'] : null,
                'required_tier'       => $v['required_tier'] ?? null,
                'is_active'           => (int)($v['is_active'] ?? 1),
            ];
        }, $rows);
        json_response(['success' => true, 'data' => $vouchers]);
        return true;
    }

    // 5.4 Vouchers: Lưu mã giảm giá (Admin hoặc Manager)
    if ($action === 'save_voucher') {
        if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
            json_error('Hành động thay đổi dữ liệu bắt buộc dùng phương thức POST.', 405, 'ERR_METHOD_NOT_ALLOWED');
        }
        $mgr = require_manager_or_admin($pdo);

        $code = preg_replace('/\s+/', '', strtoupper(sanitize_string((string)($data['code'] ?? ''), 30)));
        if ($code === '' || !preg_match('/^[A-Z0-9_-]{2,30}$/', $code)) {
            json_error('Mã voucher không hợp lệ (2–30 ký tự chữ in hoa, số, gạch ngang hoặc gạch dưới, không chứa khoảng trắng).', 400, 'ERR_VOUCHER_CODE_INVALID');
        }

        $desc = trim(sanitize_string((string)($data['description'] ?? ''), 255));
        $type = (($data['discount_type'] ?? 'percent') === 'fixed') ? 'fixed' : 'percent';
        $rawVal = $data['discount_value'] ?? null;
        $val = is_numeric($rawVal) ? (int)$rawVal : 0;

        if ($type === 'percent') {
            if ($val < 1 || $val > 100) {
                json_error('Mức giảm theo phần trăm phải từ 1% đến 100%.', 400, 'ERR_INVALID_DISCOUNT_PERCENT');
            }
        } else {
            if ($val < 1) {
                json_error('Mức giảm cố định phải lớn hơn 0đ.', 400, 'ERR_INVALID_DISCOUNT_VALUE');
            }
        }

        $rawMaxDisc = $data['max_discount_amount'] ?? $data['maxDiscountAmount'] ?? 0;
        if (!is_numeric($rawMaxDisc) || (int)$rawMaxDisc < 0) {
            json_error('Mức giảm tối đa (max_discount_amount) phải là số nguyên >= 0.', 400, 'ERR_INVALID_MAX_DISCOUNT');
        }
        $maxDiscountAmount = ($type === 'percent') ? max(0, (int)$rawMaxDisc) : 0;

        $minOrder = max(0, (int)($data['min_order'] ?? 0));
        $maxUsage = max(0, (int)($data['max_usage'] ?? 100));
        $validFrom = !empty($data['valid_from']) ? trim(sanitize_string((string)$data['valid_from'], 15)) : null;
        $validTo = !empty($data['valid_to']) ? trim(sanitize_string((string)$data['valid_to'], 15)) : null;

        if ($validFrom !== null && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $validFrom)) {
            json_error('Ngày bắt đầu (valid_from) không hợp lệ (YYYY-MM-DD).', 400, 'ERR_INVALID_DATE_RANGE');
        }
        if ($validTo !== null && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $validTo)) {
            json_error('Ngày kết thúc (valid_to) không hợp lệ (YYYY-MM-DD).', 400, 'ERR_INVALID_DATE_RANGE');
        }
        if ($validFrom !== null && $validTo !== null && $validTo < $validFrom) {
            json_error('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.', 400, 'ERR_INVALID_DATE_RANGE');
        }

        $rawPitchLimit = (int)($data['pitch_type_limit'] ?? 0);
        $pitchTypeLimit = in_array($rawPitchLimit, [5, 7, 11], true) ? $rawPitchLimit : null;
        $isActive = array_key_exists('is_active', $data) ? (!empty($data['is_active']) ? 1 : 0) : 1;

        $maxPerUser = max(0, (int)($data['max_per_user'] ?? $data['maxPerUser'] ?? 0));
        $rawReqTier = strtolower(trim(sanitize_string((string)($data['required_tier'] ?? $data['requiredTier'] ?? ''), 20)));
        $requiredTier = in_array($rawReqTier, ['standard', 'bronze', 'silver', 'gold', 'diamond'], true) ? $rawReqTier : null;

        $originalCode = preg_replace('/\s+/', '', strtoupper(sanitize_string((string)($data['original_code'] ?? $data['originalCode'] ?? ''), 30)));
        $isEdit = !empty($data['is_edit']) || !empty($data['isEdit']) || (($data['mode'] ?? '') === 'edit') || $originalCode !== '';
        $lookupCode = ($isEdit && $originalCode !== '') ? $originalCode : $code;

        $oldVStmt = $pdo->prepare("SELECT * FROM vouchers WHERE code = ? LIMIT 1");
        $oldVStmt->execute([$lookupCode]);
        $oldVoucher = $oldVStmt->fetch(PDO::FETCH_ASSOC);

        // On new insert: reject duplicate code with 409
        if (!$isEdit && $oldVoucher) {
            json_error("Mã voucher {$code} đã tồn tại. Vui lòng chọn mã khác hoặc mở chế độ chỉnh sửa.", 409, 'ERR_VOUCHER_DUPLICATE');
        }

        // On edit with code rename: check target code not colliding
        if ($isEdit && $originalCode !== '' && $originalCode !== $code) {
            $dupStmt = $pdo->prepare("SELECT code FROM vouchers WHERE code = ? LIMIT 1");
            $dupStmt->execute([$code]);
            if ($dupStmt->fetch()) {
                json_error("Mã voucher {$code} đã tồn tại.", 409, 'ERR_VOUCHER_DUPLICATE');
            }
        }

        if ($oldVoucher) {
            $oldDataComp = [
                'code'                => (string)$oldVoucher['code'],
                'description'         => (string)($oldVoucher['description'] ?? ''),
                'discount_type'       => (string)($oldVoucher['discount_type'] ?? 'percent'),
                'discount_value'      => (int)($oldVoucher['discount_value'] ?? 0),
                'max_discount_amount' => (int)($oldVoucher['max_discount_amount'] ?? 0),
                'min_order'           => (int)($oldVoucher['min_order'] ?? 0),
                'max_usage'           => (int)($oldVoucher['max_usage'] ?? 0),
                'valid_from'          => $oldVoucher['valid_from'] ? substr((string)$oldVoucher['valid_from'], 0, 10) : null,
                'valid_to'            => $oldVoucher['valid_to'] ? substr((string)$oldVoucher['valid_to'], 0, 10) : null,
                'pitch_type_limit'    => $oldVoucher['pitch_type_limit'] !== null ? (int)$oldVoucher['pitch_type_limit'] : null,
                'is_active'           => (int)($oldVoucher['is_active'] ?? 1),
                'required_tier'       => $oldVoucher['required_tier'] ?? null,
                'max_per_user'        => (int)($oldVoucher['max_per_user'] ?? 0),
            ];
            $newDataComp = [
                'code'                => $code,
                'description'         => $desc,
                'discount_type'       => $type,
                'discount_value'      => $val,
                'max_discount_amount' => $maxDiscountAmount,
                'min_order'           => $minOrder,
                'max_usage'           => $maxUsage,
                'valid_from'          => $validFrom ? substr((string)$validFrom, 0, 10) : null,
                'valid_to'            => $validTo ? substr((string)$validTo, 0, 10) : null,
                'pitch_type_limit'    => $pitchTypeLimit,
                'is_active'           => $isActive,
                'required_tier'       => $requiredTier,
                'max_per_user'        => $maxPerUser,
            ];
            $changeCheck = logAdminChange($pdo, 'VOUCHER_SAVE', $oldDataComp, $newDataComp, "Voucher: {$code}", 'voucher', $mgr);
            if (!$changeCheck['has_change']) {
                json_response(['success' => true, 'has_changed' => false, 'message' => "Không có thay đổi để lưu cho mã voucher {$code}."]);
                return true;
            }

            $updStmt = $pdo->prepare("
                UPDATE vouchers
                SET code = ?, description = ?, discount_type = ?, discount_value = ?,
                    min_order = ?, max_usage = ?, valid_from = ?, valid_to = ?,
                    pitch_type_limit = ?, is_active = ?
                WHERE code = ?
            ");
            $updStmt->execute([$code, $desc, $type, $val, $minOrder, $maxUsage, $validFrom, $validTo, $pitchTypeLimit, $isActive, $lookupCode]);
        } else {
            $insStmt = $pdo->prepare("
                INSERT INTO vouchers (code, description, discount_type, discount_value, min_order, max_usage, valid_from, valid_to, pitch_type_limit, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $insStmt->execute([$code, $desc, $type, $val, $minOrder, $maxUsage, $validFrom, $validTo, $pitchTypeLimit, $isActive]);
        }

        $hasReqTier = db_table_has_column($pdo, 'vouchers', 'required_tier');
        $hasMaxUser = db_table_has_column($pdo, 'vouchers', 'max_per_user');
        $hasMaxDisc = db_table_has_column($pdo, 'vouchers', 'max_discount_amount');
        if ($hasReqTier || $hasMaxUser || $hasMaxDisc) {
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
            if ($hasMaxDisc) {
                $extraUpdates[] = "max_discount_amount = ?";
                $extraParams[] = $maxDiscountAmount;
            }
            $extraParams[] = $code;
            try {
                $updExt = $pdo->prepare("UPDATE vouchers SET " . implode(', ', $extraUpdates) . " WHERE code = ?");
                $updExt->execute($extraParams);
            } catch (Throwable $ve) {
                error_log("[VOUCHER EXTRA UPDATE WARN] " . $ve->getMessage());
            }
        }

        if (!$oldVoucher) {
            write_audit_log($pdo, 'VOUCHER_SAVE', "Voucher: {$code}", null, "Tạo mới voucher {$code}: Giảm {$val} ({$type}), Max {$maxUsage} lượt", $mgr, 'voucher');
        }
        json_response(['success' => true, 'has_changed' => true, 'message' => "Lưu voucher {$code} thành công!"]);
        return true;
    }

    // 5.4 Vouchers: Bật / Tắt mã giảm giá (Admin hoặc Manager)
    if ($action === 'toggle_voucher') {
        if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
            json_error('Hành động thay đổi dữ liệu bắt buộc dùng phương thức POST.', 405, 'ERR_METHOD_NOT_ALLOWED');
        }
        $mgr = require_manager_or_admin($pdo);
        $code = preg_replace('/\s+/', '', strtoupper(sanitize_string((string)($data['code'] ?? $data['id'] ?? ''), 30)));
        if ($code === '') {
            json_error('Thiếu mã voucher cần thay đổi trạng thái.', 400, 'ERR_VOUCHER_CODE_INVALID');
        }

        $vStmt = $pdo->prepare("SELECT code, is_active FROM vouchers WHERE code = ? LIMIT 1");
        $vStmt->execute([$code]);
        $vRow = $vStmt->fetch(PDO::FETCH_ASSOC);
        if (!$vRow) {
            json_error("Không tìm thấy mã voucher {$code}.", 404, 'ERR_VOUCHER_NOT_FOUND');
        }

        $oldActive = (int)$vRow['is_active'];
        $newActive = array_key_exists('is_active', $data)
            ? (!empty($data['is_active']) ? 1 : 0)
            : ($oldActive === 1 ? 0 : 1);

        $updStmt = $pdo->prepare("UPDATE vouchers SET is_active = ? WHERE code = ?");
        $updStmt->execute([$newActive, $code]);

        write_audit_log($pdo, 'VOUCHER_TOGGLE', "Voucher: {$code}", ['is_active' => $oldActive], ['is_active' => $newActive], $mgr, 'voucher');
        json_response([
            'success' => true,
            'message' => $newActive === 1
                ? "Đã kích hoạt mã voucher {$code}!"
                : "Đã tạm ngừng mã voucher {$code}!",
            'data'    => [
                'id'        => $code,
                'code'      => $code,
                'is_active' => $newActive,
            ],
        ]);
        return true;
    }

    // 5.4 Vouchers: Xóa mã (Admin hoặc Manager)
    if ($action === 'delete_voucher') {
        if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
            json_error('Hành động thay đổi dữ liệu bắt buộc dùng phương thức POST.', 405, 'ERR_METHOD_NOT_ALLOWED');
        }
        $mgr = require_manager_or_admin($pdo);
        $code = preg_replace('/\s+/', '', strtoupper(sanitize_string((string)($data['code'] ?? $data['id'] ?? ''), 30)));
        if ($code === '') {
            json_error('Thiếu mã voucher cần xóa.', 400, 'ERR_VOUCHER_CODE_INVALID');
        }
        $stmt = $pdo->prepare("DELETE FROM vouchers WHERE code = ?");
        $stmt->execute([$code]);
        write_audit_log($pdo, 'VOUCHER_DELETE', "Voucher: {$code}", null, "Xóa voucher {$code}", $mgr, 'voucher');
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
        if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
            json_error('Hành động thay đổi dữ liệu bắt buộc dùng phương thức POST.', 405, 'ERR_METHOD_NOT_ALLOWED');
        }
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
            $oldRuleStmt = $pdo->prepare("SELECT * FROM golden_hour_rules WHERE id = ? LIMIT 1");
            $oldRuleStmt->execute([$id]);
            $oldRule = $oldRuleStmt->fetch(PDO::FETCH_ASSOC);

            if ($oldRule) {
                $oldRuleComp = [
                    'rule_name'             => $oldRule['rule_name'] ?? '',
                    'pitch_type'            => $oldRule['pitch_type'] !== null ? (int)$oldRule['pitch_type'] : null,
                    'day_of_week'           => $oldRule['day_of_week'] !== null ? (int)$oldRule['day_of_week'] : null,
                    'slot_id'               => $oldRule['slot_id'] ?? null,
                    'price_adjustment_type' => $oldRule['price_adjustment_type'] ?? 'fixed',
                    'adjustment_value'      => (int)($oldRule['adjustment_value'] ?? 0),
                    'description'           => $oldRule['description'] ?? '',
                    'is_active'             => (int)($oldRule['is_active'] ?? 1)
                ];
                $newRuleComp = [
                    'rule_name'             => $ruleName,
                    'pitch_type'            => $pitchType,
                    'day_of_week'           => $dayOfWeek,
                    'slot_id'               => $slotId,
                    'price_adjustment_type' => $adjType,
                    'adjustment_value'      => $adjVal,
                    'description'           => $desc,
                    'is_active'             => $isActive
                ];
                $ruleChangeCheck = logAdminChange($pdo, 'GOLDEN_HOUR_SAVE', $oldRuleComp, $newRuleComp, "Giờ vàng: {$ruleName}", 'pricing', $admin);
                if (!$ruleChangeCheck['has_change']) {
                    json_response(['success' => true, 'has_changed' => false, 'message' => "Không có thay đổi để lưu cho quy tắc giờ vàng '{$ruleName}'."]);
                    return true;
                }
            }

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
            write_audit_log($pdo, 'GOLDEN_HOUR_SAVE', "Giờ vàng: {$ruleName}", null, "Tạo mới quy tắc giờ vàng: {$ruleName}", $admin);
        }

        json_response(['success' => true, 'has_changed' => true, 'message' => "Lưu quy tắc giờ vàng '{$ruleName}' thành công!"]);
        return true;
    }

    // 5.4 Giờ vàng: Xóa quy tắc
    if ($action === 'delete_golden_hour') {
        if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
            json_error('Hành động thay đổi dữ liệu bắt buộc dùng phương thức POST.', 405, 'ERR_METHOD_NOT_ALLOWED');
        }
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
        if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
            json_error('Hành động thay đổi dữ liệu bắt buộc dùng phương thức POST.', 405, 'ERR_METHOD_NOT_ALLOWED');
        }
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
        if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
            json_error('Hành động thay đổi dữ liệu bắt buộc dùng phương thức POST.', 405, 'ERR_METHOD_NOT_ALLOWED');
        }
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
