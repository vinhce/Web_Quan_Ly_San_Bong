// =========================================================
// 4. QUẢN LÝ MÃ GIẢM GIÁ / VOUCHER KHUYẾN MÃI (TAB 5)
// =========================================================
let editingVoucherCode = '';
let vouchersAdminCache = [];
let goldenHourRulesCache = [];
let voucherControlsBound = false;
window.editingVoucherCode = editingVoucherCode;
window.vouchersAdminCache = vouchersAdminCache;
window.goldenHourRulesCache = goldenHourRulesCache;

function canManageVouchers() {
  if (typeof isManagerOrAdmin === 'function') return isManagerOrAdmin();
  if (typeof isOwnerAdmin === 'function') return isOwnerAdmin();
  return false;
}

function normalizeVoucherText(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function formatVoucherDateVN(isoDate) {
  const s = String(isoDate || '').trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return s;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function normalizeVoucherRecord(v) {
  if (!v) return null;
  return {
    id: String(v.id ?? v.code ?? '').toUpperCase(),
    code: String(v.code || '').replace(/\s+/g, '').toUpperCase(),
    type: v.type || v.discount_type || 'percent',
    value: Number(v.value ?? v.discount_value ?? 0),
    max_discount_amount: Number(v.max_discount_amount ?? v.maxDiscountAmount ?? 0),
    minOrder: Number(v.minOrder ?? v.min_order ?? 0),
    description: String(v.description || ''),
    max_usage: Number(v.max_usage ?? v.maxUsage ?? 0),
    used_count: Number(v.used_count ?? v.usedCount ?? 0),
    valid_from: String(v.valid_from ?? v.validFrom ?? '').trim(),
    valid_to: String(v.valid_to ?? v.validTo ?? '').trim(),
    pitch_type_limit: String(v.pitch_type_limit ?? v.pitchTypeLimit ?? '').trim(),
    isActive: v.isActive !== undefined
      ? Boolean(v.isActive)
      : (v.is_active === undefined ? true : Number(v.is_active) === 1 || v.is_active === true)
  };
}

function getVoucherTodayISO() {
  if (typeof getLocalTodayISO === 'function') return getLocalTodayISO();
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getVoucherComputedStatus(v) {
  const today = getVoucherTodayISO();
  const isDateExpired = Boolean(v.valid_to && v.valid_to < today);
  const isUsageExhausted = Boolean(v.max_usage > 0 && v.used_count >= v.max_usage);
  if (!v.isActive) return { key: 'inactive', label: 'Đang tạm khóa', isExpired: false, isExhausted: false };
  if (isDateExpired) return { key: 'expired', label: 'Đã hết hạn', isExpired: true, isExhausted: isUsageExhausted };
  if (isUsageExhausted) return { key: 'expired', label: 'Hết lượt dùng', isExpired: false, isExhausted: true };
  return { key: 'active', label: 'Đang kích hoạt', isExpired: false, isExhausted: false };
}

function updateVoucherFormTypeUI() {
  const typeEl = document.getElementById('admin-voucher-type');
  const unitEl = document.getElementById('voucher-value-unit');
  const valEl = document.getElementById('admin-voucher-value');
  const maxWrap = document.getElementById('voucher-max-discount-wrap');
  if (!typeEl) return;

  const isPercent = typeEl.value === 'percent';
  if (unitEl) unitEl.textContent = isPercent ? '%' : 'đ';
  if (valEl) {
    if (isPercent) {
      valEl.setAttribute('max', '100');
      valEl.placeholder = 'VD: 15 (từ 1 đến 100%)';
    } else {
      valEl.removeAttribute('max');
      valEl.placeholder = 'VD: 50000 (số tiền VNĐ)';
    }
  }
  if (maxWrap) {
    maxWrap.classList.toggle('hidden', !isPercent);
  }
}
window.updateVoucherFormTypeUI = updateVoucherFormTypeUI;

function validateVoucherDates() {
  const fromEl = document.getElementById('admin-voucher-valid-from');
  const toEl = document.getElementById('admin-voucher-valid-to');
  const errEl = document.getElementById('voucher-date-error');
  const validFrom = String(fromEl?.value || '').trim();
  const validTo = String(toEl?.value || '').trim();

  if (validFrom && validTo && validTo < validFrom) {
    if (errEl) {
      errEl.textContent = 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.';
      errEl.classList.remove('hidden');
    }
    if (toEl) toEl.setAttribute('aria-invalid', 'true');
    return false;
  }

  if (errEl) {
    errEl.textContent = '';
    errEl.classList.add('hidden');
  }
  if (toEl) toEl.removeAttribute('aria-invalid');
  return true;
}
window.validateVoucherDates = validateVoucherDates;

function generateRandomVoucherCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const existing = new Set((vouchersAdminCache || []).map(v => String(v.code || '').toUpperCase()));
  let code = '';
  for (let attempt = 0; attempt < 20; attempt++) {
    let suffix = '';
    for (let i = 0; i < 5; i++) {
      suffix += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    const candidate = 'SBP' + suffix;
    if (!existing.has(candidate)) {
      code = candidate;
      break;
    }
  }
  if (!code) code = 'SBP' + String(Date.now()).slice(-5);

  const codeEl = document.getElementById('admin-voucher-code');
  if (codeEl) {
    codeEl.value = code;
    codeEl.focus();
  }
  return code;
}
window.generateRandomVoucherCode = generateRandomVoucherCode;

async function copyVoucherCode(code) {
  const clean = String(code || '').trim();
  if (!clean) return;
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(clean);
    } else {
      const ta = document.createElement('textarea');
      ta.value = clean;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(`Đã sao chép mã ${clean}`, 'success', 2000);
    }
  } catch (e) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Không thể sao chép mã Voucher.', 'error', 2500);
    }
  }
}
window.copyVoucherCode = copyVoucherCode;

function bindVoucherControls() {
  if (voucherControlsBound) return;
  const codeEl = document.getElementById('admin-voucher-code');
  const typeEl = document.getElementById('admin-voucher-type');
  const fromEl = document.getElementById('admin-voucher-valid-from');
  const toEl = document.getElementById('admin-voucher-valid-to');
  const searchEl = document.getElementById('voucher-filter-search');
  const statusEl = document.getElementById('voucher-filter-status');

  if (!codeEl && !typeEl && !searchEl) return;
  voucherControlsBound = true;

  if (codeEl) {
    codeEl.addEventListener('input', () => {
      const cleaned = codeEl.value.replace(/\s+/g, '').toUpperCase();
      if (codeEl.value !== cleaned) {
        const pos = codeEl.selectionStart;
        codeEl.value = cleaned;
        if (typeof pos === 'number') {
          const nextPos = Math.min(cleaned.length, pos);
          try { codeEl.setSelectionRange(nextPos, nextPos); } catch (e) {}
        }
      }
    });
  }

  if (typeEl) {
    typeEl.addEventListener('change', updateVoucherFormTypeUI);
    updateVoucherFormTypeUI();
  }

  if (fromEl) {
    fromEl.addEventListener('change', validateVoucherDates);
    fromEl.addEventListener('input', validateVoucherDates);
  }
  if (toEl) {
    toEl.addEventListener('change', validateVoucherDates);
    toEl.addEventListener('input', validateVoucherDates);
  }

  if (searchEl) {
    searchEl.addEventListener('input', applyVoucherFilters);
  }
  if (statusEl) {
    statusEl.addEventListener('change', applyVoucherFilters);
  }
}

function renderVouchersTableRows(vouchers) {
  const tbody = document.getElementById('admin-vouchers-tbody');
  if (!tbody) return;
  const colCount = tbody.closest('table')?.querySelectorAll('thead th').length || 6;

  if (!vouchers || vouchers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${colCount}" class="py-8 text-center text-slate-400">Không tìm thấy mã Voucher phù hợp.</td></tr>`;
    return;
  }

  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  tbody.innerHTML = vouchers.map(v => {
    const isActive = v.isActive !== false;
    const st = getVoucherComputedStatus(v);
    const codeAttr = escapeJsAttr(v.code);

    const discountBadge = v.type === 'percent'
      ? `<span class="inline-flex px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Giảm ${Number(v.value)}%</span>`
      : `<span class="inline-flex px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">Giảm ${escapeSearchHTML(fmt(v.value))}</span>`;

    const capLine = (v.type === 'percent' && v.max_discount_amount > 0)
      ? `<div class="text-[11px] text-[#475569] mt-0.5">Tối đa ${escapeSearchHTML(fmt(v.max_discount_amount))}</div>`
      : '';
    const minLine = v.minOrder > 0
      ? `<div class="text-[11px] text-[#64748B]">Đơn tối thiểu ${escapeSearchHTML(fmt(v.minOrder))}</div>`
      : `<div class="text-[11px] text-[#94A3B8]">Mọi giá trị đơn</div>`;

    let usageHtml = '';
    if (v.max_usage > 0) {
      const pct = Math.min(100, Math.round((v.used_count / v.max_usage) * 100));
      const barColor = pct >= 100 ? 'bg-red-500' : (pct >= 80 ? 'bg-amber-500' : 'bg-[#16A34A]');
      usageHtml = `
        <div class="w-32 space-y-1">
          <div class="flex items-center justify-between text-[11px] font-bold tabular-nums">
            <span class="text-[#0F172A]">${Number(v.used_count)} / ${Number(v.max_usage)}</span>
            <span class="text-[#64748B]">${pct}%</span>
          </div>
          <div class="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
            <div class="h-full rounded-full ${barColor}" style="width:${pct}%"></div>
          </div>
        </div>
      `;
    } else {
      usageHtml = `
        <div class="text-[11px] font-semibold text-[#0F172A] tabular-nums">
          ${Number(v.used_count)} <span class="text-[#64748B] font-normal">/ Không giới hạn</span>
        </div>
      `;
    }

    const dateTxt = (v.valid_from || v.valid_to)
      ? `${escapeSearchHTML(v.valid_from ? formatVoucherDateVN(v.valid_from) : '...')} → ${escapeSearchHTML(v.valid_to ? formatVoucherDateVN(v.valid_to) : '...')}`
      : 'Không giới hạn ngày';
    const pitchTxt = v.pitch_type_limit ? `Chỉ Sân ${escapeSearchHTML(v.pitch_type_limit)} người` : 'Tất cả loại sân';

    let statusPillClass = 'bg-[#DCFCE7] text-[#16A34A]';
    if (st.key === 'inactive') statusPillClass = 'bg-slate-200 text-slate-600';
    else if (st.key === 'expired') statusPillClass = 'bg-red-100 text-red-700';

    const toggleTrackClass = isActive ? 'bg-[#16A34A]' : 'bg-slate-300';
    const toggleKnobClass = isActive ? 'translate-x-4' : 'translate-x-0.5';

    return `
      <tr class="hover:bg-slate-50 transition-colors ${isActive ? '' : 'opacity-70'}">
        <td class="py-3 px-4">
          <div class="flex items-center gap-1.5">
            <span class="font-mono font-extrabold text-[#16A34A] text-sm">${escapeSearchHTML(v.code)}</span>
            <button
              type="button"
              onclick="copyVoucherCode('${codeAttr}')"
              title="Sao chép mã Voucher"
              aria-label="Sao chép mã ${escapeSearchHTML(v.code)}"
              class="p-1 rounded hover:bg-slate-200/70 text-[#64748B] hover:text-[#0F172A] cursor-pointer"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke-width="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke-width="2"/></svg>
            </button>
          </div>
          ${v.description ? `<div class="text-[11px] text-[#64748B] mt-0.5 max-w-[240px] truncate" title="${escapeSearchHTML(v.description)}">${escapeSearchHTML(v.description)}</div>` : ''}
        </td>
        <td class="py-3 px-4">
          ${discountBadge}
          ${capLine}
          ${minLine}
        </td>
        <td class="py-3 px-4">${usageHtml}</td>
        <td class="py-3 px-4 text-[11px] space-y-0.5">
          <div class="text-[#334155] font-semibold">${dateTxt}</div>
          <div class="text-sky-700 font-semibold">${pitchTxt}</div>
        </td>
        <td class="py-3 px-4">
          <div class="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked="${isActive ? 'true' : 'false'}"
              aria-label="Bật hoặc tắt mã ${escapeSearchHTML(v.code)}"
              onclick="handleToggleVoucher('${codeAttr}', ${isActive ? 'false' : 'true'})"
              class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${toggleTrackClass}"
            >
              <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${toggleKnobClass}"></span>
            </button>
            <span class="px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${statusPillClass}">${escapeSearchHTML(st.label)}</span>
          </div>
        </td>
        <td class="py-3 px-4 text-right whitespace-nowrap">
          <div class="inline-flex items-center justify-end gap-1.5">
            <button type="button" onclick="handleEditVoucher('${codeAttr}')" class="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200 cursor-pointer">Sửa</button>
            <button type="button" onclick="handleDeleteVoucher('${codeAttr}')" class="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[11px] border border-red-200 cursor-pointer">Xóa</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function applyVoucherFilters() {
  const searchRaw = String(document.getElementById('voucher-filter-search')?.value || '').trim();
  const statusFilter = String(document.getElementById('voucher-filter-status')?.value || 'all');
  const query = normalizeVoucherText(searchRaw);

  const filtered = (vouchersAdminCache || []).filter(v => {
    if (query) {
      const hay = normalizeVoucherText(`${v.code} ${v.description}`);
      if (!hay.includes(query)) return false;
    }
    if (statusFilter !== 'all') {
      const st = getVoucherComputedStatus(v);
      if (st.key !== statusFilter) return false;
    }
    return true;
  });

  renderVouchersTableRows(filtered);
}
window.applyVoucherFilters = applyVoucherFilters;

async function renderAdminVouchers() {
  if (!canManageVouchers()) return;
  bindVoucherControls();
  const tbody = document.getElementById('admin-vouchers-tbody');
  if (!tbody) return;
  const db = window.SanBongApp?.SanBongDB;

  let vouchers = [];
  const r = await adminFetchJson('../api/admin.php?action=get_vouchers');
  if (r.ok && Array.isArray(r.data)) {
    vouchers = r.data.map(normalizeVoucherRecord).filter(Boolean);
    try { localStorage.setItem('sb_vouchers_v1', JSON.stringify(vouchers)); } catch (e) {}
  } else if (!r.ok && r.status === 0 && db) {
    vouchers = (db.getVouchers() || []).map(normalizeVoucherRecord).filter(Boolean);
  } else if (!r.ok) {
    const thCount = tbody.closest('table')?.querySelectorAll('thead th').length || 6;
    tbody.innerHTML = `<tr><td colspan="${thCount}" class="py-6 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải danh sách Voucher.')}</td></tr>`;
    return;
  }

  vouchersAdminCache = vouchers;
  window.vouchersAdminCache = vouchersAdminCache;
  applyVoucherFilters();
}

function handleEditVoucher(code) {
  if (!canManageVouchers() || !code) return;
  bindVoucherControls();
  const db = window.SanBongApp?.SanBongDB;
  const target = String(code).trim().toUpperCase();
  const v = vouchersAdminCache.find(x => String(x.code).toUpperCase() === target)
    || (db ? normalizeVoucherRecord(db.getVouchers().find(x => String(x.code).toUpperCase() === target)) : null);
  if (!v) return;

  editingVoucherCode = v.code;
  window.editingVoucherCode = editingVoucherCode;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) {
      el.value = val;
      if (el.type === 'date') el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };
  setVal('admin-voucher-code', v.code);
  setVal('admin-voucher-type', v.type || 'percent');
  setVal('admin-voucher-value', v.value || 0);
  setVal('admin-voucher-max-discount', v.max_discount_amount || 0);
  setVal('admin-voucher-min', v.minOrder || 0);
  setVal('admin-voucher-desc', v.description || '');
  setVal('admin-voucher-max-usage', v.max_usage ?? 0);
  setVal('admin-voucher-valid-from', v.valid_from || '');
  setVal('admin-voucher-valid-to', v.valid_to || '');
  setVal('admin-voucher-pitch-limit', v.pitch_type_limit || '');

  updateVoucherFormTypeUI();
  validateVoucherDates();

  const titleEl = document.getElementById('admin-voucher-form-title');
  const badgeEl = document.getElementById('admin-voucher-edit-badge');
  const cancelBtn = document.getElementById('admin-voucher-cancel-btn');
  const submitBtn = document.getElementById('admin-voucher-submit-btn');

  if (titleEl) titleEl.textContent = 'Chỉnh sửa mã Voucher: ' + v.code;
  if (badgeEl) badgeEl.classList.remove('hidden');
  if (cancelBtn) cancelBtn.classList.remove('hidden');
  if (submitBtn) submitBtn.textContent = 'Lưu cập nhật Voucher';

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

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) {
      el.value = val;
      if (el.type === 'date') el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };
  setVal('admin-voucher-code', '');
  setVal('admin-voucher-type', 'percent');
  setVal('admin-voucher-value', '');
  setVal('admin-voucher-max-discount', '0');
  setVal('admin-voucher-min', '0');
  setVal('admin-voucher-desc', '');
  setVal('admin-voucher-max-usage', '100');
  setVal('admin-voucher-valid-from', '');
  setVal('admin-voucher-valid-to', '');
  setVal('admin-voucher-pitch-limit', '');

  updateVoucherFormTypeUI();
  validateVoucherDates();

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
  if (!canManageVouchers()) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Chỉ Chủ sân hoặc Quản lý mới có quyền cấu hình Voucher!', 'error');
    }
    return;
  }

  const codeEl = document.getElementById('admin-voucher-code');
  const code = String(codeEl?.value || '').replace(/\s+/g, '').toUpperCase();
  if (codeEl) codeEl.value = code;

  const type = document.getElementById('admin-voucher-type')?.value || 'percent';
  const value = parseInt(document.getElementById('admin-voucher-value')?.value || '0', 10);
  const maxDiscount = type === 'percent'
    ? Math.max(0, parseInt(document.getElementById('admin-voucher-max-discount')?.value || '0', 10) || 0)
    : 0;
  const minOrder = Math.max(0, parseInt(document.getElementById('admin-voucher-min')?.value || '0', 10) || 0);
  const description = String(document.getElementById('admin-voucher-desc')?.value || '').trim();
  const maxUsage = Math.max(0, parseInt(document.getElementById('admin-voucher-max-usage')?.value || '0', 10) || 0);
  const validFrom = String(document.getElementById('admin-voucher-valid-from')?.value || '').trim();
  const validTo = String(document.getElementById('admin-voucher-valid-to')?.value || '').trim();
  const pitchTypeLimit = String(document.getElementById('admin-voucher-pitch-limit')?.value || '').trim();

  if (!code) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập mã Voucher!', 'warning');
    if (codeEl) codeEl.focus();
    return;
  }
  if (type === 'percent' && (isNaN(value) || value < 1 || value > 100)) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Mức giảm theo phần trăm phải từ 1% đến 100%!', 'warning');
    document.getElementById('admin-voucher-value')?.focus();
    return;
  }
  if (type !== 'percent' && (isNaN(value) || value <= 0)) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Giá trị giảm cố định phải lớn hơn 0đ!', 'warning');
    document.getElementById('admin-voucher-value')?.focus();
    return;
  }
  if (!validateVoucherDates()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu!', 'warning');
    document.getElementById('admin-voucher-valid-to')?.focus();
    return;
  }

  const isEditing = Boolean(editingVoucherCode);
  const origCode = editingVoucherCode || '';

  // Kiểm tra trùng mã cục bộ trước khi gửi lên máy chủ
  const duplicate = (vouchersAdminCache || []).some(v => {
    const c = String(v.code || '').toUpperCase();
    if (isEditing && c === origCode.toUpperCase()) return false;
    return c === code;
  });
  if (duplicate) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(`Mã Voucher "${code}" đã tồn tại! Vui lòng nhập mã khác hoặc bấm Sửa.`, 'warning', 4000);
    }
    if (codeEl) codeEl.focus();
    return;
  }

  const submitBtn = document.getElementById('admin-voucher-submit-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Đang lưu...';
  }

  try {
    const r = await adminFetchJson('../api/admin.php?action=save_voucher', {
      method: 'POST',
      body: JSON.stringify({
        code,
        original_code: isEditing ? origCode : undefined,
        is_edit: isEditing,
        discount_type: type,
        discount_value: value,
        max_discount_amount: maxDiscount,
        min_order: minOrder,
        max_usage: maxUsage,
        valid_from: validFrom,
        valid_to: validTo,
        pitch_type_limit: pitchTypeLimit,
        description
      })
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(r.message || 'Không thể lưu mã Voucher!', 'error', 4000);
      }
      return;
    }

    const db = window.SanBongApp?.SanBongDB;
    if (db && typeof db.saveVoucher === 'function') {
      db.saveVoucher({
        code,
        originalCode: origCode || code,
        type,
        value,
        max_discount_amount: maxDiscount,
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
          : `✓ Đã thêm mã khuyến mãi ${code} thành công!`),
        'success',
        3500
      );
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = editingVoucherCode ? 'Lưu cập nhật Voucher' : '+ Thêm mã Voucher';
    }
  }
}

async function handleCreateVoucher(e) {
  return handleSaveVoucher(e);
}

async function handleToggleVoucher(code, nextActive) {
  if (!canManageVouchers()) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Chỉ Chủ sân hoặc Quản lý mới có quyền bật/tắt Voucher!', 'error');
    }
    return;
  }
  if (!code) return;

  const payload = { code };
  if (typeof nextActive === 'boolean') {
    payload.is_active = nextActive ? 1 : 0;
  }

  const r = await adminFetchJson('../api/admin.php?action=toggle_voucher', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể thay đổi trạng thái Voucher!', 'error', 4000);
    }
    return;
  }

  const db = window.SanBongApp?.SanBongDB;
  if (db && typeof db.toggleVoucherActive === 'function') db.toggleVoucherActive(code);
  await renderAdminVouchers();
  if (window.SanBongApp?.showToast) {
    const nowActive = r.data?.is_active !== undefined ? Number(r.data.is_active) === 1 : Boolean(nextActive);
    window.SanBongApp.showToast(
      r.message || (nowActive
        ? `Đã kích hoạt mã giảm giá ${code}.`
        : `Đã tạm khóa mã giảm giá ${code}.`),
      'info',
      2500
    );
  }
}

async function handleDeleteVoucher(code) {
  if (!canManageVouchers()) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Chỉ Chủ sân hoặc Quản lý mới có quyền xóa Voucher!', 'error');
    }
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

  const r = await adminFetchJson('../api/admin.php?action=delete_voucher', {
    method: 'POST',
    body: JSON.stringify({ code })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể xóa mã Voucher!', 'error', 4000);
    }
    return;
  }

  const db = window.SanBongApp?.SanBongDB;
  if (db && typeof db.deleteVoucher === 'function') db.deleteVoucher(code);
  if (editingVoucherCode && editingVoucherCode.toUpperCase() === String(code).toUpperCase()) {
    cancelEditVoucher();
  }

  await renderAdminVouchers();
  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(r.message || `Đã xóa mã giảm giá ${code}.`, 'info', 2500);
  }
}

window.renderAdminVouchers = renderAdminVouchers;
window.handleSaveVoucher = handleSaveVoucher;
window.handleCreateVoucher = handleCreateVoucher;
window.handleEditVoucher = handleEditVoucher;
window.cancelEditVoucher = cancelEditVoucher;
window.handleToggleVoucher = handleToggleVoucher;
window.handleDeleteVoucher = handleDeleteVoucher;
window.saveVoucher = handleSaveVoucher;
window.deleteVoucher = handleDeleteVoucher;
window.toggleVoucherStatus = handleToggleVoucher;

// =========================================================
// 5.4 QUY TẮC GIÁ GIỜ VÀNG / THẤP ĐIỂM (LEGACY SAFEKEEP)
// =========================================================
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
  if (!canManageVouchers()) return;
  populateGoldenHourSlots();
  const tbody = document.getElementById('admin-golden-hours-tbody');
  if (!tbody) return;

  const r = await adminFetchJson('../api/admin.php?action=get_golden_hours');
  if (!r.ok || !Array.isArray(r.data)) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-5 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải quy tắc giờ vàng.')}</td></tr>`;
    return;
  }
  goldenHourRulesCache = r.data;
}
window.loadGoldenHourRules = loadGoldenHourRules;
