const assert = require('assert');
const fs = require('fs');
const path = require('path');

function read(filePath) {
  return fs.readFileSync(path.join(__dirname, '..', filePath), 'utf8');
}

function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (e) { console.error(`FAIL ${name}`); console.error(e.stack || e.message); process.exitCode = 1; }
}

test('customers.html 引入了 fault-notify-channels.js', () => {
  const html = read('customers.html');
  assert.ok(/shared\/fault-notify-channels\.js/.test(html));
});

test('staff-management.html 引入了 fault-notify-channels.js', () => {
  const html = read('staff-management.html');
  assert.ok(/shared\/fault-notify-channels\.js/.test(html));
});

test('faults.html 引入了 fault-notify-channels.js', () => {
  const html = read('faults.html');
  assert.ok(/shared\/fault-notify-channels\.js/.test(html));
});

test('customers.html 表单含两个推送渠道复选框', () => {
  const html = read('customers.html');
  assert.ok(/id="customerChannelEmail"/.test(html));
  assert.ok(/id="customerChannelWechat"/.test(html));
});

test('customers.html 表单含新建模式公众号置灰逻辑', () => {
  const html = read('customers.html');
  assert.ok(/customerChannelWechat\.disabled\s*=/.test(html) || /disabled.*customerChannelWechat/.test(html));
});

test('customers.html 保存函数调用了 validateCustomerNotifyConfig', () => {
  const html = read('customers.html');
  assert.ok(/validateCustomerNotifyConfig/.test(html));
});

test('customers.html 列表渲染含双渠道徽章逻辑', () => {
  const html = read('customers.html');
  assert.ok(/邮箱推送/.test(html) && /公众号推送/.test(html));
  assert.ok(/未配置推送/.test(html));
});

test('customers.html 含自愈日志面板触发按钮', () => {
  const html = read('customers.html');
  assert.ok(/id="reconcileLogTrigger"/.test(html));
  assert.ok(/getReconcileLog/.test(html));
});

test('staff-management.html 表单含公众号 OpenID 字段', () => {
  const html = read('staff-management.html');
  assert.ok(/id="staffWechatOpenId"/.test(html));
  assert.ok(/公众号 OpenID/.test(html));
});

test('staff-management.html bootstrap 用 normalizeOpenId 归一化字段', () => {
  const html = read('staff-management.html');
  assert.ok(/normalizeOpenId/.test(html));
});

test('staff-management.html 列表渲染含已绑公众号徽章', () => {
  const html = read('staff-management.html');
  assert.ok(/已绑公众号/.test(html));
});

test('staff-management.html 保存调用 previewStaffChangeImpact', () => {
  const html = read('staff-management.html');
  assert.ok(/previewStaffChangeImpact/.test(html));
});

test('staff-management.html 含确认弹窗中自动取消公众号渠道选项文案', () => {
  const html = read('staff-management.html');
  assert.ok(/自动取消.*公众号/.test(html));
});

test('faults.html 渠道徽章渲染含所有四种状态文案', () => {
  const html = read('faults.html');
  assert.ok(/邮箱推送/.test(html));
  assert.ok(/公众号推送/.test(html));
  assert.ok(/未配置推送/.test(html));
});

test('faults.html 初始化阶段调用 reconcileNotifyChannels', () => {
  const html = read('faults.html');
  assert.ok(/reconcileNotifyChannels/.test(html));
});
