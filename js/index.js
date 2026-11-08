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
      <div class="group ui-card overflow-hidden flex flex-col hover:shadow-xl transition-all border-[#E2E8F0] w-[85vw] sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] shrink-0 snap-start">
        <!-- Pitch Graphic with Smooth Hover Details Overlay -->
        <div class="relative overflow-hidden cursor-pointer" onclick="window.location.href='html/booking.html?pitchId=${p.id}'" title="Nhấn để đặt sân ${p.name}">
          ${window.SanBongApp.renderPitchSVG(p.variant || 'standard', 'h-48')}
          
          <!-- Normal badges (fade out on hover) -->
          <div class="absolute top-3 left-3 flex gap-1.5 transition-opacity duration-300 group-hover:opacity-0">
            <span class="px-3 py-1 rounded-full text-xs font-bold bg-white text-[#0F172A] shadow-sm">${p.typeName}</span>
          </div>
          <div class="absolute bottom-3 left-3 transition-opacity duration-300 group-hover:opacity-0">
            <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-[#DCFCE7] text-[#16A34A] shadow-sm">
              Còn khung giờ trống hôm nay
            </span>
          </div>

          <!-- DETAIL HOVER OVERLAY (Dạng sân hover hiển thị chi tiết) -->
          <div class="absolute inset-0 bg-[#0F172A]/90 backdrop-blur-sm text-white p-4 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-between z-10 pointer-events-none">
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-[11px] font-bold text-[#4ADE80] uppercase tracking-wider">${p.typeName} · Chuẩn FIFA</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#16A34A] text-white">Chi tiết sân</span>
              </div>
              <div class="text-xs space-y-1.5 text-slate-200">
                <div class="flex items-center gap-1.5">
                  <span class="text-slate-400">📐 Kích thước:</span>
                  <span class="font-semibold text-white">${p.size}</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="text-slate-400">💡 Chiếu sáng:</span>
                  <span class="font-semibold text-white">Đèn LED 400W chống chói</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="text-slate-400">🌿 Mặt cỏ:</span>
                  <span class="font-semibold text-white truncate">${p.grass.split(',')[0]}</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="text-slate-400">⚡ Giờ vàng:</span>
                  <span class="font-bold text-[#4ADE80]">${window.SanBongApp.formatVND(p.peakPrice)}/h</span>
                </div>
              </div>
            </div>

            <div class="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-300">
              <span>✓ Tắm nóng lạnh & Bãi xe</span>
              <span class="text-[#4ADE80] font-semibold flex items-center gap-0.5">Đặt lịch ngay →</span>
            </div>
          </div>
        </div>

        <div class="p-5 flex-1 flex flex-col justify-between">
          <div>
            <h3 class="font-heading font-bold text-lg text-[#0F172A] mb-1.5 group-hover:text-[#16A34A] transition-colors cursor-pointer" onclick="window.location.href='html/booking.html?pitchId=${p.id}'">${p.name}</h3>
            <p class="text-xs text-[#64748B] mb-3 line-clamp-2">${p.grass}</p>
            <div class="flex flex-wrap gap-1.5 mb-4">
              ${(p.amenities || []).slice(0, 3).map(a => `<span class="px-2 py-0.5 rounded bg-[#F1F5F9] text-[11px] text-[#475569] font-medium">${a}</span>`).join('')}
            </div>
          </div>
          <div class="pt-3 border-t border-[#F1F5F9] flex items-center justify-between">
            <div>
              <div class="text-[11px] text-[#64748B]">Giá từ</div>
              <div class="font-heading font-extrabold text-[#16A34A] text-lg">${window.SanBongApp.formatVND(p.basePrice)}<span class="text-xs font-normal text-[#64748B]">/trận</span></div>
            </div>
            <a href="html/booking.html?pitchId=${p.id}" class="btn-base btn-primary text-xs font-bold px-4">
              Đặt sân ngay
            </a>
          </div>
        </div>
      </div>
    `).join('');

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
