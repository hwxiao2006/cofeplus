const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'orders.html'), 'utf8');

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

test('订单页应显式引用共享 mock 数据源并声明 preview order 存储 key', () => {
  assert.ok(/<script src="shared\/admin-mock-data\.js"><\/script>/.test(html));
  assert.ok(/const\s+ORDERS_PREVIEW_RECORDS_KEY\s*=\s*'ordersPreviewRecords';/.test(html));
});

test('订单页应提供 shared source 运行时加载器与 fallback 订单生成器', () => {
  assert.ok(/function\s+loadRuntimeDevices\s*\(/.test(html));
  assert.ok(/function\s+loadRuntimeProducts\s*\(/.test(html));
  assert.ok(/function\s+loadPreviewOrders\s*\(/.test(html));
  assert.ok(/function\s+buildFallbackOrders\s*\(/.test(html));
  assert.ok(/function\s+loadOrdersData\s*\(/.test(html));
});

test('订单页应将分页条数提升到 20 条，并通过统一函数处理取单码显示', () => {
  assert.ok(/const\s+pageSize\s*=\s*20;/.test(html));
  assert.ok(/function\s+getOrderPickupCodeDisplay\s*\(order\)\s*\{[\s\S]*order\?\.status !== 'done'[\s\S]*return '--';/.test(html));
  assert.ok(/pickupCode:\s*String\(order\?\.pickupCode\s*\?\?\s*''\)/.test(html));
});

test('fallback 订单应允许部分订单没有取单码，处理中订单默认不生成取单码', () => {
  assert.ok(/pickupCode:\s*status === 'done' && index % 6 !== 0 \? buildFallbackPickupCode\(index\) : ''/.test(html));
});
