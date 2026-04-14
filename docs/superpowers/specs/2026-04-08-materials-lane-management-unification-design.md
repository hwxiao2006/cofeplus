# Materials Lane Management Unification Design

**Date:** 2026-04-08

## Goal

Replace the current material-centric interpretation of the materials management flow with a lane-centric model across:

- [materials.html](/Users/mac/Documents/New%20project%204/materials.html)
- [materials-refill.html](/Users/mac/Documents/New%20project%204/materials-refill.html)
- [materials-orders.html](/Users/mac/Documents/New%20project%204/materials-orders.html)

The approved direction is:

- the main board should display lanes, not material categories
- existing card titles should now be interpreted as lane names
- each lane has a one-to-one associated material
- the shipment flow and shipment orders should use the same lane-first vocabulary
- editing lane names should be added as a separate permission-controlled ability

## Scope

- Update the primary board model in [materials.html](/Users/mac/Documents/New%20project%204/materials.html) from grouped materials to grouped lanes
- Update the refill flow in [materials-refill.html](/Users/mac/Documents/New%20project%204/materials-refill.html) to show lanes and their associated materials
- Update shipment-order display in [materials-orders.html](/Users/mac/Documents/New%20project%204/materials-orders.html) to show both lane name and associated material
- Add a dedicated permission-gated lane-name editing entry on the main board
- Update tests in [tests/materials.device-routing.test.js](/Users/mac/Documents/New%20project%204/tests/materials.device-routing.test.js) to lock the new lane model and permission behavior

## Non-Goals

- No lane-to-multiple-material relationships
- No lane/material unbinding or rebinding workflow
- No standalone lane master-data management page
- No bulk lane rename workflow
- No redesign of shipment approval, void, or printing logic beyond wording and displayed fields
- No backend integration beyond current local mock and storage patterns

## Current Problem

The current implementation still behaves like a material board:

- [materials.html](/Users/mac/Documents/New%20project%204/materials.html) groups cards by material category
- card titles are visually read like material names
- [materials-refill.html](/Users/mac/Documents/New%20project%204/materials-refill.html) behaves like a material pool
- [materials-orders.html](/Users/mac/Documents/New%20project%204/materials-orders.html) records shipment details mainly as material lines

That no longer matches the updated business model.

The new business model is:

- the board shows lane data
- each lane is associated with exactly one material
- remaining amount, warning, critical threshold, and similar values are lane attributes

If the UI keeps the old material-first interpretation, operators will keep misunderstanding what the page is actually managing.

## Approved Lane Model

The new primary entity is `lane`.

Each lane contains:

- a lane group
- a lane name
- one associated material name
- one associated material code
- lane attributes such as remaining amount, warning threshold, critical threshold, and max capacity

The lane-to-material relationship is strictly one-to-one for this phase.

## Approved Lane Groups

The board should use these fixed top-level lane groups:

1. `咖啡豆仓`
2. `牛奶&水`
3. `糖浆`
4. `前后道粉`
5. `包材`
6. `制冰机`

These replace the previous `9` material-group sections on the main board.

## Naming Interpretation Rule

Existing visible names in the current board should now be interpreted as lane names rather than material names.

Examples:

- `香草糖浆-2` is a lane name
- `杯盖1` is a lane name
- `牛奶` is a lane name if the current mock still uses that text as the lane identifier

The lane card must separately show the associated material name so the user can distinguish:

- which lane they are looking at
- which material that lane currently carries

## Main Board Structure

## Board Grouping

[materials.html](/Users/mac/Documents/New%20project%204/materials.html) should group cards by the `6` approved lane groups rather than by material categories.

Within each group:

- each card represents one lane
- group counts represent lane counts
- warning/critical summaries still reflect lane-level health states

## Card Structure

Each main-board card should present information in this hierarchy:

1. `货道名称`
2. `关联物料：xxx`
3. `商品编码：xxx`
4. current remaining amount
5. warning / critical / max attribute display

The current stock values stay on the card, but their meaning changes:

- they are lane attributes
- they should no longer be implied to be raw material-master attributes

## Main Board Actions

The current `发货` and `补充` actions stay.

Their meaning becomes:

- `发货`: operate on the one material associated with the current lane
- `补充`: operate on the one material associated with the current lane

The current source-aware routing and device-context behavior should remain intact.

## Lane Name Editing

Lane-name editing is added only to [materials.html](/Users/mac/Documents/New%20project%204/materials.html) in this phase.

### Visibility Rule

- users with the dedicated permission can see an `编辑货道名称` entry on each lane card
- users without that permission do not see the entry at all

### Scope Rule

This editing capability changes only the lane name.

It must **not** also edit:

- associated material
- material code
- thresholds
- group membership

### Interaction Rule

Use a lightweight inline modal or compact dialog.

The edit flow should be:

- open edit
- update lane name
- validate non-empty value
- save back into the current mock/storage layer
- re-render the lane card

### Permission Rule

This permission must be independent from:

- shipment permissions
- refill permissions
- order-view permissions

The user explicitly approved this as a separate permission dimension.

## Refill Page Structure

[materials-refill.html](/Users/mac/Documents/New%20project%204/materials-refill.html) should stop reading like a pure material-pool selector.

The page should instead behave like a lane shipment selector.

### Refill Grouping

The left-side category navigation should use the same `6` approved lane groups:

- `咖啡豆仓`
- `牛奶&水`
- `糖浆`
- `前后道粉`
- `包材`
- `制冰机`

### Refill Row Structure

Each row should show:

- lane name
- associated material name
- material code
- current lane remaining amount / max capacity
- quantity selector

This ensures that users entering from a lane card still see the same lane identity on the shipment page rather than falling into a disconnected material-only list.

### Preselection Rule

When the user enters the refill page from a lane card:

- the preselection should resolve to the relevant lane row
- the row should visually preserve the lane identity
- the shipment quantity still applies to the associated material of that lane

## Shipment Orders Structure

[materials-orders.html](/Users/mac/Documents/New%20project%204/materials-orders.html) should record and display shipment details using lane-first wording.

Each shipment detail item should show:

- lane name
- associated material name
- material code
- shipment quantity

This applies to:

- desktop list summaries
- mobile list summaries
- detail modal
- print output

The order is no longer just “which material was shipped”.

It becomes:

- which lane
- shipped which associated material
- in what quantity

## Data Modeling Rules

The current board data should be normalized into a lane-oriented shape.

A lane record should minimally support:

- `laneGroup`
- `laneName`
- `materialName`
- `materialCode`
- `remaining`
- `warning`
- `critical`
- `max`
- `status`

Current mock data may continue to reuse existing numeric values, but those values are now interpreted as lane attributes.

## Migration Rule For Existing Mock

The existing mock values can be reused where possible, but the semantic mapping must change:

- old card title value -> `laneName`
- old material identity -> `materialName`
- current material code / number -> `materialCode`

If some current entries do not clearly distinguish lane name from material name, the mock layer should explicitly split them during this migration so the UI is no longer ambiguous.

## Permission Model

Add a dedicated permission for lane-name editing.

Recommended behavior:

- view lane board: stays under the existing materials/operations visibility path
- shipment and refill: keep current action permissions
- edit lane name: new standalone permission gate

The UI should not expose a disabled edit control when permission is missing. It should hide the entry entirely.

## Error Handling

The lane-based UI should degrade safely in these cases:

- lane has no associated material name
- lane has no material code
- stored lane name is empty after trim
- current user lacks lane-edit permission

Fallback behavior should be:

- show a safe placeholder for missing associated material or code
- reject empty lane-name saves with a clear inline error
- hide rename controls when permission is absent

## Testing Requirements

Update [tests/materials.device-routing.test.js](/Users/mac/Documents/New%20project%204/tests/materials.device-routing.test.js) to verify:

- [materials.html](/Users/mac/Documents/New%20project%204/materials.html) now uses the `6` lane groups instead of the previous `9` material groups
- board cards render lane name plus associated material name and material code
- existing actions still route by the associated material target
- refill-page rows display lane name, associated material name, and material code together
- shipment-order details display lane name plus associated material name
- lane-name edit entry is only present when the dedicated permission is available

Where practical, cover both:

- structure assertions for the new lane vocabulary and edit entry
- runtime assertions for permission gating and routing behavior

## Success Criteria

This work is successful when:

- the main board clearly reads as a lane board rather than a material board
- the `6` lane groups replace the old `9` material groups on the main board
- every lane card shows both lane name and associated material name
- refill and shipment orders use the same lane-first vocabulary
- `发货 / 补充` still operate on the associated material of the lane
- lane-name editing exists only on the main board
- lane-name editing is protected by a separate permission
