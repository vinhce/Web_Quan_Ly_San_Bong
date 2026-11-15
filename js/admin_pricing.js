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
      window.SanBongApp.showToast('✓ Đã lưu cấu hình bảng giá mới và đồng bộ sang trang Đặt sân!', 'success', 3500);
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origText || 'Lưu bảng giá';
    }
  }
}
window.savePricingTable = savePricingTable;

