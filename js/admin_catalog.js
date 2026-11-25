// =========================================================
// MỤC 3.1: KHO NƯỚC & BÁN LẺ DỊCH VỤ TẠI QUẦY (POS INVENTORY)
// =========================================================
function updatePosSalePreview() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;
  const selEl = document.getElementById('pos-service-select');
  const qtyEl = document.getElementById('pos-service-qty');
  const totalEl = document.getElementById('pos-preview-total');
  const stockEl = document.getElementById('pos-preview-stock');
  if (!selEl) return;

  const srvId = selEl.value;
  const srv = db.getServices().find(s => s.id === srvId);
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  if (srv) {
    const stock = Number(srv.stockQty ?? 50);
    if (qtyEl) {
      qtyEl.max = stock > 0 ? stock : 1;
      if (parseInt(qtyEl.value, 10) > stock && stock > 0) {
        qtyEl.value = stock;
      }
    }
    const qty = Math.max(1, parseInt(qtyEl?.value || '1', 10) || 1);
    const lineTotal = Number(srv.price || 0) * qty;
    if (totalEl) totalEl.textContent = fmt(lineTotal);
    const linePreviewEl = document.getElementById('pos-sale-line-preview');
    if (linePreviewEl) {
      linePreviewEl.textContent = `Thành tiền: ${fmt(lineTotal)} · Còn tồn: ${stock} ${srv.unit || ''}`;
    }
    if (stockEl) {
      stockEl.textContent = `${stock} ${srv.unit || ''}`;
      stockEl.className = stock <= Number(srv.minStockWarning ?? 10)
        ? 'font-bold text-red-600'
        : 'font-bold text-slate-700';
    }
  }
}
window.updatePosSalePreview = updatePosSalePreview;

function stepPosQty(delta) {
  const el = document.getElementById('pos-service-qty');
  if (!el) return;
  const cur = parseInt(el.value, 10) || 1;
  const max = parseInt(el.max, 10) || 200;
  const nxt = Math.max(1, Math.min(max, cur + delta));
  el.value = nxt;
  updatePosSalePreview();
}
window.stepPosQty = stepPosQty;

function renderAdminInventory() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const services = db.getServices();
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');

  const openSrvBtn = document.getElementById('btn-open-service-modal');
  if (openSrvBtn) {
    const canManage = isManagerOrAdmin();
    openSrvBtn.classList.toggle('hidden', !canManage);
    openSrvBtn.style.display = canManage ? '' : 'none';
  }

  // 1. Cập nhật banner cảnh báo sắp hết hàng
  const lowItems = services.filter(s => Number(s.stockQty ?? 50) <= Number(s.minStockWarning ?? 10));
  const lowBanner = document.getElementById('inventory-low-stock-banner');
  const lowText = document.getElementById('inventory-low-stock-text');
  if (lowBanner) {
    if (lowItems.length > 0) {
      const names = lowItems.map(i => `${i.name} (còn ${Number(i.stockQty ?? 0)} ${i.unit || ''})`).join(', ');
      if (lowText) {
        lowText.textContent = `CẢNH BÁO TỒN KHO THẤP: Có ${lowItems.length} mặt hàng chạm ngưỡng sắp hết (${names})! Vui lòng nhập thêm kho.`;
      }
      lowBanner.classList.remove('hidden');
      lowBanner.classList.add('flex');
    } else {
      lowBanner.classList.add('hidden');
      lowBanner.classList.remove('flex');
    }
  }

  // 2. Cập nhật dropdown POS
  const posSelect = document.getElementById('pos-service-select');
  if (posSelect) {
    const prevVal = posSelect.value;
    posSelect.innerHTML = services.map(s => {
      const st = Number(s.stockQty ?? 50);
      return `<option value="${escapeSearchHTML(s.id)}" ${st <= 0 ? 'disabled' : ''}>${escapeSearchHTML(s.name)} — ${escapeSearchHTML(fmt(s.price))}/${escapeSearchHTML(s.unit || 'cái')} (Tồn: ${st})</option>`;
    }).join('');
    if (prevVal && services.some(s => s.id === prevVal)) {
      posSelect.value = prevVal;
    }
    if (!posSelect._boundPreview) {
      posSelect._boundPreview = true;
      posSelect.addEventListener('change', updatePosSalePreview);
      const qtyEl = document.getElementById('pos-service-qty');
      if (qtyEl) qtyEl.addEventListener('input', updatePosSalePreview);
    }
    updatePosSalePreview();
  }

  const pitchDatalist = document.getElementById('pos-pitch-code-options');
  if (pitchDatalist && typeof db.getPitches === 'function') {
    const pitchList = db.getPitches().filter(p => p && p.status !== 'Ẩn');
    pitchDatalist.innerHTML = pitchList.map(p =>
      `<option value="${escapeSearchHTML(p.id)}">${escapeSearchHTML(p.name || p.id)}</option>`
    ).join('');
  }

  // 3. Render bảng tồn kho
  const tbody = document.getElementById('admin-inventory-tbody');
  if (!tbody) return;

  tbody.innerHTML = services.map(s => {
    const stock = Number(s.stockQty ?? 50);
    const minW = Number(s.minStockWarning ?? 10);
    const safeSrvIdAttr = escapeJsAttr(s.id);

    let stockBadge = '';
    if (stock <= 0) {
      stockBadge = `<span class="inline-block ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-200 text-slate-700 border border-slate-300 whitespace-nowrap">Hết hàng</span>`;
    } else if (stock <= minW) {
      stockBadge = `<span class="inline-block ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700 border border-red-300 whitespace-nowrap">Sắp hết</span>`;
    } else {
      stockBadge = `<span class="inline-block ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">Đủ hàng</span>`;
    }

    return `
      <tr class="hover:bg-slate-50 transition-colors ${stock <= minW ? 'bg-red-50/30' : ''}">
        <td class="py-2 px-2.5 font-bold text-[#0F172A] leading-snug">
          <div>${escapeSearchHTML(s.name)}</div>
          <div class="text-[10px] font-mono font-normal text-slate-400">${escapeSearchHTML(s.id)}</div>
        </td>
        <td class="py-2 px-2 font-extrabold text-[#16A34A] whitespace-nowrap">
          ${escapeSearchHTML(fmt(s.price))} <span class="text-[11px] font-normal text-slate-500">/ ${escapeSearchHTML(s.unit || 'đơn vị')}</span>
        </td>
        <td class="py-2 px-2 text-center whitespace-nowrap">
          <span class="font-mono font-extrabold text-sm ${stock <= 0 ? 'text-slate-500' : (stock <= minW ? 'text-red-600' : 'text-[#0F172A]')}">${stock}</span>
          <span class="text-[11px] text-slate-500">${escapeSearchHTML(s.unit || '')}</span>
          ${stockBadge}
        </td>
        <td class="py-2 px-2 text-center font-mono text-xs text-slate-500 whitespace-nowrap">
          ≤ ${minW}
        </td>
        <td class="py-2 px-2.5 text-right whitespace-nowrap">
          ${isManagerOrAdmin() ? `
            <div class="inline-flex flex-nowrap items-center justify-end gap-1 whitespace-nowrap">
              <button type="button" onclick="promptRestockService('${safeSrvIdAttr}')" class="inline-flex items-center justify-center h-7 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs cursor-pointer whitespace-nowrap shrink-0">
                + Nhập kho
              </button>
              <button type="button" onclick="openServiceModal('${safeSrvIdAttr}')" class="inline-flex items-center justify-center h-7 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#0F172A] border border-slate-300 font-bold text-[11px] cursor-pointer whitespace-nowrap shrink-0">
                Sửa
              </button>
              <button type="button" onclick="handleDeleteService('${safeSrvIdAttr}')" class="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-[11px] cursor-pointer shrink-0" title="Ngừng kinh doanh / Xóa dịch vụ">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          ` : `
            <span class="text-[11px] text-slate-400 italic">Chỉ xem</span>
          `}
        </td>
      </tr>
    `;
  }).join('');
}
window.renderAdminInventory = renderAdminInventory;

let isPosSaleSubmitting = false;

async function handleCounterServiceSale(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (isPosSaleSubmitting) return;

  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const srvId = document.getElementById('pos-service-select')?.value || '';
  const qty = Math.max(1, parseInt(document.getElementById('pos-service-qty')?.value || '1', 10) || 1);
  const payMethod = document.getElementById('pos-pay-method')?.value || 'Tiền mặt tại quầy';
  const note = (document.getElementById('pos-sale-note')?.value || '').trim();

  const srv = db.getServices().find(s => s.id === srvId);
  if (!srv) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng chọn dịch vụ cần bán!', 'warning');
    return;
  }

  if (Number(srv.stockQty ?? 50) < qty) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(`⚠️ Tồn kho ${srv.name} chỉ còn ${srv.stockQty} ${srv.unit}, không đủ xuất ${qty}! Hãy nhập thêm kho.`, 'error', 4000);
    }
    return;
  }

  const form = e?.target && e.target.tagName === 'FORM' ? e.target : document.getElementById('pos-service-select')?.closest('form');
  const submitBtn = e?.submitter || document.getElementById('pos-sale-submit-btn') || form?.querySelector('button[type="submit"]');
  const origBtnHtml = submitBtn ? submitBtn.innerHTML : '';

  isPosSaleSubmitting = true;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Đang xuất kho...';
  }

  try {
    const r = await adminFetchJson('../api/admin.php?action=inventory', {
      method: 'POST',
      body: JSON.stringify({
        sub_action: 'sell_counter',
        service_id: srvId,
        service_name: srv.name,
        quantity: qty,
        unit_price: srv.price,
        payment_method: payMethod,
        note: note
      })
    });
    if (!r.ok) {
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(r.message || 'Không thể bán dịch vụ (kiểm tra lại tồn kho)!', 'error', 4000);
      }
      return;
    }

    const sale = db.recordCounterSale({
      serviceId: srvId,
      quantity: qty,
      payMethod: payMethod,
      note: note
    });

    if (sale) {
      const noteEl = document.getElementById('pos-sale-note');
      const qtyEl = document.getElementById('pos-service-qty');
      if (noteEl) noteEl.value = '';
      if (qtyEl) qtyEl.value = '1';
      renderAdminInventory();
      loadShiftHandovers();
      renderOverviewKPIs();
      if (isManagerOrAdmin()) renderAdminReports();

      const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'đ');
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(r.message || `💰 Đã bán ${qty}x ${sale.serviceName} (${fmt(sale.totalAmount)} - ${payMethod}) & trừ tồn kho!`, 'success', 3500);
      }
    }
  } finally {
    isPosSaleSubmitting = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origBtnHtml;
    }
  }
}
window.handleCounterServiceSale = handleCounterServiceSale;

async function promptRestockService(serviceId) {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền nhập kho hàng!', 'error');
    return;
  }
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;
  const srv = db.getServices().find(s => s.id === serviceId);
  if (!srv) return;

  const rawQty = await showAdminPrompt({
    title: `📦 Nhập thêm kho: ${srv.name}`,
    message: `• Tồn kho hiện tại: ${Number(srv.stockQty ?? 0)} ${srv.unit || ''}\n• Nhập số lượng thêm vào kho (ví dụ: 24 hoặc 48):`,
    placeholder: 'VD: 24',
    defaultValue: '24',
    inputType: 'number',
    confirmText: 'Nhập kho',
    cancelText: 'Hủy'
  });
  if (rawQty === null) return;
  const added = parseInt(String(rawQty).replace(/[^\d]/g, ''), 10);
  if (!added || added <= 0) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Số lượng nhập kho phải lớn hơn 0!', 'warning');
    return;
  }

  const r = await adminFetchJson('../api/admin.php?action=inventory', {
    method: 'POST',
    body: JSON.stringify({ sub_action: 'restock', id: serviceId, add_qty: added, added_qty: added })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể nhập thêm kho hàng!', 'error', 4000);
    return;
  }

  const updated = db.restockService(serviceId, added);
  renderAdminInventory();
  if (isOwnerAdmin() && typeof loadAdminLogs === 'function') loadAdminLogs(1);

  if (updated && window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(`📦 Đã nhập thêm +${added} ${updated.unit} cho "${updated.name}". Tồn kho mới: ${updated.stockQty} ${updated.unit}!`, 'success', 3500);
  }
}
window.promptRestockService = promptRestockService;

function openServiceModal(serviceId = '') {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền thêm/sửa dịch vụ!', 'error');
    return;
  }
  const modal = document.getElementById('service-crud-modal');
  if (!modal) return;

  const db = window.SanBongApp?.SanBongDB;
  const srv = (serviceId && db) ? db.getServices().find(s => s.id === serviceId) : null;

  const titleEl = document.getElementById('service-modal-title');
  const idEl = document.getElementById('srv-form-id');
  const nameEl = document.getElementById('srv-form-name');
  const priceEl = document.getElementById('srv-form-price');
  const unitEl = document.getElementById('srv-form-unit');
  const stockEl = document.getElementById('srv-form-stock');
  const minEl = document.getElementById('srv-form-min-stock');

  if (srv) {
    if (titleEl) titleEl.textContent = `✏️ Chỉnh sửa dịch vụ: ${srv.name}`;
    if (idEl) idEl.value = srv.id;
    if (nameEl) nameEl.value = srv.name || '';
    if (priceEl) priceEl.value = Number(srv.price || 10000);
    if (unitEl) unitEl.value = srv.unit || 'chai';
    if (stockEl) stockEl.value = Number(srv.stockQty ?? 50);
    if (minEl) minEl.value = Number(srv.minStockWarning ?? 10);
  } else {
    if (titleEl) titleEl.textContent = '➕ Thêm mặt hàng / Dịch vụ mới vào kho';
    if (idEl) idEl.value = '';
    if (nameEl) nameEl.value = '';
    if (priceEl) priceEl.value = 15000;
    if (unitEl) unitEl.value = 'chai';
    if (stockEl) stockEl.value = 48;
    if (minEl) minEl.value = 10;
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}
window.openServiceModal = openServiceModal;

function closeServiceModal() {
  const modal = document.getElementById('service-crud-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}
window.closeServiceModal = closeServiceModal;

async function saveServiceModal(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền lưu dịch vụ!', 'error');
    return;
  }
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const id = (document.getElementById('srv-form-id')?.value || '').trim();
  const name = (document.getElementById('srv-form-name')?.value || '').trim();
  const price = Math.max(0, parseInt(document.getElementById('srv-form-price')?.value || '0', 10));
  const unit = (document.getElementById('srv-form-unit')?.value || 'đơn vị').trim();
  const stockQty = Math.max(0, parseInt(document.getElementById('srv-form-stock')?.value || '0', 10));
  const minStockWarning = Math.max(0, parseInt(document.getElementById('srv-form-min-stock')?.value || '5', 10));

  if (!name) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập tên dịch vụ!', 'warning');
    return;
  }

  const payload = {
    id: id || undefined,
    name,
    price,
    unit,
    stock_qty: stockQty,
    min_stock_warning: minStockWarning,
    stockQty,
    minStockWarning
  };

  const r = await adminFetchJson('../api/admin.php?action=inventory', {
    method: 'POST',
    body: JSON.stringify(Object.assign({ sub_action: 'save_service' }, payload))
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể lưu mặt hàng dịch vụ!', 'error', 4000);
    return;
  }

  db.saveServiceItem(payload);
  closeServiceModal();
  renderAdminInventory();

  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(`✓ Đã lưu mặt hàng "${name}" vào danh mục kho dịch vụ!`, 'success', 3000);
  }
}
window.saveServiceModal = saveServiceModal;

async function handleDeleteService(serviceId) {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chỉ Quản lý hoặc Chủ sân mới có quyền xóa dịch vụ!', 'error');
    return;
  }
  const db = window.SanBongApp?.SanBongDB;
  const srv = db ? db.getServices().find(s => s.id === serviceId) : null;
  if (!srv) return;
  const ok = await showAdminConfirm({
    title: 'Ngừng kinh doanh dịch vụ',
    message: `Ngừng kinh doanh dịch vụ "${srv.name}" (${srv.id})?`,
    confirmText: 'Ngừng kinh doanh',
    cancelText: 'Giữ lại',
    danger: true
  });
  if (!ok) return;

  const r = await adminFetchJson('../api/admin.php?action=inventory', {
    method: 'POST',
    body: JSON.stringify({ sub_action: 'delete_service', id: serviceId })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'Không thể ngừng kinh doanh dịch vụ!', 'error', 4000);
    return;
  }

  if (db && typeof db.deleteServiceItem === 'function') {
    db.deleteServiceItem(serviceId);
  }
  renderAdminInventory();
  if (isOwnerAdmin() && typeof loadAdminLogs === 'function') loadAdminLogs(1);
  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(`🗑️ Đã ngừng kinh doanh dịch vụ "${srv.name}".`, 'info', 3000);
  }
}
window.handleDeleteService = handleDeleteService;

