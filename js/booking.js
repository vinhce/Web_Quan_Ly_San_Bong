
let selectedPitchId = 'P7-A';
let selectedPitchType = 7;
let selectedDate = '';
let selectedSlotId = 'S08';
let bookingMode = 'single';
let monthlyWeeks = 12;
let monthlyDates = [];
let extraServicesCollapsed = false;
let appliedServices = [
  { id: 'SRV-WATER', quantity: 4 },
  { id: 'SRV-BIB', quantity: 2 }
];
let appliedVoucherCode = '';
let isCurrentPhoneBlacklisted = false;
let preselectedSlotId = '';
let bookingTurnstileToken = '';

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
    if (monthlyBtn) monthlyBtn.className = 'px-4 py-2.5 rounded-xl border-2 border-[#16A34A] bg-[#DCFCE7]/50 text-[#15803D] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm';
    if (singleBtn) singleBtn.className = 'px-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-[#475569] hover:border-[#16A34A] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all';
    if (panel) panel.classList.remove('hidden');
    // Khi đặt gói: Không cần gọi thêm dịch vụ vì gói đã bao gồm quà tặng trọn gói
    appliedServices = [];
    extraServicesCollapsed = true;
    updateMonthlyPackage();
  } else {
    if (singleBtn) singleBtn.className = 'px-4 py-2.5 rounded-xl border-2 border-[#16A34A] bg-[#DCFCE7]/50 text-[#15803D] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm';
    if (monthlyBtn) monthlyBtn.className = 'px-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-[#475569] hover:border-[#16A34A] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all';
    if (panel) panel.classList.add('hidden');
    monthlyDates = [];
    extraServicesCollapsed = false;
  }
  updatePackageServicesUI();
  renderServices();
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
          <div class="text-[11px] text-slate-500 font-medium">Tài trợ miễn phí: <b>${window.SanBongApp.formatVND(g.lineValue)}/trận</b> → <b class="text-[#15803D]">0đ</b></div>
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

function renderVoucherQuickList() {
  const container = document.getElementById('voucher-quick-list');
  if (!container) return;
  const db = window.SanBongApp?.SanBongDB || window.SanBongDB;
  if (!db) return;

  const vouchers = db.getVouchers();
  const palettes = [
    'bg-emerald-50 hover:bg-emerald-100 text-[#16A34A] border-emerald-200',
    'bg-amber-50 hover:bg-amber-100 text-[#D97706] border-amber-200',
    'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200',
    'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200',
    'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200',
    'bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-200'
  ];

  const esc = window.SanBongApp?.escapeHTML || (s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])));
  container.innerHTML = '<span class="text-[11px] text-[#64748B]">Gợi ý 1 chạm:</span>' +
    vouchers.map((v, idx) => {
      const cls = palettes[idx % palettes.length];
      const lbl = v.type === 'percent' ? `-${Number(v.value) || 0}%` : `-${Math.round((Number(v.value) || 0) / 1000)}k`;
      const escCode = esc(v.code || '');
      const escDesc = esc(v.description || '');
      return `<button type="button" data-code="${escCode}" onclick="quickApplyVoucher(this.getAttribute('data-code'))" title="${escDesc}" class="px-2 py-0.5 rounded ${cls} text-[11px] font-bold border transition-colors">${escCode} (${lbl})</button>`;
    }).join('');
}
window.renderVoucherQuickList = renderVoucherQuickList;

function initBookingPage() {
  const db = window.SanBongApp?.SanBongDB || window.SanBongDB;
  if (!db) return;

  const urlParams = new URLSearchParams(window.location.search);
  const paramPitch = urlParams.get('pitchId') || urlParams.get('pitch');
  const paramType = urlParams.get('type');
  const paramMode = urlParams.get('mode');
  const paramDate = urlParams.get('date');
  const paramSlotId = urlParams.get('slotId');

  if (paramMode === 'monthly') {
    setTimeout(() => {
      setBookingMode('monthly');
    }, 50);
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

  const today = window.SanBongApp?.getLocalTodayISO ? window.SanBongApp.getLocalTodayISO() : new Date().toISOString().split('T')[0];
  selectedDate = (paramDate && /^\d{4}-\d{2}-\d{2}$/.test(paramDate) && paramDate >= today) ? paramDate : today;
  if (paramSlotId) {
    preselectedSlotId = paramSlotId;
    selectedSlotId = paramSlotId;
  }
  const dateInput = document.getElementById('booking-date-input');
  if (dateInput) {
    dateInput.min = today;
    dateInput.value = selectedDate;
  }

  renderPitchTypeSelector();
  initPitchSelect();
  initDateStrip();
  renderSlots();
  renderServices();
  renderVoucherQuickList();
  updateMonthlyPackage();
  updateBillSummary();

  const curUser = window.SanBongApp?.SanBongDB?.getUser();
  if (curUser && curUser.name) {
    const nameInput = document.getElementById('cust-name');
    const phoneInput = document.getElementById('cust-phone');
    if (nameInput && !nameInput.value) nameInput.value = curUser.name;
    if (phoneInput && !phoneInput.value && curUser.phone) phoneInput.value = curUser.phone;
  }

  const custPhoneEl = document.getElementById('cust-phone');
  if (custPhoneEl && !custPhoneEl._noShowBound) {
    custPhoneEl._noShowBound = true;
    const handleCheckPhone = () => checkBookingPhoneNoShow(custPhoneEl.value);
    custPhoneEl.addEventListener('input', handleCheckPhone);
    custPhoneEl.addEventListener('change', handleCheckPhone);
    custPhoneEl.addEventListener('blur', handleCheckPhone);
    if (custPhoneEl.value) handleCheckPhone();
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
      selectedDate = e.target.value;
      initDateStrip();
      renderSlots();
      updateBillSummary();
    });
  }

  const voucherBtn = document.getElementById('apply-voucher-btn');
  if (voucherBtn && !voucherBtn._bound) {
    voucherBtn._bound = true;
    voucherBtn.addEventListener('click', applyVoucher);
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
    return `Từ ${fmt}/h`;
  };

  const types = [
    { type: 5, name: 'Sân 5 người', desc: 'Mini 5 vs 5 · 20m x 40m', price: getMinPriceLabel(5, 250000) },
    { type: 7, name: 'Sân 7 người', desc: 'Chuẩn 7 vs 7 · 30m x 50m', price: getMinPriceLabel(7, 280000) },
    { type: 11, name: 'Sân 11 người', desc: 'Chuẩn FIFA · 68m x 105m', price: getMinPriceLabel(11, 800000) }
  ];

  container.innerHTML = types.map(t => {
    const isAct = t.type === selectedPitchType;
    return `
      <button type="button" onclick="selectPitchType(${t.type})" class="p-2.5 sm:p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
        isAct
          ? 'bg-[#DCFCE7]/60 border-[#16A34A] ring-2 ring-[#16A34A]/25 shadow-sm'
          : 'bg-white border-[#E2E8F0] hover:border-[#16A34A]/60 hover:bg-[#F8FAFC]'
      }">
        <div class="flex items-center justify-between w-full mb-1">
          <span class="font-heading font-extrabold text-xs sm:text-sm ${isAct ? 'text-[#15803D]' : 'text-[#0F172A]'}">
            ${t.name}
          </span>
          <span class="w-2.5 h-2.5 rounded-full ${isAct ? 'bg-[#16A34A]' : 'bg-slate-300'}"></span>
        </div>
        <div class="text-[10px] sm:text-xs text-[#64748B] truncate">${t.desc}</div>
        <div class="text-[11px] sm:text-xs font-bold text-[#16A34A] mt-1">${t.price}</div>
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
      ${esc(p.name)} - ${window.SanBongApp ? window.SanBongApp.formatVND(p.basePrice) : (Number(p.basePrice) || 0) + 'đ'}/h ${p.status === 'Bảo trì' ? ' [ĐANG BẢO TRÌ]' : ''}
    </option>
  `).join('');
}

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
    : { noShowCount: 0, debtCount: 0, debtAmount: 0 };

  let noShowCount = Number(localStats.noShowCount || 0);
  let debtAmount = Number(localStats.debtAmount || 0);
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
            debtAmount = 0;
          } else {
            noShowCount = Math.max(noShowCount, Number(json.data.noShowCount ?? json.data.no_show_count ?? 0));
            debtAmount = Math.max(debtAmount, Number(json.data.debtAmount ?? json.data.debt_amount ?? 0));
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

    if (noShowCount >= 2 || debtAmount > 0) {
      const parts = [];
      if (noShowCount >= 2) {
        parts.push(`⚠️ CẢNH BÁO: SĐT này đã có ${noShowCount} lần đặt sân nhưng không đến (No-Show)! Bắt buộc thu cọc trước khi giữ sân.`);
      }
      if (debtAmount > 0) {
        const fmtDebt = window.SanBongApp?.formatVND ? window.SanBongApp.formatVND(debtAmount) : (debtAmount.toLocaleString('vi-VN') + 'đ');
        parts.push(`💸 SĐT này hiện còn đơn nợ chưa thanh toán: ${fmtDebt}.`);
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

  if (preselectedSlotId) {
    const preObj = slotsWithStatus.find(s => s.id === preselectedSlotId);
    if (preObj && preObj.status === 'Trống') {
      selectedSlotId = preselectedSlotId;
    }
    preselectedSlotId = '';
  }

  const curSelectedObj = slotsWithStatus.find(s => s.id === selectedSlotId);
  if (curSelectedObj && (curSelectedObj.status === 'Đã đặt' || curSelectedObj.status === 'Khóa' || curSelectedObj.status === 'Đang đá' || curSelectedObj.status === 'Bảo trì')) {
    const firstFree = slotsWithStatus.find(s => s.status === 'Trống');
    selectedSlotId = firstFree ? firstFree.id : '';
  }

  container.innerHTML = slotsWithStatus.map(s => {
    const isSelected = s.id === selectedSlotId;
    const isMaint = s.status === 'Bảo trì';
    const isBooked = s.status === 'Đã đặt' || s.status === 'Khóa';
    const isPlaying = s.status === 'Đang đá';
    const safeId = esc(s.id);
    const safeTime = esc(s.time);

    let chipCls = 'bg-white border border-[#16A34A] text-[#0F172A] hover:bg-[#DCFCE7]/30';
    let statusBadge = `<span class="text-[11px] text-[#16A34A] font-semibold">${s.isPeak ? 'Cao điểm' : 'Thường'}</span>`;

    if (isMaint) {
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

    const clickAttr = (isPlaying || isMaint)
      ? ''
      : (isBooked
        ? `onclick="openWaitlistPrompt(this.getAttribute('data-slot-id'), this.getAttribute('data-slot-time'))"`
        : `onclick="selectSlot(this.getAttribute('data-slot-id'))"`);

    return `
      <div data-slot-id="${safeId}" data-slot-time="${safeTime}" ${clickAttr} class="slot-chip p-3 rounded-xl text-center flex flex-col justify-between ${chipCls}" title="${isMaint ? esc(s.maintenanceReason || 'Sân đang bảo trì trong khung giờ này') : (isBooked ? 'Khung giờ đã kín. Nhấn để đăng ký danh sách chờ!' : '')}">
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
