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
    children: [],
    focus() {},
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    contains() {
      return false;
    },
    addEventListener() {},
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

function createRuntime(storageSeed = {}) {
  const helperPath = path.join(__dirname, '..', 'shared', 'business-tag-library.js');
  const helperScript = fs.readFileSync(helperPath, 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'product-detail.html'), 'utf8');
  const script = `${extractInlineScript(html)}
this.__test = {
  ensureDeviceLanguageConfig,
  getDeviceLangs,
  getLangName,
  getBusinessTagLanguageContext,
  setCurrentDevice(value) { currentDevice = value; }
};`;

  const storage = { ...storageSeed };
  const elements = {};
  const context = {
    console,
    localStorage: {
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null;
      },
      setItem(key, value) {
        storage[key] = String(value);
      }
    },
    sessionStorage: {
      getItem() { return null; },
      setItem() {},
      removeItem() {}
    },
    document: {
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
    },
    window: {
      addEventListener() {},
      history: { replaceState() {} },
      location: { pathname: '/product-detail.html', search: '' },
      innerWidth: 1440,
      name: ''
    },
    URLSearchParams,
    setTimeout() {
      return 1;
    },
    clearTimeout() {},
    confirm() { return true; },
    prompt() { return null; }
  };

  vm.runInNewContext(helperScript, context);
  context.BusinessTags = context.window.CofeBusinessTags || context.globalThis?.CofeBusinessTags || context.CofeBusinessTags;
  vm.runInNewContext(script, context);
  return context.__test;
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

test('商品详情页应优先读取本地持久化的设备语言配置', () => {
  const runtime = createRuntime({
    deviceLanguageConfig_RCK111: JSON.stringify({
      langs: ['zh', 'en', 'fr'],
      hiddenLangs: [],
      langNames: { zh: '中文', en: 'English', fr: 'Français' }
    })
  });

  runtime.setCurrentDevice('RCK111');

  assert.deepStrictEqual(Array.from(runtime.getDeviceLangs()), ['zh', 'en', 'fr']);
  assert.strictEqual(runtime.getLangName('fr'), 'Français');
});

test('商品详情页在没有持久化设备语言配置时应回退默认语言', () => {
  const runtime = createRuntime();

  runtime.setCurrentDevice('RCK990');

  assert.deepStrictEqual(Array.from(runtime.getDeviceLangs()), ['zh', 'en']);
  assert.strictEqual(runtime.getLangName('zh'), '中文');
  assert.strictEqual(runtime.getLangName('en'), 'English');
});

test('商品详情页业务标签编辑在设备无可见语言时应进入阻断态', () => {
  const runtime = createRuntime({
    deviceLanguageConfig_RCK111: JSON.stringify({
      langs: [],
      hiddenLangs: [],
      langNames: {}
    })
  });

  runtime.setCurrentDevice('RCK111');

  const result = runtime.getBusinessTagLanguageContext();
  assert.strictEqual(result.ok, false);
});
