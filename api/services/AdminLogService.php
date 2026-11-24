<?php
declare(strict_types=1);

require_once __DIR__ . '/../security_helper.php';
require_once __DIR__ . '/AdminLogRegistry.php';
require_once __DIR__ . '/AdminLogRepository.php';

/**
 * AdminLogService - Quản lý và định dạng nhật ký thao tác quản trị (Audit Logs)
 * Hệ thống: Quản Lý Sân Bóng Pro
 *
 * Tính năng chính:
 * 1. record(): Ghi nhận log thay đổi dữ liệu theo chuẩn diff JSON, lọc bỏ triệt để dữ liệu nhạy cảm.
 * 2. formatLogMessage(): Sinh thông điệp thân thiện, dễ đọc theo thời gian thực cho Admin xem.
 */
class AdminLogService
{
    /**
     * Danh sách các khóa chứa thông tin nhạy cảm tuyệt đối không được ghi log
     */
    private const SENSITIVE_FIELDS = [
        'password',
        'password_hash',
        'totp_secret',
        'totp_enabled',
        'token',
        'secret',
        'csrf_token',
        'api_key',
        'auth_token',
        'access_token',
        'refresh_token',
        'reset_token',
        'remember_token',
        'must_change_password'
    ];

    /**
     * Ghi một bản ghi nhật ký quản trị vào bảng audit_logs
     *
     * @param PDO         $pdo         Kết nối PDO hiện tại (hoạt động trong cùng transaction của caller)
     * @param int         $adminId     ID của người dùng quản trị thao tác
     * @param string      $action      Mã hành động (vd: USER_EDIT, ADJUST_POINTS, UPDATE_SETTINGS)
     * @param string      $targetType  Loại đối tượng (vd: user, customer, booking, pitch, service, voucher, settings)
     * @param string      $targetId    Mã định danh đối tượng (vd: SĐT 0912345678, user_id, booking code)
     * @param mixed       $oldValue    Giá trị trước khi thay đổi (array, string, hoặc null)
     * @param mixed       $newValue    Giá trị sau khi thay đổi (array, string, hoặc null)
     * @param string|null $ip          Địa chỉ IP của client (null sẽ tự động lấy an toàn)
     * @return int ID của bản ghi audit_logs, hoặc 0 nếu không còn trường thay đổi
     */
    public static function record(
        PDO $pdo,
        int $adminId,
        string $action,
        string $targetType,
        string $targetId,
        $oldValue,
        $newValue,
        ?string $ip = null
    ): int {
        // 1. Xác định tên và vai trò của admin thao tác
        $actorName = null;
        $actorRole = null;

        if (session_status() === PHP_SESSION_ACTIVE && !empty($_SESSION['user']['id']) && (int)$_SESSION['user']['id'] === $adminId) {
            $actorName = !empty($_SESSION['user']['full_name'])
                ? (string)$_SESSION['user']['full_name']
                : (string)($_SESSION['user']['username'] ?? '');
            $actorRole = (string)($_SESSION['user']['role'] ?? 'admin');
        }

        if (empty($actorName)) {
            if ($adminId > 0) {
                $uStmt = $pdo->prepare("SELECT id, username, full_name, role FROM users WHERE id = ? LIMIT 1");
                $uStmt->execute([$adminId]);
                $uRow = $uStmt->fetch(PDO::FETCH_ASSOC);
                if ($uRow) {
                    $actorName = !empty($uRow['full_name']) ? (string)$uRow['full_name'] : (string)$uRow['username'];
                    $actorRole = (string)($uRow['role'] ?? 'admin');
                } else {
                    $actorName = 'Admin #' . $adminId;
                    $actorRole = 'admin';
                }
            } else {
                $actorName = 'Hệ thống';
                $actorRole = 'system';
            }
        }

        // 2. Xác định địa chỉ IP an toàn
        if ($ip === null || trim($ip) === '') {
            if (function_exists('get_client_ip')) {
                $ip = get_client_ip();
            } else {
                $rawIp = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
                $ip = filter_var($rawIp, FILTER_VALIDATE_IP) ? $rawIp : '127.0.0.1';
            }
        }

        // 3. Thời gian ghi log theo múi giờ Việt Nam
        $dt = new DateTime('now', new DateTimeZone('Asia/Ho_Chi_Minh'));
        $createdAt = $dt->format('Y-m-d H:i:s');

        // 4. Lọc Diff và loại bỏ/che trường nhạy cảm
        [$filteredOld, $filteredNew] = self::processDiffAndMask($oldValue, $newValue);
        if (is_array($filteredOld) && $filteredOld === [] && is_array($filteredNew) && $filteredNew === []) {
            return 0;
        }

        $oldJson = ($filteredOld !== null)
            ? json_encode($filteredOld, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
            : null;
        $newJson = ($filteredNew !== null)
            ? json_encode($filteredNew, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
            : null;

        // 5. Xác định booking_id nếu targetType là booking hoặc targetId dạng BK-
        $bookingId = null;
        $cleanTargetType = strtolower(trim($targetType));
        $cleanTargetId = trim($targetId);
        if (in_array($cleanTargetType, ['booking', 'bookings'], true) || preg_match('/^BK-[A-Z0-9\-]+$/i', $cleanTargetId)) {
            $bookingId = substr($cleanTargetId, 0, 40);
        }

        $cleanAction = sanitize_string($action, 80);
        $resolvedTargetType = $cleanTargetType !== '' ? substr($cleanTargetType, 0, 50) : null;
        $resolvedTargetId = $cleanTargetId !== '' ? substr($cleanTargetId, 0, 50) : null;
        $resolvedIp = substr($ip, 0, 45);

        if (function_exists('db_table_has_column') && db_table_has_column($pdo, 'audit_logs', 'category')) {
            require_once __DIR__ . '/AdminLogRegistry.php';
            $metaData = AdminLogRegistry::prepareMetadataForInsert($pdo, [
                'action'      => $cleanAction,
                'actor_role'  => $actorRole,
                'target_type' => $resolvedTargetType,
                'target_id'   => $resolvedTargetId,
                'booking_id'  => $bookingId,
                'old_value'   => $oldJson,
                'new_value'   => $newJson,
                'created_at'  => $createdAt,
            ]);
            $stmt = $pdo->prepare("
                INSERT INTO audit_logs (
                    user_id, actor_name, actor_role, action, category, data_group, target_type, target_id, object_code, booking_id, old_value, new_value, is_anomaly, anomaly_reasons, ip, created_at
                ) VALUES (
                    :user_id, :actor_name, :actor_role, :action, :category, :data_group, :target_type, :target_id, :object_code, :booking_id, :old_value, :new_value, :is_anomaly, :anomaly_reasons, :ip, :created_at
                )
            ");
            $stmt->execute([
                ':user_id'         => $adminId > 0 ? $adminId : null,
                ':actor_name'      => $actorName,
                ':actor_role'      => $actorRole,
                ':action'          => $cleanAction,
                ':category'        => $metaData['category'],
                ':data_group'      => $metaData['data_group'],
                ':target_type'     => $resolvedTargetType,
                ':target_id'       => $resolvedTargetId,
                ':object_code'     => $metaData['object_code'],
                ':booking_id'      => $bookingId,
                ':old_value'       => $oldJson,
                ':new_value'       => $newJson,
                ':is_anomaly'      => $metaData['is_anomaly'],
                ':anomaly_reasons' => $metaData['anomaly_reasons'],
                ':ip'              => $resolvedIp,
                ':created_at'      => $createdAt
            ]);
            return (int)$pdo->lastInsertId();
        }

        // 6. Chèn vào DB trong CÙNG transaction với thao tác nghiệp vụ
        $stmt = $pdo->prepare("
            INSERT INTO audit_logs (
                user_id, actor_name, actor_role, action, target_type, target_id, booking_id, old_value, new_value, ip, created_at
            ) VALUES (
                :user_id, :actor_name, :actor_role, :action, :target_type, :target_id, :booking_id, :old_value, :new_value, :ip, :created_at
            )
        ");

        $stmt->execute([
            ':user_id'     => $adminId > 0 ? $adminId : null,
            ':actor_name'  => $actorName,
            ':actor_role'  => $actorRole,
            ':action'      => $cleanAction,
            ':target_type' => $resolvedTargetType,
            ':target_id'   => $resolvedTargetId,
            ':booking_id'  => $bookingId,
            ':old_value'   => $oldJson,
            ':new_value'   => $newJson,
            ':ip'          => $resolvedIp,
            ':created_at'  => $createdAt
        ]);

        return (int)$pdo->lastInsertId();
    }

    /**
     * Sinh chuỗi văn bản thân thiện, đọc được ngay từ bản ghi log
     *
     * @param array $log Bản ghi từ bảng audit_logs
     * @return string Chuỗi mô tả thao tác
     */
    public static function formatLogMessage(array $log): string
    {
        $role = ucfirst((string)($log['actor_role'] ?? 'Admin'));
        $rawName = trim((string)($log['actor_name'] ?? ''));
        if ($rawName === '') {
            $actorName = $role . ' #' . ($log['user_id'] ?? '0');
        } elseif ($role !== '' && stripos($rawName, $role) !== 0) {
            $actorName = $role . ' ' . $rawName;
        } else {
            $actorName = $rawName;
        }

        $timeStr = '';
        if (!empty($log['created_at'])) {
            $ts = strtotime((string)$log['created_at']);
            if ($ts !== false) {
                $timeStr = date('d/m/Y H:i', $ts);
            }
        }
        $timeSuffix = $timeStr !== '' ? ' — ' . $timeStr : '';

        $targetType = strtolower(trim((string)($log['target_type'] ?? '')));
        $targetId = trim((string)($log['target_id'] ?? ''));
        $bookingId = trim((string)($log['booking_id'] ?? ''));
        if ($targetId === '' && $bookingId !== '') {
            $targetId = $bookingId;
        }

        // Định dạng SĐT nếu targetId là SĐT hội viên (vd: 0912xxx678)
        $targetDisplay = $targetId;
        if (preg_match('/^[0-9]{9,12}$/', $targetId)) {
            $targetDisplay = self::maskPhoneForDisplay($targetId);
        }

        // Định dạng danh từ đối tượng
        $targetNoun = $targetDisplay;
        if (in_array($targetType, ['user', 'customer', 'member'], true) || ($targetType === '' && preg_match('/^[0-9]{9,12}$/', $targetId))) {
            $targetNoun = 'hội viên ' . $targetDisplay;
        } elseif ($targetType === 'booking' || $bookingId !== '') {
            $targetNoun = 'đơn ' . ($bookingId ?: $targetDisplay);
        } elseif ($targetType === 'pitch') {
            $targetNoun = 'sân ' . $targetDisplay;
        } elseif ($targetType === 'service') {
            $targetNoun = 'dịch vụ ' . $targetDisplay;
        } elseif ($targetType === 'voucher') {
            $targetNoun = 'voucher ' . $targetDisplay;
        } elseif ($targetType === 'staff') {
            $targetNoun = 'nhân viên ' . $targetDisplay;
        }

        $action = strtoupper(trim((string)($log['action'] ?? '')));
        $oldRaw = $log['old_value'] ?? null;
        $newRaw = $log['new_value'] ?? null;

        $oldVal = self::decodeJsonOrRaw($oldRaw);
        $newVal = self::decodeJsonOrRaw($newRaw);

        // 1. Trường hợp: Điều chỉnh điểm hội viên
        $esc = static function($v): string {
            return htmlspecialchars(strip_tags((string)$v), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        };
        $actorName = $esc($actorName);
        $targetNoun = $esc($targetNoun);

        if (in_array($action, ['ADJUST_POINTS', 'POINT_ADJUST', 'POINTS_ADJUST', 'ADJUST_POINT', 'UPDATE_POINTS'], true) || $targetType === 'points') {
            $oldPts = is_array($oldVal) ? ($oldVal['points'] ?? reset($oldVal)) : $oldVal;
            $newPts = null;
            $reason = '';

            if (is_array($newVal)) {
                $newPts = $newVal['points'] ?? reset($newVal);
                $reason = (string)($newVal['reason'] ?? $newVal['note'] ?? '');
            } else {
                $newPts = $newVal;
                if (is_string($newPts)) {
                    $newPts = trim($newPts, "\"'\t\n\r ");
                    if (preg_match('/^(.*?)\s*\(lý do:\s*(.*?)\)$/ui', $newPts, $m)) {
                        $newPts = trim($m[1]);
                        $reason = trim($m[2]);
                    }
                }
            }

            if (is_string($oldPts)) {
                $oldPts = trim($oldPts, "\"'\t\n\r ");
            }

            $reasonStr = ($reason !== '') ? " (lý do: " . $esc($reason) . ")" : '';
            return "{$actorName} điều chỉnh điểm {$targetNoun}: " . $esc($oldPts) . " → " . $esc($newPts) . "{$reasonStr}{$timeSuffix}";
        }

        // 2. Trường hợp: Sửa thông tin hội viên / người dùng
        if (in_array($action, ['UPDATE_MEMBER', 'USER_EDIT', 'CUSTOMER_EDIT', 'MEMBER_EDIT', 'UPDATE_USER', 'UPDATE_CUSTOMER', 'CRM_UPDATE'], true)
            || in_array($targetType, ['user', 'customer', 'member'], true)) {

            if (is_array($oldVal) && is_array($newVal)) {
                $keys = array_unique(array_merge(array_keys($oldVal), array_keys($newVal)));
                if (count($keys) === 1) {
                    $k = reset($keys);
                    $o = $oldVal[$k] ?? '';
                    $n = $newVal[$k] ?? '';

                    if ($k === 'full_name' || $k === 'customer_name') {
                        return "{$actorName} sửa họ tên {$targetNoun}: '" . $esc($o) . "' → '" . $esc($n) . "'{$timeSuffix}";
                    }
                    if ($k === 'phone') {
                        $oP = self::maskPhoneForDisplay((string)$o);
                        $nP = self::maskPhoneForDisplay((string)$n);
                        return "{$actorName} sửa SĐT {$targetNoun}: '" . $esc($oP) . "' → '" . $esc($nP) . "'{$timeSuffix}";
                    }
                    if ($k === 'email') {
                        return "{$actorName} sửa email {$targetNoun}: '" . $esc($o) . "' → '" . $esc($n) . "'{$timeSuffix}";
                    }
                    if ($k === 'customer_tier' || $k === 'tier') {
                        return "{$actorName} đổi phân hạng {$targetNoun}: '" . $esc($o) . "' → '" . $esc($n) . "'{$timeSuffix}";
                    }
                    if ($k === 'admin_note') {
                        return "{$actorName} cập nhật ghi chú {$targetNoun}: '" . $esc($o) . "' → '" . $esc($n) . "'{$timeSuffix}";
                    }
                    if ($k === 'status') {
                        return "{$actorName} đổi trạng thái {$targetNoun}: '" . $esc($o) . "' → '" . $esc($n) . "'{$timeSuffix}";
                    }
                    if ($k === 'is_blacklisted') {
                        $oB = !empty($o) ? 'Chặn' : 'Bình thường';
                        $nB = !empty($n) ? 'Chặn' : 'Bình thường';
                        return "{$actorName} đổi trạng thái blacklist {$targetNoun}: '{$oB}' → '{$nB}'{$timeSuffix}";
                    }
                }

                $fieldLabels = [
                    'full_name'      => 'họ tên',
                    'customer_name'  => 'họ tên',
                    'phone'          => 'SĐT',
                    'email'          => 'email',
                    'status'         => 'trạng thái',
                    'customer_tier'  => 'hạng',
                    'tier'           => 'hạng',
                    'admin_note'     => 'ghi chú',
                    'points'         => 'điểm',
                    'points_reason'  => 'lý do điểm',
                    'is_blacklisted' => 'chặn'
                ];
                $changes = [];
                foreach ($newVal as $k => $nV) {
                    $oV = $oldVal[$k] ?? '';
                    $label = $fieldLabels[$k] ?? $k;
                    $oStr = is_scalar($oV) ? (string)$oV : json_encode($oV, JSON_UNESCAPED_UNICODE);
                    $nStr = is_scalar($nV) ? (string)$nV : json_encode($nV, JSON_UNESCAPED_UNICODE);
                    if ($k === 'phone') {
                        $oStr = self::maskPhoneForDisplay($oStr);
                        $nStr = self::maskPhoneForDisplay($nStr);
                    }
                    $changes[] = "{$label}: '" . $esc($oStr) . "' → '" . $esc($nStr) . "'";
                }
                if (!empty($changes)) {
                    return "{$actorName} sửa thông tin {$targetNoun}: " . implode(', ', $changes) . $timeSuffix;
                }
            } elseif (is_string($newVal) && $newVal !== '') {
                if (is_string($oldVal) && $oldVal !== '') {
                    return "{$actorName} sửa thông tin {$targetNoun}: '{$oldVal}' → '{$newVal}'{$timeSuffix}";
                }
                return "{$actorName} cập nhật {$targetNoun}: {$newVal}{$timeSuffix}";
            }
        }

        // 3. Trường hợp: Đơn đặt sân
        if ($action === 'CANCEL_BOOKING') {
            $detail = is_string($newVal) ? $newVal : (is_string($oldVal) ? $oldVal : '');
            return "{$actorName} hủy {$targetNoun}" . ($detail !== '' ? ": {$detail}" : '') . $timeSuffix;
        }
        if ($action === 'TRANSFER_PITCH') {
            return "{$actorName} chuyển sân {$targetNoun}: '{$oldRaw}' → '{$newRaw}'{$timeSuffix}";
        }
        if ($action === 'ADD_OVERTIME') {
            return "{$actorName} thêm giờ đá {$targetNoun}: {$newRaw}{$timeSuffix}";
        }
        if ($action === 'ADD_SERVICE') {
            return "{$actorName} thêm dịch vụ {$targetNoun}: {$newRaw}{$timeSuffix}";
        }
        if ($action === 'COLLECT_PAYMENT' || $action === 'UPDATE_PAYMENT') {
            return "{$actorName} cập nhật thanh toán {$targetNoun}: {$newRaw}{$timeSuffix}";
        }
        if ($action === 'CHECKIN') {
            return "{$actorName} check-in {$targetNoun}{$timeSuffix}";
        }
        if ($action === 'WALKIN_BOOKING') {
            return "{$actorName} tạo đơn tại quầy {$targetNoun}: {$newRaw}{$timeSuffix}";
        }

        // 4. Trường hợp: Tài khoản nhân viên
        if ($action === 'STAFF_CREATE') {
            return "{$actorName} tạo tài khoản nhân viên {$targetDisplay}{$timeSuffix}";
        }
        if ($action === 'STAFF_ROLE_CHANGE') {
            return "{$actorName} đổi vai trò nhân viên {$targetDisplay}: '{$oldRaw}' → '{$newRaw}'{$timeSuffix}";
        }
        if ($action === 'STAFF_STATUS_CHANGE') {
            return "{$actorName} đổi trạng thái nhân viên {$targetDisplay}: '{$oldRaw}' → '{$newRaw}'{$timeSuffix}";
        }
        if ($action === 'STAFF_RESET_PASSWORD') {
            return "{$actorName} đặt lại mật khẩu cho {$targetDisplay}{$timeSuffix}";
        }
        if ($action === 'FORGOT_PASSWORD_REQUEST') {
            return $newRaw !== ''
                ? "{$actorName} gửi yêu cầu đặt lại mật khẩu ({$newRaw}){$timeSuffix}"
                : "{$actorName} gửi yêu cầu đặt lại mật khẩu cho {$targetDisplay}{$timeSuffix}";
        }

        // 5. Trường hợp: Cài đặt hệ thống & cấu hình
        if ($action === 'UPDATE_SETTINGS') {
            return "{$actorName} cập nhật cài đặt hệ thống{$timeSuffix}";
        }
        if ($action === 'VOUCHER_SAVE') {
            return "{$actorName} lưu voucher {$targetDisplay}: {$newRaw}{$timeSuffix}";
        }
        if ($action === 'VOUCHER_DELETE') {
            return "{$actorName} xóa voucher {$targetDisplay}{$timeSuffix}";
        }
        if ($action === 'SERVICE_UPSERT') {
            return "{$actorName} cập nhật dịch vụ {$targetDisplay}{$timeSuffix}";
        }
        if ($action === 'SERVICE_DELETE') {
            return "{$actorName} ngừng kinh doanh dịch vụ {$targetDisplay}{$timeSuffix}";
        }
        if ($action === 'PITCH_UPSERT') {
            return "{$actorName} cập nhật thông tin sân {$targetDisplay}{$timeSuffix}";
        }

        // 6. Định dạng mặc định nếu không khớp trường hợp riêng
        $actionFriendly = str_replace('_', ' ', strtolower($action));
        if ($oldRaw !== null && $newRaw !== null) {
            $oldStr = is_scalar($oldVal) ? (string)$oldVal : json_encode($oldVal, JSON_UNESCAPED_UNICODE);
            $newStr = is_scalar($newVal) ? (string)$newVal : json_encode($newVal, JSON_UNESCAPED_UNICODE);
            return "{$actorName} thực hiện {$actionFriendly} [{$targetNoun}]: '{$oldStr}' → '{$newStr}'{$timeSuffix}";
        }
        if ($newRaw !== null) {
            $newStr = is_scalar($newVal) ? (string)$newVal : json_encode($newVal, JSON_UNESCAPED_UNICODE);
            return "{$actorName} thực hiện {$actionFriendly} [{$targetNoun}]: {$newStr}{$timeSuffix}";
        }

        return "{$actorName} thực hiện {$actionFriendly} [{$targetNoun}]{$timeSuffix}";
    }

    /**
     * Che bớt số điện thoại phục vụ hiển thị thân thiện (0912xxx678)
     */
    public static function maskPhoneForDisplay(string $phone): string
    {
        $clean = preg_replace('/[^0-9]/', '', $phone);
        $len = strlen($clean);
        if ($len >= 9) {
            return substr($clean, 0, 4) . 'xxx' . substr($clean, -3);
        }
        if ($len >= 6) {
            return substr($clean, 0, 3) . 'xxx' . substr($clean, -2);
        }
        return $phone;
    }

    /**
     * So sánh diff giữa oldValue và newValue, loại bỏ trường nhạy cảm, che CCCD/STK
     *
     * @return array [mixed $filteredOld, mixed $filteredNew]
     */
    private static function processDiffAndMask($old, $new): array
    {
        // Thử parse JSON nếu là chuỗi
        $oldParsed = self::tryParseJson($old);
        $newParsed = self::tryParseJson($new);

        // Trường hợp cả hai là mảng
        if (is_array($oldParsed) && is_array($newParsed)) {
            $diffOld = [];
            $diffNew = [];
            $allKeys = array_unique(array_merge(array_keys($oldParsed), array_keys($newParsed)));

            foreach ($allKeys as $k) {
                $kStr = (string)$k;
                if (self::isSensitiveKey($kStr)) {
                    continue;
                }

                $hasOld = array_key_exists($k, $oldParsed);
                $hasNew = array_key_exists($k, $newParsed);

                $oldItem = $hasOld ? $oldParsed[$k] : null;
                $newItem = $hasNew ? $newParsed[$k] : null;

                $changed = false;
                if ($hasOld !== $hasNew) {
                    $changed = true;
                } else {
                    $changed = !audit_log_values_equal($oldItem, $newItem);
                }

                if ($changed) {
                    $diffOld[$k] = $hasOld ? self::maskSensitiveValue($kStr, $oldItem) : null;
                    $diffNew[$k] = $hasNew ? self::maskSensitiveValue($kStr, $newItem) : null;
                }
            }

            return [$diffOld, $diffNew];
        }

        // Trường hợp thêm mới (old null, new array)
        if ($oldParsed === null && is_array($newParsed)) {
            $cleanedNew = [];
            foreach ($newParsed as $k => $v) {
                $kStr = (string)$k;
                if (self::isSensitiveKey($kStr)) {
                    continue;
                }
                $cleanedNew[$k] = self::maskSensitiveValue($kStr, $v);
            }
            return [null, $cleanedNew];
        }

        // Trường hợp xóa (old array, new null)
        if (is_array($oldParsed) && $newParsed === null) {
            $cleanedOld = [];
            foreach ($oldParsed as $k => $v) {
                $kStr = (string)$k;
                if (self::isSensitiveKey($kStr)) {
                    continue;
                }
                $cleanedOld[$k] = self::maskSensitiveValue($kStr, $v);
            }
            return [$cleanedOld, null];
        }

        // Trường hợp giá trị đơn lẻ (scalar)
        if ($oldParsed !== null && $newParsed !== null && function_exists('audit_log_scalar_values_equal') && audit_log_scalar_values_equal($oldParsed, $newParsed)) {
            return [[], []];
        }
        $cleanOld = is_scalar($oldParsed) ? self::maskSensitiveValue('', $oldParsed) : $oldParsed;
        $cleanNew = is_scalar($newParsed) ? self::maskSensitiveValue('', $newParsed) : $newParsed;

        return [$cleanOld, $cleanNew];
    }

    /**
     * Kiểm tra khóa có thuộc danh sách nhạy cảm cấm lưu
     */
    private static function isSensitiveKey(string $key): bool
    {
        $lower = strtolower(trim($key));
        if (in_array($lower, self::SENSITIVE_FIELDS, true)) {
            return true;
        }
        if (strpos($lower, 'password') !== false || strpos($lower, 'totp') !== false) {
            return true;
        }
        if (strpos($lower, 'token') !== false || strpos($lower, 'secret') !== false || strpos($lower, 'api_key') !== false) {
            return true;
        }
        return false;
    }

    /**
     * Che bớt thông tin nhạy cảm định danh (CCCD, tài khoản ngân hàng)
     */
    private static function maskSensitiveValue(string $key, $value)
    {
        if (!is_string($value) && !is_numeric($value)) {
            return $value;
        }
        $str = (string)$value;
        $lowerKey = strtolower(trim($key));

        $isBankOrCccd = (
            strpos($lowerKey, 'cccd') !== false ||
            strpos($lowerKey, 'cmnd') !== false ||
            strpos($lowerKey, 'id_card') !== false ||
            strpos($lowerKey, 'identity') !== false ||
            strpos($lowerKey, 'bank_account') !== false ||
            strpos($lowerKey, 'account_no') !== false ||
            strpos($lowerKey, 'account_number') !== false ||
            strpos($lowerKey, 'so_tai_khoan') !== false
        );

        if ($isBankOrCccd) {
            $clean = trim($str);
            $len = strlen($clean);
            if ($len >= 8) {
                return substr($clean, 0, 4) . '****' . substr($clean, -4);
            }
            if ($len >= 4) {
                return substr($clean, 0, 2) . '****' . substr($clean, -2);
            }
            return '****';
        }

        return $value;
    }

    /**
     * Parse chuỗi JSON thành mảng nếu hợp lệ, ngược lại giữ nguyên
     */
    private static function tryParseJson($val)
    {
        if ($val === null || is_array($val)) {
            return $val;
        }
        if (is_string($val)) {
            $trimmed = trim($val);
            if ($trimmed !== '') {
                $first = $trimmed[0];
                if ($first === '{' || $first === '[' || $first === '"') {
                    $decoded = json_decode($trimmed, true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        return $decoded;
                    }
                }
            }
        }
        return $val;
    }

    /**
     * Giải mã JSON hoặc giữ nguyên chuỗi
     */
    private static function decodeJsonOrRaw($val)
    {
        if ($val === null) {
            return null;
        }
        if (is_array($val)) {
            return $val;
        }
        $trimmed = trim((string)$val);
        if ($trimmed !== '') {
            $first = $trimmed[0];
            if ($first === '{' || $first === '[' || $first === '"') {
                $decoded = json_decode($trimmed, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    return $decoded;
                }
            }
        }
        return $trimmed;
    }

    public static function backfillLegacyAuditMetadata(PDO $pdo): void
    {
        AdminLogRegistry::backfillMissingMetadata($pdo);
    }

    public static function enrichRow(array $log, bool $maskPii = true): array
    {
        $meta = AdminLogRegistry::resolveActionMeta((string)($log['action'] ?? ''), $log['actor_role'] ?? null);
        $category = !empty($log['category']) && isset(AdminLogRegistry::CATEGORIES[(string)$log['category']])
            ? (string)$log['category']
            : $meta['category'];
        $catInfo = AdminLogRegistry::CATEGORIES[$category] ?? AdminLogRegistry::CATEGORIES['CN'];
        $dataGroup = !empty($log['data_group']) ? (string)$log['data_group'] : $meta['data_group'];
        $objectCode = AdminLogRegistry::extractObjectCode($log);
        $objectMasked = AdminLogRegistry::maskPhonesInText($objectCode);
        $objectDisplay = $maskPii ? $objectMasked : $objectCode;
        $hasSensitivePhone = $objectMasked !== $objectCode
            || AdminLogRegistry::maskPhonesInText((string)($log['old_value'] ?? '')) !== (string)($log['old_value'] ?? '')
            || AdminLogRegistry::maskPhonesInText((string)($log['new_value'] ?? '')) !== (string)($log['new_value'] ?? '');

        $reasons = [];
        if (!empty($log['anomaly_reasons'])) {
            $decodedReasons = json_decode((string)$log['anomaly_reasons'], true);
            if (is_array($decodedReasons)) {
                $reasons = array_values(array_map('strval', $decodedReasons));
            }
        }

        $log['category'] = $category;
        $log['category_label'] = $catInfo['label'];
        $log['category_color'] = $catInfo['color'];
        $log['data_group'] = $dataGroup;
        $log['action_label'] = $meta['label'];
        $log['action_registered'] = $meta['registered'];
        $log['object_code'] = $maskPii ? $objectDisplay : $objectCode;
        $log['object_display'] = $objectDisplay;
        $log['has_sensitive_phone'] = $hasSensitivePhone;
        $log['is_anomaly'] = !empty($log['is_anomaly']) ? 1 : 0;
        $log['anomaly_reasons'] = $reasons;
        $log['diffs'] = AdminLogRegistry::extractDiffs($log, $maskPii);
        $log['created_at_formatted'] = AdminLogRegistry::formatDateTimeVn((string)($log['created_at'] ?? ''));

        if ($maskPii) {
            if (isset($log['target_id']) && $log['target_id'] !== null) {
                $log['target_id'] = AdminLogRegistry::maskPhonesInText((string)$log['target_id']);
            }
            if (isset($log['old_value']) && $log['old_value'] !== null) {
                $log['old_value'] = AdminLogRegistry::maskPhonesInText((string)$log['old_value']);
            }
            if (isset($log['new_value']) && $log['new_value'] !== null) {
                $log['new_value'] = AdminLogRegistry::maskPhonesInText((string)$log['new_value']);
            }
        }

        $formattedMsg = self::formatLogMessage($log);
        $log['formatted_message'] = $maskPii ? AdminLogRegistry::maskPhonesInText($formattedMsg) : $formattedMsg;

        $rawTargetType = strtolower(trim((string)($log['target_type'] ?? '')));
        $rawTargetId = trim((string)($log['target_id'] ?? $log['booking_id'] ?? $objectDisplay));
        if ($rawTargetId === '') {
            $rawTargetType = 'system';
            $rawTargetId = $objectDisplay;
        }
        $log['target_type'] = $rawTargetType !== '' ? $rawTargetType : null;
        $log['target_id'] = $rawTargetId !== '' ? $rawTargetId : null;
        $targetTypeLabels = [
            'shift'            => 'Ca trực',
            'shifts'           => 'Ca trực',
            'booking'          => 'Mã ca',
            'bookings'         => 'Mã ca',
            'recurring'        => 'Mã ca',
            'waitlist'         => 'Mã ca',
            'matchmaking'      => 'Mã ca',
            'user'             => 'Hội viên',
            'users'            => 'Hội viên',
            'customer'         => 'Hội viên',
            'member'           => 'Hội viên',
            'pitch'            => 'Sân bóng',
            'pitches'          => 'Sân bóng',
            'maintenance'      => 'Sân bóng',
            'service'          => 'Dịch vụ',
            'services'         => 'Dịch vụ',
            'inventory'        => 'Dịch vụ',
            'voucher'          => 'Voucher',
            'vouchers'         => 'Voucher',
            'monthly_package'  => 'Voucher',
            'expense'          => 'Khoản chi',
            'expenses'         => 'Khoản chi',
            'bank_transaction' => 'Giao dịch',
            'pricing'          => 'Bảng giá',
            'price'            => 'Bảng giá',
            'golden_hour'      => 'Bảng giá',
            'setting'          => 'Cài đặt',
            'settings'         => 'Cài đặt',
            'staff'            => 'Nhân sự',
            'security'         => 'Bảo mật',
            'auth'             => 'Bảo mật',
            'audit_log'        => 'Nhật ký',
            'system'           => 'Hệ thống',
        ];
        $log['object_type_label'] = $targetTypeLabels[$rawTargetType] ?? ($rawTargetType !== '' ? $rawTargetType : 'Hệ thống');
        $rawActorRole = strtolower(trim((string)($log['actor_role'] ?? '')));
        $actorRoleLabels = [
            'admin'   => 'Chủ sân',
            'manager' => 'Quản lý',
            'staff'   => 'Nhân viên',
            'system'  => 'Hệ thống',
        ];
        $log['actor_role_label'] = ((int)($log['user_id'] ?? 0) === 0 || $rawActorRole === '')
            ? 'Hệ thống'
            : ($actorRoleLabels[$rawActorRole] ?? ucfirst($rawActorRole));

        if (!empty($log['review_id'])) {
            $log['review'] = [
                'id'                   => (int)$log['review_id'],
                'reviewer_id'          => (int)$log['reviewer_id'],
                'reviewer_name'        => (string)($log['reviewer_name'] ?? ''),
                'note'                 => (string)($log['review_note'] ?? ''),
                'created_at'           => (string)($log['review_created_at'] ?? ''),
                'created_at_formatted' => AdminLogRegistry::formatDateTimeVn((string)($log['review_created_at'] ?? '')),
            ];
        } else {
            $log['review'] = null;
        }
        unset($log['review_id'], $log['reviewer_id'], $log['reviewer_name'], $log['review_note'], $log['review_created_at']);

        return $log;
    }

    public static function listLogs(PDO $pdo, array $query): array
    {
        $page = max(1, (int)($query['page'] ?? 1));
        $limit = max(1, min(100, (int)($query['limit'] ?? 25)));

        $filters = [
            'admin_id'      => $query['admin_id'] ?? $query['user_id'] ?? $query['user'] ?? '',
            'categories'    => $query['categories'] ?? $query['category'] ?? '',
            'action_codes'  => $query['action_codes'] ?? '',
            'action_type'   => $query['action_type'] ?? $query['filter_action'] ?? $query['log_action'] ?? '',
            'data_group'    => $query['data_group'] ?? '',
            'from_date'     => $query['from_date'] ?? '',
            'to_date'       => $query['to_date'] ?? '',
            'date'          => $query['date'] ?? '',
            'anomaly_only'  => $query['anomaly_only'] ?? $query['is_anomaly'] ?? '',
            'review_status' => $query['review_status'] ?? '',
            'quick_filter'  => $query['quick_filter'] ?? '',
            'search'        => $query['search'] ?? '',
        ];

        $res = AdminLogRepository::fetchPaginated($pdo, $filters, $page, $limit);
        $logs = array_map(static fn(array $r): array => self::enrichRow($r, true), $res['rows']);

        return [
            'logs'        => $logs,
            'pagination'  => [
                'page'       => $page,
                'limit'      => $limit,
                'total'      => $res['total'],
                'totalPages' => $res['totalPages'],
            ],
            'staffList'   => $res['staffList'],
            'actionTypes' => $res['actionTypes'],
            'categories'  => array_values(AdminLogRegistry::CATEGORIES),
            'dataGroups'  => AdminLogRegistry::DATA_GROUPS,
            'latest_id'   => $res['latestId'],
        ];
    }

    public static function getSummary(PDO $pdo, array $query): array
    {
        $filters = [
            'admin_id'      => $query['admin_id'] ?? $query['user_id'] ?? $query['user'] ?? '',
            'categories'    => $query['categories'] ?? $query['category'] ?? '',
            'action_codes'  => $query['action_codes'] ?? '',
            'action_type'   => $query['action_type'] ?? $query['filter_action'] ?? '',
            'data_group'    => $query['data_group'] ?? '',
            'from_date'     => $query['from_date'] ?? '',
            'to_date'       => $query['to_date'] ?? '',
            'date'          => $query['date'] ?? '',
            'anomaly_only'  => $query['anomaly_only'] ?? '',
            'review_status' => $query['review_status'] ?? '',
            'search'        => $query['search'] ?? '',
        ];
        return AdminLogRepository::fetchSummaryKpi($pdo, $filters);
    }

    public static function getLogDetail(PDO $pdo, int $logId, bool $revealSensitive, array $actor): array
    {
        $row = AdminLogRepository::findByIdWithReview($pdo, $logId);
        if (!$row) {
            return ['ok' => false, 'status' => 404, 'ref_code' => 'ERR_LOG_NOT_FOUND', 'message' => 'Không tìm thấy bản ghi nhật ký tương ứng.'];
        }
        $enriched = self::enrichRow($row, !$revealSensitive);
        if ($revealSensitive && !empty($enriched['has_sensitive_phone'])) {
            self::record(
                $pdo,
                (int)($actor['id'] ?? 0),
                'SENSITIVE_DATA_ACCESS',
                'audit_log',
                'LOG-' . $logId,
                null,
                ['log_id' => $logId, 'reason' => 'Xem chi tiết SĐT/dữ liệu đầy đủ trên Tab 11 Nhật ký'],
                get_client_ip()
            );
        }
        return ['ok' => true, 'data' => $enriched];
    }

    public static function submitReview(PDO $pdo, int $logId, string $note, array $actor): array
    {
        if ($logId <= 0) {
            return ['ok' => false, 'status' => 400, 'ref_code' => 'ERR_INVALID_LOG_ID', 'message' => 'Thiếu mã nhật ký cần hậu kiểm.'];
        }
        $thresholds = AdminLogRegistry::loadThresholds($pdo);
        $minLen = (int)($thresholds['reason_min_len'] ?? 10);
        $noteCheck = validate_mandatory_audit_reason($note, $minLen);
        if (!$noteCheck['valid']) {
            return ['ok' => false, 'status' => 400, 'ref_code' => 'ERR_INVALID_REVIEW_NOTE', 'message' => $noteCheck['message']];
        }

        $pdo->beginTransaction();
        try {
            $existing = AdminLogRepository::findByIdWithReview($pdo, $logId);
            if (!$existing) {
                $pdo->rollBack();
                return ['ok' => false, 'status' => 404, 'ref_code' => 'ERR_LOG_NOT_FOUND', 'message' => 'Không tìm thấy bản ghi nhật ký cần hậu kiểm.'];
            }
            if (!empty($existing['review_id'])) {
                $pdo->rollBack();
                return ['ok' => false, 'status' => 409, 'ref_code' => 'ERR_ALREADY_REVIEWED', 'message' => 'Bản ghi nhật ký này đã được hậu kiểm trước đó.'];
            }

            $reviewerId = (int)($actor['id'] ?? 0);
            $reviewerName = !empty($actor['full_name'])
                ? (string)$actor['full_name']
                : (string)($actor['username'] ?? ('Admin #' . $reviewerId));
            $nowVn = (new DateTime('now', new DateTimeZone('Asia/Ho_Chi_Minh')))->format('Y-m-d H:i:s');

            $ins = $pdo->prepare("INSERT INTO audit_reviews (log_id, reviewer_id, reviewer_name, note, created_at) VALUES (?, ?, ?, ?, ?)");
            $ins->execute([$logId, $reviewerId, substr($reviewerName, 0, 100), $noteCheck['reason'], $nowVn]);
            $reviewId = (int)$pdo->lastInsertId();

            self::record(
                $pdo,
                $reviewerId,
                'AUDIT_REVIEW',
                'audit_log',
                'LOG-' . $logId,
                null,
                ['log_id' => $logId, 'note' => $noteCheck['reason']],
                get_client_ip()
            );

            $pdo->commit();

            return [
                'ok'   => true,
                'data' => [
                    'id'                   => $reviewId,
                    'log_id'               => $logId,
                    'reviewer_id'          => $reviewerId,
                    'reviewer_name'        => $reviewerName,
                    'note'                 => $noteCheck['reason'],
                    'created_at'           => $nowVn,
                    'created_at_formatted' => AdminLogRegistry::formatDateTimeVn($nowVn),
                ],
            ];
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    public static function exportCsv(PDO $pdo, array $query, array $actor): void
    {
        $filters = [
            'admin_id'      => $query['admin_id'] ?? $query['user_id'] ?? $query['user'] ?? '',
            'categories'    => $query['categories'] ?? $query['category'] ?? '',
            'action_codes'  => $query['action_codes'] ?? '',
            'action_type'   => $query['action_type'] ?? $query['filter_action'] ?? '',
            'data_group'    => $query['data_group'] ?? '',
            'from_date'     => $query['from_date'] ?? '',
            'to_date'       => $query['to_date'] ?? '',
            'date'          => $query['date'] ?? '',
            'anomaly_only'  => $query['anomaly_only'] ?? '',
            'review_status' => $query['review_status'] ?? '',
            'quick_filter'  => $query['quick_filter'] ?? '',
            'search'        => $query['search'] ?? '',
        ];

        $rows = AdminLogRepository::fetchForExport($pdo, $filters, 5000);
        $enrichedRows = array_map(static fn(array $r): array => self::enrichRow($r, true), $rows);

        $activeFilters = array_filter($filters, static fn($v): bool => is_array($v) ? $v !== [] : trim((string)$v) !== '');
        self::record(
            $pdo,
            (int)($actor['id'] ?? 0),
            'EXPORT_CSV',
            'audit_log',
            'audit_logs',
            null,
            [
                'module'    => 'audit_logs',
                'filters'   => $activeFilters,
                'row_count' => count($enrichedRows),
            ],
            get_client_ip()
        );

        $neutralize = static function (string $cell): string {
            if ($cell !== '' && in_array($cell[0], ['=', '+', '-', '@', "\t", "\r"], true)) {
                return "'" . $cell;
            }
            return $cell;
        };

        $tz = new DateTimeZone('Asia/Ho_Chi_Minh');
        $stamp = (new DateTime('now', $tz))->format('Ymd-His');
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="nhat-ky-quan-tri-' . $stamp . '.csv"');
        header('X-Content-Type-Options: nosniff');
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

        $out = fopen('php://output', 'w');
        if ($out !== false) {
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, [
                'ID',
                'Thời gian',
                'Người thực hiện',
                'Vai trò',
                'Nhóm mã',
                'Mã hành động',
                'Hành động',
                'Nhóm dữ liệu',
                'Đối tượng',
                'Nội dung / Thay đổi',
                'Bất thường',
                'Lý do bất thường',
                'Trạng thái hậu kiểm',
                'Người hậu kiểm',
                'Ghi chú hậu kiểm',
                'IP',
            ]);
            foreach ($enrichedRows as $r) {
                $diffText = '';
                if (!empty($r['diffs'])) {
                    $parts = [];
                    foreach ($r['diffs'] as $d) {
                        $parts[] = "{$d['label']}: {$d['old']} -> {$d['new']}";
                    }
                    $diffText = implode(' | ', $parts);
                } else {
                    $diffText = (string)($r['formatted_message'] ?? '');
                }
                $rev = $r['review'] ?? null;
                fputcsv($out, [
                    (int)$r['id'],
                    $neutralize((string)$r['created_at_formatted']),
                    $neutralize((string)($r['actor_name'] ?? 'Hệ thống')),
                    $neutralize((string)($r['actor_role'] ?? 'system')),
                    $neutralize((string)$r['category']),
                    $neutralize((string)$r['action']),
                    $neutralize((string)$r['action_label']),
                    $neutralize((string)$r['data_group']),
                    $neutralize((string)$r['object_display']),
                    $neutralize($diffText),
                    !empty($r['is_anomaly']) ? 'Có' : 'Không',
                    $neutralize(implode('; ', $r['anomaly_reasons'] ?? [])),
                    $rev ? 'Đã hậu kiểm' : (!empty($r['is_anomaly']) ? 'Chờ hậu kiểm' : 'Bình thường'),
                    $neutralize((string)($rev['reviewer_name'] ?? '')),
                    $neutralize((string)($rev['note'] ?? '')),
                    $neutralize((string)($r['ip'] ?? '')),
                ]);
            }
            fclose($out);
        }
        exit;
    }

    public static function checkNewLogs(PDO $pdo, int $sinceId): array
    {
        return AdminLogRepository::checkNewLogsSince($pdo, $sinceId);
    }
}
