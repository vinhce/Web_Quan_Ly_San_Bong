<?php
declare(strict_types=1);

require_once __DIR__ . '/finance_metrics_helper.php';

/**
 * Send an HTML reply message to Telegram, clamping length safely under Telegram's 4096-char limit.
 */
function tg_bot_send_reply(string $botToken, string $chatId, string $htmlText): array {
    $text = trim($htmlText);
    if ($botToken === '' || $chatId === '' || $text === '') {
        return ['ok' => false, 'http_code' => 0, 'error' => 'missing_params'];
    }
    if (mb_strlen($text, 'UTF-8') > 3900) {
        $text = mb_substr($text, 0, 3860, 'UTF-8') . "\n\n<i>...(đã rút gọn do vượt giới hạn ký tự Telegram)</i>";
    }
    $url = "https://api.telegram.org/bot{$botToken}/sendMessage";
    $postFields = http_build_query([
        'chat_id'                  => $chatId,
        'text'                     => $text,
        'parse_mode'               => 'HTML',
        'disable_web_page_preview' => true,
    ]);
    return execute_http_post_with_retry($url, $postFields, [], 5, 2);
}

function tg_bot_fmt_vnd(int $amount): string {
    return number_format($amount, 0, ',', '.') . ' đ';
}

function tg_bot_parse_date_arg(string $arg, string $fallback): string {
    $clean = trim($arg);
    if ($clean === '') {
        return $fallback;
    }
    if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $clean, $m) && checkdate((int)$m[2], (int)$m[3], (int)$m[1])) {
        return sprintf('%04d-%02d-%02d', (int)$m[1], (int)$m[2], (int)$m[3]);
    }
    if (preg_match('/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/', $clean, $m) && checkdate((int)$m[2], (int)$m[1], (int)$m[3])) {
        return sprintf('%04d-%02d-%02d', (int)$m[3], (int)$m[2], (int)$m[1]);
    }
    if (preg_match('/^(\d{1,2})[\/\-](\d{1,2})$/', $clean, $m)) {
        $y = (int)date('Y');
        if (checkdate((int)$m[2], (int)$m[1], $y)) {
            return sprintf('%04d-%02d-%02d', $y, (int)$m[2], (int)$m[1]);
        }
    }
    return $fallback;
}

function tg_bot_parse_month_arg(string $arg): array {
    $clean = trim($arg);
    $year = (int)date('Y');
    $month = (int)date('m');
    if (preg_match('/^(\d{4})[\/\-](\d{1,2})$/', $clean, $m)) {
        $y = (int)$m[1];
        $mo = (int)$m[2];
        if ($mo >= 1 && $mo <= 12 && $y >= 2020 && $y <= 2100) {
            $year = $y;
            $month = $mo;
        }
    } elseif (preg_match('/^(\d{1,2})[\/\-](\d{4})$/', $clean, $m)) {
        $mo = (int)$m[1];
        $y = (int)$m[2];
        if ($mo >= 1 && $mo <= 12 && $y >= 2020 && $y <= 2100) {
            $year = $y;
            $month = $mo;
        }
    } elseif (preg_match('/^\d{1,2}$/', $clean)) {
        $mo = (int)$clean;
        if ($mo >= 1 && $mo <= 12) {
            $month = $mo;
        }
    }
    $from = sprintf('%04d-%02d-01', $year, $month);
    $to = date('Y-m-t', strtotime($from));
    return [$from, $to, sprintf('%02d/%04d', $month, $year)];
}

/**
 * Compute money in (bookings + counter sales + SePay matched transfers) and money out (expenses + refunds).
 */
function tg_bot_compute_in_out(PDO $pdo, string $fromDate, string $toDate): array {
    $bStmt = $pdo->prepare("SELECT * FROM bookings WHERE booking_date >= ? AND booking_date <= ?");
    $bStmt->execute([$fromDate, $toDate]);
    $rows = $bStmt->fetchAll(PDO::FETCH_ASSOC);

    $bookingCashIn = 0;
    $bookingTransferIn = 0;
    $bookingPaid = 0;
    $uncollected = 0;
    $matchesCount = 0;
    $cancelledCount = 0;
    $refundOut = 0;
    $refundCount = 0;

    foreach ($rows as $row) {
        $refAmt = max(0, (int)($row['refund_amount'] ?? 0));
        if ($refAmt > 0 && (string)($row['status'] ?? '') === 'Đã hủy') {
            $refundOut += $refAmt;
            $refundCount++;
        }
        $eval = finance_evaluate_booking_row($row);
        if (!empty($eval['isCancelled'])) {
            $cancelledCount++;
        }
        if (!empty($eval['excluded'])) {
            continue;
        }
        if (!empty($eval['isMatchCounted'])) {
            $matchesCount++;
        }
        $bookingPaid += (int)$eval['orderPaid'];
        $bookingCashIn += (int)$eval['orderCashPaid'];
        $bookingTransferIn += (int)$eval['orderTransferPaid'];
        $uncollected += (int)$eval['orderUncollected'];
    }

    $counter = finance_query_counter_sales($pdo, $fromDate, $toDate);
    $counterCash = (int)($counter['cashAmount'] ?? 0);
    $counterTransfer = (int)($counter['transferAmount'] ?? 0);
    $counterTotal = (int)($counter['totalAmount'] ?? 0);

    $expStmt = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) AS total_exp, COUNT(*) AS cnt FROM expenses WHERE expense_date >= ? AND expense_date <= ?");
    $expStmt->execute([$fromDate, $toDate]);
    $expRow = $expStmt->fetch(PDO::FETCH_ASSOC) ?: [];
    $expenseOut = (int)($expRow['total_exp'] ?? 0);
    $expenseCount = (int)($expRow['cnt'] ?? 0);

    $txStmt = $pdo->prepare("
        SELECT COALESCE(SUM(transfer_amount), 0) AS total_tx, COUNT(*) AS cnt
        FROM bank_transactions
        WHERE DATE(COALESCE(transaction_date, created_at)) >= ?
          AND DATE(COALESCE(transaction_date, created_at)) <= ?
          AND match_status IN ('matched', 'overpaid', 'underpaid', 'resolved')
    ");
    $txStmt->execute([$fromDate, $toDate]);
    $txRow = $txStmt->fetch(PDO::FETCH_ASSOC) ?: [];

    $totalCashIn = $bookingCashIn + $counterCash;
    $totalTransferIn = $bookingTransferIn + $counterTransfer;
    $totalIn = $bookingPaid + $counterTotal;
    $totalOut = $expenseOut + $refundOut;

    return [
        'totalIn'         => $totalIn,
        'totalCashIn'     => $totalCashIn,
        'totalTransferIn' => $totalTransferIn,
        'counterTotal'    => $counterTotal,
        'sepayInTotal'    => (int)($txRow['total_tx'] ?? 0),
        'sepayCount'      => (int)($txRow['cnt'] ?? 0),
        'totalOut'        => $totalOut,
        'expenseOut'      => $expenseOut,
        'expenseCount'    => $expenseCount,
        'refundOut'       => $refundOut,
        'refundCount'     => $refundCount,
        'netFlow'         => $totalIn - $totalOut,
        'matchesCount'    => $matchesCount,
        'cancelledCount'  => $cancelledCount,
        'uncollected'     => $uncollected,
    ];
}

function tg_bot_format_in_out_report(string $title, string $periodLabel, array $m): string {
    $netSign = $m['netFlow'] >= 0 ? '+' : '-';
    return "📊 <b>" . tg_escape($title) . "</b>\n"
         . "🗓 Kỳ: <b>" . tg_escape($periodLabel) . "</b>\n\n"
         . "💚 <b>TỔNG TIỀN VÀO: " . tg_bot_fmt_vnd($m['totalIn']) . "</b>\n"
         . "  • Chuyển khoản: <b>" . tg_bot_fmt_vnd($m['totalTransferIn']) . "</b>\n"
         . "  • Tiền mặt: <b>" . tg_bot_fmt_vnd($m['totalCashIn']) . "</b>\n"
         . "  • Bán lẻ tại quầy: " . tg_bot_fmt_vnd($m['counterTotal']) . "\n"
         . "  • Khớp VietQR SePay: " . tg_bot_fmt_vnd($m['sepayInTotal']) . " ({$m['sepayCount']} GD)\n\n"
         . "💸 <b>TỔNG TIỀN RA: " . tg_bot_fmt_vnd($m['totalOut']) . "</b>\n"
         . "  • Chi phí vận hành: " . tg_bot_fmt_vnd($m['expenseOut']) . " ({$m['expenseCount']} khoản)\n"
         . "  • Hoàn cọc hủy đơn: " . tg_bot_fmt_vnd($m['refundOut']) . " ({$m['refundCount']} đơn)\n\n"
         . "💰 <b>THỰC RÒNG (VÀO - RA): {$netSign}" . tg_bot_fmt_vnd(abs($m['netFlow'])) . "</b>\n"
         . "⚽ Số ca hoạt động: <b>{$m['matchesCount']}</b> | Hủy/Bỏ: <b>{$m['cancelledCount']}</b>\n"
         . "⏳ Còn phải thu tại sân: <b>" . tg_bot_fmt_vnd($m['uncollected']) . "</b>";
}

function tg_bot_cmd_user_show(PDO $pdo): string {
    $sumStmt = $pdo->query("
        SELECT
            COUNT(*) AS total_all,
            SUM(role = 'user') AS total_customers,
            SUM(role IN ('admin', 'manager', 'staff')) AS total_staff,
            SUM(status = 'locked') AS total_locked,
            SUM(role = 'user' AND customer_tier = 'vip') AS tier_vip,
            SUM(role = 'user' AND customer_tier = 'regular') AS tier_regular,
            SUM(role = 'user' AND customer_tier = 'warning_noshow') AS tier_warn
        FROM users
        WHERE role != 'walkin'
    ");
    $sum = $sumStmt ? ($sumStmt->fetch(PDO::FETCH_ASSOC) ?: []) : [];

    $listStmt = $pdo->query("
        SELECT u.id, u.username, u.full_name, u.phone, u.role, u.status, u.points, u.customer_tier,
               COALESCE(bc.cnt, 0) AS booking_count
        FROM users u
        LEFT JOIN (
            SELECT user_id, COUNT(*) AS cnt
            FROM bookings
            WHERE user_id IS NOT NULL
            GROUP BY user_id
        ) bc ON bc.user_id = u.id
        WHERE u.role != 'walkin'
        ORDER BY u.id DESC
        LIMIT 15
    ");
    $users = $listStmt ? $listStmt->fetchAll(PDO::FETCH_ASSOC) : [];

    $tierLabel = [
        'vip'            => 'VIP',
        'regular'        => 'Quen',
        'warning_noshow' => 'Cảnh báo',
        'standard'       => 'Thường',
    ];

    $lines = [
        "👥 <b>DANH SÁCH TÀI KHOẢN HỆ THỐNG</b>",
        "• Tổng: <b>" . (int)($sum['total_all'] ?? 0) . "</b> (Khách: <b>" . (int)($sum['total_customers'] ?? 0) . "</b> | Nhân sự: <b>" . (int)($sum['total_staff'] ?? 0) . "</b> | Khóa: <b>" . (int)($sum['total_locked'] ?? 0) . "</b>)",
        "• Hạng khách: VIP <b>" . (int)($sum['tier_vip'] ?? 0) . "</b> · Quen <b>" . (int)($sum['tier_regular'] ?? 0) . "</b> · Cảnh báo <b>" . (int)($sum['tier_warn'] ?? 0) . "</b>",
        "",
        "<b>15 tài khoản mới nhất:</b>",
    ];

    if (empty($users)) {
        $lines[] = "<i>Chưa có tài khoản nào.</i>";
        return implode("\n", $lines);
    }

    foreach ($users as $idx => $u) {
        $name = tg_escape($u['full_name'] ?: $u['username']);
        $phone = tg_escape($u['phone'] ?: '---');
        $role = (string)($u['role'] ?? 'user');
        $badge = $role !== 'user'
            ? strtoupper($role)
            : ($tierLabel[$u['customer_tier'] ?? 'standard'] ?? 'Thường');
        $lock = (($u['status'] ?? 'active') === 'locked') ? ' 🔒' : '';
        $pts = number_format((int)($u['points'] ?? 0));
        $bCnt = (int)($u['booking_count'] ?? 0);
        $lines[] = ($idx + 1) . ". <b>{$name}</b> ({$phone}) — {$badge}{$lock} | {$pts}đ | {$bCnt} đơn";
    }
    return implode("\n", $lines);
}

function tg_bot_cmd_pending(PDO $pdo): string {
    $bStmt = $pdo->query("
        SELECT b.code, b.customer_name, b.phone, b.booking_date, b.slot_time,
               b.deposit_amount, b.total_price, b.payment_status, p.name AS pitch_name
        FROM bookings b
        LEFT JOIN pitches p ON b.pitch_id = p.id
        WHERE b.payment_status IN ('Chờ duyệt cọc', 'Chờ cọc 30%')
          AND b.status NOT IN ('Đã hủy', 'Khách chưa đến', 'Hoàn thành', 'completed')
        ORDER BY b.booking_date ASC, b.id DESC
        LIMIT 20
    ");
    $pendingBookings = $bStmt ? $bStmt->fetchAll(PDO::FETCH_ASSOC) : [];

    $txStmt = $pdo->query("
        SELECT id, transfer_amount, match_status, detected_booking_code, transaction_content
        FROM bank_transactions
        WHERE match_status IN ('unmatched', 'underpaid', 'overpaid')
        ORDER BY id DESC
        LIMIT 10
    ");
    $pendingTx = $txStmt ? $txStmt->fetchAll(PDO::FETCH_ASSOC) : [];

    $lines = ["⏳ <b>ĐƠN CHỜ THANH TOÁN / ĐỐI SOÁT</b>", ""];
    $lines[] = "📋 <b>Đơn chưa duyệt cọc (" . count($pendingBookings) . "):</b>";
    if (empty($pendingBookings)) {
        $lines[] = "• Không có đơn chờ thanh toán cọc.";
    } else {
        foreach ($pendingBookings as $b) {
            $dFmt = date('d/m', strtotime((string)$b['booking_date']));
            $dep = tg_bot_fmt_vnd((int)($b['deposit_amount'] ?? 0));
            $lines[] = "• <code>" . tg_escape($b['code']) . "</code> | <b>" . tg_escape($b['customer_name']) . "</b> (" . tg_escape($b['phone']) . ") | "
                     . tg_escape($b['pitch_name'] ?: 'Sân') . " {$dFmt} " . tg_escape($b['slot_time']) . " | Cọc <b>{$dep}</b>";
        }
    }

    if (!empty($pendingTx)) {
        $lines[] = "";
        $lines[] = "⚠️ <b>Giao dịch VietQR cần kiểm tra (" . count($pendingTx) . "):</b>";
        foreach ($pendingTx as $tx) {
            $amt = tg_bot_fmt_vnd((int)($tx['transfer_amount'] ?? 0));
            $lines[] = "• #TX-{$tx['id']} (<b>{$amt}</b> - " . tg_escape($tx['match_status']) . ") | Mã: <code>"
                     . tg_escape($tx['detected_booking_code'] ?: 'Không rõ') . "</code> | <i>"
                     . tg_escape(mb_substr((string)$tx['transaction_content'], 0, 50)) . "</i>";
        }
    }
    return implode("\n", $lines);
}

function tg_bot_cmd_today(PDO $pdo): string {
    $today = date('Y-m-d');
    $stmt = $pdo->prepare("
        SELECT b.code, b.customer_name, b.phone, b.slot_time, b.status, b.payment_status,
               b.remaining_amount, p.name AS pitch_name
        FROM bookings b
        LEFT JOIN pitches p ON b.pitch_id = p.id
        WHERE b.booking_date = ?
          AND b.status NOT IN ('Đã hủy', 'Khách chưa đến')
        ORDER BY b.slot_time ASC, b.pitch_id ASC
        LIMIT 35
    ");
    $stmt->execute([$today]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $lines = [
        "📅 <b>LỊCH ĐÁ HÔM NAY (" . date('d/m/Y') . ")</b>",
        "Tổng số ca hoạt động: <b>" . count($rows) . "</b>",
        "",
    ];
    if (empty($rows)) {
        $lines[] = "<i>Hôm nay chưa có lịch đặt sân nào.</i>";
        return implode("\n", $lines);
    }

    foreach ($rows as $b) {
        $rem = max(0, (int)($b['remaining_amount'] ?? 0));
        $remTxt = $rem > 0 ? (" | Thu thêm <b>" . tg_bot_fmt_vnd($rem) . "</b>") : " | Đủ 100%";
        $lines[] = "• <b>" . tg_escape($b['slot_time']) . "</b> — " . tg_escape($b['pitch_name'] ?: 'Sân')
                 . " | <code>" . tg_escape($b['code']) . "</code> " . tg_escape($b['customer_name'])
                 . " (" . tg_escape($b['status']) . " · " . tg_escape($b['payment_status']) . "{$remTxt})";
    }
    return implode("\n", $lines);
}

function tg_bot_cmd_late(PDO $pdo): string {
    $today = date('Y-m-d');
    $nowTs = time();
    $stmt = $pdo->prepare("
        SELECT b.code, b.customer_name, b.phone, b.slot_time, b.status, b.payment_status, p.name AS pitch_name
        FROM bookings b
        LEFT JOIN pitches p ON b.pitch_id = p.id
        WHERE b.booking_date = ?
          AND b.status NOT IN ('Đã hủy', 'Hoàn thành', 'completed', 'Đang đá')
        ORDER BY b.slot_time ASC, b.id DESC
    ");
    $stmt->execute([$today]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $overdueNotArrived = [];
    $markedNoShow = [];
    foreach ($rows as $b) {
        if ((string)($b['status'] ?? '') === 'Khách chưa đến') {
            $markedNoShow[] = $b;
            continue;
        }
        if (preg_match('/^\s*(\d{1,2}):(\d{2})/', (string)($b['slot_time'] ?? ''), $m)) {
            $startTs = strtotime($today . ' ' . sprintf('%02d:%02d:00', (int)$m[1], (int)$m[2]));
            if ($startTs !== false && $startTs <= $nowTs) {
                $b['_late_mins'] = (int)floor(($nowTs - $startTs) / 60);
                $overdueNotArrived[] = $b;
            }
        }
    }

    $lines = ["⏰ <b>ĐƠN CHƯA ĐẾN / QUÁ GIỜ HÔM NAY (" . date('d/m/Y H:i') . ")</b>", ""];
    $lines[] = "🚨 <b>Đã tới giờ đá nhưng chưa check-in (" . count($overdueNotArrived) . "):</b>";
    if (empty($overdueNotArrived)) {
        $lines[] = "• Không có đơn nào quá giờ chưa check-in.";
    } else {
        foreach ($overdueNotArrived as $b) {
            $lines[] = "• <code>" . tg_escape($b['code']) . "</code> | Trễ <b>{$b['_late_mins']} phút</b> | "
                     . tg_escape($b['pitch_name'] ?: 'Sân') . " (" . tg_escape($b['slot_time']) . ") | "
                     . "<b>" . tg_escape($b['customer_name']) . "</b> (" . tg_escape($b['phone']) . ") — " . tg_escape($b['payment_status']);
        }
    }

    if (!empty($markedNoShow)) {
        $lines[] = "";
        $lines[] = "❌ <b>Đã đánh dấu Khách chưa đến hôm nay (" . count($markedNoShow) . "):</b>";
        foreach ($markedNoShow as $b) {
            $lines[] = "• <code>" . tg_escape($b['code']) . "</code> | " . tg_escape($b['pitch_name'] ?: 'Sân')
                     . " (" . tg_escape($b['slot_time']) . ") | " . tg_escape($b['customer_name']) . " — " . tg_escape($b['payment_status']);
        }
    }
    return implode("\n", $lines);
}

function tg_bot_help_text(): string {
    return "🤖 <b>LỆNH BOT SÂN BÓNG PRO</b>\n"
         . "• <code>/all</code> — Tiền vào & tiền ra hôm nay\n"
         . "• <code>/allday [dd/mm/yyyy]</code> — Tiền vào & ra theo ngày\n"
         . "• <code>/allweek</code> — Tiền vào & ra tuần này (T2–CN)\n"
         . "• <code>/all_month [mm/yyyy]</code> — Tiền vào & ra theo tháng\n"
         . "• <code>/user_show</code> — Danh sách & thống kê người dùng\n"
         . "• <code>/pending</code> — Đơn chờ thanh toán & GD VietQR lệch\n"
         . "• <code>/today</code> — Lịch đá bóng hôm nay\n"
         . "• <code>/late</code> — Đơn quá giờ chưa đến / No-show hôm nay";
}

function tg_bot_handle_command(PDO $pdo, string $rawText): ?string {
    $trimmed = trim($rawText);
    if ($trimmed === '' || $trimmed[0] !== '/') {
        return null;
    }
    $parts = preg_split('/\s+/', $trimmed, 2);
    $cmdRaw = strtolower((string)($parts[0] ?? ''));
    $cmd = preg_replace('/@.+$/', '', $cmdRaw);
    $arg = trim((string)($parts[1] ?? ''));
    $today = date('Y-m-d');

    switch ($cmd) {
        case '/all':
            $m = tg_bot_compute_in_out($pdo, $today, $today);
            return tg_bot_format_in_out_report('TIỀN VÀO & TIỀN RA HÔM NAY', date('d/m/Y', strtotime($today)), $m);

        case '/allday':
            $targetDate = tg_bot_parse_date_arg($arg, $today);
            $m = tg_bot_compute_in_out($pdo, $targetDate, $targetDate);
            return tg_bot_format_in_out_report('TIỀN VÀO & TIỀN RA THEO NGÀY', date('d/m/Y', strtotime($targetDate)), $m);

        case '/allweek':
            $refTs = strtotime($today);
            $dow = (int)date('N', $refTs);
            $monDate = date('Y-m-d', strtotime('-' . ($dow - 1) . ' days', $refTs));
            $sunDate = date('Y-m-d', strtotime('+6 days', strtotime($monDate)));
            $label = date('d/m/Y', strtotime($monDate)) . ' – ' . date('d/m/Y', strtotime($sunDate));
            $m = tg_bot_compute_in_out($pdo, $monDate, $sunDate);
            return tg_bot_format_in_out_report('TIỀN VÀO & TIỀN RA TUẦN NÀY', $label, $m);

        case '/all_month':
            [$fromDate, $toDate, $label] = tg_bot_parse_month_arg($arg);
            $m = tg_bot_compute_in_out($pdo, $fromDate, $toDate);
            return tg_bot_format_in_out_report('TIỀN VÀO & TIỀN RA THEO THÁNG', 'Tháng ' . $label, $m);

        case '/user_show':
        case '/user':
            return tg_bot_cmd_user_show($pdo);

        case '/pending':
            return tg_bot_cmd_pending($pdo);

        case '/today':
            return tg_bot_cmd_today($pdo);

        case '/late':
            return tg_bot_cmd_late($pdo);

        case '/start':
        case '/help':
            return tg_bot_help_text();

        default:
            return "❓ Lệnh <code>" . tg_escape($cmd) . "</code> chưa được hỗ trợ.\nGõ /help để xem danh sách lệnh.";
    }
}
