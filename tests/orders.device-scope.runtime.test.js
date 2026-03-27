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

function buildSandbox(overrides = {}) {
  const sandbox = {
    console,
    window: {
      CofeAdminStaffAccess: {
        resolveCurrentStaffAccess() {
          return { isScoped: false, currentStaff: null };
        },
        hasModulePermission() {
          return false;
        },
        getModuleVisibleDeviceIds() {
          return [];
        }
      }
    },
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

test('订单页：解析到当前员工后应产出订单页设备范围和提示文案', () => {
  const sandbox = buildSandbox({
    window: {
      CofeAdminStaffAccess: {
        resolveCurrentStaffAccess() {
          return { isScoped: true, currentStaff: { username: '王运维' } };
        },
        hasModulePermission() {
          return true;
        },
        getModuleVisibleDeviceIds() {
          return ['RCK386', 'RCK385', 'RCK384'];
        }
      }
    }
  });

  const access = sandbox.resolveCurrentStaffOrderAccess();
  assert.strictEqual(access.isScoped, true);
  assert.deepStrictEqual(Array.from(access.visibleDeviceIds), ['RCK386', 'RCK385', 'RCK384']);
  assert.strictEqual(access.scopeMessage, '当前可查看订单设备：3 台');
});

test('订单页：被分配范围后应只保留可见设备的订单', () => {
  const sandbox = buildSandbox();
  const scopedOrders = sandbox.applyScopedOrdersData([
    { id: 'O-1', deviceId: 'RCK386' },
    { id: 'O-2', deviceId: 'RCK385' },
    { id: 'O-3', deviceId: 'RCK999' }
  ], {
    isScoped: true,
    visibleDeviceIds: ['RCK386', 'RCK385']
  });

  assert.deepStrictEqual(Array.from(scopedOrders.map((item) => item.id)), ['O-1', 'O-2']);
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

test('订单页：无订单页权限或无可见设备时应展示清晰空状态', () => {
  const sandbox = buildSandbox({
    filteredData: [],
    currentStaffOrderAccess: {
      isScoped: true,
      visibleDeviceIds: [],
      scopeMessage: '当前账号暂未开通订单页面权限'
    }
  });

  sandbox.renderTable();

  assert.ok(sandbox.document.getElementById('orderTableBody').innerHTML.includes('当前账号暂未开通订单页面权限'));
  assert.ok(sandbox.document.getElementById('orderMobileList').innerHTML.includes('当前账号暂未开通订单页面权限'));
});
