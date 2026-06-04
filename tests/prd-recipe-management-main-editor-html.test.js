const assert = require('assert');
const fs = require('fs');
const path = require('path');

const mdPath = path.join(__dirname, '..', 'tasks', 'prd-recipe-management-main-editor.md');
const htmlPath = path.join(__dirname, '..', 'tasks', 'prd-recipe-management-main-editor.html');
const siteHtmlPath = path.join(__dirname, '..', 'prd-site', 'tasks', 'prd-recipe-management-main-editor.html');
const siteIndexPath = path.join(__dirname, '..', 'prd-site', 'index.html');
const screenshotDir = path.join(__dirname, '..', 'screenshots', 'recipe-prd');

function readPngSize(filePath) {
    const buffer = fs.readFileSync(filePath);
    return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20)
    };
}

function test(name, fn) {
    try {
        fn();
        console.log(`PASS ${name}`);
    } catch (error) {
        console.error(`FAIL ${name}`);
        console.error(error.message);
        process.exitCode = 1;
    }
}

test('配方管理 PRD 应同时提供 Markdown 源文件和 HTML 产物', () => {
    assert.ok(fs.existsSync(mdPath), 'missing markdown PRD source');
    assert.ok(fs.existsSync(htmlPath), 'missing standalone HTML PRD artifact');
    assert.ok(fs.existsSync(siteHtmlPath), 'missing PRD site HTML artifact');
});

test('配方管理 PRD 应以选项驱动获取配方作为当前规则', () => {
    const markdown = fs.readFileSync(mdPath, 'utf8');

    [
        '产品需求文档：配方管理（选项驱动获取配方）',
        '运营人员需要先按客户购买场景选择咖啡豆、温度、浓度',
        '只有获取成功后，左侧才展示该组合对应的配方成分',
        '未获取配方前，左侧不展示成分剂量',
        '页面必须展示咖啡豆、温度、浓度三个分组',
        '点击“获取配方”成功后，左侧才展示配方成分',
        '改选任一客户选项后，不能静默沿用旧配方保存',
        '保存栏必须展示当前客户选项组合'
    ].forEach(snippet => {
        assert.ok(markdown.includes(snippet), `markdown missing snippet: ${snippet}`);
    });

    [
        'UF-001',
        'UF-002',
        'UF-003',
        'UF-004',
        'UF-005',
        'UF-006',
        'UF-007',
        'UF-008',
        'UF-009',
        'UF-010',
        'UF-011'
    ].forEach(flowId => {
        assert.ok(markdown.includes(`### ${flowId}`), `missing user flow section: ${flowId}`);
    });

    [
        '进入配方配置后，无需打开弹窗即可开始编辑当前杯型',
        '配方配置页签必须直接展示主编辑器',
        '进入页面后直接展示主编辑器',
        '杯型切换',
        '保存栏必须展示已修改杯型数量',
        '当前杯型',
        '默认杯型'
    ].forEach(forbiddenText => {
        assert.ok(!markdown.includes(forbiddenText), `markdown should not keep old direct-editor rule: ${forbiddenText}`);
    });
});

test('配方管理 PRD 应包含参考截图并在 HTML 中内联', () => {
    const markdown = fs.readFileSync(mdPath, 'utf8');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const siteHtml = fs.readFileSync(siteHtmlPath, 'utf8');

    const screenshotRefs = [
        {
            markdownPath: '../screenshots/recipe-prd/uf001-option-selection-before-fetch.png',
            fileName: 'uf001-option-selection-before-fetch.png',
            expectedSize: { width: 1312, height: 763 }
        },
        {
            markdownPath: '../screenshots/recipe-prd/uf002-option-groups-selected.png',
            fileName: 'uf002-option-groups-selected.png',
            expectedSize: { width: 430, height: 659 }
        },
        {
            markdownPath: '../screenshots/recipe-prd/uf003-recipe-after-fetch.png',
            fileName: 'uf003-recipe-after-fetch.png',
            expectedSize: { width: 1312, height: 761 }
        },
        {
            markdownPath: '../screenshots/recipe-prd/uf004-ingredients-after-fetch.png',
            fileName: 'uf004-ingredients-after-fetch.png',
            expectedSize: { width: 858, height: 761 }
        }
    ];

    screenshotRefs.forEach(({ markdownPath, fileName, expectedSize }) => {
        const screenshotPath = path.join(screenshotDir, fileName);
        assert.ok(fs.existsSync(screenshotPath), `missing screenshot file: ${fileName}`);
        assert.deepStrictEqual(
            readPngSize(screenshotPath),
            expectedSize,
            `screenshot should be regenerated from the main-editor mockup: ${fileName}`
        );
        assert.ok(markdown.includes(markdownPath), `markdown missing screenshot reference: ${markdownPath}`);
    });

    const figureCount = (html.match(/<figure class="doc-image">/g) || []).length;
    const inlineImageCount = (html.match(/src="data:image\/png;base64,/g) || []).length;
    assert.ok(figureCount >= 8, 'expected reference screenshots for key recipe flows');
    assert.ok(inlineImageCount >= 8, 'expected screenshots to be inlined in standalone HTML');
    assert.ok(!html.includes('src="../screenshots/'), 'final HTML should not depend on relative screenshot paths');
    assert.strictEqual(html, siteHtml, 'site HTML should match repository HTML artifact');
});

test('配方管理 PRD 不应把实现变量写进产品需求', () => {
    const markdown = fs.readFileSync(mdPath, 'utf8');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const siteIndex = fs.readFileSync(siteIndexPath, 'utf8');

    [
        '#recipeMainEditor',
        '#recipeCupSwitcher',
        '#recipeChangeComparePanel',
        '#recipeStickySaveBar',
        'saveRecipeEditor',
        'recipeEditorState',
        'buildRecipeCupConfigsFromState',
        'calculateRecipeCupCapacity',
        'renderRecipeMainEditor',
        'localStorage',
        '生产 DOM 约定',
        '数据与技术契约',
        '杯型切换',
        '保存栏必须展示已修改杯型数量',
        '当前杯型',
        '默认杯型'
    ].forEach(forbiddenText => {
        assert.ok(!markdown.includes(forbiddenText), `markdown should not include implementation detail: ${forbiddenText}`);
        assert.ok(!html.includes(forbiddenText), `HTML should not include implementation detail: ${forbiddenText}`);
    });

    assert.ok(
        siteIndex.includes('tasks/prd-recipe-management-main-editor.html'),
        'PRD site index should link recipe management main editor PRD'
    );
});

test('配方管理 HTML PRD 目录应保持紧凑且只展示一级章节', () => {
    const html = fs.readFileSync(htmlPath, 'utf8');
    const tocMatch = html.match(/<nav class="toc" aria-label="目录">([\s\S]*?)<\/nav>/);
    assert.ok(tocMatch, 'missing table of contents');

    const toc = tocMatch[1];
    const tocItemCount = (toc.match(/class="toc-item"/g) || []).length;
    assert.strictEqual(tocItemCount, 11, 'TOC should list top-level sections only');
    assert.ok(toc.includes('按章节快速跳转'), 'TOC should explain that details are in the body');
    assert.ok(!toc.includes('level-3'), 'TOC should not flatten third-level headings');
    assert.ok(!toc.includes('UF-001'), 'TOC should not list every user story');
    assert.ok(!toc.includes('5.1 页面入口与状态'), 'TOC should not list every functional subsection');
});
