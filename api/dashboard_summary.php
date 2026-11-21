<?php
declare(strict_types=1);

require_once __DIR__ . '/security_helper.php';

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

// 1. Pitch counts (SQL aggregate)
$pitchAgg = $pdo->query("
    SELECT
        COUNT(*) AS total_pitches,
        SUM(CASE WHEN status = 'Hoạt động' THEN 1 ELSE 0 END) AS active_pitches,
        SUM(CASE WHEN status = 'Bảo trì' THEN 1 ELSE 0 END) AS maint_pitches
    FROM pitches
")->fetch(PDO::FETCH_ASSOC) ?: [];

$totalPitches  = (int)($pitchAgg['total_pitches'] ?? 0);
$activePitches = (int)($pitchAgg['active_pitches'] ?? 0);
$maintPitches  = (int)($pitchAgg['maint_pitches'] ?? 0);

// 2. Today KPI SQL aggregate (doanh thu ghi nhận / đã thu / cọc / còn lại / chưa thu / đếm trạng thái)
$todayAggStmt = $pdo->prepare("
    SELECT
        COUNT(*) AS total_count,
        SUM(CASE WHEN status = 'Đang đá' THEN 1 ELSE 0 END) AS playing_count,
        SUM(CASE WHEN status IN ('Đã xác nhận', 'Chờ duyệt cọc') THEN 1 ELSE 0 END) AS waiting_checkin_count,
        SUM(CASE WHEN status IN ('Hoàn thành', 'completed') THEN 1 ELSE 0 END) AS completed_count,
        SUM(CASE WHEN status IN ('Khách chưa đến', 'Đã hủy') THEN 1 ELSE 0 END) AS noshow_cancel_count,
        SUM(CASE WHEN status NOT IN ('Đã hủy', 'Khách chưa đến') AND payment_status IN ('Chờ duyệt cọc', 'Chờ cọc 30%') THEN 1 ELSE 0 END) AS pending_vietqr_today,
        SUM(CASE
            WHEN status = 'Đã hủy' AND payment_status NOT IN ('Tịch thu cọc 30%', 'Phạt 50% cọc', 'Bảo lưu cọc 30%') THEN 0
            WHEN payment_status IN ('Đã hủy', 'Đã hoàn cọc 100%') THEN 0
            WHEN payment_status IN ('Tịch thu cọc 30%', 'Bảo lưu cọc 30%') OR status = 'Khách chưa đến' THEN deposit_amount
            WHEN payment_status = 'Phạt 50% cọc' THEN ROUND(deposit_amount * 0.5)
            ELSE total_price
        END) AS recognized_revenue,
        SUM(CASE
            WHEN status = 'Đã hủy' AND payment_status NOT IN ('Tịch thu cọc 30%', 'Phạt 50% cọc', 'Bảo lưu cọc 30%') THEN 0
            WHEN payment_status IN ('Đã hủy', 'Đã hoàn cọc 100%') THEN 0
            WHEN payment_status IN ('Tịch thu cọc 30%', 'Bảo lưu cọc 30%') OR status = 'Khách chưa đến' THEN deposit_amount
            WHEN payment_status = 'Phạt 50% cọc' THEN ROUND(deposit_amount * 0.5)
            WHEN status IN ('Hoàn thành', 'completed') OR payment_status IN ('Đã thanh toán đủ', 'Đã thanh toán 100%', 'completed', 'paid') THEN total_price
            WHEN paid_amount > 0 THEN LEAST(total_price, paid_amount)
            WHEN payment_status LIKE 'Đã cọc%' OR payment_status = 'deposited' THEN LEAST(total_price, deposit_amount)
            ELSE 0
        END) AS collected_revenue,
        SUM(CASE
            WHEN status = 'Đã hủy' AND payment_status NOT IN ('Tịch thu cọc 30%', 'Phạt 50% cọc', 'Bảo lưu cọc 30%') THEN 0
            WHEN payment_status IN ('Đã hủy', 'Đã hoàn cọc 100%') THEN 0
            WHEN payment_status IN ('Tịch thu cọc 30%', 'Bảo lưu cọc 30%') OR status = 'Khách chưa đến' THEN deposit_amount
            WHEN payment_status = 'Phạt 50% cọc' THEN ROUND(deposit_amount * 0.5)
            WHEN status IN ('Hoàn thành', 'completed') OR payment_status IN ('Đã thanh toán đủ', 'Đã thanh toán 100%', 'completed', 'paid', 'deposited') OR payment_status LIKE 'Đã cọc%' THEN LEAST(total_price, deposit_amount)
            ELSE 0
        END) AS deposit_collected
    FROM bookings
    WHERE booking_date = ?
");
$todayAggStmt->execute([$today]);
$todayAgg = $todayAggStmt->fetch(PDO::FETCH_ASSOC) ?: [];

$recognizedRev    = (int)($todayAgg['recognized_revenue'] ?? 0);
$collectedRev     = (int)($todayAgg['collected_revenue'] ?? 0);
$depositCollected = min($collectedRev, (int)($todayAgg['deposit_collected'] ?? 0));
$remainingCol     = max(0, $collectedRev - $depositCollected);
$uncollectedRev   = max(0, $recognizedRev - $collectedRev);

// Pending VietQR toàn hệ thống
$pendingVietqrCount = (int)$pdo->query("
    SELECT COUNT(*) FROM bookings
    WHERE status NOT IN ('Đã hủy', 'Khách chưa đến')
      AND payment_status IN ('Chờ duyệt cọc', 'Chờ cọc 30%')
")->fetchColumn();

// 3. Today bookings + Peak occupancy (17:30 - 21:00)
$todayListStmt = $pdo->prepare("
    SELECT b.id, b.code, b.pitch_id, COALESCE(p.name, b.pitch_id) AS pitch_name, p.type AS pitch_type,
           b.booking_date, b.slot_id, b.slot_time, b.customer_name, b.phone,
           b.total_price, b.deposit_amount, b.paid_amount, b.remaining_amount,
           b.status, b.payment_status, b.payment_method, b.note
    FROM bookings b
    LEFT JOIN pitches p ON p.id = b.pitch_id
    WHERE b.booking_date = ?
    ORDER BY b.slot_time ASC, b.id DESC
");
$todayListStmt->execute([$today]);
$todayRows = $todayListStmt->fetchAll(PDO::FETCH_ASSOC);

$peakBookedCount = 0;
$todayBookings = [];
$miniTimelineMap = [];

foreach ($todayRows as $r) {
    $st = (string)($r['status'] ?? 'Đã xác nhận');
    $slotTime = (string)($r['slot_time'] ?? '');
    $mins = dash_parse_slot_minutes($slotTime);
    $isValid = ($st !== 'Đã hủy' && $st !== 'Khách chưa đến');
    if ($isValid && dash_is_peak_slot($slotTime)) {
        $peakBookedCount++;
    }
    $item = [
        'code'            => (string)$r['code'],
        'pitchId'         => (string)$r['pitch_id'],
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
        'paymentStatus'   => (string)($r['payment_status'] ?? ''),
        'paymentMethod'   => (string)($r['payment_method'] ?? ''),
        'note'            => (string)($r['note'] ?? '')
    ];
    $todayBookings[] = $item;

    if ($isValid) {
        $pid = $item['pitchId'];
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
        SELECT
            booking_date,
            COUNT(CASE WHEN status NOT IN ('Đã hủy', 'Khách chưa đến') THEN 1 END) AS matches,
            SUM(CASE
                WHEN status = 'Đã hủy' AND payment_status NOT IN ('Tịch thu cọc 30%', 'Phạt 50% cọc', 'Bảo lưu cọc 30%') THEN 0
                WHEN payment_status IN ('Đã hủy', 'Đã hoàn cọc 100%') THEN 0
                WHEN payment_status IN ('Tịch thu cọc 30%', 'Bảo lưu cọc 30%') OR status = 'Khách chưa đến' THEN deposit_amount
                WHEN payment_status = 'Phạt 50% cọc' THEN ROUND(deposit_amount * 0.5)
                ELSE total_price
            END) AS revenue
        FROM bookings
        WHERE booking_date BETWEEN ? AND ?
        GROUP BY booking_date
    ");
    $agg14Stmt->execute([$prevWeekStart, $today]);
    $revByDate = [];
    foreach ($agg14Stmt->fetchAll(PDO::FETCH_ASSOC) as $dr) {
        $revByDate[$dr['booking_date']] = [
            'revenue' => (int)$dr['revenue'],
            'matches' => (int)$dr['matches']
        ];
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

    // By pitch today (SQL aggregate)
    $pitchRevStmt = $pdo->prepare("
        SELECT p.id, p.name, p.status,
               COUNT(CASE WHEN b.id IS NOT NULL AND b.status NOT IN ('Đã hủy', 'Khách chưa đến') THEN 1 END) AS matches,
               COALESCE(SUM(CASE
                   WHEN b.id IS NULL THEN 0
                   WHEN b.status = 'Đã hủy' AND b.payment_status NOT IN ('Tịch thu cọc 30%', 'Phạt 50% cọc', 'Bảo lưu cọc 30%') THEN 0
                   WHEN b.payment_status IN ('Đã hủy', 'Đã hoàn cọc 100%') THEN 0
                   WHEN b.payment_status IN ('Tịch thu cọc 30%', 'Bảo lưu cọc 30%') OR b.status = 'Khách chưa đến' THEN b.deposit_amount
                   WHEN b.payment_status = 'Phạt 50% cọc' THEN ROUND(b.deposit_amount * 0.5)
                   ELSE b.total_price
               END), 0) AS revenue
        FROM pitches p
        LEFT JOIN bookings b ON b.pitch_id = p.id AND b.booking_date = ?
        GROUP BY p.id, p.name, p.status
        ORDER BY revenue DESC, matches DESC, p.id ASC
    ");
    $pitchRevStmt->execute([$today]);
    foreach ($pitchRevStmt->fetchAll(PDO::FETCH_ASSOC) as $pr) {
        $byPitchToday[] = [
            'id'      => (string)$pr['id'],
            'name'    => (string)$pr['name'],
            'status'  => (string)$pr['status'],
            'matches' => (int)$pr['matches'],
            'revenue' => (int)$pr['revenue']
        ];
    }
}

$payload = [
    'today'            => $today,
    'serverTime'       => date('H:i'),
    'kpi'              => [
        'recognizedRevenue'  => $isManager ? $recognizedRev : null,
        'collectedRevenue'   => $isManager ? $collectedRev : null,
        'depositCollected'   => $isManager ? $depositCollected : null,
        'remainingCollected' => $isManager ? $remainingCol : null,
        'uncollectedRevenue' => $isManager ? $uncollectedRev : null,
        'todayCount'         => (int)($todayAgg['total_count'] ?? 0),
        'playingCount'       => (int)($todayAgg['playing_count'] ?? 0),
        'waitingCheckinCount'=> (int)($todayAgg['waiting_checkin_count'] ?? 0),
        'completedCount'     => (int)($todayAgg['completed_count'] ?? 0),
        'noshowCancelCount'  => (int)($todayAgg['noshow_cancel_count'] ?? 0),
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
