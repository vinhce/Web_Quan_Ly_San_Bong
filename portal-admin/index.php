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
  <link rel="stylesheet" href="../css/style.css?v=20261109_v18">
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

  <!-- MODAL 2: ĐÃ TÍCH HỢP TRỰC TIẾP VÀO MỤC 2 LỊCH ĐẶT SÂN TIMELINE (#timeline-inplay-workspace) -->
  <div id="inplay-manage-modal" class="hidden" aria-hidden="true"></div>

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

  <!-- SCRIPTS -->
  <script src="/js/data.js?v=20261109_v18"></script>
  <script src="/js/app.js?v=20261109_v18"></script>
  <script src="/js/api.js?v=20261109_v18"></script>
  <script src="/js/admin.js?v=20261109_v18"></script>
</body>
</html>

