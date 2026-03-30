# Menu Management Multilingual Business Tags Design

**Date:** 2026-03-30

## Goal

Upgrade 商品管理的业务标签能力 so tags are managed as a multilingual global library, with the management entry moved into `基本设置`, while products can still bind, order, and quickly create tags during editing.

## Scope

- Add a global `业务标签管理` module inside `商品管理 > 基本设置`.
- Make business tag names multilingual.
- Use the current device's enabled languages to determine which language inputs are shown when creating or editing a tag.
- Require the current device primary language name for every tag.
- Let product editing pages:
  - choose enabled tags
  - reorder selected tags
  - create a new tag inline and write it back to the global tag library
- Support `隐藏 / 恢复` for tags.
- Hidden tags must immediately disappear from:
  - 菜单管理商品卡
  - 商品详情
  - 点单屏商品卡
  - 点单屏商品详情
- Keep the `基本设置` tag summary visually compact and only show two summary stats:
  - `启用中`
  - `已隐藏`

## Non-Goals

- No hard delete for tags.
- No tag-based top statistics.
- No tag-based filtering in 商品管理.
- No changes to tag participation in pricing, recipes, default options, or on-sale logic.
- No forced full migration that removes old `featured` data from stored products in this iteration.

## Source Parity Reference

The existing behavior and data shape currently live across:

- `/Users/mac/Documents/New project 4/menu-management.html`
- `/Users/mac/Documents/New project 4/product-detail.html`
- `/Users/mac/Documents/New project 4/shared/admin-mock-data.js`

This design keeps the existing business-tag data direction, but changes the management entry, multilingual editing flow, and hidden-tag behavior.

## Current Problem

The codebase already has a partial business-tag model:

- a global default tag library in shared mock data
- product-level `businessTagIds`
- compatibility fallback from `featured` to `tag_signature`

But the operator experience is incomplete:

- tag management is not anchored in `基本设置`
- tag creation and editing are not aligned with the device language model
- the settings page does not provide a clean global-library workflow
- hidden-tag semantics are not explicit enough for operators

The new requirement is to make tags truly multilingual and manageable from `基本设置`, while still allowing fast product-level tagging.

## Product Direction

The feature should behave like a global dictionary with product bindings:

- `基本设置` owns the tag library
- product editing owns which tags a product uses and in what order

Operators should not have to leave product editing to create a missing tag, but product pages should not become the source of truth for the global tag library.

## UX Design

### A. 基本设置入口

Inside `商品管理 > 基本设置`, add a compact `业务标签管理` summary card.

The summary card should contain:

- title: `业务标签管理`
- one short description line
- two summary stats only:
  - `启用中 {N}`
  - `已隐藏 {N}`
- one primary action:
  - `管理标签`

The summary card must stay visually short. It should not inline-expand the full tag list inside the settings page.

### B. 标签管理二级层

Clicking `管理标签` opens a right-side drawer.

This secondary layer contains:

- enabled tag list
- hidden tag list
- actions:
  - `新建标签`
  - `编辑`
  - `隐藏`
  - `恢复`

No `删除` action is provided.

### C. 商品页打标签

In product editing, the `业务标签` section becomes interactive instead of a static hint.

It should support:

- showing currently selected tags
- reordering selected tags
- selecting from enabled tags
- inline `新建标签`

The product page remains lightweight:

- it does not become the main place to browse the full global library history
- it only supports binding and quick creation

### D. Hidden Tag Semantics

Tags can only be `active` or `hidden`.

When a tag is hidden:

- it is not available for new selection
- it stops rendering everywhere in product-management and order-preview UI
- existing product bindings remain in stored data

When a tag is restored:

- products that still have that tag ID in `businessTagIds` show it again automatically

This makes hidden tags reversible without destructive data cleanup.

## Multilingual Editing Rules

### Language Source

Tag create/edit forms use the current device's enabled languages as the visible language fields.

The source of truth is the same device-language configuration already used by 商品管理, resolved from the currently selected device context.

In implementation terms, all tag forms must use the same shared language provider as the rest of 商品管理, equivalent to:

```js
getDeviceLangs(currentDevice)
```

The product detail page must consume the same device context passed from 商品管理 rather than independently deciding which languages to show.

Examples:

- if the current device has `zh / en`, show those two inputs
- if the current device has `zh / en / jp`, show those three inputs

Device-language config validity:

- normalize the device enabled-language list to unique non-empty language codes first
- a valid tag-edit language context requires:
  - at least one enabled language after normalization
  - one non-empty primary language code
  - the primary language code must exist in the enabled-language list
- if the current device language config is invalid:
  - `基本设置` tag create/edit actions enter a blocking config-error state instead of an editable form
  - product editing may still select and reorder existing active tags, but inline `新建标签` is disabled
  - any attempted create/edit save must fail before persistence with validation feedback
  - do not silently fall back to `zh` or `en` for edit requirements
  - display surfaces may still render existing tags through the normal label fallback order

### Required vs Optional

- the current device primary language is required
- other currently enabled languages are optional

Edit rule:

- when editing an existing tag from a device view, the current device primary-language field must be non-empty at save time
- existing translations for languages not shown in the current device view remain untouched
- if a tag was originally created from another device with a different primary language, editing it from the current device may require filling the current device primary-language field before save
- if the device language config is invalid, the form stays non-editable and returns a validation error rather than attempting any save

### Preserving Existing Translations

If a tag already has translations for languages not currently enabled on the device:

- those translations stay stored
- they are not deleted when editing from another device view

### Fallback Display Order

When rendering a tag label in UI:

1. the surface's active display language
2. `zh`
3. `en`
4. `tag id`

This avoids blank chips when a translation is missing.

Active display language source:

- 菜单管理 / 商品详情 use the current 商品管理 language context
- 点单屏商品卡 / 点单屏商品详情 use the current point-order preview language context

## Product Binding Rules

Products continue to store only tag IDs:

```js
businessTagIds: ['tag_recommend', 'tag_new']
```

Rules:

- array order is the display order
- the product page can add and remove IDs
- the product page can reorder IDs
- saving a new inline-created tag both:
  - adds a record to the global tag library
  - automatically appends the new active tag ID to the end of the current product's visible active tag list
- if a product already contains hidden tag IDs, normal product saves must preserve those hidden IDs

Hidden-ID merge contract:

- visible active IDs are the only IDs shown in normal product tag editing
- hidden IDs remain stored but invisible
- unknown existing stored IDs remain preserved after hidden IDs, in their previous relative order
- edited visible IDs are normalized to unique known active IDs only
- duplicate edited IDs are collapsed to first occurrence
- unknown edited IDs are discarded
- new active IDs selected by the operator are inserted into the visible ordered set
- active IDs removed by the operator are removed from stored `businessTagIds`
- when the operator reorders visible active IDs, the stored result is:
  - reordered active IDs first, in the user-selected order
  - preserved hidden IDs appended after the active IDs, in their previous relative order
  - preserved unknown existing IDs appended after hidden IDs, in their previous relative order

Example:

```js
stored before: ['tag_hidden_a', 'tag_recommend', 'tag_hidden_b', 'tag_new']
visible editor: ['tag_recommend', 'tag_new']
user reorder:   ['tag_new', 'tag_recommend']
stored after:  ['tag_new', 'tag_recommend', 'tag_hidden_a', 'tag_hidden_b']
```

Explicit removal of hidden tag IDs from a product is out of scope for this iteration.

## Data Model

### Global Tag Library

The global tag library remains a separate store, keyed by tag ID.

Each tag contains:

- `id`
- `names`
- `status`

Required canonical shape:

```js
{
  tag_recommend: {
    id: 'tag_recommend',
    names: {
      zh: '推荐',
      en: 'Recommended',
      jp: 'おすすめ'
    },
    status: 'active'
  }
}
```

Rules:

- the library is stored as an object map keyed by tag ID
- `status` must be one of `active` or `hidden`
- legacy `disabled` values normalize to `hidden`
- unknown status values normalize to `active`
- tag IDs are system-generated, not manually entered by operators

### Tag ID Contract

New tags use generated IDs in the form:

```js
tag_<slug>
```

Generation rules:

- derive the slug from the primary-language label entered at creation time
- normalize to lowercase ASCII with underscores
- strip unsupported characters
- if normalization produces an empty slug, use `custom`
- if the generated ID already exists, append a numeric suffix until unique

The exact transliteration helper may vary, but the stored ID format and uniqueness requirement are mandatory.

ID generation ownership:

- only `generateBusinessTagId(primaryLabel, existingLibrary)` may create a new tag ID
- `upsertBusinessTag(...)` never generates IDs internally
- on create, the caller generates the ID first and passes it into `upsertBusinessTag(...)`
- on edit, the existing ID is reused unchanged

### Product Data

Products continue using:

- `businessTagIds: string[]`

No second ordering field is added.

## Architecture Boundaries

To avoid inconsistent hidden-tag and label-fallback behavior, the implementation should centralize tag resolution logic.

Required shared responsibilities:

- `resolveTagLabel(tag, lang)`
  - applies the documented fallback order
- `isTagRenderable(tag)`
  - returns `true` only for active tags
- `getRenderableProductTags(product, library, lang)`
  - resolves ordered active tags for any render surface
- `mergeProductTagIds(existingIds, editedVisibleIds, library)`
  - preserves hidden IDs correctly during product save
- `generateBusinessTagId(primaryLabel, library)`
  - generates the unique canonical ID for new tags
- `upsertBusinessTag(existingTag, tagId, visibleLangPatch, status)`
  - creates or updates canonical tag records
- `TagProductSaveCoordinator.commit(...)`
  - coordinates atomic-or-rollback persistence for inline tag create plus product binding save

Canonical interface contracts:

```ts
resolveTagLabel(tag: TagRecord, displayLang: string): string
isTagRenderable(tag: TagRecord): boolean
getRenderableProductTags(product: ProductRecord, library: TagLibrary, displayLang: string): TagRecord[]
mergeProductTagIds(existingIds: string[], editedVisibleIds: string[], library: TagLibrary): string[]
generateBusinessTagId(primaryLabel: string, library: TagLibrary): string
upsertBusinessTag(existing: TagRecord | null, tagId: string, visibleLangPatch: Record<string, string>, status: 'active' | 'hidden'): TagRecord
TagProductSaveCoordinator.commit(input: {
  previousLibrary: TagLibrary
  nextLibrary: TagLibrary
  previousProduct: ProductRecord
  nextProduct: ProductRecord
}): SaveResult
```

Naming rule:

- `TagProductSaveCoordinator.commit(...)` is the only allowed save-coordinator boundary name in this iteration
- do not introduce a second alias such as `commitTagAndProductSave(...)`

`upsertBusinessTag` merge rules:

- preserve unseen-language translations already stored on the tag
- overwrite only the language fields visible and edited in the current form
- blank visible values remove only that visible language field when the field is optional
- blank primary-language value is rejected by validation and cannot be saved

All render surfaces must rely on the same tag-resolution pipeline:

- 菜单管理商品卡
- 商品详情
- 点单屏商品卡
- 点单屏商品详情

## Data Flow

### 基本设置 → 标签库

The `基本设置` management layer is the primary editor for:

- creating tags
- editing multilingual tag names
- hiding tags
- restoring tags

Saving these actions updates the global tag library store.

### 商品编辑 → 标签绑定

The product page edits:

- selected tag IDs
- selected tag order

If the operator creates a new tag inline from the product page:

- the new tag is written into the global tag library
- the new tag is automatically appended to the end of the product's visible active tag order

For the operator, this remains a single save flow.

## Save Behavior

### 基本设置保存

Tag-library changes made from `基本设置` are saved together with other settings changes via the existing `保存基础设置` flow.

Failure behavior for `基本设置` save:

- if tag-library validation fails, no settings changes are persisted
- if persistence fails, restore the pre-save settings snapshot and pre-save tag-library snapshot
- keep the management drawer open
- show one retryable save error

### 商品保存

Tag-binding changes made during product editing are saved together with the rest of the product edits.

Inline-created tags from product editing are part of that same save action. The implementation may write to both the tag library and product data internally, but the UI should present one product save action, not two separate saves.

Dual-write save rules:

- create or update the draft tag record in memory first
- stage the updated product `businessTagIds` second
- persist both changes as one logical save from the user perspective

Failure behavior:

- if tag validation fails, do not update the product binding
- writes must use an atomic-or-rollback contract:
  - stage both previous snapshots in memory first
  - route persistence through one save coordinator interface
  - attempt to persist tag library and product binding as one logical transaction
  - if either write fails, restore both in-memory snapshots and persisted snapshots before surfacing the error
- if the combined product save fails, do not expose a tag-library-only success state in the visible UI
- after a failed save, keep the draft open and show one retryable error
- the user must not see a newly created tag as committed if the product binding save did not also succeed

`SaveResult` contract:

```ts
type SaveResult =
  | { ok: true; status: 'committed' }
  | { ok: false; status: 'validation_failed'; retryable: true }
  | { ok: false; status: 'rolled_back'; retryable: true }
  | { ok: false; status: 'partial_rollback_failure'; retryable: false }
```

UI handling:

- `committed`
  - close the draft and show success
- `validation_failed`
  - keep the draft open and show validation feedback
- `rolled_back`
  - keep the draft open and show retryable save error
- `partial_rollback_failure`
  - keep the draft open in a blocked state
  - show a blocking error explaining that save state may be inconsistent and the current draft can no longer be trusted
  - disable save, retry, inline tag create, and further field editing in that draft session
  - provide one explicit recovery path only:
    - refresh the page or close and reopen the current drawer/modal to reload canonical data from storage
  - after recovery, the UI must re-read both the product snapshot and tag-library snapshot before allowing edits again
  - do not show success toast, committed tag chips, or any tag-library-only success state before recovery

## Display Rules

### 菜单管理商品卡

- show up to 2 active tags
- if more than 2 active tags exist, show `+N`
- hidden tags are ignored

### 商品详情

- show all active selected tags
- preserve the selected order from `businessTagIds`

### 点单屏商品卡

- show up to 2 active tags
- do not show `+N`
- hidden tags are ignored

### 点单屏商品详情

- show all active selected tags
- hidden tags are ignored

## Compatibility

Current code already supports:

- `defaultBusinessTags`
- `businessTagIds`
- fallback from `featured` to `tag_signature`

This iteration should keep compatibility rather than forcing a hard migration.

Rules:

- products with explicit `businessTagIds` continue to use them
- products without explicit `businessTagIds` may still derive `['tag_signature']` from `featured === true`
- new editing flows should write `businessTagIds`
- `featured` remains ignored by new UI except for compatibility fallback

First-save materialization rule:

- if a product is saved through a new edit flow with `featured === true` and no explicit `businessTagIds`, the save flow must materialize `businessTagIds = ['tag_signature']` before persistence
- after that first save, explicit `businessTagIds` becomes the only source of truth for tag rendering

This keeps old data stable while moving all new operations onto the tag library plus ID binding model.

## Validation

At minimum:

- tag ID must be non-empty and unique when a new tag is created
- tag ID generation is automatic and collisions must be resolved before save
- primary-language label must be non-empty
- invalid device primary-language config blocks tag create/edit save before any persistence attempt
- only active tags can be selected in product editing
- hidden tags cannot be newly selected
- product save preserves selected tag order exactly

## Testing

### Unit / Runtime Coverage

- tag library normalization
- legacy `disabled` to `hidden` compatibility normalization
- empty-slug tag ID fallback to `tag_custom` with uniqueness suffixing
- multilingual label fallback order
- hidden tag filtering for all display helpers
- compatibility fallback from `featured` to `tag_signature`
- product tag order persistence
- hidden-ID merge behavior during visible-tag reorder
- unknown existing tag ID preservation during product save
- invalid device-language config produces validation failure with no writes
- `partial_rollback_failure` enters blocked recovery state and forbids a second save attempt from the stale draft

### Flow Coverage

- `基本设置` summary card shows only `启用中` and `已隐藏`
- clicking `管理标签` opens the full tag-management layer
- creating a tag from `基本设置` uses current device enabled languages
- product-detail tag forms use the same current-device language set as 商品管理
- creating a tag from product editing writes back to the global library
- inline-created tags append to the end of the visible active tag order for the current product
- hiding a tag removes it from all already-bound products in every visible UI
- restoring a hidden tag makes old bindings visible again
- product page only offers active tags for selection
- `featured` compatibility products still render the fallback tag where applicable
- `基本设置` save failure restores the previous tag-library state
- invalid device language config blocks tag create/edit but still allows existing-tag selection and display fallback
- if a tag is hidden or restored while a product edit drawer is already open, the next render/save path re-resolves the current library state before commit

## Verification

Manual verification should confirm:

- the settings card stays compact and does not stretch the page vertically
- the settings card shows only two summary stats
- tag edit forms follow current device enabled languages
- inline product tag creation writes to the shared tag library
- hidden tags disappear from:
  - 菜单管理商品卡
  - 商品详情
  - 点单屏商品卡
  - 点单屏商品详情
- restoring a hidden tag restores existing product displays without rebinding
