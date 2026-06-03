const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'shared', 'fault-restart-flow.js'), 'utf8');

function loadModule(documentStub) {
  const sandbox = { window: {}, globalThis: {}, document: documentStub };
  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox);
  return sandbox.window.CofeFaultRestartFlow || sandbox.globalThis.CofeFaultRestartFlow;
}

function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (error) { console.error(`FAIL ${name}`); console.error(error.stack || error.message); process.exitCode = 1; }
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function createPanel() {
  return {
    innerHTML: '',
    classList: {
      _classes: new Set(['active']),
      add(value) { this._classes.add(value); },
      remove(value) { this._classes.delete(value); },
      contains(value) { return this._classes.has(value); }
    }
  };
}

function createDocStub() {
  const head = { children: [], appendChild(child) { this.children.push(child); } };
  return {
    head,
    createElement(tag) {
      return { tag, attrs: {}, textContent: '', setAttribute(key, value) { this.attrs[key] = value; } };
    }
  };
}

const M = loadModule(undefined);

test('ACTIONS: 4 项,顺序固定', () => {
  assert.deepStrictEqual(plain(M.ACTIONS), [
    '重启系统',
    '重启点单屏（左）',
    '重启点单屏（右）',
    '重启六轴机械臂（注意安全，谨慎使用）'
  ]);
});

test('getActionMeta("重启系统"): 含 4 步 steps + 通用 warning', () => {
  const meta = M.getActionMeta('重启系统');
  assert.strictEqual(meta.steps.length, 4);
  assert.ok(meta.warning.includes('设备现场完成'));
  assert.ok(meta.guideTitle.includes('重启系统'));
});

test('getActionMeta("重启六轴机械臂（注意安全，谨慎使用）"): warning 含机械臂周边安全', () => {
  const meta = M.getActionMeta('重启六轴机械臂（注意安全，谨慎使用）');
  assert.ok(meta.warning.includes('机械臂周边安全'));
});

test('getActionMeta(未知): null', () => {
  assert.strictEqual(M.getActionMeta('不存在的动作'), null);
});

test('renderSubPanel: 含 4 个 onclick 入口,deviceId 转义', () => {
  const html = M.renderSubPanel('TEST<001>');
  assert.strictEqual((html.match(/window\.CofeFaultRestartFlow\.dispatch\(/g) || []).length, 4);
  assert.ok(html.includes('重启系统'));
  assert.ok(html.includes('重启点单屏（左）'));
  assert.ok(html.includes('重启点单屏（右）'));
  assert.ok(html.includes('重启六轴机械臂（注意安全，谨慎使用）'));
  assert.ok(html.includes('TEST&lt;001&gt;'));
});

test('renderConfirmDialog: 含三段关键文案', () => {
  const html = M.renderConfirmDialog('重启系统');
  assert.ok(html.includes('确认软件重启'));
  assert.ok(html.includes('无法远程处理？查看机器按钮位置'));
  assert.ok(html.includes('取消'));
  assert.ok(html.includes('确定要重启系统？'));
});

test('renderHardwareGuide: 含 4 个步骤 li + warning + imageLabel', () => {
  const html = M.renderHardwareGuide('TEST001', '重启系统');
  assert.strictEqual((html.match(/<li>/g) || []).length, 4);
  assert.ok(html.includes('该操作需要客户在设备现场完成'));
  assert.ok(html.includes('整机重启按钮位置示意图'));
});

test('renderConfirmDialog(未知动作): 不抛错,返回兜底 HTML', () => {
  const html = M.renderConfirmDialog('不存在的动作');
  assert.ok(typeof html === 'string');
  assert.ok(html.includes('取消'));
});

test('open(ctx): 进 sub 态,panel 含 4 选项', () => {
  const panel = createPanel();
  const ctx = { deviceId: 'D001', panel, onCommit: () => {}, onCancel: () => {} };
  M.open(ctx);
  assert.strictEqual(ctx.mode, 'sub');
  assert.ok(panel.innerHTML.includes('机构重启 · D001'));
  assert.strictEqual((panel.innerHTML.match(/dispatch\(/g) || []).length, 4);
});

test('dispatch(X) sub -> confirm: pendingAction 记录', () => {
  const panel = createPanel();
  const ctx = { deviceId: 'D001', panel, onCommit: () => {}, onCancel: () => {} };
  M.open(ctx);
  M.dispatch('重启系统');
  assert.strictEqual(ctx.mode, 'confirm');
  assert.strictEqual(ctx.pendingAction, '重启系统');
  assert.ok(panel.innerHTML.includes('确定要重启系统？'));
});

test('dispatch("确认软件重启") confirm -> commit: 调 onCommit 后关闭', () => {
  const panel = createPanel();
  let committedArgs = null;
  const ctx = { deviceId: 'D001', panel, onCommit: (...args) => { committedArgs = args; }, onCancel: () => {} };
  M.open(ctx);
  M.dispatch('重启系统');
  M.dispatch('确认软件重启');
  assert.deepStrictEqual(committedArgs, ['D001', '重启系统']);
  assert.strictEqual(panel.innerHTML, '');
  assert.strictEqual(ctx.mode, null);
});

test('dispatch("无法远程处理？查看机器按钮位置") confirm -> hardware-guide', () => {
  const panel = createPanel();
  const ctx = { deviceId: 'D001', panel, onCommit: () => {}, onCancel: () => {} };
  M.open(ctx);
  M.dispatch('重启点单屏（左）');
  M.dispatch('无法远程处理？查看机器按钮位置');
  assert.strictEqual(ctx.mode, 'hardware-guide');
  assert.ok(panel.innerHTML.includes('左侧点单屏'));
});

test('dispatch("取消") confirm -> close: 调 onCancel', () => {
  const panel = createPanel();
  let cancelled = false;
  const ctx = { deviceId: 'D001', panel, onCommit: () => {}, onCancel: () => { cancelled = true; } };
  M.open(ctx);
  M.dispatch('重启系统');
  M.dispatch('取消');
  assert.strictEqual(cancelled, true);
  assert.strictEqual(panel.innerHTML, '');
  assert.strictEqual(ctx.mode, null);
});

test('dispatch("我知道了") hardware-guide -> close', () => {
  const panel = createPanel();
  let cancelled = false;
  const ctx = { deviceId: 'D001', panel, onCommit: () => {}, onCancel: () => { cancelled = true; } };
  M.open(ctx);
  M.dispatch('重启系统');
  M.dispatch('无法远程处理？查看机器按钮位置');
  M.dispatch('我知道了');
  assert.strictEqual(cancelled, true);
  assert.strictEqual(panel.innerHTML, '');
});

test('dispatch 在无 activeCtx 时静默', () => {
  M.close(null);
  assert.doesNotThrow(() => M.dispatch('重启系统'));
});

test('_setActiveCtx + dispatch: 可在跳过 open 时让 confirm 按钮工作', () => {
  M.close(null);
  const panel = createPanel();
  let committedArgs = null;
  const ctx = {
    deviceId: 'D001',
    panel,
    mode: 'confirm',
    pendingAction: '重启系统',
    onCommit: (...args) => { committedArgs = args; },
    onCancel: () => {}
  };
  panel.innerHTML = M.renderConfirmDialog('重启系统');
  M._setActiveCtx(ctx);
  M.dispatch('确认软件重启');
  assert.deepStrictEqual(committedArgs, ['D001', '重启系统']);
});

test('injectStyles: 注入一个带标记的 style;重复调用不重复注入', () => {
  const documentStub = createDocStub();
  const Mod = loadModule(documentStub);
  Mod.injectStyles();
  Mod.injectStyles();
  assert.strictEqual(documentStub.head.children.length, 1);
  assert.strictEqual(documentStub.head.children[0].attrs['data-cofe-fault-restart-flow'], '1');
  assert.ok(documentStub.head.children[0].textContent.includes('.detail-fault-sheet-dialog'));
  assert.ok(documentStub.head.children[0].textContent.includes('.detail-remote-restart-confirm-shell'));
});
