# Orders PRD HTML Design

## Goal

Turn `tasks/prd-orders-management-user-flow.md` into a standalone HTML document that can be opened directly in a browser, while showing one entrance screenshot for each user flow section `UF-001` through `UF-008`.

## Constraints

- The final HTML must not depend on external image paths.
- Screenshots should reflect the current `orders.html` UI rather than placeholder mock frames.
- Each user flow needs exactly one screenshot that matches its entrance or primary interaction point.
- The work should avoid changing live product behavior except for safe screenshot-only helpers.

## Screenshot Mapping

- `UF-001`: top metrics area on desktop
- `UF-002`: desktop filter/search area expanded
- `UF-003`: desktop order table workspace
- `UF-004`: mobile order list card layout
- `UF-005`: product overflow popover opened from `+N件`
- `UF-006`: order detail surface opened from `详情`
- `UF-007`: refund modal opened from `退款`
- `UF-008`: multi-currency summary and order amount display

## Implementation Approach

1. Add a lightweight screenshot demo query-param layer to `orders.html`.
2. Use query params to open or focus specific UI states without affecting normal users.
3. Capture screenshots from `orders.html` via Playwright CLI against the local server.
4. Build a dedicated HTML document in `tasks/` by reusing the existing PRD HTML visual language.
5. Inline all screenshots as base64 data URLs so the output is a single self-contained HTML file.

## Demo State Strategy

Use a query param such as `?demoState=metrics|filters|table|mobile-list|products|detail|refund|currency`.

For each state:
- optionally expand filters
- optionally open popovers, drawer, modal
- optionally scroll target section into view
- optionally seed multi-currency preview data or storage values
- add a body dataset/class to support capture-only layout simplification when needed

## HTML Structure

- title block
- usage note linking Markdown and HTML versions
- optional mini table of contents
- sections mirroring the Markdown PRD
- under each `UF-00N` section, inject:
  - screenshot heading
  - one figure block
  - short caption explaining what the screenshot shows

## Verification

- confirm all 8 screenshots exist
- confirm the HTML contains 8 figure blocks tied to `UF-001`..`UF-008`
- confirm screenshots render when opening the HTML directly in browser
- confirm no image references remain as relative filesystem paths inside the final HTML
