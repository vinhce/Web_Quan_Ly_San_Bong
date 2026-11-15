<?php
declare(strict_types=1);

ini_set('display_errors', '1');
error_reporting(E_ALL);

try {
    require_once __DIR__ . '/../config/database.php';
    require_once __DIR__ . '/../api/security_helper.php';
    require_once __DIR__ . '/../api/services/AdminLogService.php';

    $pdo = getDBConnection(false);

    echo "=== KẾT QUẢ THỰC NGHIỆM CHẨN ĐOÁN GIAI ĐOẠN 0 ===" . PHP_EOL . PHP_EOL;

    // 0. Cấu trúc cột thực tế của audit_logs
    echo "0. CẤU TRÚC CỘT THỰC TẾ TRONG BẢNG audit_logs:" . PHP_EOL;
    $cols = $pdo->query("DESCRIBE audit_logs")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($cols as $c) {
        echo "   - {$c['Field']} : {$c['Type']}" . PHP_EOL;
    }
    echo PHP_EOL;

    // 1. Kiểm tra Trigger và Quyền DB
    echo "1. KIỂM TRA TÍNH BẤT BIẾN TẦNG DATABASE:" . PHP_EOL;
    $triggers = $pdo->query("SHOW TRIGGERS LIKE 'audit_logs'")->fetchAll(PDO::FETCH_ASSOC);
    echo "   - Số lượng trigger trên bảng audit_logs: " . count($triggers) . " trigger." . PHP_EOL;

    $sampleLog = $pdo->query("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
    if ($sampleLog) {
        $stmt = $pdo->prepare("UPDATE audit_logs SET action = action WHERE id = ?");
        $res = $stmt->execute([$sampleLog['id']]);
        echo "   - Thử UPDATE trực tiếp vào audit_logs: " . ($res ? "THÀNH CÔNG (DB HOÀN TOÀN KHÔNG CHẶN, CHỈ LÀ NHÃN TRÊN UI)" : "BỊ CHẶN") . PHP_EOL;
    }

    // 2. Kiểm tra lưu giá trong api/admin_ops.php
    echo PHP_EOL . "2. KIỂM TRA CODE LƯU BẢNG GIÁ (api/admin_ops.php):" . PHP_EOL;
    $adminOpsCode = file_get_contents(__DIR__ . '/../api/admin_ops.php');
    if (preg_match('/write_audit_log\([^)]+\)/', $adminOpsCode, $m)) {
        echo "   - Đoạn gọi ghi log trong admin_ops.php: " . $m[0] . PHP_EOL;
    }

    // 3. Phân tích các bản ghi UPDATE_PRICING
    echo PHP_EOL . "3. CÁC BẢN GHI LOG GẦN NHẤT CỦA 'UPDATE_PRICING':" . PHP_EOL;
    $pricingLogs = $pdo->query("SELECT * FROM audit_logs WHERE action = 'UPDATE_PRICING' ORDER BY id DESC LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($pricingLogs as $pl) {
        echo "   - [ID: #{$pl['id']}] action: {$pl['action']} | target_type: '{$pl['target_type']}' | target_id: '{$pl['target_id']}' | IP: '{$pl['ip']}' | time: {$pl['created_at']}" . PHP_EOL;
        echo "     old_value: " . mb_substr($pl['old_value'] ?? 'NULL', 0, 70) . "..." . PHP_EOL;
        echo "     new_value: " . mb_substr($pl['new_value'] ?? 'NULL', 0, 70) . "..." . PHP_EOL;
    }

    // 4. Thử nghiệm các thao tác khác qua AdminLogService::record
    echo PHP_EOL . "4. THỰC NGHIỆM GHI LOG CỦA CÁC THAO TÁC KHÁC:" . PHP_EOL;
    $c1 = (int)$pdo->query("SELECT COUNT(*) FROM audit_logs")->fetchColumn();
    AdminLogService::record($pdo, 1, 'MEMBER_ADJUST_POINTS', 'user', '1', ['points' => 100], ['points' => 150], '127.0.0.1');
    $c2 = (int)$pdo->query("SELECT COUNT(*) FROM audit_logs")->fetchColumn();
    echo "   - Điều chỉnh điểm 1 lần: sinh ra " . ($c2 - $c1) . " dòng log." . PHP_EOL;

    $c3 = (int)$pdo->query("SELECT COUNT(*) FROM audit_logs")->fetchColumn();
    AdminLogService::record($pdo, 1, 'MEMBER_UPDATE', 'user', '1', ['full_name' => 'A'], ['full_name' => 'B'], '127.0.0.1');
    $c4 = (int)$pdo->query("SELECT COUNT(*) FROM audit_logs")->fetchColumn();
    echo "   - Sửa thông tin hội viên 1 lần: sinh ra " . ($c4 - $c3) . " dòng log." . PHP_EOL;

    // Xem log mới tạo
    $latest = $pdo->query("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 2")->fetchAll(PDO::FETCH_ASSOC);
    echo PHP_EOL . "5. ĐỊNH DẠNG LOG CHUẨN CỦA AdminLogService::record VỪA GHI:" . PHP_EOL;
    foreach ($latest as $row) {
        echo "   - [ID: #{$row['id']}] {$row['action']} | target: {$row['target_type']} #{$row['target_id']} | IP: {$row['ip']} | time: {$row['created_at']}" . PHP_EOL;
        echo "     old: {$row['old_value']} | new: {$row['new_value']}" . PHP_EOL;
    }

} catch (Throwable $t) {
    echo "LỖI: " . $t->getMessage() . " tại dòng " . $t->getLine() . PHP_EOL;
}
