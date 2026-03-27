# Staff Management Desktop Density Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compress the desktop staff-management list so the header and cards show more useful content before scrolling, while preserving the existing staff actions and data model.

**Architecture:** Keep the change self-contained inside `staff-management.html` and `tests/staff-management.behavior.test.js`. Replace the stacked desktop summary/list heading with one compact metadata row that also carries the existing add-person action, flatten each desktop staff card into a single-row layout, and add per-card UI-only expand/collapse state for long device lists. Preserve the current mobile/tablet render path instead of restyling it, and keep existing edit/account-toggle flows unchanged.

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
  assert.ok(/class="staff-toolbar-actions"/.test(staffHtml));
  assert.ok(/function\s+shouldUseCompactDesktopManagerLayout\s*\(\)/.test(staffHtml));
  assert.ok(!/class="summary-strip"/.test(staffHtml));
  assert.ok(!/class="list-head"/.test(staffHtml));

  const renderManagersBlockMatch = staffHtml.match(/function\s+renderManagers\s*\(\)\s*\{[\s\S]*?\n\s*function\s+updateStats/);
  assert.ok(renderManagersBlockMatch, '应存在 renderManagers 逻辑');
  const renderManagersBlock = renderManagersBlockMatch[0];

  assert.ok(/shouldUseCompactDesktopManagerLayout\(\)/.test(renderManagersBlock));
  assert.ok(/manager-row/.test(renderManagersBlock));
  assert.ok(/manager-detail-stack/.test(renderManagersBlock));
  assert.ok(/manager-device-summary/.test(renderManagersBlock));
  assert.ok(!/manager-panel manager-device-panel/.test(renderManagersBlock), '桌面端不应继续使用独立设备面板');
});

test('人员管理页：桌面端设备摘要在未展开时应遵循密度规则', () => {
  const helperMatch = staffHtml.match(/function\s+getManagerDeviceSummaryText\s*\(devices\)\s*\{[\s\S]*?\n\}/);
  assert.ok(helperMatch, '应存在桌面端设备摘要文本辅助逻辑');
  const helperScript = `${helperMatch[0]}\nmodule.exports = { getManagerDeviceSummaryText };`;
  const context = { module: { exports: {} } };
  vm.runInNewContext(helperScript, context);
  const { getManagerDeviceSummaryText } = context.module.exports;

  assert.strictEqual(getManagerDeviceSummaryText([]), '-');
  assert.strictEqual(getManagerDeviceSummaryText(['RCK001', 'RCK002']), 'RCK001、RCK002');
  assert.strictEqual(getManagerDeviceSummaryText(['RCK001', 'RCK002', 'RCK003', 'RCK004']), 'RCK001、RCK002 等 4 台');
  assert.ok(!/查看全部/.test(helperMatch[0]), 'Chunk 1 不应提前引入展开切换');
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
  <div class="staff-toolbar-actions">
    <button type="button" class="btn btn-primary" onclick="openStaffModal()">
      <span>➕</span>
      <span>添加人员</span>
    </button>
  </div>
</section>

<section class="list-card">
  <div class="manager-list" id="managerList"></div>
</section>
```

Keep the existing `openStaffModal()` handler, but move the desktop-visible primary action into `.staff-toolbar-actions` so the compact row matches the approved spec. Preserve the current page-header `添加人员` entry point for mobile/tablet only by hiding it at desktop widths and keeping the toolbar action hidden below the desktop breakpoint.

Before `renderManagers()`, add a small viewport helper such as:

```js
function shouldUseCompactDesktopManagerLayout() {
  return window.matchMedia('(min-width: 1024px)').matches;
}

function getManagerDeviceSummaryText(devices) {
  const normalizedDevices = Array.isArray(devices) ? devices.filter(Boolean) : [];
  const deviceCount = normalizedDevices.length;

  if (!deviceCount) return '-';
  if (deviceCount <= 3) return normalizedDevices.join('、');
  return `${normalizedDevices.slice(0, 2).join('、')} 等 ${deviceCount} 台`;
}
```

Then keep two explicit render branches in `renderManagers()`:

- desktop branch: new compact toolbar + `manager-row` card shell
- mobile/tablet branch: preserve the current stacked card structure and existing device section behavior

In this chunk, the desktop branch must already place the inline device summary inside `manager-detail-stack` with exact non-expanded rules:

- `0` devices: render `负责设备：-`
- `1` to `3` devices: render all device numbers inline
- `4+` devices: render `前两台设备号 + 等 N 台` as summary text, but do not add the `查看全部 / 收起` toggle until Chunk 2

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
    <div class="manager-detail-stack">
      <div class="manager-meta">...</div>
      <div class="manager-meta">...</div>
      <div class="manager-device-summary">
        <span class="manager-device-label">负责设备：</span>
        <span class="manager-device-text">...</span>
      </div>
    </div>
    <div class="manager-actions">...</div>
  </div>
</article>
```

- [ ] **Step 4: Add the desktop-only CSS for the compact toolbar and single-row card**

In `staff-management.html`, add or replace CSS with focused desktop classes wrapped in a desktop media query so the redesign is desktop-only:

```css
@media (min-width: 1024px) {
  .staff-toolbar {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
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

  .staff-toolbar-actions {
    display: flex;
    justify-content: flex-end;
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

  .manager-device-summary {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    min-width: 0;
  }

  .manager-device-text {
    min-width: 0;
  }

  .header-right.staff-mobile-action {
    display: none;
  }
}

@media (max-width: 1023px) {
  .staff-toolbar-actions {
    display: none;
  }

  .header-right.staff-mobile-action {
    display: flex;
  }
}
```

Do not collapse `.staff-toolbar` and `.manager-row` onto smaller widths. Instead, preserve the current mobile/tablet markup and styles as-is, and explicitly use `.staff-toolbar-actions` plus `.header-right.staff-mobile-action` as the visibility pair so only the desktop breakpoint shows the compact toolbar action.

- [ ] **Step 5: Re-run the staff behavior test to verify the new shell passes**

Run: `node tests/staff-management.behavior.test.js`

Expected: the new desktop-toolbar test passes, the desktop branch is guarded by the viewport helper, the inline desktop device summary exists without the legacy device panel, the desktop-visible `添加人员` action still calls `openStaffModal()`, and no existing staff-page behavior tests regress.

- [ ] **Step 6: Do a manual desktop shell smoke check**

Verify all of the following in the browser before moving to Chunk 2:

- The first screen shows more staff list content before scrolling than the old stacked summary/list heading.
- The compact toolbar contains the desktop-visible `添加人员` action.
- `0` devices render as `负责设备：-`.
- `1` to `3` devices render all device numbers inline.
- `4+` devices render only the first two device numbers plus `等 N 台`.
- Chunk 1 still does not show `查看全部 / 收起`.
- Mobile/tablet still use the existing header action and stacked card path.

- [ ] **Step 7: Commit the shell milestone**

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

Add a second targeted test that executes the device-summary helper and checks rendered behavior, not just source-text regexes. At the top of the test file, add `const vm = require('vm');`, then use a small harness like:

```js
test('人员管理页：桌面端负责设备应支持摘要与卡片内展开', () => {
  assert.ok(/let\s+expandedDeviceStaffIds\s*=\s*new Set\(\)/.test(staffHtml));
  assert.ok(/function\s+getManagerDeviceSummary\s*\(devices,\s*staffId\)/.test(staffHtml));
  assert.ok(/function\s+toggleManagerDevices\s*\(staffId\)/.test(staffHtml));
  assert.ok(/查看全部/.test(staffHtml));
  assert.ok(/收起/.test(staffHtml));

  const helperBlockMatch = staffHtml.match(/let\s+expandedDeviceStaffIds\s*=\s*new Set\(\);[\s\S]*?function\s+toggleManagerDevices\s*\(staffId\)\s*\{[\s\S]*?\n\}/);
  assert.ok(helperBlockMatch, '应存在设备摘要辅助逻辑');
  const helperScript = `${helperBlockMatch[0]}\nmodule.exports = { getManagerDeviceSummary, toggleManagerDevices };`;
  const context = {
    module: { exports: {} },
    window: { matchMedia: () => ({ matches: true }) },
    renderManagers() {}
  };
  vm.runInNewContext(helperScript, context);
  const { getManagerDeviceSummary, toggleManagerDevices } = context.module.exports;

  const noDevices = getManagerDeviceSummary([], 'staff-1');
  assert.strictEqual(noDevices.summaryText, '-');
  assert.strictEqual(noDevices.toggleText, '');

  const fewDevices = getManagerDeviceSummary(['RCK001', 'RCK002'], 'staff-2');
  assert.strictEqual(fewDevices.summaryText, 'RCK001、RCK002');
  assert.strictEqual(fewDevices.toggleText, '');

  const manyDevices = getManagerDeviceSummary(['RCK001', 'RCK002', 'RCK003', 'RCK004'], 'staff-3');
  assert.strictEqual(manyDevices.summaryText, 'RCK001、RCK002 等 4 台');
  assert.strictEqual(manyDevices.toggleText, '查看全部');

  toggleManagerDevices('staff-3');
  const expandedDevices = getManagerDeviceSummary(['RCK001', 'RCK002', 'RCK003', 'RCK004'], 'staff-3');
  assert.strictEqual(expandedDevices.toggleText, '收起');
  assert.ok(expandedDevices.expandedMarkup.includes('manager-device-chip'));

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

Update the desktop card template in `renderManagers()` so the detail column renders:

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

In the same step, keep the existing mobile/tablet render branch unchanged. Only the desktop branch should use the summary/toggle markup; smaller widths should continue using the current stacked device presentation so the redesign stays desktop-only.

- [ ] **Step 6: Add compact expanded-list styling**

Add CSS to `staff-management.html` for the new expanded section inside the desktop-only styling block:

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
  max-width: 100%;
  overflow-wrap: anywhere;
}

.manager-device-text {
  min-width: 0;
  overflow-wrap: anywhere;
}
```

Keep these styles inside the existing card system rather than introducing a new component file, and do not apply them to the preserved mobile/tablet card path.

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
- Repeated expand/collapse actions stay local to the clicked card and do not expand or collapse other staff cards.
- `编辑人员` and `停用账号 / 启用账号` still work from the new layout.
- Empty staff list still renders the current empty-state messaging and action hint.
- Before clicking `查看全部`, capture `localStorage.getItem('staffManagersData')`; after expand/collapse and after a reload, confirm the stored value is unchanged and the previously expanded card returns to summary mode.
- Mobile layout remains unchanged at current breakpoints.

- [ ] **Step 4: Commit the verification checkpoint**

```bash
git add staff-management.html tests/staff-management.behavior.test.js
git commit -m "test: verify desktop staff density layout"
```
