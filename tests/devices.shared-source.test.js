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

test('设备页应通过共享 helper 补齐残缺的本地设备基线', () => {
  assert.ok(/helpers\s*&&\s*typeof sharedAdminMockData\.helpers\.resolveDevices === 'function'/.test(html));
  assert.ok(/const\s+resolveDeviceBaseline\s*=/.test(html));
  assert.ok(/devicesData\s*=\s*normalizeDevices\(resolveDeviceBaseline\(stored\)\);/.test(html));
});
