# Mock Default Options Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Preload original default options for all shared mock menu products so copy confirmation can always read a valid baseline value.

**Architecture:** Normalize shared products inside `shared/admin-mock-data.js` before they are exported. Add focused tests that verify the shared dataset includes default option baselines and that the product detail confirmation logic no longer relies on `-` as a normal mock-state value.

**Tech Stack:** Static HTML, inline JavaScript, shared browser-side mock data, Node assertion tests.

---

### Task 1: Lock shared mock defaults in tests

**Files:**
- Modify: `/Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/tests/shared.admin-mock-data.test.js`

**Step 1: Write the failing test**
- Load `shared/admin-mock-data.js` in a VM context.
- Assert every mock product exposes `defaultOptions`.
- Assert key spec defaults such as `beans`, `temperature`, and `cupsize` are present.

**Step 2: Run test to verify it fails**

Run: `node /Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/tests/shared.admin-mock-data.test.js`
Expected: FAIL because current shared mock products do not define `defaultOptions`.

**Step 3: Write minimal implementation**
- Add shared default-option baseline helpers in `shared/admin-mock-data.js`.
- Normalize each product before assigning it into `defaultProducts`.

**Step 4: Run test to verify it passes**

Run: `node /Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/tests/shared.admin-mock-data.test.js`
Expected: PASS.

### Task 2: Keep copy confirmation aligned with the normalized mock baseline

**Files:**
- Modify: `/Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/tests/product-detail.pricing.test.js`
- Modify: `/Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/product-detail.html`

**Step 1: Write the failing test**
- Assert the confirmation-page default-option comparison does not render `-` as a normal mock baseline value path.

**Step 2: Run test to verify it fails**

Run: `node /Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/tests/product-detail.pricing.test.js`
Expected: FAIL if the confirmation fallback still treats missing defaults as a normal visible state.

**Step 3: Write minimal implementation**
- Update confirmation rendering helpers so missing default-option rows are hidden rather than shown as `-`.
- Keep visible rows only when a real before/after value exists.

**Step 4: Run test to verify it passes**

Run: `node /Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/tests/product-detail.pricing.test.js`
Expected: PASS.

### Task 3: Run focused regression verification

**Files:**
- Test: `/Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/tests/shared.admin-mock-data.test.js`
- Test: `/Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/tests/product-detail.pricing.test.js`
- Test: `/Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/tests/menu-management.behavior.test.js`

**Step 1: Run verification**

Run:
- `node /Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/tests/shared.admin-mock-data.test.js`
- `node /Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/tests/product-detail.pricing.test.js`
- `node /Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/tests/menu-management.behavior.test.js`

Expected: PASS.
