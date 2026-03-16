# Orders PRD HTML Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a standalone HTML version of the orders management PRD with one embedded entrance screenshot for each user flow section.

**Architecture:** Add safe screenshot-only demo states to `orders.html`, capture the required UI states to local PNG files, then assemble a single self-contained HTML artifact in `tasks/` with inline base64 images. Reuse the styling pattern from existing PRD HTML files to keep the document readable and portable.

**Tech Stack:** Static HTML, CSS, vanilla JS, Python local server, Playwright CLI, shell utilities.

---

### Task 1: Add screenshot demo-state support to `orders.html`

**Files:**
- Modify: `orders.html`

**Steps:**
1. Add a helper to read URL query params and resolve a screenshot demo state.
2. Add a post-init hook that applies the requested demo state after the page renders.
3. Support at least these states: `metrics`, `filters`, `table`, `mobile-list`, `products`, `detail`, `refund`, `currency`.
4. Ensure normal page behavior is unchanged when no demo param is present.
5. Verify the page still loads and existing orders tests pass.

### Task 2: Capture one screenshot per user flow

**Files:**
- Create: `screenshots/orders-prd/uf001-metrics.png`
- Create: `screenshots/orders-prd/uf002-filters.png`
- Create: `screenshots/orders-prd/uf003-table.png`
- Create: `screenshots/orders-prd/uf004-mobile-list.png`
- Create: `screenshots/orders-prd/uf005-products.png`
- Create: `screenshots/orders-prd/uf006-detail.png`
- Create: `screenshots/orders-prd/uf007-refund.png`
- Create: `screenshots/orders-prd/uf008-currency.png`

**Steps:**
1. Start a local HTTP server for the workspace.
2. Capture desktop screenshots using `npx playwright screenshot` with the relevant `demoState` query param.
3. Capture the mobile screenshot using an iPhone device preset.
4. Re-run any screenshot that contains clipped overlays or mismatched scroll position.
5. Confirm each PNG exists and has non-zero size.

### Task 3: Generate standalone HTML artifact

**Files:**
- Create: `tasks/prd-orders-management-user-flow.html`

**Steps:**
1. Reuse the document styling approach from existing PRD HTML files.
2. Convert the Markdown PRD structure into semantic HTML sections.
3. Insert one screenshot figure under each `UF-001`..`UF-008` section.
4. Inline every screenshot as a base64 `data:` URL.
5. Add a short usage note that this HTML is the portable preview version.

### Task 4: Verify rendering and structure

**Files:**
- Verify: `tasks/prd-orders-management-user-flow.html`

**Steps:**
1. Open the HTML locally in browser via the local server.
2. Capture one proof screenshot of the HTML preview page.
3. Confirm there are no broken images.
4. Confirm all 8 user flow sections include their screenshot.
5. Report output paths and any screenshot-state assumptions.
