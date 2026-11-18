<?php
/**
 * Bộ kiểm thử tự động chức năng Quên mật khẩu (Forgot Password Suite)
 * Chạy độc lập qua PHP CLI ngay cả khi MySQL local tắt: php.exe tests/test_forgot_password.php
 */
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '1');

$projectRoot = dirname(__DIR__);
chdir($projectRoot);

$passed = 0;
$failed = 0;
$skipped = 0;

function report_test(string $name, bool $success, string $details = ''): void {
    global $passed, $failed;
    if ($success) {
        $passed++;
        echo "  [PASS] {$name}" . ($details !== '' ? " ({$details})" : '') . PHP_EOL;
    } else {
        $failed++;
        echo "  [FAIL] {$name} - LỖI: {$details}" . PHP_EOL;
    }
}

function report_skip(string $name, string $reason = ''): void {
    global $skipped;
    $skipped++;
    echo "  [SKIP] {$name}" . ($reason !== '' ? " ({$reason})" : '') . PHP_EOL;
}

function run_forgot_subprocess(string $phpBinary, string $root, array $spec): array {
    $b64 = base64_encode((string)json_encode($spec, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    $script = <<<'PHP'
<?php
declare(strict_types=1);
foreach (['TURNSTILE_ENABLED' => 'false', 'SMTP_HOST' => '', 'SMTP_USER' => '', 'SMTP_PASS' => ''] as $ek => $ev) {
    $_ENV[$ek] = $ev;
    putenv("{$ek}={$ev}");
}
$root = __ROOT__;
$spec = json_decode((string)base64_decode('__B64__'), true);
$_SERVER['REQUEST_METHOD'] = (string)($spec['method'] ?? 'POST');
$_SERVER['REMOTE_ADDR'] = (string)($spec['ip'] ?? '198.51.100.78');
require_once $root . '/api/security_helper.php';
require_once $root . '/api/services/forgot_password_service.php';
class FakePDOStatement extends PDOStatement {
    private FakePDO $db;
    private string $sql;
    private ?array $row = null;
    public function __construct(FakePDO $db, string $sql) { $this->db = $db; $this->sql = $sql; }
    public function execute(?array $params = null): bool {
        $p = $params ?? [];
        $this->db->executed[] = ['sql' => $this->sql, 'params' => $p];
        $this->row = $this->db->resolveRow($this->sql, $p);
        return true;
    }
    public function fetch(int $mode = PDO::FETCH_DEFAULT, int $cursorOrientation = PDO::FETCH_ORI_NEXT, int $cursorOffset = 0): mixed {
        $r = $this->row; $this->row = null; return $r ?? false;
    }
}
class FakePDO extends PDO {
    public array $executed = [];
    public bool $tx = false;
    public ?array $mockUser;
    public array $rateLimits = [];
    public function __construct(?array $mockUser = null) { $this->mockUser = $mockUser; }
    public function prepare(string $query, array $options = []): PDOStatement|false { return new FakePDOStatement($this, $query); }
    public function beginTransaction(): bool { $this->tx = true; return true; }
    public function commit(): bool { $this->tx = false; return true; }
    public function rollBack(): bool { $this->tx = false; return true; }
    public function inTransaction(): bool { return $this->tx; }
    public function resolveRow(string $sql, array $params): ?array {
        if (stripos($sql, 'FROM users') !== false) {
            return ($this->mockUser && ($params[0] ?? '') === $this->mockUser['username'] && ($params[1] ?? '') === strtolower($this->mockUser['email'])) ? $this->mockUser : null;
        }
        if (stripos($sql, 'FROM rate_limits') !== false) {
            return $this->rateLimits[($params[0] ?? '') . '|' . ($params[1] ?? '')] ?? null;
        }
        if (stripos($sql, 'INSERT INTO rate_limits') !== false) {
            $k = ($params[1] ?? '') . '|' . ($params[0] ?? '');
            $this->rateLimits[$k] = ['id' => count($this->rateLimits) + 1, 'action' => $params[1] ?? '', 'ip_address' => $params[0] ?? '', 'attempts' => 1, 'last_attempt' => date('Y-m-d H:i:s')];
        } elseif (stripos($sql, 'UPDATE rate_limits') !== false) {
            $id = (int)end($params);
            foreach ($this->rateLimits as &$r) {
                if (($r['id'] ?? 0) === $id) { $r['attempts'] = (int)($params[0] ?? $r['attempts']); $r['last_attempt'] = date('Y-m-d H:i:s'); }
            }
        }
        return null;
    }
}
$pdo = new FakePDO($spec['mockUser'] ?? null);
register_shutdown_function(function () use ($pdo): void {
    echo "\n__HTTP_CODE__:" . (int)http_response_code();
    echo "\n__FAKE_PDO__:" . json_encode(['executed' => $pdo->executed, 'tx' => $pdo->tx], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
});
$data = is_array($spec['data'] ?? null) ? $spec['data'] : [];
if (!empty($spec['initCsrf'])) {
    secure_session_start();
    if (!array_key_exists('csrf_token', $data)) $data['csrf_token'] = (string)($_SESSION['csrf_token'] ?? '');
}
try { handle_forgot_password($pdo, $data); } catch (Throwable $e) { fwrite(STDERR, $e->getMessage() . "\n"); }
PHP;
    $script = str_replace(['__ROOT__', '__B64__'], [var_export($root, true), $b64], $script);
    $env = [];
    foreach ((getenv() ?: []) as $k => $v) {
        if (is_string($k) && $k !== '' && strpos($k, '=') === false && is_scalar($v) && !in_array(strtoupper($k), ['TURNSTILE_ENABLED', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'], true)) {
            $env[$k] = (string)$v;
        }
    }
    $env += ['TURNSTILE_ENABLED' => 'false', 'SMTP_HOST' => '', 'SMTP_USER' => '', 'SMTP_PASS' => ''];
    $proc = @proc_open([$phpBinary], [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, $root, $env);
    if (!is_resource($proc)) return ['exit' => -1, 'http' => 0, 'json' => null, 'pdo' => ['executed' => [], 'tx' => false], 'stderr' => 'proc_open failed'];
    fwrite($pipes[0], $script);
    fclose($pipes[0]);
    $stdout = (string)stream_get_contents($pipes[1]); fclose($pipes[1]);
    $stderr = (string)stream_get_contents($pipes[2]); fclose($pipes[2]);
    $exit = proc_close($proc);
    $http = preg_match('/\R?__HTTP_CODE__:(\d+)/', $stdout, $mCode) ? (int)$mCode[1] : 0;
    $pdoState = (preg_match('/\R?__FAKE_PDO__:(\{.*\})/', $stdout, $mPdo) && is_array($dec = json_decode($mPdo[1], true))) ? $dec : ['executed' => [], 'tx' => false];
    $json = json_decode(trim((string)preg_replace('/\R?__HTTP_CODE__:\d+.*$/s', '', $stdout)), true);
    return ['exit' => $exit, 'http' => $http, 'json' => is_array($json) ? $json : null, 'pdo' => $pdoState, 'stderr' => trim($stderr)];
}

echo "======================================================================" . PHP_EOL;
echo "  KIỂM THỬ TỰ ĐỘNG LUỒNG QUÊN MẬT KHẨU (FORGOT PASSWORD SUITE)" . PHP_EOL;
echo "  PHP Version: " . PHP_VERSION . PHP_EOL;
echo "======================================================================" . PHP_EOL . PHP_EOL;

// NHÓM 1: ROUTING & ANTI-403 STATIC INVARIANTS
echo "[NHÓM 1] Routing & Anti-403 Static Invariants" . PHP_EOL;
$loginHtml = (string)@file_get_contents($projectRoot . '/html/login.html');
$noDeadForgotHref = strpos($loginHtml, '<a href="#">Quên mật khẩu?</a>') === false
    && preg_match('/<a[^>]*href\s*=\s*["\']#["\'][^>]*>\s*Quên mật khẩu\?/iu', $loginHtml) === 0;
$hasForgotLink = preg_match('/<a\b[^>]*\bid=["\']forgot-password-link["\'][^>]*>/i', $loginHtml, $mLink) === 1
    && preg_match('/\bhref=["\']\.\.\/forgot-password["\']/i', $mLink[0]) === 1;
report_test('1.1 html/login.html liên kết #forgot-password-link trỏ ../forgot-password (không còn href="#")', $noDeadForgotHref && $hasForgotLink);

$htaccess = (string)@file_get_contents($projectRoot . '/.htaccess');
preg_match_all('/RewriteCond\s+%\{THE_REQUEST\}\s+([^\r\n]+?)\s+\[NC\]/i', $htaccess, $allConds);
$forgotConds = array_values(array_filter($allConds[1] ?? [], static fn(string $c): bool => str_contains($c, 'forgot-password')));
$condRe = $forgotConds[0] ?? '';
$has301 = preg_match('/RewriteRule\s+(\S*forgot-password\S*)\s+\/\$2\s+\[R=301/i', $htaccess, $m301) === 1;
$hasInt = preg_match('/RewriteRule\s+(\S*forgot-password\S*)\s+html\/\$1\.html/i', $htaccess, $mInt) === 1;
$regexMatchOk = $condRe !== '' && $has301 && $hasInt
    && preg_match('~' . $mInt[1] . '~', ltrim('/forgot-password', '/')) === 1
    && preg_match('~' . $mInt[1] . '~', ltrim('/forgot-password/', '/')) === 1
    && preg_match('~' . $condRe . '~i', 'GET /html/forgot-password.html HTTP/1.1') === 1
    && preg_match('~' . $m301[1] . '~', ltrim('/html/forgot-password.html', '/')) === 1;
report_test('1.2 .htaccess định tuyến forgot-password khớp /forgot-password, /forgot-password/, /html/forgot-password.html', $regexMatchOk);

$forgotHtmlPath = $projectRoot . '/html/forgot-password.html';
$forgotJsPath = $projectRoot . '/js/forgot_password.js';
$forgotHtml = (string)@file_get_contents($forgotHtmlPath);
$forgotJs = (string)@file_get_contents($forgotJsPath);
$htmlLines = is_file($forgotHtmlPath) ? count(file($forgotHtmlPath)) : 9999;
$jsLines = is_file($forgotJsPath) ? count(file($forgotJsPath)) : 9999;
$hasIds = true;
foreach (['forgot-email', 'forgot-username', 'forgot-website', 'forgot-submit-btn', 'forgot-success-panel'] as $reqId) {
    if (!str_contains($forgotHtml, 'id="' . $reqId . '"')) $hasIds = false;
}
preg_match_all('/\.innerHTML\s*[+]?=\s*([^\r\n;]+)/', $forgotJs, $ihMatches);
$safeInnerHtml = preg_match('/\b(outerHTML|insertAdjacentHTML|document\.write)\b/', $forgotJs) === 0;
foreach ($ihMatches[1] as $rhs) {
    if (trim($rhs) !== "window.SanBongApp.renderPitchSVG('bright', 'h-full')") $safeInnerHtml = false;
}
report_test('1.3 forgot-password.html & forgot_password.js ≤ 666 dòng, đủ selector bắt buộc và không innerHTML dữ liệu ngoài', $htmlLines <= 666 && $jsLines <= 666 && $hasIds && $safeInnerHtml, "HTML={$htmlLines}, JS={$jsLines}");
echo PHP_EOL;

// NHÓM 2: SCHEMA & MIGRATION 018
echo "[NHÓM 2] Schema & Migration 018" . PHP_EOL;
$migSql = (string)@file_get_contents($projectRoot . '/database/migrations/018_create_password_resets.sql');
$migOk = str_contains($migSql, 'CREATE TABLE IF NOT EXISTS') && str_contains($migSql, 'password_resets')
    && preg_match('/`?code_hash`?\s+CHAR\(64\)/i', $migSql) === 1 && str_contains($migSql, 'fk_pw_resets_user')
    && preg_match('/\b(DROP|TRUNCATE)\b/i', $migSql) === 0;
report_test('2.1 database/migrations/018_create_password_resets.sql idempotent, có code_hash CHAR(64) & fk_pw_resets_user, không DROP/TRUNCATE', $migOk);

$schemaSql = (string)@file_get_contents($projectRoot . '/database/schema.sql');
$schemaOk = preg_match('/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+`?password_resets`?/i', $schemaSql) === 1
    && preg_match('/`?code_hash`?\s+CHAR\(64\)/i', $schemaSql) === 1 && str_contains($schemaSql, 'fk_pw_resets_user')
    && preg_match('/\b(DROP|TRUNCATE)\b/i', $schemaSql) === 0;
report_test('2.2 database/schema.sql đồng bộ bảng password_resets, không DROP/TRUNCATE', $schemaOk);

$dbCfg = (string)@file_get_contents($projectRoot . '/config/database.php');
$dbCfgOk = preg_match('/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+`?password_resets`?/i', $dbCfg) === 1
    && preg_match('/`?code_hash`?\s+CHAR\(64\)/i', $dbCfg) === 1 && str_contains($dbCfg, 'fk_pw_resets_user')
    && str_contains($dbCfg, '.schema_v19_password_resets_ready')
    && preg_match('/\b(DROP\s+(?:TABLE|DATABASE|VIEW)|TRUNCATE)\b/i', $dbCfg) === 0;
report_test('2.3 config/database.php có password_resets DDL & marker .schema_v19_password_resets_ready', $dbCfgOk);
echo PHP_EOL;

// NHÓM 3: LOGIC handle_forgot_password QUA PHP CLI SUBPROCESS + FakePDO
echo "[NHÓM 3] Logic handle_forgot_password (PHP CLI subprocess + FakePDO)" . PHP_EOL;
$phpBinary = is_file(PHP_BINARY) ? PHP_BINARY : 'C:\\laragon\\bin\\php\\php-8.1.10-Win32-vs16-x64\\php.exe';
$mailLogPath = $projectRoot . '/logs/mail_delivery.log';
clearstatcache(true, $mailLogPath);
$mailExisted = is_file($mailLogPath);
$mailOrigSize = $mailExisted ? (int)filesize($mailLogPath) : 0;

$testIps = ['198.51.100.71', '198.51.100.72', '198.51.100.73', '198.51.100.74', '198.51.100.77', '198.51.100.78'];
$rlFiles = array_map(static fn(string $ip): string => $projectRoot . '/logs/ratelimit/rl_' . hash('sha256', 'forgot_pw_ip|' . $ip) . '.json', $testIps);
foreach (['nobody_user|nobody_test@gmail.com', 'active_user|active_test@gmail.com', 'ratelimit_user|ratelimit_test@gmail.com'] as $raw) {
    $acctKey = hash('sha256', strtolower($raw));
    $rlFiles[] = $projectRoot . '/logs/ratelimit/rl_' . hash('sha256', 'forgot_pw_acct|' . $acctKey) . '.json';
    foreach (['198.51.100.77', '198.51.100.78'] as $ip) {
        $rlFiles[] = $projectRoot . '/logs/ratelimit/rl_' . hash('sha256', 'forgot_pw_acct|' . $ip . '|' . $acctKey) . '.json';
    }
}
foreach ($rlFiles as $f) { if (is_file($f)) @unlink($f); }

try {
    $rGet = run_forgot_subprocess($phpBinary, $projectRoot, ['method' => 'GET']);
    report_test('3.1 GET -> HTTP 405 (ERR_METHOD_NOT_ALLOWED)', $rGet['http'] === 405 && ($rGet['json']['ref_code'] ?? '') === 'ERR_METHOD_NOT_ALLOWED', "HTTP={$rGet['http']}");

    $rCsrfMiss = run_forgot_subprocess($phpBinary, $projectRoot, ['method' => 'POST', 'initCsrf' => false, 'data' => ['email' => 'u@gmail.com', 'username' => 'user01']]);
    $rCsrfBad = run_forgot_subprocess($phpBinary, $projectRoot, ['method' => 'POST', 'initCsrf' => true, 'data' => ['csrf_token' => 'bad_tok', 'email' => 'u@gmail.com', 'username' => 'user01']]);
    $csrfOk = $rCsrfMiss['http'] === 403 && ($rCsrfMiss['json']['ref_code'] ?? '') === 'ERR_CSRF_INVALID'
        && $rCsrfBad['http'] === 403 && ($rCsrfBad['json']['ref_code'] ?? '') === 'ERR_CSRF_INVALID';
    report_test('3.2 Thiếu/sai csrf_token -> HTTP 403 (ERR_CSRF_INVALID)', $csrfOk);

    $rVal = run_forgot_subprocess($phpBinary, $projectRoot, ['method' => 'POST', 'initCsrf' => true, 'data' => ['email' => 'bad-email', 'username' => 'ab']]);
    $valOk = $rVal['http'] === 422 && ($rVal['json']['ref_code'] ?? '') === 'ERR_VALIDATION'
        && !empty($rVal['json']['error']['fieldErrors']['email']) && !empty($rVal['json']['error']['fieldErrors']['username']);
    report_test('3.3 Email sai định dạng & username < 3 ký tự -> HTTP 422 (ERR_VALIDATION + fieldErrors)', $valOk, "HTTP={$rVal['http']}");

    $rHp = run_forgot_subprocess($phpBinary, $projectRoot, ['method' => 'POST', 'initCsrf' => true, 'data' => ['email' => 'bot@gmail.com', 'username' => 'spambot', 'website' => 'spam']]);
    $hpInserts = array_filter($rHp['pdo']['executed'], static fn($q) => stripos((string)$q['sql'], 'INSERT INTO password_resets') !== false);
    report_test('3.4 Honeypot website="spam" -> HTTP 200, không INSERT password_resets', $rHp['http'] === 200 && empty($hpInserts));

    $rNone = run_forgot_subprocess($phpBinary, $projectRoot, ['method' => 'POST', 'initCsrf' => true, 'ip' => '198.51.100.78', 'mockUser' => null, 'data' => ['email' => 'nobody_test@gmail.com', 'username' => 'nobody_user']]);
    $noneOk = $rNone['http'] === 404
        && ($rNone['json']['success'] ?? null) === false
        && ($rNone['json']['error']['code'] ?? '') === 'ERR_USER_NOT_FOUND'
        && str_contains((string)($rNone['json']['message'] ?? ''), 'Không có người dùng');
    report_test('3.5a User không tồn tại -> HTTP 404, success=false, ERR_USER_NOT_FOUND', $noneOk, "HTTP={$rNone['http']}");

    $activeUser = ['id' => 42, 'username' => 'active_user', 'email' => 'active_test@gmail.com', 'full_name' => 'Test User', 'role' => 'user', 'status' => 'active'];
    $rAct = run_forgot_subprocess($phpBinary, $projectRoot, ['method' => 'POST', 'initCsrf' => true, 'ip' => '198.51.100.78', 'mockUser' => $activeUser, 'data' => ['email' => 'active_test@gmail.com', 'username' => 'active_user']]);
    $actOk = $rAct['http'] === 200
        && ($rAct['json']['success'] ?? null) === true
        && ($rAct['json']['data']['exists'] ?? null) === true
        && ($rAct['json']['ref_code'] ?? '') === 'OK_FORGOT_PASSWORD_USER_FOUND'
        && str_contains((string)($rAct['json']['message'] ?? ''), 'Thành công')
        && !$rAct['pdo']['tx'];
    report_test('3.5b User tồn tại -> HTTP 200, success=true, data.exists=true, OK_FORGOT_PASSWORD_USER_FOUND', $actOk, "HTTP={$rAct['http']}");

    $rlCodes = [];
    foreach (['198.51.100.71', '198.51.100.72', '198.51.100.73', '198.51.100.74'] as $ip) {
        $rRl = run_forgot_subprocess($phpBinary, $projectRoot, ['method' => 'POST', 'initCsrf' => true, 'ip' => $ip, 'data' => ['email' => 'ratelimit_test@gmail.com', 'username' => 'ratelimit_user']]);
        $rlCodes[] = [$rRl['http'], $rRl['json']['ref_code'] ?? ''];
    }
    $rlOk = $rlCodes[0][0] === 404 && $rlCodes[1][0] === 404 && $rlCodes[2][0] === 404
        && $rlCodes[3][0] === 429 && $rlCodes[3][1] === 'ERR_RATE_LIMITED';
    report_test('3.6 Rate-limit forgot_pw_acct chặn xuyên IP (198.51.100.71..74, > 3 lần) -> HTTP 429 (ERR_RATE_LIMITED)', $rlOk);
} finally {
    foreach ($rlFiles as $f) { if (is_file($f)) @unlink($f); }
    clearstatcache(true, $mailLogPath);
    if (!$mailExisted) {
        if (is_file($mailLogPath)) @unlink($mailLogPath);
    } elseif (is_file($mailLogPath)) {
        $fp = @fopen($mailLogPath, 'c+');
        if ($fp) { ftruncate($fp, $mailOrigSize); fclose($fp); }
    }
}
echo PHP_EOL;

// NHÓM 4: MYSQL LIVE CHECK
echo "[NHÓM 4] MySQL Live Check" . PHP_EOL;
$dbConfigPath = $projectRoot . '/config/database.php';
$livePdo = null;
if (file_exists($dbConfigPath)) {
    require_once $dbConfigPath;
    if (function_exists('getDBConnection')) {
        try { $livePdo = getDBConnection(false); } catch (Throwable $e) { $livePdo = null; }
    }
}
if (!($livePdo instanceof PDO)) {
    report_skip('MySQL local đang tắt', 'Bỏ qua kiểm tra SHOW TABLES LIKE \'password_resets\'');
} else {
    $tblStmt = $livePdo->query("SHOW TABLES LIKE 'password_resets'");
    $hasTable = $tblStmt !== false && $tblStmt->fetchColumn() !== false;
    report_test("4.1 Bảng password_resets tồn tại trên MySQL local", $hasTable);
}
echo PHP_EOL;

echo "======================================================================" . PHP_EOL;
echo "  [PASS]: {$passed} | [FAIL]: {$failed} | [SKIP]: {$skipped}" . PHP_EOL;
echo "======================================================================" . PHP_EOL;
exit($failed > 0 ? 1 : 0);
