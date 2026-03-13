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

test('订单页应渲染三张动态经营指标卡', () => {
  assert.ok(/id="metricPaidAmount"/.test(html));
  assert.ok(/id="metricCompletedOrders"/.test(html));
  assert.ok(/id="metricAverageTicket"/.test(html));
  assert.ok(!/取消率/.test(html));
  assert.ok(!/近1小时趋势/.test(html));
});

test('订单页应提供当日指标汇总计算函数', () => {
  assert.ok(/function\s+calculateTodayOrderMetrics\s*\(/.test(html));
  assert.ok(/completedOrders/.test(html));
  assert.ok(/averageTicket/.test(html));
});
