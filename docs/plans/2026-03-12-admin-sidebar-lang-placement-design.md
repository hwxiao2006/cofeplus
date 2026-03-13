# Admin Sidebar Language Placement Design

## Goal

Move the admin shell language switch to a cleaner, less intrusive location in the sidebar header.

## Chosen Direction

Use the approved layout:

`Prototype v0 · 中 | EN`

This keeps the language switch inside the metadata layer of the sidebar header rather than between the login row and the first menu group.

## Why This Placement Is Better

- It reads as a global shell preference rather than a menu item.
- It no longer interrupts the visual flow from login info to navigation groups.
- It uses less vertical space.
- It stays low emphasis while remaining discoverable.

## Layout Rules

- Create a single metadata row below the brand line and above the login row.
- Align the whole row to the same left edge used by section titles and menu text.
- Keep `Prototype v0` first.
- Insert a light separator dot between the version and language switch.
- Keep the switch inline and compact; do not right-align it to the sidebar edge.

## Visual Rules

- The metadata row should be slightly dimmer than the login row.
- Active language stays brighter and bolder than the inactive option.
- The row should not create an extra divider or standalone block feeling.

## Scope

Apply the placement update consistently across all sidebar pages that already use the shared admin language switch:

- `overview.html`
- `menu.html`
- `menu-management.html`
- `devices.html`
- `orders.html`
- `materials.html`
- `faults.html`
- `customers.html`
- `locations.html`
- `staff-management.html`
- `product-detail.html`

## Non-Goals

- Do not change translation behavior.
- Do not change storage behavior.
- Do not change page body layout.

## Testing

- Update the shared sidebar language test to require:
  - a shared metadata row
  - `Prototype v0` and `sidebar-admin-lang` in the same row
  - row alignment via the existing sidebar alignment variables
