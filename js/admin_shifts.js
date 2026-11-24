// =========================================================
// TAB 8: CHỐT CA & BÀN GIAO TIỀN MẶT (SHIFT HANDOVER)
// =========================================================
let currentShiftPage = 1;
let currentShiftTotalPages = 1;
let currentShiftRowsCache = new Map();

function formatShiftVND(n) {
  if (window.SanBongApp && typeof window.SanBongApp.formatVND === 'function') {
    return window.SanBongApp.formatVND(n || 0);
  }
  return Number(n || 0).toLocaleString('vi-VN') + 'đ';
}

function formatShiftDateTime(value) {
  const raw = String(value || '').trim();
  if (!raw) return '—';
  if (/^\d{2}\/\d{2}\/\d{4}(?:\s+\d{2}:\d{2})?$/.test(raw)) return raw;
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (m) {
    const base = `${m[3]}/${m[2]}/${m[1]}`;
    return (m[4] && m[5]) ? `${base} ${m[4]}:${m[5]}` : base;
  }
  return raw;
}

function validateShiftReasonClient(reason, minLen = 10) {
  const collapsed = String(reason || '').replace(/\s+/g, ' ').trim();
  if (collapsed.length < minLen) {
    return { valid: false, message: `Lý do bắt buộc phải có tối thiểu ${minLen} ký tự rõ ràng.` };
  }
  const noSpace = collapsed.replace(/\s+/g, '');
  if (!/\p{L}/u.test(noSpace)) {
    return { valid: false, message: 'Lý do phải có nội dung chữ mô tả rõ ràng.' };
  }
  const lower = noSpace.toLowerCase();
  const chars = Array.from(lower);
  const uniq = new Set(chars).size;
  if (uniq < 4 || /(.)\1{3,}/u.test(lower) || /(.{2,6})\1{2,}/u.test(lower)) {
    return { valid: false, message: 'Lý do không được lặp ký tự hoặc vô nghĩa.' };
  }
  const words = collapsed.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const uniqWords = new Set(words).size;
    if (uniqWords === 1 || (words.length >= 3 && uniqWords / words.length < 0.5)) {
      return { valid: false, message: 'Lý do không được lặp từ vô nghĩa.' };
    }
  }
  if (!collapsed.includes(' ') && noSpace.length >= 8) {
    const counts = {};
    chars.forEach(c => { counts[c] = (counts[c] || 0) + 1; });
    const maxFreq = Math.max(...Object.values(counts));
    const bigrams = [];
    for (let i = 0; i < chars.length - 1; i++) bigrams.push(chars[i] + chars[i + 1]);
    const bigramRatio = bigrams.length > 0 ? (new Set(bigrams).size / bigrams.length) : 1;
    if (uniq <= 5 || (maxFreq / noSpace.length) > 0.35 || bigramRatio < 0.65) {
      return { valid: false, message: 'Lý do không hợp lệ, vui lòng ghi rõ nguyên nhân.' };
    }
  }
  return { valid: true, reason: collapsed, message: '' };
}

function renderShiftHandoverStats(cur = null) {
  const startEl = document.getElementById('shift-start-time');
  const cashEl = document.getElementById('shift-cash-total');
  const transEl = document.getElementById('shift-transfer-total');
  const initEl = document.getElementById('shift-initial-cash-display');
  const opEl = document.getElementById('shift-operator-name');
  const opDot = document.getElementById('shift-operator-dot');

  if (!cur) {
    if (startEl) startEl.textContent = '—';
    if (cashEl) cashEl.textContent = '0đ';
    if (transEl) transEl.textContent = '0đ';
    if (initEl) initEl.textContent = '0đ';
    if (opEl) opEl.textContent = 'Chưa mở ca';
    if (opDot) opDot.className = 'w-1.5 h-1.5 rounded-full bg-slate-400';
    return;
  }

  const rawStart = cur.open_time || cur.start_time || cur.startTime || '';
  if (startEl) startEl.textContent = rawStart ? formatShiftDateTime(rawStart) : '—';
  if (cashEl) cashEl.textContent = formatShiftVND(cur.cash_total ?? cur.cashTotal ?? 0);
  if (transEl) transEl.textContent = formatShiftVND(cur.transfer_total ?? cur.transferTotal ?? 0);
  if (initEl) initEl.textContent = formatShiftVND(cur.initial_cash ?? cur.initialCash ?? 0);
  if (opEl) opEl.textContent = cur.staff_name || cur.staffName || 'Nhân viên trực';
  if (opDot) opDot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-500';
}
window.renderShiftHandoverStats = renderShiftHandoverStats;

function renderShiftOverdueAndBlocking(cur, blockingOpen) {
  const overdueBox = document.getElementById('shift-overdue-warning');
  const overdueText = document.getElementById('shift-overdue-warning-text');
  if (overdueBox && overdueText) {
    const warnLevel = cur?.warn_level || 'none';
    const hours = Number(cur?.hours_open || 0);
    if (cur && (warnLevel === 'warning' || warnLevel === 'danger')) {
      overdueBox.classList.remove('hidden');
      if (warnLevel === 'danger') {
        overdueBox.className = 'p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-xs text-rose-900 font-semibold flex items-center gap-3';
        overdueText.innerHTML = `<span class="font-bold text-rose-900">CẢNH BÁO KHẨN: Ca trực đã mở ${hours} giờ (≥ 16 giờ)!</span> Vui lòng kiểm đếm tiền mặt và chốt ca ngay lập tức.`;
      } else {
        overdueBox.className = 'p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-xs text-amber-900 font-semibold flex items-center gap-3';
        overdueText.innerHTML = `<span class="font-bold text-amber-900">Cảnh báo: Ca trực đã mở ${hours} giờ (≥ 12 giờ)!</span> Vui lòng chuẩn bị kiểm đếm và chốt ca đúng quy định.`;
      }
    } else {
      overdueBox.classList.add('hidden');
    }
  }

  const blockBox = document.getElementById('shift-blocking-open-notice');
  const blockText = document.getElementById('shift-blocking-open-text');
  const blockBtn = document.getElementById('shift-blocking-detail-btn');
  if (blockBox && blockText) {
    if (!cur && blockingOpen) {
      blockBox.classList.remove('hidden');
      blockText.textContent = `Hiện có ca trực #${blockingOpen.id} (${blockingOpen.staff_name}, mở lúc ${blockingOpen.start_time_formatted || formatShiftDateTime(blockingOpen.start_time)}) đang mở. Cần chốt ca này trước khi mở ca mới.`;
      if (blockBtn) {
        blockBtn.onclick = () => openShiftDetailModal(blockingOpen.id);
      }
    } else {
      blockBox.classList.add('hidden');
    }
  }
}

function buildShiftFilterQuery(page = 1) {
  const dateEl = document.getElementById('shift-filter-date');
  const staffEl = document.getElementById('shift-filter-staff');
  const params = new URLSearchParams({
    action: 'shifts',
    page: String(page),
    limit: '20'
  });
  const dateVal = dateEl ? String(dateEl.value || '').trim() : '';
  const staffVal = staffEl ? String(staffEl.value || '').trim() : '';
  if (dateVal) params.set('date', dateVal);
  if (staffVal) params.set('staff_id', staffVal);
  return params;
}

async function loadShiftHandovers(page = 1) {
  currentShiftPage = Math.max(1, parseInt(page, 10) || 1);
  const tabRoot = document.getElementById('tab-content-shifts');
  if (tabRoot && window.SanBongDatePicker && typeof window.SanBongDatePicker.init === 'function') {
    window.SanBongDatePicker.init(tabRoot);
  }

  const staffSelect = document.getElementById('shift-filter-staff');
  if (staffSelect) {
    staffSelect.classList.toggle('hidden', typeof isManagerOrAdmin === 'function' && !isManagerOrAdmin());
  }

  const params = buildShiftFilterQuery(currentShiftPage);
  const shiftRes = await adminFetchJson('../api/admin.php?' + params.toString());

  let cur = null;
  let blockingOpen = null;
  let shifts = [];
  let pagination = { total: 0, page: 1, limit: 20, totalPages: 1 };

  if (shiftRes.ok && shiftRes.data) {
    cur = shiftRes.data.activeShift || shiftRes.data.currentShift || null;
    blockingOpen = shiftRes.data.blockingOpenShift || null;
    shifts = Array.isArray(shiftRes.data.shifts) ? shiftRes.data.shifts : [];
    pagination = shiftRes.data.pagination || pagination;

    if (staffSelect && Array.isArray(shiftRes.data.staffList)) {
      const prevVal = staffSelect.value;
      staffSelect.innerHTML = '<option value="">Tất cả nhân viên</option>';
      shiftRes.data.staffList.forEach(st => {
        const opt = document.createElement('option');
        opt.value = String(st.id);
        opt.textContent = `${st.full_name || st.username} (${st.role})`;
        staffSelect.appendChild(opt);
      });
      if (prevVal) staffSelect.value = prevVal;
    }
  }

  window._currentActiveShift = cur;
  renderShiftHandoverStats(cur);
  renderShiftOverdueAndBlocking(cur, blockingOpen);

  const statusDot = document.getElementById('shift-nav-status-dot');
  if (statusDot) statusDot.classList.toggle('hidden', !cur);

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
    if (cur) calculateShiftDiscrepancy();
  }

  renderShiftsTable(shifts);
  renderShiftPagination(pagination, shifts.length);
}
window.loadShiftHandovers = loadShiftHandovers;

function getShiftStatusBadgeHtml(statusRaw) {
  const st = String(statusRaw || '').toLowerCase();
  if (st === 'open') {
    return '<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[10px] whitespace-nowrap">● Đang mở</span>';
  }
  if (st === 'pending_explanation') {
    return '<span class="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-300 font-extrabold text-[10px] whitespace-nowrap">! Chờ giải trình</span>';
  }
  if (st === 'confirmed') {
    return '<span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 font-bold text-[10px] whitespace-nowrap">✓ Đã đối soát</span>';
  }
  return '<span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-bold text-[10px] whitespace-nowrap">⏳ Chờ đối soát</span>';
}

function renderShiftsTable(shifts) {
  const tbody = document.getElementById('admin-shifts-tbody');
  const emptyEl = document.getElementById('shift-empty-state');
  if (!tbody) return;

  currentShiftRowsCache.clear();
  if (!Array.isArray(shifts) || shifts.length === 0) {
    tbody.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');

  const canConfirm = typeof isManagerOrAdmin === 'function' && isManagerOrAdmin();

  tbody.innerHTML = shifts.map(sh => {
    const id = Number(sh.id || sh.shift_id || 0);
    currentShiftRowsCache.set(id, sh);

    const staffName = sh.staff_name || sh.staffName || 'Nhân viên trực';
    const stRaw = String(sh.status || 'closed').toLowerCase();
    const startFmt = sh.start_time_formatted || formatShiftDateTime(sh.start_time);
    const endFmt = stRaw === 'open'
      ? 'Đang mở'
      : (sh.end_time_formatted || formatShiftDateTime(sh.end_time));

    const initialCash = Number(sh.initial_cash ?? 0);
    const cashDeclared = Number(sh.cash_total ?? 0);
    const transferTotal = Number(sh.transfer_total ?? 0);
    const staffCountedRaw = sh.staff_counted_cash ?? sh.actual_cash_received;
    const actualRaw = sh.actual_cash_received;
    const hasCounted = actualRaw !== null && actualRaw !== undefined && stRaw !== 'open';
    const cashActual = hasCounted ? Number(actualRaw) : null;
    const staffCounted = (staffCountedRaw !== null && staffCountedRaw !== undefined && stRaw !== 'open')
      ? Number(staffCountedRaw)
      : cashActual;
    const expectedTotal = initialCash + cashDeclared;
    const diff = hasCounted ? (cashActual - expectedTotal) : null;

    let rowBg = 'hover:bg-slate-50';
    if (hasCounted && diff > 0) {
      rowBg = 'shift-row-surplus';
    } else if (hasCounted && diff < 0) {
      rowBg = 'shift-row-deficit';
    }

    const noteCombined = [sh.discrepancy_reason, sh.note, sh.admin_note]
      .map(s => String(s || '').trim())
      .filter(Boolean)
      .join(' | ');

    let diffHtml = '<span class="text-slate-400 italic">Chờ chốt ca</span>';
    if (hasCounted) {
      if (diff === 0) {
        diffHtml = '<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-extrabold text-[11px] border border-emerald-300 whitespace-nowrap">✓ Khớp</span>';
      } else if (diff < 0) {
        diffHtml = `<span class="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-extrabold text-[11px] border border-rose-300 whitespace-nowrap" title="${escapeJsAttr(sh.discrepancy_reason || '')}">Thiếu ${formatShiftVND(diff)}</span>`;
      } else {
        diffHtml = `<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-extrabold text-[11px] border border-amber-300 whitespace-nowrap" title="${escapeJsAttr(sh.discrepancy_reason || '')}">Thừa +${formatShiftVND(diff)}</span>`;
      }
      if (noteCombined) {
        diffHtml += `
          <div class="mt-1 flex items-center justify-center gap-1">
            <button type="button" onclick="openShiftDetailModal(${id})" class="inline-flex items-center gap-1 max-w-[130px] text-[10px] text-slate-600 hover:text-[#0F172A] underline decoration-dotted cursor-pointer" title="${escapeJsAttr(noteCombined)}">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span class="truncate">${escapeSearchHTML(noteCombined)}</span>
            </button>
          </div>
        `;
      }
    }

    const countedHtml = hasCounted
      ? `<div class="font-extrabold text-[#0F172A]">${formatShiftVND(staffCounted)}</div>` +
        (cashActual !== null && staffCounted !== null && Math.abs(cashActual - staffCounted) > 0.01
          ? `<div class="text-[10px] text-blue-700 font-semibold">Duyệt: ${formatShiftVND(cashActual)}</div>`
          : '')
      : '<span class="text-slate-400 font-normal">—</span>';

    const confirmerName = String(sh.confirmed_by_name || '').trim();
    const confirmedAtFmt = sh.confirmed_at_formatted || (sh.confirmed_at ? formatShiftDateTime(sh.confirmed_at) : '');
    const confirmerHtml = confirmerName
      ? `<div class="font-semibold text-[#0F172A] truncate shift-confirmer-name" title="${escapeJsAttr(confirmerName)}">${escapeSearchHTML(confirmerName)}</div>
         <div class="text-[10px] text-slate-500 font-mono">${escapeSearchHTML(confirmedAtFmt)}</div>`
      : '<span class="text-slate-400">—</span>';

    const detailBtn = `<button type="button" onclick="openShiftDetailModal(${id})" class="px-2.5 py-1 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#0F172A] font-bold text-[11px] cursor-pointer whitespace-nowrap">Xem chi tiết</button>`;
    let confirmBtn = '';
    if (canConfirm && (stRaw === 'closed' || stRaw === 'pending_explanation')) {
      confirmBtn = `<button type="button" onclick="handleConfirmShift(${id}, ${expectedTotal}, ${staffCounted ?? expectedTotal})" class="px-2.5 py-1 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-[11px] shadow-sm cursor-pointer whitespace-nowrap">Đối soát tiền mặt</button>`;
    }

    return `
      <tr class="${rowBg} transition-colors">
        <td class="py-2.5 px-3 font-mono font-bold text-[#0F172A] whitespace-nowrap">SHIFT-${id}</td>
        <td class="py-2.5 px-3 font-semibold text-[#0F172A]">${escapeSearchHTML(staffName)}</td>
        <td class="py-2.5 px-3 text-[11px] text-slate-600 whitespace-nowrap">
          <div>Mở: <b>${escapeSearchHTML(startFmt)}</b></div>
          <div>Chốt: <b>${escapeSearchHTML(endFmt)}</b></div>
        </td>
        <td class="py-2.5 px-3 text-right font-bold text-emerald-700 whitespace-nowrap">${formatShiftVND(initialCash)}</td>
        <td class="py-2.5 px-3 text-right font-extrabold text-[#D97706] whitespace-nowrap">${formatShiftVND(cashDeclared)}</td>
        <td class="py-2.5 px-3 text-right font-bold text-purple-700 whitespace-nowrap">${formatShiftVND(transferTotal)}</td>
        <td class="py-2.5 px-3 text-right whitespace-nowrap">${countedHtml}</td>
        <td class="py-2.5 px-3 text-center">${diffHtml}</td>
        <td class="py-2.5 px-3 text-center">${getShiftStatusBadgeHtml(stRaw)}</td>
        <td class="py-2.5 px-3 text-[11px]">${confirmerHtml}</td>
        <td class="py-2.5 px-3 text-right">
          <div class="inline-flex items-center justify-end gap-1.5">${confirmBtn}${detailBtn}</div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderShiftPagination(pagination, countInPage) {
  const infoEl = document.getElementById('shift-pagination-info');
  const indEl = document.getElementById('shift-page-indicator');
  const prevBtn = document.getElementById('shift-prev-page-btn');
  const nextBtn = document.getElementById('shift-next-page-btn');

  const total = Number(pagination?.total || 0);
  const page = Math.max(1, Number(pagination?.page || 1));
  const limit = Math.max(1, Number(pagination?.limit || 20));
  currentShiftTotalPages = Math.max(1, Number(pagination?.totalPages || 1));

  const startIdx = total === 0 ? 0 : ((page - 1) * limit + 1);
  const endIdx = total === 0 ? 0 : (startIdx + countInPage - 1);

  if (infoEl) infoEl.textContent = `Hiển thị ${startIdx}–${endIdx} / ${total} ca trực`;
  if (indEl) indEl.textContent = `Trang ${page} / ${currentShiftTotalPages}`;
  if (prevBtn) prevBtn.disabled = page <= 1;
  if (nextBtn) nextBtn.disabled = page >= currentShiftTotalPages;
}

function goToShiftPage(page) {
  const p = Math.max(1, Math.min(currentShiftTotalPages, parseInt(page, 10) || 1));
  if (p === currentShiftPage) return;
  loadShiftHandovers(p);
}
window.goToShiftPage = goToShiftPage;

function exportShiftsCsv() {
  const params = buildShiftFilterQuery(1);
  params.set('sub_action', 'export_csv');
  const url = (typeof normalizeAdminApiUrl === 'function')
    ? normalizeAdminApiUrl('api/admin.php?' + params.toString())
    : ('../api/admin.php?' + params.toString());
  window.location.href = url;
}
window.exportShiftsCsv = exportShiftsCsv;

function calculateShiftDiscrepancy() {
  const countedEl = document.getElementById('shift-cash-counted');
  const badgeEl = document.getElementById('shift-discrepancy-badge') || document.getElementById('shift-diff-badge');
  const btnSubmit = document.getElementById('btn-close-shift');
  const reasonBox = document.getElementById('shift-discrepancy-reason-box');
  const reasonInput = document.getElementById('shift-discrepancy-reason');
  if (!badgeEl) return;

  const rawVal = countedEl ? countedEl.value.trim() : '';
  if (!countedEl || rawVal === '' || isNaN(Number(rawVal)) || Number(rawVal) < 0) {
    badgeEl.className = 'shift-touch-h44 px-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center font-mono font-bold text-xs text-slate-500';
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

  if (diff === 0) {
    badgeEl.className = 'shift-touch-h44 px-3 rounded-lg border border-emerald-200 bg-emerald-50 flex items-center justify-center font-mono font-bold text-xs text-emerald-700';
    badgeEl.textContent = '✓ Khớp';
    if (reasonBox) reasonBox.classList.add('hidden');
    if (reasonInput) reasonInput.required = false;
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  } else {
    if (diff > 0) {
      badgeEl.className = 'shift-touch-h44 px-3 rounded-lg border border-amber-200 bg-amber-50 flex items-center justify-center font-mono font-bold text-xs text-amber-800';
      badgeEl.textContent = `+${formatShiftVND(diff)} (Thừa)`;
    } else {
      badgeEl.className = 'shift-touch-h44 px-3 rounded-lg border border-rose-200 bg-rose-50 flex items-center justify-center font-mono font-bold text-xs text-rose-700';
      badgeEl.textContent = `${formatShiftVND(diff)} (Thiếu)`;
    }
    if (reasonBox) reasonBox.classList.remove('hidden');
    if (reasonInput) reasonInput.required = true;

    const rCheck = validateShiftReasonClient(reasonInput ? reasonInput.value : '', 10);
    if (btnSubmit) {
      btnSubmit.disabled = !rCheck.valid;
      btnSubmit.classList.toggle('opacity-50', !rCheck.valid);
      btnSubmit.classList.toggle('cursor-not-allowed', !rCheck.valid);
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

  if (isNaN(initCash) || initCash < 0) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập tiền mặt đầu ca (số nguyên ≥ 0đ)!', 'error');
    if (initCashEl) initCashEl.focus();
    return;
  }

  const ok = await showAdminConfirm({
    title: 'Bắt đầu mở ca trực mới',
    message: `Bạn chuẩn bị mở ca trực với tiền mặt đầu ca: ${formatShiftVND(initCash)}. Xác nhận bắt đầu?`,
    confirmText: 'Mở ca ngay',
    cancelText: 'Hủy'
  });
  if (!ok) return;

  if (btn) btn.disabled = true;
  try {
    const r = await adminFetchJson('../api/admin.php?action=shifts', {
      method: 'POST',
      body: JSON.stringify({ sub_action: 'open_shift', initial_cash: initCash, note })
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể mở ca trực!', 'error', 4000);
      return;
    }
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Đã mở ca trực thành công!', 'success', 3500);
    await loadShiftHandovers(1);
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

  if (diff !== 0) {
    const rCheck = validateShiftReasonClient(reason, 10);
    if (!rCheck.valid) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(rCheck.message, 'error');
      if (reasonEl) reasonEl.focus();
      return;
    }
  }

  const diffStr = diff === 0 ? '✓ Khớp' : (diff < 0 ? `Thiếu ${formatShiftVND(diff)}` : `Thừa +${formatShiftVND(diff)}`);
  const confirmMsg =
    `XÁC NHẬN CHỐT CA TRỰC:\n` +
    `• Tiền đầu ca: ${formatShiftVND(initCash)}\n` +
    `• Hệ thống tính thu trong ca: ${formatShiftVND(sysCash)}\n` +
    `• Tổng tiền lý thuyết: ${formatShiftVND(expectedTotal)}\n` +
    `• Nhân viên đếm thực tế: ${formatShiftVND(counted)} (${diffStr})\n` +
    (diff !== 0 ? `• Lý do lệch: ${reason}\n` : '') +
    `\nBấm Chốt ca để bàn giao ca trực?`;

  const ok = await showAdminConfirm({
    title: 'Chốt ca bàn giao',
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
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Đã chốt ca thành công!', 'success', 4000);
    await loadShiftHandovers(1);
    if (isOwnerAdmin() && typeof loadAdminLogs === 'function') loadAdminLogs(1);
  } finally {
    if (btn) calculateShiftDiscrepancy();
  }
}
window.handleCloseShift = handleCloseShift;

function handleConfirmShift(shiftId, expectedTotal = 0, staffCountedCash = null) {
  if (typeof isManagerOrAdmin === 'function' && !isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền đối soát tiền mặt!', 'error');
    return;
  }
  const cached = currentShiftRowsCache.get(Number(shiftId));
  const origStaffCount = staffCountedCash !== null && staffCountedCash !== undefined
    ? Number(staffCountedCash)
    : Number(cached?.staff_counted_cash ?? cached?.actual_cash_received ?? expectedTotal);

  const modal = document.getElementById('shift-confirm-modal');
  if (!modal) return;
  document.getElementById('confirm-shift-id').value = String(shiftId);
  document.getElementById('confirm-shift-expected').value = String(expectedTotal);
  document.getElementById('confirm-shift-staff-counted').value = String(origStaffCount);
  document.getElementById('confirm-shift-actual-cash').value = String(origStaffCount);
  document.getElementById('confirm-shift-admin-note').value = String(cached?.admin_note || '');
  document.getElementById('confirm-shift-note-err').classList.add('hidden');
  document.getElementById('shift-confirm-title').textContent = `Đối soát ca trực SHIFT-${shiftId}`;

  const summaryEl = document.getElementById('confirm-shift-summary');
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div>Nhân viên trực: <b>${escapeSearchHTML(cached?.staff_name || '—')}</b></div>
      <div>Tổng lý thuyết (đầu ca + hệ thống): <b class="font-mono">${formatShiftVND(expectedTotal)}</b></div>
      <div>Số tiền nhân viên đếm gốc: <b class="font-mono text-[#0F172A]">${formatShiftVND(origStaffCount)}</b></div>
      ${cached?.discrepancy_reason ? `<div>Giải trình của NV: <i>${escapeSearchHTML(cached.discrepancy_reason)}</i></div>` : ''}
    `;
  }
  updateConfirmShiftPreview();
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}
window.handleConfirmShift = handleConfirmShift;

function closeShiftConfirmModal() {
  const modal = document.getElementById('shift-confirm-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}
window.closeShiftConfirmModal = closeShiftConfirmModal;

function updateConfirmShiftPreview() {
  const expected = Number(document.getElementById('confirm-shift-expected')?.value || 0);
  const staffCounted = Number(document.getElementById('confirm-shift-staff-counted')?.value || 0);
  const actual = Number(document.getElementById('confirm-shift-actual-cash')?.value || 0);
  const diff = actual - expected;
  const edited = Math.abs(actual - staffCounted) > 0.01;

  const prevEl = document.getElementById('confirm-shift-diff-preview');
  if (prevEl) {
    if (diff === 0) {
      prevEl.className = 'mt-1.5 text-[11px] font-bold text-emerald-700';
      prevEl.textContent = edited ? '✓ Khớp quỹ (đã chỉnh sửa so với số NV đếm gốc)' : '✓ Khớp';
    } else if (diff > 0) {
      prevEl.className = 'mt-1.5 text-[11px] font-bold text-amber-700';
      prevEl.textContent = `Thừa +${formatShiftVND(diff)}`;
    } else {
      prevEl.className = 'mt-1.5 text-[11px] font-bold text-rose-700';
      prevEl.textContent = `Thiếu ${formatShiftVND(diff)}`;
    }
  }
  const reqMark = document.getElementById('confirm-shift-note-req-mark');
  if (reqMark) reqMark.classList.toggle('hidden', diff === 0 && !edited);
}
window.updateConfirmShiftPreview = updateConfirmShiftPreview;

async function submitShiftConfirmModal(e) {
  if (e && e.preventDefault) e.preventDefault();
  const shiftId = Number(document.getElementById('confirm-shift-id')?.value || 0);
  const expected = Number(document.getElementById('confirm-shift-expected')?.value || 0);
  const staffCounted = Number(document.getElementById('confirm-shift-staff-counted')?.value || 0);
  const actualCash = Number(document.getElementById('confirm-shift-actual-cash')?.value ?? -1);
  const adminNote = (document.getElementById('confirm-shift-admin-note')?.value || '').trim();
  const errEl = document.getElementById('confirm-shift-note-err');
  const submitBtn = document.getElementById('confirm-shift-submit-btn');

  if (isNaN(actualCash) || actualCash < 0) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Số tiền thực nhận không hợp lệ!', 'error');
    return;
  }

  const diff = actualCash - expected;
  const edited = Math.abs(actualCash - staffCounted) > 0.01;
  if (diff !== 0 || edited) {
    const chk = validateShiftReasonClient(adminNote, 10);
    if (!chk.valid) {
      if (errEl) {
        errEl.textContent = chk.message;
        errEl.classList.remove('hidden');
      }
      return;
    }
  }
  if (errEl) errEl.classList.add('hidden');
  if (submitBtn) submitBtn.disabled = true;

  try {
    const r = await adminFetchJson('../api/admin.php?action=shifts', {
      method: 'POST',
      body: JSON.stringify({
        sub_action: 'confirm_shift',
        shift_id: shiftId,
        actual_cash_received: actualCash,
        admin_note: adminNote,
        edit_reason: edited ? adminNote : ''
      })
    });
    if (!r.ok) {
      if (errEl) {
        errEl.textContent = r.message || 'Không thể đối soát ca trực!';
        errEl.classList.remove('hidden');
      }
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể đối soát ca trực!', 'error', 4000);
      return;
    }
    closeShiftConfirmModal();
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || `Đã đối soát ca SHIFT-${shiftId} thành công!`, 'success', 4000);
    await loadShiftHandovers(currentShiftPage || 1);
    if (isOwnerAdmin() && typeof loadAdminLogs === 'function') loadAdminLogs(1);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}
window.submitShiftConfirmModal = submitShiftConfirmModal;

async function openShiftDetailModal(shiftId) {
  const modal = document.getElementById('shift-detail-modal');
  const titleEl = document.getElementById('shift-detail-title');
  const subEl = document.getElementById('shift-detail-subtitle');
  const bodyEl = document.getElementById('shift-detail-body');
  if (!modal || !bodyEl) return;

  if (titleEl) titleEl.textContent = `Chi tiết ca trực SHIFT-${shiftId}`;
  if (subEl) subEl.textContent = 'Đang tải dữ liệu đơn đặt sân, tiền mặt và sao kê VietQR...';
  bodyEl.innerHTML = '<div class="py-10 text-center text-slate-500">Đang tải chi tiết ca trực...</div>';
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  const r = await adminFetchJson(`../api/admin.php?action=shifts&sub_action=shift_detail&shift_id=${encodeURIComponent(shiftId)}`);
  if (!r.ok || !r.data) {
    bodyEl.innerHTML = `<div class="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">${escapeSearchHTML(r.message || 'Không thể tải chi tiết ca trực.')}</div>`;
    return;
  }

  const d = r.data;
  const sh = d.shift || {};
  const bankSum = d.bank_summary || {};
  if (subEl) {
    subEl.textContent = `${sh.staff_name || '—'} · Mở: ${sh.start_time_formatted || formatShiftDateTime(sh.start_time)} · Chốt: ${sh.end_time_formatted || (sh.status === 'open' ? 'Đang mở' : '—')}`;
  }

  const bookingsRows = (d.bookings || []).length === 0
    ? '<tr><td colspan="6" class="py-4 text-center text-slate-400">Không có đơn đặt sân phát sinh trong ca này.</td></tr>'
    : (d.bookings || []).map(b => `
        <tr class="border-t border-slate-100">
          <td class="py-2 px-2.5 font-mono font-bold text-[#0F172A]">${escapeSearchHTML(b.code)}</td>
          <td class="py-2 px-2.5">${escapeSearchHTML(b.customer_name)} <span class="text-slate-400">(${escapeSearchHTML(b.phone)})</span></td>
          <td class="py-2 px-2.5">${escapeSearchHTML(b.pitch_name)} · ${escapeSearchHTML(b.slot_time)}</td>
          <td class="py-2 px-2.5 text-right font-bold">${formatShiftVND(b.paid_amount)} / ${formatShiftVND(b.total_price)}</td>
          <td class="py-2 px-2.5">${escapeSearchHTML(b.payment_method)}</td>
          <td class="py-2 px-2.5">${escapeSearchHTML(b.status)} · ${escapeSearchHTML(b.payment_status)}</td>
        </tr>
      `).join('');

  const cashRows = (d.cash_items || []).length === 0
    ? '<tr><td colspan="4" class="py-4 text-center text-slate-400">Chưa có khoản thu tiền mặt trong ca.</td></tr>'
    : (d.cash_items || []).map(it => `
        <tr class="border-t border-slate-100">
          <td class="py-2 px-2.5 font-semibold">${escapeSearchHTML(it.source)}</td>
          <td class="py-2 px-2.5 font-mono">${escapeSearchHTML(it.booking_code)}</td>
          <td class="py-2 px-2.5">${escapeSearchHTML(it.detail)}</td>
          <td class="py-2 px-2.5 text-right font-bold text-amber-700">${formatShiftVND(it.amount)}</td>
        </tr>
      `).join('');

  const bankRows = (d.vietqr_items || []).length === 0
    ? '<tr><td colspan="6" class="py-4 text-center text-slate-400">Không có giao dịch VietQR trong khung giờ ca này.</td></tr>'
    : (d.vietqr_items || []).map(tx => `
        <tr class="border-t border-slate-100">
          <td class="py-2 px-2.5 font-mono">${escapeSearchHTML(tx.sepay_tx_id)}</td>
          <td class="py-2 px-2.5 font-mono font-bold">${escapeSearchHTML(tx.booking_code)}</td>
          <td class="py-2 px-2.5 text-right font-bold text-purple-700">${formatShiftVND(tx.transfer_amount)}</td>
          <td class="py-2 px-2.5 text-right">${formatShiftVND(tx.expected_amount)}</td>
          <td class="py-2 px-2.5"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${tx.match_status === 'matched' || tx.match_status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}">${escapeSearchHTML(tx.match_status)}</span></td>
          <td class="py-2 px-2.5 text-slate-500">${escapeSearchHTML(tx.mismatch_reason || tx.transaction_content || '—')}</td>
        </tr>
      `).join('');

  bodyEl.innerHTML = `
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="p-3 rounded-xl bg-slate-50 border border-slate-200"><div class="text-[10px] text-slate-500 font-bold uppercase">Tiền đầu ca</div><div class="font-extrabold text-sm mt-0.5">${formatShiftVND(sh.initial_cash)}</div></div>
      <div class="p-3 rounded-xl bg-amber-50 border border-amber-200"><div class="text-[10px] text-amber-800 font-bold uppercase">Hệ thống TM</div><div class="font-extrabold text-sm text-amber-700 mt-0.5">${formatShiftVND(sh.cash_total)}</div></div>
      <div class="p-3 rounded-xl bg-slate-50 border border-slate-200"><div class="text-[10px] text-slate-500 font-bold uppercase">NV đếm gốc / Duyệt</div><div class="font-extrabold text-sm mt-0.5">${sh.staff_counted_cash !== null ? formatShiftVND(sh.staff_counted_cash) : '—'}${sh.actual_cash_received !== null && sh.actual_cash_received != sh.staff_counted_cash ? ` → ${formatShiftVND(sh.actual_cash_received)}` : ''}</div></div>
      <div class="p-3 rounded-xl bg-purple-50 border border-purple-200"><div class="text-[10px] text-purple-800 font-bold uppercase">VietQR vs Sao kê</div><div class="font-extrabold text-sm text-purple-700 mt-0.5">${formatShiftVND(bankSum.shift_transfer_total)} / ${formatShiftVND(bankSum.bank_tx_total)}</div></div>
    </div>

    <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
      <div><b>Trạng thái:</b> ${getShiftStatusBadgeHtml(sh.status)} ${sh.confirmed_by_name ? `· Đối soát bởi <b>${escapeSearchHTML(sh.confirmed_by_name)}</b> lúc ${escapeSearchHTML(sh.confirmed_at_formatted || '')}` : ''}</div>
      <div><b>Ghi chú bàn giao NV:</b> ${escapeSearchHTML(sh.note || '—')}</div>
      <div><b>Lý do lệch (NV):</b> ${escapeSearchHTML(sh.discrepancy_reason || '—')}</div>
      <div><b>Ghi chú đối soát (QL):</b> ${escapeSearchHTML(sh.admin_note || '—')}</div>
    </div>

    <div class="space-y-2">
      <h5 class="font-heading font-bold text-xs text-[#0F172A] uppercase">Đơn đặt sân trong ca (${(d.bookings || []).length})</h5>
      <div class="overflow-x-auto border border-slate-200 rounded-xl"><table class="w-full text-left text-[11px] shift-modal-table"><thead class="bg-slate-50 text-slate-600 font-bold"><tr><th class="py-2 px-2.5">Mã đơn</th><th class="py-2 px-2.5">Khách hàng</th><th class="py-2 px-2.5">Sân &amp; Giờ</th><th class="py-2 px-2.5 text-right">Đã thu / Tổng</th><th class="py-2 px-2.5">Phương thức</th><th class="py-2 px-2.5">Trạng thái</th></tr></thead><tbody>${bookingsRows}</tbody></table></div>
    </div>

    <div class="space-y-2">
      <h5 class="font-heading font-bold text-xs text-[#0F172A] uppercase">Chi tiết các khoản Tiền mặt (${(d.cash_items || []).length} · Tổng ${formatShiftVND(d.cash_sum)})</h5>
      <div class="overflow-x-auto border border-slate-200 rounded-xl"><table class="w-full text-left text-[11px] min-w-[540px]"><thead class="bg-slate-50 text-slate-600 font-bold"><tr><th class="py-2 px-2.5">Nguồn thu</th><th class="py-2 px-2.5">Mã</th><th class="py-2 px-2.5">Chi tiết</th><th class="py-2 px-2.5 text-right">Số tiền</th></tr></thead><tbody>${cashRows}</tbody></table></div>
    </div>

    <div class="space-y-2">
      <h5 class="font-heading font-bold text-xs text-[#0F172A] uppercase">Đối chiếu VietQR trực tiếp với sao kê bank_transactions (${bankSum.total_tx || 0} GD · Khớp ${bankSum.matched_count || 0} · Cần lưu ý ${bankSum.issue_count || 0})</h5>
      <div class="overflow-x-auto border border-slate-200 rounded-xl"><table class="w-full text-left text-[11px] shift-modal-table"><thead class="bg-slate-50 text-slate-600 font-bold"><tr><th class="py-2 px-2.5">Mã GD SePay</th><th class="py-2 px-2.5">Mã đơn</th><th class="py-2 px-2.5 text-right">Thực nhận NH</th><th class="py-2 px-2.5 text-right">Dự kiến</th><th class="py-2 px-2.5">Đối soát</th><th class="py-2 px-2.5">Ghi chú / Nội dung</th></tr></thead><tbody>${bankRows}</tbody></table></div>
    </div>
  `;
}
window.openShiftDetailModal = openShiftDetailModal;

function closeShiftDetailModal() {
  const modal = document.getElementById('shift-detail-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}
window.closeShiftDetailModal = closeShiftDetailModal;
