const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'device-entry.html'), 'utf8');

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

test('设备入场：点位区应提供快速新增点位入口与弹窗', () => {
  assert.ok(/\+\s*新增点位/.test(html));
  assert.ok(/id="quickCreateLocationModal"/.test(html));
  assert.ok(/id="quickLocationName"/.test(html));
  assert.ok(/id="quickLocationCode"/.test(html));
  assert.ok(/id="quickLocationCategory"/.test(html));
  assert.ok(/id="quickLocationAddress"/.test(html));
});

test('设备入场：快速新增点位应支持可选商户并复用点位分类', () => {
  assert.ok(/id="quickLocationCustomer"/.test(html));
  assert.ok(/<option value="">不关联商户<\/option>/.test(html));
  assert.ok(/<option value="exhibition">展会点位<\/option>/.test(html));
  assert.ok(/<option value="operation">运营点位<\/option>/.test(html));
});

test('设备入场：新增后应刷新点位下拉并自动选中新点位', () => {
  assert.ok(/function\s+buildLocationPayloadForEntry\s*\(/.test(html));
  assert.ok(/function\s+validateQuickCreateLocation\s*\(/.test(html));
  assert.ok(/function\s+createLocationFromEntry\s*\(/.test(html));
  assert.ok(/renderLocationOptions\(\)/.test(html));
  assert.ok(/document\.getElementById\('locationSelect'\)\.value\s*=\s*location\.code/.test(html));
  assert.ok(/onLocationChange\(\)/.test(html));
});

test('设备入场：快速新增点位应校验编码唯一', () => {
  assert.ok(/toLowerCase\(\)\s*===\s*normalizedCode\.toLowerCase\(\)/.test(html));
  assert.ok(/点位编码已存在/.test(html));
});

test('设备入场：快速新增点位编码应默认自动生成且支持重新生成', () => {
  assert.ok(/function\s+generateNextLocationCodeForEntry\s*\(/.test(html));
  assert.ok(/document\.getElementById\('quickLocationCode'\)\.value\s*=\s*generateNextLocationCodeForEntry\(\)/.test(html));
  assert.ok(/function\s+regenerateQuickLocationCode\s*\(/.test(html));
  assert.ok(/id="quickLocationCodeRegenerate"/.test(html));
});
