const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadDeviceLatteArtApi() {
  const helperPath = path.join(__dirname, '..', 'shared', 'device-latte-art-library.js');
  const helperScript = fs.readFileSync(helperPath, 'utf8');
  const context = {
    window: {},
    globalThis: {}
  };
  vm.createContext(context);
  vm.runInContext(helperScript, context);
  return context.window.CofeDeviceLatteArtLibrary
    || context.globalThis.CofeDeviceLatteArtLibrary
    || context.CofeDeviceLatteArtLibrary;
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

test('normalizeLatteArtName should trim, collapse spaces, and compare case-insensitively', () => {
  const api = loadDeviceLatteArtApi();
  assert.strictEqual(api.normalizeLatteArtName('  Swan   Art  '), 'swan art');
  assert.strictEqual(api.normalizeLatteArtName('天鹅'), '天鹅');
});

test('normalizeDeviceLatteArtLibrary should recover from malformed input', () => {
  const api = loadDeviceLatteArtApi();
  const normalized = api.normalizeDeviceLatteArtLibrary({ items: 'bad' }, 'RCK386');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(normalized.items)), []);
});

test('device latte art helper should not expose rename api', () => {
  const api = loadDeviceLatteArtApi();
  assert.strictEqual(typeof api.renameDeviceLatteArtItem, 'undefined');
});

test('upsertDeviceLatteArtItem should overwrite same-name assets on one device', () => {
  const api = loadDeviceLatteArtApi();
  const next = api.upsertDeviceLatteArtItem({
    version: 1,
    items: [{ id: 'art_1', name: '天鹅', nameKey: '天鹅', image: 'old', sourceDeviceId: 'RCK386' }]
  }, {
    name: ' 天鹅 ',
    image: 'new',
    sourceDeviceId: 'RCK386'
  });

  assert.strictEqual(next.items.length, 1);
  assert.strictEqual(next.items[0].image, 'new');
});

test('copyLatteArtItemToLibrary should overwrite same-name target items and preserve unrelated names', () => {
  const api = loadDeviceLatteArtApi();
  const target = {
    version: 1,
    items: [
      { id: 'art_old', name: '天鹅', nameKey: '天鹅', image: 'old' },
      { id: 'art_other', name: '爱心', nameKey: '爱心', image: 'keep' }
    ]
  };
  const result = api.copyLatteArtItemToLibrary(target, {
    id: 'art_src',
    name: '天鹅',
    nameKey: '天鹅',
    image: 'fresh',
    sourceDeviceId: 'RCK386'
  }, 'RCK410');

  assert.strictEqual(result.library.items.length, 2);
  assert.strictEqual(result.action, 'overwritten');
  assert.strictEqual(result.library.items.find(item => item.nameKey === '爱心').image, 'keep');
});

test('buildLatteArtLinkageSummary should count linked, unreferenced, and missing names', () => {
  const api = loadDeviceLatteArtApi();
  const summary = api.buildLatteArtLinkageSummary({
    productNames: ['天鹅', '爱心', '郁金香'],
    library: {
      version: 1,
      items: [
        { id: 'art_1', name: '天鹅', nameKey: '天鹅', image: '1' },
        { id: 'art_2', name: '随机图', nameKey: '随机图', image: '2' }
      ]
    }
  });

  assert.strictEqual(summary.linkedCount, 1);
  assert.strictEqual(summary.unreferencedCount, 1);
  assert.strictEqual(summary.missingMaterialCount, 2);
});

test('collectNormalizedProductLatteArtNames should read mixed option shapes from productsData', () => {
  const api = loadDeviceLatteArtApi();
  const names = api.collectNormalizedProductLatteArtNames({
    拉花: {
      items: [{
        options: {
          latteArt: ['天鹅', { label: '爱心' }, { value: '郁金香' }]
        }
      }]
    }
  });

  assert.deepStrictEqual(JSON.parse(JSON.stringify(names)).sort(), ['天鹅', '爱心', '郁金香'].sort());
});
