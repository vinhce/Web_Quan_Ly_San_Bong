
(function () {
  'use strict';

  function initHomePage() {
    const app = window.SanBongApp;
    const db = window.SanBongDB || app?.SanBongDB;

    const heroBg = document.getElementById('hero-pitch-bg');
    if (heroBg && app?.renderPitchSVG) {
      heroBg.innerHTML = app.renderPitchSVG('hero', 'h-full');
    }

    const escapeHTML = (str) => (app?.escapeHTML ? app.escapeHTML(str) : String(str ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])));

    const searchDateInput = document.getElementById('search-date');
    const today = app?.getLocalTodayISO ? app.getLocalTodayISO() : new Date().toISOString().split('T')[0];
    if (searchDateInput) {
      searchDateInput.min = today;
      if (!searchDateInput.value) {
        searchDateInput.value = today;
      }
    }

    const weatherBadge = document.getElementById('hero-weather-badge');
    if (weatherBadge) {
      if (app?.SanBongAPI?.fetchWeather) {
        app.SanBongAPI.fetchWeather()
          .then(weather => {
            weatherBadge.innerHTML = `
              <span>${weather.icon}</span>
              <span>Mỹ Đình: <b>${weather.temperature}°C</b> · ${weather.condition}</span>
            `;
          })
          .catch(() => {
            weatherBadge.innerHTML = '<span>☀️</span><span>Mỹ Đình: 26°C · Sân khô ráo</span>';
          });
      } else {
        weatherBadge.innerHTML = '<span>☀️</span><span>Mỹ Đình: 26°C · Sân khô ráo</span>';
      }
    }

    const renderVouchersAndPricing = () => {
      const currentPitches = (db?.getPitches && db.getPitches().length > 0)
        ? db.getPitches()
        : (window.SanBongData?.DEFAULT_PITCHES || []);
      renderHomePricingTable(currentPitches);

      const currentVouchers = (db?.getVouchers && db.getVouchers().length > 0)
        ? db.getVouchers()
        : (window.SanBongData?.DEFAULT_VOUCHERS || []);
      const vouchersContainer = document.getElementById('vouchers-list');
      if (vouchersContainer && app) {
        const activeVouchers = currentVouchers.filter(v => v.isActive !== false);
        const monthlyVoucher = activeVouchers.find(v => String(v.code || '').toUpperCase() === 'DATTHANG15');
        const regularVouchers = activeVouchers.filter(v => String(v.code || '').toUpperCase() !== 'DATTHANG15');
        const pkg3m = db?.getPackagePromotion ? db.getPackagePromotion(12) : window.SanBongData?.PACKAGE_PROMOTIONS?.[12];
        const discountPct = pkg3m?.discountRate ? Math.round(pkg3m.discountRate * 100) : 15;
        const giftValueText = app.formatVND(pkg3m?.perMatchGiftValue || 390000);
        const minMonthlyHint = monthlyVoucher && Number(monthlyVoucher.minOrder) > 0
          ? `Đơn từ ${app.formatVND(monthlyVoucher.minOrder)} · ` : 'Lịch 12 tuần · ';
        const monthlyCopyBtn = monthlyVoucher
          ? `<button type="button" data-voucher-code="${escapeHTML(monthlyVoucher.code)}" onclick="copyVoucher(this.getAttribute('data-voucher-code'))" class="btn-sm btn-secondary !h-7 !px-2.5 text-[11px] font-bold hover:border-[#16A34A] hover:text-[#16A34A]">Sao chép ${escapeHTML(monthlyVoucher.code)}</button>`
          : '';
        const packagePromoBanner = `
          <div class="col-span-full ui-card px-4 py-2.5 border-l-4 border-l-[#16A34A] bg-gradient-to-r from-emerald-50/90 via-white to-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1 min-w-0">
              <span class="inline-block px-2 py-0.5 rounded-full bg-[#16A34A] text-white text-[10px] font-extrabold uppercase tracking-wide shrink-0">GÓI 3 THÁNG · GIẢM ${discountPct}%</span>
              <span class="text-xs font-bold text-[#0F172A]">Tặng 2 thùng nước &amp; 1 trọng tài mỗi trận</span>
              <span class="text-[11px] text-[#475569]">(${escapeHTML(minMonthlyHint)}Quà ${escapeHTML(giftValueText)}/trận)</span>
            </div>
            <div class="flex flex-wrap items-center gap-2 shrink-0">
              ${monthlyCopyBtn}
              <a href="/booking?mode=monthly" class="btn-sm btn-primary !h-7 !px-3 text-[11px] shrink-0 font-bold">Đặt gói →</a>
            </div>
          </div>`;

        const total = regularVouchers.length;
        const useSixCols = total >= 5 && total % 3 !== 0;
        const colsClass = total <= 1 ? 'grid-cols-1'
          : total === 2 ? 'grid-cols-1 sm:grid-cols-2'
          : total === 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
          : useSixCols ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-6'
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
        vouchersContainer.className = `grid ${colsClass} gap-3`;

        const spanAt = (idx) => {
          const smSpan = (total > 1 && total % 2 === 1 && idx === total - 1) ? 'sm:col-span-2 ' : '';
          if (total === 3) return idx === 2 ? 'sm:col-span-2 lg:col-span-1' : '';
          if (!useSixCols) return smSpan ? `${smSpan}lg:col-span-1` : '';
          const wideCount = total % 3 === 2 ? 2 : 4;
          return `${smSpan}${idx >= total - wideCount ? 'lg:col-span-3' : 'lg:col-span-2'}`.trim();
        };

        vouchersContainer.innerHTML = packagePromoBanner + regularVouchers.map((v, idx) => {
          const safeCode = escapeHTML(v.code);
          const isGreen = v.code === 'WELCOME10';
          const isPurple = v.code === 'VIPGOLD';
          const minLabel = Number(v.minOrder) > 0 ? `Đơn từ ${app.formatVND(v.minOrder)}` : 'Áp dụng mọi đơn';
          const borderClass = isPurple
            ? 'border-l-purple-600 bg-purple-50/30'
            : (isGreen ? 'border-l-[#16A34A]' : 'border-l-[#F59E0B]');
          const badgeClass = isPurple
            ? 'bg-purple-100 text-purple-700'
            : (isGreen ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#FEF3C7] text-[#B45309]');
          const btnHoverClass = isPurple
            ? 'hover:border-purple-600 hover:text-purple-600'
            : 'hover:border-[#16A34A] hover:text-[#16A34A]';

          return `
            <div class="ui-card p-3.5 border-l-4 ${borderClass} flex flex-col justify-between gap-2 ${spanAt(idx)}">
              <div class="flex items-center justify-between gap-2">
                <span class="inline-block font-mono font-extrabold text-[11px] px-2 py-0.5 rounded truncate ${badgeClass}">${safeCode}</span>
                <button type="button" data-voucher-code="${safeCode}" onclick="copyVoucher(this.getAttribute('data-voucher-code'))" class="btn-sm btn-secondary !h-7 !px-2.5 text-[11px] shrink-0 font-bold ${btnHoverClass}">Sao chép</button>
              </div>
              <p class="text-xs font-semibold text-[#0F172A] leading-snug line-clamp-2">${escapeHTML(v.description)}</p>
              <div class="text-[11px] text-[#64748B]">${minLabel}</div>
            </div>`;
        }).join('');
      }
    };

    const grid = document.getElementById('featured-pitches-grid');
    if (grid && app) {
      const localPitches = (db?.getPitches && db.getPitches().length > 0)
        ? db.getPitches()
        : (window.SanBongData?.DEFAULT_PITCHES || []);

      renderFeaturedGrid(grid, localPitches);

      if (app.SanBongAPI?.getPitches) {
        app.SanBongAPI.getPitches()
          .then(pitches => {
            if (Array.isArray(pitches) && pitches.length > 0) {
              renderFeaturedGrid(grid, pitches);
              renderHomePricingTable(pitches);
            }
          })
          .catch(err => {
            console.warn('Revalidate pitches ngầm:', err.message);
          });
      }
    }

    renderVouchersAndPricing();
    loadHomeReviews();

    if (!window._homeDataSyncedBound) {
      window._homeDataSyncedBound = true;
      window.addEventListener('sb-data-synced', () => {
        renderVouchersAndPricing();
        const syncedPitches = db?.getPitches ? db.getPitches() : [];
        if (grid && syncedPitches.length > 0) {
          renderFeaturedGrid(grid, syncedPitches);
        }
      });
    }

    const searchForm = document.getElementById('hero-search-form');
    if (searchForm) {
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const d = document.getElementById('search-date')?.value || '';
        const t = document.getElementById('search-type')?.value || 'all';
        window.location.href = `/fields?date=${encodeURIComponent(d)}&type=${encodeURIComponent(t)}`;
      });
    }
  }

  function renderHomePricingTable(pitches) {
    const tbody = document.getElementById('home-pricing-tbody');
    const app = window.SanBongApp;
    if (!tbody || !app || !Array.isArray(pitches) || pitches.length === 0) return;

    const types = [
      { key: 5, label: 'Sân 5 người', size: '20m × 40m' },
      { key: 7, label: 'Sân 7 người', size: '30m × 50m' },
      { key: 11, label: 'Sân 11 người (Ghép)', size: '60m × 100m' }
    ];
    const esc = (s) => (app.escapeHTML ? app.escapeHTML(s) : String(s ?? ''));

    const rowsHtml = types.map(t => {
      const matched = pitches.filter(p => Number(p.type) === t.key && p.status !== 'Ngưng hoạt động');
      if (matched.length === 0) return '';
      const minBase = Math.min(...matched.map(p => Number(p.basePrice || 0)).filter(n => n > 0));
      const minPeak = Math.min(...matched.map(p => Number(p.peakPrice || 0)).filter(n => n > 0));
      const sizeText = matched[0].size || t.size;
      return `
        <tr>
          <td class="py-3.5 px-3.5 font-bold text-[#0F172A]">${esc(t.label)}</td>
          <td class="py-3.5 px-3.5 text-[#64748B]">${esc(sizeText)}</td>
          <td class="py-3.5 px-3.5">${minBase ? esc(app.formatVND(minBase)) + '/h' : 'Liên hệ'}</td>
          <td class="py-3.5 px-3.5 font-bold text-[#16A34A]">${minPeak ? esc(app.formatVND(minPeak)) + '/h' : 'Liên hệ'}</td>
        </tr>
      `;
    }).filter(Boolean).join('');

    if (rowsHtml) tbody.innerHTML = rowsHtml;
  }

  function renderReviewsFallback(container, isError) {
    const msg = isError
      ? 'Hiện chưa tải được đánh giá từ máy chủ. Bạn có thể thử lại hoặc xem tại trang Lịch sử.'
      : 'Chưa có đánh giá công bố nào. Hãy đặt sân và chia sẻ trải nghiệm của đội bạn sau trận đấu!';
    container.innerHTML = `
      <div class="sm:col-span-3 ui-card px-4 py-3 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
        <div class="text-[#475569] text-center sm:text-left">${msg}</div>
        <div class="flex flex-wrap items-center justify-center gap-2 shrink-0">
          ${isError ? '<button type="button" id="home-reviews-retry-btn" class="btn-sm btn-secondary !h-7 !px-3 text-[11px] font-bold hover:border-[#16A34A] hover:text-[#16A34A]">Thử lại</button>' : ''}
          <a href="/history" class="btn-sm btn-secondary !h-7 !px-3 text-[11px] font-bold hover:border-[#16A34A] hover:text-[#16A34A]">Đánh giá trận đã đá →</a>
        </div>
      </div>`;
    document.getElementById('home-reviews-retry-btn')?.addEventListener('click', () => {
      container.innerHTML = '<div class="sm:col-span-3 ui-card px-5 py-3.5 text-center text-xs text-[#64748B]">Đang tải đánh giá thực tế từ khách đặt sân...</div>';
      loadHomeReviews();
    });
  }

  async function loadHomeReviews() {
    const container = document.getElementById('home-reviews-grid');
    const app = window.SanBongApp;
    if (!container || !app) return;
    const esc = (s) => (app.escapeHTML ? app.escapeHTML(s) : String(s ?? ''));

    try {
      const res = await fetch(app.getRelativePath ? app.getRelativePath('api/reviews.php') : '/api/reviews.php');
      if (!res.ok) { renderReviewsFallback(container, true); return; }
      const json = await res.json();
      if (!json?.success) { renderReviewsFallback(container, true); return; }

      const reviews = Array.isArray(json.data?.reviews) ? json.data.reviews.slice(0, 3) : [];
      if (reviews.length === 0) {
        renderReviewsFallback(container, false);
        return;
      }

      container.innerHTML = reviews.map(r => {
        const rating = Math.max(1, Math.min(5, Number(r.rating || 5)));
        const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
        return `
          <div class="ui-card p-4 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-2">
                <div class="text-[#F59E0B] text-xs">${stars}</div>
                <span class="text-[11px] font-semibold text-[#64748B]">${esc(r.pitch_name || r.pitch_id || '')}</span>
              </div>
              <p class="text-xs text-[#475569] leading-relaxed">"${esc(r.comment || 'Chất lượng sân và dịch vụ tốt.')}"</p>
            </div>
            <div class="mt-3 pt-2 border-t border-[#F1F5F9] text-xs font-bold text-[#0F172A]">— ${esc(r.customer_name || 'Khách đặt sân')}</div>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.warn('Không tải được đánh giá trang chủ:', err.message);
      renderReviewsFallback(container, true);
    }
  }

  function renderFeaturedGrid(grid, pitches) {
    const app = window.SanBongApp;
    if (!grid || !app) return;
    const esc = (s) => (app.escapeHTML ? app.escapeHTML(s) : String(s ?? ''));

    grid.innerHTML = pitches.map(p => {
      const safeId = esc(p.id);
      const isMaint = p.status === 'Bảo trì' || Boolean(p.inMaintenance);
      const ratingBadge = Number(p.reviewCount || 0) > 0
        ? `<span class="text-[11px] font-bold text-[#0F172A] flex items-center gap-1"><span class="text-[#F59E0B]">★</span> ${Number(p.rating || 5).toFixed(1)} (${Number(p.reviewCount)})</span>`
        : '';
      return `
      <div class="ui-card overflow-hidden flex flex-col hover:shadow-lg transition-all border-[#E2E8F0] w-[85vw] sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] shrink-0 snap-start">
        <!-- Pitch Graphic -->
        <div class="relative cursor-pointer" data-pitch-id="${safeId}" onclick="openPitchDetail(this.getAttribute('data-pitch-id'))" title="Bấm xem chi tiết sân ${esc(p.name)}">
          ${app.renderPitchSVG(p.variant || 'standard', 'h-48')}
          <div class="absolute top-3 left-3 flex gap-1.5">
            <span class="px-3 py-1 rounded-full text-xs font-bold bg-white text-[#0F172A] shadow-sm">${esc(p.typeName)}</span>
          </div>
          <div class="absolute bottom-3 left-3">
            <span class="px-2.5 py-1 rounded-full text-xs font-bold ${isMaint ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-[#DCFCE7] text-[#16A34A]'} shadow-sm">
              ${isMaint ? 'Đang bảo trì mặt cỏ' : 'Còn khung giờ trống hôm nay'}
            </span>
          </div>
        </div>

        <div class="p-5 flex-1 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between gap-2 mb-1.5">
              <h3 class="font-heading font-bold text-lg text-[#0F172A] hover:text-[#16A34A] transition-colors cursor-pointer" data-pitch-id="${safeId}" onclick="openPitchDetail(this.getAttribute('data-pitch-id'))">${esc(p.name)}</h3>
              ${ratingBadge}
            </div>
            <p class="text-xs text-[#64748B] mb-3 line-clamp-2">${esc(p.grass)}</p>
            <div class="flex flex-wrap gap-1.5 mb-4">
              ${(p.amenities || []).slice(0, 3).map(a => `<span class="px-2 py-0.5 rounded bg-[#F1F5F9] text-[11px] text-[#475569] font-medium">${esc(a)}</span>`).join('')}
            </div>
          </div>
          <div class="pt-3 border-t border-[#F1F5F9] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <div class="text-[11px] text-[#64748B]">Giá từ</div>
              <div class="font-heading font-extrabold text-[#16A34A] text-base sm:text-lg">${app.formatVND(p.basePrice)}<span class="text-xs font-normal text-[#64748B]">/trận</span></div>
            </div>
            <div class="flex items-center gap-1.5">
              <button type="button" data-pitch-id="${safeId}" onclick="openPitchDetail(this.getAttribute('data-pitch-id'))" class="btn-sm btn-secondary text-xs font-bold px-3 hover:border-[#16A34A] hover:text-[#16A34A] transition-colors">
                Chi tiết sân
              </button>
              ${isMaint ? `
                <span class="btn-sm btn-disabled text-xs font-bold px-3 opacity-60 cursor-not-allowed">Bảo trì</span>
              ` : `
                <a href="/booking?pitchId=${encodeURIComponent(p.id)}" class="btn-sm btn-primary text-xs font-bold px-3 shadow-sm hover:bg-[#15803D] transition-colors">
                  Đặt sân ngay
                </a>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
    }).join('');

    window.openPitchDetail = function(pitchId) {
      const db = window.SanBongApp?.SanBongDB || window.SanBongDB;
      const pitch = db?.getPitchById ? db.getPitchById(pitchId) : pitches.find(x => x.id === pitchId);
      if (!pitch) return;

      const modal = document.getElementById('pitch-detail-modal');
      const content = document.getElementById('modal-content');
      if (!modal || !content) return;

      const isMaint = pitch.status === 'Bảo trì' || Boolean(pitch.inMaintenance);

      content.innerHTML = `
        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#DCFCE7] text-[#16A34A]">${esc(pitch.typeName)}</span>
              ${app.statusPill(pitch.status)}
            </div>
            <h2 class="font-heading font-extrabold text-2xl text-[#0F172A]">${esc(pitch.name)}</h2>
            <div class="text-xs text-[#64748B] mt-0.5">${esc(pitch.size)} · ${esc(pitch.description || pitch.grass)}</div>
          </div>
          <button onclick="closeModal()" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold transition-colors">✕</button>
        </div>

        <div class="rounded-xl overflow-hidden border border-[#E2E8F0]">
          ${app.renderPitchSVG(pitch.variant || 'standard', 'h-48')}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <div class="text-xs text-[#64748B]">Mặt cỏ thi đấu</div>
            <div class="text-xs font-bold text-[#0F172A] mt-1">${esc(pitch.grass)}</div>
          </div>
          <div class="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <div class="text-xs text-[#64748B]">Bảng giá theo giờ</div>
            <div class="text-xs font-bold text-[#16A34A] mt-1">
              Thường (05:30-17:30): ${app.formatVND(pitch.basePrice)}/h<br>
              Giờ cao điểm (17:30-21:00): ${app.formatVND(pitch.peakPrice)}/h
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
            <a href="/booking?pitchId=${encodeURIComponent(pitch.id)}" class="btn-base btn-primary text-xs font-bold px-5">
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

    setupCarousel(grid);
  }

  function setupCarousel(grid) {
    if (!grid) return;
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
      if (btn && !btn._bound) {
        btn._bound = true;
        btn.addEventListener('click', () => scrollCarousel(-1));
      }
    });

    ['featured-next-btn', 'featured-float-next'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn && !btn._bound) {
        btn._bound = true;
        btn.addEventListener('click', () => scrollCarousel(1));
      }
    });

    grid.addEventListener('scroll', updateCarouselControls, { passive: true });
    window.addEventListener('resize', updateCarouselControls, { passive: true });
    setTimeout(updateCarouselControls, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHomePage);
  } else {
    initHomePage();
  }
})();

function copyVoucher(code) {
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(code).then(() => {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast('✓ Đã sao chép mã ưu đãi ' + code + ' vào bộ nhớ tạm!', 'success', 2500);
    }).catch(() => {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Mã ưu đãi của bạn: ' + code, 'info', 2500);
    });
  } else {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Mã ưu đãi của bạn: ' + code, 'info', 2500);
  }
}
