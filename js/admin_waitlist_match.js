// Quản lý danh sách chờ (Waitlist) & Ghép kèo (Matchmaking)
let adminWaitlistCache = [];
let adminMatchmakingCache = [];

async function loadWaitlistAdmin() {
  const tbody = document.getElementById('admin-waitlist-tbody');
  if (!tbody) return;
  const status = document.getElementById('waitlist-status-filter')?.value || 'all';
  const dateFilter = document.getElementById('waitlist-date-filter')?.value || '';

  const r = await adminFetchJson(`../api/admin.php?action=get_waitlist&status=${encodeURIComponent(status)}&date=${encodeURIComponent(dateFilter)}`);
  if (!r.ok || !Array.isArray(r.data)) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-4 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải danh sách chờ.')}</td></tr>`;
    return;
  }

  adminWaitlistCache = r.data;
  if (r.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-[#94A3B8]">Không có yêu cầu chờ sân nào trong bộ lọc này.</td></tr>';
    return;
  }

  const stBadge = {
    waiting: '<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">Đang chờ</span>',
    notified: '<span class="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-bold text-[10px]">Đã báo sân trống</span>',
    converted: '<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">Đã gán sân</span>',
    cancelled: '<span class="px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-bold text-[10px]">Đã hủy</span>',
    expired: '<span class="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[10px]">Hết hạn</span>'
  };

  tbody.innerHTML = r.data.map(w => {
    const wid = Number(w.id);
    let actions = '';
    if (w.status === 'waiting') {
      actions = `<div class="inline-flex items-center gap-1.5">
        <button type="button" onclick="notifyWaitlistCustomer(${wid})" class="px-2 py-1 rounded bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] cursor-pointer">📣 Báo sân trống</button>
        <button type="button" onclick="assignWaitlistCustomer(${wid})" class="px-2 py-1 rounded bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-[11px] cursor-pointer">✅ Gán sân</button>
        <button type="button" onclick="cancelWaitlistCustomer(${wid})" class="px-2 py-1 rounded bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 font-bold text-[11px] cursor-pointer">Hủy</button>
      </div>`;
    } else if (w.status === 'notified') {
      actions = `<div class="inline-flex items-center gap-1.5">
        <button type="button" onclick="assignWaitlistCustomer(${wid})" class="px-2 py-1 rounded bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-[11px] cursor-pointer">✅ Gán sân ngay</button>
        <button type="button" onclick="cancelWaitlistCustomer(${wid})" class="px-2 py-1 rounded bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 font-bold text-[11px] cursor-pointer">Hủy</button>
      </div>`;
    } else if (w.status === 'converted' && w.converted_booking_code) {
      actions = `<span class="font-mono text-[11px] font-bold text-[#16A34A]">#${escapeSearchHTML(w.converted_booking_code)}</span>`;
    } else {
      actions = '<span class="text-[11px] text-[#94A3B8]">—</span>';
    }

    return `<tr class="hover:bg-slate-50/70">
      <td class="py-2.5 pr-3 font-mono font-bold text-[#0F172A] whitespace-nowrap">${escapeSearchHTML(w.booking_date || '')}</td>
      <td class="py-2.5 pr-3">
        <div class="font-bold text-[#0F172A]">${escapeSearchHTML(w.pitch_name || w.pitch_id || '')}</div>
        <div class="text-[11px] text-[#64748B]">⏰ ${escapeSearchHTML(w.slot_time || w.slot_id || '')}</div>
      </td>
      <td class="py-2.5 pr-3 font-semibold text-[#0F172A]">${escapeSearchHTML(w.customer_name || '')}</td>
      <td class="py-2.5 pr-3 font-mono text-[#475569]">${escapeSearchHTML(w.phone || '')}</td>
      <td class="py-2.5 pr-3 text-[#64748B] max-w-[180px] truncate" title="${escapeSearchHTML(w.note || '')}">${escapeSearchHTML(w.note || '—')}</td>
      <td class="py-2.5 pr-3">${stBadge[w.status] || escapeSearchHTML(w.status || '')}</td>
      <td class="py-2.5 text-right">${actions}</td>
    </tr>`;
  }).join('');
}
window.loadWaitlistAdmin = loadWaitlistAdmin;

async function notifyWaitlistCustomer(waitlistId) {
  const r = await adminFetchJson('../api/admin.php?action=notify_waitlist', {
    method: 'POST',
    body: JSON.stringify({ waitlist_id: Number(waitlistId) })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể gửi báo sân trống!', 'error', 4000);
    return;
  }
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã giữ chỗ tạm & gửi thông báo cho khách chờ!', 'success', 3500);
  await loadWaitlistAdmin();
}
window.notifyWaitlistCustomer = notifyWaitlistCustomer;

async function assignWaitlistCustomer(waitlistId) {
  const ok = await showAdminConfirm({
    title: '✅ Gán sân cho khách danh sách chờ',
    message: 'Chuyển yêu cầu chờ này thành đơn đặt sân chính thức (giữ sân ngay)?',
    confirmText: 'Gán sân ngay',
    cancelText: 'Đóng'
  });
  if (!ok) return;

  const r = await adminFetchJson('../api/admin.php?action=assign_waitlist', {
    method: 'POST',
    body: JSON.stringify({ waitlist_id: Number(waitlistId) })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể gán sân cho khách chờ!', 'error', 4000);
    return;
  }
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã gán sân thành công!', 'success', 4000);
  await loadWaitlistAdmin();
  if (typeof fetchTimelineDateBookings === 'function') await fetchTimelineDateBookings(window.selectedTimelineDate);
  if (typeof renderTimelineGantt === 'function') renderTimelineGantt();
  if (typeof renderOverviewTodayBookings === 'function') renderOverviewTodayBookings();
  if (typeof renderOverviewKPIs === 'function') renderOverviewKPIs();
}
window.assignWaitlistCustomer = assignWaitlistCustomer;

async function cancelWaitlistCustomer(waitlistId) {
  const ok = await showAdminConfirm({
    title: 'Hủy yêu cầu chờ sân',
    message: 'Xác nhận hủy yêu cầu trong danh sách chờ này?',
    confirmText: 'Xác nhận hủy',
    cancelText: 'Quay lại',
    danger: true
  });
  if (!ok) return;

  const r = await adminFetchJson('../api/admin.php?action=cancel_waitlist', {
    method: 'POST',
    body: JSON.stringify({ waitlist_id: Number(waitlistId) })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể hủy yêu cầu chờ!', 'error', 4000);
    return;
  }
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã hủy yêu cầu danh sách chờ!', 'success', 3000);
  await loadWaitlistAdmin();
}
window.cancelWaitlistCustomer = cancelWaitlistCustomer;

async function loadMatchmakingAdmin() {
  const tbody = document.getElementById('admin-matchmaking-tbody');
  if (!tbody) return;
  const status = document.getElementById('mm-admin-status-filter')?.value || 'all';
  const r = await adminFetchJson(`../api/admin.php?action=get_matchmaking_admin&status=${encodeURIComponent(status)}`);
  if (!r.ok || !Array.isArray(r.data)) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-4 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải danh sách tin ghép kèo.')}</td></tr>`;
    return;
  }

  adminMatchmakingCache = r.data;
  if (r.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-[#94A3B8]">Không có tin tìm đối / ghép kèo nào.</td></tr>';
    return;
  }

  const stMap = {
    pending: '<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">Chờ duyệt</span>',
    open: '<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">Đang mở</span>',
    matched: '<span class="px-2 py-0.5 rounded bg-sky-100 text-sky-700 font-bold text-[10px]">Đã ghép kèo</span>',
    closed: '<span class="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">Đã đóng</span>',
    rejected: '<span class="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[10px]">Từ chối</span>'
  };

  tbody.innerHTML = r.data.map(m => {
    const code = m.post_code || m.postCode || '';
    const codeAttr = escapeJsAttr(code);
    const st = m.status || 'pending';
    let actions = '';
    if (st === 'pending') {
      actions = `<div class="inline-flex items-center gap-1.5">
        <button type="button" onclick="moderateMatchmaking('${codeAttr}', 'approve')" class="px-2.5 py-1 rounded bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-[11px] cursor-pointer">✓ Duyệt mở</button>
        <button type="button" onclick="moderateMatchmaking('${codeAttr}', 'reject')" class="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[11px] cursor-pointer">✕ Từ chối</button>
      </div>`;
    } else if (st === 'open') {
      actions = `<div class="inline-flex items-center gap-1.5">
        <button type="button" onclick="moderateMatchmaking('${codeAttr}', 'close')" class="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-800 text-white font-bold text-[11px] cursor-pointer">🔒 Đóng kèo</button>
        <button type="button" onclick="moderateMatchmaking('${codeAttr}', 'reject')" class="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[11px] cursor-pointer">Từ chối</button>
      </div>`;
    } else if (st === 'closed' || st === 'rejected') {
      actions = `<button type="button" onclick="moderateMatchmaking('${codeAttr}', 'open')" class="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] cursor-pointer">🔓 Mở lại</button>`;
    } else {
      actions = '<span class="text-[11px] text-[#64748B]">Đã khóa kèo</span>';
    }

    return `<tr class="hover:bg-slate-50/70">
      <td class="py-2.5 pr-3 font-mono font-bold text-[#0F172A]">${escapeSearchHTML(code)}</td>
      <td class="py-2.5 pr-3">
        <div class="font-bold text-[#0F172A]">${escapeSearchHTML(m.team_name || '')}</div>
        <div class="text-[11px] text-[#64748B]">Đội trưởng: ${escapeSearchHTML(m.contact_name || '')}</div>
      </td>
      <td class="py-2.5 pr-3 font-mono text-[#475569]">${escapeSearchHTML(m.contact_phone || '')}</td>
      <td class="py-2.5 pr-3">
        <div class="font-bold text-[#0F172A]">${escapeSearchHTML(m.match_date || '')} · ${escapeSearchHTML(m.slot_time || '')}</div>
        <div class="text-[11px] text-[#64748B]">Sân ${escapeSearchHTML(String(m.pitch_type || ''))} người ${m.pitch_name ? '· ' + escapeSearchHTML(m.pitch_name) : ''}</div>
      </td>
      <td class="py-2.5 pr-3">
        <div class="font-semibold text-[#0F172A]">${escapeSearchHTML(m.skill_level || 'Giao hữu')}</div>
        <div class="text-[11px] text-[#64748B]">${escapeSearchHTML(m.bet_rule || '50-50')}</div>
        ${m.note ? `<div class="text-[10px] text-slate-400 italic max-w-[180px] truncate" title="${escapeSearchHTML(m.note)}">${escapeSearchHTML(m.note)}</div>` : ''}
      </td>
      <td class="py-2.5 pr-3">${stMap[st] || escapeSearchHTML(st)}</td>
      <td class="py-2.5 text-right">${actions}</td>
    </tr>`;
  }).join('');
}
window.loadMatchmakingAdmin = loadMatchmakingAdmin;

async function moderateMatchmaking(postCode, decision) {
  if (decision === 'reject' || decision === 'close') {
    const ok = await showAdminConfirm({
      title: decision === 'reject' ? 'Từ chối tin tìm đối' : 'Đóng tin tìm đối',
      message: `Xác nhận ${decision === 'reject' ? 'từ chối' : 'đóng'} tin ghép kèo #${postCode}?`,
      confirmText: decision === 'reject' ? 'Từ chối' : 'Đóng tin',
      cancelText: 'Quay lại',
      danger: decision === 'reject'
    });
    if (!ok) return;
  }

  const r = await adminFetchJson('../api/admin.php?action=moderate_matchmaking', {
    method: 'POST',
    body: JSON.stringify({ post_code: postCode, decision })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể kiểm duyệt tin tìm đối!', 'error', 4000);
    return;
  }
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || `✓ Đã cập nhật tin #${postCode}`, 'success', 3000);
  await loadMatchmakingAdmin();
}
window.moderateMatchmaking = moderateMatchmaking;
