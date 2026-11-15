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
  ['all', 'upcoming', 'playing', 'confirmed', 'debt', 'completed', 'noshow', 'overdue'].forEach(f => {
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

// Xử lý Check-in ca đặt sân trực tiếp từ bảng tổng quan
async function handleCheckIn(code) {
  if (!code) return;
  const db = window.SanBongApp?.SanBongDB;
  if (db?.getBookingByCode) {
    const b = db.getBookingByCode(code);
    if (b) {
      const todayStr = window.SanBongApp.SanBongData ? window.SanBongApp.SanBongData.getTodayDateString() : new Date().toISOString().split("T")[0];
      const bDate = b.booking_date || b.date;
      if (bDate && bDate < todayStr) {
        window.SanBongApp?.showToast('Ca đặt sân đã quá hạn từ ngày trước, không thể Check-in!', 'error');
        return;
      }
    }
  }
  const r = await adminFetchJson('../api/bookings.php?action=checkin&code=' + encodeURIComponent(code), {
    method: 'POST',
    body: JSON.stringify({ code: code })
  });
  if (!r.ok) {
    window.SanBongApp?.showToast(r.message || 'Không thể check-in lúc này!', 'error');
    return;
  }
  if (db?.checkinBooking) db.checkinBooking(code);
  if (typeof refreshAllAdminViews === 'function') refreshAllAdminViews(code);
  window.SanBongApp?.showToast(r.message || ('✅ Check-in thành công ca #' + code + '!'), 'success');
}
const handleCheckin = handleCheckIn;
window.handleCheckIn = window.handleCheckin = handleCheckIn;

// Xử lý Khách chưa đến quá 15 phút: Tịch thu cọc và nhả sân trống
async function handleNoShowRelease(code) {
  if (!code) return;
  const db = window.SanBongApp?.SanBongDB;
  if (db?.getBookingByCode) {
    const b = db.getBookingByCode(code);
    if (b) {
      const todayStr = window.SanBongApp.SanBongData ? window.SanBongApp.SanBongData.getTodayDateString() : new Date().toISOString().split("T")[0];
      const bDate = b.booking_date || b.date;
      if (bDate && bDate < todayStr) {
        window.SanBongApp?.showToast('Ca đặt sân đã quá hạn từ ngày trước, không thể nhả sân lúc này!', 'error');
        return;
      }
    }
  }
  const confirmed = typeof showAdminConfirm === 'function'
    ? await showAdminConfirm({
        title: 'Xác nhận Chưa Đến & Nhả Sân',
        message: `Khách của ca #${code} quá 15 phút chưa đến. Bạn có chắc chắn muốn TỊCH THU CỌC 30% và LẬP TỨC NHẢ SÂN TRỐNG?`,
        confirmText: 'Nhả sân & Tịch thu cọc',
        cancelText: 'Hủy bỏ',
        danger: true
      })
    : confirm(`Khách quá 15 phút chưa đến. Bạn có chắc muốn TỊCH THU CỌC 30% và NHẢ SÂN đơn #${code}?`);
  if (!confirmed) return;

  const r = await adminFetchJson('../api/bookings.php?action=noshow_release&code=' + encodeURIComponent(code), {
    method: 'POST',
    body: JSON.stringify({ code: code })
  });
  if (!r.ok) {
    window.SanBongApp?.showToast(r.message || 'Không thể nhả sân lúc này!', 'error');
    return;
  }
  if (db?.releaseNoShowBooking) db.releaseNoShowBooking(code);
  if (typeof refreshAllAdminViews === 'function') refreshAllAdminViews(code);
  window.SanBongApp?.showToast(r.message || ('⚠️ Đã nhả sân trống đơn #' + code + '!'), 'warning');
}
const handleShowRelease = handleNoShowRelease;
window.handleShowRelease = window.handleNoShowRelease = handleNoShowRelease;

function renderOverviewTodayBookings() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;
  const allBookings = db.getAllBookings();
  const container = document.getElementById("overview-today-bookings");
  if (!container) return;

  const todayStr = window.SanBongApp.SanBongData ? window.SanBongApp.SanBongData.getTodayDateString() : new Date().toISOString().split("T")[0];
  const now = new Date();
  const nowHHMM = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  const curMinutes = now.getHours() * 60 + now.getMinutes();

  // Helper trích xuất thông tin giờ bắt đầu và kết thúc của ca đá
  function getBookingTimeInfo(b) {
    let startTimeStr = '';
    let endTimeStr = '';

    if (b.start_time || b.startTime) {
      startTimeStr = String(b.start_time || b.startTime).trim().substring(0, 5);
    }
    if (b.end_time || b.endTime) {
      endTimeStr = String(b.end_time || b.endTime).trim().substring(0, 5);
    }

    const rawSlot = String(b.slotTime || b.slot_time || '').trim();
    if (rawSlot && rawSlot.includes('-')) {
      const parts = rawSlot.split('-');
      if (!startTimeStr && parts[0]) {
        const match = parts[0].trim().match(/\b(\d{1,2}:\d{2})\b/);
        if (match) startTimeStr = match[1];
      }
      if (!endTimeStr && parts[1]) {
        const match = parts[1].trim().match(/\b(\d{1,2}:\d{2})\b/);
        if (match) endTimeStr = match[1];
      }
    } else if (rawSlot && !startTimeStr) {
      const match = rawSlot.match(/\b(\d{1,2}:\d{2})\b/);
      if (match) startTimeStr = match[1];
    }

    let startMin = -1;
    let endMin = -1;
    if (startTimeStr) {
      const sp = startTimeStr.split(':');
      if (sp.length >= 2) startMin = parseInt(sp[0], 10) * 60 + parseInt(sp[1], 10);
    }
    if (endTimeStr) {
      const ep = endTimeStr.split(':');
      if (ep.length >= 2) endMin = parseInt(ep[0], 10) * 60 + parseInt(ep[1], 10);
    }
    if (endMin === -1 && startMin !== -1) {
      endMin = startMin + 90;
      const eh = Math.floor(endMin / 60);
      const em = endMin % 60;
      endTimeStr = String(eh).padStart(2, '0') + ':' + String(em).padStart(2, '0');
    }

    return { startTimeStr, endTimeStr, startMin, endMin };
  }

  // 1. Danh sách "Hôm nay": CHỈ CHỨA booking có booking_date === todayStr
  const isDateToday = b => (b.booking_date || b.date) === todayStr;
  const isDatePast = b => {
    const d = b.booking_date || b.date || '';
    return d && d < todayStr;
  };

  // Ca từ ngày trước chưa hoàn tất xử lý (quá hạn tồn đọng)
  const isPastUnprocessed = b => {
    if (!isDatePast(b)) return false;
    const norm = (b.status === 'Vắng mặt (No-Show)' || String(b.status || '').includes('No-Show')) ? 'Khách chưa đến' : (b.status || 'Đã xác nhận');
    return norm !== 'Hoàn thành' && norm !== 'Khách chưa đến' && norm !== 'Đã hủy';
  };

  // 2. Bộ lọc "Sắp tới" (upcoming): Chỉ lọc các ca có booking_date > todayStr HOẶC (booking_date === todayStr và b.start_time > nowHHMM)
  if (currentOverviewFilter === 'upcoming') {
    let upcomingBookings = allBookings.filter(b => {
      if (b.status === 'Đã hủy') return false;
      const bDate = b.booking_date || b.date || '';
      const timeInfo = getBookingTimeInfo(b);
      return bDate > todayStr || (bDate === todayStr && timeInfo.startTimeStr > nowHHMM);
    });

    upcomingBookings.sort((a, b) => {
      const da = (a.booking_date || a.date || '') + ' ' + (getBookingTimeInfo(a).startTimeStr || '00:00');
      const db = (b.booking_date || b.date || '') + ' ' + (getBookingTimeInfo(b).startTimeStr || '00:00');
      return da.localeCompare(db);
    });

    if (upcomingBookings.length === 0) {
      container.innerHTML = '<div class="p-6 text-center text-xs text-[#64748B] bg-slate-50 rounded-xl border border-dashed border-slate-200">Không có ca đặt sân sắp tới nào.</div>';
      return;
    }
    container.innerHTML = upcomingBookings.map(b => renderOverviewBookingItem(b, false)).join('');
    return;
  }

  // Danh sách các ca hôm nay
  const todayBookings = allBookings.filter(isDateToday);
  // Danh sách các ca quá hạn từ ngày trước chưa xử lý
  const pastOverdueBookings = allBookings.filter(isPastUnprocessed);

  // Bộ lọc chuyên biệt ca quá hạn tồn đọng
  if (currentOverviewFilter === 'overdue') {
    if (pastOverdueBookings.length === 0) {
      container.innerHTML = '<div class="p-6 text-center text-xs text-emerald-700 bg-emerald-50 rounded-xl border border-dashed border-emerald-200">✓ Không có ca quá hạn tồn đọng nào cần xử lý.</div>';
      return;
    }
    container.innerHTML = pastOverdueBookings.map(b => renderOverviewBookingItem(b, true)).join('');
    return;
  }

  // Áp dụng bộ lọc cho danh sách hôm nay và danh sách tồn đọng
  let filteredToday = todayBookings;
  let filteredPastOverdue = pastOverdueBookings;

  if (currentOverviewFilter === 'playing') {
    filteredToday = todayBookings.filter(b => b.status === 'Đang đá');
    filteredPastOverdue = pastOverdueBookings.filter(b => b.status === 'Đang đá');
  } else if (currentOverviewFilter === 'confirmed') {
    filteredToday = todayBookings.filter(b => b.status === 'Đã xác nhận' || b.status === 'Chờ duyệt cọc');
    filteredPastOverdue = pastOverdueBookings.filter(b => b.status === 'Đã xác nhận' || b.status === 'Chờ duyệt cọc');
  } else if (currentOverviewFilter === 'debt') {
    const isDebt = b => {
      const normStatus = (b.status === 'Vắng mặt (No-Show)' || String(b.status || '').includes('No-Show')) ? 'Khách chưa đến' : (b.status || 'Đã xác nhận');
      if (normStatus === 'Đã hủy' || normStatus === 'Khách chưa đến' || normStatus === 'Hoàn thành') return false;
      const total = Number(b.totalPrice || 0);
      const deposit = Number(b.depositAmount || Math.round(total * 0.3));
      const rem = typeof b.remainingAmount === 'number' ? b.remainingAmount : Math.max(0, total - deposit);
      return rem > 0;
    };
    filteredToday = todayBookings.filter(isDebt);
    filteredPastOverdue = pastOverdueBookings.filter(isDebt);
  } else if (currentOverviewFilter === 'completed') {
    filteredToday = todayBookings.filter(b => b.status === 'Hoàn thành');
    filteredPastOverdue = [];
  } else if (currentOverviewFilter === 'noshow') {
    filteredToday = todayBookings.filter(b => b.status === 'Khách chưa đến' || b.status === 'Vắng mặt (No-Show)' || String(b.status || '').includes('No-Show') || b.status === 'Đã hủy');
    filteredPastOverdue = [];
  }

  // Phân tích và tách chuỗi log/ghi chú thành danh sách các sự kiện timeline (Thời gian, Người thực hiện, Hành động)
  function parseBookingTimelineEvents(rawNote, booking) {
    const str = String(rawNote || '').trim();
    if (!str) return [];

    let segments = [];
    const bracketMatches = str.match(/\[[^\]]+\]/g);
    if (bracketMatches && bracketMatches.length > 0) {
      const firstBracketIdx = str.indexOf('[');
      if (firstBracketIdx > 0) {
        const lead = str.substring(0, firstBracketIdx).replace(/\|/g, '').trim();
        if (lead) segments.push(lead);
      }
      bracketMatches.forEach(m => {
        const inside = m.replace(/^\[|\]$/g, '').trim();
        if (inside) segments.push(inside);
      });
    } else {
      segments = str.split('|').map(s => s.trim()).filter(Boolean);
    }

    if (segments.length === 0) return [];

    const timeRegex = /\b(\d{4}-\d{2}-\d{2}\s+)?\d{1,2}:\d{2}(:\d{2})?\b/;
    const actorRegex = /\b(Admin|Quản Trị Viên|Quản lý|Thu ngân|Hệ thống|Khách hàng|Khách đặt|Staff|Nhân viên)\b/i;

    return segments.map((seg, idx) => {
      let text = seg;
      let time = '';
      let actor = '';

      const tm = text.match(timeRegex);
      if (tm) {
        time = tm[0];
        text = text.replace(timeRegex, '').replace(/^[\s\-–—:]+/, '').trim();
      }

      const am = text.match(actorRegex);
      if (am) {
        actor = am[0];
        text = text.replace(actorRegex, '').replace(/^[\s\-–—:]+/, '').trim();
      }

      if (!actor) {
        if (/tự động|hết hạn|nhả đơn|hệ thống/i.test(seg)) {
          actor = 'Hệ thống';
        } else if (/khách|dặn|yêu cầu/i.test(seg) && !/đổi sân|nhả sân|tất toán/i.test(seg)) {
          actor = 'Khách đặt';
        } else {
          actor = 'Admin';
        }
      }

      if (!time) {
        if (booking?.updated_at && idx === segments.length - 1) {
          const uParts = String(booking.updated_at).split(' ');
          time = uParts.length > 1 ? uParts[1].slice(0, 5) : uParts[0];
        } else if (booking?.created_at && idx === 0) {
          const cParts = String(booking.created_at).split(' ');
          time = cParts.length > 1 ? cParts[1].slice(0, 5) : cParts[0];
        } else {
          time = 'Ghi nhận';
        }
      }

      let action = text.replace(/^[:\-\s]+/, '').trim();
      if (!action) action = seg;

      return { time, actor, action };
    });
  }

  function renderTimelineEventRow(evt) {
    return '<div class="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-700 bg-white/70 px-2 py-0.5 rounded border border-slate-200/60">' +
      '<span class="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 shrink-0 font-medium">🕒 ' + escapeSearchHTML(evt.time) + '</span>' +
      '<span class="text-[10px] font-bold text-slate-800 bg-slate-200/80 px-1.5 py-0.2 rounded shrink-0">👤 ' + escapeSearchHTML(evt.actor) + '</span>' +
      '<span class="text-slate-700 font-medium break-words">' + escapeSearchHTML(evt.action) + '</span>' +
    '</div>';
  }

  // Render HTML chi tiết cho từng thẻ ca đá
  function renderOverviewBookingItem(b, isOverdueFromPast) {
    const normStatus = (b.status === 'Vắng mặt (No-Show)' || String(b.status || '').includes('No-Show')) ? 'Khách chưa đến' : (b.status || 'Đã xác nhận');
    const bDate = b.booking_date || b.date || '';
    const timeInfo = getBookingTimeInfo(b);

    // Kiểm tra ca đã qua giờ (ca quá hạn)
    let isPastSlot = false;
    if (bDate && bDate < todayStr) {
      isPastSlot = true;
    } else if (bDate === todayStr && timeInfo.endMin !== -1) {
      if (curMinutes >= timeInfo.endMin) {
        isPastSlot = true;
      }
    }

    const isResolved = normStatus === 'Hoàn thành' || normStatus === 'Khách chưa đến' || normStatus === 'Đã hủy';
    const isOverdueUnprocessed = isPastSlot && !isResolved;

    let isLateOver15 = false;
    let lateMinutes = 0;
    if (!isPastSlot && bDate === todayStr && timeInfo.startMin !== -1) {
      if (curMinutes > timeInfo.startMin + 15 && !isResolved && normStatus !== 'Đang đá') {
        isLateOver15 = true;
        lateMinutes = curMinutes - timeInfo.startMin;
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

    const dateBadge = (bDate && bDate !== todayStr)
      ? `<span class="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-bold text-[10px]">📅 ${escapeSearchHTML(window.SanBongApp?.formatDateVN ? window.SanBongApp.formatDateVN(bDate) : bDate)}</span>`
      : '';

    // Đánh dấu nhãn [Cần xử lý] rõ ràng cho ca quá hạn chưa hoàn tất
    const needActionBadge = isOverdueUnprocessed
      ? `<span class="px-2 py-0.5 rounded bg-rose-600 text-white font-extrabold text-[10px] tracking-wide flex items-center gap-1 shadow-2xs" title="Ca quá hạn chưa được xử lý hoàn tất">⚠️ [Cần xử lý]</span>`
      : '';

    const safeCodeAttr = escapeJsAttr(b.code);
    const safeCodeHtml = escapeSearchHTML(b.code);
    const safePitchHtml = escapeSearchHTML(b.pitchName || '');
    const safeSlotHtml = escapeSearchHTML(b.slotTime || (timeInfo.startTimeStr + (timeInfo.endTimeStr ? ' - ' + timeInfo.endTimeStr : '')));

    let actionButtons = "";
    if (normStatus === "Đang đá") {
      const overtimeAlert = isPastSlot
        ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">⏱️ Đã qua giờ đá</span>'
        : '';
      actionButtons =
        '<div class="flex items-center gap-1.5">' +
          overtimeAlert +
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
      if (isPastSlot) {
        // Đối với các ca đã qua giờ (ca quá hạn): Khóa nút Check-in / Nhả sân (thêm disabled, opacity-50, cursor-not-allowed, tooltip "Ca đã kết thúc")
        actionButtons =
          '<div class="flex items-center gap-1.5">' +
            '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 border border-slate-300 whitespace-nowrap" title="Ca đã kết thúc thời gian thi đấu">⏱️ Ca đã kết thúc</span>' +
            '<button type="button" disabled class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#16A34A] text-white opacity-50 cursor-not-allowed transition-colors shadow-2xs flex items-center gap-1" title="Ca đã kết thúc"><span>✓</span> Check-in</button>' +
            '<button type="button" onclick="event.stopPropagation(); openInPlayModal(\'' + safeCodeAttr + '\')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 text-[#0F172A] hover:bg-slate-200 border border-slate-300 transition-colors flex items-center gap-1 cursor-pointer" title="Mở bảng điều hành chi tiết ca đá để xử lý hoặc hủy">⚙️ Quản lý / Hủy</button>' +
            '<button type="button" disabled class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-400 text-white opacity-50 cursor-not-allowed transition-colors shadow-2xs flex items-center gap-1" title="Ca đã kết thúc"><span>⚠️</span> Chưa đến: Nhả sân</button>' +
            '<button type="button" onclick="event.stopPropagation(); openInvoicePrintModal(\'' + safeCodeAttr + '\')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 cursor-pointer" title="Xem & In hóa đơn">🖨️ Hóa đơn</button>' +
          '</div>';
      } else {
        const lateBadge = isLateOver15 ? ('<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 animate-pulse border border-red-300 whitespace-nowrap">⚠️ Quá ' + lateMinutes + 'p chưa đến</span>') : '';
        const btnClass = isLateOver15 ? "bg-red-600 hover:bg-red-700 animate-bounce" : "bg-amber-600 hover:bg-amber-700";
        actionButtons =
          '<div class="flex items-center gap-1.5">' +
            lateBadge +
            '<button type="button" onclick="event.stopPropagation(); window.handleCheckIn(\'' + safeCodeAttr + '\')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#16A34A] text-white hover:bg-[#15803D] transition-colors shadow-2xs flex items-center gap-1 cursor-pointer" title="Khách đã đến sân - Xác nhận vào đá"><span>✓</span> Check-in</button>' +
            '<button type="button" onclick="event.stopPropagation(); openInPlayModal(\'' + safeCodeAttr + '\')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 text-[#0F172A] hover:bg-slate-200 border border-slate-300 transition-colors flex items-center gap-1 cursor-pointer" title="Đổi sân, Gọi thêm nước, Hủy lịch trước hạn">⚙️ Quản lý / Đổi sân / Hủy</button>' +
            '<button type="button" onclick="event.stopPropagation(); window.handleNoShowRelease(\'' + safeCodeAttr + '\')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg ' + btnClass + ' text-white transition-colors shadow-2xs flex items-center gap-1 cursor-pointer" title="Quá 15 phút khách chưa đến: Tịch thu cọc 30% & Giải phóng nhả sân trống đón khách mới"><span>⚠️</span> Chưa đến: Nhả sân</button>' +
            '<button type="button" onclick="event.stopPropagation(); openInvoicePrintModal(\'' + safeCodeAttr + '\')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 cursor-pointer" title="Xem & In hóa đơn">🖨️ Hóa đơn</button>' +
          '</div>';
      }
    }

    const cleanNote = b.note ? String(b.note).replace(/Hủy No-Show do quá 15p/g, 'Quá 15p khách chưa đến').replace(/No-Show/g, 'Khách chưa đến') : '';

    let cardColorCls = 'border-amber-300 bg-amber-50/25 hover:border-amber-400 hover:bg-amber-50/40';
    if (isOverdueUnprocessed) {
      cardColorCls = 'border-rose-400 bg-rose-50/40 hover:border-rose-500 hover:bg-rose-50/60';
    } else if (normStatus === 'Đang đá') {
      cardColorCls = 'border-blue-300 bg-blue-50/25 hover:border-blue-400 hover:bg-blue-50/40';
    } else if (normStatus === 'Đã xác nhận') {
      cardColorCls = 'border-emerald-300 bg-emerald-50/25 hover:border-emerald-400 hover:bg-emerald-50/40';
    } else if (normStatus === 'Khách chưa đến' || normStatus === 'Đã hủy') {
      cardColorCls = 'border-red-300 bg-red-50/25 hover:border-red-400 hover:bg-red-50/40';
    } else if (normStatus === 'Hoàn thành') {
      cardColorCls = 'border-slate-200 bg-slate-50/40 hover:border-slate-300 hover:bg-slate-50/70';
    }

    let timelineHtml = '';
    const timelineEvents = parseBookingTimelineEvents(cleanNote, b);
    if (timelineEvents.length > 0) {
      const reversedEvents = [...timelineEvents].reverse();
      const visibleEvents = reversedEvents.slice(0, 2);
      const remainingEvents = reversedEvents.slice(2);

      let moreSection = '';
      if (remainingEvents.length > 0) {
        moreSection =
          '<div id="timeline-more-' + safeCodeAttr + '" class="hidden space-y-1 mt-1 pl-2 border-l-2 border-slate-300">' +
            remainingEvents.map(renderTimelineEventRow).join('') +
          '</div>' +
          '<div>' +
            '<button type="button" onclick="event.stopPropagation(); window.toggleTimelineMore(\'' + safeCodeAttr + '\', this)" class="text-[10px] font-bold text-[#16A34A] hover:text-[#15803D] inline-flex items-center gap-1 cursor-pointer mt-0.5 hover:underline" data-more-count="' + remainingEvents.length + '">' +
              '<span>Xem thêm (' + remainingEvents.length + ' thao tác cũ)</span> <span>▾</span>' +
            '</button>' +
          '</div>';
      }

      timelineHtml =
        '<div class="w-full mt-2 pt-2 border-t border-slate-200/80 flex flex-col gap-1 text-[11px]" onclick="event.stopPropagation()">' +
          '<div class="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">' +
            '<span>📜 Lịch sử thao tác:</span>' +
          '</div>' +
          '<div class="space-y-1">' +
            visibleEvents.map(renderTimelineEventRow).join('') +
          '</div>' +
          moreSection +
        '</div>';
    }

    return '<div onclick="openInPlayModal(\'' + safeCodeAttr + '\')" class="py-2.5 px-3.5 rounded-lg border ' + cardColorCls + ' shadow-2xs flex flex-col gap-2 transition-all cursor-pointer">' +
      '<div class="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">' +
        '<div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 flex-1 min-w-0">' +
          '<div class="flex items-center gap-2 shrink-0">' +
            '<button type="button" onclick="event.stopPropagation(); openInPlayModal(\'' + safeCodeAttr + '\')" class="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-50 text-slate-800 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer" title="Bấm để mở popup chi tiết ca đá">' + safeCodeHtml + '</button>' +
            '<span class="font-bold text-[#0F172A] text-xs whitespace-nowrap min-w-[110px]">' + safePitchHtml + '</span>' +
            '<span class="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded whitespace-nowrap">⏰ ' + safeSlotHtml + '</span>' +
            dateBadge +
            monthlyBadge +
            overtimeBadge +
            needActionBadge +
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
          '</div>' +
        '</div>' +
        '<div class="flex flex-wrap items-center gap-2 shrink-0 justify-end">' +
          window.SanBongApp.statusPill(normStatus) +
          actionButtons +
        '</div>' +
      '</div>' +
      timelineHtml +
    '</div>';
  }

  let html = '';

  // 1. Gom các ca quá hạn chưa xử lý vào một khối riêng biệt, rõ ràng, không lẫn lộn vào danh sách hôm nay
  if (filteredPastOverdue.length > 0) {
    html +=
      '<div class="mb-4 rounded-xl border-2 border-rose-300 bg-rose-50/50 p-3.5 space-y-2.5 shadow-2xs">' +
        '<div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-rose-200">' +
          '<div class="flex items-center gap-2">' +
            '<span class="px-2 py-0.5 rounded bg-rose-600 text-white font-extrabold text-[10px] uppercase tracking-wider animate-pulse flex items-center gap-1">⚠️ CẦN XỬ LÝ</span>' +
            '<span class="font-bold text-xs text-rose-900">' + filteredPastOverdue.length + ' ca từ ngày trước chưa hoàn tất / tồn đọng</span>' +
          '</div>' +
          '<span class="text-[11px] text-rose-700 italic">Vui lòng mở điều hành để hoàn tất thu tiền hoặc hủy ca</span>' +
        '</div>' +
        '<div class="space-y-2">' +
          filteredPastOverdue.map(b => renderOverviewBookingItem(b, true)).join('') +
        '</div>' +
      '</div>';
  }

  // 2. Danh sách ca đá hôm nay
  if (filteredToday.length > 0) {
    if (filteredPastOverdue.length > 0) {
      html +=
        '<div class="flex items-center justify-between pt-1 pb-1 text-xs font-bold text-slate-700">' +
          '<span>📅 Danh sách ca hôm nay (' + filteredToday.length + ' ca)</span>' +
        '</div>';
    }
    html += '<div class="space-y-2">' + filteredToday.map(b => renderOverviewBookingItem(b, false)).join('') + '</div>';
  } else {
    if (filteredPastOverdue.length === 0) {
      html = '<div class="p-6 text-center text-xs text-[#64748B] bg-slate-50 rounded-xl border border-dashed border-slate-200">Không có ca đặt sân nào trong bộ lọc này.</div>';
    } else {
      html += '<div class="p-4 text-center text-xs text-[#64748B] bg-slate-50 rounded-xl border border-dashed border-slate-200">Không có ca đá nào hôm nay trong bộ lọc này.</div>';
    }
  }

  container.innerHTML = html;
}
window.renderOverviewTodayBookings = renderOverviewTodayBookings;

// Toggle hiển thị thêm/thu gọn các sự kiện lịch sử thao tác cũ
function toggleTimelineMore(code, btn) {
  const el = document.getElementById('timeline-more-' + code);
  if (!el) return;
  const isHidden = el.classList.contains('hidden');
  const count = btn.getAttribute('data-more-count') || '';
  if (isHidden) {
    el.classList.remove('hidden');
    btn.innerHTML = '<span>Thu gọn</span> <span>▴</span>';
  } else {
    el.classList.add('hidden');
    btn.innerHTML = '<span>Xem thêm (' + count + ' thao tác cũ)</span> <span>▾</span>';
  }
}
window.toggleTimelineMore = toggleTimelineMore;

