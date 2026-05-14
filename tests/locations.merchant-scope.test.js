const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'locations.html'), 'utf8');

function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (e) { console.error(`FAIL ${name}`); console.error(e.message); process.exitCode = 1; }
}

test('locations.html 应在渲染前调用 getMerchantScope', () => {
  assert.ok(/getMerchantScope\s*\(\s*\)/.test(html),
    '应调用 CofeAdminStaffAccess.getMerchantScope');
});

test('locations.html renderLocations 应按 scope 过滤 customerId', () => {
  const start = html.indexOf('function renderLocations(');
  const end = html.indexOf('\n        function ', start + 30);
  const fn = html.slice(start, end > 0 ? end : start + 5000);
  assert.ok(/customerId\s*===\s*scope|customerId\s*===\s*currentScope|filter[\s\S]*customerId/.test(fn),
    'renderLocations 应包含按 customerId 过滤逻辑');
});

test('locations.html 编辑/删除应做 customerId scope 二次校验', () => {
  const editStart = html.indexOf('function editLocation(');
  const editEnd = html.indexOf('\n        function ', editStart + 30);
  const editFn = html.slice(editStart, editEnd > 0 ? editEnd : editStart + 2000);
  assert.ok(/customerId\s*!==\s*scope|customerId\s*!==\s*currentScope|无权/.test(editFn),
    'editLocation 应有 scope 校验');

  const delStart = html.indexOf('function deleteLocation(');
  const delEnd = html.indexOf('\n        function ', delStart + 30);
  const delFn = html.slice(delStart, delEnd > 0 ? delEnd : delStart + 2000);
  assert.ok(/customerId\s*!==\s*scope|customerId\s*!==\s*currentScope|无权/.test(delFn),
    'deleteLocation 应有 scope 校验');
});

test('locations.html 表单中 customerSelect 应可被 super_admin only 控制', () => {
  // 应该有 data-admin-only 标记或在普通用户分支下隐藏
  assert.ok(/data-admin-only="locations"/.test(html) || /readonlyMerchantField|customerReadonlyDisplay/.test(html),
    '商户选择器或只读替代位应有 super-admin 控制标记');
});

test('locations.html 普通用户保存点位应使用 scope 作为 customerId', () => {
  const start = html.indexOf('function saveLocation(');
  const end = html.indexOf('\n        function ', start + 30);
  const fn = html.slice(start, end > 0 ? end : start + 3000);
  // Either explicit assignment from scope, or guard before reading customerSelect
  assert.ok(/scope[\s\S]{0,200}customerId|customerId\s*=\s*scope|effectiveCustomerId/.test(fn),
    'saveLocation 应在普通用户场景下使用 scope 作为 customerId');
});
