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

test('共享 mock 数据源应存在并暴露设备与商品默认数据', () => {
  const sharedPath = path.join(__dirname, '..', 'shared', 'admin-mock-data.js');
  const sharedJs = fs.readFileSync(sharedPath, 'utf8');

  assert.ok(/COFE_SHARED_MOCK_DATA/.test(sharedJs));
  assert.ok(/defaultDevices/.test(sharedJs));
  assert.ok(/defaultProducts/.test(sharedJs));
});

test('共享 mock 数据源应包含设备页和商品管理页当前默认数据', () => {
  const sharedPath = path.join(__dirname, '..', 'shared', 'admin-mock-data.js');
  const sharedJs = fs.readFileSync(sharedPath, 'utf8');

  assert.ok(/RCK386/.test(sharedJs), 'shared devices should include default device ids');
  assert.ok(/3D拉花/.test(sharedJs), 'shared products should include default product categories');
});

test('设备页和商品管理页应显式引用共享 mock 数据源', () => {
  const devicesHtml = fs.readFileSync(path.join(__dirname, '..', 'devices.html'), 'utf8');
  const menuHtml = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');

  assert.ok(/<script src="shared\/admin-mock-data\.js"><\/script>/.test(devicesHtml));
  assert.ok(/<script src="shared\/admin-mock-data\.js"><\/script>/.test(menuHtml));
  assert.ok(/COFE_SHARED_MOCK_DATA/.test(devicesHtml));
  assert.ok(/COFE_SHARED_MOCK_DATA/.test(menuHtml));
});
