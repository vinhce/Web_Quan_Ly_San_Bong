let currentOverviewFilter = 'all';
let currentOverviewPage = 1;
const OVERVIEW_PAGE_SIZE = 8;
let overviewSummaryCache = null;
let overviewLastHash = '';
let overviewSelectedCodes = new Set();
let overviewOverdueOpen = false;
let overviewRefreshTimer = null;

function formatTitleCaseVN(str) {
  const s = String(str || '').trim();
  if (!s) return 'Khách hàng';
  return s.split(/\s+/).map(word => {
    if (!word) return '';
    if (/^[A-Z0-9()_-]{2,}$/.test(word)) return word;
    return word.charAt(0).toLocaleUpperCase('vi-VN') + word.slice(1).toLocaleLowerCase('vi-VN');
  }).join(' ');
}

function formatPhoneVN(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return String(phone || '—').trim() || '—';
}

function fmtOverviewVND(n) {
  return Number(n || 0).toLocaleString('vi-VN') + 'đ';
}

function normalizeOverviewStatus(raw) {
  const s = String(raw || 'Đã xác nhận').trim();
  if (s === 'Vắng mặt (No-Show)' || s.includes('No-Show')) return 'Khách chưa đến';
  if (s.toLowerCase() === 'completed') return 'Hoàn thành';
  return s;
}

function matchesOverviewFilter(booking, filterType) {
  if (!filterType || filterType === 'all') return true;
  const st = normalizeOverviewStatus(booking.status);
  if (filterType === 'playing') return st === 'Đang đá';
  if (filterType === 'confirmed') return st === 'Đã xác nhận' || st === 'Chờ duyệt cọc';
  if (filterType === 'completed') return st === 'Hoàn thành';
  if (filterType === 'noshow') return st === 'Khách chưa đến' || st === 'Đã hủy';
  return true;
}

function toggleOverviewGraceInfo(force) {
  const panel = document.getElementById('ov-grace-info-panel');
  if (!panel) return;
  const show = typeof force === 'boolean' ? force : panel.classList.contains('hidden');
  panel.classList.toggle('hidden', !show);
}
window.toggleOverviewGraceInfo = toggleOverviewGraceInfo;

function toggleOverviewOverdue(force) {
  const wrap = document.getElementById('ov-overdue-list-wrap');
  const chev = document.getElementById('ov-overdue-chevron');
  if (!wrap) return;
  overviewOverdueOpen = typeof force === 'boolean' ? force : !overviewOverdueOpen;
  wrap.classList.toggle('hidden', !overviewOverdueOpen);
  if (chev) chev.textContent = overviewOverdueOpen ? 'Thu gọn ▴' : 'Bấm để mở ▾';
}
window.toggleOverviewOverdue = toggleOverviewOverdue;

function renderOverviewWeeklyChart(weeklySeries, prevWeeklySeries) {
  const series = Array.isArray(weeklySeries) ? weeklySeries : [];
  const prevSeries = Array.isArray(prevWeeklySeries) ? prevWeeklySeries : [];
  const totalEl = document.getElementById('overview-weekly-total');
  const svgEl = document.getElementById('overview-weekly-svg');
  const labelsEl = document.getElementById('overview-weekly-labels');

  const weeklyTotal = series.reduce((sum, item) => sum + Number(item?.revenue || 0), 0);
  if (totalEl) totalEl.textContent = `Tổng tuần: ${fmtOverviewVND(weeklyTotal)}`;

  if (!svgEl) return;
  const padLeft = 54;
  const padRight = 18;
  const topY = 18;
  const bottomY = 182;
  const chartW = 680 - padLeft - padRight;
  const chartH = bottomY - topY;

  const maxRev = Math.max(
    1,
    ...series.map(i => Number(i?.revenue || 0)),
    ...prevSeries.map(i => Number(i?.revenue || 0))
  );
  const niceMax = Math.ceil(maxRev / 500000) * 500000 || 500000;
  const fmtAxis = (v) => v >= 1000000 ? (v / 1000000).toFixed(1).replace('.0', '') + 'tr' : (v > 0 ? Math.round(v / 1000) + 'k' : '0');

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(frac => {
    const val = Math.round(niceMax * frac);
    const y = Math.round(bottomY - frac * chartH);
    return `
      <line x1="${padLeft}" y1="${y}" x2="${680 - padRight}" y2="${y}" stroke="#E2E8F0" stroke-dasharray="${frac === 0 ? '0' : '4'}"/>
      <text x="${padLeft - 8}" y="${y + 4}" text-anchor="end" fill="#64748B" font-size="10" font-weight="600">${fmtAxis(val)}</text>
    `;
  }).join('');

  if (series.length === 0) {
    svgEl.innerHTML = `${yTicks}<text x="${padLeft + chartW / 2}" y="100" text-anchor="middle" fill="#94A3B8" font-size="12" font-weight="600">Chưa có dữ liệu 7 ngày gần nhất</text>`;
    if (labelsEl) labelsEl.innerHTML = '<span class="text-slate-400">Chưa có dữ liệu tuần</span>';
    return;
  }

  const toPoints = (arr) => arr.map((item, idx) => {
    const rev = Number(item?.revenue || 0);
    const x = arr.length === 1 ? padLeft + chartW / 2 : Math.round(padLeft + (idx * chartW) / (arr.length - 1));
    const y = Math.round(bottomY - (rev / niceMax) * chartH);
    return { x, y, rev, matches: Number(item?.matches || 0), label: item?.label || item?.date || '' };
  });

  const curPts = toPoints(series);
  const prevPts = prevSeries.length === series.length ? toPoints(prevSeries) : [];

  const curLine = curPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const curArea = `${curLine} L${curPts[curPts.length - 1].x},${bottomY} L${curPts[0].x},${bottomY} Z`;
  const prevLine = prevPts.length > 0 ? prevPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') : '';

  const pointsHtml = curPts.map((p, idx) => {
    const prevRev = prevPts[idx] ? prevPts[idx].rev : 0;
    const isToday = idx === curPts.length - 1;
    const tipData = escapeSearchHTML(`${p.label}: ${fmtOverviewVND(p.rev)} (${p.matches} ca) | Tuần trước: ${fmtOverviewVND(prevRev)}`);
    return `
      <g class="ov-chart-pt cursor-pointer" data-tip="${tipData}" data-px="${p.x}" data-py="${p.y}">
        <circle cx="${p.x}" cy="${p.y}" r="12" fill="transparent"/>
        <circle cx="${p.x}" cy="${p.y}" r="${isToday ? 5.5 : 4}" fill="${isToday ? '#15803D' : '#16A34A'}" stroke="#ffffff" stroke-width="2"/>
      </g>
    `;
  }).join('');

  svgEl.innerHTML = `
    <defs>
      <linearGradient id="ovChartGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#16A34A" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="#16A34A" stop-opacity="0.0"/>
      </linearGradient>
    </defs>
    ${yTicks}
    ${prevLine ? `<path d="${prevLine}" fill="none" stroke="#94A3B8" stroke-width="2" stroke-dasharray="5 4" stroke-linecap="round"/>` : ''}
    <path d="${curArea}" fill="url(#ovChartGrad)"/>
    <path d="${curLine}" fill="none" stroke="#16A34A" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
    ${pointsHtml}
  `;

  // Interactive tooltip
  const tipEl = document.getElementById('overview-chart-tooltip');
  if (tipEl) {
    svgEl.querySelectorAll('.ov-chart-pt').forEach(g => {
      g.addEventListener('mouseenter', () => {
        const txt = g.getAttribute('data-tip') || '';
        const px = Number(g.getAttribute('data-px') || 0);
        const py = Number(g.getAttribute('data-py') || 0);
        tipEl.textContent = txt;
        tipEl.classList.remove('hidden');
        const leftPct = Math.min(82, Math.max(8, (px / 680) * 100));
        const topPct = Math.max(2, (py / 210) * 100 - 18);
        tipEl.style.left = leftPct + '%';
        tipEl.style.top = topPct + '%';
        tipEl.style.transform = 'translateX(-50%)';
      });
      g.addEventListener('mouseleave', () => tipEl.classList.add('hidden'));
    });
  }

  if (labelsEl) {
    labelsEl.innerHTML = series.map((item, idx) => {
      const isLast = idx === series.length - 1;
      const lbl = escapeSearchHTML(item?.label || item?.date || '');
      return isLast ? `<span class="font-bold text-[#16A34A]">${lbl}</span>` : `<span>${lbl}</span>`;
    }).join('');
  }
}
window.renderOverviewWeeklyChart = renderOverviewWeeklyChart;

function renderOverviewPitchShares(byPitch) {
  const container = document.getElementById('overview-pitch-shares');
  if (!container) return;
  const list = Array.isArray(byPitch) ? [...byPitch] : [];
  const totalRev = list.reduce((sum, p) => sum + Number(p?.revenue || 0), 0);
  const maintList = list.filter(p => p?.status === 'Bảo trì');
  const sorted = list
    .filter(p => Number(p?.revenue || 0) > 0 || Number(p?.matches || 0) > 0)
    .sort((a, b) => (Number(b.revenue || 0) - Number(a.revenue || 0)) || (Number(b.matches || 0) - Number(a.matches || 0)))
    .slice(0, 6);

  if (sorted.length === 0 || totalRev <= 0) {
    container.innerHTML = `
      <div class="text-xs text-slate-400 italic py-4 text-center">Chưa có doanh thu theo sân phát sinh hôm nay.</div>
      ${maintList.length > 0 ? `<div class="text-[11px] text-[#64748B] mt-3 pt-3 border-t border-[#E2E8F0]">* Đang bảo trì: ${escapeSearchHTML(maintList.map(m => m.name).join(', '))}</div>` : ''}
    `;
    return;
  }

  container.innerHTML = sorted.map((p, idx) => {
    const rev = Number(p.revenue || 0);
    const pct = totalRev > 0 ? Math.round((rev / totalRev) * 100) : 0;
    return `
      <div>
        <div class="flex justify-between gap-2 ${idx > 0 ? 'pt-1' : ''}">
          <span class="truncate" title="${escapeSearchHTML(p.name)}">${escapeSearchHTML(p.name)} <span class="text-slate-400">(${Number(p.matches || 0)} ca)</span></span>
          <b class="${idx === 0 ? 'text-[#16A34A]' : 'text-[#0F172A]'} shrink-0">${pct}% · ${fmtOverviewVND(rev)}</b>
        </div>
        <div class="w-full h-2 rounded bg-slate-100 mt-1 overflow-hidden">
          <div style="width:${Math.max(0, Math.min(100, pct))}%" class="h-full rounded ${idx === 0 ? 'bg-[#16A34A]' : 'bg-[#0F172A]'}"></div>
        </div>
      </div>
    `;
  }).join('') + (maintList.length > 0 ? `<div class="text-[11px] text-[#64748B] mt-3 pt-3 border-t border-[#E2E8F0]">* Đang bảo trì: ${escapeSearchHTML(maintList.map(m => m.name).join(', '))}</div>` : '');
}
window.renderOverviewPitchShares = renderOverviewPitchShares;

function renderMiniTimeline(miniTimeline) {
  const body = document.getElementById('ov-mini-timeline-body');
  if (!body) return;
  const rows = Array.isArray(miniTimeline) ? miniTimeline : [];
  if (rows.length === 0) {
    body.innerHTML = '<div class="py-5 text-center text-xs text-[#94A3B8]">Hôm nay chưa có lịch thi đấu trên sân nào.</div>';
    return;
  }

  const startDay = 330;  // 05:30
  const endDay = 1350;   // 22:30
  const span = endDay - startDay;
  const now = new Date();
  const curMin = now.getHours() * 60 + now.getMinutes();
  const showNowLine = curMin >= startDay && curMin <= endDay;
  const nowPct = showNowLine ? (((curMin - startDay) / span) * 100).toFixed(2) : 0;
  const nowLabel = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const hourMarks = [6, 9, 12, 15, 18, 21].map(h => {
    const pct = (((h * 60 - startDay) / span) * 100).toFixed(2);
    return `<span style="left:${pct}%" class="absolute -translate-x-1/2 text-[10px] text-[#64748B] font-mono">${String(h).padStart(2, '0')}:00</span>`;
  }).join('');

  const rowsHtml = rows.map(r => {
    const blocks = (r.bookings || []).map(b => {
      const s = Math.max(startDay, Math.min(endDay, Number(b.startMin || startDay)));
      const e = Math.max(s + 30, Math.min(endDay, Number(b.endMin || s + 120)));
      const leftPct = (((s - startDay) / span) * 100).toFixed(2);
      const widthPct = Math.max(3, ((e - s) / span) * 100).toFixed(2);
      const st = normalizeOverviewStatus(b.status);
      const cls = st === 'Đang đá' ? 'bg-[#16A34A] text-white' : (st === 'Hoàn thành' ? 'bg-slate-400 text-white' : 'bg-sky-500 text-white');
      return `<button type="button" onclick="openInPlayModal('${escapeSearchHTML(b.code)}')" style="left:${leftPct}%;width:${widthPct}%" title="#${escapeSearchHTML(b.code)} · ${escapeSearchHTML(b.slotTime)} · ${escapeSearchHTML(formatTitleCaseVN(b.customerName))} (${escapeSearchHTML(st)})" class="absolute top-1 bottom-1 rounded px-1.5 text-[10px] font-bold truncate cursor-pointer hover:opacity-90 ${cls}">${escapeSearchHTML(formatTitleCaseVN(b.customerName))}</button>`;
    }).join('');

    return `
      <div class="flex items-center gap-2 py-1 border-b border-slate-100 last:border-b-0">
        <div class="w-36 sm:w-44 shrink-0 text-[11px] font-bold text-[#0F172A] truncate" title="${escapeSearchHTML(r.pitchName)}">${escapeSearchHTML(r.pitchName)}</div>
        <div class="relative flex-1 h-7 bg-slate-50 rounded-lg border border-slate-200/70 overflow-hidden">
          ${blocks}
          ${showNowLine ? `<div style="left:${nowPct}%" class="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10 pointer-events-none"></div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  body.innerHTML = `
    <div class="min-w-[540px]">
      <div class="flex items-center gap-2 pb-4 mb-1">
        <div class="w-36 sm:w-44 shrink-0 text-[10px] font-bold text-[#64748B] uppercase">Sân bóng</div>
        <div class="relative flex-1 h-4">
          ${hourMarks}
          ${showNowLine ? `<span style="left:${nowPct}%" class="absolute -translate-x-1/2 top-0 px-1 rounded bg-rose-500 text-white text-[9px] font-bold">${nowLabel}</span>` : ''}
        </div>
      </div>
      ${rowsHtml}
    </div>
  `;
}

function updateBatchBar() {
  const bar = document.getElementById('ov-batch-bar');
  const cntEl = document.getElementById('ov-batch-count');
  const cnt = overviewSelectedCodes.size;
  if (cntEl) cntEl.textContent = String(cnt);
  if (bar) bar.classList.toggle('hidden', cnt === 0);
}

window.toggleOverviewRowSelect = function(code, checked) {
  if (!code) return;
  if (checked) overviewSelectedCodes.add(code);
  else overviewSelectedCodes.delete(code);
  updateBatchBar();
};

window.toggleSelectAllOverview = function(checked) {
  document.querySelectorAll('.ov-row-checkbox').forEach(cb => {
    cb.checked = checked;
    const code = cb.getAttribute('data-code');
    if (code) {
      if (checked) overviewSelectedCodes.add(code);
      else overviewSelectedCodes.delete(code);
    }
  });
  updateBatchBar();
};

window.clearOverviewSelection = function() {
  overviewSelectedCodes.clear();
  const selAll = document.getElementById('ov-select-all');
  if (selAll) selAll.checked = false;
  document.querySelectorAll('.ov-row-checkbox').forEach(cb => { cb.checked = false; });
  updateBatchBar();
};

window.runOverviewBatchOp = async function(op) {
  const codes = Array.from(overviewSelectedCodes);
  if (codes.length === 0) return;
  const labels = {
    complete: 'Hoàn tất & Thu đủ',
    collect_full: 'Xác nhận Thu đủ',
    noshow_release: 'Hủy No-show & Nhả sân'
  };
  const ok = typeof showAdminConfirm === 'function'
    ? await showAdminConfirm({
        title: `Xử lý hàng loạt (${codes.length} ca)`,
        message: `Thực hiện "${labels[op] || op}" cho ${codes.length} ca đã chọn? Thao tác sẽ được ghi vào Nhật ký Admin.`,
        confirmText: labels[op] || 'Xác nhận',
        cancelText: 'Hủy',
        danger: op === 'noshow_release'
      })
    : confirm(`Thực hiện "${labels[op] || op}" cho ${codes.length} ca đã chọn?`);
  if (!ok) return;

  const r = await adminFetchJson('../api/bookings.php?action=batch_ops', {
    method: 'POST',
    body: JSON.stringify({ op, codes })
  });
  if (!r.ok) {
    window.SanBongApp?.showToast?.(r.message || 'Lỗi xử lý hàng loạt.', 'error');
    return;
  }
  clearOverviewSelection();
  window.SanBongApp?.showToast?.(r.message || `Đã xử lý ${codes.length} ca thành công!`, 'success');
  overviewLastHash = '';
  await renderOverviewKPIs(true);
};

window.toggleOverviewRowMenu = function(e, menuId) {
  if (e) e.stopPropagation();
  document.querySelectorAll('.ov-row-menu').forEach(m => {
    if (m.id !== menuId) m.classList.add('hidden');
  });
  const el = document.getElementById(menuId);
  if (el) el.classList.toggle('hidden');
};

document.addEventListener('click', (e) => {
  if (!e.target.closest('.ov-row-menu') && !e.target.closest('.ov-row-menu-btn')) {
    document.querySelectorAll('.ov-row-menu').forEach(m => m.classList.add('hidden'));
  }
});

function buildBookingRowHTML(b, isOverdue) {
  const code = escapeSearchHTML(b.code || '');
  const st = normalizeOverviewStatus(b.status);
  const custName = escapeSearchHTML(formatTitleCaseVN(b.customerName));
  const phone = escapeSearchHTML(formatPhoneVN(b.phone));
  const pitch = escapeSearchHTML(b.pitchName || b.pitchId || '');
  const slot = escapeSearchHTML(b.slotTime || '');
  const dateStr = escapeSearchHTML(b.date || '');
  const rem = Number(b.remainingAmount || 0);
  const checked = overviewSelectedCodes.has(b.code) ? 'checked' : '';
  const menuId = `ov-menu-${code}`;

  const statusPill = st === 'Đang đá'
    ? '<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] whitespace-nowrap">Đang đá</span>'
    : (st === 'Hoàn thành'
      ? '<span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] whitespace-nowrap">Hoàn thành</span>'
      : (st === 'Khách chưa đến' || st === 'Đã hủy'
        ? `<span class="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px] whitespace-nowrap">${escapeSearchHTML(st)}</span>`
        : '<span class="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold text-[10px] whitespace-nowrap">Chờ Check-in</span>'));

  // Mỗi dòng chỉ 1 nút chính theo trạng thái, còn lại vào menu "⋯"; không có nút bị disable
  let primaryBtn = '';
  let menuItems = [];

  if (st === 'Đã xác nhận' || st === 'Chờ duyệt cọc') {
    if (!isOverdue) {
      primaryBtn = `<button type="button" onclick="handleCheckIn('${code}')" class="h-8 px-3 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs whitespace-nowrap cursor-pointer">Check-in</button>`;
      menuItems.push(`<button type="button" onclick="openInPlayModal('${code}')" class="w-full text-left px-3 py-2 hover:bg-slate-50 font-semibold text-[#0F172A] cursor-pointer">Điều hành &amp; Thanh toán</button>`);
      menuItems.push(`<button type="button" onclick="handleNoShowRelease('${code}')" class="w-full text-left px-3 py-2 hover:bg-rose-50 font-semibold text-rose-600 cursor-pointer">Hủy no-show (nhả sân)</button>`);
    } else {
      primaryBtn = `<button type="button" onclick="openInPlayModal('${code}')" class="h-8 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs whitespace-nowrap cursor-pointer">Xử lý tồn đọng</button>`;
    }
  } else if (st === 'Đang đá') {
    primaryBtn = `<button type="button" onclick="openInPlayModal('${code}')" class="h-8 px-3 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs whitespace-nowrap cursor-pointer">Thu tiền &amp; Kết thúc</button>`;
  } else if (st === 'Hoàn thành') {
    primaryBtn = `<button type="button" onclick="openInPlayModal('${code}')" class="h-8 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-[#334155] font-semibold text-xs whitespace-nowrap cursor-pointer">Xem hóa đơn</button>`;
  } else {
    primaryBtn = `<button type="button" onclick="openInPlayModal('${code}')" class="h-8 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-[#334155] font-semibold text-xs whitespace-nowrap cursor-pointer">Chi tiết</button>`;
  }

  const menuHtml = menuItems.length > 0 ? `
    <div class="relative">
      <button type="button" onclick="toggleOverviewRowMenu(event, '${menuId}')" class="ov-row-menu-btn w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-[#475569] font-extrabold text-sm flex items-center justify-center cursor-pointer" aria-label="Thao tác khác">⋯</button>
      <div id="${menuId}" class="ov-row-menu hidden absolute right-0 top-9 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-30 text-xs">
        ${menuItems.join('')}
      </div>
    </div>
  ` : '';

  return `
    <div class="p-3 rounded-xl border ${isOverdue ? 'border-amber-200 bg-amber-50/30' : 'border-[#E2E8F0] bg-white'} hover:border-slate-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="flex items-start sm:items-center gap-2.5 min-w-0">
        <input type="checkbox" data-code="${code}" ${checked} onchange="toggleOverviewRowSelect('${code}', this.checked)" class="ov-row-checkbox mt-1 sm:mt-0 w-4 h-4 rounded accent-[#16A34A] shrink-0 cursor-pointer" aria-label="Chọn ca #${code}">
        <div class="min-w-0 space-y-0.5">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-mono font-bold text-[#0F172A]">#${code}</span>
            ${statusPill}
            <span class="font-bold text-[#0F172A] truncate">${pitch}</span>
            <span class="text-[#64748B] font-semibold">${isOverdue ? `${dateStr} · ` : ''}${slot}</span>
          </div>
          <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[#475569]">
            <span class="font-semibold text-[#0F172A]">${custName}</span>
            <span class="font-mono">${phone}</span>
            <span>Tổng: <b class="text-[#0F172A]">${fmtOverviewVND(b.totalPrice)}</b></span>
            ${rem > 0 ? `<span class="text-amber-700 font-bold">Còn thu: ${fmtOverviewVND(rem)}</span>` : '<span class="text-[#16A34A] font-semibold">Đã thu đủ</span>'}
          </div>
        </div>
      </div>
      <div class="flex items-center justify-end gap-1.5 shrink-0">
        ${primaryBtn}
        ${menuHtml}
      </div>
    </div>
  `;
}

function renderOverviewLists() {
  const data = overviewSummaryCache;
  if (!data) return;

  const todayAll = Array.isArray(data.todayBookings) ? data.todayBookings : [];
  const overdueAll = Array.isArray(data.overdueBookings) ? data.overdueBookings : [];

  // Cập nhật số đếm tab lọc (gồm cả hôm nay + tồn đọng)
  const combined = [...todayAll, ...overdueAll];
  const counts = {
    all: combined.length,
    playing: combined.filter(b => matchesOverviewFilter(b, 'playing')).length,
    confirmed: combined.filter(b => matchesOverviewFilter(b, 'confirmed')).length,
    completed: combined.filter(b => matchesOverviewFilter(b, 'completed')).length,
    noshow: combined.filter(b => matchesOverviewFilter(b, 'noshow')).length
  };
  Object.keys(counts).forEach(k => {
    const el = document.getElementById('ov-cnt-' + k);
    if (el) el.textContent = `(${counts[k]})`;
  });

  // Lọc danh sách hôm nay + phân trang
  const filteredToday = todayAll.filter(b => matchesOverviewFilter(b, currentOverviewFilter));
  const totalPages = Math.max(1, Math.ceil(filteredToday.length / OVERVIEW_PAGE_SIZE));
  if (currentOverviewPage > totalPages) currentOverviewPage = totalPages;
  if (currentOverviewPage < 1) currentOverviewPage = 1;

  const startIdx = (currentOverviewPage - 1) * OVERVIEW_PAGE_SIZE;
  const pageItems = filteredToday.slice(startIdx, startIdx + OVERVIEW_PAGE_SIZE);

  const container = document.getElementById('overview-today-bookings');
  if (container) {
    if (pageItems.length === 0) {
      container.innerHTML = '<div class="py-6 text-center text-[#94A3B8]">Không có ca thi đấu hôm nay trong nhóm lọc này.</div>';
    } else {
      container.innerHTML = pageItems.map(b => buildBookingRowHTML(b, false)).join('');
    }
  }

  const pagEl = document.getElementById('ov-pagination');
  if (pagEl) {
    if (filteredToday.length > OVERVIEW_PAGE_SIZE) {
      pagEl.classList.remove('hidden');
      const infoEl = document.getElementById('ov-page-info');
      const numEl = document.getElementById('ov-page-num');
      const prevBtn = document.getElementById('ov-prev-page');
      const nextBtn = document.getElementById('ov-next-page');
      if (infoEl) infoEl.textContent = `Hiển thị ${startIdx + 1} - ${startIdx + pageItems.length} / ${filteredToday.length} ca`;
      if (numEl) numEl.textContent = `${currentOverviewPage} / ${totalPages}`;
      if (prevBtn) prevBtn.disabled = currentOverviewPage <= 1;
      if (nextBtn) nextBtn.disabled = currentOverviewPage >= totalPages;
    } else {
      pagEl.classList.add('hidden');
    }
  }

  // Khối Ca tồn đọng (áp dụng cùng bộ lọc, thu gọn thanh cảnh báo)
  const filteredOverdue = overdueAll.filter(b => matchesOverviewFilter(b, currentOverviewFilter));
  const overdueSec = document.getElementById('ov-overdue-section');
  const overdueTxt = document.getElementById('ov-overdue-banner-text');
  const overdueListEl = document.getElementById('ov-overdue-bookings');

  if (overdueSec) {
    if (overdueAll.length === 0) {
      overdueSec.classList.add('hidden');
    } else {
      overdueSec.classList.remove('hidden');
      if (overdueTxt) {
        overdueTxt.textContent = filteredOverdue.length === overdueAll.length
          ? `${overdueAll.length} ca tồn đọng từ ngày trước chưa xử lý`
          : `${filteredOverdue.length} / ${overdueAll.length} ca tồn đọng (đang lọc)`;
      }
      if (overdueListEl) {
        overdueListEl.innerHTML = filteredOverdue.length === 0
          ? '<div class="py-3 text-center text-[#94A3B8]">Không có ca tồn đọng nào khớp bộ lọc hiện tại.</div>'
          : filteredOverdue.map(b => buildBookingRowHTML(b, true)).join('');
      }
    }
  }
}

window.changeOverviewPage = function(delta) {
  currentOverviewPage += delta;
  renderOverviewLists();
};

window.filterOverviewBookings = function(filterType) {
  currentOverviewFilter = filterType || 'all';
  currentOverviewPage = 1;
  ['all', 'playing', 'confirmed', 'completed', 'noshow'].forEach(f => {
    const btn = document.getElementById('ov-filter-' + f);
    if (btn) {
      btn.className = f === currentOverviewFilter
        ? 'px-3 py-1.5 rounded-lg text-xs font-bold bg-[#16A34A] text-white cursor-pointer'
        : 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer';
    }
  });
  renderOverviewLists();
};

function applyOverviewSummary(data) {
  overviewSummaryCache = data;
  const kpi = data.kpi || {};
  const setTxt = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };

  if (isManagerOrAdmin() && kpi.recognizedRevenue !== null) {
    setTxt('kpi-revenue-value', fmtOverviewVND(kpi.recognizedRevenue));
    setTxt('kpi-rev-collected', fmtOverviewVND(kpi.collectedRevenue));
    setTxt('kpi-rev-split', `${fmtOverviewVND(kpi.depositCollected)} / ${fmtOverviewVND(kpi.remainingCollected)}`);
    setTxt('kpi-rev-uncollected', fmtOverviewVND(kpi.uncollectedRevenue));
    renderOverviewWeeklyChart(data.weeklySeries || [], data.prevWeeklySeries || []);
    renderOverviewPitchShares(data.byPitch || []);
  }

  setTxt('kpi-bookings-count', `${Number(kpi.todayCount || 0)} lượt`);
  const pendEl = document.getElementById('kpi-bookings-pending');
  if (pendEl) {
    const pCnt = Number(kpi.pendingVietqrCount || 0);
    pendEl.textContent = isManagerOrAdmin()
      ? (pCnt > 0 ? `${pCnt} đơn chờ duyệt cọc VietQR` : '✓ Đã duyệt hết cọc VietQR')
      : `${Number(kpi.waitingCheckinCount || 0)} ca chờ check-in`;
  }

  const peakPct = Number(kpi.peakOccupancyPct || 0);
  setTxt('kpi-occupancy-value', `${peakPct}%`);
  const bar = document.getElementById('kpi-occupancy-bar');
  if (bar) bar.style.width = `${Math.min(100, peakPct)}%`;
  setTxt('kpi-occupancy-formula', kpi.peakFormula || 'Ca cao điểm / (Sân hoạt động × khung 17:30–21:00)');

  setTxt('kpi-pitches-ready', `${Number(kpi.activePitches || 0)}/${Number(kpi.totalPitches || 0)} Sân sẵn sàng`);
  setTxt('kpi-pitches-sub', `${Number(kpi.playingCount || 0)} đang đá · ${Number(kpi.maintPitches || 0)} bảo trì`);

  renderMiniTimeline(data.miniTimeline || []);
  renderOverviewLists();
}

async function renderOverviewKPIs(force) {
  const res = await adminFetchJson('../api/dashboard_summary.php');
  if (!res.ok || !res.data) return;

  // Chỉ cập nhật DOM khi dữ liệu thực sự thay đổi (hoặc khi force)
  const newHash = String(res.data.hash || '');
  if (!force && newHash && newHash === overviewLastHash) {
    return;
  }
  overviewLastHash = newHash;

  // Đồng bộ nhanh về SanBongDB cache cho các modal (In-Play, QR)
  const db = window.SanBongApp?.SanBongDB;
  if (db) {
    try {
      const todayISO = res.data.today || getLocalTodayISO();
      const existing = db.getAllBookings();
      const mapByCode = new Map();
      existing.forEach(b => mapByCode.set(b.code, b));
      [...(res.data.todayBookings || []), ...(res.data.overdueBookings || [])].forEach(b => mapByCode.set(b.code, b));
      localStorage.setItem('sb_bookings_v1', JSON.stringify(Array.from(mapByCode.values())));
    } catch (e) {}
  }

  applyOverviewSummary(res.data);
}
window.renderOverviewKPIs = renderOverviewKPIs;
window.renderOverviewTodayBookings = renderOverviewLists;

function startOverviewAutoRefresh() {
  if (overviewRefreshTimer) return;
  overviewRefreshTimer = setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    const ovTab = document.getElementById('tab-content-overview');
    if (ovTab && !ovTab.classList.contains('hidden')) {
      renderOverviewKPIs(false);
    }
  }, 30000);
}
startOverviewAutoRefresh();

function refreshAllAdminViews(codeOpt) {
  overviewLastHash = '';
  renderOverviewKPIs(true);
  if (typeof renderTimelineGantt === 'function') renderTimelineGantt();
  if (typeof renderAdminPitches === 'function') renderAdminPitches();
  if (typeof renderAdminCustomers === 'function') renderAdminCustomers();
  if (typeof renderAdminInventory === 'function') renderAdminInventory();
  if (typeof loadShiftHandovers === 'function') loadShiftHandovers();
  if (isManagerOrAdmin()) {
    if (typeof renderAdminPayments === 'function') renderAdminPayments();
    if (typeof loadBankTransactions === 'function') loadBankTransactions();
    if (typeof renderAdminReports === 'function') renderAdminReports();
  }
  if (typeof populateInPlayWorkspace === 'function') populateInPlayWorkspace(codeOpt || window.activeInPlayCode);
}
window.refreshAllAdminViews = refreshAllAdminViews;

async function handleCheckIn(code) {
  if (!code) return;
  const r = await adminFetchJson('../api/bookings.php?action=checkin&code=' + encodeURIComponent(code), {
    method: 'POST',
    body: JSON.stringify({ code })
  });
  if (!r.ok) {
    window.SanBongApp?.showToast?.(r.message || 'Không thể check-in lúc này!', 'error');
    return;
  }
  refreshAllAdminViews(code);
  window.SanBongApp?.showToast?.(r.message || `Check-in thành công ca #${code}!`, 'success');
}
window.handleCheckIn = window.handleCheckin = handleCheckIn;

async function handleNoShowRelease(code) {
  if (!code) return;
  const confirmed = typeof showAdminConfirm === 'function'
    ? await showAdminConfirm({
        title: 'Xác nhận Chưa Đến & Nhả Sân',
        message: `Khách ca #${code} quá 15 phút chưa đến. Tịch thu cọc 30% và nhả sân trống ngay?`,
        confirmText: 'Nhả sân & Tịch thu cọc',
        cancelText: 'Hủy',
        danger: true
      })
    : confirm(`Tịch thu cọc 30% và nhả sân đơn #${code}?`);
  if (!confirmed) return;

  const r = await adminFetchJson('../api/bookings.php?action=noshow_release&code=' + encodeURIComponent(code), {
    method: 'POST',
    body: JSON.stringify({ code })
  });
  if (!r.ok) {
    window.SanBongApp?.showToast?.(r.message || 'Không thể nhả sân lúc này!', 'error');
    return;
  }
  refreshAllAdminViews(code);
  window.SanBongApp?.showToast?.(r.message || `Đã nhả sân trống đơn #${code}!`, 'warning');
}
window.handleShowRelease = window.handleNoShowRelease = handleNoShowRelease;
