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
  assert.ok(html.includes('id="operatorPhoneInput"'));
  assert.ok(html.includes('id="networkSignalInput"'));
  assert.ok(html.includes('id="maintenanceWindowInput"'));
  assert.ok(html.includes('id="notesInput"'));
  assert.ok(html.includes('id="adScreenLeftImageInput"'));
  assert.ok(html.includes('id="adScreenLeftVideoInput"'));
  assert.ok(html.includes('id="adScreenRightImageInput"'));
  assert.ok(html.includes('id="adScreenLeftPreview"'));
  assert.ok(html.includes('id="adScreenRightPreview"'));
  assert.ok(html.includes('id="locationImagesInput"'));
  assert.ok(html.includes('id="locationImagesPreview"'));
  assert.ok(!html.includes('id="merchantName"'));
  assert.ok(!html.includes('id="quickLocationCustomer"'));
  assert.ok(!html.includes('所属客户'));
  assert.ok(!html.includes('所属商户（可选）'));
});

test('设备入场页应包含移动端回退样式', () => {
  assert.ok(html.includes('@media (max-width: 768px)'));
  assert.ok(/@media\s*\(max-width:\s*768px\)[\s\S]*\.form-grid/.test(html));
});

test('移动端上传区域应支持横向滚动', () => {
  assert.ok(/@media\s*\(max-width:\s*768px\)[\s\S]*\.upload-grid\s*\{[\s\S]*overflow-x:\s*auto/.test(html));
});

test('节能模式关闭时应隐藏节能时间行', () => {
  assert.ok(/data-energy-time-row/.test(html));
  assert.ok(/\.row\.hidden\s*\{\s*display:\s*none;?\s*\}/.test(html));
  assert.ok(/function\s+isEnergyModeEnabled\s*\(/.test(html));
  assert.ok(/function\s+toggleEnergyTimeRowsVisibility\s*\(/.test(html));
  assert.ok(/querySelectorAll\('\[data-energy-time-row\]'\)/.test(html));
  assert.ok(/if\s*\(group\.id\s*===\s*'energyModeGroup'\)\s*\{\s*toggleEnergyTimeRowsVisibility\(\)/.test(html));
});

test('点击获取当前位置应自动填充经纬度与地址', () => {
  assert.ok(/function\s+requestCurrentLocation\s*\(/.test(html));
  assert.ok(/navigator\.geolocation\.getCurrentPosition/.test(html));
  assert.ok(/function\s+resolveAddressByCoordinates\s*\(/.test(html));
  assert.ok(/api\.bigdatacloud\.net\/data\/reverse-geocode-client/.test(html));
  assert.ok(/document\.getElementById\('locationAddressInput'\)\.value\s*=/.test(html));
  assert.ok(/document\.getElementById\('gpsActionDisplay'\)\.addEventListener\('click',\s*requestCurrentLocation\)/.test(html));
});

test('设备开始日期应默认填充当天日期', () => {
  assert.ok(/function\s+setTodayAsDefaultDeviceStartDate\s*\(/.test(html));
  assert.ok(/new Date\(\)/.test(html));
  assert.ok(/document\.getElementById\('deviceStartDateInput'\)/.test(html));
  assert.ok(/setTodayAsDefaultDeviceStartDate\(\)/.test(html));
});
