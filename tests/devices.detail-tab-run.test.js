const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'devices.html'), 'utf8');

function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (e) { console.error(`FAIL ${name}`); console.error(e.message); process.exitCode = 1; }
}

test('renderDetailTabRun 应包含温度瓦片、软件版本、机构状态、温度报警卡', () => {
  const fnStart = html.indexOf('function renderDetailTabRun(');
  const nextFn = html.indexOf('function renderDetailTabRecords(');
  const fnBody = html.slice(fnStart, nextFn);
  assert.ok(/fridgeTemp/.test(fnBody), '应渲染 fridgeTemp');
  assert.ok(/beanTemp/.test(fnBody), '应渲染 beanTemp');
  assert.ok(/craftTemp/.test(fnBody), '应渲染 craftTemp');
  assert.ok(/beanHumidity/.test(fnBody), '应渲染 beanHumidity');
  assert.ok(/upperSoftware/.test(fnBody), '应渲染 upperSoftware');
  assert.ok(/firmwareVersion/.test(fnBody), '应渲染 firmwareVersion');
  assert.ok(/orgStatus/.test(fnBody), '应渲染 orgStatus chips');
  assert.ok(/buildDetailTemperatureAlarmZones/.test(fnBody), '应调用温度报警数据源');
  assert.ok(/paymentMethods/.test(fnBody), '应渲染 paymentMethods');
  assert.ok(/energyMode/.test(fnBody), '应渲染 energyMode');
  assert.ok(/networkSignal/.test(fnBody), '应渲染 networkSignal');
});

test('温度瓦片 CSS 应存在', () => {
  assert.ok(/\.detail-temp-tile\s*\{/.test(html));
  assert.ok(/\.detail-temp-tile-val\s*\{[\s\S]*font-size:\s*20px/.test(html));
  assert.ok(/\.detail-temp-tile-row\s*\{[\s\S]*grid-template-columns:\s*repeat\(4,\s*1fr\)/.test(html));
});

test('温度区块卡 CSS 应存在', () => {
  assert.ok(/\.detail-temp-zone\s*\{/.test(html));
  assert.ok(/\.detail-temp-zone-title\s*\{[\s\S]*font-weight:\s*600/.test(html));
});
