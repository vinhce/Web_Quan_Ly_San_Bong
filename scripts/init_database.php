<?php
/**
 * SÂN BÓNG PRO - TỰ ĐỘNG KHỞI TẠO CSDL (scripts/init_database.php)
 * Chạy an toàn từ CLI để tạo database và nạp schema
 */

require_once __DIR__ . '/../config/database.php';

$host = getenv('DB_HOST') ?: '127.0.0.1';
$port = getenv('DB_PORT') ?: '3306';
$user = getenv('DB_USER') ?: 'root';
$pass = getenv('DB_PASS') !== false ? getenv('DB_PASS') : '';

echo "=== ĐANG KHỞI TẠO CƠ SỞ DỮ LIỆU SÂN BÓNG PRO ===\n";

try {
    // 1. Kết nối MySQL server không chỉ định dbname trước
    $pdo = new PDO("mysql:host={$host};port={$port};charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    echo "[1/3] Đã kết nối MySQL server thành công.\n";

    // 2. Đọc file schema.sql
    $sqlFile = __DIR__ . '/../database/schema.sql';
    if (!file_exists($sqlFile)) {
        throw new Exception("Không tìm thấy file: $sqlFile");
    }
    $sql = file_get_contents($sqlFile);

    // 3. Thực thi toàn bộ lệnh SQL
    $pdo->exec($sql);
    echo "[2/3] Đã tạo CSDL `quan_ly_san_bong` và nạp schema + seed data thành công.\n";

    // 4. Kiểm tra các bảng đã tạo
    $pdo->exec("USE `quan_ly_san_bong`");
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "[3/3] Danh sách bảng hiện có: " . implode(", ", $tables) . "\n";

    echo "=== HOÀN TẤT KHỞI TẠO CSDL THÀNH CÔNG ===\n";
} catch (Exception $e) {
    echo "[LỖI]: " . $e->getMessage() . "\n";
    exit(1);
}
