# Product Detail Return State Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Preserve the menu-management list context when leaving for product detail and restore the same filtered list and scroll position after save or cancel.

**Architecture:** Persist a temporary return-state snapshot from `menu-management.html` before navigating to `product-detail.html`. On detail save/cancel, navigate back to menu management with the same tab/device context, then let `menu-management.html` restore filters and scroll from the saved snapshot during initialization and clear the one-time state after applying it.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Node-based behavior tests.

---

### Task 1: Define and verify return-state behavior in tests

**Files:**
- Modify: `/Users/tigerhuang/cofeplus/tests/menu-management.behavior.test.js`
- Modify: `/Users/tigerhuang/cofeplus/tests/product-detail.pricing.test.js`

**Step 1: Write the failing tests**

Add tests that assert:
```js
ctx.currentDevice = 'RCK112';
ctx.currentMenuInnerTab = 'manage';
ctx.menuSharedCategoryFilter = '奶咖系列';
ctx.menuManageActiveCategory = '奶咖系列';
ctx.menuManageProductKeyword = '拿铁';
ctx.menuManageProductScope = 'all';
ctx.window.scrollY = 480;
ctx.goToDetail(2);

const saved = JSON.parse(ctx.sessionStorage.getItem('menuManagementReturnState'));
assert.strictEqual(saved.device, 'RCK112');
assert.strictEqual(saved.categoryFilter, '奶咖系列');
assert.strictEqual(saved.productKeyword, '拿铁');
assert.strictEqual(saved.productScope, 'all');
assert.strictEqual(saved.scrollY, 480);
```

And in the static detail-page tests assert:
```js
assert.ok(/menuManagementReturnState/.test(html));
assert.ok(/restoreMenuManagementReturnUrl\(/.test(html));
assert.ok(/function\s+goBack\s*\(/.test(html));
```

**Step 2: Run tests to verify they fail**

Run: `node tests/menu-management.behavior.test.js && node tests/product-detail.pricing.test.js`
Expected: failures because no return state is persisted or consumed yet.

**Step 3: Write minimal implementation**

No implementation in this task.

**Step 4: Run tests to verify they still fail for the expected reason**

Run: `node tests/menu-management.behavior.test.js`
Expected: the new tests fail due to missing return-state handling.

**Step 5: Commit**

```bash
git add /Users/tigerhuang/cofeplus/tests/menu-management.behavior.test.js /Users/tigerhuang/cofeplus/tests/product-detail.pricing.test.js
git commit -m "test: cover menu detail return state"
```

### Task 2: Save menu-management context before opening product detail

**Files:**
- Modify: `/Users/tigerhuang/cofeplus/menu-management.html`
- Test: `/Users/tigerhuang/cofeplus/tests/menu-management.behavior.test.js`

**Step 1: Write the failing test**

Use the Task 1 test as the red test for `goToDetail()`.

**Step 2: Run test to verify it fails**

Run: `node tests/menu-management.behavior.test.js`
Expected: FAIL because `sessionStorage` has no `menuManagementReturnState`.

**Step 3: Write minimal implementation**

Add helpers near the shared menu state:
```js
const MENU_MANAGEMENT_RETURN_STATE_KEY = 'menuManagementReturnState';

function buildMenuManagementReturnState() {
  return {
    device: currentDevice,
    tab: 'menu',
    innerTab: currentMenuInnerTab,
    categoryFilter: menuSharedCategoryFilter,
    activeCategory: menuManageActiveCategory,
    productKeyword: menuManageProductKeyword,
    productScope: menuManageProductScope,
    scrollY: window.scrollY || 0
  };
}
```

Call `sessionStorage.setItem(MENU_MANAGEMENT_RETURN_STATE_KEY, JSON.stringify(...))` inside `goToDetail()` before redirecting.

**Step 4: Run test to verify it passes**

Run: `node tests/menu-management.behavior.test.js`
Expected: the new `goToDetail()` return-state test passes.

**Step 5: Commit**

```bash
git add /Users/tigerhuang/cofeplus/menu-management.html /Users/tigerhuang/cofeplus/tests/menu-management.behavior.test.js
git commit -m "feat: persist menu detail return state"
```

### Task 3: Restore return state on detail back/save and apply it on menu load

**Files:**
- Modify: `/Users/tigerhuang/cofeplus/product-detail.html`
- Modify: `/Users/tigerhuang/cofeplus/menu-management.html`
- Modify: `/Users/tigerhuang/cofeplus/tests/menu-management.behavior.test.js`
- Modify: `/Users/tigerhuang/cofeplus/tests/product-detail.pricing.test.js`

**Step 1: Write the failing tests**

Add tests/assertions that cover:
```js
const saved = {
  device: 'RCK112',
  tab: 'menu',
  innerTab: 'manage',
  categoryFilter: '奶咖系列',
  activeCategory: '奶咖系列',
  productKeyword: '拿铁',
  productScope: 'all',
  scrollY: 480
};
ctx.sessionStorage.setItem('menuManagementReturnState', JSON.stringify(saved));
ctx.window.location.search = '?tab=menu&innerTab=manage';
ctx.initPage();
assert.strictEqual(ctx.menuSharedCategoryFilter, '奶咖系列');
assert.strictEqual(ctx.menuManageProductKeyword, '拿铁');
assert.strictEqual(ctx.menuManageProductScope, 'all');
assert.strictEqual(ctx.window.__lastScrollTo.top, 480);
assert.strictEqual(ctx.sessionStorage.getItem('menuManagementReturnState'), null);
```

And regex tests for detail page:
```js
assert.ok(/sessionStorage\.getItem\(MENU_MANAGEMENT_RETURN_STATE_KEY\)/.test(html));
assert.ok(/window\.location\.href = buildMenuManagementReturnUrl\(\)/.test(html));
```

**Step 2: Run tests to verify they fail**

Run: `node tests/menu-management.behavior.test.js && node tests/product-detail.pricing.test.js`
Expected: FAIL because restore helpers and detail-page return URL logic do not exist.

**Step 3: Write minimal implementation**

In `product-detail.html`, add:
```js
const MENU_MANAGEMENT_RETURN_STATE_KEY = 'menuManagementReturnState';

function buildMenuManagementReturnUrl() {
  let returnState = null;
  try {
    returnState = JSON.parse(sessionStorage.getItem(MENU_MANAGEMENT_RETURN_STATE_KEY) || 'null');
  } catch (e) {}
  const params = new URLSearchParams();
  params.set('tab', returnState?.tab || 'menu');
  params.set('innerTab', returnState?.innerTab || 'manage');
  if (returnState?.device) params.set('device', returnState.device);
  return `menu-management.html?${params.toString()}`;
}
```

Update `goBack()` to use `buildMenuManagementReturnUrl()`.

In `menu-management.html`, add one-time restore helpers that:
- read `MENU_MANAGEMENT_RETURN_STATE_KEY`
- apply `currentDevice`, `currentTab`, `currentMenuInnerTab`, `menuSharedCategoryFilter`, `menuManageActiveCategory`, `menuManageProductKeyword`, `batchFixedPriceKeyword`, `menuManageProductScope`
- call `window.scrollTo({ top: scrollY, behavior: 'auto' })`
- remove the session key after successful restore

Hook this restore into initialization after the menu data and UI are ready.

**Step 4: Run tests to verify it passes**

Run: `node tests/menu-management.behavior.test.js && node tests/product-detail.pricing.test.js`
Expected: PASS.

**Step 5: Commit**

```bash
git add /Users/tigerhuang/cofeplus/menu-management.html /Users/tigerhuang/cofeplus/product-detail.html /Users/tigerhuang/cofeplus/tests/menu-management.behavior.test.js /Users/tigerhuang/cofeplus/tests/product-detail.pricing.test.js
git commit -m "feat: restore menu list state after detail"
```
