const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = path.resolve(__dirname, '..');
const jsPath = path.join(rootDir, 'js', 'admin_logs.js');
const registryPath = path.join(rootDir, 'api', 'services', 'AdminLogRegistry.php');

const jsCode = fs.readFileSync(jsPath, 'utf8');
const registryCode = fs.readFileSync(registryPath, 'utf8');

const sandbox = { window: {}, URLSearchParams, Set, Array, Object, Number, String, Boolean, JSON, Intl, Date, Math, console };
sandbox.window = sandbox;
vm.runInNewContext(jsCode, sandbox);

const catalog = sandbox.ADMIN_LOG_CATALOG;
assert.ok(catalog && typeof catalog === 'object', 'ADMIN_LOG_CATALOG phải tồn tại');
assert.ok(catalog.actions && typeof catalog.actions === 'object', 'ADMIN_LOG_CATALOG.actions phải tồn tại');

// 1. Kiểm tra đúng 6 mã nhóm chuẩn TD, XH, CN, CB, TQ, TT và shortCode hiển thị TD, XHC, CN, CB, TQ, AUTO
const expectedCategories = ['TD', 'XH', 'CN', 'CB', 'TQ', 'TT'];
const catKeys = Object.keys(catalog.categories || {});
assert.deepStrictEqual(catKeys.sort(), expectedCategories.slice().sort(), 'Phải có đúng 6 mã nhóm TD, XH, CN, CB, TQ, TT');
const expectedShortCodes = { TD: 'TD', XH: 'XHC', CN: 'CN', CB: 'CB', TQ: 'TQ', TT: 'AUTO' };
const actualShortCodes = expectedCategories.map((k) => catalog.categories[k]?.shortCode);
assert.deepStrictEqual(actualShortCodes, ['TD', 'XHC', 'CN', 'CB', 'TQ', 'AUTO'], 'shortCode phải đủ TD, XHC, CN, CB, TQ, AUTO');
for (const [key, sc] of Object.entries(expectedShortCodes)) {
    assert.strictEqual(catalog.categories[key]?.shortCode, sc, `shortCode của ${key} phải là ${sc}`);
}

const allowedDataGroups = new Set([
    'Ca trực',
    'Tiền & đặt cọc',
    'Hội viên & điểm',
    'Giá & voucher',
    'Sân & Lịch đặt',
    'Cài đặt',
    'Nhân sự & Bảo mật',
    'Khác'
]);
assert.deepStrictEqual(Array.from(allowedDataGroups), Array.from(catalog.dataGroups), 'Danh sách nhóm dữ liệu phải khớp chuẩn 7+1 nhóm');

// 2. Quét toàn bộ file PHP tìm mọi mã action log
function collectPhpFiles(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (['.git', 'vendor', 'node_modules', 'tests', 'scratch'].includes(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) collectPhpFiles(full, out);
        else if (entry.name.endsWith('.php')) out.push(full);
    }
    return out;
}

const phpFiles = collectPhpFiles(rootDir);
const discoveredActions = new Set();
const patterns = [
    /(?:write_audit_log|logAdminChange|log_admin_change)\s*\(\s*\$[^,;()]+?\s*,\s*['"]([A-Za-z0-9_]+)['"]/g,
    /(?:AdminLogService::record|self::record)\s*\(\s*\$[^,;]+?\s*,\s*[^,;]+?\s*,\s*['"]([A-Za-z0-9_]+)['"]/g
];

for (const file of phpFiles) {
    const content = fs.readFileSync(file, 'utf8');
    for (const re of patterns) {
        let m;
        while ((m = re.exec(content)) !== null) {
            discoveredActions.add(m[1]);
        }
    }
}

// Quét thêm toàn bộ keys + (category, data_group) trong AdminLogRegistry::ACTIONS để đảm bảo JS & PHP khớp 100%
const actionsBlockMatch = registryCode.match(/public const ACTIONS = \[([\s\S]*?)\n    \];/);
assert.ok(actionsBlockMatch, 'Không tìm thấy public const ACTIONS trong AdminLogRegistry.php');
const phpRegistryActions = {};
const regEntryRe = /^\s*'([A-Za-z0-9_]+)'\s*=>\s*\[[^\]]*'category'\s*=>\s*'([A-Z]{2})'[^\]]*'data_group'\s*=>\s*'([^']+)'/gm;
let rm;
while ((rm = regEntryRe.exec(actionsBlockMatch[1])) !== null) {
    phpRegistryActions[rm[1]] = { category: rm[2], dataGroup: rm[3] };
    discoveredActions.add(rm[1]);
}

assert.ok(Object.keys(phpRegistryActions).length >= 100, `AdminLogRegistry::ACTIONS phải có >= 100 action, hiện có ${Object.keys(phpRegistryActions).length}`);

// 3. Đảm bảo mọi mã PHP + 4 mã mới đều được map đầy đủ trong JS lẫn AdminLogRegistry.php
const requiredNewCodes = ['SHIFT_EDIT_COUNT', 'AUDIT_REVIEW', 'EXPORT_CSV', 'SENSITIVE_DATA_ACCESS'];
for (const code of [...discoveredActions, ...requiredNewCodes]) {
    const canonCode = catalog.actions[code] ? code : code.toUpperCase();
    const entry = catalog.actions[code] || catalog.actions[code.toUpperCase()];
    assert.ok(entry, `Thiếu mã action "${code}" trong js/admin_logs.js ADMIN_LOG_CATALOG.actions`);
    assert.ok(entry.label && entry.label.trim().length > 0, `Action "${code}" thiếu nhãn tiếng Việt`);
    assert.ok(expectedCategories.includes(entry.category), `Action "${code}" có category không hợp lệ: ${entry.category}`);
    assert.ok(allowedDataGroups.has(entry.dataGroup), `Action "${code}" có dataGroup không hợp lệ: ${entry.dataGroup}`);
    const regMeta = phpRegistryActions[code] || phpRegistryActions[canonCode];
    assert.ok(regMeta, `Thiếu mã action "${code}" trong AdminLogRegistry.php`);
    assert.strictEqual(entry.category, regMeta.category, `Lệch category giữa JS và PHP cho "${code}": JS=${entry.category}, PHP=${regMeta.category}`);
    assert.strictEqual(entry.dataGroup, regMeta.dataGroup, `Lệch dataGroup giữa JS và PHP cho "${code}": JS=${entry.dataGroup}, PHP=${regMeta.dataGroup}`);
}

// 4. Đảm bảo JS không chứa mã thừa không có trong AdminLogRegistry::ACTIONS và toàn bộ cặp khớp 100%
const jsKeys = Object.keys(catalog.actions).sort();
const phpKeys = Object.keys(phpRegistryActions).sort();
assert.deepStrictEqual(jsKeys, phpKeys, 'Danh sách khóa action trong JS ADMIN_LOG_CATALOG.actions và PHP AdminLogRegistry::ACTIONS phải khớp 100%');
assert.ok(!catalog.actions.TEST_TELEGRAM, 'Không được giữ mã phantom TEST_TELEGRAM trong JS catalog');

for (const [code, entry] of Object.entries(catalog.actions)) {
    assert.ok(entry.label && typeof entry.label === 'string', `${code}: label không hợp lệ`);
    assert.ok(expectedCategories.includes(entry.category), `${code}: category ${entry.category} không thuộc 6 nhóm`);
    assert.ok(allowedDataGroups.has(entry.dataGroup), `${code}: dataGroup ${entry.dataGroup} không hợp lệ`);
}

console.log(`PASS test_admin_log_action_catalog: ${jsKeys.length} JS & PHP actions synced 100% (${discoveredActions.size} scanned).`);
