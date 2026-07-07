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

// 可选设备清单跟登录者本人数据权限走：
// unrestricted=超管/平台运维（全平台）；ownDevices=受限员工本人的设备白名单；
// ownDevices 为 null 且非 unrestricted → 商户兜底过滤（老登录态无人员记录）。
function buildSandbox({
  devicesData,
  locationsData = [],
  unrestricted = true,
  loginMerchantId = 'C001',
  ownDevices = null,
  editingStaffId = null,
  staffManagersData = []
} = {}) {
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
    isSuperAdminUser() {
      return unrestricted;
    },
    getCurrentMerchantContext() {
      return { merchantId: loginMerchantId, merchantName: '测试商户' };
    },
    editingStaffId,
    staffManagersData,
    window: {
      CofeAdminStaffAccess: {
        deviceScopeUnrestricted() {
          return unrestricted;
        },
        resolveCurrentStaffAccess() {
          return ownDevices
            ? { currentStaff: { devices: ownDevices } }
            : { currentStaff: null };
        },
        convertMerchantKeyToMerchantId(merchantKey) {
          const matched = String(merchantKey || '').trim().match(/^mer(\d+)$/i);
          return matched ? `C${matched[1].padStart(3, '0')}` : '';
        }
      }
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
    'deviceMerchantToMerchantId',
    'buildLocationLookup',
    'normalizeLocationMeta',
    'buildLocationLabel',
    'isEditorDeviceScopeUnrestricted',
    'getDeviceOptionsForCurrentEditor'
  ].forEach((functionName) => {
    vm.runInContext(extractFunctionSource(staffHtml, functionName), sandbox);
  });
  return sandbox;
}

test('人员管理：范围不受限（超管/平台运维）设备候选为全平台，本地数据稀疏时补齐到共享默认 18 台', () => {
  const sparseDevices = [
    { id: 'RCK386', merchant: 'mer001', location: 'k8298' },
    { id: 'RCK385', merchant: 'mer001', location: 'k8298' }
  ];
  const sandbox = buildSandbox({
    devicesData: sparseDevices,
    unrestricted: true,
    locationsData: [
      { code: 'k8298', name: '上海市中心店' },
      { code: 'k8667', name: '北京朝阳门店' },
      { code: 'k9001', name: '广州天河店' },
      { code: 'k9002', name: '深圳南山店' }
    ]
  });

  const options = sandbox.getDeviceOptionsForCurrentEditor();

  assert.strictEqual(options.length, 18);
  assert.ok(options.every((device) => /^C\d{3}$|^$/.test(device.merchantId)), '每台设备应带归一化商户 ID');
});

test('人员管理：范围不受限且本地无设备缓存时，设备候选回退到共享默认 18 台', () => {
  const sandbox = buildSandbox({
    devicesData: [],
    unrestricted: true,
    locationsData: [
      { code: 'k8298', name: '上海市中心店' },
      { code: 'k8667', name: '北京朝阳门店' },
      { code: 'k9001', name: '广州天河店' },
      { code: 'k9002', name: '深圳南山店' }
    ]
  });

  const options = sandbox.getDeviceOptionsForCurrentEditor();

  assert.strictEqual(options.length, 18);
});

test('人员管理：受限员工（如商户管理员）设备候选=本人已被分配的设备，不能超过自己数据权限', () => {
  const sandbox = buildSandbox({
    devicesData: [],
    unrestricted: false,
    ownDevices: ['RCK386', 'RCK385']
  });

  const options = sandbox.getDeviceOptionsForCurrentEditor();

  assert.deepStrictEqual(
    Array.from(options.map((device) => device.id)).sort(),
    ['RCK385', 'RCK386'],
    '受限员工的可分配清单必须等于本人设备白名单'
  );
});

test('人员管理：受限员工编辑他人时，目标员工已有设备并入清单（可见可移除），新增仍限本人范围', () => {
  const sandbox = buildSandbox({
    devicesData: [],
    unrestricted: false,
    ownDevices: ['RCK386'],
    editingStaffId: 'S009',
    staffManagersData: [
      { id: 'S009', devices: ['RCK410'] }
    ]
  });

  const options = sandbox.getDeviceOptionsForCurrentEditor();

  assert.deepStrictEqual(
    Array.from(options.map((device) => device.id)).sort(),
    ['RCK386', 'RCK410'],
    '清单=本人设备 ∪ 目标员工已有设备'
  );
});

test('人员管理：无人员记录的商户登录兜底为登录商户设备', () => {
  const sandbox = buildSandbox({
    devicesData: [],
    unrestricted: false,
    ownDevices: null,
    loginMerchantId: 'C001'
  });

  const options = sandbox.getDeviceOptionsForCurrentEditor();

  assert.ok(options.length > 0, '登录商户应有可选设备');
  assert.ok(options.every((device) => device.merchantId === 'C001'), '兜底不得看到其他商户设备');
  assert.ok(options.length < 18, '兜底候选应少于全平台总数');
});
