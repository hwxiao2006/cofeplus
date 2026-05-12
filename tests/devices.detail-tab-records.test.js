const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'devices.html'), 'utf8');

function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (e) { console.error(`FAIL ${name}`); console.error(e.message); process.exitCode = 1; }
}

test('renderDetailTabRecords 应同时渲染异常记录和运维记录', () => {
  const start = html.indexOf('function renderDetailTabRecords(');
  const end = html.indexOf('function renderDetailTabEntry(');
  const body = html.slice(start, end);
  assert.ok(/getFaultAbnormalRecords\s*\(/.test(body), '应调用 getFaultAbnormalRecords');
  assert.ok(/getMaintenanceRecordsByDevice\s*\(/.test(body), '应调用 getMaintenanceRecordsByDevice');
  assert.ok(/renderDetailStatusRecordItems\s*\(/.test(body), '应调用 renderDetailStatusRecordItems 渲染列表');
  assert.ok(/'abnormal'/.test(body), '应使用 abnormal tabKey');
  assert.ok(/'operation'/.test(body), '应使用 operation tabKey');
});

test('renderDetailTabRecords 应为双栏布局', () => {
  const start = html.indexOf('function renderDetailTabRecords(');
  const end = html.indexOf('function renderDetailTabEntry(');
  const body = html.slice(start, end);
  assert.ok(/class="detail-tab-grid cols-2"/.test(body), '应为 cols-2 双栏');
});
