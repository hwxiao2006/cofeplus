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

test('正式订单页应使用方案 C 的桌面表格工作区', () => {
  assert.ok(/order-table-shell/.test(html), 'missing order table shell');
  assert.ok(/orders-desktop-table/.test(html), 'missing desktop table');
  assert.ok(/<th>点位<\/th>[\s\S]*<th>商品<\/th>[\s\S]*<th>时间<\/th>[\s\S]*<th>设备<\/th>[\s\S]*<th>取货码<\/th>[\s\S]*<th>订单号<\/th>[\s\S]*<th class="sticky-col sticky-status">状态<\/th>[\s\S]*<th class="sticky-col sticky-amount"/.test(html), 'desktop column order should place order id before sticky status');
  ['点位', '商品', '时间', '设备', '取货码', '订单号', '状态', '金额', '操作']
    .forEach((field) => assert.ok(html.includes(field), `missing field: ${field}`));
  assert.ok(!/sticky-order-id/.test(html), 'order id should no longer be a sticky column');
  assert.ok(!/\.orders-desktop-table\s+\.sticky-actions\s*\{[^}]*box-shadow:/.test(html), 'sticky action column should not create a wide shadow seam');
});

test('正式订单页固定列应使用显式列宽和不透明背景，避免空白与穿透', () => {
  assert.ok(/\.order-table-shell\s*\{[\s\S]*--orders-sticky-status-width:\s*\d+px;[\s\S]*--orders-sticky-amount-width:\s*\d+px;[\s\S]*--orders-sticky-actions-width:\s*\d+px;/.test(html), 'sticky columns should define explicit widths');
  assert.ok(/\.orders-desktop-table\s+\.sticky-col\s*\{[\s\S]*background:\s*#ffffff;[\s\S]*background-clip:\s*padding-box;[\s\S]*z-index:\s*4;/.test(html), 'sticky cells should use opaque background and base z-index');
  assert.ok(/\.orders-desktop-table tbody tr:hover \.sticky-col\s*\{[\s\S]*background:\s*rgba\(248,\s*250,\s*252,\s*0\.9\);/.test(html), 'sticky cells should keep the same row background on hover');
  assert.ok(/\.orders-desktop-table\s+\.sticky-status\s*\{[\s\S]*width:\s*var\(--orders-sticky-status-width\);[\s\S]*min-width:\s*var\(--orders-sticky-status-width\);[\s\S]*max-width:\s*var\(--orders-sticky-status-width\);[\s\S]*right:\s*calc\(var\(--orders-sticky-amount-width\)\s*\+\s*var\(--orders-sticky-actions-width\)\);/.test(html), 'sticky status column should derive width and offset from vars');
  assert.ok(/\.orders-desktop-table\s+\.sticky-amount\s*\{[\s\S]*width:\s*var\(--orders-sticky-amount-width\);[\s\S]*min-width:\s*var\(--orders-sticky-amount-width\);[\s\S]*max-width:\s*var\(--orders-sticky-amount-width\);[\s\S]*right:\s*var\(--orders-sticky-actions-width\);/.test(html), 'sticky amount column should derive width and offset from vars');
  assert.ok(/\.orders-desktop-table\s+\.sticky-actions\s*\{[\s\S]*width:\s*var\(--orders-sticky-actions-width\);[\s\S]*min-width:\s*var\(--orders-sticky-actions-width\);[\s\S]*max-width:\s*var\(--orders-sticky-actions-width\);[\s\S]*right:\s*0;/.test(html), 'sticky action column should derive width from vars');
});

test('正式订单页桌面筛选区应默认更紧凑并折叠高级筛选', () => {
  assert.ok(/orders-control-panel collapsed/.test(html), 'control panel should start collapsed');
  assert.ok(/\.orders-control-panel\s*\{[\s\S]*padding:\s*14px\s+16px;/.test(html), 'control panel padding should be compact');
  assert.ok(/\.orders-search-input,[\s\S]*height:\s*40px;/.test(html), 'desktop controls should be reduced in height');
});

test('正式订单页商品列应支持首商品展示与 +N件 弹层', () => {
  assert.ok(/data-order-products-trigger/.test(html), 'missing order product trigger');
  assert.ok(/data-order-products-popover/.test(html), 'missing order products popover');
  assert.ok(/data-order-popover-title/.test(html), 'missing order popover title');
  assert.ok(/data-order-popover-list/.test(html), 'missing order popover list');
  assert.ok(!/data-order-popover-meta/.test(html), 'order popover meta should not exist');
});

test('正式订单页应提供独立移动端订单流布局', () => {
  assert.ok(/mobile-order-stream-card/.test(html), 'missing mobile order stream card');
  assert.ok(/mobile-order-first-product/.test(html), 'missing mobile first product block');
  assert.ok(/mobile-order-meta-grid/.test(html), 'missing mobile meta grid');
  assert.ok(/@media\s*\(max-width:\s*1024px\)/.test(html), 'missing mobile media query');
  assert.ok(/@media\s*\(max-width:\s*1024px\)[\s\S]*\.mobile-order-meta-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(html), 'mobile meta grid should be compact two-column');
  assert.ok(/@media\s*\(max-width:\s*1024px\)[\s\S]*\.mobile-order-actions\s*\{[\s\S]*display:\s*grid;[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/.test(html), 'mobile actions should use compact three-column grid');
});
