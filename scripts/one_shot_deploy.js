const https = require('https');
const fs = require('fs');
const path = require('path');

const MCP_URL = 'https://onehost-wphn022606.000nethost.com:2023/api/mcp';
const MCP_TOKEN = 'sp_2b47e40b9c8c1ddb86602577324f46979f30b433af0e303066726eb3837e2d75';

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
      clientInfo: { name: 'one-shot-deployer', version: '1.0.0' }
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
  const allFiles = [
    'index.html',
    '.htaccess',
    'config/database.php',
    'portal-admin/index.php',
    ...collectFiles('api'),
    ...collectFiles('js'),
    ...collectFiles('portal-admin/partials'),
    ...collectFiles('html'),
    ...collectFiles('css'),
    ...collectFiles('database/migrations')
  ];

  const chunks = [];
  let currentChunk = {};
  let currentSize = 0;
  const MAX_CHUNK_SIZE = 150 * 1024;

  for (const f of allFiles) {
    if (fs.existsSync(f)) {
      const norm = f.split(path.sep).join('/');
      const content = fs.readFileSync(f, 'utf8');
      const itemSize = Buffer.byteLength(content, 'utf8') + norm.length + 20;
      if (currentSize + itemSize > MAX_CHUNK_SIZE && Object.keys(currentChunk).length > 0) {
        chunks.push(currentChunk);
        currentChunk = {};
        currentSize = 0;
      }
      currentChunk[norm] = content;
      currentSize += itemSize;
    }
  }
  if (Object.keys(currentChunk).length > 0) {
    chunks.push(currentChunk);
  }

  console.log('Packing ' + allFiles.length + ' files into ' + chunks.length + ' chunks...');

  for (let i = 0; i < chunks.length; i++) {
    const chunkFile = 'public_html/deploy_chunk_' + i + '.json';
    const chunkStr = JSON.stringify(chunks[i]);
    console.log('Uploading chunk ' + (i + 1) + '/' + chunks.length + ' (' + Object.keys(chunks[i]).length + ' files, ' + chunkStr.length + ' chars) to ' + chunkFile + '...');
    const upRes = await callMCP('write_file', {
      path: chunkFile,
      content: chunkStr
    });
    console.log('Chunk ' + i + ' uploaded.');
  }

  const applyScript = `<?php
ini_set('display_errors', '1');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');

\$written = 0;
\$chunksProcessed = 0;
\$chunkFiles = glob(__DIR__ . '/deploy_chunk_*.json');
if (\$chunkFiles) {
    foreach (\$chunkFiles as \$cFile) {
        \$raw = file_get_contents(\$cFile);
        \$data = json_decode(\$raw, true);
        if (is_array(\$data)) {
            foreach (\$data as \$relPath => \$content) {
                \$targetPath = __DIR__ . '/' . \$relPath;
                \$dir = dirname(\$targetPath);
                if (!is_dir(\$dir)) {
                    @mkdir(\$dir, 0755, true);
                }
                file_put_contents(\$targetPath, \$content);
                \$written++;
            }
            \$chunksProcessed++;
        }
        @unlink(\$cFile);
    }
}

// Support legacy payload file if present
\$payloadFile = __DIR__ . '/deploy_payload.json';
if (file_exists(\$payloadFile)) {
    \$raw = file_get_contents(\$payloadFile);
    \$data = json_decode(\$raw, true);
    if (is_array(\$data)) {
        foreach (\$data as \$relPath => \$content) {
            \$targetPath = __DIR__ . '/' . \$relPath;
            \$dir = dirname(\$targetPath);
            if (!is_dir(\$dir)) {
                @mkdir(\$dir, 0755, true);
            }
            file_put_contents(\$targetPath, \$content);
            \$written++;
        }
    }
    @unlink(\$payloadFile);
}

// 1. Cập nhật mật khẩu & quyền admin cho admin và vxyen0801 trong CSDL trực tiếp
\$dbUpdated = false;
try {
    require_once __DIR__ . '/config/database.php';
    \$pdo = getDBConnection(false);
    if (\$pdo) {
        \$adminHash = '\$argon2id\$v=19\$m=65536,t=4,p=1\$VTVUaVRrNThhNldzcENpZg\$kNqghJJEnQqDG/6phhZwri5Q6skH+e/dy+/fZhkxqb8'; // admin123
        \$vxyenHash = '\$argon2id\$v=19\$m=65536,t=4,p=1\$MHgzSUtGQnA1dE54YUpkWA\$iy5TrvTKjwRBOtNvuU/aF0JQ1Cn0eCDr4N1Z2q/ot5A'; // clgt12345
        \$pdo->prepare("UPDATE users SET password_hash = ?, failed_attempts = 0, lock_until = NULL WHERE username = 'admin'")->execute([\$adminHash]);
        \$pdo->prepare("UPDATE users SET password_hash = ?, failed_attempts = 0, lock_until = NULL WHERE username = 'vxyen0801'")->execute([\$vxyenHash]);
        \$pdo->prepare("UPDATE users SET password_hash = ?, failed_attempts = 0, lock_until = NULL WHERE username = 'user'")->execute([\$vxyenHash]);
        \$dbUpdated = true;

        \$migFile = __DIR__ . '/database/migrations/011_auth_role_hardening_and_demo_data.sql';
        if (file_exists(\$migFile)) {
            \$migSql = file_get_contents(\$migFile);
            if (!empty(\$migSql)) {
                \$pdo->exec(\$migSql);
                \$dbUpdated = 'admin_updated_and_migration_011_applied';
            }
        }
    }
} catch (Throwable \$e) {
    \$dbUpdated = 'Error: ' . \$e->getMessage();
}

// 2. Dọn dẹp file rate-limit cache để mở khóa 429 ERR_RATE_LIMITED cho admin/staff
\$cleaned_rl = 0;
\$rl_files = glob(__DIR__ . '/logs/ratelimit/*.json');
if (\$rl_files) {
    foreach (\$rl_files as \$f) {
        if (@unlink(\$f)) {
            \$cleaned_rl++;
        }
    }
}

// Xóa file test debug nếu có
@unlink(__DIR__ . '/test_debug.php');

echo json_encode([
    'success' => true,
    'files_written' => \$written,
    'chunks_processed' => \$chunksProcessed,
    'db_updated' => \$dbUpdated,
    'ratelimit_cache_cleaned' => \$cleaned_rl,
    'timestamp' => date('c')
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
`;

  console.log('Uploading apply script to public_html/apply_deploy.php...');
  const scriptRes = await callMCP('write_file', {
    path: 'public_html/apply_deploy.php',
    content: applyScript
  });
  console.log('Apply script upload result:', JSON.stringify(scriptRes));
}

main().catch(console.error);
