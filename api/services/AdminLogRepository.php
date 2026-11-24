<?php
declare(strict_types=1);

require_once __DIR__ . '/AdminLogRegistry.php';
require_once __DIR__ . '/AdminLogIndexer.php';

/**
 * AdminLogRepository - Data access layer for audit_logs and audit_reviews.
 * Uses prepared statements, index-friendly date bounds, and GROUP BY aggregations (no N+1).
 */
final class AdminLogRepository
{
    private const VIETNAMESE_VOWEL_MAP = [
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
    ];

    /**
     * Resolve category display/alias tokens to canonical 2-char DB keys (TD/XH/CN/CB/TQ/TT).
     * Keeps Vietnamese 'đ' (U+0111) strictly distinct from 'd' so 'td' != 'tđ'.
     */
    public static function resolveCategoryToken(string $rawToken): ?string
    {
        $token = mb_strtolower(trim($rawToken), 'UTF-8');
        if ($token === '') {
            return null;
        }

        // Strip decomposed Vietnamese vowel/tone marks if NFD, without touching 'đ' (U+0111)
        $token = preg_replace('/[\x{0300}\x{0301}\x{0302}\x{0303}\x{0306}\x{0309}\x{031B}\x{0323}]+/u', '', $token) ?? $token;
        $token = strtr($token, self::VIETNAMESE_VOWEL_MAP);

        return match ($token) {
            'td'                      => 'TD',
            'xhc', 'xh'               => 'XH',
            'cn'                      => 'CN',
            'cb'                      => 'CB',
            'tq'                      => 'TQ',
            'tđ', 'tdg', 'auto', 'tt' => 'TT',
            default                   => null,
        };
    }

    public static function parseDateParam(string $raw): string
    {
        $clean = trim($raw);
        if ($clean === '') {
            return '';
        }
        if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $clean, $m)) {
            return checkdate((int)$m[2], (int)$m[3], (int)$m[1]) ? $clean : '';
        }
        if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/', $clean, $m)) {
            $d = (int)$m[1];
            $mo = (int)$m[2];
            $y = (int)$m[3];
            if (checkdate($mo, $d, $y)) {
                return sprintf('%04d-%02d-%02d', $y, $mo, $d);
            }
        }
        return '';
    }

    /**
     * Build WHERE SQL and positional parameters for audit_logs queries.
     * Alias `a` = audit_logs, `ar` = audit_reviews.
     *
     * @return array{0: string, 1: array}
     */
    public static function buildWhereClause(array $filters, ?PDO $pdo = null): array
    {
        $where = [];
        $params = [];

        // 1. Actor / user filter
        $rawUser = trim((string)($filters['admin_id'] ?? $filters['user_id'] ?? $filters['user'] ?? ''));
        if ($rawUser !== '') {
            if (strtolower($rawUser) === 'system') {
                $where[] = "(a.user_id IS NULL OR a.user_id = 0 OR a.actor_role = 'system')";
            } else {
                $uid = (int)$rawUser;
                if ($uid > 0) {
                    $where[] = "a.user_id = ?";
                    $params[] = $uid;
                }
            }
        }

        // 2. Category filter (TD/XH/CN/CB/TQ/TT) - strict IN equality so TD never matches TT
        $categories = $filters['categories'] ?? [];
        if (is_string($categories) && trim($categories) !== '') {
            $categories = preg_split('/[\s,+]+/', strtoupper(trim($categories)), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        }
        if (is_array($categories) && $categories !== []) {
            $validCats = array_values(array_unique(array_filter(
                array_map(static fn($c): string => strtoupper(trim((string)$c)), $categories),
                static fn(string $c): bool => isset(AdminLogRegistry::CATEGORIES[$c])
            )));
            if ($validCats === []) {
                $where[] = '1 = 0';
            } else {
                $where[] = 'a.category IN (' . implode(', ', array_fill(0, count($validCats), '?')) . ')';
                array_push($params, ...$validCats);
            }
        }

        // 3. Action codes / action type / __group__ filter
        $rawActionCodes = trim((string)($filters['action_codes'] ?? ''));
        $actionType = trim((string)($filters['action_type'] ?? $filters['filter_action'] ?? $filters['log_action'] ?? ''));
        if ($rawActionCodes !== '') {
            $codes = array_values(array_unique(array_filter(
                array_map('trim', explode(',', $rawActionCodes)),
                static fn(string $c): bool => $c !== '' && preg_match('/^[A-Za-z0-9_]+$/', $c) === 1
            )));
            if ($codes === []) {
                $where[] = '1 = 0';
            } else {
                $where[] = 'UPPER(a.action) IN (' . implode(', ', array_fill(0, count($codes), '?')) . ')';
                array_push($params, ...array_map('strtoupper', $codes));
            }
        } elseif ($actionType !== '') {
            if (preg_match('/^(?:__cat__|cat):(.+)$/iu', $actionType, $mCat) === 1) {
                $catCode = self::resolveCategoryToken($mCat[1]);
                if ($catCode !== null && isset(AdminLogRegistry::CATEGORIES[$catCode])) {
                    $where[] = 'a.category = ?';
                    $params[] = $catCode;
                } else {
                    $where[] = '1 = 0';
                }
            } elseif (str_starts_with($actionType, '__group__:')) {
                $groupKey = substr($actionType, strlen('__group__:'));
                $groupCodes = self::resolveLegacyOrDataGroupCodes($groupKey);
                if ($groupCodes === []) {
                    $where[] = "a.data_group = 'Khác'";
                } else {
                    $where[] = 'UPPER(a.action) IN (' . implode(', ', array_fill(0, count($groupCodes), '?')) . ')';
                    array_push($params, ...$groupCodes);
                }
            } else {
                $where[] = 'UPPER(a.action) = ?';
                $params[] = strtoupper($actionType);
            }
        }

        // 4. Data group filter
        $dataGroup = trim((string)($filters['data_group'] ?? ''));
        if ($dataGroup !== '') {
            $groups = array_values(array_unique(array_filter(
                array_map('trim', explode(',', $dataGroup)),
                static fn(string $g): bool => in_array($g, AdminLogRegistry::DATA_GROUPS, true)
            )));
            if ($groups === []) {
                $where[] = '1 = 0';
            } else {
                $where[] = 'a.data_group IN (' . implode(', ', array_fill(0, count($groups), '?')) . ')';
                array_push($params, ...$groups);
            }
        }

        // 5. Date range filters (index-friendly on a.created_at)
        $fromDate = self::parseDateParam((string)($filters['from_date'] ?? ''));
        $toDate = self::parseDateParam((string)($filters['to_date'] ?? ''));
        $singleDate = self::parseDateParam((string)($filters['date'] ?? ''));
        if ($fromDate === '' && $toDate === '' && $singleDate !== '') {
            $fromDate = $singleDate;
            $toDate = $singleDate;
        }
        if ($fromDate !== '') {
            $where[] = "a.created_at >= ?";
            $params[] = $fromDate . ' 00:00:00';
        }
        if ($toDate !== '') {
            $where[] = "a.created_at <= ?";
            $params[] = $toDate . ' 23:59:59';
        }

        // 6. Anomaly & review status filters
        if (isset($filters['anomaly_only']) && $filters['anomaly_only'] !== '') {
            $isAnom = in_array((string)$filters['anomaly_only'], ['1', 'true', 'yes'], true);
            $where[] = $isAnom ? 'a.is_anomaly = 1' : 'a.is_anomaly = 0';
        }
        $reviewStatus = strtolower(trim((string)($filters['review_status'] ?? '')));
        if ($reviewStatus === 'reviewed') {
            $where[] = 'ar.id IS NOT NULL';
        } elseif ($reviewStatus === 'unreviewed') {
            $where[] = 'ar.id IS NULL';
        }

        // 7. Quick KPI filter
        $quickFilter = strtolower(trim((string)($filters['quick_filter'] ?? '')));
        if ($quickFilter === 'unreviewed_anomaly') {
            $where[] = 'a.is_anomaly = 1 AND ar.id IS NULL';
        } elseif ($quickFilter === 'finance') {
            $where[] = "(a.data_group = 'Tiền & đặt cọc' OR a.category = 'TQ')";
        } elseif ($quickFilter === 'shifts') {
            $where[] = "a.data_group = 'Ca trực'";
        }

        // 8. Keyword search (including group code tokens like "TD", "XHC", "TĐ", "auto", "td+cn")
        $search = trim((string)($filters['search'] ?? ''));
        if ($search !== '') {
            $tokens = preg_split('/[\s,+]+/u', $search, -1, PREG_SPLIT_NO_EMPTY) ?: [];
            $resolvedCats = [];
            $allCategoryTokens = $tokens !== [];
            foreach ($tokens as $tok) {
                $mapped = self::resolveCategoryToken($tok);
                if ($mapped === null) {
                    $allCategoryTokens = false;
                    break;
                }
                $resolvedCats[] = $mapped;
            }

            if ($allCategoryTokens) {
                $catTokens = array_values(array_unique($resolvedCats));
                $where[] = 'a.category IN (' . implode(', ', array_fill(0, count($catTokens), '?')) . ')';
                array_push($params, ...$catTokens);
            } elseif ($pdo !== null && AdminLogIndexer::isTableReady($pdo) && ($qTokens = AdminLogIndexer::tokenizeQuery($search)) !== []) {
                foreach ($qTokens as $idx => $qt) {
                    $alias = 'st' . (int)$idx;
                    $where[] = "EXISTS (SELECT 1 FROM audit_search_tokens {$alias} WHERE {$alias}.log_id = a.id AND {$alias}.token LIKE ?)";
                    $params[] = $qt . '%';
                }
            } else {
                $likeVal = '%' . $search . '%';
                $likeCols = [
                    'a.object_code',
                    'a.target_id',
                    'a.booking_id',
                    'a.actor_name',
                    'a.old_value',
                    'a.new_value',
                    'a.action',
                    'a.data_group',
                ];
                $likeClauses = array_map(static fn(string $col): string => "{$col} LIKE ?", $likeCols);
                $likeParams = array_fill(0, count($likeCols), $likeVal);
                $digits = preg_replace('/[^0-9]/', '', $search) ?? '';
                if (strlen($digits) >= 8) {
                    $altDigits = str_starts_with($digits, '84') ? ('0' . substr($digits, 2)) : $digits;
                    $altLike = '%' . $altDigits . '%';
                    $likeClauses[] = 'a.object_code LIKE ?';
                    $likeClauses[] = 'a.target_id LIKE ?';
                    $likeParams[] = $altLike;
                    $likeParams[] = $altLike;
                }
                $where[] = '(' . implode(' OR ', $likeClauses) . ')';
                array_push($params, ...$likeParams);
            }
        }

        $whereSql = $where !== [] ? ('WHERE ' . implode(' AND ', $where)) : '';
        return [$whereSql, $params];
    }

    private static function resolveLegacyOrDataGroupCodes(string $groupKey): array
    {
        $legacyMap = [
            'pricing'    => ['Giá & voucher'],
            'payments'   => ['Tiền & đặt cọc'],
            'booking'    => ['Sân & Lịch đặt'],
            'shifts'     => ['Ca trực'],
            'members'    => ['Hội viên & điểm'],
            'venues'     => ['Sân & Lịch đặt', 'Cài đặt'],
            'security'   => ['Nhân sự & Bảo mật'],
            'automation' => ['TT'],
        ];
        if (isset($legacyMap[$groupKey])) {
            if ($groupKey === 'automation') {
                return AdminLogRegistry::getActionCodesForCategory('TT');
            }
            $codes = [];
            foreach ($legacyMap[$groupKey] as $dg) {
                $codes = array_merge($codes, AdminLogRegistry::getActionCodesForDataGroup($dg));
            }
            return array_values(array_unique($codes));
        }
        return AdminLogRegistry::getActionCodesForDataGroup($groupKey);
    }

    public static function fetchPaginated(PDO $pdo, array $filters, int $page, int $limit): array
    {
        AdminLogRegistry::backfillMissingMetadata($pdo);
        AdminLogIndexer::backfillMissing($pdo, 500);

        [$whereSql, $params] = self::buildWhereClause($filters, $pdo);
        $offset = ($page - 1) * $limit;

        $countStmt = $pdo->prepare("
            SELECT COUNT(*)
            FROM audit_logs a
            LEFT JOIN audit_reviews ar ON ar.log_id = a.id
            {$whereSql}
        ");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();
        $totalPages = $total > 0 ? (int)ceil($total / $limit) : 1;

        $stmt = $pdo->prepare("
            SELECT a.*,
                   u.username AS actor_username,
                   ar.id AS review_id,
                   ar.reviewer_id,
                   ar.reviewer_name,
                   ar.note AS review_note,
                   ar.created_at AS review_created_at
            FROM audit_logs a
            LEFT JOIN users u ON u.id = a.user_id
            LEFT JOIN audit_reviews ar ON ar.log_id = a.id
            {$whereSql}
            ORDER BY a.created_at DESC, a.id DESC
            LIMIT {$limit} OFFSET {$offset}
        ");
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $staffStmt = $pdo->query("SELECT id, username, full_name, role FROM users WHERE role IN ('admin', 'manager', 'staff') ORDER BY FIELD(role, 'admin', 'manager', 'staff'), id ASC");
        $staffList = $staffStmt ? ($staffStmt->fetchAll(PDO::FETCH_ASSOC) ?: []) : [];

        $actStmt = $pdo->query("SELECT DISTINCT action FROM audit_logs ORDER BY action ASC");
        $actionTypes = $actStmt ? ($actStmt->fetchAll(PDO::FETCH_COLUMN) ?: []) : [];

        $latestId = (int)$pdo->query("SELECT COALESCE(MAX(id), 0) FROM audit_logs")->fetchColumn();

        return [
            'rows'        => $rows,
            'total'       => $total,
            'totalPages'  => $totalPages,
            'staffList'   => $staffList,
            'actionTypes' => $actionTypes,
            'latestId'    => $latestId,
        ];
    }

    public static function fetchForExport(PDO $pdo, array $filters, int $maxRows = 5000): array
    {
        AdminLogRegistry::backfillMissingMetadata($pdo);
        AdminLogIndexer::backfillMissing($pdo, 500);

        [$whereSql, $params] = self::buildWhereClause($filters, $pdo);
        $limit = max(1, min(10000, $maxRows));
        $stmt = $pdo->prepare("
            SELECT a.*,
                   u.username AS actor_username,
                   ar.id AS review_id,
                   ar.reviewer_id,
                   ar.reviewer_name,
                   ar.note AS review_note,
                   ar.created_at AS review_created_at
            FROM audit_logs a
            LEFT JOIN users u ON u.id = a.user_id
            LEFT JOIN audit_reviews ar ON ar.log_id = a.id
            {$whereSql}
            ORDER BY a.created_at DESC, a.id DESC
            LIMIT {$limit}
        ");
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public static function fetchSummaryKpi(PDO $pdo, array $filters): array
    {
        AdminLogRegistry::backfillMissingMetadata($pdo);
        AdminLogIndexer::backfillMissing($pdo, 500);

        $tz = new DateTimeZone('Asia/Ho_Chi_Minh');
        $today = (new DateTime('now', $tz))->format('Y-m-d');
        $fromDate = self::parseDateParam((string)($filters['from_date'] ?? ''));
        $toDate = self::parseDateParam((string)($filters['to_date'] ?? ''));
        $singleDate = self::parseDateParam((string)($filters['date'] ?? ''));

        if ($fromDate === '' && $toDate === '' && $singleDate === '') {
            $filters['from_date'] = $today;
            $filters['to_date'] = $today;
        }

        // Summary KPI ignores quick_filter so all 4 card counts remain meaningful in the period
        $baseFilters = $filters;
        unset($baseFilters['quick_filter']);
        [$whereSql, $params] = self::buildWhereClause($baseFilters, $pdo);

        $kpiStmt = $pdo->prepare("
            SELECT
                COUNT(*) AS total_actions,
                COALESCE(SUM(CASE WHEN a.is_anomaly = 1 AND ar.id IS NULL THEN 1 ELSE 0 END), 0) AS unreviewed_anomalies,
                COALESCE(SUM(CASE WHEN a.is_anomaly = 1 THEN 1 ELSE 0 END), 0) AS total_anomalies,
                COALESCE(SUM(CASE WHEN a.data_group = 'Tiền & đặt cọc' OR a.category = 'TQ' THEN 1 ELSE 0 END), 0) AS finance_cash_count,
                COUNT(DISTINCT CASE WHEN a.data_group = 'Ca trực' AND a.object_code LIKE 'SHIFT-%' THEN a.object_code ELSE NULL END) AS shift_count
            FROM audit_logs a
            LEFT JOIN audit_reviews ar ON ar.log_id = a.id
            {$whereSql}
        ");
        $kpiStmt->execute($params);
        $kpi = $kpiStmt->fetch(PDO::FETCH_ASSOC) ?: [];

        $catStmt = $pdo->prepare("
            SELECT COALESCE(a.category, 'CN') AS cat, COUNT(*) AS cnt
            FROM audit_logs a
            LEFT JOIN audit_reviews ar ON ar.log_id = a.id
            {$whereSql}
            GROUP BY a.category
        ");
        $catStmt->execute($params);
        $categoryCounts = [];
        foreach (array_keys(AdminLogRegistry::CATEGORIES) as $c) {
            $categoryCounts[$c] = 0;
        }
        foreach ($catStmt->fetchAll(PDO::FETCH_ASSOC) as $cr) {
            $code = strtoupper((string)$cr['cat']);
            if (isset($categoryCounts[$code])) {
                $categoryCounts[$code] = (int)$cr['cnt'];
            }
        }

        $thresholds = AdminLogRegistry::loadThresholds($pdo);
        $shiftHealth = self::fetchLatestShiftHealth($pdo, (int)$thresholds['shift_strong_vnd']);
        $latestId = (int)$pdo->query("SELECT COALESCE(MAX(id), 0) FROM audit_logs")->fetchColumn();

        return [
            'period' => [
                'from_date' => $filters['from_date'] ?? ($filters['date'] ?? $today),
                'to_date'   => $filters['to_date'] ?? ($filters['date'] ?? $today),
                'is_today'  => (($filters['from_date'] ?? $today) === $today && ($filters['to_date'] ?? $today) === $today),
            ],
            'total_actions'        => (int)($kpi['total_actions'] ?? 0),
            'unreviewed_anomalies' => (int)($kpi['unreviewed_anomalies'] ?? 0),
            'total_anomalies'      => (int)($kpi['total_anomalies'] ?? 0),
            'finance_cash_count'   => (int)($kpi['finance_cash_count'] ?? 0),
            'shift_count'          => (int)($kpi['shift_count'] ?? 0),
            'category_counts'      => $categoryCounts,
            'latest_shift_status'  => $shiftHealth,
            'latest_id'            => $latestId,
        ];
    }

    private static function fetchLatestShiftHealth(PDO $pdo, int $strongVnd): array
    {
        try {
            // Check any discrepant or pending_explanation shifts without reviewed explanation (single GROUP BY query)
            $unrevStmt = $pdo->query("
                SELECT s.id, s.status, s.cash_total, s.initial_cash, s.actual_cash_received, s.staff_counted_cash, s.discrepancy_amount, s.admin_note,
                       MAX(ar.id) AS review_id
                FROM shifts s
                LEFT JOIN audit_logs al
                  ON al.object_code = CONCAT('SHIFT-', s.id)
                 AND al.action IN ('SHIFT_CLOSE', 'SHIFT_CONFIRM', 'SHIFT_EDIT_COUNT')
                LEFT JOIN audit_reviews ar ON ar.log_id = al.id
                WHERE s.status IN ('closed', 'pending_explanation', 'confirmed')
                GROUP BY s.id
                ORDER BY s.id DESC
                LIMIT 50
            ");
            $shifts = $unrevStmt ? ($unrevStmt->fetchAll(PDO::FETCH_ASSOC) ?: []) : [];

            if ($shifts === []) {
                $openShift = $pdo->query("SELECT id FROM shifts WHERE status = 'open' ORDER BY id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
                return $openShift
                    ? ['level' => 'neutral', 'text' => "Ca #{$openShift['id']} đang mở", 'shift_id' => (int)$openShift['id']]
                    : ['level' => 'neutral', 'text' => 'Chưa có ca trực đã chốt', 'shift_id' => null];
            }

            $unresolvedWarning = 0;
            $unresolvedDanger = 0;
            $firstUnresolvedId = null;
            foreach ($shifts as $sh) {
                $expected = (float)$sh['cash_total'] + (float)$sh['initial_cash'];
                $finalActual = $sh['actual_cash_received'] !== null ? (float)$sh['actual_cash_received'] : null;
                $staffCounted = $sh['staff_counted_cash'] !== null ? (float)$sh['staff_counted_cash'] : $finalActual;
                $finalDiff = $finalActual !== null ? ($finalActual - $expected) : 0.0;
                $staffDiff = $staffCounted !== null ? ($staffCounted - $expected) : 0.0;
                $hasDiff = abs($finalDiff) > 0.01 || abs($staffDiff) > 0.01;
                $isReviewed = !empty($sh['review_id']);

                if ($sh['status'] === 'pending_explanation' || ($hasDiff && !$isReviewed)) {
                    if ($firstUnresolvedId === null) {
                        $firstUnresolvedId = (int)$sh['id'];
                    }
                    $maxAbs = max(abs($finalDiff), abs($staffDiff));
                    if ($sh['status'] === 'pending_explanation' || $maxAbs >= $strongVnd) {
                        $unresolvedDanger++;
                    } else {
                        $unresolvedWarning++;
                    }
                }
            }

            if ($unresolvedDanger > 0 || $unresolvedWarning > 0) {
                $totalUnres = $unresolvedDanger + $unresolvedWarning;
                return [
                    'level'    => $unresolvedDanger > 0 ? 'danger' : 'warning',
                    'text'     => $totalUnres === 1
                        ? "Ca #{$firstUnresolvedId} lệch quỹ chưa hậu kiểm"
                        : "{$totalUnres} ca lệch quỹ chưa giải trình/hậu kiểm",
                    'shift_id' => $firstUnresolvedId,
                ];
            }

            $latest = $shifts[0];
            $expected = (float)$latest['cash_total'] + (float)$latest['initial_cash'];
            $finalActual = $latest['actual_cash_received'] !== null ? (float)$latest['actual_cash_received'] : null;
            $staffCounted = $latest['staff_counted_cash'] !== null ? (float)$latest['staff_counted_cash'] : $finalActual;
            $exactMatch = ($finalActual !== null && abs($finalActual - $expected) < 0.01)
                && ($staffCounted === null || abs($staffCounted - $expected) < 0.01);

            return [
                'level'    => 'ok',
                'text'     => $exactMatch
                    ? "Ca #{$latest['id']} khớp quỹ"
                    : "Ca #{$latest['id']} khớp quỹ (lệch đã hậu kiểm)",
                'shift_id' => (int)$latest['id'],
            ];
        } catch (Throwable $e) {
            return ['level' => 'neutral', 'text' => 'Không rõ trạng thái ca', 'shift_id' => null];
        }
    }

    public static function findByIdWithReview(PDO $pdo, int $logId): ?array
    {
        $stmt = $pdo->prepare("
            SELECT a.*,
                   u.username AS actor_username,
                   ar.id AS review_id,
                   ar.reviewer_id,
                   ar.reviewer_name,
                   ar.note AS review_note,
                   ar.created_at AS review_created_at
            FROM audit_logs a
            LEFT JOIN users u ON u.id = a.user_id
            LEFT JOIN audit_reviews ar ON ar.log_id = a.id
            WHERE a.id = ?
            LIMIT 1
        ");
        $stmt->execute([$logId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public static function checkNewLogsSince(PDO $pdo, int $sinceId): array
    {
        $sinceId = max(0, $sinceId);
        $stmt = $pdo->prepare("SELECT COUNT(*) AS cnt, COALESCE(MAX(id), 0) AS latest_id FROM audit_logs WHERE id > ?");
        $stmt->execute([$sinceId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: ['cnt' => 0, 'latest_id' => $sinceId];
        return [
            'new_count' => (int)$row['cnt'],
            'latest_id' => (int)$row['latest_id'],
        ];
    }
}
