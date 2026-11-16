/**
 * admin_customers.js - Quản lý Khách hàng & Hội viên (CRM) Sân Bóng Pro
 * Phiên bản chuẩn hóa: Purge sạch nợ, bảng dữ liệu sinh từ mảng cấu hình cột duy nhất,
 * Modal CRM hợp nhất một biểu mẫu lưu duy nhất.
 */

let crmCustomersFetchSeq = 0;
let currentCustomerFilter = 'all';
let adminCustomersCache = [];
let currentCrmBookings = [];
let currentCrmBookingsPage = 1;
const CRM_BOOKINGS_PAGE_SIZE = 5;
let currentCrmPointsLog = [];
let currentCrmPointsLogPage = 1;
const CRM_POINTS_PAGE_SIZE = 10;
let currentCrmAuditLogs = [];
let currentCrmAuditLogsPage = 1;
const CRM_AUDIT_PAGE_SIZE = 10;

window.crmCustomersFetchSeq = crmCustomersFetchSeq;
window.currentCustomerFilter = currentCustomerFilter;

/* ==========================================================================
   BỘ LỌC & TÌM KIẾM KHÁCH HÀNG
   ========================================================================== */

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

/* ==========================================================================
   HÀM TIỆN ÍCH ĐỊNH DẠNG NGÀY & ĐIỆN THOẠI
   ========================================================================== */

function normalizeCustomerPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length === 11 && digits.startsWith('84') ? `0${digits.slice(2)}` : digits;
}

function formatAdminCustomerBookingDate(value) {
  const raw = String(value || '').trim();
  if (!raw || raw === '—') return '—';

  const isoDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function formatCustomerLastBookingRelative(dateVal) {
  if (!dateVal) return '—';
  const raw = String(dateVal).trim();
  if (!raw || raw === '—') return '—';

  let d;
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    d = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  } else {
    d = new Date(raw);
  }
  if (Number.isNaN(d.getTime())) return '—';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);

  const diffDays = Math.round((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Hôm nay';
  if (diffDays > 0) return `${diffDays} ngày trước`;
  return 'Sắp tới';
}

/* ==========================================================================
   CẤU HÌNH CỘT DUY NHẤT (SINGLE COLUMN DEFINITION ARRAY)
   Sinh cả thead lẫn tbody để chống lệch cột 100%.
   Các cột chính xác:
   Tên hội viên | Số điện thoại | Hạng | Trận hoàn thành | Điểm tích lũy | Đặt gần nhất | Tổng chi tiêu | Thao tác
   ========================================================================== */

const crmBadgeMap = {
  vip: '<span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">VIP</span>',
  regular: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">Khách quen</span>',
  warning_noshow: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-300">Cảnh báo bùng</span>',
  standard: '<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">Tiêu chuẩn</span>'
};

const CUSTOMER_TABLE_COLUMNS = [
  {
    key: 'name',
    label: 'Tên hội viên',
    thClass: 'py-3 px-4 text-left font-bold',
    tdClass: 'py-3 px-4',
    render: (c) => {
      const ns = Number(c.noShowCount || 0);
      const noShowBadge = ns > 0
        ? `<span class="ml-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">${ns} lần bùng</span>`
        : '';
      const blacklistBadge = c.isBlacklisted
        ? '<span class="ml-1.5 px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-600 text-white">Blacklist</span>'
        : '';
      const noteHtml = c.adminNote
        ? `<div class="text-[10px] text-[#64748B] truncate max-w-[200px]" title="${escapeSearchHTML(c.adminNote)}">Ghi chú: ${escapeSearchHTML(c.adminNote)}</div>`
        : '';
      return `
        <div class="font-bold text-[#0F172A] flex items-center flex-wrap">
          <span>${escapeSearchHTML(c.name)}</span>${noShowBadge}${blacklistBadge}
        </div>
        ${noteHtml}
      `;
    }
  },
  {
    key: 'phone',
    label: 'Số điện thoại',
    thClass: 'py-3 px-4 text-left font-bold',
    tdClass: 'py-3 px-4 font-mono font-medium text-[#475569]',
    render: (c) => escapeSearchHTML(c.phone)
  },
  {
    key: 'tier',
    label: 'Hạng',
    thClass: 'py-3 px-4 text-left font-bold',
    tdClass: 'py-3 px-4 whitespace-nowrap',
    render: (c) => crmBadgeMap[c.customerTier] || crmBadgeMap.standard
  },
  {
    key: 'completedCount',
    label: 'Trận hoàn thành',
    thClass: 'py-3 px-4 text-right font-bold',
    tdClass: 'py-3 px-4 text-right font-medium text-[#334155]',
    render: (c) => String(Number(c.completedCount ?? c.matches ?? 0))
  },
  {
    key: 'points',
    label: 'Điểm tích lũy',
    thClass: 'py-3 px-4 text-right font-bold',
    tdClass: 'py-3 px-4 text-right font-bold text-[#16A34A]',
    render: (c) => `${Number(c.points || 0).toLocaleString('vi-VN')} điểm`
  },
  {
    key: 'lastBooking',
    label: 'Đặt gần nhất',
    thClass: 'py-3 px-4 text-left font-bold',
    tdClass: 'py-3 px-4 whitespace-nowrap text-[#475569] font-medium',
    render: (c) => escapeSearchHTML(c.lastBookingRelative || formatCustomerLastBookingRelative(c.lastBookingDate))
  },
  {
    key: 'spend',
    label: 'Tổng chi tiêu',
    thClass: 'py-3 px-4 text-right font-bold',
    tdClass: 'py-3 px-4 text-right font-extrabold text-[#0F172A]',
    render: (c) => `${Number(c.spend || 0).toLocaleString('vi-VN')}đ`
  },
  {
    key: 'actions',
    label: 'Thao tác',
    thClass: 'py-3 px-4 text-right font-bold',
    tdClass: 'py-3 px-4 text-right whitespace-nowrap',
    render: (c) => {
      const safePhoneAttr = escapeJsAttr(c.phone);
      return `
        <button type="button" onclick="openCustomerCrmModal('${safePhoneAttr}')" class="px-2.5 py-1 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-[11px] cursor-pointer inline-flex items-center gap-1 shadow-xs transition-colors">
          <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
          <span>Hồ sơ CRM</span>
        </button>
      `;
    }
  }
];

function renderCustomerTableHeader() {
  const thead = document.getElementById('admin-customers-thead');
  if (!thead) return;
  thead.innerHTML = `<tr>${CUSTOMER_TABLE_COLUMNS.map(col => `<th class="${col.thClass}">${col.label}</th>`).join('')}</tr>`;
}

/* ==========================================================================
   TẢI VÀ RENDER DANH SÁCH KHÁCH HÀNG
   ========================================================================== */

async function renderAdminCustomers() {
  const tbody = document.getElementById('admin-customers-tbody');
  if (!tbody) return;

  renderCustomerTableHeader();

  const seq = ++crmCustomersFetchSeq;
  const searchQ = (document.getElementById('admin-cust-search')?.value || '').trim();
  const apiTier = currentCustomerFilter || 'all';

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
      points: Number(c.points ?? c.loyalty_points ?? 0),
      updatedAt: c.updated_at || '',
      isMember: Boolean(c.is_member ?? c.user_id),
      lastBookingDate: c.lastBookingDate || c.last_booking_date || '',
      lastBookingRelative: c.lastBookingRelative || formatCustomerLastBookingRelative(c.lastBookingDate || c.last_booking_date)
    }));

    if (currentCustomerFilter === 'vip') {
      customers = customers.filter(c => c.customerTier === 'vip');
    } else if (currentCustomerFilter === 'regular') {
      customers = customers.filter(c => c.customerTier === 'regular');
    }
  } else if (!r.ok && r.status === 0) {
    // Offline fallback an toàn từ SanBongDB
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
      }

      const bDate = b.bookingDate || b.booking_date || b.date || '';
      if (!isCancelled && bDate && (!customerMap[cleanP].lastBookingDate || bDate > customerMap[cleanP].lastBookingDate)) {
        customerMap[cleanP].lastBookingDate = bDate;
      }
    });

    Object.values(customerMap).forEach(c => {
      c.lastBookingRelative = formatCustomerLastBookingRelative(c.lastBookingDate);
    });

    customers = Object.values(customerMap);
    if (currentCustomerFilter === 'vip') customers = customers.filter(c => c.customerTier === 'vip');
    else if (currentCustomerFilter === 'regular') customers = customers.filter(c => c.customerTier === 'regular');
    if (searchQ) {
      const qLow = searchQ.toLowerCase();
      customers = customers.filter(c => c.name.toLowerCase().includes(qLow) || c.phone.includes(searchQ));
    }
  } else {
    tbody.innerHTML = `<tr><td colspan="${CUSTOMER_TABLE_COLUMNS.length}" class="py-8 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải danh sách khách hàng CRM.')}</td></tr>`;
    return;
  }

  adminCustomersCache = customers;
  customers.sort((a, b) => (Number(b.isBlacklisted) - Number(a.isBlacklisted)) || (b.noShowCount - a.noShowCount) || (b.spend - a.spend));

  if (customers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="${CUSTOMER_TABLE_COLUMNS.length}" class="py-12 text-center text-[#64748B]">
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

  tbody.innerHTML = customers.map(c => `
    <tr class="hover:bg-slate-50 transition-colors ${c.isBlacklisted ? 'bg-red-50/40' : ''}">
      ${CUSTOMER_TABLE_COLUMNS.map(col => `<td class="${col.tdClass}">${col.render(c)}</td>`).join('')}
    </tr>
  `).join('');
}
window.renderAdminCustomers = renderAdminCustomers;

/* ==========================================================================
   MODAL HỒ SƠ CRM & QUẢN LÝ HỘI VIÊN (UNIFIED EDIT PATH)
   ========================================================================== */

function handleCrmTierChange() {
  const currentVal = document.getElementById('crm-form-tier')?.value;
  const oldVal = document.getElementById('crm-form-old-tier')?.value;
  const reasonWrap = document.getElementById('crm-form-tier-reason-wrap');
  const reasonInput = document.getElementById('crm-form-tier-reason');

  if (currentVal && oldVal && currentVal !== oldVal) {
    if (reasonWrap) reasonWrap.classList.remove('hidden');
    if (reasonInput) reasonInput.required = true;
  } else {
    if (reasonWrap) reasonWrap.classList.add('hidden');
    if (reasonInput) {
      reasonInput.required = false;
      reasonInput.value = '';
    }
  }
}
window.handleCrmTierChange = handleCrmTierChange;

function handleCrmBlacklistChange() {
  const isChecked = Boolean(document.getElementById('crm-form-blacklist')?.checked);
  const reasonWrap = document.getElementById('crm-form-blacklist-reason-wrap');
  const reasonInput = document.getElementById('crm-form-blacklist-reason');

  if (isChecked) {
    if (reasonWrap) reasonWrap.classList.remove('hidden');
    if (reasonInput) reasonInput.required = true;
  } else {
    if (reasonWrap) reasonWrap.classList.add('hidden');
    if (reasonInput) {
      reasonInput.required = false;
      reasonInput.value = '';
    }
  }
}
window.handleCrmBlacklistChange = handleCrmBlacklistChange;

function handleCrmPointsChange(source) {
  const oldPoints = Number(document.getElementById('crm-form-old-points')?.value || 0);
  const pointsEl = document.getElementById('crm-form-points');
  const deltaEl = document.getElementById('crm-form-points-delta');
  const hintEl = document.getElementById('crm-points-diff-hint');
  const reasonWrap = document.getElementById('crm-form-points-reason-wrap');
  const reasonInput = document.getElementById('crm-form-points-reason');

  let newPoints = oldPoints;

  if (source === 'absolute') {
    const rawVal = pointsEl?.value;
    newPoints = rawVal === '' ? oldPoints : Math.max(0, Number(rawVal));
    const diff = newPoints - oldPoints;
    if (deltaEl) deltaEl.value = diff !== 0 ? diff : '';
  } else if (source === 'delta') {
    const rawDelta = deltaEl?.value;
    const delta = rawDelta === '' ? 0 : Number(rawDelta);
    newPoints = Math.max(0, oldPoints + delta);
    if (pointsEl) pointsEl.value = newPoints;
  }

  const finalDiff = newPoints - oldPoints;
  if (finalDiff !== 0) {
    if (hintEl) {
      hintEl.classList.remove('hidden');
      if (finalDiff > 0) {
        hintEl.textContent = `Tăng +${finalDiff.toLocaleString('vi-VN')} điểm`;
        hintEl.className = 'text-xs font-bold text-emerald-600';
      } else {
        hintEl.textContent = `Giảm ${finalDiff.toLocaleString('vi-VN')} điểm`;
        hintEl.className = 'text-xs font-bold text-rose-600';
      }
    }
    if (reasonWrap) reasonWrap.classList.remove('hidden');
    if (reasonInput) reasonInput.required = true;
  } else {
    if (hintEl) hintEl.classList.add('hidden');
    if (reasonWrap) reasonWrap.classList.add('hidden');
    if (reasonInput) {
      reasonInput.required = false;
      reasonInput.value = '';
    }
  }
}
window.handleCrmPointsChange = handleCrmPointsChange;

/* Subtab switching inside Customer CRM Modal */
function switchCrmSubTab(tab) {
  const subtabs = ['bookings', 'points', 'audit'];
  subtabs.forEach(t => {
    const btn = document.getElementById(`crm-subtab-${t}-btn`);
    const pane = document.getElementById(`crm-subtab-${t}`);
    if (t === tab) {
      if (btn) btn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0F172A] text-white cursor-pointer';
      if (pane) pane.classList.remove('hidden');
    } else {
      if (btn) btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer';
      if (pane) pane.classList.add('hidden');
    }
  });
}
window.switchCrmSubTab = switchCrmSubTab;

/* ==========================================================================
   RENDER 3 PHẦN LỊCH SỬ TRONG MODAL CRM
   ========================================================================== */

function renderCrmBookings() {
  const tbody = document.getElementById('crm-history-tbody');
  const badgeEl = document.getElementById('crm-bookings-count-badge');
  const paginationEl = document.getElementById('crm-bookings-pagination');
  if (!tbody) return;

  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');
  const list = currentCrmBookings || [];
  if (badgeEl) badgeEl.textContent = String(list.length);

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="py-5 text-center text-[#94A3B8]">Khách chưa có lịch sử đặt sân nào.</td></tr>';
    if (paginationEl) paginationEl.innerHTML = '';
    return;
  }

  // Sắp xếp mới nhất lên đầu (newest first)
  list.sort((a, b) => {
    const da = String(a.booking_date || a.bookingDate || a.date || '');
    const db = String(b.booking_date || b.bookingDate || b.date || '');
    if (da !== db) return db.localeCompare(da);
    return Number(b.id || 0) - Number(a.id || 0);
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const totalShown = Math.min(list.length, currentCrmBookingsPage * CRM_BOOKINGS_PAGE_SIZE);
  const pagedList = list.slice(0, totalShown);

  tbody.innerHTML = pagedList.map(b => {
    const bDate = String(b.booking_date || b.bookingDate || b.date || '');
    const isFuture = bDate >= todayStr && b.status !== 'Đã hủy' && b.status !== 'Hoàn thành';
    const futureBadge = isFuture
      ? '<span class="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">Sắp tới</span>'
      : '';

    const formattedDate = formatAdminCustomerBookingDate(bDate);

    const isCancelled = (b.status === 'Đã hủy');
    const statusBadge = isCancelled
      ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">Đã hủy</span>'
      : (b.status === 'Hoàn thành'
        ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Hoàn thành</span>'
        : `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700">${escapeSearchHTML(b.status || '')}</span>`);

    return `
      <tr class="hover:bg-slate-50">
        <td class="py-2 px-3 font-mono font-bold text-[#0F172A]">#${escapeSearchHTML(b.code || '')}</td>
        <td class="py-2 px-3">
          <div class="font-bold text-[#0F172A] flex items-center">${escapeSearchHTML(formattedDate)}${futureBadge}</div>
          <div class="text-[11px] text-[#64748B]">${escapeSearchHTML(b.pitch_name || b.pitchName || b.pitch_id || '')}</div>
        </td>
        <td class="py-2 px-3 font-semibold text-[#334155]">${escapeSearchHTML(b.slot_time || b.slotTime || '')}</td>
        <td class="py-2 px-3 text-right font-bold text-[#0F172A]">${escapeSearchHTML(fmt(b.total_price ?? b.totalPrice ?? 0))}</td>
        <td class="py-2 px-3 text-right">
          <div>${statusBadge}</div>
          <div class="text-[10px] text-[#64748B] mt-0.5">${escapeSearchHTML(b.payment_status || b.paymentStatus || '')}</div>
        </td>
      </tr>
    `;
  }).join('');

  if (paginationEl) {
    if (totalShown < list.length) {
      paginationEl.innerHTML = `
        <span>Đang hiển thị ${totalShown} / ${list.length} ca</span>
        <button type="button" onclick="loadMoreCrmBookings()" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer">
          Xem thêm (${list.length - totalShown} ca tiếp) »
        </button>
      `;
    } else {
      paginationEl.innerHTML = `<span>Hiển thị toàn bộ ${list.length} ca</span>`;
    }
  }
}

function loadMoreCrmBookings() {
  currentCrmBookingsPage++;
  renderCrmBookings();
}
window.loadMoreCrmBookings = loadMoreCrmBookings;

function renderCrmPointsLog() {
  const tbody = document.getElementById('crm-points-log-tbody');
  const badgeEl = document.getElementById('crm-points-count-badge');
  const paginationEl = document.getElementById('crm-points-log-pagination');
  if (!tbody) return;

  const list = currentCrmPointsLog || [];
  if (badgeEl) badgeEl.textContent = String(list.length);

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="py-5 text-center text-[#94A3B8]">Chưa có biến động điểm thưởng nào.</td></tr>';
    if (paginationEl) paginationEl.innerHTML = '';
    return;
  }

  const totalShown = Math.min(list.length, currentCrmPointsLogPage * CRM_POINTS_PAGE_SIZE);
  const pagedList = list.slice(0, totalShown);

  tbody.innerHTML = pagedList.map(item => {
    const delta = Number(item.delta || item.points_delta || 0);
    const deltaClass = delta > 0 ? 'text-emerald-700 font-bold' : (delta < 0 ? 'text-rose-600 font-bold' : 'text-slate-600');
    const deltaSign = delta > 0 ? `+${delta.toLocaleString('vi-VN')}` : delta.toLocaleString('vi-VN');
    const balAfter = item.balance_after ?? item.points_after;
    const balText = balAfter !== undefined && balAfter !== null ? `${Number(balAfter).toLocaleString('vi-VN')} điểm` : '—';

    return `
      <tr class="hover:bg-slate-50">
        <td class="py-2 px-3 text-[#475569] whitespace-nowrap">${escapeSearchHTML(item.created_at || item.time || '—')}</td>
        <td class="py-2 px-3 text-right ${deltaClass} whitespace-nowrap">${deltaSign} điểm</td>
        <td class="py-2 px-3 text-right font-bold text-[#0F172A] whitespace-nowrap">${balText}</td>
        <td class="py-2 px-3 text-[#334155] max-w-[200px] truncate" title="${escapeSearchHTML(item.reason || '')}">${escapeSearchHTML(item.reason || 'Điều chỉnh điểm')}</td>
        <td class="py-2 px-3 text-[#64748B] whitespace-nowrap">${escapeSearchHTML(item.admin_name || item.created_by || item.actor || 'Hệ thống')}</td>
      </tr>
    `;
  }).join('');

  if (paginationEl) {
    if (totalShown < list.length) {
      paginationEl.innerHTML = `
        <span>Đang hiển thị ${totalShown} / ${list.length} lượt</span>
        <button type="button" onclick="loadMoreCrmPointsLog()" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer">
          Xem thêm (${list.length - totalShown} lượt) »
        </button>
      `;
    } else {
      paginationEl.innerHTML = `<span>Hiển thị toàn bộ ${list.length} lượt</span>`;
    }
  }
}

function loadMoreCrmPointsLog() {
  currentCrmPointsLogPage++;
  renderCrmPointsLog();
}
window.loadMoreCrmPointsLog = loadMoreCrmPointsLog;

function renderCrmAuditLogs() {
  const tbody = document.getElementById('crm-audit-log-tbody');
  const badgeEl = document.getElementById('crm-audit-count-badge');
  const paginationEl = document.getElementById('crm-audit-log-pagination');
  if (!tbody) return;

  const list = currentCrmAuditLogs || [];
  if (badgeEl) badgeEl.textContent = String(list.length);

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="py-5 text-center text-[#94A3B8]">Chưa có lịch sử chỉnh sửa hồ sơ.</td></tr>';
    if (paginationEl) paginationEl.innerHTML = '';
    return;
  }

  const totalShown = Math.min(list.length, currentCrmAuditLogsPage * CRM_AUDIT_PAGE_SIZE);
  const pagedList = list.slice(0, totalShown);

  tbody.innerHTML = pagedList.map(log => {
    let actionDesc = log.action || log.description || log.message || '';
    if (log.details && typeof log.details === 'object') {
      try {
        actionDesc += ' ' + JSON.stringify(log.details);
      } catch (e) {}
    }

    return `
      <tr class="hover:bg-slate-50">
        <td class="py-2 px-3 text-[#475569] whitespace-nowrap">${escapeSearchHTML(log.created_at || log.time || '—')}</td>
        <td class="py-2 px-3 font-semibold text-[#0F172A] whitespace-nowrap">${escapeSearchHTML(log.admin_name || log.username || log.actor || 'Quản trị viên')}</td>
        <td class="py-2 px-3 text-[#334155] max-w-[260px] truncate" title="${escapeSearchHTML(actionDesc)}">${escapeSearchHTML(actionDesc)}</td>
        <td class="py-2 px-3 font-mono text-[11px] text-[#64748B] whitespace-nowrap">${escapeSearchHTML(log.ip_address || log.ip || '—')}</td>
      </tr>
    `;
  }).join('');

  if (paginationEl) {
    if (totalShown < list.length) {
      paginationEl.innerHTML = `
        <span>Đang hiển thị ${totalShown} / ${list.length} bản ghi</span>
        <button type="button" onclick="loadMoreCrmAuditLogs()" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer">
          Xem thêm (${list.length - totalShown} bản ghi) »
        </button>
      `;
    } else {
      paginationEl.innerHTML = `<span>Hiển thị toàn bộ ${list.length} bản ghi</span>`;
    }
  }
}

function loadMoreCrmAuditLogs() {
  currentCrmAuditLogsPage++;
  renderCrmAuditLogs();
}
window.loadMoreCrmAuditLogs = loadMoreCrmAuditLogs;

/* ==========================================================================
   MỞ MODAL CRM & ĐỒNG BỘ DỮ LIỆU
   ========================================================================== */

async function openCustomerCrmModal(phone) {
  const modal = document.getElementById('customer-crm-modal');
  if (!modal) return;

  const phoneLbl = document.getElementById('crm-phone-label');
  const tierBadge = document.getElementById('crm-tier-badge');
  const statsEl = document.getElementById('crm-summary-stats');

  const userIdEl = document.getElementById('crm-form-user-id');
  const updatedAtEl = document.getElementById('crm-form-updated-at');
  const oldPhoneEl = document.getElementById('crm-form-old-phone');
  const formPhoneEl = document.getElementById('crm-form-phone');
  const nameEl = document.getElementById('crm-form-name');
  const emailEl = document.getElementById('crm-form-email');
  const tierEl = document.getElementById('crm-form-tier');
  const oldTierEl = document.getElementById('crm-form-old-tier');
  const tierReasonWrap = document.getElementById('crm-form-tier-reason-wrap');
  const tierReasonEl = document.getElementById('crm-form-tier-reason');
  const blackEl = document.getElementById('crm-form-blacklist');
  const blackReasonWrap = document.getElementById('crm-form-blacklist-reason-wrap');
  const blackReasonEl = document.getElementById('crm-form-blacklist-reason');
  const oldPointsEl = document.getElementById('crm-form-old-points');
  const pointsEl = document.getElementById('crm-form-points');
  const deltaEl = document.getElementById('crm-form-points-delta');
  const curPointsBadge = document.getElementById('crm-current-points-badge');
  const pointsHint = document.getElementById('crm-points-diff-hint');
  const pointsReasonWrap = document.getElementById('crm-form-points-reason-wrap');
  const pointsReasonEl = document.getElementById('crm-form-points-reason');
  const noteEl = document.getElementById('crm-form-note');

  if (phoneLbl) phoneLbl.textContent = phone || '---';
  if (tierBadge) tierBadge.innerHTML = crmBadgeMap.standard;
  if (oldPhoneEl) oldPhoneEl.value = phone || '';
  if (formPhoneEl) formPhoneEl.value = phone || '';

  // Điền dữ liệu từ cache tạm thời để giao diện phản hồi tức thì
  const cached = adminCustomersCache.find(c => c.phone === phone);
  if (cached) {
    if (nameEl) nameEl.value = cached.name || '';
    if (emailEl) emailEl.value = cached.email || '';
    if (tierEl) tierEl.value = cached.customerTier || 'standard';
    if (oldTierEl) oldTierEl.value = cached.customerTier || 'standard';
    if (blackEl) blackEl.checked = Boolean(cached.isBlacklisted);
    if (noteEl) noteEl.value = cached.adminNote || '';
    if (userIdEl) userIdEl.value = cached.userId || cached.id || '';
    if (updatedAtEl) updatedAtEl.value = cached.updatedAt || '';
    const pts = Number(cached.points || 0);
    if (oldPointsEl) oldPointsEl.value = pts;
    if (pointsEl) pointsEl.value = pts;
    if (curPointsBadge) curPointsBadge.textContent = `${pts.toLocaleString('vi-VN')} điểm`;
    if (tierBadge) tierBadge.innerHTML = crmBadgeMap[cached.customerTier] || crmBadgeMap.standard;
  }

  // Reset các ô bổ sung
  if (deltaEl) deltaEl.value = '';
  if (pointsHint) pointsHint.classList.add('hidden');
  if (pointsReasonWrap) pointsReasonWrap.classList.add('hidden');
  if (pointsReasonEl) {
    pointsReasonEl.value = '';
    pointsReasonEl.required = false;
  }
  if (tierReasonWrap) tierReasonWrap.classList.add('hidden');
  if (tierReasonEl) {
    tierReasonEl.value = '';
    tierReasonEl.required = false;
  }
  if (blackReasonWrap) blackReasonWrap.classList.add('hidden');
  if (blackReasonEl) {
    blackReasonEl.value = '';
    blackReasonEl.required = false;
  }

  // 4 Thẻ chỉ số đỉnh: Trận hoàn thành | Vắng mặt / Hủy | Điểm tích lũy | Tổng chi tiêu
  if (statsEl) {
    statsEl.innerHTML = '<div class="col-span-4 py-3 text-center text-[#64748B]">Đang tải chỉ số CRM...</div>';
  }

  // Reset phân trang và các mảng lịch sử
  currentCrmBookings = [];
  currentCrmBookingsPage = 1;
  currentCrmPointsLog = [];
  currentCrmPointsLogPage = 1;
  currentCrmAuditLogs = [];
  currentCrmAuditLogsPage = 1;

  switchCrmSubTab('bookings');

  modal.classList.remove('hidden');
  modal.classList.add('flex');

  // Gọi API lấy dữ liệu chi tiết
  const r = await adminFetchJson(`../api/admin.php?action=customer_detail&phone=${encodeURIComponent(phone)}`);
  if (!r.ok || !r.data) {
    if (statsEl) {
      statsEl.innerHTML = `<div class="col-span-4 py-3 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải chi tiết hồ sơ khách hàng.')}</div>`;
    }
    renderCrmBookings();
    renderCrmPointsLog();
    renderCrmAuditLogs();
    return;
  }

  const d = r.data;
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  if (nameEl && (d.customerName || d.customer_name || d.name)) {
    nameEl.value = d.customerName || d.customer_name || d.name;
  }
  if (emailEl && d.email !== undefined) emailEl.value = d.email || '';
  if (tierEl) {
    const assignedTier = d.customerTier || d.customer_tier || 'standard';
    tierEl.value = assignedTier;
    if (oldTierEl) oldTierEl.value = assignedTier;
    if (tierBadge) tierBadge.innerHTML = crmBadgeMap[assignedTier] || crmBadgeMap.standard;
  }
  if (blackEl) {
    blackEl.checked = Boolean(d.isBlacklisted ?? d.is_blacklisted);
    handleCrmBlacklistChange();
  }
  if (noteEl) noteEl.value = d.adminNote || d.admin_note || '';
  if (userIdEl) userIdEl.value = d.userId || d.user_id || userIdEl.value || '';
  if (updatedAtEl) updatedAtEl.value = d.updated_at || d.updatedAt || updatedAtEl.value || '';

  const serverPoints = Number(d.points ?? d.loyalty_points ?? 0);
  if (oldPointsEl) oldPointsEl.value = serverPoints;
  if (pointsEl) pointsEl.value = serverPoints;
  if (curPointsBadge) curPointsBadge.textContent = `${serverPoints.toLocaleString('vi-VN')} điểm`;

  // Render chính xác 4 thẻ đỉnh: Trận hoàn thành, Vắng mặt/Hủy, Điểm tích lũy, Tổng chi tiêu
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
        <div class="text-[11px] text-[#64748B]">Trận hoàn thành</div>
        <div class="font-heading font-extrabold text-lg text-emerald-700 mt-0.5">${Number(d.completedCount || 0)}</div>
        <div class="text-[10px] text-[#64748B]">Tổng ${Number(d.totalBookings || 0)} trận đã đặt</div>
      </div>
      <div class="p-3 rounded-xl bg-amber-50 border border-amber-200">
        <div class="text-[11px] text-[#64748B]">Vắng mặt / Hủy</div>
        <div class="font-heading font-extrabold text-lg text-amber-700 mt-0.5">${Number(d.noShowCount || 0)} / ${Number(d.cancelledCount || 0)}</div>
        <div class="text-[10px] text-[#64748B]">No-Show / Đã hủy</div>
      </div>
      <div class="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
        <div class="text-[11px] text-[#64748B]">Điểm tích lũy</div>
        <div class="font-heading font-extrabold text-lg text-indigo-700 mt-0.5">${serverPoints.toLocaleString('vi-VN')} điểm</div>
        <div class="text-[10px] text-[#64748B]">Khả dụng đổi quà / ưu đãi</div>
      </div>
      <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
        <div class="text-[11px] text-[#64748B]">Tổng chi tiêu</div>
        <div class="font-heading font-extrabold text-lg text-[#16A34A] mt-0.5">${escapeSearchHTML(fmt(d.totalSpent || 0))}</div>
        <div class="text-[10px] text-[#64748B]">Tích lũy thanh toán</div>
      </div>
    `;
  }

  // Danh sách đặt sân
  currentCrmBookings = Array.isArray(d.bookings) ? d.bookings : [];
  renderCrmBookings();

  // Danh sách lịch sử điểm tích lũy
  if (Array.isArray(d.points_log)) {
    currentCrmPointsLog = d.points_log;
    renderCrmPointsLog();
  } else {
    // Gọi fallback nếu chưa có trong customer_detail
    adminFetchJson(`../api/admin.php?action=customer_points_log&phone=${encodeURIComponent(phone)}&limit=20`)
      .then(res => {
        if (res.ok && Array.isArray(res.data)) {
          currentCrmPointsLog = res.data;
          renderCrmPointsLog();
        } else {
          renderCrmPointsLog();
        }
      })
      .catch(() => renderCrmPointsLog());
  }

  // Danh sách lịch sử chỉnh sửa hồ sơ (Audit Log)
  if (Array.isArray(d.audit_logs)) {
    currentCrmAuditLogs = d.audit_logs;
    renderCrmAuditLogs();
  } else {
    // Gọi fallback nếu chưa có trong customer_detail
    adminFetchJson(`../api/admin.php?action=customer_audit_logs&phone=${encodeURIComponent(phone)}&limit=20`)
      .then(res => {
        if (res.ok && Array.isArray(res.data)) {
          currentCrmAuditLogs = res.data;
          renderCrmAuditLogs();
        } else {
          renderCrmAuditLogs();
        }
      })
      .catch(() => renderCrmAuditLogs());
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

/* ==========================================================================
   LƯU BIỂU MẪU HỢP NHẤT HỒ SƠ HỘI VIÊN (ONE SAVE BUTTON)
   ========================================================================== */

async function saveCustomerCrm(e) {
  if (e && e.preventDefault) e.preventDefault();

  const userId = Number(document.getElementById('crm-form-user-id')?.value || 0);
  const updatedAt = (document.getElementById('crm-form-updated-at')?.value || '').trim();
  const phone = (document.getElementById('crm-form-phone')?.value || '').trim();
  const customerName = (document.getElementById('crm-form-name')?.value || '').trim();
  const email = (document.getElementById('crm-form-email')?.value || '').trim();
  const tier = document.getElementById('crm-form-tier')?.value || 'standard';
  const oldTier = document.getElementById('crm-form-old-tier')?.value || 'standard';
  const tierReason = (document.getElementById('crm-form-tier-reason')?.value || '').trim();
  const isBlacklisted = Boolean(document.getElementById('crm-form-blacklist')?.checked);
  const blacklistReason = (document.getElementById('crm-form-blacklist-reason')?.value || '').trim();
  const adminNote = (document.getElementById('crm-form-note')?.value || '').trim();

  const oldPoints = Number(document.getElementById('crm-form-old-points')?.value || 0);
  const newPointsVal = document.getElementById('crm-form-points')?.value;
  const newPoints = newPointsVal === '' ? oldPoints : Math.max(0, Number(newPointsVal));
  const pointsReason = (document.getElementById('crm-form-points-reason')?.value || '').trim();
  const diffPoints = newPoints - oldPoints;

  // Validate các trường bắt buộc
  if (!phone || !customerName) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Vui lòng nhập đầy đủ Số điện thoại và Họ tên hội viên!', 'warning');
    }
    return;
  }

  // Validate lý do khóa Blacklist bắt buộc
  if (isBlacklisted && !blacklistReason) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Vui lòng nhập lý do khóa đặt sân / đưa vào Danh sách đen!', 'warning');
    }
    document.getElementById('crm-form-blacklist-reason')?.focus();
    return;
  }

  // Validate lý do điều chỉnh phân hạng nếu có thay đổi
  if (tier !== oldTier && tier !== 'auto' && !tierReason) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Vui lòng nhập lý do điều chỉnh phân hạng hội viên!', 'warning');
    }
    document.getElementById('crm-form-tier-reason')?.focus();
    return;
  }

  // Validate lý do điều chỉnh điểm tích lũy
  if (diffPoints !== 0 && !pointsReason) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Vui lòng nhập lý do điều chỉnh điểm tích lũy!', 'warning');
    }
    document.getElementById('crm-form-points-reason')?.focus();
    return;
  }

  // Hộp thoại xác nhận thay đổi (Đặc biệt khi thay đổi điểm tích lũy)
  let confirmMessage = `Xác nhận lưu cập nhật hồ sơ hội viên ${customerName}?\n\n• SĐT: ${phone}`;
  if (email) confirmMessage += `\n• Email: ${email}`;
  if (tier !== oldTier) confirmMessage += `\n• Hạng mới: [${tier}] (Lý do: ${tierReason || 'Mặc định'})`;
  if (isBlacklisted) confirmMessage += `\n• Khóa Blacklist: BẬT (Lý do: ${blacklistReason})`;
  if (diffPoints !== 0) {
    confirmMessage += `\n• Điểm tích lũy: [${oldPoints.toLocaleString('vi-VN')} điểm] → [${newPoints.toLocaleString('vi-VN')} điểm] (${diffPoints > 0 ? '+' : ''}${diffPoints.toLocaleString('vi-VN')} điểm)\n  Lý do: [${pointsReason}]`;
  }

  let isConfirmed = false;
  if (typeof showAdminConfirm === 'function') {
    isConfirmed = await showAdminConfirm({
      title: 'Xác nhận cập nhật hồ sơ hội viên',
      message: confirmMessage,
      confirmText: 'Xác nhận lưu',
      cancelText: 'Quay lại',
      danger: isBlacklisted
    });
  } else {
    isConfirmed = window.confirm(confirmMessage);
  }

  if (!isConfirmed) return;

  const submitBtn = document.getElementById('btn-submit-crm');
  const origBtnHtml = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⏳ Đang lưu...</span>';
  }

  try {
    const payload = {
      user_id: userId || null,
      phone: phone,
      name: customerName,
      customer_name: customerName,
      full_name: customerName,
      email: email,
      customer_tier: tier,
      tier_reason: tierReason,
      is_blacklisted: isBlacklisted ? 1 : 0,
      blacklist_reason: blacklistReason,
      points: newPoints,
      points_delta: diffPoints,
      points_reason: pointsReason,
      admin_note: adminNote,
      updated_at: updatedAt
    };

    const res = await adminFetchJson('../api/admin.php?action=update_customer_crm', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errMsg = res.message || res.error || 'Có lỗi xảy ra khi lưu hồ sơ hội viên!';
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(errMsg, 'error', 5000);
      } else {
        alert(errMsg);
      }
      return;
    }

    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(res.message || `✓ Đã lưu thành công hồ sơ cho ${customerName}!`, 'success', 3500);
    }

    closeCustomerCrmModal();
    await renderAdminCustomers();
  } catch (err) {
    console.error('Lỗi khi lưu hồ sơ CRM:', err);
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
window.saveCustomerCrm = saveCustomerCrm;

/* ==========================================================================
   TƯƠNG THÍCH NGƯỢC CHO CÁC HÀM CŨ
   ========================================================================== */

function openEditMemberModal(phone) {
  openCustomerCrmModal(phone);
}
window.openEditMemberModal = openEditMemberModal;

function openEditMemberModalFromCrm() {
  const phone = document.getElementById('crm-form-phone')?.value;
  if (phone) openCustomerCrmModal(phone);
}
window.openEditMemberModalFromCrm = openEditMemberModalFromCrm;

function closeEditMemberModal() {
  closeCustomerCrmModal();
}
window.closeEditMemberModal = closeEditMemberModal;

function handleEditMemberPointsChange() {
  handleCrmPointsChange('absolute');
}
window.handleEditMemberPointsChange = handleEditMemberPointsChange;

function handleEditMemberSubmit(e) {
  saveCustomerCrm(e);
}
window.handleEditMemberSubmit = handleEditMemberSubmit;
