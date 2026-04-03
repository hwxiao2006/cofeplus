const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const devicesPath = path.join(__dirname, '..', 'devices.html');
const devicesHtml = fs.readFileSync(devicesPath, 'utf8');
const REMOTE_VOLUME_STORAGE_KEY = 'deviceRemoteVolumeSettings';

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

function createLocalStorage(seed = {}) {
  const data = new Map(Object.entries(seed).map(([key, value]) => [key, String(value)]));
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
    clear() {
      data.clear();
    },
    dump(key) {
      return data.get(key);
    }
  };
}

function buildSandbox(storageSeed) {
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
  const localStorage = createLocalStorage(storageSeed);
  const sandbox = {
    console,
    Math,
    Date,
    JSON,
    DETAIL_REMOTE_VOLUME_STORAGE_KEY: REMOTE_VOLUME_STORAGE_KEY,
    activeFaultActionDeviceId: '',
    currentDetailDeviceId: '',
    detailRemoteActionMode: 'root',
    detailRemotePendingCommand: '',
    detailRemoteVolumeContext: null,
    localStorage,
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
    'openDetailRemoteActions',
    'closeDetailRemoteActions',
    'handleDetailRemoteAction'
  ].forEach(functionName => {
    vm.runInContext(extractFunctionSource(devicesHtml, functionName), sandbox);
  });
  [
    'renderDetailRemoteActionPanel',
    'getDetailRemoteVolumeMeta',
    'clampDetailRemoteVolumeValue',
    'getStoredDetailRemoteVolumes',
    'getDetailRemoteVolumeValue',
    'persistDetailRemoteVolumeValue',
    'renderDetailRemoteVolumeMenu',
    'renderDetailRemoteVolumePanel',
    'openDetailRemoteVolumePanel',
    'refreshDetailRemoteVolumePanel',
    'changeDetailRemoteVolumeDraftValue',
    'setDetailRemoteVolumeDraftValue',
    'saveDetailRemoteVolumeSetting'
  ].forEach(functionName => {
    if (devicesHtml.includes(`function ${functionName}(`)) {
      vm.runInContext(extractFunctionSource(devicesHtml, functionName), sandbox);
    }
  });
  sandbox.__operationRecords = operationRecords;
  sandbox.__toasts = toasts;
  sandbox.__localStorage = localStorage;
  return sandbox;
}

test('运行时：点击音量调节后应进入二级音量菜单', () => {
  const sandbox = buildSandbox();

  sandbox.openDetailRemoteActions('RCK088');
  sandbox.handleDetailRemoteAction('音量调节');

  const panel = sandbox.document.getElementById('detailRemoteActionSheet');
  assert.strictEqual(panel.classList.contains('active'), true);
  assert.ok(panel.innerHTML.includes('音量调节 · RCK088'));
  assert.ok(panel.innerHTML.includes('设备音量'));
  assert.ok(panel.innerHTML.includes('点单屏音量'));
  assert.strictEqual(sandbox.__operationRecords.length, 0);
});

test('运行时：设备音量页应读取该设备上次保存值', () => {
  const sandbox = buildSandbox({
    [REMOTE_VOLUME_STORAGE_KEY]: JSON.stringify({
      RCK088: {
        deviceVolume: 12,
        orderScreenVolume: 5
      }
    })
  });

  sandbox.openDetailRemoteActions('RCK088');
  sandbox.handleDetailRemoteAction('音量调节');
  sandbox.handleDetailRemoteAction('设备音量');

  const panel = sandbox.document.getElementById('detailRemoteActionSheet');
  assert.ok(panel.innerHTML.includes('设备音量'));
  assert.ok(panel.innerHTML.includes('待机背景音乐、饮品出品信息、排队号语音'));
  assert.ok(panel.innerHTML.includes('value="12"'));
  assert.ok(panel.innerHTML.includes('>12<'));
});

test('运行时：点单屏音量页应读取独立的历史值与说明文案', () => {
  const sandbox = buildSandbox({
    [REMOTE_VOLUME_STORAGE_KEY]: JSON.stringify({
      RCK088: {
        deviceVolume: 12,
        orderScreenVolume: 6
      }
    })
  });

  sandbox.openDetailRemoteActions('RCK088');
  sandbox.handleDetailRemoteAction('音量调节');
  sandbox.handleDetailRemoteAction('点单屏音量');

  const panel = sandbox.document.getElementById('detailRemoteActionSheet');
  assert.ok(panel.innerHTML.includes('点单屏音量'));
  assert.ok(panel.innerHTML.includes('欢迎语音、下单提示语音、制作中音乐'));
  assert.ok(panel.innerHTML.includes('value="6"'));
  assert.ok(panel.innerHTML.includes('>6<'));
});

test('运行时：保存音量后应持久化并停留在当前页面', () => {
  const sandbox = buildSandbox();

  sandbox.openDetailRemoteActions('RCK088');
  sandbox.handleDetailRemoteAction('音量调节');
  sandbox.handleDetailRemoteAction('设备音量');
  assert.strictEqual(typeof sandbox.changeDetailRemoteVolumeDraftValue, 'function');
  assert.strictEqual(typeof sandbox.setDetailRemoteVolumeDraftValue, 'function');
  assert.strictEqual(typeof sandbox.saveDetailRemoteVolumeSetting, 'function');
  sandbox.changeDetailRemoteVolumeDraftValue(3);
  sandbox.setDetailRemoteVolumeDraftValue(9);
  sandbox.saveDetailRemoteVolumeSetting();

  const panel = sandbox.document.getElementById('detailRemoteActionSheet');
  const saved = JSON.parse(sandbox.__localStorage.dump(REMOTE_VOLUME_STORAGE_KEY));

  assert.strictEqual(panel.classList.contains('active'), true);
  assert.ok(panel.innerHTML.includes('设备音量'));
  assert.strictEqual(saved.RCK088.deviceVolume, 9);
  assert.strictEqual(sandbox.__operationRecords.length, 1);
  assert.strictEqual(sandbox.__operationRecords[0].action, '设备音量调节');
  assert.ok(sandbox.__operationRecords[0].note.includes('9'));
  assert.ok(sandbox.__toasts[0].includes('9'));
});
