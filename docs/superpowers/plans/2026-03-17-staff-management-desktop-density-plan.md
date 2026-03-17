# Staff Management Desktop Density Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compress the desktop staff-management list so the header and cards show more useful content before scrolling, while preserving the existing staff actions and data model.

**Architecture:** Keep the change self-contained inside `staff-management.html` and `tests/staff-management.behavior.test.js`. Replace the stacked desktop summary/list heading with one compact metadata row below the existing page header, flatten each staff card into a single-row desktop layout, and add per-card UI-only expand/collapse state for long device lists. Preserve current mobile behavior and existing edit/account-toggle flows.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Node-based behavior tests

---

## Chunk 1: Desktop Shell And Regression Guardrails

### Task 1: Lock the compact desktop toolbar and single-layer card structure with failing tests

**Files:**
- Modify: `tests/staff-management.behavior.test.js`
- Test: `tests/staff-management.behavior.test.js`

- [ ] **Step 1: Write the failing test for the new desktop toolbar and card shell**

Add a new test near the existing `renderManagers` assertions with concrete checks like:

```js
test('人员管理页：桌面端应使用紧凑工具头与单层卡片布局', () => {
  assert.ok(/class="staff-toolbar"/.test(staffHtml));
  assert.ok(/class="staff-toolbar-stat"/.test(staffHtml));
  assert.ok(/class="staff-toolbar-meta"/.test(staffHtml));
  assert.ok(!/class="summary-strip"/.test(staffHtml));
  assert.ok(!/class="list-head"/.test(staffHtml));

  const renderManagersBlockMatch = staffHtml.match(/function\s+renderManagers\s*\(\)\s*\{[\s\S]*?\n\s*function\s+updateStats/);
  assert.ok(renderManagersBlockMatch, '应存在 renderManagers 逻辑');
  const renderManagersBlock = renderManagersBlockMatch[0];

  assert.ok(/manager-row/.test(renderManagersBlock));
  assert.ok(/manager-detail-stack/.test(renderManagersBlock));
  assert.ok(/manager-device-summary/.test(renderManagersBlock));
  assert.ok(!/manager-panel manager-device-panel/.test(renderManagersBlock), '桌面端不应继续使用独立设备面板');
});
```

- [ ] **Step 2: Run the staff behavior test to verify it fails**

Run: `node tests/staff-management.behavior.test.js`

Expected: `FAIL 人员管理页：桌面端应使用紧凑工具头与单层卡片布局`

- [ ] **Step 3: Implement the compact desktop toolbar markup and card shell**

Modify the desktop list shell in `staff-management.html` so the content area changes from:

```html
<div class="summary-strip">...</div>
<section class="list-card">
  <div class="list-head">...</div>
  <div class="manager-list" id="managerList"></div>
</section>
```

to a single compact toolbar plus list structure:

```html
<section class="staff-toolbar">
  <div class="staff-toolbar-stat">
    <span class="staff-toolbar-label">启用人员数</span>
    <strong class="staff-toolbar-value" id="staffEnabledCount">0</strong>
  </div>
  <div class="staff-toolbar-meta">
    <span class="staff-toolbar-title" id="listTitle">管理人员列表</span>
    <span class="staff-toolbar-note" id="listHint">共 0 位管理人员</span>
  </div>
</section>

<section class="list-card">
  <div class="manager-list" id="managerList"></div>
</section>
```

Keep the existing page-header `添加人员` button and its `openStaffModal()` handler so desktop density improves without creating a duplicate primary action or changing mobile entry points.

Inside `renderManagers()`, change the card shell from the old stacked layout:

```js
<article class="manager-item">
  <div class="manager-head">...</div>
  <div class="manager-panel manager-device-panel">...</div>
</article>
```

to a single-layer structure that leaves room for a later expandable device section:

```js
<article class="manager-item">
  <div class="manager-row">
    <div class="manager-identity">...</div>
    <div class="manager-detail-stack">...</div>
    <div class="manager-actions">...</div>
  </div>
</article>
```

- [ ] **Step 4: Add the desktop-only CSS for the compact toolbar and single-row card**

In `staff-management.html`, add or replace CSS with focused desktop classes:

```css
.staff-toolbar {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  padding: 14px 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: linear-gradient(180deg, #ffffff 0%, #fbfefe 100%);
  box-shadow: var(--shadow);
}

.staff-toolbar-stat {
  min-width: 124px;
}

.staff-toolbar-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.manager-row {
  display: grid;
  grid-template-columns: minmax(220px, 0.9fr) minmax(260px, 1.2fr) auto;
  gap: 16px;
  align-items: center;
}

.manager-detail-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
```

Keep the existing mobile breakpoints, but update them so `.staff-toolbar` stacks and `.manager-row` collapses on narrow widths instead of forcing the desktop grid onto mobile.

- [ ] **Step 5: Re-run the staff behavior test to verify the new shell passes**

Run: `node tests/staff-management.behavior.test.js`

Expected: the new desktop-toolbar test passes and no existing staff-page behavior tests regress.

- [ ] **Step 6: Commit the shell milestone**

```bash
git add staff-management.html tests/staff-management.behavior.test.js
git commit -m "feat: compact desktop staff list shell"
```

## Chunk 2: Device Summary Expansion And Final Verification

### Task 2: Lock the long-device summary and in-card expand/collapse behavior with failing tests

**Files:**
- Modify: `tests/staff-management.behavior.test.js`
- Test: `tests/staff-management.behavior.test.js`

- [ ] **Step 1: Write the failing test for desktop device summary behavior**

Add a second targeted test with explicit helper and rendering anchors:

```js
test('人员管理页：桌面端负责设备应支持摘要与卡片内展开', () => {
  assert.ok(/let\s+expandedDeviceStaffIds\s*=\s*new Set\(\)/.test(staffHtml));
  assert.ok(/function\s+getManagerDeviceSummary\s*\(devices,\s*staffId\)/.test(staffHtml));
  assert.ok(/function\s+toggleManagerDevices\s*\(staffId\)/.test(staffHtml));
  assert.ok(/deviceCount\s*<=\s*3/.test(staffHtml));
  assert.ok(/devices\.slice\(0,\s*2\)/.test(staffHtml));
  assert.ok(/查看全部/.test(staffHtml));
  assert.ok(/收起/.test(staffHtml));

  const renderManagersBlockMatch = staffHtml.match(/function\s+renderManagers\s*\(\)\s*\{[\s\S]*?\n\s*function\s+updateStats/);
  assert.ok(renderManagersBlockMatch, '应存在 renderManagers 逻辑');
  const renderManagersBlock = renderManagersBlockMatch[0];

  assert.ok(/manager-device-summary/.test(renderManagersBlock));
  assert.ok(/manager-device-toggle/.test(renderManagersBlock));
  assert.ok(/manager-device-expanded/.test(renderManagersBlock));
  assert.ok(/onclick="toggleManagerDevices\('\$\{manager\.id\}'\)"/.test(renderManagersBlock));
});
```

- [ ] **Step 2: Run the staff behavior test to verify it fails**

Run: `node tests/staff-management.behavior.test.js`

Expected: `FAIL 人员管理页：桌面端负责设备应支持摘要与卡片内展开`

- [ ] **Step 3: Implement UI-only expanded-state tracking**

In `staff-management.html`, add a new page-level state value near the existing globals:

```js
let expandedDeviceStaffIds = new Set();
```

Do not store this in `localStorage`. This state is only for current-page rendering.

- [ ] **Step 4: Implement the device-summary helper and toggle helper**

Add the following helpers before `renderManagers()`:

```js
function getManagerDeviceSummary(devices, staffId) {
  const normalizedDevices = Array.isArray(devices) ? devices.filter(Boolean) : [];
  const deviceCount = normalizedDevices.length;

  if (!deviceCount) {
    return {
      summaryText: '-',
      toggleText: '',
      expandedMarkup: ''
    };
  }

  if (deviceCount <= 3) {
    return {
      summaryText: normalizedDevices.join('、'),
      toggleText: '',
      expandedMarkup: ''
    };
  }

  const preview = normalizedDevices.slice(0, 2).join('、');
  const isExpanded = expandedDeviceStaffIds.has(staffId);

  return {
    summaryText: `${preview} 等 ${deviceCount} 台`,
    toggleText: isExpanded ? '收起' : '查看全部',
    expandedMarkup: isExpanded ? `
      <div class="manager-device-expanded">
        ${normalizedDevices.map((device) => `<span class="manager-device-chip">${device}</span>`).join('')}
      </div>
    ` : ''
  };
}

function toggleManagerDevices(staffId) {
  if (expandedDeviceStaffIds.has(staffId)) {
    expandedDeviceStaffIds.delete(staffId);
  } else {
    expandedDeviceStaffIds.add(staffId);
  }
  renderManagers();
}
```

- [ ] **Step 5: Wire the device summary helper into `renderManagers()`**

Update the card template in `renderManagers()` so the detail column renders:

```js
const devices = Array.isArray(manager.devices) ? manager.devices.filter(Boolean) : [];
const deviceCount = devices.length;
const deviceSummary = getManagerDeviceSummary(devices, manager.id);
```

and include markup like:

```js
<div class="manager-device-summary">
  <span class="manager-device-label">负责设备：</span>
  <span class="manager-device-text">${deviceSummary.summaryText}</span>
  ${deviceSummary.toggleText ? `<button type="button" class="manager-device-toggle" onclick="toggleManagerDevices('${manager.id}')">${deviceSummary.toggleText}</button>` : ''}
</div>
${deviceSummary.expandedMarkup}
${deviceCount ? `<div class="manager-meta">共 ${deviceCount} 台设备</div>` : ''}
```

This keeps the default desktop card short while still allowing full inspection in place.

- [ ] **Step 6: Add compact expanded-list styling**

Add CSS to `staff-management.html` for the new expanded section:

```css
.manager-device-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.manager-device-toggle {
  border: none;
  background: transparent;
  color: #0f766e;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.manager-device-expanded {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 112px;
  overflow: auto;
  padding-top: 6px;
}

.manager-device-chip {
  border-radius: 999px;
  border: 1px solid #bfe9e6;
  background: #ecfbf9;
  color: #0f766e;
  font-size: 12px;
  line-height: 24px;
  padding: 0 10px;
}
```

Keep these styles inside the existing card system rather than introducing a new component file.

- [ ] **Step 7: Re-run the staff behavior test to verify the device behavior passes**

Run: `node tests/staff-management.behavior.test.js`

Expected: all tests in `tests/staff-management.behavior.test.js` pass, including the new device-summary regression coverage.

- [ ] **Step 8: Commit the device-summary milestone**

```bash
git add staff-management.html tests/staff-management.behavior.test.js
git commit -m "feat: add desktop staff device summaries"
```

### Task 3: Run full verification and do a desktop smoke check

**Files:**
- Verify: `staff-management.html`
- Verify: `tests/staff-management.behavior.test.js`

- [ ] **Step 1: Run the targeted regression suite**

Run: `node tests/staff-management.behavior.test.js`

Expected: every line prints `PASS ...` and the command exits with code `0`.

- [ ] **Step 2: Re-run one adjacent regression test to confirm no device-search behavior drift**

Run: `node tests/device-search.location-name.test.js`

Expected: all checks pass and the staff page still supports device-number and location-name search behavior.

- [ ] **Step 3: Do a manual desktop smoke check in the browser**

Verify all of the following in `staff-management.html`:

- The first screen shows the compact toolbar instead of the old stacked summary strip plus list head.
- Staff cards are visibly shorter on desktop.
- `0` devices renders as `负责设备：-`.
- `1` to `3` devices render inline with no toggle.
- `4+` devices render `查看全部`, expand inside the current card, and collapse back to summary mode with `收起`.
- `编辑人员` and `停用账号 / 启用账号` still work from the new layout.
- Mobile layout remains unchanged at current breakpoints.

- [ ] **Step 4: Commit the verification checkpoint**

```bash
git add staff-management.html tests/staff-management.behavior.test.js
git commit -m "test: verify desktop staff density layout"
```
