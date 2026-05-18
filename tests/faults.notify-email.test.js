const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'faults.html'), 'utf8');

function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (e) { console.error(`FAIL ${name}`); console.error(e.message); process.exitCode = 1; }
}

test('faults.html 应有 getFaultNotifyEmailForDevice 函数', () => {
  assert.ok(/function\s+getFaultNotifyEmailForDevice\s*\(/.test(html));
});

test('faults.html 应有 renderFaultNotifyEmail 渲染函数', () => {
  assert.ok(/function\s+renderFaultNotifyEmail\s*\(/.test(html));
});

test('renderFaultNotifyEmail 应渲染"推送至" + 邮箱,无邮箱时显示"未配置"', () => {
  const start = html.indexOf('function renderFaultNotifyEmail(');
  const end = html.indexOf('\n        function ', start + 30);
  const fn = html.slice(start, end > 0 ? end : start + 1500);
  assert.ok(/推送至/.test(fn), '应有"推送至"文案');
  assert.ok(/未配置/.test(fn), '应有"未配置"文案');
  assert.ok(/fault-notify-email/.test(fn), '应使用 fault-notify-email 类');
});

test('故障表格应在设备地址列下方渲染邮箱', () => {
  const renderListStart = html.indexOf('function renderList(');
  const renderListEnd = html.indexOf('\n        currentStaffFaultAccess', renderListStart);
  const body = html.slice(renderListStart, renderListEnd > 0 ? renderListEnd : renderListStart + 3000);
  assert.ok(/renderFaultNotifyEmail/.test(body),
    'renderList 应调用 renderFaultNotifyEmail');
});

test('CSS 应定义 fault-notify-email 样式', () => {
  assert.ok(/\.fault-notify-email\s*\{[\s\S]*background:\s*#ccfbf1/.test(html),
    '邮箱标签应有 teal 背景');
  assert.ok(/\.fault-notify-email-empty\s*\{[\s\S]*background:\s*#f3f4f6/.test(html),
    '空状态应有灰色背景');
});

test('getFaultNotifyEmailForDevice 应通过 mer→C 编号转换查找 customer', () => {
  const start = html.indexOf('function getFaultNotifyEmailForDevice(');
  const end = html.indexOf('\n        function ', start + 30);
  const fn = html.slice(start, end > 0 ? end : start + 1500);
  assert.ok(/devicesData/.test(fn), '应读 devicesData');
  assert.ok(/customersData/.test(fn), '应读 customersData');
  assert.ok(/notifyEmail/.test(fn), '应取 notifyEmail');
  assert.ok(/mer/.test(fn), '应处理 mer→C 转换');
});
