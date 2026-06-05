const assert = require('assert');
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'tasks', 'prd-product-management-user-flow.html');

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

test('商品管理 PRD 应提供独立 HTML 产物', () => {
  assert.ok(fs.existsSync(htmlPath), 'missing standalone HTML PRD artifact');
});

test('商品管理 HTML PRD 应包含所有用户流程与正式截图引用', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');

  [
    'UF-001',
    'UF-002',
    'UF-003',
    'UF-004',
    'UF-005',
    'UF-007',
    'UF-009',
    'UF-010',
    'UF-011',
    'UF-012'
  ].forEach(flowId => {
    assert.ok(html.includes(flowId), `missing user flow section: ${flowId}`);
  });
  assert.ok(!html.includes('UF-006'), 'UF-006 should be removed from the PRD');
  assert.ok(!html.includes('UF-008'), 'UF-008 should be removed from the PRD');
  assert.ok(!html.includes('印花图片设置'), 'imprint image content should be removed from the PRD');

  const figureCount = (html.match(/<figure class="doc-image">/g) || []).length;
  const inlineImageCount = (html.match(/src="data:image\/png;base64,/g) || []).length;
  const screenshotRefs = Array.from(html.matchAll(/src="\.\.\/screenshots\/product-prd\/([^"]+)"/g)).map(match => match[1]);
  const expectedRefs = [
    'uf005-category-manage.png',
    'uf009-basic-settings.png',
    'uf010-language.png',
    'uf011-batch-pricing.png',
    'uf012-preview.png'
  ];

  assert.ok(figureCount >= 10, 'expected ten screenshot figures after removing UF-006');
  assert.ok(inlineImageCount >= 5, 'expected existing inline screenshots to remain for earlier user flows');
  assert.ok(html.includes('UF-007：调整商品所属分类与排序（本次未实现）'), 'UF-007 should be marked as not implemented this release');
  assert.ok(html.includes('商品所属分类调整、分类排序、商品排序相关需求均保留为后续版本待办'), 'UF-007 should keep all related capability as future scope');
  assert.ok(html.includes('后续主流程（本次不实现）'), 'UF-007 flow should be marked future-only');
  assert.ok(html.includes('后续验收标准（本次不验收）'), 'UF-007 criteria should remain out of scope');
  assert.ok(html.includes('复制商品每次只能复制到一台目标设备'), 'copy product scope note should call out single target device limit');
  assert.deepStrictEqual(screenshotRefs.sort(), expectedRefs.sort(), 'expected formal screenshot refs for UF-005 and UF-009 to UF-012');

  expectedRefs.forEach(fileName => {
    const screenshotPath = path.join(__dirname, '..', 'screenshots', 'product-prd', fileName);
    assert.ok(fs.existsSync(screenshotPath), `missing screenshot asset: ${fileName}`);
  });
});
