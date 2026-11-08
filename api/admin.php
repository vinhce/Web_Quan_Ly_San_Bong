<?php
/**
 * SÂN BÓNG PRO - API DÀNH RIÊNG CHO QUẢN TRỊ VIÊN (api/admin.php)
 * - Nghiêm ngặt kiểm tra vai trò admin bằng require_admin()
 * - Trả 403 Forbidden nếu user thường cố tình truy cập (Chống leo thang quyền)
 * - Prepared Statements 100%
 */

require_once __DIR__ . '/security_helper.php';

// Kiểm tra quyền Admin tối cao
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

try {
    // 1. TỔNG QUAN KPI & DOANH THU (GET /api/admin.php?action=overview)
    if ($action === 'overview') {
        $today = date('Y-m-d');

        // Số đơn hôm nay
        $todayStmt = $pdo->prepare("SELECT COUNT(*) as count, COALESCE(SUM(deposit_amount), 0) as today_deposit, COALESCE(SUM(total_price), 0) as today_total FROM bookings WHERE booking_date = ? AND payment_status != 'Đã hủy'");
        $todayStmt->execute([$today]);
        $todayStats = $todayStmt->fetch();

        // Danh sách ca đá hôm nay
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

        // Thống kê tổng số sân hoạt động
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

    // 2. TOÀN BỘ ĐƠN ĐẶT SÂN (GET /api/admin.php?action=all_bookings)
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

    // 3. DUYỆT THANH TOÁN / ĐỔI TRẠNG THÁI (POST /api/admin.php?action=update_payment)
    if ($action === 'update_payment' && $method === 'POST') {
        $code = sanitize_string($data['code'] ?? '', 40);
        $status = sanitize_string($data['status'] ?? '', 50);

        $allowedStatuses = ['Chờ duyệt cọc', 'Đã cọc 30%', 'Đã thanh toán đủ', 'Đã hủy', 'Tịch thu cọc 30%'];
        if (!in_array($status, $allowedStatuses)) {
            json_response(['success' => false, 'message' => 'Trạng thái thanh toán không hợp lệ.'], 400);
        }

        if ($status === 'Đã hủy') {
            $stmt = $pdo->prepare("UPDATE bookings SET payment_status = 'Đã hủy', status = 'Đã hủy' WHERE code = ?");
            $stmt->execute([$code]);
        } elseif ($status === 'Đã cọc 30%') {
            $stmt = $pdo->prepare("UPDATE bookings SET payment_status = 'Đã cọc 30%', status = 'Đã xác nhận' WHERE code = ?");
            $stmt->execute([$code]);
        } else {
            $stmt = $pdo->prepare("UPDATE bookings SET payment_status = ? WHERE code = ?");
            $stmt->execute([$status, $code]);
        }

        json_response([
            'success' => true,
            'message' => "Đã cập nhật trạng thái đơn {$code} thành: {$status}"
        ]);
    }

    // 4. BẬT / TẮT BẢO TRÌ SÂN (POST /api/admin.php?action=toggle_pitch)
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
