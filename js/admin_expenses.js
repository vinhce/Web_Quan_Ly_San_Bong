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
  currentAdminExpensesList = list;
  const listTotal = Number(r.data?.totalAmount ?? list.reduce((sum, ex) => sum + Number(ex.amount || 0), 0));
  const listTotalEl = document.getElementById('rpt-expense-list-total');
  if (listTotalEl) {
    listTotalEl.textContent = listTotal.toLocaleString('vi-VN') + 'đ';
  }
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
    const actionBtns = isManagerOrAdmin()
      ? `<div class="flex items-center justify-end gap-1">
           <button type="button" onclick="openAdminExpenseEditModal(${eid})" class="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-[11px] cursor-pointer">Sửa</button>
           <button type="button" onclick="deleteAdminExpense(${eid})" class="px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[11px] cursor-pointer">Xóa</button>
         </div>`
      : '<span class="text-[#94A3B8]">—</span>';
    return `<tr class="hover:bg-slate-50">
      <td class="py-3 px-4 font-mono font-bold text-[#0F172A]">${escapeSearchHTML(ex.expense_code || ('EXP-' + eid))}</td>
      <td class="py-3 px-4 font-mono text-[#334155]">${escapeSearchHTML(ex.expense_date || '')}</td>
      <td class="py-3 px-4"><span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">${escapeSearchHTML(ex.category_name || catLabels[ex.category] || ex.category || '')}</span></td>
      <td class="py-3 px-4 font-semibold text-[#0F172A]">${escapeSearchHTML(ex.payer_name || '—')}</td>
      <td class="py-3 px-4 text-[#475569] max-w-[220px]">${escapeSearchHTML(ex.receipt_note || '—')}</td>
      <td class="py-3 px-4 text-right font-extrabold text-rose-600">${Number(ex.amount || 0).toLocaleString('vi-VN')}đ</td>
      <td class="py-3 px-4 text-right">${actionBtns}</td>
    </tr>`;
  }).join('');
}
window.loadAdminExpenses = loadAdminExpenses;

async function deleteAdminExpense(id) {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền xóa khoản chi!', 'error');
    return;
  }
  const ok = typeof showAdminConfirm === 'function'
    ? await showAdminConfirm({
        title: 'Xóa khoản chi vận hành',
        message: `Bạn có chắc chắn muốn xóa khoản chi #${id} khỏi sổ chi vận hành?`,
        confirmText: 'Xóa khoản chi',
        cancelText: 'Hủy',
        danger: true
      })
    : confirm(`Bạn có chắc chắn muốn xóa khoản chi #${id} khỏi sổ chi vận hành?`);
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

function openAdminExpenseEditModal(id) {
  if (!isManagerOrAdmin()) return;
  const ex = currentAdminExpensesList.find(e => Number(e.id) === Number(id));
  if (!ex) return;

  const modal = document.getElementById('admin-expense-edit-modal');
  if (!modal) return;

  const idEl = document.getElementById('edit-exp-id');
  const dateEl = document.getElementById('edit-exp-date');
  const catEl = document.getElementById('edit-exp-category');
  const amtEl = document.getElementById('edit-exp-amount');
  const payerEl = document.getElementById('edit-exp-payer');
  const noteEl = document.getElementById('edit-exp-note');

  if (idEl) idEl.value = ex.id;
  if (dateEl) dateEl.value = ex.expense_date || '';
  if (catEl) catEl.value = ex.category || 'khac';
  if (amtEl) amtEl.value = ex.amount || '';
  if (payerEl) payerEl.value = ex.payer_name || '';
  if (noteEl) noteEl.value = ex.receipt_note || '';

  modal.classList.remove('hidden');
}
window.openAdminExpenseEditModal = openAdminExpenseEditModal;

function closeAdminExpenseEditModal() {
  const modal = document.getElementById('admin-expense-edit-modal');
  if (modal) modal.classList.add('hidden');
}
window.closeAdminExpenseEditModal = closeAdminExpenseEditModal;

async function handleSaveEditExpense(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!isManagerOrAdmin()) return;

  const id = parseInt(document.getElementById('edit-exp-id')?.value || '0', 10);
  const expenseDate = document.getElementById('edit-exp-date')?.value || '';
  const category = document.getElementById('edit-exp-category')?.value || 'khac';
  const amount = parseInt(document.getElementById('edit-exp-amount')?.value || '0', 10) || 0;
  const payerName = (document.getElementById('edit-exp-payer')?.value || '').trim();
  const receiptNote = (document.getElementById('edit-exp-note')?.value || '').trim();

  if (id <= 0 || amount < 1000) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Dữ liệu sửa không hợp lệ!', 'warning');
    return;
  }

  const btn = document.getElementById('edit-exp-submit-btn');
  const orig = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = 'Đang lưu...'; }

  try {
    const r = await adminFetchJson('../api/admin.php?action=update_expense', {
      method: 'POST',
      body: JSON.stringify({
        id,
        expense_date: expenseDate,
        category,
        amount,
        payer_name: payerName,
        receipt_note: receiptNote
      })
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể cập nhật khoản chi!', 'error');
      return;
    }
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || '✓ Đã cập nhật khoản chi!', 'success');
    closeAdminExpenseEditModal();
    await renderAdminReports();
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = orig; }
  }
}
window.handleSaveEditExpense = handleSaveEditExpense;

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
