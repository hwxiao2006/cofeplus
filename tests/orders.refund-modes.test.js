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

test('退款弹层应支持手动输入整单退款金额与部分商品全额退款', () => {
  assert.ok(/id="refundModal"/.test(html));
  assert.ok(/id="refundOrderManualAmount"/.test(html));
  assert.ok(/id="refundOrderManualLimit"/.test(html));
  assert.ok(/toggleRefundLineSelection\('\$\{line\.id\}',\s*this\.checked\)/.test(html));
  assert.ok(!/class="refund-line-amount-input"/.test(html));
});

test('退款逻辑应支持按数量拆分商品行', () => {
  assert.ok(/function\s+buildRefundLineItems\s*\(/.test(html));
  assert.ok(/for\s*\(let\s+unit\s*=\s*1;\s*unit\s*<=\s*quantity;\s*unit\s*\+=\s*1\)/.test(html));
});

test('退款计算应基于手动输入并支持整单/商品全额金额二选一', () => {
  assert.ok(/function\s+calculateManualRefundAmount\s*\(/.test(html));
  assert.ok(/selectedLines\.reduce\(\(sum,\s*line\)\s*=>\s*sum\s*\+\s*line\.maxAmount/.test(html));
  assert.ok(/整单退款金额与商品退款金额请二选一/.test(html));
});

test('退款提交应基于手动输入金额并执行校验', () => {
  assert.ok(/function\s+submitRefund\s*\(/.test(html));
  assert.ok(/calculateManualRefundAmount\(\)/.test(html));
  assert.ok(/showToast\(.+退款申请已提交/.test(html));
});

test('部分商品退款应改为勾选商品，不再输入单行金额', () => {
  assert.ok(/function\s+toggleRefundLineSelection\s*\(/.test(html));
  assert.ok(/type="checkbox"/.test(html));
  assert.ok(!/setRefundLineAmount\('\$\{line\.id\}'/.test(html));
});

test('整单退款与商品退款应在输入时互斥', () => {
  assert.ok(/id="refundOrderManualAmount"[\s\S]*oninput="handleRefundOrderAmountInput\(this\)"/.test(html));
  assert.ok(/function\s+handleRefundOrderAmountInput\s*\(/.test(html));
  assert.ok(/document\.getElementById\('refundOrderManualAmount'\)\.value\s*=\s*''/.test(html));
});
