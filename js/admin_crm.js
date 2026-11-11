async function toggleMaintenance(pitchId) {
  const db = window.SanBongApp.SanBongDB;
  const pitch = db.getPitchById(pitchId);
  if (!pitch) return;

  const newStatus = pitch.status === 'Bảo trì' ? 'Hoạt động' : 'Bảo trì';
  const r = await adminFetchJson('../api/admin.php?action=toggle_pitch', {
    method: 'POST',
    body: JSON.stringify({ pitchId: pitchId, status: newStatus })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể cập nhật trạng thái bảo trì sân!', 'error', 4000);
    return;
  }

  db.updatePitchStatus(pitchId, newStatus);
  renderAdminPitches();
  renderTimelineGantt();
  initQuickBookingForm();
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Đã chuyển trạng thái sân ' + pitch.name + ' thành "' + newStatus + '"!', 'info', 3000);
}

async function toggleHidePitch(pitchId) {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền ẩn/hiện sân bóng!', 'error');
    return;
  }
  const db = window.SanBongApp.SanBongDB;
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
    base_price: basePrice,
    peak_price: peakPrice,
    weekend_price: weekendPrice,
    status
  };

  const r = await adminFetchJson('../api/admin.php?action=manage_pitch', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể lưu cấu hình sân bóng!', 'error', 4000);
    }
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

  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(`✓ Đã lưu cấu hình & giá riêng cho ${name} (${id})!`, 'success', 3500);
  }
}
window.savePitchForm = savePitchForm;

// ============================================================================
// GIAI ĐOẠN 6.3: LỊCH BẢO TRÌ SÂN ĐỊNH KỲ
// ============================================================================
// [hoisted to admin.js]

function renderMaintenanceAffectedBanner(affectedBookings) {
  const banner = document.getElementById('maintenance-affected-banner');
  const listEl = document.getElementById('maintenance-affected-list');
  if (!banner || !listEl) return;

  const list = Array.isArray(affectedBookings) ? affectedBookings : [];
  if (list.length === 0) {
    banner.classList.add('hidden');
    listEl.innerHTML = '';
    return;
  }

  listEl.innerHTML = list.map(ab => {
    const code = ab.code || '';
    const codeAttr = escapeJsAttr(code);
    return `<div class="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-white border border-amber-200">
      <div>
        <span class="font-mono font-bold text-[#0F172A]">#${escapeSearchHTML(code)}</span>
        <span class="mx-1 text-slate-300">·</span>
        <span class="font-semibold text-[#0F172A]">${escapeSearchHTML(ab.customerName || '')}</span>
        <span class="text-[#64748B] font-mono">(${escapeSearchHTML(ab.phone || '')})</span>
        <span class="mx-1 text-slate-300">·</span>
        <span class="font-semibold">${escapeSearchHTML(ab.bookingDate || '')} ${escapeSearchHTML(ab.slotTime || '')}</span>
        <span class="ml-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">${escapeSearchHTML(ab.status || '')}</span>
      </div>
      <button type="button" onclick="openInPlayModal('${codeAttr}')" class="px-2.5 py-1 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-[11px] cursor-pointer">⚙️ Điều hành / Đổi sân</button>
    </div>`;
  }).join('');
  banner.classList.remove('hidden');
}

async function loadMaintenanceSchedules() {
  const tbody = document.getElementById('admin-maintenance-tbody');
  if (!tbody) return;
  const r = await adminFetchJson('../api/admin.php?action=get_maintenance');
  if (!r.ok || !Array.isArray(r.data)) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải lịch bảo trì sân.')}</td></tr>`;
    return;
  }

  maintenanceSchedulesCache = r.data;
  if (r.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-[#94A3B8]">Chưa có lịch bảo trì định kỳ nào.</td></tr>';
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

  if (item) {
    if (titleEl) titleEl.textContent = `✏️ Sửa lịch bảo trì #${item.id}`;
    if (idEl) idEl.value = String(item.id);
    if (pitchSel) pitchSel.value = item.pitch_id || '';
    if (statusEl) statusEl.value = item.status || 'scheduled';
    if (startDateEl) startDateEl.value = item.start_date || todayISO;
    if (endDateEl) endDateEl.value = item.end_date || item.start_date || todayISO;
    if (startTimeEl) startTimeEl.value = String(item.start_time || '05:30').slice(0, 5);
    if (endTimeEl) endTimeEl.value = String(item.end_time || '23:00').slice(0, 5);
    if (reasonEl) reasonEl.value = item.reason || '';
  } else {
    if (titleEl) titleEl.textContent = '➕ Tạo lịch bảo trì / đóng sân định kỳ';
    if (idEl) idEl.value = '';
    if (statusEl) statusEl.value = 'scheduled';
    if (startDateEl) startDateEl.value = todayISO;
    if (endDateEl) endDateEl.value = todayISO;
    if (startTimeEl) startTimeEl.value = '05:30';
    if (endTimeEl) endTimeEl.value = '23:00';
    if (reasonEl) reasonEl.value = '';
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

  const form = e?.target || document.getElementById('maintenance-form');
  const submitBtn = form?.querySelector('button[type="submit"]');
  const orig = submitBtn ? submitBtn.innerHTML : '';

  const idVal = parseInt(document.getElementById('maint-form-id')?.value || '0', 10) || 0;
  const pitchId = document.getElementById('maint-form-pitch')?.value || '';
  const status = document.getElementById('maint-form-status')?.value || 'scheduled';
  const startDate = document.getElementById('maint-form-start-date')?.value || '';
  const endDate = document.getElementById('maint-form-end-date')?.value || '';
  const startTime = document.getElementById('maint-form-start-time')?.value || '05:30';
  const endTime = document.getElementById('maint-form-end-time')?.value || '23:00';
  const reason = (document.getElementById('maint-form-reason')?.value || '').trim();

  if (!pitchId || !startDate || !endDate || !reason) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập đầy đủ sân, khoảng ngày và lý do bảo trì!', 'warning');
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Đang lưu...';
  }
  try {
    const r = await adminFetchJson('../api/admin.php?action=save_maintenance', {
      method: 'POST',
      body: JSON.stringify({
        id: idVal,
        pitch_id: pitchId,
        start_date: startDate,
        end_date: endDate,
        start_time: startTime,
        end_time: endTime,
        reason,
        status
      })
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể lưu lịch bảo trì!', 'error', 4000);
      return;
    }

    closeMaintenanceModal();
    const affected = r.data?.affectedBookings || [];
    renderMaintenanceAffectedBanner(affected);
    if (window.SanBongApp?.showToast) {
      const extra = affected.length > 0 ? ` (Phát hiện ${affected.length} đơn trùng lịch cần điều hành!)` : '';
      window.SanBongApp.showToast((r.message || '✓ Đã lưu lịch bảo trì sân!') + extra, affected.length > 0 ? 'warning' : 'success', 4500);
    }
    await loadMaintenanceSchedules();
    await refreshWalkinBookedSlots();
    renderTimelineGantt();
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = orig;
    }
  }
}
window.saveMaintenanceForm = saveMaintenanceForm;

async function updateMaintenanceStatus(id, status) {
  if (!isManagerOrAdmin()) return;
  if (status === 'cancelled' || status === 'completed') {
    const ok = await showAdminConfirm({
      title: status === 'cancelled' ? 'Hủy lịch bảo trì' : 'Hoàn thành bảo trì',
      message: status === 'cancelled'
        ? `Xác nhận hủy lịch bảo trì #${id}? Sân sẽ nhận đặt trở lại trong khung giờ này.`
        : `Đánh dấu lịch bảo trì #${id} đã hoàn thành?`,
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
  await refreshWalkinBookedSlots();
  renderTimelineGantt();
}
window.updateMaintenanceStatus = updateMaintenanceStatus;

// ============================================================================
// GIAI ĐOẠN 7: THỐNG KÊ & PHẢN HỒI ĐÁNH GIÁ SAU TRẬN
// ============================================================================
// [hoisted to admin.js]

async function loadAdminReviews() {
  const tbody = document.getElementById('admin-reviews-tbody');
  if (!tbody) return;
  const r = await adminFetchJson('../api/reviews.php?all=1');
  if (!r.ok) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải danh sách đánh giá.')}</td></tr>`;
    return;
  }

  const payload = r.data || r.json || {};
  const summary = payload.summary || {};
  const pitchStats = Array.isArray(payload.pitchStats) ? payload.pitchStats : [];
  const slotStats = Array.isArray(payload.slotStats) ? payload.slotStats : [];
  const reviews = Array.isArray(payload.reviews) ? payload.reviews : [];
  adminReviewsCache = reviews;

  const avgEl = document.getElementById('rev-stat-avg');
  const totEl = document.getElementById('rev-stat-total');
  const pubEl = document.getElementById('rev-stat-published');
  const hidEl = document.getElementById('rev-stat-hidden');
  if (avgEl) avgEl.textContent = `${Number(summary.avg_rating || 0).toFixed(1)} ★`;
  if (totEl) totEl.textContent = String(Number(summary.total_reviews || 0));
  if (pubEl) pubEl.textContent = String(Number(summary.published_reviews || 0));
  if (hidEl) hidEl.textContent = String(Number(summary.hidden_reviews || 0));

  const pitchListEl = document.getElementById('rev-by-pitch-list');
  if (pitchListEl) {
    pitchListEl.innerHTML = pitchStats.length > 0 ? pitchStats.map(ps => (
      `<div class="flex items-center justify-between py-1 border-b border-slate-200/70 last:border-0">
        <span class="font-semibold text-[#0F172A]">${escapeSearchHTML(ps.pitch_name || ps.pitch_id || '')}</span>
        <span class="font-bold text-amber-600">${Number(ps.avg_rating || 0).toFixed(1)} ★ <span class="text-[#64748B] font-normal">(${Number(ps.total || 0)} lượt)</span></span>
      </div>`
    )).join('') : '<div class="text-[#94A3B8]">Chưa có dữ liệu đánh giá theo sân.</div>';
  }

  const slotListEl = document.getElementById('rev-by-slot-list');
  if (slotListEl) {
    slotListEl.innerHTML = slotStats.length > 0 ? slotStats.map(ss => (
      `<div class="flex items-center justify-between py-1 border-b border-slate-200/70 last:border-0">
        <span class="font-semibold text-[#0F172A]">⏰ ${escapeSearchHTML(ss.slot_time || ss.slot_id || '')}</span>
        <span class="font-bold text-amber-600">${Number(ss.avg_rating || 0).toFixed(1)} ★ <span class="text-[#64748B] font-normal">(${Number(ss.total || 0)} lượt)</span></span>
      </div>`
    )).join('') : '<div class="text-[#94A3B8]">Chưa có dữ liệu đánh giá theo khung giờ.</div>';
  }

  if (reviews.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-[#94A3B8]">Chưa có đánh giá nào từ khách hàng.</td></tr>';
    return;
  }

  tbody.innerHTML = reviews.map(rv => {
    const rid = Number(rv.id);
    const starsNum = Math.max(1, Math.min(5, Number(rv.rating || 5)));
    const starsStr = '★'.repeat(starsNum) + '☆'.repeat(5 - starsNum);
    const st = rv.status || 'published';
    const nextSt = st === 'hidden' ? 'published' : 'hidden';
    const tags = Array.isArray(rv.tags) ? rv.tags : [];
    const tagsHtml = tags.length > 0
      ? `<div class="flex flex-wrap gap-1 mt-1">${tags.map(t => `<span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">${escapeSearchHTML(t)}</span>`).join('')}</div>`
      : '';

    const replyHtml = rv.admin_reply
      ? `<div class="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[#0F172A]">
           <div>${escapeSearchHTML(rv.admin_reply)}</div>
           ${rv.replied_by ? `<div class="text-[10px] text-[#64748B] mt-0.5">— ${escapeSearchHTML(rv.replied_by)} ${rv.replied_at ? '· ' + escapeSearchHTML(rv.replied_at) : ''}</div>` : ''}
         </div>`
      : '<span class="text-[11px] text-[#94A3B8] italic">Chưa phản hồi</span>';

    const statusBadge = st === 'hidden'
      ? '<span class="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px]">Đã ẩn</span>'
      : '<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">Hiển thị</span>';

    const toggleBtn = isManagerOrAdmin()
      ? `<button type="button" onclick="toggleReviewStatus(${rid}, '${nextSt}')" class="px-2 py-1 rounded ${st === 'hidden' ? 'bg-sky-600 hover:bg-sky-700 text-white' : 'bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700'} font-bold text-[11px] cursor-pointer">${st === 'hidden' ? '👁️ Hiện' : '🙈 Ẩn'}</button>`
      : '';

    return `<tr class="hover:bg-slate-50/70">
      <td class="py-3 px-4 align-top">
        <div class="font-mono font-bold text-[#0F172A]">#${escapeSearchHTML(rv.booking_code || '')}</div>
        <div class="text-[10px] text-[#64748B] mt-0.5">${escapeSearchHTML(rv.created_at || '')}</div>
      </td>
      <td class="py-3 px-4 align-top">
        <div class="font-bold text-[#0F172A]">${escapeSearchHTML(rv.pitch_name || rv.pitch_id || '')}</div>
        <div class="text-[11px] text-[#64748B]">${escapeSearchHTML(rv.booking_date || '')} ${rv.slot_time ? '· ' + escapeSearchHTML(rv.slot_time) : ''}</div>
      </td>
      <td class="py-3 px-4 align-top">
        <div class="font-bold text-[#0F172A]">${escapeSearchHTML(rv.customer_name || '')}</div>
        <div class="font-mono text-[11px] text-[#64748B]">${escapeSearchHTML(rv.phone || '')}</div>
      </td>
      <td class="py-3 px-4 align-top max-w-[260px]">
        <div class="text-amber-500 font-bold text-xs tracking-wider">${starsStr}</div>
        <div class="text-[#334155] mt-1">${escapeSearchHTML(rv.comment || '—')}</div>
        ${tagsHtml}
      </td>
      <td class="py-3 px-4 align-top max-w-[220px]">${replyHtml}</td>
      <td class="py-3 px-4 align-top">${statusBadge}</td>
      <td class="py-3 px-4 align-top text-right">
        <div class="inline-flex items-center justify-end gap-1.5">
          <button type="button" onclick="openReviewReplyModal(${rid})" class="px-2.5 py-1 rounded bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-[11px] cursor-pointer">💬 ${rv.admin_reply ? 'Sửa trả lời' : 'Trả lời'}</button>
          ${toggleBtn}
        </div>
      </td>
    </tr>`;
  }).join('');
}
window.loadAdminReviews = loadAdminReviews;

function openReviewReplyModal(reviewId) {
  const rv = adminReviewsCache.find(x => Number(x.id) === Number(reviewId));
  if (!rv) return;
  const modal = document.getElementById('review-reply-modal');
  if (!modal) return;

  const idEl = document.getElementById('rev-reply-id');
  const metaEl = document.getElementById('rev-reply-meta');
  const textEl = document.getElementById('rev-reply-text');

  if (idEl) idEl.value = String(rv.id);
  if (metaEl) {
    const stars = '★'.repeat(Math.max(1, Math.min(5, Number(rv.rating || 5))));
    metaEl.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="font-bold text-[#0F172A]">${escapeSearchHTML(rv.customer_name || '')} (#${escapeSearchHTML(rv.booking_code || '')})</span>
        <span class="text-amber-500 font-bold">${stars}</span>
      </div>
      <div class="text-[11px] text-[#64748B]">${escapeSearchHTML(rv.pitch_name || '')} · ${escapeSearchHTML(rv.slot_time || '')}</div>
      <div class="text-[#334155] italic">"${escapeSearchHTML(rv.comment || '')}"</div>
    `;
  }
  if (textEl) textEl.value = rv.admin_reply || '';

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}
window.openReviewReplyModal = openReviewReplyModal;

function closeReviewReplyModal() {
  const modal = document.getElementById('review-reply-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}
window.closeReviewReplyModal = closeReviewReplyModal;

async function submitReviewReply(e) {
  if (e && e.preventDefault) e.preventDefault();
  const reviewId = parseInt(document.getElementById('rev-reply-id')?.value || '0', 10) || 0;
  const replyText = (document.getElementById('rev-reply-text')?.value || '').trim();
  if (!reviewId || !replyText) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập nội dung phản hồi!', 'warning');
    return;
  }

  const form = e?.target || document.getElementById('review-reply-form');
  const submitBtn = form?.querySelector('button[type="submit"]');
  const orig = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Đang gửi...';
  }
  try {
    const r = await adminFetchJson('../api/reviews.php', {
      method: 'POST',
      body: JSON.stringify({
        action: 'reply_review',
        review_id: reviewId,
        reply_text: replyText
      })
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể gửi phản hồi đánh giá!', 'error', 4000);
      return;
    }
    closeReviewReplyModal();
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã gửi phản hồi đánh giá khách hàng!', 'success', 3000);
    await loadAdminReviews();
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = orig;
    }
  }
}
window.submitReviewReply = submitReviewReply;

async function toggleReviewStatus(reviewId, nextStatus) {
  if (!isManagerOrAdmin()) return;
  if (nextStatus === 'hidden') {
    const ok = await showAdminConfirm({
      title: 'Ẩn đánh giá khách hàng',
      message: 'Đánh giá này sẽ không còn hiển thị công khai trên trang chủ. Bạn có chắc muốn ẩn?',
      confirmText: 'Ẩn đánh giá',
      cancelText: 'Hủy',
      danger: true
    });
    if (!ok) return;
  }

  const r = await adminFetchJson('../api/reviews.php', {
    method: 'POST',
    body: JSON.stringify({
      action: 'toggle_status',
      review_id: Number(reviewId),
      status: nextStatus
    })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể cập nhật trạng thái đánh giá!', 'error', 4000);
    return;
  }
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã cập nhật hiển thị đánh giá!', 'success', 3000);
  await loadAdminReviews();
}
window.toggleReviewStatus = toggleReviewStatus;

function renderAdminPayments() {
  if (!isManagerOrAdmin()) return;
  const tbody = document.getElementById('admin-payments-tbody');
  if (!tbody) return;

  const db = window.SanBongApp.SanBongDB;
  const pendingList = db.getPendingPayments();

  const count = pendingList.length;
  const badgeEl = document.getElementById('admin-payments-badge');
  const headerBadgeEl = document.getElementById('admin-payments-header-badge');
  if (badgeEl) {
    badgeEl.textContent = count;
    badgeEl.style.display = count > 0 ? 'inline-block' : 'none';
  }
  if (headerBadgeEl) {
    if (count === 0) {
      headerBadgeEl.className = 'px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold';
      headerBadgeEl.textContent = '✓ Đã duyệt hết';
    } else {
      headerBadgeEl.className = 'px-3 py-1 rounded-full bg-[#FEF3C7] text-[#D97706] text-xs font-bold';
      headerBadgeEl.textContent = count + ' Đang chờ';
    }
  }

  if (pendingList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-12 text-center text-[#64748B]">
          <div class="flex flex-col items-center justify-center gap-2">
            <span class="text-3xl">🎉</span>
            <span class="font-bold text-[#0F172A] text-sm">Không có biên lai nào chờ duyệt</span>
            <span class="text-xs text-[#94A3B8]">Tất cả giao dịch chuyển khoản VietQR đã được xử lý xong.</span>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = pendingList.map((item, idx) => {
    const safeCodeAttr = escapeSearchHTML(item.code || '');
    return `
    <tr id="pay-row-${idx}" class="hover:bg-slate-50 transition-colors">
      <td class="py-3 px-4 text-[#64748B]">${escapeSearchHTML(item.time || '')}</td>
      <td class="py-3 px-4 font-mono font-bold text-[#0F172A]">${safeCodeAttr}</td>
      <td class="py-3 px-4 font-semibold">${escapeSearchHTML(item.name || '')}</td>
      <td class="py-3 px-4 font-extrabold text-[#16A34A]">${window.SanBongApp.formatVND(item.amt)}</td>
      <td class="py-3 px-4">${escapeSearchHTML(item.bank || '')} (VietQR)</td>
      <td class="py-3 px-4 text-right space-x-2">
        <button data-code="${safeCodeAttr}" onclick="approveDeposit(this.getAttribute('data-code'))" class="btn-sm btn-primary">Duyệt cọc</button>
        <button data-code="${safeCodeAttr}" onclick="rejectDeposit(this.getAttribute('data-code'))" class="btn-sm btn-danger-outline">Từ chối</button>
      </td>
    </tr>
  `;
  }).join('');
}

async function approveDeposit(code) {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền duyệt cọc VietQR!', 'error');
    return;
  }
  const r = await adminFetchJson('../api/admin.php?action=update_payment', {
    method: 'POST',
    body: JSON.stringify({ code: code, status: 'Đã cọc 30%' })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể duyệt cọc VietQR!', 'error', 4000);
    return;
  }

  const db = window.SanBongApp.SanBongDB;
  db.approveDeposit(code);
  renderAdminPayments();
  renderOverviewTodayBookings();
  renderOverviewKPIs();
  renderTimelineGantt();
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast('✓ ĐÃ DUYỆT CỌC THÀNH CÔNG: Đơn ' + code + ' đã kích hoạt mã vé check-in!', 'success', 3500);
}
window.approveDeposit = approveDeposit;

async function rejectDeposit(code) {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền từ chối cọc VietQR!', 'error');
    return;
  }
  const confirmMsg =
    '• Mã đơn: ' + code + '\n' +
    '• Thao tác này sẽ TỪ CHỐI biên lai chuyển khoản và HỦY ĐƠN HÀNG.\n' +
    '• Slot sân sẽ được GIẢI PHÓNG TRỐNG NGAY LẬP TỨC để đón khách khác.\n\n' +
    'Biên lai bị từ chối sẽ được lưu trữ vĩnh viễn và không xuất hiện lại sau khi F5.\n' +
    'Bạn có chắc chắn muốn từ chối biên lai này?';

  const doReject = async () => {
    const r = await adminFetchJson('../api/admin.php?action=update_payment', {
      method: 'POST',
      body: JSON.stringify({ code: code, status: 'Đã hủy' })
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể từ chối biên lai!', 'error', 4000);
      return;
    }

    const db = window.SanBongApp.SanBongDB;
    db.rejectDeposit(code);
    renderAdminPayments();
    renderOverviewTodayBookings();
    renderOverviewKPIs();
    renderTimelineGantt();
    initQuickBookingForm();
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('⚡ ĐÃ TỪ CHỐI DUYỆT CỌC: Đơn ' + code + ' đã bị từ chối và giải phóng sân.', 'warning', 3500);
    }
  };

  if (window.SanBongApp?.showModal) {
    window.SanBongApp.showModal({
      title: '⚠️ Xác nhận từ chối duyệt cọc',
      message: confirmMsg,
      type: 'danger',
      confirmText: 'Từ chối & Giải phóng sân',
      cancelText: 'Đóng lại',
      onConfirm: doReject
    });
  } else {
    const confirmed = await showAdminConfirm({
      title: '⚠️ Xác nhận từ chối duyệt cọc',
      message: confirmMsg,
      confirmText: 'Từ chối & Giải phóng sân',
      cancelText: 'Đóng lại',
      danger: true
    });
    if (confirmed) await doReject();
  }
}
window.rejectDeposit = rejectDeposit;

// =========================================================
// TAB 7.2: HÀNG CHỜ ĐỐI SOÁT GIAO DỊCH VIETQR / WEBHOOK
// =========================================================
// [hoisted to admin.js]
// [hoisted to admin.js]
// [hoisted to admin.js]

function populateReconcileBookingDatalist(candidates) {
  const dataList = document.getElementById('rec-booking-datalist');
  if (!dataList) return;
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  let list = Array.isArray(candidates) ? candidates : [];
  if (list.length === 0) {
    const db = window.SanBongApp?.SanBongDB;
    if (db && typeof db.getAllBookings === 'function') {
      list = db.getAllBookings().filter(b => b.status !== 'Đã hủy').slice(0, 40);
    }
  }

  dataList.innerHTML = list.map(b => {
    const code = String(b.code || '').trim();
    if (!code) return '';
    const cust = b.customer_name || b.customerName || '';
    const pitch = b.pitchName || (b.pitch_id ? `Sân #${b.pitch_id}` : '');
    const slotInfo = [b.booking_date, b.slot_time].filter(Boolean).join(' ');
    const depAmt = Number(b.deposit_amount ?? b.depositAmount ?? 0);
    const st = b.payment_status || b.status || '';
    const labelParts = [code];
    if (cust) labelParts.push(cust);
    const meta = [pitch, slotInfo].filter(Boolean).join(' · ');
    const label = `${labelParts.join(' · ')}${meta ? ` (${meta})` : ''} - Cọc ${fmt(depAmt)}${st ? ` [${st}]` : ''}`;
    return `<option value="${escapeSearchHTML(code)}">${escapeSearchHTML(label)}</option>`;
  }).join('');
}

function updateBankFilterButtons(activeFilter) {
  const mapBtn = {
    pending: 'bank-filter-pending',
    resolved: 'bank-filter-resolved',
    all: 'bank-filter-all'
  };
  Object.keys(mapBtn).forEach(k => {
    const btn = document.getElementById(mapBtn[k]);
    if (!btn) return;
    if (k === activeFilter) {
      btn.className = 'px-3 py-1.5 rounded-lg font-bold bg-[#16A34A] text-white cursor-pointer shadow-2xs';
    } else {
      btn.className = 'px-3 py-1.5 rounded-lg font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer';
    }
  });
}

async function loadBankTransactions(filter) {
  if (!isManagerOrAdmin()) return;
  if (typeof filter === 'string' && filter) {
    currentBankTxFilter = filter;
  }
  updateBankFilterButtons(currentBankTxFilter);

  const db = window.SanBongApp?.SanBongDB;
  let txList = [];
  let pendingCount = null;
  let loadedFromServer = false;

  const r = await adminFetchJson(`../api/admin.php?action=bank_transactions&status=${encodeURIComponent(currentBankTxFilter)}`);
  if (r.ok) {
    loadedFromServer = true;
    const payload = r.data;
    if (Array.isArray(payload)) {
      txList = payload;
    } else if (payload && Array.isArray(payload.transactions)) {
      txList = payload.transactions;
      if (typeof payload.pendingCount === 'number') pendingCount = payload.pendingCount;
      if (Array.isArray(payload.candidateBookings)) {
        cachedCandidateBookings = payload.candidateBookings;
        populateReconcileBookingDatalist(cachedCandidateBookings);
      }
    }
    if (typeof r.json?.pendingCount === 'number') pendingCount = r.json.pendingCount;
  }

  if (!loadedFromServer && db && typeof db.getBankTransactions === 'function') {
    txList = db.getBankTransactions(currentBankTxFilter);
    pendingCount = db.getBankTransactions('pending').length;
    populateReconcileBookingDatalist([]);
  }

  if (pendingCount === null) {
    pendingCount = txList.filter(tx => {
      const st = String(tx.status || '').toLowerCase();
      const mst = String(tx.match_status || '').toLowerCase();
      return !['resolved', 'ignored', 'matched'].includes(st) && !['matched', 'resolved', 'ignored'].includes(mst);
    }).length;
  }

  cachedBankTransactions = txList;
  renderBankTransactions(txList, pendingCount);
}
window.loadBankTransactions = loadBankTransactions;

function renderBankTransactions(list, pendingCount = 0) {
  const tbody = document.getElementById('admin-bank-tx-tbody');
  const countBadge = document.getElementById('bank-pending-count-badge');
  const sidebarBadge = document.getElementById('admin-payments-badge');
  const db = window.SanBongApp?.SanBongDB;

  if (countBadge) {
    if (pendingCount > 0) {
      countBadge.className = 'px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[11px] font-bold';
      countBadge.textContent = `${pendingCount} Cần xử lý`;
    } else {
      countBadge.className = 'px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold';
      countBadge.textContent = '✓ Đã khớp hết';
    }
  }

  if (sidebarBadge) {
    const receiptsCount = (db && db.getPendingPayments) ? db.getPendingPayments().length : 0;
    const totalPending = receiptsCount + Number(pendingCount || 0);
    sidebarBadge.textContent = totalPending > 0 ? String(totalPending) : '';
    sidebarBadge.style.display = totalPending > 0 ? 'inline-block' : 'none';
  }

  if (!tbody) return;
  const rows = Array.isArray(list) ? list : [];
  if (rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-10 text-center text-[#64748B]">
          <div class="text-2xl mb-1">✅</div>
          <div class="font-bold text-xs text-[#0F172A]">Không có giao dịch ngân hàng nào cần xử lý ở bộ lọc này</div>
          <div class="text-[11px] text-[#94A3B8]">Webhook SePay tự động ghi nhận và đối soát mọi chuyển khoản phát sinh.</div>
        </td>
      </tr>
    `;
    return;
  }

  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  tbody.innerHTML = rows.map(tx => {
    const txId = String(tx.id ?? tx.tx_id ?? tx.reference_code ?? '');
    const safeJsId = txId.replace(/[^a-zA-Z0-9_-]/g, '');
    const txTime = escapeSearchHTML(tx.transaction_date || tx.created_at || tx.paid_at || tx.time || 'Vừa nhận');
    const refCode = escapeSearchHTML(tx.sepay_tx_id || tx.reference_code || tx.gateway_ref || txId);
    const bankName = escapeSearchHTML(tx.bank_name || tx.gateway || 'VietQR');
    const content = escapeSearchHTML(tx.content || tx.transaction_content || tx.description || '---');
    const rawMatchedCode = String(tx.matched_booking_code || tx.detected_booking_code || tx.booking_code || tx.detected_code || '').trim();
    const detectedCode = escapeSearchHTML(rawMatchedCode);
    const reasonNote = String(tx.resolved_note || tx.mismatch_reason || tx.note || '').trim();

    const amountIn = Number(tx.transfer_amount ?? tx.amount_in ?? tx.amountIn ?? tx.transferAmount ?? tx.amount ?? 0);
    const expectedAmt = Number(tx.expected_amount ?? tx.expectedAmount ?? 0);
    const diffAmt = (tx.diff_amount !== undefined && tx.diff_amount !== null && tx.diff_amount !== '')
      ? Number(tx.diff_amount)
      : (expectedAmt > 0 ? (amountIn - expectedAmt) : 0);

    const rawStatus = String(tx.status || '').toLowerCase();
    const matchSt = String(tx.match_status || tx.reconcile_status || rawStatus || 'unmatched').toLowerCase();
    const isResolved = (
      matchSt === 'matched' ||
      matchSt === 'resolved' ||
      matchSt === 'ignored' ||
      rawStatus === 'matched' ||
      rawStatus === 'resolved' ||
      rawStatus === 'ignored'
    );

    let statusBadge = '';
    if (matchSt === 'matched' || rawStatus === 'matched') {
      statusBadge = '<span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold whitespace-nowrap">✓ Đã khớp</span>';
    } else if (matchSt === 'resolved' || rawStatus === 'resolved') {
      statusBadge = '<span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold whitespace-nowrap">✓ Đã xử lý</span>';
    } else if (matchSt === 'ignored' || rawStatus === 'ignored') {
      statusBadge = '<span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-bold whitespace-nowrap">⊘ Đã bỏ qua</span>';
    } else if (matchSt === 'underpaid' || (expectedAmt > 0 && diffAmt < 0)) {
      statusBadge = '<span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold whitespace-nowrap">⚠️ Chuyển thiếu</span>';
    } else if (matchSt === 'overpaid' || (expectedAmt > 0 && diffAmt > 0)) {
      statusBadge = '<span class="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold whitespace-nowrap">➕ Chuyển thừa</span>';
    } else {
      statusBadge = '<span class="px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 text-[11px] font-bold whitespace-nowrap">✕ Sai nội dung</span>';
    }

    let diffHtml = '<div class="text-[11px] text-red-600 font-semibold">Không tìm thấy đơn khớp</div>';
    if (expectedAmt > 0) {
      if (diffAmt > 0) {
        diffHtml = `<div class="text-[11px] text-blue-700 font-bold">Kỳ vọng: ${fmt(expectedAmt)} · Lệch <span class="underline">+${fmt(diffAmt)}</span></div>`;
      } else if (diffAmt < 0) {
        diffHtml = `<div class="text-[11px] text-amber-700 font-bold">Kỳ vọng: ${fmt(expectedAmt)} · Lệch <span class="underline">${fmt(diffAmt)}</span></div>`;
      } else {
        diffHtml = `<div class="text-[11px] text-emerald-700 font-semibold">Kỳ vọng: ${fmt(expectedAmt)} (Khớp 0đ)</div>`;
      }
    } else if (matchSt === 'ignored' || rawStatus === 'ignored') {
      diffHtml = '<div class="text-[11px] text-slate-500 font-semibold">Đã bỏ qua đối soát</div>';
    } else if (isResolved) {
      diffHtml = '<div class="text-[11px] text-emerald-700 font-semibold">Đã hoàn tất đối soát</div>';
    }

    const actionsHtml = isResolved
      ? `<span class="text-[11px] font-semibold ${matchSt === 'ignored' ? 'text-slate-500' : 'text-emerald-700'}">${rawMatchedCode ? 'Đã gán #' + detectedCode : (matchSt === 'ignored' ? 'Đã bỏ qua' : 'Đã đối soát')}</span>`
      : `<div class="inline-flex items-center justify-end gap-1.5 flex-wrap">
           <button type="button" onclick="openReconcileAssignModal('${safeJsId}')" class="px-2.5 py-1 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-[11px] cursor-pointer whitespace-nowrap">🔗 Gán vào đơn</button>
           <button type="button" onclick="resolveBankTransaction('${safeJsId}', 'resolved')" class="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[11px] cursor-pointer whitespace-nowrap">✓ Đã xử lý</button>
           <button type="button" onclick="resolveBankTransaction('${safeJsId}', 'ignored')" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 font-bold text-[11px] cursor-pointer whitespace-nowrap">⊘ Bỏ qua</button>
         </div>`;

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="py-3 px-4">
          <div class="font-mono font-bold text-[#0F172A]">${refCode}</div>
          <div class="text-[11px] text-[#64748B]">${txTime} · ${bankName}</div>
        </td>
        <td class="py-3 px-4 max-w-[260px]">
          <div class="font-mono text-xs font-semibold text-[#0F172A] break-words">${content}</div>
          <div class="text-[11px] text-[#64748B] mt-0.5">
            Mã nhận diện: ${rawMatchedCode ? `<span class="font-mono font-bold text-[#16A34A]">#${detectedCode}</span>` : '<span class="text-red-500 italic">Không nhận diện được</span>'}
          </div>
          ${reasonNote ? `<div class="text-[10px] text-slate-600 italic mt-0.5 break-words">📝 ${escapeSearchHTML(reasonNote)}${tx.resolved_by_name ? ' · ' + escapeSearchHTML(tx.resolved_by_name) : ''}</div>` : ''}
        </td>
        <td class="py-3 px-4 text-right whitespace-nowrap">
          <div class="font-heading font-extrabold text-sm text-[#16A34A]">+${fmt(amountIn)}</div>
          ${diffHtml}
        </td>
        <td class="py-3 px-4 text-center">${statusBadge}</td>
        <td class="py-3 px-4 text-right">${actionsHtml}</td>
      </tr>
    `;
  }).join('');
}

function openReconcileAssignModal(txId) {
  if (!isManagerOrAdmin()) return;
  const tx = cachedBankTransactions.find(item => String(item.id ?? item.tx_id ?? item.reference_code) === String(txId));
  const modal = document.getElementById('reconcile-assign-modal');
  if (!modal || !tx) return;

  const idInput = document.getElementById('rec-tx-id');
  const infoBox = document.getElementById('rec-tx-info');
  const codeInput = document.getElementById('rec-booking-code');
  const statusSelect = document.getElementById('rec-target-status');
  const noteInput = document.getElementById('rec-assign-note');

  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');
  const amtIn = Number(tx.transfer_amount ?? tx.amount_in ?? tx.amountIn ?? tx.transferAmount ?? tx.amount ?? 0);
  const refDisplay = tx.sepay_tx_id || tx.reference_code || tx.id || '';
  const txTimeDisplay = tx.transaction_date || tx.created_at || tx.time || '';
  const prefillCode = tx.matched_booking_code || tx.detected_booking_code || tx.booking_code || tx.detected_code || '';

  if (idInput) idInput.value = String(tx.id ?? tx.tx_id ?? tx.reference_code ?? '');
  if (infoBox) {
    infoBox.innerHTML = `
      <div class="flex justify-between gap-2"><span>Mã GD: <b class="font-mono">${escapeSearchHTML(refDisplay)}</b></span><span class="font-extrabold text-[#16A34A]">+${fmt(amtIn)}</span></div>
      <div>Nội dung CK: <b class="font-mono text-[#0F172A]">${escapeSearchHTML(tx.content || tx.transaction_content || '')}</b></div>
      <div class="text-[11px] text-[#64748B]">Thời gian: ${escapeSearchHTML(txTimeDisplay)} · ${escapeSearchHTML(tx.bank_name || tx.gateway || 'VietQR')}</div>
    `;
  }

  populateReconcileBookingDatalist(cachedCandidateBookings);

  if (codeInput) codeInput.value = prefillCode;
  if (statusSelect) statusSelect.value = 'auto';
  if (noteInput) noteInput.value = '';

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  if (codeInput) setTimeout(() => codeInput.focus(), 100);
}
window.openReconcileAssignModal = openReconcileAssignModal;

function closeReconcileAssignModal() {
  const modal = document.getElementById('reconcile-assign-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}
window.closeReconcileAssignModal = closeReconcileAssignModal;

async function submitReconcileAssign(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!isManagerOrAdmin()) return;

  const txId = (document.getElementById('rec-tx-id')?.value || '').trim();
  const bookingCode = (document.getElementById('rec-booking-code')?.value || '').trim().toUpperCase();
  const targetStatus = document.getElementById('rec-target-status')?.value || 'auto';
  const note = (document.getElementById('rec-assign-note')?.value || '').trim();

  if (!txId || !bookingCode) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập mã đơn đặt sân cần gán!', 'warning');
    return;
  }

  const r = await adminFetchJson('../api/admin.php?action=bank_transactions', {
    method: 'POST',
    body: JSON.stringify({
      sub_action: 'assign_booking',
      tx_id: txId,
      id: txId,
      booking_code: bookingCode,
      target_payment_status: targetStatus,
      target_status: targetStatus,
      note: note
    })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Lỗi khi gán giao dịch vào đơn!', 'error', 4000);
    return;
  }
  const serverMsg = r.message || '';

  const db = window.SanBongApp?.SanBongDB;
  if (db && typeof db.resolveBankTransaction === 'function') {
    db.resolveBankTransaction(txId, {
      booking_code: bookingCode,
      target_status: targetStatus,
      note: note,
      status: 'resolved'
    });
  }

  closeReconcileAssignModal();
  await loadBankTransactions();
  renderAdminPayments();
  renderOverviewTodayBookings();
  renderOverviewKPIs();
  renderTimelineGantt();
  if (isOwnerAdmin() && typeof loadAuditLogs === 'function') loadAuditLogs();

  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(serverMsg || `🔗 Đã gán giao dịch vào đơn #${bookingCode} và cập nhật trạng thái thanh toán!`, 'success', 3500);
  }
}
window.submitReconcileAssign = submitReconcileAssign;

async function resolveBankTransaction(txId, status = 'resolved') {
  if (!isManagerOrAdmin() || !txId) return;

  const targetResStatus = status === 'ignored' ? 'ignored' : 'resolved';
  const defaultNote = targetResStatus === 'ignored'
    ? 'Giao dịch không thuộc đơn đặt sân'
    : 'Đã kiểm tra & hoàn tất xử lý đối soát';
  const promptMsg = targetResStatus === 'ignored'
    ? 'Nhập ghi chú lý do bỏ qua giao dịch này (Bắt buộc):'
    : 'Nhập ghi chú xác nhận đã xử lý giao dịch này (Bắt buộc):';

  const rawNote = await showAdminPrompt({
    title: targetResStatus === 'ignored' ? 'Bỏ qua giao dịch ngân hàng' : 'Xác nhận đã xử lý giao dịch',
    message: promptMsg,
    defaultValue: defaultNote,
    placeholder: 'Nhập ghi chú xử lý...',
    confirmText: targetResStatus === 'ignored' ? 'Bỏ qua giao dịch' : 'Xác nhận đã xử lý',
    cancelText: 'Hủy',
    danger: targetResStatus === 'ignored'
  });
  if (rawNote === null) return;
  const note = String(rawNote).trim();
  if (!note) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Vui lòng nhập ghi chú xử lý không để trống!', 'warning', 3000);
    }
    return;
  }

  const r = await adminFetchJson('../api/admin.php?action=bank_transactions', {
    method: 'POST',
    body: JSON.stringify({
      sub_action: 'resolve',
      tx_id: txId,
      id: txId,
      resolution_status: targetResStatus,
      status: targetResStatus,
      note: note
    })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể cập nhật trạng thái giao dịch!', 'error', 4000);
    return;
  }
  const serverMsg = r.message || '';

  const db = window.SanBongApp?.SanBongDB;
  if (db && typeof db.resolveBankTransaction === 'function') {
    db.resolveBankTransaction(txId, { status: targetResStatus, note: note });
  }

  await loadBankTransactions();
  if (isOwnerAdmin() && typeof loadAuditLogs === 'function') loadAuditLogs();
  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(
      serverMsg || (targetResStatus === 'ignored'
        ? '⊘ Đã đánh dấu Bỏ qua giao dịch ngân hàng!'
        : '✓ Đã đánh dấu giao dịch ngân hàng là Đã xử lý!'),
      'success',
      3000
    );
  }
}
window.resolveBankTransaction = resolveBankTransaction;

function performAdminSearch() {
  const input = document.getElementById('admin-global-search');
  const resultsBox = document.getElementById('admin-search-results');
  const clearBtn = document.getElementById('admin-search-clear');
  if (!input || !resultsBox) return;

  const rawQuery = input.value.trim();
  const query = rawQuery.toLowerCase();
  if (!query) {
    resultsBox.classList.add('hidden');
    resultsBox.innerHTML = '';
    if (clearBtn) clearBtn.classList.add('hidden');
    return;
  }
  if (clearBtn) clearBtn.classList.remove('hidden');

  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const allBookings = db.getAllBookings ? db.getAllBookings() : [];
  const pendingPayments = (isManagerOrAdmin() && db.getPendingPayments) ? db.getPendingPayments() : [];
  const cleanPhoneQ = query.replace(/[\s\.\-]+/g, '');

  const matchedBookings = allBookings.filter(b => {
    const code = (b.code || '').toLowerCase();
    const phone = (b.phone || '').replace(/[\s\.\-]+/g, '');
    const name = (b.customerName || '').toLowerCase();
    const pitch = (b.pitchName || '').toLowerCase();
    const isCodeMatch = code.includes(query);
    const isPhoneMatch = cleanPhoneQ.length >= 3 && phone.includes(cleanPhoneQ);
    const isNameMatch = name.includes(query);
    const isPitchMatch = pitch.includes(query);
    return isCodeMatch || isPhoneMatch || isNameMatch || isPitchMatch;
  });

  const matchedPending = pendingPayments.filter(p => {
    const code = (p.code || '').toLowerCase();
    const name = (p.name || '').toLowerCase();
    const bank = (p.bank || '').toLowerCase();
    return code.includes(query) || name.includes(query) || bank.includes(query);
  });

  const total = matchedBookings.length + matchedPending.length;

  if (total === 0) {
    resultsBox.innerHTML = `
      <div class="p-4 text-center">
        <div class="text-2xl mb-1">🔍</div>
        <div class="font-bold text-xs text-[#0F172A]">Không tìm thấy đơn đặt sân nào</div>
        <div class="text-[11px] text-[#64748B] mt-0.5">Không có kết quả khớp với "<strong>${escapeSearchHTML(rawQuery)}</strong>"</div>
      </div>
    `;
    resultsBox.classList.remove('hidden');
    return;
  }

  let html = `
    <div class="px-3 py-1.5 text-[11px] font-bold text-[#64748B] bg-slate-50 rounded-lg flex items-center justify-between mb-1.5">
      <span>TÌM THẤY ${total} KẾT QUẢ</span>
      <button onclick="clearAdminSearch()" class="text-slate-400 hover:text-slate-600 text-xs">Đóng</button>
    </div>
  `;

  if (matchedPending.length > 0) {
    matchedPending.forEach(p => {
      html += `
        <div onclick="switchAdminTab('payments'); clearAdminSearch();" class="p-2.5 rounded-lg hover:bg-amber-50 cursor-pointer transition-all border border-transparent hover:border-amber-200 mb-1">
          <div class="flex items-center justify-between gap-2">
            <span class="font-mono font-bold text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded">${escapeSearchHTML(p.code)}</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Chờ duyệt cọc</span>
          </div>
          <div class="mt-1 text-xs font-semibold text-[#0F172A] flex items-center justify-between">
            <span>${escapeSearchHTML(p.name)}</span>
            <span class="font-bold text-[#16A34A]">${Number(p.amt || 0).toLocaleString('vi-VN')}đ</span>
          </div>
          <div class="text-[11px] text-[#64748B] flex items-center justify-between mt-0.5">
            <span>${escapeSearchHTML(p.bank || 'VietQR')} · ${p.time || ''}</span>
            <span class="text-[#D97706] font-semibold">Xem duyệt cọc →</span>
          </div>
        </div>
      `;
    });
  }

  if (matchedBookings.length > 0) {
    matchedBookings.forEach(b => {
      const isPending = b.paymentStatus === 'Chờ duyệt cọc';
      const statusBg = isPending ? 'bg-amber-100 text-amber-700' : (b.status === 'Đang đá' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700');
      html += `
        <div data-code="${escapeSearchHTML(b.code || '')}" onclick="viewBookingDetail(this.getAttribute('data-code'))" class="p-2.5 rounded-lg hover:bg-emerald-50 cursor-pointer transition-all border border-transparent hover:border-emerald-200 mb-1">
          <div class="flex items-center justify-between gap-2">
            <span class="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded">${escapeSearchHTML(b.code)}</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBg}">${escapeSearchHTML(b.paymentStatus || b.status)}</span>
          </div>
          <div class="mt-1 text-xs font-semibold text-[#0F172A] flex items-center justify-between">
            <span>${escapeSearchHTML(b.customerName || 'Khách')} ${b.phone ? '· ' + escapeSearchHTML(b.phone) : ''}</span>
            <span class="font-bold text-[#16A34A]">${Number(b.totalPrice || 0).toLocaleString('vi-VN')}đ</span>
          </div>
          <div class="text-[11px] text-[#64748B] flex items-center justify-between mt-0.5">
            <span>${escapeSearchHTML(b.pitchName || '')} (${escapeSearchHTML(b.slotTime || '')})</span>
            <span class="text-[#16A34A] font-semibold">Chi tiết đơn →</span>
          </div>
        </div>
      `;
    });
  }

  resultsBox.innerHTML = html;
  resultsBox.classList.remove('hidden');
}

function clearAdminSearch() {
  const input = document.getElementById('admin-global-search');
  const resultsBox = document.getElementById('admin-search-results');
  const clearBtn = document.getElementById('admin-search-clear');
  if (input) input.value = '';
  if (resultsBox) {
    resultsBox.classList.add('hidden');
    resultsBox.innerHTML = '';
  }
  if (clearBtn) clearBtn.classList.add('hidden');
}

function viewBookingDetail(code) {
  clearAdminSearch();
  openInPlayModal(code);
}

function escapeSearchHTML(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[m]);
}

document.addEventListener('click', (e) => {
  const searchContainer = document.getElementById('admin-global-search')?.closest('.relative');
  if (searchContainer && !searchContainer.contains(e.target)) {
    const resultsBox = document.getElementById('admin-search-results');
    if (resultsBox) resultsBox.classList.add('hidden');
  }
});

window.performAdminSearch = performAdminSearch;
window.clearAdminSearch = clearAdminSearch;
window.viewBookingDetail = viewBookingDetail;

// [hoisted to admin.js]
// [hoisted to admin.js]
