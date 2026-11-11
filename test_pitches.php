<?php
if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('Forbidden: CLI only');
}
$_GET['all'] = 1;
require_once __DIR__ . '/config/database.php';
$pdo = getDBConnection(false);
if ($pdo) {
    $stmt = $pdo->query("SELECT id, name, type, type_name as typeName FROM pitches ORDER BY type ASC, id ASC");
    $pitches = $stmt->fetchAll();
    echo "Total pitches from DB: " . count($pitches) . "\n";
    foreach ($pitches as $p) {
        echo " - " . $p['id'] . ": " . $p['name'] . " (" . $p['typeName'] . ")\n";
    }
} else {
    echo "No DB connection\n";
}
