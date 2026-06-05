# Recipe Config Main Editor Spec

## Background

The current target UI is the newer recipe configuration screen shown by the product team: `基本信息 / 配方配置 / 选项配置`, where recipe values are edited directly by cup type. This spec does not apply to the older `product-detail.html` implementation that opens a `配方调整` modal after selecting a spec option.

The current cup-card layout is clearer than the old modal, but the user still has to scan too much to answer the main operational question: what is the standard cup capacity, what is the current capacity, and whether the edited recipe is under or over the standard.

## Goal

Replace the three equally weighted editable cup cards with a main-editor layout:

- Left side: one focused editor for the selected cup type.
- Right side: cup switcher plus before/after comparison.
- Persistent bottom save bar summarizing changed cups and capacity mismatches.

The standard cup capacity must be a first-level signal, not a secondary gray meta label.

## Non-Goals

- Do not redesign `基本信息` or `选项配置`.
- Do not change recipe persistence keys or backend payload shape.
- Do not make `浓缩` editable on this screen.
- Do not reintroduce the old recipe adjustment modal.
- Do not add bulk import, factory reset for all cups, or associated-product sync in this change unless the current implementation already has those flows wired.

## Target Layout

### Page Header

Keep the existing top tabs and page-level save action:

```text
基本信息 | 配方配置 | 选项配置                         保存配方
```

The active tab remains `配方配置`.

### Main Content

Use a two-column layout on desktop:

- Left column: approximately 65-72% width.
- Right column: approximately 28-35% width.
- Gap: 20-24px.
- On narrow/mobile widths, stack right column below the editor.

### Left Column: Current Cup Editor

The editor title must identify the selected cup:

```text
热 约355ML
当前正在编辑热杯型成分，浓缩由配方文件维护
```

The top-right action restores only the selected cup:

```text
恢复热杯型修改前
```

The capacity summary must appear immediately below the recipe segment bar and use this order:

```text
标准杯量 355ml    当前容量 335ml    容量偏差 -20ml
```

Visual priority:

- `标准杯量 355ml` is the most visually prominent capacity value.
- `当前容量 335ml` is secondary.
- `容量偏差 -20ml` is warning-styled when non-zero.

The segment bar keeps the current ingredient color language:

- 浓缩: brown
- 奶 / 奶泡: cream/tan
- 热水: teal
- 冰: blue
- 糖浆: amber

Ingredient rows:

- `浓缩` is readonly.
- Editable rows use: ingredient name, adjustment hint, minus button, numeric input, unit, plus button.
- Default step is 5ml for liquid ingredients.
- If the existing UI supports press-and-hold stepping, preserve it.

Readonly espresso copy:

```text
基底咖啡数值由配方文件维护，不可在此修改。
```

### Right Column: Cup Switcher

The cup switcher lists every cup type. Each item shows:

```text
热 约355ML        已修改
标准 355ml / 当前 335ml / 少 20ml

标准冰 约473ML    未修改
标准 473ml / 当前 345ml / 冰 100g

少冰 约473ML      未修改
标准 473ml / 当前 345ml / 冰 70g
```

Rules:

- Clicking a cup switches the selected cup in the left editor.
- Switching cups must not discard unsaved edits.
- The selected cup item is highlighted.
- A cup becomes `已修改` when any editable ingredient differs from its original value.
- A cup remains `未修改` when all editable ingredients match its original value.
- If a cup has a capacity mismatch, show the mismatch in the second line.

### Right Column: Before/After Comparison

The comparison panel shows only the selected cup.

When the selected cup has changes:

```text
修改前 355ml
修改后 335ml

热水 60ml -> 30ml
容量总量 355ml -> 335ml
```

When the selected cup has no changes:

```text
当前杯型暂无修改
```

The comparison panel should not list every unchanged ingredient.

### Bottom Save Bar

Use a sticky bottom save bar inside the recipe configuration page:

```text
已修改 1 个杯型。热杯型容量低于标准杯量 20ml。          保存配方
```

No mismatch:

```text
已修改 1 个杯型。所有已修改杯型容量符合标准杯量。
```

Multiple mismatches:

```text
已修改 3 个杯型。2 个杯型容量与标准杯量不一致。
```

No changes:

```text
暂无配方修改。
```

## Data Model Requirements

The implementation may use the current page's existing model, but it must be able to derive these fields per cup:

```js
{
  key: 'hot_355',
  label: '热 约355ML',
  standardCapacityMl: 355,
  currentCapacityMl: 335,
  originalCapacityMl: 355,
  changed: true,
  mismatchMl: -20,
  ingredients: [
    { key: 'espresso', label: '浓缩', value: 80, unit: 'ml', editable: false },
    { key: 'milk', label: '奶', value: 180, unit: 'ml', editable: true, step: 5 },
    { key: 'foam', label: '奶泡', value: 20, unit: 'ml', editable: true, step: 5 },
    { key: 'hotWater', label: '热水', value: 30, unit: 'ml', editable: true, step: 5 },
    { key: 'syrup', label: '糖浆', value: 25, unit: 'ml', editable: true, step: 5 }
  ],
  originalIngredients: [
    { key: 'espresso', value: 80 },
    { key: 'milk', value: 180 },
    { key: 'foam', value: 20 },
    { key: 'hotWater', value: 60 },
    { key: 'syrup', value: 25 }
  ],
  otherIngredients: [
    { key: 'ice', label: '冰', value: 0, unit: 'g' }
  ]
}
```

Capacity calculation:

- `currentCapacityMl` is the sum of current ingredients whose unit is `ml`.
- `standardCapacityMl` is the displayed standard cup capacity.
- `mismatchMl = currentCapacityMl - standardCapacityMl`.
- Ingredients measured in `g` do not add to `currentCapacityMl`.

## Interaction Requirements

- Minus cannot reduce an ingredient below 0.
- Manual numeric input should normalize invalid, blank, or negative values to 0 on blur.
- Values should remain integers.
- Restoring the current cup resets only the selected cup to its original values.
- Save persists all edited cups using the existing save flow.
- Save should not be blocked by capacity mismatch, but the mismatch must remain visible before saving.

## Visual Acceptance Criteria

- On first load, the user can see the selected cup's standard capacity without reading small gray metadata.
- The standard capacity appears before current capacity in the main editor.
- The right cup switcher shows standard capacity for every cup.
- The bottom bar summarizes capacity mismatch in plain language.
- There are no nested cards inside the main editor; repeated panels can be cards, but the page should not become card-heavy.
- Text must not overflow controls at desktop width 1440px or mobile width 390px.

## Test Acceptance Criteria

Add focused regression tests for:

- The old recipe modal trigger is not required for the new cup editor UI.
- The new UI contains a main editor, cup switcher, comparison panel, sticky save bar, and prominent standard cup capacity labels.
- The standard capacity label appears before current capacity in the main editor markup.
- The capacity helper functions calculate `currentCapacityMl`, `mismatchMl`, changed cups, and save-bar copy correctly.
- Espresso is rendered or modeled as readonly.
- Restoring a cup affects only the selected cup.

## Reference Mockup

Reference file:

`docs/superpowers/mockups/2026-06-02-recipe-config-preview.html`

Use `方案 B：主编辑 + 对比` as the visual reference. Do not implement方案 A or方案 C.
