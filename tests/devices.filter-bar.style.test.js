const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'devices.html'), 'utf8');

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

test('主筛选栏标签应使用高对比文本颜色', () => {
  assert.ok(/\.main-filter-bar\s+\.filter-label\s*\{[\s\S]*color:\s*var\(--text-secondary\)/.test(html));
});

test('主筛选栏下拉应为白底并使用高对比文本', () => {
  assert.ok(/\.main-filter-item\s+\.filter-select\s*\{[\s\S]*background:\s*#fff/.test(html));
  assert.ok(/\.main-filter-item\s+\.filter-select\s*\{[\s\S]*color:\s*var\(--text-primary\)/.test(html));
});

test('设备管理页设备入场入口应只保留表格区按钮', () => {
  const entryLinks = html.match(/device-entry\.html/g) || [];
  assert.strictEqual(entryLinks.length, 1);
  assert.ok(/table-actions[\s\S]*device-entry\.html/.test(html));
});
