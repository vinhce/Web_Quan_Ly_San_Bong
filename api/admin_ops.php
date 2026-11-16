<?php
declare(strict_types=1);

if (!defined('SANBONG_ADMIN_ROUTER')) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'Direct access forbidden.', 'ref_code' => 'ERR_FORBIDDEN'], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once __DIR__ . '/services/admin_sample_data.php';
require_once __DIR__ . '/services/admin_settings.php';
require_once __DIR__ . '/services/admin_shifts.php';
require_once __DIR__ . '/services/admin_inventory.php';

$currentActor = $actor ?? (function_exists('require_staff_or_admin') ? require_staff_or_admin($pdo) : []);

if ($action === 'settings' || $action === 'audit_logs') {
    handle_admin_settings_or_audit($pdo, $action, $method, $data, $currentActor);
}

if ($action === 'shifts') {
    handle_admin_shifts($pdo, $method, $data, $currentActor);
}

if (in_array($action, ['inventory', 'services', 'counter_sale'], true)) {
    handle_admin_inventory($pdo, $action, $method, $data, $currentActor);
}

if ($action === 'save_pricing') {
    $admin = require_admin($pdo);
    if ($method !== 'POST') {
        json_error('Phương thức không được hỗ trợ.', 405, 'ERR_METHOD_NOT_ALLOWED');
    }

    $pricingSrc = isset($data['pricing']) && is_array($data['pricing']) ? $data['pricing'] : $data;
    $p5  = is_array($pricingSrc['p5'] ?? null) ? $pricingSrc['p5'] : [];
    $p7  = is_array($pricingSrc['p7'] ?? null) ? $pricingSrc['p7'] : [];
    $p11 = is_array($pricingSrc['p11'] ?? null) ? $pricingSrc['p11'] : [];

    $p5Base     = (int)($p5['base'] ?? $p5['basePrice'] ?? $pricingSrc['p5_base'] ?? 250000);
    $p5Peak     = (int)($p5['peak'] ?? $p5['peakPrice'] ?? $pricingSrc['p5_peak'] ?? 350000);
    $p5Weekend  = (int)($p5['weekend'] ?? $p5['weekendPrice'] ?? $pricingSrc['p5_weekend'] ?? 380000);

    $p7Base     = (int)($p7['base'] ?? $p7['basePrice'] ?? $pricingSrc['p7_base'] ?? 450000);
    $p7Peak     = (int)($p7['peak'] ?? $p7['peakPrice'] ?? $pricingSrc['p7_peak'] ?? 650000);
    $p7Weekend  = (int)($p7['weekend'] ?? $p7['weekendPrice'] ?? $pricingSrc['p7_weekend'] ?? 700000);

    $p11Base    = (int)($p11['base'] ?? $p11['basePrice'] ?? $pricingSrc['p11_base'] ?? 900000);
    $p11Peak    = (int)($p11['peak'] ?? $p11['peakPrice'] ?? $pricingSrc['p11_peak'] ?? 1200000);
    $p11Weekend = (int)($p11['weekend'] ?? $p11['weekendPrice'] ?? $pricingSrc['p11_weekend'] ?? 1400000);

    $allPrices = [$p5Base, $p5Peak, $p5Weekend, $p7Base, $p7Peak, $p7Weekend, $p11Base, $p11Peak, $p11Weekend];
    foreach ($allPrices as $priceVal) {
        if ($priceVal < 50000) {
            json_error('Mức giá sân không hợp lệ (tối thiểu từ 50.000đ/giờ).', 400, 'ERR_INVALID_PRICE');
        }
    }

    $settingsPairs = [
        'price_p5_base'     => (string)$p5Base,
        'price_p5_peak'     => (string)$p5Peak,
        'price_p5_weekend'  => (string)$p5Weekend,
        'price_p7_base'     => (string)$p7Base,
        'price_p7_peak'     => (string)$p7Peak,
        'price_p7_weekend'  => (string)$p7Weekend,
        'price_p11_base'    => (string)$p11Base,
        'price_p11_peak'    => (string)$p11Peak,
        'price_p11_weekend' => (string)$p11Weekend
    ];

    $oldPricing = [];
    try {
        $oldSetStmt = $pdo->query("SELECT setting_key, setting_value FROM settings WHERE setting_key LIKE 'price_%'");
        while ($r = $oldSetStmt->fetch()) {
            $oldPricing[$r['setting_key']] = $r['setting_value'];
        }
    } catch (Exception $e) {}

    // Yêu cầu 1, 2, 3: So sánh cũ/mới bằng logAdminChange trước khi UPDATE
    $changeDiff = logAdminChange($pdo, 'UPDATE_PRICING', $oldPricing, $settingsPairs, 'Bảng giá sân', 'pricing', $admin);
    if (!$changeDiff['has_change']) {
        // KHÔNG insert log, KHÔNG chạy lệnh UPDATE thừa, vẫn trả về thành công
        json_response([
            'success'     => true,
            'has_changed' => false,
            'message'     => 'Không có thay đổi để lưu (bảng giá giữ nguyên).',
            'data'        => [
                'p5'  => ['base' => $p5Base, 'peak' => $p5Peak, 'weekend' => $p5Weekend],
                'p7'  => ['base' => $p7Base, 'peak' => $p7Peak, 'weekend' => $p7Weekend],
                'p11' => ['base' => $p11Base, 'peak' => $p11Peak, 'weekend' => $p11Weekend]
            ]
        ]);
    }

    $pdo->beginTransaction();
    try {
        $updPitchStmt = $pdo->prepare("UPDATE pitches SET base_price = ?, peak_price = ?, weekend_price = ? WHERE type = ?");
        $updPitchStmt->execute([$p5Base, $p5Peak, $p5Weekend, 5]);
        $updPitchStmt->execute([$p7Base, $p7Peak, $p7Weekend, 7]);
        $updPitchStmt->execute([$p11Base, $p11Peak, $p11Weekend, 11]);

        $upsertSetStmt = $pdo->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
        foreach ($settingsPairs as $k => $v) {
            $upsertSetStmt->execute([$k, $v]);
        }
        $pdo->commit();
    } catch (Exception $txEx) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $txEx;
    }

    $activeFutureBookingsCount = 0;
    try {
        $afbStmt = $pdo->query("SELECT COUNT(*) FROM bookings WHERE booking_date >= CURDATE() AND status IN ('Giữ chỗ', 'Đã xác nhận')");
        $activeFutureBookingsCount = (int)$afbStmt->fetchColumn();
    } catch (Exception $e) {}

    $msg = 'Đã lưu cấu hình bảng giá vào cơ sở dữ liệu thành công!';
    if ($activeFutureBookingsCount > 0) {
        $msg .= " (Lưu ý: Có {$activeFutureBookingsCount} ca đặt trong tương lai giữ nguyên giá đã chốt)";
    }

    json_response([
        'success'     => true,
        'has_changed' => true,
        'message'     => $msg,
        'warning'     => $activeFutureBookingsCount > 0 ? "Có {$activeFutureBookingsCount} ca đặt trong tương lai giữ nguyên đơn giá cũ" : null,
        'data'        => [
            'p5'  => ['base' => $p5Base, 'peak' => $p5Peak, 'weekend' => $p5Weekend],
            'p7'  => ['base' => $p7Base, 'peak' => $p7Peak, 'weekend' => $p7Weekend],
            'p11' => ['base' => $p11Base, 'peak' => $p11Peak, 'weekend' => $p11Weekend]
        ]
    ]);
}

if (in_array($action, ['manage_pitch', 'upsert_pitch'], true) && $method === 'POST') {
    $mgr = require_manager_or_admin($pdo);
    $subAction = sanitize_string($data['sub_action'] ?? 'save', 20);

    if ($subAction === 'save' || $subAction === 'upsert' || $action === 'upsert_pitch') {
        $type = (int)($data['type'] ?? 5);
        if (!in_array($type, [5, 7, 11], true)) {
            json_error('Loại sân phải là sân 5, 7 hoặc 11 người.', 400, 'ERR_INVALID_PITCH_TYPE');
        }
        $pitchId = strtoupper(sanitize_string($data['id'] ?? $data['pitch_id'] ?? '', 20));
        if (empty($pitchId)) {
            $cntStmt = $pdo->prepare("SELECT COUNT(*) FROM pitches WHERE type = ?");
            $cntStmt->execute([$type]);
            $nextChar = chr(65 + min(25, (int)$cntStmt->fetchColumn()));
            $pitchId = "P{$type}-{$nextChar}";
            $chkStmt = $pdo->prepare("SELECT id FROM pitches WHERE id = ? LIMIT 1");
            $chkStmt->execute([$pitchId]);
            if ($chkStmt->fetch()) {
                $pitchId = "P{$type}-" . strtoupper(substr(bin2hex(random_bytes(2)), 0, 3));
            }
        }

        $name = sanitize_string($data['name'] ?? '', 100);
        if (empty($name)) {
            json_error('Tên sân bóng không được để trống.', 400, 'ERR_EMPTY_PITCH_NAME');
        }
        $typeName = $type === 5 ? 'Sân 5 người' : ($type === 7 ? 'Sân 7 người' : 'Sân 11 người');
        $defaultSize = $type === 5 ? '20m x 40m' : ($type === 7 ? '30m x 50m' : '68m x 105m');
        $size = sanitize_string($data['size'] ?? $defaultSize, 50) ?: $defaultSize;
        $grass = sanitize_string($data['grass'] ?? 'Cỏ nhân tạo tiêu chuẩn FIFA Quality Pro', 255) ?: 'Cỏ nhân tạo tiêu chuẩn FIFA Quality Pro';
        $basePrice = max(50000, (int)($data['base_price'] ?? $data['basePrice'] ?? ($type === 5 ? 250000 : ($type === 7 ? 450000 : 900000))));
        $peakPrice = max(50000, (int)($data['peak_price'] ?? $data['peakPrice'] ?? ($type === 5 ? 350000 : ($type === 7 ? 650000 : 1200000))));
        $weekendPrice = max(50000, (int)($data['weekend_price'] ?? $data['weekendPrice'] ?? ($type === 5 ? 380000 : ($type === 7 ? 700000 : 1400000))));
        $status = sanitize_string($data['status'] ?? 'Hoạt động', 30);
        if (!in_array($status, ['Hoạt động', 'Bảo trì', 'Ẩn'], true)) {
            $status = 'Hoạt động';
        }
        $description = sanitize_string($data['description'] ?? '', 500);
        $variant = sanitize_string($data['variant'] ?? ($type === 11 ? 'hero' : ($type === 7 ? 'deep' : 'standard')), 50);

        $oldStmt = $pdo->prepare("SELECT * FROM pitches WHERE id = ? LIMIT 1");
        $oldStmt->execute([$pitchId]);
        $oldPitch = $oldStmt->fetch() ?: null;

        $newPitchData = [
            'id'           => $pitchId,
            'name'         => $name,
            'type'         => $type,
            'typeName'     => $typeName,
            'size'         => $size,
            'grass'        => $grass,
            'basePrice'    => $basePrice,
            'peakPrice'    => $peakPrice,
            'weekendPrice' => $weekendPrice,
            'status'       => $status,
            'description'  => $description
        ];

        if ($oldPitch) {
            $oldCompare = [
                'name'         => $oldPitch['name'] ?? '',
                'type'         => (int)($oldPitch['type'] ?? 5),
                'size'         => $oldPitch['size'] ?? '',
                'grass'        => $oldPitch['grass'] ?? '',
                'basePrice'    => (int)($oldPitch['base_price'] ?? 0),
                'peakPrice'    => (int)($oldPitch['peak_price'] ?? 0),
                'weekendPrice' => (int)($oldPitch['weekend_price'] ?? 0),
                'status'       => $oldPitch['status'] ?? 'Hoạt động',
                'description'  => $oldPitch['description'] ?? ''
            ];
            $newCompare = [
                'name'         => $name,
                'type'         => $type,
                'size'         => $size,
                'grass'        => $grass,
                'basePrice'    => $basePrice,
                'peakPrice'    => $peakPrice,
                'weekendPrice' => $weekendPrice,
                'status'       => $status,
                'description'  => $description
            ];
            $pitchDiff = logAdminChange($pdo, 'PITCH_UPSERT', $oldCompare, $newCompare, $pitchId, 'pitch', $mgr);
            if (!$pitchDiff['has_change']) {
                json_response([
                    'success'     => true,
                    'has_changed' => false,
                    'message'     => "Không có thay đổi để lưu cho sân {$name} ({$pitchId}).",
                    'data'        => $newPitchData
                ]);
            }
        }

        $amenitiesJson = $oldPitch['amenities_json'] ?? '["Đèn LED chống chói", "Bãi đỗ xe", "Nước uống miễn phí", "Phòng thay đồ", "Wifi"]';
        if (isset($data['amenities']) && is_array($data['amenities'])) {
            $amenitiesJson = json_encode($data['amenities'], JSON_UNESCAPED_UNICODE);
        }

        $upsertStmt = $pdo->prepare("INSERT INTO pitches (id, name, type, type_name, size, grass, base_price, peak_price, weekend_price, status, amenities_json, variant, description)
                                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                     ON DUPLICATE KEY UPDATE
                                     name = VALUES(name), type = VALUES(type), type_name = VALUES(type_name),
                                     size = VALUES(size), grass = VALUES(grass),
                                     base_price = VALUES(base_price), peak_price = VALUES(peak_price), weekend_price = VALUES(weekend_price),
                                     status = VALUES(status), description = VALUES(description)");
        $upsertStmt->execute([
            $pitchId, $name, $type, $typeName, $size, $grass,
            $basePrice, $peakPrice, $weekendPrice, $status,
            $amenitiesJson, $variant, $description
        ]);

        if (!$oldPitch) {
            write_audit_log($pdo, 'PITCH_UPSERT', $pitchId, null, $newPitchData, $mgr);
        }

        json_response([
            'success'     => true,
            'has_changed' => true,
            'message'     => $oldPitch ? "Đã cập nhật thông tin sân {$name} ({$pitchId})!" : "Đã thêm mới sân {$name} ({$pitchId}) thành công!",
            'data'        => $newPitchData
        ]);
    }

    json_error('Hành động quản lý sân không hợp lệ.', 400, 'ERR_INVALID_ACTION');
}

if ($action === 'sample_data') {
    $mgr = require_manager_or_admin($pdo);
    $subAction = sanitize_string($data['sub_action'] ?? $_GET['sub_action'] ?? 'status', 20);

    if ($subAction === 'clean') {
        $deletedCount = clear_sample_test_data($pdo);
        write_audit_log($pdo, 'SAMPLE_DATA_CLEAN', 'ALL_TEST', null, "Đã dọn dẹp {$deletedCount} bản ghi mẫu [TEST]", $mgr);
        json_response(['success' => true, 'message' => "Đã dọn dẹp {$deletedCount} bản ghi mẫu [TEST]!", 'data' => ['deletedCount' => $deletedCount]]);
    } elseif ($subAction === 'seed') {
        $seedRes = seed_sample_test_data($pdo, $mgr['id'] ?? 2);
        write_audit_log($pdo, 'SAMPLE_DATA_SEED', 'ALL_TEST', null, "Đã khởi tạo {$seedRes['totalBookings']} ca đặt sân mẫu [TEST]", $mgr);
        json_response(['success' => true, 'message' => 'Đã khởi tạo thành công dữ liệu mẫu [TEST]!', 'data' => $seedRes]);
    } else {
        $bCount = (int)$pdo->query("SELECT COUNT(*) FROM bookings WHERE code LIKE '[TEST]%'")->fetchColumn();
        $eCount = (int)$pdo->query("SELECT COUNT(*) FROM expenses WHERE expense_code LIKE '[TEST]%'")->fetchColumn();
        json_response(['success' => true, 'data' => ['testBookings' => $bCount, 'testExpenses' => $eCount]]);
    }
}
