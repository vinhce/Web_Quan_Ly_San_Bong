<?php
/**
 * Router for PHP built-in development server (`php -S`).
 * Replicates Apache `.htaccess` Clean URLs and security rules for local dev.
 */

$root = dirname(__DIR__);
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$parsed = parse_url($requestUri);
$rawPath = rawurldecode($parsed['path'] ?? '/');
$path = '/' . ltrim($rawPath, '/');
$relPath = ltrim($path, '/');
$query = isset($parsed['query']) && $parsed['query'] !== '' ? '?' . $parsed['query'] : '';

$serveError = static function (int $code, string $file) use ($root): bool {
    http_response_code($code);
    $full = $root . '/html/' . $file;
    if (is_file($full)) {
        header('Content-Type: text/html; charset=utf-8');
        readfile($full);
    } else {
        echo $code . ' Error';
    }
    return true;
};

// 1. Block hidden files/dirs (except .well-known)
if (!preg_match('#(^|/)\.well-known(/|$)#i', $relPath) && preg_match('#(^|/)\.#', $relPath)) {
    return $serveError(403, '403.html');
}

// 2. Block direct access to api/*.json, api/*.log, logs/*.json, logs/*.log
if (preg_match('#^(api|logs)/.*\.(json|log)$#i', $relPath)) {
    return $serveError(403, '403.html');
}

// 3. Block internal directories
if (preg_match('#^(config|database|sql|logs|scripts|backups|cron|portal-admin/partials|docs|tests|node_modules)(/|$)#i', $relPath)) {
    return $serveError(403, '403.html');
}

// 4. Block sensitive files
$baseName = basename($relPath);
if ($baseName !== '' && preg_match('/^(\.env(\..*)?|\.git.*|\.agents|.*\.sql(\.gz)?|.*\.bak|.*\.log|.*\.tmp|.*\.md|.*\.py|composer\.(json|lock)|package(-lock)?\.json|phpinfo\.php|adminer\.php|sepay_paid_orders\.json|expected_orders\.json|rate_limits\.json|test_pitches\.php|test_.*\.php)$/i', $baseName)) {
    return $serveError(403, '403.html');
}

// 5. Redirects (301) matching .htaccess
if (preg_match('#^(.*)index\.html$#i', $relPath, $m)) {
    $target = '/' . ltrim($m[1], '/');
    header('Location: ' . $target . $query, true, 301);
    return true;
}

if (preg_match('#^(html/)?admin(\.html)?/?$#i', $relPath)) {
    header('Location: /portal-admin/' . $query, true, 301);
    return true;
}

if (preg_match('#^register/?$#i', $relPath)) {
    $sep = $query !== '' ? '&' : '?';
    $q = $query !== '' ? str_replace('?', '', $query) : '';
    $loc = '/login?tab=register' . ($q !== '' ? '&' . $q : '');
    header('Location: ' . $loc, true, 301);
    return true;
}

$cleanPages = 'fields|booking|checkout|success|history|login|field-detail|matchmaking|forgot-password';
if (preg_match('#^(?:html/)?(' . $cleanPages . ')\.html$#i', $relPath, $m)) {
    header('Location: /' . strtolower($m[1]) . $query, true, 301);
    return true;
}

// 6. Internal rewrites
if (preg_match('#^portal-admin(/index\.html)?/?$#i', $relPath)) {
    $target = $root . '/portal-admin/index.php';
    if (is_file($target)) {
        chdir($root . '/portal-admin');
        require $target;
        return true;
    }
}

if (preg_match('#^(' . $cleanPages . ')/?$#i', $relPath, $m)) {
    $target = $root . '/html/' . strtolower($m[1]) . '.html';
    if (is_file($target)) {
        header('Content-Type: text/html; charset=utf-8');
        readfile($target);
        return true;
    }
}

// 7. Root index
if ($relPath === '') {
    if (is_file($root . '/index.php')) {
        require $root . '/index.php';
        return true;
    }
    if (is_file($root . '/index.html')) {
        header('Content-Type: text/html; charset=utf-8');
        readfile($root . '/index.html');
        return true;
    }
}

// 8. Existing file or directory
$fullPath = realpath($root . '/' . $relPath);
if ($fullPath !== false && strpos($fullPath, realpath($root)) === 0) {
    if (is_file($fullPath)) {
        return false; // Let PHP built-in server handle static assets and .php scripts
    }
    if (is_dir($fullPath)) {
        if (is_file($fullPath . '/index.php')) {
            chdir($fullPath);
            require $fullPath . '/index.php';
            return true;
        }
        if (is_file($fullPath . '/index.html')) {
            header('Content-Type: text/html; charset=utf-8');
            readfile($fullPath . '/index.html');
            return true;
        }
        return $serveError(403, '403.html');
    }
}

return $serveError(404, '404.html');
