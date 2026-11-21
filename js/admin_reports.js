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

function fmtVNDReport(n) {
  return Number(n || 0).toLocaleString('vi-VN') + 'đ';
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
  // default: 'month'
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  return { from: firstDay, to: todayISO };
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
      : 'text-[11px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700');
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
    return `
      <span class="inline-flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-xs shrink-0" style="background:${seg.color}"></span>
        <span>${escapeSearchHTML(seg.label)}:</span>
        <strong class="text-[#0F172A]">${fmtVNDReport(val)}</strong>
        <span class="text-[#64748B]">(${pct}%)</span>
      </span>
    `;
  }).join('');
}

function renderReconciliationPanel(recon) {
  const badgeEl = document.getElementById('rpt-formula-badge');
  const detailsEl = document.getElementById('rpt-recon-details');
  const itemsEl = document.getElementById('rpt-recon-items');
  const deviantsEl = document.getElementById('rpt-recon-deviants');
  if (!recon || !itemsEl) return;

  const checks = [recon.bankCheck, recon.shiftCashCheck, recon.pitchCollectedCheck].filter(Boolean);
  const allMatched = recon.isMatched === true;
  const totalDiff = checks.reduce((acc, c) => acc + Math.abs(Number(c.diff || 0)), 0);

  if (badgeEl) {
    if (allMatched) {
      badgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800';
      badgeEl.textContent = 'Khớp (0đ lệch)';
    } else {
      badgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800';
      badgeEl.textContent = `Lệch ${fmtVNDReport(totalDiff)}`;
    }
  }
  if (detailsEl) {
    detailsEl.open = !allMatched;
  }

  itemsEl.innerHTML = checks.map(c => {
    const matched = c.isMatched === true;
    const statusCls = matched ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200';
    const statusTxt = matched ? 'Khớp' : `Lệch ${c.diff > 0 ? '+' : ''}${fmtVNDReport(c.diff)}`;
    return `
      <div class="p-3 rounded-xl bg-white border ${matched ? 'border-[#E2E8F0]' : 'border-amber-300'} space-y-1.5">
        <div class="flex items-start justify-between gap-2">
          <span class="font-bold text-[#0F172A] leading-snug">${escapeSearchHTML(c.label || '')}</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap shrink-0 ${statusCls}">${statusTxt}</span>
        </div>
        <div class="text-[11px] text-[#475569] flex items-center justify-between pt-1 border-t border-slate-100">
          <span>Nguồn độc lập: <strong class="text-[#0F172A]">${fmtVNDReport(c.sourceTotal)}</strong></span>
          <span>Báo cáo: <strong class="text-[#0F172A]">${fmtVNDReport(c.reportTotal)}</strong></span>
        </div>
      </div>
    `;
  }).join('');

  const deviants = recon.pitchCollectedCheck?.deviantOrders || [];
  if (deviantsEl) {
    if (deviants.length === 0) {
      deviantsEl.classList.add('hidden');
      deviantsEl.innerHTML = '';
    } else {
      deviantsEl.classList.remove('hidden');
      deviantsEl.innerHTML = `
        <div class="font-bold text-amber-900 text-xs">Đơn có mức cọc khác tỷ lệ chuẩn (${deviants.length} đơn):</div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-[11px] min-w-[560px]">
            <thead class="text-amber-900 border-b border-amber-200">
              <tr>
                <th class="py-1.5 pr-2">Mã đơn</th>
                <th class="py-1.5 pr-2">Ngày &amp; Sân</th>
                <th class="py-1.5 pr-2 text-right">Tổng tiền</th>
                <th class="py-1.5 pr-2 text-right">Cọc ghi nhận</th>
                <th class="py-1.5">Ghi chú lệch</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-amber-200/60">
              ${deviants.slice(0, 15).map(d => `
                <tr>
                  <td class="py-1.5 pr-2 font-mono font-bold"><button type="button" onclick="openInPlayModal('${escapeSearchHTML(d.code)}')" class="text-[#0F172A] hover:text-[#16A34A] underline cursor-pointer">#${escapeSearchHTML(d.code)}</button></td>
                  <td class="py-1.5 pr-2 text-[#334155]">${escapeSearchHTML(d.booking_date)} · ${escapeSearchHTML(d.pitch_name)}</td>
                  <td class="py-1.5 pr-2 text-right font-semibold">${fmtVNDReport(d.total_price)}</td>
                  <td class="py-1.5 pr-2 text-right font-bold text-amber-800">${fmtVNDReport(d.deposit)}</td>
                  <td class="py-1.5 text-amber-900">${escapeSearchHTML(d.reason)}</td>
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

  const w = Math.max(container.clientWidth || 400, dailyRevenue.length * 56);
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
    const safeDate = escapeSearchHTML(String(d.date || ''));
    const dateLabel = safeDate.slice(5).replace('-', '/');
    const shortVal = rev >= 1000000 ? (rev / 1000000).toFixed(1) + 'M' : Math.round(rev / 1000) + 'k';
    const tipText = `Ngày ${safeDate} | Ghi nhận: ${fmtVNDReport(rev)} | Đã thu: ${fmtVNDReport(col)} (${Number(d.matches || 0)} ca)`;

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

function renderSlotRevenueSVG(bySlot) {
  const container = document.getElementById('rpt-slot-svg-container');
  if (!container) return;
  if (!Array.isArray(bySlot) || bySlot.length === 0) {
    container.innerHTML = '<span class="text-xs text-slate-400">Chưa có dữ liệu theo khung giờ trong kỳ.</span>';
    return;
  }

  const maxRev = Math.max(1, ...bySlot.map(s => Number(s.revenue || 0)));
  const rowH = 26;
  const svgH = Math.max(160, bySlot.length * rowH + 16);
  const labelW = 92;
  const valW = 86;
  const totalW = 420;
  const barMaxW = totalW - labelW - valW - 12;

  const rows = bySlot.map((s, idx) => {
    const rev = Number(s.revenue || 0);
    const barW = Math.max(4, Math.round((rev / maxRev) * barMaxW));
    const y = 8 + idx * rowH;
    const safeSlot = escapeSearchHTML(String(s.slot || 'Khác'));
    const tip = `${safeSlot}: ${fmtVNDReport(rev)} (${Number(s.matches || 0)} ca)`;
    return `
      <g class="cursor-pointer">
        <title>${tip}</title>
        <text x="0" y="${y + 13}" font-size="10.5" font-weight="600" fill="#334155">${safeSlot}</text>
        <rect x="${labelW}" y="${y + 3}" width="${barMaxW}" height="14" rx="4" fill="#F1F5F9" />
        <rect x="${labelW}" y="${y + 3}" width="${barW}" height="14" rx="4" fill="#0F172A" />
        <text x="${totalW}" y="${y + 13}" font-size="10.5" font-weight="700" fill="#0F172A" text-anchor="end">${fmtVNDReport(rev)}</text>
      </g>
    `;
  }).join('');

  container.innerHTML = `
    <svg width="100%" height="${svgH}" viewBox="0 0 ${totalW} ${svgH}" preserveAspectRatio="xMidYMin meet" class="w-full">
      ${rows}
    </svg>
  `;
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
  let rows = showZero ? [...currentReportPitchRows] : currentReportPitchRows.filter(p => Number(p.matches || 0) > 0 || Number(p.revenue || 0) > 0);

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
    tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-[#94A3B8]">Không có sân nào phát sinh ca trong kỳ (bật "Hiện tất cả sân" để xem đủ 26 sân).</td></tr>';
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
        <td class="py-2.5 px-3 whitespace-nowrap text-[#334155]">${escapeSearchHTML(i.booking_date)} <span class="text-[#64748B]">(${escapeSearchHTML(i.slot_time)})</span></td>
        <td class="py-2.5 px-3">
          <div class="font-bold text-[#0F172A]">${escapeSearchHTML(i.pitch_name)}</div>
          <div class="text-[11px] text-[#64748B]">${escapeSearchHTML(i.customer_name)} · ${escapeSearchHTML(i.phone)}</div>
        </td>
        <td class="py-2.5 px-3 text-right font-bold text-[#16A34A]">${fmtVNDReport(i.paid_amount)}</td>
        <td class="py-2.5 px-3 text-right font-extrabold text-amber-700">${fmtVNDReport(i.uncollected)}</td>
        <td class="py-2.5 px-3 text-right">
          <button type="button" onclick="closeUncollectedDrawer();openInPlayModal('${escapeSearchHTML(i.code)}')" class="px-2.5 py-1 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-[11px] cursor-pointer">Xem đơn</button>
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
    const isCompleted = (b.status === 'Hoàn thành' || String(b.status || '').toLowerCase() === 'completed');
    const statusBadge = isCompleted
      ? '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700">Hoàn thành</span>'
      : `<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-[#334155]">${escapeSearchHTML(b.status || '')}</span>`;
    const paidVal = Number(b.paid_amount ?? (Number(b.total_price || 0) - Number(b.remaining_amount || 0)));
    const uncolVal = Number(b.remaining_amount || 0);

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="py-2.5 px-3 font-mono font-bold"><button type="button" onclick="openInPlayModal('${escapeSearchHTML(b.code || '')}')" class="text-[#0F172A] hover:text-[#16A34A] hover:underline cursor-pointer">${escapeSearchHTML(b.code || '')}</button></td>
        <td class="py-2.5 px-3 text-[#334155] whitespace-nowrap">${escapeSearchHTML(b.booking_date || '')} <span class="text-[#64748B]">(${escapeSearchHTML(b.slot_time || '')})</span></td>
        <td class="py-2.5 px-3 font-semibold text-[#0F172A]">${escapeSearchHTML(b.pitch_name || b.pitch_id || '')}</td>
        <td class="py-2.5 px-3">
          <div class="font-bold text-[#0F172A]">${escapeSearchHTML(b.customer_name || 'Khách vãng lai')}</div>
          <div class="text-[11px] text-[#64748B] font-mono">${escapeSearchHTML(b.phone || '')}</div>
        </td>
        <td class="py-2.5 px-3 text-right font-extrabold text-[#0F172A]">${fmtVNDReport(b.total_price)}</td>
        <td class="py-2.5 px-3 text-right font-bold text-[#16A34A]">${fmtVNDReport(paidVal)}</td>
        <td class="py-2.5 px-3 text-right font-bold ${uncolVal > 0 ? 'text-amber-700' : 'text-[#94A3B8]'}">${fmtVNDReport(uncolVal)}</td>
        <td class="py-2.5 px-3 text-right text-[#475569] font-semibold">${fmtVNDReport(b.service_price)}</td>
        <td class="py-2.5 px-3">${statusBadge}</td>
        <td class="py-2.5 px-3 text-xs text-[#475569] max-w-[140px] truncate" title="${escapeSearchHTML(b.payment_method || '')}">${escapeSearchHTML(b.payment_method || '')}</td>
      </tr>
    `;
  }).join('');
}
window.renderReportLedger = renderReportLedger;

function handleReportLedgerSearch() {
  const q = (document.getElementById('rpt-ledger-search')?.value || '').trim().toLowerCase();
  if (!q) {
    currentReportLedgerFiltered = [...currentReportLedgerBookings];
  } else {
    currentReportLedgerFiltered = currentReportLedgerBookings.filter(b =>
      (b.code && b.code.toLowerCase().includes(q)) ||
      (b.customer_name && b.customer_name.toLowerCase().includes(q)) ||
      (b.phone && b.phone.includes(q)) ||
      (b.pitch_name && b.pitch_name.toLowerCase().includes(q)) ||
      (b.pitch_id && b.pitch_id.toLowerCase().includes(q))
    );
  }
  currentReportLedgerPage = 1;
  renderReportLedger();
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

  const qs = new URLSearchParams({ action: 'reports' });
  if (fromDate) qs.set('from', fromDate);
  if (toDate) qs.set('to', toDate);
  const r = await adminFetchJson(`../api/admin.php?${qs.toString()}`);
  const d = (r.ok && r.data) ? r.data : null;
  if (!d) return;

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
  const totalMatches = Number(s.totalMatches ?? 0);
  const occupancyRate = Number(s.occupancyRate ?? 0);
  const avgRev = Number(s.avgRevenue ?? 0);

  const emptyEl = document.getElementById('rpt-empty-state');
  if (emptyEl) {
    const isEmpty = (recognized === 0 && totalMatches === 0 && totalExpenses === 0);
    emptyEl.classList.toggle('hidden', !isEmpty);
  }

  const setTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

  // Hàng 1: 4 số lớn + ±% so kỳ trước
  setTxt('rpt-total-revenue', fmtVNDReport(recognized));
  setTxt('rpt-collected-revenue', fmtVNDReport(collected));
  setTxt('rpt-uncollected-revenue', fmtVNDReport(uncollected));
  setTxt('rpt-uncollected-upcoming', fmtVNDReport(uncolUpcoming));
  setTxt('rpt-uncollected-overdue', fmtVNDReport(uncolOverdue));
  const profitEl = document.getElementById('rpt-net-profit');
  if (profitEl) {
    profitEl.textContent = fmtVNDReport(netProfit);
    profitEl.className = `font-heading font-extrabold text-2xl mt-1.5 ${netProfit < 0 ? 'text-rose-600' : 'text-[#16A34A]'}`;
  }
  const profitNoteEl = document.getElementById('rpt-profit-note');
  if (profitNoteEl) {
    const margin = collected > 0 ? ((netProfit / collected) * 100).toFixed(1) : '0.0';
    profitNoteEl.textContent = `Cơ sở Đã thu − Chi phí (biên ${margin}%)`;
  }

  const deltas = d.deltas || {};
  renderDeltaBadge('rpt-delta-recognized', deltas.recognizedPct, false);
  renderDeltaBadge('rpt-delta-collected', deltas.collectedPct, false);
  renderDeltaBadge('rpt-delta-uncollected', deltas.uncollectedPct, true);
  renderDeltaBadge('rpt-delta-profit', deltas.profitPct, false);

  // Hàng 2: Vận hành
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
    if (expSubEl) {
      expSubEl.innerHTML = 'Chưa nhập chi phí · <a href="#expenses-crud-card" onclick="document.getElementById(\'expenses-crud-card\')?.scrollIntoView({behavior:\'smooth\'});return false;" class="text-[#16A34A] font-semibold hover:underline">Mở sổ chi ↓</a>';
    }
  } else {
    if (expValEl) expValEl.textContent = fmtVNDReport(totalExpenses);
    if (expSubEl) {
      expSubEl.innerHTML = 'Tổng chi vận hành kỳ lọc · <a href="#expenses-crud-card" onclick="document.getElementById(\'expenses-crud-card\')?.scrollIntoView({behavior:\'smooth\'});return false;" class="text-[#16A34A] font-semibold hover:underline">Xem sổ chi ↓</a>';
    }
  }
  setTxt('rpt-expense-list-total', totalExpenses > 0 ? fmtVNDReport(totalExpenses) : 'Chưa nhập chi phí');

  // 2 Thanh xếp chồng (cùng tổng = Doanh thu ghi nhận)
  renderStackedBar('rpt-stack-pay-bar', 'rpt-stack-pay-legend', 'rpt-stack-pay-total', [
    { label: 'Chuyển khoản VietQR', value: vietqrRev, color: '#16A34A' },
    { label: 'Tiền mặt', value: cashRev, color: '#0F172A' },
    { label: 'Chưa thu', value: uncollected, color: '#CBD5E1' }
  ], recognized);

  renderStackedBar('rpt-stack-rev-bar', 'rpt-stack-rev-legend', 'rpt-stack-rev-total', [
    { label: 'Tiền sân', value: pitchRec, color: '#16A34A' },
    { label: 'Dịch vụ & Nước', value: servicesRec, color: '#0F172A' }
  ], recognized);

  // Đối soát độc lập 3 nguồn
  renderReconciliationPanel(d.reconciliation);

  // Danh sách chưa thu bấm xem
  currentReportUncollectedUpcoming = Array.isArray(d.uncollectedUpcomingList) ? d.uncollectedUpcomingList : [];
  currentReportUncollectedOverdue = Array.isArray(d.uncollectedOverdueList) ? d.uncollectedOverdueList : [];

  // 2 biểu đồ SVG cục bộ
  renderDailyRevenueSVG(d.dailyRevenue || []);
  renderSlotRevenueSVG(d.bySlot || []);

  // Bảng hiệu suất theo sân
  currentReportPitchRows = Array.isArray(d.byPitch) ? d.byPitch : [];
  renderAdminPitchTable();

  // Bảng kê chi tiết
  currentReportLedgerBookings = Array.isArray(d.detailedBookings) ? d.detailedBookings : [];
  currentReportLedgerFiltered = [...currentReportLedgerBookings];
  currentReportLedgerPage = 1;
  renderReportLedger();

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
