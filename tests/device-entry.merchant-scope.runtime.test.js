const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'device-entry.html'), 'utf8');

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
  let braceStart = -1;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (char === '(') paramsDepth += 1;
    if (char === ')') {
      paramsDepth -= 1;
      continue;
    }
    if (char === '{' && paramsDepth === 0) {
      braceStart = index;
      break;
    }
  }
  if (braceStart === -1) {
    throw new Error(`函数 ${functionName} 缺少函数体`);
  }
  let depth = 0;
  for (let index = braceStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) {
      return source.slice(start, index + 1);
    }
  }
  throw new Error(`函数 ${functionName} 解析失败`);
}

function createLocalStorage(seed = {}) {
  const store = { ...seed };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    dump(key) {
      return store[key];
    }
  };
}

function createGroup(value) {
  return {
    querySelector(selector) {
      if (selector !== '.switch-item.active') return null;
      return {
        dataset: { value },
        textContent: value
      };
    }
  };
}

function buildSandbox(storageSeed = {}) {
  const elements = {};
  const alerts = [];
  const localStorage = createLocalStorage(storageSeed);
  const windowObject = { location: { href: 'device-entry.html' } };

  function getElement(id) {
    if (!elements[id]) {
      elements[id] = {
        id,
        value: '',
        innerHTML: '',
        textContent: '',
        checked: false,
        options: [],
        selectedIndex: 0,
        dataset: {},
        classList: {
          add() {},
          remove() {},
          contains() { return false; }
        },
        querySelector() {
          return null;
        }
      };
    }
    return elements[id];
  }

  const sandbox = {
    console,
    JSON,
    Math,
    Date,
    localStorage,
    window: windowObject,
    document: {
      getElementById: getElement
    },
    devicesData: [],
    locationsData: [],
    customersData: [],
    selectedDevice: null,
    deviceSearchLocationMap: {},
    unenteredDeviceOptions: [],
    entryAdScreenDraft: { leftMenu: null, rightQueueBackground: null },
    entryLocationImageDrafts: [],
    alert(message) {
      alerts.push(message);
    }
  };

  vm.createContext(sandbox);
  vm.runInContext("const merchantMap = { 'mer001': '星巴克咖啡', 'mer002': '瑞幸咖啡', 'mer003': '太平洋咖啡', 'mer004': 'Costa咖啡' };", sandbox);
  vm.runInContext("const POINT_CATEGORY_OPTIONS = ['exhibition', 'operation'];", sandbox);
  [
    'normalizeEditableValue',
    'normalizeDeviceSearchId',
    'normalizeDeviceSearchText',
    'ensureEntryMockMerchantContext',
    'resolveEntryRuntimeDevices',
    'ensureEntryMockStaffManagers',
    'resolveEntryCurrentMerchantContext',
    'resolveEntryOperatorOptions',
    'getSelectedOperatorMeta',
    'getCurrentEntryMerchantDeviceKey',
    'isDeviceInCurrentMerchantScope',
    'isLocationInCurrentMerchantScope',
    'buildRuntimeLocationMap',
    'resolveDeviceLocationName',
    'rebuildDeviceSearchData',
    'formatDeviceSearchLabel',
    'renderDeviceOptions',
    'renderOperatorOptions',
    'onDeviceChange',
    'onOperatorChange',
    'renderLocationOptions',
    'buildNextLocationId',
    'normalizePointCategory',
    'buildLocationPayloadForEntry',
    'validateQuickCreateLocation',
    'createLocationFromEntry',
    'getTextValue',
    'getInputValue',
    'getSwitchGroupValue',
    'isEnergyModeEnabled',
    'formatEntryTime',
    'getSelectedLocationName',
    'getPaymentMethods',
    'normalizeEntryAdScreenAsset',
    'serializeEntryAdScreenDraft',
    'buildEntryInfoPayload',
    'submitEntry'
  ].forEach((functionName) => {
    vm.runInContext(extractFunctionSource(html, functionName), sandbox);
  });

  sandbox.__elements = elements;
  sandbox.__alerts = alerts;
  sandbox.__localStorage = localStorage;
  sandbox.__window = windowObject;
  return sandbox;
}

function seedSubmitForm(sandbox) {
  const { __elements: elements } = sandbox;
  elements.operatorSelect = {
    id: 'operatorSelect',
    value: 'S001',
    innerHTML: '',
    options: [{
      value: 'S001',
      textContent: '李运维（13912340000）',
      dataset: { name: '李运维', phone: '13912340000' }
    }],
    selectedIndex: 0
  };
  elements.gpsActionDisplay = { id: 'gpsActionDisplay', textContent: '获取当前位置 ›' };
  elements.longitudeDisplay = { id: 'longitudeDisplay', textContent: '121.473700' };
  elements.latitudeDisplay = { id: 'latitudeDisplay', textContent: '31.230400' };
  elements.locationAddressInput = { id: 'locationAddressInput', value: '上海市静安区测试地址 1 号' };
  elements.locationSelect = {
    id: 'locationSelect',
    value: 'k1001',
    selectedIndex: 0,
    options: [{ textContent: '静安商圈点位（k1001）', dataset: { address: '上海市静安区测试地址 1 号' } }]
  };
  elements.deviceSelect = {
    id: 'deviceSelect',
    value: 'RCK001',
    innerHTML: '',
    options: [{ value: 'RCK001', textContent: 'RCK001' }],
    selectedIndex: 0
  };
  elements.energyModeGroup = createGroup('开启');
  elements.terminalGenerationGroup = createGroup('开启');
  elements.parallelProductionGroup = createGroup('开启');
  elements.energyStartInput = { id: 'energyStartInput', value: '18:00' };
  elements.energyEndInput = { id: 'energyEndInput', value: '08:00' };
  elements.deviceStartDateInput = { id: 'deviceStartDateInput', value: '2026-04-03' };
  elements.deviceEndDateInput = { id: 'deviceEndDateInput', value: '2027-04-03' };
  elements.networkSignalInput = { id: 'networkSignalInput', value: '优' };
  elements.maintenanceWindowInput = { id: 'maintenanceWindowInput', value: '07:00-09:00' };
  elements.notesInput = { id: 'notesInput', value: '进店后联系店长' };
  elements.payQrCheckbox = { id: 'payQrCheckbox', checked: true };
  elements.payDigitalRmbCheckbox = { id: 'payDigitalRmbCheckbox', checked: false };
}

test('运行时：设备录入候选应只保留当前商户的未入场设备', () => {
  const sandbox = buildSandbox({
    cofeLoginSession: JSON.stringify({ merchantId: 'C001', merchantName: '星巴克咖啡' })
  });
  sandbox.devicesData = [
    { id: 'RCK001', merchant: 'mer001', entered: false, location: '' },
    { id: 'RCK002', merchant: 'mer002', entered: false, location: '' },
    { id: 'RCK003', merchant: 'mer001', entered: true, location: 'k1001' }
  ];
  sandbox.locationsData = [];

  sandbox.rebuildDeviceSearchData();

  assert.deepStrictEqual(Array.from(sandbox.unenteredDeviceOptions.map(item => item.value)), ['RCK001']);
});

test('运行时：设备下拉应只渲染未入场设备并提供空状态文案', () => {
  const sandbox = buildSandbox({
    cofeLoginSession: JSON.stringify({ merchantId: 'C001', merchantName: '星巴克咖啡' })
  });
  sandbox.devicesData = [
    { id: 'RCK001', merchant: 'mer001', entered: false, location: '' },
    { id: 'RCK002', merchant: 'mer001', entered: true, location: '' }
  ];

  sandbox.renderDeviceOptions();

  assert.ok(sandbox.__elements.deviceSelect.innerHTML.includes('RCK001'));
  assert.ok(!sandbox.__elements.deviceSelect.innerHTML.includes('RCK002'));
});

test('运行时：员工下拉应只渲染当前商户下启用中的人员，并自动带出电话', () => {
  const sandbox = buildSandbox({
    cofeLoginSession: JSON.stringify({ merchantId: 'C001', merchantName: '星巴克咖啡' }),
    staffManagersData: JSON.stringify([
      { id: 'S001', merchantId: 'C001', merchantName: '星巴克咖啡', username: '李运维', phone: '13912340000', accountEnabled: true },
      { id: 'S002', merchantId: 'C001', merchantName: '星巴克咖啡', username: '王店长', phone: '13800138002', accountEnabled: false },
      { id: 'S003', merchantId: 'C002', merchantName: '瑞幸咖啡', username: '张维修', phone: '13800138003', accountEnabled: true }
    ])
  });

  sandbox.renderOperatorOptions();
  sandbox.__elements.operatorSelect.value = 'S001';
  sandbox.__elements.operatorSelect.selectedIndex = 1;
  sandbox.onOperatorChange();
  const selectedOperator = sandbox.getSelectedOperatorMeta();

  assert.ok(sandbox.__elements.operatorSelect.innerHTML.includes('李运维（13912340000）'));
  assert.ok(!sandbox.__elements.operatorSelect.innerHTML.includes('王店长'));
  assert.ok(!sandbox.__elements.operatorSelect.innerHTML.includes('张维修'));
  assert.strictEqual(selectedOperator.phone, '13912340000');
});

test('运行时：没有人员数据时应给当前登录商户补最小 mock 员工', () => {
  const sandbox = buildSandbox({
    cofeLoginSession: JSON.stringify({ account: '13800138021', merchantId: 'C001', merchantName: '星巴克咖啡' }),
    sidebarLoginProfile: JSON.stringify({ name: '王运维', phone: '13800138021', merchantId: 'C001', merchantName: '星巴克咖啡' })
  });

  sandbox.ensureEntryMockStaffManagers();
  sandbox.renderOperatorOptions();

  const storedStaff = JSON.parse(sandbox.__localStorage.dump('staffManagersData'));
  assert.strictEqual(storedStaff.length, 1);
  assert.strictEqual(storedStaff[0].merchantId, 'C001');
  assert.strictEqual(storedStaff[0].username, '王运维');
  assert.ok(sandbox.__elements.operatorSelect.innerHTML.includes('王运维（13800138021）'));
});

test('运行时：没有未入场设备时设备下拉应展示空状态文案', () => {
  const sandbox = buildSandbox({
    cofeLoginSession: JSON.stringify({ merchantId: 'C001', merchantName: '星巴克咖啡' })
  });
  sandbox.devicesData = [
    { id: 'RCK001', merchant: 'mer001', entered: true, location: 'k1001' }
  ];

  sandbox.renderDeviceOptions();

  assert.ok(sandbox.__elements.deviceSelect.innerHTML.includes('暂无可入场设备'));
});

test('运行时：已入场设备即使没有点位也不应出现在设备录入候选中', () => {
  const sandbox = buildSandbox({
    cofeLoginSession: JSON.stringify({ merchantId: 'C001', merchantName: '星巴克咖啡' })
  });
  sandbox.devicesData = [
    { id: 'RCK001', merchant: 'mer001', entered: false, location: '' },
    { id: 'RCK002', merchant: 'mer001', entered: true, location: '' }
  ];

  sandbox.rebuildDeviceSearchData();

  assert.deepStrictEqual(Array.from(sandbox.unenteredDeviceOptions.map(item => item.value)), ['RCK001']);
});

test('运行时：本地无设备缓存时应回退共享 18 台基线，并给当前商户 3 台无点位设备', () => {
  const sandbox = buildSandbox({
    cofeLoginSession: JSON.stringify({ merchantId: 'C001', merchantName: '星巴克咖啡' })
  });
  sandbox.window.COFE_SHARED_MOCK_DATA = {
    defaultDevices: [
      { id: 'RCK386', merchant: 'mer001', location: 'k8298', entered: true },
      { id: 'RCK385', merchant: 'mer001', location: 'k8298', entered: true },
      { id: 'RCK384', merchant: 'mer001', location: 'k8298', entered: true },
      { id: 'RCK410', merchant: 'mer002', location: 'k8298', entered: true },
      { id: 'RCK406', merchant: 'mer002', location: 'k8298', entered: true },
      { id: 'RCK405', merchant: 'mer003', location: 'k8298', entered: true },
      { id: 'RCK408', merchant: 'mer003', location: 'k8298', entered: true },
      { id: 'RCK407', merchant: 'mer004', location: 'k8298', entered: true },
      { id: 'RCK409', merchant: 'mer001', location: 'k8298', entered: true },
      { id: 'RCK404', merchant: 'mer002', location: 'k8298', entered: true },
      { id: 'RCB036', merchant: 'mer003', location: 'k8667', entered: true },
      { id: 'RCK403', merchant: 'mer004', location: 'k8298', entered: true },
      { id: 'RCK402', merchant: 'mer001', location: 'k8298', entered: true },
      { id: 'RCK401', merchant: 'mer002', location: 'k8298', entered: true },
      { id: 'RCK400', merchant: 'mer003', location: 'k8667', entered: true },
      { id: 'RCK499', merchant: 'mer001', location: '', entered: false },
      { id: 'RCK498', merchant: 'mer001', location: '', entered: false },
      { id: 'RCK497', merchant: 'mer001', location: '', entered: false }
    ],
    helpers: {
      resolveDevices(storedDevices, fallbackDevices) {
        return Array.isArray(storedDevices) && storedDevices.length ? storedDevices : fallbackDevices;
      }
    }
  };

  sandbox.devicesData = sandbox.resolveEntryRuntimeDevices([]);
  sandbox.rebuildDeviceSearchData();

  assert.strictEqual(sandbox.devicesData.length, 18);
  assert.deepStrictEqual(
    Array.from(sandbox.unenteredDeviceOptions.map(item => item.value)),
    ['RCK499', 'RCK498', 'RCK497']
  );
});

test('运行时：缺少登录态时应自动补默认商户 mock', () => {
  const sandbox = buildSandbox();

  sandbox.ensureEntryMockMerchantContext();

  const session = JSON.parse(sandbox.__localStorage.dump('cofeLoginSession'));
  const profile = JSON.parse(sandbox.__localStorage.dump('sidebarLoginProfile'));
  const merchantContext = sandbox.resolveEntryCurrentMerchantContext();
  assert.strictEqual(session.merchantId, 'C001');
  assert.strictEqual(session.merchantName, '星巴克咖啡');
  assert.strictEqual(profile.merchantId, 'C001');
  assert.strictEqual(profile.merchantName, '星巴克咖啡');
  assert.strictEqual(merchantContext.merchantId, 'C001');
  assert.strictEqual(merchantContext.deviceMerchantKey, 'mer001');
});

test('运行时：已有登录态时不应覆盖现有商户', () => {
  const sandbox = buildSandbox({
    cofeLoginSession: JSON.stringify({ merchantId: 'C002', merchantName: '瑞幸咖啡' }),
    sidebarLoginProfile: JSON.stringify({ merchantId: 'C002', merchantName: '瑞幸咖啡', name: '王运维', phone: '13800138021' })
  });

  sandbox.ensureEntryMockMerchantContext();

  const session = JSON.parse(sandbox.__localStorage.dump('cofeLoginSession'));
  const profile = JSON.parse(sandbox.__localStorage.dump('sidebarLoginProfile'));
  const merchantContext = sandbox.resolveEntryCurrentMerchantContext();
  assert.strictEqual(session.merchantId, 'C002');
  assert.strictEqual(profile.merchantName, '瑞幸咖啡');
  assert.strictEqual(merchantContext.merchantId, 'C002');
  assert.strictEqual(merchantContext.deviceMerchantKey, 'mer002');
});

test('运行时：点位下拉应只展示当前商户的点位', () => {
  const sandbox = buildSandbox({
    cofeLoginSession: JSON.stringify({ merchantId: 'C001', merchantName: '星巴克咖啡' })
  });
  sandbox.locationsData = [
    { id: 'L001', code: 'k1001', name: '静安商圈点位', customerId: 'C001', customerName: '星巴克咖啡', address: '上海静安' },
    { id: 'L002', code: 'k2001', name: '朝阳门点位', customerId: 'C002', customerName: '瑞幸咖啡', address: '北京朝阳' }
  ];

  sandbox.renderLocationOptions();

  const select = sandbox.__elements.locationSelect;
  assert.ok(select.innerHTML.includes('静安商圈点位（k1001）'));
  assert.ok(!select.innerHTML.includes('朝阳门点位（k2001）'));
});

test('运行时：快速新增点位应默认写入当前商户', () => {
  const sandbox = buildSandbox({
    cofeLoginSession: JSON.stringify({ merchantId: 'C001', merchantName: '星巴克咖啡' })
  });
  const { __elements: elements } = sandbox;
  sandbox.locationsData = [];
  sandbox.customersData = [];
  elements.quickLocationName = { value: '静安新点位' };
  elements.quickLocationCode = { value: 'k1002' };
  elements.quickLocationCategory = { value: 'operation' };
  elements.quickLocationStatus = { value: 'operational' };
  elements.quickLocationManager = { value: '张店长' };
  elements.quickLocationPhone = { value: '13800138001' };
  elements.quickLocationAddress = { value: '上海市静安区广场 2 层' };
  elements.quickLocationLongitude = { value: '121.473700' };
  elements.quickLocationLatitude = { value: '31.230400' };
  elements.quickLocationRemark = { value: '靠近扶梯' };

  const payload = sandbox.buildLocationPayloadForEntry();

  assert.strictEqual(payload.customerId, 'C001');
  assert.strictEqual(payload.customerName, '星巴克咖啡');
  assert.strictEqual(payload.longitude, '121.473700');
  assert.strictEqual(payload.latitude, '31.230400');
  assert.strictEqual(payload.gpsAction, '新增点位时录入');
});

test('运行时：缺少当前商户时不应允许快速新增点位', () => {
  const sandbox = buildSandbox();
  const { __elements: elements } = sandbox;
  sandbox.locationsData = [];
  elements.quickLocationName = { value: '静安新点位' };
  elements.quickLocationCode = { value: 'k1002' };
  elements.quickLocationCategory = { value: 'operation' };
  elements.quickLocationStatus = { value: 'operational' };
  elements.quickLocationManager = { value: '张店长' };
  elements.quickLocationPhone = { value: '13800138001' };
  elements.quickLocationAddress = { value: '上海市静安区广场 2 层' };
  elements.quickLocationLongitude = { value: '121.473700' };
  elements.quickLocationLatitude = { value: '31.230400' };
  elements.quickLocationRemark = { value: '靠近扶梯' };
  sandbox.renderLocationOptions = () => {};
  sandbox.onLocationChange = () => {};
  sandbox.closeQuickCreateLocationModal = () => {};

  sandbox.createLocationFromEntry();

  assert.strictEqual(sandbox.locationsData.length, 0);
  assert.strictEqual(sandbox.__alerts[0], '未识别当前商户，无法新增点位');
});

test('运行时：提交入场时设备商户应默认修正为当前商户', () => {
  const sandbox = buildSandbox({
    cofeLoginSession: JSON.stringify({ merchantId: 'C001', merchantName: '星巴克咖啡' })
  });
  seedSubmitForm(sandbox);
  sandbox.devicesData = [{
    id: 'RCK001',
    merchant: '',
    entered: false,
    sales: 'disabled',
    heartbeat: '-'
  }];

  sandbox.submitEntry();

  assert.strictEqual(sandbox.devicesData[0].merchant, 'mer001');
});

test('运行时：缺少当前商户时不应允许提交入场', () => {
  const sandbox = buildSandbox();
  seedSubmitForm(sandbox);
  sandbox.devicesData = [{
    id: 'RCK001',
    merchant: '',
    entered: false,
    sales: 'disabled',
    heartbeat: '-'
  }];

  sandbox.submitEntry();

  assert.strictEqual(sandbox.devicesData[0].entered, false);
  assert.strictEqual(sandbox.__alerts[0], '未识别当前商户，无法提交设备入场');
});
