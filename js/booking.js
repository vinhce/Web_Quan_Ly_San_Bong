
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
    selectedDate = new Date().toISOString().split('T')[0];
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

  container.innerHTML = '<span class="text-[11px] text-[#64748B]">Gợi ý 1 chạm:</span>' +
    vouchers.map((v, idx) => {
      const cls = palettes[idx % palettes.length];
      const lbl = v.type === 'percent' ? `-${v.value}%` : `-${Math.round(v.value / 1000)}k`;
      return `<button type="button" onclick="quickApplyVoucher('${v.code}')" title="${v.description || ''}" class="px-2 py-0.5 rounded ${cls} text-[11px] font-bold border transition-colors">${v.code} (${lbl})</button>`;
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

  const today = new Date().toISOString().split('T')[0];
  selectedDate = today;
  const dateInput = document.getElementById('booking-date-input');
  if (dateInput) { dateInput.min = today; if (!dateInput.value || dateInput.value < today) dateInput.value = today; }

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

  select.innerHTML = pitches.map(p => `
    <option value="${p.id}" ${p.id === selectedPitchId ? 'selected' : ''} ${p.status === 'Bảo trì' ? 'disabled' : ''}>
      ${p.name} - ${window.SanBongApp ? window.SanBongApp.formatVND(p.basePrice) : p.basePrice + 'đ'}/h ${p.status === 'Bảo trì' ? ' [ĐANG BẢO TRÌ]' : ''}
    </option>
  `).join('');
}

let _bookingNoShowTimer = null;
async function checkBookingPhoneNoShow(rawPhone) {
  const warningEl = document.getElementById('booking-noshow-warning');
  if (!warningEl) return;
  const clean = String(rawPhone || '').replace(/\D+/g, '');
  if (clean.length < 9) {
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
          noShowCount = Math.max(noShowCount, Number(json.data.noShowCount ?? json.data.no_show_count ?? 0));
          debtAmount = Math.max(debtAmount, Number(json.data.debtAmount ?? json.data.debt_amount ?? 0));
        }
      }
    } catch (e) {}

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
    const iso = d.toISOString().split('T')[0];
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
  if (!pitchId || !dateStr) return [];
  const key = `${pitchId}__${dateStr}`;
  try {
    const getRel = window.SanBongApp?.getRelativePath || (p => '/' + p.replace(/^\//, ''));
    const url = getRel(`api/bookings.php?action=booked_slots&pitch_id=${encodeURIComponent(pitchId)}&date=${encodeURIComponent(dateStr)}`);
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data)) {
        serverBookedSlotsCache[key] = json.data;
        return json.data;
      }
    }
  } catch (e) {}
  return serverBookedSlotsCache[key] || [];
}

function renderSlots(skipServerFetch = false) {
  const db = window.SanBongApp.SanBongDB;
  const slotsWithStatus = db.getSlotsWithStatus(selectedPitchId, selectedDate);
  const container = document.getElementById('slots-container');
  if (!container) return;

  const cacheKey = `${selectedPitchId}__${selectedDate}`;
  const serverList = serverBookedSlotsCache[cacheKey] || [];
  if (Array.isArray(serverList) && serverList.length > 0) {
    slotsWithStatus.forEach(s => {
      const foundSrv = serverList.find(b => (b.slotId || b.slot_id) === s.id || (b.slotTime || b.slot_time) === s.time);
      if (foundSrv && s.status === 'Trống') {
        s.status = foundSrv.status === 'Đang đá' ? 'Đang đá' : 'Đã đặt';
      }
    });
  }

  const curSelectedObj = slotsWithStatus.find(s => s.id === selectedSlotId);
  if (curSelectedObj && (curSelectedObj.status === 'Đã đặt' || curSelectedObj.status === 'Khóa' || curSelectedObj.status === 'Đang đá')) {
    const firstFree = slotsWithStatus.find(s => s.status === 'Trống');
    selectedSlotId = firstFree ? firstFree.id : '';
  }

  container.innerHTML = slotsWithStatus.map(s => {
    const isSelected = s.id === selectedSlotId;
    const isBooked = s.status === 'Đã đặt' || s.status === 'Khóa';
    const isPlaying = s.status === 'Đang đá';

    let chipCls = 'bg-white border border-[#16A34A] text-[#0F172A] hover:bg-[#DCFCE7]/30';
    let statusBadge = `<span class="text-[11px] text-[#16A34A] font-semibold">${s.isPeak ? 'Cao điểm' : 'Thường'}</span>`;

    if (isSelected) {
      chipCls = 'bg-[#16A34A] text-white border-[#16A34A] shadow-md';
      statusBadge = `<span class="text-[11px] text-white font-bold">✓ Đang chọn</span>`;
    } else if (isPlaying) {
      chipCls = 'bg-[#DBEAFE] border border-[#2563EB] text-[#2563EB] cursor-not-allowed';
      statusBadge = `<span class="text-[11px] font-bold">Đang đá</span>`;
    } else if (isBooked) {
      chipCls = 'bg-[#F1F5F9] border border-[#E2E8F0] text-[#94A3B8] cursor-not-allowed';
      statusBadge = `<span class="text-[11px] line-through text-[#94A3B8]">Đã kín lịch</span>`;
    }

    return `
      <div onclick="${isBooked || isPlaying ? '' : `selectSlot('${s.id}')`}" class="slot-chip p-3 rounded-xl text-center flex flex-col justify-between ${chipCls}">
        <div class="text-xs sm:text-sm font-extrabold">${s.time}</div>
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
    fetchServerBookedSlots(selectedPitchId, selectedDate).then(list => {
      if (Array.isArray(list) && list.length > 0) {
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

    return `
      <div class="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
        <div>
          <div class="flex items-center gap-1.5">
            <span class="text-sm font-bold text-[#0F172A]">${srv.name}</span>
            ${pkgGiftBadge}
          </div>
          <div class="text-xs text-[#16A34A] font-semibold">${window.SanBongApp.formatVND(srv.price)} / ${srv.unit} ${pkgGiftBadge ? '<span class="text-slate-500 font-normal">(Giá nếu gọi thêm ngoài gói)</span>' : ''}</div>
        </div>
        <div class="flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-lg p-1">
          <button onclick="changeServiceQty('${srv.id}', -1)" class="w-6 h-6 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center font-bold text-xs">−</button>
          <span class="w-6 text-center font-heading font-bold text-xs">${qty}</span>
          <button onclick="changeServiceQty('${srv.id}', 1)" class="w-6 h-6 rounded bg-[#DCFCE7] text-[#16A34A] hover:bg-[#BBF7D0] flex items-center justify-center font-bold text-xs">+</button>
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
  const v = db.getVouchers().find(vc => vc.code.toUpperCase() === code);
  if (v) {
    const weeks = bookingMode === 'monthly' ? monthlyWeeks : 1;
    const preCalc = db.calculatePrice(selectedPitchId, selectedDate, selectedSlotId, appliedServices, '', weeks);
    const subtotal = preCalc ? preCalc.subtotal : 0;
    if (subtotal < (v.minOrder || 0)) {
      appliedVoucherCode = code;
      msg.textContent = `⚠️ Mã ${v.code} yêu cầu đơn tối thiểu ${window.SanBongApp.formatVND(v.minOrder)} (Hiện tại: ${window.SanBongApp.formatVND(subtotal)}). Hãy chọn thêm dịch vụ hoặc gói tháng!`;
      msg.className = 'text-xs mt-1.5 font-semibold text-[#D97706]';
    } else {
      appliedVoucherCode = code;
      msg.textContent = `✓ Đã áp dụng: ${v.code} (${v.description})`;
      msg.className = 'text-xs mt-1.5 font-semibold text-[#16A34A]';
    }
  } else {
    appliedVoucherCode = '';
    msg.textContent = '✕ Mã giảm giá không hợp lệ hoặc đã hết hạn.';
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
    if (elSrv) elSrv.textContent = window.SanBongApp.formatVND(calc.serviceTotal);
    if (elDisc) {
      const totalDisc = (calc.monthlyDiscountAmount || 0) + (calc.discountAmount || 0);
      elDisc.textContent = `-${window.SanBongApp.formatVND(totalDisc)}`;
    }
    if (elTot) elTot.textContent = window.SanBongApp.formatVND(calc.totalPrice);
    if (elDep) elDep.textContent = window.SanBongApp.formatVND(calc.depositAmount);
    if (elRem) elRem.textContent = window.SanBongApp.formatVND(calc.remainingAmount);

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

  if (!selectedSlotId) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Vui lòng chọn một khung giờ thi đấu còn trống trước khi tiếp tục.', 'warning');
    }
    const slotsEl = document.getElementById('slots-grid');
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
      window.SanBongApp.showToast('Vui lòng tích chọn đồng ý với chính sách cọc và giữ sân.', 'warning');
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
  sessionStorage.setItem('sb_booking_draft', JSON.stringify(bookingDraft));

  window.location.href = window.SanBongApp?.getRelativePath ? window.SanBongApp.getRelativePath('checkout') : '/checkout';
}
