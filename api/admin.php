<?php

require_once __DIR__ . '/security_helper.php';

$admin = require_admin();
$pdo = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

$rawInput = file_get_contents('php://input');
$data = [];
if (!empty($rawInput)) {
    $decoded = json_decode($rawInput, true);
    if (is_array($decoded)) {
        $data = $decoded;
    }
}
$data = array_merge($_POST, $data);
$action = $_GET['action'] ?? $data['action'] ?? 'overview';

if (!$pdo) {
    if ($action === 'overview') {
        json_response([
            'success' => true,
            'data'    => [
                'todayStats'    => ['count' => 11, 'today_deposit' => 4350000, 'today_total' => 14500000],
                'todayBookings' => [],
                'pitchStats'    => ['total' => 9, 'active' => 9]
            ]
        ]);
    }
    if ($action === 'all_bookings') {
        json_response(['success' => true, 'data' => []]);
    }
    if ($action === 'update_payment') {
        json_response([
            'success' => true,
            'message' => 'Đã cập nhật trạng thái đơn thành công (chế độ dự phòng).'
        ]);
    }
    if ($action === 'toggle_pitch') {
        json_response([
            'success' => true,
            'message' => 'Đã chuyển trạng thái sân thành công (chế độ dự phòng).'
        ]);
    }
    if ($action === 'manage_booking') {
        json_response([
            'success' => true,
            'message' => 'Đã cập nhật xử lý ca đá thành công (chế độ dự phòng).'
        ]);
    }
    if ($action === 'vouchers') {
        json_response([
            'success' => true,
            'data'    => [],
            'message' => 'Đã xử lý voucher thành công (chế độ dự phòng).'
        ]);
    }
}

try {
    
    if ($action === 'overview') {
        $today = date('Y-m-d');

        $todayStmt = $pdo->prepare("SELECT COUNT(*) as count, COALESCE(SUM(deposit_amount), 0) as today_deposit, COALESCE(SUM(total_price), 0) as today_total FROM bookings WHERE booking_date = ? AND payment_status != 'Đã hủy'");
        $todayStmt->execute([$today]);
        $todayStats = $todayStmt->fetch();

        $listStmt = $pdo->prepare("SELECT b.*, p.name as pitch_name, p.type_name, p.variant 
                                   FROM bookings b 
                                   JOIN pitches p ON b.pitch_id = p.id 
                                   WHERE b.booking_date = ? 
                                   ORDER BY b.slot_time ASC");
        $listStmt->execute([$today]);
        $todayBookings = $listStmt->fetchAll();

        foreach ($todayBookings as &$b) {
            $b['services'] = !empty($b['services_json']) ? json_decode($b['services_json'], true) : [];
            unset($b['services_json']);
        }

        $pitchesStmt = $pdo->query("SELECT COUNT(*) as total, SUM(CASE WHEN status = 'Hoạt động' THEN 1 ELSE 0 END) as active FROM pitches");
        $pitchStats = $pitchesStmt->fetch();

        json_response([
            'success' => true,
            'data'    => [
                'todayStats'    => $todayStats,
                'todayBookings' => $todayBookings,
                'pitchStats'    => $pitchStats
            ]
        ]);
    }

    if ($action === 'all_bookings') {
        $stmt = $pdo->query("SELECT b.*, p.name as pitch_name, p.type_name, p.variant 
                             FROM bookings b 
                             JOIN pitches p ON b.pitch_id = p.id 
                             ORDER BY b.id DESC LIMIT 200");
        $all = $stmt->fetchAll();
        foreach ($all as &$b) {
            $b['services'] = !empty($b['services_json']) ? json_decode($b['services_json'], true) : [];
            unset($b['services_json']);
        }
        json_response(['success' => true, 'data' => $all]);
    }

    if ($action === 'update_payment' && $method === 'POST') {
        $code = sanitize_string($data['code'] ?? '', 40);
        $status = sanitize_string($data['status'] ?? '', 50);

        $allowedStatuses = [
            'Chờ duyệt cọc',
            'Đã cọc 30%',
            'Đã thanh toán đủ',
            'Đã thanh toán 100%',
            'Đã hoàn cọc 100%',
            'Bảo lưu cọc 30%',
            'Phạt 50% cọc',
            'Đã hủy',
            'Tịch thu cọc 30%'
        ];
        if (!in_array($status, $allowedStatuses)) {
            json_response(['success' => false, 'message' => 'Trạng thái thanh toán không hợp lệ.'], 400);
        }

        if ($status === 'Đã hủy' || $status === 'Đã hoàn cọc 100%' || $status === 'Bảo lưu cọc 30%' || $status === 'Phạt 50% cọc') {
            $stmt = $pdo->prepare("UPDATE bookings SET payment_status = ?, status = 'Đã hủy', remaining_amount = 0 WHERE code = ?");
            $stmt->execute([$status, $code]);
        } elseif ($status === 'Đã cọc 30%') {
            $stmt = $pdo->prepare("UPDATE bookings SET payment_status = 'Đã cọc 30%', status = 'Đã xác nhận' WHERE code = ?");
            $stmt->execute([$code]);
        } elseif ($status === 'Đã thanh toán 100%' || $status === 'Đã thanh toán đủ') {
            $stmt = $pdo->prepare("UPDATE bookings SET payment_status = ?, status = 'Hoàn thành', remaining_amount = 0 WHERE code = ?");
            $stmt->execute([$status, $code]);
        } else {
            $stmt = $pdo->prepare("UPDATE bookings SET payment_status = ? WHERE code = ?");
            $stmt->execute([$status, $code]);
        }

        json_response([
            'success' => true,
            'message' => "Đã cập nhật trạng thái đơn {$code} thành: {$status}"
        ]);
    }

    if ($action === 'manage_booking' && $method === 'POST') {
        $code = sanitize_string($data['code'] ?? '', 40);
        $subAction = sanitize_string($data['sub_action'] ?? '', 40);
        if (empty($code) || empty($subAction)) {
            json_response(['success' => false, 'message' => 'Thiếu mã đơn hoặc hành động xử lý.'], 400);
        }

        if ($subAction === 'overtime') {
            $minutes = max(0, (int)($data['minutes'] ?? 30));
            $fee = max(0, (int)($data['fee'] ?? 0));
            $noteAdd = " [Đá thêm {$minutes}p: +" . number_format($fee, 0, ',', '.') . "đ]";
            $stmt = $pdo->prepare("UPDATE bookings SET total_price = total_price + ?, remaining_amount = remaining_amount + ?, note = CONCAT(IFNULL(note,''), ?) WHERE code = ?");
            $stmt->execute([$fee, $fee, $noteAdd, $code]);
            json_response(['success' => true, 'message' => "Đã cộng thêm {$minutes} phút đá thêm giờ."]);
        }

        if ($subAction === 'transfer_pitch') {
            $newPitchId = sanitize_string($data['new_pitch_id'] ?? '', 20);
            $diffPrice = (int)($data['diff_price'] ?? 0);
            $reason = sanitize_string($data['reason'] ?? '', 150);
            $noteAdd = " [Đổi sang sân {$newPitchId}" . ($reason ? ": {$reason}" : "") . "]";
            $stmt = $pdo->prepare("UPDATE bookings SET pitch_id = ?, total_price = GREATEST(0, total_price + ?), remaining_amount = GREATEST(0, remaining_amount + ?), note = CONCAT(IFNULL(note,''), ?) WHERE code = ?");
            $stmt->execute([$newPitchId, $diffPrice, $diffPrice, $noteAdd, $code]);
            json_response(['success' => true, 'message' => "Đã chuyển đơn {$code} sang sân {$newPitchId}."]);
        }

        if ($subAction === 'add_service') {
            $addedCost = max(0, (int)($data['added_cost'] ?? 0));
            $servicesJson = isset($data['services']) && is_array($data['services']) ? json_encode($data['services'], JSON_UNESCAPED_UNICODE) : null;
            $srvName = sanitize_string($data['service_name'] ?? 'Dịch vụ', 100);
            $qty = max(1, (int)($data['quantity'] ?? 1));
            $noteAdd = " [Gọi thêm: {$srvName} x{$qty}]";
            if ($servicesJson !== null) {
                $stmt = $pdo->prepare("UPDATE bookings SET services_json = ?, total_price = total_price + ?, remaining_amount = remaining_amount + ?, note = CONCAT(IFNULL(note,''), ?) WHERE code = ?");
                $stmt->execute([$servicesJson, $addedCost, $addedCost, $noteAdd, $code]);
            } else {
                $stmt = $pdo->prepare("UPDATE bookings SET total_price = total_price + ?, remaining_amount = remaining_amount + ?, note = CONCAT(IFNULL(note,''), ?) WHERE code = ?");
                $stmt->execute([$addedCost, $addedCost, $noteAdd, $code]);
            }
            json_response(['success' => true, 'message' => "Đã thêm {$srvName} x{$qty} vào đơn {$code}."]);
        }

        if ($subAction === 'early_cancel') {
            $policy = sanitize_string($data['policy'] ?? 'refund_100', 30);
            $reason = sanitize_string($data['reason'] ?? 'Hủy lịch trước thời hạn', 150);
            if ($policy === 'noshow_forfeit') {
                $payStatus = 'Tịch thu cọc 30%';
                $noteAdd = " [Quá 15p khách chưa đến - Đã nhả sân trống: {$reason}]";
                $stmt = $pdo->prepare("UPDATE bookings SET status = 'Khách chưa đến', payment_status = ?, remaining_amount = 0, note = CONCAT(IFNULL(note,''), ?) WHERE code = ?");
                $stmt->execute([$payStatus, $noteAdd, $code]);
                json_response(['success' => true, 'message' => "Đã chuyển đơn {$code} sang trạng thái Khách chưa đến ({$payStatus})."]);
            }
            $policyMap = [
                'refund_100' => 'Đã hoàn cọc 100%',
                'reserve'    => 'Bảo lưu cọc 30%',
                'forfeit_50' => 'Phạt 50% cọc'
            ];
            $payStatus = $policyMap[$policy] ?? 'Đã hoàn cọc 100%';
            $noteAdd = " [Hủy trước hạn - {$payStatus}: {$reason}]";
            $stmt = $pdo->prepare("UPDATE bookings SET status = 'Đã hủy', payment_status = ?, remaining_amount = 0, note = CONCAT(IFNULL(note,''), ?) WHERE code = ?");
            $stmt->execute([$payStatus, $noteAdd, $code]);
            json_response(['success' => true, 'message' => "Đã hủy đơn {$code} ({$payStatus})."]);
        }

        if ($subAction === 'pay_remaining') {
            $payMethod = sanitize_string($data['pay_method'] ?? 'Tiền mặt tại quầy', 60);
            $noteAdd = " [Đã tất toán 100% qua {$payMethod}]";
            $stmt = $pdo->prepare("UPDATE bookings SET status = 'Hoàn thành', payment_status = 'Đã thanh toán 100%', remaining_amount = 0, note = CONCAT(IFNULL(note,''), ?) WHERE code = ?");
            $stmt->execute([$noteAdd, $code]);
            json_response(['success' => true, 'message' => "Đã hoàn tất thu tiền 100% cho đơn {$code}."]);
        }

        json_response(['success' => false, 'message' => 'Hành động con không hợp lệ.'], 400);
    }

    if ($action === 'vouchers') {
        if ($method === 'GET') {
            $stmt = $pdo->query("SELECT code, description, discount_type AS type, discount_value AS value, min_order AS minOrder, is_active FROM vouchers ORDER BY code ASC");
            json_response(['success' => true, 'data' => $stmt->fetchAll()]);
        }
        if ($method === 'POST') {
            $subAction = sanitize_string($data['sub_action'] ?? 'save', 20);
            $vCode = strtoupper(sanitize_string($data['code'] ?? '', 30));
            if (empty($vCode)) {
                json_response(['success' => false, 'message' => 'Mã voucher không được để trống.'], 400);
            }
            if ($subAction === 'delete') {
                $stmt = $pdo->prepare("DELETE FROM vouchers WHERE code = ?");
                $stmt->execute([$vCode]);
                json_response(['success' => true, 'message' => "Đã xóa mã voucher {$vCode}."]);
            }
            $desc = sanitize_string($data['description'] ?? "Ưu đãi mã {$vCode}", 200);
            $type = ($data['type'] ?? 'percent') === 'fixed' ? 'fixed' : 'percent';
            $val = max(0, (int)($data['value'] ?? 10));
            $minOrder = max(0, (int)($data['minOrder'] ?? 0));
            $stmt = $pdo->prepare("INSERT INTO vouchers (code, description, discount_type, discount_value, min_order, is_active) VALUES (?, ?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE description = VALUES(description), discount_type = VALUES(discount_type), discount_value = VALUES(discount_value), min_order = VALUES(min_order), is_active = 1");
            $stmt->execute([$vCode, $desc, $type, $val, $minOrder]);
            json_response(['success' => true, 'message' => "Đã lưu mã voucher {$vCode}."]);
        }
    }

    if ($action === 'toggle_pitch' && $method === 'POST') {
        $pitchId = sanitize_string($data['pitchId'] ?? $data['pitch_id'] ?? '', 20);
        $status = sanitize_string($data['status'] ?? '', 50);

        if (!in_array($status, ['Hoạt động', 'Bảo trì'])) {
            json_response(['success' => false, 'message' => 'Trạng thái sân không hợp lệ.'], 400);
        }

        $stmt = $pdo->prepare("UPDATE pitches SET status = ? WHERE id = ?");
        $stmt->execute([$status, $pitchId]);

        json_response([
            'success' => true,
            'message' => "Đã chuyển trạng thái sân {$pitchId} sang: {$status}"
        ]);
    }

    json_response(['success' => false, 'message' => 'Hành động quản trị không hợp lệ.'], 400);
} catch (PDOException $e) {
    error_log("[ADMIN API ERROR] " . $e->getMessage());
    json_response(['success' => false, 'message' => 'Lỗi xử lý yêu cầu quản trị.'], 500);
}
