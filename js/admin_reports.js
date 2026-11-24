let currentReportLedgerBookings = [];
let currentReportLedgerFiltered = [];
let currentReportLedgerPage = 1;
const REPORT_LEDGER_PAGE_SIZE = 10;
let currentAdminExpensesList = [];
let currentReportPreset = 'month';
let currentReportInitialized = false;
let currentReportPitchRows = [];
let currentReportPitchSort = { key: 'revenue', dir: 'desc' };
let currentReportUncollectedUpcoming = [];
let currentReportUncollectedOverdue = [];
let currentReportOverdueCodes = new Set();
let currentReportForfeitBookings = [];
let currentReportData = null;
let currentReportSubtab = 'tong-quan';
let currentReportShowAllSlots = false;

const REPORT_SUBTABS = ['tong-quan', 'doi-soat', 'chi-tiet', 'chi-phi'];
const REPORT_KPI_COLLAPSE_KEY = 'sb_rpt_kpi_collapsed_v1';
const REPORT_FORFEIT_OR_CANCEL_PAY_STATUSES = new Set([
  'Đã hủy',
  'Đã hoàn cọc 100%',
  'Tịch thu cọc 30%',
  'Phạt 50% cọc',
  'Bảo lưu cọc 30%'
]);

function fmtVNDReport(n) {
  return Number(n || 0).toLocaleString('vi-VN') + 'đ';
}

function fmtSignedVNDReport(n) {
  const val = Number(n || 0);
  if (val === 0) return '0đ';
  const absStr = Math.abs(val).toLocaleString('vi-VN') + 'đ';
  return val > 0 ? `+${absStr}` : `−${absStr}`;
}

function fmtDateVNReport(val) {
  const raw = String(val || '').trim();
  if (!raw) return '';
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}:\d{2})(?::\d{2})?)?$/);
  if (m) {
    const base = `${m[3]}/${m[2]}/${m[1]}`;
    return m[4] ? `${base} ${m[4]}` : base;
  }
  const mShort = raw.match(/^(\d{4})-(\d{2})$/);
  if (mShort) return `${mShort[2]}/${mShort[1]}`;
  return raw;
}
window.fmtDateVNReport = fmtDateVNReport;

function fmtDateShortVNReport(val) {
  const vn = fmtDateVNReport(val);
  const m = vn.match(/^(\d{2}\/\d{2})\/\d{4}/);
  return m ? m[1] : vn;
}

function escapeAttrReport(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function normalizeSearchReport(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

function isValidReportMatchBooking(b) {
  if (!b) return false;
  const st = String(b.status || '').trim();
  const pst = String(b.payment_status || '').trim();
  if (st === 'Đã hủy' || st === 'Khách chưa đến') return false;
  if (REPORT_FORFEIT_OR_CANCEL_PAY_STATUSES.has(pst)) return false;
  return true;
}

function fmtLocalISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function computePresetDates(preset) {
  const now = new Date();
  const todayISO = (typeof getLocalTodayISO === 'function') ? getLocalTodayISO() : fmtLocalISO(now);
  if (preset === 'today') return { from: todayISO, to: todayISO };
  if (preset === '7days') {
    const d7 = new Date(now);
    d7.setDate(now.getDate() - 6);
    return { from: fmtLocalISO(d7), to: todayISO };
  }
  if (preset === 'last_month') {
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: fmtLocalISO(lm), to: fmtLocalISO(lEnd) };
  }
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  return { from: firstDay, to: todayISO };
}

function getReportSubtabFromHash() {
  try {
    const raw = String(window.location.hash || '').replace(/^#/, '').trim().toLowerCase();
    return REPORT_SUBTABS.includes(raw) ? raw : 'tong-quan';
  } catch (e) {
    return 'tong-quan';
  }
}

function switchReportSubtab(subtab, opts = {}) {
  const target = REPORT_SUBTABS.includes(String(subtab || '').toLowerCase())
    ? String(subtab).toLowerCase()
    : 'tong-quan';
  currentReportSubtab = target;

  document.querySelectorAll('#tab-content-reports [data-rpt-panel]').forEach(panel => {
    const isAct = panel.getAttribute('data-rpt-panel') === target;
    panel.classList.toggle('hidden', !isAct);
  });

  document.querySelectorAll('#tab-content-reports [data-rpt-subtab]').forEach(btn => {
    const isAct = btn.getAttribute('data-rpt-subtab') === target;
    btn.classList.toggle('is-active', isAct);
    btn.setAttribute('aria-selected', isAct ? 'true' : 'false');
  });

  if (opts.updateHash !== false) {
    try {
      const url = new URL(window.location.href);
      url.hash = `#${target}`;
      window.history.replaceState({}, '', url.toString());
    } catch (e) {}
  }

  if (currentReportData) {
    if (target === 'tong-quan') {
      requestAnimationFrame(() => renderDailyRevenueSVG(currentReportData.dailyRevenue || []));
    } else if (target === 'chi-tiet') {
      requestAnimationFrame(() => renderSlotRevenueSVG(currentReportData.bySlot || []));
    }
  }
}
window.switchReportSubtab = switchReportSubtab;

window.addEventListener('hashchange', () => {
  const reportSection = document.getElementById('tab-content-reports');
  if (!reportSection || reportSection.classList.contains('hidden')) return;
  const raw = String(window.location.hash || '').replace(/^#/, '').trim().toLowerCase();
  if (REPORT_SUBTABS.includes(raw)) {
    switchReportSubtab(raw, { updateHash: false });
  }
});

function getReportKpiCollapsedMap() {
  try {
    const raw = localStorage.getItem(REPORT_KPI_COLLAPSE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch (e) {
    return {};
  }
}

function applyReportKpiCollapsedState() {
  const map = getReportKpiCollapsedMap();
  document.querySelectorAll('#tab-content-reports [data-kpi-card]').forEach(card => {
    const key = card.getAttribute('data-kpi-card');
    if (!key) return;
    const isCollapsed = Boolean(map[key]);
    const body = card.querySelector('.rpt-kpi-body');
    const btn = card.querySelector('[data-kpi-toggle]');
    if (body) body.classList.toggle('hidden', isCollapsed);
    if (btn) {
      btn.textContent = isCollapsed ? '+' : '−';
      btn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
      btn.setAttribute('title', isCollapsed ? 'Mở rộng thẻ' : 'Thu gọn thẻ');
    }
  });
}

window.toggleReportKpiCard = function(key) {
  if (!key) return;
  const map = getReportKpiCollapsedMap();
  map[key] = !map[key];
  try {
    localStorage.setItem(REPORT_KPI_COLLAPSE_KEY, JSON.stringify(map));
  } catch (e) {}
  applyReportKpiCollapsedState();
};

function updatePeriodDisplayBadge(fromDate, toDate) {
  const badge = document.getElementById('rpt-period-badge');
  if (!badge) return;
  const f = fmtDateVNReport(fromDate);
  const t = fmtDateVNReport(toDate);
  if (f && t) {
    badge.textContent = f === t ? f : `${f} – ${t}`;
    badge.classList.remove('hidden');
  } else {
    badge.textContent = '';
    badge.classList.add('hidden');
  }
}

function syncReportFilterUI() {
  document.querySelectorAll('.rpt-preset-btn').forEach(btn => {
    const isAct = btn.getAttribute('data-rpt-preset') === currentReportPreset;
    btn.className = isAct
      ? 'rpt-preset-btn h-8 px-3 rounded-lg border border-[#16A34A] bg-[#16A34A] text-white font-bold cursor-pointer transition-colors'
      : 'rpt-preset-btn h-8 px-3 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#334155] font-semibold cursor-pointer transition-colors';
  });
  const customWrap = document.getElementById('rpt-custom-date-wrap');
  if (customWrap) {
    if (currentReportPreset === 'custom') {
      customWrap.classList.remove('hidden');
      customWrap.classList.add('flex');
    } else {
      customWrap.classList.add('hidden');
      customWrap.classList.remove('flex');
    }
  }
}

function syncReportUrlState(fromDate, toDate) {
  updatePeriodDisplayBadge(fromDate, toDate);
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('r_preset', currentReportPreset);
    if (currentReportPreset === 'custom') {
      if (fromDate) url.searchParams.set('r_from', fromDate); else url.searchParams.delete('r_from');
      if (toDate) url.searchParams.set('r_to', toDate); else url.searchParams.delete('r_to');
    } else {
      url.searchParams.delete('r_from');
      url.searchParams.delete('r_to');
    }
    window.history.replaceState({}, '', url.toString());
  } catch (e) {}
}

function initReportFiltersFromURL() {
  if (currentReportInitialized) return;
  currentReportInitialized = true;
  const fromInput = document.getElementById('rpt-from-date');
  const toInput = document.getElementById('rpt-to-date');
  if (window.SanBongDatePicker && typeof window.SanBongDatePicker.init === 'function') {
    const root = document.getElementById('tab-content-reports');
    if (root) window.SanBongDatePicker.init(root);
  }
  try {
    const url = new URL(window.location.href);
    const p = url.searchParams.get('r_preset');
    const rf = url.searchParams.get('r_from') || '';
    const rt = url.searchParams.get('r_to') || '';
    if (p && ['today', '7days', 'month', 'last_month', 'custom'].includes(p)) {
      currentReportPreset = p;
    } else {
      currentReportPreset = 'month';
    }
    if (currentReportPreset === 'custom' && rf && rt) {
      if (fromInput) fromInput.value = rf;
      if (toInput) toInput.value = rt;
    } else {
      const range = computePresetDates(currentReportPreset === 'custom' ? 'month' : currentReportPreset);
      if (fromInput) fromInput.value = range.from;
      if (toInput) toInput.value = range.to;
    }
  } catch (e) {
    const range = computePresetDates('month');
    if (fromInput) fromInput.value = range.from;
    if (toInput) toInput.value = range.to;
  }
  syncReportFilterUI();
  updatePeriodDisplayBadge(fromInput?.value || '', toInput?.value || '');
  applyReportKpiCollapsedState();
  switchReportSubtab(getReportSubtabFromHash(), { updateHash: false });
}

window.setReportDateRange = function(rangeType) {
  currentReportInitialized = true;
  const fromInput = document.getElementById('rpt-from-date');
  const toInput = document.getElementById('rpt-to-date');
  const errEl = document.getElementById('rpt-date-error');
  if (errEl) errEl.classList.add('hidden');

  if (rangeType === 'custom') {
    currentReportPreset = 'custom';
    if (fromInput && !fromInput.value) {
      const m = computePresetDates('month');
      fromInput.value = m.from;
      if (toInput) toInput.value = m.to;
    }
    syncReportFilterUI();
    syncReportUrlState(fromInput?.value || '', toInput?.value || '');
    renderAdminReports();
    return;
  }

  currentReportPreset = ['today', '7days', 'month', 'last_month'].includes(rangeType) ? rangeType : 'month';
  const range = computePresetDates(currentReportPreset);
  if (fromInput) {
    fromInput.value = range.from;
    fromInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
  if (toInput) {
    toInput.value = range.to;
    toInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
  syncReportFilterUI();
  syncReportUrlState(range.from, range.to);
  renderAdminReports();
};

window.handleReportCustomDateChange = function() {
  const fromVal = (document.getElementById('rpt-from-date')?.value || '').trim();
  const toVal = (document.getElementById('rpt-to-date')?.value || '').trim();
  const errEl = document.getElementById('rpt-date-error');
  if (fromVal && toVal && fromVal > toVal) {
    if (errEl) errEl.classList.remove('hidden');
    return;
  }
  if (errEl) errEl.classList.add('hidden');
  currentReportPreset = 'custom';
  syncReportFilterUI();
  syncReportUrlState(fromVal, toVal);
  renderAdminReports();
};

window.toggleReportExportMenu = function(e) {
  if (e) e.stopPropagation();
  const dd = document.getElementById('rpt-export-dropdown');
  if (!dd) return;
  dd.classList.toggle('hidden');
};

document.addEventListener('click', (e) => {
  const dd = document.getElementById('rpt-export-dropdown');
  const btn = document.getElementById('btn-export-reports-menu');
  if (dd && !dd.classList.contains('hidden') && !dd.contains(e.target) && (!btn || !btn.contains(e.target))) {
    dd.classList.add('hidden');
  }
});

function renderDeltaBadge(elId, pct, invertColor) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (pct === null || pct === undefined || Number.isNaN(Number(pct))) {
    el.className = 'text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-[#64748B]';
    el.textContent = '—';
    return;
  }
  const num = Number(pct);
  const sign = num > 0 ? '+' : '';
  const good = invertColor ? (num <= 0) : (num >= 0);
  el.className = num === 0
    ? 'text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-[#64748B]'
    : (good
      ? 'text-[11px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700'
      : 'text-[11px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700');
  el.textContent = `${sign}${num}%`;
}

function renderStackedBar(barId, legendId, totalId, segments, totalVal) {
  const barEl = document.getElementById(barId);
  const legEl = document.getElementById(legendId);
  const totEl = document.getElementById(totalId);
  const sum = Math.max(0, Number(totalVal || 0));
  if (totEl) totEl.textContent = fmtVNDReport(sum);

  if (!barEl || !legEl) return;
  if (sum <= 0) {
    barEl.innerHTML = '<div class="w-full h-full bg-slate-100"></div>';
    legEl.innerHTML = '<span class="text-[#94A3B8]">Chưa có phát sinh trong kỳ</span>';
    return;
  }

  barEl.innerHTML = segments.map(seg => {
    const val = Math.max(0, Number(seg.value || 0));
    const pct = (val / sum) * 100;
    if (pct <= 0) return '';
    return `<div style="width:${pct.toFixed(2)}%;background:${seg.color}" class="h-full transition-all" title="${escapeSearchHTML(seg.label)}: ${fmtVNDReport(val)} (${pct.toFixed(1)}%)"></div>`;
  }).join('');

  legEl.innerHTML = segments.map(seg => {
    const val = Math.max(0, Number(seg.value || 0));
    const pct = sum > 0 ? ((val / sum) * 100).toFixed(1) : '0.0';
    const valStyle = seg.textColor ? `style="color:${seg.textColor}"` : '';
    return `
      <span class="inline-flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-xs shrink-0" style="background:${seg.color}"></span>
        <span>${escapeSearchHTML(seg.label)}:</span>
        <strong class="text-[#0F172A]" ${valStyle}>${fmtVNDReport(val)}</strong>
        <span class="text-[#64748B]">(${pct}%)</span>
      </span>
    `;
  }).join('');
}

function renderReconciliationPanel(recon) {
  const badgeEl = document.getElementById('rpt-formula-badge');
  const alertEl = document.getElementById('rpt-recon-alert');
  const itemsEl = document.getElementById('rpt-recon-items');
  const deviantsEl = document.getElementById('rpt-recon-deviants');
  const deviantsEmptyEl = document.getElementById('rpt-recon-deviants-empty');
  const dotEl = document.getElementById('rpt-recon-dot');
  if (!recon || !itemsEl) return;

  const checks = [recon.bankCheck, recon.shiftCashCheck, recon.pitchCollectedCheck].filter(Boolean);
  const deviants = Array.isArray(recon.pitchCollectedCheck?.deviantOrders) ? recon.pitchCollectedCheck.deviantOrders : [];
  const mismatchedChecks = checks.filter(c => (c.isMatched !== true) || (Number(c.diff || 0) !== 0));
  const hasAnyIssue = mismatchedChecks.length > 0 || deviants.length > 0;

  if (dotEl) {
    dotEl.classList.toggle('hidden', !hasAnyIssue);
  }

  if (badgeEl) {
    if (mismatchedChecks.length === 0) {
      badgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800';
      badgeEl.textContent = 'Khớp';
    } else {
      badgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300';
      badgeEl.textContent = `Lệch (${mismatchedChecks.length} nguồn)`;
    }
  }

  if (alertEl) {
    if (mismatchedChecks.length === 0) {
      alertEl.classList.add('hidden');
      alertEl.innerHTML = '';
    } else {
      alertEl.classList.remove('hidden');
      const linesHtml = mismatchedChecks.map(c => {
        const diffVal = Number(c.diff || 0);
        const signedStr = fmtSignedVNDReport(diffVal);
        const diffColor = diffVal < 0 ? 'text-rose-700' : 'text-amber-900';
        return `
          <li class="flex flex-wrap items-baseline justify-between gap-2">
            <span>• ${escapeSearchHTML(c.label || '')}</span>
            <strong class="${diffColor} font-mono whitespace-nowrap">${escapeSearchHTML(signedStr)}</strong>
          </li>
        `;
      }).join('');
      alertEl.innerHTML = `
        <div class="font-bold text-amber-900 text-xs">⚠ Cảnh báo chênh lệch từng nguồn đối soát:</div>
        <ul class="space-y-1 text-xs pl-1">${linesHtml}</ul>
        <div class="text-[11px] text-amber-800 pt-1 border-t border-amber-200">
          Lưu ý: Các khoản lệch được theo dõi độc lập theo từng nguồn dữ liệu, <strong>không bù trừ cho nhau</strong>.
        </div>
      `;
    }
  }

  itemsEl.innerHTML = checks.map(c => {
    const diffVal = Number(c.diff || 0);
    const matched = (c.isMatched === true && diffVal === 0);
    let statusCls = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    let statusTxt = 'Khớp';
    let cardBorder = 'border-[#E2E8F0]';

    if (!matched) {
      if (diffVal < 0) {
        statusCls = 'bg-rose-50 text-rose-700 border-rose-200';
        cardBorder = 'border-rose-300';
      } else {
        statusCls = 'bg-amber-50 text-amber-800 border-amber-300';
        cardBorder = 'border-amber-300';
      }
      statusTxt = c.available === false ? 'Lệch (thiếu nguồn)' : `Lệch ${fmtSignedVNDReport(diffVal)}`;
    }

    const metaParts = [];
    if (typeof c.txCount === 'number') metaParts.push(`${c.txCount} GD khớp`);
    if (typeof c.unmatchedCount === 'number' && c.unmatchedCount > 0) metaParts.push(`${c.unmatchedCount} GD chưa khớp`);
    if (typeof c.shiftCount === 'number') metaParts.push(`${c.shiftCount} ca đã chốt`);

    return `
      <div class="p-3 rounded-xl bg-white border ${cardBorder} space-y-2">
        <div class="flex items-start justify-between gap-2">
          <span class="font-bold text-[#0F172A] leading-snug">${escapeSearchHTML(c.label || '')}</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap shrink-0 ${statusCls}">${escapeSearchHTML(statusTxt)}</span>
        </div>
        <div class="text-[11px] text-[#475569] flex items-center justify-between pt-1.5 border-t border-slate-100">
          <span>Nguồn độc lập: <strong class="text-[#0F172A]">${fmtVNDReport(c.sourceTotal)}</strong></span>
          <span>Báo cáo: <strong class="text-[#0F172A]">${fmtVNDReport(c.reportTotal)}</strong></span>
        </div>
        ${metaParts.length ? `<div class="text-[10px] text-[#64748B]">${escapeSearchHTML(metaParts.join(' · '))}</div>` : ''}
      </div>
    `;
  }).join('');

  if (deviantsEl && deviantsEmptyEl) {
    if (deviants.length === 0) {
      deviantsEl.classList.add('hidden');
      deviantsEl.innerHTML = '';
      deviantsEmptyEl.classList.remove('hidden');
    } else {
      deviantsEmptyEl.classList.add('hidden');
      deviantsEl.classList.remove('hidden');
      deviantsEl.innerHTML = `
        <div class="font-bold text-amber-900 text-xs">Đơn có mức cọc khác tỷ lệ chuẩn (${deviants.length} đơn):</div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-[11px] min-w-[640px]">
            <thead class="text-amber-900 border-b border-amber-200">
              <tr>
                <th class="py-1.5 pr-2">Mã đơn</th>
                <th class="py-1.5 pr-2">Ngày &amp; Sân</th>
                <th class="py-1.5 pr-2 text-right">Tổng tiền</th>
                <th class="py-1.5 pr-2 text-right">Cọc ghi nhận</th>
                <th class="py-1.5 pr-2">Ghi chú lệch</th>
                <th class="py-1.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-amber-200/60">
              ${deviants.map(d => `
                <tr>
                  <td class="py-1.5 pr-2 font-mono font-bold"><button type="button" onclick="openInPlayModal('${escapeAttrReport(d.code)}')" class="text-[#0F172A] hover:text-[#16A34A] underline cursor-pointer">#${escapeSearchHTML(d.code)}</button></td>
                  <td class="py-1.5 pr-2 text-[#334155] whitespace-nowrap">${escapeSearchHTML(fmtDateVNReport(d.booking_date))} · ${escapeSearchHTML(d.pitch_name)}</td>
                  <td class="py-1.5 pr-2 text-right font-semibold">${fmtVNDReport(d.total_price)}</td>
                  <td class="py-1.5 pr-2 text-right font-bold text-amber-800">${fmtVNDReport(d.deposit)}</td>
                  <td class="py-1.5 pr-2 text-amber-900">${escapeSearchHTML(d.reason)}</td>
                  <td class="py-1.5 text-right">
                    <button type="button" onclick="openInPlayModal('${escapeAttrReport(d.code)}')" class="px-2.5 py-1 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-[11px] cursor-pointer whitespace-nowrap">Xử lý</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  }
}

function renderDailyRevenueSVG(dailyRevenue) {
  const container = document.getElementById('rpt-daily-svg-container');
  if (!container) return;
  if (!Array.isArray(dailyRevenue) || dailyRevenue.length === 0) {
    container.innerHTML = '<span class="text-xs text-slate-400">Chưa có dữ liệu doanh thu theo ngày trong kỳ.</span>';
    return;
  }

  const w = Math.max(container.clientWidth || 480, dailyRevenue.length * 56);
  const h = 190;
  const paddingBottom = 28;
  const paddingTop = 24;
  const chartH = h - paddingBottom - paddingTop;
  const maxRev = Math.max(1, ...dailyRevenue.map(d => Number(d.revenue || 0)));
  const barWidth = Math.max(16, Math.min(34, Math.floor(w / dailyRevenue.length) - 14));

  const bars = dailyRevenue.map((d, idx) => {
    const rev = Number(d.revenue || 0);
    const col = Number(d.collected || 0);
    const barH = Math.max(4, Math.round((rev / maxRev) * chartH));
    const x = Math.round(idx * (w / dailyRevenue.length) + (w / dailyRevenue.length - barWidth) / 2);
    const y = h - paddingBottom - barH;
    const dateVN = escapeSearchHTML(fmtDateVNReport(d.date));
    const dateLabel = escapeSearchHTML(fmtDateShortVNReport(d.date));
    const shortVal = rev >= 1000000 ? (rev / 1000000).toFixed(1) + 'M' : Math.round(rev / 1000) + 'k';
    const tipText = `Ngày ${dateVN} | Ghi nhận: ${fmtVNDReport(rev)} | Đã thu: ${fmtVNDReport(col)} (${Number(d.matches || 0)} ca)`;

    return `
      <g class="cursor-pointer group">
        <title>${tipText}</title>
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="4" fill="#16A34A" class="transition-opacity hover:opacity-80"></rect>
        <text x="${x + barWidth / 2}" y="${y - 6}" font-size="10" font-weight="bold" fill="#0F172A" text-anchor="middle">${shortVal}</text>
        <text x="${x + barWidth / 2}" y="${h - 10}" font-size="10" fill="#64748B" text-anchor="middle">${dateLabel}</text>
      </g>
    `;
  }).join('');

  container.innerHTML = `
    <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" class="overflow-visible w-full">
      <line x1="0" y1="${h - paddingBottom}" x2="${w}" y2="${h - paddingBottom}" stroke="#E2E8F0" stroke-width="1.5" />
      ${bars}
    </svg>
  `;
}
window.renderDailyRevenueSVG = renderDailyRevenueSVG;

function toggleReportShowAllSlots() {
  currentReportShowAllSlots = !currentReportShowAllSlots;
  if (currentReportData) {
    renderSlotRevenueSVG(currentReportData.bySlot || []);
  }
}
window.toggleReportShowAllSlots = toggleReportShowAllSlots;

function renderSlotRevenueSVG(bySlot) {
  const container = document.getElementById('rpt-slot-svg-container');
  const toggleWrap = document.getElementById('rpt-slot-toggle-wrap');
  if (!container) return;
  if (!Array.isArray(bySlot) || bySlot.length === 0) {
    container.innerHTML = '<span class="text-xs text-slate-400">Chưa có dữ liệu theo khung giờ trong kỳ.</span>';
    if (toggleWrap) {
      toggleWrap.classList.add('hidden');
      toggleWrap.innerHTML = '';
    }
    return;
  }

  const MAX_DEFAULT_SLOTS = 10;
  const visibleSlots = (currentReportShowAllSlots || bySlot.length <= MAX_DEFAULT_SLOTS)
    ? bySlot
    : bySlot.slice(0, MAX_DEFAULT_SLOTS);

  const maxRev = Math.max(1, ...bySlot.map(s => Number(s.revenue || 0)));
  const rowH = 28;
  const svgH = Math.max(120, visibleSlots.length * rowH + 16);
  const labelW = 96;
  const valW = 96;
  const totalW = 520;
  const barMaxW = totalW - labelW - valW - 14;

  const rows = visibleSlots.map((s, idx) => {
    const rev = Number(s.revenue || 0);
    const barW = Math.max(4, Math.round((rev / maxRev) * barMaxW));
    const y = 8 + idx * rowH;
    const safeSlot = escapeSearchHTML(String(s.slot || 'Khác'));
    const tip = `${safeSlot}: ${fmtVNDReport(rev)} (${Number(s.matches || 0)} ca)`;
    return `
      <g class="cursor-pointer">
        <title>${tip}</title>
        <text x="0" y="${y + 14}" font-size="11" font-weight="600" fill="#334155">${safeSlot}</text>
        <rect x="${labelW}" y="${y + 3}" width="${barMaxW}" height="15" rx="4" fill="#F1F5F9" />
        <rect x="${labelW}" y="${y + 3}" width="${barW}" height="15" rx="4" fill="#0F172A" />
        <text x="${totalW}" y="${y + 14}" font-size="11" font-weight="700" fill="#0F172A" text-anchor="end">${fmtVNDReport(rev)}</text>
      </g>
    `;
  }).join('');

  container.innerHTML = `
    <svg width="100%" height="${svgH}" viewBox="0 0 ${totalW} ${svgH}" preserveAspectRatio="xMidYMin meet" class="w-full">
      ${rows}
    </svg>
  `;

  if (toggleWrap) {
    if (bySlot.length > MAX_DEFAULT_SLOTS) {
      const rem = bySlot.length - MAX_DEFAULT_SLOTS;
      toggleWrap.classList.remove('hidden');
      toggleWrap.innerHTML = `
        <button type="button" onclick="toggleReportShowAllSlots()" class="px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-50 text-xs font-semibold text-[#0F172A] cursor-pointer">
          ${currentReportShowAllSlots ? 'Thu gọn khung giờ ↑' : `Xem thêm (${rem} khung giờ) ↓`}
        </button>
      `;
    } else {
      toggleWrap.classList.add('hidden');
      toggleWrap.innerHTML = '';
    }
  }
}
window.renderSlotRevenueSVG = renderSlotRevenueSVG;

function sortAdminPitchTable(key) {
  if (currentReportPitchSort.key === key) {
    currentReportPitchSort.dir = currentReportPitchSort.dir === 'desc' ? 'asc' : 'desc';
  } else {
    currentReportPitchSort = { key, dir: key === 'name' ? 'asc' : 'desc' };
  }
  document.querySelectorAll('[data-sort-ind]').forEach(el => {
    const k = el.getAttribute('data-sort-ind');
    el.textContent = k === currentReportPitchSort.key ? (currentReportPitchSort.dir === 'desc' ? '↓' : '↑') : '';
  });
  renderAdminPitchTable();
}
window.sortAdminPitchTable = sortAdminPitchTable;

function renderAdminPitchTable() {
  const tbody = document.getElementById('admin-reports-tbody');
  const tfoot = document.getElementById('admin-reports-tfoot');
  if (!tbody) return;

  const showZero = Boolean(document.getElementById('rpt-show-zero-pitches')?.checked);
  const rows = showZero
    ? [...currentReportPitchRows]
    : currentReportPitchRows.filter(p => Number(p.matches || 0) > 0 || Number(p.revenue || 0) > 0);

  const { key, dir } = currentReportPitchSort;
  rows.sort((a, b) => {
    if (key === 'name') {
      const cmp = String(a.name || '').localeCompare(String(b.name || ''), 'vi');
      return dir === 'asc' ? cmp : -cmp;
    }
    const diff = Number(a[key] || 0) - Number(b[key] || 0);
    return dir === 'asc' ? diff : -diff;
  });

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-[#94A3B8]">Không có sân nào phát sinh ca trong kỳ (bật "Hiện tất cả sân" để xem toàn bộ sân).</td></tr>';
    if (tfoot) tfoot.innerHTML = '';
    return;
  }

  let sumMatches = 0, sumCollected = 0, sumRevenue = 0;
  tbody.innerHTML = rows.map(p => {
    const m = Number(p.matches || 0);
    const occ = Number(p.occupancyRate || 0);
    const col = Number(p.collectedRevenue || 0);
    const rev = Number(p.revenue || 0);
    sumMatches += m;
    sumCollected += col;
    sumRevenue += rev;
    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="py-3 px-4 font-bold text-[#0F172A]">${escapeSearchHTML(p.name)}</td>
        <td class="py-3 px-4 text-[#475569]">${escapeSearchHTML(p.typeName || p.type_name || '')}</td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded text-[11px] font-bold ${p.status === 'Bảo trì' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'}">
            ${escapeSearchHTML(p.status)}
          </span>
        </td>
        <td class="py-3 px-4 text-center font-bold text-[#334155]">${m} ca</td>
        <td class="py-3 px-4 text-right font-semibold text-[#334155]">${occ.toFixed(1)}%</td>
        <td class="py-3 px-4 text-right font-bold text-[#16A34A]">${fmtVNDReport(col)}</td>
        <td class="py-3 px-4 text-right font-extrabold text-[#0F172A]">${fmtVNDReport(rev)}</td>
      </tr>
    `;
  }).join('');

  if (tfoot) {
    tfoot.innerHTML = `
      <tr>
        <td colspan="3" class="py-3 px-4">Tổng cộng (${rows.length} sân)</td>
        <td class="py-3 px-4 text-center">${sumMatches} ca</td>
        <td class="py-3 px-4 text-right">—</td>
        <td class="py-3 px-4 text-right text-[#16A34A]">${fmtVNDReport(sumCollected)}</td>
        <td class="py-3 px-4 text-right">${fmtVNDReport(sumRevenue)}</td>
      </tr>
    `;
  }
}
window.renderAdminPitchTable = renderAdminPitchTable;

window.openUncollectedDrawer = function(mode) {
  const modal = document.getElementById('rpt-uncollected-modal');
  const titleEl = document.getElementById('rpt-uncollected-modal-title');
  const subEl = document.getElementById('rpt-uncollected-modal-sub');
  const tbody = document.getElementById('rpt-uncollected-tbody');
  if (!modal || !tbody) return;

  const list = mode === 'overdue' ? currentReportUncollectedOverdue : currentReportUncollectedUpcoming;
  if (titleEl) {
    titleEl.textContent = mode === 'overdue'
      ? 'Đã đá nhưng chưa tất toán (cần xử lý)'
      : 'Chưa đến giờ đá (dự kiến thu tại sân)';
  }
  if (subEl) {
    const sum = list.reduce((acc, i) => acc + Number(i.uncollected || 0), 0);
    subEl.textContent = `${list.length} đơn · Tổng chưa thu: ${fmtVNDReport(sum)}`;
  }

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="py-6 text-center text-[#94A3B8]">Không có đơn nào trong nhóm này.</td></tr>';
  } else {
    tbody.innerHTML = list.map(i => `
      <tr class="hover:bg-slate-50">
        <td class="py-2.5 px-3 font-mono font-bold text-[#0F172A]">#${escapeSearchHTML(i.code)}</td>
        <td class="py-2.5 px-3 whitespace-nowrap text-[#334155]">${escapeSearchHTML(fmtDateVNReport(i.booking_date))} <span class="text-[#64748B]">(${escapeSearchHTML(i.slot_time)})</span></td>
        <td class="py-2.5 px-3">
          <div class="font-bold text-[#0F172A]">${escapeSearchHTML(i.pitch_name)}</div>
          <div class="text-[11px] text-[#64748B]">${escapeSearchHTML(i.customer_name)} · ${escapeSearchHTML(i.phone)}</div>
        </td>
        <td class="py-2.5 px-3 text-right font-bold text-[#16A34A]">${fmtVNDReport(i.paid_amount)}</td>
        <td class="py-2.5 px-3 text-right font-extrabold rpt-text-orange" style="color:#ea580c">${fmtVNDReport(i.uncollected)}</td>
        <td class="py-2.5 px-3 text-right">
          <button type="button" onclick="closeUncollectedDrawer();openInPlayModal('${escapeAttrReport(i.code)}')" class="px-2.5 py-1 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-[11px] cursor-pointer">Xem đơn</button>
        </td>
      </tr>
    `).join('');
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
};

window.closeUncollectedDrawer = function() {
  const modal = document.getElementById('rpt-uncollected-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};

window.goToOverdueBookingsFilter = function() {
  const statusSelect = document.getElementById('rpt-ledger-status-filter');
  const searchInput = document.getElementById('rpt-ledger-search');
  if (statusSelect) statusSelect.value = 'overdue';
  if (searchInput) searchInput.value = '';
  handleReportLedgerSearch();
  switchReportSubtab('chi-tiet');
  requestAnimationFrame(() => {
    document.getElementById('rpt-ledger-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
};

window.resetReportLedgerFilters = function() {
  const statusSelect = document.getElementById('rpt-ledger-status-filter');
  const searchInput = document.getElementById('rpt-ledger-search');
  if (statusSelect) statusSelect.value = 'all';
  if (searchInput) searchInput.value = '';
  handleReportLedgerSearch();
};

function renderForfeitBookingsNotice() {
  const box = document.getElementById('rpt-forfeit-bookings-box');
  if (!box) return;
  if (!Array.isArray(currentReportForfeitBookings) || currentReportForfeitBookings.length === 0) {
    box.classList.add('hidden');
    box.innerHTML = '';
    return;
  }
  const totalRetained = currentReportForfeitBookings.reduce((acc, b) => acc + Number(b.paid_amount || 0), 0);
  box.classList.remove('hidden');
  box.innerHTML = `
    <details class="rounded-xl bg-slate-50 border border-slate-200 p-3">
      <summary class="cursor-pointer font-semibold text-[#334155] flex flex-wrap items-center justify-between gap-2 select-none">
        <span>Đơn hủy / không đến có giữ cọc (không tính vào Ca thi đấu): <strong>${currentReportForfeitBookings.length} đơn</strong></span>
        <span class="font-bold text-[#0F172A]">Đã thu giữ cọc: ${fmtVNDReport(totalRetained)}</span>
      </summary>
      <div class="mt-2.5 overflow-x-auto">
        <table class="w-full text-left text-[11px] min-w-[600px]">
          <thead class="text-[#475569] border-b border-slate-200">
            <tr>
              <th class="py-1.5 pr-2">Mã đơn</th>
              <th class="py-1.5 pr-2">Ngày &amp; Sân</th>
              <th class="py-1.5 pr-2">Khách hàng</th>
              <th class="py-1.5 pr-2">Trạng thái</th>
              <th class="py-1.5 text-right">Tiền giữ cọc</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            ${currentReportForfeitBookings.map(b => `
              <tr>
                <td class="py-1.5 pr-2 font-mono font-bold"><button type="button" onclick="openInPlayModal('${escapeAttrReport(b.code || '')}')" class="text-[#0F172A] hover:text-[#16A34A] underline cursor-pointer">${escapeSearchHTML(b.code || '')}</button></td>
                <td class="py-1.5 pr-2 text-[#334155] whitespace-nowrap">${escapeSearchHTML(fmtDateVNReport(b.booking_date || ''))} · ${escapeSearchHTML(b.pitch_name || b.pitch_id || '')}</td>
                <td class="py-1.5 pr-2">${escapeSearchHTML(b.customer_name || '')}</td>
                <td class="py-1.5 pr-2">${escapeSearchHTML(b.status || '')} (${escapeSearchHTML(b.payment_status || '')})</td>
                <td class="py-1.5 text-right font-bold text-[#16A34A]">${fmtVNDReport(b.paid_amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </details>
  `;
}

function renderReportLedger() {
  const tbody = document.getElementById('rpt-ledger-tbody');
  if (!tbody) return;
  const totalItems = currentReportLedgerFiltered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / REPORT_LEDGER_PAGE_SIZE));
  if (currentReportLedgerPage > totalPages) currentReportLedgerPage = totalPages;
  if (currentReportLedgerPage < 1) currentReportLedgerPage = 1;

  const startIdx = (currentReportLedgerPage - 1) * REPORT_LEDGER_PAGE_SIZE;
  const pageItems = currentReportLedgerFiltered.slice(startIdx, startIdx + REPORT_LEDGER_PAGE_SIZE);

  const countInfo = document.getElementById('rpt-ledger-count-info');
  if (countInfo) countInfo.textContent = `Hiển thị ${pageItems.length ? startIdx + 1 : 0} - ${startIdx + pageItems.length} / ${totalItems} ca`;
  const pageInfo = document.getElementById('rpt-ledger-page-info');
  if (pageInfo) pageInfo.textContent = `Trang ${currentReportLedgerPage} / ${totalPages}`;
  const prevBtn = document.getElementById('rpt-ledger-prev-btn');
  if (prevBtn) prevBtn.disabled = (currentReportLedgerPage <= 1);
  const nextBtn = document.getElementById('rpt-ledger-next-btn');
  if (nextBtn) nextBtn.disabled = (currentReportLedgerPage >= totalPages);

  if (pageItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="py-6 text-center text-[#94A3B8]">Không tìm thấy ca đặt sân nào phù hợp.</td></tr>';
    return;
  }

  tbody.innerHTML = pageItems.map(b => {
    const stRaw = String(b.status || '').trim();
    const isCompleted = (stRaw === 'Hoàn thành' || stRaw.toLowerCase() === 'completed');
    const isOverdueRow = stRaw === 'Đã đá - chưa tất toán' || currentReportOverdueCodes.has(String(b.code || '').trim());
    const statusBadge = isCompleted
      ? '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700">Hoàn thành</span>'
      : (isOverdueRow
        ? `<span class="px-2 py-0.5 rounded text-[11px] font-bold rpt-badge-orange" style="background-color:#FFF7ED;color:#ea580c;border:1px solid #FED7AA">${escapeSearchHTML(stRaw || 'Đã đá - chưa tất toán')}</span>`
        : `<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-[#334155]">${escapeSearchHTML(stRaw)}</span>`);
    const paidVal = Number(b.paid_amount ?? (Number(b.total_price || 0) - Number(b.remaining_amount || 0)));
    const uncolVal = Number(b.remaining_amount || 0);
    const uncolHtml = uncolVal > 0
      ? `<td class="py-2.5 px-3 text-right font-bold rpt-text-orange" style="color:#ea580c">${fmtVNDReport(uncolVal)}</td>`
      : `<td class="py-2.5 px-3 text-right font-semibold text-[#64748B]">${fmtVNDReport(0)}</td>`;

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="py-2.5 px-3 font-mono font-bold"><button type="button" onclick="openInPlayModal('${escapeAttrReport(b.code || '')}')" class="text-[#0F172A] hover:text-[#16A34A] hover:underline cursor-pointer">${escapeSearchHTML(b.code || '')}</button></td>
        <td class="py-2.5 px-3 text-[#334155] whitespace-nowrap">${escapeSearchHTML(fmtDateVNReport(b.booking_date || ''))} <span class="text-[#64748B]">(${escapeSearchHTML(b.slot_time || '')})</span></td>
        <td class="py-2.5 px-3 font-semibold text-[#0F172A]">${escapeSearchHTML(b.pitch_name || b.pitch_id || '')}</td>
        <td class="py-2.5 px-3">
          <div class="font-bold text-[#0F172A]">${escapeSearchHTML(b.customer_name || 'Khách vãng lai')}</div>
          <div class="text-[11px] text-[#64748B] font-mono">${escapeSearchHTML(b.phone || '')}</div>
        </td>
        <td class="py-2.5 px-3 text-right font-extrabold text-[#0F172A]">${fmtVNDReport(b.total_price)}</td>
        <td class="py-2.5 px-3 text-right font-bold text-[#16A34A]">${fmtVNDReport(paidVal)}</td>
        ${uncolHtml}
        <td class="py-2.5 px-3 text-right text-[#475569] font-semibold">${fmtVNDReport(b.service_price)}</td>
        <td class="py-2.5 px-3">${statusBadge}</td>
        <td class="py-2.5 px-3 text-xs text-[#475569] max-w-[140px] truncate" title="${escapeSearchHTML(b.payment_method || '')}">${escapeSearchHTML(b.payment_method || '')}</td>
      </tr>
    `;
  }).join('');
}
window.renderReportLedger = renderReportLedger;

function applyReportLedgerFilters(resetPage = true) {
  const qRaw = (document.getElementById('rpt-ledger-search')?.value || '').trim();
  const qNorm = normalizeSearchReport(qRaw);
  const statusFilter = (document.getElementById('rpt-ledger-status-filter')?.value || 'all').trim();

  const chipEl = document.getElementById('rpt-ledger-filter-chip');
  const chipTxtEl = document.getElementById('rpt-ledger-filter-chip-text');
  if (chipEl && chipTxtEl) {
    const labels = {
      overdue: 'Đang lọc: Đã đá chưa tất toán (cần xử lý)',
      uncollected: 'Đang lọc: Ca còn số tiền chưa thu (> 0đ)',
      completed: 'Đang lọc: Ca đã hoàn thành'
    };
    if (statusFilter !== 'all' && labels[statusFilter]) {
      chipTxtEl.textContent = labels[statusFilter];
      chipEl.classList.remove('hidden');
      chipEl.classList.add('flex');
    } else {
      chipEl.classList.add('hidden');
      chipEl.classList.remove('flex');
    }
  }

  currentReportLedgerFiltered = currentReportLedgerBookings.filter(b => {
    if (statusFilter === 'overdue') {
      const code = String(b.code || '').trim();
      const st = String(b.status || '').trim();
      if (!currentReportOverdueCodes.has(code) && st !== 'Đã đá - chưa tất toán') return false;
    } else if (statusFilter === 'uncollected') {
      if (Number(b.remaining_amount || 0) <= 0) return false;
    } else if (statusFilter === 'completed') {
      const st = String(b.status || '').trim();
      if (st !== 'Hoàn thành' && st.toLowerCase() !== 'completed') return false;
    }

    if (!qNorm) return true;
    return (
      normalizeSearchReport(b.code).includes(qNorm) ||
      normalizeSearchReport(b.customer_name).includes(qNorm) ||
      normalizeSearchReport(b.phone).includes(qNorm) ||
      normalizeSearchReport(b.pitch_name).includes(qNorm) ||
      normalizeSearchReport(b.pitch_id).includes(qNorm)
    );
  });

  if (resetPage) currentReportLedgerPage = 1;
  renderReportLedger();
}

function handleReportLedgerSearch() {
  applyReportLedgerFilters(true);
}
window.handleReportLedgerSearch = handleReportLedgerSearch;

function changeReportLedgerPage(delta) {
  currentReportLedgerPage += delta;
  renderReportLedger();
}
window.changeReportLedgerPage = changeReportLedgerPage;

async function renderAdminReports() {
  if (!isManagerOrAdmin()) return;
  initReportFiltersFromURL();

  const fromDate = (document.getElementById('rpt-from-date')?.value || '').trim();
  const toDate = (document.getElementById('rpt-to-date')?.value || '').trim();
  const errEl = document.getElementById('rpt-date-error');
  if (fromDate && toDate && fromDate > toDate) {
    if (errEl) errEl.classList.remove('hidden');
    return;
  }
  if (errEl) errEl.classList.add('hidden');
  updatePeriodDisplayBadge(fromDate, toDate);

  const qs = new URLSearchParams({ action: 'reports' });
  if (fromDate) qs.set('from', fromDate);
  if (toDate) qs.set('to', toDate);
  const r = await adminFetchJson(`../api/admin.php?${qs.toString()}`);
  const d = (r.ok && r.data) ? r.data : null;
  if (!d) return;

  currentReportData = d;
  const s = d.summary || d;
  const recognized = Number(s.recognizedRevenue ?? s.totalRevenue ?? 0);
  const collected = Number(s.collectedRevenue ?? 0);
  const uncollected = Number(s.uncollectedRevenue ?? Math.max(0, recognized - collected));
  const uncolUpcoming = Number(s.uncollectedUpcoming ?? 0);
  const uncolOverdue = Number(s.uncollectedOverdue ?? 0);
  const cashRev = Number(s.cashRevenue ?? 0);
  const vietqrRev = Number(s.transferRevenue ?? s.vietqrRevenue ?? 0);
  const pitchRec = Number(s.pitchRecognizedRevenue ?? Math.max(0, recognized - Number(s.servicesRevenue ?? 0)));
  const servicesRec = Number(s.servicesRevenue ?? s.serviceRevenue ?? 0);
  const totalExpenses = Number(s.totalExpenses ?? 0);
  const netProfit = Number(s.netProfit ?? (collected - totalExpenses));

  const rawDetailed = Array.isArray(d.detailedBookings) ? d.detailedBookings : [];
  const validMatchBookings = rawDetailed.filter(isValidReportMatchBooking);
  currentReportForfeitBookings = rawDetailed.filter(b => !isValidReportMatchBooking(b));
  const totalMatches = Array.isArray(d.detailedBookings)
    ? validMatchBookings.length
    : Number(s.totalMatches ?? 0);
  const occupancyRate = Number(s.occupancyRate ?? 0);
  const avgRev = totalMatches > 0
    ? (Array.isArray(d.detailedBookings) ? Math.round(recognized / totalMatches) : Number(s.avgRevenue ?? 0))
    : 0;

  const emptyEl = document.getElementById('rpt-empty-state');
  if (emptyEl) {
    const isEmpty = (recognized === 0 && totalMatches === 0 && totalExpenses === 0);
    emptyEl.classList.toggle('hidden', !isEmpty);
  }

  const setTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

  // Hàng 1: 4 thẻ KPI
  setTxt('rpt-total-revenue', fmtVNDReport(recognized));
  setTxt('rpt-collected-revenue', fmtVNDReport(collected));
  setTxt('rpt-uncollected-revenue', fmtVNDReport(uncollected));
  setTxt('rpt-uncollected-upcoming', fmtVNDReport(uncolUpcoming));
  setTxt('rpt-uncollected-overdue', fmtVNDReport(uncolOverdue));

  const profitEl = document.getElementById('rpt-net-profit');
  const profitNoteEl = document.getElementById('rpt-profit-note');
  const deltas = d.deltas || {};

  if (totalExpenses <= 0) {
    if (profitEl) {
      profitEl.textContent = '—';
      profitEl.className = 'font-heading font-extrabold text-2xl text-[#475569] mt-1.5';
    }
    if (profitNoteEl) {
      profitNoteEl.innerHTML = 'Chưa nhập chi phí · <a href="#chi-phi" onclick="switchReportSubtab(\'chi-phi\');return false;" class="text-[#16A34A] font-semibold hover:underline">Mở sổ chi →</a>';
    }
    renderDeltaBadge('rpt-delta-profit', null, false);
  } else {
    if (profitEl) {
      profitEl.textContent = fmtVNDReport(netProfit);
      profitEl.className = `font-heading font-extrabold text-2xl mt-1.5 ${netProfit < 0 ? 'text-rose-600' : 'text-[#16A34A]'}`;
    }
    if (profitNoteEl) {
      const margin = collected > 0 ? ((netProfit / collected) * 100).toFixed(1) : '0.0';
      profitNoteEl.textContent = `Cơ sở Đã thu − Chi phí (biên ${margin}%)`;
    }
    renderDeltaBadge('rpt-delta-profit', deltas.profitPct, false);
  }

  renderDeltaBadge('rpt-delta-recognized', deltas.recognizedPct, false);
  renderDeltaBadge('rpt-delta-collected', deltas.collectedPct, false);
  renderDeltaBadge('rpt-delta-uncollected', deltas.uncollectedPct, true);

  // Thẻ vận hành ở tab #chi-tiet & chi phí ở tab #chi-phi
  setTxt('rpt-total-matches', `${totalMatches} ca`);
  setTxt('rpt-occupancy-rate', `${occupancyRate.toFixed(1)}%`);
  const occSub = document.getElementById('rpt-occupancy-sub');
  if (occSub) {
    occSub.textContent = `${Number(s.totalBookedHours || 0)}h / ${Number(s.totalAvailableHours || 0)}h (${Number(s.activePitchesCount || 0)} sân hoạt động)`;
  }
  setTxt('rpt-avg-revenue', fmtVNDReport(avgRev));

  const expValEl = document.getElementById('rpt-total-expenses');
  const expSubEl = document.getElementById('rpt-expenses-sub');
  if (totalExpenses <= 0) {
    if (expValEl) expValEl.textContent = '—';
    if (expSubEl) expSubEl.textContent = 'Chưa nhập chi phí trong kỳ lọc';
  } else {
    if (expValEl) expValEl.textContent = fmtVNDReport(totalExpenses);
    if (expSubEl) expSubEl.textContent = 'Tổng chi vận hành kỳ lọc';
  }
  setTxt('rpt-expense-list-total', totalExpenses > 0 ? fmtVNDReport(totalExpenses) : 'Chưa nhập chi phí');

  // 2 Thanh xếp chồng (đồng bộ #ea580c cho Chưa thu, #16A34A cho Đã thu)
  renderStackedBar('rpt-stack-pay-bar', 'rpt-stack-pay-legend', 'rpt-stack-pay-total', [
    { label: 'Chuyển khoản VietQR', value: vietqrRev, color: '#16A34A' },
    { label: 'Tiền mặt', value: cashRev, color: '#0F172A' },
    { label: 'Chưa thu', value: uncollected, color: '#ea580c', textColor: '#ea580c' }
  ], recognized);

  renderStackedBar('rpt-stack-rev-bar', 'rpt-stack-rev-legend', 'rpt-stack-rev-total', [
    { label: 'Tiền sân', value: pitchRec, color: '#0F172A' },
    { label: 'Dịch vụ & Nước', value: servicesRec, color: '#64748B' }
  ], recognized);

  // Đối soát độc lập 3 nguồn
  renderReconciliationPanel(d.reconciliation);

  // Danh sách chưa thu
  currentReportUncollectedUpcoming = Array.isArray(d.uncollectedUpcomingList) ? d.uncollectedUpcomingList : [];
  currentReportUncollectedOverdue = Array.isArray(d.uncollectedOverdueList) ? d.uncollectedOverdueList : [];
  currentReportOverdueCodes = new Set(
    currentReportUncollectedOverdue.map(x => String(x.code || '').trim()).filter(Boolean)
  );

  // 2 biểu đồ SVG cục bộ
  renderDailyRevenueSVG(d.dailyRevenue || []);
  renderSlotRevenueSVG(d.bySlot || []);

  // Bảng hiệu suất theo sân
  currentReportPitchRows = Array.isArray(d.byPitch) ? d.byPitch : [];
  renderAdminPitchTable();

  // Bảng kê chi tiết (thống nhất cùng nguồn ca thi đấu hợp lệ)
  currentReportLedgerBookings = validMatchBookings;
  applyReportLedgerFilters(true);
  renderForfeitBookingsNotice();

  // Chi phí theo danh mục
  const expChartEl = document.getElementById('rpt-expense-categories-chart');
  const expensesByCategory = Array.isArray(d.expensesByCategory) ? d.expensesByCategory : [];
  if (expChartEl) {
    if (expensesByCategory.length === 0) {
      expChartEl.innerHTML = '<div class="py-3 text-center text-[#94A3B8]">Chưa có khoản chi vận hành nào trong kỳ lọc.</div>';
    } else {
      const maxExp = Math.max(1, ...expensesByCategory.map(c => Number(c.amount || 0)));
      const totalExpForPct = Math.max(1, expensesByCategory.reduce((acc, c) => acc + Number(c.amount || 0), 0));
      expChartEl.innerHTML = expensesByCategory.map(c => {
        const amt = Number(c.amount || 0);
        const wPct = Math.max(4, Math.round((amt / maxExp) * 100));
        const sharePct = ((amt / totalExpForPct) * 100).toFixed(1);
        return `
          <div class="space-y-1">
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-[#0F172A]">${escapeSearchHTML(c.categoryName || c.category || '')} <span class="text-[#64748B] font-normal">(${Number(c.count || 0)} khoản)</span></span>
              <span class="font-extrabold text-[#0F172A]">${fmtVNDReport(amt)} <span class="text-[#64748B] font-normal">(${sharePct}%)</span></span>
            </div>
            <div class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div class="h-full bg-[#0F172A] rounded-full transition-all" style="width:${wPct}%"></div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  applyReportKpiCollapsedState();

  if (typeof loadAdminExpenses === 'function') {
    await loadAdminExpenses();
  }
}
window.renderAdminReports = renderAdminReports;

async function exportAdminReportsCSV(format) {
  const dd = document.getElementById('rpt-export-dropdown');
  if (dd) dd.classList.add('hidden');

  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền xuất báo cáo doanh thu!', 'error');
    return;
  }

  const fmt = (format === 'excel' || format === 'xls') ? 'excel' : 'csv';
  const fromDate = (document.getElementById('rpt-from-date')?.value || '').trim();
  const toDate = (document.getElementById('rpt-to-date')?.value || '').trim();

  try {
    const qs = new URLSearchParams({ action: 'export_reports_csv', format: fmt });
    if (fromDate) qs.set('from', fromDate);
    if (toDate) qs.set('to', toDate);
    const res = await fetch(`../api/admin.php?${qs.toString()}`, { cache: 'no-store', credentials: 'same-origin' });
    if (res.status === 401 && !window._adminRedirecting401) {
      window._adminRedirecting401 = true;
      try {
        sessionStorage.removeItem('sb_current_user');
        sessionStorage.removeItem('sb_csrf_token');
        localStorage.removeItem('sb_current_user');
      } catch (e) {}
      const loginUrl = (window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath('login') : '../login') + '?redirect=portal-admin&expired=1';
      window.location.replace(loginUrl);
      return;
    }
    if (res.ok) {
      const ct = String(res.headers.get('content-type') || '').toLowerCase();
      if (ct.includes('text/csv') || ct.includes('application/vnd.ms-excel') || ct.includes('application/octet-stream')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Bao_Cao_Doanh_Thu_${fromDate || 'all'}_${toDate || 'all'}.${fmt === 'excel' ? 'xls' : 'csv'}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        if (window.SanBongApp?.showToast) {
          window.SanBongApp.showToast(`Đã xuất file báo cáo (${fmt.toUpperCase()}) thành công!`, 'success', 3000);
        }
        return;
      }
    }
  } catch (e) {}

  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast('Không thể xuất báo cáo từ máy chủ, vui lòng thử lại.', 'error', 3500);
  }
}
window.exportAdminReportsCSV = exportAdminReportsCSV;
