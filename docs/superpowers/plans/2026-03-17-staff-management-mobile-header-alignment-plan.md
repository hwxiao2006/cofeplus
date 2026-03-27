# Staff Management Mobile Header Alignment Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the mobile header/title area of `staff-management.html` with the existing order and product pages so the mobile top bar keeps the current page label while the duplicate large page title is removed from the mobile header block.

**Architecture:** Keep the change local to `staff-management.html` and `tests/staff-management.behavior.test.js`. Reuse the same `mobile-header-title`, `header-title-wrapper`, and `header-meta` structure used by the order and product pages, then hide the repeated `人员管理` heading on small screens while preserving the description and add-staff action.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Node-based behavior tests

---

### Task 1: Lock the mobile header contract in tests

**Files:**
- Modify: `tests/staff-management.behavior.test.js`
- Test: `tests/staff-management.behavior.test.js`

- [ ] **Step 1: Write the failing test**

Add assertions that:
- the mobile header keeps `人员管理` as the top bar label with the shared `mobile-header-title` hook
- the mobile header exposes the same `mobile-header-title` hook used by the order page
- the page header uses `header-title-wrapper` and `header-meta` structure around the existing staff title and description
- the mobile breakpoint hides the repeated `header-title`

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/staff-management.behavior.test.js`
Expected: FAIL on the missing mobile-header/title-wrapper structure.

### Task 2: Align the staff page header markup

**Files:**
- Modify: `staff-management.html`
- Test: `tests/staff-management.behavior.test.js`

- [ ] **Step 1: Update the mobile header**

Keep the mobile top bar title as `人员管理`, but switch to the same `mobile-header-title` class pattern used by `orders.html`.

- [ ] **Step 2: Update the page title wrapper**

Wrap the staff title/description in `header-title-wrapper` and `header-meta` to match the visual structure used on the product and order pages, then hide the repeated title text on mobile while keeping the description and add button.

- [ ] **Step 3: Run test to verify it passes**

Run: `node tests/staff-management.behavior.test.js`
Expected: PASS

### Task 3: Regression verification

**Files:**
- Verify: `staff-management.html`
- Verify: `tests/staff-management.behavior.test.js`

- [ ] **Step 1: Run targeted regressions**

Run: `node tests/staff-management.behavior.test.js && node tests/device-search.location-name.test.js`
Expected: both commands pass.

- [ ] **Step 2: Sanity-check the mobile layout**

Open the staff page on a mobile-sized viewport and confirm the top bar keeps `人员管理`, while the lower large `人员管理` title no longer repeats on the same screen.
