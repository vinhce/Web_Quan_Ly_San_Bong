const fs = require('fs');
const path = require('path');

const targetFiles = [
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

const pageScripts = {
  'index.html': '/js/index.js?v=20261109_v11',
  'html/booking.html': '/js/booking.js?v=20261109_v11',
  'html/checkout.html': '/js/checkout.js?v=20261109_v11',
  'html/field-detail.html': '/js/field-detail.js?v=20261109_v11',
  'html/fields.html': '/js/fields.js?v=20261109_v11',
  'html/history.html': '/js/history.js?v=20261109_v11',
  'html/login.html': '/js/login.js?v=20261109_v11',
  'html/success.html': '/js/success.js?v=20261109_v11',
  'portal-admin/index.php': '/js/admin.js?v=20261109_v11',
  'portal-admin/index.html': '/js/admin.js?v=20261109_v11'
};

for (const relPath of targetFiles) {
  if (!fs.existsSync(relPath)) continue;
  let content = fs.readFileSync(relPath, 'utf8');

  // 1. Root-absolute Favicons
  content = content.replace(
    /<link rel="icon"[^>]*>[\s\S]*?<link rel="alternate icon"[^>]*>[\s\S]*?<link rel="apple-touch-icon"[^>]*>/i,
    `<!-- Favicon / Tab Icon -->\n  <link rel="icon" type="image/svg+xml" href="/favicon.svg">\n  <link rel="alternate icon" type="image/x-icon" href="/favicon.ico">\n  <link rel="apple-touch-icon" href="/favicon.svg">`
  );

  // 2. Streamline 4 Script Tags
  const pageScript = pageScripts[relPath];
  const newScriptsBlock = `<!-- SCRIPTS -->\n  <script src="/js/data.js?v=20261109_v11"></script>\n  <script src="/js/app.js?v=20261109_v11"></script>\n  <script src="/js/api.js?v=20261109_v11"></script>\n  <script src="${pageScript}"></script>`;

  // Match existing script tags at the bottom
  const scriptRegex = /<!-- SCRIPTS -->[\s\S]*?<\/body>/i;
  if (scriptRegex.test(content)) {
    content = content.replace(scriptRegex, `${newScriptsBlock}\n</body>`);
  } else {
    // If not having <!-- SCRIPTS --> comment, match consecutive script tags before </body>
    const fallbackRegex = /(?:<script src="[^"]*js\/[^"]*"><\/script>\s*)+<\/body>/i;
    if (fallbackRegex.test(content)) {
      content = content.replace(fallbackRegex, `${newScriptsBlock}\n</body>`);
    }
  }

  fs.writeFileSync(relPath, content, 'utf8');
  console.log('Updated:', relPath);
}
console.log('All files updated successfully!');
