const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'overview.html'), 'utf8');

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

test('侧边栏顶部应展示登录名称和电话', () => {
  assert.ok(/id="sidebarLoginName"/.test(html));
  assert.ok(/id="sidebarLoginPhone"/.test(html));
  assert.ok(/class="sidebar-login-name"/.test(html));
  assert.ok(/class="sidebar-login-phone"/.test(html));
});

test('侧边栏登录信息应在初始化时渲染并支持本地配置', () => {
  assert.ok(/const\s+SIDEBAR_LOGIN_PROFILE_KEY\s*=\s*'sidebarLoginProfile'/.test(html));
  assert.ok(/function\s+getSidebarLoginProfile\(\)/.test(html));
  assert.ok(/localStorage\.getItem\(SIDEBAR_LOGIN_PROFILE_KEY\)/.test(html));
  assert.ok(/function\s+renderSidebarLoginProfile\(\)/.test(html));
  assert.ok(/renderSidebarLoginProfile\(\);/.test(html));
});

test('侧边栏登录名称和电话应保持左对齐单行排布', () => {
  assert.ok(/\.sidebar-login\s*\{[\s\S]*justify-content:\s*flex-start;/.test(html));
  assert.ok(/\.sidebar-login-name\s*\{[\s\S]*flex:\s*0 0 auto;/.test(html));
  assert.ok(/\.sidebar-login-phone\s*\{[\s\S]*flex:\s*0 0 auto;/.test(html));
});

test('侧边栏登录信息应与“运营管理”标题左边缘对齐', () => {
  assert.ok(/--sidebar-header-padding-x:\s*24px;/.test(html));
  assert.ok(/--sidebar-nav-padding-x:\s*12px;/.test(html));
  assert.ok(/--sidebar-section-title-padding-x:\s*14px;/.test(html));
  assert.ok(/padding-left:\s*calc\(var\(--sidebar-nav-padding-x\)\s*\+\s*var\(--sidebar-section-title-padding-x\)\s*-\s*var\(--sidebar-header-padding-x\)\);/.test(html));
});
