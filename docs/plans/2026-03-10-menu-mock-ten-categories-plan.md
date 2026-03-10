# Menu Mock Ten Categories Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand the shared menu mock dataset to 10 categories so menu management, order preview, batch pricing, and product detail all use a denser realistic mock catalog.

**Architecture:** Keep the existing `productsData` entry shape and preserve current key categories used by tests (`3D拉花`, `新品推荐`). Add seven more categories with unique product IDs and multilingual category names so every view consuming the shared dataset sees the same expanded catalog without extra runtime generation.

**Tech Stack:** Static HTML mock data, vanilla JavaScript state/rendering, Node behavior tests.

---

### Task 1: Lock the shared mock-data requirement with a failing test

**Files:**
- Modify: `tests/menu-management.behavior.test.js`
- Test: `tests/menu-management.behavior.test.js`

**Step 1: Write the failing test**

Add a test asserting the default shared `productsData` contains at least 10 categories and still includes `3D拉花` and `新品推荐`.

**Step 2: Run test to verify it fails**

Run: `node tests/menu-management.behavior.test.js`
Expected: FAIL because the default dataset currently has fewer than 10 categories.

**Step 3: Write minimal implementation**

Expand the default `productsData` mock dataset only as much as needed to satisfy the new count while preserving existing category order and test-critical entries.

**Step 4: Run test to verify it passes**

Run: `node tests/menu-management.behavior.test.js`
Expected: PASS for the new shared-dataset test.

### Task 2: Expand the base mock catalog

**Files:**
- Modify: `menu-management.html`
- Test: `tests/menu-management.behavior.test.js`

**Step 1: Write minimal implementation**

Add seven new categories with:
- multilingual `names`
- realistic icons
- unique products and IDs
- varied item counts across categories

**Step 2: Run test to verify it passes**

Run: `node tests/menu-management.behavior.test.js`
Expected: Existing menu tests still pass.

### Task 3: Regression verification

**Files:**
- Modify: `menu-management.html`
- Modify: `tests/menu-management.behavior.test.js`
- Test: `tests/product-detail.pricing.test.js`

**Step 1: Run focused verification**

Run:
- `node tests/menu-management.behavior.test.js`
- `node tests/product-detail.pricing.test.js`

Expected: Both pass after the mock catalog expansion.

**Step 2: Commit**

```bash
git add menu-management.html tests/menu-management.behavior.test.js docs/plans/2026-03-10-menu-mock-ten-categories-plan.md
git commit -m "Expand shared menu mock catalog to ten categories"
```
