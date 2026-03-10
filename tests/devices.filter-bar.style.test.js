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

test('设备管理主筛选栏应提供点位分类筛选', () => {
  assert.ok(/<label class="filter-label">点位分类<\/label>/.test(html));
  assert.ok(/<select class="filter-select" id="locationCategoryFilter" onchange="filterDevices\(\)">/.test(html));
  assert.ok(/<option value="all">全部点位分类<\/option>/.test(html));
  assert.ok(/<option value="exhibition">展会点位<\/option>/.test(html));
  assert.ok(/<option value="operation">运营点位<\/option>/.test(html));
});

test('设备管理筛选逻辑应按点位分类过滤', () => {
  assert.ok(/function\s+normalizePointCategory\s*\(/.test(html));
  assert.ok(/function\s+buildLocationCategoryMap\s*\(/.test(html));
  assert.ok(/const\s+locationCategoryFilter\s*=\s*document\.getElementById\('locationCategoryFilter'\)\.value/.test(html));
  assert.ok(/const\s+runtimeLocationCategoryMap\s*=\s*buildLocationCategoryMap\(\)/.test(html));
  assert.ok(/if\s*\(locationCategoryFilter\s*!==\s*'all'\)\s*\{[\s\S]*normalizePointCategory\(runtimeLocationCategoryMap\[d\.location\]\)\s*===\s*locationCategoryFilter/.test(html));
});

test('设备管理：点位分类 mock 映射应包含多条展会点位编码', () => {
  const mapMatch = html.match(/const\s+locationPointCategoryMap\s*=\s*\{([\s\S]*?)\};/);
  assert.ok(mapMatch && mapMatch[1], '未找到 locationPointCategoryMap');
  const exhibitionCodeCount = (mapMatch[1].match(/'[^']+':\s*'exhibition'/g) || []).length;
  assert.ok(exhibitionCodeCount >= 2, '应至少提供 2 个展会点位编码用于设备筛选 mock');
});
