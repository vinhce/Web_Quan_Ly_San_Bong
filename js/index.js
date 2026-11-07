/**
 * SÂN BÓNG PRO - TRANG CHỦ LOGIC (index.js)
 */

document.addEventListener('DOMContentLoaded', () => {
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

  // 2. Render 3 Featured Pitches
  const db = window.SanBongApp?.SanBongDB;
  const pitches = db ? db.getPitches().slice(0, 3) : [];
  const grid = document.getElementById('featured-pitches-grid');

  if (grid && window.SanBongApp) {
    grid.innerHTML = pitches.map(p => `
      <div class="ui-card overflow-hidden flex flex-col hover:shadow-lg transition-all border-[#E2E8F0]">
        <div class="relative">
          ${window.SanBongApp.renderPitchSVG(p.variant || 'standard', 'h-44')}
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
            <h3 class="font-heading font-bold text-lg text-[#0F172A] mb-1.5">${p.name}</h3>
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
            <a href="html/booking.html?pitch=${p.id}" class="btn-base btn-primary text-xs font-bold px-4">
              Đặt sân ngay
            </a>
          </div>
        </div>
      </div>
    `).join('');
  }

  // 3. Render Vouchers List
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

  // 4. Xử lý Form tìm kiếm
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
