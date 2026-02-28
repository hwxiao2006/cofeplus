const assert = require('assert');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'device-entry.html');
const html = fs.readFileSync(filePath, 'utf8');

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

test('设备入场页应使用桌面双栏容器结构', () => {
  assert.ok(html.includes('class="form-grid"'));
  assert.ok(html.includes('class="form-column left-column"'));
  assert.ok(html.includes('class="form-column right-column"'));
});

test('设备入场页应保留脚本依赖的关键字段ID', () => {
  assert.ok(html.includes('id="deviceSearchInput"'));
  assert.ok(html.includes('id="locationSelect"'));
  assert.ok(html.includes('id="locationAddressInput"'));
});

test('设备入场页应包含移动端回退样式', () => {
  assert.ok(html.includes('@media (max-width: 768px)'));
  assert.ok(/@media\s*\(max-width:\s*768px\)[\s\S]*\.form-grid/.test(html));
});

test('移动端上传区域应支持横向滚动', () => {
  assert.ok(/@media\s*\(max-width:\s*768px\)[\s\S]*\.upload-grid\s*\{[\s\S]*overflow-x:\s*auto/.test(html));
});
