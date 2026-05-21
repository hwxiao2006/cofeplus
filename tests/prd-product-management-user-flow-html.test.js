const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('node:test');

const html = fs.readFileSync(
  path.join(__dirname, '..', 'tasks', 'prd-product-management-user-flow.html'),
  'utf8'
);
const extensionlessHtml = fs.readFileSync(
  path.join(__dirname, '..', 'tasks', 'prd-product-management-user-flow'),
  'utf8'
);

test('商品管理 PRD 应提供独立 HTML 产物并使用生产域名作为截图标准', () => {
  assert.ok(html.includes('产品需求文档：商品管理（按用户流程）'));
  assert.ok(html.includes('https://cofeplus.pages.dev'));
  assert.strictEqual(extensionlessHtml, html);
});

test('商品管理 PRD 应明确当前只支持是否热销，不实现业务标签功能', () => {
  assert.ok(html.includes('是否热销'));
  assert.ok(html.includes('featured'));
  assert.ok(html.includes('业务标签功能本期不实现'));
  assert.ok(html.includes('codex/business-tags-archive'));
});

test('商品管理 PRD 应标记 UF007 不实现，并收敛复制商品范围', () => {
  assert.ok(html.includes('UF007'));
  assert.ok(html.includes('分类排序调整'));
  assert.ok(html.includes('商品所属分类调整'));
  assert.ok(html.includes('本期不实现'));
  assert.ok(html.includes('本期只支持复制到一台机器'));
});

test('商品管理 PRD 不应出现开发和测试不易理解的浏览器传输变量名', () => {
  assert.ok(!html.includes('window.name'));
});
