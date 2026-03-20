const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'staff-management.html'), 'utf8');

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
  let paramsDepth = 0;
  let bodyStart = -1;
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === '(') paramsDepth += 1;
    if (source[index] === ')') paramsDepth -= 1;
    if (paramsDepth === 0 && source[index] === '{') {
      bodyStart = index;
      break;
    }
  }
  if (bodyStart === -1) {
    throw new Error(`函数 ${functionName} 函数体解析失败`);
  }
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) {
      return source.slice(start, index + 1);
    }
  }
  throw new Error(`函数 ${functionName} 解析失败`);
}

function extractConstBlock(source, constName) {
  const signature = `const ${constName} = `;
  const start = source.indexOf(signature);
  if (start === -1) {
    throw new Error(`未找到常量 ${constName}`);
  }
  const braceStart = source.indexOf('[', start);
  let depth = 0;
  for (let index = braceStart; index < source.length; index += 1) {
    if (source[index] === '[') depth += 1;
    if (source[index] === ']') depth -= 1;
    if (depth === 0) {
      const semicolonIndex = source.indexOf(';', index);
      return source.slice(start, semicolonIndex + 1);
    }
  }
  throw new Error(`常量 ${constName} 解析失败`);
}

function loadSandbox() {
  const sandbox = {
    console,
    currentStaffModalStep: 'manageableDevices',
    completedStaffModalSteps: new Set(),
    globalThis: null
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  vm.runInContext(extractConstBlock(html, 'deviceScopedModuleConfigs'), sandbox);
  vm.runInContext(extractConstBlock(html, 'staffModalStepConfigs'), sandbox);
  vm.runInContext(extractFunctionSource(html, 'getDeviceScopedModuleConfig'), sandbox);
  vm.runInContext(extractFunctionSource(html, 'getStaffModalStepIndex'), sandbox);
  vm.runInContext(extractFunctionSource(html, 'getStaffModalMaxOpenIndex'), sandbox);

  [
    'getAvailableScopedModulesForStep',
    'canOpenStaffModalStep',
    'getEmptyCustomScopeModuleKeys',
    'resolveStaffModalValidationResult'
  ].forEach((functionName) => {
    vm.runInContext(extractFunctionSource(html, functionName), sandbox);
  });

  return sandbox;
}

test('future steps stay locked until previous steps are complete', () => {
  const sandbox = loadSandbox();
  sandbox.currentStaffModalStep = 'manageableDevices';
  sandbox.completedStaffModalSteps = new Set();

  assert.strictEqual(sandbox.canOpenStaffModalStep('pagePermissions'), false);
  assert.strictEqual(sandbox.canOpenStaffModalStep('pageDeviceScopes'), false);
});

test('completed earlier steps stay reopenable from the step header', () => {
  const sandbox = loadSandbox();
  sandbox.currentStaffModalStep = 'pageDeviceScopes';
  sandbox.completedStaffModalSteps = new Set(['manageableDevices', 'pagePermissions']);

  assert.strictEqual(sandbox.canOpenStaffModalStep('manageableDevices'), true);
  assert.strictEqual(sandbox.canOpenStaffModalStep('pagePermissions'), true);
});

test('step 3 only includes authorized scoped modules', () => {
  const sandbox = loadSandbox();
  const modules = sandbox.getAvailableScopedModulesForStep(['ops.overview', 'ops.orders', 'ops.staff']);

  assert.deepStrictEqual(Array.from(modules.map((item) => item.moduleKey)), ['orders']);
});

test('custom scope pruned to zero stays invalid until manually fixed', () => {
  const sandbox = loadSandbox();
  const invalidKeys = sandbox.getEmptyCustomScopeModuleKeys(
    { faults: { mode: 'custom', deviceIds: [] } },
    ['ops.faults']
  );

  assert.deepStrictEqual(Array.from(invalidKeys), ['faults']);
  assert.strictEqual(
    sandbox.resolveStaffModalValidationResult({
      username: '王运维',
      phone: '13800138021',
      selectedPermissions: ['ops.faults'],
      selectedDevices: ['RCK386'],
      moduleDeviceScopes: { faults: { mode: 'custom', deviceIds: [] } }
    }).stepKey,
    'pageDeviceScopes'
  );
});

test('basic info errors stay in the always-visible section instead of forcing step 1 open', () => {
  const sandbox = loadSandbox();
  const result = sandbox.resolveStaffModalValidationResult({
    username: '',
    phone: '',
    selectedPermissions: ['ops.orders'],
    selectedDevices: ['RCK386'],
    moduleDeviceScopes: { orders: { mode: 'inherit', deviceIds: [] } }
  });

  assert.strictEqual(result.stepKey, '');
  assert.strictEqual(result.message, '请填写用户名和手机号');
});
