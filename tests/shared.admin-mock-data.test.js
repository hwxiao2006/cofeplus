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
    console.error(error.message);
    process.exitCode = 1;
  }
}

test('共享 mock 数据源应存在并暴露设备与商品默认数据', () => {
  const sharedPath = path.join(__dirname, '..', 'shared', 'admin-mock-data.js');
  const sharedJs = fs.readFileSync(sharedPath, 'utf8');

  assert.ok(/COFE_SHARED_MOCK_DATA/.test(sharedJs));
  assert.ok(/defaultDevices/.test(sharedJs));
  assert.ok(/defaultOrders/.test(sharedJs));
  assert.ok(/defaultProducts/.test(sharedJs));
});

test('共享 mock 数据源应包含设备页和商品管理页当前默认数据', () => {
  const sharedPath = path.join(__dirname, '..', 'shared', 'admin-mock-data.js');
  const sharedJs = fs.readFileSync(sharedPath, 'utf8');
  const context = { window: {}, globalThis: {} };
  vm.createContext(context);
  vm.runInContext(sharedJs, context);
  const data = context.window.COFE_SHARED_MOCK_DATA || context.globalThis.COFE_SHARED_MOCK_DATA;

  assert.ok(/RCK386/.test(sharedJs), 'shared devices should include default device ids');
  assert.ok(/3D拉花/.test(sharedJs), 'shared products should include default product categories');
  assert.strictEqual(data.defaultOrders[0].transactionId, 'TXN202604021549590000');
});

test('设备页和商品管理页应显式引用共享 mock 数据源', () => {
  const devicesHtml = fs.readFileSync(path.join(__dirname, '..', 'devices.html'), 'utf8');
  const menuHtml = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');

  assert.ok(/<script src="shared\/admin-mock-data\.js"><\/script>/.test(devicesHtml));
  assert.ok(/<script src="shared\/admin-mock-data\.js"><\/script>/.test(menuHtml));
  assert.ok(/COFE_SHARED_MOCK_DATA/.test(devicesHtml));
  assert.ok(/COFE_SHARED_MOCK_DATA/.test(menuHtml));
});

test('共享 mock 商品应预设原默认选中项', () => {
  const sharedPath = path.join(__dirname, '..', 'shared', 'admin-mock-data.js');
  const sharedJs = fs.readFileSync(sharedPath, 'utf8');
  const context = { window: {}, globalThis: {} };
  vm.createContext(context);
  vm.runInContext(sharedJs, context);

  const data = context.window.COFE_SHARED_MOCK_DATA || context.globalThis.COFE_SHARED_MOCK_DATA;
  const products = data && data.defaultProducts ? data.defaultProducts : {};
  const requiredSpecKeys = ['beans', 'temperature', 'strength', 'syrup', 'sweetness', 'cupsize', 'lid', 'latteArt'];

  Object.values(products).forEach(category => {
    (category.items || []).forEach(product => {
      assert.ok(product.defaultOptions, `product ${product.id} should define defaultOptions`);
      requiredSpecKeys.forEach(specKey => {
        assert.ok(
          product.defaultOptions[specKey],
          `product ${product.id} should define defaultOptions.${specKey}`
        );
      });
    });
  });
});

test('共享 mock 订单基线应至少提供 20 笔订单', () => {
  const sharedPath = path.join(__dirname, '..', 'shared', 'admin-mock-data.js');
  const sharedJs = fs.readFileSync(sharedPath, 'utf8');
  const context = { window: {}, globalThis: {} };
  vm.createContext(context);
  vm.runInContext(sharedJs, context);

  const data = context.window.COFE_SHARED_MOCK_DATA || context.globalThis.COFE_SHARED_MOCK_DATA;
  assert.ok(Array.isArray(data.defaultOrders));
  assert.ok(data.defaultOrders.length >= 20);
});

test('共享 mock 业务标签应保持 disabled 兼容输入并可被 helper 规范化为 hidden', () => {
  const sharedPath = path.join(__dirname, '..', 'shared', 'admin-mock-data.js');
  const helperPath = path.join(__dirname, '..', 'shared', 'business-tag-library.js');
  const sharedJs = fs.readFileSync(sharedPath, 'utf8');
  const helperJs = fs.readFileSync(helperPath, 'utf8');
  const context = { window: {}, globalThis: {} };
  vm.createContext(context);
  vm.runInContext(sharedJs, context);
  vm.runInContext(helperJs, context);

  const data = context.window.COFE_SHARED_MOCK_DATA || context.globalThis.COFE_SHARED_MOCK_DATA;
  const api = context.window.CofeBusinessTags || context.globalThis.CofeBusinessTags;

  assert.strictEqual(data.defaultBusinessTags.tag_hidden.status, 'disabled');
  assert.strictEqual(
    api.normalizeBusinessTagEntry('tag_hidden', data.defaultBusinessTags.tag_hidden).status,
    'hidden'
  );
});
