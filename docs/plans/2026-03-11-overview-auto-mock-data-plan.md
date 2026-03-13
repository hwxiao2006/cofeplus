# Overview Auto Mock Data Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automatically generate stable mock operating data for runtime-added devices so `overview.html` and `menu.html` always render usable business metrics.

**Architecture:** Preserve the existing hand-authored datasets for the three seed devices and wrap all business-data reads in deterministic fallback helpers. The helpers derive per-device mock values from the existing sample templates, cache them in memory, and are called only when a device lacks explicit data.

**Tech Stack:** Static HTML mock pages, vanilla JavaScript runtime state, Node-based behavior tests using `vm`.

---

### Task 1: Lock the regression with a failing runtime test

**Files:**
- Modify: `tests/overview.device-language-config.test.js`
- Test: `tests/overview.device-language-config.test.js`

**Step 1: Write the failing test**

Add assertions that a new device such as `RCK386` can also read generated operating data from both `overview.html` and `menu.html`, and that the same device returns stable values across repeated reads.

**Step 2: Run test to verify it fails**

Run: `node --test tests/overview.device-language-config.test.js`
Expected: FAIL because the pages do not yet expose generated operating data for unknown devices.

**Step 3: Write minimal implementation**

Expose only the minimum helper surface needed by the test, then wire it into the runtime generation code.

**Step 4: Run test to verify it passes**

Run: `node --test tests/overview.device-language-config.test.js`
Expected: PASS for the new generated-data assertions.

### Task 2: Add deterministic operating-data fallback in `overview.html`

**Files:**
- Modify: `overview.html`
- Test: `tests/overview.device-language-config.test.js`

**Step 1: Write minimal implementation**

Add helpers that:
- derive a stable numeric seed from `deviceId`
- clone and scale the existing sales-history template
- generate/cached YOY and product-structure data
- return authored data first, generated data second

**Step 2: Update overview render call sites**

Replace direct reads from `salesHistoryByDevice`, `yoyReferenceByDevice`, and the static structure object with helper-based accessors.

**Step 3: Run focused tests**

Run: `node --test tests/overview.device-language-config.test.js tests/overview.multi-currency.test.js tests/overview.hourly-chart-values.test.js`
Expected: PASS with the new fallback logic and no regression to currency/chart behavior.

### Task 3: Mirror the fallback in `menu.html`

**Files:**
- Modify: `menu.html`
- Test: `tests/overview.device-language-config.test.js`

**Step 1: Write minimal implementation**

Port the same deterministic operating-data helper pattern to `menu.html` so its embedded overview tab behaves the same as `overview.html`.

**Step 2: Run focused tests**

Run: `node --test tests/overview.device-language-config.test.js`
Expected: PASS for both pages in the shared runtime regression test.

### Task 4: Regression verification

**Files:**
- Modify: `overview.html`
- Modify: `menu.html`
- Modify: `tests/overview.device-language-config.test.js`

**Step 1: Run final verification**

Run:
- `node --test tests/overview.device-language-config.test.js`
- `node --test tests/overview.sidebar-login.test.js tests/overview.multi-currency.test.js tests/overview.hourly-chart-values.test.js`
- `node --test tests/sidebar.shared-login.test.js tests/sidebar.shared-alignment.test.js`

Expected: All commands pass.

**Step 2: Commit**

```bash
git add overview.html menu.html tests/overview.device-language-config.test.js docs/plans/2026-03-11-overview-auto-mock-data-design.md docs/plans/2026-03-11-overview-auto-mock-data-plan.md
git commit -m "Add fallback overview mock data for runtime devices"
```
