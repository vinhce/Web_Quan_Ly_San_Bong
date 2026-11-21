<?php
@header_remove('X-Powered-By');
header('X-Robots-Tag: noindex, nofollow, noarchive');
require_once __DIR__ . '/../api/security_helper.php';
secure_session_start();

// Tự động xác định base path tương thích cả subfolder lẫn root domain
$scriptName = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '');
$portalAdminPos = strpos($scriptName, '/portal-admin');
$basePath = ($portalAdminPos !== false) ? substr($scriptName, 0, $portalAdminPos) : '';
$loginUrl = ($basePath !== '' ? $basePath : '') . '/login?redirect=portal-admin';

$refreshedUser = refresh_session_user();
if (!empty($refreshedUser['_locked']) || empty($_SESSION['user']) || !in_array($_SESSION['user']['role'] ?? '', ['admin', 'manager', 'staff'], true)) {
    header('Location: ' . $loginUrl, true, 302);
    exit;
}
if (!empty($_SESSION['user']['must_change_password'])) {
    $forceChangeUrl = ($basePath !== '' ? $basePath : '') . '/login?force_change_password=1';
    header('Location: ' . $forceChangeUrl, true, 302);
    exit;
}
$currentUser = $_SESSION['user'];
$portalRole = $currentUser['role'] ?? '';
$isOwnerAdmin = ($portalRole === 'admin');
$isManagerOrAdmin = in_array($portalRole, ['admin', 'manager'], true);

// Chuẩn bị payload an toàn để inject vào client-side sessionStorage
$safeUserPayload = [
    'id'           => $currentUser['id'] ?? null,
    'username'     => $currentUser['username'] ?? '',
    'name'         => $currentUser['full_name'] ?? $currentUser['name'] ?? $currentUser['username'] ?? 'Quản Trị Viên',
    'full_name'    => $currentUser['full_name'] ?? $currentUser['name'] ?? $currentUser['username'] ?? 'Quản Trị Viên',
    'email'        => $currentUser['email'] ?? '',
    'phone'        => $currentUser['phone'] ?? '',
    'role'         => $currentUser['role'] ?? 'staff'
];
$currentUserJson = json_encode($safeUserPayload, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE);
?>
<!DOCTYPE html>
<html lang="vi" class="admin-html">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <meta name="csrf-token" content="<?php echo htmlspecialchars(generate_csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
  <title>Bảng Điều Khiển Quản Trị – Sân Bóng Pro Admin</title>
  <!-- Favicon / Tab Icon -->
  <!-- Favicon / Tab Icon -->
  <link rel="icon" type="image/svg+xml" href="<?php echo $basePath; ?>/favicon.svg">
  <link rel="alternate icon" type="image/x-icon" href="<?php echo $basePath; ?>/favicon.ico">
  <link rel="apple-touch-icon" href="<?php echo $basePath; ?>/favicon.svg">
  <!-- Pre-render RBAC Gate: Đồng bộ nguồn sự thật từ PHP Session vào sessionStorage/SanBongDB -->
  <script>
    (function() {
      try {
        var serverUser = <?php echo $currentUserJson; ?>;
        if (serverUser && serverUser.role && ['admin', 'manager', 'staff'].indexOf(serverUser.role) !== -1) {
          window.sb_current_user = serverUser;
          sessionStorage.setItem('sb_current_user', JSON.stringify(serverUser));
          try { localStorage.setItem('sb_current_user', JSON.stringify(serverUser)); } catch (e) {}
          return;
        }
        document.documentElement.style.display = 'none';
        var redirectUrl = <?php echo json_encode($loginUrl, JSON_UNESCAPED_SLASHES); ?>;
        window.location.replace(redirectUrl || '../login?redirect=portal-admin');
      } catch (e) {
        console.warn('[Admin Gate] Session sync warning:', e);
      }
    })();
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">
  <script>(function(){const w=console.warn;console.warn=function(...a){if(a[0]&&typeof a[0]==='string'&&a[0].includes('cdn.tailwindcss.com'))return;w.apply(console,a);};})();</script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
            heading: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif']
          }
        }
      }
    };
  </script>
  <link rel="stylesheet" href="../css/style.css?v=20261121_v121">
<style>
    @keyframes qrLaserAnim {
      0% { top: 12%; opacity: 0.7; }
      50% { top: 82%; opacity: 1; }
      100% { top: 12%; opacity: 0.7; }
    }
    .animate-laser {
      animation: qrLaserAnim 1.8s infinite ease-in-out;
    }
    html.admin-html {
      height: 100%;
      height: 100dvh;
      overflow: hidden;
      overscroll-behavior: none;
    }
    body.admin-body {
      display: flex !important;
      flex-direction: row !important;
      height: 100vh !important;
      height: 100dvh !important;
      overflow: hidden !important;
      width: 100% !important;
      max-width: 100vw !important;
      margin: 0 !important;
      padding: 0 !important;
      overscroll-behavior: none;
    }
    .admin-workspace-col {
      flex: 1 1 0% !important;
      min-width: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      height: 100vh !important;
      height: 100dvh !important;
      overflow: hidden !important;
      width: 100% !important;
    }
    .admin-header-bar {
      position: sticky !important;
      top: 0 !important;
      z-index: 20 !important;
      height: 3.5rem !important;
      min-height: 3.5rem !important;
      max-height: 3.5rem !important;
      width: 100% !important;
      flex-shrink: 0 !important;
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      justify-content: space-between !important;
      box-sizing: border-box !important;
    }
    @media (min-width: 640px) {
      .admin-header-bar {
        height: 4rem !important;
        min-height: 4rem !important;
        max-height: 4rem !important;
      }
    }
    .admin-main-scroll {
      flex: 1 1 0% !important;
      min-height: 0 !important;
      width: 100% !important;
      overflow-y: auto !important;
      -webkit-overflow-scrolling: touch;
      box-sizing: border-box !important;
    }
  </style>
</head>
<body class="admin-body h-[100dvh] flex overflow-hidden antialiased">

  <!-- LEFT ADMIN SIDEBAR (Frame 11-19 Unified Shell) -->
  <!-- 1. LEFT ADMIN SIDEBAR -->
  <div id="admin-sidebar-backdrop" onclick="closeAdminMobileDrawer()" class="hidden fixed inset-0 bg-slate-900/50 z-30 md:hidden"></div>
  <?php include __DIR__ . '/partials/sidebar.php'; ?>

  <!-- RIGHT CONTENT WORKSPACE -->
  <div class="admin-workspace-col flex-1 min-w-0 flex flex-col h-[100dvh] overflow-hidden">

    <!-- Top Admin Header Bar -->
    <!-- 2. TOPBAR HEADER -->
    <?php include __DIR__ . '/partials/header.php'; ?>

    <!-- TAB CONTENTS (Dynamic 9 Modules) -->
    <main class="admin-main-scroll flex-1 overflow-y-auto p-3 sm:p-6 bg-[#F8FAFC]" style="flex:1 1 0%;width:100%;overflow-y:auto;box-sizing:border-box;">

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
        include __DIR__ . '/partials/tab8_shifts.php';
        include __DIR__ . '/partials/tab8_reports.php';
        include __DIR__ . '/partials/tab9_settings.php';
        if (!empty($isOwnerAdmin)) {
            include __DIR__ . '/partials/tab11_admin_logs.php';
        }
      ?>
    </main>
  </div>

  <!-- ========================================================= -->
  <!-- 4. ADMIN OPERATION MODALS (QR Check-in, In-Play, Invoice) -->
  <!-- ========================================================= -->

  <!-- MODAL 1: QUÉT MÃ QR CHECK-IN NHẬN SÂN -->
  <div id="qr-scanner-modal" class="hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm items-center justify-center p-4 overflow-y-auto">
    <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-auto">
      <div class="px-5 py-4 bg-[#0F172A] text-white flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <span class="text-xl">📷</span>
          <div>
            <h3 class="font-heading font-extrabold text-base">Quét QR Vé Điện Tử & Check-in Nhận Sân</h3>
            <p class="text-[11px] text-slate-300">Hỗ trợ Camera trực tiếp, tải ảnh QR, súng bắn mã vạch hoặc nhập mã vé</p>
          </div>
        </div>
        <button type="button" onclick="closeQRScannerModal()" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-sm flex items-center justify-center">✕</button>
      </div>

      <div class="p-5 space-y-4">
        <!-- Khung Camera Quét QR -->
        <div id="qr-video-container" class="relative rounded-xl bg-slate-950 border-2 border-dashed border-emerald-500/60 p-4 text-center overflow-hidden">
          <video id="qr-video-preview" class="w-full h-48 object-cover rounded-xl bg-slate-950 hidden" playsinline></video>
          <div id="qr-scan-laser" class="hidden absolute left-4 right-4 h-0.5 bg-emerald-400 shadow-[0_0_14px_#10b981] pointer-events-none"></div>
          <div id="qr-camera-placeholder" class="py-4 space-y-2">
            <div class="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-2xl">🎯</div>
            <div class="text-xs font-bold text-white">Khung Ngắm Quét Mã QR Vé Đặt Sân</div>
            <div class="text-[11px] text-slate-400">Đưa mã QR trên điện thoại của khách vào khung ngắm hoặc tải ảnh vé QR</div>
          </div>
          <div class="flex flex-wrap items-center justify-center gap-2 mt-3">
            <button type="button" id="qr-camera-toggle-btn" onclick="toggleCameraQRScan()" class="px-3.5 py-2 rounded-lg bg-[#16A34A] hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow">
              <span>📷</span> Bật Camera Quét QR
            </button>
            <label class="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs cursor-pointer flex items-center gap-1.5 border border-slate-700">
              <span>🖼️ Chọn ảnh QR</span>
              <input type="file" accept="image/*" onchange="handleQRImageUpload(event)" class="hidden">
            </label>
          </div>
        </div>

        <!-- Ô nhập/quét mã vé thủ công -->
        <div>
          <label class="block text-xs font-bold text-[#475569] uppercase tracking-wider mb-1.5">Nhập hoặc quét mã vé điện tử</label>
          <div class="flex gap-2">
            <input type="text" id="qr-code-input" onkeydown="if(event.key==='Enter')lookupQRTicket()" placeholder="Quét hoặc nhập mã vé (VD: ASFS982145)..." class="input-field font-mono font-bold uppercase text-sm text-[#0F172A]">
            <button type="button" onclick="lookupQRTicket()" class="btn-base btn-primary shrink-0 font-bold text-xs px-4">Tra cứu vé</button>
          </div>
        </div>

        <!-- Danh sách chọn nhanh ca đá hôm nay để mô phỏng quét nhanh tại quầy -->
        <div>
          <div class="text-[11px] font-bold text-[#64748B] mb-1.5">Chọn nhanh vé ca đá hôm nay (Mô phỏng quét 1 chạm):</div>
          <div id="qr-quick-select-list" class="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            <!-- Rendered by JS -->
          </div>
        </div>

        <!-- Kết quả tra cứu vé -->
        <div id="qr-ticket-result" class="hidden p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3 text-xs">
          <!-- Rendered by JS -->
        </div>

        <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
          <button type="button" onclick="closeQRScannerModal()" class="btn-sm btn-secondary">Đóng</button>
          <button type="button" id="qr-confirm-checkin-btn" onclick="confirmQRCheckin()" class="btn-sm btn-primary font-bold">
            ✅ Xác nhận Check-in Nhận Sân
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- MODAL 2: ĐIỀU HÀNH CA ĐÁ & THANH TOÁN (POPUP MODAL) -->
  <div id="inplay-manage-modal" class="hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm items-center justify-center p-3 sm:p-4 overflow-y-auto" onclick="if(event.target===this) closeInPlayModal()">
    <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
      <!-- Header nổi bật -->
      <div class="bg-[#0F172A] text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-[#16A34A] text-white flex items-center justify-center text-lg font-extrabold shrink-0">⚽</div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="font-heading font-extrabold text-sm sm:text-base">Điều Hành Ca Đá & Thanh Toán</h3>
              <span id="inplay-modal-code" class="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-mono text-xs font-bold">#---</span>
              <span id="inplay-modal-status" class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold">Đang đá</span>
            </div>
            <div class="text-xs text-slate-300 mt-0.5">
              Sân: <b id="inplay-modal-pitch" class="text-white">---</b> · Khách hàng: <b id="inplay-modal-customer" class="text-white">---</b>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          <button type="button" onclick="handleInlineCheckinCurrent()" id="inline-checkin-btn" class="h-9 px-3 rounded-lg bg-[#16A34A] hover:bg-emerald-500 text-white text-xs font-bold hidden items-center gap-1 cursor-pointer">✓ Check-in Nhận Sân</button>
          <button type="button" onclick="restoreCurrentCancelledBooking()" id="inline-restore-btn" class="hidden h-9 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer">🔄 Khôi phục ca</button>
          <button type="button" onclick="closeInPlayModal()" class="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-sm flex items-center justify-center cursor-pointer transition-colors" title="Đóng cửa sổ">✕</button>
        </div>
      </div>

      <!-- Phần thân 2 cột (Scrollable) -->
      <div class="p-4 sm:p-6 overflow-y-auto flex-1 bg-white">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <!-- Cột trái: 4 Nghiệp vụ điều hành ca đá (7 cols) -->
          <div class="lg:col-span-7 space-y-4">
            <!-- Thông báo đặc quyền gói tháng nếu có -->
            <div id="inplay-package-promo-banner" class="hidden p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 text-xs flex items-center justify-between gap-2 shadow-2xs">
              <div class="flex items-center gap-2">
                <span class="text-xl">🎁</span>
                <div>
                  <div class="font-extrabold text-[#15803D]">Đơn thuộc Gói Hợp Đồng Theo Tháng:</div>
                  <div id="inplay-package-promo-desc" class="text-[11px] text-slate-700 font-semibold">Tài trợ miễn phí mỗi trận: 2 thùng nước suối (48 chai) + 1 trọng tài chuyên nghiệp.</div>
                </div>
              </div>
              <span class="px-2.5 py-0.5 rounded-full bg-[#16A34A] text-white text-[10px] font-extrabold shrink-0">ĐÃ TÀI TRỢ 0Đ</span>
            </div>

            <!-- 1. Đá thêm giờ (Gia hạn ca đá) -->
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div class="flex items-center justify-between">
                <h4 class="font-heading font-bold text-sm text-[#0F172A] flex items-center gap-1.5">
                  <span>⏱️</span> 1. Đá thêm giờ (Gia hạn ca đá)
                </h4>
                <span class="text-[11px] text-[#64748B]">Tự động tính phụ thu theo giá sân</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
                <div>
                  <label class="block text-[11px] font-bold text-[#475569] mb-1">Thời lượng thêm</label>
                  <select id="inplay-overtime-mins" onchange="updateInPlayOvertimePreview && updateInPlayOvertimePreview()" class="input-field h-9 text-xs font-bold">
                    <option value="30">+ 30 phút</option>
                    <option value="60">+ 60 phút (1 tiếng)</option>
                    <option value="90">+ 90 phút (1.5 tiếng)</option>
                  </select>
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-[#475569] mb-1">Phụ thu thêm giờ (VNĐ)</label>
                  <input type="number" id="inplay-overtime-fee" class="input-field h-9 text-xs font-extrabold text-[#16A34A]" placeholder="Tự động tính...">
                </div>
                <button type="button" onclick="submitInPlayOvertime()" class="btn-sm btn-primary h-9 font-bold w-full cursor-pointer">
                  + Cộng thêm giờ
                </button>
              </div>
            </div>

            <!-- 2. Chuyển sân (Đổi sân khác lúc đang chơi) -->
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div class="flex items-center justify-between">
                <h4 class="font-heading font-bold text-sm text-[#0F172A] flex items-center gap-1.5">
                  <span>🔄</span> 2. Chuyển sân (Đổi sân khác lúc đang chơi)
                </h4>
                <span class="text-[11px] text-[#2563EB] font-semibold">Giải phóng sân cũ ngay lập tức</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label class="block text-[11px] font-bold text-[#475569] mb-1">Chọn sân chuyển đến</label>
                  <select id="inplay-new-pitch" class="input-field h-9 text-xs font-bold"></select>
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-[#475569] mb-1">Lý do chuyển sân</label>
                  <input type="text" id="inplay-transfer-reason" placeholder="VD: Khách muốn nâng lên sân 7, đèn sân cũ bảo trì..." class="input-field h-9 text-xs">
                </div>
              </div>
              <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
                <label class="flex items-center gap-2 text-xs text-[#475569] cursor-pointer font-medium">
                  <input type="checkbox" id="inplay-adjust-price" checked class="w-4 h-4 rounded text-[#16A34A]">
                  <span>Tự động cập nhật lại tiền sân nếu đổi khác loại sân (Sân 5 ↔ Sân 7/11)</span>
                </label>
                <button type="button" onclick="submitInPlayTransfer()" class="btn-sm bg-[#2563EB] hover:bg-blue-700 text-white font-bold cursor-pointer">
                  Xác nhận chuyển sân
                </button>
              </div>
            </div>

            <!-- 3. Gọi thêm nước uống / dịch vụ tại sân -->
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div class="flex items-center justify-between">
                <h4 class="font-heading font-bold text-sm text-[#0F172A] flex items-center gap-1.5">
                  <span>🥤</span> 3. Gọi thêm nước uống / dịch vụ tại sân
                </h4>
                <span class="text-[11px] text-[#16A34A] font-semibold">Cộng dồn vào hóa đơn trận đấu</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                <div class="sm:col-span-7">
                  <label class="block text-[11px] font-bold text-[#475569] mb-1">Chọn dịch vụ / đồ uống</label>
                  <select id="inplay-service-select" class="input-field h-9 text-xs font-semibold"></select>
                </div>
                <div class="sm:col-span-2">
                  <label class="block text-[11px] font-bold text-[#475569] mb-1">Số lượng</label>
                  <input type="number" id="inplay-service-qty" value="1" min="1" max="50" class="input-field h-9 text-xs font-bold text-center">
                </div>
                <div class="sm:col-span-3">
                  <button type="button" onclick="submitInPlayService()" class="btn-sm btn-primary h-9 w-full font-bold cursor-pointer">
                    + Thêm vào hóa đơn
                  </button>
                </div>
              </div>
              <div id="inplay-services-list" class="text-xs text-[#475569] space-y-1 pt-1"></div>
            </div>

            <!-- 4. Hủy lịch trước thời hạn / Khách chưa đến & Nhả sân -->
            <div class="p-4 rounded-xl bg-red-50/60 border border-red-200 space-y-3">
              <div class="flex flex-wrap items-center justify-between gap-1">
                <h4 class="font-heading font-bold text-sm text-red-700 flex items-center gap-1.5">
                  <span>🛑</span> 4. Hủy lịch trước thời hạn / Khách chưa đến & Nhả sân
                </h4>
                <span class="text-[11px] text-red-600 font-semibold">Áp dụng khi khách báo hủy, quá giờ chưa đến hoặc nghỉ sớm</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label class="block text-[11px] font-bold text-red-800 mb-1">Chính sách xử lý tiền cọc</label>
                  <div id="inplay-cancel-policy-hint" class="hidden text-[11px] font-semibold rounded-lg px-2.5 py-1.5 mb-1.5 border"></div>
                  <select id="inplay-cancel-policy" class="input-field h-9 text-xs font-semibold bg-white">
                    <option value="refund_100">Hoàn cọc 100% (Báo trước hạn / Mưa lớn)</option>
                    <option value="reserve">Bảo lưu cọc sang buổi khác</option>
                    <option value="forfeit_50">Hủy sát giờ - Phạt 50% cọc</option>
                    <option value="noshow_forfeit">Khách quá giờ chưa đến - Tịch thu cọc 30% & Nhả sân</option>
                  </select>
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-red-800 mb-1">Lý do hủy lịch / nhả sân</label>
                  <input type="text" id="inplay-cancel-reason" placeholder="VD: Khách báo bận đột xuất, quá 15 phút chưa đến sân..." class="input-field h-9 text-xs bg-white">
                </div>
              </div>
              <div class="flex justify-end">
                <button type="button" onclick="submitInPlayEarlyCancel()" class="btn-sm bg-red-600 hover:bg-red-700 text-white font-bold cursor-pointer">
                  Xác nhận hủy lịch & Nhả sân
                </button>
              </div>
            </div>
          </div>

          <!-- Cột phải: Quyết toán & Thu tiền còn lại (5 cols) -->
          <div class="lg:col-span-5 flex flex-col justify-between p-5 rounded-2xl bg-gradient-to-b from-emerald-50/90 to-white border-2 border-emerald-200 space-y-4">
            <div class="space-y-4">
              <div class="flex items-center justify-between border-b border-emerald-200 pb-3">
                <div>
                  <h4 class="font-heading font-extrabold text-base text-[#0F172A]">💰 Quyết Toán & Thu Tiền Còn Lại</h4>
                  <p class="text-[11px] text-[#64748B]">Tổng hợp tiền sân, phụ thu thêm giờ và dịch vụ gọi thêm</p>
                </div>
                <span class="px-2.5 py-1 rounded-full bg-[#16A34A] text-white text-[10px] font-bold">Thu 70% + Phụ thu</span>
              </div>

              <div class="space-y-2.5 text-xs bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
                <div class="flex justify-between items-center">
                  <span class="text-[#64748B]">Tổng hóa đơn trận đấu:</span>
                  <span id="inplay-bill-total" class="font-heading font-extrabold text-base text-[#0F172A]">0đ</span>
                </div>
                <div class="flex justify-between items-center text-emerald-700">
                  <span>Đã thanh toán cọc trước (30%):</span>
                  <span id="inplay-bill-deposit" class="font-bold">-0đ</span>
                </div>
                <div id="inplay-bill-paid-remaining-row" class="hidden justify-between items-center text-blue-700">
                  <span>Đã thu phần còn lại (70% + Phụ thu):</span>
                  <span id="inplay-bill-paid-remaining" class="font-bold">-0đ</span>
                </div>
                <div class="pt-2.5 border-t border-slate-200 flex justify-between items-baseline">
                  <span class="font-bold text-sm text-[#0F172A]">Số tiền còn lại phải thu:</span>
                  <span id="inplay-bill-remaining" class="font-heading font-extrabold text-2xl text-[#DC2626]">0đ</span>
                </div>
              </div>

              <div id="inplay-pay-method-wrap">
                <label class="block text-xs font-bold text-[#0F172A] mb-1.5">Hình thức thu tiền còn lại:</label>
                <select id="inplay-pay-method" onchange="toggleInPlayVietQR && toggleInPlayVietQR()" class="input-field font-bold text-xs bg-white">
                  <option value="Tiền mặt tại quầy">💵 Tiền mặt tại quầy</option>
                  <option value="Chuyển khoản VietQR">📱 Chuyển khoản VietQR</option>
                </select>
              </div>

              <!-- Khung VietQR thu tiền còn lại -->
              <div id="inplay-vietqr-box" class="hidden p-3 rounded-xl bg-white border border-emerald-200 text-center space-y-2">
                <div class="text-[11px] font-bold text-[#15803D]">Quét mã VietQR thu phần tiền còn lại</div>
                <img id="inplay-vietqr-img" src="" alt="VietQR Remaining" class="w-40 h-40 mx-auto object-contain rounded-lg border border-slate-200">
                <div class="text-[10px] text-[#64748B]">Tự động điền đúng số tiền còn lại & nội dung thanh toán</div>
              </div>
            </div>

            <div class="space-y-2.5 pt-3 border-t border-emerald-200">
              <button type="button" id="inplay-pay-submit-btn" onclick="submitInPlayPayRemaining()" class="btn-base btn-primary w-full font-extrabold text-xs py-2.5 shadow-md cursor-pointer">✅ Thu Đủ Tiền Còn Lại & Hoàn Thành Ca</button>
              <button type="button" onclick="openInvoiceFromInPlay()" class="btn-base bg-[#0F172A] hover:bg-slate-800 text-white w-full font-bold text-xs py-2.5 cursor-pointer">🖨️ Xem & In Hóa Đơn</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- MODAL 3: XEM & IN HÓA ĐƠN THANH TOÁN (RECEIPT / INVOICE) -->
  <div id="invoice-print-modal" class="hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm items-center justify-center p-4 overflow-y-auto">
    <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-auto">
      <div class="px-5 py-3.5 bg-[#0F172A] text-white flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span>🧾</span>
          <h3 class="font-heading font-extrabold text-sm">Hóa Đơn Thanh Toán Dịch Vụ Sân Bóng</h3>
        </div>
        <button type="button" onclick="closeInvoiceModal()" class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center">✕</button>
      </div>

      <!-- Vùng hóa đơn chuẩn bị in -->
      <div id="printable-invoice-area" class="p-6 bg-white text-[#0F172A] space-y-4 text-xs">
        <!-- Rendered dynamically by JS -->
      </div>

      <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
        <button type="button" onclick="closeInvoiceModal()" class="btn-sm btn-secondary">Đóng</button>
        <button type="button" onclick="printInvoiceNow()" class="btn-sm btn-primary font-bold flex items-center gap-1.5">
          <span>🖨️ In Hóa Đơn Ngay</span>
        </button>
      </div>
    </div>
  </div>

  <!-- MODAL 4: ASYNC CUSTOM DIALOG (CONFIRM / PROMPT) -->
  <div id="admin-custom-dialog-modal" role="dialog" aria-modal="true" aria-labelledby="admin-dialog-title" class="hidden fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm items-center justify-center p-4 overflow-y-auto">
    <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden my-auto">
      <div class="px-5 py-3.5 bg-[#0F172A] text-white flex items-center justify-between gap-2">
        <h3 id="admin-dialog-title" class="font-heading font-extrabold text-sm">Xác nhận thao tác</h3>
      </div>
      <div class="p-5 space-y-4 text-xs">
        <p id="admin-dialog-message" class="text-[#334155] leading-relaxed whitespace-pre-line font-medium"></p>
        <div id="admin-dialog-input-wrap" class="hidden space-y-1.5">
          <label for="admin-dialog-input" class="block text-[11px] font-bold text-[#475569]">Thông tin bổ sung</label>
          <input type="text" id="admin-dialog-input" placeholder="Nhập nội dung..." class="input-field w-full text-xs font-semibold text-[#0F172A]">
        </div>
        <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
          <button type="button" id="admin-dialog-cancel" class="btn-sm btn-secondary cursor-pointer">Hủy</button>
          <button type="button" id="admin-dialog-confirm" class="btn-sm btn-primary font-bold cursor-pointer">Xác nhận</button>
        </div>
      </div>
    </div>
  </div>

  <!-- SCRIPTS -->
  <script src="<?php echo $basePath; ?>/js/data.js?v=20261115_v78"></script>
  <script src="<?php echo $basePath; ?>/js/helpers.js?v=20261115_v78"></script>
  <script src="<?php echo $basePath; ?>/js/db_core.js?v=20261115_v78"></script>
  <script src="<?php echo $basePath; ?>/js/db_pricing.js?v=20261115_v78"></script>
  <script src="<?php echo $basePath; ?>/js/db_bookings.js?v=20261115_v78"></script>
  <script src="<?php echo $basePath; ?>/js/db_operations.js?v=20261115_v78"></script>
  <script src="<?php echo $basePath; ?>/js/db.js?v=20261115_v78"></script>
  <script src="<?php echo $basePath; ?>/js/ui.js?v=20261121_v112"></script>
  <script src="<?php echo $basePath; ?>/js/vn_datepicker.js?v=20261121_v112"></script>
  <script src="<?php echo $basePath; ?>/js/app.js?v=20261115_v78"></script>
  <script src="<?php echo $basePath; ?>/js/api.js?v=20261115_v78"></script>
  <script src="<?php echo $basePath; ?>/js/vendor/jsqr.min.js?v=20261115_v78"></script>
  <script src="<?php echo $basePath; ?>/js/admin_dialogs.js?v=20261115_v78"></script>
  <script src="<?php echo $basePath; ?>/js/admin.js?v=20261121_v126"></script>
  <script src="<?php echo $basePath; ?>/js/admin_overview.js?v=20261121_v125"></script>
  <script src="<?php echo $basePath; ?>/js/admin_pitches.js?v=20261115_v78"></script>
  <script src="<?php echo $basePath; ?>/js/admin_payments.js?v=20261118_v95"></script>
  <script src="<?php echo $basePath; ?>/js/admin_ops.js?v=20261115_v78"></script>
  <script src="<?php echo $basePath; ?>/js/admin_crm.js?v=20261115_v78"></script>
  <script src="<?php echo $basePath; ?>/js/admin_customers.js?v=20261115_v78"></script>
  <script src="<?php echo $basePath; ?>/js/admin_reports.js?v=20261121_v124"></script>
  <script src="<?php echo $basePath; ?>/js/admin_expenses.js?v=20261118_v95"></script>
  <script src="<?php echo $basePath; ?>/js/admin_pricing.js?v=20261121_v126"></script>
  <script src="<?php echo $basePath; ?>/js/admin_security.js?v=20261118_v95"></script>
  <script src="<?php echo $basePath; ?>/js/admin_settings.js?v=20261118_v95"></script>
  <script src="<?php echo $basePath; ?>/js/admin_finance.js?v=20261115_v78"></script>
  <script src="<?php echo $basePath; ?>/js/admin_inplay.js?v=20261115_v78"></script>
  <script src="<?php echo $basePath; ?>/js/admin_vouchers.js?v=20261121_v126"></script>
  <script src="<?php echo $basePath; ?>/js/admin_staff.js?v=20261115_v78"></script>
  <script src="<?php echo $basePath; ?>/js/admin_catalog.js?v=20261118_v95"></script>
  <script src="<?php echo $basePath; ?>/js/admin_shifts.js?v=20261118_v95"></script>
  <script src="<?php echo $basePath; ?>/js/admin_invoices.js?v=20261118_v95"></script>
  <script src="<?php echo $basePath; ?>/js/admin_qr.js?v=20261121_v119"></script>
  <script src="<?php echo $basePath; ?>/js/admin_recurring.js?v=20261115_v78"></script>
  <script src="<?php echo $basePath; ?>/js/admin_waitlist_match.js?v=20261115_v78"></script>
  <script src="<?php echo $basePath; ?>/js/admin_logs.js?v=20261118_v95"></script>
</body>
</html>

