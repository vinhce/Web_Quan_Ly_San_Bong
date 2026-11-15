<?php
declare(strict_types=1);

if (!defined('SANBONG_ADMIN_ROUTER')) {
    http_response_code(403);
    exit;
}

function handle_admin_system_ops(string $action, string $method, PDO $pdo, array $data, array $actor): bool {
    // 6.1 Nhật ký thông báo
    if ($action === 'notification_logs') {
        $mgr = require_manager_or_admin($pdo);
        $channel = sanitize_string($_GET['channel'] ?? 'all', 20);
        $status = sanitize_string($_GET['status'] ?? 'all', 20);
        $search = sanitize_string($_GET['search'] ?? '', 80);
        $limit = max(10, min(300, (int)($_GET['limit'] ?? 100)));

        $where = ["1=1"];
        $params = [];
        if ($channel !== 'all' && in_array($channel, ['telegram', 'zalo', 'sms', 'system'], true)) {
            $where[] = "channel = ?";
            $params[] = $channel;
        }
        if ($status !== 'all' && in_array($status, ['sent', 'failed', 'pending'], true)) {
            $where[] = "status = ?";
            $params[] = $status;
        }
        if ($search !== '') {
            $where[] = "(booking_code LIKE ? OR recipient LIKE ? OR title LIKE ? OR content LIKE ?)";
            $like = '%' . $search . '%';
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
        }

        $stmt = $pdo->prepare("SELECT * FROM notification_logs WHERE " . implode(' AND ', $where) . " ORDER BY id DESC LIMIT {$limit}");
        $stmt->execute($params);
        $logs = $stmt->fetchAll();

        $sumStmt = $pdo->query("SELECT SUM(status='sent') AS sent_cnt, SUM(status='failed') AS failed_cnt FROM notification_logs");
        $sumRow = $sumStmt ? $sumStmt->fetch() : [];

        json_response([
            'success' => true,
            'data'    => [
                'logs'    => $logs,
                'summary' => [
                    'sent'   => (int)($sumRow['sent_cnt'] ?? 0),
                    'failed' => (int)($sumRow['failed_cnt'] ?? 0)
                ]
            ]
        ]);
        return true;
    }

    // 6.2 Kiểm tra Telegram
    if ($action === 'test_telegram') {
        $admin = require_admin($pdo);
        $testMsg = "✅ <b>KIỂM TRA KẾT NỐI TELEGRAM SÂN BÓNG PRO</b>\n"
                 . "• Người thử: <b>" . htmlspecialchars((string)($admin['full_name'] ?? 'Admin'), ENT_QUOTES, 'UTF-8') . "</b>\n"
                 . "• Thời gian: <code>" . date('d/m/Y H:i:s') . "</code>\n"
                 . "• Trạng thái: Hệ thống cảnh báo chủ sân đang hoạt động bình thường.";
        $res = send_telegram_notification_detailed($testMsg, null, $pdo, true);
        if (!empty($res['sent'])) {
            write_audit_log($pdo, 'TELEGRAM_TEST', null, null, 'Gửi tin nhắn thử Telegram thành công', $admin);
            json_response(['success' => true, 'message' => 'Đã gửi tin nhắn kiểm tra tới Telegram Chủ sân thành công!', 'data' => $res]);
        }
        $errReason = ($res['reason'] ?? '') === 'missing_credentials'
            ? 'Chưa cấu hình Telegram Bot Token hoặc Chat ID.'
            : ('Không thể gửi tin nhắn Telegram (' . ($res['reason'] ?? 'Lỗi kết nối') . ').');
        json_response(['success' => false, 'message' => $errReason, 'data' => $res], 400);
        return true;
    }

    // 6.1 Chạy nhắc lịch thủ công
    if ($action === 'run_match_reminders') {
        $admin = require_admin($pdo);
        $res = check_and_send_match_reminders($pdo);
        $initiator = sanitize_string((string)($admin['full_name'] ?? $admin['username'] ?? 'Admin') . ' (#' . (int)($admin['id'] ?? 0) . ')', 120);
        $systemActor = ['id' => null, 'username' => 'Hệ thống (tự động)', 'role' => 'system'];
        write_audit_log(
            $pdo,
            'RUN_REMINDERS',
            null,
            null,
            'Chạy nhắc lịch trận đấu: ' . (int)($res['reminded_count'] ?? 0) . ' tin; khởi chạy bởi: ' . $initiator,
            $systemActor
        );
        json_response([
            'success' => true,
            'message' => 'Đã kiểm tra & gửi ' . (int)($res['reminded_count'] ?? 0) . ' thông báo nhắc lịch trước trận.',
            'data'    => $res
        ]);
        return true;
    }

    // 5.2 Chạy sinh lịch lặp thủ công
    if ($action === 'run_recurring_cron') {
        $admin = require_admin($pdo);
        $res = generate_recurring_bookings_window($pdo, null, 4, $admin);
        write_audit_log($pdo, 'RUN_RECURRING_GEN', null, null, "Sinh lịch lặp: +{$res['generated_count']} buổi", $admin);
        json_response([
            'success' => true,
            'message' => "Đã đồng bộ lịch cố định 4 tuần: tạo thêm {$res['generated_count']} buổi.",
            'data'    => $res
        ]);
        return true;
    }

    // 5.5 Ghép kèo: Danh sách & Kiểm duyệt
    if ($action === 'get_matchmaking_admin') {
        $mgr = require_manager_or_admin($pdo);
        $status = sanitize_string($_GET['status'] ?? 'all', 20);
        $where = ["1=1"];
        $params = [];
        if ($status !== 'all' && in_array($status, ['pending', 'open', 'matched', 'closed', 'rejected'], true)) {
            $where[] = "m.status = ?";
            $params[] = $status;
        }
        $stmt = $pdo->prepare("
            SELECT m.*, p.name AS pitch_name
            FROM matchmaking_posts m
            LEFT JOIN pitches p ON m.pitch_id = p.id
            WHERE " . implode(' AND ', $where) . "
            ORDER BY FIELD(m.status, 'pending', 'open', 'matched', 'closed', 'rejected'), m.match_date ASC, m.id DESC
            LIMIT 200
        ");
        $stmt->execute($params);
        json_response(['success' => true, 'data' => $stmt->fetchAll()]);
        return true;
    }

    if ($action === 'moderate_matchmaking') {
        $mgr = require_manager_or_admin($pdo);
        $postCode = strtoupper(sanitize_string($data['post_code'] ?? $data['postCode'] ?? '', 40));
        $decision = sanitize_string($data['decision'] ?? $data['sub_action'] ?? '', 20);
        if ($postCode === '' || !in_array($decision, ['approve', 'reject', 'close', 'open'], true)) {
            json_error('Thiếu mã tin hoặc quyết định không hợp lệ.', 400, 'ERR_INVALID_PARAMS');
        }

        $mStmt = $pdo->prepare("SELECT * FROM matchmaking_posts WHERE post_code = ? LIMIT 1");
        $mStmt->execute([$postCode]);
        $post = $mStmt->fetch();
        if (!$post) {
            json_error('Không tìm thấy tin tìm đối tương ứng.', 404, 'ERR_NOT_FOUND');
        }

        $targetStatus = ($decision === 'approve' || $decision === 'open') ? 'open' : ($decision === 'reject' ? 'rejected' : 'closed');
        $pdo->prepare("UPDATE matchmaking_posts SET status = ? WHERE id = ?")->execute([$targetStatus, (int)$post['id']]);
        write_audit_log($pdo, 'MATCHMAKING_MODERATE', $postCode, $post['status'], "Chuyển {$targetStatus} (Đội {$post['team_name']})", $mgr);

        json_response([
            'success' => true,
            'message' => $targetStatus === 'open' ? "Đã duyệt tin {$postCode}." : "Đã cập nhật tin {$postCode} thành {$targetStatus}.",
            'data'    => ['post_code' => $postCode, 'status' => $targetStatus]
        ]);
        return true;
    }

    // 6.5 Sao lưu DB
    if ($action === 'backup_database_now') {
        $admin = require_admin($pdo);
        if (!defined('SANBONG_CRON_LIB_ONLY')) define('SANBONG_CRON_LIB_ONLY', true);
        require_once __DIR__ . '/../../cron/backup_database.php';

        $customBackupDir = trim(getenv('BACKUP_DIR') ?: ($_ENV['BACKUP_DIR'] ?? ''));
        $backupDir = ($customBackupDir !== '' && (is_dir($customBackupDir) || @mkdir($customBackupDir, 0750, true))) ? rtrim($customBackupDir, '/\\') : (__DIR__ . '/../../backups');
        $ext = function_exists('gzopen') ? '.sql.gz' : '.sql';
        $filename = 'backup_sanbong_' . date('Ymd_His') . $ext;
        $targetPath = $backupDir . '/' . $filename;

        $res = generate_database_dump($pdo, $targetPath);
        if (empty($res['success'])) {
            json_error($res['message'] ?? 'Không thể tạo bản sao lưu DB.', 500, 'ERR_BACKUP_FAILED');
        }

        write_audit_log($pdo, 'DB_BACKUP', null, null, "Tạo bản sao lưu DB: {$res['filename']}", $admin);
        json_response([
            'success' => true,
            'message' => "Tạo bản sao lưu thành công ({$res['filename']})!",
            'data'    => $res
        ]);
        return true;
    }

    if ($action === 'list_backups') {
        $admin = require_admin($pdo);
        $customBackupDir = trim(getenv('BACKUP_DIR') ?: ($_ENV['BACKUP_DIR'] ?? ''));
        $backupDir = ($customBackupDir !== '' && is_dir($customBackupDir)) ? rtrim($customBackupDir, '/\\') : (__DIR__ . '/../../backups');
        $files = array_merge(
            glob($backupDir . '/*.sql.gz') ?: [],
            glob($backupDir . '/*.sql') ?: [],
            glob($backupDir . '/*.sql.gz.enc') ?: [],
            glob($backupDir . '/*.sql.enc') ?: []
        );
        $backups = [];
        foreach ($files as $f) {
            $size = @filesize($f) ?: 0;
            $mtime = @filemtime($f) ?: time();
            $backups[] = [
                'filename'   => basename($f),
                'size'       => $size,
                'size_kb'    => round($size / 1024, 1),
                'compressed' => (substr(basename($f), -3) === '.gz' || strpos(basename($f), '.gz.') !== false),
                'created_at' => date('Y-m-d H:i:s', $mtime)
            ];
        }
        usort($backups, static function ($a, $b) {
            return strcmp($b['created_at'], $a['created_at']);
        });
        json_response(['success' => true, 'data' => $backups]);
        return true;
    }

    if ($action === 'download_backup') {
        $admin = require_admin($pdo);
        $reqFile = basename((string)($_GET['file'] ?? $_GET['filename'] ?? ''));
        if ($reqFile === '' || !preg_match('/^backup_sanbong_[A-Za-z0-9_.-]+\.(sql|sql\.gz|sql\.enc|sql\.gz\.enc)$/', $reqFile)) {
            json_error('Tên file không hợp lệ.', 400, 'ERR_INVALID_FILENAME');
        }
        $customBackupDir = trim(getenv('BACKUP_DIR') ?: ($_ENV['BACKUP_DIR'] ?? ''));
        $baseDir = ($customBackupDir !== '' && is_dir($customBackupDir)) ? rtrim($customBackupDir, '/\\') : (__DIR__ . '/../../backups');
        $backupDir = realpath($baseDir);
        $targetReal = $backupDir ? realpath($backupDir . DIRECTORY_SEPARATOR . $reqFile) : false;
        if (!$backupDir || !$targetReal || strpos($targetReal, $backupDir . DIRECTORY_SEPARATOR) !== 0 || !is_file($targetReal)) {
            json_error('Không tìm thấy tệp sao lưu.', 404, 'ERR_FILE_NOT_FOUND');
        }

        write_audit_log($pdo, 'DB_BACKUP_DOWNLOAD', null, null, "Tải bản sao lưu: {$reqFile}", $admin);
        $isGz = (substr($reqFile, -3) === '.gz' || strpos($reqFile, '.gz.') !== false);
        header('Content-Type: ' . ($isGz ? 'application/gzip' : 'application/octet-stream'));
        header('Content-Disposition: attachment; filename="' . $reqFile . '"');
        header('Content-Length: ' . filesize($targetReal));
        header('X-Content-Type-Options: nosniff');
        readfile($targetReal);
        exit;
    }

    return false;
}
