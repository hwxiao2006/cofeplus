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

test('设备列表仅展示单行编号，不展示次级 ID 文案', () => {
  assert.ok(!/class="device-id-small">\s*ID:\s*\$\{device\.id\}/.test(html));
});

test('设备列表编号区域不展示图标块', () => {
  assert.ok(!/class="device-avatar">\s*\$\{device\.id\.substring\(0,\s*2\)\}\s*<\/div>/.test(html));
});
