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

test('置顶头容器 CSS 应存在', () => {
  assert.ok(/\.detail-top-head\s*\{[\s\S]*background:\s*#fff/.test(html));
  assert.ok(/\.detail-top-head\s*\{[\s\S]*padding:\s*14px 18px/.test(html));
  assert.ok(/\.detail-top-head\s*\{[\s\S]*display:\s*flex/.test(html));
});

test('置顶头元素(back/id/pill/loc/actions)CSS 应齐备', () => {
  assert.ok(/\.detail-top-back\s*\{/.test(html));
  assert.ok(/\.detail-top-id\s*\{[\s\S]*font-size:\s*18px/.test(html));
  assert.ok(/\.detail-top-pill\s*\{[\s\S]*border-radius:\s*999px/.test(html));
  assert.ok(/\.detail-top-loc\s*\{[\s\S]*color:\s*#6b7280/.test(html));
  assert.ok(/\.detail-top-actions\s*\{[\s\S]*gap:\s*6px/.test(html));
});

test('置顶头操作区"远程操作"按钮应有蓝色渐变', () => {
  assert.ok(/\.detail-top-action-btn\.blue\s*\{[\s\S]*background:\s*linear-gradient\(135deg,\s*#2563eb,\s*#1d4ed8\)/.test(html));
});

test('tabs 栏 CSS 应存在', () => {
  assert.ok(/\.detail-tabs\s*\{[\s\S]*background:\s*#fff/.test(html));
  assert.ok(/\.detail-tab\s*\{[\s\S]*cursor:\s*pointer/.test(html));
  assert.ok(/\.detail-tab\.active\s*\{[\s\S]*color:\s*#0f766e/.test(html));
  assert.ok(/\.detail-tab\.active\s*\{[\s\S]*border-bottom-color:\s*#0f766e/.test(html));
});

test('tab body 容器 CSS 应存在', () => {
  assert.ok(/\.detail-tab-body\s*\{[\s\S]*background:\s*#fff/.test(html));
  assert.ok(/\.detail-tab-body\s*\{[\s\S]*border-radius:\s*0 0 12px 12px/.test(html));
});

test('switchDetailTab 函数应定义', () => {
  assert.ok(/function\s+switchDetailTab\s*\(/.test(html));
});

test('renderDetailTabsShell 函数应存在', () => {
  assert.ok(/function\s+renderDetailTabsShell\s*\(/.test(html));
});

test('renderDetailTabsShell 渲染结果应包含 5 个 tab 按钮', () => {
  const fnStart = html.indexOf('function renderDetailTabsShell(');
  const fnChunk = html.slice(fnStart, fnStart + 5000);
  assert.ok(/data-tab="overview"/.test(fnChunk));
  assert.ok(/data-tab="run"/.test(fnChunk));
  assert.ok(/data-tab="records"/.test(fnChunk));
  assert.ok(/data-tab="entry"/.test(fnChunk));
  assert.ok(/data-tab="adscreen"/.test(fnChunk));
});

test('5 个 render tab 占位函数应存在', () => {
  assert.ok(/function\s+renderDetailTabOverview\s*\(/.test(html));
  assert.ok(/function\s+renderDetailTabRun\s*\(/.test(html));
  assert.ok(/function\s+renderDetailTabRecords\s*\(/.test(html));
  assert.ok(/function\s+renderDetailTabEntry\s*\(/.test(html));
  assert.ok(/function\s+renderDetailTabAdScreen\s*\(/.test(html));
});

test('viewDetail controller 应调用 renderDetailTabsShell', () => {
  const start = html.indexOf('function viewDetail(');
  assert.ok(start >= 0, '未找到 viewDetail 函数');
  const end = html.indexOf('function closeDetailModal(', start);
  const body = html.slice(start, end > 0 ? end : start + 5000);
  assert.ok(/renderDetailTabsShell\(/.test(body), 'viewDetail 应调用 renderDetailTabsShell');
  assert.ok(!/<div class="detail-layout">/.test(body), 'viewDetail 不应再输出 .detail-layout');
});

test('viewDetail 渲染后应同步 tab 状态', () => {
  const start = html.indexOf('function viewDetail(');
  const end = html.indexOf('function closeDetailModal(', start);
  const body = html.slice(start, end > 0 ? end : start + 5000);
  assert.ok(/switchDetailTab\(/.test(body), 'viewDetail 应调用 switchDetailTab');
});

test('旧布局 CSS 类应全部移除', () => {
  assert.ok(!/\.detail-layout\s*\{/.test(html), '.detail-layout 应移除');
  assert.ok(!/\.detail-main\s*\{/.test(html), '.detail-main 应移除');
  assert.ok(!/\.detail-grid\s*\{/.test(html), '.detail-grid 应移除');
  assert.ok(!/\.detail-aside\s*\{/.test(html), '.detail-aside 应移除');
  assert.ok(!/\.detail-aside-stack\s*\{/.test(html), '.detail-aside-stack 应移除');
  assert.ok(!/\.detail-side-card\s*\{/.test(html), '.detail-side-card 应移除');
  assert.ok(!/\.detail-side-title\s*\{/.test(html), '.detail-side-title 应移除');
  assert.ok(!/\.detail-side-action-list\s*\{/.test(html), '.detail-side-action-list 应移除');
  assert.ok(!/\.detail-side-action-btn\s*\{/.test(html), '.detail-side-action-btn 应移除');
});

test('renderDetailAside 函数应移除', () => {
  assert.ok(!/function\s+renderDetailAside\s*\(/.test(html), 'renderDetailAside 应移除');
});
