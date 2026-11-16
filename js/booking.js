window.selectedPitchId = window.selectedPitchId || 'P7-A';
window.selectedPitchType = window.selectedPitchType || 7;
window.selectedDate = window.selectedDate || '';
window.selectedSlotId = window.selectedSlotId || '';
window.bookingMode = window.bookingMode || 'single';
window.monthlyWeeks = window.monthlyWeeks || 12;
window.monthlyDates = window.monthlyDates || [];
window.extraServicesCollapsed = window.extraServicesCollapsed || false;
window.appliedServices = window.appliedServices || [];
window.appliedVoucherCode = window.appliedVoucherCode || '';
window.isCurrentPhoneBlacklisted = window.isCurrentPhoneBlacklisted || false;
window.preselectedSlotId = window.preselectedSlotId || '';
window.bookingTurnstileToken = window.bookingTurnstileToken || '';
let _bookingNoShowTimer = null;
function setProceedBlocked(blocked) {
  isCurrentPhoneBlacklisted = blocked;
  const btn = document.getElementById('proceed-checkout-btn');
  if (!btn) return;
  btn.disabled = Boolean(blocked);
  btn.classList.toggle('opacity-50', Boolean(blocked));
  btn.classList.toggle('cursor-not-allowed', Boolean(blocked));
}

async function checkBookingPhoneNoShow(rawPhone) {
  const warningEl = document.getElementById('booking-noshow-warning');
  if (!warningEl) return;
  const clean = String(rawPhone || '').replace(/\D+/g, '');
  if (clean.length < 9) {
    setProceedBlocked(false);
    warningEl.classList.add('hidden');
    warningEl.textContent = '';
    return;
  }
  const db = window.SanBongApp?.SanBongDB || window.SanBongDB;
  const localStats = db && typeof db.getPhoneNoShowAndDebt === 'function'
    ? db.getPhoneNoShowAndDebt(clean)
    : { noShowCount: 0 };
  let noShowCount = Number(localStats.noShowCount || 0);
  let isBlacklisted = false;
  let adminNote = '';
  if (_bookingNoShowTimer) clearTimeout(_bookingNoShowTimer);
  _bookingNoShowTimer = setTimeout(async () => {
    try {
      const apiPath = window.SanBongHelpers?.getRelativePath
        ? window.SanBongHelpers.getRelativePath(`api/bookings.php?action=check_phone_noshow&phone=${encodeURIComponent(clean)}`)
        : `/api/bookings.php?action=check_phone_noshow&phone=${encodeURIComponent(clean)}`;
      const res = await fetch(apiPath);
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && json.data) {
          if (json.restricted || json.data.restricted) {
            isBlacklisted = Boolean(json.data.isBlacklisted);
            adminNote = '';
            noShowCount = 0;
          } else {
            noShowCount = Math.max(noShowCount, Number(json.data.noShowCount ?? json.data.no_show_count ?? 0));
            isBlacklisted = Boolean(json.data.isBlacklisted);
            adminNote = String(json.data.adminNote || '');
          }
        }
      }
    } catch (e) {}
    setProceedBlocked(isBlacklisted);
    if (isBlacklisted) {
      warningEl.textContent = `🚫 SĐT này đang bị KHÓA ĐẶT SÂN${adminNote ? ' (' + adminNote + ')' : ''}. Vui lòng liên hệ quản lý sân để được hỗ trợ mở khóa.`;
      warningEl.className = 'mt-2 p-3 rounded-xl bg-rose-50 border border-rose-300 text-xs font-bold text-rose-700';
      warningEl.classList.remove('hidden');
      return;
    }
    if (noShowCount >= 2) {
      const parts = [];
      if (noShowCount >= 2) {
        parts.push(`⚠️ CẢNH BÁO: SĐT này đã có ${noShowCount} lần đặt sân nhưng không đến (No-Show)! Bắt buộc thu cọc trước khi giữ sân.`);
      }
      warningEl.textContent = parts.join(' ');
      warningEl.className = 'mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800';
      warningEl.classList.remove('hidden');
    } else {
      warningEl.classList.add('hidden');
      warningEl.textContent = '';
    }
  }, 120);
}
window.checkBookingPhoneNoShow = checkBookingPhoneNoShow;
function initDateStrip() {
  const strip = document.getElementById('quick-date-strip');
  if (!strip) return;
  const now = new Date();
  const days = [];
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  for (let i = 0; i < 5; i++) {
    const d = new Date();
    d.setDate(now.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayLabel = dayNames[d.getDay()];
    const dateNum = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
    days.push({ iso, dayLabel, dateNum });
  }
  strip.innerHTML = days.map(d => {
    const isAct = d.iso === selectedDate;
    return `
      <div onclick="selectQuickDate('${d.iso}')" class="py-2 px-1 rounded-xl border cursor-pointer transition-all ${
        isAct ? 'bg-[#16A34A] text-white border-[#16A34A] font-bold shadow-sm' : 'bg-white border-[#E2E8F0] text-[#475569] hover:border-[#16A34A]'
      }">
        <div class="text-[10px] uppercase font-semibold">${d.dayLabel}</div>
        <div class="text-xs font-bold">${d.dateNum}</div>
      </div>
    `;
  }).join('');
}

function selectQuickDate(iso) {
  selectedDate = iso;
  const dateInput = document.getElementById('booking-date-input');
  if (dateInput) dateInput.value = iso;
  initDateStrip();
  renderSlots();
  if (bookingMode === 'monthly') updateMonthlyPackage();
  updateBillSummary();
}
let serverBookedSlotsCache = {};
async function fetchServerBookedSlots(pitchId, dateStr) {
  if (!pitchId || !dateStr) return { bookedList: [], maintenanceWindows: [] };
  const key = `${pitchId}__${dateStr}`;
  try {
    const getRel = window.SanBongApp?.getRelativePath || (p => '/' + p.replace(/^\//, ''));
    const url = getRel(`api/bookings.php?action=booked_slots&pitch_id=${encodeURIComponent(pitchId)}&date=${encodeURIComponent(dateStr)}`);
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json && json.success) {
        const entry = {
          bookedList: Array.isArray(json.data) ? json.data : [],
          maintenanceWindows: Array.isArray(json.maintenanceWindows) ? json.maintenanceWindows : []
        };
        serverBookedSlotsCache[key] = entry;
        return entry;
      }
    }
  } catch (e) {}
  return serverBookedSlotsCache[key] || { bookedList: [], maintenanceWindows: [] };
}

function renderSlots(skipServerFetch = false) {
  const db = window.SanBongApp.SanBongDB;
  const slotsWithStatus = db.getSlotsWithStatus(selectedPitchId, selectedDate);
  const container = document.getElementById('slots-container');
  if (!container) return;
  const esc = (s) => (window.SanBongApp?.escapeHTML ? window.SanBongApp.escapeHTML(s) : String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])));
  const cacheKey = `${selectedPitchId}__${selectedDate}`;
  const cachedEntry = serverBookedSlotsCache[cacheKey] || { bookedList: [], maintenanceWindows: [] };
  const serverList = Array.isArray(cachedEntry) ? cachedEntry : (cachedEntry.bookedList || []);
  const maintWins = Array.isArray(cachedEntry) ? [] : (cachedEntry.maintenanceWindows || []);
  if (Array.isArray(maintWins) && maintWins.length > 0) {
    slotsWithStatus.forEach(s => {
      if (s.status === 'Bảo trì') return;
      const sStart = String(s.startTime || s.time.split('-')[0] || '').trim();
      const sEnd = String(s.endTime || s.time.split('-')[1] || '').trim();
      const hitMw = maintWins.find(mw => {
        const mwStart = String(mw.start_time || '').slice(0, 5);
        const mwEnd = String(mw.end_time || '').slice(0, 5);
        return (!mwStart && !mwEnd) || (sStart < mwEnd && sEnd > mwStart);
      });
      if (hitMw) {
        s.status = 'Bảo trì';
        s.maintenanceReason = hitMw.reason || 'Bảo trì định kỳ';
      }
    });
  }
  if (Array.isArray(serverList) && serverList.length > 0) {
    slotsWithStatus.forEach(s => {
      if (s.status === 'Bảo trì') return;
      const foundSrv = serverList.find(b => (b.slotId || b.slot_id) === s.id || (b.slotTime || b.slot_time) === s.time);
      if (foundSrv && s.status === 'Trống') {
        s.status = foundSrv.status === 'Đang đá' ? 'Đang đá' : 'Đã đặt';
      }
    });
  }
  const todayStr = window.SanBongApp?.getLocalTodayISO ? window.SanBongApp.getLocalTodayISO() : new Date().toISOString().split('T')[0];
  const isToday = selectedDate === todayStr;
  const nowHHMM = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  const isSlotPast = (s) => Boolean(s) && isToday && (s.start || (s.time ? s.time.split('-')[0].trim() : '')) <= nowHHMM;

  if (preselectedSlotId) {
    const preObj = slotsWithStatus.find(s => s.id === preselectedSlotId);
    if (preObj && preObj.status === 'Trống' && !isSlotPast(preObj)) {
      selectedSlotId = preselectedSlotId;
    }
    preselectedSlotId = '';
  }
  const curSelectedObj = slotsWithStatus.find(s => s.id === selectedSlotId);
  if (!curSelectedObj || curSelectedObj.status === 'Đã đặt' || curSelectedObj.status === 'Khóa' || curSelectedObj.status === 'Đang đá' || curSelectedObj.status === 'Bảo trì' || isSlotPast(curSelectedObj)) {
    const firstFree = slotsWithStatus.find(s => s.status === 'Trống' && !isSlotPast(s));
    selectedSlotId = firstFree ? firstFree.id : '';
  }
  container.innerHTML = slotsWithStatus.map(s => {
    const isPast = isSlotPast(s);
    const isSelected = s.id === selectedSlotId;
    const isMaint = s.status === 'Bảo trì';
    const isBooked = s.status === 'Đã đặt' || s.status === 'Khóa';
    const isPlaying = s.status === 'Đang đá';
    const safeId = esc(s.id);
    const safeTime = esc(s.time);
    let chipCls = 'bg-white border border-[#16A34A] text-[#0F172A] hover:bg-[#DCFCE7]/30';
    let statusBadge = `<span class="text-[11px] text-[#16A34A] font-semibold">${s.isPeak ? 'Cao điểm' : 'Thường'}</span>`;
    if (isPast) {
      chipCls = 'bg-slate-100 border border-slate-200 text-slate-400 opacity-50 cursor-not-allowed';
      statusBadge = `<span class="text-[11px] font-bold text-slate-400">⏱️ Đã qua</span>`;
    } else if (isMaint) {
      chipCls = 'hatch-slate border border-[#CBD5E1] text-[#64748B] cursor-not-allowed';
      statusBadge = `<span class="text-[11px] font-bold text-[#475569]">🛠️ Bảo trì</span>`;
    } else if (isSelected) {
      chipCls = 'bg-[#16A34A] text-white border-[#16A34A] shadow-md';
      statusBadge = `<span class="text-[11px] text-white font-bold">✓ Đang chọn</span>`;
    } else if (isPlaying) {
      chipCls = 'bg-[#DBEAFE] border border-[#2563EB] text-[#2563EB] cursor-not-allowed';
      statusBadge = `<span class="text-[11px] font-bold">Đang đá</span>`;
    } else if (isBooked) {
      chipCls = 'bg-[#FEF3C7]/40 border border-[#F59E0B] text-[#B45309] hover:bg-[#FEF3C7] cursor-pointer';
      statusBadge = `<span class="text-[11px] font-bold text-[#B45309]">🔔 Đăng ký chờ</span>`;
    }
    const clickAttr = (isPast || isPlaying || isMaint)
      ? ''
      : (isBooked
        ? `onclick="openWaitlistPrompt(this.getAttribute('data-slot-id'), this.getAttribute('data-slot-time'))"`
        : `onclick="selectSlot(this.getAttribute('data-slot-id'))"`);
    return `
      <div data-slot-id="${safeId}" data-slot-time="${safeTime}" ${clickAttr} class="slot-chip p-3 rounded-xl text-center flex flex-col justify-between ${chipCls}" title="${isPast ? 'Khung giờ này đã qua' : (isMaint ? esc(s.maintenanceReason || 'Sân đang bảo trì trong khung giờ này') : (isBooked ? 'Khung giờ đã kín. Nhấn để đăng ký danh sách chờ!' : ''))}">
        <div class="text-xs sm:text-sm font-extrabold">${safeTime}</div>
        <div class="mt-1">${statusBadge}</div>
      </div>
    `;
  }).join('');
  const activeSlotObj = slotsWithStatus.find(s => s.id === selectedSlotId);
  const badge = document.getElementById('selected-slot-badge');
  if (badge) {
    if (activeSlotObj) {
      badge.textContent = `${activeSlotObj.time} (${activeSlotObj.isPeak ? 'Giờ cao điểm' : 'Giờ thường'})`;
      badge.className = 'px-3 py-1 rounded-full bg-[#DCFCE7] text-xs font-bold text-[#16A34A]';
    } else {
      badge.textContent = 'Chưa chọn giờ';
      badge.className = 'px-3 py-1 rounded-full bg-[#F1F5F9] text-xs font-bold text-[#64748B]';
    }
  }
  if (!skipServerFetch) {
    fetchServerBookedSlots(selectedPitchId, selectedDate).then(entry => {
      if (entry && ((entry.bookedList && entry.bookedList.length > 0) || (entry.maintenanceWindows && entry.maintenanceWindows.length > 0))) {
        renderSlots(true);
        updateBillSummary();
      }
    });
  }
}

function selectSlot(slotId) {
  const db = window.SanBongApp?.SanBongDB;
  const todayStr = window.SanBongApp?.getLocalTodayISO ? window.SanBongApp.getLocalTodayISO() : new Date().toISOString().split('T')[0];
  const isToday = selectedDate === todayStr;
  const nowHHMM = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  if (db && isToday) {
    const slots = db.getTimeSlots ? db.getTimeSlots() : [];
    const target = slots.find(s => s.id === slotId);
    if (target) {
      const isPast = (target.start || (target.time ? target.time.split('-')[0].trim() : '')) <= nowHHMM;
      if (isPast) {
        if (window.SanBongApp?.showToast) {
          window.SanBongApp.showToast('Khung giờ này đã qua, vui lòng chọn khung giờ khác', 'warning');
        } else if (typeof showToast === 'function') {
          showToast('Khung giờ này đã qua, vui lòng chọn khung giờ khác', 'warning');
        }
        return;
      }
    }
  }

  selectedSlotId = slotId;
  renderSlots();
  if (bookingMode === 'monthly') updateMonthlyPackage();
  updateBillSummary();
}

function renderServices() {
  const db = window.SanBongApp.SanBongDB;
  const allServices = db.getServices();
  const container = document.getElementById('services-container');
  if (!container) return;
  const esc = (s) => (window.SanBongApp?.escapeHTML ? window.SanBongApp.escapeHTML(s) : String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])));
  container.innerHTML = allServices.map(srv => {
    const existing = appliedServices.find(s => s.id === srv.id);
    const qty = existing ? existing.quantity : 0;
    const isPkg = bookingMode === 'monthly';
    let pkgGiftBadge = '';
    if (isPkg) {
      if (monthlyWeeks >= 12) {
        if (srv.id === 'SRV-WATER') pkgGiftBadge = '<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-300">🎁 Đã tặng sẵn 2 thùng/trận</span>';
        else if (srv.id === 'SRV-REF') pkgGiftBadge = '<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-300">🎁 Đã tặng sẵn 1 trọng tài/trận</span>';
      } else if (monthlyWeeks >= 8) {
        if (srv.id === 'SRV-WATER') pkgGiftBadge = '<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-300">🎁 Đã tặng sẵn 1 thùng/trận</span>';
        else if (srv.id === 'SRV-BIB') pkgGiftBadge = '<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-300">🎁 Đã tặng sẵn 1 bộ/trận</span>';
      } else if (monthlyWeeks >= 4) {
        if (srv.id === 'SRV-BALL') pkgGiftBadge = '<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-300">🎁 Đã tặng miễn phí bóng/trận</span>';
      }
    }
    const safeSrvId = esc(srv.id);
    return `
      <div class="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
        <div>
          <div class="flex items-center gap-1.5">
            <span class="text-sm font-bold text-[#0F172A]">${esc(srv.name)}</span>
            ${pkgGiftBadge}
          </div>
          <div class="text-xs text-[#16A34A] font-semibold">${window.SanBongApp.formatVND(srv.price)} / ${esc(srv.unit)} ${pkgGiftBadge ? '<span class="text-slate-500 font-normal">(Giá nếu gọi thêm ngoài gói)</span>' : ''}</div>
        </div>
        <div class="flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-lg p-1">
          <button type="button" data-srv-id="${safeSrvId}" onclick="changeServiceQty(this.getAttribute('data-srv-id'), -1)" class="w-6 h-6 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center font-bold text-xs">−</button>
          <span class="w-6 text-center font-heading font-bold text-xs">${qty}</span>
          <button type="button" data-srv-id="${safeSrvId}" onclick="changeServiceQty(this.getAttribute('data-srv-id'), 1)" class="w-6 h-6 rounded bg-[#DCFCE7] text-[#16A34A] hover:bg-[#BBF7D0] flex items-center justify-center font-bold text-xs">+</button>
        </div>
      </div>
    `;
  }).join('');
}

function changeServiceQty(serviceId, delta) {
  const existing = appliedServices.find(s => s.id === serviceId);
  if (existing) {
    existing.quantity = Math.max(0, existing.quantity + delta);
  } else if (delta > 0) {
    appliedServices.push({ id: serviceId, quantity: delta });
  }
  appliedServices = appliedServices.filter(s => s.quantity > 0);
  renderServices();
  updateBillSummary();
}

function applyVoucher() {
  const input = document.getElementById('voucher-input');
  const msg = document.getElementById('voucher-msg');
  if (!input || !msg) return;
  const code = input.value.trim().toUpperCase();
  if (!code) {
    appliedVoucherCode = '';
    msg.textContent = '';
    updateBillSummary();
    return;
  }
  const db = window.SanBongApp.SanBongDB;
  const weeks = bookingMode === 'monthly' ? monthlyWeeks : 1;
  const testCalc = db.calculatePrice(selectedPitchId, selectedDate, selectedSlotId, appliedServices, code, weeks);
  const v = db.getVouchers().find(vc => vc.code.toUpperCase() === code);
  if (testCalc && !testCalc.voucherError && testCalc.voucherCode) {
    appliedVoucherCode = testCalc.voucherCode;
    msg.textContent = `✓ Đã áp dụng: ${appliedVoucherCode}${v?.description ? ' (' + v.description + ')' : ''}`;
    msg.className = 'text-xs mt-1.5 font-semibold text-[#16A34A]';
  } else if (testCalc?.voucherError && testCalc.voucherError.includes('tối thiểu') && v) {
    appliedVoucherCode = code;
    msg.textContent = `⚠️ ${testCalc.voucherError} Hãy chọn thêm dịch vụ hoặc gói tháng!`;
    msg.className = 'text-xs mt-1.5 font-semibold text-[#D97706]';
  } else {
    appliedVoucherCode = '';
    msg.textContent = `✕ ${testCalc?.voucherError || 'Mã giảm giá không hợp lệ hoặc đã hết hạn.'}`;
    msg.className = 'text-xs mt-1.5 font-semibold text-[#DC2626]';
  }
  updateBillSummary();
}

function quickApplyVoucher(code) {
  const input = document.getElementById('voucher-input');
  if (input) {
    input.value = code;
    applyVoucher();
  }
}
window.quickApplyVoucher = quickApplyVoucher;
function updateBillSummary() {
  const db = window.SanBongApp.SanBongDB;
  const pitch = db.getPitchById(selectedPitchId);
  if (!pitch) return;
  const svgContainer = document.getElementById('summary-pitch-svg');
  if (svgContainer) {
    svgContainer.innerHTML = window.SanBongApp.renderPitchSVG(pitch.variant || 'standard', 'h-24');
  }
  const summaryPitchName = document.getElementById('summary-pitch-name');
  if (summaryPitchName) summaryPitchName.textContent = `${pitch.name} (${pitch.typeName})`;
  const slots = db.getTimeSlots();
  const currentSlot = slots.find(s => s.id === selectedSlotId);
  const slotTimeText = currentSlot ? currentSlot.time : 'Chưa chọn';
  const weeks = bookingMode === 'monthly' ? monthlyWeeks : 1;
  const summaryDatetime = document.getElementById('summary-datetime');
  if (summaryDatetime) {
    summaryDatetime.textContent = weeks > 1
      ? `Gói ${weeks} tuần (từ ${window.SanBongApp.formatDateVN(selectedDate)}) · ${slotTimeText}`
      : `${window.SanBongApp.formatDateVN(selectedDate)} · ${slotTimeText}`;
  }
  const calc = db.calculatePrice(selectedPitchId, selectedDate, selectedSlotId, appliedServices, appliedVoucherCode, weeks);
  if (calc) {
    const elPitch = document.getElementById('summary-pitch-price');
    const elSrv = document.getElementById('summary-services-price');
    const elDisc = document.getElementById('summary-discount-price');
    const elTot = document.getElementById('summary-total-price');
    const elDep = document.getElementById('summary-deposit-price');
    const elRem = document.getElementById('summary-remaining-price');
    if (elPitch) {
      elPitch.textContent = weeks > 1
        ? `${window.SanBongApp.formatVND(calc.pitchPrice)} (${weeks} buổi)`
        : window.SanBongApp.formatVND(calc.pitchPrice);
    }
    const ghRow = document.getElementById('summary-golden-hour-row');
    const ghLabel = document.getElementById('summary-golden-hour-label');
    const ghDeltaEl = document.getElementById('summary-golden-hour-delta');
    if (ghRow && ghLabel && ghDeltaEl) {
      const ghDelta = Number(calc.goldenHourDelta || 0);
      if (ghDelta !== 0 && calc.goldenHourRule) {
        ghRow.classList.remove('hidden');
        ghRow.classList.add('flex');
        ghLabel.textContent = calc.goldenHourRule.name || (ghDelta > 0 ? 'Phụ thu giờ vàng:' : 'Ưu đãi thấp điểm:');
        if (ghDelta > 0) {
          ghDeltaEl.textContent = `+${window.SanBongApp.formatVND(ghDelta)}`;
          ghDeltaEl.className = 'font-bold text-[#D97706]';
        } else {
          ghDeltaEl.textContent = `-${window.SanBongApp.formatVND(Math.abs(ghDelta))}`;
          ghDeltaEl.className = 'font-bold text-[#16A34A]';
        }
      } else {
        ghRow.classList.add('hidden');
        ghRow.classList.remove('flex');
      }
    }
    if (elSrv) elSrv.textContent = window.SanBongApp.formatVND(calc.serviceTotal);
    if (elDisc) {
      const totalDisc = (calc.monthlyDiscountAmount || 0) + (calc.discountAmount || 0);
      elDisc.textContent = `-${window.SanBongApp.formatVND(totalDisc)}`;
    }
    if (elTot) elTot.textContent = window.SanBongApp.formatVND(calc.totalPrice);
    if (elDep) elDep.textContent = window.SanBongApp.formatVND(calc.depositAmount);
    if (elRem) elRem.textContent = window.SanBongApp.formatVND(calc.remainingAmount);
    const depPctEl = document.getElementById('summary-deposit-rate-pct');
    const sysCfg = db.getSystemConfig ? db.getSystemConfig() : null;
    if (depPctEl && sysCfg?.depositRate) {
      depPctEl.textContent = String(Math.max(10, Math.min(100, Number(sysCfg.depositRate) || 30)));
    }
    const promoRow = document.getElementById('summary-promo-gifts-row');
    const promoText = document.getElementById('summary-promo-gifts-text');
    if (promoRow && promoText) {
      if (bookingMode === 'monthly' && calc.packagePromotion) {
        promoRow.classList.remove('hidden');
        promoRow.classList.add('flex');
        promoText.textContent = `${calc.packagePromotion.giftSummary} (0đ)`;
      } else {
        promoRow.classList.add('hidden');
        promoRow.classList.remove('flex');
      }
    }
  }
}

function proceedToCheckout() {
  const db = window.SanBongApp?.SanBongDB;
  const user = db ? db.getUser() : null;
  let name = document.getElementById('cust-name')?.value.trim() || '';
  let phone = document.getElementById('cust-phone')?.value.trim() || '';
  let note = document.getElementById('cust-note')?.value.trim() || '';
  const agree = document.getElementById('policy-agree')?.checked;
  if (isCurrentPhoneBlacklisted) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('SĐT này đang bị khóa đặt sân. Vui lòng liên hệ quản lý sân.', 'error');
    }
    return;
  }
  if (!selectedSlotId) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Vui lòng chọn một khung giờ thi đấu còn trống trước khi tiếp tục.', 'warning');
    }
    const slotsEl = document.getElementById('slots-container');
    if (slotsEl) {
      slotsEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      slotsEl.classList.add('ring-2', 'ring-amber-400', 'ring-offset-2');
      setTimeout(() => slotsEl.classList.remove('ring-2', 'ring-amber-400', 'ring-offset-2'), 2500);
    }
    return;
  }
  const weeks = bookingMode === 'monthly' ? monthlyWeeks : 1;
  const promo = db ? db.getPackagePromotion(weeks) : null;
  if (weeks > 1) {
    const dateLabels = monthlyDates.map(d => d.label).join(', ');
    const giftNote = promo ? ` [Tài trợ mỗi trận: ${promo.giftSummary}]` : '';
    note = (note ? note + ' | ' : '') + `[Gói cố định ${weeks} tuần: ${dateLabels}]${giftNote}`;
  }
  const bookingDraft = {
    pitchId: selectedPitchId,
    date: selectedDate,
    slotId: selectedSlotId,
    bookingMode: bookingMode,
    weeksCount: weeks,
    monthlyDates: monthlyDates,
    packagePromotion: promo,
    services: appliedServices,
    voucherCode: appliedVoucherCode,
    customerName: name || user?.name || '',
    phone: phone || user?.phone || '',
    note: note
  };
  sessionStorage.setItem('sb_booking_draft', JSON.stringify(bookingDraft));
  if (!user || !user.name) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Đang chuyển hướng sang Đăng nhập / Đăng ký để định danh người chuyển cọc và tích điểm thưởng...', 'info', 3000);
    }
    const loginUrl = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath('login?redirect=checkout') : '/login?redirect=checkout';
    setTimeout(() => {
      window.location.href = loginUrl;
    }, 500);
    return;
  }
  if (!name && user?.name) name = user.name;
  if (!phone && user?.phone) phone = user.phone;
  if (!name || !phone) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Vui lòng nhập họ tên và số điện thoại người đặt sân.', 'error');
    }
    const nameInput = document.getElementById('cust-name');
    const phoneInput = document.getElementById('cust-phone');
    if (!name && nameInput) {
      nameInput.classList.add('border-rose-500', 'ring-2', 'ring-rose-100');
      nameInput.focus();
    } else if (!phone && phoneInput) {
      phoneInput.classList.add('border-rose-500', 'ring-2', 'ring-rose-100');
      phoneInput.focus();
    }
    return;
  }
  if (!agree) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Vui lòng tích chọn đồng ý với điều khoản xử lý dữ liệu và chính sách cọc.', 'warning');
    }
    const agreeEl = document.getElementById('policy-agree');
    if (agreeEl) {
      agreeEl.focus();
      agreeEl.parentElement?.classList.add('text-rose-600', 'font-bold');
      setTimeout(() => agreeEl.parentElement?.classList.remove('text-rose-600', 'font-bold'), 2500);
    }
    return;
  }
  bookingDraft.customerName = name;
  bookingDraft.phone = phone;
  bookingDraft.privacy_consent = true;
  bookingDraft.turnstile_token = bookingTurnstileToken || '';
  sessionStorage.setItem('sb_booking_draft', JSON.stringify(bookingDraft));
  window.location.href = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath('checkout') : '/checkout';
}

window.openWaitlistPrompt = function(slotId, slotTime) {
  let defaultName = document.getElementById('cust-name')?.value.trim() || '';
  let defaultPhone = document.getElementById('cust-phone')?.value.trim() || '';
  try {
    const user = JSON.parse(sessionStorage.getItem('sb_current_user') || 'null');
    if (user) {
      if (!defaultName) defaultName = user.full_name || user.name || '';
      if (!defaultPhone) defaultPhone = user.phone || '';
    }
  } catch (e) {}
  let existing = document.getElementById('waitlist-prompt-modal');
  if (existing) existing.remove();
  const esc = (s) => (window.SanBongApp?.escapeHTML ? window.SanBongApp.escapeHTML(s) : String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])));
  const overlay = document.createElement('div');
  overlay.id = 'waitlist-prompt-modal';
  overlay.className = 'fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4';
  overlay.innerHTML = `
    <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 p-6 space-y-4">
      <div class="flex items-start justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 class="font-heading font-bold text-lg text-[#0F172A]">Đăng Ký Danh Sách Chờ</h3>
          <p class="text-xs text-[#64748B] mt-0.5">Khung giờ <b>${esc(slotTime)}</b> ngày <b>${esc(selectedDate)}</b> đã kín lịch. Bạn sẽ được báo ưu tiên ngay khi có khách hủy sân.</p>
        </div>
        <button type="button" id="wl-close-btn" class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500">✕</button>
      </div>
      <form id="wl-modal-form" class="space-y-3">
        <div>
          <label class="block text-xs font-bold text-[#475569] mb-1">Họ và tên <span class="text-rose-500">*</span></label>
          <input type="text" id="wl-input-name" required value="${esc(defaultName)}" placeholder="Nguyễn Văn A" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#16A34A]">
        </div>
        <div>
          <label class="block text-xs font-bold text-[#475569] mb-1">Số điện thoại nhận thông báo (Zalo/SMS) <span class="text-rose-500">*</span></label>
          <input type="tel" id="wl-input-phone" required value="${esc(defaultPhone)}" placeholder="09xx xxx xxx" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#16A34A]">
        </div>
        <div>
          <label class="block text-xs font-bold text-[#475569] mb-1">Ghi chú thêm</label>
          <input type="text" id="wl-input-note" value="Đăng ký chờ slot ${esc(slotTime)}" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#16A34A]">
        </div>
        <div id="wl-error-msg" class="hidden text-xs font-semibold text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200"></div>
        <div class="pt-2 flex justify-end gap-2">
          <button type="button" id="wl-cancel-btn" class="px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50">Đóng</button>
          <button type="submit" id="wl-submit-btn" class="btn-base btn-primary px-5 py-2 text-xs font-bold shadow">Xác nhận chờ sân</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);
  const closeFn = () => overlay.remove();
  overlay.querySelector('#wl-close-btn').addEventListener('click', closeFn);
  overlay.querySelector('#wl-cancel-btn').addEventListener('click', closeFn);

  overlay.querySelector('#wl-modal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const customerName = overlay.querySelector('#wl-input-name').value.trim();
    const phone = overlay.querySelector('#wl-input-phone').value.trim();
    const note = overlay.querySelector('#wl-input-note').value.trim();
    const errBox = overlay.querySelector('#wl-error-msg');
    const submitBtn = overlay.querySelector('#wl-submit-btn');

    if (!customerName || !phone) {
      errBox.textContent = 'Vui lòng nhập đầy đủ họ tên và số điện thoại.';
      errBox.classList.remove('hidden');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang gửi...';
    errBox.classList.add('hidden');

    const getRel = window.SanBongApp?.getRelativePath || (p => '/' + p.replace(/^\//, ''));
    const headers = window.SanBongApp?.getAuthFetchHeaders
      ? window.SanBongApp.getAuthFetchHeaders()
      : { 'Content-Type': 'application/json' };

    try {
      if (window.SanBongApp?.ensureCsrfToken) {
        await window.SanBongApp.ensureCsrfToken();
      }
      const headers = window.SanBongApp?.getAuthFetchHeaders
        ? window.SanBongApp.getAuthFetchHeaders()
        : { 'Content-Type': 'application/json' };

      const res = await fetch(getRel('api/bookings.php?action=join_waitlist'), {
        method: 'POST',
        headers,
        credentials: 'same-origin',
        body: JSON.stringify({
          action: 'join_waitlist',
          pitch_id: selectedPitchId,
          booking_date: selectedDate,
          slot_id: slotId,
          customer_name: customerName,
          phone,
          note: note || `Đăng ký chờ slot ${slotTime}`
        })
      });
      const tokenHeader = res.headers ? res.headers.get('X-CSRF-Token') : null;
      if (tokenHeader && window.SanBongHelpers?.setCsrfToken) {
        window.SanBongHelpers.setCsrfToken(tokenHeader);
      }
      const json = await res.json();
      if (json?.csrf_token && window.SanBongHelpers?.setCsrfToken) {
        window.SanBongHelpers.setCsrfToken(json.csrf_token);
      }
      if (json.success) {
        if (window.SanBongApp?.showToast) {
          window.SanBongApp.showToast(json.message, 'success', 4000);
        }
        closeFn();
      } else {
        errBox.textContent = json.message || 'Không thể đăng ký danh sách chờ.';
        errBox.classList.remove('hidden');
      }
    } catch (err) {
      errBox.textContent = 'Lỗi kết nối khi đăng ký danh sách chờ.';
      errBox.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Xác nhận chờ sân';
    }
  });
};
