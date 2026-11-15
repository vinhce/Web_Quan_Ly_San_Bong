<?php
if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('Forbidden: CLI only');
}
require_once __DIR__ . '/config/database.php';
$pdo = getDBConnection(false);
if ($pdo) {
    echo "=== THỐNG KÊ THEO STATUS TRONG BẢNG PITCHES ===\n";
    $statusGroup = $pdo->query("SELECT status, COUNT(*) as count FROM pitches GROUP BY status")->fetchAll();
    foreach ($statusGroup as $row) {
        echo "Status: '{$row['status']}' -> {$row['count']} sân\n";
    }

    echo "\n=== DANH SÁCH TOÀN BỘ 20 SÂN ===\n";
    $stmt = $pdo->query("SELECT id, name, type, type_name as typeName, status FROM pitches ORDER BY type ASC, id ASC");
    $pitches = $stmt->fetchAll();
    echo "Total pitches from DB: " . count($pitches) . "\n";
    foreach ($pitches as $p) {
        echo " - " . $p['id'] . ": " . $p['name'] . " (" . $p['typeName'] . ") - Status: [" . $p['status'] . "]\n";
    }
} else {
    echo "No DB connection\n";
}

