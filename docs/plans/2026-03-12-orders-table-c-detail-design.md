# Orders Table Variant C Detail Design

## Goal

Refine the standalone order-preview artifact into a single desktop-first table concept based on Variant C. The refined preview should preserve high order density while showing richer first-product configuration details and a lightweight way to inspect all products in an order.

## Confirmed Decisions

- Only Variant C remains in scope for the preview page.
- The layout remains a desktop operational table, not order cards.
- Product display rules:
  - Show only the first product inline in the table.
  - First line: product name plus `+N件` when more items exist.
  - Only the `+N件` fragment is clickable.
  - Second line: show the first product option set.
  - The option line is clamped to at most two lines.
- Full product list access:
  - Clicking `+N件` opens a floating popover near the product cell.
  - The popover lists all products with full option details.
  - The table row height must not expand.
- Right-side frozen decision band remains:
  - 状态
  - 金额
  - 操作

## Product Hierarchy Strategy

The product column needs to communicate enough for the common case while protecting table density:

- Most orders are single-cup orders, so the inline view should optimize for one primary drink.
- Full option readability is achieved on the first product only.
- Additional products are acknowledged as count, not inline detail.
- Full detail is available on demand through a popover.

This keeps the table dense without making the product column meaningless.

## Layout Structure

### Left Scrollable Zone

- 订单号
- 时间
- 商品
- 门店
- 设备
- 取货码

### Right Frozen Zone

- 状态
- 金额
- 操作

The frozen zone must remain visually aligned and stable during horizontal scrolling.

## Product Cell Design

Each product cell uses a compact two-line stack:

1. Product identity line
   - Product name
   - Inline `+N件` trigger if more products exist
2. Product option line
   - Full option string for the first product
   - Clamped to two lines to protect row density

The product cell should not use heavy tags, pills, or card-like containers.

## Popover Design

The popover appears adjacent to the clicked product cell and contains:

- Order identifier summary
- A vertical list of all products in the order
- For each product:
  - Product name
  - Full option details
  - Quantity if relevant

The popover should feel like a desktop productivity aid:

- restrained surface
- clear section separators
- compact typography
- close button or outside-click dismissal

## Visual Direction

- Tone: industrial/utilitarian but polished
- Typography: same system stack as `menu-management.html`
- Surface: clean white with subtle gray structure
- Accent: restrained teal for interactive cue on `+N件`
- Emphasis: amount and status remain visually stronger than product detail

## Success Criteria

The preview is successful if:

- the page shows only the refined C direction
- the main table remains visually dense
- the first product options are easier to inspect than the previous single-line summary
- extra products are discoverable without increasing row height
- the frozen right-side decision band remains stable and aligned
