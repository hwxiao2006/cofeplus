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
    assert.ok(tagsPanel.includes('id="saveTagConfigPanelBtn"'), '选项配置页签应有内嵌保存按钮');
    assert.ok(tagsPanel.includes('id="tagTree"'), '选项配置页签应内嵌标签类型树');
    assert.ok(tagsPanel.includes('id="tagDrawerEditor"'), '选项配置页签应内嵌多语言编辑器');
    ['beans', 'temperature', 'strength', 'syrup', 'sweetness', 'cupsize', 'lid', 'latteArt'].forEach(specKey => {
        assert.ok(tagsPanel.includes(`data-spec-key="${specKey}"`), `${specKey} missing from option config`);
    });
    assert.ok(!recipePanel.includes('id="tagOptionsGrid"'));
    assert.ok(!recipePanel.includes('id="saveTagConfigPanelBtn"'));
    assert.ok(!recipePanel.includes('编辑多语言文案'));
});

test('浓缩行应下线：主编辑区不渲染 baseCoffeeLiquid，奶泡保留只读说明', () => {
    // 主 UI（fetch 编辑器）过滤浓缩行；RECIPE_READONLY_HINTS 不再为浓缩提供文案。
    // 旧弹窗/隐藏兜底渲染器（renderRecipeEditor / renderRecipeIngredientEditor）中的
    // 同款只读文案属于死代码路径，不在本次清理范围。
    const editorFn = html.slice(
        html.indexOf('function renderFetchedRecipeEditor('),
        html.indexOf('function revertFetchedRecipeChanges(')
    );
    assert.ok(editorFn.includes(".filter((cfg) => cfg.groupKey !== 'baseCoffeeLiquid')"), '主编辑区应过滤浓缩行');
    const hints = html.slice(html.indexOf('const RECIPE_READONLY_HINTS'), html.indexOf('};', html.indexOf('const RECIPE_READONLY_HINTS')));
    assert.ok(!hints.includes('baseCoffeeLiquid'), '只读提示表不应再有浓缩条目');
    assert.ok(html.includes('奶泡数值由设备出奶口出料控制'), '奶泡只读说明应保留');
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

// =============== 咖啡萃取参数（brewParams）tests ===============

test('萃取参数应定义六项工艺参数并接入渲染与取数入口', () => {
    assert.ok(/const\s+RECIPE_BREW_PARAM_CONFIGS\s*=\s*\[/.test(html), 'missing RECIPE_BREW_PARAM_CONFIGS');
    ['waterQuantity', 'cakeThickness', 'tamping', 'preInfusion', 'relaxTime', 'secondTamping'].forEach((key) => {
        assert.ok(html.includes(`key: '${key}'`), `brew param ${key} missing`);
    });
    assert.ok(/function\s+renderFetchedBrewParamRows\s*\(/.test(html));
    assert.ok(/function\s+setFetchedBrewParamValue\s*\(/.test(html));
    assert.ok(/function\s+adjustFetchedBrewParam\s*\(/.test(html));
    assert.ok(/function\s+ensureRecipeBrewParams\s*\(/.test(html));
    assert.ok(/function\s+productHasBeansOption\s*\(/.test(html), 'should judge by product-level option data');
    assert.ok(html.includes('咖啡萃取参数'), 'brew section title missing');
    assert.ok(html.includes('含咖啡豆的饮品可调'), 'brew section scope note missing');
    // 获取配方后必须先补默认，否则含豆组合无存量数据时编辑区不出现参数行
    assert.ok(/const recipe = getRecipeForCombination\(combo\);\s*ensureRecipeBrewParams\(recipe\);/.test(html), 'fetch should ensure brew params');
    // 默认收起 + 点击展开
    assert.ok(/let recipeBrewSectionOpen = false;/.test(html), 'brew section should default to collapsed');
    assert.ok(/function\s+toggleRecipeBrewSection\s*\(/.test(html), 'missing toggle handler');
    assert.ok(/aria-expanded/.test(html), 'head button should expose aria-expanded');
    // 收起时有未保存修改要能看到
    assert.ok(/function\s+hasFetchedBrewParamChanges\s*\(/.test(html), 'missing brew change detector');
    assert.ok(html.includes('recipe-fetch-brew-badge'), 'missing changed badge');
    // 压粉力度为离散档位：渲染三档按钮组而非步进器
    assert.ok(html.includes('recipe-brew-option-btn'), 'missing discrete option button class');
    assert.ok(html.includes('20kg') && html.includes('40kg') && html.includes('60kg'), 'missing kg gear labels');
});

test('萃取参数分区应排在物料行（牛奶）之前', () => {
    const editorFn = html.slice(
        html.indexOf('function renderFetchedRecipeEditor('),
        html.indexOf('function revertFetchedRecipeChanges(')
    );
    assert.ok(editorFn.includes('${brewRows}') && editorFn.includes('${rows'), 'editor should render both blocks');
    assert.ok(
        editorFn.indexOf('${brewRows}') < editorFn.indexOf("${rows ||"),
        'brew section should come before ingredient rows'
    );
});

function extractConstSource(name) {
    const marker = `const ${name} = `;
    const start = html.indexOf(marker);
    if (start === -1) {
        throw new Error(`未找到常量 ${name}`);
    }
    let depth = 0;
    let index = start;
    for (; index < html.length; index += 1) {
        const char = html[index];
        if (char === '[' || char === '(' || char === '{') depth += 1;
        if (char === ']' || char === ')' || char === '}') {
            depth -= 1;
            if (depth === 0) {
                return html.slice(start, html.indexOf(';', index) + 1);
            }
        }
    }
    throw new Error(`常量 ${name} 未正常结束`);
}

function createBrewRuntime() {
    const context = { console };
    vm.createContext(context);
    ['RECIPE_GROUP_CONFIGS', 'RECIPE_GROUP_KEYS', 'RECIPE_COMP_CONFIGS', 'RECIPE_COMPONENT_RULES', 'RECIPE_BREW_PARAM_CONFIGS'].forEach((name) => {
        vm.runInContext(extractConstSource(name), context);
    });
    [
        'getRecipeComponentRule',
        'getRecipeBrewParamConfig',
        'normalizeRecipeComponentValue',
        'normalizeRecipeBrewParamValue',
        'formatRecipeBrewParamValue',
        'hasBeansTagInProduct',
        'productHasBeansOption',
        'normalizeRecipePercent',
        'getDefaultRecipeData',
        'normalizeRecipeData',
        'ensureRecipeBrewParams',
        'getRecipeVariantDiffs'
    ].forEach((name) => {
        vm.runInContext(extractFunctionSource(name), context);
    });
    // const 声明不进 context 全局对象，用求值方式取引用；对象比较也用 JSON 规避跨 realm 原型差异
    context.__brewConfigs = vm.runInContext('RECIPE_BREW_PARAM_CONFIGS', context);
    // 页面加载期快照 + 商品数据均为可注入的全局（var 声明挂 context 对象）
    vm.runInContext('var productBeansSnapshot = null; var productData = {};', context);
    return context;
}

function brewConfig(runtime, key) {
    return runtime.__brewConfigs.find(item => item.key === key);
}

const BEAN_PRODUCT = { tagI18n: { beans: { '金奖黑咖-浓香意式': { zh: '金奖黑咖-浓香意式' } } } };
const NO_BEAN_PRODUCT = { tagI18n: { temperature: { 热: { zh: '热' } } } };
const UNEDITED_PRODUCT = { names: { zh: '未编辑过选项的商品' } };

test('萃取参数数值应按步进对齐并 clamp 到范围（含负值）', () => {
    const runtime = createBrewRuntime();
    assert.strictEqual(runtime.normalizeRecipeBrewParamValue(999, brewConfig(runtime, 'waterQuantity')), 262, '超出上限应截断（WaterQ 模板机口径）');
    assert.strictEqual(runtime.normalizeRecipeBrewParamValue(-5, brewConfig(runtime, 'waterQuantity')), 0, '低于下限应截断');
    assert.strictEqual(runtime.normalizeRecipeBrewParamValue(1.4, brewConfig(runtime, 'cakeThickness')), 3, '粉饼厚度下限应为 3mm（CakeTh DB 口径）');
    assert.strictEqual(runtime.normalizeRecipeBrewParamValue(11.3, brewConfig(runtime, 'cakeThickness')), 11.5, '0.5 步进应四舍五入到最近档');
    assert.strictEqual(runtime.normalizeRecipeBrewParamValue(11.2, brewConfig(runtime, 'cakeThickness')), 11, '0.5 步进向下档应对齐');
    assert.strictEqual(runtime.normalizeRecipeBrewParamValue(-0.5, brewConfig(runtime, 'secondTamping')), -0.5, '负值默认应保留');
    assert.strictEqual(runtime.normalizeRecipeBrewParamValue(-99, brewConfig(runtime, 'secondTamping')), -5, '负向超限应截断（PressAf 口径 ±5）');
});

test('压粉力度应为三档离散值 64/92/120（20/40/60kg）', () => {
    const runtime = createBrewRuntime();
    const cfg = brewConfig(runtime, 'tamping');
    assert.strictEqual(cfg.discrete, true, '压粉力度应为离散参数');
    assert.strictEqual(
        JSON.stringify(cfg.options.map(option => option.value)),
        '[64,92,120]',
        '档位值应为下发口径 64/92/120'
    );
    // 旧数据存的 kg 数值（20/21）自然迁移到最近的 64 档（=20kg）
    assert.strictEqual(runtime.normalizeRecipeBrewParamValue(20, cfg), 64, '旧 kg 值应迁移到 20kg 档');
    assert.strictEqual(runtime.normalizeRecipeBrewParamValue(21, cfg), 64);
    assert.strictEqual(runtime.normalizeRecipeBrewParamValue(50, cfg), 64, '中间值归最近档');
    assert.strictEqual(runtime.normalizeRecipeBrewParamValue(999, cfg), 120, '超限归最高档');
    assert.strictEqual(runtime.formatRecipeBrewParamValue(64, cfg), '20kg', '档位应显示 kg 口径');
    assert.strictEqual(runtime.formatRecipeBrewParamValue(120, cfg), '60kg');
});

test('有咖啡豆的饮品应补全六项萃取参数默认值，无豆饮品不携带', () => {
    const runtime = createBrewRuntime();
    runtime.productBeansSnapshot = true;
    const withBeans = runtime.ensureRecipeBrewParams({});
    assert.strictEqual(JSON.stringify(withBeans.brewParams), JSON.stringify({
        waterQuantity: 90,
        cakeThickness: 23,
        tamping: 64,
        preInfusion: 0,
        relaxTime: 1,
        secondTamping: -0.5
    }));

    runtime.productBeansSnapshot = false;
    const noBeans = runtime.ensureRecipeBrewParams({ brewParams: { tamping: 22 } });
    assert.strictEqual('brewParams' in noBeans, false, '无豆饮品应剥离 brewParams');

    // 快照缺失时退回当前 tagI18n（测试等注入场景），且快照优先于被播种污染的 tagI18n。
    // 三态语义：编辑过且有豆 true / 编辑过且无豆 false / 未编辑过（无 tagI18n）默认含豆 true。
    runtime.productBeansSnapshot = null;
    runtime.productData = BEAN_PRODUCT;
    assert.strictEqual(runtime.hasBeansTagInProduct(), true);
    runtime.productData = NO_BEAN_PRODUCT;
    assert.strictEqual(runtime.hasBeansTagInProduct(), false);
    runtime.productData = UNEDITED_PRODUCT;
    assert.strictEqual(runtime.hasBeansTagInProduct(), true, '未编辑过选项的商品应跟随默认模板视为含豆');
    runtime.productData = {};
    assert.strictEqual(runtime.hasBeansTagInProduct(), true, '空商品数据应跟随默认模板视为含豆');
    runtime.productBeansSnapshot = false;
    runtime.productData = BEAN_PRODUCT;
    assert.strictEqual(runtime.productHasBeansOption(), false, '快照 false 应压过 tagI18n 有豆');
});

test('normalizeRecipeData 应保留并补齐已有萃取参数，无则不凭空添加', () => {
    const runtime = createBrewRuntime();
    const withParams = runtime.normalizeRecipeData({
        groups: {},
        brewParams: { waterQuantity: 85, tamping: 999 }
    });
    assert.strictEqual(withParams.brewParams.waterQuantity, 85, '已有合法值应保留');
    assert.strictEqual(withParams.brewParams.tamping, 120, '离散参数超限应归到最近档（60kg）');
    assert.strictEqual(withParams.brewParams.secondTamping, -0.5, '缺失项应按默认补齐');
    assert.strictEqual(Object.keys(withParams.brewParams).length, 6);

    const withoutParams = runtime.normalizeRecipeData({ groups: {} });
    assert.strictEqual('brewParams' in withoutParams, false, '无 brewParams 时不应添加');
});

test('萃取参数变化应进入修改前后 diff，且不影响容量合计口径', () => {
    const runtime = createBrewRuntime();
    runtime.productBeansSnapshot = true;
    const base = runtime.ensureRecipeBrewParams({});
    // 压粉从默认 64（20kg）切到 92（40kg）：档位变化
    const discreteEdited = runtime.ensureRecipeBrewParams({ brewParams: { ...base.brewParams, tamping: 92 } });
    const discreteDiffs = runtime.getRecipeVariantDiffs(base, discreteEdited);
    assert.strictEqual(discreteDiffs.length, 1, '只切压粉档位应恰好一条 diff');
    assert.strictEqual(discreteDiffs[0].label, '压粉力度');
    assert.strictEqual(discreteDiffs[0].isDiscrete, true);
    assert.strictEqual(discreteDiffs[0].displayBefore, '20kg', 'diff 应展示 kg 档位口径');
    assert.strictEqual(discreteDiffs[0].displayAfter, '40kg');

    // 连续参数变化：保持数值+单位 / delta 增量的常规显示
    const edited = runtime.ensureRecipeBrewParams({ brewParams: { ...base.brewParams, relaxTime: 2 } });
    const diffs = runtime.getRecipeVariantDiffs(base, edited);
    assert.strictEqual(diffs.length, 1, '只改松弛时间应恰好一条 diff');
    assert.strictEqual(diffs[0].label, '松弛时间');
    assert.strictEqual(diffs[0].unit, 's');
    assert.strictEqual(diffs[0].delta, 1);
    assert.strictEqual(diffs[0].displayBefore, undefined, '连续参数不应带档位展示字段');

    assert.strictEqual(runtime.getRecipeVariantDiffs(base, base).length, 0, '无变化应无 diff');

    const noneAfter = runtime.getRecipeVariantDiffs(base, runtime.ensureRecipeBrewParams({}));
    assert.strictEqual(noneAfter.length, 0, '两侧同为默认值应无 diff');
});
