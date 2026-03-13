const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function extractInlineScript(html) {
  const match = html.match(/<script>([\s\S]*)<\/script>\s*<\/body>/);
  if (!match) {
    throw new Error('inline script not found');
  }
  return match[1];
}

function createElement(id) {
  return {
    id,
    style: {},
    dataset: {},
    innerHTML: '',
    textContent: '',
    value: '',
    clientWidth: 240,
    scrollWidth: 120,
    focus() {},
    contains() {
      return false;
    },
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() {
        return false;
      }
    }
  };
}

function createRuntime(htmlFile) {
  const html = fs.readFileSync(path.join(__dirname, '..', htmlFile), 'utf8');
  const script = `${extractInlineScript(html)}
this.__test = {
  getDeviceLangs,
  getLangName,
  updateDeviceLangs,
  getSalesHistoryForDevice,
  getYoyReferenceForDevice,
  getProductStructureForDevice,
  aggregateSalesForOverview,
  setCurrentDevice(value) { currentDevice = value; },
  setOverviewSelection(devices) {
    overviewAllDevices = devices.slice();
    overviewSelectedDevices = new Set(devices);
  }
};`;

  const elements = {};
  const document = {
    getElementById(id) {
      if (!elements[id]) {
        elements[id] = createElement(id);
      }
      return elements[id];
    },
    querySelector() {
      return createElement('querySelector');
    },
    querySelectorAll() {
      return [];
    },
    addEventListener() {}
  };

  const context = {
    console,
    document,
    window: {
      addEventListener() {},
      history: { replaceState() {} },
      location: { pathname: `/${htmlFile}` },
      innerWidth: 1440
    },
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {}
    },
    setTimeout() {
      return 1;
    },
    clearTimeout() {}
  };

  vm.runInNewContext(script, context);

  return {
    api: context.__test,
    elements
  };
}

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

['overview.html', 'menu.html'].forEach(htmlFile => {
  test(`${htmlFile} 在本地存在新设备编号时应回退到默认语言配置`, () => {
    const runtime = createRuntime(htmlFile);
    runtime.api.setCurrentDevice('RCK386');

    assert.deepStrictEqual(Array.from(runtime.api.getDeviceLangs()), ['zh', 'en']);
    assert.strictEqual(runtime.api.getLangName('zh'), '中文');
    assert.strictEqual(runtime.api.getLangName('en'), 'English');

    runtime.api.updateDeviceLangs();
    assert.strictEqual(String(runtime.elements.langCount.textContent), '2');
    assert.match(runtime.elements.deviceLangs.innerHTML, /中文/);
    assert.match(runtime.elements.deviceLangs.innerHTML, /English/);
  });

  test(`${htmlFile} 应为新设备生成稳定的经营 mock 数据`, () => {
    const runtime = createRuntime(htmlFile);
    runtime.api.setCurrentDevice('RCK386');

    const firstHistory = runtime.api.getSalesHistoryForDevice('RCK386');
    const secondHistory = runtime.api.getSalesHistoryForDevice('RCK386');
    const structure = runtime.api.getProductStructureForDevice('RCK386');
    const yoy = runtime.api.getYoyReferenceForDevice('RCK386');

    assert.strictEqual(firstHistory.length, 7);
    assert.deepStrictEqual(firstHistory, secondHistory);
    assert.ok(firstHistory.every(day => day.gross > 0));
    assert.ok(firstHistory.every(day => Array.isArray(day.hourly) && day.hourly.length === 24));
    assert.ok(yoy > 0);
    assert.strictEqual(structure.top5.length, 5);
    assert.ok(structure.typeShare.length > 0);

    runtime.api.setOverviewSelection(['RCK386']);
    const aggregate = runtime.api.aggregateSalesForOverview();
    assert.strictEqual(aggregate.history.length, 7);
    assert.ok(aggregate.history[6].gross > 0);
    assert.ok(aggregate.yoy > 0);
  });

  test(`${htmlFile} 应保留已有样例设备的原始经营数据`, () => {
    const runtime = createRuntime(htmlFile);
    const history = runtime.api.getSalesHistoryForDevice('RCK111');
    const yoy = runtime.api.getYoyReferenceForDevice('RCK111');

    assert.strictEqual(history[0].gross, 3120);
    assert.strictEqual(history[6].gross, 3826);
    assert.strictEqual(yoy, 3350);
  });
});
