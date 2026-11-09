const fs = require('fs');

// 1. Update html/success.html
{
  let content = fs.readFileSync('html/success.html', 'utf8');
  const target = '<div class="text-[11px] font-bold text-[#475569] mt-2 uppercase tracking-wider">Mã QR Check-in</div>';
  if (!content.includes('Tải vé QR về máy') && content.includes(target)) {
    const replacement = target + '\r\n          <button type="button" onclick="window.SanBongApp.downloadTicketQR && window.SanBongApp.downloadTicketQR(document.getElementById(\'ticket-booking-code\')?.textContent)" class="mt-2 text-[11px] font-bold text-[#16A34A] hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer">\r\n            <span>💾</span> Tải vé QR về máy\r\n          </button>';
    content = content.replace(target, replacement);
    fs.writeFileSync('html/success.html', content, 'utf8');
    console.log('1. Updated html/success.html');
  }
}

// 2. Update html/history.html
{
  let content = fs.readFileSync('html/history.html', 'utf8');
  if (!content.includes('Tải vé QR về máy')) {
    const target = '<button onclick="closeTicketModal()" class="btn-base btn-secondary w-full text-xs font-bold">\r\n        Đóng cửa sổ\r\n      </button>';
    const targetLF = '<button onclick="closeTicketModal()" class="btn-base btn-secondary w-full text-xs font-bold">\n        Đóng cửa sổ\n      </button>';
    const replacement = '<div class="flex gap-2">\r\n        <button type="button" onclick="window.SanBongApp.downloadTicketQR && window.SanBongApp.downloadTicketQR(document.getElementById(\'modal-code\')?.textContent)" class="btn-base btn-primary flex-1 text-xs font-bold flex items-center justify-center gap-1.5">\r\n          <span>💾</span> Tải vé QR về máy\r\n        </button>\r\n        <button type="button" onclick="closeTicketModal()" class="btn-base btn-secondary flex-1 text-xs font-bold">\r\n          Đóng cửa sổ\r\n        </button>\r\n      </div>';
    if (content.includes(target)) {
      content = content.replace(target, replacement);
      fs.writeFileSync('html/history.html', content, 'utf8');
      console.log('2. Updated html/history.html (CRLF)');
    } else if (content.includes(targetLF)) {
      content = content.replace(targetLF, replacement);
      fs.writeFileSync('html/history.html', content, 'utf8');
      console.log('2. Updated html/history.html (LF)');
    }
  }
}

// 3. Update js/history.js
{
  let content = fs.readFileSync('js/history.js', 'utf8');
  const oldCall = "qrMount.innerHTML = `<img src=\"${qrApiUrl}\" alt=\"QR ${b.code}\" class=\"w-36 h-36 object-contain rounded-lg\" onerror=\"this.outerHTML=window.SanBongApp.renderQRCodeSVG(140)\">`;";
  const newCall = "qrMount.innerHTML = window.SanBongApp.renderQRCodeSVG(b.code, 150);";
  if (content.includes(oldCall)) {
    content = content.replace(oldCall, newCall);
    fs.writeFileSync('js/history.js', content, 'utf8');
    console.log('3. Updated js/history.js');
  }
}

console.log('Done updating client ticket QR files!');
