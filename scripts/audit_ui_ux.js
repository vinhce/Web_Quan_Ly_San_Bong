const fs = require('fs');
const path = require('path');

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const idRegex = /\bid=["']([^"']+)["']/g;
  const ids = [];
  let m;
  while ((m = idRegex.exec(content)) !== null) {
    ids.push(m[1]);
  }
  return { filePath, ids, content };
}

// 1. Check duplicate IDs across all Admin partials
const adminFiles = [
  'portal-admin/index.php',
  'portal-admin/partials/sidebar.php',
  'portal-admin/partials/header.php',
  'portal-admin/partials/tab1_kpi.php',
  'portal-admin/partials/tab2_timeline.php',
  'portal-admin/partials/tab3_quick_booking.php',
  'portal-admin/partials/tab4_pitches.php',
  'portal-admin/partials/tab5_pricing.php',
  'portal-admin/partials/tab6_customers.php',
  'portal-admin/partials/tab7_deposits.php',
  'portal-admin/partials/tab8_reports.php',
  'portal-admin/partials/tab9_settings.php'
];

const allIds = {};
adminFiles.forEach(f => {
  const { ids } = scanFile(f);
  ids.forEach(id => {
    if (!allIds[id]) allIds[id] = [];
    allIds[id].push(f);
  });
});

console.log('--- CHECK 1: DUPLICATE IDS IN ADMIN ---');
let dupCount = 0;
for (const id in allIds) {
  if (allIds[id].length > 1) {
    console.log('DUPLICATE ID:', id, 'in:', allIds[id]);
    dupCount++;
  }
}
if (dupCount === 0) console.log('PASS: Zero duplicate IDs found across all Admin partials.');

// 2. Check all getElementById calls in js/admin.js vs actual DOM IDs
console.log('\n--- CHECK 2: MISSING DOM IDS REFERENCED IN js/admin.js ---');
const adminJs = fs.readFileSync('js/admin.js', 'utf8');
const gebiRegex = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
const jsReferencedIds = new Set();
let jm;
while ((jm = gebiRegex.exec(adminJs)) !== null) {
  jsReferencedIds.add(jm[1]);
}

const missingIds = [];
jsReferencedIds.forEach(id => {
  if (!allIds[id]) {
    missingIds.push(id);
  }
});

console.log('Referenced IDs in admin.js count:', jsReferencedIds.size);
console.log('IDs not found statically in PHP partials:', missingIds);

// 3. Check tag balance in all PHP and HTML files
console.log('\n--- CHECK 3: TAG BALANCE (DIV, BUTTON, FORM) ---');
const filesToTest = [
  ...adminFiles,
  'index.html',
  'html/fields.html',
  'html/field-detail.html',
  'html/booking.html',
  'html/checkout.html',
  'html/success.html',
  'html/history.html',
  'html/login.html'
];

filesToTest.forEach(f => {
  if (!fs.existsSync(f)) return;
  const content = fs.readFileSync(f, 'utf8');
  ['div', 'button', 'form', 'table'].forEach(tag => {
    const openRegex = new RegExp('<' + tag + '\\b', 'gi');
    const closeRegex = new RegExp('</' + tag + '>', 'gi');
    const opens = (content.match(openRegex) || []).length;
    const closes = (content.match(closeRegex) || []).length;
    if (opens !== closes) {
      console.log(`MISMATCH in ${f} for <${tag}>: ${opens} opens vs ${closes} closes`);
    }
  });
});

console.log('Tag balance check completed.');
