// Quản lý và In hóa đơn thanh toán dịch vụ sân bóng
let activeInvoiceCode = '';

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
      <td class="py-2">Phụ thu đá thêm giờ (+${Number(b.overtimeMinutes || 0) || 30} phút)</td>
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
          <div class="font-mono font-extrabold text-sm text-[#0F172A] mt-0.5">#${escapeHTML(b.code)}</div>
          <div class="text-[11px] font-bold text-slate-600">${escapeSearchHTML(displayPayStatus)}</div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div>Khách hàng: <b class="text-[#0F172A]">${escapeSearchHTML(b.customerName)}</b></div>
        <div>Số điện thoại: <b class="font-mono text-[#0F172A]">${escapeSearchHTML(b.phone)}</b></div>
        <div>Sân thi đấu: <b class="text-[#16A34A]">${escapeSearchHTML(b.pitchName)}</b></div>
        <div>Khung giờ: <b class="text-[#0F172A]">${escapeSearchHTML(b.slotTime)} (${window.SanBongApp.formatDateVN(b.date)})</b></div>
        ${Number(b.weeksCount || 0) > 1 ? `<div class="col-span-2 text-purple-700 font-bold">📅 Hợp đồng đặt sân cố định theo tháng: ${Number(b.weeksCount || 0)} tuần liên tiếp</div>` : ''}
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
            <td class="py-2 text-center">${Number(b.weeksCount || 0) || 1}</td>
            <td class="py-2 text-right">${window.SanBongApp.formatVND(Math.round(pitchPrice / (Number(b.weeksCount || 0) || 1)))}</td>
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
  if (typeof refreshAllAdminViews === 'function') {
    refreshAllAdminViews(window.activeInPlayCode || activeInvoiceCode);
  }
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
      <title>Hóa Đơn #${escapeHTML(activeInvoiceCode || 'SANBONGPRO')}</title>
      <link rel="stylesheet" href="../css/tailwind.generated.css?v=20261122_v128">
      <link rel="stylesheet" href="../css/style.css?v=20261122_v128">
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
