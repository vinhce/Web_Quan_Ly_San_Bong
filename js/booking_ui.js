
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
    // Khi Ä‘áº·t gÃ³i: KhÃ´ng cáº§n gá»i thÃªm dá»‹ch vá»¥ vÃ¬ gÃ³i Ä‘Ã£ bao gá»“m quÃ  táº·ng trá»n gÃ³i
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
        <span class="text-xl shrink-0">${g.icon || 'ðŸŽ'}</span>
        <div class="flex-1">
          <div class="font-bold text-[#0F172A] text-xs">${g.name}</div>
          <div class="text-[11px] text-slate-500 font-medium">TÃ i trá»£ miá»…n phÃ­: <b>${window.SanBongApp.formatVND(g.lineValue)}/tráº­n</b> â†’ <b class="text-[#15803D]">0Ä‘</b></div>
        </div>
      </div>
    `).join('');

    giftCard.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
        <div class="flex items-center gap-2">
          <span class="text-xl">ðŸŽ</span>
          <div>
            <div class="text-xs font-extrabold text-[#0F172A] uppercase tracking-wide">Äáº·c quyá»n tÃ i trá»£ má»—i tráº­n thi Ä‘áº¥u</div>
            <div class="text-[11px] text-[#15803D] font-bold">${promo.title} Â· Giáº£m ${Math.round(promo.discountRate * 100)}% tiá»n sÃ¢n</div>
          </div>
        </div>
        <span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-extrabold text-[10px] uppercase shadow-2xs">${promo.badge}</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
        ${giftsHtml}
      </div>

      <div class="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2 mt-1 font-semibold">
        <span>ðŸ’° Tá»•ng tÃ i trá»£ quÃ  táº·ng suá»‘t ${promo.weeks} tuáº§n: <b>${window.SanBongApp.formatVND(promo.totalGiftValue)}</b></span>
        <span class="px-2 py-0.5 rounded bg-[#16A34A] text-white font-extrabold text-[11px]">TÃ€I TRá»¢ 100% (0Ä‘)</span>
      </div>
    `;
    giftCard.classList.remove('hidden');
  }

  if (countBadge) {
    countBadge.textContent = `${monthlyWeeks} buá»•i thi Ä‘áº¥u (${promo ? promo.months + ' thÃ¡ng' : ''})`;
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
      if (found && (found.status === 'ÄÃ£ Ä‘áº·t' || found.status === 'Äang Ä‘Ã¡' || found.status === 'Báº£o trÃ¬')) {
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
        <span>Buá»•i ${item.index}: ${item.label}</span>
        <span>${item.isFree ? 'âœ“ Trá»‘ng' : 'âš ï¸ Äá»•i giá» linh hoáº¡t'}</span>
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
        if (bannerTitle) bannerTitle.textContent = 'ÄÃƒ BAO Gá»’M TRá»ŒN GÃ“I: 2 THÃ™NG NÆ¯á»šC + 1 TRá»ŒNG TÃ€I Má»–I TRáº¬N';
        if (bannerDesc) bannerDesc.innerHTML = 'GÃ³i 3 ThÃ¡ng cá»§a báº¡n Ä‘Ã£ Ä‘Æ°á»£c <b>Táº¶NG Sáº´N 2 THÃ™NG NÆ¯á»šC (48 CHAI) + 1 TRá»ŒNG TÃ€I CHUYÃŠN NGHIá»†P</b> cho má»—i tráº­n thi Ä‘áº¥u (0Ä‘). Báº¡n khÃ´ng cáº§n chá»n thÃªm dá»‹ch vá»¥ á»Ÿ dÆ°á»›i!';
      } else if (monthlyWeeks >= 8) {
        if (bannerTitle) bannerTitle.textContent = 'ÄÃƒ BAO Gá»’M TRá»ŒN GÃ“I: 1 THÃ™NG NÆ¯á»šC + 1 Bá»˜ ÃO BIB Má»–I TRáº¬N';
        if (bannerDesc) bannerDesc.innerHTML = 'GÃ³i 2 ThÃ¡ng cá»§a báº¡n Ä‘Ã£ Ä‘Æ°á»£c <b>Táº¶NG Sáº´N 1 THÃ™NG NÆ¯á»šC (24 CHAI) + 1 Bá»˜ ÃO BIB</b> cho má»—i tráº­n thi Ä‘áº¥u (0Ä‘).';
      } else {
        if (bannerTitle) bannerTitle.textContent = 'ÄÃƒ BAO Gá»’M TRá»ŒN GÃ“I: 1 Lá»C NÆ¯á»šC + MIá»„N PHÃ BÃ“NG ÄÃ Má»–I TRáº¬N';
        if (bannerDesc) bannerDesc.innerHTML = 'GÃ³i 1 ThÃ¡ng cá»§a báº¡n Ä‘Ã£ Ä‘Æ°á»£c <b>Táº¶NG Sáº´N 1 Lá»C NÆ¯á»šC (12 CHAI) + BÃ“NG ÄÃ</b> cho má»—i tráº­n thi Ä‘áº¥u (0Ä‘).';
      }
    }

    if (wrapper) {
      if (extraServicesCollapsed) {
        wrapper.classList.add('hidden');
        if (toggleBtnText) toggleBtnText.textContent = 'Gá»i thÃªm dá»‹ch vá»¥ phÃ¡t sinh khÃ¡c ngoÃ i gÃ³i';
      } else {
        wrapper.classList.remove('hidden');
        if (toggleBtnText) toggleBtnText.textContent = 'Thu gá»n danh sÃ¡ch dá»‹ch vá»¥ ngoÃ i gÃ³i';
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
  container.innerHTML = '<span class="text-[11px] text-[#64748B]">Gá»£i Ã½ 1 cháº¡m:</span>' +
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
      const activeOne = pitchesOfType.find(p => p.status !== 'Báº£o trÃ¬') || pitchesOfType[0];
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

  function fillBookingUserInfo(u) {
    const curUser = u || window.SanBongApp?.SanBongDB?.getUser();
    if (curUser) {
      const name = curUser.full_name || curUser.name || '';
      const phone = curUser.phone || '';
      const nameInput = document.getElementById('cust-name');
      const phoneInput = document.getElementById('cust-phone');
      if (nameInput && !nameInput.value && name) nameInput.value = name;
      if (phoneInput && !phoneInput.value && phone) {
        phoneInput.value = phone;
        if (typeof checkBookingPhoneNoShow === 'function') {
          checkBookingPhoneNoShow(phone);
        }
      }
    }
  }

  fillBookingUserInfo();
  window.addEventListener('sb-auth-synced', (e) => {
    fillBookingUserInfo(e.detail);
  });
  if (window.SanBongApp?.authReady) {
    window.SanBongApp.authReady.then(() => fillBookingUserInfo());
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
  const allPitches = (db ? db.getPitches() : []).filter(p => p.status !== 'áº¨n');
  const getMinPriceLabel = (typeNum, fallbackNum) => {
    const matching = allPitches.filter(p => Number(p.type) === typeNum && Number(p.basePrice) > 0);
    const minVal = matching.length > 0
      ? Math.min(...matching.map(p => Number(p.basePrice)))
      : fallbackNum;
    const fmt = window.SanBongApp?.formatVND ? window.SanBongApp.formatVND(minVal) : (minVal.toLocaleString('vi-VN') + 'Ä‘');
    return `Tá»« ${fmt}/h`;
  };

  const types = [
    { type: 5, name: 'SÃ¢n 5 ngÆ°á»i', desc: 'Mini 5 vs 5 Â· 20m x 40m', price: getMinPriceLabel(5, 250000) },
    { type: 7, name: 'SÃ¢n 7 ngÆ°á»i', desc: 'Chuáº©n 7 vs 7 Â· 30m x 50m', price: getMinPriceLabel(7, 280000) },
    { type: 11, name: 'SÃ¢n 11 ngÆ°á»i', desc: 'Chuáº©n FIFA Â· 68m x 105m', price: getMinPriceLabel(11, 800000) }
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

  const pitchesOfType = db.getPitches().filter(p => Number(p.type) === selectedPitchType && p.status !== 'áº¨n');
  const stillValid = pitchesOfType.some(p => p.id === selectedPitchId);
  if (!stillValid && pitchesOfType.length > 0) {
    const activeOne = pitchesOfType.find(p => p.status !== 'Báº£o trÃ¬') || pitchesOfType[0];
    selectedPitchId = activeOne.id;
  }

  initPitchSelect();
  renderSlots();
  updateBillSummary();
};

function initPitchSelect() {
  const db = window.SanBongApp?.SanBongDB || window.SanBongDB;
  if (!db) return;

  const allPitches = db.getPitches().filter(p => p.status !== 'áº¨n');
  const pitches = allPitches.filter(p => Number(p.type) === selectedPitchType);
  const select = document.getElementById('booking-pitch-select');
  if (!select) return;

  const typeBadge = document.getElementById('selected-type-badge');
  if (typeBadge) {
    typeBadge.textContent = `(${pitches.length} sÃ¢n cÃ³ sáºµn)`;
  }

  const esc = window.SanBongApp?.escapeHTML || (s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])));
  select.innerHTML = pitches.map(p => `
    <option value="${esc(p.id)}" ${p.id === selectedPitchId ? 'selected' : ''} ${p.status === 'Báº£o trÃ¬' ? 'disabled' : ''}>
      ${esc(p.name)} - ${window.SanBongApp ? window.SanBongApp.formatVND(p.basePrice) : (Number(p.basePrice) || 0) + 'Ä‘'}/h ${p.status === 'Báº£o trÃ¬' ? ' [ÄANG Báº¢O TRÃŒ]' : ''}
    </option>
  `).join('');
}

