const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

function loadHelpers() {
  const scriptPath = path.join(__dirname, '..', 'shared', 'admin-staff-access.js');
  const script = fs.readFileSync(scriptPath, 'utf8');
  const sandbox = { console, window: {} };
  sandbox.window.window = sandbox.window;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(script, sandbox);
  return sandbox.window.CofeAdminStaffAccess || sandbox.CofeAdminStaffAccess;
}

function deepEqArr(actual, expected) {
  assert.deepStrictEqual(Array.from(actual || []), expected);
}

test('convertMerchantKeyToMerchantId: mer001 → C001', () => {
  const helpers = loadHelpers();
  assert.strictEqual(helpers.convertMerchantKeyToMerchantId('mer001'), 'C001');
});

test('convertMerchantKeyToMerchantId: 大小写不敏感、补零', () => {
  const helpers = loadHelpers();
  assert.strictEqual(helpers.convertMerchantKeyToMerchantId('MER42'), 'C042');
  assert.strictEqual(helpers.convertMerchantKeyToMerchantId('mer7'), 'C007');
  assert.strictEqual(helpers.convertMerchantKeyToMerchantId('Mer123'), 'C123');
});

test('convertMerchantKeyToMerchantId: 空/非法返回空串', () => {
  const helpers = loadHelpers();
  assert.strictEqual(helpers.convertMerchantKeyToMerchantId(''), '');
  assert.strictEqual(helpers.convertMerchantKeyToMerchantId(null), '');
  assert.strictEqual(helpers.convertMerchantKeyToMerchantId(undefined), '');
  assert.strictEqual(helpers.convertMerchantKeyToMerchantId('foo'), '');
  assert.strictEqual(helpers.convertMerchantKeyToMerchantId('C001'), ''); // 反向不接受
});

test('getMerchantDeviceIds: 仅返回该商户的设备 id', () => {
  const helpers = loadHelpers();
  const devices = [
    { id: 'RCK386', merchant: 'mer001' },
    { id: 'RCK385', merchant: 'mer001' },
    { id: 'RCK410', merchant: 'mer002' },
    { id: 'RCB036', merchant: 'mer003' },
    { id: 'RCK402', merchant: 'mer001' }
  ];
  deepEqArr(helpers.getMerchantDeviceIds('C001', devices), ['RCK386', 'RCK385', 'RCK402']);
  deepEqArr(helpers.getMerchantDeviceIds('C002', devices), ['RCK410']);
  deepEqArr(helpers.getMerchantDeviceIds('C003', devices), ['RCB036']);
});

test('getMerchantDeviceIds: 商户名下无设备 → 空数组', () => {
  const helpers = loadHelpers();
  const devices = [
    { id: 'RCK386', merchant: 'mer001' },
    { id: 'RCK410', merchant: 'mer002' }
  ];
  deepEqArr(helpers.getMerchantDeviceIds('C999', devices), []);
});

test('getMerchantDeviceIds: 容错（空/无效输入）', () => {
  const helpers = loadHelpers();
  deepEqArr(helpers.getMerchantDeviceIds('', []), []);
  deepEqArr(helpers.getMerchantDeviceIds('C001', null), []);
  deepEqArr(helpers.getMerchantDeviceIds('C001', [{ id: '', merchant: 'mer001' }]), []);
  deepEqArr(helpers.getMerchantDeviceIds(null, [{ id: 'X', merchant: 'mer001' }]), []);
});

test('getMerchantDeviceIds: 跳过缺少 merchant 字段或非法字段的设备', () => {
  const helpers = loadHelpers();
  const devices = [
    { id: 'RCK386', merchant: 'mer001' },
    { id: 'RCK999' },                      // 缺 merchant
    { id: 'RCKBAD', merchant: 'notmer' },  // 非法格式
    null,                                  // null 元素
    { id: 'RCK387', merchant: 'mer001' }
  ];
  deepEqArr(helpers.getMerchantDeviceIds('C001', devices), ['RCK386', 'RCK387']);
});
