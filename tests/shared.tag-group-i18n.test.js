const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

function createMemoryStorage(seed = {}) {
  const data = { ...seed };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key, value) {
      data[key] = String(value);
    },
    removeItem(key) {
      delete data[key];
    },
    _data: data
  };
}

function loadModule(storage) {
  delete require.cache[require.resolve('../shared/tag-group-i18n.js')];
  global.localStorage = storage;
  return require('../shared/tag-group-i18n.js');
}

test('TagGroupI18n exposes 8 default spec keys with zh/en defaults', () => {
  const storage = createMemoryStorage();
  const TagGroupI18n = loadModule(storage);
  assert.deepStrictEqual(TagGroupI18n.SPEC_KEYS, [
    'beans', 'temperature', 'strength', 'syrup',
    'sweetness', 'cupsize', 'lid', 'latteArt'
  ]);
  assert.strictEqual(TagGroupI18n.TAG_GROUP_DEFAULT_NAMES.beans.zh, '咖啡豆');
  assert.strictEqual(TagGroupI18n.TAG_GROUP_DEFAULT_NAMES.beans.en, 'Coffee Beans');
  assert.strictEqual(TagGroupI18n.TAG_GROUP_DEFAULT_NAMES.latteArt.en, 'Latte Art');
});

test('getStorageKey returns prefix + deviceId, empty for blank', () => {
  const storage = createMemoryStorage();
  const TagGroupI18n = loadModule(storage);
  assert.strictEqual(TagGroupI18n.getStorageKey('DEV-001'), 'tagGroupI18n_DEV-001');
  assert.strictEqual(TagGroupI18n.getStorageKey('  DEV-002 '), 'tagGroupI18n_DEV-002');
  assert.strictEqual(TagGroupI18n.getStorageKey(''), '');
  assert.strictEqual(TagGroupI18n.getStorageKey(null), '');
  assert.strictEqual(TagGroupI18n.getStorageKey(undefined), '');
});

test('readStored returns {} when nothing is saved', () => {
  const storage = createMemoryStorage();
  const TagGroupI18n = loadModule(storage);
  assert.deepStrictEqual(TagGroupI18n.readStored('DEV-001'), {});
});

test('writeStored + readStored round-trip preserves spec/lang map', () => {
  const storage = createMemoryStorage();
  const TagGroupI18n = loadModule(storage);
  const data = {
    beans: { zh: '咖啡豆精选', en: 'Premium Beans' },
    latteArt: { en: 'Latte Pattern' }
  };
  assert.strictEqual(TagGroupI18n.writeStored('DEV-X', data), true);
  assert.deepStrictEqual(TagGroupI18n.readStored('DEV-X'), data);
});

test('writeStored sanitizes blanks, empty specs, and non-object langs', () => {
  const storage = createMemoryStorage();
  const TagGroupI18n = loadModule(storage);
  TagGroupI18n.writeStored('DEV-Y', {
    beans: { zh: '  ', en: 'Beans' },
    temperature: null,
    strength: { en: ' ' },
    ' ': { zh: '空 key' },
    syrup: { '  ': 'Bad', en: 'Syrup' }
  });
  const stored = TagGroupI18n.readStored('DEV-Y');
  assert.deepStrictEqual(stored, {
    beans: { en: 'Beans' },
    syrup: { en: 'Syrup' }
  });
});

test('readStored tolerates malformed JSON', () => {
  const storage = createMemoryStorage({ 'tagGroupI18n_BAD': '{this is not json' });
  const TagGroupI18n = loadModule(storage);
  assert.deepStrictEqual(TagGroupI18n.readStored('BAD'), {});
});

test('getGroupLabel returns stored value when present', () => {
  const storage = createMemoryStorage();
  const TagGroupI18n = loadModule(storage);
  TagGroupI18n.writeStored('D1', { beans: { zh: '黑豆', en: 'Black' } });
  assert.strictEqual(TagGroupI18n.getGroupLabel('D1', 'beans', 'zh'), '黑豆');
  assert.strictEqual(TagGroupI18n.getGroupLabel('D1', 'beans', 'en'), 'Black');
});

test('getGroupLabel falls back to defaults when storage misses the lang', () => {
  const storage = createMemoryStorage();
  const TagGroupI18n = loadModule(storage);
  TagGroupI18n.writeStored('D1', { beans: { zh: '黑豆' } });
  assert.strictEqual(TagGroupI18n.getGroupLabel('D1', 'beans', 'en'), 'Coffee Beans');
});

test('getGroupLabel falls back to zh when neither stored nor default for that lang', () => {
  const storage = createMemoryStorage();
  const TagGroupI18n = loadModule(storage);
  TagGroupI18n.writeStored('D1', { beans: { zh: '只有中文', ja: '専門' } });
  assert.strictEqual(TagGroupI18n.getGroupLabel('D1', 'beans', 'fr'), '只有中文');
});

test('getGroupLabel falls back to specKey when nothing matches', () => {
  const storage = createMemoryStorage();
  const TagGroupI18n = loadModule(storage);
  assert.strictEqual(TagGroupI18n.getGroupLabel('D1', 'unknownSpec', 'zh'), 'unknownSpec');
});

test('getGroupLabel handles blank lang by falling back through default zh', () => {
  const storage = createMemoryStorage();
  const TagGroupI18n = loadModule(storage);
  assert.strictEqual(TagGroupI18n.getGroupLabel('D1', 'beans', ''), '咖啡豆');
});

test('getGroupLabel returns "" for blank specKey', () => {
  const storage = createMemoryStorage();
  const TagGroupI18n = loadModule(storage);
  assert.strictEqual(TagGroupI18n.getGroupLabel('D1', '', 'zh'), '');
});

test('device isolation: writing for D1 does not affect D2', () => {
  const storage = createMemoryStorage();
  const TagGroupI18n = loadModule(storage);
  TagGroupI18n.writeStored('D1', { beans: { zh: '一号设备豆' } });
  TagGroupI18n.writeStored('D2', { beans: { zh: '二号设备豆' } });
  assert.strictEqual(TagGroupI18n.getGroupLabel('D1', 'beans', 'zh'), '一号设备豆');
  assert.strictEqual(TagGroupI18n.getGroupLabel('D2', 'beans', 'zh'), '二号设备豆');
});

test('blank deviceId: read/write no-op without throwing', () => {
  const storage = createMemoryStorage();
  const TagGroupI18n = loadModule(storage);
  assert.strictEqual(TagGroupI18n.writeStored('', { beans: { zh: 'X' } }), false);
  assert.deepStrictEqual(TagGroupI18n.readStored(''), {});
});

test('getGroupLabels merges defaults under stored overrides', () => {
  const storage = createMemoryStorage();
  const TagGroupI18n = loadModule(storage);
  TagGroupI18n.writeStored('D1', { beans: { zh: '我的豆' } });
  const labels = TagGroupI18n.getGroupLabels('D1', 'beans');
  assert.strictEqual(labels.zh, '我的豆');
  assert.strictEqual(labels.en, 'Coffee Beans');
});

test('clear removes the device entry', () => {
  const storage = createMemoryStorage();
  const TagGroupI18n = loadModule(storage);
  TagGroupI18n.writeStored('D1', { beans: { zh: 'X' } });
  TagGroupI18n.clear('D1');
  assert.deepStrictEqual(TagGroupI18n.readStored('D1'), {});
});

test('normalize is idempotent and reusable on free-form input', () => {
  const storage = createMemoryStorage();
  const TagGroupI18n = loadModule(storage);
  const cleaned = TagGroupI18n.normalize({
    beans: { zh: '  豆  ', en: 'Beans' },
    bad: 'not an object',
    '': { zh: '空' }
  });
  assert.deepStrictEqual(cleaned, {
    beans: { zh: '豆', en: 'Beans' }
  });
});
