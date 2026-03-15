# Copy Step Progress Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn the copy-product top step bar into a non-clickable progress indicator and keep bottom actions as the only primary workflow navigation.

**Architecture:** Update `product-detail.html` so the copy step shell renders as static progress items instead of clickable buttons. Keep the existing `goToCopyWorkflowStep(...)` helper for the explicit edit actions shown on the confirmation step.

**Tech Stack:** Static HTML, inline CSS/JavaScript, Node assertion tests.

---

### Task 1: Lock the progress-bar contract in tests

**Files:**
- Modify: `/Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/tests/product-detail.pricing.test.js`

**Step 1: Write the failing test**
- Assert the copy step shell still exists.
- Assert the top progress items are not clickable buttons and do not bind `onclick`.
- Assert the confirmation-step edit buttons still route through `goToCopyWorkflowStep(...)`.

**Step 2: Run test to verify it fails**

Run: `node /Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/tests/product-detail.pricing.test.js`
Expected: FAIL because the current top step shell is still rendered as clickable buttons.

**Step 3: Write minimal implementation**
- Replace clickable step buttons with static progress items.
- Keep the class/id hooks used by the step-state updater.
- Do not change bottom action behavior.

**Step 4: Run test to verify it passes**

Run: `node /Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/tests/product-detail.pricing.test.js`
Expected: PASS.

### Task 2: Run focused regression verification

**Files:**
- Test: `/Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/tests/product-detail.pricing.test.js`
- Test: `/Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/tests/menu-management.behavior.test.js`

**Step 1: Run verification**

Run:
- `node /Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/tests/product-detail.pricing.test.js`
- `node /Users/tigerhuang/cofeplus/.worktrees/implement-copy-step4-flow/tests/menu-management.behavior.test.js`

Expected: PASS.
