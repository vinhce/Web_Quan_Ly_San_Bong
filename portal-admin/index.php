<?php
require_once __DIR__ . '/../api/security_helper.php';
secure_session_start();

if (empty($_SESSION['user']) || ($_SESSION['user']['role'] ?? '') !== 'admin') {
    header('Location: /login?redirect=portal-admin', true, 302);
    exit;
}
?>
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bảng Điều Khiển Quản Trị – Sân Bóng Pro Admin</title>
  <!-- Favicon / Tab Icon -->
  <!-- Favicon / Tab Icon -->
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="alternate icon" type="image/x-icon" href="/favicon.ico">
  <link rel="apple-touch-icon" href="/favicon.svg">
  <!-- Pre-render RBAC Gate: Chặn tức thì mọi truy cập không phải Admin -->
  <script>
    (function() {
      try {
        var user = JSON.parse(sessionStorage.getItem('sb_current_user') || 'null');
        if (!user || user.role !== 'admin') {
          document.documentElement.style.display = 'none';
          window.location.replace('/login?redirect=portal-admin');
        }
      } catch (e) {
        document.documentElement.style.display = 'none';
        window.location.replace('/login?redirect=portal-admin');
      }
    })();
  </script>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="../css/style.css?v=20261109_v14">
</head>
<body class="h-screen flex overflow-hidden antialiased">

  <!-- LEFT ADMIN SIDEBAR (Frame 11-19 Unified Shell) -->
  <!-- 1. LEFT ADMIN SIDEBAR -->
  <?php include __DIR__ . '/partials/sidebar.php'; ?>


  <!-- RIGHT CONTENT WORKSPACE -->
  <div class="flex-1 flex flex-col h-screen overflow-hidden">

    <!-- Top Admin Header Bar -->
    <!-- 2. TOPBAR HEADER -->
    <?php include __DIR__ . '/partials/header.php'; ?>


    <!-- TAB CONTENTS (Dynamic 9 Modules) -->
    <main class="flex-1 overflow-y-auto p-6 bg-[#F8FAFC]">

      <!-- ========================================== -->
      <!-- 3. DYNAMIC 9 TAB MODULES -->
      <?php
        include __DIR__ . '/partials/tab1_kpi.php';
        include __DIR__ . '/partials/tab2_timeline.php';
        include __DIR__ . '/partials/tab3_quick_booking.php';
        include __DIR__ . '/partials/tab4_pitches.php';
        include __DIR__ . '/partials/tab5_pricing.php';
        include __DIR__ . '/partials/tab6_customers.php';
        include __DIR__ . '/partials/tab7_deposits.php';
        include __DIR__ . '/partials/tab8_reports.php';
        include __DIR__ . '/partials/tab9_settings.php';
      ?>
    </main>
  </div>

  <!-- SCRIPTS -->
  <script src="/js/data.js?v=20261109_v14"></script>
  <script src="/js/app.js?v=20261109_v14"></script>
  <script src="/js/api.js?v=20261109_v14"></script>
  <script src="/js/admin.js?v=20261109_v14"></script>
</body>
</html>

