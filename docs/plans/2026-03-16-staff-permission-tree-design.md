# Staff Permission Tree Design

**Date:** 2026-03-16

## Goal

Replace the legacy role checkbox block in `staff-management.html` with an operations-facing permission tree that mirrors the approved operations menu structure. The tree should be understandable by non-technical operators, support parent-child selection rules, and display the selected permissions back on each staff card in grouped form.

## Scope

- Replace the existing `运维权限 / 维修权限 / 财务权限 / 管理员权限 / 运维&退款权限` checkbox set.
- Keep only `运营管理` permissions in the staff permission module.
- Model these permissions as a tree:
  - `总览 > 查看总览`
  - `设备 > 查看设备`
  - `商品管理 > 查看商品管理 / 新增语言 / 更改币种 / 编辑商品 / 编辑配方`
  - `物料 > 查看物料`
  - `订单 > 查看订单 / 订单退款`
  - `故障列表 > 查看故障列表`
  - `人员管理 > 查看人员管理 / 人员维护`
- Treat `人员维护` as the combined control for add/edit staff actions.
- Update list display and stats so they no longer rely on removed legacy role labels.
- Migrate mock and persisted staff permissions from legacy role keys to the new permission keys.

## Non-Goals

- No backend API or server permission enforcement.
- No permissions for `基础信息管理`.
- No per-button permission enforcement on other pages in this change.

## UX Design

### Permission Form

The current flat option grid becomes a stacked tree of cards:

- Each module is a `permission-group-card`.
- The card header shows the module name and a parent checkbox.
- Child permissions render in a compact two-column grid on desktop and a single-column stack on mobile.
- Modules without extra sub-actions still render a single child item, so the whole module stays visually consistent.
- The section title changes from `选择权限` to `菜单权限配置`.

### Selection Rules

- Checking a parent selects all children under that module.
- Unchecking a parent clears all children.
- Checking any child auto-selects the parent.
- Unchecking all children auto-clears the parent.
- Child checkboxes stay enabled because every parent in this tree conceptually maps to at least one visible child permission.

### Staff Card Display

The `权限` panel on each staff card should render grouped summaries instead of a flat chip list. Example:

- `商品管理：查看商品管理、编辑商品、编辑配方`
- `订单：查看订单、订单退款`

This keeps the card readable when one person has many detailed permissions.

## Data Model

Store permissions as a flat string array on each staff member, using these keys:

- `ops.overview`
- `ops.devices`
- `ops.products`
- `ops.products.language`
- `ops.products.currency`
- `ops.products.edit`
- `ops.products.recipe`
- `ops.materials`
- `ops.orders`
- `ops.orders.refund`
- `ops.faults`
- `ops.staff`
- `ops.staff.manage`

Legacy values should be mapped forward when loading old data:

- `ops` -> `ops.devices`, `ops.materials`, `ops.faults`
- `repair` -> `ops.devices`, `ops.faults`
- `finance` -> `ops.orders`
- `admin` -> all supported permission keys
- `ops_refund` -> `ops.devices`, `ops.materials`, `ops.orders`, `ops.orders.refund`

The migration only needs to normalize what the page reads and stores locally.

## Stats Update

Because the old role model disappears, the four existing summary cards should change to:

- `当前商户管理人员`
- `商品配置权限人数` (any of the product-related permissions)
- `订单退款权限人数` (`ops.orders.refund`)
- `覆盖设备数`

## Testing

Update `tests/staff-management.behavior.test.js` to assert:

- The legacy role labels are removed from the permission form.
- The new permission tree labels exist.
- The new order refund and staff manage sub-permissions exist.
- The script defines grouped permission metadata and migration helpers.
- The stats logic references new permission keys instead of removed legacy roles.

