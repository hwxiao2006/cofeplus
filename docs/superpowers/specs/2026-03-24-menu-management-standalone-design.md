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

It should continue to support the familiar editing model:

- category list and ordering
- product list within categories
- localized content editing per language
- image, price, status, and ordering fields

The standalone version should keep the interaction style close to the current page, but only within the new isolated project.

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

## Data Model

The saved model should remove all tax fields and keep only the data needed for editing and export.

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
- `categoryId`
- `order`
- `price`
- `originalPrice`
- `status`
- `image`

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

`IndexedDB` is preferred over `localStorage` because the standalone site will hold structured menu data and localized content, and the design should avoid coupling large editable datasets to a single string blob storage path.

## Save and Export Contract

Save and export should be intentionally separate:

- editing changes only the in-memory draft
- `保存` persists the current draft locally
- `导出 Excel` exports the current saved version by default

This prevents accidental export of unsaved edits and makes the operator model predictable.

If the product later wants "export unsaved draft" behavior, that should be a separate requirement, not implicit behavior in this version.

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

### 商品 Language Sheets

Each `商品_<lang>` sheet contains one row per product and repeats non-language fields so that each language sheet can be handed off independently.

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
- `商品名称` / `商品描述` / `标签` come from the locale record for that language
- `价格` / `划线价` / `状态` / `图片` / `排序` come from shared product fields
- missing localized copy exports as an empty cell instead of blocking the workbook

No tax columns or tax-derived values are exported.

## Validation Rules

Validation runs before save. Export relies on the latest saved valid state.

Required checks:

- `币种` must be selected
- `点单屏邮箱` must be a valid email when present
- `点单屏电话` must pass the agreed basic format validation
- product price fields must be valid numeric values where required

Validation failures should block save and explain the issue in operator language.

Missing localized copy should not block save unless the current UI already treats it as required. For export, missing copy results in empty cells.

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
- workbook generation
- language-to-sheet splitting
- field mapping for `基本设置` and `商品_<lang>`
- validation for currency, phone, email, and price fields

### UI / Flow Tests

- app opens on `菜单管理` by default
- tab order is `菜单管理 / 基本设置 / 批量改价`
- editing `基本设置` and saving persists through refresh
- menu edits persist through refresh after save
- batch price updates affect stored product price only
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
