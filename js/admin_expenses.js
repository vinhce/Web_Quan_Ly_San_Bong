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
    tbody.innerHTML = `<tr><td colspan="7" class="py-5 text-center text-red-500 font-semibold">${escapeSearchHTML(r.message || 'KhÃ´ng thá»ƒ táº£i danh sÃ¡ch chi phÃ­.')}</td></tr>`;
    return;
  }

  const list = Array.isArray(r.data?.expenses) ? r.data.expenses : [];
  currentAdminExpensesList = list;
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-[#94A3B8]">ChÆ°a cÃ³ khoáº£n chi nÃ o trong ká»³ lá»c.</td></tr>';
    return;
  }

  const catLabels = {
    dien_nuoc: 'Äiá»‡n, nÆ°á»›c sÃ¢n',
    bao_tri: 'Báº£o trÃ¬ & Sá»­a chá»¯a',
    nhap_hang: 'Nháº­p hÃ ng POS',
    luong_nhan_vien: 'LÆ°Æ¡ng & ThÆ°á»Ÿng',
    khac: 'Chi phÃ­ khÃ¡c'
  };

  tbody.innerHTML = list.map(ex => {
    const eid = Number(ex.id);
    const actionBtns = isManagerOrAdmin()
      ? `<div class="flex items-center justify-end gap-1">
           <button type="button" onclick="openAdminExpenseEditModal(${eid})" class="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-[11px] cursor-pointer">Sá»­a</button>
           <button type="button" onclick="deleteAdminExpense(${eid})" class="px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[11px] cursor-pointer">XÃ³a</button>
         </div>`
      : '<span class="text-[#94A3B8]">â€”</span>';
    return `<tr class="hover:bg-slate-50">
      <td class="py-3 px-4 font-mono font-bold text-[#0F172A]">${escapeSearchHTML(ex.expense_code || ('EXP-' + eid))}</td>
      <td class="py-3 px-4 font-mono text-[#334155]">${escapeSearchHTML(ex.expense_date || '')}</td>
      <td class="py-3 px-4"><span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">${escapeSearchHTML(ex.category_name || catLabels[ex.category] || ex.category || '')}</span></td>
      <td class="py-3 px-4 font-semibold text-[#0F172A]">${escapeSearchHTML(ex.payer_name || 'â€”')}</td>
      <td class="py-3 px-4 text-[#475569] max-w-[220px]">${escapeSearchHTML(ex.receipt_note || 'â€”')}</td>
      <td class="py-3 px-4 text-right font-extrabold text-rose-600">${Number(ex.amount || 0).toLocaleString('vi-VN')}Ä‘</td>
      <td class="py-3 px-4 text-right">${actionBtns}</td>
    </tr>`;
  }).join('');
}
window.loadAdminExpenses = loadAdminExpenses;

async function deleteAdminExpense(id) {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chá»‰ Quáº£n lÃ½ hoáº·c Chá»§ sÃ¢n má»›i cÃ³ quyá»n xÃ³a khoáº£n chi!', 'error');
    return;
  }
  const ok = await showAdminConfirm({
    title: 'XÃ³a khoáº£n chi váº­n hÃ nh',
    message: `Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a khoáº£n chi #${id} khá»i sá»• chi váº­n hÃ nh?`,
    confirmText: 'XÃ³a khoáº£n chi',
    cancelText: 'Há»§y',
    danger: true
  });
  if (!ok) return;

  const r = await adminFetchJson('../api/admin.php?action=delete_expense', {
    method: 'POST',
    body: JSON.stringify({ id: Number(id) })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'KhÃ´ng thá»ƒ xÃ³a khoáº£n chi!', 'error', 4000);
    return;
  }
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'âœ“ ÄÃ£ xÃ³a khoáº£n chi!', 'success', 3000);
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
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Dá»¯ liá»‡u sá»­a khÃ´ng há»£p lá»‡!', 'warning');
    return;
  }

  const btn = document.getElementById('edit-exp-submit-btn');
  const orig = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = 'Äang lÆ°u...'; }

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
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'KhÃ´ng thá»ƒ cáº­p nháº­t khoáº£n chi!', 'error');
      return;
    }
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'âœ“ ÄÃ£ cáº­p nháº­t khoáº£n chi!', 'success');
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
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Sá»‘ tiá»n chi pháº£i tá»‘i thiá»ƒu 1.000Ä‘!', 'warning');
    return;
  }

  const btn = document.getElementById('exp-submit-btn');
  const orig = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = 'â³ Äang ghi...';
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
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'KhÃ´ng thá»ƒ ghi khoáº£n chi!', 'error', 4000);
      return;
    }

    const amtEl = document.getElementById('exp-amount');
    const payerEl = document.getElementById('exp-payer');
    const noteEl = document.getElementById('exp-note');
    if (amtEl) amtEl.value = '';
    if (payerEl) payerEl.value = '';
    if (noteEl) noteEl.value = '';

    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'âœ“ ÄÃ£ ghi nháº­n khoáº£n chi váº­n hÃ nh!', 'success', 3500);
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
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chá»‰ Chá»§ sÃ¢n (Admin) má»›i cÃ³ quyá»n xÃ³a khoáº£n chi!', 'error');
    return;
  }
  const ok = await showAdminConfirm({
    title: 'XÃ³a khoáº£n chi váº­n hÃ nh',
    message: `Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a khoáº£n chi #${id} khá»i sá»• chi váº­n hÃ nh?`,
    confirmText: 'XÃ³a khoáº£n chi',
    cancelText: 'Há»§y',
    danger: true
  });
  if (!ok) return;

  const r = await adminFetchJson('../api/admin.php?action=delete_expense', {
    method: 'POST',
    body: JSON.stringify({ id: Number(id) })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'KhÃ´ng thá»ƒ xÃ³a khoáº£n chi!', 'error', 4000);
    return;
  }
  if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'âœ“ ÄÃ£ xÃ³a khoáº£n chi!', 'success', 3000);
  await renderAdminReports();
}
window.deleteAdminExpense = deleteAdminExpense;
