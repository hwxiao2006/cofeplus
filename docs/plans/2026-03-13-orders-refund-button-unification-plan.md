# Orders Refund Button Unification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unify the refund button appearance across desktop and mobile order actions so both ends use the same refund-specific visual language.

**Architecture:** Keep the existing desktop and mobile action button structures, but replace the desktop refund button's green primary styling with the same semantic refund treatment used on mobile. Lock the contract with tests first, then minimally adjust the refund button class names and shared CSS.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Node assert-based tests.

---

### Task 1: Write failing tests for unified refund buttons

**Files:**
- Modify: `tests/orders.desktop-command-center.test.js`
- Modify: `tests/orders.mobile-workspace.test.js`
- Test: `tests/orders.desktop-command-center.test.js`
- Test: `tests/orders.mobile-workspace.test.js`

**Step 1: Write the failing test**

Add assertions that:
- desktop refund buttons no longer use `.order-card-action.primary`
- desktop refund buttons use a refund-specific class
- refund-specific CSS matches the semantic red treatment rather than the green primary button
- mobile refund buttons still use the same refund-specific visual treatment

**Step 2: Run test to verify it fails**

Run: `node tests/orders.desktop-command-center.test.js && node tests/orders.mobile-workspace.test.js`
Expected: FAIL because desktop refund buttons still use the green primary style.

**Step 3: Write minimal implementation**

Update `orders.html` action markup and CSS to give desktop refund buttons the same refund styling language as mobile.

**Step 4: Run test to verify it passes**

Run: `node tests/orders.desktop-command-center.test.js && node tests/orders.mobile-workspace.test.js`
Expected: PASS.

### Task 2: Regression verification

**Files:**
- Test: `tests/orders.mobile-workspace.test.js`
- Test: `tests/orders.search-dimensions.test.js`
- Test: `tests/orders.desktop-command-center.test.js`
- Test: `tests/orders.shared-source.test.js`
- Test: `tests/orders.variant-c-layout.test.js`

**Step 1: Run regression suite**

Run: `node tests/orders.mobile-workspace.test.js && node tests/orders.search-dimensions.test.js && node tests/orders.desktop-command-center.test.js && node tests/orders.shared-source.test.js && node tests/orders.variant-c-layout.test.js`
Expected: PASS.

**Step 2: Summarize evidence**

Report exact commands and the resulting unified refund button styling.
