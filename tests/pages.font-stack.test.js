const assert = require('assert');
const fs = require('fs');
const path = require('path');

const expectedBodyFont = "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;";
const pageFiles = [
  'customers.html',
  'device-entry.html',
  'devices.html',
  'faults.html',
  'login-paper.html',
  'locations.html',
  'materials-orders.html',
  'materials-refill.html',
  'materials.html',
  'menu-management.html',
  'menu.html',
  'orders.html',
  'overview.html',
  'product-detail.html',
  'product-management.html',
  'staff-management.html'
];

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.message);
    process.exitCode = 1;
  }
}

test('主要页面 body 字体应统一为 overview 的系统字体栈', () => {
  pageFiles.forEach(file => {
    const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert.ok(
      html.includes(expectedBodyFont),
      `${file} missing expected body font stack`
    );
  });
});

test('订单与设备页面不应继续依赖外链展示字体', () => {
  const ordersHtml = fs.readFileSync(path.join(__dirname, '..', 'orders.html'), 'utf8');
  const devicesHtml = fs.readFileSync(path.join(__dirname, '..', 'devices.html'), 'utf8');

  assert.ok(!/fonts\.googleapis\.com/.test(ordersHtml), 'orders.html still imports web fonts');
  assert.ok(!/fonts\.googleapis\.com/.test(devicesHtml), 'devices.html still imports web fonts');
});

test('订单页订单号应跟随页面主字体栈', () => {
  const ordersHtml = fs.readFileSync(path.join(__dirname, '..', 'orders.html'), 'utf8');
  assert.ok(!/\.mobile-order-id\s*\{[\s\S]*font-family:\s*'DM Sans'/.test(ordersHtml));
});
