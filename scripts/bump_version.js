const fs = require('fs');

const files = [
  'index.html',
  'html/booking.html',
  'html/checkout.html',
  'html/field-detail.html',
  'html/fields.html',
  'html/history.html',
  'html/login.html',
  'html/success.html',
  'portal-admin/index.php',
  'portal-admin/index.html'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/\?v=20261109_v\d+/g, '?v=20261109_v26');
  fs.writeFileSync(file, c, 'utf8');
  console.log('Bumped version in:', file);
}
console.log('Done bumping to v26!');
