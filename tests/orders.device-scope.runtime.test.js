const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'orders.html'), 'utf8');

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

function extractFunctionSource(source, functionName) {
  const signature = `function ${functionName}(`;
  const start = source.indexOf(signature);
  if (start === -1) {
    throw new Error(`未找到函数 ${functionName}`);
  }
  const braceStart = source.indexOf('{', start);
  let depth = 0;
  for (let index = braceStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) {
      return source.slice(start, index + 1);
    }
  }
  throw new Error(`函数 ${functionName} 解析失败`);
}

function createDocument() {
  const elements = {};
  return {
    getElementById(id) {
      if (!elements[id]) {
        elements[id] = {
          id,
          innerHTML: '',
          textContent: '',
          value: ''
        };
      }
      return elements[id];
    }
  };
}

// 数据权限跟人走：按员工本人的订单页设备范围（getModuleVisibleDeviceIds）过滤，不再按商户
function defaultAccessHelper(overrides = {}) {
  return {
    isSuperAdmin: () => false,
    deviceScopeUnrestricted: () => false,
    resolveCurrentStaffAccess: () => ({ isScoped: false, currentStaff: null, merchantName: '' }),
    hasModulePermission: () => true,
    getModuleVisibleDeviceIds: () => [],
    ...overrides
  };
}

function buildSandbox(overrides = {}) {
  const accessHelper = overrides.accessHelper || defaultAccessHelper();
  const sandbox = {
    console,
    window: { CofeAdminStaffAccess: accessHelper },
    document: createDocument(),
    ordersData: [],
    filteredData: [],
    deviceContextMap: {},
    deviceFilterOptions: [],
    allDeviceOptions: [],
    deviceFilterLocationMap: {},
    currentPage: 1,
    pageSize: 20,
    currentStaffOrderAccess: {
      isScoped: false,
      visibleDeviceIds: [],
      scopeMessage: ''
    },
    calculateTotal() {},
    renderTodayMetrics() {},
    ...overrides
  };
  delete sandbox.accessHelper;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  [
    'resolveCurrentStaffOrderAccess',
    'applyScopedOrdersData',
    'getScopedOrderEmptyText',
    'rebuildDeviceFilterData',
    'renderTable'
  ].forEach((functionName) => {
    vm.runInContext(extractFunctionSource(html, functionName), sandbox);
  });
  return sandbox;
}

test('订单页应显式引入共享员工权限脚本', () => {
  assert.ok(/<script src="shared\/admin-staff-access\.js"><\/script>/.test(html));
});

test('订单页：超管登录不应限制订单可见范围', () => {
  const sandbox = buildSandbox({
    accessHelper: defaultAccessHelper({
      isSuperAdmin: () => true,
      deviceScopeUnrestricted: () => true
    })
  });

  const access = sandbox.resolveCurrentStaffOrderAccess();
  assert.strictEqual(access.isScoped, false);
  assert.strictEqual(access.scopeMessage, '');

  const passthrough = sandbox.applyScopedOrdersData([
    { id: 'O-1', deviceId: 'RCK386' },
    { id: 'O-2', deviceId: 'RCK410' },
    { id: 'O-3', deviceId: 'RCK999' }
  ], access);
  assert.deepStrictEqual(Array.from(passthrough.map((order) => order.id)), ['O-1', 'O-2', 'O-3']);
});

test('订单页：受限员工只看到本人订单页设备范围内的订单（数据权限跟人走）', () => {
  const staff = {
    id: 'S001',
    merchantId: 'C001',
    devices: ['RCK386', 'RCK385'],
    permissions: ['ops.orders']
  };
  const sandbox = buildSandbox({
    accessHelper: defaultAccessHelper({
      resolveCurrentStaffAccess: () => ({ isScoped: true, currentStaff: staff, merchantName: '星巴克咖啡' }),
      getModuleVisibleDeviceIds: (record, moduleKey) => (moduleKey === 'orders' ? record.devices : [])
    })
  });

  const access = sandbox.resolveCurrentStaffOrderAccess();
  assert.strictEqual(access.isScoped, true);
  assert.deepStrictEqual(Array.from(access.visibleDeviceIds), ['RCK386', 'RCK385']);
  assert.ok(access.scopeMessage.includes('2 台设备'), `期望含设备数：${access.scopeMessage}`);

  const scopedOrders = sandbox.applyScopedOrdersData([
    { id: 'O-1', deviceId: 'RCK386' },
    { id: 'O-2', deviceId: 'RCK385' },
    { id: 'O-3', deviceId: 'RCK410' }
  ], access);
  assert.deepStrictEqual(Array.from(scopedOrders.map((order) => order.id)), ['O-1', 'O-2']);
});

test('订单页：设备白名单隔离 — 员工 A 不应看到员工 B 范围内的订单', () => {
  const staffAHelper = defaultAccessHelper({
    resolveCurrentStaffAccess: () => ({ isScoped: true, currentStaff: { devices: ['RCK386'] } }),
    getModuleVisibleDeviceIds: (record) => record.devices
  });
  const staffBHelper = defaultAccessHelper({
    resolveCurrentStaffAccess: () => ({ isScoped: true, currentStaff: { devices: ['RCK410'] } }),
    getModuleVisibleDeviceIds: (record) => record.devices
  });
  const orders = [
    { id: 'O-A', deviceId: 'RCK386' },
    { id: 'O-B', deviceId: 'RCK410' }
  ];

  const sandboxA = buildSandbox({ accessHelper: staffAHelper });
  const accessA = sandboxA.resolveCurrentStaffOrderAccess();
  const seenByA = sandboxA.applyScopedOrdersData(orders, accessA);
  assert.deepStrictEqual(Array.from(seenByA.map((o) => o.id)), ['O-A']);

  const sandboxB = buildSandbox({ accessHelper: staffBHelper });
  const accessB = sandboxB.resolveCurrentStaffOrderAccess();
  const seenByB = sandboxB.applyScopedOrdersData(orders, accessB);
  assert.deepStrictEqual(Array.from(seenByB.map((o) => o.id)), ['O-B']);
});

test('订单页：有订单权限但未分配设备时应给出友好空状态文案', () => {
  const sandbox = buildSandbox({
    accessHelper: defaultAccessHelper({
      resolveCurrentStaffAccess: () => ({ isScoped: true, currentStaff: { devices: [] } }),
      getModuleVisibleDeviceIds: () => []
    })
  });
  const access = sandbox.resolveCurrentStaffOrderAccess();
  assert.strictEqual(access.isScoped, true);
  assert.deepStrictEqual(Array.from(access.visibleDeviceIds), []);
  assert.strictEqual(access.scopeMessage, '你已拥有订单页面权限，但当前未分配可查看的设备，请联系管理员调整');
});

test('订单页：无订单页面权限 → 空范围并提示未开通', () => {
  const sandbox = buildSandbox({
    accessHelper: defaultAccessHelper({
      resolveCurrentStaffAccess: () => ({ isScoped: true, currentStaff: { devices: ['RCK386'] } }),
      hasModulePermission: () => false
    })
  });
  const access = sandbox.resolveCurrentStaffOrderAccess();
  assert.strictEqual(access.isScoped, true);
  assert.deepStrictEqual(Array.from(access.visibleDeviceIds), []);
  assert.strictEqual(access.scopeMessage, '当前账号暂未开通订单页面权限');
});

test('订单页：全平台数据范围（平台运维）但无订单权限 → 仍被拒绝（数据与操作权限正交）', () => {
  const sandbox = buildSandbox({
    accessHelper: defaultAccessHelper({
      deviceScopeUnrestricted: () => true,
      resolveCurrentStaffAccess: () => ({
        isScoped: true,
        currentStaff: { devices: [], deviceDataScope: 'all', permissions: ['ops.devices', 'ops.faults'] }
      }),
      hasModulePermission: (record, moduleKey) => (record.permissions || []).includes(`ops.${moduleKey}`)
    })
  });
  const access = sandbox.resolveCurrentStaffOrderAccess();
  assert.strictEqual(access.isScoped, true, '权限门禁必须先于数据范围放行');
  assert.deepStrictEqual(Array.from(access.visibleDeviceIds), []);
  assert.strictEqual(access.scopeMessage, '当前账号暂未开通订单页面权限');
});

test('订单页：设备筛选选项应只来自当前可见设备订单', () => {
  const sandbox = buildSandbox({
    ordersData: [
      { id: 'O-1', deviceId: 'RCK386' },
      { id: 'O-2', deviceId: 'RCK386' },
      { id: 'O-3', deviceId: 'RCK385' }
    ],
    deviceContextMap: {
      RCK386: { location: '徐汇行政服务中心' },
      RCK385: { location: '静安政务大厅' }
    }
  });

  sandbox.rebuildDeviceFilterData();

  assert.deepStrictEqual(
    Array.from(sandbox.deviceFilterOptions.map((item) => item.id)),
    ['RCK386', 'RCK385']
  );
  assert.strictEqual(sandbox.deviceFilterLocationMap.RCK386, '徐汇行政服务中心');
});

test('订单页：无可见设备时应展示清晰空状态', () => {
  const sandbox = buildSandbox({
    filteredData: [],
    currentStaffOrderAccess: {
      isScoped: true,
      visibleDeviceIds: [],
      scopeMessage: '当前商户名下暂无可见设备的订单'
    }
  });

  sandbox.renderTable();

  assert.ok(sandbox.document.getElementById('orderTableBody').innerHTML.includes('当前商户名下暂无可见设备的订单'));
  assert.ok(sandbox.document.getElementById('orderMobileList').innerHTML.includes('当前商户名下暂无可见设备的订单'));
});

test('订单页：无 CofeAdminStaffAccess 时回退为不过滤（向后兼容）', () => {
  const sandbox = buildSandbox({ window: {} });
  const access = sandbox.resolveCurrentStaffOrderAccess([
    { id: 'RCK386', merchant: 'mer001' }
  ]);
  assert.strictEqual(access.isScoped, false);
  assert.deepStrictEqual(Array.from(access.visibleDeviceIds), []);
});
