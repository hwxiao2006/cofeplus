# Staff Management Permission Selector Compact Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the staff permission selector into a lightweight row-based module list that matches the approved compact modal design while preserving existing permission selection behavior.

**Architecture:** Keep the change self-contained inside `staff-management.html` and `tests/staff-management.behavior.test.js`. Replace the heavy card grid with compact permission rows that show a live summary and selected-count badge per module, while keeping the existing parent-child permission logic and validation. Preserve the actual permission model and saved data shape.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Node-based behavior tests

---

### Task 1: Lock the compact selector contract in tests

**Files:**
- Modify: `tests/staff-management.behavior.test.js`
- Test: `tests/staff-management.behavior.test.js`

- [ ] **Step 1: Write the failing test**

Add assertions that the permission section contains:
- a compact section header helper and total selected pill
- row-based group containers instead of the old card layout classes
- summary/count hooks for each permission group
- compact inline option containers for the expandable details area

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/staff-management.behavior.test.js`
Expected: FAIL on missing compact permission selector classes or hooks.

- [ ] **Step 3: Keep the rest of the file untouched**

Only change assertions needed to describe the approved permission selector structure. Preserve the existing behavior coverage for permission values, validation, and list rendering.

### Task 2: Implement the compact selector in the staff modal

**Files:**
- Modify: `staff-management.html`
- Test: `tests/staff-management.behavior.test.js`

- [ ] **Step 1: Replace the heavy permission layout markup**

Update the permission section to use:
- a compact header row with helper copy and total selected badge
- one lightweight row per permission group
- per-group summary text and `x/x` count
- a hidden-by-default compact options area that can still edit child permissions

- [ ] **Step 2: Add minimal styling for the compact rows**

Replace the current two-column card styling with:
- single-column lightweight rows
- tighter padding and border radius
- low-contrast borders and subdued helper text
- compact inline option chips for expanded editing

- [ ] **Step 3: Extend the existing permission sync helpers**

Add small UI-only helpers that:
- refresh the total selected count pill
- refresh each row summary/count from the checked permissions
- keep the current parent-child selection behavior intact
- avoid changing saved permission values or validation rules

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/staff-management.behavior.test.js`
Expected: PASS

### Task 3: Regression verification

**Files:**
- Verify: `staff-management.html`
- Verify: `tests/staff-management.behavior.test.js`

- [ ] **Step 1: Run targeted regression tests**

Run: `node tests/staff-management.behavior.test.js && node tests/device-search.location-name.test.js`
Expected: both commands pass with exit code 0.

- [ ] **Step 2: Sanity-check the rendered page**

Open the local staff page and confirm the permission area now reads as a short header plus compact module rows instead of large cards, and that device selection remains unchanged.
