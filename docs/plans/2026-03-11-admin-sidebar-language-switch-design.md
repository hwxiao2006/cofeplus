# Admin Sidebar Language Switch Design

## Goal

Add a small Chinese/English switch under the sidebar login block so the admin shell can switch between Chinese and English without affecting product/menu language configuration.

## User-Approved Scope

Switching `中 | EN` should translate only shell-level navigation text:

- sidebar brand title such as `运营控制台`
- sidebar section titles such as `运营管理` and `基础信息管理`
- sidebar menu labels such as `总览`, `设备`, `商品管理`, `订单`
- mobile header titles that correspond to the current page

The switch must not translate page body content, statistics cards, tables, product names, or menu-management product language settings.

## Storage

Use a separate localStorage key: `adminSidebarLang`.

This key is independent from `platformLang` and any device/product language configuration.

## UI Design

- Place the switch directly below the login name/phone row.
- Keep it small and low-emphasis.
- Align it to the same left edge as the section titles and login row.
- Use a single-line `中 | EN` presentation with only the active option highlighted.

## Behavior

- Default language is Chinese.
- Clicking `中` or `EN` updates the current page immediately.
- Navigating to other admin pages reuses the saved language selection.
- If localStorage is unavailable or malformed, fall back to Chinese.

## Translation Model

Use a lightweight in-page translation dictionary on each sidebar page.

Translate by shell semantics rather than by page content:

- brand key: `brand_console`
- section keys: `section_operations`, `section_foundation`
- nav keys: `nav_overview`, `nav_devices`, `nav_menu_management`, `nav_materials`, `nav_orders`, `nav_faults`, `nav_staff`, `nav_customers`, `nav_locations`
- mobile title keys derived from the current page, including `page_overview`, `page_devices`, `page_menu_management`, `page_materials`, `page_orders`, `page_faults`, `page_customers`, `page_locations`, `page_staff_management`, `page_product_detail`

## Implementation Notes

- Reuse the existing sidebar DOM instead of introducing a shared JS bundle.
- Translate nav labels by inspecting existing link targets and `data-tab` values.
- For `menu.html`, map `data-tab="overview"` and `data-tab="menu"` to the correct translated labels.
- Do not change page-level desktop headers; only the sidebar shell and mobile header.

## Testing Strategy

- Add a shared sidebar test that verifies all sidebar pages include:
  - `adminSidebarLang` storage key
  - `中 | EN` switch markup
  - translation dictionaries for the sidebar/menu shell
- Add a focused runtime test for representative pages to verify:
  - switching to English updates brand, section title, nav labels, and mobile header
  - menu-management keeps `adminSidebarLang` separate from `platformLang`
