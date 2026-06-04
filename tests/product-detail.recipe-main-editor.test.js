const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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

test('配方配置应改为先选客户选项再获取配方', () => {
    const recipePanelIndex = html.indexOf('id="productDetailRecipePanel"');
    assert.notStrictEqual(recipePanelIndex, -1, 'recipe panel missing');
    const panelSlice = html.slice(recipePanelIndex, html.indexOf('<!-- recipeHiddenOptions removed', recipePanelIndex));

    assert.ok(panelSlice.includes('id="recipeMainEditor"'), 'missing recipe result editor');
    assert.ok(panelSlice.includes('id="recipeRequiredOptionGroups"'), 'missing required option groups');
    assert.ok(panelSlice.includes('id="recipeFetchButton"'), 'missing fetch recipe button');
    assert.ok(panelSlice.includes('获取配方'), 'fetch recipe CTA missing');
    assert.ok(panelSlice.includes('等待获取配方'), 'empty state should be visible before fetching');
    assert.ok(panelSlice.includes('咖啡豆、温度、浓度'), 'required option copy missing');
    assert.ok(!panelSlice.includes('id="recipeCupSwitcher"'), 'recipe tab should no longer use cup switcher');
    assert.ok(!panelSlice.includes('id="recipeChangeComparePanel"'), 'recipe tab should no longer use comparison side panel');
});

test('配方配置读取咖啡豆温度浓度组合，获取后才展示成分编辑', () => {
    assert.ok(/const\s+RECIPE_REQUIRED_OPTION_KEYS\s*=\s*\['beans',\s*'temperature',\s*'strength'\]/.test(html));
    assert.ok(/const\s+RECIPE_COMBINATION_SPEC_KEY\s*=\s*'optionCombination'/.test(html));
    assert.ok(/function\s+renderRecipeRequiredOptionGroups\s*\(/.test(html));
    assert.ok(/function\s+fetchRecipeForSelectedOptions\s*\(/.test(html));
    assert.ok(/function\s+renderFetchedRecipeEditor\s*\(/.test(html));
    assert.ok(/function\s+getRecipeCombinationFromSelection\s*\(/.test(html));
    assert.ok(/recipeSelectionState\.status\s*=\s*'fetched'/.test(html));
    assert.ok(/recipeSelectionState\.status\s*=\s*'stale'/.test(html));
    assert.ok(html.includes('已获取配方'));
    assert.ok(html.includes('保存后只更新当前选项组合对应的配方'));
});

test('选项配置 tab 内容应保持生产版结构，不迁入配方配置', () => {
    const tagsStart = html.indexOf('id="productDetailTagsPanel"');
    const recipeStart = html.indexOf('id="productDetailRecipePanel"');
    assert.notStrictEqual(tagsStart, -1, 'tags panel missing');
    assert.notStrictEqual(recipeStart, -1, 'recipe panel missing');
    const tagsPanel = html.slice(tagsStart, recipeStart);
    const recipePanel = html.slice(recipeStart, html.indexOf('<!-- recipeHiddenOptions removed', recipeStart));

    assert.ok(tagsPanel.includes('id="tagOptionsGrid"'));
    assert.ok(tagsPanel.includes('id="openTagConfigDrawerBtn"'));
    ['beans', 'temperature', 'strength', 'syrup', 'sweetness', 'cupsize', 'lid', 'latteArt'].forEach(specKey => {
        assert.ok(tagsPanel.includes(`data-spec-key="${specKey}"`), `${specKey} missing from option config`);
    });
    assert.ok(!recipePanel.includes('id="tagOptionsGrid"'));
    assert.ok(!recipePanel.includes('id="openTagConfigDrawerBtn"'));
    assert.ok(!recipePanel.includes('编辑多语言文案'));
});

test('浓缩应保持只读说明', () => {
    assert.ok(html.includes('基底咖啡数值由配方文件维护，不可在此修改'), 'readonly espresso note missing');
});

test('旧版修改配方弹窗不应作为新版杯型成分编辑的主入口', () => {
    const recipePanelIndex = html.indexOf('id="productDetailRecipePanel"');
    assert.notStrictEqual(recipePanelIndex, -1, 'recipe panel missing');
    const panelSlice = html.slice(recipePanelIndex, recipePanelIndex + 8000);
    assert.ok(!panelSlice.includes('openRecipeEditorForActiveSpec()'), 'old modal trigger should not be the main recipe edit entry');
});

// =============== Task 2 helper tests ===============

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
        'normalizeRecipeAmount',
        'getRecipeIngredientOriginalValue',
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
