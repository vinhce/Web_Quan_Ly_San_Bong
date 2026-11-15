<?php
declare(strict_types=1);

// Test V1: 10 Tabs and Shift Handover Tab 8
$baseDir = dirname(__DIR__);

function runTest(): void {
    $results = [];
    $allPass = true;

    // 1. Sidebar contains 10 tabs properly numbered
    $sidebar = file_get_contents(__DIR__ . '/../portal-admin/partials/sidebar.php');
    $tabs = [
        'nav-overview'      => '1. Tổng quan',
        'nav-timeline'      => '2. Lịch đặt sân',
        'nav-quick-booking' => '3. Đặt sân tại quầy',
        'nav-pitches'       => '4. Quản lý sân',
        'nav-pricing'       => '5. Bảng giá & Voucher',
        'nav-customers'     => '6. Khách & Hội viên',
        'nav-payments'      => '7. Duyệt cọc VietQR',
        'nav-shifts'        => '8. Chốt ca / Giao ca',
        'nav-reports'       => '9. Báo cáo doanh thu',
        'nav-settings'      => '10. Cài đặt hệ thống',
    ];

    foreach ($tabs as $id => $title) {
        $hasId = strpos($sidebar, "id=\"{$id}\"") !== false;
        $hasTitle = strpos($sidebar, $title) !== false;
        $pass = $hasId && $hasTitle;
        $results[] = ["Sidebar tab: {$id} ({$title})", $pass];
        if (!$pass) $allPass = false;
    }

    // 2. Chấm trạng thái nhỏ cạnh mục tab 8
    $hasDot = strpos($sidebar, 'id="shift-nav-status-dot"') !== false;
    $results[] = ["Tab 8 has #shift-nav-status-dot", $hasDot];
    if (!$hasDot) $allPass = false;

    // 3. Header: gỡ nút cam Chốt ca / Giao ca
    $header = file_get_contents(__DIR__ . '/../portal-admin/partials/header.php');
    $hasOrangeShiftBtn = strpos($header, 'Chốt ca / Giao ca') !== false;
    $results[] = ["Header removed orange shift button", !$hasOrangeShiftBtn];
    if ($hasOrangeShiftBtn) $allPass = false;

    // 4. Tab 3: không còn #shift-handover-card
    $tab3 = file_get_contents(__DIR__ . '/../portal-admin/partials/tab3_quick_booking.php');
    $tab3HasShift = strpos($tab3, 'id="shift-handover-card"') !== false;
    $results[] = ["Tab 3 removed #shift-handover-card", !$tab3HasShift];
    if ($tab3HasShift) $allPass = false;

    // 5. Tab 8: có #shift-handover-card và #tab-content-shifts
    $tab8 = file_get_contents(__DIR__ . '/../portal-admin/partials/tab8_shifts.php');
    $tab8HasContent = strpos($tab8, 'id="tab-content-shifts"') !== false && strpos($tab8, 'id="shift-handover-card"') !== false;
    $results[] = ["Tab 8 has #tab-content-shifts and #shift-handover-card", $tab8HasContent];
    if (!$tab8HasContent) $allPass = false;

    // 6. Index includes tab8_shifts.php
    $index = file_get_contents(__DIR__ . '/../portal-admin/index.php');
    $indexIncludes = strpos($index, "tab8_shifts.php") !== false;
    $results[] = ["Index.php includes tab8_shifts.php", $indexIncludes];
    if (!$indexIncludes) $allPass = false;

    // 7. JS: PORTAL_ALLOWED_TABS contains 'shifts' in admin, manager, staff
    $adminJs = file_get_contents(__DIR__ . '/../js/admin.js');
    $hasShiftsAdmin = strpos($adminJs, "'shifts'") !== false;
    $hasTabNumMap = strpos($adminJs, "'8': 'shifts'") !== false;
    $results[] = ["admin.js supports 'shifts' tab and numeric alias 8", $hasShiftsAdmin && $hasTabNumMap];
    if (!$hasShiftsAdmin || !$hasTabNumMap) $allPass = false;

    // Output summary
    $passedCount = count(array_filter($results, fn($r) => $r[1]));
    $totalCount = count($results);
    echo "TEST_V1_RESULT: {$passedCount}/{$totalCount} passed\n";
    foreach ($results as [$name, $passed]) {
        echo ($passed ? "[PASS] " : "[FAIL] ") . $name . "\n";
    }

    if (!$allPass) {
        exit(1);
    }
}

runTest();
