// =========================================================
// MỤC 2.2: CHỐT CA & BÀN GIAO TIỀN MẶT (SHIFT HANDOVER)
// =========================================================
function renderShiftHandoverStats(customStats = null) {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;
  const stats = customStats || (typeof db.getCurrentShiftStats === 'function' ? db.getCurrentShiftStats() : {
    startTime: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    cashTotal: 0,
    transferTotal: 0
  });
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  const startEl = document.getElementById('shift-start-time');
  const cashEl = document.getElementById('shift-cash-total');
  const transEl = document.getElementById('shift-transfer-total');

  if (startEl) startEl.textContent = stats.startTime || '--:--';
  if (cashEl) cashEl.textContent = fmt(stats.cashTotal || 0);
  if (transEl) transEl.textContent = fmt(stats.transferTotal || 0);
}
window.renderShiftHandoverStats = renderShiftHandoverStats;

async function loadShiftHandovers() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  renderShiftHandoverStats();

  let shifts = typeof db.getShifts === 'function' ? db.getShifts() : [];

  const shiftRes = await adminFetchJson('../api/admin.php?action=shifts');
  let cur = null;
  if (shiftRes.ok && shiftRes.data) {
    cur = shiftRes.data.activeShift || shiftRes.data.currentShift;
    if (cur) {
      renderShiftHandoverStats({
        startTime: cur.startTime || cur.start_time,
        cashTotal: Number(cur.cashTotal ?? cur.cash_total ?? 0),
        transferTotal: Number(cur.transferTotal ?? cur.transfer_total ?? 0)
      });
    }
    if (Array.isArray(shiftRes.data.shifts) && shiftRes.data.shifts.length > 0) {
      shifts = shiftRes.data.shifts;
    }
  }

  window._currentActiveShift = cur;
  const initialCashEl = document.getElementById('shift-initial-cash-display');
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');
  if (initialCashEl) {
    initialCashEl.textContent = fmt(cur?.initial_cash || 0);
  }
  const operatorEl = document.getElementById('shift-operator-name');
  if (operatorEl) {
    operatorEl.textContent = cur ? (cur.staff_name || cur.staffName || 'Nhân viên trực') : 'Chưa mở ca';
  }

  // Cập nhật dropdown bộ lọc nhân viên nếu có danh sách từ server
  if (shiftRes.ok && shiftRes.data && Array.isArray(shiftRes.data.staffList)) {
    const staffSelect = document.getElementById('shift-filter-staff');
    if (staffSelect && staffSelect.options.length <= 1) {
      shiftRes.data.staffList.forEach(st => {
        const opt = document.createElement('option');
        opt.value = st.id;
        opt.textContent = `${st.full_name || st.username} (${st.role})`;
        staffSelect.appendChild(opt);
      });
    }
  }

  // Cập nhật chấm trạng thái xanh ở menu Tab 8 và các badge
  const statusDot = document.getElementById('shift-nav-status-dot');
  if (statusDot) {
    statusDot.classList.toggle('hidden', !cur);
  }
  const badgeActive = document.getElementById('shift-badge-active');
  const badgeClosed = document.getElementById('shift-badge-closed');
  const openFormSec = document.getElementById('shift-open-form-section');
  const closeFormSec = document.getElementById('shift-close-form-section');
  if (badgeActive && badgeClosed) {
    badgeActive.classList.toggle('hidden', !cur);
    badgeClosed.classList.toggle('hidden', !!cur);
  }
  if (openFormSec && closeFormSec) {
    openFormSec.classList.toggle('hidden', !!cur);
    closeFormSec.classList.toggle('hidden', !cur);
    calculateShiftDiscrepancy();
  }
  const overdueWarning = document.getElementById('shift-overdue-warning');
  if (overdueWarning) {
    if (cur && (cur.start_time || cur.startTime)) {
      const startTimeMs = new Date(cur.start_time || cur.startTime).getTime();
      const diffHours = (Date.now() - startTimeMs) / (1000 * 60 * 60);
      overdueWarning.classList.toggle('hidden', diffHours < 14);
    } else {
      overdueWarning.classList.add('hidden');
    }
  }

  let curUser = null;
  try {
    curUser = JSON.parse(sessionStorage.getItem('sb_current_user') || 'null');
  } catch (e) {}

  // Staff chỉ thấy các ca của chính mình; Manager & Admin thấy toàn bộ ca của mọi nhân viên
  if (!isManagerOrAdmin() && curUser) {
    const myUname = String(curUser.username || '').toLowerCase();
    const myId = Number(curUser.id || 0);
    shifts = shifts.filter(sh => {
      const shUname = String(sh.staffUsername || sh.staff_username || '').toLowerCase();
      const shId = Number(sh.staffId || sh.staff_id || 0);
      return (myUname && shUname === myUname) || (myId && shId === myId);
    });
  }

  const tbody = document.getElementById('admin-shifts-tbody');
  if (!tbody) return;

  if (shifts.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="py-8 text-center text-xs text-[#64748B]">
          Chưa có lịch sử chốt ca nào được ghi nhận.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = shifts.map(sh => {
    const id = sh.id || sh.shift_code || `CA-${sh.shift_id || ''}`;
    const staffName = sh.staff_name || sh.staffName || sh.staff_username || 'Nhân viên trực';
    const startT = sh.start_time || sh.startTime || '';
    const stRaw = String(sh.status || 'closed').toLowerCase();
    let endT = 'Chờ đối soát';
    if (stRaw === 'open' || stRaw === 'đang mở' || stRaw === 'đang trực') {
      endT = 'Đang trực';
    } else if (stRaw === 'confirmed' || stRaw === 'đã xác nhận' || stRaw === 'đã đối soát') {
      endT = sh.end_time || sh.endTime || sh.closed_at || sh.confirmed_at || 'Đã đối soát';
    } else {
      endT = sh.end_time || sh.endTime || sh.closed_at || 'Chờ đối soát';
    }
    const initialCash = Number(sh.initial_cash ?? sh.initialCash ?? 0);
    const cashDeclared = Number(sh.cash_total ?? sh.cashDeclared ?? 0);
    const transferTotal = Number(sh.transfer_total ?? sh.transferTotal ?? 0);
    const actualRaw = sh.actual_cash_received ?? sh.cashActual;
    const hasCounted = actualRaw !== null && actualRaw !== undefined;
    const cashActual = hasCounted ? Number(actualRaw) : null;
    const expectedTotal = initialCash + cashDeclared;
    const diff = hasCounted ? (cashActual - expectedTotal) : null;

    let diffHtml = '<span class="text-slate-400 italic">Chờ chốt ca</span>';
    if (hasCounted) {
      if (diff === 0) {
        diffHtml = `<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-extrabold text-[11px] border border-emerald-300">✓ Khớp 0đ</span>`;
      } else if (diff < 0) {
        diffHtml = `<span class="px-2 py-0.5 rounded bg-red-100 text-red-700 font-extrabold text-[11px] border border-red-300" title="${escapeJsAttr(sh.discrepancy_reason || '')}">Thiếu ${fmt(diff)}</span>`;
      } else {
        diffHtml = `<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-extrabold text-[11px] border border-amber-300" title="${escapeJsAttr(sh.discrepancy_reason || '')}">Thừa +${fmt(diff)}</span>`;
      }
      if (sh.discrepancy_reason) {
        diffHtml += `<div class="text-[10px] text-slate-500 mt-0.5 italic truncate max-w-[120px]" title="${escapeJsAttr(sh.discrepancy_reason)}">${escapeSearchHTML(sh.discrepancy_reason)}</div>`;
      }
    }

    let statusBadge = '';
    if (stRaw === 'open' || stRaw === 'đang mở' || stRaw === 'đang trực') {
      statusBadge = '<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 font-bold text-[10px]">● Đang trực</span>';
    } else if (stRaw === 'confirmed' || stRaw === 'đã xác nhận' || stRaw === 'đã đối soát') {
      statusBadge = '<span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 font-bold text-[10px]">✓ Đã đối soát</span>';
    } else {
      statusBadge = '<span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 font-bold text-[10px]">⏳ Chờ đối soát</span>';
    }

    let actionHtml = '';
    if (stRaw === 'open' || stRaw === 'đang mở' || stRaw === 'đang trực') {
      actionHtml = '<span class="text-[11px] text-slate-400 italic">Ca đang trực</span>';
    } else if (stRaw === 'confirmed') {
      actionHtml = '<span class="text-[11px] text-emerald-600 font-bold">✓ Đã khóa sổ</span>';
    } else {
      actionHtml = isManagerOrAdmin()
        ? `<button type="button" onclick="handleConfirmShift('${escapeJsAttr(String(id))}', ${expectedTotal})" class="px-2.5 py-1 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-[11px] shadow-sm cursor-pointer">
             Đối soát tiền mặt
           </button>`
        : '<span class="text-[11px] text-slate-400">Chờ Quản lý đối soát</span>';
    }

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="py-2.5 px-3 font-mono font-bold text-[#0F172A]">${escapeSearchHTML(String(id))}</td>
        <td class="py-2.5 px-3 font-semibold text-[#0F172A]">${escapeSearchHTML(staffName)}</td>
        <td class="py-2.5 px-3 text-[11px] text-slate-600">
          <div>Mở: <b>${escapeSearchHTML(startT)}</b></div>
          <div>Chốt: <b>${escapeSearchHTML(endT)}</b></div>
        </td>
        <td class="py-2.5 px-3 text-right font-bold text-emerald-700">${fmt(initialCash)}</td>
        <td class="py-2.5 px-3 text-right font-extrabold text-[#D97706]">${fmt(cashDeclared)}</td>
        <td class="py-2.5 px-3 text-right font-bold text-purple-700">${fmt(transferTotal)}</td>
        <td class="py-2.5 px-3 text-right font-extrabold text-[#0F172A]">
          ${hasCounted ? fmt(cashActual) : '<span class="text-slate-400 font-normal">---</span>'}
        </td>
        <td class="py-2.5 px-3 text-center">${diffHtml}</td>
        <td class="py-2.5 px-3 text-center">${statusBadge}</td>
        <td class="py-2.5 px-3 text-right">${actionHtml}</td>
      </tr>
    `;
  }).join('');
}
window.loadShiftHandovers = loadShiftHandovers;

function calculateShiftDiscrepancy() {
  const countedEl = document.getElementById('shift-cash-counted');
  const badgeEl = document.getElementById('shift-discrepancy-badge') || document.getElementById('shift-diff-badge');
  const btnSubmit = document.getElementById('btn-close-shift');
  const reasonBox = document.getElementById('shift-discrepancy-reason-box');
  const reasonInput = document.getElementById('shift-discrepancy-reason');
  if (!badgeEl) return;

  const rawVal = countedEl ? countedEl.value.trim() : '';
  if (!countedEl || rawVal === '' || isNaN(Number(rawVal)) || Number(rawVal) < 0) {
    badgeEl.className = 'h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center font-mono font-bold text-xs text-slate-500';
    badgeEl.textContent = 'Chưa kiểm đếm';
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.classList.add('opacity-50', 'cursor-not-allowed');
    }
    if (reasonBox) reasonBox.classList.add('hidden');
    if (reasonInput) reasonInput.required = false;
    return;
  }

  const counted = parseInt(rawVal, 10);
  const curShift = window._currentActiveShift;
  const sysCash = Number(curShift?.cash_total ?? curShift?.cashTotal ?? 0);
  const initCash = Number(curShift?.initial_cash ?? curShift?.initialCash ?? 0);
  const expected = sysCash + initCash;
  const diff = counted - expected;
  const formatCurrency = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  if (diff === 0) {
    badgeEl.className = 'h-[38px] px-3 rounded-lg border border-emerald-200 bg-emerald-50 flex items-center justify-center font-mono font-bold text-xs text-emerald-700';
    badgeEl.textContent = '✓ Khớp 0đ';
    if (reasonBox) reasonBox.classList.add('hidden');
    if (reasonInput) reasonInput.required = false;
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  } else {
    if (diff > 0) {
      badgeEl.className = 'h-[38px] px-3 rounded-lg border border-blue-200 bg-blue-50 flex items-center justify-center font-mono font-bold text-xs text-blue-700';
      badgeEl.textContent = `+${formatCurrency(diff)} (Dư)`;
    } else {
      badgeEl.className = 'h-[38px] px-3 rounded-lg border border-rose-200 bg-rose-50 flex items-center justify-center font-mono font-bold text-xs text-rose-700';
      badgeEl.textContent = `${formatCurrency(diff)} (Thiếu)`;
    }
    if (reasonBox) reasonBox.classList.remove('hidden');
    if (reasonInput) reasonInput.required = true;

    if (reasonInput && reasonInput.value.trim() !== '') {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    } else {
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.classList.add('opacity-50', 'cursor-not-allowed');
      }
    }
  }
}
window.calculateShiftDiscrepancy = calculateShiftDiscrepancy;

async function handleOpenShift() {
  const initCashEl = document.getElementById('shift-open-initial-cash');
  const noteEl = document.getElementById('shift-open-note');
  const btn = document.getElementById('btn-open-shift');
  const initCash = parseInt(initCashEl?.value ?? '-1', 10);
  const note = (noteEl?.value || '').trim();
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  if (isNaN(initCash) || initCash < 0) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập tiền mặt đầu ca (số nguyên ≥ 0đ)!', 'error');
    if (initCashEl) initCashEl.focus();
    return;
  }

  const ok = await showAdminConfirm({
    title: 'Bắt đầu mở ca trực mới',
    message: `Bạn chuẩn bị mở ca trực với tiền mặt đầu ca: ${fmt(initCash)}. Xác nhận bắt đầu?`,
    confirmText: 'Mở ca ngay',
    cancelText: 'Hủy'
  });
  if (!ok) return;

  if (btn) btn.disabled = true;
  try {
    const r = await adminFetchJson('../api/admin.php?action=shifts', {
      method: 'POST',
      body: JSON.stringify({
        sub_action: 'open_shift',
        initial_cash: initCash,
        note: note
      })
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể mở ca trực!', 'error', 4000);
      return;
    }
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || `Đã mở ca trực thành công!`, 'success', 3500);
    }
    await loadShiftHandovers();
  } finally {
    if (btn) btn.disabled = false;
  }
}
window.handleOpenShift = handleOpenShift;

async function handleCloseShift() {
  const curShift = window._currentActiveShift;
  if (!curShift) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Không có ca trực nào đang mở!', 'warning');
    return;
  }

  const countedEl = document.getElementById('shift-cash-counted');
  const reasonEl = document.getElementById('shift-discrepancy-reason');
  const noteEl = document.getElementById('shift-close-note');
  const btn = document.getElementById('btn-close-shift');
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  const counted = parseInt(countedEl?.value ?? '-1', 10);
  if (isNaN(counted) || counted < 0) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập số tiền mặt nhân viên đếm được thực tế!', 'error');
    if (countedEl) countedEl.focus();
    return;
  }

  const sysCash = Number(curShift.cash_total || 0);
  const initCash = Number(curShift.initial_cash || 0);
  const expectedTotal = sysCash + initCash;
  const diff = counted - expectedTotal;
  const reason = (reasonEl?.value || '').trim();

  if (diff !== 0 && !reason) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Bắt buộc nhập lý do chênh lệch khi số tiền đếm khác hệ thống!', 'error');
    if (reasonEl) reasonEl.focus();
    return;
  }

  const diffStr = diff === 0 ? 'Khớp 0đ' : (diff < 0 ? `Thiếu ${fmt(diff)}` : `Thừa +${fmt(diff)}`);
  const confirmMsg =
    `XÁC NHẬN CHỐT CA TRỰC:\n` +
    `• Tiền đầu ca: ${fmt(initCash)}\n` +
    `• Hệ thống tính thu trong ca: ${fmt(sysCash)}\n` +
    `• Tổng tiền lý thuyết: ${fmt(expectedTotal)}\n` +
    `• Nhân viên đếm thực tế: ${fmt(counted)} (${diffStr})\n` +
    (diff !== 0 ? `• Lý do lệch: ${reason}\n` : '') +
    `\nBấm Chốt ca để khóa sổ bàn giao ca trực?`;

  const ok = await showAdminConfirm({
    title: 'Khóa sổ & Chốt ca bàn giao',
    message: confirmMsg,
    confirmText: 'Chốt ca ngay',
    cancelText: 'Kiểm lại'
  });
  if (!ok) return;

  if (btn) btn.disabled = true;
  try {
    const r = await adminFetchJson('../api/admin.php?action=shifts', {
      method: 'POST',
      body: JSON.stringify({
        sub_action: 'close_shift',
        shift_id: Number(curShift.id || curShift.shift_id || 0),
        actual_cash_received: counted,
        discrepancy_reason: reason,
        note: (noteEl?.value || '').trim()
      })
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể chốt ca trực!', 'error', 4000);
      return;
    }
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || `Đã chốt ca thành công!`, 'success', 4000);
    }
    await loadShiftHandovers();
    if (isOwnerAdmin() && typeof loadAdminLogs === 'function') loadAdminLogs(1);
  } finally {
    if (btn) calculateShiftDiscrepancy();
  }
}
window.handleCloseShift = handleCloseShift;

async function handleConfirmShift(shiftId, expectedTotal = 0) {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền đối soát tiền mặt!', 'error');
    return;
  }

  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');
  const rawInput = await showAdminPrompt({
    title: `Đối soát bàn giao tiền mặt ca #${shiftId}`,
    message: `• Tổng tiền hệ thống + đầu ca cần bàn giao: ${fmt(expectedTotal)}\n• Nhập số tiền THỰC NHẬN trong két từ nhân viên:`,
    placeholder: 'Nhập số tiền thực nhận',
    defaultValue: String(expectedTotal || 0),
    inputType: 'number',
    confirmText: 'Xác nhận đối soát',
    cancelText: 'Hủy'
  });
  if (rawInput === null) return;

  const actualCash = parseInt(String(rawInput).replace(/[^\d]/g, ''), 10);
  if (isNaN(actualCash) || actualCash < 0) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Số tiền thực nhận không hợp lệ!', 'error');
    return;
  }

  const diff = actualCash - Number(expectedTotal || 0);
  const diffLabel = diff === 0 ? 'Khớp 0đ' : (diff < 0 ? `Thiếu ${fmt(diff)}` : `Thừa +${fmt(diff)}`);

  const secondOk = await showAdminConfirm({
    title: `Xác nhận lần 2: Đối soát ca #${shiftId}`,
    message: `Bạn xác nhận thực nhận ${fmt(actualCash)} (${diffLabel}) cho ca #${shiftId}? Ca trực sẽ được khóa vĩnh viễn và ghi vào sổ kiểm toán.`,
    confirmText: 'Đồng ý khóa sổ đối soát',
    cancelText: 'Hủy'
  });
  if (!secondOk) return;

  const r = await adminFetchJson('../api/admin.php?action=shifts', {
    method: 'POST',
    body: JSON.stringify({
      sub_action: 'confirm_shift',
      shift_id: shiftId,
      actual_cash_received: actualCash
    })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể đối soát ca trực!', 'error', 4000);
    return;
  }

  await loadShiftHandovers();
  if (isOwnerAdmin() && typeof loadAdminLogs === 'function') loadAdminLogs(1);

  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(r.message || `Đã đối soát thành công ca #${shiftId}!`, diff < 0 ? 'warning' : 'success', 4000);
  }
}
window.handleConfirmShift = handleConfirmShift;

