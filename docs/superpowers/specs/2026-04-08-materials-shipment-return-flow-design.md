# Materials Shipment Return Flow Design

**Date:** 2026-04-08

## Goal

Improve the shipment flow around [materials.html](/Users/mac/Documents/New%20project%204/materials.html), [materials-refill.html](/Users/mac/Documents/New%20project%204/materials-refill.html), and [materials-orders.html](/Users/mac/Documents/New%20project%204/materials-orders.html) so users do not lose context when moving across pages.

The approved direction is:

- keep `发货` as a full-page flow rather than a modal
- make the refill page aware of where it was opened from
- make the refill-page back action return users to the correct source context
- keep successful shipment creation routed to the orders page
- add a clear way to return from the orders page back to the originating materials page context

## Scope

- Update the navigation contract between [materials.html](/Users/mac/Documents/New%20project%204/materials.html) and [materials-refill.html](/Users/mac/Documents/New%20project%204/materials-refill.html)
- Update the post-success handoff from [materials-refill.html](/Users/mac/Documents/New%20project%204/materials-refill.html) to [materials-orders.html](/Users/mac/Documents/New%20project%204/materials-orders.html)
- Preserve and restore the originating device and optional material context when returning to the materials page
- Add or update tests in [tests/materials.device-routing.test.js](/Users/mac/Documents/New%20project%204/tests/materials.device-routing.test.js) to lock the new flow

## Non-Goals

- No redesign of the refill page layout
- No redesign of the orders page data structure
- No change to shipment creation logic itself
- No change to permissions on who can view or void shipment orders
- No new modal-based shipment flow
- No generic cross-app breadcrumb system

## Current Problem

The current flow loses context in two places:

- when the user enters [materials-refill.html](/Users/mac/Documents/New%20project%204/materials-refill.html) from [materials.html](/Users/mac/Documents/New%20project%204/materials.html), the refill page back button always returns to the bare materials page
- after a shipment is successfully created, the user lands on [materials-orders.html](/Users/mac/Documents/New%20project%204/materials-orders.html), but there is no explicit path back to the exact materials-page context they came from

That makes the shipment flow feel like a context break instead of a guided subtask.

## Approved Direction

Use the approved `来源感知返回` model.

This means:

- entering the refill page from the materials page should capture the source page context
- the refill page back button should respect that source context instead of always doing a generic return
- successful shipment creation should still land on the shipment orders page
- the orders page should expose a clear return path back to the originating materials page when the flow started there

This keeps shipment as a dedicated full-page task while still making the overall loop feel connected.

## Source Context Model

When navigating from [materials.html](/Users/mac/Documents/New%20project%204/materials.html) into [materials-refill.html](/Users/mac/Documents/New%20project%204/materials-refill.html), the app should persist a lightweight return context.

That return context should at minimum include:

- source page identity: `materials`
- active device id
- optional preselected material code

It may also include optional presentation context if the implementation can do so cheaply, such as:

- the active category anchor or section id
- the last known scroll position on the materials page

The context must stay lightweight and session-scoped. It should not become a long-lived workflow record.

## Materials Page Entry Rules

From [materials.html](/Users/mac/Documents/New%20project%204/materials.html):

- clicking `发货` on a card should continue to open [materials-refill.html](/Users/mac/Documents/New%20project%204/materials-refill.html)
- before navigating, the page should persist the source-aware return context
- if the action started from a specific material card, that material should still be preselected in the refill page just as it is today

This task should extend the current routing behavior, not replace it with a new navigation model.

## Refill Page Return Rules

On [materials-refill.html](/Users/mac/Documents/New%20project%204/materials-refill.html):

- if a valid source context exists for the materials page, the back button should return to [materials.html](/Users/mac/Documents/New%20project%204/materials.html) and restore that context
- if no valid source context exists, the back button may keep the current generic fallback behavior

Returning to the materials page should restore:

- the originating device
- the relevant material preselection state if applicable

Restoring the exact scroll position is desirable but optional. If implemented, it should feel stable rather than jumpy.

## Success Flow Rules

After `生成发货单` succeeds on [materials-refill.html](/Users/mac/Documents/New%20project%204/materials-refill.html):

- the flow should continue to route to [materials-orders.html](/Users/mac/Documents/New%20project%204/materials-orders.html)
- the newly created order should remain visible in the orders page as it is today
- the source-aware return context should still be available so the user can get back to the materials page without losing the original device context

This task explicitly keeps the success destination as the orders page. The goal is to improve the way back, not to bypass the order confirmation destination.

## Orders Page Return Rules

On [materials-orders.html](/Users/mac/Documents/New%20project%204/materials-orders.html):

- if the user arrived from the materials shipment flow, the page should expose a clear `返回物料页` affordance
- activating that return affordance should send the user back to [materials.html](/Users/mac/Documents/New%20project%204/materials.html) with the stored source context restored
- if there is no valid materials-source context, the page may keep the existing generic back behavior

This return affordance should be explicit and easy to discover. It should not rely on the browser back button alone.

## Context Lifetime Rules

The source-aware return context should behave predictably:

- it should be written when entering the refill page from the materials page
- it should survive the successful handoff into the orders page
- it should be cleared once it is no longer useful, so stale context does not cause surprising future redirects

If the user reaches the refill or orders page directly, without starting from the materials page, the app should not invent a fake source context.

## Error Handling

The flow should degrade safely in these cases:

- missing or malformed return context
- device id no longer available in the current materials-page dataset
- preselected material no longer exists in the current materials-page dataset

Fallback behavior should remain simple:

- return to the plain materials page if possible
- if some restored detail cannot be recovered, still restore the page without blocking the user

The app should never trap the user on the refill page or the orders page because context restoration failed.

## Testing Requirements

Update [tests/materials.device-routing.test.js](/Users/mac/Documents/New%20project%204/tests/materials.device-routing.test.js) to verify:

- entering the refill page from the materials page writes the source-aware return context
- the refill page back action prefers the stored materials-source context
- successful shipment creation still routes to the orders page
- the orders page exposes a materials return affordance only when that source context exists
- returning from the orders page restores the materials device context
- invalid or missing context falls back to safe generic navigation

Where practical, cover both:

- structure assertions for the new return affordance
- runtime assertions for the session-storage-driven navigation behavior

## Success Criteria

This work is successful when:

- shipment remains a dedicated full-page flow
- users can back out of the refill page without losing their materials-page context
- successful shipment creation still lands on the orders page
- users can clearly return from the orders page to the materials page
- the restored materials page keeps the correct device context
- the flow degrades safely when source context is missing or stale
