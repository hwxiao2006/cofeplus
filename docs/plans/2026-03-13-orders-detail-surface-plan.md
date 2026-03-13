# Orders Detail Surface Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the chosen order-detail interaction in `orders.html`: desktop uses a right-side drawer and mobile uses a centered modal.

**Architecture:** Add a shared order-detail state and renderer in `orders.html`, then expose the same detail data through two responsive surfaces inside a single overlay root. Keep the information architecture aligned with the approved preview: summary header plus grouped identity, payment, and item sections. Use existing order runtime data when available and derive stable fallback values for screenshot-only fields.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Node assert-based tests, headless Chrome verification.

---

### Task 1: Lock the contract with a failing test

**Files:**
- Create: `tests/orders.detail-surface.test.js`
- Test: `tests/orders.detail-surface.test.js`

**Step 1: Write the failing test**

Assert that `orders.html`:
- contains an order-detail overlay root
- contains both desktop drawer and mobile modal surfaces
- contains grouped detail labels from the approved preview
- routes `viewDetail` through a mobile/desktop mode decision

**Step 2: Run test to verify it fails**

Run: `node tests/orders.detail-surface.test.js`
Expected: FAIL because the detail overlay structure does not exist yet.

**Step 3: Write minimal implementation**

Add the overlay markup, CSS, state, helper formatters, and `viewDetail`/`closeOrderDetail` behavior.

**Step 4: Run test to verify it passes**

Run: `node tests/orders.detail-surface.test.js`
Expected: PASS.

### Task 2: Browser verification

**Files:**
- Modify: `orders.html`

**Step 1: Render desktop verification**

Open `http://127.0.0.1:8080/orders.html` in headless Chrome and trigger a desktop `详情`.
Expected: drawer opens from the right and preserves the order table context.

**Step 2: Render mobile verification**

Open `http://127.0.0.1:8080/orders.html` at a mobile viewport and trigger a mobile `详情`.
Expected: centered modal opens and remains within the mobile viewport.

**Step 3: Run focused regression tests**

Run the new detail-surface test and nearby order tests that cover mobile workspace, multi-currency, and search/filter structure.
Expected: all pass.
