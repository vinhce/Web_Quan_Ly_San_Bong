
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
    priceBaseEl.textContent = `${window.SanBongApp.formatVND(pitch.basePrice)}/ca 2h`;
  }

  const pricePeakEl = document.getElementById('detail-price-peak');
  if (pricePeakEl && window.SanBongApp) {
    if (!pitch.peakPrice || Number(pitch.peakPrice) === Number(pitch.basePrice)) {
      pricePeakEl.textContent = 'Không phụ thu cao điểm & cuối tuần';
    } else {
      pricePeakEl.textContent = `${window.SanBongApp.formatVND(pitch.peakPrice)}/ca 2h`;
    }
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

  const esc = (s) => (window.SanBongApp?.escapeHTML ? window.SanBongApp.escapeHTML(s) : String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])));

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
    amenitiesList.innerHTML = amenities.map(a => {
      const displayAmenity = /^Trọng tài theo yêu cầu$/i.test(String(a).trim())
        ? 'Thuê trọng tài theo yêu cầu (150k/trận · Miễn phí gói 3 tháng)'
        : a;
      return `
      <div class="flex items-center gap-2.5 p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
        <div class="w-6 h-6 rounded-full bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center shrink-0 text-xs font-bold">✓</div>
        <span class="font-medium text-[#0F172A]">${esc(displayAmenity)}</span>
      </div>
    `;
    }).join('');
  }

  const today = window.SanBongApp?.getLocalTodayISO ? window.SanBongApp.getLocalTodayISO() : new Date().toISOString().split('T')[0];
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

  const bookedCacheByDate = {};
  let latestRenderToken = 0;

  function applySlotsRender(selectedDate, serverInfo) {
    const slotsGrid = document.getElementById('detail-slots-grid');
    if (!slotsGrid || !window.SanBongApp?.SanBongDB) return;

    const rawSlots = window.SanBongApp.SanBongDB.getSlots(pitch.id, selectedDate);
    const bookedRaw = Array.isArray(serverInfo?.bookedList)
      ? serverInfo.bookedList
      : (Array.isArray(serverInfo?.bookedIds) ? serverInfo.bookedIds : []);
    const bookedSet = new Set(
      bookedRaw.map(x => (x && typeof x === 'object' ? String(x.slotId || x.slot_id || '') : String(x || ''))).filter(Boolean)
    );
    const maintWins = Array.isArray(serverInfo?.maintenanceWindows) ? serverInfo.maintenanceWindows : [];

    const slotsWithStatus = rawSlots.map(s => {
      if (s.status === 'Bảo trì') return s;
      const sStart = String(s.start || s.startTime || s.time.split('-')[0] || '').trim();
      const sEnd = String(s.end || s.endTime || s.time.split('-')[1] || '').trim();
      const hitMaint = maintWins.find(mw => {
        const mwStart = String(mw.start_time || '').slice(0, 5);
        const mwEnd = String(mw.end_time || '').slice(0, 5);
        return (!mwStart && !mwEnd) || (sStart < mwEnd && sEnd > mwStart);
      });
      if (hitMaint) {
        return { ...s, status: 'Bảo trì', maintenanceReason: hitMaint.reason || 'Bảo trì định kỳ' };
      }
      const overlapBooked = bookedRaw.some(b => {
        if (!b || typeof b !== 'object') return false;
        if (String(b.slotId || b.slot_id || '') === String(s.id) || String(b.slotTime || b.slot_time || '') === String(s.time)) {
          return true;
        }
        const bStart = String(b.startTime || b.start_time || (b.slotTime || b.slot_time || '').split('-')[0] || '').trim();
        const bEnd = String(b.endTime || b.end_time || (b.slotTime || b.slot_time || '').split('-')[1] || '').trim();
        return Boolean(sStart && sEnd && bStart && bEnd && sStart < bEnd && sEnd > bStart);
      });
      if (bookedSet.has(String(s.id)) || overlapBooked) {
        return { ...s, status: 'Đã đặt' };
      }
      return s;
    });

    slotsGrid.innerHTML = slotsWithStatus.map(s => {
      let bgCls = 'bg-white border-[#E2E8F0] hover:border-[#16A34A] text-[#0F172A] cursor-pointer';
      let tagCls = 'bg-[#DCFCE7] text-[#16A34A]';
      const isAvail = s.status === 'Trống';
      if (s.status === 'Đã xác nhận' || s.status === 'Đang đá' || s.status === 'Giữ chỗ' || s.status === 'Đã đặt') {
        bgCls = 'bg-[#F1F5F9] border-[#E2E8F0] text-[#94A3B8] cursor-not-allowed opacity-75';
        tagCls = 'bg-[#E2E8F0] text-[#64748B]';
      } else if (s.status === 'Bảo trì') {
        bgCls = 'hatch-slate border-[#CBD5E1] text-[#94A3B8] cursor-not-allowed';
        tagCls = 'bg-[#CBD5E1] text-[#475569]';
      }
      const calc = window.SanBongApp.SanBongDB.calculatePrice(pitch.id, selectedDate, s.id, [], '', 1);
      const displayPrice = calc ? calc.netPitchPrice : (s.isPeak ? pitch.peakPrice : pitch.basePrice);

      return `
        <button type="button" ${isAvail ? `data-slot-id="${esc(s.id)}" onclick="selectSlotFromGrid(this.getAttribute('data-slot-id'))"` : 'disabled'} class="w-full p-3 rounded-xl border ${bgCls} transition-all text-center flex flex-col justify-between">
          <div class="font-bold text-xs sm:text-sm">${esc(s.time)}</div>
          <div class="mt-1 flex items-center justify-center">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${tagCls}">${esc(s.status)}</span>
          </div>
          <div class="mt-1.5 text-[11px] font-semibold ${s.isPeak ? 'text-[#16A34A]' : 'text-[#64748B]'}">
            ${window.SanBongApp.formatVND(displayPrice)}
          </div>
        </button>
      `;
    }).join('');

    if (widgetSlotSelect) {
      const prevVal = widgetSlotSelect.value;
      widgetSlotSelect.innerHTML = slotsWithStatus.map(s => {
        const isDis = s.status !== 'Trống';
        const calc = window.SanBongApp.SanBongDB.calculatePrice(pitch.id, selectedDate, s.id, [], '', 1);
        const displayPrice = calc ? calc.netPitchPrice : (s.isPeak ? pitch.peakPrice : pitch.basePrice);
        return `<option value="${esc(s.id)}" ${isDis ? 'disabled' : ''}>
          ${esc(s.time)} · ${esc(s.status)} (${window.SanBongApp.formatVND(displayPrice)})
        </option>`;
      }).join('');
      if (prevVal && [...widgetSlotSelect.options].some(o => o.value === prevVal && !o.disabled)) {
        widgetSlotSelect.value = prevVal;
      } else {
        const firstEnabled = [...widgetSlotSelect.options].find(o => !o.disabled);
        if (firstEnabled) widgetSlotSelect.value = firstEnabled.value;
      }
      updateWidgetPrice();
    }
  }

  async function renderSlotsForDate(selectedDate) {
    const token = ++latestRenderToken;
    applySlotsRender(selectedDate, bookedCacheByDate[selectedDate] || null);
    if (bookedCacheByDate[selectedDate]) return;

    try {
      let info = null;
      if (window.SanBongApp?.SanBongAPI?.fetchBookedSlots) {
        info = await window.SanBongApp.SanBongAPI.fetchBookedSlots(pitch.id, selectedDate);
      } else {
        const url = window.SanBongApp?.getRelativePath
          ? window.SanBongApp.getRelativePath(`api/bookings.php?action=booked_slots&pitch_id=${encodeURIComponent(pitch.id)}&date=${encodeURIComponent(selectedDate)}`)
          : `/api/bookings.php?action=booked_slots&pitch_id=${encodeURIComponent(pitch.id)}&date=${encodeURIComponent(selectedDate)}`;
        const res = await fetch(url);
        const json = await res.json();
        if (res.ok && json?.success) {
          const list = Array.isArray(json.data) ? json.data : [];
          info = {
            bookedList: list,
            bookedIds: list,
            maintenanceWindows: Array.isArray(json.maintenanceWindows) ? json.maintenanceWindows : []
          };
        }
      }
      if (info) {
        bookedCacheByDate[selectedDate] = info;
        if (token === latestRenderToken) {
          applySlotsRender(selectedDate, bookedCacheByDate[selectedDate]);
        }
      }
    } catch (err) {
      console.warn('Không thể tải khung giờ đã đặt của sân:', err.message);
    }
  }

  function updateWidgetPrice() {
    if (!widgetSlotSelect || !window.SanBongApp?.SanBongDB) return;
    const slotId = widgetSlotSelect.value;
    const selDate = widgetDateInput ? widgetDateInput.value : today;
    const calc = window.SanBongApp.SanBongDB.calculatePrice(pitch.id, selDate, slotId, [], '', 1);
    const slots = window.SanBongApp.SanBongDB.getTimeSlots();
    const slot = slots.find(s => s.id === slotId) || slots[0];
    const price = calc ? calc.netPitchPrice : (slot?.isPeak ? pitch.peakPrice : pitch.basePrice);
    const deposit = calc ? calc.depositAmount : Math.round(price * 0.3);
    const remain = calc ? calc.remainingAmount : (price - deposit);

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
  loadFieldReviews(pitch.id);
});

async function loadFieldReviews(pitchId) {
  const avgEl = document.getElementById('field-avg-rating');
  const countEl = document.getElementById('field-total-reviews');
  const listEl = document.getElementById('field-reviews-list');
  if (!listEl) return;

  const esc = (s) => (window.SanBongHelpers ? window.SanBongHelpers.escapeHTML(s) : String(s || ''));
  const getRel = (p) => (window.SanBongHelpers ? window.SanBongHelpers.getRelativePath(p) : '/' + p);

  try {
    const res = await fetch(getRel('api/reviews.php?pitch_id=' + encodeURIComponent(pitchId)));
    const json = await res.json();
    if (!json.success || !json.data) throw new Error('Lỗi tải đánh giá');

    const { reviews, stats } = json.data;
    const revTotal = Number(stats.total_reviews || 0);
    if (avgEl) avgEl.textContent = revTotal > 0 ? `★ ${Number(stats.avg_rating || 0).toFixed(1)}` : '★ —';
    if (countEl) countEl.textContent = revTotal > 0 ? `(${revTotal} lượt đánh giá thực tế)` : '(Chưa có đánh giá nào)';
    const heroRatingEl = document.getElementById('detail-hero-rating');
    if (heroRatingEl) {
      if (revTotal > 0) {
        heroRatingEl.className = 'flex items-center gap-1 text-xs font-bold text-[#0F172A] bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200';
        heroRatingEl.innerHTML = `<span class="text-[#F59E0B]">★</span> ${Number(stats.avg_rating || 0).toFixed(1)} (${revTotal} lượt đánh giá)`;
      } else {
        heroRatingEl.className = 'flex items-center gap-1 text-xs font-bold text-[#64748B] bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200';
        heroRatingEl.textContent = 'Chưa có đánh giá';
      }
    }

    if (!reviews || reviews.length === 0) {
      listEl.innerHTML = `<div class="p-4 rounded-xl bg-[#F8FAFC] border border-dashed border-[#CBD5E1] text-xs text-[#64748B] text-center">Chưa có đánh giá nào cho sân này. Hãy là đội bóng đầu tiên để lại nhận xét sau trận đấu!</div>`;
      return;
    }

    listEl.innerHTML = reviews.map(r => {
      const stars = '★'.repeat(r.rating || 5) + '☆'.repeat(5 - (r.rating || 5));
      return `
        <div class="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
          <div class="flex items-center justify-between">
            <div>
              <span class="font-bold text-xs text-[#0F172A]">${esc(r.customer_name)}</span>
              <span class="text-[11px] text-[#94A3B8] ml-2">${esc((r.created_at || '').slice(0, 10))}</span>
            </div>
            <span class="text-xs text-[#F59E0B] tracking-widest">${stars}</span>
          </div>
          <p class="text-xs text-[#475569] leading-relaxed">${esc(r.comment || 'Khách hài lòng với chất lượng sân.')}</p>
          ${r.staff_reply ? `
            <div class="mt-2 p-2.5 rounded-lg bg-green-50 border border-green-100 text-xs text-green-800">
              <strong class="font-bold">Phản hồi từ Sân Bóng Pro:</strong> ${esc(r.staff_reply)}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  } catch (err) {
    if (avgEl) avgEl.textContent = '★ —';
    if (countEl) countEl.textContent = '(Tạm thời chưa tải được đánh giá)';
    const heroRatingEl = document.getElementById('detail-hero-rating');
    if (heroRatingEl) {
      heroRatingEl.className = 'flex items-center gap-1 text-xs font-bold text-[#64748B] bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200';
      heroRatingEl.textContent = 'Chưa có đánh giá';
    }
    listEl.innerHTML = `<div class="text-xs text-[#64748B] py-4 text-center">Tạm thời chưa tải được nhận xét. Vui lòng thử lại sau.</div>`;
  }
}
