# Orders Detail Preview Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a standalone preview page that shows both redesigned desktop order-detail interaction variants: centered modal and right-side drawer.

**Architecture:** Create a static HTML preview file with shared sample order-detail data and two desktop workspace demo surfaces on one page. Add a small Node test to lock the page structure and ensure both desktop variants plus the required screenshot fields are present.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Node assert-based tests.

---

### Task 1: Lock the preview-page contract with a failing test

**Files:**
- Create: `tests/orders.detail-preview.test.js`
- Test: `tests/orders.detail-preview.test.js`

**Step 1: Write the failing test**

Assert that the preview page:
- exists at `orders-detail-preview.html`
- contains modal and drawer variant markers
- contains `desktop-modal` and `desktop-drawer` surface markers
- includes the screenshot-derived field labels
- includes two separate desktop preview canvases

**Step 2: Run test to verify it fails**

Run: `node tests/orders.detail-preview.test.js`
Expected: FAIL because the preview page does not exist yet.

**Step 3: Write minimal implementation**

Create `orders-detail-preview.html` with both variants and sample data.

**Step 4: Run test to verify it passes**

Run: `node tests/orders.detail-preview.test.js`
Expected: PASS.

### Task 2: Browser verification

**Files:**
- Create: `orders-detail-preview.html`

**Step 1: Render the page in headless Chrome**

Run a browser capture against `http://127.0.0.1:8080/orders-detail-preview.html`.
Expected: both desktop variants visible and readable.

**Step 2: Summarize evidence**

Report the preview URL and attach or reference the rendered screenshot.
