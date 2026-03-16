# Staff Account Status Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add account enable/disable controls to staff management and replace the top summary cards with a single enabled-staff summary.

**Architecture:** Extend the existing local staff model with an `accountEnabled` boolean, default it during bootstrap and create flows, and render status plus toggle actions directly on each staff card. Remove the existing multi-stat card layout and replace it with one compact summary strip bound to enabled staff count.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Node-based regex tests

---

### Task 1: Write failing tests for account status and summary simplification

**Files:**
- Modify: `/Users/tigerhuang/cofeplus/tests/staff-management.behavior.test.js`
- Test: `/Users/tigerhuang/cofeplus/tests/staff-management.behavior.test.js`

**Step 1: Write the failing test**

Add assertions for:
- `启用人员数`
- `staffEnabledCount`
- `停用账号`
- `启用账号`
- `accountEnabled`
- `toggleStaffLoginStatus`
- removal of the old summary stats ids and labels

**Step 2: Run test to verify it fails**

Run: `node tests/staff-management.behavior.test.js`
Expected: FAIL because the page still uses the old summary structure and lacks account status handling.

**Step 3: Write minimal implementation**

Do not implement yet.

**Step 4: Run test to verify it passes**

Run after Task 2.

**Step 5: Commit**

```bash
git add tests/staff-management.behavior.test.js staff-management.html docs/plans/2026-03-16-staff-account-status-design.md docs/plans/2026-03-16-staff-account-status-implementation.md
git commit -m "feat: add staff account status design and tests"
```

### Task 2: Implement account status and compact summary

**Files:**
- Modify: `/Users/tigerhuang/cofeplus/staff-management.html`
- Test: `/Users/tigerhuang/cofeplus/tests/staff-management.behavior.test.js`

**Step 1: Write the failing test**

Use Task 1 assertions as the red gate.

**Step 2: Run test to verify it fails**

Run: `node tests/staff-management.behavior.test.js`
Expected: FAIL

**Step 3: Write minimal implementation**

Implement:
- summary strip markup and styling
- `accountEnabled` normalization
- enable/disable toggle function
- updated card actions and status rendering
- enabled staff count calculation

**Step 4: Run test to verify it passes**

Run: `node tests/staff-management.behavior.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add staff-management.html tests/staff-management.behavior.test.js
git commit -m "feat: add staff account status controls"
```

### Task 3: Regression verification

**Files:**
- Verify: `/Users/tigerhuang/cofeplus/tests/staff-management.behavior.test.js`

**Step 1: Write the failing test**

No new test.

**Step 2: Run test to verify it fails**

Already covered.

**Step 3: Write minimal implementation**

No code change unless regressions appear.

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
git commit -m "test: verify staff account status regressions"
```
