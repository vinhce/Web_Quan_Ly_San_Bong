const fs = require('fs');
const path = require('path');

const phpFile = 'portal-admin/index.php';
const content = fs.readFileSync(phpFile, 'utf8');
const lines = content.split('\n');

const partialsDir = 'portal-admin/partials';
if (!fs.existsSync(partialsDir)) {
  fs.mkdirSync(partialsDir, { recursive: true });
}

// Markers
const asideStartIdx = lines.findIndex(l => l.includes('<aside '));
const asideEndIdx = lines.findIndex((l, i) => i > asideStartIdx && l.includes('</aside>'));

const headerStartIdx = lines.findIndex(l => l.includes('<header '));
const headerEndIdx = lines.findIndex((l, i) => i > headerStartIdx && l.includes('</header>'));

const tab1StartIdx = lines.findIndex(l => l.includes('<!-- TAB 1:'));
const tab2StartIdx = lines.findIndex(l => l.includes('<!-- TAB 2:'));
const tab3StartIdx = lines.findIndex(l => l.includes('<!-- TAB 3:'));
const tab4StartIdx = lines.findIndex(l => l.includes('<!-- TAB 4:'));
const tab5StartIdx = lines.findIndex(l => l.includes('<!-- TAB 5:'));
const tab6StartIdx = lines.findIndex(l => l.includes('<!-- TAB 6:'));
const tab7StartIdx = lines.findIndex(l => l.includes('<!-- TAB 7:'));
const tab8StartIdx = lines.findIndex(l => l.includes('<!-- TAB 8:'));
const tab9StartIdx = lines.findIndex(l => l.includes('<!-- TAB 9:'));
const mainEndIdx = lines.findIndex((l, i) => i > tab9StartIdx && l.includes('</main>'));

console.log({
  asideStartIdx,
  asideEndIdx,
  headerStartIdx,
  headerEndIdx,
  tab1StartIdx,
  tab2StartIdx,
  tab3StartIdx,
  tab4StartIdx,
  tab5StartIdx,
  tab6StartIdx,
  tab7StartIdx,
  tab8StartIdx,
  tab9StartIdx,
  mainEndIdx
});

// Extract sections
const headHTML = lines.slice(0, asideStartIdx).join('\n');
const sidebarHTML = lines.slice(asideStartIdx, asideEndIdx + 1).join('\n');
const mainWrapperStart = lines.slice(asideEndIdx + 1, headerStartIdx).join('\n');
const headerHTML = lines.slice(headerStartIdx, headerEndIdx + 1).join('\n');
const mainStart = lines.slice(headerEndIdx + 1, tab1StartIdx).join('\n');

const tab1HTML = lines.slice(tab1StartIdx, tab2StartIdx).join('\n');
const tab2HTML = lines.slice(tab2StartIdx, tab3StartIdx).join('\n');
const tab3HTML = lines.slice(tab3StartIdx, tab4StartIdx).join('\n');
const tab4HTML = lines.slice(tab4StartIdx, tab5StartIdx).join('\n');
const tab5HTML = lines.slice(tab5StartIdx, tab6StartIdx).join('\n');
const tab6HTML = lines.slice(tab6StartIdx, tab7StartIdx).join('\n');
const tab7HTML = lines.slice(tab7StartIdx, tab8StartIdx).join('\n');
const tab8HTML = lines.slice(tab8StartIdx, tab9StartIdx).join('\n');
const tab9HTML = lines.slice(tab9StartIdx, mainEndIdx).join('\n');

const footHTML = lines.slice(mainEndIdx).join('\n');

// Write partial files
fs.writeFileSync(path.join(partialsDir, 'sidebar.php'), sidebarHTML, 'utf8');
fs.writeFileSync(path.join(partialsDir, 'header.php'), headerHTML, 'utf8');
fs.writeFileSync(path.join(partialsDir, 'tab1_kpi.php'), tab1HTML, 'utf8');
fs.writeFileSync(path.join(partialsDir, 'tab2_timeline.php'), tab2HTML, 'utf8');
fs.writeFileSync(path.join(partialsDir, 'tab3_quick_booking.php'), tab3HTML, 'utf8');
fs.writeFileSync(path.join(partialsDir, 'tab4_pitches.php'), tab4HTML, 'utf8');
fs.writeFileSync(path.join(partialsDir, 'tab5_pricing.php'), tab5HTML, 'utf8');
fs.writeFileSync(path.join(partialsDir, 'tab6_customers.php'), tab6HTML, 'utf8');
fs.writeFileSync(path.join(partialsDir, 'tab7_deposits.php'), tab7HTML, 'utf8');
fs.writeFileSync(path.join(partialsDir, 'tab8_reports.php'), tab8HTML, 'utf8');
fs.writeFileSync(path.join(partialsDir, 'tab9_settings.php'), tab9HTML, 'utf8');

// Construct lean index.php
const leanContent = `${headHTML}
  <!-- 1. LEFT ADMIN SIDEBAR -->
  <?php include __DIR__ . '/partials/sidebar.php'; ?>

${mainWrapperStart}
    <!-- 2. TOPBAR HEADER -->
    <?php include __DIR__ . '/partials/header.php'; ?>

${mainStart}
      <!-- 3. DYNAMIC 9 TAB MODULES -->
      <?php
        include __DIR__ . '/partials/tab1_kpi.php';
        include __DIR__ . '/partials/tab2_timeline.php';
        include __DIR__ . '/partials/tab3_quick_booking.php';
        include __DIR__ . '/partials/tab4_pitches.php';
        include __DIR__ . '/partials/tab5_pricing.php';
        include __DIR__ . '/partials/tab6_customers.php';
        include __DIR__ . '/partials/tab7_deposits.php';
        include __DIR__ . '/partials/tab8_reports.php';
        include __DIR__ . '/partials/tab9_settings.php';
      ?>
${footHTML}
`;

const updatedLeanContent = leanContent
  .replace(
    /<script\s+src=["']\.\.\/js\/app\.js(?:\?v=[^"']*)?["']>\s*<\/script>/,
    `<script src="../js/helpers.js?v=20261109_v10"></script>
  <script src="../js/db.js?v=20261109_v10"></script>
  <script src="../js/ui.js?v=20261109_v10"></script>
  <script src="../js/app.js?v=20261109_v10"></script>`
  )
  .replace(/js\/data\.js\?v=[^"']+/g, `js/data.js?v=20261109_v10`)
  .replace(/js\/api\.js\?v=[^"']+/g, `js/api.js?v=20261109_v10`)
  .replace(/js\/admin\.js\?v=[^"']+/g, `js/admin.js?v=20261109_v10`);

fs.writeFileSync(phpFile, updatedLeanContent, 'utf8');

console.log('Successfully written lean portal-admin/index.php (' + fs.statSync(phpFile).size + ' bytes)!');
