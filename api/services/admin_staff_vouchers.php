<?php
declare(strict_types=1);

function handle_admin_vouchers(PDO $pdo, array $data, string $method, array $actor): void {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT code, description, discount_type AS type, discount_type, discount_value AS value, discount_value, min_order AS minOrder, min_order, max_usage, used_count, valid_from, valid_to, pitch_type_limit, is_active FROM vouchers ORDER BY is_active DESC, code ASC");
        json_response(['success' => true, 'data' => $stmt->fetchAll()]);
    }
    if ($method === 'POST') {
        $admin = require_admin($pdo);
        $subAction = sanitize_string($data['sub_action'] ?? 'save', 20);
        $vCode = strtoupper(sanitize_string($data['code'] ?? '', 30));
        if (empty($vCode)) {
            json_response(['success' => false, 'message' => 'Mã voucher không được để trống.'], 400);
        }
        if ($subAction === 'delete') {
            $stmt = $pdo->prepare("DELETE FROM vouchers WHERE code = ?");
            $stmt->execute([$vCode]);
            write_audit_log($pdo, 'VOUCHER_DELETE', $vCode, null, "Xóa voucher {$vCode}", $admin);
            json_response(['success' => true, 'message' => "Đã xóa mã voucher {$vCode}."]);
        }
        if ($subAction === 'toggle') {
            $stmt = $pdo->prepare("UPDATE vouchers SET is_active = NOT is_active WHERE code = ?");
            $stmt->execute([$vCode]);
            write_audit_log($pdo, 'VOUCHER_TOGGLE', $vCode, null, "Bật/tắt voucher {$vCode}", $admin);
            json_response(['success' => true, 'message' => "Đã cập nhật trạng thái mã voucher {$vCode}."]);
        }
        $desc = sanitize_string($data['description'] ?? "Ưu đãi mã {$vCode}", 200);
        $type = (($data['type'] ?? $data['discount_type'] ?? 'percent') === 'fixed') ? 'fixed' : 'percent';
        $val = max(1, (int)($data['value'] ?? $data['discount_value'] ?? 10));
        if ($type === 'percent') {
            $val = min(100, $val);
        }
        $minOrder = max(0, (int)($data['minOrder'] ?? $data['min_order'] ?? 0));
        $maxUsage = max(0, (int)($data['max_usage'] ?? $data['maxUsage'] ?? 100));
        $validFrom = !empty($data['valid_from']) ? sanitize_string($data['valid_from'], 15) : (!empty($data['validFrom']) ? sanitize_string($data['validFrom'], 15) : null);
        $validTo = !empty($data['valid_to']) ? sanitize_string($data['valid_to'], 15) : (!empty($data['validTo']) ? sanitize_string($data['validTo'], 15) : null);
        $rawPitchLimit = (int)($data['pitch_type_limit'] ?? $data['pitchTypeLimit'] ?? 0);
        $pitchTypeLimit = in_array($rawPitchLimit, [5, 7, 11], true) ? $rawPitchLimit : null;

        $maxPerUser = max(0, (int)($data['max_per_user'] ?? $data['maxPerUser'] ?? 0));
        $rawReqTier = strtolower(trim(sanitize_string($data['required_tier'] ?? $data['requiredTier'] ?? '', 20)));
        $requiredTier = in_array($rawReqTier, ['standard', 'bronze', 'silver', 'gold', 'diamond'], true) ? $rawReqTier : null;

        $oldVStmt = $pdo->prepare("SELECT * FROM vouchers WHERE code = ? LIMIT 1");
        $oldVStmt->execute([$vCode]);
        $oldVoucher = $oldVStmt->fetch(PDO::FETCH_ASSOC);

        if ($oldVoucher) {
            $oldDataComp = [
                'description'      => $oldVoucher['description'] ?? '',
                'discount_type'    => $oldVoucher['discount_type'] ?? 'percent',
                'discount_value'   => (int)($oldVoucher['discount_value'] ?? 0),
                'min_order'        => (int)($oldVoucher['min_order'] ?? 0),
                'max_usage'        => (int)($oldVoucher['max_usage'] ?? 0),
                'valid_from'       => $oldVoucher['valid_from'] ? substr((string)$oldVoucher['valid_from'], 0, 10) : null,
                'valid_to'         => $oldVoucher['valid_to'] ? substr((string)$oldVoucher['valid_to'], 0, 10) : null,
                'pitch_type_limit' => $oldVoucher['pitch_type_limit'] !== null ? (int)$oldVoucher['pitch_type_limit'] : null,
                'required_tier'    => $oldVoucher['required_tier'] ?? null,
                'max_per_user'     => (int)($oldVoucher['max_per_user'] ?? 0)
            ];
            $newDataComp = [
                'description'      => $desc,
                'discount_type'    => $type,
                'discount_value'   => $val,
                'min_order'        => $minOrder,
                'max_usage'        => $maxUsage,
                'valid_from'       => $validFrom ? substr((string)$validFrom, 0, 10) : null,
                'valid_to'         => $validTo ? substr((string)$validTo, 0, 10) : null,
                'pitch_type_limit' => $pitchTypeLimit,
                'required_tier'    => $requiredTier,
                'max_per_user'     => $maxPerUser
            ];
            $changeCheck = logAdminChange($pdo, 'VOUCHER_SAVE', $oldDataComp, $newDataComp, "Voucher: {$vCode}", 'voucher', $admin);
            if (!$changeCheck['has_change']) {
                json_response(['success' => true, 'has_changed' => false, 'message' => "Không có thay đổi để lưu cho mã voucher {$vCode}."]);
            }
        }

        $stmt = $pdo->prepare("INSERT INTO vouchers (code, description, discount_type, discount_value, min_order, max_usage, valid_from, valid_to, pitch_type_limit, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE description = VALUES(description), discount_type = VALUES(discount_type), discount_value = VALUES(discount_value), min_order = VALUES(min_order), max_usage = VALUES(max_usage), valid_from = VALUES(valid_from), valid_to = VALUES(valid_to), pitch_type_limit = VALUES(pitch_type_limit), is_active = 1");
        $stmt->execute([$vCode, $desc, $type, $val, $minOrder, $maxUsage, $validFrom, $validTo, $pitchTypeLimit]);

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
            $extraParams[] = $vCode;
            try {
                $updExt = $pdo->prepare("UPDATE vouchers SET " . implode(', ', $extraUpdates) . " WHERE code = ?");
                $updExt->execute($extraParams);
            } catch (Throwable $ve) {
                error_log("[VOUCHER EXTRA UPDATE WARN] " . $ve->getMessage());
            }
        }

        if (!$oldVoucher) {
            write_audit_log($pdo, 'VOUCHER_SAVE', "Voucher: {$vCode}", null, "Tạo mới voucher {$vCode}: Giảm {$val} ({$type}), Max: {$maxUsage}, Sân: " . ($pitchTypeLimit ?: 'Tất cả'), $admin);
        }
        json_response(['success' => true, 'has_changed' => true, 'message' => "Đã lưu mã voucher {$vCode}."]);
    }
}

function handle_admin_staff_users(PDO $pdo, array $data, string $method, array $actor): void {
    $admin = require_admin($pdo);

    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT id, username, email, phone, full_name, role, status, created_at FROM users WHERE role IN ('staff', 'manager') ORDER BY FIELD(role, 'manager', 'staff'), id DESC");
        json_response([
            'success' => true,
            'data'    => $stmt->fetchAll()
        ]);
    }

    if ($method === 'POST') {
        $subAction = sanitize_string($data['sub_action'] ?? '', 30);

        if ($subAction === 'create') {
            $username = sanitize_string($data['username'] ?? '', 50);
            $fullName = sanitize_string($data['full_name'] ?? '', 100);
            $phone = preg_replace('/\s+/', '', sanitize_string($data['phone'] ?? '', 20));
            $password = (string)($data['password'] ?? '');
            $role = sanitize_string($data['role'] ?? 'staff', 20);

            if (!in_array($role, ['staff', 'manager'], true)) {
                json_error('Vai trò chỉ được phép là Nhân viên (staff) hoặc Quản lý sân (manager).', 400, 'ERR_INVALID_ROLE');
            }
            if (!preg_match('/^[a-zA-Z0-9_]{3,30}$/', $username)) {
                json_error('Tên đăng nhập phải từ 3–30 ký tự (chữ cái, số, dấu gạch dưới).', 400, 'ERR_INVALID_USERNAME');
            }
            if (empty($fullName)) {
                json_error('Vui lòng nhập họ và tên nhân viên.', 400, 'ERR_EMPTY_FULLNAME');
            }
            if (!preg_match('/^(0[3|5|7|8|9])[0-9]{8}$/', $phone)) {
                json_error('Số điện thoại không đúng định dạng di động 10 số.', 400, 'ERR_PHONE_FORMAT');
            }
            if (strlen($password) < 8) {
                json_error('Mật khẩu nhân viên phải có tối thiểu 8 ký tự.', 400, 'ERR_WEAK_PASSWORD');
            }

            $email = strtolower($username) . '@sanbongpro.vn';

            $checkStmt = $pdo->prepare("SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1");
            $checkStmt->execute([$username, $email]);
            if ($checkStmt->fetch()) {
                json_response([
                    'success'  => false,
                    'message'  => 'Tên đăng nhập hoặc email này đã tồn tại trên hệ thống.',
                    'ref_code' => 'ERR_USER_EXISTS'
                ], 409);
            }

            $passwordHash = password_hash($password, PASSWORD_ARGON2ID, [
                'memory_cost' => 65536,
                'time_cost'   => 4,
                'threads'     => 1
            ]);

            $insStmt = $pdo->prepare("INSERT INTO users (username, email, phone, full_name, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?, 'active')");
            $insStmt->execute([$username, $email, $phone, $fullName, $passwordHash, $role]);
            $newId = (int)$pdo->lastInsertId();

            write_audit_log($pdo, 'STAFF_CREATE', 'USER-' . $newId, null, "Tạo tài khoản {$username} (role: {$role})", $admin);

            json_response([
                'success' => true,
                'message' => "Đã tạo tài khoản {$username} ({$role}) thành công!",
                'data'    => [
                    'id'         => $newId,
                    'username'   => $username,
                    'email'      => $email,
                    'phone'      => $phone,
                    'full_name'  => $fullName,
                    'role'       => $role,
                    'status'     => 'active',
                    'created_at' => date('Y-m-d H:i:s')
                ]
            ], 201);
        }

        if ($subAction === 'update_role') {
            $staffId = (int)($data['id'] ?? 0);
            $newRole = sanitize_string($data['role'] ?? '', 20);
            if ($staffId <= 0) {
                json_error('ID nhân viên không hợp lệ.', 400, 'ERR_INVALID_ID');
            }
            if (!in_array($newRole, ['staff', 'manager'], true)) {
                json_error('Vai trò chỉ được phép chuyển giữa staff và manager.', 400, 'ERR_INVALID_ROLE');
            }

            $findStmt = $pdo->prepare("SELECT id, username, role FROM users WHERE id = ? LIMIT 1");
            $findStmt->execute([$staffId]);
            $targetUser = $findStmt->fetch();
            if (!$targetUser) {
                json_error('Không tìm thấy tài khoản tương ứng.', 404, 'ERR_NOT_FOUND');
            }
            if (!in_array($targetUser['role'] ?? '', ['staff', 'manager'], true)) {
                json_error('Không được phép thay đổi vai trò của tài khoản Quản trị viên hoặc Khách hàng!', 403, 'ERR_FORBIDDEN');
            }

            $oldRole = $targetUser['role'];
            $updStmt = $pdo->prepare("UPDATE users SET role = ? WHERE id = ? AND role IN ('staff', 'manager')");
            $updStmt->execute([$newRole, $staffId]);

            write_audit_log($pdo, 'STAFF_ROLE_CHANGE', 'USER-' . $staffId, "{$targetUser['username']}: {$oldRole}", "{$targetUser['username']}: {$newRole}", $admin);

            json_response([
                'success' => true,
                'message' => "Đã cập nhật vai trò tài khoản {$targetUser['username']} thành: {$newRole}",
                'data'    => [
                    'id'   => $staffId,
                    'role' => $newRole
                ]
            ]);
        }

        if ($subAction === 'toggle_status') {
            $staffId = (int)($data['id'] ?? 0);
            if ($staffId <= 0) {
                json_error('ID nhân viên không hợp lệ.', 400, 'ERR_INVALID_ID');
            }

            $findStmt = $pdo->prepare("SELECT id, username, role, status FROM users WHERE id = ? AND role IN ('staff', 'manager') LIMIT 1");
            $findStmt->execute([$staffId]);
            $staffUser = $findStmt->fetch();
            if (!$staffUser) {
                json_error('Không tìm thấy tài khoản nhân viên/quản lý tương ứng.', 404, 'ERR_NOT_FOUND');
            }

            $newStatus = (($staffUser['status'] ?? 'active') === 'locked') ? 'active' : 'locked';
            $updStmt = $pdo->prepare("UPDATE users SET status = ? WHERE id = ? AND role IN ('staff', 'manager')");
            $updStmt->execute([$newStatus, $staffId]);

            write_audit_log($pdo, 'STAFF_STATUS_CHANGE', 'USER-' . $staffId, $staffUser['status'], $newStatus . " ({$staffUser['username']})", $admin);

            json_response([
                'success' => true,
                'message' => $newStatus === 'locked'
                    ? "Đã khóa tài khoản {$staffUser['username']}."
                    : "Đã mở khóa tài khoản {$staffUser['username']}.",
                'data'    => [
                    'id'     => $staffId,
                    'status' => $newStatus
                ]
            ]);
        }

        if ($subAction === 'reset_password') {
            $staffId = (int)($data['id'] ?? 0);
            $password = (string)($data['password'] ?? '');
            if ($staffId <= 0) {
                json_error('ID nhân viên không hợp lệ.', 400, 'ERR_INVALID_ID');
            }
            if (strlen($password) < 8) {
                json_error('Mật khẩu mới phải có tối thiểu 8 ký tự.', 400, 'ERR_WEAK_PASSWORD');
            }

            $findStmt = $pdo->prepare("SELECT id, username FROM users WHERE id = ? AND role IN ('staff', 'manager') LIMIT 1");
            $findStmt->execute([$staffId]);
            $staffUser = $findStmt->fetch();
            if (!$staffUser) {
                json_error('Không tìm thấy tài khoản nhân viên/quản lý tương ứng.', 404, 'ERR_NOT_FOUND');
            }

            $passwordHash = password_hash($password, PASSWORD_ARGON2ID, [
                'memory_cost' => 65536,
                'time_cost'   => 4,
                'threads'     => 1
            ]);

            $updStmt = $pdo->prepare("UPDATE users SET password_hash = ?, failed_attempts = 0, lock_until = NULL WHERE id = ? AND role IN ('staff', 'manager')");
            $updStmt->execute([$passwordHash, $staffId]);

            write_audit_log($pdo, 'STAFF_RESET_PASSWORD', 'USER-' . $staffId, null, "Đặt lại mật khẩu cho {$staffUser['username']}", $admin);

            json_response([
                'success' => true,
                'message' => "Đã đặt lại mật khẩu cho {$staffUser['username']} thành công!"
            ]);
        }

        json_error('Hành động quản lý nhân viên không hợp lệ.', 400, 'ERR_INVALID_ACTION');
    }
}
