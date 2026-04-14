# Materials Lane Board Lightweight Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `materials.html` into a lightweight lane-first board, lightly carry lane context into shipment/refill pages, and add a separate permission-gated lane-name edit ability without fully rewriting the refill or shipment-order model.

**Architecture:** Keep the existing shipment and refill flow structurally intact, but split the board-facing mock into lane-oriented fields (`laneGroup`, `laneName`, `materialName`, `materialCode`) while preserving material-code-driven actions underneath. Carry the originating lane name through session storage into the refill and orders flow where available, and wire a dedicated `ops.materials.laneNameEdit` permission into both the main board and the staff-permission configuration UI.

**Tech Stack:** Static HTML, inline CSS, vanilla JavaScript, sessionStorage/localStorage, shared admin access helper, Node built-in test runner with `assert`, `fs`, and `vm`

---

## File Structure

- Modify: `materials.html`
  - Replace the previous 9 material-group board logic with 6 lane groups
  - Render lane name, associated material name, and material code on each card
  - Keep `发货 / 补充` actions routed by associated material code
  - Add permission-gated lane-name editing
  - Persist lightweight lane context into shipment navigation
- Modify: `materials-refill.html`
  - Keep the current material-pool layout
  - Read the originating lane context and surface it near the preselected material and confirmation summary
  - Persist lane name onto shipment items when the flow started from a lane card
- Modify: `materials-orders.html`
  - Keep the current order list/table structure
  - Surface lane name on shipment detail lines when available
- Modify: `staff-management.html`
  - Add `ops.materials.laneNameEdit` under the materials permission group
  - Update permission counts, summaries, and default mock permissions as needed
- Modify: `tests/materials.device-routing.test.js`
  - Replace the old 9-category assertions with lane-board assertions
  - Add lightweight lane-context assertions for refill/orders pages
  - Add runtime checks for lane context persistence and permission gating
- Modify: `tests/staff-management.behavior.test.js`
  - Add assertions for the new lane-name edit permission option

## Chunk 1: Lock The New Lightweight Lane Expectations In Tests

### Task 1: Replace old material-board assertions with lane-board assertions

**Files:**
- Modify: `tests/materials.device-routing.test.js`
- Test: `tests/materials.device-routing.test.js`

- [ ] **Step 1: Write the failing structure assertions**

Replace or update assertions so they expect:

- `materials.html` uses the 6 approved lane groups instead of the previous 9 material groups
- cards render lane name, `关联物料`, and `商品编码`
- lane-card actions still call shipment/refill handlers with the associated material code
- the main board includes a lane-name edit entry or render hook

- [ ] **Step 2: Write the failing lightweight lane-context assertions**

Add assertions that:

- `materials-refill.html` can render a lightweight `来源货道` or equivalent lane-context label
- `materials-orders.html` can render lane name on detail lines when the order item carries it
- lane context remains optional rather than becoming required for all rows

- [ ] **Step 3: Run the targeted test to verify it fails**

Run: `node --test tests/materials.device-routing.test.js`

Expected: FAIL because the board still uses the old material-group model and the refill/orders pages do not yet surface lane context.

### Task 2: Add failing permission-UI assertions for lane-name editing

**Files:**
- Modify: `tests/staff-management.behavior.test.js`
- Test: `tests/staff-management.behavior.test.js`

- [ ] **Step 1: Write the failing test**

Add assertions that:

- `staff-management.html` includes `ops.materials.laneNameEdit`
- the materials permission group count updates from `0/1` to `0/2`
- the materials group exposes a label such as `编辑货道名称`

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `node --test tests/staff-management.behavior.test.js`

Expected: FAIL because the materials permission group currently only includes `ops.materials`.

## Chunk 2: Convert The Main Board Into A Lane Board

### Task 3: Introduce a lightweight lane-oriented board model in `materials.html`

**Files:**
- Modify: `materials.html`
- Test: `tests/materials.device-routing.test.js`

- [ ] **Step 1: Define lane-group ordering and board mapping**

Add board-specific constants such as:

```js
const LANE_GROUP_ORDER = [
    '咖啡豆仓',
    '牛奶&水',
    '糖浆',
    '前后道粉',
    '包材',
    '制冰机'
];
```

Map the existing board data into a lane-oriented shape with fields like:

```js
{
    laneGroup: '糖浆',
    laneName: '香草糖浆-2',
    materialName: '好成香草糖浆',
    materialCode: '01010407014',
    materialActionCode: '20010002'
}
```

- [ ] **Step 2: Update card rendering**

Render:

- lane name as the title
- associated material name on its own row
- product code on its own row
- existing stock/threshold data as lane attributes

- [ ] **Step 3: Keep the current density and action semantics**

Preserve:

- grouped board sections
- responsive dense-grid behavior
- `发货 / 补充` buttons

But route those buttons using the associated material action code, not the displayed lane name.

- [ ] **Step 4: Run the targeted board test**

Run: `node --test tests/materials.device-routing.test.js`

Expected: lane-group and card-structure assertions pass, while lane-name edit and lane-context assertions may still fail.

### Task 4: Add permission-gated lane-name editing on the main board

**Files:**
- Modify: `materials.html`
- Test: `tests/materials.device-routing.test.js`

- [ ] **Step 1: Load and read the dedicated permission**

Add `shared/admin-staff-access.js` to `materials.html` if needed, then implement a focused helper such as:

```js
function canEditLaneName() {
    const helper = window.CofeAdminStaffAccess;
    const access = helper && typeof helper.resolveCurrentStaffAccess === 'function'
        ? helper.resolveCurrentStaffAccess()
        : null;
    const permissions = Array.isArray(access?.currentStaff?.permissions) ? access.currentStaff.permissions : [];
    return permissions.includes('ops.materials.laneNameEdit');
}
```

- [ ] **Step 2: Add the edit entry and lightweight dialog**

Implement a compact edit flow that:

- opens from the lane card
- validates a non-empty lane name
- writes the updated lane name into local storage or the current mock persistence layer
- re-renders the board

- [ ] **Step 3: Keep the edit strictly scoped**

Ensure the edit flow only changes the lane name and does not mutate:

- associated material
- thresholds
- group membership

- [ ] **Step 4: Run the targeted board test again**

Run: `node --test tests/materials.device-routing.test.js`

Expected: main-board permission and lane-edit assertions pass.

## Chunk 3: Lightly Carry Lane Context Through Shipment Flow

### Task 5: Persist and show originating lane context in `materials-refill.html`

**Files:**
- Modify: `materials.html`
- Modify: `materials-refill.html`
- Test: `tests/materials.device-routing.test.js`

- [ ] **Step 1: Extend the shipment entry payload**

When opening the refill page from a lane card, store a lightweight payload including:

```js
{
    materialCode: '20010002',
    laneName: '香草糖浆-2'
}
```

This can reuse the existing session-storage-based routing pattern.

- [ ] **Step 2: Surface lane context without changing the core refill layout**

Update `materials-refill.html` so the current material-pool structure stays intact, but the UI can show:

- `来源货道：香草糖浆-2`

near the preselected row, selected summary, or confirmation context.

- [ ] **Step 3: Attach lane name to submitted shipment items when available**

When the shipment is generated, include `laneName` only for the selected item that originated from a lane context. Do not force every order line to require a lane.

- [ ] **Step 4: Run the targeted test**

Run: `node --test tests/materials.device-routing.test.js`

Expected: refill-page lane-context assertions pass while orders-page display assertions may still fail.

### Task 6: Surface optional lane name in `materials-orders.html`

**Files:**
- Modify: `materials-orders.html`
- Test: `tests/materials.device-routing.test.js`

- [ ] **Step 1: Extend normalized order-item display**

Allow order items to optionally carry:

```js
{
    laneName: '香草糖浆-2'
}
```

without changing existing item normalization for records that have no lane context.

- [ ] **Step 2: Render lane name lightly in list/detail output**

Add lane name to:

- detail modal item lines
- list/table item summaries where the markup remains readable

Only show the lane label when the item actually has lane data.

- [ ] **Step 3: Keep the page structurally material-first**

Do not redesign the whole orders page into a lane-first table. This task is only about optional lane context carry-through.

- [ ] **Step 4: Run the targeted test**

Run: `node --test tests/materials.device-routing.test.js`

Expected: PASS

## Chunk 4: Wire The New Permission Into Staff Management

### Task 7: Add `ops.materials.laneNameEdit` to the staff-permission UI

**Files:**
- Modify: `staff-management.html`
- Test: `tests/staff-management.behavior.test.js`

- [ ] **Step 1: Add the permission option to the materials group**

Update:

- inline permission checkbox markup
- permission group count
- permission tree config arrays

so the materials group includes:

- `ops.materials`
- `ops.materials.laneNameEdit`

- [ ] **Step 2: Update default mock permissions where needed**

If the default demo staff should be able to exercise lane-name editing in local preview, add `ops.materials.laneNameEdit` to the appropriate seeded account.

- [ ] **Step 3: Keep scope logic unchanged**

Do not add lane-name editing into `deviceScopedModuleConfigs`, because this is not a device-scope module selector. It is a plain additional page permission.

- [ ] **Step 4: Run the staff-management targeted test**

Run: `node --test tests/staff-management.behavior.test.js`

Expected: PASS

## Chunk 5: Final Verification

### Task 8: Verify the lightweight lane-board change set

**Files:**
- Modify: `materials.html`
- Modify: `materials-refill.html`
- Modify: `materials-orders.html`
- Modify: `staff-management.html`
- Modify: `tests/materials.device-routing.test.js`
- Modify: `tests/staff-management.behavior.test.js`
- Add: `docs/superpowers/plans/2026-04-08-materials-lane-board-lightweight-implementation-plan.md`

- [ ] **Step 1: Run targeted regressions**

Run:

- `node --test tests/materials.device-routing.test.js`
- `node --test tests/staff-management.behavior.test.js`

Expected: PASS

- [ ] **Step 2: Review the scoped diff**

Run:

```bash
git diff -- materials.html materials-refill.html materials-orders.html staff-management.html tests/materials.device-routing.test.js tests/staff-management.behavior.test.js docs/superpowers/specs/2026-04-08-materials-lane-board-lightweight-design.md docs/superpowers/plans/2026-04-08-materials-lane-board-lightweight-implementation-plan.md
```

Expected: only the lightweight lane-board board changes, light lane-context carry-through, permission UI update, and their tests appear.
