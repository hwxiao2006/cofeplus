# Recipe Config Main Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the product recipe configuration screen into the方案 B main-editor layout, making standard cup capacity prominent and keeping cup switching plus before/after comparison clear.

**Architecture:** Keep the feature self-contained in the product detail page unless the current implementation already has a recipe module. Add small pure helper functions for capacity math and summary copy so behavior can be VM-tested without browser automation. Preserve the existing persistence/save flow and only change the recipe configuration presentation and local editing state.

**Tech Stack:** Root HTML with inline CSS and vanilla JavaScript, Node built-in test runner, `assert`, `fs`, `vm`, local no-cache HTTP server for manual QA.

---

## Preconditions

This plan targets the newer direct cup-ingredient recipe screen shown in the design discussion, not the old `配方调整` modal implementation.

Before implementation, run:

```bash
rg -n "直接调整各杯型成分|热 约355ML|标准冰 约473ML|少冰 约473ML|恢复修改前|容量总量|标准杯量" product-detail.html
```

Expected in the correct source version: at least one match for the direct cup editor UI.

If this command only finds the old modal UI, stop and sync the branch or source file that contains the screenshot version. Do not retrofit this plan onto the old modal.

## Files

- Modify: `product-detail.html`
  - Replace the current equal-weight cup-card recipe layout with the main-editor layout.
  - Add CSS for the two-column editor, standard capacity emphasis, cup switcher, comparison panel, and bottom save bar.
  - Add or adapt helper functions for cup selection, capacity calculation, changed state, comparison rows, restore-current-cup, and save-bar copy.
- Create: `tests/product-detail.recipe-main-editor.test.js`
  - Structure tests for required UI landmarks and standard-capacity ordering.
  - VM tests for capacity and summary helper functions.
- Reference only: `docs/superpowers/mockups/2026-06-02-recipe-config-preview.html`
  - Use方案 B as visual reference.
- Reference only: `docs/plans/2026-06-02-recipe-config-main-editor-spec.md`
  - Product spec and acceptance criteria.

## Task 1: Add Failing Structure Tests

**Files:**
- Create: `tests/product-detail.recipe-main-editor.test.js`
- Read: `product-detail.html`

- [ ] **Step 1: Create the test file with structure assertions**

Create `tests/product-detail.recipe-main-editor.test.js`:

```js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'product-detail.html');
const html = fs.readFileSync(filePath, 'utf8');

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

test('配方配置应使用主编辑加右侧对比布局', () => {
  assert.ok(html.includes('id="recipeMainEditor"'), 'missing main editor');
  assert.ok(html.includes('id="recipeCupSwitcher"'), 'missing cup switcher');
  assert.ok(html.includes('id="recipeChangeComparePanel"'), 'missing comparison panel');
  assert.ok(html.includes('id="recipeStickySaveBar"'), 'missing sticky save bar');
});

test('标准杯量应是主编辑区的一层信息并先于当前容量出现', () => {
  const mainEditorIndex = html.indexOf('id="recipeMainEditor"');
  assert.notStrictEqual(mainEditorIndex, -1, 'main editor missing');

  const standardIndex = html.indexOf('标准杯量', mainEditorIndex);
  const currentIndex = html.indexOf('当前容量', mainEditorIndex);

  assert.notStrictEqual(standardIndex, -1, 'standard capacity label missing');
  assert.notStrictEqual(currentIndex, -1, 'current capacity label missing');
  assert.ok(standardIndex < currentIndex, 'standard capacity should appear before current capacity');
  assert.ok(/recipe-standard-capacity-card|recipe-capacity-standard/.test(html), 'standard capacity should have prominent class');
});

test('配方配置应显示杯型切换和当前杯型恢复入口', () => {
  assert.ok(html.includes('热 约355ML'));
  assert.ok(html.includes('标准冰 约473ML'));
  assert.ok(html.includes('少冰 约473ML'));
  assert.ok(html.includes('恢复当前杯型修改前') || html.includes('恢复热杯型修改前'));
});

test('浓缩应保持只读说明', () => {
  assert.ok(html.includes('基底咖啡数值由配方文件维护，不可在此修改'));
});

test('旧版修改配方弹窗不应作为新版杯型成分编辑的主入口', () => {
  const recipePanelIndex = html.indexOf('id="productDetailRecipePanel"');
  assert.notStrictEqual(recipePanelIndex, -1, 'recipe panel missing');
  const panelSlice = html.slice(recipePanelIndex, recipePanelIndex + 8000);
  assert.ok(!panelSlice.includes('openRecipeEditorForActiveSpec()'), 'old modal trigger should not be the main recipe edit entry');
});
```

- [ ] **Step 2: Run the test and verify it fails before implementation**

Run:

```bash
node --test tests/product-detail.recipe-main-editor.test.js
```

Expected before implementation:

```text
not ok
missing main editor
```

The exact failing assertion may differ if the current source already contains partial work, but at least one assertion should fail before the implementation.

- [ ] **Step 3: Commit the failing test**

```bash
git add tests/product-detail.recipe-main-editor.test.js
git commit -m "test(product): cover recipe main editor layout"
```

## Task 2: Add Capacity Helper Tests

**Files:**
- Modify: `tests/product-detail.recipe-main-editor.test.js`
- Modify later: `product-detail.html`

- [ ] **Step 1: Append VM helper extraction to the test file**

Append this code to `tests/product-detail.recipe-main-editor.test.js`:

```js
const vm = require('vm');

function extractFunctionSource(name) {
  const marker = `function ${name}(`;
  const start = html.indexOf(marker);
  if (start === -1) {
    throw new Error(`未找到函数 ${name}`);
  }

  const bodyStart = html.indexOf('{', start);
  let depth = 0;
  for (let index = bodyStart; index < html.length; index += 1) {
    const char = html[index];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return html.slice(start, index + 1);
      }
    }
  }
  throw new Error(`函数 ${name} 未正常结束`);
}

function createRecipeRuntime() {
  const context = { console };
  vm.createContext(context);
  [
    'cloneRecipeCupConfig',
    'calculateRecipeCupCapacity',
    'getRecipeCupMismatch',
    'isRecipeCupChanged',
    'getRecipeChangedCups',
    'buildRecipeSaveBarMessage',
    'restoreRecipeCupValues'
  ].forEach((name) => {
    vm.runInContext(extractFunctionSource(name), context);
  });
  return context;
}

function createSampleCups() {
  return [
    {
      key: 'hot_355',
      label: '热 约355ML',
      standardCapacityMl: 355,
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
      otherIngredients: []
    },
    {
      key: 'iced_473',
      label: '标准冰 约473ML',
      standardCapacityMl: 473,
      ingredients: [
        { key: 'espresso', label: '浓缩', value: 80, unit: 'ml', editable: false },
        { key: 'milk', label: '奶', value: 180, unit: 'ml', editable: true, step: 5 },
        { key: 'hotWater', label: '热水', value: 60, unit: 'ml', editable: true, step: 5 },
        { key: 'syrup', label: '糖浆', value: 25, unit: 'ml', editable: true, step: 5 },
        { key: 'ice', label: '冰', value: 100, unit: 'g', editable: false }
      ],
      originalIngredients: [
        { key: 'espresso', value: 80 },
        { key: 'milk', value: 180 },
        { key: 'hotWater', value: 60 },
        { key: 'syrup', value: 25 },
        { key: 'ice', value: 100 }
      ],
      otherIngredients: [{ key: 'ice', label: '冰', value: 100, unit: 'g' }]
    }
  ];
}

test('容量计算只统计 ml 成分，不统计 g 成分', () => {
  const runtime = createRecipeRuntime();
  const cups = createSampleCups();

  assert.strictEqual(runtime.calculateRecipeCupCapacity(cups[0]), 335);
  assert.strictEqual(runtime.calculateRecipeCupCapacity(cups[1]), 345);
  assert.strictEqual(runtime.getRecipeCupMismatch(cups[0]), -20);
  assert.strictEqual(runtime.getRecipeCupMismatch(cups[1]), -128);
});

test('变更检测应比较当前值和原始值', () => {
  const runtime = createRecipeRuntime();
  const cups = createSampleCups();

  assert.strictEqual(runtime.isRecipeCupChanged(cups[0]), true);
  assert.strictEqual(runtime.isRecipeCupChanged(cups[1]), false);
  assert.deepStrictEqual(runtime.getRecipeChangedCups(cups).map((cup) => cup.key), ['hot_355']);
});

test('保存条文案应突出已修改杯型和容量偏差', () => {
  const runtime = createRecipeRuntime();
  const cups = createSampleCups();

  assert.strictEqual(
    runtime.buildRecipeSaveBarMessage(cups),
    '已修改 1 个杯型。热 约355ML 容量低于标准杯量 20ml。'
  );

  cups[0].ingredients.find((item) => item.key === 'hotWater').value = 60;

  assert.strictEqual(
    runtime.buildRecipeSaveBarMessage(cups),
    '暂无配方修改。'
  );
});

test('恢复当前杯型只应重置该杯型', () => {
  const runtime = createRecipeRuntime();
  const cups = createSampleCups();

  const restored = runtime.restoreRecipeCupValues(cups, 'hot_355');
  const hot = restored.find((cup) => cup.key === 'hot_355');
  const iced = restored.find((cup) => cup.key === 'iced_473');

  assert.strictEqual(hot.ingredients.find((item) => item.key === 'hotWater').value, 60);
  assert.strictEqual(iced.ingredients.find((item) => item.key === 'ice').value, 100);
  assert.strictEqual(runtime.isRecipeCupChanged(hot), false);
});
```

- [ ] **Step 2: Run the test and verify helper functions are missing**

Run:

```bash
node --test tests/product-detail.recipe-main-editor.test.js
```

Expected before helper implementation:

```text
未找到函数 cloneRecipeCupConfig
```

- [ ] **Step 3: Commit the failing helper tests**

```bash
git add tests/product-detail.recipe-main-editor.test.js
git commit -m "test(product): cover recipe capacity helpers"
```

## Task 3: Add Pure Recipe Helper Functions

**Files:**
- Modify: `product-detail.html`
- Test: `tests/product-detail.recipe-main-editor.test.js`

- [ ] **Step 1: Add helper functions in the inline script**

In `product-detail.html`, add these functions near the existing recipe configuration functions. If the current source already has equivalent names, replace their bodies with these semantics rather than duplicating names.

```js
function cloneRecipeCupConfig(value) {
    return JSON.parse(JSON.stringify(value || null));
}

function getRecipeIngredientOriginalValue(cup, ingredientKey) {
    const originals = Array.isArray(cup?.originalIngredients) ? cup.originalIngredients : [];
    const original = originals.find((item) => String(item.key) === String(ingredientKey));
    return Number(original?.value || 0);
}

function normalizeRecipeAmount(value) {
    const amount = Math.round(Number(value));
    if (!Number.isFinite(amount) || amount < 0) return 0;
    return amount;
}

function calculateRecipeCupCapacity(cup) {
    const ingredients = Array.isArray(cup?.ingredients) ? cup.ingredients : [];
    return ingredients.reduce((total, ingredient) => {
        if (String(ingredient?.unit || '').toLowerCase() !== 'ml') return total;
        return total + normalizeRecipeAmount(ingredient?.value);
    }, 0);
}

function getRecipeCupMismatch(cup) {
    return calculateRecipeCupCapacity(cup) - normalizeRecipeAmount(cup?.standardCapacityMl);
}

function isRecipeCupChanged(cup) {
    const ingredients = Array.isArray(cup?.ingredients) ? cup.ingredients : [];
    return ingredients.some((ingredient) => {
        const key = String(ingredient?.key || '');
        if (!key) return false;
        return normalizeRecipeAmount(ingredient?.value) !== getRecipeIngredientOriginalValue(cup, key);
    });
}

function getRecipeChangedCups(cups) {
    return (Array.isArray(cups) ? cups : []).filter((cup) => isRecipeCupChanged(cup));
}

function buildRecipeSaveBarMessage(cups) {
    const changedCups = getRecipeChangedCups(cups);
    if (!changedCups.length) return '暂无配方修改。';

    const mismatchedCups = changedCups.filter((cup) => getRecipeCupMismatch(cup) !== 0);
    if (!mismatchedCups.length) {
        return `已修改 ${changedCups.length} 个杯型。所有已修改杯型容量符合标准杯量。`;
    }

    if (mismatchedCups.length === 1) {
        const cup = mismatchedCups[0];
        const mismatch = getRecipeCupMismatch(cup);
        const direction = mismatch > 0 ? '高于' : '低于';
        return `已修改 ${changedCups.length} 个杯型。${cup.label} 容量${direction}标准杯量 ${Math.abs(mismatch)}ml。`;
    }

    return `已修改 ${changedCups.length} 个杯型。${mismatchedCups.length} 个杯型容量与标准杯量不一致。`;
}

function restoreRecipeCupValues(cups, cupKey) {
    const nextCups = cloneRecipeCupConfig(cups) || [];
    const cup = nextCups.find((item) => String(item.key) === String(cupKey));
    if (!cup) return nextCups;

    cup.ingredients = (Array.isArray(cup.ingredients) ? cup.ingredients : []).map((ingredient) => ({
        ...ingredient,
        value: getRecipeIngredientOriginalValue(cup, ingredient.key)
    }));

    return nextCups;
}
```

- [ ] **Step 2: Run helper tests**

Run:

```bash
node --test tests/product-detail.recipe-main-editor.test.js
```

Expected:

```text
capacity helper tests pass
structure tests may still fail
```

If the structure tests still fail, continue to Task 4.

- [ ] **Step 3: Commit helper functions**

```bash
git add product-detail.html tests/product-detail.recipe-main-editor.test.js
git commit -m "feat(product): add recipe capacity helpers"
```

## Task 4: Replace Recipe Markup With Main Editor Layout

**Files:**
- Modify: `product-detail.html`
- Test: `tests/product-detail.recipe-main-editor.test.js`

- [ ] **Step 1: Replace the direct cup-card recipe panel body**

Inside the `配方配置` panel, replace the equal-weight three-card editor with this structure. Keep surrounding product-detail tabs and any existing save handler wiring.

```html
<section class="product-detail-tab-panel" id="productDetailRecipePanel">
    <div class="recipe-config-head">
        <div>
            <div class="option-toolbar-title">配方配置</div>
            <div class="recipe-config-subtitle">按杯型调整成分，标准杯量用于校验当前配方容量。</div>
        </div>
        <button class="btn btn-primary" type="button" onclick="saveCupRecipeConfig()">保存配方</button>
    </div>

    <div class="recipe-main-layout">
        <section class="recipe-main-editor" id="recipeMainEditor"></section>
        <aside class="recipe-side-panel">
            <div class="recipe-side-block">
                <div class="recipe-side-title">杯型切换</div>
                <div class="recipe-cup-switcher" id="recipeCupSwitcher"></div>
            </div>
            <div class="recipe-side-block">
                <div class="recipe-side-title">修改前后对比</div>
                <div class="recipe-change-compare-panel" id="recipeChangeComparePanel"></div>
            </div>
        </aside>
    </div>

    <div class="recipe-sticky-save-bar" id="recipeStickySaveBar">
        <div class="recipe-save-summary" id="recipeSaveSummary">暂无配方修改。</div>
        <button class="btn btn-primary" type="button" onclick="saveCupRecipeConfig()">保存配方</button>
    </div>
</section>
```

If the current version already has `saveProduct()` or another save handler instead of `saveCupRecipeConfig()`, create `saveCupRecipeConfig()` as a thin wrapper that calls the existing recipe save path.

- [ ] **Step 2: Add an initial recipe state adapter if the current implementation lacks state**

Add these globals near the current recipe state variables. If existing data already supplies these cups, write an adapter that produces this shape instead of hardcoding.

```js
let activeRecipeCupKey = 'hot_355';
let recipeCupConfigs = [
    {
        key: 'hot_355',
        label: '热 约355ML',
        standardCapacityMl: 355,
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
        otherIngredients: []
    },
    {
        key: 'iced_473',
        label: '标准冰 约473ML',
        standardCapacityMl: 473,
        ingredients: [
            { key: 'espresso', label: '浓缩', value: 80, unit: 'ml', editable: false },
            { key: 'milk', label: '奶', value: 180, unit: 'ml', editable: true, step: 5 },
            { key: 'hotWater', label: '热水', value: 60, unit: 'ml', editable: true, step: 5 },
            { key: 'syrup', label: '糖浆', value: 25, unit: 'ml', editable: true, step: 5 },
            { key: 'ice', label: '冰', value: 100, unit: 'g', editable: false }
        ],
        originalIngredients: [
            { key: 'espresso', value: 80 },
            { key: 'milk', value: 180 },
            { key: 'hotWater', value: 60 },
            { key: 'syrup', value: 25 },
            { key: 'ice', value: 100 }
        ],
        otherIngredients: [{ key: 'ice', label: '冰', value: 100, unit: 'g' }]
    },
    {
        key: 'less_ice_473',
        label: '少冰 约473ML',
        standardCapacityMl: 473,
        ingredients: [
            { key: 'espresso', label: '浓缩', value: 80, unit: 'ml', editable: false },
            { key: 'milk', label: '奶', value: 180, unit: 'ml', editable: true, step: 5 },
            { key: 'hotWater', label: '热水', value: 60, unit: 'ml', editable: true, step: 5 },
            { key: 'syrup', label: '糖浆', value: 25, unit: 'ml', editable: true, step: 5 },
            { key: 'ice', label: '冰', value: 70, unit: 'g', editable: false }
        ],
        originalIngredients: [
            { key: 'espresso', value: 80 },
            { key: 'milk', value: 180 },
            { key: 'hotWater', value: 60 },
            { key: 'syrup', value: 25 },
            { key: 'ice', value: 70 }
        ],
        otherIngredients: [{ key: 'ice', label: '冰', value: 70, unit: 'g' }]
    }
];
```

Use existing product recipe data instead of these literals when the current code already has live recipe data. The required output shape is the object shape shown above.

- [ ] **Step 3: Run structure tests**

Run:

```bash
node --test tests/product-detail.recipe-main-editor.test.js
```

Expected:

```text
structure tests pass except render-dependent tests not added yet
```

- [ ] **Step 4: Commit markup**

```bash
git add product-detail.html tests/product-detail.recipe-main-editor.test.js
git commit -m "feat(product): add recipe main editor layout"
```

## Task 5: Add Recipe Main Editor Styles

**Files:**
- Modify: `product-detail.html`

- [ ] **Step 1: Add CSS rules to the inline style block**

Add these rules near the existing recipe CSS:

```css
.recipe-config-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 20px;
}

.recipe-config-subtitle {
    margin-top: 6px;
    color: var(--text-muted);
    font-size: 13px;
    line-height: 1.5;
}

.recipe-main-layout {
    display: grid;
    grid-template-columns: minmax(620px, 1fr) minmax(320px, 420px);
    gap: 22px;
    align-items: start;
}

.recipe-main-editor,
.recipe-side-block {
    border: 1px solid var(--border);
    border-radius: 14px;
    background: #fff;
}

.recipe-main-editor {
    padding: 22px;
}

.recipe-side-panel {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.recipe-side-block {
    padding: 16px;
}

.recipe-side-title {
    margin-bottom: 12px;
    color: var(--text-primary);
    font-size: 16px;
    font-weight: 800;
}

.recipe-editor-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 16px;
}

.recipe-editor-title {
    color: var(--text-primary);
    font-size: 26px;
    font-weight: 800;
    line-height: 1.2;
}

.recipe-editor-note {
    margin-top: 7px;
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.5;
}

.recipe-segment-bar {
    height: 42px;
    display: flex;
    overflow: hidden;
    border-radius: 10px;
    background: #e9eef1;
    margin: 14px 0;
}

.recipe-segment {
    min-width: 48px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 13px;
    font-weight: 800;
    white-space: nowrap;
}

.recipe-segment.espresso { background: #8b6231; }
.recipe-segment.milk { background: #d8ba91; }
.recipe-segment.foam { background: #e7d3ad; }
.recipe-segment.hotWater { background: #45c8c3; }
.recipe-segment.syrup { background: #c8945f; }
.recipe-segment.ice { background: #73c4e8; }

.recipe-capacity-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    margin: 14px 0 18px;
}

.recipe-capacity-card {
    border: 1px solid #dce8f1;
    border-radius: 12px;
    background: #f9fbfd;
    padding: 12px;
}

.recipe-capacity-card.recipe-capacity-standard {
    border-color: rgba(69, 200, 195, 0.72);
    background: #effefd;
    box-shadow: inset 0 0 0 1px rgba(69, 200, 195, 0.18);
}

.recipe-capacity-card.recipe-capacity-warning {
    border-color: #f3d3a8;
    background: #fff8eb;
}

.recipe-capacity-label {
    color: var(--text-muted);
    font-size: 12px;
    font-weight: 700;
}

.recipe-capacity-standard .recipe-capacity-label {
    color: var(--primary-dark);
}

.recipe-capacity-value {
    margin-top: 5px;
    color: var(--text-primary);
    font-size: 22px;
    font-weight: 800;
}

.recipe-capacity-standard .recipe-capacity-value {
    font-size: 28px;
}

.recipe-readonly-ingredient,
.recipe-ingredient-editor {
    border: 1px solid #dce8f1;
    border-radius: 12px;
    background: #fcfdfe;
    padding: 14px;
    margin-top: 12px;
}

.recipe-readonly-ingredient {
    color: var(--text-secondary);
}

.recipe-ingredient-editor {
    display: grid;
    grid-template-columns: 1fr minmax(240px, 360px);
    gap: 14px;
    align-items: start;
}

.recipe-ingredient-name {
    color: #d1b68d;
    font-size: 17px;
    font-weight: 800;
}

.recipe-ingredient-name.hotWater {
    color: var(--primary-dark);
}

.recipe-ingredient-hint {
    margin-top: 12px;
    color: var(--text-muted);
    font-size: 12px;
}

.recipe-stepper {
    display: grid;
    grid-template-columns: 38px 1fr 38px;
    gap: 10px;
    align-items: center;
}

.recipe-stepper-btn {
    width: 38px;
    height: 38px;
    border: 1px solid #cbd7e3;
    border-radius: 9px;
    background: #fff;
    color: var(--text-primary);
    font-size: 20px;
    font-weight: 800;
    cursor: pointer;
}

.recipe-value-field {
    height: 38px;
    display: grid;
    grid-template-columns: 1fr 34px;
    align-items: center;
    border: 1px solid #dbe4ec;
    border-radius: 10px;
    background: #fff;
    padding: 0 10px;
}

.recipe-value-field input {
    width: 100%;
    border: 0;
    outline: none;
    text-align: center;
    color: var(--text-primary);
    font-size: 16px;
    font-weight: 800;
    background: transparent;
}

.recipe-value-unit {
    color: var(--text-muted);
    font-weight: 800;
}

.recipe-cup-switcher {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.recipe-cup-switch-item {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: #fff;
    padding: 12px;
    text-align: left;
    cursor: pointer;
}

.recipe-cup-switch-item.active {
    border-color: var(--primary);
    background: #f2fffd;
}

.recipe-cup-switch-head {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 800;
}

.recipe-cup-status {
    flex-shrink: 0;
    border-radius: 999px;
    background: var(--primary-light);
    color: var(--primary-dark);
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 800;
}

.recipe-cup-status.neutral {
    background: #f1f5f9;
    color: var(--text-muted);
}

.recipe-cup-switch-meta {
    margin-top: 7px;
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.5;
}

.recipe-change-empty {
    color: var(--text-muted);
    font-size: 13px;
    line-height: 1.5;
}

.recipe-compare-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
}

.recipe-compare-card {
    border: 1px solid #dce8f1;
    border-radius: 10px;
    background: #f9fbfd;
    padding: 10px;
}

.recipe-compare-label {
    color: var(--text-muted);
    font-size: 12px;
    font-weight: 700;
}

.recipe-compare-value {
    margin-top: 5px;
    color: var(--text-primary);
    font-size: 20px;
    font-weight: 800;
}

.recipe-change-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 12px;
}

.recipe-change-item {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    border-radius: 10px;
    background: #f7fafc;
    padding: 10px;
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 700;
}

.recipe-change-item strong {
    color: var(--primary-dark);
}

.recipe-sticky-save-bar {
    position: sticky;
    bottom: 16px;
    z-index: 10;
    margin-top: 22px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
    padding: 14px 16px;
}

.recipe-save-summary {
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 700;
}

@media (max-width: 920px) {
    .recipe-main-layout {
        grid-template-columns: 1fr;
    }

    .recipe-capacity-row,
    .recipe-ingredient-editor {
        grid-template-columns: 1fr;
    }

    .recipe-sticky-save-bar {
        align-items: stretch;
        flex-direction: column;
    }
}
```

- [ ] **Step 2: Run structure tests**

Run:

```bash
node --test tests/product-detail.recipe-main-editor.test.js
```

Expected:

```text
all current tests pass
```

- [ ] **Step 3: Commit styles**

```bash
git add product-detail.html
git commit -m "style(product): refine recipe main editor layout"
```

## Task 6: Implement Rendering and Interactions

**Files:**
- Modify: `product-detail.html`
- Test: `tests/product-detail.recipe-main-editor.test.js`

- [ ] **Step 1: Add renderer functions**

Add these functions in the inline script:

```js
function getActiveRecipeCup() {
    return recipeCupConfigs.find((cup) => String(cup.key) === String(activeRecipeCupKey)) || recipeCupConfigs[0] || null;
}

function getRecipeSegmentClass(ingredientKey) {
    const key = String(ingredientKey || '');
    if (key === 'espresso') return 'espresso';
    if (key === 'milk') return 'milk';
    if (key === 'foam') return 'foam';
    if (key === 'hotWater') return 'hotWater';
    if (key === 'syrup') return 'syrup';
    if (key === 'ice') return 'ice';
    return 'milk';
}

function renderRecipeSegmentBar(cup) {
    const ingredients = Array.isArray(cup?.ingredients) ? cup.ingredients : [];
    const total = Math.max(1, ingredients.reduce((sum, item) => sum + normalizeRecipeAmount(item.value), 0));
    return `
        <div class="recipe-segment-bar">
            ${ingredients.map((ingredient) => {
                const value = normalizeRecipeAmount(ingredient.value);
                const width = Math.max(8, Math.round((value / total) * 100));
                return `<div class="recipe-segment ${getRecipeSegmentClass(ingredient.key)}" style="width:${width}%">${ingredient.label} ${value}${ingredient.unit}</div>`;
            }).join('')}
        </div>
    `;
}

function renderRecipeCapacitySummary(cup) {
    const current = calculateRecipeCupCapacity(cup);
    const standard = normalizeRecipeAmount(cup?.standardCapacityMl);
    const mismatch = current - standard;
    return `
        <div class="recipe-capacity-row">
            <div class="recipe-capacity-card recipe-capacity-standard">
                <div class="recipe-capacity-label">标准杯量</div>
                <div class="recipe-capacity-value">${standard}ml</div>
            </div>
            <div class="recipe-capacity-card">
                <div class="recipe-capacity-label">当前容量</div>
                <div class="recipe-capacity-value">${current}ml</div>
            </div>
            <div class="recipe-capacity-card ${mismatch === 0 ? '' : 'recipe-capacity-warning'}">
                <div class="recipe-capacity-label">容量偏差</div>
                <div class="recipe-capacity-value">${mismatch > 0 ? '+' : ''}${mismatch}ml</div>
            </div>
        </div>
    `;
}

function renderRecipeIngredientEditor(cup, ingredient) {
    if (!ingredient.editable) {
        return `
            <div class="recipe-readonly-ingredient">
                <div class="recipe-ingredient-name ${ingredient.key}">${ingredient.label} ${normalizeRecipeAmount(ingredient.value)}${ingredient.unit}</div>
                <div class="recipe-ingredient-hint">基底咖啡数值由配方文件维护，不可在此修改。</div>
            </div>
        `;
    }

    const value = normalizeRecipeAmount(ingredient.value);
    const step = normalizeRecipeAmount(ingredient.step || 5) || 5;
    return `
        <div class="recipe-ingredient-editor">
            <div>
                <div class="recipe-ingredient-name ${ingredient.key}">${ingredient.label}</div>
                <div class="recipe-ingredient-hint">每次 ${step}${ingredient.unit}，可按住连续调整</div>
            </div>
            <div class="recipe-stepper">
                <button class="recipe-stepper-btn" type="button" onclick="adjustRecipeIngredient('${cup.key}', '${ingredient.key}', -${step})">-</button>
                <label class="recipe-value-field">
                    <input value="${value}" inputmode="numeric" onchange="setRecipeIngredientValue('${cup.key}', '${ingredient.key}', this.value)">
                    <span class="recipe-value-unit">${ingredient.unit}</span>
                </label>
                <button class="recipe-stepper-btn" type="button" onclick="adjustRecipeIngredient('${cup.key}', '${ingredient.key}', ${step})">+</button>
            </div>
        </div>
    `;
}

function renderRecipeMainEditor() {
    const cup = getActiveRecipeCup();
    const editor = document.getElementById('recipeMainEditor');
    if (!cup || !editor) return;

    editor.innerHTML = `
        <div class="recipe-editor-head">
            <div>
                <div class="recipe-editor-title">${escAttr(cup.label)}</div>
                <div class="recipe-editor-note">当前正在编辑${escAttr(cup.label)}成分，浓缩由配方文件维护。</div>
            </div>
            <button class="btn btn-default" type="button" onclick="restoreActiveRecipeCup()">恢复当前杯型修改前</button>
        </div>
        ${renderRecipeSegmentBar(cup)}
        ${renderRecipeCapacitySummary(cup)}
        ${(Array.isArray(cup.ingredients) ? cup.ingredients : []).map((ingredient) => renderRecipeIngredientEditor(cup, ingredient)).join('')}
    `;
}
```

- [ ] **Step 2: Add switcher, comparison, save-bar renderers**

Add these functions:

```js
function formatRecipeCupMeta(cup) {
    const standard = normalizeRecipeAmount(cup?.standardCapacityMl);
    const current = calculateRecipeCupCapacity(cup);
    const mismatch = current - standard;
    const mismatchText = mismatch === 0 ? '符合标准' : `${mismatch > 0 ? '多' : '少'} ${Math.abs(mismatch)}ml`;
    const otherText = (Array.isArray(cup?.otherIngredients) ? cup.otherIngredients : [])
        .map((item) => `${item.label} ${normalizeRecipeAmount(item.value)}${item.unit}`)
        .join(' / ');
    return `标准 ${standard}ml / 当前 ${current}ml / ${otherText || mismatchText}`;
}

function renderRecipeCupSwitcher() {
    const switcher = document.getElementById('recipeCupSwitcher');
    if (!switcher) return;

    switcher.innerHTML = recipeCupConfigs.map((cup) => {
        const active = String(cup.key) === String(activeRecipeCupKey);
        const changed = isRecipeCupChanged(cup);
        return `
            <button class="recipe-cup-switch-item ${active ? 'active' : ''}" type="button" onclick="switchRecipeCup('${cup.key}')">
                <div class="recipe-cup-switch-head">
                    <span>${escAttr(cup.label)}</span>
                    <span class="recipe-cup-status ${changed ? '' : 'neutral'}">${changed ? '已修改' : '未修改'}</span>
                </div>
                <div class="recipe-cup-switch-meta">${escAttr(formatRecipeCupMeta(cup))}</div>
            </button>
        `;
    }).join('');
}

function getRecipeCupChangedIngredients(cup) {
    return (Array.isArray(cup?.ingredients) ? cup.ingredients : []).filter((ingredient) => {
        return normalizeRecipeAmount(ingredient.value) !== getRecipeIngredientOriginalValue(cup, ingredient.key);
    });
}

function renderRecipeChangeComparePanel() {
    const panel = document.getElementById('recipeChangeComparePanel');
    const cup = getActiveRecipeCup();
    if (!panel || !cup) return;

    const changedIngredients = getRecipeCupChangedIngredients(cup);
    if (!changedIngredients.length) {
        panel.innerHTML = '<div class="recipe-change-empty">当前杯型暂无修改</div>';
        return;
    }

    const originalCapacity = (Array.isArray(cup.originalIngredients) ? cup.originalIngredients : []).reduce((sum, ingredient) => {
        const current = (Array.isArray(cup.ingredients) ? cup.ingredients : []).find((item) => String(item.key) === String(ingredient.key));
        if (String(current?.unit || '').toLowerCase() !== 'ml') return sum;
        return sum + normalizeRecipeAmount(ingredient.value);
    }, 0);
    const currentCapacity = calculateRecipeCupCapacity(cup);

    panel.innerHTML = `
        <div class="recipe-compare-grid">
            <div class="recipe-compare-card">
                <div class="recipe-compare-label">修改前</div>
                <div class="recipe-compare-value">${originalCapacity}ml</div>
            </div>
            <div class="recipe-compare-card">
                <div class="recipe-compare-label">修改后</div>
                <div class="recipe-compare-value">${currentCapacity}ml</div>
            </div>
        </div>
        <div class="recipe-change-list">
            ${changedIngredients.map((ingredient) => `
                <div class="recipe-change-item">
                    <span>${escAttr(ingredient.label)}</span>
                    <strong>${getRecipeIngredientOriginalValue(cup, ingredient.key)}${ingredient.unit} -> ${normalizeRecipeAmount(ingredient.value)}${ingredient.unit}</strong>
                </div>
            `).join('')}
            <div class="recipe-change-item">
                <span>容量总量</span>
                <strong>${originalCapacity}ml -> ${currentCapacity}ml</strong>
            </div>
        </div>
    `;
}

function renderRecipeSaveBar() {
    const summary = document.getElementById('recipeSaveSummary');
    if (summary) summary.textContent = buildRecipeSaveBarMessage(recipeCupConfigs);
}

function renderCupRecipeConfig() {
    renderRecipeMainEditor();
    renderRecipeCupSwitcher();
    renderRecipeChangeComparePanel();
    renderRecipeSaveBar();
}
```

- [ ] **Step 3: Add interaction handlers**

Add these functions:

```js
function switchRecipeCup(cupKey) {
    if (!recipeCupConfigs.some((cup) => String(cup.key) === String(cupKey))) return;
    activeRecipeCupKey = String(cupKey);
    renderCupRecipeConfig();
}

function updateRecipeIngredient(cupKey, ingredientKey, nextValue) {
    recipeCupConfigs = recipeCupConfigs.map((cup) => {
        if (String(cup.key) !== String(cupKey)) return cup;
        return {
            ...cup,
            ingredients: (Array.isArray(cup.ingredients) ? cup.ingredients : []).map((ingredient) => {
                if (String(ingredient.key) !== String(ingredientKey)) return ingredient;
                if (!ingredient.editable) return ingredient;
                return { ...ingredient, value: normalizeRecipeAmount(nextValue) };
            })
        };
    });
}

function adjustRecipeIngredient(cupKey, ingredientKey, delta) {
    const cup = recipeCupConfigs.find((item) => String(item.key) === String(cupKey));
    const ingredient = (Array.isArray(cup?.ingredients) ? cup.ingredients : []).find((item) => String(item.key) === String(ingredientKey));
    if (!cup || !ingredient || !ingredient.editable) return;
    updateRecipeIngredient(cupKey, ingredientKey, normalizeRecipeAmount(ingredient.value) + Number(delta || 0));
    renderCupRecipeConfig();
}

function setRecipeIngredientValue(cupKey, ingredientKey, value) {
    updateRecipeIngredient(cupKey, ingredientKey, value);
    renderCupRecipeConfig();
}

function restoreActiveRecipeCup() {
    recipeCupConfigs = restoreRecipeCupValues(recipeCupConfigs, activeRecipeCupKey);
    renderCupRecipeConfig();
}

function saveCupRecipeConfig() {
    if (typeof saveProduct === 'function') {
        saveProduct();
    }
    if (typeof showToast === 'function') {
        showToast('配方已保存');
    }
}
```

If the current source already has a recipe-specific save function, use that function inside `saveCupRecipeConfig()` instead of `saveProduct()`.

- [ ] **Step 4: Ensure the renderer runs when the recipe tab is shown**

Find the existing tab switch function, likely `switchProductDetailTab`. Add this call when the recipe tab becomes active:

```js
if (nextTab === 'recipe') {
    renderCupRecipeConfig();
}
```

Also call once during page initialization after product data is loaded:

```js
renderCupRecipeConfig();
```

- [ ] **Step 5: Run tests**

Run:

```bash
node --test tests/product-detail.recipe-main-editor.test.js
node --test tests/product-detail.pricing.test.js
node --test tests/product-detail.business-tags.runtime.test.js
node --test tests/product-detail.device-language-config.test.js
```

Expected:

```text
all tests pass
```

- [ ] **Step 6: Commit rendering and interaction code**

```bash
git add product-detail.html tests/product-detail.recipe-main-editor.test.js
git commit -m "feat(product): implement recipe cup main editor"
```

## Task 7: Manual Browser QA

**Files:**
- Verify: `product-detail.html`

- [ ] **Step 1: Start local server**

Run:

```bash
python3 scripts/no_cache_http_server.py --port 8080
```

Expected:

```text
Serving HTTP
```

If port 8080 is occupied, use 8091:

```bash
python3 scripts/no_cache_http_server.py --port 8091
```

- [ ] **Step 2: Open product detail page**

Open:

```text
http://127.0.0.1:8080/product-detail.html
```

If using port 8091:

```text
http://127.0.0.1:8091/product-detail.html
```

- [ ] **Step 3: Verify desktop layout at 1440px**

Checklist:

- `配方配置` tab opens the two-column layout.
- Left editor displays selected cup title.
- `标准杯量` appears before `当前容量`.
- `标准杯量` is visually stronger than secondary capacity text.
- The selected cup in the right switcher is highlighted.
- Clicking `标准冰 约473ML` updates the left editor without losing unsaved edits on `热 约355ML`.
- Adjusting `热水` changes current capacity and bottom save summary.
- `恢复当前杯型修改前` restores only the selected cup.

- [ ] **Step 4: Verify mobile/narrow layout at 390px**

Checklist:

- Main editor stacks above side panel.
- Buttons and input text do not overflow.
- Sticky save bar remains readable.
- Standard capacity is still visible near the top of the editor.

- [ ] **Step 5: Save QA screenshots**

Save screenshots to:

```text
screenshots/prd-product-detail/recipe-main-editor-desktop.png
screenshots/prd-product-detail/recipe-main-editor-mobile.png
```

- [ ] **Step 6: Commit QA screenshots if project convention expects visual artifacts**

```bash
git add screenshots/prd-product-detail/recipe-main-editor-desktop.png screenshots/prd-product-detail/recipe-main-editor-mobile.png
git commit -m "docs(product): add recipe main editor QA screenshots"
```

If this project branch does not track QA screenshots for implementation PRs, do not commit screenshots; include them in the PR artifact list instead.

## Task 8: Full Regression

**Files:**
- Verify: `tests/`

- [ ] **Step 1: Run focused tests**

Run:

```bash
node --test tests/product-detail.recipe-main-editor.test.js
node --test tests/product-detail.pricing.test.js
node --test tests/product-detail.business-tags.runtime.test.js
node --test tests/product-detail.device-language-config.test.js
```

Expected:

```text
all focused tests pass
```

- [ ] **Step 2: Run full suite**

Run:

```bash
node --test tests/
```

Expected:

```text
all tests pass
```

- [ ] **Step 3: Final implementation commit**

If any final fixes were needed after full regression:

```bash
git add product-detail.html tests/product-detail.recipe-main-editor.test.js
git commit -m "fix(product): polish recipe main editor behavior"
```

If no files changed after the prior commits, do not create an empty commit.

## Self-Review Checklist

- Spec coverage: Tasks 4-6 implement the main editor, switcher, comparison panel, standard capacity emphasis, restore-current-cup behavior, and sticky save bar.
- Test coverage: Tasks 1-2 cover structure, capacity math, changed-state detection, save-bar copy, readonly espresso, and restore behavior.
- Red-flag scan: This plan has no incomplete requirement markers or undefined helper names; every helper used by tests is defined in Task 3 or Task 6.
- Risk: The current checked-out repository may still contain the old modal version. The precondition blocks execution on the wrong source version.

## Execution Handoff

Recommended execution mode: `superpowers:subagent-driven-development`, one fresh subagent per task, with review after each task. Use `superpowers:executing-plans` only if implementing inline in a single session.
