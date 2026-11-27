// Quét QR Code Check-in nhận sân (QR Scanner Modal)
let qrHiddenCanvas = null;
let qrCameraStream = null;
let qrScanTimer = null;
let activeQRBookingCode = '';

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

  const liveAll = typeof window.getLiveBookingsList === 'function' ? window.getLiveBookingsList() : [];
  if (quickList) {
    const candidates = liveAll.filter(b => b.status === 'Đã xác nhận' || b.status === 'Chờ duyệt cọc' || b.status === 'Đang đá' || b.status === 'Khách chưa đến').slice(0, 8);
    quickList.innerHTML = candidates.length > 0 ? candidates.map(b => {
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
    }).join('') : '<span class="text-[11px] text-slate-400">Chưa có ca đá nào trong ngày.</span>';
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

async function lookupQRTicket(codeOpt) {
  const input = document.getElementById('qr-code-input');
  const resultBox = document.getElementById('qr-ticket-result');
  const checkinBtn = document.getElementById('qr-confirm-checkin-btn');
  if (!resultBox) return;

  let raw = (codeOpt || input?.value || '').trim();
  const match = raw.match(/(ASF[FSE]?[0-9]{6,8}|DH[0-9]{6,8}|BK-[0-9]{6}-[0-9]{3,})/i);
  const rawCode = match ? match[1].toUpperCase() : raw.toUpperCase();

  if (input && rawCode) input.value = rawCode;

  if (!rawCode) {
    if (window.SanBongApp?.showToast) window.SanBongApp.showToast('Vui lòng nhập hoặc chọn một mã vé QR để tra cứu.', 'warning');
    return;
  }

  let booking = typeof window.findInPlayBookingSync === 'function' ? window.findInPlayBookingSync(rawCode) : null;
  if (!booking && typeof adminFetchJson === 'function') {
    const r = await adminFetchJson(`../api/bookings.php?code=${encodeURIComponent(rawCode)}`);
    if (r?.ok && r.data && r.data.code) {
      booking = r.data;
      if (typeof window.syncLiveBookingsCache === 'function') window.syncLiveBookingsCache([booking]);
    }
  }

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

  const stLower = String(booking.status || '').trim().toLowerCase();
  const isAlreadyScanned = (booking.status === 'Đang đá' || booking.status === 'Hoàn thành' || stLower === 'completed');

  if (booking.status === 'Đã xác nhận') {
    statusBadgeHtml = '<span class="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-xs">🟢 HỢP LỆ — SẴN SÀNG NHẬN SÂN</span>';
    canCheckin = true;
  } else if (isAlreadyScanned) {
    statusBadgeHtml = '<span class="px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 font-extrabold text-xs">⛔ MÃ QR ĐÃ SỬ DỤNG (CHỈ QUÉT 1 LẦN)</span>';
    canCheckin = false;
    if (window.SanBongApp?.playScanBeep) window.SanBongApp.playScanBeep(false);
    if (window.SanBongApp?.showToast) {
      window.SanBongApp.showToast(`Mã QR #${booking.code} đã được quét check-in trước đó! Mỗi mã QR chỉ có hiệu lực 1 lần.`, 'error', 4000);
    }
  } else if (booking.status === 'Chờ duyệt cọc') {
    statusBadgeHtml = '<span class="px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-extrabold text-xs">🟡 CHỜ DUYỆT CỌC (Chưa xác nhận cọc)</span>';
    canCheckin = true;
  } else {
    statusBadgeHtml = `<span class="px-3 py-1 rounded-full bg-red-100 text-red-800 border border-red-300 font-extrabold text-xs">🔴 ${escapeSearchHTML(booking.status)}</span>`;
    canCheckin = false;
  }

  let srvListText = 'Không có dịch vụ thêm';
  if (booking.services && booking.services.length > 0) {
    srvListText = booking.services.map(s => `${escapeSearchHTML(s.name)} × ${Number(s.quantity || 1)}`).join(', ');
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
      <div>📅 Ngày thi đấu: <b class="text-[#0F172A]">${escapeSearchHTML(window.SanBongApp.formatDateVN(booking.date))}</b></div>
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
    } else if (isAlreadyScanned) {
      checkinBtn.disabled = true;
      checkinBtn.className = 'btn-sm bg-rose-100 text-rose-700 border border-rose-300 font-bold cursor-not-allowed opacity-80';
      checkinBtn.innerHTML = '⛔ Mã QR đã quét — Không thể quét lại';
      checkinBtn.onclick = null;
    } else {
      checkinBtn.disabled = true;
      checkinBtn.className = 'btn-sm bg-slate-200 text-slate-400 cursor-not-allowed';
      checkinBtn.innerHTML = 'Không thể check-in';
      checkinBtn.onclick = null;
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
  const b = typeof window.findInPlayBookingSync === 'function' ? window.findInPlayBookingSync(finalCode) : null;
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

  if (window.SanBongApp?.playScanBeep) window.SanBongApp.playScanBeep(true);

  closeQRScannerModal();
  if (typeof refreshAllAdminViews === 'function') {
    refreshAllAdminViews(finalCode);
  } else {
    renderTimelineGantt(true);
    renderOverviewKPIs(true);
  }

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
