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

  const operationRecords = [];
  const toasts = [];
  const sandbox = {
    console,
    Math,
    Date,
    activeFaultActionDeviceId: '',
    currentDetailDeviceId: '',
    detailRemoteActionMode: 'root',
    detailRemotePendingCommand: '',
    document: {
      getElementById: getElement
    },
    appendFaultOperationRecord(deviceId, action, result, note) {
      operationRecords.push({ deviceId, action, result, note });
    },
    showToast(message) {
      toasts.push(message);
    }
  };
  vm.createContext(sandbox);
  [
    'escapeHtml',
    'renderDetailRemoteActionPanel',
    'renderDetailRemoteRestartPanel',
    'renderDetailRemoteConfirmDialog',
    'openDetailRemoteActions',
    'closeDetailRemoteActions',
    'handleDetailRemoteAction'
  ].forEach(functionName => {
    vm.runInContext(extractFunctionSource(devicesHtml, functionName), sandbox);
  });
  sandbox.__operationRecords = operationRecords;
  sandbox.__toasts = toasts;
  return sandbox;
}

test('运行时：点击机构重启后应进入二级重启面板', () => {
  const sandbox = buildSandbox();

  sandbox.openDetailRemoteActions('RCK088');
  sandbox.handleDetailRemoteAction('机构重启');

  const panel = sandbox.document.getElementById('detailRemoteActionSheet');
  assert.strictEqual(panel.classList.contains('active'), true);
  assert.ok(panel.innerHTML.includes('机构重启'));
  assert.ok(panel.innerHTML.includes('重启系统'));
  assert.ok(panel.innerHTML.includes('重启点单屏（左）'));
  assert.ok(panel.innerHTML.includes('重启点单屏（右）'));
  assert.ok(panel.innerHTML.includes('重启六轴机械臂（注意安全，谨慎使用）'));
});

test('运行时：机构重启分项确认后才应执行远程指令', () => {
  const sandbox = buildSandbox();

  sandbox.openDetailRemoteActions('RCK088');
  sandbox.handleDetailRemoteAction('机构重启');
  sandbox.handleDetailRemoteAction('重启系统');

  const panel = sandbox.document.getElementById('detailRemoteActionSheet');
  assert.ok(panel.innerHTML.includes('确定要重启系统？'));
  assert.strictEqual(sandbox.__operationRecords.length, 0);

  sandbox.handleDetailRemoteAction('确认执行');

  assert.strictEqual(panel.classList.contains('active'), false);
  assert.strictEqual(sandbox.__operationRecords.length, 1);
  assert.strictEqual(sandbox.__operationRecords[0].action, '重启系统');
  assert.ok(sandbox.__toasts[0].includes('重启系统'));
});
