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
  assert.ok(/id="quickLocationLongitude"/.test(html));
  assert.ok(/id="quickLocationLatitude"/.test(html));
  assert.ok(/id="quickLocationLocateBtn"/.test(html));
  assert.ok(/function\s+requestQuickLocationCurrentPosition\s*\(/.test(html));
});

test('设备入场：快速新增点位应移除商户选择器并复用点位分类', () => {
  assert.ok(!/id="quickLocationCustomer"/.test(html));
  assert.ok(/function\s+resolveEntryCurrentMerchantContext\s*\(/.test(html));
  assert.ok(/<option value="exhibition">展会点位<\/option>/.test(html));
  assert.ok(/<option value="operation">运营点位<\/option>/.test(html));
});

test('设备入场：快速新增点位应默认写入当前商户', () => {
  assert.ok(/customerId:\s*merchantContext\.customerId/.test(html));
  assert.ok(/customerName:\s*merchantContext\.customerName/.test(html));
  assert.ok(/longitude:\s*document\.getElementById\('quickLocationLongitude'\)\.value\.trim\(\)/.test(html));
  assert.ok(/latitude:\s*document\.getElementById\('quickLocationLatitude'\)\.value\.trim\(\)/.test(html));
  assert.ok(/gpsAction:\s*'新增点位时录入'/.test(html));
});

test('设备入场：快速新增点位应支持获取当前位置填充经纬度', () => {
  assert.ok(/navigator\.geolocation\.getCurrentPosition/.test(html));
  assert.ok(/document\.getElementById\('quickLocationLongitude'\)\.value\s*=\s*longitude/.test(html));
  assert.ok(/document\.getElementById\('quickLocationLatitude'\)\.value\s*=\s*latitude/.test(html));
  assert.ok(/resolveAddressByCoordinates\(latitude,\s*longitude\)/.test(html));
  assert.ok(/getLocationErrorMessage\(error\)/.test(html));
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
  assert.ok(/generateNextLocationCodeForEntry\(input\.value\)/.test(html));
  assert.ok(/id="quickLocationCodeRegenerate"/.test(html));
});
