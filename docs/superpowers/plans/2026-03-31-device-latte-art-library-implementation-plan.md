# Device Latte Art Library Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a device-scoped `设备拉花图库` to `devices.html` so operators can upload named latte art images per device, see linkage/missing-material status, and copy the saved asset to other devices with same-name overwrite semantics.

**Architecture:** Extract one shared latte-art domain helper so name normalization, per-device storage, linkage calculation, and copy merge rules live outside `devices.html`. Keep `devices.html` as the page-level orchestrator: render the new detail section, drive upload/rename/delete/copy modals, and reuse the existing device-picker interaction pattern already familiar from product copy flows.

**Tech Stack:** Static HTML/CSS with inline browser JavaScript, shared browser script, `localStorage`, Node-based regex/runtime tests

---

## File Map

- Create: `/Users/mac/Documents/New project 4/shared/device-latte-art-library.js`
  Purpose: Canonical latte-art helper for name normalization, library read/write normalization, per-device overwrite/add rules, linkage calculation, and copy impact summaries.

- Modify: `/Users/mac/Documents/New project 4/devices.html`
  Purpose: Import the shared helper, add the `设备拉花图库` section and status summary to the device detail modal, add upload/copy modals, and implement current-device CRUD plus cross-device copy orchestration.

- Modify: `/Users/mac/Documents/New project 4/tests/devices.entry-detail.test.js`
  Purpose: Lock the new section placement, helper copy, modal markup, and right-rail contract in static assertions.

- Create: `/Users/mac/Documents/New project 4/tests/shared.device-latte-art-library.runtime.test.js`
  Purpose: Pure runtime contract coverage for normalization, current-device overwrite, target-device copy merge, and linkage summary logic in the shared helper.

- Create: `/Users/mac/Documents/New project 4/tests/devices.latte-art-library.runtime.test.js`
  Purpose: Runtime coverage for `devices.html` orchestration: corrupted storage fallback, upload overwrite confirmation, rename/delete warnings, post-save copy prompt, target-device selection, and copy result rendering.

- Verify: `/Users/mac/Documents/New project 4/tests/devices.page-redesign.test.js`
  Purpose: Keep device-page layout regressions green after adding the new detail card.

- Verify: `/Users/mac/Documents/New project 4/tests/devices.device-scope.runtime.test.js`
  Purpose: Ensure scoped-device behavior still works after the detail modal grows a new card and state.

## Implementation Guardrails

- The repo is already dirty. Do not use `git add -A`, `git commit -a`, or any broad staging command.
- Do not revert the user's current `/Users/mac/Documents/New project 4/devices.html` changes while implementing this plan.
- Follow existing device-detail naming patterns:
  - render helpers should use `renderDetail<Feature>`
  - action openers should use `openDetail<Feature>`
  - modals should use `detail<Feature>Modal` IDs
- Keep the feature device-scoped. Do not add global latte-art management into `menu-management.html` in this plan.
- Reuse the shared mock product data already available in `devices.html` via `window.COFE_SHARED_MOCK_DATA`; do not invent a second product source.
- Treat latte-art names as linkage keys:
  - compare by normalized `nameKey`
  - display the operator-entered `name`
- Copy semantics must be:
  - same normalized name on target device -> overwrite image
  - missing normalized name on target device -> add
  - unrelated names on target device remain untouched
- Every runtime-changing task should finish with a focused verification command before moving on.

## Chunk 1: Shared Latte Art Domain Contract

### Task 1: Create the shared helper test contract first

**Files:**
- Create: `/Users/mac/Documents/New project 4/tests/shared.device-latte-art-library.runtime.test.js`
- Test: `/Users/mac/Documents/New project 4/tests/shared.device-latte-art-library.runtime.test.js`

- [ ] **Step 1: Write the failing helper runtime test file**

Create `tests/shared.device-latte-art-library.runtime.test.js` with tests shaped like:

```js
const api = requireHelper();

test('normalizeLatteArtName should trim, collapse spaces, and compare case-insensitively', () => {
  assert.strictEqual(api.normalizeLatteArtName('  Swan   Art  '), 'swan art');
  assert.strictEqual(api.normalizeLatteArtName('天鹅'), '天鹅');
});

test('normalizeDeviceLatteArtLibrary should recover from malformed input', () => {
  const normalized = api.normalizeDeviceLatteArtLibrary({ items: 'bad' }, 'RCK386');
  assert.deepStrictEqual(normalized.items, []);
});

test('upsertDeviceLatteArtItem should overwrite same-name assets on one device', () => {
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
```

- [ ] **Step 2: Run the helper test to verify RED**

Run:

```bash
node /Users/mac/Documents/New\ project\ 4/tests/shared.device-latte-art-library.runtime.test.js
```

Expected:

- FAIL because `/Users/mac/Documents/New project 4/shared/device-latte-art-library.js` does not exist yet

### Task 2: Implement the shared latte-art helper

**Files:**
- Create: `/Users/mac/Documents/New project 4/shared/device-latte-art-library.js`
- Create: `/Users/mac/Documents/New project 4/tests/shared.device-latte-art-library.runtime.test.js`
- Test: `/Users/mac/Documents/New project 4/tests/shared.device-latte-art-library.runtime.test.js`

- [ ] **Step 1: Create the shared helper namespace**

Create `shared/device-latte-art-library.js` and expose one browser-global API:

```js
(function initDeviceLatteArtLibrary(root) {
  const api = {
    normalizeLatteArtName,
    normalizeDeviceLatteArtLibrary,
    createEmptyDeviceLatteArtLibrary,
    upsertDeviceLatteArtItem,
    renameDeviceLatteArtItem,
    deleteDeviceLatteArtItem,
    copyLatteArtItemToLibrary,
    buildLatteArtLinkageSummary,
    collectNormalizedProductLatteArtNames
  };
  root.CofeDeviceLatteArtLibrary = api;
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 2: Implement normalization and library shape helpers**

Implement:

```js
function normalizeLatteArtName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function createEmptyDeviceLatteArtLibrary(deviceId) {
  return { version: 1, deviceId: String(deviceId || '').trim(), updatedAt: '', items: [] };
}

function normalizeDeviceLatteArtLibrary(raw, deviceId) {
  const safe = raw && typeof raw === 'object' ? raw : {};
  const items = Array.isArray(safe.items) ? safe.items : [];
  return {
    version: 1,
    deviceId: String(deviceId || '').trim(),
    updatedAt: typeof safe.updatedAt === 'string' ? safe.updatedAt : '',
    items: items
      .map(normalizeDeviceLatteArtItem)
      .filter(Boolean)
  };
}
```

Rules:
- malformed input must fall back to an empty library
- `normalizeDeviceLatteArtItem` must derive `nameKey` from `name`
- drop items whose normalized name is blank

- [ ] **Step 3: Implement current-device overwrite and cross-device copy helpers**

Implement:

```js
function upsertDeviceLatteArtItem(library, draft) {
  // normalize the draft name, find same-nameKey item, overwrite-or-append, then bump updatedAt
}

function copyLatteArtItemToLibrary(targetLibrary, sourceItem, targetDeviceId) {
  // normalize the target library, overwrite the same-nameKey item or append a new one, and return { library, action }
}
```

Rules:
- `upsertDeviceLatteArtItem` overwrites same-`nameKey` entries on the same device
- preserve one item per `nameKey`
- `copyLatteArtItemToLibrary` returns both:
  - the next library
  - `action: 'added' | 'overwritten'`
- unrelated target items remain untouched

- [ ] **Step 4: Implement linkage summary helpers against product latte-art option names**

Implement:

```js
function collectNormalizedProductLatteArtNames(productsData = {}) {
  const names = new Set();
  Object.values(productsData || {}).forEach(category => {
    (category?.items || []).forEach(product => {
      const options = product?.options?.latteArt || product?.specs?.latteArt || [];
      const normalizedOptions = Array.isArray(options) ? options : [];
      normalizedOptions.forEach(option => {
        const label = typeof option === 'string' ? option : option?.label || option?.value || option?.name;
        const nameKey = normalizeLatteArtName(label);
        if (nameKey) names.add(nameKey);
      });
    });
  });
  return Array.from(names);
}

function buildLatteArtLinkageSummary({ productNames = [], library }) {
  // compare normalized product names to library item nameKeys and return counts + matched/missing key sets
}
```

Summary output must include:
- `uploadedCount`
- `linkedCount`
- `unreferencedCount`
- `missingMaterialCount`
- `linkedNameKeys`
- `missingNameKeys`

- [ ] **Step 5: Run the helper contract to verify GREEN**

Run:

```bash
node /Users/mac/Documents/New\ project\ 4/tests/shared.device-latte-art-library.runtime.test.js
```

Expected:

- PASS

- [ ] **Step 6: Commit the helper checkpoint**

```bash
git add /Users/mac/Documents/New\ project\ 4/shared/device-latte-art-library.js /Users/mac/Documents/New\ project\ 4/tests/shared.device-latte-art-library.runtime.test.js
git commit -m "feat: add shared device latte art helper"
```

## Chunk 2: Device Detail Section And Current-Device CRUD

### Task 3: Lock the device-detail markup contract in static tests

**Files:**
- Modify: `/Users/mac/Documents/New project 4/tests/devices.entry-detail.test.js`
- Verify: `/Users/mac/Documents/New project 4/devices.html`

- [ ] **Step 1: Add failing static assertions for the new detail section**

In `tests/devices.entry-detail.test.js`, add or replace assertions so the file checks for:

```js
assert.ok(/renderDetailCard\('设备拉花图库'/.test(devicesHtml));
assert.ok(/当前设备生效，按拉花名称与商品配置联动/.test(devicesHtml));
assert.ok(/上传拉花图片/.test(devicesHtml));
assert.ok(/已上传/.test(devicesHtml));
assert.ok(/已联动/.test(devicesHtml));
assert.ok(/未引用/.test(devicesHtml));
assert.ok(/缺失素材/.test(devicesHtml));
assert.ok(/detailLatteArtUploadModal/.test(devicesHtml));
assert.ok(/detailLatteArtCopyModal/.test(devicesHtml));
```

- [ ] **Step 2: Lock section placement relative to existing cards**

Add one focused assertion block that the new section is rendered after `设备状态` and before `入场信息`:

```js
const statusIndex = devicesHtml.indexOf("renderDetailCard('设备状态'");
const latteIndex = devicesHtml.indexOf("renderDetailCard('设备拉花图库'");
const entryIndex = devicesHtml.indexOf("renderDetailCard('入场信息'");
assert.ok(statusIndex >= 0 && latteIndex > statusIndex);
assert.ok(entryIndex > latteIndex);
```

- [ ] **Step 3: Run the static test file to verify RED**

Run:

```bash
node /Users/mac/Documents/New\ project\ 4/tests/devices.entry-detail.test.js
```

Expected:

- FAIL because `devices.html` does not yet render the new latte-art section or modal IDs

### Task 4: Create runtime tests for current-device CRUD behavior

**Files:**
- Create: `/Users/mac/Documents/New project 4/tests/devices.latte-art-library.runtime.test.js`
- Test: `/Users/mac/Documents/New project 4/tests/devices.latte-art-library.runtime.test.js`

- [ ] **Step 1: Write the failing runtime harness**

Create a runtime test file that:
- loads `devices.html`
- loads `shared/device-latte-art-library.js`
- extracts the new device-page functions
- provides stubbed `localStorage`, `confirm`, `showToast`, and lightweight `document` nodes

Target extracted functions:

```js
[
  'getDeviceLatteArtLibraryStorageKey',
  'readStoredDeviceLatteArtLibrary',
  'persistDeviceLatteArtLibrary',
  'openDetailLatteArtUploadModal',
  'saveDetailLatteArtUpload',
  'renameDetailLatteArtItem',
  'deleteDetailLatteArtItem',
  'renderDetailLatteArtLibrarySection',
  'renderDetailLatteArtSummary'
]
```

- [ ] **Step 2: Add failing tests for storage fallback and overwrite confirmation**

Add tests shaped like:

```js
test('损坏的设备拉花图库存储应安全回退为空库', () => {
  sandbox.localStorage.setItem('deviceLatteArtLibrary_RCK386', '{bad json');
  const library = sandbox.readStoredDeviceLatteArtLibrary('RCK386');
  assert.deepStrictEqual(library.items, []);
});

test('当前设备上传同名拉花图片时应先确认覆盖', () => {
  sandbox.seedDeviceLatteArtLibrary('RCK386', [{ id: 'art_1', name: '天鹅', nameKey: '天鹅', image: 'old' }]);
  sandbox.__confirmQueue = [false];
  const result = sandbox.saveDetailLatteArtUpload({
    deviceId: 'RCK386',
    fileName: 'new.png',
    image: 'new',
    name: ' 天鹅 '
  });
  assert.strictEqual(result, false);
  assert.strictEqual(sandbox.readStoredDeviceLatteArtLibrary('RCK386').items[0].image, 'old');
});
```

- [ ] **Step 3: Add failing tests for rename/delete warnings and summary counts**

Add tests for:
- rename warning mentions linkage impact
- delete warning mentions current-device asset removal
- summary renders uploaded / linked / unreferenced / missing counts

Example:

```js
test('删除设备拉花图片时应提示会影响同名商品联动', () => {
  sandbox.__confirmQueue = [true];
  sandbox.deleteDetailLatteArtItem('art_1');
  assert.ok(sandbox.__confirmMessages.some(msg => msg.includes('商品侧同名拉花将视为未配置素材')));
});
```

- [ ] **Step 4: Run the runtime test file to verify RED**

Run:

```bash
node /Users/mac/Documents/New\ project\ 4/tests/devices.latte-art-library.runtime.test.js
```

Expected:

- FAIL because the devices-page latte-art functions do not exist yet

### Task 5: Implement the detail section, upload modal, and CRUD orchestration in `devices.html`

**Files:**
- Modify: `/Users/mac/Documents/New project 4/devices.html`
- Modify: `/Users/mac/Documents/New project 4/tests/devices.entry-detail.test.js`
- Create: `/Users/mac/Documents/New project 4/tests/devices.latte-art-library.runtime.test.js`
- Verify: `/Users/mac/Documents/New project 4/tests/devices.entry-detail.test.js`
- Verify: `/Users/mac/Documents/New project 4/tests/devices.latte-art-library.runtime.test.js`

- [ ] **Step 1: Import the shared helper next to the other shared scripts**

In `devices.html`, add:

```html
<script src="shared/admin-mock-data.js"></script>
<script src="shared/device-latte-art-library.js"></script>
<script src="shared/admin-staff-access.js"></script>
```

Place the new script between shared mock data and other device-page inline code so the helper is ready before page functions run.

- [ ] **Step 2: Add per-device storage wrappers and page state**

Near the other device-detail storage helpers, add:

```js
const DeviceLatteArtLibrary = window.CofeDeviceLatteArtLibrary || globalThis.CofeDeviceLatteArtLibrary;
let detailLatteArtUploadDraft = null;
let detailLatteArtPendingCopyItem = null;

function getDeviceLatteArtLibraryStorageKey(deviceId = currentDetailDeviceId) {
  const normalized = String(deviceId || '').trim();
  return `deviceLatteArtLibrary_${normalized}`;
}

function readStoredDeviceLatteArtLibrary(deviceId = currentDetailDeviceId) {
  const key = getDeviceLatteArtLibraryStorageKey(deviceId);
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || 'null');
    return DeviceLatteArtLibrary.normalizeDeviceLatteArtLibrary(parsed, deviceId);
  } catch (e) {
    return DeviceLatteArtLibrary.createEmptyDeviceLatteArtLibrary(deviceId);
  }
}

function persistDeviceLatteArtLibrary(deviceId = currentDetailDeviceId, library) {
  const normalized = DeviceLatteArtLibrary.normalizeDeviceLatteArtLibrary(library, deviceId);
  localStorage.setItem(getDeviceLatteArtLibraryStorageKey(deviceId), JSON.stringify(normalized));
  return normalized;
}
```

- [ ] **Step 3: Render the new detail card and summary counts**

Add render helpers:

```js
function renderDetailLatteArtSummary(deviceId, productsData) {
  // read the current device library, collect product latte-art names, and render the four summary pills
}

function renderDetailLatteArtLibrarySection(deviceId) {
  // render helper copy, search box, upload action, and either empty state or asset rows
}
```

`renderDetailLatteArtSummary` must:
- read the current device library
- collect normalized product latte-art names from `sharedAdminMockData.defaultProducts` plus any locally edited product data already available in the device page context
- compute uploaded / linked / unreferenced / missing counts through the shared helper

`renderDetailLatteArtLibrarySection` must render:
- helper copy
- summary pills
- search input
- upload button
- empty state or asset list

- [ ] **Step 4: Insert the new card into the detail composition**

In the main detail-card composition, insert:

```js
renderDetailCard('设备拉花图库', renderDetailLatteArtLibrarySection(device.id), false)
```

Place it after `设备状态` and before `入场信息`.

- [ ] **Step 5: Add upload, rename, replace, and delete flows**

Implement:

```js
function openDetailLatteArtUploadModal(deviceId, itemId = '') {
  // seed the upload draft for either create or replace mode and open the modal
}

function saveDetailLatteArtUpload(payloadOverride = null) {
  // validate image + name, confirm overwrite on same-nameKey, persist the current-device library, then open the copy prompt
}

function renameDetailLatteArtItem(itemId) {
  // prompt for the next name, validate uniqueness, warn about linkage-key changes, then persist
}

function deleteDetailLatteArtItem(itemId) {
  // confirm linkage-impact copy, remove the item from the current-device library, then rerender
}
```

Rules:
- upload requires image + name
- current-device same-name save asks `confirm(...)`
- rename warns that the name is a linkage key
- delete warns that same-name product linkage becomes missing
- every successful mutation rerenders the visible latte-art section

- [ ] **Step 6: Run focused verification to verify GREEN**

Run:

```bash
node /Users/mac/Documents/New\ project\ 4/tests/devices.entry-detail.test.js
node /Users/mac/Documents/New\ project\ 4/tests/devices.latte-art-library.runtime.test.js
```

Expected:

- PASS

- [ ] **Step 7: Commit the current-device CRUD checkpoint**

```bash
git add /Users/mac/Documents/New\ project\ 4/devices.html /Users/mac/Documents/New\ project\ 4/tests/devices.entry-detail.test.js /Users/mac/Documents/New\ project\ 4/tests/devices.latte-art-library.runtime.test.js
git commit -m "feat: add device latte art library CRUD"
```

## Chunk 3: Linkage Summary And Cross-Device Copy Flow

### Task 6: Extend tests for linkage status and post-save copy behavior

**Files:**
- Modify: `/Users/mac/Documents/New project 4/tests/shared.device-latte-art-library.runtime.test.js`
- Modify: `/Users/mac/Documents/New project 4/tests/devices.latte-art-library.runtime.test.js`
- Test: `/Users/mac/Documents/New project 4/tests/shared.device-latte-art-library.runtime.test.js`
- Test: `/Users/mac/Documents/New project 4/tests/devices.latte-art-library.runtime.test.js`

- [ ] **Step 1: Add failing helper tests for product-name collection**

Extend `tests/shared.device-latte-art-library.runtime.test.js` with a product-shape coverage test:

```js
test('collectNormalizedProductLatteArtNames should read mixed option shapes from productsData', () => {
  const names = api.collectNormalizedProductLatteArtNames({
    拉花: {
      items: [{
        options: {
          latteArt: ['天鹅', { label: '爱心' }, { value: '郁金香' }]
        }
      }]
    }
  });
  assert.deepStrictEqual(names.sort(), ['天鹅', '爱心', '郁金香'].sort());
});
```

- [ ] **Step 2: Add failing runtime tests for post-save copy prompt and target-device selection**

In `tests/devices.latte-art-library.runtime.test.js`, add tests shaped like:

```js
test('当前设备保存成功后应提示是否复制到其他设备', () => {
  sandbox.__confirmQueue = [true];
  sandbox.saveDetailLatteArtUpload({
    deviceId: 'RCK386',
    image: 'img',
    name: '天鹅'
  });
  assert.ok(sandbox.__lastCopyPromptMessage.includes('是否复制到其他设备'));
});

test('复制到其他设备应按同名覆盖和不同名新增生成预检查摘要', () => {
  sandbox.seedDeviceLatteArtLibrary('RCK410', [{ id: 'art_old', name: '天鹅', nameKey: '天鹅', image: 'old' }]);
  sandbox.seedDeviceLatteArtLibrary('RCK411', []);
  const preview = sandbox.previewDetailLatteArtCopyImpact('art_saved', ['RCK410', 'RCK411']);
  assert.strictEqual(preview.overwriteCount, 1);
  assert.strictEqual(preview.addCount, 1);
});
```

- [ ] **Step 3: Add failing runtime tests for copy results**

Add tests asserting:
- overwritten target image changes
- new target asset is added
- unrelated target asset remains
- result summary groups `overwritten` / `added` / `failed`

- [ ] **Step 4: Run the helper and runtime tests to verify RED**

Run:

```bash
node /Users/mac/Documents/New\ project\ 4/tests/shared.device-latte-art-library.runtime.test.js
node /Users/mac/Documents/New\ project\ 4/tests/devices.latte-art-library.runtime.test.js
```

Expected:

- FAIL because the copy preview/result functions and full linkage collection are not implemented yet

### Task 7: Implement copy prompt, target-device picker, and final verification

**Files:**
- Modify: `/Users/mac/Documents/New project 4/devices.html`
- Modify: `/Users/mac/Documents/New project 4/tests/devices.latte-art-library.runtime.test.js`
- Modify: `/Users/mac/Documents/New project 4/tests/shared.device-latte-art-library.runtime.test.js`
- Verify: `/Users/mac/Documents/New project 4/tests/shared.device-latte-art-library.runtime.test.js`
- Verify: `/Users/mac/Documents/New project 4/tests/devices.latte-art-library.runtime.test.js`
- Verify: `/Users/mac/Documents/New project 4/tests/devices.page-redesign.test.js`
- Verify: `/Users/mac/Documents/New project 4/tests/devices.device-scope.runtime.test.js`

- [ ] **Step 1: Reuse the existing device-picker interaction model in `devices.html`**

Add page state mirroring the product-copy pattern:

```js
let detailLatteArtCopyTargetDeviceIds = new Set();
let detailLatteArtCopyTargetKeyword = '';
```

Implement helpers equivalent in behavior to the menu copy flow:

```js
function getDetailLatteArtCopyTargetOptions() {
  // return all selectable devices except the current source device
}

function getFilteredDetailLatteArtCopyTargetOptions() {
  // filter the selectable options by keyword against device id + location label
}

function toggleDetailLatteArtCopyTargetSelection(deviceId, checked) {
  // add/remove one device id from the selected target set
}

function selectAllFilteredDetailLatteArtCopyTargets() {
  // bulk-add every currently filtered option to the selected target set
}

function clearDetailLatteArtCopyTargets() {
  // reset the selected target set and rerender the list
}

function renderDetailLatteArtCopyTargetOptions() {
  // render the search result rows, checked states, and selected-count summary
}
```

Do not literally copy/paste the menu code without renaming and narrowing it to this feature.

- [ ] **Step 2: Add the post-save copy prompt and impact preview**

Implement:

```js
function promptDetailLatteArtCopyAfterSave(savedItem, deviceId) {
  // show the immediate "是否复制到其他设备" decision after a successful source-device save
}

function previewDetailLatteArtCopyImpact(itemId, targetDeviceIds) {
  // inspect each target library and return overwriteCount/addCount plus target result rows for the confirm UI
}
```

Rules:
- after current-device save, if the operator chooses copy, open the copy modal immediately
- preview must count `overwriteCount` and `addCount`
- preview copy text must explicitly say unrelated target assets are untouched

- [ ] **Step 3: Implement the cross-device copy executor**

Implement:

```js
function copyDetailLatteArtItemToDevices(itemId, targetDeviceIds) {
  // load the saved source item, copy it through the shared helper into each target library, and collect per-device outcomes
}

function renderDetailLatteArtCopyResults(results) {
  // group and render overwritten / added / failed rows for the operator-facing result summary
}
```

Rules:
- read each target device library through the shared helper
- write back normalized libraries per target device
- same normalized name -> overwrite
- different normalized name -> add
- return per-device result rows:
  - `{ deviceId, action: 'overwritten' | 'added' | 'failed', message }`

- [ ] **Step 4: Rerender counts and list state after copy completes**

After copy:
- keep the current detail view on the source device
- rerender the source-device section
- show grouped results in the copy result area/modal
- do not navigate away or silently change `currentDetailDeviceId`

- [ ] **Step 5: Run the focused regression suite to verify GREEN**

Run:

```bash
node /Users/mac/Documents/New\ project\ 4/tests/shared.device-latte-art-library.runtime.test.js
node /Users/mac/Documents/New\ project\ 4/tests/devices.latte-art-library.runtime.test.js
node /Users/mac/Documents/New\ project\ 4/tests/devices.entry-detail.test.js
node /Users/mac/Documents/New\ project\ 4/tests/devices.page-redesign.test.js
node /Users/mac/Documents/New\ project\ 4/tests/devices.device-scope.runtime.test.js
```

Expected:

- PASS

- [ ] **Step 6: Commit the copy-flow and linkage checkpoint**

```bash
git add /Users/mac/Documents/New\ project\ 4/devices.html /Users/mac/Documents/New\ project\ 4/tests/shared.device-latte-art-library.runtime.test.js /Users/mac/Documents/New\ project\ 4/tests/devices.latte-art-library.runtime.test.js /Users/mac/Documents/New\ project\ 4/tests/devices.entry-detail.test.js
git commit -m "feat: add device latte art copy and linkage flow"
```

## Final Verification

- [ ] **Step 1: Run the full device-focused regression sweep**

Run:

```bash
node /Users/mac/Documents/New\ project\ 4/tests/shared.device-latte-art-library.runtime.test.js
node /Users/mac/Documents/New\ project\ 4/tests/devices.latte-art-library.runtime.test.js
node /Users/mac/Documents/New\ project\ 4/tests/devices.entry-detail.test.js
node /Users/mac/Documents/New\ project\ 4/tests/devices.page-redesign.test.js
node /Users/mac/Documents/New\ project\ 4/tests/devices.device-scope.runtime.test.js
node /Users/mac/Documents/New\ project\ 4/tests/devices.maintenance-record-contact-runtime.test.js
```

Expected:

- PASS

- [ ] **Step 2: Do one manual browser verification**

Open the local preview and verify this exact flow:

1. Open one device detail modal.
2. Find `设备拉花图库`.
3. Upload one image named `天鹅`.
4. Upload another image with the same name and confirm overwrite.
5. Verify the current-device card still shows one `天鹅`.
6. Accept the post-save copy prompt.
7. Select one device with an existing `天鹅` asset and one empty device.
8. Confirm the result summary reports one overwrite and one add.
9. Return to the source device and verify the summary pills still read correctly.

- [ ] **Step 3: Push only the targeted implementation files**

```bash
git status --short
git push origin codex/staff-management-revamp
```

Expected:

- only the latte-art implementation files are included in the push
- unrelated user changes remain untouched
