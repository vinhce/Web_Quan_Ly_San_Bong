const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const routerPath = path.join(__dirname, 'dev_router.php');
const host = process.env.DEV_HOST || 'localhost';
const port = process.env.DEV_PORT || '8000';

function findPhpExecutable() {
    const whichCmd = process.platform === 'win32' ? 'where' : 'which';
    const res = spawnSync(whichCmd, ['php'], { encoding: 'utf8' });
    if (res.status === 0 && res.stdout) {
        const first = res.stdout.split(/\r?\n/).find((l) => l.trim().length > 0);
        if (first && fs.existsSync(first.trim())) {
            return first.trim();
        }
    }

    if (process.platform === 'win32') {
        const laragonPhpDir = 'C:\\laragon\\bin\\php';
        if (fs.existsSync(laragonPhpDir)) {
            const dirs = fs.readdirSync(laragonPhpDir, { withFileTypes: true })
                .filter((d) => d.isDirectory())
                .map((d) => d.name)
                .sort()
                .reverse();
            for (const dir of dirs) {
                const candidate = path.join(laragonPhpDir, dir, 'php.exe');
                if (fs.existsSync(candidate)) {
                    return candidate;
                }
            }
        }
        const xamppPhp = 'C:\\xampp\\php\\php.exe';
        if (fs.existsSync(xamppPhp)) {
            return xamppPhp;
        }
    }

    return null;
}

function ensureEnvFile() {
    const envPath = path.join(rootDir, '.env');
    const examplePath = path.join(rootDir, '.env.example');
    if (!fs.existsSync(envPath) && fs.existsSync(examplePath)) {
        fs.copyFileSync(examplePath, envPath);
        console.log('[dev] Da tao file .env tu .env.example');
    }
}

function checkPortOpen(targetHost, targetPort) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(1000);
        socket.once('connect', () => {
            socket.destroy();
            resolve(true);
        });
        socket.once('timeout', () => {
            socket.destroy();
            resolve(false);
        });
        socket.once('error', () => {
            socket.destroy();
            resolve(false);
        });
        socket.connect(Number(targetPort), targetHost);
    });
}

function findMysqlExecutable() {
    if (process.platform !== 'win32') return null;
    const laragonMysqlDir = 'C:\\laragon\\bin\\mysql';
    if (!fs.existsSync(laragonMysqlDir)) return null;
    const dirs = fs.readdirSync(laragonMysqlDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort()
        .reverse();
    for (const dir of dirs) {
        const exe = path.join(laragonMysqlDir, dir, 'bin', 'mysqld.exe');
        const ini = path.join(laragonMysqlDir, dir, 'my.ini');
        if (fs.existsSync(exe)) {
            return { exe, ini: fs.existsSync(ini) ? ini : null };
        }
    }
    return null;
}

async function ensureMysqlRunning(dbHost, dbPort) {
    if (await checkPortOpen(dbHost, dbPort)) {
        return true;
    }
    const mysql = findMysqlExecutable();
    if (!mysql) {
        return false;
    }
    console.log(`[dev] MySQL (${dbHost}:${dbPort}) chua chay. Dang tu dong khoi dong MySQL...`);
    const args = mysql.ini ? [`--defaults-file=${mysql.ini}`] : [];
    const child = spawn(mysql.exe, args, {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
    });
    child.unref();

    for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 500));
        if (await checkPortOpen(dbHost, dbPort)) {
            console.log('[dev] MySQL da san sang.');
            return true;
        }
    }
    return false;
}

async function main() {
    ensureEnvFile();

    const phpBin = findPhpExecutable();
    if (!phpBin) {
        console.error('[dev] Khong tim thay PHP. Hay cai PHP hoac bat Laragon (C:\\laragon\\bin\\php).');
        process.exit(1);
    }

    const dbHost = process.env.DB_HOST || '127.0.0.1';
    const dbPort = process.env.DB_PORT || 3306;
    const mysqlUp = await ensureMysqlRunning(dbHost, dbPort);
    if (!mysqlUp) {
        console.warn(`[dev] Canh bao: Khong the ket noi MySQL (${dbHost}:${dbPort}). Hay mo Laragon va bam Start All.`);
    }

    console.log(`[dev] PHP: ${phpBin}`);
    console.log(`[dev] Trang khach hang: http://${host}:${port}/`);
    console.log(`[dev] Cong quan tri:   http://${host}:${port}/portal-admin/`);
    console.log('[dev] Nhan Ctrl+C de dung server.\n');

    const child = spawn(phpBin, ['-S', `${host}:${port}`, '-t', rootDir, routerPath], {
        cwd: rootDir,
        stdio: 'inherit',
    });

    child.on('exit', (code) => {
        process.exit(code ?? 0);
    });
}

main();
