# Staff Permission Tree Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the legacy staff role checkbox block with the approved operations permission tree, including local data migration, grouped display, and updated staff stats.

**Architecture:** Keep the implementation self-contained inside `staff-management.html` and the existing behavior test file. Introduce a permission tree metadata object, render the form from that metadata, normalize stored permission arrays on load, and format grouped labels for list display. Update only the staff page mock data and its assertions.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Node-based regex tests

---

### Task 1: Lock the new contract with failing tests

**Files:**
- Modify: `/Users/tigerhuang/cofeplus/tests/staff-management.behavior.test.js`
- Test: `/Users/tigerhuang/cofeplus/tests/staff-management.behavior.test.js`

**Step 1: Write the failing test**

Add assertions for:
- `菜单权限配置`
- `查看总览`
- `查看商品管理`
- `新增语言`
- `更改币种`
- `编辑商品`
- `编辑配方`
- `查看订单`
- `订单退款`
- `查看人员管理`
- `人员维护`
- removal of the old five legacy permission labels from the permission form block

**Step 2: Run test to verify it fails**

Run: `node tests/staff-management.behavior.test.js`
Expected: FAIL because the old permission block still exists.

**Step 3: Write minimal implementation**

Do not implement yet. Move to Task 2 after the red test is confirmed.

**Step 4: Run test to verify it passes**

Run after Task 2 implementation.

**Step 5: Commit**

```bash
git add tests/staff-management.behavior.test.js staff-management.html docs/plans/2026-03-16-staff-permission-tree-design.md docs/plans/2026-03-16-staff-permission-tree-implementation.md
git commit -m "feat: replace staff roles with permission tree"
```

### Task 2: Replace the permission form and data model

**Files:**
- Modify: `/Users/tigerhuang/cofeplus/staff-management.html`
- Test: `/Users/tigerhuang/cofeplus/tests/staff-management.behavior.test.js`

**Step 1: Write the failing test**

Use the Task 1 assertions as the red gate.

**Step 2: Run test to verify it fails**

Run: `node tests/staff-management.behavior.test.js`
Expected: FAIL with missing tree labels or unexpected legacy labels.

**Step 3: Write minimal implementation**

Implement:
- permission tree metadata constants
- a new rendered tree block in the modal
- normalization helpers for legacy permissions
- parent-child checkbox sync helpers
- save/fill/reset logic using the new permission keys

**Step 4: Run test to verify it passes**

Run: `node tests/staff-management.behavior.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add staff-management.html tests/staff-management.behavior.test.js
git commit -m "feat: add staff permission tree model"
```

### Task 3: Update staff card summaries and stats

**Files:**
- Modify: `/Users/tigerhuang/cofeplus/staff-management.html`
- Test: `/Users/tigerhuang/cofeplus/tests/staff-management.behavior.test.js`

**Step 1: Write the failing test**

Add assertions for:
- grouped permission rendering helpers
- `ops.orders.refund`
- `ops.staff.manage`
- new stat labels

**Step 2: Run test to verify it fails**

Run: `node tests/staff-management.behavior.test.js`
Expected: FAIL because the old label map and stats logic still reference removed role keys.

**Step 3: Write minimal implementation**

Implement:
- grouped display formatter
- updated stat labels and counts
- updated mock staff seed permissions

**Step 4: Run test to verify it passes**

Run: `node tests/staff-management.behavior.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add staff-management.html tests/staff-management.behavior.test.js
git commit -m "feat: update staff permission summaries and stats"
```

### Task 4: Run regression checks

**Files:**
- Verify: `/Users/tigerhuang/cofeplus/tests/staff-management.behavior.test.js`

**Step 1: Write the failing test**

No new test. Use existing regression coverage.

**Step 2: Run test to verify it fails**

Already covered in prior tasks.

**Step 3: Write minimal implementation**

No code changes expected unless regressions appear.

**Step 4: Run test to verify it passes**

Run:
- `node tests/staff-management.behavior.test.js`
- `for file in tests/*.test.js; do node "$file" || exit 1; done`

Expected:
- target test PASS
- full suite exits `0`

**Step 5: Commit**

```bash
git add staff-management.html tests/staff-management.behavior.test.js
git commit -m "test: verify staff permission tree regressions"
```
