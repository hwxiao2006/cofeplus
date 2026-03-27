# Device Detail Information Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the device detail modal in `devices.html` into an operator-first hierarchy with `设备概览`, `设备状态`, one unified `设备操作` rail, merged `入场信息`, separate `广告屏信息`, and collapsed deep technical sections.

**Architecture:** Keep the existing modal shell, localStorage-backed device/fault record model, image preview modal, and device action handlers. Restructure only the detail composition layer in `devices.html`: remove the current right-side directory/status summary, split identity from runtime state, regroup entry and image content by business meaning, and move technical telemetry out of the first screen.

**Tech Stack:** Static HTML/CSS/vanilla JavaScript in `devices.html`, Node.js HTML assertion tests in `tests/devices.entry-detail.test.js`, runtime regression tests in `tests/devices.maintenance-record-contact-runtime.test.js`, broader device-page regressions via `node --test`.

---

## File Structure

- Modify: `/Users/mac/Documents/New project 4/devices.html`
  - Recompose the detail modal sections and right rail
  - Rename the user-facing sections
  - Split image/gallery surfaces into `入场信息` vs `广告屏信息`
  - Preserve current handlers like `openDetailRemoteActions(...)`, `openDetailEditFaultStatus(...)`, `openDetailStatusRecords(...)`, and `goToDeviceMaterials(...)`
- Modify: `/Users/mac/Documents/New project 4/tests/devices.entry-detail.test.js`
  - Replace outdated hierarchy expectations (`故障处理`, `入场核心信息`, `入场全部信息`, `图片信息`, right-side directory/status summary)
  - Lock the new section names, grouping boundaries, and simplified right rail
- Verify: `/Users/mac/Documents/New project 4/tests/devices.maintenance-record-contact-runtime.test.js`
  - Ensure status-record and maintenance-record behavior is unchanged
- Verify: `/Users/mac/Documents/New project 4/tests/devices.device-scope.runtime.test.js`
  - Ensure page-scope behavior still works after modal restructuring
- Verify: `/Users/mac/Documents/New project 4/tests/devices.page-redesign.test.js`
  - Ensure list-page redesign assertions still pass
- Verify: `/Users/mac/Documents/New project 4/tests/devices.filter-bar.style.test.js`
- Verify: `/Users/mac/Documents/New project 4/tests/devices.identifier-display.test.js`
- Verify: `/Users/mac/Documents/New project 4/tests/device-search.location-name.test.js`

## Implementation Guardrails

- This repo is already dirty. Do not use `git add -A`, `git commit -a`, or any broad staging command.
- Preserve existing storage keys:
  - `devicesData`
  - `deviceFaultOperationRecords`
  - `deviceFaultAbnormalRecords`
- Preserve existing behavior of:
  - entry edit modal
  - image preview modal
  - detail remote-action sheet
  - detail status-edit sheet
  - detail status-record modal
- Do not redesign the faults page in this plan.

## Chunk 1: Lock The New Detail Hierarchy In Tests

### Task 1: Replace the outdated section contract in `tests/devices.entry-detail.test.js`

**Files:**
- Modify: `/Users/mac/Documents/New project 4/tests/devices.entry-detail.test.js`
- Verify: `/Users/mac/Documents/New project 4/devices.html`

- [ ] **Step 1: Rewrite the structure assertions to match the approved hierarchy**

Update or replace the existing tests that currently assert:

- `入场核心信息`
- `入场全部信息`
- `图片信息`
- `故障处理`
- right-side `目录导航`
- right-side `状态摘要`
- `detail-section-entry-core`
- `detail-section-entry-all`
- `detail-section-entry-images`

Replace them with assertions for:

```js
assert.ok(/设备概览/.test(devicesHtml));
assert.ok(/设备状态/.test(devicesHtml));
assert.ok(/入场信息/.test(devicesHtml));
assert.ok(/广告屏信息/.test(devicesHtml));
assert.ok(/技术状态/.test(devicesHtml));
assert.ok(/状态记录/.test(devicesHtml));
assert.ok(!/目录导航/.test(devicesHtml));
assert.ok(!/状态摘要/.test(devicesHtml));
assert.ok(!/入场核心信息/.test(devicesHtml));
assert.ok(!/入场全部信息/.test(devicesHtml));
assert.ok(!/图片信息/.test(devicesHtml));
assert.ok(!/故障处理/.test(devicesHtml));
```

- [ ] **Step 2: Add one focused test for the new right-rail contract**

Add a focused assertion block that locks:

- only one visible right-side section title: `设备操作`
- no `detail-anchor-list`
- no `detail-side-state-list`
- action labels remain:
  - `远程操作`
  - `状态记录`
  - `编辑状态`
  - `物料页面`

Suggested shape:

```js
test('设备详情右侧应只保留统一设备操作区', () => {
  assert.ok(/detail-side-title\">设备操作/.test(devicesHtml));
  assert.ok(!/detail-anchor-list/.test(devicesHtml));
  assert.ok(!/detail-side-state-list/.test(devicesHtml));
});
```

- [ ] **Step 3: Run the focused detail test file and verify it fails for the new expectations**

Run:

```bash
node --test /Users/mac/Documents/New\ project\ 4/tests/devices.entry-detail.test.js
```

Expected:

- FAIL because `devices.html` still renders the old section names and the old right-side directory/status summary

- [ ] **Step 4: Commit the failing test contract**

```bash
git add /Users/mac/Documents/New\ project\ 4/tests/devices.entry-detail.test.js
git commit -m "test: lock device detail hierarchy contract"
```

## Chunk 2: Simplify The First Screen And Right Rail

### Task 2: Replace the current left/right composition with the approved first-screen structure

**Files:**
- Modify: `/Users/mac/Documents/New project 4/devices.html`
- Verify: `/Users/mac/Documents/New project 4/tests/devices.entry-detail.test.js`

- [ ] **Step 1: Remove the current right-side navigation and summary blocks**

Inside `renderDetailAside(...)`, delete the markup for:

- `目录导航`
- `detail-anchor-list`
- `状态摘要`
- `detail-side-state-list`

Keep only the `设备操作` card.

The target shape is:

```js
function renderDetailAside(detailData) {
  const summary = detailData?.base || {};
  return `
    <aside class="detail-aside">
      <div class="detail-aside-stack">
        <section class="detail-side-card">
          <div class="detail-side-title">设备操作</div>
          <div class="detail-side-action-list">
            ...
          </div>
        </section>
      </div>
    </aside>
  `;
}
```

- [ ] **Step 2: Delete the now-unused section-spy/navigation helpers**

Remove the code paths that only exist for right-side directory navigation:

- `getDetailSectionConfig()` if it only feeds the anchor list
- `setActiveDetailAnchor(...)`
- `scrollDetailToSection(...)`
- `updateActiveDetailAnchorByScroll(...)`
- `bindDetailSectionSpy(...)`
- the `bindDetailSectionSpy()` call inside `viewDetail(...)`

If one helper is still useful for section ordering, keep it narrowly scoped and rename its purpose in-place. Do not keep dead navigation code.

- [ ] **Step 3: Split the first screen into `设备概览` and `设备状态`**

Introduce two explicit render helpers in `devices.html`:

```js
function renderDeviceOverviewCard(base) { ... }
function renderDeviceStatusCard(base, fault, counts) { ... }
```

`renderDeviceOverviewCard(base)` should render only:

- `设备编号`
- `所属商户`
- `点位`
- `设备类别`
- `部署类型`

`renderDeviceStatusCard(base, fault, counts)` should render only:

- `设备状态`
- `停卖状态`
- `最近心跳`
- `入场状态`
- `当前异常摘要`

Do not repeat runtime-state fields in the overview card.

- [ ] **Step 4: Replace the old first-screen sections in `viewDetail(...)`**

In `viewDetail(...)`, remove the current composition:

- `renderDetailCard('设备信息', ...)`
- `renderFaultControlCard(...)` as a first-screen section

Replace it with:

```js
<section class="detail-section" id="detail-section-overview">
  ${renderDeviceOverviewCard(detailData.base)}
</section>
<section class="detail-section" id="detail-section-status">
  ${renderDeviceStatusCard(detailData.base, detailData.fault, detailRecordCounts)}
</section>
```

- [ ] **Step 5: Make the primary action visually obvious**

Inside `renderDetailAside(...)`, keep the existing action handlers but visually prioritize `远程操作` over the other three actions. This can be done by:

- keeping `远程操作` as the first button
- giving only that button the primary visual style
- leaving the other three as lower-emphasis secondary actions

Do not change the action labels or handlers.

- [ ] **Step 6: Run the focused detail test file and verify the first-screen hierarchy now passes**

Run:

```bash
node --test /Users/mac/Documents/New\ project\ 4/tests/devices.entry-detail.test.js
```

Expected:

- some old regrouping/image assertions may still fail
- the new right-rail and section-name assertions should now pass

- [ ] **Step 7: Commit the first-screen layout refactor**

```bash
git add /Users/mac/Documents/New\ project\ 4/devices.html
git commit -m "feat: simplify device detail first screen"
```

## Chunk 3: Regroup Entry, Ad-Screen, Technical, And Record Surfaces

### Task 3: Merge `入场核心信息` + `入场全部信息` into one `入场信息` section

**Files:**
- Modify: `/Users/mac/Documents/New project 4/devices.html`
- Modify: `/Users/mac/Documents/New project 4/tests/devices.entry-detail.test.js`

- [ ] **Step 1: Add a failing test for the merged entry section**

Add assertions that the detail body now uses one top-level entry section id and label, for example:

```js
assert.ok(/detail-section-entry/.test(devicesHtml));
assert.ok(/renderDetailCard\\('入场信息'/.test(devicesHtml));
assert.ok(!/detail-section-entry-core/.test(devicesHtml));
assert.ok(!/detail-section-entry-all/.test(devicesHtml));
```

Also replace the old `查看全部入场信息` expectation. The new contract should no longer require a separate top-level `入场全部信息` entry.

- [ ] **Step 2: Build a single `入场信息` section in `viewDetail(...)`**

Keep using the existing entry helpers:

- `renderEntryCoreRows(...)`
- `renderEntryAllRows(...)`

But place them inside one parent section and one parent card:

```js
const entryInfoContent = `
  ${renderEntryCoreRows(detailData.entry)}
  ${renderDetailEntryExpandedBlock(detailData.entry)}
  ${renderEntryLocationImageGallery(device)}
`;
```

The user-facing section title must be `入场信息`.

The internal expanded block may still use `<details>` if helpful, but there must be only one top-level entry section.

- [ ] **Step 3: Keep point images inside `入场信息`**

Refactor the current combined gallery helpers so point/site photos are rendered inside the entry section only.

Add or refactor helpers along these lines:

```js
function collectEntryLocationPreviewImages(device) { ... }
function renderEntryLocationImageGallery(device) { ... }
```

These should use only `locationImageUrls`.

- [ ] **Step 4: Run the focused test file and verify the merged entry contract passes**

Run:

```bash
node --test /Users/mac/Documents/New\ project\ 4/tests/devices.entry-detail.test.js
```

Expected:

- FAIL may remain on ad-screen / tech regrouping assertions
- merged-entry assertions should pass

- [ ] **Step 5: Commit the merged entry-section change**

```bash
git add /Users/mac/Documents/New\ project\ 4/devices.html /Users/mac/Documents/New\ project\ 4/tests/devices.entry-detail.test.js
git commit -m "feat: merge device entry detail sections"
```

### Task 4: Replace `图片信息` with `广告屏信息` and move display imagery there

**Files:**
- Modify: `/Users/mac/Documents/New project 4/devices.html`
- Modify: `/Users/mac/Documents/New project 4/tests/devices.entry-detail.test.js`

- [ ] **Step 1: Add a failing test for the ad-screen boundary**

Add assertions that:

- `广告屏信息` exists
- `图片信息` does not
- point images are no longer rendered in the ad-screen section
- display images are still previewable

Suggested assertions:

```js
assert.ok(/广告屏信息/.test(devicesHtml));
assert.ok(!/图片信息/.test(devicesHtml));
assert.ok(/displayImageUrls/.test(devicesHtml));
assert.ok(/locationImageUrls/.test(devicesHtml));
```

- [ ] **Step 2: Split the current combined image gallery helper**

The current `collectEntryPreviewImages(device)` and `renderEntryImageGallery(device)` combine:

- `displayImageUrls`
- `locationImageUrls`

Refactor this into source-specific helpers, for example:

```js
function collectDetailPreviewImages(device, group) { ... }
function renderDetailImageGallery(device, group) { ... }
```

`group` should support:

- `'location'`
- `'display'`

- [ ] **Step 3: Render `广告屏信息` as its own collapsed section**

Add a dedicated top-level section:

```js
<section class="detail-section" id="detail-section-ad-screen">
  ${renderDetailCard('广告屏信息', renderDetailImageGallery(device, 'display'), 'detail-card-ad-screen')}
</section>
```

This section should only show display/monitor imagery and related screen content.

- [ ] **Step 4: Keep image preview navigation working inside the selected group**

Update the preview setup so clicking a point image previews only the point-image gallery, and clicking an ad-screen image previews only the ad-screen gallery.

Do not regress:

- `openImagePreview(...)`
- `switchImagePreview(...)`
- keyboard left/right navigation

- [ ] **Step 5: Run the focused detail test file and verify image regrouping passes**

Run:

```bash
node --test /Users/mac/Documents/New\ project\ 4/tests/devices.entry-detail.test.js
```

Expected:

- only remaining failures should relate to the old fault/tech naming if not yet updated

- [ ] **Step 6: Commit the ad-screen regrouping**

```bash
git add /Users/mac/Documents/New\ project\ 4/devices.html /Users/mac/Documents/New\ project\ 4/tests/devices.entry-detail.test.js
git commit -m "feat: split device entry and ad-screen galleries"
```

### Task 5: Move technical telemetry out of the first screen and rename the old fault surface

**Files:**
- Modify: `/Users/mac/Documents/New project 4/devices.html`
- Modify: `/Users/mac/Documents/New project 4/tests/devices.entry-detail.test.js`

- [ ] **Step 1: Add a failing test for the new `设备状态` + `技术状态` split**

Add or rewrite assertions so the old `renderFaultControlCard(...)`-based contract no longer expects a top-level `故障处理` card.

Replace it with expectations for:

- `设备状态` first-screen card
- `技术状态` collapsed section
- no first-screen technical field dump

Suggested direction:

```js
assert.ok(/renderDeviceStatusCard/.test(devicesHtml));
assert.ok(/技术状态/.test(devicesHtml));
assert.ok(!/renderDetailCard\\('故障处理'/.test(devicesHtml));
```

- [ ] **Step 2: Refactor the current fault card renderer into a technical-state section**

Take the current technical rows from the old `renderFaultControlCard(...)`:

- temperatures
- humidity
- update time
- software/system/firmware versions
- organization chips

Move them into a new helper, for example:

```js
function renderTechnicalStatusCard(faultData) { ... }
```

This section should be collapsed by default and rendered lower on the page.

- [ ] **Step 3: Make `设备状态` show only the operator-facing summary**

`renderDeviceStatusCard(...)` should compute:

- status label
- sales label
- heartbeat label
- entry state
- abnormal summary text

For abnormal summary:

- normal device: `当前无异常`
- abnormal device: build a concise summary from the abnormal org-status parts

Do not render all technical rows on this card.

- [ ] **Step 4: Add a collapsed `状态记录` section that does not replace the existing modal**

Render a lightweight collapsed section with high-level summary content, for example:

- abnormal count
- maintenance/operation count
- a short recent-record preview or CTA text

Keep the existing `状态记录` action button opening the full modal. The collapsed section is a content grouping, not a replacement for the modal workflow.

- [ ] **Step 5: Run the focused detail file until it is fully green**

Run:

```bash
node --test /Users/mac/Documents/New\ project\ 4/tests/devices.entry-detail.test.js
```

Expected:

- PASS

- [ ] **Step 6: Commit the final regrouping**

```bash
git add /Users/mac/Documents/New\ project\ 4/devices.html /Users/mac/Documents/New\ project\ 4/tests/devices.entry-detail.test.js
git commit -m "feat: reorganize device detail information hierarchy"
```

## Chunk 4: Regression Verification

### Task 6: Run the runtime and broader device regressions

**Files:**
- Verify: `/Users/mac/Documents/New project 4/tests/devices.maintenance-record-contact-runtime.test.js`
- Verify: `/Users/mac/Documents/New project 4/tests/devices.device-scope.runtime.test.js`
- Verify: `/Users/mac/Documents/New project 4/tests/devices.page-redesign.test.js`
- Verify: `/Users/mac/Documents/New project 4/tests/devices.filter-bar.style.test.js`
- Verify: `/Users/mac/Documents/New project 4/tests/devices.identifier-display.test.js`
- Verify: `/Users/mac/Documents/New project 4/tests/device-search.location-name.test.js`

- [ ] **Step 1: Run the status-record runtime regression**

Run:

```bash
node --test /Users/mac/Documents/New\ project\ 4/tests/devices.maintenance-record-contact-runtime.test.js
```

Expected:

- PASS

- [ ] **Step 2: Run the page-scope runtime regression**

Run:

```bash
node --test /Users/mac/Documents/New\ project\ 4/tests/devices.device-scope.runtime.test.js
```

Expected:

- PASS

- [ ] **Step 3: Run the broader device regression pack**

Run:

```bash
node --test /Users/mac/Documents/New\ project\ 4/tests/devices*.test.js /Users/mac/Documents/New\ project\ 4/tests/device-search.location-name.test.js
```

Expected:

- PASS

- [ ] **Step 4: Review only the intended diff**

Run:

```bash
git diff -- /Users/mac/Documents/New\ project\ 4/devices.html /Users/mac/Documents/New\ project\ 4/tests/devices.entry-detail.test.js
```

Expected:

- only device-detail hierarchy, naming, regrouping, and related test updates appear

- [ ] **Step 5: Commit the verified implementation**

```bash
git add /Users/mac/Documents/New\ project\ 4/devices.html /Users/mac/Documents/New\ project\ 4/tests/devices.entry-detail.test.js
git commit -m "feat: redesign device detail information hierarchy"
```

## Execution Notes

- Prefer additive/refactor helpers over rewriting the whole detail modal in one pass.
- Keep existing CSS class reuse where it reduces risk, but rename user-facing labels to match the approved design.
- If a helper is now semantically misleading and small enough to rename safely, rename it. If renaming would create unnecessary churn, keep the internal helper name and only change the rendering contract. Favor clear behavior over broad mechanical renames.
- When splitting image galleries, keep the preview modal intact and only change how the preview image list is populated.
- Do not remove the existing status-record modal just because `状态记录` becomes a collapsed section in the page body. The collapsed section is summary content; the modal remains the deeper interaction surface.

Plan complete and saved to `docs/superpowers/plans/2026-03-27-device-detail-information-hierarchy-plan.md`. Ready to execute?
