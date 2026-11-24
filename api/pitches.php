<?php

require_once __DIR__ . '/security_helper.php';

secure_session_start();
$pdo = getDBConnection();

$type = isset($_GET['type']) ? (int)$_GET['type'] : null;
$includeHidden = !empty($_GET['include_hidden']) && is_portal_operator(get_authenticated_user($pdo));

try {
    if ($type && in_array($type, [5, 7, 11])) {
        if ($includeHidden) {
            $stmt = $pdo->prepare("SELECT id, name, type, type_name as typeName, size, grass, base_price as basePrice, peak_price as peakPrice, weekend_price as weekendPrice, status, amenities_json, variant, description FROM pitches WHERE type = ? ORDER BY type ASC, id ASC");
            $stmt->execute([$type]);
        } else {
            $stmt = $pdo->prepare("SELECT id, name, type, type_name as typeName, size, grass, base_price as basePrice, peak_price as peakPrice, weekend_price as weekendPrice, status, amenities_json, variant, description FROM pitches WHERE type = ? AND status != 'Ẩn' ORDER BY type ASC, id ASC");
            $stmt->execute([$type]);
        }
    } else {
        if ($includeHidden) {
            $stmt = $pdo->prepare("SELECT id, name, type, type_name as typeName, size, grass, base_price as basePrice, peak_price as peakPrice, weekend_price as weekendPrice, status, amenities_json, variant, description FROM pitches ORDER BY type ASC, id ASC");
            $stmt->execute();
        } else {
            $stmt = $pdo->prepare("SELECT id, name, type, type_name as typeName, size, grass, base_price as basePrice, peak_price as peakPrice, weekend_price as weekendPrice, status, amenities_json, variant, description FROM pitches WHERE status != 'Ẩn' ORDER BY type ASC, id ASC");
            $stmt->execute();
        }
    }

    $pitches = $stmt->fetchAll();

    // Lấy thông tin đánh giá & bảo trì cho từng sân
    $ratingMap = [];
    try {
        $rStmt = $pdo->query("SELECT pitch_id, COUNT(*) as cnt, AVG(rating) as avg_r FROM reviews WHERE status = 'published' GROUP BY pitch_id");
        while ($rRow = $rStmt->fetch()) {
            $ratingMap[$rRow['pitch_id']] = [
                'count' => (int)$rRow['cnt'],
                'avg'   => round((float)$rRow['avg_r'], 1)
            ];
        }
    } catch (PDOException $rex) {}

    $maintMap = [];
    try {
        $mStmt = $pdo->query("SELECT pitch_id, reason FROM pitch_maintenance WHERE status IN ('scheduled', 'in_progress') AND CURDATE() BETWEEN start_date AND end_date AND DATE_FORMAT(NOW(), '%H:%i') BETWEEN start_time AND end_time");
        while ($mRow = $mStmt->fetch()) {
            $maintMap[$mRow['pitch_id']] = $mRow['reason'];
        }
    } catch (PDOException $mex) {}

    foreach ($pitches as &$p) {
        $p['amenities'] = !empty($p['amenities_json']) ? json_decode($p['amenities_json'], true) : [];
        unset($p['amenities_json']);
        $p['type'] = (int)$p['type'];
        $p['basePrice'] = (int)$p['basePrice'];
        $p['peakPrice'] = (int)$p['peakPrice'];
        $p['weekendPrice'] = (int)($p['weekendPrice'] ?? 0);
        if ($p['weekendPrice'] <= 0) {
            $p['weekendPrice'] = $p['type'] === 5 ? 380000 : ($p['type'] === 7 ? 700000 : 1400000);
        }
        $p['rating'] = $ratingMap[$p['id']]['avg'] ?? 0;
        $p['reviewCount'] = $ratingMap[$p['id']]['count'] ?? 0;
        $p['inMaintenance'] = isset($maintMap[$p['id']]);
        $p['maintenanceReason'] = $maintMap[$p['id']] ?? null;
    }
    unset($p);

    $availableOn = trim((string)($_GET['available_on'] ?? ''));
    $timeBand = strtolower(trim((string)($_GET['time_band'] ?? 'all')));
    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $availableOn)) {
        $bandSlotsStmt = $pdo->query("SELECT id, start_time, end_time FROM time_slots ORDER BY id ASC");
        $allSlotsForBand = $bandSlotsStmt ? $bandSlotsStmt->fetchAll(PDO::FETCH_ASSOC) : [];
        $targetSlots = array_values(array_filter($allSlotsForBand, static function ($sl) use ($timeBand) {
            $st = substr((string)($sl['start_time'] ?? ''), 0, 5);
            $en = substr((string)($sl['end_time'] ?? ''), 0, 5);
            if ($timeBand === 'morning') return $st >= '05:00' && $en <= '12:00';
            if ($timeBand === 'afternoon') return $st >= '12:00' && $en <= '17:00';
            if ($timeBand === 'peak') return $st >= '16:30' && $en <= '21:00';
            if ($timeBand === 'evening') return $st >= '20:30';
            return true;
        }));

        $bookedByPitch = [];
        try {
            $bkAvailStmt = $pdo->prepare("
                SELECT DISTINCT b.pitch_id, b.slot_id
                FROM bookings b
                WHERE b.status NOT IN ('Đã hủy', 'Khách chưa đến')
                  AND b.payment_status NOT IN ('Đã hủy', 'Tịch thu cọc 30%', 'Đã hoàn cọc 100%', 'Bảo lưu cọc 30%', 'Phạt 50% cọc')
                  AND (
                    b.paid_amount > 0
                    OR b.status IN ('Đã xác nhận', 'Đang đá', 'Hoàn thành', 'completed', 'Đã đá - chưa tất toán')
                    OR b.expires_at IS NULL
                    OR b.expires_at > NOW()
                  )
                  AND (
                    b.booking_date = ?
                    OR (
                      COALESCE(b.weeks_count, 1) > 1
                      AND DATEDIFF(?, b.booking_date) BETWEEN 0 AND 7 * (GREATEST(1, COALESCE(b.weeks_count, 1)) - 1)
                      AND MOD(DATEDIFF(?, b.booking_date), 7) = 0
                    )
                  )
            ");
            $bkAvailStmt->execute([$availableOn, $availableOn, $availableOn]);
            foreach ($bkAvailStmt->fetchAll(PDO::FETCH_ASSOC) as $bkRow) {
                $bookedByPitch[(string)$bkRow['pitch_id']][(string)$bkRow['slot_id']] = true;
            }
        } catch (PDOException $bex) {}

        $maintByPitch = [];
        try {
            $mtDateStmt = $pdo->prepare("SELECT pitch_id, start_time, end_time FROM pitch_maintenance WHERE status IN ('scheduled', 'in_progress') AND ? BETWEEN start_date AND end_date");
            $mtDateStmt->execute([$availableOn]);
            foreach ($mtDateStmt->fetchAll(PDO::FETCH_ASSOC) as $mRow) {
                $maintByPitch[(string)$mRow['pitch_id']][] = $mRow;
            }
        } catch (PDOException $mex3) {}

        foreach ($pitches as &$p) {
            $pid = (string)$p['id'];
            if (($p['status'] ?? '') !== 'Hoạt động') {
                $p['availableSlotIds'] = [];
                $p['availableSlotCount'] = 0;
                continue;
            }
            $freeIds = [];
            foreach ($targetSlots as $sl) {
                $sid = (string)$sl['id'];
                if (!empty($bookedByPitch[$pid][$sid])) {
                    continue;
                }
                $sStart = substr((string)$sl['start_time'], 0, 5);
                $sEnd = substr((string)$sl['end_time'], 0, 5);
                $blockedByMaint = false;
                foreach ($maintByPitch[$pid] ?? [] as $mw) {
                    $mStart = substr((string)($mw['start_time'] ?? ''), 0, 5);
                    $mEnd = substr((string)($mw['end_time'] ?? ''), 0, 5);
                    if (($mStart === '' && $mEnd === '') || ($sStart < $mEnd && $sEnd > $mStart)) {
                        $blockedByMaint = true;
                        break;
                    }
                }
                if (!$blockedByMaint) {
                    $freeIds[] = $sid;
                }
            }
            $p['availableSlotIds'] = $freeIds;
            $p['availableSlotCount'] = count($freeIds);
        }
        unset($p);
    }

    $all = isset($_GET['all']) && $_GET['all'] == '1';
    $withSettings = $all || (isset($_GET['settings']) && $_GET['settings'] == '1');
    $data = ['pitches' => $pitches];

    if ($all) {
        $slotsStmt = $pdo->query("SELECT id, slot_time as time, start_time as start, end_time as end, is_peak as isPeak, duration FROM time_slots ORDER BY id ASC");
        $slots = $slotsStmt->fetchAll();
        foreach ($slots as &$s) {
            $s['isPeak'] = (bool)$s['isPeak'];
            $s['duration'] = (float)$s['duration'];
        }
        $data['timeSlots'] = $slots;

        $servicesStmt = $pdo->query("SELECT id, name, price, unit, icon, stock_qty as stockQty, min_stock_warning as minStockWarning, track_inventory as trackInventory, is_active as isActive FROM extra_services WHERE is_active = 1 ORDER BY price ASC");
        $extraServices = $servicesStmt->fetchAll();
        foreach ($extraServices as &$srv) {
            $srv['price']           = (int)$srv['price'];
            $srv['stockQty']        = (int)($srv['stockQty'] ?? 100);
            $srv['minStockWarning'] = (int)($srv['minStockWarning'] ?? 10);
            $srv['trackInventory']  = (bool)($srv['trackInventory'] ?? true);
            $srv['isActive']        = (bool)($srv['isActive'] ?? true);
            $srv['lowStock']        = ($srv['trackInventory'] && $srv['stockQty'] <= $srv['minStockWarning']);
        }
        $data['extraServices'] = $extraServices;

        $hasRequiredTier = db_table_has_column($pdo, 'vouchers', 'required_tier');
        $hasMaxPerUser   = db_table_has_column($pdo, 'vouchers', 'max_per_user');
        $hasMaxDiscount  = db_table_has_column($pdo, 'vouchers', 'max_discount_amount');
        $extraCols = '';
        if ($hasRequiredTier) {
            $extraCols .= ', required_tier as requiredTier';
        }
        if ($hasMaxPerUser) {
            $extraCols .= ', max_per_user as maxPerUser';
        }
        if ($hasMaxDiscount) {
            $extraCols .= ', max_discount_amount as maxDiscountAmount';
        }

        $vouchersStmt = $pdo->query("
            SELECT code, description, discount_type as type, discount_value as value, min_order as minOrder,
                   max_usage as maxUsage, used_count as usedCount, valid_from as validFrom, valid_to as validTo,
                   pitch_type_limit as pitchTypeLimit {$extraCols}
            FROM vouchers
            WHERE is_active = 1
              AND (valid_from IS NULL OR CURDATE() >= valid_from)
              AND (valid_to IS NULL OR CURDATE() <= valid_to)
              AND (max_usage <= 0 OR used_count < max_usage)
            ORDER BY min_order ASC, code ASC
        ");
        $vouchers = $vouchersStmt ? $vouchersStmt->fetchAll() : [];

        $currentUser = get_authenticated_user($pdo);
        $userTier = $currentUser ? get_authenticated_user_tier($pdo, (int)$currentUser['id']) : 'standard';

        $visibleVouchers = [];
        foreach ($vouchers as $vRow) {
            $reqTier = strtolower(trim((string)($vRow['requiredTier'] ?? '')));
            if ($vRow['code'] === 'VIPGOLD' && $reqTier === '') {
                $reqTier = 'vip,regular';
            }

            if ($reqTier !== '' && $reqTier !== 'standard' && $reqTier !== 'all') {
                if (!$currentUser || !is_tier_allowed_for_voucher($userTier, $reqTier)) {
                    continue;
                }
            }

            $vRow['value'] = (int)$vRow['value'];
            $vRow['minOrder'] = (int)$vRow['minOrder'];
            $vRow['maxUsage'] = (int)($vRow['maxUsage'] ?? 100);
            $vRow['usedCount'] = (int)($vRow['usedCount'] ?? 0);
            $vRow['pitchTypeLimit'] = $vRow['pitchTypeLimit'] !== null ? (int)$vRow['pitchTypeLimit'] : null;
            if (isset($vRow['maxPerUser'])) {
                $vRow['maxPerUser'] = (int)$vRow['maxPerUser'];
            }
            $maxDiscAmt = (int)($vRow['maxDiscountAmount'] ?? 0);
            $vRow['maxDiscountAmount'] = $maxDiscAmt > 0 ? $maxDiscAmt : null;
            $visibleVouchers[] = $vRow;
        }
        $data['vouchers'] = $visibleVouchers;

        $totalPubReviews = 0;
        $weightedRatingSum = 0.0;
        foreach ($ratingMap as $rm) {
            $cnt = (int)($rm['count'] ?? 0);
            $totalPubReviews += $cnt;
            $weightedRatingSum += ((float)($rm['avg'] ?? 0)) * $cnt;
        }
        $completedMatchesCount = 0;
        try {
            $cmStmt = $pdo->query("
                SELECT COUNT(*)
                FROM bookings
                WHERE status IN ('Hoàn thành', 'completed', 'Đã xác nhận', 'Đang đá')
                  AND COALESCE(customer_name, '') NOT LIKE '%[TEST]%'
                  AND COALESCE(code, '') NOT LIKE '%[TEST]%'
            ");
            $completedMatchesCount = (int)($cmStmt ? $cmStmt->fetchColumn() : 0);
        } catch (PDOException $cex) {}
        $data['publicStats'] = [
            'pitchCount'            => count($pitches),
            'completedMatchesCount' => $completedMatchesCount,
            'publishedReviewsCount' => $totalPubReviews,
            'avgRating'             => $totalPubReviews > 0 ? round($weightedRatingSum / $totalPubReviews, 1) : 0
        ];

        $goldenRules = [];
        try {
            $grStmt = $pdo->query("
                SELECT id, rule_name AS ruleName, pitch_type AS pitchType, day_of_week AS dayOfWeek,
                       slot_id AS slotId, price_adjustment_type AS priceAdjustmentType,
                       adjustment_value AS adjustmentValue, description
                FROM golden_hour_rules
                WHERE is_active = 1
                ORDER BY ((pitch_type IS NOT NULL) * 1 + (day_of_week IS NOT NULL) * 2 + (slot_id IS NOT NULL) * 4) DESC, id DESC
            ");
            $goldenRules = $grStmt ? $grStmt->fetchAll() : [];
            foreach ($goldenRules as &$gr) {
                $gr['id'] = (int)$gr['id'];
                $gr['pitchType'] = $gr['pitchType'] !== null ? (int)$gr['pitchType'] : null;
                $gr['dayOfWeek'] = $gr['dayOfWeek'] !== null ? (int)$gr['dayOfWeek'] : null;
                $gr['adjustmentValue'] = (int)$gr['adjustmentValue'];
            }
        } catch (PDOException $gex) {}
        $data['goldenHourRules'] = $goldenRules;

        $maintSchedules = [];
        try {
            $msStmt = $pdo->query("
                SELECT id, pitch_id AS pitchId, start_date AS startDate, end_date AS endDate,
                       start_time AS startTime, end_time AS endTime, reason, status
                FROM pitch_maintenance
                WHERE status IN ('scheduled', 'in_progress') AND end_date >= CURDATE()
                ORDER BY start_date ASC, id ASC
            ");
            $maintSchedules = $msStmt ? $msStmt->fetchAll() : [];
            foreach ($maintSchedules as &$ms) {
                $ms['id'] = (int)$ms['id'];
            }
        } catch (PDOException $mex2) {}
        $data['maintenanceSchedules'] = $maintSchedules;
    }

    if ($withSettings) {
        $settingsMap = [];
        try {
            $setStmt = $pdo->query("SELECT setting_key, setting_value FROM settings");
            while ($row = $setStmt->fetch()) {
                $settingsMap[$row['setting_key']] = $row['setting_value'];
            }
        } catch (PDOException $setEx) {
            error_log("[API PITCHES SETTINGS WARN] " . $setEx->getMessage());
        }

        $data['settings'] = [
            'depositRate'                => (int)($settingsMap['deposit_rate'] ?? 30),
            'hotline'                    => $settingsMap['hotline'] ?? '0352 313 548',
            'openHours'                  => $settingsMap['open_hours'] ?? '05:30 - 22:30 hàng ngày (kể cả Lễ, Tết)',
            'holdMinutes'                => max(5, min(120, (int)($settingsMap['hold_minutes'] ?? 15))),
            'refundFullHours'            => max(1, (int)($settingsMap['refund_full_hours'] ?? 24)),
            'refundPartialHours'         => max(0, (int)($settingsMap['refund_partial_hours'] ?? 4)),
            'autoCancelEnabled'          => ((string)($settingsMap['auto_cancel_enabled'] ?? '1') !== '0'),
            'waitlistHoldMinutes'        => max(5, min(120, (int)($settingsMap['waitlist_hold_minutes'] ?? 15))),
            'matchmakingEnabled'         => ((string)($settingsMap['matchmaking_enabled'] ?? '1') !== '0'),
            'matchmakingRequireApproval' => ((string)($settingsMap['matchmaking_require_approval'] ?? '0') === '1'),
            'pricingTable' => [
                'p5'  => [
                    'base'    => (int)($settingsMap['price_p5_base'] ?? 250000),
                    'peak'    => (int)($settingsMap['price_p5_peak'] ?? 350000),
                    'weekend' => (int)($settingsMap['price_p5_weekend'] ?? 380000)
                ],
                'p7'  => [
                    'base'    => (int)($settingsMap['price_p7_base'] ?? 450000),
                    'peak'    => (int)($settingsMap['price_p7_peak'] ?? 650000),
                    'weekend' => (int)($settingsMap['price_p7_weekend'] ?? 700000)
                ],
                'p11' => [
                    'base'    => (int)($settingsMap['price_p11_base'] ?? 900000),
                    'peak'    => (int)($settingsMap['price_p11_peak'] ?? 1200000),
                    'weekend' => (int)($settingsMap['price_p11_weekend'] ?? 1400000)
                ]
            ]
        ];

        $data['bankInfo'] = [
            'bankName'      => $settingsMap['bank_name'] ?? 'MBBank',
            'bankCode'      => $settingsMap['bank_code'] ?? 'MB',
            'accountNo'     => $settingsMap['bank_account'] ?? '0352313548',
            'accountNumber' => $settingsMap['bank_account'] ?? '0352313548',
            'accountName'   => $settingsMap['bank_holder'] ?? 'NGUYEN QUANG VINH'
        ];
    }

    json_response([
        'success' => true,
        'data'    => $data
    ]);
} catch (PDOException $e) {
    error_log("[API PITCHES ERROR] " . $e->getMessage());
    json_response([
        'success'  => false,
        'message'  => 'Không thể tải danh sách sân bóng.',
        'ref_code' => 'ERR_FETCH_PITCHES'
    ], 500);
}
