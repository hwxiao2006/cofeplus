const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'faults.html'), 'utf8');
const libJs = fs.readFileSync(path.join(__dirname, '..', 'shared', 'fault-library.js'), 'utf8');

function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (e) { console.error(`FAIL ${name}`); console.error(e.message); process.exitCode = 1; }
}

test('faults.html 应加载 shared/fault-library.js', () => {
  assert.ok(/<script src="shared\/fault-library\.js"><\/script>/.test(html),
    'faults.html 需要在 admin-staff-access.js 之后加载 fault-library.js');
});

test('fault-library.js 应导出 FAULT_LIBRARY 和 getFaultForDevice', () => {
  assert.ok(/FAULT_LIBRARY/.test(libJs));
  assert.ok(/getFaultForDevice/.test(libJs));
  // 验证 IIFE 挂在 global.CofeFaultLibrary
  assert.ok(/global\.CofeFaultLibrary\s*=/.test(libJs));
});

test('fault-library.js 每条故障应只有 code/description/handling 三个字段', () => {
  // 用正则提取所有对象字面量的 keys
  const entries = libJs.match(/\{[^{}]*code:[^{}]*\}/g) || [];
  assert.ok(entries.length >= 25, '应至少有 25 条故障记录,实际:' + entries.length);
  entries.forEach((entry, i) => {
    assert.ok(/code:/.test(entry), `entry ${i} 缺少 code`);
    assert.ok(/description:/.test(entry), `entry ${i} 缺少 description`);
    assert.ok(/handling:/.test(entry), `entry ${i} 缺少 handling`);
    // 不应该有别的 key 名称(category/severity/sop_ref 等都不允许)
    const extraKeys = entry.match(/\b(category|severity|sop_ref|subsystem|symptom)\s*:/g);
    assert.ok(!extraKeys, `entry ${i} 包含不允许的字段 ${extraKeys}`);
  });
});

test('faults.html getFaultContent 应优先使用 CofeFaultLibrary', () => {
  const start = html.indexOf('function getFaultContent(');
  const end = html.indexOf('\n        function ', start + 20);
  const body = html.slice(start, end > 0 ? end : start + 1500);
  assert.ok(/CofeFaultLibrary/.test(body), 'getFaultContent 应引用 CofeFaultLibrary');
  assert.ok(/getFaultForDevice/.test(body));
  assert.ok(/lib\.description/.test(body));
});

test('faults.html 应有 getFaultHandling 函数', () => {
  assert.ok(/function getFaultHandling\(/.test(html));
});

test('faults.html 应有 toggleFaultRowExpand 函数', () => {
  assert.ok(/function toggleFaultRowExpand\(/.test(html));
});

test('故障行模板应有 data-device-id 属性和 fault-row-summary/fault-row-detail 结构', () => {
  // 找 renderList 内部模板
  const renderListIdx = html.indexOf('function renderList(');
  const body = html.slice(renderListIdx, renderListIdx + 5000);
  assert.ok(/data-device-id="\$\{safeId\}"/.test(body),
    '故障行 article 应有 data-device-id 属性');
  assert.ok(/<div class="fault-row-summary"/.test(body),
    '应有 fault-row-summary 子节点');
  assert.ok(/<div class="fault-row-detail"/.test(body),
    '应有 fault-row-detail 子节点');
  assert.ok(/fault-row-handling-list/.test(body),
    '应有 ordered list 用于处理步骤');
  assert.ok(/fault-row-handling-empty|暂无处理建议/.test(body),
    '应有空状态 fallback');
});

test('故障行应在故障内容下方常驻显示「第一步预览」 (Option A)', () => {
  const renderListIdx = html.indexOf('function renderList(');
  const body = html.slice(renderListIdx, renderListIdx + 5000);
  assert.ok(/fault-cell-step-preview/.test(body),
    'summary 应有 fault-cell-step-preview 显示第一条处理步骤');
  assert.ok(/fault-cell-step-bullet/.test(body),
    '应有 fault-cell-step-bullet (①)');
  assert.ok(/fault-cell-step-more/.test(body),
    '应有 fault-cell-step-more 「查看全部 N 步」链接');
  assert.ok(/查看全部 \$\{moreCount\} 步/.test(body),
    '链接文案应显示总步数');
});

test('fault-cell-step-* CSS 应存在', () => {
  assert.ok(/\.fault-cell-step-preview\s*\{[\s\S]*?font-size:\s*12\.5px/.test(html));
  assert.ok(/\.fault-cell-step-more\s*\{[\s\S]*?color:\s*#0f766e/.test(html));
  // 折叠/展开应反映在 ▾/▴ 切换
  assert.ok(/\.fault-cell-step-more::after\s*\{[\s\S]*?▾/.test(html));
  assert.ok(/\.fault-table-row\.is-expanded\s+\.fault-cell-step-more::after\s*\{[\s\S]*?▴/.test(html));
});

test('故障行 detail 默认折叠 (display:none),展开时 display:block', () => {
  assert.ok(/\.fault-row-detail\s*\{[\s\S]*?display:\s*none/.test(html),
    '.fault-row-detail 默认应 display:none');
  assert.ok(/\.fault-table-row\.is-expanded\s+\.fault-row-detail\s*\{[\s\S]*?display:\s*block/.test(html),
    '.is-expanded 状态下 .fault-row-detail 应 display:block');
});

test('点击 summary 区应能切换 is-expanded 类', () => {
  const start = html.indexOf('function toggleFaultRowExpand(');
  const end = html.indexOf('\n        function ', start + 20);
  const body = html.slice(start, end > 0 ? end : start + 1000);
  assert.ok(/classList\.toggle\(['"]is-expanded['"]\)/.test(body),
    'toggleFaultRowExpand 应调用 classList.toggle("is-expanded")');
});
