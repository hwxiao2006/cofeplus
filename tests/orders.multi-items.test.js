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

test('订单页应提供多商品归一化与数量统计函数', () => {
  assert.ok(/function\s+normalizeOrderItems\s*\(/.test(html));
  assert.ok(/function\s+resolveOrderItemCount\s*\(/.test(html));
});

test('订单页桌面端应渲染商品列表而不是单商品字段', () => {
  assert.ok(/function\s+renderDesktopOrderProducts\s*\(/.test(html));
  assert.ok(/class="product-list"/.test(html));
});

test('订单页移动端应渲染多商品列表', () => {
  assert.ok(/function\s+renderMobileOrderProducts\s*\(/.test(html));
  assert.ok(/mobile-order-product-list/.test(html));
});

test('重复商品应按数量展开成多行，而不是显示 xN 标签', () => {
  assert.ok(/function\s+expandOrderItemsByQuantity\s*\(/.test(html));
  assert.ok(/renderDesktopOrderProducts[\s\S]*expandOrderItemsByQuantity/.test(html));
  assert.ok(/renderMobileOrderProducts[\s\S]*expandOrderItemsByQuantity/.test(html));
  assert.ok(!/product-qty/.test(html));
  assert.ok(!/mobile-order-product-qty/.test(html));
});

test('订单 mock 数据应包含至少一条多商品明细用于预览', () => {
  assert.ok(/orderItems\s*:\s*\[\s*\{[\s\S]*?\},\s*\{/.test(html));
});
