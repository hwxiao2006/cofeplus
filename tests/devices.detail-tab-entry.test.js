const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'devices.html'), 'utf8');

function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (e) { console.error(`FAIL ${name}`); console.error(e.message); process.exitCode = 1; }
}

test('renderDetailTabEntry 应调用 renderEntryInfoCard(entryData, device)', () => {
  const start = html.indexOf('function renderDetailTabEntry(');
  const end = html.indexOf('function renderDetailTabAdScreen(');
  const body = html.slice(start, end);
  assert.ok(/renderEntryInfoCard\s*\(/.test(body), '应调用 renderEntryInfoCard');
});

test('renderDetailTabEntry 签名应接受 (entryData, device)', () => {
  assert.ok(/function renderDetailTabEntry\s*\(\s*entryData,\s*device\s*\)/.test(html),
    '签名应为 (entryData, device)');
});

test('renderDetailTabsShell 调用 renderDetailTabEntry 时应透传 device', () => {
  const start = html.indexOf('function renderDetailTabsShell(');
  const end = html.indexOf('// Tab render 占位', start);
  const body = html.slice(start, end > 0 ? end : start + 5000);
  assert.ok(/renderDetailTabEntry\(entryData,\s*device\)/.test(body),
    'shell 调用应传 device 参数');
});
