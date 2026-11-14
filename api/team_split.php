<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/security_helper.php';
require_once __DIR__ . '/team_split_helper.php';

secure_session_start();
header('Cache-Control: no-store');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if (!in_array($method, ['GET', 'POST'], true)) {
    header('Allow: GET, POST');
    json_error('Phương thức không được hỗ trợ.', 405, 'ERR_METHOD_NOT_ALLOWED');
}
$body = [];
if ($method === 'POST') {
    $raw = file_get_contents('php://input', false, null, 0, 65537);
    $body = json_decode($raw, true);
    if (strlen($raw) > 65536 || !is_array($body)) {
        json_error('Dữ liệu chia tiền không hợp lệ.', 422, 'ERR_INVALID_INPUT');
    }
    if (!verify_csrf_token($body)) {
        json_error('Phiên bảo mật hết hạn. Vui lòng tải lại trang.', 403, 'ERR_CSRF_INVALID');
    }
}
$rawCode = $method === 'POST' ? ($body['code'] ?? '') : ($_GET['code'] ?? '');
if (!is_string($rawCode) || trim($rawCode) === '' || strlen($rawCode) > 40) {
    json_error('Mã đơn không hợp lệ.', 422, 'ERR_INVALID_CODE');
}
$code = trim($rawCode);
$pdo = getDBConnection(false);
if (!$pdo) {
    json_error('Cơ sở dữ liệu tạm thời không khả dụng.', 503, 'ERR_DB_UNAVAILABLE');
}
$user = !empty($_SESSION['user_id']) ? require_auth($pdo) : null;

try {
    // Lock booking first so two first-time saves cannot both create a split.
    if ($method === 'POST') {
        $pdo->beginTransaction();
    }
    $stmt = $pdo->prepare('SELECT id, code, user_id, total_price FROM bookings WHERE code = ?' . ($method === 'POST' ? ' FOR UPDATE' : ''));
    $stmt->execute([$code]);
    $booking = $stmt->fetch();
    if (!$booking || !can_manage_team_split($booking, $user, (array)($_SESSION['owned_booking_codes'] ?? []))) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        json_error('Bạn không có quyền quản lý chia tiền của đơn này.', 403, 'ERR_FORBIDDEN');
    }
    $stmt = $pdo->prepare('SELECT members_json, revision FROM team_bill_splits WHERE booking_id = ?');
    $stmt->execute([(int)$booking['id']]);
    $saved = $stmt->fetch();
    $revision = $saved ? (int)$saved['revision'] : 0;
    if ($method === 'POST') {
        if (!is_int($body['revision'] ?? null) || $body['revision'] !== $revision) {
            $pdo->rollBack();
            json_error('Bảng chia tiền đã thay đổi. Đóng và mở lại để tải bản mới.', 409, 'ERR_SPLIT_CONFLICT');
        }
        if (!is_array($body['members'] ?? null)) {
            throw new InvalidArgumentException('Danh sách thành viên không hợp lệ.');
        }
        $data = calculate_team_split((int)$booking['total_price'], $body['members']);
        $members = array_map(static function ($member) {
            return ['name' => $member['name'], 'paidAmount' => $member['paidAmount']];
        }, $data['members']);
        $stmt = $pdo->prepare('INSERT INTO team_bill_splits (booking_id, members_json, revision) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE members_json = VALUES(members_json), revision = VALUES(revision)');
        $stmt->execute([(int)$booking['id'], json_encode($members, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR), ++$revision]);
        $pdo->commit();
    } else {
        $members = $saved ? json_decode($saved['members_json'], true, 512, JSON_THROW_ON_ERROR) : [];
        $data = $members ? calculate_team_split((int)$booking['total_price'], $members) : [
            'totalAmount' => (int)$booking['total_price'], 'collectedAmount' => 0,
            'outstandingAmount' => (int)$booking['total_price'], 'members' => []
        ];
    }
    json_response(['success' => true, 'data' => array_merge($data, ['code' => $booking['code'], 'revision' => $revision])]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if ($e instanceof InvalidArgumentException) {
        json_error($e->getMessage(), 422, 'ERR_INVALID_INPUT');
    }
    error_log('[TEAM SPLIT ERROR] ' . $e->getMessage());
    json_error('Không thể tải hoặc lưu chia tiền. Vui lòng thử lại; nếu mới triển khai, cần kiểm tra migration 009.', 503, 'ERR_TEAM_SPLIT_UNAVAILABLE');
}