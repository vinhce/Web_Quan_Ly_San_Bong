// =========================================================
// 4. QUẢN LÝ MÃ GIẢM GIÁ / VOUCHER KHUYẾN MÃI (TAB 5)
// =========================================================
// [hoisted to admin.js]

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
      ? `${escapeSearchHTML(v.valid_from || '...')} → ${escapeSearchHTML(v.valid_to || '...')}`
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
    `<option value="${escapeSearchHTML(s.id)}">${escapeSearchHTML(s.time)} ${s.isPeak ? '★ Cao điểm' : ''}</option>`
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

// =========================================================
// 5. QUẢN LÝ TÀI KHOẢN NHÂN VIÊN TRỰC SÂN (TAB 9 - CHỦ SÂN)
// =========================================================
// [hoisted to admin.js]
// [hoisted to admin.js]

function getDefaultStaffList() {
  return [
    {
      id: 4,
      username: 'nhanvien',
      email: 'nhanvien@sanbongpro.vn',
      phone: '0352000111',
      full_name: 'Nhân Viên Trực Sân Ca 1',
      role: 'staff',
      status: 'active',
      created_at: '2026-11-10 08:00:00'
    }
  ];
}

function getLocalStaffUsers() {
  try {
    const raw = localStorage.getItem(STAFF_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return getDefaultStaffList();
}

function saveLocalStaffUsers(list) {
  try {
    localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(Array.isArray(list) ? list : []));
  } catch (e) {}
}

async function loadStaffUsers() {
  if (!isOwnerAdmin()) return;

  const r = await adminFetchJson('../api/admin.php?action=staff_users');
  if (r.ok && Array.isArray(r.data)) {
    cachedStaffUsers = r.data;
    saveLocalStaffUsers(cachedStaffUsers);
    renderStaffUsers(cachedStaffUsers);
    return;
  }

  if (r.status === 0) {
    cachedStaffUsers = getLocalStaffUsers();
    renderStaffUsers(cachedStaffUsers);
  } else if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(r.message || 'Không thể tải danh sách nhân sự!', 'error');
  }
}

function renderStaffUsers(list) {
  if (!isOwnerAdmin()) return;

  const staffList = Array.isArray(list) ? list : cachedStaffUsers;
  const countBadge = document.getElementById('staff-count-badge');
  if (countBadge) {
    countBadge.textContent = `${staffList.length} nhân sự`;
  }

  const tbody = document.getElementById('admin-staff-tbody');
  if (!tbody) return;

  const thEls = Array.from(tbody.closest('table')?.querySelectorAll('thead th') || []);
  const colCount = thEls.length || 5;
  const headerTexts = thEls.map(th => (th.textContent || '').trim().toLowerCase());
  const hasRoleCol = headerTexts.some(t => t.includes('vai trò'));

  if (staffList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="${colCount}" class="py-8 text-center text-xs text-[#64748B]">
          Chưa có tài khoản nhân sự nào. Hãy tạo tài khoản mới ở biểu mẫu phía trên.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = staffList.map(u => {
    const staffId = Number(u.id) || 0;
    const rawUsername = String(u.username || '');
    const safeJsUsername = rawUsername.replace(/[^a-zA-Z0-9_]/g, '');
    const safeUsername = escapeSearchHTML(rawUsername);
    const safeFullName = escapeSearchHTML(u.full_name || '');
    const safePhone = escapeSearchHTML(u.phone || '');
    const safeEmail = escapeSearchHTML(u.email || `${rawUsername.toLowerCase()}@sanbongpro.vn`);
    const uRole = String(u.role || 'staff').toLowerCase() === 'manager' ? 'manager' : 'staff';
    const isLocked = (u.status || 'active') === 'locked';

    const roleBadge = uRole === 'manager'
      ? '<span class="px-2 py-0.5 rounded-full bg-purple-100 text-[#7C3AED] border border-purple-200 text-[10px] font-bold whitespace-nowrap">🛡️ Manager</span>'
      : '<span class="px-2 py-0.5 rounded-full bg-blue-100 text-[#2563EB] border border-blue-200 text-[10px] font-bold whitespace-nowrap">🏟️ Staff</span>';

    const roleCellHtml = `
      <div class="space-y-1">
        <div>${roleBadge}</div>
        <select onchange="handleChangeStaffRole(${staffId}, this.value)" aria-label="Đổi vai trò nhân sự" class="h-7 px-2 rounded-md border border-slate-200 bg-white text-[11px] font-semibold text-[#0F172A] cursor-pointer">
          <option value="staff" ${uRole === 'staff' ? 'selected' : ''}>Staff (Trực ca)</option>
          <option value="manager" ${uRole === 'manager' ? 'selected' : ''}>Manager (Quản lý)</option>
        </select>
      </div>
    `;

    const statusBadge = isLocked
      ? '<span class="px-2.5 py-0.5 rounded-full bg-red-100 text-[#DC2626] text-[11px] font-bold whitespace-nowrap">Đã khóa</span>'
      : '<span class="px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#16A34A] text-[11px] font-bold whitespace-nowrap">Đang hoạt động</span>';

    const toggleBtnLabel = isLocked ? '🔓 Mở khóa' : '🔒 Khóa';
    const toggleBtnClass = isLocked
      ? 'px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] border border-emerald-200 cursor-pointer whitespace-nowrap'
      : 'px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[11px] border border-red-200 cursor-pointer whitespace-nowrap';

    const actionHtml = `
      <div class="inline-flex items-center justify-end gap-1.5 flex-wrap">
        <button type="button" onclick="openResetStaffPwModal(${staffId}, '${safeJsUsername}')" class="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200 cursor-pointer whitespace-nowrap">🔑 Đổi MK</button>
        <button type="button" onclick="handleToggleStaffStatus(${staffId})" class="${toggleBtnClass}">${toggleBtnLabel}</button>
      </div>
    `;

    if (colCount === 5 && hasRoleCol) {
      return `
        <tr class="hover:bg-slate-50 transition-colors ${isLocked ? 'opacity-70 bg-rose-50/30' : ''}">
          <td class="py-3 px-4">
            <div class="font-mono font-bold text-[#0F172A]">@${safeUsername}</div>
            <div class="text-[11px] text-[#64748B]">${safeEmail}</div>
          </td>
          <td class="py-3 px-4">
            <div class="font-bold text-[#0F172A]">${safeFullName}</div>
            <div class="font-mono text-[11px] text-[#475569]">${safePhone}</div>
          </td>
          <td class="py-3 px-4">${roleCellHtml}</td>
          <td class="py-3 px-4">${statusBadge}</td>
          <td class="py-3 px-4 text-right">${actionHtml}</td>
        </tr>
      `;
    }

    return `
      <tr class="hover:bg-slate-50 transition-colors ${isLocked ? 'opacity-70 bg-rose-50/30' : ''}">
        <td class="py-3 px-4">
          <div class="font-mono font-bold text-[#0F172A]">@${safeUsername}</div>
          <div class="text-[11px] text-[#64748B]">${safeEmail}</div>
        </td>
        <td class="py-3 px-4">
          <div class="font-bold text-[#0F172A]">${safeFullName}</div>
          <div class="font-mono text-[11px] text-[#475569]">${safePhone}</div>
          <div class="mt-1">${roleBadge}</div>
        </td>
        <td class="py-3 px-4">${statusBadge}</td>
        <td class="py-3 px-4 text-right">${actionHtml}</td>
      </tr>
    `;
  }).join('');
}

async function handleCreateStaff(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!isOwnerAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Chủ sân mới có quyền tạo tài khoản nhân sự!', 'error');
    return;
  }

  const form = (e && e.target && e.target.tagName === 'FORM') ? e.target : (document.getElementById('admin-create-staff-form') || document.getElementById('staff-create-form'));
  const usernameEl = document.getElementById('staff-username') || document.getElementById('new-staff-username') || form?.querySelector('[name="username"]');
  const fullNameEl = document.getElementById('staff-fullname') || document.getElementById('staff-full-name') || document.getElementById('new-staff-fullname') || document.getElementById('staff-name') || form?.querySelector('[name="full_name"], [name="fullname"]');
  const phoneEl = document.getElementById('staff-phone') || document.getElementById('new-staff-phone') || form?.querySelector('[name="phone"]');
  const passwordEl = document.getElementById('staff-password') || document.getElementById('new-staff-password') || document.getElementById('staff-pw') || form?.querySelector('[name="password"]');
  const roleEl = document.getElementById('staff-role') || form?.querySelector('[name="role"]');
  const submitBtn = document.getElementById('staff-create-submit-btn') || document.getElementById('staff-create-btn') || document.getElementById('staff-submit-btn') || form?.querySelector('button[type="submit"]');

  const username = (usernameEl?.value || '').trim();
  const fullName = (fullNameEl?.value || '').trim();
  const phone = (phoneEl?.value || '').replace(/\s+/g, '');
  const password = String(passwordEl?.value || '');
  const role = (roleEl?.value === 'manager') ? 'manager' : 'staff';

  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Tên đăng nhập phải từ 3–30 ký tự (chữ cái, số, dấu gạch dưới _).', 'warning');
    return;
  }
  if (!fullName) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập họ và tên nhân sự.', 'warning');
    return;
  }
  if (!/^(0[3|5|7|8|9])[0-9]{8}$/.test(phone)) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Số điện thoại nhân sự phải đủ 10 số di động Việt Nam.', 'warning');
    return;
  }
  if (password.length < 6) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Mật khẩu nhân sự phải có tối thiểu 6 ký tự.', 'warning');
    return;
  }

  const origText = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Đang tạo tài khoản...';
  }

  try {
    const r = await adminFetchJson('../api/admin.php?action=staff_users', {
      method: 'POST',
      body: JSON.stringify({
        sub_action: 'create',
        username,
        full_name: fullName,
        phone,
        password,
        role
      })
    });

    if (r.ok) {
      if (form && typeof form.reset === 'function') form.reset();
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(`✓ ${r.message || 'Đã tạo tài khoản nhân sự thành công!'}`, 'success', 3500);
      }
      await loadStaffUsers();
      return;
    }

    if (r.status > 0) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(r.message || 'Không thể tạo tài khoản nhân sự.', 'error', 3500);
      }
      return;
    }

    // Offline network fallback (status === 0)
    const localList = getLocalStaffUsers();
    if (localList.some(u => String(u.username || '').toLowerCase() === username.toLowerCase())) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast('Tên đăng nhập này đã tồn tại trên hệ thống.', 'error');
      }
      return;
    }
    const newStaff = {
      id: Date.now(),
      username,
      email: `${username.toLowerCase()}@sanbongpro.vn`,
      phone,
      full_name: fullName,
      role,
      status: 'active',
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };
    localList.unshift(newStaff);
    saveLocalStaffUsers(localList);
    cachedStaffUsers = localList;
    renderStaffUsers(cachedStaffUsers);
    if (form && typeof form.reset === 'function') form.reset();
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(`✓ Đã tạo tài khoản ${role === 'manager' ? 'Quản lý sân' : 'Nhân viên trực'} ${username} (offline)!`, 'success', 3500);
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origText;
    }
  }
}

async function handleChangeStaffRole(userId, newRole) {
  if (!isOwnerAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Chủ sân mới có quyền đổi vai trò nhân sự!', 'error');
    return;
  }

  const staffId = Number(userId);
  const role = (newRole === 'manager') ? 'manager' : 'staff';
  if (!staffId) return;

  const r = await adminFetchJson('../api/admin.php?action=staff_users', {
    method: 'POST',
    body: JSON.stringify({ sub_action: 'update_role', id: staffId, role })
  });

  if (r.ok) {
    const localList = cachedStaffUsers.length > 0 ? [...cachedStaffUsers] : getLocalStaffUsers();
    const target = localList.find(u => Number(u.id) === staffId);
    if (target) {
      target.role = role;
      saveLocalStaffUsers(localList);
    }
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(`✓ ${r.message || 'Đã cập nhật vai trò nhân sự thành công!'}`, 'success', 3000);
    }
    await loadStaffUsers();
    return;
  }

  if (r.status > 0) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể cập nhật vai trò nhân sự.', 'error');
    }
    renderStaffUsers(cachedStaffUsers);
    return;
  }

  const localList = cachedStaffUsers.length > 0 ? [...cachedStaffUsers] : getLocalStaffUsers();
  const target = localList.find(u => Number(u.id) === staffId);
  if (target) {
    target.role = role;
    saveLocalStaffUsers(localList);
    cachedStaffUsers = localList;
    renderStaffUsers(cachedStaffUsers);
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(
        `✓ Đã chuyển vai trò @${target.username} sang ${role === 'manager' ? 'Quản lý sân (Manager)' : 'Nhân viên trực (Staff)'}.`,
        'success',
        3000
      );
    }
  }
}
window.handleChangeStaffRole = handleChangeStaffRole;

async function handleToggleStaffStatus(id) {
  if (!isOwnerAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Chủ sân mới có quyền khóa/mở khóa nhân viên!', 'error');
    return;
  }

  const staffId = Number(id);
  if (!staffId) return;

  const r = await adminFetchJson('../api/admin.php?action=staff_users', {
    method: 'POST',
    body: JSON.stringify({ sub_action: 'toggle_status', id: staffId })
  });

  if (r.ok) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(`✓ ${r.message || 'Đã cập nhật trạng thái nhân viên.'}`, 'success', 3000);
    }
    await loadStaffUsers();
    return;
  }

  if (r.status > 0) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể cập nhật trạng thái nhân viên.', 'error');
    }
    return;
  }

  const localList = cachedStaffUsers.length > 0 ? [...cachedStaffUsers] : getLocalStaffUsers();
  const target = localList.find(u => Number(u.id) === staffId);
  if (target) {
    target.status = target.status === 'locked' ? 'active' : 'locked';
    saveLocalStaffUsers(localList);
    cachedStaffUsers = localList;
    renderStaffUsers(cachedStaffUsers);
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(
        target.status === 'locked'
          ? `🔒 Đã khóa tài khoản nhân viên ${target.username}.`
          : `🔓 Đã mở khóa tài khoản nhân viên ${target.username}.`,
        'info',
        3000
      );
    }
  }
}

function openResetStaffPwModal(id, username) {
  if (!isOwnerAdmin()) return;

  const modal = document.getElementById('staff-reset-pw-modal');
  const idEl = document.getElementById('reset-staff-id');
  const labelEl = document.getElementById('reset-staff-username-label');
  const pwEl = document.getElementById('reset-staff-new-pw');

  if (idEl) idEl.value = String(id || '');
  if (labelEl) labelEl.textContent = username || '';
  if (pwEl) pwEl.value = '';

  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (pwEl) setTimeout(() => pwEl.focus(), 100);
  }
}

function closeResetStaffPwModal() {
  const modal = document.getElementById('staff-reset-pw-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

async function submitResetStaffPassword(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!isOwnerAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Chủ sân mới có quyền đặt lại mật khẩu nhân viên!', 'error');
    return;
  }

  const form = (e && e.target && e.target.tagName === 'FORM') ? e.target : document.getElementById('staff-reset-pw-modal')?.querySelector('form');
  const id = Number(document.getElementById('reset-staff-id')?.value || '0');
  const password = String(document.getElementById('reset-staff-new-pw')?.value || '');
  const submitBtn = document.getElementById('reset-staff-submit-btn') || form?.querySelector('button[type="submit"]');

  if (!id) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Không xác định được tài khoản nhân viên.', 'error');
    return;
  }
  if (password.length < 6) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Mật khẩu mới phải có tối thiểu 6 ký tự!', 'warning');
    return;
  }

  const origText = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Đang cập nhật...';
  }

  try {
    const r = await adminFetchJson('../api/admin.php?action=staff_users', {
      method: 'POST',
      body: JSON.stringify({ sub_action: 'reset_password', id, password })
    });

    if (r.ok) {
      closeResetStaffPwModal();
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(`✓ ${r.message || 'Đã đặt lại mật khẩu nhân viên thành công!'}`, 'success', 3500);
      }
      return;
    }

    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể đặt lại mật khẩu nhân viên.', 'error');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origText;
    }
  }
}

window.loadStaffUsers = loadStaffUsers;
window.renderStaffUsers = renderStaffUsers;
window.handleCreateStaff = handleCreateStaff;
window.handleToggleStaffStatus = handleToggleStaffStatus;
window.openResetStaffPwModal = openResetStaffPwModal;
window.closeResetStaffPwModal = closeResetStaffPwModal;
window.submitResetStaffPassword = submitResetStaffPassword;

// =========================================================
// MỤC 3.1: KHO NƯỚC & BÁN LẺ DỊCH VỤ TẠI QUẦY (POS INVENTORY)
// =========================================================
function updatePosSalePreview() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;
  const selEl = document.getElementById('pos-service-select');
  const qtyEl = document.getElementById('pos-service-qty');
  const totalEl = document.getElementById('pos-preview-total');
  const stockEl = document.getElementById('pos-preview-stock');
  if (!selEl) return;

  const srvId = selEl.value;
  const qty = Math.max(1, parseInt(qtyEl?.value || '1', 10) || 1);
  const srv = db.getServices().find(s => s.id === srvId);
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  if (srv) {
    const stock = Number(srv.stockQty ?? 50);
    const lineTotal = Number(srv.price || 0) * qty;
    if (totalEl) totalEl.textContent = fmt(lineTotal);
    const linePreviewEl = document.getElementById('pos-sale-line-preview');
    if (linePreviewEl) linePreviewEl.textContent = `Thành tiền: ${fmt(lineTotal)}`;
    if (stockEl) {
      stockEl.textContent = `${stock} ${srv.unit || ''}`;
      stockEl.className = stock <= Number(srv.minStockWarning ?? 10)
        ? 'font-bold text-red-600'
        : 'font-bold text-slate-700';
    }
  }
}
window.updatePosSalePreview = updatePosSalePreview;

function renderAdminInventory() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const services = db.getServices();
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  const openSrvBtn = document.getElementById('btn-open-service-modal');
  if (openSrvBtn) {
    openSrvBtn.classList.toggle('hidden', !isManagerOrAdmin());
  }

  // 1. Cập nhật banner cảnh báo sắp hết hàng
  const lowItems = services.filter(s => Number(s.stockQty ?? 50) <= Number(s.minStockWarning ?? 10));
  const lowBanner = document.getElementById('inventory-low-stock-banner');
  const lowText = document.getElementById('inventory-low-stock-text');
  if (lowBanner) {
    if (lowItems.length > 0) {
      const names = lowItems.map(i => `${i.name} (còn ${Number(i.stockQty ?? 0)} ${i.unit || ''})`).join(', ');
      if (lowText) {
        lowText.textContent = `CẢNH BÁO TỒN KHO THẤP: Có ${lowItems.length} mặt hàng chạm ngưỡng sắp hết (${names})! Vui lòng nhập thêm kho.`;
      }
      lowBanner.classList.remove('hidden');
      lowBanner.classList.add('flex');
    } else {
      lowBanner.classList.add('hidden');
      lowBanner.classList.remove('flex');
    }
  }

  // 2. Cập nhật dropdown POS
  const posSelect = document.getElementById('pos-service-select');
  if (posSelect) {
    const prevVal = posSelect.value;
    posSelect.innerHTML = services.map(s => {
      const st = Number(s.stockQty ?? 50);
      return `<option value="${escapeSearchHTML(s.id)}" ${st <= 0 ? 'disabled' : ''}>${escapeSearchHTML(s.name)} — ${escapeSearchHTML(fmt(s.price))}/${escapeSearchHTML(s.unit || 'cái')} (Tồn: ${st})</option>`;
    }).join('');
    if (prevVal && services.some(s => s.id === prevVal)) {
      posSelect.value = prevVal;
    }
    if (!posSelect._boundPreview) {
      posSelect._boundPreview = true;
      posSelect.addEventListener('change', updatePosSalePreview);
      const qtyEl = document.getElementById('pos-service-qty');
      if (qtyEl) qtyEl.addEventListener('input', updatePosSalePreview);
    }
    updatePosSalePreview();
  }

  // 3. Render bảng tồn kho
  const tbody = document.getElementById('admin-inventory-tbody');
  if (!tbody) return;

  tbody.innerHTML = services.map(s => {
    const stock = Number(s.stockQty ?? 50);
    const minW = Number(s.minStockWarning ?? 10);
    const isLow = stock <= minW;
    const safeSrvIdAttr = escapeJsAttr(s.id);

    const stockBadge = isLow
      ? `<span class="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700 border border-red-300">⚠️ Sắp hết</span>`
      : `<span class="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">✓ Đủ hàng</span>`;

    return `
      <tr class="hover:bg-slate-50 transition-colors ${isLow ? 'bg-red-50/30' : ''}">
        <td class="py-2.5 px-3 font-bold text-[#0F172A]">
          ${escapeSearchHTML(s.name)}
          <span class="text-[10px] font-mono text-slate-400 ml-1">(${escapeSearchHTML(s.id)})</span>
        </td>
        <td class="py-2.5 px-3 font-extrabold text-[#16A34A]">
          ${escapeSearchHTML(fmt(s.price))} <span class="text-[11px] font-normal text-slate-500">/ ${escapeSearchHTML(s.unit || 'đơn vị')}</span>
        </td>
        <td class="py-2.5 px-3 text-center">
          <span class="font-mono font-extrabold text-sm ${isLow ? 'text-red-600' : 'text-[#0F172A]'}">${stock}</span>
          <span class="text-[11px] text-slate-500">${escapeSearchHTML(s.unit || '')}</span>
          ${stockBadge}
        </td>
        <td class="py-2.5 px-3 text-center font-mono text-xs text-slate-500">
          ≤ ${minW} ${escapeSearchHTML(s.unit || '')}
        </td>
        <td class="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
          ${isManagerOrAdmin() ? `
            <button type="button" onclick="promptRestockService('${safeSrvIdAttr}')" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs cursor-pointer">
              + Nhập kho
            </button>
            <button type="button" onclick="openServiceModal('${safeSrvIdAttr}')" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#0F172A] border border-slate-300 font-bold text-[11px] cursor-pointer">
              ✏️ Sửa
            </button>
            <button type="button" onclick="handleDeleteService('${safeSrvIdAttr}')" class="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-[11px] cursor-pointer" title="Ngừng kinh doanh">
              🗑️
            </button>
          ` : `
            <span class="text-[11px] text-slate-400 italic">Chỉ xem</span>
          `}
        </td>
      </tr>
    `;
  }).join('');
}
window.renderAdminInventory = renderAdminInventory;

// [hoisted to admin.js]

async function handleCounterServiceSale(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (isPosSaleSubmitting) return;

  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const srvId = document.getElementById('pos-service-select')?.value || '';
  const qty = Math.max(1, parseInt(document.getElementById('pos-service-qty')?.value || '1', 10) || 1);
  const payMethod = document.getElementById('pos-pay-method')?.value || 'Tiền mặt tại quầy';
  const note = (document.getElementById('pos-sale-note')?.value || '').trim();

  const srv = db.getServices().find(s => s.id === srvId);
  if (!srv) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng chọn dịch vụ cần bán!', 'warning');
    return;
  }

  if (Number(srv.stockQty ?? 50) < qty) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(`⚠️ Tồn kho ${srv.name} chỉ còn ${srv.stockQty} ${srv.unit}, không đủ xuất ${qty}! Hãy nhập thêm kho.`, 'error', 4000);
    }
    return;
  }

  const form = e?.target && e.target.tagName === 'FORM' ? e.target : document.getElementById('pos-service-select')?.closest('form');
  const submitBtn = e?.submitter || document.getElementById('pos-sale-submit-btn') || form?.querySelector('button[type="submit"]');
  const origBtnHtml = submitBtn ? submitBtn.innerHTML : '';

  isPosSaleSubmitting = true;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Đang xuất kho...';
  }

  try {
    const r = await adminFetchJson('../api/admin.php?action=inventory', {
      method: 'POST',
      body: JSON.stringify({
        sub_action: 'sell_counter',
        service_id: srvId,
        service_name: srv.name,
        quantity: qty,
        unit_price: srv.price,
        payment_method: payMethod,
        note: note
      })
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(r.message || 'Không thể bán dịch vụ (kiểm tra lại tồn kho)!', 'error', 4000);
      }
      return;
    }

    const sale = db.recordCounterSale({
      serviceId: srvId,
      quantity: qty,
      payMethod: payMethod,
      note: note
    });

    if (sale) {
      const noteEl = document.getElementById('pos-sale-note');
      const qtyEl = document.getElementById('pos-service-qty');
      if (noteEl) noteEl.value = '';
      if (qtyEl) qtyEl.value = '1';
      renderAdminInventory();
      loadShiftHandovers();
      renderOverviewKPIs();
      if (isManagerOrAdmin()) renderAdminReports();

      const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(r.message || `💰 Đã bán ${qty}x ${sale.serviceName} (${fmt(sale.totalAmount)} - ${payMethod}) & trừ tồn kho!`, 'success', 3500);
      }
    }
  } finally {
    isPosSaleSubmitting = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origBtnHtml;
    }
  }
}
window.handleCounterServiceSale = handleCounterServiceSale;

async function promptRestockService(serviceId) {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền nhập kho hàng!', 'error');
    return;
  }
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;
  const srv = db.getServices().find(s => s.id === serviceId);
  if (!srv) return;

  const rawQty = await showAdminPrompt({
    title: `📦 Nhập thêm kho: ${srv.name}`,
    message: `• Tồn kho hiện tại: ${Number(srv.stockQty ?? 0)} ${srv.unit || ''}\n• Nhập số lượng thêm vào kho (ví dụ: 24 hoặc 48):`,
    placeholder: 'VD: 24',
    defaultValue: '24',
    inputType: 'number',
    confirmText: 'Nhập kho',
    cancelText: 'Hủy'
  });
  if (rawQty === null) return;
  const added = parseInt(String(rawQty).replace(/[^\d]/g, ''), 10);
  if (!added || added <= 0) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Số lượng nhập kho phải lớn hơn 0!', 'warning');
    return;
  }

  const r = await adminFetchJson('../api/admin.php?action=inventory', {
    method: 'POST',
    body: JSON.stringify({ sub_action: 'restock', id: serviceId, add_qty: added, added_qty: added })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể nhập thêm kho hàng!', 'error', 4000);
    return;
  }

  const updated = db.restockService(serviceId, added);
  renderAdminInventory();
  if (isOwnerAdmin() && typeof loadAuditLogs === 'function') loadAuditLogs();

  if (updated && window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(`📦 Đã nhập thêm +${added} ${updated.unit} cho "${updated.name}". Tồn kho mới: ${updated.stockQty} ${updated.unit}!`, 'success', 3500);
  }
}
window.promptRestockService = promptRestockService;

function openServiceModal(serviceId = '') {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền thêm/sửa dịch vụ!', 'error');
    return;
  }
  const modal = document.getElementById('service-crud-modal');
  if (!modal) return;

  const db = window.SanBongApp?.SanBongDB;
  const srv = (serviceId && db) ? db.getServices().find(s => s.id === serviceId) : null;

  const titleEl = document.getElementById('service-modal-title');
  const idEl = document.getElementById('srv-form-id');
  const nameEl = document.getElementById('srv-form-name');
  const priceEl = document.getElementById('srv-form-price');
  const unitEl = document.getElementById('srv-form-unit');
  const stockEl = document.getElementById('srv-form-stock');
  const minEl = document.getElementById('srv-form-min-stock');

  if (srv) {
    if (titleEl) titleEl.textContent = `✏️ Chỉnh sửa dịch vụ: ${srv.name}`;
    if (idEl) idEl.value = srv.id;
    if (nameEl) nameEl.value = srv.name || '';
    if (priceEl) priceEl.value = Number(srv.price || 10000);
    if (unitEl) unitEl.value = srv.unit || 'chai';
    if (stockEl) stockEl.value = Number(srv.stockQty ?? 50);
    if (minEl) minEl.value = Number(srv.minStockWarning ?? 10);
  } else {
    if (titleEl) titleEl.textContent = '➕ Thêm mặt hàng / Dịch vụ mới vào kho';
    if (idEl) idEl.value = '';
    if (nameEl) nameEl.value = '';
    if (priceEl) priceEl.value = 15000;
    if (unitEl) unitEl.value = 'chai';
    if (stockEl) stockEl.value = 48;
    if (minEl) minEl.value = 10;
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}
window.openServiceModal = openServiceModal;

function closeServiceModal() {
  const modal = document.getElementById('service-crud-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}
window.closeServiceModal = closeServiceModal;

async function saveServiceModal(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền lưu dịch vụ!', 'error');
    return;
  }
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const id = (document.getElementById('srv-form-id')?.value || '').trim();
  const name = (document.getElementById('srv-form-name')?.value || '').trim();
  const price = Math.max(0, parseInt(document.getElementById('srv-form-price')?.value || '0', 10));
  const unit = (document.getElementById('srv-form-unit')?.value || 'đơn vị').trim();
  const stockQty = Math.max(0, parseInt(document.getElementById('srv-form-stock')?.value || '0', 10));
  const minStockWarning = Math.max(0, parseInt(document.getElementById('srv-form-min-stock')?.value || '5', 10));

  if (!name) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập tên dịch vụ!', 'warning');
    return;
  }

  const payload = {
    id: id || undefined,
    name,
    price,
    unit,
    stock_qty: stockQty,
    min_stock_warning: minStockWarning,
    stockQty,
    minStockWarning
  };

  const r = await adminFetchJson('../api/admin.php?action=inventory', {
    method: 'POST',
    body: JSON.stringify(Object.assign({ sub_action: 'save_service' }, payload))
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể lưu mặt hàng dịch vụ!', 'error', 4000);
    return;
  }

  db.saveServiceItem(payload);
  closeServiceModal();
  renderAdminInventory();

  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(`✓ Đã lưu mặt hàng "${name}" vào danh mục kho dịch vụ!`, 'success', 3000);
  }
}
window.saveServiceModal = saveServiceModal;

async function handleDeleteService(serviceId) {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền xóa dịch vụ!', 'error');
    return;
  }
  const db = window.SanBongApp?.SanBongDB;
  const srv = db ? db.getServices().find(s => s.id === serviceId) : null;
  if (!srv) return;
  const ok = await showAdminConfirm({
    title: 'Ngừng kinh doanh dịch vụ',
    message: `Ngừng kinh doanh dịch vụ "${srv.name}" (${srv.id})?`,
    confirmText: 'Ngừng kinh doanh',
    cancelText: 'Giữ lại',
    danger: true
  });
  if (!ok) return;

  const r = await adminFetchJson('../api/admin.php?action=inventory', {
    method: 'POST',
    body: JSON.stringify({ sub_action: 'delete_service', id: serviceId })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể ngừng kinh doanh dịch vụ!', 'error', 4000);
    return;
  }

  if (db && typeof db.deleteServiceItem === 'function') {
    db.deleteServiceItem(serviceId);
  }
  renderAdminInventory();
  if (isOwnerAdmin() && typeof loadAuditLogs === 'function') loadAuditLogs();
  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(`🗑️ Đã ngừng kinh doanh dịch vụ "${srv.name}".`, 'info', 3000);
  }
}
window.handleDeleteService = handleDeleteService;

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
  if (shiftRes.ok && shiftRes.data) {
    const cur = shiftRes.data.activeShift || shiftRes.data.currentShift;
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
        <td colspan="9" class="py-8 text-center text-xs text-[#64748B]">
          Chưa có lịch sử chốt ca nào được ghi nhận.
        </td>
      </tr>
    `;
    return;
  }

  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  tbody.innerHTML = shifts.map(sh => {
    const id = sh.id || sh.shift_code || `CA-${sh.shift_id || ''}`;
    const staffName = sh.staffName || sh.staff_name || sh.staffUsername || 'Nhân viên trực';
    const startT = sh.startTime || sh.start_time || '';
    const endT = sh.endTime || sh.end_time || 'Đang mở';
    const cashDeclared = Number(sh.cashDeclared ?? sh.cash_total ?? 0);
    const transferTotal = Number(sh.transferTotal ?? sh.transfer_total ?? 0);
    const actualRaw = sh.actual_cash_received ?? sh.cashActual ?? sh.actual_cash;
    const hasConfirmed = actualRaw !== null && actualRaw !== undefined && String(sh.status || '') === 'confirmed';
    const cashActual = hasConfirmed ? Number(actualRaw) : null;
    const diff = hasConfirmed ? Number(sh.discrepancy_amount ?? sh.diff ?? (cashActual - cashDeclared)) : null;

    let diffHtml = '<span class="text-slate-400 italic">Chờ đối soát</span>';
    if (hasConfirmed) {
      if (diff === 0) {
        diffHtml = `<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-extrabold text-[11px] border border-emerald-300">✓ Khớp 0đ</span>`;
      } else if (diff < 0) {
        diffHtml = `<span class="px-2 py-0.5 rounded bg-red-100 text-red-700 font-extrabold text-[11px] border border-red-300">Thiếu ${fmt(diff)}</span>`;
      } else {
        diffHtml = `<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-extrabold text-[11px] border border-amber-300">Thừa +${fmt(diff)}</span>`;
      }
    }

    const stRaw = String(sh.status || 'closed').toLowerCase();
    let statusBadge = '';
    if (stRaw === 'open' || stRaw === 'đang mở') {
      statusBadge = '<span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px]">Đang mở</span>';
    } else if (stRaw === 'confirmed' || stRaw === 'đã xác nhận') {
      statusBadge = '<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">✓ Đã xác nhận</span>';
    } else {
      statusBadge = '<span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">⏳ Chờ đối soát</span>';
    }

    const actionHtml = isManagerOrAdmin()
      ? `<button type="button" onclick="handleConfirmShift('${escapeJsAttr(String(id))}', ${cashDeclared})" class="px-2.5 py-1 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-[11px] shadow-2xs cursor-pointer">
           ✅ Đối soát tiền mặt
         </button>`
      : `<span class="text-[11px] text-slate-400">${hasConfirmed ? 'Đã duyệt' : 'Chờ Quản lý'}</span>`;

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="py-2.5 px-3 font-mono font-bold text-[#0F172A]">${escapeSearchHTML(String(id))}</td>
        <td class="py-2.5 px-3 font-semibold text-[#0F172A]">${escapeSearchHTML(staffName)}</td>
        <td class="py-2.5 px-3 text-[11px] text-slate-600">
          <div>Mở: <b>${escapeSearchHTML(startT)}</b></div>
          <div>Chốt: <b>${escapeSearchHTML(endT)}</b></div>
        </td>
        <td class="py-2.5 px-3 text-right font-extrabold text-emerald-700">${fmt(cashDeclared)}</td>
        <td class="py-2.5 px-3 text-right font-bold text-blue-700">${fmt(transferTotal)}</td>
        <td class="py-2.5 px-3 text-right font-extrabold text-[#0F172A]">
          ${hasConfirmed ? fmt(cashActual) : '<span class="text-slate-400 font-normal">---</span>'}
        </td>
        <td class="py-2.5 px-3 text-center">${diffHtml}</td>
        <td class="py-2.5 px-3 text-center">${statusBadge}</td>
        <td class="py-2.5 px-3 text-right">${actionHtml}</td>
      </tr>
    `;
  }).join('');
}
window.loadShiftHandovers = loadShiftHandovers;

async function handleCloseShift() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const stats = db.getCurrentShiftStats();
  const noteEl = document.getElementById('shift-close-note');
  const note = (noteEl?.value || '').trim();
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  const confirmMsg =
    `🔒 XÁC NHẬN CHỐT CA & BÀN GIAO KÉT TIỀN MẶT:\n` +
    `• Ca mở lúc: ${stats.startTime}\n` +
    `• Tổng tiền mặt phải bàn giao: ${fmt(stats.cashTotal)}\n` +
    `• Tổng chuyển khoản VietQR trong ca: ${fmt(stats.transferTotal)}\n` +
    `• Ghi chú: ${note || 'Bàn giao đủ tiền mặt cuối ca'}\n\n` +
    `Bạn có chắc chắn muốn chốt ca trực này?`;

  const ok = await showAdminConfirm({
    title: '🔒 Xác nhận chốt ca & bàn giao két tiền mặt',
    message: confirmMsg,
    confirmText: 'Chốt ca ngay',
    cancelText: 'Quay lại'
  });
  if (!ok) return;

  const r = await adminFetchJson('../api/admin.php?action=shifts', {
    method: 'POST',
    body: JSON.stringify({
      sub_action: 'close_shift',
      cash_total: stats.cashTotal,
      cash_declared: stats.cashTotal,
      transfer_total: stats.transferTotal,
      transfer_declared: stats.transferTotal,
      note: note
    })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể chốt ca trực!', 'error', 4000);
    return;
  }

  const closedShift = db.closeShift(note);
  if (noteEl) noteEl.value = '';
  await loadShiftHandovers();
  if (isOwnerAdmin() && typeof loadAuditLogs === 'function') loadAuditLogs();

  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(r.message || `🔒 Đã chốt ca #${closedShift.id} thành công! Tiền mặt bàn giao: ${fmt(closedShift.cashDeclared)}.`, 'success', 4000);
  }
}
window.handleCloseShift = handleCloseShift;

async function handleConfirmShift(shiftId, cashDeclared = 0) {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền đối soát và xác nhận tiền mặt bàn giao ca!', 'error');
    return;
  }

  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');
  const rawInput = await showAdminPrompt({
    title: `✅ Đối soát tiền mặt bàn giao ca (${shiftId})`,
    message: `• Tiền mặt hệ thống ghi nhận trong ca: ${fmt(cashDeclared)}\n• Nhập số tiền mặt THỰC NHẬN từ nhân viên (VNĐ):`,
    placeholder: 'VD: 1500000',
    defaultValue: String(cashDeclared || 0),
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

  const diff = actualCash - Number(cashDeclared || 0);
  const diffLabel = diff === 0 ? 'Khớp 0đ' : (diff < 0 ? `Thiếu ${fmt(diff)}` : `Thừa +${fmt(diff)}`);

  const r = await adminFetchJson('../api/admin.php?action=shifts', {
    method: 'POST',
    body: JSON.stringify({
      sub_action: 'confirm_shift',
      shift_id: shiftId,
      actual_cash_received: actualCash,
      actual_cash: actualCash
    })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể xác nhận đối soát ca!', 'error', 4000);
    return;
  }

  const db = window.SanBongApp?.SanBongDB;
  if (db && typeof db.confirmShift === 'function') {
    db.confirmShift(shiftId, actualCash, `Đối soát: ${diffLabel}`);
  }

  await loadShiftHandovers();
  if (typeof loadAuditLogs === 'function') loadAuditLogs();

  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(r.message || `✅ Đã đối soát ca ${shiftId}: Thực nhận ${fmt(actualCash)} (${diffLabel})!`, diff < 0 ? 'warning' : 'success', 4000);
  }
}
window.handleConfirmShift = handleConfirmShift;

// =========================================================
// MỤC 2.1: NHẬT KÝ KIỂM TOÁN HỆ THỐNG (AUDIT LOG - CHỐNG THẤT THOÁT)
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

  // Populate dropdown nhân sự (#audit-filter-user) dùng ID số thực trong DB
  const userSelect = document.getElementById('audit-filter-user');
  if (userSelect) {
    const prevU = userSelect.value;
    const roleShortLabel = {
      admin: 'Chủ sân',
      manager: 'Quản lý sân',
      staff: 'Nhân viên'
    };
    let optionsHtml = '<option value="">👤 Tất cả nhân sự</option>';
    if (serverStaffList.length > 0) {
      optionsHtml += serverStaffList.map(u => {
        const uid = String(u.id ?? '').trim();
        if (!uid) return '';
        const name = u.full_name || u.username || `ID #${uid}`;
        const uname = u.username ? ` (${u.username})` : '';
        const rLabel = roleShortLabel[String(u.role || '').toLowerCase()] || u.role || '';
        return `<option value="${escapeSearchHTML(uid)}">${escapeSearchHTML(`${name}${uname}${rLabel ? ' · ' + rLabel : ''}`)}</option>`;
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
        actors.set('admin', 'Quản Trị Viên (admin)');
        actors.set('manager', 'Quản Lý Sân (manager)');
        actors.set('staff', 'Nhân Viên Trực Sân (staff)');
      }
      optionsHtml += Array.from(actors.entries())
        .map(([val, label]) => `<option value="${escapeSearchHTML(val)}">${escapeSearchHTML(label)}</option>`)
        .join('');
    }
    userSelect.innerHTML = optionsHtml;
    if (prevU) userSelect.value = prevU;
  }

  // Khi offline fallback thì lọc client; khi serverLoaded thì giữ kết quả server đã lọc chính xác
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
          Không có bản ghi kiểm toán (Audit Log) nào khớp với bộ lọc hiện tại.
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
    const actorName = l.actor_name || l.actorName || l.full_name || l.actorUsername || l.username || 'Hệ thống';
    const role = String(l.actor_role || l.actorRole || l.role || 'staff').toLowerCase();
    const act = String(l.action || l.action_type || 'ACTION').toUpperCase();
    const target = l.booking_id || l.target || l.target_code || l.entity_id || '—';
    const oldVal = l.oldValue ?? l.old_value ?? '—';
    const newVal = l.newValue ?? l.new_value ?? '—';
    const ip = l.ip || l.ip_address || '127.0.0.1';

    let roleBadge = '<span class="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">Nhân viên</span>';
    if (role === 'admin') {
      roleBadge = '<span class="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold">Chủ sân</span>';
    } else if (role === 'manager') {
      roleBadge = '<span class="px-1.5 py-0.5 rounded bg-purple-100 text-[#7C3AED] text-[10px] font-bold">Quản lý sân</span>';
    } else if (role === 'system') {
      roleBadge = '<span class="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">Hệ thống (Cron)</span>';
    } else if (role === 'user') {
      roleBadge = '<span class="px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800 text-[10px] font-bold">Khách hàng</span>';
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

