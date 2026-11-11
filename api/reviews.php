<?php

defined('SANBONG_APP') or define('SANBONG_APP', true);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/security_helper.php';
require_once __DIR__ . '/notification_helper.php';

secure_session_start();
$pdo = getDBConnection(false);
$method = $_SERVER['REQUEST_METHOD'];

if (!$pdo) {
    json_error('Hệ thống cơ sở dữ liệu tạm thời không khả dụng.', 503, 'ERR_DB_UNAVAILABLE');
}

if ($method === 'GET') {
    try {
        $pitchId = sanitize_string($_GET['pitch_id'] ?? '', 20);
        $all = !empty($_GET['all']);
        $checkCode = strtoupper(sanitize_string($_GET['booking_code'] ?? '', 40));
        $batchCodesRaw = sanitize_string($_GET['booking_codes'] ?? '', 1000);

        if ($all) {
            require_staff_or_admin($pdo);

            $stmt = $pdo->query("
                SELECT r.*, p.name AS pitch_name, b.booking_date, b.slot_id, b.slot_time
                FROM reviews r
                LEFT JOIN pitches p ON r.pitch_id = p.id
                LEFT JOIN bookings b ON r.booking_code = b.code
                ORDER BY r.created_at DESC, r.id DESC
                LIMIT 200
            ");
            $reviews = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $pitchStatsStmt = $pdo->query("
                SELECT p.id AS pitch_id, p.name AS pitch_name, p.type,
                       COUNT(r.id) AS total_reviews,
                       SUM(CASE WHEN r.status = 'published' THEN 1 ELSE 0 END) AS published_count,
                       ROUND(COALESCE(AVG(CASE WHEN r.status = 'published' THEN r.rating ELSE NULL END), 0), 1) AS avg_rating
                FROM pitches p
                LEFT JOIN reviews r ON p.id = r.pitch_id
                GROUP BY p.id, p.name, p.type
                ORDER BY p.type ASC, p.id ASC
            ");
            $pitchStats = $pitchStatsStmt ? $pitchStatsStmt->fetchAll(PDO::FETCH_ASSOC) : [];

            $slotStatsStmt = $pdo->query("
                SELECT COALESCE(b.slot_id, 'OTHER') AS slot_id,
                       COALESCE(b.slot_time, 'Khác') AS slot_time,
                       COUNT(r.id) AS total_reviews,
                       ROUND(AVG(r.rating), 1) AS avg_rating
                FROM reviews r
                LEFT JOIN bookings b ON r.booking_code = b.code
                WHERE r.status = 'published'
                GROUP BY COALESCE(b.slot_id, 'OTHER'), COALESCE(b.slot_time, 'Khác')
                ORDER BY slot_time ASC
            ");
            $slotStats = $slotStatsStmt ? $slotStatsStmt->fetchAll(PDO::FETCH_ASSOC) : [];

            $sumRow = $pdo->query("
                SELECT COUNT(*) AS total_reviews,
                       SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published_reviews,
                       SUM(CASE WHEN status = 'hidden' THEN 1 ELSE 0 END) AS hidden_reviews,
                       ROUND(COALESCE(AVG(CASE WHEN status = 'published' THEN rating ELSE NULL END), 0), 1) AS avg_rating
                FROM reviews
            ")->fetch(PDO::FETCH_ASSOC);

            json_response([
                'success' => true,
                'data'    => [
                    'reviews'    => $reviews,
                    'pitchStats' => $pitchStats,
                    'slotStats'  => $slotStats,
                    'summary'    => [
                        'total_reviews'     => (int)($sumRow['total_reviews'] ?? 0),
                        'published_reviews' => (int)($sumRow['published_reviews'] ?? 0),
                        'hidden_reviews'    => (int)($sumRow['hidden_reviews'] ?? 0),
                        'avg_rating'        => (float)($sumRow['avg_rating'] ?? 0)
                    ]
                ]
            ]);
        }

        if ($batchCodesRaw !== '') {
            $codes = array_values(array_filter(array_unique(array_map(static function ($c) {
                return strtoupper(sanitize_string(trim($c), 40));
            }, explode(',', $batchCodesRaw)))));
            $codes = array_slice($codes, 0, 50);

            if (empty($codes)) {
                json_response(['success' => true, 'data' => ['reviewed' => new stdClass()]]);
            }

            $ph = implode(',', array_fill(0, count($codes), '?'));
            $stmt = $pdo->prepare("
                SELECT booking_code, rating, comment, staff_reply, status, created_at
                FROM reviews
                WHERE booking_code IN ({$ph})
            ");
            $stmt->execute($codes);
            $reviewedMap = [];
            while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $reviewedMap[$r['booking_code']] = [
                    'booking_code' => $r['booking_code'],
                    'rating'       => (int)$r['rating'],
                    'comment'      => $r['comment'],
                    'staff_reply'  => $r['staff_reply'],
                    'status'       => $r['status'],
                    'created_at'   => $r['created_at']
                ];
            }
            json_response(['success' => true, 'data' => ['reviewed' => $reviewedMap]]);
        }

        if ($checkCode !== '') {
            $bStmt = $pdo->prepare("
                SELECT b.code, b.pitch_id, p.name AS pitch_name, b.booking_date, b.slot_time, b.status
                FROM bookings b
                LEFT JOIN pitches p ON b.pitch_id = p.id
                WHERE b.code = ?
                LIMIT 1
            ");
            $bStmt->execute([$checkCode]);
            $booking = $bStmt->fetch(PDO::FETCH_ASSOC);
            if (!$booking) {
                json_error('Không tìm thấy mã đơn đặt sân tương ứng.', 404, 'ERR_NOT_FOUND');
            }

            $rStmt = $pdo->prepare("SELECT rating, comment, staff_reply, created_at FROM reviews WHERE booking_code = ? LIMIT 1");
            $rStmt->execute([$checkCode]);
            $existingReview = $rStmt->fetch(PDO::FETCH_ASSOC) ?: null;

            $isInvalidState = ($booking['status'] === 'Đã hủy' || $booking['status'] === 'Khách chưa đến');
            $eligible = !$isInvalidState && !$existingReview;
            $reason = $existingReview
                ? 'Đơn đặt sân này đã gửi đánh giá trước đó.'
                : ($isInvalidState ? 'Đơn đặt sân đã hủy hoặc khách không đến nên không thể đánh giá.' : '');

            json_response([
                'success' => true,
                'data'    => [
                    'booking_code'     => $booking['code'],
                    'pitch_id'         => $booking['pitch_id'],
                    'pitch_name'       => $booking['pitch_name'] ?: $booking['pitch_id'],
                    'booking_date'     => $booking['booking_date'],
                    'slot_time'        => $booking['slot_time'],
                    'status'           => $booking['status'],
                    'eligible'         => $eligible,
                    'already_reviewed' => (bool)$existingReview,
                    'reason'           => $reason,
                    'existing_review'  => $existingReview
                ]
            ]);
        }

        $where = ["r.status = 'published'"];
        $params = [];

        if ($pitchId !== '') {
            $where[] = "r.pitch_id = ?";
            $params[] = $pitchId;
        }

        $sql = "
            SELECT r.id, r.booking_code, r.pitch_id, r.customer_name, r.rating,
                   r.comment, r.staff_reply, r.created_at, p.name AS pitch_name, b.slot_time
            FROM reviews r
            LEFT JOIN pitches p ON r.pitch_id = p.id
            LEFT JOIN bookings b ON r.booking_code = b.code
            WHERE " . implode(' AND ', $where) . "
            ORDER BY r.created_at DESC
            LIMIT 50
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $reviews = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $statsSql = "
            SELECT
                COUNT(*) AS total_reviews,
                COALESCE(AVG(rating), 5.0) AS avg_rating,
                SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) AS star_5,
                SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) AS star_4,
                SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) AS star_3,
                SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) AS star_2,
                SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS star_1
            FROM reviews
            WHERE status = 'published' " . ($pitchId !== '' ? "AND pitch_id = ?" : "");

        $statsStmt = $pdo->prepare($statsSql);
        $statsStmt->execute($pitchId !== '' ? [$pitchId] : []);
        $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);

        json_response([
            'success' => true,
            'data'    => [
                'reviews' => $reviews,
                'stats'   => [
                    'total_reviews' => (int)($stats['total_reviews'] ?? 0),
                    'avg_rating'    => round((float)($stats['avg_rating'] ?? 5.0), 1),
                    'star_5'        => (int)($stats['star_5'] ?? 0),
                    'star_4'        => (int)($stats['star_4'] ?? 0),
                    'star_3'        => (int)($stats['star_3'] ?? 0),
                    'star_2'        => (int)($stats['star_2'] ?? 0),
                    'star_1'        => (int)($stats['star_1'] ?? 0)
                ]
            ]
        ]);
    } catch (Exception $e) {
        error_log('[REVIEWS GET ERROR] ' . $e->getMessage());
        json_error('Lỗi tải đánh giá.', 500, 'ERR_REVIEWS_FETCH');
    }
}

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $decoded = json_decode((string)$rawInput, true);
    $body = array_merge($_POST, is_array($decoded) ? $decoded : []);
    require_csrf_if_session_authenticated($body);

    $action = sanitize_string($body['action'] ?? 'submit_review', 30);

    if ($action === 'submit_review') {
        if (!check_rate_limit($pdo, 'submit_review', 5, 300)) {
            json_error('Bạn gửi đánh giá quá nhanh. Vui lòng thử lại sau ít phút.', 429, 'ERR_RATE_LIMITED');
        }
        increment_rate_limit($pdo, 'submit_review');

        $bookingCode  = strtoupper(sanitize_string($body['booking_code'] ?? '', 40));
        $rating       = max(1, min(5, (int)($body['rating'] ?? 5)));
        $comment      = sanitize_string($body['comment'] ?? '', 500);
        $customerName = sanitize_string($body['customer_name'] ?? '', 100);
        $phone        = normalize_phone(sanitize_string($body['phone'] ?? '', 25));

        if ($bookingCode === '') {
            json_error('Vui lòng cung cấp mã vé đặt sân.', 400, 'ERR_MISSING_CODE');
        }

        $bookingStmt = $pdo->prepare("
            SELECT b.id, b.code, b.user_id, b.pitch_id, b.customer_name, b.phone, b.status, p.name AS pitch_name
            FROM bookings b
            LEFT JOIN pitches p ON b.pitch_id = p.id
            WHERE b.code = ?
            LIMIT 1
        ");
        $bookingStmt->execute([$bookingCode]);
        $booking = $bookingStmt->fetch(PDO::FETCH_ASSOC);

        if (!$booking) {
            json_error('Mã đặt sân không tồn tại trong hệ thống.', 404, 'ERR_NOT_FOUND');
        }

        if ($booking['status'] === 'Đã hủy' || strpos((string)$booking['status'], 'Hủy') !== false || $booking['status'] === 'Khách chưa đến') {
            json_error('Đơn đặt sân đã bị hủy hoặc khách không đến, không thể gửi đánh giá.', 400, 'ERR_BOOKING_NOT_REVIEWABLE');
        }

        $currentUser = get_authenticated_user($pdo);
        if ($currentUser && !is_portal_operator($currentUser)) {
            $uPhone = normalize_phone($currentUser['phone'] ?? '');
            $bPhone = normalize_phone($booking['phone'] ?? '');
            $ownsById = !empty($booking['user_id']) && ((int)$booking['user_id'] === (int)$currentUser['id']);
            $ownsByPhone = ($uPhone !== '' && $bPhone !== '' && $uPhone === $bPhone);
            if (!$ownsById && !$ownsByPhone) {
                json_error('Bạn chỉ có thể đánh giá các đơn đặt sân thuộc tài khoản của mình.', 403, 'ERR_IDOR_BLOCKED');
            }
        } elseif (!$currentUser) {
            if ($phone === '') {
                json_error('Khách vãng lai bắt buộc cung cấp số điện thoại đã dùng khi đặt sân để xác thực quyền đánh giá.', 403, 'ERR_PHONE_REQUIRED');
            }
            $bPhone = normalize_phone($booking['phone'] ?? '');
            if (!preg_match('/^0[0-9]{9,10}$/', $phone) || ($bPhone !== '' && $phone !== $bPhone)) {
                json_error('Vui lòng nhập đúng số điện thoại đã đặt sân (hoặc đăng nhập) để xác thực quyền đánh giá.', 403, 'ERR_PHONE_MISMATCH');
            }
        }

        $checkStmt = $pdo->prepare("SELECT id FROM reviews WHERE booking_code = ? LIMIT 1");
        $checkStmt->execute([$bookingCode]);
        if ($checkStmt->fetchColumn()) {
            json_error('Mã vé này đã được gửi đánh giá trước đó rồi.', 409, 'ERR_ALREADY_REVIEWED');
        }

        $finalName  = $customerName !== '' ? $customerName : (string)$booking['customer_name'];
        $finalPhone = (string)$booking['phone'];

        try {
            $insStmt = $pdo->prepare("
                INSERT INTO reviews (booking_code, pitch_id, customer_name, phone, rating, comment, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 'published', NOW())
            ");
            $insStmt->execute([
                $bookingCode,
                $booking['pitch_id'],
                $finalName,
                $finalPhone,
                $rating,
                $comment
            ]);
        } catch (PDOException $pdoEx) {
            if ((string)$pdoEx->getCode() === '23000') {
                json_error('Mã vé này đã được gửi đánh giá trước đó rồi.', 409, 'ERR_ALREADY_REVIEWED');
            }
            error_log('[REVIEWS INSERT ERROR] ' . $pdoEx->getMessage());
            json_error('Không thể lưu đánh giá lúc này.', 500, 'ERR_REVIEW_INSERT');
        }

        $starEmoji = str_repeat('⭐', $rating);
        $pitchLabel = $booking['pitch_name'] ?: $booking['pitch_id'];
        $tgMsg = "🌟 <b>ĐÁNH GIÁ SÂN MỚI ({$rating}/5 sao)</b>\n"
               . "• Sân: <b>" . tg_escape($pitchLabel) . "</b>\n"
               . "• Khách hàng: <b>" . tg_escape($finalName) . "</b>\n"
               . "• Đánh giá: {$starEmoji}\n"
               . "• Nhận xét: <i>\"" . tg_escape($comment ?: 'Không có bình luận') . "\"</i>\n"
               . "• Mã vé: <code>" . tg_escape($bookingCode) . "</code>";
        send_telegram_notification($tgMsg, 'review', $pdo);

        json_response([
            'success' => true,
            'message' => 'Cảm ơn bạn đã gửi đánh giá! Ý kiến của bạn giúp chúng tôi nâng cao chất lượng sân bóng.',
            'data'    => [
                'booking_code' => $bookingCode,
                'rating'       => $rating,
                'comment'      => $comment
            ]
        ], 201);
    }

    if ($action === 'reply_review') {
        $operator = require_staff_or_admin($pdo);
        $reviewId = (int)($body['review_id'] ?? 0);
        $replyText = sanitize_string($body['reply_text'] ?? '', 500);

        if ($reviewId <= 0 || $replyText === '') {
            json_error('Thiếu ID đánh giá hoặc nội dung phản hồi.', 400, 'ERR_MISSING_PARAMS');
        }

        $upStmt = $pdo->prepare("
            UPDATE reviews
            SET staff_reply = ?, reply_by = ?, reply_at = NOW()
            WHERE id = ?
        ");
        $upStmt->execute([$replyText, (int)$operator['id'], $reviewId]);

        write_audit_log($pdo, 'REVIEW_REPLY', 'REV-' . $reviewId, null, $replyText, $operator);

        json_response([
            'success' => true,
            'message' => 'Phản hồi đánh giá thành công!',
            'data'    => ['review_id' => $reviewId, 'staff_reply' => $replyText]
        ]);
    }

    if ($action === 'toggle_status') {
        $mgr = require_manager_or_admin($pdo);
        $reviewId = (int)($body['review_id'] ?? 0);
        $status = sanitize_string($body['status'] ?? 'published', 20);

        if ($reviewId <= 0) {
            json_error('Thiếu ID đánh giá.', 400, 'ERR_MISSING_ID');
        }
        if (!in_array($status, ['published', 'hidden'], true)) {
            $status = 'published';
        }

        $stmt = $pdo->prepare("UPDATE reviews SET status = ? WHERE id = ?");
        $stmt->execute([$status, $reviewId]);

        write_audit_log($pdo, 'REVIEW_STATUS', 'REV-' . $reviewId, null, "Chuyển trạng thái đánh giá #{$reviewId} -> {$status}", $mgr);

        json_response([
            'success' => true,
            'message' => $status === 'hidden' ? 'Đã ẩn đánh giá khỏi trang công khai.' : 'Đã hiển thị lại đánh giá.',
            'data'    => ['review_id' => $reviewId, 'status' => $status]
        ]);
    }

    json_error('Hành động không hợp lệ.', 400, 'ERR_INVALID_ACTION');
}

json_error('Phương thức không được hỗ trợ.', 405, 'ERR_METHOD_NOT_ALLOWED');
