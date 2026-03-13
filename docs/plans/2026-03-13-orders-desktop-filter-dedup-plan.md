# Orders Desktop Filter Dedup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align the desktop orders filter bar with the mobile model so the top row only contains quick filters and the expanded advanced section contains search-dependent fields.

**Architecture:** Keep the existing desktop control panel and advanced-collapse interaction, but move the keyword and search-dimension controls into the expanded section. Update tests first to lock the new quick-filter versus advanced-filter responsibilities, then minimally adjust HTML/CSS while reusing the current filtering logic.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Node assert-based tests.

---

### Task 1: Lock the desktop filter responsibilities with tests

**Files:**
- Modify: `tests/orders.search-dimensions.test.js`
- Modify: `tests/orders.desktop-command-center.test.js`
- Test: `tests/orders.search-dimensions.test.js`
- Test: `tests/orders.desktop-command-center.test.js`

**Step 1: Write the failing test**

Add assertions that:
- desktop primary row no longer includes `orderSearch` or `orderSearchFieldDesktop`
- desktop secondary row now includes keyword, search dimension, date range, clear, and apply
- desktop primary row contains only status, device, and advanced toggle after this change
- desktop grid definitions reflect the reduced primary row and expanded advanced row

**Step 2: Run test to verify it fails**

Run: `node tests/orders.search-dimensions.test.js && node tests/orders.desktop-command-center.test.js`
Expected: FAIL because desktop primary row still contains keyword and search-dimension controls.

**Step 3: Write minimal implementation**

Update `orders.html` desktop filter markup and CSS grid layout.

**Step 4: Run test to verify it passes**

Run: `node tests/orders.search-dimensions.test.js && node tests/orders.desktop-command-center.test.js`
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

Report exact commands and the resulting desktop filter structure.
