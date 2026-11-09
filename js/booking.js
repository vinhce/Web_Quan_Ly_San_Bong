/**
 * SÂN BÓNG PRO - ĐẶT SÂN LOGIC (booking.js)
 */

let selectedPitchId = 'P7-A';
let selectedPitchType = 7;
let selectedDate = '';
let selectedSlotId = 'S08'; // mặc định
let appliedServices = [
  { id: 'SRV-WATER', quantity: 4 },
  { id: 'SRV-BIB', quantity: 2 }
];
let appliedVoucherCode = '';

function initBookingPage() {
  const db = window.SanBongApp?.SanBongDB || window.SanBongDB;
  if (!db) return;

  // Đọc query param pitchId hoặc type
  const urlParams = new URLSearchParams(window.location.search);
  const paramPitch = urlParams.get('pitchId') || urlParams.get('pitch');
  const paramType = urlParams.get('type');

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

  // Đặt ngày hôm nay
  const today = new Date().toISOString().split('T')[0];
  selectedDate = today;
  const dateInput = document.getElementById('booking-date-input');
  if (dateInput && !dateInput.value) dateInput.value = today;

  renderPitchTypeSelector();
  initPitchSelect();
  initDateStrip();
  renderSlots();
  renderServices();
  updateBillSummary();

  // Tự động điền thông tin nếu hội viên đã đăng nhập
  const curUser = window.SanBongApp?.SanBongDB?.getUser();
  if (curUser && curUser.name) {
    const nameInput = document.getElementById('cust-name');
    const phoneInput = document.getElementById('cust-phone');
    if (nameInput && !nameInput.value) nameInput.value = curUser.name;
    if (phoneInput && !phoneInput.value && curUser.phone) phoneInput.value = curUser.phone;
  }

  // Sự kiện đổi sân
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

  // Sự kiện đổi ngày
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

  // Sự kiện Voucher
  const voucherBtn = document.getElementById('apply-voucher-btn');
  if (voucherBtn && !voucherBtn._bound) {
    voucherBtn._bound = true;
    voucherBtn.addEventListener('click', applyVoucher);
  }

  // Nút thanh toán chuyển qua checkout.html
  const checkoutBtn = document.getElementById('proceed-checkout-btn');
  if (checkoutBtn && !checkoutBtn._bound) {
    checkoutBtn._bound = true;
    checkoutBtn.addEventListener('click', proceedToCheckout);
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

  const types = [
    { type: 5, name: 'Sân 5 người', desc: 'Mini 5 vs 5 · 20m x 40m', price: 'Từ 250.000đ/h' },
    { type: 7, name: 'Sân 7 người', desc: 'Chuẩn 7 vs 7 · 30m x 50m', price: 'Từ 280.000đ/h' },
    { type: 11, name: 'Sân 11 người', desc: 'Chuẩn FIFA · 68m x 105m', price: 'Từ 800.000đ/h' }
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

  const pitchesOfType = db.getPitches().filter(p => Number(p.type) === selectedPitchType);
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

  const allPitches = db.getPitches();
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
  updateBillSummary();
}

function renderSlots() {
  const db = window.SanBongApp.SanBongDB;
  const slotsWithStatus = db.getSlotsWithStatus(selectedPitchId, selectedDate);
  const container = document.getElementById('slots-container');
  if (!container) return;

  container.innerHTML = slotsWithStatus.map(s => {
    const isSelected = s.id === selectedSlotId;
    const isBooked = s.status === 'Đã đặt' || s.status === 'Khóa';
    const isPlaying = s.status === 'Đang đá';

    let chipCls = 'bg-white border border-[#16A34A] text-[#0F172A] hover:bg-[#DCFCE7]/30';
    let statusBadge = `<span class="text-[11px] text-[#16A34A] font-semibold">${s.isPeak ? 'Giờ vàng' : 'Thường'}</span>`;

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
      badge.textContent = `${activeSlotObj.time} (${activeSlotObj.isPeak ? 'Giờ vàng' : 'Giờ thường'})`;
      badge.className = 'px-3 py-1 rounded-full bg-[#DCFCE7] text-xs font-bold text-[#16A34A]';
    } else {
      badge.textContent = 'Chưa chọn giờ';
      badge.className = 'px-3 py-1 rounded-full bg-[#F1F5F9] text-xs font-bold text-[#64748B]';
    }
  }
}

function selectSlot(slotId) {
  selectedSlotId = slotId;
  renderSlots();
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

    return `
      <div class="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
        <div>
          <div class="text-sm font-bold text-[#0F172A]">${srv.name}</div>
          <div class="text-xs text-[#16A34A] font-semibold">${window.SanBongApp.formatVND(srv.price)} / ${srv.unit}</div>
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
  const v = db.getVouchers().find(vc => vc.code === code);
  if (v) {
    appliedVoucherCode = code;
    msg.textContent = `✓ Đã áp dụng: ${v.code} (${v.description})`;
    msg.className = 'text-xs mt-1.5 font-semibold text-[#16A34A]';
  } else {
    appliedVoucherCode = '';
    msg.textContent = '✕ Mã giảm giá không hợp lệ hoặc đã hết hạn.';
    msg.className = 'text-xs mt-1.5 font-semibold text-[#DC2626]';
  }
  updateBillSummary();
}

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
  const summaryDatetime = document.getElementById('summary-datetime');
  if (summaryDatetime) summaryDatetime.textContent = `${window.SanBongApp.formatDateVN(selectedDate)} · ${slotTimeText}`;

  const calc = db.calculatePrice(selectedPitchId, selectedDate, selectedSlotId, appliedServices, appliedVoucherCode);

  if (calc) {
    const elPitch = document.getElementById('summary-pitch-price');
    const elSrv = document.getElementById('summary-services-price');
    const elDisc = document.getElementById('summary-discount-price');
    const elTot = document.getElementById('summary-total-price');
    const elDep = document.getElementById('summary-deposit-price');
    const elRem = document.getElementById('summary-remaining-price');

    if (elPitch) elPitch.textContent = window.SanBongApp.formatVND(calc.pitchPrice);
    if (elSrv) elSrv.textContent = window.SanBongApp.formatVND(calc.serviceTotal);
    if (elDisc) elDisc.textContent = `-${window.SanBongApp.formatVND(calc.discountAmount)}`;
    if (elTot) elTot.textContent = window.SanBongApp.formatVND(calc.totalPrice);
    if (elDep) elDep.textContent = window.SanBongApp.formatVND(calc.depositAmount);
    if (elRem) elRem.textContent = window.SanBongApp.formatVND(calc.remainingAmount);
  }
}

function proceedToCheckout() {
  const db = window.SanBongApp?.SanBongDB;
  const user = db ? db.getUser() : null;

  let name = document.getElementById('cust-name')?.value.trim() || '';
  let phone = document.getElementById('cust-phone')?.value.trim() || '';
  const note = document.getElementById('cust-note')?.value.trim() || '';
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

  // Lưu bản nháp đặt sân vào sessionStorage trước
  const bookingDraft = {
    pitchId: selectedPitchId,
    date: selectedDate,
    slotId: selectedSlotId,
    services: appliedServices,
    voucherCode: appliedVoucherCode,
    customerName: name || user?.name || '',
    phone: phone || user?.phone || '',
    note: note
  };
  sessionStorage.setItem('sb_booking_draft', JSON.stringify(bookingDraft));

  // Yêu cầu bắt buộc đăng nhập/đăng ký tài khoản để định danh người chuyển khoản & tích lũy điểm thưởng
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
