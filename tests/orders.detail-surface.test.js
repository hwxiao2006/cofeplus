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

test('订单页应提供桌面抽屉与移动弹窗两套详情承载层', () => {
  assert.ok(/id="orderDetailLayer"/.test(html), 'missing detail overlay root');
  assert.ok(/class="order-detail-drawer"/.test(html), 'missing desktop drawer surface');
  assert.ok(/class="order-detail-modal"/.test(html), 'missing mobile modal surface');
  assert.ok(/id="orderDetailDesktopContent"/.test(html), 'missing desktop content target');
  assert.ok(/id="orderDetailMobileContent"/.test(html), 'missing mobile content target');
});

test('订单页详情应覆盖已确认的核心字段分组', () => {
  [
    '基础信息',
    '交易信息',
    '商品信息',
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

test('查看详情应根据端宽切换桌面抽屉和移动弹窗', () => {
  assert.ok(/function\s+viewDetail\s*\(\s*orderId\s*\)\s*\{[\s\S]*window\.matchMedia\('\(max-width:\s*1024px\)'\)\.matches/.test(html), 'viewDetail should branch on viewport width');
  assert.ok(/setOrderDetailMode\(/.test(html), 'missing detail mode setter');
  assert.ok(/function\s+closeOrderDetail\s*\(/.test(html), 'missing closeOrderDetail');
});
