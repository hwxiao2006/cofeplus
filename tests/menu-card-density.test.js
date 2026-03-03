const assert = require('assert');
const fs = require('fs');
const path = require('path');

const targets = ['menu-management.html', 'menu.html', 'overview.html'];

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

test('桌面端商品卡片区域至少一行展示5个商品', () => {
  const pattern = /@media\s*\(min-width:\s*1025px\)\s*\{[\s\S]*?\.product-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/;

  targets.forEach((file) => {
    const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert.ok(pattern.test(html), `${file} 未配置桌面端5列商品网格`);
  });
});

test('商品管理：应提供桌面端表格化商品行', () => {
  targets.forEach((file) => {
    const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert.ok(html.includes('class="product-table-head"'), `${file} 缺少商品表头`);
    assert.ok(html.includes('class="product-card product-row"'), `${file} 缺少商品行标记`);
  });
});
