<?php

require_once __DIR__ . '/security_helper.php';

secure_session_start();
$pdo = getDBConnection();

$type = isset($_GET['type']) ? (int)$_GET['type'] : null;
$includeHidden = !empty($_GET['include_hidden']);

try {
    if ($type && in_array($type, [5, 7, 11])) {
        if ($includeHidden) {
            $stmt = $pdo->prepare("SELECT id, name, type, type_name as typeName, size, grass, base_price as basePrice, peak_price as peakPrice, weekend_price as weekendPrice, status, amenities_json, variant, description FROM pitches WHERE type = ? ORDER BY type ASC, id ASC");
            $stmt->execute([$type]);
        } else {
            $stmt = $pdo->prepare("SELECT id, name, type, type_name as typeName, size, grass, base_price as basePrice, peak_price as peakPrice, weekend_price as weekendPrice, status, amenities_json, variant, description FROM pitches WHERE type = ? AND status != 'Ẩn' ORDER BY type ASC, id ASC");
            $stmt->execute([$type]);
        }
    } else {
        if ($includeHidden) {
            $stmt = $pdo->prepare("SELECT id, name, type, type_name as typeName, size, grass, base_price as basePrice, peak_price as peakPrice, weekend_price as weekendPrice, status, amenities_json, variant, description FROM pitches ORDER BY type ASC, id ASC");
            $stmt->execute();
        } else {
            $stmt = $pdo->prepare("SELECT id, name, type, type_name as typeName, size, grass, base_price as basePrice, peak_price as peakPrice, weekend_price as weekendPrice, status, amenities_json, variant, description FROM pitches WHERE status != 'Ẩn' ORDER BY type ASC, id ASC");
            $stmt->execute();
        }
    }

    $pitches = $stmt->fetchAll();

    foreach ($pitches as &$p) {
        $p['amenities'] = !empty($p['amenities_json']) ? json_decode($p['amenities_json'], true) : [];
        unset($p['amenities_json']);
        $p['type'] = (int)$p['type'];
        $p['basePrice'] = (int)$p['basePrice'];
        $p['peakPrice'] = (int)$p['peakPrice'];
        $p['weekendPrice'] = (int)($p['weekendPrice'] ?? 0);
        if ($p['weekendPrice'] <= 0) {
            $p['weekendPrice'] = $p['type'] === 5 ? 380000 : ($p['type'] === 7 ? 700000 : 1400000);
        }
    }

    $all = isset($_GET['all']) && $_GET['all'] == '1';
    $withSettings = $all || (isset($_GET['settings']) && $_GET['settings'] == '1');
    $data = ['pitches' => $pitches];

    if ($all) {
        $slotsStmt = $pdo->query("SELECT id, slot_time as time, start_time as start, end_time as end, is_peak as isPeak, duration FROM time_slots ORDER BY id ASC");
        $slots = $slotsStmt->fetchAll();
        foreach ($slots as &$s) {
            $s['isPeak'] = (bool)$s['isPeak'];
            $s['duration'] = (float)$s['duration'];
        }
        $data['timeSlots'] = $slots;

        $servicesStmt = $pdo->query("SELECT id, name, price, unit, icon, stock_qty as stockQty, min_stock_warning as minStockWarning, track_inventory as trackInventory, is_active as isActive FROM extra_services WHERE is_active = 1 ORDER BY price ASC");
        $extraServices = $servicesStmt->fetchAll();
        foreach ($extraServices as &$srv) {
            $srv['price']           = (int)$srv['price'];
            $srv['stockQty']        = (int)($srv['stockQty'] ?? 100);
            $srv['minStockWarning'] = (int)($srv['minStockWarning'] ?? 10);
            $srv['trackInventory']  = (bool)($srv['trackInventory'] ?? true);
            $srv['isActive']        = (bool)($srv['isActive'] ?? true);
            $srv['lowStock']        = ($srv['trackInventory'] && $srv['stockQty'] <= $srv['minStockWarning']);
        }
        $data['extraServices'] = $extraServices;

        $vouchersStmt = $pdo->query("SELECT code, description, discount_type as type, discount_value as value, min_order as minOrder FROM vouchers WHERE is_active = 1");
        $data['vouchers'] = $vouchersStmt->fetchAll();
    }

    if ($withSettings) {
        $settingsMap = [];
        try {
            $setStmt = $pdo->query("SELECT setting_key, setting_value FROM settings");
            while ($row = $setStmt->fetch()) {
                $settingsMap[$row['setting_key']] = $row['setting_value'];
            }
        } catch (PDOException $setEx) {
            error_log("[API PITCHES SETTINGS WARN] " . $setEx->getMessage());
        }

        $data['settings'] = [
            'depositRate'        => (int)($settingsMap['deposit_rate'] ?? 30),
            'hotline'            => $settingsMap['hotline'] ?? '0352 313 548',
            'openHours'          => $settingsMap['open_hours'] ?? '05:30 - 23:00 hàng ngày (kể cả Lễ, Tết)',
            'holdMinutes'        => max(5, min(120, (int)($settingsMap['hold_minutes'] ?? 15))),
            'refundFullHours'    => max(1, (int)($settingsMap['refund_full_hours'] ?? 24)),
            'refundPartialHours' => max(0, (int)($settingsMap['refund_partial_hours'] ?? 4)),
            'autoCancelEnabled'  => ((string)($settingsMap['auto_cancel_enabled'] ?? '1') !== '0'),
            'pricingTable' => [
                'p5'  => [
                    'base'    => (int)($settingsMap['price_p5_base'] ?? 250000),
                    'peak'    => (int)($settingsMap['price_p5_peak'] ?? 350000),
                    'weekend' => (int)($settingsMap['price_p5_weekend'] ?? 380000)
                ],
                'p7'  => [
                    'base'    => (int)($settingsMap['price_p7_base'] ?? 450000),
                    'peak'    => (int)($settingsMap['price_p7_peak'] ?? 650000),
                    'weekend' => (int)($settingsMap['price_p7_weekend'] ?? 700000)
                ],
                'p11' => [
                    'base'    => (int)($settingsMap['price_p11_base'] ?? 900000),
                    'peak'    => (int)($settingsMap['price_p11_peak'] ?? 1200000),
                    'weekend' => (int)($settingsMap['price_p11_weekend'] ?? 1400000)
                ]
            ]
        ];

        $data['bankInfo'] = [
            'bankName'      => $settingsMap['bank_name'] ?? 'MBBank',
            'bankCode'      => $settingsMap['bank_code'] ?? 'MB',
            'accountNo'     => $settingsMap['bank_account'] ?? '0352313548',
            'accountNumber' => $settingsMap['bank_account'] ?? '0352313548',
            'accountName'   => $settingsMap['bank_holder'] ?? 'NGUYEN QUANG VINH'
        ];
    }

    json_response([
        'success' => true,
        'data'    => $data
    ]);
} catch (PDOException $e) {
    error_log("[API PITCHES ERROR] " . $e->getMessage());
    json_response([
        'success'  => false,
        'message'  => 'Không thể tải danh sách sân bóng.',
        'ref_code' => 'ERR_FETCH_PITCHES'
    ], 500);
}
