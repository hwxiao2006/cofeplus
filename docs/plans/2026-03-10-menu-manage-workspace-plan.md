# Menu Manage Workspace Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the menu management tab into "category navigation + product workspace" so large category counts do not create an excessively long page on desktop or mobile.

**Architecture:** Keep the existing menu inner tabs (`settings` / `manage` / `batch`) unchanged, but replace the manage tab body with a split workspace. The left side becomes category navigation with category search, while the right side becomes a product workspace with active-category context, product search, and a scoped search mode that can switch between current category and all categories.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript state/render helpers, existing Node behavior tests.

---

### Task 1: Add failing tests for workspace layout and state

**Files:**
- Modify: `tests/menu-management.behavior.test.js`
- Test: `tests/menu-management.behavior.test.js`

**Step 1: Write the failing test**

Add behavior tests that assert:
- the manage tab contains category navigation, category search, mobile category select, product search, and search scope controls
- the manage workspace only renders the active category by default
- all-category search results dedupe products by ID and show category labels

**Step 2: Run test to verify it fails**

Run: `node tests/menu-management.behavior.test.js`
Expected: FAIL on missing workspace structure and missing scoped rendering behavior.

**Step 3: Write minimal implementation**

Add markup IDs and state entry points referenced by the tests, but do not finish the full layout yet.

**Step 4: Run test to verify it passes**

Run: `node tests/menu-management.behavior.test.js`
Expected: New tests pass or fail only on deeper behavior still being implemented in later tasks.

### Task 2: Rebuild manage tab layout

**Files:**
- Modify: `menu-management.html`
- Test: `tests/menu-management.behavior.test.js`

**Step 1: Write the failing test**

Add/adjust assertions for:
- desktop two-column manage workspace
- mobile select-based category entry
- sticky/compact toolbar behavior on smaller screens if needed

**Step 2: Run test to verify it fails**

Run: `node tests/menu-management.behavior.test.js`
Expected: FAIL on missing workspace CSS selectors or markup.

**Step 3: Write minimal implementation**

Implement:
- category navigation panel
- product workspace panel
- mobile category select
- compact toolbar with scope + product search

**Step 4: Run test to verify it passes**

Run: `node tests/menu-management.behavior.test.js`
Expected: Layout assertions pass.

### Task 3: Rework manage-tab rendering logic

**Files:**
- Modify: `menu-management.html`
- Test: `tests/menu-management.behavior.test.js`

**Step 1: Write the failing test**

Add behavior tests for:
- active category initialization and switching
- current-category search vs all-category search
- all-category search deduping by product ID

**Step 2: Run test to verify it fails**

Run: `node tests/menu-management.behavior.test.js`
Expected: FAIL on missing state helpers / incorrect rendering.

**Step 3: Write minimal implementation**

Implement:
- manage workspace state (`activeCategory`, `categoryKeyword`, `productKeyword`, `scope`)
- deduped global search entries
- active-category workspace header, counts, and product rendering

**Step 4: Run test to verify it passes**

Run: `node tests/menu-management.behavior.test.js`
Expected: Rendering behavior passes without breaking batch-price logic.

### Task 4: Regression verification

**Files:**
- Modify: `menu-management.html`
- Modify: `tests/menu-management.behavior.test.js`
- Test: `tests/product-detail.pricing.test.js`

**Step 1: Run focused test suite**

Run:
- `node tests/menu-management.behavior.test.js`
- `node tests/product-detail.pricing.test.js`

Expected: Both pass.

**Step 2: Clean up**

Keep the implementation minimal, remove duplicated render helpers, and ensure no old long-page-only selectors remain required by tests.

**Step 3: Commit**

```bash
git add menu-management.html tests/menu-management.behavior.test.js docs/plans/2026-03-10-menu-manage-workspace-plan.md
git commit -m "Refactor menu manage tab into workspace layout"
```
