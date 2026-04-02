# Device Ad Screen Left Right Upload Design

**Date:** 2026-04-02

## Goal

Update the device detail entry-edit flow in [devices.html](/Users/mac/Documents/New%20project%204/devices.html) so ad-screen assets are no longer managed as one mixed bucket.

The approved direction is:

- keep the existing `编辑入场信息` modal
- replace the current single `显示器画面` upload area with left/right grouped management
- manage only two fixed groups:
  - `左侧菜单`
  - `右侧排队号背景`
- each group keeps only one current asset
- uploading a new asset replaces the current one for that side

## Background

The current device detail flow treats ad-screen content as a single image group. That no longer matches the actual business requirement for 32-inch and 27-inch menu screens.

The new business rule is:

- left side is the menu area
- right side is the queue-number background area
- the two sides have different asset rules

If the product keeps storing and presenting them as one mixed list, operators cannot reliably tell:

- which asset belongs to which side
- what format is allowed on each side
- what will be replaced when they upload new content

## Approved Business Rules

### Left Side Menu

- resolution target: `1320 × 1080`
- allowed static formats: `jpg`, `png`
- allowed dynamic format: `mp4`
- video codec requirement: `H.264`
- recommended video duration: no more than `4 minutes`

### Right Queue Background

- resolution target: `800 × 1080`
- allowed formats: `jpg`, `png`
- right side is business-defined as non-white background content
- this phase does **not** implement automatic white-background detection
- the constraint is shown as operator guidance only

## Design Principles

### Principle 1: The UI must match the physical screen split

The screen is physically left/right. The edit and detail surfaces should use the same left/right model.

### Principle 2: One side, one current asset

This phase does not introduce playlists, asset history, multiple active candidates, or scheduling.

Each side has exactly one current asset. Uploading a new asset replaces the previous one for that side.

### Principle 3: Keep the workflow lightweight

The user approved keeping ad-screen editing inside the existing `编辑入场信息` modal instead of creating:

- a second-level modal
- a dedicated page
- a dedicated tab flow

### Principle 4: Validation should block only hard violations

Format and codec violations are hard violations.

Resolution mismatches remain strong warnings instead of hard blockers in this phase.

## Non-Goals

This design does not include:

- asset history
- version rollback
- multi-asset selection
- rotation or playlist behavior
- independent ad-screen management page
- automatic white-background image detection
- real backend file upload redesign

## Final UX Structure

## Entry Edit Modal

Keep the current modal shell and replace the current single ad-screen upload area with a new section:

```text
广告屏设置
  左侧菜单
    当前素材预览
    上传图片
    上传视频
    规则说明

  右侧排队号背景
    当前素材预览
    上传图片
    规则说明
```

### Desktop Layout

- render the ad-screen section as two side-by-side cards
- left card = `左侧菜单`
- right card = `右侧排队号背景`

### Mobile Layout

- collapse to vertical stacking
- left card first
- right card second

### Per-Card Content

Each card contains:

- section title
- size and format guidance
- current asset preview
- upload actions
- replacement hint such as `上传新文件即覆盖当前素材`

### Left Card Actions

- `上传图片`
- `上传视频`

### Right Card Actions

- `上传图片`

## Device Detail Display

The `广告屏信息` section in device detail should also be split into two fixed groups:

- `左侧菜单`
- `右侧排队号背景`

Each group displays:

- current asset preview
- asset type
- file name when available
- update time when available

If a side has no current asset:

- display `暂无素材`

The detail view should no longer present one mixed `广告屏画面` gallery that merges both sides together.

## Data Model

Store ad-screen data under `device.entryInfo.adScreen`.

Approved structure:

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

### Storage Rules

- `leftMenu` and `rightQueueBackground` are single objects, not arrays
- each side is edited independently in modal draft state
- saving writes the whole `adScreen` object back into `entryInfo`
- canceling discards unsaved left/right draft changes

## Backward Compatibility

Existing prototype data may still contain the old `displayImageUrls` structure.

Approved compatibility behavior:

- if `entryInfo.adScreen` exists, use it as the source of truth
- if `entryInfo.adScreen` does not exist but `displayImageUrls` exists:
  - map the legacy content into `leftMenu`
  - leave `rightQueueBackground` empty
- once the new modal is saved, persist only the new `adScreen` structure

This keeps old prototype data viewable while moving the product to the new model.

## Validation Rules

### Left Side Menu Validation

Hard-block rules:

- asset must be `jpg`, `png`, or `mp4`
- if the asset is video, codec must be `H.264`

Warning-only rules:

- recommend `1320 × 1080`
- recommend video duration not more than `4 minutes`

### Right Side Queue Background Validation

Hard-block rules:

- asset must be `jpg` or `png`

Warning-only rules:

- recommend `800 × 1080`
- show guidance that right-side content should not use a white background
- do not auto-detect or auto-block white-background images in this phase

## Error and Guidance Copy

Recommended copy:

- left format error: `左侧菜单仅支持 jpg、png、mp4(H.264)`
- left codec error: `左侧菜单视频仅支持 H.264 编码`
- left duration warning: `左侧菜单视频时长建议不超过 4 分钟`
- left size warning: `建议上传 1320×1080 的左侧菜单素材`
- right format error: `右侧排队号背景仅支持 jpg、png`
- right size warning: `建议上传 800×1080 的右侧背景图`
- right guidance: `请避免上传白色背景图`

## Draft and Save Behavior

### Replace Semantics

Uploading a file to one side:

- replaces only that side's current draft asset
- does not affect the other side

### Save Semantics

On save:

- modal draft becomes `entryInfo.adScreen`
- detail view refreshes to reflect left/right grouped content

### Cancel Semantics

On cancel:

- discard all draft changes for both sides

## Testing Impact

Update the entry-detail coverage in [tests/devices.entry-detail.test.js](/Users/mac/Documents/New%20project%204/tests/devices.entry-detail.test.js).

Minimum assertions:

- the edit modal no longer depends only on `displayImageUrls`
- the modal contains two explicit ad-screen groups
- left side supports image and video actions
- right side supports image action only
- save writes `entryInfo.adScreen.leftMenu`
- save writes `entryInfo.adScreen.rightQueueBackground`
- detail view renders left and right groups separately
- legacy `displayImageUrls` data still renders through the compatibility mapping

## Implementation Boundary

This phase should remain tightly scoped:

- update UI grouping
- update draft/save structure
- update compatibility read path
- update detail rendering
- update tests

This phase should not expand into:

- advanced media workflow
- content scheduling
- automated content review
- backend architecture changes

## Final Approved Direction

The approved design is:

- `方案 A`
- keep ad-screen editing inside the current entry-edit modal
- show left and right side by side on desktop
- stack them vertically on mobile
- each side has one current asset only
- upload replaces the current asset for that side
- no automatic white-background detection in this phase
