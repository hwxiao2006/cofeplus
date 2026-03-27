const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'devices.html'), 'utf8');

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
    ...overrides
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  ['resolveCurrentStaffDeviceAccess', 'applyScopedDeviceList', 'getScopedDeviceEmptyText'].forEach((functionName) => {
    vm.runInContext(extractFunctionSource(html, functionName), sandbox);
  });
  return sandbox;
}

test('设备页应显式引入共享员工权限脚本', () => {
  assert.ok(/<script src="shared\/admin-staff-access\.js"><\/script>/.test(html));
});

test('设备页：解析到当前员工后应产出设备页范围和提示文案', () => {
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
          return ['RCK386', 'RCK385'];
        }
      }
    }
  });

  const access = sandbox.resolveCurrentStaffDeviceAccess();
  assert.strictEqual(access.isScoped, true);
  assert.deepStrictEqual(Array.from(access.visibleDeviceIds), ['RCK386', 'RCK385']);
  assert.strictEqual(access.scopeMessage, '当前可查看设备：2 台');
});

test('设备页：被分配范围后应只保留可见设备', () => {
  const sandbox = buildSandbox();
  const scopedDevices = sandbox.applyScopedDeviceList([
    { id: 'RCK386', status: 'operational' },
    { id: 'RCK385', status: 'faulted' },
    { id: 'RCK999', status: 'operational' }
  ], {
    isScoped: true,
    visibleDeviceIds: ['RCK386', 'RCK385']
  });

  assert.deepStrictEqual(Array.from(scopedDevices.map((item) => item.id)), ['RCK386', 'RCK385']);
});

test('设备页：无设备页权限时应给出清晰空状态文案', () => {
  const sandbox = buildSandbox({
    window: {
      CofeAdminStaffAccess: {
        resolveCurrentStaffAccess() {
          return { isScoped: true, currentStaff: { username: '李财务' } };
        },
        hasModulePermission() {
          return false;
        },
        getModuleVisibleDeviceIds() {
          return [];
        }
      }
    }
  });

  const access = sandbox.resolveCurrentStaffDeviceAccess();
  assert.strictEqual(access.scopeMessage, '当前账号暂未开通设备页面权限');
  assert.strictEqual(sandbox.getScopedDeviceEmptyText(access), access.scopeMessage);
});
