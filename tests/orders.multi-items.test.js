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

test('订单页桌面端应渲染首商品摘要并提供剩余商品查看入口', () => {
  assert.ok(/function\s+renderDesktopOrderProductCell\s*\(/.test(html));
  assert.ok(/order-product-cell/.test(html));
  assert.ok(/data-order-products-trigger/.test(html));
});

test('订单页移动端应渲染首商品摘要块', () => {
  assert.ok(/function\s+renderMobileFirstProduct\s*\(/.test(html));
  assert.ok(/mobile-order-first-product/.test(html));
});

test('订单页移动端首商品摘要的 +N件 应继续支持弹层触发', () => {
  assert.ok(/function\s+renderMobileFirstProduct\s*\(\s*order\s*,\s*orderItems\s*\)/.test(html));
  assert.ok(/mobile-first-product-more/.test(html));
  assert.ok(/data-order-products-trigger/.test(html));
  assert.ok(/toggleOrderProductsPopover\(event,\s*'\$\{order\.id\}'\)/.test(html));
});

test('移动端商品弹窗应限制在视口内，不能把页面撑宽', () => {
  assert.ok(/@media\s*\(max-width:\s*430px\)[\s\S]*\.order-products-popover\s*\{[\s\S]*width:\s*calc\(100vw\s*-\s*20px\);[\s\S]*max-width:\s*calc\(100vw\s*-\s*20px\);/.test(html));
  assert.ok(/function\s+positionOrderProductsPopover\s*\([\s\S]*window\.matchMedia\('\(max-width:\s*430px\)'\)\.matches[\s\S]*left\s*=\s*Math\.max\(10,\s*\(window\.innerWidth\s*-\s*width\)\s*\/\s*2\)/.test(html));
});

test('重复商品应继续按数量展开，用于首商品摘要统计与弹层明细', () => {
  assert.ok(/function\s+expandOrderItemsByQuantity\s*\(/.test(html));
  assert.ok(/function\s+getOrderPrimaryProduct[\s\S]*expandOrderItemsByQuantity/.test(html));
  assert.ok(/function\s+renderOrderProductsPopoverList[\s\S]*expandOrderItemsByQuantity/.test(html));
  assert.ok(!/product-qty/.test(html));
  assert.ok(!/mobile-order-product-qty/.test(html));
});

test('订单 mock 数据应包含至少一条多商品明细用于预览', () => {
  assert.ok(/orderItems\s*:\s*\[\s*\{[\s\S]*?\},\s*\{/.test(html));
});
