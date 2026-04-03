const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const staffHtml = fs.readFileSync(path.join(__dirname, '..', 'staff-management.html'), 'utf8');
const sharedJs = fs.readFileSync(path.join(__dirname, '..', 'shared', 'admin-mock-data.js'), 'utf8');

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
  const bodyStart = source.indexOf('{', start);
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

function extractConstObject(source, constName) {
  const signature = `const ${constName} = `;
  const start = source.indexOf(signature);
  if (start === -1) {
    throw new Error(`未找到常量 ${constName}`);
  }
  const objectStart = source.indexOf('{', start);
  let depth = 0;
  for (let index = objectStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) {
      return source.slice(objectStart, index + 1);
    }
  }
  throw new Error(`常量 ${constName} 解析失败`);
}

function extractConstArray(source, constName) {
  const signature = `const ${constName} = `;
  const start = source.indexOf(signature);
  if (start === -1) {
    throw new Error(`未找到常量 ${constName}`);
  }
  const arrayStart = source.indexOf('[', start);
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let previous = '';
  for (let index = arrayStart; index < source.length; index += 1) {
    const char = source[index];
    if (inSingle) {
      if (char === '\'' && previous !== '\\') inSingle = false;
      previous = char;
      continue;
    }
    if (inDouble) {
      if (char === '"' && previous !== '\\') inDouble = false;
      previous = char;
      continue;
    }
    if (inTemplate) {
      if (char === '`' && previous !== '\\') inTemplate = false;
      previous = char;
      continue;
    }
    if (char === '\'') {
      inSingle = true;
      previous = char;
      continue;
    }
    if (char === '"') {
      inDouble = true;
      previous = char;
      continue;
    }
    if (char === '`') {
      inTemplate = true;
      previous = char;
      continue;
    }
    if (char === '[') depth += 1;
    if (char === ']') depth -= 1;
    if (depth === 0) {
      return source.slice(arrayStart, index + 1);
    }
    previous = char;
  }
  throw new Error(`常量 ${constName} 解析失败`);
}

const defaultLocationOptions = vm.runInNewContext(`(${extractConstArray(staffHtml, 'defaultLocationOptions')})`);
const defaultDeviceMap = vm.runInNewContext(`(${extractConstObject(staffHtml, 'defaultDeviceMap')})`);
const defaultDeviceLocationMap = vm.runInNewContext(`(${extractConstObject(staffHtml, 'defaultDeviceLocationMap')})`);

function buildSharedMockData() {
  const sandbox = {
    console,
    window: {},
    globalThis: null
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(sharedJs, sandbox);
  return sandbox.window.COFE_SHARED_MOCK_DATA || sandbox.COFE_SHARED_MOCK_DATA;
}

function buildSandbox({ devicesData, locationsData = [] } = {}) {
  const sharedAdminMockData = buildSharedMockData();
  const storage = {
    devicesData: JSON.stringify(devicesData || []),
    locationsData: JSON.stringify(locationsData)
  };
  const sandbox = {
    console,
    sharedAdminMockData,
    cloneSharedStaffData(value) {
      return JSON.parse(JSON.stringify(value));
    },
    resolveRuntimeManageableDevices(storedDevices) {
      if (sharedAdminMockData?.helpers?.resolveDevices) {
        return sharedAdminMockData.helpers.resolveDevices(storedDevices);
      }
      return Array.isArray(storedDevices) ? storedDevices : [];
    },
    localStorage: {
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null;
      }
    },
    defaultLocationOptions,
    defaultDeviceMap,
    defaultDeviceLocationMap,
    globalThis: null
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  [
    'buildMerchantAliases',
    'buildLocationLookup',
    'normalizeLocationMeta',
    'buildLocationLabel',
    'getDeviceOptionsByMerchant'
  ].forEach((functionName) => {
    vm.runInContext(extractFunctionSource(staffHtml, functionName), sandbox);
  });
  return sandbox;
}

test('人员管理：本地设备数据稀疏时，设备候选应补齐到共享默认 18 台', () => {
  const sparseDevices = [
    { id: 'RCK386', merchant: 'mer001', location: 'k8298' },
    { id: 'RCK385', merchant: 'mer001', location: 'k8298' }
  ];
  const sandbox = buildSandbox({
    devicesData: sparseDevices,
    locationsData: [
      { code: 'k8298', name: '上海市中心店' },
      { code: 'k8667', name: '北京朝阳门店' },
      { code: 'k9001', name: '广州天河店' },
      { code: 'k9002', name: '深圳南山店' }
    ]
  });

  const options = sandbox.getDeviceOptionsByMerchant('C001');

  assert.strictEqual(options.length, 18);
});

test('人员管理：本地无设备缓存时，设备候选应回退到共享默认 18 台', () => {
  const sandbox = buildSandbox({
    devicesData: [],
    locationsData: [
      { code: 'k8298', name: '上海市中心店' },
      { code: 'k8667', name: '北京朝阳门店' },
      { code: 'k9001', name: '广州天河店' },
      { code: 'k9002', name: '深圳南山店' }
    ]
  });

  const options = sandbox.getDeviceOptionsByMerchant('C001');

  assert.strictEqual(options.length, 18);
});
