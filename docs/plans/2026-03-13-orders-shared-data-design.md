# Orders Shared Data And Preview Orders Design

## Context

`orders.html` currently keeps its own inline device mapping and handwritten mock orders. `devices.html` and `menu-management.html` each own richer default data, but those sources are not reused by the orders page. That drift has already shown up in device filter mismatches, product-name mismatches, and brittle mobile regressions around generated preview content.

The approved direction is to move orders onto shared device and product sources, then let the menu preview screen create pseudo-orders that are persisted locally and shown first on the orders page.

## Goals

- Reuse the same default device list across device management and order management.
- Reuse the same default product catalog across menu management and order management.
- Add a pseudo-order action in the order-preview flow so realistic orders can be created from the current previewed product, quantity, and options.
- Keep `orders.html` populated with at least 20 records even in an empty browser by combining persisted preview orders with generated fallback orders.
- Preserve existing order-page behaviors: metrics, filters, mobile layout, multi-currency formatting, multi-item popover, and refund flows.

## Non-Goals

- Building a full cart or checkout flow.
- Introducing a backend or remote API.
- Rewriting the existing order table, refund modal, or menu editor architecture.

## Data Architecture

### Shared source

Create a browser-readable shared script, `shared/admin-mock-data.js`, that exposes canonical default mock data on `window`, for example:

- `window.COFE_SHARED_MOCK_DATA.defaultDevices`
- `window.COFE_SHARED_MOCK_DATA.defaultProducts`
- `window.COFE_SHARED_MOCK_DATA.maps`
- `window.COFE_SHARED_MOCK_DATA.helpers`

The shared source should contain only the default data and lightweight normalizers. Page-specific runtime state stays in each page.

### Orders source priority

`orders.html` should read orders from three layers, merged in this order:

1. `ordersPreviewRecords` from `localStorage`
2. generated fallback orders built from shared devices + shared products
3. page-level normalization to the current order record shape

The final merged list should be sorted by newest first and de-duplicated by `order.id`.

### Persisted pseudo-orders

Menu preview should persist pseudo-orders under a new localStorage key, for example `ordersPreviewRecords`.

Each persisted record should already be compatible with the current order-page logic:

- `id`
- `deviceId`
- `nickname`
- `phone`
- `transactionId`
- `orderItems`
- `amount`
- `currency`
- `pickupCode`
- `items`
- `createTime`
- `status`
- `paymentStatus`

Legacy compatibility fields such as `product` and `specs` can be derived from `orderItems` instead of being manually authored.

## Page Responsibilities

### `shared/admin-mock-data.js`

- Hold the default device list currently living in `devices.html`
- Hold the default product catalog currently living in `menu-management.html`
- Expose helper functions to flatten products, resolve entered devices, and clone records safely

### `devices.html`

- Replace inline `defaultDevicesData` ownership with the shared source
- Keep existing normalization, localStorage persistence, and preview hydration behavior

### `menu-management.html`

- Replace inline `productsData` default ownership with the shared source
- Keep current local edits, category assignments, and pricing settings layered on top
- Add a pseudo-order action inside the order-preview product-detail overlay
- Build pseudo-order payloads from the currently selected product, selected options, quantity, current device, and current pricing settings

### `orders.html`

- Replace `deviceContextMap` and handwritten `ordersData` with shared-source loaders
- Build device filter choices from the same device dataset used by `devices.html`
- Generate fallback orders from shared data so product names and options always match menu management
- Merge persisted pseudo-orders ahead of fallback orders
- Guarantee at least 20 orders after merging

## Order Generation Rules

- Use only entered devices from the shared device dataset.
- Use only flattened products from the shared product catalog after applying saved product edits.
- Generate mostly single-item orders, with 4-6 multi-item orders reserved for popover and refund coverage.
- Compute amounts from item price, quantity, and currency instead of hand-maintained amount strings.
- Rotate statuses across `done`, `pending`, and `cancelled`; rotate payment statuses across `succeed`, `pending`, `failed`, and `cancelled` while preserving current refund assumptions.
- Generate descending timestamps and long-form order IDs/transaction IDs for realistic filtering.

## Preview Pseudo-Order UX

Add a single pseudo-order button to the order-preview product-detail overlay.

Behavior:

- uses the current preview device
- uses the current preview language only for display, not as a stored dependency
- stores chosen product options and quantity
- computes amount using current product pricing
- writes a new order into `localStorage`
- shows a lightweight success toast
- closes the detail overlay or keeps it open depending on the simpler existing interaction pattern

## Testing Strategy

### Shared data coverage

Add tests that prove:

- shared devices exist and are reusable by both pages
- shared products exist and can be flattened into order items
- orders use only shared devices and shared products

### Menu preview coverage

Extend `tests/menu-management.behavior.test.js` to prove:

- the pseudo-order button exists
- invoking it writes `ordersPreviewRecords`
- stored order items and selected options reflect current preview selections

### Orders coverage

Extend orders tests to prove:

- merged orders count is at least 20
- preview orders are loaded ahead of generated fallback orders
- device IDs in orders match shared device options
- product names in order items come from the shared product catalog
- existing multi-item popover and refund tests still pass

## Risks And Constraints

- Current tests read inline page scripts directly. Once a shared script is introduced, behavior-test harnesses must load the shared script before the page script or inject the same globals the page expects.
- `menu-management.html` currently persists incremental edits, not the full product catalog. Order generation must apply those edits on top of shared defaults rather than expecting a fully persisted product snapshot.
- The repository is already dirty; implementation should stage only task-specific files.
