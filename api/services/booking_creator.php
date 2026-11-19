<?php
// Dịch vụ khởi tạo đơn đặt sân trực tuyến & tại quầy
function handle_create_booking(?PDO $pdo, array $data): void {
    $isWalkin = !empty($data['isWalkin']) || !empty($data['is_walkin']);
    $customer = null;
    if ($isWalkin) {
        $walkinActor = require_staff_or_admin($pdo);
        $userId = null;
        $customerName = sanitize_string($data['customerName'] ?? $data['customer_name'] ?? '', 60);
        $phone = normalize_phone(sanitize_string($data['phone'] ?? '', 25));
        if (mb_strlen($customerName) < 2 || mb_strlen($customerName) > 60) {
            json_error('Họ và tên khách tại quầy phải từ 2 đến 60 ký tự.', 400, 'ERR_INVALID_NAME');
        }
        if (!preg_match('/^0\d{9}$/', $phone)) {
            json_error('Số điện thoại khách tại quầy không hợp lệ (cần đúng 10 chữ số bắt đầu bằng 0).', 400, 'ERR_INVALID_PHONE');
        }
    } else {
        $customer = currentCustomer($pdo);
        if (!$customer) {
            json_response([
                'success'  => false,
                'message'  => 'Vui lòng đăng nhập để đặt sân trực tuyến.',
                'ref_code' => 'ERR_UNAUTHORIZED'
            ], 401);
        }

        $consent = !empty($data['privacy_consent']) || !empty($data['privacyConsent']);
        if (!$consent) {
            json_response([
                'success'  => false,
                'message'  => 'Vui lòng đọc và tích chọn đồng ý với Chính sách bảo mật & Điều khoản dịch vụ khi đặt sân trực tuyến.',
                'ref_code' => 'ERR_PRIVACY_CONSENT_REQUIRED'
            ], 422);
        }

        $turnstileToken = $data['turnstile_token'] ?? $data['cf-turnstile-response'] ?? null;
        if (!verify_turnstile_if_configured($turnstileToken)) {
            json_response([
                'success'  => false,
                'message'  => 'Xác thực Turnstile (chống bot) không thành công. Vui lòng tải lại trang và thử lại.',
                'ref_code' => 'ERR_BOT_CHECK_FAILED'
            ], 400);
        }

        if (!check_rate_limit($pdo, 'create_booking', 10, 300)) {
            json_response([
                'success'  => false,
                'message'  => 'Bạn thao tác quá nhanh. Vui lòng thử lại sau vài phút.',
                'ref_code' => 'ERR_RATE_LIMITED'
            ], 429);
        }
        increment_rate_limit($pdo, 'create_booking');

        // Bỏ qua mọi user_id client gửi lên, lấy tuyệt đối từ session server chống IDOR
        $userId = (int)$customer['id'];
        $isBookingForFriend = !empty($data['is_booking_for_friend']) || !empty($data['isBookingForFriend']);

        if ($isBookingForFriend) {
            // Đặt hộ bạn bè: Nhận họ tên & SĐT từ form, lưu vào đơn, KHÔNG đổi hồ sơ của khách đang đăng nhập
            $customerName = sanitize_string($data['customerName'] ?? $data['customer_name'] ?? '', 60);
            $phone = normalize_phone(sanitize_string($data['phone'] ?? '', 25));
            if (mb_strlen($customerName) < 2 || mb_strlen($customerName) > 60) {
                json_error('Họ tên người được đặt hộ phải từ 2 đến 60 ký tự.', 400, 'ERR_INVALID_NAME');
            }
            if (!preg_match('/^0\d{9}$/', $phone)) {
                json_error('Số điện thoại người được đặt hộ không hợp lệ (cần đúng 10 chữ số bắt đầu bằng 0).', 400, 'ERR_INVALID_PHONE');
            }
        } else {
            // Đặt cho mình: Lấy mặc định từ hồ sơ server, bỏ qua dữ liệu mặc định client gửi lên chống mạo danh
            $customerName = trim((string)($customer['full_name'] ?? $customer['name'] ?? ''));
            $phone = normalize_phone((string)($customer['phone'] ?? ''));

            if ($phone === '') {
                $providedPhone = normalize_phone(sanitize_string($data['phone'] ?? '', 25));
                if (!preg_match('/^0\d{9}$/', $providedPhone)) {
                    json_error('Hồ sơ của bạn chưa có số điện thoại. Vui lòng nhập số điện thoại hợp lệ (10 chữ số bắt đầu bằng 0).', 400, 'ERR_INVALID_PHONE');
                }
                $phone = $providedPhone;
                if ($pdo) {
                    $updPhone = $pdo->prepare("UPDATE users SET phone = ? WHERE id = ?");
                    $updPhone->execute([$phone, $userId]);
                }
                $_SESSION['user_phone'] = $phone;
                if (isset($_SESSION['user']) && is_array($_SESSION['user'])) {
                    $_SESSION['user']['phone'] = $phone;
                }
            }
            if ($customerName === '') {
                $customerName = sanitize_string($data['customerName'] ?? $data['customer_name'] ?? 'Hội viên', 60);
            }
            if (mb_strlen($customerName) < 2 || mb_strlen($customerName) > 60) {
                json_error('Họ và tên người đặt phải từ 2 đến 60 ký tự.', 400, 'ERR_INVALID_NAME');
            }
        }
    }

    $rawNote = (string)($data['note'] ?? '');
    if (mb_strlen($rawNote) > 300) {
        json_error('Ghi chú cho ban quản lý tối đa 300 ký tự.', 400, 'ERR_NOTE_TOO_LONG');
    }
    $note = sanitize_string($rawNote, 300);

    $email = filter_var($data['email'] ?? 'khachhang@sanbongpro.vn', FILTER_VALIDATE_EMAIL) ?: 'khachhang@sanbongpro.vn';
    $pitchId = sanitize_string($data['pitchId'] ?? $data['pitch_id'] ?? '', 20);
    $date = sanitize_string($data['date'] ?? $data['booking_date'] ?? '', 15);
    $slotId = sanitize_string($data['slotId'] ?? $data['slot_id'] ?? '', 10);
    $servicesInput = is_array($data['services'] ?? null) ? $data['services'] : [];
    $voucherCode = strtoupper(sanitize_string($data['voucherCode'] ?? $data['voucher_code'] ?? '', 30));
    $paymentMethod = sanitize_string($data['paymentMethod'] ?? $data['payment_method'] ?? 'VietQR Chuyển khoản', 50);

    $rawWeeks = (int)($data['weeksCount'] ?? $data['weeks_count'] ?? 1);
    $weeksCount = in_array($rawWeeks, [1, 4, 8, 12], true) ? $rawWeeks : 1;
    $bookingMode = sanitize_string($data['bookingMode'] ?? $data['booking_mode'] ?? ($weeksCount >= 12 ? 'quarterly' : ($weeksCount >= 4 ? 'monthly' : 'single')), 20);
    $payFull = !empty($data['payFull']) || !empty($data['pay_full']);

    if (!$isWalkin && $phone !== '') {
        if (!check_rate_limit($pdo, 'create_booking_phone', 4, 600, $phone)) {
            json_response([
                'success'  => false,
                'message'  => 'Số điện thoại này đang tạo đơn quá nhanh. Vui lòng thử lại sau 10 phút.',
                'ref_code' => 'ERR_RATE_LIMITED'
            ], 429);
        }
        increment_rate_limit($pdo, 'create_booking_phone', $phone);
    }

    if (!$isWalkin && $pdo !== null && $phone !== '') {
        try {
            $cleanPh = preg_replace('/[^0-9]/', '', $phone);
            $holdStmt = $pdo->prepare("
                SELECT COUNT(*) FROM bookings
                WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', '') = ?
                  AND payment_status IN ('Chờ duyệt cọc', 'Chờ cọc 30%')
                  AND (paid_amount = 0 OR paid_amount IS NULL)
                  AND status NOT IN ('Đã hủy', 'Khách chưa đến')
            ");
            $holdStmt->execute([$cleanPh]);
            if ((int)$holdStmt->fetchColumn() >= 2) {
                json_response([
                    'success'  => false,
                    'message'  => 'Bạn đang có 2 đơn đặt sân chờ thanh toán cọc. Vui lòng hoàn tất thanh toán hoặc chờ đơn hết hạn trước khi tạo thêm.',
                    'ref_code' => 'ERR_TOO_MANY_PENDING_BOOKINGS'
                ], 429);
            }
        } catch (Throwable $phEx) {
            error_log("[PENDING HOLD CHECK WARN] " . $phEx->getMessage());
        }
    }

    if ($weeksCount >= 12) {
        $packageDiscountRate = 0.15;
        $giftNote = '[Gói 3 tháng (12 tuần) - Tặng 2 thùng nước + 1 trọng tài/trận]';
        if (mb_stripos($note, 'Gói 3 tháng') === false) {
            $note = trim($note . ' ' . $giftNote);
        }
    } elseif ($weeksCount >= 8) {
        $packageDiscountRate = 0.10;
    } elseif ($weeksCount >= 4) {
        $packageDiscountRate = 0.05;
    } else {
        $packageDiscountRate = 0.0;
    }

    if ($isWalkin && mb_stripos($note, 'tại quầy') === false) {
        $note = trim($note . ' [Đặt trực tiếp tại quầy]');
    }

    if (empty($customerName) || empty($phone) || empty($pitchId) || empty($date) || empty($slotId)) {
        json_response([
            'success'  => false,
            'message'  => 'Vui lòng điền đầy đủ các trường thông tin bắt buộc.',
            'ref_code' => 'ERR_MISSING_REQUIRED'
        ], 400);
    }

    if (!preg_match('/^0[0-9]{9,10}$/', $phone)) {
        json_response([
            'success'  => false,
            'message'  => 'Số điện thoại không hợp lệ (cần đúng định dạng 10-11 chữ số Việt Nam).',
            'ref_code' => 'ERR_INVALID_PHONE'
        ], 400);
    }

    $bookingDateTime = preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) ? strtotime($date) : false;
    if (!$bookingDateTime) {
        json_error('Ngày đặt sân không hợp lệ.', 400, 'ERR_INVALID_DATE');
    }

    $now = new DateTime('now', new DateTimeZone('Asia/Ho_Chi_Minh'));
    $todayStr = $now->format('Y-m-d');
    $currentTime = $now->format('H:i');
    $today = strtotime($todayStr);
    $bookingDateStr = date('Y-m-d', $bookingDateTime);

    if ($bookingDateStr < $todayStr) {
        json_error('Không thể đặt sân cho ngày trong quá khứ.', 400, 'ERR_DATE_IN_PAST');
    }

    $allowPastSlot = !empty($data['allow_past_slot']) || !empty($data['allowPastSlot']);
    $pastSlotReason = trim((string)($data['past_slot_reason'] ?? $data['pastSlotReason'] ?? $data['allow_past_slot_reason'] ?? ''));
    $isPastSlot = false;

    if ($bookingDateStr === $todayStr) {
        $slotTime = '';
        if ($pdo !== null) {
            try {
                $slotLookupStmt = $pdo->prepare("SELECT slot_time, start_time FROM time_slots WHERE id = ?");
                $slotLookupStmt->execute([$slotId]);
                $slotLookupRow = $slotLookupStmt->fetch(PDO::FETCH_ASSOC);
                if ($slotLookupRow) {
                    $slotTime = (string)($slotLookupRow['start_time'] ?: ($slotLookupRow['slot_time'] ?? ''));
                }
            } catch (Throwable $e) {
                error_log("[SLOT LOOKUP WARN] " . $e->getMessage());
            }
        }
        if ($slotTime === '') {
            $fallbackSlotTimes = [
                'S01' => '05:30 - 06:30', 'S02' => '06:30 - 07:30', 'S03' => '07:30 - 08:30',
                'S04' => '08:30 - 09:30', 'S05' => '09:30 - 10:30', 'S06' => '14:00 - 15:00',
                'S07' => '15:00 - 16:00', 'S08' => '16:00 - 17:00', 'S09' => '17:00 - 18:00',
                'S10' => '17:30 - 19:00', 'S11' => '18:00 - 19:00', 'S12' => '19:00 - 20:00',
                'S13' => '19:00 - 20:30', 'S14' => '20:00 - 21:00', 'S15' => '20:30 - 22:00',
                'S16' => '21:00 - 22:00', 'S17' => '21:00 - 22:30', 'S18' => '22:00 - 23:00'
            ];
            $slotTime = $fallbackSlotTimes[$slotId] ?? (string)($data['slotTime'] ?? $data['slot_time'] ?? '');
        }

        $startSlotTime = '';
        if ($slotTime !== '') {
            $slotParts = explode('-', $slotTime);
            $startSlotTime = trim($slotParts[0]);
            if (strlen($startSlotTime) > 5) {
                $startSlotTime = substr($startSlotTime, 0, 5);
            }
        }

        if ($startSlotTime !== '' && $startSlotTime <= $currentTime) {
            if ($isWalkin) {
                if (!$allowPastSlot) {
                    json_error('Khung giờ này đã qua, vui lòng chọn khung giờ khác.', 400, 'ERR_SLOT_IN_PAST');
                }
                if ($pastSlotReason === '') {
                    json_error('Vui lòng nhập lý do cho phép đặt khung giờ đã qua.', 400, 'ERR_PAST_SLOT_REASON_REQUIRED');
                }
                $isPastSlot = true;
            } else {
                json_error('Khung giờ này đã qua, vui lòng chọn khung giờ khác.', 400, 'ERR_SLOT_IN_PAST');
            }
        }
    }

    if ($isPastSlot && $pastSlotReason !== '') {
        $note = trim($note . " [Duyệt slot quá khứ: {$pastSlotReason}]");
    }

    if ($pdo === null) {
        json_error('Lỗi kết nối cơ sở dữ liệu hệ thống.', 503, 'ERR_DB_UNAVAILABLE');
    }

    if (stripos($pitchId, 'P5') === 0) {
        $prefix = 'ASFF';
    } elseif (stripos($pitchId, 'P11') === 0) {
        $prefix = 'ASFE';
    } else {
        $prefix = 'ASFS';
    }
    $code = $prefix . random_int(100000, 999999);

    if (!isset($_SESSION['owned_booking_codes']) || !is_array($_SESSION['owned_booking_codes'])) {
        $_SESSION['owned_booking_codes'] = [];
    }
    $_SESSION['owned_booking_codes'][] = $code;

    maybe_run_auto_release_throttled($pdo, 30);

    try {
        $pdo->beginTransaction();
        $pitchStmt = $pdo->prepare("SELECT id, name, type, base_price, peak_price, weekend_price, status FROM pitches WHERE id = ? FOR UPDATE");
        $pitchStmt->execute([$pitchId]);
        $pitch = $pitchStmt->fetch();

        if (!$pitch || $pitch['status'] === 'Bảo trì' || $pitch['status'] === 'Ẩn') {
            $pdo->rollBack();
            json_error('Sân bóng này hiện đang bảo trì, tạm ẩn hoặc không tồn tại.', 400, 'ERR_PITCH_UNAVAILABLE');
        }

        $slotStmt = $pdo->prepare("SELECT id, slot_time, start_time, end_time, is_peak, duration FROM time_slots WHERE id = ?");
        $slotStmt->execute([$slotId]);
        $slot = $slotStmt->fetch();
        if (!$slot) {
            $pdo->rollBack();
            json_error('Khung giờ đặt không hợp lệ.', 400, 'ERR_INVALID_SLOT');
        }

        $sStart = !empty($slot['start_time']) ? trim((string)$slot['start_time']) : '';
        $sEnd   = !empty($slot['end_time'])   ? trim((string)$slot['end_time'])   : '';
        if ($sStart === '' || $sEnd === '') {
            $slotParts = explode('-', (string)$slot['slot_time']);
            $sStart = trim($slotParts[0] ?? '05:30');
            $sEnd   = trim($slotParts[1] ?? '23:00');
        }
        if (strlen($sStart) > 5) { $sStart = substr($sStart, 0, 5); }
        if (strlen($sEnd) > 5) { $sEnd = substr($sEnd, 0, 5); }

        if ($bookingDateStr === $todayStr && !$isPastSlot) {
            $slotParts = explode('-', (string)$slot['slot_time']);
            $sTime = trim($slotParts[0] ?? '');
            if (strlen($sTime) > 5) {
                $sTime = substr($sTime, 0, 5);
            }
            if ($sTime !== '' && $sTime <= $currentTime) {
                $pdo->rollBack();
                json_error('Khung giờ này đã qua, vui lòng chọn khung giờ khác.', 400, 'ERR_SLOT_IN_PAST');
            }
        }

        for ($k = 0; $k < $weeksCount; $k++) {
            $checkDate = date('Y-m-d', strtotime("+{$k} week", $bookingDateTime));
            $checkDuplicateStmt = $pdo->prepare("
                SELECT b.code, b.slot_id, b.slot_time
                FROM bookings b
                LEFT JOIN time_slots ts ON ts.id = b.slot_id
                WHERE b.pitch_id = ?
                  AND (
                    b.booking_date = ?
                    OR (
                      DATEDIFF(?, b.booking_date) BETWEEN 0 AND 7 * (GREATEST(1, COALESCE(b.weeks_count, 1)) - 1)
                      AND MOD(DATEDIFF(?, b.booking_date), 7) = 0
                    )
                  )
                  AND SUBSTR(TRIM(IFNULL(NULLIF(ts.start_time, ''), SUBSTRING_INDEX(b.slot_time, '-', 1))), 1, 5) < ?
                  AND SUBSTR(TRIM(IFNULL(NULLIF(ts.end_time, ''), SUBSTRING_INDEX(b.slot_time, '-', -1))), 1, 5) > ?
                  AND b.status NOT IN ('Đã hủy', 'Khách chưa đến')
                  AND b.payment_status NOT IN ('Đã hủy', 'Tịch thu cọc 30%', 'Đã hoàn cọc 100%', 'Bảo lưu cọc 30%', 'Phạt 50% cọc')
                LIMIT 1 FOR UPDATE
            ");
            $checkDuplicateStmt->execute([$pitchId, $checkDate, $checkDate, $checkDate, $sEnd, $sStart]);
            $existingBusy = $checkDuplicateStmt->fetch(PDO::FETCH_ASSOC);
            if ($existingBusy) {
                $pdo->rollBack();
                $weekNote = ($weeksCount > 1) ? (" (buổi tuần thứ " . ($k + 1) . ")") : "";
                json_response([
                    'success'  => false,
                    'message'  => "Khung giờ {$slot['slot_time']} ngày {$checkDate}{$weekNote} tại {$pitch['name']} bị trùng thời gian với đơn đặt trước (#{$existingBusy['code']} - {$existingBusy['slot_time']}). Vui lòng chọn khung giờ khác!",
                    'ref_code' => 'ERR_DOUBLE_BOOKING'
                ], 409);
            }

            $maintRow = find_active_maintenance_for_slot($pdo, $pitchId, $checkDate, (string)$slot['slot_time']);
            if ($maintRow) {
                $pdo->rollBack();
                $mRange = trim(($maintRow['start_time'] ?? '05:30') . ' - ' . ($maintRow['end_time'] ?? '23:00'));
                $weekNote = ($weeksCount > 1) ? (" ngày {$checkDate} (tuần " . ($k + 1) . ")") : "";
                json_error("Sân bóng đang có lịch bảo trì{$weekNote} ({$mRange}): {$maintRow['reason']}. Vui lòng chọn khung giờ hoặc sân khác.", 400, 'ERR_PITCH_MAINTENANCE');
            }
        }

        if (is_phone_blacklisted($pdo, $phone)) {
            $pdo->rollBack();
            json_error('Số điện thoại này hiện đang bị tạm khóa quyền đặt sân do lịch sử vi phạm chính sách. Vui lòng liên hệ hotline.', 403, 'ERR_BLACKLISTED');
        }

        $isPeak = (bool)$slot['is_peak'];
        $dayOfWeek = (int)date('w', $bookingDateTime);
        $isWeekend = ($dayOfWeek === 0 || $dayOfWeek === 6);
        $weekendPrice = (int)($pitch['weekend_price'] ?? 0);
        if ($isWeekend && $weekendPrice > 0) {
            $basePrice = $isPeak ? max((int)$pitch['peak_price'], $weekendPrice) : $weekendPrice;
        } else {
            $basePrice = $isPeak ? (int)$pitch['peak_price'] : (int)$pitch['base_price'];
        }
        $duration = (float)$slot['duration'];
        $pitchPriceBeforeRule = (int)round($basePrice * ($duration ?: 1.0) * $weeksCount * (1 - $packageDiscountRate));

        $ghDay = (int)date('N', $bookingDateTime);
        $ghEval = resolve_golden_hour_adjustment($pdo, (int)$pitch['type'], $ghDay, $slotId, $pitchPriceBeforeRule);
        $pitchPrice = (int)$ghEval['adjustedPitchPrice'];
        $appliedGoldenHourRule = $ghEval['rule'] ? [
            'id'              => (int)$ghEval['rule']['id'],
            'ruleName'        => (string)$ghEval['rule']['rule_name'],
            'adjustmentType'  => (string)$ghEval['rule']['price_adjustment_type'],
            'adjustmentValue' => (int)$ghEval['rule']['adjustment_value'],
            'delta'           => (int)$ghEval['delta']
        ] : null;

        $totalServicesPrice = 0;
        $cleanServices = [];
        if (!empty($servicesInput)) {
            $serviceIds = array_values(array_unique(array_filter(array_map(function ($item) {
                return trim((string)($item['id'] ?? ''));
            }, $servicesInput))));
            if (!empty($serviceIds)) {
                $placeholders = implode(',', array_fill(0, count($serviceIds), '?'));
                $srvStmt = $pdo->prepare("SELECT id, name, price, unit, stock_qty, track_inventory FROM extra_services WHERE is_active = 1 AND id IN ($placeholders) FOR UPDATE");
                $srvStmt->execute($serviceIds);
                $dbServices = $srvStmt->fetchAll(PDO::FETCH_UNIQUE);

                $requestedTotals = [];
                foreach ($servicesInput as $s) {
                    $sId = trim((string)($s['id'] ?? ''));
                    $sQty = max(1, min(100, (int)($s['quantity'] ?? 1)));
                    if (isset($dbServices[$sId])) {
                        $requestedTotals[$sId] = ($requestedTotals[$sId] ?? 0) + $sQty;
                    }
                }
                foreach ($requestedTotals as $sId => $reqTotalQty) {
                    $srvRow = $dbServices[$sId];
                    if ((int)($srvRow['track_inventory'] ?? 1) === 1 && (int)($srvRow['stock_qty'] ?? 0) < $reqTotalQty) {
                        $pdo->rollBack();
                        json_error("Sản phẩm/dịch vụ '{$srvRow['name']}' chỉ còn " . (int)$srvRow['stock_qty'] . " {$srvRow['unit']} trong kho.", 409, 'ERR_OUT_OF_STOCK');
                    }
                }
                foreach ($servicesInput as $s) {
                    $sId = trim((string)($s['id'] ?? ''));
                    $sQty = max(1, min(100, (int)($s['quantity'] ?? 1)));
                    if (isset($dbServices[$sId])) {
                        $cost = (int)$dbServices[$sId]['price'] * $sQty;
                        $totalServicesPrice += $cost;
                        $cleanServices[] = ['id' => $sId, 'name' => $dbServices[$sId]['name'], 'price' => (int)$dbServices[$sId]['price'], 'quantity' => $sQty, 'unit' => $dbServices[$sId]['unit'], 'total' => $cost];
                    }
                }
            }
        }

        if ($isWalkin) {
            $cleanCustPhone = normalize_phone($phone);
            if ($cleanCustPhone !== '') {
                $uStmt = $pdo->prepare("SELECT id FROM users WHERE phone = ? OR REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', '') = ? LIMIT 1");
                $uStmt->execute([$cleanCustPhone, $cleanCustPhone]);
                $foundUser = $uStmt->fetch(PDO::FETCH_ASSOC);
                if ($foundUser) {
                    $userId = (int)$foundUser['id'];
                } else {
                    $uname = 'kh_' . $cleanCustPhone;
                    $cName = $customerName ?: ('Khách hàng ' . substr($cleanCustPhone, -4));
                    $cEmail = $email ?: ($cleanCustPhone . '@sanbongpro.local');
                    $pwdHash = '$argon2id$v=19$m=65536,t=4,p=1$DISABLED_NON_LOGIN$disabled';
                    $newUStmt = $pdo->prepare("INSERT INTO users (username, full_name, phone, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, 'user', 'active')");
                    $newUStmt->execute([$uname, $cName, $cleanCustPhone, $cEmail, $pwdHash]);
                    $userId = (int)$pdo->lastInsertId();
                }
            } else {
                $wStmt = $pdo->prepare("SELECT id FROM users WHERE role = 'walkin' LIMIT 1");
                $wStmt->execute();
                $walkinUser = $wStmt->fetch(PDO::FETCH_ASSOC);
                if ($walkinUser) {
                    $userId = (int)$walkinUser['id'];
                } else {
                    $insW = $pdo->prepare("INSERT INTO users (username, full_name, phone, email, password_hash, role, status) VALUES ('khachle', 'Khách lẻ', '0000000000', 'khachle@sanbongpro.local', 'disabled', 'walkin', 'active')");
                    $insW->execute();
                    $userId = (int)$pdo->lastInsertId();
                }
            }
        } else {
            $userId = $_SESSION['user_id'] ?? null;
        }
        $settings = get_system_settings_map($pdo);
        $redeemedBottles = max(0, min(20, (int)($data['redeemedBottles'] ?? $data['redeemed_bottles'] ?? 0)));
        $pointsUsed = 0;
        if ($redeemedBottles > 0) {
            if (!$userId) {
                $pdo->rollBack();
                json_error('Bạn cần đăng nhập tài khoản để đổi điểm tích lũy lấy nước suối.', 403, 'ERR_UNAUTHORIZED');
            }
            $bottleCost = max(1, (int)($settings['loyalty_bottle_cost_points'] ?? 50));
            $pointsUsed = $redeemedBottles * $bottleCost;
            if (db_table_has_column($pdo, 'users', 'points')) {
                $ptStmt = $pdo->prepare("UPDATE users SET points = points - ? WHERE id = ? AND points >= ?");
                $ptStmt->execute([$pointsUsed, $userId, $pointsUsed]);
                if ($ptStmt->rowCount() <= 0) {
                    $pdo->rollBack();
                    json_error('Số điểm tích lũy không đủ để đổi ' . $redeemedBottles . ' chai nước.', 400, 'ERR_INSUFFICIENT_POINTS');
                }
            }
            $cleanServices[] = ['id' => 'SRV-WATER-BOTTLE', 'name' => 'Nước suối (Đổi điểm tích lũy)', 'price' => 0, 'quantity' => $redeemedBottles, 'unit' => 'chai', 'total' => 0];
        }

        $subtotal = $pitchPrice + $totalServicesPrice;
        $voucherDiscountAmount = 0;
        $appliedVoucher = null;
        if ($voucherCode !== '') {
            if (!check_rate_limit($pdo, 'invalid_voucher_attempts', 5, 300)) {
                $pdo->rollBack();
                json_error('Bạn đã thử mã ưu đãi sai quá nhiều lần. Vui lòng thử lại sau 5 phút.', 429, 'ERR_RATE_LIMITED');
            }
            $vStmt = $pdo->prepare("SELECT * FROM vouchers WHERE code = ? LIMIT 1 FOR UPDATE");
            $vStmt->execute([$voucherCode]);
            $vData = $vStmt->fetch(PDO::FETCH_ASSOC);
            if (!$vData || (int)$vData['is_active'] !== 1) {
                increment_rate_limit($pdo, 'invalid_voucher_attempts');
                $pdo->rollBack();
                json_error('Mã giảm giá không tồn tại hoặc đã ngừng áp dụng.', 400, 'ERR_INVALID_VOUCHER');
            }
            $nowDate = date('Y-m-d');
            if ((!empty($vData['valid_from']) && $nowDate < $vData['valid_from']) || (!empty($vData['valid_to']) && $nowDate > $vData['valid_to'])) {
                increment_rate_limit($pdo, 'invalid_voucher_attempts');
                $pdo->rollBack();
                json_error('Mã giảm giá chưa đến ngày áp dụng hoặc đã hết hạn.', 400, 'ERR_INVALID_VOUCHER');
            }
            if (!empty($vData['pitch_type_limit']) && (int)$vData['pitch_type_limit'] !== (int)$pitch['type']) {
                increment_rate_limit($pdo, 'invalid_voucher_attempts');
                $pdo->rollBack();
                json_error('Mã giảm giá này chỉ áp dụng riêng cho Sân ' . (int)$vData['pitch_type_limit'] . ' người.', 400, 'ERR_INVALID_VOUCHER');
            }
            if ((int)($vData['max_usage'] ?? 0) > 0 && (int)($vData['used_count'] ?? 0) >= (int)$vData['max_usage']) {
                increment_rate_limit($pdo, 'invalid_voucher_attempts');
                $pdo->rollBack();
                json_error('Mã giảm giá đã hết lượt sử dụng.', 400, 'ERR_INVALID_VOUCHER');
            }
            if ($subtotal < (int)($vData['min_order'] ?? 0)) {
                increment_rate_limit($pdo, 'invalid_voucher_attempts');
                $pdo->rollBack();
                json_error('Đơn hàng chưa đạt giá trị tối thiểu (' . number_format((int)$vData['min_order']) . 'đ) để dùng mã này.', 400, 'ERR_INVALID_VOUCHER');
            }

            $maxPerUser = (int)($vData['max_per_user'] ?? 0);
            if ($maxPerUser > 0) {
                $cleanCheckPhone = preg_replace('/[^0-9]/', '', $phone);
                $uLimitSql = "SELECT COUNT(*) FROM bookings WHERE voucher_code = ? AND (REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', '') = ? " . ($userId ? "OR user_id = ?" : "") . ") AND status NOT IN ('Đã hủy', 'Khách chưa đến')";
                $uLimitParams = [$voucherCode, $cleanCheckPhone];
                if ($userId) $uLimitParams[] = $userId;
                $uLimitStmt = $pdo->prepare($uLimitSql);
                $uLimitStmt->execute($uLimitParams);
                if ((int)$uLimitStmt->fetchColumn() >= $maxPerUser) {
                    increment_rate_limit($pdo, 'invalid_voucher_attempts');
                    $pdo->rollBack();
                    json_error('Bạn đã sử dụng hết số lần áp dụng cho mã này (tối đa ' . $maxPerUser . ' lần/khách).', 400, 'ERR_VOUCHER_USER_LIMIT');
                }
            }

            $reqTier = !empty($vData['required_tier']) ? trim((string)$vData['required_tier']) : ($voucherCode === 'VIPGOLD' ? 'vip,regular' : '');
            if ($reqTier !== '' && strtolower($reqTier) !== 'standard' && strtolower($reqTier) !== 'all') {
                if (!$userId) {
                    increment_rate_limit($pdo, 'invalid_voucher_attempts');
                    $pdo->rollBack();
                    json_error('Mã giảm giá này chỉ áp dụng cho thành viên hạng ưu đãi đã đăng nhập tài khoản.', 403, 'ERR_VOUCHER_TIER_REQUIRED');
                }
                $userTier = get_authenticated_user_tier($pdo, (int)$userId);
                if (!is_tier_allowed_for_voucher($userTier, $reqTier)) {
                    increment_rate_limit($pdo, 'invalid_voucher_attempts');
                    $pdo->rollBack();
                    json_error('Hạng thành viên hiện tại chưa đủ điều kiện áp dụng mã ưu đãi này.', 403, 'ERR_VOUCHER_TIER_MISMATCH');
                }
            }

            $voucherDiscountAmount = ($vData['discount_type'] === 'percent') ? (int)round($subtotal * ((int)$vData['discount_value'] / 100)) : min((int)$vData['discount_value'], $subtotal);
            $appliedVoucher = $vData['code'];

            if (db_table_has_column($pdo, 'vouchers', 'used_count')) {
                $updVStmt = $pdo->prepare("UPDATE vouchers SET used_count = used_count + 1 WHERE code = ? AND is_active = 1 AND (max_usage <= 0 OR used_count < max_usage)");
                $updVStmt->execute([$appliedVoucher]);
                if ($updVStmt->rowCount() < 1) {
                    $pdo->rollBack();
                    json_error('Mã giảm giá vừa hết lượt sử dụng. Vui lòng thử lại.', 409, 'ERR_INVALID_VOUCHER');
                }
            }
        }

        $totalPrice = max(0, $subtotal - $voucherDiscountAmount);
        $preDiscountPitchPrice = max($pitchPriceBeforeRule, $pitchPrice);
        $originalPrice = $preDiscountPitchPrice + $totalServicesPrice;
        $discountAmount = max(0, $originalPrice - $totalPrice);

        $sysSettings = $settings;
        $depositRate = max(10, min(100, (int)($sysSettings['deposit_rate'] ?? 30)));
        $holdMinutes = max(5, min(120, (int)($sysSettings['hold_minutes'] ?? 15)));

        $depositAmount = (int)round($totalPrice * ($depositRate / 100));
        $remainingAmount = max(0, $totalPrice - $depositAmount);
        $bookingStatus = 'Đã xác nhận';
        $paymentStatus = 'Chờ duyệt cọc';
        $paidAmount = 0;
        $expiresAt = (!$isWalkin && !$payFull) ? date('Y-m-d H:i:s', time() + ($holdMinutes * 60)) : null;

        if ($isWalkin) {
            $expiresAt = null;
            if ($paymentMethod === 'Khách quen (Chưa cọc)' || mb_stripos($paymentMethod, 'Chưa cọc') !== false) {
                $bookingStatus = 'Đã xác nhận';
                $paymentStatus = 'Chờ duyệt cọc';
                $depositAmount = 0;
                $paidAmount = 0;
                $remainingAmount = $totalPrice;
            } elseif ($payFull) {
                $bookingStatus = 'completed';
                $paymentStatus = 'Đã thanh toán 100%';
                $depositAmount = $totalPrice;
                $paidAmount = $totalPrice;
                $remainingAmount = 0;
            } else {
                $bookingStatus = 'Đã xác nhận';
                $paymentStatus = 'Đã cọc 30%';
                $paidAmount = $depositAmount;
                $remainingAmount = max(0, $totalPrice - $depositAmount);
            }
        }

        $expectedFile = __DIR__ . '/../../logs/expected_orders.json';
        $expectedOrders = [];
        if (file_exists($expectedFile)) {
            $decodedExpected = json_decode(@file_get_contents($expectedFile), true);
            if (is_array($decodedExpected)) $expectedOrders = $decodedExpected;
        }
        $cleanCode = str_replace(['-', ' '], '', strtoupper($code));
        $expectedOrders[$cleanCode] = ['code' => $code, 'deposit_amount' => $depositAmount, 'total_price' => $totalPrice, 'updated_at' => date('Y-m-d H:i:s')];
        @file_put_contents($expectedFile, json_encode($expectedOrders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        $servicesJson = json_encode($cleanServices, JSON_UNESCAPED_UNICODE);
        $hasPtsUsedCol = db_table_has_column($pdo, 'bookings', 'points_used');
        $hasBottlesCol = db_table_has_column($pdo, 'bookings', 'redeemed_bottles');
        $hasConsentCol = db_table_has_column($pdo, 'bookings', 'privacy_consent_at');

        $bCols = ['code', 'user_id', 'customer_name', 'phone', 'email', 'pitch_id', 'booking_date', 'slot_id', 'slot_time', 'services_json', 'voucher_code', 'original_price', 'discount_amount', 'total_price', 'deposit_amount', 'paid_amount', 'remaining_amount', 'status', 'payment_status', 'payment_method', 'weeks_count', 'booking_mode', 'note', 'expires_at'];
        $bVals = [$code, $userId, $customerName, $phone, $email, $pitchId, $date, $slotId, $slot['slot_time'], $servicesJson, $appliedVoucher, $originalPrice, $discountAmount, $totalPrice, $depositAmount, $paidAmount, $remainingAmount, $bookingStatus, $paymentStatus, $paymentMethod, $weeksCount, $bookingMode, $note, $expiresAt];

        if ($hasPtsUsedCol) { $bCols[] = 'points_used'; $bVals[] = $pointsUsed; }
        if ($hasBottlesCol) { $bCols[] = 'redeemed_bottles'; $bVals[] = $redeemedBottles; }
        if ($hasConsentCol && !$isWalkin) { $bCols[] = 'privacy_consent_at'; $bVals[] = date('Y-m-d H:i:s'); }
        $hasStaffCol = db_table_has_column($pdo, 'bookings', 'staff_id');
        if ($hasStaffCol && $isWalkin && isset($walkinActor['id'])) { $bCols[] = 'staff_id'; $bVals[] = (int)$walkinActor['id']; }

        $bColsSql = '`' . implode('`, `', $bCols) . '`';
        $bPhSql   = implode(', ', array_fill(0, count($bCols), '?'));
        $insertStmt = $pdo->prepare("INSERT INTO bookings ({$bColsSql}) VALUES ({$bPhSql})");
        $insertStmt->execute($bVals);
        $bookingId = (int)$pdo->lastInsertId();

        if ($pointsUsed > 0 && $userId) {
            $plStmt = $pdo->prepare("INSERT IGNORE INTO points_log (user_id, booking_id, delta, reason, created_at) VALUES (?, ?, ?, 'Đổi điểm lấy nước khi đặt sân', NOW())");
            $plStmt->execute([(int)$userId, $bookingId, -$pointsUsed]);
        }

        $staffActorId = isset($walkinActor['id']) ? (int)$walkinActor['id'] : ($userId ? (int)$userId : null);
        foreach ($cleanServices as $cs) {
            if ($cs['price'] > 0) {
                deduct_service_inventory($pdo, $cs['id'], (int)$cs['quantity'], $code, (int)$cs['price'], $paymentMethod, 'Đi kèm đơn đặt sân #' . $code, $staffActorId);
            }
        }

        $pdo->commit();

        if (!isset($_SESSION['owned_booking_codes']) || !is_array($_SESSION['owned_booking_codes'])) {
            $_SESSION['owned_booking_codes'] = [];
        }
        if (!in_array($code, $_SESSION['owned_booking_codes'], true)) {
            $_SESSION['owned_booking_codes'][] = $code;
        }

        if ($isWalkin) {
            write_audit_log($pdo, 'WALKIN_BOOKING', $code, null, "Tạo đơn tại quầy: {$pitch['name']} ({$date} {$slot['slot_time']}) - Gốc: {$originalPrice}đ - Giảm: {$discountAmount}đ - Tổng: {$totalPrice}đ - TT: {$paymentMethod}", $walkinActor ?? null);
            if ($isPastSlot) {
                write_audit_log($pdo, 'WALKIN_PAST_SLOT', $code, null, "Duyệt đặt slot quá khứ: {$slot['slot_time']} ngày {$date}. Lý do: {$pastSlotReason}", $walkinActor ?? null);
            }
        }

        $tgMsg = "⚽ <b>ĐƠN ĐẶT SÂN MỚI</b>\n"
               . "• Mã vé: <code>" . tg_escape($code) . "</code>\n"
               . "• Khách: <b>" . tg_escape($customerName) . "</b> (" . tg_escape($phone) . ")\n"
               . "• Sân: <b>" . tg_escape($pitch['name']) . "</b>\n"
               . "• Ngày đá: <b>" . date('d/m/Y', strtotime($date)) . "</b> (" . tg_escape($slot['slot_time']) . ")\n"
               . "• Tổng tiền: <b>" . number_format($totalPrice) . " đ</b> (Cọc: " . number_format($depositAmount) . " đ)\n"
               . "• Hình thức: <i>" . tg_escape($paymentMethod) . "</i>";
        send_telegram_notification($tgMsg, 'new_booking', $pdo);

        send_customer_notification($pdo, 'booking_confirm', [
            'booking_id'       => $bookingId,
            'booking_code'     => $code,
            'code'             => $code,
            'customer_name'    => $customerName,
            'phone'            => $phone,
            'pitch_name'       => $pitch['name'],
            'date'             => date('d/m/Y', strtotime($date)),
            'slot_time'        => $slot['slot_time'],
            'total_price'      => $totalPrice,
            'deposit_amount'   => $depositAmount,
            'remaining_amount' => $remainingAmount
        ]);

        $noShowCount = 0;
        try {
            $cleanPhone = preg_replace('/[^0-9]/', '', $phone);
            if ($cleanPhone !== '') {
                $nsStmt = $pdo->prepare("SELECT COUNT(*) FROM bookings WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', '') = ? AND (status = 'Khách chưa đến' OR payment_status = 'Tịch thu cọc 30%')");
                $nsStmt->execute([$cleanPhone]);
                $noShowCount = (int)$nsStmt->fetchColumn();
            }
        } catch (Exception $nsEx) {
            error_log("[NOSHOW COUNT WARN] " . $nsEx->getMessage());
        }

        json_response([
            'success' => true,
            'message' => 'Tạo đơn đặt sân thành công!',
            'data'    => [
                'id'              => $bookingId,
                'code'            => $code,
                'pitchId'         => $pitchId,
                'pitchName'       => $pitch['name'],
                'date'            => $date,
                'slotId'          => $slotId,
                'slotTime'        => $slot['slot_time'],
                'customerName'    => $customerName,
                'phone'           => $phone,
                'email'           => $email,
                'weeksCount'      => $weeksCount,
                'bookingMode'     => $bookingMode,
                'originalPrice'   => $originalPrice,
                'discountAmount'  => $discountAmount,
                'goldenHourRule'  => $appliedGoldenHourRule,
                'totalPrice'      => $totalPrice,
                'depositAmount'   => $depositAmount,
                'paidAmount'      => $paidAmount,
                'remainingAmount' => $remainingAmount,
                'status'          => $bookingStatus,
                'paymentStatus'   => $paymentStatus,
                'paymentMethod'   => $paymentMethod,
                'holdMinutes'     => $holdMinutes,
                'expiresAt'       => $expiresAt,
                'services'        => $cleanServices,
                'voucherCode'     => $appliedVoucher,
                'note'            => $note,
                'noShowCount'     => $noShowCount,
                'noShowWarning'   => ($noShowCount >= 2)
            ]
        ], 201);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("[BOOKING ERROR] " . $e->getMessage());
        json_response([
            'success'  => false,
            'message'  => 'Đã xảy ra sự cố khi xử lý đơn đặt sân. Vui lòng thử lại.',
            'ref_code' => 'ERR_CREATE_BOOKING'
        ], 500);
    }
}
