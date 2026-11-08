/**
 * SÂN BÓNG PRO - TRANG CHỦ LOGIC (index.js)
 * Tích hợp Fetch API tải thời tiết thời gian thực và nạp danh sách sân
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Render Hero Pitch Vector Background
  const heroBg = document.getElementById('hero-pitch-bg');
  if (heroBg && window.SanBongApp) {
    heroBg.innerHTML = window.SanBongApp.renderPitchSVG('hero', 'h-full');
  }

  // Set default search date là hôm nay
  const searchDateInput = document.getElementById('search-date');
  if (searchDateInput) {
    const today = new Date().toISOString().split('T')[0];
    searchDateInput.value = today;
  }

  // 2. FETCH THỜI TIẾT THỜI GIAN THỰC (FETCH API)
  const weatherBadge = document.getElementById('hero-weather-badge');
  if (weatherBadge && window.SanBongApp?.SanBongAPI) {
    try {
      const weather = await window.SanBongApp.SanBongAPI.fetchWeather();
      weatherBadge.innerHTML = `
        <span>${weather.icon}</span>
        <span>Mỹ Đình: <b>${weather.temperature}°C</b> · ${weather.condition}</span>
      `;
    } catch (e) {
      weatherBadge.innerHTML = `<span>☀️</span><span>Mỹ Đình: 26°C · Sân khô ráo</span>`;
    }
  }

  // 3. FETCH & RENDER FEATURED PITCHES CAROUSEL (FETCH API)
  const grid = document.getElementById('featured-pitches-grid');
  let pitches = [];
  if (window.SanBongApp?.SanBongAPI) {
    try {
      pitches = await window.SanBongApp.SanBongAPI.getPitches();
    } catch (e) {
      pitches = window.SanBongApp.SanBongDB?.getPitches() || [];
    }
  } else {
    pitches = window.SanBongApp?.SanBongDB?.getPitches() || [];
  }

  if (grid && window.SanBongApp) {
    grid.innerHTML = pitches.map(p => `
      <div class="ui-card overflow-hidden flex flex-col hover:shadow-lg transition-all border-[#E2E8F0] w-[85vw] sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] shrink-0 snap-start">
        <!-- Pitch Graphic -->
        <div class="relative cursor-pointer" onclick="openPitchDetail('${p.id}')" title="Bấm xem chi tiết sân ${p.name}">
          ${window.SanBongApp.renderPitchSVG(p.variant || 'standard', 'h-48')}
          <div class="absolute top-3 left-3 flex gap-1.5">
            <span class="px-3 py-1 rounded-full text-xs font-bold bg-white text-[#0F172A] shadow-sm">${p.typeName}</span>
          </div>
          <div class="absolute bottom-3 left-3">
            <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-[#DCFCE7] text-[#16A34A] shadow-sm">
              Còn khung giờ trống hôm nay
            </span>
          </div>
        </div>

        <div class="p-5 flex-1 flex flex-col justify-between">
          <div>
            <h3 class="font-heading font-bold text-lg text-[#0F172A] mb-1.5 hover:text-[#16A34A] transition-colors cursor-pointer" onclick="openPitchDetail('${p.id}')">${p.name}</h3>
            <p class="text-xs text-[#64748B] mb-3 line-clamp-2">${p.grass}</p>
            <div class="flex flex-wrap gap-1.5 mb-4">
              ${(p.amenities || []).slice(0, 3).map(a => `<span class="px-2 py-0.5 rounded bg-[#F1F5F9] text-[11px] text-[#475569] font-medium">${a}</span>`).join('')}
            </div>
          </div>
          <div class="pt-3 border-t border-[#F1F5F9] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <div class="text-[11px] text-[#64748B]">Giá từ</div>
              <div class="font-heading font-extrabold text-[#16A34A] text-base sm:text-lg">${window.SanBongApp.formatVND(p.basePrice)}<span class="text-xs font-normal text-[#64748B]">/trận</span></div>
            </div>
            <div class="flex items-center gap-1.5">
              <button onclick="openPitchDetail('${p.id}')" class="btn-sm btn-secondary text-xs font-bold px-3 hover:border-[#16A34A] hover:text-[#16A34A] transition-colors">
                Chi tiết sân
              </button>
              <a href="html/booking.html?pitchId=${p.id}" class="btn-sm btn-primary text-xs font-bold px-3 shadow-sm hover:bg-[#15803D] transition-colors">
                Đặt sân ngay
              </a>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    // Popup Modal chi tiết sân khi click nút [Chi tiết sân]
    window.openPitchDetail = function(pitchId) {
      const db = window.SanBongApp?.SanBongDB;
      const pitch = db ? db.getPitchById(pitchId) : null;
      if (!pitch) return;

      const modal = document.getElementById('pitch-detail-modal');
      const content = document.getElementById('modal-content');
      if (!modal || !content) return;

      const isMaint = pitch.status === 'Bảo trì';

      content.innerHTML = `
        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#DCFCE7] text-[#16A34A]">${pitch.typeName}</span>
              ${window.SanBongApp.statusPill(pitch.status)}
            </div>
            <h2 class="font-heading font-extrabold text-2xl text-[#0F172A]">${pitch.name}</h2>
            <div class="text-xs text-[#64748B] mt-0.5">${pitch.size} · ${pitch.description || pitch.grass}</div>
          </div>
          <button onclick="closeModal()" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold transition-colors">✕</button>
        </div>

        <div class="rounded-xl overflow-hidden border border-[#E2E8F0]">
          ${window.SanBongApp.renderPitchSVG(pitch.variant || 'standard', 'h-48')}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <div class="text-xs text-[#64748B]">Mặt cỏ thi đấu</div>
            <div class="text-xs font-bold text-[#0F172A] mt-1">${pitch.grass}</div>
          </div>
          <div class="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <div class="text-xs text-[#64748B]">Bảng giá theo giờ</div>
            <div class="text-xs font-bold text-[#16A34A] mt-1">
              Thường (05:30-17:30): ${window.SanBongApp.formatVND(pitch.basePrice)}/h<br>
              Giờ vàng (17:30-21:00): ${window.SanBongApp.formatVND(pitch.peakPrice)}/h
            </div>
          </div>
        </div>

        <div>
          <h4 class="font-heading font-bold text-sm text-[#0F172A] mb-2.5">Tiện ích tại sân</h4>
          <div class="grid grid-cols-2 gap-2 text-xs">
            ${(pitch.amenities || []).map(a => `
              <div class="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center gap-2">
                <span class="w-4 h-4 rounded-full bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center font-bold text-[10px]">✓</span>
                <span class="text-[#334155] font-medium">${a}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="pt-4 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
          <button onclick="closeModal()" class="btn-base btn-secondary text-xs">Đóng</button>
          ${isMaint ? `
            <button class="btn-base btn-disabled text-xs opacity-50 cursor-not-allowed" disabled>Sân đang bảo dưỡng</button>
          ` : `
            <a href="html/booking.html?pitchId=${pitch.id}" class="btn-base btn-primary text-xs font-bold px-5">
              Tiến hành chọn giờ & Đặt sân ngay →
            </a>
          `}
        </div>
      `;

      modal.classList.remove('hidden');
      modal.classList.add('flex');
    };

    window.closeModal = function() {
      const modal = document.getElementById('pitch-detail-modal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    };

    // Điều khiển Carousel cuộn ngang sang phải / sang trái
    const updateCarouselControls = () => {
      const maxScroll = grid.scrollWidth - grid.clientWidth;
      const isAtStart = grid.scrollLeft <= 10;
      const isAtEnd = grid.scrollLeft >= maxScroll - 10;

      const prevBtn = document.getElementById('featured-prev-btn');
      const nextBtn = document.getElementById('featured-next-btn');
      const floatPrev = document.getElementById('featured-float-prev');
      const floatNext = document.getElementById('featured-float-next');

      if (prevBtn) prevBtn.disabled = isAtStart;
      if (nextBtn) nextBtn.disabled = isAtEnd;

      if (floatPrev) {
        floatPrev.disabled = isAtStart;
        if (isAtStart) {
          floatPrev.classList.add('opacity-0', 'pointer-events-none');
        } else {
          floatPrev.classList.remove('opacity-0', 'pointer-events-none');
        }
      }

      if (floatNext) {
        floatNext.disabled = isAtEnd;
        if (isAtEnd) {
          floatNext.classList.add('opacity-0', 'pointer-events-none');
        } else {
          floatNext.classList.remove('opacity-0', 'pointer-events-none');
        }
      }
    };

    const scrollCarousel = (direction) => {
      const card = grid.querySelector('.ui-card');
      const cardWidth = card ? card.offsetWidth + 24 : 360;
      const isDesktop = window.innerWidth >= 1024;
      const scrollDelta = isDesktop ? cardWidth * 3 : cardWidth;
      grid.scrollBy({ left: direction * scrollDelta, behavior: 'smooth' });
    };

    ['featured-prev-btn', 'featured-float-prev'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', () => scrollCarousel(-1));
    });

    ['featured-next-btn', 'featured-float-next'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', () => scrollCarousel(1));
    });

    grid.addEventListener('scroll', updateCarouselControls, { passive: true });
    window.addEventListener('resize', updateCarouselControls, { passive: true });
    setTimeout(updateCarouselControls, 100);
  }

  // 4. Render Vouchers List
  const db = window.SanBongApp?.SanBongDB;
  const vouchers = db ? db.getVouchers() : [];
  const vouchersContainer = document.getElementById('vouchers-list');
  if (vouchersContainer) {
    vouchersContainer.innerHTML = vouchers.map(v => `
      <div class="ui-card p-4 border-l-4 ${v.code === 'WELCOME10' ? 'border-l-[#16A34A]' : 'border-l-[#F59E0B]'} flex items-center justify-between gap-3">
        <div>
          <div class="font-heading font-bold text-sm ${v.code === 'WELCOME10' ? 'text-[#16A34A]' : 'text-[#D97706]'}">
            ${v.code} · ${v.description}
          </div>
          <div class="text-xs text-[#64748B] mt-0.5">Áp dụng cho đơn từ ${window.SanBongApp.formatVND(v.minOrder)}</div>
        </div>
        <button onclick="copyVoucher('${v.code}')" class="btn-sm btn-secondary text-xs shrink-0 font-bold hover:border-[#16A34A] hover:text-[#16A34A]">
          Sao chép
        </button>
      </div>
    `).join('');
  }

  // 5. Xử lý Form tìm kiếm
  const searchForm = document.getElementById('hero-search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = document.getElementById('search-date').value;
      const t = document.getElementById('search-type').value;
      window.location.href = `html/fields.html?date=${encodeURIComponent(d)}&type=${encodeURIComponent(t)}`;
    });
  }
});

function copyVoucher(code) {
  navigator.clipboard.writeText(code).then(() => {
    alert('Đã sao chép mã ưu đãi ' + code + ' vào bộ nhớ tạm! Áp dụng tại bước thanh toán.');
  }).catch(() => {
    alert('Mã ưu đãi của bạn: ' + code);
  });
}
