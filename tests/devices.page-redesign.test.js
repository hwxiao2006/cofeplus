const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'devices.html'), 'utf8');

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

test('设备页应引入 Sora 与 IBM Plex Mono 字体', () => {
  assert.ok(/fonts\.googleapis\.com\/css2\?family=Sora/.test(html));
  assert.ok(/IBM\+Plex\+Mono/.test(html));
});

test('设备页应保留新设计变量，但菜单样式回到共享侧栏结构', () => {
  assert.ok(/--bg-page:\s*#FAFAFA/.test(html));
  assert.ok(/--font-ui:\s*'Sora',\s*sans-serif/.test(html));
  assert.ok(/--font-data:\s*'IBM Plex Mono',\s*monospace/.test(html));
  assert.ok(/\.sidebar\s*\{[\s\S]*--sidebar-header-padding-x:\s*24px;/.test(html));
  assert.ok(/\.sidebar\s*\{[\s\S]*width:\s*240px/.test(html));
  assert.ok(/\.main\s*\{[\s\S]*margin-left:\s*240px/.test(html));
  assert.ok(/id="sidebarLoginName"/.test(html));
  assert.ok(/id="sidebarLoginPhone"/.test(html));
});

test('设备页头部与筛选栏应使用新文案与录入入口', () => {
  assert.ok(/管理和监控所有咖啡设备/.test(html));
  assert.ok(/>\s*\+\s*设备录入\s*</.test(html));
  assert.ok(/placeholder="搜索设备编号或点位\.\.\."/.test(html));
  assert.ok(/<option value="all">全部状态<\/option>/.test(html));
  assert.ok(/<option value="all">全部点位<\/option>/.test(html));
  assert.ok(/\.page-primary-btn\s*\{[\s\S]*background:\s*#4ECDC4/.test(html));
  assert.ok(/\.page-primary-btn\s*\{[\s\S]*color:\s*#fff/.test(html));
  assert.ok(/\.page-primary-btn:hover\s*\{[\s\S]*background:\s*#3dbdb4/.test(html));
});

test('设备页顶部 header 应恢复为与其他页面一致的白底间距样式', () => {
  assert.ok(/\.header\s*\{[\s\S]*background:\s*var\(--bg-card\)/.test(html));
  assert.ok(/\.header\s*\{[\s\S]*padding:\s*20px 28px/.test(html));
  assert.ok(/\.header\s*\{[\s\S]*border-bottom:\s*1px solid var\(--border\)/.test(html));
  assert.ok(/@media\s*\(max-width:\s*768px\)[\s\S]*\.header\s*\{[\s\S]*padding:\s*16px/.test(html));
  assert.ok(!/\.header\s*\{[\s\S]*padding:\s*0;\s*[\s\S]*background:\s*transparent;\s*[\s\S]*border-bottom:\s*none;/.test(html));
});

test('设备页表格应使用新的列头结构', () => {
  assert.ok(/<th>设备编号<\/th>/.test(html));
  assert.ok(/<th>商户<\/th>/.test(html));
  assert.ok(/<th>点位<\/th>/.test(html));
  assert.ok(/<th>状态<\/th>/.test(html));
  assert.ok(/<th>停卖<\/th>/.test(html));
  assert.ok(/<th>最近心跳<\/th>/.test(html));
  assert.ok(/<th>操作<\/th>/.test(html));
  assert.ok(/\.table-container\s*\{[\s\S]*border-radius:\s*14px/.test(html));
  assert.ok(/\.table-container\s*\{[\s\S]*box-shadow:\s*var\(--shadow\)/.test(html));
  assert.ok(/\.table-container\s*\{[\s\S]*backdrop-filter:\s*blur\(10px\)/.test(html));
  assert.ok(/\.device-table th\s*\{[\s\S]*padding:\s*16px 16px/.test(html));
  assert.ok(/\.device-table th\s*\{[\s\S]*font-size:\s*12px/.test(html));
  assert.ok(/\.device-table th\s*\{[\s\S]*font-weight:\s*800/.test(html));
  assert.ok(/\.device-table th\s*\{[\s\S]*letter-spacing:\s*0\.06em/.test(html));
  assert.ok(/\.device-table th\s*\{[\s\S]*text-transform:\s*uppercase/.test(html));
  assert.ok(/\.device-table th\s*\{[\s\S]*background:\s*rgba\(15,\s*23,\s*42,\s*0\.04\)/.test(html));
  assert.ok(/\.device-table td\s*\{[\s\S]*padding:\s*14px 16px/.test(html));
  assert.ok(/\.device-table td\s*\{[\s\S]*border-bottom:\s*1px solid var\(--border-light\)/.test(html));
  assert.ok(/\.device-table tbody tr:hover\s*\{[\s\S]*background:\s*rgba\(46,\s*196,\s*182,\s*0\.08\)/.test(html));
  assert.ok(/\.device-id\s*\{[\s\S]*font-family:\s*'SF Mono',\s*monospace/.test(html));
  assert.ok(/\.device-id\s*\{[\s\S]*font-weight:\s*800/.test(html));
  assert.ok(/\.merchant-name,\s*[\s\S]*\.location-text\s*\{[\s\S]*font-size:\s*15px/.test(html));
  assert.ok(/\.merchant-name,\s*[\s\S]*\.location-text\s*\{[\s\S]*font-weight:\s*800/.test(html));
  assert.ok(/\.sales-state\s*\{[\s\S]*font-size:\s*13px/.test(html));
  assert.ok(/\.sales-state\s*\{[\s\S]*font-weight:\s*700/.test(html));
  assert.ok(/\.heartbeat-time\s*\{[\s\S]*font-size:\s*13px/.test(html));
  assert.ok(/\.heartbeat-time\s*\{[\s\S]*font-weight:\s*700/.test(html));
});

test('设备页移动端应提供状态色条卡片与悬浮录入按钮', () => {
  assert.ok(/device-mobile-status-bar/.test(html));
  assert.ok(/查看详情\s*→/.test(html));
  assert.ok(/class="mobile-fab"/.test(html));
});

test('设备页移动端菜单按钮应回到左侧并保持与其他页面一致的 header 结构', () => {
  assert.ok(/<div class="mobile-header">\s*<button class="menu-btn" onclick="toggleSidebar\(\)">/.test(html));
  assert.ok(/<button class="menu-btn" onclick="toggleSidebar\(\)">[\s\S]*<\/button>\s*<span[^>]*>/.test(html));
  assert.ok(/@media\s*\(max-width:\s*768px\)[\s\S]*\.mobile-header\s*\{[\s\S]*display:\s*flex/.test(html));
});

test('设备页筛选逻辑应支持按点位名称搜索', () => {
  assert.ok(/const\s+runtimeLocationMap\s*=\s*buildLocationMap\(\)/.test(html));
  assert.ok(/const\s+searchableText\s*=\s*\[\s*d\.id,\s*runtimeLocationMap\[d\.location\],\s*d\.location\s*\]/.test(html));
});
