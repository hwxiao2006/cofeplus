const assert = require('assert');
const fs = require('fs');
const path = require('path');

const sidebarFiles = [
  'overview.html',
  'menu.html',
  'menu-management.html',
  'devices.html',
  'orders.html',
  'materials.html',
  'faults.html',
  'customers.html',
  'locations.html',
  'staff-management.html',
  'product-detail.html'
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

test('同款侧栏页面应统一头部对齐变量与 Prototype 缩进公式', () => {
  for (const filename of sidebarFiles) {
    const html = fs.readFileSync(path.join(__dirname, '..', filename), 'utf8');
    assert.ok(/--sidebar-header-padding-x:\s*24px;/.test(html), `${filename} 缺少 header padding 变量`);
    assert.ok(/--sidebar-nav-padding-x:\s*12px;/.test(html), `${filename} 缺少 nav padding 变量`);
    assert.ok(/--sidebar-section-title-padding-x:\s*14px;/.test(html), `${filename} 缺少 section title padding 变量`);
    assert.ok(/\.brand-version\s*\{[\s\S]*calc\(var\(--sidebar-nav-padding-x\)\s*\+\s*var\(--sidebar-section-title-padding-x\)\s*-\s*var\(--sidebar-header-padding-x\)\)/.test(html), `${filename} 的 Prototype v0 未对齐到统一竖线`);
    assert.ok(/\.nav-section-title\s*\{[\s\S]*padding:\s*8px var\(--sidebar-section-title-padding-x\);/.test(html), `${filename} 的 section title 未使用统一变量`);
  }
});
