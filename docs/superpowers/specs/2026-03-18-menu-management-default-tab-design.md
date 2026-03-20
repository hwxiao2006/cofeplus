# Menu Management Default Tab Design

**Date:** 2026-03-18

## Goal

Adjust the 商品管理模块 inner-tab entry order so the page opens on `菜单管理` by default instead of `基本设置`.

## Scope

- Reorder the inner tabs in `menu-management.html` to `菜单管理 / 基本设置 / 批量改价`.
- Change the page-level default inner tab from `settings` to `manage`.
- Keep explicit `innerTab=settings|manage|batch` URL parameters higher priority than the new default.
- Keep restored return-state `innerTab` values higher priority than the new default.
- Update behavior tests to lock the new default and the new visual order.

## Non-Goals

- No changes to the content, controls, or layout inside each inner tab panel.
- No changes to the outer `tab=menu` routing.
- No changes to batch pricing behavior, shared filters, or product-detail payload handling beyond the default tab target.

## Current Problem

The 商品管理模块 currently renders the inner tabs in this order:

- `基本设置`
- `菜单管理`
- `批量改价`

and initializes `currentMenuInnerTab` to `settings`.

This makes the module open on `基本设置`, while the requested primary entry should now be `菜单管理`.

## UX Design

### Tab Order

The visible inner-tab button order should become:

1. `菜单管理`
2. `基本设置`
3. `批量改价`

Only the button order changes. The existing panel IDs and tab keys remain:

- `manage`
- `settings`
- `batch`

### Default Entry Behavior

When the page enters the 商品管理模块 without an explicit inner-tab target, it should land on `菜单管理`.

The priority order should be:

1. explicit `innerTab` in the URL
2. restored state that already contains a valid `innerTab`
3. fallback default of `manage`

This keeps deep links and explicit returns stable while changing the general default entry.

## Implementation Notes

Keep the change focused in the menu-management page and its behavior test.

Update:

- the tab button markup order
- the initial `currentMenuInnerTab` value
- any fallback logic that still assumes `settings` when no explicit target exists
- tests that currently only verify tab presence, so they also verify order and default selection

Do not rename tab IDs, panel IDs, or function names such as `switchMenuInnerTab`.

## Files Affected

- `menu-management.html`
- `tests/menu-management.behavior.test.js`

## Testing

Update or add tests to confirm:

- the tab buttons appear in `菜单管理 / 基本设置 / 批量改价` order
- `init()` defaults to `manage` when no `innerTab` is provided
- explicit `innerTab=settings|manage|batch` still wins over the new default
- switching tabs still updates active state correctly

## Verification

Manual verification should confirm:

- opening `menu-management.html` lands on `菜单管理`
- the first highlighted inner tab is `菜单管理`
- direct links such as `?tab=menu&innerTab=settings` and `?tab=menu&innerTab=batch` still open the requested tab
- returning from product detail without an explicit override lands on `菜单管理`
