const assert = require('assert');
const fs = require('fs');
const path = require('path');

const sidebarFiles = [
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

test('同款侧栏页面应统一显示登录名和电话', () => {
  for (const filename of sidebarFiles) {
    const html = fs.readFileSync(path.join(__dirname, '..', filename), 'utf8');
    assert.ok(/id="sidebarLoginName"/.test(html), `${filename} 缺少 sidebarLoginName`);
    assert.ok(/id="sidebarLoginPhone"/.test(html), `${filename} 缺少 sidebarLoginPhone`);
    assert.ok(/class="sidebar-login-name"/.test(html), `${filename} 缺少 sidebar-login-name`);
    assert.ok(/class="sidebar-login-phone"/.test(html), `${filename} 缺少 sidebar-login-phone`);
  }
});

test('同款侧栏页面应统一读取 sidebarLoginProfile 并初始化渲染', () => {
  for (const filename of sidebarFiles) {
    const html = fs.readFileSync(path.join(__dirname, '..', filename), 'utf8');
    assert.ok(/const\s+SIDEBAR_LOGIN_PROFILE_KEY\s*=\s*'sidebarLoginProfile'/.test(html), `${filename} 缺少 SIDEBAR_LOGIN_PROFILE_KEY`);
    assert.ok(/const\s+DEFAULT_SIDEBAR_LOGIN_PROFILE\s*=\s*\{[\s\S]*name:\s*'运营管理员'[\s\S]*phone:\s*'13800138000'[\s\S]*\}/.test(html), `${filename} 缺少默认登录信息`);
    assert.ok(/function\s+getSidebarLoginProfile\(\)/.test(html), `${filename} 缺少 getSidebarLoginProfile`);
    assert.ok(/localStorage\.getItem\(SIDEBAR_LOGIN_PROFILE_KEY\)/.test(html), `${filename} 未读取 sidebarLoginProfile`);
    assert.ok(/function\s+renderSidebarLoginProfile\(\)/.test(html), `${filename} 缺少 renderSidebarLoginProfile`);
    assert.ok(/renderSidebarLoginProfile\(\);/.test(html), `${filename} 缺少初始化渲染调用`);
  }
});
