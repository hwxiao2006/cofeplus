const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function extractInlineScript(html) {
  const match = html.match(/<script>([\s\S]*)<\/script>\s*<\/body>/);
  if (!match) throw new Error('inline script not found');
  return match[1];
}

function createElement(id) {
  const el = {
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
    appendChild(child) { this.children.push(child); return child; },
    contains() { return false; },
    addEventListener() {},
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() { return false; }
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    closest() { return null; }
  };
  return el;
}

function createRuntime(storageSeed = {}) {
  const tagGroupHelperScript = fs.readFileSync(
    path.join(__dirname, '..', 'shared', 'tag-group-i18n.js'),
    'utf8'
  );
  const businessTagHelperScript = fs.readFileSync(
    path.join(__dirname, '..', 'shared', 'business-tag-library.js'),
    'utf8'
  );
  const html = fs.readFileSync(
    path.join(__dirname, '..', 'product-detail.html'),
    'utf8'
  );
  const script = `${extractInlineScript(html)}
this.__test = {
  getTagGroupLabel,
  renderTagTree,
  renderTagGroupManageBody,
  refreshOptionTitles,
  saveTagGroupManageModal,
  tagConfigs,
  setCurrentDevice(value) { currentDevice = value; },
  setCurrentLang(value) { currentLang = value; },
  setDrawerActiveSpec(value) { drawerActiveSpecKey = value; },
  getDocument: () => document,
  setStoredGroup(specKey, lang, value) {
    const stored = TagGroupI18n.readStored(currentDevice);
    if (!stored[specKey]) stored[specKey] = {};
    stored[specKey][lang] = value;
    TagGroupI18n.writeStored(currentDevice, stored);
  },
  setProductData(value) { productData = value; }
};`;

  const storage = { ...storageSeed };
  const elements = {};

  function getOrCreate(id) {
    if (!elements[id]) elements[id] = createElement(id);
    return elements[id];
  }

  const context = {
    console,
    localStorage: {
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null;
      },
      setItem(key, value) {
        storage[key] = String(value);
      },
      removeItem(key) { delete storage[key]; }
    },
    sessionStorage: {
      getItem() { return null; },
      setItem() {},
      removeItem() {}
    },
    document: {
      getElementById: getOrCreate,
      querySelector() { return createElement('querySelector'); },
      querySelectorAll() { return []; },
      addEventListener() {},
      __elements: elements
    },
    window: {
      addEventListener() {},
      history: { replaceState() {} },
      location: { pathname: '/product-detail.html', search: '' },
      innerWidth: 1440,
      name: ''
    },
    URLSearchParams,
    setTimeout() { return 1; },
    clearTimeout() {},
    confirm() { return true; },
    prompt() { return null; }
  };

  vm.runInNewContext(tagGroupHelperScript, context);
  vm.runInNewContext(businessTagHelperScript, context);
  context.TagGroupI18n = context.window.TagGroupI18n || context.globalThis?.TagGroupI18n || context.TagGroupI18n;
  context.BusinessTags = context.window.CofeBusinessTags || context.globalThis?.CofeBusinessTags || context.CofeBusinessTags;
  vm.runInNewContext(script, context);
  return { ctx: context, api: context.__test, storage, elements };
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

test('getTagGroupLabel 默认返回内置中文名称', () => {
  const { api } = createRuntime();
  api.setCurrentDevice('RCK111');
  api.setCurrentLang('zh');
  assert.strictEqual(api.getTagGroupLabel('beans', 'zh'), '咖啡豆');
  assert.strictEqual(api.getTagGroupLabel('beans', 'en'), 'Coffee Beans');
  assert.strictEqual(api.getTagGroupLabel('latteArt', 'en'), 'Latte Art');
});

test('写入设备级标签分组后 getTagGroupLabel 返回新值', () => {
  const { api } = createRuntime();
  api.setCurrentDevice('RCK111');
  api.setStoredGroup('beans', 'zh', '黑豆精选');
  api.setStoredGroup('beans', 'en', 'Premium Beans');
  assert.strictEqual(api.getTagGroupLabel('beans', 'zh'), '黑豆精选');
  assert.strictEqual(api.getTagGroupLabel('beans', 'en'), 'Premium Beans');
});

test('设备隔离：切换设备使用各自的标签分组配置', () => {
  const { api } = createRuntime();
  api.setCurrentDevice('DEV-A');
  api.setStoredGroup('beans', 'zh', '设备 A 豆');
  api.setCurrentDevice('DEV-B');
  api.setStoredGroup('beans', 'zh', '设备 B 豆');
  assert.strictEqual(api.getTagGroupLabel('beans', 'zh'), '设备 B 豆');
  api.setCurrentDevice('DEV-A');
  assert.strictEqual(api.getTagGroupLabel('beans', 'zh'), '设备 A 豆');
});

test('renderTagTree 输出包含每个分组的当前语种显示名', () => {
  const { api } = createRuntime();
  api.setCurrentDevice('RCK111');
  api.setCurrentLang('en');
  api.setDrawerActiveSpec('beans');
  api.renderTagTree();
  const tree = api.getDocument().getElementById('tagTree');
  assert.ok(tree.innerHTML.includes('Coffee Beans'), '英文标签分组应使用英文名');
  assert.ok(tree.innerHTML.includes('Temperature'), '温度分组应使用英文名');
  assert.ok(tree.innerHTML.includes('Latte Art'), '拉花分组应使用英文名');
});

test('保存分组名称后 renderTagTree 立即返回新名', () => {
  const { api } = createRuntime();
  api.setCurrentDevice('RCK111');
  api.setCurrentLang('zh');
  api.setDrawerActiveSpec('beans');
  api.setStoredGroup('beans', 'zh', '黑豆精选');
  api.renderTagTree();
  const tree = api.getDocument().getElementById('tagTree');
  assert.ok(tree.innerHTML.includes('黑豆精选'), 'tag-tree 应显示更新后的中文分组名');
  assert.ok(!tree.innerHTML.includes('咖啡豆'), 'tag-tree 不应再显示默认中文分组名');
});

test('renderTagGroupManageBody 为每个分组每种语种渲染输入框', () => {
  const { api } = createRuntime({
    deviceLanguageConfig_RCK111: JSON.stringify({
      langs: ['zh', 'en'],
      hiddenLangs: [],
      langNames: { zh: '中文', en: 'English' }
    })
  });
  api.setCurrentDevice('RCK111');
  api.renderTagGroupManageBody();
  const body = api.getDocument().getElementById('tagGroupManageBody');
  api.tagConfigs.forEach(cfg => {
    assert.ok(
      body.innerHTML.includes(`data-spec-key="${cfg.specKey}"`),
      `应渲染 ${cfg.specKey} 的输入项`
    );
  });
  const inputCount = (body.innerHTML.match(/class="form-input tag-group-manage-input"/g) || []).length;
  assert.strictEqual(inputCount, api.tagConfigs.length * 2, '应渲染 8 分组 × 2 语种 = 16 个输入');
});

test('saveTagGroupManageModal 把表单值写入存储', () => {
  const { api, storage } = createRuntime({
    deviceLanguageConfig_RCK111: JSON.stringify({
      langs: ['zh', 'en'],
      hiddenLangs: [],
      langNames: { zh: '中文', en: 'English' }
    })
  });
  api.setCurrentDevice('RCK111');
  api.setProductData({ id: 1, names: { zh: '商品' }, tagI18n: {}, defaultOptions: {}, tagExtraPrices: {}, specs: {} });

  // mock body.querySelectorAll to return fake input nodes
  const body = api.getDocument().getElementById('tagGroupManageBody');
  body.querySelectorAll = function () {
    return [
      { dataset: { specKey: 'beans', lang: 'zh' }, value: '黑豆' },
      { dataset: { specKey: 'beans', lang: 'en' }, value: 'Beans' },
      { dataset: { specKey: 'temperature', lang: 'zh' }, value: '温度' },
      { dataset: { specKey: 'temperature', lang: 'en' }, value: 'Temperature' }
    ];
  };
  api.setDrawerActiveSpec('beans');
  api.saveTagGroupManageModal();

  const stored = JSON.parse(storage.tagGroupI18n_RCK111 || '{}');
  assert.strictEqual(stored.beans?.zh, '黑豆');
  assert.strictEqual(stored.beans?.en, 'Beans');
  assert.strictEqual(stored.temperature?.zh, '温度');
});

test('refreshOptionTitles 在缺少 DOM 卡片时优雅退出（不抛错）', () => {
  const { api } = createRuntime();
  api.setCurrentDevice('RCK111');
  // option-card list lookup returns no `.closest('.option-card')` (default stub).
  // Should silently no-op without throwing.
  api.refreshOptionTitles();
});
