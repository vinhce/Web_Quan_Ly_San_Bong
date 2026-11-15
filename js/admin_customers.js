
let crmCustomersFetchSeq = 0;
let currentCustomerFilter = 'all';
let adminCustomersCache = [];
window.crmCustomersFetchSeq = crmCustomersFetchSeq;
window.currentCustomerFilter = currentCustomerFilter;

function filterAdminCustomers(filterType) {
  currentCustomerFilter = filterType || 'all';
  window.currentCustomerFilter = currentCustomerFilter;
  const mapBtn = {
    'all': 'cust-filter-all',
    'vip': 'cust-filter-vip',
    'regular': 'cust-filter-regular',
    'debt': 'cust-filter-debt',
    'noshow': 'cust-filter-noshow',
    'blacklisted': 'cust-filter-blacklisted'
  };
  Object.keys(mapBtn).forEach(k => {
    const btn = document.getElementById(mapBtn[k]);
    if (!btn) return;
    if (k === currentCustomerFilter) {
      btn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold bg-[#16A34A] text-white shadow-xs cursor-pointer';
    } else if (k === 'debt' || k === 'blacklisted') {
      btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 cursor-pointer';
    } else if (k === 'noshow') {
      btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 cursor-pointer';
    } else {
      btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer';
    }
  });
  renderAdminCustomers();
}
window.filterAdminCustomers = filterAdminCustomers;

let custSearchDebounceTimer = null;
function handleCustomerSearchDebounced() {
  clearTimeout(custSearchDebounceTimer);
  custSearchDebounceTimer = setTimeout(() => {
    renderAdminCustomers();
  }, 250);
}
window.handleCustomerSearchDebounced = handleCustomerSearchDebounced;

async function renderAdminCustomers() {
  const tbody = document.getElementById('admin-customers-tbody');
  if (!tbody) return;

  const seq = ++crmCustomersFetchSeq;
  const searchQ = (document.getElementById('admin-cust-search')?.value || '').trim();
  const apiTier = currentCustomerFilter === 'noshow' ? 'all' : (currentCustomerFilter || 'all');

  const r = await adminFetchJson(`../api/admin.php?action=crm_customers&search=${encodeURIComponent(searchQ)}&tier=${encodeURIComponent(apiTier)}`);
  if (seq !== crmCustomersFetchSeq) return;

  let customers = [];
  if (r.ok && Array.isArray(r.data)) {
    customers = r.data.map(c => ({
      name: c.customerName || c.customer_name || 'Khách đặt sân',
      phone: c.phone || '',
      customerTier: c.customerTier || c.customer_tier || 'standard',
      adminNote: c.adminNote || c.admin_note || '',
      isBlacklisted: Boolean(c.isBlacklisted ?? c.is_blacklisted),
      matches: Number(c.totalBookings ?? c.total_bookings ?? 0),
      completedCount: Number(c.completedCount ?? c.completed_count ?? 0),
      noShowCount: Number(c.noShowCount ?? c.no_show_count ?? 0),
      spend: Number(c.totalSpent ?? c.total_spent ?? 0),
      debtAmount: Number(c.debtAmount ?? c.debt_amount ?? 0),
      points: Number(c.points ?? c.loyalty_points ?? 0),
      lastBookingDate: c.lastBookingDate || ''
    }));
    if (currentCustomerFilter === 'noshow') {
      customers = customers.filter(c => c.noShowCount >= 2 || c.customerTier === 'warning_noshow');
    }
  } else if (!r.ok && r.status === 0) {
    // Offline fallback từ dữ liệu thật trong localStorage (không dùng dữ liệu giả)
    const db = window.SanBongApp?.SanBongDB;
    const allBookings = db?.getAllBookings ? db.getAllBookings() : [];
    const customerMap = {};
    allBookings.forEach(b => {
      const phone = (b.phone || '').trim();
      const cleanP = phone.replace(/[^\d]/g, '');
      if (!cleanP) return;
      if (!customerMap[cleanP]) {
        customerMap[cleanP] = {
          name: b.customerName || 'Khách đặt sân',
          phone,
          customerTier: 'standard',
          adminNote: '',
          isBlacklisted: false,
          matches: 0,
          noShowCount: 0,
          spend: 0,
          debtAmount: 0,
          points: 0
        };
      }
      const total = Number(b.totalPrice || 0);
      const st = String(b.status || '');
      const paySt = String(b.paymentStatus || b.payment_status || '');
      customerMap[cleanP].matches += 1;
      if (st !== 'Đã hủy') customerMap[cleanP].spend += total;
      customerMap[cleanP].points = Number(b.points ?? b.loyalty_points ?? Math.floor(customerMap[cleanP].spend / 10000));
      if (st === 'Khách chưa đến' || st.includes('No-Show') || paySt === 'Tịch thu cọc 30%') {
        customerMap[cleanP].noShowCount += 1;
      } else if (st !== 'Đã hủy' && st !== 'Hoàn thành') {
        const dep = Number(b.depositAmount || Math.round(total * 0.3));
        const rem = typeof b.remainingAmount === 'number' ? b.remainingAmount : Math.max(0, total - dep);
        if (rem > 0) customerMap[cleanP].debtAmount += rem;
      }
    });
    customers = Object.values(customerMap);
    if (currentCustomerFilter === 'debt') customers = customers.filter(c => c.debtAmount > 0);
    else if (currentCustomerFilter === 'noshow') customers = customers.filter(c => c.noShowCount >= 2);
    if (searchQ) {
      const qLow = searchQ.toLowerCase();
      customers = customers.filter(c => c.name.toLowerCase().includes(qLow) || c.phone.includes(searchQ));
    }
  } else {
    tbody.innerHTML = `<tr><td colspan="9" class="py-8 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải danh sách khách hàng CRM.')}</td></tr>`;
    return;
  }

  adminCustomersCache = customers;
  customers.sort((a, b) => (Number(b.isBlacklisted) - Number(a.isBlacklisted)) || (b.debtAmount - a.debtAmount) || (b.noShowCount - a.noShowCount) || (b.spend - a.spend));

  if (customers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="py-10 text-center text-[#64748B]">
          <div class="font-bold text-xs text-[#0F172A]">Không tìm thấy khách hàng nào trong bộ lọc này</div>
          <div class="text-[11px] text-[#94A3B8]">Thử chuyển bộ lọc hoặc tìm với số điện thoại khác</div>
        </td>
      </tr>
    `;
    return;
  }

  const crmBadgeMap = {
    vip: '<span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">VIP</span>',
    regular: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">Khách quen</span>',
    warning_noshow: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-300">Cảnh báo bùng</span>',
    standard: '<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">Tiêu chuẩn</span>'
  };

  tbody.innerHTML = customers.map(c => {
    const ns = Number(c.noShowCount || 0);
    const debt = Number(c.debtAmount || 0);
    const tierBadge = crmBadgeMap[c.customerTier] || crmBadgeMap.standard;
    const blacklistBadge = c.isBlacklisted
      ? '<span class="ml-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-600 text-white">Blacklist</span>'
      : '';

    const nsBadge = ns >= 2
      ? `<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">${ns} lần bùng</span>`
      : (ns === 1
        ? `<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">1 lần vắng mặt</span>`
        : `<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">0 lần (Uy tín)</span>`);

    const debtHtml = debt > 0
      ? `<span class="font-extrabold text-[#DC2626]">${debt.toLocaleString('vi-VN')}đ</span>`
      : `<span class="text-slate-400 font-medium">0đ</span>`;

    const safePhoneAttr = escapeJsAttr(c.phone);

    return `
      <tr class="hover:bg-slate-50 transition-colors ${c.isBlacklisted ? 'bg-red-50/40' : ''}">
        <td class="py-3 px-4">
          <div class="font-bold text-[#0F172A]">${escapeSearchHTML(c.name)}</div>
          ${c.adminNote ? `<div class="text-[10px] text-[#64748B] truncate max-w-[200px]" title="${escapeSearchHTML(c.adminNote)}">Ghi chú: ${escapeSearchHTML(c.adminNote)}</div>` : ''}
        </td>
        <td class="py-3 px-4 font-mono font-medium text-[#475569]">${escapeSearchHTML(c.phone)}</td>
        <td class="py-3 px-4 whitespace-nowrap">${tierBadge}${blacklistBadge}</td>
        <td class="py-3 px-4 font-medium text-[#334155]">${Number(c.matches) || 0} trận</td>
        <td class="py-3 px-4 font-bold text-[#16A34A]">${Number(c.points || 0).toLocaleString('vi-VN')} điểm</td>
        <td class="py-3 px-4 text-center">${nsBadge}</td>
        <td class="py-3 px-4 text-right">${debtHtml}</td>
        <td class="py-3 px-4 text-right font-extrabold text-[#0F172A]">${Number(c.spend || 0).toLocaleString('vi-VN')}đ</td>
        <td class="py-3 px-4 text-right whitespace-nowrap">
          <button type="button" onclick="openCustomerCrmModal('${safePhoneAttr}')" class="px-2.5 py-1 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-[11px] cursor-pointer">Hồ sơ / CRM</button>
        </td>
      </tr>
    `;
  }).join('');
}
window.renderAdminCustomers = renderAdminCustomers;

async function openCustomerCrmModal(phone) {
  const modal = document.getElementById('customer-crm-modal');
  if (!modal) return;

  const phoneLbl = document.getElementById('crm-phone-label');
  const formPhoneEl = document.getElementById('crm-form-phone');
  const statsEl = document.getElementById('crm-summary-stats');
  const histTbody = document.getElementById('crm-history-tbody');
  const nameEl = document.getElementById('crm-form-name');
  const tierEl = document.getElementById('crm-form-tier');
  const blackEl = document.getElementById('crm-form-blacklist');
  const noteEl = document.getElementById('crm-form-note');

  if (phoneLbl) phoneLbl.textContent = phone || '---';
  if (formPhoneEl) formPhoneEl.value = phone || '';
  const cached = adminCustomersCache.find(c => c.phone === phone);
  if (cached && cached.name && nameEl) nameEl.value = cached.name;
  if (statsEl) statsEl.innerHTML = '<div class="col-span-4 py-3 text-center text-[#64748B]">Đang tải hồ sơ CRM...</div>';
  if (histTbody) histTbody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-[#94A3B8]">Đang tải lịch sử đặt sân...</td></tr>';

  modal.classList.remove('hidden');
  modal.classList.add('flex');

  const r = await adminFetchJson(`../api/admin.php?action=customer_detail&phone=${encodeURIComponent(phone)}`);
  if (!r.ok || !r.data) {
    if (statsEl) statsEl.innerHTML = `<div class="col-span-4 py-3 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải hồ sơ khách hàng.')}</div>`;
    if (histTbody) histTbody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-[#94A3B8]">Không có dữ liệu lịch sử.</td></tr>';
    return;
  }

  const d = r.data;
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');
  if (nameEl) nameEl.value = d.customerName || d.customer_name || nameEl.value || '';
  if (tierEl) tierEl.value = d.customerTier || d.customer_tier || 'standard';
  if (blackEl) blackEl.checked = Boolean(d.isBlacklisted ?? d.is_blacklisted);
  if (noteEl) noteEl.value = d.adminNote || d.admin_note || '';

  if (statsEl) {
    statsEl.innerHTML = `
      <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
        <div class="text-[11px] text-[#64748B]">Tổng số trận</div>
        <div class="font-heading font-extrabold text-lg text-[#0F172A] mt-0.5">${Number(d.totalBookings || 0)}</div>
        <div class="text-[10px] text-[#16A34A]">${Number(d.completedCount || 0)} hoàn thành</div>
      </div>
      <div class="p-3 rounded-xl bg-amber-50 border border-amber-200">
        <div class="text-[11px] text-[#64748B]">Vắng mặt / Hủy</div>
        <div class="font-heading font-extrabold text-lg text-amber-700 mt-0.5">${Number(d.noShowCount || 0)} / ${Number(d.cancelledCount || 0)}</div>
        <div class="text-[10px] text-[#64748B]">No-Show / Đã hủy</div>
      </div>
      <div class="p-3 rounded-xl bg-rose-50 border border-rose-200">
        <div class="text-[11px] text-[#64748B]">Công nợ hiện tại</div>
        <div class="font-heading font-extrabold text-lg text-rose-600 mt-0.5">${escapeSearchHTML(fmt(d.debtAmount || 0))}</div>
        <div class="text-[10px] text-[#64748B]">Cần thu tại sân</div>
      </div>
      <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
        <div class="text-[11px] text-[#64748B]">Tổng chi tiêu</div>
        <div class="font-heading font-extrabold text-lg text-[#16A34A] mt-0.5">${escapeSearchHTML(fmt(d.totalSpent || 0))}</div>
        <div class="text-[10px] text-[#64748B]">Tích lũy hợp lệ</div>
      </div>
    `;
  }

  const bookings = Array.isArray(d.bookings) ? d.bookings : [];
  if (histTbody) {
    if (bookings.length === 0) {
      histTbody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-[#94A3B8]">Khách chưa có lịch sử đặt sân.</td></tr>';
    } else {
      histTbody.innerHTML = bookings.map(b => (
        `<tr class="hover:bg-slate-50">
          <td class="py-2 px-3 font-mono font-bold text-[#0F172A]">#${escapeSearchHTML(b.code || '')}</td>
          <td class="py-2 px-3">
            <div class="font-bold text-[#0F172A]">${escapeSearchHTML(b.bookingDate || b.booking_date || '')}</div>
            <div class="text-[11px] text-[#64748B]">${escapeSearchHTML(b.pitchName || b.pitch_name || b.pitchId || '')}</div>
          </td>
          <td class="py-2 px-3 font-semibold">${escapeSearchHTML(b.slotTime || b.slot_time || '')}</td>
          <td class="py-2 px-3 text-right font-bold text-[#0F172A]">${escapeSearchHTML(fmt(b.totalPrice ?? b.total_price ?? 0))}</td>
          <td class="py-2 px-3 text-right">
            <div class="font-bold text-xs">${escapeSearchHTML(b.status || '')}</div>
            <div class="text-[10px] text-[#64748B]">${escapeSearchHTML(b.paymentStatus || b.payment_status || '')}</div>
          </td>
        </tr>`
      )).join('');
    }
  }
}
window.openCustomerCrmModal = openCustomerCrmModal;

function closeCustomerCrmModal() {
  const modal = document.getElementById('customer-crm-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}
window.closeCustomerCrmModal = closeCustomerCrmModal;

async function saveCustomerCrm(e) {
  if (e && e.preventDefault) e.preventDefault();
  const phone = (document.getElementById('crm-form-phone')?.value || '').trim();
  const customerName = (document.getElementById('crm-form-name')?.value || '').trim();
  const customerTier = document.getElementById('crm-form-tier')?.value || 'standard';
  const isBlacklisted = Boolean(document.getElementById('crm-form-blacklist')?.checked);
  const adminNote = (document.getElementById('crm-form-note')?.value || '').trim();

  if (!phone || !customerName) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập đầy đủ SĐT và Tên khách hàng!', 'warning');
    return;
  }

  const form = e?.target || document.getElementById('customer-crm-form');
  const submitBtn = form?.querySelector('button[type="submit"]');
  const orig = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Đang lưu...';
  }
  try {
    const r = await adminFetchJson('../api/admin.php?action=update_customer_crm', {
      method: 'POST',
      body: JSON.stringify({
        phone,
        customer_name: customerName,
        customer_tier: customerTier,
        admin_note: adminNote,
        is_blacklisted: isBlacklisted
      })
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể cập nhật hồ sơ CRM!', 'error', 4000);
      return;
    }
    closeCustomerCrmModal();
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || `✓ Đã lưu hồ sơ CRM cho ${customerName}!`, 'success', 3500);
    await renderAdminCustomers();
    const walkinPhone = document.getElementById('admin-cust-phone')?.value || '';
    if (walkinPhone && walkinPhone.replace(/[^\d]/g, '') === phone.replace(/[^\d]/g, '')) {
      checkWalkinPhoneNoShow(walkinPhone);
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = orig;
    }
  }
}
window.saveCustomerCrm = saveCustomerCrm;

