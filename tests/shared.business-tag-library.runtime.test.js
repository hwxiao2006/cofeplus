const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadBusinessTagApi() {
  const helperPath = path.join(__dirname, '..', 'shared', 'business-tag-library.js');
  const helperScript = fs.readFileSync(helperPath, 'utf8');
  const context = {
    window: {},
    globalThis: {}
  };
  vm.createContext(context);
  vm.runInContext(helperScript, context);
  return context.window.CofeBusinessTags || context.globalThis.CofeBusinessTags || context.CofeBusinessTags;
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

test('normalizeBusinessTagEntry should normalize disabled to hidden', () => {
  const api = loadBusinessTagApi();
  const tag = api.normalizeBusinessTagEntry('tag_hidden', {
    names: { zh: '隐藏标签' },
    status: 'disabled'
  });
  assert.strictEqual(tag.status, 'hidden');
});

test('resolveTagLabel should fallback displayLang -> zh -> en -> id', () => {
  const api = loadBusinessTagApi();
  assert.strictEqual(
    api.resolveTagLabel({ id: 'tag_new', names: { en: 'New' } }, 'jp'),
    'New'
  );
  assert.strictEqual(
    api.resolveTagLabel({ id: 'tag_signature', names: {} }, 'zh'),
    'tag_signature'
  );
});

test('getRenderableProductTags should preserve order and filter hidden tags', () => {
  const api = loadBusinessTagApi();
  const tags = api.getRenderableProductTags({
    businessTagIds: ['tag_hidden', 'tag_signature', 'tag_new']
  }, {
    tag_signature: { id: 'tag_signature', status: 'active', names: { zh: '招牌' } },
    tag_new: { id: 'tag_new', status: 'active', names: { zh: '新品' } },
    tag_hidden: { id: 'tag_hidden', status: 'hidden', names: { zh: '隐藏' } }
  }, 'zh');

  assert.deepStrictEqual(
    Array.from(tags, tag => tag.id),
    ['tag_signature', 'tag_new']
  );
});

test('mergeProductTagIds should keep hidden and unknown ids after reordered active ids', () => {
  const api = loadBusinessTagApi();
  const merged = api.mergeProductTagIds(
    ['tag_hidden_a', 'tag_signature', 'tag_unknown', 'tag_hidden_b', 'tag_new'],
    ['tag_new', 'tag_signature', 'tag_signature', 'tag_missing'],
    {
      tag_signature: { id: 'tag_signature', status: 'active', names: { zh: '招牌' } },
      tag_new: { id: 'tag_new', status: 'active', names: { zh: '新品' } },
      tag_hidden_a: { id: 'tag_hidden_a', status: 'hidden', names: { zh: '旧隐藏A' } },
      tag_hidden_b: { id: 'tag_hidden_b', status: 'hidden', names: { zh: '旧隐藏B' } }
    }
  );
  assert.deepStrictEqual(
    Array.from(merged),
    ['tag_new', 'tag_signature', 'tag_hidden_a', 'tag_hidden_b', 'tag_unknown']
  );
});

test('generateBusinessTagId should slugify, fallback to tag_custom, and suffix collisions', () => {
  const api = loadBusinessTagApi();
  assert.strictEqual(api.generateBusinessTagId('!!!', {}), 'tag_custom');
  assert.strictEqual(api.generateBusinessTagId('Breakfast', {}), 'tag_breakfast');
  assert.strictEqual(
    api.generateBusinessTagId('Breakfast', { tag_breakfast: { id: 'tag_breakfast' } }),
    'tag_breakfast_2'
  );
});

test('upsertBusinessTag should preserve unseen translations and remove blank optional visible fields', () => {
  const api = loadBusinessTagApi();
  const next = api.upsertBusinessTag(
    {
      id: 'tag_signature',
      names: { zh: '招牌', en: 'Signature', jp: 'シグネチャー' },
      status: 'active'
    },
    'tag_signature',
    { zh: '招牌推荐', en: '' },
    'hidden'
  );

  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(next.names)),
    {
      zh: '招牌推荐',
      jp: 'シグネチャー'
    }
  );
  assert.strictEqual(next.status, 'hidden');
});

test('validateDeviceTagLanguageContext should reject empty visible language sets', () => {
  const api = loadBusinessTagApi();
  const invalid = api.validateDeviceTagLanguageContext({
    langs: [],
    hiddenLangs: []
  });
  assert.strictEqual(invalid.ok, false);

  const valid = api.validateDeviceTagLanguageContext({
    langs: ['zh', 'en', 'zh', ''],
    hiddenLangs: ['en']
  });
  assert.strictEqual(valid.ok, true);
  assert.deepStrictEqual(Array.from(valid.value.langs), ['zh']);
  assert.strictEqual(valid.value.primaryLang, 'zh');
});
