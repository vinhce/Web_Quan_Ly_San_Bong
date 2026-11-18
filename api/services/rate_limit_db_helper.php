<?php
/**
 * Rate Limit Database Fallback Helper
 * Chịu trách nhiệm lưu trữ và truy vấn rate limit dự phòng vào DB khi file log bị lỗi (Fail-closed & DB fallback)
 */

if (!defined('SANBONG_APP')) {
    define('SANBONG_APP', true);
}

function _rate_limit_db_key(string $action, ?string $identifier = null): array {
    $act = substr(preg_replace('/[^a-zA-Z0-9_\-]/', '_', strtolower(trim($action))), 0, 50);
    $ip = function_exists('get_client_ip') ? get_client_ip() : '127.0.0.1';
    $key = (in_array($act, ['login_acct', 'forgot_pw_acct'], true) && !empty($identifier))
        ? strtolower(trim($identifier))
        : (!empty($identifier) ? $ip . '|' . strtolower(trim($identifier)) : $ip);
    return [$act, strlen($key) > 45 ? substr(hash('sha256', $key), 0, 45) : $key];
}

function _rate_limit_db_check($pdo, string $action, ?string $identifier, int $maxAttempts, int $decaySeconds): ?bool {
    if (!$pdo instanceof PDO) return null;
    try {
        [$act, $ipKey] = _rate_limit_db_key($action, $identifier);
        $row = null;
        try {
            $stmt = $pdo->prepare("SELECT * FROM rate_limits WHERE action = ? AND ip_address = ? LIMIT 1");
            $stmt->execute([$act, $ipKey]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            $stmt = $pdo->prepare("SELECT * FROM rate_limits WHERE action = ? AND identifier = ? LIMIT 1");
            $stmt->execute([$act, $ipKey]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
        }
        if (!$row) return true;
        $now = time();
        $isExpired = !empty($row['expires_at'])
            ? (strtotime((string)$row['expires_at']) <= $now)
            : (!empty($row['last_attempt']) ? (($now - strtotime((string)$row['last_attempt'])) > $decaySeconds)
            : (!empty($row['last_attempt_at']) ? (($now - strtotime((string)$row['last_attempt_at'])) > $decaySeconds) : false));
        return $isExpired ? true : ((int)($row['attempts'] ?? 0) < $maxAttempts);
    } catch (\Throwable $e) {
        error_log("[SECURITY ERROR] DB rate limit query failed: " . $e->getMessage());
        return null;
    }
}

function _rate_limit_db_increment($pdo, string $action, ?string $identifier, int $decaySeconds): bool {
    if (!$pdo instanceof PDO) return false;
    try {
        [$act, $ipKey] = _rate_limit_db_key($action, $identifier);
        $now = time();
        $dtNow = date('Y-m-d H:i:s', $now);
        $expAt = date('Y-m-d H:i:s', $now + $decaySeconds);
        $row = null;
        $useId = false;
        try {
            $stmt = $pdo->prepare("SELECT * FROM rate_limits WHERE action = ? AND ip_address = ? LIMIT 1");
            $stmt->execute([$act, $ipKey]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            $useId = true;
            $stmt = $pdo->prepare("SELECT * FROM rate_limits WHERE action = ? AND identifier = ? LIMIT 1");
            $stmt->execute([$act, $ipKey]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
        }
        if ($row) {
            $exp = !empty($row['expires_at']) ? (strtotime((string)$row['expires_at']) <= $now)
                : (!empty($row['last_attempt']) ? (($now - strtotime((string)$row['last_attempt'])) > $decaySeconds)
                : (!empty($row['last_attempt_at']) && (($now - strtotime((string)$row['last_attempt_at'])) > $decaySeconds)));
            $newAttempts = $exp ? 1 : ((int)($row['attempts'] ?? 0) + 1);
            $cols = ["attempts = ?"];
            $params = [$newAttempts];
            if (array_key_exists('last_attempt', $row)) { $cols[] = "last_attempt = ?"; $params[] = $dtNow; }
            if (array_key_exists('last_attempt_at', $row)) { $cols[] = "last_attempt_at = ?"; $params[] = $dtNow; }
            if (array_key_exists('expires_at', $row)) { $cols[] = "expires_at = ?"; $params[] = $expAt; }
            $params[] = $row['id'] ?? 0;
            return $pdo->prepare("UPDATE rate_limits SET " . implode(', ', $cols) . " WHERE id = ?")->execute($params);
        }
        $col = $useId ? 'identifier' : 'ip_address';
        try {
            return $pdo->prepare("INSERT INTO rate_limits ({$col}, action, attempts, last_attempt) VALUES (?, ?, 1, ?)")->execute([$ipKey, $act, $dtNow]);
        } catch (\Throwable $e) {
            try {
                return $pdo->prepare("INSERT INTO rate_limits ({$col}, action, attempts, expires_at) VALUES (?, ?, 1, ?)")->execute([$ipKey, $act, $expAt]);
            } catch (\Throwable $e2) {
                return $pdo->prepare("INSERT INTO rate_limits ({$col}, action, attempts) VALUES (?, ?, 1)")->execute([$ipKey, $act]);
            }
        }
    } catch (\Throwable $e) {
        error_log("[SECURITY ERROR] DB rate limit increment failed: " . $e->getMessage());
        return false;
    }
}

function _rate_limit_db_clear($pdo, string $action, ?string $identifier = null): bool {
    if (!$pdo instanceof PDO) return false;
    try {
        [$act, $ipKey] = _rate_limit_db_key($action, $identifier);
        try {
            return $pdo->prepare("DELETE FROM rate_limits WHERE action = ? AND ip_address = ?")->execute([$act, $ipKey]);
        } catch (\Throwable $e) {
            return $pdo->prepare("DELETE FROM rate_limits WHERE action = ? AND identifier = ?")->execute([$act, $ipKey]);
        }
    } catch (\Throwable $e) {
        return false;
    }
}
