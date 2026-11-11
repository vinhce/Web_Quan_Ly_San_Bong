
function filterAdminCustomers(filterType) {
  currentCustomerFilter = filterType || 'all';
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
      points: Math.floor(Number(c.totalSpent ?? c.total_spent ?? 0) / 10000),
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
      customerMap[cleanP].points = Math.floor(customerMap[cleanP].spend / 10000);
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
          <div class="text-xl mb-1">🔍</div>
          <div class="font-bold text-xs text-[#0F172A]">Không tìm thấy khách hàng nào trong bộ lọc này</div>
          <div class="text-[11px] text-[#94A3B8]">Thử chuyển bộ lọc hoặc tìm với số điện thoại khác</div>
        </td>
      </tr>
    `;
    return;
  }

  const crmBadgeMap = {
    vip: '<span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">👑 VIP</span>',
    regular: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">⭐ Khách quen</span>',
    warning_noshow: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-300">⚠️ Cảnh báo bùng</span>',
    standard: '<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">Tiêu chuẩn</span>'
  };

  tbody.innerHTML = customers.map(c => {
    const ns = Number(c.noShowCount || 0);
    const debt = Number(c.debtAmount || 0);
    const tierBadge = crmBadgeMap[c.customerTier] || crmBadgeMap.standard;
    const blacklistBadge = c.isBlacklisted
      ? '<span class="ml-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-600 text-white">🚫 Blacklist</span>'
      : '';

    const nsBadge = ns >= 2
      ? `<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">⚠️ ${ns} lần bùng</span>`
      : (ns === 1
        ? `<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">1 lần vắng mặt</span>`
        : `<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">✓ 0 lần (Uy tín)</span>`);

    const debtHtml = debt > 0
      ? `<span class="font-extrabold text-[#DC2626]">${debt.toLocaleString('vi-VN')}đ</span>`
      : `<span class="text-slate-400 font-medium">0đ</span>`;

    const safePhoneAttr = escapeJsAttr(c.phone);

    return `
      <tr class="hover:bg-slate-50 transition-colors ${c.isBlacklisted ? 'bg-red-50/40' : ''}">
        <td class="py-3 px-4">
          <div class="font-bold text-[#0F172A]">${escapeSearchHTML(c.name)}</div>
          ${c.adminNote ? `<div class="text-[10px] text-[#64748B] truncate max-w-[200px]" title="${escapeSearchHTML(c.adminNote)}">📝 ${escapeSearchHTML(c.adminNote)}</div>` : ''}
        </td>
        <td class="py-3 px-4 font-mono font-medium text-[#475569]">${escapeSearchHTML(c.phone)}</td>
        <td class="py-3 px-4 whitespace-nowrap">${tierBadge}${blacklistBadge}</td>
        <td class="py-3 px-4 font-medium text-[#334155]">${Number(c.matches) || 0} trận</td>
        <td class="py-3 px-4 font-bold text-[#16A34A]">${Number(c.points || 0).toLocaleString('vi-VN')} đ</td>
        <td class="py-3 px-4 text-center">${nsBadge}</td>
        <td class="py-3 px-4 text-right">${debtHtml}</td>
        <td class="py-3 px-4 text-right font-extrabold text-[#0F172A]">${Number(c.spend || 0).toLocaleString('vi-VN')}đ</td>
        <td class="py-3 px-4 text-right whitespace-nowrap">
          <button type="button" onclick="openCustomerCrmModal('${safePhoneAttr}')" class="px-2.5 py-1 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-[11px] cursor-pointer">📋 Hồ sơ / CRM</button>
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
  if (nameEl) nameEl.value = d.customerName || d.customer_name || '';
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

window.setReportDateRange = function(rangeType) {
  const fromInput = document.getElementById('rpt-from-date');
  const toInput = document.getElementById('rpt-to-date');
  const todayISO = getLocalTodayISO();
  const now = new Date();

  if (rangeType === 'today') {
    if (fromInput) fromInput.value = todayISO;
    if (toInput) toInput.value = todayISO;
  } else if (rangeType === '7days') {
    const d7 = new Date(now);
    d7.setDate(now.getDate() - 6);
    const fromISO = `${d7.getFullYear()}-${String(d7.getMonth() + 1).padStart(2, '0')}-${String(d7.getDate()).padStart(2, '0')}`;
    if (fromInput) fromInput.value = fromISO;
    if (toInput) toInput.value = todayISO;
  } else if (rangeType === 'month') {
    const firstDayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    if (fromInput) fromInput.value = firstDayISO;
    if (toInput) toInput.value = todayISO;
  } else {
    if (fromInput) fromInput.value = '';
    if (toInput) toInput.value = '';
  }
  renderAdminReports();
};

async function renderAdminReports() {
  if (!isManagerOrAdmin()) return;
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const fromDate = (document.getElementById('rpt-from-date')?.value || '').trim();
  const toDate = (document.getElementById('rpt-to-date')?.value || '').trim();

  let reportData = null;
  const qs = new URLSearchParams({ action: 'reports' });
  if (fromDate) qs.set('from', fromDate);
  if (toDate) qs.set('to', toDate);
  const r = await adminFetchJson(`../api/admin.php?${qs.toString()}`);
  if (r.ok && r.data) {
    reportData = r.data;
  }

  let totalRev = 0;
  let totalMatches = 0;
  let servicesRev = 0;
  let depositRev = 0;
  let remainingRev = 0;
  let cashRev = 0;
  let vietqrRev = 0;
  let totalExpenses = 0;
  let netProfit = 0;
  let expensesByCategory = [];
  let p5Rev = 0, p5Count = 0;
  let p7Rev = 0, p7Count = 0;
  let p11Rev = 0, p11Count = 0;
  let pitchRows = [];

  if (reportData) {
    const s = reportData.summary || reportData;
    totalRev = Number(s.totalRevenue ?? reportData.totalRevenue ?? 0);
    totalMatches = Number(s.totalMatches ?? reportData.totalMatches ?? 0);
    servicesRev = Number(s.serviceRevenue ?? s.servicesRevenue ?? reportData.servicesRevenue ?? 0);
    depositRev = Number(s.depositRevenue ?? reportData.depositRevenue ?? 0);
    remainingRev = Number(s.remaining70Revenue ?? s.remainingRevenue ?? reportData.remainingRevenue ?? 0);
    cashRev = Number(s.cashRevenue ?? reportData.cashRevenue ?? 0);
    vietqrRev = Number(s.transferRevenue ?? s.vietqrRevenue ?? reportData.vietqrRevenue ?? 0);
    totalExpenses = Number(reportData.totalExpenses ?? s.totalExpenses ?? 0);
    netProfit = Number(reportData.netProfit ?? s.netProfit ?? (totalRev - totalExpenses));
    expensesByCategory = Array.isArray(reportData.expensesByCategory) ? reportData.expensesByCategory : [];

    const t5 = reportData.byType?.[5] || reportData.byType?.p5 || {};
    const t7 = reportData.byType?.[7] || reportData.byType?.p7 || {};
    const t11 = reportData.byType?.[11] || reportData.byType?.p11 || {};

    p5Rev = Number(t5.revenue || 0);
    p5Count = Number(t5.count ?? t5.matches ?? 0);
    p7Rev = Number(t7.revenue || 0);
    p7Count = Number(t7.count ?? t7.matches ?? 0);
    p11Rev = Number(t11.revenue || 0);
    p11Count = Number(t11.count ?? t11.matches ?? 0);
    pitchRows = Array.isArray(reportData.byPitch) ? reportData.byPitch : [];
  } else {
    const bookings = db.getAllBookings ? db.getAllBookings() : [];
    const pitches = db.getPitches ? db.getPitches() : [];
    const pitchRevMap = {};
    pitches.forEach(p => {
      pitchRevMap[p.id] = { id: p.id, name: p.name, typeName: p.typeName, status: p.status, matches: 0, revenue: 0 };
    });

    bookings.forEach(b => {
      if (b.status === 'Đã hủy' || b.paymentStatus === 'Đã hủy' || b.paymentStatus === 'Đã hoàn cọc 100%') return;
      const bDate = String(b.date || b.booking_date || '').slice(0, 10);
      if (fromDate && bDate && bDate < fromDate) return;
      if (toDate && bDate && bDate > toDate) return;

      const total = Number(b.totalPrice || 0);
      const dep = Number(b.depositAmount || Math.round(total * 0.3));
      let collected = 0;
      let colDep = 0;
      let colRem = 0;

      if (b.status === 'Hoàn thành' || b.paymentStatus === 'Đã thanh toán 100%' || b.paymentStatus === 'Đã thanh toán đủ') {
        collected = total;
        colDep = dep;
        colRem = Math.max(0, total - dep);
      } else if (b.status === 'Đang đá' || b.status === 'Đã xác nhận' || b.status === 'Khách chưa đến' || b.paymentStatus === 'Đã cọc 30%' || b.paymentStatus === 'Tịch thu cọc 30%') {
        if (!String(b.paymentMethod || '').includes('Chưa cọc')) {
          collected = dep;
          colDep = dep;
        }
      }

      totalRev += collected;
      depositRev += colDep;
      remainingRev += colRem;
      totalMatches += 1;

      const pm = String(b.paymentMethod || '').toLowerCase();
      if (pm.includes('tiền mặt')) {
        cashRev += collected;
      } else {
        vietqrRev += collected;
      }

      if (Array.isArray(b.services) && collected > 0) {
        b.services.forEach(s => {
          servicesRev += Number(s.price || 0) * Number(s.quantity || 1);
        });
      }

      const pId = String(b.pitchId || '').toUpperCase();
      if (pId.startsWith('P5') || (b.pitchName && b.pitchName.includes('Sân 5'))) {
        p5Rev += collected;
        p5Count += 1;
      } else if (pId.startsWith('P11') || (b.pitchName && b.pitchName.includes('Sân 11'))) {
        p11Rev += collected;
        p11Count += 1;
      } else {
        p7Rev += collected;
        p7Count += 1;
      }

      if (pitchRevMap[b.pitchId]) {
        pitchRevMap[b.pitchId].matches += 1;
        pitchRevMap[b.pitchId].revenue += collected;
      }
    });
    pitchRows = Object.values(pitchRevMap);
  }

  const avgRev = totalMatches > 0 ? Math.round(totalRev / totalMatches) : 0;
  if (!reportData) {
    netProfit = totalRev - totalExpenses;
  }
  const profitMargin = totalRev > 0 ? ((netProfit / totalRev) * 100).toFixed(1) : '0.0';

  const setElText = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };

  setElText('rpt-total-revenue', totalRev.toLocaleString('vi-VN') + 'đ');
  setElText('rpt-total-matches', totalMatches + ' ca');
  setElText('rpt-services-revenue', servicesRev.toLocaleString('vi-VN') + 'đ');
  setElText('rpt-avg-revenue', avgRev.toLocaleString('vi-VN') + 'đ');
  setElText('rpt-deposit-revenue', depositRev.toLocaleString('vi-VN') + 'đ');
  setElText('rpt-remaining-revenue', remainingRev.toLocaleString('vi-VN') + 'đ');
  setElText('rpt-cash-revenue', cashRev.toLocaleString('vi-VN') + 'đ');
  setElText('rpt-vietqr-revenue', vietqrRev.toLocaleString('vi-VN') + 'đ');

  setElText('rpt-total-expenses', totalExpenses.toLocaleString('vi-VN') + 'đ');
  const netProfitEl = document.getElementById('rpt-net-profit');
  if (netProfitEl) {
    netProfitEl.textContent = netProfit.toLocaleString('vi-VN') + 'đ';
    netProfitEl.className = `font-heading font-extrabold text-2xl mt-1 ${netProfit < 0 ? 'text-rose-600' : 'text-[#16A34A]'}`;
  }
  setElText('rpt-profit-margin', profitMargin + '%');

  setElText('rpt-p5-revenue', p5Rev.toLocaleString('vi-VN') + 'đ');
  setElText('rpt-p5-count', p5Count + ' ca đặt');
  setElText('rpt-p7-revenue', p7Rev.toLocaleString('vi-VN') + 'đ');
  setElText('rpt-p7-count', p7Count + ' ca đặt');
  setElText('rpt-p11-revenue', p11Rev.toLocaleString('vi-VN') + 'đ');
  setElText('rpt-p11-count', p11Count + ' ca đặt');

  const expChartEl = document.getElementById('rpt-expense-categories-chart');
  if (expChartEl) {
    if (expensesByCategory.length === 0) {
      expChartEl.innerHTML = '<div class="py-4 text-center text-[#94A3B8]">Chưa có khoản chi vận hành nào trong kỳ lọc.</div>';
    } else {
      const maxExp = Math.max(1, ...expensesByCategory.map(c => Number(c.amount || 0)));
      const totalExpForPct = Math.max(1, expensesByCategory.reduce((acc, c) => acc + Number(c.amount || 0), 0));
      expChartEl.innerHTML = expensesByCategory.map(c => {
        const amt = Number(c.amount || 0);
        const wPct = Math.max(4, Math.round((amt / maxExp) * 100));
        const sharePct = ((amt / totalExpForPct) * 100).toFixed(1);
        return `
          <div class="space-y-1">
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-[#0F172A]">${escapeSearchHTML(c.categoryName || c.category || '')} <span class="text-[#64748B] font-normal">(${Number(c.count || 0)} khoản)</span></span>
              <span class="font-extrabold text-rose-600">${amt.toLocaleString('vi-VN')}đ <span class="text-[#64748B] font-normal">(${sharePct}%)</span></span>
            </div>
            <div class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div class="h-full bg-rose-500 rounded-full transition-all" style="width:${wPct}%"></div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  const tbody = document.getElementById('admin-reports-tbody');
  if (tbody) {
    tbody.innerHTML = pitchRows.map(p => `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="py-3 px-4 font-bold text-[#0F172A]">${escapeSearchHTML(p.name)}</td>
        <td class="py-3 px-4 text-[#475569]">${escapeSearchHTML(p.typeName || p.type_name || '')}</td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded text-[11px] font-bold ${p.status === 'Bảo trì' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}">
            ${escapeSearchHTML(p.status)}
          </span>
        </td>
        <td class="py-3 px-4 text-center font-bold text-[#334155]">${Number(p.matches || 0)} ca</td>
        <td class="py-3 px-4 text-right font-extrabold text-[#16A34A]">${Number(p.revenue || 0).toLocaleString('vi-VN')}đ</td>
      </tr>
    `).join('');
  }

  await loadAdminExpenses();
}

async function loadAdminExpenses() {
  if (!isManagerOrAdmin()) return;
  const tbody = document.getElementById('admin-expenses-tbody');
  if (!tbody) return;

  const fromDate = (document.getElementById('rpt-from-date')?.value || '').trim();
  const toDate = (document.getElementById('rpt-to-date')?.value || '').trim();
  const category = (document.getElementById('exp-filter-category')?.value || 'all').trim();

  const qs = new URLSearchParams({ action: 'get_expenses', category });
  if (fromDate) qs.set('from', fromDate);
  if (toDate) qs.set('to', toDate);

  const r = await adminFetchJson(`../api/admin.php?${qs.toString()}`);
  if (!r.ok) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-5 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải danh sách chi phí.')}</td></tr>`;
    return;
  }

  const list = Array.isArray(r.data?.expenses) ? r.data.expenses : [];
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-[#94A3B8]">Chưa có khoản chi nào trong kỳ lọc.</td></tr>';
    return;
  }

  const catLabels = {
    dien_nuoc: 'Điện, nước sân',
    bao_tri: 'Bảo trì & Sửa chữa',
    nhap_hang: 'Nhập hàng POS',
    luong_nhan_vien: 'Lương & Thưởng',
    khac: 'Chi phí khác'
  };

  tbody.innerHTML = list.map(ex => {
    const eid = Number(ex.id);
    const delBtn = isOwnerAdmin()
      ? `<button type="button" onclick="deleteAdminExpense(${eid})" class="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[11px] cursor-pointer">🗑️ Xóa</button>`
      : '<span class="text-[#94A3B8]">—</span>';
    return `<tr class="hover:bg-slate-50">
      <td class="py-3 px-4 font-mono font-bold text-[#0F172A]">${escapeSearchHTML(ex.expense_code || ('EXP-' + eid))}</td>
      <td class="py-3 px-4 font-mono text-[#334155]">${escapeSearchHTML(ex.expense_date || '')}</td>
      <td class="py-3 px-4"><span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">${escapeSearchHTML(ex.category_name || catLabels[ex.category] || ex.category || '')}</span></td>
      <td class="py-3 px-4 font-semibold text-[#0F172A]">${escapeSearchHTML(ex.payer_name || '—')}</td>
      <td class="py-3 px-4 text-[#475569] max-w-[220px]">${escapeSearchHTML(ex.receipt_note || '—')}</td>
      <td class="py-3 px-4 text-right font-extrabold text-rose-600">${Number(ex.amount || 0).toLocaleString('vi-VN')}đ</td>
      <td class="py-3 px-4 text-right">${delBtn}</td>
    </tr>`;
  }).join('');
}
window.loadAdminExpenses = loadAdminExpenses;

async function handleAddExpense(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!isManagerOrAdmin()) return;

  const expenseDate = document.getElementById('exp-date')?.value || getLocalTodayISO();
  const category = document.getElementById('exp-category')?.value || 'khac';
  const amount = parseInt(document.getElementById('exp-amount')?.value || '0', 10) || 0;
  const payerName = (document.getElementById('exp-payer')?.value || '').trim();
  const receiptNote = (document.getElementById('exp-note')?.value || '').trim();

  if (amount < 1000) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Số tiền chi phải tối thiểu 1.000đ!', 'warning');
    return;
  }

  const btn = document.getElementById('exp-submit-btn');
  const orig = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Đang ghi...';
  }
  try {
    const r = await adminFetchJson('../api/admin.php?action=add_expense', {
      method: 'POST',
      body: JSON.stringify({
        expense_date: expenseDate,
        category,
        amount,
        payer_name: payerName,
        receipt_note: receiptNote
      })
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể ghi khoản chi!', 'error', 4000);
      return;
    }

    const amtEl = document.getElementById('exp-amount');
    const payerEl = document.getElementById('exp-payer');
    const noteEl = document.getElementById('exp-note');
    if (amtEl) amtEl.value = '';
    if (payerEl) payerEl.value = '';
    if (noteEl) noteEl.value = '';

    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã ghi nhận khoản chi vận hành!', 'success', 3500);
    await renderAdminReports();
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  }
}
window.handleAddExpense = handleAddExpense;

async function deleteAdminExpense(id) {
  if (!isOwnerAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Chủ sân (Admin) mới có quyền xóa khoản chi!', 'error');
    return;
  }
  const ok = await showAdminConfirm({
    title: 'Xóa khoản chi vận hành',
    message: `Bạn có chắc chắn muốn xóa khoản chi #${id} khỏi sổ chi vận hành?`,
    confirmText: 'Xóa khoản chi',
    cancelText: 'Hủy',
    danger: true
  });
  if (!ok) return;

  const r = await adminFetchJson('../api/admin.php?action=delete_expense', {
    method: 'POST',
    body: JSON.stringify({ id: Number(id) })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể xóa khoản chi!', 'error', 4000);
    return;
  }
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã xóa khoản chi!', 'success', 3000);
  await renderAdminReports();
}
window.deleteAdminExpense = deleteAdminExpense;

async function exportAdminReportsCSV() {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền xuất báo cáo doanh thu!', 'error');
    return;
  }

  const fromDate = (document.getElementById('rpt-from-date')?.value || '').trim();
  const toDate = (document.getElementById('rpt-to-date')?.value || '').trim();

  // Ưu tiên gọi API xuất CSV của server nếu hỗ trợ trả về file CSV trực tiếp
  try {
    const qs = new URLSearchParams({ action: 'export_reports_csv' });
    if (fromDate) qs.set('from', fromDate);
    if (toDate) qs.set('to', toDate);
    const res = await fetch(`../api/admin.php?${qs.toString()}`, { cache: 'no-store' });
    if (res.ok) {
      const ct = String(res.headers.get('content-type') || '').toLowerCase();
      if (ct.includes('text/csv') || ct.includes('application/csv') || ct.includes('application/octet-stream')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Bao_Cao_Doanh_Thu_${fromDate || 'all'}_${toDate || 'all'}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        if (window.SanBongApp?.showToast) {
          window.SanBongApp.showToast('📥 Đã xuất file báo cáo doanh thu Excel/CSV thành công!', 'success', 3000);
        }
        return;
      }
    }
  } catch (e) {}

  // Fallback chuẩn UTF-8 BOM cho Excel trên máy khách
  const db = window.SanBongApp?.SanBongDB;
  const bookings = (db && db.getAllBookings) ? db.getAllBookings() : [];
  const filtered = bookings.filter(b => {
    const bDate = String(b.date || b.booking_date || '').slice(0, 10);
    if (fromDate && bDate && bDate < fromDate) return false;
    if (toDate && bDate && bDate > toDate) return false;
    return true;
  });

  const csvEscape = (v) => {
    let str = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(str) && !/^-\d+(\.\d+)?$/.test(str.trim())) {
      str = "'" + str;
    }
    return `"${str.replace(/"/g, '""')}"`;
  };
  const lines = [];
  lines.push(['BÁO CÁO DOANH THU & ĐỐI SOÁT SÂN BÓNG PRO', `Từ ngày: ${fromDate || 'Tất cả'}`, `Đến ngày: ${toDate || 'Tất cả'}`].map(csvEscape).join(','));
  lines.push([]);
  lines.push(['Mã đơn', 'Ngày đá', 'Khung giờ', 'Sân bóng', 'Khách hàng', 'Số điện thoại', 'Tổng tiền (VNĐ)', 'Tiền cọc (VNĐ)', 'Còn lại (VNĐ)', 'Hình thức TT', 'Trạng thái TT', 'Trạng thái ca', 'Ghi chú'].map(csvEscape).join(','));

  filtered.forEach(b => {
    const total = Number(b.totalPrice || 0);
    const dep = Number(b.depositAmount || 0);
    const rem = Number(b.remainingAmount ?? Math.max(0, total - dep));
    lines.push([
      b.code || '',
      b.date || b.booking_date || '',
      b.slotTime || b.slot_time || '',
      b.pitchName || b.pitchId || '',
      b.customerName || '',
      b.phone || '',
      total,
      dep,
      rem,
      b.paymentMethod || '',
      b.paymentStatus || '',
      b.status || '',
      b.note || ''
    ].map(csvEscape).join(','));
  });

  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Bao_Cao_Doanh_Thu_${fromDate || 'all'}_${toDate || 'all'}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast('📥 Đã xuất báo cáo doanh thu ra file Excel / CSV (UTF-8 BOM)!', 'success', 3000);
  }
}
window.exportAdminReportsCSV = exportAdminReportsCSV;

function formatPriceInputVND(num) {
  return Number(num || 0).toLocaleString('vi-VN') + 'đ';
}

function parsePriceInputVND(str, fallback = 0) {
  const digits = String(str || '').replace(/[^\d]/g, '');
  const val = parseInt(digits, 10);
  return (!isNaN(val) && val > 0) ? val : fallback;
}

async function loadPricingTable() {
  if (!isOwnerAdmin()) return;
  const db = window.SanBongApp?.SanBongDB;
  let pitches = db ? db.getPitches() : [];

  const r = await adminFetchJson('../api/pitches.php?all=1');
  if (r.ok && r.data && Array.isArray(r.data.pitches)) {
    pitches = r.data.pitches;
    try { localStorage.setItem('sb_pitches_v2', JSON.stringify(pitches)); } catch (e) {}
  }

  const p5 = pitches.find(p => Number(p.type) === 5) || { basePrice: 250000, peakPrice: 350000, weekendPrice: 380000 };
  const p7 = pitches.find(p => Number(p.type) === 7) || { basePrice: 450000, peakPrice: 650000, weekendPrice: 700000 };
  const p11 = pitches.find(p => Number(p.type) === 11) || { basePrice: 900000, peakPrice: 1200000, weekendPrice: 1400000 };

  const setVal = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.value = formatPriceInputVND(v);
  };

  setVal('price-p5-base', p5.basePrice || 250000);
  setVal('price-p5-peak', p5.peakPrice || 350000);
  setVal('price-p5-weekend', p5.weekendPrice || 380000);

  setVal('price-p7-base', p7.basePrice || 450000);
  setVal('price-p7-peak', p7.peakPrice || 650000);
  setVal('price-p7-weekend', p7.weekendPrice || 700000);

  setVal('price-p11-base', p11.basePrice || 900000);
  setVal('price-p11-peak', p11.peakPrice || 1200000);
  setVal('price-p11-weekend', p11.weekendPrice || 1400000);
}
window.loadPricingTable = loadPricingTable;

async function savePricingTable() {
  if (!isOwnerAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Chủ sân mới có quyền thay đổi bảng giá niêm yết!', 'error');
    return;
  }

  const p5Base = parsePriceInputVND(document.getElementById('price-p5-base')?.value, 250000);
  const p5Peak = parsePriceInputVND(document.getElementById('price-p5-peak')?.value, 350000);
  const p5Wknd = parsePriceInputVND(document.getElementById('price-p5-weekend')?.value, 380000);

  const p7Base = parsePriceInputVND(document.getElementById('price-p7-base')?.value, 450000);
  const p7Peak = parsePriceInputVND(document.getElementById('price-p7-peak')?.value, 650000);
  const p7Wknd = parsePriceInputVND(document.getElementById('price-p7-weekend')?.value, 700000);

  const p11Base = parsePriceInputVND(document.getElementById('price-p11-base')?.value, 900000);
  const p11Peak = parsePriceInputVND(document.getElementById('price-p11-peak')?.value, 1200000);
  const p11Wknd = parsePriceInputVND(document.getElementById('price-p11-weekend')?.value, 1400000);

  const pricingPayload = {
    p5: {
      base: p5Base,
      peak: p5Peak,
      weekend: p5Wknd,
      basePrice: p5Base,
      peakPrice: p5Peak,
      weekendPrice: p5Wknd
    },
    p7: {
      base: p7Base,
      peak: p7Peak,
      weekend: p7Wknd,
      basePrice: p7Base,
      peakPrice: p7Peak,
      weekendPrice: p7Wknd
    },
    p11: {
      base: p11Base,
      peak: p11Peak,
      weekend: p11Wknd,
      basePrice: p11Base,
      peakPrice: p11Peak,
      weekendPrice: p11Wknd
    }
  };

  const btn = document.getElementById('btn-save-pricing');
  const origText = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Đang lưu bảng giá...';
  }

  try {
    const r = await adminFetchJson('../api/admin.php?action=save_pricing', {
      method: 'POST',
      body: JSON.stringify({ pricing: pricingPayload })
    });
    if (!r || !r.ok || !r.json || r.json.success !== true) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(r?.message || 'Không thể lưu bảng giá niêm yết lên máy chủ!', 'error', 4000);
      }
      return;
    }

    const db = window.SanBongApp?.SanBongDB;
    if (db) {
      const pitches = db.getPitches().map(p => {
        const t = Number(p.type);
        const tier = t === 5 ? pricingPayload.p5 : (t === 11 ? pricingPayload.p11 : pricingPayload.p7);
        return Object.assign({}, p, {
          basePrice: tier.basePrice,
          peakPrice: tier.peakPrice,
          weekendPrice: tier.weekendPrice
        });
      });
      localStorage.setItem('sb_pitches_v2', JSON.stringify(pitches));
      window.dispatchEvent(new CustomEvent('sb-data-synced', { detail: { pitches } }));
    }

    await loadPricingTable();
    renderAdminPitches();
    initQuickBookingForm();

    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('✓ Đã lưu cấu hình bảng giá mới vào Cơ sở dữ liệu & đồng bộ sang trang Đặt sân!', 'success', 3500);
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origText || 'Lưu bảng giá';
    }
  }
}
window.savePricingTable = savePricingTable;

async function loadAdminSettings() {
  if (!isOwnerAdmin()) return;
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  let cfg = db.getSystemConfig ? db.getSystemConfig() : {
    depositRate: 30,
    hotline: '0352 313 548',
    openHours: '05:30 - 23:00 hàng ngày (kể cả Lễ, Tết)',
    holdMinutes: 15,
    waitlistHoldMinutes: 15,
    matchmakingEnabled: true,
    matchmakingRequireApproval: false,
    refundFullHours: 24,
    refundPartialHours: 4,
    autoCancelEnabled: true,
    reminderEnabled: false,
    reminderHoursBefore: 2,
    customerNotifyEnabled: false,
    customerNotifyWebhook: '',
    bookingConfirmTemplate: '',
    reminderTemplate: '',
    telegramNotifyEnabled: false,
    telegramBotTokenConfigured: false,
    telegramChatId: '',
    telegramEvents: {}
  };

  let bank = {};
  try {
    bank = JSON.parse(localStorage.getItem('sb_bank_v1') || '{}');
  } catch (e) {}

  const r = await adminFetchJson('../api/admin.php?action=settings');
  if (r.ok && r.data) {
    const sRoot = r.data;
    const s = (sRoot.settings && typeof sRoot.settings === 'object') ? sRoot.settings : sRoot;
    const bInfo = (sRoot.bankInfo && typeof sRoot.bankInfo === 'object') ? sRoot.bankInfo : sRoot;
    const autoRaw = s.autoCancelEnabled ?? s.auto_cancel_enabled;
    const boolVal = (val, def = false) => val === undefined ? def : (val === true || val === 1 || val === '1' || val === 'true');
    const evObj = (s.telegramEvents && typeof s.telegramEvents === 'object') ? s.telegramEvents : {};
    const tokenConfigured = Boolean(
      s.telegramBotTokenConfigured ||
      (s.telegramBotToken && String(s.telegramBotToken).trim() !== '')
    );

    cfg = {
      depositRate: Number(s.depositRate ?? s.deposit_rate ?? cfg.depositRate ?? 30),
      hotline: s.hotline || cfg.hotline || '0352 313 548',
      openHours: s.openHours || s.open_hours || cfg.openHours || '05:30 - 23:00 hàng ngày (kể cả Lễ, Tết)',
      holdMinutes: Math.max(5, Math.min(120, Number(s.holdMinutes ?? s.hold_minutes ?? cfg.holdMinutes ?? 15))),
      waitlistHoldMinutes: Math.max(5, Math.min(120, Number(s.waitlistHoldMinutes ?? s.waitlist_hold_minutes ?? cfg.waitlistHoldMinutes ?? 15))),
      matchmakingEnabled: boolVal(s.matchmakingEnabled ?? s.matchmaking_enabled, true),
      matchmakingRequireApproval: boolVal(s.matchmakingRequireApproval ?? s.matchmaking_require_approval, false),
      refundFullHours: Math.max(1, Math.min(168, Number(s.refundFullHours ?? s.refund_full_hours ?? cfg.refundFullHours ?? 24))),
      refundPartialHours: Math.max(0, Math.min(48, Number(s.refundPartialHours ?? s.refund_partial_hours ?? cfg.refundPartialHours ?? 4))),
      autoCancelEnabled: boolVal(autoRaw, cfg.autoCancelEnabled !== false),
      reminderEnabled: boolVal(s.reminderEnabled ?? s.reminder_enabled, false),
      reminderHoursBefore: Math.max(1, Math.min(24, Number(s.reminderHoursBefore ?? s.reminder_hours_before ?? 2))),
      customerNotifyEnabled: boolVal(s.customerNotifyEnabled ?? s.customer_notify_enabled, false),
      customerNotifyWebhook: String(s.customerNotifyWebhook ?? s.customer_notify_webhook ?? ''),
      bookingConfirmTemplate: String(s.bookingConfirmTemplate ?? s.booking_confirm_template ?? ''),
      reminderTemplate: String(s.reminderTemplate ?? s.reminder_template ?? ''),
      telegramNotifyEnabled: boolVal(s.telegramNotifyEnabled ?? s.telegram_notify_enabled, false),
      telegramBotTokenConfigured: tokenConfigured,
      telegramChatId: String(s.telegramChatId ?? s.telegram_chat_id ?? ''),
      telegramEvents: evObj
    };
    const acc = bInfo.accountNo || bInfo.accountNumber || bInfo.account_no || bank.accountNo || bank.accountNumber || '0123456789';
    bank = {
      bankName: bInfo.bankName || bInfo.bank_name || bank.bankName || 'Vietcombank',
      bankCode: (bInfo.bankCode || bInfo.bank_code || bank.bankCode || 'VCB').toUpperCase(),
      accountNo: acc,
      accountNumber: acc,
      accountName: (bInfo.accountName || bInfo.account_holder || bank.accountName || 'CONG TY CP SAN BONG PRO').toUpperCase()
    };
    const safeCfgForStorage = Object.assign({}, cfg);
    delete safeCfgForStorage.telegramBotToken;
    try {
      localStorage.setItem('sb_system_config', JSON.stringify(safeCfgForStorage));
      localStorage.setItem('sb_bank_v1', JSON.stringify(bank));
    } catch (e) {}
  }

  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  const setChk = (id, v) => { const el = document.getElementById(id); if (el) el.checked = Boolean(v); };

  setVal('cfg-deposit-rate', cfg.depositRate || 30);
  setVal('cfg-bank-name', bank.bankName || 'Vietcombank');
  setVal('cfg-bank-code', bank.bankCode || 'VCB');
  setVal('cfg-bank-acc', bank.accountNo || bank.accountNumber || '0123456789');
  setVal('cfg-bank-holder', bank.accountName || 'CONG TY CP SAN BONG PRO');
  setVal('cfg-hotline', cfg.hotline || '0352 313 548');
  setVal('cfg-open-hours', cfg.openHours || '05:30 - 23:00 hàng ngày (kể cả Lễ, Tết)');
  setVal('cfg-hold-minutes', cfg.holdMinutes ?? 15);
  setVal('cfg-refund-full-hours', cfg.refundFullHours ?? 24);
  setVal('cfg-refund-partial-hours', cfg.refundPartialHours ?? 4);
  setChk('cfg-auto-cancel-enabled', cfg.autoCancelEnabled !== false);

  setVal('cfg-waitlist-hold-minutes', cfg.waitlistHoldMinutes ?? 15);
  setChk('cfg-matchmaking-enabled', cfg.matchmakingEnabled !== false);
  setChk('cfg-matchmaking-require-approval', Boolean(cfg.matchmakingRequireApproval));

  setChk('cfg-reminder-enabled', Boolean(cfg.reminderEnabled));
  setVal('cfg-reminder-hours-before', cfg.reminderHoursBefore ?? 2);
  setChk('cfg-customer-notify-enabled', Boolean(cfg.customerNotifyEnabled));
  setVal('cfg-customer-notify-webhook', cfg.customerNotifyWebhook || '');
  setVal('cfg-booking-confirm-template', cfg.bookingConfirmTemplate || '');
  setVal('cfg-reminder-template', cfg.reminderTemplate || '');

  setChk('cfg-tg-notify-enabled', Boolean(cfg.telegramNotifyEnabled));
  setVal('cfg-tg-chat-id', cfg.telegramChatId || '');
  // Bảo mật: không điền token thật hoặc '********' vào input token
  setVal('cfg-tg-bot-token', '');
  setChk('cfg-tg-clear-token', false);

  const tokenBadge = document.getElementById('tg-token-status-badge');
  if (tokenBadge) {
    if (cfg.telegramBotTokenConfigured) {
      tokenBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700';
      tokenBadge.textContent = '✓ Đã cấu hình Token';
    } else {
      tokenBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600';
      tokenBadge.textContent = 'Chưa cấu hình Token';
    }
  }

  const tgEventsList = ['new_booking', 'cancel', 'shift_diff', 'unmatched_tx', 'low_stock', 'waitlist', 'matchmaking', 'review'];
  const evMap = cfg.telegramEvents || {};
  tgEventsList.forEach(ev => {
    const val = evMap[ev] !== undefined ? Boolean(evMap[ev]) : false;
    const elExact = document.getElementById(`cfg-tg-ev-${ev}`);
    if (elExact) elExact.checked = val;
    const elKebab = document.getElementById(`cfg-tg-ev-${ev.replace(/_/g, '-')}`);
    if (elKebab && elKebab !== elExact) elKebab.checked = val;
  });
}

async function saveAdminSettings(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!isOwnerAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Chủ sân mới có quyền thay đổi cài đặt hệ thống!', 'error');
    return;
  }

  const depositRate = Math.max(10, Math.min(100, parseInt(document.getElementById('cfg-deposit-rate')?.value || '30', 10) || 30));
  const bankName = (document.getElementById('cfg-bank-name')?.value || 'Vietcombank').trim();
  const bankCode = (document.getElementById('cfg-bank-code')?.value || 'VCB').trim().toUpperCase();
  const accountNo = (document.getElementById('cfg-bank-acc')?.value || '0123456789').trim();
  const accountName = (document.getElementById('cfg-bank-holder')?.value || 'CONG TY CP SAN BONG PRO').trim().toUpperCase();
  const hotline = (document.getElementById('cfg-hotline')?.value || '0352 313 548').trim();
  const openHours = (document.getElementById('cfg-open-hours')?.value || '05:30 - 23:00').trim();
  const holdMinutes = Math.max(5, Math.min(120, parseInt(document.getElementById('cfg-hold-minutes')?.value || '15', 10) || 15));
  const waitlistHoldMinutes = Math.max(5, Math.min(120, parseInt(document.getElementById('cfg-waitlist-hold-minutes')?.value || '15', 10) || 15));
  const matchmakingEnabled = Boolean(document.getElementById('cfg-matchmaking-enabled')?.checked ?? true);
  const matchmakingRequireApproval = Boolean(document.getElementById('cfg-matchmaking-require-approval')?.checked ?? false);
  const refundFullHours = Math.max(1, Math.min(168, parseInt(document.getElementById('cfg-refund-full-hours')?.value || '24', 10) || 24));
  const rawPartial = parseInt(document.getElementById('cfg-refund-partial-hours')?.value || '4', 10);
  const refundPartialHours = Math.max(0, Math.min(48, isNaN(rawPartial) ? 4 : rawPartial));
  const autoCancelEnabled = Boolean(document.getElementById('cfg-auto-cancel-enabled')?.checked ?? true);

  const reminderEnabled = Boolean(document.getElementById('cfg-reminder-enabled')?.checked ?? false);
  const reminderHoursBefore = Math.max(1, Math.min(24, parseInt(document.getElementById('cfg-reminder-hours-before')?.value || '2', 10) || 2));
  const customerNotifyEnabled = Boolean(document.getElementById('cfg-customer-notify-enabled')?.checked ?? false);
  const customerNotifyWebhook = (document.getElementById('cfg-customer-notify-webhook')?.value || '').trim();
  const bookingConfirmTemplate = (document.getElementById('cfg-booking-confirm-template')?.value || '').trim();
  const reminderTemplate = (document.getElementById('cfg-reminder-template')?.value || '').trim();

  const telegramNotifyEnabled = Boolean(document.getElementById('cfg-tg-notify-enabled')?.checked ?? false);
  const telegramChatId = (document.getElementById('cfg-tg-chat-id')?.value || '').trim();
  const rawNewToken = (document.getElementById('cfg-tg-bot-token')?.value || '').trim();
  const clearTelegramBotToken = Boolean(document.getElementById('cfg-tg-clear-token')?.checked ?? false);

  const telegramEvents = {};
  ['new_booking', 'cancel', 'shift_diff', 'unmatched_tx', 'low_stock', 'waitlist', 'matchmaking', 'review'].forEach(ev => {
    const el = document.getElementById(`cfg-tg-ev-${ev}`) || document.getElementById(`cfg-tg-ev-${ev.replace(/_/g, '-')}`);
    telegramEvents[ev] = Boolean(el?.checked);
  });

  if (refundPartialHours >= refundFullHours) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Mốc sát giờ không hoàn cọc phải nhỏ hơn mốc hoàn 100% cọc!', 'warning', 3500);
    }
    return;
  }

  const payload = {
    depositRate,
    holdMinutes,
    waitlistHoldMinutes,
    matchmakingEnabled,
    matchmakingRequireApproval,
    refundFullHours,
    refundPartialHours,
    autoCancelEnabled,
    hold_minutes: holdMinutes,
    refund_full_hours: refundFullHours,
    refund_partial_hours: refundPartialHours,
    auto_cancel_enabled: autoCancelEnabled ? 1 : 0,
    bankName,
    bankCode,
    accountNo,
    accountNumber: accountNo,
    accountName,
    hotline,
    openHours,
    reminderEnabled,
    reminderHoursBefore,
    customerNotifyEnabled,
    customerNotifyWebhook,
    bookingConfirmTemplate,
    reminderTemplate,
    telegramNotifyEnabled,
    telegramChatId,
    telegramEvents,
    clearTelegramBotToken
  };

  if (!clearTelegramBotToken && rawNewToken && !/^\*+$/.test(rawNewToken)) {
    payload.telegramBotToken = rawNewToken;
  }

  const r = await adminFetchJson('../api/admin.php?action=settings', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (!r || !r.ok || !r.json || r.json.success !== true) {
    if (r?.ref_code === 'ERR_UNSAFE_WEBHOOK_URL') {
      const whEl = document.getElementById('cfg-customer-notify-webhook');
      if (whEl) whEl.focus();
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(r.message || 'URL Webhook không hợp lệ hoặc bị chặn bảo mật SSRF!', 'error', 5000);
      }
      return;
    }
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r?.message || 'Không thể lưu cài đặt hệ thống lên máy chủ!', 'error', 4000);
    }
    return;
  }

  const cfg = {
    depositRate,
    hotline,
    openHours,
    holdMinutes,
    waitlistHoldMinutes,
    matchmakingEnabled,
    matchmakingRequireApproval,
    refundFullHours,
    refundPartialHours,
    autoCancelEnabled,
    reminderEnabled,
    reminderHoursBefore,
    customerNotifyEnabled,
    customerNotifyWebhook,
    bookingConfirmTemplate,
    reminderTemplate,
    telegramNotifyEnabled,
    telegramChatId,
    telegramEvents
  };
  const bank = { bankName, bankCode, accountNo, accountNumber: accountNo, accountName };

  try {
    localStorage.setItem('sb_system_config', JSON.stringify(cfg));
    localStorage.setItem('sb_bank_v1', JSON.stringify(bank));
  } catch (err) {
    console.error('Lỗi lưu cài đặt:', err);
  }

  await loadAdminSettings();
  window.dispatchEvent(new CustomEvent('sb-data-synced', { detail: { bankInfo: bank, settings: cfg } }));

  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast('✓ Đã lưu cài đặt hệ thống, chính sách cọc, thông báo & cấu hình VietQR thành công!', 'success', 3500);
  }
}

async function testTelegramConnection() {
  if (!isOwnerAdmin()) return;
  const btn = document.getElementById('btn-test-telegram');
  const orig = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Đang gửi thử...';
  }
  try {
    const r = await adminFetchJson('../api/admin.php?action=test_telegram', {
      method: 'POST',
      body: JSON.stringify({})
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Gửi tin thử Telegram thất bại!', 'error', 4500);
      return;
    }
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã gửi tin nhắn thử tới Telegram Chủ sân!', 'success', 4000);
    await loadNotificationLogs();
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  }
}
window.testTelegramConnection = testTelegramConnection;

// [hoisted to admin.js]

async function load2FaStatus() {
  const pill = document.getElementById('admin-2fa-status-pill');
  const setupSec = document.getElementById('admin-2fa-setup-section');
  const activeSec = document.getElementById('admin-2fa-active-section');
  const qrBox = document.getElementById('admin-2fa-qr-box');
  const disableBox = document.getElementById('admin-2fa-disable-box');

  if (!pill) return;

  try {
    const res = await fetch('../api/auth.php?action=me', { credentials: 'same-origin', cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      current2FaEnabled = Boolean(data?.user?.totp_enabled);
      if (current2FaEnabled) {
        pill.textContent = '● Đã kích hoạt 2FA';
        pill.className = 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800';
        if (setupSec) setupSec.classList.add('hidden');
        if (activeSec) activeSec.classList.remove('hidden');
      } else {
        pill.textContent = '○ Chưa kích hoạt';
        pill.className = 'px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800';
        if (setupSec) setupSec.classList.remove('hidden');
        if (activeSec) activeSec.classList.add('hidden');
      }
      if (qrBox) qrBox.classList.add('hidden');
      if (disableBox) disableBox.classList.add('hidden');
    }
  } catch (e) {
    pill.textContent = 'Lỗi kiểm tra 2FA';
  }
}
window.load2FaStatus = load2FaStatus;

async function init2FaSetup() {
  const btn = document.getElementById('btn-init-2fa');
  const qrBox = document.getElementById('admin-2fa-qr-box');
  const qrMount = document.getElementById('admin-2fa-qr-mount');
  const secretText = document.getElementById('admin-2fa-secret-text');

  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Đang tạo khóa...';
  }

  try {
    const r = await adminFetchJson('../api/auth.php?action=setup_2fa', { method: 'POST', body: JSON.stringify({}) });
    if (r.ok && r.json && r.json.success) {
      const qrUri = r.json.qr_uri || '';
      const secret = r.json.secret || '';

      if (qrMount) {
        qrMount.innerHTML = window.SanBongApp?.renderQRCodeSVG
          ? window.SanBongApp.renderQRCodeSVG(qrUri, 150)
          : `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrUri)}" class="w-full h-full object-contain">`;
      }
      if (secretText) {
        secretText.textContent = secret;
      }
      if (qrBox) qrBox.classList.remove('hidden');
      const otpInput = document.getElementById('admin-2fa-confirm-otp');
      if (otpInput) {
        otpInput.value = '';
        otpInput.focus();
      }
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast('Đã tạo mã QR 2FA! Quét mã bằng Authenticator và nhập OTP để kích hoạt.', 'info', 4000);
      }
    } else {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(r.message || 'Không thể thiết lập 2FA.', 'error');
      }
    }
  } catch (err) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Lỗi kết nối khi thiết lập 2FA.', 'error');
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '📱 Thiết lập 2FA ngay';
    }
  }
}
window.init2FaSetup = init2FaSetup;

async function confirm2FaSetup() {
  const otpInput = document.getElementById('admin-2fa-confirm-otp');
  const code = otpInput ? otpInput.value.trim() : '';
  if (!code || code.length !== 6) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Vui lòng nhập đủ 6 chữ số OTP từ ứng dụng!', 'warning');
    }
    if (otpInput) otpInput.focus();
    return;
  }

  const btn = document.getElementById('btn-confirm-2fa');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Đang xác thực...';
  }

  try {
    const r = await adminFetchJson('../api/auth.php?action=confirm_2fa', {
      method: 'POST',
      body: JSON.stringify({ code })
    });
    if (r.ok && r.json && r.json.success) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast('✓ Kích hoạt Xác thực 2 lớp (2FA) thành công!', 'success', 3500);
      }
      await load2FaStatus();
    } else {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(r.message || 'Mã OTP không chính xác!', 'error');
      }
    }
  } catch (e) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Lỗi kết nối xác thực 2FA.', 'error');
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Kích hoạt 2FA';
    }
  }
}
window.confirm2FaSetup = confirm2FaSetup;

function toggleDisable2FaForm(show) {
  const box = document.getElementById('admin-2fa-disable-box');
  if (!box) return;
  const isCurrentlyHidden = box.classList.contains('hidden');
  const targetShow = show !== undefined ? show : isCurrentlyHidden;
  if (targetShow) {
    box.classList.remove('hidden');
    const pw = document.getElementById('admin-2fa-disable-pw');
    if (pw) {
      pw.value = '';
      pw.focus();
    }
    const otp = document.getElementById('admin-2fa-disable-otp');
    if (otp) otp.value = '';
  } else {
    box.classList.add('hidden');
  }
}
window.toggleDisable2FaForm = toggleDisable2FaForm;

async function submitDisable2Fa() {
  const pwInput = document.getElementById('admin-2fa-disable-pw');
  const otpInput = document.getElementById('admin-2fa-disable-otp');
  const password = pwInput ? pwInput.value : '';
  const code = otpInput ? otpInput.value.trim() : '';

  if (!password) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập mật khẩu tài khoản hiện tại!', 'warning');
    if (pwInput) pwInput.focus();
    return;
  }
  if (!code || code.length !== 6) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập mã OTP 6 số hiện tại!', 'warning');
    if (otpInput) otpInput.focus();
    return;
  }

  try {
    const r = await adminFetchJson('../api/auth.php?action=disable_2fa', {
      method: 'POST',
      body: JSON.stringify({ password, code })
    });
    if (r.ok && r.json && r.json.success) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast('✓ Đã hủy kích hoạt Xác thực 2 lớp!', 'success', 3500);
      }
      await load2FaStatus();
    } else {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(r.message || 'Không thể tắt 2FA. Kiểm tra lại mật khẩu hoặc OTP!', 'error');
      }
    }
  } catch (err) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Lỗi kết nối khi tắt 2FA.', 'error');
    }
  }
}
window.submitDisable2Fa = submitDisable2Fa;

async function runMatchRemindersNow() {
  if (!isOwnerAdmin()) return;
  const btn = document.getElementById('btn-run-reminders-now');
  const orig = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Đang gửi nhắc lịch...';
  }
  try {
    const r = await adminFetchJson('../api/admin.php?action=run_match_reminders', {
      method: 'POST',
      body: JSON.stringify({})
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể chạy nhắc lịch trước trận!', 'error', 4000);
      return;
    }
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã xử lý gửi nhắc lịch trước trận!', 'success', 4000);
    await loadNotificationLogs();
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  }
}
window.runMatchRemindersNow = runMatchRemindersNow;

async function loadNotificationLogs() {
  if (!isManagerOrAdmin()) return;
  const tbody = document.getElementById('admin-notif-logs-tbody');
  if (!tbody) return;

  const channel = document.getElementById('notif-filter-channel')?.value || 'all';
  const status = document.getElementById('notif-filter-status')?.value || 'all';
  const search = (document.getElementById('notif-filter-search')?.value || '').trim();

  const qs = new URLSearchParams({ action: 'notification_logs', channel, status, search });
  const r = await adminFetchJson(`../api/admin.php?${qs.toString()}`);
  if (!r.ok) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-5 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải nhật ký thông báo.')}</td></tr>`;
    return;
  }

  const summary = r.data?.summary || {};
  const sentEl = document.getElementById('notif-sent-count');
  const failEl = document.getElementById('notif-failed-count');
  if (sentEl) sentEl.textContent = `${Number(summary.sent || 0)} Đã gửi`;
  if (failEl) failEl.textContent = `${Number(summary.failed || 0)} Thất bại`;

  const logs = Array.isArray(r.data?.logs) ? r.data.logs : [];
  if (logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="py-6 text-center text-[#94A3B8]">Chưa có nhật ký gửi thông báo nào.</td></tr>';
    return;
  }

  const stBadge = {
    sent: '<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">Đã gửi</span>',
    failed: '<span class="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px]">Thất bại</span>',
    pending: '<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">Đang chờ</span>'
  };

  tbody.innerHTML = logs.map(n => {
    const ch = String(n.channel || 'system').toUpperCase();
    return `<tr class="hover:bg-slate-50/70">
      <td class="py-2.5 px-3 font-mono text-[11px] text-[#475569] whitespace-nowrap">${escapeSearchHTML(n.created_at || '')}</td>
      <td class="py-2.5 px-3">
        <span class="px-2 py-0.5 rounded bg-slate-100 text-[#0F172A] font-bold text-[10px]">${escapeSearchHTML(ch)}</span>
        <div class="text-[10px] text-[#64748B] mt-0.5 font-mono">${escapeSearchHTML(n.event_type || '')}</div>
      </td>
      <td class="py-2.5 px-3">
        <div class="font-mono font-bold text-[#0F172A]">${n.booking_code ? '#' + escapeSearchHTML(n.booking_code) : '—'}</div>
        <div class="text-[11px] text-[#64748B]">${escapeSearchHTML(n.recipient || '—')}</div>
      </td>
      <td class="py-2.5 px-3 max-w-[280px]">
        <div class="font-bold text-[#0F172A]">${escapeSearchHTML(n.title || '')}</div>
        <div class="text-[11px] text-[#475569] line-clamp-2">${escapeSearchHTML(n.message || '')}</div>
      </td>
      <td class="py-2.5 px-3">${stBadge[n.status] || escapeSearchHTML(n.status || '')}</td>
      <td class="py-2.5 px-3 text-[11px] text-[#64748B] max-w-[180px] truncate" title="${escapeSearchHTML(n.response_note || '')}">${escapeSearchHTML(n.response_note || '—')}</td>
    </tr>`;
  }).join('');
}
window.loadNotificationLogs = loadNotificationLogs;

async function loadBackupsList() {
  if (!isOwnerAdmin()) return;
  const tbody = document.getElementById('admin-backups-tbody');
  if (!tbody) return;

  const r = await adminFetchJson('../api/admin.php?action=list_backups');
  if (!r.ok || !Array.isArray(r.data)) {
    tbody.innerHTML = `<tr><td colspan="4" class="py-5 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải danh sách bản sao lưu.')}</td></tr>`;
    return;
  }

  if (r.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="py-6 text-center text-[#94A3B8]">Chưa có bản sao lưu CSDL nào. Hãy bấm "Tạo bản sao lưu ngay".</td></tr>';
    return;
  }

  tbody.innerHTML = r.data.map(b => {
    const fname = b.filename || '';
    const sizeLabel = b.size_kb ? `${Number(b.size_kb).toFixed(1)} KB` : `${Math.round(Number(b.size || 0) / 1024)} KB`;
    return `<tr class="hover:bg-slate-50">
      <td class="py-3 px-4 font-mono font-bold text-[#0F172A]">${escapeSearchHTML(fname)}</td>
      <td class="py-3 px-4 font-semibold text-[#475569]">${escapeSearchHTML(sizeLabel)}</td>
      <td class="py-3 px-4 font-mono text-[#64748B]">${escapeSearchHTML(b.created_at || '')}</td>
      <td class="py-3 px-4 text-right">
        <button type="button" onclick="downloadBackupFile('${escapeJsAttr(fname)}')" class="px-3 py-1 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-[11px] cursor-pointer">⬇️ Tải về</button>
      </td>
    </tr>`;
  }).join('');
}
window.loadBackupsList = loadBackupsList;

async function backupDatabaseNow() {
  if (!isOwnerAdmin()) return;
  const ok = await showAdminConfirm({
    title: '💾 Tạo bản sao lưu CSDL ngay',
    message: 'Hệ thống sẽ xuất toàn bộ dữ liệu hiện tại ra file sao lưu nén (.sql.gz / .sql) trên máy chủ. Tiếp tục?',
    confirmText: 'Sao lưu ngay',
    cancelText: 'Hủy'
  });
  if (!ok) return;

  const btn = document.getElementById('btn-backup-now');
  const orig = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Đang sao lưu...';
  }
  try {
    const r = await adminFetchJson('../api/admin.php?action=backup_database_now', {
      method: 'POST',
      body: JSON.stringify({})
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể tạo bản sao lưu CSDL!', 'error', 4000);
      return;
    }
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã tạo bản sao lưu CSDL thành công!', 'success', 4000);
    await loadBackupsList();
    if (typeof loadAuditLogs === 'function') loadAuditLogs();
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  }
}
window.backupDatabaseNow = backupDatabaseNow;

function downloadBackupFile(filename) {
  if (!isOwnerAdmin() || !filename) return;
  const a = document.createElement('a');
  a.href = `../api/admin.php?action=download_backup&file=${encodeURIComponent(filename)}`;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
window.downloadBackupFile = downloadBackupFile;

async function runAutoReleaseNow() {
  if (!isOwnerAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Chủ sân mới có quyền chạy quét nhả đơn quá hạn!', 'error');
    return;
  }

  const btn = document.getElementById('btn-run-auto-cancel-now');
  const origHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Đang quét đơn quá hạn...';
  }

  let releasedCount = 0;
  let serverMsg = '';
  let serverOk = false;

  const r = await adminFetchJson('../api/admin.php?action=run_auto_release', {
    method: 'POST',
    body: JSON.stringify({})
  });
  if (r.ok) {
    serverOk = true;
    releasedCount = Number(r.data?.released_count ?? r.data?.releasedCount ?? r.data?.released ?? r.json?.released_count ?? r.json?.released ?? 0);
    serverMsg = r.message || '';
  } else if (r.status > 0) {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origHtml || '⚡ Quét nhả đơn quá hạn ngay';
    }
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể chạy quét đơn quá hạn!', 'error', 4000);
    return;
  }

  const db = window.SanBongApp?.SanBongDB;
  if (!serverOk && db) {
    const cfg = db.getSystemConfig ? db.getSystemConfig() : { holdMinutes: 15 };
    const holdMs = Math.max(5, Number(cfg.holdMinutes || 15)) * 60 * 1000;
    const allBookings = db.getAllBookings();
    let changed = false;
    allBookings.forEach(b => {
      const pSt = String(b.paymentStatus || '');
      const st = String(b.status || '');
      if (st !== 'Đã hủy' && st !== 'Hoàn thành' && st !== 'Đang đá' && (pSt === 'Chờ duyệt cọc' || pSt === 'Chờ cọc 30%')) {
        const createdMs = b.createdAt ? Date.parse(String(b.createdAt).replace(' ', 'T')) : NaN;
        if (!isNaN(createdMs) && (Date.now() - createdMs) > holdMs) {
          b.status = 'Đã hủy';
          b.paymentStatus = 'Đã hủy';
          b.remainingAmount = 0;
          b.note = (b.note ? b.note + ' | ' : '') + `[Tự động nhả đơn quá ${cfg.holdMinutes || 15}p chưa cọc]`;
          releasedCount++;
          changed = true;
        }
      }
    });
    if (changed) {
      try { localStorage.setItem('sb_bookings_v1', JSON.stringify(allBookings)); } catch (err) {}
      if (typeof db.addAuditLog === 'function') {
        db.addAuditLog('ADMIN_RUN_AUTO_RELEASE', 'SYSTEM', 'Quét đơn quá hạn chưa cọc', `Đã tự động nhả ${releasedCount} đơn quá hạn`);
      }
    }
  }

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = origHtml || '⚡ Quét nhả đơn quá hạn ngay';
  }

  refreshAllAdminViews();
  initQuickBookingForm();
  if (typeof loadAuditLogs === 'function') loadAuditLogs();

  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(
      serverMsg || (releasedCount > 0
        ? `⚡ Đã quét và giải phóng ${releasedCount} đơn giữ chỗ quá hạn chưa cọc!`
        : '✓ Hệ thống sạch: Không có đơn giữ chỗ quá hạn nào cần nhả.'),
      releasedCount > 0 ? 'success' : 'info',
      4000
    );
  }
}
window.runAutoReleaseNow = runAutoReleaseNow;

window.renderAdminCustomers = renderAdminCustomers;
window.renderAdminReports = renderAdminReports;
window.loadAdminSettings = loadAdminSettings;
window.saveAdminSettings = saveAdminSettings;

