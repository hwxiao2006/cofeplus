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
    detailRemoteRestartContext: null,
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
    'renderDetailRemoteRestartTargetPanel',
    'getDetailRemoteRestartMeta',
    'renderDetailRemoteRestartMethodPanel',
    'renderDetailRemoteConfirmDialog',
    'renderDetailRemoteHardwareGuidePanel',
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

test('运行时：远程操作首页应保留机构重启入口', () => {
  const sandbox = buildSandbox();

  sandbox.openDetailRemoteActions('RCK088');

  const panel = sandbox.document.getElementById('detailRemoteActionSheet');
  assert.strictEqual(panel.classList.contains('active'), true);
  assert.ok(panel.innerHTML.includes('机构重启'));
  assert.strictEqual(panel.innerHTML.includes('重启系统'), false);
  assert.strictEqual(panel.innerHTML.includes('更新配方'), false);
  assert.ok(panel.innerHTML.includes('音量调节'));
  assert.strictEqual(sandbox.__operationRecords.length, 0);
});

test('运行时：点击机构重启后应先进入重启对象选择', () => {
  const sandbox = buildSandbox();

  sandbox.openDetailRemoteActions('RCK088');
  sandbox.handleDetailRemoteAction('机构重启');

  const panel = sandbox.document.getElementById('detailRemoteActionSheet');
  assert.ok(panel.innerHTML.includes('重启系统'));
  assert.ok(panel.innerHTML.includes('重启点单屏（左）'));
  assert.ok(panel.innerHTML.includes('重启点单屏（右）'));
  assert.ok(panel.innerHTML.includes('重启六轴机械臂（注意安全，谨慎使用）'));
  assert.strictEqual(panel.innerHTML.includes('选择重启方式'), false);
  assert.strictEqual(panel.innerHTML.includes('返回远程操作'), false);
  assert.strictEqual(sandbox.__operationRecords.length, 0);
});

test('运行时：点击重启对象后应直接进入软件重启确认页', () => {
  const sandbox = buildSandbox();

  sandbox.openDetailRemoteActions('RCK088');
  sandbox.handleDetailRemoteAction('机构重启');
  sandbox.handleDetailRemoteAction('重启系统');

  const panel = sandbox.document.getElementById('detailRemoteActionSheet');
  assert.ok(panel.innerHTML.includes('确定要重启系统？'));
  assert.ok(panel.innerHTML.includes('确认软件重启'));
  assert.ok(panel.innerHTML.includes('无法远程处理？查看机器按钮位置'));
  assert.ok(panel.innerHTML.includes('detail-remote-restart-confirm-primary'));
  assert.ok(panel.innerHTML.includes('detail-remote-restart-confirm-helper'));
  assert.strictEqual(panel.innerHTML.includes('选择重启方式'), false);
  assert.strictEqual(panel.innerHTML.includes('机器按钮重启'), false);
  assert.strictEqual(panel.innerHTML.includes('确认执行'), false);
  assert.strictEqual(panel.innerHTML.includes('>查看机器按钮位置<'), false);
  assert.strictEqual(sandbox.__operationRecords.length, 0);
});

test('运行时：软件重启分支应保持现有确认文案并在确认前不执行', () => {
  const sandbox = buildSandbox();

  sandbox.openDetailRemoteActions('RCK088');
  sandbox.handleDetailRemoteAction('机构重启');
  sandbox.handleDetailRemoteAction('重启点单屏（左）');

  const panel = sandbox.document.getElementById('detailRemoteActionSheet');
  assert.ok(panel.innerHTML.includes('确定要重启点单屏（左）？'));
  assert.ok(panel.innerHTML.includes('确认软件重启'));
  assert.strictEqual(sandbox.__operationRecords.length, 0);

  sandbox.handleDetailRemoteAction('确认软件重启');

  assert.strictEqual(panel.classList.contains('active'), false);
  assert.strictEqual(sandbox.__operationRecords.length, 1);
  assert.strictEqual(sandbox.__operationRecords[0].action, '重启点单屏（左）');
  assert.ok(sandbox.__toasts[0].includes('重启点单屏（左）'));
});

test('运行时：机器按钮重启应进入指导页并且我知道了后不记录成功', () => {
  const sandbox = buildSandbox();

  sandbox.openDetailRemoteActions('RCK088');
  sandbox.handleDetailRemoteAction('机构重启');
  sandbox.handleDetailRemoteAction('重启六轴机械臂（注意安全，谨慎使用）');
  sandbox.handleDetailRemoteAction('无法远程处理？查看机器按钮位置');

  const panel = sandbox.document.getElementById('detailRemoteActionSheet');
  assert.ok(panel.innerHTML.includes('系统无法远程执行'));
  assert.ok(panel.innerHTML.includes('机器按钮位置'));
  assert.ok(panel.innerHTML.includes('我知道了'));
  assert.ok(panel.innerHTML.includes('detail-remote-restart-guide-image'));
  assert.strictEqual(panel.innerHTML.includes('返回重启方式'), false);
  assert.strictEqual(sandbox.__operationRecords.length, 0);

  sandbox.handleDetailRemoteAction('我知道了');

  assert.strictEqual(panel.classList.contains('active'), false);
  assert.strictEqual(sandbox.__operationRecords.length, 0);
  assert.strictEqual(sandbox.__toasts.length, 0);
});

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

test('运行时：保存音量后应持久化、关闭弹层并提示统一文案', () => {
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

  assert.strictEqual(panel.classList.contains('active'), false);
  assert.strictEqual(panel.innerHTML, '');
  assert.strictEqual(saved.RCK088.deviceVolume, 9);
  assert.strictEqual(sandbox.__operationRecords.length, 1);
  assert.strictEqual(sandbox.__operationRecords[0].action, '设备音量调节');
  assert.ok(sandbox.__operationRecords[0].note.includes('9'));
  assert.strictEqual(sandbox.__toasts[0], '已下发音量调节');
});

test('运行时：音量详情页应提供明确的关闭入口', () => {
  const sandbox = buildSandbox();

  sandbox.openDetailRemoteActions('RCK088');
  sandbox.handleDetailRemoteAction('音量调节');
  sandbox.handleDetailRemoteAction('设备音量');

  const panel = sandbox.document.getElementById('detailRemoteActionSheet');
  assert.ok(panel.innerHTML.includes('关闭'));
  assert.ok(panel.innerHTML.includes('closeDetailRemoteActions()'));
  assert.strictEqual(panel.innerHTML.includes('返回音量调节'), false);

  sandbox.closeDetailRemoteActions();
  assert.strictEqual(panel.classList.contains('active'), false);
});
