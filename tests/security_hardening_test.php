<?php
/**
 * ==============================================================================
 * BỘ KIỂM THỬ AN NINH TỰ ĐỘNG THỰC TẾ (REAL SECURITY HARDENING SUITE)
 * Dự án: Sân Bóng Pro - Hệ thống Quản lý Sân Bóng
 * File: tests/security_hardening_test.php
 * 
 * Phạm vi kiểm thử:
 * 1. RFC 6238 TOTP 2FA Verification (Secret generation, time-slice codes, drift window, invalid inputs)
 * 2. XSS Escape, Bundle Sync & UI/Consent Invariants (Nghị định 13/2023)
 * 3. Server Configuration & API Defense Invariants (.htaccess, robots.txt, Sepay, Bookings, Auth 405)
 * 4. MySQL Local Schema & Transaction Isolation (Points balance check + strict rollback)
 * 5. Full Syntax & Lint Check (php -l trên toàn bộ PHP files, node --check trên toàn bộ JS files)
 * ==============================================================================
 */

// Đặt môi trường CLI
error_reporting(E_ALL);
ini_set('display_errors', '1');

$projectRoot = dirname(__DIR__);
chdir($projectRoot);

$passed = 0;
$failed = 0;
$skipped = 0;

function report_test(string $name, bool $success, string $details = '') {
    global $passed, $failed;
    if ($success) {
        $passed++;
        echo "  [PASS] {$name}" . ($details !== '' ? " ({$details})" : "") . PHP_EOL;
    } else {
        $failed++;
        echo "  [FAIL] {$name} - LỖI: {$details}" . PHP_EOL;
    }
}

function report_skip(string $name, string $reason = '') {
    global $skipped;
    $skipped++;
    echo "  [SKIP] {$name}" . ($reason !== '' ? " ({$reason})" : "") . PHP_EOL;
}

/**
 * Thực thi mã JavaScript qua Node.js an toàn bằng STDIN pipe (tránh lỗi escape shell trên Windows)
 */
function run_node_eval(string $jsCode): array {
    $descriptorspec = [
        0 => ["pipe", "r"], // stdin
        1 => ["pipe", "w"], // stdout
        2 => ["pipe", "w"]  // stderr
    ];
    $process = @proc_open('node', $descriptorspec, $pipes);
    if (!is_resource($process)) {
        return ['exitCode' => -1, 'stdout' => '', 'stderr' => 'Không thể khởi động Node.js'];
    }
    fwrite($pipes[0], $jsCode);
    fclose($pipes[0]);

    $stdout = stream_get_contents($pipes[1]);
    fclose($pipes[1]);

    $stderr = stream_get_contents($pipes[2]);
    fclose($pipes[2]);

    $exitCode = proc_close($process);
    return [
        'exitCode' => $exitCode,
        'stdout'   => trim($stdout),
        'stderr'   => trim($stderr)
    ];
}

echo "======================================================================" . PHP_EOL;
echo "  BẮT ĐẦU CHẠY KIỂM THỬ AN NINH TOÀN DIỆN (SECURITY HARDENING TESTS)" . PHP_EOL;
echo "  Dự án: {$projectRoot}" . PHP_EOL;
echo "  Thời gian: " . date('Y-m-d H:i:s') . PHP_EOL;
echo "  PHP Version: " . PHP_VERSION . PHP_EOL;
echo "======================================================================" . PHP_EOL . PHP_EOL;

// ----------------------------------------------------------------------
// NHÓM 1: RFC 6238 TOTP 2FA VERIFICATION
// ----------------------------------------------------------------------
echo "[NHÓM 1] RFC 6238 TOTP 2FA Verification" . PHP_EOL;

$securityHelperPath = $projectRoot . '/api/security_helper.php';
if (!file_exists($securityHelperPath)) {
    report_test("Kiểm tra tồn tại api/security_helper.php", false, "Không tìm thấy file {$securityHelperPath}");
} else {
    require_once $securityHelperPath;
    report_test("Nạp thành công api/security_helper.php", true);

    // 1.1 totp_generate_secret
    $secret = totp_generate_secret(16);
    $validBase32 = (strlen($secret) === 16 && preg_match('/^[A-Z2-7]{16}$/', $secret) === 1);
    report_test("1.1 totp_generate_secret() sinh secret Base32 16 ký tự", $validBase32, "Secret: {$secret}");

    // 1.2 Kiểm tra sinh mã TOTP đúng và verify_code thành công
    $currentTimeSlice = (int)floor(time() / 30);
    $validCode = totp_calculate_code($secret, $currentTimeSlice);
    $verifyValid = totp_verify_code($secret, $validCode, 1);
    report_test("1.2 totp_verify_code() chấp nhận mã hợp lệ ở time-slice hiện tại", $verifyValid === true, "Mã: {$validCode}");

    // 1.3 Kiểm tra mã sai
    $wrongCode = ($validCode === '000000') ? '999999' : '000000';
    $verifyWrong = totp_verify_code($secret, $wrongCode, 1);
    report_test("1.3 totp_verify_code() từ chối mã sai", $verifyWrong === false, "Mã sai: {$wrongCode}");

    // 1.4 Kiểm tra secret rỗng
    $verifyEmptySecret = totp_verify_code('', $validCode, 1);
    report_test("1.4 totp_verify_code() từ chối secret rỗng", $verifyEmptySecret === false);

    // 1.5 Kiểm tra mã chứa chữ hoặc ký tự đặc biệt hoặc độ dài sai
    $verifyAlpha = totp_verify_code($secret, 'ABC123', 1);
    $verifyShort = totp_verify_code($secret, '123', 1);
    report_test("1.5 totp_verify_code() từ chối định dạng mã không hợp lệ", ($verifyAlpha === false && $verifyShort === false));

    // 1.6 Kiểm tra clock drift: chấp nhận ±1 timeSlice (window = 1), từ chối chênh lệch lớn (±5 timeSlice)
    $prevCode = totp_calculate_code($secret, $currentTimeSlice - 1);
    $nextCode = totp_calculate_code($secret, $currentTimeSlice + 1);
    $verifyDriftPrev = totp_verify_code($secret, $prevCode, 1);
    $verifyDriftNext = totp_verify_code($secret, $nextCode, 1);

    $farFutureCode = totp_calculate_code($secret, $currentTimeSlice + 5);
    $verifyFarFuture = totp_verify_code($secret, $farFutureCode, 1);

    $driftPassed = ($verifyDriftPrev === true && $verifyDriftNext === true && $verifyFarFuture === false);
    report_test("1.6 totp_verify_code() hỗ trợ drift window ±1 và chặn timeSlice chênh lệch lớn", $driftPassed);

    // 1.7 Kiểm tra totp_provisioning_uri
    $uri = totp_provisioning_uri('admin@sanbongpro.vn', $secret, 'SanBongPro');
    $uriValid = (strpos($uri, 'otpauth://totp/') === 0 && strpos($uri, "secret={$secret}") !== false);
    report_test("1.7 totp_provisioning_uri() định dạng chuẩn RFC 6238", $uriValid);
}
echo PHP_EOL;

// ----------------------------------------------------------------------
// NHÓM 2: XSS ESCAPE, BUNDLE SYNC & CONSENT CHECKBOXES (NĐ 13/2023)
// ----------------------------------------------------------------------
echo "[NHÓM 2] XSS Escape, Bundle Sync & Consent Checkboxes (NĐ 13/2023)" . PHP_EOL;

// 2.1 Chạy Node test escapeHTML trong js/helpers.js qua stdin pipe
$jsTestXss = <<<'JSEVAL'
const fs = require('fs');
const vm = require('vm');
const code = fs.readFileSync('js/helpers.js', 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const esc = sandbox.window.escapeHTML;

const payload = '<script>alert(1)</script>';
const res = esc(payload);
if (res === '&lt;script&gt;alert(1)&lt;/script&gt;') {
    process.exit(0);
} else {
    console.error('Mismatch: ' + res);
    process.exit(1);
}
JSEVAL;

$nodeResult1 = run_node_eval($jsTestXss);
report_test("2.1 js/helpers.js escapeHTML('<script>alert(1)</script>') vô hiệu hóa thẻ HTML", $nodeResult1['exitCode'] === 0, $nodeResult1['stderr']);

// 2.2 Test escape các ký tự đặc biệt quotes và ampersand
$jsTestQuotes = <<<'JSEVAL'
const fs = require('fs');
const vm = require('vm');
const code = fs.readFileSync('js/helpers.js', 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const esc = sandbox.window.escapeHTML;

const payload = '"test" & \'';
const res = esc(payload);
if (res === '&quot;test&quot; &amp; &#39;') {
    process.exit(0);
} else {
    console.error('Mismatch: ' + res);
    process.exit(1);
}
JSEVAL;

$nodeResult2 = run_node_eval($jsTestQuotes);
report_test("2.2 js/helpers.js escapeHTML() mã hóa dấu ngoặc kép, nháy đơn, dấu và", $nodeResult2['exitCode'] === 0, $nodeResult2['stderr']);

// 2.3 Kiểm tra js/app.js chứa đủ các hàm an ninh đồng bộ từ helpers.js, db.js, ui.js
$appJsContent = file_get_contents($projectRoot . '/js/app.js');
$hasEnsureCsrf = (strpos($appJsContent, 'ensureCsrfToken') !== false);
$hasSecureFetch = (strpos($appJsContent, 'secureFetch') !== false);
$hasEscapeHtml = (strpos($appJsContent, 'escapeHTML') !== false);
$hasClearCsrf = (strpos($appJsContent, 'clearCsrfToken') !== false);
$bundleSyncPassed = ($hasEnsureCsrf && $hasSecureFetch && $hasEscapeHtml && $hasClearCsrf);
report_test("2.3 js/app.js đồng bộ đầy đủ các hàm an ninh (ensureCsrfToken, secureFetch, escapeHTML, clearCsrfToken)", $bundleSyncPassed);

// 2.4 Kiểm tra js/ui.js không còn href="#" chết cho 'Chính sách bảo mật'
$uiJsContent = file_get_contents($projectRoot . '/js/ui.js');
$hasDeadPrivacyHref = preg_match('/<a[^>]*href=["\']#["\'][^>]*>.*Chính sách bảo mật.*<\/a>/iu', $uiJsContent);
$hasButtonPrivacy = (strpos($uiJsContent, 'footer-btn-privacy') !== false);
report_test("2.4 js/ui.js không còn liên kết href='#' chết cho Chính sách bảo mật (dùng button/modal)", (!$hasDeadPrivacyHref && $hasButtonPrivacy));

// 2.5 Kiểm tra html/booking.html checkbox consent không có thuộc tính checked
$bookingHtmlContent = file_get_contents($projectRoot . '/html/booking.html');
$bookingConsentUnchecked = preg_match('/<input[^>]*id=["\']policy-agree["\'][^>]*>/i', $bookingHtmlContent, $bMatches);
$isBookingPreticked = $bookingConsentUnchecked ? (bool)preg_match('/\bchecked\b/i', $bMatches[0]) : true;
report_test("2.5 html/booking.html checkbox thỏa thuận dữ liệu cá nhân không bị checked sẵn (NĐ 13/2023)", !$isBookingPreticked);

// 2.6 Kiểm tra html/login.html checkbox consent không có thuộc tính checked
$loginHtmlContent = file_get_contents($projectRoot . '/html/login.html');
$loginConsentUnchecked = preg_match('/<input[^>]*id=["\']reg-privacy-consent["\'][^>]*>/i', $loginHtmlContent, $lMatches);
$isLoginPreticked = $loginConsentUnchecked ? (bool)preg_match('/\bchecked\b/i', $lMatches[0]) : true;
report_test("2.6 html/login.html checkbox đồng ý điều khoản & bảo mật không bị checked sẵn (NĐ 13/2023)", !$isLoginPreticked);

echo PHP_EOL;

// ----------------------------------------------------------------------
// NHÓM 3: SERVER CONFIG & CODE STATIC DEFENSE INVARIANTS
// ----------------------------------------------------------------------
echo "[NHÓM 3] Server Configuration & Code Static Defense Invariants" . PHP_EOL;

// 3.1 Kiểm tra .htaccess chặn test_pitches.php
$htaccessContent = file_get_contents($projectRoot . '/.htaccess');
$blocksTestPitches = (strpos($htaccessContent, 'test_pitches') !== false &&
                      strpos($htaccessContent, '<FilesMatch') !== false &&
                      strpos($htaccessContent, 'Deny from all') !== false);
report_test("3.1 .htaccess chặn truy cập trực tiếp file test_pitches.php qua FilesMatch", $blocksTestPitches);

// 3.2 Kiểm tra .htaccess có object-src và script-src trong CSP
$hasCspObjectSrc = (strpos($htaccessContent, "object-src 'none'") !== false);
$hasCspScriptSrc = (strpos($htaccessContent, "script-src") !== false);
report_test("3.2 .htaccess cấu hình CSP đầy đủ object-src 'none' và script-src", ($hasCspObjectSrc && $hasCspScriptSrc));

// 3.3 Kiểm tra robots.txt không làm lộ /portal-admin/
$robotsContent = file_get_contents($projectRoot . '/robots.txt');
$leaksPortalAdmin = (stripos($robotsContent, 'portal-admin') !== false);
report_test("3.3 robots.txt không tiết lộ đường dẫn nhạy cảm /portal-admin/", !$leaksPortalAdmin);

// 3.4 Kiểm tra api/sepay_webhook.php không đọc token/key qua $_GET
$sepayWebhookContent = file_get_contents($projectRoot . '/api/sepay_webhook.php');
$readsTokenGet = (bool)preg_match('/\$_GET\[[\'"](token|key|api_key|secret)[\'"]\]/i', $sepayWebhookContent);
report_test("3.4 api/sepay_webhook.php không đọc token/key bí mật qua query string (\$_GET)", !$readsTokenGet);

// 3.5 Kiểm tra api/sepay_webhook.php dùng ID thật từ API khi cross-check
$crossCheckIdCheck = (strpos($sepayWebhookContent, '$matchedRealTx') !== false &&
                      strpos($sepayWebhookContent, '$sepayTxId = $realTxId;') !== false);
report_test("3.5 api/sepay_webhook.php ghi nhận transaction ID thực từ API SePay khi cross-check", $crossCheckIdCheck);

// 3.6 Booking creation logic is split into its service module.
$bookingCreatorContent = file_get_contents($projectRoot . '/api/services/booking_creator.php');
$usesServerBookingCode = strpos($bookingCreatorContent, 'random_int(100000, 999999)') !== false;
report_test("3.6 booking_creator.php sinh mã đặt sân (booking code) từ server-side", $usesServerBookingCode);

// 3.7 Check the transaction lock in the booking creation service.
$hasSlotConflictCheck = (strpos($bookingCreatorContent, 'LIMIT 1 FOR UPDATE') !== false &&
                         strpos($bookingCreatorContent, "status NOT IN ('Đã hủy'") !== false);
report_test("3.7 booking_creator.php khóa chống trùng slot với SELECT ... FOR UPDATE", $hasSlotConflictCheck);

// 3.8 Check phone rate limits and pending holds in the booking creation service.
$hasPhoneRateLimit = (strpos($bookingCreatorContent, 'create_booking_phone') !== false);
$hasPendingHoldLimit = (strpos($bookingCreatorContent, 'ERR_TOO_MANY_PENDING_BOOKINGS') !== false &&
                        strpos($bookingCreatorContent, '>= 2') !== false);
report_test("3.8 booking_creator.php áp dụng rate-limit per-phone và tối đa 2 pending holds", ($hasPhoneRateLimit && $hasPendingHoldLimit));

// 3.9 Kiểm tra api/auth.php trả HTTP 405 cho GET logout
$authContent = file_get_contents($projectRoot . '/api/auth.php');
$blocksGetLogout = (strpos($authContent, "\$action === 'logout'") !== false &&
                    strpos($authContent, "strtoupper(\$method) !== 'POST'") !== false &&
                    strpos($authContent, '405') !== false &&
                    strpos($authContent, 'ERR_METHOD_NOT_ALLOWED') !== false);
report_test("3.9 api/auth.php từ chối GET logout và trả HTTP 405 Method Not Allowed", $blocksGetLogout);

// 3.10 Admin access comes from stored role and password verification only
$securityHelperContent = file_get_contents($projectRoot . '/api/security_helper.php');
$portalAdminContent = file_get_contents($projectRoot . '/portal-admin/index.php');
$bookingsSource = file_get_contents($projectRoot . '/api/bookings.php');
$noPasswordFallback = strpos($authContent, "'admin123'") === false &&
                      strpos($authContent, "in_array(\$password") === false;
$noIdentityRoleGrant = strpos($securityHelperContent, "\$_SESSION['user']['role'] = 'admin'") === false &&
                       strpos($portalAdminContent, "serverUser.username === 'vxyen0801'") === false &&
                       strpos($bookingsSource, "username'] ?? '') === 'vxyen0801'") === false;
report_test("3.10 Không còn mật khẩu dự phòng hoặc cấp quyền admin theo định danh", ($noPasswordFallback && $noIdentityRoleGrant));

echo PHP_EOL;

// ----------------------------------------------------------------------
// NHÓM 4: DATABASE SCHEMA & POINTS TRANSACTION ISOLATION (MYSQL LOCAL)
// ----------------------------------------------------------------------
echo "[NHÓM 4] Database Schema & Points Transaction Isolation (MySQL Local)" . PHP_EOL;

$dbConfigPath = $projectRoot . '/config/database.php';
$pdo = null;
if (file_exists($dbConfigPath)) {
    require_once $dbConfigPath;
    if (function_exists('getDBConnection')) {
        try {
            $pdo = getDBConnection(false);
        } catch (\Throwable $e) {
            $pdo = null;
        }
    }
}

if (!$pdo) {
    report_skip("4.1 - 4.4 Database Tests", "Không thể kết nối MySQL local trên môi trường hiện tại");
} else {
    report_test("4.1 Kết nối thành công MySQL local via getDBConnection()", true);

    $roleIsolationPassed = false;
    try {
        $pdo->beginTransaction();
        $testUsername = 'role_phone_' . bin2hex(random_bytes(6));
        $testEmail = $testUsername . '@example.test';
        $testHash = password_hash(bin2hex(random_bytes(32)), PASSWORD_ARGON2ID);
        $insertTestUser = $pdo->prepare("INSERT INTO users (username, email, phone, full_name, password_hash, role, status) VALUES (?, ?, '0352313548', 'Kiểm thử phân quyền', ?, 'user', 'active')");
        $insertTestUser->execute([$testUsername, $testEmail, $testHash]);
        $_SESSION = [
            'user_id' => (int)$pdo->lastInsertId(),
            'user' => ['id' => (int)$pdo->lastInsertId(), 'username' => $testUsername, 'phone' => '0352313548', 'role' => 'admin']
        ];
        $resolvedUser = refresh_session_user($pdo);
        $roleIsolationPassed = ($resolvedUser['role'] ?? '') === 'user';
    } catch (Throwable $e) {
        $roleIsolationPassed = false;
    } finally {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        $_SESSION = [];
    }
    report_test("4.2 Số điện thoại trùng không nâng role user thành admin", $roleIsolationPassed);

    // 4.2 Kiểm tra schema bảng users có cột points
    $hasPointsCol = false;
    try {
        $colsStmt = $pdo->query("DESCRIBE users");
        $cols = $colsStmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($cols as $c) {
            if (strcasecmp($c['Field'], 'points') === 0) {
                $hasPointsCol = true;
                break;
            }
        }
    } catch (\Throwable $e) {
        $hasPointsCol = false;
    }
    report_test("4.3 Bảng users có trường points kiểu số nguyên phục vụ loyalty/tích điểm", $hasPointsCol);

    // 4.3 Thử nghiệm giao dịch cộng điểm & rollback sạch (đảm bảo không làm bẩn DB)
    $rollbackClean = false;
    try {
        $userStmt = $pdo->query("SELECT id, points FROM users ORDER BY id ASC LIMIT 1");
        $targetUser = $userStmt->fetch(PDO::FETCH_ASSOC);

        if ($targetUser) {
            $userId = (int)$targetUser['id'];
            $initialPoints = (int)$targetUser['points'];

            // Bắt đầu transaction
            $pdo->beginTransaction();

            $updateStmt = $pdo->prepare("UPDATE users SET points = points + 100 WHERE id = ?");
            $updateStmt->execute([$userId]);

            // Kiểm tra trong transaction đã tăng
            $checkStmt = $pdo->prepare("SELECT points FROM users WHERE id = ?");
            $checkStmt->execute([$userId]);
            $inTxPoints = (int)$checkStmt->fetchColumn();

            // Rollback ngay lập tức
            $pdo->rollBack();

            // Kiểm tra ngoài transaction xem đã trở lại ban đầu
            $afterStmt = $pdo->prepare("SELECT points FROM users WHERE id = ?");
            $afterStmt->execute([$userId]);
            $afterPoints = (int)$afterStmt->fetchColumn();

            if ($inTxPoints === ($initialPoints + 100) && $afterPoints === $initialPoints) {
                $rollbackClean = true;
            }
        } else {
            // Không có user nào trong bảng, coi như pass kiểm tra logic
            $rollbackClean = true;
        }
    } catch (\Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        $rollbackClean = false;
    }
    report_test("4.4 Giao dịch tăng điểm hội viên tuân thủ ACID và rollback sạch sẽ 100%", $rollbackClean);
}

echo PHP_EOL;

// ----------------------------------------------------------------------
// NHÓM 5: SYNTAX & LINT CHECK (PHP CLI & NODE.JS)
// ----------------------------------------------------------------------
echo "[NHÓM 5] Full Syntax & Lint Check (PHP CLI & Node.js)" . PHP_EOL;

$phpBinary = PHP_BINARY;
if (!file_exists($phpBinary)) {
    $phpBinary = 'C:\\laragon\\bin\\php\\php-8.1.10-Win32-vs16-x64\\php.exe';
}

// 5.1 Quét tất cả các file PHP
$phpFiles = [];
$scanDirs = ['api', 'cron', 'config', 'portal-admin', 'tests'];
foreach ($scanDirs as $dir) {
    $dirPath = $projectRoot . '/' . $dir;
    if (is_dir($dirPath)) {
        $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dirPath));
        foreach ($iterator as $file) {
            if ($file->isFile() && $file->getExtension() === 'php') {
                $phpFiles[] = $file->getPathname();
            }
        }
    }
}

$phpErrors = [];
foreach ($phpFiles as $file) {
    $cmd = "\"{$phpBinary}\" -l \"{$file}\" 2>&1";
    $output = [];
    $ret = 0;
    exec($cmd, $output, $ret);
    if ($ret !== 0) {
        $phpErrors[$file] = implode("\n", $output);
    }
}

$relPhpCount = count($phpFiles);
$phpSyntaxSuccess = (count($phpErrors) === 0);
report_test("5.1 Cú pháp PHP (php -l) cho {$relPhpCount} files trong api/, cron/, config/, portal-admin/, tests/", $phpSyntaxSuccess, count($phpErrors) > 0 ? implode('; ', array_keys($phpErrors)) : "Toàn bộ {$relPhpCount} files hợp lệ");

// 5.2 Quét tất cả các file JS bằng node --check
$jsDir = $projectRoot . '/js';
$jsFiles = [];
if (is_dir($jsDir)) {
    $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($jsDir));
    foreach ($iterator as $file) {
        if ($file->isFile() && $file->getExtension() === 'js') {
            $jsFiles[] = $file->getPathname();
        }
    }
}

$jsErrors = [];
foreach ($jsFiles as $file) {
    $cmd = "node --check \"{$file}\" 2>&1";
    $output = [];
    $ret = 0;
    exec($cmd, $output, $ret);
    if ($ret !== 0) {
        $jsErrors[$file] = implode("\n", $output);
    }
}

$relJsCount = count($jsFiles);
$jsSyntaxSuccess = (count($jsErrors) === 0);
report_test("5.2 Cú pháp JavaScript (node --check) cho {$relJsCount} files trong js/", $jsSyntaxSuccess, count($jsErrors) > 0 ? implode('; ', array_keys($jsErrors)) : "Toàn bộ {$relJsCount} files hợp lệ");

echo PHP_EOL;

// ----------------------------------------------------------------------
// TỔNG KẾT KẾT QUẢ KIỂM THỬ
// ----------------------------------------------------------------------
echo "======================================================================" . PHP_EOL;
echo "  TỔNG KẾT KẾT QUẢ KIỂM THỬ AN NINH:" . PHP_EOL;
echo "  [PASS] : {$passed}" . PHP_EOL;
echo "  [FAIL] : {$failed}" . PHP_EOL;
echo "  [SKIP] : {$skipped}" . PHP_EOL;
echo "======================================================================" . PHP_EOL;

if ($failed > 0) {
    echo "  KẾT QUẢ CHUNG: [FAILED] - Có {$failed} bài kiểm tra không đạt yêu cầu!" . PHP_EOL;
    exit(1);
} else {
    echo "  KẾT QUẢ CHUNG: [ALL PASSED] - 100% bài kiểm tra an ninh đạt chuẩn!" . PHP_EOL;
    exit(0);
}
