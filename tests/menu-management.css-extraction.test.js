const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { getPageCss } = require('./helpers/page-css');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));

test('html 引入外部页面 CSS', () => {
  assert.ok(/<link rel="stylesheet" href="pages\/menu-management\/menu-management\.css">/.test(read('menu-management.html')));
});
test('html 不再有内联 <style>', () => {
  const html = read('menu-management.html');
  assert.ok(!html.includes('<style'), '仍有 <style');
  assert.ok(!html.includes('</style>'), '仍有 </style>');
});
test('页面 CSS 文件存在且非空', () => {
  assert.ok(exists('pages/menu-management/menu-management.css'));
  assert.ok(read('pages/menu-management/menu-management.css').length > 50000);
});
test('getPageCss 仍能取到关键规则（经外部文件）', () => {
  const css = getPageCss('menu-management.html');
  assert.ok(/grid-template-columns:\s*repeat\(5,/.test(css), '丢失 5 列网格规则');
  assert.ok(css.includes('.sidebar'), '丢失侧边栏样式');
});
