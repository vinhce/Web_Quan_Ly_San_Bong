const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const customersScript = fs.readFileSync(path.join(root, 'js', 'admin_customers.js'), 'utf8');
const customersTemplate = fs.readFileSync(path.join(root, 'portal-admin', 'partials', 'tab6_customers.php'), 'utf8');
const tbody = { innerHTML: '' };
const searchInput = { value: '' };
const fixture = {
  phone: '0912345678',
  customer_name: 'Khách kiểm tra',
  customer_tier: 'regular',
  total_bookings: 2,
  completed_count: 1,
  noshow_count: 0,
  total_spent: 5745000,
  debt_amount: 4382000,
  points: 120,
  last_booking_date: '2026-11-15'
};
const sandbox = {
  window: {},
  document: {
    getElementById: id => {
      if (id === 'admin-customers-tbody') return tbody;
      if (id === 'admin-cust-search') return searchInput;
      return null;
    }
  },
  adminFetchJson: async () => ({ ok: true, data: [fixture] }),
  escapeSearchHTML: value => String(value ?? ''),
  escapeJsAttr: value => String(value ?? ''),
  setTimeout,
  clearTimeout,
  console
};

vm.createContext(sandbox);
vm.runInContext(customersScript, sandbox, { filename: 'admin_customers.js' });

(async () => {
  await vm.runInContext('renderAdminCustomers()', sandbox);

  const tableMatch = customersTemplate.match(/<table[^>]*min-w-\[1040px\][\s\S]*?<\/table>/);
  assert(tableMatch, 'Không tìm thấy bảng danh sách khách hàng');
  const headerCount = (tableMatch[0].match(/<th\b/g) || []).length;
  const rowMatch = tbody.innerHTML.match(/<tr\b[^>]*>([\s\S]*?)<\/tr>/);
  assert(rowMatch, 'Không render được dòng khách hàng fixture');
  const cellCount = (rowMatch[1].match(/<td\b/g) || []).length;
  assert.strictEqual(cellCount, headerCount, 'Số cột dữ liệu phải khớp số header');
  assert.strictEqual(headerCount, 8, 'Bảng CRM khách hàng phải có chính xác 8 cột (đã loại bỏ cột công nợ)');

  assert(tbody.innerHTML.includes('Tiêu chuẩn'), 'Tier regular cũ phải được chuẩn hóa hiển thị là Tiêu chuẩn');
  assert(!tbody.innerHTML.includes('Khách quen'), 'Không còn hiển thị nhãn Khách quen cũ');
  assert(tbody.innerHTML.includes('120 điểm'));
  assert(tbody.innerHTML.includes('5.745.000đ'));
  assert(!tbody.innerHTML.includes('4.382.000đ'), 'Không được hiển thị số nợ cũ 4.382.000đ');
  assert(!tbody.innerHTML.includes('Công nợ'), 'Không được xuất hiện từ khóa Công nợ trong tbody');
  assert.strictEqual(vm.runInContext("formatAdminCustomerBookingDate('')", sandbox), '—');
  assert.strictEqual(vm.runInContext("normalizeCustomerPhone('+84 912 345 678')", sandbox), '0912345678');

  console.log('PASS: chính xác 8 cột chuẩn, render điểm tích lũy, tổng chi tiêu và xóa sạch công nợ.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
