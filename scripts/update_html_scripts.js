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
  'portal-admin/index.html'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  const isSub = file.startsWith('html/') || file.startsWith('portal-admin/');
  const prefix = isSub ? '../js/' : 'js/';

  const oldPattern = new RegExp(
    `(<script\\s+src=["']${isSub ? '\\.\\./' : ''}js/app\\.js(?:\\?v=[^"']*)?["']>\\s*<\\/script>)`
  );

  const replacement = `<script src="${prefix}helpers.js?v=20261109_v10"></script>
  <script src="${prefix}db.js?v=20261109_v10"></script>
  <script src="${prefix}ui.js?v=20261109_v10"></script>
  <script src="${prefix}app.js?v=20261109_v10"></script>`;

  if (oldPattern.test(content)) {
    content = content.replace(oldPattern, replacement);
    // Also bump data.js and api.js if present
    content = content.replace(/js\/data\.js\?v=[^"']+/g, `js/data.js?v=20261109_v10`);
    content = content.replace(/js\/api\.js\?v=[^"']+/g, `js/api.js?v=20261109_v10`);
    content = content.replace(/js\/admin\.js\?v=[^"']+/g, `js/admin.js?v=20261109_v10`);
    content = content.replace(/js\/booking\.js\?v=[^"']+/g, `js/booking.js?v=20261109_v10`);
    content = content.replace(/js\/checkout\.js\?v=[^"']+/g, `js/checkout.js?v=20261109_v10`);
    content = content.replace(/js\/history\.js\?v=[^"']+/g, `js/history.js?v=20261109_v10`);
    content = content.replace(/js\/login\.js\?v=[^"']+/g, `js/login.js?v=20261109_v10`);
    content = content.replace(/js\/index\.js\?v=[^"']+/g, `js/index.js?v=20261109_v10`);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated script tags in:', file);
  } else {
    console.warn('Pattern not matched in:', file);
  }
});
