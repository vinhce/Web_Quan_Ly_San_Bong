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

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  const isSub = file.startsWith('html/') || file.startsWith('portal-admin/');
  const prefix = isSub ? '../' : '';

  const iconTags = `  <!-- Favicon / Tab Icon -->
  <link rel="icon" type="image/svg+xml" href="${prefix}favicon.svg">
  <link rel="alternate icon" type="image/x-icon" href="${prefix}favicon.ico">
  <link rel="apple-touch-icon" href="${prefix}favicon.svg">`;

  // Remove old favicon tags if any
  content = content.replace(/\s*<!--\s*Favicon[^-]*-->\s*<link rel="icon"[^>]*>\s*<link rel="alternate icon"[^>]*>\s*<link rel="apple-touch-icon"[^>]*>/g, '');
  content = content.replace(/\s*<link rel="icon"[^>]*>/g, '');
  content = content.replace(/\s*<link rel="alternate icon"[^>]*>/g, '');
  content = content.replace(/\s*<link rel="apple-touch-icon"[^>]*>/g, '');

  // Insert after </title>
  if (content.includes('</title>')) {
    content = content.replace('</title>', '</title>\n' + iconTags);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Added favicons to:', file);
  } else {
    console.warn('No </title> tag in:', file);
  }
});
