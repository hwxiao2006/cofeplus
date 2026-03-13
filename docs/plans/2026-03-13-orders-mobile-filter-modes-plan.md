# Orders Mobile Filter Modes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split the mobile top quick-filter entries so status and device open scoped quick-filter sheets, while the filter button opens the full advanced filter sheet.

**Architecture:** Reuse the existing mobile filter bottom sheet container, but add a simple mode state that changes the sheet title/subtitle and selectively shows sections. Keep the existing filtering logic and controls, and drive visibility through data attributes/classes rather than creating three separate modal components.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Node assert-based tests.

---

### Task 1: Write failing tests for mobile filter modes

**Files:**
- Modify: `tests/orders.mobile-workspace.test.js`
- Test: `tests/orders.mobile-workspace.test.js`

**Step 1: Write the failing test**

Add assertions for:
- mobile top chips calling `openMobileFilterSheet('status')`, `openMobileFilterSheet('device')`, and `openMobileFilterSheet()` respectively
- the mobile filter sheet exposing mode-aware title/subtitle nodes
- dedicated sections carrying visibility markers for `status`, `device`, and `all`
- JS mode handler updating the sheet mode

**Step 2: Run test to verify it fails**

Run: `node tests/orders.mobile-workspace.test.js`
Expected: FAIL because the sheet currently always renders the same full content regardless of opener.

**Step 3: Write minimal implementation**

Update `orders.html` markup, styles, and JS to support sheet modes.

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

**Step 2: Browser verification**

Open the mobile preview and confirm:
- status chip opens status-only quick sheet
- device chip opens device-only quick sheet
- filter chip opens full advanced sheet

**Step 3: Summarize evidence**

Report exact commands and browser observations.
