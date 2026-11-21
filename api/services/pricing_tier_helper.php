<?php
// Trợ thủ xác định hạng hội viên & tính giá giờ vàng

function get_authenticated_user_tier(?PDO $pdo, ?int $userId): string {
    if (!$pdo || !$userId) {
        return 'standard';
    }
    $tierRank = ['standard' => 1, 'bronze' => 2, 'silver' => 3, 'regular' => 4, 'gold' => 4, 'vip' => 5, 'diamond' => 5];
    $bestTier = 'standard';
    try {
        $uStmt = $pdo->prepare("SELECT phone, customer_tier FROM users WHERE id = ? LIMIT 1");
        $uStmt->execute([$userId]);
        $uRow = $uStmt->fetch();
        if (!$uRow) {
            return 'standard';
        }
        $uT = strtolower(trim((string)($uRow['customer_tier'] ?? 'standard')));
        if (isset($tierRank[$uT]) && $tierRank[$uT] > $tierRank[$bestTier]) {
            $bestTier = $uT;
        }
        $acctPhone = normalize_phone((string)($uRow['phone'] ?? ''));
        if ($acctPhone !== '') {
            $crmStmt = $pdo->prepare("SELECT customer_tier FROM customer_crm WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', '') = ? LIMIT 1");
            $crmStmt->execute([$acctPhone]);
            $cT = strtolower(trim((string)($crmStmt->fetchColumn() ?: '')));
            if (isset($tierRank[$cT]) && $tierRank[$cT] > $tierRank[$bestTier]) {
                $bestTier = $cT;
            }
        }
    } catch (Throwable $e) {
        error_log('[USER TIER WARN] ' . $e->getMessage());
    }
    return $bestTier;
}

function is_tier_allowed_for_voucher(string $userTier, string $requiredTier): bool {
    $req = strtolower(trim($requiredTier));
    if ($req === '' || $req === 'standard' || $req === 'all') {
        return true;
    }
    $tierRank = ['standard' => 1, 'bronze' => 2, 'silver' => 3, 'regular' => 4, 'gold' => 4, 'vip' => 5, 'diamond' => 5];
    $uTier = strtolower(trim($userTier)) ?: 'standard';
    $uRank = $tierRank[$uTier] ?? 1;
    $allowedTokens = array_values(array_filter(array_map('trim', explode(',', $req))));
    if (count($allowedTokens) > 1) {
        foreach ($allowedTokens as $tok) {
            if ($uTier === $tok) {
                return true;
            }
            if (isset($tierRank[$tok]) && $uRank >= $tierRank[$tok]) {
                return true;
            }
        }
        return false;
    }
    $minRank = $tierRank[$req] ?? 99;
    return $uRank >= $minRank;
}

function resolve_golden_hour_adjustment(?PDO $pdo, int $pitchType, int $dayOfWeekIso, string $slotId, int $currentPitchPrice): array {
    // Tính năng Quy tắc giá giờ vàng / thấp điểm đã được gỡ bỏ theo yêu cầu quản trị
    return [
        'originalPitchPrice' => $currentPitchPrice,
        'adjustedPitchPrice' => $currentPitchPrice,
        'delta'              => 0,
        'discountAmount'     => 0,
        'rule'               => null
    ];
}

function resolve_golden_hour_adjustment_legacy_unused(?PDO $pdo, int $pitchType, int $dayOfWeekIso, string $slotId, int $currentPitchPrice): array {
    $result = [
        'originalPitchPrice' => $currentPitchPrice,
        'adjustedPitchPrice' => $currentPitchPrice,
        'delta'              => 0,
        'discountAmount'     => 0,
        'rule'               => null
    ];
    if (!$pdo || $currentPitchPrice <= 0) {
        return $result;
    }
    try {
        $stmt = $pdo->prepare("
            SELECT id, rule_name, pitch_type, day_of_week, slot_id, price_adjustment_type, adjustment_value, description
            FROM golden_hour_rules
            WHERE is_active = 1
              AND (pitch_type IS NULL OR pitch_type = ?)
              AND (day_of_week IS NULL OR day_of_week = ?)
              AND (slot_id IS NULL OR slot_id = ?)
            ORDER BY ((pitch_type IS NOT NULL) * 1 + (day_of_week IS NOT NULL) * 2 + (slot_id IS NOT NULL) * 4) DESC, id DESC
            LIMIT 1
        ");
        $stmt->execute([$pitchType, $dayOfWeekIso, $slotId]);
        $rule = $stmt->fetch();
        if (!$rule) {
            return $result;
        }
        $newPrice = $currentPitchPrice;
        $adjType  = (string)($rule['price_adjustment_type'] ?? 'fixed');
        $adjVal   = (int)($rule['adjustment_value'] ?? 0);
        if ($adjType === 'fixed') {
            $newPrice = max(50000, $currentPitchPrice + $adjVal);
        } elseif ($adjType === 'percent_discount') {
            $pct = max(0, min(90, $adjVal));
            $newPrice = max(50000, (int)round($currentPitchPrice * (1 - ($pct / 100))));
        } elseif ($adjType === 'percent_surcharge') {
            $pct = max(0, min(200, $adjVal));
            $newPrice = (int)round($currentPitchPrice * (1 + ($pct / 100)));
        }
        $result['adjustedPitchPrice'] = $newPrice;
        $result['delta'] = $newPrice - $currentPitchPrice;
        $result['discountAmount'] = max(0, $currentPitchPrice - $newPrice);
        $result['rule'] = $rule;
        return $result;
    } catch (Exception $e) {
        error_log("[GOLDEN HOUR RESOLVE WARN] " . $e->getMessage());
        return $result;
    }
}
