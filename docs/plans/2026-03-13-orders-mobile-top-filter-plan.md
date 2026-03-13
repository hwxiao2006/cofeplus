# Orders Mobile Top Filter Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplify the mobile orders top filter bar to three compact entries: status, device, and a single filter entry that opens the full sheet.

**Architecture:** Keep the existing mobile filter sheet and filtering logic intact, and only reduce the quick-access bar to the approved high-frequency controls. Update tests first so the new mobile contract is enforced before changing the HTML/CSS.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Node assert-based tests.

---

### Task 1: Lock the new mobile top bar contract with tests

**Files:**
- Modify: `tests/orders.mobile-workspace.test.js`
- Test: `tests/orders.mobile-workspace.test.js`

**Step 1: Write the failing test**

Add assertions that the mobile filter bar:
- uses exactly three chips
- keeps the status chip
- keeps the device chip
- removes the dedicated search chip
- uses a three-column grid on mobile

**Step 2: Run test to verify it fails**

Run: `node tests/orders.mobile-workspace.test.js`
Expected: FAIL because the current UI still renders four chips with a dedicated search entry.

**Step 3: Write minimal implementation**

Update `orders.html` mobile filter bar markup and mobile CSS grid definition.

**Step 4: Run test to verify it passes**

Run: `node tests/orders.mobile-workspace.test.js`
Expected: PASS.

### Task 2: Regression verification

**Files:**
- Test: `tests/orders.search-dimensions.test.js`
- Test: `tests/orders.desktop-command-center.test.js`
- Test: `tests/orders.shared-source.test.js`
- Test: `tests/orders.variant-c-layout.test.js`
- Test: `tests/orders.mobile-workspace.test.js`

**Step 1: Run regression suite**

Run: `node tests/orders.mobile-workspace.test.js && node tests/orders.search-dimensions.test.js && node tests/orders.desktop-command-center.test.js && node tests/orders.shared-source.test.js && node tests/orders.variant-c-layout.test.js`
Expected: PASS.

**Step 2: Summarize evidence**

Report the updated files and exact verification commands.
