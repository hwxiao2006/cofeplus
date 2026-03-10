const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'locations.html'), 'utf8');

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

test('点位管理：新增/编辑表单应提供点位分类字段', () => {
  assert.ok(/id="locationCategory"/.test(html));
  assert.ok(/<option value="exhibition">展会点位<\/option>/.test(html));
  assert.ok(/<option value="operation">运营点位<\/option>/.test(html));
});

test('点位管理：列表区域应提供点位分类筛选器', () => {
  assert.ok(/id="pointCategoryFilter"/.test(html));
  assert.ok(/onchange="filterLocations\(\)"/.test(html));
});

test('点位管理：渲染与保存逻辑应处理点位分类', () => {
  assert.ok(/function\s+normalizePointCategory\s*\(/.test(html));
  assert.ok(/function\s+resolvePointCategoryLabel\s*\(/.test(html));
  assert.ok(/const\s+pointCategory\s*=\s*document\.getElementById\('locationCategory'\)\.value/.test(html));
  assert.ok(/pointCategory:\s*normalizePointCategory\(pointCategory\)/.test(html));
  assert.ok(/const\s+categoryFilter\s*=\s*document\.getElementById\('pointCategoryFilter'\)\.value/.test(html));
  assert.ok(/filtered\s*=\s*filtered\.filter\(l\s*=>\s*normalizePointCategory\(l\.pointCategory\)\s*===\s*categoryFilter\)/.test(html));
});

test('点位管理：默认 mock 数据应包含多条展会点位', () => {
  const defaultLocationsMatch = html.match(/const\s+defaultLocations\s*=\s*\[([\s\S]*?)\];/);
  assert.ok(defaultLocationsMatch && defaultLocationsMatch[1], '未找到 defaultLocations');
  const defaultLocationsSource = defaultLocationsMatch[1];
  const exhibitionCount = (defaultLocationsSource.match(/pointCategory:\s*'exhibition'/g) || []).length;
  assert.ok(exhibitionCount >= 2, '默认 mock 数据至少应有 2 条展会点位');
});

test('点位管理：类型扩展时应支持自动分配 mock 分类', () => {
  assert.ok(/const\s+POINT_CATEGORY_OPTIONS\s*=\s*\[/.test(html));
  assert.ok(/normalizePointCategory\(item\.pointCategory,\s*index\)/.test(html));
});

test('点位管理：已有本地数据时也应自动补齐类型 mock 覆盖', () => {
  assert.ok(/const\s+MIN_POINT_CATEGORY_MOCK_COUNT\s*=\s*\{/.test(html));
  assert.ok(/function\s+ensurePointCategoryMockCoverage\s*\(/.test(html));
  assert.ok(/const\s+coverageResult\s*=\s*ensurePointCategoryMockCoverage\(locationsData\)/.test(html));
});

test('点位管理：新增点位时所属商户应为可选，不再强制必填', () => {
  assert.ok(/if\s*\(!name\s*\|\|\s*!code\s*\|\|\s*!address\)/.test(html));
  assert.ok(!/if\s*\(!name\s*\|\|\s*!code\s*\|\|\s*!customerId\s*\|\|\s*!address\)/.test(html));
});

test('点位管理：点位未关联商户时应显示明确占位文案', () => {
  assert.ok(/customerName\s*\|\|\s*'未关联商户'/.test(html));
});

test('点位管理：新增点位时点位编码应默认自动生成且支持重新生成', () => {
  assert.ok(/function\s+generateNextLocationCode\s*\(/.test(html));
  assert.ok(/document\.getElementById\('locationCode'\)\.value\s*=\s*generateNextLocationCode\(\)/.test(html));
  assert.ok(/function\s+regenerateLocationCode\s*\(/.test(html));
  assert.ok(/id="locationCodeRegenerate"/.test(html));
});
