// Quản lý hợp đồng & lịch đặt sân cố định hàng tuần (Recurring Schedules)
let recurringSchedulesCache = [];

function initRecurringScheduleForm() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const pitchSel = document.getElementById('rec-pitch-id');
  const slotSel = document.getElementById('rec-slot-id');
  const startInput = document.getElementById('rec-start-date');
  const daySel = document.getElementById('rec-day-of-week');
  const openChk = document.getElementById('rec-is-open-ended');

  if (pitchSel) {
    const prevP = pitchSel.value;
    pitchSel.innerHTML = db.getPitches().filter(p => p.status !== 'Ẩn').map(p => (
      `<option value="${escapeSearchHTML(p.id)}">${escapeSearchHTML(p.name)} (${escapeSearchHTML(p.typeName || p.type)})</option>`
    )).join('');
    if (prevP && Array.from(pitchSel.options).some(o => o.value === prevP)) {
      pitchSel.value = prevP;
    }
  }

  if (slotSel) {
    const prevS = slotSel.value;
    slotSel.innerHTML = db.getTimeSlots().map(s => (
      `<option value="${escapeSearchHTML(s.id)}">${escapeSearchHTML(s.time)}</option>`
    )).join('');
    if (prevS && Array.from(slotSel.options).some(o => o.value === prevS)) {
      slotSel.value = prevS;
    }
  }

  const todayISO = (window.SanBongApp?.getLocalTodayISO ? window.SanBongApp.getLocalTodayISO() : new Date().toISOString().split('T')[0]);
  if (startInput) {
    if (!startInput.value) startInput.value = todayISO;
    startInput.min = todayISO;
    if (!startInput._boundDow) {
      startInput._boundDow = true;
      startInput.addEventListener('change', () => {
        if (!daySel || !startInput.value) return;
        const d = new Date(startInput.value + 'T00:00:00');
        if (!isNaN(d.getTime())) {
          const jsDay = d.getDay();
          daySel.value = String(jsDay === 0 ? 7 : jsDay);
        }
      });
    }
  }
  if (daySel && startInput?.value && !daySel._initDone) {
    daySel._initDone = true;
    const d = new Date(startInput.value + 'T00:00:00');
    if (!isNaN(d.getTime())) {
      const jsDay = d.getDay();
      daySel.value = String(jsDay === 0 ? 7 : jsDay);
    }
  }
  if (openChk) {
    toggleRecurringWeeksInput(openChk.checked);
  }
}
window.initRecurringScheduleForm = initRecurringScheduleForm;

function toggleRecurringWeeksInput(isOpenEnded) {
  const weeksEl = document.getElementById('rec-weeks-count');
  if (!weeksEl) return;
  weeksEl.disabled = !!isOpenEnded;
  weeksEl.classList.toggle('opacity-50', !!isOpenEnded);
  weeksEl.classList.toggle('bg-slate-100', !!isOpenEnded);
}
window.toggleRecurringWeeksInput = toggleRecurringWeeksInput;

async function loadRecurringSchedules() {
  const tbody = document.getElementById('admin-recurring-tbody');
  if (!tbody) return;
  const r = await adminFetchJson('../api/admin.php?action=get_recurring_schedules');
  if (!r.ok || !Array.isArray(r.data)) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-4 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải danh sách lịch cố định.')}</td></tr>`;
    return;
  }

  recurringSchedulesCache = r.data;
  if (r.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-[#94A3B8]">Chưa có lịch cố định hàng tuần nào.</td></tr>';
    return;
  }

  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');
  const dowMap = { 1: 'Thứ 2', 2: 'Thứ 3', 3: 'Thứ 4', 4: 'Thứ 5', 5: 'Thứ 6', 6: 'Thứ 7', 7: 'Chủ Nhật' };
  const statusMap = {
    active: '<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">Đang chạy</span>',
    paused: '<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-bold text-[10px]">Tạm dừng</span>',
    cancelled: '<span class="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[10px]">Đã hủy chuỗi</span>'
  };

  tbody.innerHTML = r.data.map(s => {
    const schCode = s.schedule_code || ('REC-' + s.id);
    const dowLabel = dowMap[Number(s.day_of_week)] || ('Thứ ' + s.day_of_week);
    const weeksLabel = Number(s.is_open_ended) === 1 ? 'Không giới hạn' : `${Number(s.weeks_count || 0)} tuần`;
    const upcoming = Array.isArray(s.upcoming_bookings) ? s.upcoming_bookings : [];
    const upcomingHtml = upcoming.length > 0 ? upcoming.map(ub => {
      const bCode = ub.code || '';
      const isCancelled = ub.status === 'Đã hủy' || ub.status === 'Hoàn thành';
      const skipBtn = (!isCancelled && s.status === 'active')
        ? `<button type="button" onclick="skipRecurringBooking('${escapeJsAttr(bCode)}')" class="ml-1 px-1.5 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-[9px] cursor-pointer" title="Khách nghỉ buổi này">Nghỉ 1 buổi</button>`
        : '';
      return `<div class="inline-flex items-center gap-1 px-2 py-0.5 mr-1 mb-1 rounded-full border text-[10px] ${isCancelled ? 'bg-slate-100 border-slate-200 text-slate-400 line-through' : 'bg-white border-emerald-200 text-slate-700'}">
        <span class="font-mono font-bold">${escapeSearchHTML(ub.booking_date || '')}</span>
        <span class="text-slate-400">#${escapeSearchHTML(bCode)}</span>
        ${skipBtn}
      </div>`;
    }).join('') : '<span class="text-[11px] text-[#94A3B8]">Không có buổi sắp tới</span>';

    const canCancel = isManagerOrAdmin() && s.status === 'active';
    const actionHtml = canCancel
      ? `<button type="button" onclick="cancelRecurringSchedule(${Number(s.id)}, '${escapeJsAttr(schCode)}')" class="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[11px] cursor-pointer">Dừng chuỗi</button>`
      : (statusMap[s.status] || escapeSearchHTML(s.status || ''));

    return `<tr class="hover:bg-slate-50/70">
      <td class="py-2.5 pr-3 align-top">
        <div class="font-mono font-bold text-[#0F172A]">${escapeSearchHTML(schCode)}</div>
        <div class="mt-1">${statusMap[s.status] || escapeSearchHTML(s.status || '')}</div>
      </td>
      <td class="py-2.5 pr-3 align-top">
        <div class="font-bold text-[#0F172A]">${escapeSearchHTML(s.customer_name || '')}</div>
        <div class="font-mono text-[11px] text-[#64748B]">${escapeSearchHTML(s.phone || '')}</div>
        ${s.note ? `<div class="text-[10px] text-slate-400 italic max-w-[180px] truncate" title="${escapeSearchHTML(s.note)}">${escapeSearchHTML(s.note)}</div>` : ''}
      </td>
      <td class="py-2.5 pr-3 align-top">
        <div class="font-bold text-[#0F172A]">${escapeSearchHTML(s.pitch_name || s.pitch_id || '')}</div>
        <div class="text-[11px] text-[#16A34A] font-semibold">${escapeSearchHTML(dowLabel)} · ${escapeSearchHTML(weeksLabel)}</div>
      </td>
      <td class="py-2.5 pr-3 align-top">
        <div class="font-bold text-[#0F172A]">⏰ ${escapeSearchHTML(s.slot_time || s.slot_id || '')}</div>
        <div class="text-[11px] text-[#64748B]">Từ ${escapeSearchHTML(s.start_date || '')}</div>
      </td>
      <td class="py-2.5 pr-3 align-top whitespace-nowrap">
        <div class="font-bold text-[#0F172A]">${escapeSearchHTML(fmt(s.price_per_match || 0))}</div>
        <div class="text-[10px] text-[#64748B]">Cọc: ${escapeSearchHTML(fmt(s.deposit_per_match || 0))}</div>
      </td>
      <td class="py-2.5 pr-3 align-top max-w-[300px]">${upcomingHtml}</td>
      <td class="py-2.5 text-right align-top">${actionHtml}</td>
    </tr>`;
  }).join('');
}
window.loadRecurringSchedules = loadRecurringSchedules;

async function handleCreateRecurringSchedule(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form?.querySelector('button[type="submit"]');
  const origHtml = submitBtn ? submitBtn.innerHTML : '';

  const customerName = (document.getElementById('rec-cust-name')?.value || '').trim();
  const phone = (document.getElementById('rec-cust-phone')?.value || '').trim();
  const pitchId = document.getElementById('rec-pitch-id')?.value || '';
  const dayOfWeek = parseInt(document.getElementById('rec-day-of-week')?.value || '1', 10) || 1;
  const slotId = document.getElementById('rec-slot-id')?.value || '';
  const startDate = document.getElementById('rec-start-date')?.value || (window.SanBongApp?.getLocalTodayISO ? window.SanBongApp.getLocalTodayISO() : new Date().toISOString().split('T')[0]);
  const isOpenEnded = Boolean(document.getElementById('rec-is-open-ended')?.checked);
  const weeksCount = isOpenEnded ? 0 : Math.max(2, parseInt(document.getElementById('rec-weeks-count')?.value || '8', 10) || 8);
  const depositPerMatch = Math.max(0, parseInt(document.getElementById('rec-deposit-per-match')?.value || '0', 10) || 0);
  const note = (document.getElementById('rec-note')?.value || '').trim();

  if (!customerName || !phone || !pitchId || !slotId) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập đầy đủ thông tin khách hàng, sân và khung giờ!', 'error');
    return;
  }

  const db = window.SanBongApp?.SanBongDB;
  const calc = db?.calculatePrice ? db.calculatePrice(pitchId, startDate, slotId, [], '', 1) : null;
  const pricePerMatch = Number(calc?.singlePitchPrice || calc?.pitchPrice || 0);

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Đang tạo chuỗi...';
  }
  try {
    const r = await adminFetchJson('../api/admin.php?action=create_recurring_schedule', {
      method: 'POST',
      body: JSON.stringify({
        customer_name: customerName,
        phone,
        pitch_id: pitchId,
        slot_id: slotId,
        day_of_week: dayOfWeek,
        start_date: startDate,
        is_open_ended: isOpenEnded,
        weeks_count: weeksCount,
        price_per_match: pricePerMatch,
        deposit_per_match: depositPerMatch,
        note
      })
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể tạo lịch cố định!', 'error', 4500);
      return;
    }
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || '✓ Đã tạo lịch cố định hàng tuần thành công!', 'success', 4000);
    }
    form?.reset();
    initRecurringScheduleForm();
    await loadRecurringSchedules();
    if (typeof fetchTimelineDateBookings === 'function') await fetchTimelineDateBookings(window.selectedTimelineDate);
    if (typeof renderTimelineGantt === 'function') renderTimelineGantt();
    if (typeof renderOverviewTodayBookings === 'function') renderOverviewTodayBookings();
    if (typeof renderOverviewKPIs === 'function') renderOverviewKPIs();
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origHtml;
    }
  }
}
window.handleCreateRecurringSchedule = handleCreateRecurringSchedule;

async function skipRecurringBooking(bookingCode) {
  const reason = await showAdminPrompt({
    title: `📅 Nghỉ 1 buổi trong chuỗi (#${bookingCode})`,
    message: `Xác nhận hủy đơn #${bookingCode} để nhả sân riêng buổi này (chuỗi các tuần sau vẫn giữ nguyên). Nhập lý do:`,
    placeholder: 'VD: Đội bận công tác tuần này',
    defaultValue: 'Khách báo nghỉ 1 buổi',
    confirmText: 'Xác nhận nghỉ 1 buổi',
    cancelText: 'Đóng'
  });
  if (reason === null) return;

  const r = await adminFetchJson('../api/admin.php?action=skip_recurring_booking', {
    method: 'POST',
    body: JSON.stringify({ booking_code: bookingCode, reason })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể hủy buổi này!', 'error', 4000);
    return;
  }
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || `✓ Đã nhả sân buổi #${bookingCode}`, 'success', 3500);
  await loadRecurringSchedules();
  if (typeof fetchTimelineDateBookings === 'function') await fetchTimelineDateBookings(window.selectedTimelineDate);
  if (typeof renderTimelineGantt === 'function') renderTimelineGantt();
  if (typeof renderOverviewTodayBookings === 'function') renderOverviewTodayBookings();
  if (typeof renderOverviewKPIs === 'function') renderOverviewKPIs();
}
window.skipRecurringBooking = skipRecurringBooking;

async function cancelRecurringSchedule(scheduleId, scheduleCode) {
  const reason = await showAdminPrompt({
    title: `⛔ Dừng toàn bộ chuỗi lịch (${scheduleCode || '#' + scheduleId})`,
    message: 'Hệ thống sẽ dừng chuỗi lịch cố định và hủy toàn bộ các buổi chưa diễn ra trong tương lai. Nhập lý do dừng chuỗi:',
    placeholder: 'VD: Đội bóng ngừng thuê sân theo tháng',
    defaultValue: 'Ngừng lịch cố định theo yêu cầu khách',
    confirmText: 'Xác nhận dừng chuỗi',
    cancelText: 'Giữ lại',
    danger: true
  });
  if (reason === null) return;

  const r = await adminFetchJson('../api/admin.php?action=cancel_recurring_schedule', {
    method: 'POST',
    body: JSON.stringify({ schedule_id: Number(scheduleId), reason })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể dừng chuỗi lịch cố định!', 'error', 4000);
    return;
  }
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã dừng chuỗi lịch cố định!', 'success', 3500);
  await loadRecurringSchedules();
  if (typeof fetchTimelineDateBookings === 'function') await fetchTimelineDateBookings(window.selectedTimelineDate);
  if (typeof renderTimelineGantt === 'function') renderTimelineGantt();
  if (typeof renderOverviewTodayBookings === 'function') renderOverviewTodayBookings();
  if (typeof renderOverviewKPIs === 'function') renderOverviewKPIs();
}
window.cancelRecurringSchedule = cancelRecurringSchedule;

async function runRecurringCronNow() {
  const ok = await showAdminConfirm({
    title: '🔄 Gia hạn lịch cố định 4 tuần tới',
    message: 'Hệ thống sẽ quét các lịch cố định đang chạy (đặc biệt gói không giới hạn) và tự động sinh thêm các buổi đá cho 4 tuần sắp tới. Tiếp tục?',
    confirmText: 'Sinh lịch ngay',
    cancelText: 'Hủy'
  });
  if (!ok) return;

  const btn = document.getElementById('btn-run-recurring-cron');
  const orig = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Đang sinh lịch...';
  }
  try {
    const r = await adminFetchJson('../api/admin.php?action=run_recurring_cron', {
      method: 'POST',
      body: JSON.stringify({})
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể chạy gia hạn lịch cố định!', 'error', 4000);
      return;
    }
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã sinh lịch cố định 4 tuần tới!', 'success', 4000);
    await loadRecurringSchedules();
    if (typeof fetchTimelineDateBookings === 'function') await fetchTimelineDateBookings(window.selectedTimelineDate);
    if (typeof renderTimelineGantt === 'function') renderTimelineGantt();
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  }
}
window.runRecurringCronNow = runRecurringCronNow;
