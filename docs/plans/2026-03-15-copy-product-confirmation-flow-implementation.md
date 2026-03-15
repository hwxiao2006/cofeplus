# Copy Product Confirmation Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Change the copy-product flow from “range + modal edit + immediate save” to “range on menu page, then basic info + recipe config + confirmation on the detail page”.

**Architecture:** Keep Step 1 in `menu-management.html`, because it already owns device scope, template selection, and target-category setup. Reuse `product-detail.html` for Steps 2 and 3 by introducing a copy-mode shell there, then add a compact Step 4 confirmation panel that compares source vs edited values before the final copy writeback.

**Tech Stack:** Static HTML, inline JavaScript, Node-based assertion tests.

---

### Task 1: Lock the new navigation contract in tests

**Files:**
- Modify: `/Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/tests/menu-management.behavior.test.js`
- Modify: `/Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/menu-management.html`

**Step 1: Write the failing test**
- Assert that finishing Step 1 writes a copy-workflow payload to session storage.
- Assert that the next page becomes `product-detail.html?...&mode=copy...` instead of opening the in-page product modal.

**Step 2: Run test to verify it fails**

Run: `node /Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/tests/menu-management.behavior.test.js`
Expected: FAIL because the current flow still calls `openProductModal(...)`.

**Step 3: Write minimal implementation**
- Add a helper to build and persist the copy-detail payload.
- Redirect the copy flow into `product-detail.html` in copy mode.
- Preserve return-context persistence.

**Step 4: Run test to verify it passes**

Run: `node /Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/tests/menu-management.behavior.test.js`
Expected: PASS.

### Task 2: Add copy mode shell and confirmation step to the detail page

**Files:**
- Modify: `/Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/tests/product-detail.pricing.test.js`
- Modify: `/Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/product-detail.html`

**Step 1: Write the failing test**
- Assert that the detail page supports copy mode.
- Assert that copy mode includes a confirmation step/panel and step actions.
- Assert that copy mode has a dedicated final confirm handler instead of directly reusing normal edit save.

**Step 2: Run test to verify it fails**

Run: `node /Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/tests/product-detail.pricing.test.js`
Expected: FAIL because the detail page only supports standard edit mode.

**Step 3: Write minimal implementation**
- Parse copy-mode payload.
- Add copy-flow step UI around the existing basic/recipe sections.
- Add a compact confirmation panel and render functions based on the approved prototype structure.
- Route copy-mode primary actions through step transitions and final confirm.

**Step 4: Run test to verify it passes**

Run: `node /Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/tests/product-detail.pricing.test.js`
Expected: PASS.

### Task 3: Complete final copy persistence and return feedback

**Files:**
- Modify: `/Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/menu-management.html`
- Modify: `/Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/product-detail.html`
- Modify: `/Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/tests/menu-management.behavior.test.js`

**Step 1: Write the failing test**
- Assert that confirming copy persists a new product with copied recipe/tag structures.
- Assert that multi-device copy stores pending batch results so the menu page can show them after return.

**Step 2: Run test to verify it fails**

Run: `node /Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/tests/menu-management.behavior.test.js`
Expected: FAIL because copy confirmation and return feedback do not exist yet.

**Step 3: Write minimal implementation**
- Share or duplicate the clone/copy persistence helpers needed by detail-page copy mode.
- Persist next product ID across page navigation.
- Persist pending copy results and consume them on menu-page return.

**Step 4: Run test to verify it passes**

Run: `node /Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/tests/menu-management.behavior.test.js`
Expected: PASS.

### Task 4: Run focused regression verification

**Files:**
- Test: `/Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/tests/menu-management.behavior.test.js`
- Test: `/Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/tests/product-detail.pricing.test.js`

**Step 1: Run verification**

Run:
- `node /Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/tests/menu-management.behavior.test.js`
- `node /Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/tests/product-detail.pricing.test.js`

Expected: PASS.
