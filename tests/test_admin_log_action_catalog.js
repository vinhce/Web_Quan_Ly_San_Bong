const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'admin_logs.js'), 'utf8');
const sandbox = {
  window: {},
  document: { getElementById: () => null },
  console: { warn: () => {}, error: () => {} },
  URLSearchParams,
  setTimeout,
  clearTimeout
};
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'admin_logs.js' });
const catalog = vm.runInContext('ADMIN_LOG_CATALOG', sandbox);
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

const expectedGroups = [
  'Giá & khuyến mãi',
  'Tiền & đặt cọc',
  'Đặt sân',
  'Ca trực',
  'Hội viên & điểm',
  'Sân & cài đặt',
  'Bảo mật',
  'Hệ thống tự động'
];
const groupLabels = new Set(catalog.groups.map(group => group.label));
for (const label of expectedGroups) {
  assert(groupLabels.has(label), `Thiếu nhóm "${label}"`);
}

for (const [code, info] of Object.entries(catalog.actions)) {
  assert(info.label && info.label.trim() !== '', `Thiếu nhãn cho ${code}`);
  assert(groupLabels.has(catalog.groups.find(group => group.key === info.group)?.label), `Nhóm không hợp lệ cho ${code}`);
}

const requiredLabels = {
  UPDATE_PRICING: 'Cập nhật giá sân',
  VOUCHER_SAVE: 'Lưu voucher',
  VOUCHER_DELETE: 'Xóa voucher',
  COLLECT_PAYMENT: 'Thu tiền',
  RECONCILE_RESOLVE: 'Xử lý đối soát',
  WEBHOOK_UNMATCHED: 'Giao dịch ngân hàng không khớp đơn',
  CHECKIN: 'Check-in',
  ADD_SERVICE: 'Thêm dịch vụ vào đơn',
  ADD_OVERTIME: 'Thêm giờ đá',
  RESTORE_BOOKING: 'Khôi phục đơn',
  SHIFT_CONFIRM: 'Xác nhận chốt ca',
  PITCH_UPSERT: 'Thêm/sửa sân',
  ENABLE_2FA: 'Bật xác thực 2 bước',
  AUTO_CANCEL_EXPIRED: 'Tự động hủy đơn quá hạn',
  RUN_REMINDERS: 'Chạy nhắc lịch'
};
for (const [code, label] of Object.entries(requiredLabels)) {
  assert(catalog.actions[code]?.label === label, `Nhãn không đúng cho ${code}`);
}

const mappedCodes = new Set(Object.keys(catalog.actions).map(code => code.toUpperCase()));
const usedCodes = new Set();
const unresolvedDynamicActions = [];

function scanPhpFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const assignments = new Map();
  for (const match of source.matchAll(/\$([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(['"])([A-Za-z_][A-Za-z0-9_]*)\2/g)) {
    const values = assignments.get(match[1]) || [];
    values.push(match[3]);
    assignments.set(match[1], values);
  }

  const patterns = [
    { regex: /write_audit_log\s*\(\s*[^,]+,\s*((['"])([A-Za-z_][A-Za-z0-9_]*)\2|\$([A-Za-z_][A-Za-z0-9_]*))/gs, actionIndex: 3, variableIndex: 4 },
    { regex: /AdminLogService::record\s*\(\s*[^,]+,\s*[^,]+,\s*((['"])([A-Za-z_][A-Za-z0-9_]*)\2|\$([A-Za-z_][A-Za-z0-9_]*))/gs, actionIndex: 3, variableIndex: 4 }
  ];

  for (const { regex, actionIndex, variableIndex } of patterns) {
    for (const match of source.matchAll(regex)) {
      if (/\bfunction\s+$/.test(source.slice(Math.max(0, match.index - 20), match.index))) continue;
      const literal = match[actionIndex];
      if (literal) {
        usedCodes.add(literal.toUpperCase());
        continue;
      }

      const variable = match[variableIndex];
      const values = assignments.get(variable) || [];
      if (values.length === 0) {
        unresolvedDynamicActions.push(`${path.relative(root, filePath)}: $${variable}`);
      } else {
        values.forEach(value => usedCodes.add(value.toUpperCase()));
      }
    }
  }
}

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'vendor' || entry.name === 'tests') continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    else if (entry.isFile() && entry.name.endsWith('.php')) scanPhpFile(fullPath);
  }
}

walk(root);
for (const code of [...usedCodes].sort()) {
  assert(mappedCodes.has(code), `Mã hành động đang được gọi nhưng chưa map: ${code}`);
}
for (const dynamicAction of unresolvedDynamicActions) {
  assert(false, `Không xác định được mã hành động động: ${dynamicAction}`);
}

const peakPrice = catalog.fields.price_p5_peak;
assert(peakPrice?.label === 'Sân 5 - Giờ cao điểm', 'Nhãn price_p5_peak không đúng');
assert(peakPrice?.format === 'currency', 'price_p5_peak phải được định dạng tiền');

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`PASS: ${usedCodes.size} mã hành động trong mã nguồn đều có mapping.`);
  console.log(`PASS: ${Object.keys(catalog.actions).length} mã đã biết, ${catalog.groups.length} nhóm.`);
}
