<?php

require_once __DIR__ . '/security_helper.php';

secure_session_start();
$pdo = getDBConnection(false);
$method = $_SERVER['REQUEST_METHOD'];

$rawInput = file_get_contents('php://input');
$data = [];
if (!empty($rawInput)) {
    $decoded = json_decode($rawInput, true);
    if (is_array($decoded)) {
        if (isset($decoded['booking']) && is_array($decoded['booking'])) {
            $data = array_merge($decoded['booking'], $decoded);
        } else {
            $data = $decoded;
        }
    }
}
$data = array_merge($_POST, $data);
$action = $_GET['action'] ?? $data['action'] ?? '';

if ($method === 'POST' && $action === 'checkin') {
    $admin = require_admin();
    $code = sanitize_string($data['code'] ?? $_GET['code'] ?? '', 40);
    if (empty($code)) {
        json_error('Thiếu mã đơn đặt sân.', 400, 'ERR_MISSING_CODE');
    }
    if ($pdo === null) {
        json_response([
            'success' => true,
            'message' => 'Check-in nhận sân thành công! Ca đá đã bắt đầu (chờ thu phần còn lại khi kết thúc ca).',
            'data'    => ['code' => $code, 'status' => 'Đang đá', 'paymentStatus' => 'Đã cọc 30%']
        ]);
    }
    $stmt = $pdo->prepare("UPDATE bookings SET status = 'Đang đá' WHERE code = ?");
    $stmt->execute([$code]);
    json_response([
        'success' => true,
        'message' => 'Check-in nhận sân thành công! Ca đá đã bắt đầu.',
        'data'    => ['code' => $code, 'status' => 'Đang đá', 'paymentStatus' => 'Đã cọc 30%']
    ]);
}

if ($method === 'POST' && $action === 'early_cancel') {
    $code = sanitize_string($data['code'] ?? $_GET['code'] ?? '', 40);
    $policy = sanitize_string($data['policy'] ?? 'refund_100', 30);
    $reason = sanitize_string($data['reason'] ?? 'Hủy lịch trước thời hạn', 200);
    if (empty($code)) {
        json_error('Thiếu mã đơn đặt sân.', 400, 'ERR_MISSING_CODE');
    }
    $policyMap = [
        'refund_100' => 'Đã hoàn cọc 100%',
        'reserve'    => 'Bảo lưu cọc 30%',
        'forfeit_50' => 'Phạt 50% cọc'
    ];
    $payStatus = $policyMap[$policy] ?? 'Đã hoàn cọc 100%';
    if ($pdo === null) {
        json_response([
            'success' => true,
            'message' => "Đã hủy lịch đặt sân trước thời hạn ({$payStatus}).",
            'data'    => ['code' => $code, 'status' => 'Đã hủy', 'paymentStatus' => $payStatus]
        ]);
    }
    $noteSuffix = " [Hủy trước hạn - {$payStatus}: {$reason}]";
    $stmt = $pdo->prepare("UPDATE bookings SET status = 'Đã hủy', payment_status = ?, remaining_amount = 0, note = CONCAT(IFNULL(note,''), ?) WHERE code = ?");
    $stmt->execute([$payStatus, $noteSuffix, $code]);
    json_response([
        'success' => true,
        'message' => "Đã hủy lịch đặt sân trước thời hạn ({$payStatus}).",
        'data'    => ['code' => $code, 'status' => 'Đã hủy', 'paymentStatus' => $payStatus]
    ]);
}

if ($method === 'POST' && $action === 'noshow_release') {
    $admin = require_admin();
    $code = sanitize_string($data['code'] ?? $_GET['code'] ?? '', 40);
    if (empty($code)) {
        json_error('Thiếu mã đơn đặt sân.', 400, 'ERR_MISSING_CODE');
    }
    if ($pdo === null) {
        json_response([
            'success' => true,
            'message' => 'Đã đánh dấu khách chưa đến (quá 15 phút), tịch thu cọc 30% và LẬP TỨC NHẢ SÂN TRỐNG để đón khách khác!',
            'data'    => ['code' => $code, 'status' => 'Khách chưa đến', 'paymentStatus' => 'Tịch thu cọc 30%', 'released' => true]
        ]);
    }
    $stmt = $pdo->prepare("UPDATE bookings SET status = 'Khách chưa đến', payment_status = 'Tịch thu cọc 30%', note = CONCAT(IFNULL(note,''), ' [Quá 15p khách chưa đến - Đã nhả sân trống]') WHERE code = ?");
    $stmt->execute([$code]);
    json_response([
        'success' => true,
        'message' => 'Đã đánh dấu khách chưa đến (quá 15 phút), tịch thu cọc 30% và LẬP TỨC NHẢ SÂN TRỐNG để đón khách khác!',
        'data'    => ['code' => $code, 'status' => 'Khách chưa đến', 'paymentStatus' => 'Tịch thu cọc 30%', 'released' => true]
    ]);
}

if ($method === 'POST' && $action === 'restore') {
    $admin = require_admin();
    $code = sanitize_string($data['code'] ?? $_GET['code'] ?? '', 40);
    if (empty($code)) {
        json_error('Thiếu mã đơn đặt sân.', 400, 'ERR_MISSING_CODE');
    }
    if ($pdo === null) {
        json_response([
            'success' => true,
            'message' => 'Đã khôi phục lại ca đá thành công!',
            'data'    => ['code' => $code, 'status' => 'Đã xác nhận', 'paymentStatus' => 'Đã cọc 30%']
        ]);
    }
    $stmt = $pdo->prepare("UPDATE bookings SET status = 'Đã xác nhận', payment_status = 'Đã cọc 30%', remaining_amount = GREATEST(0, total_price - deposit_amount), note = CONCAT(IFNULL(note,''), ' [Đã khôi phục lại ca đá]') WHERE code = ?");
    $stmt->execute([$code]);
    json_response([
        'success' => true,
        'message' => 'Đã khôi phục lại ca đá thành công!',
        'data'    => ['code' => $code, 'status' => 'Đã xác nhận', 'paymentStatus' => 'Đã cọc 30%']
    ]);
}

if ($method === 'POST' && ($action === 'create' || empty($action))) {
    
    if (!check_rate_limit($pdo, 'create_booking', 10, 300)) {
        json_response([
            'success'  => false,
            'message'  => 'Bạn thao tác quá nhanh. Vui lòng thử lại sau vài phút.',
            'ref_code' => 'ERR_RATE_LIMITED'
        ], 429);
    }

    $customerName = sanitize_string($data['customerName'] ?? $data['customer_name'] ?? '', 100);
    $phone = sanitize_string($data['phone'] ?? '', 20);
    $email = filter_var($data['email'] ?? 'khachhang@sanbongpro.vn', FILTER_VALIDATE_EMAIL) ?: 'khachhang@sanbongpro.vn';
    $pitchId = sanitize_string($data['pitchId'] ?? $data['pitch_id'] ?? '', 20);
    $date = sanitize_string($data['date'] ?? $data['booking_date'] ?? '', 15);
    $slotId = sanitize_string($data['slotId'] ?? $data['slot_id'] ?? '', 10);
    $servicesInput = is_array($data['services'] ?? null) ? $data['services'] : [];
    $voucherCode = sanitize_string($data['voucherCode'] ?? $data['voucher_code'] ?? '', 30);
    $note = sanitize_string($data['note'] ?? '', 255);
    $paymentMethod = sanitize_string($data['paymentMethod'] ?? 'VietQR Chuyển khoản', 50);

    if (empty($customerName) || empty($phone) || empty($pitchId) || empty($date) || empty($slotId)) {
        json_response([
            'success'  => false,
            'message'  => 'Vui lòng điền đầy đủ các trường thông tin bắt buộc.',
            'ref_code' => 'ERR_MISSING_REQUIRED'
        ], 400);
    }

    $bookingDateTime = strtotime($date);
    $today = strtotime(date('Y-m-d'));
    if (!$bookingDateTime || $bookingDateTime < $today) {
        json_response([
            'success'  => false,
            'message'  => 'Ngày đặt sân không hợp lệ hoặc đã qua.',
            'ref_code' => 'ERR_INVALID_DATE'
        ], 400);
    }

    $customCode = sanitize_string($data['code'] ?? '', 40);
    $hasValidCustomCode = !empty($customCode) && preg_match('/^(ASF[FSE]?[0-9]{6,8}|DH[0-9]{6,8}|SB-?[0-9]{8}-?[A-Z0-9]{4})$/i', $customCode);
    if ($hasValidCustomCode) {
        $code = strtoupper($customCode);
    } else {
        if (stripos($pitchId, 'P5') === 0) {
            $prefix = 'ASFF';
        } elseif (stripos($pitchId, 'P11') === 0) {
            $prefix = 'ASFE';
        } else {
            $prefix = 'ASFS';
        }
        $code = $prefix . random_int(100000, 999999);
    }

    if ($pdo === null) {
                $fallbackPitches = [
            'P5-A'  => ['name' => 'Sân 5 - Sân A', 'base_price' => 250000, 'peak_price' => 350000, 'status' => 'Hoạt động'],
            'P5-B'  => ['name' => 'Sân 5 - Sân B', 'base_price' => 250000, 'peak_price' => 350000, 'status' => 'Hoạt động'],
            'P5-C'  => ['name' => 'Sân 5 - Sân C (Mới)', 'base_price' => 280000, 'peak_price' => 380000, 'status' => 'Hoạt động'],
            'P7-A'  => ['name' => 'Sân 7 - Sân A (Trung tâm)', 'base_price' => 450000, 'peak_price' => 650000, 'status' => 'Hoạt động'],
            'P7-B'  => ['name' => 'Sân 7 - Sân B', 'base_price' => 400000, 'peak_price' => 600000, 'status' => 'Hoạt động'],
            'P7-C'  => ['name' => 'Sân 7 - Sân C (VIP)', 'base_price' => 500000, 'peak_price' => 750000, 'status' => 'Hoạt động'],
            'P11-A' => ['name' => 'Sân 11 - Sân Ghép (A+B)', 'base_price' => 800000, 'peak_price' => 1200000, 'status' => 'Hoạt động'],
            'P11-B' => ['name' => 'Sân 11 - Sân Ghép (C+D)', 'base_price' => 850000, 'peak_price' => 1300000, 'status' => 'Hoạt động'],
            'P11-C' => ['name' => 'Sân 11 - Sân Trung Tâm VFF', 'base_price' => 950000, 'peak_price' => 1500000, 'status' => 'Hoạt động']
        ];
        $fallbackSlots = [
            'S01' => ['slot_time' => '05:30 - 06:30', 'is_peak' => 0, 'duration' => 1.0],
            'S02' => ['slot_time' => '06:30 - 07:30', 'is_peak' => 0, 'duration' => 1.0],
            'S03' => ['slot_time' => '07:30 - 08:30', 'is_peak' => 0, 'duration' => 1.0],
            'S04' => ['slot_time' => '08:30 - 09:30', 'is_peak' => 0, 'duration' => 1.0],
            'S05' => ['slot_time' => '09:30 - 10:30', 'is_peak' => 0, 'duration' => 1.0],
            'S06' => ['slot_time' => '14:00 - 15:00', 'is_peak' => 0, 'duration' => 1.0],
            'S07' => ['slot_time' => '15:00 - 16:00', 'is_peak' => 0, 'duration' => 1.0],
            'S08' => ['slot_time' => '16:00 - 17:00', 'is_peak' => 0, 'duration' => 1.0],
            'S09' => ['slot_time' => '17:00 - 18:00', 'is_peak' => 1, 'duration' => 1.0],
            'S10' => ['slot_time' => '17:30 - 19:00', 'is_peak' => 1, 'duration' => 1.5],
            'S11' => ['slot_time' => '18:00 - 19:00', 'is_peak' => 1, 'duration' => 1.0],
            'S12' => ['slot_time' => '19:00 - 20:00', 'is_peak' => 1, 'duration' => 1.0],
            'S13' => ['slot_time' => '19:00 - 20:30', 'is_peak' => 1, 'duration' => 1.5],
            'S14' => ['slot_time' => '20:00 - 21:00', 'is_peak' => 1, 'duration' => 1.0],
            'S15' => ['slot_time' => '20:30 - 22:00', 'is_peak' => 1, 'duration' => 1.5],
            'S16' => ['slot_time' => '21:00 - 22:00', 'is_peak' => 0, 'duration' => 1.0],
            'S17' => ['slot_time' => '21:00 - 22:30', 'is_peak' => 0, 'duration' => 1.5],
            'S18' => ['slot_time' => '22:00 - 23:00', 'is_peak' => 0, 'duration' => 1.0]
        ];
        $fallbackServices = [
            'SRV-WATER'        => 120000,
            'SRV-WATER-BOTTLE' => 10000,
            'SRV-BIB'          => 30000,
            'SRV-BALL'         => 20000,
            'SRV-REF'          => 150000
        ];
        $fallbackVouchers = [
            'WELCOME10'    => ['type' => 'percent', 'val' => 10, 'min' => 0],
            'GIAM50K'      => ['type' => 'fixed',   'val' => 50000, 'min' => 500000],
            'VIPGOLD'      => ['type' => 'percent', 'val' => 15, 'min' => 300000],
            'DATTHANG15'   => ['type' => 'percent', 'val' => 15, 'min' => 800000],
            'SINHVIEN30K'  => ['type' => 'fixed',   'val' => 30000, 'min' => 200000],
            'CUOITUAN100K' => ['type' => 'fixed',   'val' => 100000, 'min' => 900000]
        ];

        $pitch = $fallbackPitches[$pitchId] ?? null;
        $slot = $fallbackSlots[$slotId] ?? null;
        if (!$pitch || $pitch['status'] === 'Bảo trì' || !$slot) {
            json_error('Sân bóng hoặc khung giờ không hợp lệ.', 400, 'ERR_INVALID_PITCH_OR_SLOT');
        }

        $basePrice = $slot['is_peak'] ? $pitch['peak_price'] : $pitch['base_price'];
        $pitchPrice = (int)round($basePrice * $slot['duration']);
        $srvPrice = 0;
        foreach ($servicesInput as $s) {
            $sId = $s['id'] ?? '';
            $sQty = max(1, min(100, (int)($s['quantity'] ?? 1)));
            if (isset($fallbackServices[$sId])) {
                $srvPrice += $fallbackServices[$sId] * $sQty;
            }
        }
        $subtotal = $pitchPrice + $srvPrice;
        $discountAmount = 0;
        if (!empty($voucherCode) && isset($fallbackVouchers[$voucherCode])) {
            $v = $fallbackVouchers[$voucherCode];
            if ($subtotal >= $v['min']) {
                $discountAmount = ($v['type'] === 'percent')
                    ? (int)round($subtotal * ($v['val'] / 100))
                    : min($v['val'], $subtotal);
            }
        }
        $totalPrice = max(0, $subtotal - $discountAmount);
        $depositAmount = (int)round($totalPrice * 0.3);
        $remainingAmount = $totalPrice - $depositAmount;

        $expectedFile = __DIR__ . '/../logs/expected_orders.json';
        $expectedOrders = [];
        if (file_exists($expectedFile)) {
            $decodedExpected = json_decode(@file_get_contents($expectedFile), true);
            if (is_array($decodedExpected)) {
                $expectedOrders = $decodedExpected;
            }
        }
        $cleanCode = str_replace(['-', ' '], '', strtoupper($code));
        $expectedOrders[$cleanCode] = [
            'code'           => $code,
            'deposit_amount' => $depositAmount,
            'total_price'    => $totalPrice,
            'updated_at'     => date('Y-m-d H:i:s')
        ];
        @file_put_contents($expectedFile, json_encode($expectedOrders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        json_response([
            'success' => true,
            'message' => 'Tạo đơn đặt sân thành công!',
            'data'    => [
                'id'              => 0,
                'code'            => $code,
                'pitchName'       => $pitch['name'],
                'date'            => $date,
                'slotTime'        => $slot['slot_time'],
                'customerName'    => $customerName,
                'phone'           => $phone,
                'totalPrice'      => $totalPrice,
                'depositAmount'   => $depositAmount,
                'remainingAmount' => $remainingAmount,
                'paymentStatus'   => 'Chờ duyệt cọc'
            ]
        ], 201);
    }

    try {
        
        $pdo->beginTransaction();

        $pitchStmt = $pdo->prepare("SELECT id, name, type, base_price, peak_price, status FROM pitches WHERE id = ? FOR UPDATE");
        $pitchStmt->execute([$pitchId]);
        $pitch = $pitchStmt->fetch();

        if (!$pitch || $pitch['status'] === 'Bảo trì') {
            $pdo->rollBack();
            json_response([
                'success'  => false,
                'message'  => 'Sân bóng này hiện đang bảo trì hoặc không tồn tại.',
                'ref_code' => 'ERR_PITCH_UNAVAILABLE'
            ], 400);
        }

        $slotStmt = $pdo->prepare("SELECT id, slot_time, is_peak, duration FROM time_slots WHERE id = ?");
        $slotStmt->execute([$slotId]);
        $slot = $slotStmt->fetch();

        if (!$slot) {
            $pdo->rollBack();
            json_response([
                'success'  => false,
                'message'  => 'Khung giờ đặt không hợp lệ.',
                'ref_code' => 'ERR_INVALID_SLOT'
            ], 400);
        }

        $isPeak = (bool)$slot['is_peak'];
        $basePrice = $isPeak ? (int)$pitch['peak_price'] : (int)$pitch['base_price'];
        $duration = (float)$slot['duration'];
        $pitchPrice = (int)round($basePrice * ($duration ?: 1.0));

        $totalServicesPrice = 0;
        $cleanServices = [];
        if (!empty($servicesInput)) {
            $serviceIds = array_column($servicesInput, 'id');
            if (!empty($serviceIds)) {
                $placeholders = implode(',', array_fill(0, count($serviceIds), '?'));
                $srvStmt = $pdo->prepare("SELECT id, name, price, unit FROM extra_services WHERE id IN ($placeholders)");
                $srvStmt->execute($serviceIds);
                $dbServices = $srvStmt->fetchAll(PDO::FETCH_UNIQUE);

                foreach ($servicesInput as $s) {
                    $sId = $s['id'] ?? '';
                    $sQty = max(1, min(100, (int)($s['quantity'] ?? 1)));
                    if (isset($dbServices[$sId])) {
                        $cost = (int)$dbServices[$sId]['price'] * $sQty;
                        $totalServicesPrice += $cost;
                        $cleanServices[] = [
                            'id'       => $sId,
                            'name'     => $dbServices[$sId]['name'],
                            'price'    => (int)$dbServices[$sId]['price'],
                            'quantity' => $sQty,
                            'unit'     => $dbServices[$sId]['unit'],
                            'total'    => $cost
                        ];
                    }
                }
            }
        }

        $subtotal = $pitchPrice + $totalServicesPrice;

        $discountAmount = 0;
        $appliedVoucher = null;
        if (!empty($voucherCode)) {
            $vStmt = $pdo->prepare("SELECT code, discount_type, discount_value, min_order, is_active FROM vouchers WHERE code = ? AND is_active = 1");
            $vStmt->execute([$voucherCode]);
            $vData = $vStmt->fetch();
            if ($vData && $subtotal >= (int)$vData['min_order']) {
                if ($vData['discount_type'] === 'percent') {
                    $discountAmount = (int)round($subtotal * ((int)$vData['discount_value'] / 100));
                } else {
                    $discountAmount = min((int)$vData['discount_value'], $subtotal);
                }
                $appliedVoucher = $vData['code'];
            }
        }

        $totalPrice = max(0, $subtotal - $discountAmount);
        $depositAmount = (int)round($totalPrice * 0.3); 
        $remainingAmount = $totalPrice - $depositAmount;

        $expectedFile = __DIR__ . '/../logs/expected_orders.json';
        $expectedOrders = [];
        if (file_exists($expectedFile)) {
            $decodedExpected = json_decode(@file_get_contents($expectedFile), true);
            if (is_array($decodedExpected)) {
                $expectedOrders = $decodedExpected;
            }
        }
        $cleanCode = str_replace(['-', ' '], '', strtoupper($code));
        $expectedOrders[$cleanCode] = [
            'code'           => $code,
            'deposit_amount' => $depositAmount,
            'total_price'    => $totalPrice,
            'updated_at'     => date('Y-m-d H:i:s')
        ];
        @file_put_contents($expectedFile, json_encode($expectedOrders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        $checkDuplicateStmt = $pdo->prepare("SELECT id, code, deposit_amount, payment_status FROM bookings WHERE pitch_id = ? AND booking_date = ? AND slot_id = ? AND payment_status NOT IN ('Đã hủy', 'Tịch thu cọc 30%') FOR UPDATE");
        $checkDuplicateStmt->execute([$pitchId, $date, $slotId]);
        $existingBooking = $checkDuplicateStmt->fetch();

        $userId = $_SESSION['user_id'] ?? null;
        $servicesJson = json_encode($cleanServices, JSON_UNESCAPED_UNICODE);

        if ($existingBooking) {
            if ($existingBooking['payment_status'] !== 'Chờ duyệt cọc' && !$hasValidCustomCode) {
                $pdo->rollBack();
                json_response([
                    'success'  => false,
                    'message'  => 'Khung giờ này vừa có khách đặt trước! Vui lòng chọn khung giờ khác.',
                    'ref_code' => 'ERR_DOUBLE_BOOKING'
                ], 409);
            }

            $updatePendingStmt = $pdo->prepare("UPDATE bookings SET code = ?, user_id = ?, customer_name = ?, phone = ?, email = ?, slot_time = ?, services_json = ?, voucher_code = ?, total_price = ?, deposit_amount = ?, remaining_amount = ?, payment_status = 'Chờ duyệt cọc', payment_method = ?, note = ?, created_at = NOW() WHERE id = ?");
            $updatePendingStmt->execute([
                $code,
                $userId,
                $customerName,
                $phone,
                $email,
                $slot['slot_time'],
                $servicesJson,
                $appliedVoucher,
                $totalPrice,
                $depositAmount,
                $remainingAmount,
                $paymentMethod,
                $note,
                $existingBooking['id']
            ]);
            $bookingId = $existingBooking['id'];
        } else {
            
            $insertStmt = $pdo->prepare("INSERT INTO bookings 
                (code, user_id, customer_name, phone, email, pitch_id, booking_date, slot_id, slot_time, services_json, voucher_code, total_price, deposit_amount, remaining_amount, payment_status, payment_method, note) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Chờ duyệt cọc', ?, ?)");

            $insertStmt->execute([
                $code,
                $userId,
                $customerName,
                $phone,
                $email,
                $pitchId,
                $date,
                $slotId,
                $slot['slot_time'],
                $servicesJson,
                $appliedVoucher,
                $totalPrice,
                $depositAmount,
                $remainingAmount,
                $paymentMethod,
                $note
            ]);

            $bookingId = $pdo->lastInsertId();
        }

        $pdo->commit();

        json_response([
            'success' => true,
            'message' => 'Tạo đơn đặt sân thành công!',
            'data'    => [
                'id'              => $bookingId,
                'code'            => $code,
                'pitchName'       => $pitch['name'],
                'date'            => $date,
                'slotTime'        => $slot['slot_time'],
                'customerName'    => $customerName,
                'phone'           => $phone,
                'totalPrice'      => $totalPrice,
                'depositAmount'   => $depositAmount,
                'remainingAmount' => $remainingAmount,
                'paymentStatus'   => 'Chờ duyệt cọc'
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

if ($method === 'GET') {
    $code = sanitize_string($_GET['code'] ?? '', 40);

    if (!empty($code)) {
        if ($pdo === null) {
            json_error('Không tìm thấy đơn đặt sân tương ứng.', 404, 'ERR_NOT_FOUND');
        }
        $stmt = $pdo->prepare("SELECT b.*, p.name as pitch_name, p.type_name, p.variant 
                               FROM bookings b 
                               JOIN pitches p ON b.pitch_id = p.id 
                               WHERE b.code = ? LIMIT 1");
        $stmt->execute([$code]);
        $booking = $stmt->fetch();

        if (!$booking) {
            json_response([
                'success'  => false,
                'message'  => 'Không tìm thấy đơn đặt sân tương ứng.',
                'ref_code' => 'ERR_NOT_FOUND'
            ], 404);
        }

        $currentUser = $_SESSION['user'] ?? null;
        if ($currentUser && $currentUser['role'] !== 'admin') {
            if ($booking['user_id'] && $booking['user_id'] != $currentUser['id'] && $booking['phone'] !== $currentUser['phone']) {
                json_response([
                    'success'  => false,
                    'message'  => 'Bạn không có quyền xem thông tin đơn đặt sân của khách hàng khác.',
                    'ref_code' => 'ERR_IDOR_BLOCKED'
                ], 403);
            }
        } elseif (!$currentUser) {
            
            if (!empty($booking['phone']) && strlen($booking['phone']) >= 7) {
                $booking['phone'] = substr($booking['phone'], 0, 4) . '***' . substr($booking['phone'], -3);
            }
            if (!empty($booking['email']) && strpos($booking['email'], '@') !== false) {
                $parts = explode('@', $booking['email']);
                $booking['email'] = substr($parts[0], 0, 1) . '***@' . $parts[1];
            }
        }

        $booking['services'] = !empty($booking['services_json']) ? json_decode($booking['services_json'], true) : [];
        unset($booking['services_json']);

        json_response([
            'success' => true,
            'data'    => $booking
        ]);
    }

    if ($action === 'admin_list' || $action === 'today_bookings') {
        $admin = require_admin();
        if ($pdo === null) {
            json_response(['success' => true, 'data' => []]);
        }
        $filterDate = sanitize_string($_GET['date'] ?? date('Y-m-d'), 15);
        $stmt = $pdo->prepare("SELECT b.*, p.name as pitch_name, p.type_name, p.variant 
                               FROM bookings b 
                               JOIN pitches p ON b.pitch_id = p.id 
                               WHERE b.booking_date = ? 
                               ORDER BY b.id DESC");
        $stmt->execute([$filterDate]);
        $list = $stmt->fetchAll();
        foreach ($list as &$item) {
            $item['services'] = !empty($item['services_json']) ? json_decode($item['services_json'], true) : [];
            unset($item['services_json']);
        }
        json_response(['success' => true, 'data' => $list]);
    }

    $currentUser = require_auth();
    if ($pdo === null) {
        json_response([
            'success' => true,
            'data'    => []
        ]);
    }
    $stmt = $pdo->prepare("SELECT b.*, p.name as pitch_name, p.type_name, p.variant 
                           FROM bookings b 
                           JOIN pitches p ON b.pitch_id = p.id 
                           WHERE b.user_id = ? OR b.phone = ? 
                           ORDER BY b.id DESC LIMIT 50");
    $stmt->execute([$currentUser['id'], $currentUser['phone']]);
    $list = $stmt->fetchAll();

    foreach ($list as &$item) {
        $item['services'] = !empty($item['services_json']) ? json_decode($item['services_json'], true) : [];
        unset($item['services_json']);
    }

    json_response([
        'success' => true,
        'data'    => $list
    ]);
}

json_response([
    'success'  => false,
    'message'  => 'Phương thức không được hỗ trợ.',
    'ref_code' => 'ERR_METHOD_NOT_ALLOWED'
], 405);
