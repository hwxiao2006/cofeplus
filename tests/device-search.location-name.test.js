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

const searchPages = [
  'menu-management.html',
  'menu.html',
  'overview.html',
  'materials.html',
  'device-entry.html'
];

test('统一设备搜索：各页面应支持按点位名称搜索并显示组合文案', () => {
  searchPages.forEach((file) => {
    const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert.ok(html.includes('搜索设备编号或点位名称'), `${file} 未更新搜索提示文案`);
    assert.ok(/function\s+buildRuntimeLocationMap\s*\(/.test(html), `${file} 缺少 buildRuntimeLocationMap`);
    assert.ok(/function\s+rebuildDeviceSearchData\s*\(/.test(html), `${file} 缺少 rebuildDeviceSearchData`);
    assert.ok(/function\s+formatDeviceSearchLabel\s*\(/.test(html), `${file} 缺少 formatDeviceSearchLabel`);
    assert.ok(/点位名称 · 设备编号/.test(html) || /locationName \? `\$\{locationName\} · \$\{deviceId\}`/.test(html), `${file} 未生成组合展示文案`);
  });
});

test('人员管理页：设备搜索应继续支持按设备编号和点位名称过滤', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'staff-management.html'), 'utf8');
  assert.ok(html.includes('placeholder="搜索设备编号或点位名称"'));
  assert.ok(/const\s+searchableText\s*=\s*`\$\{device\.id\}\s+\$\{device\.locationLabel\}`\.toLowerCase\(\)/.test(html));
  assert.ok(/function\s+buildLocationLabel\s*\(/.test(html));
});
