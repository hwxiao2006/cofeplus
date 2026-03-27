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
  const elements = {};
  function getElement(id) {
    if (!elements[id]) {
      const classes = new Set();
      elements[id] = {
        id,
        innerHTML: '',
        textContent: '',
        value: '',
        classList: {
          add(name) { classes.add(name); },
          remove(name) { classes.delete(name); },
          contains(name) { return classes.has(name); }
        }
      };
    }
    return elements[id];
  }

  const sandbox = {
    console,
    Math,
    Date,
    devicesData: [],
    currentDetailDeviceId: '',
    currentTemperatureAlarmDeviceId: '',
    currentTemperatureAlarmZoneKey: '',
    localStorage: {
      _data: {},
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(this._data, key) ? this._data[key] : null;
      },
      setItem(key, value) {
        this._data[key] = String(value);
      }
    },
    document: {
      getElementById: getElement
    },
    showToast: () => {}
  };
  vm.createContext(sandbox);
  [
    'escapeHtml',
    'getDeviceFaultSeed',
    'getDetailTemperatureAlarmContext',
    'buildDetailTemperatureAlarmZones',
    'renderDetailTemperatureAlarmModalBody',
    'parseDetailTemperatureThresholdInput',
    'formatDetailTemperatureThresholdValue',
    'openDetailTemperatureAlarmModal',
    'closeDetailTemperatureAlarmModal'
  ].forEach(functionName => {
    vm.runInContext(extractFunctionSource(devicesHtml, functionName), sandbox);
  });
  [
    'saveDevicesData',
    'editDetailTemperatureAlarmZone',
    'closeDetailTemperatureAlarmZoneEditModal',
    'saveDetailTemperatureAlarmZoneEdit'
  ].forEach(functionName => {
    vm.runInContext(extractFunctionSource(devicesHtml, functionName), sandbox);
  });
  return sandbox;
}

test('运行时：温度报警设置弹层应打开当前设备上下文', () => {
  const sandbox = buildSandbox();
  sandbox.devicesData = [{
    id: 'RCK088',
    location: '上海静安大悦城',
    entryInfo: {
      locationName: '上海静安大悦城'
    }
  }];
  sandbox.currentDetailDeviceId = 'RCK088';

  sandbox.openDetailTemperatureAlarmModal('RCK088');

  const modal = sandbox.document.getElementById('detailTemperatureAlarmModal');
  const body = sandbox.document.getElementById('detailTemperatureAlarmModalBody');

  assert.strictEqual(modal.classList.contains('active'), true);
  assert.ok(body.innerHTML.includes('RCK088'));
  assert.ok(body.innerHTML.includes('冰箱'));
  assert.ok(body.innerHTML.includes('豆仓'));
  assert.ok(body.innerHTML.includes('温度报警值'));
});

test('运行时：关闭温度报警设置弹层时应清空当前内容', () => {
  const sandbox = buildSandbox();
  sandbox.devicesData = [{ id: 'RCK088', entryInfo: { locationName: '上海静安大悦城' } }];
  sandbox.currentDetailDeviceId = 'RCK088';

  sandbox.openDetailTemperatureAlarmModal('RCK088');
  sandbox.closeDetailTemperatureAlarmModal();

  const modal = sandbox.document.getElementById('detailTemperatureAlarmModal');
  const body = sandbox.document.getElementById('detailTemperatureAlarmModalBody');

  assert.strictEqual(modal.classList.contains('active'), false);
  assert.strictEqual(body.innerHTML, '');
});

test('运行时：点击修改应弹出参数编辑窗口并保存四项配置', () => {
  const sandbox = buildSandbox();
  sandbox.devicesData = [{
    id: 'RCK088',
    location: '上海静安大悦城',
    entryInfo: {
      locationName: '上海静安大悦城'
    }
  }];
  sandbox.currentDetailDeviceId = 'RCK088';

  sandbox.openDetailTemperatureAlarmModal('RCK088');
  sandbox.editDetailTemperatureAlarmZone('fridge');

  const editModal = sandbox.document.getElementById('detailTemperatureZoneEditModal');
  const editTitle = sandbox.document.getElementById('detailTemperatureZoneEditTitle');
  const locationCodeInput = sandbox.document.getElementById('detailTemperatureEditLocationCode');
  const tempAlarmInput = sandbox.document.getElementById('detailTemperatureEditTempAlarm');
  const humidityAlarmInput = sandbox.document.getElementById('detailTemperatureEditHumidityAlarm');
  const tempStopInput = sandbox.document.getElementById('detailTemperatureEditTempStop');

  assert.strictEqual(editModal.classList.contains('active'), true);
  assert.ok(editTitle.textContent.includes('冰箱'));
  assert.strictEqual(locationCodeInput.value, '1');
  assert.strictEqual(tempAlarmInput.value, '8');
  assert.strictEqual(humidityAlarmInput.value, '');
  assert.strictEqual(tempStopInput.value, '');

  locationCodeInput.value = 'A1';
  tempAlarmInput.value = '9';
  humidityAlarmInput.value = '66';
  tempStopInput.value = '11';
  sandbox.saveDetailTemperatureAlarmZoneEdit();

  assert.strictEqual(editModal.classList.contains('active'), false);
  assert.ok(sandbox.devicesData[0].temperatureAlarmSettings);
  const fridgeSetting = sandbox.devicesData[0].temperatureAlarmSettings.find(item => item.key === 'fridge');
  assert.ok(fridgeSetting);
  assert.strictEqual(fridgeSetting.locationCode, 'A1');
  assert.strictEqual(fridgeSetting.tempAlarm, '9度');
  assert.strictEqual(fridgeSetting.humidityAlarm, '66%');
  assert.strictEqual(fridgeSetting.tempStop, '11度');

  const body = sandbox.document.getElementById('detailTemperatureAlarmModalBody');
  assert.ok(body.innerHTML.includes('9度'));
  assert.ok(body.innerHTML.includes('66%'));
  assert.ok(body.innerHTML.includes('11度'));
});
