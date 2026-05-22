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
        appendChild(child) { this.children.push(child); return child; },
        contains() { return false; },
        addEventListener() {},
        classList: {
            add() {}, remove() {}, toggle() {}, contains() { return false; }
        },
        querySelector() { return null; },
        querySelectorAll() { return []; },
        closest() { return null; }
    };
}

function createRuntime() {
    const tagGroupHelperScript = fs.readFileSync(
        path.join(__dirname, '..', 'shared', 'tag-group-i18n.js'), 'utf8');
    const html = fs.readFileSync(
        path.join(__dirname, '..', 'product-detail.html'), 'utf8');
    const script = `${extractInlineScript(html)}
this.__test = {
  getDrawerTagDesc,
  getTagDesc,
  cloneTagDescs,
  hasTagDescChanged,
  setTagDescsForProduct,
  persistDrawerCurrentTag,
  setCurrentDevice(value) { currentDevice = value; },
  setDrawerActiveSpec(value) { drawerActiveSpecKey = value; },
  setDrawerSelectedTagKey(value) { drawerSelectedTagKey = value; },
  setProductData(value) { productData = value; },
  getProductData() { return productData; },
  getDocument: () => document
};`;

    const storage = {};
    const elements = {};
    function getOrCreate(id) {
        if (!elements[id]) elements[id] = createElement(id);
        return elements[id];
    }

    const context = {
        console,
        localStorage: {
            getItem(key) { return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null; },
            setItem(key, value) { storage[key] = String(value); },
            removeItem(key) { delete storage[key]; }
        },
        sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
        document: {
            getElementById: getOrCreate,
            querySelector() { return null; },
            querySelectorAll() { return []; },
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
        setTimeout() { return 1; },
        clearTimeout() {},
        confirm() { return true; },
        prompt() { return null; }
    };

    vm.runInNewContext(tagGroupHelperScript, context);
    context.TagGroupI18n = context.window.TagGroupI18n || context.TagGroupI18n;
    vm.runInNewContext(script, context);
    return { ctx: context, api: context.__test, storage, elements };
}

function test(name, fn) {
    try {
        fn();
        console.log(`PASS ${name}`);
    } catch (e) {
        console.error(`FAIL ${name}`);
        console.error(e.stack || e.message);
        process.exitCode = 1;
    }
}

function makeProduct(overrides = {}) {
    return {
        id: 1,
        names: { zh: '商品' },
        tagI18n: { beans: { geisha: { zh: '翡翠瑰夏' } } },
        defaultOptions: {},
        tagExtraPrices: {},
        specs: {},
        ...overrides
    };
}

test('setTagDescsForProduct 写入指定 spec/tag', () => {
    const { api } = createRuntime();
    api.setCurrentDevice('RCK111');
    const product = makeProduct();
    api.setTagDescsForProduct(product, 'beans', 'geisha', {
        zh: '巴拿马翡翠庄园',
        en: 'Panama Esmeralda'
    });
    assert.strictEqual(product.tagDescI18n.beans.geisha.zh, '巴拿马翡翠庄园');
    assert.strictEqual(product.tagDescI18n.beans.geisha.en, 'Panama Esmeralda');
});

test('getTagDesc 缺当前语种时回退到 zh / en', () => {
    const { api } = createRuntime();
    api.setCurrentDevice('RCK111');
    const product = makeProduct({ tagDescI18n: { beans: { geisha: { zh: '回退中文' } } } });
    assert.strictEqual(api.getTagDesc('beans', 'geisha', 'en', product), '回退中文');
});

test('hasTagDescChanged 在任一语种差异时返回 true', () => {
    const { api } = createRuntime();
    assert.strictEqual(api.hasTagDescChanged({ zh: 'a' }, { zh: 'a' }), false);
    assert.strictEqual(api.hasTagDescChanged({ zh: 'a' }, { zh: 'b' }), true);
    assert.strictEqual(api.hasTagDescChanged({ zh: 'a' }, {}), true);
    assert.strictEqual(api.hasTagDescChanged({}, { en: 'x' }), true);
});

test('persistDrawerCurrentTag 把描述 textarea 写到 productData.tagDescI18n', () => {
    const { api } = createRuntime();
    api.setCurrentDevice('RCK111');
    api.setDrawerActiveSpec('beans');
    api.setDrawerSelectedTagKey('geisha');
    api.setProductData(makeProduct({
        tagI18n: { beans: { geisha: { zh: '翡翠瑰夏' } } }
    }));

    const inputs = {
        '.drawer-tag-lang-zh': { value: '翡翠瑰夏' },
        '.drawer-tag-lang-en': { value: 'Geisha' },
        '.drawer-tag-desc-lang-zh': { value: '巴拿马翡翠庄园，花果香明显' },
        '.drawer-tag-desc-lang-en': { value: 'Panama Esmeralda, floral and fruity' }
    };
    api.getDocument().querySelector = function (sel) { return inputs[sel] || null; };

    // 让 getDeviceLangs 也能命中——deviceLanguageConfig fallback 应该返回 ['zh','en']
    api.persistDrawerCurrentTag();

    const product = api.getProductData();
    assert.strictEqual(product.tagDescI18n.beans.geisha.zh, '巴拿马翡翠庄园，花果香明显');
    assert.strictEqual(product.tagDescI18n.beans.geisha.en, 'Panama Esmeralda, floral and fruity');
});

test('setTagDescsForProduct 是覆盖式写入：传完整下一状态以保留 zh', () => {
    const { api } = createRuntime();
    const product = makeProduct({ tagDescI18n: { beans: { geisha: { zh: '中文', en: '英文' } } } });
    api.setTagDescsForProduct(product, 'beans', 'geisha', { zh: '中文', en: '' });
    assert.strictEqual(product.tagDescI18n.beans.geisha.zh, '中文');
    assert.ok(!product.tagDescI18n.beans.geisha.en, '传空字符串的语种被清除');
});

test('setTagDescsForProduct 所有语种都为空时移除该 tag 节点', () => {
    const { api } = createRuntime();
    const product = makeProduct({ tagDescI18n: { beans: { geisha: { zh: '中文' }, espresso: { zh: '意式' } } } });
    api.setTagDescsForProduct(product, 'beans', 'geisha', { zh: '', en: '' });
    assert.ok(!product.tagDescI18n.beans.geisha, '全部清空后 geisha 节点应消失');
    assert.strictEqual(product.tagDescI18n.beans.espresso.zh, '意式', '其它 tag 应保留');
});

test('setTagDescsForProduct 不影响其它 tagKey', () => {
    const { api } = createRuntime();
    const product = makeProduct({
        tagDescI18n: {
            beans: {
                geisha: { zh: '瑰夏原描述' },
                espresso: { zh: '意式原描述' }
            }
        }
    });
    api.setTagDescsForProduct(product, 'beans', 'geisha', { zh: '瑰夏新描述' });
    assert.strictEqual(product.tagDescI18n.beans.geisha.zh, '瑰夏新描述');
    assert.strictEqual(product.tagDescI18n.beans.espresso.zh, '意式原描述');
});
