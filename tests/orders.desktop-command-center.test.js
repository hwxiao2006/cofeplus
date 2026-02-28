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

test('桌面端筛选区应采用指挥台网格布局', () => {
  assert.ok(/@media\s*\(min-width:\s*1025px\)[\s\S]*\.filter-row\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1\.8fr\)\s*minmax\(190px,\s*0\.95fr\)\s*minmax\(170px,\s*0\.8fr\)/.test(html));
  assert.ok(/grid-template-areas:\s*"search device status"\s*"date date actions"/.test(html));
  assert.ok(/id="orderSearchFieldDesktop"/.test(html));
});

test('桌面端统计区应改为双卡片而非分割线布局', () => {
  assert.ok(/@media\s*\(min-width:\s*1025px\)[\s\S]*\.stats-bar\s*\{[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(html));
  assert.ok(/@media\s*\(min-width:\s*1025px\)[\s\S]*\.stat-divider\s*\{[\s\S]*display:\s*none/.test(html));
});

test('桌面端订单表格应提升层次与表头质感', () => {
  assert.ok(/\.order-table-container\s*\{[\s\S]*border-radius:\s*14px/.test(html));
  assert.ok(/\.order-table\s+th\s*\{[\s\S]*background:\s*rgba\(15,\s*23,\s*42,\s*0\.04\)/.test(html));
  assert.ok(/\.product-list\s*\{[\s\S]*display:\s*flex[\s\S]*flex-direction:\s*column/.test(html));
});
