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
    'config/database.php',
    'portal-admin/index.php',
    ...collectFiles('api'),
    ...collectFiles('js'),
    ...collectFiles('portal-admin/partials'),
    ...collectFiles('html'),
    ...collectFiles('css')
  ];

  const payload = {};
  for (const f of allFiles) {
    if (fs.existsSync(f)) {
      const norm = f.split(path.sep).join('/');
      payload[norm] = fs.readFileSync(f, 'utf8');
    }
  }

  const jsonStr = JSON.stringify(payload);
  console.log(`Packed ${Object.keys(payload).length} files (${jsonStr.length} chars) into deploy payload.`);

  console.log('Uploading payload to public_html/deploy_payload.json...');
  const upRes = await callMCP('write_file', {
    path: 'public_html/deploy_payload.json',
    content: jsonStr
  });
  console.log('Upload result:', JSON.stringify(upRes));

  const applyScript = `<?php
ini_set('display_errors', '1');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');

$payloadFile = __DIR__ . '/deploy_payload.json';
if (!file_exists($payloadFile)) {
    echo json_encode(['success' => false, 'message' => 'deploy_payload.json not found', 'dir' => __DIR__, 'files' => array_slice(scandir(__DIR__), 0, 20)]);
    exit;
}

$raw = file_get_contents($payloadFile);
$data = json_decode($raw, true);
if (!is_array($data)) {
    echo json_encode(['success' => false, 'message' => 'Invalid JSON in deploy_payload.json']);
    exit;
}

$written = 0;
foreach ($data as $relPath => $content) {
    $targetPath = __DIR__ . '/' . $relPath;
    $dir = dirname($targetPath);
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    file_put_contents($targetPath, $content);
    $written++;
}

// Cập nhật role admin cho vxyen0801 trong CSDL trực tiếp
$dbUpdated = false;
try {
    require_once __DIR__ . '/config/database.php';
    $pdo = getDBConnection(false);
    if ($pdo) {
        $stmt = $pdo->prepare("UPDATE users SET role = 'admin' WHERE username = 'vxyen0801' OR phone = '0352313548'");
        $stmt->execute();
        $dbUpdated = true;
    }
} catch (Throwable $e) {
    $dbUpdated = 'Error: ' . $e->getMessage();
}

// Xóa file payload & test debug
@unlink($payloadFile);
@unlink(__DIR__ . '/test_debug.php');
@unlink(__FILE__);

echo json_encode([
    'success' => true,
    'files_written' => $written,
    'db_updated' => $dbUpdated,
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
