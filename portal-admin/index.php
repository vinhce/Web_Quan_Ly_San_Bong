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
  <link rel="stylesheet" href="../css/style.css?v=20261109_v4">
</head>
<body class="h-screen flex overflow-hidden antialiased">

  <!-- LEFT ADMIN SIDEBAR (Frame 11-19 Unified Shell) -->
  <aside class="w-64 bg-white border-r border-[#E2E8F0] flex flex-col justify-between shrink-0 select-none z-30">
    <div class="p-4">
      <!-- Admin Brand -->
      <a href="/" class="flex items-center gap-3 px-2 py-2 mb-6 group">
        <div class="w-9 h-9 rounded-[10px] bg-[#16A34A] text-white flex items-center justify-center shadow-md">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/></svg>
        </div>
        <div>
          <div class="font-heading font-extrabold text-base text-[#0F172A] leading-tight">Sân Bóng Pro</div>
          <div class="text-[11px] text-[#16A34A] font-semibold">Trang Quản Trị Hệ Thống</div>
        </div>
      </a>

      <!-- 9 Modules Navigation Tabs -->
      <nav class="space-y-1">
        <button onclick="switchAdminTab('overview')" id="nav-overview" class="w-full h-10 px-3 rounded-lg flex items-center gap-3 text-xs font-bold transition-all bg-[#DCFCE7] text-[#16A34A]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
          <span>1. Tổng quan KPI</span>
        </button>

        <button onclick="switchAdminTab('timeline')" id="nav-timeline" class="w-full h-10 px-3 rounded-lg flex items-center gap-3 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          <span>2. Lịch đặt sân Timeline</span>
        </button>

        <button onclick="switchAdminTab('quick-booking')" id="nav-quick-booking" class="w-full h-10 px-3 rounded-lg flex items-center gap-3 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="16"/><line x1="8" x2="8" y1="12" y2="12"/></svg>
          <span>3. Đặt sân tại quầy</span>
        </button>

        <button onclick="switchAdminTab('pitches')" id="nav-pitches" class="w-full h-10 px-3 rounded-lg flex items-center gap-3 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="12" x2="12" y1="5" y2="19"/><circle cx="12" cy="12" r="3"/></svg>
          <span>4. Quản lý 17 sân</span>
        </button>

        <button onclick="switchAdminTab('pricing')" id="nav-pricing" class="w-full h-10 px-3 rounded-lg flex items-center gap-3 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>
          <span>5. Bảng giá cấu hình</span>
        </button>

        <button onclick="switchAdminTab('customers')" id="nav-customers" class="w-full h-10 px-3 rounded-lg flex items-center gap-3 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span>6. Khách & Hội viên</span>
        </button>

        <button onclick="switchAdminTab('payments')" id="nav-payments" class="w-full h-10 px-3 rounded-lg flex items-center gap-3 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
          <span class="flex-1 text-left">7. Duyệt cọc VietQR</span>
          <span class="px-1.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706] text-[10px] font-bold">3</span>
        </button>

        <button onclick="switchAdminTab('reports')" id="nav-reports" class="w-full h-10 px-3 rounded-lg flex items-center gap-3 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>
          <span>8. Báo cáo doanh thu</span>
        </button>

        <button onclick="switchAdminTab('settings')" id="nav-settings" class="w-full h-10 px-3 rounded-lg flex items-center gap-3 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span>9. Cài đặt hệ thống</span>
        </button>
      </nav>
    </div>

    <!-- Admin User Bottom Pill -->
    <div class="p-4 border-t border-[#E2E8F0]">
      <div class="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div id="admin-avatar" class="w-8 h-8 rounded-full bg-[#0F172A] text-white font-heading font-bold text-xs flex items-center justify-center">
            AD
          </div>
          <div>
            <div id="admin-name" class="text-xs font-bold text-[#0F172A]">Ban Quản Trị</div>
            <div class="text-[10px] text-[#64748B]">Chủ sân · Toàn quyền</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <a href="/" class="text-xs font-semibold text-[#16A34A] hover:underline" title="Xem giao diện khách">
            Web ↗
          </a>
          <button type="button" onclick="handleAdminLogout()" class="text-xs font-semibold text-[#DC2626] hover:underline cursor-pointer" title="Đăng xuất quản trị">
            Thoát
          </button>
        </div>
      </div>
    </div>
  </aside>

  <!-- RIGHT CONTENT WORKSPACE -->
  <div class="flex-1 flex flex-col h-screen overflow-hidden">

    <!-- Top Admin Header Bar -->
    <header class="h-16 bg-white border-b border-[#E2E8F0] px-6 flex items-center justify-between shrink-0">
      <div class="flex items-baseline gap-3">
        <h1 id="admin-module-title" class="font-heading font-extrabold text-xl text-[#0F172A]">1. Tổng quan hệ thống</h1>
        <span id="admin-module-subtitle" class="text-xs text-[#64748B]">Thứ Sáu, 06/11/2026 · Cập nhật trực tiếp</span>
      </div>

      <div class="flex items-center gap-3">
        <div class="w-64 h-9 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 flex items-center gap-2 text-xs text-[#94A3B8]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <span>Tìm mã đơn, SĐT khách...</span>
        </div>
        <button onclick="switchAdminTab('quick-booking')" class="btn-sm btn-primary">
          + Đặt sân tại quầy
        </button>
      </div>
    </header>

    <!-- TAB CONTENTS (Dynamic 9 Modules) -->
    <main class="flex-1 overflow-y-auto p-6 bg-[#F8FAFC]">

      <!-- ========================================== -->
      <!-- TAB 1: TỔNG QUAN KPI & BIỂU ĐỒ (Frame 11) -->
      <!-- ========================================== -->
      <div id="tab-content-overview" class="space-y-6">
        <!-- 4 KPI Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="ui-card p-5">
            <div class="text-xs font-semibold text-[#64748B]">Doanh thu hôm nay</div>
            <div class="font-heading font-extrabold text-2xl text-[#0F172A] mt-1">4.350.000đ</div>
            <div class="mt-2 text-xs font-semibold text-[#16A34A] flex items-center gap-1">
              <span>↑ 12%</span>
              <span class="text-[#64748B] font-normal">so với hôm qua</span>
            </div>
          </div>
          <div class="ui-card p-5">
            <div class="text-xs font-semibold text-[#64748B]">Tổng lượt đặt hôm nay</div>
            <div class="font-heading font-extrabold text-2xl text-[#0F172A] mt-1">11 lượt</div>
            <div class="mt-2 text-xs font-semibold text-[#D97706]">
              2 đơn đang giữ chỗ VietQR
            </div>
          </div>
          <div class="ui-card p-5">
            <div class="text-xs font-semibold text-[#64748B]">Tỷ lệ lấp đầy sân</div>
            <div class="font-heading font-extrabold text-2xl text-[#16A34A] mt-1">68%</div>
            <div class="w-full h-2 rounded-full bg-[#E2E8F0] mt-2 overflow-hidden">
              <div class="w-[68%] h-full bg-[#16A34A]"></div>
            </div>
          </div>
          <div class="ui-card p-5">
            <div class="text-xs font-semibold text-[#64748B]">Trạng thái sân hiện tại</div>
            <div class="font-heading font-extrabold text-2xl text-[#0F172A] mt-1">15/17 Sân sẵn sàng</div>
            <div class="mt-2 text-xs text-[#64748B]">1 đang đá · 1 bảo trì mặt cỏ</div>
          </div>
        </div>

        <!-- Charts Row -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div class="lg:col-span-8 ui-card p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-heading font-bold text-base text-[#0F172A]">Doanh thu 7 ngày gần nhất</h3>
              <span class="text-xs text-[#16A34A] font-bold">Tổng tuần: 28.600.000đ</span>
            </div>
            <!-- SVG Vector Chart Line -->
            <svg viewBox="0 0 680 180" class="w-full h-44">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#16A34A" stop-opacity="0.35"/>
                  <stop offset="100%" stop-color="#16A34A" stop-opacity="0.0"/>
                </linearGradient>
              </defs>
              <line x1="0" y1="40" x2="680" y2="40" stroke="#E2E8F0" stroke-dasharray="4"/>
              <line x1="0" y1="90" x2="680" y2="90" stroke="#E2E8F0" stroke-dasharray="4"/>
              <line x1="0" y1="140" x2="680" y2="140" stroke="#E2E8F0" stroke-dasharray="4"/>
              <path d="M0,130 Q90,105 180,85 T360,70 T480,45 T600,60 L680,25 L680,180 L0,180 Z" fill="url(#chartGrad)"/>
              <path d="M0,130 Q90,105 180,85 T360,70 T480,45 T600,60 L680,25" fill="none" stroke="#16A34A" stroke-width="3"/>
              <circle cx="480" cy="45" r="5" fill="#16A34A"/>
              <circle cx="680" cy="25" r="5" fill="#16A34A"/>
            </svg>
            <div class="flex justify-between text-xs text-[#64748B] pt-2 border-t border-[#E2E8F0]">
              <span>T7</span><span>CN</span><span>T2</span><span>T3</span><span>T4</span><span>T5</span><span class="font-bold text-[#16A34A]">Hôm nay</span>
            </div>
          </div>

          <div class="lg:col-span-4 ui-card p-5 flex flex-col justify-between">
            <h3 class="font-heading font-bold text-base text-[#0F172A] mb-3">Tỷ trọng doanh thu các sân</h3>
            <div class="space-y-2 text-xs">
              <div class="flex justify-between"><span>Sân 7-A (Trung tâm)</span><b class="text-[#16A34A]">32%</b></div>
              <div class="w-full h-2 rounded bg-slate-100"><div class="w-[32%] h-full bg-[#16A34A] rounded"></div></div>
              <div class="flex justify-between pt-1"><span>Sân 7-B</span><b>22%</b></div>
              <div class="w-full h-2 rounded bg-slate-100"><div class="w-[22%] h-full bg-[#22C55E] rounded"></div></div>
              <div class="flex justify-between pt-1"><span>Sân 5-A</span><b>18%</b></div>
              <div class="w-full h-2 rounded bg-slate-100"><div class="w-[18%] h-full bg-[#2563EB] rounded"></div></div>
              <div class="flex justify-between pt-1"><span>Sân 11 (Ghép)</span><b>16%</b></div>
              <div class="w-full h-2 rounded bg-slate-100"><div class="w-[16%] h-full bg-[#0F172A] rounded"></div></div>
              <div class="flex justify-between pt-1"><span>Sân 5-B</span><b>12%</b></div>
              <div class="w-full h-2 rounded bg-slate-100"><div class="w-[12%] h-full bg-[#F59E0B] rounded"></div></div>
            </div>
            <div class="text-[11px] text-[#64748B] mt-4 pt-3 border-t border-[#E2E8F0]">
              * Sân 7-C hiện đang bảo trì nên tỷ trọng 0% trong tuần này.
            </div>
          </div>
        </div>

        <!-- Ca đá sắp diễn ra trong ngày -->
        <div class="ui-card p-5 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-heading font-bold text-base text-[#0F172A]">Lịch thi đấu hôm nay cần theo dõi</h3>
            <span class="text-xs text-[#16A34A] font-bold">Giờ vàng tối 17:30 - 21:00</span>
          </div>
                  <!-- Banner Quy che An han 15 phut & No-Show Release -->
        <div class="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex items-start gap-3 text-xs mb-3">
          <div class="p-2 rounded-lg bg-amber-500 text-white font-bold shrink-0 text-sm">⏱️ 15P</div>
          <div class="space-y-1">
            <div class="font-bold text-[#0F172A] text-sm">Quy chế tiếp đón & Xử lý khách quá hạn (No-Show):</div>
            <div class="text-[#475569] leading-relaxed">
              • <b>Thời gian ân hạn:</b> Hệ thống tự động đếm giờ và giữ sân tối đa <b>15 phút</b> kể từ khi bắt đầu ca đá.<br>
              • <b>Khách đến sân:</b> Bấm <span class="text-emerald-700 font-bold">✓ Check-in</span> để xác nhận nhận sân, chuyển trạng thái "Đang đá" và thu phần tiền còn lại.<br>
              • <b>Quá 15 phút chưa đến:</b> Bấm <span class="text-red-700 font-bold">⚠️ Quá hạn: Nhả sân</span> để <b>tịch thu cọc 30%</b> và <b>giải phóng slot sân trống ngay lập tức</b> đón khách vãng lai hoặc khách đặt mới tại quầy, tuyệt đối không để trống sân.
            </div>
          </div>
        </div>
          <div id="overview-today-bookings" class="space-y-2 text-xs">
            <!-- Rendered by JS -->
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- TAB 2: LỊCH ĐẶT SÂN TIMELINE GANTT (Frame 12) -->
      <!-- ========================================== -->
      <div id="tab-content-timeline" class="space-y-4 hidden">
        <div class="ui-card p-4 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span class="font-heading font-bold text-sm text-[#0F172A]">Lịch ma trận sân hôm nay:</span>
            <span class="px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#16A34A] text-xs font-bold">Thứ Sáu, 06/11/2026</span>
          </div>
          <!-- Legend Status Pills -->
          <div class="flex items-center gap-2 text-xs flex-wrap">
            <span class="px-2 py-0.5 rounded-full bg-white border border-[#16A34A] text-[#16A34A]">Trống</span>
            <span class="px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#16A34A]">Đã xác nhận</span>
            <span class="px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706]">Giữ chỗ</span>
            <span class="px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#2563EB]">Đang đá</span>
            <span class="px-2 py-0.5 rounded-full hatch-slate border border-[#CBD5E1]">Bảo trì</span>
          </div>
        </div>

        <!-- Gantt Chart Container -->
        <div class="ui-card p-5 overflow-x-auto">
          <div class="min-w-[900px]">
            <!-- Timeline Hours Header 05:30 -> 22:30 -->
            <div class="grid grid-cols-12 border-b border-[#E2E8F0] pb-2 text-[11px] font-bold text-[#64748B] pl-28 text-center">
              <div>05:30</div><div>07:00</div><div>08:30</div><div>14:00</div><div>15:30</div>
              <div>17:00</div><div class="text-[#DC2626] font-extrabold">17:30 ▼</div><div>18:30</div>
              <div>20:00</div><div>21:30</div><div>22:30</div><div>23:00</div>
            </div>

            <!-- 6 Rows for 6 Pitches (Frame 12) -->
            <div id="gantt-rows" class="divide-y divide-[#E2E8F0] pt-2">
              <!-- Rendered by JS -->
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- TAB 3: ĐẶT SÂN TẠI QUẦY (Frame 13) -->
      <!-- ========================================== -->
      <div id="tab-content-quick-booking" class="space-y-6 hidden">
        <div class="ui-card p-6 max-w-2xl mx-auto space-y-4">
          <div class="border-b border-[#E2E8F0] pb-3">
            <h3 class="font-heading font-extrabold text-lg text-[#0F172A]">Tạo nhanh đơn đặt sân tại quầy</h3>
            <p class="text-xs text-[#64748B] mt-0.5">Nhân viên trực sân điền thông tin để khóa lịch tức thì, chống đè lịch khách online.</p>
          </div>

          <form id="admin-walkin-form" class="space-y-4 text-xs">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block font-bold text-[#475569] mb-1">Tên khách / Đội bóng *</label>
                <input type="text" id="admin-cust-name" required placeholder="Ví dụ: FC Cầu Giấy (Anh Tuấn)" class="input-field w-full font-semibold">
              </div>
              <div>
                <label class="block font-bold text-[#475569] mb-1">Số điện thoại liên hệ *</label>
                <input type="tel" id="admin-cust-phone" required placeholder="0988 123 456" class="input-field w-full font-semibold">
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block font-bold text-[#475569] mb-1">Chọn sân bóng *</label>
                <select id="admin-pitch-select" class="input-field w-full font-bold">
                  <!-- Rendered by JS -->
                </select>
              </div>
              <div>
                <label class="block font-bold text-[#475569] mb-1">Khung giờ đá *</label>
                <select id="admin-slot-select" class="input-field w-full font-bold text-[#16A34A]">
                  <!-- Rendered by JS -->
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block font-bold text-[#475569] mb-1">Hình thức cọc / thanh toán</label>
                <select id="admin-pay-select" class="input-field w-full font-semibold">
                  <option value="Tiền mặt tại quầy">Tiền mặt tại quầy (Đã thu)</option>
                  <option value="Chuyển khoản VietQR">Chuyển khoản VietQR</option>
                  <option value="Khách quen (Chưa cọc)">Khách quen (Chưa cọc - Thu sau trận)</option>
                </select>
              </div>
              <div>
                <label class="block font-bold text-[#475569] mb-1">Ghi chú thêm</label>
                <input type="text" id="admin-cust-note" placeholder="Thuê thêm 10 áo bib, 1 thùng nước..." class="input-field w-full">
              </div>
            </div>

            <div class="pt-4 border-t border-[#E2E8F0] flex justify-end gap-3">
              <button type="reset" class="btn-base btn-secondary">Nhập lại</button>
              <button type="submit" class="btn-base btn-primary">Xác nhận tạo đơn khóa sân</button>
            </div>
          </form>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- TAB 4: QUẢN LÝ 17 SÂN & BẬT TẮT BẢO TRÌ (Frame 14) -->
      <!-- ========================================== -->
      <div id="tab-content-pitches" class="space-y-4 hidden">
        <div class="flex items-center justify-between">
          <h3 class="font-heading font-bold text-base text-[#0F172A]">Danh sách 17 sân bóng trực thuộc hệ thống</h3>
          <span class="text-xs text-[#64748B]">Bật công tắc bảo trì sẽ ngay lập tức khóa sân trên trang đặt của khách</span>
        </div>

        <div id="admin-pitches-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <!-- Rendered by JS with real-time Maintenance toggle -->
        </div>
      </div>

      <!-- ========================================== -->
      <!-- TAB 5: BẢNG GIÁ CẤU HÌNH (Frame 15) -->
      <!-- ========================================== -->
      <div id="tab-content-pricing" class="space-y-6 hidden">
        <div class="ui-card p-6 space-y-4">
          <h3 class="font-heading font-bold text-lg text-[#0F172A]">Cấu hình bảng giá theo khung giờ (VND / Giờ)</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
                  <th class="py-3 px-4">Loại sân</th>
                  <th class="py-3 px-4">Giờ thường (05:30 - 17:30)</th>
                  <th class="py-3 px-4">Giờ vàng tối (17:30 - 21:00)</th>
                  <th class="py-3 px-4">Cuối tuần (T7, CN)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#E2E8F0] font-semibold">
                <tr>
                  <td class="py-3 px-4 font-bold text-[#0F172A]">Sân 5 người</td>
                  <td class="py-3 px-4"><input type="text" value="250.000đ" class="input-field w-32 h-8 text-xs font-bold"></td>
                  <td class="py-3 px-4"><input type="text" value="350.000đ" class="input-field w-32 h-8 text-xs font-bold text-[#16A34A]"></td>
                  <td class="py-3 px-4"><input type="text" value="380.000đ" class="input-field w-32 h-8 text-xs font-bold"></td>
                </tr>
                <tr>
                  <td class="py-3 px-4 font-bold text-[#0F172A]">Sân 7 người</td>
                  <td class="py-3 px-4"><input type="text" value="450.000đ" class="input-field w-32 h-8 text-xs font-bold"></td>
                  <td class="py-3 px-4"><input type="text" value="650.000đ" class="input-field w-32 h-8 text-xs font-bold text-[#16A34A]"></td>
                  <td class="py-3 px-4"><input type="text" value="700.000đ" class="input-field w-32 h-8 text-xs font-bold"></td>
                </tr>
                <tr>
                  <td class="py-3 px-4 font-bold text-[#0F172A]">Sân 11 người</td>
                  <td class="py-3 px-4"><input type="text" value="900.000đ" class="input-field w-32 h-8 text-xs font-bold"></td>
                  <td class="py-3 px-4"><input type="text" value="1.200.000đ" class="input-field w-32 h-8 text-xs font-bold text-[#16A34A]"></td>
                  <td class="py-3 px-4"><input type="text" value="1.400.000đ" class="input-field w-32 h-8 text-xs font-bold"></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="pt-3 border-t border-[#E2E8F0] flex justify-end">
            <button onclick="alert('Đã lưu cấu hình bảng giá mới thành công!')" class="btn-base btn-primary">Lưu bảng giá</button>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- TAB 6: KHÁCH HÀNG & HỘI VIÊN (Frame 16) -->
      <!-- ========================================== -->
      <div id="tab-content-customers" class="space-y-4 hidden">
        <div class="ui-card overflow-hidden">
          <table class="w-full text-left text-xs">
            <thead class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
              <tr>
                <th class="py-3 px-4">Tên hội viên</th>
                <th class="py-3 px-4">Số điện thoại</th>
                <th class="py-3 px-4">Hạng</th>
                <th class="py-3 px-4">Điểm tích lũy</th>
                <th class="py-3 px-4">Tổng số trận</th>
                <th class="py-3 px-4 text-right">Tổng chi tiêu</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#E2E8F0]">
              <tr class="bg-[#DCFCE7]/30 font-semibold">
                <td class="py-3 px-4">Trần Minh Hoàng</td>
                <td class="py-3 px-4">0352 313 548</td>
                <td class="py-3 px-4"><span class="px-2 py-0.5 rounded bg-slate-100 text-[#16A34A] font-bold">Bạc</span></td>
                <td class="py-3 px-4 font-bold text-[#16A34A]">820 đ</td>
                <td class="py-3 px-4">14 trận</td>
                <td class="py-3 px-4 text-right font-bold text-[#0F172A]">8.420.000đ</td>
              </tr>
              <tr>
                <td class="py-3 px-4">Lê Đức Anh (FC Cầu Giấy)</td>
                <td class="py-3 px-4">0903 112 233</td>
                <td class="py-3 px-4"><span class="px-2 py-0.5 rounded bg-[#FEF3C7] text-[#D97706] font-bold">Vàng</span></td>
                <td class="py-3 px-4 font-bold text-[#16A34A]">2.350 đ</td>
                <td class="py-3 px-4">41 trận</td>
                <td class="py-3 px-4 text-right font-bold text-[#0F172A]">24.900.000đ</td>
              </tr>
              <tr>
                <td class="py-3 px-4">Phạm Quốc Bảo (HUTECH)</td>
                <td class="py-3 px-4">0918 445 566</td>
                <td class="py-3 px-4"><span class="px-2 py-0.5 rounded bg-slate-100 text-[#64748B] font-bold">Đồng</span></td>
                <td class="py-3 px-4 font-bold text-[#16A34A]">310 đ</td>
                <td class="py-3 px-4">6 trận</td>
                <td class="py-3 px-4 text-right font-bold text-[#0F172A]">2.100.000đ</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- TAB 7: THANH TOÁN & DUYỆT CỌC VIETQR (Frame 17) -->
      <!-- ========================================== -->
      <div id="tab-content-payments" class="space-y-4 hidden">
        <div class="ui-card p-4 flex items-center justify-between">
          <div>
            <h3 class="font-heading font-bold text-base text-[#0F172A]">Danh sách biên lai chuyển khoản VietQR chờ duyệt</h3>
            <p class="text-xs text-[#64748B]">Bấm "Duyệt cọc" để xác nhận giữ sân và phát hành mã QR check-in cho khách</p>
          </div>
          <span id="admin-payments-header-badge" class="px-3 py-1 rounded-full bg-[#FEF3C7] text-[#D97706] text-xs font-bold">3 Đang chờ</span>
        </div>

        <div class="ui-card overflow-hidden">
          <table class="w-full text-left text-xs">
            <thead class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
              <tr>
                <th class="py-3 px-4">Thời gian</th>
                <th class="py-3 px-4">Mã đơn</th>
                <th class="py-3 px-4">Khách hàng</th>
                <th class="py-3 px-4">Số tiền cọc</th>
                <th class="py-3 px-4">Ngân hàng</th>
                <th class="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody id="admin-payments-tbody" class="divide-y divide-[#E2E8F0]">
              <!-- Rendered dynamically with 1-click Approve -->
            </tbody>
          </table>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- TAB 8: BÁO CÁO THỐNG KÊ (Frame 18) -->
      <!-- ========================================== -->
      <div id="tab-content-reports" class="space-y-6 hidden">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="ui-card p-5">
            <div class="text-xs text-[#64748B]">Doanh thu tháng 11/2026</div>
            <div class="font-heading font-extrabold text-2xl text-[#16A34A] mt-1">118.500.000đ</div>
            <div class="text-[11px] text-[#64748B] mt-1">Đạt 85% chỉ tiêu tháng</div>
          </div>
          <div class="ui-card p-5">
            <div class="text-xs text-[#64748B]">Tổng số ca thi đấu</div>
            <div class="font-heading font-extrabold text-2xl text-[#0F172A] mt-1">340 trận</div>
            <div class="text-[11px] text-[#16A34A] mt-1">Tỷ lệ hủy sân chỉ 3.2%</div>
          </div>
          <div class="ui-card p-5">
            <div class="text-xs text-[#64748B]">Doanh thu dịch vụ (Nước/Áo bib)</div>
            <div class="font-heading font-extrabold text-2xl text-[#2563EB] mt-1">16.400.000đ</div>
            <div class="text-[11px] text-[#64748B] mt-1">+15% so với tháng trước</div>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- TAB 9: CÀI ĐẶT HỆ THỐNG (Frame 19) -->
      <!-- ========================================== -->
      <div id="tab-content-settings" class="space-y-6 hidden">
        <div class="ui-card p-6 max-w-2xl mx-auto space-y-4">
          <h3 class="font-heading font-bold text-lg text-[#0F172A] border-b border-[#E2E8F0] pb-3">Cấu hình thông số hệ thống</h3>
          <div class="space-y-3 text-xs">
            <div>
              <label class="block font-bold text-[#475569] mb-1">Tỷ lệ đặt cọc bắt buộc (%)</label>
              <input type="number" id="cfg-deposit-rate" value="30" class="input-field w-32 font-bold text-[#16A34A]">
            </div>
            <div>
              <label class="block font-bold text-[#475569] mb-1">Ngân hàng nhận tiền VietQR</label>
              <input type="text" id="cfg-bank-name" value="Vietcombank" class="input-field w-full font-semibold">
            </div>
            <div>
              <label class="block font-bold text-[#475569] mb-1">Số tài khoản thụ hưởng</label>
              <input type="text" id="cfg-bank-acc" value="0123456789" class="input-field w-full font-mono font-bold">
            </div>
            <div>
              <label class="block font-bold text-[#475569] mb-1">Hotline hỗ trợ 24/7</label>
              <input type="text" id="cfg-hotline" value="0352 313 548" class="input-field w-full">
            </div>
          </div>
          <div class="pt-4 border-t border-[#E2E8F0] flex justify-end">
            <button onclick="alert('Đã cập nhật cài đặt hệ thống thành công!')" class="btn-base btn-primary">Lưu cài đặt</button>
          </div>
        </div>
      </div>

    </main>
  </div>

  <!-- SCRIPTS -->
  <script src="../js/data.js?v=20261109_v4"></script>
  <script src="../js/app.js?v=20261109_v4"></script>
  <script src="../js/api.js?v=20261109_v4"></script>
  <script src="../js/admin.js?v=20261109_v4"></script>
</body>
</html>
