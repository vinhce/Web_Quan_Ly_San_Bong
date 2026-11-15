
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
    'regular': 'cust-filter-regular'
  };
  Object.keys(mapBtn).forEach(k => {
    const btn = document.getElementById(mapBtn[k]);
    if (!btn) return;
    if (k === currentCustomerFilter) {
      btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white shadow-sm cursor-pointer';
    } else {
      btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 cursor-pointer';
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

function formatAdminCustomerBookingDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return '—';

  const isoDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function normalizeCustomerPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length === 11 && digits.startsWith('84') ? `0${digits.slice(2)}` : digits;
}

async function renderAdminCustomers() {
  const tbody = document.getElementById('admin-customers-tbody');
  if (!tbody) return;

  const seq = ++crmCustomersFetchSeq;
  const searchQ = (document.getElementById('admin-cust-search')?.value || '').trim();
  const apiTier = currentCustomerFilter === 'noshow' ? 'all' : (currentCustomerFilter || 'all');

  const apiUrl = searchQ
    ? `../api/admin.php?action=search_customers&search=${encodeURIComponent(searchQ)}`
    : `../api/admin.php?action=crm_customers&tier=${encodeURIComponent(apiTier)}`;

  const r = await adminFetchJson(apiUrl);
  if (seq !== crmCustomersFetchSeq) return;

  let customers = [];
  if (r.ok && Array.isArray(r.data)) {
    customers = r.data.map(c => ({
      id: c.id || c.user_id || null,
      userId: c.user_id || c.id || null,
      name: c.customerName || c.customer_name || c.full_name || c.name || 'Khách đặt sân',
      phone: c.phone || '',
      email: c.email || '',
      customerTier: c.customerTier || c.customer_tier || 'standard',
      adminNote: c.adminNote || c.admin_note || '',
      isBlacklisted: Boolean(c.isBlacklisted ?? c.is_blacklisted),
      bookingCount: Number(c.totalBookings ?? c.total_bookings ?? 0),
      matches: Number(c.completedCount ?? c.completed_count ?? 0),
      completedCount: Number(c.completedCount ?? c.completed_count ?? 0),
      noShowCount: Number(c.noShowCount ?? c.noshow_count ?? c.no_show_count ?? 0),
      spend: Number(c.totalSpent ?? c.total_spent ?? 0),
      debtAmount: Number(c.debtAmount ?? c.debt_amount ?? 0),
      points: Number(c.points ?? c.loyalty_points ?? 0),
      updatedAt: c.updated_at || '',
      isMember: Boolean(c.is_member ?? c.user_id),
      lastBookingDate: c.lastBookingDate || c.last_booking_date || '',
      lastBookingRelative: c.lastBookingRelative || (c.last_booking_relative || '—')
    }));

    if (currentCustomerFilter === 'vip') {
      customers = customers.filter(c => c.customerTier === 'vip');
    } else if (currentCustomerFilter === 'regular') {
      customers = customers.filter(c => c.customerTier === 'regular');
    } else if (currentCustomerFilter === 'debt') {
      customers = customers.filter(c => c.debtAmount > 0);
    } else if (currentCustomerFilter === 'noshow') {
      customers = customers.filter(c => c.noShowCount >= 2 || c.customerTier === 'warning_noshow');
    } else if (currentCustomerFilter === 'blacklisted') {
      customers = customers.filter(c => c.isBlacklisted);
    }
  } else if (!r.ok && r.status === 0) {
    // Offline fallback từ dữ liệu thật trong localStorage (không dùng dữ liệu giả)
    const db = window.SanBongApp?.SanBongDB;
    const allBookings = db?.getAllBookings ? db.getAllBookings() : [];
    const customerMap = {};
    allBookings.forEach(b => {
      const phone = (b.phone || '').trim();
      const cleanP = normalizeCustomerPhone(phone);
      if (!cleanP) return;
      if (!customerMap[cleanP]) {
        customerMap[cleanP] = {
          name: b.customerName || 'Khách đặt sân',
          phone,
          customerTier: 'standard',
          adminNote: '',
          isBlacklisted: false,
          bookingCount: 0,
          matches: 0,
          completedCount: 0,
          noShowCount: 0,
          spend: 0,
          debtAmount: 0,
          points: 0,
          lastBookingDate: '',
          lastBookingRelative: '—'
        };
      }
      const total = Number(b.totalPrice || 0);
      const st = String(b.status || '');
      const paySt = String(b.paymentStatus || b.payment_status || '');
      const isCancelled = st === 'Đã hủy';
      const paidAmountValue = b.paidAmount ?? b.paid_amount;
      const paidAmount = paidAmountValue !== undefined && paidAmountValue !== null
        ? Number(paidAmountValue)
        : (paySt === 'Đã cọc 30%'
          ? Number(b.depositAmount || b.deposit_amount || Math.round(total * 0.3))
          : (['Đã thanh toán đủ', 'Đã thanh toán 100%'].includes(paySt) ? total : 0));
      if (!isCancelled) customerMap[cleanP].bookingCount += 1;
      if (st === 'Hoàn thành') {
        customerMap[cleanP].completedCount += 1;
        customerMap[cleanP].matches += 1;
      }
      if (!isCancelled) customerMap[cleanP].spend += paidAmount;
      customerMap[cleanP].points = Number(b.points ?? b.loyalty_points ?? Math.floor(customerMap[cleanP].spend / 10000));
      if (st === 'Khách chưa đến' || st.includes('No-Show') || paySt === 'Tịch thu cọc 30%') {
        customerMap[cleanP].noShowCount += 1;
      } else if (st !== 'Đã hủy' && st !== 'Hoàn thành') {
        const dep = Number(b.depositAmount || Math.round(total * 0.3));
        const rem = typeof b.remainingAmount === 'number' ? b.remainingAmount : Math.max(0, total - dep);
        if (rem > 0) customerMap[cleanP].debtAmount += rem;
      }

      const bDate = b.bookingDate || b.booking_date || b.date || '';
      if (!isCancelled && bDate && (!customerMap[cleanP].lastBookingDate || bDate > customerMap[cleanP].lastBookingDate)) {
        customerMap[cleanP].lastBookingDate = bDate;
      }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    Object.values(customerMap).forEach(c => {
      if (c.lastBookingDate) {
        const d = new Date(c.lastBookingDate);
        if (!isNaN(d.getTime())) {
          d.setHours(0, 0, 0, 0);
          const diffDays = Math.round((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays <= 0) {
            c.lastBookingRelative = 'Hôm nay';
          } else {
            c.lastBookingRelative = `${diffDays} ngày trước`;
          }
        }
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
        <td colspan="9" class="py-12 text-center text-[#64748B]">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-3">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <div class="font-heading font-bold text-sm text-[#0F172A]">Không tìm thấy hội viên</div>
          <div class="text-[11px] text-[#94A3B8] mt-1">${searchQ ? 'Không có hội viên nào phù hợp với số điện thoại hoặc họ tên này' : 'Không có hội viên nào trong bộ lọc này'}</div>
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

  const isAdmin = (typeof isOwnerAdmin === 'function' && isOwnerAdmin()) || window.currentPortalRole === 'admin';

  tbody.innerHTML = customers.map(c => {
    const ns = Number(c.noShowCount || 0);
    const tierBadge = crmBadgeMap[c.customerTier] || crmBadgeMap.standard;
    const blacklistBadge = c.isBlacklisted
      ? '<span class="ml-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-600 text-white">Blacklist</span>'
      : '';

    const noShowBadge = ns > 0
      ? `<span class="ml-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">${ns} lần bùng</span>`
      : '';

    const safePhoneAttr = escapeJsAttr(c.phone);

    const editBtn = isAdmin
      ? `<button type="button" onclick="openEditMemberModal('${safePhoneAttr}')" class="ml-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer inline-flex items-center gap-1 shadow-xs transition-colors" title="Sửa thông tin hội viên"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg><span>Sửa hội viên</span></button>`
      : '';

    return `
      <tr class="hover:bg-slate-50 transition-colors ${c.isBlacklisted ? 'bg-red-50/40' : ''}">
        <td class="py-3 px-4">
          <div class="font-bold text-[#0F172A] flex items-center flex-wrap">
            <span>${escapeSearchHTML(c.name)}</span>${noShowBadge}
          </div>
          ${c.adminNote ? `<div class="text-[10px] text-[#64748B] truncate max-w-[200px]" title="${escapeSearchHTML(c.adminNote)}">Ghi chú: ${escapeSearchHTML(c.adminNote)}</div>` : ''}
        </td>
        <td class="py-3 px-4 font-mono font-medium text-[#475569]">${escapeSearchHTML(c.phone)}</td>
        <td class="py-3 px-4 text-right font-medium text-[#334155]">${Number(c.matches) || 0}</td>
        <td class="py-3 px-4 text-right font-bold text-[#16A34A]">${Number(c.points || 0).toLocaleString('vi-VN')}</td>
        <td class="py-3 px-4 whitespace-nowrap text-[#475569] font-medium">${escapeSearchHTML(formatAdminCustomerBookingDate(c.lastBookingDate))}</td>
        <td class="py-3 px-4 whitespace-nowrap">
          <div class="flex items-center gap-1.5">
            <span class="font-bold text-[#0F172A]">${Number(c.bookingCount || 0)} lượt</span>
            ${tierBadge}${blacklistBadge}
          </div>
        </td>
        <td class="py-3 px-4 text-right font-bold ${Number(c.debtAmount || 0) > 0 ? 'text-rose-600' : 'text-[#94A3B8]'}">${Number(c.debtAmount || 0) > 0 ? `${Number(c.debtAmount).toLocaleString('vi-VN')}đ` : '—'}</td>
        <td class="py-3 px-4 text-right font-extrabold text-[#0F172A]">${Number(c.spend || 0).toLocaleString('vi-VN')}đ</td>
        <td class="py-3 px-4 text-right whitespace-nowrap">
          <button type="button" onclick="openCustomerCrmModal('${safePhoneAttr}')" class="px-2.5 py-1 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-[11px] cursor-pointer">Hồ sơ / CRM</button>
          ${editBtn}
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

  const crmEditBtn = document.getElementById('crm-open-edit-member-btn');
  const isAdmin = (typeof isOwnerAdmin === 'function' && isOwnerAdmin()) || window.currentPortalRole === 'admin';
  if (crmEditBtn) {
    if (isAdmin) {
      crmEditBtn.classList.remove('hidden');
      crmEditBtn.classList.add('inline-flex');
    } else {
      crmEditBtn.classList.add('hidden');
      crmEditBtn.classList.remove('inline-flex');
    }
  }

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

/* ==========================================================================
   C2: ADMIN SỬA THÔNG TIN HỘI VIÊN & ĐIỀU CHỈNH ĐIỂM TÍCH LŨY
   ========================================================================== */

async function openEditMemberModal(phone) {
  if (!phone) return;
  const modal = document.getElementById('modal-edit-member');
  if (!modal) return;

  const isAdmin = (typeof isOwnerAdmin === 'function' && isOwnerAdmin()) || window.currentPortalRole === 'admin';
  if (!isAdmin) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Chỉ tài khoản Quản trị viên (Admin) mới có quyền chỉnh sửa hội viên.', 'warning');
    }
    return;
  }

  const nameEl = document.getElementById('edit-member-name');
  const phoneEl = document.getElementById('edit-member-phone');
  const emailEl = document.getElementById('edit-member-email');
  const noteEl = document.getElementById('edit-member-note');
  const badgeEl = document.getElementById('edit-member-current-points-badge');
  const oldPointsEl = document.getElementById('edit-member-old-points');
  const pointsEl = document.getElementById('edit-member-points');
  const reasonWrap = document.getElementById('edit-member-points-reason-wrap');
  const reasonEl = document.getElementById('edit-member-points-reason');
  const diffHint = document.getElementById('edit-member-points-diff-hint');
  const idEl = document.getElementById('edit-member-id');
  const updatedAtEl = document.getElementById('edit-member-updated-at');

  let cached = adminCustomersCache.find(c => c.phone === phone);
  if (nameEl) nameEl.value = cached?.name || '';
  if (phoneEl) phoneEl.value = phone;
  if (emailEl) emailEl.value = cached?.email || '';
  if (noteEl) noteEl.value = cached?.adminNote || '';
  if (idEl) idEl.value = cached?.userId || cached?.id || '';
  if (updatedAtEl) updatedAtEl.value = cached?.updatedAt || '';

  const initialPoints = Number(cached?.points || 0);
  if (badgeEl) badgeEl.textContent = initialPoints.toLocaleString('vi-VN') + ' điểm';
  if (oldPointsEl) oldPointsEl.value = initialPoints;
  if (pointsEl) pointsEl.value = initialPoints;
  if (reasonWrap) reasonWrap.classList.add('hidden');
  if (reasonEl) {
    reasonEl.value = '';
    reasonEl.required = false;
  }
  if (diffHint) diffHint.classList.add('hidden');

  modal.classList.remove('hidden');
  modal.classList.add('flex');

  try {
    const r = await adminFetchJson(`../api/admin.php?action=search_customers&search=${encodeURIComponent(phone)}`);
    if (r.ok && Array.isArray(r.data) && r.data.length > 0) {
      const cleanTarget = phone.replace(/[^\d]/g, '');
      const found = r.data.find(u => {
        const uClean = String(u.clean_phone || u.phone || '').replace(/[^\d]/g, '');
        return uClean === cleanTarget;
      }) || r.data[0];

      if (found) {
        const uId = found.user_id || found.id || 0;
        if (idEl) idEl.value = uId;
        if (updatedAtEl) updatedAtEl.value = found.updated_at || '';
        if (nameEl && found.full_name) nameEl.value = found.full_name;
        if (phoneEl && found.phone) phoneEl.value = found.phone;
        if (emailEl) emailEl.value = found.email || '';
        if (noteEl) noteEl.value = found.admin_note || '';

        const pts = Number(found.points || 0);
        if (badgeEl) badgeEl.textContent = pts.toLocaleString('vi-VN') + ' điểm';
        if (oldPointsEl) oldPointsEl.value = pts;
        if (pointsEl) pointsEl.value = pts;
      }
    } else if (r.ok && (!r.data || r.data.length === 0)) {
      if (!idEl?.value) {
        if (window.SanBongApp?.showToast) {
          window.SanBongApp.showToast('Khách hàng này chưa có tài khoản hội viên trong bảng users. Hãy cập nhật tại Hồ sơ CRM.', 'info', 4000);
        }
      }
    }
  } catch (err) {
    console.warn('Lỗi khi tải chi tiết hội viên:', err);
  }
}
window.openEditMemberModal = openEditMemberModal;

function openEditMemberModalFromCrm() {
  const phone = document.getElementById('crm-form-phone')?.value;
  if (phone) {
    openEditMemberModal(phone);
  }
}
window.openEditMemberModalFromCrm = openEditMemberModalFromCrm;

function closeEditMemberModal() {
  const modal = document.getElementById('modal-edit-member');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}
window.closeEditMemberModal = closeEditMemberModal;

function handleEditMemberPointsChange() {
  const oldPoints = Number(document.getElementById('edit-member-old-points')?.value || 0);
  const newPointsVal = document.getElementById('edit-member-points')?.value;
  const newPoints = newPointsVal === '' ? oldPoints : Number(newPointsVal);
  const reasonWrap = document.getElementById('edit-member-points-reason-wrap');
  const reasonEl = document.getElementById('edit-member-points-reason');
  const diffHint = document.getElementById('edit-member-points-diff-hint');

  const diff = newPoints - oldPoints;
  if (diff !== 0) {
    if (reasonWrap) reasonWrap.classList.remove('hidden');
    if (reasonEl) reasonEl.required = true;
    if (diffHint) {
      diffHint.classList.remove('hidden');
      if (diff > 0) {
        diffHint.textContent = `Tăng +${diff.toLocaleString('vi-VN')} điểm`;
        diffHint.className = 'text-[11px] text-emerald-600 font-bold mt-1';
      } else {
        diffHint.textContent = `Giảm ${diff.toLocaleString('vi-VN')} điểm`;
        diffHint.className = 'text-[11px] text-rose-600 font-bold mt-1';
      }
    }
  } else {
    if (reasonWrap) reasonWrap.classList.add('hidden');
    if (reasonEl) {
      reasonEl.required = false;
      reasonEl.value = '';
    }
    if (diffHint) diffHint.classList.add('hidden');
  }
}
window.handleEditMemberPointsChange = handleEditMemberPointsChange;

async function handleEditMemberSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();

  const userId = Number(document.getElementById('edit-member-id')?.value || 0);
  const updatedAt = (document.getElementById('edit-member-updated-at')?.value || '').trim();
  const name = (document.getElementById('edit-member-name')?.value || '').trim();
  const phone = (document.getElementById('edit-member-phone')?.value || '').trim();
  const email = (document.getElementById('edit-member-email')?.value || '').trim();
  const note = (document.getElementById('edit-member-note')?.value || '').trim();
  const oldPoints = Number(document.getElementById('edit-member-old-points')?.value || 0);
  const newPointsVal = document.getElementById('edit-member-points')?.value;
  const newPoints = newPointsVal === '' ? oldPoints : Number(newPointsVal);
  const reason = (document.getElementById('edit-member-points-reason')?.value || '').trim();

  if (!userId) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Không tìm thấy tài khoản hội viên để cập nhật trong hệ thống users. Bạn có thể cập nhật thông tin tại Hồ sơ CRM!', 'error', 4500);
    }
    return;
  }

  if (!name) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập họ và tên hội viên!', 'warning');
    return;
  }

  if (!phone) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập số điện thoại hội viên!', 'warning');
    return;
  }

  const diff = newPoints - oldPoints;
  if (diff !== 0 && !reason) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập lý do điều chỉnh điểm tích lũy!', 'warning');
    document.getElementById('edit-member-points-reason')?.focus();
    return;
  }

  let confirmMessage = `Xác nhận thay đổi thông tin hội viên?\n\n• Họ tên: ${name}\n• SĐT: ${phone}`;
  if (email) confirmMessage += `\n• Email: ${email}`;
  if (diff !== 0) {
    confirmMessage += `\n• Điểm cũ: [${oldPoints.toLocaleString('vi-VN')}] → Điểm mới: [${newPoints.toLocaleString('vi-VN')}] (Lý do: [${reason}])`;
  }

  let isConfirmed = false;
  if (typeof showAdminConfirm === 'function') {
    isConfirmed = await showAdminConfirm({
      title: 'Xác nhận thay đổi thông tin hội viên',
      message: confirmMessage,
      confirmText: 'Xác nhận lưu',
      cancelText: 'Quay lại',
      danger: false
    });
  } else {
    isConfirmed = window.confirm(confirmMessage);
  }

  if (!isConfirmed) return;

  const submitBtn = document.getElementById('btn-submit-edit-member');
  const origBtnHtml = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⏳ Đang lưu...</span>';
  }

  try {
    const payload = {
      user_id: userId,
      full_name: name,
      phone: phone,
      email: email,
      admin_note: note,
      points: newPoints,
      points_reason: reason,
      updated_at: updatedAt
    };

    const res = await adminFetchJson('../api/admin.php?action=update_member', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errMsg = res.message || res.error || 'Có lỗi xảy ra khi cập nhật thông tin hội viên!';
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(errMsg, 'error', 5000);
      } else {
        alert(errMsg);
      }
      return;
    }

    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(res.message || '✓ Đã cập nhật thông tin hội viên thành công!', 'success', 3500);
    }
    closeEditMemberModal();
    await renderAdminCustomers();
  } catch (err) {
    console.error('Lỗi khi lưu thông tin hội viên:', err);
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Không thể kết nối đến máy chủ. Vui lòng thử lại!', 'error');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origBtnHtml;
    }
  }
}
window.handleEditMemberSubmit = handleEditMemberSubmit;

