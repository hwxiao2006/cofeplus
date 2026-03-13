const assert = require('assert');
const fs = require('fs');
const path = require('path');

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

function readMenuManagementHtml() {
  return fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
}

test('菜单分类导航应包含拖拽手柄与可拖拽属性', () => {
  const html = readMenuManagementHtml();
  assert.ok(html.includes('class="drag-handle"'));
  assert.ok(html.includes('draggable="true"'));
  assert.ok(html.includes('data-category-key="'));
});

test('菜单分类排序应包含拖拽事件处理函数', () => {
  const html = readMenuManagementHtml();
  assert.ok(/function\s+handleMenuManageCategoryDragStart\s*\(/.test(html));
  assert.ok(/function\s+handleMenuManageCategoryDragOver\s*\(/.test(html));
  assert.ok(/function\s+handleMenuManageCategoryDrop\s*\(/.test(html));
  assert.ok(/function\s+handleMenuManageCategoryDragEnd\s*\(/.test(html));
});

test('菜单分类排序应支持移动端触摸拖拽', () => {
  const html = readMenuManagementHtml();
  assert.ok(/function\s+handleMenuManageCategoryTouchStart\s*\(/.test(html));
  assert.ok(/function\s+handleMenuManageCategoryTouchMove\s*\(/.test(html));
  assert.ok(/function\s+handleMenuManageCategoryTouchEnd\s*\(/.test(html));
  assert.ok(/addEventListener\('touchstart',\s*handleMenuManageCategoryTouchStart/.test(html));
});

test('菜单分类排序应包含本地持久化逻辑', () => {
  const html = readMenuManagementHtml();
  assert.ok(html.includes("const MENU_MANAGE_CATEGORY_ORDER_KEY = 'categoryOrder'"));
  assert.ok(/function\s+saveMenuManageCategoryOrder\s*\(/.test(html));
  assert.ok(/function\s+loadMenuManageCategoryOrder\s*\(/.test(html));
  assert.ok(/function\s+getMenuManageCategoryKeys\s*\(/.test(html));
  assert.ok(/localStorage\.setItem\(MENU_MANAGE_CATEGORY_ORDER_KEY/.test(html));
});
