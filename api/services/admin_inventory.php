<?php
declare(strict_types=1);

if (!defined('SANBONG_ADMIN_ROUTER')) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'Direct access forbidden.', 'ref_code' => 'ERR_FORBIDDEN'], JSON_UNESCAPED_UNICODE);
    exit;
}

function handle_admin_inventory(PDO $pdo, string $action, string $method, array $data, array $actor): void {
    if ($method === 'GET') {
        $srvStmt = $pdo->query("SELECT id, name, price, unit, icon, stock_qty as stockQty, min_stock_warning as minStockWarning, track_inventory as trackInventory, is_active as isActive FROM extra_services WHERE is_active = 1 ORDER BY price ASC");
        $services = $srvStmt->fetchAll();
        $lowStockCount = 0;
        foreach ($services as &$srv) {
            $srv['price']           = (int)$srv['price'];
            $srv['stockQty']        = (int)($srv['stockQty'] ?? 100);
            $srv['minStockWarning'] = (int)($srv['minStockWarning'] ?? 10);
            $srv['trackInventory']  = (bool)($srv['trackInventory'] ?? true);
            $srv['isActive']        = (bool)($srv['isActive'] ?? true);
            $srv['lowStock']        = ($srv['trackInventory'] && $srv['stockQty'] <= $srv['minStockWarning']);
            if ($srv['lowStock']) {
                $lowStockCount++;
            }
        }

        $salesStmt = $pdo->query("SELECT * FROM service_sales ORDER BY id DESC LIMIT 30");
        $recentSales = $salesStmt ? $salesStmt->fetchAll() : [];

        json_response([
            'success' => true,
            'data'    => [
                'services'      => $services,
                'recentSales'   => $recentSales,
                'lowStockCount' => $lowStockCount
            ]
        ]);
    }

    if ($method === 'POST') {
        $subAction = sanitize_string($data['sub_action'] ?? ($action === 'counter_sale' ? 'sell_counter' : ''), 30);

        if ($subAction === 'sell_counter') {
            $serviceId = sanitize_string($data['service_id'] ?? $data['id'] ?? '', 30);
            $qty = max(1, (int)($data['quantity'] ?? 1));
            $payMethod = sanitize_string($data['payment_method'] ?? 'Tiền mặt tại quầy', 50);
            $bookingCode = sanitize_string($data['booking_code'] ?? '', 40);
            $note = sanitize_string($data['note'] ?? 'Bán lẻ trực tiếp tại quầy', 200);

            $pdo->beginTransaction();
            try {
                $srvStmt = $pdo->prepare("SELECT * FROM extra_services WHERE id = ? AND is_active = 1 LIMIT 1 FOR UPDATE");
                $srvStmt->execute([$serviceId]);
                $srv = $srvStmt->fetch();
                if (!$srv) {
                    $pdo->rollBack();
                    json_error('Không tìm thấy dịch vụ/sản phẩm trong kho.', 404, 'ERR_SERVICE_NOT_FOUND');
                }

                $oldStock = (int)($srv['stock_qty'] ?? 0);
                $trackInv = (int)($srv['track_inventory'] ?? 1) === 1;
                if ($trackInv && $oldStock < $qty) {
                    $pdo->rollBack();
                    json_error("Kho không đủ hàng! {$srv['name']} hiện chỉ còn {$oldStock} {$srv['unit']}.", 409, 'ERR_OUT_OF_STOCK');
                }

                $unitPrice = (int)$srv['price'];
                $totalAmount = $unitPrice * $qty;
                deduct_service_inventory(
                    $pdo,
                    $serviceId,
                    $qty,
                    $bookingCode !== '' ? $bookingCode : null,
                    $unitPrice,
                    $payMethod,
                    $note,
                    $actor['id'] ?? null
                );

                $newStock = $trackInv ? max(0, $oldStock - $qty) : $oldStock;
                write_audit_log(
                    $pdo,
                    'COUNTER_SALE',
                    $serviceId,
                    "Tồn cũ: {$oldStock}",
                    "Bán {$qty} {$srv['unit']} ({$totalAmount}đ - {$payMethod}) - Tồn mới: {$newStock}",
                    $actor
                );
                $pdo->commit();
            } catch (Throwable $saleEx) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                throw $saleEx;
            }

            json_response([
                'success' => true,
                'message' => "Đã xuất bán {$qty} {$srv['unit']} {$srv['name']} (" . number_format($totalAmount, 0, ',', '.') . "đ) thành công!",
                'data'    => [
                    'service_id'   => $serviceId,
                    'new_stock'    => $newStock,
                    'total_amount' => $totalAmount
                ]
            ]);
        }

        if ($subAction === 'restock') {
            $mgr = require_manager_or_admin($pdo);
            $serviceId = sanitize_string($data['service_id'] ?? $data['id'] ?? '', 30);
            $addQty = max(1, (int)($data['add_qty'] ?? $data['added_qty'] ?? $data['quantity'] ?? 1));
            $note = sanitize_string($data['note'] ?? '', 200);

            $srvStmt = $pdo->prepare("SELECT * FROM extra_services WHERE id = ? LIMIT 1");
            $srvStmt->execute([$serviceId]);
            $srv = $srvStmt->fetch();
            if (!$srv) {
                json_error('Không tìm thấy sản phẩm cần nhập kho.', 404, 'ERR_SERVICE_NOT_FOUND');
            }

            $oldStock = (int)($srv['stock_qty'] ?? 0);
            $newStock = $oldStock + $addQty;
            $updStmt = $pdo->prepare("UPDATE extra_services SET stock_qty = ?, track_inventory = 1 WHERE id = ?");
            $updStmt->execute([$newStock, $serviceId]);

            write_audit_log(
                $pdo,
                'INVENTORY_RESTOCK',
                $serviceId,
                "Tồn cũ: {$oldStock}",
                "Nhập kho +{$addQty} {$srv['unit']} -> Tồn mới: {$newStock}" . ($note ? " ({$note})" : ""),
                $mgr
            );

            json_response([
                'success' => true,
                'message' => "Đã nhập thêm +{$addQty} {$srv['unit']} {$srv['name']}. Tồn kho mới: {$newStock}!",
                'data'    => ['service_id' => $serviceId, 'stock_qty' => $newStock]
            ]);
        }

        if ($subAction === 'save_service' || $subAction === 'upsert') {
            $mgr = require_manager_or_admin($pdo);
            $srvId = strtoupper(sanitize_string($data['id'] ?? $data['service_id'] ?? '', 30));
            if (empty($srvId)) {
                $srvId = 'SRV-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));
            }
            $name = sanitize_string($data['name'] ?? '', 150);
            $price = max(0, (int)($data['price'] ?? 0));
            $unit = sanitize_string($data['unit'] ?? 'cái', 30);
            $icon = sanitize_string($data['icon'] ?? 'droplet', 30);
            $stockQty = max(0, (int)($data['stock_qty'] ?? $data['stockQty'] ?? 50));
            $minWarning = max(0, (int)($data['min_stock_warning'] ?? $data['minStockWarning'] ?? 10));
            $trackInvRaw = $data['track_inventory'] ?? $data['trackInventory'] ?? 1;
            $trackInv = ((int)$trackInvRaw || $trackInvRaw === true || $trackInvRaw === 'true') ? 1 : 0;

            if (empty($name)) {
                json_error('Tên dịch vụ/sản phẩm không được để trống.', 400, 'ERR_EMPTY_NAME');
            }

            $oldStmt = $pdo->prepare("SELECT * FROM extra_services WHERE id = ? LIMIT 1");
            $oldStmt->execute([$srvId]);
            $oldSrv = $oldStmt->fetch() ?: null;

            $upsert = $pdo->prepare("INSERT INTO extra_services (id, name, price, unit, icon, stock_qty, min_stock_warning, track_inventory, is_active)
                                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
                                     ON DUPLICATE KEY UPDATE
                                     name = VALUES(name), price = VALUES(price), unit = VALUES(unit), icon = VALUES(icon),
                                     stock_qty = VALUES(stock_qty), min_stock_warning = VALUES(min_stock_warning),
                                     track_inventory = VALUES(track_inventory), is_active = 1");
            $upsert->execute([$srvId, $name, $price, $unit, $icon, $stockQty, $minWarning, $trackInv]);

            write_audit_log($pdo, 'SERVICE_UPSERT', $srvId, $oldSrv, [
                'id' => $srvId, 'name' => $name, 'price' => $price, 'unit' => $unit, 'stock_qty' => $stockQty
            ], $mgr);

            json_response([
                'success' => true,
                'message' => "Đã lưu dịch vụ {$name} thành công!",
                'data'    => ['id' => $srvId, 'name' => $name, 'price' => $price, 'unit' => $unit, 'stockQty' => $stockQty]
            ]);
        }

        if ($subAction === 'delete_service') {
            $mgr = require_manager_or_admin($pdo);
            $srvId = sanitize_string($data['id'] ?? $data['service_id'] ?? '', 30);
            if (empty($srvId)) {
                json_error('Thiếu mã dịch vụ cần xóa.', 400, 'ERR_MISSING_ID');
            }
            $oldStmt = $pdo->prepare("SELECT * FROM extra_services WHERE id = ? LIMIT 1");
            $oldStmt->execute([$srvId]);
            $oldSrv = $oldStmt->fetch() ?: null;
            if (!$oldSrv) {
                json_error('Không tìm thấy dịch vụ tương ứng.', 404, 'ERR_SERVICE_NOT_FOUND');
            }

            $saleCheck = $pdo->prepare("SELECT COUNT(*) FROM service_sales WHERE service_id = ?");
            $saleCheck->execute([$srvId]);
            if ((int)$saleCheck->fetchColumn() > 0) {
                json_error('Dịch vụ này đã có lịch sử giao dịch bán hàng! Không được phép xóa dịch vụ đã phát sinh doanh thu.', 400, 'ERR_SERVICE_HAS_SALES_HISTORY');
            }

            $delStmt = $pdo->prepare("UPDATE extra_services SET is_active = 0 WHERE id = ?");
            $delStmt->execute([$srvId]);

            write_audit_log($pdo, 'SERVICE_DELETE', $srvId, $oldSrv, 'Đã ngừng kinh doanh (is_active = 0)', $mgr);

            json_response(['success' => true, 'message' => "Đã ngừng kinh doanh dịch vụ {$srvId}."]);
        }

        json_error('Hành động kho dịch vụ không hợp lệ.', 400, 'ERR_INVALID_ACTION');
    }
}
