<?php

require_once __DIR__ . '/../api/security_helper.php';
if (file_exists(__DIR__ . '/../api/notification_helper.php')) {
    require_once __DIR__ . '/../api/notification_helper.php';
}

$isLibOnly = defined('SANBONG_CRON_LIB_ONLY') && SANBONG_CRON_LIB_ONLY === true;

if (!function_exists('generate_database_dump')) {
    function generate_database_dump(PDO $pdo, string $targetFile): array {
        if (function_exists('loadEnv')) {
            loadEnv();
        }
        $backupDir = dirname($targetFile);
        if (!is_dir($backupDir)) {
            @mkdir($backupDir, 0750, true);
        }
        if (!is_file($backupDir . '/.htaccess')) {
            @file_put_contents($backupDir . '/.htaccess', "Deny from all\n<IfModule mod_authz_core.c>\n    Require all denied\n</IfModule>\n");
        }
        if (!is_file($backupDir . '/index.php')) {
            @file_put_contents($backupDir . '/index.php', "<?php http_response_code(403); exit('403 Forbidden');");
        }

        $wantGzip = (substr($targetFile, -3) === '.gz') && function_exists('gzopen');
        if (substr($targetFile, -3) === '.gz' && !function_exists('gzopen')) {
            $targetFile = substr($targetFile, 0, -3);
        }

        $handle = $wantGzip ? @gzopen($targetFile, 'wb9') : @fopen($targetFile, 'wb');
        if (!$handle) {
            return ['success' => false, 'message' => 'Không thể mở tệp để ghi sao lưu.'];
        }

        $writeChunk = static function (string $str) use ($handle, $wantGzip): void {
            if ($wantGzip) {
                gzwrite($handle, $str);
            } else {
                fwrite($handle, $str);
            }
        };

        $writeChunk("-- ===============================================================\n");
        $writeChunk("-- BẢN SAO LƯU CƠ SỞ DỮ LIỆU SÂN BÓNG PRO\n");
        $writeChunk("-- Thời gian: " . date('Y-m-d H:i:s') . " (+07:00)\n");
        $writeChunk("-- ===============================================================\n\n");
        $writeChunk("SET NAMES utf8mb4;\n");
        $writeChunk("SET time_zone = '+07:00';\n");
        $writeChunk("SET FOREIGN_KEY_CHECKS=0;\n");
        $writeChunk("SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n\n");

        $tablesStmt = $pdo->query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
        $tables = $tablesStmt ? $tablesStmt->fetchAll(PDO::FETCH_COLUMN) : [];

        $totalRows = 0;
        foreach ($tables as $table) {
            if (!preg_match('/^[A-Za-z0-9_]+$/', (string)$table)) {
                continue;
            }
            $createStmt = $pdo->query("SHOW CREATE TABLE `{$table}`");
            $createRow = $createStmt ? $createStmt->fetch(PDO::FETCH_ASSOC) : [];
            $createSql = $createRow['Create Table'] ?? '';
            if ($createSql === '') {
                continue;
            }

            $writeChunk("-- -------------------------------------------------------------\n");
            $writeChunk("-- Bảng: `{$table}`\n");
            $writeChunk("-- -------------------------------------------------------------\n");
            $writeChunk("DROP TABLE IF EXISTS `{$table}`;\n");
            $writeChunk($createSql . ";\n\n");

            $rowsStmt = $pdo->query("SELECT * FROM `{$table}`");
            if (!$rowsStmt) {
                continue;
            }
            $batch = [];
            $colListSql = '';
            while ($row = $rowsStmt->fetch(PDO::FETCH_ASSOC)) {
                if ($colListSql === '') {
                    $cols = array_keys($row);
                    $colListSql = '`' . implode('`, `', $cols) . '`';
                }
                $valParts = [];
                foreach ($row as $v) {
                    if ($v === null) {
                        $valParts[] = 'NULL';
                    } else {
                        $valParts[] = $pdo->quote((string)$v);
                    }
                }
                $batch[] = '(' . implode(', ', $valParts) . ')';
                $totalRows++;

                if (count($batch) >= 100) {
                    $writeChunk("INSERT INTO `{$table}` ({$colListSql}) VALUES\n" . implode(",\n", $batch) . ";\n\n");
                    $batch = [];
                }
            }
            if (!empty($batch) && $colListSql !== '') {
                $writeChunk("INSERT INTO `{$table}` ({$colListSql}) VALUES\n" . implode(",\n", $batch) . ";\n\n");
            }
        }

        $writeChunk("SET FOREIGN_KEY_CHECKS=1;\n");
        $writeChunk("-- KẾT THÚC BẢN SAO LƯU\n");

        if ($wantGzip) {
            gzclose($handle);
        } else {
            fclose($handle);
        }

        clearstatcache(true, $targetFile);
        $fileSize = @filesize($targetFile) ?: 0;

        // Xoay vòng: xóa file cũ hơn 7 ngày và chỉ giữ tối đa 7 bản gần nhất
        $deletedOld = 0;
        $files = array_merge(
            glob($backupDir . '/backup_sanbong_*.sql') ?: [],
            glob($backupDir . '/backup_sanbong_*.sql.gz') ?: [],
            glob($backupDir . '/backup_sanbong_*.sql.enc') ?: [],
            glob($backupDir . '/backup_sanbong_*.sql.gz.enc') ?: []
        );
        usort($files, static function ($a, $b) {
            return (@filemtime($b) ?: 0) <=> (@filemtime($a) ?: 0);
        });

        $sevenDaysAgo = time() - (7 * 86400);
        foreach ($files as $idx => $f) {
            if (realpath($f) === realpath($targetFile)) {
                continue;
            }
            $tooOld = (@filemtime($f) ?: time()) < $sevenDaysAgo;
            $overLimit = ($idx >= 7);
            if ($tooOld || $overLimit) {
                if (@unlink($f)) {
                    $deletedOld++;
                }
            }
        }

        $encKey = trim(getenv('BACKUP_ENCRYPTION_KEY') ?: ($_ENV['BACKUP_ENCRYPTION_KEY'] ?? ''));
        $encrypted = false;
        if ($encKey !== '' && file_exists($targetFile)) {
            $rawContent = @file_get_contents($targetFile);
            if ($rawContent !== false) {
                $iv = random_bytes(12);
                $tag = '';
                $derivedKey = hash('sha256', $encKey, true);
                $ciphertext = openssl_encrypt($rawContent, 'aes-256-gcm', $derivedKey, OPENSSL_RAW_DATA, $iv, $tag);
                if ($ciphertext !== false) {
                    $encFile = $targetFile . '.enc';
                    @file_put_contents($encFile, $iv . $tag . $ciphertext);
                    @unlink($targetFile);
                    $targetFile = $encFile;
                    $encrypted = true;
                }
            }
        }

        clearstatcache(true, $targetFile);
        $fileSize = @filesize($targetFile) ?: 0;
        $filename = basename($targetFile);
        if (function_exists('log_system_notification')) {
            log_system_notification(
                $pdo,
                null,
                null,
                'system',
                'system',
                'backup',
                'Sao lưu cơ sở dữ liệu: ' . $filename,
                "Đã sao lưu " . count($tables) . " bảng ({$totalRows} dòng), dung lượng " . round($fileSize / 1024, 1) . " KB. Đã dọn {$deletedOld} bản cũ.",
                'sent',
                $filename
            );
        }

        return [
            'success'      => true,
            'filename'     => $filename,
            'file_size'    => $fileSize,
            'compressed'   => $wantGzip,
            'tables_count' => count($tables),
            'total_rows'   => $totalRows,
            'purged_old'   => $deletedOld
        ];
    }
}

if (!$isLibOnly) {
    $isCli = (php_sapi_name() === 'cli' || PHP_SAPI === 'cli');

    if (!$isCli) {
        loadEnv();
        $cronSecret = trim($_ENV['CRON_SECRET'] ?? getenv('CRON_SECRET') ?: '');
        $provided   = trim((string)($_SERVER['HTTP_X_CRON_SECRET'] ?? ''));

        $authorized = ($cronSecret !== '' && $provided !== '' && hash_equals($cronSecret, $provided));

        if (!$authorized) {
            http_response_code(403);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'success'  => false,
                'message'  => 'Forbidden: Cron backup endpoint only allows CLI or valid X-Cron-Secret header.',
                'ref_code' => 'ERR_FORBIDDEN'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
        header('Content-Type: application/json; charset=utf-8');
    }

    $logDir = __DIR__ . '/../logs';
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0750, true);
    }
    $lockPath = $logDir . '/.cron_backup.lock';
    $lockFp = @fopen($lockPath, 'c+');
    if (!$lockFp || !@flock($lockFp, LOCK_EX | LOCK_NB)) {
        if ($lockFp) {
            @fclose($lockFp);
        }
        echo json_encode([
            'success'   => true,
            'skipped'   => 'locked',
            'timestamp' => date('c'),
            'message'   => 'Tiến trình sao lưu khác đang chạy.'
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . PHP_EOL;
        exit(0);
    }

    loadEnv();
    $customBackupDir = trim(getenv('BACKUP_DIR') ?: ($_ENV['BACKUP_DIR'] ?? ''));
    if ($customBackupDir === '') {
        $parentBackup = dirname(__DIR__, 2) . '/backup';
        if (is_dir($parentBackup) && is_writable($parentBackup)) {
            $customBackupDir = $parentBackup;
        }
    }
    $backupDir = ($customBackupDir !== '' && (is_dir($customBackupDir) || @mkdir($customBackupDir, 0750, true))) ? rtrim($customBackupDir, '/\\') : __DIR__ . '/../backups';
    $pdo = getDBConnection(false);
    $ext = function_exists('gzopen') ? '.sql.gz' : '.sql';
    $filename = 'backup_sanbong_' . date('Ymd_His') . $ext;
    $targetPath = $backupDir . '/' . $filename;

    $result = $pdo ? generate_database_dump($pdo, $targetPath) : ['success' => false, 'message' => 'Không kết nối được DB'];

    @flock($lockFp, LOCK_UN);
    @fclose($lockFp);

    echo json_encode([
        'success'   => !empty($result['success']),
        'timestamp' => date('c'),
        'data'      => $result
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . PHP_EOL;
}
