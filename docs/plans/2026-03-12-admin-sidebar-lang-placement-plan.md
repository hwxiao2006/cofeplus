# Admin Sidebar Language Placement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move the admin sidebar language switch into the `Prototype v0` metadata line so it feels like a global shell preference and no longer interrupts the menu stack.

**Architecture:** Introduce one shared metadata row in the sidebar header for version text and the inline `中 | EN` switch. Keep the existing translation logic and storage untouched; only the markup structure, alignment, and supporting CSS change across the shared sidebar pages.

**Tech Stack:** Static HTML prototype pages, vanilla CSS, Node regex/runtime tests.

---

### Task 1: Lock the new metadata-row structure with a failing test

**Files:**
- Modify: `tests/sidebar.admin-lang.test.js`
- Test: `tests/sidebar.admin-lang.test.js`

**Step 1: Write the failing test**

Require all sidebar pages to render:
- a shared metadata row in the sidebar header
- `Prototype v0` and `.sidebar-admin-lang` in the same row
- alignment via the existing sidebar padding variables

**Step 2: Run test to verify it fails**

Run: `node --test tests/sidebar.admin-lang.test.js`
Expected: FAIL because the switch currently sits on its own line below the login row.

**Step 3: Write minimal implementation**

Update only the markup and CSS necessary to satisfy the new structure.

**Step 4: Run test to verify it passes**

Run: `node --test tests/sidebar.admin-lang.test.js`
Expected: PASS.

### Task 2: Move the language switch into the metadata row on all sidebar pages

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

**Step 1: Add the shared metadata row**

Wrap `Prototype v0` and `.sidebar-admin-lang` into one inline row within `.sidebar-header`.

**Step 2: Refine the styling**

Add styles for:
- `.sidebar-meta-row`
- inline separator treatment
- compact inline language switch spacing
- alignment to the shared menu-text vertical line

**Step 3: Keep behavior unchanged**

Ensure the existing `adminSidebarLang` translation and active-state logic continue to work without script changes beyond any selector-safe adjustments.

**Step 4: Run focused tests**

Run: `node --test tests/sidebar.admin-lang.test.js tests/sidebar.admin-lang.runtime.test.js`
Expected: PASS.

### Task 3: Regression verification

**Files:**
- Modify: `tests/sidebar.admin-lang.test.js`
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

Expected: All commands pass.

**Step 2: Commit**

```bash
git add tests/sidebar.admin-lang.test.js overview.html menu.html menu-management.html devices.html orders.html materials.html faults.html customers.html locations.html staff-management.html product-detail.html docs/plans/2026-03-12-admin-sidebar-lang-placement-design.md docs/plans/2026-03-12-admin-sidebar-lang-placement-plan.md
git commit -m "Refine admin sidebar language switch placement"
```
