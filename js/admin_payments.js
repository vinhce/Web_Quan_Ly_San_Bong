async function renderAdminPayments() {
  if (!isManagerOrAdmin()) return;
  const tbody = document.getElementById('admin-payments-tbody');
  if (!tbody) return;

  const db = window.SanBongApp?.SanBongDB;
  let pendingList = [];

  try {
    const r = await adminFetchJson('../api/admin.php?action=pending_deposits');
    if (r.ok && Array.isArray(r.data)) {
      pendingList = r.data.map(item => ({
        code: item.code,
        time: item.created_at_fmt || item.created_at || item.time || '',
        name: item.name || item.customer_name || item.customerName || 'Khách vãng lai',
        amt: Number(item.deposit_amount || item.amt || 0),
        bank: item.gateway || item.bank || 'VietQR',
        bankTxStatus: item.bank_tx_status || 'Chưa thấy tiền',
        txAmt: Number(item.transfer_amount || 0),
        paidAmt: Number(item.paid_amount || 0)
      }));
    }
  } catch (err) {
    console.warn('Cannot load pending_deposits from API, fallback to local DB', err);
  }

  if (pendingList.length === 0 && db && typeof db.getPendingPayments === 'function') {
    pendingList = db.getPendingPayments().map(p => ({
      ...p,
      name: p.name || p.customer_name || p.customerName || 'Khách vãng lai',
      bankTxStatus: p.bankTxStatus || 'Chưa thấy tiền'
    }));
  }

  const count = pendingList.length;
  const badgeEl = document.getElementById('admin-payments-badge');
  const headerBadgeEl = document.getElementById('admin-payments-header-badge');
  if (badgeEl) {
    badgeEl.textContent = count;
    badgeEl.style.display = count > 0 ? 'inline-block' : 'none';
  }
  if (headerBadgeEl) {
    if (count === 0) {
      headerBadgeEl.className = 'px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold';
      headerBadgeEl.textContent = '✓ Đã duyệt hết';
    } else {
      headerBadgeEl.className = 'px-3 py-1 rounded-full bg-[#FEF3C7] text-[#D97706] text-xs font-bold';
      headerBadgeEl.textContent = count + ' Đang chờ';
    }
  }

  if (pendingList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-12 text-center text-[#64748B]">
          <div class="flex flex-col items-center justify-center gap-2">
            <span class="text-3xl">🎉</span>
            <span class="font-bold text-[#0F172A] text-sm">Không có biên lai nào chờ duyệt</span>
            <span class="text-xs text-[#94A3B8]">Tất cả giao dịch chuyển khoản VietQR đã được xử lý xong.</span>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = pendingList.map((item, idx) => {
    const safeCodeAttr = escapeSearchHTML(item.code || '');
    const txStatus = item.bankTxStatus || 'Chưa thấy tiền';
    let txBadgeHtml = '';
    let actionButtonsHtml = '';

    if (txStatus === 'Đã nhận đủ') {
      txBadgeHtml = `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">✓ Đã nhận đủ</span>`;
      actionButtonsHtml = `<button data-code="${safeCodeAttr}" onclick="approveDeposit(this.getAttribute('data-code'))" class="btn-sm btn-primary cursor-pointer font-bold">Duyệt cọc</button>`;
    } else if (txStatus === 'Nhận thiếu') {
      txBadgeHtml = `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">⚠️ Nhận thiếu (${window.SanBongApp.formatVND(item.txAmt || item.paidAmt)})</span>`;
      actionButtonsHtml = `<button data-code="${safeCodeAttr}" onclick="approveDepositWithNote(this.getAttribute('data-code'), 'Nhận thiếu')" class="btn-sm btn-primary cursor-pointer font-bold">Duyệt cọc</button>`;
    } else if (txStatus === 'Nhận thừa') {
      txBadgeHtml = `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">ℹ️ Nhận thừa (${window.SanBongApp.formatVND(item.txAmt || item.paidAmt)})</span>`;
      actionButtonsHtml = `<button data-code="${safeCodeAttr}" onclick="approveDepositWithNote(this.getAttribute('data-code'), 'Nhận thừa')" class="btn-sm btn-primary cursor-pointer font-bold">Duyệt cọc</button>`;
    } else {
      txBadgeHtml = `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">⏳ Chưa thấy tiền</span>`;
      actionButtonsHtml = `
        <button data-code="${safeCodeAttr}" onclick="approveDepositManual(this.getAttribute('data-code'))" class="btn-sm btn-secondary cursor-pointer font-bold">Duyệt thủ công</button>
        <button data-code="${safeCodeAttr}" onclick="rejectDeposit(this.getAttribute('data-code'))" class="btn-sm btn-danger-outline cursor-pointer font-bold">Hủy đơn (chưa nhận tiền)</button>
      `;
    }

    return `
    <tr id="pay-row-${idx}" class="hover:bg-slate-50 transition-colors">
      <td class="py-3 px-4 text-[#64748B] whitespace-nowrap">${escapeSearchHTML(item.time || '')}</td>
      <td class="py-3 px-4 font-mono font-bold text-[#0F172A]">${safeCodeAttr}</td>
      <td class="py-3 px-4 font-semibold">${escapeSearchHTML(item.name || item.customer_name || 'Khách vãng lai')}</td>
      <td class="py-3 px-4 font-extrabold text-[#16A34A]">${window.SanBongApp.formatVND(item.amt)}</td>
      <td class="py-3 px-4 whitespace-nowrap">${txBadgeHtml}</td>
      <td class="py-3 px-4">${escapeSearchHTML(item.bank || '')} (VietQR)</td>
      <td class="py-3 px-4 text-right space-x-2 whitespace-nowrap">
        ${actionButtonsHtml}
      </td>
    </tr>
  `;
  }).join('');
}
window.renderAdminPayments = renderAdminPayments;

async function approveDepositWithNote(code, txStatus) {
  const notePrompt = prompt(`Đơn ${code} đang ở trạng thái "${txStatus}".\nBắt buộc nhập ghi chú xử lý chênh lệch để duyệt cọc:`);
  if (!notePrompt || !notePrompt.trim()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Bắt buộc nhập ghi chú xử lý chênh lệch để tiếp tục!', 'warning');
    return;
  }
  await approveDeposit(code, notePrompt.trim());
}
window.approveDepositWithNote = approveDepositWithNote;

async function approveDepositManual(code) {
  const refPrompt = prompt(`Đơn ${code} chưa thấy giao dịch ngân hàng khớp tự động.\nNhập mã tham chiếu chuyển khoản hoặc ghi chú xác thực để duyệt thủ công:`);
  if (!refPrompt || !refPrompt.trim()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Bắt buộc nhập mã tham chiếu hoặc ghi chú để duyệt thủ công!', 'warning');
    return;
  }
  await approveDeposit(code, refPrompt.trim(), refPrompt.trim());
}
window.approveDepositManual = approveDepositManual;

async function approveDeposit(code, note = '', referenceCode = '') {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền duyệt cọc VietQR!', 'error');
    return;
  }
  const btn = document.querySelector(`button[data-code="${code}"]`);
  if (btn) btn.disabled = true;

  try {
    const payload = { code: code, status: 'Đã cọc 30%' };
    if (note) payload.note = note;
    if (referenceCode) payload.reference_code = referenceCode;

    const r = await adminFetchJson('../api/admin.php?action=update_payment', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể duyệt cọc VietQR!', 'error', 4000);
      return;
    }

    const db = window.SanBongApp?.SanBongDB;
    if (db && typeof db.approveDeposit === 'function') db.approveDeposit(code);
    await renderAdminPayments();
    if (typeof loadBankTransactions === 'function') await loadBankTransactions();
    if (typeof renderOverviewTodayBookings === 'function') renderOverviewTodayBookings();
    if (typeof renderOverviewKPIs === 'function') renderOverviewKPIs();
    if (typeof renderTimelineGantt === 'function') renderTimelineGantt();
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('✓ ĐÃ DUYỆT CỌC THÀNH CÔNG: Đơn ' + code + ' đã kích hoạt mã vé check-in!', 'success', 3500);
  } finally {
    if (btn) btn.disabled = false;
  }
}
window.approveDeposit = approveDeposit;

async function rejectDeposit(code) {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền từ chối duyệt cọc!', 'error');
    return;
  }

  const db = window.SanBongApp?.SanBongDB;
  const booking = db ? db.getBookingByCode(code) : null;
  const custName = booking ? booking.customerName : code;

  const confirmMsg =
    '• Đội bóng: ' + custName + ' (' + code + ')\n' +
    '• Lý do: Đơn chưa nhận được tiền giao dịch chuyển khoản VietQR.\n\n' +
    'HỆ THỐNG SẼ THỰC HIỆN:\n' +
    '1. Hủy đơn đặt sân chưa thanh toán này.\n' +
    '2. GIẢI PHÓNG & NHẢ SÂN TRỐNG NGAY LẬP TỨC để đón khách khác.\n\n' +
    'Bạn có chắc chắn muốn hủy đơn này?';

  const doReject = async () => {
    const r = await adminFetchJson('../api/admin.php?action=update_payment', {
      method: 'POST',
      body: JSON.stringify({ code: code, status: 'Đã hủy' })
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể hủy đơn!', 'error', 4000);
      return;
    }

    if (db && typeof db.rejectDeposit === 'function') db.rejectDeposit(code);
    await renderAdminPayments();
    if (typeof loadBankTransactions === 'function') await loadBankTransactions();
    if (typeof renderOverviewTodayBookings === 'function') renderOverviewTodayBookings();
    if (typeof renderOverviewKPIs === 'function') renderOverviewKPIs();
    if (typeof renderTimelineGantt === 'function') renderTimelineGantt();
    if (typeof initQuickBookingForm === 'function') initQuickBookingForm();
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('⚡ ĐÃ HỦY ĐƠN: Đơn ' + code + ' đã bị hủy và giải phóng sân.', 'warning', 3500);
    }
  };

  if (window.SanBongApp?.showModal) {
    window.SanBongApp.showModal({
      title: '⚠️ Xác nhận hủy đơn chưa nhận tiền',
      message: confirmMsg,
      type: 'danger',
      confirmText: 'Hủy đơn & Giải phóng sân',
      cancelText: 'Giữ lại chờ',
      onConfirm: doReject
    });
  } else {
    const confirmed = await showAdminConfirm({
      title: '⚠️ Xác nhận hủy đơn chưa nhận tiền',
      message: confirmMsg,
      confirmText: 'Hủy đơn & Giải phóng sân',
      cancelText: 'Giữ lại chờ',
      danger: true
    });
    if (confirmed) await doReject();
  }
}
window.rejectDeposit = rejectDeposit;

function populateReconcileBookingDatalist(candidates) {
  const datalist = document.getElementById('rec-booking-datalist');
  if (!datalist) return;
  const list = Array.isArray(candidates) ? candidates : [];
  datalist.innerHTML = list.map(c => {
    const code = escapeSearchHTML(c.code || '');
    const name = escapeSearchHTML(c.customer_name || c.name || '');
    const pitch = escapeSearchHTML(c.pitch_name || '');
    const slot = escapeSearchHTML(c.slot_time || '');
    const expAmt = Number(c.expected_amount || c.deposit_amount || c.total_price || 0);
    const expStr = expAmt > 0 ? ` - ${window.SanBongApp?.formatVND ? window.SanBongApp.formatVND(expAmt) : expAmt + 'đ'}` : '';
    return `<option value="${code}">${name} (${pitch} ${slot})${expStr}</option>`;
  }).join('');
}

function updateBankFilterButtons(activeFilter) {
  const filters = ['pending', 'resolved', 'all'];
  filters.forEach(f => {
    const btn = document.getElementById(`bank-filter-${f}`);
    if (!btn) return;
    if (f === activeFilter) {
      btn.className = 'px-3 py-1.5 rounded-lg font-bold bg-[#16A34A] text-white cursor-pointer';
    } else {
      btn.className = 'px-3 py-1.5 rounded-lg font-semibold bg-slate-100 text-[#475569] hover:bg-slate-200 cursor-pointer';
    }
  });
}

async function loadBankTransactions(filter) {
  if (!isManagerOrAdmin()) return;
  const activeFilter = filter || window.currentBankTxFilter || 'pending';
  window.currentBankTxFilter = activeFilter;
  updateBankFilterButtons(activeFilter);

  const tbody = document.getElementById('admin-bank-tx-tbody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-[#64748B]">Đang tải dữ liệu giao dịch từ ngân hàng...</td></tr>';
  }

  const r = await adminFetchJson(`../api/admin.php?action=bank_transactions&filter=${encodeURIComponent(activeFilter)}`);
  if (!r.ok || !r.data) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'Không thể tải danh sách giao dịch ngân hàng.')}</td></tr>`;
    }
    return;
  }

  const list = Array.isArray(r.data.transactions) ? r.data.transactions : [];
  window.cachedBankTransactions = list;
  window.cachedCandidateBookings = Array.isArray(r.data.candidate_bookings) ? r.data.candidate_bookings : [];
  populateReconcileBookingDatalist(window.cachedCandidateBookings);

  renderBankTransactions(list, Number(r.data.pending_count || 0));
}
window.loadBankTransactions = loadBankTransactions;

function renderBankTransactions(list, pendingCount = 0) {
  const tbody = document.getElementById('admin-bank-tx-tbody');
  const badge = document.getElementById('bank-pending-count-badge');
  if (badge) {
    const count = Number(pendingCount || 0);
    badge.textContent = count > 0 ? `${count} Cần xử lý` : '✓ Đã khớp hết';
    badge.className = count > 0
      ? 'px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[11px] font-bold'
      : 'px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold';
  }

  if (!tbody) return;

  if (!Array.isArray(list) || list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-10 text-center text-[#64748B]">
          <div class="flex flex-col items-center justify-center gap-2">
            <span class="text-2xl">✅</span>
            <span class="font-bold text-[#0F172A] text-xs">Không có giao dịch ngân hàng nào cần xử lý ở bộ lọc này</span>
            <span class="text-[11px] text-[#94A3B8]">Webhook SePay tự động ghi nhận và đối soát mọi chuyển khoản phát sinh.</span>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map(tx => {
    const txId = escapeSearchHTML(String(tx.id || ''));
    const bankRef = escapeSearchHTML(tx.reference_code || tx.reference_number || tx.code || '---');
    const timeStr = escapeSearchHTML(tx.transaction_time || tx.created_at || '---');
    const bankName = escapeSearchHTML(tx.bank_name || tx.gateway || 'VietQR');
    const content = escapeSearchHTML(tx.content || tx.transaction_content || tx.description || '---');
    const rawMatchedCode = String(tx.matched_booking_code || tx.detected_booking_code || tx.booking_code || tx.detected_code || '').trim();
    const detectedCode = escapeSearchHTML(rawMatchedCode);
    const reasonNote = String(tx.resolved_note || tx.mismatch_reason || tx.note || '').trim();

    const amountIn = Number(tx.transfer_amount ?? tx.amount_in ?? tx.amountIn ?? tx.transferAmount ?? tx.amount ?? 0);
    const expectedAmt = Number(tx.expected_amount ?? tx.expectedAmount ?? 0);
    const diffAmt = (tx.diff_amount !== undefined && tx.diff_amount !== null && tx.diff_amount !== '')
      ? Number(tx.diff_amount)
      : (expectedAmt > 0 ? (amountIn - expectedAmt) : 0);

    const rawStatus = String(tx.status || '').toLowerCase();
    const matchSt = String(tx.match_status || tx.reconcile_status || rawStatus || 'unmatched').toLowerCase();
    const isResolved = (
      matchSt === 'matched' ||
      matchSt === 'resolved' ||
      matchSt === 'ignored' ||
      rawStatus === 'matched' ||
      rawStatus === 'resolved' ||
      rawStatus === 'ignored'
    );

    let statusBadge = '';
    if (matchSt === 'matched' || rawStatus === 'matched') {
      statusBadge = '<span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold whitespace-nowrap">✓ Đã khớp</span>';
    } else if (matchSt === 'resolved' || rawStatus === 'resolved') {
      statusBadge = '<span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold whitespace-nowrap">✓ Đã xử lý</span>';
    } else if (matchSt === 'ignored' || rawStatus === 'ignored') {
      statusBadge = '<span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-bold whitespace-nowrap">⊘ Đã bỏ qua</span>';
    } else if (matchSt === 'underpaid' || (expectedAmt > 0 && diffAmt < 0)) {
      statusBadge = '<span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold whitespace-nowrap">⚠️ Thiếu tiền</span>';
    } else if (matchSt === 'overpaid' || (expectedAmt > 0 && diffAmt > 0)) {
      statusBadge = '<span class="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 text-[11px] font-bold whitespace-nowrap">ℹ️ Thừa tiền</span>';
    } else {
      statusBadge = '<span class="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 text-[11px] font-bold whitespace-nowrap">❌ Chưa khớp đơn</span>';
    }

    let diffText = '';
    if (expectedAmt > 0) {
      if (diffAmt === 0) {
        diffText = '<span class="text-emerald-600 text-[11px] block font-semibold">Khớp 100%</span>';
      } else if (diffAmt < 0) {
        diffText = `<span class="text-rose-600 text-[11px] block font-bold">Thiếu: ${window.SanBongApp.formatVND(Math.abs(diffAmt))}</span>`;
      } else {
        diffText = `<span class="text-blue-600 text-[11px] block font-bold">Thừa: +${window.SanBongApp.formatVND(diffAmt)}</span>`;
      }
    } else {
      diffText = '<span class="text-slate-400 text-[11px] block">Chưa liên kết đơn</span>';
    }

    let actions = '';
    if (!isResolved) {
      actions = `
        <div class="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
          <button type="button" onclick="openReconcileAssignModal('${txId}')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#16A34A] hover:bg-[#15803D] text-white shadow-2xs cursor-pointer">Khớp đơn</button>
          <button type="button" onclick="resolveBankTransaction('${txId}', 'resolved')" class="px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-[#0F172A] border border-slate-300 cursor-pointer" title="Đánh dấu đã xử lý ngoại lệ ngoài hệ thống">Đã xử lý</button>
          <button type="button" onclick="resolveBankTransaction('${txId}', 'ignored')" class="px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer" title="Giao dịch chuyển nhầm / không thuộc sân bóng">Bỏ qua</button>
        </div>
      `;
    } else {
      actions = `
        <div class="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
          <span class="text-[11px] text-slate-400">Hoàn tất</span>
          <button type="button" onclick="openReconcileAssignModal('${txId}')" class="text-[11px] text-indigo-600 hover:underline cursor-pointer">Sửa gán</button>
        </div>
      `;
    }

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="py-3 px-4 whitespace-nowrap">
          <div class="font-semibold text-[#0F172A]">${timeStr}</div>
          <div class="text-[11px] text-slate-500 font-mono">Ref: ${bankRef}</div>
          <div class="text-[10px] text-slate-400">${bankName}</div>
        </td>
        <td class="py-3 px-4 max-w-xs">
          <div class="font-mono text-xs text-[#0F172A] break-words">${content}</div>
          ${detectedCode ? `<div class="mt-1"><span class="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-bold font-mono">Mã nhận diện: ${detectedCode}</span></div>` : ''}
          ${reasonNote ? `<div class="mt-1 text-[11px] text-slate-500 italic">Ghi chú: ${escapeSearchHTML(reasonNote)}</div>` : ''}
        </td>
        <td class="py-3 px-4 text-right whitespace-nowrap">
          <div class="font-extrabold text-[#16A34A] text-xs">+${window.SanBongApp.formatVND(amountIn)}</div>
          ${expectedAmt > 0 ? `<div class="text-[11px] text-slate-500">Kỳ vọng: ${window.SanBongApp.formatVND(expectedAmt)}</div>` : ''}
          ${diffText}
        </td>
        <td class="py-3 px-4 text-center whitespace-nowrap">
          ${statusBadge}
        </td>
        <td class="py-3 px-4 text-right">
          ${actions}
        </td>
      </tr>
    `;
  }).join('');
}

function openReconcileAssignModal(txId) {
  if (!isManagerOrAdmin()) return;
  const modal = document.getElementById('reconcile-assign-modal');
  if (!modal) return;

  const txList = window.cachedBankTransactions || [];
  const tx = txList.find(t => String(t.id) === String(txId));
  const idInput = document.getElementById('rec-tx-id');
  const infoBox = document.getElementById('rec-tx-info');
  const codeInput = document.getElementById('rec-booking-code');
  const statusSelect = document.getElementById('rec-target-status');
  const noteInput = document.getElementById('rec-assign-note');

  if (idInput) idInput.value = txId;

  let prefillCode = '';
  if (tx) {
    prefillCode = String(tx.matched_booking_code || tx.detected_booking_code || tx.booking_code || tx.detected_code || '').trim();
    const amountIn = Number(tx.transfer_amount ?? tx.amount_in ?? tx.transferAmount ?? tx.amount ?? 0);
    if (infoBox) {
      infoBox.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="font-bold text-[#0F172A]">Giao dịch #${escapeSearchHTML(String(tx.id))}</span>
          <span class="font-extrabold text-[#16A34A]">+${window.SanBongApp.formatVND(amountIn)}</span>
        </div>
        <div class="text-[11px] text-slate-500">Ref: <b>${escapeSearchHTML(tx.reference_code || tx.code || '---')}</b> · ${escapeSearchHTML(tx.transaction_time || tx.created_at || '')}</div>
        <div class="text-[11px] font-mono bg-white p-1.5 rounded border border-slate-200 break-words mt-1">${escapeSearchHTML(tx.content || tx.description || '---')}</div>
      `;
    }
  } else if (infoBox) {
    infoBox.innerHTML = `<span class="text-slate-500 font-mono">ID Giao dịch: #${escapeSearchHTML(String(txId))}</span>`;
  }

  populateReconcileBookingDatalist(window.cachedCandidateBookings);

  if (codeInput) codeInput.value = prefillCode;
  if (statusSelect) statusSelect.value = 'auto';
  if (noteInput) noteInput.value = '';

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  if (codeInput) setTimeout(() => codeInput.focus(), 100);
}
window.openReconcileAssignModal = openReconcileAssignModal;

function closeReconcileAssignModal() {
  const modal = document.getElementById('reconcile-assign-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}
window.closeReconcileAssignModal = closeReconcileAssignModal;

async function submitReconcileAssign(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!isManagerOrAdmin()) return;

  const txId = (document.getElementById('rec-tx-id')?.value || '').trim();
  const bookingCode = (document.getElementById('rec-booking-code')?.value || '').trim().toUpperCase();
  const targetStatus = document.getElementById('rec-target-status')?.value || 'auto';
  const note = (document.getElementById('rec-assign-note')?.value || '').trim();

  if (!txId || !bookingCode) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập mã đơn đặt sân cần gán!', 'warning');
    return;
  }

  const r = await adminFetchJson('../api/admin.php?action=bank_transactions', {
    method: 'POST',
    body: JSON.stringify({
      sub_action: 'assign_booking',
      tx_id: txId,
      id: txId,
      booking_code: bookingCode,
      target_payment_status: targetStatus,
      target_status: targetStatus,
      note: note
    })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Lỗi khi gán giao dịch vào đơn!', 'error', 4000);
    return;
  }
  const serverMsg = r.message || '';

  const db = window.SanBongApp?.SanBongDB;
  if (db && typeof db.resolveBankTransaction === 'function') {
    db.resolveBankTransaction(txId, {
      booking_code: bookingCode,
      target_status: targetStatus,
      note: note,
      status: 'resolved'
    });
  }

  closeReconcileAssignModal();
  await loadBankTransactions();
  renderAdminPayments();
  if (typeof renderOverviewTodayBookings === 'function') renderOverviewTodayBookings();
  if (typeof renderOverviewKPIs === 'function') renderOverviewKPIs();
  if (typeof renderTimelineGantt === 'function') renderTimelineGantt();
  if (isOwnerAdmin() && typeof loadAuditLogs === 'function') loadAuditLogs();

  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(serverMsg || `🔗 Đã gán giao dịch vào đơn #${bookingCode} và cập nhật trạng thái thanh toán!`, 'success', 3500);
  }
}
window.submitReconcileAssign = submitReconcileAssign;

async function resolveBankTransaction(txId, status = 'resolved') {
  if (!isManagerOrAdmin() || !txId) return;

  const targetResStatus = status === 'ignored' ? 'ignored' : 'resolved';
  const defaultNote = targetResStatus === 'ignored'
    ? 'Giao dịch không thuộc đơn đặt sân'
    : 'Đã kiểm tra & hoàn tất xử lý đối soát';
  const promptMsg = targetResStatus === 'ignored'
    ? 'Nhập ghi chú lý do bỏ qua giao dịch này (Bắt buộc):'
    : 'Nhập ghi chú xác nhận đã xử lý giao dịch này (Bắt buộc):';

  const rawNote = await showAdminPrompt({
    title: targetResStatus === 'ignored' ? 'Bỏ qua giao dịch ngân hàng' : 'Xác nhận đã xử lý giao dịch',
    message: promptMsg,
    defaultValue: defaultNote,
    placeholder: 'Nhập ghi chú xử lý...',
    confirmText: targetResStatus === 'ignored' ? 'Bỏ qua giao dịch' : 'Xác nhận đã xử lý',
    cancelText: 'Hủy',
    danger: targetResStatus === 'ignored'
  });
  if (rawNote === null) return;
  const note = String(rawNote).trim();
  if (!note) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Vui lòng nhập ghi chú xử lý không để trống!', 'warning', 3000);
    }
    return;
  }

  const r = await adminFetchJson('../api/admin.php?action=bank_transactions', {
    method: 'POST',
    body: JSON.stringify({
      sub_action: 'resolve',
      tx_id: txId,
      id: txId,
      resolution_status: targetResStatus,
      status: targetResStatus,
      note: note
    })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể cập nhật trạng thái giao dịch!', 'error', 4000);
    return;
  }
  const serverMsg = r.message || '';

  const db = window.SanBongApp?.SanBongDB;
  if (db && typeof db.resolveBankTransaction === 'function') {
    db.resolveBankTransaction(txId, { status: targetResStatus, note: note });
  }

  await loadBankTransactions();
  if (isOwnerAdmin() && typeof loadAuditLogs === 'function') loadAuditLogs();
  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(
      serverMsg || (targetResStatus === 'ignored'
        ? '⊘ Đã đánh dấu Bỏ qua giao dịch ngân hàng!'
        : '✓ Đã đánh dấu giao dịch ngân hàng là Đã xử lý!'),
      'success',
      3000
    );
  }
}
window.resolveBankTransaction = resolveBankTransaction;
