/**
 * ONE-SHOT DEPLOYER SCRIPT (AN TOÀN CHO HOSTING)
 *
 * CHÍNH SÁCH BẢO MẬT BẮT BUỘC:
 * 1. TUYỆT ĐỐI CẤM TẠO EXECUTOR PHP TRONG WEBROOT, CẤM THAO TÁC DB/ĐỔI PASS, CẤM LOG SECRET.
 * 2. CẤM THAO TÁC DB/ĐỔI PASS: Không cho phép script can thiệp vào tài khoản hoặc đổi mật khẩu cơ sở dữ liệu.
 * 3. CẤM LOG SECRET: Tuyệt đối không in token, password hoặc credential ra console, stdout, stderr.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

function loadEnvToken() {
  if (process.env.ONEPANEL_MCP_TOKEN) return process.env.ONEPANEL_MCP_TOKEN;
  if (process.env.MCP_TOKEN) return process.env.MCP_TOKEN;
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*(ONEPANEL_MCP_TOKEN|MCP_TOKEN)\s*=\s*(.*)$/);
      if (match) {
        return match[2].trim().replace(/^['"]|['"]$/g, '');
      }
    }
  }
  return null;
}

const MCP_URL = process.env.ONEPANEL_MCP_URL || 'https://onehost-wphn022606.000nethost.com:2023/api/mcp';
const MCP_TOKEN = loadEnvToken();

function validateAuth() {
  if (!MCP_TOKEN) {
    console.error('[SECURITY ERROR] Thieu thong tin xac thuc MCP trong moi truong (env hoac .env).');
    console.error('Huong dan: Vui long cau hinh khoa xac thuc MCP truoc khi chay.');
    process.exit(1);
  }
}

let mcpSessionId = null;

function rawPost(headers, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const url = new URL(MCP_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: Object.assign({
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${MCP_TOKEN}`,
        'Content-Length': Buffer.byteLength(payload)
      }, headers),
      rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ headers: res.headers, status: res.statusCode, data });
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function ensureSession() {
  if (mcpSessionId) return mcpSessionId;
  const initRes = await rawPost({}, {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'one-shot-deployer-secure', version: '2.0.0' }
    }
  });

  mcpSessionId = initRes.headers['mcp-session-id'];
  if (!mcpSessionId) {
    throw new Error('Failed to get mcp-session-id: ' + initRes.data);
  }

  await rawPost({ 'mcp-session-id': mcpSessionId }, {
    jsonrpc: '2.0',
    method: 'notifications/initialized'
  });

  return mcpSessionId;
}

async function callMCP(toolName, args) {
  const sessionId = await ensureSession();
  const res = await rawPost({ 'mcp-session-id': sessionId }, {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args
    }
  });

  if (res.status !== 200) {
    return { error: 'HTTP ' + res.status + ': ' + res.data };
  }

  try {
    const lines = res.data.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        return JSON.parse(line.substring(6));
      }
    }
    return JSON.parse(res.data);
  } catch (e) {
    return { raw: res.data };
  }
}

// Allowlist cac dinh dang file hop le va an toan cho web application
const ALLOWED_EXTENSIONS = new Set([
  '.html', '.css', '.js', '.php', '.sql', '.htaccess', '.json', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.txt'
]);

const FORBIDDEN_FILENAMES = new Set([
  '.env',
  '.env.example',
  'test_debug.php',
  'test_pitches.php',
  'test_e2e_sanbong.py',
  'tests',
  'test_deploy_security.js',
  'package.json',
  'package-lock.json',
  'composer.json',
  'composer.lock'
]);

function isSafeFile(relPath) {
  const norm = relPath.replace(/\\/g, '/').replace(/^\.\//, '');

  // 1. Chống Directory Traversal
  if (norm.includes('..')) return false;

  const base = path.basename(norm).toLowerCase();
  const ext = path.extname(norm).toLowerCase();

  // 2. Chặn các file/thư mục thuộc blacklist nhạy cảm và kiểm thử
  if (FORBIDDEN_FILENAMES.has(base)) return false;
  if (norm.startsWith('.') && base !== '.htaccess') return false;
  if (norm.includes('node_modules') || norm.includes('.git') || norm.includes('backups') || norm.startsWith('tests/') || norm === 'tests') return false;

  // 3. TUYỆT ĐỐI CẤM TẠO EXECUTOR PHP TRONG WEBROOT, CẤM THAO TÁC DB/ĐỔI PASS, CẤM LOG SECRET
  // Ngăn chặn tạo hoặc ghi file PHP trực tiếp trong gốc webroot public_html
  if (!norm.includes('/') && ext === '.php') {
    return false;
  }

  if (base === '.htaccess') return true;
  if (!ALLOWED_EXTENSIONS.has(ext)) return false;

  return true;
}

function collectFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const full = path.join(dir, item).replace(/\\/g, '/');
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results.push(...collectFiles(full));
    } else if (stat.isFile()) {
      results.push(full);
    }
  }
  return results;
}

async function main() {
  validateAuth();

  const candidateFiles = [
    'index.html',
    '.htaccess',
    'favicon.svg',
    'favicon.ico',
    'robots.txt',
    'config/database.php',
    'database/schema.sql',
    ...collectFiles('portal-admin'),
    ...collectFiles('api'),
    ...collectFiles('js'),
    ...collectFiles('css'),
    ...collectFiles('html'),
    ...collectFiles('cron'),
    ...collectFiles('data'),
    ...collectFiles('database/migrations')
  ];

  const uniqueFiles = Array.from(new Set(candidateFiles))
    .filter(f => fs.existsSync(f) && isSafeFile(f));

  console.log('Bat dau deploy ' + uniqueFiles.length + ' files an toan len hosting qua MCP...');

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < uniqueFiles.length; i++) {
    const file = uniqueFiles[i];
    const norm = file.replace(/\\/g, '/').replace(/^\.\//, '');
    const remotePath = 'public_html/' + norm;
    const content = fs.readFileSync(file, 'utf8');

    process.stdout.write(`[${i + 1}/${uniqueFiles.length}] Ghi ${norm} -> ${remotePath}... `);
    const res = await callMCP('write_file', {
      path: remotePath,
      content: content
    });

    if (res && res.error) {
      console.log('FAIL: ' + JSON.stringify(res.error));
      failCount++;
    } else {
      console.log('OK');
      successCount++;
    }
  }

  console.log(`Hoan tat deploy: ${successCount} thanh cong, ${failCount} that bai.`);
  if (failCount > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Loi trong qua trinh deploy:', err);
    process.exit(1);
  });
}

module.exports = {
  isSafeFile,
  ALLOWED_EXTENSIONS,
  FORBIDDEN_FILENAMES
};
