# Overview Auto Mock Data Design

## Background

`overview.html` and `menu.html` can read new device IDs from runtime `devicesData`, but their operating metrics are only hard-coded for `RCK111`, `RCK112`, and `RCK113`. When a newly created device such as `RCK386` becomes the current device, the pages have language fallback now, but the overview area still has no business data to render. That leaves the page blank or low-value for demos.

## Goal

Automatically provide stable mock operating data for any device ID that exists at runtime but does not have an explicit operating dataset yet.

## Non-Goals

- Do not overwrite the existing hand-authored datasets for `RCK111`, `RCK112`, or `RCK113`.
- Do not persist generated operating data back into `localStorage`.
- Do not change product-management language behavior or sidebar language-switch work.

## Recommended Approach

Add a small runtime fallback layer in both `overview.html` and `menu.html`:

1. Keep the existing base datasets as canonical seed examples.
2. Introduce deterministic helpers that derive a numeric seed from `deviceId`.
3. When a device lacks explicit operating data, generate mock values from the existing base templates:
   - 7-day sales history
   - hourly sales bars
   - year-over-year reference value
   - product structure percentages
   - top-5 product sales
4. Cache generated results in the existing in-memory maps for the session so repeated lookups stay stable and cheap.

## Data Rules

- Generated data must be deterministic for the same device ID.
- Different device IDs should look plausibly different.
- Variations should stay bounded so charts remain believable:
  - sales totals scaled within a narrow band around the existing examples
  - hourly peaks shifted only slightly
  - structure ratios adjusted by a few points, not completely reshaped
  - top-5 sales values follow the same currency-agnostic numeric structure already used in the page

## Integration Points

- Device language fallback stays separate from operating data fallback.
- Overview aggregation should consume a helper like `getSalesHistoryForDevice(deviceId)` instead of reading the raw map directly.
- Product-structure rendering should consume a helper like `getProductStructureForDevice(deviceId)`.
- Any device selected in the overview filter should always have a renderable dataset, even if it was created from `devices.html`.

## Error Handling

- Empty or malformed device IDs fall back to the current base behavior.
- If the generator cannot derive a value, it should return a safe clone of the primary sample dataset rather than throwing.

## Testing Strategy

- Add a runtime regression test for `overview.html` and `menu.html` that sets `currentDevice` to a new device ID such as `RCK386` and confirms generated languages and operating data both render.
- Verify deterministic generation by reading the same generated device twice and confirming values match.
- Verify legacy sample devices still return their original authored datasets.
