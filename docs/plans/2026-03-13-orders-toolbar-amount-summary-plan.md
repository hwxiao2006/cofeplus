# Orders Toolbar Amount Summary Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show both the filtered total order amount and the filtered successful-payment amount in the orders toolbar summary.

**Architecture:** Reuse the existing multi-currency formatting path and extend the toolbar summary with a second metric node. Keep the calculation local to the current filtered dataset so the new totals automatically follow all active filters.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Node assert-based tests.

---

### Task 1: Write failing tests for the toolbar summary

**Files:**
- Modify: `tests/orders.multi-currency.test.js`
- Modify: `tests/orders.desktop-command-center.test.js`
- Test: `tests/orders.multi-currency.test.js`
- Test: `tests/orders.desktop-command-center.test.js`

**Step 1: Write the failing test**

Add assertions that:
- the toolbar summary includes both `总金额` and `成功金额`
- the toolbar exposes a second amount target node
- the amount formatter can aggregate either all filtered orders or only successful ones
- `calculateTotal()` updates both summary nodes from `filteredData`

**Step 2: Run test to verify it fails**

Run: `node tests/orders.multi-currency.test.js && node tests/orders.desktop-command-center.test.js`
Expected: FAIL because the toolbar currently renders only one successful-amount summary.

**Step 3: Write minimal implementation**

Update `orders.html` markup and calculation helpers to render both totals.

**Step 4: Run test to verify it passes**

Run: `node tests/orders.multi-currency.test.js && node tests/orders.desktop-command-center.test.js`
Expected: PASS.

### Task 2: Regression verification

**Files:**
- Test: `tests/orders.mobile-workspace.test.js`
- Test: `tests/orders.search-dimensions.test.js`
- Test: `tests/orders.desktop-command-center.test.js`
- Test: `tests/orders.shared-source.test.js`
- Test: `tests/orders.variant-c-layout.test.js`
- Test: `tests/orders.multi-currency.test.js`

**Step 1: Run regression suite**

Run: `node tests/orders.multi-currency.test.js && node tests/orders.desktop-command-center.test.js && node tests/orders.mobile-workspace.test.js && node tests/orders.search-dimensions.test.js && node tests/orders.shared-source.test.js && node tests/orders.variant-c-layout.test.js`
Expected: PASS.

**Step 2: Summarize evidence**

Report exact commands and the resulting toolbar summary behavior.
