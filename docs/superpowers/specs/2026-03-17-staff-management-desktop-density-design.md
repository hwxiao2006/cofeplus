# Staff Management Desktop Density Design

**Date:** 2026-03-17

## Goal

Reduce wasted vertical space in the desktop version of `staff-management.html` so the page feels denser and more operationally efficient without removing any existing staff-management actions.

## Current Problem

The current desktop layout feels longer than the amount of information warrants for two reasons:

- The page header area is effectively duplicated as a summary strip plus a separate list header.
- Each staff card splits a small amount of information into two stacked blocks: the identity block and a full-width `负责设备号` panel.

This creates tall cards with a lot of empty space, especially when a person is only responsible for one or two devices.

## Scope

- Redesign the desktop-only summary/list header into a single compact toolbar row.
- Redesign each desktop staff card into a single-layer horizontal card.
- Keep the existing `编辑人员` and `停用账号 / 启用账号` actions.
- Change the desktop display of `负责设备` to use an inline summary plus click-to-expand full list when needed.
- Add desktop behavior for `查看全部 / 收起` on cards with many devices.
- Update staff-page behavior tests to cover the new structure and device-summary rules.

## Non-Goals

- No mobile layout changes in this change.
- No add/edit modal redesign in this change.
- No backend or persistence model changes for staff or device ownership.
- No changes to permission-tree behavior.
- No changes to business rules for enabling/disabling accounts.

## Files Affected

- `staff-management.html`
- `tests/staff-management.behavior.test.js`

## Architecture

Keep the change self-contained inside the existing staff page. The work should be split into four clear units:

1. **Desktop toolbar layout**
   - Replace the current stacked summary/list heading structure with one compact row.
   - Reuse existing stats data and add-person button behavior.

2. **Desktop card presentation**
   - Flatten each staff card into a single visual layer.
   - Move device ownership summary into the main information column.

3. **Device summary and expansion behavior**
   - Add UI-only logic that decides whether a card shows full device text or a truncated preview.
   - Add per-card expand/collapse state for large device lists.

4. **Regression coverage**
   - Update tests so the new desktop structure is asserted directly and the old tall layout does not regress back in unnoticed.

## UX Design

### Desktop Toolbar

The desktop page header becomes one compact row instead of two stacked containers.

- Left side:
  - `启用人员数` compact stat block.
  - `管理人员列表` title with `共 N 位` secondary count.
- Right side:
  - Existing `添加人员` primary button.

This row should visually replace the current pattern of:

- summary strip
- list head

The intent is to make the page feel immediately actionable and reduce non-content height before the list begins.

### Desktop Staff Card

Each desktop card becomes a single horizontal information card with three zones:

1. **Identity zone**
   - Avatar
   - Name
   - Account status

2. **Details zone**
   - Phone number
   - Creation date
   - Device ownership summary

3. **Action zone**
   - `编辑人员`
   - `停用账号` or `启用账号`

The card should no longer render a separate full-width `负责设备号` panel on desktop.

### Device Ownership Summary

Desktop display rules:

- If the staff member has `0` devices:
  - Show `负责设备：-`
  - Do not render `查看全部`

- If the staff member has `1` to `3` devices:
  - Show all device numbers inline
  - Do not render `查看全部`

- If the staff member has `4` or more devices:
  - Show the first `2` device numbers inline
  - Append `等 N 台`
  - Render a `查看全部` text button next to the summary

Example:

- `负责设备：RCK386、RCK385 等 18 台 查看全部`

### Expanded Device List

When `查看全部` is clicked:

- Expand a device-list area inside the current card.
- The expanded area appears below the card's main row, still within the card container.
- The toggle text changes from `查看全部` to `收起`.
- Clicking `收起` collapses the list back to the summary state.

Expanded-area behavior:

- Use a compact chip or stacked-tag style for readability.
- Apply a maximum height and internal scrolling so a large device set does not make the whole page excessively tall.
- Expansion state is local to each card and does not change other cards.

## Responsive Boundary

This redesign applies to desktop widths only.

- Desktop: use the new compact toolbar and single-layer card layout.
- Tablet/mobile breakpoints: preserve current layout and behavior for now.

Implementation should use the existing page breakpoint strategy instead of introducing a second responsive system.

## Data Model and State

Do not change the stored staff data shape.

Existing fields continue to be used:

- `username`
- `phone`
- `createdAt`
- `accountEnabled`
- `devices`

Add only transient UI state for the page render, for example:

- a per-card expanded-state map or set keyed by `staffId`

This UI state must not be written into persisted `staffManagersData`.

## Edge Cases

- Missing or empty `devices` array:
  - Render `负责设备：-`
  - No expand control

- Very long device lists:
  - Summary uses first two entries plus total count
  - Expanded list scrolls internally after reaching max height

- Long device codes:
  - Allow wrapping or chip overflow handling inside the expanded area
  - Keep the main summary line readable without forcing tall cards

- Disabled accounts:
  - Keep existing visual danger treatment and action label swap

- Empty staff list:
  - Preserve current empty-state logic
  - Only the desktop header density changes, not the empty-state message strategy

## Testing

Update `tests/staff-management.behavior.test.js` to assert:

- The desktop list area uses a compact single-toolbar concept instead of relying on a separate desktop `负责设备号` panel.
- The staff-card render block no longer requires the old `manager-panel manager-device-panel` desktop presentation.
- Cards still render name, phone, creation time, and account status.
- Device summary behavior exists for all three cases:
  - `0` devices
  - `1` to `3` devices
  - `4+` devices with `查看全部 / 收起`
- The page defines helper logic for truncated device previews and per-card expand/collapse behavior.
- Existing edit and enable/disable actions still render from the new layout.

## Verification

Manual verification should confirm:

- Desktop first screen shows more staff content before scrolling.
- Cards with few devices stay visually short.
- Cards with many devices remain short by default and can reveal all devices on demand.
- Repeated expand/collapse actions do not affect account state or edit behavior.

## Recommendation

Implement the recommended desktop direction that the user selected during brainstorming:

- **A. Compact single-layer card**

This is the lowest-risk way to remove the current “empty and overly tall” feeling while preserving the page's existing mental model and behavior.
