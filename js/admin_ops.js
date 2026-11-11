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
  const targetDate = dateStr || selectedTimelineDate || getLocalTodayISO();
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
            code: srvB.code,
            customerName: srvB.customerName || srvB.customer_name || 'Khách đặt sân',
            phone: srvB.phone || '',
            pitchId: srvB.pitchId || srvB.pitch_id || '',
            pitchName: srvB.pitchName || srvB.pitch_name || '',
            date: srvB.date || srvB.booking_date || targetDate,
            slotId: srvB.slotId || srvB.slot_id || '',
            slotTime: srvB.slotTime || srvB.slot_time || '',
            totalPrice: Number(srvB.totalPrice ?? srvB.total_price ?? 0),
            depositAmount: Number(srvB.depositAmount ?? srvB.deposit_amount ?? 0),
            remainingAmount: Number(srvB.remainingAmount ?? srvB.remaining_amount ?? 0),
            status: srvB.status || 'Đã xác nhận',
            paymentStatus: srvB.paymentStatus || srvB.payment_status || 'Đã cọc 30%',
            paymentMethod: srvB.paymentMethod || srvB.payment_method || '',
            note: srvB.note || ''
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
  if (deltaDays === 0) {
    selectedTimelineDate = getLocalTodayISO();
  } else {
    const cur = new Date((selectedTimelineDate || getLocalTodayISO()) + 'T00:00:00');
    cur.setDate(cur.getDate() + Number(deltaDays || 0));
    const yyyy = cur.getFullYear();
    const mm = String(cur.getMonth() + 1).padStart(2, '0');
    const dd = String(cur.getDate()).padStart(2, '0');
    selectedTimelineDate = `${yyyy}-${mm}-${dd}`;
  }
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

  if (!selectedTimelineDate) {
    selectedTimelineDate = getLocalTodayISO();
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
    const presets = [
      { left: 42, width: 16 },
      { left: 60, width: 17 },
      { left: 79, width: 14 }
    ];
    return presets[fallbackIdx % presets.length];
  };

  container.innerHTML = pitches.map((p) => {
    const isMaint = p.status === 'Bảo trì';
    const pitchBookings = allBookings.filter(b => {
      const bPitchId = b.pitchId || b.pitch_id;
      const bDate = b.date || b.booking_date;
      const bStatus = b.status || '';
      const bPayStatus = b.paymentStatus || b.payment_status || '';
      return bPitchId === p.id &&
        bDate === selectedTimelineDate &&
        bStatus !== 'Đã hủy' &&
        bStatus !== 'Khách chưa đến' &&
        bStatus !== 'Vắng mặt (No-Show)' &&
        !String(bStatus).includes('No-Show') &&
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
      const isSelected = b.code === activeInPlayCode ? 'ring-2 ring-[#0F172A] z-10' : '';
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

  renderInlineInPlaySelector();
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
  const dateVal = dateInput?.value || getLocalTodayISO();
  const prevSlotId = slotSelect.value;

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
    const maintReason = getSlotMaintenanceReason(pitchId, dateVal, s.time, maintenanceWindows);
    if (maintReason) {
      maintMap[s.id] = maintReason;
      return `<option value="${escapeSearchHTML(s.id)}" disabled class="text-red-500">${escapeSearchHTML(s.time)} (🔧 Bảo trì - ${escapeSearchHTML(maintReason)})</option>`;
    }
    const bookedCode = bookedMap[s.id];
    if (bookedCode) {
      return `<option value="${escapeSearchHTML(s.id)}" disabled class="text-slate-400">${escapeSearchHTML(s.time)} (🔒 Đã đặt - #${escapeSearchHTML(bookedCode)})</option>`;
    }
    return `<option value="${escapeSearchHTML(s.id)}">${escapeSearchHTML(s.time)} ${s.isPeak ? '★ Giờ cao điểm' : ''}</option>`;
  }).join('');

  if (prevSlotId && !bookedMap[prevSlotId] && !maintMap[prevSlotId]) {
    slotSelect.value = prevSlotId;
  } else {
    const firstFree = slots.find(s => !bookedMap[s.id] && !maintMap[s.id]);
    slotSelect.value = firstFree ? firstFree.id : '';
  }

  updateWalkinPricePreview();
}
window.refreshWalkinBookedSlots = refreshWalkinBookedSlots;

function updateWalkinPricePreview() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const pitchId = document.getElementById('admin-pitch-select')?.value || '';
  const dateVal = document.getElementById('admin-book-date')?.value || getLocalTodayISO();
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
      : `${fmt(calc.pitchPrice)}${calc.isWeekend ? ' (Giá cuối tuần)' : (calc.isPeak ? ' (Giờ cao điểm)' : '')}`;
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
    : { noShowCount: 0, debtAmount: 0 };

  let noShowCount = Number(localStats.noShowCount || 0);
  let debtAmount = Number(localStats.debtAmount || 0);
  let isBlacklisted = false;
  let customerTier = 'standard';
  let adminNote = '';

  const r = await adminFetchJson(`../api/bookings.php?action=check_phone_noshow&phone=${encodeURIComponent(clean)}`);
  if (r.ok && r.data) {
    noShowCount = Math.max(noShowCount, Number(r.data.noShowCount ?? r.data.no_show_count ?? 0));
    debtAmount = Math.max(debtAmount, Number(r.data.debtAmount ?? r.data.debt_amount ?? 0));
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

  const showWarningBox = isBlacklisted || noShowCount >= 2 || debtAmount > 0 || adminNote || customerTier === 'vip' || customerTier === 'regular' || customerTier === 'warning_noshow';
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
  if (debtAmount > 0) {
    parts.push(`<span>💰 Đang còn công nợ chưa thu: <b>${escapeSearchHTML(fmt(debtAmount))}</b>.</span>`);
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

  const todayISO = getLocalTodayISO();
  if (dateInput) {
    dateInput.min = todayISO;
    if (!dateInput.value || dateInput.value < todayISO) {
      dateInput.value = todayISO;
    }
  }

  const prevPitch = pitchSelect.value;
  pitchSelect.innerHTML = db.getPitches().filter(p => p.status !== 'Ẩn').map(p => `
    <option value="${escapeSearchHTML(p.id)}" ${p.status === 'Bảo trì' ? 'disabled' : ''}>${escapeSearchHTML(p.name)} (${escapeSearchHTML(p.typeName)}) - ${escapeSearchHTML(window.SanBongApp.formatVND(p.basePrice))}/h</option>
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
        if (dateInput) dateInput.value = getLocalTodayISO();
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
      const dateVal = dateInput?.value || getLocalTodayISO();
      const slotId = slotSelect.value;
      const weeksCount = Math.max(1, parseInt(packageSelect?.value || '1', 10) || 1);
      const payMethod = paySelect?.value || 'Tiền mặt tại quầy';
      let note = (document.getElementById('admin-cust-note')?.value || '').trim();

      if (dateVal < getLocalTodayISO()) {
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
          code: srvData.code,
          customerName: srvData.customerName || name,
          phone: srvData.phone || phone,
          pitchId: pitchId,
          date: srvData.date || dateVal,
          slotId: slotId,
          slotTime: srvData.slotTime || db.getTimeSlots().find(s => s.id === slotId)?.time,
          weeksCount: weeksCount,
          bookingMode: weeksCount > 1 ? 'monthly' : 'single',
          services: [],
          voucherCode: '',
          note: note,
          status: srvData.status || 'Đã xác nhận',
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
        renderOverviewTodayBookings();
        renderOverviewKPIs();
        renderTimelineGantt();
        if (typeof loadShiftHandovers === 'function') loadShiftHandovers();
        if (isManagerOrAdmin()) {
          renderAdminPayments();
          renderAdminReports();
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

// ============================================================================
// GIAI ĐOẠN 5.2, 5.3 & 5.5: LỊCH LẶP CỐ ĐỊNH, WAITLIST MỞ RỘNG & GHÉP KÈO
// ============================================================================
// [hoisted to admin.js]
// [hoisted to admin.js]
// [hoisted to admin.js]

function initRecurringScheduleForm() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const pitchSel = document.getElementById('rec-pitch-id');
  const slotSel = document.getElementById('rec-slot-id');
  const startInput = document.getElementById('rec-start-date');
  const daySel = document.getElementById('rec-day-of-week');
  const openChk = document.getElementById('rec-is-open-ended');

  if (pitchSel) {
    const prevP = pitchSel.value;
    pitchSel.innerHTML = db.getPitches().filter(p => p.status !== 'Ẩn').map(p => (
      `<option value="${escapeSearchHTML(p.id)}">${escapeSearchHTML(p.name)} (${escapeSearchHTML(p.typeName || p.type)})</option>`
    )).join('');
    if (prevP && Array.from(pitchSel.options).some(o => o.value === prevP)) {
      pitchSel.value = prevP;
    }
  }

  if (slotSel) {
    const prevS = slotSel.value;
    slotSel.innerHTML = db.getTimeSlots().map(s => (
      `<option value="${escapeSearchHTML(s.id)}">${escapeSearchHTML(s.time)} ${s.isPeak ? '★ Cao điểm' : ''}</option>`
    )).join('');
    if (prevS && Array.from(slotSel.options).some(o => o.value === prevS)) {
      slotSel.value = prevS;
    }
  }

  const todayISO = getLocalTodayISO();
  if (startInput) {
    if (!startInput.value) startInput.value = todayISO;
    startInput.min = todayISO;
    if (!startInput._boundDow) {
      startInput._boundDow = true;
      startInput.addEventListener('change', () => {
        if (!daySel || !startInput.value) return;
        const d = new Date(startInput.value + 'T00:00:00');
        if (!isNaN(d.getTime())) {
          const jsDay = d.getDay();
          daySel.value = String(jsDay === 0 ? 7 : jsDay);
        }
      });
    }
  }
  if (daySel && startInput?.value && !daySel._initDone) {
    daySel._initDone = true;
    const d = new Date(startInput.value + 'T00:00:00');
    if (!isNaN(d.getTime())) {
      const jsDay = d.getDay();
      daySel.value = String(jsDay === 0 ? 7 : jsDay);
    }
  }
  if (openChk) {
    toggleRecurringWeeksInput(openChk.checked);
  }
}
window.initRecurringScheduleForm = initRecurringScheduleForm;

function toggleRecurringWeeksInput(isOpenEnded) {
  const weeksEl = document.getElementById('rec-weeks-count');
  if (!weeksEl) return;
  weeksEl.disabled = !!isOpenEnded;
  weeksEl.classList.toggle('opacity-50', !!isOpenEnded);
  weeksEl.classList.toggle('bg-slate-100', !!isOpenEnded);
}
window.toggleRecurringWeeksInput = toggleRecurringWeeksInput;

async function loadRecurringSchedules() {
  const tbody = document.getElementById('admin-recurring-tbody');
  if (!tbody) return;
  const r = await adminFetchJson('../api/admin.php?action=get_recurring_schedules');
  if (!r.ok || !Array.isArray(r.data)) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-4 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải danh sách lịch cố định.')}</td></tr>`;
    return;
  }

  recurringSchedulesCache = r.data;
  if (r.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-[#94A3B8]">Chưa có lịch cố định hàng tuần nào.</td></tr>';
    return;
  }

  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');
  const dowMap = { 1: 'Thứ 2', 2: 'Thứ 3', 3: 'Thứ 4', 4: 'Thứ 5', 5: 'Thứ 6', 6: 'Thứ 7', 7: 'Chủ Nhật' };
  const statusMap = {
    active: '<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">Đang chạy</span>',
    paused: '<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-bold text-[10px]">Tạm dừng</span>',
    cancelled: '<span class="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[10px]">Đã hủy chuỗi</span>'
  };

  tbody.innerHTML = r.data.map(s => {
    const schCode = s.schedule_code || ('REC-' + s.id);
    const dowLabel = dowMap[Number(s.day_of_week)] || ('Thứ ' + s.day_of_week);
    const weeksLabel = Number(s.is_open_ended) === 1 ? 'Không giới hạn' : `${Number(s.weeks_count || 0)} tuần`;
    const upcoming = Array.isArray(s.upcoming_bookings) ? s.upcoming_bookings : [];
    const upcomingHtml = upcoming.length > 0 ? upcoming.map(ub => {
      const bCode = ub.code || '';
      const isCancelled = ub.status === 'Đã hủy' || ub.status === 'Hoàn thành';
      const skipBtn = (!isCancelled && s.status === 'active')
        ? `<button type="button" onclick="skipRecurringBooking('${escapeJsAttr(bCode)}')" class="ml-1 px-1.5 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-[9px] cursor-pointer" title="Khách nghỉ buổi này">Nghỉ 1 buổi</button>`
        : '';
      return `<div class="inline-flex items-center gap-1 px-2 py-0.5 mr-1 mb-1 rounded-full border text-[10px] ${isCancelled ? 'bg-slate-100 border-slate-200 text-slate-400 line-through' : 'bg-white border-emerald-200 text-slate-700'}">
        <span class="font-mono font-bold">${escapeSearchHTML(ub.booking_date || '')}</span>
        <span class="text-slate-400">#${escapeSearchHTML(bCode)}</span>
        ${skipBtn}
      </div>`;
    }).join('') : '<span class="text-[11px] text-[#94A3B8]">Không có buổi sắp tới</span>';

    const canCancel = isManagerOrAdmin() && s.status === 'active';
    const actionHtml = canCancel
      ? `<button type="button" onclick="cancelRecurringSchedule(${Number(s.id)}, '${escapeJsAttr(schCode)}')" class="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[11px] cursor-pointer">Dừng chuỗi</button>`
      : (statusMap[s.status] || escapeSearchHTML(s.status || ''));

    return `<tr class="hover:bg-slate-50/70">
      <td class="py-2.5 pr-3 align-top">
        <div class="font-mono font-bold text-[#0F172A]">${escapeSearchHTML(schCode)}</div>
        <div class="mt-1">${statusMap[s.status] || escapeSearchHTML(s.status || '')}</div>
      </td>
      <td class="py-2.5 pr-3 align-top">
        <div class="font-bold text-[#0F172A]">${escapeSearchHTML(s.customer_name || '')}</div>
        <div class="font-mono text-[11px] text-[#64748B]">${escapeSearchHTML(s.phone || '')}</div>
        ${s.note ? `<div class="text-[10px] text-slate-400 italic max-w-[180px] truncate" title="${escapeSearchHTML(s.note)}">${escapeSearchHTML(s.note)}</div>` : ''}
      </td>
      <td class="py-2.5 pr-3 align-top">
        <div class="font-bold text-[#0F172A]">${escapeSearchHTML(s.pitch_name || s.pitch_id || '')}</div>
        <div class="text-[11px] text-[#16A34A] font-semibold">${escapeSearchHTML(dowLabel)} · ${escapeSearchHTML(weeksLabel)}</div>
      </td>
      <td class="py-2.5 pr-3 align-top">
        <div class="font-bold text-[#0F172A]">⏰ ${escapeSearchHTML(s.slot_time || s.slot_id || '')}</div>
        <div class="text-[11px] text-[#64748B]">Từ ${escapeSearchHTML(s.start_date || '')}</div>
      </td>
      <td class="py-2.5 pr-3 align-top whitespace-nowrap">
        <div class="font-bold text-[#0F172A]">${escapeSearchHTML(fmt(s.price_per_match || 0))}</div>
        <div class="text-[10px] text-[#64748B]">Cọc: ${escapeSearchHTML(fmt(s.deposit_per_match || 0))}</div>
      </td>
      <td class="py-2.5 pr-3 align-top max-w-[300px]">${upcomingHtml}</td>
      <td class="py-2.5 text-right align-top">${actionHtml}</td>
    </tr>`;
  }).join('');
}
window.loadRecurringSchedules = loadRecurringSchedules;

async function handleCreateRecurringSchedule(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form?.querySelector('button[type="submit"]');
  const origHtml = submitBtn ? submitBtn.innerHTML : '';

  const customerName = (document.getElementById('rec-cust-name')?.value || '').trim();
  const phone = (document.getElementById('rec-cust-phone')?.value || '').trim();
  const pitchId = document.getElementById('rec-pitch-id')?.value || '';
  const dayOfWeek = parseInt(document.getElementById('rec-day-of-week')?.value || '1', 10) || 1;
  const slotId = document.getElementById('rec-slot-id')?.value || '';
  const startDate = document.getElementById('rec-start-date')?.value || getLocalTodayISO();
  const isOpenEnded = Boolean(document.getElementById('rec-is-open-ended')?.checked);
  const weeksCount = isOpenEnded ? 0 : Math.max(2, parseInt(document.getElementById('rec-weeks-count')?.value || '8', 10) || 8);
  const depositPerMatch = Math.max(0, parseInt(document.getElementById('rec-deposit-per-match')?.value || '0', 10) || 0);
  const note = (document.getElementById('rec-note')?.value || '').trim();

  if (!customerName || !phone || !pitchId || !slotId) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập đầy đủ thông tin khách hàng, sân và khung giờ!', 'error');
    return;
  }

  const db = window.SanBongApp?.SanBongDB;
  const calc = db?.calculatePrice ? db.calculatePrice(pitchId, startDate, slotId, [], '', 1) : null;
  const pricePerMatch = Number(calc?.singlePitchPrice || calc?.pitchPrice || 0);

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Đang tạo chuỗi...';
  }
  try {
    const r = await adminFetchJson('../api/admin.php?action=create_recurring_schedule', {
      method: 'POST',
      body: JSON.stringify({
        customer_name: customerName,
        phone,
        pitch_id: pitchId,
        slot_id: slotId,
        day_of_week: dayOfWeek,
        start_date: startDate,
        is_open_ended: isOpenEnded,
        weeks_count: weeksCount,
        price_per_match: pricePerMatch,
        deposit_per_match: depositPerMatch,
        note
      })
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể tạo lịch cố định!', 'error', 4500);
      return;
    }
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || '✓ Đã tạo lịch cố định hàng tuần thành công!', 'success', 4000);
    }
    form?.reset();
    initRecurringScheduleForm();
    await loadRecurringSchedules();
    await fetchTimelineDateBookings(selectedTimelineDate);
    renderTimelineGantt();
    renderOverviewTodayBookings();
    renderOverviewKPIs();
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origHtml;
    }
  }
}
window.handleCreateRecurringSchedule = handleCreateRecurringSchedule;

async function skipRecurringBooking(bookingCode) {
  const reason = await showAdminPrompt({
    title: `📅 Nghỉ 1 buổi trong chuỗi (#${bookingCode})`,
    message: `Xác nhận hủy đơn #${bookingCode} để nhả sân riêng buổi này (chuỗi các tuần sau vẫn giữ nguyên). Nhập lý do:`,
    placeholder: 'VD: Đội bận công tác tuần này',
    defaultValue: 'Khách báo nghỉ 1 buổi',
    confirmText: 'Xác nhận nghỉ 1 buổi',
    cancelText: 'Đóng'
  });
  if (reason === null) return;

  const r = await adminFetchJson('../api/admin.php?action=skip_recurring_booking', {
    method: 'POST',
    body: JSON.stringify({ booking_code: bookingCode, reason })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể hủy buổi này!', 'error', 4000);
    return;
  }
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || `✓ Đã nhả sân buổi #${bookingCode}`, 'success', 3500);
  await loadRecurringSchedules();
  await fetchTimelineDateBookings(selectedTimelineDate);
  renderTimelineGantt();
  renderOverviewTodayBookings();
  renderOverviewKPIs();
}
window.skipRecurringBooking = skipRecurringBooking;

async function cancelRecurringSchedule(scheduleId, scheduleCode) {
  const reason = await showAdminPrompt({
    title: `⛔ Dừng toàn bộ chuỗi lịch (${scheduleCode || '#' + scheduleId})`,
    message: 'Hệ thống sẽ dừng chuỗi lịch cố định và hủy toàn bộ các buổi chưa diễn ra trong tương lai. Nhập lý do dừng chuỗi:',
    placeholder: 'VD: Đội bóng ngừng thuê sân theo tháng',
    defaultValue: 'Ngừng lịch cố định theo yêu cầu khách',
    confirmText: 'Xác nhận dừng chuỗi',
    cancelText: 'Giữ lại',
    danger: true
  });
  if (reason === null) return;

  const r = await adminFetchJson('../api/admin.php?action=cancel_recurring_schedule', {
    method: 'POST',
    body: JSON.stringify({ schedule_id: Number(scheduleId), reason })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể dừng chuỗi lịch cố định!', 'error', 4000);
    return;
  }
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã dừng chuỗi lịch cố định!', 'success', 3500);
  await loadRecurringSchedules();
  await fetchTimelineDateBookings(selectedTimelineDate);
  renderTimelineGantt();
  renderOverviewTodayBookings();
  renderOverviewKPIs();
}
window.cancelRecurringSchedule = cancelRecurringSchedule;

async function runRecurringCronNow() {
  const ok = await showAdminConfirm({
    title: '🔄 Gia hạn lịch cố định 4 tuần tới',
    message: 'Hệ thống sẽ quét các lịch cố định đang chạy (đặc biệt gói không giới hạn) và tự động sinh thêm các buổi đá cho 4 tuần sắp tới. Tiếp tục?',
    confirmText: 'Sinh lịch ngay',
    cancelText: 'Hủy'
  });
  if (!ok) return;

  const btn = document.getElementById('btn-run-recurring-cron');
  const orig = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Đang sinh lịch...';
  }
  try {
    const r = await adminFetchJson('../api/admin.php?action=run_recurring_cron', {
      method: 'POST',
      body: JSON.stringify({})
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể chạy gia hạn lịch cố định!', 'error', 4000);
      return;
    }
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã sinh lịch cố định 4 tuần tới!', 'success', 4000);
    await loadRecurringSchedules();
    await fetchTimelineDateBookings(selectedTimelineDate);
    renderTimelineGantt();
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  }
}
window.runRecurringCronNow = runRecurringCronNow;

async function loadWaitlistAdmin() {
  const tbody = document.getElementById('admin-waitlist-tbody');
  if (!tbody) return;
  const status = document.getElementById('waitlist-status-filter')?.value || 'all';
  const dateFilter = document.getElementById('waitlist-date-filter')?.value || '';

  const r = await adminFetchJson(`../api/admin.php?action=get_waitlist&status=${encodeURIComponent(status)}&date=${encodeURIComponent(dateFilter)}`);
  if (!r.ok || !Array.isArray(r.data)) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-4 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải danh sách chờ.')}</td></tr>`;
    return;
  }

  adminWaitlistCache = r.data;
  if (r.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-[#94A3B8]">Không có yêu cầu chờ sân nào trong bộ lọc này.</td></tr>';
    return;
  }

  const stBadge = {
    waiting: '<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">Đang chờ</span>',
    notified: '<span class="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-bold text-[10px]">Đã báo sân trống</span>',
    converted: '<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">Đã gán sân</span>',
    cancelled: '<span class="px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-bold text-[10px]">Đã hủy</span>',
    expired: '<span class="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[10px]">Hết hạn</span>'
  };

  tbody.innerHTML = r.data.map(w => {
    const wid = Number(w.id);
    let actions = '';
    if (w.status === 'waiting') {
      actions = `<div class="inline-flex items-center gap-1.5">
        <button type="button" onclick="notifyWaitlistCustomer(${wid})" class="px-2 py-1 rounded bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] cursor-pointer">📣 Báo sân trống</button>
        <button type="button" onclick="assignWaitlistCustomer(${wid})" class="px-2 py-1 rounded bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-[11px] cursor-pointer">✅ Gán sân</button>
        <button type="button" onclick="cancelWaitlistCustomer(${wid})" class="px-2 py-1 rounded bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 font-bold text-[11px] cursor-pointer">Hủy</button>
      </div>`;
    } else if (w.status === 'notified') {
      actions = `<div class="inline-flex items-center gap-1.5">
        <button type="button" onclick="assignWaitlistCustomer(${wid})" class="px-2 py-1 rounded bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-[11px] cursor-pointer">✅ Gán sân ngay</button>
        <button type="button" onclick="cancelWaitlistCustomer(${wid})" class="px-2 py-1 rounded bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 font-bold text-[11px] cursor-pointer">Hủy</button>
      </div>`;
    } else if (w.status === 'converted' && w.converted_booking_code) {
      actions = `<span class="font-mono text-[11px] font-bold text-[#16A34A]">#${escapeSearchHTML(w.converted_booking_code)}</span>`;
    } else {
      actions = '<span class="text-[11px] text-[#94A3B8]">—</span>';
    }

    return `<tr class="hover:bg-slate-50/70">
      <td class="py-2.5 pr-3 font-mono font-bold text-[#0F172A] whitespace-nowrap">${escapeSearchHTML(w.booking_date || '')}</td>
      <td class="py-2.5 pr-3">
        <div class="font-bold text-[#0F172A]">${escapeSearchHTML(w.pitch_name || w.pitch_id || '')}</div>
        <div class="text-[11px] text-[#64748B]">⏰ ${escapeSearchHTML(w.slot_time || w.slot_id || '')}</div>
      </td>
      <td class="py-2.5 pr-3 font-semibold text-[#0F172A]">${escapeSearchHTML(w.customer_name || '')}</td>
      <td class="py-2.5 pr-3 font-mono text-[#475569]">${escapeSearchHTML(w.phone || '')}</td>
      <td class="py-2.5 pr-3 text-[#64748B] max-w-[180px] truncate" title="${escapeSearchHTML(w.note || '')}">${escapeSearchHTML(w.note || '—')}</td>
      <td class="py-2.5 pr-3">${stBadge[w.status] || escapeSearchHTML(w.status || '')}</td>
      <td class="py-2.5 text-right">${actions}</td>
    </tr>`;
  }).join('');
}
window.loadWaitlistAdmin = loadWaitlistAdmin;

async function notifyWaitlistCustomer(waitlistId) {
  const r = await adminFetchJson('../api/admin.php?action=notify_waitlist', {
    method: 'POST',
    body: JSON.stringify({ waitlist_id: Number(waitlistId) })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể gửi báo sân trống!', 'error', 4000);
    return;
  }
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã giữ chỗ tạm & gửi thông báo cho khách chờ!', 'success', 3500);
  await loadWaitlistAdmin();
}
window.notifyWaitlistCustomer = notifyWaitlistCustomer;

async function assignWaitlistCustomer(waitlistId) {
  const ok = await showAdminConfirm({
    title: '✅ Gán sân cho khách danh sách chờ',
    message: 'Chuyển yêu cầu chờ này thành đơn đặt sân chính thức (giữ sân ngay)?',
    confirmText: 'Gán sân ngay',
    cancelText: 'Đóng'
  });
  if (!ok) return;

  const r = await adminFetchJson('../api/admin.php?action=assign_waitlist', {
    method: 'POST',
    body: JSON.stringify({ waitlist_id: Number(waitlistId) })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể gán sân cho khách chờ!', 'error', 4000);
    return;
  }
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã gán sân thành công!', 'success', 4000);
  await loadWaitlistAdmin();
  await fetchTimelineDateBookings(selectedTimelineDate);
  renderTimelineGantt();
  renderOverviewTodayBookings();
  renderOverviewKPIs();
}
window.assignWaitlistCustomer = assignWaitlistCustomer;

async function cancelWaitlistCustomer(waitlistId) {
  const ok = await showAdminConfirm({
    title: 'Hủy yêu cầu chờ sân',
    message: 'Xác nhận hủy yêu cầu trong danh sách chờ này?',
    confirmText: 'Xác nhận hủy',
    cancelText: 'Quay lại',
    danger: true
  });
  if (!ok) return;

  const r = await adminFetchJson('../api/admin.php?action=cancel_waitlist', {
    method: 'POST',
    body: JSON.stringify({ waitlist_id: Number(waitlistId) })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể hủy yêu cầu chờ!', 'error', 4000);
    return;
  }
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã hủy yêu cầu danh sách chờ!', 'success', 3000);
  await loadWaitlistAdmin();
}
window.cancelWaitlistCustomer = cancelWaitlistCustomer;

async function loadMatchmakingAdmin() {
  const tbody = document.getElementById('admin-matchmaking-tbody');
  if (!tbody) return;
  const status = document.getElementById('mm-admin-status-filter')?.value || 'all';
  const r = await adminFetchJson(`../api/admin.php?action=get_matchmaking_admin&status=${encodeURIComponent(status)}`);
  if (!r.ok || !Array.isArray(r.data)) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-4 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải danh sách tin ghép kèo.')}</td></tr>`;
    return;
  }

  adminMatchmakingCache = r.data;
  if (r.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-[#94A3B8]">Không có tin tìm đối / ghép kèo nào.</td></tr>';
    return;
  }

  const stMap = {
    pending: '<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">Chờ duyệt</span>',
    open: '<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">Đang mở</span>',
    matched: '<span class="px-2 py-0.5 rounded bg-sky-100 text-sky-700 font-bold text-[10px]">Đã ghép kèo</span>',
    closed: '<span class="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">Đã đóng</span>',
    rejected: '<span class="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[10px]">Từ chối</span>'
  };

  tbody.innerHTML = r.data.map(m => {
    const code = m.post_code || m.postCode || '';
    const codeAttr = escapeJsAttr(code);
    const st = m.status || 'pending';
    let actions = '';
    if (st === 'pending') {
      actions = `<div class="inline-flex items-center gap-1.5">
        <button type="button" onclick="moderateMatchmaking('${codeAttr}', 'approve')" class="px-2.5 py-1 rounded bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-[11px] cursor-pointer">✓ Duyệt mở</button>
        <button type="button" onclick="moderateMatchmaking('${codeAttr}', 'reject')" class="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[11px] cursor-pointer">✕ Từ chối</button>
      </div>`;
    } else if (st === 'open') {
      actions = `<div class="inline-flex items-center gap-1.5">
        <button type="button" onclick="moderateMatchmaking('${codeAttr}', 'close')" class="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-800 text-white font-bold text-[11px] cursor-pointer">🔒 Đóng kèo</button>
        <button type="button" onclick="moderateMatchmaking('${codeAttr}', 'reject')" class="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[11px] cursor-pointer">Từ chối</button>
      </div>`;
    } else if (st === 'closed' || st === 'rejected') {
      actions = `<button type="button" onclick="moderateMatchmaking('${codeAttr}', 'open')" class="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] cursor-pointer">🔓 Mở lại</button>`;
    } else {
      actions = '<span class="text-[11px] text-[#64748B]">Đã khóa kèo</span>';
    }

    return `<tr class="hover:bg-slate-50/70">
      <td class="py-2.5 pr-3 font-mono font-bold text-[#0F172A]">${escapeSearchHTML(code)}</td>
      <td class="py-2.5 pr-3">
        <div class="font-bold text-[#0F172A]">${escapeSearchHTML(m.team_name || '')}</div>
        <div class="text-[11px] text-[#64748B]">Đội trưởng: ${escapeSearchHTML(m.contact_name || '')}</div>
      </td>
      <td class="py-2.5 pr-3 font-mono text-[#475569]">${escapeSearchHTML(m.contact_phone || '')}</td>
      <td class="py-2.5 pr-3">
        <div class="font-bold text-[#0F172A]">${escapeSearchHTML(m.match_date || '')} · ${escapeSearchHTML(m.slot_time || '')}</div>
        <div class="text-[11px] text-[#64748B]">Sân ${escapeSearchHTML(String(m.pitch_type || ''))} người ${m.pitch_name ? '· ' + escapeSearchHTML(m.pitch_name) : ''}</div>
      </td>
      <td class="py-2.5 pr-3">
        <div class="font-semibold text-[#0F172A]">${escapeSearchHTML(m.skill_level || 'Giao hữu')}</div>
        <div class="text-[11px] text-[#64748B]">${escapeSearchHTML(m.bet_rule || '50-50')}</div>
        ${m.note ? `<div class="text-[10px] text-slate-400 italic max-w-[180px] truncate" title="${escapeSearchHTML(m.note)}">${escapeSearchHTML(m.note)}</div>` : ''}
      </td>
      <td class="py-2.5 pr-3">${stMap[st] || escapeSearchHTML(st)}</td>
      <td class="py-2.5 text-right">${actions}</td>
    </tr>`;
  }).join('');
}
window.loadMatchmakingAdmin = loadMatchmakingAdmin;

async function moderateMatchmaking(postCode, decision) {
  if (decision === 'reject' || decision === 'close') {
    const ok = await showAdminConfirm({
      title: decision === 'reject' ? 'Từ chối tin tìm đối' : 'Đóng tin tìm đối',
      message: `Xác nhận ${decision === 'reject' ? 'từ chối' : 'đóng'} tin ghép kèo #${postCode}?`,
      confirmText: decision === 'reject' ? 'Từ chối' : 'Đóng tin',
      cancelText: 'Quay lại',
      danger: decision === 'reject'
    });
    if (!ok) return;
  }

  const r = await adminFetchJson('../api/admin.php?action=moderate_matchmaking', {
    method: 'POST',
    body: JSON.stringify({ post_code: postCode, decision })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể kiểm duyệt tin tìm đối!', 'error', 4000);
    return;
  }
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || `✓ Đã cập nhật tin #${postCode}`, 'success', 3000);
  await loadMatchmakingAdmin();
}
window.moderateMatchmaking = moderateMatchmaking;

function filterAdminPitches(status) {
  currentPitchFilter = status || 'all';
  const mapBtn = {
    'all': 'pitch-filter-all',
    'Hoạt động': 'pitch-filter-active',
    'Bảo trì': 'pitch-filter-maint',
    'Ẩn': 'pitch-filter-hidden'
  };
  Object.keys(mapBtn).forEach(k => {
    const btn = document.getElementById(mapBtn[k]);
    if (btn) {
      if (k === currentPitchFilter) {
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold bg-[#16A34A] text-white shadow-xs cursor-pointer';
      } else {
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer';
      }
    }
  });
  renderAdminPitches();
}
window.filterAdminPitches = filterAdminPitches;

function renderAdminPitches() {
  const db = window.SanBongApp.SanBongDB;
  const allPitches = db.getPitches();
  const container = document.getElementById('admin-pitches-list');
  if (!container) return;

  const addBtn = document.getElementById('btn-add-pitch');
  if (addBtn) {
    if (isManagerOrAdmin()) {
      addBtn.classList.remove('hidden');
    } else {
      addBtn.classList.add('hidden');
    }
  }

  const subHeader = document.getElementById('admin-pitches-header-title') || document.querySelector('#tab-content-pitches h3');
  if (subHeader) {
    subHeader.textContent = `Danh sách ${allPitches.length} sân bóng trực thuộc hệ thống`;
  }

  let pitches = allPitches;
  if (currentPitchFilter !== 'all') {
    pitches = allPitches.filter(p => p.status === currentPitchFilter);
  }

  if (pitches.length === 0) {
    container.innerHTML = `<div class="col-span-full p-8 text-center text-xs text-[#64748B] bg-white rounded-xl border border-dashed border-slate-200">Không có sân bóng nào trong trạng thái "${escapeSearchHTML(currentPitchFilter)}".</div>`;
    return;
  }

  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  container.innerHTML = pitches.map(p => {
    const isMaint = p.status === 'Bảo trì';
    const isHidden = p.status === 'Ẩn';
    const weekendP = Number(p.weekendPrice || p.peakPrice || p.basePrice || 0);

    const statusBadgeHtml = isHidden
      ? '<span class="px-2.5 py-0.5 rounded-full bg-slate-700 text-white text-[11px] font-bold">🙈 Đã ẩn</span>'
      : window.SanBongApp.statusPill(p.status);

    const safePitchAttr = escapeSearchHTML(p.id);
    const adminControls = isManagerOrAdmin() ? `
      <div class="px-4 pb-3 pt-2 flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60">
        <button type="button" data-pitch-id="${safePitchAttr}" onclick="openPitchModal(this.getAttribute('data-pitch-id'))" class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white hover:bg-emerald-50 text-[#0F172A] hover:text-[#16A34A] border border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer flex-1 text-center">
          ✏️ Sửa sân & Giá riêng
        </button>
        <button type="button" data-pitch-id="${safePitchAttr}" onclick="toggleHidePitch(this.getAttribute('data-pitch-id'))" class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold ${isHidden ? 'bg-sky-600 text-white hover:bg-sky-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'} transition-colors cursor-pointer">
          ${isHidden ? '👁️ Hiện sân' : '🙈 Ẩn sân'}
        </button>
      </div>
    ` : '';

    return `
      <div class="ui-card overflow-hidden flex flex-col justify-between ${isHidden ? 'opacity-75 border-dashed border-slate-300' : ''}">
        <div>
          <div class="relative">
            ${window.SanBongApp.renderPitchSVG(p.variant || 'standard', 'h-32')}
            <div class="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-white text-[11px] font-bold text-[#0F172A] shadow-2xs">
              ${escapeSearchHTML(p.typeName)} · ${escapeSearchHTML(p.id)}
            </div>
            <div class="absolute top-2 right-2">
              ${statusBadgeHtml}
            </div>
          </div>
          <div class="p-4 space-y-2">
            <div class="flex items-center justify-between gap-2">
              <h4 class="font-heading font-bold text-sm text-[#0F172A]">${escapeSearchHTML(p.name)}</h4>
              <span class="text-xs font-bold text-[#16A34A]">${fmt(p.basePrice)}/h</span>
            </div>
            <div class="text-[11px] text-[#64748B]">${escapeSearchHTML(p.grass || '')} ${p.size ? '· ' + escapeSearchHTML(p.size) : ''}</div>
            <div class="p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-[#334155] leading-relaxed">
              Thường: <b class="text-[#16A34A]">${fmt(p.basePrice)}</b> | Cao điểm: <b class="text-amber-700">${fmt(p.peakPrice)}</b> | Cuối tuần: <b class="text-purple-700">${fmt(weekendP)}</b>
            </div>
          </div>
        </div>

        <div>
          <div class="p-4 pt-2 flex items-center justify-between border-t border-[#F1F5F9]">
            <span class="text-xs font-semibold text-[#475569]">Bảo trì mặt cỏ:</span>
            <button type="button" data-pitch-id="${safePitchAttr}" onclick="toggleMaintenance(this.getAttribute('data-pitch-id'))" class="btn-sm ${isMaint ? 'btn-primary' : 'btn-danger-outline'} font-bold cursor-pointer">
              ${isMaint ? '✓ Mở hoạt động lại' : '⚠️ Bật bảo trì'}
            </button>
          </div>
          ${adminControls}
        </div>
      </div>
    `;
  }).join('');
}

