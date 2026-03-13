# Admin Sidebar Language Switch Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a persistent `中 | EN` switch below the sidebar login block and translate only the admin shell navigation text across all sidebar pages.

**Architecture:** Each sidebar page gets the same tiny local translation layer keyed by `adminSidebarLang`. The layer updates the brand title, section titles, menu labels, and mobile header titles in place by reading the existing DOM structure, while leaving page content and menu-management product language logic untouched.

**Tech Stack:** Static HTML prototype pages, vanilla JavaScript DOM updates, Node regex/runtime tests.

---

### Task 1: Lock the sidebar language-switch contract with failing tests

**Files:**
- Create: `tests/sidebar.admin-lang.test.js`
- Test: `tests/sidebar.admin-lang.test.js`

**Step 1: Write the failing test**

Add assertions covering the shared sidebar pages:
- switch markup exists under the sidebar login area
- `ADMIN_SIDEBAR_LANG_KEY` uses `adminSidebarLang`
- translation helpers exist
- menu-management still keeps its existing `platformLang` storage key separately

**Step 2: Run test to verify it fails**

Run: `node --test tests/sidebar.admin-lang.test.js`
Expected: FAIL because the switch and translation helpers do not exist yet.

**Step 3: Write minimal implementation**

Add only the minimum shared markup and script hooks needed to satisfy the failing test.

**Step 4: Run test to verify it passes**

Run: `node --test tests/sidebar.admin-lang.test.js`
Expected: PASS.

### Task 2: Implement the shared sidebar switch UI on all sidebar pages

**Files:**
- Modify: `overview.html`
- Modify: `menu.html`
- Modify: `menu-management.html`
- Modify: `devices.html`
- Modify: `orders.html`
- Modify: `materials.html`
- Modify: `faults.html`
- Modify: `customers.html`
- Modify: `locations.html`
- Modify: `staff-management.html`
- Modify: `product-detail.html`
- Test: `tests/sidebar.admin-lang.test.js`

**Step 1: Add shared markup and styling**

Insert the compact `中 | EN` switch below `.sidebar-login` and add low-emphasis styles aligned with the section-title left edge.

**Step 2: Add shared translation helpers**

On each page, add:
- `ADMIN_SIDEBAR_LANG_KEY`
- `ADMIN_SIDEBAR_TRANSLATIONS`
- read/write helpers
- DOM render helper that updates brand, sections, nav labels, and mobile header titles

**Step 3: Hook into page initialization**

Ensure the translation render runs during initial sidebar setup and after clicking the language switch.

**Step 4: Run focused tests**

Run: `node --test tests/sidebar.admin-lang.test.js`
Expected: PASS.

### Task 3: Add representative runtime verification

**Files:**
- Create: `tests/sidebar.admin-lang.runtime.test.js`
- Test: `tests/sidebar.admin-lang.runtime.test.js`

**Step 1: Write the failing runtime test**

Use `vm` with lightweight DOM stubs against representative pages such as `overview.html`, `faults.html`, and `menu-management.html` to verify:
- switching to English updates the shell text
- switching back to Chinese restores Chinese
- menu-management still exposes `platformLang` independently

**Step 2: Run test to verify it fails**

Run: `node --test tests/sidebar.admin-lang.runtime.test.js`
Expected: FAIL until the render helper is wired correctly.

**Step 3: Write minimal implementation**

Adjust the DOM translation logic only as needed to make the runtime expectations pass.

**Step 4: Run test to verify it passes**

Run: `node --test tests/sidebar.admin-lang.runtime.test.js`
Expected: PASS.

### Task 4: Regression verification

**Files:**
- Modify: `overview.html`
- Modify: `menu.html`
- Modify: `menu-management.html`
- Modify: `devices.html`
- Modify: `orders.html`
- Modify: `materials.html`
- Modify: `faults.html`
- Modify: `customers.html`
- Modify: `locations.html`
- Modify: `staff-management.html`
- Modify: `product-detail.html`

**Step 1: Run final verification**

Run:
- `node --test tests/sidebar.admin-lang.test.js tests/sidebar.admin-lang.runtime.test.js`
- `node --test tests/sidebar.shared-login.test.js tests/sidebar.shared-alignment.test.js tests/overview.sidebar-login.test.js`
- `node --test tests/overview.device-language-config.test.js tests/overview.multi-currency.test.js tests/overview.hourly-chart-values.test.js`

Expected: All commands pass.

**Step 2: Commit**

```bash
git add overview.html menu.html menu-management.html devices.html orders.html materials.html faults.html customers.html locations.html staff-management.html product-detail.html tests/sidebar.admin-lang.test.js tests/sidebar.admin-lang.runtime.test.js docs/plans/2026-03-11-admin-sidebar-language-switch-design.md docs/plans/2026-03-11-admin-sidebar-language-switch-plan.md
git commit -m "Add admin sidebar language switch"
```
