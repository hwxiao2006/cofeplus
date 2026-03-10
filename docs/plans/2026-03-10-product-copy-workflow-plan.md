# Product Copy Workflow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace empty product creation with a copy-based workflow that clones an existing product on the same device and then lets the operator edit it.

**Architecture:** Keep the existing product editor modal for editing and copied-product adjustments, and add a lightweight copy-selection modal in front of it. Use a pure cloning helper to copy menu, tag, and recipe structures safely so runtime behavior can be tested without DOM-heavy coupling.

**Tech Stack:** Static HTML, inline JavaScript, Node-based assertion tests.

---

### Task 1: Lock the copy workflow in tests

**Files:**
- Modify: `/Users/tigerhuang/cofeplus/tests/menu-management.behavior.test.js`
- Modify: `/Users/tigerhuang/cofeplus/menu-management.html`

**Step 1: Write the failing test**
- Add assertions that the manage-page entry text changes from `添加商品` / `新增商品` to `复制商品`.
- Add a runtime test for a cloning helper that preserves recipe/tag/default-option related fields while generating a new product id.

**Step 2: Run test to verify it fails**

Run: `node /Users/tigerhuang/cofeplus/tests/menu-management.behavior.test.js`
Expected: FAIL because the old empty-create workflow still exists.

**Step 3: Write minimal implementation**
- Add copy modal markup and helper functions.
- Replace create-entry onclicks with the copy workflow.

**Step 4: Run test to verify it passes**

Run: `node /Users/tigerhuang/cofeplus/tests/menu-management.behavior.test.js`
Expected: PASS.

### Task 2: Wire copy selection into the existing editor modal

**Files:**
- Modify: `/Users/tigerhuang/cofeplus/menu-management.html`
- Test: `/Users/tigerhuang/cofeplus/tests/menu-management.behavior.test.js`

**Step 1: Write the failing test**
- Add a runtime test that copying a product opens an editable draft and saving it adds a new product without mutating the source product.

**Step 2: Run test to verify it fails**

Run: `node /Users/tigerhuang/cofeplus/tests/menu-management.behavior.test.js`
Expected: FAIL because saving still creates only empty products or mutates the source incorrectly.

**Step 3: Write minimal implementation**
- Track copy source state separately from edit state.
- Reuse the existing editor modal to prefill copied values.
- Allow the copied draft to save into any selected category.

**Step 4: Run test to verify it passes**

Run: `node /Users/tigerhuang/cofeplus/tests/menu-management.behavior.test.js`
Expected: PASS.

### Task 3: Verify related regressions

**Files:**
- Modify: `/Users/tigerhuang/cofeplus/menu-management.html`
- Test: `/Users/tigerhuang/cofeplus/tests/product-detail.pricing.test.js`
- Test: `/Users/tigerhuang/cofeplus/tests/materials.device-routing.test.js`

**Step 1: Run focused regression tests**

Run:
- `node /Users/tigerhuang/cofeplus/tests/menu-management.behavior.test.js`
- `node /Users/tigerhuang/cofeplus/tests/product-detail.pricing.test.js`
- `node /Users/tigerhuang/cofeplus/tests/materials.device-routing.test.js`

Expected: PASS.
