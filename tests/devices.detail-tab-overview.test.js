const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'devices.html'), 'utf8');

function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (e) { console.error(`FAIL ${name}`); console.error(e.message); process.exitCode = 1; }
}

test('renderDetailTabOverview 应渲染基本信息和当前状态两栏', () => {
  const fnStart = html.indexOf('function renderDetailTabOverview(');
  const nextFn = html.indexOf('function renderDetailTabRun(');
  const fnBody = html.slice(fnStart, nextFn);
  assert.ok(/renderDeviceOverviewCard/.test(fnBody), '应调用 renderDeviceOverviewCard');
  assert.ok(/renderDeviceStatusCard/.test(fnBody), '应调用 renderDeviceStatusCard');
  assert.ok(/class="detail-tab-grid cols-2"/.test(fnBody),
    '应为 .detail-tab-grid.cols-2 双栏布局');
});

test('detail-tab-grid 双栏布局 CSS 应存在', () => {
  assert.ok(/\.detail-tab-grid\s*\{[\s\S]*display:\s*grid/.test(html));
  assert.ok(/\.detail-tab-grid\.cols-2\s*\{[\s\S]*grid-template-columns:\s*1fr 1fr/.test(html));
});

test('detail-tab-grid 手机端应单列堆叠', () => {
  assert.ok(
    /@media\s*\([^)]*max-width:\s*768px[^)]*\)[\s\S]*\.detail-tab-grid\.cols-2[\s\S]*grid-template-columns:\s*1fr/.test(html),
    '768px 以下 cols-2 应退化为单列'
  );
});
