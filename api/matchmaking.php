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

$settings = get_system_settings_map($pdo);
$matchmakingEnabled = ((string)($settings['matchmaking_enabled'] ?? '1') !== '0');
$requireApproval = ((string)($settings['matchmaking_require_approval'] ?? '0') === '1');

if ($method === 'GET') {
    if (!$matchmakingEnabled) {
        json_response([
            'success'          => true,
            'enabled'          => false,
            'requireApproval'  => $requireApproval,
            'data'             => [],
            'message'          => 'Tính năng Tìm đối / Ghép kèo hiện đang tạm tắt.'
        ]);
    }

    try {
        $currentUser = function_exists('get_authenticated_user') ? get_authenticated_user($pdo) : null;
        $status = sanitize_string($_GET['status'] ?? 'open', 20);
        $pitchType = isset($_GET['pitch_type']) && $_GET['pitch_type'] !== '' ? (int)$_GET['pitch_type'] : null;
        $date = sanitize_string($_GET['date'] ?? '', 15);
        $limit = min(50, max(1, (int)($_GET['limit'] ?? 20)));

        $where = ["1=1"];
        $params = [];

        if ($status === 'open') {
            $where[] = "m.status = 'open'";
        } elseif ($status === 'matched') {
            $where[] = "m.status = 'matched'";
        } else {
            $where[] = "m.status IN ('open', 'matched')";
        }

        if ($pitchType && in_array($pitchType, [5, 7, 11], true)) {
            $where[] = "m.pitch_type = ?";
            $params[] = $pitchType;
        }
        if ($date !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $where[] = "m.match_date >= ?";
            $params[] = $date;
        } else {
            $where[] = "m.match_date >= CURDATE()";
        }

        $sql = "SELECT m.*, u.username AS author_username, u.full_name AS author_fullname, u.customer_tier AS author_tier
                FROM matchmaking_posts m
                LEFT JOIN users u ON m.user_id = u.id
                WHERE " . implode(' AND ', $where) . "
                ORDER BY m.match_date ASC, m.created_at DESC
                LIMIT {$limit}";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $posts = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($posts as &$p) {
            $p['pitch_type'] = (int)$p['pitch_type'];
            $isMine = ($currentUser && (int)($p['user_id'] ?? 0) === (int)$currentUser['id']);
            $p['is_mine'] = $isMine;
            $p['phone_masked'] = mask_phone_number($p['phone'] ?? '');
            if ($currentUser !== null || $isMine) {
                // Giữ nguyên $p['phone'] cho hội viên đã đăng nhập để liên hệ
            } else {
                unset($p['phone']);
            }
            unset($p['opponent_phone']);
        }
        unset($p);

        json_response([
            'success'         => true,
            'enabled'         => true,
            'requireApproval' => $requireApproval,
            'data'            => $posts
        ]);
    } catch (Exception $e) {
        error_log('[MATCHMAKING GET ERROR] ' . $e->getMessage());
        json_error('Lỗi tải danh sách ghép kèo.', 500, 'ERR_MATCHMAKING_FETCH');
    }
}

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $decoded = json_decode((string)$rawInput, true);
    $body = array_merge($_POST, is_array($decoded) ? $decoded : []);
    require_csrf_if_session_authenticated($body);

    if (!$matchmakingEnabled) {
        json_error('Tính năng Tìm đối / Ghép kèo hiện đang tạm tắt trong Cài đặt hệ thống.', 403, 'ERR_FEATURE_DISABLED');
    }

    $action = sanitize_string($body['action'] ?? 'create_post', 30);

    if ($action === 'create_post') {
        if (!check_rate_limit($pdo, 'matchmaking_post', 5, 300)) {
            json_error('Bạn đăng tin tìm đối quá nhanh. Vui lòng thử lại sau ít phút.', 429, 'ERR_RATE_LIMITED');
        }
        increment_rate_limit($pdo, 'matchmaking_post');

        $teamName    = sanitize_string($body['team_name'] ?? '', 100);
        $captainName = sanitize_string($body['captain_name'] ?? '', 100);
        $phone       = normalize_phone(sanitize_string($body['phone'] ?? '', 25));
        $matchDate   = sanitize_string($body['match_date'] ?? '', 15);
        $slotId      = sanitize_string($body['slot_id'] ?? '', 10);
        $slotTime    = sanitize_string($body['slot_time'] ?? '', 50);
        $pitchId     = sanitize_string($body['pitch_id'] ?? '', 20);
        $pitchType   = (int)($body['pitch_type'] ?? 7);
        $skillLevel  = sanitize_string($body['skill_level'] ?? 'intermediate', 20);
        $feeMode     = sanitize_string($body['fee_mode'] ?? 'split_50_50', 20);
        $bookingCode = strtoupper(sanitize_string($body['booking_code'] ?? '', 40));
        $note        = sanitize_string($body['note'] ?? '', 300);

        if ($teamName === '' || $captainName === '' || $phone === '' || $matchDate === '' || $slotTime === '') {
            json_error('Vui lòng điền đầy đủ: Tên đội, Đội trưởng, SĐT, Ngày đá và Khung giờ.', 400, 'ERR_MISSING_PARAMS');
        }
        if (!preg_match('/^0[0-9]{9,10}$/', $phone)) {
            json_error('Số điện thoại không hợp lệ (cần 10-11 chữ số, bắt đầu bằng 0).', 400, 'ERR_INVALID_PHONE');
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $matchDate) || strtotime($matchDate) < strtotime(date('Y-m-d'))) {
            json_error('Không thể đăng tìm đối cho ngày không hợp lệ hoặc trong quá khứ.', 400, 'ERR_INVALID_DATE');
        }
        if (!in_array($pitchType, [5, 7, 11], true)) {
            $pitchType = 7;
        }
        if (!in_array($skillLevel, ['beginner', 'intermediate', 'advanced', 'all'], true)) {
            $skillLevel = 'intermediate';
        }
        if (!in_array($feeMode, ['split_50_50', 'loser_pays', 'negotiable'], true)) {
            $feeMode = 'split_50_50';
        }
        if (is_phone_blacklisted($pdo, $phone)) {
            json_error('Số điện thoại này hiện đang bị hạn chế do vi phạm chính sách sân.', 403, 'ERR_BLACKLISTED');
        }

        if ($slotId !== '') {
            $tsChk = $pdo->prepare("SELECT slot_time FROM time_slots WHERE id = ? LIMIT 1");
            $tsChk->execute([$slotId]);
            $foundSlotTime = $tsChk->fetchColumn();
            if ($foundSlotTime) {
                $slotTime = (string)$foundSlotTime;
            } else {
                $slotId = '';
            }
        }

        $postCode = 'KEO-' . date('ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 5));
        $currentUser = get_authenticated_user($pdo);
        $userId = $currentUser ? (int)$currentUser['id'] : null;
        $initialStatus = $requireApproval ? 'pending' : 'open';

        $stmt = $pdo->prepare("
            INSERT INTO matchmaking_posts
            (post_code, user_id, team_name, captain_name, phone, match_date, slot_id, slot_time, pitch_id, pitch_type, skill_level, fee_mode, status, booking_code, note, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $postCode,
            $userId,
            $teamName,
            $captainName,
            $phone,
            $matchDate,
            $slotId !== '' ? $slotId : null,
            $slotTime,
            $pitchId !== '' ? $pitchId : null,
            $pitchType,
            $skillLevel,
            $feeMode,
            $initialStatus,
            $bookingCode !== '' ? $bookingCode : null,
            $note
        ]);

        $statusTag = $requireApproval ? '⏳ CHỜ ADMIN DUYỆT' : '✅ ĐANG MỞ';
        $tgMsg = "⚽ <b>CÓ KÈO TÌM ĐỐI MỚI ({$statusTag})</b>\n"
               . "• Mã kèo: <code>" . tg_escape($postCode) . "</code>\n"
               . "• Đội bóng: <b>" . tg_escape($teamName) . "</b> (Cap: " . tg_escape($captainName) . ")\n"
               . "• Sân {$pitchType} người | Trình độ: <b>" . tg_escape($skillLevel) . "</b>\n"
               . "• Ngày đá: <b>" . date('d/m/Y', strtotime($matchDate)) . "</b> (" . tg_escape($slotTime) . ")\n"
               . "• Thể lệ tiền sân: <b>" . tg_escape($feeMode) . "</b>\n"
               . "• SĐT liên hệ: <code>" . tg_escape($phone) . "</code>";
        send_telegram_notification($tgMsg, 'matchmaking', $pdo);

        $msg = $requireApproval
            ? 'Đã gửi bài tìm đối thành công! Bài đăng đang chờ Quản trị viên duyệt trước khi hiển thị công khai.'
            : 'Đăng tìm đối thủ thành công! Chúc đội của bạn tìm được đối tác ưng ý.';

        json_response([
            'success'   => true,
            'message'   => $msg,
            'post_code' => $postCode,
            'status'    => $initialStatus,
            'data'      => [
                'post_code' => $postCode,
                'status'    => $initialStatus
            ]
        ], 201);
    }

    if ($action === 'join_match') {
        $currentUser = get_authenticated_user($pdo);
        if (!$currentUser) {
            json_error('Vui lòng đăng nhập tài khoản để nhận kèo và kết nối với đối thủ.', 401, 'ERR_UNAUTHORIZED');
        }
        if (!check_rate_limit($pdo, 'matchmaking_join', 5, 300)) {
            json_error('Bạn thao tác bắt kèo quá nhanh. Vui lòng thử lại sau ít phút.', 429, 'ERR_RATE_LIMITED');
        }
        increment_rate_limit($pdo, 'matchmaking_join');

        $postCode        = strtoupper(sanitize_string($body['post_code'] ?? '', 40));
        $opponentTeam    = sanitize_string($body['opponent_team'] ?? '', 100);
        $opponentCaptain = sanitize_string($body['opponent_captain'] ?? '', 100);
        $opponentPhone   = normalize_phone(sanitize_string($body['opponent_phone'] ?? '', 25));

        if ($postCode === '' || $opponentTeam === '' || $opponentCaptain === '' || $opponentPhone === '') {
            json_error('Vui lòng cung cấp đầy đủ thông tin đội bắt kèo.', 400, 'ERR_MISSING_PARAMS');
        }
        if (!preg_match('/^0[0-9]{9,10}$/', $opponentPhone)) {
            json_error('Số điện thoại đội bắt kèo không hợp lệ (cần 10-11 chữ số).', 400, 'ERR_INVALID_PHONE');
        }
        if (is_phone_blacklisted($pdo, $opponentPhone)) {
            json_error('Số điện thoại này hiện đang bị hạn chế do vi phạm chính sách sân.', 403, 'ERR_BLACKLISTED');
        }

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("SELECT * FROM matchmaking_posts WHERE post_code = ? FOR UPDATE");
            $stmt->execute([$postCode]);
            $post = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$post) {
                $pdo->rollBack();
                json_error('Không tìm thấy bài ghép kèo.', 404, 'ERR_NOT_FOUND');
            }
            if ($post['status'] !== 'open') {
                $pdo->rollBack();
                json_error('Kèo này đã có đội khác nhận, đang chờ duyệt hoặc đã đóng.', 409, 'ERR_MATCH_NOT_OPEN');
            }
            if (normalize_phone($post['phone'] ?? '') === $opponentPhone) {
                $pdo->rollBack();
                json_error('Bạn không thể tự bắt kèo bằng chính số điện thoại chủ kèo.', 400, 'ERR_SELF_MATCH');
            }

            $updateStmt = $pdo->prepare("
                UPDATE matchmaking_posts
                SET status = 'matched',
                    opponent_team = ?,
                    opponent_captain = ?,
                    opponent_phone = ?
                WHERE post_code = ? AND status = 'open'
            ");
            $updateStmt->execute([$opponentTeam, $opponentCaptain, $opponentPhone, $postCode]);
            $pdo->commit();
        } catch (Exception $txEx) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $txEx;
        }

        $tgMsg = "🤝 <b>GHÉP KÈO THÀNH CÔNG!</b>\n"
               . "• Kèo: <code>" . tg_escape($postCode) . "</code>\n"
               . "• Trận đấu: <b>" . tg_escape($post['team_name']) . "</b> vs <b>" . tg_escape($opponentTeam) . "</b>\n"
               . "• Thời gian: <b>" . date('d/m/Y', strtotime($post['match_date'])) . " (" . tg_escape($post['slot_time']) . ")</b>\n"
               . "• Liên hệ 2 đội: <code>" . tg_escape($post['phone']) . "</code> - <code>" . tg_escape($opponentPhone) . "</code>";
        send_telegram_notification($tgMsg, 'matchmaking', $pdo);

        send_customer_notification($pdo, 'matchmaking_matched', [
            'booking_code'  => $postCode,
            'customer_name' => $post['captain_name'],
            'phone'         => $post['phone'],
            'pitch_name'    => "Sân {$post['pitch_type']} người",
            'date'          => date('d/m/Y', strtotime($post['match_date'])),
            'slot_time'     => $post['slot_time'],
            'custom_title'  => "Kèo #{$postCode} đã có đối bắt kèo!",
            'custom_content'=> "Đội {$opponentTeam} (Đội trưởng {$opponentCaptain}, SĐT {$opponentPhone}) vừa nhận kèo #{$postCode} ngày " . date('d/m/Y', strtotime($post['match_date'])) . " ({$post['slot_time']})."
        ]);

        json_response([
            'success'    => true,
            'message'    => "Bắt kèo thành công! Liên hệ đội trưởng {$post['captain_name']}: {$post['phone']}.",
            'host_phone' => $post['phone'],
            'data'       => [
                'post_code'        => $postCode,
                'host_team'        => $post['team_name'],
                'host_captain'     => $post['captain_name'],
                'host_phone'       => $post['phone'],
                'opponent_team'    => $opponentTeam,
                'opponent_captain' => $opponentCaptain
            ]
        ]);
    }

    if ($action === 'cancel_match') {
        $currentUser = get_authenticated_user($pdo);
        if (!$currentUser) {
            json_error('Vui lòng đăng nhập để thực hiện thao tác này.', 401, 'ERR_UNAUTHORIZED');
        }

        if (!verify_csrf_token($body)) {
            json_error('Mã bảo mật CSRF không hợp lệ hoặc đã hết hạn.', 403, 'ERR_CSRF_INVALID');
        }

        $postId = (int)($_POST['post_id'] ?? $body['post_id'] ?? 0);
        if ($postId <= 0) {
            json_error('ID bài đăng không hợp lệ.', 400, 'ERR_INVALID_PARAMS');
        }

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("SELECT * FROM matchmaking_posts WHERE id = ? FOR UPDATE");
            $stmt->execute([$postId]);
            $post = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$post) {
                $pdo->rollBack();
                json_error('Không tìm thấy bài đăng tìm đối.', 404, 'ERR_NOT_FOUND');
            }

            $isOwner = ((int)($post['user_id'] ?? 0) === (int)$currentUser['id']);
            $isOperator = function_exists('is_portal_operator') && is_portal_operator($currentUser);

            if (!$isOwner && !$isOperator) {
                $pdo->rollBack();
                json_error('Bạn không có quyền hủy bài đăng này.', 403, 'ERR_FORBIDDEN');
            }

            if (!in_array($post['status'], ['open', 'pending'], true)) {
                $pdo->rollBack();
                json_error('Chỉ có thể hủy bài đăng khi đang ở trạng thái mở hoặc chờ duyệt.', 400, 'ERR_CANNOT_CANCEL');
            }

            $updateStmt = $pdo->prepare("UPDATE matchmaking_posts SET status = 'closed', updated_at = NOW() WHERE id = ?");
            $updateStmt->execute([$postId]);

            $pdo->commit();
        } catch (Exception $txEx) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $txEx;
        }

        if (function_exists('write_audit_log')) {
            write_audit_log($pdo, 'matchmaking_cancel', $post['post_code'] ?? (string)$postId, $post['status'], 'closed', $currentUser['username'] ?? 'user');
        }

        json_response([
            'success' => true,
            'message' => 'Đã hủy bài đăng tìm đối thành công.'
        ]);
    }

    json_error('Hành động không hợp lệ.', 400, 'ERR_INVALID_ACTION');
}

json_error('Phương thức không được hỗ trợ.', 405, 'ERR_METHOD_NOT_ALLOWED');
