const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const devicesPath = path.join(__dirname, '..', 'devices.html');
const devicesHtml = fs.readFileSync(devicesPath, 'utf8');

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      result
        .then(() => {
          console.log(`PASS ${name}`);
        })
        .catch((error) => {
          console.error(`FAIL ${name}`);
          console.error(error.stack || error.message);
          process.exitCode = 1;
        });
      return;
    }
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

function extractFunctionSource(html, functionName) {
  const signature = `function ${functionName}(`;
  const directStart = html.indexOf(signature);
  const asyncSignature = `async ${signature}`;
  const asyncStart = html.indexOf(asyncSignature);
  const start = asyncStart === -1 ? directStart : asyncStart;
  if (start === -1) {
    throw new Error(`未找到函数 ${functionName}`);
  }
  let paramsDepth = 0;
  let braceStart = -1;
  for (let i = start; i < html.length; i += 1) {
    const char = html[i];
    if (char === '(') paramsDepth += 1;
    if (char === ')') {
      paramsDepth -= 1;
      continue;
    }
    if (char === '{' && paramsDepth === 0) {
      braceStart = i;
      break;
    }
  }
  if (braceStart === -1) {
    throw new Error(`函数 ${functionName} 缺少函数体`);
  }
  let depth = 0;
  for (let i = braceStart; i < html.length; i += 1) {
    const char = html[i];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) {
      return html.slice(start, i + 1);
    }
  }
  throw new Error(`函数 ${functionName} 解析失败`);
}

function buildSandbox() {
  const elements = {};
  function getElement(id) {
    if (!elements[id]) {
      elements[id] = {
        id,
        value: '',
        checked: false,
        innerHTML: '',
        textContent: '',
        classList: {
          add() {},
          remove() {}
        }
      };
    }
    return elements[id];
  }

  const sandbox = {
    console,
    Date,
    Math,
    URLSearchParams,
    currentDetailDeviceId: '',
    devicesData: [],
    entryEditImageDraft: {
      adScreen: {
        leftMenu: null,
        rightQueueBackground: null
      },
      location: []
    },
    document: {
      getElementById: getElement
    },
    navigator: {
      geolocation: {
        getCurrentPosition(resolve) {
          resolve({
            coords: {
              longitude: 121.499999,
              latitude: 31.288888
            }
          });
        }
      }
    },
    fetch: async () => ({
      ok: true,
      async json() {
        return {
          countryName: '中国',
          principalSubdivision: '上海市',
          city: '上海市',
          locality: '静安区',
          streetName: '南京西路',
          street: '南京西路 1 号'
        };
      }
    }),
    LOCATION_POINT_CATEGORY_OPTIONS: ['exhibition', 'operation'],
    SIDEBAR_LOGIN_PROFILE_KEY: 'sidebarLoginProfile',
    LOGIN_SESSION_KEY: 'cofeLoginSession',
    merchantMap: {
      mer001: '星巴克咖啡'
    },
    localStorage: {
      getItem(key) {
        if (key === 'sidebarLoginProfile') {
          return JSON.stringify({ name: '当前登录人', phone: '13800000001' });
        }
        if (key === 'cofeLoginSession') {
          return JSON.stringify({ account: '13800000001' });
        }
        if (key === 'locationsData') {
          return JSON.stringify([
            {
              id: 'L001',
              code: 'L1',
              name: '旧点位',
              address: '上海市静安区旧地址 1 号',
              longitude: '121.4700',
              latitude: '31.2300',
              customerId: 'C001',
              customerName: '星巴克咖啡'
            }
          ]);
        }
        return null;
      },
      setItem() {}
    },
    buildLocationMap() {
      return { L1: '旧点位' };
    },
    ensureEntryInfoForEditing(device) {
      if (!device.entryInfo) {
        device.entryInfo = {};
      }
    },
    ensureLocationPreviewImageUrls() {
      return false;
    },
    closeEntryEditModal() {},
    viewDetail() {},
    showToast() {},
    saveDevicesData() {},
    alert() {},
    formatCurrentDateTime() {
      return '2026-04-28 14:22:00';
    }
  };

  vm.createContext(sandbox);
  [
    'normalizeEditableValue',
    'normalizePointCategory',
    'escapeHtml',
    'normalizeRecordTime',
    'normalizeEntryAdScreenAsset',
    'serializeEntryAdScreenDraft',
    'toDateTimeStorageValue',
    'getLocationsData',
    'buildLocationCustomerIdFromMerchantKey',
    'getEntryEditLocationOptions',
    'renderEntryEditLocationOptions',
    'getEntryEditSelectedLocationMeta',
    'onEntryEditLocationChange',
    'generateNextEntryEditLocationCode',
    'buildNextEntryEditLocationId',
    'resetEntryEditQuickCreateLocationForm',
    'openEntryEditQuickCreateLocationModal',
    'closeEntryEditQuickCreateLocationModal',
    'regenerateEntryEditQuickLocationCode',
    'buildEntryEditQuickLocationPayload',
    'validateEntryEditQuickLocation',
    'createLocationFromDeviceDetail',
    'getLocationErrorMessage',
    'resolveAddressByCoordinates',
    'requestEntryEditQuickLocationCurrentPosition',
    'normalizeLocationChangeRecord',
    'getCurrentLoginOperatorInfo',
    'buildLocationChangeRecord',
    'appendLocationChangeRecord',
    'getLocationChangeRecords',
    'renderLocationChangeRecordCard',
    'renderLocationChangeRecords',
    'saveEntryInfoEdit'
  ].forEach((functionName) => {
    vm.runInContext(extractFunctionSource(devicesHtml, functionName), sandbox);
  });

  return sandbox;
}

function seedEditForm(sandbox, overrides = {}) {
  const get = sandbox.document.getElementById;
  get('editOperatorName').value = overrides.operatorName || '张运维';
  get('editOperatorPhone').value = overrides.operatorPhone || '13912340000';
  get('editLocationCode').options = [
    { value: '', dataset: {}, textContent: '请选择点位' },
    {
      value: overrides.locationCode || 'L2',
      dataset: {
        name: overrides.locationName || '新点位',
        address: overrides.locationAddress || '上海市静安区新地址 88 号'
      },
      textContent: `${overrides.locationName || '新点位'}（${overrides.locationCode || 'L2'}）`
    }
  ];
  get('editLocationCode').selectedIndex = 1;
  get('editLocationCode').value = overrides.locationCode || 'L2';
  sandbox.localStorage = {
    getItem(key) {
      if (key === 'sidebarLoginProfile') {
        return JSON.stringify({ name: '当前登录人', phone: '13800000001' });
      }
      if (key === 'cofeLoginSession') {
        return JSON.stringify({ account: '13800000001' });
      }
      if (key === 'locationsData') {
        return JSON.stringify([
          {
            id: 'L001',
            code: 'L1',
            name: '旧点位',
            address: '上海市静安区旧地址 1 号',
            longitude: '121.4700',
            latitude: '31.2300',
            customerId: 'C001',
            customerName: '星巴克咖啡'
          },
          {
            id: 'L002',
            code: overrides.locationCode || 'L2',
            name: overrides.locationName || '新点位',
            address: overrides.locationAddress || '上海市静安区新地址 88 号',
            longitude: overrides.longitude || '121.4800',
            latitude: overrides.latitude || '31.2400',
            customerId: 'C001',
            customerName: '星巴克咖啡'
          }
        ]);
      }
      return null;
    },
    setItem() {}
  };
  get('editLocationAddress').value = overrides.locationAddress || '上海市静安区新地址 88 号';
  get('editEntryAt').value = overrides.entryAt || '2026-04-28T14:20';
  get('editGpsAction').value = overrides.gpsAction || '获取当前位置';
  get('editLongitude').value = overrides.longitude || '121.4700';
  get('editLatitude').value = overrides.latitude || '31.2300';
  get('editEnergyMode').value = overrides.energyMode || '开启';
  get('editNetworkSignal').value = overrides.networkSignal || '优';
  get('editEnergyStartTime').value = overrides.energyStartTime || '18:00';
  get('editEnergyEndTime').value = overrides.energyEndTime || '08:00';
  get('editDeviceStartDate').value = overrides.deviceStartDate || '2026-04-28';
  get('editDeviceEndDate').value = overrides.deviceEndDate || '2027-04-28';
  get('editTerminalGeneration5').value = overrides.terminalGeneration5 || '开启';
  get('editParallelProduction').value = overrides.parallelProduction || '开启';
  get('editMaintenanceWindow').value = overrides.maintenanceWindow || '07:00-09:00';
  get('editNotes').value = overrides.notes || '测试备注';
  get('editPayQr').checked = overrides.payQr !== false;
  get('editPayDigitalRmb').checked = !!overrides.payDigitalRmb;
}

test('运行时：saveEntryInfoEdit 仅在点位信息变更时追加点位变更记录', () => {
  const sandbox = buildSandbox();
  sandbox.currentDetailDeviceId = 'RCK386';
  sandbox.devicesData = [{
    id: 'RCK386',
    merchant: 'mer001',
    location: 'L1',
    entryInfo: {
      operatorName: '旧运维',
      locationName: '旧点位',
      locationAddress: '上海市静安区旧地址 1 号',
      longitude: '121.4700',
      latitude: '31.2300',
      locationChangeRecords: [{
        time: '2026-04-20 12:00:00',
        operatorName: '历史运维',
        previousLocationName: '更早点位',
        nextLocationName: '旧点位',
        previousLocationAddress: '更早地址',
        nextLocationAddress: '上海市静安区旧地址 1 号',
        previousLongitude: '121.4600',
        nextLongitude: '121.4700',
        previousLatitude: '31.2200',
        nextLatitude: '31.2300'
      }]
    }
  }];
  seedEditForm(sandbox);

  sandbox.saveEntryInfoEdit();

  const saved = sandbox.devicesData[0].entryInfo;
  assert.strictEqual(saved.locationChangeRecords.length, 2, '点位变更后应追加 1 条记录');
  const latest = saved.locationChangeRecords[1];
  assert.strictEqual(latest.time, '2026-04-28 14:22:00');
  assert.strictEqual(latest.operatorName, '当前登录人');
  assert.strictEqual(latest.operatorPhone, '13800000001');
  assert.strictEqual(latest.previousLocationName, '旧点位');
  assert.strictEqual(latest.nextLocationName, '新点位');
  assert.strictEqual(latest.previousLocationAddress, '上海市静安区旧地址 1 号');
  assert.strictEqual(latest.nextLocationAddress, '上海市静安区新地址 88 号');
  assert.strictEqual(latest.previousLongitude, '121.4700');
  assert.strictEqual(latest.nextLongitude, '121.4800');
  assert.strictEqual(latest.previousLatitude, '31.2300');
  assert.strictEqual(latest.nextLatitude, '31.2400');
  assert.strictEqual(saved.gpsAction, '来自点位信息');
  assert.strictEqual(saved.longitude, '121.4800');
  assert.strictEqual(saved.latitude, '31.2400');
});

test('运行时：saveEntryInfoEdit 若点位名称和地址未变化则不新增点位变更记录', () => {
  const sandbox = buildSandbox();
  sandbox.currentDetailDeviceId = 'RCK386';
  sandbox.devicesData = [{
    id: 'RCK386',
    merchant: 'mer001',
    location: 'L1',
    entryInfo: {
      operatorName: '旧运维',
      locationName: '旧点位',
      locationAddress: '上海市静安区旧地址 1 号',
      longitude: '121.4700',
      latitude: '31.2300',
      locationChangeRecords: [{
        time: '2026-04-20 12:00:00',
        operatorName: '历史运维',
        previousLocationName: '更早点位',
        nextLocationName: '旧点位',
        previousLocationAddress: '更早地址',
        nextLocationAddress: '上海市静安区旧地址 1 号',
        previousLongitude: '121.4600',
        nextLongitude: '121.4700',
        previousLatitude: '31.2200',
        nextLatitude: '31.2300'
      }]
    }
  }];
  seedEditForm(sandbox, {
    locationCode: 'L1',
    locationName: '旧点位',
    locationAddress: '上海市静安区旧地址 1 号',
    longitude: '121.4700',
    latitude: '31.2300'
  });

  sandbox.saveEntryInfoEdit();

  const saved = sandbox.devicesData[0].entryInfo;
  assert.strictEqual(saved.locationChangeRecords.length, 1, '点位未变化时不应新增记录');
});

test('运行时：renderLocationChangeRecords 应按时间倒序渲染点位变更前后值', () => {
  const sandbox = buildSandbox();
  const html = sandbox.renderLocationChangeRecords({
    info: {
      locationChangeRecords: [
        {
          time: '2026-04-21 09:00:00',
          operatorName: '王运维',
          previousLocationName: 'A 点位',
          nextLocationName: 'B 点位',
          previousLocationAddress: 'A 地址',
          nextLocationAddress: 'B 地址',
          previousLongitude: '120.1',
          nextLongitude: '120.2',
          previousLatitude: '30.1',
          nextLatitude: '30.2'
        },
        {
          time: '2026-04-28 14:22:00',
          operatorName: '张运维',
          previousLocationName: 'B 点位',
          nextLocationName: 'C 点位',
          previousLocationAddress: 'B 地址',
          nextLocationAddress: 'C 地址',
          previousLongitude: '120.2',
          nextLongitude: '120.3',
          previousLatitude: '30.2',
          nextLatitude: '30.3'
        }
      ]
    }
  });

  assert.ok(!html.includes('点位变更记录'), '渲染函数本身只应输出内容列表');
  assert.ok(html.includes('操作人：张运维'));
  assert.ok(html.includes('变更前：B 点位'));
  assert.ok(html.includes('变更后：<strong>C 点位</strong>'));
  assert.ok(html.includes('120.2, 30.2'));
  assert.ok(html.includes('120.3, 30.3'));
  assert.ok(html.indexOf('2026-04-28 14:22:00') < html.indexOf('2026-04-21 09:00:00'), '最新记录应排在最前面');
});

test('运行时：createLocationFromDeviceDetail 应创建点位并自动选中', () => {
  const sandbox = buildSandbox();
  const savedPayloads = [];
  const storageState = {
    locationsData: JSON.stringify([
      {
        id: 'L001',
        code: 'L1',
        name: '旧点位',
        address: '上海市静安区旧地址 1 号',
        longitude: '121.4700',
        latitude: '31.2300',
        customerId: 'C001',
        customerName: '星巴克咖啡'
      }
    ])
  };
  sandbox.localStorage = {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(storageState, key) ? storageState[key] : null;
    },
    setItem(key, value) {
      storageState[key] = String(value);
      if (key === 'locationsData') {
        savedPayloads.push(JSON.parse(value));
      }
    }
  };
  sandbox.currentDetailDeviceId = 'RCK386';
  sandbox.devicesData = [{ id: 'RCK386', merchant: 'mer001', location: 'L1', entryInfo: {} }];
  sandbox.document.getElementById('entryEditQuickLocationName').value = '新建点位';
  sandbox.document.getElementById('entryEditQuickLocationCode').value = 'L2';
  sandbox.document.getElementById('entryEditQuickLocationCategory').value = 'operation';
  sandbox.document.getElementById('entryEditQuickLocationStatus').value = 'operational';
  sandbox.document.getElementById('entryEditQuickLocationAddress').value = '上海市静安区新地址 88 号';
  sandbox.document.getElementById('entryEditQuickLocationLongitude').value = '121.4800';
  sandbox.document.getElementById('entryEditQuickLocationLatitude').value = '31.2400';
  sandbox.document.getElementById('entryEditQuickLocationManager').value = '';
  sandbox.document.getElementById('entryEditQuickLocationPhone').value = '';
  sandbox.document.getElementById('entryEditQuickLocationRemark').value = '';

  sandbox.createLocationFromDeviceDetail();

  assert.strictEqual(savedPayloads.length, 1, '应写回 locationsData');
  assert.strictEqual(savedPayloads[0][1].name, '新建点位');
  assert.strictEqual(savedPayloads[0][1].longitude, '121.4800');
  assert.strictEqual(savedPayloads[0][1].latitude, '31.2400');
  assert.strictEqual(sandbox.document.getElementById('editLocationCode').value, 'L2');
});

test('运行时：requestEntryEditQuickLocationCurrentPosition 应填充新增点位经纬度和地址', async () => {
  const sandbox = buildSandbox();
  sandbox.document.getElementById('entryEditQuickLocationAddress').value = '';
  sandbox.document.getElementById('entryEditQuickLocationLocateBtn').dataset = {};

  await sandbox.requestEntryEditQuickLocationCurrentPosition();

  assert.strictEqual(sandbox.document.getElementById('entryEditQuickLocationLongitude').value, '121.499999');
  assert.strictEqual(sandbox.document.getElementById('entryEditQuickLocationLatitude').value, '31.288888');
  assert.ok(sandbox.document.getElementById('entryEditQuickLocationAddress').value.includes('南京西路'));
  assert.strictEqual(sandbox.document.getElementById('entryEditQuickLocationLocateBtn').textContent, '获取当前位置');
});

test('运行时：重新生成点位编码应跳过当前输入值', () => {
  const sandbox = buildSandbox();
  sandbox.localStorage = {
    getItem(key) {
      if (key === 'locationsData') {
        return JSON.stringify([{ code: 'k9100' }]);
      }
      return null;
    },
    setItem() {}
  };
  sandbox.document.getElementById('entryEditQuickLocationCode').value = 'k9101';

  sandbox.regenerateEntryEditQuickLocationCode();

  assert.strictEqual(sandbox.document.getElementById('entryEditQuickLocationCode').value, 'k9102');
});
