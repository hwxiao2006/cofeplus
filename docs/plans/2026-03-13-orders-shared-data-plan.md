# Orders Shared Data And Preview Orders Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Centralize default device and product mock data, add pseudo-order creation in the menu preview flow, and make `orders.html` render merged preview-plus-fallback orders with at least 20 records.

**Architecture:** Extract canonical device and product defaults into one browser-side shared script, then have `devices.html`, `menu-management.html`, and `orders.html` consume that shared source instead of owning divergent defaults. Keep current page-specific localStorage layering intact by applying saved menu edits and preview-created pseudo-orders on top of the shared defaults before order rendering.

**Tech Stack:** Static HTML pages with inline JavaScript, browser `localStorage`, Node `assert`/`vm` tests, regex-based HTML tests.

---

### Task 1: Add shared mock-data source and test harness support

**Files:**
- Create: `shared/admin-mock-data.js`
- Modify: `tests/menu-management.behavior.test.js`
- Create: `tests/shared.admin-mock-data.test.js`

**Step 1: Write the failing tests**

```js
// tests/shared.admin-mock-data.test.js
assert.ok(/COFE_SHARED_MOCK_DATA/.test(sharedJs));
assert.ok(/defaultDevices/.test(sharedJs));
assert.ok(/defaultProducts/.test(sharedJs));
```

```js
// tests/menu-management.behavior.test.js
const sharedScript = fs.readFileSync(path.join(__dirname, '..', 'shared', 'admin-mock-data.js'), 'utf8');
vm.runInContext(sharedScript, context);
assert.ok(context.window.COFE_SHARED_MOCK_DATA);
```

**Step 2: Run tests to verify they fail**

Run: `node tests/shared.admin-mock-data.test.js && node tests/menu-management.behavior.test.js`
Expected: FAIL because `shared/admin-mock-data.js` does not exist and the harness does not load shared globals.

**Step 3: Write minimal implementation**

```js
(function initSharedMockData(global) {
  const COFE_SHARED_MOCK_DATA = {
    defaultDevices: [],
    defaultProducts: {},
    maps: {},
    helpers: {
      clone(value) {
        return JSON.parse(JSON.stringify(value));
      }
    }
  };
  global.COFE_SHARED_MOCK_DATA = COFE_SHARED_MOCK_DATA;
})(window);
```

Update the menu-management test harness to load the shared script into the VM context before the page script.

**Step 4: Run tests to verify they pass**

Run: `node tests/shared.admin-mock-data.test.js && node tests/menu-management.behavior.test.js`
Expected: PASS for the new shared-data existence checks, with no regressions in the menu behavior harness.

**Step 5: Commit**

```bash
git add shared/admin-mock-data.js tests/shared.admin-mock-data.test.js tests/menu-management.behavior.test.js
git commit -m "feat: add shared admin mock data source"
```

### Task 2: Move default devices and products onto the shared source

**Files:**
- Modify: `devices.html`
- Modify: `menu-management.html`
- Modify: `tests/menu-management.behavior.test.js`
- Modify: `tests/orders.multi-items.test.js`

**Step 1: Write the failing tests**

```js
// tests/menu-management.behavior.test.js
assert.ok(ctx.window.COFE_SHARED_MOCK_DATA.defaultProducts);
```

```js
// tests/orders.multi-items.test.js
assert.ok(/shared\/admin-mock-data\.js/.test(html));
```

**Step 2: Run tests to verify they fail**

Run: `node tests/menu-management.behavior.test.js && node tests/orders.multi-items.test.js`
Expected: FAIL because the pages still own inline defaults.

**Step 3: Write minimal implementation**

```html
<script src="shared/admin-mock-data.js"></script>
<script>
const sharedMock = window.COFE_SHARED_MOCK_DATA;
const defaultDevicesData = sharedMock.helpers.clone(sharedMock.defaultDevices);
let productsData = sharedMock.helpers.clone(sharedMock.defaultProducts);
</script>
```

Refactor the existing inline device/product defaults out of the page scripts and into `shared/admin-mock-data.js` without changing their shape.

**Step 4: Run tests to verify they pass**

Run: `node tests/menu-management.behavior.test.js && node tests/orders.multi-items.test.js`
Expected: PASS, and no page should keep an independent canonical copy of the default device/product catalog.

**Step 5: Commit**

```bash
git add shared/admin-mock-data.js devices.html menu-management.html tests/menu-management.behavior.test.js tests/orders.multi-items.test.js
git commit -m "refactor: load shared devices and products"
```

### Task 3: Add pseudo-order creation to the order-preview product detail

**Files:**
- Modify: `menu-management.html`
- Modify: `tests/menu-management.behavior.test.js`

**Step 1: Write the failing test**

```js
test('点单屏预览：伪下单应把当前商品与选项写入订单记录', () => {
  const ctx = loadMenuContext();
  ctx.openOrderPreviewModal();
  ctx.openOrderPreviewProductDetail(1, encodeURIComponent('分类A'));
  ctx.selectOrderPreviewDetailOption('cupsize', encodeURIComponent('355ml'));
  ctx.changeOrderPreviewDetailQuantity(1);
  ctx.createPreviewOrder();
  const saved = JSON.parse(ctx.localStorage.getItem('ordersPreviewRecords') || '[]');
  assert.strictEqual(saved.length, 1);
  assert.strictEqual(saved[0].orderItems[0].quantity, 2);
});
```

**Step 2: Run test to verify it fails**

Run: `node tests/menu-management.behavior.test.js`
Expected: FAIL because there is no pseudo-order action or persistence function.

**Step 3: Write minimal implementation**

```js
const ORDERS_PREVIEW_RECORDS_KEY = 'ordersPreviewRecords';
function createPreviewOrder() {
  const found = findOrderPreviewProduct(orderPreviewDetailState.productId, orderPreviewDetailState.categoryKey);
  const order = buildPreviewOrderRecord(found.product, orderPreviewDetailState, currentDevice);
  const existing = JSON.parse(localStorage.getItem(ORDERS_PREVIEW_RECORDS_KEY) || '[]');
  localStorage.setItem(ORDERS_PREVIEW_RECORDS_KEY, JSON.stringify([order, ...existing]));
}
```

Add a button in the product-detail overlay markup that calls `createPreviewOrder()`.

**Step 4: Run test to verify it passes**

Run: `node tests/menu-management.behavior.test.js`
Expected: PASS with the new persisted pseudo-order assertion and no regressions in existing preview behavior.

**Step 5: Commit**

```bash
git add menu-management.html tests/menu-management.behavior.test.js
git commit -m "feat: persist pseudo orders from menu preview"
```

### Task 4: Rebuild orders data loading from shared devices, shared products, and preview orders

**Files:**
- Modify: `orders.html`
- Modify: `tests/orders.multi-items.test.js`
- Modify: `tests/orders.search-dimensions.test.js`
- Create: `tests/orders.shared-source.test.js`

**Step 1: Write the failing tests**

```js
// tests/orders.shared-source.test.js
assert.ok(/shared\/admin-mock-data\.js/.test(html));
assert.ok(/function\s+loadRuntimeDevices\(/.test(html));
assert.ok(/function\s+loadRuntimeProducts\(/.test(html));
assert.ok(/function\s+buildFallbackOrders\(/.test(html));
assert.ok(/function\s+loadOrdersData\(/.test(html));
```

```js
// tests/orders.multi-items.test.js
assert.ok(/at least 20/i.test(runtimeAssertionSource) || /length\s*>=\s*20/.test(html));
```

**Step 2: Run tests to verify they fail**

Run: `node tests/orders.shared-source.test.js && node tests/orders.multi-items.test.js && node tests/orders.search-dimensions.test.js`
Expected: FAIL because `orders.html` still uses inline `deviceContextMap` and handwritten `ordersData`.

**Step 3: Write minimal implementation**

```js
function loadRuntimeDevices() {
  const stored = JSON.parse(localStorage.getItem('devicesData') || '[]');
  const source = stored.length ? stored : sharedMock.defaultDevices;
  return source.filter(device => device.entered !== false);
}

function loadRuntimeProducts() {
  const products = sharedMock.helpers.clone(sharedMock.defaultProducts);
  applySavedProductEditsToProducts(products);
  return flattenProducts(products);
}

function loadOrdersData() {
  const preview = loadPreviewOrders();
  const fallback = buildFallbackOrders(loadRuntimeDevices(), loadRuntimeProducts(), Math.max(20, 24 - preview.length));
  return dedupeAndSortOrders([...preview, ...fallback]);
}
```

Replace direct `ordersData` ownership with `loadOrdersData()` and derive device filter options from the same runtime device list.

**Step 4: Run tests to verify they pass**

Run: `node tests/orders.shared-source.test.js && node tests/orders.multi-items.test.js && node tests/orders.search-dimensions.test.js`
Expected: PASS, with orders sourced from shared data and total fallback coverage still at or above 20.

**Step 5: Commit**

```bash
git add orders.html tests/orders.shared-source.test.js tests/orders.multi-items.test.js tests/orders.search-dimensions.test.js
git commit -m "feat: load orders from shared sources"
```

### Task 5: Preserve existing order behaviors with generated orders

**Files:**
- Modify: `orders.html`
- Modify: `tests/orders.refund-modes.test.js`
- Modify: `tests/orders.mobile-workspace.test.js`
- Modify: `tests/orders.variant-c-layout.test.js`

**Step 1: Write the failing regression tests**

```js
assert.ok(generatedOrder.orderItems.length >= 1);
assert.ok(typeof generatedOrder.amount !== 'undefined');
assert.ok(typeof generatedOrder.currency !== 'undefined');
```

Add assertions that generated orders still satisfy mobile product popovers, multi-currency formatting, and refund payload requirements.

**Step 2: Run tests to verify they fail**

Run: `node tests/orders.mobile-workspace.test.js && node tests/orders.variant-c-layout.test.js && node tests/orders.refund-modes.test.js`
Expected: FAIL if generated orders do not populate the same fields as handwritten mocks.

**Step 3: Write minimal implementation**

```js
function normalizeGeneratedOrder(order) {
  return {
    ...order,
    items: expandOrderItemsByQuantity(order.orderItems).length,
    product: buildLegacyProductSummary(order.orderItems),
    specs: '',
    currency: getOrderCurrency(order)
  };
}
```

Use the normalized structure everywhere current render, metrics, and refund logic expects legacy fields.

**Step 4: Run tests to verify they pass**

Run: `node tests/orders.mobile-workspace.test.js && node tests/orders.variant-c-layout.test.js && node tests/orders.refund-modes.test.js`
Expected: PASS, showing that generated/shared orders keep the current UI and refund behavior intact.

**Step 5: Commit**

```bash
git add orders.html tests/orders.mobile-workspace.test.js tests/orders.variant-c-layout.test.js tests/orders.refund-modes.test.js
git commit -m "fix: normalize generated orders for existing workflows"
```

### Task 6: Run the full verification suite

**Files:**
- Modify: `docs/plans/2026-03-13-orders-shared-data-design.md`
- Modify: `docs/plans/2026-03-13-orders-shared-data-plan.md`

**Step 1: Write the failing verification checklist**

```md
- [ ] shared source loaded by all three pages
- [ ] pseudo-order persisted from preview page
- [ ] orders page renders >= 20 records
- [ ] existing order regressions pass
```

**Step 2: Run tests to verify the checklist still has gaps**

Run: `git diff --stat`
Expected: output shows implementation touched the expected pages and tests.

**Step 3: Write minimal implementation**

Update the docs with any file-path or command drift discovered during execution.

**Step 4: Run test to verify it passes**

Run:
```bash
node tests/shared.admin-mock-data.test.js && \
node tests/menu-management.behavior.test.js && \
node tests/orders.desktop-command-center.test.js && \
node tests/orders.variant-c-layout.test.js && \
node tests/orders.metrics-summary.test.js && \
node tests/orders.mobile-filter-layout.test.js && \
node tests/orders.mobile-workspace.test.js && \
node tests/orders.multi-currency.test.js && \
node tests/orders.multi-items.test.js && \
node tests/orders.search-dimensions.test.js && \
node tests/orders.refund-modes.test.js && \
node tests/orders.shared-source.test.js && \
node -e "const fs=require('fs');const html=fs.readFileSync('orders.html','utf8');const m=html.match(/<script>([\\s\\S]*)<\\/script>/); if(m){ new Function(m[1]); } console.log('SCRIPT_OK');"
```
Expected: All PASS and `SCRIPT_OK`.

**Step 5: Commit**

```bash
git add shared/admin-mock-data.js devices.html menu-management.html orders.html tests docs/plans/2026-03-13-orders-shared-data-design.md docs/plans/2026-03-13-orders-shared-data-plan.md
git commit -m "feat: unify order mock sources with preview-generated orders"
```
