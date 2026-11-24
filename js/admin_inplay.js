// Điều hành trận đấu đang chơi & thu tiền còn lại (Inline Timeline & Modal)
let activeInPlayCode = '';
const inPlayRemoteBookingsMap = new Map();

function inPlayFmtVND(amount) {
  if (window.SanBongApp?.formatVND) {
    return window.SanBongApp.formatVND(amount);
  }
  return Number(amount || 0).toLocaleString('vi-VN') + 'đ';
}

function normalizeInPlayStatus(rawStatus) {
  const st = String(rawStatus || 'Đang đá').trim();
  if (st === 'Vắng mặt (No-Show)' || st.includes('No-Show')) return 'Khách chưa đến';
  if (st.toLowerCase() === 'completed') return 'Hoàn thành';
  if (st === 'Giữ chỗ (chờ cọc)') return 'Giữ chỗ';
  if (st === 'Chờ cọc' || st === 'Chờ cọc 30%') return 'Chờ duyệt cọc';
  return st || 'Đang đá';
}

function normalizeBookingForInPlayModal(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const code = String(raw.code || '').trim();
  if (!code) return null;

  let services = [];
  if (Array.isArray(raw.services)) {
    services = raw.services;
  } else if (typeof raw.services_json === 'string' && raw.services_json.trim()) {
    try {
      const parsed = JSON.parse(raw.services_json);
      if (Array.isArray(parsed)) services = parsed;
    } catch (e) {}
  }

  const totalPrice = Number(raw.totalPrice ?? raw.total_price ?? 0);
  const depositAmount = Number(raw.depositAmount ?? raw.deposit_amount ?? 0);
  const paidAmount = Number(raw.paidAmount ?? raw.paid_amount ?? 0);
  const rawRemaining = raw.remainingAmount ?? raw.remaining_amount;
  const remainingAmount = (rawRemaining !== undefined && rawRemaining !== null && rawRemaining !== '')
    ? Number(rawRemaining)
    : Math.max(0, totalPrice - paidAmount);

  return {
    ...raw,
    code,
    pitchId: raw.pitchId || raw.pitch_id || '',
    pitchName: raw.pitchName || raw.pitch_name || raw.pitchId || raw.pitch_id || '',
    date: raw.date || raw.booking_date || raw.occurrenceDate || '',
    slotId: raw.slotId || raw.slot_id || '',
    slotTime: raw.slotTime || raw.slot_time || '',
    customerName: raw.customerName || raw.customer_name || 'Khách đặt sân',
    phone: raw.phone || '',
    status: raw.status || 'Đã xác nhận',
    paymentStatus: raw.paymentStatus || raw.payment_status || 'Chờ duyệt cọc',
    paymentMethod: raw.paymentMethod || raw.payment_method || '',
    totalPrice,
    depositAmount,
    paidAmount,
    remainingAmount,
    paidRemainingAmount: Number(raw.paidRemainingAmount ?? raw.paid_remaining_amount ?? 0),
    services,
    weeksCount: Math.max(1, Number(raw.weeksCount ?? raw.weeks_count ?? 1) || 1),
    note: raw.note || ''
  };
}

function cacheInPlayFallbackBooking(raw) {
  const norm = normalizeBookingForInPlayModal(raw);
  if (!norm) return null;
  inPlayRemoteBookingsMap.set(norm.code.toLowerCase(), norm);

  try {
    const db = window.SanBongApp?.SanBongDB;
    const key = window.STORAGE_KEYS?.BOOKINGS || window.SanBongDB?.STORAGE_KEYS?.BOOKINGS || 'sb_bookings_v1';
    const existing = db?.getAllBookings ? db.getAllBookings() : JSON.parse(localStorage.getItem(key) || '[]');
    if (Array.isArray(existing)) {
      const idx = existing.findIndex(b => String(b?.code || '').trim().toLowerCase() === norm.code.toLowerCase());
      if (idx >= 0) {
        existing[idx] = Object.assign({}, existing[idx], norm);
      } else {
        existing.unshift(norm);
      }
      localStorage.setItem(key, JSON.stringify(existing));
    }
  } catch (e) {}

  return norm;
}

function findInPlayBookingSync(code) {
  const db = window.SanBongApp?.SanBongDB;
  const cleanCode = String(code || '').trim();
  const key = cleanCode.toLowerCase();

  if (key) {
    if (db && typeof db.getBookingByCode === 'function') {
      const fromDb = db.getBookingByCode(cleanCode);
      if (fromDb) return normalizeBookingForInPlayModal(fromDb);
    }

    if (inPlayRemoteBookingsMap.has(key)) {
      return inPlayRemoteBookingsMap.get(key);
    }

    const cacheSources = [
      ...(Array.isArray(window.overviewSummaryCache?.todayBookings) ? window.overviewSummaryCache.todayBookings : []),
      ...(Array.isArray(window.overviewSummaryCache?.overdueBookings) ? window.overviewSummaryCache.overdueBookings : [])
    ];
    const fromOverview = cacheSources.find(b => String(b?.code || '').trim().toLowerCase() === key);
    if (fromOverview) {
      return cacheInPlayFallbackBooking(fromOverview);
    }

    if (db && typeof db.getAllBookings === 'function') {
      const all = db.getAllBookings();
      const fromAll = all.find(b => String(b?.code || '').trim().toLowerCase() === key);
      if (fromAll) return normalizeBookingForInPlayModal(fromAll);
    }

    return null;
  }

  const all = db?.getAllBookings ? db.getAllBookings() : [];
  if (activeInPlayCode) {
    const cur = findInPlayBookingSync(activeInPlayCode);
    if (cur) return cur;
  }
  if (all[0]) return normalizeBookingForInPlayModal(all[0]);
  const firstOverview = window.overviewSummaryCache?.todayBookings?.[0] || window.overviewSummaryCache?.overdueBookings?.[0] || null;
  return firstOverview ? cacheInPlayFallbackBooking(firstOverview) : null;
}

async function fetchBookingForInPlayFallback(code) {
  const cleanCode = String(code || '').trim();
  if (!cleanCode || typeof adminFetchJson !== 'function') return null;
  try {
    const res = await adminFetchJson('../api/admin.php?action=all_bookings');
    if (!res?.ok || !Array.isArray(res.data)) return null;
    let matched = null;
    const targetLower = cleanCode.toLowerCase();
    res.data.forEach(item => {
      const norm = normalizeBookingForInPlayModal(item);
      if (!norm) return;
      inPlayRemoteBookingsMap.set(norm.code.toLowerCase(), norm);
      if (norm.code.toLowerCase() === targetLower) {
        matched = cacheInPlayFallbackBooking(norm);
      }
    });
    return matched;
  } catch (e) {
    return null;
  }
}

function renderInlineInPlaySelector() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;
  const allBookings = db.getAllBookings();
  if (!activeInPlayCode && allBookings.length > 0) {
    activeInPlayCode = allBookings[0].code;
  }

  const selectEl = document.getElementById('inline-inplay-select');
  if (selectEl) {
    selectEl.innerHTML = allBookings.map(b => {
      const st = (b.status === 'Vắng mặt (No-Show)' || String(b.status || '').includes('No-Show')) ? 'Khách chưa đến' : (b.status || 'Đã xác nhận');
      const safeCodeHtml = escapeSearchHTML(b.code || '');
      return `<option value="${safeCodeHtml}" ${b.code === activeInPlayCode ? 'selected' : ''}>#${safeCodeHtml} · ${escapeSearchHTML(b.pitchName)} (${escapeSearchHTML(b.slotTime || '')}) · ${escapeSearchHTML(b.customerName)} [${escapeSearchHTML(st)}]</option>`;
    }).join('');
  }

  const quickCardsEl = document.getElementById('inline-inplay-quick-cards');
  if (quickCardsEl) {
    quickCardsEl.innerHTML = allBookings.map(b => {
      const isSel = b.code === activeInPlayCode;
      const st = (b.status === 'Vắng mặt (No-Show)' || String(b.status || '').includes('No-Show')) ? 'Khách chưa đến' : (b.status || 'Đã xác nhận');
      let badgeCls = 'bg-amber-100 text-amber-800 border border-amber-300';
      if (st === 'Đang đá') badgeCls = 'bg-blue-100 text-blue-700 border border-blue-300';
      else if (st === 'Đã xác nhận') badgeCls = 'bg-emerald-100 text-emerald-700 border border-emerald-300';
      else if (st === 'Đã đá - chưa tất toán') badgeCls = 'bg-amber-100 text-amber-800 border border-amber-300';
      else if (st === 'Hoàn thành') badgeCls = 'bg-emerald-600 text-white border border-emerald-700';
      else if (st === 'Khách chưa đến' || st === 'Đã hủy') badgeCls = 'bg-red-100 text-red-700 border border-red-300';
      const safeCodeHtml = escapeSearchHTML(b.code || '');
      return `
        <button type="button" data-code="${safeCodeHtml}" onclick="openInPlaySection(this.getAttribute('data-code'))" class="px-3 py-1.5 rounded-xl border-2 text-left transition-all cursor-pointer inline-flex items-center gap-2 shrink-0 ${isSel ? 'bg-emerald-50 border-[#16A34A] ring-2 ring-[#16A34A]/25 shadow-sm' : 'bg-white border-slate-300 hover:border-slate-400'}">
          <span class="font-mono font-bold text-xs text-[#0F172A] whitespace-nowrap">#${safeCodeHtml}</span>
          <span class="text-xs font-semibold text-[#334155] truncate max-w-[140px]">${escapeSearchHTML(b.customerName)}</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap shrink-0 ${badgeCls}">${escapeSearchHTML(st)}</span>
        </button>
      `;
    }).join('');
  }
}

function populateInPlayWorkspace(code) {
  const db = window.SanBongApp?.SanBongDB;
  const booking = findInPlayBookingSync(code);
  if (!booking) return null;

  activeInPlayCode = booking.code;
  const normStatus = normalizeInPlayStatus(booking.status);

  const elCode = document.getElementById('inplay-modal-code');
  const elStatus = document.getElementById('inplay-modal-status');
  const elPitch = document.getElementById('inplay-modal-pitch');
  const elCustomer = document.getElementById('inplay-modal-customer');

  if (elCode) elCode.textContent = '#' + booking.code;
  if (elStatus) {
    elStatus.textContent = normStatus === 'Giữ chỗ' ? 'Giữ chỗ (chờ cọc)' : normStatus;
    if (normStatus === 'Hoàn thành') {
      elStatus.className = 'px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[11px] font-bold shadow-xs';
    } else if (normStatus === 'Đang đá') {
      elStatus.className = 'px-2.5 py-0.5 rounded-full bg-blue-500 text-white text-[11px] font-bold shadow-xs';
    } else if (normStatus === 'Khách chưa đến' || normStatus === 'Đã hủy') {
      elStatus.className = 'px-2.5 py-0.5 rounded-full bg-red-500 text-white text-[11px] font-bold shadow-xs';
    } else {
      elStatus.className = 'px-2.5 py-0.5 rounded-full bg-amber-500/25 text-amber-300 border border-amber-400/40 text-[11px] font-bold';
    }
  }
  if (elPitch) elPitch.textContent = `${booking.pitchName} (${booking.slotTime || ''})`;
  if (elCustomer) elCustomer.textContent = `${booking.customerName} - ${booking.phone || ''}`;

  const checkinBtn = document.getElementById('inline-checkin-btn');
  if (checkinBtn) {
    if (normStatus === 'Đã xác nhận' || normStatus === 'Chờ duyệt cọc' || normStatus === 'Giữ chỗ') {
      checkinBtn.classList.remove('hidden');
      checkinBtn.classList.add('inline-flex');
    } else {
      checkinBtn.classList.add('hidden');
      checkinBtn.classList.remove('inline-flex');
    }
  }

  const restoreBtn = document.getElementById('inline-restore-btn');
  if (restoreBtn) {
    if (normStatus === 'Khách chưa đến' || normStatus === 'Đã hủy') {
      restoreBtn.classList.remove('hidden');
    } else {
      restoreBtn.classList.add('hidden');
    }
  }

  const pitchSel = document.getElementById('inplay-new-pitch');
  if (pitchSel) {
    const pitches = (db?.getPitches ? db.getPitches() : []).filter(p => p.status !== 'Bảo trì' && p.status !== 'Ẩn');
    pitchSel.innerHTML = pitches.length > 0
      ? pitches.map(p => `
        <option value="${escapeSearchHTML(p.id)}" ${p.id === booking.pitchId ? 'selected' : ''}>
          ${escapeSearchHTML(p.name)} (${inPlayFmtVND(p.basePrice)} - ${inPlayFmtVND(p.peakPrice)}/ca 2h) ${p.id === booking.pitchId ? '[Sân hiện tại]' : ''}
        </option>
      `).join('')
      : `<option value="${escapeSearchHTML(booking.pitchId)}" selected>${escapeSearchHTML(booking.pitchName || booking.pitchId || 'Sân hiện tại')}</option>`;
  }

  const srvSel = document.getElementById('inplay-service-select');
  if (srvSel) {
    const services = db?.getServices ? db.getServices() : [];
    srvSel.innerHTML = services.map(s => `
      <option value="${escapeSearchHTML(s.id)}">${escapeSearchHTML(s.name)} — ${inPlayFmtVND(s.price)}/${escapeSearchHTML(s.unit)} (Tồn: ${Number(s.stockQty ?? 50)})</option>
    `).join('');
  }

  const cancelReasonEl = document.getElementById('inplay-cancel-reason');
  if (cancelReasonEl) {
    cancelReasonEl.placeholder = 'Nhập lý do hủy ca (Bắt buộc nếu đơn đã thu tiền/cọc)...';
    if (cancelReasonEl.value === 'Khách báo hủy lịch trước thời hạn') {
      cancelReasonEl.value = '';
    }
    cancelReasonEl.classList.remove('border-red-500', 'ring-2', 'ring-red-300');
    if (!cancelReasonEl._boundClearErr) {
      cancelReasonEl._boundClearErr = true;
      cancelReasonEl.addEventListener('input', () => {
        cancelReasonEl.classList.remove('border-red-500', 'ring-2', 'ring-red-300');
      });
    }
  }

  const cancelHintEl = document.getElementById('inplay-cancel-policy-hint');
  const cancelPolicyEl = document.getElementById('inplay-cancel-policy');
  if (cancelHintEl || cancelPolicyEl) {
    const sysCfg = (db?.getSystemConfig && db.getSystemConfig()) || { refundFullHours: 24, refundPartialHours: 4 };
    const fullH = Math.max(1, Number(sysCfg.refundFullHours ?? 24));
    const partH = Math.max(0, Number(sysCfg.refundPartialHours ?? 4));
    let hoursLeft = null;
    if (booking.date) {
      const dPart = String(booking.date).trim().slice(0, 10);
      const tPart = booking.slotTime && String(booking.slotTime).includes('-')
        ? String(booking.slotTime).split('-')[0].trim()
        : String(booking.slotTime || '').trim();
      if (/^\d{1,2}:\d{2}$/.test(tPart)) {
        const [hh, mm] = tPart.split(':').map(n => String(parseInt(n, 10) || 0).padStart(2, '0'));
        const ko = new Date(`${dPart}T${hh}:${mm}:00`);
        if (!isNaN(ko.getTime())) {
          hoursLeft = (ko.getTime() - Date.now()) / (1000 * 60 * 60);
        }
      }
    }
    if (hoursLeft !== null) {
      let suggested = 'refund_100';
      let hintCls = 'bg-emerald-50 border-emerald-200 text-emerald-800';
      let hintText = `💡 Gợi ý (còn ${hoursLeft.toFixed(1)}h ≥ ${fullH}h): Hoàn 100% cọc`;
      if (hoursLeft < 0) {
        suggested = 'noshow_forfeit';
        hintCls = 'bg-red-50 border-red-200 text-red-800';
        hintText = `💡 Đã quá giờ đá ${Math.abs(Math.round(hoursLeft * 60))} phút: Tịch thu cọc 30% & Nhả sân`;
      } else if (hoursLeft < partH) {
        suggested = 'noshow_forfeit';
        hintCls = 'bg-red-50 border-red-200 text-red-800';
        hintText = `💡 Sát giờ (còn ${hoursLeft.toFixed(1)}h < ${partH}h): Không hoàn / Tịch thu cọc`;
      } else if (hoursLeft < fullH) {
        suggested = 'forfeit_50';
        hintCls = 'bg-amber-50 border-amber-200 text-amber-800';
        hintText = `💡 Gợi ý (còn ${hoursLeft.toFixed(1)}h, mốc ${partH}h–${fullH}h): Phạt 50% cọc`;
      }
      if (cancelPolicyEl) cancelPolicyEl.value = suggested;
      if (cancelHintEl) {
        cancelHintEl.textContent = hintText;
        cancelHintEl.className = `text-[11px] font-semibold rounded-lg px-2.5 py-1.5 mb-1.5 border ${hintCls}`;
      }
    } else if (cancelHintEl) {
      cancelHintEl.classList.add('hidden');
    }
  }

  const pkgBanner = document.getElementById('inplay-package-promo-banner');
  const pkgDesc = document.getElementById('inplay-package-promo-desc');
  const promo = booking.packagePromotion || (db?.getPackagePromotion ? db.getPackagePromotion(booking.weeksCount || 1) : null);
  if (pkgBanner) {
    if (booking.weeksCount > 1 || String(booking.note || '').includes('Gói') || promo) {
      pkgBanner.classList.remove('hidden');
      pkgBanner.classList.add('flex');
      if (pkgDesc) {
        if (promo) {
          pkgDesc.textContent = `${promo.title}: Tài trợ ${promo.giftSummary} (Miễn phí 100%) - Vui lòng xuất nước và giao trọng tài cho trận này.`;
        } else if (String(booking.note || '').includes('trọng tài')) {
          pkgDesc.textContent = 'Gói 3 Tháng: Tài trợ 2 thùng nước suối (48 chai) + 1 trọng tài chuyên nghiệp - Vui lòng xuất nước và giao trọng tài cho trận này.';
        }
      }
    } else {
      pkgBanner.classList.add('hidden');
      pkgBanner.classList.remove('flex');
    }
  }

  renderInlineInPlaySelector();
  updateInPlayOvertimePreview();
  refreshInPlaySummaryUI(booking);
  return booking;
}

async function openInPlayModal(code, focusSection = '') {
  if (typeof window.closeAllOverviewRowMenus === 'function') {
    window.closeAllOverviewRowMenus();
  }

  const db = window.SanBongApp?.SanBongDB;
  const all = db?.getAllBookings ? db.getAllBookings() : [];
  const targetCode = String(
    code
    || activeInPlayCode
    || (all[0] ? all[0].code : '')
    || (window.overviewSummaryCache?.todayBookings?.[0]?.code || '')
    || (window.overviewSummaryCache?.overdueBookings?.[0]?.code || '')
  ).trim();

  let booking = populateInPlayWorkspace(targetCode);
  if (!booking && targetCode) {
    const fetched = await fetchBookingForInPlayFallback(targetCode);
    if (fetched) {
      booking = populateInPlayWorkspace(targetCode);
    }
  }

  if (!booking) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Không tìm thấy đơn đặt sân ' + (targetCode || ''), 'error');
    return null;
  }

  const modal = document.getElementById('inplay-manage-modal') || document.getElementById('inplay-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    try { document.body.style.overflow = 'hidden'; } catch (e) {}
  }

  if (focusSection === 'pay') {
    const payEl = document.getElementById('inplay-pay-method');
    if (payEl) setTimeout(() => payEl.focus(), 200);
  }
  return booking;
}

function openInPlaySection(code, focusSection = '') {
  openInPlayModal(code, focusSection);
}

function closeInPlayModal() {
  const modal = document.getElementById('inplay-manage-modal') || document.getElementById('inplay-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    try { document.body.style.overflow = ''; } catch (e) {}
  }
}

async function handleInlineCheckinCurrent() {
  if (!activeInPlayCode) return;
  await handleCheckin(activeInPlayCode);
}

async function restoreCancelledBooking(code) {
  const targetCode = code || activeInPlayCode;
  if (!targetCode) return;
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const r = await adminFetchJson('../api/bookings.php?action=restore&code=' + encodeURIComponent(targetCode), {
    method: 'POST',
    body: JSON.stringify({})
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể khôi phục đơn đã hủy!', 'error', 4000);
    }
    return;
  }

  const updated = db.restoreBooking(targetCode);
  if (updated) {
    renderOverviewTodayBookings();
    renderTimelineGantt();
    initQuickBookingForm();
    populateInPlayWorkspace(targetCode);
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(`🔄 Đã khôi phục đơn #${targetCode} về trạng thái "Đã xác nhận"!`, 'success', 3500);
    }
  }
}

async function restoreCurrentCancelledBooking() {
  if (!activeInPlayCode) return;
  await restoreCancelledBooking(activeInPlayCode);
}

function updateInPlayOvertimePreview() {
  const db = window.SanBongApp?.SanBongDB;
  if (!activeInPlayCode) return;
  const booking = findInPlayBookingSync(activeInPlayCode);
  if (!booking) return;

  const pitch = db?.getPitchById ? db.getPitchById(booking.pitchId) : null;
  const mins = parseInt(document.getElementById('inplay-overtime-mins')?.value || '30', 10);
  const feeInput = document.getElementById('inplay-overtime-fee');
  if (pitch && feeInput) {
    const hourlyRate = pitch.peakPrice || pitch.basePrice || 300000;
    const suggestedFee = Math.round((hourlyRate * (mins / 60)) / 1000) * 1000;
    feeInput.value = suggestedFee;
  }
}

function refreshInPlaySummaryUI(booking) {
  if (!booking) return;
  const normStatus = normalizeInPlayStatus(booking.status);
  const paySt = String(booking.paymentStatus || booking.payment_status || '');
  const payLower = paySt.toLowerCase();
  const isUnpaidPending = (
    normStatus === 'Giữ chỗ'
    || normStatus === 'Chờ duyệt cọc'
    || payLower.includes('chờ duyệt cọc')
    || payLower.includes('chờ cọc')
    || payLower.includes('chưa cọc')
  );
  const total = Number(booking.totalPrice || 0);
  const deposit = isUnpaidPending
    ? Number(booking.paidAmount || 0)
    : Number(booking.depositAmount || Math.round(total * 0.3));
  const remaining = ((normStatus === 'Hoàn thành' && Number(booking.remainingAmount ?? 0) <= 0) || normStatus === 'Đã hủy' || normStatus === 'Khách chưa đến')
    ? 0
    : (typeof booking.remainingAmount === 'number' ? booking.remainingAmount : Math.max(0, total - deposit));
  const paidRem = (normStatus === 'Hoàn thành' && remaining <= 0) ? Number(booking.paidRemainingAmount || Math.max(0, total - deposit)) : 0;

  const elTotal = document.getElementById('inplay-bill-total');
  const elDep = document.getElementById('inplay-bill-deposit');
  const elPaidRow = document.getElementById('inplay-bill-paid-remaining-row');
  const elPaidVal = document.getElementById('inplay-bill-paid-remaining');
  const elRem = document.getElementById('inplay-bill-remaining');
  const elSrvList = document.getElementById('inplay-services-list');
  const elPayBtn = document.getElementById('inplay-pay-submit-btn');
  const elPayMethodWrap = document.getElementById('inplay-pay-method-wrap');

  if (elTotal) elTotal.textContent = inPlayFmtVND(total);
  if (elDep) elDep.textContent = '-' + inPlayFmtVND(deposit);
  if (elPaidRow && elPaidVal) {
    if (normStatus === 'Hoàn thành') {
      elPaidVal.textContent = '-' + inPlayFmtVND(paidRem);
      elPaidRow.classList.remove('hidden');
      elPaidRow.classList.add('flex');
    } else {
      elPaidRow.classList.add('hidden');
      elPaidRow.classList.remove('flex');
    }
  }
  if (elRem) {
    elRem.textContent = inPlayFmtVND(remaining);
    elRem.className = remaining > 0
      ? 'font-heading font-extrabold text-2xl text-[#DC2626]'
      : 'font-heading font-extrabold text-2xl text-[#16A34A]';
  }
  if (elPayBtn) {
    if (normStatus === 'Hoàn thành' && remaining <= 0) {
      elPayBtn.disabled = false;
      elPayBtn.innerHTML = '✓ Đã Thu Đủ 100% Tiền Sân (Hoàn Thành Ca)';
      elPayBtn.className = 'w-full rounded-xl bg-emerald-700 text-white font-extrabold text-xs py-2.5 shadow-sm cursor-default';
      if (elPayMethodWrap) elPayMethodWrap.classList.add('hidden');
    } else if (normStatus === 'Đã hủy' || normStatus === 'Khách chưa đến') {
      elPayBtn.disabled = true;
      elPayBtn.innerHTML = `Đơn đã kết thúc (${normStatus})`;
      elPayBtn.className = 'w-full rounded-xl bg-slate-200 text-slate-600 font-extrabold text-xs py-2.5 cursor-not-allowed';
      if (elPayMethodWrap) elPayMethodWrap.classList.add('hidden');
    } else {
      elPayBtn.disabled = false;
      elPayBtn.innerHTML = `✅ Thu Đủ Tiền Còn Lại (${inPlayFmtVND(remaining)}) & Hoàn Thành Ca`;
      elPayBtn.className = 'btn-base btn-primary w-full font-extrabold text-xs py-2.5 shadow-md cursor-pointer';
      if (elPayMethodWrap) elPayMethodWrap.classList.remove('hidden');
    }
  }

  if (elSrvList) {
    if (Array.isArray(booking.services) && booking.services.length > 0) {
      elSrvList.innerHTML = '<div class="font-bold text-[#0F172A] mb-1">Dịch vụ đã gọi trong ca:</div>' +
        booking.services.map(s => `
          <div class="flex justify-between items-center bg-white px-2.5 py-1 rounded border border-slate-200">
            <span>• ${escapeSearchHTML(s.name)} <b class="text-[#16A34A]">x${s.quantity}</b></span>
            <span class="font-bold text-[#0F172A]">${inPlayFmtVND((s.price || 0) * (s.quantity || 1))}</span>
          </div>
        `).join('');
    } else {
      elSrvList.innerHTML = '<div class="text-[11px] text-slate-400 italic">Chưa gọi thêm dịch vụ phụ nào.</div>';
    }
  }

  toggleInPlayVietQR();
}

function toggleInPlayVietQR() {
  const method = document.getElementById('inplay-pay-method')?.value || 'Tiền mặt tại quầy';
  const qrBox = document.getElementById('inplay-vietqr-box');
  const qrImg = document.getElementById('inplay-vietqr-img');
  if (!qrBox || !qrImg) return;

  if (method.includes('VietQR')) {
    const db = window.SanBongApp?.SanBongDB;
    const booking = findInPlayBookingSync(activeInPlayCode);
    const bank = db?.getBankInfo ? db.getBankInfo() : {};
    const rem = booking ? Math.max(0, Number(booking.remainingAmount || 0)) : 0;
    const bankCode = bank.bankCode || 'MB';
    const accNo = bank.accountNumber || bank.accountNo || '0352313548';
    const des = `${activeInPlayCode} TATTOAN`;
    qrImg.src = `https://qr.sepay.vn/img?bank=${encodeURIComponent(bankCode)}&acc=${encodeURIComponent(accNo)}&template=compact&amount=${rem}&des=${encodeURIComponent(des)}`;
    qrBox.classList.remove('hidden');
  } else {
    qrBox.classList.add('hidden');
  }
}

async function submitInPlayOvertime() {
  if (!activeInPlayCode) return;
  const mins = parseInt(document.getElementById('inplay-overtime-mins')?.value || '30', 10);
  const fee = parseInt(document.getElementById('inplay-overtime-fee')?.value || '0', 10);

  const r = await adminFetchJson('../api/admin.php?action=manage_booking', {
    method: 'POST',
    body: JSON.stringify({ code: activeInPlayCode, sub_action: 'overtime', minutes: mins, fee: fee })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể gia hạn thêm giờ!', 'error', 4000);
    }
    return;
  }

  const db = window.SanBongApp?.SanBongDB;
  const updated = db ? db.addOvertimeToBooking(activeInPlayCode, mins, fee) : null;
  if (updated && r.data) {
    const allB = db.getAllBookings();
    const idx = allB.findIndex(x => x.code === activeInPlayCode);
    if (idx >= 0 && r.data.totalPrice !== undefined) {
      allB[idx].totalPrice = Number(r.data.totalPrice);
      if (r.data.remainingAmount !== undefined) allB[idx].remainingAmount = Number(r.data.remainingAmount);
      if (r.data.status) allB[idx].status = r.data.status;
      if (r.data.paymentStatus) allB[idx].paymentStatus = r.data.paymentStatus;
      try { localStorage.setItem('sb_bookings_v1', JSON.stringify(allB)); } catch (e) {}
    }
  }
  refreshAllAdminViews(activeInPlayCode);
  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(r.message || `⏱️ Đã gia hạn thêm ${mins} phút (+${window.SanBongApp.formatVND(fee)}) cho đơn ${activeInPlayCode}!`, 'success', 3500);
  }
}

async function submitInPlayTransfer() {
  if (!activeInPlayCode) return;
  const newPitchId = document.getElementById('inplay-new-pitch')?.value;
  const reason = document.getElementById('inplay-transfer-reason')?.value.trim() || '';
  const adjustPrice = Boolean(document.getElementById('inplay-adjust-price')?.checked);

  if (!newPitchId) return;
  const db = window.SanBongApp?.SanBongDB;
  const currentBooking = findInPlayBookingSync(activeInPlayCode);
  if (currentBooking && currentBooking.pitchId === newPitchId) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Đơn này đang ở sân ' + currentBooking.pitchName + ' rồi. Vui lòng chọn sân khác để chuyển!', 'warning');
    return;
  }

  const r = await adminFetchJson('../api/admin.php?action=manage_booking', {
    method: 'POST',
    body: JSON.stringify({
      code: activeInPlayCode,
      sub_action: 'transfer_pitch',
      new_pitch_id: newPitchId,
      adjust_price: adjustPrice,
      reason: reason
    })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể chuyển sân! Sân đích có thể bị trùng lịch hoặc đang bảo trì.', 'error', 4500);
    }
    return;
  }

  const updated = db ? db.changePitchForBooking(activeInPlayCode, newPitchId, adjustPrice, reason) : null;
  if (updated && r.data) {
    const allB = db.getAllBookings();
    const idx = allB.findIndex(x => x.code === activeInPlayCode);
    if (idx >= 0) {
      if (r.data.pitchName) allB[idx].pitchName = r.data.pitchName;
      if (r.data.totalPrice !== undefined) allB[idx].totalPrice = Number(r.data.totalPrice);
      if (r.data.remainingAmount !== undefined) allB[idx].remainingAmount = Number(r.data.remainingAmount);
      if (r.data.status) allB[idx].status = r.data.status;
      if (r.data.paymentStatus) allB[idx].paymentStatus = r.data.paymentStatus;
      try { localStorage.setItem('sb_bookings_v1', JSON.stringify(allB)); } catch (e) {}
    }
  }
  refreshAllAdminViews(activeInPlayCode);
  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(r.message || `🔄 Đã chuyển đơn ${activeInPlayCode} sang ${r.data?.pitchName || updated?.pitchName || newPitchId} và giải phóng sân cũ!`, 'success', 3500);
  }
}

async function submitInPlayService() {
  if (!activeInPlayCode) return;
  const srvId = document.getElementById('inplay-service-select')?.value;
  const qty = Math.max(1, parseInt(document.getElementById('inplay-service-qty')?.value || '1', 10));
  if (!srvId) return;

  const db = window.SanBongApp?.SanBongDB;
  const srvDef = db ? db.getServices().find(s => s.id === srvId) : null;

  const r = await adminFetchJson('../api/admin.php?action=manage_booking', {
    method: 'POST',
    body: JSON.stringify({
      code: activeInPlayCode,
      sub_action: 'add_service',
      service_id: srvId,
      service_name: srvDef ? srvDef.name : srvId,
      quantity: qty
    })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể thêm dịch vụ vào đơn (kiểm tra tồn kho)!', 'error', 4000);
    }
    return;
  }

  const updated = db ? db.addInPlayService(activeInPlayCode, srvId, qty) : null;
  if (updated && r.data) {
    const allB = db.getAllBookings();
    const idx = allB.findIndex(x => x.code === activeInPlayCode);
    if (idx >= 0) {
      if (Array.isArray(r.data.services)) allB[idx].services = r.data.services;
      if (r.data.totalPrice !== undefined) allB[idx].totalPrice = Number(r.data.totalPrice);
      if (r.data.remainingAmount !== undefined) allB[idx].remainingAmount = Number(r.data.remainingAmount);
      if (r.data.status) allB[idx].status = r.data.status;
      if (r.data.paymentStatus) allB[idx].paymentStatus = r.data.paymentStatus;
      try { localStorage.setItem('sb_bookings_v1', JSON.stringify(allB)); } catch (e) {}
    }
  }
  refreshAllAdminViews(activeInPlayCode);
  if (typeof renderAdminInventory === 'function') renderAdminInventory();
  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(r.message || `🥤 Đã thêm ${qty}x ${srvDef ? srvDef.name : 'dịch vụ'} vào hóa đơn ${activeInPlayCode}!`, 'success', 3000);
  }
}

async function submitInPlayEarlyCancel() {
  if (!activeInPlayCode) return;
  const db = window.SanBongApp?.SanBongDB;
  const booking = findInPlayBookingSync(activeInPlayCode);
  const policy = document.getElementById('inplay-cancel-policy')?.value || 'refund_100';
  const reasonInput = document.getElementById('inplay-cancel-reason');
  const rawReason = (reasonInput?.value || '').trim();

  const payStatusStr = String(booking?.paymentStatus || booking?.payment_status || '');
  const hasPaidMoney = Boolean(
    booking && (
      Number(booking.paidAmount || 0) > 0 ||
      payStatusStr.includes('Đã cọc') ||
      payStatusStr.includes('Đã thanh toán')
    )
  );

  if (hasPaidMoney && (!rawReason || rawReason === 'Khách báo hủy lịch trước thời hạn')) {
    if (reasonInput) {
      reasonInput.value = '';
      reasonInput.classList.add('border-red-500', 'ring-2', 'ring-red-300');
      reasonInput.focus();
    }
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('⚠️ Đơn đã thu tiền/đặt cọc bắt buộc phải nhập lý do hủy vào ô Ghi chú lý do!', 'error', 4000);
    }
    return;
  }

  if (reasonInput) {
    reasonInput.classList.remove('border-red-500', 'ring-2', 'ring-red-300');
  }
  const reason = rawReason || 'Khách báo hủy lịch trước thời hạn (đơn chưa thu tiền)';

  const r = await adminFetchJson('../api/admin.php?action=manage_booking', {
    method: 'POST',
    body: JSON.stringify({ code: activeInPlayCode, sub_action: 'early_cancel', policy: policy, reason: reason })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || '⚠️ Không thể hủy lịch đơn này!', 'error', 4000);
    }
    return;
  }
  const serverMsg = r.message || '';

  if (policy === 'noshow_forfeit') {
    const updatedNoShow = db ? db.releaseNoShowBooking(activeInPlayCode) : null;
    closeInPlayModal();
    if (typeof initQuickBookingForm === 'function') initQuickBookingForm();
    refreshAllAdminViews(activeInPlayCode);
    if ((updatedNoShow || serverMsg) && window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(serverMsg || `⚠️ Đã đánh dấu đơn ${activeInPlayCode} là "Khách chưa đến" (tịch thu cọc 30%) & nhả sân trống!`, 'warning', 4000);
    }
    return;
  }

  const updated = db ? db.cancelBookingEarly(activeInPlayCode, policy, reason) : null;
  closeInPlayModal();
  if (typeof initQuickBookingForm === 'function') initQuickBookingForm();
  refreshAllAdminViews(activeInPlayCode);

  if ((updated || serverMsg) && window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(serverMsg || `🛑 Đã hủy lịch đơn ${activeInPlayCode} (${updated?.paymentStatus || ''}) và giải phóng sân trống!`, 'warning', 4000);
  }
}

async function submitInPlayPayRemaining() {
  if (!activeInPlayCode) return;
  const db = window.SanBongApp?.SanBongDB;
  const curBooking = findInPlayBookingSync(activeInPlayCode);
  if (curBooking && curBooking.status === 'Hoàn thành') {
    if (typeof openInvoicePrintModal === 'function') openInvoicePrintModal(curBooking.code);
    return;
  }

  const payMethod = document.getElementById('inplay-pay-method')?.value || 'Tiền mặt tại quầy';

  const r = await adminFetchJson('../api/admin.php?action=manage_booking', {
    method: 'POST',
    body: JSON.stringify({ code: activeInPlayCode, sub_action: 'pay_remaining', pay_method: payMethod })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể tất toán phần tiền còn lại!', 'error', 4000);
    }
    return;
  }

  const updated = db ? db.completeAndPayRemaining(activeInPlayCode, payMethod) : null;
  closeInPlayModal();
  refreshAllAdminViews(activeInPlayCode);

  if ((updated || r.ok) && window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(r.message || `✅ ĐÃ THU ĐỦ 100% TIỀN SÂN: Đơn ${activeInPlayCode} đã cập nhật Hoàn thành tức thì!`, 'success', 4000);
  }
  if (typeof openInvoicePrintModal === 'function') {
    openInvoicePrintModal(updated ? updated.code : activeInPlayCode);
  }
}

function openInvoiceFromInPlay() {
  const code = activeInPlayCode;
  closeInPlayModal();
  if (code && typeof openInvoicePrintModal === 'function') openInvoicePrintModal(code);
}

window.openInPlaySection = openInPlaySection;
window.openInPlayModal = openInPlayModal;
window.closeInPlayModal = closeInPlayModal;
window.renderInlineInPlaySelector = renderInlineInPlaySelector;
window.handleInlineCheckinCurrent = handleInlineCheckinCurrent;
window.restoreCancelledBooking = restoreCancelledBooking;
window.restoreCurrentCancelledBooking = restoreCurrentCancelledBooking;
window.updateInPlayOvertimePreview = updateInPlayOvertimePreview;
window.toggleInPlayVietQR = toggleInPlayVietQR;
window.submitInPlayOvertime = submitInPlayOvertime;
window.submitInPlayTransfer = submitInPlayTransfer;
window.submitInPlayService = submitInPlayService;
window.submitInPlayEarlyCancel = submitInPlayEarlyCancel;
window.submitInPlayPayRemaining = submitInPlayPayRemaining;
window.openInvoiceFromInPlay = openInvoiceFromInPlay;
