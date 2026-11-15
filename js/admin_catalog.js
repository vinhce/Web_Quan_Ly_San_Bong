// =========================================================
// Má»¤C 3.1: KHO NÆ¯á»šC & BÃN Láºº Dá»ŠCH Vá»¤ Táº I QUáº¦Y (POS INVENTORY)
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
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'Ä‘');

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
      linePreviewEl.textContent = `ThÃ nh tiá»n: ${fmt(lineTotal)} Â· CÃ²n tá»“n: ${stock} ${srv.unit || ''}`;
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
  const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'Ä‘');

  const openSrvBtn = document.getElementById('btn-open-service-modal');
  if (openSrvBtn) {
    openSrvBtn.classList.toggle('hidden', !isManagerOrAdmin());
  }

  // 1. Cáº­p nháº­t banner cáº£nh bÃ¡o sáº¯p háº¿t hÃ ng
  const lowItems = services.filter(s => Number(s.stockQty ?? 50) <= Number(s.minStockWarning ?? 10));
  const lowBanner = document.getElementById('inventory-low-stock-banner');
  const lowText = document.getElementById('inventory-low-stock-text');
  if (lowBanner) {
    if (lowItems.length > 0) {
      const names = lowItems.map(i => `${i.name} (cÃ²n ${Number(i.stockQty ?? 0)} ${i.unit || ''})`).join(', ');
      if (lowText) {
        lowText.textContent = `Cáº¢NH BÃO Tá»’N KHO THáº¤P: CÃ³ ${lowItems.length} máº·t hÃ ng cháº¡m ngÆ°á»¡ng sáº¯p háº¿t (${names})! Vui lÃ²ng nháº­p thÃªm kho.`;
      }
      lowBanner.classList.remove('hidden');
      lowBanner.classList.add('flex');
    } else {
      lowBanner.classList.add('hidden');
      lowBanner.classList.remove('flex');
    }
  }

  // 2. Cáº­p nháº­t dropdown POS
  const posSelect = document.getElementById('pos-service-select');
  if (posSelect) {
    const prevVal = posSelect.value;
    posSelect.innerHTML = services.map(s => {
      const st = Number(s.stockQty ?? 50);
      return `<option value="${escapeSearchHTML(s.id)}" ${st <= 0 ? 'disabled' : ''}>${escapeSearchHTML(s.name)} â€” ${escapeSearchHTML(fmt(s.price))}/${escapeSearchHTML(s.unit || 'cÃ¡i')} (Tá»“n: ${st})</option>`;
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

  // 3. Render báº£ng tá»“n kho
  const tbody = document.getElementById('admin-inventory-tbody');
  if (!tbody) return;

  tbody.innerHTML = services.map(s => {
    const stock = Number(s.stockQty ?? 50);
    const minW = Number(s.minStockWarning ?? 10);
    const safeSrvIdAttr = escapeJsAttr(s.id);

    let stockBadge = '';
    if (stock <= 0) {
      stockBadge = `<span class="inline-block ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-200 text-slate-700 border border-slate-300 whitespace-nowrap">Háº¿t hÃ ng</span>`;
    } else if (stock <= minW) {
      stockBadge = `<span class="inline-block ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700 border border-red-300 whitespace-nowrap">Sáº¯p háº¿t</span>`;
    } else {
      stockBadge = `<span class="inline-block ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">Äá»§ hÃ ng</span>`;
    }

    return `
      <tr class="hover:bg-slate-50 transition-colors ${stock <= minW ? 'bg-red-50/30' : ''}">
        <td class="py-2.5 px-3 font-bold text-[#0F172A] whitespace-nowrap">
          ${escapeSearchHTML(s.name)}
          <span class="text-[10px] font-mono text-slate-400 ml-1">(${escapeSearchHTML(s.id)})</span>
        </td>
        <td class="py-2.5 px-3 font-extrabold text-[#16A34A] whitespace-nowrap">
          ${escapeSearchHTML(fmt(s.price))} <span class="text-[11px] font-normal text-slate-500">/ ${escapeSearchHTML(s.unit || 'Ä‘Æ¡n vá»‹')}</span>
        </td>
        <td class="py-2.5 px-3 text-center whitespace-nowrap">
          <span class="font-mono font-extrabold text-sm ${stock <= 0 ? 'text-slate-500' : (stock <= minW ? 'text-red-600' : 'text-[#0F172A]')}">${stock}</span>
          <span class="text-[11px] text-slate-500">${escapeSearchHTML(s.unit || '')}</span>
          ${stockBadge}
        </td>
        <td class="py-2.5 px-3 text-center font-mono text-xs text-slate-500 whitespace-nowrap">
          â‰¤ ${minW} ${escapeSearchHTML(s.unit || '')}
        </td>
        <td class="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
          ${isManagerOrAdmin() ? `
            <button type="button" onclick="promptRestockService('${safeSrvIdAttr}')" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs cursor-pointer">
              + Nháº­p kho
            </button>
            <button type="button" onclick="openServiceModal('${safeSrvIdAttr}')" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#0F172A] border border-slate-300 font-bold text-[11px] cursor-pointer">
              Sá»­a
            </button>
            <button type="button" onclick="handleDeleteService('${safeSrvIdAttr}')" class="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-[11px] cursor-pointer" title="Ngá»«ng kinh doanh / XÃ³a dá»‹ch vá»¥">
              <svg class="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          ` : `
            <span class="text-[11px] text-slate-400 italic">Chá»‰ xem</span>
          `}
        </td>
      </tr>
    `;
  }).join('');
}
window.renderAdminInventory = renderAdminInventory;

// [hoisted to admin.js]

async function handleCounterServiceSale(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (isPosSaleSubmitting) return;

  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const srvId = document.getElementById('pos-service-select')?.value || '';
  const qty = Math.max(1, parseInt(document.getElementById('pos-service-qty')?.value || '1', 10) || 1);
  const payMethod = document.getElementById('pos-pay-method')?.value || 'Tiá»n máº·t táº¡i quáº§y';
  const note = (document.getElementById('pos-sale-note')?.value || '').trim();

  const srv = db.getServices().find(s => s.id === srvId);
  if (!srv) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lÃ²ng chá»n dá»‹ch vá»¥ cáº§n bÃ¡n!', 'warning');
    return;
  }

  if (Number(srv.stockQty ?? 50) < qty) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(`âš ï¸ Tá»“n kho ${srv.name} chá»‰ cÃ²n ${srv.stockQty} ${srv.unit}, khÃ´ng Ä‘á»§ xuáº¥t ${qty}! HÃ£y nháº­p thÃªm kho.`, 'error', 4000);
    }
    return;
  }

  const form = e?.target && e.target.tagName === 'FORM' ? e.target : document.getElementById('pos-service-select')?.closest('form');
  const submitBtn = e?.submitter || document.getElementById('pos-sale-submit-btn') || form?.querySelector('button[type="submit"]');
  const origBtnHtml = submitBtn ? submitBtn.innerHTML : '';

  isPosSaleSubmitting = true;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'â³ Äang xuáº¥t kho...';
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
        window.SanBongApp.showToast(r.message || 'KhÃ´ng thá»ƒ bÃ¡n dá»‹ch vá»¥ (kiá»ƒm tra láº¡i tá»“n kho)!', 'error', 4000);
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

      const fmt = window.SanBongApp?.formatVND || (n => Number(n || 0).toLocaleString('vi-VN') + 'Ä‘');
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast(r.message || `ðŸ’° ÄÃ£ bÃ¡n ${qty}x ${sale.serviceName} (${fmt(sale.totalAmount)} - ${payMethod}) & trá»« tá»“n kho!`, 'success', 3500);
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
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chá»‰ Quáº£n lÃ½ hoáº·c Chá»§ sÃ¢n má»›i cÃ³ quyá»n nháº­p kho hÃ ng!', 'error');
    return;
  }
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;
  const srv = db.getServices().find(s => s.id === serviceId);
  if (!srv) return;

  const rawQty = await showAdminPrompt({
    title: `ðŸ“¦ Nháº­p thÃªm kho: ${srv.name}`,
    message: `â€¢ Tá»“n kho hiá»‡n táº¡i: ${Number(srv.stockQty ?? 0)} ${srv.unit || ''}\nâ€¢ Nháº­p sá»‘ lÆ°á»£ng thÃªm vÃ o kho (vÃ­ dá»¥: 24 hoáº·c 48):`,
    placeholder: 'VD: 24',
    defaultValue: '24',
    inputType: 'number',
    confirmText: 'Nháº­p kho',
    cancelText: 'Há»§y'
  });
  if (rawQty === null) return;
  const added = parseInt(String(rawQty).replace(/[^\d]/g, ''), 10);
  if (!added || added <= 0) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Sá»‘ lÆ°á»£ng nháº­p kho pháº£i lá»›n hÆ¡n 0!', 'warning');
    return;
  }

  const r = await adminFetchJson('../api/admin.php?action=inventory', {
    method: 'POST',
    body: JSON.stringify({ sub_action: 'restock', id: serviceId, add_qty: added, added_qty: added })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'KhÃ´ng thá»ƒ nháº­p thÃªm kho hÃ ng!', 'error', 4000);
    return;
  }

  const updated = db.restockService(serviceId, added);
  renderAdminInventory();
  if (isOwnerAdmin() && typeof loadAuditLogs === 'function') loadAuditLogs();

  if (updated && window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(`ðŸ“¦ ÄÃ£ nháº­p thÃªm +${added} ${updated.unit} cho "${updated.name}". Tá»“n kho má»›i: ${updated.stockQty} ${updated.unit}!`, 'success', 3500);
  }
}
window.promptRestockService = promptRestockService;

function openServiceModal(serviceId = '') {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chá»‰ Quáº£n lÃ½ hoáº·c Chá»§ sÃ¢n má»›i cÃ³ quyá»n thÃªm/sá»­a dá»‹ch vá»¥!', 'error');
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
    if (titleEl) titleEl.textContent = `âœï¸ Chá»‰nh sá»­a dá»‹ch vá»¥: ${srv.name}`;
    if (idEl) idEl.value = srv.id;
    if (nameEl) nameEl.value = srv.name || '';
    if (priceEl) priceEl.value = Number(srv.price || 10000);
    if (unitEl) unitEl.value = srv.unit || 'chai';
    if (stockEl) stockEl.value = Number(srv.stockQty ?? 50);
    if (minEl) minEl.value = Number(srv.minStockWarning ?? 10);
  } else {
    if (titleEl) titleEl.textContent = 'âž• ThÃªm máº·t hÃ ng / Dá»‹ch vá»¥ má»›i vÃ o kho';
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
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chá»‰ Quáº£n lÃ½ hoáº·c Chá»§ sÃ¢n má»›i cÃ³ quyá»n lÆ°u dá»‹ch vá»¥!', 'error');
    return;
  }
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const id = (document.getElementById('srv-form-id')?.value || '').trim();
  const name = (document.getElementById('srv-form-name')?.value || '').trim();
  const price = Math.max(0, parseInt(document.getElementById('srv-form-price')?.value || '0', 10));
  const unit = (document.getElementById('srv-form-unit')?.value || 'Ä‘Æ¡n vá»‹').trim();
  const stockQty = Math.max(0, parseInt(document.getElementById('srv-form-stock')?.value || '0', 10));
  const minStockWarning = Math.max(0, parseInt(document.getElementById('srv-form-min-stock')?.value || '5', 10));

  if (!name) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lÃ²ng nháº­p tÃªn dá»‹ch vá»¥!', 'warning');
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
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'KhÃ´ng thá»ƒ lÆ°u máº·t hÃ ng dá»‹ch vá»¥!', 'error', 4000);
    return;
  }

  db.saveServiceItem(payload);
  closeServiceModal();
  renderAdminInventory();

  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(`âœ“ ÄÃ£ lÆ°u máº·t hÃ ng "${name}" vÃ o danh má»¥c kho dá»‹ch vá»¥!`, 'success', 3000);
  }
}
window.saveServiceModal = saveServiceModal;

async function handleDeleteService(serviceId) {
  if (!isManagerOrAdmin()) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Chá»‰ Quáº£n lÃ½ hoáº·c Chá»§ sÃ¢n má»›i cÃ³ quyá»n xÃ³a dá»‹ch vá»¥!', 'error');
    return;
  }
  const db = window.SanBongApp?.SanBongDB;
  const srv = db ? db.getServices().find(s => s.id === serviceId) : null;
  if (!srv) return;
  const ok = await showAdminConfirm({
    title: 'Ngá»«ng kinh doanh dá»‹ch vá»¥',
    message: `Ngá»«ng kinh doanh dá»‹ch vá»¥ "${srv.name}" (${srv.id})?`,
    confirmText: 'Ngá»«ng kinh doanh',
    cancelText: 'Giá»¯ láº¡i',
    danger: true
  });
  if (!ok) return;

  const r = await adminFetchJson('../api/admin.php?action=inventory', {
    method: 'POST',
    body: JSON.stringify({ sub_action: 'delete_service', id: serviceId })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast(r.message || 'KhÃ´ng thá»ƒ ngá»«ng kinh doanh dá»‹ch vá»¥!', 'error', 4000);
    return;
  }

  if (db && typeof db.deleteServiceItem === 'function') {
    db.deleteServiceItem(serviceId);
  }
  renderAdminInventory();
  if (isOwnerAdmin() && typeof loadAuditLogs === 'function') loadAuditLogs();
  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(`ðŸ—‘ï¸ ÄÃ£ ngá»«ng kinh doanh dá»‹ch vá»¥ "${srv.name}".`, 'info', 3000);
  }
}
window.handleDeleteService = handleDeleteService;

