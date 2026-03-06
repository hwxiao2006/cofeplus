const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'orders.html'), 'utf8');

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

test('订单页应支持读取基础设置币种并提供多币种格式化能力', () => {
  assert.ok(/const\s+MENU_BASIC_SETTINGS_KEY\s*=\s*'menuBasicSettings'/.test(html));
  assert.ok(/const\s+SUPPORTED_CURRENCIES\s*=\s*\{[\s\S]*CNY[\s\S]*USD[\s\S]*EUR[\s\S]*HKD[\s\S]*JPY[\s\S]*\}/.test(html));
  assert.ok(/function\s+loadOrderDefaultCurrency\(\)/.test(html));
  assert.ok(/function\s+normalizeOrderCurrency\s*\(/.test(html));
  assert.ok(/function\s+formatMoneyByCurrency\s*\(/.test(html));
});

test('订单金额展示应按订单币种渲染，统计区支持按币种汇总', () => {
  assert.ok(/function\s+getOrderCurrency\s*\(/.test(html));
  assert.ok(/function\s+formatOrderTotalsByCurrency\s*\(/.test(html));
  assert.ok(/document\.getElementById\('totalAmount'\)\.textContent\s*=\s*formatOrderTotalsByCurrency\(filteredData\)/.test(html));
  assert.ok(/formatMoneyByCurrency\(order\.amount,\s*getOrderCurrency\(order\)\)/.test(html));
});

test('退款弹层金额与提交载荷应跟随订单币种', () => {
  assert.ok(/id="refundOrderAmountLabel"/.test(html));
  assert.ok(/function\s+getRefundCurrency\s*\(/.test(html));
  assert.ok(/document\.getElementById\('refundOrderAmountLabel'\)\.textContent\s*=\s*`整单退款金额（\$\{refundCurrency\}）`/.test(html));
  assert.ok(/amountEl\.textContent\s*=\s*result\.ok\s*\?\s*formatMoneyByCurrency\(result\.amount,\s*getRefundCurrency\(\)\)\s*:\s*formatMoneyByCurrency\(0,\s*getRefundCurrency\(\)\)/.test(html));
  assert.ok(/currency:\s*getOrderCurrency\(order\)/.test(html));
});
