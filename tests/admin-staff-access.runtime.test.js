const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

function createStorage(seed = {}) {
  const store = { ...seed };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    }
  };
}

function loadStaffAccessSandbox(localStorageSeed = {}) {
  const scriptPath = path.join(__dirname, '..', 'shared', 'admin-staff-access.js');
  const script = fs.readFileSync(scriptPath, 'utf8');
  const sandbox = {
    console,
    localStorage: createStorage(localStorageSeed),
    window: {}
  };
  sandbox.window.localStorage = sandbox.localStorage;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(script, sandbox);
  return sandbox;
}

const activeStaffRecord = {
  id: 'S001',
  merchantId: 'C001',
  merchantName: '星巴克咖啡',
  username: '王运维',
  phone: '13800138021',
  accountEnabled: true,
  permissions: ['ops.devices', 'ops.orders', 'ops.faults'],
  devices: ['RCK386', 'RCK385', 'RCK384', 'RCK409', 'RCK410'],
  moduleDeviceScopes: {
    devices: { mode: 'inherit', deviceIds: [] },
    orders: { mode: 'custom', deviceIds: ['RCK386', 'RCK385', 'RCK384'] },
    faults: { mode: 'custom', deviceIds: ['RCK385', 'RCK999'] }
  }
};

test('共享权限助手：应根据登录账号匹配当前商户下的启用员工', () => {
  const sandbox = loadStaffAccessSandbox({
    cofeLoginSession: JSON.stringify({
      account: '13800138021',
      merchantId: 'C001',
      merchantName: '星巴克咖啡'
    }),
    staffManagersData: JSON.stringify([
      activeStaffRecord,
      {
        id: 'S009',
        merchantId: 'C001',
        phone: '13800138021',
        accountEnabled: false,
        permissions: ['ops.orders'],
        devices: ['RCK001']
      }
    ])
  });

  const access = sandbox.window.CofeAdminStaffAccess.resolveCurrentStaffAccess();
  assert.ok(access.currentStaff, '应匹配到当前员工');
  assert.strictEqual(access.currentStaff.username, '王运维');
  assert.strictEqual(access.currentStaff.phone, '13800138021');
  assert.strictEqual(access.merchantId, 'C001');
});

test('共享权限助手：应对缺失 moduleDeviceScopes 的历史员工默认继承全部负责设备', () => {
  const sandbox = loadStaffAccessSandbox();
  const normalized = sandbox.window.CofeAdminStaffAccess.normalizeStaffRecord({
    merchantId: 'C001',
    phone: '13800138021',
    permissions: ['ops.devices', 'ops.orders'],
    devices: ['RCK386', 'RCK385']
  });

  assert.strictEqual(normalized.moduleDeviceScopes.devices.mode, 'inherit');
  assert.strictEqual(normalized.moduleDeviceScopes.orders.mode, 'inherit');
  assert.deepStrictEqual(Array.from(normalized.moduleDeviceScopes.orders.deviceIds), []);
});

test('共享权限助手：历史人员维护账号应自动获得新增货道编辑权限', () => {
  const sandbox = loadStaffAccessSandbox({
    cofeLoginSession: JSON.stringify({
      account: '13800138021',
      merchantId: 'C001',
      merchantName: '星巴克咖啡'
    }),
    staffManagersData: JSON.stringify([{
      ...activeStaffRecord,
      permissions: ['ops.devices', 'ops.materials', 'ops.staff', 'ops.staff.manage']
    }])
  });

  const access = sandbox.window.CofeAdminStaffAccess.resolveCurrentStaffAccess();
  assert.ok(access.currentStaff.permissions.includes('ops.materials.laneNameEdit'));
  assert.ok(access.currentStaff.permissions.includes('ops.materials.laneMaterialEdit'));
});

test('共享权限助手：自定义页面设备范围应裁剪为负责设备子集', () => {
  const sandbox = loadStaffAccessSandbox();
  const visibleOrders = sandbox.window.CofeAdminStaffAccess.getModuleVisibleDeviceIds(activeStaffRecord, 'orders');
  const visibleFaults = sandbox.window.CofeAdminStaffAccess.getModuleVisibleDeviceIds(activeStaffRecord, 'faults');

  assert.deepStrictEqual(Array.from(visibleOrders), ['RCK386', 'RCK385', 'RCK384']);
  assert.deepStrictEqual(Array.from(visibleFaults), ['RCK385']);
});

test('共享权限助手：无页面权限时应返回空设备范围', () => {
  const sandbox = loadStaffAccessSandbox();
  const visible = sandbox.window.CofeAdminStaffAccess.getModuleVisibleDeviceIds({
    ...activeStaffRecord,
    permissions: ['ops.devices']
  }, 'orders');

  assert.deepStrictEqual(Array.from(visible), []);
});
