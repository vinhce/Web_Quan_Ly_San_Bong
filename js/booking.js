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
    const url = getRel(`api/bookings.php?action=booked_slots&pitch_id=${encodeURIComponent(pitchId)}&date=${encodeURIComponent(dateStr)}&_t=${Date.now()}`);
    const res = await fetch(url, { cache: 'no-store', credentials: 'same-origin' });
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
      const sStart = String(s.start || (s.time ? s.time.split('-')[0] : '') || '').trim();
      const sEnd = String(s.end || (s.time ? s.time.split('-')[1] : '') || '').trim();

      const foundSrv = serverList.find(b => {
        if ((b.slotId || b.slot_id) === s.id || (b.slotTime || b.slot_time) === s.time) {
          return true;
        }
        const bStart = String(b.startTime || b.start_time || (b.slotTime || b.slot_time || '').split('-')[0] || '').trim();
        const bEnd = String(b.endTime || b.end_time || (b.slotTime || b.slot_time || '').split('-')[1] || '').trim();
        if (sStart && sEnd && bStart && bEnd) {
          return (sStart < bEnd && sEnd > bStart);
        }
        return false;
      });

      if (foundSrv) {
        if (s.status === 'Trống') {
          s.status = foundSrv.status === 'Đang đá' ? 'Đang đá' : 'Đã đặt';
          s.isOverlapping = (foundSrv.slotId || foundSrv.slot_id) !== s.id;
        }
        const bPayStatus = foundSrv.paymentStatus || foundSrv.payment_status || '';
        const bStatus = foundSrv.status || '';
        s.paymentStatus = bPayStatus;
        s.isDeposited = Boolean(
          foundSrv.isDeposited ||
          bPayStatus.includes('Đã cọc') ||
          ['Đã cọc 30%', 'Đã cọc 60%', 'Đã cọc', 'Đã thanh toán đủ', 'Đã thanh toán 100%', 'Còn thiếu phần phát sinh'].includes(bPayStatus) ||
          ['Đang đá', 'completed', 'Hoàn thành', 'Đã đá - chưa tất toán'].includes(bStatus)
        );
        s.isOwner = Boolean(foundSrv.isOwner);

        // Client-side fallback check for owner
        const curUser = window.SanBongApp?.SanBongDB?.getUser ? window.SanBongApp.SanBongDB.getUser() : null;
        if (!s.isOwner && curUser) {
          const userPhone = String(curUser.phone || curUser.username || '').replace(/[^0-9]/g, '');
          const srvPhone = String(foundSrv.phone || '').replace(/[^0-9]/g, '');
          if (userPhone && srvPhone && userPhone === srvPhone) {
            s.isOwner = true;
          }
        }
        if (!s.isOwner && foundSrv.code) {
          try {
            const myBookings = JSON.parse(localStorage.getItem('sb_bookings_v1') || '[]');
            if (myBookings.some(b => b.code === foundSrv.code)) {
              s.isOwner = true;
            }
          } catch (e) {}
        }
      }
    });
  }

  // Bổ sung kiểm tra local bookings cho s.booking
  const curUserObj = window.SanBongApp?.SanBongDB?.getUser ? window.SanBongApp.SanBongDB.getUser() : null;
  const userPhoneClean = curUserObj ? String(curUserObj.phone || curUserObj.username || '').replace(/[^0-9]/g, '') : '';
  const myLocalCodes = (() => {
    try {
      const list = JSON.parse(localStorage.getItem('sb_bookings_v1') || '[]');
      return Array.isArray(list) ? list.map(b => b.code) : [];
    } catch (e) {
      return [];
    }
  })();

  slotsWithStatus.forEach(s => {
    if (s.booking && !s.isDeposited) {
      const bPayStatus = s.booking.paymentStatus || s.booking.payment_status || '';
      const bStatus = s.booking.status || '';
      if (bPayStatus.includes('Đã cọc') || ['Đã cọc 30%', 'Đã cọc 60%', 'Đã cọc', 'Đã thanh toán đủ', 'Đã thanh toán 100%', 'Còn thiếu phần phát sinh'].includes(bPayStatus) || ['Đang đá', 'completed', 'Hoàn thành', 'Đã đá - chưa tất toán'].includes(bStatus)) {
        s.isDeposited = true;
        const bPhone = String(s.booking.phone || '').replace(/[^0-9]/g, '');
        const isMatchedUser = Boolean(userPhoneClean && bPhone && userPhoneClean === bPhone);
        const isMatchedCode = Boolean(s.booking.code && myLocalCodes.includes(s.booking.code) && curUserObj);
        s.isOwner = isMatchedUser || isMatchedCode;
      }
    }
  });
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
  if (!curSelectedObj || curSelectedObj.status === 'Đã đặt' || curSelectedObj.status === 'Khóa' || curSelectedObj.status === 'Đang đá' || curSelectedObj.status === 'Bảo trì' || isSlotPast(curSelectedObj) || curSelectedObj.isDeposited) {
    const firstFree = slotsWithStatus.find(s => s.status === 'Trống' && !isSlotPast(s) && !s.isDeposited);
    selectedSlotId = firstFree ? firstFree.id : '';
  }

  const activeSlotObj = slotsWithStatus.find(s => s.id === selectedSlotId);
  const selStart = activeSlotObj ? String(activeSlotObj.start || (activeSlotObj.time ? activeSlotObj.time.split('-')[0] : '') || '').trim() : '';
  const selEnd = activeSlotObj ? String(activeSlotObj.end || (activeSlotObj.time ? activeSlotObj.time.split('-')[1] : '') || '').trim() : '';

  container.innerHTML = slotsWithStatus.map(s => {
    const isPast = isSlotPast(s);
    const isSelected = s.id === selectedSlotId;
    const isMaint = s.status === 'Bảo trì';
    const isBooked = s.status === 'Đã đặt' || s.status === 'Khóa';
    const isPlaying = s.status === 'Đang đá';
    const isDeposited = Boolean(s.isDeposited);
    const isOwner = Boolean(s.isOwner);

    const sStart = String(s.start || (s.time ? s.time.split('-')[0] : '') || '').trim();
    const sEnd = String(s.end || (s.time ? s.time.split('-')[1] : '') || '').trim();
    const isOverlappingSelected = Boolean(
      activeSlotObj &&
      !isSelected &&
      selStart && selEnd && sStart && sEnd &&
      (sStart < selEnd && sEnd > selStart)
    );

    const safeId = esc(s.id);
    const safeTime = esc(s.time);
    let chipCls = 'bg-white border border-[#16A34A] text-[#0F172A] hover:bg-[#DCFCE7]/30';
    let statusBadge = '<span class="text-[11px] text-[#16A34A] font-semibold">Còn trống</span>';
    let chipTitle = '';

    if (isPast) {
      chipCls = 'bg-slate-100 border border-slate-200 text-slate-400 opacity-50 cursor-not-allowed';
      statusBadge = `<span class="text-[11px] font-bold text-slate-400">⏱️ Đã qua</span>`;
      chipTitle = 'Khung giờ này đã qua';
    } else if (isMaint) {
      chipCls = 'hatch-slate border border-[#CBD5E1] text-[#64748B] cursor-not-allowed';
      statusBadge = `<span class="text-[11px] font-bold text-[#475569]">🛠️ Bảo trì</span>`;
      chipTitle = esc(s.maintenanceReason || 'Sân đang bảo trì trong khung giờ này');
    } else if (isPlaying) {
      chipCls = 'bg-[#DBEAFE] border border-[#2563EB] text-[#2563EB] cursor-not-allowed';
      statusBadge = `<span class="text-[11px] font-bold">Đang đá</span>`;
      chipTitle = 'Sân đang có trận đấu diễn ra';
    } else if (isBooked && isDeposited) {
      if (isOwner) {
        // Chính tài khoản đã chuyển cọc: ghi là "Đã cọc"
        chipCls = 'bg-[#DCFCE7]/80 border-2 border-[#16A34A] text-[#15803D] cursor-default shadow-xs';
        statusBadge = `<span class="text-[11px] font-extrabold text-[#15803D] flex items-center justify-center gap-1"><span>✓</span><span>Đã cọc</span></span>`;
        chipTitle = 'Bạn đã đặt cọc thành công khung giờ này';
      } else {
        // Người khác nhìn vào: ghi là "Đã có người cọc"
        chipCls = 'bg-slate-100 border border-slate-300 text-slate-500 cursor-not-allowed opacity-80';
        statusBadge = `<span class="text-[11px] font-bold text-slate-600 flex items-center justify-center gap-1"><span>🔒</span><span>Đã có người cọc</span></span>`;
        chipTitle = 'Khung giờ này đã có người đặt cọc';
      }
    } else if (isSelected) {
      chipCls = 'bg-[#16A34A] text-white border-[#16A34A] shadow-md';
      statusBadge = `<span class="text-[11px] text-white font-bold">✓ Đang chọn</span>`;
      chipTitle = 'Khung giờ bạn đang chọn';
    } else if (isBooked) {
      chipCls = 'bg-[#FEF3C7]/40 border border-[#F59E0B] text-[#B45309] hover:bg-[#FEF3C7] cursor-pointer';
      statusBadge = `<span class="text-[11px] font-bold text-[#B45309]">🔔 Đăng ký chờ</span>`;
      chipTitle = 'Khung giờ đã có người giữ chỗ. Nhấn để đăng ký danh sách chờ!';
    } else if (isOverlappingSelected) {
      chipCls = 'bg-slate-100 border border-slate-300 text-slate-400 opacity-60 cursor-not-allowed select-none';
      statusBadge = `<span class="text-[11px] font-bold text-slate-500">Trùng giờ</span>`;
      chipTitle = `Trùng giờ với ca ${activeSlotObj.time} đang chọn`;
    }

    let clickAttr = '';
    if (isPast || isPlaying || isMaint || isOverlappingSelected) {
      clickAttr = '';
    } else if (isBooked && isDeposited) {
      if (isOwner) {
        clickAttr = `onclick="window.SanBongApp?.showToast ? window.SanBongApp.showToast('Bạn đã đặt cọc thành công khung giờ này!', 'success', 3000) : null"`;
      } else {
        // Đã có người cọc thành công: Khóa cứng, không mở modal danh sách chờ (không ấy được)
        clickAttr = '';
      }
    } else if (isBooked) {
      // Chỉ khi chưa cọc (đang giữ chỗ) và ca chưa qua giờ thì mới mở danh sách chờ
      clickAttr = `onclick="openWaitlistPrompt(this.getAttribute('data-slot-id'), this.getAttribute('data-slot-time'))"`;
    } else {
      clickAttr = `onclick="selectSlot(this.getAttribute('data-slot-id'))"`;
    }
    return `
      <div data-slot-id="${safeId}" data-slot-time="${safeTime}" ${clickAttr} class="slot-chip p-3 rounded-xl text-center flex flex-col justify-between ${chipCls}" title="${chipTitle}">
        <div class="text-xs sm:text-sm font-extrabold">${safeTime}</div>
        <div class="mt-1">${statusBadge}</div>
      </div>
    `;
  }).join('');
  const badge = document.getElementById('selected-slot-badge');
  if (badge) {
    if (activeSlotObj) {
      badge.textContent = `${activeSlotObj.time} (Ca 2 tiếng)`;
      badge.className = 'px-3 py-1 rounded-full bg-[#DCFCE7] text-xs font-bold text-[#16A34A] shrink-0 whitespace-nowrap self-start sm:self-auto';
    } else {
      badge.textContent = 'Chưa chọn giờ';
      badge.className = 'px-3 py-1 rounded-full bg-[#F1F5F9] text-xs font-bold text-[#64748B] shrink-0 whitespace-nowrap self-start sm:self-auto';
    }
  }
  if (!skipServerFetch) {
    fetchServerBookedSlots(selectedPitchId, selectedDate).then(entry => {
      if (entry) {
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
    if (typeof window.renderVoucherQuickList === 'function') window.renderVoucherQuickList();
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
  if (typeof window.renderVoucherQuickList === 'function') window.renderVoucherQuickList();
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
let _serverQuoteTimer = null;
let _serverQuoteSeq = 0;

function initBookingWaterRedemption() {
  const db = window.SanBongApp?.SanBongDB;
  const user = db && db.getUser ? db.getUser() : null;
  const isLoggedIn = Boolean(user && user.id && user.role !== 'guest' && !user.is_guest);
  const sysCfg = db && db.getSystemConfig ? db.getSystemConfig() : null;
  const bottleCost = Math.max(1, Number(sysCfg?.loyaltyBottleCostPoints || 100) || 100);
  const userPoints = isLoggedIn ? Math.max(0, Number(user.points || 0)) : 0;
  const maxBottles = isLoggedIn ? Math.min(20, Math.floor(userPoints / bottleCost)) : 0;

  if (!isLoggedIn || Number(window.bookingRedeemedBottles || 0) > maxBottles) {
    window.bookingRedeemedBottles = Math.min(maxBottles, Math.max(0, Number(window.bookingRedeemedBottles || 0)));
  }

  const ptsEl = document.getElementById('booking-user-points');
  const maxEl = document.getElementById('booking-max-bottles');
  const cntEl = document.getElementById('booking-redeemed-bottles-count');
  const sumEl = document.getElementById('booking-redeem-summary');
  const dedEl = document.getElementById('booking-points-to-deduct');
  const recEl = document.getElementById('booking-bottles-received');
  const subBtn = document.getElementById('booking-btn-sub-water');
  const addBtn = document.getElementById('booking-btn-add-water');
  const ctrlBox = document.getElementById('booking-redeem-controls');
  const guestNote = document.getElementById('booking-redeem-guest-note');

  const syncWaterUI = () => {
    const qty = Math.min(maxBottles, Math.max(0, Number(window.bookingRedeemedBottles || 0)));
    window.bookingRedeemedBottles = qty;
    if (ptsEl) ptsEl.textContent = `${userPoints} điểm`;
    if (maxEl) maxEl.textContent = `${maxBottles} chai`;
    if (cntEl) cntEl.textContent = String(qty);
    if (subBtn) subBtn.disabled = (!isLoggedIn || qty <= 0);
    if (addBtn) addBtn.disabled = (!isLoggedIn || qty >= maxBottles);
    if (ctrlBox) ctrlBox.classList.toggle('hidden', !isLoggedIn);
    if (guestNote) guestNote.classList.toggle('hidden', isLoggedIn);
    if (sumEl) {
      if (isLoggedIn && qty > 0) {
        sumEl.classList.remove('hidden');
        if (dedEl) dedEl.textContent = String(qty * bottleCost);
        if (recEl) recEl.textContent = String(qty);
      } else {
        sumEl.classList.add('hidden');
      }
    }
  };

  if (subBtn && !subBtn._bound) {
    subBtn._bound = true;
    subBtn.addEventListener('click', () => {
      if (Number(window.bookingRedeemedBottles || 0) > 0) {
        window.bookingRedeemedBottles = Number(window.bookingRedeemedBottles) - 1;
        syncWaterUI();
        if (typeof saveCurrentBookingDraft === 'function') saveCurrentBookingDraft();
      }
    });
  }
  if (addBtn && !addBtn._bound) {
    addBtn._bound = true;
    addBtn.addEventListener('click', () => {
      const latestUser = db && db.getUser ? db.getUser() : null;
      const latestCost = Math.max(1, Number(db?.getSystemConfig?.()?.loyaltyBottleCostPoints || 100) || 100);
      const latestMax = (latestUser && latestUser.id) ? Math.min(20, Math.floor(Number(latestUser.points || 0) / latestCost)) : 0;
      if (Number(window.bookingRedeemedBottles || 0) < latestMax) {
        window.bookingRedeemedBottles = Number(window.bookingRedeemedBottles || 0) + 1;
        syncWaterUI();
        if (typeof saveCurrentBookingDraft === 'function') saveCurrentBookingDraft();
      }
    });
  }

  syncWaterUI();
}
window.initBookingWaterRedemption = initBookingWaterRedemption;

function applyQuoteToSummaryUI(quote, weeks) {
  if (!quote) return;
  const elPitch = document.getElementById('summary-pitch-price');
  const elSrv = document.getElementById('summary-services-price');
  const elDisc = document.getElementById('summary-discount-price');
  const elTot = document.getElementById('summary-total-price');
  const elDep = document.getElementById('summary-deposit-price');
  const elRem = document.getElementById('summary-remaining-price');

  const rawPitchAmt = Number(quote.rawPitchPriceFull ?? quote.pitchPrice ?? 0);
  const srvAmt = Number(quote.servicesTotal ?? quote.serviceTotal ?? 0);
  const totalDisc = Number(quote.discountAmount ?? ((quote.monthlyDiscountAmount || 0) + (quote.voucherDiscountAmount || 0)));
  if (elPitch) {
    elPitch.textContent = weeks > 1
      ? `${window.SanBongApp.formatVND(rawPitchAmt)} (${weeks} buổi)`
      : window.SanBongApp.formatVND(rawPitchAmt);
  }
  if (elSrv) elSrv.textContent = window.SanBongApp.formatVND(srvAmt);
  if (elDisc) elDisc.textContent = `-${window.SanBongApp.formatVND(totalDisc)}`;
  if (elTot) elTot.textContent = window.SanBongApp.formatVND(quote.totalPrice);
  if (elDep) elDep.textContent = window.SanBongApp.formatVND(quote.depositAmount);
  if (elRem) elRem.textContent = window.SanBongApp.formatVND(quote.remainingAmount);

  const depRatePct = String(quote.depositRate ?? quote.depositRatePct ?? (weeks > 1 ? 60 : 30));
  const depPctEl = document.getElementById('summary-deposit-rate-pct');
  if (depPctEl) depPctEl.textContent = depRatePct;
}

function updateBillSummary() {
  const db = window.SanBongApp.SanBongDB;
  const pitch = db.getPitchById(selectedPitchId);
  if (!pitch) return;
  initBookingWaterRedemption();
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
      const totalDisc = Number(calc.totalDiscount ?? ((calc.monthlyDiscountAmount || 0) + (calc.discountAmount || 0)));
      elDisc.textContent = `-${window.SanBongApp.formatVND(totalDisc)}`;
    }
    if (elTot) elTot.textContent = window.SanBongApp.formatVND(calc.totalPrice);
    if (elDep) elDep.textContent = window.SanBongApp.formatVND(calc.depositAmount);
    if (elRem) elRem.textContent = window.SanBongApp.formatVND(calc.remainingAmount);

    const isMonthly = (bookingMode === 'monthly');
    const depPctEl = document.getElementById('summary-deposit-rate-pct');
    const depTitleEl = document.getElementById('summary-deposit-title');
    const depSubtextEl = document.getElementById('summary-deposit-subtext');
    const remLabelEl = document.getElementById('summary-remaining-label');
    const policyAgreeTextEl = document.getElementById('policy-agree-text');

    if (isMonthly) {
      if (depPctEl) depPctEl.textContent = '60';
      if (depTitleEl) depTitleEl.innerHTML = 'Tiền cọc giữ lịch cố định (<span id="summary-deposit-rate-pct">60</span>%)';
      if (depSubtextEl) depSubtextEl.textContent = 'Chuyển khoản cọc 60% giữ lịch';
      if (remLabelEl) remLabelEl.textContent = 'Còn lại ra quầy thu tiền ở sân báo lại để sắp xếp:';
      if (policyAgreeTextEl) policyAgreeTextEl.textContent = 'Tôi đồng ý với chính sách cọc gói cố định (chuyển cọc 60% giữ lịch, 40% còn lại ra quầy thu tiền ở sân báo lại để sắp xếp).';
    } else {
      const sysCfg = db.getSystemConfig ? db.getSystemConfig() : null;
      const singleRate = String(Math.max(10, Math.min(100, Number(sysCfg?.depositRate) || 30)));
      if (depPctEl) depPctEl.textContent = singleRate;
      if (depTitleEl) depTitleEl.innerHTML = `Tiền cọc giữ sân (<span id="summary-deposit-rate-pct">${singleRate}</span>%)`;
      if (depSubtextEl) depSubtextEl.textContent = 'Chuyển khoản ngân hàng 24/7';
      if (remLabelEl) remLabelEl.textContent = 'Còn lại trả tại sân khi đá:';
      if (policyAgreeTextEl) policyAgreeTextEl.textContent = `Tôi đồng ý với chính sách cọc (giữ chỗ tối đa 15 phút, quá hạn hủy do vắng mặt & tịch thu cọc ${singleRate}%).`;
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

  // T3-01: Lấy báo giá chuẩn từ server để bảo đảm 100% khớp giữa giao diện & Checkout
  if (selectedPitchId && selectedSlotId && selectedDate) {
    clearTimeout(_serverQuoteTimer);
    const seq = ++_serverQuoteSeq;
    _serverQuoteTimer = setTimeout(async () => {
      try {
        if (window.SanBongApp?.ensureCsrfToken) {
          await window.SanBongApp.ensureCsrfToken();
        }
        const getRel = window.SanBongApp?.getRelativePath || (p => '/' + p.replace(/^\//, ''));
        const headers = window.SanBongApp?.getAuthFetchHeaders
          ? window.SanBongApp.getAuthFetchHeaders()
          : { 'Content-Type': 'application/json' };
        const res = await fetch(getRel('api/bookings.php?action=quote'), {
          method: 'POST',
          credentials: 'same-origin',
          headers,
          body: JSON.stringify({
            action: 'quote',
            pitchId: selectedPitchId,
            date: selectedDate,
            slotId: selectedSlotId,
            weeksCount: weeks,
            bookingMode: bookingMode,
            services: appliedServices,
            voucherCode: appliedVoucherCode,
            redeemedBottles: Number(window.bookingRedeemedBottles || 0)
          })
        });
        const tokenHeader = res.headers ? res.headers.get('X-CSRF-Token') : null;
        if (tokenHeader && window.SanBongHelpers?.setCsrfToken) {
          window.SanBongHelpers.setCsrfToken(tokenHeader);
        }
        if (seq !== _serverQuoteSeq || !res.ok) return;
        const json = await res.json().catch(() => null);
        if (json?.csrf_token && window.SanBongHelpers?.setCsrfToken) {
          window.SanBongHelpers.setCsrfToken(json.csrf_token);
        }
        if (json && json.success && json.data) {
          window._lastServerQuote = json.data;
          applyQuoteToSummaryUI(json.data, weeks);
        }
      } catch (e) {}
    }, 150);
  }
}

function saveCurrentBookingDraft() {
  const db = window.SanBongApp?.SanBongDB;
  const user = db ? db.getUser() : null;
  const weeks = bookingMode === 'monthly' ? monthlyWeeks : 1;
  const promo = db ? db.getPackagePromotion(weeks) : null;
  const isFriend = Boolean(window.isBookingForFriend);

  let name = '';
  let phone = '';

  if (user && !isFriend) {
    name = user.full_name || user.name || '';
    phone = user.phone || document.getElementById('user-missing-phone')?.value.trim() || '';
  } else {
    name = document.getElementById('cust-name')?.value.trim() || '';
    phone = document.getElementById('cust-phone')?.value.trim() || '';
  }
  let note = document.getElementById('cust-note')?.value.trim() || '';

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
    redeemedBottles: Number(window.bookingRedeemedBottles || 0),
    customerName: name,
    phone: phone,
    note: note,
    is_booking_for_friend: isFriend,
    policy_agree: Boolean(document.getElementById('policy-agree')?.checked)
  };
  sessionStorage.setItem('sb_booking_draft', JSON.stringify(bookingDraft));
  return bookingDraft;
}
window.saveCurrentBookingDraft = saveCurrentBookingDraft;

function proceedToCheckout() {
  if (window._isProceedingCheckout) return;
  window._isProceedingCheckout = true;
  setTimeout(() => { window._isProceedingCheckout = false; }, 1000);

  // Xóa các thông báo lỗi cũ dưới từng ô
  ['cust-name-error', 'cust-phone-error', 'user-missing-phone-error', 'cust-note-error'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.classList.add('hidden'); }
  });
  ['cust-name', 'cust-phone', 'user-missing-phone', 'cust-note'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('border-rose-500', 'ring-2', 'ring-rose-100');
  });
  const slotsCont = document.getElementById('slots-container');
  if (slotsCont) slotsCont.classList.remove('ring-2', 'ring-rose-500', 'ring-offset-2', 'ring-amber-400');
  const agreeParent = document.getElementById('policy-agree')?.parentElement;
  if (agreeParent) agreeParent.classList.remove('text-rose-600', 'font-bold');

  if (isCurrentPhoneBlacklisted) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('SĐT này đang bị khóa đặt sân. Vui lòng liên hệ quản lý sân.', 'error');
    }
    return;
  }

  // BƯỚC 1: Kiểm tra bắt buộc chọn khung giờ và tick đồng ý chính sách cọc & bảo mật
  let firstInvalidEl = null;

  if (!selectedSlotId) {
    if (slotsCont) {
      slotsCont.classList.add('ring-2', 'ring-rose-500', 'ring-offset-2');
      if (!firstInvalidEl) firstInvalidEl = slotsCont;
    }
  }

  const agree = Boolean(document.getElementById('policy-agree')?.checked);
  if (!agree) {
    const agreeEl = document.getElementById('policy-agree');
    if (agreeParent) {
      agreeParent.classList.add('text-rose-600', 'font-bold');
    }
    if (!firstInvalidEl) firstInvalidEl = agreeEl;
  }

  // NẾU CHƯA CHỌN KHUNG GIỜ HOẶC CHƯA TICK Ô ĐỒNG Ý: TUYỆT ĐỐI KHÔNG CHUYỂN TRANG
  if (!selectedSlotId || !agree) {
    if (window.SanBongApp?.showToast) {
      const msg = !selectedSlotId
        ? 'Vui lòng chọn khung giờ thi đấu trước khi tiếp tục.'
        : 'Vui lòng tích chọn đồng ý với chính sách cọc trước khi tiếp tục.';
      window.SanBongApp.showToast(msg, 'warning');
    }
    if (firstInvalidEl) {
      firstInvalidEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (typeof firstInvalidEl.focus === 'function') {
        firstInvalidEl.focus();
      }
    }
    return;
  }

  const db = window.SanBongApp?.SanBongDB;
  const user = db ? db.getUser() : null;
  const isLoggedIn = Boolean(user && (user.id || user.username) && user.role !== 'guest' && !user.is_guest);
  const isOperator = Boolean(isLoggedIn && ['admin', 'manager', 'staff'].includes(String(user.role || '').toLowerCase()));

  if (isOperator) {
    const portalQuickUrl = window.SanBongHelpers?.getRelativePath ? window.SanBongHelpers.getRelativePath('portal-admin/?tab=quick-booking') : '/portal-admin/?tab=quick-booking';
    if (window.SanBongApp?.showModal) {
      window.SanBongApp.showModal({
        title: 'Tài khoản vận hành sân',
        message: 'Tài khoản Quản trị / Nhân sự không đặt sân qua luồng khách hàng. Vui lòng sử dụng mục Đặt sân tại quầy trong Cổng Quản Trị.',
        type: 'warning',
        confirmText: 'Mở Đặt sân tại quầy',
        cancelText: 'Đóng',
        onConfirm: () => { window.location.href = portalQuickUrl; }
      });
    } else if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Tài khoản vận hành vui lòng đặt sân tại Cổng Quản Trị.', 'warning');
    }
    return;
  }

  // BƯỚC 2: Nếu chưa đăng nhập bất kỳ tài khoản nào (đã chọn giờ & đã tick điều khoản):
  // Lưu draft và CHUYỂN THẲNG VÀO TRANG ĐĂNG NHẬP (/login?redirect=checkout)
  if (!isLoggedIn) {
    saveCurrentBookingDraft();
    sessionStorage.setItem('sb_login_notice', 'Vui lòng đăng nhập để tiếp tục đặt sân & quét mã QR cọc');
    const checkoutBtn = document.getElementById('proceed-checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.disabled = true;
      checkoutBtn.classList.add('opacity-70', 'cursor-not-allowed');
      checkoutBtn.textContent = 'Đang chuyển sang đăng nhập...';
    }
    const loginUrl = window.SanBongHelpers?.getRelativePath ? window.SanBongHelpers.getRelativePath('login?redirect=checkout') : '/login?redirect=checkout';
    window.location.href = loginUrl;
    return;
  }

  // BƯỚC 3: Nếu đã đăng nhập: Kiểm tra tiếp thông tin người đặt
  const isFriend = Boolean(window.isBookingForFriend);
  const missingFields = [];

  let name = '';
  let phone = '';

  if (!isFriend) {
    name = user.full_name || user.name || '';
    phone = user.phone || '';
    if (!phone) {
      const missingInput = document.getElementById('user-missing-phone');
      phone = missingInput?.value.trim() || '';
      if (!/^0\d{9}$/.test(phone)) {
        missingFields.push('Số điện thoại (10 chữ số)');
        const errEl = document.getElementById('user-missing-phone-error');
        if (errEl) { errEl.textContent = 'Hồ sơ chưa có SĐT. Vui lòng nhập số điện thoại hợp lệ (10 chữ số).'; errEl.classList.remove('hidden'); }
        missingInput?.classList.add('border-rose-500', 'ring-2', 'ring-rose-100');
        if (!firstInvalidEl) firstInvalidEl = missingInput;
      }
    }
  } else {
    const nameInput = document.getElementById('cust-name');
    const phoneInput = document.getElementById('cust-phone');
    name = nameInput?.value.trim() || '';
    phone = phoneInput?.value.trim() || '';

    if (name.length < 2 || name.length > 60) {
      missingFields.push('Họ tên người được đặt hộ (2-60 ký tự)');
      const errEl = document.getElementById('cust-name-error');
      if (errEl) {
        errEl.textContent = 'Họ tên người được đặt hộ phải từ 2 đến 60 ký tự.';
        errEl.classList.remove('hidden');
      }
      nameInput?.classList.add('border-rose-500', 'ring-2', 'ring-rose-100');
      if (!firstInvalidEl) firstInvalidEl = nameInput;
    }

    if (!/^0\d{9}$/.test(phone)) {
      missingFields.push('Số điện thoại người được đặt hộ (10 chữ số bắt đầu bằng 0)');
      const errEl = document.getElementById('cust-phone-error');
      if (errEl) {
        errEl.textContent = 'Số điện thoại người được đặt hộ không hợp lệ (cần đúng 10 chữ số bắt đầu bằng 0).';
        errEl.classList.remove('hidden');
      }
      phoneInput?.classList.add('border-rose-500', 'ring-2', 'ring-rose-100');
      if (!firstInvalidEl) firstInvalidEl = phoneInput;
    }
  }

  let note = document.getElementById('cust-note')?.value.trim() || '';
  if (note.length > 300) {
    missingFields.push('Ghi chú (tối đa 300 ký tự)');
    const errEl = document.getElementById('cust-note-error');
    if (errEl) { errEl.textContent = 'Ghi chú tối đa 300 ký tự.'; errEl.classList.remove('hidden'); }
    const noteEl = document.getElementById('cust-note');
    noteEl?.classList.add('border-rose-500', 'ring-2', 'ring-rose-100');
    if (!firstInvalidEl) firstInvalidEl = noteEl;
  }

  if (missingFields.length > 0) {
    if (firstInvalidEl) {
      firstInvalidEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (typeof firstInvalidEl.focus === 'function') {
        firstInvalidEl.focus();
      }
    }
    const singleMsg = 'Vui lòng hoàn thiện: ' + missingFields.join(', ') + '.';
    // Bỏ popup toast đỏ theo yêu cầu UI tối giản (chỉ cuộn & highlight viền đỏ ô lỗi)
    return;
  }

  const weeks = bookingMode === 'monthly' ? monthlyWeeks : 1;
  const promo = db ? db.getPackagePromotion(weeks) : null;
  if (weeks > 1) {
    const dateLabels = monthlyDates.map(d => d.label).join(', ');
    const giftNote = promo ? ` [Tài trợ mỗi trận: ${promo.giftSummary}]` : '';
    note = (note ? note + ' | ' : '') + `[Gói cố định ${weeks} tuần: ${dateLabels}]${giftNote}`;
  }

  const newIdemKey = (window.crypto && typeof window.crypto.randomUUID === 'function')
    ? window.crypto.randomUUID()
    : ('sb-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10));

  const prevHoldCode = sessionStorage.getItem('sb_active_hold_code');
  if (prevHoldCode && window.SanBongApp?.SanBongAPI?.requestJSON) {
    sessionStorage.removeItem('sb_active_hold_code');
    window.SanBongApp.SanBongAPI.requestJSON('api/bookings.php?action=release_draft_hold', { action: 'release_draft_hold', code: prevHoldCode }).catch(() => {});
  }

  const bookingDraft = {
    idempotencyKey: newIdemKey,
    pitchId: selectedPitchId,
    date: selectedDate,
    slotId: selectedSlotId,
    bookingMode: bookingMode,
    weeksCount: weeks,
    monthlyDates: monthlyDates,
    packagePromotion: promo,
    services: appliedServices,
    voucherCode: appliedVoucherCode,
    redeemedBottles: Number(window.bookingRedeemedBottles || 0),
    serverQuote: window._lastServerQuote || null,
    customerName: name,
    phone: phone,
    note: note,
    is_booking_for_friend: isFriend,
    privacy_consent: true,
    turnstile_token: bookingTurnstileToken || ''
  };

  sessionStorage.setItem('sb_booking_draft', JSON.stringify(bookingDraft));

  const checkoutBtn = document.getElementById('proceed-checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.disabled = true;
    checkoutBtn.classList.add('opacity-70', 'cursor-not-allowed');
    checkoutBtn.textContent = 'Đang chuyển sang thanh toán...';
  }

  window.location.href = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath('checkout') : '/checkout';
}

window.openWaitlistPrompt = function(slotId, slotTime) {
  const todayStr = window.SanBongApp?.getLocalTodayISO ? window.SanBongApp.getLocalTodayISO() : new Date().toISOString().split('T')[0];
  const nowHHMM = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());

  // Chặn đăng ký chờ cho ngày trong quá khứ
  if (selectedDate < todayStr) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Ngày này đã qua, không thể đăng ký danh sách chờ.', 'warning', 3000);
    return;
  }

  // Chặn đăng ký chờ cho khung giờ đã qua trong ngày hôm nay
  const slotStart = slotTime ? slotTime.split('-')[0].trim() : '';
  if (selectedDate === todayStr && slotStart && slotStart <= nowHHMM) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Khung giờ này đã qua, không thể đăng ký danh sách chờ.', 'warning', 3000);
    return;
  }

  // Chặn đăng ký chờ khi slot đã cọc thành công hoặc đang đá
  const db = window.SanBongApp?.SanBongDB;
  if (db && selectedPitchId) {
    const daySlots = db.getSlotsWithStatus(selectedPitchId, selectedDate);
    const target = daySlots.find(s => s.id === slotId);
    if (target && (target.isDeposited || target.status === 'Đang đá' || target.status === 'Bảo trì')) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Khung giờ này đã có người đặt cọc thành công, không nhận đăng ký chờ.', 'warning', 3000);
      return;
    }
  }

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
      if (res.status === 401) {
        closeFn();
        if (window.SanBongApp?.handleUnauthorizedSession) {
          window.SanBongApp.handleUnauthorizedSession('booking');
        } else {
          window.location.replace(getRel('login?redirect=booking&expired=1'));
        }
        return;
      }
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

// Tự động đồng bộ trạng thái cọc giữa các tài khoản và thiết bị khác nhau mỗi 6 giây
if (!window._bookingAutoSyncTimer) {
  window._bookingAutoSyncTimer = setInterval(() => {
    if (document.visibilityState === 'visible' && window.selectedPitchId && window.selectedDate) {
      fetchServerBookedSlots(window.selectedPitchId, window.selectedDate).then(entry => {
        if (entry) renderSlots(true);
      });
    }
  }, 6000);

  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && window.selectedPitchId && window.selectedDate) {
      fetchServerBookedSlots(window.selectedPitchId, window.selectedDate).then(entry => {
        if (entry) renderSlots(true);
      });
    }
  });
}

