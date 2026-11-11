// =========================================================
// 1. QUÉT QR CODE CHECK-IN NHẬN SÂN (QR SCANNER MODAL)
// =========================================================
// [hoisted to admin.js]

function getQRHiddenCanvas() {
  if (!qrHiddenCanvas) {
    qrHiddenCanvas = document.createElement('canvas');
    qrHiddenCanvas.id = 'qr-hidden-canvas';
    qrHiddenCanvas.style.display = 'none';
    document.body.appendChild(qrHiddenCanvas);
  }
  return qrHiddenCanvas;
}

function openQRScannerModal(preCode = '') {
  const modal = document.getElementById('qr-scanner-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  const input = document.getElementById('qr-code-input');
  const resultBox = document.getElementById('qr-ticket-result');
  const quickList = document.getElementById('qr-quick-select-list');

  const db = window.SanBongApp?.SanBongDB;
  if (db && quickList) {
    const all = db.getAllBookings();
    // Ưu tiên hiển thị các đơn hôm nay cần nhận sân hoặc đang đá
    const candidates = all.filter(b => b.status === 'Đã xác nhận' || b.status === 'Chờ duyệt cọc' || b.status === 'Đang đá' || b.status === 'Khách chưa đến').slice(0, 8);
    quickList.innerHTML = candidates.map(b => {
      let dotColor = 'bg-emerald-500';
      if (b.status === 'Đang đá') dotColor = 'bg-blue-500';
      else if (b.status === 'Chờ duyệt cọc') dotColor = 'bg-amber-500';
      else if (b.status === 'Khách chưa đến') dotColor = 'bg-red-500';

      const safeCodeAttr = escapeSearchHTML(b.code || '');
      return `
        <button type="button" data-code="${safeCodeAttr}" onclick="lookupQRTicket(this.getAttribute('data-code'))" class="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-xs font-semibold text-[#0F172A] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs">
          <span class="w-2 h-2 rounded-full ${dotColor} shrink-0"></span>
          <span class="font-mono font-bold text-[#16A34A]">${safeCodeAttr}</span>
          <span class="truncate max-w-[130px] text-slate-600">${escapeSearchHTML(b.pitchName || '')}</span>
          <span class="text-[11px] text-slate-400">(${escapeSearchHTML(b.slotTime || '')})</span>
        </button>
      `;
    }).join('');
  }

  if (preCode) {
    if (input) input.value = preCode;
    lookupQRTicket(preCode);
  } else {
    activeQRBookingCode = '';
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 150);
    }
    if (resultBox) {
      resultBox.classList.add('hidden');
      resultBox.innerHTML = '';
    }
    const checkinBtn = document.getElementById('qr-confirm-checkin-btn');
    if (checkinBtn) {
      checkinBtn.innerHTML = '✅ Xác nhận Check-in Nhận Sân';
      checkinBtn.className = 'btn-sm btn-primary font-bold';
    }
  }
}

function closeQRScannerModal() {
  stopCameraQRScan();
  const modal = document.getElementById('qr-scanner-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

async function toggleCameraQRScan() {
  const video = document.getElementById('qr-video-preview');
  const placeholder = document.getElementById('qr-camera-placeholder');
  const laser = document.getElementById('qr-scan-laser');
  const btn = document.getElementById('qr-camera-toggle-btn');

  if (qrCameraStream) {
    stopCameraQRScan();
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Trình duyệt không hỗ trợ mở Camera trực tiếp. Vui lòng chọn ảnh vé QR hoặc bấm vé gợi ý bên dưới!', 'warning', 3500);
    }
    return;
  }

  try {
    qrCameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    if (video) {
      video.srcObject = qrCameraStream;
      video.classList.remove('hidden');
      await video.play();
    }
    if (placeholder) placeholder.classList.add('hidden');
    if (laser) {
      laser.classList.remove('hidden');
      laser.classList.add('animate-laser');
    }
    if (btn) btn.innerHTML = '<span>⏹️</span> Tắt Camera';

    const canvas = getQRHiddenCanvas();
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    let barcodeDetector = null;
    if ('BarcodeDetector' in window) {
      try {
        barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
      } catch (e) {}
    }

    qrScanTimer = setInterval(async () => {
      if (!video || video.readyState < 2) return;
      try {
        let codeFound = null;

        // 1. Thử quét bằng jsQR engine (độ tương thích 100% mọi trình duyệt)
        if (typeof window.jsQR === 'function') {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qr = window.jsQR(imgData.data, imgData.width, imgData.height, {
            inversionAttempts: 'dontInvert'
          });
          if (qr && qr.data) {
            codeFound = qr.data;
          }
        }

        // 2. Thử native BarcodeDetector nếu chưa bắt được
        if (!codeFound && barcodeDetector) {
          const barcodes = await barcodeDetector.detect(video);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            codeFound = barcodes[0].rawValue;
          }
        }

        if (codeFound) {
          const match = codeFound.match(/(ASF[FSE]?[0-9]{6,8}|DH[0-9]{6,8})/i);
          const cleanCode = match ? match[1].toUpperCase() : codeFound.trim().toUpperCase();
          if (cleanCode) {
            if (window.SanBongApp?.playScanBeep) window.SanBongApp.playScanBeep(true);
            stopCameraQRScan();
            lookupQRTicket(cleanCode);
            if (window.SanBongApp?.showToast) {
              window.SanBongApp.showToast('✓ Đã quét thành công mã vé: ' + cleanCode, 'success', 2500);
            }
          }
        }
      } catch (err) {}
    }, 150);

  } catch (err) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('Không thể mở Camera (thiếu quyền hoặc thiết bị không có webcam). Hãy chọn ảnh vé QR hoặc bấm danh sách chọn nhanh!', 'info', 4000);
    }
  }
}

function stopCameraQRScan() {
  if (qrScanTimer) {
    clearInterval(qrScanTimer);
    qrScanTimer = null;
  }
  if (qrCameraStream) {
    qrCameraStream.getTracks().forEach(t => t.stop());
    qrCameraStream = null;
  }
  const video = document.getElementById('qr-video-preview');
  const placeholder = document.getElementById('qr-camera-placeholder');
  const laser = document.getElementById('qr-scan-laser');
  const btn = document.getElementById('qr-camera-toggle-btn');
  if (video) {
    video.pause();
    video.srcObject = null;
    video.classList.add('hidden');
  }
  if (placeholder) placeholder.classList.remove('hidden');
  if (laser) {
    laser.classList.add('hidden');
    laser.classList.remove('animate-laser');
  }
  if (btn) btn.innerHTML = '<span>📷</span> Bật Camera Quét QR';
}

async function handleQRImageUpload(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = async () => {
      const canvas = getQRHiddenCanvas();
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);

      let found = null;
      if (typeof window.jsQR === 'function') {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qr = window.jsQR(imgData.data, imgData.width, imgData.height);
        if (qr && qr.data) found = qr.data;
      }

      if (!found && 'BarcodeDetector' in window) {
        try {
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          const barcodes = await detector.detect(canvas);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            found = barcodes[0].rawValue;
          }
        } catch (err) {}
      }

      if (found) {
        if (window.SanBongApp?.playScanBeep) window.SanBongApp.playScanBeep(true);
        const match = found.match(/(ASF[FSE]?[0-9]{6,8}|DH[0-9]{6,8})/i);
        const cleanCode = match ? match[1].toUpperCase() : found.trim().toUpperCase();
        lookupQRTicket(cleanCode);
        if (window.SanBongApp?.showToast) {
          window.SanBongApp.showToast('✓ Đã quét thành công mã vé từ ảnh: ' + cleanCode, 'success', 2500);
        }
      } else {
        // Tên file có chứa mã đơn
        const nameMatch = file.name.match(/(ASF[FSE]?[0-9]{6,8}|DH[0-9]{6,8})/i);
        if (nameMatch) {
          if (window.SanBongApp?.playScanBeep) window.SanBongApp.playScanBeep(true);
          lookupQRTicket(nameMatch[1].toUpperCase());
          return;
        }

        if (window.SanBongApp?.playScanBeep) window.SanBongApp.playScanBeep(false);
        if (window.SanBongApp?.showToast) {
          window.SanBongApp.showToast('Không tìm thấy mã QR trong ảnh vừa chọn. Vui lòng thử ảnh rõ nét hơn hoặc nhập mã vé!', 'warning', 3500);
        }
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function lookupQRTicket(codeOpt) {
  const input = document.getElementById('qr-code-input');
  const resultBox = document.getElementById('qr-ticket-result');
  const checkinBtn = document.getElementById('qr-confirm-checkin-btn');
  if (!resultBox) return;

  let raw = (codeOpt || input?.value || '').trim();
  const match = raw.match(/(ASF[FSE]?[0-9]{6,8}|DH[0-9]{6,8})/i);
  const rawCode = match ? match[1].toUpperCase() : raw.toUpperCase();

  if (input && rawCode) input.value = rawCode;

  if (!rawCode) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập hoặc chọn một mã vé QR để tra cứu.', 'warning');
    return;
  }

  const db = window.SanBongApp?.SanBongDB;
  const booking = db ? db.getBookingByCode(rawCode) : null;

  if (!booking) {
    activeQRBookingCode = '';
    resultBox.className = 'p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold';
    resultBox.innerHTML = `✕ Không tìm thấy vé đặt sân nào khớp với mã <b>${escapeSearchHTML(rawCode)}</b>. Vui lòng kiểm tra lại!`;
    resultBox.classList.remove('hidden');
    if (checkinBtn) {
      checkinBtn.disabled = true;
      checkinBtn.className = 'btn-sm bg-slate-200 text-slate-400 cursor-not-allowed';
    }
    return;
  }

  activeQRBookingCode = booking.code;
  const total = Number(booking.totalPrice || 0);
  const deposit = Number(booking.depositAmount || Math.round(total * 0.3));
  const remaining = Math.max(0, total - deposit);

  let statusBadgeHtml = '';
  let canCheckin = false;

  if (booking.status === 'Đã xác nhận') {
    statusBadgeHtml = '<span class="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-xs">🟢 HỢP LỆ — SẴN SÀNG NHẬN SÂN</span>';
    canCheckin = true;
  } else if (booking.status === 'Đang đá') {
    statusBadgeHtml = '<span class="px-3 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-300 font-extrabold text-xs">🔵 ĐANG ĐÁ — ĐÃ NHẬN SÂN</span>';
    canCheckin = false;
  } else if (booking.status === 'Chờ duyệt cọc') {
    statusBadgeHtml = '<span class="px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-extrabold text-xs">🟡 CHỜ DUYỆT CỌC (Chưa xác nhận cọc)</span>';
    canCheckin = true;
  } else if (booking.status === 'Hoàn thành') {
    statusBadgeHtml = '<span class="px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-300 font-extrabold text-xs">⚪ ĐÃ HOÀN THÀNH (Đã thu 100%)</span>';
    canCheckin = false;
  } else {
    statusBadgeHtml = `<span class="px-3 py-1 rounded-full bg-red-100 text-red-800 border border-red-300 font-extrabold text-xs">🔴 ${escapeSearchHTML(booking.status)}</span>`;
    canCheckin = false;
  }

  let srvListText = 'Không có dịch vụ thêm';
  if (booking.services && booking.services.length > 0) {
    srvListText = booking.services.map(s => `${escapeSearchHTML(s.name)} × ${s.quantity}`).join(', ');
  }

  const safeBookingCode = escapeSearchHTML(booking.code || '');
  resultBox.className = 'p-4 rounded-xl bg-white border-2 border-emerald-500/80 shadow-md space-y-3 text-xs';
  resultBox.innerHTML = `
    <div class="flex items-center justify-between border-b border-slate-200 pb-2.5">
      <div class="flex items-center gap-2">
        <span class="px-2.5 py-1 rounded-md bg-[#0F172A] text-white font-mono font-extrabold text-sm tracking-wide">${safeBookingCode}</span>
        <span class="font-bold text-[#0F172A] text-sm sm:text-base">${escapeSearchHTML(booking.pitchName)}</span>
      </div>
      ${statusBadgeHtml}
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#334155] bg-slate-50 p-3 rounded-lg border border-slate-200">
      <div>👤 Khách hàng: <b class="text-[#0F172A]">${escapeSearchHTML(booking.customerName)}</b></div>
      <div>📞 Số điện thoại: <b class="font-mono text-[#0F172A]">${escapeSearchHTML(booking.phone || 'Chưa lưu')}</b></div>
      <div>📅 Ngày thi đấu: <b class="text-[#0F172A]">${window.SanBongApp.formatDateVN(booking.date)}</b></div>
      <div>⏰ Khung giờ: <b class="text-[#16A34A]">${escapeSearchHTML(booking.slotTime)}</b></div>
      <div class="sm:col-span-2 pt-1 border-t border-slate-200 text-slate-600">
        🥤 Dịch vụ kèm theo: <b>${srvListText}</b>
      </div>
    </div>

    <div class="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-2">
      <span>Tổng giá trị ca: <b class="text-sm font-bold text-[#0F172A]">${window.SanBongApp.formatVND(total)}</b></span>
      <span>Đã cọc trước: <b class="text-emerald-700 font-bold">${window.SanBongApp.formatVND(deposit)}</b></span>
      <span>Còn phải thu: <b class="text-sm font-extrabold text-[#DC2626]">${window.SanBongApp.formatVND(remaining)}</b></span>
    </div>

    <div class="flex flex-wrap items-center justify-end gap-2 pt-1">
      <button type="button" data-code="${safeBookingCode}" onclick="closeQRScannerModal(); openInvoiceModal(this.getAttribute('data-code'))" class="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1 border border-slate-300">
        <span>🖨️ In Vé / Hóa đơn</span>
      </button>
      <button type="button" data-code="${safeBookingCode}" onclick="closeQRScannerModal(); openInPlayModal(this.getAttribute('data-code'))" class="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs">
        <span>⚙️ Mở Điều Hành / Quản Lý Ca</span>
      </button>
    </div>
  `;
  resultBox.classList.remove('hidden');

  if (checkinBtn) {
    if (canCheckin) {
      checkinBtn.disabled = false;
      checkinBtn.className = 'btn-sm btn-primary font-bold shadow';
      checkinBtn.innerHTML = '✅ Xác nhận Check-in Nhận Sân';
      checkinBtn.onclick = () => confirmQRCheckin(booking.code);
    } else if (booking.status === 'Đang đá') {
      checkinBtn.disabled = false;
      checkinBtn.className = 'btn-sm bg-sky-600 hover:bg-sky-700 text-white font-bold shadow';
      checkinBtn.innerHTML = '⚙️ Mở Điều Hành & Thu Tiền';
      checkinBtn.onclick = () => {
        closeQRScannerModal();
        openInPlayModal(booking.code);
      };
    } else {
      checkinBtn.disabled = true;
      checkinBtn.className = 'btn-sm bg-slate-200 text-slate-400 cursor-not-allowed';
      checkinBtn.innerHTML = 'Đã hoàn thành / Không thể check-in';
    }
  }
}

async function confirmQRCheckin(codeOpt) {
  const code = codeOpt || activeQRBookingCode;
  if (!code) {
    const inputVal = document.getElementById('qr-code-input')?.value.trim();
    if (inputVal) lookupQRTicket(inputVal);
    if (!activeQRBookingCode) {
      if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng tra cứu mã vé hợp lệ trước khi xác nhận Check-in!', 'warning');
      return;
    }
  }

  const finalCode = code || activeQRBookingCode;
  const db = window.SanBongApp?.SanBongDB;
  const b = db ? db.getBookingByCode(finalCode) : null;
  const pitchName = b ? b.pitchName : 'sân';

  const r = await adminFetchJson('../api/bookings.php?action=checkin&code=' + encodeURIComponent(finalCode), {
    method: 'POST',
    body: JSON.stringify({})
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể check-in đơn đặt sân này!', 'error', 4000);
    }
    return;
  }

  if (db) db.checkinBooking(finalCode);

  if (window.SanBongApp?.playScanBeep) window.SanBongApp.playScanBeep(true);

  closeQRScannerModal();
  renderOverviewTodayBookings();
  renderTimelineGantt();
  renderOverviewKPIs();

  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast('🎉 CHECK-IN THÀNH CÔNG: Đội khách mã ' + finalCode + ' đã nhận ' + pitchName + '! Đèn sân đã bật & bắt đầu tính giờ thi đấu.', 'success', 4500);
  }
}

window.openQRScannerModal = openQRScannerModal;
window.closeQRScannerModal = closeQRScannerModal;
window.toggleCameraQRScan = toggleCameraQRScan;
window.handleQRImageUpload = handleQRImageUpload;
window.lookupQRTicket = lookupQRTicket;
window.confirmQRCheckin = confirmQRCheckin;

// 2. ĐIỀU HÀNH TRẬN ĐẤU ĐANG CHƠI & THU TIỀN CÒN LẠI (INLINE TIMELINE & MODAL)
// =========================================================
function renderInlineInPlaySelector() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;
  const allBookings = db.getAllBookings();
  if (!activeInPlayCode && allBookings.length > 0) {
    activeInPlayCode = allBookings[0].code;
  }

  const selectEl = document.getElementById('inline-inplay-select');
  if (selectEl) {
    selectEl.innerHTML = allBookings.map(b => {
      const st = (b.status === 'Vắng mặt (No-Show)' || String(b.status || '').includes('No-Show')) ? 'Khách chưa đến' : (b.status || 'Đã xác nhận');
      const safeCodeHtml = escapeSearchHTML(b.code || '');
      return `<option value="${safeCodeHtml}" ${b.code === activeInPlayCode ? 'selected' : ''}>#${safeCodeHtml} · ${escapeSearchHTML(b.pitchName)} (${escapeSearchHTML(b.slotTime || '')}) · ${escapeSearchHTML(b.customerName)} [${escapeSearchHTML(st)}]</option>`;
    }).join('');
  }

  const quickCardsEl = document.getElementById('inline-inplay-quick-cards');
  if (quickCardsEl) {
    quickCardsEl.innerHTML = allBookings.map(b => {
      const isSel = b.code === activeInPlayCode;
      const st = (b.status === 'Vắng mặt (No-Show)' || String(b.status || '').includes('No-Show')) ? 'Khách chưa đến' : (b.status || 'Đã xác nhận');
      let badgeCls = 'bg-amber-100 text-amber-800 border border-amber-300';
      if (st === 'Đang đá') badgeCls = 'bg-blue-100 text-blue-700 border border-blue-300';
      else if (st === 'Đã xác nhận') badgeCls = 'bg-emerald-100 text-emerald-700 border border-emerald-300';
      else if (st === 'Hoàn thành') badgeCls = 'bg-emerald-600 text-white border border-emerald-700';
      else if (st === 'Khách chưa đến' || st === 'Đã hủy') badgeCls = 'bg-red-100 text-red-700 border border-red-300';
      const safeCodeHtml = escapeSearchHTML(b.code || '');
      return `
        <button type="button" data-code="${safeCodeHtml}" onclick="openInPlaySection(this.getAttribute('data-code'))" class="px-3 py-1.5 rounded-xl border-2 text-left transition-all cursor-pointer inline-flex items-center gap-2 shrink-0 ${isSel ? 'bg-emerald-50 border-[#16A34A] ring-2 ring-[#16A34A]/25 shadow-sm' : 'bg-white border-slate-300 hover:border-slate-400'}">
          <span class="font-mono font-bold text-xs text-[#0F172A] whitespace-nowrap">#${safeCodeHtml}</span>
          <span class="text-xs font-semibold text-[#334155] truncate max-w-[140px]">${escapeSearchHTML(b.customerName)}</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap shrink-0 ${badgeCls}">${escapeSearchHTML(st)}</span>
        </button>
      `;
    }).join('');
  }
}

function populateInPlayWorkspace(code) {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return null;
  const all = db.getAllBookings();
  const targetCode = code || activeInPlayCode || (all[0] ? all[0].code : '');
  const booking = db.getBookingByCode(targetCode) || all[0] || null;
  if (!booking) return null;

  activeInPlayCode = booking.code;
  const normStatus = (booking.status === 'Vắng mặt (No-Show)' || String(booking.status || '').includes('No-Show')) ? 'Khách chưa đến' : (booking.status || 'Đang đá');

  const elCode = document.getElementById('inplay-modal-code');
  const elStatus = document.getElementById('inplay-modal-status');
  const elPitch = document.getElementById('inplay-modal-pitch');
  const elCustomer = document.getElementById('inplay-modal-customer');

  if (elCode) elCode.textContent = '#' + booking.code;
  if (elStatus) {
    elStatus.textContent = normStatus;
    if (normStatus === 'Hoàn thành') {
      elStatus.className = 'px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[11px] font-bold shadow-xs';
    } else if (normStatus === 'Đang đá') {
      elStatus.className = 'px-2.5 py-0.5 rounded-full bg-blue-500 text-white text-[11px] font-bold shadow-xs';
    } else if (normStatus === 'Khách chưa đến' || normStatus === 'Đã hủy') {
      elStatus.className = 'px-2.5 py-0.5 rounded-full bg-red-500 text-white text-[11px] font-bold shadow-xs';
    } else {
      elStatus.className = 'px-2.5 py-0.5 rounded-full bg-amber-500/25 text-amber-300 border border-amber-400/40 text-[11px] font-bold';
    }
  }
  if (elPitch) elPitch.textContent = `${booking.pitchName} (${booking.slotTime || ''})`;
  if (elCustomer) elCustomer.textContent = `${booking.customerName} - ${booking.phone || ''}`;

  const checkinBtn = document.getElementById('inline-checkin-btn');
  if (checkinBtn) {
    if (normStatus === 'Đã xác nhận' || normStatus === 'Chờ duyệt cọc') {
      checkinBtn.classList.remove('hidden');
    } else {
      checkinBtn.classList.add('hidden');
    }
  }

  const restoreBtn = document.getElementById('inline-restore-btn');
  if (restoreBtn) {
    if (normStatus === 'Khách chưa đến' || normStatus === 'Đã hủy') {
      restoreBtn.classList.remove('hidden');
    } else {
      restoreBtn.classList.add('hidden');
    }
  }

  const pitchSel = document.getElementById('inplay-new-pitch');
  if (pitchSel) {
    const pitches = db.getPitches().filter(p => p.status !== 'Bảo trì' && p.status !== 'Ẩn');
    pitchSel.innerHTML = pitches.map(p => `
      <option value="${escapeSearchHTML(p.id)}" ${p.id === booking.pitchId ? 'selected' : ''}>
        ${escapeSearchHTML(p.name)} (${window.SanBongApp.formatVND(p.basePrice)} - ${window.SanBongApp.formatVND(p.peakPrice)}/h) ${p.id === booking.pitchId ? '[Sân hiện tại]' : ''}
      </option>
    `).join('');
  }

  const srvSel = document.getElementById('inplay-service-select');
  if (srvSel) {
    const services = db.getServices();
    srvSel.innerHTML = services.map(s => `
      <option value="${escapeSearchHTML(s.id)}">${escapeSearchHTML(s.name)} — ${window.SanBongApp.formatVND(s.price)}/${escapeSearchHTML(s.unit)} (Tồn: ${Number(s.stockQty ?? 50)})</option>
    `).join('');
  }

  const cancelReasonEl = document.getElementById('inplay-cancel-reason');
  if (cancelReasonEl) {
    cancelReasonEl.placeholder = 'Nhập lý do hủy ca (Bắt buộc nếu đơn đã thu tiền/cọc)...';
    if (cancelReasonEl.value === 'Khách báo hủy lịch trước thời hạn') {
      cancelReasonEl.value = '';
    }
    cancelReasonEl.classList.remove('border-red-500', 'ring-2', 'ring-red-300');
    if (!cancelReasonEl._boundClearErr) {
      cancelReasonEl._boundClearErr = true;
      cancelReasonEl.addEventListener('input', () => {
        cancelReasonEl.classList.remove('border-red-500', 'ring-2', 'ring-red-300');
      });
    }
  }

  const cancelHintEl = document.getElementById('inplay-cancel-policy-hint');
  const cancelPolicyEl = document.getElementById('inplay-cancel-policy');
  if (cancelHintEl || cancelPolicyEl) {
    const sysCfg = (db.getSystemConfig && db.getSystemConfig()) || { refundFullHours: 24, refundPartialHours: 4 };
    const fullH = Math.max(1, Number(sysCfg.refundFullHours ?? 24));
    const partH = Math.max(0, Number(sysCfg.refundPartialHours ?? 4));
    let hoursLeft = null;
    if (booking.date) {
      const dPart = String(booking.date).trim().slice(0, 10);
      const tPart = booking.slotTime && String(booking.slotTime).includes('-')
        ? String(booking.slotTime).split('-')[0].trim()
        : String(booking.slotTime || '').trim();
      if (/^\d{1,2}:\d{2}$/.test(tPart)) {
        const [hh, mm] = tPart.split(':').map(n => String(parseInt(n, 10) || 0).padStart(2, '0'));
        const ko = new Date(`${dPart}T${hh}:${mm}:00`);
        if (!isNaN(ko.getTime())) {
          hoursLeft = (ko.getTime() - Date.now()) / (1000 * 60 * 60);
        }
      }
    }
    if (hoursLeft !== null) {
      let suggested = 'refund_100';
      let hintCls = 'bg-emerald-50 border-emerald-200 text-emerald-800';
      let hintText = `💡 Gợi ý (còn ${hoursLeft.toFixed(1)}h ≥ ${fullH}h): Hoàn 100% cọc`;
      if (hoursLeft < 0) {
        suggested = 'noshow_forfeit';
        hintCls = 'bg-red-50 border-red-200 text-red-800';
        hintText = `💡 Đã quá giờ đá ${Math.abs(Math.round(hoursLeft * 60))} phút: Tịch thu cọc 30% & Nhả sân`;
      } else if (hoursLeft < partH) {
        suggested = 'noshow_forfeit';
        hintCls = 'bg-red-50 border-red-200 text-red-800';
        hintText = `💡 Sát giờ (còn ${hoursLeft.toFixed(1)}h < ${partH}h): Không hoàn / Tịch thu cọc`;
      } else if (hoursLeft < fullH) {
        suggested = 'forfeit_50';
        hintCls = 'bg-amber-50 border-amber-200 text-amber-800';
        hintText = `💡 Gợi ý (còn ${hoursLeft.toFixed(1)}h, mốc ${partH}h–${fullH}h): Phạt 50% cọc`;
      }
      if (cancelPolicyEl) cancelPolicyEl.value = suggested;
      if (cancelHintEl) {
        cancelHintEl.textContent = hintText;
        cancelHintEl.className = `text-[11px] font-semibold rounded-lg px-2.5 py-1.5 mb-1.5 border ${hintCls}`;
      }
    } else if (cancelHintEl) {
      cancelHintEl.classList.add('hidden');
    }
  }

  const pkgBanner = document.getElementById('inplay-package-promo-banner');
  const pkgDesc = document.getElementById('inplay-package-promo-desc');
  const promo = booking.packagePromotion || (window.SanBongApp?.SanBongDB?.getPackagePromotion ? window.SanBongApp.SanBongDB.getPackagePromotion(booking.weeksCount || 1) : null);
  if (pkgBanner) {
    if (booking.weeksCount > 1 || String(booking.note || '').includes('Gói') || promo) {
      pkgBanner.classList.remove('hidden');
      pkgBanner.classList.add('flex');
      if (pkgDesc) {
        if (promo) {
          pkgDesc.textContent = `${promo.title}: Tài trợ ${promo.giftSummary} (Miễn phí 100%) - Vui lòng xuất nước và giao trọng tài cho trận này.`;
        } else if (String(booking.note || '').includes('trọng tài')) {
          pkgDesc.textContent = 'Gói 3 Tháng: Tài trợ 2 thùng nước suối (48 chai) + 1 trọng tài chuyên nghiệp - Vui lòng xuất nước và giao trọng tài cho trận này.';
        }
      }
    } else {
      pkgBanner.classList.add('hidden');
      pkgBanner.classList.remove('flex');
    }
  }

  renderInlineInPlaySelector();
  updateInPlayOvertimePreview();
  refreshInPlaySummaryUI(booking);
  return booking;
}

function openInPlayModal(code, focusSection = '') {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const all = db.getAllBookings();
  const targetCode = code || activeInPlayCode || (all[0] ? all[0].code : '');
  const booking = populateInPlayWorkspace(targetCode);
  if (!booking) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Không tìm thấy đơn đặt sân ' + (code || ''), 'error');
    return;
  }

  const modal = document.getElementById('inplay-manage-modal') || document.getElementById('inplay-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    try { document.body.style.overflow = 'hidden'; } catch (e) {}
  }

  if (focusSection === 'pay') {
    const payEl = document.getElementById('inplay-pay-method');
    if (payEl) setTimeout(() => payEl.focus(), 200);
  }
}

function openInPlaySection(code, focusSection = '') {
  openInPlayModal(code, focusSection);
}

function closeInPlayModal() {
  const modal = document.getElementById('inplay-manage-modal') || document.getElementById('inplay-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    try { document.body.style.overflow = ''; } catch (e) {}
  }
}

async function handleInlineCheckinCurrent() {
  if (!activeInPlayCode) return;
  await handleCheckin(activeInPlayCode);
}

async function restoreCancelledBooking(code) {
  const targetCode = code || activeInPlayCode;
  if (!targetCode) return;
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;

  const r = await adminFetchJson('../api/bookings.php?action=restore&code=' + encodeURIComponent(targetCode), {
    method: 'POST',
    body: JSON.stringify({})
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể khôi phục đơn đã hủy!', 'error', 4000);
    }
    return;
  }

  const updated = db.restoreBooking(targetCode);
  if (updated) {
    renderOverviewTodayBookings();
    renderTimelineGantt();
    initQuickBookingForm();
    populateInPlayWorkspace(targetCode);
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(`🔄 Đã khôi phục đơn #${targetCode} về trạng thái "Đã xác nhận"!`, 'success', 3500);
    }
  }
}

async function restoreCurrentCancelledBooking() {
  if (!activeInPlayCode) return;
  await restoreCancelledBooking(activeInPlayCode);
}

function updateInPlayOvertimePreview() {
  const db = window.SanBongApp?.SanBongDB;
  if (!db || !activeInPlayCode) return;
  const booking = db.getBookingByCode(activeInPlayCode);
  if (!booking) return;

  const pitch = db.getPitchById(booking.pitchId);
  const mins = parseInt(document.getElementById('inplay-overtime-mins')?.value || '30', 10);
  const feeInput = document.getElementById('inplay-overtime-fee');
  if (pitch && feeInput) {
    const hourlyRate = pitch.peakPrice || pitch.basePrice || 300000;
    const suggestedFee = Math.round((hourlyRate * (mins / 60)) / 1000) * 1000;
    feeInput.value = suggestedFee;
  }
}

function refreshInPlaySummaryUI(booking) {
  if (!booking) return;
  const normStatus = (booking.status === 'Vắng mặt (No-Show)' || String(booking.status || '').includes('No-Show')) ? 'Khách chưa đến' : (booking.status || 'Đang đá');
  const total = Number(booking.totalPrice || 0);
  const deposit = Number(booking.depositAmount || Math.round(total * 0.3));
  const remaining = (normStatus === 'Hoàn thành' || normStatus === 'Đã hủy' || normStatus === 'Khách chưa đến') ? 0 : (typeof booking.remainingAmount === 'number' ? booking.remainingAmount : Math.max(0, total - deposit));
  const paidRem = normStatus === 'Hoàn thành' ? Number(booking.paidRemainingAmount || Math.max(0, total - deposit)) : 0;

  const elTotal = document.getElementById('inplay-bill-total');
  const elDep = document.getElementById('inplay-bill-deposit');
  const elPaidRow = document.getElementById('inplay-bill-paid-remaining-row');
  const elPaidVal = document.getElementById('inplay-bill-paid-remaining');
  const elRem = document.getElementById('inplay-bill-remaining');
  const elSrvList = document.getElementById('inplay-services-list');
  const elPayBtn = document.getElementById('inplay-pay-submit-btn');
  const elPayMethodWrap = document.getElementById('inplay-pay-method-wrap');

  if (elTotal) elTotal.textContent = window.SanBongApp.formatVND(total);
  if (elDep) elDep.textContent = '-' + window.SanBongApp.formatVND(deposit);
  if (elPaidRow && elPaidVal) {
    if (normStatus === 'Hoàn thành') {
      elPaidVal.textContent = '-' + window.SanBongApp.formatVND(paidRem);
      elPaidRow.classList.remove('hidden');
      elPaidRow.classList.add('flex');
    } else {
      elPaidRow.classList.add('hidden');
      elPaidRow.classList.remove('flex');
    }
  }
  if (elRem) {
    elRem.textContent = window.SanBongApp.formatVND(remaining);
    elRem.className = remaining > 0
      ? 'font-heading font-extrabold text-2xl text-[#DC2626]'
      : 'font-heading font-extrabold text-2xl text-[#16A34A]';
  }
  if (elPayBtn) {
    if (normStatus === 'Hoàn thành') {
      elPayBtn.innerHTML = '✓ Đã Thu Đủ 100% Tiền Sân (Hoàn Thành Ca)';
      elPayBtn.className = 'w-full rounded-xl bg-emerald-700 text-white font-extrabold text-xs py-2.5 shadow-sm cursor-default';
      if (elPayMethodWrap) elPayMethodWrap.classList.add('hidden');
    } else {
      elPayBtn.innerHTML = `✅ Thu Đủ Tiền Còn Lại (${window.SanBongApp.formatVND(remaining)}) & Hoàn Thành Ca`;
      elPayBtn.className = 'btn-base btn-primary w-full font-extrabold text-xs py-2.5 shadow-md cursor-pointer';
      if (elPayMethodWrap) elPayMethodWrap.classList.remove('hidden');
    }
  }

  if (elSrvList) {
    if (Array.isArray(booking.services) && booking.services.length > 0) {
      elSrvList.innerHTML = '<div class="font-bold text-[#0F172A] mb-1">Dịch vụ đã gọi trong ca:</div>' +
        booking.services.map(s => `
          <div class="flex justify-between items-center bg-white px-2.5 py-1 rounded border border-slate-200">
            <span>• ${escapeSearchHTML(s.name)} <b class="text-[#16A34A]">x${s.quantity}</b></span>
            <span class="font-bold text-[#0F172A]">${window.SanBongApp.formatVND((s.price || 0) * (s.quantity || 1))}</span>
          </div>
        `).join('');
    } else {
      elSrvList.innerHTML = '<div class="text-[11px] text-slate-400 italic">Chưa gọi thêm dịch vụ phụ nào.</div>';
    }
  }

  toggleInPlayVietQR();
}

function toggleInPlayVietQR() {
  const method = document.getElementById('inplay-pay-method')?.value || 'Tiền mặt tại quầy';
  const qrBox = document.getElementById('inplay-vietqr-box');
  const qrImg = document.getElementById('inplay-vietqr-img');
  if (!qrBox || !qrImg) return;

  if (method.includes('VietQR')) {
    const db = window.SanBongApp?.SanBongDB;
    const booking = db ? db.getBookingByCode(activeInPlayCode) : null;
    const bank = db ? db.getBankInfo() : {};
    const rem = booking ? Math.max(0, Number(booking.remainingAmount || 0)) : 0;
    const bankCode = bank.bankCode || 'MB';
    const accNo = bank.accountNumber || bank.accountNo || '0352313548';
    const des = `${activeInPlayCode} TATTOAN`;
    qrImg.src = `https://qr.sepay.vn/img?bank=${encodeURIComponent(bankCode)}&acc=${encodeURIComponent(accNo)}&template=compact&amount=${rem}&des=${encodeURIComponent(des)}`;
    qrBox.classList.remove('hidden');
  } else {
    qrBox.classList.add('hidden');
  }
}

async function submitInPlayOvertime() {
  if (!activeInPlayCode) return;
  const mins = parseInt(document.getElementById('inplay-overtime-mins')?.value || '30', 10);
  const fee = parseInt(document.getElementById('inplay-overtime-fee')?.value || '0', 10);

  const r = await adminFetchJson('../api/admin.php?action=manage_booking', {
    method: 'POST',
    body: JSON.stringify({ code: activeInPlayCode, sub_action: 'overtime', minutes: mins, fee: fee })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể gia hạn thêm giờ!', 'error', 4000);
    }
    return;
  }

  const db = window.SanBongApp?.SanBongDB;
  const updated = db ? db.addOvertimeToBooking(activeInPlayCode, mins, fee) : null;
  if (updated && r.data) {
    const allB = db.getAllBookings();
    const idx = allB.findIndex(x => x.code === activeInPlayCode);
    if (idx >= 0 && r.data.totalPrice !== undefined) {
      allB[idx].totalPrice = Number(r.data.totalPrice);
      if (r.data.remainingAmount !== undefined) allB[idx].remainingAmount = Number(r.data.remainingAmount);
      try { localStorage.setItem('sb_bookings_v1', JSON.stringify(allB)); } catch (e) {}
    }
  }
  refreshAllAdminViews(activeInPlayCode);
  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(r.message || `⏱️ Đã gia hạn thêm ${mins} phút (+${window.SanBongApp.formatVND(fee)}) cho đơn ${activeInPlayCode}!`, 'success', 3500);
  }
}

async function submitInPlayTransfer() {
  if (!activeInPlayCode) return;
  const newPitchId = document.getElementById('inplay-new-pitch')?.value;
  const reason = document.getElementById('inplay-transfer-reason')?.value.trim() || '';
  const adjustPrice = Boolean(document.getElementById('inplay-adjust-price')?.checked);

  if (!newPitchId) return;
  const db = window.SanBongApp?.SanBongDB;
  const currentBooking = db ? db.getBookingByCode(activeInPlayCode) : null;
  if (currentBooking && currentBooking.pitchId === newPitchId) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Đơn này đang ở sân ' + currentBooking.pitchName + ' rồi. Vui lòng chọn sân khác để chuyển!', 'warning');
    return;
  }

  const r = await adminFetchJson('../api/admin.php?action=manage_booking', {
    method: 'POST',
    body: JSON.stringify({
      code: activeInPlayCode,
      sub_action: 'transfer_pitch',
      new_pitch_id: newPitchId,
      adjust_price: adjustPrice,
      reason: reason
    })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể chuyển sân! Sân đích có thể bị trùng lịch hoặc đang bảo trì.', 'error', 4500);
    }
    return;
  }

  const updated = db ? db.changePitchForBooking(activeInPlayCode, newPitchId, adjustPrice, reason) : null;
  if (updated && r.data) {
    const allB = db.getAllBookings();
    const idx = allB.findIndex(x => x.code === activeInPlayCode);
    if (idx >= 0) {
      if (r.data.pitchName) allB[idx].pitchName = r.data.pitchName;
      if (r.data.totalPrice !== undefined) allB[idx].totalPrice = Number(r.data.totalPrice);
      if (r.data.remainingAmount !== undefined) allB[idx].remainingAmount = Number(r.data.remainingAmount);
      try { localStorage.setItem('sb_bookings_v1', JSON.stringify(allB)); } catch (e) {}
    }
  }
  refreshAllAdminViews(activeInPlayCode);
  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(r.message || `🔄 Đã chuyển đơn ${activeInPlayCode} sang ${r.data?.pitchName || updated?.pitchName || newPitchId} và giải phóng sân cũ!`, 'success', 3500);
  }
}

async function submitInPlayService() {
  if (!activeInPlayCode) return;
  const srvId = document.getElementById('inplay-service-select')?.value;
  const qty = Math.max(1, parseInt(document.getElementById('inplay-service-qty')?.value || '1', 10));
  if (!srvId) return;

  const db = window.SanBongApp?.SanBongDB;
  const srvDef = db ? db.getServices().find(s => s.id === srvId) : null;

  const r = await adminFetchJson('../api/admin.php?action=manage_booking', {
    method: 'POST',
    body: JSON.stringify({
      code: activeInPlayCode,
      sub_action: 'add_service',
      service_id: srvId,
      service_name: srvDef ? srvDef.name : srvId,
      quantity: qty
    })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể thêm dịch vụ vào đơn (kiểm tra tồn kho)!', 'error', 4000);
    }
    return;
  }

  const updated = db ? db.addInPlayService(activeInPlayCode, srvId, qty) : null;
  if (updated && r.data) {
    const allB = db.getAllBookings();
    const idx = allB.findIndex(x => x.code === activeInPlayCode);
    if (idx >= 0) {
      if (Array.isArray(r.data.services)) allB[idx].services = r.data.services;
      if (r.data.totalPrice !== undefined) allB[idx].totalPrice = Number(r.data.totalPrice);
      if (r.data.remainingAmount !== undefined) allB[idx].remainingAmount = Number(r.data.remainingAmount);
      try { localStorage.setItem('sb_bookings_v1', JSON.stringify(allB)); } catch (e) {}
    }
  }
  refreshAllAdminViews(activeInPlayCode);
  if (typeof renderAdminInventory === 'function') renderAdminInventory();
  if (window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(r.message || `🥤 Đã thêm ${qty}x ${srvDef ? srvDef.name : 'dịch vụ'} vào hóa đơn ${activeInPlayCode}!`, 'success', 3000);
  }
}

async function submitInPlayEarlyCancel() {
  if (!activeInPlayCode) return;
  const db = window.SanBongApp?.SanBongDB;
  const booking = db ? db.getBookingByCode(activeInPlayCode) : null;
  const policy = document.getElementById('inplay-cancel-policy')?.value || 'refund_100';
  const reasonInput = document.getElementById('inplay-cancel-reason');
  const rawReason = (reasonInput?.value || '').trim();

  const payStatusStr = String(booking?.paymentStatus || booking?.payment_status || '');
  const hasPaidMoney = Boolean(
    booking && (
      Number(booking.depositAmount || 0) > 0 ||
      payStatusStr.includes('Đã cọc') ||
      payStatusStr.includes('Đã thanh toán')
    )
  );

  if (hasPaidMoney && (!rawReason || rawReason === 'Khách báo hủy lịch trước thời hạn')) {
    if (reasonInput) {
      reasonInput.value = '';
      reasonInput.classList.add('border-red-500', 'ring-2', 'ring-red-300');
      reasonInput.focus();
    }
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast('⚠️ Đơn đã thu tiền/đặt cọc bắt buộc phải nhập lý do hủy vào ô Ghi chú lý do!', 'error', 4000);
    }
    return;
  }

  if (reasonInput) {
    reasonInput.classList.remove('border-red-500', 'ring-2', 'ring-red-300');
  }
  const reason = rawReason || 'Khách báo hủy lịch trước thời hạn (đơn chưa thu tiền)';

  const r = await adminFetchJson('../api/admin.php?action=manage_booking', {
    method: 'POST',
    body: JSON.stringify({ code: activeInPlayCode, sub_action: 'early_cancel', policy: policy, reason: reason })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || '⚠️ Không thể hủy lịch đơn này!', 'error', 4000);
    }
    return;
  }
  const serverMsg = r.message || '';

  if (policy === 'noshow_forfeit') {
    const updatedNoShow = db ? db.releaseNoShowBooking(activeInPlayCode) : null;
    closeInPlayModal();
    initQuickBookingForm();
    refreshAllAdminViews(activeInPlayCode);
    if ((updatedNoShow || serverMsg) && window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(serverMsg || `⚠️ Đã đánh dấu đơn ${activeInPlayCode} là "Khách chưa đến" (tịch thu cọc 30%) & nhả sân trống!`, 'warning', 4000);
    }
    return;
  }

  const updated = db ? db.cancelBookingEarly(activeInPlayCode, policy, reason) : null;
  closeInPlayModal();
  initQuickBookingForm();
  refreshAllAdminViews(activeInPlayCode);

  if ((updated || serverMsg) && window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(serverMsg || `🛑 Đã hủy lịch đơn ${activeInPlayCode} (${updated?.paymentStatus || ''}) và giải phóng sân trống!`, 'warning', 4000);
  }
}

async function submitInPlayPayRemaining() {
  if (!activeInPlayCode) return;
  const db = window.SanBongApp?.SanBongDB;
  const curBooking = db ? db.getBookingByCode(activeInPlayCode) : null;
  if (curBooking && curBooking.status === 'Hoàn thành') {
    openInvoicePrintModal(curBooking.code);
    return;
  }

  const payMethod = document.getElementById('inplay-pay-method')?.value || 'Tiền mặt tại quầy';

  const r = await adminFetchJson('../api/admin.php?action=manage_booking', {
    method: 'POST',
    body: JSON.stringify({ code: activeInPlayCode, sub_action: 'pay_remaining', pay_method: payMethod })
  });
  if (!r.ok) {
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(r.message || 'Không thể tất toán phần tiền còn lại!', 'error', 4000);
    }
    return;
  }

  const updated = db ? db.completeAndPayRemaining(activeInPlayCode, payMethod) : null;
  closeInPlayModal();
  refreshAllAdminViews(activeInPlayCode);

  if ((updated || r.ok) && window.SanBongApp?.showToast) {
    window.SanBongApp.showToast(r.message || `✅ ĐÃ THU ĐỦ 100% TIỀN SÂN: Đơn ${activeInPlayCode} đã cập nhật Hoàn thành tức thì!`, 'success', 4000);
  }
  if (updated) {
    openInvoicePrintModal(updated.code);
  } else {
    openInvoicePrintModal(activeInPlayCode);
  }
}

function openInvoiceFromInPlay() {
  const code = activeInPlayCode;
  closeInPlayModal();
  if (code) openInvoicePrintModal(code);
}

window.openInPlaySection = openInPlaySection;
window.openInPlayModal = openInPlayModal;
window.closeInPlayModal = closeInPlayModal;
window.renderInlineInPlaySelector = renderInlineInPlaySelector;
window.handleInlineCheckinCurrent = handleInlineCheckinCurrent;
window.restoreCancelledBooking = restoreCancelledBooking;
window.restoreCurrentCancelledBooking = restoreCurrentCancelledBooking;
window.updateInPlayOvertimePreview = updateInPlayOvertimePreview;
window.toggleInPlayVietQR = toggleInPlayVietQR;
window.submitInPlayOvertime = submitInPlayOvertime;
window.submitInPlayTransfer = submitInPlayTransfer;
window.submitInPlayService = submitInPlayService;
window.submitInPlayEarlyCancel = submitInPlayEarlyCancel;
window.submitInPlayPayRemaining = submitInPlayPayRemaining;
window.openInvoiceFromInPlay = openInvoiceFromInPlay;

// =========================================================
// 3. XEM & IN HÓA ĐƠN THANH TOÁN (INVOICE PRINT MODAL)
// =========================================================
function openInvoicePrintModal(code) {
  const db = window.SanBongApp?.SanBongDB;
  if (!db) return;
  const b = db.getBookingByCode(code);
  if (!b) return;

  activeInvoiceCode = b.code;
  const modal = document.getElementById('invoice-print-modal');
  const area = document.getElementById('printable-invoice-area');
  if (!modal || !area) return;

  const normStatus = (b.status === 'Vắng mặt (No-Show)' || String(b.status || '').includes('No-Show')) ? 'Khách chưa đến' : (b.status || '');
  const total = Number(b.totalPrice || 0);
  const deposit = Number(b.depositAmount || Math.round(total * 0.3));
  const remaining = (normStatus === 'Hoàn thành' || normStatus === 'Đã hủy' || normStatus === 'Khách chưa đến') ? 0 : (typeof b.remainingAmount === 'number' ? b.remainingAmount : Math.max(0, total - deposit));
  const pitchPrice = Number(b.pitchPrice || total);
  const overtimeFee = Number(b.overtimeFee || 0);
  const discount = Number(b.discountAmount || 0) + Number(b.monthlyDiscountAmount || 0);
  const services = Array.isArray(b.services) ? b.services : [];

  const serviceRows = services.map(s => {
    const qty = Number(s.quantity || 1);
    const price = Number(s.price || 0);
    const lineTot = Number(s.lineTotal || price * qty);
    return `
      <tr class="border-b border-slate-100">
        <td class="py-2">${escapeSearchHTML(s.name)}</td>
        <td class="py-2 text-center">${qty}</td>
        <td class="py-2 text-right">${window.SanBongApp.formatVND(price)}</td>
        <td class="py-2 text-right font-bold">${window.SanBongApp.formatVND(lineTot)}</td>
      </tr>
    `;
  }).join('');

  const overtimeRow = overtimeFee > 0 ? `
    <tr class="border-b border-slate-100">
      <td class="py-2">Phụ thu đá thêm giờ (+${b.overtimeMinutes || 30} phút)</td>
      <td class="py-2 text-center">1</td>
      <td class="py-2 text-right">${window.SanBongApp.formatVND(overtimeFee)}</td>
      <td class="py-2 text-right font-bold">${window.SanBongApp.formatVND(overtimeFee)}</td>
    </tr>
  ` : '';

  const nowStr = new Date().toLocaleString('vi-VN');
  const displayPayStatus = String(b.paymentStatus || normStatus).replace(/Vắng mặt \(No-Show\)/g, 'Khách chưa đến').replace(/No-Show/g, 'Khách chưa đến');

  area.innerHTML = `
    <div class="border-2 border-slate-800 rounded-xl p-5 space-y-4 bg-white">
      <div class="flex items-start justify-between border-b-2 border-dashed border-slate-300 pb-3">
        <div>
          <div class="font-heading font-extrabold text-base text-[#0F172A]">⚽ HỆ THỐNG SÂN BÓNG PRO</div>
          <div class="text-[11px] text-[#475569]">Cụm Sân Thể Thao Chuẩn FIFA · Hotline: 0352 313 548</div>
          <div class="text-[11px] text-[#64748B]">Thời gian in: ${nowStr}</div>
        </div>
        <div class="text-right">
          <div class="text-xs font-extrabold uppercase tracking-wider text-[#16A34A]">PHIẾU THANH TOÁN / HÓA ĐƠN</div>
          <div class="font-mono font-extrabold text-sm text-[#0F172A] mt-0.5">#${b.code}</div>
          <div class="text-[11px] font-bold text-slate-600">${escapeSearchHTML(displayPayStatus)}</div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div>Khách hàng: <b class="text-[#0F172A]">${escapeSearchHTML(b.customerName)}</b></div>
        <div>Số điện thoại: <b class="font-mono text-[#0F172A]">${escapeSearchHTML(b.phone)}</b></div>
        <div>Sân thi đấu: <b class="text-[#16A34A]">${escapeSearchHTML(b.pitchName)}</b></div>
        <div>Khung giờ: <b class="text-[#0F172A]">${escapeSearchHTML(b.slotTime)} (${window.SanBongApp.formatDateVN(b.date)})</b></div>
        ${b.weeksCount && b.weeksCount > 1 ? `<div class="col-span-2 text-purple-700 font-bold">📅 Hợp đồng đặt sân cố định theo tháng: ${b.weeksCount} tuần liên tiếp</div>` : ''}
      </div>

      <table class="w-full text-xs border-collapse">
        <thead>
          <tr class="border-b-2 border-slate-300 text-[#475569] font-bold">
            <th class="py-2 text-left">Hạng mục thanh toán</th>
            <th class="py-2 text-center">SL</th>
            <th class="py-2 text-right">Đơn giá</th>
            <th class="py-2 text-right">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b border-slate-100">
            <td class="py-2 font-semibold">Tiền thuê sân (${escapeSearchHTML(b.pitchName)} · ${escapeSearchHTML(b.slotTime)})</td>
            <td class="py-2 text-center">${b.weeksCount || 1}</td>
            <td class="py-2 text-right">${window.SanBongApp.formatVND(Math.round(pitchPrice / (b.weeksCount || 1)))}</td>
            <td class="py-2 text-right font-bold">${window.SanBongApp.formatVND(pitchPrice)}</td>
          </tr>
          ${overtimeRow}
          ${serviceRows}
        </tbody>
      </table>

      <div class="space-y-1.5 pt-2 border-t-2 border-slate-300 text-xs">
        ${discount > 0 ? `
          <div class="flex justify-between text-emerald-700">
            <span>Ưu đãi Voucher / Giảm giá tháng ${b.voucherCode ? '(' + escapeSearchHTML(b.voucherCode) + ')' : ''}:</span>
            <b>-${window.SanBongApp.formatVND(discount)}</b>
          </div>
        ` : ''}
        <div class="flex justify-between text-sm font-extrabold text-[#0F172A]">
          <span>TỔNG CỘNG HÓA ĐƠN:</span>
          <span>${window.SanBongApp.formatVND(total)}</span>
        </div>
        <div class="flex justify-between text-emerald-700 font-semibold">
          <span>Đã đặt cọc giữ sân (30%):</span>
          <span>-${window.SanBongApp.formatVND(deposit)}</span>
        </div>
        ${(normStatus === 'Hoàn thành' || b.paidRemainingAmount) ? `
          <div class="flex justify-between text-blue-700 font-semibold">
            <span>Đã thu phần còn lại (${escapeSearchHTML(b.remainingPaymentMethod || 'Tiền mặt tại quầy')}):</span>
            <span>-${window.SanBongApp.formatVND(b.paidRemainingAmount || Math.max(0, total - deposit))}</span>
          </div>
        ` : ''}
        <div class="flex justify-between items-baseline pt-2 border-t border-dashed border-slate-300 text-sm font-extrabold ${remaining > 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'}">
          <span>SỐ TIỀN CÒN PHẢI THU:</span>
          <span class="text-base">${window.SanBongApp.formatVND(remaining)}</span>
        </div>
      </div>

      <div class="pt-3 border-t border-slate-200 text-center text-[11px] text-[#64748B]">
        Cảm ơn quý khách đã tin tưởng lựa chọn <b>Sân Bóng Pro</b>! Chúc đội bóng thi đấu thăng hoa.
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeInvoiceModal() {
  const modal = document.getElementById('invoice-print-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  refreshAllAdminViews(activeInPlayCode);
}

function printInvoiceNow() {
  const area = document.getElementById('printable-invoice-area');
  if (!area) return;
  closeInvoiceModal();
  const printWin = window.open('', '_blank', 'width=720,height=800');
  if (!printWin) {
    window.print();
    return;
  }
  printWin.document.write(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>Hóa Đơn #${activeInvoiceCode || 'SANBONGPRO'}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style>
    </head>
    <body class="p-6 bg-white">
      ${area.innerHTML}
      <script>
        window.onload = function() {
          setTimeout(function() { window.print(); window.close(); }, 350);
        };
      <\/script>
    </body>
    </html>
  `);
  printWin.document.close();
}

window.openInvoicePrintModal = openInvoicePrintModal;
window.openInvoiceModal = openInvoicePrintModal;
window.closeInvoiceModal = closeInvoiceModal;
window.printInvoiceNow = printInvoiceNow;

