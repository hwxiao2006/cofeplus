const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'customers.html'), 'utf8');

function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (e) { console.error(`FAIL ${name}`); console.error(e.message); process.exitCode = 1; }
}

// ---- static structure ----
test('customers.html 应在 init 中根据 role 分支', () => {
  assert.ok(/getMerchantScope\s*\(\s*\)/.test(html),
    'init 应通过 CofeAdminStaffAccess.getMerchantScope 决策');
});

test('customers.html 应有 renderMerchantProfile 函数(单条商户视图)', () => {
  assert.ok(/function\s+renderMerchantProfile\s*\(/.test(html));
});

test('customers.html 应有商户详情卡 DOM 节点', () => {
  assert.ok(/id="merchantProfileSection"/.test(html));
});

test('customers.html "新增客户" 按钮应支持 super-admin-only 隐藏', () => {
  // The button container or button itself must have data-admin-only or similar marker
  const m = html.match(/openModal\(\)[^>]*>[\s\S]{0,200}?新增客户/);
  assert.ok(m, '应找到"新增客户"按钮');
  // The header-right wrapper around it should be tagged
  assert.ok(/data-admin-only="customers"/.test(html),
    '至少有一个元素带 data-admin-only="customers" 属性以供 JS 在普通用户下隐藏');
});

test('customers.html 应有 syncMerchantNameAcrossStorage 调用(保存改名时联动)', () => {
  assert.ok(/syncMerchantNameAcrossStorage\s*\(/.test(html));
});

test('customers.html 找不到自家商户时应显示 fallback 提示', () => {
  assert.ok(/未找到[\s\S]{0,30}商户/.test(html) || /merchantProfileEmpty/.test(html),
    '应有"未找到商户"或类似空态');
});

test('openMerchantEditModal 应根据 isSuperAdmin 设置 customerName 输入只读状态', () => {
  const start = html.indexOf('function openMerchantEditModal(');
  const end = html.indexOf('\n        function ', start + 30);
  const fn = html.slice(start, end > 0 ? end : start + 3000);
  assert.ok(/isSuperAdmin/.test(fn), 'openMerchantEditModal 应检查 isSuperAdmin');
  assert.ok(/readOnly\s*=\s*true/.test(fn) || /\.readOnly\s*=\s*!isSuper/.test(fn),
    '非超管应把 customerName 设为 readOnly');
});

test('saveCustomer 应在非超管路径下用旧名覆盖新名(防御绕过 readOnly)', () => {
  const start = html.indexOf('function saveCustomer(');
  const end = html.indexOf('\n        function ', start + 30);
  const fn = html.slice(start, end > 0 ? end : start + 3000);
  assert.ok(/isSuper\s*\?\s*name\s*:\s*previousName|effectiveName/.test(fn),
    'saveCustomer 应在非超管时强制保留 previousName');
  assert.ok(/isSuper\s*&&[\s\S]{0,400}syncMerchantNameAcrossStorage/.test(fn),
    'syncMerchantNameAcrossStorage 应仅在 isSuper 时触发');
});

test('客户名称输入框下方应有"由平台运营维护"提示', () => {
  assert.ok(/customerNameHint/.test(html), '应有提示元素 customerNameHint');
  assert.ok(/由平台运营维护|由平台.*维护|联系运营/.test(html),
    '提示文案应说明由运营维护');
});

test('商户表单应包含故障通知邮箱输入框', () => {
  assert.ok(/id="customerNotifyEmail"/.test(html), '应有 customerNotifyEmail 输入框');
  assert.ok(/type="email"/.test(html), '应使用 type=email');
  assert.ok(/故障通知邮箱|故障邮箱/.test(html), '应有"故障通知邮箱"label');
});

test('商户详情页应显示故障通知邮箱字段', () => {
  const start = html.indexOf('function renderMerchantProfile(');
  const end = html.indexOf('\n        function ', start + 30);
  const fn = html.slice(start, end > 0 ? end : start + 5000);
  assert.ok(/notifyEmail/.test(fn) && /故障通知邮箱/.test(fn),
    'profile 卡应渲染 notifyEmail');
});

test('saveCustomer 应保存 notifyEmail 字段并校验格式', () => {
  const start = html.indexOf('function saveCustomer(');
  const end = html.indexOf('\n        function ', start + 30);
  const fn = html.slice(start, end > 0 ? end : start + 3000);
  assert.ok(/notifyEmail/.test(fn), 'saveCustomer 应读取 notifyEmail');
  assert.ok(/isValidNotifyEmail/.test(fn), '应调用邮箱格式校验');
});

test('openMerchantEditModal 和 editCustomer 应回填 notifyEmail', () => {
  const editStart = html.indexOf('function openMerchantEditModal(');
  const editEnd = html.indexOf('\n        function ', editStart + 30);
  const editFn = html.slice(editStart, editEnd > 0 ? editEnd : editStart + 3000);
  assert.ok(/customerNotifyEmail['"]\)\.value\s*=/.test(editFn),
    'openMerchantEditModal 应回填 customerNotifyEmail');

  const editCustomerStart = html.indexOf('function editCustomer(');
  const editCustomerEnd = html.indexOf('\n        function ', editCustomerStart + 30);
  const editCustomerFn = html.slice(editCustomerStart, editCustomerEnd > 0 ? editCustomerEnd : editCustomerStart + 2000);
  assert.ok(/customerNotifyEmail['"]\)\.value\s*=/.test(editCustomerFn),
    'editCustomer 应回填 customerNotifyEmail');
});
