let selectedTimelineDate = (() => {
  try {
    const saved = sessionStorage.getItem('sb_timeline_date') || '';
    return /^\d{4}-\d{2}-\d{2}$/.test(saved) ? saved : '';
  } catch (e) {
    return '';
  }
})();
let timelineBookingsByDateCache = {};
window.selectedTimelineDate = selectedTimelineDate;
window.timelineBookingsByDateCache = timelineBookingsByDateCache;

function formatTimelineDateLabel(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr + 'T00:00:00');
  if (isNaN(d.getTime())) return isoStr;
  const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dayNames[d.getDay()]}, ${dd}/${mm}/${yyyy}`;
}

async function fetchTimelineDateBookings(dateStr) {
  const targetDate = dateStr || selectedTimelineDate || (window.SanBongApp?.getLocalTodayISO ? window.SanBongApp.getLocalTodayISO() : new Date().toISOString().split('T')[0]);
  const r = await adminFetchJson(`../api/bookings.php?action=by_date&date=${encodeURIComponent(targetDate)}`);
  if (r.ok && Array.isArray(r.data)) {
    timelineBookingsByDateCache[targetDate] = r.data;
    const db = window.SanBongApp?.SanBongDB;
    if (db && db.getAllBookings) {
      const localList = db.getAllBookings();
      const oldByCode = new Map();
      localList.forEach(x => {
        if (x && x.code) oldByCode.set(x.code, x);
      });
      const otherDates = localList.filter(x => (x.date || x.booking_date) !== targetDate);
      const normItems = r.data
        .filter(srvB => srvB && srvB.code)
        .map(srvB => {
          const normItem = {
            code: srvB.code, customerName: srvB.customerName || srvB.customer_name || 'Khách đặt sân',
            phone: srvB.phone || '', pitchId: srvB.pitchId || srvB.pitch_id || '',
            pitchName: srvB.pitchName || srvB.pitch_name || '', date: srvB.date || srvB.booking_date || targetDate,
            slotId: srvB.slotId || srvB.slot_id || '', slotTime: srvB.slotTime || srvB.slot_time || '',
            totalPrice: Number(srvB.totalPrice ?? srvB.total_price ?? 0),
            depositAmount: Number(srvB.depositAmount ?? srvB.deposit_amount ?? 0),
            remainingAmount: Number(srvB.remainingAmount ?? srvB.remaining_amount ?? 0),
            status: srvB.status || 'Đã xác nhận',
            paymentStatus: srvB.paymentStatus || srvB.payment_status || 'Đã cọc 30%',
            paymentMethod: srvB.paymentMethod || srvB.payment_method || '', note: srvB.note || ''
          };
          const prev = oldByCode.get(srvB.code);
          return prev ? Object.assign({}, prev, normItem) : normItem;
        });
      try {
        localStorage.setItem('sb_bookings_v1', JSON.stringify([...normItems, ...otherDates]));
      } catch (e) {}
    }
    return r.data;
  }
  return timelineBookingsByDateCache[targetDate] || [];
}

window.changeTimelineDate = function(deltaDays) {
  const getToday = window.SanBongApp?.getLocalTodayISO ? window.SanBongApp.getLocalTodayISO() : new Date().toISOString().split('T')[0];
  if (deltaDays === 0) {
    selectedTimelineDate = getToday;
  } else {
    const cur = new Date((selectedTimelineDate || getToday) + 'T00:00:00');
    cur.setDate(cur.getDate() + Number(deltaDays || 0));
    const yyyy = cur.getFullYear();
    const mm = String(cur.getMonth() + 1).padStart(2, '0');
    const dd = String(cur.getDate()).padStart(2, '0');
    selectedTimelineDate = `${yyyy}-${mm}-${dd}`;
  }
  window.selectedTimelineDate = selectedTimelineDate;
  try { sessionStorage.setItem('sb_timeline_date', selectedTimelineDate); } catch (e) {}
  const picker = document.getElementById('timeline-date-picker');
  if (picker) picker.value = selectedTimelineDate;
  const lbl = document.getElementById('timeline-date-label');
  if (lbl) lbl.textContent = formatTimelineDateLabel(selectedTimelineDate);
  fetchTimelineDateBookings(selectedTimelineDate).finally(() => {
    renderTimelineGantt();
  });
};

window.setTimelineDate = function(dateStr) {
  if (!dateStr) return;
  selectedTimelineDate = dateStr;
  window.selectedTimelineDate = selectedTimelineDate;
  try { sessionStorage.setItem('sb_timeline_date', selectedTimelineDate); } catch (e) {}
  const lbl = document.getElementById('timeline-date-label');
  if (lbl) lbl.textContent = formatTimelineDateLabel(selectedTimelineDate);
  fetchTimelineDateBookings(selectedTimelineDate).finally(() => {
    renderTimelineGantt();
  });
};

function renderTimelineGantt() {
  const db = window.SanBongApp.SanBongDB;
  const pitches = db.getPitches().filter(p => p.status !== 'Ẩn');
  const allBookings = db.getAllBookings();
  const container = document.getElementById('gantt-rows');
  if (!container) return;

  const getToday = window.SanBongApp?.getLocalTodayISO ? window.SanBongApp.getLocalTodayISO() : new Date().toISOString().split('T')[0];
  if (!selectedTimelineDate) {
    selectedTimelineDate = getToday;
    window.selectedTimelineDate = selectedTimelineDate;
  }
  const picker = document.getElementById('timeline-date-picker');
  if (picker && picker.value !== selectedTimelineDate) {
    picker.value = selectedTimelineDate;
  }
  const lbl = document.getElementById('timeline-date-label');
  if (lbl) {
    lbl.textContent = formatTimelineDateLabel(selectedTimelineDate);
  }

  const parseSlotPos = (slotTimeStr, fallbackIdx = 0) => {
    if (slotTimeStr && slotTimeStr.includes('-')) {
      const [sPart, ePart] = slotTimeStr.split('-').map(x => x.trim());
      const [sh, sm] = sPart.split(':').map(Number);
      const [eh, em] = ePart.split(':').map(Number);
      if (!isNaN(sh) && !isNaN(eh)) {
        const startMin = sh * 60 + (sm || 0);
        const endMin = eh * 60 + (em || 0);
        const minBase = 6 * 60;
        const maxSpan = 17.5 * 60;
        const left = Math.max(1, Math.min(84, Math.round(((startMin - minBase) / maxSpan) * 100)));
        const width = Math.max(12, Math.min(99 - left, Math.round(((endMin - startMin) / maxSpan) * 100)));
        return { left, width };
      }
    }
    const presets = [{ left: 42, width: 16 }, { left: 60, width: 17 }, { left: 79, width: 14 }];
    return presets[fallbackIdx % presets.length];
  };

  container.innerHTML = pitches.map((p) => {
    const isMaint = p.status === 'Bảo trì';
    const pitchBookings = allBookings.filter(b => {
      const bPitchId = b.pitchId || b.pitch_id;
      const bDate = b.date || b.booking_date;
      const bStatus = b.status || '';
      const bPayStatus = b.paymentStatus || b.payment_status || '';
      return bPitchId === p.id && bDate === selectedTimelineDate &&
        bStatus !== 'Đã hủy' && bStatus !== 'Khách chưa đến' &&
        bStatus !== 'Vắng mặt (No-Show)' && !String(bStatus).includes('No-Show') &&
        bPayStatus !== 'Tịch thu cọc 30%';
    });

    const barsHtml = pitchBookings.length > 0 ? pitchBookings.map((b, bIdx) => {
      const pos = parseSlotPos(b.slotTime || b.slot_time, bIdx);
      const normStatus = (b.status === 'Vắng mặt (No-Show)' || String(b.status || '').includes('No-Show')) ? 'Khách chưa đến' : (b.status || 'Đã xác nhận');
      let styleCls = 'bg-[#DCFCE7] border-[#16A34A] text-[#16A34A]';
      if (normStatus === 'Đang đá') {
        styleCls = 'bg-[#DBEAFE] border-[#2563EB] text-[#2563EB]';
      } else if (normStatus === 'Chờ duyệt cọc' || normStatus === 'Giữ chỗ') {
        styleCls = 'bg-[#FEF3C7] border-[#F59E0B] text-[#D97706]';
      } else if (normStatus === 'Khách chưa đến' || normStatus === 'Đã hủy') {
        styleCls = 'bg-[#FEE2E2] border-[#EF4444] text-[#DC2626]';
      } else if (normStatus === 'Hoàn thành') {
        styleCls = 'bg-slate-200 border-slate-400 text-slate-700';
      }
      const isSelected = b.code === window.activeInPlayCode ? 'ring-2 ring-[#0F172A] z-10' : '';
      const safeCodeAttr = escapeJsAttr(b.code);
      const safeCodeHtml = escapeSearchHTML(b.code);
      return `
        <div onclick="openInPlaySection('${safeCodeAttr}')" title="Bấm để điều hành ca đá #${safeCodeHtml} · ${escapeSearchHTML(b.customerName)} (${escapeSearchHTML(b.slotTime || '')} - ${escapeSearchHTML(normStatus)})" class="absolute top-1 bottom-1 rounded border px-2 py-0.5 text-[10px] truncate font-bold cursor-pointer hover:scale-[1.01] transition-transform flex items-center justify-between gap-1 shadow-xs ${styleCls} ${isSelected}" style="left:${pos.left}%; width:${pos.width}%;">
          <span class="truncate">${escapeSearchHTML(b.customerName)} (${escapeSearchHTML(normStatus)})</span>
          <span class="font-mono text-[9px] opacity-75 shrink-0">#${escapeSearchHTML(String(b.code || '').slice(-4))}</span>
        </div>
      `;
    }).join('') : `<div class="w-full h-full flex items-center justify-center text-[11px] font-medium text-slate-400">Trống lịch cả ngày</div>`;

    return `
      <div class="flex items-center h-16 relative">
        <div class="w-28 font-heading font-bold text-xs shrink-0 text-[#0F172A]">${escapeSearchHTML(p.name || '')}</div>
        <div class="flex-1 h-10 bg-[#F8FAFC] rounded-lg relative overflow-hidden border border-[#E2E8F0]">
          ${isMaint ? `
            <div class="w-full h-full hatch-slate flex items-center justify-center font-bold text-xs text-[#DC2626]">
              Đang bảo dưỡng mặt cỏ toàn bộ ngày
            </div>
          ` : barsHtml}
        </div>
      </div>
    `;
  }).join('');

  if (typeof renderInlineInPlaySelector === 'function') renderInlineInPlaySelector();
}

function parseTimeStrToMinutes(tStr, fallbackMin) {
  const parts = String(tStr || '').trim().split(':');
  if (parts.length >= 2) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!isNaN(h) && !isNaN(m)) return h * 60 + m;
  }
  return fallbackMin;
}

function getSlotMaintenanceReason(pitchId, dateVal, slotTime, maintenanceWindows) {
  if (!Array.isArray(maintenanceWindows) || maintenanceWindows.length === 0) return '';
  const timeParts = String(slotTime || '').split('-');
  if (timeParts.length !== 2) return '';
  const slotStart = parseTimeStrToMinutes(timeParts[0], -1);
  const slotEnd = parseTimeStrToMinutes(timeParts[1], -1);
  if (slotStart < 0 || slotEnd <= slotStart) return '';

  for (const mw of maintenanceWindows) {
    if (!mw) continue;
    const mwPitch = mw.pitch_id || mw.pitchId || '';
    if (mwPitch && mwPitch !== pitchId) continue;
    const mwStatus = String(mw.status || 'active').toLowerCase();
    if (!['active', 'scheduled', 'in_progress'].includes(mwStatus)) continue;
    const sDate = mw.start_date || mw.startDate || '';
    const eDate = mw.end_date || mw.endDate || sDate;
    if (!sDate || dateVal < sDate || dateVal > eDate) continue;

    const mwStart = parseTimeStrToMinutes(mw.start_time || mw.startTime || '00:00', 0);
    const mwEnd = parseTimeStrToMinutes(mw.end_time || mw.endTime || '23:59', 23 * 60 + 59);
    if (slotStart < mwEnd && slotEnd > mwStart) {
      return String(mw.reason || 'Bảo trì sân').trim();
    }
  }
  return '';
}

async function refreshWalkinBookedSlots() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;
  const pitchSelect = document.getElementById('admin-pitch-select');
  const dateInput = document.getElementById('admin-book-date');
  const slotSelect = document.getElementById('admin-slot-select');
  if (!pitchSelect || !slotSelect) return;

  const pitchId = pitchSelect.value;
  const getToday = window.SanBongApp?.getLocalTodayISO ? window.SanBongApp.getLocalTodayISO() : new Date().toISOString().split('T')[0];
  const dateVal = dateInput?.value || getToday;
  const prevSlotId = slotSelect.value;
  const isToday = dateVal === getToday;
  const nowHHMM = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  const isSlotPast = (s) => Boolean(s) && isToday && (s.start || (s.time ? s.time.split('-')[0].trim() : '')) <= nowHHMM;

  const bookedMap = {};
  const localBookings = db.getAllBookings().filter(b =>
    (b.pitchId === pitchId || b.pitch_id === pitchId) &&
    (b.date === dateVal || b.booking_date === dateVal) &&
    b.status !== 'Đã hủy' &&
    b.status !== 'Khách chưa đến' &&
    b.status !== 'Vắng mặt (No-Show)' &&
    !String(b.status || '').includes('No-Show') &&
    b.paymentStatus !== 'Tịch thu cọc 30%'
  );
  localBookings.forEach(b => {
    const sid = b.slotId || b.slot_id;
    if (sid) bookedMap[sid] = b.code || 'ĐÃ ĐẶT';
  });

  let maintenanceWindows = typeof db.getMaintenanceSchedules === 'function' ? db.getMaintenanceSchedules() : [];
  const r = await adminFetchJson(`../api/bookings.php?action=booked_slots&pitch_id=${encodeURIComponent(pitchId)}&date=${encodeURIComponent(dateVal)}`);
  if (r.ok) {
    if (Array.isArray(r.data)) {
      r.data.forEach(item => {
        const sid = item.slotId || item.slot_id;
        if (sid) bookedMap[sid] = item.code || 'ĐÃ ĐẶT';
      });
    }
    if (Array.isArray(r.json?.maintenanceWindows)) {
      maintenanceWindows = r.json.maintenanceWindows;
    }
  }

  const maintMap = {};
  const slots = db.getTimeSlots();
  slotSelect.innerHTML = slots.map(s => {
    if (isSlotPast(s)) {
      return `<option value="${escapeSearchHTML(s.id)}" disabled class="text-slate-400 opacity-50">${escapeSearchHTML(s.name || s.time)} (⏱️ Đã qua)</option>`;
    }
    const maintReason = getSlotMaintenanceReason(pitchId, dateVal, s.time, maintenanceWindows);
    if (maintReason) {
      maintMap[s.id] = maintReason;
      return `<option value="${escapeSearchHTML(s.id)}" disabled class="text-red-500">${escapeSearchHTML(s.time)} (🔧 Bảo trì - ${escapeSearchHTML(maintReason)})</option>`;
    }
    const bookedCode = bookedMap[s.id];
    if (bookedCode) {
      return `<option value="${escapeSearchHTML(s.id)}" disabled class="text-slate-400">${escapeSearchHTML(s.time)} (🔒 Đã đặt - #${escapeSearchHTML(bookedCode)})</option>`;
    }
    return `<option value="${escapeSearchHTML(s.id)}">${escapeSearchHTML(s.time)}</option>`;
  }).join('');

  const prevSlotObj = slots.find(s => s.id === prevSlotId);
  if (prevSlotId && !bookedMap[prevSlotId] && !maintMap[prevSlotId] && prevSlotObj && !isSlotPast(prevSlotObj)) {
    slotSelect.value = prevSlotId;
  } else {
    const firstFree = slots.find(s => !bookedMap[s.id] && !maintMap[s.id] && !isSlotPast(s));
    slotSelect.value = firstFree ? firstFree.id : '';
  }

  updateWalkinPricePreview();
}
window.refreshWalkinBookedSlots = refreshWalkinBookedSlots;

function updateWalkinPricePreview() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const getToday = window.SanBongApp?.getLocalTodayISO ? window.SanBongApp.getLocalTodayISO() : new Date().toISOString().split('T')[0];
  const pitchId = document.getElementById('admin-pitch-select')?.value || '';
  const dateVal = document.getElementById('admin-book-date')?.value || getToday;
  const slotId = document.getElementById('admin-slot-select')?.value || '';
  const weeksCount = Math.max(1, parseInt(document.getElementById('admin-book-package')?.value || '1', 10) || 1);
  const payMethod = document.getElementById('admin-pay-select')?.value || 'Tiền mặt tại quầy';

  const calc = db.calculatePrice(pitchId, dateVal, slotId, [], '', weeksCount);
  if (!calc) return;

  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  const elPitchPrice = document.getElementById('walkin-preview-pitch-price');
  const elPromoRow = document.getElementById('walkin-preview-promo-row');
  const elDiscount = document.getElementById('walkin-preview-discount');
  const elGifts = document.getElementById('walkin-preview-gifts');
  const elTotal = document.getElementById('walkin-preview-total');
  const elDeposit = document.getElementById('walkin-preview-deposit');
  const elRemaining = document.getElementById('walkin-preview-remaining');

  if (elPitchPrice) {
    elPitchPrice.textContent = weeksCount > 1
      ? `${fmt(calc.pitchPrice)} (${weeksCount} buổi · ${fmt(calc.singlePitchPrice)}/buổi)`
      : `${fmt(calc.pitchPrice)}`;
  }

  if (elPromoRow) {
    if (weeksCount > 1) {
      elPromoRow.classList.remove('hidden');
      const pct = Math.round((calc.monthlyDiscountRate || 0) * 100);
      if (elDiscount) {
        elDiscount.textContent = `-${fmt(calc.monthlyDiscountAmount)} (Giảm ${pct}%)`;
      }
      if (elGifts) {
        let giftText = '🎁 Tặng kèm gói tháng (0đ)';
        if (weeksCount >= 12) {
          giftText = '🎁 Tặng 2 thùng nước + 1 trọng tài mỗi trận (0đ)';
        } else if (weeksCount >= 8) {
          giftText = '🎁 Tặng 1 thùng nước + 1 bộ áo Bib mỗi trận (0đ)';
        } else if (weeksCount >= 4) {
          giftText = '🎁 Tặng 1 lốc nước + miễn phí bóng đá mỗi trận (0đ)';
        }
        elGifts.textContent = giftText;
      }
    } else {
      elPromoRow.classList.add('hidden');
    }
  }

  let depositToCollect = calc.depositAmount;
  if (payMethod.includes('100%')) {
    depositToCollect = calc.totalPrice;
  } else if (payMethod.includes('Chưa cọc')) {
    depositToCollect = 0;
  }
  const remainingToCollect = Math.max(0, calc.totalPrice - depositToCollect);

  if (elTotal) elTotal.textContent = fmt(calc.totalPrice);
  if (elDeposit) elDeposit.textContent = fmt(depositToCollect);
  if (elRemaining) elRemaining.textContent = fmt(remainingToCollect);
}
window.updateWalkinPricePreview = updateWalkinPricePreview;

function setWalkinBlacklistState(isBlacklisted) {
  const walkinForm = document.getElementById('admin-walkin-form');
  if (!walkinForm) return;
  walkinForm.dataset.blacklisted = isBlacklisted ? '1' : '';
  const submitBtn = walkinForm.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = !!isBlacklisted;
    submitBtn.classList.toggle('opacity-50', !!isBlacklisted);
    submitBtn.classList.toggle('cursor-not-allowed', !!isBlacklisted);
    submitBtn.title = isBlacklisted ? 'Số điện thoại nằm trong Blacklist — Đã khóa tạo đơn' : '';
  }
}

async function checkWalkinPhoneNoShow(rawPhone) {
  const warnBox = document.getElementById('walkin-noshow-warning');
  const warnText = document.getElementById('walkin-noshow-warning-text');

  const clean = String(rawPhone || '').replace(/[^\d]/g, '');
  if (clean.length < 9) {
    setWalkinBlacklistState(false);
    if (warnBox) warnBox.classList.add('hidden');
    if (warnText) warnText.innerHTML = '';
    return;
  }

  const db = window.SanBongApp?.SanBongDB;
  const localStats = db && typeof db.getPhoneNoShowAndDebt === 'function'
    ? db.getPhoneNoShowAndDebt(clean)
    : { noShowCount: 0 };

  let noShowCount = Number(localStats.noShowCount || 0);
  let isBlacklisted = false;
  let customerTier = 'standard';
  let adminNote = '';

  const r = await adminFetchJson(`../api/bookings.php?action=check_phone_noshow&phone=${encodeURIComponent(clean)}`);
  if (r.ok && r.data) {
    noShowCount = Math.max(noShowCount, Number(r.data.noShowCount ?? r.data.no_show_count ?? 0));
    isBlacklisted = Boolean(r.data.isBlacklisted ?? r.data.is_blacklisted);
    customerTier = String(r.data.customerTier ?? r.data.customer_tier ?? 'standard');
    adminNote = String(r.data.adminNote ?? r.data.admin_note ?? '').trim();
  }

  setWalkinBlacklistState(isBlacklisted);
  if (!warnBox) return;

  const tierLabels = {
    vip: '⭐ Khách VIP',
    regular: '✓ Khách quen',
    warning_noshow: '⚠️ Cảnh báo No-Show',
    standard: 'Khách tiêu chuẩn'
  };
  const tierLabel = tierLabels[customerTier] || customerTier;
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  const showWarningBox = isBlacklisted || noShowCount >= 2 || adminNote || customerTier === 'vip' || customerTier === 'regular' || customerTier === 'warning_noshow';
  if (!showWarningBox) {
    warnBox.classList.add('hidden');
    if (warnText) warnText.innerHTML = '';
    return;
  }

  const parts = [];
  if (isBlacklisted) {
    parts.push(`<span class="font-extrabold text-red-700">⛔ SĐT ĐANG NẰM TRONG BLACKLIST (ĐÃ KHÓA ĐẶT SÂN):</span> Không thể tạo đơn mới cho số này.`);
  }
  if (noShowCount >= 2) {
    parts.push(`<span>⚠️ Khách đã có <b>${Number(noShowCount)} lần No-Show</b>! Bắt buộc thu cọc trước khi giữ sân.</span>`);
  }
  if (customerTier && customerTier !== 'standard') {
    parts.push(`<span class="inline-block px-1.5 py-0.5 rounded bg-slate-800 text-white text-[10px] font-bold">${escapeSearchHTML(tierLabel)}</span>`);
  }
  if (adminNote) {
    parts.push(`<span class="block mt-1 text-[11px] font-semibold">📝 Ghi chú CRM: ${escapeSearchHTML(adminNote)}</span>`);
  }

  warnBox.classList.toggle('border-red-500', isBlacklisted);
  warnBox.classList.toggle('bg-red-100', isBlacklisted);
  if (warnText) {
    warnText.innerHTML = parts.join(' ');
  } else {
    warnBox.textContent = parts.map(p => p.replace(/<[^>]+>/g, '')).join(' ');
  }
  warnBox.classList.remove('hidden');
}
window.checkWalkinPhoneNoShow = checkWalkinPhoneNoShow;

function initQuickBookingForm() {
  const db = window.SanBongApp.SanBongDB;
  const pitchSelect = document.getElementById('admin-pitch-select');
  const slotSelect = document.getElementById('admin-slot-select');
  const dateInput = document.getElementById('admin-book-date');
  const packageSelect = document.getElementById('admin-book-package');
  const paySelect = document.getElementById('admin-pay-select');
  const phoneInput = document.getElementById('admin-cust-phone');
  if (!pitchSelect || !slotSelect) return;

  const todayISO = (window.SanBongApp?.getLocalTodayISO ? window.SanBongApp.getLocalTodayISO() : new Date().toISOString().split('T')[0]);
  if (dateInput) {
    dateInput.min = todayISO;
    if (!dateInput.value || dateInput.value < todayISO) {
      dateInput.value = todayISO;
    }
  }

  const prevPitch = pitchSelect.value;
  pitchSelect.innerHTML = db.getPitches().filter(p => p.status !== 'Ẩn').map(p => `
    <option value="${escapeSearchHTML(p.id)}" ${p.status === 'Bảo trì' ? 'disabled' : ''}>${escapeSearchHTML(p.name)} (${escapeSearchHTML(p.typeName)}) - ${escapeSearchHTML(window.SanBongApp.formatVND(p.basePrice))}/ca 2h</option>
  `).join('');
  if (prevPitch && Array.from(pitchSelect.options).some(o => o.value === prevPitch && !o.disabled)) {
    pitchSelect.value = prevPitch;
  }

  refreshWalkinBookedSlots();
  if (typeof renderAdminInventory === 'function') renderAdminInventory();
  if (typeof loadShiftHandovers === 'function') loadShiftHandovers();

  if (phoneInput && !phoneInput._boundNoShow) {
    phoneInput._boundNoShow = true;
    let tmr = null;
    const onPhoneChange = () => {
      if (tmr) clearTimeout(tmr);
      tmr = setTimeout(() => checkWalkinPhoneNoShow(phoneInput.value), 150);
    };
    phoneInput.addEventListener('input', onPhoneChange);
    phoneInput.addEventListener('change', onPhoneChange);
    phoneInput.addEventListener('blur', () => checkWalkinPhoneNoShow(phoneInput.value));
  }

  if (!pitchSelect._bound) {
    pitchSelect._bound = true;
    pitchSelect.addEventListener('change', () => {
      refreshWalkinBookedSlots();
    });
  }
  if (dateInput && !dateInput._bound) {
    dateInput._bound = true;
    dateInput.addEventListener('change', () => {
      refreshWalkinBookedSlots();
    });
  }
  if (!slotSelect._bound) {
    slotSelect._bound = true;
    slotSelect.addEventListener('change', () => {
      updateWalkinPricePreview();
    });
  }
  if (packageSelect && !packageSelect._bound) {
    packageSelect._bound = true;
    packageSelect.addEventListener('change', () => {
      updateWalkinPricePreview();
    });
  }
  if (paySelect && !paySelect._bound) {
    paySelect._bound = true;
    paySelect.addEventListener('change', () => {
      updateWalkinPricePreview();
    });
  }

  const walkinForm = document.getElementById('admin-walkin-form');
  if (walkinForm && !walkinForm._bound) {
    walkinForm._bound = true;
    walkinForm.addEventListener('reset', () => {
      setTimeout(() => {
        if (dateInput) dateInput.value = (window.SanBongApp?.getLocalTodayISO ? window.SanBongApp.getLocalTodayISO() : new Date().toISOString().split('T')[0]);
        setWalkinBlacklistState(false);
        const warnBox = document.getElementById('walkin-noshow-warning');
        if (warnBox) {
          warnBox.classList.add('hidden');
          warnBox.classList.remove('border-red-500', 'bg-red-100');
        }
        const warnText = document.getElementById('walkin-noshow-warning-text');
        if (warnText) warnText.innerHTML = '';
        refreshWalkinBookedSlots();
      }, 20);
    });
    walkinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (walkinForm.dataset.blacklisted === '1') {
        if (window.SanBongApp?.showToast) window.SanBongApp.showToast('SĐT này đang nằm trong Blacklist — không thể tạo đơn mới!', 'error', 4000);
        return;
      }

      const name = (document.getElementById('admin-cust-name')?.value || '').trim();
      const phone = (document.getElementById('admin-cust-phone')?.value || '').trim();
      const pitchId = pitchSelect.value;
      const getToday = window.SanBongApp?.getLocalTodayISO ? window.SanBongApp.getLocalTodayISO() : new Date().toISOString().split('T')[0];
      const dateVal = dateInput?.value || getToday;
      const slotId = slotSelect.value;
      const weeksCount = Math.max(1, parseInt(packageSelect?.value || '1', 10) || 1);
      const payMethod = paySelect?.value || 'Tiền mặt tại quầy';
      let note = (document.getElementById('admin-cust-note')?.value || '').trim();

      if (dateVal < getToday) {
        if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Ngày thi đấu không được nhỏ hơn ngày hôm nay!', 'error');
        return;
      }

      const selectedOpt = slotSelect.options[slotSelect.selectedIndex];
      if (!slotId || (selectedOpt && selectedOpt.disabled)) {
        if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Khung giờ này đã kín lịch hoặc đang bảo trì! Vui lòng chọn khung giờ trống khác.', 'error');
        return;
      }

      if (weeksCount > 1) {
        const promo = db.getPackagePromotion(weeksCount);
        const giftLabel = weeksCount >= 12
          ? 'Tặng 2 thùng nước + 1 trọng tài mỗi trận (0đ)'
          : (weeksCount >= 8 ? 'Tặng 1 thùng nước + 1 bộ Bib mỗi trận (0đ)' : 'Tặng 1 lốc nước + bóng mỗi trận (0đ)');
        note = (note ? note + ' | ' : '') + `[Gói cố định ${weeksCount} tuần - Giảm ${promo ? Math.round(promo.discountRate * 100) : 5}% · ${giftLabel}]`;
      }

      const submitBtn = walkinForm.querySelector('button[type="submit"]');
      const origBtnText = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '⏳ Đang khóa sân...';
      }

      try {
        const r = await adminFetchJson('../api/bookings.php', {
          method: 'POST',
          body: JSON.stringify({
            action: 'create',
            isWalkin: true,
            customerName: name,
            phone: phone,
            pitchId: pitchId,
            date: dateVal,
            slotId: slotId,
            weeksCount: weeksCount,
            bookingMode: weeksCount > 1 ? 'monthly' : 'single',
            paymentMethod: payMethod,
            payFull: payMethod.includes('100%'),
            note: note
          })
        });

        if (!r.ok) {
          if (window.SanBongApp?.showToast) {
            window.SanBongApp.showToast(r.message || 'Khung giờ vừa được đặt bởi người khác! Vui lòng chọn giờ khác.', 'error', 4000);
          }
          await refreshWalkinBookedSlots();
          return;
        }

        const srvData = r.data || {};
        const createdBooking = db.createBooking({
          code: srvData.code, customerName: srvData.customerName || name, phone: srvData.phone || phone,
          pitchId: pitchId, date: srvData.date || dateVal, slotId: slotId,
          slotTime: srvData.slotTime || db.getTimeSlots().find(s => s.id === slotId)?.time,
          weeksCount: weeksCount, bookingMode: weeksCount > 1 ? 'monthly' : 'single',
          services: [], voucherCode: '', note: note, status: srvData.status || 'Đã xác nhận',
          paymentStatus: srvData.paymentStatus || (payMethod.includes('100%') ? 'Đã thanh toán 100%' : (payMethod.includes('Chưa cọc') ? 'Chờ thu tại sân' : 'Đã cọc 30%')),
          paymentMethod: payMethod
        });

        if (srvData.totalPrice !== undefined) {
          const allB = db.getAllBookings();
          const idx = allB.findIndex(b => b.code === createdBooking.code);
          if (idx >= 0) {
            allB[idx].totalPrice = Number(srvData.totalPrice);
            allB[idx].depositAmount = Number(srvData.depositAmount ?? allB[idx].depositAmount);
            allB[idx].remainingAmount = Number(srvData.remainingAmount ?? allB[idx].remainingAmount);
            localStorage.setItem('sb_bookings_v1', JSON.stringify(allB));
          }
        }

        if (window.SanBongApp?.showToast) {
          window.SanBongApp.showToast(`✓ Đã tạo đơn khóa sân thành công! Mã đơn: #${createdBooking.code}`, 'success', 4000);
        }

        walkinForm.reset();
        setWalkinBlacklistState(false);
        const warnBox = document.getElementById('walkin-noshow-warning');
        if (warnBox) warnBox.classList.add('hidden');
        if (dateInput) dateInput.value = dateVal;
        await refreshWalkinBookedSlots();
        if (typeof renderOverviewTodayBookings === 'function') renderOverviewTodayBookings();
        if (typeof renderOverviewKPIs === 'function') renderOverviewKPIs();
        renderTimelineGantt();
        if (typeof loadShiftHandovers === 'function') loadShiftHandovers();
        if (isManagerOrAdmin()) {
          if (typeof renderAdminPayments === 'function') renderAdminPayments();
          if (typeof renderAdminReports === 'function') renderAdminReports();
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = walkinForm.dataset.blacklisted === '1';
          submitBtn.innerHTML = origBtnText;
        }
      }
    });
  }
}
window.initQuickBookingForm = initQuickBookingForm;
