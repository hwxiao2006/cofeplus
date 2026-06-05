const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'shared', 'fault-restart-flow.js'), 'utf8');
const BASELINES = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'fault-restart-flow.baselines.json'), 'utf8'));

function loadModule() {
  const sandbox = { window: {}, globalThis: {}, document: undefined };
  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox);
  return sandbox.window.CofeFaultRestartFlow || sandbox.globalThis.CofeFaultRestartFlow;
}

function normalize(html) {
  return String(html)
    .replace(/onclick="[^"]*"/g, 'onclick="..."')
    .replace(/\s+/g, ' ')
    .trim();
}

function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (error) { console.error(`FAIL ${name}`); console.error(error.stack || error.message); process.exitCode = 1; }
}

const M = loadModule();

test('snapshot: renderSubPanel == 基线', () => {
  assert.strictEqual(normalize(M.renderSubPanel('TEST001')), normalize(BASELINES.sub));
});

test('snapshot: renderConfirmDialog("重启系统") == 基线', () => {
  assert.strictEqual(normalize(M.renderConfirmDialog('重启系统')), normalize(BASELINES.confirm_system));
});

test('snapshot: renderConfirmDialog("重启点单屏（左）") == 基线', () => {
  assert.strictEqual(normalize(M.renderConfirmDialog('重启点单屏（左）')), normalize(BASELINES.confirm_left));
});

test('snapshot: renderConfirmDialog("重启点单屏（右）") == 基线', () => {
  assert.strictEqual(normalize(M.renderConfirmDialog('重启点单屏（右）')), normalize(BASELINES.confirm_right));
});

test('snapshot: renderConfirmDialog("重启六轴机械臂（注意安全，谨慎使用）") == 基线', () => {
  assert.strictEqual(normalize(M.renderConfirmDialog('重启六轴机械臂（注意安全，谨慎使用）')), normalize(BASELINES.confirm_arm));
});

test('snapshot: renderHardwareGuide(*, "重启系统") == 基线', () => {
  assert.strictEqual(normalize(M.renderHardwareGuide('TEST001', '重启系统')), normalize(BASELINES.guide_system));
});

test('snapshot: renderHardwareGuide(*, "重启点单屏（左）") == 基线', () => {
  assert.strictEqual(normalize(M.renderHardwareGuide('TEST001', '重启点单屏（左）')), normalize(BASELINES.guide_left));
});

test('snapshot: renderHardwareGuide(*, "重启点单屏（右）") == 基线', () => {
  assert.strictEqual(normalize(M.renderHardwareGuide('TEST001', '重启点单屏（右）')), normalize(BASELINES.guide_right));
});

test('snapshot: renderHardwareGuide(*, "重启六轴机械臂（注意安全，谨慎使用）") == 基线', () => {
  assert.strictEqual(normalize(M.renderHardwareGuide('TEST001', '重启六轴机械臂（注意安全，谨慎使用）')), normalize(BASELINES.guide_arm));
});
