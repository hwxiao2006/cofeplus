# Orders Filter Refinement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refine the orders page filters so desktop high-frequency filters stay on the top row, date filtering works at day granularity with explicit apply actions, and device search matches the menu management search behavior by supporting device ID and location-name queries.

**Architecture:** Keep the current single-file `orders.html` structure and extend the existing filter panel rather than introducing a new component. Add TDD coverage for markup and behavior contracts, then implement minimal HTML/CSS/JS changes that reuse the existing runtime device context and multi-select filter flow.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Node-based regex/assert tests.

---

### Task 1: Lock the new filter-panel contract with tests

**Files:**
- Modify: `tests/orders.search-dimensions.test.js`
- Modify: `tests/orders.desktop-command-center.test.js`
- Test: `tests/orders.search-dimensions.test.js`
- Test: `tests/orders.desktop-command-center.test.js`

**Step 1: Write the failing test**

Add assertions for:
- desktop top row containing `orderSearchFieldDesktop`
- desktop secondary row containing `应用筛选`
- desktop and mobile date inputs using `type="date"`
- device search placeholders matching `搜索设备编号或点位名称`
- device filter search logic checking location-aware candidates

**Step 2: Run test to verify it fails**

Run: `node tests/orders.search-dimensions.test.js && node tests/orders.desktop-command-center.test.js`
Expected: FAIL because current markup still places search dimension in the advanced row, date inputs are text/datetime-local, and device search is ID-only.

**Step 3: Write minimal implementation**

Update `orders.html` tests-targeted strings and logic only after the failures are confirmed.

**Step 4: Run test to verify it passes**

Run: `node tests/orders.search-dimensions.test.js && node tests/orders.desktop-command-center.test.js`
Expected: PASS.

### Task 2: Implement desktop/mobile filter behavior changes

**Files:**
- Modify: `orders.html`
- Test: `tests/orders.search-dimensions.test.js`
- Test: `tests/orders.desktop-command-center.test.js`

**Step 1: Write the failing test**

Covered in Task 1.

**Step 2: Run test to verify it fails**

Covered in Task 1.

**Step 3: Write minimal implementation**

In `orders.html`:
- move desktop search-dimension select into `.control-panel-primary`
- keep `.control-panel-secondary` for date range and actions only
- add a desktop `应用筛选` button
- switch date inputs to `type="date"` with day-level placeholders/labels
- make `applyMobileFilters()` actually apply the current filter state
- teach `filterOrders()` to respect the selected date range at day granularity

**Step 4: Run test to verify it passes**

Run the focused node tests.
Expected: PASS.

### Task 3: Align device search with menu management behavior

**Files:**
- Modify: `orders.html`
- Test: `tests/orders.search-dimensions.test.js`

**Step 1: Write the failing test**

Covered in Task 1.

**Step 2: Run test to verify it fails**

Covered in Task 1.

**Step 3: Write minimal implementation**

Reuse runtime device context to build device search labels/candidates so both desktop and mobile multi-select filters can search by:
- device ID
- location name
- combined `点位 · 设备号` label

**Step 4: Run test to verify it passes**

Run the focused node tests.
Expected: PASS.

### Task 4: Regression verification

**Files:**
- Test: `tests/orders.shared-source.test.js`
- Test: `tests/orders.variant-c-layout.test.js`
- Test: `tests/orders.mobile-workspace.test.js`
- Test: `tests/orders.desktop-command-center.test.js`
- Test: `tests/orders.search-dimensions.test.js`

**Step 1: Run regression suite**

Run: `node tests/orders.search-dimensions.test.js && node tests/orders.desktop-command-center.test.js && node tests/orders.shared-source.test.js && node tests/orders.variant-c-layout.test.js && node tests/orders.mobile-workspace.test.js`
Expected: PASS.

**Step 2: Browser sanity check**

Open `http://127.0.0.1:8080/orders.html` and confirm:
- desktop filter top row order is correct
- date fields are day-only
- desktop has both clear/apply in advanced row
- device search matches by location keyword

**Step 3: Summarize evidence**

Report exact commands run and the browser-level observations.
