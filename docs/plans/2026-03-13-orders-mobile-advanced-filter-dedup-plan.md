# Orders Mobile Advanced Filter Dedup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove quick-filter duplication from the mobile full filter sheet so the `筛选` entry shows only advanced fields while status and device remain top-level quick filters.

**Architecture:** Keep the existing mode-based mobile filter sheet and tighten only the `all` mode rules. Update tests first to lock the advanced-only contract, then use CSS/JS copy updates so status/device stay available only through their dedicated quick-filter entries.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Node assert-based tests.

---

### Task 1: Write the failing test

**Files:**
- Modify: `tests/orders.mobile-workspace.test.js`
- Test: `tests/orders.mobile-workspace.test.js`

**Step 1: Write the failing test**

Add assertions that full filter mode:
- hides the `status` section
- hides the `device` section
- updates subtitle/copy to describe advanced fields only

**Step 2: Run test to verify it fails**

Run: `node tests/orders.mobile-workspace.test.js`
Expected: FAIL because full mode still shows status/device sections.

**Step 3: Write minimal implementation**

Update `orders.html` mode CSS and full-mode copy.

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

Report exact commands and the updated mobile filter behavior.
