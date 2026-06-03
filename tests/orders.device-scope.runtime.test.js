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

function defaultAccessHelper(overrides = {}) {
  return {
    isSuperAdmin: () => false,
    getMerchantScope: () => '',
    getMerchantDeviceIds: () => [],
    resolveCurrentStaffAccess: () => ({ merchantName: '' }),
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
    accessHelper: defaultAccessHelper({ isSuperAdmin: () => true })
  });

  const access = sandbox.resolveCurrentStaffOrderAccess([
    { id: 'RCK386', merchant: 'mer001' },
    { id: 'RCK410', merchant: 'mer002' }
  ]);
  assert.strictEqual(access.isScoped, false);
  assert.strictEqual(access.scopeMessage, '');

  const passthrough = sandbox.applyScopedOrdersData([
    { id: 'O-1', deviceId: 'RCK386' },
    { id: 'O-2', deviceId: 'RCK410' },
    { id: 'O-3', deviceId: 'RCK999' }
  ], access);
  assert.deepStrictEqual(Array.from(passthrough.map((order) => order.id)), ['O-1', 'O-2', 'O-3']);
});

test('订单页：商户账号只看到该商户名下设备的订单', () => {
  const sandbox = buildSandbox({
    accessHelper: defaultAccessHelper({
      getMerchantScope: () => 'C001',
      getMerchantDeviceIds: (merchantId, devices) => {
        if (merchantId !== 'C001') return [];
        return (devices || [])
          .filter((d) => d && d.merchant === 'mer001')
          .map((d) => d.id);
      },
      resolveCurrentStaffAccess: () => ({ merchantName: '星巴克咖啡' })
    })
  });

  const runtimeDevices = [
    { id: 'RCK386', merchant: 'mer001' },
    { id: 'RCK385', merchant: 'mer001' },
    { id: 'RCK410', merchant: 'mer002' }
  ];
  const access = sandbox.resolveCurrentStaffOrderAccess(runtimeDevices);
  assert.strictEqual(access.isScoped, true);
  assert.strictEqual(access.merchantId, 'C001');
  assert.deepStrictEqual(Array.from(access.visibleDeviceIds), ['RCK386', 'RCK385']);
  assert.ok(access.scopeMessage.includes('星巴克咖啡'), `期望 scopeMessage 含商户名：${access.scopeMessage}`);
  assert.ok(access.scopeMessage.includes('共 2 台设备'), `期望含设备数：${access.scopeMessage}`);

  const scopedOrders = sandbox.applyScopedOrdersData([
    { id: 'O-1', deviceId: 'RCK386' },
    { id: 'O-2', deviceId: 'RCK385' },
    { id: 'O-3', deviceId: 'RCK410' }
  ], access);
  assert.deepStrictEqual(Array.from(scopedOrders.map((order) => order.id)), ['O-1', 'O-2']);
});

test('订单页：跨商户隔离 — 商户 A 不应看到商户 B 的订单', () => {
  const merchantAHelper = defaultAccessHelper({
    getMerchantScope: () => 'C001',
    getMerchantDeviceIds: (_m, devices) => (devices || []).filter((d) => d.merchant === 'mer001').map((d) => d.id)
  });
  const merchantBHelper = defaultAccessHelper({
    getMerchantScope: () => 'C002',
    getMerchantDeviceIds: (_m, devices) => (devices || []).filter((d) => d.merchant === 'mer002').map((d) => d.id)
  });
  const devices = [
    { id: 'RCK386', merchant: 'mer001' },
    { id: 'RCK410', merchant: 'mer002' }
  ];
  const orders = [
    { id: 'O-A', deviceId: 'RCK386' },
    { id: 'O-B', deviceId: 'RCK410' }
  ];

  const sandboxA = buildSandbox({ accessHelper: merchantAHelper });
  const accessA = sandboxA.resolveCurrentStaffOrderAccess(devices);
  const seenByA = sandboxA.applyScopedOrdersData(orders, accessA);
  assert.deepStrictEqual(Array.from(seenByA.map((o) => o.id)), ['O-A']);

  const sandboxB = buildSandbox({ accessHelper: merchantBHelper });
  const accessB = sandboxB.resolveCurrentStaffOrderAccess(devices);
  const seenByB = sandboxB.applyScopedOrdersData(orders, accessB);
  assert.deepStrictEqual(Array.from(seenByB.map((o) => o.id)), ['O-B']);
});

test('订单页：商户名下无可见设备时应给出友好空状态文案', () => {
  const sandbox = buildSandbox({
    accessHelper: defaultAccessHelper({
      getMerchantScope: () => 'C999',
      getMerchantDeviceIds: () => [],
      resolveCurrentStaffAccess: () => ({ merchantName: '未知商户' })
    })
  });
  const access = sandbox.resolveCurrentStaffOrderAccess([
    { id: 'RCK386', merchant: 'mer001' }
  ]);
  assert.strictEqual(access.isScoped, true);
  assert.deepStrictEqual(Array.from(access.visibleDeviceIds), []);
  assert.strictEqual(access.scopeMessage, '当前商户名下暂无可见设备的订单');
});

test('订单页：未绑定商户也非超管 → 给出"未绑定商户"提示', () => {
  const sandbox = buildSandbox({
    accessHelper: defaultAccessHelper({
      isSuperAdmin: () => false,
      getMerchantScope: () => ''
    })
  });
  const access = sandbox.resolveCurrentStaffOrderAccess([
    { id: 'RCK386', merchant: 'mer001' }
  ]);
  assert.strictEqual(access.isScoped, true);
  assert.deepStrictEqual(Array.from(access.visibleDeviceIds), []);
  assert.strictEqual(access.scopeMessage, '当前账号未绑定商户，无法查看订单');
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
