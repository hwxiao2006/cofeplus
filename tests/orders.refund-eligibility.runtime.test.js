const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'orders.html'), 'utf8');
const sharedJs = fs.readFileSync(path.join(__dirname, '..', 'shared', 'admin-mock-data.js'), 'utf8');

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

function extractFunctionSource(source, functionName) {
  const signature = `function ${functionName}(`;
  const start = source.indexOf(signature);
  if (start === -1) {
    throw new Error(`未找到函数 ${functionName}`);
  }
  const braceStart = source.indexOf('{', start);
  let depth = 0;
  for (let index = braceStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) {
      return source.slice(start, index + 1);
    }
  }
  throw new Error(`函数 ${functionName} 解析失败`);
}

function createNormalizeRuntimeOrderSandbox() {
  const sandbox = {
    console,
    normalizeOrderItems(order) {
      return Array.isArray(order?.orderItems) ? order.orderItems : [];
    },
    resolveOrderItemCount(order) {
      return Array.isArray(order?.orderItems)
        ? order.orderItems.reduce((sum, item) => sum + Number(item?.quantity || 0), 0)
        : 0;
    },
    buildFallbackOrderNickname(index) {
      return `昵称${index}`;
    },
    buildFallbackOrderPhone(index) {
      return `1380000${String(index).padStart(4, '0')}`;
    },
    buildFallbackTransactionId(date, index) {
      return `TXN-${date.getTime()}-${index}`;
    },
    buildLegacyOrderSummary() {
      return '测试商品';
    },
    buildLegacyOrderSpecs() {
      return '测试规格';
    },
    getOrderCurrency(order) {
      return String(order?.currency || 'CNY');
    },
    formatFallbackOrderCreateTime() {
      return '2026年4月2日 12:00';
    }
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(extractFunctionSource(html, 'normalizeRuntimeOrder'), sandbox);
  return sandbox;
}

test('fallback 订单生成器不应再产出 failed 支付状态', () => {
  assert.ok(
    /const\s+paymentStatus\s*=\s*status === 'pending' \? 'pending' : status === 'cancelled' \? 'cancelled' : 'succeed';/.test(html),
    'fallback orders should only emit pending/cancelled/succeed payment states'
  );
});

test('normalizeRuntimeOrder 应将已完成订单的历史 failed 支付状态归一为 succeed', () => {
  const sandbox = createNormalizeRuntimeOrderSandbox();
  const normalized = sandbox.normalizeRuntimeOrder({
    id: 'O-1',
    status: 'done',
    paymentStatus: 'failed',
    amount: '15.90',
    currency: 'CNY',
    orderItems: [
      { name: '鲜牛奶', quantity: 1, specs: '牛奶，大杯型' }
    ]
  }, 0);

  assert.strictEqual(normalized.paymentStatus, 'succeed');
});

test('共享 mock 基线中的已完成订单不应包含 failed 支付状态', () => {
  const context = { window: {}, globalThis: {} };
  vm.createContext(context);
  vm.runInContext(sharedJs, context);

  const data = context.window.COFE_SHARED_MOCK_DATA || context.globalThis.COFE_SHARED_MOCK_DATA;
  const failedCompletedOrders = data.defaultOrders.filter((order) => order.status === 'done' && order.paymentStatus === 'failed');

  assert.strictEqual(failedCompletedOrders.length, 0);
});
