// =========================================================
// 4. QUẢN LÝ MÃƒ GIẢM GIÁ / VOUCHER KHUYẾN MÃƒI (TAB 5)
// =========================================================
// [hoisted to admin.js]
let editingVoucherCode = '';
let vouchersAdminCache = [];
let goldenHourRulesCache = [];
window.editingVoucherCode = editingVoucherCode;
window.vouchersAdminCache = vouchersAdminCache;
window.goldenHourRulesCache = goldenHourRulesCache;

function normalizeVoucherRecord(v) {
  if (!v) return null;
  return {
    code: String(v.code || '').toUpperCase(),
    type: v.type || v.discount_type || 'percent',
    value: Number(v.value ?? v.discount_value ?? 0),
    minOrder: Number(v.minOrder ?? v.min_order ?? 0),
    description: String(v.description || ''),
    max_usage: Number(v.max_usage ?? v.maxUsage ?? 0),
    used_count: Number(v.used_count ?? v.usedCount ?? 0),
    valid_from: String(v.valid_from ?? v.validFrom ?? ''),
    valid_to: String(v.valid_to ?? v.validTo ?? ''),
    pitch_type_limit: String(v.pitch_type_limit ?? v.pitchTypeLimit ?? ''),
    isActive: v.isActive !== undefined ? Boolean(v.isActive) : (v.is_active === undefined ? true : Number(v.is_active) === 1 || v.is_active === true)
  };
}

async function renderAdminVouchers() {
  if (!isOwnerAdmin()) return;
  const tbody = document.getElementById('admin-vouchers-tbody');
  if (!tbody) return;
  const db = window.SanBongApp?.SanBongDB;

  let vouchers = [];
  const r = await adminFetchJson('../api/admin.php?action=vouchers');
  if (r.ok && Array.isArray(r.data)) {
    vouchers = r.data.map(normalizeVoucherRecord).filter(Boolean);
    try { localStorage.setItem('sb_vouchers_v1', JSON.stringify(vouchers)); } catch (e) {}
  } else if (!r.ok && r.status === 0 && db) {
    vouchers = (db.getVouchers() || []).map(normalizeVoucherRecord).filter(Boolean);
  } else if (!r.ok) {
    const thCount = tbody.closest('table')?.querySelectorAll('thead th').length || 7;
    tbody.innerHTML = `<tr><td colspan="${thCount}" class="py-6 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải danh sách Voucher.')}</td></tr>`;
    return;
  }

  vouchersAdminCache = vouchers;
  const thEls = Array.from(tbody.closest('table')?.querySelectorAll('thead th') || []);
  const colCount = thEls.length || 7;
  const hasLimitCol = colCount >= 7 || thEls.some(th => (th.textContent || '').toLowerCase().includes('giới hạn'));

  if (vouchers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${colCount}" class="py-6 text-center text-slate-400">Chưa có mã giảm giá nào.</td></tr>`;
    return;
  }

  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  tbody.innerHTML = vouchers.map(v => {
    const isActive = v.isActive !== false;
    const badge = v.type === 'percent'
      ? `<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Giảm ${Number(v.value)}%</span>`
      : `<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">Giảm ${escapeSearchHTML(fmt(v.value))}</span>`;
    const statusBadge = isActive
      ? `<span class="px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#16A34A] text-[11px] font-bold">Đang kích hoạt</span>`
      : `<span class="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[11px] font-bold">Đang tạm khóa</span>`;

    const usageTxt = v.max_usage > 0 ? `${v.used_count}/${v.max_usage} lượt` : `${v.used_count} / Không giới hạn`;
    const dateTxt = (v.valid_from || v.valid_to)
      ? `${escapeSearchHTML(v.valid_from || '...')} â†’ ${escapeSearchHTML(v.valid_to || '...')}`
      : 'Không giới hạn ngày';
    const pitchTxt = v.pitch_type_limit ? `Chỉ Sân ${escapeSearchHTML(v.pitch_type_limit)} người` : 'Tất cả loại sân';

    const limitTd = hasLimitCol ? `
      <td class="py-3 px-4 text-[11px] space-y-0.5">
        <div class="font-bold text-[#0F172A]">Lượt: ${escapeSearchHTML(usageTxt)}</div>
        <div class="text-[#64748B]">📅 ${dateTxt}</div>
        <div class="text-sky-700 font-semibold">🏟️ ${pitchTxt}</div>
      </td>
    ` : '';

    const codeAttr = escapeJsAttr(v.code);

    return `
      <tr class="hover:bg-slate-50 transition-colors ${isActive ? '' : 'opacity-65'}">
        <td class="py-3 px-4 font-mono font-extrabold text-[#16A34A] text-sm">${escapeSearchHTML(v.code)}</td>
        <td class="py-3 px-4">${badge}</td>
        <td class="py-3 px-4 font-bold text-[#0F172A]">${escapeSearchHTML(fmt(v.minOrder || 0))}</td>
        <td class="py-3 px-4 text-[#475569]">${escapeSearchHTML(v.description || '')}</td>
        ${limitTd}
        <td class="py-3 px-4">${statusBadge}</td>
        <td class="py-3 px-4 text-right">
          <div class="inline-flex items-center justify-end gap-1.5 flex-wrap">
            <button type="button" onclick="handleEditVoucher('${codeAttr}')" class="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200 cursor-pointer">✏️ Sửa mã</button>
            <button type="button" onclick="handleToggleVoucher('${codeAttr}')" class="px-2.5 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[11px] border border-amber-200 cursor-pointer">${isActive ? '🔒 Tắt' : '🔓 Bật'}</button>
            <button type="button" onclick="handleDeleteVoucher('${codeAttr}')" class="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[11px] border border-red-200 cursor-pointer">🗑️ Xóa</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function handleEditVoucher(code) {
  if (!isOwnerAdmin() || !code) return;
  const db = window.SanBongApp?.SanBongDB;
  const target = String(code).trim().toUpperCase();
  const v = vouchersAdminCache.find(x => String(x.code).toUpperCase() === target)
    || (db ? normalizeVoucherRecord(db.getVouchers().find(x => String(x.code).toUpperCase() === target)) : null);
  if (!v) return;

  editingVoucherCode = v.code;

  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  setVal('admin-voucher-code', v.code);
  setVal('admin-voucher-type', v.type || 'percent');
  setVal('admin-voucher-value', v.value || 0);
  setVal('admin-voucher-min', v.minOrder || 0);
  setVal('admin-voucher-desc', v.description || '');
  setVal('admin-voucher-max-usage', v.max_usage ?? 0);
  setVal('admin-voucher-valid-from', v.valid_from || '');
  setVal('admin-voucher-valid-to', v.valid_to || '');
  setVal('admin-voucher-pitch-limit', v.pitch_type_limit || '');

  const titleEl = document.getElementById('admin-voucher-form-title');
  const badgeEl = document.getElementById('admin-voucher-edit-badge');
  const cancelBtn = document.getElementById('admin-voucher-cancel-btn');
  const submitBtn = document.getElementById('admin-voucher-submit-btn');

  if (titleEl) titleEl.textContent = 'Chỉnh sửa mã Voucher: ' + v.code;
  if (badgeEl) badgeEl.classList.remove('hidden');
  if (cancelBtn) cancelBtn.classList.remove('hidden');
  if (submitBtn) submitBtn.textContent = '💾 Lưu cập nhật Voucher';

  const formEl = document.getElementById('admin-voucher-form');
  if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const valEl = document.getElementById('admin-voucher-value');
  if (valEl) setTimeout(() => valEl.focus(), 150);
}

function cancelEditVoucher() {
  editingVoucherCode = '';
  window.editingVoucherCode = '';
  const formEl = document.getElementById('admin-voucher-form');
  if (formEl && formEl.reset) formEl.reset();

  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  setVal('admin-voucher-code', '');
  setVal('admin-voucher-value', '');
  setVal('admin-voucher-min', '0');
  setVal('admin-voucher-desc', '');
  setVal('admin-voucher-max-usage', '100');
  setVal('admin-voucher-valid-from', '');
  setVal('admin-voucher-valid-to', '');
  setVal('admin-voucher-pitch-limit', '');

  const titleEl = document.getElementById('admin-voucher-form-title');
  const badgeEl = document.getElementById('admin-voucher-edit-badge');
  const cancelBtn = document.getElementById('admin-voucher-cancel-btn');
  const submitBtn = document.getElementById('admin-voucher-submit-btn');

  if (titleEl) titleEl.textContent = 'Tạo mã Voucher mới';
  if (badgeEl) badgeEl.classList.add('hidden');
  if (cancelBtn) cancelBtn.classList.add('hidden');
  if (submitBtn) submitBtn.textContent = '+ Thêm mã Voucher';
}

async function handleSaveVoucher(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!isOwnerAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Chủ sân mới có quyền cấu hình Voucher!', 'error');
    return;
  }
  const code = (document.getElementById('admin-voucher-code')?.value || '').trim().toUpperCase();
  const type = document.getElementById('admin-voucher-type')?.value || 'percent';
  const value = parseInt(document.getElementById('admin-voucher-value')?.value || '0', 10);
  const minOrder = parseInt(document.getElementById('admin-voucher-min')?.value || '0', 10) || 0;
  const description = (document.getElementById('admin-voucher-desc')?.value || '').trim();
  const maxUsage = Math.max(0, parseInt(document.getElementById('admin-voucher-max-usage')?.value || '0', 10) || 0);
  const validFrom = (document.getElementById('admin-voucher-valid-from')?.value || '').trim();
  const validTo = (document.getElementById('admin-voucher-valid-to')?.value || '').trim();
  const pitchTypeLimit = (document.getElementById('admin-voucher-pitch-limit')?.value || '').trim();

  if (!code || value <= 0) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập mã Voucher và giá trị giảm hợp lệ!', 'warning');
    return;
  }

  const isEditing = Boolean(editingVoucherCode);
  const origCode = editingVoucherCode || code;

  const r = await adminFetchJson('../api/admin.php?action=vouchers', {
    method: 'POST',
    body: JSON.stringify({
      sub_action: 'save',
      code,
      original_code: origCode,
      type,
      value,
      minOrder,
      max_usage: maxUsage,
      valid_from: validFrom,
      valid_to: validTo,
      pitch_type_limit: pitchTypeLimit,
      description
    })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể lưu mã Voucher!', 'error', 4000);
    return;
  }

  const db = window.SanBongApp?.SanBongDB;
  if (db) {
    db.saveVoucher({
      code,
      originalCode: origCode,
      type,
      value,
      minOrder,
      max_usage: maxUsage,
      valid_from: validFrom,
      valid_to: validTo,
      pitch_type_limit: pitchTypeLimit,
      description
    });
  }

  cancelEditVoucher();
  await renderAdminVouchers();
  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(
      r.message || (isEditing
        ? `✓ Đã cập nhật mã khuyến mãi ${code} thành công!`
        : `🎁 Đã thêm mã khuyến mãi ${code} thành công! Khách hàng có thể sử dụng ngay.`),
      'success',
      3500
    );
  }
}

async function handleCreateVoucher(e) {
  return handleSaveVoucher(e);
}

async function handleToggleVoucher(code) {
  if (!isOwnerAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Chủ sân mới có quyền bật/tắt Voucher!', 'error');
    return;
  }
  if (!code) return;

  const r = await adminFetchJson('../api/admin.php?action=vouchers', {
    method: 'POST',
    body: JSON.stringify({ sub_action: 'toggle', code })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể thay đổi trạng thái Voucher!', 'error', 4000);
    return;
  }

  const db = window.SanBongApp?.SanBongDB;
  const updated = db ? db.toggleVoucherActive(code) : null;
  await renderAdminVouchers();
  if (window.SanBongApp?.showToast) {
    const nowActive = updated ? updated.isActive !== false : true;
    window.SanBongApp.showToast(
      r.message || (nowActive
        ? `🔓 Đã bật kích hoạt mã giảm giá ${code}.`
        : `🔒 Đã tạm khóa mã giảm giá ${code}.`),
      'info',
      2500
    );
  }
}

async function handleDeleteVoucher(code) {
  if (!isOwnerAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Chủ sân mới có quyền xóa Voucher!', 'error');
    return;
  }
  if (!code) return;

  const ok = await showAdminConfirm({
    title: 'Xóa mã giảm giá (Voucher)',
    message: `Bạn có chắc chắn muốn xóa vĩnh viễn mã Voucher ${code}?`,
    confirmText: 'Xóa Voucher',
    cancelText: 'Hủy',
    danger: true
  });
  if (!ok) return;

  const r = await adminFetchJson('../api/admin.php?action=vouchers', {
    method: 'POST',
    body: JSON.stringify({ sub_action: 'delete', code })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể xóa mã Voucher!', 'error', 4000);
    return;
  }

  const db = window.SanBongApp?.SanBongDB;
  if (db) db.deleteVoucher(code);
  if (editingVoucherCode && editingVoucherCode.toUpperCase() === String(code).toUpperCase()) {
    cancelEditVoucher();
  }

  await renderAdminVouchers();
  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(r.message || `🗑️ Đã xóa mã giảm giá ${code}.`, 'info', 2500);
  }
}

window.renderAdminVouchers = renderAdminVouchers;
window.handleSaveVoucher = handleSaveVoucher;
window.handleCreateVoucher = handleCreateVoucher;
window.handleEditVoucher = handleEditVoucher;
window.cancelEditVoucher = cancelEditVoucher;
window.handleToggleVoucher = handleToggleVoucher;
window.handleDeleteVoucher = handleDeleteVoucher;
window.saveVoucher = typeof handleSaveVoucher === 'function' ? handleSaveVoucher : undefined;
window.deleteVoucher = typeof handleDeleteVoucher === 'function' ? handleDeleteVoucher : undefined;
window.toggleVoucherStatus = typeof handleToggleVoucher === 'function' ? handleToggleVoucher : undefined;

// =========================================================
// 5.4 QUY TẮC GIÁ GIỜ VÀNG / THẤP ĐIỂM (TAB 5)
// =========================================================
// [hoisted to admin.js]

function populateGoldenHourSlots() {
  const slotSel = document.getElementById('gh-slot-id');
  if (!slotSel) return;
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;
  const prev = slotSel.value;
  const slots = db.getTimeSlots();
  slotSel.innerHTML = `<option value="">Tất cả khung giờ</option>` + slots.map(s => (
    `<option value="${escapeSearchHTML(s.id)}">${escapeSearchHTML(s.time)} ${s.isPeak ? 'â˜… Cao điểm' : ''}</option>`
  )).join('');
  if (prev && Array.from(slotSel.options).some(o => o.value === prev)) {
    slotSel.value = prev;
  }
}

async function loadGoldenHourRules() {
  if (!isOwnerAdmin()) return;
  populateGoldenHourSlots();
  const tbody = document.getElementById('admin-golden-hours-tbody');
  if (!tbody) return;

  const r = await adminFetchJson('../api/admin.php?action=get_golden_hours');
  if (!r.ok || !Array.isArray(r.data)) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-5 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải quy tắc giờ vàng.')}</td></tr>`;
    return;
  }

  goldenHourRulesCache = r.data;
  if (r.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-[#94A3B8]">Chưa có quy tắc giá giờ vàng / thấp điểm nào.</td></tr>';
    return;
  }

  const dowMap = { '1': 'Thứ 2', '2': 'Thứ 3', '3': 'Thứ 4', '4': 'Thứ 5', '5': 'Thứ 6', '6': 'Thứ 7', '7': 'Chủ Nhật' };
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  tbody.innerHTML = r.data.map(rule => {
    const rid = Number(rule.id);
    const active = Number(rule.is_active) === 1 || rule.is_active === true;
    const pLabel = rule.pitch_type ? `Sân ${escapeSearchHTML(String(rule.pitch_type))} người` : 'Tất cả sân';
    const dLabel = rule.day_of_week ? (dowMap[String(rule.day_of_week)] || `Thứ ${escapeSearchHTML(String(rule.day_of_week))}`) : 'Mọi ngày';
    const sLabel = rule.slot_time || rule.slot_id ? `⏰ ${escapeSearchHTML(rule.slot_time || rule.slot_id)}` : 'Mọi khung giờ';

    let adjHtml = '';
    const adjType = rule.price_adjustment_type || 'fixed';
    const adjVal = Number(rule.adjustment_value || 0);
    if (adjType === 'percent_discount') {
      adjHtml = `<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Giảm ${adjVal}%</span>`;
    } else if (adjType === 'percent_surcharge') {
      adjHtml = `<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">Phụ thu +${adjVal}%</span>`;
    } else {
      adjHtml = `<span class="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-bold">Cố định ${escapeSearchHTML(fmt(adjVal))}</span>`;
    }

    const stBadge = active
      ? '<span class="px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#16A34A] text-[11px] font-bold">Đang áp dụng</span>'
      : '<span class="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[11px] font-bold">Tạm tắt</span>';

    return `<tr class="hover:bg-slate-50 ${active ? '' : 'opacity-65'}">
      <td class="py-3 px-4">
        <div class="font-bold text-[#0F172A]">${escapeSearchHTML(rule.rule_name || '')}</div>
        ${rule.description ? `<div class="text-[11px] text-[#64748B]">${escapeSearchHTML(rule.description)}</div>` : ''}
      </td>
      <td class="py-3 px-4 text-xs text-[#334155]">
        <span class="font-semibold">${pLabel}</span> · <span>${escapeSearchHTML(dLabel)}</span> · <span>${sLabel}</span>
      </td>
      <td class="py-3 px-4">${adjHtml}</td>
      <td class="py-3 px-4">${stBadge}</td>
      <td class="py-3 px-4 text-right whitespace-nowrap">
        <div class="inline-flex items-center gap-1.5">
          <button type="button" onclick="editGoldenHourRule(${rid})" class="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200 cursor-pointer">✏️ Sửa</button>
          <button type="button" onclick="deleteGoldenHourRule(${rid})" class="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[11px] border border-red-200 cursor-pointer">🗑️ Xóa</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}
window.loadGoldenHourRules = loadGoldenHourRules;

function editGoldenHourRule(id) {
  if (!isOwnerAdmin()) return;
  populateGoldenHourSlots();
  const rule = goldenHourRulesCache.find(x => Number(x.id) === Number(id));
  if (!rule) return;

  const setVal = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val; };
  setVal('gh-rule-id', String(rule.id));
  setVal('gh-rule-name', rule.rule_name || '');
  setVal('gh-pitch-type', rule.pitch_type ? String(rule.pitch_type) : '');
  setVal('gh-day-of-week', rule.day_of_week ? String(rule.day_of_week) : '');
  setVal('gh-slot-id', rule.slot_id || '');
  setVal('gh-adj-type', rule.price_adjustment_type || 'fixed');
  setVal('gh-adj-value', String(rule.adjustment_value || 0));
  setVal('gh-description', rule.description || '');
  const activeEl = document.getElementById('gh-is-active');
  if (activeEl) activeEl.checked = Number(rule.is_active) === 1 || rule.is_active === true;

  const cancelBtn = document.getElementById('gh-cancel-btn');
  const submitBtn = document.getElementById('gh-submit-btn');
  if (cancelBtn) cancelBtn.classList.remove('hidden');
  if (submitBtn) submitBtn.textContent = '💾 Lưu quy tắc giờ vàng';

  const formEl = document.getElementById('admin-golden-hour-form');
  if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
window.editGoldenHourRule = editGoldenHourRule;

function cancelEditGoldenHour() {
  const formEl = document.getElementById('admin-golden-hour-form');
  if (formEl && formEl.reset) formEl.reset();
  const idEl = document.getElementById('gh-rule-id');
  if (idEl) idEl.value = '';
  const activeEl = document.getElementById('gh-is-active');
  if (activeEl) activeEl.checked = true;
  const cancelBtn = document.getElementById('gh-cancel-btn');
  const submitBtn = document.getElementById('gh-submit-btn');
  if (cancelBtn) cancelBtn.classList.add('hidden');
  if (submitBtn) submitBtn.textContent = '+ Thêm quy tắc giờ vàng';
}
window.cancelEditGoldenHour = cancelEditGoldenHour;

async function saveGoldenHourRule(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!isOwnerAdmin()) return;

  const idVal = parseInt(document.getElementById('gh-rule-id')?.value || '0', 10) || 0;
  const ruleName = (document.getElementById('gh-rule-name')?.value || '').trim();
  const pitchType = (document.getElementById('gh-pitch-type')?.value || '').trim();
  const dayOfWeek = (document.getElementById('gh-day-of-week')?.value || '').trim();
  const slotId = (document.getElementById('gh-slot-id')?.value || '').trim();
  const adjType = document.getElementById('gh-adj-type')?.value || 'fixed';
  const adjValue = parseInt(document.getElementById('gh-adj-value')?.value || '0', 10) || 0;
  const description = (document.getElementById('gh-description')?.value || '').trim();
  const isActive = Boolean(document.getElementById('gh-is-active')?.checked ?? true);

  if (!ruleName || adjValue <= 0) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập tên quy tắc và giá trị điều chỉnh hợp lệ!', 'warning');
    return;
  }

  const submitBtn = document.getElementById('gh-submit-btn');
  const orig = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Đang lưu...';
  }
  try {
    const r = await adminFetchJson('../api/admin.php?action=save_golden_hour', {
      method: 'POST',
      body: JSON.stringify({
        id: idVal,
        rule_name: ruleName,
        pitch_type: pitchType,
        day_of_week: dayOfWeek,
        slot_id: slotId,
        price_adjustment_type: adjType,
        adjustment_value: adjValue,
        description,
        is_active: isActive ? 1 : 0
      })
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể lưu quy tắc giờ vàng!', 'error', 4000);
      return;
    }
    cancelEditGoldenHour();
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã lưu quy tắc giá giờ vàng!', 'success', 3500);
    await loadGoldenHourRules();
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = orig || '+ Thêm quy tắc giờ vàng';
    }
  }
}
window.saveGoldenHourRule = saveGoldenHourRule;

async function deleteGoldenHourRule(id) {
  if (!isOwnerAdmin()) return;
  const ok = await showAdminConfirm({
    title: 'Xóa quy tắc giá giờ vàng',
    message: `Bạn có chắc chắn muốn xóa quy tắc #${id}?`,
    confirmText: 'Xóa quy tắc',
    cancelText: 'Hủy',
    danger: true
  });
  if (!ok) return;

  const r = await adminFetchJson('../api/admin.php?action=delete_golden_hour', {
    method: 'POST',
    body: JSON.stringify({ id: Number(id) })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể xóa quy tắc giờ vàng!', 'error', 4000);
    return;
  }
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã xóa quy tắc giờ vàng!', 'success', 3000);
  await loadGoldenHourRules();
}
window.deleteGoldenHourRule = deleteGoldenHourRule;

