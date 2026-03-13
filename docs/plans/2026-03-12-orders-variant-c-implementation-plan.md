# Orders Variant C Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate the approved Variant C order layout into `orders.html`, keeping the desktop page as a frozen-right decision table and adding a native mobile order stream.

**Architecture:** Reuse existing order data, metrics, filters, refund flow, and pagination logic. Replace the current desktop card rendering with a high-density table renderer, keep the right-side action/status/amount columns visually stable, and introduce a simplified order-products popover plus a dedicated mobile-card renderer for narrow screens.

**Tech Stack:** Plain HTML/CSS/JavaScript, Node-based HTML regression tests.

---

### Task 1: Lock the approved Variant C layout in a failing test

**Files:**
- Create: `tests/orders.variant-c-layout.test.js`
- Test: `tests/orders.variant-c-layout.test.js`

**Step 1: Write the failing test**
- Assert `orders.html` contains a desktop table shell for orders.
- Assert the desktop table exposes:
  - 订单号
  - 时间
  - 商品
  - 门店
  - 设备
  - 取货码
  - 状态
  - 金额
  - 操作
- Assert the desktop product cell supports a `+N件` trigger and a products popover container.
- Assert the mobile section contains a dedicated mobile order stream layout.
- Assert the products popover only keeps order number and product list selectors, without extra meta copy.

**Step 2: Run test to verify it fails**
Run: `node tests/orders.variant-c-layout.test.js`
Expected: FAIL because `orders.html` still renders the old desktop card workspace.

**Step 3: Write minimal implementation**
- No implementation in this task.

**Step 4: Run test to verify it still fails for the intended reason**
Run: `node tests/orders.variant-c-layout.test.js`
Expected: FAIL only on the missing Variant C markers.

### Task 2: Replace the desktop order renderer with Variant C table layout

**Files:**
- Modify: `orders.html`
- Test: `tests/orders.variant-c-layout.test.js`

**Step 1: Write the failing implementation target**
- Add the desktop table shell markup inside the order workspace.
- Add a products popover container near the page footer/modal area.

**Step 2: Run test to verify the current page still fails**
Run: `node tests/orders.variant-c-layout.test.js`
Expected: FAIL until markup and renderer are updated.

**Step 3: Write minimal implementation**
- Add CSS for the table shell, sticky right columns, compact first-product cell, and simplified popover.
- Update the render pipeline to build desktop rows from existing order data.
- Keep refund, detail, multi-currency, and metrics logic intact.

**Step 4: Run test to verify it passes**
Run: `node tests/orders.variant-c-layout.test.js`
Expected: PASS.

### Task 3: Rework mobile rendering into a native mobile order stream

**Files:**
- Modify: `orders.html`
- Test: `tests/orders.variant-c-layout.test.js`

**Step 1: Write the failing implementation target**
- Reuse the mobile list mount point but render a mobile-native order stream card layout.

**Step 2: Run test to verify current HTML would still fail on mobile assertions**
Run: `node tests/orders.variant-c-layout.test.js`
Expected: FAIL until mobile renderer and classes are updated.

**Step 3: Write minimal implementation**
- Add mobile-first card styles for compact amount/status, first-product summary, meta grid, and action row.
- Hide the desktop table on narrow screens and show the mobile stream.

**Step 4: Run test to verify it passes**
Run: `node tests/orders.variant-c-layout.test.js`
Expected: PASS.

### Task 4: Run focused regression checks

**Files:**
- Modify: none unless regressions are found
- Test: `tests/orders.variant-c-layout.test.js`, `tests/orders.desktop-command-center.test.js`, `tests/orders.mobile-workspace.test.js`, `tests/orders.multi-currency.test.js`, `tests/orders.refund-modes.test.js`

**Step 1: Run focused regression suite**
Run: `node tests/orders.variant-c-layout.test.js && node tests/orders.desktop-command-center.test.js && node tests/orders.mobile-workspace.test.js && node tests/orders.multi-currency.test.js && node tests/orders.refund-modes.test.js`
Expected: PASS.

**Step 2: Run script syntax sanity check**
Run: `node -e "const fs=require('fs');const html=fs.readFileSync('orders.html','utf8');const m=html.match(/<script>([\\s\\S]*)<\\/script>/); if(m){ new Function(m[1]); } console.log('SCRIPT_OK');"`
Expected: `SCRIPT_OK`

**Step 3: Fix any regressions and rerun**
Run: `node tests/orders.variant-c-layout.test.js && node tests/orders.desktop-command-center.test.js && node tests/orders.mobile-workspace.test.js && node tests/orders.multi-currency.test.js && node tests/orders.refund-modes.test.js && node -e "const fs=require('fs');const html=fs.readFileSync('orders.html','utf8');const m=html.match(/<script>([\\s\\S]*)<\\/script>/); if(m){ new Function(m[1]); } console.log('SCRIPT_OK');"`
Expected: PASS and `SCRIPT_OK`.
