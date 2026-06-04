# Materials Refill Excel Mock Design

**Date:** 2026-04-03

## Goal

Update [materials-refill.html](/Users/mac/Documents/New%20project%204/materials-refill.html) so the add-material page uses the Excel master list as its mock data source.

The approved direction is:

- use the full material master list from [南翔3月28日出库记录.xls](../../source-data/南翔3月28日出库记录.xls)
- source visible material identity fields from the Excel file
- keep the existing `9` top-level categories in the refill page
- keep the current add / selected / confirm-delivery interactions unchanged
- keep the existing `库存 / 最大` row in the UI, but continue treating those two values as front-end mock placeholders rather than Excel-derived values

## Data Source

The source of truth for the refill-page material pool is the `入库` sheet in [南翔3月28日出库记录.xls](../../source-data/南翔3月28日出库记录.xls).

This sheet is the correct source because it contains the complete material master list with:

- `货物编号`
- `货物名称`
- `规格型号`
- `单位`

The `出库` sheet is not the source for this task because it primarily represents machine distribution quantities, not the complete add-material master list.

## Scope

- Replace the current hand-authored `materialsData` mock in [materials-refill.html](/Users/mac/Documents/New%20project%204/materials-refill.html)
- Expand the refill-page material list to the Excel master-list breadth
- Preserve existing page behavior for quantity selection, selected items, delivery summary, and order creation
- Keep the current category navigation model and current-category-only list rendering
- Add tests in [tests/materials.device-routing.test.js](/Users/mac/Documents/New%20project%204/tests/materials.device-routing.test.js) to lock the new Excel-driven mock model

## Non-Goals

- No change to the board page grouping logic in [materials.html](/Users/mac/Documents/New%20project%204/materials.html)
- No attempt to make `库存 / 最大` numerically match the Excel file
- No change to delivery time generation
- No change to the order-writing data shape beyond whatever is needed to carry the Excel-based material master data
- No backend import pipeline for `.xls`
- No runtime Excel parsing in the browser

## Field Mapping Rules

Each refill-page material item should be derived from the Excel row with these visible-field rules:

- `materialNumber` -> Excel `货物编号`
- `name` -> Excel `货物名称`
- `spec` -> Excel `规格型号`
- `unit` -> Excel `单位`

### Internal Code Rule

The refill page currently depends on a `code` field for:

- preselection from [materials.html](/Users/mac/Documents/New%20project%204/materials.html)
- selected-item bookkeeping
- order payload creation

To avoid breaking those existing flows:

- for materials that already exist in the current refill and board flows, keep the current internal `code` when that compatibility is required
- still show the Excel `货物编号` as `materialNumber`
- for newly introduced Excel-only items that do not need old-flow compatibility, `code` may match `materialNumber`

This keeps visible data aligned to Excel without breaking route and selection behavior that still key off `code`.

## Category Model

The refill page should continue using these `9` approved categories:

1. `奶&咖啡&水`
2. `糖浆`
3. `前/后道粉`
4. `包材`
5. `辅材`
6. `耗材`
7. `奶粉`
8. `料盒`
9. `食材`

The page should still render only the currently selected category list at a time.

## Excel-to-Category Mapping

The Excel master list needs to be grouped into the existing refill-page categories.

### Approved mapping directions

- coffee beans, milk, water, and tea-base style items -> `奶&咖啡&水`
- syrup items -> `糖浆`
- cocoa / matcha / powder / granule style items -> `前/后道粉`
- cups, lids, sleeves, straws, bags, and similar packaging -> `包材`
- gloves, masks, wipes, trash bags, tissue, cloths, and similar support supplies -> `辅材`
- machine chemicals and cleaning consumables -> `耗材`
- milk powder style items -> `奶粉`
- hopper / bin / container style items -> `料盒`
- ice and edible ingredient items -> `食材`

### Unmapped fallback

If an Excel row cannot be confidently mapped into one of the `9` categories:

- keep the row in the mock pool
- place it in the closest operational category rather than dropping it silently
- prefer `辅材` as the temporary fallback for non-beverage support items

The key requirement is that every Excel material row remains selectable in the add-material page.

## Display Rules

The material row in the add-material list should continue showing:

- material name
- product code
- `库存 / 最大`
- quantity stepper

The user explicitly approved keeping the `库存 / 最大` row in the UI even though those values do not come from Excel.

## Mock Value Rule For Inventory

The page should preserve `remaining` and `max` as front-end mock values.

These values should:

- remain present so the current list layout does not change
- be stable and deterministic
- not be described as Excel-derived

This is required because the chosen Excel source sheet does not provide trustworthy per-item values for the refill-page `库存 / 最大` model.

## Naming Alignment Rule

Visible material names should follow the Excel naming as closely as possible.

Examples:

- `君乐宝牛奶（10L箱）` should no longer be shown as a generic `鲜牛奶` if the refill-page row is meant to represent that Excel item
- `16oz纸杯(鹿森)` should replace hand-authored shorthand labels such as `纸杯-16oz`
- `机压杯盖` should replace shorthand labels such as `杯盖1`

This keeps the add-material page visually aligned with the user's Excel source.

## Compatibility Constraints

The following flows must keep working after the mock-data swap:

- category switching
- quantity selection
- selected-item drawer
- summary section
- confirm-delivery order creation
- preselected material highlighting from [materials.html](/Users/mac/Documents/New%20project%204/materials.html) for overlapping materials

## Testing Requirements

Add or update tests in [tests/materials.device-routing.test.js](/Users/mac/Documents/New%20project%204/tests/materials.device-routing.test.js) to verify:

- the refill page contains Excel-derived material names
- the refill page contains Excel-derived product codes
- the refill page preserves the `9` approved categories
- the refill page still renders only the active category list
- the refill page still shows the `库存 / 最大` row
- the refill page still writes `code` and `materialNumber` into the order payload

## Success Criteria

This work is successful when:

- the add-material page mock list clearly reflects the Excel master list
- operators can find Excel-named materials directly in the refill page
- visible product codes match the Excel file
- the existing refill workflow still behaves the same
- no previously working route into the refill page is broken by the mock-data refresh
