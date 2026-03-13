const assert = require('assert');
const fs = require('fs');
const path = require('path');

const previewPath = path.join(__dirname, '..', 'orders-detail-preview.html');
const html = fs.existsSync(previewPath) ? fs.readFileSync(previewPath, 'utf8') : '';

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

test('订单详情预览页应同时提供弹窗版与抽屉版方案', () => {
  assert.ok(fs.existsSync(previewPath), 'orders-detail-preview.html should exist');
  assert.ok(/data-detail-preview="modal"/.test(html), 'missing modal preview marker');
  assert.ok(/data-detail-preview="drawer"/.test(html), 'missing drawer preview marker');
  assert.ok(/弹窗方案/.test(html), 'missing modal section title');
  assert.ok(/抽屉方案/.test(html), 'missing drawer section title');
});

test('订单详情预览页应同时提供桌面端弹窗与桌面端抽屉画布', () => {
  assert.ok(/data-detail-surface="desktop-modal"/.test(html), 'missing desktop modal surface');
  assert.ok(/data-detail-surface="desktop-drawer"/.test(html), 'missing desktop drawer surface');
  assert.ok(/桌面端弹窗/.test(html), 'missing desktop modal label');
  assert.ok(/桌面端抽屉/.test(html), 'missing desktop drawer label');
});

test('订单详情预览页应覆盖截图中的核心字段信息', () => {
  [
    '支付时间',
    '订单编号',
    '交易单号',
    '用户昵称',
    '手机号',
    '设备编号',
    '排队号',
    '出杯口号',
    '取杯码',
    '订单状态',
    '订单类型',
    '支付方式',
    '支付金额',
    '优惠金额',
    '商品名称'
  ].forEach(label => {
    assert.ok(html.includes(label), `missing detail label: ${label}`);
  });
});
