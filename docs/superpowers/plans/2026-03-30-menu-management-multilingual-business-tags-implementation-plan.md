# Menu Management Multilingual Business Tags Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade 商品管理业务标签 to a multilingual global library managed from `基本设置`, while product editing supports ordered tag binding, inline tag creation, hidden-tag semantics, and deterministic save/rollback behavior.

**Architecture:** Extract one shared business-tag domain helper so `menu-management.html` and `product-detail.html` stop duplicating normalization, label fallback, hidden filtering, ID generation, and merge rules. Implement the compact `业务标签管理` card and right-side drawer in `menu-management.html`, then upgrade `product-detail.html` to use the same helper plus a page-local `TagProductSaveCoordinator.commit(...)` contract so inline tag creation and product save behave like one atomic user action.

**Tech Stack:** Static HTML pages, inline browser JavaScript, shared browser script, `localStorage`/`sessionStorage`, Node-based regex/runtime tests

---

## File Map

- Create: `shared/business-tag-library.js`
  Purpose: Canonical business-tag domain helper for normalization, fallback labels, hidden filtering, merge rules, ID generation, multilingual patching, and device-language-context validation.

- Modify: `menu-management.html`
  Purpose: Import the shared helper, add the compact `业务标签管理` card inside `基本设置`, add the management drawer, switch all 商品管理/点单屏 tag rendering to shared helpers, and make `saveMenuBasicSettings()` snapshot + rollback tag-library changes.

- Modify: `product-detail.html`
  Purpose: Import the shared helper, replace prompt-based tag creation/editing with multilingual inline editing, validate device-language context, preserve hidden IDs on save, materialize legacy `featured` fallback on first save, and coordinate tag-library + product persistence through `TagProductSaveCoordinator.commit(...)`.

- Create: `tests/shared.business-tag-library.runtime.test.js`
  Purpose: Pure runtime contract coverage for shared helper behavior.

- Modify: `tests/menu-management.behavior.test.js`
  Purpose: Load the shared helper in the runtime harness and cover the settings card, drawer scaffolding, hidden-tag rendering, rollback behavior, and compatibility materialization from the 商品管理 side.

- Create: `tests/product-detail.business-tags.runtime.test.js`
  Purpose: Runtime coverage for multilingual tag editing, invalid device-language config handling, inline create, hidden-ID merge, and save coordinator outcomes.

- Modify: `tests/product-detail.device-language-config.test.js`
  Purpose: Extend current device-language coverage to the new tag-edit validity rules.

- Modify: `tests/product-detail.pricing.test.js`
  Purpose: Keep the existing `businessTagIds` persistence contract and add the first-save `featured` materialization expectation.

- Modify: `tests/shared.admin-mock-data.test.js`
  Purpose: Keep shared mock defaults aligned with the new business-tag helper and compatibility fixtures.

## Chunk 1: Shared Tag Domain Contract

### Task 1: Create the shared business-tag helper and lock its contracts with pure runtime tests

**Files:**
- Create: `shared/business-tag-library.js`
- Create: `tests/shared.business-tag-library.runtime.test.js`
- Modify: `tests/shared.admin-mock-data.test.js`
- Test: `tests/shared.business-tag-library.runtime.test.js`

- [ ] **Step 1: Write the failing shared runtime tests**

Create `tests/shared.business-tag-library.runtime.test.js` with focused tests like:

```js
test('normalizeBusinessTagEntry should normalize disabled to hidden', () => {
  const tag = api.normalizeBusinessTagEntry('tag_hidden', {
    names: { zh: '隐藏标签' },
    status: 'disabled'
  });
  assert.strictEqual(tag.status, 'hidden');
});

test('resolveTagLabel should fallback displayLang -> zh -> en -> id', () => {
  assert.strictEqual(
    api.resolveTagLabel({ id: 'tag_new', names: { en: 'New' } }, 'jp'),
    'New'
  );
});

test('mergeProductTagIds should keep hidden ids after reordered active ids', () => {
  const merged = api.mergeProductTagIds(
    ['tag_hidden_a', 'tag_signature', 'tag_hidden_b', 'tag_new'],
    ['tag_new', 'tag_signature'],
    {
      tag_signature: { id: 'tag_signature', status: 'active', names: { zh: '招牌' } },
      tag_new: { id: 'tag_new', status: 'active', names: { zh: '新品' } },
      tag_hidden_a: { id: 'tag_hidden_a', status: 'hidden', names: { zh: '旧隐藏A' } },
      tag_hidden_b: { id: 'tag_hidden_b', status: 'hidden', names: { zh: '旧隐藏B' } }
    }
  );
  assert.deepStrictEqual(merged, ['tag_new', 'tag_signature', 'tag_hidden_a', 'tag_hidden_b']);
});

test('generateBusinessTagId should slugify, fallback to tag_custom, and suffix collisions', () => {
  assert.strictEqual(api.generateBusinessTagId('!!!', {}), 'tag_custom');
  assert.strictEqual(
    api.generateBusinessTagId('Breakfast', { tag_breakfast: { id: 'tag_breakfast' } }),
    'tag_breakfast_2'
  );
});

test('validateDeviceTagLanguageContext should reject empty visible language sets', () => {
  const result = api.validateDeviceTagLanguageContext({
    langs: [],
    hiddenLangs: []
  });
  assert.strictEqual(result.ok, false);
});
```

- [ ] **Step 2: Run the shared runtime test to verify RED**

Run: `node tests/shared.business-tag-library.runtime.test.js`

Expected: FAIL because `shared/business-tag-library.js` does not exist yet.

- [ ] **Step 3: Implement the shared helper as one browser-global API**

Create `shared/business-tag-library.js` and expose a single global namespace:

```js
(function initBusinessTagLibrary(root) {
  const api = {
    normalizeBusinessTagIds,
    normalizeBusinessTagEntry,
    normalizeBusinessTagLibrary,
    resolveTagLabel,
    isTagRenderable,
    getRenderableProductTags,
    mergeProductTagIds,
    generateBusinessTagId,
    upsertBusinessTag,
    validateDeviceTagLanguageContext
  };
  root.CofeBusinessTags = api;
})(typeof window !== 'undefined' ? window : globalThis);
```

Implementation rules:
- normalize `status: 'disabled'` to `'hidden'`
- normalize unknown status to `'active'`
- `resolveTagLabel(tag, displayLang)` must fallback to `displayLang`, then `zh`, then `en`, then `tag.id`
- `isTagRenderable(tag)` must return `true` only for `status === 'active'`
- `getRenderableProductTags(product, library, displayLang)` must preserve tag order and filter hidden tags
- `mergeProductTagIds(existingIds, editedVisibleIds, library)` must preserve hidden IDs and unknown stored IDs behind active IDs
- `generateBusinessTagId(primaryLabel, library)` must output `tag_<slug>` with empty-slug fallback to `tag_custom`
- `upsertBusinessTag(existing, tagId, visibleLangPatch, status)` must preserve unseen languages and only mutate visible languages
- `validateDeviceTagLanguageContext({ langs, hiddenLangs })` must derive the primary language from the first normalized visible language and return `{ ok, value?, message? }`

- [ ] **Step 4: Keep shared fixtures aligned with the helper contract**

Update `tests/shared.admin-mock-data.test.js` so it loads `shared/business-tag-library.js` beside `shared/admin-mock-data.js` and adds one compatibility assertion:

```js
assert.strictEqual(api.normalizeBusinessTagEntry('tag_hidden', data.defaultBusinessTags.tag_hidden).status, 'hidden');
```

Do not remove the legacy `status: 'disabled'` fixture from `shared/admin-mock-data.js`; keep it as the compatibility input.

- [ ] **Step 5: Run the shared tests to verify GREEN**

Run:
- `node tests/shared.business-tag-library.runtime.test.js`
- `node tests/shared.admin-mock-data.test.js`

Expected: PASS

- [ ] **Step 6: Commit the shared contract checkpoint**

```bash
git add shared/business-tag-library.js tests/shared.business-tag-library.runtime.test.js tests/shared.admin-mock-data.test.js
git commit -m "feat: add shared multilingual business tag helper"
```

## Chunk 2: Menu Management Settings Card And Render Pipeline

### Task 2: Add the compact `业务标签管理` settings card, drawer, and shared render behavior in 商品管理

**Files:**
- Modify: `menu-management.html`
- Modify: `tests/menu-management.behavior.test.js`
- Test: `tests/menu-management.behavior.test.js`

- [ ] **Step 1: Update the menu-management test harness to load the new shared helper**

In `tests/menu-management.behavior.test.js`, extend `loadMenuContext()` to read and execute `shared/business-tag-library.js` before the page inline script:

```js
const businessTagHelperPath = path.join(__dirname, '..', 'shared', 'business-tag-library.js');
const businessTagHelperScript = fs.readFileSync(businessTagHelperPath, 'utf8');
vm.runInContext(sharedScript, context);
vm.runInContext(businessTagHelperScript, context);
vm.runInContext(script, context);
```

- [ ] **Step 2: Add failing settings-card and drawer assertions**

Add tests that assert:

```js
assert.ok(html.includes('业务标签管理'));
assert.ok(html.includes('管理标签'));
assert.ok(html.includes('启用中'));
assert.ok(html.includes('已隐藏'));
assert.ok(!html.includes('设备语言数'));
assert.ok(!html.includes('最近更新'));
assert.ok(/businessTagManagerDrawer/.test(html));
```

Add one runtime test that seeds the library with active + hidden tags and asserts the summary only counts active/hidden records.

- [ ] **Step 3: Add failing runtime tests for shared render behavior and settings rollback**

Add runtime tests shaped like:

```js
test('菜单管理渲染应忽略 hidden 标签并保留 active 顺序', () => {
  const ctx = loadMenuContext();
  ctx.localStorage.setItem('menuBusinessTagLibrary', JSON.stringify({
    tag_signature: { id: 'tag_signature', names: { zh: '招牌' }, status: 'active' },
    tag_hidden: { id: 'tag_hidden', names: { zh: '隐藏' }, status: 'hidden' }
  }));
  const html = ctx.renderBusinessTagList({ businessTagIds: ['tag_signature', 'tag_hidden'] }, 'zh');
  assert.ok(html.includes('招牌'));
  assert.ok(!html.includes('隐藏'));
});

test('保存基础设置失败时应回滚标签库快照并保持抽屉打开', () => {
  const ctx = loadMenuContext();
  ctx.persistMenuBasicSettings = () => { throw new Error('boom'); };
  // seed a draft tag-library mutation, then assert storage and in-memory snapshots are restored
});

test('设备语言配置无可见语言时，基本设置标签编辑应进入阻断态', () => {
  const ctx = loadMenuContext();
  ctx.deviceConfig.RCK111.langs = [];
  ctx.openBusinessTagManagerDrawer();
  assert.strictEqual(ctx.document.getElementById('businessTagManagerDrawer').dataset.configState, 'invalid');
});

test('设备语言配置无可见语言时，保存基础设置不应写入任何标签改动', () => {
  const ctx = loadMenuContext();
  ctx.deviceConfig.RCK111.langs = [];
  ctx.openBusinessTagManagerDrawer();
  const before = ctx.localStorage.getItem('menuBusinessTagLibrary');
  assert.strictEqual(ctx.saveMenuBasicSettings(), false);
  assert.strictEqual(ctx.localStorage.getItem('menuBusinessTagLibrary'), before);
});
```

- [ ] **Step 4: Run the menu-management behavior test to verify RED**

Run: `node tests/menu-management.behavior.test.js`

Expected: FAIL because the settings card, drawer, shared helper import, and rollback behavior are not implemented yet.

- [ ] **Step 5: Import the shared helper and replace local tag helpers with shared wrappers**

In `menu-management.html`, add:

```html
<script src="shared/admin-mock-data.js"></script>
<script src="shared/business-tag-library.js"></script>
<script>
```

Replace page-local business-tag helpers so they delegate to `window.CofeBusinessTags`:

```js
const BusinessTags = window.CofeBusinessTags;

function getBusinessTagLibrary() {
  return BusinessTags.normalizeBusinessTagLibrary({
    ...sharedAdminMockData.defaultBusinessTags,
    ...getStoredBusinessTagLibrary()
  });
}

function getRenderableProductBusinessTags(product, lang) {
  return BusinessTags.getRenderableProductTags(product, getBusinessTagLibrary(), lang);
}
```

Remove duplicated fallback logic where possible; keep the page wrappers small and page-specific.

- [ ] **Step 6: Build the compact settings card and right-side drawer**

In `menu-management.html`, replace the old static `业务标签` placeholder card with:

```html
<section class="settings-card settings-card-compact" id="businessTagSettingsCard">
  <div class="settings-card-head">
    <div>
      <h3 class="settings-title">业务标签管理</h3>
      <p class="settings-desc">统一维护商品标签的多语言名称与显示状态</p>
    </div>
    <button type="button" class="btn btn-default" onclick="openBusinessTagManagerDrawer()">管理标签</button>
  </div>
  <div class="settings-inline-stats" id="businessTagSettingsSummary"></div>
</section>
```

Add a drawer scaffold with separate enabled and hidden lists, plus create/edit/hide/restore actions. Keep the settings card itself visually short; do not inline the full list into the page.

Inside the drawer:
- create/edit forms must render one input per current device visible language
- the required language is the first normalized visible language returned by the shared language-context validator
- if the current device has no valid visible language context, show a blocking config-error state instead of an editable form

- [ ] **Step 7: Make `saveMenuBasicSettings()` snapshot and rollback the tag-library state**

Update `saveMenuBasicSettings()` so it stages:

```js
const previousSettings = cloneMenuBasicSettings(menuBasicSettings);
const previousOrderContact = ensureDeviceOrderContactConfig(currentDevice);
const previousLibrary = getBusinessTagLibrary();
const languageContext = BusinessTags.validateDeviceTagLanguageContext(ensureDeviceLanguageConfig(currentDevice));
const nextLibrary = collectBusinessTagLibraryDraft();
```

Then persist in this order:

```js
persistMenuBasicSettings();
persistDeviceOrderContactConfig(currentDevice, orderContactValidation.value);
persistBusinessTagLibrary(nextLibrary);
```

If any write throws:
- restore the previous settings snapshot
- restore the previous order-contact snapshot
- restore the previous tag-library snapshot
- keep the drawer open
- show one retryable error toast

If tag-library validation fails before persistence:
- do not persist menu settings
- do not persist order-contact changes
- do not persist tag-library changes
- keep the drawer open and show validation feedback

Treat an invalid drawer language context exactly the same way:
- `saveMenuBasicSettings()` must return `false`
- no write helpers may run
- the drawer stays open in its blocking config-error state

- [ ] **Step 8: Switch all 商品管理 and 点单屏 tag rendering to the shared pipeline**

Update every menu-management surface that renders business tags to use:

```js
const tags = BusinessTags.getRenderableProductTags(product, getBusinessTagLibrary(), lang);
const label = BusinessTags.resolveTagLabel(tag, lang);
```

Cover:
- 菜单管理商品卡
- 商品详情跳转前的摘要
- 点单屏商品卡
- 点单屏商品详情

- [ ] **Step 9: Run the menu-management behavior test to verify GREEN**

Run: `node tests/menu-management.behavior.test.js`

Expected: PASS, including:
- compact settings-card assertions
- drawer scaffolding assertions
- hidden-tag render filtering
- rollback behavior for `saveMenuBasicSettings()`

- [ ] **Step 10: Commit the 商品管理 implementation**

```bash
git add menu-management.html tests/menu-management.behavior.test.js
git commit -m "feat: add multilingual business tag settings management"
```

## Chunk 3: Product Detail Multilingual Editing And Atomic Save

### Task 3: Upgrade product-detail tag editing to multilingual inline create plus coordinated save

**Files:**
- Modify: `product-detail.html`
- Create: `tests/product-detail.business-tags.runtime.test.js`
- Modify: `tests/product-detail.device-language-config.test.js`
- Modify: `tests/product-detail.pricing.test.js`
- Test: `tests/product-detail.business-tags.runtime.test.js`

- [ ] **Step 1: Write the failing product-detail runtime tests**

Create `tests/product-detail.business-tags.runtime.test.js` with coverage like:

```js
test('inline 新建标签 should require the current device primary language', () => {
  const runtime = createRuntimeWithTagEditor({
    deviceLanguageConfig_RCK111: JSON.stringify({
      langs: ['zh', 'en'],
      hiddenLangs: [],
      langNames: { zh: '中文', en: 'English' }
    })
  });
  runtime.openBusinessTagDraft();
  runtime.setBusinessTagDraftValue('zh', '');
  const result = runtime.saveBusinessTagDraft();
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.status, 'validation_failed');
});

test('invalid device language config should disable inline 新建标签', () => {
  const runtime = createRuntimeWithTagEditor({
    deviceLanguageConfig_RCK111: JSON.stringify({
      langs: [],
      hiddenLangs: [],
      langNames: {}
    })
  });
  assert.strictEqual(runtime.canCreateBusinessTag(), false);
});

test('saveProduct should preserve hidden ids after visible reorder', () => {
  const result = runtime.mergeAndSaveBusinessTags(
    ['tag_hidden', 'tag_signature', 'tag_new'],
    ['tag_new', 'tag_signature']
  );
  assert.deepStrictEqual(result.businessTagIds, ['tag_new', 'tag_signature', 'tag_hidden']);
});

test('first save of a legacy featured product should materialize tag_signature into businessTagIds', () => {
  const result = runtime.saveLegacyFeaturedProduct({
    featured: true,
    businessTagIds: []
  });
  assert.deepStrictEqual(result.businessTagIds, ['tag_signature']);
});

test('TagProductSaveCoordinator should rollback tag library when product persistence fails', () => {
  const result = runtime.commitTagAndProductSaveWithInjectedFailure('product');
  assert.strictEqual(result.status, 'rolled_back');
});

test('product save should re-resolve the current library if a tag becomes hidden while the editor is open', () => {
  const result = runtime.hideTagBeforeSaveAndCommit('tag_signature');
  assert.ok(!result.visibleLabels.includes('招牌'));
});
```

- [ ] **Step 2: Extend existing device-language and pricing regression tests first**

In `tests/product-detail.device-language-config.test.js`, add assertions that zero visible device languages returns a blocking validation result for tag editing.

In `tests/product-detail.pricing.test.js`, keep the existing persistence contract but update the assertion to point at the merged tag-ID result:

```js
assert.ok(/mergeProductTagIds\(/.test(html));
assert.ok(/businessTagIds:\s*mergedBusinessTagIds/.test(html));
```

- [ ] **Step 3: Run the product-detail tests to verify RED**

Run:
- `node tests/product-detail.business-tags.runtime.test.js`
- `node tests/product-detail.device-language-config.test.js`
- `node tests/product-detail.pricing.test.js`

Expected: FAIL because the page still uses prompt-based tag editing, has no shared helper import, and does not coordinate tag-library + product saves.

- [ ] **Step 4: Import the shared helper and replace prompt-based tag editing with a multilingual draft form**

In `product-detail.html`, add:

```html
<script src="shared/admin-mock-data.js"></script>
<script src="shared/business-tag-library.js"></script>
<script>
```

Replace `createBusinessTag()` / `editBusinessTag()` prompt flows with draft state such as:

```js
let businessTagDraft = null;

function openBusinessTagDraft(mode, tagId = '') {
  const langContext = getBusinessTagLanguageContext();
  if (!langContext.ok) return showToast(langContext.message, 'error');
  businessTagDraft = {
    mode,
    tagId,
    names: {},
    status: 'active'
  };
  renderProductBusinessTagEditor();
}
```

Use the current device enabled languages as visible fields. Require the current device primary language field; keep other visible languages optional.
Derive the required language from the first normalized visible language returned by `BusinessTags.validateDeviceTagLanguageContext(...)`; do not add a separate persisted `primaryLang` field.

- [ ] **Step 5: Add one page-local save coordinator with the canonical spec name**

In `product-detail.html`, define:

```js
const TagProductSaveCoordinator = {
  commit({ previousLibrary, nextLibrary, previousProduct, nextProduct }) {
    try {
      persistBusinessTagLibrary(nextLibrary);
      persistEditedProduct(nextProduct);
      return { ok: true, status: 'committed' };
    } catch (error) {
      try {
        persistBusinessTagLibrary(previousLibrary);
        persistEditedProduct(previousProduct);
        return { ok: false, status: 'rolled_back', retryable: true };
      } catch (rollbackError) {
        return { ok: false, status: 'partial_rollback_failure', retryable: false };
      }
    }
  }
};
```

Do not add a second alias like `commitTagAndProductSave`.

- [ ] **Step 6: Update `saveProduct()` to use helper merge rules and first-save materialization**

Before persistence:
- compute `existingIds = getProductBusinessTagIds(productData)`
- compute `nextVisibleIds = BusinessTags.normalizeBusinessTagIds(selectedBusinessTagIds)`
- compute `currentLibrary = getBusinessTagLibrary()` immediately at save time, not from editor-open state
- compute `mergedBusinessTagIds = BusinessTags.mergeProductTagIds(existingIds, nextVisibleIds, currentLibrary)`

If there is an inline-created or edited draft:
- validate the device-language context
- generate the new ID through `BusinessTags.generateBusinessTagId(primaryLabel, library)` when mode is create
- update the next library through `BusinessTags.upsertBusinessTag(...)`
- only append the new tag ID to the visible order if the draft save path is valid

If the current library differs from the editor-open snapshot because a tag was hidden or restored while the product editor stayed open:
- re-render the selected and available tag lists from `currentLibrary` before commit
- prevent newly hidden tags from staying visible/selectable
- commit against `currentLibrary`, not stale cached library data

Persist via `TagProductSaveCoordinator.commit(...)`, not by writing the tag library separately before product persistence.

After preparing `mergedBusinessTagIds`, assign:

```js
updatedProduct.businessTagIds = mergedBusinessTagIds;
```

This makes the first save of a legacy `featured === true` product materialize `['tag_signature']` into explicit `businessTagIds` automatically.

- [ ] **Step 7: Implement the blocking `partial_rollback_failure` UI state**

When `TagProductSaveCoordinator.commit(...)` returns `partial_rollback_failure`:
- keep the current modal/draft open
- show a blocking error
- disable Save, Retry, inline `新建标签`, and form edits
- require the user to refresh the page or close/reopen the drawer/modal before editing again

Represent the blocked state in DOM so runtime tests can assert it, for example:

```js
document.getElementById('productBusinessTagEditorModal').dataset.saveState = 'blocked';
```

- [ ] **Step 8: Run the product-detail test suite to verify GREEN**

Run:
- `node tests/product-detail.business-tags.runtime.test.js`
- `node tests/product-detail.device-language-config.test.js`
- `node tests/product-detail.pricing.test.js`

Expected: PASS

- [ ] **Step 9: Commit the product-detail implementation**

```bash
git add product-detail.html tests/product-detail.business-tags.runtime.test.js tests/product-detail.device-language-config.test.js tests/product-detail.pricing.test.js
git commit -m "feat: add multilingual product business tag editing"
```

## Chunk 4: Cross-Surface Regression And Manual QA

### Task 4: Re-run the focused regression suite and verify the user-visible flow end to end

**Files:**
- Verify: `shared/business-tag-library.js`
- Verify: `menu-management.html`
- Verify: `product-detail.html`
- Verify: `tests/shared.business-tag-library.runtime.test.js`
- Verify: `tests/menu-management.behavior.test.js`
- Verify: `tests/product-detail.business-tags.runtime.test.js`
- Verify: `tests/product-detail.device-language-config.test.js`
- Verify: `tests/product-detail.pricing.test.js`
- Verify: `tests/shared.admin-mock-data.test.js`
- Verify: `tests/legacy-featured-cleanup.test.js`

- [ ] **Step 1: Run the complete focused regression suite**

Run:

```bash
node tests/shared.business-tag-library.runtime.test.js
node tests/shared.admin-mock-data.test.js
node tests/menu-management.behavior.test.js
node tests/product-detail.business-tags.runtime.test.js
node tests/product-detail.device-language-config.test.js
node tests/product-detail.pricing.test.js
node tests/legacy-featured-cleanup.test.js
```

Expected: all PASS

- [ ] **Step 2: Manually verify the `基本设置` compact card and drawer**

Open `menu-management.html` and confirm:
- `基本设置` only shows the short `业务标签管理` card, not a long inline list
- the card only shows `启用中` and `已隐藏`
- clicking `管理标签` opens the right-side drawer
- hiding a tag removes it from the enabled list and moves it to hidden
- restoring a tag returns it to the enabled list

- [ ] **Step 3: Manually verify product editing and cross-surface propagation**

Open one product in `product-detail.html` and confirm:
- existing tags render in the stored order
- `新建标签` shows multilingual inputs for the current device enabled languages
- missing primary-language content blocks save
- saving a new tag both stores it in the library and appends it to the current product
- returning to 商品管理 shows the active tags on 商品卡片
- 点单屏预览和详情都 ignore hidden tags immediately
- restoring a hidden tag makes already-bound products show it again without rebinding

- [ ] **Step 4: Commit the verification checkpoint**

```bash
git add shared/business-tag-library.js menu-management.html product-detail.html tests/shared.business-tag-library.runtime.test.js tests/shared.admin-mock-data.test.js tests/menu-management.behavior.test.js tests/product-detail.business-tags.runtime.test.js tests/product-detail.device-language-config.test.js tests/product-detail.pricing.test.js tests/legacy-featured-cleanup.test.js
git commit -m "test: verify multilingual business tag management flow"
```
