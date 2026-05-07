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

test('同款侧栏登录信息不应以横杠作为初始占位', () => {
  for (const filename of sidebarFiles) {
    const html = fs.readFileSync(path.join(__dirname, '..', filename), 'utf8');
    assert.ok(/<div class="sidebar-login-name" id="sidebarLoginName">运营管理员<\/div>/.test(html), `${filename} 登录名初始值不应显示 -`);
    assert.ok(/<div class="sidebar-login-phone" id="sidebarLoginPhone">13800138000<\/div>/.test(html), `${filename} 登录电话初始值不应显示 -`);
  }
});

test('同款侧栏页面应统一读取 sidebarLoginProfile 并初始化渲染', () => {
  for (const filename of sidebarFiles) {
    const html = fs.readFileSync(path.join(__dirname, '..', filename), 'utf8');
    assert.ok(/const\s+SIDEBAR_LOGIN_PROFILE_KEY\s*=\s*'sidebarLoginProfile'/.test(html), `${filename} 缺少 SIDEBAR_LOGIN_PROFILE_KEY`);
    assert.ok(/const\s+LOGIN_SESSION_KEY\s*=\s*'cofeLoginSession'/.test(html), `${filename} 缺少 LOGIN_SESSION_KEY`);
    assert.ok(/const\s+LOGIN_PAGE_URL\s*=\s*'login-paper\.html'/.test(html), `${filename} 缺少登录页跳转地址`);
    assert.ok(/const\s+DEFAULT_SIDEBAR_LOGIN_PROFILE\s*=\s*\{[\s\S]*name:\s*'运营管理员'[\s\S]*phone:\s*'13800138000'[\s\S]*\}/.test(html), `${filename} 缺少默认登录信息`);
    assert.ok(/function\s+getSidebarLoginProfile\(\)/.test(html), `${filename} 缺少 getSidebarLoginProfile`);
    assert.ok(/localStorage\.getItem\(SIDEBAR_LOGIN_PROFILE_KEY\)/.test(html), `${filename} 未读取 sidebarLoginProfile`);
    assert.ok(/function\s+renderSidebarLoginProfile\(\)/.test(html), `${filename} 缺少 renderSidebarLoginProfile`);
    assert.ok(/renderSidebarLoginProfile\(\);/.test(html), `${filename} 缺少初始化渲染调用`);
  }
});


test('同款侧栏页面应提供退出登录入口并回到登录页', () => {
  for (const filename of sidebarFiles) {
    const html = fs.readFileSync(path.join(__dirname, '..', filename), 'utf8');
    assert.ok(/id="sidebarLogoutButton"/.test(html), `${filename} 缺少退出登录按钮`);
    assert.ok(/class="sidebar-logout-btn"/.test(html), `${filename} 缺少退出登录按钮样式类`);
    assert.ok(/onclick="handleSidebarLogout\(\)"/.test(html), `${filename} 退出按钮未绑定 handleSidebarLogout`);
    assert.ok(/function\s+handleSidebarLogout\(\)/.test(html), `${filename} 缺少 handleSidebarLogout`);
    assert.ok(/localStorage\.removeItem\(LOGIN_SESSION_KEY\)/.test(html), `${filename} 未清理登录会话`);
    assert.ok(/localStorage\.removeItem\(SIDEBAR_LOGIN_PROFILE_KEY\)/.test(html), `${filename} 未清理侧栏登录信息`);
    assert.ok(/window\.location\.href\s*=\s*LOGIN_PAGE_URL/.test(html), `${filename} 未跳回登录页`);
  }
});
