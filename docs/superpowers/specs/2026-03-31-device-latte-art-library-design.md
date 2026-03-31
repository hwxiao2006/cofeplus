# Device Latte Art Library Design

**Date:** 2026-03-31

## Goal

Add a device-scoped `设备拉花图库` capability so operators can upload latte art images for one specific machine, name each image for backstage management, and optionally copy the newly saved asset to other devices with `同名覆盖 / 不同名新增` semantics.

The approved direction is:

- latte art images are device assets, not global product images
- image names are freeform operator input
- products and devices link by normalized latte art name
- after saving to the current device, the UI should immediately ask whether to copy to other devices

## Scope

- Add a `设备拉花图库` section to the device detail experience in [devices.html](/Users/mac/Documents/New%20project%204/devices.html).
- Let operators upload one image at a time for the current device.
- Require every uploaded image to have a name.
- Store a per-device latte art library in local state for the prototype.
- Support:
  - upload
  - replace image
  - rename
  - delete
  - search by name
- After a successful save on the current device, offer `是否复制到其他设备`.
- Reuse the existing multi-device selection pattern already used by 商品复制 flows when choosing target devices.
- Copy rule:
  - same normalized name on target device -> overwrite that target image
  - no same normalized name on target device -> add a new item
- Keep product/device linkage name-based:
  - product latte art option name defines the expected capability
  - device latte art library determines whether the current device has a matching image asset
- Surface basic device-side status:
  - uploaded count
  - linked count
  - unreferenced count
  - missing-material count

## Non-Goals

- No global latte art taxonomy management in 商品管理 for this iteration.
- No forced migration of existing product latte art options into a new master dictionary.
- No batch ZIP import, OCR naming, or AI naming suggestions.
- No multilingual latte art image names in this iteration.
- No standalone bulk-copy workflow for arbitrary existing assets beyond the post-save copy prompt.
- No backend API design in this spec; the prototype stores data locally and keeps the behavior model ready for later API replacement.
- No redesign of the current 商品管理 latte art option editor in this iteration.

## Background

The current prototype already has two important building blocks:

1. Product/menu surfaces already model latte art as a product-side option concept.
2. Device surfaces already own device-scoped operations and per-device local persistence patterns.

That means the product boundary is already close to the desired direction:

- 商品 defines what can be sold
- 设备 defines what this machine actually has installed and ready to use

The missing piece is a clear operator-facing place to manage device-level latte art image assets.

## Current Problem

Today, latte art exists conceptually in product configuration, but operators cannot manage machine-specific latte art image assets.

That creates several operational gaps:

- there is no clear place to upload the actual image resource for one device
- operators cannot distinguish between:
  - a product that supports a latte art option
  - a device that actually has the matching image asset
- there is no controlled copy flow to propagate one newly uploaded image to other devices
- there is no explicit overwrite behavior when another device already has an image with the same business name

The result is that latte art capability is only partially represented: the sellable option exists, but the per-machine material does not.

## Product Direction

This feature should follow one stable rule:

`商品决定可选拉花名，设备决定这个名字有没有对应图片素材。`

In other words:

- the product catalog remains the source of truth for latte art option names
- the device latte art library is the source of truth for whether this machine has the corresponding image asset

This keeps the system understandable for operators:

- if a product offers `天鹅`
- and the current device has a latte art library item named `天鹅`
- then the device is materially configured for that latte art

If the product has `天鹅` but the device does not, the product-side option still exists, but the device asset is considered missing.

## Entry Placement

The main entry belongs in [devices.html](/Users/mac/Documents/New%20project%204/devices.html), inside the device detail experience, not inside `远程操作` and not inside 商品管理.

Approved placement:

- add a new left-column section named `设备拉花图库`
- position it after `设备状态`
- keep `设备操作` as the sticky action area on the right

Why this placement:

- this is a device asset, not a one-shot command
- operators need to understand they are editing one concrete machine
- the feature should sit close to the rest of the machine's current status and configuration context

## UX Design

### A. Section Summary

The `设备拉花图库` section should show:

- section title: `设备拉花图库`
- one short helper line:
  - `当前设备生效，按拉花名称与商品配置联动`
- summary stats:
  - `已上传`
  - `已联动`
  - `未引用`
  - `缺失素材`
- one primary action:
  - `上传拉花图片`
- one inline search box:
  - search by asset name

### B. Asset List

Each row/card in the list should show:

- image thumbnail
- operator-facing name
- update time
- source device marker
- status marker:
  - `已联动`
  - `未引用`

Actions per item:

- `替换图片`
- `重命名`
- `删除`

This iteration does not require a separate always-visible `复制到其他设备` action on every row. The guaranteed copy entry is the post-save prompt after upload or replace.

### C. Empty State

If the current device has no latte art images:

- show:
  - `当前设备还没有拉花图片`
- primary button:
  - `上传第一张拉花图片`

### D. Upload Modal

The upload interaction is a modal bound to the current device.

Fields:

- image file input
- name input
- local preview

Rules:

- image is required
- name is required
- name is validated against current-device uniqueness after normalization

If the current device already has an item with the same normalized name:

- show a confirm step before final save:
  - `当前设备已存在同名拉花“天鹅”，保存后将覆盖原图片，是否继续？`

### E. Post-Save Copy Prompt

After a successful save to the current device, immediately ask:

- `已保存到设备 RCK386。是否复制到其他设备？`

Buttons:

- `暂不复制`
- `复制到其他设备`

If the operator chooses copy:

- open a target-device selection modal
- reuse the same interaction pattern already familiar from product copy flows:
  - search device
  - multi-select
  - select all filtered
  - clear selected
  - selected count

### F. Copy Confirmation

Before confirming cross-device copy, the UI should summarize impact:

- `同名项将覆盖图片`
- `不同名项将新增`
- `目标设备其他拉花图片不会删除`

The confirmation panel should also show a pre-check summary if available:

- `将覆盖 1 台设备中的同名项`
- `将新增 2 台设备中的新项`

After execution, show a result summary grouped by:

- overwritten
- added
- failed

## Data Model

Prototype storage should follow the same per-device local-storage style already used elsewhere in the repo.

Storage key:

```js
deviceLatteArtLibrary_${deviceId}
```

Stored value:

```js
{
  version: 1,
  updatedAt: "2026-03-31T10:30:00.000Z",
  items: [
    {
      id: "art_9f2c1",
      name: "天鹅",
      nameKey: "天鹅",
      image: "data:image/png;base64,...",
      sourceDeviceId: "RCK386",
      createdAt: "2026-03-31T10:20:00.000Z",
      updatedAt: "2026-03-31T10:30:00.000Z"
    }
  ]
}
```

Field rules:

- `id`
  - stable internal identifier
  - used for UI operations on the current device
- `name`
  - operator-facing raw input
  - shown in UI
- `nameKey`
  - normalized comparison key
  - used for uniqueness, overwrite, and product/device matching
- `image`
  - local prototype image payload
  - can later be replaced by remote URL/object storage reference without changing the behavior model
- `sourceDeviceId`
  - where the current image payload most recently came from
- `createdAt` / `updatedAt`
  - support auditing and copy feedback

## Name Normalization and Matching

This feature uses name-based linkage, so normalization rules must be explicit.

Normalization rule:

```text
1. cast to string
2. trim leading/trailing whitespace
3. collapse repeated internal whitespace to one space
4. compare case-insensitively
```

Effects:

- `天鹅` and ` 天鹅 ` are the same
- `Swan` and `swan` are the same

Display rule:

- UI shows the original `name`
- system logic uses `nameKey`

Current-device uniqueness rule:

- one device cannot hold two assets with the same `nameKey`

## Product/Device Linkage

The linkage model is intentionally simple:

- the product side exposes latte art option names
- the device side exposes latte art image asset names
- matching uses normalized names

If a product option name has a matching `nameKey` in the current device library:

- the option is considered materially configured for that device

If not:

- the option remains a valid product capability
- the device asset is considered missing

The first iteration should compare against the product-side canonical stored option name, not against a translated display label.

That avoids accidental linkage drift if the UI later gains more display-language behavior.

## Status Definitions

### Linked

A device latte art image is `已联动` when at least one product latte art option on the current device resolves to the same normalized name.

### Unreferenced

A device latte art image is `未引用` when no product latte art option currently resolves to the same normalized name.

### Missing Material

`缺失素材` counts product latte art option names that exist in the current device's product catalog but do not have a matching device library image asset.

This is a warning state, not a destructive state:

- the product option still exists
- the device just lacks the material asset

## Copy and Overwrite Rules

### Save to Current Device

When uploading or replacing on the current device:

- if no current-device `nameKey` match exists:
  - add a new item
- if a current-device `nameKey` match exists:
  - confirm
  - overwrite that item's image and timestamps

### Copy to Other Devices

For each target device:

- if target device has matching `nameKey`:
  - overwrite target image
  - preserve one item per name
- if target device does not have matching `nameKey`:
  - add a new item
- do not delete any other target-device assets
- do not rewrite unrelated names

This keeps the copy semantic focused and safe:

- same name means replace the material for that capability
- different name means add a new capability asset

## Rename and Delete Rules

### Rename

Rename is allowed, but it must be treated as changing the linkage key.

Before confirming a rename:

- validate current-device uniqueness on the new normalized name
- warn:
  - `重命名后，原先按旧名称联动的商品将不再匹配。`

### Delete

Delete is allowed for the current device asset.

Before confirming delete:

- warn:
  - `删除后，这台设备将不再具备名称为“天鹅”的拉花图片素材；商品侧同名拉花将视为未配置素材。`

Delete affects only:

- the current device library item

Delete does not affect:

- product option definitions
- other devices

## Failure and Edge Handling

The spec must explicitly handle these cases:

1. Corrupted local storage
   - if a stored device latte art library cannot be parsed, fall back to an empty library
   - never crash the page

2. Invalid file type
   - reject non-image uploads with clear validation feedback

3. Blank name after normalization
   - block save

4. Rename collision on current device
   - block rename before persistence

5. Partial copy failures
   - show per-device result rows
   - successful targets stay successful even if some targets fail

6. Product has latte art name, device has no image
   - count it under `缺失素材`
   - do not silently mutate product data

7. Device has image, product has no matching option
   - keep the image
   - mark it `未引用`

8. Current device overwrite confirmation cancelled
   - leave the original asset untouched

## Architecture Boundaries

Implementation should be decomposed into small, clear units instead of one giant device-detail handler.

### 1. Device Latte Art Storage

Responsibility:

- read and write the per-device library
- normalize stored shape
- recover safely from malformed local storage

Interface shape:

- `readDeviceLatteArtLibrary(deviceId)`
- `persistDeviceLatteArtLibrary(deviceId, library)`

### 2. Device Latte Art Name Matcher

Responsibility:

- normalize operator names
- compare names
- calculate current-device uniqueness
- calculate linkage status counts

Interface shape:

- `normalizeLatteArtName(name)`
- `findLatteArtByNameKey(library, nameKey)`
- `buildLatteArtLinkageStatus(deviceId, productsData, library)`

### 3. Device Latte Art Editor

Responsibility:

- upload modal state
- replace / rename / delete flows
- current-device overwrite confirmation

Interface shape:

- `openLatteArtUploadModal(...)`
- `saveLatteArtToCurrentDevice(...)`
- `renameLatteArtItem(...)`
- `deleteLatteArtItem(...)`

### 4. Device Latte Art Copy Coordinator

Responsibility:

- target device selection
- pre-check impact summary
- same-name overwrite vs add decision
- result summary

Interface shape:

- `openLatteArtCopyModal(savedItem)`
- `previewLatteArtCopyImpact(savedItem, targetDeviceIds)`
- `copyLatteArtToDevices(savedItem, targetDeviceIds)`

These boundaries keep the system understandable:

- storage knows persistence only
- matcher knows naming and linkage only
- editor knows current-device CRUD only
- copy coordinator knows cross-device propagation only

## Acceptance Criteria

1. Operators can open a `设备拉花图库` section from device detail and clearly see which device they are editing.
2. Operators can upload one image with a required name to the current device.
3. Uploading a same-name asset on the current device requires explicit overwrite confirmation.
4. After a successful save, the UI asks whether to copy the saved asset to other devices.
5. Operators can search and multi-select target devices using the familiar multi-device picker pattern.
6. Cross-device copy follows:
   - same name -> overwrite
   - different name -> add
   - unrelated names stay untouched
7. The UI reports copy results as overwritten, added, and failed targets.
8. Device latte art names link to product latte art options by normalized name.
9. The UI exposes `缺失素材` when product-side latte art names exist without matching device assets.
10. Rename and delete flows warn that names are linkage keys and can affect matching.
11. Switching devices shows each device's independent latte art library.
12. Malformed local storage or invalid image input does not crash the device detail experience.

## Testing Guidance

Planning and implementation should cover:

- static structure tests for the new device-detail section and modal entry points
- runtime tests for:
  - library read/write fallback
  - same-name overwrite on current device
  - copy add vs overwrite behavior across target devices
  - linkage status calculations
  - rename/delete warning flows
  - missing-material counts

Visual verification should confirm:

- the new section reads as a device asset area rather than a remote command panel
- upload -> save -> copy prompt feels like one continuous workflow
- target-device copy impact is understandable before the operator confirms

