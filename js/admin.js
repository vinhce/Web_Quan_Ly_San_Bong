/**
 * SÂN BÓNG PRO - QUẢN TRỊ VIÊN & VẬN HÀNH (admin.js)
 */

let activeModule = 'overview';

document.addEventListener('DOMContentLoaded', () => {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  renderOverviewTodayBookings();
  renderTimelineGantt();
  initQuickBookingForm();
  renderAdminPitches();
  renderAdminPayments();
});

function switchAdminTab(moduleKey) {
  activeModule = moduleKey;
  const allModules = ['overview', 'timeline', 'quick-booking', 'pitches', 'pricing', 'customers', 'payments', 'reports', 'settings'];

  allModules.forEach(m => {
    const btn = document.getElementById(`nav-${m}`);
    const content = document.getElementById(`tab-content-${m}`);
    if (m === moduleKey) {
      if (btn) btn.className = 'w-full h-10 px-3 rounded-lg flex items-center gap-3 text-xs font-bold transition-all bg-[#DCFCE7] text-[#16A34A]';
      if (content) content.classList.remove('hidden');
    } else {
      if (btn) btn.className = 'w-full h-10 px-3 rounded-lg flex items-center gap-3 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] transition-all';
      if (content) content.classList.add('hidden');
    }
  });

  const titleMap = {
    'overview': '1. Tổng quan KPI & Chỉ số tài chính',
    'timeline': '2. Lịch đặt sân Timeline Gantt trực quan',
    'quick-booking': '3. Đặt sân tại quầy (Tạo nhanh đơn)',
    'pitches': '4. Quản lý 6 sân bóng & Bật/Tắt bảo trì',
    'pricing': '5. Cấu hình bảng giá niêm yết',
    'customers': '6. Danh sách khách hàng & Hội viên',
    'payments': '7. Duyệt biên lai cọc VietQR 1 chạm',
    'reports': '8. Báo cáo thống kê hiệu suất sân',
    'settings': '9. Cài đặt hệ thống & Tài khoản'
  };
  const titleEl = document.getElementById('admin-module-title');
  if (titleEl) titleEl.textContent = titleMap[moduleKey] || 'Quản trị';
}

// 1. Render Ca đá hôm nay (Overview)
function renderOverviewTodayBookings() {
  const db = window.SanBongApp.SanBongDB;
  const bookings = db.getAllBookings().slice(0, 5);
  const container = document.getElementById('overview-today-bookings');
  if (!container) return;

  container.innerHTML = bookings.map(b => `
    <div class="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
      <div class="flex items-center gap-3">
        <span class="font-mono font-bold">${b.code}</span>
        <span class="font-bold text-[#0F172A]">${b.pitchName}</span>
        <span class="text-[#16A34A] font-semibold">${b.slotTime}</span>
        <span class="text-[#64748B]">(${b.customerName})</span>
      </div>
      <div class="flex items-center gap-2">
        ${window.SanBongApp.statusPill(b.status)}
        <span class="font-bold text-[#0F172A]">${window.SanBongApp.formatVND(b.totalPrice)}</span>
      </div>
    </div>
  `).join('');
}

// 2. Render Timeline Gantt
function renderTimelineGantt() {
  const db = window.SanBongApp.SanBongDB;
  const pitches = db.getPitches();
  const container = document.getElementById('gantt-rows');
  if (!container) return;

  container.innerHTML = pitches.map(p => {
    const isMaint = p.status === 'Bảo trì';

    return `
      <div class="flex items-center h-16 relative">
        <div class="w-28 font-heading font-bold text-xs shrink-0 text-[#0F172A]">${p.name}</div>
        <div class="flex-1 h-10 bg-[#F8FAFC] rounded-lg relative overflow-hidden border border-[#E2E8F0]">
          ${isMaint ? `
            <div class="w-full h-full hatch-slate flex items-center justify-center font-bold text-xs text-[#DC2626]">
              Đang bảo dưỡng mặt cỏ toàn bộ ngày
            </div>
          ` : `
            <!-- Slot Đang đá 17:00 - 18:30 -->
            <div class="absolute left-[45%] w-[15%] top-1 bottom-1 rounded bg-[#DBEAFE] border border-[#2563EB] text-[#2563EB] px-2 py-0.5 text-[10px] truncate font-bold">
              Lê Đức Anh (Đang đá)
            </div>
            <!-- Slot Đã xác nhận 18:30 - 20:00 -->
            <div class="absolute left-[62%] w-[16%] top-1 bottom-1 rounded bg-[#DCFCE7] border border-[#16A34A] text-[#16A34A] px-2 py-0.5 text-[10px] truncate font-bold">
              Trần Minh Hoàng
            </div>
            <!-- Slot Giữ chỗ 20:00 - 21:30 -->
            <div class="absolute left-[80%] w-[12%] top-1 bottom-1 rounded bg-[#FEF3C7] border border-[#F59E0B] text-[#D97706] px-1.5 py-0.5 text-[10px] truncate font-bold">
              Giữ chỗ
            </div>
          `}
        </div>
      </div>
    `;
  }).join('');
}

// 3. Quick walkin booking
function initQuickBookingForm() {
  const db = window.SanBongApp.SanBongDB;
  const pitchSelect = document.getElementById('admin-pitch-select');
  const slotSelect = document.getElementById('admin-slot-select');
  if (!pitchSelect || !slotSelect) return;

  pitchSelect.innerHTML = db.getPitches().map(p => `
    <option value="${p.id}" ${p.status === 'Bảo trì' ? 'disabled' : ''}>${p.name} (${p.typeName})</option>
  `).join('');

  slotSelect.innerHTML = db.getTimeSlots().map(s => `
    <option value="${s.id}">${s.time} ${s.isPeak ? '★ Giờ vàng' : ''}</option>
  `).join('');

  document.getElementById('admin-walkin-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('admin-cust-name').value;
    const phone = document.getElementById('admin-cust-phone').value;
    const pitchId = pitchSelect.value;
    const slotId = slotSelect.value;
    const note = document.getElementById('admin-cust-note').value;
    const payMethod = document.getElementById('admin-pay-select').value;

    const newB = db.createBooking({
      customerName: name,
      phone: phone,
      pitchId: pitchId,
      date: new Date().toISOString().split('T')[0],
      slotId: slotId,
      slotTime: db.getTimeSlots().find(s => s.id === slotId)?.time,
      services: [],
      voucherCode: '',
      note: note,
      paymentMethod: payMethod
    });

    alert(`Tạo đơn thành công tại quầy! Mã đơn: ${newB.code}`);
    e.target.reset();
    renderOverviewTodayBookings();
    renderTimelineGantt();
    renderAdminPayments();
    switchAdminTab('overview');
  });
}

// 4. Admin Pitches & Maintenance Switcher
function renderAdminPitches() {
  const db = window.SanBongApp.SanBongDB;
  const pitches = db.getPitches();
  const container = document.getElementById('admin-pitches-list');
  if (!container) return;

  container.innerHTML = pitches.map(p => {
    const isMaint = p.status === 'Bảo trì';

    return `
      <div class="ui-card overflow-hidden flex flex-col justify-between">
        <div>
          <div class="relative">
            ${window.SanBongApp.renderPitchSVG(p.variant || 'standard', 'h-32')}
            <div class="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-white text-[11px] font-bold text-[#0F172A]">
              ${p.typeName}
            </div>
            <div class="absolute top-2 right-2">
              ${window.SanBongApp.statusPill(p.status)}
            </div>
          </div>
          <div class="p-4 space-y-2">
            <div class="flex items-center justify-between">
              <h4 class="font-heading font-bold text-sm text-[#0F172A]">${p.name}</h4>
              <span class="text-xs font-bold text-[#16A34A]">${window.SanBongApp.formatVND(p.basePrice)}/h</span>
            </div>
            <div class="text-[11px] text-[#64748B]">${p.grass}</div>
          </div>
        </div>

        <div class="p-4 pt-0 flex items-center justify-between border-t border-[#F1F5F9]">
          <span class="text-xs font-semibold text-[#475569]">Bảo trì mặt cỏ:</span>
          <button onclick="toggleMaintenance('${p.id}')" class="btn-sm ${isMaint ? 'btn-primary' : 'btn-danger-outline'} font-bold">
            ${isMaint ? '✓ Mở hoạt động lại' : '⚠️ Bật bảo trì'}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function toggleMaintenance(pitchId) {
  const db = window.SanBongApp.SanBongDB;
  const pitch = db.getPitchById(pitchId);
  if (!pitch) return;

  const newStatus = pitch.status === 'Bảo trì' ? 'Hoạt động' : 'Bảo trì';
  db.updatePitchStatus(pitchId, newStatus);
  renderAdminPitches();
  renderTimelineGantt();
  initQuickBookingForm();
  alert(`Đã chuyển trạng thái sân ${pitch.name} thành "${newStatus}"!`);
}

// 7. Duyệt cọc VietQR 1 chạm
function renderAdminPayments() {
  const tbody = document.getElementById('admin-payments-tbody');
  if (!tbody) return;

  const pendingList = [
    { time: '10:12', code: 'SB-20261106-0042', name: 'Trần Minh Hoàng', amt: 306000, bank: 'Vietcombank' },
    { time: '11:05', code: 'SB-20261106-0044', name: 'Phạm Quốc Bảo', amt: 126000, bank: 'Vietcombank' },
    { time: '13:40', code: 'SB-20261106-0045', name: 'Đỗ Thành Long', amt: 90000, bank: 'MB Bank' }
  ];

  tbody.innerHTML = pendingList.map((item, idx) => `
    <tr id="pay-row-${idx}">
      <td class="py-3 px-4 text-[#64748B]">${item.time}</td>
      <td class="py-3 px-4 font-mono font-bold text-[#0F172A]">${item.code}</td>
      <td class="py-3 px-4 font-semibold">${item.name}</td>
      <td class="py-3 px-4 font-extrabold text-[#16A34A]">${window.SanBongApp.formatVND(item.amt)}</td>
      <td class="py-3 px-4">${item.bank} (VietQR)</td>
      <td class="py-3 px-4 text-right space-x-2">
        <button onclick="approveDeposit('${idx}', '${item.code}')" class="btn-sm btn-primary">Duyệt cọc</button>
        <button onclick="rejectDeposit('${idx}')" class="btn-sm btn-danger-outline">Từ chối</button>
      </td>
    </tr>
  `).join('');
}

function approveDeposit(idx, code) {
  const row = document.getElementById(`pay-row-${idx}`);
  if (row) {
    row.innerHTML = `
      <td colspan="5" class="py-3 px-4 text-[#16A34A] font-bold bg-[#DCFCE7]/40">
        ✓ Đã duyệt cọc đơn ${code}! Mã vé check-in đã được kích hoạt.
      </td>
      <td class="py-3 px-4 text-right text-xs font-bold text-[#16A34A]">Hoàn tất</td>
    `;
  }
}

function rejectDeposit(idx) {
  const row = document.getElementById(`pay-row-${idx}`);
  if (row) row.remove();
}
