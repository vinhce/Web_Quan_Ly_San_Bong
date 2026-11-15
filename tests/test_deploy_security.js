const fs = require('fs');
const path = require('path');

console.log('=== TEST KIỂM THỬ BẢO MẬT HẠNG MỤC 1: scripts/one_shot_deploy.js ===');

const deployScriptPath = path.join(__dirname, '../scripts/one_shot_deploy.js');
if (!fs.existsSync(deployScriptPath)) {
  console.error('FAIL: scripts/one_shot_deploy.js không tồn tại');
  process.exit(1);
}

const content = fs.readFileSync(deployScriptPath, 'utf8');
let errors = [];

// 1. Kiểm tra hardcode token / secret
if (/MCP_TOKEN\s*=\s*['"`]sp_[a-zA-Z0-9_-]{10,}['"`]/.test(content)) {
  errors.push('LỖI: scripts/one_shot_deploy.js chứa hardcoded MCP_TOKEN bí mật.');
}

// 2. Kiểm tra việc tạo / ghi executor PHP vào webroot (public_html/*.php)
if (/write_file['"`]?\s*,\s*\{\s*path:\s*['"`]public_html\/[a-zA-Z0-9_-]+\.php['"`]/.test(content) ||
    content.includes('apply_deploy.php')) {
  errors.push('LỖI: scripts/one_shot_deploy.js tạo web executor PHP (apply_deploy.php) trong public_html.');
}

// 3. Kiểm tra logic executor đổi mật khẩu DB hoặc chạy SQL tùy ý không xác thực
if (content.includes('UPDATE users SET password_hash') || content.includes('$adminHash') || content.includes('$vxyenHash')) {
  errors.push('LỖI: scripts/one_shot_deploy.js chứa mã nguồn đổi mật khẩu DB tùy ý trong executor.');
}

// 4. Kiểm tra việc ghi secret ra log
if (/console\.log\([^)]*token/i.test(content) || /console\.log\([^)]*password/i.test(content)) {
  errors.push('LỖI: scripts/one_shot_deploy.js in thông tin nhạy cảm (token/password) ra console log.');
}

if (errors.length > 0) {
  console.log('KẾT QUẢ: PHÁT HIỆN LỖI TỒN TẠI (' + errors.length + ' lỗi):');
  errors.forEach((err, idx) => console.log(`  ${idx + 1}. ${err}`));
  process.exit(1);
} else {
  console.log('KẾT QUẢ: PASS - Đạt tất cả tiêu chuẩn bảo mật cho scripts/one_shot_deploy.js!');
  process.exit(0);
}
