const fs = require('fs');
const path = require('path');

console.log('=== TEST KIỂM THỬ BẢO MẬT HẠNG MỤC 1: scripts/one_shot_deploy.js ===');

const deployScriptPath = path.join(__dirname, '../scripts/one_shot_deploy.js');
if (!fs.existsSync(deployScriptPath)) {
  console.error('FAIL: scripts/one_shot_deploy.js không tồn tại');
  process.exit(1);
}

const content = fs.readFileSync(deployScriptPath, 'utf8');
const { isSafeFile } = require(deployScriptPath);
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

// 4. Kiểm tra việc ghi secret ra log (console.log, console.error, process.stdout.write)
const logSecretRegex = /(?:console\.(?:log|error|warn|info)|process\.(?:stdout|stderr)\.write)\s*\([^)]*(?:token|password|MCP_TOKEN)/i;
if (logSecretRegex.test(content)) {
  errors.push('LỖI: scripts/one_shot_deploy.js in thông tin nhạy cảm (token/password) ra console log/error hoặc stdout/stderr.');
}

// 5. Quét nội dung scripts/one_shot_deploy.js đảm bảo không chứa các hàm nguy hiểm: eval(, exec(, system(, passthru(, shell_exec(
const dangerousFunctions = ['eval(', 'exec(', 'system(', 'passthru(', 'shell_exec('];
for (const fn of dangerousFunctions) {
  if (content.includes(fn)) {
    errors.push(`LỖI: scripts/one_shot_deploy.js chứa hàm nguy hiểm: "${fn}"`);
  }
}

// 6. Kiểm tra hàm isSafeFile chặn Directory Traversal
const traversalSamples = ['../api/test.php', '..\\api\\test.php', 'api/../../secret.txt', '../index.html'];
for (const sample of traversalSamples) {
  if (isSafeFile(sample) !== false) {
    errors.push(`LỖI: isSafeFile không chặn directory traversal: "${sample}" (kỳ vọng: false, nhận: ${isSafeFile(sample)})`);
  }
}

// 7. Kiểm tra hàm isSafeFile chặn file PHP ở root webroot ('shell.php', 'apply_deploy.php' -> false)
const rootPhpSamples = ['shell.php', 'apply_deploy.php', './shell.php', 'test.php'];
for (const sample of rootPhpSamples) {
  if (isSafeFile(sample) !== false) {
    errors.push(`LỖI: isSafeFile không chặn file PHP ở root webroot: "${sample}" (kỳ vọng: false, nhận: ${isSafeFile(sample)})`);
  }
}

// 8. Kiểm tra hàm isSafeFile chặn các file cấm bổ sung (FORBIDDEN_FILENAMES)
const forbiddenSamples = ['tests', 'test_deploy_security.js', 'package.json', 'package-lock.json', 'composer.json', 'composer.lock', '.env'];
for (const sample of forbiddenSamples) {
  if (isSafeFile(sample) !== false) {
    errors.push(`LỖI: isSafeFile không chặn file thuộc danh sách cấm: "${sample}" (kỳ vọng: false, nhận: ${isSafeFile(sample)})`);
  }
}

// 9. Kiểm tra hàm isSafeFile vẫn cho phép các file hợp lệ bình thường
const validSamples = ['api/test.php', 'index.html', '.htaccess', 'css/style.css', 'js/app.js'];
for (const sample of validSamples) {
  if (isSafeFile(sample) !== true) {
    errors.push(`LỖI: isSafeFile chặn nhầm file hợp lệ: "${sample}" (kỳ vọng: true, nhận: ${isSafeFile(sample)})`);
  }
}

if (errors.length > 0) {
  console.log('KẾT QUẢ: PHÁT HIỆN LỖI TỒN TẠI (' + errors.length + ' lỗi):');
  errors.forEach((err, idx) => console.log(`  ${idx + 1}. ${err}`));
  process.exit(1);
} else {
  console.log('KẾT QUẢ: PASS - Đạt tất cả tiêu chuẩn bảo mật cho scripts/one_shot_deploy.js!');
  process.exit(0);
}
