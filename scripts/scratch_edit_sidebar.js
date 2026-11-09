const fs = require('fs');
let c = fs.readFileSync('portal-admin/partials/sidebar.php', 'utf8');
const target = `        <button onclick="openInPlayModal()" id="nav-inplay-control" class="w-full h-10 px-3 rounded-lg flex items-center gap-3 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
          <span>Điều hành ca đá & Thanh toán</span>
        </button>
`;
if (c.includes(target)) {
  c = c.replace(target, '');
  fs.writeFileSync('portal-admin/partials/sidebar.php', c, 'utf8');
  console.log('Successfully removed from sidebar.php (exact match)');
} else {
  // Try with \r\n or regex
  const regex = /[\r\n]+[ \t]*<button onclick="openInPlayModal\(\)" id="nav-inplay-control"[\s\S]*?<\/button>/;
  if (regex.test(c)) {
    c = c.replace(regex, '');
    fs.writeFileSync('portal-admin/partials/sidebar.php', c, 'utf8');
    console.log('Successfully removed from sidebar.php (regex match)');
  } else {
    console.log('Could not find target in sidebar.php');
  }
}
