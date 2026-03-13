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

test('桌面端订单区应改为工作区卡片而不是旧表格质感', () => {
  assert.ok(/class="order-workspace"/.test(html));
  assert.ok(/class="order-card-list"/.test(html));
  assert.ok(/\.order-workspace-card\s*\{/.test(html));
  assert.ok(/\.order-workspace-side\s*\{/.test(html));
  assert.ok(!/class="order-table-container"/.test(html));
});
