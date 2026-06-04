# Materials Card Action Style Design

**Date:** 2026-04-07

## Goal

Refresh the visual design of the material card in [materials.html](/Users/mac/Documents/New%20project%204/materials.html) without changing the underlying materials logic.

The approved direction is:

- use the previously approved card-shell direction from comparison `C`
- use the previously approved action-button direction from comparison `B`
- remove the right-arrow mini detail button
- remove the `使用中` text in the footer
- keep `发货` and `补充` as two equal-priority actions
- keep those two actions side by side on both desktop and mobile

## Scope

- Update the material card shell styling in [materials.html](/Users/mac/Documents/New%20project%204/materials.html)
- Update the material card footer action layout in [materials.html](/Users/mac/Documents/New%20project%204/materials.html)
- Keep the current category grouping, data rendering, and action handlers intact
- Add or update tests in [tests/materials.device-routing.test.js](/Users/mac/Documents/New%20project%204/tests/materials.device-routing.test.js) to lock the new structure

## Non-Goals

- No change to material categories
- No change to material ordering
- No change to action semantics
- No change to refill routing logic
- No change to detail modal behavior except losing the separate right-arrow launcher
- No redesign of [materials-refill.html](/Users/mac/Documents/New%20project%204/materials-refill.html)
- No redesign of [materials-orders.html](/Users/mac/Documents/New%20project%204/materials-orders.html)

## Current Problem

The current material card footer still reads as an older compact backend pattern:

- there is a tiny standalone right-arrow button
- there is a `使用中` label that does not add much operational value
- the footer action hierarchy feels slightly unbalanced after the earlier cleanups

The user wants the footer to feel cleaner and more intentional while still working well on mobile and desktop.

## Approved Visual Direction

## Card Shell

Use comparison `C` from the card-shell comparison page as the source of truth.

That means:

- keep the card as a light, polished panel rather than a harsh box
- preserve the current information structure
- retain the soft gradient / refined panel feel
- improve perceived finish through spacing, border treatment, and visual calm

The card should still feel like a backend operations component, but with a more finished product-level presentation.

## Footer Actions

Use comparison `B` from the action comparison page as the source of truth.

That means:

- two equal-priority action buttons
- more explicit action affordance
- stronger legibility for both desktop and touch use
- icon-supported action buttons if the implementation still feels visually clean

The footer should no longer feel like:

- one primary action
- one secondary action
- one tiny leftover detail icon

Instead, it should read as a clean two-action control row.

## Structural Rules

Each material card footer should now contain:

- `发货`
- `补充`

It should no longer contain:

- the standalone right-arrow detail button
- the `使用中` label

## Interaction Rules

The visible button set changes, but the existing behaviors stay the same:

- `发货` still routes into the refill flow
- `补充` still opens the refill modal

Because the separate arrow is removed, opening details should no longer depend on that icon.

If card-level detail access still needs to exist, it should be reassigned in a cleaner future pass rather than preserved as a tiny residual footer control in this task.

For this phase, the approved removal of the arrow button takes precedence.

## Layout Rules

## Desktop

Desktop footer layout should:

- show two buttons in one row
- make the buttons read as equal priority
- keep enough spacing that they do not visually collapse together
- avoid bringing back a third tiny trailing control

The buttons do not need to be oversized, but they should feel intentional and easier to scan than the current mixed-size footer controls.

## Mobile

Mobile uses the same two-button model.

The user explicitly approved:

- two buttons side by side
- equal-width layout
- no stacked mobile layout

So on narrow screens:

- keep the two buttons in one row
- make them equal width
- preserve comfortable tap sizing
- keep button labels readable without wrapping into messy multi-line blocks

## Typography And Styling

The card and footer should reflect the approved design mix:

- shell styling closer to polished comparison `C`
- action styling closer to explicit comparison `B`

Recommended styling characteristics:

- slightly more refined card radius and border treatment
- cleaner footer separation
- stronger action-button legibility
- tighter, more deliberate spacing between content and actions

## Testing Requirements

Update [tests/materials.device-routing.test.js](/Users/mac/Documents/New%20project%204/tests/materials.device-routing.test.js) to verify:

- the right-arrow detail button is removed from the material card
- the `使用中` footer text is removed
- the card still renders the `发货` and `补充` actions
- the footer action group is structured as a two-button row
- mobile layout still keeps the two actions side by side rather than stacking them

## Success Criteria

This work is successful when:

- the material card looks more polished overall
- the footer feels cleaner and more intentional
- the separate arrow button is gone
- the `使用中` text is gone
- desktop and mobile both present two equal actions in one row
- existing `发货` and `补充` interactions still work as before
