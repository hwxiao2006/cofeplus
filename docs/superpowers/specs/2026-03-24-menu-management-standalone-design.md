# Menu Management Standalone Site Design

**Date:** 2026-03-24

## Goal

Create a standalone website for 商品管理 that preserves the current page's core interaction model while living outside the existing project. The site must let operations users edit menu content locally in the browser, save it locally, and export an Excel workbook whose sheets are split by language.

## Scope

- Build a standalone site outside `/Users/mac/Documents/New project 4`.
- Preserve the current 商品管理 interaction pattern for:
  - `菜单管理`
  - `基本设置`
  - `批量改价`
- Default the inner entry tab to `菜单管理`.
- Keep `基本设置` as the second tab and `批量改价` as the third tab.
- Support local browser save only.
- Export one `.xlsx` workbook containing:
  - `基本设置`
  - `商品_zh`
  - `商品_en`
  - additional `商品_<lang>` sheets for future languages
- Remove all tax-rate concepts from the standalone site, saved data, and export output.

## Non-Goals

- No backend, database, login, or server-side API.
- No import-from-Excel flow in this version.
- No point-order preview or other unrelated admin modules.
- No attempt to redesign the 商品管理 UX into a new workflow.
- No tax toggles, tax rate configuration, tax-inclusive/exclusive calculations, or tax columns.

## Current Problem

Customers trying the point-order screen need to change the default phone number and email shown by the system, but the current后台 does not provide a dedicated standalone tool for that workflow. The existing 商品管理 experience is bundled into the current project and includes logic that is broader than the requested use case, including tax-related behavior that should not exist in the new standalone flow.

The new tool should give operations a focused site they can use independently, without requiring backend support or changes inside the current application.

## Source Parity Reference

The authoritative reference for the existing interaction is:

- `/Users/mac/Documents/New project 4/menu-management.html`

This standalone site is not full-feature parity with that file. It is parity for the requested 商品管理 subset only.

### Behaviors That Must Match

- three-tab structure: `菜单管理 / 基本设置 / 批量改价`
- default entry on `菜单管理`
- shared category and keyword filtering mental model across `菜单管理` and `批量改价`
- category create / edit / delete-with-transfer workflow
- product create / edit workflow for the export-relevant fields
- product sale-status toggle
- bulk selection and bulk apply workflow in `批量改价`
- localized editing for all enabled languages

### Behaviors Intentionally Dropped

- point-order preview
- device switching and device-specific state
- device language management modal
- cross-device copy flows
- tax configuration and tax-derived pricing
- product recipe / option / spec editing that does not appear in the export contract

## Product Direction

The standalone site should feel familiar to current operators. It should keep the same mental model as the existing 商品管理 page instead of introducing a new information architecture.

The product contract for this version is:

- edit menu content in the browser
- save the current working state locally
- reopen later and continue editing
- export a language-split Excel workbook

Anything beyond that is intentionally deferred.

## Project Location

The written spec lives in this repository under `docs/superpowers/specs/`.

The standalone implementation itself should be created outside the current project, at a separate path such as:

- `/Users/mac/Documents/menu-management-standalone`

This keeps the new site isolated from the current application while still allowing planning and design docs to stay with the existing repo history.

## UX Design

### Core Navigation

The site remains a single-page application with three inner tabs:

1. `菜单管理`
2. `基本设置`
3. `批量改价`

Default entry opens `菜单管理`.

The tab order is fixed and should not drift from this arrangement. The goal is parity with the updated 商品管理 ordering rather than a fresh redesign.

### 菜单管理

`菜单管理` remains the primary workspace for category and product editing.

It should continue to support the familiar editing model for the scoped features only:

- category list and ordering
- category search
- current-category vs all-category product search
- add category
- edit category names and icon
- delete category with transfer when orphaned products would remain
- product list within categories
- create product
- edit product
- copy product inside the standalone dataset
- toggle product sale status
- localized content editing per language
- image, price, status, and ordering fields

The standalone version should keep the interaction style close to the current page, but only within the new isolated project and only for the fields that participate in save and export.

Product-category assignment rules in normal create/edit flows are:

- creating a product requires selecting at least one category
- a newly created product is appended to the end of each selected category
- editing a product can add or remove category assignments
- a product must always remain assigned to at least one category
- adding a new category assignment appends the product to the end of that category
- removing a category assignment only removes the relation for that category and does not delete the product itself
- editing an existing product preserves relative order for unchanged category assignments

When deleting a category with transfer:

- only products that would otherwise become unassigned are transferred
- if an orphaned product already belongs to the selected transfer category, no duplicate assignment is created
- transferred products are appended to the end of the target category in the same relative order they had in the deleted category
- if there is no valid transfer target for orphaned products, deletion is blocked and the UI tells the operator to create another category first

### 基本设置

`基本设置` is limited to these fields:

- `币种`
- `点单屏电话`
- `点单屏邮箱`

This section is global configuration for the export and for any UI hints that depend on these values.

No tax-related controls appear anywhere in this tab.

### 批量改价

`批量改价` remains available as the third tab and updates product prices in bulk using the same overall operator workflow as the current page.

Because tax is removed, all price updates act on a single stored product price. There is no tax conversion step and no tax-aware preview copy.

The bulk workflow is defined as follows:

- scope follows the current shared category filter and keyword filter
- operators can select individual products from the current visible list
- operators can use `全选当前列表` to select all currently visible products
- operators can submit either or both of:
  - `现价`
  - `原价`
- operators can also trigger:
  - `批量上架`
  - `批量下架`
- submitting without any selected product is blocked
- submitting with both price fields empty is blocked
- `原价` must be greater than `现价` when both are present
- if only `原价` is provided, the current price stays unchanged for each target product, and the new `原价` must still remain greater than that product's existing current price
- if only `现价` is provided, each target product keeps its existing `原价`; any product whose existing `原价` would become invalid after the price change is treated as a per-row failure
- successful rows are applied immediately
- failed rows remain selected and display a row-level failure reason so the operator can retry

Numeric rounding matches the current batch-price editor behavior: all submitted price inputs are rounded to two decimal places before saving.

Bulk selection targets unique products, not individual category-assignment rows. If one product belongs to multiple categories, it appears once in the batch list with aggregated category labels, and a successful bulk action updates that product across all of its category assignments.

`提交改价` is a price-update action and follows the price validation rules above. `批量上架` and `批量下架` are separate status-only actions and do not require either price field to be filled.

## Technical Approach

Use a standalone front-end project built with:

- `Vite`
- `React`
- `TypeScript`

This choice keeps the site easy to run and deploy as static assets while giving the implementation a clearer module structure than the current large single-file HTML page.

The application remains a pure client-side SPA. It does not require a running backend to function.

## Architecture

The standalone site should be split into well-bounded units:

- `App Shell`
  - owns top-level layout, tab switching, bootstrapping, and saved-state hydration
- `Menu Management Module`
  - owns categories, products, localized editing, and product ordering
- `Basic Settings Module`
  - owns currency, phone, and email editing
- `Batch Pricing Module`
  - owns bulk price update inputs and applies changes into the shared draft state
- `Persistence Service`
  - reads and writes saved state to `IndexedDB`
- `Export Service`
  - transforms saved state into workbook sheets and downloads `.xlsx`
- `Validation Layer`
  - validates critical fields before save and export

Each unit should be understandable without reading the internals of the others. UI modules work against shared typed state and call services through explicit functions instead of each section writing storage or workbook code directly.

### Shared State Contract

The app should have one explicit source of truth for editable data:

- `enabledLanguages`
- `basicSettings`
- `categories`
- `products`
- `productCategoryAssignments`
- `productLocales`
- `meta`

`meta` contains only application-level information needed by infrastructure logic, such as:

- `lastSavedAt`

UI modules can read and write draft state, but only services own persistence and export side effects.

### Service Interfaces

The planning baseline should assume these explicit service boundaries:

- `PersistenceService.loadSaved(): { ok: true, state: AppState } | { ok: true, state: null } | { ok: false, error: LoadError }`
- `PersistenceService.loadSeed(): AppState`
- `PersistenceService.save(state: AppState): { ok: true, savedAt: string } | { ok: false, error: SaveError }`
- `ExportService.buildWorkbook(state: AppState): { ok: true, workbook: Workbook } | { ok: false, error: ExportError }`
- `ExportService.download(workbook: Workbook, filename: string): { ok: true } | { ok: false, error: ExportError }`
- `ValidationService.validateForSave(state: AppState): ValidationResult`
- `ValidationService.validateSavedStateForExport(state: AppState): ValidationResult`

Exact function names may vary in implementation, but these responsibilities should remain separated.

## Data Model

The saved model should remove all tax fields and keep only the data needed for editing and export.

### Enabled Languages

`enabledLanguages`

- v1 is fixed to `['zh', 'en']`
- the UI renders localized inputs from this array
- the export service generates one `商品_<lang>` sheet per enabled language
- future languages are enabled by changing standalone project configuration or seed data, not by adding a runtime language-management feature in v1

This makes language support explicit and avoids bringing over the current page's device-level language-management scope.

### Basic Settings

`basicSettings`

- `currency`
- `contactPhone`
- `contactEmail`

### Categories

`categories`

- `id`
- `order`
- `icon`
- `names`
  - keyed by language code

### Products

`products`

- `id`
- `price`
- `originalPrice`
- `status`
- `image`

`originalPrice` is optional. `status` is a stable enum with allowed values `on_sale` and `off_sale`.

`image` is stored as a string reference. In v1 it may be either:

- a remote URL
- a browser-generated data URL created from a local upload

The export column `图片` writes this stored string value directly.

### Product Category Assignments

`productCategoryAssignments`

- `productId`
- `categoryId`
- `order`

This keeps category membership explicit and supports the current interaction model where a product can appear in more than one category.

### Product Locales

`productLocales`

- `productId`
- `lang`
- `name`
- `description`
- `tag`

This model separates language-specific copy from shared product fields so export can assemble one sheet per language without duplicating source-of-truth editing logic.

## Persistence Design

Use `IndexedDB` as the persistence layer.

The site should maintain two conceptual states:

- current in-memory draft state used for editing
- last saved state stored in `IndexedDB`

`保存` writes the draft state to `IndexedDB`.

On load, the app hydrates from saved data if available. If no saved data exists, it loads from a default template dataset that mirrors the intended starter experience.

### First-Run Seed Behavior

The standalone site ships with a bundled seed dataset extracted from `window.COFE_SHARED_MOCK_DATA.defaultProducts` in `/Users/mac/Documents/New project 4/menu-management.html` and reduced to the fields in this spec.

The seed must contain:

- `enabledLanguages = ['zh', 'en']`
- one initial `basicSettings` object
- starter categories
- starter products
- starter product-category assignments
- starter localized product records

Fresh install behavior is:

1. load the bundled seed into in-memory draft state
2. show the seed content immediately in the UI
3. treat the seed as unsaved until the operator clicks `保存`
4. disable `导出 Excel` until the first successful save completes

After the first successful save, export always uses the latest saved valid state.

`IndexedDB` is preferred over `localStorage` because the standalone site will hold structured menu data and localized content, and the design should avoid coupling large editable datasets to a single string blob storage path.

If `IndexedDB` is unavailable, denied, or fails quota checks before any saved state can be created:

- the app still loads the bundled seed into memory for viewing and temporary editing
- the app shows a persistent warning that local save is unavailable in the current browser
- `保存` is disabled
- `导出 Excel` is disabled because there is no valid saved state to export

## Save and Export Contract

Save and export should be intentionally separate:

- editing changes only the in-memory draft
- `保存` persists the current draft locally
- `导出 Excel` exports the current saved version by default

This prevents accidental export of unsaved edits and makes the operator model predictable.

If the product later wants "export unsaved draft" behavior, that should be a separate requirement, not implicit behavior in this version.

If draft changes exist and the user clicks `导出 Excel`, the site should interrupt with a clear choice:

- `先保存并导出`
- `继续导出已保存版本`
- `取消`

State transition rules:

- `草稿已修改` + `先保存并导出`
  - run `validateForSave`
  - if validation fails, stay on the draft and do not export
  - if save succeeds, export the just-saved state
- `草稿已修改` + `继续导出已保存版本`
  - skip draft changes
  - export the last saved valid state
- `草稿已修改` + `取消`
  - close the prompt and keep editing
- `无已保存版本`
  - export remains disabled

## Excel Workbook Design

Export one workbook per action.

The workbook structure is fixed:

- `基本设置`
- `商品_zh`
- `商品_en`
- more `商品_<lang>` sheets when enabled languages expand

### 基本设置 Sheet

The `基本设置` sheet contains one row of global settings with these columns:

- `币种`
- `点单屏电话`
- `点单屏邮箱`
- `导出时间`

Field format:

- `币种` exports the stable currency code such as `CNY`
- `导出时间` uses the operator's local timezone in `YYYY-MM-DD HH:mm:ss ±HH:mm` format

### 商品 Language Sheets

Each `商品_<lang>` sheet contains one row per product-category assignment and repeats non-language fields so that each language sheet can be handed off independently.

Columns:

- `分类ID`
- `分类名称`
- `商品ID`
- `商品名称`
- `商品描述`
- `标签`
- `价格`
- `划线价`
- `状态`
- `图片`
- `排序`

Field behavior:

- `分类名称` comes from the category name for that language
- each product assigned to multiple categories appears once per assigned category
- `商品名称` / `商品描述` / `标签` come from the locale record for that language
- `价格` / `划线价` / `状态` / `图片` / `排序` come from shared product fields
- `状态` exports the stable enum value `on_sale` or `off_sale`
- `排序` comes from the product's order within that category assignment
- missing localized copy exports as an empty cell instead of blocking the workbook

No tax columns or tax-derived values are exported.

## Validation Rules

Validation runs before save. Export validates the latest saved state before workbook generation.

Required checks:

- `币种` must be one of `CNY / USD / EUR / HKD / JPY`
- `点单屏邮箱` is optional, but when present it must match a standard email shape such as `name@example.com`
- `点单屏电话` is optional, but when present it must match `/^\+?[0-9\\s()\\-]{5,20}$/` after trimming
- category name in primary language `zh` is required
- product name in primary language `zh` is required
- `price` is required and must be greater than `0`
- `originalPrice` is optional, but when present it must be greater than `price`
- batch-price inputs are optional individually, but at least one of `现价` or `原价` must be provided for a batch submit

Validation failures should block save and explain the issue in operator language.

Non-primary localized copy such as `en` name, description, or tag does not block save in v1. Missing values export as empty cells in the corresponding language sheet.

Product copy inside the standalone dataset clones:

- shared product fields covered by this spec
- all localized copy for enabled languages
- no tax fields
- no dropped recipe / option / spec structures

The copied product receives a new product ID and is assigned only to the categories explicitly chosen during the copy flow.

## Failure Handling

The standalone site should fail safely and preserve operator work where possible.

- If `IndexedDB` read data is invalid or corrupted, fall back to the default template and show a clear recovery message.
- If save fails, keep the in-memory draft intact and show an error message.
- If export fails, do not discard the draft or saved state; show the failure and allow retry.
- If a language sheet has partial localized data, export the sheet with blank cells for missing content instead of aborting the entire workbook.

## Testing

Testing should cover both the transformation logic and the user flow.

### Unit Tests

- saved-state serialization and hydration
- `IndexedDB` persistence helpers
- corrupted-storage recovery path
- `IndexedDB` unavailable / denied / quota-failure degraded mode
- workbook generation
- language-to-sheet splitting
- field mapping for `基本设置` and `商品_<lang>`
- validation for currency, phone, email, and price fields
- multi-category assignment export flattening
- category-transfer duplicate handling
- unique-product batch update behavior across multiple category assignments

### UI / Flow Tests

- app opens on `菜单管理` by default
- tab order is `菜单管理 / 基本设置 / 批量改价`
- editing `基本设置` and saving persists through refresh
- menu edits persist through refresh after save
- batch price updates affect stored product price only
- batch updates on a multi-category product update every assignment through one list row
- export prompt behavior matches `先保存并导出 / 继续导出已保存版本 / 取消`
- export downloads a workbook with `基本设置`, `商品_zh`, and `商品_en`
- export workbook contains no tax-related UI assumptions or columns

## Verification

Manual verification should confirm:

- opening the site lands on `菜单管理`
- `基本设置` is the second tab and `批量改价` is the third
- `基本设置` only shows currency, phone, and email controls
- no tax controls, tax text, or tax-derived price descriptions appear anywhere
- save persists local edits across refresh
- exported workbook contains a separate `基本设置` sheet
- exported workbook contains separate language sheets
- each language sheet is independently usable without referencing another sheet
