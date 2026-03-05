const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const devicesPath = path.join(__dirname, '..', 'devices.html');
const devicesHtml = fs.readFileSync(devicesPath, 'utf8');

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.message);
    process.exitCode = 1;
  }
}

function extractFunctionSource(html, functionName) {
  const signature = `function ${functionName}(`;
  const start = html.indexOf(signature);
  if (start === -1) {
    throw new Error(`未找到函数 ${functionName}`);
  }
  const braceStart = html.indexOf('{', start);
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
  const store = {};
  const sandbox = {
    console,
    Date,
    devicesData: [],
    activeFaultActionDeviceId: '',
    currentDetailDeviceId: '',
    localStorage: {
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
      },
      setItem(key, value) {
        store[key] = String(value);
      },
      removeItem(key) {
        delete store[key];
      }
    }
  };
  vm.createContext(sandbox);
  [
    'normalizeEditableValue',
    'normalizeDeviceId',
    'resolveMaintenanceRecordDeviceId',
    'normalizeRecordTime',
    'escapeHtml',
    'resolveMaintenanceOperatorInfo',
    'normalizeDetailMaintenanceRecord',
    'renderDetailMaintenanceRecordCard',
    'ensureMaintenanceContactRowsInCardHtml',
    'renderDetailStatusRecordItems',
    'getMaintenanceRecordsByDevice'
  ].forEach(functionName => {
    vm.runInContext(extractFunctionSource(devicesHtml, functionName), sandbox);
  });
  return sandbox;
}

test('运行时：多条运维记录渲染时每条都应包含运维人员与电话行', () => {
  const sandbox = buildSandbox();
  sandbox.devicesData = [{
    id: 'RCK386',
    entryInfo: {
      operatorName: '张瑞瑞',
      operatorPhone: '18721251172',
      locationName: '上海市中心店'
    }
  }];
  sandbox.currentDetailDeviceId = 'RCK386';
  sandbox.activeFaultActionDeviceId = 'RCK386';

  const records = [
    {
      time: '2026-03-05 14:44:11',
      type: '补料',
      content: '杯盖加49个',
      deviceId: 'RCK386',
      deviceLocation: '上海市中心店',
      operatorName: '张瑞瑞',
      operatorPhone: '18721251172'
    },
    {
      maintenanceInfo: {
        recordTime: '2026-03-05 14:43:53',
        recordType: '补料',
        contentText: '杯盖加23个',
        deviceCode: 'RCK386',
        deviceAddress: '上海市中心店'
      }
    }
  ];

  const html = sandbox.renderDetailStatusRecordItems(records, 'operation');
  const cards = html.match(/<article class="detail-maint-record-card">[\s\S]*?<\/article>/g) || [];
  assert.strictEqual(cards.length, 2, '应渲染两张运维记录卡片');
  cards.forEach((card, index) => {
    assert.ok(card.includes('运维人员'), `第 ${index + 1} 张卡片缺少运维人员行`);
    assert.ok(card.includes('运维人员电话'), `第 ${index + 1} 张卡片缺少运维人员电话行`);
  });
  assert.ok(cards[1].includes('张瑞瑞'), '第二条记录应回填运维人员');
  assert.ok(cards[1].includes('18721251172'), '第二条记录应回填运维人员电话');
});

test('运行时：多格式设备编号混合时应全部命中当前设备记录', () => {
  const sandbox = buildSandbox();
  const mixedRecords = [
    {
      time: '2026-03-05 12:00:00',
      deviceId: 'RCK386',
      operatorName: 'A',
      operatorPhone: '111'
    },
    {
      time: '2026-03-05 12:01:00',
      deviceCode: 'RCK386',
      operatorName: 'B',
      operatorPhone: '222'
    },
    {
      time: '2026-03-05 12:02:00',
      maintenanceInfo: {
        '设备编号': 'RCK386',
        maintainerName: 'C',
        maintainerPhone: '333'
      }
    },
    {
      time: '2026-03-05 12:03:00',
      deviceId: 'RCK999',
      operatorName: 'X',
      operatorPhone: '999'
    }
  ];
  sandbox.localStorage.setItem('deviceMaintenanceRecords', JSON.stringify(mixedRecords));

  const records = sandbox.getMaintenanceRecordsByDevice('RCK386');
  assert.strictEqual(records.length, 3, '应命中 3 条 RCK386 运维记录');
});
