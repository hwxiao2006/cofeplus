# Materials Card Action Style Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the materials card shell and footer actions in `materials.html` so the card feels more polished, the arrow button is removed, and `发货 / 补充` become two equal desktop-and-mobile actions.

**Architecture:** Keep the existing material-card markup mostly intact, but remove the detail-arrow and `使用中` footer text, convert the action area into a two-button equal-width row, and tighten the shell styling toward the approved comparison direction. Lock the new structure with targeted assertions in the existing materials regression test file.

**Tech Stack:** Static HTML, inline CSS, vanilla JavaScript, Node built-in test runner with `assert`

---

## File Structure

- Modify: `materials.html`
  - Refresh material-card shell styling
  - Remove footer arrow and status text
  - Rebuild footer actions as a two-button equal-width row
- Modify: `tests/materials.device-routing.test.js`
  - Add assertions for the new footer structure and mobile layout behavior

## Chunk 1: Tests First

### Task 1: Add failing assertions for the new card-footer structure

**Files:**
- Modify: `tests/materials.device-routing.test.js`
- Test: `tests/materials.device-routing.test.js`

- [ ] **Step 1: Write the failing test**

Add assertions that:

- `.detail-mini-btn` no longer exists in `materials.html`
- `.use-text` no longer exists in the rendered card footer structure
- `.card-actions` is structured as a two-button row
- mobile keeps the two actions side by side instead of wrapping / stacking

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `node --test tests/materials.device-routing.test.js`

Expected: FAIL on the new materials-card footer assertions because the page still contains the arrow button and `使用中` footer text.

## Chunk 2: Implement The Approved Visual Direction

### Task 2: Refresh the material-card shell

**Files:**
- Modify: `materials.html`
- Test: `tests/materials.device-routing.test.js`

- [ ] **Step 1: Update card shell styling**

Adjust:

- card border / radius / background / shadow
- head / body / footer spacing
- visual finish toward the approved polished `C` direction

- [ ] **Step 2: Keep the information hierarchy intact**

Preserve:

- title
- status pill
- material code row
- stock value
- threshold bar
- warning / critical meta

- [ ] **Step 3: Run the targeted test**

Run: `node --test tests/materials.device-routing.test.js`

Expected: footer-specific assertions may still fail until the action structure is updated.

### Task 3: Replace the footer controls with the approved two-button layout

**Files:**
- Modify: `materials.html`
- Test: `tests/materials.device-routing.test.js`

- [ ] **Step 1: Remove the old footer extras**

Remove:

- `使用中`
- right-arrow detail button

- [ ] **Step 2: Rebuild the action group**

Implement:

- `发货`
- `补充`
- equal width
- same row on desktop
- same row on mobile
- clearer visual affordance closer to the approved `B` button direction

- [ ] **Step 3: Preserve action handlers**

Keep:

- `goToRefillPage(item.code)`
- `openRefillModal(item.code)`

- [ ] **Step 4: Run the targeted test to verify it passes**

Run: `node --test tests/materials.device-routing.test.js`

Expected: PASS

## Chunk 3: Final Verification

### Task 4: Verify the touched surface

**Files:**
- Modify: `materials.html`
- Modify: `tests/materials.device-routing.test.js`

- [ ] **Step 1: Run targeted regression**

Run: `node --test tests/materials.device-routing.test.js`

Expected: PASS

- [ ] **Step 2: Review diff for scope**

Run: `git diff -- materials.html tests/materials.device-routing.test.js docs/superpowers/specs/2026-04-07-materials-card-action-style-design.md docs/superpowers/plans/2026-04-07-materials-card-action-style-implementation-plan.md`

Expected: only the card-style, tests, spec, and plan changes appear.
