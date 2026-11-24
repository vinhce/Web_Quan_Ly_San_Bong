<?php
declare(strict_types=1);

require_once __DIR__ . '/AdminLogRegistry.php';

/**
 * AdminLogIndexer - Pure-SQL Inverted Index manager for Tab 11 audit_logs.
 * Tokenizes UTF-8 Vietnamese/ASCII text, phone numbers, codes, action labels,
 * and JSON fields into audit_search_tokens(token, log_id).
 */
final class AdminLogIndexer
{
    private const MAX_TOKENS_PER_LOG = 150;
    private const MAX_QUERY_TOKENS = 8;

    private const ASCII_MAP = [
        'à' => 'a', 'á' => 'a', 'ả' => 'a', 'ã' => 'a', 'ạ' => 'a',
        'ă' => 'a', 'ằ' => 'a', 'ắ' => 'a', 'ẳ' => 'a', 'ẵ' => 'a', 'ặ' => 'a',
        'â' => 'a', 'ầ' => 'a', 'ấ' => 'a', 'ẩ' => 'a', 'ẫ' => 'a', 'ậ' => 'a',
        'è' => 'e', 'é' => 'e', 'ẻ' => 'e', 'ẽ' => 'e', 'ẹ' => 'e',
        'ê' => 'e', 'ề' => 'e', 'ế' => 'e', 'ể' => 'e', 'ễ' => 'e', 'ệ' => 'e',
        'ì' => 'i', 'í' => 'i', 'ỉ' => 'i', 'ĩ' => 'i', 'ị' => 'i',
        'ò' => 'o', 'ó' => 'o', 'ỏ' => 'o', 'õ' => 'o', 'ọ' => 'o',
        'ô' => 'o', 'ồ' => 'o', 'ố' => 'o', 'ổ' => 'o', 'ỗ' => 'o', 'ộ' => 'o',
        'ơ' => 'o', 'ờ' => 'o', 'ớ' => 'o', 'ở' => 'o', 'ỡ' => 'o', 'ợ' => 'o',
        'ù' => 'u', 'ú' => 'u', 'ủ' => 'u', 'ũ' => 'u', 'ụ' => 'u',
        'ư' => 'u', 'ừ' => 'u', 'ứ' => 'u', 'ử' => 'u', 'ữ' => 'u', 'ự' => 'u',
        'ỳ' => 'y', 'ý' => 'y', 'ỷ' => 'y', 'ỹ' => 'y', 'ỵ' => 'y',
        'đ' => 'd',
    ];

    private const SENSITIVE_KEYS = [
        'password', 'password_hash', 'totp_secret', 'totp_enabled',
        'token', 'secret', 'csrf_token', 'api_key', 'auth_token',
        'access_token', 'refresh_token', 'reset_token', 'remember_token',
        'must_change_password', 'bank_account', 'cccd', 'id_card',
    ];

    private const ROLE_LABELS = [
        'admin'   => 'Chủ sân',
        'manager' => 'Quản lý',
        'staff'   => 'Nhân viên',
        'system'  => 'Hệ thống',
    ];

    private const TARGET_LABELS = [
        'shift' => 'Ca trực', 'shifts' => 'Ca trực',
        'booking' => 'Mã ca', 'bookings' => 'Mã ca', 'recurring' => 'Mã ca',
        'waitlist' => 'Mã ca', 'matchmaking' => 'Mã ca',
        'user' => 'Hội viên', 'users' => 'Hội viên', 'customer' => 'Hội viên', 'member' => 'Hội viên',
        'pitch' => 'Sân bóng', 'pitches' => 'Sân bóng', 'maintenance' => 'Sân bóng',
        'service' => 'Dịch vụ', 'services' => 'Dịch vụ', 'inventory' => 'Dịch vụ',
        'voucher' => 'Voucher', 'vouchers' => 'Voucher', 'monthly_package' => 'Voucher',
        'expense' => 'Khoản chi', 'expenses' => 'Khoản chi',
        'bank_transaction' => 'Giao dịch', 'pricing' => 'Bảng giá', 'price' => 'Bảng giá',
        'golden_hour' => 'Bảng giá', 'setting' => 'Cài đặt', 'settings' => 'Cài đặt',
        'staff' => 'Nhân sự', 'security' => 'Bảo mật', 'auth' => 'Bảo mật',
        'audit_log' => 'Nhật ký', 'system' => 'Hệ thống',
    ];

    private static bool $tableReadyCache = false;

    public static function normalizeAscii(string $text): string
    {
        $lower = mb_strtolower($text, 'UTF-8');
        $clean = preg_replace('/[\x{0300}-\x{036f}]+/u', '', $lower) ?? $lower;
        return strtr($clean, self::ASCII_MAP);
    }

    public static function tokenizeText(string $raw): array
    {
        $norm = self::normalizeAscii($raw);
        if (trim($norm) === '') {
            return [];
        }

        $tokens = [];
        self::extractNormalizedMoneyTokens($norm, $tokens);

        if (preg_match_all('/[a-z0-9]+(?:[-_][a-z0-9]+)+/', $norm, $compMatches)) {
            foreach ($compMatches[0] as $comp) {
                $joined = str_replace(['-', '_'], '', $comp);
                if (strlen($joined) >= 2 && strlen($joined) <= 64) {
                    $tokens[$joined] = true;
                }
            }
        }

        if (preg_match_all('/(?<!\d)(?:\+?84|0)\d{8,9}(?!\d)/', $norm, $phoneMatches)) {
            foreach ($phoneMatches[0] as $rawPhone) {
                $digits = ltrim($rawPhone, '+');
                if (str_starts_with($digits, '84')) {
                    $digits = '0' . substr($digits, 2);
                }
                if (strlen($digits) >= 9 && strlen($digits) <= 11) {
                    $tokens[$digits] = true;
                    $tokens[substr($digits, 0, 3)] = true;
                    $tokens[substr($digits, 0, 4)] = true;
                    $tokens[substr($digits, -3)] = true;
                    $tokens[substr($digits, -4)] = true;
                }
            }
        }

        $parts = preg_split('/[^a-z0-9]+/', $norm, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        foreach ($parts as $part) {
            if (preg_match('/^\d{1,64}$/', $part) === 1 || (strlen($part) >= 2 && strlen($part) <= 64)) {
                $tokens[$part] = true;
            }
            if (strlen($part) >= 6 && preg_match('/^([a-z]{2,})(\d{3,})$/', $part, $bm) === 1) {
                $tokens[$bm[1]] = true;
                $tokens[$bm[2]] = true;
            } elseif (strlen($part) >= 6 && preg_match('/^(\d{3,})([a-z]{2,})$/', $part, $bm) === 1) {
                $tokens[$bm[1]] = true;
                $tokens[$bm[2]] = true;
            }
        }

        return array_keys($tokens);
    }

    public static function tokenizeQuery(string $search): array
    {
        $trimmed = trim($search);
        if ($trimmed === '') {
            return [];
        }

        if (preg_match('/^(?:\+?84|0)[\d\s.\-]{8,15}$/', $trimmed) === 1) {
            $digits = preg_replace('/\D+/', '', $trimmed) ?? '';
            if (str_starts_with($digits, '84') && strlen($digits) >= 10) {
                $digits = '0' . substr($digits, 2);
            }
            if (strlen($digits) >= 9 && strlen($digits) <= 11) {
                return [$digits];
            }
        }

        $tokens = [];
        $normPhoneSafe = preg_replace('/(?<!\d)\+?84(\d{8,9})(?!\d)/', '0$1', $trimmed) ?? $trimmed;
        $norm = self::normalizeAscii($normPhoneSafe);
        self::extractNormalizedMoneyTokens($norm, $tokens);

        $parts = preg_split('/[^a-z0-9]+/', $norm, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        foreach ($parts as $part) {
            if (preg_match('/^\d{1,64}$/', $part) === 1 || (strlen($part) >= 2 && strlen($part) <= 64)) {
                $tokens[$part] = true;
            }
            if (count($tokens) >= self::MAX_QUERY_TOKENS) {
                break;
            }
        }

        return array_slice(array_keys($tokens), 0, self::MAX_QUERY_TOKENS);
    }

    private static function extractNormalizedMoneyTokens(string $norm, array &$tokens): void
    {
        if (preg_match_all('/(?<!\d)\d{1,3}(?:[.,]\d{3})+(?!\d)/', $norm, $moneyMatches)) {
            foreach ($moneyMatches[0] as $rawAmt) {
                $plain = str_replace(['.', ','], '', $rawAmt);
                if (strlen($plain) >= 4 && strlen($plain) <= 18) {
                    $tokens[$plain] = true;
                }
            }
        }
    }

    public static function extractTokensFromRow(array $row): array
    {
        $meta = AdminLogRegistry::resolveActionMeta((string)($row['action'] ?? ''), $row['actor_role'] ?? null);
        $cat = (string)($row['category'] ?? $meta['category']);
        $shortCode = AdminLogRegistry::CATEGORIES[$cat]['short_code'] ?? $cat;
        $rawRole = strtolower(trim((string)($row['actor_role'] ?? '')));
        $roleLabel = ((int)($row['user_id'] ?? 0) === 0 || $rawRole === '')
            ? 'Hệ thống'
            : (self::ROLE_LABELS[$rawRole] ?? $rawRole);
        $targetType = strtolower(trim((string)($row['target_type'] ?? '')));
        $targetLabel = self::TARGET_LABELS[$targetType] ?? ($targetType !== '' ? $targetType : 'Hệ thống');

        $priorityFragments = [
            (string)($row['id'] ?? ''),
            (string)($row['action'] ?? ''),
            $meta['label'],
            $cat,
            $shortCode,
            (string)($row['data_group'] ?? $meta['data_group']),
            (string)($row['actor_name'] ?? ''),
            $roleLabel,
            $targetLabel,
            (string)($row['object_code'] ?? ''),
            (string)($row['target_id'] ?? ''),
            (string)($row['booking_id'] ?? ''),
            (string)($row['ip'] ?? ''),
        ];

        $bodyFragments = [];
        foreach (['old_value', 'new_value', 'anomaly_reasons'] as $col) {
            self::collectPayloadFragments($row[$col] ?? null, $bodyFragments);
        }

        $tokenSet = [];
        foreach (array_merge($priorityFragments, $bodyFragments) as $frag) {
            if ($frag === '') {
                continue;
            }
            foreach (self::tokenizeText((string)$frag) as $tok) {
                $tokenSet[$tok] = true;
                if (count($tokenSet) >= self::MAX_TOKENS_PER_LOG) {
                    return array_keys($tokenSet);
                }
            }
        }

        return array_keys($tokenSet);
    }

    public static function isTableReady(PDO $pdo): bool
    {
        if (self::$tableReadyCache) {
            return true;
        }
        try {
            $stmt = $pdo->query("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_search_tokens'");
            $exists = $stmt && (int)$stmt->fetchColumn() > 0;
            if ($exists) {
                self::$tableReadyCache = true;
            }
            return $exists;
        } catch (Throwable $e) {
            return false;
        }
    }

    public static function indexLog(PDO $pdo, int $logId, array $row): void
    {
        if ($logId <= 0 || !self::isTableReady($pdo)) {
            return;
        }
        try {
            $row['id'] = $logId;
            $tokens = self::extractTokensFromRow($row);
            if ($tokens === []) {
                return;
            }
            $placeholders = implode(', ', array_fill(0, count($tokens), '(?, ?)'));
            $params = [];
            foreach ($tokens as $tok) {
                $params[] = $tok;
                $params[] = $logId;
            }
            $stmt = $pdo->prepare("INSERT IGNORE INTO audit_search_tokens (token, log_id) VALUES {$placeholders}");
            $stmt->execute($params);
        } catch (Throwable $e) {
            error_log('[AUDIT INDEX WARN] ' . $e->getMessage());
        }
    }

    public static function backfillMissing(PDO $pdo, int $batchSize = 500): int
    {
        if (!self::isTableReady($pdo) || $pdo->inTransaction()) {
            return 0;
        }
        try {
            $limit = max(1, min(5000, $batchSize));
            $rows = $pdo->query("
                SELECT a.*
                FROM audit_logs a
                LEFT JOIN audit_search_tokens st ON st.log_id = a.id
                WHERE st.log_id IS NULL
                ORDER BY a.id DESC
                LIMIT {$limit}
            ")->fetchAll(PDO::FETCH_ASSOC);

            if (!$rows) {
                return 0;
            }
            foreach ($rows as $row) {
                self::indexLog($pdo, (int)$row['id'], $row);
            }
            return count($rows);
        } catch (Throwable $e) {
            error_log('[AUDIT BACKFILL INDEX WARN] ' . $e->getMessage());
            return 0;
        }
    }

    private static function collectPayloadFragments($value, array &$out): void
    {
        if ($value === null || $value === '') {
            return;
        }
        if (is_string($value)) {
            $trim = trim($value);
            if ($trim !== '' && ($trim[0] === '{' || $trim[0] === '[')) {
                $decoded = json_decode($trim, true);
                if (is_array($decoded)) {
                    self::collectPayloadFragments($decoded, $out);
                    return;
                }
            }
            $out[] = $trim;
            return;
        }
        if (is_bool($value)) {
            $out[] = $value ? 'true' : 'false';
            return;
        }
        if (is_scalar($value)) {
            $out[] = (string)$value;
            return;
        }
        if (!is_array($value)) {
            return;
        }
        foreach ($value as $k => $v) {
            if (is_string($k)) {
                $lk = strtolower($k);
                if (in_array($lk, self::SENSITIVE_KEYS, true)) {
                    continue;
                }
                if (isset(AdminLogRegistry::FIELDS[$lk]['label'])) {
                    $out[] = (string)AdminLogRegistry::FIELDS[$lk]['label'];
                }
            }
            self::collectPayloadFragments($v, $out);
        }
    }
}
