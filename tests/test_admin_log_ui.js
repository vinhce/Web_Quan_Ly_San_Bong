const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'admin_logs.js'), 'utf8');
const template = fs.readFileSync(path.join(root, 'portal-admin', 'partials', 'tab11_admin_logs.php'), 'utf8');
const warnings = [];

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.value = '';
    this.textContent = '';
    this.innerHTML = '';
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }
}

const elements = {
  'admin-log-filter-staff': new FakeElement('select'),
  'admin-log-filter-action': new FakeElement('select'),
  'admin-log-tbody': new FakeElement('tbody')
};
const sandbox = {
  console: { warn: (...args) => warnings.push(args), error: () => {} },
  document: {
    getElementById: id => elements[id] || null,
    createElement: tagName => new FakeElement(tagName)
  },
  window: {},
  fetch: async () => { throw new Error('Unexpected network request'); },
  URLSearchParams,
  setTimeout,
  clearTimeout
};

vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'admin_logs.js' });
const catalog = vm.runInContext('ADMIN_LOG_CATALOG', sandbox);

vm.runInContext("populateAdminLogFilters([], ['UNKNOWN_ACTION']);", sandbox);

const actionSelect = elements['admin-log-filter-action'];
const groups = actionSelect.children.filter(child => child.tagName === 'optgroup');
assert.deepStrictEqual(groups.map(group => group.label), Array.from(catalog.groups, group => group.label));

const pricingGroup = groups.find(group => group.label === 'Giá & khuyến mãi');
assert(pricingGroup.children.some(option => option.value === '__group__:pricing'));
const pricingAction = pricingGroup.children.find(option => option.value.split(',').includes('UPDATE_PRICING'));
assert.strictEqual(pricingAction.textContent, 'Cập nhật giá sân');
assert(!pricingAction.textContent.includes('UPDATE_PRICING'));

const otherGroup = groups.find(group => group.label === 'Khác');
assert(otherGroup.children.some(option => option.value === 'UNKNOWN_ACTION' && option.textContent === 'UNKNOWN_ACTION'));
assert.strictEqual(warnings.length, 1, 'Mã chưa map cần cảnh báo đúng một lần');

assert.strictEqual(vm.runInContext("getActionDisplayLabel('UPDATE_PRICING')", sandbox), 'Cập nhật giá sân');
assert.strictEqual(vm.runInContext("getActionDisplayLabel('update_price')", sandbox), 'Cập nhật giá sân');
assert.strictEqual(vm.runInContext("getActionDisplayLabel('update_info')", sandbox), 'Sửa thông tin');
assert.strictEqual(vm.runInContext("formatAdminLogTimestamp('2026-11-16 02:50:12')", sandbox), '16/11/2026 02:50');
assert.strictEqual(vm.runInContext("formatAdminLogValue('price_p5_peak', 380000)", sandbox), '380.000đ');
assert(vm.runInContext("getActionCodesForGroup('pricing', []).includes('UPDATE_PRICING')", sandbox));
assert.deepStrictEqual(
  Array.from(vm.runInContext("getActionCodesForGroup('other', ['UNKNOWN_ACTION'])", sandbox)),
  ['UNKNOWN_ACTION']
);
const priceDiff = vm.runInContext("renderLogDiffContent('{\"price_p5_peak\":300000}', '{\"price_p5_peak\":380000}')", sandbox);
assert(priceDiff.includes('Sân 5 - Giờ cao điểm'));
assert(priceDiff.includes('380.000đ'));
assert(priceDiff.includes('<del class="text-rose-700">300.000đ</del>'));
assert(priceDiff.includes('<strong class="text-emerald-800">380.000đ</strong>'));
assert(!priceDiff.includes('<details'));

const pitchStatusDiff = vm.runInContext(
  "renderLogDiffContent('Hoạt động', 'Bảo trì (Lý do: sửa mặt sân)', 'PITCH_STATUS')",
  sandbox
);
assert(pitchStatusDiff.includes('- Trạng thái:'));
assert(pitchStatusDiff.includes('Hoạt động'));
assert(pitchStatusDiff.includes('Bảo trì (Lý do: sửa mặt sân)'));
assert(!pitchStatusDiff.includes('- Giá trị:'));

const singlePriceChange = vm.runInContext(
  "renderLogDiffContent('{\"price_p5_base\":250000,\"price_p5_peak\":300000}', '{\"price_p5_base\":270000,\"price_p5_peak\":300000}', 'UPDATE_PRICING')",
  sandbox
);
assert(singlePriceChange.includes('Sân 5 - Giá thường'));
assert(!singlePriceChange.includes('Sân 5 - Giờ cao điểm'));
assert.strictEqual((singlePriceChange.match(/<del /g) || []).length, 1);

const unknownKeyDiff = vm.runInContext(
  "renderLogDiffContent('{\"custom_field\":1}', '{\"custom_field\":2}', 'UNKNOWN_ACTION')",
  sandbox
);
assert(unknownKeyDiff.includes('- custom_field:'));
assert(!unknownKeyDiff.includes('- Giá trị:'));

const sameValuesDifferentOrder = vm.runInContext(
  "renderLogDiffContent('{\"price_p5_peak\":300000,\"price_p5_base\":250000}', '{\"price_p5_base\":250000,\"price_p5_peak\":300000}')",
  sandbox
);
assert(sameValuesDifferentOrder.includes('Không có thay đổi giá trị'));
assert(!sameValuesDifferentOrder.includes('Sân 5 -'));

const missingValue = vm.runInContext(
  "renderLogDiffContent('{\"price_p5_peak\":300000}', '{}')",
  sandbox
);
assert(missingValue.includes('300.000đ'));
assert(missingValue.includes('>—</strong>'));

const unchangedValues = vm.runInContext(
  "renderLogDiffContent('{\"status\":\"active\"}', '{\"status\":\"active\"}')",
  sandbox
);
assert(unchangedValues.includes('Không có thay đổi giá trị'));

const malformedJson = vm.runInContext(
  `renderLogDiffContent(${JSON.stringify('{"broken":'.padEnd(180, 'x'))}, 'plain text')`,
  sandbox
);
assert(malformedJson.includes('<details'));
assert(malformedJson.includes('Xem thêm'));
assert(malformedJson.includes('overflow-x-hidden'));
assert(malformedJson.includes('break-all'));
assert(malformedJson.includes('…'));

const manyFields = vm.runInContext(
  `renderLogDiffContent('{}', ${JSON.stringify(JSON.stringify({ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 }))})`,
  sandbox
);
assert(manyFields.includes('<details'));
assert(!manyFields.includes('<details open'));
assert(manyFields.includes('6 trường thay đổi'));

const arrayPriceDiff = vm.runInContext(
  "renderLogDiffContent('[{\"price_p5_base\":\"250000\"}]', '[{\"price_p5_base\":\"300000\"}]')",
  sandbox
);
assert(arrayPriceDiff.includes('Sân 5 - Giá thường'));
assert(arrayPriceDiff.includes('300.000đ'));
assert(!arrayPriceDiff.includes('[{\"price_p5_base\"'));

const rawPricingSnapshot = JSON.stringify({ price_p5_base: '250000', price_p5_peak: '300000' });
vm.runInContext(`renderAdminLogTable([{
  id: 2,
  action: 'UPDATE_PRICING',
  created_at_formatted: '16/11/2026 02:50',
  actor_name: 'Admin',
  actor_role: 'admin',
  user_id: 1,
  old_value: ${JSON.stringify(rawPricingSnapshot)},
  new_value: ${JSON.stringify(JSON.stringify({ price_p5_base: '260000', price_p5_peak: '310000' }))},
  formatted_message: ${JSON.stringify(`Admin thực hiện update pricing: ${rawPricingSnapshot} -> ${rawPricingSnapshot}`)}
}], [{ id: 1, username: 'vxyen0801', role: 'admin' }]);`, sandbox);
const pricingRow = elements['admin-log-tbody'].innerHTML;
assert(pricingRow.includes('Sân 5 - Giá thường'));
assert(pricingRow.includes('Sân 5 - Giờ cao điểm'));
assert(pricingRow.includes('260.000đ'));
assert(!pricingRow.includes('Admin thực hiện update pricing:'));
assert(pricingRow.includes('Chủ sân'));
assert(pricingRow.includes('(vxyen0801)'));
assert(pricingRow.includes('Hành động:'));
assert(pricingRow.includes('16/11/2026 02:50'));
assert.strictEqual((pricingRow.match(/<td /g) || []).length, (template.match(/<th /g) || []).length);
assert(template.includes('w-[260px] min-w-[220px]'));
assert(source.includes('min-w-[220px] whitespace-nowrap'));
assert(source.includes('inline-flex w-fit whitespace-nowrap'));
assert(!source.match(/inline-flex w-fit whitespace-nowrap[^"]*max-w-/));

vm.runInContext(`renderAdminLogTable([{
  id: 1,
  action: 'AUTO_CANCEL_EXPIRED',
  actor_name: 'Should not be shown',
  actor_role: 'system',
  user_id: null
}]);`, sandbox);
const rendered = elements['admin-log-tbody'].innerHTML;
assert(rendered.includes('Hệ thống (tự động)'));
assert(!rendered.includes('Should not be shown'));
assert(rendered.includes('Tự động hủy đơn quá hạn'));
assert(rendered.includes('Mã kỹ thuật: AUTO_CANCEL_EXPIRED'));

const targetPricing = vm.runInContext("resolveAdminLogTarget({ action: 'UPDATE_PRICING' })", sandbox);
assert.strictEqual(targetPricing.typeLabel, 'Bảng giá');
assert.strictEqual(targetPricing.idText, 'Bảng giá sân');

const target2FA = vm.runInContext("resolveAdminLogTarget({ action: 'ENABLE_2FA' })", sandbox);
assert.strictEqual(target2FA.typeLabel, 'Bảo mật');
assert.strictEqual(target2FA.idText, 'Xác thực 2FA');

const targetPitch = vm.runInContext("resolveAdminLogTarget({ action: 'PITCH_STATUS', target_id: 'P5-A' })", sandbox);
assert.strictEqual(targetPitch.typeLabel, 'Sân');
assert.strictEqual(targetPitch.idText, 'P5-A');

const targetBooking = vm.runInContext("resolveAdminLogTarget({ action: 'CHECKIN', booking_id: 'A5FF725506' })", sandbox);
assert.strictEqual(targetBooking.typeLabel, 'Mã ca');
assert.strictEqual(targetBooking.idText, 'A5FF725506');

console.log('PASS: nhãn, nhóm, bộ lọc, định dạng tiền và actor hệ thống.');
