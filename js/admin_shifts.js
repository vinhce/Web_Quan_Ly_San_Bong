// =========================================================
// Má»¤C 2.2: CHá»T CA & BÃ€N GIAO TIá»€N Máº¶T (SHIFT HANDOVER)
// =========================================================
function renderShiftHandoverStats(customStats = null) {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;
  const stats = customStats || (typeof db.getCurrentShiftStats === 'function' ? db.getCurrentShiftStats() : {
    startTime: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    cashTotal: 0,
    transferTotal: 0
  });
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'Ä‘');

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
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'Ä‘');
  if (initialCashEl) {
    initialCashEl.textContent = fmt(cur?.initial_cash || 0);
  }
  const operatorEl = document.getElementById('shift-operator-name');
  if (operatorEl) {
    operatorEl.textContent = cur ? (cur.staff_name || cur.staffName || 'NhÃ¢n viÃªn trá»±c') : 'ChÆ°a má»Ÿ ca';
  }

  // Cáº­p nháº­t dropdown bá»™ lá»c nhÃ¢n viÃªn náº¿u cÃ³ danh sÃ¡ch tá»« server
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

  // Cáº­p nháº­t cháº¥m tráº¡ng thÃ¡i xanh á»Ÿ menu Tab 8 vÃ  cÃ¡c badge
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

  // Staff chá»‰ tháº¥y cÃ¡c ca cá»§a chÃ­nh mÃ¬nh; Manager & Admin tháº¥y toÃ n bá»™ ca cá»§a má»i nhÃ¢n viÃªn
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
          ChÆ°a cÃ³ lá»‹ch sá»­ chá»‘t ca nÃ o Ä‘Æ°á»£c ghi nháº­n.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = shifts.map(sh => {
    const id = sh.id || sh.shift_code || `CA-${sh.shift_id || ''}`;
    const staffName = sh.staff_name || sh.staffName || sh.staff_username || 'NhÃ¢n viÃªn trá»±c';
    const startT = sh.start_time || sh.startTime || '';
    const endT = sh.end_time || sh.endTime || 'Äang má»Ÿ';
    const initialCash = Number(sh.initial_cash ?? sh.initialCash ?? 0);
    const cashDeclared = Number(sh.cash_total ?? sh.cashDeclared ?? 0);
    const transferTotal = Number(sh.transfer_total ?? sh.transferTotal ?? 0);
    const actualRaw = sh.actual_cash_received ?? sh.cashActual;
    const hasCounted = actualRaw !== null && actualRaw !== undefined;
    const cashActual = hasCounted ? Number(actualRaw) : null;
    const expectedTotal = initialCash + cashDeclared;
    const diff = hasCounted ? (cashActual - expectedTotal) : null;

    let diffHtml = '<span class="text-slate-400 italic">Chá» chá»‘t ca</span>';
    if (hasCounted) {
      if (diff === 0) {
        diffHtml = `<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-extrabold text-[11px] border border-emerald-300">âœ“ Khá»›p 0Ä‘</span>`;
      } else if (diff < 0) {
        diffHtml = `<span class="px-2 py-0.5 rounded bg-red-100 text-red-700 font-extrabold text-[11px] border border-red-300" title="${escapeJsAttr(sh.discrepancy_reason || '')}">Thiáº¿u ${fmt(diff)}</span>`;
      } else {
        diffHtml = `<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-extrabold text-[11px] border border-amber-300" title="${escapeJsAttr(sh.discrepancy_reason || '')}">Thá»«a +${fmt(diff)}</span>`;
      }
      if (sh.discrepancy_reason) {
        diffHtml += `<div class="text-[10px] text-slate-500 mt-0.5 italic truncate max-w-[120px]" title="${escapeJsAttr(sh.discrepancy_reason)}">${escapeSearchHTML(sh.discrepancy_reason)}</div>`;
      }
    }

    const stRaw = String(sh.status || 'closed').toLowerCase();
    let statusBadge = '';
    if (stRaw === 'open' || stRaw === 'Ä‘ang má»Ÿ') {
      statusBadge = '<span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px]">Äang má»Ÿ</span>';
    } else if (stRaw === 'confirmed' || stRaw === 'Ä‘Ã£ xÃ¡c nháº­n') {
      statusBadge = '<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">âœ“ ÄÃ£ Ä‘á»‘i soÃ¡t</span>';
    } else {
      statusBadge = '<span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">â³ ÄÃ£ chá»‘t (chá» Ä‘á»‘i soÃ¡t)</span>';
    }

    let actionHtml = '';
    if (stRaw === 'open') {
      actionHtml = '<span class="text-[11px] text-slate-400 italic">Ca Ä‘ang má»Ÿ</span>';
    } else if (stRaw === 'confirmed') {
      actionHtml = '<span class="text-[11px] text-emerald-600 font-bold">âœ“ ÄÃ£ khÃ³a sá»•</span>';
    } else {
      actionHtml = isManagerOrAdmin()
        ? `<button type="button" onclick="handleConfirmShift('${escapeJsAttr(String(id))}', ${expectedTotal})" class="px-2.5 py-1 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-[11px] shadow-sm cursor-pointer">
             Äá»‘i soÃ¡t tiá»n máº·t
           </button>`
        : '<span class="text-[11px] text-slate-400">Chá» Quáº£n lÃ½ Ä‘á»‘i soÃ¡t</span>';
    }

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="py-2.5 px-3 font-mono font-bold text-[#0F172A]">${escapeSearchHTML(String(id))}</td>
        <td class="py-2.5 px-3 font-semibold text-[#0F172A]">${escapeSearchHTML(staffName)}</td>
        <td class="py-2.5 px-3 text-[11px] text-slate-600">
          <div>Má»Ÿ: <b>${escapeSearchHTML(startT)}</b></div>
          <div>Chá»‘t: <b>${escapeSearchHTML(endT)}</b></div>
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
  const badgeEl = document.getElementById('shift-discrepancy-badge');
  const reasonBox = document.getElementById('shift-discrepancy-reason-box');
  const reasonInput = document.getElementById('shift-discrepancy-reason');
  if (!countedEl || !badgeEl) return;

  const counted = parseInt(countedEl.value || '0', 10);
  const curShift = window._currentActiveShift;
  const sysCash = Number(curShift?.cash_total || 0);
  const initCash = Number(curShift?.initial_cash || 0);
  const expected = sysCash + initCash;
  const diff = counted - expected;
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'Ä‘');

  if (diff === 0) {
    badgeEl.className = 'h-[38px] px-3 rounded-lg border border-emerald-300 bg-emerald-50 flex items-center justify-center font-mono font-bold text-xs text-emerald-700';
    badgeEl.textContent = 'âœ“ Khá»›p 0Ä‘';
    if (reasonBox) reasonBox.classList.add('hidden');
    if (reasonInput) reasonInput.required = false;
  } else if (diff < 0) {
    badgeEl.className = 'h-[38px] px-3 rounded-lg border border-red-300 bg-red-50 flex items-center justify-center font-mono font-bold text-xs text-red-700';
    badgeEl.textContent = `Thiáº¿u ${fmt(diff)}`;
    if (reasonBox) reasonBox.classList.remove('hidden');
    if (reasonInput) reasonInput.required = true;
  } else {
    badgeEl.className = 'h-[38px] px-3 rounded-lg border border-amber-300 bg-amber-50 flex items-center justify-center font-mono font-bold text-xs text-amber-800';
    badgeEl.textContent = `Thá»«a +${fmt(diff)}`;
    if (reasonBox) reasonBox.classList.remove('hidden');
    if (reasonInput) reasonInput.required = true;
  }
}
window.calculateShiftDiscrepancy = calculateShiftDiscrepancy;

async function handleOpenShift() {
  const initCashEl = document.getElementById('shift-open-initial-cash');
  const noteEl = document.getElementById('shift-open-note');
  const btn = document.getElementById('btn-open-shift');
  const initCash = parseInt(initCashEl?.value ?? '-1', 10);
  const note = (noteEl?.value || '').trim();
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'Ä‘');

  if (isNaN(initCash) || initCash < 0) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lÃ²ng nháº­p tiá»n máº·t Ä‘áº§u ca (sá»‘ nguyÃªn â‰¥ 0Ä‘)!', 'error');
    if (initCashEl) initCashEl.focus();
    return;
  }

  const ok = await showAdminConfirm({
    title: 'Báº¯t Ä‘áº§u má»Ÿ ca trá»±c má»›i',
    message: `Báº¡n chuáº©n bá»‹ má»Ÿ ca trá»±c vá»›i tiá»n máº·t Ä‘áº§u ca: ${fmt(initCash)}. XÃ¡c nháº­n báº¯t Ä‘áº§u?`,
    confirmText: 'Má»Ÿ ca ngay',
    cancelText: 'Há»§y'
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
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'KhÃ´ng thá»ƒ má»Ÿ ca trá»±c!', 'error', 4000);
      return;
    }
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || `ÄÃ£ má»Ÿ ca trá»±c thÃ nh cÃ´ng!`, 'success', 3500);
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
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('KhÃ´ng cÃ³ ca trá»±c nÃ o Ä‘ang má»Ÿ!', 'warning');
    return;
  }

  const countedEl = document.getElementById('shift-cash-counted');
  const reasonEl = document.getElementById('shift-discrepancy-reason');
  const noteEl = document.getElementById('shift-close-note');
  const btn = document.getElementById('btn-close-shift');
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'Ä‘');

  const counted = parseInt(countedEl?.value ?? '-1', 10);
  if (isNaN(counted) || counted < 0) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lÃ²ng nháº­p sá»‘ tiá»n máº·t nhÃ¢n viÃªn Ä‘áº¿m Ä‘Æ°á»£c thá»±c táº¿!', 'error');
    if (countedEl) countedEl.focus();
    return;
  }

  const sysCash = Number(curShift.cash_total || 0);
  const initCash = Number(curShift.initial_cash || 0);
  const expectedTotal = sysCash + initCash;
  const diff = counted - expectedTotal;
  const reason = (reasonEl?.value || '').trim();

  if (diff !== 0 && !reason) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Báº¯t buá»™c nháº­p lÃ½ do chÃªnh lá»‡ch khi sá»‘ tiá»n Ä‘áº¿m khÃ¡c há»‡ thá»‘ng!', 'error');
    if (reasonEl) reasonEl.focus();
    return;
  }

  const diffStr = diff === 0 ? 'Khá»›p 0Ä‘' : (diff < 0 ? `Thiáº¿u ${fmt(diff)}` : `Thá»«a +${fmt(diff)}`);
  const confirmMsg =
    `XÃC NHáº¬N CHá»T CA TRá»°C:\n` +
    `â€¢ Tiá»n Ä‘áº§u ca: ${fmt(initCash)}\n` +
    `â€¢ Há»‡ thá»‘ng tÃ­nh thu trong ca: ${fmt(sysCash)}\n` +
    `â€¢ Tá»•ng tiá»n lÃ½ thuyáº¿t: ${fmt(expectedTotal)}\n` +
    `â€¢ NhÃ¢n viÃªn Ä‘áº¿m thá»±c táº¿: ${fmt(counted)} (${diffStr})\n` +
    (diff !== 0 ? `â€¢ LÃ½ do lá»‡ch: ${reason}\n` : '') +
    `\nBáº¥m Chá»‘t ca Ä‘á»ƒ khÃ³a sá»• bÃ n giao ca trá»±c?`;

  const ok = await showAdminConfirm({
    title: 'KhÃ³a sá»• & Chá»‘t ca bÃ n giao',
    message: confirmMsg,
    confirmText: 'Chá»‘t ca ngay',
    cancelText: 'Kiá»ƒm láº¡i'
  });
  if (!ok) return;

  if (btn) btn.disabled = true;
  try {
    const r = await adminFetchJson('../api/admin.php?action=shifts', {
      method: 'POST',
      body: JSON.stringify({
        sub_action: 'close_shift',
        actual_cash_received: counted,
        discrepancy_reason: reason,
        note: (noteEl?.value || '').trim()
      })
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'KhÃ´ng thá»ƒ chá»‘t ca trá»±c!', 'error', 4000);
      return;
    }
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || `ÄÃ£ chá»‘t ca thÃ nh cÃ´ng!`, 'success', 4000);
    }
    await loadShiftHandovers();
    if (isOwnerAdmin() && typeof loadAuditLogs === 'function') loadAuditLogs();
  } finally {
    if (btn) btn.disabled = false;
  }
}
window.handleCloseShift = handleCloseShift;

async function handleConfirmShift(shiftId, expectedTotal = 0) {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chá»‰ Quáº£n lÃ½ hoáº·c Chá»§ sÃ¢n má»›i cÃ³ quyá»n Ä‘á»‘i soÃ¡t tiá»n máº·t!', 'error');
    return;
  }

  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'Ä‘');
  const rawInput = await showAdminPrompt({
    title: `Äá»‘i soÃ¡t bÃ n giao tiá»n máº·t ca #${shiftId}`,
    message: `â€¢ Tá»•ng tiá»n há»‡ thá»‘ng + Ä‘áº§u ca cáº§n bÃ n giao: ${fmt(expectedTotal)}\nâ€¢ Nháº­p sá»‘ tiá»n THá»°C NHáº¬N trong kÃ©t tá»« nhÃ¢n viÃªn:`,
    placeholder: 'Nháº­p sá»‘ tiá»n thá»±c nháº­n',
    defaultValue: String(expectedTotal || 0),
    inputType: 'number',
    confirmText: 'XÃ¡c nháº­n Ä‘á»‘i soÃ¡t',
    cancelText: 'Há»§y'
  });
  if (rawInput === null) return;

  const actualCash = parseInt(String(rawInput).replace(/[^\d]/g, ''), 10);
  if (isNaN(actualCash) || actualCash < 0) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Sá»‘ tiá»n thá»±c nháº­n khÃ´ng há»£p lá»‡!', 'error');
    return;
  }

  const diff = actualCash - Number(expectedTotal || 0);
  const diffLabel = diff === 0 ? 'Khá»›p 0Ä‘' : (diff < 0 ? `Thiáº¿u ${fmt(diff)}` : `Thá»«a +${fmt(diff)}`);

  const secondOk = await showAdminConfirm({
    title: `XÃ¡c nháº­n láº§n 2: Äá»‘i soÃ¡t ca #${shiftId}`,
    message: `Báº¡n xÃ¡c nháº­n thá»±c nháº­n ${fmt(actualCash)} (${diffLabel}) cho ca #${shiftId}? Ca trá»±c sáº½ Ä‘Æ°á»£c khÃ³a vÄ©nh viá»…n vÃ  ghi vÃ o sá»• kiá»ƒm toÃ¡n.`,
    confirmText: 'Äá»“ng Ã½ khÃ³a sá»• Ä‘á»‘i soÃ¡t',
    cancelText: 'Há»§y'
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
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'KhÃ´ng thá»ƒ Ä‘á»‘i soÃ¡t ca trá»±c!', 'error', 4000);
    return;
  }

  await loadShiftHandovers();
  if (typeof loadAuditLogs === 'function') loadAuditLogs();

  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(r.message || `ÄÃ£ Ä‘á»‘i soÃ¡t thÃ nh cÃ´ng ca #${shiftId}!`, diff < 0 ? 'warning' : 'success', 4000);
  }
}
window.handleConfirmShift = handleConfirmShift;
window.handleConfirmShift = handleConfirmShift;

// =========================================================
// Má»¤C 2.1: NHáº¬T KÃ KIá»‚M TOÃN Há»† THá»NG (AUDIT LOG - CHá»NG THáº¤T THOÃT)
// =========================================================
async function loadAuditLogs() {
  if (!isOwnerAdmin()) return;
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const userFilter = (document.getElementById('audit-filter-user')?.value || '').trim();
  const actionFilter = (document.getElementById('audit-filter-action')?.value || '').trim();
  const dateFilter = (document.getElementById('audit-filter-date')?.value || '').trim();
  const searchFilter = (document.getElementById('audit-filter-search')?.value || '').trim();

  let logs = typeof db.getAuditLogs === 'function' ? db.getAuditLogs() : [];
  let serverLoaded = false;
  let serverStaffList = [];
  const hasFilter = Boolean(userFilter || actionFilter || dateFilter || searchFilter);

  const qs = new URLSearchParams({ action: 'audit_logs' });
  if (userFilter) {
    qs.set('user_id', userFilter);
  }
  if (actionFilter) {
    qs.set('filter_action', actionFilter);
    qs.set('action_type', actionFilter);
  }
  if (dateFilter) qs.set('date', dateFilter);
  if (searchFilter) qs.set('search', searchFilter);

  const auditRes = await adminFetchJson(`../api/admin.php?${qs.toString()}`);
  if (auditRes.ok && auditRes.data !== undefined) {
    serverLoaded = true;
    const rawLogs = Array.isArray(auditRes.data) ? auditRes.data : (Array.isArray(auditRes.data?.logs) ? auditRes.data.logs : []);
    serverStaffList = Array.isArray(auditRes.data?.staffList) ? auditRes.data.staffList : [];
    if (hasFilter) {
      logs = rawLogs;
    } else if (rawLogs.length > 0) {
      const localLogs = logs;
      const seenIds = new Set();
      const merged = [];
      [...rawLogs, ...localLogs].forEach(item => {
        const tgt = item.booking_id || item.target || item.target_code || item.entity_id || '';
        const key = `${item.id || ''}_${item.action || item.action_type || ''}_${tgt}_${item.time || item.created_at || ''}`;
        if (!seenIds.has(key)) {
          seenIds.add(key);
          merged.push(item);
        }
      });
      logs = merged;
    }
  }

  // Populate dropdown nhÃ¢n sá»± (#audit-filter-user) dÃ¹ng ID sá»‘ thá»±c trong DB
  const userSelect = document.getElementById('audit-filter-user');
  if (userSelect) {
    const prevU = userSelect.value;
    const roleShortLabel = {
      admin: 'Chá»§ sÃ¢n',
      manager: 'Quáº£n lÃ½ sÃ¢n',
      staff: 'NhÃ¢n viÃªn'
    };
    let optionsHtml = '<option value="">ðŸ‘¤ Táº¥t cáº£ nhÃ¢n sá»±</option>';
    if (serverStaffList.length > 0) {
      optionsHtml += serverStaffList.map(u => {
        const uid = String(u.id ?? '').trim();
        if (!uid) return '';
        const name = u.full_name || u.username || `ID #${uid}`;
        const uname = u.username ? ` (${u.username})` : '';
        const rLabel = roleShortLabel[String(u.role || '').toLowerCase()] || u.role || '';
        return `<option value="${escapeSearchHTML(uid)}">${escapeSearchHTML(`${name}${uname}${rLabel ? ' Â· ' + rLabel : ''}`)}</option>`;
      }).join('');
    } else {
      const actors = new Map();
      logs.forEach(l => {
        const key = (l.user_id !== undefined && l.user_id !== null && String(l.user_id) !== '')
          ? String(l.user_id)
          : String(l.actorUsername || l.username || '').trim();
        const uname = l.actorUsername || l.username || '';
        const name = l.actor_name || l.actorName || l.full_name || uname || key;
        if (key && !actors.has(key)) {
          actors.set(key, `${name}${uname && uname !== name ? ` (${uname})` : ''}`);
        }
      });
      if (actors.size === 0) {
        actors.set('admin', 'Quáº£n Trá»‹ ViÃªn (admin)');
        actors.set('manager', 'Quáº£n LÃ½ SÃ¢n (manager)');
        actors.set('staff', 'NhÃ¢n ViÃªn Trá»±c SÃ¢n (staff)');
      }
      optionsHtml += Array.from(actors.entries())
        .map(([val, label]) => `<option value="${escapeSearchHTML(val)}">${escapeSearchHTML(label)}</option>`)
        .join('');
    }
    userSelect.innerHTML = optionsHtml;
    if (prevU) userSelect.value = prevU;
  }

  // Khi offline fallback thÃ¬ lá»c client; khi serverLoaded thÃ¬ giá»¯ káº¿t quáº£ server Ä‘Ã£ lá»c chÃ­nh xÃ¡c
  const filtered = serverLoaded ? logs : logs.filter(l => {
    const actor = String(l.actor_name || l.actorName || l.actorUsername || l.username || l.user_id || '').toLowerCase();
    const uId = String(l.user_id ?? '').trim();
    const act = String(l.action || l.action_type || '').toUpperCase();
    const dt = String(l.dateISO || l.created_at || '').slice(0, 10);
    const target = String(l.booking_id || l.target || l.target_code || l.entity_id || '').toLowerCase();
    const oldV = String(l.oldValue || l.old_value || '').toLowerCase();
    const newV = String(l.newValue || l.new_value || '').toLowerCase();

    if (userFilter && uId !== userFilter && actor !== userFilter.toLowerCase()) return false;
    if (actionFilter && act !== actionFilter.toUpperCase()) return false;
    if (dateFilter && dt && dt !== dateFilter) return false;
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      if (!target.includes(q) && !oldV.includes(q) && !newV.includes(q) && !actor.includes(q)) return false;
    }
    return true;
  });

  renderAuditLogs(filtered);
}
window.loadAuditLogs = loadAuditLogs;

function renderAuditLogs(logs) {
  const tbody = document.getElementById('admin-audit-tbody');
  if (!tbody) return;

  if (!Array.isArray(logs) || logs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-8 text-center text-xs text-[#64748B]">
          KhÃ´ng cÃ³ báº£n ghi kiá»ƒm toÃ¡n (Audit Log) nÃ o khá»›p vá»›i bá»™ lá»c hiá»‡n táº¡i.
        </td>
      </tr>
    `;
    return;
  }

  const badgeMap = {
    'CHECKIN': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'CANCEL_BOOKING': 'bg-red-100 text-red-800 border-red-300',
    'NOSHOW_RELEASE': 'bg-amber-100 text-amber-900 border-amber-300',
    'COLLECT_PAYMENT': 'bg-green-100 text-green-800 border-green-300',
    'RESTORE_BOOKING': 'bg-sky-100 text-sky-800 border-sky-300',
    'TRANSFER_PITCH': 'bg-purple-100 text-purple-800 border-purple-300',
    'WALKIN_BOOKING': 'bg-teal-100 text-teal-800 border-teal-300',
    'COUNTER_SALE': 'bg-indigo-100 text-indigo-800 border-indigo-300',
    'SHIFT_CLOSE': 'bg-orange-100 text-orange-800 border-orange-300',
    'SHIFT_CONFIRM': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'PITCH_UPSERT': 'bg-slate-200 text-slate-800 border-slate-300',
    'UPDATE_PRICING': 'bg-violet-100 text-violet-800 border-violet-300',
    'UPDATE_SETTINGS': 'bg-slate-200 text-slate-800 border-slate-300',
    'RECONCILE_MANUAL': 'bg-indigo-100 text-indigo-800 border-indigo-300',
    'RECONCILE_RESOLVE': 'bg-teal-100 text-teal-800 border-teal-300',
    'AUTO_CANCEL_EXPIRED': 'bg-amber-100 text-amber-800 border-amber-300',
    'ADMIN_RUN_AUTO_RELEASE': 'bg-orange-100 text-orange-800 border-orange-300',
    'STAFF_CREATE': 'bg-sky-100 text-sky-800 border-sky-300',
    'STAFF_ROLE_CHANGE': 'bg-purple-100 text-purple-800 border-purple-300',
    'STAFF_STATUS_CHANGE': 'bg-rose-100 text-rose-800 border-rose-300',
    'STAFF_RESET_PASSWORD': 'bg-amber-100 text-amber-800 border-amber-300',
    'WEBHOOK_MATCH': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'WEBHOOK_UNDERPAID': 'bg-amber-100 text-amber-800 border-amber-300',
    'WEBHOOK_OVERPAID': 'bg-blue-100 text-blue-800 border-blue-300',
    'WEBHOOK_UNMATCHED': 'bg-red-100 text-red-800 border-red-300',
    'UPDATE_PAYMENT': 'bg-green-100 text-green-800 border-green-300',
    'ADD_OVERTIME': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'ADD_SERVICE': 'bg-cyan-100 text-cyan-800 border-cyan-300',
    'PITCH_STATUS': 'bg-slate-200 text-slate-800 border-slate-300',
    'INVENTORY_RESTOCK': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'SERVICE_UPSERT': 'bg-cyan-100 text-cyan-800 border-cyan-300',
    'SERVICE_DELETE': 'bg-red-100 text-red-800 border-red-300',
    'VOUCHER_SAVE': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'VOUCHER_TOGGLE': 'bg-amber-100 text-amber-800 border-amber-300',
    'VOUCHER_DELETE': 'bg-red-100 text-red-800 border-red-300',
    'CRM_UPDATE': 'bg-sky-100 text-sky-800 border-sky-300',
    'RECURRING_CREATE': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'RECURRING_CANCEL': 'bg-red-100 text-red-800 border-red-300',
    'RECURRING_SKIP_DATE': 'bg-amber-100 text-amber-800 border-amber-300',
    'RUN_RECURRING_GEN': 'bg-teal-100 text-teal-800 border-teal-300',
    'WAITLIST_ASSIGN': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'WAITLIST_NOTIFIED': 'bg-sky-100 text-sky-800 border-sky-300',
    'WAITLIST_CANCEL': 'bg-red-100 text-red-800 border-red-300',
    'GOLDEN_HOUR_SAVE': 'bg-amber-100 text-amber-800 border-amber-300',
    'GOLDEN_HOUR_DELETE': 'bg-rose-100 text-rose-800 border-rose-300',
    'MAINTENANCE_ADD': 'bg-orange-100 text-orange-800 border-orange-300',
    'MAINTENANCE_UPDATE': 'bg-amber-100 text-amber-800 border-amber-300',
    'EXPENSE_ADD': 'bg-rose-100 text-rose-800 border-rose-300',
    'EXPENSE_DELETE': 'bg-red-100 text-red-800 border-red-300',
    'MATCHMAKING_MODERATE': 'bg-indigo-100 text-indigo-800 border-indigo-300',
    'REVIEW_REPLY': 'bg-sky-100 text-sky-800 border-sky-300',
    'REVIEW_STATUS': 'bg-purple-100 text-purple-800 border-purple-300',
    'TELEGRAM_TEST': 'bg-indigo-100 text-indigo-800 border-indigo-300',
    'RUN_REMINDERS': 'bg-sky-100 text-sky-800 border-sky-300',
    'DB_BACKUP': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'DB_BACKUP_DOWNLOAD': 'bg-slate-200 text-slate-800 border-slate-300'
  };

  tbody.innerHTML = logs.slice(0, 100).map(l => {
    const timeStr = l.time || l.created_at || '';
    const actorName = l.actor_name || l.actorName || l.full_name || l.actorUsername || l.username || 'Há»‡ thá»‘ng';
    const role = String(l.actor_role || l.actorRole || l.role || 'staff').toLowerCase();
    const act = String(l.action || l.action_type || 'ACTION').toUpperCase();
    const target = l.booking_id || l.target || l.target_code || l.entity_id || 'â€”';
    const oldVal = l.oldValue ?? l.old_value ?? 'â€”';
    const newVal = l.newValue ?? l.new_value ?? 'â€”';
    const ip = l.ip || l.ip_address || '127.0.0.1';

    let roleBadge = '<span class="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">NhÃ¢n viÃªn</span>';
    if (role === 'admin') {
      roleBadge = '<span class="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold">Chá»§ sÃ¢n</span>';
    } else if (role === 'manager') {
      roleBadge = '<span class="px-1.5 py-0.5 rounded bg-purple-100 text-[#7C3AED] text-[10px] font-bold">Quáº£n lÃ½ sÃ¢n</span>';
    } else if (role === 'system') {
      roleBadge = '<span class="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">Há»‡ thá»‘ng (Cron)</span>';
    } else if (role === 'user') {
      roleBadge = '<span class="px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800 text-[10px] font-bold">KhÃ¡ch hÃ ng</span>';
    }

    const actCls = badgeMap[act] || 'bg-slate-100 text-slate-700 border-slate-300';

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">${escapeSearchHTML(timeStr)}</td>
        <td class="py-2.5 px-3">
          <div class="font-bold text-[#0F172A] text-xs">${escapeSearchHTML(actorName)}</div>
          <div class="mt-0.5">${roleBadge}</div>
        </td>
        <td class="py-2.5 px-3">
          <span class="px-2 py-0.5 rounded border font-mono font-bold text-[10px] ${actCls}">
            ${escapeSearchHTML(act)}
          </span>
        </td>
        <td class="py-2.5 px-3 font-mono font-bold text-[#0F172A]">${escapeSearchHTML(String(target))}</td>
        <td class="py-2.5 px-3 text-[11px] text-slate-500 max-w-[220px] break-words">${escapeSearchHTML(typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal))}</td>
        <td class="py-2.5 px-3 text-[11px] font-semibold text-[#0F172A] max-w-[260px] break-words">${escapeSearchHTML(typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal))}</td>
        <td class="py-2.5 px-3 font-mono text-[11px] text-slate-400">${escapeSearchHTML(ip)}</td>
      </tr>
    `;
  }).join('');
}
window.renderAuditLogs = renderAuditLogs;

