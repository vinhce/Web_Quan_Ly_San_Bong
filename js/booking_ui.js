
var selectedPitchId = window.selectedPitchId || 'P7-A';
var selectedPitchType = window.selectedPitchType || 7;
var selectedDate = window.selectedDate || '';
var selectedSlotId = window.selectedSlotId || '';
var bookingMode = window.bookingMode || 'single';
var monthlyWeeks = window.monthlyWeeks || 12;
var monthlyDates = window.monthlyDates || [];
var extraServicesCollapsed = window.extraServicesCollapsed || false;
var appliedServices = window.appliedServices || [];
var appliedVoucherCode = window.appliedVoucherCode || '';
var isCurrentPhoneBlacklisted = window.isCurrentPhoneBlacklisted || false;
var preselectedSlotId = window.preselectedSlotId || '';
var bookingTurnstileToken = window.bookingTurnstileToken || '';
var bookingRedeemedBottles = window.bookingRedeemedBottles || 0;

function initBookingTurnstile(siteKey) {
  const wrap = document.getElementById('booking-turnstile-wrap');
  if (!wrap || !siteKey || wrap.dataset.rendered) return;
  wrap.dataset.rendered = 'true';
  const renderWidget = () => {
    if (window.turnstile && typeof window.turnstile.render === 'function') {
      try {
        window.turnstile.render('#booking-turnstile-wrap', {
          sitekey: siteKey,
          theme: 'light',
          callback: function (t) { bookingTurnstileToken = t; },
          'expired-callback': function () { bookingTurnstileToken = ''; }
        });
      } catch (e) {}
    }
  };
  if (window.turnstile) {
    renderWidget();
  } else {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.defer = true;
    s.onload = renderWidget;
    document.head.appendChild(s);
  }
}

function setBookingMode(mode) {
  bookingMode = mode === 'monthly' ? 'monthly' : 'single';
  const singleBtn = document.getElementById('mode-single-btn');
  const monthlyBtn = document.getElementById('mode-monthly-btn');
  const panel = document.getElementById('monthly-booking-panel');

  if (bookingMode === 'monthly') {
    if (monthlyBtn) monthlyBtn.className = 'px-3 sm:px-4 py-2.5 rounded-xl border-2 border-[#16A34A] bg-[#DCFCE7]/50 text-[#15803D] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm';
    if (singleBtn) singleBtn.className = 'px-3 sm:px-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-[#475569] hover:border-[#16A34A] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all';
    if (panel) panel.classList.remove('hidden');
    // Khi đặt gói: Không cần gọi thêm dịch vụ vì gói đã bao gồm quà tặng trọn gói
    appliedServices = [];
    extraServicesCollapsed = true;
    updateMonthlyPackage();
  } else {
    if (singleBtn) singleBtn.className = 'px-3 sm:px-4 py-2.5 rounded-xl border-2 border-[#16A34A] bg-[#DCFCE7]/50 text-[#15803D] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm';
    if (monthlyBtn) monthlyBtn.className = 'px-3 sm:px-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-[#475569] hover:border-[#16A34A] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all';
    if (panel) panel.classList.add('hidden');
    monthlyDates = [];
    extraServicesCollapsed = false;
  }
  updatePackageServicesUI();
  renderServices();
  renderVoucherQuickList();
  updateBillSummary();
}
window.setBookingMode = setBookingMode;

function updateMonthlyPackage() {
  const select = document.getElementById('monthly-weeks-select');
  const preview = document.getElementById('monthly-dates-preview');
  const giftCard = document.getElementById('monthly-gift-card');
  const countBadge = document.getElementById('monthly-dates-count');
  monthlyWeeks = Math.max(4, parseInt(select?.value || '12', 10) || 12);

  const db = window.SanBongApp?.SanBongDB || window.SanBongDB;
  const promo = db?.getPackagePromotion ? db.getPackagePromotion(monthlyWeeks) : (window.SanBongData?.PACKAGE_PROMOTIONS?.[monthlyWeeks] || null);

  if (giftCard && promo) {
    const giftsHtml = promo.perMatchGifts.map(g => `
      <div class="p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200 flex items-center gap-2.5">
        <span class="text-xl shrink-0">${g.icon || '🎁'}</span>
        <div class="flex-1">
          <div class="font-bold text-[#0F172A] text-xs">${g.name}</div>
          <div class="text-[11px] text-slate-500 font-medium">Tài trợ miễn phí: <span class="whitespace-nowrap"><b>${window.SanBongApp.formatVND(g.lineValue)}/trận</b> → <b class="text-[#15803D]">0đ</b></span></div>
        </div>
      </div>
    `).join('');

    giftCard.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
        <div class="flex items-center gap-2">
          <span class="text-xl">🎁</span>
          <div>
            <div class="text-xs font-extrabold text-[#0F172A] uppercase tracking-wide">Đặc quyền tài trợ mỗi trận thi đấu</div>
            <div class="text-[11px] text-[#15803D] font-bold">${promo.title} · Giảm ${Math.round(promo.discountRate * 100)}% tiền sân</div>
          </div>
        </div>
        <span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-extrabold text-[10px] uppercase shadow-2xs">${promo.badge}</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
        ${giftsHtml}
      </div>

      <div class="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2 mt-1 font-semibold">
        <span>💰 Tổng tài trợ quà tặng suốt ${promo.weeks} tuần: <b>${window.SanBongApp.formatVND(promo.totalGiftValue)}</b></span>
        <span class="px-2 py-0.5 rounded bg-[#16A34A] text-white font-extrabold text-[11px]">TÀI TRỢ 100% (0đ)</span>
      </div>
    `;
    giftCard.classList.remove('hidden');
  }

  if (countBadge) {
    countBadge.textContent = `${monthlyWeeks} buổi thi đấu (${promo ? promo.months + ' tháng' : ''})`;
  }

  if (!selectedDate) {
    selectedDate = window.SanBongApp?.getLocalTodayISO ? window.SanBongApp.getLocalTodayISO() : new Date().toISOString().split('T')[0];
  }

  const baseDate = new Date(selectedDate + 'T00:00:00');
  const dates = [];
  for (let i = 0; i < monthlyWeeks; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i * 7);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const iso = `${yyyy}-${mm}-${dd}`;
    let isFree = true;
    if (db && selectedPitchId && selectedSlotId) {
      const daySlots = db.getSlotsWithStatus(selectedPitchId, iso);
      const found = daySlots.find(s => s.id === selectedSlotId);
      if (found && (found.status === 'Đã đặt' || found.status === 'Đang đá' || found.status === 'Bảo trì')) {
        isFree = false;
      }
    }
    dates.push({ iso, label: `${dd}/${mm}/${yyyy}`, isFree, index: i + 1 });
  }
  monthlyDates = dates;

  updatePackageServicesUI();
  renderServices();
  if (preview) {
    preview.innerHTML = dates.map(item => `
      <span class="px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 ${
        item.isFree
          ? 'bg-white border-emerald-300 text-[#15803D]'
          : 'bg-amber-50 border-amber-300 text-amber-800'
      }">
        <span>Buổi ${item.index}: ${item.label}</span>
        <span>${item.isFree ? '✓ Trống' : '⚠️ Đổi giờ linh hoạt'}</span>
      </span>
    `).join('');
  }

  updateBillSummary();
}
window.updateMonthlyPackage = updateMonthlyPackage;


function updatePackageServicesUI() {
  const banner = document.getElementById('services-package-included-banner');
  const bannerTitle = document.getElementById('services-package-banner-title');
  const bannerDesc = document.getElementById('services-package-banner-desc');
  const wrapper = document.getElementById('extra-services-wrapper');
  const toggleBtnText = document.getElementById('toggle-extra-services-text');

  if (bookingMode === 'monthly') {
    if (banner) {
      banner.classList.remove('hidden');
      if (monthlyWeeks >= 12) {
        if (bannerTitle) bannerTitle.textContent = 'ĐÃ BAO GỒM TRỌN GÓI: 2 THÙNG NƯỚC + 1 TRỌNG TÀI MỖI TRẬN';
        if (bannerDesc) bannerDesc.innerHTML = 'Gói 3 Tháng của bạn đã được <b>TẶNG SẴN 2 THÙNG NƯỚC (48 CHAI) + 1 TRỌNG TÀI CHUYÊN NGHIỆP</b> cho mỗi trận thi đấu (0đ). Bạn không cần chọn thêm dịch vụ ở dưới!';
      } else if (monthlyWeeks >= 8) {
        if (bannerTitle) bannerTitle.textContent = 'ĐÃ BAO GỒM TRỌN GÓI: 1 THÙNG NƯỚC + 1 BỘ ÁO BIB MỖI TRẬN';
        if (bannerDesc) bannerDesc.innerHTML = 'Gói 2 Tháng của bạn đã được <b>TẶNG SẴN 1 THÙNG NƯỚC (24 CHAI) + 1 BỘ ÁO BIB</b> cho mỗi trận thi đấu (0đ).';
      } else {
        if (bannerTitle) bannerTitle.textContent = 'ĐÃ BAO GỒM TRỌN GÓI: 1 LỐC NƯỚC + MIỄN PHÍ BÓNG ĐÁ MỖI TRẬN';
        if (bannerDesc) bannerDesc.innerHTML = 'Gói 1 Tháng của bạn đã được <b>TẶNG SẴN 1 LỐC NƯỚC (12 CHAI) + BÓNG ĐÁ</b> cho mỗi trận thi đấu (0đ).';
      }
    }

    if (wrapper) {
      if (extraServicesCollapsed) {
        wrapper.classList.add('hidden');
        if (toggleBtnText) toggleBtnText.textContent = 'Gọi thêm dịch vụ phát sinh khác ngoài gói';
      } else {
        wrapper.classList.remove('hidden');
        if (toggleBtnText) toggleBtnText.textContent = 'Thu gọn danh sách dịch vụ ngoài gói';
      }
    }
  } else {
    if (banner) banner.classList.add('hidden');
    if (wrapper) wrapper.classList.remove('hidden');
  }
}
window.updatePackageServicesUI = updatePackageServicesUI;

function toggleExtraServicesContainer() {
  extraServicesCollapsed = !extraServicesCollapsed;
  updatePackageServicesUI();
}
window.toggleExtraServicesContainer = toggleExtraServicesContainer;

let _cachedEligibleVouchers = null;
let _eligibleVouchersInFlight = null;
let _eligibleVouchersFailed = false;

function normalizeBookingVoucher(raw) {
  const db = window.SanBongApp?.SanBongDB || window.SanBongDB;
  if (db && typeof db.normalizeVoucher === 'function') {
    return db.normalizeVoucher(raw);
  }
  if (!raw || typeof raw !== 'object') return null;
  const code = String(raw.code || '').trim().toUpperCase();
  if (!code) return null;
  const rawType = String(raw.type ?? raw.discount_type ?? 'percent').trim().toLowerCase();
  const type = rawType === 'fixed' ? 'fixed' : 'percent';
  const value = Math.max(0, Number(raw.value ?? raw.discount_value ?? 0) || 0);
  const minOrder = Math.max(0, Number(raw.minOrder ?? raw.min_order ?? 0) || 0);
  const maxDiscountAmount = Math.max(0, Number(raw.maxDiscountAmount ?? raw.max_discount_amount ?? 0) || 0);
  const rawActive = raw.isActive ?? raw.is_active;
  const isActive = rawActive === undefined ? true : !(rawActive === false || rawActive === 0 || rawActive === '0' || String(rawActive).toLowerCase() === 'false');
  return Object.assign({}, raw, {
    code,
    type,
    discount_type: type,
    value,
    discount_value: value,
    minOrder,
    min_order: minOrder,
    maxDiscountAmount,
    max_discount_amount: maxDiscountAmount,
    isActive,
    is_active: isActive ? 1 : 0
  });
}

async function fetchEligibleVouchers(forceRefresh = false) {
  if (_eligibleVouchersInFlight) return _eligibleVouchersInFlight;
  if (!forceRefresh && Array.isArray(_cachedEligibleVouchers) && !_eligibleVouchersFailed) {
    return _cachedEligibleVouchers;
  }
  _eligibleVouchersInFlight = (async () => {
    try {
      const url = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath('api/bookings.php?action=eligible_vouchers') : '/api/bookings.php?action=eligible_vouchers';
      const res = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data)) {
        const normalized = json.data.map(normalizeBookingVoucher).filter(Boolean);
        _cachedEligibleVouchers = normalized;
        _eligibleVouchersFailed = false;
        const db = window.SanBongApp?.SanBongDB || window.SanBongDB;
        if (db && typeof db.setVouchers === 'function') {
          db.setVouchers(normalized);
        } else {
          try {
            const primaryKey = window.STORAGE_KEYS?.VOUCHERS || window.SanBongDB?.STORAGE_KEYS?.VOUCHERS || 'sb_vouchers_v1';
            localStorage.setItem(primaryKey, JSON.stringify(normalized));
            localStorage.setItem('sanbong_vouchers', JSON.stringify(normalized));
          } catch (e) {}
        }
      } else {
        _cachedEligibleVouchers = [];
        _eligibleVouchersFailed = true;
      }
    } catch (e) {
      _cachedEligibleVouchers = [];
      _eligibleVouchersFailed = true;
    } finally {
      _eligibleVouchersInFlight = null;
    }
    const hintEl = document.getElementById('voucher-available-hint');
    if (hintEl) {
      if (_eligibleVouchersFailed) {
        hintEl.textContent = 'Tạm thời chưa tải được danh sách gợi ý (bạn vẫn có thể nhập mã trực tiếp).';
      } else if (Array.isArray(_cachedEligibleVouchers) && _cachedEligibleVouchers.length > 0) {
        hintEl.textContent = `Có ${_cachedEligibleVouchers.length} mã ưu đãi khả dụng.`;
      } else {
        hintEl.textContent = 'Hiện chưa có mã ưu đãi tự động.';
      }
    }
    renderVoucherQuickList();
    return _cachedEligibleVouchers;
  })();
  return _eligibleVouchersInFlight;
}
window.fetchEligibleVouchers = fetchEligibleVouchers;
window.getCachedEligibleVouchers = () => _cachedEligibleVouchers;

function renderVoucherQuickList() {
  const container = document.getElementById('voucher-quick-list');
  if (!container) return;
  const db = window.SanBongApp?.SanBongDB || window.SanBongDB;
  if (!db) return;

  if (_cachedEligibleVouchers === null) {
    fetchEligibleVouchers(true);
    return;
  }

  const rawVouchers = Array.isArray(_cachedEligibleVouchers) && (!_eligibleVouchersFailed || _cachedEligibleVouchers.length > 0)
    ? _cachedEligibleVouchers
    : (db.getVouchers() || []);
  const vouchers = rawVouchers
    .map(normalizeBookingVoucher)
    .filter(v => {
      if (!v || v.isActive === false) return false;
      const codeUpper = String(v.code || '').toUpperCase();
      if (bookingMode !== 'monthly' && codeUpper === 'DATTHANG15') return false;
      return true;
    });
  const palettes = [
    'bg-emerald-50 hover:bg-emerald-100 text-[#16A34A] border-emerald-200',
    'bg-amber-50 hover:bg-amber-100 text-[#D97706] border-amber-200',
    'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200',
    'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200',
    'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200',
    'bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-200'
  ];

  const removeBtn = document.getElementById('remove-voucher-btn');
  if (removeBtn) {
    if (typeof appliedVoucherCode !== 'undefined' && appliedVoucherCode) {
      removeBtn.classList.remove('hidden');
    } else {
      removeBtn.classList.add('hidden');
    }
  }

  const esc = window.SanBongApp?.escapeHTML || (s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])));

  if (!vouchers.length) {
    const emptyNote = _eligibleVouchersFailed
      ? 'Tạm thời chưa tải được gợi ý (bạn có thể tự nhập mã bên trên)'
      : 'Không có mã ưu đãi phù hợp';
    container.innerHTML = `<span class="text-[11px] text-[#64748B]">Gợi ý 1 chạm:</span><span class="text-[11px] text-slate-400 italic">${emptyNote}</span>`;
    return;
  }

  container.innerHTML = '<span class="text-[11px] text-[#64748B]">Gợi ý 1 chạm:</span>' +
    vouchers.map((v, idx) => {
      const cls = palettes[idx % palettes.length];
      const vType = String(v.type ?? v.discount_type ?? 'percent').trim().toLowerCase() === 'fixed' ? 'fixed' : 'percent';
      const vVal = Math.max(0, Number(v.value ?? v.discount_value ?? 0) || 0);
      const lbl = vType === 'percent'
        ? `-${vVal}%`
        : (vVal >= 1000 && vVal % 1000 === 0 ? `-${Math.round(vVal / 1000)}k` : `-${vVal.toLocaleString('vi-VN')}đ`);
      const escCode = esc(v.code || '');
      const escDesc = esc(v.description || '');
      const isApplied = typeof appliedVoucherCode !== 'undefined' && appliedVoucherCode && appliedVoucherCode.toUpperCase() === String(v.code || '').toUpperCase();
      const activeCls = isApplied ? ' ring-2 ring-emerald-500 font-extrabold bg-emerald-100 border-emerald-400 shadow-sm' : '';
      return `<button type="button" data-code="${escCode}" onclick="quickApplyVoucher(this.getAttribute('data-code'))" title="${escDesc}" class="px-2.5 py-1 rounded-lg ${cls}${activeCls} text-[11px] font-bold border transition-all cursor-pointer min-h-[32px]">${escCode} (${lbl})</button>`;
    }).join('');
}
window.renderVoucherQuickList = renderVoucherQuickList;

function stripBookingSystemNoteTags(str) {
  return String(str || '')
    .replace(/\s*\|?\s*\[(?:Gói cố định|Tài trợ mỗi trận|Gói \d+ tháng)[^\]]*\]/gi, '')
    .replace(/^\s*\|\s*|\s*\|\s*$/g, '')
    .trim();
}
window.stripBookingSystemNoteTags = stripBookingSystemNoteTags;

function initBookingPage() {
  const db = window.SanBongApp?.SanBongDB || window.SanBongDB;
  if (!db) return;

  const urlParams = new URLSearchParams(window.location.search);
  const paramPitch = urlParams.get('pitchId') || urlParams.get('pitch');
  const paramType = urlParams.get('type');
  const paramMode = urlParams.get('mode');
  const paramWeeks = parseInt(urlParams.get('weeks') || '', 10);
  const paramDate = urlParams.get('date');
  const paramSlotId = urlParams.get('slotId');
  const paramVoucher = urlParams.get('voucher');
  if (paramVoucher) {
    appliedVoucherCode = paramVoucher.trim().toUpperCase();
  }

  const today = window.SanBongApp?.getLocalTodayISO ? window.SanBongApp.getLocalTodayISO() : new Date().toISOString().split('T')[0];

  // Khôi phục lựa chọn từ draft nếu chưa được tạo thành đơn hoàn chỉnh
  const rawDraft = sessionStorage.getItem('sb_booking_draft');
  if (rawDraft) {
    try {
      const draft = JSON.parse(rawDraft);
      if (draft && draft.submittedCode) {
        sessionStorage.removeItem('sb_booking_draft');
      } else if (draft && draft.pitchId) {
        if (!paramPitch && !paramType) {
          selectedPitchId = draft.pitchId;
          const p = db.getPitchById(selectedPitchId);
          if (p && p.type) selectedPitchType = Number(p.type);
        }
        if (!paramDate && draft.date && draft.date >= today) {
          selectedDate = draft.date;
        }
        if (!paramSlotId && draft.slotId) {
          preselectedSlotId = draft.slotId;
          selectedSlotId = draft.slotId;
        }
        if (draft.bookingMode && !paramPitch && !paramType && paramMode !== 'single') {
          bookingMode = draft.bookingMode;
        }
        if (draft.weeksCount && [4, 8, 12].includes(Number(draft.weeksCount))) {
          monthlyWeeks = Number(draft.weeksCount);
        }
        if (Array.isArray(draft.services)) appliedServices = draft.services;
        if (draft.voucherCode && !paramVoucher) appliedVoucherCode = draft.voucherCode;

        if (draft.policy_agree) {
          const agreeBox = document.getElementById('policy-agree');
          if (agreeBox) agreeBox.checked = true;
        }

        if (draft.isBookingForFriend) {
          const friendChk = document.getElementById('booking-for-friend-checkbox');
          const friendWrap = document.getElementById('booking-friend-fields-wrap');
          const friendNameEl = document.getElementById('friend-name');
          const friendPhoneEl = document.getElementById('friend-phone');
          if (friendChk) friendChk.checked = true;
          if (friendWrap) friendWrap.classList.remove('hidden');
          if (friendNameEl) friendNameEl.value = draft.friendName || draft.customerName || '';
          if (friendPhoneEl) friendPhoneEl.value = draft.friendPhone || draft.phone || '';
        }

        const restoredUserNote = stripBookingSystemNoteTags(draft.customerNote ?? draft.note ?? '');
        if (restoredUserNote) {
          const noteInput = document.getElementById('cust-note');
          const noteWrapper = document.getElementById('cust-note-wrapper');
          const textToggleNote = document.getElementById('text-toggle-note');
          const noteCounter = document.getElementById('cust-note-counter');
          if (noteInput) {
            noteInput.value = restoredUserNote;
            if (noteCounter) noteCounter.textContent = String(restoredUserNote.length);
            if (noteWrapper) noteWrapper.classList.remove('hidden');
            if (textToggleNote) textToggleNote.textContent = '- Thu gọn ghi chú';
          }
        }
      }
    } catch (e) {}
  }

  if (paramMode === 'monthly') {
    bookingMode = 'monthly';
  } else if (paramMode === 'single') {
    bookingMode = 'single';
  }
  if ([4, 8, 12].includes(paramWeeks)) {
    monthlyWeeks = paramWeeks;
  }

  if (paramPitch && db.getPitchById(paramPitch)) {
    selectedPitchId = paramPitch;
    const p = db.getPitchById(paramPitch);
    if (p && p.type) selectedPitchType = Number(p.type);
  } else if (paramType && [5, 7, 11].includes(Number(paramType))) {
    selectedPitchType = Number(paramType);
    const pitchesOfType = db.getPitches().filter(p => Number(p.type) === selectedPitchType);
    if (pitchesOfType.length > 0) {
      const activeOne = pitchesOfType.find(p => p.status !== 'Bảo trì') || pitchesOfType[0];
      selectedPitchId = activeOne.id;
    }
  } else {
    const curP = db.getPitchById(selectedPitchId);
    if (curP && curP.type) selectedPitchType = Number(curP.type);
  }

  selectedDate = (paramDate && /^\d{4}-\d{2}-\d{2}$/.test(paramDate) && paramDate >= today) ? paramDate : (selectedDate || today);
  if (paramSlotId) {
    preselectedSlotId = paramSlotId;
    selectedSlotId = paramSlotId;
  }
  const dateInput = document.getElementById('booking-date-input');
  const maxBookingDateObj = new Date(today + 'T00:00:00');
  maxBookingDateObj.setDate(maxBookingDateObj.getDate() + 180);
  const maxBookingDateISO = `${maxBookingDateObj.getFullYear()}-${String(maxBookingDateObj.getMonth() + 1).padStart(2, '0')}-${String(maxBookingDateObj.getDate()).padStart(2, '0')}`;
  window._maxBookingDateISO = maxBookingDateISO;
  if (dateInput) {
    dateInput.min = today;
    dateInput.max = maxBookingDateISO;
    dateInput.value = selectedDate;
  }

  renderPitchTypeSelector();
  initPitchSelect();
  initDateStrip();
  renderSlots();
  const weeksSel = document.getElementById('monthly-weeks-select');
  if (weeksSel && [4, 8, 12].includes(Number(monthlyWeeks))) {
    weeksSel.value = String(monthlyWeeks);
  }
  setBookingMode(bookingMode === 'monthly' ? 'monthly' : 'single');

  if (appliedVoucherCode) {
    const voucherInput = document.getElementById('voucher-input');
    if (voucherInput) voucherInput.value = appliedVoucherCode;
    if (typeof applyVoucher === 'function') {
      applyVoucher();
    }
  }

  function fillBookingUserInfo(u) {
    let curUser = u;
    if (!curUser && window.SanBongApp?.SanBongDB?.getUser) {
      curUser = window.SanBongApp.SanBongDB.getUser();
    }
    if (curUser && (curUser.role === 'guest' || curUser.is_guest || ['admin', 'manager', 'staff'].includes(String(curUser.role || '').toLowerCase()))) {
      curUser = null;
    }

    const step4Card = document.getElementById('booking-step4-card');
    const summaryCard = document.getElementById('booking-user-summary-card');
    const missingPhoneWrap = document.getElementById('booking-missing-phone-wrap');
    const loginReminder = document.getElementById('summary-login-reminder');
    const proceedBtn = document.getElementById('proceed-checkout-btn');

    if (curUser && (curUser.id || curUser.name || curUser.full_name)) {
      // ĐÃ ĐĂNG NHẬP: Render mục 4 gọn gàng
      if (step4Card) step4Card.classList.remove('hidden');
      if (summaryCard) summaryCard.classList.remove('hidden');
      if (loginReminder) loginReminder.classList.add('hidden');
      if (proceedBtn) {
        proceedBtn.textContent = 'Đặt sân ngay';
        proceedBtn.classList.remove('bg-amber-600', 'hover:bg-amber-700');
        proceedBtn.classList.add('btn-primary');
      }

      const name = curUser.full_name || curUser.name || '';
      const phone = curUser.phone || '';
      const tier = curUser.tier || 'Hội viên';

      const nameEl = document.getElementById('summary-card-name');
      const phoneEl = document.getElementById('summary-card-phone');
      const tierEl = document.getElementById('summary-card-tier');
      if (nameEl) nameEl.textContent = name || 'Hội viên';
      if (phoneEl) phoneEl.textContent = phone || 'Chưa cập nhật SĐT';
      if (tierEl) tierEl.textContent = tier;

      if (!phone) {
        if (missingPhoneWrap) missingPhoneWrap.classList.remove('hidden');
      } else {
        if (missingPhoneWrap) missingPhoneWrap.classList.add('hidden');
        if (typeof checkBookingPhoneNoShow === 'function') {
          checkBookingPhoneNoShow(phone);
        }
      }
    } else {
      // CHƯA ĐĂNG NHẬP: KHÔNG CÓ MỤC 4, ẩn nhắc nhở & nút luôn xanh lá "Đặt sân ngay"
      if (step4Card) step4Card.classList.add('hidden');
      if (summaryCard) summaryCard.classList.add('hidden');
      if (missingPhoneWrap) missingPhoneWrap.classList.add('hidden');
      if (loginReminder) loginReminder.classList.add('hidden');
      if (proceedBtn) {
        proceedBtn.textContent = 'Đặt sân ngay';
        proceedBtn.classList.remove('bg-amber-600', 'hover:bg-amber-700');
        proceedBtn.classList.add('btn-primary');
      }
    }
  }
  window.fillBookingUserInfo = fillBookingUserInfo;

  fillBookingUserInfo();
  let _lastVoucherAuthUid = null;
  window.addEventListener('sb-auth-synced', (e) => {
    const nextUid = e.detail?.id ? String(e.detail.id) : null;
    fillBookingUserInfo(e.detail);
    if (typeof window.initBookingWaterRedemption === 'function') window.initBookingWaterRedemption();
    if (nextUid !== _lastVoucherAuthUid) {
      _lastVoucherAuthUid = nextUid;
      _cachedEligibleVouchers = null;
      renderVoucherQuickList();
    }
  });
  window.addEventListener('sb-auth-unauthenticated', () => {
    const hadUid = _lastVoucherAuthUid !== null;
    _lastVoucherAuthUid = null;
    fillBookingUserInfo(null);
    if (typeof window.initBookingWaterRedemption === 'function') window.initBookingWaterRedemption();
    if (hadUid) _cachedEligibleVouchers = null;
    renderVoucherQuickList();
  });
  if (window.SanBongApp?.authReady) {
    window.SanBongApp.authReady.then(() => {
      fillBookingUserInfo();
      if (typeof window.initBookingWaterRedemption === 'function') window.initBookingWaterRedemption();
      renderVoucherQuickList();
    });
  }

  // Bật/tắt ô ghi chú cho ban quản lý
  const btnToggleNote = document.getElementById('btn-toggle-note');
  const noteWrapper = document.getElementById('cust-note-wrapper');
  const textToggleNote = document.getElementById('text-toggle-note');
  const noteInput = document.getElementById('cust-note');
  const noteCounter = document.getElementById('cust-note-counter');
  if (btnToggleNote && !btnToggleNote._bound) {
    btnToggleNote._bound = true;
    btnToggleNote.addEventListener('click', () => {
      if (noteWrapper) {
        const isHidden = noteWrapper.classList.contains('hidden');
        if (isHidden) {
          noteWrapper.classList.remove('hidden');
          if (textToggleNote) textToggleNote.textContent = '- Thu gọn ghi chú';
          noteInput?.focus();
        } else {
          noteWrapper.classList.add('hidden');
          if (textToggleNote) textToggleNote.textContent = '+ Thêm ghi chú cho ban quản lý sân';
        }
      }
    });
  }
  if (noteInput && !noteInput._counterBound) {
    noteInput._counterBound = true;
    noteInput.addEventListener('input', () => {
      if (noteCounter) noteCounter.textContent = String(noteInput.value.length);
    });
  }

  // Bấm link đăng nhập: lưu draft vào sessionStorage trước khi đi
  const loginLinkBtn = document.getElementById('booking-login-btn-link');
  if (loginLinkBtn && !loginLinkBtn._bound) {
    loginLinkBtn._bound = true;
    loginLinkBtn.addEventListener('click', () => {
      if (typeof window.saveCurrentBookingDraft === 'function') {
        window.saveCurrentBookingDraft();
      }
    });
  }

  // Nút Bỏ mã voucher
  const removeVoucherBtn = document.getElementById('remove-voucher-btn');
  if (removeVoucherBtn && !removeVoucherBtn._bound) {
    removeVoucherBtn._bound = true;
    removeVoucherBtn.addEventListener('click', () => {
      appliedVoucherCode = '';
      const input = document.getElementById('voucher-input');
      if (input) input.value = '';
      const msg = document.getElementById('voucher-msg');
      if (msg) { msg.textContent = ''; msg.className = 'text-xs mt-1.5 font-semibold'; }
      removeVoucherBtn.classList.add('hidden');
      updateBillSummary();
      renderVoucherQuickList();
    });
  }

  const missingPhoneEl = document.getElementById('user-missing-phone');
  if (missingPhoneEl && !missingPhoneEl._noShowBound) {
    missingPhoneEl._noShowBound = true;
    const handleCheckPhone = () => checkBookingPhoneNoShow(missingPhoneEl.value);
    missingPhoneEl.addEventListener('input', handleCheckPhone);
    missingPhoneEl.addEventListener('change', handleCheckPhone);
    missingPhoneEl.addEventListener('blur', handleCheckPhone);
    if (missingPhoneEl.value) handleCheckPhone();
  }

  const friendChkEl = document.getElementById('booking-for-friend-checkbox');
  const friendWrapEl = document.getElementById('booking-friend-fields-wrap');
  const friendPhoneEl = document.getElementById('friend-phone');
  if (friendChkEl && !friendChkEl._bound) {
    friendChkEl._bound = true;
    friendChkEl.addEventListener('change', () => {
      if (friendWrapEl) friendWrapEl.classList.toggle('hidden', !friendChkEl.checked);
      ['friend-name-error', 'friend-phone-error'].forEach(id => {
        const err = document.getElementById(id);
        if (err) { err.textContent = ''; err.classList.add('hidden'); }
      });
      if (friendChkEl.checked) {
        if (typeof checkBookingPhoneNoShow === 'function') checkBookingPhoneNoShow(friendPhoneEl?.value || '');
      } else if (typeof checkBookingPhoneNoShow === 'function') {
        const curU = window.SanBongApp?.SanBongDB?.getUser ? window.SanBongApp.SanBongDB.getUser() : null;
        checkBookingPhoneNoShow(curU?.phone || document.getElementById('user-missing-phone')?.value || '');
      }
    });
  }
  if (friendPhoneEl && !friendPhoneEl._noShowBound) {
    friendPhoneEl._noShowBound = true;
    const handleCheckFriendPhone = () => {
      if (friendChkEl?.checked && typeof checkBookingPhoneNoShow === 'function') {
        checkBookingPhoneNoShow(friendPhoneEl.value);
      }
    };
    friendPhoneEl.addEventListener('input', handleCheckFriendPhone);
    friendPhoneEl.addEventListener('change', handleCheckFriendPhone);
    friendPhoneEl.addEventListener('blur', handleCheckFriendPhone);
    if (friendChkEl?.checked && friendPhoneEl.value) handleCheckFriendPhone();
  }

  const pitchSelect = document.getElementById('booking-pitch-select');
  if (pitchSelect && !pitchSelect._bound) {
    pitchSelect._bound = true;
    pitchSelect.addEventListener('change', (e) => {
      selectedPitchId = e.target.value;
      const curP = db.getPitchById(selectedPitchId);
      if (curP && curP.type) {
        selectedPitchType = Number(curP.type);
        renderPitchTypeSelector();
      }
      renderSlots();
      updateBillSummary();
    });
  }

  const dateInputEl = document.getElementById('booking-date-input');
  if (dateInputEl && !dateInputEl._bound) {
    dateInputEl._bound = true;
    dateInputEl.addEventListener('change', (e) => {
      const val = String(e.target.value || '').trim();
      const todayISO = window.SanBongApp?.getLocalTodayISO ? window.SanBongApp.getLocalTodayISO() : new Date().toISOString().split('T')[0];
      const maxISO = window._maxBookingDateISO || '';
      if (!val || val < todayISO) {
        if (window.SanBongApp?.showToast) {
          window.SanBongApp.showToast('Không thể đặt sân cho ngày trong quá khứ.', 'warning');
        }
        e.target.value = todayISO;
        selectedDate = todayISO;
      } else if (maxISO && val > maxISO) {
        if (window.SanBongApp?.showToast) {
          window.SanBongApp.showToast('Chỉ hỗ trợ đặt lịch trước tối đa 180 ngày.', 'warning');
        }
        e.target.value = maxISO;
        selectedDate = maxISO;
      } else {
        selectedDate = val;
      }
      initDateStrip();
      renderSlots();
      if (bookingMode === 'monthly') updateMonthlyPackage();
      updateBillSummary();
    });
  }

  const voucherBtn = document.getElementById('apply-voucher-btn');
  if (voucherBtn && !voucherBtn._bound) {
    voucherBtn._bound = true;
    voucherBtn.addEventListener('click', applyVoucher);
  }

  const voucherInputEl = document.getElementById('voucher-input');
  if (voucherInputEl && !voucherInputEl._autoApplyBound) {
    voucherInputEl._autoApplyBound = true;
    let _voucherTimer = null;
    voucherInputEl.addEventListener('input', () => {
      clearTimeout(_voucherTimer);
      _voucherTimer = setTimeout(() => {
        applyVoucher();
      }, 300);
    });
  }

  const agreeCheckEl = document.getElementById('policy-agree');
  if (agreeCheckEl && !agreeCheckEl._clearErrBound) {
    agreeCheckEl._clearErrBound = true;
    agreeCheckEl.addEventListener('change', () => {
      if (agreeCheckEl.checked && agreeCheckEl.parentElement) {
        agreeCheckEl.parentElement.classList.remove('text-rose-600', 'font-bold');
      }
    });
  }

  const checkoutBtn = document.getElementById('proceed-checkout-btn');
  if (checkoutBtn && !checkoutBtn._bound) {
    checkoutBtn._bound = true;
    checkoutBtn.addEventListener('click', proceedToCheckout);
  }

  if (!window._bookingSyncListenerBound) {
    window._bookingSyncListenerBound = true;
    window.addEventListener('sb-data-synced', () => {
      renderPitchTypeSelector();
      initPitchSelect();
      renderSlots();
      renderServices();
      _cachedEligibleVouchers = null;
      renderVoucherQuickList();
      updateBillSummary();
    });
  }

  if (window.TURNSTILE_SITE_KEY) {
    initBookingTurnstile(window.TURNSTILE_SITE_KEY);
  } else {
    const meUrl = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath('api/auth.php?action=me') : '/api/auth.php?action=me';
    fetch(meUrl, { credentials: 'same-origin', cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d && d.turnstile_site_key) {
          window.TURNSTILE_SITE_KEY = d.turnstile_site_key;
          initBookingTurnstile(d.turnstile_site_key);
        }
      })
      .catch(() => {});
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBookingPage);
} else {
  initBookingPage();
}

function renderPitchTypeSelector() {
  const container = document.getElementById('pitch-type-selector');
  if (!container) return;

  const db = window.SanBongApp?.SanBongDB || window.SanBongDB;
  const allPitches = (db ? db.getPitches() : []).filter(p => p.status !== 'Ẩn');
  const getMinPriceLabel = (typeNum, fallbackNum) => {
    const matching = allPitches.filter(p => Number(p.type) === typeNum && Number(p.basePrice) > 0);
    const minVal = matching.length > 0
      ? Math.min(...matching.map(p => Number(p.basePrice)))
      : fallbackNum;
    const fmt = window.SanBongApp?.formatVND ? window.SanBongApp.formatVND(minVal) : (minVal.toLocaleString('vi-VN') + 'đ');
    return `Từ ${fmt}/ca 2h`;
  };

  const types = [
    { type: 5, name: 'Sân 5 người', desc: 'Mini 5 vs 5 · 20m x 40m', price: getMinPriceLabel(5, 350000) },
    { type: 7, name: 'Sân 7 người', desc: 'Chuẩn 7 vs 7 · 30m x 50m', price: getMinPriceLabel(7, 450000) },
    { type: 11, name: 'Sân 11 người', desc: 'Chuẩn FIFA · 68m x 105m', price: getMinPriceLabel(11, 900000) }
  ];

  container.innerHTML = types.map(t => {
    const isAct = t.type === selectedPitchType;
    return `
      <button type="button" onclick="selectPitchType(${t.type})" class="p-3 rounded-xl border text-left transition-all relative flex sm:flex-col items-center sm:items-start justify-between gap-2 sm:gap-1 cursor-pointer ${
        isAct
          ? 'bg-[#DCFCE7]/60 border-[#16A34A] ring-2 ring-[#16A34A]/25 shadow-sm'
          : 'bg-white border-[#E2E8F0] hover:border-[#16A34A]/60 hover:bg-[#F8FAFC]'
      }">
        <div class="min-w-0 sm:w-full">
          <div class="flex items-center justify-between gap-2 w-full">
            <span class="font-heading font-extrabold text-xs sm:text-sm whitespace-nowrap ${isAct ? 'text-[#15803D]' : 'text-[#0F172A]'}">${t.name}</span>
            <span class="hidden sm:inline-block w-2.5 h-2.5 rounded-full shrink-0 ${isAct ? 'bg-[#16A34A]' : 'bg-slate-300'}"></span>
          </div>
          <div class="text-[11px] sm:text-xs text-[#64748B] mt-0.5">${t.desc}</div>
        </div>
        <div class="flex items-center gap-2 shrink-0 sm:mt-1">
          <span class="text-xs font-bold text-[#16A34A] whitespace-nowrap">${t.price}</span>
          <span class="sm:hidden w-2.5 h-2.5 rounded-full shrink-0 ${isAct ? 'bg-[#16A34A]' : 'bg-slate-300'}"></span>
        </div>
      </button>
    `;
  }).join('');
}

window.selectPitchType = function(type) {
  selectedPitchType = Number(type);
  renderPitchTypeSelector();

  const db = window.SanBongApp?.SanBongDB || window.SanBongDB;
  if (!db) return;

  const pitchesOfType = db.getPitches().filter(p => Number(p.type) === selectedPitchType && p.status !== 'Ẩn');
  const stillValid = pitchesOfType.some(p => p.id === selectedPitchId);
  if (!stillValid && pitchesOfType.length > 0) {
    const activeOne = pitchesOfType.find(p => p.status !== 'Bảo trì') || pitchesOfType[0];
    selectedPitchId = activeOne.id;
  }

  initPitchSelect();
  renderSlots();
  updateBillSummary();
};

function initPitchSelect() {
  const db = window.SanBongApp?.SanBongDB || window.SanBongDB;
  if (!db) return;

  const allPitches = db.getPitches().filter(p => p.status !== 'Ẩn');
  const pitches = allPitches.filter(p => Number(p.type) === selectedPitchType);
  const select = document.getElementById('booking-pitch-select');
  if (!select) return;

  const typeBadge = document.getElementById('selected-type-badge');
  if (typeBadge) {
    typeBadge.textContent = `(${pitches.length} sân có sẵn)`;
  }

  const esc = window.SanBongApp?.escapeHTML || (s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])));
  select.innerHTML = pitches.map(p => `
    <option value="${esc(p.id)}" ${p.id === selectedPitchId ? 'selected' : ''} ${p.status === 'Bảo trì' ? 'disabled' : ''}>
      ${esc(p.name)} - ${window.SanBongApp ? window.SanBongApp.formatVND(p.basePrice) : (Number(p.basePrice) || 0) + 'đ'}/ca 2h ${p.status === 'Bảo trì' ? ' [ĐANG BẢO TRÌ]' : ''}
    </option>
  `).join('');
}

