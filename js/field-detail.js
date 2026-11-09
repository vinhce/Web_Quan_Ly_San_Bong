
document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const pitchId = urlParams.get('pitchId') || urlParams.get('id') || 'P5-A';

  let pitch = null;
  if (window.SanBongApp?.SanBongAPI) {
    try {
      const pitches = await window.SanBongApp.SanBongAPI.getPitches();
      pitch = pitches.find(p => p.id === pitchId) || pitches[0];
    } catch (e) {
      pitch = window.SanBongApp?.SanBongDB?.getPitchById(pitchId);
    }
  } else {
    pitch = window.SanBongApp?.SanBongDB?.getPitchById(pitchId);
  }

  if (!pitch && window.SanBongApp?.SanBongDB) {
    const all = window.SanBongApp.SanBongDB.getPitches();
    pitch = all[0];
  }

  if (!pitch) return;

  document.title = `${pitch.name} – Chi Tiết Sân Tiêu Chuẩn FIFA | Sân Bóng Pro`;
  const breadcrumbName = document.getElementById('breadcrumb-pitch-name');
  if (breadcrumbName) breadcrumbName.textContent = pitch.name;

  const svgContainer = document.getElementById('detail-pitch-svg');
  if (svgContainer && window.SanBongApp) {
    svgContainer.innerHTML = window.SanBongApp.renderPitchSVG(pitch.variant || 'standard', 'h-80 sm:h-96 w-full');
  }

  const titleEl = document.getElementById('detail-pitch-title');
  if (titleEl) titleEl.textContent = pitch.name;

  const descEl = document.getElementById('detail-pitch-desc');
  if (descEl) descEl.textContent = pitch.description || pitch.grass;

  const typeBadge = document.getElementById('detail-type-badge');
  if (typeBadge) typeBadge.textContent = pitch.typeName;

  const statusPillContainer = document.getElementById('detail-status-pill');
  if (statusPillContainer && window.SanBongApp) {
    statusPillContainer.innerHTML = window.SanBongApp.statusPill(pitch.status);
  }

  const priceBaseEl = document.getElementById('detail-price-base');
  if (priceBaseEl && window.SanBongApp) {
    priceBaseEl.textContent = `${window.SanBongApp.formatVND(pitch.basePrice)}/h`;
  }

  const pricePeakEl = document.getElementById('detail-price-peak');
  if (pricePeakEl && window.SanBongApp) {
    pricePeakEl.textContent = `${window.SanBongApp.formatVND(pitch.peakPrice)}/h`;
  }

  const specSize = document.getElementById('detail-spec-size');
  if (specSize) specSize.textContent = pitch.size;

  const specGrass = document.getElementById('detail-spec-grass');
  if (specGrass) specGrass.textContent = pitch.grass;

  const primaryBookBtn = document.getElementById('detail-primary-book-btn');
  if (primaryBookBtn) {
    if (pitch.status === 'Bảo trì') {
      primaryBookBtn.classList.remove('btn-primary');
      primaryBookBtn.classList.add('btn-disabled');
      primaryBookBtn.textContent = 'Sân đang bảo dưỡng cỏ';
      primaryBookBtn.removeAttribute('href');
      primaryBookBtn.setAttribute('disabled', 'true');
    } else {
      primaryBookBtn.href = `/booking?pitchId=${pitch.id}`;
    }
  }

  const amenitiesList = document.getElementById('detail-amenities-list');
  if (amenitiesList) {
    const amenities = pitch.amenities || [
      'Đèn LED 400W chống chói',
      'Bãi đỗ ô tô & xe máy an ninh',
      'Nước suối miễn phí',
      'Phòng tắm nóng lạnh riêng',
      'Wifi tốc độ cao',
      'Trọng tài theo yêu cầu'
    ];
    amenitiesList.innerHTML = amenities.map(a => `
      <div class="flex items-center gap-2.5 p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
        <div class="w-6 h-6 rounded-full bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center shrink-0 text-xs font-bold">✓</div>
        <span class="font-medium text-[#0F172A]">${a}</span>
      </div>
    `).join('');
  }

  const today = new Date().toISOString().split('T')[0];
  const scheduleDateInput = document.getElementById('detail-schedule-date');
  const widgetDateInput = document.getElementById('widget-date');
  const widgetSlotSelect = document.getElementById('widget-slot');

  if (scheduleDateInput) {
    scheduleDateInput.value = today;
    scheduleDateInput.min = today;
  }
  if (widgetDateInput) {
    widgetDateInput.value = today;
    widgetDateInput.min = today;
  }

  function renderSlotsForDate(selectedDate) {
    const slotsGrid = document.getElementById('detail-slots-grid');
    if (!slotsGrid || !window.SanBongApp?.SanBongDB) return;

    const slotsWithStatus = window.SanBongApp.SanBongDB.getSlots(pitch.id, selectedDate);
    slotsGrid.innerHTML = slotsWithStatus.map(s => {
      let bgCls = 'bg-white border-[#E2E8F0] hover:border-[#16A34A] text-[#0F172A] cursor-pointer';
      let tagCls = 'bg-[#DCFCE7] text-[#16A34A]';
      if (s.status === 'Đã xác nhận' || s.status === 'Đang đá' || s.status === 'Giữ chỗ') {
        bgCls = 'bg-[#F1F5F9] border-[#E2E8F0] text-[#94A3B8] cursor-not-allowed opacity-75';
        tagCls = 'bg-[#E2E8F0] text-[#64748B]';
      } else if (s.status === 'Bảo trì') {
        bgCls = 'hatch-slate border-[#CBD5E1] text-[#94A3B8] cursor-not-allowed';
        tagCls = 'bg-[#CBD5E1] text-[#475569]';
      }

      return `
        <div onclick="selectSlotFromGrid('${s.id}')" class="p-3 rounded-xl border ${bgCls} transition-all text-center flex flex-col justify-between">
          <div class="font-bold text-xs sm:text-sm">${s.time}</div>
          <div class="mt-1 flex items-center justify-center">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${tagCls}">${s.status}</span>
          </div>
          <div class="mt-1.5 text-[11px] font-semibold ${s.isPeak ? 'text-[#16A34A]' : 'text-[#64748B]'}">
            ${window.SanBongApp.formatVND(s.isPeak ? pitch.peakPrice : pitch.basePrice)}
          </div>
        </div>
      `;
    }).join('');

    if (widgetSlotSelect) {
      widgetSlotSelect.innerHTML = slotsWithStatus.map(s => {
        const isDis = s.status !== 'Trống';
        return `<option value="${s.id}" ${isDis ? 'disabled' : ''}>
          ${s.time} · ${s.status} (${window.SanBongApp.formatVND(s.isPeak ? pitch.peakPrice : pitch.basePrice)})
        </option>`;
      }).join('');
      updateWidgetPrice();
    }
  }

  function updateWidgetPrice() {
    if (!widgetSlotSelect || !window.SanBongApp?.SanBongDB) return;
    const slotId = widgetSlotSelect.value;
    const slots = window.SanBongApp.SanBongDB.getTimeSlots();
    const slot = slots.find(s => s.id === slotId) || slots[0];
    const isPeak = slot ? slot.isPeak : false;
    const price = isPeak ? pitch.peakPrice : pitch.basePrice;
    const deposit = Math.round(price * 0.3);
    const remain = price - deposit;

    const estPrice = document.getElementById('widget-est-price');
    const estDep = document.getElementById('widget-est-deposit');
    const estRem = document.getElementById('widget-est-remain');

    if (estPrice) estPrice.textContent = window.SanBongApp.formatVND(price);
    if (estDep) estDep.textContent = window.SanBongApp.formatVND(deposit);
    if (estRem) estRem.textContent = window.SanBongApp.formatVND(remain);
  }

  window.selectSlotFromGrid = function(slotId) {
    if (widgetSlotSelect) {
      widgetSlotSelect.value = slotId;
      updateWidgetPrice();
      widgetSlotSelect.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  if (scheduleDateInput) {
    scheduleDateInput.addEventListener('change', (e) => {
      if (widgetDateInput) widgetDateInput.value = e.target.value;
      renderSlotsForDate(e.target.value);
    });
  }

  if (widgetDateInput) {
    widgetDateInput.addEventListener('change', (e) => {
      if (scheduleDateInput) scheduleDateInput.value = e.target.value;
      renderSlotsForDate(e.target.value);
    });
  }

  if (widgetSlotSelect) {
    widgetSlotSelect.addEventListener('change', updateWidgetPrice);
  }

  const widgetSubmitBtn = document.getElementById('widget-submit-btn');
  if (widgetSubmitBtn) {
    widgetSubmitBtn.addEventListener('click', () => {
      const d = widgetDateInput ? widgetDateInput.value : today;
      const s = widgetSlotSelect ? widgetSlotSelect.value : '';
      window.location.href = `/booking?pitchId=${encodeURIComponent(pitch.id)}&date=${encodeURIComponent(d)}&slotId=${encodeURIComponent(s)}`;
    });
  }

  renderSlotsForDate(today);
});
