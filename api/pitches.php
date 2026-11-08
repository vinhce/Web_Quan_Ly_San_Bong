<?php
/**
 * SÂN BÓNG PRO - API DANH SÁCH SÂN BÓNG (api/pitches.php)
 * - Truy vấn CSDL chuẩn Prepared Statements chống SQL Injection
 * - Trả JSON an toàn, parse đúng kiểu dữ liệu
 */

require_once __DIR__ . '/security_helper.php';

secure_session_start();
$pdo = getDBConnection();

$type = isset($_GET['type']) ? (int)$_GET['type'] : null;

try {
    if ($type && in_array($type, [5, 7, 11])) {
        $stmt = $pdo->prepare("SELECT id, name, type, type_name as typeName, size, grass, base_price as basePrice, peak_price as peakPrice, status, amenities_json, variant, description FROM pitches WHERE type = ? ORDER BY type ASC, id ASC");
        $stmt->execute([$type]);
    } else {
        $stmt = $pdo->prepare("SELECT id, name, type, type_name as typeName, size, grass, base_price as basePrice, peak_price as peakPrice, status, amenities_json, variant, description FROM pitches ORDER BY type ASC, id ASC");
        $stmt->execute();
    }

    $pitches = $stmt->fetchAll();
    
    // Parse amenities_json thành array
    foreach ($pitches as &$p) {
        $p['amenities'] = !empty($p['amenities_json']) ? json_decode($p['amenities_json'], true) : [];
        unset($p['amenities_json']);
        $p['type'] = (int)$p['type'];
        $p['basePrice'] = (int)$p['basePrice'];
        $p['peakPrice'] = (int)$p['peakPrice'];
    }

    // Lấy kèm danh sách time slots và extra services nếu có yêu cầu all=1
    $all = isset($_GET['all']) && $_GET['all'] == '1';
    $data = ['pitches' => $pitches];

    if ($all) {
        $slotsStmt = $pdo->query("SELECT id, slot_time as time, start_time as start, end_time as end, is_peak as isPeak, duration FROM time_slots ORDER BY id ASC");
        $slots = $slotsStmt->fetchAll();
        foreach ($slots as &$s) {
            $s['isPeak'] = (bool)$s['isPeak'];
            $s['duration'] = (float)$s['duration'];
        }
        $data['timeSlots'] = $slots;

        $servicesStmt = $pdo->query("SELECT id, name, price, unit, icon FROM extra_services ORDER BY price ASC");
        $data['extraServices'] = $servicesStmt->fetchAll();

        $vouchersStmt = $pdo->query("SELECT code, description, discount_type as type, discount_value as value, min_order as minOrder FROM vouchers WHERE is_active = 1");
        $data['vouchers'] = $vouchersStmt->fetchAll();
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
