# Device Entry EntryInfo Alignment Design

**Date:** 2026-04-03

## Goal

Align the device entry flow in [device-entry.html](/Users/mac/Documents/New%20project%204/device-entry.html) with the current entry-info schema already used by the device detail edit flow in [devices.html](/Users/mac/Documents/New%20project%204/devices.html).

The approved direction is:

- `device-entry.html` should write the same `device.entryInfo` shape as `saveEntryInfoEdit()`
- new device entry data should not keep using the old partial schema
- the entry page keeps its current business flow, but its saved payload must match the detail page contract
- ad-screen data should use the current left/right grouped model
- location photos should use the same preview-list storage shape as the detail edit flow

## Background

The current product has two different entry-info contracts:

- the device detail modal already reads and writes a richer `entryInfo` object
- the device entry page still submits an older, smaller payload

This creates visible mismatch:

- device detail can display fields that device entry never writes
- ad-screen configuration on the entry page still reflects the old `显示器画面` model
- entry and detail are no longer interchangeable as two editors for the same business object

The result is that a newly entered device can still look incomplete or outdated as soon as the operator opens device detail.

## Current Problems

### 1. The entry page writes an incomplete entry-info contract

`buildEntryInfoPayload()` in `device-entry.html` currently writes only a subset of the fields that the detail page expects.

Missing fields include:

- `operatorPhone`
- `networkSignal`
- `maintenanceWindow`
- `notes`
- `adScreen`
- `locationImageUrls`

### 2. The entry page still uses the old screen-upload mental model

The current entry page still shows `显示器画面` and placeholder upload boxes.

The device detail flow has already moved to the approved left/right ad-screen structure:

- `左侧菜单`
- `右侧排队号背景`

Keeping the entry page on the old model means operators are effectively learning two different products for the same device data.

### 3. Entry and detail are no longer symmetric editors

Operators should be able to:

- enter a device on the entry page
- open device detail immediately afterward
- see the same business fields represented without translation loss

That is not true today because the entry page writes old fields while the detail page renders the new structure.

## Design Principles

### Principle 1: One business object, one saved schema

`device.entryInfo` must have one canonical shape for current product behavior.

The entry page and the detail page may have different layout and interaction patterns, but they should save the same structure.

### Principle 2: Follow the latest approved device-detail contract

The device detail page is already the richer and more current business surface.

This design does not invent a third format. It makes the entry page conform to the structure already approved and in use there.

### Principle 3: Prefer targeted alignment over broad refactoring

This change solves the data mismatch directly.

It does **not** require extracting a large shared module or redesigning the whole device-entry page architecture in this phase.

### Principle 4: Preserve historical compatibility without migration work

This phase aligns new writes.

It does not batch-migrate all historical device entry payloads in local storage. Existing compatibility logic in `devices.html` remains in place for old records.

## Non-Goals

This design does not include:

- a full historical data migration for existing `devicesData`
- redesigning the quick-create location flow
- redesigning staff selection interactions beyond what is needed to write `operatorPhone`
- backend API integration
- extracting entry-info builders into a shared utility file

## Approved Final Approach

The approved approach is:

- keep `device-entry.html` as the dedicated device-entry page
- update its visible field set so it can capture the same business data expected by `devices.html`
- update `submitEntry()` and `buildEntryInfoPayload()` so they write the same `entryInfo` contract as `saveEntryInfoEdit()`
- keep `devices.html` as the reader and editor of that same contract

## Final UX Structure

## Device Entry Page

The entry page keeps the existing high-level flow:

1. choose device
2. choose location
3. fill entry information
4. configure payment and screen assets
5. submit entry

The approved UI adjustments are:

- keep the current page shell and section structure where practical
- keep device selection, location selection, GPS capture, energy settings, date range, and payment selection
- extend the form to include the fields already supported in detail edit
- replace the legacy `显示器画面` section with the current left/right ad-screen configuration
- replace placeholder-only location image boxes with actual location-photo upload and preview behavior

## Required Field Alignment

### Operator Fields

The entry page must write:

- `operatorName`
- `operatorPhone`

The approved behavior is:

- reuse the current operator selection entry point
- when an operator is selected, carry both name and phone into the saved payload
- if phone data is unavailable, save `-`

### Location and GPS Fields

The entry page continues to write:

- `locationName`
- `locationAddress`
- `gpsAction`
- `longitude`
- `latitude`
- `entryAt`

These remain part of the canonical entry-info payload.

### Operating Configuration Fields

The entry page must write:

- `energyMode`
- `networkSignal`
- `energyStartTime`
- `energyEndTime`
- `deviceStartDate`
- `deviceEndDate`
- `terminalGeneration5`
- `parallelProduction`
- `maintenanceWindow`
- `notes`

`networkSignal`, `maintenanceWindow`, and `notes` must be added to the entry page so a new device entry can fully populate the detail view.

### Payment Fields

The entry page continues to write:

- `payQr`
- `payDigitalRmb`
- `paymentMethods`

No business-rule change is required here beyond keeping the values in the canonical payload.

## Ad Screen Structure

The entry page should stop writing the old screen placeholders and instead use the approved ad-screen structure already used in detail edit.

Approved UI groups:

- `左侧菜单`
- `右侧排队号背景`

Approved saved structure:

```js
entryInfo.adScreen = {
  leftMenu: {
    kind: 'image' | 'video',
    url: '...',
    fileName: '...',
    mimeType: '...',
    width: 1320,
    height: 1080,
    durationSec: 0,
    codec: 'H.264',
    updatedAt: '...'
  } | null,
  rightQueueBackground: {
    kind: 'image',
    url: '...',
    fileName: '...',
    mimeType: '...',
    width: 800,
    height: 1080,
    updatedAt: '...'
  } | null
}
```

Approved rules:

- `左侧菜单` supports image and video upload
- `右侧排队号背景` supports image upload only
- new entry writes `adScreen` as the source of truth
- the entry page no longer writes legacy `displayImages` placeholder content

## Location Photos

The entry page should align with the detail edit flow for local image handling.

Approved saved fields:

- `locationImageUrls`
- `locationImages`

Approved behavior:

- store uploaded image data URLs in `locationImageUrls`
- write a human-readable count summary into `locationImages`
- show uploaded previews on the entry page instead of placeholder-only boxes

## Canonical Saved Payload

After this change, `device-entry.html` should save the following keys in `device.entryInfo`:

```js
{
  entryAt,
  locationName,
  locationAddress,
  operatorName,
  operatorPhone,
  gpsAction,
  longitude,
  latitude,
  energyMode,
  networkSignal,
  energyStartTime,
  energyEndTime,
  deviceStartDate,
  deviceEndDate,
  terminalGeneration5,
  parallelProduction,
  maintenanceWindow,
  notes,
  payQr,
  payDigitalRmb,
  paymentMethods,
  adScreen,
  locationImageUrls,
  locationImages
}
```

The entry page should not continue writing:

- `displayImages`

## Backward Compatibility

This phase does not migrate every historical device entry record.

Approved compatibility boundary:

- old device records may still exist in local storage
- `devices.html` keeps its current compatibility logic for reading older data
- newly submitted device entry records must use the canonical payload only

This keeps the current product stable while stopping further drift.

## Error Handling and Defaults

Approved defaults:

- `operatorPhone`: `-` when unavailable
- `networkSignal`: default to `优`
- `maintenanceWindow`: `-` when empty
- `notes`: `-` when empty
- `energyStartTime` and `energyEndTime`: `-` when energy mode is `关闭`
- `locationImageUrls`: empty array when no images uploaded
- `locationImages`: `-` when no images uploaded

Approved validation expectations:

- keep existing required validation for device and location selection
- keep payment validation behavior aligned with current page rules
- do not block submit just because ad-screen or location-image fields are empty

## Implementation Notes

The change should stay focused on the current files rather than broad extraction.

Expected primary touch points:

- [device-entry.html](/Users/mac/Documents/New%20project%204/device-entry.html)
- [devices.html](/Users/mac/Documents/New%20project%204/devices.html) only if a small shared compatibility adjustment is required
- device-entry and device-detail regression tests

## Testing Requirements

The implementation must prove schema alignment at both markup and runtime levels.

Required coverage:

1. `device-entry.html` contains the newly aligned field IDs and upload controls
2. `buildEntryInfoPayload()` writes the canonical field set
3. `submitEntry()` stores the canonical payload in `device.entryInfo`
4. ad-screen entry data is written under `entryInfo.adScreen`
5. location images are written under `locationImageUrls`
6. existing detail tests still pass when reading a device written by the entry page

## Success Criteria

This work is successful when:

- a device entered through `device-entry.html` immediately displays complete and correctly mapped entry information in `devices.html`
- the entry page no longer writes the legacy screen placeholder fields
- the ad-screen model is left/right aligned across both entry and detail surfaces
- the entry and detail flows operate on one consistent `entryInfo` contract
