# Materials Category Grouping Design

**Date:** 2026-04-03

## Goal

Update [materials.html](/Users/mac/Documents/New%20project%204/materials.html) so material cards are no longer rendered as one mixed grid.

The approved direction is:

- keep the existing device switcher, summary stats, and action buttons
- replace the single flat `materialsGrid` presentation with grouped category sections
- show all `9` agreed top-level categories in one continuous page
- support both desktop and mobile with the same top-to-bottom grouping logic
- align the category vocabulary with [materials-refill.html](/Users/mac/Documents/New%20project%204/materials-refill.html)

## Approved Category Set

The page should use these fixed top-level categories, in this exact order:

1. `奶&咖啡&水`
2. `糖浆`
3. `前/后道粉`
4. `包材`
5. `辅材`
6. `耗材`
7. `奶粉`
8. `料盒`
9. `食材`

This order is stable across desktop and mobile.

## Scope

- Update the main materials board layout in [materials.html](/Users/mac/Documents/New%20project%204/materials.html)
- Add category-group rendering logic for the existing material card list
- Keep all current card actions and status behavior intact
- Add tests in [tests/materials.device-routing.test.js](/Users/mac/Documents/New%20project%204/tests/materials.device-routing.test.js) to lock the new grouped structure

## Non-Goals

- No redesign of the refill modal flow
- No redesign of the `发货清单` or `补充物料` routes
- No new material editing workflow
- No drag sorting for categories or materials
- No hiding of empty categories
- No mobile-only collapsed sections
- No mobile anchor navigation for this phase
- No backend or storage redesign beyond local grouping logic

## Current Problem

The current materials page renders all materials into one shared grid.

That creates two UX problems:

- cards from different business categories visually pile together
- operators cannot quickly scan the page according to the same category model already used in the refill flow

The current `item.category` field is also too granular for page-level grouping because it contains fine-grained values such as:

- `杯盖`
- `纸杯`
- `前置抹茶粉`
- `椰蓉丝`

Those labels are still useful on the card, but they are not the desired board-level grouping model.

## Approved UX Structure

## Shared Board Structure

Keep the current board shell:

- desktop toolbar
- selected device context
- board summary stats
- action buttons

Change only the materials content area below the board header.

Instead of one flat grid, render the content as a vertical stack of category sections:

```text
物料看板
  分类 1
    分类头
    该分类卡片网格 / 空态

  分类 2
    分类头
    该分类卡片网格 / 空态

  ...

  分类 9
    分类头
    该分类卡片网格 / 空态
```

## Desktop Layout

Desktop uses the approved `B` comparison direction:

- render all `9` categories in one continuous page
- keep each category as its own visual section
- keep material cards inside each category section
- preserve the current dense operations-dashboard card feel

Each category section should contain:

- category title
- material count for that category
- optional critical count badge when that category contains non-healthy materials
- the category card grid, or an empty-state row

### Desktop Grid Behavior

Within each category section, the card grid keeps the existing responsive density model as closely as possible:

- wide desktop: `5` columns
- narrower desktop: `4` columns
- medium desktop: `3` columns
- tablet-width desktop: `2` columns

This keeps the current compact backend scanning behavior while removing cross-category mixing.

## Mobile Layout

Mobile uses the approved `B1` comparison direction:

- show all `9` categories from top to bottom
- do not add category anchors
- do not collapse categories
- do not switch into a single-category view

Mobile should keep the same board logic as desktop, only restyled for narrower screens.

### Mobile Section Behavior

Each category still appears as a full section with:

- category title
- category material count
- category content

### Mobile Card Behavior

Within a category section:

- cards should become a single-column list
- card actions must remain easy to tap
- category-to-category spacing should be stronger than card-to-card spacing

This keeps the full-page grouped browsing model without recreating a crowded mixed stack.

## Card Content Rules

The material card itself does not change conceptually in this phase.

Keep:

- material name
- health / critical status pill
- current fine-grained category chip
- material code chip
- remaining amount
- threshold bar
- `发货`, `补充`, and detail actions

The important change is where the card appears:

- cards are grouped under a top-level board category
- the existing fine-grained `item.category` remains visible on the card as a secondary label

This preserves operator detail while adding page-level structure.

## Empty Category Rule

All `9` categories must be rendered even if the current device has no material items for some categories.

When a category has no materials:

- keep the category section visible
- show a lightweight empty-state message such as `当前设备暂无此类物料`
- do not remove the section from the page

This is required because the user explicitly approved showing all `9` categories.

## Category Mapping Model

Use the top-level category vocabulary from [materials-refill.html](/Users/mac/Documents/New%20project%204/materials-refill.html) as the source of truth for grouping.

Do **not** overwrite the current fine-grained `category` field on the raw material item.

Instead:

- keep raw `item.category` for card display
- add a grouping resolver that maps each item into one of the board categories

### Approved Current Mappings

Current data visible in [materials.html](/Users/mac/Documents/New%20project%204/materials.html) should group like this:

- `杯盖`, `纸杯` -> `包材`
- `前置抹茶粉`, `前置可可粉`, `椰蓉丝`, `麦片颗粒`, `榛果颗粒`, `香草粉`, `玉桂粉`, `抹茶粉`, `可可粉` -> `前/后道粉`
- `冰` -> `食材`

### Approved Extended Mappings

For items that already exist in the refill page vocabulary, use these directions:

- milk / coffee bean / purified water style items -> `奶&咖啡&水`
- syrup items -> `糖浆`
- milk powder / oat milk / almond milk style items -> `奶粉`
- box / container items -> `料盒`
- cleaning cloth / wipes / gloves / trash bag style items -> `辅材`
- machine chemical / filter / seal ring style items -> `耗材`

## Unmapped Item Fallback

If a material cannot be mapped into the approved `9` categories:

- do not drop the item
- place it into a temporary fallback section named `未分类`
- render that fallback section after the approved `9` categories

The user approved this explicit fallback because it is safer than silently forcing the wrong category.

## Ordering Rules

### Category Order

Always render the `9` approved categories in the fixed order listed above.

If `未分类` is needed, render it after those `9` categories.

### Item Order Within a Category

Do not introduce new sorting logic in this phase.

Within each grouped category:

- preserve the existing order from the current `materialsData` source

This keeps the change focused on grouping rather than inventing new ranking rules.

## Interaction Rules

The grouping redesign must not change existing actions:

- `发货` still routes to [materials-refill.html](/Users/mac/Documents/New%20project%204/materials-refill.html)
- `补充` still opens the current refill modal
- detail action remains unchanged

Device switching must re-render the full grouped board instead of updating only a partial subsection.

## Summary Metrics

The board summary values remain global to the full material set:

- total material count
- critical count
- healthy count

These stats should continue to calculate from all material items, not from a selected category subset.

## Implementation Notes

Keep the implementation localized to the materials page.

Expected design-level changes:

- replace the single `materialsGrid` output structure with category section markup
- add a top-level category order constant
- add a mapping resolver from fine-grained material category to board category
- add grouped rendering helpers
- keep existing card rendering logic reusable where possible
- keep mobile responsive behavior in the same page stylesheet instead of creating a separate mobile mode

## Files Affected

- [materials.html](/Users/mac/Documents/New%20project%204/materials.html)
- [tests/materials.device-routing.test.js](/Users/mac/Documents/New%20project%204/tests/materials.device-routing.test.js)

## Testing

Add or update tests to confirm:

- the page renders grouped category sections instead of one flat mixed grid
- the `9` approved categories exist in the fixed order
- category sections render card containers
- empty categories still render with an empty-state block
- existing card structure and action buttons remain present
- mobile styles keep full category visibility rather than using collapse or single-category switching

## Verification

Manual verification should confirm:

- desktop shows separated category sections with the agreed order
- mobile shows the same `9` categories top to bottom
- cards no longer appear as one mixed pile
- empty categories still appear
- unmapped materials, if any, surface under `未分类`
- device switching keeps the grouped layout and correct stats
