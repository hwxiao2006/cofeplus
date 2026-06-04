# Device Ad Screen Left Right Upload Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single mixed `显示器画面` upload flow in `devices.html` with fixed left/right ad-screen management that stores `entryInfo.adScreen`, preserves legacy `displayImageUrls` read compatibility, and renders left/right assets separately in device detail.

**Architecture:** Keep this feature inside the existing `编辑入场信息` modal and the existing device detail card stack in `devices.html`; do not create a new page, tab, or shared module. Refactor the current image-draft flow into a hybrid draft object: `adScreen` becomes a two-slot structure (`leftMenu`, `rightQueueBackground`) while `locationImageUrls` stays on the existing multi-image path. Use pure helper functions inside `devices.html` so legacy mapping, upload validation, preview rendering, and save serialization can be runtime-tested without touching unrelated detail logic.

**Tech Stack:** Static HTML/CSS with inline browser JavaScript in `devices.html`, `localStorage` persistence, browser `FileReader` / `Image` / `HTMLVideoElement` metadata APIs, Node.js static/runtime test scripts

---

## File Map

- Modify: `/Users/mac/Documents/New project 4/devices.html`
  Purpose: replace the single ad-screen upload block, add left/right draft helpers, add upload-time metadata validation, persist `entryInfo.adScreen`, keep legacy `displayImageUrls` as read-only fallback, and split detail rendering into `左侧菜单` + `右侧排队号背景`.

- Modify: `/Users/mac/Documents/New project 4/tests/devices.entry-detail.test.js`
  Purpose: lock the new modal IDs/text, the two fixed ad-screen groups, the new save path, and the detail card contract so the page can no longer regress to a mixed gallery.

- Create: `/Users/mac/Documents/New project 4/tests/devices.ad-screen.runtime.test.js`
  Purpose: runtime coverage for helper-level behavior that static regex tests cannot prove: legacy mapping, one-slot replacement semantics, left/right validation results, save serialization, and detail preview grouping.

- Verify: `/Users/mac/Documents/New project 4/tests/devices.device-scope.runtime.test.js`
  Purpose: ensure scoped-device filtering still works after `devices.html` grows new helper logic.

- Verify: `/Users/mac/Documents/New project 4/tests/devices.temperature-alarm.runtime.test.js`
  Purpose: protect another recent `devices.html` modal flow from accidental regressions while editing the same file.

- Verify: `/Users/mac/Documents/New project 4/tests/devices.maintenance-record-contact-runtime.test.js`
  Purpose: protect unrelated device-detail runtime helpers in the same file.

- Verify: `/Users/mac/Documents/New project 4/tests/devices.page-redesign.test.js`
  Purpose: keep the broader page shell/layout assertions green after adding modal-specific markup and CSS.

## Execution Notes

- Execute with `@superpowers:test-driven-development`.
- Before any “done” claim, run the listed regression commands and a manual browser smoke check with `@superpowers:verification-before-completion`.
- This repo is already dirty. Do not use `git add -A`, `git commit -a`, or any staging command broader than the files in this plan.

## Implementation Guardrails

- Scope is only `/Users/mac/Documents/New project 4/devices.html` detail/edit flow. Do not pull this requirement into `/Users/mac/Documents/New project 4/device-entry.html` or `/Users/mac/Documents/New project 4/menu-management.html`.
- `entryInfo.adScreen` becomes the only write target for ad-screen assets.
- Legacy `displayImageUrls` is read-only compatibility input:
  - if `entryInfo.adScreen` exists, use it
  - otherwise map the first legacy display asset into `leftMenu`
  - `rightQueueBackground` stays empty
- One side stores one current asset only. Uploading to one side replaces only that side.
- `locationImageUrls` stays on the existing multi-image flow. Do not refactor it into the ad-screen structure.
- Keep white-background handling as guidance text only. No auto-detect, no hard block.
- Preserve the existing image preview modal for image assets only. Left-side videos should render inline with `<video controls>` rather than being forced into the image carousel.
- Prototype storage still uses `localStorage`. Do not expand this plan into backend uploads or durable large-binary storage. Keep runtime tests tiny and metadata-driven.

## Chunk 1: Lock The Contract Before Refactoring

### Task 1: Update the static detail/edit contract in `tests/devices.entry-detail.test.js`

**Files:**
- Modify: `/Users/mac/Documents/New project 4/tests/devices.entry-detail.test.js`
- Verify: `/Users/mac/Documents/New project 4/devices.html`

- [ ] **Step 1: Replace the old single-upload assertions with left/right ad-screen assertions**

Update the existing `详情页应提供编辑入场信息入口并支持保存` block so it no longer looks for `editDisplayImagesInput`.

Replace the old contract with assertions like:

```js
assert.ok(/广告屏设置/.test(devicesHtml));
assert.ok(/左侧菜单/.test(devicesHtml));
assert.ok(/右侧排队号背景/.test(devicesHtml));
assert.ok(/id="editAdScreenLeftImageInput"/.test(devicesHtml));
assert.ok(/id="editAdScreenLeftVideoInput"/.test(devicesHtml));
assert.ok(/id="editAdScreenRightImageInput"/.test(devicesHtml));
assert.ok(/id="editAdScreenLeftPreview"/.test(devicesHtml));
assert.ok(/id="editAdScreenRightPreview"/.test(devicesHtml));
assert.ok(!/id="editDisplayImagesInput"/.test(devicesHtml));
assert.ok(/handleEntryAdScreenUpload\('leftMenu',\s*'image'/.test(devicesHtml));
assert.ok(/handleEntryAdScreenUpload\('leftMenu',\s*'video'/.test(devicesHtml));
assert.ok(/handleEntryAdScreenUpload\('rightQueueBackground',\s*'image'/.test(devicesHtml));
```

- [ ] **Step 2: Add focused assertions for the new data model and compatibility helpers**

Add a new test block that locks the intended helper and save contract:

```js
test('广告屏保存应写入 adScreen 并保留旧数据兼容读取', () => {
  assert.ok(/function\s+normalizeEntryAdScreen\s*\(/.test(devicesHtml));
  assert.ok(/function\s+handleEntryAdScreenUpload\s*\(/.test(devicesHtml));
  assert.ok(/function\s+validateAdScreenDraftAsset\s*\(/.test(devicesHtml));
  assert.ok(/entryInfo\s*=\s*\{[\s\S]*adScreen[\s\S]*leftMenu[\s\S]*rightQueueBackground/.test(devicesHtml));
  assert.ok(/displayImageUrls/.test(devicesHtml), '仍需保留兼容读取');
});
```

- [ ] **Step 3: Replace the detail-card assertions so `广告屏信息` must show left/right groups**

Add or update a focused block like:

```js
test('广告屏信息应拆成左右固定分组展示', () => {
  assert.ok(/renderDetailCard\('广告屏信息'/.test(devicesHtml));
  assert.ok(/detail-subsection-title\">左侧菜单/.test(devicesHtml));
  assert.ok(/detail-subsection-title\">右侧排队号背景/.test(devicesHtml));
  assert.ok(!/detail-subsection-title\">广告屏画面/.test(devicesHtml));
});
```

- [ ] **Step 4: Run the static test file and verify it fails before implementation**

Run:

```bash
node /Users/mac/Documents/New\ project\ 4/tests/devices.entry-detail.test.js
```

Expected:

- FAIL because `devices.html` still contains `editDisplayImagesInput`
- FAIL because left/right ad-screen IDs and helper names do not exist yet

- [ ] **Step 5: Commit the failing static contract**

```bash
git add /Users/mac/Documents/New\ project\ 4/tests/devices.entry-detail.test.js
git commit -m "test: lock ad screen left-right static contract"
```

### Task 2: Add runtime coverage for mapping, validation, and save semantics

**Files:**
- Create: `/Users/mac/Documents/New project 4/tests/devices.ad-screen.runtime.test.js`
- Test: `/Users/mac/Documents/New project 4/tests/devices.ad-screen.runtime.test.js`

- [ ] **Step 1: Create the runtime harness that extracts only the ad-screen helper cluster**

Follow the existing `vm` pattern used by `devices.temperature-alarm.runtime.test.js`.

Load these functions from `devices.html`:

```js
[
  'normalizeEditableValue',
  'normalizePreviewImageList',
  'normalizeEntryAdScreen',
  'createEmptyEntryAdScreenDraft',
  'buildEntryEditImageDraft',
  'validateAdScreenDraftAsset',
  'serializeEntryAdScreenDraft',
  'collectDetailPreviewImages'
]
```

Also load `saveEntryInfoEdit` in a DOM/localStorage sandbox so the runtime test can verify the actual persisted `device.entryInfo`.

- [ ] **Step 2: Write the runtime RED cases for the new domain behavior**

Add tests shaped like:

```js
test('运行时：normalizeEntryAdScreen 应优先使用 adScreen 结构', () => {
  const normalized = sandbox.normalizeEntryAdScreen({
    adScreen: {
      leftMenu: { kind: 'image', url: 'left.png', fileName: 'left.png' },
      rightQueueBackground: { kind: 'image', url: 'right.png', fileName: 'right.png' }
    },
    displayImageUrls: ['legacy.png']
  });
  assert.strictEqual(normalized.leftMenu.url, 'left.png');
  assert.strictEqual(normalized.rightQueueBackground.url, 'right.png');
});

test('运行时：normalizeEntryAdScreen 应把 legacy displayImageUrls 映射到左侧菜单', () => {
  const normalized = sandbox.normalizeEntryAdScreen({ displayImageUrls: ['legacy.png'] });
  assert.strictEqual(normalized.leftMenu.url, 'legacy.png');
  assert.strictEqual(normalized.rightQueueBackground, null);
});

test('运行时：validateAdScreenDraftAsset 应阻止右侧视频并给出左侧尺寸/时长 warning', () => {
  const rightResult = sandbox.validateAdScreenDraftAsset('rightQueueBackground', {
    kind: 'video',
    mimeType: 'video/mp4'
  });
  assert.ok(rightResult.errors.includes('右侧排队号背景仅支持 jpg、png'));

  const leftResult = sandbox.validateAdScreenDraftAsset('leftMenu', {
    kind: 'video',
    mimeType: 'video/mp4',
    codec: 'H.264',
    width: 1280,
    height: 720,
    durationSec: 360
  });
  assert.ok(leftResult.warnings.includes('建议上传 1320×1080 的左侧菜单素材'));
  assert.ok(leftResult.warnings.includes('左侧菜单视频时长建议不超过 4 分钟'));
});

test('运行时：saveEntryInfoEdit 应写入 adScreen 并移除对 displayImageUrls 的保存依赖', () => {
  sandbox.entryEditImageDraft = {
    adScreen: {
      leftMenu: { kind: 'image', url: 'left.png', fileName: 'left.png' },
      rightQueueBackground: { kind: 'image', url: 'right.png', fileName: 'right.png' }
    },
    location: ['loc.png']
  };
  sandbox.saveEntryInfoEdit();
  const saved = sandbox.devicesData[0].entryInfo;
  assert.strictEqual(saved.adScreen.leftMenu.url, 'left.png');
  assert.strictEqual(saved.adScreen.rightQueueBackground.url, 'right.png');
  assert.strictEqual('displayImageUrls' in saved, false);
});
```

- [ ] **Step 3: Run the runtime test file and verify it fails before implementation**

Run:

```bash
node /Users/mac/Documents/New\ project\ 4/tests/devices.ad-screen.runtime.test.js
```

Expected:

- FAIL because the new helper cluster does not exist yet

- [ ] **Step 4: Commit the failing runtime contract**

```bash
git add /Users/mac/Documents/New\ project\ 4/tests/devices.ad-screen.runtime.test.js
git commit -m "test: add ad screen runtime contract"
```

## Chunk 2: Refactor The Ad Screen Data Model And Draft State

### Task 3: Add pure helper functions for left/right ad-screen normalization

**Files:**
- Modify: `/Users/mac/Documents/New project 4/devices.html`
- Verify: `/Users/mac/Documents/New project 4/tests/devices.ad-screen.runtime.test.js`

- [ ] **Step 1: Replace the old `entryEditImageDraft` default shape with a mixed draft object**

Change the global draft state near the top of `devices.html` from:

```js
let entryEditImageDraft = { display: [], location: [] };
```

to:

```js
let entryEditImageDraft = {
  adScreen: createEmptyEntryAdScreenDraft(),
  location: []
};
```

Also update `closeEntryEditModal()` to reset to the same shape.

- [ ] **Step 2: Add a small ad-screen config map and normalization helpers**

Add a pure helper cluster near the existing preview helpers:

```js
const ENTRY_AD_SCREEN_CONFIG = {
  leftMenu: {
    title: '左侧菜单',
    acceptImage: ['image/jpeg', 'image/png'],
    acceptVideo: ['video/mp4'],
    preferredWidth: 1320,
    preferredHeight: 1080
  },
  rightQueueBackground: {
    title: '右侧排队号背景',
    acceptImage: ['image/jpeg', 'image/png'],
    preferredWidth: 800,
    preferredHeight: 1080
  }
};

function createEmptyEntryAdScreenDraft() {
  return {
    leftMenu: null,
    rightQueueBackground: null
  };
}

function normalizeEntryAdScreen(info = {}) {
  const current = info.adScreen && typeof info.adScreen === 'object' ? info.adScreen : {};
  const normalized = {
    leftMenu: normalizeEntryAdScreenAsset(current.leftMenu),
    rightQueueBackground: normalizeEntryAdScreenAsset(current.rightQueueBackground)
  };
  if (normalized.leftMenu || normalized.rightQueueBackground) return normalized;
  const legacy = normalizePreviewImageList(info.displayImageUrls, '左侧菜单');
  if (!legacy.length) return createEmptyEntryAdScreenDraft();
  return {
    leftMenu: {
      kind: 'image',
      url: legacy[0].src,
      fileName: '',
      mimeType: 'image/*',
      width: 0,
      height: 0,
      durationSec: 0,
      codec: '',
      updatedAt: ''
    },
    rightQueueBackground: null
  };
}
```

Rules:

- `normalizeEntryAdScreenAsset(...)` should sanitize missing values into a stable shape or `null`
- do not invent arrays for ad-screen slots
- legacy mapping uses only the first legacy display asset

- [ ] **Step 3: Refactor `buildEntryEditImageDraft(info)` to return the new draft structure**

Replace:

```js
return {
  display: normalizePreviewImageList(info.displayImageUrls, '显示器画面').map(item => item.src),
  location: normalizePreviewImageList(info.locationImageUrls, '点位照片').map(item => item.src)
};
```

with:

```js
return {
  adScreen: normalizeEntryAdScreen(info),
  location: normalizePreviewImageList(info.locationImageUrls, '点位照片').map(item => item.src)
};
```

- [ ] **Step 4: Seed mock entry data with the new `adScreen` object instead of new legacy display arrays**

Inside `buildMockEntryInfo(...)`, replace the mock `displayImageUrls` block with:

```js
adScreen: {
  leftMenu: {
    kind: 'image',
    url: buildMockImageDataUrl('左侧菜单', seedIndex * 10 + 1),
    fileName: `left-menu-${seedIndex + 1}.png`,
    mimeType: 'image/png',
    width: 1320,
    height: 1080,
    durationSec: 0,
    codec: '',
    updatedAt: formatCurrentDateTime()
  },
  rightQueueBackground: {
    kind: 'image',
    url: buildMockImageDataUrl('右侧排队号背景', seedIndex * 10 + 2),
    fileName: `right-queue-${seedIndex + 1}.png`,
    mimeType: 'image/png',
    width: 800,
    height: 1080,
    durationSec: 0,
    codec: '',
    updatedAt: formatCurrentDateTime()
  }
},
```

Do not generate new mock videos in this change.

- [ ] **Step 5: Narrow `ensurePreviewImageUrls(...)` so it only hydrates location images**

The old helper currently manufactures `displayImageUrls`. After the refactor it should stop writing new legacy display data. Keep it responsible only for `locationImageUrls`, or split it into:

```js
function ensureLocationPreviewImageUrls(entryInfo, seedBase = 0) { ... }
```

Then update callers:

- `ensureEntryInfoForEditing(...)`
- `hydrateEntryInfoForPreview(...)`
- `saveEntryInfoEdit()`
- any detail preview patch logic that still expects display hydration

- [ ] **Step 6: Run the runtime test file and make it PASS**

Run:

```bash
node /Users/mac/Documents/New\ project\ 4/tests/devices.ad-screen.runtime.test.js
```

Expected:

- PASS for the helper-level normalization and save-shape cases added in Chunk 1

- [ ] **Step 7: Commit the data-model refactor**

```bash
git add /Users/mac/Documents/New\ project\ 4/devices.html /Users/mac/Documents/New\ project\ 4/tests/devices.ad-screen.runtime.test.js
git commit -m "feat: normalize device ad screen data model"
```

## Chunk 3: Wire The Modal UI, Upload Validation, And Detail Rendering

### Task 4: Replace the single upload block with left/right cards in the entry edit modal

**Files:**
- Modify: `/Users/mac/Documents/New project 4/devices.html`
- Verify: `/Users/mac/Documents/New project 4/tests/devices.entry-detail.test.js`

- [ ] **Step 1: Replace the current `显示器画面（本地上传）` markup with a two-card ad-screen section**

Replace the old block near the modal body:

```html
<div class="entry-edit-field full">
  <span>显示器画面（本地上传）</span>
  ...
</div>
```

with a new structure like:

```html
<div class="entry-edit-field full">
  <span>广告屏设置</span>
  <div class="entry-edit-ad-screen-grid">
    <section class="entry-edit-ad-screen-card">
      <div class="entry-edit-ad-screen-title">左侧菜单</div>
      <div class="entry-edit-ad-screen-meta">建议 1320×1080；支持 jpg、png、mp4(H.264)</div>
      <div class="entry-edit-ad-screen-replace-tip">上传新文件即覆盖当前素材</div>
      <div id="editAdScreenLeftPreview" class="entry-edit-ad-screen-preview"></div>
      <div class="entry-edit-upload-head">
        <label class="entry-upload-btn">
          上传图片
          <input id="editAdScreenLeftImageInput" type="file" accept="image/jpeg,image/png" onchange="handleEntryAdScreenUpload('leftMenu', 'image', event)">
        </label>
        <label class="entry-upload-btn">
          上传视频
          <input id="editAdScreenLeftVideoInput" type="file" accept="video/mp4" onchange="handleEntryAdScreenUpload('leftMenu', 'video', event)">
        </label>
      </div>
    </section>

    <section class="entry-edit-ad-screen-card">
      <div class="entry-edit-ad-screen-title">右侧排队号背景</div>
      <div class="entry-edit-ad-screen-meta">建议 800×1080；仅支持 jpg、png</div>
      <div class="entry-edit-ad-screen-replace-tip">上传新文件即覆盖当前素材</div>
      <div class="entry-edit-ad-screen-guidance">请避免上传白色背景图</div>
      <div id="editAdScreenRightPreview" class="entry-edit-ad-screen-preview"></div>
      <div class="entry-edit-upload-head">
        <label class="entry-upload-btn">
          上传图片
          <input id="editAdScreenRightImageInput" type="file" accept="image/jpeg,image/png" onchange="handleEntryAdScreenUpload('rightQueueBackground', 'image', event)">
        </label>
      </div>
    </section>
  </div>
</div>
```

- [ ] **Step 2: Add modal-specific CSS for desktop side-by-side and mobile stacking**

Add CSS in `devices.html` for:

```css
.entry-edit-ad-screen-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.entry-edit-ad-screen-card {
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px;
  background: #fff;
}

@media (max-width: 768px) {
  .entry-edit-ad-screen-grid {
    grid-template-columns: 1fr;
  }
}
```

Keep the styles local to the modal; do not redesign the full page.

- [ ] **Step 3: Add render helpers for per-side current asset previews**

Create focused helpers:

```js
function renderEntryAdScreenDraft() { ... }
function renderEntryAdScreenDraftSlot(sideKey) { ... }
function renderEntryAdScreenPreviewMedia(asset, previewIndex) { ... }
```

Rules:

- empty slot -> `暂无素材`
- image asset -> existing thumbnail button that can still open the image preview modal
- video asset -> inline `<video controls preload="metadata">`
- include file name and update time when available
- right slot never renders a video action or video preview path

- [ ] **Step 4: Run the static contract test and make it PASS**

Run:

```bash
node /Users/mac/Documents/New\ project\ 4/tests/devices.entry-detail.test.js
```

Expected:

- PASS for the new modal markup and left/right group assertions

### Task 5: Add upload-time metadata extraction and validation

**Files:**
- Modify: `/Users/mac/Documents/New project 4/devices.html`
- Verify: `/Users/mac/Documents/New project 4/tests/devices.ad-screen.runtime.test.js`

- [ ] **Step 1: Add focused metadata readers instead of extending the old generic image upload helper**

Keep `handleEntryImageUpload('location', ...)` for point photos. Add a separate ad-screen handler path:

```js
async function handleEntryAdScreenUpload(sideKey, uploadKind, event) { ... }
async function readEntryAdScreenImageAsset(file) { ... }
async function readEntryAdScreenVideoAsset(file) { ... }
function detectMp4CodecName(buffer) { ... }
```

Implementation requirements:

- image path reads data URL, width, and height
- video path reads data URL, width, height, duration, and codec signal
- codec check is localized to `detectMp4CodecName(buffer)`
- accept H.264 only when the MP4 metadata indicates `avc1` or `avc3`
- if the parser finds `hev1`, `hvc1`, `vp09`, or `av01`, treat it as unsupported

- [ ] **Step 2: Implement `validateAdScreenDraftAsset(sideKey, asset)` as a pure validator**

Target return shape:

```js
function validateAdScreenDraftAsset(sideKey, asset) {
  return {
    errors: [],
    warnings: []
  };
}
```

Rules:

- `leftMenu`
  - hard errors:
    - non-`jpg/png/mp4`
    - mp4 codec not H.264
  - warnings:
    - width/height not `1320x1080`
    - duration over `240` seconds
- `rightQueueBackground`
  - hard errors:
    - not `jpg/png`
    - any `video` kind
  - warnings:
    - width/height not `800x1080`
    - add guidance warning `请避免上传白色背景图`

- [ ] **Step 3: Make upload replace only the targeted side and keep the other slot untouched**

Inside `handleEntryAdScreenUpload(...)`:

```js
const nextAsset = await readEntryAdScreenAsset(file, uploadKind);
const result = validateAdScreenDraftAsset(sideKey, nextAsset);
if (result.errors.length) {
  showToast(result.errors[0], 'error');
  return;
}
entryEditImageDraft.adScreen[sideKey] = {
  ...nextAsset,
  updatedAt: formatCurrentDateTime()
};
renderEntryAdScreenDraft();
result.warnings.forEach(message => showToast(message, 'error'));
```

Notes:

- keep warnings non-blocking
- always clear `event.target.value` in `finally`
- do not mutate the opposite slot

- [ ] **Step 4: Extend the runtime test file to cover upload validation edge cases**

Add RED/GREEN cases for:

- left image wrong size -> warning only
- left video `codec: 'HEVC'` -> hard error `左侧菜单视频仅支持 H.264 编码`
- right video upload -> hard error `右侧排队号背景仅支持 jpg、png`
- right image wrong size -> warning only

- [ ] **Step 5: Run the runtime test file and make it PASS**

Run:

```bash
node /Users/mac/Documents/New\ project\ 4/tests/devices.ad-screen.runtime.test.js
```

Expected:

- PASS for the new validation cases

- [ ] **Step 6: Commit the modal upload flow**

```bash
git add /Users/mac/Documents/New\ project\ 4/devices.html /Users/mac/Documents/New\ project\ 4/tests/devices.entry-detail.test.js /Users/mac/Documents/New\ project\ 4/tests/devices.ad-screen.runtime.test.js
git commit -m "feat: add left-right ad screen upload flow"
```

## Chunk 4: Persist The New Model And Split Detail Rendering

### Task 6: Save `entryInfo.adScreen` and render `广告屏信息` as left/right groups

**Files:**
- Modify: `/Users/mac/Documents/New project 4/devices.html`
- Verify: `/Users/mac/Documents/New project 4/tests/devices.entry-detail.test.js`
- Verify: `/Users/mac/Documents/New project 4/tests/devices.ad-screen.runtime.test.js`

- [ ] **Step 1: Update `openEntryEditModal()` and `closeEntryEditModal()` to use the new ad-screen draft renderer**

After `entryEditImageDraft = buildEntryEditImageDraft(info);`, call:

```js
renderEntryAdScreenDraft();
renderEntryEditImageDraftList('location');
```

or keep `renderEntryEditImageDraft()` as a wrapper that now delegates to:

```js
renderEntryAdScreenDraft();
renderEntryEditImageDraftList('location');
```

- [ ] **Step 2: Update `saveEntryInfoEdit()` so ad-screen writes only the new structure**

Refactor the save block to remove legacy write fields:

```js
const {
  displayImageUrls,
  displayImages,
  ...restEntryInfo
} = baseEntryInfo;

device.entryInfo = {
  ...restEntryInfo,
  entryAt,
  operatorName: ...,
  ...,
  adScreen: serializeEntryAdScreenDraft(entryEditImageDraft.adScreen),
  locationImageUrls,
  locationImages: locationImageUrls.length ? `${locationImageUrls.length}张图片` : '-'
};
```

Rules:

- do not write `displayImageUrls`
- do not write `displayImages`
- keep the rest of the entry fields untouched
- `serializeEntryAdScreenDraft(...)` should return only stable persisted fields

- [ ] **Step 3: Split detail rendering into two fixed ad-screen groups**

Replace the old `renderAdScreenInfoCard(device)` implementation:

```js
const screenImages = renderEntryImageGallery(device, 'display', '暂无广告屏画面');
```

with a grouped renderer:

```js
function renderAdScreenInfoCard(device) {
  const adScreen = normalizeEntryAdScreen(device.entryInfo || {});
  const body = `
    <details class="detail-disclosure">
      <summary>展开广告屏信息</summary>
      <div class="detail-disclosure-content">
        <div class="detail-section-meta">广告屏画面按左右屏独立管理，避免误传和误替换。</div>
        <div class="detail-subsection">
          <div class="detail-subsection-title">左侧菜单</div>
          ${renderDetailAdScreenSlot('leftMenu', adScreen.leftMenu)}
        </div>
        <div class="detail-subsection">
          <div class="detail-subsection-title">右侧排队号背景</div>
          ${renderDetailAdScreenSlot('rightQueueBackground', adScreen.rightQueueBackground)}
        </div>
      </div>
    </details>
  `;
  return renderDetailCard('广告屏信息', body, 'detail-card-ad-screen');
}
```

`renderDetailAdScreenSlot(...)` should render:

- preview media
- `素材类型`
- `文件名`
- `更新时间`
- empty state `暂无素材`

- [ ] **Step 4: Update preview-image collection so image slots still open the shared preview modal**

Refactor `collectDetailPreviewImages(device, group = 'all')` so it:

- keeps `location` images
- includes `leftMenu` and `rightQueueBackground` only when the asset kind is `image`
- excludes video slots from the image carousel
- supports preview offsets for:
  - `location`
  - `adScreenLeft`
  - `adScreenRight`

If that is cleaner, add a small helper:

```js
function collectDetailAdScreenPreviewImages(device) { ... }
```

- [ ] **Step 5: Run the focused ad-screen tests and make them PASS**

Run:

```bash
node /Users/mac/Documents/New\ project\ 4/tests/devices.entry-detail.test.js
node /Users/mac/Documents/New\ project\ 4/tests/devices.ad-screen.runtime.test.js
```

Expected:

- PASS for save-shape assertions
- PASS for left/right detail rendering assertions

- [ ] **Step 6: Commit the save/detail rendering changes**

```bash
git add /Users/mac/Documents/New\ project\ 4/devices.html /Users/mac/Documents/New\ project\ 4/tests/devices.entry-detail.test.js /Users/mac/Documents/New\ project\ 4/tests/devices.ad-screen.runtime.test.js
git commit -m "feat: render device ad screen by left and right groups"
```

## Chunk 5: Full Regression And Manual Smoke Check

### Task 7: Run the full regression sweep for `devices.html`

**Files:**
- Verify: `/Users/mac/Documents/New project 4/tests/devices.entry-detail.test.js`
- Verify: `/Users/mac/Documents/New project 4/tests/devices.ad-screen.runtime.test.js`
- Verify: `/Users/mac/Documents/New project 4/tests/devices.device-scope.runtime.test.js`
- Verify: `/Users/mac/Documents/New project 4/tests/devices.temperature-alarm.runtime.test.js`
- Verify: `/Users/mac/Documents/New project 4/tests/devices.maintenance-record-contact-runtime.test.js`
- Verify: `/Users/mac/Documents/New project 4/tests/devices.page-redesign.test.js`

- [ ] **Step 1: Run the complete scripted regression set**

Run:

```bash
node /Users/mac/Documents/New\ project\ 4/tests/devices.entry-detail.test.js
node /Users/mac/Documents/New\ project\ 4/tests/devices.ad-screen.runtime.test.js
node /Users/mac/Documents/New\ project\ 4/tests/devices.device-scope.runtime.test.js
node /Users/mac/Documents/New\ project\ 4/tests/devices.temperature-alarm.runtime.test.js
node /Users/mac/Documents/New\ project\ 4/tests/devices.maintenance-record-contact-runtime.test.js
node /Users/mac/Documents/New\ project\ 4/tests/devices.page-redesign.test.js
```

Expected:

- every script prints only `PASS ...`
- no script sets a failing exit code

- [ ] **Step 2: Run a manual browser smoke check on the device detail modal**

Open the local preview that was already used for this feature:

```text
http://127.0.0.1:4173/devices.html
```

Manual checks:

- desktop: `左侧菜单` and `右侧排队号背景` cards render side-by-side inside `编辑入场信息`
- mobile-width viewport: the two cards stack vertically
- uploading a left-side image replaces only the left slot
- uploading a right-side image replaces only the right slot
- right-side card has no video upload action
- left-side video renders inline with controls
- detail page `广告屏信息` shows two fixed groups, not one mixed gallery
- legacy devices with only `displayImageUrls` still show the old asset under `左侧菜单`

- [ ] **Step 3: Stage only the feature files and create the final implementation commit**

```bash
git add /Users/mac/Documents/New\ project\ 4/devices.html /Users/mac/Documents/New\ project\ 4/tests/devices.entry-detail.test.js /Users/mac/Documents/New\ project\ 4/tests/devices.ad-screen.runtime.test.js
git commit -m "feat: split device ad screen uploads into left and right slots"
```

- [ ] **Step 4: Stop and request review before any push**

After the regression pass and final commit:

- capture the preview URL
- summarize any prototype caveat around local video persistence
- request human review before `git push`
