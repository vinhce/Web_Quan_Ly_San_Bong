const fs = require('fs');
let code = fs.readFileSync('js/admin.js', 'utf8');

const target = `    if (avEl) {
      const words = cleanName.split(/\\s+/).filter(Boolean);
      let initials = 'AD';
      if (words.length >= 2) {
        initials = (words[words.length - 2][0] + words[words.length - 1][0]).toUpperCase();
      } else if (words.length === 1) {
        initials = words[0].slice(0, 2).toUpperCase();
      }
      avEl.textContent = initials;
    }`;

const replacement = `    if (avEl) {
      if (cleanName.toLowerCase().includes('quản trị') || user.role === 'admin') {
        avEl.textContent = 'QT';
      } else {
        const words = cleanName.split(/\\s+/).filter(Boolean);
        let initials = 'AD';
        if (words.length >= 2) {
          initials = (words[words.length - 2][0] + words[words.length - 1][0]).toUpperCase();
        } else if (words.length === 1) {
          initials = words[0].slice(0, 2).toUpperCase();
        }
        avEl.textContent = initials;
      }
    }`;

code = code.replace(/\r\n/g, '\n');
const normTarget = target.replace(/\r\n/g, '\n');
if (code.includes(normTarget)) {
  code = code.replace(normTarget, replacement);
  fs.writeFileSync('js/admin.js', code, 'utf8');
  console.log('✔ Successfully refined avEl in js/admin.js to QT');
} else {
  console.error('✖ Could not find target in js/admin.js');
}
