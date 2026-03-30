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

Clicking `管理标签` opens a secondary layer such as a drawer or modal.

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

Examples:

- if the current device has `zh / en`, show those two inputs
- if the current device has `zh / en / jp`, show those three inputs

### Required vs Optional

- the current device primary language is required
- other currently enabled languages are optional

### Preserving Existing Translations

If a tag already has translations for languages not currently enabled on the device:

- those translations stay stored
- they are not deleted when editing from another device view

### Fallback Display Order

When rendering a tag label in UI:

1. current language
2. `zh`
3. `en`
4. `tag id`

This avoids blank chips when a translation is missing.

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
  - appends or selects the tag for the current product

## Data Model

### Global Tag Library

The global tag library remains a separate store, keyed by tag ID.

Each tag contains:

- `id`
- `names`
- `status`

Recommended normalized shape:

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

### Product Data

Products continue using:

- `businessTagIds: string[]`

No second ordering field is added.

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
- the new tag is added to the product's `businessTagIds`

For the operator, this remains a single save flow.

## Save Behavior

### 基本设置保存

Tag-library changes made from `基本设置` are saved together with other settings changes via the existing `保存基础设置` flow.

### 商品保存

Tag-binding changes made during product editing are saved together with the rest of the product edits.

Inline-created tags from product editing are part of that same save action. The implementation may write to both the tag library and product data internally, but the UI should present one product save action, not two separate saves.

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

This keeps old data stable while moving all new operations onto the tag library plus ID binding model.

## Validation

At minimum:

- tag ID must be non-empty and unique when a new tag is created
- primary-language label must be non-empty
- only active tags can be selected in product editing
- hidden tags cannot be newly selected
- product save preserves selected tag order exactly

## Testing

### Unit / Runtime Coverage

- tag library normalization
- multilingual label fallback order
- hidden tag filtering for all display helpers
- compatibility fallback from `featured` to `tag_signature`
- product tag order persistence

### Flow Coverage

- `基本设置` summary card shows only `启用中` and `已隐藏`
- clicking `管理标签` opens the full tag-management layer
- creating a tag from `基本设置` uses current device enabled languages
- creating a tag from product editing writes back to the global library
- hiding a tag removes it from all already-bound products in every visible UI
- restoring a hidden tag makes old bindings visible again
- product page only offers active tags for selection
- `featured` compatibility products still render the fallback tag where applicable

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
