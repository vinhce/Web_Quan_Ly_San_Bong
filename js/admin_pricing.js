// =========================================================
// TAB 5: BẢNG GIÁ CỐ ĐỊNH, GÓI THEO THÁNG & SUB-TABS
// =========================================================
const PRICING_SUBTABS = ['pricing', 'packages', 'vouchers'];
let activePricingSubTab = 'pricing';
let pricingServerSnapshot = {
  p5: 250000,
  p7: 450000,
  p11: 900000,
  effective_from: ''
};
let pricingInputsBound = false;
let isLoadingPricing = false;
let monthlyPackagesCache = [];
let packageServicesCatalog = [];
let packageRefPrices = { p5: 250000, p7: 450000, p11: 900000 };
let packageModalInputsBound = false;

function canManagePricing() {
  return (typeof isOwnerAdmin === 'function') ? isOwnerAdmin() : false;
}

function formatPriceInputVND(num) {
  return Number(num || 0).toLocaleString('vi-VN') + 'đ';
}

function parsePriceInputVND(str, fallback = 0) {
  const digits = String(str || '').replace(/[^\d]/g, '');
  const val = parseInt(digits, 10);
  return (!isNaN(val) && val > 0) ? val : fallback;
}

function getPricingSubTabFromHash() {
  const raw = String(window.location.hash || '').replace(/^#/, '').trim().toLowerCase();
  if (!raw.startsWith('pricing/')) return '';
  const sub = raw.slice('pricing/'.length).split('/')[0];
  return PRICING_SUBTABS.includes(sub) ? sub : '';
}

function switchPricingSubTab(subtab, options = {}) {
  const target = PRICING_SUBTABS.includes(subtab) ? subtab : 'pricing';
  activePricingSubTab = target;

  PRICING_SUBTABS.forEach(key => {
    const btn = document.getElementById(`pricing-subtab-btn-${key}`)
      || document.querySelector(`[data-pricing-subtab="${key}"]`);
    const panel = document.getElementById(`pricing-subtab-${key}`);
    const isActive = key === target;

    if (btn) {
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      btn.className = isActive
        ? 'pricing-subtab-btn px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-[#0F172A] text-white shadow-xs'
        : 'pricing-subtab-btn px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 text-[#475569] hover:bg-slate-100';
    }
    if (panel) {
      panel.classList.toggle('hidden', !isActive);
    }
  });

  if (!options.skipHash) {
    try {
      const url = new URL(window.location.href);
      url.hash = `#pricing/${target}`;
      history.replaceState(null, '', url.toString());
    } catch (e) {}
  }

  if (canManagePricing()) {
    if (target === 'pricing' && !options.skipLoad) {
      loadPricingTable();
    } else if (target === 'packages' && !options.skipLoad) {
      loadMonthlyPackages();
    } else if (target === 'vouchers' && !options.skipLoad && typeof renderAdminVouchers === 'function') {
      renderAdminVouchers();
    }
  }
}
window.switchPricingSubTab = switchPricingSubTab;

function bindPricingInputs() {
  if (pricingInputsBound) return;
  const priceIds = ['price-p5-base', 'price-p7-base', 'price-p11-base'];
  const effectiveEl = document.getElementById('pricing-effective-from');
  if (!document.getElementById('price-p5-base') && !effectiveEl) return;

  pricingInputsBound = true;

  priceIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      if (isLoadingPricing) return;
      syncHiddenPricingInputs();
      updatePricingDirtyUI();
    });
    el.addEventListener('blur', () => {
      if (isLoadingPricing) return;
      const fallback = id === 'price-p5-base'
        ? pricingServerSnapshot.p5
        : (id === 'price-p11-base' ? pricingServerSnapshot.p11 : pricingServerSnapshot.p7);
      const parsed = parsePriceInputVND(el.value, fallback);
      el.value = formatPriceInputVND(parsed);
      syncHiddenPricingInputs();
      updatePricingDirtyUI();
    });
  });

  if (effectiveEl) {
    effectiveEl.addEventListener('input', () => {
      if (!isLoadingPricing) updatePricingDirtyUI();
    });
    effectiveEl.addEventListener('change', () => {
      if (!isLoadingPricing) updatePricingDirtyUI();
    });
  }
}

function syncHiddenPricingInputs() {
  ['p5', 'p7', 'p11'].forEach(k => {
    const baseEl = document.getElementById(`price-${k}-base`);
    if (!baseEl) return;
    const peakEl = document.getElementById(`price-${k}-peak`);
    const wkndEl = document.getElementById(`price-${k}-weekend`);
    if (peakEl) peakEl.value = baseEl.value;
    if (wkndEl) wkndEl.value = baseEl.value;
  });
}

function getCurrentPricingFormValues() {
  return {
    p5: parsePriceInputVND(document.getElementById('price-p5-base')?.value, 0),
    p7: parsePriceInputVND(document.getElementById('price-p7-base')?.value, 0),
    p11: parsePriceInputVND(document.getElementById('price-p11-base')?.value, 0),
    effective_from: String(document.getElementById('pricing-effective-from')?.value || '').trim()
  };
}

function isPricingDirty() {
  if (!document.getElementById('price-p5-base')) return false;
  const cur = getCurrentPricingFormValues();
  return (
    cur.p5 !== Number(pricingServerSnapshot.p5) ||
    cur.p7 !== Number(pricingServerSnapshot.p7) ||
    cur.p11 !== Number(pricingServerSnapshot.p11) ||
    cur.effective_from !== String(pricingServerSnapshot.effective_from || '')
  );
}
window.isPricingDirty = isPricingDirty;

function updatePricingDirtyUI() {
  const dirty = isPricingDirty();
  const bar = document.getElementById('pricing-sticky-save-bar');
  const dot = document.getElementById('pricing-dirty-dot');
  const statusEl = document.getElementById('pricing-dirty-status');
  const resetBtn = document.getElementById('btn-reset-pricing');
  const saveBtn = document.getElementById('btn-save-pricing');

  if (bar) {
    bar.classList.toggle('border-amber-400', dirty);
    bar.classList.toggle('bg-amber-50/95', dirty);
    bar.classList.toggle('border-[#E2E8F0]', !dirty);
    bar.classList.toggle('bg-white/95', !dirty);
  }
  if (dot) {
    dot.className = dirty
      ? 'w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0'
      : 'w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0';
  }
  if (statusEl) {
    statusEl.textContent = dirty ? 'Có thay đổi chưa lưu' : 'Chưa có thay đổi';
    statusEl.className = dirty ? 'font-bold text-amber-800' : 'font-semibold text-[#64748B]';
  }
  if (resetBtn) {
    resetBtn.classList.toggle('hidden', !dirty);
  }
  if (saveBtn) {
    saveBtn.disabled = !dirty;
  }
}

function applyPricingValuesToForm(snapshot) {
  isLoadingPricing = true;
  try {
    const setVal = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.value = formatPriceInputVND(v);
    };
    setVal('price-p5-base', snapshot.p5);
    setVal('price-p7-base', snapshot.p7);
    setVal('price-p11-base', snapshot.p11);
    syncHiddenPricingInputs();

    const effEl = document.getElementById('pricing-effective-from');
    if (effEl) {
      effEl.value = snapshot.effective_from || '';
      effEl.dispatchEvent(new Event('change', { bubbles: true }));
    }
  } finally {
    isLoadingPricing = false;
  }
  updatePricingDirtyUI();
}

function resetPricingForm() {
  applyPricingValuesToForm(pricingServerSnapshot);
}
window.resetPricingForm = resetPricingForm;

async function loadPricingTable() {
  if (!canManagePricing()) return;
  bindPricingInputs();

  const r = await adminFetchJson('../api/admin.php?action=get_pricing');
  if (r.ok && r.data) {
    const d = r.data;
    const p5Base = Number(d.p5?.base ?? d.p5?.basePrice ?? 250000) || 250000;
    const p7Base = Number(d.p7?.base ?? d.p7?.basePrice ?? 450000) || 450000;
    const p11Base = Number(d.p11?.base ?? d.p11?.basePrice ?? 900000) || 900000;
    const effFrom = String(d.pricing_effective_from ?? d.effective_from ?? '').trim();

    pricingServerSnapshot = {
      p5: p5Base,
      p7: p7Base,
      p11: p11Base,
      effective_from: effFrom
    };
    packageRefPrices = { p5: p5Base, p7: p7Base, p11: p11Base };
    applyPricingValuesToForm(pricingServerSnapshot);
    return;
  }

  // Fallback to pitches cache if network offline
  const db = window.SanBongApp?.SanBongDB;
  const pitches = db ? db.getPitches() : [];
  const p5 = pitches.find(p => Number(p.type) === 5) || { basePrice: 250000 };
  const p7 = pitches.find(p => Number(p.type) === 7) || { basePrice: 450000 };
  const p11 = pitches.find(p => Number(p.type) === 11) || { basePrice: 900000 };

  pricingServerSnapshot = {
    p5: Number(p5.basePrice || 250000),
    p7: Number(p7.basePrice || 450000),
    p11: Number(p11.basePrice || 900000),
    effective_from: ''
  };
  packageRefPrices = { p5: pricingServerSnapshot.p5, p7: pricingServerSnapshot.p7, p11: pricingServerSnapshot.p11 };
  applyPricingValuesToForm(pricingServerSnapshot);
}
window.loadPricingTable = loadPricingTable;

async function savePricingTable() {
  if (!canManagePricing()) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Chỉ Chủ sân hoặc Quản lý mới có quyền thay đổi bảng giá niêm yết!', 'error');
    }
    return;
  }

  const cur = getCurrentPricingFormValues();
  if (cur.p5 <= 0 || cur.p7 <= 0 || cur.p11 <= 0) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Giá sân phải lớn hơn 0đ cho tất cả các loại sân!', 'warning');
    }
    return;
  }

  if (!isPricingDirty()) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Chưa có thay đổi để lưu.', 'info', 2500);
    }
    return;
  }

  // Kiểm tra biến động giá > 20% so với giá đang lưu trên máy chủ
  const tiers = [
    { key: 'p5', label: 'Sân 5 người', oldVal: pricingServerSnapshot.p5, newVal: cur.p5 },
    { key: 'p7', label: 'Sân 7 người', oldVal: pricingServerSnapshot.p7, newVal: cur.p7 },
    { key: 'p11', label: 'Sân 11 người', oldVal: pricingServerSnapshot.p11, newVal: cur.p11 }
  ];
  const largeChanges = tiers.filter(t => t.oldVal > 0 && Math.abs(t.newVal - t.oldVal) / t.oldVal > 0.20);

  if (largeChanges.length > 0 && typeof showAdminConfirm === 'function') {
    const lines = largeChanges.map(t => {
      const pct = ((t.newVal - t.oldVal) / t.oldVal) * 100;
      const sign = pct > 0 ? '+' : '';
      return `• ${t.label}: ${formatPriceInputVND(t.oldVal)} → ${formatPriceInputVND(t.newVal)} (${sign}${pct.toFixed(1)}%)`;
    }).join('\n');

    const confirmed = await showAdminConfirm({
      title: 'Cảnh báo thay đổi giá lớn (> 20%)',
      message: `Mức giá mới chênh lệch quá 20% so với giá hiện tại:\n${lines}\n\nBạn có chắc chắn muốn áp dụng bảng giá này?`,
      confirmText: 'Xác nhận lưu bảng giá',
      cancelText: 'Kiểm tra lại',
      danger: true
    });
    if (!confirmed) return;
  }

  const btn = document.getElementById('btn-save-pricing');
  const origText = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Đang lưu bảng giá...';
  }

  try {
    const r = await adminFetchJson('../api/admin.php?action=save_pricing', {
      method: 'POST',
      body: JSON.stringify({
        p5_base: cur.p5,
        p7_base: cur.p7,
        p11_base: cur.p11,
        pricing_effective_from: cur.effective_from,
        effective_from: cur.effective_from,
        pricing: {
          p5: { base: cur.p5, peak: cur.p5, weekend: cur.p5 },
          p7: { base: cur.p7, peak: cur.p7, weekend: cur.p7 },
          p11: { base: cur.p11, peak: cur.p11, weekend: cur.p11 }
        }
      })
    });

    if (!r || !r.ok || !r.json || r.json.success !== true) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(r?.message || 'Không thể lưu bảng giá niêm yết lên máy chủ!', 'error', 4000);
      }
      return;
    }

    const db = window.SanBongApp?.SanBongDB;
    if (db) {
      const pitches = db.getPitches().map(p => {
        const t = Number(p.type);
        const price = t === 5 ? cur.p5 : (t === 11 ? cur.p11 : cur.p7);
        return Object.assign({}, p, {
          basePrice: price,
          peakPrice: price,
          weekendPrice: price
        });
      });
      try { localStorage.setItem('sb_pitches_v2', JSON.stringify(pitches)); } catch (e) {}
      window.dispatchEvent(new CustomEvent('sb-data-synced', { detail: { pitches } }));
    }

    await loadPricingTable();
    if (typeof renderAdminPitches === 'function') renderAdminPitches();
    if (typeof initQuickBookingForm === 'function') initQuickBookingForm();
    if (monthlyPackagesCache.length > 0) renderMonthlyPackagesGrid();

    if (r?.json?.has_changed === false || r?.json?.hasChanged === false) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast('Không có thay đổi để lưu (bảng giá giữ nguyên).', 'info', 3000);
      }
    } else if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || '✓ Đã lưu cấu hình bảng giá mới và đồng bộ sang trang Đặt sân!', 'success', 3500);
    }
  } finally {
    if (btn) {
      btn.innerHTML = origText || 'Lưu bảng giá';
    }
    updatePricingDirtyUI();
  }
}
window.savePricingTable = savePricingTable;

// Cảnh báo rời trang khi còn thay đổi bảng giá chưa lưu
if (!window._pricingBeforeUnloadBound) {
  window._pricingBeforeUnloadBound = true;
  window.addEventListener('beforeunload', (e) => {
    if (isPricingDirty()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
  window.addEventListener('hashchange', () => {
    const tabEl = document.getElementById('tab-content-pricing');
    if (tabEl && !tabEl.classList.contains('hidden')) {
      const sub = getPricingSubTabFromHash();
      if (sub && sub !== activePricingSubTab) {
        switchPricingSubTab(sub, { skipHash: true });
      }
    }
  });
}

// =========================================================
// SUB-TAB 2: QUẢN LÝ GÓI HỢP ĐỒNG THEO THÁNG
// =========================================================
function getReferenceMatchPrice() {
  return Number(packageRefPrices.p7 || pricingServerSnapshot.p7 || 450000);
}

function calcPackageIncentive(discountPercent, gifts) {
  const refPrice = getReferenceMatchPrice();
  const pct = Math.max(0, Math.min(100, Number(discountPercent || 0)));
  const discountCost = Math.round(refPrice * (pct / 100));
  const giftCost = (Array.isArray(gifts) ? gifts : []).reduce((sum, g) => {
    const qty = Math.max(0, Number(g.qty || 0));
    const unitPrice = Math.max(0, Number(g.unit_price || 0));
    return sum + (qty * unitPrice);
  }, 0);
  const totalCostPerMatch = discountCost + giftCost;
  const percentOfMatch = refPrice > 0 ? (totalCostPerMatch / refPrice) * 100 : 0;
  return {
    refPrice,
    discountCost,
    giftCost,
    totalCostPerMatch,
    percentOfMatch,
    isWarning: percentOfMatch > 30
  };
}

function normalizePackageGifts(pkg) {
  if (Array.isArray(pkg?.gifts)) return pkg.gifts;
  if (typeof pkg?.gifts_json === 'string' && pkg.gifts_json.trim()) {
    try {
      const parsed = JSON.parse(pkg.gifts_json);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }
  return [];
}

async function loadMonthlyPackages() {
  if (!canManagePricing()) return;
  const grid = document.getElementById('admin-packages-grid');
  if (!grid) return;

  const r = await adminFetchJson('../api/admin.php?action=get_monthly_packages');
  if (!r.ok) {
    grid.innerHTML = `<div class="col-span-full py-8 text-center text-xs text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải danh sách gói theo tháng.')}</div>`;
    return;
  }

  const list = Array.isArray(r.json?.packages)
    ? r.json.packages
    : (Array.isArray(r.data) ? r.data : []);
  monthlyPackagesCache = list;

  if (Array.isArray(r.json?.services)) {
    packageServicesCatalog = r.json.services;
  }
  if (r.json?.reference_prices) {
    packageRefPrices = {
      p5: Number(r.json.reference_prices.p5 || packageRefPrices.p5),
      p7: Number(r.json.reference_prices.p7 || packageRefPrices.p7),
      p11: Number(r.json.reference_prices.p11 || packageRefPrices.p11)
    };
  }

  renderMonthlyPackagesGrid();
}
window.loadMonthlyPackages = loadMonthlyPackages;

function renderMonthlyPackagesGrid() {
  const grid = document.getElementById('admin-packages-grid');
  if (!grid) return;

  if (!monthlyPackagesCache || monthlyPackagesCache.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-10 text-center rounded-xl border border-dashed border-[#CBD5E1] bg-slate-50/70 space-y-2">
        <p class="text-xs font-semibold text-[#475569]">Chưa có gói hợp đồng theo tháng nào.</p>
        <button type="button" onclick="openPackageModal()" class="btn-sm btn-primary text-xs font-bold cursor-pointer">+ Tạo gói đầu tiên</button>
      </div>
    `;
    return;
  }

  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  grid.innerHTML = monthlyPackagesCache.map(pkg => {
    const id = Number(pkg.id);
    const active = Number(pkg.is_active) === 1 || pkg.is_active === true;
    const theme = String(pkg.theme || 'default');
    const gifts = normalizePackageGifts(pkg);
    const inc = calcPackageIncentive(pkg.discount_percent, gifts);

    let cardTone = 'bg-white border-[#E2E8F0]';
    let badgeTone = 'bg-slate-100 text-slate-700 border-slate-200';
    let discountTone = 'text-[#0F172A]';
    if (theme === 'diamond') {
      cardTone = 'bg-gradient-to-b from-sky-50/70 to-white border-sky-200';
      badgeTone = 'bg-sky-600 text-white border-sky-600';
      discountTone = 'text-sky-700';
    } else if (theme === 'green') {
      cardTone = 'bg-gradient-to-b from-emerald-50/70 to-white border-emerald-200';
      badgeTone = 'bg-emerald-600 text-white border-emerald-600';
      discountTone = 'text-emerald-700';
    }

    const topBadge = pkg.badge_text
      ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${badgeTone}">${escapeSearchHTML(pkg.badge_text)}</span>`
      : `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">Gói tháng</span>`;

    const statusPill = active
      ? `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#16A34A]">Đang bật</span>`
      : `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">Đang tắt</span>`;

    const giftsHtml = gifts.length > 0
      ? `<ul class="space-y-1 text-xs text-[#334155]">${gifts.map(g => {
          const lineTotal = Number(g.qty || 0) * Number(g.unit_price || 0);
          return `<li class="flex items-start justify-between gap-2">
            <span class="flex items-start gap-1.5">
              <span class="text-emerald-600 font-bold">•</span>
              <span><strong>${Number(g.qty || 1)}×</strong> ${escapeSearchHTML(g.name || '')}</span>
            </span>
            <span class="text-[11px] text-[#64748B] tabular-nums shrink-0">${escapeSearchHTML(fmt(lineTotal))}</span>
          </li>`;
        }).join('')}</ul>`
      : `<p class="text-[11px] text-[#94A3B8] italic">Không có quà tặng kèm mỗi trận.</p>`;

    const warningHtml = inc.isWarning
      ? `<div class="mt-2 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-bold flex items-center gap-1.5">
          <span>⚠️</span>
          <span>Ưu đãi ${inc.percentOfMatch.toFixed(1)}% (&gt; 30% giá ca)</span>
        </div>`
      : '';

    return `
      <article class="h-full flex flex-col justify-between rounded-2xl border p-5 shadow-2xs transition-all ${cardTone} ${active ? '' : 'opacity-65'}">
        <div class="space-y-3">
          <div class="flex items-start justify-between gap-2 min-h-[24px]">
            <div>${topBadge}</div>
            <div class="shrink-0">${statusPill}</div>
          </div>

          <div>
            <h4 class="font-heading font-extrabold text-base text-[#0F172A] leading-snug">${escapeSearchHTML(pkg.name || '')}</h4>
            <p class="text-xs text-[#64748B] font-semibold mt-0.5">${Number(pkg.months || 1)} tháng · ${Number(pkg.matches_count || 4)} trận cố định</p>
          </div>

          <div class="pt-1">
            <div class="font-heading font-extrabold text-2xl leading-tight tabular-nums ${discountTone}">Giảm ${Number(pkg.discount_percent || 0)}%</div>
            <p class="text-[11px] text-[#64748B] mt-0.5">Tiền thuê sân mỗi ca đặt cố định</p>
          </div>

          <div class="pt-2 border-t border-slate-200/80 space-y-1.5">
            <div class="text-[11px] font-bold text-[#475569] uppercase tracking-wider">Quà tặng mỗi trận</div>
            ${giftsHtml}
          </div>
        </div>

        <div class="pt-4 mt-4 border-t border-slate-200/80 space-y-3">
          <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1 text-[11px]">
            <div class="flex items-center justify-between gap-2">
              <span class="text-[#64748B] font-semibold">Chi phí ưu đãi / trận:</span>
              <span class="font-bold text-[#0F172A] tabular-nums">${escapeSearchHTML(fmt(inc.totalCostPerMatch))}</span>
            </div>
            <div class="flex items-center justify-between gap-2">
              <span class="text-[#64748B] font-semibold">% so với giá ca:</span>
              <span class="font-extrabold tabular-nums ${inc.isWarning ? 'text-amber-700' : 'text-emerald-700'}">${inc.percentOfMatch.toFixed(1)}%</span>
            </div>
            ${warningHtml}
          </div>

          <div class="flex items-center justify-end gap-1.5 flex-wrap">
            <button type="button" onclick="openPackageModal(${id})" class="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200 cursor-pointer">Sửa</button>
            <button type="button" onclick="handleTogglePackage(${id}, ${active ? 'false' : 'true'})" class="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[11px] border border-amber-200 cursor-pointer">${active ? 'Tắt' : 'Bật'}</button>
            <button type="button" onclick="handleDeletePackage(${id})" class="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[11px] border border-red-200 cursor-pointer">Xóa</button>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function bindPackageModalInputs() {
  if (packageModalInputsBound) return;
  const discEl = document.getElementById('pkg-discount-percent');
  if (!discEl) return;
  packageModalInputsBound = true;
  discEl.addEventListener('input', updatePackageIncentivePreview);
  discEl.addEventListener('change', updatePackageIncentivePreview);
}

function openPackageModal(id = null) {
  if (!canManagePricing()) return;
  bindPackageModalInputs();

  const modal = document.getElementById('package-edit-modal');
  const form = document.getElementById('package-edit-form');
  const giftsList = document.getElementById('pkg-gifts-list');
  if (!modal || !form || !giftsList) return;

  form.reset();
  giftsList.innerHTML = '';

  const pkg = id ? monthlyPackagesCache.find(x => Number(x.id) === Number(id)) : null;
  const setVal = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val; };

  if (pkg) {
    setVal('pkg-id', String(pkg.id));
    setVal('pkg-name', pkg.name || '');
    setVal('pkg-months', String(pkg.months || 1));
    setVal('pkg-matches-count', String(pkg.matches_count || 4));
    setVal('pkg-discount-percent', String(pkg.discount_percent ?? 0));
    setVal('pkg-theme', pkg.theme || 'default');
    setVal('pkg-badge-text', pkg.badge_text || '');
    const activeEl = document.getElementById('pkg-is-active');
    if (activeEl) activeEl.checked = Number(pkg.is_active) === 1 || pkg.is_active === true;

    const gifts = normalizePackageGifts(pkg);
    gifts.forEach(g => addPackageGiftRow(g));

    const titleEl = document.getElementById('package-modal-title');
    const submitBtn = document.getElementById('pkg-submit-btn');
    if (titleEl) titleEl.textContent = 'Chỉnh sửa gói theo tháng';
    if (submitBtn) submitBtn.textContent = 'Lưu cập nhật gói';
  } else {
    setVal('pkg-id', '');
    setVal('pkg-name', '');
    setVal('pkg-months', '1');
    setVal('pkg-matches-count', '4');
    setVal('pkg-discount-percent', '5');
    setVal('pkg-theme', 'default');
    setVal('pkg-badge-text', '');
    const activeEl = document.getElementById('pkg-is-active');
    if (activeEl) activeEl.checked = true;

    const titleEl = document.getElementById('package-modal-title');
    const submitBtn = document.getElementById('pkg-submit-btn');
    if (titleEl) titleEl.textContent = 'Thêm gói theo tháng mới';
    if (submitBtn) submitBtn.textContent = 'Lưu gói theo tháng';
  }

  togglePackageGiftsEmptyState();
  updatePackageIncentivePreview();

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  const nameEl = document.getElementById('pkg-name');
  if (nameEl) setTimeout(() => nameEl.focus(), 80);
}
window.openPackageModal = openPackageModal;

function closePackageModal() {
  const modal = document.getElementById('package-edit-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}
window.closePackageModal = closePackageModal;

function togglePackageGiftsEmptyState() {
  const list = document.getElementById('pkg-gifts-list');
  const emptyEl = document.getElementById('pkg-gifts-empty');
  if (!list || !emptyEl) return;
  const hasRows = list.querySelectorAll('.pkg-gift-row').length > 0;
  emptyEl.classList.toggle('hidden', hasRows);
}

function addPackageGiftRow(gift = null) {
  const list = document.getElementById('pkg-gifts-list');
  if (!list) return;

  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');
  const selectedId = gift && gift.service_id !== undefined && gift.service_id !== null ? String(gift.service_id) : '';
  const qtyVal = Math.max(1, Number(gift?.qty || 1));

  let optionsHtml = packageServicesCatalog.map(s => {
    const sid = String(s.id);
    const selected = sid === selectedId ? 'selected' : '';
    const unitLabel = s.unit ? `/${s.unit}` : '';
    return `<option value="${escapeSearchHTML(sid)}" data-name="${escapeSearchHTML(s.name)}" data-price="${Number(s.price || 0)}" ${selected}>${escapeSearchHTML(s.name)} (${escapeSearchHTML(fmt(s.price || 0))}${escapeSearchHTML(unitLabel)})</option>`;
  }).join('');

  const existsInCatalog = selectedId && packageServicesCatalog.some(s => String(s.id) === selectedId);
  if (gift && !existsInCatalog) {
    const customName = gift.name || 'Quà tặng tùy chỉnh';
    const customPrice = Number(gift.unit_price || 0);
    optionsHtml = `<option value="${escapeSearchHTML(selectedId || '')}" data-name="${escapeSearchHTML(customName)}" data-price="${customPrice}" selected>${escapeSearchHTML(customName)} (${escapeSearchHTML(fmt(customPrice))})</option>` + optionsHtml;
  }

  if (!optionsHtml) {
    optionsHtml = `<option value="" data-name="Nước suối" data-price="10000">Nước suối (10.000đ)</option>`;
  }

  const row = document.createElement('div');
  row.className = 'pkg-gift-row flex flex-wrap sm:flex-nowrap items-center gap-2 p-2 rounded-lg bg-white border border-[#E2E8F0]';
  row.innerHTML = `
    <select class="pkg-gift-service input-field h-8 text-xs font-semibold flex-1 min-w-[180px]" aria-label="Chọn dịch vụ quà tặng">
      ${optionsHtml}
    </select>
    <div class="flex items-center gap-1.5 shrink-0">
      <span class="text-[11px] text-[#64748B] font-semibold">SL:</span>
      <input type="number" class="pkg-gift-qty input-field h-8 w-16 text-xs font-bold text-center tabular-nums" min="1" max="99" value="${qtyVal}" aria-label="Số lượng quà tặng">
    </div>
    <span class="pkg-gift-subtotal text-xs font-bold text-[#0F172A] tabular-nums w-24 text-right shrink-0">0đ</span>
    <button type="button" class="pkg-gift-remove w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs border border-red-200 flex items-center justify-center cursor-pointer shrink-0" aria-label="Xóa quà tặng">✕</button>
  `;

  const sel = row.querySelector('.pkg-gift-service');
  const qtyInput = row.querySelector('.pkg-gift-qty');
  const rmBtn = row.querySelector('.pkg-gift-remove');

  sel.addEventListener('change', updatePackageIncentivePreview);
  qtyInput.addEventListener('input', updatePackageIncentivePreview);
  qtyInput.addEventListener('change', updatePackageIncentivePreview);
  rmBtn.addEventListener('click', () => {
    row.remove();
    togglePackageGiftsEmptyState();
    updatePackageIncentivePreview();
  });

  list.appendChild(row);
  togglePackageGiftsEmptyState();
  updatePackageIncentivePreview();
}
window.addPackageGiftRow = addPackageGiftRow;

function collectPackageGiftsFromForm() {
  const list = document.getElementById('pkg-gifts-list');
  if (!list) return [];
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');
  const rows = Array.from(list.querySelectorAll('.pkg-gift-row'));
  return rows.map(row => {
    const sel = row.querySelector('.pkg-gift-service');
    const opt = sel?.selectedOptions?.[0];
    const qty = Math.max(1, parseInt(row.querySelector('.pkg-gift-qty')?.value || '1', 10) || 1);
    const serviceId = String(sel?.value || '').trim();
    const name = opt?.getAttribute('data-name') || opt?.textContent || '';
    const unitPrice = Math.max(0, Number(opt?.getAttribute('data-price') || 0));
    const subEl = row.querySelector('.pkg-gift-subtotal');
    if (subEl) subEl.textContent = fmt(qty * unitPrice);
    return {
      service_id: serviceId,
      name,
      qty,
      unit_price: unitPrice
    };
  });
}

function updatePackageIncentivePreview() {
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');
  const discountPct = Number(document.getElementById('pkg-discount-percent')?.value || 0);
  const gifts = collectPackageGiftsFromForm();
  const inc = calcPackageIncentive(discountPct, gifts);

  const costEl = document.getElementById('pkg-preview-cost-per-match');
  const pctEl = document.getElementById('pkg-preview-percent');
  const warnBox = document.getElementById('pkg-incentive-warning');
  const warnText = document.getElementById('pkg-incentive-warning-text');

  if (costEl) costEl.textContent = fmt(inc.totalCostPerMatch);
  if (pctEl) {
    pctEl.textContent = `${inc.percentOfMatch.toFixed(1)}%`;
    pctEl.className = inc.isWarning
      ? 'font-heading font-extrabold text-sm text-amber-700 tabular-nums'
      : 'font-heading font-extrabold text-sm text-[#15803D] tabular-nums';
  }
  if (warnBox) {
    warnBox.classList.toggle('hidden', !inc.isWarning);
  }
  if (warnText && inc.isWarning) {
    warnText.textContent = `Tổng ưu đãi đang là ${fmt(inc.totalCostPerMatch)}/trận (${inc.percentOfMatch.toFixed(1)}% giá ca chuẩn ${fmt(inc.refPrice)}), vượt ngưỡng 30%. Hãy cân nhắc điều chỉnh để bảo đảm biên lợi nhuận.`;
  }
}
window.updatePackageIncentivePreview = updatePackageIncentivePreview;

async function handleSavePackage(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!canManagePricing()) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Bạn không có quyền chỉnh sửa gói theo tháng!', 'error');
    }
    return;
  }

  const id = parseInt(document.getElementById('pkg-id')?.value || '0', 10) || 0;
  const name = String(document.getElementById('pkg-name')?.value || '').trim();
  const months = parseInt(document.getElementById('pkg-months')?.value || '1', 10) || 1;
  const matchesCount = parseInt(document.getElementById('pkg-matches-count')?.value || '4', 10) || 4;
  const discountPercent = parseInt(document.getElementById('pkg-discount-percent')?.value || '0', 10);
  const theme = String(document.getElementById('pkg-theme')?.value || 'default');
  const badgeText = String(document.getElementById('pkg-badge-text')?.value || '').trim();
  const isActive = Boolean(document.getElementById('pkg-is-active')?.checked ?? true);
  const gifts = collectPackageGiftsFromForm();

  if (!name) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập tên gói hợp đồng!', 'warning');
    return;
  }
  if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Mức giảm giá phải từ 0% đến 100%!', 'warning');
    return;
  }

  const submitBtn = document.getElementById('pkg-submit-btn');
  const origText = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Đang lưu...';
  }

  try {
    const r = await adminFetchJson('../api/admin.php?action=save_monthly_package', {
      method: 'POST',
      body: JSON.stringify({
        id: id || undefined,
        name,
        months,
        matches_count: matchesCount,
        discount_percent: discountPercent,
        gifts,
        badge_text: badgeText,
        theme,
        is_active: isActive ? 1 : 0
      })
    });

    if (!r.ok) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(r.message || 'Không thể lưu gói theo tháng!', 'error', 4000);
      }
      return;
    }

    closePackageModal();
    await loadMonthlyPackages();
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || '✓ Đã lưu gói hợp đồng theo tháng!', 'success', 3000);
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origText || 'Lưu gói theo tháng';
    }
  }
}
window.handleSavePackage = handleSavePackage;

async function handleTogglePackage(id, nextActive) {
  if (!canManagePricing() || !id) return;
  const r = await adminFetchJson('../api/admin.php?action=toggle_monthly_package', {
    method: 'POST',
    body: JSON.stringify({
      id: Number(id),
      is_active: nextActive ? 1 : 0
    })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể cập nhật trạng thái gói!', 'error', 3500);
    }
    return;
  }
  await loadMonthlyPackages();
  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(r.message || (nextActive ? 'Đã bật gói theo tháng.' : 'Đã tạm tắt gói theo tháng.'), 'info', 2500);
  }
}
window.handleTogglePackage = handleTogglePackage;

async function handleDeletePackage(id) {
  if (!canManagePricing() || !id) return;
  const pkg = monthlyPackagesCache.find(x => Number(x.id) === Number(id));
  const pkgName = pkg ? pkg.name : `#${id}`;

  const confirmed = await showAdminConfirm({
    title: 'Xóa gói hợp đồng theo tháng',
    message: `Bạn có chắc chắn muốn xóa gói "${pkgName}"?`,
    confirmText: 'Xóa gói',
    cancelText: 'Hủy',
    danger: true
  });
  if (!confirmed) return;

  const r = await adminFetchJson('../api/admin.php?action=delete_monthly_package', {
    method: 'POST',
    body: JSON.stringify({ id: Number(id) })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể xóa gói theo tháng!', 'error', 3500);
    }
    return;
  }
  await loadMonthlyPackages();
  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(r.message || `Đã xóa gói "${pkgName}".`, 'info', 2500);
  }
}
window.handleDeletePackage = handleDeletePackage;

function initPricingTab() {
  if (!canManagePricing()) return;
  bindPricingInputs();
  const sub = getPricingSubTabFromHash() || activePricingSubTab || 'pricing';
  switchPricingSubTab(sub, { skipHash: false, skipLoad: false });
}
window.initPricingTab = initPricingTab;
