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
    document: {
      getElementById: getElement
    }
  };
  vm.createContext(sandbox);
  [
    'escapeHtml',
    'getDeviceFaultSeed',
    'getDetailTemperatureAlarmContext',
    'buildDetailTemperatureAlarmZones',
    'renderDetailTemperatureAlarmModalBody',
    'openDetailTemperatureAlarmModal',
    'closeDetailTemperatureAlarmModal'
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
