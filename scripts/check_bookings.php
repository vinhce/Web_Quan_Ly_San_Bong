<?php
$pdo = new PDO('mysql:host=localhost;dbname=quan_ly_san_bong;charset=utf8mb4', 'root', '');
$stmt = $pdo->query('SELECT code, customer_name, deposit_amount, payment_status FROM bookings');
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
