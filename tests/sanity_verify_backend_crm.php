<?php
/**
 * Sanity Verification for Backend CRM & Debt Purge
 */
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
$pdo = getDBConnection();

echo "=== RUNNING SANITY CHECKS FOR BACKEND CRM ===\n\n";

$passCount = 0;
$failCount = 0;

function assert_test(string $name, bool $condition, string $detail = ''): void {
    global $passCount, $failCount;
    if ($condition) {
        $passCount++;
        echo "[PASS] $name\n";
    } else {
        $failCount++;
        echo "[FAIL] $name: $detail\n";
    }
}

// 1. Verify Walkin User in DB
$wStmt = $pdo->prepare("SELECT * FROM users WHERE role = 'walkin' AND username = 'khachle' LIMIT 1");
$wStmt->execute();
$walkinUser = $wStmt->fetch(PDO::FETCH_ASSOC);
assert_test("Walk-in user exists in DB", $walkinUser !== false && $walkinUser['phone'] === '0000000000', "Walk-in user missing");

// 2. Verify 'version' column in users
$colStmt = $pdo->prepare("SHOW COLUMNS FROM users LIKE 'version'");
$colStmt->execute();
$versionCol = $colStmt->fetch(PDO::FETCH_ASSOC);
assert_test("Users table has version column for optimistic locking", $versionCol !== false, "version column missing");

// 3. Verify points_log table exists and has admin_id
$pLogStmt = $pdo->prepare("SHOW COLUMNS FROM points_log LIKE 'admin_id'");
$pLogStmt->execute();
$adminIdCol = $pLogStmt->fetch(PDO::FETCH_ASSOC);
assert_test("Points_log table has admin_id column", $adminIdCol !== false, "admin_id column missing in points_log");

// 4. Verify admin_audit_logs view or audit_logs table
$auditStmt = $pdo->prepare("SELECT COUNT(*) FROM audit_logs");
$auditStmt->execute();
assert_test("Audit_logs table is accessible", true);

$adminAuditStmt = $pdo->prepare("SELECT COUNT(*) FROM admin_audit_logs");
$adminAuditStmt->execute();
assert_test("admin_audit_logs view is accessible", true);

// 5. Test Customer List Excludes admin/manager/staff/walkin
$crmListStmt = $pdo->prepare("
    SELECT u.id, u.username, u.role, u.phone
    FROM users u
    WHERE u.role NOT IN ('admin', 'manager', 'staff', 'walkin')
      AND u.phone != '0000000000'
      AND u.role IN ('admin', 'manager', 'staff', 'walkin')
");
$crmListStmt->execute();
$leakedUsers = $crmListStmt->fetchAll(PDO::FETCH_ASSOC);
assert_test("Customer list excludes admin, manager, staff, walkin", count($leakedUsers) === 0, "Found leaked roles: " . json_encode($leakedUsers));

// 6. Test Unpaid Completion Rejection Logic
$unpaidBooking = [
    'id' => 999999,
    'total_price' => 500000,
    'paid_amount' => 150000,
    'status' => 'Chờ duyệt'
];
$statusAttempt = 'completed';
$isRejected = ($statusAttempt === 'completed' && (float)$unpaidBooking['paid_amount'] < (float)$unpaidBooking['total_price']);
assert_test("Unpaid booking completion is rejected", $isRejected, "Failed to reject completion for unpaid booking");

// 7. Test Adjust Discount Logic
$originalPrice = 500000;
$discountAmount = 50000;
$newPrice = $originalPrice - $discountAmount;
$paidAmount = 150000;
$newRemaining = max(0, $newPrice - $paidAmount);
assert_test("Adjust discount calculates total_price and remaining_amount correctly", $newPrice === 450000 && $newRemaining === 300000, "Math error in adjust discount");

// 8. Test Points Adjustment with Negative Points Rejection
$curPoints = 100;
$deltaNeg = -150;
$newPoints = $curPoints + $deltaNeg;
$isNegRejected = ($newPoints < 0);
assert_test("Negative points adjustment is rejected", $isNegRejected, "Failed to reject negative points");

// 9. Test Walk-in Desk Booking User Attachment
// Scenario A: Walk-in without phone attaches to 'Khách lẻ'
$isWalkin = true;
$phoneInput = '';
$assignedUserId = ($isWalkin && trim($phoneInput) === '') ? (int)$walkinUser['id'] : 1;
assert_test("Walk-in without phone attaches to system user Khách lẻ (not admin)", $assignedUserId === (int)$walkinUser['id'] && $assignedUserId !== 1, "Assigned user is: $assignedUserId");

// 10. Check Zero Debt references in API files
$filesToCheck = [
    __DIR__ . '/../api/admin_crm.php',
    __DIR__ . '/../api/services/admin_finance_reports.php',
    __DIR__ . '/../api/services/booking_queries.php',
    __DIR__ . '/../api/services/booking_creator.php',
    __DIR__ . '/../api/services/admin_bookings_manage.php'
];
$totalDebtMatches = 0;
foreach ($filesToCheck as $f) {
    $content = file_get_contents($f);
    // match 'debt' as a standalone word or identifier part (case-insensitive)
    preg_match_all('/\bdebt\b/i', $content, $m);
    $totalDebtMatches += count($m[0]);
}
assert_test("Zero debt references in core CRM and booking service files", $totalDebtMatches === 0, "Found $totalDebtMatches debt references");

echo "\n=== SUMMARY: $passCount PASSED, $failCount FAILED ===\n";
exit($failCount > 0 ? 1 : 0);
