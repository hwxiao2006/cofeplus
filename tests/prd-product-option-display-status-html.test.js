const assert = require('assert');
const fs = require('fs');
const path = require('path');

const mdPath = path.join(__dirname, '..', 'tasks', 'prd-product-option-display-status.md');
const htmlPath = path.join(__dirname, '..', 'tasks', 'prd-product-option-display-status.html');
const siteIndexSourcePath = path.join(__dirname, '..', 'scripts', 'prd_site_index.html');
const screenshotDir = path.join(__dirname, '..', 'screenshots', 'option-status-prd');

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

test('选项状态 PRD 应同时提供 Markdown 源文件和 HTML 产物', () => {
    assert.ok(fs.existsSync(mdPath), 'missing markdown PRD source');
    assert.ok(fs.existsSync(htmlPath), 'missing standalone HTML PRD artifact');
});

test('选项状态 PRD 应覆盖三态模型与双热区交互', () => {
    const markdown = fs.readFileSync(mdPath, 'utf8');

    [
        '产品需求文档：商品选项点单屏展示状态（隐藏 / 不可用）',
        '灰显禁点，客户可见但无法选择',
        '长期下架',
        '临时缺货',
        '标签主体',
        '状态热区',
        '点击仅切换当前编辑对象',
        '再次点击同一个「▾」收起菜单',
        '每组至少保留一个正常选项',
        '默认选项自动改为该组第一个「正常」状态的选项',
        '恢复「正常」永远允许，且不触发任何迁移',
        '底部动作面板',
        '修改状态后不保存，直接打开点单屏预览',
        '没有状态数据的存量商品行为不变'
    ].forEach(snippet => {
        assert.ok(markdown.includes(snippet), `markdown missing snippet: ${snippet}`);
    });

    ['US-001', 'US-002', 'US-003', 'US-004', 'US-005', 'US-006'].forEach(storyId => {
        assert.ok(markdown.includes(`### ${storyId}`), `missing user story section: ${storyId}`);
    });
});

test('选项状态 PRD 不应描述已废弃的交互（点标签必弹菜单 / 编辑器内嵌 radio / 抽屉）', () => {
    const markdown = fs.readFileSync(mdPath, 'utf8');

    [
        '点击标签可切换编辑对象，并设置点单屏展示状态',
        '抽屉',
        '单选按钮',
        'radio'
    ].forEach(forbiddenText => {
        assert.ok(!markdown.includes(forbiddenText), `markdown should not keep deprecated interaction: ${forbiddenText}`);
    });
});

test('选项状态 PRD 不应把实现标识符写进产品需求', () => {
    const markdown = fs.readFileSync(mdPath, 'utf8');

    [
        'tagOptionStatus',
        'setTagOptionStatus',
        'resolveOptionStatusChange',
        'existing-tag-status-trigger',
        'openTagStatusMenuFromChip',
        'localStorage',
        'postMessage'
    ].forEach(forbiddenText => {
        assert.ok(!markdown.includes(forbiddenText), `markdown should not include implementation detail: ${forbiddenText}`);
    });
});

test('选项状态 PRD 参考截图应存在并在 HTML 中内联', () => {
    const markdown = fs.readFileSync(mdPath, 'utf8');
    const html = fs.readFileSync(htmlPath, 'utf8');

    [
        'chips-status-badge.png',
        'status-menu-desktop.png',
        'status-menu-mobile-sheet.png',
        'order-preview-disabled-grey.png'
    ].forEach(fileName => {
        assert.ok(fs.existsSync(path.join(screenshotDir, fileName)), `missing screenshot file: ${fileName}`);
        assert.ok(
            markdown.includes(`../screenshots/option-status-prd/${fileName}`),
            `markdown missing screenshot reference: ${fileName}`
        );
    });

    const inlineImageCount = (html.match(/src="data:image\/png;base64,/g) || []).length;
    assert.ok(inlineImageCount >= 4, 'expected all screenshots to be inlined in standalone HTML');
    assert.ok(!html.includes('src="../screenshots/'), 'final HTML should not depend on relative screenshot paths');
});

test('PRD 站索引源文件应链接选项状态 PRD', () => {
    const siteIndex = fs.readFileSync(siteIndexSourcePath, 'utf8');
    assert.ok(
        siteIndex.includes('tasks/prd-product-option-display-status.html'),
        'PRD site index source should link option display status PRD'
    );
});
