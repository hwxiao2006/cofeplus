const assert = require('assert');
const fs = require('fs');
const path = require('path');

function read(filePath) {
  return fs.readFileSync(path.join(__dirname, '..', filePath), 'utf8');
}

function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (error) { console.error(`FAIL ${name}`); console.error(error.stack || error.message); process.exitCode = 1; }
}

test('R-1: devices.html 引入了 shared/fault-restart-flow.js', () => {
  const html = read('devices.html');
  assert.ok(/<script src="shared\/fault-restart-flow\.js"><\/script>/.test(html));
});

test('R-2: devices.html 初始化阶段调用 injectStyles', () => {
  const html = read('devices.html');
  assert.ok(/CofeFaultRestartFlow\.injectStyles\s*\(/.test(html));
});

test('R-3: devices.html renderDetailRemoteRestartPanel 委派', () => {
  const html = read('devices.html');
  const match = html.match(/function\s+renderDetailRemoteRestartPanel\s*\([^)]*\)\s*\{[^}]*\}/);
  assert.ok(match);
  assert.ok(/CofeFaultRestartFlow\.renderSubPanel/.test(match[0]));
});

test('R-4: devices.html renderDetailRemoteConfirmDialog 委派', () => {
  const html = read('devices.html');
  assert.ok(/CofeFaultRestartFlow\.renderConfirmDialog/.test(html));
});

test('R-5: devices.html renderDetailRemoteHardwareGuidePanel 委派', () => {
  const html = read('devices.html');
  assert.ok(/CofeFaultRestartFlow\.renderHardwareGuide/.test(html));
});

test('R-6: devices.html getDetailRemoteRestartMeta 委派', () => {
  const html = read('devices.html');
  assert.ok(/CofeFaultRestartFlow\.getActionMeta/.test(html));
});

test('R-7: devices.html handleDetailRemoteAction 在机构重启入口调 module.open', () => {
  const html = read('devices.html');
  const start = html.indexOf('function handleDetailRemoteAction');
  const end = html.indexOf('\n        function openDetailEditFaultStatus', start);
  const body = html.slice(start, end);
  assert.ok(/CofeFaultRestartFlow\.open/.test(body));
  assert.ok(!/detailRemoteActionMode === 'confirm'/.test(body));
});

test('R-8: devices.html openDetailQuickRestart 通过 _setActiveCtx 接管 confirm', () => {
  const html = read('devices.html');
  const start = html.indexOf('function openDetailQuickRestart');
  const end = html.indexOf('\n        // Restart split button', start);
  const body = html.slice(start, end);
  assert.ok(/renderDetailRemoteConfirmDialog/.test(body));
  assert.ok(/CofeFaultRestartFlow\._setActiveCtx/.test(body));
});

test('R-9: devices.html 已移除重启专属内联 CSS', () => {
  const html = read('devices.html');
  assert.ok(!/\.detail-remote-restart-confirm-shell\s*\{/.test(html));
  assert.ok(!/\.detail-remote-restart-guide-shell\s*\{/.test(html));
  assert.ok(!/\.detail-side-restart-split\s*\{/.test(html));
});

test('R-10: devices.html 共用 detail-fault-sheet CSS 仍在且有同步注释', () => {
  const html = read('devices.html');
  assert.ok(/\.detail-fault-sheet-dialog\s*\{/.test(html));
  assert.ok(/同步副本在 shared\/fault-restart-flow\.js/.test(html));
});

test('R-11: faults.html 引入 shared/fault-restart-flow.js', () => {
  const html = read('faults.html');
  assert.ok(/<script src="shared\/fault-restart-flow\.js"><\/script>/.test(html));
});

test('R-12: faults.html 初始化阶段调用 injectStyles', () => {
  const html = read('faults.html');
  assert.ok(/CofeFaultRestartFlow\.injectStyles\s*\(/.test(html));
});

test('R-13: faults.html 新增 faultRestartFlowSheet 容器', () => {
  const html = read('faults.html');
  assert.ok(/<div id="faultRestartFlowSheet"/.test(html));
});

test('R-14: faults.html 新增 showToast 函数', () => {
  const html = read('faults.html');
  assert.ok(/function\s+showToast\s*\(/.test(html));
});

test('R-15: faults.html 新增 appendFaultOperationRecord 函数', () => {
  const html = read('faults.html');
  assert.ok(/function\s+appendFaultOperationRecord\s*\(/.test(html));
});

test('R-16: faults.html 新增 openFaultRestartFlow 函数', () => {
  const html = read('faults.html');
  assert.ok(/function\s+openFaultRestartFlow\s*\(/.test(html));
  assert.ok(/CofeFaultRestartFlow\.open/.test(html));
});

test('R-17: faults.html 机构重启按钮 onclick 已切换为 openFaultRestartFlow', () => {
  const html = read('faults.html');
  const start = html.indexOf('function openRemoteActions');
  const end = html.indexOf('\n        function closeRemoteActions', start);
  const body = html.slice(start, end);
  assert.ok(/openFaultRestartFlow\(\)/.test(body));
  assert.ok(/handleRemoteAction\('设备开门'\)/.test(body));
  assert.ok(!/handleRemoteAction\('机构重启'\)/.test(body));
});

test('R-18: faults.html 桌面端机构重启弹层应居中展示', () => {
  const html = read('faults.html');
  assert.ok(/#faultRestartFlowSheet\.desktop-mode\.active\s*\{[\s\S]*display:\s*flex/.test(html));
  assert.ok(/#faultRestartFlowSheet\.desktop-mode\.active\s*\{[\s\S]*align-items:\s*center/.test(html));
  assert.ok(/#faultRestartFlowSheet\.desktop-mode\.active\s*\{[\s\S]*justify-content:\s*center/.test(html));

  const start = html.indexOf('function openFaultRestartFlow');
  const end = html.indexOf('\n        function openRemoteActions', start);
  const body = html.slice(start, end);
  assert.ok(/panel\.classList\.toggle\('desktop-mode',\s*isDesktopInteractionMode\(\)\)/.test(body));
});

test('R-19: 共享重启菜单 hover 应保持文字可读且不改变布局', () => {
  const source = read('shared/fault-restart-flow.js');
  const match = source.match(/\.detail-fault-sheet-option:hover\s*\{([\s\S]*?)\}/);
  assert.ok(match);
  assert.ok(/background:\s*#ecfeff/.test(match[1]));
  assert.ok(/color:\s*#0f766e/.test(match[1]));
  assert.ok(!/color:\s*#fff/.test(match[1]));
  assert.ok(!/font-size:/.test(match[1]));
  assert.ok(!/margin-top:/.test(match[1]));
});
