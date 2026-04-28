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
    globalThis: null
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  vm.runInContext(extractConstBlock(html, 'deviceScopedModuleConfigs'), sandbox);
  vm.runInContext(extractFunctionSource(html, 'getDeviceScopedModuleConfig'), sandbox);

  [
    'buildEmptyCustomScopeMessage',
    'buildNextModuleDeviceScope',
    'buildSavedModuleDeviceScopeSelection',
    'getAvailableScopedModulesForStep',
    'getEmptyCustomScopeModuleKeys',
    'resolveStaffModalValidationResult'
  ].forEach((functionName) => {
    vm.runInContext(extractFunctionSource(html, functionName), sandbox);
  });

  return sandbox;
}

test('permission matrix only treats authorized device-scoped modules as active', () => {
  const sandbox = loadSandbox();
  const modules = sandbox.getAvailableScopedModulesForStep(['ops.overview', 'ops.orders', 'ops.staff']);

  assert.deepStrictEqual(Array.from(modules.map((item) => item.moduleKey)), ['orders']);
});

test('custom device scope starts from all manageable devices so admins only remove blocked devices', () => {
  const sandbox = loadSandbox();

  const result = sandbox.buildNextModuleDeviceScope(
      { mode: 'inherit', deviceIds: [] },
      'custom',
      ['RCK386', 'RCK385']
  );

  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(result)),
    { mode: 'custom', deviceIds: ['RCK386', 'RCK385'] }
  );
});

test('saving all selected devices keeps page scope inherited', () => {
  const sandbox = loadSandbox();
  const result = sandbox.buildSavedModuleDeviceScopeSelection(
    ['RCK386', 'RCK385'],
    ['RCK386', 'RCK385']
  );

  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(result)),
    { mode: 'inherit', deviceIds: [] }
  );
});

test('custom scope pruned to zero stays invalid until manually fixed', () => {
  const sandbox = loadSandbox();
  const invalidKeys = sandbox.getEmptyCustomScopeModuleKeys(
    { faults: { mode: 'custom', deviceIds: [] } },
    ['ops.faults']
  );

  assert.deepStrictEqual(Array.from(invalidKeys), ['faults']);
  const result = sandbox.resolveStaffModalValidationResult({
      username: '王运维',
      phone: '13800138021',
      selectedPermissions: ['ops.faults'],
      selectedDevices: ['RCK386'],
      moduleDeviceScopes: { faults: { mode: 'custom', deviceIds: [] } }
  });

  assert.strictEqual(result.stepKey, 'permissionMatrix');
  assert.strictEqual(
    result.message,
    '故障列表页面已设置为“指定设备”，但还没有可查看设备。请点击“选择设备”，或改为“全部可管理设备”。'
  );
});

test('basic info errors stay in the always-visible section instead of focusing matrix', () => {
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
