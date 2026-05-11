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

test('置顶头容器 CSS 应存在', () => {
  assert.ok(/\.detail-top-head\s*\{[\s\S]*background:\s*#fff/.test(html));
  assert.ok(/\.detail-top-head\s*\{[\s\S]*padding:\s*14px 18px/.test(html));
  assert.ok(/\.detail-top-head\s*\{[\s\S]*display:\s*flex/.test(html));
});

test('置顶头元素(back/id/pill/loc/actions)CSS 应齐备', () => {
  assert.ok(/\.detail-top-back\s*\{/.test(html));
  assert.ok(/\.detail-top-id\s*\{[\s\S]*font-size:\s*18px/.test(html));
  assert.ok(/\.detail-top-pill\s*\{[\s\S]*border-radius:\s*999px/.test(html));
  assert.ok(/\.detail-top-loc\s*\{[\s\S]*color:\s*#6b7280/.test(html));
  assert.ok(/\.detail-top-actions\s*\{[\s\S]*gap:\s*6px/.test(html));
});

test('置顶头操作区"远程操作"按钮应有蓝色渐变', () => {
  assert.ok(/\.detail-top-action-btn\.blue\s*\{[\s\S]*background:\s*linear-gradient\(135deg,\s*#2563eb,\s*#1d4ed8\)/.test(html));
});
