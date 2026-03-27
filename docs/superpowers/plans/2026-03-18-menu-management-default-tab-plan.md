# Menu Management Default Tab Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make 商品管理模块 default to `菜单管理`, reorder the inner-tab buttons to put `菜单管理` first, and preserve explicit `innerTab` overrides.

**Architecture:** Keep the change isolated to `menu-management.html` and `tests/menu-management.behavior.test.js`. Update the behavior tests first so they describe the new default order and selection behavior, then make the smallest production changes needed: reorder the tab button markup, switch the fallback default from `settings` to `manage`, and keep explicit URL or restored-state inner-tab values untouched.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Node-based behavior tests

---

## Chunk 1: Lock The New Default Tab Behavior

### Task 1: Update behavior tests to describe the new tab order and fallback

**Files:**
- Modify: `tests/menu-management.behavior.test.js`
- Test: `tests/menu-management.behavior.test.js`

- [ ] **Step 1: Update the test harness fallback tab to match the page default**

In `loadMenuContext()`, change the string replacement for `currentMenuInnerTab` from:

```js
.replace("let currentMenuInnerTab = 'settings';", "globalThis.currentMenuInnerTab = 'settings';")
```

to:

```js
.replace("let currentMenuInnerTab = 'manage';", "globalThis.currentMenuInnerTab = 'manage';")
```

This keeps the vm test harness aligned with the real page after the production default changes.

- [ ] **Step 2: Rewrite the existing tab-presence test to assert visual order**

Replace the current `菜单管理主页面应包含基础设置、菜单管理、批量改价三个tab` assertion block with checks that still verify all three buttons and panels exist, and also assert the button text appears in this order inside `menu-management.html`:

```js
const settingsIndex = html.indexOf('id="menuInnerTabSettingsBtn"');
const manageIndex = html.indexOf('id="menuInnerTabManageBtn"');
const batchIndex = html.indexOf('id="menuInnerTabBatchBtn"');

assert.ok(manageIndex > -1);
assert.ok(settingsIndex > -1);
assert.ok(batchIndex > -1);
assert.ok(manageIndex < settingsIndex);
assert.ok(settingsIndex < batchIndex);
```

Keep the existing panel assertions:

```js
assert.ok(html.includes('menuSettingsPanel'));
assert.ok(html.includes('menuManagePanel'));
assert.ok(html.includes('menuBatchPanel'));
```

- [ ] **Step 3: Add a new failing test for the default init selection**

Add a new test near the other `init()` tests:

```js
test('菜单管理页初始化时默认应打开菜单管理tab', () => {
  const ctx = loadMenuContext();
  assert.strictEqual(typeof ctx.init, 'function');
  ctx.window.location.search = '?tab=menu';
  ctx.init();

  assert.strictEqual(ctx.document.getElementById('menuInnerTabManageBtn').classList.contains('active'), true);
  assert.strictEqual(ctx.document.getElementById('menuInnerTabSettingsBtn').classList.contains('active'), false);
  assert.strictEqual(ctx.document.getElementById('menuInnerTabBatchBtn').classList.contains('active'), false);
});
```

- [ ] **Step 4: Add a new failing test that explicit `innerTab=settings` still wins**

Add one more test beside the other explicit `innerTab` tests:

```js
test('菜单管理页初始化时应支持通过 innerTab 参数选中基本设置', () => {
  const ctx = loadMenuContext();
  ctx.window.location.search = '?tab=menu&innerTab=settings';
  ctx.init();

  assert.strictEqual(ctx.document.getElementById('menuInnerTabSettingsBtn').classList.contains('active'), true);
  assert.strictEqual(ctx.document.getElementById('menuInnerTabManageBtn').classList.contains('active'), false);
  assert.strictEqual(ctx.document.getElementById('menuInnerTabBatchBtn').classList.contains('active'), false);
});
```

- [ ] **Step 5: Run the targeted menu-management behavior test to verify RED**

Run: `node tests/menu-management.behavior.test.js`

Expected: FAIL because the page still renders `基本设置` before `菜单管理`, and the initial fallback tab is still `settings`.

- [ ] **Step 6: Commit the failing-test checkpoint**

```bash
git add tests/menu-management.behavior.test.js
git commit -m "test: lock menu management default tab behavior"
```

### Task 2: Implement the new default inner-tab order and fallback

**Files:**
- Modify: `menu-management.html`
- Test: `tests/menu-management.behavior.test.js`

- [ ] **Step 1: Reorder the inner-tab button markup**

In `menu-management.html`, reorder the buttons so the markup becomes:

```html
<button type="button" id="menuInnerTabManageBtn" class="menu-inner-tab-btn active" onclick="switchMenuInnerTab('manage')">菜单管理</button>
<button type="button" id="menuInnerTabSettingsBtn" class="menu-inner-tab-btn" onclick="switchMenuInnerTab('settings')">基本设置</button>
<button type="button" id="menuInnerTabBatchBtn" class="menu-inner-tab-btn" onclick="switchMenuInnerTab('batch')">批量改价</button>
```

Only reorder the buttons and the initial `active` class. Do not rename IDs, handlers, or panel IDs.

- [ ] **Step 2: Change the page-level fallback inner tab from `settings` to `manage`**

In `menu-management.html`, change:

```js
let currentMenuInnerTab = 'settings';
```

to:

```js
let currentMenuInnerTab = 'manage';
```

- [ ] **Step 3: Review fallback logic so explicit targets still win**

Inspect the `init()` and restored-state code paths around `innerTab` parsing and return-state restoration.

Confirm the logic still behaves like this without adding new branches:

```js
if (innerTab === 'manage' || innerTab === 'settings' || innerTab === 'batch') {
  currentMenuInnerTab = innerTab;
}
```

and:

```js
if (state.innerTab === 'manage' || state.innerTab === 'settings' || state.innerTab === 'batch') {
  currentMenuInnerTab = state.innerTab;
}
```

Only change these paths if they still contain a hard-coded fallback to `settings`. Do not weaken explicit override precedence.

- [ ] **Step 4: Run the targeted menu-management behavior test to verify GREEN**

Run: `node tests/menu-management.behavior.test.js`

Expected: PASS, including:

- the reordered tab markup assertion
- the new default-init assertion
- the explicit `innerTab=settings` assertion
- the existing explicit `innerTab=manage` and `innerTab=batch` assertions
- the tab-switch active-state assertions

- [ ] **Step 5: Commit the production change**

```bash
git add menu-management.html tests/menu-management.behavior.test.js
git commit -m "feat: default menu management to manage tab"
```

### Task 3: Run adjacent regression checks and manual verification

**Files:**
- Verify: `menu-management.html`
- Verify: `tests/menu-management.behavior.test.js`
- Verify: `tests/product-detail.pricing.test.js`

- [ ] **Step 1: Re-run the targeted product-detail regression**

Run: `node tests/product-detail.pricing.test.js`

Expected: PASS, confirming the detail-page return path still points to `menu-management.html?tab=menu&innerTab=manage`.

- [ ] **Step 2: Manually verify the default entry behavior**

Open `menu-management.html` and confirm:

- the visible tab order is `菜单管理 / 基本设置 / 批量改价`
- opening the page lands on `菜单管理`
- `?tab=menu&innerTab=settings` still opens `基本设置`
- `?tab=menu&innerTab=batch` still opens `批量改价`

- [ ] **Step 3: Commit the verification checkpoint**

```bash
git add menu-management.html tests/menu-management.behavior.test.js
git commit -m "test: verify menu management default tab flow"
```
