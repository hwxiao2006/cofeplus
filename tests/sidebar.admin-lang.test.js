const assert = require('assert');
const fs = require('fs');
const path = require('path');

const sidebarPages = [
  'overview.html',
  'menu.html',
  'menu-management.html',
  'devices.html',
  'orders.html',
  'materials.html',
  'faults.html',
  'customers.html',
  'locations.html',
  'staff-management.html',
  'product-detail.html'
];

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
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

test('所有侧栏页面都应提供独立的后台菜单语言切换', () => {
  sidebarPages.forEach(file => {
    const html = read(file);
    assert.ok(/const\s+ADMIN_SIDEBAR_LANG_KEY\s*=\s*'adminSidebarLang'/.test(html), `${file} 缺少 adminSidebarLang 存储 key`);
    assert.ok(/class="sidebar-admin-lang"/.test(html), `${file} 缺少侧栏语言切换容器`);
    assert.ok(/class="sidebar-meta-row"/.test(html), `${file} 缺少头部元信息行`);
    assert.ok(/<div class="sidebar-meta-row">[\s\S]*?<div class="brand-version">Prototype v0<\/div>[\s\S]*?<div class="sidebar-admin-lang"/.test(html), `${file} 语言切换未与 Prototype v0 放在同一行`);
    assert.ok(/data-admin-lang-option="zh"/.test(html), `${file} 缺少中文切换按钮`);
    assert.ok(/data-admin-lang-option="en"/.test(html), `${file} 缺少英文切换按钮`);
    assert.ok(/function\s+renderAdminSidebarTranslations\(\)/.test(html), `${file} 缺少侧栏翻译渲染函数`);
    assert.ok(/function\s+setAdminSidebarLang\(lang\)/.test(html), `${file} 缺少侧栏语言切换函数`);
    assert.ok(/brand_console/.test(html), `${file} 缺少品牌翻译 key`);
    assert.ok(/nav_overview/.test(html), `${file} 缺少菜单翻译 key`);
    assert.ok(/page_product_detail|page_overview|page_devices|page_menu_management|page_materials|page_orders|page_faults|page_customers|page_locations|page_staff_management/.test(html), `${file} 缺少移动端标题翻译 key`);
    assert.ok(/\.sidebar-meta-row\s*\{[\s\S]*padding-left:\s*calc\(var\(--sidebar-nav-padding-x\)\s*\+\s*var\(--sidebar-section-title-padding-x\)\s*-\s*var\(--sidebar-header-padding-x\)\);/.test(html), `${file} 元信息行未与菜单文字对齐`);
  });
});

test('商品管理页应保持后台菜单语言与 platformLang 分离', () => {
  const html = read('menu-management.html');
  assert.ok(/const\s+PLATFORM_LANG_STORAGE_KEY\s*=\s*'platformLang'/.test(html));
  assert.ok(/const\s+ADMIN_SIDEBAR_LANG_KEY\s*=\s*'adminSidebarLang'/.test(html));
});
