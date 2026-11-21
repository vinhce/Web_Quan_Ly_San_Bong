
let currentPitches = [];
let selectedFilterDate = '';

function initFieldsPage() {
  const app = window.SanBongApp;
  const db = window.SanBongDB || app?.SanBongDB;

  currentPitches = (db?.getPitches && db.getPitches().length > 0)
    ? db.getPitches()
    : (window.SanBongData?.DEFAULT_PITCHES || []);

  const urlParams = new URLSearchParams(window.location.search);
  const typeParam = urlParams.get('type');
  selectedFilterDate = urlParams.get('date') || '';
  if (typeParam && ['5', '7', '11'].includes(String(typeParam))) {
    const radio = document.querySelector('input[name="filter-type"][value="' + typeParam + '"]');
    if (radio) radio.checked = true;
  }

  renderPitches();
  setupEventListeners();

  if (!window._fieldsDataSyncedBound) {
    window._fieldsDataSyncedBound = true;
    window.addEventListener('sb-data-synced', () => {
      if (db?.getPitches) {
        currentPitches = db.getPitches();
        renderPitches();
      }
    });
  }

  if (app?.SanBongAPI?.getPitches) {
    app.SanBongAPI.getPitches()
      .then(pitches => {
        if (Array.isArray(pitches) && pitches.length > 0) {
          currentPitches = pitches;
          renderPitches();
        }
      })
      .catch(err => {
        console.warn('Revalidate fields ngầm:', err.message);
      });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFieldsPage);
} else {
  initFieldsPage();
}

function renderPitches() {
  const typeVal = document.querySelector('input[name="filter-type"]:checked')?.value || 'all';
  const activeOnly = document.getElementById('filter-active-only')?.checked;
  const maxPrice = Number(document.getElementById('price-range')?.value) || 1500000;
  const sortVal = document.getElementById('sort-select')?.value || 'default';

  let list = currentPitches.filter(p => {
    if (typeVal !== 'all' && String(p.type) !== String(typeVal)) return false;
    if (activeOnly && p.status !== 'Hoạt động') return false;
    if (p.basePrice > maxPrice) return false;
    return true;
  });

  if (sortVal === 'price-asc') {
    list.sort((a, b) => a.basePrice - b.basePrice);
  } else if (sortVal === 'price-desc') {
    list.sort((a, b) => b.basePrice - a.basePrice);
  }

  const grid = document.getElementById('pitches-grid');
  const empty = document.getElementById('no-pitches-state');
  if (!grid) return;

  if (list.length === 0) {
    grid.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  } else {
    if (empty) empty.classList.add('hidden');
  }

  const app = window.SanBongApp;
  const esc = (s) => (app?.escapeHTML ? app.escapeHTML(s) : String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])));
  const buildBookingHref = (pitchId) => `/booking?pitchId=${encodeURIComponent(pitchId)}${selectedFilterDate ? '&date=' + encodeURIComponent(selectedFilterDate) : ''}`;

  grid.innerHTML = list.map(p => {
    const safeId = esc(p.id);
    const isMaint = p.status === 'Bảo trì' || Boolean(p.inMaintenance);
    const ratingText = Number(p.reviewCount || 0) > 0
      ? `${Number(p.rating || 5).toFixed(1)} (${Number(p.reviewCount)})`
      : '5.0 (Mới)';
    return `
      <div class="ui-card overflow-hidden flex flex-col hover:shadow-lg transition-all border-[#E2E8F0]">
        <div class="relative cursor-pointer overflow-hidden" data-pitch-id="${safeId}" onclick="openPitchDetail(this.getAttribute('data-pitch-id'))">
          ${app?.renderPitchSVG ? app.renderPitchSVG(p.variant || 'standard', 'h-48') : ''}
          <div class="absolute top-3 left-3 flex gap-1.5">
            <span class="px-3 py-1 rounded-full text-xs font-bold bg-white text-[#0F172A] shadow-sm">${esc(p.typeName)}</span>
            ${p.id === 'P11-ALL' ? '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-[#DBEAFE] text-[#2563EB] shadow-sm">Ghép 7-A + 7-B</span>' : ''}
          </div>
          <div class="absolute top-3 right-3">
            ${app?.statusPill ? app.statusPill(p.status) : `<span>${esc(p.status)}</span>`}
          </div>
          <div class="absolute bottom-3 left-3">
            <span class="px-2.5 py-1 rounded-full text-xs font-bold ${isMaint ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-[#DCFCE7] text-[#16A34A]'} shadow-sm">
              ${isMaint ? 'Đang bảo dưỡng mặt cỏ' : 'Sẵn sàng nhận lịch hôm nay'}
            </span>
          </div>
        </div>

        <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <h3 class="font-heading font-bold text-lg text-[#0F172A] cursor-pointer hover:text-[#16A34A]" data-pitch-id="${safeId}" onclick="openPitchDetail(this.getAttribute('data-pitch-id'))">${esc(p.name)}</h3>
              <div class="flex items-center gap-1 text-xs font-bold text-[#0F172A]">
                <span class="text-[#F59E0B]">★</span> ${esc(ratingText)}
              </div>
            </div>
            <div class="text-xs text-[#64748B] mb-2">${esc(p.size)} · ${esc(p.grass)}</div>
            <div class="flex items-baseline gap-2">
              <span class="text-base font-extrabold text-[#16A34A]">${app?.formatVND ? app.formatVND(p.basePrice) : esc(p.basePrice) + 'đ'}/h</span>
              <span class="text-xs text-[#94A3B8]">Giờ cao điểm: ${app?.formatVND ? app.formatVND(p.peakPrice) : esc(p.peakPrice) + 'đ'}/h</span>
            </div>
          </div>

          <div class="pt-3 border-t border-[#F1F5F9] flex items-center gap-3">
            <button type="button" data-pitch-id="${safeId}" onclick="openPitchDetail(this.getAttribute('data-pitch-id'))" class="btn-base btn-secondary flex-1 text-xs">
              Xem chi tiết sân
            </button>
            ${isMaint ? `
              <button class="btn-base btn-disabled flex-1 text-xs opacity-50 cursor-not-allowed" disabled>
                Đang bảo trì
              </button>
            ` : `
              <a href="${buildBookingHref(p.id)}" class="btn-base btn-primary flex-1 text-xs text-center">
                Đặt sân này
              </a>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function setupEventListeners() {
  document.querySelectorAll('input[name="filter-type"]').forEach(r => {
    if (!r._bound) {
      r._bound = true;
      r.addEventListener('change', renderPitches);
    }
  });
  const activeCheck = document.getElementById('filter-active-only');
  if (activeCheck && !activeCheck._bound) {
    activeCheck._bound = true;
    activeCheck.addEventListener('change', renderPitches);
  }
  const sortSel = document.getElementById('sort-select');
  if (sortSel && !sortSel._bound) {
    sortSel._bound = true;
    sortSel.addEventListener('change', renderPitches);
  }

  const priceRange = document.getElementById('price-range');
  const priceLabel = document.getElementById('price-val-label');
  if (priceRange && priceLabel && !priceRange._bound) {
    priceRange._bound = true;
    priceRange.addEventListener('input', (e) => {
      priceLabel.textContent = (window.SanBongApp?.formatVND ? window.SanBongApp.formatVND(e.target.value) : e.target.value) + '/h';
      renderPitches();
    });
  }

  const resetBtn = document.getElementById('reset-filter-btn');
  if (resetBtn && !resetBtn._bound) {
    resetBtn._bound = true;
    resetBtn.addEventListener('click', () => {
      const defaultRadio = document.querySelector('input[name="filter-type"][value="all"]');
      if (defaultRadio) defaultRadio.checked = true;
      if (activeCheck) activeCheck.checked = true;
      if (priceRange) priceRange.value = 1500000;
      if (priceLabel) priceLabel.textContent = '1.500.000đ/h';
      if (sortSel) sortSel.value = 'default';
      renderPitches();
    });
  }
}

function openPitchDetail(pitchId) {
  const db = window.SanBongApp?.SanBongDB || window.SanBongDB;
  const pitch = db?.getPitchById ? db.getPitchById(pitchId) : currentPitches.find(x => x.id === pitchId);
  if (!pitch) return;

  const modal = document.getElementById('pitch-detail-modal');
  const content = document.getElementById('modal-content');
  if (!modal || !content) return;

  const app = window.SanBongApp;
  const esc = (s) => (app?.escapeHTML ? app.escapeHTML(s) : String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])));
  const isMaint = pitch.status === 'Bảo trì' || Boolean(pitch.inMaintenance);
  const bookingHref = `/booking?pitchId=${encodeURIComponent(pitch.id)}${selectedFilterDate ? '&date=' + encodeURIComponent(selectedFilterDate) : ''}`;

  content.innerHTML = `
    <div class="flex items-start justify-between">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#DCFCE7] text-[#16A34A]">${esc(pitch.typeName)}</span>
          ${app?.statusPill ? app.statusPill(pitch.status) : `<span>${esc(pitch.status)}</span>`}
        </div>
        <h2 class="font-heading font-extrabold text-2xl text-[#0F172A]">${esc(pitch.name)}</h2>
        <div class="text-xs text-[#64748B] mt-0.5">${esc(pitch.size)} · ${esc(pitch.description || pitch.grass)}</div>
      </div>
      <button onclick="closeModal()" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold">✕</button>
    </div>

    <div class="rounded-xl overflow-hidden border border-[#E2E8F0]">
      ${app?.renderPitchSVG ? app.renderPitchSVG(pitch.variant || 'standard', 'h-48') : ''}
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div class="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
        <div class="text-xs text-[#64748B]">Mặt cỏ thi đấu</div>
        <div class="text-xs font-bold text-[#0F172A] mt-1">${esc(pitch.grass)}</div>
      </div>
      <div class="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
        <div class="text-xs text-[#64748B]">Bảng giá theo giờ</div>
        <div class="text-xs font-bold text-[#16A34A] mt-1">
          Thường (05:30-16:30): ${app?.formatVND ? app.formatVND(pitch.basePrice) : esc(pitch.basePrice)}/h<br>
          Giờ cao điểm (16:30-20:30): ${app?.formatVND ? app.formatVND(pitch.peakPrice) : esc(pitch.peakPrice)}/h
        </div>
      </div>
    </div>

    <div>
      <h4 class="font-heading font-bold text-sm text-[#0F172A] mb-2.5">Tiện ích tại sân</h4>
      <div class="grid grid-cols-2 gap-2 text-xs">
        ${(pitch.amenities || []).map(a => `
          <div class="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center gap-2">
            <span class="w-4 h-4 rounded-full bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center font-bold text-[10px]">✓</span>
            <span class="text-[#334155] font-medium">${esc(a)}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="pt-4 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
      <button onclick="closeModal()" class="btn-base btn-secondary text-xs">Đóng</button>
      ${isMaint ? `
        <button class="btn-base btn-disabled text-xs opacity-50 cursor-not-allowed" disabled>Sân đang bảo dưỡng</button>
      ` : `
        <a href="${bookingHref}" class="btn-base btn-primary text-xs">
          Tiến hành chọn giờ & Đặt sân ngay
        </a>
      `}
    </div>
  `;

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeModal() {
  const modal = document.getElementById('pitch-detail-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}
