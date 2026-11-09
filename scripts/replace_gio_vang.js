const fs = require('fs');

const replacements = [
  {
    file: 'portal-admin/partials/tab5_pricing.php',
    from: 'Giờ vàng tối (17:30 - 21:00)',
    to: 'Giờ cao điểm (17:30 - 21:00)'
  },
  {
    file: 'portal-admin/partials/tab1_kpi.php',
    from: 'Giờ vàng tối 17:30 - 21:00',
    to: 'Giờ cao điểm 17:30 - 21:00'
  },
  {
    file: 'portal-admin/index.html',
    from: 'Giờ vàng tối 17:30 - 21:00',
    to: 'Giờ cao điểm 17:30 - 21:00'
  },
  {
    file: 'portal-admin/index.html',
    from: 'Giờ vàng tối (17:30 - 21:00)',
    to: 'Giờ cao điểm (17:30 - 21:00)'
  },
  {
    file: 'index.html',
    from: 'Giờ vàng tối (17:30 - 21:00)',
    to: 'Giờ cao điểm (17:30 - 21:00)'
  },
  {
    file: 'index.html',
    from: 'Giờ vàng (17:30 - 21:00)',
    to: 'Giờ cao điểm (17:30 - 21:00)'
  },
  {
    file: 'index.html',
    from: 'áp dụng mức giá giờ vàng từ 15:00',
    to: 'áp dụng mức giá giờ cao điểm từ 15:00'
  },
  {
    file: 'html/booking.html',
    from: 'Khung giờ vàng từ 17:30 đến 21:00 có phụ thu giờ cao điểm',
    to: 'Khung giờ cao điểm từ 17:30 đến 21:00 có phụ thu'
  },
  {
    file: 'html/field-detail.html',
    from: 'Khung giờ vàng (17:30 - 21:00)',
    to: 'Khung giờ cao điểm (17:30 - 21:00)'
  },
  {
    file: 'js/index.js',
    from: 'Giờ vàng (17:30-21:00):',
    to: 'Giờ cao điểm (17:30-21:00):'
  },
  {
    file: 'js/fields.js',
    from: 'Giờ vàng: ${app?.formatVND',
    to: 'Giờ cao điểm: ${app?.formatVND'
  },
  {
    file: 'js/fields.js',
    from: 'Giờ vàng (17:30-21:00):',
    to: 'Giờ cao điểm (17:30-21:00):'
  },
  {
    file: 'js/booking.js',
    from: "${s.isPeak ? 'Giờ vàng' : 'Thường'}",
    to: "${s.isPeak ? 'Cao điểm' : 'Thường'}"
  },
  {
    file: 'js/booking.js',
    from: "${activeSlotObj.isPeak ? 'Giờ vàng' : 'Giờ thường'}",
    to: "${activeSlotObj.isPeak ? 'Giờ cao điểm' : 'Giờ thường'}"
  },
  {
    file: 'js/admin.js',
    from: "${s.isPeak ? '★ Giờ vàng' : ''}",
    to: "${s.isPeak ? '★ Giờ cao điểm' : ''}"
  },
  {
    file: 'js/ui.js',
    from: 'Bảng giá & Khung giờ vàng',
    to: 'Bảng giá & Giờ cao điểm'
  },
  {
    file: 'docs/TAI_KHOAN_ADMIN.md',
    from: 'giờ vàng (`17:30 - 21:00`)',
    to: 'giờ cao điểm (`17:30 - 21:00`)'
  }
];

for (const r of replacements) {
  if (!fs.existsSync(r.file)) {
    console.warn('File not found:', r.file);
    continue;
  }
  let content = fs.readFileSync(r.file, 'utf8');
  if (content.includes(r.from)) {
    content = content.replace(r.from, r.to);
    fs.writeFileSync(r.file, content, 'utf8');
    console.log(`[OK] Replaced in ${r.file}: "${r.from}" -> "${r.to}"`);
  } else {
    console.warn(`[SKIP] Pattern not found in ${r.file}: "${r.from}"`);
  }
}

console.log('Replacement finished!');
