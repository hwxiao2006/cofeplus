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

test('订单页应提供 PRD 截图用 demoState 解析与执行入口', () => {
  assert.ok(/function\s+resolveOrdersPrdDemoState\s*\(\)/.test(html), 'missing demoState resolver');
  assert.ok(/function\s+applyOrdersPrdDemoState\s*\(/.test(html), 'missing demoState applier');
  assert.ok(/new\s+URLSearchParams\(window\.location\.search\)/.test(html), 'demoState should read query params');
  [
    'metrics',
    'filters',
    'table',
    'mobile-list',
    'products',
    'detail',
    'refund',
    'currency'
  ].forEach(state => {
    assert.ok(html.includes(`'${state}'`) || html.includes(`"${state}"`), `missing demo state: ${state}`);
  });
});

test('订单页初始化后应执行截图态，以便自动打开筛选、商品、详情和退款界面', () => {
  assert.ok(/function\s+init\s*\(\)\s*\{[\s\S]*applyOrdersPrdDemoState\(\)/.test(html), 'init should apply PRD demo state');
  assert.ok(/toggleAdvancedFilters\(\)/.test(html), 'demo states should be able to expand advanced filters');
  assert.ok(/toggleOrderProductsPopover\(/.test(html), 'demo states should be able to open products popover');
  assert.ok(/openOrderDetail\(/.test(html), 'demo states should be able to open order detail');
  assert.ok(/openRefundModal\(/.test(html), 'demo states should be able to open refund modal');
});
