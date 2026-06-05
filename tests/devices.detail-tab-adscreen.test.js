const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'devices.html'), 'utf8');

function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (e) { console.error(`FAIL ${name}`); console.error(e.message); process.exitCode = 1; }
}

test('renderDetailTabAdScreen 应调用 renderAdScreenInfoCard(device)', () => {
  const start = html.indexOf('function renderDetailTabAdScreen(');
  const endIdx = html.indexOf('function openDetailMoreMenu(', start);
  const body = html.slice(start, endIdx > 0 ? endIdx : start + 2000);
  assert.ok(/renderAdScreenInfoCard\s*\(/.test(body), '应调用 renderAdScreenInfoCard');
});

test('renderDetailTabAdScreen 签名应接受 device', () => {
  assert.ok(/function renderDetailTabAdScreen\s*\(\s*device\s*\)/.test(html),
    '签名应为 (device)');
});

test('renderDetailTabsShell 调用 renderDetailTabAdScreen 时应传 device', () => {
  const start = html.indexOf('function renderDetailTabsShell(');
  const end = html.indexOf('// Tab render 占位', start);
  const body = html.slice(start, end > 0 ? end : start + 5000);
  assert.ok(/renderDetailTabAdScreen\(device\)/.test(body),
    'shell 调用应传 device 参数');
});
