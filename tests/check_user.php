<?php
require_once __DIR__ . '/../config/database.php';
$pdo = getDBConnection();
$s = $pdo->query("SELECT id, username, role, full_name, phone, status FROM users WHERE username = 'vxyen0801'");
print_r($s->fetchAll(PDO::FETCH_ASSOC));
