const assert = require('assert');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (error) { console.error(`FAIL ${name}`); console.error(error.message); process.exitCode = 1; }
}

// admin-staff-access.js 依赖 localStorage，先 mock 再加载
const store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); }
};

require(path.join(__dirname, '..', 'shared', 'role-definitions.js'));
require(path.join(__dirname, '..', 'shared', 'admin-staff-access.js'));
const Roles = globalThis.CofeRoleDefinitions;
const Access = globalThis.CofeAdminStaffAccess;

// ---- 授权层级：谁能创建谁 ----
test('getCreatableRoles：超管可建除超管外全部（含平台运维/商户管理员）', () => {
  const ids = Roles.getCreatableRoles('super_admin').map((r) => r.id);
  assert.ok(ids.includes('platform_ops'), '超管应能建平台运维');
  assert.ok(ids.includes('merchant_admin'), '超管应能建商户管理员');
  assert.ok(!ids.includes('super_admin'), '超管不应在 UI 里创建超管');
});

test('getCreatableRoles：商户管理员只能建 店长/运维/职员/自定义', () => {
  const ids = Roles.getCreatableRoles('merchant_admin').map((r) => r.id).sort();
  assert.deepStrictEqual(ids, ['custom', 'operations', 'staff', 'store_manager'].sort());
});

test('getCreatableRoles：平台运维/运维/职员不能创建任何人', () => {
  ['platform_ops', 'operations', 'staff'].forEach((rid) => {
    assert.strictEqual(Roles.getCreatableRoles(rid).length, 0, `${rid} 不应能创建人员`);
  });
});

test('platform_ops：数据范围=全平台，且无订单/无人员权限', () => {
  const t = Roles.getRoleTemplate('platform_ops');
  assert.strictEqual(t.deviceDataScope, 'all');
  assert.ok(!t.permissions.includes('ops.orders'), '平台运维不应有订单权限');
  assert.ok(!t.permissions.includes('ops.staff'), '平台运维不应有人员查看权限');
  assert.ok(!t.permissions.includes('ops.staff.manage'), '平台运维不应有人员管理权限');
});

test('merchant_admin：数据范围=本商户，且可管理人员', () => {
  const t = Roles.getRoleTemplate('merchant_admin');
  assert.strictEqual(t.deviceDataScope, 'merchant');
  assert.ok(t.permissions.includes('ops.staff.manage'), '商户管理员应能管理人员');
});

// ---- 设备数据范围（与功能权限正交的放行判定）----
function setUser(profile, staff) {
  store.sidebarLoginProfile = JSON.stringify(profile);
  store.cofeLoginSession = JSON.stringify({ account: profile.account, merchantId: profile.merchantId || '' });
  store.staffManagersData = JSON.stringify(staff || []);
}

test('deviceScopeUnrestricted：deviceDataScope=all 的员工 → true（且非超管）', () => {
  setUser(
    { role: 'merchant', account: '13900139000', phone: '13900139000', merchantId: 'C001' },
    [{ id: 'S010', merchantId: 'C001', phone: '13900139000', accountEnabled: true, permissions: ['ops.devices'], devices: [], deviceDataScope: 'all' }]
  );
  assert.strictEqual(Access.deviceScopeUnrestricted(), true);
  assert.strictEqual(Access.isSuperAdmin(), false);
});

test('deviceScopeUnrestricted：普通商户员工 → false', () => {
  setUser(
    { role: 'merchant', account: '13900139000', phone: '13900139000', merchantId: 'C001' },
    [{ id: 'S011', merchantId: 'C001', phone: '13900139000', accountEnabled: true, permissions: ['ops.devices'], devices: ['RCK1'] }]
  );
  assert.strictEqual(Access.deviceScopeUnrestricted(), false);
});

test('deviceScopeUnrestricted：超管 → true', () => {
  setUser({ role: 'super_admin', account: 'superadmin' }, []);
  assert.strictEqual(Access.deviceScopeUnrestricted(), true);
});

test('normalizeStaffRecord：未指定时数据范围默认为 merchant', () => {
  const rec = Access.normalizeStaffRecord({ merchantId: 'C001', phone: 'x', devices: [] });
  assert.strictEqual(rec.deviceDataScope, 'merchant');
});

test('normalizeStaffRecord：deviceDataScope=all 应被保留', () => {
  const rec = Access.normalizeStaffRecord({ merchantId: 'C001', phone: 'x', devices: [], deviceDataScope: 'all' });
  assert.strictEqual(rec.deviceDataScope, 'all');
});
