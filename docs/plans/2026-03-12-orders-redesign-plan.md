# Orders Page Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign `orders.html` into a premium SaaS-style order workspace with dynamic daily metrics, a structured filter panel, redesigned desktop order cards, and a streamlined mobile order flow.

**Architecture:** Keep all existing order data, filtering, refund, coupon, and pagination logic in `orders.html`, but replace the legacy page composition and CSS with a new section hierarchy. Protect the redesign with dedicated layout regression tests while preserving the existing behavior-oriented tests.

**Tech Stack:** Static HTML, CSS, inline JavaScript, Node-based regex tests in `tests/*.test.js`

---

### Task 1: Lock the approved redesign structure with tests

**Files:**
- Create: `tests/orders.redesign-layout.test.js`
- Create: `tests/orders.mobile-workspace.test.js`
- Modify: `tests/orders.desktop-command-center.test.js`
- Test: `tests/orders.redesign-layout.test.js`
- Test: `tests/orders.mobile-workspace.test.js`

**Step 1: Write the failing desktop redesign test**

```js
test('订单页应提供标题区、三张动态指标卡、总控面板和订单工作区', () => {
  assert.ok(/今日销售动态与订单处理/.test(html));
  assert.ok(/今日支付金额/.test(html));
  assert.ok(/今日完成订单/.test(html));
  assert.ok(/客单价/.test(html));
  assert.ok(/order-workspace/.test(html));
});
```

**Step 2: Run test to verify it fails**

Run: `node tests/orders.redesign-layout.test.js`
Expected: FAIL because the new sections do not exist yet

**Step 3: Write the failing mobile redesign test**

```js
test('移动端应提供快捷筛选行和筛选底部弹层结构', () => {
  assert.ok(/mobile-filter-bar/.test(html));
  assert.ok(/mobileFilterSheet/.test(html));
});
```

**Step 4: Run test to verify it fails**

Run: `node tests/orders.mobile-workspace.test.js`
Expected: FAIL because the mobile redesign structure is missing

**Step 5: Update the existing desktop layout test to reflect the new composition**

```js
test('桌面端订单页应使用指标区与订单工作区的新布局', () => {
  assert.ok(/metrics-grid/.test(html));
  assert.ok(/order-card-list/.test(html));
});
```

**Step 6: Run the updated desktop test to verify it fails**

Run: `node tests/orders.desktop-command-center.test.js`
Expected: FAIL because the old layout assertions no longer match

### Task 2: Rebuild the page shell and desktop composition

**Files:**
- Modify: `orders.html`
- Test: `tests/orders.redesign-layout.test.js`
- Test: `tests/orders.desktop-command-center.test.js`

**Step 1: Replace the top-of-page markup with the new header and metrics row**

```html
<section class="orders-hero">
  <div class="orders-hero-copy">
    <h1 class="header-title">订单管理</h1>
    <p class="header-desc">今日销售动态与订单处理</p>
  </div>
</section>
<section class="metrics-grid">...</section>
```

**Step 2: Rebuild the filter area as a two-row master control panel**

```html
<section class="orders-control-panel">
  <div class="control-panel-primary">...</div>
  <div class="control-panel-secondary">...</div>
</section>
```

**Step 3: Replace the legacy stats bar and pagination bar placement with a lightweight list toolbar**

```html
<div class="order-list-toolbar">
  <span class="results-count">...</span>
  <div class="order-list-sort">...</div>
</div>
```

**Step 4: Run the desktop redesign tests**

Run: `node tests/orders.redesign-layout.test.js && node tests/orders.desktop-command-center.test.js`
Expected: PASS for the new structural assertions

### Task 3: Redesign desktop order rows into workspace cards

**Files:**
- Modify: `orders.html`
- Test: `tests/orders.multi-items.test.js`
- Test: `tests/orders.redesign-layout.test.js`

**Step 1: Update desktop order rendering to emit card-based markup instead of rigid table-feeling rows**

```js
return `
  <article class="order-workspace-card">
    <div class="order-workspace-main">...</div>
    <div class="order-workspace-side">...</div>
  </article>
`;
```

**Step 2: Keep product expansion logic compact and preserve multi-item rendering**

```js
const visibleItems = expandedItems.slice(0, 2);
const overflowCount = Math.max(0, expandedItems.length - 2);
```

**Step 3: Style the card shell, hierarchy, amount block, and action area**

```css
.order-workspace-card { ... }
.order-workspace-main { ... }
.order-workspace-side { ... }
```

**Step 4: Run the multi-item and desktop redesign tests**

Run: `node tests/orders.multi-items.test.js && node tests/orders.redesign-layout.test.js`
Expected: PASS with product rendering still intact

### Task 4: Rebuild the mobile experience around a quick filter bar and order stream cards

**Files:**
- Modify: `orders.html`
- Test: `tests/orders.mobile-workspace.test.js`
- Test: `tests/orders.mobile-filter-layout.test.js`

**Step 1: Add a compact mobile quick filter row**

```html
<div class="mobile-filter-bar">
  <button ...>搜索</button>
  <button ...>状态</button>
  <button ...>设备</button>
  <button ...>筛选</button>
</div>
```

**Step 2: Add the mobile filter bottom sheet shell**

```html
<div class="modal-overlay" id="mobileFilterSheet">
  <div class="mobile-filter-sheet">...</div>
</div>
```

**Step 3: Update mobile card rendering to match the approved hierarchy**

```js
return `
  <article class="mobile-order-card mobile-order-stream-card">
    <div class="mobile-card-top">...</div>
    <div class="mobile-card-meta">...</div>
    <div class="mobile-order-actions">...</div>
  </article>
`;
```

**Step 4: Run the mobile redesign tests**

Run: `node tests/orders.mobile-workspace.test.js && node tests/orders.mobile-filter-layout.test.js`
Expected: PASS with the new mobile structure

### Task 5: Wire the metric cards to current-day order data

**Files:**
- Modify: `orders.html`
- Create: `tests/orders.metrics-summary.test.js`
- Test: `tests/orders.metrics-summary.test.js`

**Step 1: Write the failing metric summary test**

```js
test('订单页应渲染今日支付金额、今日完成订单和客单价', () => {
  assert.ok(/id="metricPaidAmount"/.test(html));
  assert.ok(/id="metricCompletedOrders"/.test(html));
  assert.ok(/id="metricAverageTicket"/.test(html));
});
```

**Step 2: Run test to verify it fails**

Run: `node tests/orders.metrics-summary.test.js`
Expected: FAIL because the metric IDs and logic do not exist yet

**Step 3: Add minimal summary helpers**

```js
function calculateTodayOrderMetrics(orderList) {
  return { paidAmount, completedOrders, averageTicket };
}
```

**Step 4: Render the values into the three cards**

```js
document.getElementById('metricPaidAmount').textContent = ...;
document.getElementById('metricCompletedOrders').textContent = ...;
document.getElementById('metricAverageTicket').textContent = ...;
```

**Step 5: Run the metric test**

Run: `node tests/orders.metrics-summary.test.js`
Expected: PASS

### Task 6: Reconcile styling, preserve behavior, and run the full orders suite

**Files:**
- Modify: `orders.html`
- Test: `tests/orders.desktop-command-center.test.js`
- Test: `tests/orders.mobile-filter-layout.test.js`
- Test: `tests/orders.mobile-workspace.test.js`
- Test: `tests/orders.metrics-summary.test.js`
- Test: `tests/orders.multi-currency.test.js`
- Test: `tests/orders.multi-items.test.js`
- Test: `tests/orders.refund-modes.test.js`
- Test: `tests/orders.search-dimensions.test.js`

**Step 1: Clean spacing, card radii, typography, and responsive breakpoints**

```css
.orders-hero { ... }
.metrics-grid { ... }
.orders-control-panel { ... }
.order-workspace-card { ... }
.mobile-filter-sheet { ... }
```

**Step 2: Verify existing refund, filter, and multi-currency behaviors remain connected**

```js
openRefundModal(orderId);
filterOrders();
formatMoneyByCurrency(amount, currency);
```

**Step 3: Run the full order test suite**

Run: `for f in tests/orders*.test.js; do node "$f" || exit 1; done`
Expected: all order tests PASS

**Step 4: Review the page manually in desktop and mobile widths**

Run: open `orders.html` in the browser and inspect desktop plus responsive mobile widths
Expected: the page matches the approved redesign and all actions remain visible
