let currentReportLedgerBookings = [];
let currentReportLedgerFiltered = [];
let currentReportLedgerPage = 1;
const REPORT_LEDGER_PAGE_SIZE = 10;
let currentAdminExpensesList = [];

function renderDailyRevenueSVG(dailyRevenue) {
  const container = document.getElementById('rpt-daily-svg-container');
  if (!container) return;
  if (!Array.isArray(dailyRevenue) || dailyRevenue.length === 0) {
    container.innerHTML = '<span class="text-xs text-slate-400">KhÃ´ng cÃ³ dá»¯ liá»‡u doanh thu trong ká»³ lá»c.</span>';
    return;
  }

  const w = Math.max(container.clientWidth || 400, dailyRevenue.length * 60);
  const h = 190;
  const paddingBottom = 30;
  const paddingTop = 25;
  const chartH = h - paddingBottom - paddingTop;
  const maxRev = Math.max(1, ...dailyRevenue.map(d => Number(d.revenue || 0)));
  const barWidth = Math.max(18, Math.min(36, Math.floor(w / dailyRevenue.length) - 14));

  const bars = dailyRevenue.map((d, idx) => {
    const rev = Number(d.revenue || 0);
    const barH = Math.max(4, Math.round((rev / maxRev) * chartH));
    const x = Math.round(idx * (w / dailyRevenue.length) + (w / dailyRevenue.length - barWidth) / 2);
    const y = h - paddingBottom - barH;
    const dateLabel = String(d.date || '').slice(5).replace('-', '/');
    const tipText = `NgÃ y: ${d.date} | Doanh thu: ${rev.toLocaleString('vi-VN')}Ä‘ (${d.matches || 0} ca)`;

    return `
      <g class="cursor-pointer group">
        <title>${tipText}</title>
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="4" fill="#16A34A" class="transition-colors hover:fill-[#2563EB]">
          <animate attributeName="height" from="0" to="${barH}" dur="0.3s" />
          <animate attributeName="y" from="${h - paddingBottom}" to="${y}" dur="0.3s" />
        </rect>
        <text x="${x + barWidth / 2}" y="${y - 6}" font-size="10" font-weight="bold" fill="#0F172A" text-anchor="middle" class="opacity-0 group-hover:opacity-100 transition-opacity">${(rev >= 1000000 ? (rev / 1000000).toFixed(1) + 'M' : (rev / 1000).toFixed(0) + 'k')}</text>
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

function renderPitchTypeRevenueSVG(byType) {
  const container = document.getElementById('rpt-pitch-type-svg-container');
  if (!container) return;
  const t5 = byType?.[5] || byType?.p5 || {};
  const t7 = byType?.[7] || byType?.p7 || {};
  const t11 = byType?.[11] || byType?.p11 || {};

  const r5 = Number(t5.revenue || 0);
  const r7 = Number(t7.revenue || 0);
  const r11 = Number(t11.revenue || 0);
  const total = r5 + r7 + r11;

  if (total === 0) {
    container.innerHTML = '<span class="text-xs text-slate-400">ChÆ°a cÃ³ doanh thu theo loáº¡i sÃ¢n trong ká»³.</span>';
    return;
  }

  const p5Pct = ((r5 / total) * 100).toFixed(1);
  const p7Pct = ((r7 / total) * 100).toFixed(1);
  const p11Pct = ((r11 / total) * 100).toFixed(1);

  container.innerHTML = `
    <div class="w-full space-y-3.5 p-2 text-xs">
      <div>
        <div class="flex justify-between font-bold mb-1">
          <span class="text-emerald-700">âš½ SÃ¢n 5 ngÆ°á»i</span>
          <span class="text-[#0F172A]">${r5.toLocaleString('vi-VN')}Ä‘ <span class="text-emerald-600 font-extrabold">(${p5Pct}%)</span></span>
        </div>
        <div class="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div class="h-full bg-[#16A34A] rounded-full transition-all" style="width:${p5Pct}%"></div>
        </div>
      </div>
      <div>
        <div class="flex justify-between font-bold mb-1">
          <span class="text-blue-700">âš½ SÃ¢n 7 ngÆ°á»i</span>
          <span class="text-[#0F172A]">${r7.toLocaleString('vi-VN')}Ä‘ <span class="text-blue-600 font-extrabold">(${p7Pct}%)</span></span>
        </div>
        <div class="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div class="h-full bg-[#2563EB] rounded-full transition-all" style="width:${p7Pct}%"></div>
        </div>
      </div>
      <div>
        <div class="flex justify-between font-bold mb-1">
          <span class="text-purple-700">âš½ SÃ¢n 11 ngÆ°á»i</span>
          <span class="text-[#0F172A]">${r11.toLocaleString('vi-VN')}Ä‘ <span class="text-purple-600 font-extrabold">(${p11Pct}%)</span></span>
        </div>
        <div class="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div class="h-full bg-purple-600 rounded-full transition-all" style="width:${p11Pct}%"></div>
        </div>
      </div>
    </div>
  `;
}
window.renderPitchTypeRevenueSVG = renderPitchTypeRevenueSVG;

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
  if (countInfo) countInfo.textContent = `Hiá»ƒn thá»‹ ${pageItems.length ? startIdx + 1 : 0} - ${startIdx + pageItems.length} trÃªn tá»•ng ${totalItems} ca`;

  const pageInfo = document.getElementById('rpt-ledger-page-info');
  if (pageInfo) pageInfo.textContent = `Trang ${currentReportLedgerPage} / ${totalPages}`;

  const prevBtn = document.getElementById('rpt-ledger-prev-btn');
  if (prevBtn) prevBtn.disabled = (currentReportLedgerPage <= 1);
  const nextBtn = document.getElementById('rpt-ledger-next-btn');
  if (nextBtn) nextBtn.disabled = (currentReportLedgerPage >= totalPages);

  if (pageItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="py-6 text-center text-[#94A3B8]">KhÃ´ng tÃ¬m tháº¥y ca Ä‘áº·t sÃ¢n nÃ o phÃ¹ há»£p.</td></tr>';
    return;
  }

  tbody.innerHTML = pageItems.map(b => {
    const isCancelled = (b.status === 'ÄÃ£ há»§y');
    const statusBadge = isCancelled
      ? '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700">ÄÃ£ há»§y</span>'
      : (b.status === 'HoÃ n thÃ nh'
        ? '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">HoÃ n thÃ nh</span>'
        : `<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700">${escapeSearchHTML(b.status || '')}</span>`);

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="py-2.5 px-3 font-mono font-bold text-[#0F172A]">${escapeSearchHTML(b.code || '')}</td>
        <td class="py-2.5 px-3 text-[#334155] whitespace-nowrap">${escapeSearchHTML(b.booking_date || '')} <span class="text-xs text-[#64748B]">(${escapeSearchHTML(b.slot_time || '')})</span></td>
        <td class="py-2.5 px-3 font-semibold text-[#0F172A]">${escapeSearchHTML(b.pitch_name || b.pitch_id || '')}</td>
        <td class="py-2.5 px-3">
          <div class="font-bold text-[#0F172A]">${escapeSearchHTML(b.customer_name || 'KhÃ¡ch vÃ£ng lai')}</div>
          <div class="text-[11px] text-[#64748B] font-mono">${escapeSearchHTML(b.phone || '')}</div>
        </td>
        <td class="py-2.5 px-3 text-right font-extrabold text-[#0F172A]">${Number(b.total_price || 0).toLocaleString('vi-VN')}Ä‘</td>
        <td class="py-2.5 px-3 text-right font-bold text-emerald-700">${Number(b.deposit_amount || 0).toLocaleString('vi-VN')}Ä‘</td>
        <td class="py-2.5 px-3 text-right font-bold ${Number(b.remaining_amount || 0) > 0 ? 'text-rose-600' : 'text-slate-400'}">${Number(b.remaining_amount || 0).toLocaleString('vi-VN')}Ä‘</td>
        <td class="py-2.5 px-3 text-right text-sky-700 font-semibold">${Number(b.service_price || 0).toLocaleString('vi-VN')}Ä‘</td>
        <td class="py-2.5 px-3">${statusBadge}</td>
        <td class="py-2.5 px-3 text-xs text-[#475569] max-w-[150px] truncate" title="${escapeSearchHTML(b.payment_method || '')}">${escapeSearchHTML(b.payment_method || '')}</td>
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
    currentReportLedgerFiltered = currentReportLedgerBookings.filter(b => {
      return (b.code && b.code.toLowerCase().includes(q)) ||
             (b.customer_name && b.customer_name.toLowerCase().includes(q)) ||
             (b.phone && b.phone.includes(q)) ||
             (b.pitch_name && b.pitch_name.toLowerCase().includes(q)) ||
             (b.pitch_id && b.pitch_id.toLowerCase().includes(q));
    });
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

window.setReportDateRange = function(rangeType) {
  const fromInput = document.getElementById('rpt-from-date');
  const toInput = document.getElementById('rpt-to-date');
  const todayISO = getLocalTodayISO();
  const now = new Date();

  if (rangeType === 'today') {
    if (fromInput) fromInput.value = todayISO;
    if (toInput) toInput.value = todayISO;
  } else if (rangeType === 'yesterday') {
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    const yISO = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
    if (fromInput) fromInput.value = yISO;
    if (toInput) toInput.value = yISO;
  } else if (rangeType === '7days') {
    const d7 = new Date(now);
    d7.setDate(now.getDate() - 6);
    const fromISO = `${d7.getFullYear()}-${String(d7.getMonth() + 1).padStart(2, '0')}-${String(d7.getDate()).padStart(2, '0')}`;
    if (fromInput) fromInput.value = fromISO;
    if (toInput) toInput.value = todayISO;
  } else if (rangeType === 'month') {
    const firstDayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    if (fromInput) fromInput.value = firstDayISO;
    if (toInput) toInput.value = todayISO;
  } else if (rangeType === 'last_month') {
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const fromISO = `${lm.getFullYear()}-${String(lm.getMonth() + 1).padStart(2, '0')}-01`;
    const toISO = `${lEnd.getFullYear()}-${String(lEnd.getMonth() + 1).padStart(2, '0')}-${String(lEnd.getDate()).padStart(2, '0')}`;
    if (fromInput) fromInput.value = fromISO;
    if (toInput) toInput.value = toISO;
  } else {
    if (fromInput) fromInput.value = '';
    if (toInput) toInput.value = '';
  }
  renderAdminReports();
};

async function renderAdminReports() {
  if (!isManagerOrAdmin()) return;
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const fromDate = (document.getElementById('rpt-from-date')?.value || '').trim();
  const toDate = (document.getElementById('rpt-to-date')?.value || '').trim();

  let reportData = null;
  const qs = new URLSearchParams({ action: 'reports' });
  if (fromDate) qs.set('from', fromDate);
  if (toDate) qs.set('to', toDate);
  const r = await adminFetchJson(`../api/admin.php?${qs.toString()}`);
  if (r.ok && r.data) {
    reportData = r.data;
  }

  let totalRev = 0;
  let totalMatches = 0;
  let servicesRev = 0;
  let depositRev = 0;
  let remainingRev = 0;
  let cashRev = 0;
  let vietqrRev = 0;
  let totalExpenses = 0;
  let netProfit = 0;
  let expensesByCategory = [];
  let p5Rev = 0, p5Count = 0;
  let p7Rev = 0, p7Count = 0;
  let p11Rev = 0, p11Count = 0;
  let pitchRows = [];

  if (reportData) {
    const s = reportData.summary || reportData;
    totalRev = Number(s.totalRevenue ?? reportData.totalRevenue ?? 0);
    totalMatches = Number(s.totalMatches ?? reportData.totalMatches ?? 0);
    servicesRev = Number(s.serviceRevenue ?? s.servicesRevenue ?? reportData.servicesRevenue ?? 0);
    depositRev = Number(s.depositRevenue ?? reportData.depositRevenue ?? 0);
    remainingRev = Number(s.remaining70Revenue ?? s.remainingRevenue ?? reportData.remainingRevenue ?? 0);
    cashRev = Number(s.cashRevenue ?? reportData.cashRevenue ?? 0);
    vietqrRev = Number(s.transferRevenue ?? s.vietqrRevenue ?? reportData.vietqrRevenue ?? 0);
    totalExpenses = Number(reportData.totalExpenses ?? s.totalExpenses ?? 0);
    netProfit = Number(reportData.netProfit ?? s.netProfit ?? (totalRev - totalExpenses));
    expensesByCategory = Array.isArray(reportData.expensesByCategory) ? reportData.expensesByCategory : [];

    const t5 = reportData.byType?.[5] || reportData.byType?.p5 || {};
    const t7 = reportData.byType?.[7] || reportData.byType?.p7 || {};
    const t11 = reportData.byType?.[11] || reportData.byType?.p11 || {};

    p5Rev = Number(t5.revenue || 0);
    p5Count = Number(t5.count ?? t5.matches ?? 0);
    p7Rev = Number(t7.revenue || 0);
    p7Count = Number(t7.count ?? t7.matches ?? 0);
    p11Rev = Number(t11.revenue || 0);
    p11Count = Number(t11.count ?? t11.matches ?? 0);
    pitchRows = Array.isArray(reportData.byPitch) ? reportData.byPitch : [];
  } else {
    const bookings = db.getAllBookings ? db.getAllBookings() : [];
    const pitches = db.getPitches ? db.getPitches() : [];
    const pitchRevMap = {};
    pitches.forEach(p => {
      pitchRevMap[p.id] = { id: p.id, name: p.name, typeName: p.typeName, status: p.status, matches: 0, revenue: 0 };
    });

    bookings.forEach(b => {
      if (b.status === 'ÄÃ£ há»§y' || b.paymentStatus === 'ÄÃ£ há»§y' || b.paymentStatus === 'ÄÃ£ hoÃ n cá»c 100%') return;
      const bDate = String(b.date || b.booking_date || '').slice(0, 10);
      if (fromDate && bDate && bDate < fromDate) return;
      if (toDate && bDate && bDate > toDate) return;

      const total = Number(b.totalPrice || 0);
      const dep = Number(b.depositAmount || Math.round(total * 0.3));
      let collected = 0;
      let colDep = 0;
      let colRem = 0;

      if (b.status === 'HoÃ n thÃ nh' || b.paymentStatus === 'ÄÃ£ thanh toÃ¡n 100%' || b.paymentStatus === 'ÄÃ£ thanh toÃ¡n Ä‘á»§') {
        collected = total;
        colDep = dep;
        colRem = Math.max(0, total - dep);
      } else if (b.status === 'Äang Ä‘Ã¡' || b.status === 'ÄÃ£ xÃ¡c nháº­n' || b.status === 'KhÃ¡ch chÆ°a Ä‘áº¿n' || b.paymentStatus === 'ÄÃ£ cá»c 30%' || b.paymentStatus === 'Tá»‹ch thu cá»c 30%') {
        if (!String(b.paymentMethod || '').includes('ChÆ°a cá»c')) {
          collected = dep;
          colDep = dep;
        }
      }

      totalRev += collected;
      depositRev += colDep;
      remainingRev += colRem;
      totalMatches += 1;

      const pm = String(b.paymentMethod || '').toLowerCase();
      if (pm.includes('tiá»n máº·t')) {
        cashRev += collected;
      } else {
        vietqrRev += collected;
      }

      if (Array.isArray(b.services) && collected > 0) {
        b.services.forEach(s => {
          servicesRev += Number(s.price || 0) * Number(s.quantity || 1);
        });
      }

      const pId = String(b.pitchId || '').toUpperCase();
      if (pId.startsWith('P5') || (b.pitchName && b.pitchName.includes('SÃ¢n 5'))) {
        p5Rev += collected;
        p5Count += 1;
      } else if (pId.startsWith('P11') || (b.pitchName && b.pitchName.includes('SÃ¢n 11'))) {
        p11Rev += collected;
        p11Count += 1;
      } else {
        p7Rev += collected;
        p7Count += 1;
      }

      if (pitchRevMap[b.pitchId]) {
        pitchRevMap[b.pitchId].matches += 1;
        pitchRevMap[b.pitchId].revenue += collected;
      }
    });
    pitchRows = Object.values(pitchRevMap);
  }

  const avgRev = totalMatches > 0 ? Math.round(totalRev / totalMatches) : 0;
  if (!reportData) {
    netProfit = totalRev - totalExpenses;
  }
  const profitMargin = totalRev > 0 ? ((netProfit / totalRev) * 100).toFixed(1) : '0.0';

  const setElText = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };

  const collectedRev = Number(reportData?.collectedRevenue ?? (cashRev + vietqrRev));
  const grossProfit = Number(reportData?.grossProfit ?? (collectedRev - totalExpenses));
  const occupancyRate = Number(reportData?.occupancyRate ?? 0);

  setElText('rpt-total-revenue', totalRev.toLocaleString('vi-VN') + 'Ä‘');
  setElText('rpt-collected-revenue', collectedRev.toLocaleString('vi-VN') + 'Ä‘');
  setElText('rpt-gross-profit', grossProfit.toLocaleString('vi-VN') + 'Ä‘');
  const grossProfitEl = document.getElementById('rpt-gross-profit');
  if (grossProfitEl) {
    grossProfitEl.className = `font-heading font-extrabold text-2xl mt-1 ${grossProfit < 0 ? 'text-rose-600' : 'text-blue-700'}`;
  }
  setElText('rpt-occupancy-rate', occupancyRate + '%');
  setElText('rpt-total-matches', totalMatches + ' ca');
  setElText('rpt-services-revenue', servicesRev.toLocaleString('vi-VN') + 'Ä‘');
  setElText('rpt-avg-revenue', avgRev.toLocaleString('vi-VN') + 'Ä‘');
  setElText('rpt-deposit-revenue', depositRev.toLocaleString('vi-VN') + 'Ä‘');
  setElText('rpt-remaining-revenue', remainingRev.toLocaleString('vi-VN') + 'Ä‘');
  setElText('rpt-cash-revenue', cashRev.toLocaleString('vi-VN') + 'Ä‘');
  setElText('rpt-vietqr-revenue', vietqrRev.toLocaleString('vi-VN') + 'Ä‘');

  // Äá»I CHIáº¾U 2 CÃ”NG THá»¨C
  const f1 = reportData?.formula1 || {};
  const f2 = reportData?.formula2 || {};
  const isAllMatched = (f1.isMatched !== false) && (f2.isMatched !== false);
  const badgeEl = document.getElementById('rpt-formula-badge');
  if (badgeEl) {
    if (isAllMatched) {
      badgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300';
      badgeEl.textContent = 'Khá»›p sá»‘ liá»‡u 100% (0Ä‘ lá»‡ch)';
    } else {
      const maxDiff = Math.max(Number(f1.diff || 0), Number(f2.diff || 0));
      badgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse';
      badgeEl.textContent = `Cáº¢NH BÃO Lá»†CH ${maxDiff.toLocaleString('vi-VN')}Ä‘!`;
    }
  }
  setElText('rpt-f1-cash', Number(f1.cash ?? cashRev).toLocaleString('vi-VN') + 'Ä‘');
  setElText('rpt-f1-transfer', Number(f1.transfer ?? vietqrRev).toLocaleString('vi-VN') + 'Ä‘');
  setElText('rpt-f1-debt', Number(f1.debt ?? 0).toLocaleString('vi-VN') + 'Ä‘');
  setElText('rpt-f1-total', Number(f1.calculated ?? totalRev).toLocaleString('vi-VN') + 'Ä‘');
  const f1Status = document.getElementById('rpt-f1-status');
  if (f1Status) {
    f1Status.textContent = f1.isMatched !== false ? 'Khá»›p 100%' : `Lá»‡ch ${Number(f1.diff || 0).toLocaleString('vi-VN')}Ä‘`;
    f1Status.className = f1.isMatched !== false ? 'text-emerald-600 font-extrabold' : 'text-rose-600 font-extrabold';
  }

  setElText('rpt-f2-deposit', Number(f2.deposit ?? depositRev).toLocaleString('vi-VN') + 'Ä‘');
  setElText('rpt-f2-remaining', Number(f2.remaining ?? remainingRev).toLocaleString('vi-VN') + 'Ä‘');
  setElText('rpt-f2-services', Number(f2.services ?? servicesRev).toLocaleString('vi-VN') + 'Ä‘');
  setElText('rpt-f2-total', Number(f2.calculated ?? totalRev).toLocaleString('vi-VN') + 'Ä‘');
  const f2Status = document.getElementById('rpt-f2-status');
  if (f2Status) {
    f2Status.textContent = f2.isMatched !== false ? 'Khá»›p 100%' : `Lá»‡ch ${Number(f2.diff || 0).toLocaleString('vi-VN')}Ä‘`;
    f2Status.className = f2.isMatched !== false ? 'text-emerald-600 font-extrabold' : 'text-rose-600 font-extrabold';
  }

  setElText('rpt-total-expenses', totalExpenses.toLocaleString('vi-VN') + 'Ä‘');
  const netProfitEl = document.getElementById('rpt-net-profit');
  if (netProfitEl) {
    netProfitEl.textContent = netProfit.toLocaleString('vi-VN') + 'Ä‘';
    netProfitEl.className = `font-heading font-extrabold text-2xl mt-1 ${netProfit < 0 ? 'text-rose-600' : 'text-[#16A34A]'}`;
  }
  setElText('rpt-profit-margin', profitMargin + '%');

  setElText('rpt-p5-revenue', p5Rev.toLocaleString('vi-VN') + 'Ä‘');
  setElText('rpt-p5-count', p5Count + ' ca Ä‘áº·t');
  setElText('rpt-p7-revenue', p7Rev.toLocaleString('vi-VN') + 'Ä‘');
  setElText('rpt-p7-count', p7Count + ' ca Ä‘áº·t');
  setElText('rpt-p11-revenue', p11Rev.toLocaleString('vi-VN') + 'Ä‘');
  setElText('rpt-p11-count', p11Count + ' ca Ä‘áº·t');

  // Váº½ biá»ƒu Ä‘á»“ SVG
  renderDailyRevenueSVG(reportData?.dailyRevenue || []);
  renderPitchTypeRevenueSVG(reportData?.byType || { p5: { revenue: p5Rev }, p7: { revenue: p7Rev }, p11: { revenue: p11Rev } });

  // Báº£ng kÃª chi tiáº¿t
  currentReportLedgerBookings = Array.isArray(reportData?.detailedBookings) ? reportData.detailedBookings : [];
  currentReportLedgerFiltered = [...currentReportLedgerBookings];
  currentReportLedgerPage = 1;
  renderReportLedger();

  const expChartEl = document.getElementById('rpt-expense-categories-chart');
  if (expChartEl) {
    if (expensesByCategory.length === 0) {
      expChartEl.innerHTML = '<div class="py-4 text-center text-[#94A3B8]">ChÆ°a cÃ³ khoáº£n chi váº­n hÃ nh nÃ o trong ká»³ lá»c.</div>';
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
              <span class="font-bold text-[#0F172A]">${escapeSearchHTML(c.categoryName || c.category || '')} <span class="text-[#64748B] font-normal">(${Number(c.count || 0)} khoáº£n)</span></span>
              <span class="font-extrabold text-rose-600">${amt.toLocaleString('vi-VN')}Ä‘ <span class="text-[#64748B] font-normal">(${sharePct}%)</span></span>
            </div>
            <div class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div class="h-full bg-rose-500 rounded-full transition-all" style="width:${wPct}%"></div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  const tbody = document.getElementById('admin-reports-tbody');
  if (tbody) {
    tbody.innerHTML = pitchRows.map(p => `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="py-3 px-4 font-bold text-[#0F172A]">${escapeSearchHTML(p.name)}</td>
        <td class="py-3 px-4 text-[#475569]">${escapeSearchHTML(p.typeName || p.type_name || '')}</td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded text-[11px] font-bold ${p.status === 'Báº£o trÃ¬' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}">
            ${escapeSearchHTML(p.status)}
          </span>
        </td>
        <td class="py-3 px-4 text-center font-bold text-[#334155]">${Number(p.matches || 0)} ca</td>
        <td class="py-3 px-4 text-right font-extrabold text-[#16A34A]">${Number(p.revenue || 0).toLocaleString('vi-VN')}Ä‘</td>
      </tr>
    `).join('');
  }

  await loadAdminExpenses();
}


async function exportAdminReportsCSV() {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chá»‰ Quáº£n lÃ½ hoáº·c Chá»§ sÃ¢n má»›i cÃ³ quyá»n xuáº¥t bÃ¡o cÃ¡o doanh thu!', 'error');
    return;
  }

  const fromDate = (document.getElementById('rpt-from-date')?.value || '').trim();
  const toDate = (document.getElementById('rpt-to-date')?.value || '').trim();

  // Æ¯u tiÃªn gá»i API xuáº¥t CSV cá»§a server náº¿u há»— trá»£ tráº£ vá» file CSV trá»±c tiáº¿p
  try {
    const qs = new URLSearchParams({ action: 'export_reports_csv' });
    if (fromDate) qs.set('from', fromDate);
    if (toDate) qs.set('to', toDate);
    const res = await fetch(`../api/admin.php?${qs.toString()}`, { cache: 'no-store' });
    if (res.ok) {
      const ct = String(res.headers.get('content-type') || '').toLowerCase();
      if (ct.includes('text/csv') || ct.includes('application/csv') || ct.includes('application/octet-stream')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Bao_Cao_Doanh_Thu_${fromDate || 'all'}_${toDate || 'all'}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        if (window.SanBongApp?.showToast) {
          window.SanBongApp.showToast('ðŸ“¥ ÄÃ£ xuáº¥t file bÃ¡o cÃ¡o doanh thu Excel/CSV thÃ nh cÃ´ng!', 'success', 3000);
        }
        return;
      }
    }
  } catch (e) {}

  // Fallback chuáº©n UTF-8 BOM cho Excel trÃªn mÃ¡y khÃ¡ch
  const db = window.SanBongApp?.SanBongDB;
  const bookings = (db && db.getAllBookings) ? db.getAllBookings() : [];
  const filtered = bookings.filter(b => {
    const bDate = String(b.date || b.booking_date || '').slice(0, 10);
    if (fromDate && bDate && bDate < fromDate) return false;
    if (toDate && bDate && bDate > toDate) return false;
    return true;
  });

  const csvEscape = (v) => {
    let str = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(str) && !/^-\d+(\.\d+)?$/.test(str.trim())) {
      str = "'" + str;
    }
    return `"${str.replace(/"/g, '""')}"`;
  };
  const lines = [];
  lines.push(['BÃO CÃO DOANH THU & Äá»I SOÃT SÃ‚N BÃ“NG PRO', `Tá»« ngÃ y: ${fromDate || 'Táº¥t cáº£'}`, `Äáº¿n ngÃ y: ${toDate || 'Táº¥t cáº£'}`].map(csvEscape).join(','));
  lines.push([]);
  lines.push(['MÃ£ Ä‘Æ¡n', 'NgÃ y Ä‘Ã¡', 'Khung giá»', 'SÃ¢n bÃ³ng', 'KhÃ¡ch hÃ ng', 'Sá»‘ Ä‘iá»‡n thoáº¡i', 'Tá»•ng tiá»n (VNÄ)', 'Tiá»n cá»c (VNÄ)', 'CÃ²n láº¡i (VNÄ)', 'HÃ¬nh thá»©c TT', 'Tráº¡ng thÃ¡i TT', 'Tráº¡ng thÃ¡i ca', 'Ghi chÃº'].map(csvEscape).join(','));

  filtered.forEach(b => {
    const total = Number(b.totalPrice || 0);
    const dep = Number(b.depositAmount || 0);
    const rem = Number(b.remainingAmount ?? Math.max(0, total - dep));
    lines.push([
      b.code || '',
      b.date || b.booking_date || '',
      b.slotTime || b.slot_time || '',
      b.pitchName || b.pitchId || '',
      b.customerName || '',
      b.phone || '',
      total,
      dep,
      rem,
      b.paymentMethod || '',
      b.paymentStatus || '',
      b.status || '',
      b.note || ''
    ].map(csvEscape).join(','));
  });

  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Bao_Cao_Doanh_Thu_${fromDate || 'all'}_${toDate || 'all'}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast('ðŸ“¥ ÄÃ£ xuáº¥t bÃ¡o cÃ¡o doanh thu ra file Excel / CSV (UTF-8 BOM)!', 'success', 3000);
  }
}
window.exportAdminReportsCSV = exportAdminReportsCSV;

