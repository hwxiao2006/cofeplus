# Orders Page Redesign Design

## Goal

Reframe `orders.html` from a plain operational list into a high-end SaaS-style order workspace that combines live sales context with efficient single-order processing. The redesign covers the desktop order list page and the mobile order list experience. Refund and coupon modals remain functionally intact in this phase.

## Product Positioning

This page is not only an order detail list. It also carries meaning as a real-time sales operations surface for the current day. The page therefore needs two distinct layers:

- A summary layer for current-day sales dynamics
- A detail layer for per-order review and action

These layers must feel connected, not redundant.

## Design Direction

- Tone: high-end back office, restrained and premium
- Priority: visual polish and scan efficiency
- Avoid: decorative gradients, fake “feature” buttons, dense legacy-table feeling
- Keep: fast refund/return-coupon/detail actions at the order level

## Information Architecture

The page structure becomes:

1. Header
2. Dynamic metrics row
3. Master filter panel
4. Lightweight list toolbar
5. Order workspace

### Header

The header becomes compact and editorial rather than oversized:

- Title: `订单管理`
- Subtitle: `今日销售动态与订单处理`

No page-level action buttons are included in the approved design. Export and batch action concepts are intentionally removed to avoid promising features that do not exist.

### Dynamic Metrics Row

This row remains because the page is not only a list. It needs to communicate current-day business movement.

Approved metrics:

- 今日支付金额
- 今日完成订单
- 客单价

Each metric card contains:

- Label
- Large primary value
- Secondary delta line such as `较昨日 +8.4%`

Explicitly excluded:

- 取消率
- 近一小时趋势

### Master Filter Panel

The filter zone becomes a structured control board rather than a loose stack of fields.

Primary row:

- Large search field
- Status selector
- Device selector
- Advanced filter trigger

Secondary row:

- Time range
- Search dimension selector
- Reset action

The search field is visually dominant. All controls share a single height and a more restrained component style.

### List Toolbar

The toolbar is informational, not promotional.

It contains:

- Result count
- Sort control

It may also include a compact filter summary if space allows, but it must not visually compete with the order list.

### Order Workspace

The legacy rigid table feeling is replaced with a structured order-strip card list. The desktop layout still supports high-density scanning, but without looking like a spreadsheet.

Per order card:

- Left area: order identity, merchant/location/device context, product lines, pickup code, item count
- Right area: status, payment state, amount, primary actions

The order list remains the page’s main visual focus.

## Desktop Layout

### Page Rhythm

Desktop uses a vertical cadence:

1. Compact header
2. Three aligned metric cards
3. Single white filter board
4. Thin toolbar
5. White order list workspace with vertically stacked order cards

### Order Card Structure

Each desktop order card is a horizontal split layout.

Left side:

- First row: order number and timestamp
- Second row: merchant / location / device
- Third row: up to two product lines by default
- Bottom row: pickup code, item count, expandable product summary

Right side:

- Order status tag
- Payment status
- Amount with the strongest numerical emphasis
- Action buttons: `退款`, `返券`, `详情`

### Product Disclosure

Product lines default to two visible rows. When additional items exist, the card shows an expand affordance such as `展开 2 个商品`. This keeps density under control while still allowing full detail access.

### Visual Hierarchy

Desktop hierarchy should feel premium through restraint:

- Background: very light cool gray
- Primary surfaces: white cards
- Borders: low-contrast gray
- Shadows: minimal, only for subtle lift
- Accent color: brand teal used sparingly for active and positive emphasis
- Typography: system font stack aligned with `overview.html`

## Mobile Layout

Mobile must not be a compressed version of the desktop layout.

### Mobile Structure

1. Compact title block
2. Horizontal swipe metrics cards
3. Single-line quick filter row
4. Order stream cards
5. Bottom-sheet filter panel for advanced controls

### Quick Filter Row

Visible by default:

- Search trigger
- Status selector
- Device selector
- Filter button

This replaces the current large exposed filter area and removes the feeling of a form-heavy page.

### Filter Bottom Sheet

Advanced controls move into a bottom sheet:

- Search dimension radios
- Keyword input
- Status selector
- Device selector
- Time range
- Reset and apply actions

### Mobile Order Card

Each mobile card contains:

- Order number
- Time
- Status and amount on the same visual row
- Merchant/device/location
- Product lines
- Pickup code and item count
- Action row

Action buttons remain:

- 退款
- 返券
- 详情

## Visual System

### Color

- Page background: restrained cool gray
- Card background: white
- Primary text: dark slate
- Secondary text: muted slate
- Accent: brand teal
- Success/status chips: soft tinted backgrounds with stronger text, not loud saturated pills

### Typography

- Reuse the system font stack already aligned with `overview.html`
- Large amount values and metric values carry the strongest emphasis
- Secondary metadata remains readable but quiet

### Spacing and Shape

- Metric cards and order cards use larger radii than the legacy design
- Component heights are standardized
- White space drives quality more than decoration

## Interaction Notes

- Refund, coupon return, and detail remain at order level
- No new page-level actions are introduced in this redesign
- Existing filter logic, refund logic, and multi-currency behavior remain intact
- Layout changes should be compatible with current mock data and test harnesses

## Non-Goals

- Redesigning refund modal flows
- Redesigning coupon return confirmation flows
- Adding batch actions
- Adding new backend behavior

## Testing Strategy

The redesign should be protected with layout-oriented regression tests:

- Desktop structure and section ordering
- Presence of three approved metric cards
- Removal of fake page-level action buttons
- Mobile quick filter row and bottom-sheet filter structure
- Preservation of order-level actions and existing refund capabilities

## Acceptance Criteria

- The page reads as a premium SaaS operations surface rather than a legacy management table
- The current-day metrics and order list feel complementary, not duplicated
- Desktop scanning is faster because state, amount, and actions are consistently aligned
- Mobile no longer opens with a tall exposed filter block
- Existing order actions remain discoverable and intact
