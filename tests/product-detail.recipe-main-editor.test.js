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
    assert.ok(/recipe-capacity-standard|recipe-standard-capacity-card/.test(html), 'standard capacity should have prominent class');
});

test('配方配置应显示杯型切换和当前杯型恢复入口', () => {
    assert.ok(/恢复.{0,6}杯型修改前/.test(html), 'restore-current-cup button missing');
    // cup-switcher 是动态渲染的，但渲染器函数应该存在
    assert.ok(/function\s+renderRecipeCupSwitcher\s*\(/.test(html), 'cup switcher renderer missing');
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
