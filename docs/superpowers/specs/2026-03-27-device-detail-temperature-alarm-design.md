# Device Detail Temperature Alarm Action Design

**Date:** 2026-03-27

## Goal

Add a single new device-level action, `温度报警设置`, to the right-side `设备操作` area in `devices.html`.

Clicking the action should open a standalone modal scoped to the current device. The device detail body must not gain any new temperature-alarm summary card, teaser, or inline preview.

## Scope

- Add one new top-level action button in the device detail aside
- Add one standalone temperature-alarm modal
- Render temperature-alarm content with the current device id in context
- Keep all existing detail cards unchanged

## Non-Goals

- No new summary row in `设备状态`
- No new card in the detail main column
- No changes to the existing `远程操作` sheet
- No changes to `faults.html`

## UI Contract

### Entry

The right-side `设备操作` area becomes:

1. `远程操作`
2. `温度报警设置`
3. `状态记录`
4. `编辑状态`
5. `物料页面`

`远程操作` remains the primary action. `温度报警设置` is a normal secondary action in the same group.

### Modal

The new modal is a separate overlay, not a sheet inside the remote-action menu.

It shows:

- modal title: `温度报警设置`
- current device id / point context
- zone cards for the configured temperature areas
- per-zone `修改` actions for future editing flow

The first implementation can keep the per-zone action lightweight as long as the modal contract and device context are correct.

## Data

Use a device-scoped helper that returns stable temperature-alarm settings for the current device.

The helper should:

- prefer device-owned config if present
- otherwise generate deterministic preview data from the device id

This keeps the modal contextual without requiring unrelated schema work.
