<?php
declare(strict_types=1);

require_once __DIR__ . '/security_helper.php';
require_once __DIR__ . '/services/finance_metrics_helper.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0');
secure_session_start();

$pdo = getDBConnection(false);
if (!$pdo) {
    json_error('Không thể kết nối cơ sở dữ liệu.', 503, 'ERR_DB_UNAVAILABLE');
}

$actor = require_staff_or_admin($pdo);
$isManager = in_array($actor['role'] ?? '', ['admin', 'manager'], true);

$today = date('Y-m-d');
$weekStart = date('Y-m-d', strtotime('-6 days'));
$prevWeekStart = date('Y-m-d', strtotime('-13 days'));
$prevWeekEnd = date('Y-m-d', strtotime('-7 days'));

function dash_parse_slot_minutes(string $slotTime): array {
    if (preg_match('/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/', $slotTime, $m)) {
        return [
            'startMin' => ((int)$m[1]) * 60 + (int)$m[2],
            'endMin'   => ((int)$m[3]) * 60 + (int)$m[4]
        ];
    }
    return ['startMin' => 330, 'endMin' => 450];
}

function dash_is_peak_slot(string $slotTime): bool {
    // Khung giờ cao điểm 17:30 (1050p) – 21:00 (1260p): bất kỳ ca nào giao với [1050, 1260)
    $mins = dash_parse_slot_minutes($slotTime);
    return ($mins['startMin'] < 1260 && $mins['endMin'] > 1050);
}

// 1. Pitch counts (SQL aggregate, không đếm sân đã ẩn vào mẫu số vận hành)
$pitchAgg = $pdo->query("
    SELECT
        SUM(CASE WHEN status != 'Ẩn' THEN 1 ELSE 0 END) AS total_pitches,
        SUM(CASE WHEN status = 'Hoạt động' THEN 1 ELSE 0 END) AS active_pitches,
        SUM(CASE WHEN status = 'Bảo trì' THEN 1 ELSE 0 END) AS maint_pitches
    FROM pitches
")->fetch(PDO::FETCH_ASSOC) ?: [];

$totalPitches  = (int)($pitchAgg['total_pitches'] ?? 0);
$activePitches = (int)($pitchAgg['active_pitches'] ?? 0);
$maintPitches  = (int)($pitchAgg['maint_pitches'] ?? 0);

// 2. Today bookings + KPI (dùng chung finance_metrics_helper với Tab 9 Báo cáo)
$todayListStmt = $pdo->prepare("
    SELECT b.id, b.code, b.pitch_id, COALESCE(p.name, b.pitch_id) AS pitch_name, p.type AS pitch_type,
           b.booking_date, b.slot_id, b.slot_time, b.customer_name, b.phone,
           b.services_json, b.weeks_count, b.total_price, b.deposit_amount, b.paid_amount, b.remaining_amount,
           b.status, b.payment_status, b.payment_method, b.note
    FROM bookings b
    LEFT JOIN pitches p ON p.id = b.pitch_id
    WHERE b.booking_date = ?
    ORDER BY b.slot_time ASC, b.id DESC
");
$todayListStmt->execute([$today]);
$todayRows = $todayListStmt->fetchAll(PDO::FETCH_ASSOC);

$todayCount = count($todayRows);
$playingCount = 0;
$waitingCheckinCount = 0;
$completedCount = 0;
$noshowCancelCount = 0;
$recognizedRev = 0;
$collectedRev = 0;
$depositCollected = 0;
$remPitchCollected = 0;
$servicesCollected = 0;
$byPitchTodayStats = [];

$peakBookedCount = 0;
$todayBookings = [];
$miniTimelineMap = [];

foreach ($todayRows as $r) {
    $st = (string)($r['status'] ?? 'Đã xác nhận');
    $paySt = (string)($r['payment_status'] ?? '');
    $eval = finance_evaluate_booking_row($r);

    if ($st === 'Đang đá') {
        $playingCount++;
    } elseif (in_array($st, ['Giữ chỗ', 'Đã xác nhận', 'Chờ duyệt cọc'], true)) {
        $waitingCheckinCount++;
    } elseif ($eval['isCompleted']) {
        $completedCount++;
    } elseif (in_array($st, ['Khách chưa đến', 'Đã hủy'], true)) {
        $noshowCancelCount++;
    }

    $recognizedRev     += $eval['orderRevenue'];
    $collectedRev      += $eval['orderPaid'];
    $depositCollected  += $eval['orderDepositCollected'];
    $remPitchCollected += $eval['orderRemCollected'];
    $servicesCollected += $eval['orderSrvCollected'];

    $pid = (string)$r['pitch_id'];
    if (!isset($byPitchTodayStats[$pid])) {
        $byPitchTodayStats[$pid] = ['matches' => 0, 'revenue' => 0];
    }
    if ($eval['isMatchCounted']) {
        $byPitchTodayStats[$pid]['matches']++;
    }
    $byPitchTodayStats[$pid]['revenue'] += $eval['orderRevenue'];

    $slotTime = (string)($r['slot_time'] ?? '');
    $mins = dash_parse_slot_minutes($slotTime);
    $isValid = ($st !== 'Đã hủy' && $st !== 'Khách chưa đến');
    if ($isValid && dash_is_peak_slot($slotTime)) {
        $peakBookedCount++;
    }
    $item = [
        'code'            => (string)$r['code'],
        'pitchId'         => $pid,
        'pitchName'       => (string)$r['pitch_name'],
        'pitchType'       => (int)($r['pitch_type'] ?? 7),
        'date'            => (string)$r['booking_date'],
        'slotId'          => (string)($r['slot_id'] ?? ''),
        'slotTime'        => $slotTime,
        'startMin'        => $mins['startMin'],
        'endMin'          => $mins['endMin'],
        'customerName'    => (string)($r['customer_name'] ?? ''),
        'phone'           => (string)($r['phone'] ?? ''),
        'totalPrice'      => (int)$r['total_price'],
        'depositAmount'   => (int)$r['deposit_amount'],
        'paidAmount'      => (int)$r['paid_amount'],
        'remainingAmount' => (int)$r['remaining_amount'],
        'status'          => $st,
        'paymentStatus'   => $paySt,
        'paymentMethod'   => (string)($r['payment_method'] ?? ''),
        'note'            => (string)($r['note'] ?? '')
    ];
    $todayBookings[] = $item;

    if ($isValid) {
        if (!isset($miniTimelineMap[$pid])) {
            $miniTimelineMap[$pid] = [
                'pitchId'   => $pid,
                'pitchName' => $item['pitchName'],
                'bookings'  => []
            ];
        }
        $miniTimelineMap[$pid]['bookings'][] = [
            'code'         => $item['code'],
            'slotTime'     => $item['slotTime'],
            'startMin'     => $item['startMin'],
            'endMin'       => $item['endMin'],
            'status'       => $item['status'],
            'customerName' => $item['customerName']
        ];
    }
}

$todayCounterSales = finance_query_counter_sales($pdo, $today, $today);
$counterSalesTodayAmt = (int)$todayCounterSales['totalAmount'];
$recognizedRev     += $counterSalesTodayAmt;
$collectedRev      += $counterSalesTodayAmt;
$servicesCollected += $counterSalesTodayAmt;
$depositCollected   = min($collectedRev, $depositCollected);
$remainingCol       = max(0, $collectedRev - $depositCollected);
$uncollectedRev     = max(0, $recognizedRev - $collectedRev);

// Pending VietQR toàn hệ thống
$pendingVietqrCount = (int)$pdo->query("
    SELECT COUNT(*) FROM bookings
    WHERE status NOT IN ('Đã hủy', 'Khách chưa đến')
      AND payment_status IN ('Chờ duyệt cọc', 'Chờ cọc 30%')
")->fetchColumn();

// Đếm số khung giờ giao với giờ cao điểm 17:30-21:00 trong time_slots (mặc định 2 ca: 16:30-18:30 & 18:30-20:30 hoặc 20:30-22:30)
$peakSlotsPerPitch = 2;
try {
    $tsRows = $pdo->query("SELECT start_time, end_time FROM time_slots")->fetchAll(PDO::FETCH_ASSOC);
    $cntPeakSlots = 0;
    foreach ($tsRows as $ts) {
        $sStr = substr((string)$ts['start_time'], 0, 5) . ' - ' . substr((string)$ts['end_time'], 0, 5);
        if (dash_is_peak_slot($sStr)) {
            $cntPeakSlots++;
        }
    }
    if ($cntPeakSlots > 0) {
        $peakSlotsPerPitch = $cntPeakSlots;
    }
} catch (Throwable $e) {}

$peakCapacity = max(1, $activePitches * $peakSlotsPerPitch);
$peakOccupancyPct = round(min(100.0, ($peakBookedCount / $peakCapacity) * 100), 1);

// 4. Overdue / lingering bookings from previous days
$overdueStmt = $pdo->prepare("
    SELECT b.id, b.code, b.pitch_id, COALESCE(p.name, b.pitch_id) AS pitch_name, p.type AS pitch_type,
           b.booking_date, b.slot_id, b.slot_time, b.customer_name, b.phone,
           b.total_price, b.deposit_amount, b.paid_amount, b.remaining_amount,
           b.status, b.payment_status, b.payment_method, b.note
    FROM bookings b
    LEFT JOIN pitches p ON p.id = b.pitch_id
    WHERE b.booking_date < ?
      AND b.status NOT IN ('Hoàn thành', 'completed', 'Đã hủy', 'Khách chưa đến')
    ORDER BY b.booking_date DESC, b.id DESC
    LIMIT 200
");
$overdueStmt->execute([$today]);
$overdueBookings = [];
foreach ($overdueStmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
    $mins = dash_parse_slot_minutes((string)($r['slot_time'] ?? ''));
    $overdueBookings[] = [
        'code'            => (string)$r['code'],
        'pitchId'         => (string)$r['pitch_id'],
        'pitchName'       => (string)$r['pitch_name'],
        'pitchType'       => (int)($r['pitch_type'] ?? 7),
        'date'            => (string)$r['booking_date'],
        'slotId'          => (string)($r['slot_id'] ?? ''),
        'slotTime'        => (string)($r['slot_time'] ?? ''),
        'startMin'        => $mins['startMin'],
        'endMin'          => $mins['endMin'],
        'customerName'    => (string)($r['customer_name'] ?? ''),
        'phone'           => (string)($r['phone'] ?? ''),
        'totalPrice'      => (int)$r['total_price'],
        'depositAmount'   => (int)$r['deposit_amount'],
        'paidAmount'      => (int)$r['paid_amount'],
        'remainingAmount' => (int)$r['remaining_amount'],
        'status'          => (string)($r['status'] ?? 'Đã xác nhận'),
        'paymentStatus'   => (string)($r['payment_status'] ?? ''),
        'paymentMethod'   => (string)($r['payment_method'] ?? ''),
        'note'            => (string)($r['note'] ?? '')
    ];
}

// 5. Weekly & Previous-week revenue series (SQL aggregate)
$weeklySeries = [];
$prevWeeklySeries = [];
$byPitchToday = [];

if ($isManager) {
    $agg14Stmt = $pdo->prepare("
        SELECT booking_date, status, payment_status, payment_method, services_json,
               total_price, deposit_amount, paid_amount, remaining_amount
        FROM bookings
        WHERE booking_date BETWEEN ? AND ?
    ");
    $agg14Stmt->execute([$prevWeekStart, $today]);
    $revByDate = [];
    foreach ($agg14Stmt->fetchAll(PDO::FETCH_ASSOC) as $dr) {
        $dKey = (string)$dr['booking_date'];
        if (!isset($revByDate[$dKey])) {
            $revByDate[$dKey] = ['revenue' => 0, 'matches' => 0];
        }
        $eval14 = finance_evaluate_booking_row($dr);
        $revByDate[$dKey]['revenue'] += $eval14['orderRevenue'];
        if ($eval14['isMatchCounted']) {
            $revByDate[$dKey]['matches']++;
        }
    }

    $counter14 = finance_query_counter_sales($pdo, $prevWeekStart, $today);
    foreach ($counter14['rows'] as $csRow) {
        $dKey = substr((string)($csRow['created_at'] ?? ''), 0, 10);
        if ($dKey !== '') {
            if (!isset($revByDate[$dKey])) {
                $revByDate[$dKey] = ['revenue' => 0, 'matches' => 0];
            }
            $revByDate[$dKey]['revenue'] += max(0, (int)($csRow['total_amount'] ?? 0));
        }
    }

    for ($i = 6; $i >= 0; $i--) {
        $dCur = date('Y-m-d', strtotime("-{$i} days"));
        $dPrev = date('Y-m-d', strtotime('-' . ($i + 7) . ' days'));
        $weeklySeries[] = [
            'date'    => $dCur,
            'label'   => $i === 0 ? 'Hôm nay' : date('d/m', strtotime($dCur)),
            'revenue' => $revByDate[$dCur]['revenue'] ?? 0,
            'matches' => $revByDate[$dCur]['matches'] ?? 0
        ];
        $prevWeeklySeries[] = [
            'date'    => $dPrev,
            'label'   => date('d/m', strtotime($dPrev)),
            'revenue' => $revByDate[$dPrev]['revenue'] ?? 0,
            'matches' => $revByDate[$dPrev]['matches'] ?? 0
        ];
    }

    // By pitch today (dùng chung finance_metrics_helper)
    $pitchRows = $pdo->query("SELECT id, name, status FROM pitches ORDER BY type ASC, id ASC")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($pitchRows as $pr) {
        $pid = (string)$pr['id'];
        $byPitchToday[] = [
            'id'      => $pid,
            'name'    => (string)$pr['name'],
            'status'  => (string)$pr['status'],
            'matches' => (int)($byPitchTodayStats[$pid]['matches'] ?? 0),
            'revenue' => (int)($byPitchTodayStats[$pid]['revenue'] ?? 0)
        ];
    }
    usort($byPitchToday, static function ($a, $b) {
        if ($b['revenue'] !== $a['revenue']) {
            return $b['revenue'] <=> $a['revenue'];
        }
        if ($b['matches'] !== $a['matches']) {
            return $b['matches'] <=> $a['matches'];
        }
        return strcmp($a['id'], $b['id']);
    });
}

$payload = [
    'today'            => $today,
    'serverTime'       => date('H:i'),
    'kpi'              => [
        'recognizedRevenue'       => $isManager ? $recognizedRev : null,
        'collectedRevenue'        => $isManager ? $collectedRev : null,
        'depositCollected'        => $isManager ? $depositCollected : null,
        'remainingCollected'      => $isManager ? $remainingCol : null,
        'remainingPitchCollected' => $isManager ? $remPitchCollected : null,
        'servicesCollected'       => $isManager ? $servicesCollected : null,
        'counterSalesRevenue'     => $isManager ? $counterSalesTodayAmt : null,
        'uncollectedRevenue'      => $isManager ? $uncollectedRev : null,
        'todayCount'              => $todayCount,
        'playingCount'            => $playingCount,
        'waitingCheckinCount'     => $waitingCheckinCount,
        'completedCount'          => $completedCount,
        'noshowCancelCount'       => $noshowCancelCount,
        'pendingVietqrCount' => $pendingVietqrCount,
        'peakOccupancyPct'   => $peakOccupancyPct,
        'peakBooked'         => $peakBookedCount,
        'peakCapacity'       => $peakCapacity,
        'peakSlotsPerPitch'  => $peakSlotsPerPitch,
        'peakFormula'        => "{$peakBookedCount} ca cao điểm / ({$activePitches} sân hoạt động × {$peakSlotsPerPitch} khung 17:30–21:00)",
        'totalPitches'       => $totalPitches,
        'activePitches'      => $activePitches,
        'maintPitches'       => $maintPitches,
        'overdueCount'       => count($overdueBookings)
    ],
    'weeklySeries'     => $weeklySeries,
    'prevWeeklySeries' => $prevWeeklySeries,
    'byPitch'          => $byPitchToday,
    'miniTimeline'     => array_values($miniTimelineMap),
    'todayBookings'    => $todayBookings,
    'overdueBookings'  => $overdueBookings
];

$payload['hash'] = md5(json_encode([
    $payload['kpi'],
    $payload['todayBookings'],
    $payload['overdueBookings'],
    $payload['weeklySeries']
]));

json_response(['success' => true, 'data' => $payload]);
