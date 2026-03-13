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

test('桌面端应提供紧凑头部、动态指标区与总控面板', () => {
  assert.ok(/今日销售动态与订单处理/.test(html));
  assert.ok(/class="metrics-grid"/.test(html));
  assert.ok(/今日支付金额/.test(html));
  assert.ok(/今日完成订单/.test(html));
  assert.ok(/客单价/.test(html));
  assert.ok(/orders-control-panel/.test(html));
  assert.ok(/高级筛选/.test(html));
  assert.ok(/应用筛选/.test(html));
  assert.ok(/总金额/.test(html));
  assert.ok(/成功金额/.test(html));
});

test('订单页桌面端头部应靠近商品管理的紧凑信息结构，而不是工作台 hero 风格', () => {
  assert.ok(/class="header-title-wrapper"/.test(html), 'missing compact title wrapper');
  assert.ok(/class="header-meta"/.test(html), 'missing compact header meta row');
  assert.ok(!/Operations Workspace/.test(html), 'desktop header should remove workspace hero kicker');
  assert.ok(!/class="orders-scope-chip"/.test(html), 'desktop header should remove orders workspace chip');
  assert.ok(!/订单工作台/.test(html), 'orders workspace copy should be removed');
});

test('订单页头部不应吸顶，标题旁不再显示全部设备按钮', () => {
  assert.ok(!/\.header\s*\{[^}]*position:\s*sticky;/.test(html));
  assert.ok(!/id="currentDevice"/.test(html));
});

test('订单页背景应改为与其他后台页一致的纯色底', () => {
  assert.ok(/--bg-body:\s*#f8f9fa;/.test(html));
  assert.ok(/body\s*\{[\s\S]*background-color:\s*var\(--bg-body\);/.test(html));
  assert.ok(!/body\s*\{[\s\S]*radial-gradient\(/.test(html));
});

test('桌面端指标区应为三列卡片布局而非旧统计条', () => {
  assert.ok(/@media\s*\(min-width:\s*1025px\)[\s\S]*\.metrics-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/.test(html));
  assert.ok(!/class="stats-bar"/.test(html));
});

test('桌面端高级筛选区应保留日期与操作按钮的紧凑布局', () => {
  assert.ok(/@media\s*\(min-width:\s*1025px\)[\s\S]*\.control-panel-primary\s*\{[\s\S]*grid-template-columns:\s*minmax\(150px,\s*0\.72fr\)\s+minmax\(220px,\s*1fr\)\s+auto/.test(html), 'desktop primary row should only fit status, device, and toggle');
  assert.ok(/@media\s*\(min-width:\s*1025px\)[\s\S]*\.control-panel-secondary\s*\{[\s\S]*grid-template-columns:\s*minmax\(160px,\s*0\.72fr\)\s+minmax\(0,\s*1\.4fr\)\s+minmax\(0,\s*1\.1fr\)\s+auto/.test(html), 'desktop secondary row should carry search fields, date range, and actions');
  assert.ok(/\.filter-actions\s*\{[\s\S]*gap:\s*10px;/.test(html), 'filter actions should keep clear/apply actions aligned');
});

test('桌面端订单区应改为工作区卡片而不是旧表格质感', () => {
  assert.ok(/class="order-workspace"/.test(html));
  assert.ok(/class="order-card-list"/.test(html));
  assert.ok(/\.order-workspace-card\s*\{/.test(html));
  assert.ok(/\.order-workspace-side\s*\{/.test(html));
  assert.ok(!/class="order-table-container"/.test(html));
});

test('桌面端金额列不应在金额下方展示支付状态，操作列不应再出现返券按钮', () => {
  assert.ok(!/<div class="order-amount-note">\$\{paymentText\}<\/div>/.test(html));
  assert.ok(!/order-card-action secondary/.test(html));
  assert.ok(!/returnCoupon\('\$\{order\.id\}'\)/.test(html));
});

test('桌面端操作列应使用统一的双按钮样式', () => {
  assert.ok(/--orders-sticky-actions-width:\s*168px;/.test(html));
  assert.ok(/\.order-table-actions\s*\{[\s\S]*justify-content:\s*flex-end;[\s\S]*gap:\s*10px;/.test(html));
  assert.ok(/\.order-card-action\s*\{[\s\S]*min-width:\s*62px;[\s\S]*height:\s*36px;[\s\S]*padding:\s*0 14px;/.test(html));
  assert.ok(/\.order-card-action\.refund\s*,\s*\.btn-refund\s*\{[\s\S]*color:\s*#b42318;[\s\S]*background:\s*#fff5f5;[\s\S]*border-color:\s*#fecaca;/.test(html));
  assert.ok(/onclick="refundOrder\('\$\{order\.id\}'\)"[\s\S]*class="order-card-action refund"/.test(html) || /class="order-card-action refund"[\s\S]*onclick="refundOrder\('\$\{order\.id\}'\)"/.test(html), 'desktop refund button should use refund-specific class');
  assert.ok(!/class="order-card-action primary" onclick="refundOrder\('\$\{order\.id\}'\)"/.test(html), 'desktop refund button should no longer use the green primary style');
});
