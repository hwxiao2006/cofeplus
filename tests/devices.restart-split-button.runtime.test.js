const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'devices.html'), 'utf8');

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

function extractFunctionSource(source, functionName) {
  const signature = `function ${functionName}(`;
  const start = source.indexOf(signature);
  if (start === -1) throw new Error(`未找到函数 ${functionName}`);
  const braceStart = source.indexOf('{', start);
  let depth = 0;
  for (let i = braceStart; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`函数 ${functionName} 解析失败`);
}

function buildSandbox() {
  const calls = [];
  const popover = {
    attrs: { 'data-open': 'false' },
    setAttribute(name, value) { this.attrs[name] = String(value); },
    getAttribute(name) { return this.attrs[name]; },
    contains() { return false; }
  };
  const caret = {
    attrs: { 'aria-expanded': 'false' },
    setAttribute(name, value) { this.attrs[name] = String(value); },
    getAttribute(name) { return this.attrs[name]; },
    contains() { return false; }
  };
  const sandbox = {
    console,
    activeFaultActionDeviceId: '',
    currentDetailDeviceId: '',
    detailRemoteActionMode: '',
    document: {
      querySelector(selector) {
        if (selector === '.detail-side-restart-popover') return popover;
        if (selector === '.detail-side-restart-caret') return caret;
        return null;
      },
      addEventListener() {},
      removeEventListener() {}
    },
    __calls: calls,
    openDetailQuickRestart: (deviceId, action) => calls.push(['openDetailQuickRestart', deviceId, action]),
    handleDetailRemoteAction: (action) => calls.push(['handleDetailRemoteAction', action])
  };
  vm.createContext(sandbox);
  return { sandbox, calls, popover, caret };
}

function loadRestartSplitFunctions(sandbox) {
  [
    'closeDetailRestartPopover',
    'openDetailRestartSystem',
    'openDetailRestartPart',
    'toggleDetailRestartPopover'
  ].forEach((functionName) => {
    vm.runInContext(extractFunctionSource(html, functionName), sandbox);
  });
}

test('openDetailRestartSystem 应调用 openDetailQuickRestart(deviceId, "重启系统")', () => {
  const { sandbox, calls } = buildSandbox();
  loadRestartSplitFunctions(sandbox);

  sandbox.openDetailRestartSystem('DEV-1');

  assert.deepStrictEqual(calls[0], ['openDetailQuickRestart', 'DEV-1', '重启系统']);
});

test('toggleDetailRestartPopover 应切换 data-open 与 aria-expanded', () => {
  const { sandbox, popover, caret } = buildSandbox();
  loadRestartSplitFunctions(sandbox);
  const fakeEvent = { stopPropagation() {}, preventDefault() {} };

  sandbox.toggleDetailRestartPopover(fakeEvent, 'DEV-1');
  assert.strictEqual(popover.getAttribute('data-open'), 'true');
  assert.strictEqual(caret.getAttribute('aria-expanded'), 'true');

  sandbox.toggleDetailRestartPopover(fakeEvent, 'DEV-1');
  assert.strictEqual(popover.getAttribute('data-open'), 'false');
  assert.strictEqual(caret.getAttribute('aria-expanded'), 'false');
});

test('openDetailRestartPart 应调用 handleDetailRemoteAction 并关闭 popover', () => {
  const { sandbox, calls, popover, caret } = buildSandbox();
  loadRestartSplitFunctions(sandbox);
  popover.attrs['data-open'] = 'true';
  caret.attrs['aria-expanded'] = 'true';
  sandbox.currentDetailDeviceId = 'DEV-1';

  sandbox.openDetailRestartPart('DEV-1', '重启点单屏（左）');

  assert.strictEqual(sandbox.activeFaultActionDeviceId, 'DEV-1');
  assert.deepStrictEqual(calls[0], ['handleDetailRemoteAction', '重启点单屏（左）']);
  assert.strictEqual(popover.getAttribute('data-open'), 'false');
  assert.strictEqual(caret.getAttribute('aria-expanded'), 'false');
});

test('closeDetailRestartPopover 应把 popover 和 caret 都置回关闭态', () => {
  const { sandbox, popover, caret } = buildSandbox();
  loadRestartSplitFunctions(sandbox);
  popover.attrs['data-open'] = 'true';
  caret.attrs['aria-expanded'] = 'true';

  sandbox.closeDetailRestartPopover();

  assert.strictEqual(popover.getAttribute('data-open'), 'false');
  assert.strictEqual(caret.getAttribute('aria-expanded'), 'false');
});

test('devices.html 应为 openDetailRestartOptions 标注 legacy 注释', () => {
  assert.ok(
    /\/\/\s*legacy[^\n]*popover[^\n]*\n\s*function\s+openDetailRestartOptions/i.test(html) ||
      /function\s+openDetailRestartOptions[\s\S]*?\/\/\s*legacy/i.test(html),
    'openDetailRestartOptions 应在函数定义附近包含 "legacy" 注释,提示已被 split button popover 取代'
  );
});
