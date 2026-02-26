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

const html = fs.readFileSync(path.join(__dirname, '..', 'materials.html'), 'utf8');

test('物料页：应支持从 URL device 参数恢复设备', () => {
  assert.ok(/new URLSearchParams\(window\.location\.search \|\| ''\)/.test(html));
  assert.ok(/params\.get\('device'\)/.test(html));
  assert.ok(/currentDevice = resolveInitialDevice\(\)/.test(html));
});

test('物料页：设备来源不在默认列表时应加入下拉选项', () => {
  assert.ok(/if \(!allDeviceOptions\.includes\(currentDevice\)\)/.test(html));
  assert.ok(/allDeviceOptions\.unshift\(currentDevice\)/.test(html));
});
