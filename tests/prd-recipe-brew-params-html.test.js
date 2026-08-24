const assert = require('assert');
const fs = require('fs');
const path = require('path');

const mdPath = path.join(__dirname, '..', 'tasks', 'prd-recipe-brew-params.md');
const htmlPath = path.join(__dirname, '..', 'tasks', 'prd-recipe-brew-params.html');
const siteIndexPath = path.join(__dirname, '..', 'scripts', 'prd_site_index.html');
const screenshotDir = path.join(__dirname, '..', 'screenshots', 'recipe-brew-prd');

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

test('咖啡萃取参数 PRD 应同时提供 Markdown 源文件与自包含 HTML 产物', () => {
    assert.ok(fs.existsSync(mdPath), 'missing markdown PRD source');
    assert.ok(fs.existsSync(htmlPath), 'missing standalone HTML PRD artifact');
});

test('咖啡萃取参数 PRD 应定义六项参数与下发字段口径', () => {
    const markdown = fs.readFileSync(mdPath, 'utf8');

    [
        '产品需求文档：咖啡萃取参数配置',
        '有咖啡豆的饮品',
        '萃取水量',
        '粉饼厚度',
        '压粉力度',
        '预浸泡时间',
        '松弛时间',
        '二次压粉',
        '三档 64 / 92 / 120（= 20 / 40 / 60kg）',
        '不计入容量总量',
        '默认收起',
        '无豆饮品不展示萃取参数分区'
    ].forEach(snippet => {
        assert.ok(markdown.includes(snippet), `markdown missing snippet: ${snippet}`);
    });

    ['UF-001', 'UF-002', 'UF-003', 'UF-004', 'UF-005', 'UF-006', 'UF-007'].forEach(flowId => {
        assert.ok(markdown.includes(`### ${flowId}`), `missing user flow section: ${flowId}`);
    });

    for (let i = 1; i <= 18; i += 1) {
        const frId = `FR-${String(i).padStart(3, '0')}`;
        assert.ok(markdown.includes(frId), `missing functional requirement: ${frId}`);
    }
});

test('咖啡萃取参数 PRD 应包含参考截图并在 HTML 中内联', () => {
    const markdown = fs.readFileSync(mdPath, 'utf8');
    const html = fs.readFileSync(htmlPath, 'utf8');

    const screenshotRefs = [
        { fileName: 'uf001-brew-section-collapsed.png', expectedSize: { width: 734, height: 792 } },
        { fileName: 'uf002-brew-section-expanded.png', expectedSize: { width: 734, height: 1286 } },
        { fileName: 'uf003-brew-diff-compare.png', expectedSize: { width: 734, height: 1402 } },
        { fileName: 'uf004-brew-changed-badge.png', expectedSize: { width: 688, height: 47 } },
        { fileName: 'uf005-brew-impact-modal.png', expectedSize: { width: 1440, height: 900 } },
        { fileName: 'uf006-no-bean-drink.png', expectedSize: { width: 734, height: 728 } }
    ];

    screenshotRefs.forEach(({ fileName, expectedSize }) => {
        const screenshotPath = path.join(screenshotDir, fileName);
        assert.ok(fs.existsSync(screenshotPath), `missing screenshot file: ${fileName}`);
        assert.deepStrictEqual(
            readPngSize(screenshotPath),
            expectedSize,
            `screenshot dimension changed, regenerate or update expectation: ${fileName}`
        );
        assert.ok(
            markdown.includes(`../screenshots/recipe-brew-prd/${fileName}`),
            `markdown missing screenshot reference: ${fileName}`
        );
    });

    const figureCount = (html.match(/<figure class="doc-image">/g) || []).length;
    const inlineImageCount = (html.match(/src="data:image\/png;base64,/g) || []).length;
    assert.ok(figureCount >= 9, 'expected reference screenshots for brew param flows (overview + user stories)');
    assert.strictEqual(inlineImageCount, figureCount, 'every figure should be inlined as base64');
    assert.ok(!html.includes('src="../screenshots/'), 'final HTML should not depend on relative screenshot paths');
});

test('咖啡萃取参数 PRD 不应把实现变量写进产品需求', () => {
    const markdown = fs.readFileSync(mdPath, 'utf8');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const siteIndex = fs.readFileSync(siteIndexPath, 'utf8');

    [
        '#recipeMainEditor',
        'RECIPE_BREW_PARAM_CONFIGS',
        'renderFetchedBrewParamRows',
        'adjustFetchedBrewParam',
        'setFetchedBrewParamValue',
        'ensureRecipeBrewParams',
        'recipeEditorState',
        'productBeansSnapshot',
        'localStorage',
        'tagI18n',
        'optionRecipes',
        'brewParams',
        'function '
    ].forEach(forbiddenText => {
        assert.ok(!markdown.includes(forbiddenText), `markdown should not include implementation detail: ${forbiddenText}`);
        assert.ok(!html.includes(forbiddenText), `HTML should not include implementation detail: ${forbiddenText}`);
    });

    assert.ok(
        siteIndex.includes('tasks/prd-recipe-brew-params.html'),
        'PRD site index should link the brew params PRD'
    );
});

test('咖啡萃取参数 PRD 目录应只列一级章节', () => {
    const html = fs.readFileSync(htmlPath, 'utf8');
    const tocMatch = html.match(/<nav class="toc">([\s\S]*?)<\/nav>/);
    assert.ok(tocMatch, 'missing table of contents');
    const tocLinkCount = (tocMatch[1].match(/<a href=/g) || []).length;
    assert.strictEqual(tocLinkCount, 11, 'TOC should list the 11 top-level sections');
    assert.ok(!tocMatch[1].includes('UF-001'), 'TOC should not list every user story');
});
