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

function buildSandbox() {
  const elements = {};
  const localStorage = createLocalStorage({
    cofeLoginSession: JSON.stringify({ merchantId: 'C001', merchantName: '星巴克咖啡' })
  });
  const alerts = [];
  const windowObject = { location: { href: 'device-entry.html' } };

  function getElement(id) {
    if (!elements[id]) {
      elements[id] = {
        id,
        value: '',
        textContent: '',
        checked: false,
        options: [],
        selectedIndex: 0,
        dataset: {},
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
    devicesData: [],
    selectedDevice: null,
    entryAdScreenDraft: {
      leftMenu: {
        kind: 'image',
        url: 'left-entry.png',
        fileName: 'left-entry.png',
        mimeType: 'image/png',
        width: 1320,
        height: 1080,
        durationSec: 0,
        codec: '',
        updatedAt: '2026-04-03 10:00:00'
      },
      rightQueueBackground: {
        kind: 'image',
        url: 'right-entry.png',
        fileName: 'right-entry.png',
        mimeType: 'image/png',
        width: 800,
        height: 1080,
        durationSec: 0,
        codec: '',
        updatedAt: '2026-04-03 10:00:00'
      }
    },
    entryLocationImageDrafts: ['location-1.png', 'location-2.png'],
    alert(message) {
      alerts.push(message);
    },
    window: windowObject,
    localStorage,
    document: {
      getElementById: getElement
    }
  };

  vm.createContext(sandbox);
  [
    'normalizeEditableValue',
    'resolveEntryCurrentMerchantContext',
    'getCurrentEntryMerchantDeviceKey',
    'getSelectedOperatorMeta',
    'normalizeEntryAdScreenAsset',
    'serializeEntryAdScreenDraft',
    'getTextValue',
    'getInputValue',
    'getSwitchGroupValue',
    'isEnergyModeEnabled',
    'formatEntryTime',
    'getSelectedLocationName',
    'getPaymentMethods',
    'onDeviceChange',
    'buildEntryInfoPayload',
    'submitEntry'
  ].forEach((functionName) => {
    vm.runInContext(extractFunctionSource(html, functionName), sandbox);
  });

  sandbox.__elements = elements;
  sandbox.__alerts = alerts;
  sandbox.__window = windowObject;
  sandbox.__localStorage = localStorage;
  return sandbox;
}

function seedBaseForm(sandbox, overrides = {}) {
  const { __elements: elements } = sandbox;
  elements.operatorSelect = {
    id: 'operatorSelect',
    value: overrides.operatorId || 'S001',
    options: [{
      value: overrides.operatorId || 'S001',
      textContent: overrides.operatorOptionLabel || '李运维（13912340000）',
      dataset: {
        name: overrides.operatorName || '李运维',
        phone: overrides.operatorPhone || '13912340000'
      }
    }],
    selectedIndex: 0
  };
  elements.gpsActionDisplay = {
    id: 'gpsActionDisplay',
    textContent: overrides.gpsActionDisplay || '获取当前位置 ›'
  };
  elements.longitudeDisplay = {
    id: 'longitudeDisplay',
    textContent: overrides.longitudeDisplay || '121.473700'
  };
  elements.latitudeDisplay = {
    id: 'latitudeDisplay',
    textContent: overrides.latitudeDisplay || '31.230400'
  };
  elements.locationAddressInput = {
    id: 'locationAddressInput',
    value: overrides.locationAddressInput || '上海市静安区测试地址 1 号'
  };
  elements.locationSelect = {
    id: 'locationSelect',
    value: overrides.locationCode || 'L001',
    selectedIndex: 0,
    options: [{
      textContent: overrides.locationOptionLabel || '静安大悦城（L001）'
    }]
  };
  elements.deviceSelect = {
    id: 'deviceSelect',
    value: overrides.deviceId || 'RCK001',
    innerHTML: '',
    options: [{
      value: overrides.deviceId || 'RCK001',
      textContent: overrides.deviceOptionLabel || 'RCK001'
    }],
    selectedIndex: 0
  };
  elements.energyModeGroup = createGroup(overrides.energyMode || '开启');
  elements.terminalGenerationGroup = createGroup(overrides.terminalGeneration5 || '开启');
  elements.parallelProductionGroup = createGroup(overrides.parallelProduction || '开启');
  elements.energyStartInput = {
    id: 'energyStartInput',
    value: overrides.energyStartInput || '18:00'
  };
  elements.energyEndInput = {
    id: 'energyEndInput',
    value: overrides.energyEndInput || '08:00'
  };
  elements.deviceStartDateInput = {
    id: 'deviceStartDateInput',
    value: overrides.deviceStartDateInput || '2026-04-03'
  };
  elements.deviceEndDateInput = {
    id: 'deviceEndDateInput',
    value: overrides.deviceEndDateInput || '2027-04-03'
  };
  elements.networkSignalInput = {
    id: 'networkSignalInput',
    value: overrides.networkSignalInput || '优'
  };
  elements.maintenanceWindowInput = {
    id: 'maintenanceWindowInput',
    value: overrides.maintenanceWindowInput || '07:00-09:00'
  };
  elements.notesInput = {
    id: 'notesInput',
    value: overrides.notesInput || '进店后联系店长'
  };
  elements.payQrCheckbox = {
    id: 'payQrCheckbox',
    checked: overrides.payQrCheckbox !== false
  };
  elements.payDigitalRmbCheckbox = {
    id: 'payDigitalRmbCheckbox',
    checked: !!overrides.payDigitalRmbCheckbox
  };
}

test('运行时：buildEntryInfoPayload 应返回与详情页一致的 canonical 字段', () => {
  const sandbox = buildSandbox();
  seedBaseForm(sandbox);

  const payload = sandbox.buildEntryInfoPayload();

  assert.strictEqual(payload.locationName, '静安大悦城');
  assert.strictEqual(payload.locationAddress, '上海市静安区测试地址 1 号');
  assert.strictEqual(payload.operatorName, '李运维');
  assert.strictEqual(payload.operatorPhone, '13912340000');
  assert.strictEqual(payload.networkSignal, '优');
  assert.strictEqual(payload.maintenanceWindow, '07:00-09:00');
  assert.strictEqual(payload.notes, '进店后联系店长');
  assert.deepStrictEqual(Array.from(payload.locationImageUrls), ['location-1.png', 'location-2.png']);
  assert.strictEqual(payload.locationImages, '2张图片');
  assert.ok(payload.adScreen);
  assert.strictEqual(payload.adScreen.leftMenu.url, 'left-entry.png');
  assert.strictEqual(payload.adScreen.rightQueueBackground.url, 'right-entry.png');
  assert.ok(!Object.prototype.hasOwnProperty.call(payload, 'displayImages'));
});

test('运行时：节能模式关闭时 buildEntryInfoPayload 应把节能时间归一成 -', () => {
  const sandbox = buildSandbox();
  seedBaseForm(sandbox, {
    energyMode: '关闭',
    energyStartInput: '19:00',
    energyEndInput: '07:00'
  });

  const payload = sandbox.buildEntryInfoPayload();

  assert.strictEqual(payload.energyMode, '关闭');
  assert.strictEqual(payload.energyStartTime, '-');
  assert.strictEqual(payload.energyEndTime, '-');
});

test('运行时：submitEntry 应把 canonical entryInfo 持久化到 devicesData', () => {
  const sandbox = buildSandbox();
  seedBaseForm(sandbox);
  sandbox.devicesData = [{
    id: 'RCK001',
    entered: false,
    sales: 'disabled',
    heartbeat: '-'
  }];

  sandbox.submitEntry();

  const device = sandbox.devicesData[0];
  assert.strictEqual(device.entered, true);
  assert.strictEqual(device.location, 'L001');
  assert.strictEqual(device.sales, 'enabled');
  assert.strictEqual(device.heartbeat, '刚刚');
  assert.strictEqual(device.entryInfo.operatorPhone, '13912340000');
  assert.strictEqual(device.entryInfo.networkSignal, '优');
  assert.strictEqual(device.entryInfo.notes, '进店后联系店长');
  assert.deepStrictEqual(Array.from(device.entryInfo.locationImageUrls), ['location-1.png', 'location-2.png']);
  assert.ok(device.entryInfo.adScreen);
  assert.ok(!Object.prototype.hasOwnProperty.call(device.entryInfo, 'displayImages'));
  assert.ok(sandbox.__localStorage.dump('devicesData'));
  assert.strictEqual(sandbox.__window.location.href, 'devices.html');
  assert.strictEqual(sandbox.__alerts.length, 1);
});
