# Materials Category Grouping Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Group the materials board into fixed top-level category sections on desktop and mobile while preserving the existing card actions and summary behavior.

**Architecture:** Keep the current single-page `materials.html` structure, but replace the flat materials grid render path with category-section rendering driven by a fixed category order plus a fine-grained-to-top-level mapping helper. Lock the new structure with targeted regex-based tests in the existing materials page test file.

**Tech Stack:** Static HTML, inline CSS, vanilla JavaScript, Node built-in test runner with `assert`

---

## File Structure

- Modify: `materials.html`
  - Add grouped board section markup and responsive section styles
  - Add fixed top-level category order and mapping helpers
  - Update `renderMaterials()` to render all approved categories plus fallback `未分类`
- Modify: `tests/materials.device-routing.test.js`
  - Add test coverage for grouped categories, empty-state rendering hooks, and mobile full-category presentation

## Chunk 1: Tests First

### Task 1: Add the failing grouped-layout assertions

**Files:**
- Modify: `tests/materials.device-routing.test.js`
- Test: `tests/materials.device-routing.test.js`

- [ ] **Step 1: Write the failing test**

Add assertions for:

- fixed top-level category order constant
- grouped section container markup
- category section title / meta hooks
- empty-state hook for categories with no materials
- mobile layout continuing to render all categories without collapse or anchor navigation

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/materials.device-routing.test.js`

Expected: FAIL on the new grouped-layout assertions because `materials.html` still renders a flat grid only.

## Chunk 2: Grouped Materials Board

### Task 2: Add category grouping data helpers

**Files:**
- Modify: `materials.html`
- Test: `tests/materials.device-routing.test.js`

- [ ] **Step 1: Write minimal implementation for grouping constants**

Add:

- fixed `MATERIAL_CATEGORY_ORDER`
- fine-grained category mapping object / resolver
- fallback `未分类` support

- [ ] **Step 2: Run test to verify progress**

Run: `node --test tests/materials.device-routing.test.js`

Expected: some new assertions may pass, but grouped section markup assertions should still fail until render output is updated.

### Task 3: Replace flat grid rendering with grouped section rendering

**Files:**
- Modify: `materials.html`
- Test: `tests/materials.device-routing.test.js`

- [ ] **Step 1: Update board markup and render function**

Change the materials board to render:

- one section per approved category
- category header with count and optional critical count
- existing cards inside per-category grids
- empty-state row for categories with no materials
- optional `未分类` section after the approved categories only when needed

- [ ] **Step 2: Preserve card actions and summary stats**

Keep:

- current card content structure
- `发货` route
- `补充` modal
- detail button
- global summary counts based on all materials

- [ ] **Step 3: Run test to verify it passes**

Run: `node --test tests/materials.device-routing.test.js`

Expected: PASS

## Chunk 3: Responsive Layout

### Task 4: Add grouped-section responsive styles

**Files:**
- Modify: `materials.html`
- Test: `tests/materials.device-routing.test.js`

- [ ] **Step 1: Add section-level styles**

Add:

- category section shell
- section header layout
- section spacing stronger than card spacing
- section empty-state styles

- [ ] **Step 2: Keep desktop density and mobile full-stack behavior**

Desktop:

- maintain multi-column card grids per section

Mobile:

- keep all categories rendered
- no collapse
- no top anchor nav
- single-column cards for tap comfort

- [ ] **Step 3: Run test to verify it stays green**

Run: `node --test tests/materials.device-routing.test.js`

Expected: PASS

## Chunk 4: Final Verification

### Task 5: Verify the touched surface

**Files:**
- Modify: `materials.html`
- Modify: `tests/materials.device-routing.test.js`

- [ ] **Step 1: Run targeted materials tests**

Run: `node --test tests/materials.device-routing.test.js`

Expected: PASS

- [ ] **Step 2: Run the broader relevant regression suite**

Run: `node --test tests/`

Expected: PASS, or if unrelated pre-existing failures exist, capture them clearly before claiming completion.

- [ ] **Step 3: Review diff for scope**

Run: `git diff -- materials.html tests/materials.device-routing.test.js docs/superpowers/plans/2026-04-03-materials-category-grouping-implementation-plan.md`

Expected: only the planned materials board and test changes plus the saved plan file.

