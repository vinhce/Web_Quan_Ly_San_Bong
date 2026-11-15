let currentPitchFilter = 'all';
window.currentPitchFilter = currentPitchFilter;

async function toggleMaintenance(pitchId) {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;
  const pitch = db.getPitchById(pitchId);
  if (!pitch) return;

  const newStatus = pitch.status === 'Bảo trì' ? 'Hoạt động' : 'Bảo trì';
  let reason = '';
  if (newStatus === 'Bảo trì') {
    const inputReason = prompt(`Nhập lý do bảo trì cho sân ${pitch.name} (ví dụ: Thay dàn đèn LED, bảo dưỡng mặt cỏ...):`, 'Bảo dưỡng định kỳ');
    if (inputReason === null) return;
    reason = inputReason.trim() || 'Bảo dưỡng định kỳ';
  }

  const r = await adminFetchJson('../api/admin.php?action=toggle_pitch', {
    method: 'POST',
    body: JSON.stringify({ pitchId: pitchId, status: newStatus, reason: reason })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể cập nhật trạng thái bảo trì sân!', 'error', 4000);
    return;
  }

  db.updatePitchStatus(pitchId, newStatus);
  renderAdminPitches();
  renderTimelineGantt();
  initQuickBookingForm();
  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(
      newStatus === 'Bảo trì'
        ? `Đã chuyển sân ${pitch.name} sang bảo trì! (Lý do: ${reason})`
        : `Đã mở lại sân ${pitch.name} hoạt động bình thường!`,
      'info',
      3000
    );
  }
}
window.toggleMaintenance = toggleMaintenance;

async function toggleHidePitch(pitchId) {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền ẩn/hiện sân bóng!', 'error');
    return;
  }
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;
  const pitch = db.getPitchById(pitchId);
  if (!pitch) return;

  const newStatus = pitch.status === 'Ẩn' ? 'Hoạt động' : 'Ẩn';
  const r = await adminFetchJson('../api/admin.php?action=toggle_pitch', {
    method: 'POST',
    body: JSON.stringify({ pitchId: pitchId, status: newStatus })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể cập nhật trạng thái hiển thị sân!', 'error', 4000);
    return;
  }

  db.updatePitchStatus(pitchId, newStatus);
  renderAdminPitches();
  renderTimelineGantt();
  initQuickBookingForm();
  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(
      newStatus === 'Ẩn'
        ? `🙈 Đã ẩn sân ${pitch.name} khỏi danh sách đặt sân của khách!`
        : `👁️ Đã mở hiển thị lại sân ${pitch.name}!`,
      'info',
      3000
    );
  }
}
window.toggleHidePitch = toggleHidePitch;

function openPitchModal(pitchId = '') {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền thêm/sửa thông tin & giá riêng từng sân!', 'error');
    return;
  }
  const modal = document.getElementById('pitch-edit-modal');
  if (!modal) return;

  const db = window.SanBongApp?.SanBongDB;
  const pitch = (pitchId && db) ? db.getPitchById(pitchId) : null;

  const titleEl = document.getElementById('pitch-modal-title');
  const idEl = document.getElementById('pitch-form-id');
  const nameEl = document.getElementById('pitch-form-name');
  const typeEl = document.getElementById('pitch-form-type');
  const sizeEl = document.getElementById('pitch-form-size');
  const grassEl = document.getElementById('pitch-form-grass');
  const baseEl = document.getElementById('pitch-form-base-price');
  const peakEl = document.getElementById('pitch-form-peak-price');
  const wkndEl = document.getElementById('pitch-form-weekend-price');
  const statusEl = document.getElementById('pitch-form-status');

  if (pitch) {
    if (titleEl) titleEl.textContent = `✏️ Sửa thông tin & Giá riêng: ${pitch.name}`;
    if (idEl) { idEl.value = pitch.id; idEl.readOnly = true; idEl.classList.add('bg-slate-100'); }
    if (nameEl) nameEl.value = pitch.name || '';
    if (typeEl) typeEl.value = String(pitch.type || 5);
    if (sizeEl) sizeEl.value = pitch.size || '20m x 40m';
    if (grassEl) grassEl.value = pitch.grass || 'Cỏ nhân tạo FIFA Quality Pro 50mm';
    if (baseEl) baseEl.value = Number(pitch.basePrice || 250000);
    if (peakEl) peakEl.value = Number(pitch.peakPrice || 350000);
    if (wkndEl) wkndEl.value = Number(pitch.weekendPrice || pitch.peakPrice || 380000);
    if (statusEl) statusEl.value = pitch.status || 'Hoạt động';
  } else {
    const nextIdx = db ? db.getPitches().length + 1 : 9;
    if (titleEl) titleEl.textContent = '➕ Thêm sân bóng mới vào hệ thống';
    if (idEl) { idEl.value = `P5-${String.fromCharCode(64 + nextIdx)}`; idEl.readOnly = false; idEl.classList.remove('bg-slate-100'); }
    if (nameEl) nameEl.value = '';
    if (typeEl) typeEl.value = '5';
    if (sizeEl) sizeEl.value = '20m x 40m';
    if (grassEl) grassEl.value = 'Cỏ nhân tạo FIFA Quality Pro 50mm';
    if (baseEl) baseEl.value = 250000;
    if (peakEl) peakEl.value = 350000;
    if (wkndEl) wkndEl.value = 380000;
    if (statusEl) statusEl.value = 'Hoạt động';
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}
window.openPitchModal = openPitchModal;

function closePitchModal() {
  const modal = document.getElementById('pitch-edit-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}
window.closePitchModal = closePitchModal;

async function savePitchForm(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!isManagerOrAdmin()) return;

  const id = (document.getElementById('pitch-form-id')?.value || '').trim().toUpperCase();
  const name = (document.getElementById('pitch-form-name')?.value || '').trim();
  const type = parseInt(document.getElementById('pitch-form-type')?.value || '5', 10);
  const size = (document.getElementById('pitch-form-size')?.value || '20m x 40m').trim();
  const grass = (document.getElementById('pitch-form-grass')?.value || 'Cỏ nhân tạo FIFA Quality Pro').trim();
  const basePrice = Math.max(10000, parseInt(document.getElementById('pitch-form-base-price')?.value || '250000', 10));
  const peakPrice = Math.max(10000, parseInt(document.getElementById('pitch-form-peak-price')?.value || '350000', 10));
  const weekendPrice = Math.max(10000, parseInt(document.getElementById('pitch-form-weekend-price')?.value || '380000', 10));
  const status = document.getElementById('pitch-form-status')?.value || 'Hoạt động';

  if (!id || !name) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập đầy đủ Mã sân và Tên sân!', 'warning');
    return;
  }

  const payload = {
    sub_action: 'save',
    id,
    name,
    type,
    typeName: `Sân ${type} người`,
    size,
    grass,
    basePrice,
    peakPrice,
    weekendPrice,
    status
  };

  const r = await adminFetchJson('../api/admin.php?action=manage_pitch', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể lưu thông tin sân!', 'error', 4000);
    return;
  }

  const db = window.SanBongApp?.SanBongDB;
  if (db && typeof db.upsertPitch === 'function') {
    db.upsertPitch(payload);
  }
  closePitchModal();
  renderAdminPitches();
  renderTimelineGantt();
  initQuickBookingForm();
  renderOverviewKPIs();
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast(`✓ Đã lưu thành công cấu hình sân ${name}!`, 'success', 3500);
}
window.savePitchForm = savePitchForm;

function renderMaintenanceAffectedBanner(affectedBookings) {
  const container = document.getElementById('maintenance-affected-banner');
  if (!container) return;
  if (!Array.isArray(affectedBookings) || affectedBookings.length === 0) {
    container.classList.add('hidden');
    container.innerHTML = '';
    return;
  }

  container.className = 'p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5';
  container.innerHTML = `
    <div class="font-bold flex items-center gap-2">
      <span>⚠️ Có ${affectedBookings.length} ca đặt sân bị ảnh hưởng bởi lịch bảo trì này:</span>
    </div>
    <div class="space-y-1 max-h-36 overflow-y-auto">
      ${affectedBookings.map(b => (
        `<div class="flex items-center justify-between text-[11px] bg-white/80 px-2.5 py-1 rounded border border-amber-100">
          <span class="font-mono font-bold">${escapeSearchHTML(b.code)} (${escapeSearchHTML(b.booking_date)} · ${escapeSearchHTML(b.slot_time)})</span>
          <span>${escapeSearchHTML(b.customer_name)} - ${escapeSearchHTML(b.phone)}</span>
          <button type="button" onclick="openInPlayModal('${escapeJsAttr(b.code)}')" class="text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer">Đổi sân ngay</button>
        </div>`
      )).join('')}
    </div>
  `;
}
window.renderMaintenanceAffectedBanner = renderMaintenanceAffectedBanner;

async function loadMaintenanceSchedules() {
  const tbody = document.getElementById('maintenance-schedules-tbody');
  if (!tbody) return;

  const r = await adminFetchJson('../api/admin.php?action=save_maintenance');
  if (!r.ok || !Array.isArray(r.data)) {
    tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-slate-400">Chưa có lịch bảo trì nào được ghi nhận.</td></tr>';
    return;
  }

  maintenanceSchedulesCache = r.data;
  if (r.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-slate-400">Chưa có lịch bảo trì nào. Bấm "+ Lên lịch bảo trì" để tạo mới.</td></tr>';
    return;
  }

  const stMap = {
    scheduled: '<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">Đã lên lịch</span>',
    in_progress: '<span class="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[10px]">Đang bảo trì</span>',
    completed: '<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">Hoàn thành</span>',
    cancelled: '<span class="px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-bold text-[10px]">Đã hủy</span>'
  };

  tbody.innerHTML = r.data.map(m => {
    const mid = Number(m.id);
    const st = m.status || 'scheduled';
    const dateRange = m.start_date === m.end_date
      ? escapeSearchHTML(m.start_date || '')
      : `${escapeSearchHTML(m.start_date || '')} → ${escapeSearchHTML(m.end_date || '')}`;
    const timeRange = `${escapeSearchHTML(String(m.start_time || '').slice(0, 5))} - ${escapeSearchHTML(String(m.end_time || '').slice(0, 5))}`;

    let actions = '';
    if (isManagerOrAdmin()) {
      const btns = [];
      if (st === 'scheduled' || st === 'in_progress') {
        btns.push(`<button type="button" onclick="openMaintenanceModal(${mid})" class="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer">✏️ Sửa</button>`);
      }
      if (st === 'scheduled') {
        btns.push(`<button type="button" onclick="updateMaintenanceStatus(${mid}, 'in_progress')" class="px-2 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] cursor-pointer">▶ Bắt đầu</button>`);
      }
      if (st === 'scheduled' || st === 'in_progress') {
        btns.push(`<button type="button" onclick="updateMaintenanceStatus(${mid}, 'completed')" class="px-2 py-1 rounded bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-[11px] cursor-pointer">✓ Hoàn thành</button>`);
        btns.push(`<button type="button" onclick="updateMaintenanceStatus(${mid}, 'cancelled')" class="px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[11px] cursor-pointer">Hủy</button>`);
      }
      actions = btns.length > 0 ? `<div class="inline-flex flex-wrap items-center justify-end gap-1">${btns.join('')}</div>` : '<span class="text-[#94A3B8]">—</span>';
    } else {
      actions = '<span class="text-[#94A3B8]">—</span>';
    }

    return `<tr class="hover:bg-slate-50/70">
      <td class="py-3 px-4 font-mono font-bold text-[#0F172A]">#${mid}</td>
      <td class="py-3 px-4 font-bold text-[#0F172A]">${escapeSearchHTML(m.pitch_name || m.pitch_id || '')}</td>
      <td class="py-3 px-4 font-mono text-[#334155]">${dateRange}</td>
      <td class="py-3 px-4 font-semibold text-[#0F172A]">⏰ ${timeRange}</td>
      <td class="py-3 px-4 text-[#475569] max-w-[240px]">${escapeSearchHTML(m.reason || '')}</td>
      <td class="py-3 px-4">${stMap[st] || escapeSearchHTML(st)}</td>
      <td class="py-3 px-4 text-right">${actions}</td>
    </tr>`;
  }).join('');
}
window.loadMaintenanceSchedules = loadMaintenanceSchedules;

function openMaintenanceModal(maintId = null) {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền tạo/sửa lịch bảo trì!', 'error');
    return;
  }
  const modal = document.getElementById('maintenance-modal');
  if (!modal) return;

  const db = window.SanBongApp?.SanBongDB;
  const pitchSel = document.getElementById('maint-form-pitch');
  if (pitchSel && db) {
    pitchSel.innerHTML = db.getPitches().filter(p => p.status !== 'Ẩn').map(p => (
      `<option value="${escapeSearchHTML(p.id)}">${escapeSearchHTML(p.name)} (${escapeSearchHTML(p.typeName || p.type)})</option>`
    )).join('');
  }

  const item = maintId ? maintenanceSchedulesCache.find(x => Number(x.id) === Number(maintId)) : null;
  const todayISO = getLocalTodayISO();

  const titleEl = document.getElementById('maintenance-modal-title');
  const idEl = document.getElementById('maint-form-id');
  const statusEl = document.getElementById('maint-form-status');
  const startDateEl = document.getElementById('maint-form-start-date');
  const endDateEl = document.getElementById('maint-form-end-date');
  const startTimeEl = document.getElementById('maint-form-start-time');
  const endTimeEl = document.getElementById('maint-form-end-time');
  const reasonEl = document.getElementById('maint-form-reason');
  const notesEl = document.getElementById('maint-form-notes');

  if (item) {
    if (titleEl) titleEl.textContent = `✏️ Cập nhật lịch bảo trì #${item.id}`;
    if (idEl) idEl.value = String(item.id);
    if (pitchSel) pitchSel.value = item.pitch_id;
    if (statusEl) statusEl.value = item.status || 'scheduled';
    if (startDateEl) startDateEl.value = item.start_date || todayISO;
    if (endDateEl) endDateEl.value = item.end_date || item.start_date || todayISO;
    if (startTimeEl) startTimeEl.value = String(item.start_time || '08:00').slice(0, 5);
    if (endTimeEl) endTimeEl.value = String(item.end_time || '17:00').slice(0, 5);
    if (reasonEl) reasonEl.value = item.reason || '';
    if (notesEl) notesEl.value = item.notes || '';
  } else {
    if (titleEl) titleEl.textContent = '➕ Lên lịch bảo trì mặt cỏ / hệ thống';
    if (idEl) idEl.value = '';
    if (statusEl) statusEl.value = 'scheduled';
    if (startDateEl) startDateEl.value = todayISO;
    if (endDateEl) endDateEl.value = todayISO;
    if (startTimeEl) startTimeEl.value = '08:00';
    if (endTimeEl) endTimeEl.value = '17:00';
    if (reasonEl) reasonEl.value = '';
    if (notesEl) notesEl.value = '';
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}
window.openMaintenanceModal = openMaintenanceModal;

function closeMaintenanceModal() {
  const modal = document.getElementById('maintenance-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}
window.closeMaintenanceModal = closeMaintenanceModal;

async function saveMaintenanceForm(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!isManagerOrAdmin()) return;

  const id = document.getElementById('maint-form-id')?.value || '';
  const pitch_id = document.getElementById('maint-form-pitch')?.value || '';
  const status = document.getElementById('maint-form-status')?.value || 'scheduled';
  const start_date = document.getElementById('maint-form-start-date')?.value || '';
  const end_date = document.getElementById('maint-form-end-date')?.value || '';
  const start_time = document.getElementById('maint-form-start-time')?.value || '';
  const end_time = document.getElementById('maint-form-end-time')?.value || '';
  const reason = (document.getElementById('maint-form-reason')?.value || '').trim();
  const notes = (document.getElementById('maint-form-notes')?.value || '').trim();

  if (!pitch_id || !start_date || !end_date || !start_time || !end_time || !reason) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng điền đủ ngày, giờ, sân và lý do bảo trì!', 'warning');
    return;
  }

  const payload = {
    id: id ? Number(id) : null,
    pitch_id,
    status,
    start_date,
    end_date,
    start_time,
    end_time,
    reason,
    notes
  };

  const r = await adminFetchJson('../api/admin.php?action=save_maintenance', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể lưu lịch bảo trì!', 'error', 4000);
    return;
  }

  const affected = r.data?.affectedBookings || [];
  renderMaintenanceAffectedBanner(affected);
  closeMaintenanceModal();
  await loadMaintenanceSchedules();
  if (typeof refreshWalkinBookedSlots === 'function') await refreshWalkinBookedSlots();
  renderTimelineGantt();
  renderOverviewKPIs();
  if (window.SanBongApp?.showToast) {
    const affectedMsg = affected.length > 0 ? ` (Ảnh hưởng ${affected.length} ca đặt cần dời sân)` : '';
    window.SanBongApp.showToast((r.message || '✓ Đã lưu lịch bảo trì thành công!') + affectedMsg, 'success', 4000);
  }
}
window.saveMaintenanceForm = saveMaintenanceForm;

async function updateMaintenanceStatus(id, status) {
  if (!isManagerOrAdmin()) return;
  if (!['scheduled', 'in_progress', 'completed', 'cancelled'].includes(status)) return;

  if (status === 'cancelled' || status === 'completed') {
    const ok = await showAdminConfirm({
      title: status === 'cancelled' ? 'Hủy lịch bảo trì' : 'Hoàn tất bảo trì',
      message: status === 'cancelled'
        ? `Xác nhận hủy lịch bảo trì #${id}? Sân sẽ được mở lại lịch bình thường.`
        : `Xác nhận đã bảo trì xong cho lịch #${id}?`,
      confirmText: status === 'cancelled' ? 'Hủy lịch' : 'Hoàn thành',
      cancelText: 'Đóng',
      danger: status === 'cancelled'
    });
    if (!ok) return;
  }

  const r = await adminFetchJson('../api/admin.php?action=update_maintenance', {
    method: 'POST',
    body: JSON.stringify({ id: Number(id), status })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể cập nhật lịch bảo trì!', 'error', 4000);
    return;
  }
  const affected = r.data?.affectedBookings || [];
  renderMaintenanceAffectedBanner(affected);
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã cập nhật trạng thái bảo trì!', 'success', 3500);
  await loadMaintenanceSchedules();
  if (typeof refreshWalkinBookedSlots === 'function') await refreshWalkinBookedSlots();
  renderTimelineGantt();
}
window.updateMaintenanceStatus = updateMaintenanceStatus;

function filterAdminPitches(status) {
  currentPitchFilter = status || 'all';
  window.currentPitchFilter = currentPitchFilter;
  const mapBtn = {
    'all': 'pitch-filter-all',
    'Hoạt động': 'pitch-filter-active',
    'Bảo trì': 'pitch-filter-maint',
    'Ẩn': 'pitch-filter-hidden'
  };
  Object.keys(mapBtn).forEach(k => {
    const btn = document.getElementById(mapBtn[k]);
    if (btn) {
      if (k === currentPitchFilter) {
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold bg-[#16A34A] text-white shadow-xs cursor-pointer';
      } else {
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer';
      }
    }
  });
  renderAdminPitches();
}
window.filterAdminPitches = filterAdminPitches;

function renderAdminPitches() {
  const db = window.SanBongApp.SanBongDB;
  const allPitches = db.getPitches();
  const container = document.getElementById('admin-pitches-list');
  if (!container) return;

  const addBtn = document.getElementById('btn-add-pitch');
  if (addBtn) {
    if (isManagerOrAdmin()) {
      addBtn.classList.remove('hidden');
    } else {
      addBtn.classList.add('hidden');
    }
  }

  const subHeader = document.getElementById('admin-pitches-header-title') || document.querySelector('#tab-content-pitches h3');
  if (subHeader) {
    subHeader.textContent = `Danh sách ${allPitches.length} sân bóng trực thuộc hệ thống`;
  }

  let pitches = allPitches;
  if (currentPitchFilter !== 'all') {
    pitches = allPitches.filter(p => p.status === currentPitchFilter);
  }

  if (pitches.length === 0) {
    container.innerHTML = `<div class="col-span-full p-8 text-center text-xs text-[#64748B] bg-white rounded-xl border border-dashed border-slate-200">Không có sân bóng nào trong trạng thái "${escapeSearchHTML(currentPitchFilter)}".</div>`;
    return;
  }

  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  container.innerHTML = pitches.map(p => {
    const isMaint = p.status === 'Bảo trì';
    const isHidden = p.status === 'Ẩn';
    const weekendP = Number(p.weekendPrice || p.peakPrice || p.basePrice || 0);

    const statusBadgeHtml = isHidden
      ? '<span class="px-2.5 py-0.5 rounded-full bg-slate-700 text-white text-[11px] font-bold">🙈 Đã ẩn</span>'
      : window.SanBongApp.statusPill(p.status);

    const safePitchAttr = escapeSearchHTML(p.id);
    const adminControls = isManagerOrAdmin() ? `
      <div class="px-4 pb-3 pt-2 flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60">
        <button type="button" data-pitch-id="${safePitchAttr}" onclick="openPitchModal(this.getAttribute('data-pitch-id'))" class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white hover:bg-emerald-50 text-[#0F172A] hover:text-[#16A34A] border border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer flex-1 text-center">
          ✏️ Sửa sân & Giá riêng
        </button>
        <button type="button" data-pitch-id="${safePitchAttr}" onclick="toggleHidePitch(this.getAttribute('data-pitch-id'))" class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold ${isHidden ? 'bg-sky-600 text-white hover:bg-sky-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'} transition-colors cursor-pointer">
          ${isHidden ? '👁️ Hiện sân' : '🙈 Ẩn sân'}
        </button>
      </div>
    ` : '';

    return `
      <div class="ui-card overflow-hidden flex flex-col justify-between ${isHidden ? 'opacity-75 border-dashed border-slate-300' : ''}">
        <div>
          <div class="relative">
            ${window.SanBongApp.renderPitchSVG(p.variant || 'standard', 'h-32')}
            <div class="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-white text-[11px] font-bold text-[#0F172A] shadow-2xs">
              ${escapeSearchHTML(p.typeName)} · ${escapeSearchHTML(p.id)}
            </div>
            <div class="absolute top-2 right-2">
              ${statusBadgeHtml}
            </div>
          </div>
          <div class="p-4 space-y-2">
            <div class="flex items-center justify-between gap-2">
              <h4 class="font-heading font-bold text-sm text-[#0F172A]">${escapeSearchHTML(p.name)}</h4>
              <span class="text-xs font-bold text-[#16A34A]">${fmt(p.basePrice)}/h</span>
            </div>
            <div class="text-[11px] text-[#64748B]">${escapeSearchHTML(p.grass || '')} ${p.size ? '· ' + escapeSearchHTML(p.size) : ''}</div>
            <div class="p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-[#334155] leading-relaxed">
              Thường: <b class="text-[#16A34A]">${fmt(p.basePrice)}</b> | Cao điểm: <b class="text-amber-700">${fmt(p.peakPrice)}</b> | Cuối tuần: <b class="text-purple-700">${fmt(weekendP)}</b>
            </div>
          </div>
        </div>

        <div>
          <div class="p-4 pt-2 flex items-center justify-between border-t border-[#F1F5F9]">
            <span class="text-xs font-semibold text-[#475569]">Bảo trì mặt cỏ:</span>
            <button type="button" data-pitch-id="${safePitchAttr}" onclick="toggleMaintenance(this.getAttribute('data-pitch-id'))" class="btn-sm ${isMaint ? 'btn-primary' : 'btn-danger-outline'} font-bold cursor-pointer">
              ${isMaint ? '✓ Mở hoạt động lại' : '⚠️ Bật bảo trì'}
            </button>
          </div>
          ${adminControls}
        </div>
      </div>
    `;
  }).join('');
}
window.renderAdminPitches = renderAdminPitches;

