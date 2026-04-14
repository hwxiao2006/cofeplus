# Materials Lane Board Lightweight Design

**Date:** 2026-04-08

## Goal

Apply the approved lightweight `A` direction from the comparison:

- convert [materials.html](/Users/mac/Documents/New%20project%204/materials.html) into a lane-first board
- keep [materials-refill.html](/Users/mac/Documents/New%20project%204/materials-refill.html) and [materials-orders.html](/Users/mac/Documents/New%20project%204/materials-orders.html) primarily material-first
- add only light lane-context carry-through into shipment and order details
- add a separate permission-gated lane-name editing ability on the main board

## Scope

- Update [materials.html](/Users/mac/Documents/New%20project%204/materials.html) to display lane groups rather than the previous material-group sections
- Reinterpret existing card titles as lane names
- Add associated material information to the main-board card
- Add permission-gated lane-name editing on the main board only
- Lightly surface lane name in [materials-refill.html](/Users/mac/Documents/New%20project%204/materials-refill.html) and [materials-orders.html](/Users/mac/Documents/New%20project%204/materials-orders.html) without fully changing their underlying model
- Update [tests/materials.device-routing.test.js](/Users/mac/Documents/New%20project%204/tests/materials.device-routing.test.js) for the new board and lightweight lane carry-through

## Non-Goals

- No full lane-first rewrite of the refill page
- No full lane-first rewrite of the shipment-orders page
- No lane master-data page
- No lane/material rebind workflow
- No multi-material lane support
- No bulk lane rename

## Approved Board Model

The main board in [materials.html](/Users/mac/Documents/New%20project%204/materials.html) should now represent lanes.

For this phase:

- each card is one lane
- the card title is the lane name
- each lane still maps one-to-one to a single associated material
- current remaining / warning / critical / max values remain visible, but are interpreted as lane attributes

## Approved Lane Groups

Replace the previous `9` material groups on the main board with these `6` fixed lane groups:

1. `咖啡豆仓`
2. `牛奶&水`
3. `糖浆`
4. `前后道粉`
5. `包材`
6. `制冰机`

These groups apply only to the main board in this lightweight phase.

## Main Board Card Structure

Each card in [materials.html](/Users/mac/Documents/New%20project%204/materials.html) should present:

1. `货道名称`
2. `关联物料：xxx`
3. `商品编码：xxx`
4. current remaining amount
5. warning / critical / max information

The current action set remains:

- `发货`
- `补充`

Those actions still operate on the associated material behind the lane.

## Lane Name Editing

Lane-name editing is included in this phase, but only on [materials.html](/Users/mac/Documents/New%20project%204/materials.html).

### Permission Rule

This uses a separate permission from the existing materials view permission.

Recommended permission key:

- `ops.materials.laneNameEdit`

Behavior:

- users with permission see the lane-name edit entry
- users without permission do not see the edit entry

### Scope Rule

This edit flow changes only:

- lane name

It does not change:

- associated material
- product code
- thresholds
- grouping

## Refill Page Lightweight Alignment

[materials-refill.html](/Users/mac/Documents/New%20project%204/materials-refill.html) remains materially organized in this phase.

Do **not** rebuild it into a full lane selector.

Instead:

- when entering from a lane card, preserve the current preselected material behavior
- additionally surface the source lane name in a lightweight way near the selected context or preselected row

That means the refill page still behaves like a material pool, but it makes the originating lane visible enough for user orientation.

## Shipment Orders Lightweight Alignment

[materials-orders.html](/Users/mac/Documents/New%20project%204/materials-orders.html) also remains primarily material-first in this phase.

Do **not** redesign the page into a lane-first order system.

Instead:

- keep the current table/list structure
- add lane name alongside each material detail where available

This allows the orders page to carry lane context without changing the overall shipment-order information architecture.

## Data Modeling Rule

Use a lightweight split in the mock layer:

- existing visible title -> `laneName`
- associated material -> `materialName`
- existing material number -> `materialCode`

The main board should display lane-centric fields.

The refill page and shipment orders may continue to use material-centric data internally, as long as lane context can be carried through when the flow starts from the lane board.

## Error Handling

The UI should degrade safely if:

- lane name is missing
- associated material name is missing
- lane context is unavailable in refill/orders pages
- current user lacks lane-name editing permission

Fallback behavior:

- show safe placeholders for missing lane/material labels
- hide edit affordances when permission is missing
- keep shipment/refill flow working even if lane context is absent

## Testing Requirements

Update [tests/materials.device-routing.test.js](/Users/mac/Documents/New%20project%204/tests/materials.device-routing.test.js) to verify:

- [materials.html](/Users/mac/Documents/New%20project%204/materials.html) uses the new `6` lane groups
- board cards show lane name plus associated material name and material code
- main-board actions still route through the associated material
- lane-name editing is gated by the separate permission
- refill page can surface originating lane context without changing its core material-pool structure
- shipment-order details can surface lane name without changing the overall order-list model

## Success Criteria

This work is successful when:

- the main board clearly reads as a lane board
- the board uses the `6` approved lane groups
- users can understand both lane name and associated material from the main card
- shipment and refill flows still work without a full data-model rewrite
- lane name can be edited only on the main board
- lane-name editing is controlled by a separate permission
