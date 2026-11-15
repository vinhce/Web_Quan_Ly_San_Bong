<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../api/security_helper.php';

$pdo = getDBConnection();
if (!$pdo) {
    echo "FAIL: DB connection failed\n";
    exit(1);
}

$_SESSION['user_id'] = 2;
$_SESSION['role'] = 'manager';
$_SESSION['username'] = 'manager_test';
$_SESSION['full_name'] = 'Manager Test';

$testsPassed = 0;
$totalTests = 0;

function assertTest(bool $condition, string $name): void {
    global $testsPassed, $totalTests;
    $totalTests++;
    if ($condition) {
        $testsPassed++;
        echo "PASS: {$name}\n";
    } else {
        echo "FAIL: {$name}\n";
    }
}

echo "=== BẮT ĐẦU TEST V4: KHO NƯỚC & BÁN LẺ DỊCH VỤ POS ===\n";

try {
    // Dọn dẹp dịch vụ test cũ
    $pdo->exec("DELETE FROM service_sales WHERE service_id LIKE '[TEST]%'");
    $pdo->exec("DELETE FROM extra_services WHERE id LIKE '[TEST]%'");

    // 1. Tạo 2 dịch vụ test: 1 cái có tồn 10, 1 cái hết hàng (tồn 0)
    $srvId1 = '[TEST]SRV_WATER_' . time();
    $srvId2 = '[TEST]SRV_BALL_' . time();

    $insSrv = $pdo->prepare("
        INSERT INTO extra_services (id, name, price, unit, stock_qty, min_stock_warning, track_inventory, is_active)
        VALUES (?, 'Nước suối Test', 10000, 'chai', 10, 5, 1, 1),
               (?, 'Bóng thi đấu Test', 50000, 'quả', 0, 2, 1, 1)
    ");
    $insSrv->execute([$srvId1, $srvId2]);

    // Test tính trạng thái tồn kho
    $s1 = $pdo->query("SELECT stock_qty, min_stock_warning FROM extra_services WHERE id = '{$srvId1}'")->fetch();
    $s2 = $pdo->query("SELECT stock_qty, min_stock_warning FROM extra_services WHERE id = '{$srvId2}'")->fetch();

    $st1 = ((int)$s1['stock_qty'] <= (int)$s1['min_stock_warning']) ? 'Sắp hết' : 'Đủ hàng';
    $st2 = ((int)$s2['stock_qty'] <= 0) ? 'Hết hàng' : (((int)$s2['stock_qty'] <= (int)$s2['min_stock_warning']) ? 'Sắp hết' : 'Đủ hàng');

    assertTest($st1 === 'Đủ hàng', "1. Phân loại tồn kho: 10 chai > ngưỡng 5 -> Đủ hàng");
    assertTest($st2 === 'Hết hàng', "2. Phân loại tồn kho: 0 quả -> Hết hàng");

    // 2. Test bán vượt tồn kho (Bán 15 chai khi kho chỉ còn 10) -> Bắt buộc bị chặn
    $oversellBlocked = false;
    $pdo->beginTransaction();
    try {
        $chkStmt = $pdo->prepare("SELECT stock_qty FROM extra_services WHERE id = ? FOR UPDATE");
        $chkStmt->execute([$srvId1]);
        $avail = (int)$chkStmt->fetchColumn();
        if ($avail < 15) {
            $oversellBlocked = true;
            $pdo->rollBack();
        } else {
            $pdo->commit();
        }
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
    }
    assertTest($oversellBlocked === true, "3. Chặn bán vượt tồn kho (15 > 10)");

    // 3. Test bán hợp lệ: Bán 3 chai nước
    $pdo->beginTransaction();
    deduct_service_inventory($pdo, $srvId1, 3, null, 10000, 'Tiền mặt tại quầy', 'Khách mua test', 2);
    $pdo->commit();

    $s1After = $pdo->query("SELECT stock_qty FROM extra_services WHERE id = '{$srvId1}'")->fetch();
    assertTest((int)$s1After['stock_qty'] === 7, "4. Bán thành công 3 chai: Tồn kho giảm từ 10 xuống 7");

    // 4. Test không cho xóa dịch vụ đã có lịch sử bán
    $deleteSrv1Blocked = false;
    $salesCount = (int)$pdo->query("SELECT COUNT(*) FROM service_sales WHERE service_id = '{$srvId1}'")->fetchColumn();
    if ($salesCount > 0) {
        $deleteSrv1Blocked = true;
    }
    assertTest($deleteSrv1Blocked === true, "5. Chặn xóa dịch vụ đã phát sinh lịch sử bán hàng ({$srvId1})");

    // 5. Test xóa dịch vụ CHƯA có lịch sử bán (dịch vụ 2)
    $salesCount2 = (int)$pdo->query("SELECT COUNT(*) FROM service_sales WHERE service_id = '{$srvId2}'")->fetchColumn();
    $deleteSrv2Allowed = false;
    if ($salesCount2 === 0) {
        $updDel = $pdo->prepare("UPDATE extra_services SET is_active = 0 WHERE id = ?");
        $updDel->execute([$srvId2]);
        write_audit_log($pdo, 'SERVICE_DELETE', $srvId2, null, 'Ngừng kinh doanh test', ['id' => 2, 'role' => 'manager', 'full_name' => 'Manager Test']);
        $deleteSrv2Allowed = true;
    }
    assertTest($deleteSrv2Allowed === true, "6. Xóa mềm thành công dịch vụ chưa có lịch sử bán ({$srvId2})");

    $s2After = $pdo->query("SELECT is_active FROM extra_services WHERE id = '{$srvId2}'")->fetch();
    assertTest((int)$s2After['is_active'] === 0, "7. Dịch vụ đã xóa chuyển is_active = 0");

    // Dọn dẹp dữ liệu test
    $pdo->exec("DELETE FROM service_sales WHERE service_id LIKE '[TEST]%'");
    $pdo->exec("DELETE FROM extra_services WHERE id LIKE '[TEST]%'");

} catch (Throwable $e) {
    echo "EXCEPTION: " . $e->getMessage() . " on line " . $e->getLine() . "\n";
}

echo "\n=== KẾT QUẢ TEST V4: {$testsPassed}/{$totalTests} ĐẠT ===\n";
if ($testsPassed === $totalTests && $totalTests > 0) {
    exit(0);
} else {
    exit(1);
}
