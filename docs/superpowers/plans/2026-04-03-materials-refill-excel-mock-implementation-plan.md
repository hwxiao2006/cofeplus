# Materials Refill Excel Mock Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the refill-page hand-written material mock list with an Excel-driven master list while preserving the current add-material workflow and compatibility with existing preselection flows.

**Architecture:** Keep [materials-refill.html](/Users/mac/Documents/New%20project%204/materials-refill.html) as a single self-contained page, but change its mock source from a manually grouped literal to an Excel-derived master array plus a category resolver that rebuilds the existing `materialsData` shape. Preserve current `code` values for overlapping materials that are already linked from [materials.html](/Users/mac/Documents/New%20project%204/materials.html), and use Excel `货物编号` as `materialNumber` for visible display.

**Tech Stack:** Static HTML, inline JavaScript, Node built-in test runner with `assert`, temporary offline `.xls` parsing during authoring only

---

## File Structure

- Modify: `materials-refill.html`
  - Replace the handwritten refill mock list with an Excel-derived master list
  - Add category-order and category-mapping helpers
  - Rebuild `materialsData` from the master list while preserving overlapping compatibility codes
- Modify: `tests/materials.device-routing.test.js`
  - Add assertions for Excel-derived names, codes, category helpers, and continued list/runtime compatibility
- Create: `docs/superpowers/plans/2026-04-03-materials-refill-excel-mock-implementation-plan.md`
  - Persist the implementation plan for this task

## Chunk 1: Tests First

### Task 1: Add the failing Excel-driven refill assertions

**Files:**
- Modify: `tests/materials.device-routing.test.js`
- Test: `tests/materials.device-routing.test.js`

- [ ] **Step 1: Write the failing test**

Add assertions that the refill page now contains:

- Excel-derived product names such as `君乐宝牛奶（10L箱）`, `16oz纸杯(鹿森)`, `机压杯盖`
- Excel-derived coding fields such as `materialNumber: "01020111"` and `materialNumber: "01010407014"`
- a refill-page category-order / category-resolver path rather than only a static handwritten grouped object
- continued active-category-only rendering and continued `code` + `materialNumber` order payload writing

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/materials.device-routing.test.js`

Expected: FAIL on the new refill Excel assertions because the page still contains the old handwritten item names and data source.

## Chunk 2: Excel-Aligned Refill Master List

### Task 2: Add the Excel-derived master list and category mapping helpers

**Files:**
- Modify: `materials-refill.html`
- Test: `tests/materials.device-routing.test.js`

- [ ] **Step 1: Add fixed category-order and compatibility helpers**

Add:

- fixed refill category order constant
- compatibility-code map for overlapping materials that are already referenced from `materials.html`
- category resolver that maps Excel items into the approved `9` categories
- helper that rebuilds the grouped `materialsData` object from a master array

- [ ] **Step 2: Replace the old handwritten grouped literal with the Excel-driven master array**

Add the Excel-derived rows from the `入库` sheet with:

- `name`
- `code`
- `materialNumber`
- `spec`
- `unit`
- placeholder `remaining`
- placeholder `max`

- [ ] **Step 3: Run test to verify progress**

Run: `node --test tests/materials.device-routing.test.js`

Expected: the new Excel-name and helper assertions pass, but follow-up compatibility failures may still appear until render and order-writing paths are rechecked.

## Chunk 3: Preserve Current Refill Flow

### Task 3: Verify existing refill interactions still use the rebuilt data shape

**Files:**
- Modify: `materials-refill.html`
- Test: `tests/materials.device-routing.test.js`

- [ ] **Step 1: Confirm active-category rendering still works with rebuilt grouped data**

Keep:

- `currentCategory`
- active-list-only rendering
- quantity stepper behavior
- selected summary lookup by `code`

- [ ] **Step 2: Confirm order creation still writes both `code` and `materialNumber`**

Keep the current payload pattern:

- internal `code` for compatibility
- visible / persisted `materialNumber` for Excel alignment

- [ ] **Step 3: Run targeted test to verify it passes**

Run: `node --test tests/materials.device-routing.test.js`

Expected: PASS

## Chunk 4: Final Verification

### Task 4: Verify the touched surface

**Files:**
- Modify: `materials-refill.html`
- Modify: `tests/materials.device-routing.test.js`

- [ ] **Step 1: Run targeted refill/materials regression**

Run: `node --test tests/materials.device-routing.test.js`

Expected: PASS

- [ ] **Step 2: Review the diff for scope**

Run: `git diff -- materials-refill.html tests/materials.device-routing.test.js docs/superpowers/specs/2026-04-03-materials-refill-excel-mock-design.md docs/superpowers/plans/2026-04-03-materials-refill-excel-mock-implementation-plan.md`

Expected: only the refill mock-data refresh, tests, spec, and saved plan changes appear.
