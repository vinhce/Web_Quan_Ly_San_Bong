let currentOverviewFilter = 'all';

function renderOverviewWeeklyChart(weeklySeries) {
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');
  const series = Array.isArray(weeklySeries) ? weeklySeries : [];
  const totalEl = document.getElementById('overview-weekly-total');
  const svgEl = document.getElementById('overview-weekly-svg');
  const labelsEl = document.getElementById('overview-weekly-labels');

  const weeklyTotal = series.reduce((sum, item) => sum + Number(item?.revenue || 0), 0);
  if (totalEl) {
    totalEl.textContent = `Tổng tuần: ${fmt(weeklyTotal)}`;
  }

  if (svgEl) {
    const gridHtml = `
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#16A34A" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#16A34A" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      <line x1="0" y1="40" x2="680" y2="40" stroke="#E2E8F0" stroke-dasharray="4"/>
      <line x1="0" y1="90" x2="680" y2="90" stroke="#E2E8F0" stroke-dasharray="4"/>
      <line x1="0" y1="140" x2="680" y2="140" stroke="#E2E8F0" stroke-dasharray="4"/>
    `;
    if (series.length === 0) {
      svgEl.innerHTML = gridHtml + `<text x="340" y="95" text-anchor="middle" fill="#94A3B8" font-size="12" font-weight="600">Chưa có dữ liệu 7 ngày gần nhất</text>`;
    } else {
      const maxRev = Math.max(...series.map(item => Number(item?.revenue || 0)), 0);
      const padX = 24;
      const topY = 22;
      const bottomY = 155;
      const spanX = 680 - padX * 2;
      const pts = series.map((item, idx) => {
        const rev = Number(item?.revenue || 0);
        const x = series.length === 1 ? 340 : Math.round(padX + (idx * spanX) / (series.length - 1));
        const y = maxRev > 0 ? Math.round(bottomY - ((rev / maxRev) * (bottomY - topY))) : bottomY;
        return {
          x,
          y,
          rev,
          matches: Number(item?.matches || 0),
          label: item?.label || item?.date || ''
        };
      });

      const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
      const areaPath = pts.length === 1
        ? `M${pts[0].x - 20},${bottomY} L${pts[0].x - 20},${pts[0].y} L${pts[0].x + 20},${pts[0].y} L${pts[0].x + 20},${bottomY} Z`
        : `${linePath} L${pts[pts.length - 1].x},${bottomY} L${pts[0].x},${bottomY} Z`;

      const circlesHtml = pts.map((p, idx) => {
        const isToday = idx === pts.length - 1;
        return `<circle cx="${p.x}" cy="${p.y}" r="${isToday ? 5.5 : 4}" fill="${isToday ? '#15803D' : '#16A34A'}" stroke="#ffffff" stroke-width="2"><title>${escapeSearchHTML(p.label)}: ${escapeSearchHTML(fmt(p.rev))} (${p.matches} ca)</title></circle>`;
      }).join('');

      svgEl.innerHTML = `
        ${gridHtml}
        <path d="${areaPath}" fill="url(#chartGrad)"/>
        <path d="${linePath}" fill="none" stroke="#16A34A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        ${circlesHtml}
      `;
    }
  }

  if (labelsEl) {
    if (series.length === 0) {
      labelsEl.innerHTML = '<span class="text-slate-400">Chưa có dữ liệu tuần</span>';
    } else {
      labelsEl.innerHTML = series.map((item, idx) => {
        const isLast = idx === series.length - 1;
        const lbl = escapeSearchHTML(item?.label || item?.date || '');
        return isLast
          ? `<span class="font-bold text-[#16A34A]">${lbl || 'Hôm nay'}</span>`
          : `<span>${lbl}</span>`;
      }).join('');
    }
  }
}
window.renderOverviewWeeklyChart = renderOverviewWeeklyChart;

function renderOverviewPitchShares(byPitch) {
  const container = document.getElementById('overview-pitch-shares');
  if (!container) return;

  const list = Array.isArray(byPitch) ? [...byPitch] : [];
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');
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

  const barColors = ['#16A34A', '#22C55E', '#2563EB', '#0F172A', '#F59E0B', '#7C3AED'];
  const barsHtml = sorted.map((p, idx) => {
    const rev = Number(p.revenue || 0);
    const pct = totalRev > 0 ? Math.round((rev / totalRev) * 100) : 0;
    const color = barColors[idx % barColors.length];
    return `
      <div>
        <div class="flex justify-between gap-2 ${idx > 0 ? 'pt-1' : ''}">
          <span class="truncate" title="${escapeSearchHTML(p.name)}">${escapeSearchHTML(p.name)} <span class="text-slate-400">(${Number(p.matches || 0)} ca)</span></span>
          <b class="${idx === 0 ? 'text-[#16A34A]' : 'text-[#0F172A]'} shrink-0">${pct}% · ${escapeSearchHTML(fmt(rev))}</b>
        </div>
        <div class="w-full h-2 rounded bg-slate-100 mt-1 overflow-hidden">
          <div style="width:${Math.max(0, Math.min(100, pct))}%; background:${color}" class="h-full rounded"></div>
        </div>
      </div>
    `;
  }).join('');

  const maintNote = maintList.length > 0
    ? `<div class="text-[11px] text-[#64748B] mt-3 pt-3 border-t border-[#E2E8F0]">* Sân đang bảo trì: ${escapeSearchHTML(maintList.map(m => m.name).join(', '))}</div>`
    : '';

  container.innerHTML = barsHtml + maintNote;
}
window.renderOverviewPitchShares = renderOverviewPitchShares;

function applyOverviewKPIsData(data) {
  const db = window.SanBongApp?.SanBongDB;
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  const todayStats = data?.todayStats || {};
  const todayBookings = Array.isArray(data?.todayBookings) ? data.todayBookings : [];
  const pitchStats = data?.pitchStats || {};
  const weeklySeries = Array.isArray(data?.weeklySeries) ? data.weeklySeries : [];
  const byPitch = Array.isArray(data?.byPitch) ? data.byPitch : [];

  const pitches = db ? db.getPitches() : [];
  const totalPitches = Number(pitchStats.total ?? pitches.length ?? 0);
  const maintCount = byPitch.length > 0
    ? byPitch.filter(p => p.status === 'Bảo trì').length
    : pitches.filter(p => p.status === 'Bảo trì').length;
  const activePitches = Number(pitchStats.active ?? Math.max(0, totalPitches - maintCount));

  const totalCount = Number(todayStats.count ?? todayBookings.length ?? 0);
  let playingCount = 0;
  let waitingCheckinCount = 0;
  let pendingVietQRCount = 0;
  let activeTodayBookings = 0;

  todayBookings.forEach(b => {
    const st = (b.status === 'Vắng mặt (No-Show)' || String(b.status || '').includes('No-Show')) ? 'Khách chưa đến' : (b.status || '');
    const paySt = b.paymentStatus || b.payment_status || '';
    if (st === 'Đang đá') playingCount++;
    if (st === 'Đã xác nhận' || st === 'Chờ duyệt cọc') waitingCheckinCount++;
    if (paySt === 'Chờ duyệt cọc' && st !== 'Đã hủy' && st !== 'Khách chưa đến') pendingVietQRCount++;
    if (st !== 'Đã hủy' && st !== 'Khách chưa đến') activeTodayBookings++;
  });

  const slotsPerDay = (db?.getTimeSlots?.().length || 18);
  const capacity = activePitches * slotsPerDay;
  const occupancyPct = capacity > 0 ? Math.min(100, Math.round((activeTodayBookings / capacity) * 100)) : 0;

  const revEl = document.getElementById('kpi-revenue-value');
  const revSubEl = document.getElementById('kpi-revenue-sub');
  const cntEl = document.getElementById('kpi-bookings-count');
  const pendingEl = document.getElementById('kpi-bookings-pending');
  const occValEl = document.getElementById('kpi-occupancy-value');
  const occBarEl = document.getElementById('kpi-occupancy-bar');
  const readyEl = document.getElementById('kpi-pitches-ready');
  const subEl = document.getElementById('kpi-pitches-sub');

  if (isManagerOrAdmin()) {
    const todayTotalRev = Number(todayStats.today_total ?? 0);
    const todayDepositRev = Number(todayStats.today_deposit ?? 0);
    if (revEl) revEl.textContent = fmt(todayTotalRev);
    if (revSubEl) {
      if (weeklySeries.length >= 2) {
        const yestRev = Number(weeklySeries[weeklySeries.length - 2]?.revenue ?? 0);
        if (yestRev > 0) {
          const pct = Math.round(((todayTotalRev - yestRev) / yestRev) * 100);
          const arrow = pct >= 0 ? '↑' : '↓';
          revSubEl.innerHTML = `<span class="${pct >= 0 ? 'text-[#16A34A]' : 'text-rose-600'} font-semibold">${arrow} ${Math.abs(pct)}%</span> <span class="text-[#64748B] font-normal">so với hôm qua · Đã cọc ${escapeSearchHTML(fmt(todayDepositRev))}</span>`;
        } else {
          revSubEl.textContent = `Đã thu cọc hôm nay: ${fmt(todayDepositRev)}`;
        }
      } else {
        revSubEl.textContent = `Đã thu cọc hôm nay: ${fmt(todayDepositRev)}`;
      }
    }
    renderOverviewWeeklyChart(weeklySeries);
    renderOverviewPitchShares(byPitch);
  }

  if (cntEl) cntEl.textContent = `${totalCount} lượt`;
  if (pendingEl) {
    if (isManagerOrAdmin()) {
      pendingEl.textContent = pendingVietQRCount > 0
        ? `${pendingVietQRCount} đơn đang giữ chỗ VietQR`
        : '✓ Đã duyệt hết cọc VietQR';
    } else {
      pendingEl.textContent = `${waitingCheckinCount} ca đang chờ check-in`;
    }
  }
  if (occValEl) occValEl.textContent = `${occupancyPct}%`;
  if (occBarEl) occBarEl.style.width = `${occupancyPct}%`;
  if (readyEl) readyEl.textContent = `${activePitches}/${totalPitches} Sân sẵn sàng`;
  if (subEl) subEl.textContent = `${playingCount} đang đá · ${maintCount} bảo trì mặt cỏ`;
}
window.applyOverviewKPIsData = applyOverviewKPIsData;

async function renderOverviewKPIs() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const res = await adminFetchJson('../api/admin.php?action=overview');
  if (res.ok && res.data) {
    const serverBookings = Array.isArray(res.data.todayBookings) ? res.data.todayBookings : [];
    const todayISO = getLocalTodayISO();
    try {
      const existing = db.getAllBookings();
      const otherDates = existing.filter(b => (b.date || b.booking_date) !== todayISO);
      const merged = [...serverBookings, ...otherDates];
      localStorage.setItem('sb_bookings_v1', JSON.stringify(merged));
    } catch (e) {}

    applyOverviewKPIsData(res.data);
    renderOverviewTodayBookings();
    return;
  }

  const todayISO = getLocalTodayISO();
  const allBookings = db.getAllBookings();
  const todayBookings = allBookings.filter(b => (b.date || b.booking_date) === todayISO && b.status !== 'Đã hủy');
  const pitches = db.getPitches();

  let todayTotal = 0;
  let todayDeposit = 0;
  todayBookings.forEach(b => {
    const st = b.status || '';
    if (st === 'Hoàn thành') {
      todayTotal += Number(b.totalPrice || 0);
      todayDeposit += Number(b.depositAmount || 0);
    } else if (st !== 'Khách chưa đến') {
      todayTotal += Number(b.totalPrice || 0);
      todayDeposit += Number(b.depositAmount || 0);
    }
  });

  applyOverviewKPIsData({
    todayStats: {
      count: todayBookings.length,
      today_total: isManagerOrAdmin() ? todayTotal : null,
      today_deposit: isManagerOrAdmin() ? todayDeposit : null
    },
    todayBookings,
    pitchStats: {
      total: pitches.length,
      active: pitches.filter(p => p.status === 'Hoạt động').length
    },
    weeklySeries: [],
    byPitch: []
  });
}
window.renderOverviewKPIs = renderOverviewKPIs;

function refreshAllAdminViews(codeOpt) {
  renderOverviewKPIs();
  renderOverviewTodayBookings();
  renderTimelineGantt();
  renderAdminPitches();
  renderAdminCustomers();
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

function filterOverviewBookings(filterType) {
  currentOverviewFilter = filterType || 'all';
  ['all', 'playing', 'confirmed', 'debt', 'completed', 'noshow'].forEach(f => {
    const btn = document.getElementById('ov-filter-' + f);
    if (btn) {
      if (f === currentOverviewFilter) {
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold bg-[#16A34A] text-white shadow-sm cursor-pointer';
      } else if (f === 'debt') {
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 cursor-pointer';
      } else {
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer';
      }
    }
  });
  renderOverviewTodayBookings();
}
window.filterOverviewBookings = filterOverviewBookings;

function renderOverviewTodayBookings() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;
  const allBookings = db.getAllBookings();
  const container = document.getElementById("overview-today-bookings");
  if (!container) return;

  const todayStr = window.SanBongApp.SanBongData ? window.SanBongApp.SanBongData.getTodayDateString() : new Date().toISOString().split("T")[0];
  let bookings = allBookings.filter(b => b.date === todayStr);
  if (bookings.length < 5) {
    bookings = allBookings.slice(0, 10);
  }

  if (currentOverviewFilter === 'playing') {
    bookings = allBookings.filter(b => b.status === 'Đang đá');
  } else if (currentOverviewFilter === 'confirmed') {
    bookings = allBookings.filter(b => b.status === 'Đã xác nhận' || b.status === 'Chờ duyệt cọc');
  } else if (currentOverviewFilter === 'debt') {
    bookings = allBookings.filter(b => {
      const normStatus = (b.status === 'Vắng mặt (No-Show)' || String(b.status || '').includes('No-Show')) ? 'Khách chưa đến' : (b.status || 'Đã xác nhận');
      if (normStatus === 'Đã hủy' || normStatus === 'Khách chưa đến' || normStatus === 'Hoạt thành') return false;
      const total = Number(b.totalPrice || 0);
      const deposit = Number(b.depositAmount || Math.round(total * 0.3));
      const rem = typeof b.remainingAmount === 'number' ? b.remainingAmount : Math.max(0, total - deposit);
      return rem > 0;
    });
  } else if (currentOverviewFilter === 'completed') {
    bookings = allBookings.filter(b => b.status === 'Hoàn thành');
  } else if (currentOverviewFilter === 'noshow') {
    bookings = allBookings.filter(b => b.status === 'Khách chưa đến' || b.status === 'Vắng mặt (No-Show)' || String(b.status || '').includes('No-Show') || b.status === 'Đã hủy');
  }

  if (bookings.length === 0) {
    container.innerHTML = '<div class="p-6 text-center text-xs text-[#64748B] bg-slate-50 rounded-xl border border-dashed border-slate-200">Không có ca đặt sân nào trong bộ lọc này.</div>';
    return;
  }

  const now = new Date();
  const curMinutes = now.getHours() * 60 + now.getMinutes();

  container.innerHTML = bookings.map(b => {
    const normStatus = (b.status === 'Vắng mặt (No-Show)' || String(b.status || '').includes('No-Show')) ? 'Khách chưa đến' : (b.status || 'Đã xác nhận');
    let isLateOver15 = false;
    let lateMinutes = 0;

    if (b.slotTime) {
      const parts = b.slotTime.split("-")[0].trim().split(":");
      if (parts.length === 2) {
        const startMin = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        if (curMinutes > startMin + 15 && normStatus !== "Đang đá" && normStatus !== "Hoàn thành" && normStatus !== "Khách chưa đến" && normStatus !== "Đã hủy") {
          isLateOver15 = true;
          lateMinutes = curMinutes - startMin;
        }
      }
    }

    const total = Number(b.totalPrice || 0);
    const deposit = Number(b.depositAmount || Math.round(total * 0.3));
    const remaining = (normStatus === 'Hoàn thành' || normStatus === 'Đã hủy' || normStatus === 'Khách chưa đến') ? 0 : (typeof b.remainingAmount === 'number' ? b.remainingAmount : Math.max(0, total - deposit));

    const monthlyBadge = (b.weeksCount && b.weeksCount > 1)
      ? `<span class="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-bold text-[10px]">📅 Gói tháng (${b.weeksCount} tuần)</span>`
      : '';
    const overtimeBadge = (b.overtimeMinutes && b.overtimeMinutes > 0)
      ? `<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">⏱️ +${b.overtimeMinutes}p thêm giờ</span>`
      : '';

    const safeCodeAttr = escapeJsAttr(b.code);
    const safeCodeHtml = escapeSearchHTML(b.code);
    const safePitchHtml = escapeSearchHTML(b.pitchName || '');
    const safeSlotHtml = escapeSearchHTML(b.slotTime || '');

    let actionButtons = "";
    if (normStatus === "Đang đá") {
      actionButtons =
        '<div class="flex items-center gap-1.5">' +
          '<button type="button" onclick="event.stopPropagation(); openInPlayModal(\'' + safeCodeAttr + '\')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-800 text-white hover:bg-slate-900 transition-colors shadow-2xs flex items-center gap-1 cursor-pointer" title="Đá thêm giờ, Đổi sân, Gọi thêm nước, Hủy trước hạn">⚙️ Quản lý đang chơi</button>' +
          '<button type="button" onclick="event.stopPropagation(); openInPlayModal(\'' + safeCodeAttr + '\', \'pay\')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#16A34A] text-white hover:bg-[#15803D] transition-colors shadow-2xs flex items-center gap-1 cursor-pointer" title="Thu phần tiền còn lại & Hoàn thành ca">💰 Thu còn lại (' + window.SanBongApp.formatVND(remaining) + ')</button>' +
          '<button type="button" onclick="event.stopPropagation(); openInvoicePrintModal(\'' + safeCodeAttr + '\')" class="px-2 py-1 text-[11px] font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer" title="Xem & In hóa đơn">🖨️ Hóa đơn</button>' +
        '</div>';
    } else if (normStatus === "Hoàn thành") {
      actionButtons =
        '<div class="flex items-center gap-1.5">' +
          '<span class="px-2 py-0.5 text-[11px] font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">✓ Đã thu đủ 100%</span>' +
          '<button type="button" onclick="event.stopPropagation(); openInPlayModal(\'' + safeCodeAttr + '\')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-[#0F172A] hover:bg-slate-200 border border-slate-300 cursor-pointer">⚙️ Xem & Điều hành</button>' +
          '<button type="button" onclick="event.stopPropagation(); openInvoicePrintModal(\'' + safeCodeAttr + '\')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#0F172A] text-white hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer">🖨️ In hóa đơn</button>' +
        '</div>';
    } else if (normStatus === "Khách chưa đến" || normStatus === "Đã hủy") {
      actionButtons =
        '<div class="flex items-center gap-1.5">' +
          '<span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">✓ Đã nhả sân</span>' +
          '<button type="button" onclick="event.stopPropagation(); restoreCancelledBooking(\'' + safeCodeAttr + '\')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500 text-white hover:bg-amber-600 shadow-2xs cursor-pointer" title="Khách đã tới sân - Khôi phục lại ca đá này">🔄 Khôi phục ca</button>' +
          '<button type="button" onclick="event.stopPropagation(); openInPlayModal(\'' + safeCodeAttr + '\')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-[#0F172A] hover:bg-slate-200 border border-slate-300 cursor-pointer" title="Mở bảng điều hành chi tiết ca đá">⚙️ Xem & Điều hành</button>' +
          '<button type="button" onclick="event.stopPropagation(); openInvoicePrintModal(\'' + safeCodeAttr + '\')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-[#475569] hover:bg-slate-200 border border-slate-200 cursor-pointer" title="Xem & In hóa đơn">🖨️ Hóa đơn</button>' +
        '</div>';
    } else {
      const lateBadge = isLateOver15 ? ('<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 animate-pulse border border-red-300 whitespace-nowrap">⚠️ Quá ' + lateMinutes + 'p chưa đến</span>') : '';
      const btnClass = isLateOver15 ? "bg-red-600 hover:bg-red-700 animate-bounce" : "bg-amber-600 hover:bg-amber-700";
      actionButtons = '<div class="flex items-center gap-1.5">' +
        lateBadge +
        '<button type="button" onclick="event.stopPropagation(); handleCheckin(\'' + safeCodeAttr + '\')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#16A34A] text-white hover:bg-[#15803D] transition-colors shadow-2xs flex items-center gap-1 cursor-pointer" title="Khách đã đến sân - Xác nhận vào đá"><span>✓</span> Check-in</button>' +
        '<button type="button" onclick="event.stopPropagation(); openInPlayModal(\'' + safeCodeAttr + '\')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 text-[#0F172A] hover:bg-slate-200 border border-slate-300 transition-colors flex items-center gap-1 cursor-pointer" title="Đổi sân, Gọi thêm nước, Hủy lịch trước hạn">⚙️ Quản lý / Đổi sân / Hủy</button>' +
        '<button type="button" onclick="event.stopPropagation(); handleNoShowRelease(\'' + safeCodeAttr + '\')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg ' + btnClass + ' text-white transition-colors shadow-2xs flex items-center gap-1 cursor-pointer" title="Quá 15 phút khách chưa đến: Tịch thu cọc 30% & Giải phóng nhả sân trống đón khách mới"><span>⚠️</span> Chưa đến: Nhả sân</button>' +
        '<button type="button" onclick="event.stopPropagation(); openInvoicePrintModal(\'' + safeCodeAttr + '\')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 cursor-pointer" title="Xem & In hóa đơn">🖨️ Hóa đơn</button>' +
      '</div>';
    }

    const cleanNote = b.note ? String(b.note).replace(/Hủy No-Show do quá 15p/g, 'Quá 15p khách chưa đến').replace(/No-Show/g, 'Khách chưa đến') : '';

    let cardColorCls = 'border-amber-300 bg-amber-50/25 hover:border-amber-400 hover:bg-amber-50/40';
    if (normStatus === 'Đang đá') {
      cardColorCls = 'border-blue-300 bg-blue-50/25 hover:border-blue-400 hover:bg-blue-50/40';
    } else if (normStatus === 'Đã xác nhận') {
      cardColorCls = 'border-emerald-300 bg-emerald-50/25 hover:border-emerald-400 hover:bg-emerald-50/40';
    } else if (normStatus === 'Khách chưa đến' || normStatus === 'Đã hủy') {
      cardColorCls = 'border-red-300 bg-red-50/25 hover:border-red-400 hover:bg-red-50/40';
    } else if (normStatus === 'Hoàn thành') {
      cardColorCls = 'border-slate-200 bg-slate-50/40 hover:border-slate-300 hover:bg-slate-50/70';
    }

    return '<div onclick="openInPlayModal(\'' + safeCodeAttr + '\')" class="py-2.5 px-3.5 rounded-lg border ' + cardColorCls + ' shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 transition-all cursor-pointer">' +
      '<div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 flex-1 min-w-0">' +
        '<div class="flex items-center gap-2 shrink-0">' +
          '<button type="button" onclick="event.stopPropagation(); openInPlayModal(\'' + safeCodeAttr + '\')" class="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-50 text-slate-800 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer" title="Bấm để mở popup chi tiết ca đá">' + safeCodeHtml + '</button>' +
          '<span class="font-bold text-[#0F172A] text-xs whitespace-nowrap min-w-[110px]">' + safePitchHtml + '</span>' +
          '<span class="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded whitespace-nowrap">⏰ ' + safeSlotHtml + '</span>' +
          monthlyBadge +
          overtimeBadge +
        '</div>' +
        '<div class="flex items-center gap-1.5 text-xs text-[#475569] shrink-0 min-w-[170px] max-w-[220px]">' +
          '<span class="font-semibold text-slate-800 truncate">👤 ' + escapeSearchHTML(b.customerName || "") + '</span>' +
          '<span class="text-slate-400 font-mono text-[11px] whitespace-nowrap">(' + escapeSearchHTML(b.phone || "") + ')</span>' +
        '</div>' +
        '<div class="flex items-center gap-2 text-[11px] text-[#64748B] shrink-0">' +
          '<span>Tổng: <b class="text-[#0F172A] font-semibold">' + window.SanBongApp.formatVND(total) + '</b></span>' +
          '<span class="text-slate-300">·</span>' +
          '<span>Cọc: <b class="text-[#16A34A] font-semibold">' + window.SanBongApp.formatVND(deposit) + '</b></span>' +
          '<span class="text-slate-300">·</span>' +
          '<span>Còn: <b class="' + (remaining > 0 ? 'text-[#DC2626]' : 'text-[#16A34A]') + ' font-bold">' + window.SanBongApp.formatVND(remaining) + '</b></span>' +
          (cleanNote ? '<span class="text-slate-400 italic truncate max-w-[140px]" title="' + escapeSearchHTML(cleanNote) + '">· ' + escapeSearchHTML(cleanNote) + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="flex flex-wrap items-center gap-2 shrink-0 justify-end">' +
        window.SanBongApp.statusPill(normStatus) +
        actionButtons +
      '</div>' +
    '</div>';
  }).join("");
}
window.renderOverviewTodayBookings = renderOverviewTodayBookings;
