# Staff Management Segmented Modal Flow Design

**Date:** 2026-03-19

## Goal

Redesign the add/edit staff modal in `staff-management.html` into a compact segmented flow so the configuration process feels step-based without turning into a heavy multi-page wizard.

The approved direction is:

- Keep one modal
- Show three explicit steps
- Only expand the current step
- Collapse completed earlier steps into one-line summaries
- Replace overly technical wording like `设备池` with user-facing copy: `可管理设备`

## Current Problem

The current staff modal places all configuration sections in one long form:

1. Basic info
2. Menu permissions
3. Responsible devices
4. Page device scopes

Even after the earlier page-scope work, the modal still feels too long because:

- administrators must understand all concepts at once instead of progressively;
- the form shows full content for multiple logical stages simultaneously;
- the phrase `设备池` is too technical for everyday operators;
- the page-scope section appears only after a long vertical scan, even though it depends on choices made earlier.

## Scope

This design covers only the interaction and presentation of the staff add/edit modal in `staff-management.html`.

In scope:

- Reorganize the modal into three segmented steps
- Introduce compact summary rows for completed steps
- Rename relevant copy to `可管理设备`
- Keep page device scope configuration as the third step
- Keep current save behavior inside one final submit action
- Keep current device-selector and module-scope-selector mechanics, unless minor copy or entry-point changes are required

## Non-Goals

This change does **not** expand runtime page-scoping to every page permission.

Out of scope:

- No new runtime device-scope enforcement for `overview`, `products`, `materials`, or `staff`
- No true wizard with route/page transitions
- No multi-step save or draft persistence
- No backend/API redesign
- No changes to existing `moduleDeviceScopes` storage rules beyond copy and presentation
- No redesign of the full-page staff list outside modal-adjacent summary text that may need wording alignment

## Existing Data Boundary

The current approved data model remains valid and should stay unchanged for this redesign:

- `permissions` stores page/action permissions
- `devices` stores the staff member's full device ownership set
- `moduleDeviceScopes` stores per-page scope only for:
  - `devices`
  - `orders`
  - `faults`

This interaction redesign must respect that boundary.

That means:

- Step 2 may still let admins select many page permissions
- Step 3 must only render rows for checked permissions that are also currently supported by `moduleDeviceScopes`
- Step 3 must not imply runtime page-scoping exists for pages that do not currently consume it

## Recommended Approach

Keep a single modal, but turn it into a segmented workflow with one active content block at a time.

Recommended step sequence:

1. `可管理设备`
2. `页面权限`
3. `页面设备范围`

This keeps the configuration mental model aligned with how admins think:

- First decide which devices this person can manage at all
- Then decide which pages they can access
- Then, for device-relevant pages, optionally narrow the visible devices

## UX Structure

### Modal Structure

The modal remains one container with:

- title and close action
- a lightweight 3-step header
- two compact summary rows for completed prior steps
- one expanded current-step panel
- one shared footer with cancel/save actions

The modal must not show multiple expanded large sections at once.

### Step Header

Top header shows all three steps persistently:

- `1 可管理设备`
- `2 页面权限`
- `3 页面设备范围`

State behavior:

- current step: highlighted
- completed steps: marked as complete
- upcoming steps: visible but not expanded

The step header is informative, not a full router. Clicking may jump to a step if allowed, but the page should still feel like one modal, not a separate wizard screen.

Allowed jump rules:

- current step: always open
- completed earlier steps: can be reopened from either the step header or the collapsed summary row
- future steps: cannot be opened directly from the header until all preceding steps are valid and marked complete

Example:

- if Step 1 is incomplete, Step 2 and Step 3 stay non-interactive
- if Step 1 is complete but Step 2 is incomplete, Step 3 stays non-interactive
- once Step 2 is complete, Step 3 becomes the active next step

## Step Details

### Step 1: 可管理设备

Purpose:

- select the devices this staff member can manage overall

Primary copy:

- Title: `步骤 1 · 可管理设备`
- Description: `先选择该人员可管理的设备，后续页面可见设备都从这里选择`

Presentation:

- reuse the current lightweight device selection entry pattern
- show current selected-device summary
- keep the existing device selector modal/list behavior where practical

Summary row after completion:

- `步骤 1 · 可管理设备`
- summary example: `已选 5 台：RCK386、RCK385、RCK384、RCK409、RCK412`
- trailing action: `修改`

### Step 2: 页面权限

Purpose:

- select which pages/actions the staff member can access

Primary copy:

- Title: `步骤 2 · 页面权限`
- Description: `先决定这个人员能进入哪些页面、能执行哪些页面动作`

Presentation:

- reuse the existing permission tree
- keep current parent/child permission rules
- keep the modal footer as the only final save point

Summary row after completion:

- `步骤 2 · 页面权限`
- summary example: `已选 6 项：总览、设备、订单、故障、人员管理、退款`
- trailing action: `修改`

### Step 3: 页面设备范围

Purpose:

- optionally narrow visible devices for supported device-aware pages

Primary copy:

- Title: `步骤 3 · 页面设备范围`
- Description: `只显示已勾选且当前真正支持设备范围的页面；其他页面不在这里出现`

Important scope constraint:

- even if Step 2 checked `overview`, `products`, `materials`, or `staff`, Step 3 must not show them
- Step 3 currently shows only:
  - `设备`
  - `订单`
  - `故障列表`

Helper copy:

- `默认继承全部可管理设备；只有切到“指定设备”时，才需要进一步选择`

## Step 3 Row Design

The current page-scope area should be compressed into short operational rows, not tall cards.

Each row contains:

- page name
- authorization state
- current scope summary
- compact chips for current selection
- short action controls

Example summary patterns:

- `全部可管理设备（5 / 5 台）`
- `已指定 3 / 5 台设备`
- `已指定 0 / 5 台设备`

Recommended actions:

- `全部可管理设备`
- `指定设备`
- `重新选择`

Guiding rule:

- do not expose the full device selector inline inside the step
- entering detailed selection still happens through the existing focused selector entry point

This keeps Step 3 dense and scannable.

## Copy Changes

Replace technical/system-oriented copy with simpler user-facing language.

Approved wording:

- `设备池` -> `可管理设备`
- `全部负责设备` -> `全部可管理设备`
- `负责设备用于定义该人员可被分配管理的全部设备，页面设备范围只能从这里选择。`
  ->
  `先选择该人员可管理的设备，后续页面可见设备都从这里选择。`

Additional recommended copy:

- Step summary label:
  - `已选 5 台可管理设备`
- Step 3 helper:
  - `默认继承全部可管理设备；只有切到“指定设备”时，才需要进一步选择`

## Interaction Rules

### Expansion Rules

- Only the current step shows full body content
- Completed earlier steps collapse into one-line summary rows
- Future steps remain collapsed until reached
- Clicking `修改` on a completed summary row reopens that step and collapses the others

### Progression Rules

- Step 1 cannot be completed if no manageable devices are selected
- Step 2 cannot be completed if no permissions are selected
- Step 3 only requires action when a supported authorized page is switched to `指定设备`

The modal still ends with one shared final save action.

### Upstream/Downstream Dependency Rules

Step 1 is the upstream source for Step 3.

If Step 1 removes a device:

- remove it automatically from every page scope selection
- keep permission selections unchanged
- if a `custom` page scope becomes empty, keep the row in `指定设备` mode, show an inline warning in Step 3, and require the admin to either:
  - reselect at least one device, or
  - manually switch that row back to `全部可管理设备`

Recommended warning text:

- `故障列表页面已无可见设备，请重新选择范围或改回“全部可管理设备”。`
- same pattern for other supported pages

Step 2 is the gate for Step 3.

If a supported page permission is unchecked in Step 2:

- hide that row from Step 3
- retain its stored scope config in memory/data, but mark it as inactive by permission

If the permission is later re-enabled:

- restore the previous scope config instead of forcing the admin to reselect from scratch

## Validation Rules

Keep the current validation order, but align the messaging with the segmented flow:

1. basic info
2. manageable devices
3. permissions
4. page scopes

Validation behavior:

- Step 1: at least one `可管理设备`
- Step 2: at least one permission
- Step 3: if a supported authorized page uses `custom`, it must contain at least one selected device

Important consistency rule:

- if Step 1 pruning causes a Step 3 `custom` row to drop to `0` devices, the modal stays editable, but final save must be blocked until the admin fixes that row
- the UI must not auto-convert an empty `custom` row into `全部可管理设备`, because that would silently broaden access beyond the admin's last explicit choice

Validation copy should reference `可管理设备` where applicable.

## Visual Density Rules

This redesign should explicitly reduce height in two ways:

1. collapse all non-current steps to summary rows
2. make Step 3 rows horizontally compact

Avoid:

- tall cards for collapsed steps
- repeated explanatory blocks above every row
- inline full device-picker grids inside Step 3
- duplicate explanatory text in both step header and row body

## Files Affected

Primary implementation file:

- `staff-management.html`

Likely tests to update:

- `tests/staff-management.behavior.test.js`

If wording or selector entry points are asserted elsewhere, update only the relevant tests; do not broaden the change into unrelated pages.

## Architecture Notes

Keep this redesign self-contained inside the existing staff modal implementation.

Suggested internal units:

1. **Step state controller**
   - knows current step
   - handles transitions and reopen behavior

2. **Summary row renderer**
   - builds collapsed rows for completed steps
   - keeps copy concise and deterministic

3. **Current step renderer**
   - renders only the active step body
   - reuses existing device and permission selection logic

4. **Scope-row compressor**
   - converts the current Step 3 section into compact rows without changing the underlying page-scope model

The underlying `moduleDeviceScopes` logic should remain understandable independently from the new presentation.

## Testing

Update modal behavior tests to assert:

- the modal exposes a 3-step segmented structure
- only the current step expands fully
- completed earlier steps collapse into single summary rows
- wording uses `可管理设备` instead of `设备池`
- Step 3 only renders supported scoped pages, not every checked permission
- Step 3 rows use compact summary/action layout instead of the previous heavier presentation
- reopening an earlier completed step is supported via `修改`
- removing a Step 1 device still prunes Step 3 selections and surfaces the warning state

## Verification

Manual verification should confirm:

- the modal becomes visibly shorter while configuring later steps
- an admin can understand the flow from top to bottom without learning system terms
- Step 3 feels like a lightweight adjustment pass, not a second large form
- changing Step 1 and Step 2 still correctly influences Step 3
- final save behavior remains one clear action

## Recommendation

Implement the approved interaction direction:

- one modal
- three visible steps
- only current step expanded
- completed steps collapsed into summary rows
- `可管理设备` as the primary user-facing term
- Step 3 still limited to supported scoped pages only

This is the lowest-risk way to make the modal feel much shorter and clearer without expanding runtime scope semantics beyond what the product has approved today.
