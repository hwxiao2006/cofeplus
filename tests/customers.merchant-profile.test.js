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
