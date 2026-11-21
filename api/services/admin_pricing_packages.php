<?php
declare(strict_types=1);

if (!defined('SANBONG_ADMIN_ROUTER')) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'Direct access forbidden.', 'ref_code' => 'ERR_FORBIDDEN'], JSON_UNESCAPED_UNICODE);
    exit;
}

function pricing_fetch_current_snapshot(PDO $pdo): array {
    $settingsMap = get_system_settings_map($pdo);

    $pitchStats = [
        5  => ['base' => (int)($settingsMap['price_p5_base'] ?? 250000), 'count' => 0],
        7  => ['base' => (int)($settingsMap['price_p7_base'] ?? 450000), 'count' => 0],
        11 => ['base' => (int)($settingsMap['price_p11_base'] ?? 900000), 'count' => 0],
    ];

    try {
        $stmt = $pdo->query("
            SELECT type, COUNT(*) AS cnt, MIN(base_price) AS min_base, MAX(base_price) AS max_base
            FROM pitches
            WHERE type IN (5, 7, 11)
            GROUP BY type
        ");
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $t = (int)$row['type'];
            if (isset($pitchStats[$t])) {
                $pitchStats[$t]['count'] = (int)$row['cnt'];
                // Prefer setting if explicitly saved, otherwise fall back to pitches table
                if (!isset($settingsMap["price_p{$t}_base"]) && (int)$row['min_base'] > 0) {
                    $pitchStats[$t]['base'] = (int)$row['min_base'];
                }
            }
        }
    } catch (Throwable $e) {
        error_log('[PRICING SNAPSHOT WARN] ' . $e->getMessage());
    }

    $effectiveFrom = trim((string)($settingsMap['pricing_effective_from'] ?? ''));
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $effectiveFrom)) {
        $effectiveFrom = date('Y-m-d');
    }

    $activeFutureBookings = 0;
    try {
        $afbStmt = $pdo->query("SELECT COUNT(*) FROM bookings WHERE booking_date >= CURDATE() AND status IN ('Giữ chỗ', 'Đã xác nhận')");
        $activeFutureBookings = (int)$afbStmt->fetchColumn();
    } catch (Throwable $e) {
        error_log('[PRICING FUTURE BOOKINGS WARN] ' . $e->getMessage());
    }

    $p5 = $pitchStats[5]['base'];
    $p7 = $pitchStats[7]['base'];
    $p11 = $pitchStats[11]['base'];

    return [
        'p5' => [
            'base'        => $p5,
            'peak'        => $p5,
            'weekend'     => $p5,
            'pitch_count' => $pitchStats[5]['count'],
        ],
        'p7' => [
            'base'        => $p7,
            'peak'        => $p7,
            'weekend'     => $p7,
            'pitch_count' => $pitchStats[7]['count'],
        ],
        'p11' => [
            'base'        => $p11,
            'peak'        => $p11,
            'weekend'     => $p11,
            'pitch_count' => $pitchStats[11]['count'],
        ],
        'pricing_effective_from' => $effectiveFrom,
        'effective_from'         => $effectiveFrom,
        'active_future_bookings' => $activeFutureBookings,
    ];
}

function pricing_normalize_package_row(array $row): array {
    $rawGifts = $row['gifts_json'] ?? '[]';
    $decodedGifts = is_string($rawGifts) && $rawGifts !== '' ? json_decode($rawGifts, true) : [];
    if (!is_array($decodedGifts)) {
        $decodedGifts = [];
    }

    $gifts = [];
    foreach ($decodedGifts as $g) {
        if (!is_array($g)) {
            continue;
        }
        $gifts[] = [
            'service_id' => sanitize_string((string)($g['service_id'] ?? ''), 30),
            'name'       => sanitize_string((string)($g['name'] ?? ''), 150),
            'qty'        => max(1, (int)($g['qty'] ?? 1)),
            'unit_price' => max(0, (int)($g['unit_price'] ?? 0)),
        ];
    }

    return [
        'id'               => (int)$row['id'],
        'name'             => (string)$row['name'],
        'months'           => (int)$row['months'],
        'matches_count'    => (int)$row['matches_count'],
        'discount_percent' => (int)$row['discount_percent'],
        'gifts'            => $gifts,
        'gifts_json'       => json_encode($gifts, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'badge_text'       => (string)($row['badge_text'] ?? ''),
        'theme'            => (string)($row['theme'] ?? 'default'),
        'is_active'        => (int)$row['is_active'],
        'sort_order'       => (int)($row['sort_order'] ?? 0),
        'created_at'       => (string)($row['created_at'] ?? ''),
        'updated_at'       => (string)($row['updated_at'] ?? ''),
    ];
}

function pricing_fetch_active_services(PDO $pdo): array {
    try {
        $stmt = $pdo->query("SELECT id, name, unit, price, stock_qty FROM extra_services WHERE is_active = 1 ORDER BY name ASC");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return array_map(static function (array $r): array {
            return [
                'id'        => (string)$r['id'],
                'name'      => (string)$r['name'],
                'unit'      => (string)($r['unit'] ?? ''),
                'price'     => (int)($r['price'] ?? 0),
                'stock_qty' => (int)($r['stock_qty'] ?? 0),
            ];
        }, $rows);
    } catch (Throwable $e) {
        error_log('[PRICING SERVICES FETCH WARN] ' . $e->getMessage());
        return [];
    }
}

function handle_admin_pricing_packages(string $action, string $method, PDO $pdo, array $data, array $actor): bool {
    $upperMethod = strtoupper($method);

    // 1. GET PRICING
    if ($action === 'get_pricing') {
        $snapshot = pricing_fetch_current_snapshot($pdo);
        $role = strtolower((string)($actor['role'] ?? ''));
        $snapshot['can_edit'] = in_array($role, ['admin', 'manager'], true);
        json_response([
            'success' => true,
            'data'    => $snapshot,
        ]);
        return true;
    }

    // 2. SAVE PRICING (Fixed 2-hour price per pitch type 5/7/11 + pricing_effective_from)
    if ($action === 'save_pricing') {
        if ($upperMethod !== 'POST') {
            json_error('Hành động thay đổi dữ liệu bắt buộc dùng phương thức POST.', 405, 'ERR_METHOD_NOT_ALLOWED');
        }
        $mgr = require_manager_or_admin($pdo);

        $pricingSrc = isset($data['pricing']) && is_array($data['pricing']) ? $data['pricing'] : $data;
        $p5Arr  = is_array($pricingSrc['p5'] ?? null) ? $pricingSrc['p5'] : [];
        $p7Arr  = is_array($pricingSrc['p7'] ?? null) ? $pricingSrc['p7'] : [];
        $p11Arr = is_array($pricingSrc['p11'] ?? null) ? $pricingSrc['p11'] : [];

        $p5Base  = (int)($p5Arr['base'] ?? $p5Arr['basePrice'] ?? $pricingSrc['p5_base'] ?? $data['p5_base'] ?? 0);
        $p7Base  = (int)($p7Arr['base'] ?? $p7Arr['basePrice'] ?? $pricingSrc['p7_base'] ?? $data['p7_base'] ?? 0);
        $p11Base = (int)($p11Arr['base'] ?? $p11Arr['basePrice'] ?? $pricingSrc['p11_base'] ?? $data['p11_base'] ?? 0);

        foreach (['Sân 5' => $p5Base, 'Sân 7' => $p7Base, 'Sân 11' => $p11Base] as $label => $priceVal) {
            if ($priceVal < 50000 || $priceVal > 50000000) {
                json_error("Mức giá {$label} không hợp lệ (từ 50.000đ đến 50.000.000đ / ca 2 giờ).", 400, 'ERR_INVALID_PRICE');
            }
        }

        $effectiveFrom = trim(sanitize_string((string)($data['pricing_effective_from'] ?? $data['effective_from'] ?? $pricingSrc['pricing_effective_from'] ?? $pricingSrc['effective_from'] ?? ''), 15));
        if ($effectiveFrom === '') {
            $effectiveFrom = date('Y-m-d');
        }
        if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $effectiveFrom, $m) || !checkdate((int)$m[2], (int)$m[3], (int)$m[1])) {
            json_error('Ngày áp dụng bảng giá không hợp lệ (định dạng YYYY-MM-DD).', 400, 'ERR_INVALID_EFFECTIVE_DATE');
        }

        $oldSnap = pricing_fetch_current_snapshot($pdo);
        $oldAudit = [
            'p5_base'                => $oldSnap['p5']['base'],
            'p7_base'                => $oldSnap['p7']['base'],
            'p11_base'               => $oldSnap['p11']['base'],
            'pricing_effective_from' => $oldSnap['pricing_effective_from'],
        ];
        $newAudit = [
            'p5_base'                => $p5Base,
            'p7_base'                => $p7Base,
            'p11_base'               => $p11Base,
            'pricing_effective_from' => $effectiveFrom,
        ];

        $hasChange = ($oldAudit !== $newAudit);
        if (!$hasChange) {
            json_response([
                'success'     => true,
                'has_changed' => false,
                'message'     => 'Không có thay đổi để lưu (bảng giá giữ nguyên).',
                'data'        => [
                    'p5'                     => ['base' => $p5Base, 'peak' => $p5Base, 'weekend' => $p5Base, 'pitch_count' => $oldSnap['p5']['pitch_count']],
                    'p7'                     => ['base' => $p7Base, 'peak' => $p7Base, 'weekend' => $p7Base, 'pitch_count' => $oldSnap['p7']['pitch_count']],
                    'p11'                    => ['base' => $p11Base, 'peak' => $p11Base, 'weekend' => $p11Base, 'pitch_count' => $oldSnap['p11']['pitch_count']],
                    'pricing_effective_from' => $effectiveFrom,
                    'effective_from'         => $effectiveFrom,
                    'active_future_bookings' => $oldSnap['active_future_bookings'],
                ],
            ]);
            return true;
        }

        $settingsPairs = [
            'price_p5_base'          => (string)$p5Base,
            'price_p5_peak'          => (string)$p5Base,
            'price_p5_weekend'       => (string)$p5Base,
            'price_p7_base'          => (string)$p7Base,
            'price_p7_peak'          => (string)$p7Base,
            'price_p7_weekend'       => (string)$p7Base,
            'price_p11_base'         => (string)$p11Base,
            'price_p11_peak'         => (string)$p11Base,
            'price_p11_weekend'      => (string)$p11Base,
            'pricing_effective_from' => $effectiveFrom,
        ];

        $pdo->beginTransaction();
        try {
            $updPitchStmt = $pdo->prepare("UPDATE pitches SET base_price = ?, peak_price = ?, weekend_price = ? WHERE type = ?");
            $updPitchStmt->execute([$p5Base, $p5Base, $p5Base, 5]);
            $updPitchStmt->execute([$p7Base, $p7Base, $p7Base, 7]);
            $updPitchStmt->execute([$p11Base, $p11Base, $p11Base, 11]);

            $upsertSetStmt = $pdo->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
            foreach ($settingsPairs as $k => $v) {
                $upsertSetStmt->execute([$k, $v]);
            }
            $pdo->commit();
        } catch (Throwable $txEx) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log('[SAVE_PRICING ERROR] ' . $txEx->getMessage());
            json_error('Lỗi hệ thống khi lưu bảng giá.', 500, 'ERR_SAVE_PRICING_FAILED');
        }

        write_audit_log($pdo, 'UPDATE_PRICING', 'Bảng giá sân', $oldAudit, $newAudit, $mgr, 'pricing');

        $freshSnap = pricing_fetch_current_snapshot($pdo);
        $freshSnap['can_edit'] = true;

        json_response([
            'success'     => true,
            'has_changed' => true,
            'message'     => "Đã lưu bảng giá cố định 2 giờ/ca thành công (áp dụng từ {$effectiveFrom}). Các đơn đã đặt trước đó không bị ảnh hưởng.",
            'data'        => $freshSnap,
        ]);
        return true;
    }

    // 3. GET MONTHLY PACKAGES (GET allowed for staff/manager/admin)
    if ($action === 'get_monthly_packages') {
        $stmt = $pdo->query("SELECT * FROM monthly_packages ORDER BY sort_order ASC, id ASC");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $packages = array_map('pricing_normalize_package_row', $rows);
        $services = pricing_fetch_active_services($pdo);
        $snap = pricing_fetch_current_snapshot($pdo);
        $role = strtolower((string)($actor['role'] ?? ''));

        json_response([
            'success'          => true,
            'data'             => $packages,
            'packages'         => $packages,
            'services'         => $services,
            'reference_prices' => [
                'p5'  => $snap['p5']['base'],
                'p7'  => $snap['p7']['base'],
                'p11' => $snap['p11']['base'],
            ],
            'can_edit'         => in_array($role, ['admin', 'manager'], true),
        ]);
        return true;
    }

    // 4. SAVE MONTHLY PACKAGE (Create / Update)
    if ($action === 'save_monthly_package') {
        if ($upperMethod !== 'POST') {
            json_error('Hành động thay đổi dữ liệu bắt buộc dùng phương thức POST.', 405, 'ERR_METHOD_NOT_ALLOWED');
        }
        $mgr = require_manager_or_admin($pdo);

        $id = (int)($data['id'] ?? 0);
        $name = trim(sanitize_string((string)($data['name'] ?? ''), 120));
        $months = (int)($data['months'] ?? 1);
        $matchesCount = (int)($data['matches_count'] ?? ($months * 4));
        $discountPercent = (int)($data['discount_percent'] ?? 0);
        $badgeText = trim(sanitize_string((string)($data['badge_text'] ?? ''), 60));
        $theme = trim(sanitize_string((string)($data['theme'] ?? 'default'), 30));
        $isActive = array_key_exists('is_active', $data) ? (!empty($data['is_active']) ? 1 : 0) : 1;
        $sortOrder = (int)($data['sort_order'] ?? 0);

        if ($name === '') {
            json_error('Vui lòng nhập tên gói đặt sân theo tháng.', 400, 'ERR_PACKAGE_NAME_REQUIRED');
        }
        if ($months < 1 || $months > 24) {
            json_error('Số tháng của gói phải từ 1 đến 24.', 400, 'ERR_INVALID_MONTHS');
        }
        if ($matchesCount < 1 || $matchesCount > 200) {
            json_error('Số trận của gói phải từ 1 đến 200.', 400, 'ERR_INVALID_MATCHES');
        }
        if ($discountPercent < 0 || $discountPercent > 100) {
            json_error('Phần trăm giảm giá phải từ 0% đến 100%.', 400, 'ERR_INVALID_DISCOUNT');
        }
        if (!in_array($theme, ['diamond', 'green', 'default'], true)) {
            $theme = 'default';
        }

        // Parse and sanitize gifts
        $rawGifts = $data['gifts'] ?? null;
        if ($rawGifts === null && isset($data['gifts_json'])) {
            $rawGifts = is_string($data['gifts_json']) ? json_decode($data['gifts_json'], true) : $data['gifts_json'];
        }
        if (!is_array($rawGifts)) {
            $rawGifts = [];
        }

        // Build service catalog lookup to keep unit_price / name accurate when service_id is provided
        $serviceMap = [];
        foreach (pricing_fetch_active_services($pdo) as $srv) {
            $serviceMap[$srv['id']] = $srv;
        }

        $cleanGifts = [];
        foreach ($rawGifts as $g) {
            if (!is_array($g)) {
                continue;
            }
            $sId = trim(sanitize_string((string)($g['service_id'] ?? ''), 30));
            $gName = trim(sanitize_string((string)($g['name'] ?? ''), 150));
            $gQty = max(1, min(100, (int)($g['qty'] ?? 1)));
            $gPrice = max(0, (int)($g['unit_price'] ?? 0));

            if ($sId !== '' && isset($serviceMap[$sId])) {
                if ($gName === '') {
                    $gName = $serviceMap[$sId]['name'];
                }
                if (!isset($g['unit_price'])) {
                    $gPrice = (int)$serviceMap[$sId]['price'];
                }
            }
            if ($gName === '' && $sId === '') {
                continue;
            }
            $cleanGifts[] = [
                'service_id' => $sId,
                'name'       => $gName,
                'qty'        => $gQty,
                'unit_price' => $gPrice,
            ];
        }
        $giftsJson = json_encode($cleanGifts, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if ($id > 0) {
            $oldStmt = $pdo->prepare("SELECT * FROM monthly_packages WHERE id = ? LIMIT 1");
            $oldStmt->execute([$id]);
            $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) {
                json_error('Không tìm thấy gói đặt tháng cần cập nhật.', 404, 'ERR_PACKAGE_NOT_FOUND');
            }

            $updStmt = $pdo->prepare("
                UPDATE monthly_packages
                SET name = ?, months = ?, matches_count = ?, discount_percent = ?,
                    gifts_json = ?, badge_text = ?, theme = ?, is_active = ?, sort_order = ?
                WHERE id = ?
            ");
            $updStmt->execute([$name, $months, $matchesCount, $discountPercent, $giftsJson, $badgeText !== '' ? $badgeText : null, $theme, $isActive, $sortOrder, $id]);

            $newStmt = $pdo->prepare("SELECT * FROM monthly_packages WHERE id = ? LIMIT 1");
            $newStmt->execute([$id]);
            $savedRow = $newStmt->fetch(PDO::FETCH_ASSOC);

            write_audit_log(
                $pdo,
                'PACKAGE_SAVE',
                "PACKAGE-{$id}",
                [
                    'name'             => $oldRow['name'],
                    'months'           => (int)$oldRow['months'],
                    'matches_count'    => (int)$oldRow['matches_count'],
                    'discount_percent' => (int)$oldRow['discount_percent'],
                    'gifts_json'       => $oldRow['gifts_json'],
                    'badge_text'       => $oldRow['badge_text'],
                    'theme'            => $oldRow['theme'],
                    'is_active'        => (int)$oldRow['is_active'],
                    'sort_order'       => (int)$oldRow['sort_order'],
                ],
                [
                    'name'             => $name,
                    'months'           => $months,
                    'matches_count'    => $matchesCount,
                    'discount_percent' => $discountPercent,
                    'gifts_json'       => $giftsJson,
                    'badge_text'       => $badgeText !== '' ? $badgeText : null,
                    'theme'            => $theme,
                    'is_active'        => $isActive,
                    'sort_order'       => $sortOrder,
                ],
                $mgr,
                'pricing'
            );

            json_response([
                'success' => true,
                'message' => "Đã cập nhật gói '{$name}' thành công!",
                'data'    => pricing_normalize_package_row($savedRow),
            ]);
            return true;
        }

        // Insert new package
        $insStmt = $pdo->prepare("
            INSERT INTO monthly_packages (name, months, matches_count, discount_percent, gifts_json, badge_text, theme, is_active, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $insStmt->execute([$name, $months, $matchesCount, $discountPercent, $giftsJson, $badgeText !== '' ? $badgeText : null, $theme, $isActive, $sortOrder]);
        $newId = (int)$pdo->lastInsertId();

        $newStmt = $pdo->prepare("SELECT * FROM monthly_packages WHERE id = ? LIMIT 1");
        $newStmt->execute([$newId]);
        $savedRow = $newStmt->fetch(PDO::FETCH_ASSOC);

        write_audit_log(
            $pdo,
            'PACKAGE_SAVE',
            "PACKAGE-{$newId}",
            null,
            "Tạo mới gói tháng '{$name}': {$months} tháng, {$matchesCount} trận, giảm {$discountPercent}%",
            $mgr,
            'pricing'
        );

        json_response([
            'success' => true,
            'message' => "Đã tạo gói '{$name}' thành công!",
            'data'    => pricing_normalize_package_row($savedRow),
        ], 201);
        return true;
    }

    // 5. DELETE MONTHLY PACKAGE
    if ($action === 'delete_monthly_package') {
        if ($upperMethod !== 'POST') {
            json_error('Hành động thay đổi dữ liệu bắt buộc dùng phương thức POST.', 405, 'ERR_METHOD_NOT_ALLOWED');
        }
        $mgr = require_manager_or_admin($pdo);

        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) {
            json_error('ID gói đặt tháng không hợp lệ.', 400, 'ERR_INVALID_PACKAGE_ID');
        }

        $oldStmt = $pdo->prepare("SELECT * FROM monthly_packages WHERE id = ? LIMIT 1");
        $oldStmt->execute([$id]);
        $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);
        if (!$oldRow) {
            json_error('Không tìm thấy gói đặt tháng để xóa.', 404, 'ERR_PACKAGE_NOT_FOUND');
        }

        $delStmt = $pdo->prepare("DELETE FROM monthly_packages WHERE id = ?");
        $delStmt->execute([$id]);

        write_audit_log(
            $pdo,
            'PACKAGE_DELETE',
            "PACKAGE-{$id}",
            "Gói '{$oldRow['name']}' ({$oldRow['months']} tháng, {$oldRow['matches_count']} trận, giảm {$oldRow['discount_percent']}%)",
            null,
            $mgr,
            'pricing'
        );

        json_response([
            'success' => true,
            'message' => "Đã xóa gói '{$oldRow['name']}' thành công!",
        ]);
        return true;
    }

    // 6. TOGGLE MONTHLY PACKAGE
    if ($action === 'toggle_monthly_package') {
        if ($upperMethod !== 'POST') {
            json_error('Hành động thay đổi dữ liệu bắt buộc dùng phương thức POST.', 405, 'ERR_METHOD_NOT_ALLOWED');
        }
        $mgr = require_manager_or_admin($pdo);

        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) {
            json_error('ID gói đặt tháng không hợp lệ.', 400, 'ERR_INVALID_PACKAGE_ID');
        }

        $oldStmt = $pdo->prepare("SELECT * FROM monthly_packages WHERE id = ? LIMIT 1");
        $oldStmt->execute([$id]);
        $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);
        if (!$oldRow) {
            json_error('Không tìm thấy gói đặt tháng.', 404, 'ERR_PACKAGE_NOT_FOUND');
        }

        $oldActive = (int)$oldRow['is_active'];
        $newActive = array_key_exists('is_active', $data)
            ? (!empty($data['is_active']) ? 1 : 0)
            : ($oldActive === 1 ? 0 : 1);

        $updStmt = $pdo->prepare("UPDATE monthly_packages SET is_active = ? WHERE id = ?");
        $updStmt->execute([$newActive, $id]);

        write_audit_log(
            $pdo,
            'PACKAGE_TOGGLE',
            "PACKAGE-{$id}",
            ['is_active' => $oldActive],
            ['is_active' => $newActive],
            $mgr,
            'pricing'
        );

        json_response([
            'success' => true,
            'message' => $newActive === 1
                ? "Đã bật gói '{$oldRow['name']}'."
                : "Đã tạm ẩn gói '{$oldRow['name']}'.",
            'data'    => [
                'id'        => $id,
                'is_active' => $newActive,
            ],
        ]);
        return true;
    }

    return false;
}
