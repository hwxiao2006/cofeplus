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

test('侧栏重启 split button 容器样式应使用 teal 渐变', () => {
  assert.ok(
    /\.detail-side-restart-split\s*\{[\s\S]*background:\s*linear-gradient\(135deg,\s*#14b8a6,\s*#0f766e\)/.test(html),
    '.detail-side-restart-split 应为 teal 渐变'
  );
  assert.ok(
    /\.detail-side-restart-split\s*\{[\s\S]*border:\s*1px solid #0f766e/.test(html)
  );
  assert.ok(
    /\.detail-side-restart-split\s*\{[\s\S]*border-radius:\s*6px/.test(html)
  );
  assert.ok(
    /\.detail-side-restart-split\s*\{[\s\S]*box-shadow:\s*0 6px 14px rgba\(15,\s*118,\s*110,\s*0?\.22\)/.test(html)
  );
});

test('split button 主区 / caret 应有独立 hover 反馈', () => {
  assert.ok(/\.detail-side-restart-primary:hover\s*\{[\s\S]*background:\s*rgba\(0,\s*0,\s*0,\s*0?\.08\)/.test(html));
  assert.ok(/\.detail-side-restart-caret:hover\s*\{[\s\S]*background:\s*rgba\(0,\s*0,\s*0,\s*0?\.15\)/.test(html));
});

test('split button 主区与 caret 之间应有 1px 半透明白分隔线', () => {
  assert.ok(/\.detail-side-restart-caret\s*\{[\s\S]*border-left:\s*1px solid rgba\(255,\s*255,\s*255,\s*0?\.25\)/.test(html));
});

test('popover 应右对齐按钮下方 6px,带阴影', () => {
  assert.ok(/\.detail-side-restart-popover\s*\{[\s\S]*top:\s*calc\(100% \+ 6px\)/.test(html));
  assert.ok(/\.detail-side-restart-popover\s*\{[\s\S]*right:\s*0/.test(html));
  assert.ok(/\.detail-side-restart-popover\s*\{[\s\S]*box-shadow:\s*0 10px 30px rgba\(15,\s*23,\s*42,\s*0?\.12\)/.test(html));
});

test('popover item hover 使用浅 teal 背景', () => {
  assert.ok(/\.detail-side-restart-popover-item:hover\s*\{[\s\S]*background:\s*#ccfbf1/.test(html));
  assert.ok(/\.detail-side-restart-popover-item:hover\s*\{[\s\S]*color:\s*#0f766e/.test(html));
});
